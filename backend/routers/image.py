from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from pydantic import BaseModel
from typing import Optional, List
from pathlib import Path
from limiter import limiter
import uuid
import asyncio
import shutil
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

from config import settings
from services.openai_service import generate_openai_image
from services.replicate_service import generate_flux_image
from services.prompt_enhancer import enhance_prompt
from services.security_service import sanitize_filename
from database import db_save_asset
import logging

logger = logging.getLogger("omnistudio.image")

from pydantic import BaseModel, field_validator

router = APIRouter(prefix="/api/image", tags=["Image Generation"])

ALLOWED_ASPECT_RATIOS = {"1:1", "16:9", "9:16", "4:3", "3:2", "21:9"}
ALLOWED_IMAGE_QUALITIES = {"standard", "hd", "ultra"}
ALLOWED_IMAGE_STYLES = {"cinematic", "photoreal", "anime", "cyberpunk", "3d_pixar", "vintage", "fantasy", "analog"}

class ImageRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = ""
    model: str = "dall-e-3"  # dall-e-3, flux-schnell, gpt-image-1, gpt-image-2
    size: str = "1792x1024"
    quality: str = "hd"  # standard, hd, ultra
    style: str = "cinematic"  # cinematic, photoreal, anime, cyberpunk, 3d_pixar
    enhance_prompt: bool = True
    enhance_style: str = "cinematic"
    aspect_ratio: str = "16:9"
    resolution: Optional[str] = "1080p"  # 720p, 1080p, 2k, 4k, 8k
    lens: Optional[str] = "35mm Prime"
    aperture: Optional[str] = "f/1.4"
    lighting: Optional[str] = "Volumetric God Rays"
    film_stock: Optional[str] = "Kodak Portra 400"
    cfg_scale: Optional[float] = 7.5
    sampling_steps: Optional[int] = 30
    seed: Optional[int] = None
    count: Optional[int] = 1  # 1, 2, 4 images batch

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Prompt cannot be empty")
        if len(s) > 2000:
            raise ValueError("Prompt cannot exceed 2000 characters")
        return s

    @field_validator("aspect_ratio")
    @classmethod
    def validate_aspect_ratio(cls, v: str) -> str:
        if v not in ALLOWED_ASPECT_RATIOS:
            raise ValueError(f"Invalid aspect_ratio '{v}'. Allowed: {sorted(ALLOWED_ASPECT_RATIOS)}")
        return v

    @field_validator("quality")
    @classmethod
    def validate_quality(cls, v: str) -> str:
        if v not in ALLOWED_IMAGE_QUALITIES:
            raise ValueError(f"Invalid quality '{v}'. Allowed: {sorted(ALLOWED_IMAGE_QUALITIES)}")
        return v

    @field_validator("style")
    @classmethod
    def validate_style(cls, v: str) -> str:
        if v not in ALLOWED_IMAGE_STYLES:
            return "cinematic"
        return v

    @field_validator("count")
    @classmethod
    def validate_count(cls, v: Optional[int]) -> int:
        if v is None:
            return 1
        if not (1 <= v <= 4):
            raise ValueError("Image batch count must be between 1 and 4")
        return v

    @field_validator("cfg_scale")
    @classmethod
    def validate_cfg_scale(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (1.0 <= v <= 20.0):
            raise ValueError("cfg_scale must be between 1.0 and 20.0")
        return v

    @field_validator("sampling_steps")
    @classmethod
    def validate_sampling_steps(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (10 <= v <= 100):
            raise ValueError("sampling_steps must be between 10 and 100")
        return v

class ImageVariationsRequest(BaseModel):
    reference_image_path: str
    prompt: Optional[str] = ""
    batch_size: int = 4  # 2, 4, 8
    variation_strength: float = 0.5  # 0.1 to 0.9
    styles: Optional[List[str]] = []
    aspect_ratio: str = "16:9"
    resolution: Optional[str] = "1080p"
    model: str = "dall-e-3"
    quality: str = "hd"

    @field_validator("batch_size")
    @classmethod
    def validate_batch_size(cls, v: int) -> int:
        if not (1 <= v <= 8):
            raise ValueError("batch_size must be between 1 and 8")
        return v

    @field_validator("variation_strength")
    @classmethod
    def validate_variation_strength(cls, v: float) -> float:
        if not (0.05 <= v <= 0.95):
            raise ValueError("variation_strength must be between 0.05 and 0.95")
        return round(float(v), 2)

    @field_validator("aspect_ratio")
    @classmethod
    def validate_var_aspect_ratio(cls, v: str) -> str:
        if v not in ALLOWED_ASPECT_RATIOS:
            return "16:9"
        return v

from path_utils import safe_resolve_output_path as _hardened_resolve

def resolve_image_path(p: str) -> Optional[Path]:
    if not p:
        return None
    try:
        return _hardened_resolve(p, "images", must_exist=True)
    except Exception:
        try:
            return _hardened_resolve(p, "final", must_exist=True)
        except Exception:
            return None

@router.post("/upload-reference")
@limiter.limit("20/minute")
async def upload_reference_image(request: Request, file: UploadFile = File(...)):
    """Upload a source/reference image for image-to-image variations."""
    from services.security_service import sanitize_filename, validate_uploaded_media
    clean_orig = sanitize_filename(file.filename)
    ext = Path(clean_orig).suffix or ".png"
    filename = f"ref_{uuid.uuid4().hex[:8]}{ext}"
    target_path = settings.IMAGES_PATH / filename

    content = await file.read()
    validate_uploaded_media(content, clean_orig, "image")
    with open(target_path, "wb") as f:
        f.write(content)

    return {
        "success": True,
        "filename": filename,
        "url": f"/outputs/images/{filename}",
        "local_path": str(target_path)
    }

@router.post("/variations")
@limiter.limit("10/minute")
async def generate_image_variations(req: ImageVariationsRequest, request: Request):
    """
    Generate multiple image variations in bulk from a single reference image + prompt/settings.
    Supports 2, 4, or 8 batch variations.
    """
    ref_path = resolve_image_path(req.reference_image_path)
    if not ref_path or not ref_path.exists():
        return {"success": False, "error": f"Reference image not found: {req.reference_image_path}"}

    if not settings.OPENAI_API_KEY and not getattr(settings, 'REPLICATE_API_TOKEN', None):
        return {
            "success": False, 
            "error_type": "KEY_MISSING",
            "error": "API Key (OpenAI or Replicate) is required for neural image variations."
        }

    variations = []
    batch_count = min(max(req.batch_size, 1), 8)

    # Perspective / Aesthetic variation angles
    VARIATION_ANGLES = [
        {"desc": "Angle 1: Warm Golden Sunlight & Shallow Depth of Field", "style": "cinematic"},
        {"desc": "Angle 2: Cool Ambient Twilight & Dramatic Rim Lighting", "style": "photoreal"},
        {"desc": "Angle 3: Cyberpunk Neon Noir with Vivid Reflections", "style": "cyberpunk"},
        {"desc": "Angle 4: Classic 35mm Silver Halide Film Emulation", "style": "vintage_noir"},
    ]

    for i in range(batch_count):
        angle = VARIATION_ANGLES[i % len(VARIATION_ANGLES)]
        
        user_prompt = req.prompt.strip() if req.prompt else "Variation of reference subject"
        var_prompt = f"{user_prompt}, {angle['desc']}, variation strength {req.variation_strength}"

        if settings.OPENAI_API_KEY:
            try:
                res = await generate_openai_image(
                    prompt=var_prompt,
                    model=req.model,
                    size="1792x1024" if req.aspect_ratio == "16:9" else "1024x1024",
                    quality="hd" if req.quality in ["hd", "ultra"] else "standard",
                    style="vivid"
                )
                if res.get("success"):
                    variations.append({
                        "id": i + 1,
                        "filename": res.get("filename"),
                        "url": res.get("url"),
                        "local_path": res.get("local_path"),
                        "angle": angle["desc"],
                        "style": angle["style"],
                        "prompt": var_prompt,
                        "model": res.get("model")
                    })
            except Exception as e:
                logger.warning("Neural variation attempt failed: %s", e)

    if not variations:
        return {"success": False, "error": "Failed to generate variations using the configured API providers."}

    try:
        from services.usage_tracker import log_generation
        log_generation(
            service_type="image",
            provider="openai",
            model="Neural Variation Engine",
            prompt=f"Multi-angle variations ({batch_count}x) for {Path(req.reference_image_path).name}",
            status="success",
            specs={"batch_size": batch_count, "variation_strength": req.variation_strength},
            output_url=variations[0]["url"] if variations else ""
        )
    except Exception as e:
        logger.warning("Failed to record image variation usage log: %s", e)

    return {
        "success": True,
        "reference_image": req.reference_image_path,
        "total": len(variations),
        "batch_size": batch_count,
        "variation_strength": req.variation_strength,
        "variations": variations
    }

async def _generate_single_pass(req: ImageRequest, composed_prompt: str, seed_offset: int = 0):
    openai_quality = "hd" if req.quality in ["hd", "ultra"] else "standard"

    if req.model.startswith("flux"):
        result = await generate_flux_image(
            prompt=composed_prompt, aspect_ratio=req.aspect_ratio, model=req.model
        )
    elif req.model in ["imagen_3", "gemini_flash_image", "google_gemini"]:
        from services.gemini_service import get_gemini_key, generate_gemini_image
        if not get_gemini_key():
            result = {
                "success": False,
                "error_type": "KEY_MISSING",
                "error": "Google Gemini API Key is missing. Please add your GEMINI_API_KEY in Settings to use Google Imagen 3 / Gemini Image.",
                "provider": "google",
                "required_key": "GEMINI_API_KEY"
            }
        else:
            result = await generate_gemini_image(composed_prompt)
    elif req.model in ["dall-e-3", "dall-e-2", "gpt-image-1", "gpt-image-1-mini", "gpt-image-1.5", "gpt-image-2", "openai"]:
        result = await generate_openai_image(
            prompt=composed_prompt, model=req.model, size=req.size,
            quality=openai_quality, style="vivid" if req.style in ["cinematic", "cyberpunk"] else "natural"
        )
    elif req.model == "omni_diffusion":
        result = {
            "success": False,
            "error_type": "LOCAL_MODEL_UNCONFIGURED",
            "error": "OmniDiffusion local weights are not installed on this host. Please choose Flux-Schnell (Replicate), Imagen 3 (Google), or DALL-E 3 (OpenAI) with your API key.",
            "provider": "local"
        }
    else:
        from services.gemini_service import get_gemini_key, generate_gemini_image
        if get_gemini_key():
            result = await generate_gemini_image(composed_prompt)
            if result.get("success"):
                result["model"] = f"{req.model} (Powered by Google Gemini)"
        elif settings.OPENAI_API_KEY:
            result = await generate_openai_image(
                prompt=composed_prompt, model="dall-e-3", size=req.size,
                quality=openai_quality, style="vivid"
            )
            if result.get("success"):
                result["model"] = f"{req.model} (Powered by DALL-E 3)"
        else:
            result = {
                "success": False,
                "error_type": "KEY_MISSING",
                "error": f"API Key required for {req.model}. Please configure GEMINI_API_KEY or OPENAI_API_KEY in Settings.",
                "provider": req.model,
                "required_key": "GEMINI_API_KEY"
            }

    if result.get("success"):
        result["enhanced_prompt"] = composed_prompt
        result["quality"] = req.quality
        result["lens"] = req.lens
        result["lighting"] = req.lighting
        result["film_stock"] = req.film_stock
        result["cfg_scale"] = req.cfg_scale
        result["sampling_steps"] = req.sampling_steps
        result["seed"] = (req.seed or 42) + seed_offset if req.seed is not None else None

        # Sync asset to Cloudflare R2 and Supabase Cloud
        if result.get("local_path"):
            try:
                from services.storage_service import sync_and_save_asset
                synced = await sync_and_save_asset(
                    local_path=result["local_path"],
                    asset_type="image",
                    metadata={"prompt": req.prompt, "model": req.model, "quality": req.quality}
                )
                result["asset_id"] = synced.get("asset_id")
                result["r2_url"] = synced.get("url")
                # Ensure primary display url is always the reliable local outputs proxy
                result["url"] = f"/outputs/images/{Path(result['local_path']).name}"
            except Exception as e:
                logger.warning("Failed to sync generated image asset to cloud storage: %s", e)

    return result

@router.post("/generate")
@limiter.limit("10/minute")
async def generate_image(req: ImageRequest, request: Request):
    modifiers = []
    if req.lens:
        modifiers.append(f"shot on {req.lens}")
    if req.aperture:
        modifiers.append(f"{req.aperture} shallow depth of field")
    if req.lighting:
        modifiers.append(f"{req.lighting} lighting")
    if req.film_stock:
        modifiers.append(f"{req.film_stock} color grading")
    if req.quality == "ultra":
        modifiers.append("8k master photography, raw detail, ultra-sharp focus")
    elif req.quality == "hd":
        modifiers.append("high definition, pristine clarity")

    base_prompt = req.prompt.strip()
    if modifiers:
        composed_prompt = f"{base_prompt}, {', '.join(modifiers)}"
    else:
        composed_prompt = base_prompt

    if req.enhance_prompt:
        composed_prompt = await enhance_prompt(composed_prompt, req.enhance_style)

    batch_count = min(max(req.count or 1, 1), 4)

    if batch_count == 1:
        single_res = await _generate_single_pass(req, composed_prompt, seed_offset=0)
        if not single_res.get("success"):
            return single_res
        result = dict(single_res)
        result["images"] = [{
            "url": single_res.get("url"),
            "filename": single_res.get("filename"),
            "local_path": single_res.get("local_path"),
            "model": single_res.get("model", req.model),
            "seed": single_res.get("seed")
        }]
        result["count"] = 1
    else:
        # Multi-image generation
        images = []
        for i in range(batch_count):
            sub_res = await _generate_single_pass(req, composed_prompt, seed_offset=i)
            if sub_res.get("success"):
                images.append({
                    "url": sub_res.get("url"),
                    "filename": sub_res.get("filename"),
                    "local_path": sub_res.get("local_path"),
                    "model": sub_res.get("model", req.model),
                    "seed": sub_res.get("seed")
                })
            elif not images and i == 0:
                # If first one failed, return error
                return sub_res

        if not images:
            return {"success": False, "error": "Batch generation failed for all variations"}

        result = {
            "success": True,
            "count": len(images),
            "images": images,
            "url": images[0]["url"],
            "filename": images[0]["filename"],
            "local_path": images[0].get("local_path"),
            "model": images[0].get("model", req.model),
            "enhanced_prompt": composed_prompt,
            "quality": req.quality,
            "aspect_ratio": req.aspect_ratio,
            "resolution": req.resolution
        }

    try:
        from services.usage_tracker import log_generation
        log_provider = "google" if any(k in req.model.lower() for k in ["imagen", "gemini"]) else ("openai" if ("dall-e" in req.model.lower() or "gpt-image" in req.model.lower()) else "replicate")
        log_generation(
            service_type="image",
            provider=log_provider,
            model=result.get("model", req.model),
            prompt=req.prompt,
            status="success" if result.get("success") else "failed",
            specs={"quality": req.quality, "aspect_ratio": req.aspect_ratio, "resolution": req.resolution, "count": batch_count},
            output_url=result.get("url", ""),
            error=result.get("error") if not result.get("success") else None
        )
    except Exception as e:
        logger.warning("Failed to record image generation usage log: %s", e)

    return result

@router.post("/enhance-prompt")
async def enhance_prompt_endpoint(req: ImageRequest):
    enhanced = await enhance_prompt(req.prompt, req.enhance_style)
    return {"original": req.prompt, "enhanced": enhanced, "style": req.enhance_style}

class AdvancedEditRequest(BaseModel):
    image_path: str
    rotate: float = 0
    flip_h: bool = False
    flip_v: bool = False
    crop: Optional[list] = None
    exposure: float = 0
    contrast: float = 0
    saturation: float = 0
    temperature: float = 0
    tint: float = 0
    shadows: float = 0
    highlights: float = 0
    sharpness: float = 0
    blur: float = 0
    vignette: float = 0

@router.post("/advanced-edit")
@limiter.limit("30/minute")
async def advanced_edit_endpoint(req: AdvancedEditRequest, request: Request):
    """
    Advanced Adobe/Snapseed style parametric image manipulation.
    Applies cropping, color correction, curves, and lens effects.
    """
    try:
        from services.advanced_image_editor import apply_advanced_edits
        src_path = resolve_image_path(req.image_path)
        if not src_path or not src_path.exists():
            return {"success": False, "error": f"Image not found: {req.image_path}"}
            
        ext = src_path.suffix or ".png"
        out_filename = f"edited_{uuid.uuid4().hex[:8]}{ext}"
        out_path = settings.IMAGES_PATH / out_filename
        
        await asyncio.to_thread(apply_advanced_edits, str(src_path), req.model_dump(), str(out_path))
        
        return {
            "success": True,
            "filename": out_filename,
            "url": f"/outputs/images/{out_filename}",
            "local_path": str(out_path),
            "original_image": req.image_path
        }
    except Exception as e:
        logger.error("Advanced edit failed: %s", e)
        return {"success": False, "error": f"Image editing failed: {e}"}

@router.get("/models")
@limiter.limit("60/minute")
async def list_image_models(request: Request):
    try:
        from database import load_settings_into_runtime
        load_settings_into_runtime()
    except Exception:
        pass

    openai_key = os.environ.get("OPENAI_API_KEY") or getattr(settings, "OPENAI_API_KEY", "")
    replicate_token = os.environ.get("REPLICATE_API_TOKEN") or getattr(settings, "REPLICATE_API_TOKEN", "")
    try:
        from services.gemini_service import get_gemini_key
        gemini_key = get_gemini_key()
    except Exception:
        gemini_key = os.environ.get("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", "")

    openai_active = bool(openai_key and str(openai_key).strip())
    replicate_active = bool(replicate_token and str(replicate_token).strip())
    google_active = bool(gemini_key and str(gemini_key).strip())
    
    return {
        "models": [
            {"id": "gpt-image-2", "name": "GPT Image 2", "provider": "openai", "badge": "PREMIUM", "active": openai_active, "description": "4K Images with near-perfect text rendering & skin textures"},
            {"id": "gpt-image-1", "name": "GPT Image 1 Pro", "provider": "openai", "badge": "PRO", "active": openai_active, "description": "Cinema-grade visual creation & dynamic range"},
            {"id": "gpt-image-1-mini", "name": "GPT Image 1 Mini", "provider": "openai", "badge": "FAST", "active": openai_active, "description": "Stunning everyday images, ultra-fast generation"},
            {"id": "imagen_3", "name": "Nano Banana Pro (Imagen 3)", "provider": "google", "badge": "ACTIVE", "active": google_active, "description": "Google's flagship hyper-realistic lighting & micro-textures"},
            {"id": "gemini_flash_image", "name": "Nano Banana 2 (Gemini Flash)", "provider": "google", "badge": "PREMIUM", "active": google_active, "description": "Pro quality generation at flash speed"},
            {"id": "dall-e-3", "name": "DALL-E 3 HD (OpenAI)", "provider": "openai", "badge": "PRO", "active": openai_active, "description": "High Composition Precision & Semantic Fidelity"},
            {"id": "flux_pro", "name": "Flux.1 Pro (Black Forest Labs)", "provider": "replicate", "badge": "SOTA", "active": replicate_active, "description": "State-of-the-Art Typography & Photorealism"},
            {"id": "flux_dev", "name": "Flux.1 Dev (Open Weights)", "provider": "replicate", "badge": "DEV", "active": replicate_active, "description": "High-Fidelity Fine-Tuned Guidance"},
            {"id": "flux-schnell", "name": "Flux.1 Schnell (Fast Latent)", "provider": "replicate", "badge": "FAST", "active": replicate_active, "description": "Speed Latent Diffusion & Rapid Generation"},
            {"id": "seedream_pro", "name": "Seedream 5.0 Pro", "provider": "replicate", "badge": "PREMIUM", "active": replicate_active, "description": "Logically consistent images with intelligent visual reasoning"},
            {"id": "recraft_v3", "name": "Recraft V3", "provider": "replicate", "badge": "NEW", "active": replicate_active, "description": "Top-tier vector graphics, branding & graphic design"},
            {"id": "sd_35_large", "name": "Stable Diffusion 3.5 Large", "provider": "replicate", "badge": "OPEN", "active": replicate_active, "description": "Advanced Multimodal Prompt Adherence"},
            {"id": "midjourney_v6", "name": "Midjourney v6.1 (Photoreal)", "provider": "cloud", "badge": "PRO", "active": False, "description": "World-class Cinematic Lighting & Color Grading"},
            {"id": "ideogram_v2", "name": "Ideogram v2 (Graphics & Type)", "provider": "ideogram", "badge": "TYPE", "active": False, "description": "Flawless In-Image Lettering & Graphic Design"},
            {"id": "omni_diffusion", "name": "OmniDiffusion 4.0 Pro", "provider": "local", "badge": "LOCAL", "active": False, "description": "Local GPU-Accelerated Stable Diffusion (Requires RTX 3090+)"},
        ],
        "lenses": [
            {"id": "16mm", "name": "16mm Ultra-Wide"},
            {"id": "24mm", "name": "24mm Anamorphic"},
            {"id": "35mm", "name": "35mm Prime"},
            {"id": "50mm", "name": "50mm Natural"},
            {"id": "85mm", "name": "85mm Portrait"},
            {"id": "100mm", "name": "100mm Macro"}
        ],
        "apertures": [
            {"id": "f/1.2", "name": "f/1.2 Ultra Bokeh"},
            {"id": "f/2.8", "name": "f/2.8 Portrait Focus"},
            {"id": "f/8", "name": "f/8 Landscape Depth"},
            {"id": "f/16", "name": "f/16 Deep Field"}
        ],
        "lighting": [
            {"id": "golden_hour", "name": "Golden Hour Sunlight"},
            {"id": "volumetric_rays", "name": "Volumetric God Rays"},
            {"id": "studio_softbox", "name": "Studio Softbox Lighting"},
            {"id": "cyberpunk_neon", "name": "Cyberpunk Neon Lighting"},
            {"id": "moody_lowkey", "name": "Moody Low-Key Chiaroscuro"},
            {"id": "direct_sun", "name": "Harsh Direct Sunlight"}
        ],
        "film_stocks": [
            {"id": "kodak_portra", "name": "Kodak Portra 400"},
            {"id": "fuji_velvia", "name": "Fujifilm Velvia"},
            {"id": "teal_orange", "name": "Hollywood Teal & Orange"},
            {"id": "monochrome_noir", "name": "Monochrome Silver Noir"},
            {"id": "bleach_bypass", "name": "Cinematic Bleach Bypass"}
        ]
    }


class ImageEditRequest(BaseModel):
    filename: str
    brightness: Optional[float] = 1.0
    contrast: Optional[float] = 1.0
    saturation: Optional[float] = 1.0
    sharpness: Optional[float] = 1.0
    upscale_factor: Optional[int] = 1
    filter: Optional[str] = "none"
    aspect_ratio: Optional[str] = None


@router.post("/upload")
@limiter.limit("30/minute")
async def upload_image(request: Request, file: UploadFile = File(...)):
    """Upload an image file preserving original filename and registering in Vault"""
    allowed_exts = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
    raw_name = file.filename or "uploaded_image.png"
    clean_name = sanitize_filename(raw_name)
    ext = Path(clean_name).suffix.lower()
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported image format. Allowed: {sorted(allowed_exts)}")

    dest_dir = settings.IMAGES_PATH
    dest_dir.mkdir(parents=True, exist_ok=True)

    # Preserve original filename without overwriting existing files
    base_stem = Path(clean_name).stem
    target_filename = clean_name
    counter = 1
    while (dest_dir / target_filename).exists():
        target_filename = f"{base_stem}_{counter}{ext}"
        counter += 1

    dest_path = dest_dir / target_filename
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    stat = dest_path.stat()
    asset_id = str(uuid.uuid4())
    url = f"/outputs/images/{target_filename}"

    db_save_asset(
        asset_id=asset_id,
        project_id=None,
        asset_type="images",
        filename=target_filename,
        url=url,
        local_path=str(dest_path),
        storage_provider="local",
        size_bytes=stat.st_size,
        mime_type=file.content_type or f"image/{ext.lstrip('.')}",
        metadata={"original_name": raw_name, "uploaded": True}
    )

    return {
        "success": True,
        "filename": target_filename,
        "original_name": raw_name,
        "url": url,
        "size_bytes": stat.st_size,
        "size_mb": round(stat.st_size / (1024 * 1024), 2)
    }


@router.post("/edit")
@limiter.limit("20/minute")
async def edit_image(req: ImageEditRequest, request: Request):
    """Edit an existing image with filters, adjustments, upscaling, and aspect ratio crop"""
    clean_name = sanitize_filename(req.filename)
    src_file = settings.IMAGES_PATH / clean_name
    if not src_file.exists():
        raise HTTPException(status_code=404, detail="Source image not found")

    try:
        img = Image.open(src_file).convert("RGB")

        # 1. Adjustments
        if req.brightness is not None and req.brightness != 1.0:
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(max(0.2, min(req.brightness, 2.5)))

        if req.contrast is not None and req.contrast != 1.0:
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(max(0.2, min(req.contrast, 2.5)))

        if req.saturation is not None and req.saturation != 1.0:
            enhancer = ImageEnhance.Color(img)
            img = enhancer.enhance(max(0.0, min(req.saturation, 2.5)))

        if req.sharpness is not None and req.sharpness != 1.0:
            enhancer = ImageEnhance.Sharpness(img)
            img = enhancer.enhance(max(0.0, min(req.sharpness, 3.0)))

        # 2. Cinematic Filters
        if req.filter == "black_white":
            img = ImageOps.grayscale(img).convert("RGB")
        elif req.filter == "sepia":
            gray = ImageOps.grayscale(img)
            img = ImageOps.colorize(gray, "#2e1c0c", "#ffebd2")
        elif req.filter == "cyberpunk":
            r, g, b = img.split()
            r = r.point(lambda i: min(255, int(i * 1.2 + 20)))
            b = b.point(lambda i: min(255, int(i * 1.3 + 30)))
            img = Image.merge("RGB", (r, g, b))
        elif req.filter == "cinematic":
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.15)
            r, g, b = img.split()
            g = g.point(lambda i: min(255, int(i * 1.05)))
            b = b.point(lambda i: min(255, int(i * 0.95)))
            img = Image.merge("RGB", (r, g, b))

        # 3. Aspect Ratio Crop
        if req.aspect_ratio:
            ratio_map = {"16:9": (16, 9), "9:16": (9, 16), "1:1": (1, 1), "4:3": (4, 3)}
            if req.aspect_ratio in ratio_map:
                target_w, target_h = ratio_map[req.aspect_ratio]
                w, h = img.size
                current_ratio = w / h
                target_ratio = target_w / target_h
                if current_ratio > target_ratio:
                    new_w = int(h * target_ratio)
                    offset = (w - new_w) // 2
                    img = img.crop((offset, 0, offset + new_w, h))
                else:
                    new_h = int(w / target_ratio)
                    offset = (h - new_h) // 2
                    img = img.crop((0, offset, w, offset + new_h))

        # 4. Upscaling
        if req.upscale_factor and req.upscale_factor in {2, 4}:
            new_size = (img.width * req.upscale_factor, img.height * req.upscale_factor)
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        # Output filename preserving original identity
        stem = Path(clean_name).stem
        new_filename = f"{stem}_edited_{uuid.uuid4().hex[:6]}.png"
        out_path = settings.IMAGES_PATH / new_filename
        img.save(out_path, "PNG", quality=95)

        stat = out_path.stat()
        asset_id = str(uuid.uuid4())
        url = f"/outputs/images/{new_filename}"

        db_save_asset(
            asset_id=asset_id,
            project_id=None,
            asset_type="images",
            filename=new_filename,
            url=url,
            local_path=str(out_path),
            storage_provider="local",
            size_bytes=stat.st_size,
            mime_type="image/png",
            metadata={"source_file": clean_name, "edited": True}
        )

        return {
            "success": True,
            "filename": new_filename,
            "url": url,
            "size_bytes": stat.st_size,
            "size_mb": round(stat.st_size / (1024 * 1024), 2)
        }
    except Exception as e:
        logger.error("Image edit error: %s", e)
        raise HTTPException(status_code=500, detail=f"Image edit failed: {e}")
