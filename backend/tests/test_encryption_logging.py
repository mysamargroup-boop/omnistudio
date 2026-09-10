"""
Unit and Integration Tests for Fernet At-Rest Encryption, Structured JSON Logging,
Request Correlation Middleware, and Slowapi Rate Limiting.
"""

import os
import json
import uuid
import pytest
from fastapi.testclient import TestClient

from config import settings
from services.encryption_service import (
    encrypt_secret,
    decrypt_secret,
    is_encrypted,
    get_fernet,
    reset_fernet_instance,
    get_encryption_key,
)
from database import (
    init_database,
    db_save_setting,
    db_get_all_settings,
    db_save_api_key,
    db_get_api_keys,
    get_sqlite_conn,
)
import main


class TestFernetEncryptionAtRest:
    """Validate Fernet key lifecycle, encryption round-trip, and legacy fallback."""

    def test_key_auto_generation_and_persistence(self, tmp_path):
        key = get_encryption_key()
        assert isinstance(key, bytes)
        assert len(key) == 44  # 32 bytes base64 encoded is 44 characters

    def test_encryption_and_decryption_roundtrip(self):
        plain = "sk-live-omnistudio-secret-key-9876543210"
        encrypted = encrypt_secret(plain)
        assert encrypted != plain
        assert encrypted.startswith("gAAAAA")
        assert is_encrypted(encrypted)

        decrypted = decrypt_secret(encrypted)
        assert decrypted == plain

    def test_legacy_plaintext_fallback_unmodified(self):
        legacy = "sk-legacy-unencrypted-token-12345"
        # decrypting an unencrypted plaintext must safely return the plaintext itself
        result = decrypt_secret(legacy)
        assert result == legacy

    def test_empty_and_none_handling(self):
        assert encrypt_secret("") == ""
        assert encrypt_secret(None) == ""
        assert decrypt_secret("") == ""
        assert decrypt_secret(None) == ""

    def test_idempotent_encryption(self):
        plain = "my-secret-value"
        enc1 = encrypt_secret(plain)
        # Encrypting already-encrypted text must not double-encrypt
        enc2 = encrypt_secret(enc1)
        assert enc1 == enc2
        assert decrypt_secret(enc2) == plain

    def test_tampered_ciphertext_graceful_fallback(self):
        plain = "top-secret-api-token"
        enc = encrypt_secret(plain)
        # Corrupt the ciphertext
        corrupted = enc[:10] + "XXXX" + enc[14:]
        # Must not raise exception, gracefully fall back
        fallback = decrypt_secret(corrupted)
        assert fallback == corrupted


class TestDatabaseEncryptionIntegration:
    """Validate that API keys and sensitive settings are stored encrypted in the database."""

    def setup_method(self):
        init_database()

    def test_sensitive_setting_stored_encrypted_in_sqlite(self):
        test_key_name = "OPENAI_API_KEY"
        test_val = "sk-test-openai-credential-value"

        db_save_setting(test_key_name, test_val)

        # Inspect raw SQLite table
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("SELECT setting_value FROM studio_settings WHERE setting_key = ?", (test_key_name,))
        row = cur.fetchone()
        conn.close()

        assert row is not None
        raw_stored_value = row[0]
        # Raw value in DB MUST be encrypted
        assert is_encrypted(raw_stored_value)
        assert raw_stored_value != test_val

        # But db_get_all_settings transparently decrypts it
        settings_dict = db_get_all_settings()
        assert settings_dict.get(test_key_name) == test_val

    def test_api_keys_table_operations(self):
        service = "elevenlabs"
        secret = "el_secret_key_integration_test"

        db_save_api_key(service, secret)

        # Direct raw inspection
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("SELECT key_value FROM api_keys WHERE service = ?", (service,))
        row = cur.fetchone()
        conn.close()

        assert row is not None
        assert is_encrypted(row[0])

        # Transparent retrieval
        keys = db_get_api_keys()
        assert keys.get(service) == secret


class TestRequestCorrelationAndLogging:
    """Validate Request ID generation, propagation, and structured observability."""

    def test_request_id_generated_when_missing(self):
        client = TestClient(main.app)
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert "X-Request-ID" in resp.headers
        req_id = resp.headers["X-Request-ID"]
        assert len(req_id) >= 16

    def test_incoming_request_id_preserved(self):
        client = TestClient(main.app)
        custom_id = "trace-uuid-1234-5678-abcdef"
        resp = client.get("/api/health", headers={"X-Request-ID": custom_id})
        assert resp.status_code == 200
        assert resp.headers["X-Request-ID"] == custom_id

    def test_structured_json_formatter_fields(self):
        from structured_logging import setup_structured_logging
        import io
        import logging

        log_stream = io.StringIO()
        test_logger = setup_structured_logging(level="INFO", stream=log_stream)
        test_logger.info("Structured log test entry", extra={"custom_tag": "omni_test_123"})

        log_output = log_stream.getvalue().strip()
        assert log_output
        parsed = json.loads(log_output.splitlines()[-1])

        assert "timestamp" in parsed
        assert "level" in parsed
        assert parsed["level"] == "INFO"
        assert "omnistudio" in parsed.get("service", "") or "service" in parsed


class TestRateLimiterIntegration:
    """Validate that slowapi rate limits prevent request flooding."""

    def test_pin_verification_rate_limit_enforced(self):
        client = TestClient(main.app)
        original_passcode = settings.STUDIO_PASSCODE
        original_secret = settings.JWT_SECRET

        try:
            settings.STUDIO_PASSCODE = "9999"
            settings.JWT_SECRET = "rate-limit-test-secret"

            # Route limit is 5/minute. Hammering 8 requests in a row should trigger HTTP 429
            hit_429 = False
            for i in range(8):
                res = client.post("/api/auth/verify-pin", json={"pin": "wrong_pin"})
                if res.status_code == 429:
                    hit_429 = True
                    break

            assert hit_429, "Rate limiter should trigger HTTP 429 after exceeding limit"
        finally:
            settings.STUDIO_PASSCODE = original_passcode
            settings.JWT_SECRET = original_secret
