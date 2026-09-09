import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "outputs"
ENV_FILE = BASE_DIR / ".env"

class Settings(BaseSettings):
    OPENAI_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""
    REPLICATE_API_TOKEN: str = ""
    GEMINI_API_KEY: str = ""
    
    # Database (Supabase PostgreSQL / Neon / SQLite fallback)
    DATABASE_URL: str = ""
    SUPABASE_URL: str = "https://lsttnpynhwtpkzfbfntf.supabase.co"
    SUPABASE_ANON_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdHRucHluaHd0cGt6ZmJmbnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NTg3NTgsImV4cCI6MjEwNDQzNDc1OH0.BltQVtk0-IKKKZAVdD6grkiFcT6_ikXUsHr9BHpZUqM"
    
    # Cloud Object Storage (Cloudflare R2 or S3)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""
    R2_PUBLIC_DOMAIN: str = ""
    
    # Paths
    OUTPUTS_PATH: Path = OUTPUT_DIR
    IMAGES_PATH: Path = OUTPUT_DIR / "images"
    VIDEOS_PATH: Path = OUTPUT_DIR / "videos"
    AUDIO_PATH: Path = OUTPUT_DIR / "audio"
    FINAL_PATH: Path = OUTPUT_DIR / "final"
    TRASH_PATH: Path = OUTPUT_DIR / "trash"
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    class Config:
        env_file = str(ENV_FILE)
        extra = "ignore"

settings = Settings()

# Ensure directories exist
for path in [
    settings.IMAGES_PATH,
    settings.VIDEOS_PATH,
    settings.AUDIO_PATH,
    settings.FINAL_PATH,
    settings.TRASH_PATH,
    settings.TRASH_PATH / "images",
    settings.TRASH_PATH / "videos",
    settings.TRASH_PATH / "audio",
    settings.TRASH_PATH / "final",
]:
    path.mkdir(parents=True, exist_ok=True)

def save_api_keys(keys: dict[str, str]):
    """Persist API keys to .env and update current runtime settings"""
    env_content = {}
    if ENV_FILE.exists():
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env_content[k.strip()] = v.strip()
    
    for k, v in keys.items():
        if v is not None:
            env_content[k] = v.strip()
            if hasattr(settings, k):
                setattr(settings, k, v.strip())
                os.environ[k] = v.strip()
                
    with open(ENV_FILE, "w", encoding="utf-8") as f:
        for k, v in env_content.items():
            f.write(f"{k}={v}\n")
            
    return get_key_status()

def get_key_status():
    """Check which keys are configured"""
    return {
        "openai": bool(settings.OPENAI_API_KEY),
        "elevenlabs": bool(settings.ELEVENLABS_API_KEY),
        "replicate": bool(settings.REPLICATE_API_TOKEN),
        "gemini": bool(settings.GEMINI_API_KEY),
        "database": bool(settings.DATABASE_URL),
        "r2_storage": bool(settings.R2_ACCESS_KEY_ID and settings.R2_SECRET_ACCESS_KEY),
        "edge_tts": True,  # Free built-in fallback
        "ffmpeg": True
    }
