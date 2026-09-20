import logging
import asyncio
import requests
from typing import Dict, Any, Optional
from fastapi import Request

logger = logging.getLogger("omnistudio.geo")

# In-memory cache for IP lookups (ip -> (geo_data, timestamp))
_GEO_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_TTL_SEC = 600  # 10 minutes

def extract_client_ip(request: Request) -> str:
    """Extract real client IP from incoming request, checking reverse proxy headers."""
    # 1. Cloudflare header
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip and cf_ip.strip():
        return cf_ip.strip()

    # 2. Standard X-Forwarded-For header (first IP in comma-separated list)
    x_forwarded = request.headers.get("x-forwarded-for")
    if x_forwarded and x_forwarded.strip():
        parts = [p.strip() for p in x_forwarded.split(",") if p.strip()]
        if parts:
            return parts[0]

    # 3. Nginx / reverse proxy X-Real-IP
    x_real = request.headers.get("x-real-ip")
    if x_real and x_real.strip():
        return x_real.strip()

    # 4. Fallback to client host
    if request.client and request.client.host:
        return request.client.host

    return "127.0.0.1"

def is_private_or_loopback_ip(ip: str) -> bool:
    """Check if an IP address is a local loopback or private network IP."""
    if not ip or ip in ("127.0.0.1", "localhost", "::1", "testclient"):
        return True
    if ip.startswith(("10.", "192.168.", "169.254.")):
        return True
    if ip.startswith("172."):
        parts = ip.split(".")
        if len(parts) >= 2 and parts[1].isdigit():
            sec = int(parts[1])
            if 16 <= sec <= 31:
                return True
    return False

def lookup_ip_geolocation(ip: str) -> Dict[str, Any]:
    """
    Perform geolocation lookup for an IP address.
    If IP is private/loopback, queries current outbound gateway to get the actual location/ISP.
    """
    import time
    now = time.time()

    cache_key = ip.strip()
    if cache_key in _GEO_CACHE:
        cached_entry = _GEO_CACHE[cache_key]
        if now - cached_entry.get("_cached_at", 0) < _CACHE_TTL_SEC:
            return cached_entry

    is_local = is_private_or_loopback_ip(ip)

    # If local, query outbound public IP info by omitting the IP path
    if is_local:
        query_url = "http://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query"
    else:
        query_url = f"http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query"

    try:
        r = requests.get(query_url, timeout=2.5)
        if r.status_code == 200:
            data = r.json()
            if data.get("status") == "success":
                result = {
                    "status": "success",
                    "client_ip": ip,
                    "public_ip": data.get("query", ip),
                    "city": data.get("city", "Unknown City"),
                    "region": data.get("regionName", ""),
                    "country": data.get("country", "Unknown Country"),
                    "country_code": data.get("countryCode", ""),
                    "isp": data.get("isp", "Unknown ISP"),
                    "org": data.get("org", ""),
                    "is_local": is_local,
                    "_cached_at": now
                }
                _GEO_CACHE[cache_key] = result
                return result
    except Exception as e:
        logger.warning("Primary GeoIP lookup error for IP %s: %s", ip, e)

    # Fallback to ipapi.co
    try:
        fb_url = "https://ipapi.co/json/" if is_local else f"https://ipapi.co/{ip}/json/"
        fb_r = requests.get(fb_url, timeout=2.0, headers={"User-Agent": "omnistudio/1.0"})
        if fb_r.status_code == 200:
            fb_data = fb_r.json()
            result = {
                "status": "success",
                "client_ip": ip,
                "public_ip": fb_data.get("ip", ip),
                "city": fb_data.get("city", "Unknown City"),
                "region": fb_data.get("region", ""),
                "country": fb_data.get("country_name", "Unknown Country"),
                "country_code": fb_data.get("country_code", ""),
                "isp": fb_data.get("org", "Unknown ISP"),
                "is_local": is_local,
                "_cached_at": now
            }
            _GEO_CACHE[cache_key] = result
            return result
    except Exception as fbe:
        logger.debug("Fallback GeoIP lookup error: %s", fbe)

    # Default fallback when network lookup is unavailable
    return {
        "status": "fallback",
        "client_ip": ip,
        "public_ip": ip,
        "city": "Studio Local",
        "region": "",
        "country": "Localhost",
        "country_code": "LOC",
        "isp": "Local Network",
        "is_local": is_local,
        "_cached_at": now
    }

def format_telemetry_log(ip: str) -> str:
    """Format a clean, informative telemetry message for pipeline activity logs."""
    geo = lookup_ip_geolocation(ip)
    city = geo.get("city") or "Unknown City"
    region = geo.get("region") or ""
    country = geo.get("country") or "Unknown Country"
    isp = geo.get("isp") or "Unknown ISP"
    public_ip = geo.get("public_ip") or ip

    loc_str = f"{city}, {region}, {country}".replace(", ,", ",").strip(", ")

    if geo.get("is_local"):
        return f"📍 [Telemetry & Geo-Audit] Client: {ip} (Local Studio) | Gateway: {public_ip} ({loc_str}) • ISP: {isp}"
    else:
        return f"📍 [Telemetry & Geo-Audit] Client IP: {ip} ({loc_str}) • ISP: {isp}"
