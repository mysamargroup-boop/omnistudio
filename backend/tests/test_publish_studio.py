import pytest
import os
import json
from pathlib import Path
from fastapi.testclient import TestClient

from main import app
from config import settings
from database import init_database

@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch):
    test_token = "publish_test_token_secret_123"
    monkeypatch.setattr(settings, "BACKEND_API_TOKEN", test_token)
    monkeypatch.setattr(settings, "STUDIO_PASSCODE", "7391")
    monkeypatch.setattr(settings, "JWT_SECRET", "test_jwt_secret_key_123456789")
    init_database()
    return test_token

@pytest.fixture
def auth_headers(setup_test_env):
    return {"Authorization": f"Bearer {setup_test_env}"}

def test_publish_list_platforms(auth_headers):
    client = TestClient(app)
    res = client.get("/api/publish/platforms", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "platforms" in data
    assert data["total"] == 15
    platform_ids = [p["id"] for p in data["platforms"]]
    expected = [
        "instagram", "facebook_pages", "facebook_groups", "threads", "twitter",
        "linkedin_personal", "linkedin_company", "tiktok", "youtube_shorts",
        "youtube_videos", "pinterest", "snapchat", "telegram", "whatsapp", "google_business"
    ]
    for exp in expected:
        assert exp in platform_ids

def test_publish_connect_and_list_accounts(auth_headers):
    client = TestClient(app)
    # Connect an Instagram account
    conn_res = client.post("/api/publish/accounts/connect", headers=auth_headers, json={
        "platform": "instagram",
        "account_name": "Samar Creative Studio",
        "username": "@samar_studio"
    })
    assert conn_res.status_code == 200
    account = conn_res.json()["account"]
    assert account["platform"] == "instagram"
    assert account["username"] == "@samar_studio"
    acc_id = account["id"]

    # List accounts
    list_res = client.get("/api/publish/accounts", headers=auth_headers)
    assert list_res.status_code == 200
    accounts = list_res.json()["accounts"]
    assert any(a["id"] == acc_id for a in accounts)

    # Disconnect
    del_res = client.delete(f"/api/publish/accounts/{acc_id}", headers=auth_headers)
    assert del_res.status_code == 200

def test_publish_ai_optimize(auth_headers):
    client = TestClient(app)
    payload = {
        "title": "Luxury Diamond Watch Reveal",
        "content": "Handcrafted with Swiss precision movement and 18K rose gold casing.",
        "platforms": ["instagram", "linkedin_personal", "twitter", "youtube_shorts"],
        "media_type": "video"
    }
    res = client.post("/api/publish/optimize", headers=auth_headers, json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    adapted = data["adapted_platforms"]
    
    # Verify Instagram adaptation
    assert "instagram" in adapted
    assert adapted["instagram"]["platform_name"] == "Instagram"
    assert len(adapted["instagram"]["hashtags"]) > 0
    assert "✨" in adapted["instagram"]["caption"] or "Save" in adapted["instagram"]["caption"]

    # Verify LinkedIn adaptation
    assert "linkedin_personal" in adapted
    assert "craftsmanship" in adapted["linkedin_personal"]["caption"].lower() or "lessons" in adapted["linkedin_personal"]["caption"].lower()

    # Verify Twitter adaptation
    assert "twitter" in adapted
    assert adapted["twitter"]["character_count"] <= 280

    # Verify YouTube Shorts adaptation
    assert "youtube_shorts" in adapted
    assert adapted["youtube_shorts"]["character_count"] <= 100

def test_publish_ai_thumbnail_generator(auth_headers):
    client = TestClient(app)
    payload = {
        "title": "How to Automate Creative Media",
        "platform_format": "youtube_16_9",
        "category_badge": "TUTORIAL",
        "accent_color": "#6366F1"
    }
    res = client.post("/api/publish/thumbnails", headers=auth_headers, json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "thumbnail_url" in data
    assert data["thumbnail_url"].startswith("/outputs/publish/")

def test_publish_content_repurpose(auth_headers):
    client = TestClient(app)
    payload = {
        "title": "Mastering OmniStudio AI",
        "content": "A complete masterclass on next-gen media workflows."
    }
    res = client.post("/api/publish/repurpose", headers=auth_headers, json=payload)
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data["short_clips"]) == 3
    assert len(data["tweet_thread"]) == 5
    assert len(data["linkedin_carousel"]) == 5
    assert "pinterest_pin" in data
    assert len(data["instagram_story"]) == 3

def test_publish_ai_social_manager(auth_headers):
    client = TestClient(app)
    payload = {
        "campaign_goal": "Launch summer sports apparel collection",
        "target_audience": "Fitness enthusiasts",
        "duration_days": 7
    }
    res = client.post("/api/publish/ai-manager", headers=auth_headers, json=payload)
    assert res.status_code == 200
    camp = res.json()["campaign"]
    assert camp["duration_days"] == 7
    assert len(camp["schedule"]) == 7
    assert camp["schedule"][0]["day_number"] == 1
    assert "recommended_time" in camp["schedule"][0]

def test_publish_creator_mode(auth_headers):
    client = TestClient(app)
    payload = {
        "concept": "Cyberpunk Neon Car Night Drive"
    }
    res = client.post("/api/publish/creator-mode", headers=auth_headers, json=payload)
    assert res.status_code == 200
    kit = res.json()["creator_kit"]
    assert "reel" in kit
    assert "story" in kit
    assert "short" in kit
    assert "carousel" in kit
    assert "post" in kit
    assert "thumbnails" in kit

def test_publish_create_post_workflow_and_recycle(auth_headers):
    client = TestClient(app)
    # 1. Create a draft post
    post_payload = {
        "title": "Launch Day Announcement",
        "content": "OmniStudio AI 5.0 is officially released.",
        "platforms": ["instagram", "twitter", "linkedin_company"],
        "media_type": "image",
        "status": "draft"
    }
    create_res = client.post("/api/publish/posts", headers=auth_headers, json=post_payload)
    assert create_res.status_code == 200
    post = create_res.json()["post"]
    post_id = post["id"]
    assert post["status"] == "draft"

    # 2. Publish Now
    pub_res = client.post(f"/api/publish/posts/{post_id}/publish-now", headers=auth_headers)
    assert pub_res.status_code == 200
    updated = pub_res.json()["post"]
    assert updated["status"] == "published"
    assert updated["status_by_platform"]["instagram"] == "published"

    # 3. Auto Recycle
    rec_res = client.post(f"/api/publish/posts/{post_id}/recycle", headers=auth_headers)
    assert rec_res.status_code == 200
    rec_post = rec_res.json()["recycled_post"]
    assert rec_post["is_recycled"] is True
    assert rec_post["status"] == "scheduled"
    assert "[Encore]" in rec_post["title"]

    # 4. Analytics
    ana_res = client.get("/api/publish/analytics", headers=auth_headers)
    assert ana_res.status_code == 200
    ana = ana_res.json()["analytics"]
    assert "views" in ana
    assert "reach" in ana

    # 5. Recommendations & Calendar
    rec_resp = client.get("/api/publish/recommendations", headers=auth_headers)
    assert rec_resp.status_code == 200
    assert "best_posting_times" in rec_resp.json()["recommendations"]

    cal_res = client.get("/api/publish/calendar", headers=auth_headers)
    assert cal_res.status_code == 200
    assert cal_res.json()["total"] >= 2

    # 6. Cleanup
    client.delete(f"/api/publish/posts/{post_id}", headers=auth_headers)
    client.delete(f"/api/publish/posts/{rec_post['id']}", headers=auth_headers)


def test_social_keys_status_and_readiness(auth_headers):
    client = TestClient(app)
    # Test social keys status endpoint
    res = client.get("/api/publish/social-keys/status", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "platforms" in data
    assert "instagram" in data["platforms"]
    assert "twitter" in data["platforms"]
    assert "youtube" in data["platforms"]

    # Test readiness test for twitter
    res_tw = client.post("/api/publish/social-keys/test/twitter", headers=auth_headers)
    assert res_tw.status_code == 200
    tw_data = res_tw.json()
    assert "status" in tw_data
    assert tw_data["platform"] == "twitter"

    # Test unsupported platform
    res_un = client.post("/api/publish/social-keys/test/unknown_platform", headers=auth_headers)
    assert res_un.status_code == 200
    assert res_un.json()["status"] == "unsupported"

