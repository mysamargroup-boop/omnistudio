import logging
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult

logger = logging.getLogger("omnistudio.agents.analytics")

class AnalyticsAgent(BaseAgent):
    name = "AnalyticsAgent"
    description = "Predicts audience retention score, estimated impressions, engagement metrics."
    icon = "bar-chart"

    async def execute(self, context: PipelineContext) -> AgentResult:
        total_duration = 0.0
        total_words = 0
        scene_count = len(context.scenes)

        for s in context.scenes:
            total_duration += float(getattr(s, "duration", 4.0) or 4.0)
            if s.script:
                total_words += len(s.script.split())

        # Pacing analysis: words per second (1.5 - 2.5 is ideal for engagement)
        wps = total_words / max(total_duration, 1.0)
        pacing_quality = 1.0
        if 1.2 <= wps <= 2.6:
            pacing_quality = 1.05
        elif wps > 3.0:
            pacing_quality = 0.92  # too rushed
        elif wps < 0.8:
            pacing_quality = 0.95  # too slow

        # Dynamic retention calculation
        base_retention = 88.0
        # Shorter videos hold higher retention
        duration_penalty = min(total_duration * 0.15, 8.0)
        scene_bonus = min(scene_count * 1.2, 6.0)
        retention_score = round(min(max((base_retention - duration_penalty + scene_bonus) * pacing_quality, 75.0), 96.5), 1)

        metrics = {
            "retention_score": retention_score,
            "estimated_duration_sec": round(total_duration, 1),
            "total_words": total_words,
            "speech_pace_wps": round(wps, 2),
            "estimated_virality_score": round(min(retention_score * 1.03, 98.0), 1),
            "completion_rate_prediction": f"{round(retention_score * 0.78, 1)}%"
        }

        if not context.project_brief:
            context.project_brief = {}
        context.project_brief["analytics"] = metrics
        context.add_log(self.name, f"Audience retention score predicted: {retention_score}% (Pacing: {round(wps, 1)} words/sec).")

        return AgentResult(success=True, data=metrics)
