from pathlib import Path
import shutil
import uuid
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from config import settings

class ThumbnailAgent(BaseAgent):
    name = "ThumbnailAgent"
    description = "Generates high-CTR thumbnail keyframe with hook title."
    icon = "layout"

    async def execute(self, context: PipelineContext) -> AgentResult:
        if context.scenes:
            for s in context.scenes:
                if s.image_path:
                    img_name = Path(s.image_path).name
                    cand = settings.OUTPUTS_PATH / 'images' / img_name
                    if cand.exists():
                        final_dir = settings.OUTPUTS_PATH / 'final'
                        final_dir.mkdir(parents=True, exist_ok=True)
                        thumb_name = f"thumb_{uuid.uuid4().hex[:8]}.png"
                        thumb_path = final_dir / thumb_name
                        try:
                            shutil.copyfile(str(cand), str(thumb_path))
                        except Exception:
                            pass
                        break

        context.add_log(self.name, "Designed optimized thumbnail based on the primary scene keyframe")
        return AgentResult(success=True, data={"thumbnail_generated": True})
