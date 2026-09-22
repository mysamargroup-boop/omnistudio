import base64
import uuid
import httpx
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from config import settings
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

logger = logging.getLogger("omnistudio.sarvam")

SARVAM_DEFAULT_VOICES = [
    {"id": "shubh", "name": "Shubh (Conversational & Clear Male)", "gender": "Male", "language": "hi-IN"},
    {"id": "aditya", "name": "Aditya (Deep & Cinematic Male)", "gender": "Male", "language": "hi-IN"},
    {"id": "ritu", "name": "Ritu (Warm & Professional Female)", "gender": "Female", "language": "hi-IN"},
    {"id": "priya", "name": "Priya (Expressive & Engaging Female)", "gender": "Female", "language": "hi-IN"},
    {"id": "amartya", "name": "Amartya (Commercial Narrative Male)", "gender": "Male", "language": "hi-IN"},
    {"id": "simran", "name": "Simran (Vibrant Storyteller Female)", "gender": "Female", "language": "hi-IN"},
]

SARVAM_SUPPORTED_LANGUAGES = {
    "hi-IN": "Hindi (India)",
    "en-IN": "Indian English",
    "bn-IN": "Bengali (India)",
    "ta-IN": "Tamil (India)",
    "te-IN": "Telugu (India)",
    "mr-IN": "Marathi (India)",
    "gu-IN": "Gujarati (India)",
    "kn-IN": "Kannada (India)",
    "ml-IN": "Malayalam (India)",
    "pa-IN": "Punjabi (India)",
    "od-IN": "Odia (India)",
}

@retry(
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type((httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError)),
    reraise=True
)
async def _execute_sarvam_tts(url: str, payload: dict, headers: dict) -> httpx.Response:
    async with httpx.AsyncClient() as client:
        return await client.post(url, json=payload, headers=headers, timeout=60.0)

async def generate_sarvam_speech(
    text: str,
    speaker: str = "shubh",
    language_code: str = "hi-IN",
    pace: float = 1.0,
    output_path: Optional[Path] = None
) -> dict:
    """
    Generate natural Indic voiceover speech using Sarvam AI Bulbul V3 model.
    Decodes returned base64 WAV/audio and saves to destination.
    """
    filename = f"voice_sarvam_{uuid.uuid4().hex[:8]}.wav"
    target_path = output_path or (settings.AUDIO_PATH / filename)
    target_path.parent.mkdir(parents=True, exist_ok=True)

    api_key = (settings.SARVAM_API_KEY or "").strip()
    if not api_key:
        return {
            "success": False,
            "error": "Sarvam AI API key is not configured. Add your SARVAM_API_KEY in Settings (Free ₹100 trial available at sarvam.ai)."
        }

    clean_text = (text or "").strip()
    if not clean_text:
        return {"success": False, "error": "Empty narration text provided for Sarvam voice generation."}

    # Bulbul V3 max length is 2500 characters
    if len(clean_text) > 2400:
        clean_text = clean_text[:2400]

    url = "https://api.sarvam.ai/text-to-speech"
    headers = {
        "api-subscription-key": api_key,
        "Content-Type": "application/json"
    }

    # Normalize language code if needed
    if language_code not in SARVAM_SUPPORTED_LANGUAGES:
        # Default to hi-IN or en-IN
        language_code = "hi-IN" if any('\u0900' <= ch <= '\u097F' for ch in clean_text) else "en-IN"

    payload = {
        "text": clean_text,
        "speaker": speaker or "shubh",
        "language_code": language_code,
        "model": "bulbul:v3",
        "pace": max(0.5, min(2.0, float(pace)))
    }

    try:
        response = await _execute_sarvam_tts(url, payload, headers)

        if response.status_code == 200:
            res_json = response.json()
            audios = res_json.get("audios", [])
            if not audios or not audios[0]:
                return {"success": False, "error": "Sarvam AI API returned empty audio content."}

            audio_base64 = audios[0]
            audio_bytes = base64.b64decode(audio_base64)

            with open(target_path, "wb") as f:
                f.write(audio_bytes)

            return {
                "success": True,
                "local_path": str(target_path),
                "filename": target_path.name,
                "url": f"/outputs/audio/{target_path.name}",
                "speaker": speaker,
                "language_code": language_code,
                "provider": "sarvam"
            }
        else:
            err_msg = f"Sarvam AI error {response.status_code}: {response.text}"
            logger.warning(err_msg)
            return {"success": False, "error": err_msg}

    except Exception as e:
        logger.error("Exception during Sarvam speech generation: %s", e)
        return {"success": False, "error": str(e)}
