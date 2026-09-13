from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult

class CreativeDirectorAgent(BaseAgent):
    name = "CreativeDirectorAgent"
    description = "Decomposes user prompt into a Project Brief"
    icon = "clapperboard"

    async def execute(self, context: PipelineContext) -> AgentResult:
        context.project_brief = {
            "title": f"{context.user_prompt[:20]}...",
            "genre": "Documentary",
            "mood": "Cinematic",
            "target_audience": "General",
            "scene_count": context.num_scenes,
            "visual_style": context.style,
            "color_palette": "Moody",
            "aspect_ratio": context.aspect_ratio
        }
        return AgentResult(success=True)
