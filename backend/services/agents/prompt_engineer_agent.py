from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult

class PromptEngineerAgent(BaseAgent):
    name = "PromptEngineerAgent"
    description = "Converts storyboard frames into optimized prompts tailored for the active diffusion model"
    icon = "sparkles"

    async def execute(self, context: PipelineContext) -> AgentResult:
        model = context.image_model or "gemini_flash_image"

        for scene in context.scenes:
            desc = scene.description or context.user_prompt
            angle = scene.camera_angle or "Cinematic wide angle"
            light = scene.lighting or "Dramatic volumetric lighting"

            if "flux" in model.lower():
                scene.image_prompt = (
                    f"A master cinematic photograph depicting {desc}. {angle}, {light}. "
                    f"Authentic {context.style} aesthetic, natural film grain, rich subsurface scattering, 8k raw detail."
                )
                scene.negative_prompt = "lowres, plastic skin, distorted hands, oversaturated, watermark"
            elif "imagen" in model.lower():
                scene.image_prompt = (
                    f"Photorealistic 8K photograph of {desc}, {angle}, {light}. "
                    f"Captured on 35mm Prime lens f/1.4, cinematic depth of field, {context.style} color grading."
                )
                scene.negative_prompt = "cartoon, blurry, low resolution, extra limbs, bad anatomy"
            elif "gpt" in model.lower() or "dall" in model.lower():
                scene.image_prompt = (
                    f"High-fidelity cinema frame of {desc}, {angle}, {light}, "
                    f"award-winning {context.style} cinematography, razor-sharp details, volumetric atmospheric haze."
                )
                scene.negative_prompt = "blurry, low quality, artifacts, watermark"
            else:
                scene.image_prompt = (
                    f"Cinematic shot, {desc}, {angle}, {light}, "
                    f"{context.style} style, 8k, highly detailed, photorealistic."
                )
                scene.negative_prompt = "low quality, blurry, distorted, watermark"

        # Inject Brand Kit guidelines if enabled and active
        brand_kit = context.project_brief.get("brand_kit") if context.project_brief else None
        if getattr(context, "apply_brand_kit", True) and brand_kit:
            brand_style = brand_kit.get("style_guidelines", "")
            brand_neg = brand_kit.get("negative_guidelines", "")
            primary_c = brand_kit.get("primary_color", "")
            accent_c = brand_kit.get("accent_color", "")
            brand_addons = []
            if brand_style:
                brand_addons.append(brand_style)
            if primary_c or accent_c:
                brand_addons.append(f"color harmony in {primary_c} and {accent_c}")
            addon_str = ", ".join(brand_addons)
            if addon_str:
                for scene in context.scenes:
                    scene.image_prompt = f"{scene.image_prompt.rstrip('.')}, {addon_str}."
                    if brand_neg:
                        scene.negative_prompt = f"{scene.negative_prompt}, {brand_neg}"
            context.add_log(self.name, f"Engineered optimized prompts tailored to '{model}' with active Brand Kit identity injected.")
        else:
            context.add_log(self.name, f"Engineered optimized prompts for all scenes tailored to '{model}' diffusion engine.")

        return AgentResult(success=True)
