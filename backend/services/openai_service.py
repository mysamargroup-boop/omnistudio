import uuid
import httpx
import logging
from typing import Optional, Dict, Any, List
from pathlib import Path
from config import settings
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

logger = logging.getLogger("omnistudio.openai")

@retry(
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type((httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError)),
    reraise=True
)
async def _execute_openai_image_generate(client, kwargs):
    return await client.images.generate(**kwargs)

@retry(
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type((httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError)),
    reraise=True
)
async def _execute_openai_speech_create(client, **kwargs):
    return await client.audio.speech.create(**kwargs)

@retry(
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type((httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError)),
    reraise=True
)
async def _execute_openai_chat_create(client, **kwargs):
    return await client.chat.completions.create(**kwargs)

def get_openai_key() -> str:
    """Retrieve OpenAI API key from settings or database with transparent fallback."""
    key = (settings.OPENAI_API_KEY or "").strip()
    if not key:
        try:
            from database import db_get_all_settings
            st = db_get_all_settings()
            key = (st.get("openai_api_key") or st.get("OPENAI_API_KEY") or "").strip()
        except Exception:
            pass
    return key

async def generate_openai_chat(
    messages: List[Dict[str, Any]],
    model: str = "gpt-4o",
    temperature: float = 0.7,
    response_format: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Generate structured response via OpenAI Chat API with fallback from gpt-4o to gpt-4o-mini."""
    key = get_openai_key()
    if not key:
        return {"success": False, "error": "OpenAI API Key not configured"}

    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=key)

    candidate_models = [model]
    if model != "gpt-4o-mini":
        candidate_models.append("gpt-4o-mini")

    last_error = None
    for cand in candidate_models:
        try:
            kwargs: Dict[str, Any] = {
                "model": cand,
                "messages": messages,
                "temperature": temperature,
            }
            if response_format:
                kwargs["response_format"] = response_format
            res = await _execute_openai_chat_create(client, **kwargs)
            text = res.choices[0].message.content.strip()
            return {
                "success": True,
                "text": text,
                "model": cand
            }
        except Exception as e:
            last_error = e
            logger.warning("OpenAI model %s chat call failed: %s", cand, e)

    return {"success": False, "error": str(last_error)}

async def generate_openai_image(
    prompt: str,
    model: str = "dall-e-3",
    size: str = "1024x1024",
    quality: str = "hd",
    style: str = "vivid",
    filename_hint: Optional[str] = None,
    aspect_ratio: Optional[str] = None
) -> dict:
    """Generate image via OpenAI Image API (DALL-E 3 HD advance model / GPT-image) and save to local vault"""
    key = get_openai_key()
    if not key:
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
        client = AsyncOpenAI(api_key=key)
        
        # Calculate aspect ratio size for OpenAI image models
        if aspect_ratio == "16:9" or size == "1792x1024" or aspect_ratio in ["21:9", "4:3"]:
            target_size = "1792x1024"
        elif aspect_ratio == "9:16" or size == "1024x1792" or aspect_ratio in ["3:4", "2:3"]:
            target_size = "1024x1792"
        else:
            target_size = "1024x1024"

        # Determine candidate models to try: prioritize explicitly selected model first
        preferred = model if model and model != "auto" else "gpt-image-2"
        all_options = [preferred, "gpt-image-2", "gpt-image-1", "gpt-image-1-mini", "dall-e-3", "dall-e-2"]
        candidate_models = []
        for c in all_options:
            if c and c not in candidate_models:
                candidate_models.append(c)

        response = None
        used_model = None
        last_error = None

        for candidate in candidate_models:
            try:
                kwargs = {
                    "model": candidate,
                    "prompt": prompt,
                    "n": 1,
                    "size": target_size,
                }
                if candidate.startswith("gpt-image") or candidate == "chatgpt-image-latest":
                    # gpt-image models support quality: 'high', 'medium', 'low', 'auto'
                    kwargs["quality"] = "high" if quality in ["ultra", "hd", "high"] else ("medium" if quality in ["standard", "medium"] else "auto")
                elif candidate == "dall-e-3":
                    kwargs["quality"] = "hd" if quality in ["ultra", "hd", "high"] else "standard"
                    if style in ["vivid", "natural"]:
                        kwargs["style"] = style

                response = await _execute_openai_image_generate(client, kwargs)
                used_model = candidate
                break
            except Exception as candidate_err:
                last_error = candidate_err
                err_str = str(candidate_err).lower()
                if any(x in err_str for x in ["does not exist", "unknown_parameter", "not found", "unrecognized", "invalid_model", "model"]):
                    logger.warning("OpenAI model '%s' unavailable, falling back to next candidate: %s", candidate, candidate_err)
                    continue
                else:
                    logger.warning("OpenAI model '%s' error: %s", candidate, candidate_err)
                    continue
                    
        if not response:
            raise last_error or Exception("No compatible OpenAI image model found.")
        
        from services.prompt_utils import generate_image_filename
        filename = generate_image_filename(filename_hint or prompt, ext=".png")
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
        
        response = await _execute_openai_speech_create(client, model=model, voice=voice, input=text)
        
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
        logger.warning("OpenAI speech synthesis failed, falling back to Microsoft Edge Neural TTS: %s", e)
        from services.edgetts_service import generate_edge_speech
        filename = f"audio_fallback_{uuid.uuid4().hex[:8]}.mp3"
        local_path = settings.AUDIO_PATH / filename
        await generate_edge_speech(text, voice_id="en-US-ChristopherNeural", output_path=local_path)
        return {
            "success": True,
            "simulated": False,
            "filename": filename,
            "url": f"/outputs/audio/{filename}",
            "local_path": str(local_path),
            "error": str(e),
            "model": "Edge Neural TTS (Free Fallback)"
        }
