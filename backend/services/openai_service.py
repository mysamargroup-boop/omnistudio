import uuid
import httpx
from pathlib import Path
from config import settings
from services.mock_service import generate_mock_image

async def generate_openai_image(
    prompt: str,
    model: str = "gpt-image-1-mini",
    size: str = "1024x1024",
    quality: str = "standard",
    style: str = "vivid"
) -> dict:
    """Generate image via OpenAI Image API (GPT-image-1-mini / GPT-image-1 / DALL-E 3) and save to local vault"""
    if not settings.OPENAI_API_KEY:
        return {
            "success": False,
            "error_type": "KEY_MISSING",
            "error": "OpenAI API Key is missing. Please add your OPENAI_API_KEY in Settings to generate OpenAI images.",
            "provider": "openai",
            "required_key": "OPENAI_API_KEY"
        }
        
    try:
        import base64
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        # Determine candidate models to try
        target_model = model
        if model in ["dall-e-3", "openai"]:
            target_model = "gpt-image-1-mini"
            
        candidate_models = [target_model]
        if target_model != "gpt-image-1":
            candidate_models.append("gpt-image-1")
        if "dall-e-3" not in candidate_models:
            candidate_models.append("dall-e-3")
        
        response = None
        used_model = None
        last_error = None
        
        for candidate in candidate_models:
            try:
                # DALL-E 3 supports quality and style; GPT-image-1 family does not take style
                kwargs = {
                    "model": candidate,
                    "prompt": prompt,
                    "n": 1,
                }
                if candidate == "dall-e-3":
                    valid_sizes = ["1024x1024", "1792x1024", "1024x1792"]
                    kwargs["size"] = size if size in valid_sizes else "1024x1024"
                    kwargs["quality"] = quality
                
                response = await client.images.generate(**kwargs)
                used_model = candidate
                break
            except Exception as candidate_err:
                last_error = candidate_err
                err_str = str(candidate_err)
                if "does not exist" in err_str or "unknown_parameter" in err_str:
                    continue
                else:
                    raise candidate_err
                    
        if not response:
            raise last_error or Exception("No compatible OpenAI image model found.")
        
        filename = f"openai_{uuid.uuid4().hex[:8]}.png"
        local_path = settings.IMAGES_PATH / filename
        
        # Handle Base64 output (GPT Image family) or URL (DALL-E)
        item = response.data[0]
        if hasattr(item, "b64_json") and item.b64_json:
            img_bytes = base64.b64decode(item.b64_json)
            with open(local_path, "wb") as f:
                f.write(img_bytes)
        elif getattr(item, "url", None):
            async with httpx.AsyncClient() as http_client:
                r = await http_client.get(item.url, timeout=30.0)
                if r.status_code == 200:
                    with open(local_path, "wb") as f:
                        f.write(r.content)
        else:
            raise Exception("OpenAI API did not return image data or URL.")
            
        revised_prompt = getattr(item, "revised_prompt", prompt)
                    
        return {
            "success": True,
            "simulated": False,
            "filename": filename,
            "url": f"/outputs/images/{filename}",
            "local_path": str(local_path),
            "revised_prompt": revised_prompt,
            "model": used_model
        }
    except Exception as e:
        return {
            "success": False,
            "error_type": "API_ERROR",
            "error": f"OpenAI image generation error: {str(e)}",
            "provider": "openai"
        }

async def generate_openai_speech(
    text: str,
    voice: str = "onyx",
    model: str = "tts-1"
) -> dict:
    """Generate speech via OpenAI TTS API"""
    if not settings.OPENAI_API_KEY:
        from services.edgetts_service import generate_edge_speech
        filename = f"audio_edge_{uuid.uuid4().hex[:8]}.mp3"
        local_path = settings.AUDIO_PATH / filename
        await generate_edge_speech(text, voice_id="en-US-ChristopherNeural", output_path=local_path)
        return {
            "success": True,
            "simulated": True,
            "filename": filename,
            "url": f"/outputs/audio/{filename}",
            "local_path": str(local_path),
            "model": "Edge Neural TTS (Free Fallback)"
        }
        
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        filename = f"openai_tts_{uuid.uuid4().hex[:8]}.mp3"
        local_path = settings.AUDIO_PATH / filename
        
        response = await client.audio.speech.create(
            model=model,
            voice=voice,
            input=text
        )
        
        response.stream_to_file(str(local_path))
        return {
            "success": True,
            "simulated": False,
            "filename": filename,
            "url": f"/outputs/audio/{filename}",
            "local_path": str(local_path),
            "model": f"{model} ({voice})"
        }
    except Exception as e:
        from services.edgetts_service import generate_edge_speech
        filename = f"audio_fallback_{uuid.uuid4().hex[:8]}.mp3"
        local_path = settings.AUDIO_PATH / filename
        await generate_edge_speech(text, voice_id="en-US-ChristopherNeural", output_path=local_path)
        return {
            "success": True,
            "simulated": True,
            "filename": filename,
            "url": f"/outputs/audio/{filename}",
            "local_path": str(local_path),
            "error": str(e),
            "model": "Edge Neural TTS (Fallback)"
        }
