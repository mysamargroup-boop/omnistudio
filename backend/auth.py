"""Authentication boundary for all non-public API endpoints."""

import hmac
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Header, HTTPException, Query, Request, status
from jose import JWTError, jwt

from config import settings
from security_logger import audit_log


def _unauthorized(request: Request, reason: str) -> HTTPException:
    audit_log("auth.invalid", ip=request.client.host if request.client else "unknown", reason=reason)
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


def _bearer_token(authorization: str | None) -> str | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization[7:].strip()
    return token or None


def create_studio_jwt() -> str:
    """Create the server-issued, short-lived passcode session token."""
    if not settings.JWT_SECRET:
        raise RuntimeError("JWT_SECRET must be configured before enabling PIN authentication")
    now = datetime.now(timezone.utc)
    payload = {"sub": "studio-passcode", "auth_type": "studio_pin", "iat": now,
               "exp": now + timedelta(hours=settings.JWT_EXPIRY_HOURS)}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def _verify_studio_jwt(token: str) -> dict[str, Any] | None:
    if not settings.JWT_SECRET:
        return None
    try:
        claims = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return claims if claims.get("auth_type") == "studio_pin" else None
    except JWTError:
        return None


def _verify_supabase_jwt(token: str) -> dict[str, Any] | None:
    """Validate HS256 Supabase access tokens using the project JWT secret."""
    if not settings.SUPABASE_JWT_SECRET:
        return None
    try:
        claims = jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        if settings.SUPABASE_URL and claims.get("iss") != f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1":
            return None
        return claims if claims.get("sub") else None
    except JWTError:
        return None


async def get_current_user_or_token(
    request: Request,
    authorization: str | None = Header(default=None),
    access_token: str | None = Query(default=None),
) -> dict[str, Any]:
    """Accept only a configured service token, a studio JWT, or a valid Supabase JWT."""
    # ``access_token`` exists solely for browser media elements, which cannot
    # send Authorization headers. API clients should always use the header.
    token = _bearer_token(authorization) or access_token
    if not token:
        raise _unauthorized(request, "missing_bearer_token")
    if settings.BACKEND_API_TOKEN and hmac.compare_digest(token, settings.BACKEND_API_TOKEN):
        return {"auth_type": "service_token", "user_id": None}
    if settings.STUDIO_PASSCODE and hmac.compare_digest(token, settings.STUDIO_PASSCODE):
        return {"auth_type": "studio_pin", "user_id": "studio-passcode"}
    claims = _verify_studio_jwt(token)
    if claims:
        return {"auth_type": "studio_pin", "user_id": claims["sub"]}
    claims = _verify_supabase_jwt(token)
    if claims:
        return {"auth_type": "supabase", "user_id": claims["sub"]}
    raise _unauthorized(request, "invalid_token")


async def require_admin_token(request: Request, authorization: str | None = Header(default=None)) -> None:
    """Require an administrative bearer token, backend token, or valid studio session for settings operations."""
    token = _bearer_token(authorization)
    if not token:
        audit_log("admin.denied", ip=request.client.host if request.client else "unknown", reason="missing_token")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator authorization required")
    
    if settings.ADMIN_API_TOKEN and hmac.compare_digest(token, settings.ADMIN_API_TOKEN):
        return
    if settings.BACKEND_API_TOKEN and hmac.compare_digest(token, settings.BACKEND_API_TOKEN):
        return
    if settings.STUDIO_PASSCODE and hmac.compare_digest(token, settings.STUDIO_PASSCODE):
        return
    claims = _verify_studio_jwt(token)
    if claims and claims.get("auth_type") == "studio_pin":
        return
    claims_sb = _verify_supabase_jwt(token)
    if claims_sb:
        role = (
            claims_sb.get("app_metadata", {}).get("role")
            or claims_sb.get("role")
        )
        if role in ("admin", "service_role", "supabase_admin"):
            return
        audit_log("admin.denied", ip=request.client.host if request.client else "unknown", reason="insufficient_role")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator role required")

    audit_log("admin.denied", ip=request.client.host if request.client else "unknown", reason="invalid_admin_token")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator authorization required")
