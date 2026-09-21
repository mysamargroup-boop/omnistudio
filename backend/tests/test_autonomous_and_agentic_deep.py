import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from services.agent_orchestrator import (
    AgentOrchestrator, PipelineContext, PipelineState, AgentResult, SceneData
)

class DummyAgent:
    def __init__(self, name: str):
        self.name = name

    async def execute(self, context: PipelineContext) -> AgentResult:
        if self.name == "StoryboardPlannerAgent":
            context.scenes = [
                SceneData(index=0, title="Shot 1", image_prompt="Hero stands", motion_type="dolly_zoom_vertigo"),
                SceneData(index=1, title="Shot 2", image_prompt="Chase scene", motion_type="fpv_drone_chase"),
                SceneData(index=2, title="Shot 3", image_prompt="Reveal scene", motion_type="whip_pan_reveal"),
            ]
        return AgentResult(agent_name=self.name, success=True, cost_usd=0.001, cost_inr=0.08)

@pytest.fixture
def mock_orchestrator():
    orchestrator = AgentOrchestrator()
    agent_names = [
        "CreativeDirectorAgent", "ResearchAgent", "BrandIntelligenceAgent", "ScriptWriterAgent",
        "StoryboardPlannerAgent", "PromptEngineerAgent", "ImageGeneratorAgent", "QualityControlAgent",
        "ThumbnailAgent", "VideoPlannerAgent", "VideoGeneratorAgent", "VideoQAAgent",
        "VoiceDirectorAgent", "SoundtrackAgent", "VideoEditorAgent", "SubtitleAgent",
        "RepurposingAgent", "SocialCopyAgent", "PublishingAgent", "AnalyticsAgent",
        "ABTestingAgent", "PipelinePresetAgent"
    ]
    orchestrator.agents = {name: DummyAgent(name) for name in agent_names}
    return orchestrator

@pytest.mark.asyncio
async def test_autonomous_mode_execution(mock_orchestrator):
    """Verify autonomous mode runs through approval gates without pausing."""
    ctx = PipelineContext(
        pipeline_id="pipe_auto_test",
        user_prompt="Futuristic sci-fi film",
        mode="autonomous",
        num_scenes=3,
        style="cinematic"
    )

    with patch.object(mock_orchestrator, "save_pipeline_state", new=AsyncMock()):
        final_ctx = await mock_orchestrator.run_pipeline(ctx, AsyncMock())

    assert final_ctx.state == PipelineState.COMPLETE
    assert final_ctx.mode == "autonomous"
    assert len(final_ctx.scenes) == 3
    # Verify diverse cinematic camera motions were planned
    motions = [s.motion_type for s in final_ctx.scenes]
    assert "dolly_zoom_vertigo" in motions
    assert "fpv_drone_chase" in motions

@pytest.mark.asyncio
async def test_agentic_mode_approval_gate(mock_orchestrator):
    """Verify agentic/assisted mode halts at approval gates and resumes accurately."""
    ctx = PipelineContext(
        pipeline_id="pipe_agentic_test",
        user_prompt="Noir mystery",
        mode="assisted",
        num_scenes=3,
        style="cinematic"
    )

    with patch.object(mock_orchestrator, "save_pipeline_state", new=AsyncMock()):
        # First execution halts at the first approval gate: SCRIPTING
        paused_ctx = await mock_orchestrator.run_pipeline(ctx, AsyncMock())
        assert paused_ctx.state == PipelineState.PAUSED
        assert paused_ctx.paused_after_state == "scripting"
        # Verify agents executed up to SCRIPTING
        logged_agents = [log["agent"] for log in paused_ctx.agent_logs]
        assert "ScriptWriterAgent" in logged_agents

        # Simulate user approval (transition to STORYBOARDING)
        paused_ctx.add_log("System", "Directorial approval granted — resuming pipeline")
        paused_ctx.state = PipelineState.STORYBOARDING
        paused_ctx.paused_after_state = None
        
        # Resume pipeline — should continue from STORYBOARDING and pause at GENERATING_IMAGES
        with patch.object(mock_orchestrator, "load_pipeline_state", new=AsyncMock(return_value=paused_ctx)):
            states_seen = []
            async def track_progress(c):
                states_seen.append(c.state)

            await mock_orchestrator.run_pipeline(paused_ctx, track_progress)
            # Second approval gate is GENERATING_IMAGES
            assert paused_ctx.state == PipelineState.PAUSED
            assert paused_ctx.paused_after_state == "generating_images"
            assert PipelineState.PROMPTING in states_seen
            assert PipelineState.GENERATING_IMAGES in states_seen
            assert PipelineState.PLANNING not in states_seen

@pytest.mark.asyncio
async def test_disconnection_resilience(mock_orchestrator):
    """Verify listener detach does not cancel background task."""
    pipeline_id = "pipe_disconnect_test"
    q = asyncio.Queue()

    with patch.object(mock_orchestrator, "resume_pipeline", new=AsyncMock()):
        await mock_orchestrator.attach_listener(pipeline_id, q)
        assert mock_orchestrator.is_task_running(pipeline_id)

        # Client disconnects (e.g. browser closed)
        mock_orchestrator.detach_listener(pipeline_id, q)

        # Background task must still be running
        assert mock_orchestrator.is_task_running(pipeline_id)

        # Only explicit user cancel terminates task
        cancelled = mock_orchestrator.cancel_task(pipeline_id)
        assert cancelled is True
