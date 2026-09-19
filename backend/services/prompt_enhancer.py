import json
import re
import logging
from config import settings

logger = logging.getLogger("omnistudio.prompt_enhancer")

CINEMATIC_MODIFIERS = {
    "cinematic": "shot on 35mm Arri Alexa LF, anamorphic lens, shallow depth of field, dramatic cinematic volumetric lighting, raytracing, photorealistic 8k, hyper-detailed, film grain, color graded",
    "cyberpunk": "cyberpunk aesthetics, neon glow, wet reflective asphalt, moody atmospheric fog, octane render, 8k resolution, Unreal Engine 5, futuristic high-tech noir",
    "anime": "Makoto Shinkai aesthetic, Studio Ghibli inspired, vibrant colors, detailed anime illustration, painterly background, celestial skies, emotional lighting",
    "3d_pixar": "Pixar and Disney animation style, 3D character design, subsurface scattering, soft warm studio lighting, 8k 3D render, expressive, smooth textures",
    "photoreal": "hyper-realistic photography, Hasselblad H6D-100c, 85mm portrait lens, natural studio lighting, ultra sharp focus, pore-level texture, masterpiece",
    # 6 Specialized Prompt Engineer Agent Presets
    "more_realistic": "ultra-detailed 8K photography, Hasselblad H6D-100c, 85mm f/1.4 lens, natural ambient daylight, raw authentic textures, micro-details, hyper-realistic, unedited documentary aesthetic",
    "more_cinematic": "shot on 35mm Arri Alexa LF, anamorphic lens flare, shallow depth of field, dramatic atmospheric haze, cinematic rim light, golden hour, color graded by Hollywood colorist",
    "more_luxury": "ultra-luxury high-end commercial aesthetic, opulent materials, elegant gold caustics, architectural luxury lighting, pristine studio reflections, elite editorial Vogue luxury",
    "more_fashion": "high-fashion editorial photography, Paris Fashion Week haute couture, Profoto softbox studio lighting, dramatic angles, avant-garde styling, crisp rim light, Harper's Bazaar cover quality",
    "more_commercial": "crisp commercial product advertising, clean high-key studio lighting, flawless pristine surfaces, sharp macro focus, vibrant commercial color grade, Apple advertising aesthetic",
    "more_viral": "high-energy dynamic composition, dramatic perspective, punchy saturated colors, eye-catching visual hook, hyper-engaging TikTok & Instagram trending aesthetic, viral visual impact"
}

async def enhance_prompt(prompt: str, style: str = "cinematic") -> str:
    """Expand a short prompt into a high-end cinematic generation prompt"""
    modifier = CINEMATIC_MODIFIERS.get(style, CINEMATIC_MODIFIERS["cinematic"])
    
    if settings.OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            res = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an elite Hollywood visual director. Take the user's prompt and expand it into a detailed, visually stunning image generation prompt including composition, lighting, camera type, and mood. Keep it under 60 words, no conversational filler."},
                    {"role": "user", "content": f"Style: {style}. Prompt: {prompt}"}
                ],
                max_tokens=120,
                temperature=0.7
            )
            return res.choices[0].message.content.strip()
        except Exception as e:
            logger.debug("OpenAI prompt expansion unavailable: %s", e)

    # Gemini 2.5 Flash Enhancer fallback
    try:
        from services.gemini_service import get_gemini_key, generate_gemini_text
        if get_gemini_key():
            gemini_prompt = f"You are an elite Hollywood visual director. Expand this user idea into a detailed, visually stunning image generation prompt in {style} aesthetic including composition, lighting, camera type, and mood. Keep it under 60 words, output ONLY the enhanced prompt: '{prompt}'"
            gemini_res = await generate_gemini_text(gemini_prompt)
            if gemini_res.get("success") and gemini_res.get("text"):
                return gemini_res["text"].strip().strip('"')
    except Exception as e:
        logger.debug("Gemini prompt expansion fallback unavailable: %s", e)
            
    # Algorithmic cinematic prompt enhancer
    clean_prompt = (prompt or "").strip().rstrip(".,; ")
    if not clean_prompt:
        return f"Cinematic sequence, {modifier}"
    enhanced = f"{clean_prompt}, {modifier}"
    return enhanced

async def generate_storyboard(topic: str, num_scenes: int = 3) -> list[dict]:
    """
    Break down any topic or story idea into structured scenes for the automated pipeline.
    Each scene contains visual prompt, camera direction, and voiceover narration script.
    """
    cinematic_camera_motions = [
        "dolly_zoom_vertigo", "fpv_drone_dive", "dutch_angle_tilt", "low_angle_hero_track",
        "crane_pedestal_reveal", "steadicam_orbit_360", "whip_pan_transition", "rack_focus_shallow",
        "handheld_cinema_verite", "overhead_gods_eye", "tracking_side_profile", "extreme_close_up_macro",
        "slow_push_in", "reverse_pull_back", "tilt_up_skyline", "orbit_left_arc",
        "crane_down_low", "fpv_flythrough", "whip_tilt_down", "dolly_in_rapid"
    ]

    if settings.OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            prompt_content = f"""
Break this story topic into exactly {num_scenes} sequential cinematic scenes:
Topic: "{topic}"

CRITICAL RULE: Do NOT use repetitive basic camera moves like simple 'push', 'pan', or 'fade in'.
Choose DISTINCT, dramatic camera motions for each scene from this cinematic list:
{json.dumps(cinematic_camera_motions)}

Return ONLY a valid JSON array of objects with this schema:
[
  {{
    "scene_number": 1,
    "title": "Hook Title",
    "visual_prompt": "Detailed visual description of this shot for image diffusion, lens, lighting, cinematic 8k",
    "camera_motion": "crane_pedestal_reveal",
    "narration": "Engaging voiceover script for this scene (20-30 words)",
    "duration": 4.5
  }}
]
"""
            res = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt_content}],
                response_format={"type": "json_object"} if hasattr(client, "beta") else None,
                temperature=0.7
            )
            text = res.choices[0].message.content.strip()
            match = re.search(r'\[.*\]', text, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            data = json.loads(text)
            if isinstance(data, list):
                return data
            if "scenes" in data:
                return data["scenes"]
        except Exception as e:
            logger.debug("OpenAI storyboard parse/call failed, falling back to algorithmic storyboard: %s", e)
            
    # Intelligent Algorithmic Storyboard Fallback with Distinct Cinematography
    diverse_motions = [
        "crane_pedestal_reveal",
        "low_angle_hero_track",
        "dolly_zoom_vertigo",
        "steadicam_orbit_360",
        "fpv_drone_dive",
        "dutch_angle_tilt",
        "rack_focus_shallow",
        "handheld_cinema_verite"
    ]
    scenes = [
        {
            "scene_number": 1,
            "title": f"Opening: Discovering {topic[:30]}",
            "visual_prompt": f"A sweeping cinematic establishing vista of {topic}, 35mm anamorphic lens, golden hour volumetric lighting, 8k cinematic master",
            "camera_motion": diverse_motions[0],
            "narration": f"In a world shaped by imagination, the journey of {topic} begins here. Every legend starts with a single defining moment.",
            "duration": 5.0
        },
        {
            "scene_number": 2,
            "title": f"The Revelation",
            "visual_prompt": f"An intense dramatic low-angle tracking shot showing the core mystery of {topic}, Rembrandt chiaroscuro lighting, hyper-detailed photorealistic",
            "camera_motion": diverse_motions[1],
            "narration": f"As secrets unravel beneath the surface, hidden truths emerge. The tension rises, shifting the balance of what we thought was possible.",
            "duration": 5.0
        },
        {
            "scene_number": 3,
            "title": f"Resolution & Legacy",
            "visual_prompt": f"A breathtaking majestic finale scene celebrating {topic}, Hitchcock vertigo dolly zoom, sunbeams piercing through clouds, cinematic 8k masterpiece",
            "camera_motion": diverse_motions[2],
            "narration": f"When the dust settles, a new horizon appears. The story continues, leaving an unforgettable mark for generations to come.",
            "duration": 5.0
        },
        {
            "scene_number": 4,
            "title": f"The Ascent",
            "visual_prompt": f"An exhilarating 360-degree Steadicam orbit capturing {topic} reaching full transcendence, neon rim highlights, anamorphic streaks",
            "camera_motion": diverse_motions[3],
            "narration": f"Rising above every obstacle, the vision takes flight, carving an indelible chapter in cinematic history.",
            "duration": 5.0
        }
    ]
    return scenes[:num_scenes]


async def draft_step_prompts(topic: str, style: str = "cinematic") -> dict:
    """
    Generate tailored step-by-step prompts for:
    1. Image diffusion prompt (visual scene, lighting, lens)
    2. Video motion dynamics (camera kinematics, motion speed, direction)
    3. Voiceover narration script (spoken speech text, tone, pacing)
    """
    modifier = CINEMATIC_MODIFIERS.get(style, CINEMATIC_MODIFIERS["cinematic"])
    
    if settings.OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            prompt_content = f"""
Given this concept or story idea: "{topic}" (Style: {style})
Draft 3 specific stage prompts for an automated video pipeline:
1. "image_prompt": Detailed visual description for high-resolution image diffusion (subject, composition, lighting, camera lens, atmospheric mood).
2. "motion_prompt": Camera kinematic directions (e.g., "slow continuous zoom in on subject with subtle horizontal drift and atmospheric dust kinematics").
3. "voice_script": Engaging 1-2 sentence spoken narration script for neural text-to-speech (approx 20-30 words, inspiring cinematic tone).

Return ONLY a valid JSON object:
{{
  "image_prompt": "...",
  "motion_prompt": "...",
  "voice_script": "..."
}}
"""
            res = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt_content}],
                response_format={"type": "json_object"} if hasattr(client, "beta") else None,
                temperature=0.7
            )
            data = json.loads(res.choices[0].message.content.strip())
            if data.get("image_prompt") and data.get("voice_script"):
                return {
                    "image_prompt": data["image_prompt"].strip(),
                    "motion_prompt": data.get("motion_prompt", "slow zoom_in, subtle cinematic parallax").strip(),
                    "voice_script": data["voice_script"].strip()
                }
        except Exception as e:
            logger.debug("OpenAI draft_step_prompts fallback: %s", e)

    # Gemini Flash Fallback
    try:
        from services.gemini_service import get_gemini_key, generate_gemini_text
        if get_gemini_key():
            gemini_prompt = f"""Given idea "{topic}" ({style}), generate JSON with 3 keys:
"image_prompt": detailed visual image diffusion prompt,
"motion_prompt": camera motion kinematics,
"voice_script": spoken narration text (20-30 words).
Output ONLY valid JSON."""
            gemini_res = await generate_gemini_text(gemini_prompt)
            if gemini_res.get("success") and gemini_res.get("text"):
                text = gemini_res["text"].strip()
                match = re.search(r'\{.*\}', text, re.DOTALL)
                if match:
                    data = json.loads(match.group(0))
                    if data.get("image_prompt"):
                        return {
                            "image_prompt": data["image_prompt"].strip(),
                            "motion_prompt": data.get("motion_prompt", "zoom_in").strip(),
                            "voice_script": data.get("voice_script", f"Discovering {topic}.").strip()
                        }
    except Exception as e:
        logger.debug("Gemini draft_step_prompts fallback: %s", e)

    # Algorithmic fallback
    return {
        "image_prompt": f"Cinematic master shot of {topic}, {modifier}",
        "motion_prompt": "smooth cinematic zoom_in towards main subject, shallow depth of field drift",
        "voice_script": f"In a world where boundaries dissolve, {topic} comes alive. Every subtle detail carries the pulse of an extraordinary journey."
    }

