from fastapi import APIRouter, Query, Depends
from typing import Optional
from services.usage_tracker import (
    get_usage_summary,
    get_generation_history,
    get_rate_cards,
    clear_history
)
from auth import require_admin_token

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Usage"])

@router.get("/summary")
async def get_summary_endpoint():
    """Returns aggregated generation statistics, total spend, savings, and breakdown."""
    return get_usage_summary()

@router.get("/history")
async def get_history_endpoint(
    limit: int = Query(50, ge=1, le=500),
    service: Optional[str] = Query(None)
):
    """Returns paginated generation audit log with per-event spend details."""
    records = get_generation_history(limit=limit, service_filter=service)
    return {
        "success": True,
        "total": len(records),
        "records": records
    }

@router.get("/rates")
async def get_rate_cards_endpoint():
    """Returns official provider pricing rate card (Google AI Studio, OpenAI, Replicate, ElevenLabs)."""
    return {
        "success": True,
        "rates": get_rate_cards()
    }

@router.get("/social")
async def get_social_analytics_endpoint():
    """Returns aggregated live social media performance, engagement rate, views, and platform breakdown."""
    try:
        from services.publish_service import get_analytics_summary as get_social_analytics
        data = get_social_analytics()
        return {"success": True, **data}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/instagram/connected")
async def get_connected_instagram_endpoint(account_id: Optional[str] = Query(None)):
    """Returns deep analytics for connected Instagram account (likes, engagements, format reach analysis)."""
    try:
        from services.instagram_analytics_service import get_connected_instagram_details
        return get_connected_instagram_details(account_id=account_id)
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/instagram/search")
async def search_instagram_account_endpoint(
    handle: str = Query(..., description="Instagram handle to search and audit (e.g. @username)"),
    use_graph_api: bool = Query(False, description="Optionally force use of official Instagram Graph API (Business Discovery)")
):
    """Search and analyze any public Instagram account for reach, engagement, top reels, and format breakdown."""
    try:
        from services.instagram_analytics_service import search_public_instagram_account
        return search_public_instagram_account(handle=handle, force_graph_api=use_graph_api)
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/instagram/suggest")
async def suggest_instagram_accounts_endpoint(
    q: str = Query("", description="Search query or partial handle"),
    limit: int = Query(8, ge=1, le=20)
):
    """Returns live creator and brand suggestions as you type (like native Instagram search)."""
    try:
        from services.instagram_analytics_service import suggest_instagram_accounts
        return suggest_instagram_accounts(query=q, limit=limit)
    except Exception as e:
        return {"success": False, "query": q, "suggestions": [], "error": str(e)}

@router.post("/clear", dependencies=[Depends(require_admin_token)])
async def clear_history_endpoint():
    """Clears generation telemetry audit logs. Requires ADMIN_API_TOKEN bearer token."""
    clear_history()
    return {"success": True, "message": "Telemetry logs cleared successfully."}
