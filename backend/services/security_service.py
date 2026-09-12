import os
import re
from pathlib import Path
from typing import Optional, List
from fastapi import HTTPException
from config import settings
from path_utils import safe_resolve_output_path as _resolve_media_path

def sanitize_filename(filename: str) -> str:
    """
    Sanitize an untrusted filename to prevent path traversal and arbitrary file creation.
    - Strips directory components (e.g. ../, /etc/, C:\\)
    - Strips null bytes and non-printable characters
    - Whitelists only safe alphanumeric, dash, underscore, and dot characters
    - Returns a safe filename with max length 255 chars
    """
    if not filename or not filename.strip():
        raise HTTPException(status_code=400, detail="Filename cannot be empty")
    
    # Strip directory components
    base = os.path.basename(filename.strip())
    # Remove null bytes
    base = base.replace("\x00", "")
    # Remove traversal sequences
    base = base.replace("..", "")
    # Whitelist characters: a-zA-Z0-9, dot, underscore, dash, spaces, parentheses, comma
    clean = re.sub(r'[^a-zA-Z0-9._\-\s\(\),]', '_', base)
    # Ensure not starting with a dot (hidden file) or empty
    clean = clean.lstrip(".")
    if not clean:
        clean = f"asset_{os.urandom(4).hex()}"
    return clean[:255]

def safe_resolve_output_path(
    path_str: str, 
    allowed_dirs: Optional[List[Path]] = None,
    must_exist: bool = False
) -> Path:
    """
    Safely resolve a path within the outputs directory, verifying it cannot escape settings.OUTPUTS_PATH.
    Raises HTTPException(400) if path traversal is detected.
    """
    if not path_str or not str(path_str).strip():
        raise HTTPException(status_code=400, detail="Path parameter is required")
    
    raw = str(path_str).strip()
    if "://" in raw:
        try:
            parts = raw.split("://", 1)[1].split("/", 1)
            if len(parts) > 1:
                raw = "/" + parts[1]
        except Exception:
            pass
    # Compatibility wrapper for existing call sites. New code must pass an
    # explicit media type to path_utils.safe_resolve_output_path.
    normalized = raw.replace("\\", "/")
    for media_type in ("images", "videos", "audio", "final"):
        if normalized.startswith(f"/outputs/{media_type}/") or normalized.startswith(f"outputs/{media_type}/"):
            resolved = _resolve_media_path(raw, media_type, must_exist=must_exist)
            if allowed_dirs and not any(resolved.is_relative_to(directory.resolve()) for directory in allowed_dirs):
                raise HTTPException(status_code=403, detail="Security error: Access to specified subdirectory is forbidden")
            return resolved
    
    # Normalize URL prefix or relative output path
    if raw.startswith("/outputs/"):
        rel = raw[len("/outputs/"):].lstrip("/\\")
        candidate = (settings.OUTPUTS_PATH / rel).resolve()
    elif raw.startswith("outputs/"):
        rel = raw[len("outputs/"):].lstrip("/\\")
        candidate = (settings.OUTPUTS_PATH / rel).resolve()
    else:
        p = Path(raw)
        if p.is_absolute():
            candidate = p.resolve()
        else:
            # First check direct search in typical output subdirectories if only filename is given
            found_in_sub = False
            for sub in [settings.VIDEOS_PATH, settings.FINAL_PATH, settings.IMAGES_PATH, settings.AUDIO_PATH, settings.TRASH_PATH]:
                check_p = (sub / p.name).resolve()
                if check_p.exists() and check_p.is_relative_to(settings.OUTPUTS_PATH.resolve()):
                    candidate = check_p
                    found_in_sub = True
                    break
            if not found_in_sub:
                candidate = (settings.OUTPUTS_PATH / raw.lstrip("/\\")).resolve()
    
    # Strict boundary check: Candidate MUST reside inside settings.OUTPUTS_PATH
    outputs_root = settings.OUTPUTS_PATH.resolve()
    if not candidate.is_relative_to(outputs_root):
        raise HTTPException(
            status_code=400, 
            detail="Security error: Attempted directory traversal outside outputs directory"
        )
    
    if allowed_dirs:
        resolved_allowed = [d.resolve() for d in allowed_dirs]
        if not any(candidate.is_relative_to(d) for d in resolved_allowed):
            raise HTTPException(
                status_code=403, 
                detail="Security error: Access to specified subdirectory is forbidden"
            )
            
    if must_exist and not candidate.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {candidate.name}")
        
    return candidate

MAX_IMAGE_SIZE = 25 * 1024 * 1024   # 25 MB
MAX_AUDIO_SIZE = 50 * 1024 * 1024   # 50 MB
MAX_VIDEO_SIZE = 500 * 1024 * 1024  # 500 MB

def validate_uploaded_media(content: bytes, filename: str, media_type: str):
    """
    Strict validation of uploaded media files:
    1. Enforces strict byte size limits per media category.
    2. Validates magic bytes / container signatures to ensure content matches expected format.
    """
    size = len(content)
    if size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    if media_type == "image":
        if size > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=413, detail=f"Image exceeds maximum size of 25MB (Size: {round(size / (1024*1024), 2)}MB)")
        is_png = content.startswith(b"\x89PNG\r\n\x1a\n")
        is_jpeg = content.startswith(b"\xff\xd8\xff")
        is_webp = content.startswith(b"RIFF") and len(content) > 12 and content[8:12] == b"WEBP"
        is_gif = content.startswith(b"GIF87a") or content.startswith(b"GIF89a")
        is_bmp = content.startswith(b"BM")
        if not (is_png or is_jpeg or is_webp or is_gif or is_bmp):
            raise HTTPException(status_code=400, detail="Invalid image signature. Allowed formats: PNG, JPEG, WEBP, GIF, BMP")

    elif media_type == "audio":
        if size > MAX_AUDIO_SIZE:
            raise HTTPException(status_code=413, detail=f"Audio exceeds maximum size of 50MB (Size: {round(size / (1024*1024), 2)}MB)")
        is_mp3 = content.startswith(b"ID3") or (len(content) > 2 and content[0] == 0xff and (content[1] & 0xe0) == 0xe0)
        is_wav = content.startswith(b"RIFF") and len(content) > 12 and content[8:12] == b"WAVE"
        is_ogg = content.startswith(b"OggS")
        is_flac = content.startswith(b"fLaC")
        is_m4a = len(content) > 8 and content[4:8] == b"ftyp"
        if not (is_mp3 or is_wav or is_ogg or is_flac or is_m4a):
            raise HTTPException(status_code=400, detail="Invalid audio signature. Allowed formats: MP3, WAV, OGG, FLAC, M4A")

    elif media_type == "video":
        if size > MAX_VIDEO_SIZE:
            raise HTTPException(status_code=413, detail=f"Video exceeds maximum size of 500MB (Size: {round(size / (1024*1024), 2)}MB)")
        is_mp4 = len(content) > 8 and (content[4:8] == b"ftyp" or content[4:8] == b"moov")
        is_webm = content.startswith(b"\x1a\x45\xdf\xa3")
        is_avi = content.startswith(b"RIFF") and len(content) > 12 and content[8:12] == b"AVI "
        if not (is_mp4 or is_webm or is_avi):
            raise HTTPException(status_code=400, detail="Invalid video signature. Allowed formats: MP4, WebM, AVI, MOV")
