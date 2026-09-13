import os
import requests
import logging
import base64
import asyncio
import uuid
from pathlib import Path
from typing import Optional, Dict, Any
from config import settings
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

logger = logging.getLogger("omnistudio.gemini")

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta"

@retry(
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type((requests.exceptions.Timeout, requests.exceptions.ConnectionError)),
    reraise=True
)
def _safe_gemini_post(url: str, json_payload: dict, timeout: int):
    return requests.post(url, json=json_payload, timeout=timeout)

def get_gemini_key() -> str:
    return settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")

async def generate_gemini_text(prompt: str, model: str = "gemini-3.6-flash") -> Dict[str, Any]:
    key = get_gemini_key()
    if not key:
        return {"success": False, "error": "GEMINI_API_KEY not configured"}

    url = f"{GEMINI_API_URL}/models/{model}:generateContent?key={key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }

    try:
        r = _safe_gemini_post(url, payload, timeout=20)
        if r.status_code == 200:
            data = r.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return {"success": True, "text": text, "model": model}
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

    url = f"{GEMINI_API_URL}/models/{target_model}:predictLongRunning?key={key}"
    
    instance: Dict[str, Any] = {"prompt": prompt}
    if image_path:
        img_p = Path(image_path)
        if img_p.exists():
            try:
                with open(img_p, "rb") as f:
                    img_b64 = base64.b64encode(f.read()).decode("utf-8")
                instance["image"] = {"bytesBase64Encoded": img_b64}
            except Exception as ie:
                logger.warning("Failed to encode keyframe image for Veo: %s", ie)

    payload = {
        "instances": [instance],
        "parameters": {
            "aspectRatio": norm_aspect,
            "sampleCount": 1
        }
    }

    try:
        r = _safe_gemini_post(url, payload, timeout=30)
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
        
        # Poll up to 120 seconds (24 * 5s)
        max_attempts = 24
        operation_result = None
        for attempt in range(max_attempts):
            await asyncio.sleep(5)
            try:
                poll_r = requests.get(poll_url, headers={"x-goog-api-key": key}, timeout=25)
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
            
            dl_r = requests.get(dl_url, headers={"x-goog-api-key": key}, timeout=90)
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

        return {
            "success": True,
            "filename": filename,
            "url": f"/outputs/videos/{filename}",
            "local_path": str(local_path),
            "model": "Google Veo 3.1 (DeepMind)",
            "duration": float(duration_seconds),
            "engine": "Google DeepMind Veo 3.1 Neural Synthesizer"
        }
    except Exception as e:
        logger.error("Veo video generation exception: %s", e, exc_info=True)
        return {"success": False, "error": f"Google Veo error: {str(e)}"}

async def generate_gemini_image(prompt: str, model: str = "gemini-2.5-flash-image", filename_hint: Optional[str] = None) -> Dict[str, Any]:
    """Generate image via Google Gemini multimodal generation with active billing key"""
    import base64
    import uuid
    from pathlib import Path
    from services.prompt_utils import generate_image_filename
    
    key = get_gemini_key()
    if not key:
        return {"success": False, "error": "GEMINI_API_KEY not configured"}

    url = f"{GEMINI_API_URL}/models/{model}:generateContent?key={key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE"]}
    }

    try:
        r = _safe_gemini_post(url, payload, timeout=40)
        if r.status_code != 200:
            return {"success": False, "status_code": r.status_code, "error": r.text}
        
        data = r.json()
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        for p in parts:
            if "inlineData" in p:
                b64 = p["inlineData"]["data"]
                mime = p["inlineData"].get("mimeType", "image/png")
                ext = ".png" if "png" in mime else ".jpg"
                filename = generate_image_filename(filename_hint or prompt, ext=ext)
                local_path = settings.IMAGES_PATH / filename
                with open(local_path, "wb") as f:
                    f.write(base64.b64decode(b64))
                return {
                    "success": True,
                    "filename": filename,
                    "url": f"/outputs/images/{filename}",
                    "local_path": str(local_path),
                    "model": "Google Gemini 2.5 Flash Image"
                }
        return {"success": False, "error": "No image payload found in Gemini response"}
    except Exception as e:
        return {"success": False, "error": str(e)}

