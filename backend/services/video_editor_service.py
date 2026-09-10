import os
import subprocess
import uuid
import json
import logging
from pathlib import Path
from typing import Optional
from config import settings
from services.ffmpeg_service import get_media_duration
from database import db_save_asset

from services.security_service import safe_resolve_output_path

logger = logging.getLogger("omnistudio.video_editor")

def resolve_asset_path(path_str: str) -> Optional[Path]:
    if not path_str:
        return None
    try:
        return safe_resolve_output_path(path_str, must_exist=True)
    except Exception:
        return None

def _probe_has_audio(file_path: Path) -> bool:
    """Check if a media file contains an audio stream."""
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-select_streams", "a",
            "-show_entries", "stream=codec_type",
            "-of", "csv=p=0",
            str(file_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=10)
        return bool(res.stdout.strip())
    except Exception:
        return False

async def edit_video(
    video_path: str,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    speed: float = 1.0,
    aspect_ratio: str = "original",
    brightness: float = 0.0,
    contrast: float = 1.0,
    saturation: float = 1.0,
    preset_lut: Optional[str] = None,
    mute_original: bool = False,
    bg_audio_path: Optional[str] = None,
    bg_audio_volume: float = 0.5,
    original_audio_volume: float = 1.0,
    text_overlay: Optional[str] = None,
    text_position: str = "bottom",
    video_fade_in: float = 0.0,
    video_fade_out: float = 0.0,
    audio_fade_in: float = 0.0,
    audio_fade_out: float = 0.0,
    watermark_path: Optional[str] = None,
    watermark_position: str = "bottom_right",
    chroma_key_color: Optional[str] = None,
    chroma_bg_path: Optional[str] = None
) -> dict:
    """
    Comprehensive video post-processing engine using FFmpeg.
    Supports trimming, speed scaling, color grading, aspect ratio resizing,
    audio track replacement/mixing, text overlay, fade in/out,
    watermarking, and chroma key (green screen) compositing.
    """
    src_file = resolve_asset_path(video_path)
    if not src_file or not src_file.exists():
        return {"success": False, "error": f"Source video not found: {video_path}"}

    total_duration = get_media_duration(src_file)
    actual_end = min(end_time, total_duration) if end_time and end_time > start_time else total_duration
    trimmed_duration = max(0.5, actual_end - start_time)

    out_filename = f"edited_{uuid.uuid4().hex[:8]}.mp4"
    out_file = settings.VIDEOS_PATH / out_filename

    safe_speed = max(0.2, min(4.0, speed))
    target_output_dur = trimmed_duration / safe_speed

    # Detect if source has audio
    source_has_audio = _probe_has_audio(src_file)

    # ─── Collect Input Files ───
    # input_map tracks: key -> (index, path)
    # Index 0 is always the main video
    input_files = [src_file]  # idx 0 = main video

    bg_audio_file = resolve_asset_path(bg_audio_path) if bg_audio_path else None
    bg_audio_idx = -1
    if bg_audio_file and bg_audio_file.exists():
        bg_audio_idx = len(input_files)
        input_files.append(bg_audio_file)

    wm_file = resolve_asset_path(watermark_path) if watermark_path else None
    wm_idx = -1
    if wm_file and wm_file.exists():
        wm_idx = len(input_files)
        input_files.append(wm_file)

    chroma_bg_file = resolve_asset_path(chroma_bg_path) if chroma_bg_path else None
    chroma_bg_idx = -1
    if chroma_bg_file and chroma_bg_file.exists():
        chroma_bg_idx = len(input_files)
        input_files.append(chroma_bg_file)

    # ═══════════════════════════════════════════════
    # BUILD FILTER_COMPLEX GRAPH
    # ═══════════════════════════════════════════════
    filter_complex = []
    v_curr = "v0"

    # Start: copy video stream
    filter_complex.append("[0:v]copy[v0]")

    # 1. Speed adjustment (setpts)
    if safe_speed != 1.0:
        pts_mult = round(1.0 / safe_speed, 4)
        filter_complex.append(f"[{v_curr}]setpts={pts_mult}*PTS[v_speed]")
        v_curr = "v_speed"

    # 2. Aspect Ratio & Scaling
    aspect_scales = {
        "9:16": "1080:1920",
        "16:9": "1920:1080",
        "1:1":  "1080:1080",
        "4:3":  "1440:1080",
    }
    if aspect_ratio in aspect_scales:
        dims = aspect_scales[aspect_ratio]
        w, h = dims.split(":")
        filter_complex.append(
            f"[{v_curr}]scale={dims}:force_original_aspect_ratio=decrease,"
            f"pad={dims}:(ow-iw)/2:(oh-ih)/2:black[v_scale]"
        )
        v_curr = "v_scale"

    # 3. Color Grading (eq filter)
    b = max(-0.5, min(0.5, brightness))
    c = max(0.5, min(2.0, contrast))
    s = max(0.0, min(3.0, saturation))

    if preset_lut == "noir":
        s, c, b = 0.0, 1.3, -0.05
    elif preset_lut == "teal_orange":
        s, c, b = 1.35, 1.15, 0.02
    elif preset_lut == "cyberpunk":
        s, c, b = 1.5, 1.25, 0.05
    elif preset_lut == "vintage":
        s, c, b = 0.7, 0.95, 0.04

    if b != 0.0 or c != 1.0 or s != 1.0:
        filter_complex.append(f"[{v_curr}]eq=brightness={b}:contrast={c}:saturation={s}[v_eq]")
        v_curr = "v_eq"

    # 4. Chroma Key (Green Screen Removal)
    if chroma_key_color and chroma_bg_idx != -1:
        color = chroma_key_color.strip().replace("'", "")
        # Scale replacement background to match current video dimensions
        filter_complex.append(f"[{chroma_bg_idx}:v]scale=1920:1080:force_original_aspect_ratio=decrease,"
                              f"pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black[v_cbg]")
        # Apply colorkey to foreground video
        filter_complex.append(f"[{v_curr}]colorkey={color}:0.12:0.15[v_fgck]")
        # Overlay keyed foreground onto new background
        filter_complex.append(f"[v_cbg][v_fgck]overlay=shortest=1[v_ck]")
        v_curr = "v_ck"

    # 5. Text Overlay
    if text_overlay and text_overlay.strip():
        clean_text = text_overlay.strip().replace(":", "\\:").replace("'", "\\'").replace('"', '\\"')
        y_pos = "h-th-40" if text_position == "bottom" else ("40" if text_position == "top" else "(h-th)/2")
        drawtext_filter = (
            f"drawtext=text='{clean_text}':x=(w-tw)/2:y={y_pos}:"
            f"fontsize=36:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=10"
        )
        filter_complex.append(f"[{v_curr}]{drawtext_filter}[v_txt]")
        v_curr = "v_txt"

    # 6. Watermark / Logo Overlay
    if wm_idx != -1:
        filter_complex.append(f"[{wm_idx}:v]scale=200:-1[wm_scaled]")

        pos_map = {
            "top_left": "10:10",
            "top_right": "main_w-overlay_w-10:10",
            "bottom_left": "10:main_h-overlay_h-10",
            "bottom_right": "main_w-overlay_w-10:main_h-overlay_h-10",
            "center": "(main_w-overlay_w)/2:(main_h-overlay_h)/2"
        }
        overlay_pos = pos_map.get(watermark_position, pos_map["bottom_right"])
        filter_complex.append(f"[{v_curr}][wm_scaled]overlay={overlay_pos}[v_wm]")
        v_curr = "v_wm"

    # 7. Video Fade In / Fade Out
    safe_vfi = max(0.0, min(video_fade_in, target_output_dur / 2))
    safe_vfo = max(0.0, min(video_fade_out, target_output_dur / 2))
    if safe_vfi > 0:
        filter_complex.append(f"[{v_curr}]fade=t=in:st=0:d={round(safe_vfi, 2)}[v_fi]")
        v_curr = "v_fi"
    if safe_vfo > 0:
        out_start = max(0, round(target_output_dur - safe_vfo, 2))
        filter_complex.append(f"[{v_curr}]fade=t=out:st={out_start}:d={round(safe_vfo, 2)}[v_fo]")
        v_curr = "v_fo"

    # ─── Audio Filter Graph ───
    a_curr = None
    safe_afi = max(0.0, min(audio_fade_in, target_output_dur / 2))
    safe_afo = max(0.0, min(audio_fade_out, target_output_dur / 2))

    if not mute_original and source_has_audio:
        filter_complex.append("[0:a]aformat=sample_rates=44100:channel_layouts=stereo[a0]")
        a_curr = "a0"

        # Speed adjustment for audio
        if safe_speed != 1.0:
            curr = safe_speed
            atempos = []
            while curr > 2.0:
                atempos.append("atempo=2.0")
                curr /= 2.0
            while curr < 0.5:
                atempos.append("atempo=0.5")
                curr /= 0.5
            atempos.append(f"atempo={round(curr, 4)}")
            filter_complex.append(f"[{a_curr}]{','.join(atempos)}[a_speed]")
            a_curr = "a_speed"

        # Volume
        if original_audio_volume != 1.0:
            filter_complex.append(f"[{a_curr}]volume={max(0.0, min(2.0, original_audio_volume))}[a_vol]")
            a_curr = "a_vol"

        # Audio Fade In/Out on original track
        if safe_afi > 0:
            filter_complex.append(f"[{a_curr}]afade=t=in:st=0:d={round(safe_afi, 2)}[a_fi]")
            a_curr = "a_fi"
        if safe_afo > 0:
            out_start = max(0, round(target_output_dur - safe_afo, 2))
            filter_complex.append(f"[{a_curr}]afade=t=out:st={out_start}:d={round(safe_afo, 2)}[a_fo]")
            a_curr = "a_fo"

    # Background audio mixing
    if bg_audio_idx != -1:
        bg_vol = max(0.0, min(2.0, bg_audio_volume))
        filter_complex.append(f"[{bg_audio_idx}:a]volume={bg_vol}[a_bg_vol]")
        a_bg = "a_bg_vol"

        if safe_afi > 0:
            filter_complex.append(f"[{a_bg}]afade=t=in:st=0:d={round(safe_afi, 2)}[a_bg_fi]")
            a_bg = "a_bg_fi"
        if safe_afo > 0:
            out_start = max(0, round(target_output_dur - safe_afo, 2))
            filter_complex.append(f"[{a_bg}]afade=t=out:st={out_start}:d={round(safe_afo, 2)}[a_bg_fo]")
            a_bg = "a_bg_fo"

        if a_curr is not None:
            filter_complex.append(f"[{a_curr}][{a_bg}]amix=inputs=2:duration=first:dropout_transition=2[a_mix]")
            a_curr = "a_mix"
        else:
            a_curr = a_bg

    # ═══════════════════════════════════════════════
    # BUILD FFMPEG COMMAND
    # ═══════════════════════════════════════════════
    cmd = ["ffmpeg", "-y"]

    # Seek ONLY on the main video input (before first -i)
    if start_time > 0:
        cmd.extend(["-ss", str(round(start_time, 3))])

    # Add all inputs (idx 0 = main video, then bg audio, watermark, chroma bg)
    for i, ip in enumerate(input_files):
        cmd.extend(["-i", str(ip)])

    # Output duration
    cmd.extend(["-t", str(round(target_output_dur, 3))])

    # Filter complex
    fc_str = ";".join(filter_complex)
    cmd.extend(["-filter_complex", fc_str])

    # Map video output
    cmd.extend(["-map", f"[{v_curr}]"])

    # Map audio output
    if a_curr is not None:
        cmd.extend(["-map", f"[{a_curr}]"])
    elif mute_original and bg_audio_idx == -1:
        # Fully muted, no bg audio -> no audio
        cmd.append("-an")

    cmd.extend([
        "-c:v", "libx264",
        "-crf", "18",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(out_file)
    ])

    logger.info("Video edit FFmpeg command: %s", " ".join(cmd))

    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=180)
        if proc.returncode != 0 or not out_file.exists():
            logger.error("FFmpeg edit failed: %s", proc.stderr[-600:] if proc.stderr else "Unknown")
            return {
                "success": False,
                "error": f"FFmpeg processing error: {proc.stderr[-400:] if proc.stderr else 'Unknown failure'}"
            }

        out_stat = out_file.stat()
        out_url = f"/outputs/videos/{out_filename}"

        # Register edited asset in database
        asset_id = f"asset_{uuid.uuid4().hex[:12]}"
        db_save_asset(
            asset_id=asset_id,
            asset_type="videos",
            filename=out_filename,
            url=out_url,
            local_path=str(out_file),
            size_bytes=out_stat.st_size,
            mime_type="video/mp4",
            metadata={
                "edited_from": str(src_file.name),
                "speed": safe_speed,
                "aspect_ratio": aspect_ratio,
                "lut": preset_lut,
                "trimmed": start_time > 0 or (end_time and end_time < total_duration),
                "has_watermark": wm_idx != -1,
                "has_chroma_key": chroma_key_color is not None and chroma_bg_idx != -1,
                "fade_in": video_fade_in,
                "fade_out": video_fade_out,
            }
        )

        return {
            "success": True,
            "filename": out_filename,
            "url": out_url,
            "local_path": str(out_file),
            "size_bytes": out_stat.st_size,
            "size_mb": round(out_stat.st_size / (1024 * 1024), 2),
            "duration": round(target_output_dur, 2),
            "aspect_ratio": aspect_ratio,
            "speed": safe_speed
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Video processing operation timed out (180s limit)"}
    except Exception as e:
        logger.exception("Unexpected video edit error")
        return {"success": False, "error": str(e)}
