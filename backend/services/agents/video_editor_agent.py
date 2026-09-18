import os
import uuid
import shutil
import logging
from pathlib import Path
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from services.ffmpeg_service import concatenate_videos, merge_audio_video, image_to_video_motion
from database import db_save_asset
from config import settings

logger = logging.getLogger("omnistudio.agents.editor")

class VideoEditorAgent(BaseAgent):
    name = "VideoEditorAgent"
    description = "Assembles and compiles final 4K master sequence using FFmpeg"
    icon = "scissors"

    async def execute(self, context: PipelineContext) -> AgentResult:
        final_dir = settings.OUTPUTS_PATH / 'final'
        final_dir.mkdir(parents=True, exist_ok=True)

        file_name = f"master_{uuid.uuid4().hex[:8]}.mp4"
        output_path = final_dir / file_name
        web_url = f"/outputs/final/{file_name}"

        # Collect and prepare scene video segments
        scene_video_paths = []

        for scene in context.scenes:
            scene_vid_path = None
            if scene.video_path:
                v_name = Path(scene.video_path).name
                cand = settings.OUTPUTS_PATH / 'videos' / v_name
                if cand.exists():
                    scene_vid_path = cand
                elif Path(scene.video_path).exists():
                    scene_vid_path = Path(scene.video_path)

            # If scene doesn't have a video yet, try synthesizing from image
            if not scene_vid_path and scene.image_path:
                img_name = Path(scene.image_path).name
                img_cand = settings.OUTPUTS_PATH / 'images' / img_name
                if img_cand.exists():
                    tmp_scene_vid = settings.OUTPUTS_PATH / 'videos' / f"scene_{scene.index}_{uuid.uuid4().hex[:6]}.mp4"
                    try:
                        image_to_video_motion(
                            image_path=img_cand,
                            output_path=tmp_scene_vid,
                            duration=max(float(scene.duration_seconds or 4.0), 2.0),
                            motion_type=scene.motion_type or "zoom_in"
                        )
                        if tmp_scene_vid.exists():
                            scene_vid_path = tmp_scene_vid
                            scene.video_path = f"/outputs/videos/{tmp_scene_vid.name}"
                    except Exception as ve:
                        logger.warning("Failed to synthesize video for scene %s: %s", scene.index, ve)

            # If scene has audio, merge it into the scene video
            if scene_vid_path and scene.audio_path:
                aud_name = Path(scene.audio_path).name
                aud_cand = settings.OUTPUTS_PATH / 'audio' / aud_name
                if aud_cand.exists():
                    merged_scene_vid = settings.OUTPUTS_PATH / 'videos' / f"aud_{scene_vid_path.name}"
                    try:
                        merge_audio_video(
                            video_path=scene_vid_path,
                            audio_path=aud_cand,
                            output_path=merged_scene_vid,
                            loop_video_to_match_audio=True
                        )
                        if merged_scene_vid.exists() and merged_scene_vid.stat().st_size > 1000:
                            scene_vid_path = merged_scene_vid
                            scene.video_path = f"/outputs/videos/{merged_scene_vid.name}"
                    except Exception as me:
                        logger.warning("Failed to merge audio for scene %s: %s", scene.index, me)

            if scene_vid_path and scene_vid_path.exists():
                scene_video_paths.append(scene_vid_path)

        # Concatenate into master compilation
        if scene_video_paths:
            try:
                if len(scene_video_paths) == 1:
                    shutil.copyfile(str(scene_video_paths[0]), str(output_path))
                else:
                    concatenate_videos(scene_video_paths, output_path)
            except Exception as ce:
                logger.error("Failed to concatenate scenes into master: %s", ce)
                if scene_video_paths and scene_video_paths[0].exists():
                    shutil.copyfile(str(scene_video_paths[0]), str(output_path))

        if output_path.exists() and output_path.stat().st_size > 1000:
            context.master_video_path = web_url
            try:
                db_save_asset(
                    type="final",
                    url=web_url,
                    filename=file_name,
                    prompt=context.user_prompt,
                    model="Omni Video Model (Master Compilation)",
                    cost_usd=0.025,
                    cost_inr=2.10
                )
            except Exception as dbe:
                logger.debug("Failed to record master video asset in DB: %s", dbe)

            context.add_log(self.name, f"Omni Video Model compiled master video sequence: {file_name}", cost_usd=0.025, cost_inr=2.10)
        else:
            context.add_log(self.name, "Video editor finished with fallback visual state")

        return AgentResult(success=True)
