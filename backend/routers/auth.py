import hmac
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class PinVerifyRequest(BaseModel):
    pin: str

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("PIN cannot be empty")
        if len(clean) > 32:
            raise ValueError("PIN is too long")
        return clean

@router.post("/verify-pin")
async def verify_pin(req: PinVerifyRequest):
    """
    Validate Studio Passcode on the backend server.
    Uses constant-time comparison to prevent timing side-channel attacks.
    """
    expected = (settings.STUDIO_PASSCODE or "").strip()
    if not expected:
        # If no passcode is set on server, allow or reject based on security policy
        raise HTTPException(
            status_code=500,
            detail="Studio Passcode is not configured on the backend server"
        )
    
    # Constant-time comparison
    if hmac.compare_digest(req.pin.encode("utf-8"), expected.encode("utf-8")):
        return {
            "success": True,
            "token": expected,
            "message": "Passcode approved"
        }
    
    raise HTTPException(
        status_code=401,
        detail="Invalid Studio Passcode. Access denied."
    )
