from fastapi import APIRouter, HTTPException, UploadFile, File, Request, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from pathlib import Path
import uuid
import shutil
import logging

from config import settings
from services.brand_kit_service import (
    load_brand_kit,
    load_all_brands,
    save_brand_kit,
    create_brand_profile,
    switch_active_brand,
    delete_brand_profile,
    set_brand_logo
)
from limiter import limiter

logger = logging.getLogger("omnistudio.brand_kit_router")

router = APIRouter(prefix="/api/brand-kit", tags=["Brand Kit"])


class BrandColors(BaseModel):
    primary: Optional[str] = "#10b981"
    secondary: Optional[str] = "#71717a"
    accent: Optional[str] = "#06b6d4"
    background: Optional[str] = "#09090b"


class BrandTypography(BaseModel):
    primary_font: Optional[str] = "Inter"
    heading_style: Optional[str] = "Modern Sans"


class BrandLogos(BaseModel):
    primary: Optional[str] = ""
    dark: Optional[str] = ""
    icon: Optional[str] = ""


class BrandKitPayload(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = "OmniStudio Master"
    brand_name: Optional[str] = None
    tagline: Optional[str] = "Next-Gen AI Production"
    logo_url: Optional[str] = ""
    logos: Optional[BrandLogos] = Field(default_factory=BrandLogos)
    colors: Optional[BrandColors] = Field(default_factory=BrandColors)
    typography: Optional[BrandTypography] = Field(default_factory=BrandTypography)
    style_guidelines: Optional[str] = ""
    negative_guidelines: Optional[str] = ""
    brand_voice: Optional[str] = "Luxury & Sophisticated"
    watermark_position: Optional[str] = "bottom_right"
    watermark_opacity: Optional[int] = 80
    apply_to_generation: Optional[bool] = True


class SwitchBrandRequest(BaseModel):
    brand_id: str


class CreateBrandRequest(BaseModel):
    name: str
    tagline: Optional[str] = ""
    template: Optional[str] = None


@router.get("")
async def get_brand_kit():
    """Retrieve active brand kit profile and list of all brand profiles from the database."""
    full_state = load_all_brands()
    return {
        "success": True,
        "brand_kit": full_state["active_brand"],
        "active_brand_id": full_state["active_brand_id"],
        "all_brands": full_state["brands"]
    }


@router.post("")
@limiter.limit("30/minute")
async def update_brand_kit(payload: BrandKitPayload, request: Request):
    """Save or update a brand profile in the database."""
    try:
        data = payload.model_dump(exclude_unset=True)
        if "brand_name" in data and not data.get("name"):
            data["name"] = data["brand_name"]
        updated = save_brand_kit(data, brand_id=payload.id)
        full_state = load_all_brands()
        return {
            "success": True,
            "brand_kit": updated,
            "all_brands": full_state["brands"],
            "message": "Brand Kit saved to database successfully."
        }
    except Exception as e:
        logger.error("Error saving brand kit to database: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/switch")
@limiter.limit("30/minute")
async def switch_brand(req: SwitchBrandRequest, request: Request):
    """Switch the active brand profile in the database."""
    try:
        full_state = switch_active_brand(req.brand_id)
        return {
            "success": True,
            "active_brand_id": full_state["active_brand_id"],
            "brand_kit": full_state["active_brand"],
            "all_brands": full_state["brands"],
            "message": f"Switched active brand to '{full_state['active_brand'].get('name')}'"
        }
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create")
@limiter.limit("20/minute")
async def create_brand(req: CreateBrandRequest, request: Request):
    """Create a new brand profile in the database."""
    try:
        new_brand = create_brand_profile(name=req.name, tagline=req.tagline or "")
        full_state = load_all_brands()
        return {
            "success": True,
            "brand": new_brand,
            "all_brands": full_state["brands"],
            "active_brand_id": full_state["active_brand_id"],
            "message": f"Brand '{new_brand['name']}' created successfully in database."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{brand_id}")
@limiter.limit("20/minute")
async def delete_brand(brand_id: str, request: Request):
    """Delete a brand profile from the database."""
    try:
        full_state = delete_brand_profile(brand_id)
        return {
            "success": True,
            "all_brands": full_state["brands"],
            "active_brand_id": full_state["active_brand_id"],
            "brand_kit": full_state["active_brand"],
            "message": "Brand profile deleted successfully."
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-logo")
@limiter.limit("20/minute")
async def upload_brand_logo(
    file: UploadFile = File(...),
    logo_type: str = Query("primary", description="Logo type: 'primary', 'dark', or 'icon'"),
    brand_id: Optional[str] = Query(None, description="Optional target brand ID"),
    request: Request = None
):
    """Upload brand logo variant (Primary, Dark Mode, or App Icon) and update database."""
    allowed_exts = {".png", ".jpg", ".jpeg", ".webp"}
    clean_type = logo_type.lower() if logo_type.lower() in ("primary", "dark", "icon") else "primary"
    ext = Path(file.filename or "logo.png").suffix.lower()
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="Only PNG, JPG, or WEBP logos supported")

    content = await file.read()
    from services.security_service import validate_uploaded_media
    validate_uploaded_media(content, file.filename or "logo.png", "image")

    filename = f"logo_{clean_type}_{uuid.uuid4().hex[:8]}{ext}"
    brand_dir = settings.OUTPUTS_PATH / "brand_kit"
    brand_dir.mkdir(parents=True, exist_ok=True)
    target_path = brand_dir / filename

    try:
        target_path.write_bytes(content)

        # Mirror to images directory for universal asset delivery
        img_mirror = settings.IMAGES_PATH / filename
        shutil.copyfile(target_path, img_mirror)

        logo_url = f"/outputs/images/{filename}"

        # Update database record
        state = load_all_brands()
        target_bid = brand_id or state["active_brand_id"]
        updated_brand = set_brand_logo(target_bid, clean_type, logo_url)

        return {
            "success": True,
            "logo_url": logo_url,
            "logo_type": clean_type,
            "filename": filename,
            "brand_id": target_bid,
            "brand": updated_brand,
            "message": f"{clean_type.capitalize()} logo uploaded and saved to database successfully."
        }
    except Exception as e:
        logger.error("Logo upload failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to save logo: {e}")
