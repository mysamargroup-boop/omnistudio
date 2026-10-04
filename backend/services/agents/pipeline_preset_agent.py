import logging
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult

logger = logging.getLogger("omnistudio.agents.preset")

class PipelinePresetAgent(BaseAgent):
    name = "PipelinePresetAgent"
    description = "Saves complete pipeline configuration into presets for 1-click rerun."
    icon = "bookmark"

    async def execute(self, context: PipelineContext) -> AgentResult:
        preset_data = {
            "name": f"Preset - {(context.user_prompt or 'Cinematic')[:30]}",
            "style": context.style,
            "aspect_ratio": context.aspect_ratio,
            "video_model": context.video_model,
            "voice_id": context.voice_id,
            "soundtrack_genre": getattr(context, "soundtrack_genre", "cinematic"),
            "num_scenes": len(context.scenes),
            "character_lock": context.character_lock,
            "character_name": context.character_name,
            "camera_directions": [s.camera_direction for s in context.scenes if s.camera_direction]
        }

        if not context.project_brief:
            context.project_brief = {}
        context.project_brief["saved_preset"] = preset_data
        context.add_log(self.name, f"Packaged pipeline configuration into 1-click reusable preset.")

        return AgentResult(success=True, data=preset_data)
