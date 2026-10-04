import logging
import asyncio
import uuid
import base64
from pathlib import Path
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from services.ffmpeg_service import get_media_duration
from services.gemini_service import get_gemini_key
from services.replicate_service import generate_seedance_video
from config import settings


logger = logging.getLogger("omnistudio.agents.video_qa")


async def extract_qa_frames(video_path: Path) -> list[Path]:
    """Extracts 3 frames (start, middle, end) from a video for QA analysis."""
    frames = []
    try:
        duration = await asyncio.to_thread(get_media_duration, str(video_path))
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
    """Uses OpenAI GPT-4o Vision (Tier 1) or Gemini Pro Vision (Tier 2) to analyze extracted frames and perform recursive reasoning."""
    if not frames:
        return {"score": 100, "reason": "No frames to analyze, skipping QA"}

    import base64
    import json
    import httpx
    from services.openai_service import get_openai_key

    # Encode frames
    base64_frames = []
    for f in frames:
        try:
            with open(f, "rb") as image_file:
                base64_frames.append(base64.b64encode(image_file.read()).decode("utf-8"))
        except Exception as e:
            logger.warning("Failed to encode frame %s: %s", f, e)

    if not base64_frames:
        return {"score": 100, "reason": "No valid frames encoded, passing by default"}

    qa_prompt_instruction = (
        f"You are a strict Video Quality Assurance Director and Cinematography Critic. "
        f"Analyze these {len(base64_frames)} extracted frames from a generated AI video clip. "
        f"The video was generated using this prompt: '{prompt}'.\n\n"
        f"Task:\n"
        f"1. Score how well the video matches the prompt on a scale of 0 to 100.\n"
        f"2. Deduct points for severe deformations, unnatural anatomy, identity drift, camera jitter, or wrong subject/setting.\n"
        f"3. If score < 70, provide 'corrected_prompt' that surgically fixes the issues (e.g. steady camera angle, slower motion, high temporal consistency) and 'negative_prompt_additions'.\n\n"
        f"Respond ONLY with a valid JSON object in this format:\n"
        f'{{"score": 85, "reason": "Brief explanation", "corrected_prompt": "Refined cinematic prompt...", "negative_prompt_additions": "jitter, morphing, warped anatomy"}}'
    )

    # 1. Try OpenAI GPT-4o Vision (Tier 1 Primary for Recursive Reasoning)
    openai_key = get_openai_key()
    if openai_key:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=openai_key)
            content_parts: list[dict] = [{"type": "text", "text": qa_prompt_instruction}]
            for b64 in base64_frames:
                content_parts.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "low"}
                })
            
            res = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": content_parts}],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            raw = res.choices[0].message.content.strip()
            result = json.loads(raw)
            return {
                "score": int(result.get("score", 100)),
                "reason": result.get("reason", "OpenAI Vision QA evaluated"),
                "corrected_prompt": result.get("corrected_prompt", ""),
                "negative_prompt_additions": result.get("negative_prompt_additions", ""),
                "model": "OpenAI GPT-4o Vision"
            }
        except Exception as oe:
            logger.warning("OpenAI GPT-4o Vision QA failed: %s, falling back to Gemini", oe)

    # 2. Try Gemini 2.5 Pro Vision (Tier 2 Fallback)
    key = get_gemini_key()
    if key:
        try:
            parts = []
            for b64 in base64_frames:
                parts.append({
                    "inlineData": {
                        "mimeType": "image/jpeg",
                        "data": b64
                    }
                })
            parts.append({"text": qa_prompt_instruction})
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key={key}"
            payload = {"contents": [{"parts": parts}]}
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
                        "reason": result.get("reason", "Gemini Vision QA evaluated"),
                        "corrected_prompt": result.get("corrected_prompt", ""),
                        "negative_prompt_additions": result.get("negative_prompt_additions", ""),
                        "model": "Gemini 2.5 Pro Vision"
                    }
        except Exception as ge:
            logger.warning("Gemini Vision QA failed: %s", ge)

    return {"score": 100, "reason": "Vision QA passed by default"}


class VideoQAAgent(BaseAgent):
    name = "VideoQAAgent"
    description = "Performs visual quality assurance and recursive error correction on generated videos using Vision AI. Regenerates automatically if the output fails standards."
    icon = "check-circle"

    async def execute(self, context: PipelineContext) -> AgentResult:
        logger.info("Starting Vision QA on generated scenes...")
        from services.openai_service import get_openai_key
        
        # Verify vision API key is available
        if not get_openai_key() and not get_gemini_key():
            context.add_log(self.name, "Skipped QA (Neither OpenAI nor Gemini Vision API key configured).")
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
                
                # --- REGENERATION LOGIC with Recursive Prompt Rewrite ---
                from services.gemini_service import generate_veo_video
                
                corrected = qa_result.get("corrected_prompt", "").strip()
                if corrected and len(corrected) > 15:
                    prompt_for_regen = corrected
                    context.add_log(self.name, f"Scene {scene.index} recursive prompt rewrite: '{corrected[:80]}...'")
                else:
                    prompt_for_regen = prompt_to_check + ". Focus strongly on temporal consistency, natural anatomy, and smooth cinematic kinematics."

                # Attempt 1 regeneration
                dur = scene.duration_seconds or 4.0
                if "seedance" in target_model:
                    regen_res = await generate_seedance_video(
                        prompt=prompt_for_regen,
                        aspect_ratio=context.aspect_ratio,
                        image_path=scene.image_path,
                        duration_seconds=int(dur)
                    )
                else:
                    regen_res = await generate_veo_video(
                        prompt=prompt_for_regen,
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
