"""
Translate & Lip-sync Service — Translate text and re-dub video in target language.
Uses OpenAI GPT-4o for translation + selected TTS engine for speech synthesis + FFmpeg for audio merge.
"""
import uuid
import subprocess
from pathlib import Path
from typing import Optional
from config import settings


SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese (Mandarin)",
    "ar": "Arabic",
    "pt": "Portuguese",
    "ru": "Russian",
    "it": "Italian",
    "tr": "Turkish",
    "nl": "Dutch",
    "pl": "Polish",
    "sv": "Swedish",
    "th": "Thai",
    "vi": "Vietnamese",
    "id": "Indonesian",
    "ta": "Tamil",
}

# Default TTS voices for each language
LANGUAGE_VOICE_MAP = {
    "en": {"edge": "en-US-ChristopherNeural", "openai": "onyx"},
    "hi": {"edge": "hi-IN-MadhurNeural", "openai": "onyx"},
    "es": {"edge": "es-ES-AlvaroNeural", "openai": "onyx"},
    "fr": {"edge": "fr-FR-HenriNeural", "openai": "onyx"},
    "de": {"edge": "de-DE-ConradNeural", "openai": "onyx"},
    "ja": {"edge": "ja-JP-KeitaNeural", "openai": "onyx"},
    "ko": {"edge": "ko-KR-InJoonNeural", "openai": "onyx"},
    "zh": {"edge": "zh-CN-YunxiNeural", "openai": "onyx"},
    "ar": {"edge": "ar-SA-HamedNeural", "openai": "onyx"},
    "pt": {"edge": "pt-BR-AntonioNeural", "openai": "onyx"},
    "ru": {"edge": "ru-RU-DmitryNeural", "openai": "onyx"},
    "it": {"edge": "it-IT-DiegoNeural", "openai": "onyx"},
    "tr": {"edge": "tr-TR-AhmetNeural", "openai": "onyx"},
    "nl": {"edge": "nl-NL-MaartenNeural", "openai": "onyx"},
    "pl": {"edge": "pl-PL-MarekNeural", "openai": "onyx"},
    "sv": {"edge": "sv-SE-MattiasNeural", "openai": "onyx"},
    "th": {"edge": "th-TH-NiwatNeural", "openai": "onyx"},
    "vi": {"edge": "vi-VN-NamMinhNeural", "openai": "onyx"},
    "id": {"edge": "id-ID-ArdiNeural", "openai": "onyx"},
    "ta": {"edge": "ta-IN-ValluvarNeural", "openai": "onyx"},
}


async def translate_text(
    text: str,
    source_lang: str = "en",
    target_lang: str = "hi",
) -> dict:
    """Translate text using OpenAI GPT-4o."""
    import httpx

    api_key = settings.OPENAI_API_KEY
    if not api_key:
        # Fallback: basic dictionary for common phrases (demo mode)
        return {
            "success": True,
            "translated_text": text,
            "source_lang": source_lang,
            "target_lang": target_lang,
            "note": "OpenAI API key not set. Returning original text. Add key in Settings for real translation."
        }

    target_name = SUPPORTED_LANGUAGES.get(target_lang, target_lang)
    source_name = SUPPORTED_LANGUAGES.get(source_lang, source_lang)

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system",
                            "content": f"You are a professional translator. Translate the following text from {source_name} to {target_name}. "
                                       f"Maintain the tone, style, and intent. Return ONLY the translated text, nothing else."
                        },
                        {"role": "user", "content": text}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 2000,
                }
            )

        if response.status_code == 200:
            data = response.json()
            translated = data["choices"][0]["message"]["content"].strip()
            return {
                "success": True,
                "translated_text": translated,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "model": "gpt-4o-mini"
            }
        else:
            return {"success": False, "error": f"Translation API error: HTTP {response.status_code}"}
    except Exception as e:
        return {"success": False, "error": f"Translation failed: {str(e)}"}


async def translate_and_dub(
    text: str,
    source_lang: str = "en",
    target_lang: str = "hi",
    tts_provider: str = "edge",
    voice_id: Optional[str] = None,
    video_path: Optional[str] = None,
) -> dict:
    """
    Full translate + dub pipeline:
    1. Translate text via OpenAI
    2. Synthesize translated speech via selected TTS engine
    3. If video provided, replace audio track
    """
    # Step 1: Translate
    translation = await translate_text(text, source_lang, target_lang)
    if not translation.get("success"):
        return translation

    translated_text = translation["translated_text"]

    # Step 2: Determine voice for target language
    if not voice_id:
        lang_voices = LANGUAGE_VOICE_MAP.get(target_lang, LANGUAGE_VOICE_MAP["en"])
        voice_id = lang_voices.get(tts_provider, lang_voices.get("edge"))

    # Step 3: Synthesize speech
    if tts_provider == "edge":
        from services.edgetts_service import generate_edge_speech
        filename = f"dub_{target_lang}_{uuid.uuid4().hex[:8]}.mp3"
        audio_output = settings.AUDIO_PATH / filename
        await generate_edge_speech(text=translated_text, voice_id=voice_id, output_path=audio_output)
        tts_result = {
            "success": True,
            "filename": filename,
            "url": f"/outputs/audio/{filename}",
            "local_path": str(audio_output),
            "model": f"Edge TTS ({voice_id})"
        }
    elif tts_provider == "openai":
        from services.openai_service import generate_openai_speech
        tts_result = await generate_openai_speech(text=translated_text, voice=voice_id, model="tts-1")
    elif tts_provider == "elevenlabs":
        from services.elevenlabs_service import generate_elevenlabs_speech
        tts_result = await generate_elevenlabs_speech(text=translated_text, voice_id=voice_id)
    else:
        tts_result = {"success": False, "error": f"Unknown TTS provider: {tts_provider}"}

    if not tts_result.get("success"):
        return {**tts_result, "translated_text": translated_text}

    # Step 4: If video provided, merge dubbed audio
    if video_path and Path(video_path).exists():
        from services.voice_change_service import replace_audio_in_video
        output_filename = f"dubbed_{target_lang}_{uuid.uuid4().hex[:8]}.mp4"
        output_video = str(settings.VIDEOS_PATH / output_filename)

        merged = await replace_audio_in_video(video_path, tts_result["local_path"], output_video)
        if merged:
            return {
                "success": True,
                "filename": output_filename,
                "url": f"/outputs/videos/{output_filename}",
                "local_path": output_video,
                "translated_text": translated_text,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "tts_model": tts_result.get("model"),
                "mode": "translate_dub_video",
                "engine": "translate_lipsync"
            }

    # Return audio-only result
    return {
        "success": True,
        "filename": tts_result["filename"],
        "url": tts_result["url"],
        "local_path": tts_result.get("local_path"),
        "translated_text": translated_text,
        "source_lang": source_lang,
        "target_lang": target_lang,
        "tts_model": tts_result.get("model"),
        "mode": "translate_dub_audio",
        "engine": "translate_lipsync"
    }


def get_supported_languages():
    """Return list of supported languages."""
    return [{"code": k, "name": v} for k, v in SUPPORTED_LANGUAGES.items()]
