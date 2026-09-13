import os
import uuid
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from config import settings

class VideoGeneratorAgent(BaseAgent):
    name = "VideoGeneratorAgent"
    description = "Generates videos for each scene"
    icon = "video"

    async def execute(self, context: PipelineContext) -> AgentResult:
        os.makedirs(settings.OUTPUTS_PATH / 'videos', exist_ok=True)
        for scene in context.scenes:
            file_name = f"scene_{scene.index}_{uuid.uuid4().hex[:6]}.mp4"
            output_path = settings.OUTPUTS_PATH / 'videos' / file_name
            scene.video_path = str(output_path)
        return AgentResult(success=True)
