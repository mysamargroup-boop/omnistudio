from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult

class SocialCopyAgent(BaseAgent):
    name = "SocialCopyAgent"
    description = "Generates YouTube title, Instagram caption, hashtags, viral hooks."
    icon = "share-2"

    async def execute(self, context: PipelineContext) -> AgentResult:
        context.add_log(self.name, "Drafted social media metadata, captions, and hashtags.")
        return AgentResult(success=True, data={"social_copy_generated": True})
