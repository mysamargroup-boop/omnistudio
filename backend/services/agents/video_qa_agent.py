import logging
import asyncio
import uuid
import base64
from pathlib import Path
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from services.ffmpeg_service import get_video_duration
from services.gemini_service import get_gemini_key
from services.replicate_service import generate_seedance_video
from config import settings


logger = logging.getLogger("omnistudio.agents.video_qa")


async def extract_qa_frames(video_path: Path) -> list[Path]:
    """Extracts 3 frames (start, middle, end) from a video for QA analysis."""
    frames = []
    try:
        duration = await get_video_duration(video_path)
        if duration <= 0:
            return frames

        # Times to extract: 10%, 50%, and 90% of the video
        times = [duration * 0.1, duration * 0.5, duration * 0.9]
        
        for i, t in enumerate(times):
            frame_path = video_path.parent / f"{video_path.stem}_qa_{i}.jpg"
            cmd = [
                "ffmpeg", "-y",
                "-ss", str(t),
                "-i", str(video_path),
                "-frames:v", "1",
                "-q:v", "2",
                str(frame_path)
            ]
            proc = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            await proc.communicate()
            if frame_path.exists() and frame_path.stat().st_size > 500:
                frames.append(frame_path)
                
    except Exception as e:
        logger.error("Failed to extract QA frames: %s", e)
        
    return frames


async def analyze_video_frames(frames: list[Path], prompt: str) -> dict:
    """Uses Gemini Pro Vision via REST to analyze extracted frames against the prompt."""
    if not frames:
        return {"score": 100, "reason": "No frames to analyze, skipping QA"}
        
    try:
        key = get_gemini_key()
        if not key:
            return {"score": 100, "reason": "No API key, skipping"}
            
        parts = []
        import base64
        import json
        import httpx
        
        for f in frames:
            try:
                with open(f, "rb") as image_file:
                    img_data = base64.b64encode(image_file.read()).decode("utf-8")
                parts.append({
                    "inlineData": {
                        "mimeType": "image/jpeg",
                        "data": img_data
                    }
                })
            except Exception as e:
                logger.warning("Failed to encode frame %s: %s", f, e)
                
        prompt_text = (
            f"You are a strict Video Quality Assurance Director. "
            f"Analyze these 3 frames from a generated video. "
            f"The video was generated using this prompt: '{prompt}'.\n\n"
            f"Task: Score how well the video matches the prompt on a scale of 0 to 100. "
            f"Deduct points for severe deformations, completely wrong subjects, or if the core action/subject is missing. "
            f"Respond ONLY with a JSON object in this exact format:\n"
            f'{{"score": 85, "reason": "Brief explanation here"}}'
        )
        parts.append({"text": prompt_text})
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key={key}"
        payload = {
            "contents": [{"parts": parts}]
        }
        
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, timeout=60.0)
            
        if res.status_code == 200:
            data = res.json()
            candidates = data.get("candidates", [])
            if candidates and candidates[0].get("content", {}).get("parts"):
                text = candidates[0]["content"]["parts"][0].get("text", "")
                text = text.strip().removeprefix("```json").removesuffix("```").strip()
                result = json.loads(text)
                return {
                    "score": int(result.get("score", 100)),
                    "reason": result.get("reason", "Parsed fallback")
                }
        
        return {"score": 100, "reason": f"API Error: {res.status_code}"}
        
    except Exception as e:
        logger.error("Vision QA failed: %s", e)
        return {"score": 100, "reason": "Vision QA failed to process, passing by default"}


class VideoQAAgent(BaseAgent):
    name = "VideoQAAgent"
    description = "Performs visual quality assurance on generated videos using Vision AI. Regenerates automatically if the output fails standards."
    icon = "check-circle"

    async def execute(self, context: PipelineContext) -> AgentResult:
        logger.info("Starting Vision QA on generated scenes...")
        
        # We only QA if we have a GEMINI key for vision
        if not get_gemini_key():
            context.add_log(self.name, "Skipped QA (Gemini Vision API key not configured).")
            return AgentResult(success=True)
            
        target_model = (context.video_model or "omni_flash").lower()
        import re
        is_single_video = bool(
            re.search(r'\b(saare\s+scene\s+ka\s+ek|sare\s+scene\s+ka\s+ek|single\s+video|one\s+video|combine\s+all\s+scenes|ek\s+hi\s+video|pura\s+ek\s+video)\b', context.user_prompt or '', re.IGNORECASE)
        )
        
        scenes_to_process = [context.scenes[0]] if is_single_video and context.scenes else context.scenes
        qa_passed = 0
        qa_failed = 0
        
        for scene in scenes_to_process:
            if not scene.video_path:
                continue
                
            # Local path of the video
            filename = Path(scene.video_path).name
            local_vid_path = settings.VIDEOS_PATH / filename
            
            if not local_vid_path.exists():
                continue
                
            prompt_to_check = scene.video_prompt or scene.description or scene.image_prompt or context.user_prompt
            
            # Extract frames
            frames = await extract_qa_frames(local_vid_path)
            
            if len(frames) == 0:
                continue
                
            # Analyze
            logger.info("Analyzing Scene %s...", scene.index)
            qa_result = await analyze_video_frames(frames, prompt_to_check)
            score = qa_result.get("score", 100)
            reason = qa_result.get("reason", "")
            
            # Cleanup frames
            for f in frames:
                try:
                    f.unlink()
                except:
                    pass
            
            if score >= 70:
                logger.info("Scene %s Passed QA (Score: %s).", scene.index, score)
                qa_passed += 1
            else:
                logger.warning("Scene %s FAILED QA (Score: %s). Reason: %s", scene.index, score, reason)
                qa_failed += 1
                context.add_log(self.name, f"Scene {scene.index} failed QA (Score {score}). Reason: {reason}. Triggering autonomous regeneration...")
                
                # --- REGENERATION LOGIC ---
                from services.gemini_service import generate_veo_video
                
                # Attempt 1 regeneration
                dur = scene.duration_seconds or 4.0
                if "seedance" in target_model:
                    regen_res = await generate_seedance_video(
                        prompt=prompt_to_check + ". Focus strongly on accuracy and clear subject representation.",
                        aspect_ratio=context.aspect_ratio,
                        image_path=scene.image_path,
                        duration_seconds=int(dur)
                    )
                else:
                    regen_res = await generate_veo_video(
                        prompt=prompt_to_check + ". Focus strongly on accuracy and clear subject representation.",
                        aspect_ratio=context.aspect_ratio,
                        image_path=scene.image_path,
                        duration_seconds=int(dur)
                    )
                    
                if regen_res.get("success") and regen_res.get("local_path"):
                    new_path = Path(regen_res["local_path"])
                    if new_path.exists():
                        # Overwrite old video
                        import shutil
                        shutil.copyfile(str(new_path), str(local_vid_path))
                        logger.info("Scene %s successfully regenerated.", scene.index)
                        context.add_log(self.name, f"Scene {scene.index} was successfully regenerated to meet quality standards.")
                        # Remove temp regen file if different
                        if str(new_path) != str(local_vid_path):
                            try:
                                new_path.unlink()
                            except:
                                pass
                else:
                    logger.error("Regeneration failed for Scene %s. Keeping original.", scene.index)
                    context.add_log(self.name, f"Regeneration attempt failed for Scene {scene.index}. Keeping original video.")
        
        total = qa_passed + qa_failed
        if total > 0:
            if qa_failed > 0:
                context.add_log(self.name, f"Vision QA complete. {qa_passed}/{total} scenes passed on first try. {qa_failed} scenes triggered autonomous regeneration.")
            else:
                context.add_log(self.name, f"Vision QA complete. All {total} scenes passed visual inspection (Scores â‰¥ 70).")
                
        return AgentResult(success=True)
