import subprocess
import json
import shutil
import uuid
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger("omnistudio.ffmpeg")

SAFE_MOTION_TYPES = {"zoom_in", "zoom_out", "pan_left", "pan_right", "tilt_up", "tilt_down", "orbit", "subtle"}
SAFE_TRANSITIONS = {"smooth_morph", "cross_dissolve", "zoom_blend", "directional_wipe"}

def check_ffmpeg() -> dict:
    """Verify FFmpeg is installed and get version info"""
    ffmpeg_bin = shutil.which("ffmpeg")
    if not ffmpeg_bin:
        return {"available": False, "error": "FFmpeg binary not found in PATH"}
    
    try:
        res = subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
        first_line = res.stdout.splitlines()[0] if res.stdout else "FFmpeg Available"
        return {"available": True, "version": first_line}
    except subprocess.TimeoutExpired:
        logger.warning("FFmpeg version check timed out")
        return {"available": False, "error": "FFmpeg version check timed out"}
    except Exception as e:
        logger.warning("FFmpeg check failed: %s", e)
        return {"available": False, "error": str(e)}

def get_media_duration(file_path: Path | str) -> float:
    """Get duration of video or audio file in seconds using ffprobe with timeout"""
    try:
        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(file_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=10)
        return float(res.stdout.strip())
    except subprocess.TimeoutExpired:
        logger.warning("ffprobe duration query timed out on %s", file_path)
        return 5.0
    except Exception as e:
        logger.debug("ffprobe failed on %s: %s (using fallback 5.0s)", file_path, e)
        return 5.0

def image_to_video_motion(
    image_path: Path | str,
    output_path: Path | str,
    duration: float = 4.0,
    motion_type: str = "zoom_in",
    fps: int = 30,
    width: int = 1280,
    height: int = 720,
    crf: str = "18",
    preset: str = "fast",
    loop: bool = False
) -> Path:
    """
    Transform a static image into a cinematic animated video clip using FFmpeg filtergraphs.
    Enforces strict timeout (180s) and validates ALL numeric parameters to prevent filter injection.
    """
    if motion_type not in SAFE_MOTION_TYPES:
        motion_type = "zoom_in"

    try:
        duration = float(duration)
        fps = int(fps)
        width = int(width)
        height = int(height)
    except (TypeError, ValueError):
        raise ValueError("Invalid numeric motion parameters")

    duration = min(max(duration, 0.5), 120.0)
    fps = min(max(fps, 1), 120)
    width = min(max(width, 160), 7680)
    height = min(max(height, 120), 4320)
    safe_crf = str(min(max(int(crf) if str(crf).isdigit() else 18, 0), 51))
    safe_preset = preset if preset in {"ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"} else "fast"

    total_frames = int(duration * fps)
    
    motion_filters = {
        "zoom_in": f"zoompan=z='min(zoom+0.0015,1.5)':d={total_frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={width}x{height}:fps={fps}",
        "zoom_out": f"zoompan=z='if(lte(zoom,1.0),1.5,max(1.001,zoom-0.0015))':d={total_frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={width}x{height}:fps={fps}",
        "pan_left": f"zoompan=z=1.15:x='if(lte(on,-1),(itld-1)*0.75,max(0,x-1.5))':y='ih/2-(ih/zoom/2)':d={total_frames}:s={width}x{height}:fps={fps}",
        "pan_right": f"zoompan=z=1.15:x='if(lte(on,1),0,min(iw-iw/zoom,x+1.5))':y='ih/2-(ih/zoom/2)':d={total_frames}:s={width}x{height}:fps={fps}",
        "tilt_up": f"zoompan=z=1.15:x='iw/2-(iw/zoom/2)':y='if(lte(on,-1),0,max(0,y-1.2))':d={total_frames}:s={width}x{height}:fps={fps}",
        "tilt_down": f"zoompan=z=1.15:x='iw/2-(iw/zoom/2)':y='if(lte(on,1),0,min(ih-ih/zoom,y+1.2))':d={total_frames}:s={width}x{height}:fps={fps}",
        "orbit": f"zoompan=z='1.1+0.05*sin(on/20)':x='(iw-iw/zoom)/2+sin(on/30)*20':y='(ih-ih/zoom)/2+cos(on/30)*15':d={total_frames}:s={width}x{height}:fps={fps}",
        "subtle": f"zoompan=z='1.05+0.02*sin(on/25)':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d={total_frames}:s={width}x{height}:fps={fps}",
    }
    
    vf = motion_filters.get(motion_type, motion_filters["zoom_in"])
    
    temp_clip = None
    if loop:
        temp_dir = Path(output_path).parent / "temp_loop"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_clip = temp_dir / f"temp_{Path(output_path).stem}.mp4"
        target_out = temp_clip
    else:
        target_out = output_path
        
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", str(image_path),
        "-vf", vf,
        "-c:v", "libx264",
        "-crf", safe_crf,
        "-preset", safe_preset,
        "-t", str(duration),
        "-pix_fmt", "yuv420p",
        str(target_out)
    ]
    
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=180)
        if res.returncode != 0:
            logger.warning("FFmpeg zoompan failed, falling back to scale: %s", res.stderr)
            fallback_cmd = [
                "ffmpeg", "-y",
                "-loop", "1",
                "-i", str(image_path),
                "-vf", f"scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height}",
                "-c:v", "libx264",
                "-crf", safe_crf,
                "-preset", safe_preset,
                "-t", str(duration),
                "-pix_fmt", "yuv420p",
                str(target_out)
            ]
            subprocess.run(fallback_cmd, check=True, timeout=180)
    except subprocess.TimeoutExpired:
        logger.error("FFmpeg motion generation timed out (180s) on %s", image_path)
        raise RuntimeError("Video motion generation timed out")

    if loop and temp_clip and temp_clip.exists():
        loop_cmd = [
            "ffmpeg", "-y",
            "-i", str(temp_clip),
            "-filter_complex", "[0:v]reverse[r];[0:v][r]concat=n=2:v=1:a=0[outv]",
            "-map", "[outv]",
            "-c:v", "libx264",
            "-crf", safe_crf,
            "-preset", safe_preset,
            "-pix_fmt", "yuv420p",
            str(output_path)
        ]
        try:
            loop_res = subprocess.run(loop_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=180)
            if loop_res.returncode != 0:
                shutil.copyfile(str(temp_clip), str(output_path))
        except subprocess.TimeoutExpired:
            shutil.copyfile(str(temp_clip), str(output_path))
        finally:
            try:
                temp_clip.unlink(missing_ok=True)
            except Exception as e:
                logger.debug("Failed to remove temp_clip: %s", e)
        
    return Path(output_path)

def merge_audio_video(
    video_path: Path | str,
    audio_path: Path | str,
    output_path: Path | str,
    loop_video_to_match_audio: bool = True
) -> Path:
    """Merge an audio voiceover file with a video clip with timeout (180s)"""
    audio_dur = get_media_duration(audio_path)
    video_dur = get_media_duration(video_path)
    
    if loop_video_to_match_audio and audio_dur > video_dur:
        cmd = [
            "ffmpeg", "-y",
            "-stream_loop", "-1",
            "-i", str(video_path),
            "-i", str(audio_path),
            "-c:v", "libx264",
            "-c:a", "aac",
            "-b:a", "192k",
            "-t", str(audio_dur + 0.3),
            "-pix_fmt", "yuv420p",
            "-shortest",
            str(output_path)
        ]
    else:
        cmd = [
            "ffmpeg", "-y",
            "-i", str(video_path),
            "-i", str(audio_path),
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-t", str(audio_dur + 0.3),
            "-shortest",
            str(output_path)
        ]
        
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=180)
    except subprocess.TimeoutExpired:
        logger.error("FFmpeg merge_audio_video timed out on %s", output_path)
        raise RuntimeError("Audio/video merge operation timed out")
    return Path(output_path)

def concatenate_videos(video_paths: list[Path | str], output_path: Path | str) -> Path:
    """Concatenate multiple MP4 clips into one master video with timeout (300s)"""
    if not video_paths:
        raise ValueError("No video paths provided")
        
    if len(video_paths) == 1:
        shutil.copyfile(video_paths[0], output_path)
        return Path(output_path)
        
    list_file = Path(output_path).parent / f"concat_list_{Path(output_path).stem}.txt"
    with open(list_file, "w", encoding="utf-8") as f:
        for vp in video_paths:
            normalized = str(Path(vp).resolve()).replace("\\", "/")
            f.write(f"file '{normalized}'\n")
            
    try:
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(list_file),
            "-c", "copy",
            str(output_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=300)
        if res.returncode != 0:
            reencode_cmd = [
                "ffmpeg", "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", str(list_file),
                "-c:v", "libx264",
                "-c:a", "aac",
                "-pix_fmt", "yuv420p",
                str(output_path)
            ]
            subprocess.run(reencode_cmd, check=True, timeout=300)
    except subprocess.TimeoutExpired:
        logger.error("FFmpeg concatenate_videos timed out on %s", output_path)
        raise RuntimeError("Video concatenation timed out")
    finally:
        if list_file.exists():
            try:
                list_file.unlink()
            except Exception as e:
                logger.debug("Failed to unlink concat list_file: %s", e)
            
    return Path(output_path)

def keyframe_interpolate_motion(
    start_image_path: Path | str,
    end_image_path: Path | str,
    output_path: Path | str,
    duration: float = 4.0,
    transition_type: str = "smooth_morph",
    fps: int = 30,
    width: int = 1280,
    height: int = 720
) -> Path:
    """
    Interpolate between Start Frame (Keyframe A) and End Frame (Keyframe B).
    Generates animated motion clips for both frames and blends them seamlessly
    using hardware-accelerated FFmpeg xfade transition filters. Timeout: 300s.
    """
    if transition_type not in SAFE_TRANSITIONS:
        transition_type = "smooth_morph"

    try:
        duration = float(duration)
        fps = int(fps)
        width = int(width)
        height = int(height)
    except (TypeError, ValueError):
        raise ValueError("Invalid numeric interpolation parameters")

    duration = min(max(duration, 0.5), 300.0)
    fps = min(max(fps, 1), 120)
    width = min(max(width, 160), 7680)
    height = min(max(height, 120), 4320)

    trans_map = {
        "smooth_morph": "dissolve",
        "cross_dissolve": "fade",
        "zoom_blend": "circleopen",
        "directional_wipe": "wipeleft"
    }
    xfade_trans = trans_map.get(transition_type, "fade")
    
    fade_duration = min(1.2, duration / 3.0)
    clip_dur = (duration / 2.0) + (fade_duration / 2.0)
    offset = clip_dur - fade_duration
    
    temp_dir = Path(output_path).parent / "temp_keyframes"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_clip1 = temp_dir / f"clip1_{Path(output_path).stem}.mp4"
    temp_clip2 = temp_dir / f"clip2_{Path(output_path).stem}.mp4"
    
    try:
        image_to_video_motion(
            image_path=start_image_path,
            output_path=temp_clip1,
            duration=clip_dur,
            motion_type="zoom_in",
            fps=fps,
            width=width,
            height=height
        )
        
        image_to_video_motion(
            image_path=end_image_path,
            output_path=temp_clip2,
            duration=clip_dur,
            motion_type="subtle",
            fps=fps,
            width=width,
            height=height
        )
        
        xfade_filter = f"[0:v][1:v]xfade=transition={xfade_trans}:duration={fade_duration}:offset={offset},format=yuv420p[v]"
        cmd = [
            "ffmpeg", "-y",
            "-i", str(temp_clip1),
            "-i", str(temp_clip2),
            "-filter_complex", xfade_filter,
            "-map", "[v]",
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "fast",
            "-t", str(duration),
            str(output_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=300)
        if res.returncode != 0:
            concatenate_videos([temp_clip1, temp_clip2], output_path)
    except subprocess.TimeoutExpired:
        logger.error("FFmpeg keyframe_interpolate_motion timed out")
        raise RuntimeError("Keyframe interpolation timed out")
    finally:
        if temp_clip1.exists():
            try: temp_clip1.unlink()
            except Exception as e: logger.debug("unlink temp_clip1 failed: %s", e)
        if temp_clip2.exists():
            try: temp_clip2.unlink()
            except Exception as e: logger.debug("unlink temp_clip2 failed: %s", e)
            
    return Path(output_path)

# Alias for backward compatibility
merge_video_audio = merge_audio_video
