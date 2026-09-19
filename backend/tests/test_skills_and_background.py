import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import asyncio
from services.skills_service import skill_manager, SkillDefinition
from services.agents.storyboard_planner_agent import StoryboardPlannerAgent, CINEMATIC_CAMERA_MOTIONS
from services.agent_orchestrator import AgentOrchestrator, PipelineContext, SceneData, PipelineState

def test_skills_manager():
    skills = skill_manager.list_skills()
    assert len(skills) >= 3
    assert any(s.id == "hollywood_anamorphic_director" for s in skills)

    # Save a custom skill
    custom = skill_manager.save_custom_skill({
        "id": "test_bollywood_skill",
        "name": "Test Bollywood Drama",
        "description": "Dramatic zoom and emotional lighting",
        "camera_motions": ["dramatic_triple_zoom", "slow_mo_hero_entry"],
        "system_prompt": "Direct with extreme drama."
    })
    assert custom.id == "test_bollywood_skill"

    # Verify retrieval
    loaded = skill_manager.get_skill("test_bollywood_skill")
    assert loaded is not None
    assert loaded.name == "Test Bollywood Drama"

    # Clean up
    deleted = skill_manager.delete_custom_skill("test_bollywood_skill")
    assert deleted is True

@pytest.mark.asyncio
async def test_storyboard_planner_diverse_motions():
    agent = StoryboardPlannerAgent()
    ctx = PipelineContext(
        pipeline_id="test_pipe_1",
        user_prompt="Epic battle on rain-slicked neon rooftop",
        style="cinematic",
        scenes=[
            SceneData(index=0),
            SceneData(index=1),
            SceneData(index=2),
            SceneData(index=3),
        ]
    )
    res = await agent.execute(ctx)
    assert res.success is True
    # Ensure all scenes have distinct camera motions and are not just simple "push" or "pan"
    motions = [s.motion_type for s in ctx.scenes]
    assert len(set(motions)) == len(motions), f"Motions should be unique: {motions}"
    for m in motions:
        assert m in [item["name"] for item in CINEMATIC_CAMERA_MOTIONS]

def test_orchestrator_task_management():
    orch = AgentOrchestrator()
    q1 = asyncio.Queue()
    q2 = asyncio.Queue()

    # Verify initial state
    assert not orch.is_task_running("pipe_test")

    # Cancel on non-running task returns False gracefully
    assert orch.cancel_task("pipe_test") is False
