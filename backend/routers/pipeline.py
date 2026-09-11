import uuid
import time
import json
import asyncio
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from limiter import limiter
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
from config import settings
from services.prompt_enhancer import generate_storyboard, enhance_prompt, draft_step_prompts
from services.openai_service import generate_openai_image
from services.replicate_service import generate_video_from_image
from services.elevenlabs_service import generate_elevenlabs_speech
from services.ffmpeg_service import merge_video_audio, concatenate_videos
import logging

logger = logging.getLogger("omnistudio.pipeline")

from pydantic import BaseModel, field_validator

router = APIRouter(prefix="/api/pipeline", tags=["Auto Pipeline"])

ALLOWED_PIPELINE_ASPECTS = {"16:9", "9:16", "1:1", "4:3", "21:9"}

class PipelineRequest(BaseModel):
    topic: str
    num_scenes: int = 3
    image_model: str = "dall-e-3"
    voice_id: str = "pNInz6obpgDQGcFmaJgB"
    voice_provider: str = "edge"
    enhance_prompts: bool = True
    style: str = "cinematic"
    aspect_ratio: str = "16:9"
    image_prompt: Optional[str] = None
    motion_prompt: Optional[str] = None
    voice_script: Optional[str] = None

    @field_validator("topic")
    @classmethod
    def validate_topic(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Pipeline topic/idea cannot be empty")
        if len(s) > 1000:
            raise ValueError("Pipeline topic cannot exceed 1000 characters")
        return s

    @field_validator("num_scenes")
    @classmethod
    def validate_scenes(cls, v: int) -> int:
        if not (1 <= v <= 8):
            raise ValueError("num_scenes must be between 1 and 8")
        return int(v)

    @field_validator("aspect_ratio")
    @classmethod
    def validate_aspect(cls, v: str) -> str:
        if v not in ALLOWED_PIPELINE_ASPECTS:
            return "16:9"
        return v

def time_to_vtt(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"

def time_to_srt(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def generate_subtitles(scenes: list, output_base: Path) -> dict:
    """Generate both WebVTT (.vtt) and SubRip (.srt) subtitle files for synchronized playback."""
    vtt_lines = ["WEBVTT\n"]
    srt_lines = []
    current_time = 0.0
    for idx, scene in enumerate(scenes, 1):
        duration = float(scene.get("duration", 5.0))
        start_sec = current_time
        end_sec = current_time + duration
        current_time = end_sec
        narration = scene.get("narration", f"Scene {idx}").strip()
        start_vtt = time_to_vtt(start_sec)
        end_vtt = time_to_vtt(end_sec)
        vtt_lines.append(f"{start_vtt} --> {end_vtt}\n{narration}\n")
        start_srt = time_to_srt(start_sec)
        end_srt = time_to_srt(end_sec)
        srt_lines.append(f"{idx}\n{start_srt} --> {end_srt}\n{narration}\n")
    vtt_file = output_base.with_suffix(".vtt")
    srt_file = output_base.with_suffix(".srt")
    try:
        with open(vtt_file, "w", encoding="utf-8") as f:
            f.write("\n".join(vtt_lines))
        with open(srt_file, "w", encoding="utf-8") as f:
            f.write("\n".join(srt_lines))
        return {
            "vtt_url": f"/outputs/final/{vtt_file.name}",
            "srt_url": f"/outputs/final/{srt_file.name}",
            "vtt_path": str(vtt_file),
            "srt_path": str(srt_file)
        }
    except Exception as e:
        print(f"[Subtitle Generation Warning] {e}")
        return {}

async def execute_pipeline_core(req: PipelineRequest, progress_callback=None) -> dict:
    """
    Core pipeline execution logic supporting optional async progress callbacks.
    progress_callback(dict)
    """
    job_id = uuid.uuid4().hex[:12]
    start_time = time.time()
    steps = []

    async def notify(stage: str, progress: int, step: int, message: str, extra: Optional[dict] = None):
        if progress_callback:
            await progress_callback({
                "job_id": job_id,
                "stage": stage,
                "progress": progress,
                "step": step,
                "message": message,
                "timestamp": time.strftime("%H:%M:%S"),
                **(extra or {})
            })

    await notify("init", 5, 0, f"Initializing Cinema Director Agent for: '{req.topic[:45]}...'")

    # Step 1: Generate Storyboard or Use Explicit Step Prompts
    if req.image_prompt:
        scenes = [{
            "scene_number": 1,
            "title": f"Director Master: {req.topic[:35]}",
            "visual_prompt": req.image_prompt,
            "camera_motion": req.motion_prompt or "zoom_in",
            "duration": 5.0,
            "narration": req.voice_script or req.topic
        }]
        steps.append({"step": 1, "name": "Directorial Prompts", "status": "done", "scenes": 1})
        await notify("storyboard_done", 22, 1, "Custom stage prompts locked for sequential generation.", {"scenes": scenes})
    else:
        await notify("storyboard_start", 12, 0, "Drafting 3-act cinematic screenplay & scene compositions...")
        scenes = await generate_storyboard(req.topic, req.num_scenes)
        steps.append({"step": 1, "name": "Storyboard", "status": "done", "scenes": len(scenes)})
        await notify("storyboard_done", 22, 1, f"Director screenplay finalized ({len(scenes)} scenes drafted).", {"scenes": scenes})

    scene_outputs = []
    total_scenes = len(scenes)

    for i, scene in enumerate(scenes):
        scene_num = i + 1
        scene_data = {"scene": scene_num, "title": scene.get("title", f"Scene {scene_num}")}
        base_progress = 22 + int((i / total_scenes) * 58)

        # ── Visual Generation ──
        visual = scene.get("visual_prompt", req.topic)
        if req.enhance_prompts:
            visual = await enhance_prompt(visual, req.style)

        await notify(
            "scene_visual",
            base_progress + int(0.25 * (58 / total_scenes)),
            1,
            f"Scene {scene_num}/{total_scenes}: Synthesizing visual keyframe ({req.image_model})...",
            {"scene": scene_num, "total_scenes": total_scenes}
        )

        if req.image_model in ["imagen_3", "gemini_flash_image", "google_gemini"]:
            from services.gemini_service import generate_gemini_image
            img_result = await generate_gemini_image(visual)
        else:
            img_result = await generate_openai_image(
                prompt=visual, model=req.image_model, size="1792x1024" if req.aspect_ratio == "16:9" else "1024x1024"
            )

        if not img_result.get("success") or not img_result.get("local_path"):
            err_detail = img_result.get("error", "Visual generation failed for this scene")
            logger.error("Scene %s image synthesis failed: %s", scene_num, err_detail)
            raise RuntimeError(f"Scene {scene_num} visual failed: {err_detail}. Please check your API keys in Settings.")
        scene_data["image"] = img_result

        # ── Camera Motion Generation ──
        motion = scene.get("camera_motion", "zoom_in")
        duration = scene.get("duration", 5.0)

        await notify(
            "scene_motion",
            base_progress + int(0.50 * (58 / total_scenes)),
            2,
            f"Scene {scene_num}/{total_scenes}: Calculating camera kinematics ({motion}, {duration}s)...",
            {"scene": scene_num, "total_scenes": total_scenes}
        )

        vid_result = await generate_video_from_image(
            image_path=img_result.get("local_path", ""), motion_type=motion, duration=duration
        )
        if not vid_result.get("success") or not vid_result.get("local_path"):
            vid_result = {
                "success": True,
                "local_path": img_result.get("local_path"),
                "url": img_result.get("url")
            }
        scene_data["video"] = vid_result

        # ── Voiceover Generation ──
        narration = scene.get("narration", f"Scene {scene_num} of our story about {req.topic}.")
        await notify(
            "scene_voice",
            base_progress + int(0.75 * (58 / total_scenes)),
            3,
            f"Scene {scene_num}/{total_scenes}: Dubbing neural narration ({req.voice_provider.upper()})...",
            {"scene": scene_num, "total_scenes": total_scenes}
        )

        if req.voice_provider == "edge":
            from services.edgetts_service import generate_edge_speech
            audio_filename = f"voice_scene_{job_id}_{scene_num}.mp3"
            edge_audio_path = settings.AUDIO_PATH / audio_filename
            await generate_edge_speech(text=narration, voice_id="en-US-AriaNeural", output_path=edge_audio_path)
            voice_result = {
                "success": True,
                "filename": audio_filename,
                "url": f"/outputs/audio/{audio_filename}",
                "local_path": str(edge_audio_path),
                "model": "Edge Neural TTS"
            }
        else:
            voice_result = await generate_elevenlabs_speech(text=narration, voice_id=req.voice_id)
            if not voice_result.get("local_path"):
                from services.edgetts_service import generate_edge_speech
                audio_filename = f"voice_scene_{job_id}_{scene_num}.mp3"
                edge_audio_path = settings.AUDIO_PATH / audio_filename
                await generate_edge_speech(text=narration, voice_id="en-US-AriaNeural", output_path=edge_audio_path)
                voice_result = {
                    "success": True,
                    "filename": audio_filename,
                    "url": f"/outputs/audio/{audio_filename}",
                    "local_path": str(edge_audio_path)
                }
        scene_data["voice"] = voice_result

        # ── Audio-Video Merge for this Scene ──
        merged_filename = f"scene_{job_id}_{scene_num}.mp4"
        merged_path = settings.FINAL_PATH / merged_filename
        try:
            await asyncio.to_thread(
                merge_video_audio,
                video_path=vid_result["local_path"],
                audio_path=voice_result["local_path"],
                output_path=merged_path
            )
        except Exception as e:
            logger.warning("[Pipeline Merge Warning] Scene %s: %s", scene_num, e)
            import shutil
            shutil.copyfile(vid_result["local_path"], merged_path)

        scene_data["merged"] = {
            "filename": merged_filename,
            "url": f"/outputs/final/{merged_filename}",
            "local_path": str(merged_path)
        }
        scene_outputs.append(scene_data)

    steps.append({"step": 2, "name": "Scene Generation", "status": "done", "count": len(scene_outputs)})

    # Step 5: Concatenate all scenes into final master video
    await notify("master_compile", 84, 4, "Compiling final 1080p MP4 master from all scenes via FFmpeg...")
    final_filename = f"master_{job_id}.mp4"
    final_path = settings.FINAL_PATH / final_filename
    merged_paths = [s["merged"]["local_path"] for s in scene_outputs]
    try:
        await asyncio.to_thread(concatenate_videos, merged_paths, final_path)
    except Exception as e:
        logger.warning("[Pipeline Concat Warning] %s", e)
        if merged_paths:
            import shutil
            shutil.copyfile(merged_paths[0], final_path)

    # Step 6: Subtitle Generation
    await notify("subtitles", 91, 4, "Generating synchronized WebVTT (.vtt) and SubRip (.srt) subtitles...")
    subtitles = generate_subtitles(scenes, final_path)

    elapsed = round(time.time() - start_time, 2)
    steps.append({"step": 3, "name": "Final Render", "status": "done"})

    final_url = f"/outputs/final/{final_filename}"

    # Step 7: Dual-Sync to Cloudflare R2 and Supabase
    await notify("cloud_sync", 96, 4, "Dual-syncing project & master video to Supabase and Vault...")
    try:
        from services.storage_service import sync_and_save_asset
        synced = await sync_and_save_asset(
            local_path=final_path,
            asset_type="final",
            metadata={"scenes_count": len(scene_outputs), "topic": req.topic, "style": req.style}
        )
        if synced.get("url"):
            final_url = synced["url"]
    except Exception as e:
        logger.warning("Failed to sync final video asset: %s", e)

    # Save Project Record to Supabase & SQLite
    try:
        from database import db_save_project
        db_save_project(
            project_id=job_id,
            title=f"{req.topic[:60]}",
            topic=req.topic,
            style=req.style,
            status="completed",
            scenes_count=len(scene_outputs),
            metadata={
                "image_model": req.image_model,
                "voice_provider": req.voice_provider,
                "aspect_ratio": req.aspect_ratio,
                "video_url": final_url,
                "duration_seconds": elapsed,
                "subtitles": subtitles
            }
        )
    except Exception as db_e:
        logger.warning("[Project DB Save Warning] %s", db_e)

    # Usage tracking
    try:
        from services.usage_tracker import log_generation
        log_generation(
            service_type="pipeline",
            provider="omnistudio_director",
            model=f"AI Storyboard Director ({len(scene_outputs)} Scenes)",
            prompt=req.topic,
            status="success",
            specs={"scenes": len(scene_outputs), "image_model": req.image_model, "voice_provider": req.voice_provider, "aspect_ratio": req.aspect_ratio},
            output_url=final_url
        )
    except Exception as e:
        logger.warning("Failed to record pipeline usage log: %s", e)

    result = {
        "success": True,
        "job_id": job_id,
        "elapsed_seconds": elapsed,
        "steps": steps,
        "scenes": scene_outputs,
        "final_video": {
            "filename": final_filename,
            "url": final_url,
            "local_path": str(final_path),
            "vtt_url": subtitles.get("vtt_url"),
            "srt_url": subtitles.get("srt_url")
        },
        "storyboard": scenes
    }

    await notify("complete", 100, 5, "Cinema Masterpiece Generated Successfully!", {"result": result})
    return result

class DraftPromptsRequest(BaseModel):
    topic: str
    style: str = "cinematic"

@router.post("/draft-prompts")
@limiter.limit("30/minute")
async def draft_prompts_endpoint(req: DraftPromptsRequest, request: Request):
    """
    Auto-decompose a single topic/idea into 3 tailored stage prompts:
    1. Image Diffusion Prompt
    2. Video Motion Prompt
    3. Neural Voice Script
    """
    data = await draft_step_prompts(topic=req.topic, style=req.style)
    return {"success": True, **data}

@router.post("/run")
@limiter.limit("5/minute")
async def run_pipeline(req: PipelineRequest, request: Request):
    """Standard synchronous pipeline endpoint."""
    return await execute_pipeline_core(req)

@router.post("/run-stream")
@limiter.limit("5/minute")
async def run_pipeline_stream(req: PipelineRequest, request: Request):
    """
    Real-Time Server-Sent Events (SSE) streaming endpoint.
    Streams live progress percentages, stage updates, timestamped terminal logs, and final output.
    """
    async def event_generator():
        queue = asyncio.Queue()

        async def callback(event_data):
            await queue.put(event_data)

        async def runner():
            try:
                await execute_pipeline_core(req, progress_callback=callback)
            except Exception as e:
                await queue.put({
                    "stage": "error",
                    "progress": 0,
                    "step": -1,
                    "message": f"Pipeline compilation error: {str(e)}",
                    "error": str(e)
                })
            finally:
                await queue.put(None)  # Sentinel to end stream

        asyncio.create_task(runner())

        while True:
            item = await queue.get()
            if item is None:
                break
            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
