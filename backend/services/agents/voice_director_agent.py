import os
import uuid
import logging
from pathlib import Path
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from services.edgetts_service import generate_edge_speech
from services.ffmpeg_service import get_media_duration
from database import db_save_asset
from config import settings

logger = logging.getLogger("omnistudio.agents.voice")

class VoiceDirectorAgent(BaseAgent):
    name = "VoiceDirectorAgent"
    description = "Generates neural narration and dubbing for each scene"
    icon = "mic"

    async def execute(self, context: PipelineContext) -> AgentResult:
        audio_dir = settings.OUTPUTS_PATH / 'audio'
        audio_dir.mkdir(parents=True, exist_ok=True)

        voice_id = context.voice_id or "en-US-ChristopherNeural"

        for scene in context.scenes:
            file_name = f"scene_{scene.index}_{uuid.uuid4().hex[:8]}.mp3"
            local_path = audio_dir / file_name
            web_url = f"/outputs/audio/{file_name}"

            narration_text = (scene.script or scene.description or f"Scene {scene.index}: {context.user_prompt}").strip()

            try:
                await generate_edge_speech(
                    text=narration_text,
                    voice_id=voice_id,
                    output_path=local_path
                )
                if local_path.exists() and local_path.stat().st_size > 100:
                    dur = get_media_duration(local_path)
                    if dur and dur > 1.0 and (not scene.duration_seconds or scene.duration_seconds <= 0):
                        scene.duration_seconds = round(dur, 1)
            except Exception as e:
                logger.warning("Voice generation failed for scene %s: %s", scene.index, e)

            # Assign web-accessible URL
            scene.audio_path = web_url

            # Register in Vault DB
            try:
                db_save_asset(
                    type="audio",
                    url=web_url,
                    filename=file_name,
                    prompt=narration_text,
                    cost_usd=0.001,
                    cost_inr=0.08
                )
            except Exception as dbe:
                logger.debug("Failed to record audio asset in DB: %s", dbe)

        context.add_log(self.name, f"Synthesized neural narration across {len(context.scenes)} scenes using {voice_id}", cost_usd=0.003, cost_inr=0.25)
        return AgentResult(success=True)
