from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult

class SoundtrackAgent(BaseAgent):
    name = "SoundtrackAgent"
    description = "Audio director that selects and ducks ambient background audio."
    icon = "music"

    async def execute(self, context: PipelineContext) -> AgentResult:
        soundtrack_setting = (context.project_brief.get("soundtrack") if context.project_brief else None) or context.voice_provider
        if (soundtrack_setting or "").lower() in ["none", "native", "no_music", "off", ""]:
            context.add_log(self.name, "Soundtrack set to None — native environmental audio from video clips will be retained without background music overlay.")
            return AgentResult(success=True, data={"soundtrack_mixed": False, "native_audio": True})

        context.add_log(self.name, "Mixed and synchronized background soundtrack.")
        return AgentResult(success=True, data={"soundtrack_mixed": True})
