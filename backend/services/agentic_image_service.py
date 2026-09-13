import json
import re
import uuid
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

from config import settings
from services.gemini_service import (
    get_gemini_key,
    generate_gemini_text,
    generate_gemini_vision_text,
    generate_gemini_image
)
from database import db_save_asset

logger = logging.getLogger("omnistudio.agentic_image")

DEFAULT_POSE_TEMPLATES = [
    {"title": "Frontal Direct Portrait", "framing": "Close-up 85mm", "action": "Direct eye contact with a calm, confident expression", "lighting": "Warm soft key light, shallow depth of field"},
    {"title": "Candid Walking Profile", "framing": "Full-body Medium", "action": "Walking naturally across a sunlit street, turning head towards camera", "lighting": "Golden hour sun rays, natural rim lighting"},
    {"title": "Relaxed Seated Stance", "framing": "Medium Waist-up", "action": "Seated comfortably leaning on an armrest, thoughtful gaze", "lighting": "Moody ambient cafe interior, cinematic bokeh"},
    {"title": "Dynamic Hero Low-Angle", "framing": "Low-angle 35mm", "action": "Standing tall with hands in pockets, heroic perspective", "lighting": "High-contrast dramatic rim light, volumetric atmospheric haze"},
    {"title": "Over-the-Shoulder Glance", "framing": "Close-up 50mm", "action": "Looking back over shoulder towards camera with an enigmatic look", "lighting": "Soft evening twilight backlighting, cinematic flares"},
    {"title": "Side Profile Contemplation", "framing": "Clean Side Profile", "action": "Intense side silhouette admiring a panoramic vista", "lighting": "Dramatic chiaroscuro side lighting, crisp rim contours"},
    {"title": "Laughing / Emotive Moment", "framing": "Medium Close-up", "action": "Mid-laugh with natural eye crinkles and candid joy", "lighting": "Bright daylight diffusion, vibrant color balance"},
    {"title": "Sitting at Work / Creative", "framing": "Wide Medium Shot", "action": "Reviewing a book or notebook on a table, focused expression", "lighting": "Clean window daylight with soft directional shadows"},
    {"title": "Architectural Outdoor Stance", "framing": "Full-body Long Shot", "action": "Poised in front of modern brutalist architecture, poised posture", "lighting": "Mid-afternoon crisp sunlight, sharp graphic shadows"},
    {"title": "Cinematic Night Lights", "framing": "Medium 50mm Prime", "action": "Standing in a city at dusk, gentle smile reflecting city lights", "lighting": "Vibrant neon reflections and warm streetlamp glow"},
    {"title": "Close-up Detail Shot", "framing": "Tight 100mm Macro", "action": "Intimate focus on facial features, eyes sparkling", "lighting": "Soft ring-light reflections, micro-detail skin texture"},
    {"title": "Action Motion Stride", "framing": "Action Wide-Angle", "action": "Dynamic forward movement, jacket/coat flowing with kinetic energy", "lighting": "Dramatic directional floodlight, subtle motion blur"}
]

def parse_pose_count_from_text(text: str, default_count: int = 10) -> int:
    """Extract requested count from Hindi, English, or mixed natural text."""
    lower = text.lower()
    
    # Check explicit numbers
    match = re.search(r'\b([1-9]|1[0-2])\b', lower)
    if match:
        return int(match.group(1))
    
    # Word matches (English & Hindi)
    word_map = {
        "one": 1, "ek": 1,
        "two": 2, "do": 2,
        "three": 3, "teen": 3,
        "four": 4, "chaar": 4, "char": 4,
        "five": 5, "paanch": 5, "panch": 5,
        "six": 6, "chhe": 6, "che": 6,
        "seven": 7, "saat": 7,
        "eight": 8, "aath": 8,
        "nine": 9, "nau": 9,
        "ten": 10, "das": 10,
        "twelve": 12, "barah": 12
    }
    for word, count in word_map.items():
        if re.search(rf'\b{word}\b', lower):
            return count
            
    return default_count

async def analyze_and_decompose_intent(
    prompt: str,
    image_path: Optional[str] = None,
    requested_count: Optional[int] = None
) -> Dict[str, Any]:
    """
    Analyzes natural language prompt + reference image using Gemini Vision / LLM.
    Identifies intent, anchors character likeness, and plans N distinct poses.
    """
    clean_prompt = (prompt or "").strip()
    target_count = requested_count or parse_pose_count_from_text(clean_prompt, default_count=10)
    target_count = max(1, min(12, target_count))
    
    # Detect multi-pose / character consistency intent keywords
    pose_keywords = [
        "pose", "poses", "different", "multiple", "same face", "same character",
        "consistency", "consistent", "alag alag", "isi face", "same sab kuch",
        "isi ka use karke", "character lock", "variations"
    ]
    is_agentic = any(kw in clean_prompt.lower() for kw in pose_keywords) or (image_path is not None and target_count > 1)

    system_instruction = f"""You are the Master Creative Director for OmniStudio AI.
A creator uploaded an image and provided this natural language direction:
"{clean_prompt}"

Your mission is to formulate an Agentic Multi-Pose Execution Plan for exactly {target_count} distinct, cinematic photo poses while keeping the character's facial features, age, ethnicity, and persona 100% consistent across all shots.

Analyze the image (if provided) and generate a JSON response strictly matching this structure:
{{
  "is_agentic_request": true,
  "detected_intent": "multi_pose_character_consistency",
  "target_count": {target_count},
  "character_name": "Descriptive character name (e.g. Modern Urban Protagonist)",
  "persona_anchor": "Precise, immutable visual description of the subject (age, gender, ethnicity, facial geometry, eye shape and color, hair style and color, skin tone, distinctive features, signature clothing aesthetic). This anchor will be prepended to all prompts.",
  "poses": [
    {{
      "pose_id": 1,
      "title": "Short descriptive title (e.g. Frontal Portrait)",
      "framing": "Camera lens & framing (e.g. 85mm Close-Up)",
      "action": "What the subject is doing and facial expression",
      "lighting": "Cinematic lighting setup and background atmosphere",
      "prompt": "Complete, highly detailed 30-50 word diffusion prompt. MUST begin by describing the subject using the persona_anchor, followed by the specific pose, camera angle, lens, and lighting. Do not use generic placeholders."
    }}
  ]
}}

Ensure all {target_count} poses have genuinely distinct body postures, camera angles (close-up, medium, wide, profile, low-angle, over-the-shoulder), and emotional nuances.
Respond ONLY with valid JSON."""

    plan_data = None
    
    # Step 1: Query Gemini (with Vision if image exists)
    try:
        if get_gemini_key():
            if image_path and Path(image_path).exists():
                res = await generate_gemini_vision_text(system_instruction, image_path=image_path)
            else:
                res = await generate_gemini_text(system_instruction)
                
            if res.get("success") and res.get("text"):
                raw_text = res["text"].strip()
                match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                if match:
                    parsed = json.loads(match.group(0))
                    if isinstance(parsed, dict) and "poses" in parsed and len(parsed["poses"]) > 0:
                        plan_data = parsed
    except Exception as e:
        logger.warning("Gemini Agentic Intent parsing failed: %s", e)

    # Step 2: Fallback algorithmic decomposition if LLM is unavailable
    if not plan_data:
        image_stem = Path(image_path).stem if image_path else "subject"
        persona_anchor = f"A photorealistic, highly detailed subject based on {image_stem}, natural skin texture, realistic facial features, cinematic lighting"
        
        poses = []
        for i in range(target_count):
            template = DEFAULT_POSE_TEMPLATES[i % len(DEFAULT_POSE_TEMPLATES)]
            composed_prompt = (
                f"Master 8k photograph of {persona_anchor}, {template['action']}, "
                f"{template['framing']}, {template['lighting']}, ultra-realistic textures, "
                f"Kodak Portra 400 tone, raw detail, 35mm film grain"
            )
            poses.append({
                "pose_id": i + 1,
                "title": template["title"],
                "framing": template["framing"],
                "action": template["action"],
                "lighting": template["lighting"],
                "prompt": composed_prompt
            })
            
        plan_data = {
            "is_agentic_request": is_agentic,
            "detected_intent": "multi_pose_character_consistency",
            "target_count": target_count,
            "character_name": image_stem.replace("_", " ").title(),
            "persona_anchor": persona_anchor,
            "poses": poses
        }

    # Ensure target_count matches actual poses length
    plan_data["target_count"] = len(plan_data.get("poses", []))
    plan_data["reference_image_path"] = image_path
    plan_data["raw_prompt"] = clean_prompt
    
    return plan_data

async def generate_agentic_poses(
    plan: Dict[str, Any],
    reference_image_path: Optional[str] = None,
    model: str = "gemini_flash_image",
    aspect_ratio: str = "16:9",
    progress_callback = None
) -> Dict[str, Any]:
    """
    Executes the batch generation of all poses planned by the Creative Director Agent.
    """
    poses = plan.get("poses", [])
    if not poses:
        return {"success": False, "error": "No poses found in execution plan"}

    total_poses = len(poses)
    results = []
    logger.info("Starting Agentic Multi-Pose batch generation (%d poses) using %s", total_poses, model)

    for idx, pose in enumerate(poses):
        pose_num = idx + 1
        prompt = pose.get("prompt", "")
        
        if progress_callback:
            await progress_callback({
                "current": pose_num,
                "total": total_poses,
                "title": pose.get("title", f"Pose {pose_num}"),
                "status": "rendering"
            })

        # Image generation with reference image support
        img_res = None
        if model in ["gemini_flash_image", "imagen_3", "google_gemini"] or get_gemini_key():
            img_res = await generate_gemini_image(
                prompt=prompt,
                model="gemini-2.5-flash-image",
                filename_hint=f"agentic_pose_{pose_num}_{pose.get('title', 'shot').replace(' ', '_')[:15]}",
                reference_image_path=reference_image_path
            )
        elif settings.OPENAI_API_KEY:
            from services.openai_service import generate_openai_image
            img_res = await generate_openai_image(
                prompt=prompt,
                model="dall-e-3",
                size="1792x1024" if aspect_ratio == "16:9" else "1024x1024"
            )
        else:
            return {
                "success": False,
                "error": "No AI Image generation key configured. Please add GEMINI_API_KEY in Settings."
            }

        if img_res and img_res.get("success"):
            results.append({
                "pose_id": pose.get("pose_id", pose_num),
                "title": pose.get("title", f"Shot {pose_num}"),
                "framing": pose.get("framing", "Standard"),
                "action": pose.get("action", ""),
                "prompt": prompt,
                "url": img_res.get("url"),
                "local_path": img_res.get("local_path"),
                "filename": img_res.get("filename")
            })
            # Save asset to DB
            try:
                db_save_asset(
                    asset_type="image",
                    filename=img_res.get("filename"),
                    prompt=prompt,
                    model=model,
                    local_path=img_res.get("local_path")
                )
            except Exception as dbe:
                logger.warning("Failed to save pose asset to DB: %s", dbe)
        else:
            err = img_res.get("error", "Generation failed") if img_res else "Unknown error"
            logger.warning("Pose %d generation failed: %s", pose_num, err)

    if not results:
        return {
            "success": False,
            "error": "Failed to render poses. Please check provider API keys and balance."
        }

    return {
        "success": True,
        "character_name": plan.get("character_name", "Character"),
        "persona_anchor": plan.get("persona_anchor", ""),
        "total_requested": total_poses,
        "total_generated": len(results),
        "results": results
    }
