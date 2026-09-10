"""Request and Correlation ID tracking middleware for FastAPI.

Assigns a unique request ID (UUID4 hex) to every incoming HTTP request (or adopts
an incoming X-Request-ID / X-Correlation-ID header for distributed tracing),
tracks request duration, sets context variables for structured JSON logging,
and attaches X-Request-ID and X-Correlation-ID to all HTTP response headers.
"""

import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from structured_logging import set_request_id, set_correlation_id

logger = logging.getLogger("omnistudio.request")


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware capturing / generating request correlation IDs and logging HTTP metrics."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Check incoming headers or generate new unique IDs
        incoming_req_id = request.headers.get("X-Request-ID") or request.headers.get("x-request-id")
        req_id = incoming_req_id.strip() if incoming_req_id and incoming_req_id.strip() else uuid.uuid4().hex

        incoming_corr_id = request.headers.get("X-Correlation-ID") or request.headers.get("x-correlation-id")
        corr_id = incoming_corr_id.strip() if incoming_corr_id and incoming_corr_id.strip() else req_id

        # Bind to async task context
        token_req = set_request_id(req_id)
        token_corr = set_correlation_id(corr_id)

        # Store in request state for convenient access inside route handlers
        request.state.request_id = req_id
        request.state.correlation_id = corr_id

        start_time = time.perf_counter()
        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # Inject response headers
            response.headers["X-Request-ID"] = req_id
            response.headers["X-Correlation-ID"] = corr_id

            logger.info(
                "HTTP %s %s - %d (%.2fms)",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                }
            )
            return response
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.exception(
                "HTTP %s %s - unhandled exception (%.2fms): %s",
                request.method,
                request.url.path,
                duration_ms,
                exc,
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": duration_ms,
                }
            )
            raise
