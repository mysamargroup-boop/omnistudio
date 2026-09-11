import pytest
from pathlib import Path
from PIL import Image
from fastapi.testclient import TestClient
from config import settings
import main

test_token = settings.BACKEND_API_TOKEN or settings.STUDIO_PASSCODE or "test_secret_token"
settings.BACKEND_API_TOKEN = test_token
client = TestClient(main.app)
AUTH_HEADERS = {"Authorization": f"Bearer {test_token}"}


@pytest.fixture(scope="module")
def sample_image():
    """Creates a sample test PNG image in settings.IMAGES_PATH"""
    img_path = settings.IMAGES_PATH / "test_unit_sample.png"
    img = Image.new("RGB", (200, 200), color=(120, 180, 240))
    img.save(img_path, format="PNG")
    yield img_path
    img_path.unlink(missing_ok=True)


def test_brand_kit_get():
    res = client.get("/api/brand-kit", headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "brand_kit" in data
    assert "brand_name" in data["brand_kit"]
    assert "colors" in data["brand_kit"]


def test_brand_kit_update():
    payload = {
        "brand_name": "Test Studio Enterprise",
        "tagline": "AI Powered Cinema",
        "colors": {
            "primary": "#ff0055",
            "secondary": "#00ffff",
            "accent": "#ffff00",
            "background": "#000000"
        },
        "typography": {
            "primary_font": "Inter",
            "heading_style": "Modern Sans"
        },
        "style_guidelines": "High-contrast commercial lighting",
        "negative_guidelines": "blurry, low quality",
        "apply_to_generation": True
    }
    res = client.post("/api/brand-kit", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["brand_kit"]["brand_name"] == "Test Studio Enterprise"
    assert data["brand_kit"]["colors"]["primary"] == "#ff0055"


def test_ai_remove_background(sample_image):
    res = client.post(
        "/api/image/remove-background",
        json={"image_path": f"/outputs/images/{sample_image.name}"},
        headers=AUTH_HEADERS
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "filename" in data
    out_file = settings.IMAGES_PATH / data["filename"]
    assert out_file.exists()
    out_file.unlink(missing_ok=True)


def test_ai_relight(sample_image):
    res = client.post(
        "/api/image/relight",
        json={
            "image_path": f"/outputs/images/{sample_image.name}",
            "preset": "golden_hour",
            "intensity": 1.2
        },
        headers=AUTH_HEADERS
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "filename" in data
    out_file = settings.IMAGES_PATH / data["filename"]
    assert out_file.exists()
    out_file.unlink(missing_ok=True)


def test_ai_face_restore(sample_image):
    res = client.post(
        "/api/image/face-restore",
        json={"image_path": f"/outputs/images/{sample_image.name}"},
        headers=AUTH_HEADERS
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "filename" in data
    out_file = settings.IMAGES_PATH / data["filename"]
    assert out_file.exists()
    out_file.unlink(missing_ok=True)


def test_ai_outpaint(sample_image):
    res = client.post(
        "/api/image/outpaint",
        json={
            "image_path": f"/outputs/images/{sample_image.name}",
            "target_aspect": "16:9"
        },
        headers=AUTH_HEADERS
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "filename" in data
    out_file = settings.IMAGES_PATH / data["filename"]
    assert out_file.exists()
    out_file.unlink(missing_ok=True)


def test_analytics_summary_metrics():
    res = client.get("/api/analytics/summary", headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "total_generations" in data
    assert "success_rate" in data
    assert "most_used_models" in data
    assert isinstance(data["most_used_models"], list)
