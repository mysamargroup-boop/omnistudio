import uuid
import time
import json
import asyncio
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from limiter import limiter
from pydantic import BaseModel, field_validator
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

router = APIRouter(prefix="/api/pipeline", tags=["Auto Pipeline"])

ALLOWED_PIPELINE_ASPECTS = {"16:9", "9:16", "1:1", "4:3", "21:9"}

class PipelineRequest(BaseModel):
    topic: str
    num_scenes: int = 3
    image_model: str = "gemini_flash_image"
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


# -----------------------------------------------------------------------------
# Storyboard Scene Generator from Image / Concept
# -----------------------------------------------------------------------------
class StoryboardPromptsRequest(BaseModel):
    image_url: Optional[str] = ""
    story_hint: Optional[str] = ""
    style: Optional[str] = "cinematic"
    num_scenes: Optional[int] = 4

class StoryboardSceneItem(BaseModel):
    scene_number: int
    title: str
    prompt: str
    camera_motion: Optional[str] = "zoom_in"

class StoryboardGenerateRequest(BaseModel):
    scenes: list[StoryboardSceneItem]
    reference_image_url: Optional[str] = ""
    aspect_ratio: Optional[str] = "16:9"
    model: Optional[str] = "gemini_flash_image"
    quality: Optional[str] = "hd"

@router.post("/storyboard-prompts")
async def generate_storyboard_prompts_endpoint(req: StoryboardPromptsRequest):
    """
    Analyzes an uploaded image and user narrative directives to craft 4 sequential, character-consistent scene prompts.
    """
    num_scenes = max(1, min(6, req.num_scenes or 4))
    style = req.style or "cinematic"
    hint = (req.story_hint or "").strip()
    image_name = Path(req.image_url).stem if req.image_url else ""
    
    cinematic_camera_motions = [
        "dolly_zoom_vertigo", "fpv_drone_dive", "dutch_angle_tilt", "low_angle_hero_track",
        "crane_pedestal_reveal", "steadicam_orbit_360", "whip_pan_transition", "rack_focus_shallow",
        "handheld_cinema_verite", "overhead_gods_eye", "tracking_side_profile", "extreme_close_up_macro",
        "slow_push_in", "reverse_pull_back", "tilt_up_skyline", "orbit_left_arc",
        "crane_down_low", "fpv_flythrough", "whip_tilt_down", "dolly_in_rapid"
    ]

    prompt_text = f"""You are a master Hollywood cinematographer and storyboard director.
Based on the character/subject in the visual reference '{image_name or hint or 'cinematic subject'}' and the story hint '{hint or 'cinematic visual journey'}', generate exactly {num_scenes} sequential storyboard scenes that maintain consistent character appearance, clothing, and cinematic atmosphere in {style} style.

CRITICAL RULE: Do NOT default to repetitive basic camera motions like simple 'push', 'pan', or 'fade in'.
You MUST assign DISTINCT, dynamic cinematic camera motions for each scene from this list:
{json.dumps(cinematic_camera_motions)}

Return ONLY a JSON array with exactly {num_scenes} objects, each having:
- scene_number (integer, starting from 1)
- title (short 3-5 word scene title, e.g. 'Scene 1: Establishing Horizon')
- prompt (detailed 25-45 word prompt for text-to-image diffusion, describing character, action, camera lens, lighting, maintaining strict visual continuity)
- camera_motion (one of: {', '.join(cinematic_camera_motions)})

Example format:
[
  {{"scene_number": 1, "title": "Establishing Horizon", "prompt": "Wide cinematic 35mm anamorphic shot of the subject standing on a rain-slicked city balcony, neon reflections, volumetric fog, dramatic rim lighting", "camera_motion": "crane_pedestal_reveal"}}
]
"""
    scenes = []
    # 1. Try Gemini with Multimodal Vision
    try:
        from services.gemini_service import get_gemini_key, generate_gemini_vision_text, generate_gemini_text
        from path_utils import safe_resolve_output_path
        
        resolved_img = None
        if req.image_url:
            try:
                resolved_img = safe_resolve_output_path(req.image_url, "images", must_exist=True)
            except Exception:
                try:
                    resolved_img = safe_resolve_output_path(req.image_url, "final", must_exist=True)
                except Exception:
                    resolved_img = None

        if get_gemini_key():
            if resolved_img and resolved_img.exists():
                res = await generate_gemini_vision_text(prompt_text, image_path=str(resolved_img))
            else:
                res = await generate_gemini_text(prompt_text)

            if res.get("success") and res.get("text"):
                raw = res["text"].strip()
                import re
                match = re.search(r'\[.*\]', raw, re.DOTALL)
                if match:
                    parsed = json.loads(match.group(0))
                    if isinstance(parsed, list) and len(parsed) > 0:
                        scenes = parsed
    except Exception as e:
        logger.warning("Gemini storyboard prompts generation failed: %s", e)

    # 2. Try OpenAI if Gemini didn't return valid scenes
    if not scenes and settings.OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            res = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt_text}],
                temperature=0.7
            )
            raw = res.choices[0].message.content.strip()
            import re
            match = re.search(r'\[.*\]', raw, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
                if isinstance(parsed, list) and len(parsed) > 0:
                    scenes = parsed
        except Exception as e:
            logger.warning("OpenAI storyboard prompts generation failed: %s", e)

    # 3. Fallback algorithmic scenes if LLM is unavailable (guaranteeing varied cinematography)
    if not scenes:
        base_subject = hint if hint else (image_name.replace("_", " ").title() if image_name else "cinematic subject")
        scenes = [
            {
                "scene_number": 1,
                "title": "Scene 1: Establishing Horizon",
                "prompt": f"Wide angle cinematic 35mm anamorphic establishing shot of {base_subject}, ambient atmospheric lighting, shallow depth of field, 8k resolution, master color grade",
                "camera_motion": "crane_pedestal_reveal"
            },
            {
                "scene_number": 2,
                "title": "Scene 2: Narrative Tension",
                "prompt": f"Low angle upward tracking shot of {base_subject} moving with urgency, dynamic chiaroscuro lighting, volumetric rim lighting, micro-textures, cinematic realism",
                "camera_motion": "low_angle_hero_track"
            },
            {
                "scene_number": 3,
                "title": "Scene 3: Climactic Revelation",
                "prompt": f"Dramatic vertigo dolly zoom on {base_subject}, intense emotional facial expression, 85mm prime lens, ultra-sharp focus, background optical warping",
                "camera_motion": "dolly_zoom_vertigo"
            },
            {
                "scene_number": 4,
                "title": "Scene 4: Kinetic Resolution",
                "prompt": f"Steadicam 360-degree orbit around {base_subject} in epic twilight setting, golden hour rays, cinematic lens flare, master composition, 8k raw detail",
                "camera_motion": "steadicam_orbit_360"
            }
        ]

    return {
        "success": True,
        "scenes": scenes,
        "reference_image": req.image_url,
        "total": len(scenes)
    }


@router.post("/storyboard-generate")
async def generate_storyboard_images_endpoint(req: StoryboardGenerateRequest):
    """
    Generates high-resolution images for each approved storyboard scene using the selected image model,
    preserving character consistency when a reference image is supplied.
    """
    from services.gemini_service import get_gemini_key, generate_gemini_image
    from path_utils import safe_resolve_output_path

    resolved_ref = None
    if req.reference_image_url:
        try:
            resolved_ref = safe_resolve_output_path(req.reference_image_url, "images", must_exist=True)
        except Exception:
            try:
                resolved_ref = safe_resolve_output_path(req.reference_image_url, "final", must_exist=True)
            except Exception:
                resolved_ref = None

    ref_path_str = str(resolved_ref) if (resolved_ref and resolved_ref.exists()) else None

    results = []
    model_to_use = req.model or "gemini_flash_image"
    aspect = req.aspect_ratio or "16:9"

    for scene in req.scenes:
        clean_prompt = scene.prompt.strip()
        img_res = None

        # Check model preference
        if model_to_use in ["gemini_flash_image", "imagen_3", "google_gemini"] and get_gemini_key():
            img_res = await generate_gemini_image(
                clean_prompt,
                filename_hint=f"storyboard_scene_{scene.scene_number}",
                reference_image_path=ref_path_str
            )
        elif settings.OPENAI_API_KEY:
            size_map = {"16:9": "1792x1024", "9:16": "1024x1792", "1:1": "1024x1024"}
            chosen_size = size_map.get(aspect, "1792x1024")
            img_res = await generate_openai_image(
                prompt=clean_prompt,
                model="gpt-image-2" if "gpt" in model_to_use else "dall-e-3",
                size=chosen_size,
                quality="hd",
                filename_hint=f"storyboard_scene_{scene.scene_number}"
            )
        elif get_gemini_key():
            img_res = await generate_gemini_image(
                clean_prompt,
                filename_hint=f"storyboard_scene_{scene.scene_number}",
                reference_image_path=ref_path_str
            )
        else:
            img_res = {"success": False, "error": "No image diffusion API key configured (Gemini or OpenAI)."}

        if img_res and img_res.get("success"):
            results.append({
                "scene_number": scene.scene_number,
                "title": scene.title,
                "prompt": scene.prompt,
                "camera_motion": scene.camera_motion,
                "image_url": img_res.get("url"),
                "filename": img_res.get("filename"),
                "model": img_res.get("model", model_to_use),
                "success": True
            })
        else:
            results.append({
                "scene_number": scene.scene_number,
                "title": scene.title,
                "prompt": scene.prompt,
                "error": img_res.get("error") if img_res else "Generation failed",
                "success": False
            })

    return {
        "success": True,
        "scenes": results,
        "total_generated": len([r for r in results if r.get("success")]),
        "total_requested": len(req.scenes)
    }

# === Agent Pipeline Endpoints ===
import uuid
import json
import asyncio
from fastapi.responses import StreamingResponse
from services.agent_orchestrator import PipelineContext, PipelineState
from services.agents import get_default_orchestrator

class AgentPipelineStartRequest(BaseModel):
    prompt: str
    mode: str = 'autonomous'  # autonomous | assisted
    num_scenes: int = 3
    style: str = 'cinematic'
    aspect_ratio: str = '16:9'
    image_model: str = 'imagen-3'
    video_model: str = 'omni_model'
    voice_provider: str = 'edge'
    voice_id: str = ''
    apply_brand_kit: bool = True

@router.post("/agent/start")
async def start_agent_pipeline(req: AgentPipelineStartRequest, request: Request):
    pipeline_id = f"pipeline_{uuid.uuid4().hex[:8]}"
    context = PipelineContext(
        pipeline_id=pipeline_id,
        user_prompt=req.prompt,
        mode=req.mode,
        num_scenes=req.num_scenes,
        style=req.style,
        aspect_ratio=req.aspect_ratio,
        image_model=req.image_model,
        video_model=req.video_model or 'omni_model',
        voice_provider=req.voice_provider,
        voice_id=req.voice_id,
        apply_brand_kit=req.apply_brand_kit
    )
    orchestrator = get_default_orchestrator()
    await orchestrator.save_pipeline_state(context)
    return {"success": True, "pipeline_id": pipeline_id}

@router.api_route("/agent/stream/{pipeline_id}", methods=["GET", "POST"])
async def stream_agent_pipeline(pipeline_id: str, request: Request):
    orchestrator = get_default_orchestrator()
    
    async def sse_generator():
        q = asyncio.Queue()
        try:
            # Yield initial snapshot immediately so client doesn't wait
            current_ctx = await orchestrator.load_pipeline_state(pipeline_id)
            yield f"data: {json.dumps(current_ctx.to_dict())}\n\n"

            if current_ctx.state in [PipelineState.COMPLETE, PipelineState.FAILED]:
                return
        except Exception as e:
            logger.warning(f"Initial state load for {pipeline_id}: {e}")

        await orchestrator.attach_listener(pipeline_id, q)
        
        try:
            while True:
                try:
                    ctx_dict = await asyncio.wait_for(q.get(), timeout=1.0)
                    yield f"data: {json.dumps(ctx_dict)}\n\n"
                    # If state reaches complete or failed, break stream
                    if ctx_dict.get("state") in ["complete", "failed"]:
                        break
                except asyncio.TimeoutError:
                    if not orchestrator.is_task_running(pipeline_id) and q.empty():
                        # Final check of state
                        try:
                            final_ctx = await orchestrator.load_pipeline_state(pipeline_id)
                            yield f"data: {json.dumps(final_ctx.to_dict())}\n\n"
                        except Exception:
                            pass
                        break

                    # Check client connection safely
                    try:
                        if await request.is_disconnected():
                            logger.info(f"Client disconnected from pipeline {pipeline_id}; process continues in background")
                            break
                    except Exception:
                        pass

                    # Send SSE comment heartbeat to prevent reverse-proxy and browser socket timeouts
                    yield ": keep-alive\n\n"
        finally:
            orchestrator.detach_listener(pipeline_id, q)

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

@router.post("/agent/approve/{pipeline_id}")
async def approve_agent_step(pipeline_id: str):
    orchestrator = get_default_orchestrator()
    try:
        context = await orchestrator.load_pipeline_state(pipeline_id)
        if context.state == PipelineState.PAUSED:
            context.add_log("System", "Directorial approval granted — resuming pipeline")
            await orchestrator.save_pipeline_state(context)
        return {"success": True, "pipeline_id": pipeline_id, "message": "Approved", "state": context.state.value}
    except Exception as e:
        logger.error(f"Error approving pipeline {pipeline_id}: {e}")
        return {"success": False, "pipeline_id": pipeline_id, "error": str(e)}

@router.post("/agent/resume/{pipeline_id}")
async def resume_agent_step(pipeline_id: str):
    orchestrator = get_default_orchestrator()
    try:
        context = await orchestrator.load_pipeline_state(pipeline_id)
        if context.state == PipelineState.PAUSED:
            context.add_log("System", "Directorial execution resumed")
            await orchestrator.save_pipeline_state(context)
        return {"success": True, "pipeline_id": pipeline_id, "message": "Resumed", "state": context.state.value}
    except Exception as e:
        logger.error(f"Error resuming pipeline {pipeline_id}: {e}")
        return {"success": False, "pipeline_id": pipeline_id, "error": str(e)}

@router.post("/agent/reject/{pipeline_id}")
async def reject_agent_step(pipeline_id: str, feedback: str = ''):
    orchestrator = get_default_orchestrator()
    try:
        context = await orchestrator.load_pipeline_state(pipeline_id)
        rejection_note = feedback.strip() or "Directorial revision requested"
        context.add_log("System", f"Directorial rejection: {rejection_note}")
        # Keep state PAUSED — user can re-approve after giving feedback
        await orchestrator.save_pipeline_state(context)
        return {"success": True, "pipeline_id": pipeline_id, "message": "Rejected", "feedback": rejection_note}
    except Exception as e:
        logger.error(f"Error rejecting pipeline {pipeline_id}: {e}")
        return {"success": False, "pipeline_id": pipeline_id, "error": str(e)}

@router.get("/agent/status/{pipeline_id}")
async def get_agent_status(pipeline_id: str):
    orchestrator = get_default_orchestrator()
    try:
        context = await orchestrator.load_pipeline_state(pipeline_id)
        return {"success": True, "context": context.to_dict()}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/agent/history")
async def get_agent_history():
    orchestrator = get_default_orchestrator()
    history = await orchestrator.get_pipeline_history()
    return {"success": True, "history": history}

@router.delete("/agent/{pipeline_id}")
async def cancel_agent_pipeline(pipeline_id: str):
    orchestrator = get_default_orchestrator()
    cancelled = orchestrator.cancel_task(pipeline_id)
    return {"success": True, "pipeline_id": pipeline_id, "message": "Cancelled" if cancelled else "No active task to cancel"}


