import json
import logging
import re
from pathlib import Path
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from config import settings

logger = logging.getLogger("omnistudio.skills")

SKILLS_DIR = Path(settings.OUTPUTS_PATH).parent / "data" / "skills"
SKILLS_DIR.mkdir(parents=True, exist_ok=True)

class SkillDefinition(BaseModel):
    id: str = Field(..., description="Unique slug for the skill, e.g. bollywood_dramatic")
    name: str = Field(..., description="Human readable name")
    description: str = Field(..., description="Short explanation of the aesthetic / workflow")
    category: str = Field("cinematography", description="director | cinematography | lighting | scriptwriting | commercial")
    camera_motions: List[str] = Field(default_factory=list)
    lighting_presets: List[str] = Field(default_factory=list)
    lenses: List[str] = Field(default_factory=list)
    prompt_modifiers: List[str] = Field(default_factory=list)
    negative_prompt_modifiers: List[str] = Field(default_factory=list)
    system_prompt: str = Field("", description="Custom system instructions injected into AI agents")
    is_builtin: bool = False

BUILTIN_SKILLS: List[SkillDefinition] = [
    SkillDefinition(
        id="hollywood_anamorphic_director",
        name="Hollywood Anamorphic 2.39:1 Director",
        description="Epic widescreen Panavision optics, horizontal blue streak flares, rich organic celluloid falloff, and dynamic crane/dolly staging.",
        category="director",
        camera_motions=[
            "crane_pedestal_reveal", "dolly_zoom_vertigo", "low_angle_hero_track",
            "steadicam_orbit_360", "rack_focus_shallow"
        ],
        lighting_presets=[
            "Rembrandt chiaroscuro with volumetric dust haze",
            "Golden hour warm rim lighting with cinematic flares"
        ],
        lenses=[
            "35mm Anamorphic T1.5", "50mm Master Prime T1.3", "85mm Portrait Cine"
        ],
        prompt_modifiers=[
            "Panavision 2.39:1 anamorphic scope", "Kodak 5219 35mm motion picture stock", "volumetric haze", "master color grade"
        ],
        negative_prompt_modifiers=[
            "flat lighting", "cheap digital video", "oversaturated cartoonish colors", "blurry low-res"
        ],
        system_prompt="You are a veteran Hollywood director and cinematographer. Frame scenes with grand spatial depth, intentional camera kinematics, and rich character presence.",
        is_builtin=True
    ),
    SkillDefinition(
        id="anime_cyberpunk_action",
        name="Anime Cyberpunk & High-Octane Action",
        description="Hyper-stylized futuristic perspective, speed lines, neon-lit rainy reflections, Dutch angles, and kinetic whip pans.",
        category="cinematography",
        camera_motions=[
            "dutch_angle_tilt", "whip_pan_transition", "fpv_drone_dive", "dolly_in_rapid"
        ],
        lighting_presets=[
            "Neon cyan and magenta split-lighting with wet street reflections",
            "High-contrast strobe flash with heavy volumetric fog"
        ],
        lenses=[
            "18mm Ultra-Wide Fisheye", "24mm Dynamic Action Lens"
        ],
        prompt_modifiers=[
            "Makoto Shinkai and Akira aesthetic", "hyper-kinetic anime action", "neon caustics", "speed trails"
        ],
        negative_prompt_modifiers=[
            "washed out colors", "boring static composition", "dull gray tones"
        ],
        system_prompt="Choreograph high-octane kinetic energy, intense dramatic tension, neon accents, and sharp contrast.",
        is_builtin=True
    ),
    SkillDefinition(
        id="ecommerce_ugc_viral_hook",
        name="E-Commerce Viral UGC & Product Hook",
        description="Scroll-stopping opening hooks, authentic handheld micro-movements, crisp natural lighting, and high-retention pacing.",
        category="commercial",
        camera_motions=[
            "handheld_cinema_verite", "extreme_close_up_macro", "slow_push_in"
        ],
        lighting_presets=[
            "Pristine studio softbox illumination with accurate product textures",
            "Bright airy lifestyle morning sunlight"
        ],
        lenses=[
            "50mm Crisp Prime", "100mm Macro Cine Probe"
        ],
        prompt_modifiers=[
            "authentic lifestyle realism", "high commercial conversion clarity", "crisp 4k studio lighting"
        ],
        negative_prompt_modifiers=[
            "dark murky shadows", "distorted product proportions", "grainy artifacts"
        ],
        system_prompt="Focus on instant visual hook, clear product focus, vibrant lifestyle aesthetic, and high retention.",
        is_builtin=True
    ),
    SkillDefinition(
        id="indian_luxury_jewellery_heritage",
        name="Indian Luxury Jewellery & Heritage (Tanishq/Sabyasachi)",
        description="Regal royal palace aesthetics, heirloom polki & kundan dispersion, authentic unretouched skin textures, and 90mm macro jewellery details.",
        category="commercial",
        camera_motions=[
            "macro_necklace_tracking", "slow_neck_turn_reveal", "hand_framing_ring_close", "palace_corridor_slow_walk"
        ],
        lighting_presets=[
            "Soft morning daylight entering through carved sandstone palace window",
            "Warm golden hour rim lighting with soft cinematic shadows",
            "Low-light palace candlelight glow with warm ambience"
        ],
        lenses=[
            "Sony A7R V 90mm Macro f/2.8", "85mm GM f/1.4 Portrait", "135mm Telephoto Compression"
        ],
        prompt_modifiers=[
            "heirloom polki and kundan jewellery reflections", "natural skin texture with visible pores",
            "authentic Indian facial features", "unretouched RAW photograph", "subtle natural asymmetry", "8k editorial"
        ],
        negative_prompt_modifiers=[
            "plastic skin", "glass skin", "beauty filter", "doll face", "CGI", "cartoon", "oversaturated colors"
        ],
        system_prompt="You are an elite creative director for luxury Indian jewellery campaigns (like Tanishq, Sabyasachi, Kalyan). Focus on authentic facial anatomy, micro-pores, physical gemstone dispersion, and regal heritage compositions.",
        is_builtin=True
    )
]

class SkillManager:
    def __init__(self):
        self._ensure_builtins()

    def _ensure_builtins(self):
        for skill in BUILTIN_SKILLS:
            path = SKILLS_DIR / f"{skill.id}.json"
            if not path.exists():
                try:
                    with open(path, "w", encoding="utf-8") as f:
                        json.dump(skill.model_dump(), f, indent=2)
                except Exception as e:
                    logger.warning("Failed to write builtin skill %s: %s", skill.id, e)

    def list_skills(self) -> List[SkillDefinition]:
        skills: List[SkillDefinition] = []
        # Load all from directory
        if SKILLS_DIR.exists():
            for f in sorted(SKILLS_DIR.glob("*.json")):
                try:
                    with open(f, "r", encoding="utf-8") as fp:
                        data = json.load(fp)
                        skills.append(SkillDefinition(**data))
                except Exception as e:
                    logger.warning("Error reading skill file %s: %s", f.name, e)

        # Fallback to in-memory builtins if directory was empty
        if not skills:
            skills = list(BUILTIN_SKILLS)
        return skills

    def get_skill(self, skill_id: str) -> Optional[SkillDefinition]:
        path = SKILLS_DIR / f"{skill_id}.json"
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return SkillDefinition(**json.load(f))
            except Exception:
                pass
        for s in BUILTIN_SKILLS:
            if s.id == skill_id:
                return s
        return None

    def save_custom_skill(self, data: dict) -> SkillDefinition:
        raw_id = data.get("id") or data.get("name", "custom_skill")
        clean_id = re.sub(r'[^a-zA-Z0-9_-]', '_', raw_id.lower()).strip('_')
        if not clean_id:
            clean_id = "custom_skill"

        skill = SkillDefinition(
            id=clean_id,
            name=data.get("name", clean_id.replace("_", " ").title()),
            description=data.get("description", ""),
            category=data.get("category", "cinematography"),
            camera_motions=data.get("camera_motions", []),
            lighting_presets=data.get("lighting_presets", []),
            lenses=data.get("lenses", []),
            prompt_modifiers=data.get("prompt_modifiers", []),
            negative_prompt_modifiers=data.get("negative_prompt_modifiers", []),
            system_prompt=data.get("system_prompt", ""),
            is_builtin=False
        )

        path = SKILLS_DIR / f"{skill.id}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(skill.model_dump(), f, indent=2)

        return skill

    def delete_custom_skill(self, skill_id: str) -> bool:
        # Cannot delete builtin skills
        for b in BUILTIN_SKILLS:
            if b.id == skill_id:
                return False

        path = SKILLS_DIR / f"{skill_id}.json"
        if path.exists():
            path.unlink()
            return True
        return False

# Global singleton
skill_manager = SkillManager()
