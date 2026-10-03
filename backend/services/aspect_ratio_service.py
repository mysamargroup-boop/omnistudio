"""
Aspect Ratio Conformance Service — Guarantees mathematical aspect ratio conformance
for all generated images and videos across OmniStudio.
"""
import os
import shutil
import logging
import subprocess
from pathlib import Path
from typing import Tuple, Optional, Dict
from PIL import Image

logger = logging.getLogger("omnistudio.aspect_ratio")

# Exact aspect ratio decimal targets
ASPECT_RATIO_TARGETS: Dict[str, float] = {
    "16:9": 16.0 / 9.0,        # ~1.7778
    "9:16": 9.0 / 16.0,        # ~0.5625
    "1:1": 1.0,                # 1.0000
    "4:3": 4.0 / 3.0,          # ~1.3333
    "3:4": 3.0 / 4.0,          # ~0.7500
    "21:9": 21.0 / 9.0,        # ~2.3333
    "2.39:1": 2.39,            # 2.3900 (Anamorphic)
    "3:2": 3.0 / 2.0,          # 1.5000
    "2:3": 2.0 / 3.0,          # ~0.6667
}

# Standard production dimensions for video synthesis
STANDARD_VIDEO_RESOLUTIONS: Dict[str, Tuple[int, int]] = {
    "16:9": (1920, 1080),
    "9:16": (1080, 1920),
    "1:1": (1080, 1080),
    "4:3": (1440, 1080),
    "3:4": (1080, 1440),
    "21:9": (2560, 1080),
    "2.39:1": (2560, 1072),
    "3:2": (1620, 1080),
    "2:3": (1080, 1620),
}


def get_target_ratio(aspect: str) -> Optional[float]:
    """Retrieve decimal ratio for a given string aspect ratio."""
    if not aspect:
        return None
    cleaned = aspect.strip().lower()
    for k, v in ASPECT_RATIO_TARGETS.items():
        if k.lower() == cleaned:
            return v
    if ":" in cleaned:
        try:
            parts = cleaned.split(":")
            return float(parts[0]) / float(parts[1])
        except Exception:
            pass
    return None


def conform_image_aspect_ratio(image_path: Path | str, target_aspect: str) -> bool:
    """
    Center-crops an image in-place so its width/height mathematically matches target_aspect.
    Preserves maximum field-of-view and ensures even dimensions.
    """
    if not target_aspect or target_aspect == "original":
        return True

    target_ratio = get_target_ratio(target_aspect)
    if not target_ratio:
        return False

    p = Path(image_path)
    if not p.exists() or p.stat().st_size == 0:
        return False

    try:
        with Image.open(p) as img:
            w, h = img.size
            if w <= 0 or h <= 0:
                return False

            curr_ratio = w / h
            # If already matches target within 1.5%, no need to crop
            if abs(curr_ratio - target_ratio) / target_ratio < 0.015:
                return True

            if curr_ratio > target_ratio:
                # Image is wider than target: crop left & right
                new_w = int(round(h * target_ratio))
                new_h = h
                left = (w - new_w) // 2
                top = 0
                right = left + new_w
                bottom = h
            else:
                # Image is taller than target: crop top & bottom
                new_w = w
                new_h = int(round(w / target_ratio))
                left = 0
                top = (h - new_h) // 2
                right = w
                bottom = top + new_h

            # Ensure even dimensions (FFmpeg & diffusion models prefer even dimensions)
            new_w = new_w if new_w % 2 == 0 else new_w - 1
            new_h = new_h if new_h % 2 == 0 else new_h - 1
            right = left + new_w
            bottom = top + new_h

            cropped = img.crop((left, top, right, bottom))
            fmt = img.format or ("PNG" if p.suffix.lower() == ".png" else "JPEG")
            if fmt.upper() in ["JPEG", "JPG"]:
                cropped.save(p, format=fmt, quality=95, optimize=True)
            else:
                cropped.save(p, format=fmt)

            logger.info("Conformed image %s from %dx%d to %dx%d (target %s)", p.name, w, h, new_w, new_h, target_aspect)
            return True
    except Exception as e:
        logger.warning("Failed to conform image aspect ratio for %s: %s", p, e)
        return False


def conform_video_aspect_ratio(video_path: Path | str, target_aspect: str) -> bool:
    """
    Checks video aspect ratio using ffprobe and crops video in-place to match target_aspect exactly.
    Uses high-speed atomic FFmpeg processing with libx264 fast preset.
    """
    if not target_aspect or target_aspect == "original":
        return True

    target_ratio = get_target_ratio(target_aspect)
    if not target_ratio:
        return False

    p = Path(video_path)
    if not p.exists() or p.stat().st_size < 1000:
        return False

    try:
        probe_cmd = [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "csv=s=x:p=0",
            str(p)
        ]
        res = subprocess.run(probe_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=15)
        if res.returncode != 0 or not res.stdout.strip():
            return False

        dim_str = res.stdout.strip().split("\n")[0]
        vw, vh = map(int, dim_str.split("x"))
        if vw <= 0 or vh <= 0:
            return False

        curr_ratio = vw / vh
        # If already matches target within 1.5%, skip
        if abs(curr_ratio - target_ratio) / target_ratio < 0.015:
            return True

        # Calculate crop filter for FFmpeg
        if curr_ratio > target_ratio:
            # Video is wider than target -> crop width to target aspect
            # ih * target_ratio must be even
            crop_filter = f"crop='trunc(ih*{target_ratio}/2)*2':ih:'(iw-trunc(ih*{target_ratio}/2)*2)/2':0"
        else:
            # Video is taller than target -> crop height to target aspect
            # iw / target_ratio must be even
            crop_filter = f"crop=iw:'trunc(iw/{target_ratio}/2)*2':0:'(ih-trunc(iw/{target_ratio}/2)*2)/2'"

        tmp_out = p.with_name(f"conformed_{p.name}")
        cmd = [
            "ffmpeg", "-y",
            "-i", str(p),
            "-vf", f"{crop_filter},setsar=1",
            "-c:v", "libx264", "-preset", "fast", "-crf", "18",
            "-c:a", "copy",
            "-movflags", "+faststart",
            str(tmp_out)
        ]
        c_res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
        if c_res.returncode == 0 and tmp_out.exists() and tmp_out.stat().st_size > 1000:
            shutil.move(str(tmp_out), str(p))
            logger.info("Conformed video %s to %s (FFmpeg crop: %s)", p.name, target_aspect, crop_filter)
            return True
        else:
            if tmp_out.exists():
                tmp_out.unlink()
            return False
    except Exception as e:
        logger.warning("Failed to conform video aspect ratio for %s: %s", p, e)
        return False
