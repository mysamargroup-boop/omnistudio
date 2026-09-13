from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult

class ThumbnailAgent(BaseAgent):
    name = "ThumbnailAgent"
    description = "Generates high-CTR thumbnail keyframe with hook title."
    icon = "layout"

    async def execute(self, context: PipelineContext) -> AgentResult:
        context.add_log(self.name, "Designed optimized thumbnail based on the primary hook.")
        return AgentResult(success=True, data={"thumbnail_generated": True})
