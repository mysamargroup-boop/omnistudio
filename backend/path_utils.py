"""Single, hardened boundary for local media paths.

No caller should construct a path from a user supplied filename directly.  This
module deliberately accepts only paths below ``outputs/<media_type>`` and
rejects links, traversal components, and absolute paths.
"""

from pathlib import Path

from fastapi import HTTPException

from config import settings


MEDIA_DIRECTORIES: dict[str, Path] = {
    "images": settings.IMAGES_PATH,
    "videos": settings.VIDEOS_PATH,
    "audio": settings.AUDIO_PATH,
    "final": settings.FINAL_PATH,
    "brand_kit": settings.OUTPUTS_PATH / "brand_kit",
    "publish": settings.OUTPUTS_PATH / "publish",
    "trash/images": settings.TRASH_PATH / "images",
    "trash/videos": settings.TRASH_PATH / "videos",
    "trash/audio": settings.TRASH_PATH / "audio",
    "trash/final": settings.TRASH_PATH / "final",
}


import urllib.parse

WINDOWS_RESERVED = {
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
}


def safe_resolve_output_path(user_provided_path: str, media_type: str, *, must_exist: bool = False) -> Path:
    """Resolve a media URL/path to a regular file inside one media directory.

    ``media_type`` is intentionally not inferred from arbitrary paths. That
    keeps one endpoint or operation from reading another output category.
    """
    directory = MEDIA_DIRECTORIES.get(media_type)
    if directory is None:
        raise HTTPException(status_code=400, detail="Unsupported media type")
    if not user_provided_path or not str(user_provided_path).strip():
        raise HTTPException(status_code=400, detail="Path parameter is required")

    # Reject null bytes immediately
    if "\x00" in str(user_provided_path):
        raise HTTPException(status_code=400, detail="Security error: null bytes are not allowed")

    # Canonicalize multi-layer URL encoding (e.g. %2e%2e, %252e%252e)
    decoded = urllib.parse.unquote(urllib.parse.unquote(str(user_provided_path).strip()))
    if "\x00" in decoded:
        raise HTTPException(status_code=400, detail="Security error: null bytes are not allowed")

    raw = decoded.replace("\\", "/")
    dir_str = str(directory.resolve()).replace("\\", "/")
    if raw.lower().startswith(dir_str.lower() + "/"):
        raw = raw[len(dir_str) + 1:]
    elif raw.lower().startswith(dir_str.lower()):
        raw = raw[len(dir_str):].lstrip("/")

    prefix = f"/outputs/{media_type}/"
    if raw.startswith(prefix):
        raw = raw[len(prefix):]
    elif raw.startswith(f"outputs/{media_type}/"):
        raw = raw[len(f"outputs/{media_type}/"):]

    raw = raw.strip()
    # Reject Windows drive letters (C:), UNC shares (//), or absolute root paths
    if raw.startswith("//") or raw.startswith("/") or ":" in raw:
        raise HTTPException(status_code=400, detail="Security error: path traversal is not allowed")

    candidate_input = Path(raw)
    raw_parts = raw.split("/")

    # Reject empty path, traversal components (.. or .), or empty path parts (//)
    if not raw_parts or any(part in {"", ".", ".."} for part in raw_parts):
        raise HTTPException(status_code=400, detail="Security error: path traversal is not allowed")

    if any(part.startswith(".") for part in raw_parts):
        raise HTTPException(status_code=400, detail="Security error: hidden files are not allowed")

    # Reject Windows reserved device names (CON, NUL, AUX, PRN, etc.)
    if any(Path(part).stem.upper() in WINDOWS_RESERVED for part in raw_parts):
        raise HTTPException(status_code=400, detail="Security error: reserved device names are not allowed")

    base = directory.resolve()
    candidate = (base / candidate_input).resolve()
    if not candidate.is_relative_to(base) or candidate == base:
        raise HTTPException(status_code=400, detail="Security error: path traversal is not allowed")

    # Follows symlinks; detects symlink escapes or non-regular files (directories, devices)
    if candidate.exists() and (candidate.is_symlink() or not candidate.is_file()):
        raise HTTPException(status_code=400, detail="Only regular media files can be accessed")
    if must_exist and not candidate.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return candidate
