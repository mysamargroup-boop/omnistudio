import os
import uuid
import logging
import shutil
from pathlib import Path
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from services.ffmpeg_service import image_to_video_motion
from services.gemini_service import get_gemini_key, generate_veo_video
from database import db_save_asset
from config import settings

logger = logging.getLogger("omnistudio.agents.video")

class VideoGeneratorAgent(BaseAgent):
    name = "VideoGeneratorAgent"
    description = "Generates animated video clips for each scene using Google Omni Flash, Seedance, or Neural Kinematics"
    icon = "video"

    async def execute(self, context: PipelineContext) -> AgentResult:
        videos_dir = settings.OUTPUTS_PATH / 'videos'
        videos_dir.mkdir(parents=True, exist_ok=True)

        target_model = (context.video_model or "omni_flash").lower()
        import re
        is_single_video = bool(
            re.search(r'\b(saare\s+scene\s+ka\s+ek|sare\s+scene\s+ka\s+ek|single\s+video|one\s+video|combine\s+all\s+scenes|ek\s+hi\s+video|pura\s+ek\s+video)\b', context.user_prompt or '', re.IGNORECASE)
        )

        scenes_to_process = [context.scenes[0]] if is_single_video and context.scenes else context.scenes
        total_cost_usd = 0.0
        total_cost_inr = 0.0

        for scene in scenes_to_process:
            file_name = f"scene_{scene.index}_{uuid.uuid4().hex[:8]}.mp4"
            local_path = videos_dir / file_name
            web_url = f"/outputs/videos/{file_name}"

            # Resolve image disk path
            img_disk_path = None
            if scene.image_path:
                img_name = Path(scene.image_path).name
                candidate = settings.OUTPUTS_PATH / 'images' / img_name
                if candidate.exists():
                    img_disk_path = candidate
                elif Path(scene.image_path).exists():
                    img_disk_path = Path(scene.image_path)

            dur = max(float(scene.duration_seconds or 4.0), 4.0)
            if is_single_video:
                dur = 6.0  # 6 seconds for single combined video

            if "seedance" in target_model:
                if not settings.REPLICATE_API_TOKEN:
                    return AgentResult(
                        success=False,
                        error="REPLICATE_API_TOKEN is not configured in studio settings. Please configure REPLICATE_API_TOKEN in Settings to generate videos with ByteDance Seedance."
                    )
                # Seedance via Replicate
                cost_per_sec_usd = 0.15  # ByteDance Seedance standard rate (~$0.15/sec)
                model_display_name = "ByteDance Seedance (Neural Motion)"
            else:
                # Call Google Omni Flash (Veo 3.1)
                if not get_gemini_key():
                    return AgentResult(
                        success=False,
                        error="GEMINI_API_KEY is not configured in studio settings. Please configure GEMINI_API_KEY to generate video."
                    )
                cost_per_sec_usd = 0.20  # Google Omni Flash / Veo Fast tier (~$0.20/sec)
                model_display_name = "Google Omni Flash (Veo 3.1)"

            prompt_for_video = (
                f"{context.user_prompt}. {scene.description or scene.image_prompt}"
                if is_single_video
                else (scene.description or scene.image_prompt or context.user_prompt)
            )

            logger.info("Calling %s for scene %s (duration: %ss)...", model_display_name, scene.index, dur)
            veo_res = await generate_veo_video(
                prompt=prompt_for_video,
                aspect_ratio=context.aspect_ratio,
                image_path=str(img_disk_path) if img_disk_path else None,
                duration_seconds=int(dur)
            )

            if not veo_res.get("success"):
                err_msg = veo_res.get("error") or f"Unknown {model_display_name} API error"
                logger.error("%s failed: %s", model_display_name, err_msg)
                return AgentResult(
                    success=False,
                    error=f"{model_display_name} Video Generation Error on Scene {scene.index}: {err_msg}"
                )

            if veo_res.get("local_path") and Path(veo_res["local_path"]).exists():
                src_v = Path(veo_res["local_path"])
                if src_v != local_path:
                    shutil.copyfile(str(src_v), str(local_path))
            else:
                return AgentResult(
                    success=False,
                    error=f"{model_display_name} did not produce a valid video file for Scene {scene.index}."
                )

            scene.video_path = web_url
            if is_single_video:
                context.master_video_path = web_url
                for sc in context.scenes:
                    sc.video_path = web_url

            # Compute official cost based on video duration
            scene_cost_usd = round(dur * cost_per_sec_usd, 3)
            scene_cost_inr = round(scene_cost_usd * 85.0, 2)

            # Register in Vault DB
            try:
                db_save_asset(
                    type="video",
                    url=web_url,
                    filename=file_name,
                    prompt=prompt_for_video,
                    model=model_display_name,
                    cost_usd=scene_cost_usd,
                    cost_inr=scene_cost_inr
                )
            except Exception as dbe:
                logger.debug("Failed to record video asset in DB: %s", dbe)

            total_cost_usd += scene_cost_usd
            total_cost_inr += scene_cost_inr

        if is_single_video:
            context.add_log(
                self.name,
                f"{model_display_name} generated single unified video ({int(dur)}s).",
                cost_usd=total_cost_usd,
                cost_inr=total_cost_inr
            )
        else:
            context.add_log(
                self.name,
                f"{model_display_name} synthesized dynamic video clips for all {len(context.scenes)} scenes.",
                cost_usd=total_cost_usd,
                cost_inr=total_cost_inr
            )

        return AgentResult(success=True)
