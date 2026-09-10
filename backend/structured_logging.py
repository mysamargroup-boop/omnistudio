"""Structured JSON logging configuration with request and correlation ID propagation.

Uses python-json-logger to format log records into structured JSON lines
containing timestamp, level, service, logger name, request_id, correlation_id, and message.
"""

import logging
import sys
from contextvars import ContextVar
from typing import Optional
try:
    from pythonjsonlogger.json import JsonFormatter
except ImportError:
    from pythonjsonlogger.jsonlogger import JsonFormatter

# Context variables for tracing request execution across async tasks
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")
correlation_id_ctx: ContextVar[str] = ContextVar("correlation_id", default="")


def get_request_id() -> str:
    """Return the current request ID from context, or empty string."""
    return request_id_ctx.get()


def set_request_id(request_id: str):
    """Set the current request ID in context."""
    return request_id_ctx.set(request_id)


def get_correlation_id() -> str:
    """Return current correlation ID, falling back to request ID if unset."""
    corr_id = correlation_id_ctx.get()
    return corr_id if corr_id else get_request_id()


def set_correlation_id(correlation_id: str):
    """Set current correlation ID in context."""
    return correlation_id_ctx.set(correlation_id)


class ContextFilter(logging.Filter):
    """Log filter that automatically injects request_id, correlation_id, and service tags into every LogRecord."""

    def __init__(self, service_name: str = "omnistudio-api"):
        super().__init__()
        self.service_name = service_name

    def filter(self, record: logging.LogRecord) -> bool:
        record.service = getattr(record, "service", self.service_name)
        record.request_id = getattr(record, "request_id", None) or get_request_id() or "-"
        record.correlation_id = getattr(record, "correlation_id", None) or get_correlation_id() or "-"
        return True


def setup_structured_logging(
    level: str = "INFO",
    service_name: str = "omnistudio-api",
    stream=sys.stdout
) -> logging.Logger:
    """Configure the root logger with structured JSON formatting and context filtering."""
    root_logger = logging.getLogger()
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    root_logger.setLevel(numeric_level)

    # Clear existing handlers to avoid duplicate log entries
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(stream)
    formatter = JsonFormatter(
        "%(asctime)s %(levelname)s %(service)s %(request_id)s %(correlation_id)s %(name)s %(message)s",
        rename_fields={"asctime": "timestamp", "levelname": "level"},
    )
    handler.setFormatter(formatter)
    handler.addFilter(ContextFilter(service_name=service_name))
    root_logger.addHandler(handler)

    # Ensure uvicorn logs propagate or are properly formatted
    for uvicorn_logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        u_log = logging.getLogger(uvicorn_logger_name)
        u_log.handlers = []
        u_log.propagate = True

    return root_logger
