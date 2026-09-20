import os
import uuid
import logging
import shutil
from pathlib import Path
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from services.edgetts_service import generate_edge_speech
from services.elevenlabs_service import generate_elevenlabs_speech
from services.ffmpeg_service import get_media_duration
from database import db_save_asset
from config import settings

logger = logging.getLogger("omnistudio.agents.voice")

class VoiceDirectorAgent(BaseAgent):
    name = "VoiceDirectorAgent"
    description = "Generates neural narration and dubbing for each scene using ElevenLabs Studio Voice or Microsoft Edge Neural"
    icon = "mic"

    async def execute(self, context: PipelineContext) -> AgentResult:
        audio_dir = settings.OUTPUTS_PATH / 'audio'
        audio_dir.mkdir(parents=True, exist_ok=True)

        use_elevenlabs = (context.voice_provider == "elevenlabs") or bool(settings.ELEVENLABS_API_KEY and str(settings.ELEVENLABS_API_KEY).strip())
        eleven_voice = context.voice_id or "pNInz6obpgDQGcFmaJgB"
        edge_voice = context.voice_id if (context.voice_id and "Neural" in context.voice_id) else "en-US-ChristopherNeural"
        voice_label = f"ElevenLabs ({eleven_voice[:8]}...)" if use_elevenlabs else f"Edge Neural ({edge_voice})"

        for scene in context.scenes:
            file_name = f"scene_{scene.index}_{uuid.uuid4().hex[:8]}.mp3"
            local_path = audio_dir / file_name
            web_url = f"/outputs/audio/{file_name}"

            narration_text = (scene.script or scene.description or f"Scene {scene.index}: {context.user_prompt}").strip()
            audio_generated = False

            # 1. Try ElevenLabs if selected or key is present
            if use_elevenlabs and settings.ELEVENLABS_API_KEY:
                try:
                    el_res = await generate_elevenlabs_speech(
                        text=narration_text,
                        voice_id=eleven_voice
                    )
                    if el_res.get("success") and el_res.get("local_path") and Path(el_res["local_path"]).exists():
                        src_a = Path(el_res["local_path"])
                        if src_a != local_path:
                            shutil.copyfile(str(src_a), str(local_path))
                        audio_generated = True
                        voice_label = "ElevenLabs Studio Voice"
                except Exception as e:
                    logger.warning("ElevenLabs voice generation attempt failed: %s", e)

            # 2. Free High-Fidelity Fallback: Microsoft Edge Neural TTS
            if not audio_generated:
                try:
                    await generate_edge_speech(
                        text=narration_text,
                        voice_id=edge_voice,
                        output_path=local_path
                    )
                    if local_path.exists() and local_path.stat().st_size > 100:
                        audio_generated = True
                        if use_elevenlabs:
                            voice_label = "Edge Neural Voice (ElevenLabs Fallback)"
                except Exception as ee:
                    logger.warning("Edge TTS voice generation failed for scene %s: %s", scene.index, ee)

            if local_path.exists() and local_path.stat().st_size > 100:
                dur = get_media_duration(local_path)
                if dur and dur > 1.0 and (not scene.duration_seconds or scene.duration_seconds <= 0):
                    scene.duration_seconds = round(dur, 1)

            # Assign web-accessible URL
            scene.audio_path = web_url

            # Register in Vault DB
            try:
                db_save_asset(
                    type="audio",
                    url=web_url,
                    filename=file_name,
                    prompt=narration_text,
                    model=voice_label,
                    cost_usd=0.003 if "ElevenLabs" in voice_label else 0.001,
                    cost_inr=0.25 if "ElevenLabs" in voice_label else 0.08
                )
            except Exception as dbe:
                logger.debug("Failed to record audio asset in DB: %s", dbe)

        context.add_log(
            self.name,
            f"Synthesized neural narration across {len(context.scenes)} scenes using {voice_label}.",
            cost_usd=0.008 if "ElevenLabs" in voice_label else 0.003,
            cost_inr=0.67 if "ElevenLabs" in voice_label else 0.25
        )
        return AgentResult(success=True)
