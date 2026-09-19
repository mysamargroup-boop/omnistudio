import logging
import asyncio
import json
import uuid
from enum import Enum
from typing import List, Dict, Optional, Any, Callable
from pydantic import BaseModel, Field
from datetime import datetime

from database import db_session, get_db_cursor
from config import settings

logger = logging.getLogger("omnistudio.agent_orchestrator")

class PipelineState(str, Enum):
    IDLE = "idle"
    PLANNING = "planning"
    RESEARCHING = "researching"
    BRANDING = "branding"
    SCRIPTING = "scripting"
    STORYBOARDING = "storyboarding"
    PROMPTING = "prompting"
    GENERATING_IMAGES = "generating_images"
    QUALITY_CONTROL = "quality_control"
    DESIGNING_THUMBNAIL = "designing_thumbnail"
    PLANNING_VIDEO = "planning_video"
    GENERATING_VIDEOS = "generating_videos"
    CHECKING_VIDEO_QA = "checking_video_qa"
    GENERATING_VOICE = "generating_voice"
    SOUNDTRACKING = "soundtracking"
    EDITING = "editing"
    SUBTITLING = "subtitling"
    REPURPOSING = "repurposing"
    GENERATING_SOCIAL_COPY = "generating_social_copy"
    PUBLISHING = "publishing"
    ANALYZING = "analyzing"
    AB_TESTING = "ab_testing"
    SAVING_PRESET = "saving_preset"
    COMPLETE = "complete"
    FAILED = "failed"
    PAUSED = "paused"

class SceneData(BaseModel):
    index: int
    title: str = ""
    script: str = ""
    description: str = ""
    camera_angle: str = ""
    motion_type: str = ""
    lighting: str = ""
    duration_seconds: float = 4.0
    image_prompt: str = ""
    negative_prompt: str = ""
    image_path: Optional[str] = None
    video_path: Optional[str] = None
    audio_path: Optional[str] = None

class PipelineContext(BaseModel):
    pipeline_id: str
    user_prompt: str
    mode: str = "autonomous"
    state: PipelineState = PipelineState.IDLE
    department: Optional[str] = None
    project_brief: Optional[dict] = None
    scenes: List[SceneData] = Field(default_factory=list)
    agent_logs: List[dict] = Field(default_factory=list)
    total_cost_usd: float = 0.0
    total_cost_inr: float = 0.0
    master_video_path: Optional[str] = None
    style: str = "cinematic"
    aspect_ratio: str = "16:9"
    image_model: str = "imagen-3"
    video_model: str = "omni_model"
    voice_provider: str = "edge"
    voice_id: str = ""
    num_scenes: int = 3
    error_message: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    def add_log(self, agent_name: str, message: str, cost_usd: float = 0, cost_inr: float = 0):
        # Using clean tags, ensuring no emojis are logged
        tag_map = {
            "CreativeDirectorAgent": "[DIRECTOR]",
            "ResearchAgent": "[RESEARCH]",
            "BrandIntelligenceAgent": "[BRAND]",
            "ScriptWriterAgent": "[SCRIPT]",
            "StoryboardPlannerAgent": "[STORYBOARD]",
            "PromptEngineerAgent": "[PROMPT]",
            "ImageGeneratorAgent": "[IMAGE]",
            "QualityControlAgent": "[QC]",
            "ThumbnailAgent": "[THUMBNAIL]",
            "VideoPlannerAgent": "[VIDEO_PLAN]",
            "VideoGeneratorAgent": "[VIDEO]",
            "VideoQAAgent": "[VIDEO_QA]",
            "VoiceDirectorAgent": "[VOICE]",
            "SoundtrackAgent": "[SOUNDTRACK]",
            "VideoEditorAgent": "[EDIT]",
            "SubtitleAgent": "[SUBTITLE]",
            "RepurposingAgent": "[REPURPOSE]",
            "SocialCopyAgent": "[SOCIAL]",
            "PublishingAgent": "[PUBLISH]",
            "AnalyticsAgent": "[ANALYTICS]",
            "ABTestingAgent": "[AB_TEST]",
            "PipelinePresetAgent": "[PRESET]"
        }
        tag = tag_map.get(agent_name, "[AGENT]")
        
        self.agent_logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "agent": agent_name,
            "message": f"{tag} {message}",
            "cost_usd": cost_usd,
            "cost_inr": cost_inr
        })
        self.total_cost_usd += cost_usd
        self.total_cost_inr += cost_inr

    def to_dict(self) -> dict:
        return self.dict()

    @classmethod
    def from_dict(cls, data: dict) -> "PipelineContext":
        return cls(**data)

class AgentResult(BaseModel):
    success: bool
    data: dict = Field(default_factory=dict)
    error: Optional[str] = None
    cost_usd: float = 0.0
    cost_inr: float = 0.0

class BaseAgent:
    name: str = "BaseAgent"
    description: str = "Base Agent"
    icon: str = "bot"

    async def execute(self, context: PipelineContext) -> AgentResult:
        raise NotImplementedError

class AgentOrchestrator:
    def __init__(self):
        self.agents: Dict[str, BaseAgent] = {}
        self._active_tasks: Dict[str, asyncio.Task] = {}
        self._listeners: Dict[str, List[asyncio.Queue]] = {}

    def register_agent(self, agent: BaseAgent):
        self.agents[agent.name] = agent
        logger.info(f"Registered agent: {agent.name}")

    async def attach_listener(self, pipeline_id: str, queue: asyncio.Queue) -> None:
        """Attach an SSE event listener queue to an active or new pipeline execution."""
        if pipeline_id not in self._listeners:
            self._listeners[pipeline_id] = []
        self._listeners[pipeline_id].append(queue)

        # If no active background task is running for this pipeline, spawn one
        current_task = self._active_tasks.get(pipeline_id)
        if not current_task or current_task.done():
            async def broadcast_callback(ctx: PipelineContext):
                listeners = self._listeners.get(pipeline_id, [])
                payload = ctx.to_dict()
                for q in list(listeners):
                    try:
                        q.put_nowait(payload)
                    except Exception:
                        pass

            task = asyncio.create_task(self.resume_pipeline(pipeline_id, broadcast_callback))
            self._active_tasks[pipeline_id] = task

    def detach_listener(self, pipeline_id: str, queue: asyncio.Queue) -> None:
        """Detach a listener when a client disconnects, leaving the background task running."""
        if pipeline_id in self._listeners:
            try:
                self._listeners[pipeline_id].remove(queue)
                if not self._listeners[pipeline_id]:
                    del self._listeners[pipeline_id]
            except ValueError:
                pass

    def cancel_task(self, pipeline_id: str) -> bool:
        """Explicitly cancel a pipeline background task upon user request."""
        task = self._active_tasks.get(pipeline_id)
        if task and not task.done():
            task.cancel()
            return True
        return False

    def is_task_running(self, pipeline_id: str) -> bool:
        task = self._active_tasks.get(pipeline_id)
        return bool(task and not task.done())

    async def save_pipeline_state(self, context: PipelineContext):
        try:
            with get_db_cursor() as cur:
                cur.execute("""
                    INSERT OR REPLACE INTO agent_pipelines 
                    (id, user_prompt, mode, state, project_brief, scenes_data, agent_logs, 
                    total_cost_usd, total_cost_inr, style, aspect_ratio, image_model, 
                    voice_provider, voice_id, num_scenes, master_video_path, error_message, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """, (
                    context.pipeline_id,
                    context.user_prompt,
                    context.mode,
                    context.state.value,
                    json.dumps(context.project_brief or {}),
                    json.dumps([s.dict() for s in context.scenes]),
                    json.dumps(context.agent_logs),
                    context.total_cost_usd,
                    context.total_cost_inr,
                    context.style,
                    context.aspect_ratio,
                    context.image_model,
                    context.voice_provider,
                    context.voice_id,
                    context.num_scenes,
                    context.master_video_path,
                    context.error_message
                ))
        except Exception as e:
            logger.error(f"Error saving pipeline state: {e}")

    async def load_pipeline_state(self, pipeline_id: str) -> PipelineContext:
        try:
            with db_session() as conn:
                cur = conn.cursor()
                cur.execute("SELECT * FROM agent_pipelines WHERE id = ?", (pipeline_id,))
                row = cur.fetchone()
                if not row:
                    raise ValueError(f"Pipeline {pipeline_id} not found")
                
                return PipelineContext(
                    pipeline_id=row['id'],
                    user_prompt=row['user_prompt'],
                    mode=row['mode'],
                    state=PipelineState(row['state']),
                    project_brief=json.loads(row['project_brief']),
                    scenes=[SceneData(**s) for s in json.loads(row['scenes_data'])],
                    agent_logs=json.loads(row['agent_logs']),
                    total_cost_usd=row['total_cost_usd'],
                    total_cost_inr=row['total_cost_inr'],
                    style=row['style'],
                    aspect_ratio=row['aspect_ratio'],
                    image_model=row['image_model'],
                    voice_provider=row['voice_provider'],
                    voice_id=row['voice_id'],
                    num_scenes=row['num_scenes'],
                    master_video_path=row['master_video_path'],
                    error_message=row['error_message'],
                    created_at=row['created_at']
                )
        except Exception as e:
            logger.error(f"Error loading pipeline state: {e}")
            raise

    async def resume_pipeline(self, pipeline_id: str, progress_callback: Callable) -> PipelineContext:
        context = await self.load_pipeline_state(pipeline_id)
        if context.state == PipelineState.PAUSED:
            pass
        return await self.run_pipeline(context, progress_callback)

    async def get_pipeline_history(self, limit: int = 20) -> list:
        try:
            with db_session() as conn:
                cur = conn.cursor()
                cur.execute("SELECT * FROM agent_pipelines ORDER BY created_at DESC LIMIT ?", (limit,))
                rows = cur.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting pipeline history: {e}")
            return []

    async def run_pipeline(self, context: PipelineContext, progress_callback: Callable) -> PipelineContext:
        transitions = {
            PipelineState.IDLE: PipelineState.PLANNING,
            PipelineState.PLANNING: PipelineState.RESEARCHING,
            PipelineState.RESEARCHING: PipelineState.BRANDING,
            PipelineState.BRANDING: PipelineState.SCRIPTING,
            PipelineState.SCRIPTING: PipelineState.STORYBOARDING,
            PipelineState.STORYBOARDING: PipelineState.PROMPTING,
            PipelineState.PROMPTING: PipelineState.GENERATING_IMAGES,
            PipelineState.GENERATING_IMAGES: PipelineState.QUALITY_CONTROL,
            PipelineState.QUALITY_CONTROL: PipelineState.DESIGNING_THUMBNAIL,
            PipelineState.DESIGNING_THUMBNAIL: PipelineState.PLANNING_VIDEO,
            PipelineState.PLANNING_VIDEO: PipelineState.GENERATING_VIDEOS,
            PipelineState.GENERATING_VIDEOS: PipelineState.CHECKING_VIDEO_QA,
            PipelineState.CHECKING_VIDEO_QA: PipelineState.GENERATING_VOICE,
            PipelineState.GENERATING_VOICE: PipelineState.SOUNDTRACKING,
            PipelineState.SOUNDTRACKING: PipelineState.EDITING,
            PipelineState.EDITING: PipelineState.SUBTITLING,
            PipelineState.SUBTITLING: PipelineState.REPURPOSING,
            PipelineState.REPURPOSING: PipelineState.GENERATING_SOCIAL_COPY,
            PipelineState.GENERATING_SOCIAL_COPY: PipelineState.PUBLISHING,
            PipelineState.PUBLISHING: PipelineState.ANALYZING,
            PipelineState.ANALYZING: PipelineState.AB_TESTING,
            PipelineState.AB_TESTING: PipelineState.SAVING_PRESET,
            PipelineState.SAVING_PRESET: PipelineState.COMPLETE,
            PipelineState.PAUSED: PipelineState.PAUSED
        }

        if context.state == PipelineState.PAUSED:
            pass

        agent_mapping = {
            PipelineState.PLANNING: "CreativeDirectorAgent",
            PipelineState.RESEARCHING: "ResearchAgent",
            PipelineState.BRANDING: "BrandIntelligenceAgent",
            PipelineState.SCRIPTING: "ScriptWriterAgent",
            PipelineState.STORYBOARDING: "StoryboardPlannerAgent",
            PipelineState.PROMPTING: "PromptEngineerAgent",
            PipelineState.GENERATING_IMAGES: "ImageGeneratorAgent",
            PipelineState.QUALITY_CONTROL: "QualityControlAgent",
            PipelineState.DESIGNING_THUMBNAIL: "ThumbnailAgent",
            PipelineState.PLANNING_VIDEO: "VideoPlannerAgent",
            PipelineState.GENERATING_VIDEOS: "VideoGeneratorAgent",
            PipelineState.CHECKING_VIDEO_QA: "VideoQAAgent",
            PipelineState.GENERATING_VOICE: "VoiceDirectorAgent",
            PipelineState.SOUNDTRACKING: "SoundtrackAgent",
            PipelineState.EDITING: "VideoEditorAgent",
            PipelineState.SUBTITLING: "SubtitleAgent",
            PipelineState.REPURPOSING: "RepurposingAgent",
            PipelineState.GENERATING_SOCIAL_COPY: "SocialCopyAgent",
            PipelineState.PUBLISHING: "PublishingAgent",
            PipelineState.ANALYZING: "AnalyticsAgent",
            PipelineState.AB_TESTING: "ABTestingAgent",
            PipelineState.SAVING_PRESET: "PipelinePresetAgent"
        }

        approval_gates = [
            PipelineState.PLANNING,
            PipelineState.SCRIPTING,
            PipelineState.STORYBOARDING,
            PipelineState.GENERATING_IMAGES,
            PipelineState.EDITING,
        ]

        if context.state == PipelineState.IDLE:
            context.state = PipelineState.PLANNING
            await self.save_pipeline_state(context)

        if context.state == PipelineState.PAUSED:
            # Determine resume state from last completed phase
            matched_state = None
            if context.agent_logs:
                for log in reversed(context.agent_logs):
                    agent_str = (log.get("agent") or "").strip().lower()
                    if not agent_str or agent_str in ("system", "user"):
                        continue
                    for st, ag in agent_mapping.items():
                        ag_lower = ag.lower()
                        if ag_lower == agent_str or ag_lower == f"{agent_str}agent" or ag_lower.replace("agent", "") == agent_str.replace("agent", ""):
                            matched_state = st
                            break
                    if matched_state:
                        break

            if matched_state and matched_state in transitions:
                context.state = transitions[matched_state]
            else:
                context.state = PipelineState.PLANNING
            await self.save_pipeline_state(context)

        while context.state in agent_mapping:
            agent_name = agent_mapping.get(context.state)
            if not agent_name or agent_name not in self.agents:
                context.state = PipelineState.FAILED
                context.error_message = f"Agent {agent_name} not found for state {context.state}"
                await self.save_pipeline_state(context)
                await progress_callback(context)
                return context

            agent = self.agents[agent_name]
            logger.info(f"Running agent {agent.name} for state {context.state}")
            current_executing_state = context.state
            
            try:
                result = await agent.execute(context)
                context.add_log(agent.name, f"Completed phase: {current_executing_state.value}", result.cost_usd, result.cost_inr)
                
                if not result.success:
                    context.state = PipelineState.FAILED
                    context.error_message = result.error
                    await self.save_pipeline_state(context)
                    await progress_callback(context)
                    return context
                
                next_state = transitions.get(current_executing_state, PipelineState.COMPLETE)
                context.state = next_state
                await self.save_pipeline_state(context)
                await progress_callback(context)

                # If assisted or agentic mode and just completed an approval gate, pause for user review
                if context.mode in ('assisted', 'agentic') and current_executing_state in approval_gates and next_state != PipelineState.COMPLETE:
                    context.state = PipelineState.PAUSED
                    await self.save_pipeline_state(context)
                    await progress_callback(context)
                    return context

            except Exception as e:
                logger.error(f"Error executing agent {agent.name}: {e}")
                context.state = PipelineState.FAILED
                context.error_message = str(e)
                await self.save_pipeline_state(context)
                await progress_callback(context)
                return context

        return context

