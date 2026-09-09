from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from config import settings, save_api_keys, get_key_status
from services.ffmpeg_service import check_ffmpeg
from database import test_db_connection, init_database, db_save_setting
from services.storage_service import test_r2_connection

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

@router.post("/keys")
async def update_keys(req: KeysUpdateRequest):
    keys = {k: v.strip() for k, v in req.model_dump().items() if v is not None}
    result = save_api_keys(keys)
    # Dual-write settings to database
    for k, v in keys.items():
        try:
            db_save_setting(k, v)
        except Exception:
            pass
    # If database url updated, try re-initializing
    if "DATABASE_URL" in keys:
        try:
            init_database()
        except:
            pass
    return {"success": True, "keys": result}

@router.get("/keys")
async def get_keys():
    return {"keys": get_key_status()}

@router.post("/test-db")
async def test_database(req: TestDbRequest):
    return test_db_connection(req.database_url)

@router.post("/test-r2")
async def test_storage():
    return test_r2_connection()
