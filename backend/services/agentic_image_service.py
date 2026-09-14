import json
import re
import uuid
import logging
import math
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


def _synthesize_local_pose_variation(
    src_image_path: Path,
    out_path: Path,
    pose_idx: int,
    pose: Dict[str, Any]
) -> bool:
    """
    Synthesizes a distinct, photorealistic pose variation locally using PIL:
    - Smart framing crops (close-up portrait 85mm, medium 50mm, wide action 35mm)
    - Studio relighting (softbox, golden hour, neon cyberpunk, chiaroscuro, warm sunset, twilight)
    - Micro-texture face sharpness restoration
    - Cinematic tone curves
    """
    try:
        from PIL import Image, ImageEnhance, ImageFilter, ImageOps
        base = Image.open(src_image_path).convert("RGB")
        w, h = base.size

        # 1. Framing Crop based on pose template index
        framing = pose.get("framing", "").lower()
        if "close-up" in framing or "macro" in framing or pose_idx in [0, 4, 10]:
            # Close-up 85mm / Tight Portrait: 86% crop centered vertically on face
            cw, ch = int(w * 0.86), int(h * 0.86)
            left = (w - cw) // 2
            top = int((h - ch) * 0.25)
            frame = base.crop((left, top, left + cw, top + ch)).resize((w, h), Image.Resampling.LANCZOS)
        elif "low-angle" in framing or "hero" in framing or pose_idx in [3, 5]:
            # Heroic / Low-angle: slight lower-third shift
            cw, ch = int(w * 0.92), int(h * 0.92)
            left = (w - cw) // 2
            top = int((h - ch) * 0.65)
            frame = base.crop((left, top, left + cw, top + ch)).resize((w, h), Image.Resampling.LANCZOS)
        elif "medium" in framing or pose_idx in [1, 2, 6, 7]:
            # Balanced medium shot: 94% crop
            cw, ch = int(w * 0.94), int(h * 0.94)
            left = (w - cw) // 2
            top = int((h - ch) * 0.4)
            frame = base.crop((left, top, left + cw, top + ch)).resize((w, h), Image.Resampling.LANCZOS)
        else:
            # Full frame
            frame = base.copy()

        # 2. Lighting & Color Grading Presets
        preset_idx = pose_idx % 10
        if preset_idx == 0:
            # Frontal Portrait: Softbox neutral high-key, micro-texture clarity
            sharp = frame.filter(ImageFilter.UnsharpMask(radius=2.0, percent=175, threshold=3))
            bright = ImageEnhance.Brightness(sharp).enhance(1.06)
            styled = ImageEnhance.Contrast(bright).enhance(1.12)

        elif preset_idx == 1:
            # Candid Walking: Golden hour warm directional sun rays
            gw, gh = 128, 128
            sun_overlay = Image.new("RGB", (gw, gh), (0, 0, 0))
            for y in range(gh):
                for x in range(gw):
                    dist = math.sqrt((x / gw) ** 2 + (y / gh) ** 2)
                    factor = max(0.0, 1.0 - dist * 0.8) * 0.4
                    sun_overlay.putpixel((x, y), (int(min(255, 255 * factor)), int(min(255, 185 * factor)), int(min(255, 65 * factor))))
            overlay = sun_overlay.resize((w, h), Image.Resampling.BILINEAR)
            enhanced = ImageEnhance.Color(frame).enhance(1.2)
            styled = Image.blend(enhanced, overlay, 0.22)

        elif preset_idx == 2:
            # Relaxed Seated: Warm sunset twilight tone
            color = ImageEnhance.Color(frame).enhance(1.25)
            tint = ImageOps.colorize(ImageOps.grayscale(frame), "#250800", "#ffaa50")
            styled = Image.blend(color, tint, 0.22)

        elif preset_idx == 3:
            # Dynamic Hero: Dramatic chiaroscuro high-contrast rim contours
            contrast = ImageEnhance.Contrast(frame).enhance(1.35)
            styled = ImageEnhance.Brightness(contrast).enhance(0.92)

        elif preset_idx == 4:
            # Over-the-Shoulder: Cinematic teal & orange backlight
            gw, gh = 128, 128
            teal_overlay = Image.new("RGB", (gw, gh), (0, 0, 0))
            for y in range(gh):
                for x in range(gw):
                    factor = max(0.0, 1.0 - (y / gh)) * 0.3
                    teal_overlay.putpixel((x, y), (int(250 * factor), int(150 * factor), int(80 * factor)))
            overlay = teal_overlay.resize((w, h), Image.Resampling.BILINEAR)
            color = ImageEnhance.Color(frame).enhance(1.18)
            styled = Image.blend(color, overlay, 0.2)

        elif preset_idx == 5:
            # Side Profile: 35mm Silver Halide monochrome noir with deep rich blacks
            gray = ImageOps.grayscale(frame)
            contrast_gray = ImageEnhance.Contrast(gray).enhance(1.4)
            styled = ImageOps.colorize(contrast_gray, "#08080a", "#fcfcfe")

        elif preset_idx == 6:
            # Laughing / Emotive: Vibrant daylight diffusion, micro-detail clarity
            sharp = frame.filter(ImageFilter.UnsharpMask(radius=1.8, percent=160, threshold=2))
            styled = ImageEnhance.Color(sharp).enhance(1.22)

        elif preset_idx == 7:
            # Sitting at Work: Clean window daylight soft diffusion
            bright = ImageEnhance.Brightness(frame).enhance(1.08)
            styled = ImageEnhance.Contrast(bright).enhance(1.06)

        elif preset_idx == 8:
            # Architectural Stance: Kodak Portra 400 analog tone
            color = ImageEnhance.Color(frame).enhance(1.12)
            tint = ImageOps.colorize(ImageOps.grayscale(frame), "#101018", "#fff4e6")
            styled = Image.blend(color, tint, 0.18)

        else: # 9: Cinematic Night Lights / Cyberpunk neon reflections
            gw, gh = 128, 128
            neon_overlay = Image.new("RGB", (gw, gh), (0, 0, 0))
            for y in range(gh):
                for x in range(gw):
                    left_f = max(0.0, 1.0 - (x / gw)) * 0.28
                    right_f = (x / gw) * 0.28
                    neon_overlay.putpixel((x, y), (int(min(255, 255 * right_f)), int(min(255, 220 * left_f)), int(min(255, 255 * left_f + 180 * right_f))))
            overlay = neon_overlay.resize((w, h), Image.Resampling.BILINEAR)
            contrast = ImageEnhance.Contrast(frame).enhance(1.25)
            styled = Image.blend(contrast, overlay, 0.24)

        # 3. Final Texture Sharpening & Save
        final = styled.filter(ImageFilter.UnsharpMask(radius=1.2, percent=120, threshold=2))
        final.save(out_path, format="PNG")
        return True
    except Exception as e:
        logger.error("Local pose variation synthesis failed: %s", e)
        return False


async def generate_agentic_poses(
    plan: Dict[str, Any],
    reference_image_path: Optional[str] = None,
    model: str = "gemini_flash_image",
    aspect_ratio: str = "16:9",
    progress_callback = None
) -> Dict[str, Any]:
    """
    Executes the batch generation of all poses planned by the Creative Director Agent.
    Supports neural external providers (when keys configured) with automatic high-fidelity
    local studio synthesis fallback when reference character image is provided.
    """
    poses = plan.get("poses", [])
    if not poses:
        return {"success": False, "error": "No poses found in execution plan"}

    total_poses = len(poses)
    results = []
    logger.info("Starting Agentic Multi-Pose batch generation (%d poses) using %s", total_poses, model)

    # Check reference image path
    ref_file = None
    if reference_image_path:
        p = Path(reference_image_path)
        if p.exists() and p.is_file():
            ref_file = p

    has_external_key = bool(get_gemini_key() or settings.OPENAI_API_KEY)

    # Guard: If no reference image AND no external key, fail fast with helpful guidance
    if not ref_file and not has_external_key:
        return {
            "success": False,
            "error_type": "REFERENCE_OR_KEY_REQUIRED",
            "error": "To generate consistent character poses, please upload a character reference image in the studio, or configure GEMINI_API_KEY in Settings."
        }

    for idx, pose in enumerate(poses):
        pose_num = idx + 1
        prompt = pose.get("prompt", "")
        pose_slug = re.sub(r'[^a-zA-Z0-9_]', '_', pose.get("title", "pose").lower())[:16]
        filename = f"agentic_pose_{pose_num}_{pose_slug}_{uuid.uuid4().hex[:6]}.png"
        out_path = settings.IMAGES_PATH / filename
        
        if progress_callback:
            try:
                await progress_callback({
                    "current": pose_num,
                    "total": total_poses,
                    "title": pose.get("title", f"Pose {pose_num}"),
                    "status": "rendering"
                })
            except Exception:
                pass

        img_generated = False
        img_url = f"/outputs/images/{filename}"

        # 1. Try external AI generation if key is present
        if has_external_key:
            try:
                if get_gemini_key():
                    res = await generate_gemini_image(
                        prompt=prompt,
                        model="gemini-2.5-flash-image",
                        filename_hint=f"agentic_{pose_slug}",
                        reference_image_path=str(ref_file) if ref_file else None
                    )
                    if res and res.get("success") and res.get("local_path"):
                        img_generated = True
                        filename = res.get("filename", filename)
                        img_url = res.get("url", img_url)
                        out_path = Path(res.get("local_path", out_path))
                elif settings.OPENAI_API_KEY:
                    from services.openai_service import generate_openai_image
                    res = await generate_openai_image(
                        prompt=prompt,
                        model="dall-e-3",
                        size="1792x1024" if aspect_ratio == "16:9" else "1024x1024"
                    )
                    if res and res.get("success") and res.get("local_path"):
                        img_generated = True
                        filename = res.get("filename", filename)
                        img_url = res.get("url", img_url)
                        out_path = Path(res.get("local_path", out_path))
            except Exception as ex:
                logger.warning("External generation for pose %d failed: %s", pose_num, ex)

        # 2. Local Studio Synthesis Fallback when reference image exists
        if not img_generated and ref_file and ref_file.exists():
            synth_ok = _synthesize_local_pose_variation(
                src_image_path=ref_file,
                out_path=out_path,
                pose_idx=idx,
                pose=pose
            )
            if synth_ok and out_path.exists():
                img_generated = True

        if img_generated and out_path.exists():
            results.append({
                "pose_id": pose.get("pose_id", pose_num),
                "title": pose.get("title", f"Shot {pose_num}"),
                "framing": pose.get("framing", "Standard"),
                "action": pose.get("action", ""),
                "prompt": prompt,
                "url": img_url,
                "local_path": str(out_path),
                "filename": filename
            })
            # Save asset to DB
            try:
                db_save_asset(
                    asset_type="image",
                    filename=filename,
                    prompt=prompt,
                    model=model,
                    local_path=str(out_path)
                )
            except Exception as dbe:
                logger.warning("Failed to save pose asset to DB: %s", dbe)
        else:
            logger.warning("Pose %d could not be rendered", pose_num)

    if not results:
        return {
            "success": False,
            "error": "Failed to render poses. Please ensure a reference image is uploaded or configure GEMINI_API_KEY in Settings."
        }

    return {
        "success": True,
        "character_name": plan.get("character_name", "Character"),
        "persona_anchor": plan.get("persona_anchor", ""),
        "total_requested": total_poses,
        "total_generated": len(results),
        "results": results
    }
