from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult

class PromptEngineerAgent(BaseAgent):
    name = "PromptEngineerAgent"
    description = "Converts storyboard frames into optimized diffusion model prompts"
    icon = "sparkles"

    async def execute(self, context: PipelineContext) -> AgentResult:
        # We use a mocked/local approach or the prompt enhancer service
        for scene in context.scenes:
            scene.image_prompt = f"Cinematic shot, {scene.description}, {scene.camera_angle}, {scene.lighting}, {context.style} style, 8k, highly detailed"
            scene.negative_prompt = "low quality, blurry, distorted, watermark"
        return AgentResult(success=True)
