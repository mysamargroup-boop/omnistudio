import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from services import apify_service

logger = logging.getLogger("omnistudio.apify_router")

router = APIRouter(prefix="/api/apify", tags=["apify"])

class RunActorRequest(BaseModel):
    actor_id: str
    input: Optional[Dict[str, Any]] = None

class AiAnalyzeRequest(BaseModel):
    scraped_text: str
    target_style: Optional[str] = "cinematic"

class WebFetchRequest(BaseModel):
    url: str

@router.get("/actors")
async def get_featured_actors():
    """Returns curated Apify actors catalog and token status."""
    token = apify_service.get_apify_token()
    actors = apify_service.list_featured_actors()
    return {
        "success": True,
        "token_configured": bool(token),
        "actors": actors
    }

@router.post("/run")
async def run_actor(payload: RunActorRequest):
    """Executes an Apify actor."""
    try:
        res = await apify_service.run_actor(
            actor_id=payload.actor_id,
            run_input=payload.input or {}
        )
        return res
    except Exception as e:
        logger.error(f"Error running Apify actor: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/runs/{run_id}")
async def get_run_status(run_id: str):
    """Retrieves status for an Apify run."""
    try:
        res = await apify_service.get_run_status(run_id)
        return {"success": True, **res}
    except Exception as e:
        logger.error(f"Error checking run status {run_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/datasets/{dataset_id}")
async def get_dataset_items(dataset_id: str, limit: int = Query(default=25, ge=1, le=100)):
    """Fetches scraped dataset items."""
    try:
        items = await apify_service.get_dataset_items(dataset_id=dataset_id, limit=limit)
        return {
            "success": True,
            "dataset_id": dataset_id,
            "count": len(items),
            "items": items
        }
    except Exception as e:
        logger.error(f"Error fetching dataset {dataset_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-analyze")
async def analyze_with_ai(payload: AiAnalyzeRequest):
    """
    Transforms scraped competitor transcripts or raw web articles into
    ready-to-render multi-shot cinematic video prompts, hooks, and lighting directives.
    No ChatGPT or Claude external tab needed!
    """
    try:
        screenplay = await apify_service.analyze_scraped_data_with_ai(
            scraped_text=payload.scraped_text,
            target_style=payload.target_style or "cinematic"
        )
        return {
            "success": True,
            "screenplay": screenplay
        }
    except Exception as e:
        logger.error(f"Error in AI screenplay synthesis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/web-fetch")
async def web_fetch(payload: WebFetchRequest):
    """Fetches clean text from a web URL for instant screenplay creation."""
    try:
        res = await apify_service.fetch_web_content(payload.url)
        return res
    except Exception as e:
        logger.error(f"Error fetching web content from {payload.url}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class SetTokenRequest(BaseModel):
    token: str

@router.get("/history")
async def get_apify_history(limit: int = Query(default=50, ge=1, le=100)):
    """Retrieves list of past Apify scraping runs."""
    try:
        history = apify_service.get_apify_history(limit=limit)
        return {
            "success": True,
            "count": len(history),
            "history": history
        }
    except Exception as e:
        logger.error(f"Error fetching Apify history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/token")
async def set_apify_token(payload: SetTokenRequest):
    """Saves Apify API Token into studio settings with transparent encryption."""
    import os
    try:
        from database import db_save_setting
        tok = (payload.token or "").strip()
        db_save_setting("apify_api_token", tok)
        os.environ["APIFY_API_TOKEN"] = tok
        return {
            "success": True,
            "message": "Apify token saved successfully",
            "token_configured": bool(tok)
        }
    except Exception as e:
        logger.error(f"Error saving Apify token: {e}")
        raise HTTPException(status_code=500, detail=str(e))
