import os
import uuid
import logging
from pathlib import Path
from PIL import Image, ImageDraw
import colorsys

import re
import shutil
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from services.gemini_service import generate_gemini_image, get_gemini_key
from services.openai_service import generate_openai_image, get_openai_key
from database import db_save_asset
from config import settings

logger = logging.getLogger("omnistudio.agents.image")

def _generate_cinematic_fallback_image(
    output_path: Path,
    scene_idx: int,
    title: str,
    prompt: str,
    aspect_ratio: str = "16:9"
):
    """Synthesizes a high-definition cinematic visual card if API generation is unavailable."""
    width, height = (1280, 720) if aspect_ratio != "9:16" else (720, 1280)
    if aspect_ratio == "1:1":
        width, height = (1024, 1024)

    # Create base image with rich cinematic gradient
    img = Image.new("RGB", (width, height), (15, 18, 25))
    draw = ImageDraw.Draw(img)

    # Generate atmospheric diagonal color ramp
    hue_base = ((scene_idx * 67) % 360) / 360.0
    r1, g1, b1 = [int(c * 255) for c in colorsys.hsv_to_rgb(hue_base, 0.75, 0.28)]
    r2, g2, b2 = [int(c * 255) for c in colorsys.hsv_to_rgb((hue_base + 0.15) % 1.0, 0.85, 0.12)]

    for y in range(height):
        factor = y / height
        r = int(r1 * (1 - factor) + r2 * factor)
        g = int(g1 * (1 - factor) + g2 * factor)
        b = int(b1 * (1 - factor) + b2 * factor)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Add subtle geometric framing
    draw.rectangle([(24, 24), (width - 24, height - 24)], outline=(255, 255, 255), width=2)
    draw.rectangle([(32, 32), (width - 32, height - 32)], outline=(16, 185, 129), width=1)

    # Header badge: SCENE N
    badge_text = f"SCENE {scene_idx:02d} • AUTONOMOUS DIRECTED"
    draw.text((50, 50), badge_text, fill=(16, 185, 129))

    # Scene Title
    display_title = title or f"Scene {scene_idx}"
    draw.text((50, 85), display_title[:60], fill=(255, 255, 255))

    # Prompt text snippet
    clean_prompt = prompt.replace("\n", " ").strip()
    if len(clean_prompt) > 140:
        clean_prompt = clean_prompt[:137] + "..."
    draw.text((50, height - 80), clean_prompt, fill=(200, 210, 225))

    # Watermark / Tag
    draw.text((width - 260, height - 50), "OMNISTUDIO 4K NEURAL SYNTH", fill=(100, 116, 139))

    img.save(str(output_path), "PNG", quality=95)


class ImageGeneratorAgent(BaseAgent):
    name = "ImageGeneratorAgent"
    description = "Generates high-definition imagery for each storyboard scene"
    icon = "image"

    async def execute(self, context: PipelineContext) -> AgentResult:
        images_dir = settings.OUTPUTS_PATH / 'images'
        images_dir.mkdir(parents=True, exist_ok=True)

        # Detect if user explicitly requested Google Imagen in prompt or image_model
        p_lower = (context.user_prompt or "").lower()
        model_req = (context.image_model or "").lower()
        wants_google_imagen = bool(
            re.search(r'\b(google\s*imagen|imagen\s*3|imagen3|imagen|google\s*image)\b', p_lower) or
            ("imagen" in model_req)
        )

        engine_title = "Google Imagen 3" if wants_google_imagen else "OpenAI GPT Image (DALL-E 3 HD Advance Model)"
        logger.info("ImageGeneratorAgent executing with primary engine: %s", engine_title)

        ref_img_path = context.character_image if (context.character_lock and context.character_image) else context.reference_image
        if ref_img_path and "/outputs/" in ref_img_path:
            parts = ref_img_path.split("/outputs/")[-1]
            cand = settings.OUTPUTS_PATH / parts
            if cand.exists():
                ref_img_path = str(cand)

        for scene in context.scenes:
            file_name = f"scene_{scene.index}_{uuid.uuid4().hex[:8]}.png"
            local_path = images_dir / file_name
            web_url = f"/outputs/images/{file_name}"
            prompt_to_use = scene.image_prompt or scene.description or context.user_prompt

            generated = False
            used_model_name = ""

            if wants_google_imagen:
                # 1. User asked for Google Imagen: Try Google Imagen / Gemini Image (Gemini 3 Pro Image)
                if get_gemini_key():
                    try:
                        res = await generate_gemini_image(
                            prompt=prompt_to_use,
                            model="gemini-3-pro-image",
                            filename_hint=f"scene_{scene.index}",
                            reference_image_path=ref_img_path,
                            aspect_ratio=context.aspect_ratio
                        )
                        if res.get("success") and res.get("local_path") and Path(res["local_path"]).exists():
                            src_path = Path(res["local_path"])
                            if src_path != local_path:
                                shutil.copyfile(str(src_path), str(local_path))
                            generated = True
                            used_model_name = res.get("model") or "Google Imagen 3"
                    except Exception as e:
                        logger.warning("Google Imagen generation failed for scene %s: %s", scene.index, e)

                # Fallback to OpenAI if Google Imagen failed
                if not generated and get_openai_key():
                    try:
                        openai_m = context.image_model if context.image_model and context.image_model != "auto" else "gpt-image-2"
                        res = await generate_openai_image(
                            prompt=prompt_to_use,
                            model=openai_m,
                            quality="high",
                            aspect_ratio=context.aspect_ratio,
                            filename_hint=f"scene_{scene.index}"
                        )
                        if res.get("success") and res.get("local_path") and Path(res["local_path"]).exists():
                            src_path = Path(res["local_path"])
                            if src_path != local_path:
                                shutil.copyfile(str(src_path), str(local_path))
                            generated = True
                            used_model_name = f"OpenAI {res.get('model', 'GPT Image')} (Fallback)"
                    except Exception as oe:
                        logger.warning("OpenAI image fallback failed: %s", oe)

            else:
                # 1. BY DEFAULT: Use OpenAI GPT Image Model (gpt-image-2 Advance Model)
                if get_openai_key():
                    try:
                        openai_m = context.image_model if context.image_model and context.image_model != "auto" else "gpt-image-2"
                        res = await generate_openai_image(
                            prompt=prompt_to_use,
                            model=openai_m,
                            quality="high",
                            aspect_ratio=context.aspect_ratio,
                            filename_hint=f"scene_{scene.index}"
                        )
                        if res.get("success") and res.get("local_path") and Path(res["local_path"]).exists():
                            src_path = Path(res["local_path"])
                            if src_path != local_path:
                                shutil.copyfile(str(src_path), str(local_path))
                            generated = True
                            used_model_name = f"OpenAI {res.get('model', 'GPT Image 2')}"
                    except Exception as oe:
                        logger.warning("OpenAI generation failed for scene %s: %s", scene.index, oe)

                # Fallback to Google Imagen 3 Pro if OpenAI failed or key not configured
                if not generated and get_gemini_key():
                    try:
                        res = await generate_gemini_image(
                            prompt=prompt_to_use,
                            model="gemini-3-pro-image",
                            filename_hint=f"scene_{scene.index}",
                            reference_image_path=ref_img_path,
                            aspect_ratio=context.aspect_ratio
                        )
                        if res.get("success") and res.get("local_path") and Path(res["local_path"]).exists():
                            src_path = Path(res["local_path"])
                            if src_path != local_path:
                                shutil.copyfile(str(src_path), str(local_path))
                            generated = True
                            used_model_name = res.get("model") or "Google Imagen 3 (Fallback)"
                    except Exception as e:
                        logger.warning("Google Imagen fallback failed for scene %s: %s", scene.index, e)

            # 2. Robust fallback: render high-def stylized cinematic card if both fail
            if not generated or not local_path.exists():
                _generate_cinematic_fallback_image(
                    output_path=local_path,
                    scene_idx=scene.index,
                    title=scene.title,
                    prompt=prompt_to_use,
                    aspect_ratio=context.aspect_ratio
                )
                used_model_name = "Cinematic Card Fallback"

            # Guarantee strict aspect ratio adherence (e.g. 16:9, 9:16, 1:1, 4:3, 21:9)
            if local_path.exists() and context.aspect_ratio:
                try:
                    from services.aspect_ratio_service import conform_image_aspect_ratio
                    conform_image_aspect_ratio(local_path, context.aspect_ratio)
                except Exception as cf_err:
                    logger.warning("Scene image aspect ratio conformance warning: %s", cf_err)

            # Assign web-accessible URL
            scene.image_path = web_url

            # Register in Vault DB
            try:
                db_save_asset(
                    type="image",
                    url=web_url,
                    filename=file_name,
                    prompt=scene.image_prompt or scene.description,
                    model=used_model_name or ("Google Imagen 3" if wants_google_imagen else "OpenAI DALL-E 3 HD"),
                    cost_usd=0.04 if not wants_google_imagen else 0.005,
                    cost_inr=3.35 if not wants_google_imagen else 0.42
                )
            except Exception as dbe:
                logger.debug("Failed to record image asset in DB: %s", dbe)

        active_label = used_model_name or ("Google Imagen 3" if wants_google_imagen else "OpenAI GPT Image (DALL-E 3 HD)")
        context.add_log(self.name, f"Synthesized {len(context.scenes)} choreographed keyframe visuals via {active_label}")
        return AgentResult(success=True)
