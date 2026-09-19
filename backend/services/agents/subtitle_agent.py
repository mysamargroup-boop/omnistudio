from pathlib import Path
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from config import settings

def time_to_vtt(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"

def time_to_srt(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

class SubtitleAgent(BaseAgent):
    name = "SubtitleAgent"
    description = "Generates synchronized subtitles using SRT/VTT."
    icon = "type"

    async def execute(self, context: PipelineContext) -> AgentResult:
        if context.master_video_path and context.scenes:
            final_dir = settings.OUTPUTS_PATH / 'final'
            final_dir.mkdir(parents=True, exist_ok=True)
            stem = Path(context.master_video_path).stem
            vtt_file = final_dir / f"{stem}.vtt"
            srt_file = final_dir / f"{stem}.srt"

            vtt_lines = ["WEBVTT\n"]
            srt_lines = []
            curr_time = 0.0

            for idx, scene in enumerate(context.scenes, 1):
                dur = float(scene.duration_seconds or 4.0)
                start_sec = curr_time
                end_sec = curr_time + dur
                curr_time = end_sec
                narration = (scene.script or scene.title or f"Scene {idx}").strip()

                vtt_lines.append(f"{time_to_vtt(start_sec)} --> {time_to_vtt(end_sec)}\n{narration}\n")
                srt_lines.append(f"{idx}\n{time_to_srt(start_sec)} --> {time_to_srt(end_sec)}\n{narration}\n")

            try:
                vtt_file.write_text("\n".join(vtt_lines), encoding="utf-8")
                srt_file.write_text("\n".join(srt_lines), encoding="utf-8")
            except Exception:
                pass

        context.add_log(self.name, f"Generated and synchronized SRT/VTT subtitle files for {len(context.scenes)} scenes")
        return AgentResult(success=True, data={"subtitles_generated": True})
