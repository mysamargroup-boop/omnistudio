from fastapi import APIRouter, UploadFile, File, Form, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from pathlib import Path
from limiter import limiter
import uuid
import asyncio
import shutil
import logging
from config import settings
from services.replicate_service import generate_video_from_image, generate_flux_image
from services.openai_service import generate_openai_image
from services.ffmpeg_service import image_to_video_motion, keyframe_interpolate_motion, multi_keyframe_interpolate_motion, get_media_duration, concatenate_videos
from services.director_agent import direct_video_prompt
from services.video_editor_service import edit_video
from services.security_service import sanitize_filename
from database import db_save_asset

logger = logging.getLogger("omnistudio.video")

from pydantic import BaseModel, field_validator

router = APIRouter(prefix="/api/video", tags=["Video Generation"])

ALLOWED_VIDEO_MODES = {"text_to_video", "first_frame", "first_to_last_frame", "motion_transfer", "multi_frame"}
ALLOWED_VIDEO_ASPECTS = {"16:9", "9:16", "1:1", "4:3", "21:9", "2.39:1", "original"}
ALLOWED_FPS = {24, 30, 60}
ALLOWED_LUTS = {"noir", "teal_orange", "cyberpunk", "vintage"}

class DirectorAgentRequest(BaseModel):
    idea: Optional[str] = None
    prompt: Optional[str] = None
    generation_mode: str = "first_frame"  # text_to_video, first_frame, first_to_last_frame, multi_frame
    target_video_model: str = "ffmpeg_local"
    style: str = "cinematic"
    aspect_ratio: str = "16:9"

    @field_validator("aspect_ratio")
    @classmethod
    def validate_aspect(cls, v: str) -> str:
        if v not in ALLOWED_VIDEO_ASPECTS:
            return "16:9"
        return v

    @field_validator("generation_mode")
    @classmethod
    def validate_mode(cls, v: str) -> str:
        if v not in ALLOWED_VIDEO_MODES:
            return "first_frame"
        return v

class VideoRequest(BaseModel):
    mode: str = "first_frame"  # text_to_video, first_frame, first_to_last_frame, motion_transfer, multi_frame
    image_path: Optional[str] = ""  # First Frame / Start Frame
    start_image_path: Optional[str] = None
    end_image_path: Optional[str] = None  # Last Frame / End Frame
    image_paths: Optional[list[str]] = None  # Multi-frame sequence (2-8 keyframes)
    source_video_path: Optional[str] = None  # For motion transfer — source motion video
    prompt: Optional[str] = ""
    negative_prompt: Optional[str] = ""
    motion_type: str = "none"
    transition_type: str = "smooth_morph"
    duration: float = 4.0
    fps: int = 30
    aspect_ratio: str = "16:9"
    resolution: str = "1080p"  # 720p, 1080p, 2k, 4k
    quality: str = "balanced"  # draft, balanced, cinema
    motion_intensity: float = 1.0  # 0.5, 1.0, 1.5, 2.0
    loop: bool = False
    seed: Optional[int] = None
    apply_brand_kit: Optional[bool] = False  # Default OFF
    model: str = "ffmpeg_local"
    character_prompt: Optional[str] = None
    character_image: Optional[str] = None
    character_name: Optional[str] = None
    focal_lens: Optional[str] = None
    aperture: Optional[str] = None
    shutter_angle: Optional[str] = None
    color_lut: Optional[str] = None
    orbit_x: Optional[float] = None
    orbit_y: Optional[float] = None
    push_speed: Optional[float] = None
    crane_elevation: Optional[float] = None
    dutch_roll: Optional[float] = None

    @field_validator("duration")
    @classmethod
    def validate_duration(cls, v: float) -> float:
        if not (1.0 <= v <= 120.0):
            raise ValueError("Duration must be between 1.0 and 120.0 seconds")
        return round(float(v), 2)

    @field_validator("fps")
    @classmethod
    def validate_fps(cls, v: int) -> int:
        if v not in ALLOWED_FPS:
            raise ValueError(f"FPS must be one of {sorted(ALLOWED_FPS)}")
        return int(v)

    @field_validator("aspect_ratio")
    @classmethod
    def validate_aspect(cls, v: str) -> str:
        if v not in ALLOWED_VIDEO_ASPECTS:
            raise ValueError(f"Aspect ratio must be one of {sorted(ALLOWED_VIDEO_ASPECTS)}")
        return v

    @field_validator("motion_intensity")
    @classmethod
    def validate_intensity(cls, v: float) -> float:
        if not (0.1 <= v <= 3.0):
            raise ValueError("motion_intensity must be between 0.1 and 3.0")
        return round(float(v), 2)

class EditVideoRequest(BaseModel):
    video_path: str
    start_time: float = 0.0
    end_time: Optional[float] = None
    speed: float = 1.0
    aspect_ratio: str = "original"  # original, 16:9, 9:16, 1:1, 4:3
    brightness: float = 0.0  # -0.5 to 0.5
    contrast: float = 1.0    # 0.5 to 2.0
    saturation: float = 1.0  # 0.0 to 3.0
    preset_lut: Optional[str] = None  # noir, teal_orange, cyberpunk, vintage
    mute_original: bool = False
    bg_audio_path: Optional[str] = None
    bg_audio_volume: float = 0.5
    original_audio_volume: float = 1.0
    text_overlay: Optional[str] = None
    text_position: str = "bottom"  # top, center, bottom
    video_fade_in: float = 0.0
    video_fade_out: float = 0.0
    audio_fade_in: float = 0.0
    audio_fade_out: float = 0.0
    watermark_path: Optional[str] = None
    watermark_position: str = "bottom_right" # top_left, top_right, bottom_left, bottom_right, center
    chroma_key_color: Optional[str] = None
    chroma_bg_path: Optional[str] = None

    @field_validator("video_path")
    @classmethod
    def validate_path(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("video_path is required")
        return s

    @field_validator("start_time")
    @classmethod
    def validate_start(cls, v: float) -> float:
        if v < 0:
            raise ValueError("start_time cannot be negative")
        return round(float(v), 2)

    @field_validator("speed")
    @classmethod
    def validate_speed(cls, v: float) -> float:
        if not (0.25 <= v <= 4.0):
            raise ValueError("speed must be between 0.25x and 4.0x")
        return round(float(v), 2)

    @field_validator("brightness")
    @classmethod
    def validate_brightness(cls, v: float) -> float:
        if not (-0.5 <= v <= 0.5):
            raise ValueError("brightness must be between -0.5 and 0.5")
        return round(float(v), 2)

    @field_validator("contrast")
    @classmethod
    def validate_contrast(cls, v: float) -> float:
        if not (0.5 <= v <= 2.0):
            raise ValueError("contrast must be between 0.5 and 2.0")
        return round(float(v), 2)

    @field_validator("saturation")
    @classmethod
    def validate_saturation(cls, v: float) -> float:
        if not (0.0 <= v <= 3.0):
            raise ValueError("saturation must be between 0.0 and 3.0")
        return round(float(v), 2)

    @field_validator("preset_lut")
    @classmethod
    def validate_lut(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in ALLOWED_LUTS:
            raise ValueError(f"preset_lut must be one of {sorted(ALLOWED_LUTS)}")
        return v

    @field_validator("bg_audio_volume", "original_audio_volume")
    @classmethod
    def validate_volume(cls, v: float) -> float:
        if not (0.0 <= v <= 2.0):
            raise ValueError("volume must be between 0.0 and 2.0")
        return round(float(v), 2)

    @field_validator("video_fade_in", "video_fade_out", "audio_fade_in", "audio_fade_out")
    @classmethod
    def validate_fade(cls, v: float) -> float:
        if not (0.0 <= v <= 10.0):
            raise ValueError("fade duration must be between 0.0 and 10.0 seconds")
        return round(float(v), 2)

    @field_validator("watermark_position")
    @classmethod
    def validate_wm_pos(cls, v: str) -> str:
        allowed = {"top_left", "top_right", "bottom_left", "bottom_right", "center"}
        if v not in allowed:
            raise ValueError(f"watermark_position must be one of {sorted(allowed)}")
        return v

    @field_validator("chroma_key_color")
    @classmethod
    def validate_chroma(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                return None
            # Allow named colors (green, blue) or hex (0x00FF00)
            allowed_names = {"green", "blue", "red", "white", "black", "magenta"}
            if v.lower() not in allowed_names and not v.startswith("0x"):
                raise ValueError(f"chroma_key_color must be a color name ({sorted(allowed_names)}) or hex (0x00FF00)")
        return v

RESOLUTION_MAP = {
    "720p":  {"16:9": (1280, 720),  "9:16": (720, 1280),  "1:1": (720, 720),   "4:3": (960, 720),   "21:9": (1680, 720), "2.39:1": (1720, 720)},
    "1080p": {"16:9": (1920, 1080), "9:16": (1080, 1920), "1:1": (1080, 1080), "4:3": (1440, 1080), "21:9": (2520, 1080), "2.39:1": (2580, 1080)},
    "2k":    {"16:9": (2560, 1440), "9:16": (1440, 2560), "1:1": (1440, 1440), "4:3": (1920, 1440), "21:9": (3360, 1440), "2.39:1": (3440, 1440)},
    "4k":    {"16:9": (3840, 2160), "9:16": (2160, 3840), "1:1": (2160, 2160), "4:3": (2880, 2160), "21:9": (5040, 2160), "2.39:1": (3840, 1608)},
}

def get_resolution(res: str, aspect: str) -> tuple:
    """Get width, height from resolution and aspect ratio."""
    res_map = RESOLUTION_MAP.get(res, RESOLUTION_MAP["1080p"])
    return res_map.get(aspect, res_map["16:9"])

@router.get("/models")
@limiter.limit("60/minute")
async def list_video_models(request: Request):
    """Returns dynamic list of video models with active status based on configured API keys."""
    import os
    try:
        from database import load_settings_into_runtime
        load_settings_into_runtime()
    except Exception:
        pass

    gemini_key = os.environ.get("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", "")
    replicate_token = os.environ.get("REPLICATE_API_TOKEN") or getattr(settings, "REPLICATE_API_TOKEN", "")
    openai_key = os.environ.get("OPENAI_API_KEY") or getattr(settings, "OPENAI_API_KEY", "")

    has_gemini = bool(gemini_key and str(gemini_key).strip())
    has_replicate = bool(replicate_token and str(replicate_token).strip())
    has_openai = bool(openai_key and str(openai_key).strip())

    return {
        "models": [
            {
                "value": "ffmpeg_local",
                "label": "Local Ken Burns / Morph",
                "description": "Fast Local FFmpeg (100% Free)",
                "badge": "FREE LOCAL",
                "category": "Hardware Engine",
                "active": True,
                "is_free": True
            },
            {
                "value": "google_veo",
                "name": "Google Veo 3.1",
                "label": "Google Veo 3.1 (DeepMind)",
                "description": "Cinema-grade 4K generative video by Google DeepMind",
                "badge": "ACTIVE" if has_gemini else "KEY REQ",
                "category": "Featured Cloud",
                "active": has_gemini,
                "is_free": False
            },
            {
                "value": "kling_2.0",
                "label": "Kling AI 2.0 Pro",
                "description": "Photorealistic Physics & High Dynamic Kinematics",
                "badge": "PRO" if has_replicate else "KEY REQ",
                "category": "Featured Cloud",
                "active": has_replicate,
                "is_free": False
            },
            {
                "value": "runway_gen3",
                "label": "Runway Gen-3 Alpha Turbo",
                "description": "Ultra-Realistic Cinema Motion Coherence & Camera Controls",
                "badge": "CINEMA" if has_replicate else "KEY REQ",
                "category": "Featured Cloud",
                "active": has_replicate,
                "is_free": False
            },
            {
                "value": "luma_dream",
                "label": "Luma Dream Machine 1.5",
                "description": "Consistent 3D Camera Parallax & Fluid Dynamics",
                "badge": "CLOUD" if has_replicate else "KEY REQ",
                "category": "Cloud SOTA",
                "active": has_replicate,
                "is_free": False
            },
            {
                "value": "minimax_video",
                "label": "Minimax Hailuo Video-01",
                "description": "Cinematic Resolution & Natural Human Kinetics",
                "badge": "SOTA" if has_replicate else "KEY REQ",
                "category": "Cloud SOTA",
                "active": has_replicate,
                "is_free": False
            },
            {
                "value": "seedance_v1",
                "label": "ByteDance Seedance 1.0",
                "description": "High-Fidelity Character & Dance Choreography",
                "badge": "KEY REQ",
                "category": "Cloud SOTA",
                "active": False,
                "is_free": False
            },
            {
                "value": "hunyuan_video",
                "label": "Tencent HunyuanVideo",
                "description": "Open-Weights High Definition Video Diffusion",
                "badge": "OPEN",
                "category": "Open Weights",
                "active": False,
                "is_free": False
            },
            {
                "value": "openai_sora",
                "label": "OpenAI Sora",
                "description": "World Simulator & Complex Multi-Shot Kinematics",
                "badge": "CLOUD" if has_openai else "KEY REQ",
                "category": "Cloud SOTA",
                "active": has_openai,
                "is_free": False
            },
            {
                "value": "pika_v2",
                "label": "Pika 2.0",
                "description": "Creative Stylized Motion & Kinetic Lens Effects",
                "badge": "KEY REQ",
                "category": "Cloud SOTA",
                "active": False,
                "is_free": False
            }
        ]
    }

@router.post("/director-agent")
@limiter.limit("20/minute")
async def video_director_agent(req: DirectorAgentRequest, request: Request):
    """
    Parallel AI Director Agent using OpenAI (gpt-4o-mini / gpt-4o).
    Enhances prompt, camera vectors, negative prompt, and lighting for video generation.
    """
    user_idea = req.idea or req.prompt or "cinematic motion visual"
    result = await direct_video_prompt(
        idea=user_idea,
        generation_mode=req.generation_mode,
        target_video_model=req.target_video_model,
        style=req.style,
        aspect_ratio=req.aspect_ratio
    )
    if isinstance(result, dict):
        result["cinematic_prompt"] = result.get("enhanced_prompt", user_idea)
    return result

from path_utils import safe_resolve_output_path
from services.security_service import sanitize_filename

def resolve_path(p: str, media_type: Optional[str] = None) -> Optional[Path]:
    """Resolve a user-provided path to a validated output Path.

    Uses the hardened path_utils.safe_resolve_output_path resolver which
    rejects traversal, symlinks, and cross-directory access.
    """
    if not p:
        return None
    normalized = p.replace("\\", "/")
    detected_media_type = media_type
    if detected_media_type is None:
        for mt in ("images", "videos", "audio", "final"):
            if normalized.startswith(f"/outputs/{mt}/") or normalized.startswith(f"outputs/{mt}/"):
                detected_media_type = mt
                break
    if detected_media_type is None:
        filename = Path(normalized).name.lower()
        if filename.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp")):
            detected_media_type = "images"
        elif filename.endswith((".mp4", ".webm", ".avi", ".mov")):
            detected_media_type = "videos"
        elif filename.endswith((".mp3", ".wav", ".ogg", ".flac", ".m4a")):
            detected_media_type = "audio"
        elif filename.endswith((".mp4", ".mkv")):
            detected_media_type = "final"
        else:
            return None
    try:
        return safe_resolve_output_path(p, detected_media_type, must_exist=True)
    except Exception:
        return None

@router.post("/upload-keyframe")
@limiter.limit("20/minute")
async def upload_keyframe(request: Request, file: UploadFile = File(...)):
    """Upload a starting or ending keyframe image for Image-to-Video synthesis."""
    from services.security_service import validate_uploaded_media
    clean_orig = sanitize_filename(file.filename)
    ext = Path(clean_orig).suffix.lower() or ".png"
    if ext not in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]:
        ext = ".png"
    filename = f"keyframe_{uuid.uuid4().hex[:8]}{ext}"
    target_path = settings.IMAGES_PATH / filename

    content = await file.read()
    validate_uploaded_media(content, clean_orig, "image")
    with open(target_path, "wb") as f:
        f.write(content)

    return {
        "success": True,
        "filename": filename,
        "url": f"/outputs/images/{filename}",
        "local_path": str(target_path)
    }

@router.post("/upload-source-video")
@limiter.limit("10/minute")
async def upload_source_video(request: Request, file: UploadFile = File(...)):
    """Upload a source motion video for motion transfer."""
    from services.security_service import validate_uploaded_media
    clean_orig = sanitize_filename(file.filename)
    ext = Path(clean_orig).suffix.lower() or ".mp4"
    if ext not in [".mp4", ".mov", ".webm", ".avi", ".mkv"]:
        ext = ".mp4"
    filename = f"source_{uuid.uuid4().hex[:8]}{ext}"
    target_path = settings.VIDEOS_PATH / filename

    content = await file.read()
    validate_uploaded_media(content, clean_orig, "video")
    with open(target_path, "wb") as f:
        f.write(content)

    return {
        "success": True,
        "filename": filename,
        "url": f"/outputs/videos/{filename}",
        "local_path": str(target_path)
    }

@router.post("/generate")
@limiter.limit("5/minute")
async def generate_video(req: VideoRequest, request: Request):
    start_img = req.start_image_path or req.image_path
    w, h = get_resolution(req.resolution, req.aspect_ratio)
    try:
        clip_duration = float(req.duration)
        fps_int = int(req.fps)
        motion_intensity = float(req.motion_intensity)
    except (TypeError, ValueError):
        clip_duration = 4.0
        fps_int = 24
        motion_intensity = 1.0

    clip_duration = min(max(clip_duration, 1.0), 60.0)
    fps_int = min(max(fps_int, 1), 120)
    motion_intensity = min(max(motion_intensity, 0.1), 3.0)

    def record_failure(err_msg: str) -> Dict[str, Any]:
        try:
            from services.usage_tracker import log_generation
            prov = "google" if "veo" in req.model.lower() else ("local" if "ffmpeg" in req.model.lower() else "cloud")
            log_generation(
                service_type="video",
                provider=prov,
                model=req.model,
                prompt=req.prompt or f"Motion: {req.motion_type} on keyframe",
                status="failed",
                specs={"duration": clip_duration, "resolution": f"{w}x{h}", "fps": fps_int, "motion": req.motion_type},
                output_url="",
                error=err_msg
            )
        except Exception as log_err:
            logger.warning("Failed to record video generation failure log: %s", log_err)
        return {"success": False, "error": err_msg}

    # ─── Mode: Motion Transfer ───
    if req.mode == "motion_transfer":
        start_resolved = resolve_path(start_img)
        source_video = resolve_path(req.source_video_path) if req.source_video_path else None
        
        if not start_resolved or not start_resolved.exists():
            return record_failure(f"Target image not found: {start_img}")
        if not source_video or not source_video.exists():
            return record_failure(f"Source motion video not found: {req.source_video_path}")
        
        filename = f"mt_{uuid.uuid4().hex[:8]}.mp4"
        output_path = settings.VIDEOS_PATH / filename
        
        try:
            import subprocess
            cmd = [
                "ffmpeg", "-y",
                "-loop", "1", "-i", str(start_resolved),
                "-i", str(source_video),
                "-filter_complex",
                f"[0:v]scale={w}:{h},format=yuv420p[img];"
                f"[1:v]scale={w}:{h},format=yuv420p[vid];"
                f"[img][vid]blend=all_mode=overlay:all_opacity=0.6[out]",
                "-map", "[out]",
                "-t", str(clip_duration),
                "-r", str(fps_int),
                "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                "-pix_fmt", "yuv420p",
                str(output_path)
            ]
            result = await asyncio.to_thread(subprocess.run, cmd, capture_output=True, text=True, timeout=180)
            
            if result.returncode != 0:
                return record_failure(f"Motion transfer FFmpeg error: {result.stderr[:300]}")
            
            try:
                from services.usage_tracker import log_generation
                log_generation(
                    service_type="video",
                    provider="ffmpeg_local",
                    model=f"{req.model} (Motion Transfer)",
                    prompt=f"Motion transfer: {Path(start_img).name} + {Path(req.source_video_path).name}",
                    status="success",
                    specs={"duration": clip_duration, "resolution": f"{w}x{h}", "fps": fps_int},
                    output_url=f"/outputs/videos/{filename}"
                )
            except Exception as e:
                logger.warning("Failed to record motion transfer usage log: %s", e)

            return {
                "success": True,
                "filename": filename,
                "url": f"/outputs/videos/{filename}",
                "local_path": str(output_path),
                "duration": clip_duration,
                "mode": "motion_transfer",
                "engine": f"{req.model} (Motion Transfer Composite)",
                "resolution": f"{w}x{h}",
                "quality": req.quality,
                "loop": req.loop
            }
        except Exception as e:
            return record_failure(f"Motion transfer failed: {str(e)}")

    # ─── Compose Optical & Motion Rig Directives ───
    optical_directives = []
    if req.focal_lens:
        optical_directives.append(f"shot on {req.focal_lens}")
    if req.aperture:
        optical_directives.append(f"{req.aperture} depth of field")
    if req.shutter_angle:
        optical_directives.append(f"{req.shutter_angle} motion cadence")
    if req.color_lut:
        optical_directives.append(f"{req.color_lut} film stock color grade")
    if req.orbit_x is not None or req.orbit_y is not None:
        optical_directives.append(f"camera trajectory orbit X {req.orbit_x or 0}° Y {req.orbit_y or 0}°")
    if req.push_speed is not None:
        optical_directives.append(f"dolly push speed {req.push_speed}m/s")
    if req.crane_elevation is not None:
        optical_directives.append(f"crane elevation {req.crane_elevation}m")
    if req.dutch_roll is not None:
        optical_directives.append(f"dutch roll {req.dutch_roll}°")

    base_p = (req.prompt or "").strip()
    if optical_directives and base_p:
        effective_prompt = f"{base_p}, {', '.join(optical_directives)}"
    elif optical_directives:
        effective_prompt = ", ".join(optical_directives)
    else:
        effective_prompt = base_p

    if getattr(req, "apply_brand_kit", False):
        try:
            from services.brand_kit_service import apply_brand_kit_to_prompt
            effective_prompt = apply_brand_kit_to_prompt(effective_prompt)
        except Exception as bke:
            logger.debug(f"Brand kit video injection skipped: {bke}")

    # ─── Mode: Text-to-Video ───
    if req.mode == "text_to_video" or (not start_img and base_p):
        if settings.REPLICATE_API_TOKEN:
            img_res = await generate_flux_image(effective_prompt, aspect_ratio=req.aspect_ratio)
        elif settings.OPENAI_API_KEY:
            img_res = await generate_openai_image(effective_prompt, size="1792x1024" if req.aspect_ratio == "16:9" else "1024x1024")
        else:
            return record_failure(
                "Text-to-Video from scratch requires an OpenAI or Replicate API key in Settings. Alternatively, select an image from your Vault or upload a keyframe to render with 100% free Local FFmpeg acceleration."
            )
            
        if not img_res or not img_res.get("success", True) or img_res.get("error"):
            err_msg = img_res.get("error") if isinstance(img_res, dict) else "Failed to generate initial keyframe"
            return record_failure(f"Initial keyframe generation failed: {err_msg}")

        start_img = img_res.get("local_path") or img_res.get("url")
        if not start_img:
            return record_failure("Failed to obtain valid initial frame for text-to-video synthesis.")

    # ─── Mode: Multi-Frame Keyframe Sequence ───
    if (req.mode == "multi_frame" or (req.image_paths and len(req.image_paths) > 1)) and req.image_paths:
        resolved_imgs = []
        for p in req.image_paths:
            rp = resolve_path(p)
            if rp and rp.exists():
                resolved_imgs.append(rp)
        if len(resolved_imgs) < 2:
            return record_failure("Multi-Frame sequence requires at least 2 valid image keyframes.")

        filename = f"seq_{uuid.uuid4().hex[:8]}.mp4"
        output_path = settings.VIDEOS_PATH / filename

        await asyncio.to_thread(
            multi_keyframe_interpolate_motion,
            image_paths=resolved_imgs,
            output_path=str(output_path),
            duration=clip_duration,
            transition_type=req.transition_type,
            fps=fps_int,
            width=w,
            height=h
        )

        try:
            from services.usage_tracker import log_generation
            log_generation(
                service_type="video",
                provider="ffmpeg_local",
                model=f"{req.model} (Multi-Keyframe Sequence)",
                prompt=req.prompt or f"Sequence of {len(resolved_imgs)} keyframes",
                status="success",
                specs={"duration": clip_duration, "keyframes": len(resolved_imgs), "resolution": f"{w}x{h}", "fps": fps_int},
                output_url=f"/outputs/videos/{filename}"
            )
        except Exception as e:
            logger.warning("Failed to record multi-keyframe usage log: %s", e)

        return {
            "success": True,
            "filename": filename,
            "url": f"/outputs/videos/{filename}",
            "local_path": str(output_path),
            "duration": clip_duration,
            "motion_type": req.motion_type,
            "mode": "multi_frame",
            "keyframes": req.image_paths,
            "engine": f"{req.model} (Multi-Keyframe Interpolation Engine)",
            "resolution": f"{w}x{h}",
            "quality": req.quality,
            "loop": req.loop
        }

    # ─── Mode: First Frame + Last Frame Interpolation ───
    if req.mode == "first_to_last_frame" and req.end_image_path:
        start_resolved = resolve_path(start_img)
        end_resolved = resolve_path(req.end_image_path)
        
        if not start_resolved or not start_resolved.exists():
            return record_failure(f"First frame not found: {start_img}")
        if not end_resolved or not end_resolved.exists():
            return record_failure(f"Last frame not found: {req.end_image_path}")
            
        filename = f"morph_{uuid.uuid4().hex[:8]}.mp4"
        output_path = settings.VIDEOS_PATH / filename
            
        await asyncio.to_thread(
            keyframe_interpolate_motion,
            start_image_path=str(start_resolved),
            end_image_path=str(end_resolved),
            output_path=str(output_path),
            duration=clip_duration,
            transition_type=req.transition_type,
            fps=fps_int,
            width=w,
            height=h
        )

        try:
            from services.usage_tracker import log_generation
            log_generation(
                service_type="video",
                provider="ffmpeg_local",
                model=f"{req.model} (Keyframe Morph)",
                prompt=f"Morph: {Path(start_img).name} -> {Path(req.end_image_path).name}",
                status="success",
                specs={"duration": clip_duration, "transition": req.transition_type, "resolution": f"{w}x{h}", "fps": req.fps},
                output_url=f"/outputs/videos/{filename}"
            )
        except Exception as e:
            logger.warning("Failed to record keyframe morph usage log: %s", e)
        
        return {
            "success": True,
            "filename": filename,
            "url": f"/outputs/videos/{filename}",
            "local_path": str(output_path),
            "duration": clip_duration,
            "motion_type": req.transition_type,
            "mode": "first_to_last_frame",
            "start_frame": req.start_image_path or req.image_path,
            "end_frame": req.end_image_path,
            "engine": f"{req.model} (Keyframe Interpolation Engine)",
            "resolution": f"{w}x{h}",
            "quality": req.quality,
            "loop": req.loop
        }

    # ─── Mode: Single Keyframe Motion (First Frame) ───
    start_resolved = resolve_path(start_img)
    if not start_resolved or not start_resolved.exists():
        return record_failure(f"Keyframe image not found: {start_img}")

    # Veo Dispatcher
    if "veo" in req.model.lower():
        from services.gemini_service import get_gemini_key, generate_veo_video
        if get_gemini_key():
            try:
                veo_res = await generate_veo_video(prompt=req.prompt or f"Motion vector on {Path(start_img).name}", aspect_ratio=req.aspect_ratio)
                if veo_res.get("success") and veo_res.get("local_path"):
                    result = veo_res
                else:
                    # Graceful local motion fallback with cloud note
                    result = await generate_video_from_image(
                        image_path=str(start_resolved),
                        motion_type=req.motion_type,
                        duration=clip_duration,
                        fps=fps_int,
                        width=w,
                        height=h,
                        quality=req.quality,
                        motion_intensity=motion_intensity,
                        loop=req.loop,
                        model=req.model
                    )
                    result["engine"] = f"{req.model} (Local Motion Engine)"
            except Exception as e:
                logger.warning("VEO generation failed, falling back to local motion engine: %s", e)
                result = await generate_video_from_image(
                    image_path=str(start_resolved),
                    motion_type=req.motion_type,
                    duration=clip_duration,
                    fps=fps_int,
                    width=w,
                    height=h,
                    quality=req.quality,
                    motion_intensity=motion_intensity,
                    loop=req.loop,
                    model=req.model
                )
        else:
            result = await generate_video_from_image(
                image_path=str(start_resolved),
                motion_type=req.motion_type,
                duration=clip_duration,
                fps=fps_int,
                width=w,
                height=h,
                quality=req.quality,
                motion_intensity=motion_intensity,
                loop=req.loop,
                model=req.model
            )
    else:
        result = await generate_video_from_image(
            image_path=str(start_resolved),
            motion_type=req.motion_type if req.motion_type != "orbit" else "orbit",
            duration=clip_duration,
            fps=fps_int,
            width=w,
            height=h,
            quality=req.quality,
            motion_intensity=motion_intensity,
            loop=req.loop,
            model=req.model
        )

    result["mode"] = "first_frame"
    result["resolution"] = f"{w}x{h}"
    result["quality"] = req.quality
    result["motion_intensity"] = motion_intensity
    result["loop"] = req.loop
    result["seed"] = req.seed

    # Sync asset to Cloudflare R2 and Supabase Cloud
    if result.get("local_path"):
        try:
            from services.storage_service import sync_and_save_asset
            synced = await sync_and_save_asset(
                local_path=result["local_path"],
                asset_type="video",
                metadata={"mode": req.mode, "model": req.model, "motion": req.motion_type}
            )
            if synced.get("url"):
                result["url"] = synced["url"]
            result["asset_id"] = synced.get("asset_id")
        except Exception as e:
            logger.warning("Failed to sync video asset to cloud storage: %s", e)

    try:
        from services.usage_tracker import log_generation
        prov = "google" if "veo" in req.model.lower() else ("local" if "ffmpeg" in req.model.lower() else "cloud")
        log_generation(
            service_type="video",
            provider=prov,
            model=result.get("engine", req.model),
            prompt=req.prompt or f"Motion: {req.motion_type} on keyframe",
            status="success" if result.get("success") else "failed",
            specs={"duration": clip_duration, "resolution": f"{w}x{h}", "fps": req.fps, "motion": req.motion_type},
            output_url=result.get("url", ""),
            error=result.get("error") if not result.get("success") else None
        )
    except Exception as e:
        logger.warning("Failed to record video generation usage log: %s", e)

    return result

@router.post("/upload-and-generate")
async def upload_and_generate(
    file: UploadFile = File(...),
    motion_type: str = Form("zoom_in"),
    duration: float = Form(4.0)
):
    clean_name = sanitize_filename(file.filename)
    filename = f"upload_{uuid.uuid4().hex[:8]}_{clean_name}"
    save_path = settings.IMAGES_PATH / filename
    content = await file.read()
    from services.security_service import validate_uploaded_media
    validate_uploaded_media(content, clean_name, "image")
    with open(save_path, "wb") as f:
        f.write(content)
    
    result = await generate_video_from_image(
        image_path=str(save_path), motion_type=motion_type, duration=duration
    )
    return result

@router.get("/motions")
@limiter.limit("60/minute")
async def list_motion_types(request: Request):
    try:
        from database import load_settings_into_runtime
        load_settings_into_runtime()
    except Exception:
        pass

    import os
    replicate_token = os.environ.get("REPLICATE_API_TOKEN") or getattr(settings, 'REPLICATE_API_TOKEN', "")
    try:
        from services.gemini_service import get_gemini_key
        gemini_key = get_gemini_key()
    except Exception:
        gemini_key = os.environ.get("GEMINI_API_KEY") or getattr(settings, 'GEMINI_API_KEY', "")
    openai_key = os.environ.get("OPENAI_API_KEY") or getattr(settings, 'OPENAI_API_KEY', "")

    replicate_active = bool(replicate_token and str(replicate_token).strip())
    google_active = bool(gemini_key and str(gemini_key).strip())
    openai_active = bool(openai_key and str(openai_key).strip())

    return {
        "motions": [
            {"id": "zoom_in", "name": "Push In (Dramatic)", "description": "Camera pushes towards the subject"},
            {"id": "zoom_out", "name": "Pull Out (Reveal)", "description": "Camera pulls back to reveal the full scene"},
            {"id": "pan_left", "name": "Pan Left", "description": "Camera smoothly pans left across the scene"},
            {"id": "pan_right", "name": "Pan Right", "description": "Camera smoothly pans right across the scene"},
            {"id": "tilt_up", "name": "Tilt Up", "description": "Camera tilts upward from ground to sky"},
            {"id": "tilt_down", "name": "Tilt Down", "description": "Camera tilts downward from sky to ground"},
            {"id": "orbit", "name": "Orbital Arc", "description": "Circular parallax tracking rotation"},
            {"id": "subtle", "name": "Subtle Float", "description": "Organic handheld float with breathing effect"}
        ],
        "transitions": [
            {"id": "smooth_morph", "name": "Smooth Dissolve Morph", "description": "Seamless visual dissolve from Frame A to Frame B"},
            {"id": "cross_dissolve", "name": "Cinematic Crossfade", "description": "Classical theatrical luminance crossfade"},
            {"id": "zoom_blend", "name": "Zoom Radial Blend", "description": "Dynamic radial camera burst from Start to End"},
            {"id": "directional_wipe", "name": "Directional Sweep", "description": "High-velocity kinetic wipe between keyframes"}
        ],
        "models": [
            {"id": "ffmpeg_local", "name": "Local Ken Burns / Morph Engine", "active": True, "desc": "Hardware Accelerated FFmpeg 8.1 (Free / Instant)"},
            {"id": "kling_2.0", "name": "Kling AI 2.0 Pro", "active": replicate_active, "desc": "Photorealistic Physics & High Dynamic Kinematics"},
            {"id": "kling_v1.5", "name": "Kling AI v1.5", "active": replicate_active, "desc": "High Frame Consistency & Camera Simulation"},
            {"id": "seedance_v1", "name": "Seedance (ByteDance Magic)", "active": replicate_active, "desc": "High-Fidelity Character & Dance Choreography"},
            {"id": "seedvideo_1.0", "name": "SeedVideo 1.0 (ByteDance)", "active": replicate_active, "desc": "Fluid Multi-Subject Motion Dynamics"},
            {"id": "omni_video_v3", "name": "OmniMotion 3.0 (Native Neural)", "active": True, "desc": "3D Spatial Camera Trajectory & Physics Control"},
            {"id": "omni_human_pro", "name": "OmniHuman Pro", "active": replicate_active, "desc": "Photorealistic Human Expression & Expressive Movement"},
            {"id": "runway_gen3", "name": "Runway Gen-3 Alpha Turbo", "active": replicate_active, "desc": "Ultra-Realistic Cinema Motion Coherence"},
            {"id": "openai_sora", "name": "OpenAI Sora", "active": openai_active, "desc": "World Simulator & Complex Multi-Shot Kinematics"},
            {"id": "luma_dream", "name": "Luma Dream Machine 1.5", "active": replicate_active, "desc": "Consistent 3D Camera Parallax & Fluid Dynamics"},
            {"id": "minimax_video", "name": "Minimax Video-01 (Hailuo)", "active": replicate_active, "desc": "Cinematic Resolution & Natural Human Kinetics"},
            {"id": "google_veo", "name": "Google Veo 2", "active": google_active, "desc": "High Definition 4K Multimodal Video Generation"},
            {"id": "pika_v2", "name": "Pika 2.0", "active": replicate_active, "desc": "Creative Stylized Motion & Kinetic Lens Effects"},
            {"id": "hunyuan_video", "name": "HunyuanVideo (Tencent)", "active": replicate_active, "desc": "Open-Weights High Definition Video Diffusion"},
            {"id": "cogvideox_5b", "name": "CogVideoX-5B", "active": replicate_active, "desc": "Deep Expert 3D VAE Latent Video Synthesis"}
        ],
        "resolutions": [
            {"id": "720p", "name": "720p HD", "desc": "Fast preview quality"},
            {"id": "1080p", "name": "1080p Full HD", "desc": "Standard production quality"},
            {"id": "2k", "name": "2K QHD", "desc": "1440p High Fidelity"},
            {"id": "4k", "name": "4K Ultra HD", "desc": "2160p Maximum resolution output"},
        ],
        "qualities": [
            {"id": "draft", "name": "Draft (Fast)", "desc": "Low latency / high-speed preview"},
            {"id": "balanced", "name": "Production (1080p)", "desc": "Optimal CRF 18 balance"},
            {"id": "cinema", "name": "ProRes Cinema Master", "desc": "Uncompressed CRF 14 studio grade"}
        ],
        "speeds": [
            {"id": 0.5, "name": "0.5x Slow-Mo", "desc": "Ethereal floating pace"},
            {"id": 1.0, "name": "1.0x Cinematic", "desc": "Standard director tempo"},
            {"id": 1.5, "name": "1.5x Dynamic", "desc": "Action tracking speed"},
            {"id": 2.0, "name": "2.0x Hyperlapse", "desc": "High velocity motion"}
        ]
    }

@router.post("/edit")
@limiter.limit("20/minute")
async def edit_video_endpoint(req: EditVideoRequest, request: Request):
    """
    Apply pure video editing tools (trimming, speed curve, aspect ratio,
    color grading/LUTs, audio track mixing, text overlay) to any generated or vault video.
    """
    res = await edit_video(
        video_path=req.video_path,
        start_time=req.start_time,
        end_time=req.end_time,
        speed=req.speed,
        aspect_ratio=req.aspect_ratio,
        brightness=req.brightness,
        contrast=req.contrast,
        saturation=req.saturation,
        preset_lut=req.preset_lut,
        mute_original=req.mute_original,
        bg_audio_path=req.bg_audio_path,
        bg_audio_volume=req.bg_audio_volume,
        original_audio_volume=req.original_audio_volume,
        text_overlay=req.text_overlay,
        text_position=req.text_position,
        video_fade_in=req.video_fade_in,
        video_fade_out=req.video_fade_out,
        audio_fade_in=req.audio_fade_in,
        audio_fade_out=req.audio_fade_out,
        watermark_path=req.watermark_path,
        watermark_position=req.watermark_position,
        chroma_key_color=req.chroma_key_color,
        chroma_bg_path=req.chroma_bg_path
    )
    return res


class ConcatVideoRequest(BaseModel):
    video_paths: list[str]
    transition: Optional[str] = "none"
    transition_duration: Optional[float] = 1.0


@router.post("/concat")
@limiter.limit("15/minute")
async def concat_videos_endpoint(req: ConcatVideoRequest, request: Request):
    """Concatenate multiple video files into a single master video."""
    if not req.video_paths or len(req.video_paths) < 2:
        return {"success": False, "error": "At least two video files are required to merge."}
    
    resolved_paths = []
    for vp in req.video_paths:
        p = resolve_path(vp)
        if not p or not p.exists():
            return {"success": False, "error": f"Video clip not found: {vp}"}
        resolved_paths.append(p)
    
    out_filename = f"merged_{uuid.uuid4().hex[:8]}.mp4"
    out_file = settings.VIDEOS_PATH / out_filename
    
    try:
        await asyncio.to_thread(concatenate_videos, resolved_paths, out_file)
        duration = await asyncio.to_thread(get_media_duration, out_file)
        
        try:
            db_save_asset(
                filename=out_filename,
                media_type="video",
                url=f"/outputs/videos/{out_filename}",
                prompt=f"Merged {len(resolved_paths)} video clips",
                model="FFmpeg Concat Stream",
                cost=0.0
            )
        except Exception as e:
            logger.warning("Failed to save merged asset to db: %s", e)
            
        return {
            "success": True,
            "filename": out_filename,
            "url": f"/outputs/videos/{out_filename}",
            "local_path": str(out_file),
            "duration": duration,
        }
    except Exception as e:
        logger.error("Failed to merge videos: %s", e)
        return {"success": False, "error": str(e)}


@router.post("/upload")
@limiter.limit("20/minute")
async def upload_video(request: Request, file: UploadFile = File(...)):
    """Upload an existing video file, preserving original name and registering in Vault"""
    allowed_exts = {".mp4", ".webm", ".mov", ".mkv"}
    raw_name = file.filename or "uploaded_video.mp4"
    clean_name = sanitize_filename(raw_name)
    ext = Path(clean_name).suffix.lower()
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported video format. Allowed: {sorted(allowed_exts)}")

    dest_dir = settings.VIDEOS_PATH
    dest_dir.mkdir(parents=True, exist_ok=True)

    base_stem = Path(clean_name).stem
    target_filename = clean_name
    counter = 1
    while (dest_dir / target_filename).exists():
        target_filename = f"{base_stem}_{counter}{ext}"
        counter += 1

    dest_path = dest_dir / target_filename
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    stat = dest_path.stat()
    asset_id = f"asset_{uuid.uuid4().hex[:12]}"
    url = f"/outputs/videos/{target_filename}"

    # Calculate duration
    duration = await asyncio.to_thread(get_media_duration, dest_path)

    db_save_asset(
        asset_id=asset_id,
        project_id=None,
        asset_type="videos",
        filename=target_filename,
        url=url,
        local_path=str(dest_path),
        storage_provider="local",
        size_bytes=stat.st_size,
        mime_type=file.content_type or f"video/{ext.lstrip('.')}",
        metadata={"original_name": raw_name, "duration": duration, "uploaded": True}
    )

    return {
        "success": True,
        "filename": target_filename,
        "original_name": raw_name,
        "url": url,
        "duration": duration,
        "size_bytes": stat.st_size,
        "size_mb": round(stat.st_size / (1024 * 1024), 2)
    }


# ─── AI Video Intelligence & Creator Endpoints ───

class SilenceRemovalRequest(BaseModel):
    video_path: str
    noise_threshold_db: float = -30.0
    min_silence_duration: float = 0.5

class AudioFilterRequest(BaseModel):
    video_path: str

class AutoCaptionsRequest(BaseModel):
    video_path: str
    language: str = "en"
    translate_to: Optional[str] = None

class ProductAdRequest(BaseModel):
    product_image_path: str
    product_title: str
    target_audience: str = "Luxury consumers"
    language: str = "en"


@router.post("/ai-remove-silence")
@limiter.limit("15/minute")
async def api_remove_silence(req: SilenceRemovalRequest, request: Request):
    """Automatically cut pauses, umms, and dead air from video"""
    from services.ai_video_tools import remove_silence_from_video
    from services.security_service import safe_resolve_output_path

    try:
        src = safe_resolve_output_path(req.video_path, must_exist=True)
    except Exception as e:
        return {"success": False, "error": f"Invalid video path: {e}"}

    res = await remove_silence_from_video(
        src,
        noise_threshold_db=req.noise_threshold_db,
        min_silence_duration=req.min_silence_duration
    )
    return res


@router.post("/ai-denoise")
@limiter.limit("15/minute")
async def api_denoise_audio(req: AudioFilterRequest, request: Request):
    """Filter fan, traffic, and microphone noise from video using FFmpeg afftdn"""
    from services.ai_video_tools import denoise_video_audio
    from services.security_service import safe_resolve_output_path

    try:
        src = safe_resolve_output_path(req.video_path, must_exist=True)
    except Exception as e:
        return {"success": False, "error": f"Invalid video path: {e}"}

    res = await denoise_video_audio(src)
    return res


@router.post("/ai-enhance-voice")
@limiter.limit("15/minute")
async def api_enhance_voice(req: AudioFilterRequest, request: Request):
    """Apply broadcast-grade EQ, compression, and loudness normalization to vocals"""
    from services.ai_video_tools import enhance_voice_audio
    from services.security_service import safe_resolve_output_path

    try:
        src = safe_resolve_output_path(req.video_path, must_exist=True)
    except Exception as e:
        return {"success": False, "error": f"Invalid video path: {e}"}

    res = await enhance_voice_audio(src)
    return res


@router.post("/ai-captions")
@limiter.limit("15/minute")
async def api_generate_captions(req: AutoCaptionsRequest, request: Request):
    """Generate timestamped subtitles/captions from video audio"""
    from services.ai_video_tools import generate_auto_captions
    from services.security_service import safe_resolve_output_path

    try:
        src = safe_resolve_output_path(req.video_path, must_exist=True)
    except Exception as e:
        return {"success": False, "error": f"Invalid video path: {e}"}

    res = await generate_auto_captions(
        src,
        language=req.language,
        translate_to=req.translate_to
    )
    return res


@router.post("/ai-product-ad")
@limiter.limit("10/minute")
async def api_product_ad(req: ProductAdRequest, request: Request):
    """Generate commercial ad video & storyboard from product image"""
    from services.ai_video_tools import generate_product_ad_campaign
    from services.security_service import safe_resolve_output_path

    try:
        img_src = safe_resolve_output_path(req.product_image_path, must_exist=True)
    except Exception as e:
        return {"success": False, "error": f"Invalid product image path: {e}"}

    res = await generate_product_ad_campaign(
        product_image_path=img_src,
        product_title=req.product_title,
        target_audience=req.target_audience,
        language=req.language
    )
    return res


