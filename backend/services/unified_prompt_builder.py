"""
Unified Prompt Builder — Single source of truth for all prompt engineering.
Generates model-specific image and video prompts from a single master prompt.
"""
import logging
import re
from typing import Optional, List, Dict, Any

logger = logging.getLogger("omnistudio.unified_prompt_builder")

# ── Model-specific optimization configs ──
OMNI_FLASH_CONFIG = {
    "motion_keywords": [
        "smooth cinematic motion",
        "temporal consistency",
        "fluid camera movement",
        "consistent character identity"
    ],
    "avoid": [
        "rapid cuts",
        "jerky motion",
        "abrupt changes",
        "teleporting subjects"
    ]
}

SEEDANCE_CONFIG = {
    "motion_keywords": [
        "dynamic camera motion",
        "high-quality temporal coherence",
        "character stability",
        "natural organic movement"
    ],
    "avoid": [
        "static frozen frame",
        "jittery artifacts",
        "identity drift"
    ]
}

MODEL_CONFIGS = {
    "omni_flash": {
        "name": "Google Omni Flash (Veo 3.1)",
        "durations": [4, 6, 8],
        "prompt_style": "smooth cinematic",
        "cost_per_sec": 0.20,
        "config": OMNI_FLASH_CONFIG
    },
    "seedance": {
        "name": "ByteDance Seedance",
        "durations": [2, 4, 5, 8, 12],
        "prompt_style": "dynamic motion",
        "cost_per_sec": 0.15,
        "config": SEEDANCE_CONFIG
    }
}


class UnifiedPromptBuilder:
    """Single source of truth for all prompt engineering in the pipeline.
    
    Builds both image-optimized and video-optimized prompts from a single
    master prompt, applying skill modifiers, brand kit data, and 
    model-specific optimizations.
    """

    def __init__(
        self,
        user_prompt: str,
        style: str,
        image_model: str = "gemini_flash_image",
        video_model: str = "omni_flash",
        skill: Optional[Any] = None,
        brand_kit: Optional[dict] = None,
        apply_brand_kit: bool = False
    ):
        self.user_prompt = user_prompt
        self.style = style
        self.image_model = image_model
        self.video_model = video_model
        self.skill = skill
        self.brand_kit = brand_kit if apply_brand_kit else None
        
        # Detect character presence for consistency enforcement
        self._has_character = self._detect_character()
        self._character_anchor = self._build_character_anchor() if self._has_character else ""

    def _detect_character(self) -> bool:
        """Detect if prompt contains a human character."""
        keywords = ["woman", "girl", "model", "bride", "man", "person", 
                    "lady", "protagonist", "actress", "boy", "child", "actor"]
        lower = self.user_prompt.lower()
        return any(w in lower for w in keywords)

    def _build_character_anchor(self) -> str:
        """Extract character appearance description, stripping scene breakdowns."""
        clean_char = self.user_prompt
        match = re.split(
            r'\b(scene\s*\d+|camera\s*&|motion\s*pace|generate\s*directly)\b',
            clean_char, flags=re.IGNORECASE
        )
        if match and len(match) > 1:
            clean_char = match[0].strip(" -:,\n\r")
        if not clean_char or len(clean_char) < 10:
            clean_char = self.user_prompt[:250].strip()
        return f"Featuring the exact same protagonist: {clean_char}. 100% facial identity and outfit continuity"

    def _get_scene_description(self, scene_desc: str, scene_index: int) -> str:
        """Get scene-specific description, filtering multi-scene text."""
        desc = scene_desc or self.user_prompt
        if "scene " in desc.lower():
            current_match = re.search(
                rf'scene\s*{scene_index}[:\s\-]+([^.]+)', desc, re.IGNORECASE
            )
            if current_match:
                desc = current_match.group(1).strip()
        return desc

    def _get_skill_prompt_modifiers(self) -> str:
        """Get prompt modifiers from active skill."""
        if self.skill and hasattr(self.skill, 'prompt_modifiers') and self.skill.prompt_modifiers:
            return ", ".join(self.skill.prompt_modifiers)
        return ""

    def _get_skill_negative_modifiers(self) -> str:
        """Get negative prompt modifiers from active skill."""
        if self.skill and hasattr(self.skill, 'negative_prompt_modifiers') and self.skill.negative_prompt_modifiers:
            return ", ".join(self.skill.negative_prompt_modifiers)
        return ""

    def _get_brand_addons(self) -> str:
        """Get brand kit style additions."""
        if not self.brand_kit:
            return ""
        addons = []
        style_guide = self.brand_kit.get("style_guidelines", "")
        if style_guide:
            addons.append(style_guide)
        primary_c = self.brand_kit.get("primary_color", "")
        accent_c = self.brand_kit.get("accent_color", "")
        if primary_c or accent_c:
            addons.append(f"color harmony in {primary_c} and {accent_c}")
        return ", ".join(addons)

    def _get_brand_negatives(self) -> str:
        """Get brand kit negative guidelines."""
        if not self.brand_kit:
            return ""
        return self.brand_kit.get("negative_guidelines", "")

    # ── Style-specific negative prompts (prevent cross-contamination) ──
    STYLE_NEGATIVES = {
        "photoreal": "neon glow, cyberpunk, anime, cartoon, 3d render, fantasy, sci-fi",
        "cinematic": "anime, cartoon, neon signs, cyberpunk HUD, 3d render, fantasy magic",
        "cyberpunk": "pastoral, countryside, natural sunlight, warm tones, soft focus",
        "anime": "photorealistic skin, film grain, documentary, cyberpunk neon",
        "3d_pixar": "photorealistic, film grain, live action, cyberpunk neon",
    }

    def build_image_prompt(
        self,
        scene_desc: str,
        scene_index: int,
        camera_angle: str = "",
        lighting: str = ""
    ) -> str:
        """Build an optimized prompt for image diffusion models."""
        from services.prompt_enhancer import CINEMATIC_MODIFIERS
        
        desc = self._get_scene_description(scene_desc, scene_index)
        
        # Apply character anchor
        if self._character_anchor and self._character_anchor not in desc:
            desc = f"{self._character_anchor}. {desc}"

        angle = camera_angle or "Cinematic wide angle"
        light = lighting or "Dramatic volumetric lighting"
        style_modifier = CINEMATIC_MODIFIERS.get(self.style, CINEMATIC_MODIFIERS.get("cinematic", ""))
        composition_guard = "Single continuous full-bleed frame, not a collage or split screen"

        model = self.image_model.lower()
        if "flux" in model:
            prompt = (
                f"A master photograph depicting {desc}. {angle}, {light}. {composition_guard}. "
                f"Authentic {self.style} aesthetic, {style_modifier}."
            )
        elif "imagen" in model:
            prompt = (
                f"Photorealistic 8K photograph of {desc}, {angle}, {light}. {composition_guard}. "
                f"{style_modifier}, {self.style} color grading."
            )
        elif "gpt" in model or "dall" in model:
            prompt = (
                f"High-fidelity single frame of {desc}, {angle}, {light}, {composition_guard}, "
                f"award-winning {self.style} cinematography, {style_modifier}."
            )
        else:
            prompt = (
                f"{self.style.capitalize()} shot, {desc}, {angle}, {light}, {composition_guard}, "
                f"{style_modifier}."
            )

        # Apply skill prompt modifiers
        skill_mods = self._get_skill_prompt_modifiers()
        if skill_mods:
            prompt = f"{prompt.rstrip('.')}, {skill_mods}."

        # Apply brand kit
        brand_addons = self._get_brand_addons()
        if brand_addons:
            prompt = f"{prompt.rstrip('.')}, {brand_addons}."

        return prompt

    def build_negative_prompt(self, scene_index: int = 0) -> str:
        """Build comprehensive negative prompt with skill + brand + style guards."""
        model = self.image_model.lower()
        anti_grid = "split screen, collage, grid, 4-panel, multi-panel, contact sheet, storyboard layout, comic strip, multiple sub-frames in one image"
        anti_contamination = self.STYLE_NEGATIVES.get(self.style, "")
        consistency = "changing face, different person, identity morphing, altered clothes, extra people" if self._has_character else ""

        if "flux" in model:
            base_neg = f"lowres, plastic skin, distorted hands, oversaturated, watermark, {anti_grid}"
        elif "imagen" in model:
            base_neg = f"cartoon, blurry, low resolution, extra limbs, bad anatomy, {anti_grid}"
        elif "gpt" in model or "dall" in model:
            base_neg = f"blurry, low quality, artifacts, watermark, {anti_grid}"
        else:
            base_neg = f"low quality, blurry, distorted, watermark, {anti_grid}"

        parts = [base_neg]
        if anti_contamination:
            parts.append(anti_contamination)
        if consistency:
            parts.append(consistency)

        # Skill negative modifiers
        skill_negs = self._get_skill_negative_modifiers()
        if skill_negs:
            parts.append(skill_negs)

        # Brand kit negatives
        brand_negs = self._get_brand_negatives()
        if brand_negs:
            parts.append(brand_negs)

        return ", ".join(parts)

    def build_video_prompt(
        self,
        scene_desc: str,
        scene_index: int,
        camera_angle: str = "",
        lighting: str = "",
        motion_type: str = ""
    ) -> str:
        """Build a model-specific optimized prompt for video generation."""
        desc = self._get_scene_description(scene_desc, scene_index)
        
        # Character anchor for video
        if self._character_anchor:
            desc = f"{desc}. {self._character_anchor}"

        angle = camera_angle or ""
        light = lighting or ""
        
        video_model = self.video_model.lower()
        model_config = MODEL_CONFIGS.get(
            "seedance" if "seedance" in video_model else "omni_flash",
            MODEL_CONFIGS["omni_flash"]
        )
        config = model_config["config"]
        motion_keywords = ", ".join(config["motion_keywords"])

        parts = [desc]
        if angle:
            parts.append(angle)
        if light:
            parts.append(light)
        if motion_type:
            parts.append(f"camera motion: {motion_type}")
        parts.append(motion_keywords)

        # Skill prompt modifiers (also apply to video)
        skill_mods = self._get_skill_prompt_modifiers()
        if skill_mods:
            parts.append(skill_mods)

        return ". ".join(filter(None, parts))
