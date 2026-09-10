"""Rate limiting configuration for OmniStudio AI.

Uses slowapi with in-memory storage (or Redis when configured) to protect sensitive
endpoints (e.g. PIN verification, settings/keys, generative models) from brute-force
and runaway requests.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])
