import json
import logging
import re
from typing import List
from config import settings
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from services.skills_service import skill_manager

logger = logging.getLogger("omnistudio.agents.storyboard_planner")

CINEMATIC_CAMERA_MOTIONS = [
    {"name": "dolly_zoom_vertigo", "desc": "Hitchcock Vertigo dolly zoom, background warping while subject size remains constant"},
    {"name": "fpv_drone_dive", "desc": "High-speed FPV cinematic drone dive swooping through the environment"},
    {"name": "dutch_angle_tilt", "desc": "Canted Dutch angle roll 18° creating dramatic psychological tension"},
    {"name": "low_angle_hero_track", "desc": "Low-angle upward hero tracking shot moving alongside the subject"},
    {"name": "crane_pedestal_reveal", "desc": "Jib crane ascending rapidly from ground level to reveal the expansive vista"},
    {"name": "steadicam_orbit_360", "desc": "Smooth 360-degree circular Steadicam orbit maintaining perfect subject tracking"},
    {"name": "whip_pan_transition", "desc": "Kinetic high-speed whip pan motion blur sweeping into the focal point"},
    {"name": "rack_focus_shallow", "desc": "Extreme shallow depth-of-field rack focus shifting from foreground element to character"},
    {"name": "handheld_cinema_verite", "desc": "Raw, visceral handheld camera with micro-jitter and organic documentary realism"},
    {"name": "overhead_gods_eye", "desc": "Direct top-down 90-degree God's eye perspective descending toward the scene"},
    {"name": "tracking_side_profile", "desc": "Lateral dolly tracking shot running parallel to the subject's movement"},
    {"name": "extreme_close_up_macro", "desc": "Macro cine probe lens push-in revealing intense micro-textures and eye reflections"},
    {"name": "slow_push_in", "desc": "Subtle, suspenseful 2.39:1 anamorphic push-in tightening on subject's expression"},
    {"name": "reverse_pull_back", "desc": "Slow dramatic reverse dolly pull-back isolating the character in vast surroundings"},
    {"name": "tilt_up_skyline", "desc": "Smooth fluid-head tilt upward from reflection up to towering architectural silhouettes"},
    {"name": "orbit_left_arc", "desc": "Dynamic 120-degree parabolic arc tracking around the protagonist"},
    {"name": "crane_down_low", "desc": "Heavy techno-crane plunging from sky height down to eye-level intimacy"},
    {"name": "fpv_flythrough", "desc": "Precise cinematic fly-through passing beneath obstacles with dynamic banking"},
    {"name": "whip_tilt_down", "desc": "Fast vertical whip tilt snapping down to reveal sudden narrative action"},
    {"name": "dolly_in_rapid", "desc": "Aggressive, high-impact dolly rush forward creating sudden visual urgency"}
]

CINEMATIC_LENSES = [
    "35mm Anamorphic T1.5 (Oval Bokeh, Horizontal Streaks)",
    "85mm Portrait Cine Prime T1.2 (Ultra-Shallow Depth of Field)",
    "24mm Master Prime Ultra-Wide (Deep Focus & Epic Architecture)",
    "50mm Cooke Speed Panchro (Classic Hollywood Organic Falloff)",
    "100mm Macro Cine Probe (Extreme Micro-Detail & Textures)",
    "18mm Extreme Wide Fisheye (Distorted Hyper-Dynamic Perspective)"
]

LIGHTING_BY_STYLE = {
    "photoreal": [
        "Warm golden hour natural sunlight with soft atmospheric haze",
        "Overcast softbox diffusion with pristine color fidelity and natural skin tones",
        "Open shade ambient daylight with subtle fill bounce and clean highlights",
        "Window-lit Vermeer chiaroscuro with gentle directional warmth",
        "Blue hour twilight ambiance with cool natural tones and long shadows",
        "High-noon directional sunlight with crisp hard shadows and vivid color"
    ],
    "cinematic": [
        "High-contrast Rembrandt chiaroscuro with deep atmospheric shadows",
        "Golden hour directional rim lighting with volumetric dust motes",
        "Dramatic backlit silhouette with warm amber flare and smoke haze",
        "Tungsten practical lighting with motivated pools of warm contrast",
        "Overcast softbox diffusion with pristine color fidelity",
        "Hard tungsten spotlight piercing darkness with heavy lens flare"
    ],
    "cyberpunk": [
        "Neon cyberpunk split-lighting with cyan key and magenta fill",
        "Bioluminescent ambient caustics with cool-toned volumetric fog",
        "Rain-soaked neon reflections with wet asphalt specular highlights",
        "Holographic LED strip wash with deep purple and electric blue glow",
        "Foggy back-alley sodium vapor with fluorescent flicker accents",
        "Laser grid matrix with prismatic lens flare and smoke trails"
    ],
    "anime": [
        "Vibrant painterly sunset with luminous cloud edges and warm glow",
        "Soft pastel ambient light with dreamy bloom and color diffusion",
        "Dramatic backlit character silhouette with radiant sky gradient",
        "Moonlit night with gentle blue fill and sparkling particle effects",
        "Cherry blossom dappled sunlight with warm pink-tinted atmosphere",
        "Stormy dramatic sky with contrast lightning flash illumination"
    ],
    "3d_pixar": [
        "Soft warm studio three-point lighting with subsurface glow",
        "Vibrant key light with colorful bounce fill and subtle rim",
        "Warm sunset environmental lighting with long expressive shadows",
        "Cool moonlit night with stylized blue tones and warm lamp practicals",
        "Bright cheerful overcast with even diffusion and saturated colors",
        "Dramatic spot with deep shadow and playful colored rim highlights"
    ],
}

def get_lighting_for_style(style: str, index: int) -> str:
    """Get style-appropriate lighting setup, never cross-contaminating styles."""
    setups = LIGHTING_BY_STYLE.get(style, LIGHTING_BY_STYLE["cinematic"])
    return setups[index % len(setups)]

class StoryboardPlannerAgent(BaseAgent):
    name = "StoryboardPlannerAgent"
    description = "Choreographs cinematic camera angles, lens choices, lighting, and diverse motion kinematics"
    icon = "layout"

    async def execute(self, context: PipelineContext) -> AgentResult:
        # Skip if user provided detailed storyboard (preserve_user_scenes flag)
        if context.preserve_user_scenes:
            context.add_log(self.name, "Storyboard preservation mode active — skipping AI camera motion generation to preserve user's camera specifications.")
            return AgentResult(success=True)
        
        if not context.scenes:
            return AgentResult(success=True)

        # ── Load active directorial skill (if selected) ──
        active_skill = None
        if context.skill_id:
            active_skill = skill_manager.get_skill(context.skill_id)
            if active_skill:
                logger.info("StoryboardPlanner using skill: %s", active_skill.name)

        # Override camera motions, lenses, lighting with skill data if available
        effective_camera_motions = CINEMATIC_CAMERA_MOTIONS
        effective_lenses = CINEMATIC_LENSES
        effective_lighting = LIGHTING_BY_STYLE.get(context.style, LIGHTING_BY_STYLE["cinematic"])

        if active_skill:
            if active_skill.camera_motions:
                # Convert skill camera motion strings to the dict format used by the prompt
                effective_camera_motions = [
                    {"name": cm, "desc": cm.replace("_", " ").title()}
                    for cm in active_skill.camera_motions
                ]
            if active_skill.lenses:
                effective_lenses = active_skill.lenses
            if active_skill.lighting_presets:
                effective_lighting = active_skill.lighting_presets

        num_scenes = len(context.scenes)
        
        skill_system_prompt = ""
        if active_skill and active_skill.system_prompt:
            skill_system_prompt = active_skill.system_prompt + "\n\n"
            
        prompt_text = f"""{skill_system_prompt}You are a master Hollywood director of photography (DP) and visual storyboard artist.
Analyze this film project:
Prompt: "{context.user_prompt}"
Style: "{context.style}"
Number of scenes: {num_scenes}

Assign a DISTINCT, highly cinematic camera angle, lens, lighting, and camera motion for each scene.
STRICT RULE: Do NOT use boring, repetitive camera motions like simple 'push' or 'pan' or 'zoom' for all scenes.
You MUST choose from these advanced cinematography motions:
{json.dumps([m['name'] + ' (' + m['desc'] + ')' for m in effective_camera_motions])}

CRITICAL STYLE ENFORCEMENT — The selected visual style is "{context.style}".
You MUST keep ALL lighting, color grading, and atmosphere STRICTLY consistent with "{context.style}" aesthetic.
Approved lighting options for "{context.style}" style:
{json.dumps(effective_lighting)}
Choose ONLY from the approved lighting options listed above for the "{context.style}" style.

STAY FAITHFUL: The scene descriptions MUST accurately reflect the user's concept. Do not add or replace the subject, setting, or atmosphere with anything the user did not write.
The "description" field should elaborate on the user's concept with camera framing details, not replace it.

Return ONLY a JSON array with exactly {num_scenes} objects, matching this schema:
[
  {{
    "index": 0,
    "camera_angle": "Low-angle hero tracking shot",
    "motion_type": "low_angle_hero_track",
    "lighting": "Golden hour rim lighting with volumetric haze",
    "lens": "35mm Anamorphic T1.5",
    "description": "Visual choreography description for diffusion model..."
  }}
]
"""
        generated_scenes = None

        # 1. Try OpenAI (Tier 1 Primary for Storyboard & Director Planning)
        from services.openai_service import get_openai_key, generate_openai_chat
        openai_key = get_openai_key()
        if openai_key:
            try:
                res = await generate_openai_chat(
                    messages=[
                        {"role": "system", "content": "You are a master Hollywood cinematography director and visual storyboard planner."},
                        {"role": "user", "content": prompt_text}
                    ],
                    model="gpt-4o",
                    temperature=0.7
                )
                if res.get("success") and res.get("text"):
                    match = re.search(r'\[.*\]', res["text"], re.DOTALL)
                    if match:
                        parsed = json.loads(match.group(0))
                        if isinstance(parsed, list) and len(parsed) >= num_scenes:
                            generated_scenes = parsed
                            logger.info("StoryboardPlanner successfully planned %s scenes with OpenAI %s", len(parsed), res.get("model"))
            except Exception as e:
                logger.warning("OpenAI storyboard planner call failed: %s, falling back to Gemini", e)

        # 2. Try Gemini (Tier 2 Fallback)
        if not generated_scenes:
            try:
                from services.gemini_service import get_gemini_key, generate_gemini_text
                if get_gemini_key():
                    res = await generate_gemini_text(prompt_text)
                    if res.get("success") and res.get("text"):
                        match = re.search(r'\[.*\]', res["text"], re.DOTALL)
                        if match:
                            parsed = json.loads(match.group(0))
                            if isinstance(parsed, list) and len(parsed) >= num_scenes:
                                generated_scenes = parsed
            except Exception as e:
                logger.warning("Gemini storyboard planner call failed: %s", e)

        # Apply generated or rich algorithmic progression (style-aware lighting)
        for i, scene in enumerate(context.scenes):
            base_action = scene.description or context.user_prompt
            if generated_scenes and i < len(generated_scenes):
                plan = generated_scenes[i]
                scene.camera_angle = plan.get("camera_angle") or effective_camera_motions[i % len(effective_camera_motions)]["name"]
                scene.motion_type = plan.get("motion_type") or effective_camera_motions[i % len(effective_camera_motions)]["name"]
                scene.lighting = plan.get("lighting") or (effective_lighting[i % len(effective_lighting)] if isinstance(effective_lighting, list) else get_lighting_for_style(context.style, i))
                plan_desc = plan.get("description", "").strip()
                if plan_desc and plan_desc.lower() not in base_action.lower():
                    scene.description = f"{base_action}. Visual framing: {plan_desc}"
                else:
                    scene.description = base_action
            else:
                # Algorithmic diverse assignment guaranteeing NO repeated motions
                motion_info = effective_camera_motions[i % len(effective_camera_motions)]
                lens_info = effective_lenses[i % len(effective_lenses)]
                lighting_info = effective_lighting[i % len(effective_lighting)] if isinstance(effective_lighting, list) else get_lighting_for_style(context.style, i)

                scene.motion_type = motion_info["name"]
                scene.camera_angle = motion_info["desc"].split(",")[0]
                scene.lighting = lighting_info
                # Preserve the core action and subject! Do not overwrite with just camera metadata
                scene.description = f"{base_action}. Shot framing: {scene.camera_angle} with {lens_info}."

        return AgentResult(success=True)

