from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from config import settings
from services.ffmpeg_service import check_ffmpeg
from routers import image, video, voice, pipeline, assets, settings as settings_router, analytics

app = FastAPI(
    title="OmniStudio AI",
    description="Advanced Multi-Model AI Creative Studio — Personal Edition",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static outputs for direct file serving
outputs_path = Path(__file__).parent / "outputs"
outputs_path.mkdir(parents=True, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=str(outputs_path)), name="outputs")

# Register all routers
app.include_router(image.router)
app.include_router(video.router)
app.include_router(voice.router)
app.include_router(pipeline.router)
app.include_router(assets.router)
app.include_router(settings_router.router)
app.include_router(analytics.router)

@app.get("/")
async def root():
    return {"name": "OmniStudio AI", "version": "1.0.0", "status": "running"}

@app.get("/api/health")
async def health_check():
    from config import get_key_status
    ffmpeg = check_ffmpeg()
    keys = get_key_status()
    return {
        "status": "healthy",
        "ffmpeg": ffmpeg,
        "keys": keys
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
