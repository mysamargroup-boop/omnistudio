"""
Fernet Encryption Service for OmniStudio AI.
Provides transparent at-rest encryption and decryption for API keys and secrets
stored in SQLite, Supabase database tables, and environment configuration.

Supports transparent backward-compatibility with legacy plaintext secrets.
"""

import os
import logging
from pathlib import Path
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger("omnistudio.encryption")

KEY_FILE = Path(__file__).resolve().parent.parent / ".encryption_key"

SENSITIVE_KEY_PATTERNS = (
    "_KEY", "_TOKEN", "_SECRET", "PASSWORD", "PASSCODE", "DATABASE_URL"
)

_fernet_instance: Optional[Fernet] = None
_cached_key: Optional[bytes] = None


def get_encryption_key() -> bytes:
    """
    Retrieve or generate a 32-byte urlsafe base64 Fernet key.
    Resolution order:
    1. ENCRYPTION_KEY environment variable
    2. backend/.encryption_key local file
    3. Auto-generate key, persist to .encryption_key, and cache in environment
    """
    global _cached_key
    if _cached_key:
        return _cached_key

    # 1. Check environment
    env_key = os.environ.get("ENCRYPTION_KEY", "").strip()
    if env_key:
        try:
            key_bytes = env_key.encode("utf-8")
            Fernet(key_bytes)  # Validate key format
            _cached_key = key_bytes
            return _cached_key
        except Exception as e:
            logger.warning("Invalid ENCRYPTION_KEY in environment: %s. Falling back to key file.", e)

    # 2. Check .encryption_key file
    if KEY_FILE.exists():
        try:
            file_key = KEY_FILE.read_text(encoding="utf-8").strip()
            if file_key:
                key_bytes = file_key.encode("utf-8")
                Fernet(key_bytes)
                _cached_key = key_bytes
                os.environ["ENCRYPTION_KEY"] = file_key
                return _cached_key
        except Exception as e:
            logger.warning("Failed to read existing .encryption_key: %s", e)

    # 3. Generate new Fernet key
    new_key = Fernet.generate_key()
    try:
        KEY_FILE.write_text(new_key.decode("utf-8"), encoding="utf-8")
        try:
            os.chmod(KEY_FILE, 0o600)
        except Exception:
            pass
        logger.info("Generated new at-rest encryption key at %s", KEY_FILE)
    except Exception as e:
        logger.error("Could not write .encryption_key file: %s", e)

    _cached_key = new_key
    os.environ["ENCRYPTION_KEY"] = new_key.decode("utf-8")
    return _cached_key


def get_fernet() -> Fernet:
    """Get or initialize the Fernet cipher instance."""
    global _fernet_instance
    if _fernet_instance is None:
        key = get_encryption_key()
        _fernet_instance = Fernet(key)
    return _fernet_instance


def reset_fernet_instance():
    """Reset cached key and cipher (useful for unit testing)."""
    global _fernet_instance, _cached_key
    _fernet_instance = None
    _cached_key = None


def is_sensitive_key(key_name: str) -> bool:
    """Determine if a setting key holds confidential credential data."""
    if not key_name or not isinstance(key_name, str):
        return False
    upper = key_name.strip().upper()
    return any(p in upper for p in SENSITIVE_KEY_PATTERNS)


def is_encrypted(value: str) -> bool:
    """Check whether a string is a valid Fernet ciphertext for our current key."""
    if not value or not isinstance(value, str):
        return False
    val = value.strip()
    if not val.startswith("gAAAAA"):
        return False
    try:
        f = get_fernet()
        f.decrypt(val.encode("utf-8"))
        return True
    except (InvalidToken, Exception):
        return False


def encrypt_secret(plaintext: Optional[str]) -> str:
    """
    Encrypt a plaintext secret using Fernet.
    If already encrypted under current key or empty, returns input safely.
    """
    if not plaintext or not isinstance(plaintext, str):
        return plaintext or ""
    val = plaintext.strip()
    if not val:
        return ""
    if is_encrypted(val):
        return val
    try:
        f = get_fernet()
        return f.encrypt(val.encode("utf-8")).decode("utf-8")
    except Exception as e:
        logger.error("Failed to encrypt secret: %s", e)
        return val


def decrypt_secret(ciphertext: Optional[str]) -> str:
    """
    Decrypt a secret using Fernet.
    If the value is legacy plaintext or invalid token, returns the original text.
    Zero breakage for existing unencrypted keys.
    """
    if not ciphertext or not isinstance(ciphertext, str):
        return ciphertext or ""
    val = ciphertext.strip()
    if not val:
        return ""
    if not val.startswith("gAAAAA"):
        return val
    try:
        f = get_fernet()
        return f.decrypt(val.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        logger.debug("Token not decryptable with current key; treating as plaintext.")
        return val
    except Exception as e:
        logger.debug("Decryption exception: %s; treating as plaintext.", e)
        return val
