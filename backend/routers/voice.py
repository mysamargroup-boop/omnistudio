from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
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

router = APIRouter(prefix="/api/voice", tags=["Voice Generation"])

class VoiceRequest(BaseModel):
    text: str
    provider: str = "elevenlabs"  # elevenlabs, openai, edge
    voice_id: str = "pNInz6obpgDQGcFmaJgB"
    model: str = "eleven_multilingual_v2"
    stability: float = 0.5
    similarity_boost: float = 0.75

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

class TranslateTextRequest(BaseModel):
    text: str
    source_lang: str = "en"
    target_lang: str = "hi"

@router.post("/generate")
async def generate_voice(req: VoiceRequest):
    if req.provider == "elevenlabs":
        res = await generate_elevenlabs_speech(
            text=req.text, voice_id=req.voice_id, model_id=req.model,
            stability=req.stability, similarity_boost=req.similarity_boost
        )
    elif req.provider == "openai":
        res = await generate_openai_speech(
            text=req.text, voice=req.voice_id, model=req.model
        )
    else:
        filename = f"edge_{uuid.uuid4().hex[:8]}.mp3"
        local_path = settings.AUDIO_PATH / filename
        await generate_edge_speech(text=req.text, voice_id=req.voice_id, output_path=local_path)
        res = {
            "success": True, "simulated": False,
            "filename": filename, "url": f"/outputs/audio/{filename}",
            "local_path": str(local_path), "model": f"Edge TTS ({req.voice_id})"
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
        except Exception:
            pass

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
    except Exception:
        pass

    return res

# Voice Change — Upload audio file and change voice
@router.post("/change")
async def voice_change(
    file: UploadFile = File(...),
    target_voice_id: str = Form("pNInz6obpgDQGcFmaJgB"),
    provider: str = Form("elevenlabs"),
    model_id: str = Form("eleven_english_sts_v2"),
    is_video: bool = Form(False),
):
    """Change voice in an uploaded audio or video file."""
    # Normalize provider
    clean_provider = "elevenlabs" if "eleven" in provider.lower() else provider

    # Save uploaded file
    ext = Path(file.filename).suffix or ".mp3"
    upload_name = f"vc_upload_{uuid.uuid4().hex[:8]}{ext}"
    upload_path = settings.AUDIO_PATH / upload_name
    
    content = await file.read()
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
    except Exception:
        pass

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
    except Exception:
        pass
    
    return result

# Translate text only
@router.post("/translate-text")
async def translate_text_endpoint(req: TranslateTextRequest):
    """Translate text from source language to target language using OpenAI."""
    return await translate_text(
        text=req.text,
        source_lang=req.source_lang,
        target_lang=req.target_lang,
    )

# Translate + Dub (full pipeline)
@router.post("/translate")
async def translate_and_dub_endpoint(req: TranslateRequest):
    """
    Full translate + dub pipeline:
    1. Translate text via OpenAI GPT-4o
    2. Synthesize translated speech via selected TTS
    3. If video_path provided, replace audio track
    """
    video_p = None
    if req.video_path:
        if req.video_path.startswith("/outputs/"):
            video_p = str(settings.OUTPUTS_PATH / req.video_path.replace("/outputs/", ""))
        else:
            video_p = req.video_path
    
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
    except Exception:
        pass

    return result

# Get supported languages for translate
@router.get("/languages")
async def list_languages():
    return {"languages": get_supported_languages()}

@router.get("/voices")
async def list_voices():
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
