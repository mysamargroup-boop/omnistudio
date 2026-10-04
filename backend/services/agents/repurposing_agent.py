import logging
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult

logger = logging.getLogger("omnistudio.agents.repurposing")

class RepurposingAgent(BaseAgent):
    name = "RepurposingAgent"
    description = "Prepares automated multi-platform crop specs (9:16 Shorts, 1:1 Feed, 16:9 Landscape) with FFmpeg directives."
    icon = "maximize"

    async def execute(self, context: PipelineContext) -> AgentResult:
        primary_aspect = context.aspect_ratio or "16:9"

        # Multi-format transformation targets
        targets = [
            {
                "platform": "Instagram Reels / TikTok / YouTube Shorts",
                "aspect_ratio": "9:16",
                "resolution": "1080x1920",
                "crop_filter": "crop=ih*(9/16):ih:(iw-ow)/2:0",
                "primary": primary_aspect == "9:16"
            },
            {
                "platform": "Instagram Feed / LinkedIn Square",
                "aspect_ratio": "1:1",
                "resolution": "1080x1080",
                "crop_filter": "crop=min(iw,ih):min(iw,ih):(iw-ow)/2:(ih-oh)/2",
                "primary": primary_aspect == "1:1"
            },
            {
                "platform": "YouTube Cinema / Desktop Web",
                "aspect_ratio": "16:9",
                "resolution": "1920x1080",
                "crop_filter": "crop=iw:iw*(9/16):0:(ih-oh)/2",
                "primary": primary_aspect == "16:9"
            }
        ]

        if not context.project_brief:
            context.project_brief = {}
        context.project_brief["repurposing_targets"] = targets
        context.add_log(self.name, f"Synthesized multi-platform repurposing matrix: 9:16 Shorts, 1:1 Feed, 16:9 Master.")

        return AgentResult(success=True, data={"targets": targets, "source_aspect": primary_aspect})
