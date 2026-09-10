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
    "trash/images": settings.TRASH_PATH / "images",
    "trash/videos": settings.TRASH_PATH / "videos",
    "trash/audio": settings.TRASH_PATH / "audio",
    "trash/final": settings.TRASH_PATH / "final",
}


def safe_resolve_output_path(user_provided_path: str, media_type: str, *, must_exist: bool = False) -> Path:
    """Resolve a media URL/path to a regular file inside one media directory.

    ``media_type`` is intentionally not inferred from arbitrary paths.  That
    keeps one endpoint or operation from reading another output category.
    """
    directory = MEDIA_DIRECTORIES.get(media_type)
    if directory is None:
        raise HTTPException(status_code=400, detail="Unsupported media type")
    if not user_provided_path or not str(user_provided_path).strip():
        raise HTTPException(status_code=400, detail="Path parameter is required")

    raw = str(user_provided_path).strip().replace("\\", "/")
    prefix = f"/outputs/{media_type}/"
    if raw.startswith(prefix):
        raw = raw[len(prefix):]
    elif raw.startswith(f"outputs/{media_type}/"):
        raw = raw[len(f"outputs/{media_type}/"):]

    candidate_input = Path(raw)
    if candidate_input.is_absolute() or any(part in {"", ".", ".."} for part in candidate_input.parts):
        raise HTTPException(status_code=400, detail="Security error: path traversal is not allowed")

    base = directory.resolve()
    candidate = (base / candidate_input).resolve()
    if not candidate.is_relative_to(base):
        raise HTTPException(status_code=400, detail="Security error: path traversal is not allowed")
    # Resolve follows a link, so this also detects a symlink that leaves base.
    if candidate.exists() and (candidate.is_symlink() or not candidate.is_file()):
        raise HTTPException(status_code=400, detail="Only regular media files can be accessed")
    if must_exist and not candidate.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return candidate
