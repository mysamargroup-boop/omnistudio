"""Rate limiting configuration for OmniStudio AI.

Uses slowapi with in-memory storage (or Redis when configured) to protect sensitive
endpoints (e.g. PIN verification, settings/keys, generative models) from brute-force
and runaway requests.
"""

from slowapi import Limiter
from starlette.requests import Request


def get_real_client_ip(request: Request) -> str:
    """Extract true client IP even behind Cloudflare, Nginx, or Docker internal bridge."""
    # 1. Cloudflare connecting IP
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip and cf_ip.strip():
        return cf_ip.strip()

    # 2. Standard X-Forwarded-For header (first address is client)
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for and x_forwarded_for.strip():
        first_ip = x_forwarded_for.split(",")[0].strip()
        if first_ip:
            return first_ip

    # 3. Standard X-Real-IP header
    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip and x_real_ip.strip():
        return x_real_ip.strip()

    # 4. Fallback to client host
    if request.client and request.client.host:
        return request.client.host

    return "127.0.0.1"


limiter = Limiter(key_func=get_real_client_ip, default_limits=["240/minute"])

