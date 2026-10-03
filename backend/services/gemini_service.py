import os
import requests
import httpx
import logging
import base64
import asyncio
import uuid
import shutil
from pathlib import Path
from typing import Optional, Dict, Any, Type, Union
from config import settings
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

try:
    from google import genai
    from google.genai import types, errors
    try:
        from google.genai.models import AsyncModels, Models
        AsyncModels._logged_afc_warning = True
        Models._logged_afc_warning = True
    except Exception:
        pass
    GENAI_SDK_AVAILABLE = True
except ImportError:
    GENAI_SDK_AVAILABLE = False
    genai = None
    types = None
    errors = None

logger = logging.getLogger("omnistudio.gemini")
logging.getLogger("google.genai").setLevel(logging.ERROR)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta"

# Model aliases mapping deprecated or generic identifiers to active production Google AI models
MODEL_ALIASES: Dict[str, str] = {
    # Flash / standard models (gemini-2.5-flash deprecated by Google, replaced by gemini-3.8-flash)
    "gemini-2.5-flash": "gemini-3.8-flash",
    "gemini-2.0-flash": "gemini-3.8-flash",
    "gemini-1.5-flash": "gemini-3.8-flash",
    "gemini-flash": "gemini-3.8-flash",
    "gemini-flash-latest": "gemini-3.8-flash",
    "auto": "gemini-3.8-flash",
    
    # Pro / reasoning models
    "gemini-2.5-pro": "gemini-3.1-pro-preview",
    "gemini-2.0-pro": "gemini-3.1-pro-preview",
    "gemini-1.5-pro": "gemini-3.1-pro-preview",
    "gemini-pro": "gemini-3.1-pro-preview",
    
    # Image generation models
    "gemini-3-pro-image": "gemini-2.5-flash-image",
    "gemini-flash-image": "gemini-2.5-flash-image",
    "gemini_flash_image": "gemini-2.5-flash-image",
    "imagen-3": "gemini-2.5-flash-image",
    "imagen": "gemini-2.5-flash-image",
}

def resolve_model_name(model_name: Optional[str], default: str = "gemini-3.8-flash") -> str:
    """Resolve deprecated or alias model strings to active, supported Google GenAI models"""
    if not model_name:
        return default
    clean = model_name.strip()
    return MODEL_ALIASES.get(clean.lower(), clean)

@retry(
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type((requests.exceptions.Timeout, requests.exceptions.ConnectionError, httpx.RequestError)),
    reraise=True
)
def _safe_gemini_post(url: str, json_payload: dict, timeout: int):
    with httpx.Client(timeout=float(timeout)) as client:
        return client.post(url, json=json_payload)

def get_gemini_key() -> str:
    key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if not key:
        try:
            from database import db_get_all_settings
            st = db_get_all_settings()
            key = st.get("gemini_api_key") or st.get("GEMINI_API_KEY") or ""
        except Exception:
            pass
    return key

def get_gemini_client(api_key: Optional[str] = None) -> Optional[Any]:
    """Get initialized google-genai Client using configured API key"""
    if not GENAI_SDK_AVAILABLE:
        return None
    key = api_key or get_gemini_key()
    if not key:
        return None
    try:
        return genai.Client(api_key=key)
    except Exception as e:
        logger.error("Failed to initialize google.genai Client: %s", e)
        return None

async def generate_gemini_text(
    prompt: str,
    model: str = "gemini-3.8-flash",
    system_instruction: Optional[str] = None,
    temperature: Optional[float] = None
) -> Dict[str, Any]:
    key = get_gemini_key()
    if not key:
        return {"success": False, "error": "GEMINI_API_KEY not configured"}

    target_model = resolve_model_name(model, default="gemini-3.8-flash")
    client = get_gemini_client(api_key=key)

    if client:
        try:
            config = None
            if system_instruction or temperature is not None:
                config_kwargs: Dict[str, Any] = {}
                if system_instruction:
                    config_kwargs["system_instruction"] = system_instruction
                if temperature is not None:
                    config_kwargs["temperature"] = temperature
                config = types.GenerateContentConfig(**config_kwargs)

            resp = await client.aio.models.generate_content(
                model=target_model,
                contents=prompt,
                config=config
            )
            text = resp.text or ""
            return {"success": True, "text": text, "model": target_model}
        except Exception as e:
            logger.warning("SDK generate_gemini_text failed, trying REST fallback: %s", e)

    # REST Fallback
    url = f"{GEMINI_API_URL}/models/{target_model}:generateContent?key={key}"
    payload: Dict[str, Any] = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    if system_instruction:
        payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    try:
        r = _safe_gemini_post(url, payload, timeout=25)
        if r.status_code == 200:
            data = r.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return {"success": True, "text": text, "model": target_model}
        else:
            return {"success": False, "status_code": r.status_code, "error": r.text}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def generate_gemini_structured(
    prompt: str,
    response_schema: Any,
    model: str = "gemini-3.8-flash",
    system_instruction: Optional[str] = None
) -> Dict[str, Any]:
    """Generate strictly structured Pydantic object using official Google GenAI schema enforcement"""
    key = get_gemini_key()
    if not key:
        return {"success": False, "error": "GEMINI_API_KEY not configured"}

    target_model = resolve_model_name(model, default="gemini-3.8-flash")
    client = get_gemini_client(api_key=key)

    if not client:
        return {"success": False, "error": "google-genai SDK not initialized"}

    try:
        config_kwargs: Dict[str, Any] = {
            "response_mime_type": "application/json",
            "response_schema": response_schema
        }
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction

        resp = await client.aio.models.generate_content(
            model=target_model,
            contents=prompt,
            config=types.GenerateContentConfig(**config_kwargs)
        )
        return {
            "success": True,
            "data": resp.parsed,
            "text": resp.text,
            "model": target_model
        }
    except Exception as e:
        logger.error("generate_gemini_structured failed: %s", e)
        return {"success": False, "error": str(e)}

async def generate_gemini_vision_text(
    prompt: str,
    image_path: Optional[str] = None,
    model: str = "gemini-3.8-flash"
) -> Dict[str, Any]:
    """Generate text/analysis using Gemini Vision with optional image input"""
    key = get_gemini_key()
    if not key:
        return {"success": False, "error": "GEMINI_API_KEY not configured"}

    target_model = resolve_model_name(model, default="gemini-3.8-flash")
    client = get_gemini_client(api_key=key)

    if client:
        try:
            contents: list = []
            if image_path and Path(image_path).exists():
                try:
                    with open(image_path, "rb") as f:
                        img_bytes = f.read()
                    ext = Path(image_path).suffix.lower()
                    mime = "image/png" if "png" in ext else ("image/webp" if "webp" in ext else "image/jpeg")
                    contents.append(types.Part.from_bytes(data=img_bytes, mime_type=mime))
                except Exception as ie:
                    logger.warning("Failed to read image for Gemini Vision: %s", ie)

            contents.append(prompt)
            resp = await client.aio.models.generate_content(
                model=target_model,
                contents=contents
            )
            return {"success": True, "text": resp.text or "", "model": target_model}
        except Exception as e:
            logger.warning("SDK generate_gemini_vision_text failed, trying REST fallback: %s", e)

    # REST Fallback
    parts = []
    if image_path and Path(image_path).exists():
        try:
            with open(image_path, "rb") as f:
                img_data = base64.b64encode(f.read()).decode("utf-8")
            ext = Path(image_path).suffix.lower()
            mime = "image/png" if "png" in ext else ("image/webp" if "webp" in ext else "image/jpeg")
            parts.append({
                "inlineData": {
                    "mimeType": mime,
                    "data": img_data
                }
            })
        except Exception as ie:
            logger.warning("Failed to read image for Gemini Vision: %s", ie)

    parts.append({"text": prompt})
    url = f"{GEMINI_API_URL}/models/{target_model}:generateContent?key={key}"
    payload = {
        "contents": [{"parts": parts}]
    }

    try:
        r = _safe_gemini_post(url, payload, timeout=30)
        if r.status_code == 200:
            data = r.json()
            candidates = data.get("candidates", [])
            if candidates and candidates[0].get("content", {}).get("parts"):
                text = candidates[0]["content"]["parts"][0].get("text", "")
                return {"success": True, "text": text, "model": target_model}
            return {"success": False, "error": "No text content in Gemini response"}
        else:
            return {"success": False, "status_code": r.status_code, "error": r.text}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def generate_veo_video(
    prompt: str,
    aspect_ratio: str = "16:9",
    image_path: Optional[str] = None,
    model: str = "veo-3.1-fast-generate-preview",
    duration_seconds: int = 5
) -> Dict[str, Any]:
    """
    Calls Google Veo video generation API via predictLongRunning,
    polls the operation until completion, and downloads the resulting MP4.
    Requires an active billing/tier plan on Google AI Studio.
    """
    key = get_gemini_key()
    if not key:
        return {"success": False, "error": "GEMINI_API_KEY not configured. Please add GEMINI_API_KEY in Settings."}

    # Normalize model name
    target_model = "veo-3.1-fast-generate-preview" if ("veo" in model.lower() or model == "google_veo") else model

    # Normalize aspect ratio (Veo accepts 16:9, 9:16, 1:1)
    norm_aspect = "16:9"
    if aspect_ratio in ["16:9", "9:16", "1:1"]:
        norm_aspect = aspect_ratio
    elif aspect_ratio in ["21:9", "2.39:1"]:
        norm_aspect = "16:9"

    # Google Veo / Omni Flash requires durationSeconds to be exactly 4, 6, or 8 (5s snaps to 6s)
    dur_int = int(duration_seconds)
    if dur_int <= 4:
        norm_duration = 4
    elif dur_int <= 7:
        norm_duration = 6
    else:
        norm_duration = 8

    url = f"{GEMINI_API_URL}/models/{target_model}:predictLongRunning?key={key}"
    
    instance: Dict[str, Any] = {"prompt": prompt}
    if image_path:
        img_p = Path(image_path)
        if img_p.exists():
            try:
                with open(img_p, "rb") as f:
                    img_b64 = base64.b64encode(f.read()).decode("utf-8")
                mime = "image/png" if img_p.suffix.lower() == ".png" else "image/jpeg"
                instance["image"] = {
                    "bytesBase64Encoded": img_b64,
                    "mimeType": mime
                }
            except Exception as ie:
                logger.warning("Failed to encode keyframe image for Veo: %s", ie)

    payload = {
        "instances": [instance],
        "parameters": {
            "aspectRatio": norm_aspect,
            "sampleCount": 1,
            "durationSeconds": norm_duration
        }
    }

    try:
        r = await asyncio.to_thread(_safe_gemini_post, url, payload, timeout=30)
        if r.status_code == 404 and target_model == "veo-3.1-fast-generate-preview":
            fallback_url = f"{GEMINI_API_URL}/models/veo-2.0-generate-001:predictLongRunning?key={key}"
            logger.info("Veo 3.1 preview returned 404; retrying with official endpoint veo-2.0-generate-001...")
            r = await asyncio.to_thread(_safe_gemini_post, fallback_url, payload, timeout=30)

        if r.status_code == 429:
            return {
                "success": False,
                "status_code": 429,
                "error": "Google Veo Quota Exceeded. Veo video generation requires an active paid tier (Pay-As-You-Go) on Google AI Studio (https://ai.google.dev/pricing).",
                "quota_exceeded": True
            }
        elif r.status_code != 200:
            return {
                "success": False,
                "status_code": r.status_code,
                "error": f"Google Veo API error ({r.status_code}): {r.text[:300]}"
            }
        
        op_data = r.json()
        op_name = op_data.get("name")
        if not op_name:
            return {
                "success": False,
                "error": f"Invalid Veo response: No operation name returned ({op_data})"
            }

        logger.info("Google Veo operation initiated: %s. Polling for completion...", op_name)

        # Poll operation
        poll_url = f"{GEMINI_API_URL}/{op_name.lstrip('/')}?key={key}" if not op_name.startswith("http") else f"{op_name}?key={key}"
        
        # Poll up to 120 seconds (24 * 5s) using async httpx client to prevent event loop blocking
        max_attempts = 24
        operation_result = None
        async with httpx.AsyncClient(timeout=30.0) as client:
            for attempt in range(max_attempts):
                await asyncio.sleep(5)
                try:
                    poll_r = await client.get(poll_url, headers={"x-goog-api-key": key})
                    if poll_r.status_code == 200:
                        poll_json = poll_r.json()
                        if poll_json.get("done"):
                            operation_result = poll_json
                            break
                    else:
                        logger.warning("Veo poll check HTTP %s: %s", poll_r.status_code, poll_r.text[:200])
                except Exception as pe:
                    logger.warning("Error during Veo poll attempt %d: %s", attempt, pe)

        if not operation_result:
            return {
                "success": False,
                "error": f"Google Veo operation '{op_name}' timed out after 120 seconds. Please check Google AI Studio console or try again."
            }

        # Check if operation completed with an error
        if "error" in operation_result:
            err_obj = operation_result["error"]
            err_msg = err_obj.get("message") if isinstance(err_obj, dict) else str(err_obj)
            return {
                "success": False,
                "error": f"Google Veo rendering failed: {err_msg}"
            }

        # Extract video from response
        resp_data = operation_result.get("response", {})
        video_uri = None
        video_b64 = None

        # Schema variation 1: generateVideoResponse.generatedSamples[0].video
        gen_response = resp_data.get("generateVideoResponse", {})
        samples = gen_response.get("generatedSamples", [])
        if samples and isinstance(samples, list):
            sample_vid = samples[0].get("video", {})
            video_uri = sample_vid.get("uri")
            video_b64 = sample_vid.get("bytesBase64Encoded")

        # Schema variation 2: generatedVideos[0].video
        if not video_uri and not video_b64:
            gen_vids = resp_data.get("generatedVideos", [])
            if gen_vids and isinstance(gen_vids, list):
                v_obj = gen_vids[0].get("video", {}) if isinstance(gen_vids[0], dict) else {}
                video_uri = v_obj.get("uri") or gen_vids[0].get("uri")
                video_b64 = v_obj.get("bytesBase64Encoded")

        # Schema variation 3: videos[0].uri
        if not video_uri and not video_b64:
            vids = resp_data.get("videos", [])
            if vids and isinstance(vids, list):
                video_uri = vids[0].get("uri") if isinstance(vids[0], dict) else str(vids[0])

        filename = f"veo_{uuid.uuid4().hex[:8]}.mp4"
        local_path = settings.VIDEOS_PATH / filename

        if video_b64:
            with open(local_path, "wb") as f:
                f.write(base64.b64decode(video_b64))
        elif video_uri:
            dl_url = video_uri
            if "generativelanguage.googleapis.com" in dl_url and "key=" not in dl_url:
                dl_url = f"{dl_url}&key={key}" if "?" in dl_url else f"{dl_url}?key={key}"
            
            async with httpx.AsyncClient(timeout=90.0) as client:
                dl_r = await client.get(dl_url, headers={"x-goog-api-key": key})
                if dl_r.status_code == 200:
                    with open(local_path, "wb") as f:
                        f.write(dl_r.content)
                else:
                    return {
                        "success": False,
                        "error": f"Failed to download generated Veo video from Google ({dl_r.status_code}): {dl_r.text[:200]}"
                    }
        else:
            return {
                "success": False,
                "error": f"Veo completed successfully but no video payload or URI was returned: {resp_data}"
            }

        # Enforce exact requested duration: If Veo generated 8s but user selected 4s, trim it with ffmpeg
        final_duration = float(duration_seconds)
        try:
            from services.ffmpeg_service import get_media_duration
            actual_dur = await asyncio.to_thread(get_media_duration, local_path)
            if actual_dur and actual_dur > (float(duration_seconds) + 0.3):
                logger.info("Veo generated %.2fs; trimming to requested %.2fs with ffmpeg...", actual_dur, float(duration_seconds))
                trimmed_path = local_path.with_name(f"trim_{local_path.name}")
                trim_cmd = [
                    "ffmpeg", "-y", "-i", str(local_path),
                    "-t", str(float(duration_seconds)),
                    "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                    "-c:a", "aac",
                    str(trimmed_path)
                ]
                proc = await asyncio.create_subprocess_exec(
                    *trim_cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                )
                await proc.communicate()
                if trimmed_path.exists() and trimmed_path.stat().st_size > 1000:
                    shutil.move(str(trimmed_path), str(local_path))
                    final_duration = float(duration_seconds)
            elif actual_dur:
                final_duration = round(actual_dur, 2)
        except Exception as trim_err:
            logger.warning("Veo post-process duration check error: %s", trim_err)

        # Conform video to exact requested aspect ratio (e.g. 4:3, 21:9, 1:1, 9:16, 16:9)
        if aspect_ratio and local_path.exists():
            try:
                from services.aspect_ratio_service import conform_video_aspect_ratio
                await asyncio.to_thread(conform_video_aspect_ratio, local_path, aspect_ratio)
            except Exception as cf_err:
                logger.warning("Veo video aspect ratio conformance warning: %s", cf_err)

        return {
            "success": True,
            "filename": filename,
            "url": f"/outputs/videos/{filename}",
            "local_path": str(local_path),
            "model": "Google Veo 3.1 (DeepMind)",
            "duration": final_duration,
            "engine": "Google DeepMind Veo 3.1 Neural Synthesizer"
        }
    except Exception as e:
        logger.error("Veo video generation exception: %s", e, exc_info=True)
        return {"success": False, "error": f"Google Veo error: {str(e)}"}

async def generate_gemini_image(
    prompt: str,
    model: str = "gemini-2.5-flash-image",
    filename_hint: Optional[str] = None,
    reference_image_path: Optional[str] = None,
    aspect_ratio: Optional[str] = None
) -> Dict[str, Any]:
    """Generate image via Google Gemini multimodal generation with active billing key, supporting reference images"""
    from services.prompt_utils import generate_image_filename
    
    key = get_gemini_key()
    if not key:
        return {"success": False, "error": "GEMINI_API_KEY not configured"}

    target_model = resolve_model_name(model, default="gemini-2.5-flash-image")

    # Framing and aspect ratio are specified directly in the prompt for precise composition
    final_prompt = prompt
    if aspect_ratio:
        if aspect_ratio in ["16:9", "21:9"]:
            final_prompt = f"{prompt}. 16:9 widescreen composition, cinematic aspect ratio, ultra high resolution masterpiece"
        elif aspect_ratio in ["9:16", "3:4", "2:3"]:
            final_prompt = f"{prompt}. 9:16 vertical portrait composition, full length vertical aspect ratio, ultra high resolution masterpiece"
        elif aspect_ratio == "1:1":
            final_prompt = f"{prompt}. 1:1 square composition, centered framing, ultra high resolution masterpiece"
        elif aspect_ratio == "4:3":
            final_prompt = f"{prompt}. 4:3 classic film composition, balanced framing, ultra high resolution masterpiece"

    client = get_gemini_client(api_key=key)
    if client:
        try:
            contents: list = []
            if reference_image_path and Path(reference_image_path).exists():
                try:
                    with open(reference_image_path, "rb") as f:
                        ref_bytes = f.read()
                    ext = Path(reference_image_path).suffix.lower()
                    ref_mime = "image/png" if "png" in ext else ("image/webp" if "webp" in ext else "image/jpeg")
                    contents.append(types.Part.from_bytes(data=ref_bytes, mime_type=ref_mime))
                except Exception as ie:
                    logger.warning("Failed to encode reference image: %s", ie)

            contents.append(final_prompt)
            resp = await client.aio.models.generate_content(
                model=target_model,
                contents=contents,
                config=types.GenerateContentConfig(response_modalities=["IMAGE"])
            )
            
            candidates = resp.candidates or []
            if candidates and candidates[0].content and candidates[0].content.parts:
                for part in candidates[0].content.parts:
                    if part.inline_data and part.inline_data.data:
                        raw_data = part.inline_data.data
                        img_bytes = raw_data if isinstance(raw_data, bytes) else base64.b64decode(raw_data)
                        mime = part.inline_data.mime_type or "image/png"
                        ext = ".png" if "png" in mime else ".jpg"
                        filename = generate_image_filename(filename_hint or prompt, ext=ext)
                        local_path = settings.IMAGES_PATH / filename
                        with open(local_path, "wb") as f:
                            f.write(img_bytes)

                        # Guarantee exact requested aspect ratio (e.g. 16:9, 9:16, 1:1, 4:3, 21:9)
                        if aspect_ratio:
                            try:
                                from services.aspect_ratio_service import conform_image_aspect_ratio
                                conform_image_aspect_ratio(local_path, aspect_ratio)
                            except Exception as cf_err:
                                logger.warning("Gemini image aspect ratio conformance warning: %s", cf_err)

                        model_label = f"Google Imagen 3 ({target_model})"
                        return {
                            "success": True,
                            "filename": filename,
                            "url": f"/outputs/images/{filename}",
                            "local_path": str(local_path),
                            "model": model_label
                        }
        except Exception as e:
            logger.warning("SDK generate_gemini_image failed, falling back to REST: %s", e)

    # REST Fallback
    parts = []
    if reference_image_path and Path(reference_image_path).exists():
        try:
            with open(reference_image_path, "rb") as f:
                img_data = base64.b64encode(f.read()).decode("utf-8")
            ext = Path(reference_image_path).suffix.lower()
            mime = "image/png" if "png" in ext else ("image/webp" if "webp" in ext else "image/jpeg")
            parts.append({
                "inlineData": {
                    "mimeType": mime,
                    "data": img_data
                }
            })
        except Exception as ie:
            logger.warning("Failed to encode reference image for Gemini Image generation: %s", ie)

    parts.append({"text": final_prompt})
    url = f"{GEMINI_API_URL}/models/{target_model}:generateContent?key={key}"
    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseModalities": ["IMAGE"]}
    }

    try:
        r = _safe_gemini_post(url, payload, timeout=40)
        if r.status_code != 200:
            return {"success": False, "status_code": r.status_code, "error": r.text}
        
        data = r.json()
        cand_parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        for p in cand_parts:
            if "inlineData" in p:
                b64 = p["inlineData"]["data"]
                mime = p["inlineData"].get("mimeType", "image/png")
                ext = ".png" if "png" in mime else ".jpg"
                filename = generate_image_filename(filename_hint or prompt, ext=ext)
                local_path = settings.IMAGES_PATH / filename
                with open(local_path, "wb") as f:
                    f.write(base64.b64decode(b64))

                if aspect_ratio:
                    try:
                        from services.aspect_ratio_service import conform_image_aspect_ratio
                        conform_image_aspect_ratio(local_path, aspect_ratio)
                    except Exception as cf_err:
                        logger.warning("Gemini image aspect ratio conformance warning: %s", cf_err)

                model_label = f"Google Imagen 3 ({target_model})"
                return {
                    "success": True,
                    "filename": filename,
                    "url": f"/outputs/images/{filename}",
                    "local_path": str(local_path),
                    "model": model_label
                }
        return {"success": False, "error": "No image payload found in Gemini response"}
    except Exception as e:
        return {"success": False, "error": str(e)}
