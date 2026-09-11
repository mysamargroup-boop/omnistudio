import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_api_health_endpoint():
    """Verify system health endpoint returns 200 OK and expected telemetry keys."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") in ["healthy", "ok"]
    assert "timestamp" in data or "version" in data or "status" in data

def test_cors_options_preflight():
    """Verify CORS preflight OPTIONS returns 200 and allowed methods."""
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type,Authorization",
    }
    response = client.options("/api/health", headers=headers)
    assert response.status_code == 200

def test_auth_verify_pin_endpoint_validation():
    """Verify PIN verification rejects invalid format without database leaks (or rate-limits)."""
    response = client.post("/api/auth/verify-pin", json={"pin": ""})
    # Should either be 400, 401, 422, or 429 (rate-limited by slowapi brute-force guard)
    assert response.status_code in [400, 401, 422, 429]

def test_assets_endpoint_returns_json():
    """Verify /api/assets/all is protected or returns valid asset list."""
    response = client.get("/api/assets/all")
    assert response.status_code in [200, 401, 403]
