import hmac

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from fastapi.responses import FileResponse
from path_utils import safe_resolve_output_path

from config import settings
from services.ffmpeg_service import check_ffmpeg
from auth import create_studio_jwt, get_current_user_or_token
from pydantic import BaseModel
from security_logger import audit_log
from routers import image, video, voice, pipeline, assets, settings as settings_router, analytics, brand_kit

from limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from structured_logging import setup_structured_logging
from request_id_middleware import RequestIDMiddleware
from timeout_middleware import SlowlorisTimeoutMiddleware

# Initialize structured JSON logging
setup_structured_logging()

app = FastAPI(
    title="OmniStudio AI",
    description="Advanced Multi-Model AI Creative Studio — Personal Edition",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    from fastapi.openapi.utils import get_openapi
    schema = get_openapi(
        title="OmniStudio AI API",
        version="1.0.0",
        description="OmniStudio AI High-End Generative Studio Engine",
        routes=app.routes,
    )
    schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter your Studio JWT token (obtained via /api/auth/verify-pin)"
        },
        "ApiKeyAuth": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key",
            "description": "Enter your BACKEND_API_TOKEN or ADMIN_API_TOKEN"
        }
    }
    schema["security"] = [{"BearerAuth": []}, {"ApiKeyAuth": []}]
    app.openapi_schema = schema
    return app.openapi_schema

app.openapi = custom_openapi

@app.on_event("startup")
async def on_startup():
    from database import init_database, load_settings_into_runtime
    try:
        init_database()
        load_settings_into_runtime()
    except Exception as e:
        import logging
        logging.getLogger("omnistudio").warning("Startup DB init: %s", e)

# CORS: Origin whitelist + explicit methods + explicit headers (no wildcard)
SAFE_CORS_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
SAFE_CORS_HEADERS = [
    # Browser standard
    "Accept", "Accept-Language", "Content-Language", "Content-Type", "Content-Length",
    "Origin", "Referer", "User-Agent", "DNT",
    # Authentication (OmniStudio)
    "Authorization", "X-API-Key", "X-Requested-With", "X-Idempotency-Key",
    # Correlation & Tracing
    "X-Request-ID", "X-Correlation-ID",
    # Supabase / REST standard
    "apikey", "x-client-info", "Prefer", "Range", "Accept-Profile", "Content-Profile",
    # Media uploads
    "X-File-Size", "X-File-Name", "X-File-Type",
    # Fetch metadata
    "sentry-trace", "baggage",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=SAFE_CORS_METHODS,
    allow_headers=SAFE_CORS_HEADERS,
    expose_headers=["Content-Disposition", "Content-Length", "X-Request-ID", "X-Correlation-ID", "X-RateLimit-Remaining"],
    max_age=3600,  # Cache preflight responses 1 hour (reduces OPTIONS requests)
)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(SlowlorisTimeoutMiddleware)

# Output files are protected too. StaticFiles would bypass FastAPI dependencies.
outputs_path = Path(__file__).parent / "outputs"
outputs_path.mkdir(parents=True, exist_ok=True)

# Public latency & health benchmark routes (no auth required for live ping)
@app.get("/api/settings/ping")
@app.get("/api/ping")
async def ping_benchmark():
    import time
    return {
        "status": "online",
        "timestamp": time.time(),
        "server": "OmniStudio Neural Engine",
        "version": "5.0.0"
    }

# Register all routers with API Key / Passcode validation
api_security = [Depends(get_current_user_or_token)]

app.include_router(image.router, dependencies=api_security)
app.include_router(video.router, dependencies=api_security)
app.include_router(voice.router, dependencies=api_security)
app.include_router(pipeline.router, dependencies=api_security)
app.include_router(assets.router, dependencies=api_security)
app.include_router(settings_router.router, dependencies=api_security)
app.include_router(analytics.router, dependencies=api_security)
app.include_router(brand_kit.router, dependencies=api_security)

try:
    from presentation.api.v2.image_routes import router as image_v2_router
    app.include_router(image_v2_router, dependencies=api_security)
except Exception as e:
    import logging
    logging.getLogger(__name__).error(f"Failed to load v2 routers: {e}")


@app.get("/outputs/trash/{media_type}/{filename:path}", dependencies=api_security)
async def serve_trash_output(media_type: str, filename: str):
    path = safe_resolve_output_path(filename, f"trash/{media_type}", must_exist=True)
    return FileResponse(path, headers={"Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer"})


@app.get("/outputs/{media_type}/{filename:path}", dependencies=api_security)
async def serve_output(media_type: str, filename: str):
    if media_type == "trash":
        raise HTTPException(status_code=400, detail="Use /outputs/trash/<type>/<filename> for trash assets")
    path = safe_resolve_output_path(filename, media_type, must_exist=True)
    return FileResponse(path, headers={"Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer"})

class PinVerificationRequest(BaseModel):
    pin: str


@app.post("/api/auth/verify-pin")
@app.post("/api/auth/login-passcode")
@limiter.limit("5/minute")
async def verify_pin(payload: PinVerificationRequest, request: Request):
    if not settings.STUDIO_PASSCODE or not settings.JWT_SECRET:
        raise HTTPException(status_code=503, detail="PIN authentication is not configured")
    if not hmac.compare_digest(payload.pin.strip(), settings.STUDIO_PASSCODE):
        audit_log("auth.pin_failed", ip=request.client.host if request.client else "unknown")
        raise HTTPException(status_code=401, detail="Invalid passcode")
    return {"access_token": create_studio_jwt(), "token_type": "bearer", "expires_in": settings.JWT_EXPIRY_HOURS * 3600}

@app.get("/api/docs", include_in_schema=False)
async def api_docs_redirect():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")

@app.get("/api/redoc", include_in_schema=False)
async def api_redoc_redirect():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/redoc")

@app.get("/api/openapi.json", include_in_schema=False)
async def api_openapi_proxy():
    return app.openapi()

@app.get("/api/health")
@app.get("/health")
async def health_check():
    ffmpeg = check_ffmpeg()
    return {
        "status": "healthy",
        "ffmpeg": bool(ffmpeg.get("available") if isinstance(ffmpeg, dict) else ffmpeg),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, timeout_keep_alive=15)
