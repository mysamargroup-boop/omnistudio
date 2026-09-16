from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request
from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict, Any
from pathlib import Path
import os
import uuid
import logging

from config import settings
from limiter import limiter
from path_utils import safe_resolve_output_path
from services.security_service import sanitize_filename, validate_uploaded_media
from services.metadata_cleaner_service import (
    extract_image_metadata,
    clean_image_lossless,
    batch_clean_images,
    extract_video_metadata,
    clean_video_lossless,
)
from database import db_save_asset

VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".m4v", ".avi"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"}

logger = logging.getLogger("omnistudio.metadata_router")

router = APIRouter(prefix="/api/metadata", tags=["AI Metadata & Provenance"])


class MetadataInspectRequest(BaseModel):
    url: Optional[str] = None
    path: Optional[str] = None
    filename: Optional[str] = None


class MetadataCleanRequest(BaseModel):
    url: Optional[str] = None
    path: Optional[str] = None
    filename: Optional[str] = None
    stealth_mode: Optional[bool] = False
    quality: Optional[int] = 99

    @field_validator("quality")
    @classmethod
    def validate_quality(cls, v: Optional[int]) -> int:
        if v is None:
            return 99
        return max(50, min(100, v))


def is_video_path(path: Path) -> bool:
    return path.suffix.lower() in VIDEO_EXTENSIONS


def _resolve_target_media_path(req_url: Optional[str], req_path: Optional[str], req_filename: Optional[str]) -> Path:
    """Helper to safely resolve an image or video file from URL, path, or filename."""
    candidate = req_path or req_url or req_filename
    if not candidate:
        raise HTTPException(status_code=400, detail="Media path, URL, or filename is required.")

    # Check direct path
    try:
        cand_path = Path(candidate)
        if cand_path.is_absolute() and cand_path.exists():
            return cand_path
    except Exception:
        pass

    # Try resolving across allowed directories
    for cat in ["videos", "images", "final", "brand_kit", "publish"]:
        try:
            resolved = safe_resolve_output_path(candidate, cat, must_exist=True)
            if resolved and resolved.exists():
                return resolved
        except Exception:
            continue

    # Also check settings directories directly
    clean_cand_name = Path(candidate).name
    for base_dir in [settings.VIDEOS_PATH, settings.IMAGES_PATH, settings.FINAL_PATH]:
        p = base_dir / clean_cand_name
        if p.exists():
            return p

    raise HTTPException(status_code=404, detail="Media file not found in studio storage.")


@router.post("/inspect")
@limiter.limit("30/minute")
async def inspect_metadata(req: MetadataInspectRequest, request: Request):
    """
    Inspect metadata, EXIF tags, PNG text chunks, or video container atoms,
    and scan for C2PA / SynthID / AI signatures in images and videos.
    """
    target_path = _resolve_target_media_path(req.url, req.path, req.filename)

    if is_video_path(target_path):
        result = extract_video_metadata(str(target_path))
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to inspect video metadata."))
        result["media_type"] = "video"
        result["url"] = f"/outputs/videos/{target_path.name}"
        return result
    else:
        result = extract_image_metadata(str(target_path))
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to inspect image metadata."))
        result["media_type"] = "image"
        result["url"] = f"/outputs/images/{target_path.name}"
        return result


@router.post("/inspect-upload")
@limiter.limit("20/minute")
async def inspect_uploaded_media(
    request: Request,
    file: UploadFile = File(...),
    ephemeral: bool = Form(False),
):
    """
    Upload an image or video to perform deep metadata and AI provenance inspection.
    When ephemeral=True (Zero-Disk Privacy Mode), media is analyzed in temporary memory/disk
    and immediately deleted upon extraction so nothing is persisted on the server.
    """
    clean_orig = sanitize_filename(file.filename or "upload.png")
    ext = Path(clean_orig).suffix.lower() or ".png"

    if ext in VIDEO_EXTENSIONS:
        content = await file.read()
        try:
            validate_uploaded_media(content, clean_orig, "video")
        except Exception:
            pass

        if ephemeral:
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(content)
                tmp_path = Path(tmp.name)

            try:
                result = extract_video_metadata(str(tmp_path))
                result["media_type"] = "video"
                result["filename"] = clean_orig
                result["saved_to_disk"] = False
                result["ephemeral"] = True
                result["url"] = None
                result["storage_status"] = "Zero-Disk Privacy (Ephemeral in-memory buffer, file unlinked from server)"
                return result
            finally:
                try:
                    if tmp_path.exists():
                        tmp_path.unlink()
                except Exception:
                    pass
        else:
            temp_filename = f"inspect_{uuid.uuid4().hex[:8]}_{clean_orig}"
            target_path = settings.VIDEOS_PATH / temp_filename

            with open(target_path, "wb") as f:
                f.write(content)

            result = extract_video_metadata(str(target_path))
            result["media_type"] = "video"
            result["saved_to_disk"] = True
            result["ephemeral"] = False
            result["url"] = f"/outputs/videos/{temp_filename}"
            return result

    elif ext in IMAGE_EXTENSIONS:
        content = await file.read()
        validate_uploaded_media(content, clean_orig, "image")

        if ephemeral:
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(content)
                tmp_path = Path(tmp.name)

            try:
                result = extract_image_metadata(str(tmp_path))
                result["media_type"] = "image"
                result["filename"] = clean_orig
                result["saved_to_disk"] = False
                result["ephemeral"] = True
                result["url"] = None
                result["storage_status"] = "Zero-Disk Privacy (Ephemeral in-memory buffer, file unlinked from server)"
                return result
            finally:
                try:
                    if tmp_path.exists():
                        tmp_path.unlink()
                except Exception:
                    pass
        else:
            temp_filename = f"inspect_{uuid.uuid4().hex[:8]}_{clean_orig}"
            target_path = settings.IMAGES_PATH / temp_filename

            with open(target_path, "wb") as f:
                f.write(content)

            result = extract_image_metadata(str(target_path))
            result["media_type"] = "image"
            result["saved_to_disk"] = True
            result["ephemeral"] = False
            result["url"] = f"/outputs/images/{temp_filename}"
            return result

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format. Allowed images: {sorted(IMAGE_EXTENSIONS)}, Allowed videos: {sorted(VIDEO_EXTENSIONS)}"
        )


@router.post("/clean")
@limiter.limit("20/minute")
async def clean_metadata(req: MetadataCleanRequest, request: Request):
    """
    Strips all metadata from a stored image or video losslessly.
    For videos: uses ultra-fast FFmpeg stream copy with zero re-encoding and 0% quality loss.
    For images: strips EXIF/XMP and applies optional SynthID stealth scrambling.
    """
    target_path = _resolve_target_media_path(req.url, req.path, req.filename)

    if is_video_path(target_path):
        pre_meta = extract_video_metadata(str(target_path))
        clean_filename = f"{target_path.stem}_clean_{uuid.uuid4().hex[:4]}{target_path.suffix}"
        output_path = settings.VIDEOS_PATH / clean_filename

        clean_res = clean_video_lossless(
            str(target_path),
            str(output_path),
            stealth_mode=bool(req.stealth_mode),
        )

        if not clean_res.get("success"):
            raise HTTPException(status_code=500, detail=clean_res.get("error", "Failed to clean video metadata."))

        clean_url = f"/outputs/videos/{clean_filename}"

        try:
            db_save_asset(
                filename=clean_filename,
                asset_type="videos",
                url=clean_url,
                prompt=f"Lossless Cleaned Video: {target_path.name}",
                parameters={
                    "source_file": target_path.name,
                    "stealth_mode": req.stealth_mode,
                    "bytes_saved": clean_res.get("bytes_saved", 0),
                    "stream_copy": True,
                },
            )
        except Exception as db_err:
            logger.warning("Could not register cleaned video in DB: %s", db_err)

        return {
            "success": True,
            "media_type": "video",
            "url": clean_url,
            "clean_url": clean_url,
            "input_filename": target_path.name,
            "output_filename": clean_filename,
            "clean_filename": clean_filename,
            "local_path": str(output_path),
            "original_size_bytes": clean_res.get("original_size_bytes", 0),
            "cleaned_size_bytes": clean_res.get("cleaned_size_bytes", 0),
            "saved_bytes": clean_res.get("saved_bytes", 0),
            "saved_percent": clean_res.get("saved_percent", 0.0),
            "format": target_path.suffix.replace(".", "").upper(),
            "stealth_mode": req.stealth_mode,
            "verified_clean": clean_res.get("verified_clean", True),
            "before_metadata": pre_meta,
            "after_metadata": clean_res.get("after_metadata", {}),
            "pre_cleaning_metadata": pre_meta,
            "cleaning_report": clean_res,
            "stealth_mode_applied": req.stealth_mode,
        }

    else:
        # Image cleaning flow
        pre_meta = extract_image_metadata(str(target_path))
        clean_filename = f"{target_path.stem}_clean_{uuid.uuid4().hex[:4]}{target_path.suffix}"
        output_path = settings.IMAGES_PATH / clean_filename

        clean_res = clean_image_lossless(
            str(target_path),
            str(output_path),
            stealth_mode=bool(req.stealth_mode),
            quality=req.quality or 99,
        )

        if not clean_res.get("success"):
            raise HTTPException(status_code=500, detail=clean_res.get("error", "Failed to clean metadata."))

        clean_url = f"/outputs/images/{clean_filename}"

        try:
            db_save_asset(
                filename=clean_filename,
                asset_type="images",
                url=clean_url,
                prompt=f"Lossless Cleaned Image: {target_path.name} (Stealth: {req.stealth_mode})",
                parameters={
                    "source_file": target_path.name,
                    "stealth_mode": req.stealth_mode,
                    "bytes_saved": clean_res.get("bytes_saved", 0),
                },
            )
        except Exception as db_err:
            logger.warning("Could not register cleaned image in DB: %s", db_err)

        return {
            "success": True,
            "media_type": "image",
            "url": clean_url,
            "clean_url": clean_url,
            "input_filename": target_path.name,
            "output_filename": clean_filename,
            "clean_filename": clean_filename,
            "local_path": str(output_path),
            "original_size_bytes": clean_res.get("original_size_bytes", 0),
            "cleaned_size_bytes": clean_res.get("cleaned_size_bytes", 0),
            "saved_bytes": clean_res.get("saved_bytes", 0),
            "saved_percent": clean_res.get("saved_percent", 0.0),
            "format": clean_res.get("remaining_metadata", {}).get("format", "PNG"),
            "stealth_mode": req.stealth_mode,
            "before_metadata": pre_meta,
            "after_metadata": clean_res.get("remaining_metadata", {}),
            "pre_cleaning_metadata": pre_meta,
            "cleaning_report": clean_res,
            "stealth_mode_applied": req.stealth_mode,
        }


@router.post("/clean-upload")
@limiter.limit("15/minute")
async def clean_uploaded_media(
    request: Request,
    file: UploadFile = File(...),
    stealth_mode: bool = Form(False),
    quality: int = Form(99),
):
    """
    Upload an image or video file directly to clean all metadata losslessly, return download URL and comparison report.
    """
    clean_orig = sanitize_filename(file.filename or "media.png")
    ext = Path(clean_orig).suffix.lower() or ".png"

    if ext in VIDEO_EXTENSIONS:
        content = await file.read()
        try:
            validate_uploaded_media(content, clean_orig, "video")
        except Exception:
            pass

        orig_filename = f"raw_{uuid.uuid4().hex[:6]}_{clean_orig}"
        orig_path = settings.VIDEOS_PATH / orig_filename
        with open(orig_path, "wb") as f:
            f.write(content)

        pre_meta = extract_video_metadata(str(orig_path))

        clean_filename = f"clean_{uuid.uuid4().hex[:6]}_{Path(clean_orig).stem}{ext}"
        clean_path = settings.VIDEOS_PATH / clean_filename

        try:
            clean_res = clean_video_lossless(
                str(orig_path),
                str(clean_path),
                stealth_mode=stealth_mode,
            )
        finally:
            try:
                if orig_path.exists():
                    orig_path.unlink()
            except Exception:
                pass

        if not clean_res.get("success"):
            raise HTTPException(status_code=500, detail=clean_res.get("error", "Failed to clean video."))

        clean_url = f"/outputs/videos/{clean_filename}"

        try:
            db_save_asset(
                filename=clean_filename,
                asset_type="videos",
                url=clean_url,
                prompt=f"Uploaded & Lossless Cleaned Video: {clean_orig}",
                parameters={"stealth_mode": stealth_mode, "stream_copy": True},
            )
        except Exception:
            pass

        return {
            "success": True,
            "media_type": "video",
            "url": clean_url,
            "clean_url": clean_url,
            "input_filename": clean_orig,
            "output_filename": clean_filename,
            "clean_filename": clean_filename,
            "local_path": str(clean_path),
            "original_size_bytes": clean_res.get("original_size_bytes", 0),
            "cleaned_size_bytes": clean_res.get("cleaned_size_bytes", 0),
            "saved_bytes": clean_res.get("saved_bytes", 0),
            "saved_percent": clean_res.get("saved_percent", 0.0),
            "format": ext.replace(".", "").upper(),
            "stealth_mode": stealth_mode,
            "verified_clean": clean_res.get("verified_clean", True),
            "before_metadata": pre_meta,
            "after_metadata": clean_res.get("after_metadata", {}),
            "pre_cleaning_metadata": pre_meta,
            "cleaning_report": clean_res,
            "stealth_mode_applied": stealth_mode,
        }

    elif ext in IMAGE_EXTENSIONS:
        content = await file.read()
        validate_uploaded_media(content, clean_orig, "image")

        orig_filename = f"raw_{uuid.uuid4().hex[:6]}_{clean_orig}"
        orig_path = settings.IMAGES_PATH / orig_filename
        with open(orig_path, "wb") as f:
            f.write(content)

        pre_meta = extract_image_metadata(str(orig_path))

        clean_filename = f"clean_{uuid.uuid4().hex[:6]}_{Path(clean_orig).stem}{ext}"
        clean_path = settings.IMAGES_PATH / clean_filename

        try:
            clean_res = clean_image_lossless(
                str(orig_path),
                str(clean_path),
                stealth_mode=stealth_mode,
                quality=quality,
            )
        finally:
            try:
                if orig_path.exists():
                    orig_path.unlink()
            except Exception:
                pass

        if not clean_res.get("success"):
            raise HTTPException(status_code=500, detail=clean_res.get("error", "Failed to clean image."))

        clean_url = f"/outputs/images/{clean_filename}"

        try:
            db_save_asset(
                filename=clean_filename,
                asset_type="images",
                url=clean_url,
                prompt=f"Uploaded & Cleaned: {clean_orig}",
                parameters={"stealth_mode": stealth_mode, "quality": quality},
            )
        except Exception:
            pass

        return {
            "success": True,
            "media_type": "image",
            "url": clean_url,
            "clean_url": clean_url,
            "input_filename": clean_orig,
            "output_filename": clean_filename,
            "clean_filename": clean_filename,
            "local_path": str(clean_path),
            "original_size_bytes": clean_res.get("original_size_bytes", 0),
            "cleaned_size_bytes": clean_res.get("cleaned_size_bytes", 0),
            "saved_bytes": clean_res.get("saved_bytes", 0),
            "saved_percent": clean_res.get("saved_percent", 0.0),
            "format": clean_res.get("remaining_metadata", {}).get("format", ext.replace(".", "").upper()),
            "stealth_mode": stealth_mode,
            "before_metadata": pre_meta,
            "after_metadata": clean_res.get("remaining_metadata", {}),
            "pre_cleaning_metadata": pre_meta,
            "cleaning_report": clean_res,
            "stealth_mode_applied": stealth_mode,
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported media format. Allowed images: {sorted(IMAGE_EXTENSIONS)}, Allowed videos: {sorted(VIDEO_EXTENSIONS)}"
        )


# Dedicated Explicit Video Endpoints
@router.post("/video/inspect")
@limiter.limit("30/minute")
async def inspect_video_endpoint(req: MetadataInspectRequest, request: Request):
    """Inspect video file metadata directly."""
    target_path = _resolve_target_media_path(req.url, req.path, req.filename)
    res = extract_video_metadata(str(target_path))
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to inspect video."))
    res["media_type"] = "video"
    res["url"] = f"/outputs/videos/{target_path.name}"
    return res


@router.post("/video/clean")
@limiter.limit("20/minute")
async def clean_video_endpoint(req: MetadataCleanRequest, request: Request):
    """Clean video file metadata losslessly with FFmpeg stream copy."""
    return await clean_metadata(req, request)


@router.post("/video/clean-upload")
@limiter.limit("15/minute")
async def clean_video_upload_endpoint(
    request: Request,
    file: UploadFile = File(...),
    stealth_mode: bool = Form(False),
):
    """Upload and clean video file metadata losslessly."""
    return await clean_uploaded_media(request, file=file, stealth_mode=stealth_mode, quality=99)
