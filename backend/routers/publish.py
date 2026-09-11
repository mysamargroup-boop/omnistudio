from fastapi import APIRouter, HTTPException, Depends, Request, Query, UploadFile, File
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from pathlib import Path
import uuid
import logging
from config import settings
from services.cron_service import cron_scheduler

from services.publish_service import (
    SUPPORTED_PLATFORMS,
    get_platform_by_id,
    adapt_content_for_platform,
    generate_social_thumbnail,
    repurpose_content,
    generate_campaign_plan,
    run_creator_mode,
    db_get_connected_accounts,
    db_connect_account,
    db_disconnect_account,
    db_create_post,
    db_get_post,
    db_list_posts,
    db_publish_now,
    db_approve_post,
    db_delete_post,
    auto_recycle_post,
    get_analytics_summary,
    get_smart_recommendations,
    get_calendar_events,
    db_list_templates,
    db_create_template,
    db_list_workspaces,
    db_create_workspace,
)

logger = logging.getLogger("omnistudio.router.publish")
router = APIRouter(prefix="/api/publish", tags=["Publish Studio"])

# -----------------------------------------------------------------------------
# Request & Response Models
# -----------------------------------------------------------------------------
class ConnectAccountRequest(BaseModel):
    platform: str
    account_name: str
    username: Optional[str] = ""

class OptimizeContentRequest(BaseModel):
    title: str = ""
    content: str
    platforms: List[str]
    media_type: str = "image"

class GenerateThumbnailRequest(BaseModel):
    title: str
    platform_format: str = "youtube_16_9"
    source_image_path: Optional[str] = None
    category_badge: Optional[str] = "AI MASTERCLASS"
    accent_color: Optional[str] = "#10B981"

class RepurposeRequest(BaseModel):
    title: str = ""
    content: str
    media_url: Optional[str] = None

class AIManagerRequest(BaseModel):
    campaign_goal: str
    target_audience: Optional[str] = "Modern Creators & Brands"
    duration_days: Optional[int] = 7

class CreatorModeRequest(BaseModel):
    concept: str
    media_url: Optional[str] = None

class CreatePostRequest(BaseModel):
    title: str
    content: str
    platforms: List[str]
    media_urls: Optional[List[str]] = []
    media_type: Optional[str] = "image"
    thumbnail_url: Optional[str] = ""
    status: Optional[str] = "draft"
    scheduled_at: Optional[str] = None
    ai_adaptation: Optional[Dict[str, Any]] = None
    workspace_id: Optional[str] = "default"
    approval_status: Optional[str] = None

class ApprovePostRequest(BaseModel):
    approved: bool = True

class SaveTemplateRequest(BaseModel):
    name: str
    platforms: List[str]
    caption_template: str
    hashtag_template: Optional[str] = ""


# -----------------------------------------------------------------------------
# Platforms & Connected Accounts
# -----------------------------------------------------------------------------
@router.get("/platforms")
async def list_platforms():
    """Lists all 15 supported social publishing platforms with connection statuses."""
    connected = {a["platform"]: a for a in db_get_connected_accounts()}
    res = []
    for p in SUPPORTED_PLATFORMS:
        plat_data = dict(p)
        acc = connected.get(p["id"])
        plat_data["is_connected"] = bool(acc)
        plat_data["connected_account"] = acc
        res.append(plat_data)
    return {"platforms": res, "total": len(res)}

@router.get("/accounts")
async def get_accounts():
    accounts = db_get_connected_accounts()
    return {"accounts": accounts, "total": len(accounts)}

@router.post("/accounts/connect")
async def connect_account(req: ConnectAccountRequest):
    if not get_platform_by_id(req.platform):
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {req.platform}")
    acc = db_connect_account(req.platform, req.account_name, req.username)
    return {"success": True, "account": acc}

@router.delete("/accounts/{account_id}")
async def disconnect_account(account_id: str):
    ok = db_disconnect_account(account_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"success": True, "message": "Account disconnected"}


# -----------------------------------------------------------------------------
# AI Platform Adaptation Engine
# -----------------------------------------------------------------------------
@router.post("/optimize")
async def optimize_content(req: OptimizeContentRequest):
    """Adapts user content into platform-specific captions, character counts, and hashtags."""
    if not req.platforms:
        raise HTTPException(status_code=400, detail="At least one target platform is required")
    
    results = {}
    for pid in req.platforms:
        try:
            adapted = await adapt_content_for_platform(req.title, req.content, pid, req.media_type)
            results[pid] = adapted
        except Exception as e:
            logger.error("Failed to adapt for %s: %s", pid, e)
            results[pid] = {
                "platform_id": pid,
                "platform_name": pid,
                "caption": req.content,
                "hashtags": [],
                "error": str(e)
            }
            
    return {
        "success": True,
        "title": req.title,
        "original_content": req.content,
        "adapted_platforms": results
    }


# -----------------------------------------------------------------------------
# AI Thumbnail Generator
# -----------------------------------------------------------------------------
@router.post("/thumbnails")
async def create_thumbnail(req: GenerateThumbnailRequest):
    """Generates platform-tailored thumbnails (YouTube 16:9, Pinterest 2:3, LinkedIn, etc.) with text badges."""
    thumb_url = await generate_social_thumbnail(
        title=req.title,
        platform_format=req.platform_format,
        source_image_path=req.source_image_path,
        category_badge=req.category_badge or "AI MASTERCLASS",
        accent_color=req.accent_color or "#6366F1"
    )
    return {
        "success": True,
        "thumbnail_url": thumb_url,
        "format": req.platform_format
    }


# -----------------------------------------------------------------------------
# Content Repurposing Engine
# -----------------------------------------------------------------------------
@router.post("/repurpose")
async def run_repurpose(req: RepurposeRequest):
    """Converts a long video or topic into 3 Short Clips, Tweet thread, LinkedIn Carousel, Pinterest pin, and Story."""
    repurposed = await repurpose_content(req.title, req.content, req.media_url)
    return {"success": True, "data": repurposed}


# -----------------------------------------------------------------------------
# AI Social Media Manager (Agent)
# -----------------------------------------------------------------------------
@router.post("/ai-manager")
async def run_ai_manager(req: AIManagerRequest):
    """Generates an entire multi-day multi-platform campaign schedule from a high-level goal."""
    campaign = await generate_campaign_plan(req.campaign_goal, req.target_audience, req.duration_days or 7)
    return {"success": True, "campaign": campaign}


# -----------------------------------------------------------------------------
# 1-Click Creator Mode
# -----------------------------------------------------------------------------
@router.post("/creator-mode")
async def execute_creator_mode(req: CreatorModeRequest):
    """Generates Reel + Story + Short + Carousel + Post + Captions + Hashtags + Thumbnails in 1 click."""
    kit = await run_creator_mode(req.concept, req.media_url)
    return {"success": True, "creator_kit": kit}


# -----------------------------------------------------------------------------
# Posts: Create, List, Publish, Approve, Recycle
# -----------------------------------------------------------------------------
@router.post("/posts")
async def create_post(req: CreatePostRequest):
    post = db_create_post(
        title=req.title,
        content=req.content,
        platforms=req.platforms,
        media_urls=req.media_urls,
        media_type=req.media_type or "image",
        thumbnail_url=req.thumbnail_url or "",
        status=req.status or "draft",
        scheduled_at=req.scheduled_at,
        ai_adaptation=req.ai_adaptation,
        workspace_id=req.workspace_id or "default",
        approval_status=req.approval_status
    )
    return {"success": True, "post": post}

@router.get("/posts")
async def list_posts(
    status: Optional[str] = Query(None),
    workspace_id: Optional[str] = Query(None),
    platform: Optional[str] = Query(None)
):
    posts = db_list_posts(status, workspace_id, platform)
    return {"posts": posts, "total": len(posts)}

@router.get("/posts/{post_id}")
async def get_single_post(post_id: str):
    post = db_get_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"post": post}

@router.delete("/posts/{post_id}")
async def delete_single_post(post_id: str):
    ok = db_delete_post(post_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"success": True, "message": "Post deleted"}

@router.post("/posts/{post_id}/publish-now")
async def publish_post_now(post_id: str):
    try:
        updated = db_publish_now(post_id)
        return {"success": True, "post": updated, "message": f"Published to {len(updated['platforms'])} platforms successfully!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/posts/{post_id}/approve")
async def approve_single_post(post_id: str, req: ApprovePostRequest):
    updated = db_approve_post(post_id, req.approved)
    return {"success": True, "post": updated}

@router.post("/posts/{post_id}/recycle")
async def recycle_single_post(post_id: str):
    """Auto Content Recycling: Duplicates a top post with fresh AI hooks and re-schedules."""
    try:
        new_post = await auto_recycle_post(post_id)
        return {"success": True, "recycled_post": new_post, "message": "Content recycled with fresh AI hooks and scheduled for next week!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# -----------------------------------------------------------------------------
# Calendar, Analytics & Recommendations
# -----------------------------------------------------------------------------
@router.get("/calendar")
async def get_calendar():
    events = get_calendar_events()
    return {"events": events, "total": len(events)}

@router.get("/analytics")
async def get_analytics():
    summary = get_analytics_summary()
    return {"analytics": summary}

@router.get("/recommendations")
async def get_recommendations():
    recs = get_smart_recommendations()
    return {"recommendations": recs}


# -----------------------------------------------------------------------------
# Templates & Workspaces
# -----------------------------------------------------------------------------
@router.get("/templates")
async def list_templates():
    templates = db_list_templates()
    return {"templates": templates}

@router.post("/templates")
async def save_template(req: SaveTemplateRequest):
    tmpl = db_create_template(req.name, req.platforms, req.caption_template, req.hashtag_template)
    return {"success": True, "template": tmpl}

class CreateWorkspaceRequest(BaseModel):
    name: str
    client_name: Optional[str] = ""
    approval_required: Optional[bool] = False

@router.get("/workspaces")
async def list_workspaces():
    workspaces = db_list_workspaces()
    return {"workspaces": workspaces}

@router.post("/workspaces")
async def create_workspace_endpoint(req: CreateWorkspaceRequest):
    ws = db_create_workspace(req.name, req.client_name or "", req.approval_required or False)
    return {"success": True, "workspace": ws}

# -----------------------------------------------------------------------------
# Media Upload for Publish Studio
# -----------------------------------------------------------------------------
@router.post("/upload-media")
async def upload_publish_media(file: UploadFile = File(...)):
    """Upload a video or image file for publishing."""
    filename = file.filename or "media_upload"
    ext = Path(filename).suffix.lower()
    
    is_video = ext in [".mp4", ".mov", ".webm", ".avi", ".mkv"]
    is_image = ext in [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"]
    
    if not is_video and not is_image:
        is_image = True
        ext = ".png"

    media_type = "video" if is_video else "image"
    safe_name = f"pub_{uuid.uuid4().hex[:8]}{ext}"
    
    if is_video:
        target_path = settings.VIDEOS_PATH / safe_name
        rel_url = f"/outputs/videos/{safe_name}"
    else:
        target_path = settings.IMAGES_PATH / safe_name
        rel_url = f"/outputs/images/{safe_name}"

    content = await file.read()
    with open(target_path, "wb") as f:
        f.write(content)

    return {
        "success": True,
        "filename": safe_name,
        "url": rel_url,
        "media_type": media_type,
        "size": len(content)
    }

# -----------------------------------------------------------------------------
# Cron Scheduler Endpoints
# -----------------------------------------------------------------------------
@router.get("/cron/status")
async def get_cron_scheduler_status():
    """Returns the live status of the background auto-publish scheduler."""
    return cron_scheduler.get_status()

@router.post("/cron/run")
async def run_cron_scheduler_now():
    """Manually triggers execution of all due scheduled posts immediately."""
    executed = cron_scheduler.run_due_posts()
    return {
        "success": True,
        "executed_count": len(executed),
        "executed_posts": executed,
        "message": f"Processed {len(executed)} due scheduled posts."
    }

# -----------------------------------------------------------------------------
# Social Media BYOK API Status & Readiness Endpoints
# -----------------------------------------------------------------------------
@router.get("/social-keys/status")
async def get_social_keys_status():
    """Returns the configuration readiness of all supported social media networks."""
    from services.social_api_client import get_platform_key_details
    details = get_platform_key_details()
    return {
        "success": True,
        "platforms": details,
        "total_configured": sum(1 for p in details.values() if p["ready"]),
        "total_supported": len(details)
    }

@router.post("/social-keys/test/{platform}")
async def test_social_platform_api(platform: str):
    """Verifies whether required API keys are configured and ready for the platform."""
    from services.social_api_client import test_platform_readiness
    result = test_platform_readiness(platform)
    return result


