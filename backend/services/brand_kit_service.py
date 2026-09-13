"""
Brand Kit Service — Enterprise Database Edition
Handles storage, retrieval, and prompt injection for Brand Assets:
- Multi-Brand Profiles (Agency & Client Brands)
- Multi-Logo Variants (Primary Logo, Dark Mode Logo, App Icon / Watermark)
- Color Palettes & Typography
- Brand Aesthetic Rules & Negative Guidelines
- Dual-persistence: Local SQLite + Supabase Cloud PostgREST
"""

import json
import logging
import tempfile
import os
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from config import settings

logger = logging.getLogger("omnistudio.brand_kit")

BRAND_KIT_DIR = settings.OUTPUTS_PATH / "brand_kit"
BRAND_KIT_DIR.mkdir(parents=True, exist_ok=True)
BRAND_KIT_CACHE_FILE = BRAND_KIT_DIR / "brand_kit.json"

DEFAULT_BRAND_ID = "brand_uttar_mitra"

DEFAULT_BRAND_PROFILE: Dict[str, Any] = {
    "id": DEFAULT_BRAND_ID,
    "name": "Uttar Mitra",
    "brand_name": "Uttar Mitra",
    "is_default": True,
    "tagline": "Next-Gen AI Production",
    "logos": {
        "primary": "/outputs/brand_kit/logo_1a6ea689.png",
        "dark": "/outputs/brand_kit/logo_1a6ea689.png",
        "icon": "/outputs/brand_kit/logo_1a6ea689.png"
    },
    "logo_url": "/outputs/brand_kit/logo_1a6ea689.png",
    "colors": {
        "primary": "#10b981",
        "secondary": "#71717a",
        "accent": "#06b6d4",
        "background": "#09090b"
    },
    "typography": {
        "primary_font": "Inter",
        "heading_style": "Modern Sans"
    },
    "style_guidelines": "Linear-inspired dark interface aesthetic, clean edge reflections, subtle emerald luminescence, pristine studio contrast, minimalist precision.",
    "negative_guidelines": "cheap, oversaturated, blurry, low resolution, distorted text, low quality, watermark, typography, logo, magazine cover",
    "brand_voice": "Luxury & Sophisticated",
    "watermark_position": "bottom_right",
    "watermark_opacity": 80,
    "apply_to_generation": False
}

DEFAULT_MULTI_BRAND_STORE: Dict[str, Any] = {
    "active_brand_id": DEFAULT_BRAND_ID,
    "brands": [DEFAULT_BRAND_PROFILE]
}

def _get_db_store() -> Dict[str, Any]:
    """Reads brand kit profiles from database (SQLite / Supabase)."""
    try:
        from database import get_db_cursor
        with get_db_cursor() as cur:
            cur.execute("SELECT setting_value FROM studio_settings WHERE setting_key = 'brand_kit_profiles'")
            row = cur.fetchone()
            if row and row[0]:
                raw = row[0]
                val = json.loads(raw) if isinstance(raw, str) else raw
                if isinstance(val, dict) and "brands" in val:
                    return val
    except Exception as e:
        logger.warning("Could not read brand_kit_profiles from database: %s", e)

    # Fallback to local cache file if DB empty
    if BRAND_KIT_CACHE_FILE.exists():
        try:
            with open(BRAND_KIT_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    if "brands" in data:
                        return data
                    # Migrate legacy single brand format
                    legacy = DEFAULT_BRAND_PROFILE.copy()
                    legacy.update(data)
                    legacy["id"] = DEFAULT_BRAND_ID
                    if "logo_url" in data and not legacy.get("logos", {}).get("primary"):
                        legacy["logos"] = {"primary": data["logo_url"], "dark": "", "icon": ""}
                    store = {"active_brand_id": DEFAULT_BRAND_ID, "brands": [legacy]}
                    _save_db_store(store)
                    return store
        except Exception as e:
            logger.warning("Could not read local brand kit cache: %s", e)

    # Initialize default store
    _save_db_store(DEFAULT_MULTI_BRAND_STORE)
    return DEFAULT_MULTI_BRAND_STORE.copy()

def _save_db_store(store: Dict[str, Any]) -> None:
    """Saves brand kit profiles into database (SQLite & Supabase PostgREST) and writes local cache."""
    # 1. Save to SQLite database
    try:
        from database import get_db_cursor
        json_str = json.dumps(store, ensure_ascii=False)
        with get_db_cursor() as cur:
            cur.execute("""
                INSERT INTO studio_settings (setting_key, setting_value, updated_at)
                VALUES ('brand_kit_profiles', ?, CURRENT_TIMESTAMP)
                ON CONFLICT(setting_key) DO UPDATE SET
                    setting_value = excluded.setting_value,
                    updated_at = CURRENT_TIMESTAMP
            """, (json_str,))
    except Exception as e:
        logger.error("Failed to save brand_kit_profiles to SQLite: %s", e)

    # 2. Dual-write to Supabase Cloud if configured
    try:
        from database import is_supabase, supabase_rest_request
        if is_supabase():
            supabase_rest_request("studio_settings", "POST", {
                "setting_key": "brand_kit_profiles",
                "setting_value": store
            })
    except Exception as e:
        logger.warning("Failed to sync brand_kit_profiles to Supabase: %s", e)

    # 3. Write local file cache
    try:
        with open(BRAND_KIT_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(store, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.warning("Could not update local brand kit file cache: %s", e)

def load_brand_kit(brand_id: Optional[str] = None) -> Dict[str, Any]:
    """Returns active brand profile (backward compatible with existing generation calls)."""
    store = _get_db_store()
    target_id = brand_id or store.get("active_brand_id", DEFAULT_BRAND_ID)
    brands = store.get("brands", [])

    for b in brands:
        if b.get("id") == target_id:
            res = b.copy()
            # Ensure logos dict exists
            if "logos" not in res or not isinstance(res["logos"], dict):
                res["logos"] = {"primary": res.get("logo_url", ""), "dark": "", "icon": ""}
            # Backwards compatibility field
            res["logo_url"] = res["logos"].get("primary", "")
            return res

    # Fallback to first brand or default
    if brands:
        fallback = brands[0].copy()
        fallback["logo_url"] = fallback.get("logos", {}).get("primary", "")
        return fallback

    return DEFAULT_BRAND_PROFILE.copy()

def load_all_brands() -> Dict[str, Any]:
    """Returns full multi-brand state: active_brand_id, active brand, and list of all brands."""
    store = _get_db_store()
    active_id = store.get("active_brand_id", DEFAULT_BRAND_ID)
    brands = store.get("brands", [])
    active_brand = load_brand_kit(active_id)
    return {
        "active_brand_id": active_id,
        "active_brand": active_brand,
        "brands": brands
    }

def save_brand_kit(data: Dict[str, Any], brand_id: Optional[str] = None) -> Dict[str, Any]:
    """Updates an existing brand profile or active profile in the database."""
    store = _get_db_store()
    target_id = brand_id or data.get("id") or store.get("active_brand_id", DEFAULT_BRAND_ID)
    brands = store.get("brands", [])

    found = False
    for i, b in enumerate(brands):
        if b.get("id") == target_id:
            updated = b.copy()
            updated.update(data)
            updated["id"] = target_id
            # Preserve or update logos dict
            if "logos" in data and isinstance(data["logos"], dict):
                updated["logos"] = {**b.get("logos", {}), **data["logos"]}
            elif "logo_url" in data and data["logo_url"]:
                if "logos" not in updated:
                    updated["logos"] = {}
            if data.get("brand_name"):
                updated["name"] = data["brand_name"]
                updated["brand_name"] = data["brand_name"]
            elif data.get("name"):
                updated["name"] = data["name"]
                updated["brand_name"] = data["name"]
            brands[i] = updated
            found = True
            break

    if not found:
        # Create as new brand
        new_brand = DEFAULT_BRAND_PROFILE.copy()
        new_brand.update(data)
        new_brand["id"] = target_id or f"brand_{uuid.uuid4().hex[:8]}"
        if data.get("brand_name"):
            new_brand["name"] = data["brand_name"]
            new_brand["brand_name"] = data["brand_name"]
        brands.append(new_brand)

    store["brands"] = brands
    store["active_brand_id"] = target_id
    _save_db_store(store)
    return load_brand_kit(target_id)

def create_brand_profile(name: str, tagline: str = "", template_preset: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Creates a new brand profile in the database."""
    store = _get_db_store()
    new_id = f"brand_{uuid.uuid4().hex[:8]}"
    new_brand = DEFAULT_BRAND_PROFILE.copy()
    if template_preset:
        new_brand.update(template_preset)
    new_brand["id"] = new_id
    new_brand["name"] = name.strip() or "Untitled Brand"
    new_brand["tagline"] = tagline.strip()
    new_brand["is_default"] = False
    new_brand["logos"] = {"primary": "", "dark": "", "icon": ""}

    store.setdefault("brands", []).append(new_brand)
    store["active_brand_id"] = new_id
    _save_db_store(store)
    logger.info("Created new brand profile '%s' (ID: %s)", new_brand["name"], new_id)
    return new_brand

def switch_active_brand(brand_id: str) -> Dict[str, Any]:
    """Switches the active brand profile in the database."""
    store = _get_db_store()
    brands = store.get("brands", [])
    if any(b.get("id") == brand_id for b in brands):
        store["active_brand_id"] = brand_id
        _save_db_store(store)
        logger.info("Switched active brand to ID: %s", brand_id)
        return load_all_brands()
    raise ValueError(f"Brand ID {brand_id} not found")

def delete_brand_profile(brand_id: str) -> Dict[str, Any]:
    """Deletes a brand profile from the database (cannot delete default brand)."""
    store = _get_db_store()
    brands = store.get("brands", [])
    if len(brands) <= 1:
        raise ValueError("Cannot delete the only remaining brand profile.")

    filtered = [b for b in brands if b.get("id") != brand_id]
    if len(filtered) == len(brands):
        raise ValueError(f"Brand ID {brand_id} not found")

    store["brands"] = filtered
    if store.get("active_brand_id") == brand_id:
        store["active_brand_id"] = filtered[0].get("id", DEFAULT_BRAND_ID)

    _save_db_store(store)
    logger.info("Deleted brand profile ID: %s", brand_id)
    return load_all_brands()

def set_brand_logo(brand_id: str, logo_type: str, logo_url: str) -> Dict[str, Any]:
    """Sets a specific logo variant (primary, dark, icon) for a brand."""
    store = _get_db_store()
    brands = store.get("brands", [])
    valid_types = {"primary", "dark", "icon"}
    clean_type = logo_type if logo_type in valid_types else "primary"

    for i, b in enumerate(brands):
        if b.get("id") == brand_id:
            if "logos" not in b or not isinstance(b["logos"], dict):
                b["logos"] = {"primary": "", "dark": "", "icon": ""}
            b["logos"][clean_type] = logo_url
            if clean_type == "primary":
                b["logo_url"] = logo_url
            brands[i] = b
            store["brands"] = brands
            _save_db_store(store)
            logger.info("Updated %s logo for brand %s: %s", clean_type, brand_id, logo_url)
            return b

    raise ValueError(f"Brand ID {brand_id} not found")

def apply_brand_kit_to_prompt(prompt: str, custom_kit: Optional[Dict[str, Any]] = None) -> str:
    """Injects brand aesthetic guidelines, color palette cues, brand voice, and style rules into prompt."""
    kit = custom_kit or load_brand_kit()
    if not kit.get("apply_to_generation", False):
        return prompt

    brand_voice = kit.get("brand_voice", "").strip()
    colors = kit.get("colors", {})
    primary_color = colors.get("primary", "")
    accent_color = colors.get("accent", "")
    guidelines = kit.get("style_guidelines", "").strip()

    injections = []
    if brand_voice and brand_voice not in ("Neutral", "Standard"):
        injections.append(f"{brand_voice} visual aesthetic")
    if guidelines:
        injections.append(guidelines)
    if primary_color or accent_color:
        injections.append(f"subtle color harmony accents in {primary_color} and {accent_color}")

    if not injections:
        return prompt

    clean = prompt.strip().rstrip(".")
    return f"{clean}, {', '.join(injections)}"

def apply_brand_kit_to_negative_prompt(negative_prompt: str, custom_kit: Optional[Dict[str, Any]] = None) -> str:
    """Appends brand kit negative guidelines to exclude unwanted elements automatically."""
    kit = custom_kit or load_brand_kit()
    if not kit.get("apply_to_generation", True):
        return negative_prompt

    neg_rules = kit.get("negative_guidelines", "").strip()
    if not neg_rules:
        return negative_prompt

    if not negative_prompt or not negative_prompt.strip():
        return neg_rules

    if neg_rules.lower() in negative_prompt.lower():
        return negative_prompt

    return f"{negative_prompt.strip().rstrip(',')}, {neg_rules}"
