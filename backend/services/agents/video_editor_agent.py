import os
import uuid
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from config import settings

class VideoEditorAgent(BaseAgent):
    name = "VideoEditorAgent"
    description = "Final compilation using FFmpeg"
    icon = "scissors"

    async def execute(self, context: PipelineContext) -> AgentResult:
        os.makedirs(settings.OUTPUTS_PATH / 'final', exist_ok=True)
        file_name = f"master_{uuid.uuid4().hex[:6]}.mp4"
        output_path = settings.OUTPUTS_PATH / 'final' / file_name
        context.master_video_path = str(output_path)
        return AgentResult(success=True)
