import uuid
import httpx
from pathlib import Path
from config import settings
from services.ffmpeg_service import image_to_video_motion
from services.mock_service import generate_mock_image

async def generate_video_from_image(
    image_path: Path | str,
    motion_type: str = "zoom_in",
    duration: float = 4.0,
    fps: int = 30,
    width: int = 1280,
    height: int = 720,
    quality: str = "balanced",
    motion_intensity: float = 1.0,
    loop: bool = False,
    model: str = "ffmpeg_local"
) -> dict:
    """
    Generate video from image.
    If Replicate token is configured, uses cloud model.
    Otherwise uses local FFmpeg Ken Burns cinematic motion camera engine (0 cost, ultra-fast!).
    """
    filename = f"vid_{uuid.uuid4().hex[:8]}.mp4"
    output_path = settings.VIDEOS_PATH / filename
    
    # High-Performance Local FFmpeg Engine
    image_to_video_motion(
        image_path=image_path,
        output_path=output_path,
        duration=duration,
        motion_type=motion_type,
        fps=fps,
        width=width,
        height=height,
        quality=quality,
        motion_intensity=motion_intensity,
        loop=loop
    )
    
    return {
        "success": True,
        "filename": filename,
        "url": f"/outputs/videos/{filename}",
        "local_path": str(output_path),
        "duration": duration,
        "motion_type": motion_type,
        "engine": "OmniStudio Camera Motion Engine (FFmpeg 8.1)"
    }

async def generate_flux_image(
    prompt: str,
    aspect_ratio: str = "16:9",
    model: str = "flux-schnell"
) -> dict:
    """Generate image via Black Forest Labs Flux model (Replicate) or fallback"""
    filename = f"flux_{uuid.uuid4().hex[:8]}.png"
    local_path = settings.IMAGES_PATH / filename
    
    if not settings.REPLICATE_API_TOKEN:
        return {
            "success": False,
            "error_type": "KEY_MISSING",
            "error": "Replicate API Token is missing. Please configure REPLICATE_API_TOKEN in Settings (http://localhost:3000/settings) to generate Flux images.",
            "provider": "replicate",
            "required_key": "REPLICATE_API_TOKEN"
        }
        
    try:
        url = "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions"
        headers = {
            "Authorization": f"Bearer {settings.REPLICATE_API_TOKEN}",
            "Content-Type": "application/json",
            "Prefer": "wait"
        }
        data = {
            "input": {
                "prompt": prompt,
                "aspect_ratio": aspect_ratio,
                "output_format": "png"
            }
        }
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=data, headers=headers, timeout=90.0)
            result = res.json()
            if "output" in result and result["output"]:
                img_url = result["output"][0] if isinstance(result["output"], list) else result["output"]
                r = await client.get(img_url)
                with open(local_path, "wb") as f:
                    f.write(r.content)
                return {
                    "success": True,
                    "simulated": False,
                    "filename": filename,
                    "url": f"/outputs/images/{filename}",
                    "local_path": str(local_path),
                    "model": model
                }
            else:
                return {
                    "success": False,
                    "error_type": "API_ERROR",
                    "error": result.get("error", "Replicate returned empty output"),
                    "provider": "replicate"
                }
    except Exception as e:
        return {
            "success": False,
            "error_type": "API_ERROR",
            "error": f"Flux generation error: {str(e)}",
            "provider": "replicate"
        }
