"""
Social Media API Client & BYOK Verification Engine
Provides direct credential status, token validation, and platform configuration helpers for:
- Meta Graph API (Instagram & Facebook Pages)
- X / Twitter API v2
- Google YouTube Data API v3 & Shorts
- LinkedIn Marketing API
- TikTok Content Posting API
- Pinterest API v5
- Telegram Bot Broadcast API
"""

import logging
from typing import Dict, Any, List
from config import settings

logger = logging.getLogger("omnistudio.social_api")

def get_platform_key_details() -> Dict[str, Dict[str, Any]]:
    """Returns the configuration readiness of each social platform based on BYOK credentials."""
    return {
        "instagram": {
            "name": "Instagram Graph API",
            "ready": bool(settings.INSTAGRAM_ACCOUNT_ID and (settings.META_ACCESS_TOKEN or settings.META_APP_ID)),
            "missing": [
                k for k, v in [
                    ("INSTAGRAM_ACCOUNT_ID", settings.INSTAGRAM_ACCOUNT_ID),
                    ("META_ACCESS_TOKEN", settings.META_ACCESS_TOKEN),
                ] if not v
            ],
            "portal": "https://developers.facebook.com/apps/",
            "supports": ["Feed Photo", "Reels Video", "Carousel", "Stories"]
        },
        "facebook_pages": {
            "name": "Facebook Pages API",
            "ready": bool(settings.FACEBOOK_PAGE_ID and (settings.META_ACCESS_TOKEN or settings.META_APP_ID)),
            "missing": [
                k for k, v in [
                    ("FACEBOOK_PAGE_ID", settings.FACEBOOK_PAGE_ID),
                    ("META_ACCESS_TOKEN", settings.META_ACCESS_TOKEN),
                ] if not v
            ],
            "portal": "https://developers.facebook.com/apps/",
            "supports": ["Page Feed", "Facebook Reels", "Stories"]
        },
        "twitter": {
            "name": "X / Twitter API v2",
            "ready": bool(settings.TWITTER_BEARER_TOKEN or (settings.TWITTER_API_KEY and settings.TWITTER_ACCESS_TOKEN)),
            "missing": [
                k for k, v in [
                    ("TWITTER_API_KEY", settings.TWITTER_API_KEY),
                    ("TWITTER_API_SECRET", settings.TWITTER_API_SECRET),
                    ("TWITTER_ACCESS_TOKEN", settings.TWITTER_ACCESS_TOKEN),
                ] if not v
            ] if not settings.TWITTER_BEARER_TOKEN else [],
            "portal": "https://developer.twitter.com/en/portal/dashboard",
            "supports": ["Tweets", "Threads", "Media Uploads"]
        },
        "youtube": {
            "name": "YouTube Data API v3",
            "ready": bool(settings.YOUTUBE_API_KEY or (settings.YOUTUBE_CLIENT_ID and settings.YOUTUBE_REFRESH_TOKEN)),
            "missing": [
                k for k, v in [
                    ("YOUTUBE_CLIENT_ID", settings.YOUTUBE_CLIENT_ID),
                    ("YOUTUBE_CLIENT_SECRET", settings.YOUTUBE_CLIENT_SECRET),
                    ("YOUTUBE_REFRESH_TOKEN", settings.YOUTUBE_REFRESH_TOKEN),
                ] if not v
            ] if not settings.YOUTUBE_API_KEY else [],
            "portal": "https://console.cloud.google.com/apis/credentials",
            "supports": ["YouTube Shorts", "Long-form Video"]
        },
        "linkedin": {
            "name": "LinkedIn Marketing API",
            "ready": bool(settings.LINKEDIN_ACCESS_TOKEN or (settings.LINKEDIN_CLIENT_ID and settings.LINKEDIN_CLIENT_SECRET)),
            "missing": [
                k for k, v in [
                    ("LINKEDIN_CLIENT_ID", settings.LINKEDIN_CLIENT_ID),
                    ("LINKEDIN_CLIENT_SECRET", settings.LINKEDIN_CLIENT_SECRET),
                    ("LINKEDIN_ACCESS_TOKEN", settings.LINKEDIN_ACCESS_TOKEN),
                ] if not v
            ],
            "portal": "https://www.linkedin.com/developers/",
            "supports": ["Articles", "Carousels", "Short Video"]
        },
        "tiktok": {
            "name": "TikTok Content Posting API",
            "ready": bool(settings.TIKTOK_ACCESS_TOKEN or (settings.TIKTOK_CLIENT_KEY and settings.TIKTOK_CLIENT_SECRET)),
            "missing": [
                k for k, v in [
                    ("TIKTOK_CLIENT_KEY", settings.TIKTOK_CLIENT_KEY),
                    ("TIKTOK_CLIENT_SECRET", settings.TIKTOK_CLIENT_SECRET),
                ] if not v
            ] if not settings.TIKTOK_ACCESS_TOKEN else [],
            "portal": "https://developers.tiktok.com/",
            "supports": ["Direct Video Post", "Creator Inbox"]
        },
        "pinterest": {
            "name": "Pinterest API v5",
            "ready": bool(settings.PINTEREST_ACCESS_TOKEN or settings.PINTEREST_APP_ID),
            "missing": [
                k for k, v in [
                    ("PINTEREST_ACCESS_TOKEN", settings.PINTEREST_ACCESS_TOKEN),
                    ("PINTEREST_APP_ID", settings.PINTEREST_APP_ID),
                ] if not v
            ],
            "portal": "https://developers.pinterest.com/apps/",
            "supports": ["Idea Pins", "Board Pins", "Video Pins"]
        },
        "telegram": {
            "name": "Telegram Bot Broadcast API",
            "ready": bool(settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID),
            "missing": [
                k for k, v in [
                    ("TELEGRAM_BOT_TOKEN", settings.TELEGRAM_BOT_TOKEN),
                    ("TELEGRAM_CHAT_ID", settings.TELEGRAM_CHAT_ID),
                ] if not v
            ],
            "portal": "https://t.me/BotFather",
            "supports": ["Channel Post", "Photo/Video Message", "Markdown Captions"]
        },
    }

def test_platform_readiness(platform: str) -> Dict[str, Any]:
    """Test if required credentials for a platform are set up correctly."""
    details = get_platform_key_details()
    target = details.get(platform)
    if not target:
        return {
            "platform": platform,
            "status": "unsupported",
            "message": f"Platform '{platform}' is not in the direct API integration catalog."
        }
    
    if target["ready"]:
        return {
            "platform": platform,
            "status": "ready",
            "name": target["name"],
            "message": "Credentials configured and ready for automated publishing.",
            "portal": target["portal"],
            "supports": target["supports"]
        }
    else:
        return {
            "platform": platform,
            "status": "missing_keys",
            "name": target["name"],
            "message": f"Missing required credentials: {', '.join(target['missing'])}. Add them in Settings -> Social Media APIs.",
            "missing_keys": target["missing"],
            "portal": target["portal"]
        }
