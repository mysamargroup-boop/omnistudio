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
        # First execution should pause at the first approval gate (PLANNING)
        paused_ctx = await mock_orchestrator.run_pipeline(ctx, AsyncMock())
        assert paused_ctx.state == PipelineState.PAUSED
        assert len(paused_ctx.agent_logs) == 1
        assert "CreativeDirectorAgent" in paused_ctx.agent_logs[0]["agent"]

        # Simulate user approval
        paused_ctx.add_log("System", "Directorial approval granted — resuming pipeline")
        
        # Resume pipeline — should transition to RESEARCHING, not reset to PLANNING
        with patch.object(mock_orchestrator, "load_pipeline_state", new=AsyncMock(return_value=paused_ctx)):
            # Mock progress callback to capture states
            states_seen = []
            async def track_progress(c):
                states_seen.append(c.state)

            await mock_orchestrator.run_pipeline(paused_ctx, track_progress)
            # Second approval gate is SCRIPTING, so it should run through RESEARCHING, BRANDING, SCRIPTING, then pause
            assert paused_ctx.state == PipelineState.PAUSED
            # Ensure it did not restart at PLANNING and progressed through BRANDING and SCRIPTING
            assert PipelineState.BRANDING in states_seen
            assert PipelineState.SCRIPTING in states_seen
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
