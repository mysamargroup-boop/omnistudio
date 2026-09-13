from .creative_director_agent import CreativeDirectorAgent
from .research_agent import ResearchAgent
from .brand_intelligence_agent import BrandIntelligenceAgent
from .script_writer_agent import ScriptWriterAgent
from .storyboard_planner_agent import StoryboardPlannerAgent
from .prompt_engineer_agent import PromptEngineerAgent
from .image_generator_agent import ImageGeneratorAgent
from .quality_control_agent import QualityControlAgent
from .thumbnail_agent import ThumbnailAgent
from .video_planner_agent import VideoPlannerAgent
from .video_generator_agent import VideoGeneratorAgent
from .video_qa_agent import VideoQAAgent
from .voice_director_agent import VoiceDirectorAgent
from .soundtrack_agent import SoundtrackAgent
from .video_editor_agent import VideoEditorAgent
from .subtitle_agent import SubtitleAgent
from .repurposing_agent import RepurposingAgent
from .social_copy_agent import SocialCopyAgent
from .publishing_agent import PublishingAgent
from .analytics_agent import AnalyticsAgent
from .ab_testing_agent import ABTestingAgent
from .pipeline_preset_agent import PipelinePresetAgent

from services.agent_orchestrator import AgentOrchestrator

def get_default_orchestrator() -> AgentOrchestrator:
    orchestrator = AgentOrchestrator()
    orchestrator.register_agent(CreativeDirectorAgent())
    orchestrator.register_agent(ResearchAgent())
    orchestrator.register_agent(BrandIntelligenceAgent())
    orchestrator.register_agent(ScriptWriterAgent())
    orchestrator.register_agent(StoryboardPlannerAgent())
    orchestrator.register_agent(PromptEngineerAgent())
    orchestrator.register_agent(ImageGeneratorAgent())
    orchestrator.register_agent(QualityControlAgent())
    orchestrator.register_agent(ThumbnailAgent())
    orchestrator.register_agent(VideoPlannerAgent())
    orchestrator.register_agent(VideoGeneratorAgent())
    orchestrator.register_agent(VideoQAAgent())
    orchestrator.register_agent(VoiceDirectorAgent())
    orchestrator.register_agent(SoundtrackAgent())
    orchestrator.register_agent(VideoEditorAgent())
    orchestrator.register_agent(SubtitleAgent())
    orchestrator.register_agent(RepurposingAgent())
    orchestrator.register_agent(SocialCopyAgent())
    orchestrator.register_agent(PublishingAgent())
    orchestrator.register_agent(AnalyticsAgent())
    orchestrator.register_agent(ABTestingAgent())
    orchestrator.register_agent(PipelinePresetAgent())
    return orchestrator
