from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult

class StoryboardPlannerAgent(BaseAgent):
    name = "StoryboardPlannerAgent"
    description = "Assigns camera angles, composition, lighting to scenes"
    icon = "layout"

    async def execute(self, context: PipelineContext) -> AgentResult:
        for scene in context.scenes:
            scene.camera_angle = "Wide shot"
            scene.lighting = "Cinematic lighting"
            scene.description = f"Visuals showing {context.user_prompt} in a dynamic way."
        return AgentResult(success=True)
