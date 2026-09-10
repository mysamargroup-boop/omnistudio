from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from typing import Optional
from config import settings, save_api_keys, get_key_status
from services.ffmpeg_service import check_ffmpeg
from database import test_db_connection, init_database, db_save_setting
from services.storage_service import test_r2_connection
from auth import require_admin_token
from security_logger import audit_log
from limiter import limiter

router = APIRouter(prefix="/api/settings", tags=["Settings"])

class KeysUpdateRequest(BaseModel):
    OPENAI_API_KEY: Optional[str] = None
    ELEVENLABS_API_KEY: Optional[str] = None
    REPLICATE_API_TOKEN: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    DATABASE_URL: Optional[str] = None
    R2_ACCOUNT_ID: Optional[str] = None
    R2_ACCESS_KEY_ID: Optional[str] = None
    R2_SECRET_ACCESS_KEY: Optional[str] = None
    R2_BUCKET_NAME: Optional[str] = None
    R2_PUBLIC_DOMAIN: Optional[str] = None

class TestDbRequest(BaseModel):
    database_url: Optional[str] = None

@router.get("/status")
async def get_status():
    ffmpeg_info = check_ffmpeg()
    db_info = test_db_connection()
    r2_info = test_r2_connection()
    return {
        "keys": get_key_status(),
        "ffmpeg": ffmpeg_info,
        "database": db_info,
        "storage": r2_info,
        "outputs_path": str(settings.OUTPUTS_PATH)
    }

@router.post("/keys", dependencies=[Depends(require_admin_token)])
@limiter.limit("10/hour")
async def update_keys(req: KeysUpdateRequest, request: Request):
    from database import db_save_setting, load_settings_into_runtime, init_database
    keys = {k: v.strip() for k, v in req.model_dump().items() if v is not None}
    result = save_api_keys(keys)
    audit_log("keys.updated", keys=sorted(keys))
    # Save settings to Supabase database
    for k, v in keys.items():
        try:
            db_save_setting(k, v)
        except Exception:
            pass
    load_settings_into_runtime()
    # If database url updated, try re-initializing
    if "DATABASE_URL" in keys:
        try:
            init_database()
        except:
            pass
    return {"success": True, "keys": result}

@router.get("/keys")
async def get_keys():
    from database import load_settings_into_runtime, db_get_all_settings, is_supabase
    import os
    load_settings_into_runtime()
    db_keys = db_get_all_settings()

    KEY_NAMES = [
        "OPENAI_API_KEY", "ELEVENLABS_API_KEY", "REPLICATE_API_TOKEN", "GEMINI_API_KEY",
        "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_DOMAIN", "DATABASE_URL"
    ]

    masked = {}
    keys_detail = {}

    for k in KEY_NAMES:
        supabase_val = db_keys.get(k)
        env_val = os.environ.get(k) or getattr(settings, k, "")

        if supabase_val and isinstance(supabase_val, str) and supabase_val.strip():
            val = supabase_val.strip()
            source = "Supabase Database"
        elif env_val and isinstance(env_val, str) and env_val.strip():
            val = env_val.strip()
            source = "Local VPS .env (Fallback)"
        else:
            val = ""
            source = "Not Configured"

        if val:
            if len(val) > 8:
                masked[k] = val[:4] + "••••••••" + val[-4:]
            else:
                masked[k] = "••••••••"
        else:
            masked[k] = ""

        keys_detail[k] = {
            "value": "",
            "masked": masked[k],
            "source": source,
            "configured": bool(val)
        }

    return {
        "keys": get_key_status(),
        "masked_keys": masked,
        "keys_detail": keys_detail,
        "source": "Supabase Cloud Database" if is_supabase() else "Local SQLite & VPS .env"
    }

@router.post("/test-db", dependencies=[Depends(require_admin_token)])
async def test_database(req: TestDbRequest):
    return test_db_connection(req.database_url)

@router.post("/test-r2", dependencies=[Depends(require_admin_token)])
async def test_storage():
    return test_r2_connection()
