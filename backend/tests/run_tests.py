import sys
from pathlib import Path
from fastapi import HTTPException
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import settings
from services.security_service import sanitize_filename, safe_resolve_output_path
import main

passed = 0
failed = 0

def test(name, fn):
    global passed, failed
    try:
        fn()
        print(f"  PASS: {name}")
        passed += 1
    except Exception as e:
        print(f"  FAIL: {name} -> {e}")
        failed += 1

def test_sanitize_filename_traversal():
    result = sanitize_filename("../../../etc/passwd")
    assert ".." not in result, "Traversal '..' found"
    assert "/" not in result, "Slash '/' found"
    assert result == "passwd", f"Expected 'passwd', got '{result}'"

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
    img_path.touch()
    try:
        resolved = safe_resolve_output_path("/outputs/images/test_image.png", must_exist=True)
        assert resolved.exists()
        assert resolved.is_relative_to(settings.OUTPUTS_PATH)
    finally:
        if img_path.exists():
            img_path.unlink()

def test_safe_resolve_output_path_traversal_attack():
    caught = False
    try:
        safe_resolve_output_path("../../etc/passwd")
    except HTTPException as exc:
        caught = True
        assert exc.status_code == 400, f"Expected 400, got {exc.status_code}"
        assert "traversal" in exc.detail.lower()
    assert caught, "Did not catch traversal attack HTTPException"

def test_cors_origins_whitelist():
    origins = settings.get_cors_origins()
    assert isinstance(origins, list)
    assert "*" not in origins, "Wildcard '*' must never be in CORS origins"
    assert "http://localhost:3000" in origins
    assert "http://localhost:3050" in origins
    assert "http://31.97.231.218:3050" in origins

def test_api_security_and_health():
    client = TestClient(main.app)
    
    # 1. Health check must be public without credentials
    health_res = client.get("/api/health")
    assert health_res.status_code == 200, f"Health check failed with {health_res.status_code}"
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
        assert unauth_res.status_code == 401, f"Expected 401 for unauth, got {unauth_res.status_code}"
        
        # Request with invalid key must fail with 401
        bad_key_res = client.get("/api/assets/all", headers={"x-api-key": "wrong_key"})
        assert bad_key_res.status_code == 401, f"Expected 401 for wrong key, got {bad_key_res.status_code}"
        
        # Authorized request with Bearer token must succeed with 200
        bearer_res = client.get("/api/assets/all", headers={"authorization": "Bearer test-secret-key"})
        assert bearer_res.status_code == 200, f"Expected 200 with Bearer, got {bearer_res.status_code}"
        assert "images" in bearer_res.json()
        
    finally:
        settings.STUDIO_PASSCODE = original_passcode
        settings.BACKEND_API_TOKEN = original_api_token
        settings.JWT_SECRET = original_jwt_secret

def test_upload_media_validation():
    from services.security_service import validate_uploaded_media
    # Valid PNG header
    valid_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    validate_uploaded_media(valid_png, "test.png", "image")

    # Invalid image disguised as png
    fake_png = b"This is plain text pretending to be image"
    caught = False
    try:
        validate_uploaded_media(fake_png, "fake.png", "image")
    except HTTPException as e:
        caught = True
        assert e.status_code == 400
    assert caught, "Did not reject fake image magic bytes"

    # Oversized payload
    from services.security_service import MAX_AUDIO_SIZE
    caught_size = False
    try:
        validate_uploaded_media(b"0" * (MAX_AUDIO_SIZE + 1024), "huge.mp3", "audio")
    except HTTPException as e:
        caught_size = True
        assert e.status_code == 413
    assert caught_size, "Did not reject oversized audio payload"

def test_pin_verification_and_jwt():
    client = TestClient(main.app)
    original_passcode = settings.STUDIO_PASSCODE
    original_jwt_secret = settings.JWT_SECRET
    try:
        settings.STUDIO_PASSCODE = "9228"
        settings.JWT_SECRET = "omnistudio_test_jwt_secret_key"

        # Wrong PIN -> 401
        wrong_res = client.post("/api/auth/verify-pin", json={"pin": "0000"})
        assert wrong_res.status_code == 401

        # Correct PIN -> 200 and access_token
        correct_res = client.post("/api/auth/verify-pin", json={"pin": "9228"})
        assert correct_res.status_code == 200
        data = correct_res.json()
        assert "access_token" in data
        token = data["access_token"]

        # Token can now access protected assets
        assets_res = client.get("/api/assets/all", headers={"authorization": f"Bearer {token}"})
        assert assets_res.status_code == 200
    finally:
        settings.STUDIO_PASSCODE = original_passcode
        settings.JWT_SECRET = original_jwt_secret

def test_pydantic_validators():
    from pydantic import ValidationError
    from routers.video import VideoRequest, EditVideoRequest
    from routers.image import ImageRequest

    # 1. Invalid duration (< 1.0)
    caught = False
    try:
        VideoRequest(duration=-10.0)
    except ValidationError:
        caught = True
    assert caught, "Did not reject negative video duration"

    # 2. Invalid FPS (must be 24, 30, or 60)
    caught_fps = False
    try:
        VideoRequest(fps=15)
    except ValidationError:
        caught_fps = True
    assert caught_fps, "Did not reject unsupported FPS"

    # 3. Empty prompt
    caught_prompt = False
    try:
        ImageRequest(prompt="   ")
    except ValidationError:
        caught_prompt = True
    assert caught_prompt, "Did not reject empty prompt"

    # 4. Invalid aspect ratio
    caught_aspect = False
    try:
        ImageRequest(prompt="Valid prompt", aspect_ratio="30:1")
    except ValidationError:
        caught_aspect = True
    assert caught_aspect, "Did not reject absurd aspect ratio"

    # 5. Empty video path in edit request
    caught_path = False
    try:
        EditVideoRequest(video_path="   ")
    except ValidationError:
        caught_path = True
    assert caught_path, "Did not reject empty video path"

def test_rate_limiter_verify_pin():
    client = TestClient(main.app)
    original_passcode = settings.STUDIO_PASSCODE
    original_jwt_secret = settings.JWT_SECRET
    try:
        settings.STUDIO_PASSCODE = "9228"
        settings.JWT_SECRET = "omnistudio_test_jwt_secret_key"

        # Call verify-pin repeatedly up to limit (5/min)
        hit_429 = False
        for _ in range(7):
            res = client.post("/api/auth/verify-pin", json={"pin": "0000"})
            if res.status_code == 429:
                hit_429 = True
                break
        assert hit_429, "Rate limiter did not block excessive PIN attempts with HTTP 429"
    finally:
        settings.STUDIO_PASSCODE = original_passcode
        settings.JWT_SECRET = original_jwt_secret

def test_no_fake_mock_generation():
    client = TestClient(main.app)
    original_passcode = settings.STUDIO_PASSCODE
    original_jwt_secret = settings.JWT_SECRET
    try:
        settings.STUDIO_PASSCODE = "9228"
        settings.JWT_SECRET = "omnistudio_test_jwt_secret_key"
        from auth import create_studio_jwt
        token = create_studio_jwt()

        # Requesting omni_diffusion without local weights must return honest error, not a mock card
        res = client.post(
            "/api/image/generate",
            headers={"authorization": f"Bearer {token}"},
            json={"prompt": "Cyberpunk cityscape", "model": "omni_diffusion", "enhance_prompt": False}
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert not data.get("simulated", False), "Returned simulated fake image card"
        assert data.get("success") is False, "Should return success=False when weights missing"
        assert data.get("error_type") == "LOCAL_MODEL_UNCONFIGURED"
    finally:
        settings.STUDIO_PASSCODE = original_passcode
        settings.JWT_SECRET = original_jwt_secret

if __name__ == "__main__":
    print("Running Security and Hardening Test Suite:")
    test("Sanitize filename: directory traversal prevention", test_sanitize_filename_traversal)
    test("Sanitize filename: Windows path stripping", test_sanitize_filename_windows_path)
    test("Sanitize filename: Null byte stripping", test_sanitize_filename_null_bytes)
    test("Sanitize filename: Normal valid filename preservation", test_sanitize_filename_normal)
    test("Safe resolve output path: Valid outputs path", test_safe_resolve_output_path_valid)
    test("Safe resolve output path: Traversal attack rejection (HTTP 400)", test_safe_resolve_output_path_traversal_attack)
    test("CORS origins whitelist: Strictly explicit, no wildcard", test_cors_origins_whitelist)
    test("API Security: Public healthcheck, 401 unauth, 200 authorized", test_api_security_and_health)
    test("Media upload validation: Magic bytes & payload size limits", test_upload_media_validation)
    test("PIN verification & JWT: verify-pin returns token for protected endpoints", test_pin_verification_and_jwt)
    test("Pydantic strict validators: rejection of negative duration, invalid fps & empty prompts", test_pydantic_validators)
    test("Rate Limiting: verify-pin blocks brute force with HTTP 429", test_rate_limiter_verify_pin)
    test("Realism audit: absence of synthetic mock cards on missing weights/keys", test_no_fake_mock_generation)
    print(f"\nResults: {passed} passed, {failed} failed")
    if failed > 0:
        sys.exit(1)
    sys.exit(0)
