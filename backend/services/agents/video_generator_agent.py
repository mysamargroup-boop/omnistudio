import os
import uuid
import logging
import shutil
import asyncio
from pathlib import Path
from typing import Optional, List, Dict, Any
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from services.ffmpeg_service import image_to_video_motion
from services.gemini_service import get_gemini_key, generate_veo_video
from services.replicate_service import generate_seedance_video
from database import db_save_asset
from config import settings

logger = logging.getLogger("omnistudio.agents.video")

# ── Maximum single-clip duration per model (seconds) ──
MODEL_MAX_CLIP = {
    "omni_flash": 10,
    "seedance": 30,
    "kling_1_6": 10,
    "runway_gen4": 16,
    "pika_2_2": 8,
    "hailuo_minimax": 6,
    "sora": 20,
    "luma_ray3": 5,
}

MODEL_COST_PER_SEC = {
    "omni_flash": 0.20,
    "seedance": 0.15,
    "kling_1_6": 0.10,
    "runway_gen4": 0.25,
    "pika_2_2": 0.08,
    "hailuo_minimax": 0.10,
    "sora": 0.30,
    "luma_ray3": 0.12,
}

MODEL_DISPLAY = {
    "omni_flash": "Google Veo 3.1 (Omni Flash)",
    "seedance": "ByteDance Seedance 2.5",
    "kling_1_6": "Kling 1.6 Pro",
    "runway_gen4": "Runway Gen-4",
    "pika_2_2": "Pika 2.2",
    "hailuo_minimax": "Hailuo AI (MiniMax)",
    "sora": "OpenAI Sora",
    "luma_ray3": "Luma Ray 3",
}


async def extract_last_frame(video_path: Path, output_path: Path) -> bool:
    """Extract the last frame of a video as a PNG image using FFmpeg."""
    try:
        # Get duration first
        probe_cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(video_path)
        ]
        proc = await asyncio.create_subprocess_exec(
            *probe_cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()
        duration = float(stdout.decode().strip()) if stdout else 0

        if duration <= 0:
            return False

        # Extract frame at duration - 0.1s
        seek_time = max(duration - 0.1, 0)
        extract_cmd = [
            "ffmpeg", "-y",
            "-ss", str(seek_time),
            "-i", str(video_path),
            "-frames:v", "1",
            "-q:v", "2",
            str(output_path)
        ]
        proc = await asyncio.create_subprocess_exec(
            *extract_cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        await proc.communicate()
        return output_path.exists() and output_path.stat().st_size > 500
    except Exception as e:
        logger.warning("Failed to extract last frame: %s", e)
        return False


async def crossfade_merge_videos(
    video_paths: list[Path],
    output_path: Path,
    crossfade_duration: float = 0.5
) -> bool:
    """Merge multiple video clips with crossfade transitions using FFmpeg."""
    if len(video_paths) == 1:
        shutil.copyfile(str(video_paths[0]), str(output_path))
        return True

    try:
        # Build complex filter for crossfade chain
        inputs = []
        for vp in video_paths:
            inputs.extend(["-i", str(vp)])

        # For N videos, we need N-1 crossfade operations
        filter_parts = []
        n = len(video_paths)

        if n == 2:
            # Simple 2-clip crossfade
            filter_parts.append(
                f"[0:v][1:v]xfade=transition=fade:duration={crossfade_duration}:offset={{offset0}}[vout]"
            )
            # Calculate offset: duration of first clip minus crossfade
            probe_cmd = [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(video_paths[0])
            ]
            proc = await asyncio.create_subprocess_exec(
                *probe_cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await proc.communicate()
            dur0 = float(stdout.decode().strip()) if stdout else 4.0
            offset0 = max(dur0 - crossfade_duration, 0.5)

            filter_str = filter_parts[0].replace("{offset0}", f"{offset0:.2f}")

            # Also handle audio if present
            audio_filter = f"[0:a][1:a]acrossfade=d={crossfade_duration}[aout]"

            cmd = [
                "ffmpeg", "-y", *inputs,
                "-filter_complex", f"{filter_str};{audio_filter}",
                "-map", "[vout]", "-map", "[aout]",
                "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                "-c:a", "aac", "-b:a", "192k",
                "-movflags", "+faststart",
                str(output_path)
            ]
        else:
            # For 3+ clips, use concat with crossfade — simpler approach
            # Build a concat demuxer list file
            list_file = output_path.with_suffix(".txt")
            with open(list_file, "w") as f:
                for vp in video_paths:
                    f.write(f"file '{vp}'\n")

            cmd = [
                "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", str(list_file),
                "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                "-c:a", "aac", "-b:a", "192k",
                "-movflags", "+faststart",
                str(output_path)
            ]

        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        _, stderr = await proc.communicate()

        # If crossfade failed (e.g., no audio streams), try simple concat
        if not output_path.exists() or output_path.stat().st_size < 1000:
            logger.info("Crossfade merge failed, falling back to simple concat...")
            list_file = output_path.with_suffix(".txt")
            with open(list_file, "w") as f:
                for vp in video_paths:
                    f.write(f"file '{vp}'\n")

            fallback_cmd = [
                "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", str(list_file),
                "-c", "copy",
                "-movflags", "+faststart",
                str(output_path)
            ]
            proc = await asyncio.create_subprocess_exec(
                *fallback_cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            await proc.communicate()

        # Cleanup list file
        list_file = output_path.with_suffix(".txt")
        if list_file.exists():
            list_file.unlink()

        return output_path.exists() and output_path.stat().st_size > 1000
    except Exception as e:
        logger.error("Crossfade merge error: %s", e)
        return False


def _resolve_image_to_disk_or_url(img_ref: Optional[str]) -> Optional[str]:
    """Resolve an image reference (file path, /outputs/ web path, or URL) to a usable path."""
    if not img_ref:
        return None
    p = Path(img_ref)
    if p.exists() and p.is_file():
        return str(p)
    if "/outputs/" in img_ref:
        parts = img_ref.split("/outputs/")[-1]
        cand = settings.OUTPUTS_PATH / parts
        if cand.exists():
            return str(cand)
    cand2 = settings.OUTPUTS_PATH / 'images' / p.name
    if cand2.exists():
        return str(cand2)
    return img_ref


class VideoGeneratorAgent(BaseAgent):
    name = "VideoGeneratorAgent"
    description = "Generates animated video clips with automatic extension chain for long-duration output"
    icon = "video"

    async def execute(self, context: PipelineContext) -> AgentResult:
        videos_dir = settings.OUTPUTS_PATH / 'videos'
        videos_dir.mkdir(parents=True, exist_ok=True)

        target_model = (context.video_model or "omni_flash").lower()
        import re
        is_single_video = bool(
            re.search(r'\b(saare\s+scene\s+ka\s+ek|sare\s+scene\s+ka\s+ek|single\s+video|one\s+video|combine\s+all\s+scenes|ek\s+hi\s+video|pura\s+ek\s+video)\b', context.user_prompt or '', re.IGNORECASE)
        )

        # Resolve per-scene duration from project_brief or scene data
        brief = context.project_brief or {}
        total_duration_from_brief = brief.get("total_duration")

        max_clip_sec = MODEL_MAX_CLIP.get(target_model, 10)
        cost_per_sec = MODEL_COST_PER_SEC.get(target_model, 0.20)
        model_display_name = MODEL_DISPLAY.get(target_model, "Google Veo 3.1 (Omni Flash)")

        # Validate API keys and handle fallback
        if "seedance" in target_model:
            if not settings.REPLICATE_API_TOKEN:
                logger.warning("Seedance selected but REPLICATE_API_TOKEN missing. Falling back to Omni Flash.")
                target_model = "omni_flash"
                max_clip_sec = MODEL_MAX_CLIP.get(target_model, 10)
                cost_per_sec = MODEL_COST_PER_SEC.get(target_model, 0.20)
                model_display_name = MODEL_DISPLAY.get(target_model, "Google Veo 3.1 (Omni Flash)")
        
        if "seedance" not in target_model:
            if not get_gemini_key():
                return AgentResult(success=False, error="GEMINI_API_KEY not configured for video generation.")

        scenes_to_process = [context.scenes[0]] if is_single_video and context.scenes else context.scenes
        total_cost_usd = 0.0
        total_cost_inr = 0.0

        for scene in scenes_to_process:
            # ── Determine target duration for this scene ──
            if is_single_video:
                dur = total_duration_from_brief if total_duration_from_brief else 6.0
            elif total_duration_from_brief and len(context.scenes) > 0:
                # Distribute total duration across scenes
                dur = max(float(total_duration_from_brief) / len(context.scenes), 4.0)
            else:
                dur = max(float(scene.duration_seconds or 4.0), 4.0)

            # ── Resolve keyframe image reference ──
            img_disk_path = None
            if scene.image_path:
                img_name = Path(scene.image_path).name
                candidate = settings.OUTPUTS_PATH / 'images' / img_name
                if candidate.exists():
                    img_disk_path = candidate
                elif Path(scene.image_path).exists():
                    img_disk_path = Path(scene.image_path)

            # Character Lock & Reference Priority
            if context.character_lock and context.character_image:
                primary_ref = _resolve_image_to_disk_or_url(context.character_image)
                if scene.index == 1:
                    context.add_log(self.name, f"Character lock active: {context.character_name} - using character image for consistency")
            else:
                primary_ref = str(img_disk_path) if img_disk_path else _resolve_image_to_disk_or_url(context.reference_image)

            prompt_for_video = (
                f"{context.user_prompt}. {scene.description or scene.image_prompt}"
                if is_single_video
                else (scene.video_prompt or scene.description or scene.image_prompt or context.user_prompt)
            )

            # ══════════════════════════════════════════════════════════
            #  VIDEO EXTENSION CHAIN (DOLA / Higgsfield Method)
            #  If requested duration > max clip, generate sequential
            #  clips using last-frame as reference for continuity
            # ══════════════════════════════════════════════════════════
            if dur > max_clip_sec:
                logger.info(
                    "Scene %s: Requested %ss > max clip %ss. Activating Extension Chain...",
                    scene.index, dur, max_clip_sec
                )
                segment_clips = []
                remaining = dur
                segment_idx = 0
                current_ref_image = primary_ref

                while remaining > 0:
                    # Calculate this segment's duration
                    seg_dur = min(remaining, max_clip_sec)
                    if seg_dur < 2:
                        break  # Too short to generate

                    # Build continuation prompt for extensions
                    if segment_idx == 0:
                        seg_prompt = prompt_for_video
                    else:
                        seg_prompt = (
                            f"Seamless continuation of the previous shot. "
                            f"Maintain exact same character identity, outfit, lighting, and camera style. "
                            f"{prompt_for_video}"
                        )

                    seg_filename = f"scene_{scene.index}_seg{segment_idx}_{uuid.uuid4().hex[:6]}.mp4"
                    seg_local = videos_dir / seg_filename

                    logger.info(
                        "  Extension segment %d: %ss (ref_image: %s)",
                        segment_idx, seg_dur, "yes" if current_ref_image else "no"
                    )

                    if "seedance" in target_model:
                        veo_res = await generate_seedance_video(
                            prompt=seg_prompt,
                            aspect_ratio=context.aspect_ratio,
                            image_path=current_ref_image,
                            duration_seconds=int(seg_dur)
                        )
                    else:
                        veo_res = await generate_veo_video(
                            prompt=seg_prompt,
                            aspect_ratio=context.aspect_ratio,
                            image_path=current_ref_image,
                            duration_seconds=int(seg_dur)
                        )

                    if not veo_res.get("success"):
                        err = veo_res.get("error", "Unknown error")
                        logger.error("Extension segment %d failed: %s", segment_idx, err)
                        # If first segment fails, it's a real error
                        if segment_idx == 0:
                            return AgentResult(
                                success=False,
                                error=f"{model_display_name} Error on Scene {scene.index} segment {segment_idx}: {err}"
                            )
                        # If extension segment fails, use what we have
                        logger.warning("Extension segment %d failed, using %d segments collected so far.", segment_idx, len(segment_clips))
                        break

                    # Copy generated video to our segment path
                    if veo_res.get("local_path") and Path(veo_res["local_path"]).exists():
                        src = Path(veo_res["local_path"])
                        if src != seg_local:
                            shutil.copyfile(str(src), str(seg_local))
                        segment_clips.append(seg_local)
                    else:
                        if segment_idx == 0:
                            return AgentResult(
                                success=False,
                                error=f"{model_display_name} produced no video for Scene {scene.index}."
                            )
                        break

                    # ── Extract last frame for next segment's reference ──
                    last_frame_path = videos_dir / f"scene_{scene.index}_lastframe_{segment_idx}.png"
                    extracted = await extract_last_frame(seg_local, last_frame_path)
                    if extracted:
                        current_ref_image = str(last_frame_path)
                        logger.info("  Extracted last frame for continuity → %s", last_frame_path.name)
                    else:
                        logger.warning("  Could not extract last frame, next segment will use original image.")

                    remaining -= seg_dur
                    segment_idx += 1

                # ── Merge all segments into one seamless video ──
                if len(segment_clips) == 0:
                    return AgentResult(
                        success=False,
                        error=f"No video segments were generated for Scene {scene.index}."
                    )

                final_filename = f"scene_{scene.index}_{uuid.uuid4().hex[:8]}.mp4"
                final_path = videos_dir / final_filename
                web_url = f"/outputs/videos/{final_filename}"

                if len(segment_clips) == 1:
                    shutil.copyfile(str(segment_clips[0]), str(final_path))
                else:
                    logger.info("Merging %d extension segments with crossfade...", len(segment_clips))
                    merged = await crossfade_merge_videos(segment_clips, final_path, crossfade_duration=0.5)
                    if not merged:
                        # Fallback: just use first segment
                        shutil.copyfile(str(segment_clips[0]), str(final_path))
                        logger.warning("Crossfade merge failed, using first segment only.")

                # Cleanup segment files
                for seg_clip in segment_clips:
                    try:
                        if seg_clip.exists() and seg_clip != final_path:
                            seg_clip.unlink()
                    except Exception:
                        pass

                scene.video_path = web_url
                actual_dur = dur  # Target duration

            else:
                # ══════════════════════════════════════════════
                #  STANDARD: Single clip (duration <= max clip)
                # ══════════════════════════════════════════════
                file_name = f"scene_{scene.index}_{uuid.uuid4().hex[:8]}.mp4"
                local_path = videos_dir / file_name
                web_url = f"/outputs/videos/{file_name}"

                logger.info("Calling %s for scene %s (duration: %ss)...", model_display_name, scene.index, dur)
                if "seedance" in target_model:
                    veo_res = await generate_seedance_video(
                        prompt=prompt_for_video,
                        aspect_ratio=context.aspect_ratio,
                        image_path=primary_ref,
                        duration_seconds=int(dur)
                    )
                else:
                    veo_res = await generate_veo_video(
                        prompt=prompt_for_video,
                        aspect_ratio=context.aspect_ratio,
                        image_path=primary_ref,
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
                actual_dur = dur

            # ── Handle single video mode ──
            if is_single_video:
                context.master_video_path = web_url
                for sc in context.scenes:
                    sc.video_path = web_url

            # ── Cost accounting ──
            scene_cost_usd = round(actual_dur * cost_per_sec, 3)
            scene_cost_inr = round(scene_cost_usd * 85.0, 2)

            try:
                db_save_asset(
                    type="video",
                    url=web_url,
                    filename=Path(web_url).name,
                    prompt=prompt_for_video,
                    model=model_display_name,
                    cost_usd=scene_cost_usd,
                    cost_inr=scene_cost_inr
                )
            except Exception as dbe:
                logger.debug("Failed to record video asset in DB: %s", dbe)

            total_cost_usd += scene_cost_usd
            total_cost_inr += scene_cost_inr

        # ── Final logging ──
        extension_note = ""
        if any(
            (float(s.duration_seconds or 4) > max_clip_sec)
            for s in scenes_to_process
        ):
            extension_note = " (with Extension Chain for continuous long-form output)"

        if is_single_video:
            context.add_log(
                self.name,
                f"{model_display_name} generated single unified video{extension_note}.",
                cost_usd=total_cost_usd,
                cost_inr=total_cost_inr
            )
        else:
            context.add_log(
                self.name,
                f"{model_display_name} synthesized video clips for {len(context.scenes)} scenes{extension_note}.",
                cost_usd=total_cost_usd,
                cost_inr=total_cost_inr
            )

        return AgentResult(success=True)
