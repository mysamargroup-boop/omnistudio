import logging
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from services.brand_kit_service import load_brand_kit as get_active_brand_profile

logger = logging.getLogger("omnistudio.agents.brand")

class BrandIntelligenceAgent(BaseAgent):
    name = "BrandIntelligenceAgent"
    description = "Reads active brand guidelines, colors, typography, and visual rules to enforce corporate consistency"
    icon = "shield"

    async def execute(self, context: PipelineContext) -> AgentResult:
        try:
            if not getattr(context, "apply_brand_kit", True):
                if not context.project_brief:
                    context.project_brief = {}
                context.project_brief["brand_kit"] = None
                context.add_log(
                    self.name,
                    "Brand Kit Intelligence bypassed (Toggle OFF). Applying pure raw prompt aesthetic."
                )
                return AgentResult(success=True, data={"brand_applied": False})

            brand = get_active_brand_profile()
            brand_name = brand.get("name") or brand.get("brand_name") or "Studio Master"
            colors = brand.get("colors", {})
            style_guide = brand.get("style_guidelines", "")
            negative_guide = brand.get("negative_guidelines", "")

            if not context.project_brief:
                context.project_brief = {}

            context.project_brief["brand_kit"] = {
                "id": brand.get("id"),
                "name": brand_name,
                "primary_color": colors.get("primary", "#10b981"),
                "accent_color": colors.get("accent", "#06b6d4"),
                "typography": brand.get("typography", {}).get("primary_font", "Inter"),
                "brand_voice": brand.get("brand_voice", "Cinematic & Sophisticated"),
                "style_guidelines": style_guide,
                "negative_guidelines": negative_guide,
                "logo_url": brand.get("logo_url") or brand.get("logos", {}).get("primary")
            }

            context.add_log(
                self.name,
                f"Applied brand identity for '{brand_name}' (Primary: {colors.get('primary', '#10b981')}, Voice: {brand.get('brand_voice', 'Cinematic')})."
            )
            return AgentResult(success=True, data={"brand_name": brand_name, "brand_kit": context.project_brief["brand_kit"]})
        except Exception as e:
            logger.warning("BrandIntelligenceAgent error: %s", e)
            context.add_log(self.name, "Standard studio aesthetic guidelines applied.")
            return AgentResult(success=True)
