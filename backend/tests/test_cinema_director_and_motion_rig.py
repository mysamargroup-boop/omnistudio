import pytest
from fastapi.testclient import TestClient
from main import app
from config import settings
from routers.video import ALLOWED_VIDEO_ASPECTS, RESOLUTION_MAP, VideoRequest

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch):
    test_token = "cinema_test_token_secret_123"
    monkeypatch.setattr(settings, "BACKEND_API_TOKEN", test_token)
    monkeypatch.setattr(settings, "STUDIO_PASSCODE", "7391")
    monkeypatch.setattr(settings, "JWT_SECRET", "test_jwt_secret_key_123456789")
    return test_token

@pytest.fixture
def auth_headers(setup_test_env):
    return {"Authorization": f"Bearer {setup_test_env}"}

def test_allowed_video_aspects_includes_anamorphic():
    """Verify that 2.39:1 Anamorphic Scope is supported in ALLOWED_VIDEO_ASPECTS."""
    assert "2.39:1" in ALLOWED_VIDEO_ASPECTS
    assert "16:9" in ALLOWED_VIDEO_ASPECTS
    assert "9:16" in ALLOWED_VIDEO_ASPECTS
    assert "1:1" in ALLOWED_VIDEO_ASPECTS

def test_resolution_map_for_anamorphic():
    """Verify 2.39:1 resolution presets across 720p, 1080p, 2k, and 4k."""
    assert "2.39:1" in RESOLUTION_MAP["720p"]
    assert "2.39:1" in RESOLUTION_MAP["1080p"]
    assert "2.39:1" in RESOLUTION_MAP["2k"]
    assert "2.39:1" in RESOLUTION_MAP["4k"]

    w_720, h_720 = RESOLUTION_MAP["720p"]["2.39:1"]
    assert w_720 == 1720 and h_720 == 720

    w_1080, h_1080 = RESOLUTION_MAP["1080p"]["2.39:1"]
    assert w_1080 == 2580 and h_1080 == 1080

def test_video_request_model_optical_fields():
    """Verify VideoRequest Pydantic model parses and validates cinema motion rig parameters."""
    req = VideoRequest(
        prompt="Cyberpunk rain alley",
        aspect_ratio="2.39:1",
        focal_lens="35mm Anamorphic",
        aperture="T1.4",
        shutter_angle="180°",
        color_lut="Kodak Vision3 5219",
        orbit_x=12.5,
        orbit_y=-5.0,
        push_speed=1.2,
        crane_elevation=2.5,
        dutch_roll=-3.0,
    )
    assert req.aspect_ratio == "2.39:1"
    assert req.focal_lens == "35mm Anamorphic"
    assert req.aperture == "T1.4"
    assert req.orbit_x == 12.5
    assert req.dutch_roll == -3.0

def test_video_request_invalid_aspect_ratio():
    """Verify VideoRequest rejects unsupported aspect ratios."""
    with pytest.raises(Exception):
        VideoRequest(
            prompt="Test scene",
            aspect_ratio="100:1",
        )

def test_video_models_endpoint_response(auth_headers):
    """Verify /api/video/models returns healthy model registry with auth."""
    response = client.get("/api/video/models", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    assert any(m.get("value") == "ffmpeg_local" or m.get("id") == "ffmpeg_local" for m in data["models"])
