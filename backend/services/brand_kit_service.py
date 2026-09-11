"""
Brand Kit Service
Handles storage, retrieval, and prompt injection for Brand Assets:
- Brand Name, Tagline, and Logo URL
- Color Palette (Primary, Secondary, Accent, Background)
- Typography Style
- Brand Guidelines & Aesthetic Rules
- Excluded / Negative Guidelines
"""

import json
import logging
import tempfile
import os
from pathlib import Path
from typing import Any, Dict, Optional
from config import settings

logger = logging.getLogger("omnistudio.brand_kit")

BRAND_KIT_DIR = settings.OUTPUTS_PATH / "brand_kit"
BRAND_KIT_DIR.mkdir(parents=True, exist_ok=True)
BRAND_KIT_FILE = BRAND_KIT_DIR / "brand_kit.json"

DEFAULT_BRAND_KIT: Dict[str, Any] = {
    "brand_name": "OmniStudio",
    "tagline": "Next-Gen AI Cinematic Production",
    "logo_url": "",
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
    "style_guidelines": "Premium aesthetic, high contrast, clean studio lighting, pristine reflections, sophisticated and cohesive brand presentation.",
    "negative_guidelines": "cheap, oversaturated, blurry, low resolution, distorted text, low quality",
    "apply_to_generation": True
}


def load_brand_kit() -> Dict[str, Any]:
    """Load the active brand kit from disk, with robust fallback."""
    if not BRAND_KIT_FILE.exists():
        save_brand_kit(DEFAULT_BRAND_KIT)
        return DEFAULT_BRAND_KIT.copy()

    try:
        with open(BRAND_KIT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            merged = DEFAULT_BRAND_KIT.copy()
            merged.update(data)
            if "colors" in data and isinstance(data["colors"], dict):
                merged["colors"] = {**DEFAULT_BRAND_KIT["colors"], **data["colors"]}
            if "typography" in data and isinstance(data["typography"], dict):
                merged["typography"] = {**DEFAULT_BRAND_KIT["typography"], **data["typography"]}
            return merged
    except Exception as e:
        logger.error("Failed to read brand kit: %s", e)
        return DEFAULT_BRAND_KIT.copy()


def save_brand_kit(data: Dict[str, Any]) -> Dict[str, Any]:
    """Save brand kit data atomically using atomic replace."""
    tmp_fd, tmp_path = tempfile.mkstemp(prefix=".brand_", suffix=".tmp", dir=str(BRAND_KIT_DIR))
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as tmp_f:
            json.dump(data, tmp_f, indent=2, ensure_ascii=False)
            tmp_f.flush()
            try:
                os.fsync(tmp_f.fileno())
            except OSError:
                pass
        os.replace(tmp_path, BRAND_KIT_FILE)
        return data
    except Exception as e:
        try:
            Path(tmp_path).unlink(missing_ok=True)
        except OSError:
            pass
        logger.error("Failed to write brand kit: %s", e)
        raise e


def apply_brand_kit_to_prompt(prompt: str, custom_kit: Optional[Dict[str, Any]] = None) -> str:
    """
    Injects brand aesthetic guidelines, color palette cues, and style rules into prompt.
    """
    kit = custom_kit or load_brand_kit()
    if not kit.get("apply_to_generation", True):
        return prompt

    brand_name = kit.get("brand_name", "").strip()
    colors = kit.get("colors", {})
    primary_color = colors.get("primary", "")
    accent_color = colors.get("accent", "")
    guidelines = kit.get("style_guidelines", "").strip()
    heading_style = kit.get("typography", {}).get("heading_style", "")

    injections = []
    if brand_name and brand_name.lower() not in prompt.lower():
        injections.append(f"incorporating {brand_name} brand identity")
    if guidelines:
        injections.append(guidelines)
    if primary_color or accent_color:
        injections.append(f"subtle color harmony accents in {primary_color} and {accent_color}")
    if heading_style:
        injections.append(f"{heading_style} typography tone")

    if not injections:
        return prompt

    clean = prompt.strip().rstrip(".")
    return f"{clean}, {', '.join(injections)}"
