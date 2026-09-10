"""Test suite for Request ID, Correlation ID tracking, and Structured JSON logging.

Validates automatic UUID generation, client header preservation, distributed tracing propagation,
and JSON log format compliance.
"""

import json
import logging
import io
from fastapi.testclient import TestClient
import main
from structured_logging import (
    get_request_id,
    set_request_id,
    get_correlation_id,
    set_correlation_id,
    setup_structured_logging,
    ContextFilter,
)


# =====================================================================
# 1. Request ID and Correlation ID HTTP Header Tests
# =====================================================================

def test_response_contains_request_and_correlation_id():
    """All API responses must include X-Request-ID and X-Correlation-ID headers."""
    client = TestClient(main.app)
    res = client.get("/api/health")
    assert res.status_code == 200

    req_id = res.headers.get("x-request-id")
    corr_id = res.headers.get("x-correlation-id")

    assert req_id is not None
    assert corr_id is not None
    assert len(req_id) >= 16
    assert len(corr_id) >= 16


def test_client_provided_request_id_is_preserved():
    """If client sends X-Request-ID, the server must adopt and echo it."""
    client = TestClient(main.app)
    custom_id = "client-trace-id-abc-12345"
    res = client.get("/api/health", headers={"X-Request-ID": custom_id})

    assert res.status_code == 200
    assert res.headers.get("x-request-id") == custom_id


def test_client_provided_correlation_id_is_preserved():
    """If client sends X-Correlation-ID, server must adopt and echo it."""
    client = TestClient(main.app)
    custom_corr = "distributed-trace-999"
    res = client.get("/api/health", headers={"X-Correlation-ID": custom_corr})

    assert res.status_code == 200
    assert res.headers.get("x-correlation-id") == custom_corr


def test_subsequent_requests_generate_unique_ids():
    """Two requests without headers must receive distinct request IDs."""
    client = TestClient(main.app)
    res1 = client.get("/api/health")
    res2 = client.get("/api/health")

    id1 = res1.headers.get("x-request-id")
    id2 = res2.headers.get("x-request-id")

    assert id1 != id2


# =====================================================================
# 2. ContextVar and Structured Logging Tests
# =====================================================================

def test_contextvars_set_and_get():
    """get_request_id and get_correlation_id reflect tokens set in task context."""
    set_request_id("req-ctx-001")
    set_correlation_id("corr-ctx-002")

    assert get_request_id() == "req-ctx-001"
    assert get_correlation_id() == "corr-ctx-002"


def test_correlation_id_falls_back_to_request_id_when_unset():
    """get_correlation_id falls back to request_id if correlation_id is empty."""
    set_request_id("fallback-req-id")
    set_correlation_id("")

    assert get_correlation_id() == "fallback-req-id"


def test_structured_json_logger_outputs_valid_json_with_context():
    """setup_structured_logging outputs valid parseable JSON lines with required fields."""
    log_capture = io.StringIO()
    logger = setup_structured_logging(level="INFO", service_name="test-omnistudio", stream=log_capture)

    set_request_id("json-test-req-777")
    set_correlation_id("json-test-corr-888")

    test_msg = "User generated creative video scene"
    test_logger = logging.getLogger("test_suite_logger")
    test_logger.info(test_msg)

    output = log_capture.getvalue().strip()
    assert output, "Log output should not be empty"

    # Find the line containing our test message
    target_line = None
    for line in output.splitlines():
        if test_msg in line:
            target_line = line
            break

    assert target_line is not None, f"Could not find log line with test message in: {output}"
    log_data = json.loads(target_line)

    assert log_data["message"] == test_msg
    assert log_data["level"] == "INFO"
    assert log_data["service"] == "test-omnistudio"
    assert log_data["request_id"] == "json-test-req-777"
    assert log_data["correlation_id"] == "json-test-corr-888"
    assert "timestamp" in log_data
