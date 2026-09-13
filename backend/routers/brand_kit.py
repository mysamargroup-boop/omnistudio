from fastapi import APIRouter, HTTPException, UploadFile, File, Request, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from pathlib import Path
import uuid
import shutil

from config import settings
from services.brand_kit_service import load_brand_kit, save_brand_kit
from limiter import limiter
import logging

logger = logging.getLogger("omnistudio.brand_kit_router")

router = APIRouter(prefix="/api/brand-kit", tags=["Brand Kit"])


class BrandColors(BaseModel):
    primary: Optional[str] = "#6366f1"
    secondary: Optional[str] = "#ec4899"
    accent: Optional[str] = "#10b981"
    background: Optional[str] = "#0b0c10"


class BrandTypography(BaseModel):
    primary_font: Optional[str] = "Inter"
    heading_style: Optional[str] = "Modern Sans"


class BrandKitPayload(BaseModel):
    brand_name: Optional[str] = "OmniStudio"
    tagline: Optional[str] = "Next-Gen AI Production"
    logo_url: Optional[str] = ""
    colors: Optional[BrandColors] = Field(default_factory=BrandColors)
    typography: Optional[BrandTypography] = Field(default_factory=BrandTypography)
    style_guidelines: Optional[str] = ""
    negative_guidelines: Optional[str] = ""
    brand_voice: Optional[str] = "Luxury & Sophisticated"
    watermark_position: Optional[str] = "bottom_right"
    watermark_opacity: Optional[int] = 80
    apply_to_generation: Optional[bool] = True


@router.get("")
async def get_brand_kit():
    """Retrieve active brand kit profile."""
    kit = load_brand_kit()
    return {"success": True, "brand_kit": kit}


@router.post("")
@limiter.limit("30/minute")
async def update_brand_kit(payload: BrandKitPayload, request: Request):
    """Update active brand kit profile."""
    try:
        data = payload.model_dump()
        updated = save_brand_kit(data)
        return {"success": True, "brand_kit": updated, "message": "Brand Kit saved successfully."}
    except Exception as e:
        logger.error("Error saving brand kit: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-logo")
@limiter.limit("15/minute")
async def upload_brand_logo(file: UploadFile = File(...), request: Request = None):
    """Upload brand logo file and return its URL."""
    allowed_exts = {".png", ".jpg", ".jpeg", ".webp"}
    ext = Path(file.filename or "logo.png").suffix.lower()
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="Only PNG, JPG, or WEBP logos supported")

    content = await file.read()
    from services.security_service import validate_uploaded_media
    validate_uploaded_media(content, file.filename or "logo.png", "image")

    filename = f"logo_{uuid.uuid4().hex[:8]}{ext}"
    brand_dir = settings.OUTPUTS_PATH / "brand_kit"
    brand_dir.mkdir(parents=True, exist_ok=True)
    target_path = brand_dir / filename

    try:
        target_path.write_bytes(content)

        # Also mirror into images dir so standard media serving works everywhere
        img_mirror = settings.IMAGES_PATH / filename
        shutil.copyfile(target_path, img_mirror)

        logo_url = f"/outputs/images/{filename}"

        # Update current brand kit with logo URL
        current = load_brand_kit()
        current["logo_url"] = logo_url
        save_brand_kit(current)

        return {
            "success": True,
            "logo_url": logo_url,
            "filename": filename,
            "message": "Logo uploaded and linked to Brand Kit successfully."
        }
    except Exception as e:
        logger.error("Logo upload failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to save logo: {e}")
