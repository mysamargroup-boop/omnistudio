import re
import logging
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult, SceneData

logger = logging.getLogger("omnistudio.agents.director")

MODEL_KEYWORD_MAP = {
    r"\b(flux[\s\-_.]*pro|flux[\s\-_.]*1[\s\-_.]*pro|flux[\s\-_.]*dev|flux[\s\-_.]*schnell|flux)\b": "flux_pro",
    r"\b(google[\s\-_.]*imagen|imagen[\s\-_.]*3|imagen3|imagen|google[\s\-_.]*image)\b": "imagen_3",
    r"\b(gpt[\s\-_.]*image[\s\-_.]*2|gpt[\s\-_.]*image|gpt4o[\s\-_.]*image|dall[\s\-_.]*e[\s\-_.]*3|dalle3|dalle|openai[\s\-_.]*image)\b": "gpt-image-2",
    r"\b(gemini[\s\-_.]*flash[\s\-_.]*image|gemini[\s\-_.]*image|gemini[\s\-_.]*flash)\b": "gemini_flash_image",
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
    if any(k in p_lower for k in ["google imagen", "imagen 3", "imagen3", "imagen", "google image"]):
        return "imagen_3"
    # BY DEFAULT: GPT Image model advance model (DALL-E 3 HD)
    return "gpt-image-2"

def extract_prompt_parameters(prompt: str) -> dict:
    """Extract natural language directives like 'autopilot', '4 images', '4 seconds', 'seedance', 'imagen', 'native audio' from prompt."""
    p_lower = prompt.lower()
    params = {}
    
    # 0. Storyboard format detection (BEFORE other logic)
    # Detects: "Scene 1: ... camera: 85mm" or "Scene 1: ... f/1.4" etc.
    storyboard_pattern = re.search(r'scene\s+\d+.*?(\d+mm|f/\d+\.?\d*|drone|aerial|tracking|orbit|push|pull|tilt|pan)', p_lower, re.IGNORECASE)
    if storyboard_pattern:
        params["is_storyboard"] = True
        params["preserve_user_scenes"] = True
        # Count explicit scene markers
        scene_markers = re.findall(r'scene\s+(\d+)', p_lower, re.IGNORECASE)
        if scene_markers:
            params["num_scenes"] = max(int(s) for s in scene_markers)
    
    # 1. Autopilot detection
    if re.search(r"\b(autopilot|auto[\s\-_]*pilot|full[\s\-_]*auto|autonomous)\b", p_lower):
        params["mode"] = "autonomous"

    # 2. Scene count detection (e.g. '4 images', '4 scenes', '4 keyframes', '4 shots')
    # Only if not already set by storyboard detection
    if "num_scenes" not in params:
        scene_match = re.search(r"\b(\d+)\s*(?:images?|scenes?|keyframes?|shots?)\b", p_lower)
        if scene_match:
            count = int(scene_match.group(1))
            if 1 <= count <= 12:  # Increased max to 12 for detailed storyboards
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

    # 5. Image model detection
    if any(k in p_lower for k in ["google imagen", "imagen 3", "imagen3", "imagen", "google image"]):
        params["image_model"] = "imagen_3"
    elif any(k in p_lower for k in ["gpt image", "gpt-image", "dalle", "dall-e", "openai image"]):
        params["image_model"] = "gpt-image-2"

    # 6. Soundtrack / Native Audio detection
    if any(k in p_lower for k in ["soundtrack: none", "soundtrack none", "no soundtrack", "no music", "no audio", "bina sound", "without sound", "native audio", "native sound", "bina music", "bina soundtrack", "pure video"]):
        params["voice_provider"] = "none"
        params["soundtrack"] = "native"

    return params

def parse_user_storyboard(prompt: str, num_scenes: int) -> list[SceneData]:
    """Parse user's detailed storyboard into SceneData objects, preserving camera specs."""
    scenes = []
    
    # Split by "Scene X:" pattern (case-insensitive)
    scene_pattern = re.compile(r'scene\s+(\d+)\s*:\s*', re.IGNORECASE)
    parts = scene_pattern.split(prompt)
    
    # parts[0] is before first scene, parts[1] is scene number, parts[2] is scene content, etc.
    for i in range(1, len(parts), 2):
        if i + 1 >= len(parts):
            break
        
        scene_num = int(parts[i])
        scene_content = parts[i + 1].strip()
        
        if not scene_content:
            continue
        
        # Extract camera specs from scene content
        camera_angle = ""
        lens = ""
        motion_type = ""
        lighting = ""
        
        # Extract camera angle/description (first 100 chars or until camera specs)
        camera_match = re.search(r'camera\s*:\s*([^,.]+)', scene_content, re.IGNORECASE)
        if camera_match:
            camera_angle = camera_match.group(1).strip()
        else:
            # Fallback: use first part of description as camera angle
            camera_angle = scene_content[:100]
        
        # Extract lens (e.g., "85mm", "35mm", "24mm")
        lens_match = re.search(r'(\d+)mm', scene_content, re.IGNORECASE)
        if lens_match:
            lens = f"{lens_match.group(1)}mm"
        
        # Extract aperture (e.g., "f/1.4", "f/2.8")
        aperture_match = re.search(r'f/(\d+\.?\d*)', scene_content, re.IGNORECASE)
        if aperture_match:
            lens += f" f/{aperture_match.group(1)}"
        
        # Extract camera motion keywords
        motion_keywords = {
            "push": "slow_push_in",
            "pull": "reverse_pull_back",
            "tracking": "tracking_side_profile",
            "orbit": "steadicam_orbit_360",
            "tilt": "tilt_up_skyline",
            "pan": "whip_pan_transition",
            "drone": "overhead_gods_eye",
            "aerial": "overhead_gods_eye",
            "dolly": "dolly_in_rapid",
            "zoom": "dolly_zoom_vertigo",
        }
        for keyword, motion in motion_keywords.items():
            if keyword in scene_content.lower():
                motion_type = motion
                break
        
        # Extract lighting description
        lighting_match = re.search(r'(warm|golden|backlit|side|rim|natural|soft|hard)\s*(light|lighting|sunlight)', scene_content, re.IGNORECASE)
        if lighting_match:
            lighting = f"{lighting_match.group(1)} {lighting_match.group(2)}"
        
        # Clean description for diffusion model (remove camera specs to avoid confusion)
        clean_description = re.sub(r'camera\s*:\s*', '', scene_content, flags=re.IGNORECASE)
        clean_description = re.sub(r'\d+mm\s*(?:f/\d+\.?\d*)?', '', clean_description)
        
        scenes.append(SceneData(
            index=scene_num,
            title=f"Scene {scene_num}",
            description=clean_description.strip(),
            script="",  # User didn't provide script
            camera_angle=camera_angle or scene_content[:100],  # Use first part as angle if not found
            motion_type=motion_type or "static",
            lighting=lighting or "natural lighting",
            lens=lens or "50mm",
            duration_seconds=4.0  # Default, can be enhanced later
        ))
    
    # If parsing failed or got fewer scenes than expected, create fallback scenes
    if len(scenes) < num_scenes:
        for i in range(len(scenes), num_scenes):
            scenes.append(SceneData(
                index=i + 1,
                title=f"Scene {i + 1}",
                description=prompt,
                script="",
                duration_seconds=4.0
            ))
    
    return scenes[:num_scenes]

class CreativeDirectorAgent:
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

        # Apply storyboard preservation mode if detected
        if extracted.get("preserve_user_scenes"):
            context.preserve_user_scenes = True
            context.add_log(self.name, "Storyboard format detected — user's scene specifications will be preserved without AI regeneration.")
            
            # Parse user's storyboard into SceneData objects
            parsed_scenes = parse_user_storyboard(context.user_prompt, context.num_scenes)
            context.scenes = parsed_scenes
            context.add_log(self.name, f"Parsed {len(parsed_scenes)} scenes from user's storyboard with camera specifications preserved.")

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

        # 4b. Analyze prompt for Soundtrack / Native Audio directives
        if extracted.get("voice_provider") == "none":
            context.voice_provider = "none"
            context.add_log(self.name, "Native video audio mode active in prompt — background soundtrack & TTS set to None.")

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
            "preserve_user_scenes": context.preserve_user_scenes,
            "director_decisions": {
                "concept": context.user_prompt,
                "pacing": f"{context.num_scenes} scenes @ {duration_per_scene}s each (~{int(context.num_scenes * duration_per_scene)}s total)",
                "image_engine": f"{context.image_model} (Selected for photoreal texture & composition)",
                "video_engine": f"{context.video_model} (Temporal motion & character kinematics)",
                "skill_applied": active_skill_data["name"] if active_skill_data else "None (Pure Prompt)",
                "mode": context.mode,
                "autopilot_active": context.mode == "autonomous",
                "storyboard_preserved": context.preserve_user_scenes
            }
        }
        return AgentResult(success=True)
