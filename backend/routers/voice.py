from fastapi import APIRouter, UploadFile, File, Form, Request
from pydantic import BaseModel
from typing import Optional
from limiter import limiter
from services.elevenlabs_service import generate_elevenlabs_speech, get_elevenlabs_voices
from services.edgetts_service import generate_edge_speech, get_edge_voices
from services.openai_service import generate_openai_speech
from services.voice_change_service import (
    change_voice_elevenlabs,
    change_voice_in_video,
)
from services.translate_service import (
    translate_text,
    translate_and_dub,
    get_supported_languages,
)
from config import settings
import uuid
from pathlib import Path
import logging

logger = logging.getLogger("omnistudio.voice")

from pydantic import BaseModel, field_validator

router = APIRouter(prefix="/api/voice", tags=["Voice Generation"])

ALLOWED_VOICE_PROVIDERS = {"elevenlabs", "openai", "edge"}

class VoiceRequest(BaseModel):
    text: str
    provider: str = "elevenlabs"  # elevenlabs, openai, edge
    voice_id: str = "pNInz6obpgDQGcFmaJgB"
    model: str = "eleven_multilingual_v2"
    stability: float = 0.5
    similarity_boost: float = 0.75

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Voice text cannot be empty")
        if len(s) > 5000:
            raise ValueError("Voice text cannot exceed 5000 characters")
        return s

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        if v not in ALLOWED_VOICE_PROVIDERS:
            raise ValueError(f"Provider must be one of {sorted(ALLOWED_VOICE_PROVIDERS)}")
        return v

    @field_validator("stability", "similarity_boost")
    @classmethod
    def validate_stability(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError("Audio settings must be between 0.0 and 1.0")
        return round(float(v), 2)

class VoiceChangeRequest(BaseModel):
    target_voice_id: str = "pNInz6obpgDQGcFmaJgB"
    provider: str = "elevenlabs"
    model_id: str = "eleven_english_sts_v2"
    # For text-based fallback (OpenAI)
    transcript: Optional[str] = None

class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "en"
    target_lang: str = "hi"
    tts_provider: str = "edge"
    voice_id: Optional[str] = None
    video_path: Optional[str] = None

    @field_validator("text")
    @classmethod
    def validate_translate_text(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Translation text cannot be empty")
        if len(s) > 5000:
            raise ValueError("Translation text cannot exceed 5000 characters")
        return s

class TranslateTextRequest(BaseModel):
    text: str
    source_lang: str = "en"
    target_lang: str = "hi"

    @field_validator("text")
    @classmethod
    def validate_text_simple(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Text cannot be empty")
        if len(s) > 5000:
            raise ValueError("Text cannot exceed 5000 characters")
        return s

@router.get("/models")
@limiter.limit("60/minute")
async def list_voice_models(request: Request):
    try:
        from database import load_settings_into_runtime
        load_settings_into_runtime()
    except Exception:
        pass

    has_elevenlabs = bool(settings.ELEVENLABS_API_KEY and str(settings.ELEVENLABS_API_KEY).strip())
    has_openai = bool(settings.OPENAI_API_KEY and str(settings.OPENAI_API_KEY).strip())

    return {
        "providers": [
            {
                "value": "edge",
                "label": "Edge Neural (Free)",
                "description": "100% Free high-speed neural voiceover with zero API key required",
                "active": True,
                "is_free": True,
                "badge": "FREE ACTIVE"
            },
            {
                "value": "elevenlabs",
                "label": "ElevenLabs Studio (Pro)",
                "description": "Ultra-realistic expressive emotional voices (Requires ElevenLabs Key)",
                "active": has_elevenlabs,
                "is_free": False,
                "badge": "ACTIVE" if has_elevenlabs else "KEY REQ"
            },
            {
                "value": "openai",
                "label": "OpenAI TTS (Standard)",
                "description": "Natural sounding voice synthesis (Requires OpenAI Key)",
                "active": has_openai,
                "is_free": False,
                "badge": "ACTIVE" if has_openai else "KEY REQ"
            }
        ],
        "models": [
            {
                "value": "seed_audio",
                "label": "Seed Audio 1.0",
                "provider": "edge",
                "active": True,
                "badge": "FREE"
            },
            {
                "value": "eleven_v3",
                "label": "Eleven v3 Multilingual",
                "provider": "elevenlabs",
                "active": has_elevenlabs,
                "badge": "ACTIVE" if has_elevenlabs else "KEY REQ"
            },
            {
                "value": "eleven_turbo",
                "label": "Eleven Turbo v2.5",
                "provider": "elevenlabs",
                "active": has_elevenlabs,
                "badge": "ACTIVE" if has_elevenlabs else "KEY REQ"
            },
            {
                "value": "qwen_audio",
                "label": "Qwen Audio 3.0",
                "provider": "edge",
                "active": True,
                "badge": "FREE"
            },
            {
                "value": "minimax",
                "label": "MiniMax Speech 2.8 HD",
                "provider": "edge",
                "active": True,
                "badge": "FREE"
            }
        ]
    }

@router.post("/generate")
@limiter.limit("15/minute")
async def generate_voice(req: VoiceRequest, request: Request):
    if req.provider == "elevenlabs":
        if not (settings.ELEVENLABS_API_KEY and str(settings.ELEVENLABS_API_KEY).strip()):
            return {
                "success": False,
                "error": "ElevenLabs API key is not configured in Settings! Please add your ELEVENLABS_API_KEY in BYOK Settings, or switch to Microsoft Edge Neural (100% Free & Active)."
            }
        res = await generate_elevenlabs_speech(
            text=req.text, voice_id=req.voice_id, model_id=req.model,
            stability=req.stability, similarity_boost=req.similarity_boost
        )
    elif req.provider == "openai":
        res = await generate_openai_speech(
            text=req.text, voice=req.voice_id, model=req.model
        )
    else:
        # Microsoft Edge Neural Engine (100% Free)
        edge_voice = req.voice_id
        if not edge_voice or not edge_voice.endswith("Neural"):
            edge_voice = "en-US-ChristopherNeural"
        filename = f"edge_{uuid.uuid4().hex[:8]}.mp3"
        local_path = settings.AUDIO_PATH / filename
        await generate_edge_speech(text=req.text, voice_id=edge_voice, output_path=local_path)
        res = {
            "success": True, "simulated": False,
            "filename": filename, "url": f"/outputs/audio/{filename}",
            "local_path": str(local_path), "model": f"Edge TTS ({edge_voice})"
        }

    # Sync to Cloudflare R2 and Supabase Cloud
    if res.get("local_path"):
        try:
            from services.storage_service import sync_and_save_asset
            synced = await sync_and_save_asset(
                local_path=res["local_path"],
                asset_type="audio",
                metadata={"provider": req.provider, "voice_id": req.voice_id}
            )
            if synced.get("url"):
                res["url"] = synced["url"]
            res["asset_id"] = synced.get("asset_id")
        except Exception as e:
            logger.warning("Failed to sync generated speech asset to cloud: %s", e)

    if res.get("url"):
        res["audio_url"] = res["url"]

    try:
        from services.usage_tracker import log_generation
        log_generation(
            service_type="voice",
            provider=req.provider,
            model=res.get("model", req.model),
            prompt=req.text,
            status="success" if res.get("success") else "failed",
            specs={"characters": len(req.text), "voice_id": req.voice_id},
            output_url=res.get("url", ""),
            error=res.get("error") if not res.get("success") else None
        )
    except Exception as e:
        logger.warning("Failed to record speech generation usage log: %s", e)

    return res

# Voice Change — Upload audio file and change voice
@router.post("/change")
@limiter.limit("10/minute")
async def voice_change(
    request: Request,
    file: UploadFile = File(...),
    target_voice_id: str = Form("pNInz6obpgDQGcFmaJgB"),
    provider: str = Form("elevenlabs"),
    model_id: str = Form("eleven_english_sts_v2"),
    is_video: bool = Form(False),
):
    """Change voice in an uploaded audio or video file."""
    # Normalize provider
    clean_provider = "elevenlabs" if "eleven" in provider.lower() else provider

    from services.security_service import sanitize_filename, validate_uploaded_media
    clean_ext = Path(sanitize_filename(file.filename)).suffix.lower()
    if clean_ext not in [".mp3", ".wav", ".mp4", ".m4a", ".ogg", ".flac", ".mov"]:
        clean_ext = ".mp3"
    upload_name = f"vc_upload_{uuid.uuid4().hex[:8]}{clean_ext}"
    upload_path = settings.AUDIO_PATH / upload_name
    
    content = await file.read()
    validate_uploaded_media(content, sanitize_filename(file.filename), "video" if is_video else "audio")
    with open(upload_path, "wb") as f:
        f.write(content)
    
    if is_video:
        result = await change_voice_in_video(
            video_path=str(upload_path),
            target_voice_id=target_voice_id,
            provider=clean_provider,
            model_id=model_id,
        )
    else:
        result = await change_voice_elevenlabs(
            audio_path=str(upload_path),
            target_voice_id=target_voice_id,
            model_id=model_id,
        )
    
    # Clean up uploaded temp file
    try:
        upload_path.unlink(missing_ok=True)
    except Exception as e:
        logger.debug("Could not unlink temp upload file %s: %s", upload_path, e)

    if result.get("url"):
        result["audio_url"] = result["url"]

    try:
        from services.usage_tracker import log_generation
        log_generation(
            service_type="voice",
            provider=clean_provider,
            model=f"Voice Change ({target_voice_id[:8]})",
            prompt=f"Voice swap on {file.filename}",
            status="success" if result.get("success") else "failed",
            specs={"target_voice": target_voice_id, "is_video": is_video},
            output_url=result.get("url", ""),
            error=result.get("error") if not result.get("success") else None
        )
    except Exception as e:
        logger.warning("Failed to record voice change usage log: %s", e)
    
    return result

# Translate text only
@router.post("/translate-text")
@limiter.limit("30/minute")
async def translate_text_endpoint(req: TranslateTextRequest, request: Request):
    """Translate text from source language to target language using OpenAI."""
    return await translate_text(
        text=req.text,
        source_lang=req.source_lang,
        target_lang=req.target_lang,
    )

# Translate + Dub (full pipeline)
@router.post("/translate")
@limiter.limit("10/minute")
async def translate_and_dub_endpoint(req: TranslateRequest, request: Request):
    """
    Full translate + dub pipeline:
    1. Translate text via OpenAI GPT-4o
    2. Synthesize translated speech via selected TTS
    3. If video_path provided, replace audio track
    """
    video_p = None
    if req.video_path:
        from path_utils import safe_resolve_output_path
        video_p = str(safe_resolve_output_path(req.video_path, "videos", must_exist=True))
    
    result = await translate_and_dub(
        text=req.text,
        source_lang=req.source_lang,
        target_lang=req.target_lang,
        tts_provider=req.tts_provider,
        voice_id=req.voice_id,
        video_path=video_p,
    )

    if result.get("url"):
        result["audio_url"] = result["url"]

    try:
        from services.usage_tracker import log_generation
        log_generation(
            service_type="voice",
            provider=req.tts_provider,
            model=f"Translate & Dub ({req.source_lang}->{req.target_lang})",
            prompt=req.text,
            status="success" if result.get("success") else "failed",
            specs={"source_lang": req.source_lang, "target_lang": req.target_lang, "tts_provider": req.tts_provider},
            output_url=result.get("url", ""),
            error=result.get("error") if not result.get("success") else None
        )
    except Exception as e:
        logger.warning("Failed to record translate & dub usage log: %s", e)

    return result

# Get supported languages for translate
@router.get("/languages")
@limiter.limit("60/minute")
async def list_languages(request: Request):
    return {"languages": get_supported_languages()}

@router.get("/voices")
@limiter.limit("60/minute")
async def list_voices(request: Request):
    return {
        "elevenlabs": get_elevenlabs_voices(),
        "edge": get_edge_voices(),
        "openai": [
            {"id": "onyx", "name": "Onyx (Deep Male)", "gender": "Male"},
            {"id": "alloy", "name": "Alloy (Neutral)", "gender": "Neutral"},
            {"id": "echo", "name": "Echo (Male)", "gender": "Male"},
            {"id": "fable", "name": "Fable (British Male)", "gender": "Male"},
            {"id": "nova", "name": "Nova (Female)", "gender": "Female"},
            {"id": "shimmer", "name": "Shimmer (Female)", "gender": "Female"}
        ]
    }
