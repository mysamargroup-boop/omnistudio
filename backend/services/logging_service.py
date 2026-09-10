"""
Structured Observability Service for OmniStudio AI.
Provides JSON logging using python-json-logger and Request ID correlation middleware
across all incoming HTTP requests and background services.
"""

import time
import uuid
import logging
import contextvars
from typing import Optional
try:
    from pythonjsonlogger.json import JsonFormatter
except ImportError:
    from pythonjsonlogger.jsonlogger import JsonFormatter
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="")
client_ip_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("client_ip", default="")

logger = logging.getLogger("omnistudio.access")


class StructuredJsonFormatter(JsonFormatter):
    """
    Custom JSON log formatter that standardizes fields and attaches
    the ambient request_id from contextvars.
    """
    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)
        
        # Standardized ISO UTC timestamp
        log_record["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created))
        log_record["level"] = record.levelname
        log_record["logger"] = record.name

        # Ambient context correlation
        req_id = request_id_ctx.get("")
        if req_id and "request_id" not in log_record:
            log_record["request_id"] = req_id

        client_ip = client_ip_ctx.get("")
        if client_ip and "client_ip" not in log_record:
            log_record["client_ip"] = client_ip


def setup_json_logging(level: str = "INFO", app_name: str = "omnistudio"):
    """Configure root and app loggers with StructuredJsonFormatter."""
    root_logger = logging.getLogger()
    log_level = getattr(logging, level.upper(), logging.INFO)
    root_logger.setLevel(log_level)

    formatter = StructuredJsonFormatter(
        "%(timestamp)s %(level)s %(name)s %(message)s"
    )

    # If stream handler already present, update its formatter; else add one
    stream_handler = None
    for h in root_logger.handlers:
        if isinstance(h, logging.StreamHandler):
            stream_handler = h
            break

    if stream_handler is None:
        stream_handler = logging.StreamHandler()
        root_logger.addHandler(stream_handler)

    stream_handler.setFormatter(formatter)

    # Ensure app-level loggers propagate
    app_logger = logging.getLogger(app_name)
    app_logger.setLevel(log_level)
    return root_logger


class RequestCorrelationMiddleware(BaseHTTPMiddleware):
    """
    FastAPI / Starlette middleware that:
    1. Extracts incoming X-Request-ID or generates a new UUID4.
    2. Injects request_id into contextvars for ambient access across log statements.
    3. Adds X-Request-ID to outgoing response headers.
    4. Records execution duration and emits a structured JSON access log.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        incoming_id = request.headers.get("X-Request-ID") or request.headers.get("X-Correlation-ID")
        request_id = incoming_id.strip() if incoming_id and incoming_id.strip() else uuid.uuid4().hex
        
        token_req_id = request_id_ctx.set(request_id)

        # Extract client IP
        forwarded = request.headers.get("X-Forwarded-For")
        client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
        token_ip = client_ip_ctx.set(client_ip)

        start_time = time.perf_counter()
        status_code = 500

        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(
                f"HTTP Request Failed: {request.method} {request.url.path} - {exc}",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": status_code,
                    "duration_ms": duration_ms,
                    "client_ip": client_ip,
                    "request_id": request_id,
                    "error": str(exc),
                },
                exc_info=True
            )
            raise
        finally:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            # Skip noise on static health checks or serve logs cleanly
            logger.info(
                f"{request.method} {request.url.path} {status_code} ({duration_ms}ms)",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": status_code,
                    "duration_ms": duration_ms,
                    "client_ip": client_ip,
                    "request_id": request_id,
                }
            )
            request_id_ctx.reset(token_req_id)
            client_ip_ctx.reset(token_ip)
