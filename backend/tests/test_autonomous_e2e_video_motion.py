import pytest
import asyncio
from pathlib import Path
from services.agent_orchestrator import (
    AgentOrchestrator, PipelineContext, PipelineState, SceneData
)
from services.agents import get_default_orchestrator
from services.ffmpeg_service import get_media_duration
from config import settings

@pytest.mark.asyncio
async def test_full_autonomous_pipeline_image_to_4sec_video():
    """
    End-to-end autonomous test:
    Prompt -> Storyboard -> Image Synthesis -> 4-second Video Motion -> Voice Narration -> Master Compilation
    """
    orchestrator = get_default_orchestrator()

    ctx = PipelineContext(
        pipeline_id="e2e_auto_test_4s",
        user_prompt="Cyberpunk neon city skyline with flying drone camera",
        mode="autonomous",
        num_scenes=2,
        style="cinematic",
        aspect_ratio="16:9",
        image_model="imagen_3",
        video_model="omni_model"
    )

    events_captured = []
    async def progress_callback(updated_ctx: PipelineContext):
        events_captured.append(updated_ctx.state)

    # Execute full autonomous pipeline
    final_ctx = await orchestrator.run_pipeline(ctx, progress_callback)

    # 1. Pipeline should complete successfully
    assert final_ctx.state == PipelineState.COMPLETE, f"Pipeline failed: {final_ctx.error_message}"
    assert len(final_ctx.scenes) == 2

    # 2. Check each scene has an image generated
    for i, scene in enumerate(final_ctx.scenes):
        assert scene.image_path is not None, f"Scene {i} missing image_path"
        img_name = Path(scene.image_path).name
        img_disk = settings.OUTPUTS_PATH / 'images' / img_name
        assert img_disk.exists(), f"Scene {i} image file not found on disk: {img_disk}"
        assert img_disk.stat().st_size > 500, f"Scene {i} image file is empty or corrupted"

    # 3. Check each scene has a 4-second video clip generated
    for i, scene in enumerate(final_ctx.scenes):
        assert scene.video_path is not None, f"Scene {i} missing video_path"
        vid_name = Path(scene.video_path).name
        vid_disk = settings.OUTPUTS_PATH / 'videos' / vid_name
        assert vid_disk.exists(), f"Scene {i} video file not found on disk: {vid_disk}"
        assert vid_disk.stat().st_size > 1000, f"Scene {i} video file is empty or corrupted"

        # Verify video duration is around 4.0 seconds (+/- 0.5s tolerance)
        duration = get_media_duration(vid_disk)
        assert duration is not None, f"Could not determine duration of {vid_disk}"
        assert 3.5 <= duration <= 5.5, f"Scene {i} video duration expected ~4.0s, got {duration}s"

    # 4. Check master video is compiled and exists
    assert final_ctx.master_video_path is not None, "Master video path missing"
    master_name = Path(final_ctx.master_video_path).name
    master_disk = settings.OUTPUTS_PATH / 'final' / master_name
    assert master_disk.exists(), f"Master video not found on disk: {master_disk}"
    assert master_disk.stat().st_size > 1000, "Master video is empty"

    # 5. Check subtitles (.vtt and .srt) exist
    stem = master_disk.stem
    vtt_disk = settings.OUTPUTS_PATH / 'final' / f"{stem}.vtt"
    srt_disk = settings.OUTPUTS_PATH / 'final' / f"{stem}.srt"
    assert vtt_disk.exists(), "WebVTT subtitle file was not generated"
    assert srt_disk.exists(), "SubRip SRT subtitle file was not generated"

    # 6. Verify zero emojis across all agent logs
    emoji_ranges = [
        (0x1F600, 0x1F64F),  # Emoticons
        (0x1F300, 0x1F5FF),  # Misc Symbols and Pictographs
        (0x1F680, 0x1F6FF),  # Transport and Map
        (0x2600, 0x26FF),    # Misc symbols
        (0x2700, 0x27BF),    # Dingbats
        (0xFE00, 0xFE0F),    # Variation Selectors
        (0x1F900, 0x1F9FF),  # Supplemental Symbols and Pictographs
        (0x1FA70, 0x1FAFF),  # Symbols and Pictographs Extended-A
    ]
    def has_emoji(text: str) -> bool:
        for ch in text:
            code = ord(ch)
            for start, end in emoji_ranges:
                if start <= code <= end:
                    return True
        return False

    for log in final_ctx.agent_logs:
        msg = log.get("message", "")
        assert not has_emoji(msg), f"Emoji found in log: {msg}"
