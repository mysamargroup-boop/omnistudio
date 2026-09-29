import logging
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from services.unified_prompt_builder import UnifiedPromptBuilder
from services.skills_service import skill_manager

logger = logging.getLogger("omnistudio.agents.prompt_engineer")


class PromptEngineerAgent(BaseAgent):
    name = "PromptEngineerAgent"
    description = "Converts storyboard frames into optimized prompts tailored for the active diffusion and video models"
    icon = "sparkles"

    async def execute(self, context: PipelineContext) -> AgentResult:
        # ── Load active skill (if selected) ──
        skill = None
        skill_name = "None"
        if context.skill_id:
            skill = skill_manager.get_skill(context.skill_id)
            if skill:
                skill_name = skill.name
                logger.info("Loaded directorial skill: %s (%s)", skill.name, skill.id)

        # ── Load brand kit (if enabled) ──
        brand_kit = context.project_brief.get("brand_kit") if context.project_brief else None

        # ── Initialize Unified Prompt Builder ──
        char_data = None
        if context.character_lock and context.character_name:
            char_data = {
                "name": context.character_name,
                "image": context.character_image or "",
                "prompt": context.character_prompt or ""
            }

        builder = UnifiedPromptBuilder(
            user_prompt=context.user_prompt,
            style=context.style,
            image_model=context.image_model or "gemini_flash_image",
            video_model=context.video_model or "omni_flash",
            skill=skill,
            brand_kit=brand_kit,
            apply_brand_kit=getattr(context, "apply_brand_kit", False),
            character_lock=bool(context.character_lock and context.character_name),
            character_data=char_data
        )

        # ── Generate prompts for each scene ──
        for scene in context.scenes:
            scene.image_prompt = builder.build_image_prompt(
                scene_desc=scene.description or context.user_prompt,
                scene_index=scene.index,
                camera_angle=scene.camera_angle,
                lighting=scene.lighting
            )
            scene.negative_prompt = builder.build_negative_prompt(scene.index)
            scene.video_prompt = builder.build_video_prompt(
                scene_desc=scene.description or context.user_prompt,
                scene_index=scene.index,
                camera_angle=scene.camera_angle,
                lighting=scene.lighting,
                motion_type=scene.motion_type
            )

        # ── Logging ──
        model = context.image_model or "gemini_flash_image"
        skill_msg = f" with Skill '{skill_name}'" if skill else ""
        brand_msg = " + Brand Kit" if brand_kit and getattr(context, "apply_brand_kit", False) else ""
        char_msg = f" + Character Lock '{context.character_name}'" if context.character_lock and context.character_name else ""
        context.add_log(
            self.name,
            f"Engineered unified prompts (image + video) for {len(context.scenes)} scenes "
            f"tailored to '{model}' + '{context.video_model or 'omni_flash'}'{skill_msg}{brand_msg}{char_msg}."
        )

        return AgentResult(success=True)
