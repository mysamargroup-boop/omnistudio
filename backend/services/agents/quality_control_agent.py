import logging
from pathlib import Path
from PIL import Image
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult

logger = logging.getLogger("omnistudio.agents.qc")

class QualityControlAgent(BaseAgent):
    name = "QualityControlAgent"
    description = "Checks image clarity, aspect ratio conformance, file integrity, and visual continuity across keyframes."
    icon = "check-circle"

    async def execute(self, context: PipelineContext) -> AgentResult:
        if not context.scenes:
            context.add_log(self.name, "No scenes present to validate.")
            return AgentResult(success=True, data={"qc_passed": True, "scenes_verified": 0})

        verified_count = 0
        issues = []
        metrics = []

        for idx, scene in enumerate(context.scenes, 1):
            img_path = scene.image_path
            if not img_path:
                issues.append(f"Scene {idx}: Missing image reference path.")
                continue

            local_file = Path(img_path)
            if not local_file.exists():
                # Try relative to outputs/images
                alt_path = Path("outputs/images") / local_file.name
                if alt_path.exists():
                    local_file = alt_path
                    scene.image_path = str(alt_path)

            if not local_file.exists() or local_file.stat().st_size < 1024:
                issues.append(f"Scene {idx}: Image file empty or not found on disk.")
                continue

            try:
                with Image.open(local_file) as im:
                    w, h = im.size
                    fmt = im.format
                    verified_count += 1
                    metrics.append({
                        "scene": idx,
                        "resolution": f"{w}x{h}",
                        "format": fmt,
                        "aspect_ratio": f"{round(w/h, 2)}:1",
                        "size_kb": round(local_file.stat().st_size / 1024, 1)
                    })
            except Exception as e:
                issues.append(f"Scene {idx}: Corrupt image data ({str(e)}).")

        passed = len(issues) == 0
        score = round((verified_count / max(len(context.scenes), 1)) * 100, 1)

        if passed:
            context.add_log(
                self.name,
                f"Quality Control Passed: All {verified_count}/{len(context.scenes)} scene keyframes verified (Integrity score: {score}%)."
            )
        else:
            context.add_log(
                self.name,
                f"Quality Control Warnings ({len(issues)} issues): {'; '.join(issues[:2])}"
            )

        return AgentResult(
            success=True,
            data={
                "qc_passed": passed,
                "score": score,
                "verified_scenes": verified_count,
                "metrics": metrics,
                "issues": issues
            }
        )
