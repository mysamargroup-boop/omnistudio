import re
import logging
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult

logger = logging.getLogger("omnistudio.agents.director")

MODEL_KEYWORD_MAP = {
    r"\b(flux[\s\-_.]*pro|flux[\s\-_.]*1[\s\-_.]*pro|flux[\s\-_.]*dev|flux[\s\-_.]*schnell|flux)\b": "flux_pro",
    r"\b(imagen[\s\-_.]*3|imagen3|imagen)\b": "imagen_3",
    r"\b(gpt[\s\-_.]*image[\s\-_.]*2|gpt[\s\-_.]*image|gpt4o[\s\-_.]*image|dall[\s\-_.]*e[\s\-_.]*3|dalle3|dalle)\b": "gpt-image-2",
    r"\b(gemini[\s\-_.]*flash[\s\-_.]*image|gemini[\s\-_.]*image|gemini[\s\-_.]*flash|gemini)\b": "gemini_flash_image",
    r"\b(midjourney[\s\-_.]*v?6?|midjourney|mj[\s\-_.]*v?6?)\b": "midjourney_v6",
    r"\b(sd[\s\-_.]*3\.?5?|stable[\s\-_.]*diffusion)\b": "sd_35_large",
}

def detect_model_from_prompt(prompt: str) -> str | None:
    p_lower = prompt.lower()
    for pattern, model_id in MODEL_KEYWORD_MAP.items():
        if re.search(pattern, p_lower):
            return model_id
    return None

def infer_optimal_model(prompt: str, style: str) -> str:
    p_lower = f"{prompt} {style}".lower()
    if any(k in p_lower for k in ["text", "logo", "sign", "typography", "written", "words", "spelled"]):
        return "gpt-image-2"
    if any(k in p_lower for k in ["photoreal", "hasselblad", "realistic", "documentary", "national geographic", "portrait", "8k", "skin"]):
        return "imagen_3"
    if any(k in p_lower for k in ["anime", "fantasy", "cyberpunk", "concept art", "scifi", "render", "3d", "surreal"]):
        return "flux_pro"
    return "gemini_flash_image"

def extract_prompt_parameters(prompt: str) -> dict:
    """Extract natural language directives like 'autopilot', '4 images', '4 seconds', 'seedance' from prompt."""
    p_lower = prompt.lower()
    params = {}
    
    # 1. Autopilot detection
    if re.search(r"\b(autopilot|auto[\s\-_]*pilot|full[\s\-_]*auto|autonomous)\b", p_lower):
        params["mode"] = "autonomous"

    # 2. Scene count detection (e.g. '4 images', '4 scenes', '4 keyframes', '4 shots')
    scene_match = re.search(r"\b(\d+)\s*(?:images?|scenes?|keyframes?|shots?)\b", p_lower)
    if scene_match:
        count = int(scene_match.group(1))
        if 1 <= count <= 8:
            params["num_scenes"] = count

    # 3. Duration detection — treat as TOTAL video duration, not per-scene
    # Matches: '14 sec', '14 seconds', '14s', '14 sec ka video', '14 second video'
    dur_match = re.search(r"\b(\d+(?:\.\d+)?)\s*(?:seconds?|sec|s)\b", p_lower)
    if dur_match:
        params["total_duration"] = float(dur_match.group(1))

    # 4. Video model detection (e.g. 'seedance', 'omni flash', 'veo', 'omni')
    if "seedance" in p_lower:
        params["video_model"] = "seedance"
    elif any(k in p_lower for k in ["omni flash", "omni_flash", "omni model", "omni_model", "veo", "google veo"]):
        params["video_model"] = "omni_flash"

    return params

class CreativeDirectorAgent(BaseAgent):
    name = "CreativeDirectorAgent"
    description = "Decomposes user prompt into a Project Brief, extracts natural language parameters, and selects optimal diffusion and video models"
    icon = "clapperboard"

    async def execute(self, context: PipelineContext) -> AgentResult:
        # 1. Extract natural language intent parameters from prompt
        extracted = extract_prompt_parameters(context.user_prompt)

        # Apply autopilot if requested in prompt
        if extracted.get("mode") == "autonomous":
            context.mode = "autonomous"
            context.add_log(self.name, "Autopilot command detected in prompt — full autonomous mode enabled (zero confirmation popups).")

        # Apply scene count if requested in prompt
        if extracted.get("num_scenes"):
            context.num_scenes = extracted["num_scenes"]
            context.add_log(self.name, f"Detected scene count in prompt: configured for {context.num_scenes} scenes.")

        # 2. Configure video engine (seedance vs omni_flash vs default) first for model-aware duration logic
        if extracted.get("video_model") == "seedance":
            context.video_model = "seedance"
            context.add_log(self.name, "Seedance video model detected in prompt — configured video engine to 'Seedance Neural Motion'.")
        elif extracted.get("video_model") == "omni_flash" or not context.video_model or context.video_model in {"auto", "omni_model", "omni", ""}:
            context.video_model = "omni_flash"
            context.add_log(self.name, "Configured video engine to 'Google Omni Flash (Veo 3.1 Neural Kinematics)'.")
        else:
            context.add_log(self.name, f"Configured video engine: '{context.video_model}'.")

        is_seedance = "seedance" in (context.video_model or "").lower()

        # 3. Model-aware duration configuration
        total_dur = extracted.get("total_duration")
        scene_durations = []
        if total_dur:
            if is_seedance:
                # ByteDance Seedance officially supports flexible durations (2s to 12s on v1.x, up to 30s on v2.5)
                # Seedance natively supports 5 seconds!
                raw_per_scene = total_dur / context.num_scenes
                clamped_dur = max(2.0, min(12.0, round(raw_per_scene, 1)))
                duration_per_scene = clamped_dur
                scene_durations = [clamped_dur] * context.num_scenes
                context.add_log(self.name, f"Total duration requested: {total_dur}s -> Seedance configured {context.num_scenes} scenes @ {clamped_dur}s each (~{int(sum(scene_durations))}s total).")
            else:
                # Google Omni Flash (Veo 3.1): Officially supports 4s, 6s, 8s per clip (does NOT support 5s)
                if abs(total_dur - 14.0) < 0.5:
                    # 14s total duration distribution across scenes
                    if context.num_scenes == 3:
                        # 4s + 6s + 4s = 14s exact!
                        scene_durations = [4.0, 6.0, 4.0]
                        duration_per_scene = 4.7
                    elif context.num_scenes == 2:
                        # 6s + 8s = 14s exact!
                        scene_durations = [6.0, 8.0]
                        duration_per_scene = 7.0
                    else:
                        scene_durations = [6.0] * context.num_scenes
                        duration_per_scene = 6.0
                elif total_dur <= 5.5:
                    # If prompt asks for 5s: Omni doesn't support 5s, snap to 6s!
                    duration_per_scene = 6.0 if total_dur > 4.0 else 4.0
                    scene_durations = [duration_per_scene] * context.num_scenes
                else:
                    raw_per_scene = total_dur / context.num_scenes
                    if raw_per_scene <= 4.5:
                        duration_per_scene = 4.0
                    elif raw_per_scene <= 7.0:
                        duration_per_scene = 6.0
                    else:
                        duration_per_scene = 8.0
                    scene_durations = [duration_per_scene] * context.num_scenes

                context.add_log(self.name, f"Total duration requested: {total_dur}s -> Omni Flash (Veo 3.1) configured {context.num_scenes} scenes with durations {scene_durations} (~{int(sum(scene_durations))}s total).")
        else:
            duration_per_scene = 4.0
            scene_durations = [4.0] * context.num_scenes

        # 4. Analyze prompt for image diffusion model
        explicit_model = detect_model_from_prompt(context.user_prompt)
        initial_model = context.image_model

        if explicit_model:
            context.image_model = explicit_model
            context.add_log(self.name, f"Detected image model command in prompt — switched diffusion engine to '{explicit_model}'.")
        elif context.image_model in {"auto", "auto_agent", None, ""}:
            inferred = infer_optimal_model(context.user_prompt, context.style)
            context.image_model = inferred
            context.add_log(self.name, f"Auto Director selected optimal diffusion engine '{inferred}' for visual context.")
        elif initial_model:
            context.add_log(self.name, f"Configured diffusion engine: '{initial_model}'.")

        # 4. Directorial Skill Integration
        active_skill_data = None
        if context.skill_id and context.skill_id != "none":
            from services.skills_service import skill_manager
            skill = skill_manager.get_skill(context.skill_id)
            if skill:
                active_skill_data = skill.model_dump()
                context.add_log(
                    self.name,
                    f"Directorial Skill Active: [{skill.name}] — Injected custom cinematography presets, optics & style."
                )

        # 5. Formulate Comprehensive Project Brief for transparent inspection
        title_summary = context.user_prompt.split(",")[0].strip()
        if len(title_summary) > 40:
            title_summary = title_summary[:37] + "..."

        # Style-aware genre label and color palette
        _GENRE_LABELS = {
            "photoreal": "Photoreal Cinematic Film",
            "cinematic": "Cinematic 35mm Film",
            "cyberpunk": "Cyberpunk Noir Film",
            "anime": "Anime Ghibli Feature",
            "3d_pixar": "3D Animated Short",
        }
        _MOOD_LABELS = {
            "photoreal": "Natural & Authentic",
            "cinematic": "Cinematic & Emotional",
            "cyberpunk": "Moody & Futuristic",
            "anime": "Dreamlike & Vibrant",
            "3d_pixar": "Playful & Expressive",
        }
        _PALETTE_LABELS = {
            "photoreal": "Natural Tones, Warm Sunlight & True-to-Life Color",
            "cinematic": "Rich Cinematic Contrast & Warm Volumetrics",
            "cyberpunk": "Neon Cyan & Magenta, Deep Urban Shadows",
            "anime": "Luminous Pastels, Vivid Sky Gradients & Bloom",
            "3d_pixar": "Saturated Primaries, Soft Subsurface Glow",
        }

        context.project_brief = {
            "title": title_summary or "Cinematic Production",
            "genre": _GENRE_LABELS.get(context.style, f"{context.style.capitalize()} Cinematic Film"),
            "mood": _MOOD_LABELS.get(context.style, "Cinematic & Emotional"),
            "target_audience": "Global / Social Master",
            "scene_count": context.num_scenes,
            "scene_duration": duration_per_scene,
            "scene_durations": scene_durations,
            "total_duration": sum(scene_durations) if scene_durations else (total_dur if total_dur else (context.num_scenes * duration_per_scene)),
            "visual_style": context.style,
            "diffusion_model": context.image_model,
            "video_model": context.video_model,
            "skill": active_skill_data,
            "color_palette": _PALETTE_LABELS.get(context.style, "Rich Cinematic Contrast & Warm Volumetrics"),
            "aspect_ratio": context.aspect_ratio,
            "director_decisions": {
                "concept": context.user_prompt,
                "pacing": f"{context.num_scenes} scenes @ {duration_per_scene}s each (~{int(context.num_scenes * duration_per_scene)}s total)",
                "image_engine": f"{context.image_model} (Selected for photoreal texture & composition)",
                "video_engine": f"{context.video_model} (Temporal motion & character kinematics)",
                "skill_applied": active_skill_data["name"] if active_skill_data else "None (Pure Prompt)",
                "mode": context.mode,
                "autopilot_active": context.mode == "autonomous"
            }
        }
        return AgentResult(success=True)
