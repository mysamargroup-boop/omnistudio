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

class CreativeDirectorAgent(BaseAgent):
    name = "CreativeDirectorAgent"
    description = "Decomposes user prompt into a Project Brief and detects optimal diffusion model"
    icon = "clapperboard"

    async def execute(self, context: PipelineContext) -> AgentResult:
        # 1. Analyze prompt to see if user requested a specific model directly in prompt text
        explicit_model = detect_model_from_prompt(context.user_prompt)
        initial_model = context.image_model

        if explicit_model:
            context.image_model = explicit_model
            context.add_log(self.name, f"Detected model command in prompt — switched diffusion engine to '{explicit_model}'")
        elif context.image_model in {"auto", "auto_agent", None, ""}:
            inferred = infer_optimal_model(context.user_prompt, context.style)
            context.image_model = inferred
            context.add_log(self.name, f"Auto Director selected optimal diffusion engine '{inferred}' for prompt context")
        elif initial_model:
            context.add_log(self.name, f"Configured diffusion engine: '{initial_model}'")

        # 2. Configure video engine (Auto mode defaults to Omni Video Model)
        if not context.video_model or context.video_model in {"auto", "omni_model", "omni", ""}:
            context.video_model = "omni_model"
            context.add_log(self.name, "Auto Director configured video engine to 'Omni Video Model' (Neural Kinematics & Temporal Coherence)")
        else:
            context.add_log(self.name, f"Configured video engine: '{context.video_model}'")

        context.project_brief = {
            "title": f"{context.user_prompt[:25]}...",
            "genre": "Cinematic Storyboard",
            "mood": "Cinematic",
            "target_audience": "General",
            "scene_count": context.num_scenes,
            "visual_style": context.style,
            "diffusion_model": context.image_model,
            "video_model": "Omni Video Model (Neural Kinematics)",
            "color_palette": "Cinematic Contrast",
            "aspect_ratio": context.aspect_ratio
        }
        return AgentResult(success=True)
