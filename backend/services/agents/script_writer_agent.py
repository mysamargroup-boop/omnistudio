from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult, SceneData

class ScriptWriterAgent(BaseAgent):
    name = "ScriptWriterAgent"
    description = "Writes per-scene scripts from the ProjectBrief"
    icon = "file-text"

    async def execute(self, context: PipelineContext) -> AgentResult:
        if not context.scenes:
            context.scenes = []
            for i in range(context.num_scenes):
                context.scenes.append(SceneData(
                    index=i+1,
                    title=f"Scene {i+1}",
                    script=f"This is the voiceover for scene {i+1} about {context.user_prompt}.",
                    duration_seconds=5.0
                ))
        return AgentResult(success=True)
