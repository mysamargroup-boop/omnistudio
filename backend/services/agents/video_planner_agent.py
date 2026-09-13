from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult

class VideoPlannerAgent(BaseAgent):
    name = "VideoPlannerAgent"
    description = "Assigns video generation parameters to each scene"
    icon = "pie-chart"

    async def execute(self, context: PipelineContext) -> AgentResult:
        for scene in context.scenes:
            scene.motion_type = "ken_burns"
        return AgentResult(success=True)
