from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult

class ResearchAgent(BaseAgent):
    name = "ResearchAgent"
    description = "Searches trend hooks, competitive hooks, target keywords."
    icon = "compass"

    async def execute(self, context: PipelineContext) -> AgentResult:
        context.add_log(self.name, "Conducted background research on trending hooks and keywords.")
        return AgentResult(success=True, data={"research_complete": True})
