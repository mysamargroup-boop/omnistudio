"""
Voice Change Service — Swap voices in any audio/video file.
Uses ElevenLabs Speech-to-Speech API or falls back to OpenAI TTS re-synthesis.
"""
import uuid
import subprocess
import shutil
from pathlib import Path
from typing import Optional
from config import settings


async def extract_audio_from_file(input_path: str, output_path: str) -> bool:
    """Extract audio track from a video or audio file using FFmpeg."""
    try:
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-vn", "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "1",
            output_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        return result.returncode == 0
    except Exception:
        return False


async def replace_audio_in_video(video_path: str, audio_path: str, output_path: str) -> bool:
    """Replace the audio track in a video file with new audio using FFmpeg."""
    try:
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", audio_path,
            "-c:v", "copy", "-map", "0:v:0", "-map", "1:a:0",
            "-shortest", output_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        return result.returncode == 0
    except Exception:
        return False


async def change_voice_elevenlabs(
    audio_path: str,
    target_voice_id: str,
    model_id: str = "eleven_english_sts_v2",
) -> dict:
    """
    Voice change using ElevenLabs Speech-to-Speech API.
    Sends source audio and target voice ID, returns new audio with changed voice.
    """
    import httpx

    api_key = settings.ELEVENLABS_API_KEY
    if not api_key:
        return {"success": False, "error": "ElevenLabs API key not configured. Add it in Settings."}

    url = f"https://api.elevenlabs.io/v1/speech-to-speech/{target_voice_id}"
    headers = {"xi-api-key": api_key}

    filename = f"vc_{uuid.uuid4().hex[:8]}.mp3"
    output_path = settings.AUDIO_PATH / filename

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            with open(audio_path, "rb") as audio_file:
                files = {"audio": (Path(audio_path).name, audio_file, "audio/mpeg")}
                data = {"model_id": model_id}
                response = await client.post(url, headers=headers, files=files, data=data)

            if response.status_code == 200:
                with open(output_path, "wb") as f:
                    f.write(response.content)
                return {
                    "success": True,
                    "filename": filename,
                    "url": f"/outputs/audio/{filename}",
                    "local_path": str(output_path),
                    "model": f"ElevenLabs STS ({target_voice_id})",
                    "engine": "elevenlabs_sts"
                }
            else:
                error_detail = response.text[:200] if response.text else f"HTTP {response.status_code}"
                return {"success": False, "error": f"ElevenLabs STS failed: {error_detail}"}
    except Exception as e:
        return {"success": False, "error": f"Voice change failed: {str(e)}"}


async def change_voice_openai(
    text_transcript: str,
    target_voice: str = "onyx",
    model: str = "tts-1",
) -> dict:
    """
    Fallback voice change using OpenAI TTS.
    Requires text transcript (since OpenAI doesn't support Speech-to-Speech).
    """
    from services.openai_service import generate_openai_speech
    return await generate_openai_speech(text=text_transcript, voice=target_voice, model=model)


async def change_voice_in_video(
    video_path: str,
    target_voice_id: str,
    provider: str = "elevenlabs",
    model_id: str = "eleven_english_sts_v2",
) -> dict:
    """
    Full pipeline: Extract audio from video -> change voice -> replace audio in video.
    """
    temp_audio = str(settings.AUDIO_PATH / f"temp_extract_{uuid.uuid4().hex[:8]}.wav")
    
    # Step 1: Extract audio
    extracted = await extract_audio_from_file(video_path, temp_audio)
    if not extracted:
        return {"success": False, "error": "Failed to extract audio from video. Check if file has an audio track."}

    # Step 2: Change voice
    if provider in ["elevenlabs", "elevenlabs_sts"]:
        vc_result = await change_voice_elevenlabs(temp_audio, target_voice_id, model_id)
    else:
        vc_result = {"success": False, "error": "For video voice change, ElevenLabs Speech-to-Speech is required."}

    # Clean up temp
    try:
        Path(temp_audio).unlink(missing_ok=True)
    except Exception:
        pass

    if not vc_result.get("success"):
        return vc_result

    # Step 3: Replace audio in video
    output_filename = f"vc_video_{uuid.uuid4().hex[:8]}.mp4"
    output_video = str(settings.VIDEOS_PATH / output_filename)
    
    replaced = await replace_audio_in_video(video_path, vc_result["local_path"], output_video)
    if not replaced:
        return {
            "success": True,
            "filename": vc_result["filename"],
            "url": vc_result["url"],
            "local_path": vc_result["local_path"],
            "model": vc_result["model"],
            "note": "Audio voice changed, but could not re-merge into video. Audio-only output returned."
        }

    return {
        "success": True,
        "filename": output_filename,
        "url": f"/outputs/videos/{output_filename}",
        "local_path": output_video,
        "model": vc_result["model"],
        "engine": "voice_change_video",
        "mode": "voice_change"
    }
