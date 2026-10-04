import asyncio
import os
from pathlib import Path
from typing import Optional
import httpx
import uuid

from config import settings

async def generate_fal_image(
    prompt: str,
    aspect_ratio: str = "16:9",
    model: str = "fal-ai/flux/schnell",
    filename_hint: Optional[str] = None,
    image_size: Optional[str] = None
) -> dict:
    """Generate image via fal.ai"""
    from services.prompt_utils import generate_image_filename
    
    if not settings.FAL_KEY:
        return {
            "success": False,
            "error_type": "KEY_MISSING",
            "error": "FAL_KEY is missing. Please configure it in Settings.",
            "provider": "fal",
            "required_key": "FAL_KEY"
        }

    # Set env var for fal_client to pick it up automatically
    os.environ['FAL_KEY'] = settings.FAL_KEY
    import fal_client

    filename = generate_image_filename(filename_hint or prompt, ext=".jpg")
    local_path = settings.IMAGES_PATH / filename

    # Map aspect ratio to fal's format if image_size not explicitly provided
    if not image_size:
        # fal expects formats like landscape_16_9, portrait_9_16, square_1_1
        ratio_map = {
            "16:9": "landscape_16_9",
            "9:16": "portrait_9_16",
            "1:1": "square_1_1",
            "4:3": "landscape_4_3",
            "3:4": "portrait_3_4",
            "21:9": "landscape_16_9" # fallback
        }
        image_size = ratio_map.get(aspect_ratio, "landscape_16_9")

    try:
        handler = await fal_client.submit_async(
            model,
            arguments={
                "prompt": prompt,
                "image_size": image_size,
                "num_images": 1
            },
        )
        result = await handler.get()
        
        if "images" in result and len(result["images"]) > 0:
            img_url = result["images"][0]["url"]
            async with httpx.AsyncClient() as dl_client:
                r = await dl_client.get(img_url, timeout=30.0)
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
                "error": "FAL returned empty output",
                "provider": "fal"
            }
    except Exception as e:
        return {
            "success": False,
            "error_type": "API_ERROR",
            "error": f"FAL generation error: {str(e)}",
            "provider": "fal"
        }


async def generate_fal_video(
    prompt: str,
    aspect_ratio: str = "16:9",
    image_url: Optional[str] = None,
    model: str = "fal-ai/minimax-video",
) -> dict:
    """Generate video via fal.ai models (Kling, Minimax, Luma)"""
    import uuid
    from services.prompt_utils import generate_image_filename
    
    if not settings.FAL_KEY:
        return {
            "success": False,
            "error_type": "KEY_MISSING",
            "error": "FAL_KEY is missing. Please configure it in Settings.",
            "provider": "fal",
            "required_key": "FAL_KEY"
        }

    os.environ['FAL_KEY'] = settings.FAL_KEY
    import fal_client

    filename = f"vid_{uuid.uuid4().hex[:8]}.mp4"
    local_path = settings.VIDEOS_PATH / filename

    try:
        # Build arguments based on model
        arguments = {"prompt": prompt}
        target_endpoint = model
        
        if "seedance" in model.lower():
            if image_url:
                target_endpoint = "fal-ai/bytedance/seedance-2.5/image-to-video"
                arguments["image_url"] = image_url
            else:
                target_endpoint = "fal-ai/bytedance/seedance-2.5/text-to-video"
            arguments["aspect_ratio"] = aspect_ratio
        elif "luma" in model:
            if image_url: arguments["image_url"] = image_url
            arguments["aspect_ratio"] = aspect_ratio
        elif "minimax" in model:
            if image_url: arguments["image_url"] = image_url
        elif "kling" in model:
            if image_url: arguments["image_url"] = image_url
            arguments["aspect_ratio"] = aspect_ratio

        handler = await fal_client.submit_async(
            target_endpoint,
            arguments=arguments,
        )
        result = await handler.get()
        
        vid_url = None
        if "video" in result and isinstance(result["video"], dict) and "url" in result["video"]:
            vid_url = result["video"]["url"]
        
        if vid_url:
            async with httpx.AsyncClient() as dl_client:
                r = await dl_client.get(vid_url, timeout=120.0)
            with open(local_path, "wb") as f:
                f.write(r.content)
            return {
                "success": True,
                "filename": filename,
                "url": f"/outputs/videos/{filename}",
                "local_path": str(local_path),
                "model": model,
                "duration": 5.0 # Estimate
            }
        else:
            return {
                "success": False,
                "error_type": "API_ERROR",
                "error": "FAL returned empty video output",
                "provider": "fal"
            }
    except Exception as e:
        return {
            "success": False,
            "error_type": "API_ERROR",
            "error": f"FAL video generation error: {str(e)}",
            "provider": "fal"
        }
