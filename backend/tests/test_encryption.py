"""Test suite for settings database column-level Fernet encryption.

Validates encrypt/decrypt round-trips, idempotency, legacy plaintext compatibility,
tamper resistance, non-ASCII Unicode credentials, and SQLite database persistence.
"""

import pytest
from encryption import encrypt_value, decrypt_value, is_encrypted, get_encryption_key, get_fernet
from database import db_save_setting, db_get_all_settings, get_sqlite_conn


# =====================================================================
# 1. Encryption & Decryption Core Tests
# =====================================================================

def test_encrypt_decrypt_roundtrip():
    """Valid plaintext string encrypts and cleanly decrypts back to original value."""
    secret = "sk-proj-abc123XYZ456_SuperSecretApiKey"
    encrypted = encrypt_value(secret)

    assert encrypted != secret
    assert is_encrypted(encrypted)
    assert encrypted.startswith("gAAAAA")

    decrypted = decrypt_value(encrypted)
    assert decrypted == secret


def test_is_encrypted_identifies_tokens_accurately():
    """is_encrypted correctly returns True for Fernet tokens and False for plaintext."""
    token = encrypt_value("my-secret-token")
    assert is_encrypted(token) is True

    plain_samples = [
        "sk-proj-1234567890",
        "normal_text_value",
        "gAAAAA_short",  # starts with gAAAAA but too short to be a valid token
        "",
        None,
        12345,
    ]
    for sample in plain_samples:
        assert is_encrypted(sample) is False


def test_encryption_idempotent_no_double_encryption():
    """Encrypting an already encrypted token must not double-encrypt."""
    original = "sk-replicate-token-998877"
    enc1 = encrypt_value(original)
    enc2 = encrypt_value(enc1)
    assert enc1 == enc2  # Must remain identical
    assert decrypt_value(enc2) == original


def test_decrypt_legacy_plaintext_passthrough():
    """Unencrypted legacy database rows must pass through decrypt_value untouched."""
    legacy_keys = [
        "sk-ant-api03-legacyKeyVal",
        "postgres://user:pass@host:5432/db",
        "my_plain_passcode",
        "123456",
    ]
    for legacy in legacy_keys:
        assert decrypt_value(legacy) == legacy


def test_empty_and_none_values_handled_gracefully():
    """Empty strings, None, and whitespace strings must not throw exceptions."""
    assert encrypt_value("") == ""
    assert encrypt_value(None) == ""
    assert encrypt_value("   ") == ""

    assert decrypt_value("") == ""
    assert decrypt_value(None) == ""
    assert decrypt_value("   ") == ""


def test_unicode_and_special_character_encryption():
    """Unicode, emojis, and multiline tokens encrypt and decrypt without corruption."""
    complex_token = "🔑 secret: \u20ac500 | 漢字 | \n\t special_chars!@#$%^&*()_+"
    encrypted = encrypt_value(complex_token)
    assert is_encrypted(encrypted)
    assert decrypt_value(encrypted) == complex_token


def test_long_credentials_encryption():
    """Large payload (e.g. 4KB RSA private key / JSON service account) encrypts cleanly."""
    long_secret = "A" * 4096
    encrypted = encrypt_value(long_secret)
    assert is_encrypted(encrypted)
    assert decrypt_value(encrypted) == long_secret


def test_corrupted_token_returns_gracefully():
    """Corrupted token with valid prefix must not crash the application."""
    # Prefix 'gAAAAA' with garbage length > 100
    corrupted = "gAAAAA" + "X" * 120
    # Should safely return the raw corrupted string or log warning, not raise
    result = decrypt_value(corrupted)
    assert result == corrupted


# =====================================================================
# 2. Database Integration Tests
# =====================================================================

def test_db_save_setting_stores_encrypted_in_sqlite():
    """db_save_setting persists encrypted value in SQLite and db_get_all_settings returns decrypted."""
    test_key = "UNIT_TEST_ENCRYPTED_API_KEY"
    raw_secret = "sk-live-super-secret-key-1010"

    try:
        db_save_setting(test_key, raw_secret)

        # Inspect raw row in SQLite
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("SELECT setting_value FROM studio_settings WHERE setting_key = ?", (test_key,))
        row = cur.fetchone()
        conn.close()

        assert row is not None
        stored_raw = row[0]
        # Must be encrypted at rest in the database
        assert is_encrypted(stored_raw)
        assert stored_raw != raw_secret

        # db_get_all_settings should transparently decrypt it
        settings_map = db_get_all_settings()
        assert settings_map.get(test_key) == raw_secret

    finally:
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM studio_settings WHERE setting_key = ?", (test_key,))
        conn.commit()
        conn.close()
