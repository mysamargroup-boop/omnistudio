import os
import requests
from typing import Optional, Dict, Any
from config import settings

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta"

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
        r = requests.post(url, json=payload, timeout=20)
        if r.status_code == 200:
            data = r.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return {"success": True, "text": text, "model": model}
        else:
            return {"success": False, "status_code": r.status_code, "error": r.text}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def generate_veo_video(prompt: str, aspect_ratio: str = "16:9", model: str = "veo-3.1-fast-generate-preview") -> Dict[str, Any]:
    """
    Calls Google Veo video generation API via predictLongRunning.
    Note: Requires an active billing/tier plan on Google AI Studio.
    """
    key = get_gemini_key()
    if not key:
        return {"success": False, "error": "GEMINI_API_KEY not configured"}

    url = f"{GEMINI_API_URL}/models/{model}:predictLongRunning?key={key}"
    payload = {
        "instances": [{"prompt": prompt}],
        "parameters": {"aspectRatio": aspect_ratio}
    }

    try:
        r = requests.post(url, json=payload, timeout=25)
        if r.status_code == 200:
            data = r.json()
            return {"success": True, "operation": data, "model": model}
        elif r.status_code == 429:
            return {
                "success": False,
                "status_code": 429,
                "error": "Google Veo Quota Exceeded. Veo video generation requires an active paid tier (Pay-As-You-Go) on Google AI Studio (https://ai.google.dev/pricing).",
                "quota_exceeded": True
            }
        else:
            return {"success": False, "status_code": r.status_code, "error": r.text}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def generate_gemini_image(prompt: str, model: str = "gemini-2.5-flash-image") -> Dict[str, Any]:
    """Generate image via Google Gemini multimodal generation with active billing key"""
    import base64
    import uuid
    from pathlib import Path
    
    key = get_gemini_key()
    if not key:
        return {"success": False, "error": "GEMINI_API_KEY not configured"}

    url = f"{GEMINI_API_URL}/models/{model}:generateContent?key={key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE"]}
    }

    try:
        r = requests.post(url, json=payload, timeout=40)
        if r.status_code != 200:
            return {"success": False, "status_code": r.status_code, "error": r.text}
        
        data = r.json()
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        for p in parts:
            if "inlineData" in p:
                b64 = p["inlineData"]["data"]
                mime = p["inlineData"].get("mimeType", "image/png")
                ext = ".png" if "png" in mime else ".jpg"
                filename = f"gemini_{uuid.uuid4().hex[:8]}{ext}"
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

