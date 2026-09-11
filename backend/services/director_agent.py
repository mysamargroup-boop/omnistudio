import json
import re
from typing import Optional
from config import settings

async def direct_video_prompt(
    idea: str,
    generation_mode: str = "first_frame",
    target_video_model: str = "ffmpeg_local",
    style: str = "cinematic",
    aspect_ratio: str = "16:9"
) -> dict:
    """
    Parallel AI Director Agent using OpenAI (gpt-4o-mini / gpt-4o).
    Enhances the user's raw idea into a production-grade cinematic video prompt,
    selects the optimal camera vector, crafts negative prompts, and specifies lighting notes.
    The video itself can be rendered with any target video model (Kling, Luma, Minimax, FFmpeg, etc.).
    """
    if settings.OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            system_prompt = f"""You are a master Hollywood cinematography and visual effects director.
Your job is to take a creator's raw concept and choreograph it for AI video generation.
Target Video Engine: {target_video_model}
Generation Mode: {generation_mode} (text_to_video, first_frame, or first_to_last_frame)
Style: {style}
Aspect Ratio: {aspect_ratio}

Respond ONLY with a valid JSON object matching this schema:
{{
  "enhanced_prompt": "Ultra-detailed visual prompt describing the scene, motion dynamics, subject velocity, micro-movements, environmental particles, and cinematic texture (under 75 words)",
  "camera_direction": "one of: zoom_in, zoom_out, pan_left, pan_right, tilt_up, tilt_down, orbit, subtle",
  "transition_type": "one of: smooth_morph, cross_dissolve, zoom_blend, directional_wipe",
  "recommended_fps": 24 or 30 or 60,
  "negative_prompt": "video-specific negative prompt to eliminate jitter, morphing artifacts, flickering, unnatural anatomical distortion, low resolution, watermark",
  "lighting_directive": "specific lighting notes e.g. Volumetric golden hour rim light, soft diffuse key light, anamorphic streak flares",
  "director_notes": "1-2 sentences from the director explaining the dramatic intent and camera motivation"
}}"""

            user_message = f"Creator's Scene Concept: \"{idea}\""

            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )

            raw_json = response.choices[0].message.content.strip()
            data = json.loads(raw_json)

            return {
                "success": True,
                "enhanced_prompt": data.get("enhanced_prompt", idea),
                "camera_direction": data.get("camera_direction", "zoom_in"),
                "transition_type": data.get("transition_type", "smooth_morph"),
                "recommended_fps": data.get("recommended_fps", 30),
                "negative_prompt": data.get("negative_prompt", "jitter, blurry, distorted anatomy, morphing defects, flickering, text, watermark"),
                "lighting_directive": data.get("lighting_directive", "Cinematic volumetric lighting, 8k raytracing"),
                "director_notes": data.get("director_notes", "Camera smoothly frames the primary focal point with natural kinetic energy."),
                "model_used": "OpenAI GPT-4o-mini Director Copilot",
                "simulated": False
            }
        except Exception as e:
            # Fall through to Gemini or algorithmic director if OpenAI errors
            pass

    # Tier 2: Gemini 2.5 Flash Director Copilot
    try:
        from services.gemini_service import get_gemini_key, generate_gemini_text
        if get_gemini_key():
            gemini_director_prompt = f"""You are a master Hollywood cinematography and visual effects director.
Your job is to take a creator's raw concept and choreograph it for AI video generation.
Target Video Engine: {target_video_model}
Generation Mode: {generation_mode}
Style: {style}
Aspect Ratio: {aspect_ratio}
Creator's Scene Concept: "{idea}"

Respond ONLY with a valid JSON object matching this schema:
{{
  "enhanced_prompt": "Ultra-detailed visual prompt describing the scene, motion dynamics, subject velocity, micro-movements, environmental particles, and cinematic texture (under 75 words)",
  "camera_direction": "one of: zoom_in, zoom_out, pan_left, pan_right, tilt_up, tilt_down, orbit, subtle",
  "transition_type": "one of: smooth_morph, cross_dissolve, zoom_blend, directional_wipe",
  "recommended_fps": 30,
  "negative_prompt": "video-specific negative prompt to eliminate jitter, morphing artifacts, flickering, unnatural anatomical distortion, low resolution, watermark",
  "lighting_directive": "specific lighting notes e.g. Volumetric golden hour rim light, soft diffuse key light, anamorphic streak flares",
  "director_notes": "1-2 sentences from the director explaining the dramatic intent and camera motivation"
}}"""
            gemini_res = await generate_gemini_text(gemini_director_prompt)
            if gemini_res.get("success") and gemini_res.get("text"):
                text = gemini_res["text"].strip()
                match = re.search(r'\{.*\}', text, re.DOTALL)
                if match:
                    data = json.loads(match.group(0))
                    return {
                        "success": True,
                        "enhanced_prompt": data.get("enhanced_prompt", idea),
                        "camera_direction": data.get("camera_direction", "zoom_in"),
                        "transition_type": data.get("transition_type", "smooth_morph"),
                        "recommended_fps": data.get("recommended_fps", 30),
                        "negative_prompt": data.get("negative_prompt", "jitter, blurry, distorted anatomy, morphing defects, flickering, text, watermark"),
                        "lighting_directive": data.get("lighting_directive", "Cinematic volumetric lighting, 8k raytracing"),
                        "director_notes": data.get("director_notes", "Camera smoothly frames the primary focal point with natural kinetic energy."),
                        "model_used": "Google Gemini 2.5 Flash Director Copilot",
                        "simulated": False
                    }
    except Exception:
        pass

    # Intelligent Algorithmic Director Copilot (Fallback when no OpenAI/Gemini key)
    camera_map = {
        "action": "pan_right",
        "portrait": "zoom_in",
        "landscape": "pan_left",
        "reveal": "zoom_out",
        "dramatic": "orbit",
        "cinematic": "zoom_in"
    }

    selected_camera = "zoom_in"
    for k, cam in camera_map.items():
        if k in idea.lower():
            selected_camera = cam
            break

    cinematic_flair = (
        f"Cinematic {style} masterpiece, shot on Arri Alexa LF 35mm anamorphic lens. "
        f"{idea.strip().rstrip('.')}. "
        f"Dynamic kinetic motion, photorealistic physics, sub-pixel atmospheric depth, volumetric rim lighting, 8k resolution, color graded."
    )

    return {
        "success": True,
        "enhanced_prompt": cinematic_flair,
        "camera_direction": selected_camera,
        "transition_type": "smooth_morph",
        "recommended_fps": 30,
        "negative_prompt": "jitter, blur, flickering, low quality, morphing artifacts, distorted limbs, overexposed, watermark, text",
        "lighting_directive": "Volumetric atmospheric rim lighting with natural filmic grain and color contrast",
        "director_notes": "Algorithmic Director optimized motion vector for maximum depth parallax and subject stability.",
        "model_used": "OmniStudio Algorithmic Director (Add OpenAI Key in Settings for GPT-4o)",
        "simulated": True
    }
