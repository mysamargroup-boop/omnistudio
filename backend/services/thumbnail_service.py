"""
On-demand thumbnail generation for /outputs media.

- Images  -> resized WebP (long edge = requested width)
- Videos  -> poster frame extracted with FFmpeg, then resized WebP

Thumbnails are cached on disk under outputs/.thumbs/ and keyed by source
mtime + size so a regenerated file automatically gets a fresh thumbnail.
"""
from __future__ import annotations

import hashlib
import logging
import subprocess
import threading
from pathlib import Path
from typing import Optional

from config import settings

logger = logging.getLogger("omnistudio.thumbnails")

THUMB_ROOT = settings.OUTPUTS_PATH / ".thumbs"
ALLOWED_WIDTHS = (64, 128, 256, 384, 512, 768, 1024)
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
VIDEO_EXTS = {".mp4", ".mov", ".webm", ".m4v", ".mkv"}

_locks: dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()


def snap_width(w: int) -> int:
    """Snap an arbitrary width to the nearest allowed bucket (limits cache variants)."""
    for allowed in ALLOWED_WIDTHS:
        if w <= allowed:
            return allowed
    return ALLOWED_WIDTHS[-1]


def is_thumbnailable(path: Path) -> bool:
    ext = path.suffix.lower()
    return ext in IMAGE_EXTS or ext in VIDEO_EXTS


def _cache_path(src: Path, width: int) -> Path:
    st = src.stat()
    key = hashlib.sha1(f"{src.resolve()}|{st.st_mtime_ns}|{st.st_size}|{width}".encode()).hexdigest()[:20]
    return THUMB_ROOT / key[:2] / f"{src.stem[:40]}_{width}_{key}.webp"


def _lock_for(key: str) -> threading.Lock:
    with _locks_guard:
        lock = _locks.get(key)
        if lock is None:
            lock = threading.Lock()
            _locks[key] = lock
        return lock


def _extract_video_frame(src: Path, out_jpg: Path) -> bool:
    for seek in ("0.5", "0"):
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-threads", "1", "-loglevel", "error", "-ss", seek, "-i", str(src),
                 "-frames:v", "1", "-threads", "1", "-q:v", "3", str(out_jpg)],
                check=True, timeout=20, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            if out_jpg.exists() and out_jpg.stat().st_size > 0:
                return True
        except Exception as e:  # noqa: BLE001
            logger.debug("Frame extract failed (seek=%s) for %s: %s", seek, src.name, e)
    return False


def get_thumbnail(src: Path, width: int) -> Optional[Path]:
    """Return path to a cached WebP thumbnail, generating it if needed. None on failure."""
    try:
        if not src.exists() or not src.is_file() or not is_thumbnailable(src):
            return None
        width = snap_width(int(width))
        out = _cache_path(src, width)
        if out.exists():
            return out

        with _lock_for(str(out)):
            if out.exists():
                return out
            out.parent.mkdir(parents=True, exist_ok=True)

            from PIL import Image

            source_for_pil = src
            tmp_frame: Optional[Path] = None
            if src.suffix.lower() in VIDEO_EXTS:
                tmp_frame = out.with_suffix(".frame.jpg")
                if not _extract_video_frame(src, tmp_frame):
                    return None
                source_for_pil = tmp_frame

            try:
                with Image.open(source_for_pil) as im:
                    if getattr(im, "is_animated", False):
                        im.seek(0)
                    im = im.convert("RGBA") if im.mode in ("P", "LA") else im
                    if im.mode not in ("RGB", "RGBA"):
                        im = im.convert("RGB")
                    im.thumbnail((width, width), Image.LANCZOS)
                    tmp_out = out.with_suffix(".tmp.webp")
                    im.save(tmp_out, "WEBP", quality=78, method=4)
                    tmp_out.replace(out)
            finally:
                if tmp_frame is not None:
                    tmp_frame.unlink(missing_ok=True)
        return out
    except Exception as e:  # noqa: BLE001
        logger.warning("Thumbnail generation failed for %s: %s", src, e)
        return None
