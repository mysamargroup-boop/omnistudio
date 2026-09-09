from fastapi import APIRouter, Query
from typing import Optional
from services.usage_tracker import (
    get_usage_summary,
    get_generation_history,
    get_rate_cards,
    clear_history
)

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

@router.post("/clear")
async def clear_history_endpoint():
    """Clears generation telemetry audit logs."""
    clear_history()
    return {"success": True, "message": "Telemetry logs cleared successfully."}
