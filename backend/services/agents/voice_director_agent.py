import os
import uuid
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from config import settings

class VoiceDirectorAgent(BaseAgent):
    name = "VoiceDirectorAgent"
    description = "Generates voiceover for each scene"
    icon = "mic"

    async def execute(self, context: PipelineContext) -> AgentResult:
        os.makedirs(settings.OUTPUTS_PATH / 'audio', exist_ok=True)
        for scene in context.scenes:
            file_name = f"scene_{scene.index}_{uuid.uuid4().hex[:6]}.mp3"
            output_path = settings.OUTPUTS_PATH / 'audio' / file_name
            scene.audio_path = str(output_path)
        return AgentResult(success=True)
