import subprocess
import json
import shutil
import uuid
from pathlib import Path
from typing import Optional

def check_ffmpeg() -> dict:
    """Verify FFmpeg is installed and get version info"""
    ffmpeg_bin = shutil.which("ffmpeg")
    if not ffmpeg_bin:
        return {"available": False, "error": "FFmpeg binary not found in PATH"}
    
    try:
        res = subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
        first_line = res.stdout.splitlines()[0] if res.stdout else "FFmpeg Available"
        return {"available": True, "version": first_line}
    except Exception as e:
        return {"available": False, "error": str(e)}

def get_media_duration(file_path: Path | str) -> float:
    """Get duration of video or audio file in seconds using ffprobe"""
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
    except Exception:
        return 5.0  # Fallback duration

def image_to_video_motion(
    image_path: Path | str,
    output_path: Path | str,
    duration: float = 4.0,
    motion_type: str = "zoom_in",
    fps: int = 30,
    width: int = 1280,
    height: int = 720,
    quality: str = "balanced",
    motion_intensity: float = 1.0,
    loop: bool = False
) -> Path:
    """
    Animate a still image into a dynamic video with camera motions (Ken Burns effect).
    Supports customizable quality (CRF), motion speed intensity, and seamless looping.
    """
    total_frames = int(duration * fps)
    
    # Motion speed multiplier
    z_step = 0.0015 * motion_intensity
    pan_step = 1.5 * motion_intensity
    
    if motion_type == "zoom_in":
        vf = f"scale=8000:-1,zoompan=z='min(zoom+{z_step},1.35)':d={total_frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={width}x{height}:fps={fps}"
    elif motion_type == "zoom_out":
        vf = f"scale=8000:-1,zoompan=z='if(lte(zoom,1.0),1.35,max(1.001,zoom-{z_step}))':d={total_frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={width}x{height}:fps={fps}"
    elif motion_type == "pan_left":
        vf = f"scale=8000:-1,zoompan=z='1.15':d={total_frames}:x='if(lte(on,1),(iw-iw/zoom),(x-{pan_step}))':y='ih/2-(ih/zoom/2)':s={width}x{height}:fps={fps}"
    elif motion_type == "pan_right":
        vf = f"scale=8000:-1,zoompan=z='1.15':d={total_frames}:x='if(lte(on,1),0,(x+{pan_step}))':y='ih/2-(ih/zoom/2)':s={width}x{height}:fps={fps}"
    elif motion_type == "tilt_up":
        vf = f"scale=8000:-1,zoompan=z='1.15':d={total_frames}:x='iw/2-(iw/zoom/2)':y='if(lte(on,1),(ih-ih/zoom),(y-{pan_step}))':s={width}x{height}:fps={fps}"
    elif motion_type == "tilt_down":
        vf = f"scale=8000:-1,zoompan=z='1.15':d={total_frames}:x='iw/2-(iw/zoom/2)':y='if(lte(on,1),0,(y+{pan_step}))':s={width}x{height}:fps={fps}"
    elif motion_type == "orbit":
        vf = f"scale=8000:-1,zoompan=z='min(zoom+{z_step * 0.7},1.2)':d={total_frames}:x='iw/2-(iw/zoom/2)+cos(on/25)*15':y='ih/2-(ih/zoom/2)+sin(on/25)*10':s={width}x{height}:fps={fps}"
    else:  # subtle float
        vf = f"scale=8000:-1,zoompan=z='min(zoom+{z_step * 0.5},1.15)':d={total_frames}:x='iw/2-(iw/zoom/2)+sin(on/30)*10':y='ih/2-(ih/zoom/2)+cos(on/30)*5':s={width}x{height}:fps={fps}"

    # Quality settings
    crf = "14" if quality == "cinema" else ("24" if quality == "draft" else "18")
    preset = "slow" if quality == "cinema" else ("veryfast" if quality == "draft" else "fast")

    # If loop is enabled, create forward clip then concat reverse to make seamless ping-pong loop
    target_out = output_path
    temp_clip = None
    if loop:
        temp_dir = Path(output_path).parent / "temp_loops"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_clip = temp_dir / f"loop_fwd_{uuid.uuid4().hex[:8]}.mp4"
        target_out = temp_clip

    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", str(image_path),
        "-vf", vf,
        "-c:v", "libx264",
        "-crf", crf,
        "-preset", preset,
        "-t", str(duration),
        "-pix_fmt", "yuv420p",
        str(target_out)
    ]
    
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        # Fallback simpler scale if zoompan filter fails on odd aspect ratio
        fallback_cmd = [
            "ffmpeg", "-y",
            "-loop", "1",
            "-i", str(image_path),
            "-vf", f"scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height}",
            "-c:v", "libx264",
            "-crf", crf,
            "-preset", preset,
            "-t", str(duration),
            "-pix_fmt", "yuv420p",
            str(target_out)
        ]
        subprocess.run(fallback_cmd, check=True)

    if loop and temp_clip and temp_clip.exists():
        # Concat original + reversed clip for seamless ping-pong loop
        loop_cmd = [
            "ffmpeg", "-y",
            "-i", str(temp_clip),
            "-filter_complex", "[0:v]reverse[r];[0:v][r]concat=n=2:v=1:a=0[outv]",
            "-map", "[outv]",
            "-c:v", "libx264",
            "-crf", crf,
            "-preset", preset,
            "-pix_fmt", "yuv420p",
            str(output_path)
        ]
        loop_res = subprocess.run(loop_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            temp_clip.unlink(missing_ok=True)
        except Exception:
            pass
        if loop_res.returncode != 0:
            # Fallback to single clip if reverse concat failed
            shutil.copyfile(str(temp_clip), str(output_path))
        
    return Path(output_path)

def merge_video_audio(
    video_path: Path | str,
    audio_path: Path | str,
    output_path: Path | str,
    pad_audio: bool = True
) -> Path:
    """
    Combine video and audio track into a single sync'd MP4.
    If video is shorter than audio, loops the video.
    If audio is shorter, clips to audio duration with pad.
    """
    audio_dur = get_media_duration(audio_path)
    video_dur = get_media_duration(video_path)
    
    # Loop video if shorter than audio
    if video_dur < audio_dur:
        cmd = [
            "ffmpeg", "-y",
            "-stream_loop", "-1",
            "-i", str(video_path),
            "-i", str(audio_path),
            "-c:v", "libx264",
            "-c:a", "aac",
            "-b:a", "192k",
            "-t", str(audio_dur + 0.5),
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
        
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return Path(output_path)

def concatenate_videos(video_paths: list[Path | str], output_path: Path | str) -> Path:
    """Concatenate multiple MP4 clips into one master video"""
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
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            # Fallback to re-encoding if streams differ slightly
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
            subprocess.run(reencode_cmd, check=True)
    finally:
        if list_file.exists():
            list_file.unlink()
            
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
    using hardware-accelerated FFmpeg xfade transition filters.
    """
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
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            concatenate_videos([temp_clip1, temp_clip2], output_path)
    finally:
        if temp_clip1.exists():
            try: temp_clip1.unlink()
            except: pass
        if temp_clip2.exists():
            try: temp_clip2.unlink()
            except: pass
            
    return Path(output_path)

