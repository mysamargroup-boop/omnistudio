"""
Slowloris and Request Timeout Protection Middleware for OmniStudio AI.
Mitigates Slowloris Denial-of-Service attacks by enforcing strict execution deadlines
on incoming HTTP requests.
"""

import asyncio
import json
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("omnistudio.timeout")

# Custom timeouts per path prefix/route
LONG_TIMEOUT_ROUTES = (
    "/api/video/generate",
    "/api/pipeline/run",
    "/api/pipeline/run-stream",
    "/api/voice/change",
    "/api/video/edit",
)

UPLOAD_TIMEOUT_ROUTES = (
    "/upload",
    "/upload-reference",
    "/upload-keyframe",
    "/upload-source-video",
)

DEFAULT_TIMEOUT_SECONDS = 45.0
LONG_TIMEOUT_SECONDS = 300.0
UPLOAD_TIMEOUT_SECONDS = 120.0


def get_timeout_for_path(path: str) -> float:
    for route in LONG_TIMEOUT_ROUTES:
        if path.startswith(route):
            return LONG_TIMEOUT_SECONDS
    for route in UPLOAD_TIMEOUT_ROUTES:
        if route in path:
            return UPLOAD_TIMEOUT_SECONDS
    return DEFAULT_TIMEOUT_SECONDS


class SlowlorisTimeoutMiddleware(BaseHTTPMiddleware):
    """Enforce timeouts on ASGI request processing to prevent socket starvation."""

    def __init__(self, app, default_timeout: float = DEFAULT_TIMEOUT_SECONDS):
        super().__init__(app)
        self.default_timeout = default_timeout

    async def dispatch(self, request: Request, call_next) -> Response:
        timeout = get_timeout_for_path(request.url.path)
        try:
            return await asyncio.wait_for(call_next(request), timeout=timeout)
        except asyncio.TimeoutError:
            logger.warning(
                "Slowloris/Timeout deadline exceeded (%.1fs) on %s %s from %s",
                timeout,
                request.method,
                request.url.path,
                request.client.host if request.client else "unknown"
            )
            return Response(
                content=json.dumps({
                    "detail": f"Request processing timed out after {int(timeout)} seconds",
                    "error_code": "REQUEST_TIMEOUT",
                }),
                status_code=504,
                media_type="application/json",
            )
