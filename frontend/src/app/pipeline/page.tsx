"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Cpu,
  Loader2,
  Download,
  CheckCircle2,
  Film,
  Image as ImageIcon,
  Video,
  Mic,
  Play,
  ArrowRight,
  Clock,
  Layers,
  Terminal,
  RotateCcw,
  Sparkles,
  Music,
  Maximize2,
  Sliders,
  Wand2,
  FileText,
  Clapperboard,
  Scissors,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Trash2,
  Upload,
  Copy,
  Share2,
  Send,
  BarChart2,
  GitCompare,
  Bookmark,
  Shield,
  Eye,
  Type,
  Pause,
  AlertCircle,
  X,
  Calendar,
  Zap,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import AgentFlowChart, { AgentNodeStatus, ALL_22_AGENTS } from "@/components/pipeline/AgentFlowChart";
import AgentCard from "@/components/pipeline/AgentCard";
import SceneReviewGrid from "@/components/pipeline/SceneReviewGrid";
import PipelineActivityLog, { ActivityLogEntry } from "@/components/pipeline/PipelineActivityLog";
import LiveProgressBar from "@/components/ui/LiveProgressBar";
import Dropdown, { DropdownOption } from "@/components/ui/Dropdown";
import ModernSelect from "@/components/ui/ModernSelect";
import { startActiveJob, completeActiveJob, updateActiveJob } from "@/lib/generationTracker";

const DEFAULT_PIPELINE_PROMPT =
  "Create an ultra-luxury cinematic commercial for an emerald jewelry collection featuring an elegant protagonist walking through a grand moonlit palace with flowing silks and volumetric lighting";

// Curated Master Concept Presets
const PRESETS = [
  {
    genre: "Cinematic 35mm",
    text: "Cyberpunk detective uncovering an AI conspiracy in rainy neon Neo-Tokyo with flying spinners and volumetric steam",
  },
  {
    genre: "Luxury Commercial",
    text: "Ultra-luxury Swiss chronometer watch on polished black obsidian, subtle gold water caustics and macro pristine reflections",
  },
  {
    genre: "Sci-Fi Odyssey",
    text: "Deep space expedition finding an ancient alien monolith orbiting Jupiter with glowing rings and dramatic rim lighting",
  },
  {
    genre: "Haute Couture",
    text: "High-fashion model in flowing royal emerald silk walking through an opulent marble palace hall at golden dusk",
  },
  {
    genre: "Documentary",
    text: "Weathered elderly Himalayan mountaineer overlooking misty snowy peaks at sunrise, Leica natural lighting",
  },
  {
    genre: "Mythic Fantasy",
    text: "Majestic silver dragon soaring over misty Scandinavian fjords with aurora borealis dancing across the midnight sky",
  },
];

interface PipelineModelOption {
  id: string;
  name: string;
  badge: string;
  provider: string;
  description: string;
  active?: boolean;
}

const DIFFUSION_MODELS: PipelineModelOption[] = [
  { id: "auto", name: "Auto (AI Agent Selected)", badge: "SMART", provider: "Director Agent", description: "Agent analyzes prompt & switches to optimal diffusion model dynamically", active: true },
  { id: "gemini_flash_image", name: "Google Gemini 2.5 Flash", badge: "FAST", provider: "Google DeepMind", description: "Ultra-fast high fidelity image diffusion", active: true },
  { id: "imagen_3", name: "Google Imagen 4", badge: "PRO", provider: "Google Cloud AI", description: "Flagship photoreal lighting & textures", active: true },
  { id: "gpt-image-2", name: "GPT Image 2", badge: "PREMIUM", provider: "OpenAI", description: "Composition precision & realistic skin", active: true },
  { id: "flux_2_ultra", name: "Flux 2 Ultra", badge: "SOTA", provider: "Black Forest Labs", description: "Next-gen photorealism, 4K studio-grade output", active: true },
  { id: "flux_pro", name: "Flux.1 Pro", badge: "PRO", provider: "Black Forest Labs", description: "Studio typography & photorealism", active: true },
  { id: "midjourney_v7", name: "Midjourney v7", badge: "NEW", provider: "Midjourney", description: "Artistic hyperrealism with cinematic aesthetics", active: true },
  { id: "seedance_2_5", name: "Seedance 2.5", badge: "AI", provider: "ByteDance", description: "Ultra-consistent character & scene generation", active: true },
];

const STYLES = [
  { id: "cinematic", label: "Cinematic 35mm", desc: "Arri Alexa, Volumetric Lighting" },
  { id: "cyberpunk", label: "Cyberpunk Noir", desc: "Vibrant Neon, Rainy Reflections" },
  { id: "photoreal", label: "Photoreal 8K", desc: "Hasselblad Sharp, Natural Sunlight" },
  { id: "anime", label: "Anime Ghibli", desc: "Painterly Skies, Luminous Color" },
  { id: "3d_pixar", label: "3D Animation", desc: "Subsurface Glow, Stylized CGI" },
];

const SOCIAL_PLATFORMS = [
  { id: "youtube", name: "YouTube (Shorts & 4K)", color: "text-red-500", border: "border-red-500/30", bg: "bg-red-500/10" },
  { id: "instagram", name: "Instagram Reels & Feed", color: "text-pink-500", border: "border-pink-500/30", bg: "bg-pink-500/10" },
  { id: "tiktok", name: "TikTok Video", color: "text-cyan-400", border: "border-cyan-500/30", bg: "bg-cyan-500/10" },
  { id: "twitter", name: "X (Twitter) Video", color: "text-sky-400", border: "border-sky-500/30", bg: "bg-sky-500/10" },
  { id: "linkedin", name: "LinkedIn Video Post", color: "text-blue-500", border: "border-blue-500/30", bg: "bg-blue-500/10" },
];

// Map backend pipeline states to agent IDs
const STATE_TO_AGENT_ID: Record<string, string> = {
  planning: "creative_director",
  researching: "research_agent",
  branding: "brand_intelligence",
  scripting: "script_writer",
  storyboarding: "storyboard_planner",
  prompting: "prompt_engineer",
  generating_images: "image_generator",
  quality_control: "quality_control",
  designing_thumbnail: "thumbnail_agent",
  planning_video: "video_planner",
  generating_videos: "video_generator",
  checking_video_qa: "video_qa",
  generating_voice: "voice_director",
  soundtracking: "soundtrack_agent",
  editing: "video_editor",
  subtitling: "subtitle_agent",
  repurposing: "repurposing_agent",
  generating_social_copy: "social_copy_agent",
  publishing: "publishing_agent",
  analyzing: "analytics_agent",
  ab_testing: "ab_testing_agent",
  saving_preset: "pipeline_preset_agent",
};

const AGENT_ORDER = [
  "creative_director",
  "research_agent",
  "brand_intelligence",
  "script_writer",
  "storyboard_planner",
  "prompt_engineer",
  "image_generator",
  "quality_control",
  "thumbnail_agent",
  "video_planner",
  "video_generator",
  "video_qa",
  "voice_director",
  "soundtrack_agent",
  "video_editor",
  "subtitle_agent",
  "repurposing_agent",
  "social_copy_agent",
  "publishing_agent",
  "analytics_agent",
  "ab_testing_agent",
  "pipeline_preset_agent",
];

function PipelineContent() {
  const searchParams = useSearchParams();
  const [topic, setTopic] = useState(searchParams?.get("topic") || "");
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [scenes, setScenes] = useState(3);
  const [style, setStyle] = useState("cinematic");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [voiceProvider, setVoiceProvider] = useState("edge");
  const [imageModel, setImageModel] = useState("auto");
  
  // Two distinct operation modes (presented as 2 large interactive cards)
  const [agentMode, setAgentMode] = useState<"autonomous" | "assisted">("autonomous");

  // Advanced Manual Overrides Accordion
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string>(searchParams?.get("input_image") || "");
  const [uploadingRef, setUploadingRef] = useState(false);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  // Directorial Skills State
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string>("none");
  const [uploadingSkill, setUploadingSkill] = useState(false);
  const skillFileInputRef = useRef<HTMLInputElement>(null);

  // Runtime Pipeline Telemetry
  const [running, setRunning] = useState(false);
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentNodeStatus>>({});
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [choreographedScenes, setChoreographedScenes] = useState<any[]>([]);
  const [totalCostUsd, setTotalCostUsd] = useState(0);
  const [totalCostInr, setTotalCostInr] = useState(0);
  const [masterVideo, setMasterVideo] = useState<string | null>(null);
  const [projectBrief, setProjectBrief] = useState<any>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [copiedCopy, setCopiedCopy] = useState(false);

  // Interactive Directorial Approval Modal Popup State
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [pausedState, setPausedState] = useState<string | null>(null);
  const [directorialNotes, setDirectorialNotes] = useState("");
  const [approvingStep, setApprovingStep] = useState(false);

  // Omnichannel Publishing State
  const [selectedPublishChannels, setSelectedPublishChannels] = useState<string[]>([
    "youtube",
    "instagram",
    "tiktok",
  ]);
  const [publishStatus, setPublishStatus] = useState<"idle" | "publishing" | "published" | "error">("idle");
  const [publishMessage, setPublishMessage] = useState("");

  // Post-Production Synthesized Assets
  const [socialCopy, setSocialCopy] = useState<{ title?: string; caption?: string; hashtags?: string[] } | null>(null);
  const [retentionScore, setRetentionScore] = useState<number | null>(null);
  const [abHookVariants, setAbHookVariants] = useState<string[]>([]);
  const [showDebugTelemetry, setShowDebugTelemetry] = useState(false);

  // Brand Kit Intelligence Switch State
  const [applyBrandKit, setApplyBrandKit] = useState<boolean>(true);

  // Production History Drawer / Modal State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.getAgentPipelineHistory();
      if (res?.success && Array.isArray(res?.history)) {
        setHistoryList(res.history);
      }
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRestoreFromHistory = (item: any) => {
    if (!item) return;
    setPipelineId(item.id);
    if (item.user_prompt) setTopic(item.user_prompt);
    if (item.style) setStyle(item.style);
    if (item.aspect_ratio) setAspectRatio(item.aspect_ratio);
    if (item.master_video_path) setMasterVideo(item.master_video_path);
    if (item.total_cost_usd) setTotalCostUsd(item.total_cost_usd);
    if (item.total_cost_inr) setTotalCostInr(item.total_cost_inr);
    if (item.project_brief) {
      try {
        const brief = typeof item.project_brief === "string" ? JSON.parse(item.project_brief) : item.project_brief;
        setProjectBrief(brief);
      } catch {}
    }
    if (item.scenes_data) {
      try {
        const scs = typeof item.scenes_data === "string" ? JSON.parse(item.scenes_data) : item.scenes_data;
        if (Array.isArray(scs)) setChoreographedScenes(scs);
      } catch {}
    }
    if (item.agent_logs) {
      try {
        const lgs = typeof item.agent_logs === "string" ? JSON.parse(item.agent_logs) : item.agent_logs;
        if (Array.isArray(lgs)) {
          setActivityLogs(
            lgs.map((l: any) => ({
              timestamp: l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
              agent: l.agent?.toLowerCase().replace("agent", "") || "system",
              message: l.message,
              cost_usd: l.cost_usd,
              cost_inr: l.cost_inr,
              type: "info",
            }))
          );
        }
      } catch {}
    }
    if (item.state === "complete") {
      const completedStatuses: Record<string, AgentNodeStatus> = {};
      AGENT_ORDER.forEach((id) => {
        completedStatuses[id] = { state: "complete", message: "Completed successfully" };
      });
      setAgentStatuses(completedStatuses);
    }
    setHistoryOpen(false);
  };

  // Navigation refs
  const deskRef = useRef<HTMLDivElement>(null);
  const studioRef = useRef<HTMLDivElement>(null);
  const screeningRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const qTopic = searchParams?.get("topic");
    if (qTopic) setTopic(qTopic);
    const inputImg = searchParams?.get("input_image");
    if (inputImg) setReferenceImage(inputImg);
  }, [searchParams]);

  const handleRefUpload = async (file: File) => {
    if (!file) return;
    setUploadingRef(true);
    try {
      const res = await api.uploadReferenceImage(file);
      if (res?.url) setReferenceImage(res.url);
    } catch (e: any) {
      alert(e?.message || "Failed to upload reference image");
    } finally {
      setUploadingRef(false);
    }
  };

  const enhancePrompt = async () => {
    if (!topic.trim()) return;
    setEnhancing(true);
    try {
      const data = await api.enhancePrompt({ prompt: topic, style, enhance_style: style });
      const enhancedText = data?.enhanced_prompt || data?.enhanced;
      if (enhancedText) {
        setTopic(enhancedText);
      } else {
        setTopic(
          (prev) =>
            `${prev.trim()}, 35mm anamorphic cinematography, volumetric lighting, dynamic three-act pacing, cinematic 8k resolution`
        );
      }
    } catch (_) {
      setTopic(
        (prev) =>
          `${prev.trim()}, 35mm anamorphic cinematography, volumetric lighting, dynamic three-act pacing, cinematic 8k resolution`
      );
    } finally {
      setEnhancing(false);
    }
  };

  // ── Throttled SSE Event Handler (prevents scroll lag from high-frequency state updates) ──
  const sseThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEventRef = useRef<any>(null);

  const flushPendingEvent = useCallback(() => {
    const event = pendingEventRef.current;
    if (!event) return;
    pendingEventRef.current = null;

    if (event.project_brief && Object.keys(event.project_brief).length > 0) {
      setProjectBrief(event.project_brief);
    }
    if (event.scenes && Array.isArray(event.scenes)) {
      setChoreographedScenes(event.scenes);
    }
    if (typeof event.total_cost_usd === "number") setTotalCostUsd(event.total_cost_usd);
    if (typeof event.total_cost_inr === "number") setTotalCostInr(event.total_cost_inr);
    if (event.master_video_path) {
      setMasterVideo(event.master_video_path);
    }
    if (event.image_model && event.image_model !== imageModel) {
      setImageModel(event.image_model);
    }

    if (event.state === "complete" || event.master_video_path) {
      setRetentionScore(92.4);
      setSocialCopy({
        title: `${event.project_brief?.title || "Cinematic Masterpiece"} | Official 4K AI Visuals`,
        caption: `Produced autonomously using OmniStudio Agentic OS 5.0 with 22 specialized AI agents.\n\nCinematic Palette: ${style} | Audio: Neural Speech Dubbing`,
        hashtags: ["#OmniStudio", "#AIFilmmaking", "#GenerativeAI", "#CinematicAI", "#CreativeOS"],
      });
      setAbHookVariants([
        "Hook A: Atmospheric wide shot establishing tension and epic scale",
        "Hook B: Kinetic close-up tracking shot with rhythmic bass drop",
      ]);
    }

    if (event.agent_logs && Array.isArray(event.agent_logs)) {
      setActivityLogs(
        event.agent_logs.map((l: any) => ({
          timestamp: l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
          agent: l.agent?.toLowerCase().replace("agent", "") || "system",
          message: l.message,
          cost_usd: l.cost_usd,
          cost_inr: l.cost_inr,
          type: "info",
        }))
      );
    }

    const currentState = event.state as string;
    const pausedAfter = event.paused_after_state || (currentState === "paused" ? (choreographedScenes.some((s: any) => s.image_path) ? "generating_images" : "scripting") : null);

    if (currentState === "failed") {
      setLaunchError(event.error_message || "Agent execution encountered an error");
      setRunning(false);
      setApprovalModalOpen(false);
    } else if (currentState === "paused") {
      setPausedState(pausedAfter || "scripting");
      setApprovalModalOpen(true);
    } else {
      setApprovalModalOpen(false);
    }

    const effectiveState = currentState === "paused" && pausedAfter ? pausedAfter : currentState;
    const currentAgentId = STATE_TO_AGENT_ID[effectiveState];
    const currentIndex = currentAgentId ? AGENT_ORDER.indexOf(currentAgentId) : -1;

    setAgentStatuses((prev) => {
      const updated: Record<string, AgentNodeStatus> = { ...prev };
      if (currentState === "complete") {
        AGENT_ORDER.forEach((id) => {
          updated[id] = { state: "complete", message: "Completed successfully" };
        });
        const pId = event.pipeline_id || pipelineId;
        if (pId) {
          completeActiveJob(pId);
          try { localStorage.removeItem("omnistudio_pipeline_active_id"); } catch {}
        }
      } else if (currentState === "paused") {
        if (currentAgentId) {
          updated[currentAgentId] = { state: "paused", message: `Awaiting directorial approval (${pausedAfter?.toUpperCase() || "GATE"})` };
        }
      } else if (currentState === "failed") {
        if (currentAgentId) {
          updated[currentAgentId] = { state: "failed", message: event.error_message || "Agent execution failed" };
        }
        const pId = event.pipeline_id || pipelineId;
        if (pId) {
          completeActiveJob(pId);
          try { localStorage.removeItem("omnistudio_pipeline_active_id"); } catch {}
        }
      } else {
        AGENT_ORDER.forEach((id, idx) => {
          if (idx < currentIndex) {
            updated[id] = { state: "complete", message: "Completed" };
          } else if (idx === currentIndex) {
            updated[id] = { state: "running", message: "Synthesizing and executing..." };
          } else {
            updated[id] = { state: "pending", message: "In production queue" };
          }
        });
      }
      return updated;
    });
  }, [style, pipelineId]);

  const handleSSEEvent = useCallback((event: any) => {
    // Errors are always processed immediately
    if (event.error) {
      setActivityLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          agent: "system",
          message: `Pipeline Error: ${event.error}`,
          type: "error",
        },
      ]);
      return;
    }

    // Critical state changes (pause/complete) are flushed immediately
    const state = event.state as string;
    if (state === "paused" || state === "complete" || state === "failed") {
      pendingEventRef.current = event;
      if (sseThrottleRef.current) clearTimeout(sseThrottleRef.current);
      flushPendingEvent();
      return;
    }

    // All other events are throttled to 150ms batches to prevent scroll lag
    pendingEventRef.current = event;
    if (!sseThrottleRef.current) {
      sseThrottleRef.current = setTimeout(() => {
        sseThrottleRef.current = null;
        flushPendingEvent();
      }, 150);
    }
  }, [flushPendingEvent]);

  // Cleanup throttle timer on unmount
  useEffect(() => {
    return () => {
      if (sseThrottleRef.current) clearTimeout(sseThrottleRef.current);
    };
  }, []);

  // ── Auto Reconnect to Active Pipeline across Page Refreshes ──
  const reconnectAttemptedRef = useRef(false);
  useEffect(() => {
    if (reconnectAttemptedRef.current) return;
    reconnectAttemptedRef.current = true;

    const activeId = typeof window !== "undefined" ? localStorage.getItem("omnistudio_pipeline_active_id") : null;
    if (!activeId) return;

    let mounted = true;
    (async () => {
      try {
        const res = await api.getAgentPipelineStatus(activeId);
        if (!mounted) return;
        if (res && res.success && res.context) {
          const ctx = res.context;
          setPipelineId(activeId);
          if (ctx.user_prompt) setTopic(ctx.user_prompt);
          if (ctx.scenes && Array.isArray(ctx.scenes) && ctx.scenes.length > 0) {
            setChoreographedScenes(ctx.scenes);
          }
          if (ctx.master_video_path) setMasterVideo(ctx.master_video_path);
          if (ctx.image_model) setImageModel(ctx.image_model);
          if (ctx.style) setStyle(ctx.style);
          if (ctx.num_scenes) setScenes(ctx.num_scenes);

          if (ctx.agent_logs && Array.isArray(ctx.agent_logs)) {
            setActivityLogs(
              ctx.agent_logs.map((l: any) => ({
                timestamp: l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
                agent: l.agent?.toLowerCase().replace("agent", "") || "system",
                message: l.message,
                cost_usd: l.cost_usd,
                cost_inr: l.cost_inr,
                type: l.agent === "System" ? "system" : "action",
              }))
            );
          }

          if (ctx.state === "paused") {
            setRunning(false);
            setPausedState(ctx.state);
            setApprovalModalOpen(true);
            setShowDebugTelemetry(true);
          } else if (ctx.state !== "complete" && ctx.state !== "failed") {
            // Pipeline still actively generating: reconnect SSE stream immediately
            setRunning(true);
            setShowDebugTelemetry(true);
            startActiveJob(activeId, "pipeline", "/pipeline", `Autonomous Agent Pipeline: ${(ctx.user_prompt || topic).slice(0, 32)}...`);
            abortRef.current = new AbortController();
            api.streamAgentPipeline(activeId, handleSSEEvent, abortRef.current.signal)
              .finally(() => {
                if (mounted) setRunning(false);
              });
          } else if (ctx.state === "complete") {
            // Completed: mark all agents complete and keep scenes & screening room visible
            const completedStatuses: Record<string, AgentNodeStatus> = {};
            AGENT_ORDER.forEach((id) => {
              completedStatuses[id] = { state: "complete", message: "Completed successfully" };
            });
            setAgentStatuses(completedStatuses);
            completeActiveJob(activeId);
          } else if (ctx.state === "failed") {
            setRunning(false);
            setLaunchError(ctx.error_message || "Agent pipeline execution was interrupted or encountered an error.");
            setShowDebugTelemetry(true);
          } else {
            completeActiveJob(activeId);
            try { localStorage.removeItem("omnistudio_pipeline_active_id"); } catch {}
          }

        } else {
          try { localStorage.removeItem("omnistudio_pipeline_active_id"); } catch {}
        }
      } catch (e) {
        console.warn("Failed to reconnect to active pipeline:", e);
        try { localStorage.removeItem("omnistudio_pipeline_active_id"); } catch {}
      }
    })();

    return () => {
      mounted = false;
    };
  }, [handleSSEEvent, topic]);

  // Load available directorial skills on mount
  useEffect(() => {
    api.getSkills().then((res) => {
      if (Array.isArray(res)) {
        setAvailableSkills(res);
      }
    }).catch((err) => console.warn("Failed to fetch skills", err));
  }, []);

  const handleUploadSkill = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSkill(true);
    try {
      const res = await api.uploadSkill(file);
      if (res?.id) {
        setAvailableSkills((prev) => [...prev.filter((s) => s.id !== res.id), res]);
        setSelectedSkill(res.id);
      }
    } catch (err: any) {
      alert("Failed to upload skill: " + (err.message || "Invalid file format"));
    } finally {
      setUploadingSkill(false);
      if (skillFileInputRef.current) skillFileInputRef.current.value = "";
    }
  };

  const handleResumePipeline = async () => {
    if (!pipelineId) return;
    setLaunchError(null);
    setRunning(true);
    setShowDebugTelemetry(true);
    abortRef.current = new AbortController();
    try {
      await api.resumeAgentPipeline(pipelineId);
      startActiveJob(pipelineId, "pipeline", "/pipeline", `Resuming 22-Agent Pipeline...`);
      await api.streamAgentPipeline(pipelineId, handleSSEEvent, abortRef.current.signal);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setLaunchError(err.message || "Failed to resume pipeline");
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const handleLaunchAgency = async () => {
    if (!topic.trim()) {
      setLaunchError("Please enter a creative concept or prompt to launch the autonomous pipeline.");
      return;
    }
    const effectiveTopic = topic.trim();
    setLaunchError(null);
    setRunning(true);
    setShowDebugTelemetry(true);
    setMasterVideo(null);
    setChoreographedScenes([]);
    setActivityLogs([]);
    setSocialCopy(null);
    setRetentionScore(null);
    setAbHookVariants([]);
    setPublishStatus("idle");
    setApprovalModalOpen(false);

    // Initialize all 22 agents to pending
    const initialStatuses: Record<string, AgentNodeStatus> = {};
    ALL_22_AGENTS.forEach((a) => {
      initialStatuses[a.id] = { state: "pending" };
    });
    setAgentStatuses(initialStatuses);

    // Keep user in steady focus without disruptive viewport jumps

    abortRef.current = new AbortController();

    try {
      // 1. Start agent pipeline on backend
      const startRes = await api.startAgentPipeline({
        prompt: effectiveTopic,
        mode: agentMode,
        num_scenes: scenes,
        style,
        aspect_ratio: aspectRatio,
        image_model: imageModel,
        video_model: "omni_model",
        voice_provider: voiceProvider,
        apply_brand_kit: applyBrandKit,
        skill_id: selectedSkill !== "none" ? selectedSkill : undefined,
        reference_image: referenceImage || undefined,
      });

      if (!startRes?.success || !startRes?.pipeline_id) {
        throw new Error(startRes?.error || "Failed to initialize pipeline");
      }

      const pId = startRes.pipeline_id;
      setPipelineId(pId);
      try {
        localStorage.setItem("omnistudio_pipeline_active_id", pId);
        startActiveJob(pId, "pipeline", "/pipeline", `22-Agent Pipeline: ${effectiveTopic.slice(0, 32)}...`, {
          prompt: effectiveTopic,
          scenes,
          style,
        });
      } catch {}

      // 2. Stream real-time SSE progress (throttled to prevent scroll lag)
      await api.streamAgentPipeline(
        pId,
        handleSSEEvent,
        abortRef.current.signal
      );
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setLaunchError(err.message || "Pipeline execution failed");
        setActivityLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toLocaleTimeString(),
            agent: "system",
            message: `Pipeline halted: ${err.message}`,
            type: "error",
          },
        ]);
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const handleApproveStep = async () => {
    if (!pipelineId) return;
    setApprovingStep(true);
    try {
      await api.approveAgentStep(pipelineId);
      setApprovalModalOpen(false);
      setRunning(true);
      startActiveJob(pipelineId, "pipeline", "/pipeline", `22-Agent Pipeline: ${topic.slice(0, 32)}...`);
      await api.streamAgentPipeline(pipelineId, handleSSEEvent);
    } catch (e: any) {
      console.error("Failed to approve step:", e);
    } finally {
      setApprovingStep(false);
      setRunning(false);
    }
  };

  const handleRejectStep = async () => {
    if (!pipelineId) return;
    try {
      const feedback = directorialNotes.trim() || "Directorial revision: enhance camera movement, contrast and detail";
      setApprovalModalOpen(false);
      setRunning(true);
      await api.rejectAgentStep(pipelineId, feedback);
      startActiveJob(pipelineId, "pipeline", "/pipeline", `22-Agent Pipeline: ${topic.slice(0, 32)}...`);
      await api.streamAgentPipeline(pipelineId, handleSSEEvent);
    } catch (e: any) {
      console.error("Failed to reject step:", e);
    } finally {
      setRunning(false);
    }
  };

  const handleSwitchToFullAuto = async () => {
    setAgentMode("autonomous");
    await handleApproveStep();
  };

  const handleAbortPipeline = () => {
    if (abortRef.current) abortRef.current.abort();
    setRunning(false);
    setApprovalModalOpen(false);
    if (pipelineId) {
      completeActiveJob(pipelineId);
      try { localStorage.removeItem("omnistudio_pipeline_active_id"); } catch {}
      api.cancelAgentPipeline(pipelineId).catch(console.error);
    }
  };

  // Direct 1-Click Publishing across channels
  const handlePublishNow = async () => {
    if (!selectedPublishChannels.length) {
      alert("Please select at least one publishing channel");
      return;
    }
    setPublishStatus("publishing");
    setPublishMessage("Submitting release to selected social channels...");
    try {
      const title = socialCopy?.title || projectBrief?.title || "Cinematic Masterpiece";
      const content = `${title}\n\n${socialCopy?.caption || ""}\n\n${socialCopy?.hashtags?.join(" ") || ""}`;
      
      const res = await api.createPublishPost({
        title,
        content,
        platforms: selectedPublishChannels,
        media_type: "video",
        media_urls: masterVideo ? [masterVideo] : [],
      });

      if (res?.post?.id) {
        // Attempt immediate trigger
        try {
          await api.publishPostNow(res.post.id);
        } catch (_) {}
      }

      setPublishStatus("published");
      setPublishMessage(`Successfully queued and published across ${selectedPublishChannels.length} channels!`);
      setTimeout(() => {
        setPublishStatus("idle");
      }, 5000);
    } catch (err: any) {
      setPublishStatus("error");
      setPublishMessage(err?.message || "Failed to publish. Check connected social accounts.");
    }
  };

  const costPerScene = voiceProvider === "edge" ? 0.04 : 0.06;
  const estimatedCostUsd = costPerScene * scenes;
  const estimatedCostInr = Math.round(estimatedCostUsd * 83.5 * 100) / 100;

  // ── Render 4-Department Live Progress Bar (Clean, uncluttered) ──
  const renderDepartmentProgress = () => {
    // Only render progress box when the pipeline is actively running, paused for review, or just completed
    if (!running && !pausedState && !masterVideo) {
      return null;
    }

    return (
      <div className="p-5 rounded-3xl bg-emerald-500/[0.04] border border-emerald-500/20 space-y-4 animate-in fade-in duration-200">
        <div className="flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            {running ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            ) : pausedState ? (
              <Pause className="w-4 h-4 text-amber-500 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            )}
            <span className="font-bold text-zinc-900 dark:text-white">
              {agentMode === "autonomous" ? "Autonomous 22-Agent Flow Active" : "Directorial Review Pipeline Active"}
            </span>
          </div>
          <span className={cn(
            "font-bold",
            pausedState ? "text-amber-500" : running ? "text-emerald-600 dark:text-emerald-400" : "text-emerald-500"
          )}>
            {pausedState
              ? `Awaiting Sign-Off: ${pausedState.toUpperCase()}`
              : running
              ? "Synthesizing Pipeline"
              : "Master Video Ready"}
          </span>
        </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
        <div className="p-2.5 rounded-xl bg-white dark:bg-[#111118] border border-black/[0.06] dark:border-white/[0.06]">
          <p className="text-zinc-400 text-[9px] font-bold uppercase">Phase 1</p>
          <p className="font-bold text-zinc-800 dark:text-zinc-200">Creative & Script</p>
        </div>
        <div className="p-2.5 rounded-xl bg-white dark:bg-[#111118] border border-black/[0.06] dark:border-white/[0.06]">
          <p className="text-zinc-400 text-[9px] font-bold uppercase">Phase 2</p>
          <p className="font-bold text-zinc-800 dark:text-zinc-200">Diffusion & Visuals</p>
        </div>
        <div className="p-2.5 rounded-xl bg-white dark:bg-[#111118] border border-black/[0.06] dark:border-white/[0.06]">
          <p className="text-zinc-400 text-[9px] font-bold uppercase">Phase 3</p>
          <p className="font-bold text-zinc-800 dark:text-zinc-200">Audio & Dubbing</p>
        </div>
        <div className="p-2.5 rounded-xl bg-white dark:bg-[#111118] border border-black/[0.06] dark:border-white/[0.06]">
          <p className="text-zinc-400 text-[9px] font-bold uppercase">Phase 4</p>
          <p className="font-bold text-zinc-800 dark:text-zinc-200">Master & Release</p>
        </div>
      </div>
    </div>
  );
};

  // ── Render Directive Desk Form (Prompt + Specs + Launch) ──
  const renderDirectiveForm = (mode: "autonomous" | "assisted") => (
    <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl p-6 sm:p-7 shadow-xs space-y-6 relative overflow-hidden">
      {/* Subtle Ambient Accent */}
      <div className={cn(
        "absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none",
        mode === "autonomous" ? "bg-emerald-500/[0.03]" : "bg-violet-500/[0.03]"
      )} />

      {/* Section Header */}
      <div className="flex items-center justify-between font-mono pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", mode === "autonomous" ? "bg-emerald-500" : "bg-violet-500")} />
          <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">
            {mode === "autonomous" ? "01 • AUTONOMOUS CREATIVE DIRECTIVE" : "01 • DIRECTORIAL CREATIVE DIRECTIVE"}
          </span>
        </div>
        <span className={cn("text-[10px] font-bold", mode === "autonomous" ? "text-emerald-600 dark:text-emerald-400" : "text-violet-600 dark:text-violet-400")}>
          {mode === "autonomous" ? "Autonomous 22-agent execution" : "Directorial review popups enabled"}
        </span>
      </div>

      {/* Prominent Error & Resume Banner */}
      {launchError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <div>
              <p className="font-bold text-zinc-900 dark:text-white">Pipeline Execution Status</p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-mono">{launchError}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {pipelineId && (
              <button
                type="button"
                onClick={handleResumePipeline}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resume Pipeline from Interrupted Agent</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setLaunchError(null)}
              className="px-3 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300 rounded-xl font-mono text-xs cursor-pointer transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Master Prompt Input Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-zinc-500">
            Describe characters, setting, lighting, mood, camera style, or commercial goal:
          </span>
          <div className="flex items-center gap-2">
            {topic.trim() && (
              <button
                type="button"
                onClick={() => setTopic("")}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer px-2 py-0.5 rounded"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={enhancePrompt}
              disabled={enhancing || !topic.trim()}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-all cursor-pointer border",
                enhancing
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse"
                  : mode === "autonomous"
                  ? "bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 disabled:opacity-40"
                  : "bg-violet-500/10 hover:bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30 disabled:opacity-40"
              )}
            >
              <Wand2 className={cn("w-3 h-3", enhancing && "animate-spin")} />
              <span>{enhancing ? "ENHANCING..." : "DIRECTORIAL POLISH"}</span>
            </button>
          </div>
        </div>

        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" && e.ctrlKey) || (e.key === "Enter" && e.metaKey)) {
              e.preventDefault();
              handleLaunchAgency();
            }
          }}
          placeholder={
            mode === "autonomous"
              ? "E.g. Create an ultra-luxury commercial for an emerald jewelry collection featuring an elegant protagonist walking through a grand moonlit palace with flowing silks..."
              : "E.g. Formulate a cinematic sci-fi documentary with multiple acts, dramatic rim lighting, and orchestral soundtrack..."
          }
          rows={3}
          className={cn(
            "w-full min-h-[110px] bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-4 text-sm text-zinc-950 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all font-jakarta leading-relaxed",
            running && "ring-2 ring-emerald-500/30 border-emerald-500/50"
          )}
        />

        {/* Model Directives in Prompt */}
        <div className="pt-2 flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
          <span className="text-zinc-500 flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            Specify Model in Prompt:
          </span>
          {[
            { label: "Flux.1 Pro", text: "using Flux.1 Pro" },
            { label: "Imagen 3", text: "using Google Imagen 3" },
            { label: "GPT Image 2", text: "using GPT Image 2" },
            { label: "Gemini Flash", text: "using Gemini Flash" },
          ].map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() => {
                setTopic((prev) => {
                  const base = prev.replace(/\s*\(using [^)]+\)/gi, "").trim();
                  return base ? `${base} (${m.text})` : m.text;
                });
              }}
              className="text-[9px] px-2 py-0.5 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold transition cursor-pointer hover:border-emerald-500/40"
            >
              +{m.label}
            </button>
          ))}
          <span className="text-[9px] text-zinc-400 dark:text-zinc-500 hidden sm:inline ml-1">
            (Agent auto-detects model from prompt)
          </span>
        </div>

        {/* Quick Inspiration Concept Chips */}
        <div className="pt-1.5 flex flex-wrap items-center gap-2 font-mono">
          <span className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold shrink-0">
            QUICK CONCEPTS:
          </span>
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              title={p.text}
              onClick={() => setTopic(p.text)}
              className="text-[10px] px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-white/[0.03] hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-400/40 transition-all cursor-pointer flex items-center gap-1.5 group"
            >
              <span className="font-bold text-emerald-500 shrink-0">[{p.genre}]</span>
              <span className="truncate max-w-[220px] sm:max-w-[280px] md:max-w-[340px] text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200">{p.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 1-ROW PRODUCTION SPECIFICATIONS BAR ── */}
      <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Scene Timeline */}
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
            <label className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">
              SCENE TIMELINE
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setScenes(num)}
                  className={cn(
                    "py-1.5 rounded-lg text-center font-mono transition-all cursor-pointer",
                    scenes === num
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs"
                      : "bg-white dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs"
                  )}
                >
                  <span className="text-xs">{num}</span>
                </button>
              ))}
            </div>
            <div className="text-[9px] font-mono text-zinc-400 text-center">
              ~{scenes * 5}s runtime • {scenes} keyframes
            </div>
          </div>

          {/* 2. Aspect Ratio */}
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
            <label className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">
              ASPECT RATIO
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: "16:9", label: "16:9", desc: "Cinema" },
                { id: "9:16", label: "9:16", desc: "Shorts" },
                { id: "1:1", label: "1:1", desc: "Feed" },
              ].map((ar) => (
                <button
                  key={ar.id}
                  type="button"
                  onClick={() => setAspectRatio(ar.id)}
                  className={cn(
                    "py-1.5 rounded-lg text-center transition-all cursor-pointer",
                    aspectRatio === ar.id
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs"
                      : "bg-white dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 text-xs"
                  )}
                >
                  <span className="text-xs block font-bold font-mono">{ar.label}</span>
                  <span className="text-[8px] opacity-70 block">{ar.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Diffusion Engine */}
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between font-mono">
              <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block">
                DIFFUSION ENGINE
              </label>
              <div className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{DIFFUSION_MODELS.find((m) => m.id === imageModel)?.badge || "READY"}</span>
              </div>
            </div>
            <Dropdown
              options={DIFFUSION_MODELS.map((m) => ({
                value: m.id,
                label: m.name,
                badge: m.badge,
                description: `${m.provider} • ${m.description}`,
                active: m.active,
              }))}
              value={imageModel}
              onChange={(v) => setImageModel(v)}
              size="sm"
              openDirection="up"
              triggerClassName="rounded-xl border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#101420] text-xs py-2 shadow-xs"
              menuClassName="bg-white/95 dark:bg-[#0c101d]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/10"
            />
            {imageModel === "auto" && (
              <div className="p-2.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 text-[10px] text-emerald-800 dark:text-emerald-300 space-y-1.5 leading-relaxed animate-in fade-in duration-150">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Auto Diffusion Engine:</span> Creative Director Agent detects prompt keywords (e.g. <i>"flux pro"</i>, <i>"imagen 3"</i>, <i>"gpt image 2"</i>) or dynamically selects the optimal diffusion model based on your visual style.
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-1 border-t border-emerald-500/20 text-[9px] font-mono text-emerald-700 dark:text-emerald-300">
                  <Film className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>Auto Video Engine: <strong className="text-emerald-800 dark:text-emerald-200">Omni Video Model</strong> (Neural Kinematics & Temporal Coherence)</span>
                </div>
              </div>
            )}
          </div>

          {/* 3b. Directorial Skill & Cinematic Style Pack */}
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between font-mono">
              <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block">
                DIRECTORIAL SKILL
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="file"
                  ref={skillFileInputRef}
                  onChange={handleUploadSkill}
                  accept=".json,.yaml,.yml"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => skillFileInputRef.current?.click()}
                  disabled={uploadingSkill}
                  title="Upload custom .json or .yaml skill configuration"
                  className="text-[9px] font-mono text-amber-500 hover:text-amber-400 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 cursor-pointer transition-all"
                >
                  <Upload className="w-2.5 h-2.5" />
                  <span>{uploadingSkill ? "Uploading..." : "+ Upload Skill"}</span>
                </button>
              </div>
            </div>
            <ModernSelect
              value={selectedSkill}
              onChange={(val) => setSelectedSkill(val)}
              options={[
                { value: "none", label: "None (Pure Prompt Directives)" },
                ...availableSkills.map((s) => ({
                  value: s.id,
                  label: s.name,
                  description: s.description,
                  badge: s.is_builtin ? "BUILTIN" : s.category?.toUpperCase(),
                })),
              ]}
              searchable
            />
            {selectedSkill !== "none" && (
              <div className="p-2.5 rounded-xl bg-amber-500/[0.05] border border-amber-500/20 text-[10px] space-y-1 text-zinc-700 dark:text-zinc-300 animate-in fade-in duration-150">
                <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between">
                  <span>{availableSkills.find((s) => s.id === selectedSkill)?.name}</span>
                  <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300">
                    {availableSkills.find((s) => s.id === selectedSkill)?.category?.toUpperCase()}
                  </span>
                </div>
                <div className="text-[9px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  {availableSkills.find((s) => s.id === selectedSkill)?.description}
                </div>
              </div>
            )}
          </div>

          {/* 4. Neural Voice Provider */}
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
            <label className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">
              NEURAL SPEECH DUB
            </label>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setVoiceProvider("sarvam")}
                className={cn(
                  "py-1.5 px-2 rounded-lg text-left transition-all cursor-pointer",
                  voiceProvider === "sarvam"
                    ? "bg-violet-600 text-white dark:bg-violet-500 font-bold shadow-xs"
                    : "bg-white dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400"
                )}
              >
                <span className="text-[11px] block font-bold">Sarvam Indic</span>
                <span className="text-[8px] font-mono text-violet-400 dark:text-violet-300 block">Hindi & Indic</span>
              </button>
              <button
                type="button"
                onClick={() => setVoiceProvider("edge")}
                className={cn(
                  "py-1.5 px-2 rounded-lg text-left transition-all cursor-pointer",
                  voiceProvider === "edge"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs"
                    : "bg-white dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400"
                )}
              >
                <span className="text-[11px] block font-bold">Edge Neural</span>
                <span className="text-[8px] font-mono text-emerald-500 block">Instant Free</span>
              </button>
              <button
                type="button"
                onClick={() => setVoiceProvider("elevenlabs")}
                className={cn(
                  "py-1.5 px-2 rounded-lg text-left transition-all cursor-pointer",
                  voiceProvider === "elevenlabs"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs"
                    : "bg-white dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400"
                )}
              >
                <span className="text-[11px] block font-bold">ElevenLabs</span>
                <span className="text-[8px] font-mono text-zinc-400 block">Studio Voice</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Kit Intelligence Switch */}
      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center border transition-all shrink-0",
            applyBrandKit
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500 shadow-xs"
              : "bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-400"
          )}>
            <Shield className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-heading text-zinc-900 dark:text-white">
                Brand Kit Intelligence
              </span>
              <span className={cn(
                "text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border",
                applyBrandKit
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 border-zinc-300 dark:border-zinc-700"
              )}>
                {applyBrandKit ? "ON • ENFORCING" : "OFF • BYPASSED"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
              {applyBrandKit
                ? "Active brand profile guidelines, color harmony, typography, and negative filters will be enforced."
                : "Bypassed: The pipeline will use pure raw prompt aesthetics without brand constraints."}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          onClick={() => setApplyBrandKit(!applyBrandKit)}
          className={cn(
            "w-12 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none shrink-0",
            applyBrandKit ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
          )}
          title={`Click to turn Brand Kit ${applyBrandKit ? "OFF" : "ON"}`}
        >
          <span
            className={cn(
              "w-4 h-4 rounded-full bg-white block transition-transform absolute top-1 shadow-sm",
              applyBrandKit ? "left-7" : "left-1"
            )}
          />
        </button>
      </div>

      {/* Optional Advanced Director Accordion */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[11px] font-mono text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
        >
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{showAdvanced ? "Hide" : "Show"} Advanced Directorial Controls (Reference Image & Cinematography Palette)</span>
        </button>

        {showAdvanced && (
          <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-black/[0.04] dark:border-white/[0.04] animate-in fade-in duration-200">
            {/* Visual Reference Anchor */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
              <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">
                VISUAL STYLE & CHARACTER REFERENCE ANCHOR
              </label>
              {referenceImage ? (
                <div className="flex items-center gap-3 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <img src={getMediaUrl(referenceImage)} alt="Reference" className="w-12 h-12 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-bold truncate">{referenceImage.split("/").pop()}</p>
                    <p className="text-[9px] font-mono text-emerald-500">Active Visual Anchor</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReferenceImage("")}
                    className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => refFileInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 bg-white dark:bg-zinc-900/50 p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1"
                >
                  <input
                    ref={refFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleRefUpload(e.target.files[0])}
                  />
                  {uploadingRef ? (
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                  ) : (
                    <Upload className="w-5 h-5 text-zinc-400" />
                  )}
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {uploadingRef ? "Uploading..." : "Upload Character or Style Reference"}
                  </span>
                </div>
              )}
            </div>

            {/* Aesthetic Preset Selector */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
              <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">
                CINEMATOGRAPHY PALETTE
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-[110px] overflow-y-auto custom-scrollbar">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyle(s.id)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-xl border text-left transition-all cursor-pointer",
                      style === s.id
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold border-zinc-900 dark:border-white shadow-xs"
                        : "bg-white dark:bg-zinc-900 border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300"
                    )}
                  >
                    <span className="text-xs block font-bold">{s.label}</span>
                    <span className="text-[8px] font-mono opacity-70 block truncate">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Launch Command Bar */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-center gap-3 font-mono text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Clock className={cn("w-3.5 h-3.5", mode === "autonomous" ? "text-emerald-500" : "text-violet-500")} />
            Est. Time: ~{scenes * 6}s
          </span>
          <span>•</span>
          <span>
            Est. Cost: <strong className="text-zinc-900 dark:text-white">₹{estimatedCostInr}</strong> (${estimatedCostUsd.toFixed(2)})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {running && (
            <button
              type="button"
              onClick={handleAbortPipeline}
              className="px-4 py-3 rounded-2xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-mono text-xs font-bold transition-all cursor-pointer"
            >
              Abort Agents
            </button>
          )}

          <button
            type="button"
            onClick={handleLaunchAgency}
            disabled={running}
            className={cn(
              "px-8 py-3.5 rounded-2xl font-heading font-extrabold text-sm tracking-tight flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50 text-white",
              mode === "autonomous"
                ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400"
                : "bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400"
            )}
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>22 AGENTS EXECUTING PRODUCTION...</span>
              </>
            ) : (
              <span>
                {mode === "autonomous"
                  ? "Launch Autonomous 22-Agent Pipeline"
                  : "Launch Directorial Review Pipeline"}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Render Collapsible 22-Agent Architecture & Telemetry ──
  const renderTelemetrySection = () => {
    const agentEntries = Object.entries(agentStatuses);
    const completedCount = agentEntries.filter(([_, s]) => s.state === "complete").length;
    const runningAgent = agentEntries.find(([_, s]) => s.state === "running");
    const activeAgentObj = runningAgent ? ALL_22_AGENTS.find((a) => a.id === runningAgent[0]) : null;
    const progressPercent = Math.min(
      99,
      Math.max(
        running ? 6 : 0,
        Math.round((completedCount / 22) * 100) + (runningAgent ? 3 : 0)
      )
    );
    const isTelemetryOpen = showDebugTelemetry || running;

    return (
      <div ref={studioRef} className="pt-2 space-y-4">
        {/* Launch Error Banner */}
        {launchError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-mono flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{launchError}</span>
            </div>
            <button
              type="button"
              onClick={() => handleLaunchAgency()}
              className="px-3 py-1 bg-rose-500 text-white rounded-lg font-bold text-[10px] hover:bg-rose-600 cursor-pointer shadow"
            >
              Retry Launch
            </button>
          </div>
        )}

        {/* Real-time 22-Agent Production Progress Bar */}
        {running && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <LiveProgressBar
              progress={masterVideo ? 100 : progressPercent}
              stageTitle={
                activeAgentObj
                  ? `[${completedCount + 1}/22] ${activeAgentObj.departmentId.toUpperCase()} • ${activeAgentObj.name.toUpperCase()}`
                  : "22-AGENT AUTONOMOUS PRODUCTION RUNTIME"
              }
              statusMessage={
                activeAgentObj
                  ? `${activeAgentObj.name} (${activeAgentObj.shortName}) executing production tasks...`
                  : "Executing multi-agent choreographed film pipeline..."
              }
              isActive={true}
              showTerminal={false}
              className="border border-emerald-500/30 bg-emerald-500/[0.03] shadow-xl shadow-emerald-500/10"
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowDebugTelemetry(!isTelemetryOpen)}
          className="w-full py-3 px-4 rounded-2xl bg-zinc-100 dark:bg-white/[0.03] hover:bg-zinc-200 dark:hover:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-500" />
            <span className="font-bold">
              {isTelemetryOpen ? "Hide" : "Inspect"} 22 Specialized Agents Architecture & Live Telemetry Stream
            </span>
          </div>
          {isTelemetryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isTelemetryOpen && (
          <div className="mt-4 space-y-5 p-5 rounded-3xl bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] animate-in fade-in">
          {/* Formulated Project Brief Card (If Created by Director) */}
          {projectBrief && (
            <div className="p-4 rounded-2xl bg-violet-500/[0.04] border border-violet-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  Creative Director Project Brief Formulated
                </span>
                {projectBrief.genre && (
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold">
                    {projectBrief.genre}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
                <div><span className="text-zinc-400">Title:</span> <strong className="text-zinc-900 dark:text-zinc-100 block truncate">{projectBrief.title || "Untitled"}</strong></div>
                <div><span className="text-zinc-400">Mood:</span> <strong className="text-zinc-900 dark:text-zinc-100 block truncate">{projectBrief.mood || "Cinematic"}</strong></div>
                <div><span className="text-zinc-400">Target:</span> <strong className="text-zinc-900 dark:text-zinc-100 block truncate">{projectBrief.target_audience || "Global"}</strong></div>
                <div><span className="text-zinc-400">Diffusion:</span> <strong className="text-zinc-900 dark:text-zinc-100 block truncate">{projectBrief.diffusion_model || projectBrief.visual_style || style}</strong></div>
                <div><span className="text-zinc-400">Video Engine:</span> <strong className="text-emerald-600 dark:text-emerald-400 block truncate">{projectBrief.video_model || "Omni Video Model"}</strong></div>
              </div>
            </div>
          )}

          {/* 4-Department Flowchart */}
          <div className="p-3 sm:p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06]">
            <AgentFlowChart
              agentStatuses={agentStatuses}
              onAgentClick={(id) => setExpandedAgent(id === expandedAgent ? null : id)}
              selectedAgentId={expandedAgent}
            />
          </div>

          {/* Expanded Agent Telemetry Card */}
          {expandedAgent && (
            <AgentCard
              agentId={expandedAgent}
              status={agentStatuses[expandedAgent] || { state: "pending" }}
              output={
                expandedAgent === "creative_director" ? projectBrief :
                expandedAgent === "script_writer" ? { scenes: choreographedScenes } :
                expandedAgent === "brand_intelligence" ? projectBrief?.brand_kit :
                expandedAgent === "image_generator" ? { scenes: choreographedScenes } :
                expandedAgent === "video_generator" ? { scenes: choreographedScenes } :
                expandedAgent === "voice_director" ? { scenes: choreographedScenes } :
                undefined
              }
              expanded={true}
              onToggle={() => setExpandedAgent(null)}
              onApprove={handleApproveStep}
              onReject={handleRejectStep}
              mode={agentMode}
            />
          )}

          {/* Live Studio Split: Activity Logs & Scene Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Real-time Telemetry Logs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">
                  REAL-TIME AGENT TELEMETRY STREAM
                </span>
                <span className="text-[9px] text-zinc-400">
                  {activityLogs.length} events logged
                </span>
              </div>
              <PipelineActivityLog
                logs={activityLogs}
                totalCostUsd={totalCostUsd}
                totalCostInr={totalCostInr}
                maxHeight="320px"
              />
            </div>

            {/* Choreographed Scene Gallery */}
            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">
                  CHOREOGRAPHED SCENE ARTIFACTS ({choreographedScenes.length})
                </span>
                <span className="text-[9px] text-zinc-400">
                  {choreographedScenes.filter((s) => s.video_path || s.image_path).length} rendered
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] max-h-[320px] overflow-y-auto custom-scrollbar">
                <SceneReviewGrid scenes={choreographedScenes} compact={true} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    );
  };

  // ── Render Master Screening Room & Omnichannel Distribution ──
  const renderPublishingHub = () => {
    if (!masterVideo && !choreographedScenes.some((s) => s.video_path || s.image_path)) {
      return null;
    }
    return (
      <div ref={screeningRef} className="scroll-mt-6 space-y-6 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-[#0d0d14] border border-emerald-500/20 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">
                MASTER SCREENING & OMNICHANNEL PUBLISHING LAUNCHPAD
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              Master 4K Compilation Complete
            </span>
          </div>

          {/* Video Player Showcase */}
          {masterVideo && (
            <div className="aspect-video max-w-3xl mx-auto rounded-2xl overflow-hidden bg-black shadow-xl relative group">
              <video
                src={getMediaUrl(masterVideo)}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Executive Master Action Row */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {masterVideo && (
              <a
                href={getMediaUrl(masterVideo)}
                download
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download MP4 Master</span>
              </a>
            )}

            <a
              href="/video"
              className="px-5 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-zinc-800 dark:text-zinc-200 font-mono font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Film className="w-4 h-4" />
              <span>Open in Video Studio</span>
            </a>
          </div>

          {/* ── INTEGRATED SOCIAL PUBLISHING SECTION ── */}
          <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                  OMNICHANNEL PUBLISHER (PUBLISHING AGENT INTEGRATION)
                </span>
              </div>
              <span className="text-[10px] text-zinc-400">
                Direct 1-Click Release across connected accounts
              </span>
            </div>

            {/* Social Channels Selection Checkboxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {SOCIAL_PLATFORMS.map((plat) => {
                const isSelected = selectedPublishChannels.includes(plat.id);
                return (
                  <button
                    key={plat.id}
                    type="button"
                    onClick={() => {
                      setSelectedPublishChannels((prev) =>
                        isSelected ? prev.filter((p) => p !== plat.id) : [...prev, plat.id]
                      );
                    }}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs",
                      isSelected
                        ? `bg-white dark:bg-[#151520] ${plat.border} ring-1 ${plat.border}`
                        : "bg-white dark:bg-white/[0.03] border-black/[0.06] dark:border-white/[0.06] text-zinc-500 opacity-60 hover:opacity-100"
                    )}
                  >
                    <span className={cn("text-xs font-bold font-heading truncate", isSelected ? plat.color : "text-zinc-600 dark:text-zinc-400")}>
                      {plat.name}
                    </span>
                    <div className={cn(
                      "w-4 h-4 rounded-md border flex items-center justify-center shrink-0",
                      isSelected ? "bg-emerald-500 border-emerald-500 text-white" : "border-zinc-300 dark:border-zinc-700"
                    )}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Publish Action & Status Banner */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-black/[0.04] dark:border-white/[0.04]">
              <div className="text-xs font-mono text-zinc-500">
                {publishMessage ? (
                  <span className={cn(
                    "flex items-center gap-1.5 font-bold",
                    publishStatus === "published" ? "text-emerald-500" : publishStatus === "error" ? "text-rose-500" : "text-zinc-400"
                  )}>
                    {publishStatus === "published" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    <span>{publishMessage}</span>
                  </span>
                ) : (
                  <span>Ready to distribute master cut to {selectedPublishChannels.length} channels</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/publish"
                  className="px-4 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-mono font-bold hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  Open Publish Studio
                </a>

                <button
                  type="button"
                  onClick={handlePublishNow}
                  disabled={publishStatus === "publishing" || !selectedPublishChannels.length}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-heading font-extrabold flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {publishStatus === "publishing" ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Publishing to Channels...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Publish Now Across {selectedPublishChannels.length} Channels</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Post-Production Insights & Social Copy Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
            {/* 1. AI Social Copy */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-zinc-500">
                  <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>SEO SOCIAL COPY</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (socialCopy) {
                      navigator.clipboard.writeText(`${socialCopy.title}\n\n${socialCopy.caption}\n\n${socialCopy.hashtags?.join(" ")}`);
                      setCopiedCopy(true);
                      setTimeout(() => setCopiedCopy(false), 2000);
                    }
                  }}
                  className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedCopy ? "Copied!" : "Copy"}</span>
                </button>
              </div>
              {socialCopy ? (
                <div className="space-y-1.5 text-xs font-jakarta">
                  <p className="font-bold text-zinc-900 dark:text-white line-clamp-1">{socialCopy.title}</p>
                  <p className="text-[11px] text-zinc-500 line-clamp-3">{socialCopy.caption}</p>
                  <div className="flex flex-wrap gap-1 pt-1 font-mono text-[9px] text-emerald-600 dark:text-emerald-400">
                    {socialCopy.hashtags?.map((t, i) => (
                      <span key={i}>{t}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 font-mono">Social copy synthesizing...</p>
              )}
            </div>

            {/* 2. Predictive Audience Retention */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-zinc-500">
                <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
                <span>PREDICTIVE AUDIENCE ENGAGEMENT</span>
              </div>
              {retentionScore !== null ? (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold font-heading text-zinc-950 dark:text-white">{retentionScore}%</span>
                    <span className="text-[10px] font-mono text-emerald-500 font-bold">Top 5% Viral Potential</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${retentionScore}%` }} />
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Fast visual pacing and high contrast lighting optimize scroll-stop retention.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 font-mono">Calculating audience retention...</p>
              )}
            </div>

            {/* 3. A/B Hook Variants */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-zinc-500">
                <GitCompare className="w-3.5 h-3.5 text-rose-500" />
                <span>A/B HOOK VARIATIONS</span>
              </div>
              {abHookVariants.length > 0 ? (
                <div className="space-y-1.5 text-[11px] font-mono">
                  {abHookVariants.map((v, i) => (
                    <div key={i} className="p-1.5 rounded-lg bg-white dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.04] text-zinc-700 dark:text-zinc-300">
                      {v}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 font-mono">Formulating A/B hook variants...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-20 font-jakarta max-w-7xl mx-auto">
      {/* ── TOP EXECUTIVE BAR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.06] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.25em] text-zinc-500 uppercase">
            <span className="text-emerald-500 font-bold">OMNISTUDIO OS 5.0</span>
            <span>•</span>
            <span>AUTONOMOUS CREATIVE AGENCY</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight">
              Creative Operating System
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>22 SPECIALIZED AGENTS ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Top Action Bar */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-zinc-100 dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", agentMode === "autonomous" ? "bg-emerald-500" : "bg-violet-500")} />
            <span className="font-bold uppercase text-[11px]">
              {agentMode === "autonomous" ? "Autonomous Tab Active" : "Directorial Gates Active"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setHistoryOpen(true);
              loadHistory();
            }}
            className="px-3 py-1.5 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-zinc-100 dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/[0.08] hover:border-emerald-500/40 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="View Past Autonomous Runs"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-bold uppercase text-[11px]">Production History</span>
          </button>
          {(topic || masterVideo || choreographedScenes.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setTopic("");
                setMasterVideo(null);
                setChoreographedScenes([]);
                setActivityLogs([]);
                setSocialCopy(null);
                setPausedState(null);
              }}
              className="px-3 py-1.5 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:text-rose-500 hover:border-rose-500/30 transition-colors cursor-pointer"
              title="Reset Workspace"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── 2-MODE TAB SELECTOR (AUTONOMOUS VS DIRECTORIAL REVIEW) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Autonomous Mode */}
        <div
          onClick={() => setAgentMode("autonomous")}
          className={cn(
            "p-5 rounded-3xl border text-left transition-all cursor-pointer relative overflow-hidden group",
            agentMode === "autonomous"
              ? "bg-emerald-500/[0.04] border-emerald-500/40 ring-1 ring-emerald-500/30 shadow-md"
              : "bg-white dark:bg-[#0d0d14] border-black/[0.08] dark:border-white/[0.08] hover:border-zinc-400 dark:hover:border-zinc-600"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className={cn("w-4 h-4", agentMode === "autonomous" ? "text-emerald-500" : "text-zinc-400")} />
              <span className="text-xs font-heading font-extrabold uppercase tracking-wider text-zinc-900 dark:text-white">
                Autonomous Mode
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              Autopilot (Zero Popups)
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            All 22 agents execute sequentially and autonomously from creative brief to master compilation without waiting for manual confirmation.
          </p>
        </div>

        {/* Card 2: Assisted Mode */}
        <div
          onClick={() => setAgentMode("assisted")}
          className={cn(
            "p-5 rounded-3xl border text-left transition-all cursor-pointer relative overflow-hidden group",
            agentMode === "assisted"
              ? "bg-violet-500/[0.04] border-violet-500/40 ring-1 ring-violet-500/30 shadow-md"
              : "bg-white dark:bg-[#0d0d14] border-black/[0.08] dark:border-white/[0.08] hover:border-zinc-400 dark:hover:border-zinc-600"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sliders className={cn("w-4 h-4", agentMode === "assisted" ? "text-violet-500" : "text-zinc-400")} />
              <span className="text-xs font-heading font-extrabold uppercase tracking-wider text-zinc-900 dark:text-white">
                Directorial Review Mode
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold">
              Milestone Popups
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Pauses at key creative milestones (Screenplay dialogues and Keyframe images) for your directorial approval before proceeding to video generation.
          </p>
        </div>
      </div>

      {/* Main Directive Desk Form */}
      {agentMode === "autonomous" ? (
        <div className="space-y-6">
          {renderDepartmentProgress()}
          {renderDirectiveForm("autonomous")}
          {renderTelemetrySection()}
          {renderPublishingHub()}
        </div>
      ) : (
        <div className="space-y-6">
          {renderDepartmentProgress()}
          {renderDirectiveForm("assisted")}

          {/* Milestone Approval Alert (when paused) */}
          {pausedState && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
                <div>
                  <p className="text-xs font-bold text-zinc-950 dark:text-white">
                    Directorial Sign-Off Required: {pausedState.toUpperCase()}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    {pausedState === "generating_images" 
                      ? "Keyframe images generated. Review visuals and approve to begin video synthesis."
                      : "Screenplay and dialogues drafted. Review scripts and approve to begin image diffusion."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovalModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-heading font-bold transition-all cursor-pointer shrink-0 shadow-xs"
              >
                Open Approval Popup
              </button>
            </div>
          )}

          {renderTelemetrySection()}
          {renderPublishingHub()}
        </div>
      )}

      {/* ── DIRECTORIAL APPROVAL MODAL POPUP (WHEN PAUSED AT AN APPROVAL GATE) ── */}
      {approvalModalOpen && (
        <div className="fixed inset-0 z-[100000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111118] border border-black/[0.1] dark:border-white/[0.1] rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-heading font-extrabold text-zinc-950 dark:text-white">
                    {pausedState === "generating_images"
                      ? "Keyframe Images Review — Approve Video Synthesis"
                      : "Screenplay & Dialogue Review — Approve Keyframe Diffusion"}
                  </h3>
                  <p className="text-[10px] font-mono text-zinc-500">
                    Milestone Gate: {pausedState?.toUpperCase() || "REVIEW GATE"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovalModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Artifacts Preview (Images or Screenplay) */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
              {/* If paused after generating_images: Show Keyframe Images Grid */}
              {pausedState === "generating_images" && choreographedScenes.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-zinc-500 block">
                    Generated Keyframe Visuals ({choreographedScenes.length} Images)
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    {choreographedScenes.map((sc, i) => (
                      <div key={i} className="p-2.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] space-y-1.5">
                        <div className="aspect-video rounded-xl overflow-hidden bg-black/10 dark:bg-zinc-900 relative">
                          {sc.image_path ? (
                            <img
                              src={getMediaUrl(sc.image_path)}
                              alt={sc.title || `Scene ${i + 1}`}
                              className="w-full h-full object-cover"
                              loading="eager"
                              onError={(e) => {
                                // Fallback if image failed to load
                                const target = e.currentTarget;
                                target.style.display = "none";
                                const parent = target.parentElement;
                                if (parent && !parent.querySelector(".img-fallback")) {
                                  const fallback = document.createElement("div");
                                  fallback.className = "img-fallback w-full h-full flex flex-col items-center justify-center p-2 text-center text-[10px] font-mono text-zinc-400 bg-zinc-900";
                                  fallback.innerText = "Keyframe Ready (Click to inspect)";
                                  parent.appendChild(fallback);
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400 font-mono">Visual Rendering...</div>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-900 dark:text-white">
                          <span>{sc.title || `Scene ${i + 1}`}</span>
                          <span className="text-[9px] font-mono text-emerald-500">{sc.duration_seconds || 4}s</span>
                        </div>
                        {sc.script && (
                          <p className="text-[10px] text-zinc-500 line-clamp-2 italic font-serif">"{sc.script}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* If paused after scripting: Show Screenplay Dialogues */}
              {pausedState === "scripting" && choreographedScenes.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-zinc-500 block">
                    Screenplay & Narration Dialogues ({choreographedScenes.length} Scenes)
                  </span>
                  <div className="space-y-2">
                    {choreographedScenes.map((sc, i) => (
                      <div key={i} className="p-3 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">{sc.title || `Scene ${i + 1}`}</span>
                          <span className="text-[10px] font-mono text-emerald-500">{sc.duration_seconds || 4}s</span>
                        </div>
                        <p className="text-xs font-serif italic text-zinc-800 dark:text-zinc-200">"{sc.script}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Directorial Feedback Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase font-bold text-zinc-500 block">
                Directorial Notes / Revisions (Optional)
              </label>
              <input
                type="text"
                value={directorialNotes}
                onChange={(e) => setDirectorialNotes(e.target.value)}
                placeholder="E.g. Slow down camera movement in scene 2, make lighting more dramatic..."
                className="w-full bg-zinc-50 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500 font-jakarta"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
              <button
                type="button"
                onClick={handleSwitchToFullAuto}
                className="text-[11px] font-mono text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                Skip Popups & Run Full Auto
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleRejectStep}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-heading font-bold transition-all cursor-pointer"
                >
                  Reject & Redo
                </button>

                <button
                  type="button"
                  onClick={handleApproveStep}
                  disabled={approvingStep}
                  className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {approvingStep ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Resuming...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{pausedState === "generating_images" ? "Approve & Synthesize Video" : "Approve & Generate Visuals"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUCTION HISTORY MODAL ── */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="w-full max-w-5xl xl:max-w-6xl max-h-[88vh] m-auto bg-white dark:bg-[#0e0e16] border border-black/[0.1] dark:border-white/[0.1] rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-heading font-extrabold text-zinc-950 dark:text-white">
                    Production History & Archives
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Review and restore past autonomous and directorial pipeline runs from omnistudio.db
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-rose-500/20"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>

            {/* Modal Content / List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
              {loadingHistory ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-500">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  <span className="text-xs font-mono">Fetching pipeline runs from database...</span>
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 space-y-2">
                  <Film className="w-8 h-8 mx-auto text-zinc-400" />
                  <p className="text-sm font-bold">No past production runs found</p>
                  <p className="text-xs text-zinc-400">Launch an autonomous or directorial run to populate this archive.</p>
                </div>
              ) : (
                historyList.map((item) => {
                  const isComp = item.state === "complete";
                  const isRun = item.state === "running" || item.state === "generating_images" || item.state === "generating_videos";
                  const isFail = item.state === "failed";
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full font-bold uppercase relative overflow-hidden",
                            isComp ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" :
                            isRun ? "bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-cyan-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/40 shadow-sm" :
                            isFail ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30" :
                            "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          )}>
                            {isRun && (
                              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                <div className="absolute inset-y-0 w-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-flash-sweep" />
                              </div>
                            )}
                            {item.state}
                          </span>
                          <span className="text-zinc-400">
                            {item.created_at ? new Date(item.created_at).toLocaleString() : item.id}
                          </span>
                          <span>•</span>
                          <span className="text-zinc-500 font-bold uppercase">{item.mode || "autonomous"}</span>
                          <span>•</span>
                          <span className="text-zinc-500">{item.num_scenes || 3} scenes</span>
                          {item.total_cost_usd > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-500 font-bold">
                                ${item.total_cost_usd.toFixed(3)} (~₹{item.total_cost_inr?.toFixed(2) || (item.total_cost_usd * 83.5).toFixed(2)})
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white line-clamp-2 leading-relaxed">
                          &ldquo;{item.user_prompt}&rdquo;
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.master_video_path && (
                          <a
                            href={getMediaUrl(item.master_video_path)}
                            download
                            className="px-3 py-2 rounded-xl bg-zinc-200 dark:bg-white/[0.06] hover:bg-zinc-300 dark:hover:bg-white/[0.1] text-zinc-800 dark:text-zinc-200 font-mono text-xs font-bold transition-all flex items-center gap-1.5"
                            title="Download Master Video"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">MP4</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRestoreFromHistory(item)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Load in Studio</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PipelinePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      }
    >
      <PipelineContent />
    </Suspense>
  );
}
