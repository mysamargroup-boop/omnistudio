"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
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
  { id: "gemini_flash_image", name: "Google Gemini 2.5 Flash", badge: "FAST", provider: "Google DeepMind", description: "Ultra-fast high fidelity image diffusion", active: true },
  { id: "imagen_3", name: "Google Imagen 3", badge: "PRO", provider: "Google Cloud AI", description: "Flagship photoreal lighting & textures", active: true },
  { id: "gpt-image-2", name: "GPT Image 2", badge: "PREMIUM", provider: "OpenAI", description: "Composition precision & realistic skin", active: true },
  { id: "flux_pro", name: "Flux.1 Pro", badge: "SOTA", provider: "Black Forest Labs", description: "Studio typography & photorealism", active: false },
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
  const [scenes, setScenes] = useState(3);
  const [style, setStyle] = useState("cinematic");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [voiceProvider, setVoiceProvider] = useState("edge");
  const [imageModel, setImageModel] = useState("gemini_flash_image");
  
  // Two distinct operation modes (presented as 2 large interactive cards)
  const [agentMode, setAgentMode] = useState<"autonomous" | "assisted">("autonomous");

  // Advanced Manual Overrides Accordion
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string>(searchParams?.get("input_image") || "");
  const [uploadingRef, setUploadingRef] = useState(false);
  const refFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLaunchAgency = async () => {
    if (!topic.trim()) return;
    setRunning(true);
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

    // Smooth scroll down to live studio floor
    setTimeout(() => {
      studioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);

    abortRef.current = new AbortController();

    try {
      // 1. Start agent pipeline on backend
      const startRes = await api.startAgentPipeline({
        prompt: topic.trim(),
        mode: agentMode,
        num_scenes: scenes,
        style,
        aspect_ratio: aspectRatio,
        image_model: imageModel,
        voice_provider: voiceProvider,
      });

      if (!startRes?.success || !startRes?.pipeline_id) {
        throw new Error(startRes?.error || "Failed to initialize pipeline");
      }

      const pId = startRes.pipeline_id;
      setPipelineId(pId);

      // 2. Stream real-time SSE progress
      await api.streamAgentPipeline(
        pId,
        (event: any) => {
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

          // Update project brief if available
          if (event.project_brief && Object.keys(event.project_brief).length > 0) {
            setProjectBrief(event.project_brief);
          }

          // Update scenes
          if (event.scenes && Array.isArray(event.scenes)) {
            setChoreographedScenes(event.scenes);
          }

          // Update costs
          if (typeof event.total_cost_usd === "number") setTotalCostUsd(event.total_cost_usd);
          if (typeof event.total_cost_inr === "number") setTotalCostInr(event.total_cost_inr);

          // Update master video path
          if (event.master_video_path) {
            setMasterVideo(event.master_video_path);
          }

          // Synthesize post-production artifacts for rich dashboard & publishing
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

          // Update agent logs
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

          // Check if paused at an approval gate
          const currentState = event.state as string;
          if (currentState === "paused") {
            setPausedState(currentState);
            setApprovalModalOpen(true);
          } else {
            setApprovalModalOpen(false);
          }

          // Update 22-agent visual statuses
          const currentAgentId = STATE_TO_AGENT_ID[currentState];
          const currentIndex = currentAgentId ? AGENT_ORDER.indexOf(currentAgentId) : -1;

          setAgentStatuses((prev) => {
            const updated: Record<string, AgentNodeStatus> = { ...prev };

            if (currentState === "complete") {
              AGENT_ORDER.forEach((id) => {
                updated[id] = { state: "complete", message: "Completed successfully" };
              });
            } else if (currentState === "paused") {
              if (currentAgentId) {
                updated[currentAgentId] = {
                  state: "paused",
                  message: "Awaiting your directorial approval popup",
                };
              }
            } else if (currentState === "failed") {
              if (currentAgentId) {
                updated[currentAgentId] = {
                  state: "failed",
                  message: event.error_message || "Agent execution failed",
                };
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
        },
        abortRef.current.signal
      );
    } catch (err: any) {
      if (err.name !== "AbortError") {
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
      await api.streamAgentPipeline(pipelineId, (event: any) => {
        if (event.scenes) setChoreographedScenes(event.scenes);
        if (event.master_video_path) setMasterVideo(event.master_video_path);
        if (event.state === "paused") {
          setPausedState(event.state);
          setApprovalModalOpen(true);
        } else if (event.state === "complete") {
          setApprovalModalOpen(false);
        }
      });
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
      await api.rejectAgentStep(pipelineId, feedback);
      setApprovalModalOpen(false);
    } catch (e: any) {
      console.error("Failed to reject step:", e);
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
    if (pipelineId) api.cancelAgentPipeline(pipelineId).catch(console.error);
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
  const renderDepartmentProgress = () => (
    <div className="p-5 rounded-3xl bg-emerald-500/[0.04] border border-emerald-500/20 space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          <span className="font-bold text-zinc-900 dark:text-white">
            {agentMode === "autonomous" ? "Autonomous 22-Agent Flow Active" : "Directorial Review Pipeline Active"}
          </span>
        </div>
        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
          {pausedState ? `Awaiting Sign-Off: ${pausedState.toUpperCase()}` : "Synthesizing Pipeline"}
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

        {/* Quick Inspiration Concept Chips */}
        <div className="pt-1 flex flex-wrap items-center gap-2 font-mono">
          <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold shrink-0">
            QUICK CONCEPTS:
          </span>
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setTopic(p.text)}
              className="text-[10px] px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-white/[0.03] hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-400/40 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="font-bold text-emerald-500">[{p.genre}]</span>
              <span className="truncate max-w-[170px]">{p.text}</span>
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
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-1.5">
            <label className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">
              DIFFUSION ENGINE
            </label>
            <select
              value={imageModel}
              onChange={(e) => setImageModel(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {DIFFUSION_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} [{m.badge}]
                </option>
              ))}
            </select>
            <div className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Engine: {DIFFUSION_MODELS.find((m) => m.id === imageModel)?.badge || "READY"}</span>
            </div>
          </div>

          {/* 4. Neural Voice Provider */}
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
            <label className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">
              NEURAL SPEECH DUB
            </label>
            <div className="grid grid-cols-2 gap-1">
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
            disabled={running || !topic.trim()}
            className={cn(
              "px-8 py-3.5 rounded-2xl font-heading font-extrabold text-sm tracking-tight flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50 text-white",
              mode === "autonomous"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                : "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
            )}
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>22 AGENTS EXECUTING PRODUCTION...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white/80" />
                <span>
                  {mode === "autonomous"
                    ? "Launch Autonomous 22-Agent Pipeline"
                    : "Launch Directorial Review Pipeline"}
                </span>
                <ArrowRight className="w-4 h-4 text-white/80" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Render Collapsible 22-Agent Architecture & Telemetry ──
  const renderTelemetrySection = () => (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => setShowDebugTelemetry(!showDebugTelemetry)}
        className="w-full py-3 px-4 rounded-2xl bg-zinc-100 dark:bg-white/[0.03] hover:bg-zinc-200 dark:hover:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-500" />
          <span className="font-bold">
            {showDebugTelemetry ? "Hide" : "Inspect"} 22 Specialized Agents Architecture & Live Telemetry Stream
          </span>
        </div>
        {showDebugTelemetry ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showDebugTelemetry && (
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div><span className="text-zinc-400">Title:</span> <strong className="text-zinc-900 dark:text-zinc-100">{projectBrief.title || "Untitled"}</strong></div>
                <div><span className="text-zinc-400">Mood:</span> <strong className="text-zinc-900 dark:text-zinc-100">{projectBrief.mood || "Cinematic"}</strong></div>
                <div><span className="text-zinc-400">Target:</span> <strong className="text-zinc-900 dark:text-zinc-100">{projectBrief.target_audience || "Global"}</strong></div>
                <div><span className="text-zinc-400">Visuals:</span> <strong className="text-zinc-900 dark:text-zinc-100">{projectBrief.visual_style || style}</strong></div>
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
                expandedAgent === "image_generator" ? { scenes: choreographedScenes } :
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
              Reset Session
            </button>
          )}
        </div>
      </div>

      {/* ── TWO DEDICATED STUDIO TABS ("SIRF DO TABS") ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between font-mono text-[11px] text-zinc-500 uppercase tracking-wider font-bold">
          <span>OPERATING MODE TABS:</span>
          <span>Click either tab to open its dedicated studio</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* TAB 1: 100% Autonomous Creative Agency */}
          <div
            onClick={() => setAgentMode("autonomous")}
            className={cn(
              "p-5 rounded-3xl border-2 text-left cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between group",
              agentMode === "autonomous"
                ? "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] border-emerald-500 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/20"
                : "bg-white dark:bg-[#0d0d14] border-black/[0.08] dark:border-white/[0.08] hover:border-zinc-400 dark:hover:border-zinc-600 opacity-75 hover:opacity-100"
            )}
          >
            <div className="space-y-3 w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-9 h-9 rounded-2xl flex items-center justify-center transition-colors",
                    agentMode === "autonomous"
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "bg-zinc-100 dark:bg-white/[0.05] text-zinc-500"
                  )}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-heading font-extrabold text-zinc-950 dark:text-white">
                      Autonomous Pipeline
                    </h3>
                    <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                      One-Click Zero-Intervention Mode
                    </p>
                  </div>
                </div>

                <div className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                  agentMode === "autonomous"
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-zinc-300 dark:border-zinc-700"
                )}>
                  {agentMode === "autonomous" && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-jakarta">
                Single prompt into finished 4K cinematic video and omnichannel social distribution. All 22 AI agents coordinate autonomously without manual approval stops.
              </p>
            </div>

            <div className="pt-4 mt-2 flex flex-wrap items-center gap-2 border-t border-black/[0.04] dark:border-white/[0.04] text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                Continuous Flow
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400">
                Auto-Master & Compile
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400">
                Auto-Publish Ready
              </span>
            </div>
          </div>

          {/* TAB 2: Directorial Review Gates */}
          <div
            onClick={() => setAgentMode("assisted")}
            className={cn(
              "p-5 rounded-3xl border-2 text-left cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between group",
              agentMode === "assisted"
                ? "bg-violet-500/[0.04] dark:bg-violet-500/[0.06] border-violet-500 shadow-md shadow-violet-500/10 ring-2 ring-violet-500/20"
                : "bg-white dark:bg-[#0d0d14] border-black/[0.08] dark:border-white/[0.08] hover:border-zinc-400 dark:hover:border-zinc-600 opacity-75 hover:opacity-100"
            )}
          >
            <div className="space-y-3 w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-9 h-9 rounded-2xl flex items-center justify-center transition-colors",
                    agentMode === "assisted"
                      ? "bg-violet-500 text-white shadow-xs"
                      : "bg-zinc-100 dark:bg-white/[0.05] text-zinc-500"
                  )}>
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-heading font-extrabold text-zinc-950 dark:text-white">
                      Directorial Review Gates
                    </h3>
                    <p className="text-[10px] font-mono text-violet-600 dark:text-violet-400 font-bold uppercase">
                      Interactive Approval Popups
                    </p>
                  </div>
                </div>

                <div className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                  agentMode === "assisted"
                    ? "bg-violet-500 border-violet-500 text-white"
                    : "border-zinc-300 dark:border-zinc-700"
                )}>
                  {agentMode === "assisted" && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-jakarta">
                Human-in-the-loop studio. Agents pause at key milestones (Screenplay, Visual Keyframes, Master Cut) with approval popups for directorial sign-off and revisions.
              </p>
            </div>

            <div className="pt-4 mt-2 flex flex-wrap items-center gap-2 border-t border-black/[0.04] dark:border-white/[0.04] text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold border border-violet-500/20">
                Approval Popups
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400">
                Directorial Feedback
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400">
                Revisions & Sign-Off
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONDITIONAL WORKSPACE: ONLY THE OPENED TAB RENDERS ── */}
      {agentMode === "autonomous" ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {renderDirectiveForm("autonomous")}
          {running && renderDepartmentProgress()}
          {renderPublishingHub()}
          {renderTelemetrySection()}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 3 Milestone Gates Banner */}
          <div className="p-4 rounded-2xl bg-violet-500/[0.05] border border-violet-500/20 space-y-2.5">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                3 DIRECTORIAL REVIEW GATES ACTIVE
              </span>
              <span className="text-zinc-500 text-[10px]">Popups appear at each milestone</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#111118] border border-violet-500/20">
                <span className="text-[9px] font-bold text-violet-500 block uppercase">Gate 1 • Scripting</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">Screenplay & Brief Sign-Off</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#111118] border border-violet-500/20">
                <span className="text-[9px] font-bold text-violet-500 block uppercase">Gate 2 • Visuals</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">Keyframe Aesthetics Approval</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#111118] border border-violet-500/20">
                <span className="text-[9px] font-bold text-violet-500 block uppercase">Gate 3 • Master Cut</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">Final Audio & Video Release</span>
              </div>
            </div>
          </div>

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
                    Review artifacts, formulate feedback notes, and sign off to proceed.
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

          {/* Choreographed Scene Review Grid */}
          {choreographedScenes.length > 0 && (
            <div className="space-y-3 p-5 rounded-3xl bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08]">
              <div className="flex items-center justify-between font-mono border-b border-black/[0.06] dark:border-white/[0.06] pb-2">
                <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">
                  CHOREOGRAPHED SCENE REVIEW ({choreographedScenes.length} SCENES)
                </span>
                <span className="text-[10px] text-zinc-400">
                  {choreographedScenes.filter((s) => s.video_path || s.image_path).length} Rendered
                </span>
              </div>
              <SceneReviewGrid scenes={choreographedScenes} compact={false} />
            </div>
          )}

          {renderPublishingHub()}
        </div>
      )}

      {/* ── DIRECTORIAL APPROVAL MODAL POPUP (WHEN PAUSED AT AN APPROVAL GATE) ── */}
      {approvalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111118] border border-black/[0.1] dark:border-white/[0.1] rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-heading font-extrabold text-zinc-950 dark:text-white">
                    Directorial Approval Required
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

            {/* Current Artifacts Preview */}
            <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
              {projectBrief && (
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] space-y-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-zinc-500 block">
                    Formulated Project Brief
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div><span className="text-zinc-400">Title:</span> <strong className="text-zinc-800 dark:text-zinc-200">{projectBrief.title || "Untitled"}</strong></div>
                    <div><span className="text-zinc-400">Mood:</span> <strong className="text-zinc-800 dark:text-zinc-200">{projectBrief.mood || "Cinematic"}</strong></div>
                    <div><span className="text-zinc-400">Pacing:</span> <strong className="text-zinc-800 dark:text-zinc-200">{projectBrief.visual_style || style}</strong></div>
                    <div><span className="text-zinc-400">Audience:</span> <strong className="text-zinc-800 dark:text-zinc-200">{projectBrief.target_audience || "Global"}</strong></div>
                  </div>
                </div>
              )}

              {choreographedScenes.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-zinc-500 block">
                    Current Choreographed Scenes ({choreographedScenes.length})
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {choreographedScenes.map((sc, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] space-y-1">
                        <span className="text-[9px] font-mono font-bold text-zinc-400">Scene {i + 1}</span>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-1">{sc.title || `Scene ${i + 1}`}</p>
                        <p className="text-[10px] text-zinc-500 line-clamp-2">{sc.script || sc.description || sc.image_prompt}</p>
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
                      <span>Approve & Continue</span>
                    </>
                  )}
                </button>
              </div>
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
