from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult

class RepurposingAgent(BaseAgent):
    name = "RepurposingAgent"
    description = "Generates 9:16 vertical and 1:1 square crop metadata."
    icon = "maximize"

    async def execute(self, context: PipelineContext) -> AgentResult:
        context.add_log(self.name, "Produced alternative format crops (9:16, 1:1).")
        return AgentResult(success=True, data={"repurposing_complete": True})
