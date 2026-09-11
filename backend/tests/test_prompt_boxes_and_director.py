import pytest
from fastapi.testclient import TestClient
from config import settings
import main
from services.prompt_enhancer import enhance_prompt, draft_step_prompts, CINEMATIC_MODIFIERS
from services.director_agent import direct_video_prompt

test_token = settings.BACKEND_API_TOKEN or settings.STUDIO_PASSCODE or "test_secret_token"
settings.BACKEND_API_TOKEN = test_token
client = TestClient(main.app)
AUTH_HEADERS = {"Authorization": f"Bearer {test_token}"}

def test_enhance_prompt_endpoint_valid():
    "payload with prompt and style"
    payload = {
        "prompt": "Cyberpunk detective in rain",
        "style": "more_realistic"
    }
    response = client.post("/api/image/enhance-prompt", json=payload, headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "enhanced" in data
    assert "enhanced_prompt" in data
    assert len(data["enhanced"]) > 10

def test_enhance_prompt_endpoint_enhance_style_key():
    "payload with enhance_style key"
    payload = {
        "prompt": "Majestic golden temple",
        "enhance_style": "more_luxury"
    }
    response = client.post("/api/image/enhance-prompt", json=payload, headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["style"] == "more_luxury"

def test_enhance_prompt_endpoint_empty_prompt():
    "empty prompt gracefully defaults"
    payload = {
        "prompt": "",
        "style": "cinematic"
    }
    response = client.post("/api/image/enhance-prompt", json=payload, headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["enhanced"]) > 0

def test_all_six_prompt_modifiers_in_cinematic_modifiers():
    "verify all 6 modifiers"
    presets = ["more_realistic", "more_cinematic", "more_luxury", "more_fashion", "more_commercial", "more_viral"]
    for preset in presets:
        assert preset in CINEMATIC_MODIFIERS
        assert len(CINEMATIC_MODIFIERS[preset]) > 10

@pytest.mark.asyncio
async def test_enhance_prompt_service_direct():
    res = await enhance_prompt("Cyber samurai", style="more_cinematic")
    assert isinstance(res, str)
    assert len(res) > 20

@pytest.mark.asyncio
async def test_director_agent_service_direct():
    res = await direct_video_prompt(
        idea="Hypercar accelerating on mountain road",
        generation_mode="text_to_video",
        target_video_model="ffmpeg_local",
        style="cinematic",
        aspect_ratio="16:9"
    )
    assert res["success"] is True
    assert "enhanced_prompt" in res
    assert "camera_direction" in res
    assert "negative_prompt" in res
    assert "lighting_directive" in res
    assert "director_notes" in res

def test_director_agent_endpoint():
    payload = {
        "idea": "Drone shot over tropical coastline at sunset",
        "generation_mode": "first_frame",
        "target_video_model": "ffmpeg_local",
        "style": "cinematic",
        "aspect_ratio": "16:9"
    }
    response = client.post("/api/video/director-agent", json=payload, headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "enhanced_prompt" in data
    assert "cinematic_prompt" in data
    assert "camera_direction" in data

def test_pipeline_draft_prompts_endpoint():
    payload = {
        "topic": "Ancient warrior entering futuristic ruins",
        "style": "cinematic"
    }
    response = client.post("/api/pipeline/draft-prompts", json=payload, headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "image_prompt" in data
    assert "motion_prompt" in data
    assert "voice_script" in data
