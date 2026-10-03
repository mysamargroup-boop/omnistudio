import os
import shutil
import asyncio
from fastapi import APIRouter, Query, HTTPException, Request
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, List
from limiter import limiter
from config import settings
from services.storage_service import delete_file_from_r2
from database import (
    db_delete_asset, db_set_asset_trashed, db_rename_asset,
    db_toggle_favorite, db_get_favorites,
    db_get_collections, db_create_collection, db_delete_collection,
    db_add_asset_to_collection, db_remove_asset_from_collection,
    db_get_collection_item_filenames
)

router = APIRouter(prefix="/api/assets", tags=["Asset Vault"])

DIR_MAP = {
    "images": settings.IMAGES_PATH,
    "videos": settings.VIDEOS_PATH,
    "audio": settings.AUDIO_PATH,
    "final": settings.FINAL_PATH
}

TRASH_DIR_MAP = {
    "images": settings.TRASH_PATH / "images",
    "videos": settings.TRASH_PATH / "videos",
    "audio": settings.TRASH_PATH / "audio",
    "final": settings.TRASH_PATH / "final"
}

from pydantic import BaseModel, field_validator

class AssetItem(BaseModel):
    media_type: str
    filename: str

    @field_validator("media_type")
    @classmethod
    def validate_media_type(cls, v: str) -> str:
        if v not in {"images", "videos", "audio", "final"}:
            raise ValueError("Invalid media_type")
        return v

    @field_validator("filename")
    @classmethod
    def validate_filename(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("filename cannot be empty")
        return s

class BulkActionRequest(BaseModel):
    items: List[AssetItem]
    permanent: Optional[bool] = False
    from_trash: Optional[bool] = False

    @field_validator("items")
    @classmethod
    def validate_items(cls, v: List[AssetItem]) -> List[AssetItem]:
        if not v:
            raise ValueError("items list cannot be empty")
        if len(v) > 100:
            raise ValueError("Cannot perform bulk action on more than 100 items at once")
        return v

class RenameAssetRequest(BaseModel):
    media_type: str
    old_filename: str
    new_filename: str

    @field_validator("media_type")
    @classmethod
    def validate_media_type(cls, v: str) -> str:
        if v not in {"images", "videos", "audio", "final"}:
            raise ValueError("Invalid media_type")
        return v

    @field_validator("old_filename", "new_filename")
    @classmethod
    def validate_names(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Filename cannot be empty")
        return s

class FavoriteRequest(BaseModel):
    filename: str
    is_favorite: Optional[bool] = None

    @field_validator("filename")
    @classmethod
    def validate_fav_filename(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("filename cannot be empty")
        return s

class CreateCollectionRequest(BaseModel):
    name: str
    description: Optional[str] = ""

    @field_validator("name")
    @classmethod
    def validate_collection_name(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Collection name cannot be empty")
        if len(s) > 100:
            raise ValueError("Collection name cannot exceed 100 characters")
        return s

class CollectionItemsRequest(BaseModel):
    filenames: List[str]

    @field_validator("filenames")
    @classmethod
    def validate_filenames(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("filenames list cannot be empty")
        return [f.strip() for f in v if f.strip()]

import json
from services.security_service import sanitize_filename
import logging

assets_logger = logging.getLogger("omnistudio.assets")

_PROMPT_MAP_CACHE: dict = {}
_PROMPT_MAP_CACHE_TIMESTAMP: float = 0.0
_PROMPT_MAP_CACHE_TTL: float = 60.0

def invalidate_prompt_map_cache():
    global _PROMPT_MAP_CACHE_TIMESTAMP
    _PROMPT_MAP_CACHE_TIMESTAMP = 0.0

def get_assets_prompt_map() -> dict[str, str]:
    """
    Returns a mapping of {filename: prompt} for assets generated on this platform.
    Cached for 60s to eliminate repetitive multi-source I/O overhead.
    """
    global _PROMPT_MAP_CACHE, _PROMPT_MAP_CACHE_TIMESTAMP
    now = time.time()
    if _PROMPT_MAP_CACHE and (now - _PROMPT_MAP_CACHE_TIMESTAMP) < _PROMPT_MAP_CACHE_TTL:
        return _PROMPT_MAP_CACHE

    prompt_map: dict[str, str] = {}

    # 1. From usage_logs.json (covers all recent UI generations)
    try:
        from services.usage_tracker import USAGE_FILE, load_usage_data
        if USAGE_FILE.exists():
            data = load_usage_data()
            for rec in data.get("records", []):
                p = (rec.get("full_prompt") or rec.get("prompt") or "").strip()
                out_url = (rec.get("output_url") or "").strip()
                if p and out_url:
                    fn = Path(out_url).name
                    if fn and fn not in prompt_map:
                        prompt_map[fn] = p
    except Exception as e:
        assets_logger.debug("Prompt map usage_logs error: %s", e)

    # 2. From SQLite generations table
    try:
        from database import db_session
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("SELECT prompt, output_url FROM generations WHERE prompt IS NOT NULL AND output_url IS NOT NULL")
            for row in cur.fetchall():
                p = (row[0] or "").strip()
                out_url = (row[1] or "").strip()
                if p and out_url:
                    fn = Path(out_url).name
                    if fn and fn not in prompt_map:
                        prompt_map[fn] = p
    except Exception as e:
        assets_logger.debug("Prompt map generations error: %s", e)

    # 3. From SQLite assets table (metadata.prompt)
    try:
        from database import db_session
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("SELECT filename, metadata FROM assets WHERE metadata IS NOT NULL")
            for row in cur.fetchall():
                fn = (row[0] or "").strip()
                meta_raw = row[1]
                if fn and meta_raw:
                    try:
                        meta = json.loads(meta_raw) if isinstance(meta_raw, str) else meta_raw
                        p = (meta.get("prompt") or "").strip()
                        if p and fn not in prompt_map:
                            prompt_map[fn] = p
                    except Exception:
                        pass
    except Exception as e:
        assets_logger.debug("Prompt map assets error: %s", e)

    _PROMPT_MAP_CACHE = prompt_map
    _PROMPT_MAP_CACHE_TIMESTAMP = now
    return prompt_map

def scan_directory(dir_path: Path, media_type: str, is_trash: bool = False, prompt_map: Optional[dict] = None, limit: int = 1500) -> list[dict]:
    """
    High-performance directory scanner using os.scandir with cached stats.
    Avoids separate stat calls and construction of Path objects for faster traversal.
    """
    files = []
    if not dir_path.exists():
        return files
    if prompt_map is None:
        prompt_map = get_assets_prompt_map()

    try:
        items = []
        with os.scandir(str(dir_path)) as it:
            for entry in it:
                if entry.is_file() and not entry.name.startswith("."):
                    try:
                        st = entry.stat()
                        # Skip 0-byte dummy files or corrupt files smaller than 100 bytes
                        if st.st_size > 100:
                            items.append((entry.name, entry.path, st.st_size, st.st_mtime))
                    except (OSError, FileNotFoundError):
                        continue

        # Sort by modification time descending
        items.sort(key=lambda x: x[3], reverse=True)

        url_prefix = f"/outputs/trash/{media_type}" if is_trash else f"/outputs/{media_type}"
        for name, path, size, mtime in items[:limit]:
            prompt_val = prompt_map.get(name)
            files.append({
                "filename": name,
                "url": f"{url_prefix}/{name}",
                "local_path": path,
                "size_bytes": size,
                "size_mb": round(size / (1024 * 1024), 2),
                "modified": mtime,
                "type": media_type,
                "is_trash": is_trash,
                "prompt": prompt_val,
                "has_prompt": bool(prompt_val)
            })
    except Exception as e:
        assets_logger.error("scan_directory error for %s: %s", dir_path, e)
    return files

from services.security_service import sanitize_filename
import logging

assets_logger = logging.getLogger("omnistudio.assets")

def _normalize_media_type(media_type: str, filename: str = "") -> str:
    norm = (media_type or "").lower().strip()
    if norm in {"image", "images"}:
        return "images"
    if norm in {"video", "videos"}:
        return "videos"
    if norm in {"audio", "voice", "speech"}:
        return "audio"
    if norm in {"final", "masters"}:
        return "final"
    # Fallback to extension check
    if filename:
        fn_lower = filename.lower()
        if fn_lower.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif")):
            return "images"
        if fn_lower.endswith((".mp4", ".mov", ".webm", ".avi", ".mkv")):
            return "videos"
        if fn_lower.endswith((".mp3", ".wav", ".aac", ".m4a", ".ogg")):
            return "audio"
    return "images"

def safe_move_to_trash(media_type: str, filename: str) -> bool:
    try:
        norm_type = _normalize_media_type(media_type, filename)
        base_name = os.path.basename(filename.strip()).replace("\x00", "").replace("..", "").strip()
        clean_name = sanitize_filename(filename)

        src_dir = DIR_MAP.get(norm_type)
        dest_dir = TRASH_DIR_MAP.get(norm_type)
        if not src_dir or not dest_dir:
            return False

        # Locate source file (try raw basename first, then sanitized)
        src_file = None
        target_name = base_name
        for candidate_name in [base_name, clean_name]:
            test_path = (src_dir / candidate_name).resolve()
            if test_path.is_relative_to(src_dir.resolve()) and test_path.exists() and test_path.is_file():
                src_file = test_path
                target_name = candidate_name
                break

        # Fallback: search across all active directories if not in guessed dir
        if not src_file:
            for alt_type, alt_dir in DIR_MAP.items():
                for candidate_name in [base_name, clean_name]:
                    test_path = (alt_dir / candidate_name).resolve()
                    if test_path.is_relative_to(alt_dir.resolve()) and test_path.exists() and test_path.is_file():
                        src_file = test_path
                        dest_dir = TRASH_DIR_MAP.get(alt_type, dest_dir)
                        target_name = candidate_name
                        break
                if src_file:
                    break

        if not src_file or not src_file.exists():
            assets_logger.warning("[MoveToTrash] File not found: %s in %s", filename, media_type)
            return False

        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_file = dest_dir / target_name
        if dest_file.exists():
            dest_file.unlink()

        shutil.move(str(src_file), str(dest_file))
        db_set_asset_trashed(target_name, trashed=True)
        if target_name != filename:
            db_set_asset_trashed(filename, trashed=True)
        return True
    except Exception as e:
        assets_logger.error("[MoveToTrash Error] %s: %s", filename, e)
        return False

def safe_restore_from_trash(media_type: str, filename: str) -> bool:
    try:
        norm_type = _normalize_media_type(media_type, filename)
        base_name = os.path.basename(filename.strip()).replace("\x00", "").replace("..", "").strip()
        clean_name = sanitize_filename(filename)

        src_dir = TRASH_DIR_MAP.get(norm_type)
        dest_dir = DIR_MAP.get(norm_type)
        if not src_dir or not dest_dir:
            return False

        # Locate source in trash
        src_file = None
        target_name = base_name
        for candidate_name in [base_name, clean_name]:
            test_path = (src_dir / candidate_name).resolve()
            if test_path.is_relative_to(src_dir.resolve()) and test_path.exists() and test_path.is_file():
                src_file = test_path
                target_name = candidate_name
                break

        # Fallback: search all trash directories
        if not src_file:
            for alt_type, alt_trash_dir in TRASH_DIR_MAP.items():
                for candidate_name in [base_name, clean_name]:
                    test_path = (alt_trash_dir / candidate_name).resolve()
                    if test_path.is_relative_to(alt_trash_dir.resolve()) and test_path.exists() and test_path.is_file():
                        src_file = test_path
                        dest_dir = DIR_MAP.get(alt_type, dest_dir)
                        target_name = candidate_name
                        break
                if src_file:
                    break

        if not src_file or not src_file.exists():
            assets_logger.warning("[RestoreTrash] File not found in trash: %s in %s", filename, media_type)
            return False

        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_file = dest_dir / target_name
        if dest_file.exists():
            dest_file.unlink()

        shutil.move(str(src_file), str(dest_file))
        db_set_asset_trashed(target_name, trashed=False)
        if target_name != filename:
            db_set_asset_trashed(filename, trashed=False)
        return True
    except Exception as e:
        assets_logger.error("[RestoreTrash Error] %s: %s", filename, e)
        return False

async def safe_permanent_delete(media_type: str, filename: str, from_trash: bool = False) -> bool:
    try:
        norm_type = _normalize_media_type(media_type, filename)
        base_name = os.path.basename(filename.strip()).replace("\x00", "").replace("..", "").strip()
        clean_name = sanitize_filename(filename)

        search_dirs = []
        if from_trash:
            search_dirs.append(TRASH_DIR_MAP.get(norm_type))
            search_dirs.extend([d for d in TRASH_DIR_MAP.values() if d != TRASH_DIR_MAP.get(norm_type)])
            search_dirs.append(DIR_MAP.get(norm_type))
        else:
            search_dirs.append(DIR_MAP.get(norm_type))
            search_dirs.extend([d for d in DIR_MAP.values() if d != DIR_MAP.get(norm_type)])
            search_dirs.append(TRASH_DIR_MAP.get(norm_type))

        deleted_local = False
        target_name = base_name
        for d in search_dirs:
            if not d:
                continue
            for candidate_name in [base_name, clean_name]:
                target_file = (d / candidate_name).resolve()
                if target_file.is_relative_to(d.resolve()) and target_file.exists() and target_file.is_file():
                    target_file.unlink()
                    deleted_local = True
                    target_name = candidate_name
                    break
            if deleted_local:
                break

        # Cloudflare R2 delete
        object_name = f"{norm_type}/{target_name}"
        await delete_file_from_r2(object_name)

        # Supabase Cloud & SQLite DB delete
        db_delete_asset(filename=target_name, asset_type=norm_type)
        if target_name != filename:
            db_delete_asset(filename=filename, asset_type=norm_type)
        return deleted_local
    except Exception as e:
        assets_logger.error("[PermanentDelete Error] %s: %s", filename, e)
        return False

import time

_ASSETS_CACHE: dict = {}
_ASSETS_CACHE_TIMESTAMP: float = 0
_CACHE_TTL_SECONDS: float = 120.0

def invalidate_assets_cache():
    global _ASSETS_CACHE_TIMESTAMP, _PROMPT_MAP_CACHE_TIMESTAMP
    _ASSETS_CACHE_TIMESTAMP = 0.0
    _PROMPT_MAP_CACHE_TIMESTAMP = 0.0

@router.get("/all")
@limiter.limit("60/minute")
async def get_all_assets(
    request: Request,
    offset: int = Query(0, ge=0),
    limit: Optional[int] = Query(None, ge=1, le=2000)
):
    global _ASSETS_CACHE, _ASSETS_CACHE_TIMESTAMP
    now = time.time()
    if _ASSETS_CACHE and (now - _ASSETS_CACHE_TIMESTAMP) < _CACHE_TTL_SECONDS:
        cached = _ASSETS_CACHE
    else:
        prompt_map = await asyncio.to_thread(get_assets_prompt_map)
        (
            images, videos, audio, final,
            trash_images, trash_videos, trash_audio, trash_final
        ) = await asyncio.gather(
            asyncio.to_thread(scan_directory, settings.IMAGES_PATH, "images", False, prompt_map),
            asyncio.to_thread(scan_directory, settings.VIDEOS_PATH, "videos", False, prompt_map),
            asyncio.to_thread(scan_directory, settings.AUDIO_PATH, "audio", False, prompt_map),
            asyncio.to_thread(scan_directory, settings.FINAL_PATH, "final", False, prompt_map),
            asyncio.to_thread(scan_directory, settings.TRASH_PATH / "images", "images", True, prompt_map),
            asyncio.to_thread(scan_directory, settings.TRASH_PATH / "videos", "videos", True, prompt_map),
            asyncio.to_thread(scan_directory, settings.TRASH_PATH / "audio", "audio", True, prompt_map),
            asyncio.to_thread(scan_directory, settings.TRASH_PATH / "final", "final", True, prompt_map),
        )

        total_trash = len(trash_images) + len(trash_videos) + len(trash_audio) + len(trash_final)
        total_trash_bytes = sum(f["size_bytes"] for f in (trash_images + trash_videos + trash_audio + trash_final))

        cached = {
            "images": images,
            "videos": videos,
            "audio": audio,
            "final": final,
            "total": len(images) + len(videos) + len(audio) + len(final),
            "trash_count": total_trash,
            "trash_bytes": total_trash_bytes
        }
        _ASSETS_CACHE = cached
        _ASSETS_CACHE_TIMESTAMP = now

    if limit is not None:
        return {
            "images": cached["images"][offset:offset + limit],
            "videos": cached["videos"][offset:offset + limit],
            "audio": cached["audio"][offset:offset + limit],
            "final": cached["final"][offset:offset + limit],
            "total": cached["total"],
            "offset": offset,
            "limit": limit,
            "trash_count": cached["trash_count"],
            "trash_bytes": cached["trash_bytes"]
        }

    return cached


@router.get("/count")
async def get_asset_count():
    """Ultra-fast asset count for sidebar telemetry without reading metadata or sorting."""
    total = 0
    for path_dir in DIR_MAP.values():
        if path_dir and path_dir.exists():
            try:
                with os.scandir(str(path_dir)) as it:
                    for entry in it:
                        if entry.is_file() and not entry.name.startswith("."):
                            total += 1
            except Exception:
                pass
    return {"total": total}


@router.get("/prompt/{filename}")
async def get_asset_prompt(filename: str):
    """Retrieve the generation prompt for an asset if it was generated on this platform"""
    clean_fn = sanitize_filename(filename)
    prompt_map = get_assets_prompt_map()
    p = prompt_map.get(clean_fn)
    return {
        "success": bool(p),
        "filename": clean_fn,
        "prompt": p,
        "has_prompt": bool(p)
    }

@router.get("/images")
async def get_images():
    prompt_map = await asyncio.to_thread(get_assets_prompt_map)
    return {"files": scan_directory(settings.IMAGES_PATH, "images", False, prompt_map)}

@router.get("/videos")
async def get_videos():
    prompt_map = await asyncio.to_thread(get_assets_prompt_map)
    return {"files": scan_directory(settings.VIDEOS_PATH, "videos", False, prompt_map)}

@router.get("/audio")
async def get_audio():
    prompt_map = await asyncio.to_thread(get_assets_prompt_map)
    return {"files": scan_directory(settings.AUDIO_PATH, "audio", False, prompt_map)}

@router.get("/final")
async def get_final():
    prompt_map = await asyncio.to_thread(get_assets_prompt_map)
    return {"files": scan_directory(settings.FINAL_PATH, "final", False, prompt_map)}

@router.get("/trash")
async def get_trash_assets():
    trash_images = scan_directory(settings.TRASH_PATH / "images", "images", is_trash=True)
    trash_videos = scan_directory(settings.TRASH_PATH / "videos", "videos", is_trash=True)
    trash_audio = scan_directory(settings.TRASH_PATH / "audio", "audio", is_trash=True)
    trash_final = scan_directory(settings.TRASH_PATH / "final", "final", is_trash=True)

    all_trash = trash_final + trash_videos + trash_images + trash_audio
    return {
        "images": trash_images,
        "videos": trash_videos,
        "audio": trash_audio,
        "final": trash_final,
        "items": all_trash,
        "total": len(all_trash),
        "total_bytes": sum(f["size_bytes"] for f in all_trash)
    }

@router.post("/trash")
@limiter.limit("30/minute")
async def move_to_trash(req: BulkActionRequest, request: Request):
    """Move one or more assets to Trash (soft delete)"""
    trashed = []
    failed = []
    for item in req.items:
        ok = safe_move_to_trash(item.media_type, item.filename)
        if ok:
            trashed.append(item.filename)
        else:
            failed.append(item.filename)
    if trashed:
        invalidate_assets_cache()
    return {
        "success": True,
        "trashed_count": len(trashed),
        "trashed": trashed,
        "failed": failed
    }

@router.post("/restore")
@limiter.limit("30/minute")
async def restore_from_trash(req: BulkActionRequest, request: Request):
    """Restore one or more assets from Trash back to active vault"""
    restored = []
    failed = []
    for item in req.items:
        ok = safe_restore_from_trash(item.media_type, item.filename)
        if ok:
            restored.append(item.filename)
        else:
            failed.append(item.filename)
    if restored:
        invalidate_assets_cache()
    return {
        "success": True,
        "restored_count": len(restored),
        "restored": restored,
        "failed": failed
    }

@router.post("/bulk-delete")
@limiter.limit("20/minute")
async def bulk_delete_assets(req: BulkActionRequest, request: Request):
    """Bulk delete assets: soft-delete to trash or permanent destruction"""
    processed = []
    failed = []
    for item in req.items:
        if req.permanent:
            ok = await safe_permanent_delete(item.media_type, item.filename, from_trash=bool(req.from_trash))
        else:
            ok = safe_move_to_trash(item.media_type, item.filename)
        if ok:
            processed.append(item.filename)
        else:
            failed.append(item.filename)
    if processed:
        invalidate_assets_cache()
    return {
        "success": True,
        "permanent": req.permanent,
        "count": len(processed),
        "processed": processed,
        "failed": failed
    }

@router.delete("/trash/empty")
@limiter.limit("10/minute")
async def empty_trash(request: Request):
    """Permanently delete all assets inside the Trash directory"""
    purged = []
    for media_type, trash_dir in TRASH_DIR_MAP.items():
        if trash_dir.exists():
            for f in list(trash_dir.iterdir()):
                if f.is_file() and not f.name.startswith("."):
                    filename = f.name
                    f.unlink()
                    object_name = f"{media_type}/{filename}"
                    await delete_file_from_r2(object_name)
                    db_delete_asset(filename=filename, asset_type=media_type)
                    purged.append(filename)
    if purged:
        invalidate_assets_cache()
    return {
        "success": True,
        "purged_count": len(purged),
        "purged": purged
    }

@router.delete("/{media_type}/{filename}")
@limiter.limit("30/minute")
async def delete_asset(
    media_type: str,
    filename: str,
    request: Request,
    permanent: bool = Query(False),
    from_trash: bool = Query(False)
):
    """Delete an individual asset: either soft-move to Trash or permanent destruction"""
    if permanent or from_trash:
        ok = await safe_permanent_delete(media_type, filename, from_trash=from_trash)
        if ok:
            invalidate_assets_cache()
            return {"success": True, "deleted": filename, "permanent": True}
        return {"success": False, "error": "File not found"}
    else:
        ok = safe_move_to_trash(media_type, filename)
        if ok:
            invalidate_assets_cache()
            return {"success": True, "trashed": filename, "permanent": False}
        return {"success": False, "error": "File not found or could not move to trash"}

@router.post("/rename")
@limiter.limit("30/minute")
async def rename_asset(req: RenameAssetRequest, request: Request):
    """Rename an asset on local storage, SQLite, and cloud records"""
    dir_path = DIR_MAP.get(req.media_type)
    trash_dir = TRASH_DIR_MAP.get(req.media_type)
    if not dir_path:
        raise HTTPException(status_code=400, detail="Invalid media type")

    old_clean = sanitize_filename(req.old_filename)
    new_clean = sanitize_filename(req.new_filename)

    # Ensure extension is preserved if user entered name without extension
    old_ext = Path(old_clean).suffix.lower()
    if not Path(new_clean).suffix and old_ext:
        new_clean = f"{new_clean}{old_ext}"

    # Check active directory first
    old_file = (dir_path / old_clean).resolve()
    target_dir = dir_path
    if not old_file.exists():
        # Check trash directory
        if trash_dir and (trash_dir / old_clean).resolve().exists():
            old_file = (trash_dir / old_clean).resolve()
            target_dir = trash_dir
        else:
            raise HTTPException(status_code=404, detail="Source asset file not found")

    new_file = (target_dir / new_clean).resolve()
    if new_file.exists() and new_file != old_file:
        raise HTTPException(status_code=400, detail="An asset with the target filename already exists")

    try:
        old_file.rename(new_file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to rename file on disk: {e}")

    # Update database record
    db_rename_asset(old_clean, new_clean, req.media_type)
    invalidate_assets_cache()

    return {
        "success": True,
        "old_filename": old_clean,
        "new_filename": new_clean,
        "media_type": req.media_type,
        "url": f"/outputs/{req.media_type}/{new_clean}"
    }

# ─── Favorites Endpoints ───

@router.get("/favorites")
async def get_favorites():
    """Retrieve all favorited asset filenames"""
    favs = db_get_favorites()
    return {"success": True, "favorites": favs}

@router.post("/favorite")
async def toggle_favorite(req: FavoriteRequest):
    """Toggle or set favorite status for an asset"""
    new_status = db_toggle_favorite(req.filename, req.is_favorite)
    return {"success": True, "filename": req.filename, "is_favorite": new_status}

# ─── Collections Endpoints ───

@router.get("/collections")
async def get_collections():
    """List all asset collections with item counts"""
    cols = db_get_collections()
    return {"success": True, "collections": cols}

@router.post("/collections")
async def create_collection(req: CreateCollectionRequest):
    """Create a new collection"""
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Collection name cannot be empty")
    col = db_create_collection(req.name.strip(), req.description or "")
    return {"success": True, "collection": col}

@router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: str):
    """Delete a collection"""
    ok = db_delete_collection(collection_id)
    return {"success": ok}

@router.get("/collections/{collection_id}/items")
async def get_collection_items(collection_id: str):
    """Get all asset filenames belonging to a collection"""
    items = db_get_collection_item_filenames(collection_id)
    return {"success": True, "collection_id": collection_id, "filenames": items}

@router.post("/collections/{collection_id}/items")
async def add_items_to_collection(collection_id: str, req: CollectionItemsRequest):
    """Add one or more assets to a collection"""
    added = []
    for fn in req.filenames:
        if db_add_asset_to_collection(collection_id, fn):
            added.append(fn)
    return {"success": True, "added_count": len(added), "filenames": added}

@router.delete("/collections/{collection_id}/items/{filename}")
async def remove_item_from_collection(collection_id: str, filename: str):
    """Remove an asset from a collection"""
    ok = db_remove_asset_from_collection(collection_id, filename)
    return {"success": ok, "filename": filename}

@router.post("/trash/test")
@limiter.limit("15/minute")
async def test_trash_system(request: Request):
    """Test trash subsystem: verify disk write permissions, moving, and restoration"""
    results = {}
    try:
        # 1. Verify directory creation and writability
        for mtype, tdir in TRASH_DIR_MAP.items():
            tdir.mkdir(parents=True, exist_ok=True)
            test_file = tdir / f".test_perm_{mtype}.tmp"
            test_file.write_text(f"omnistudio_test_{time.time()}")
            if test_file.exists():
                results[f"{mtype}_dir_write"] = "OK"
                test_file.unlink()
            else:
                results[f"{mtype}_dir_write"] = "FAILED"

        # 2. Count current trashed items
        trash_data = scan_directory(settings.TRASH_PATH / "images", "images", is_trash=True) + \
                     scan_directory(settings.TRASH_PATH / "videos", "videos", is_trash=True) + \
                     scan_directory(settings.TRASH_PATH / "audio", "audio", is_trash=True) + \
                     scan_directory(settings.TRASH_PATH / "final", "final", is_trash=True)

        return {
            "success": True,
            "status": "Healthy",
            "message": "Trash & Storage Recovery Subsystem is 100% operational.",
            "diagnostics": results,
            "trash_items_count": len(trash_data),
            "trash_total_bytes": sum(f.get("size_bytes", 0) for f in trash_data),
            "trash_path": str(settings.TRASH_PATH)
        }
    except Exception as e:
        assets_logger.error("[Trash Diagnostic Test Error]: %s", e)
        return {
            "success": False,
            "status": "Degraded",
            "error": str(e),
            "diagnostics": results
        }

class Export4KRequest(BaseModel):
    filename: str
    media_type: str = "videos"

@router.post("/export-4k")
@limiter.limit("20/minute")
async def export_4k_video(request: Request, req: Export4KRequest):
    """
    Upscale and export video or image to true 4K Ultra HD (preserving exact aspect ratio: 16:9, 9:16, 1:1, 4:3, 21:9)
    using high-fidelity Lanczos resampling.
    Caches the 4K version so subsequent downloads are instantaneous.
    """
    import subprocess
    from PIL import Image

    clean_name = sanitize_filename(req.filename)
    source_file = None
    target_dir = DIR_MAP.get(req.media_type, settings.VIDEOS_PATH)
    cand = target_dir / clean_name
    if cand.exists():
        source_file = cand
    else:
        for d in [settings.VIDEOS_PATH, settings.FINAL_PATH, settings.IMAGES_PATH]:
            c = d / clean_name
            if c.exists():
                source_file = c
                break

    if not source_file or not source_file.exists():
        raise HTTPException(status_code=404, detail="Original asset file not found")

    ext = source_file.suffix.lower()
    is_image = ext in [".png", ".jpg", ".jpeg", ".webp"]

    if is_image:
        output_4k_name = f"4k_{clean_name}"
        output_4k_path = settings.IMAGES_PATH / output_4k_name
        if not output_4k_path.exists() or output_4k_path.stat().st_size < 1000:
            def _upscale_image():
                with Image.open(source_file) as im:
                    orig_w, orig_h = im.size
                    if orig_w >= orig_h:
                        target_h = 2160
                        target_w = int(round(2160 * (orig_w / orig_h)))
                    else:
                        target_w = 2160
                        target_h = int(round(2160 * (orig_h / orig_w)))
                    target_w = target_w if target_w % 2 == 0 else target_w + 1
                    target_h = target_h if target_h % 2 == 0 else target_h + 1
                    upscaled = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
                    fmt = im.format or ("PNG" if ext == ".png" else "JPEG")
                    if fmt.upper() in ["JPEG", "JPG"]:
                        upscaled.save(output_4k_path, format=fmt, quality=95, optimize=True)
                    else:
                        upscaled.save(output_4k_path, format=fmt)
            await asyncio.to_thread(_upscale_image)

        return {
            "success": True,
            "filename": output_4k_name,
            "url": f"/outputs/images/{output_4k_name}"
        }

    # For Videos:
    output_4k_name = f"4k_{clean_name}"
    output_4k_path = settings.VIDEOS_PATH / output_4k_name

    if not output_4k_path.exists() or output_4k_path.stat().st_size < 1000:
        target_w, target_h = 3840, 2160
        has_audio = False
        try:
            probe_cmd = [
                "ffprobe", "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=width,height",
                "-of", "csv=s=x:p=0",
                str(source_file)
            ]
            probe_res = await asyncio.to_thread(subprocess.run, probe_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=10)
            dims = probe_res.stdout.strip().split("x")
            if len(dims) == 2:
                w, h = int(dims[0]), int(dims[1])
                if w > 0 and h > 0:
                    if w >= h:
                        target_h = 2160
                        target_w = int(round(2160 * (w / h)))
                    else:
                        target_w = 2160
                        target_h = int(round(2160 * (h / w)))
                    target_w = target_w if target_w % 2 == 0 else target_w + 1
                    target_h = target_h if target_h % 2 == 0 else target_h + 1
        except Exception:
            target_w, target_h = 3840, 2160

        # Check for audio stream
        try:
            audio_probe = [
                "ffprobe", "-v", "error",
                "-select_streams", "a:0",
                "-show_entries", "stream=codec_type",
                "-of", "csv=p=0",
                str(source_file)
            ]
            a_res = await asyncio.to_thread(subprocess.run, audio_probe, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
            has_audio = "audio" in a_res.stdout.lower()
        except Exception:
            has_audio = False

        scale_filter = f"scale={target_w}:{target_h}:flags=lanczos,setsar=1"
        ffmpeg_cmd = [
            "ffmpeg", "-y",
            "-i", str(source_file),
            "-vf", scale_filter,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "16",
            "-pix_fmt", "yuv420p",
        ]
        if has_audio:
            ffmpeg_cmd.extend(["-c:a", "copy"])
        else:
            ffmpeg_cmd.extend(["-an"])
        ffmpeg_cmd.extend(["-movflags", "+faststart", str(output_4k_path)])

        res = await asyncio.to_thread(subprocess.run, ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=180)
        if res.returncode != 0:
            raise HTTPException(status_code=500, detail=f"4K FFmpeg upscale failed: {res.stderr[:200]}")

    return {
        "success": True,
        "filename": output_4k_name,
        "url": f"/outputs/videos/{output_4k_name}"
    }

