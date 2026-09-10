"""Fernet column-level encryption for sensitive settings at rest in SQLite/Supabase.

Provides transparent encryption and decryption for API keys, tokens, and credentials.
Derives a persistent 256-bit key from settings.ENCRYPTION_KEY or settings.JWT_SECRET
using PBKDF2 with SHA256, with seamless backward compatibility for legacy plaintext records.
"""

import base64
import logging
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from config import settings

logger = logging.getLogger("omnistudio.encryption")

_SALT = b"omnistudio_settings_fernet_v1"
_cached_fernet: Optional[Fernet] = None
_cached_key_seed: Optional[str] = None


def get_encryption_key() -> bytes:
    """Derive a URL-safe base64-encoded 32-byte Fernet key."""
    raw_key = (
        getattr(settings, "ENCRYPTION_KEY", "")
        or getattr(settings, "JWT_SECRET", "")
        or getattr(settings, "STUDIO_PASSCODE", "")
        or "omnistudio_default_master_encryption_key_2026"
    )

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_SALT,
        iterations=100000,
    )
    return base64.urlsafe_b64encode(kdf.derive(raw_key.encode("utf-8")))


def get_fernet() -> Fernet:
    """Return a cached or newly created Fernet instance."""
    global _cached_fernet, _cached_key_seed
    current_seed = getattr(settings, "ENCRYPTION_KEY", "") or getattr(settings, "JWT_SECRET", "") or getattr(settings, "STUDIO_PASSCODE", "")
    if _cached_fernet is None or _cached_key_seed != current_seed:
        key = get_encryption_key()
        _cached_fernet = Fernet(key)
        _cached_key_seed = current_seed
    return _cached_fernet


def is_encrypted(value: Optional[str]) -> bool:
    """Check if a string has the characteristics of a Fernet ciphertext token.
    
    Fernet tokens are URL-safe base64 strings that start with 'gAAAAA' (version 0x80 + 8-byte timestamp).
    """
    if not value or not isinstance(value, str):
        return False
    # Fernet base64 always starts with gAAAAA and has min length 100
    return value.startswith("gAAAAA") and len(value) >= 100


def encrypt_value(value: Optional[str]) -> str:
    """Encrypt a plaintext string using Fernet.

    If the value is empty, not a string, or already encrypted, returns the value as-is.
    """
    if not value or not isinstance(value, str):
        return "" if value is None else value

    value_str = value.strip()
    if not value_str:
        return ""

    if is_encrypted(value_str):
        return value_str

    f = get_fernet()
    token = f.encrypt(value_str.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_value(value: Optional[str]) -> str:
    """Decrypt a Fernet ciphertext string.

    If the value is empty, not a string, or not a Fernet token (e.g. legacy plaintext
    records in existing databases), returns the value as-is for backward compatibility.
    """
    if not value or not isinstance(value, str):
        return "" if value is None else value

    value_str = value.strip()
    if not value_str:
        return ""

    if not is_encrypted(value_str):
        # Legacy unencrypted plaintext record, pass through untouched
        return value_str

    f = get_fernet()
    try:
        decrypted = f.decrypt(value_str.encode("utf-8"))
        return decrypted.decode("utf-8")
    except InvalidToken:
        logger.warning("Failed to decrypt settings token (invalid token or key mismatch). Returning raw value.")
        return value_str
    except Exception as exc:
        logger.error("Unexpected error during settings decryption: %s", exc)
        return value_str
