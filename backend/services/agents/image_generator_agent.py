import os
import uuid
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from config import settings

class ImageGeneratorAgent(BaseAgent):
    name = "ImageGeneratorAgent"
    description = "Generates images for each scene"
    icon = "image"

    async def execute(self, context: PipelineContext) -> AgentResult:
        os.makedirs(settings.OUTPUTS_PATH / 'images', exist_ok=True)
        for scene in context.scenes:
            file_name = f"scene_{scene.index}_{uuid.uuid4().hex[:6]}.png"
            output_path = settings.OUTPUTS_PATH / 'images' / file_name
            scene.image_path = str(output_path)
            # generate logic would go here
        return AgentResult(success=True)
