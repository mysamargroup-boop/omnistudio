import pytest
from pathlib import Path
from fastapi import HTTPException
from fastapi.testclient import TestClient

from config import settings
from services.security_service import sanitize_filename, safe_resolve_output_path
from path_utils import safe_resolve_output_path as resolve_media_path
import main

def test_sanitize_filename_traversal():
    # Attempt directory traversal
    result = sanitize_filename("../../../etc/passwd")
    assert ".." not in result
    assert "/" not in result
    assert result == "passwd"

def test_sanitize_filename_windows_path():
    result = sanitize_filename("C:\\Windows\\System32\\cmd.exe")
    assert "\\" not in result
    assert ":" not in result
    assert result == "cmd.exe"

def test_sanitize_filename_null_bytes():
    result = sanitize_filename("payload\x00malicious.png")
    assert "\x00" not in result
    assert "malicious.png" in result

def test_sanitize_filename_normal():
    result = sanitize_filename("my_awesome_video-1080p.mp4")
    assert result == "my_awesome_video-1080p.mp4"

def test_safe_resolve_output_path_valid():
    img_path = settings.IMAGES_PATH / "test_image.png"
    # Touch file for testing
    img_path.touch()
    try:
        resolved = safe_resolve_output_path("/outputs/images/test_image.png", must_exist=True)
        assert resolved.exists()
        assert resolved.is_relative_to(settings.OUTPUTS_PATH)
    finally:
        if img_path.exists():
            img_path.unlink()

def test_safe_resolve_output_path_traversal_attack():
    with pytest.raises(HTTPException) as excinfo:
        safe_resolve_output_path("../../etc/passwd")
    assert excinfo.value.status_code == 400
    assert "traversal" in excinfo.value.detail.lower()

def test_media_resolver_rejects_absolute_and_cross_directory_paths():
    for attack in ("C:/Windows/System32/cmd.exe", "/etc/passwd", "../videos/secret.mp4"):
        with pytest.raises(HTTPException):
            resolve_media_path(attack, "images")

def test_output_files_require_authentication():
    client = TestClient(main.app)
    original = settings.BACKEND_API_TOKEN
    path = settings.IMAGES_PATH / "protected-test.png"
    try:
        settings.BACKEND_API_TOKEN = "output-test-token"
        path.write_bytes(b"not-a-real-image")
        assert client.get("/outputs/images/protected-test.png").status_code == 401
        response = client.get("/outputs/images/protected-test.png", headers={"Authorization": "Bearer output-test-token"})
        assert response.status_code == 200
    finally:
        settings.BACKEND_API_TOKEN = original
        path.unlink(missing_ok=True)

def test_cors_origins_whitelist():
    origins = settings.get_cors_origins()
    assert isinstance(origins, list)
    assert "*" not in origins
    assert "http://localhost:3000" in origins
    assert "http://localhost:3050" in origins
    assert "http://31.97.231.218:3050" in origins

def test_api_security_and_health():
    client = TestClient(main.app)
    
    # 1. Health check must be public without credentials
    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "healthy"
    
    # 2. Test with authentication key configured
    original_passcode = settings.STUDIO_PASSCODE
    original_api_token = settings.BACKEND_API_TOKEN
    original_jwt_secret = settings.JWT_SECRET
    try:
        settings.STUDIO_PASSCODE = "9228"
        settings.BACKEND_API_TOKEN = "test-secret-key"
        settings.JWT_SECRET = "test-jwt-secret"
        
        # Unauthorized request without key must fail with 401
        unauth_res = client.get("/api/assets/all")
        assert unauth_res.status_code == 401
        
        # Request with invalid key must fail with 401
        bad_key_res = client.get("/api/assets/all", headers={"x-api-key": "wrong_key"})
        assert bad_key_res.status_code == 401
        
        # Authorized request with a service bearer token must succeed with 200
        bearer_res = client.get("/api/assets/all", headers={"authorization": "Bearer test-secret-key"})
        assert bearer_res.status_code == 200
        assert "images" in bearer_res.json()
        
    finally:
        settings.STUDIO_PASSCODE = original_passcode
        settings.BACKEND_API_TOKEN = original_api_token
        settings.JWT_SECRET = original_jwt_secret

if __name__ == "__main__":
    pytest.main(["-v", __file__])
