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
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import Dropdown from "@/components/ui/Dropdown";
import StepCards from "@/components/StepCards";
import GenerationConfirmModal, { GenerationConfirmDetails } from "@/components/ui/GenerationConfirmModal";
import LiveProgressBar, { LogEntry } from "@/components/ui/LiveProgressBar";
import VideoEditorModal from "@/components/video/VideoEditorModal";

const PHASES = [
  { id: 1, label: "01 • Script", desc: "Storyboard Director", icon: Layers },
  { id: 2, label: "02 • Diffusion", desc: "Visual Sampler", icon: ImageIcon },
  { id: 3, label: "03 • Dynamics", desc: "Camera Vector Engine", icon: Video },
  { id: 4, label: "04 • Narration", desc: "Neural Speech Sync", icon: Mic },
  { id: 5, label: "05 • Master", desc: "FFmpeg MP4 Compiler", icon: Film },
];

const PRESETS = [
  { genre: "Cyberpunk", text: "Cyberpunk detective uncovering an AI conspiracy in rainy neon Neo-Tokyo with flying spinner cruisers" },
  { genre: "Sci-Fi", text: "Deep space expedition finding an ancient alien monolith orbiting Jupiter with planetary rings glowing" },
  { genre: "Historical", text: "Ancient samurai meditating beside a mountain temple beneath falling pink cherry blossoms at dusk" },
  { genre: "Action", text: "Futuristic Formula-1 hypercar race navigating orbital glass loop tracks suspended above a neon megacity" },
  { genre: "Fantasy", text: "Mythic dragon soaring over misty Scandinavian fjords with auroras dancing across the midnight sky" },
];

interface PipelineModelOption {
  id: string;
  name: string;
  badge: string;
  provider: string;
  description: string;
  active?: boolean;
}

const PIPELINE_IMAGE_MODELS: PipelineModelOption[] = [
  { id: "gemini_flash_image", name: "Gemini Flash 2.0", badge: "FAST", provider: "Google DeepMind", description: "Sub-second photo diffusion", active: false },
  { id: "imagen_3", name: "Google Imagen 3", badge: "PRO", provider: "Google Cloud AI", description: "Photoreal lighting & textures", active: false },
  { id: "gpt-image-2", name: "GPT Image 2", badge: "PREMIUM", provider: "OpenAI", description: "4K Composition precision", active: false },
  { id: "dall-e-3", name: "OpenAI DALL-E 3", badge: "HD", provider: "OpenAI", description: "High prompt adherence", active: false },
  { id: "flux-schnell", name: "FLUX.1 Schnell", badge: "FAST", provider: "Replicate", description: "Rapid latent diffusion", active: false },
  { id: "flux_dev", name: "FLUX.1 Dev", badge: "DEV", provider: "Replicate", description: "Studio guidance coherence", active: false },
];

const STYLES = [
  { id: "cinematic", label: "Cinematic 35mm", desc: "Arri Alexa • Volumetric Lighting" },
  { id: "cyberpunk", label: "Cyberpunk Noir", desc: "Vibrant Neon • Rainy Reflections" },
  { id: "anime", label: "Anime Ghibli", desc: "Painterly Skies • Luminous Color" },
  { id: "3d_pixar", label: "3D Animation", desc: "Subsurface Glow • Stylized CGI" },
  { id: "photoreal", label: "Photoreal 8K", desc: "Hasselblad Sharp • Natural Sunlight" },
];

function PipelineContent() {
  const searchParams = useSearchParams();
  const [topic, setTopic] = useState(searchParams?.get("topic") || "");
  const [scenes, setScenes] = useState(2);
  const [style, setStyle] = useState("cinematic");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [voiceProvider, setVoiceProvider] = useState("edge");
  const [imageModel, setImageModel] = useState("gemini_flash_image");
  const [availableModels, setAvailableModels] = useState<PipelineModelOption[]>(PIPELINE_IMAGE_MODELS);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [pipelineMode, setPipelineMode] = useState<"auto" | "director">("auto");
  const [imagePrompt, setImagePrompt] = useState("");
  const [motionPrompt, setMotionPrompt] = useState("Slow cinematic push-in zoom with gentle pan right");
  const [voiceScript, setVoiceScript] = useState("");
  const [draftingPrompts, setDraftingPrompts] = useState(false);

  // Smooth Scrolling Section Refs
  const deskRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Precision Video Editor Modal State
  const [editVideoAsset, setEditVideoAsset] = useState<{ url: string; filename: string } | null>(null);

  // Real-Time Live Progress Bar States
  const [progress, setProgress] = useState(0);
  const [stageTitle, setStageTitle] = useState("DIRECTOR INITIALIZATION");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [telemetryLogs, setTelemetryLogs] = useState<LogEntry[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Smooth scroll helper methods
  const scrollToDesk = () => deskRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const scrollToStage = () => stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const scrollToResult = () => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Fetch live active models based on user API keys
  useEffect(() => {
    api.getImageModels()
      .then((data: any) => {
        if (data && data.models && Array.isArray(data.models)) {
          const activeMap = new Map<string, boolean>(
            data.models.map((m: { id: string; active?: boolean }) => [m.id, Boolean(m.active)])
          );
          setAvailableModels((prev) =>
            prev.map((m) => ({
              ...m,
              active: activeMap.has(m.id) ? Boolean(activeMap.get(m.id)) : false,
            }))
          );
        }
      })
      .catch((err) => console.warn("Failed to fetch image models for pipeline:", err));
  }, []);

  // Unmount cleanup for timers and active streaming connection
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, []);

  // Safeguard Confirmation Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState<GenerationConfirmDetails | null>(null);

  const handleDraftPrompts = async () => {
    const promptIdea = topic.trim() || "Cinematic sci-fi explorer discovering a lost alien civilization";
    setDraftingPrompts(true);
    try {
      const res = await api.draftPipelinePrompts({ topic: promptIdea, style });
      if (res && res.image_prompt) {
        setImagePrompt(res.image_prompt);
        setMotionPrompt(res.motion_prompt || "Slow cinematic push-in zoom with gentle pan right");
        setVoiceScript(res.voice_script || "");
      }
    } catch (err: any) {
      console.error("Failed to draft prompts:", err);
      setImagePrompt(`${promptIdea}, 35mm anamorphic cinematography, volumetric fog, dramatic rim lighting, cinematic 8k masterpiece`);
      setMotionPrompt("Slow cinematic push-in zoom with gentle pan right");
      setVoiceScript("In the silence of the cosmos, the forgotten mysteries of the past finally begin to reveal themselves.");
    } finally {
      setDraftingPrompts(false);
    }
  };

  const requestPipelineConfirm = () => {
    const mainPrompt = pipelineMode === "director" ? (imagePrompt.trim() || topic.trim()) : topic.trim();
    if (!mainPrompt) return;
    const isEdge = voiceProvider === "edge";
    const costPerScene = isEdge ? 0.04 : 0.06;
    const costUsd = costPerScene * scenes;
    const costInr = Math.round(costUsd * 83.5 * 100) / 100;
    const currentModelObj = availableModels.find((m) => m.id === imageModel);
    const modelDisplayName = currentModelObj ? currentModelObj.name : imageModel;

    setConfirmDetails({
      serviceType: "pipeline",
      modelName: `${modelDisplayName} (${scenes} Scenes)`,
      provider: isEdge ? `${modelDisplayName} + Edge Neural + FFmpeg` : `${modelDisplayName} + ElevenLabs + FFmpeg`,
      isFree: false,
      costUsd,
      costInr,
      prompt: mainPrompt,
      specs: {
        mode: pipelineMode === "director" ? "Director Multi-Prompt Mode" : "Auto Storyboard",
        sceneCount: `${scenes} Scenes`,
        aspectRatio,
        style,
        speechEngine: isEdge ? "Edge Neural (Free)" : "ElevenLabs",
        motionDynamics: "FFmpeg Camera Vectors (Local/Free)",
      },
    });
    setConfirmModalOpen(true);
  };

  useEffect(() => {
    const qTopic = searchParams?.get("topic");
    if (qTopic) setTopic(qTopic);
  }, [searchParams]);

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
            `${prev.trim()}, 35mm anamorphic cinematography, volumetric fog, dramatic rim lighting, dynamic three-act visual pacing, cinematic 8k masterpiece`
        );
      }
    } catch (_) {
      setTopic(
        (prev) =>
          `${prev.trim()}, 35mm anamorphic cinematography, volumetric fog, dramatic rim lighting, dynamic three-act visual pacing, cinematic 8k masterpiece`
      );
    } finally {
      setEnhancing(false);
    }
  };

  const run = async () => {
    const mainTopic = pipelineMode === "director" ? (imagePrompt.trim() || topic.trim()) : topic.trim();
    if (!mainTopic) return;
    setLoading(true);
    setResult(null);
    setProgress(5);
    setCurrentStep(0);
    setStageTitle("01 • Initializing Autonomous Agent");
    setStatusText(pipelineMode === "director" ? "Executing custom directorial stage prompts..." : "Drafting screenplay & scene visual compositions...");
    setElapsedSeconds(0);
    // Smooth scroll down to live production stage
    setTimeout(() => {
      stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    const nowTime = new Date().toTimeString().split(" ")[0];
    setTelemetryLogs([
      { timestamp: nowTime, message: `Initialized Autonomous Cinema Pipeline for: "${mainTopic.slice(0, 45)}..."` }
    ]);

    const startTimestamp = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimestamp) / 1000));
    }, 1000);

    abortRef.current = new AbortController();

    try {
      const streamResult = await api.runPipelineStream({
        topic: mainTopic,
        num_scenes: scenes,
        style,
        image_model: imageModel,
        aspect_ratio: aspectRatio,
        voice_provider: voiceProvider,
        enhance_prompts: pipelineMode !== "director",
        image_prompt: pipelineMode === "director" ? imagePrompt.trim() : undefined,
        motion_prompt: pipelineMode === "director" ? motionPrompt.trim() : undefined,
        voice_script: pipelineMode === "director" ? voiceScript.trim() : undefined,
      }, (event: any) => {
        if (typeof event.progress === "number") {
          setProgress(event.progress);
        }
        if (typeof event.step === "number" && event.step >= 0) {
          setCurrentStep(event.step);
        }
        if (event.message) {
          setStatusText(event.message);
          setTelemetryLogs((prev) => [
            ...prev,
            {
              timestamp: event.timestamp || new Date().toTimeString().split(" ")[0],
              message: event.message,
              stage: event.stage
            }
          ]);
        }
        if (event.stage) {
          if (event.stage.includes("storyboard")) setStageTitle("01 • Screenplay Directive");
          else if (event.stage.includes("visual")) setStageTitle(`02 • Visual Diffusion (Scene ${event.scene || 1})`);
          else if (event.stage.includes("motion")) setStageTitle(`03 • Camera Kinematics (Scene ${event.scene || 1})`);
          else if (event.stage.includes("voice")) setStageTitle(`04 • Neural Narration (Scene ${event.scene || 1})`);
          else if (event.stage.includes("merge")) setStageTitle(`05 • Audio-Video Sync (Scene ${event.scene || 1})`);
          else if (event.stage.includes("master")) setStageTitle("06 • Master FFmpeg Compilation");
          else if (event.stage.includes("subtitles")) setStageTitle("07 • Synchronizing Subtitles");
          else if (event.stage.includes("cloud_sync")) setStageTitle("08 • Supabase & Vault Sync");
          else if (event.stage.includes("complete")) setStageTitle("09 • Render Complete");
        }
      }, abortRef.current.signal);

      if (streamResult) {
        setResult(streamResult);
        setProgress(100);
        setCurrentStep(5);
        setStageTitle("CINEMA MASTERPIECE COMPILED");
        setStatusText("Production compilation completed successfully.");
        // Smooth scroll to the master video player
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 250);
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        setStatusText("Pipeline compilation cancelled.");
        setCurrentStep(-1);
        setProgress(0);
        setTelemetryLogs((prev) => [
          ...prev,
          { timestamp: new Date().toTimeString().split(" ")[0], message: "Pipeline execution cancelled by user." }
        ]);
      } else {
        setResult({ success: false, error: e.message });
        setStatusText("Pipeline compilation error");
        setTelemetryLogs((prev) => [
          ...prev,
          { timestamp: new Date().toTimeString().split(" ")[0], message: `Error: ${e.message}` }
        ]);
      }
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      abortRef.current = null;
      setLoading(false);
    }
  };

  const isEdge = voiceProvider === "edge";
  const costPerScene = isEdge ? 0.04 : 0.06;
  const costUsd = costPerScene * scenes;
  const costInr = Math.round(costUsd * 83.5 * 100) / 100;

  return (
    <div className="space-y-8 pb-16 tab-content-enter font-jakarta">
      {/* Top Header & Smooth-Scroll Navigation Dock */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.06] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.25em] text-zinc-500 uppercase">
            <span className="text-emerald-500 font-bold">CINEMA STUDIO 5.0</span>
            <span>•</span>
            <span>AUTONOMOUS PIPELINE DIRECTOR</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight">
            Autonomous Cinema Agent
          </h1>
        </div>

        {/* Quick Smooth-Scroll Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] text-xs font-mono">
          <button
            type="button"
            onClick={scrollToDesk}
            className="px-3 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 transition-all cursor-pointer"
          >
            01 • Director Desk
          </button>
          <button
            type="button"
            onClick={scrollToStage}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer",
              loading
                ? "bg-emerald-600 text-white font-bold animate-pulse shadow-sm"
                : "text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800"
            )}
          >
            {loading && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
            <span>02 • Production Stage</span>
          </button>
          {result && result.success && (
            <button
              type="button"
              onClick={scrollToResult}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold transition-all cursor-pointer shadow-sm"
            >
              03 • Master Screening
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: DIRECTOR DESK (Configuration & Screenplay Input) */}
      <div ref={deskRef} className="scroll-mt-6 space-y-6">
        <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
          {/* Subtle decorative background ambient glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-6 relative z-10">
            {/* ── TOP PART: PRODUCTION CONTROLS MATRIX (Boxes on Top) ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between font-mono pb-1 border-b border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <label className="text-[11px] text-zinc-700 dark:text-zinc-300 uppercase tracking-widest font-bold">
                    01 • PRODUCTION SPECIFICATIONS & ENGINE DYNAMICS
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Scene Timeline */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-2.5">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 block font-bold">
                    SCENE TIMELINE
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { num: 2, label: "2 Scenes", desc: "~10s Teaser" },
                      { num: 3, label: "3 Scenes", desc: "~15s Short" },
                      { num: 4, label: "4 Scenes", desc: "~20s Cinema" },
                      { num: 5, label: "5 Scenes", desc: "~25s Feature" },
                    ].map((item) => (
                      <button
                        key={item.num}
                        type="button"
                        onClick={() => setScenes(item.num)}
                        className={cn(
                          "p-2 rounded-xl border text-center transition-all cursor-pointer",
                          scenes === item.num
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold border-zinc-900 dark:border-white shadow-xs"
                            : "bg-white dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
                        )}
                      >
                        <span className="text-xs font-bold font-heading block">{item.label}</span>
                        <span className="text-[8px] font-mono opacity-80 block">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Visual Diffusion Engine (with dynamic active API green badges) */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 block font-bold">
                      DIFFUSION ENGINE
                    </label>
                    <span className="text-[9px] font-mono text-zinc-400">
                      {availableModels.filter((m) => m.active).length} Active
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-0.5">
                    {availableModels.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setImageModel(m.id)}
                        className={cn(
                          "w-full px-2.5 py-1.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer",
                          imageModel === m.id
                            ? "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500 text-zinc-950 dark:text-white shadow-xs"
                            : "bg-white dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
                        )}
                      >
                        <div className="min-w-0">
                          <span className="text-[11px] font-semibold block truncate">{m.name}</span>
                          <span className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500 block truncate">
                            {m.description}
                          </span>
                        </div>

                        <div className="shrink-0 flex items-center gap-1">
                          {m.active ? (
                            <span className="inline-flex items-center gap-1 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700/60 font-medium">
                              KEY REQ
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Aesthetic Style */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-2.5">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 block font-bold">
                    AESTHETIC STYLE
                  </label>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-0.5">
                    {STYLES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStyle(s.id)}
                        className={cn(
                          "w-full px-2.5 py-1.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer",
                          style === s.id
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold border-zinc-900 dark:border-white shadow-xs"
                            : "bg-white dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
                        )}
                      >
                        <span className="text-[11px] font-semibold">{s.label}</span>
                        <span className="text-[8px] font-mono opacity-70 truncate max-w-[100px]">{s.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Aspect Ratio & Speech Engine */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 block font-bold mb-1.5">
                      ASPECT RATIO
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: "16:9", label: "16:9", desc: "Cinema" },
                        { id: "9:16", label: "9:16", desc: "Shorts" },
                        { id: "1:1", label: "1:1", desc: "Square" },
                      ].map((ar) => (
                        <button
                          key={ar.id}
                          type="button"
                          onClick={() => setAspectRatio(ar.id)}
                          className={cn(
                            "py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer",
                            aspectRatio === ar.id
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold border-zinc-900 dark:border-white shadow-xs"
                              : "bg-white dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                          )}
                        >
                          <span className="text-[10px] font-bold block">{ar.label}</span>
                          <span className="text-[8px] font-mono opacity-70 block">{ar.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 block font-bold mb-1.5">
                      NEURAL SPEECH ENGINE
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setVoiceProvider("edge")}
                        className={cn(
                          "p-2 rounded-xl border text-left transition-all cursor-pointer",
                          voiceProvider === "edge"
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold border-zinc-900 dark:border-white shadow-xs"
                            : "bg-white dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                        )}
                      >
                        <span className="text-[11px] font-bold block">Edge Neural</span>
                        <span className="text-[8px] font-mono text-emerald-500 block font-semibold">
                          Free / Instant
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoiceProvider("elevenlabs")}
                        className={cn(
                          "p-2 rounded-xl border text-left transition-all cursor-pointer",
                          voiceProvider === "elevenlabs"
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold border-zinc-900 dark:border-white shadow-xs"
                            : "bg-white dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                        )}
                      >
                        <span className="text-[11px] font-bold block">ElevenLabs</span>
                        <span className="text-[8px] font-mono text-zinc-400 block font-semibold">
                          Studio Voice
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── BOTTOM PART: SCREENPLAY NARRATIVE DIRECTIVE (Mode Switcher + Prompt Boxes) ── */}
            <div className="space-y-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <label className="text-[11px] text-zinc-700 dark:text-zinc-300 uppercase tracking-widest font-bold">
                    02 • DIRECTORIAL NARRATIVE & STEP PROMPTS
                  </label>
                </div>

                {/* Mode Selector Tabs: Auto Storyboard vs Multi-Prompt Director */}
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
                  <button
                    type="button"
                    onClick={() => setPipelineMode("auto")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer",
                      pipelineMode === "auto"
                        ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                    )}
                  >
                    <Sparkles className="w-3 h-3 text-emerald-500" />
                    <span>Single Topic (Auto)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPipelineMode("director");
                      if (!imagePrompt && topic) {
                        setImagePrompt(topic);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer",
                      pipelineMode === "director"
                        ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                    )}
                  >
                    <Clapperboard className="w-3 h-3 text-emerald-500" />
                    <span>Director Multi-Prompt</span>
                  </button>
                </div>
              </div>

              {/* MODE 1: SINGLE TOPIC AUTO-STORYBOARD */}
              {pipelineMode === "auto" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-[10px] text-zinc-500">
                      Enter a high-level story concept — the AI Director will automatically script scenes, generate keyframes, compute kinematics, and dub voiceover.
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {topic.trim() && (
                        <button
                          type="button"
                          onClick={() => setTopic("")}
                          className="text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer px-2 py-1 rounded"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={enhancePrompt}
                        disabled={enhancing || !topic.trim()}
                        className="flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-white transition-colors cursor-pointer border border-emerald-300 dark:border-emerald-500/30 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 disabled:opacity-40"
                      >
                        <Wand2 className={cn("h-3 w-3", enhancing && "animate-spin")} />
                        <span>{enhancing ? "ENHANCING SCRIPT..." : "AI SCRIPT ENHANCE"}</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" && e.ctrlKey) || (e.key === "Enter" && e.metaKey)) {
                        e.preventDefault();
                        requestPipelineConfirm();
                      }
                    }}
                    placeholder="Describe your film's scene concepts, visual atmosphere, characters, camera pacing, and tone (Press Ctrl+Enter to Generate)..."
                    className={cn(
                      "w-full h-28 bg-zinc-50 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-4 text-sm text-zinc-950 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all font-jakarta leading-relaxed",
                      loading && "lightning-border-active ring-2 ring-emerald-500/40"
                    )}
                  />

                  {/* Inspiration Presets */}
                  <div className="pt-1 space-y-2 font-mono">
                    <span className="text-[9px] uppercase tracking-widest text-zinc-500 block font-semibold">
                      QUICK INSPIRATION PRESETS:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {PRESETS.map((p, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setTopic(p.text)}
                          className="text-[10px] px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-white/[0.04] hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <span className="font-bold text-emerald-500">[{p.genre}]</span>
                          <span className="truncate max-w-[220px]">{p.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: DIRECTOR MULTI-PROMPT MODE (Image + Motion + Voice boxes) */}
              {pipelineMode === "director" && (
                <div className="space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                    <div>
                      <span className="text-xs font-heading font-bold text-emerald-950 dark:text-emerald-100 block">
                        Sequential Directorial Stage Control
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300">
                        Write custom prompts for each generation stage, or auto-decompose from your idea.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDraftPrompts}
                      disabled={draftingPrompts}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-mono font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Sparkles className={cn("w-3.5 h-3.5", draftingPrompts && "animate-spin")} />
                      <span>{draftingPrompts ? "DRAFTING PROMPTS..." : "⚡ AUTO-DRAFT STEP PROMPTS"}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {/* Prompt Box 1: Visual Image Diffusion */}
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-mono">
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                          <label className="text-[11px] font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                            STEP 1 • KEYFRAME IMAGE PROMPT (DIFFUSION)
                          </label>
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                          VISUAL KEYFRAME
                        </span>
                      </div>
                      <textarea
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="E.g. Cinematic wide shot of cyberpunk detective in dark rain, neon reflections on wet asphalt, volumetric lighting, Arri Alexa 35mm lens, 8k resolution..."
                        rows={2}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-jakarta resize-none leading-relaxed"
                      />
                    </div>

                    {/* Prompt Box 2: Camera Kinematics Dynamics */}
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-mono">
                          <Video className="w-3.5 h-3.5 text-emerald-500" />
                          <label className="text-[11px] font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                            STEP 2 • CAMERA KINEMATICS DYNAMICS (MOTION)
                          </label>
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                          CAMERA VECTOR
                        </span>
                      </div>
                      <textarea
                        value={motionPrompt}
                        onChange={(e) => setMotionPrompt(e.target.value)}
                        placeholder="E.g. Slow cinematic push-in zoom with gentle pan right, smooth optical lens drift..."
                        rows={2}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-jakarta resize-none leading-relaxed"
                      />
                      {/* Quick Camera Motion Presets */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[9px] font-mono uppercase text-zinc-400 mr-1">Camera Presets:</span>
                        {[
                          { label: "Zoom In", val: "Slow cinematic push-in zoom with steady focus" },
                          { label: "Zoom Out", val: "Smooth dramatic zoom-out revealing the expansive environment" },
                          { label: "Pan Right", val: "Smooth cinematic horizontal pan right across the scene" },
                          { label: "Pan Left", val: "Fluid sweeping pan left following the focal action" },
                          { label: "Tilt Up", val: "Low angle cinematic tilt up towards the sky and architecture" },
                          { label: "Orbit CW", val: "Dynamic circular 360 orbit camera around the central subject" },
                          { label: "Dolly Zoom", val: "Vertigo effect cinematic dolly zoom with perspective shift" },
                        ].map((m) => (
                          <button
                            key={m.label}
                            type="button"
                            onClick={() => setMotionPrompt(m.val)}
                            className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 hover:bg-emerald-500/20 hover:text-emerald-600 dark:hover:text-emerald-400 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                          >
                            +{m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Prompt Box 3: Neural Voiceover Narration */}
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-mono">
                          <Mic className="w-3.5 h-3.5 text-emerald-500" />
                          <label className="text-[11px] font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                            STEP 3 • NEURAL VOICEOVER NARRATION SCRIPT
                          </label>
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                          {voiceProvider === "edge" ? "EDGE NEURAL (FREE)" : "ELEVENLABS"}
                        </span>
                      </div>
                      <textarea
                        value={voiceScript}
                        onChange={(e) => setVoiceScript(e.target.value)}
                        placeholder="Enter the narration script or spoken monologue to be synthesized by the neural speech engine..."
                        rows={2}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-jakarta resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Launch Production Command Button */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-black/[0.06] dark:border-white/[0.06]">
              <div className="flex items-center gap-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  Estimated Runtime: ~{scenes * 7}s
                </span>
                <span>•</span>
                <span>
                  Est. Cost: <strong className="text-zinc-950 dark:text-white">₹{costInr}</strong> (${costUsd.toFixed(2)})
                </span>
              </div>

              <button
                type="button"
                onClick={requestPipelineConfirm}
                disabled={loading || (pipelineMode === "auto" ? !topic.trim() : (!imagePrompt.trim() && !topic.trim()))}
                className="px-8 py-3.5 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 font-heading font-extrabold text-sm tracking-tight flex items-center justify-center gap-2.5 disabled:opacity-50 transition-all shadow-md active:scale-[0.98] cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>SYNTHESIZING PRODUCTION...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    <span>{pipelineMode === "director" ? "EXECUTE DIRECTORIAL PIPELINE" : "EXECUTE AUTONOMOUS PIPELINE"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: LIVE PRODUCTION & TELEMETRY STAGE */}
      <div ref={stageRef} className="scroll-mt-6 space-y-6">
        <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-4 font-mono">
            <div className="flex items-center gap-2">
              <span className={cn("w-2.5 h-2.5 rounded-full", loading ? "bg-emerald-500 animate-ping" : "bg-zinc-400")} />
              <h2 className="text-xs uppercase tracking-widest font-bold text-zinc-800 dark:text-zinc-200">
                {loading ? "LIVE PRODUCTION STAGE IN PROGRESS" : "PRODUCTION MILESTONE OVERVIEW"}
              </h2>
            </div>
            {loading && abortRef.current && (
              <button
                type="button"
                onClick={() => {
                  abortRef.current?.abort();
                  setLoading(false);
                }}
                className="px-3 py-1 rounded-full border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-[10px] font-mono transition-colors cursor-pointer"
              >
                Cancel Production
              </button>
            )}
          </div>

          {/* Production Milestone Step Cards */}
          <StepCards currentStep={currentStep} />

          {/* Real-time Streaming Progress & Live Compiler Terminal */}
          {loading && (
            <div className="mt-6 pt-6 border-t border-black/[0.06] dark:border-white/[0.06]">
              <LiveProgressBar
                progress={progress}
                stageTitle={stageTitle}
                statusMessage={statusText}
                elapsedSeconds={elapsedSeconds}
                logs={telemetryLogs}
                isActive={loading}
                showTerminal={true}
              />
            </div>
          )}

          {!loading && !result && (
            <div className="text-center py-12 space-y-3">
              {statusText === "Pipeline compilation cancelled." && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-mono font-bold mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Pipeline compilation was cancelled</span>
                </div>
              )}
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-center mx-auto text-zinc-400">
                <Clapperboard className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 font-heading">
                Studio Ready for Screenplay Directives
              </p>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Once executed, the autonomous agent will automatically generate storyboard keyframes, camera motions, synchronized voiceover narration, and compile a 1080p MP4.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: MASTER SCREENING ROOM & SCENE STORYBOARD */}
      {result && result.success && result.final_video && (
        <div ref={resultRef} className="scroll-mt-6 space-y-6">
          <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
            {/* Top Bar with Cinema Tag & Details */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.06] pb-4 font-mono">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] tracking-wider uppercase border border-emerald-500/20">
                  MASTER RENDER READY
                </span>
                <span className="text-xs text-zinc-950 dark:text-white font-semibold truncate max-w-sm">
                  {result.final_video.filename}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                <span>{result.scenes?.length || scenes} SCENES</span>
                <span>•</span>
                <span>COMPILED IN {result.elapsed_seconds || elapsedSeconds}S</span>
              </div>
            </div>

            {/* Master Video Player Viewport */}
            <div className="relative rounded-2xl overflow-hidden border border-black/[0.1] dark:border-white/[0.1] bg-black shadow-2xl">
              <video
                src={getMediaUrl(result.final_video.url)}
                controls
                autoPlay
                className="w-full aspect-video object-contain"
              >
                {result.final_video?.vtt_url && (
                  <track
                    src={getMediaUrl(result.final_video.vtt_url)}
                    kind="subtitles"
                    srcLang="en"
                    label="English Subtitles"
                    default
                  />
                )}
              </video>
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-black/80 text-white border border-white/20 backdrop-blur-md">
                  [ 1080P MASTER • 30 FPS • H.264 ]
                </span>
              </div>
            </div>

            {/* Master Action Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setCurrentStep(-1);
                    setProgress(0);
                    scrollToDesk();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.06] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/[0.1] transition-all cursor-pointer shadow-sm"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>NEW CUT</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditVideoAsset({
                      url: result.final_video.url,
                      filename: result.final_video.filename,
                    });
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-heading font-bold transition-all cursor-pointer shadow-md"
                >
                  <Scissors className="h-3.5 w-3.5" />
                  <span>PRECISION VIDEO EDITOR</span>
                </button>
              </div>

              <div className="flex items-center gap-2 font-mono">
                {result.final_video?.srt_url && (
                  <a
                    href={getMediaUrl(result.final_video.srt_url)}
                    download
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.06] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                    title="Download Subtitles (.srt)"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>DOWNLOAD .SRT</span>
                  </a>
                )}

                <a
                  href={getMediaUrl(result.final_video.url)}
                  download
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-heading font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>DOWNLOAD MASTER MP4</span>
                </a>
              </div>
            </div>

            {/* Visual Scene Sequence Storyboard */}
            {result.scenes && result.scenes.length > 0 && (
              <div className="pt-6 border-t border-black/[0.06] dark:border-white/[0.06] space-y-4 font-mono">
                <div className="flex items-center justify-between text-xs uppercase tracking-widest text-zinc-500 font-bold">
                  <span>SCENE STORYBOARD BREAKDOWN • {result.scenes.length} KEYFRAMES</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.scenes.map((s: any, i: number) => (
                    <div
                      key={i}
                      className="rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] p-3 space-y-2.5 text-left shadow-sm"
                    >
                      {s.image?.url && (
                        <div className="relative rounded-xl overflow-hidden aspect-video bg-black/40">
                          <img
                            src={getMediaUrl(s.image.url)}
                            alt={s.title}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-2 left-2 text-[9px] font-mono px-2 py-0.5 rounded bg-black/70 text-white backdrop-blur-sm border border-white/10">
                            Scene {s.scene || i + 1}
                          </span>
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-950 dark:text-white line-clamp-1">
                          {s.title || `Scene ${i + 1}`}
                        </p>
                        {s.narration && (
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-2 italic font-jakarta">
                            &ldquo;{s.narration}&rdquo;
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-1 text-[9px] text-zinc-400">
                          <span className="uppercase">VECTOR: {s.video?.motion_type || "zoom"}</span>
                          {s.duration && <span>{s.duration}s</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Feedback Card */}
      {result && !result.success && (
        <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-center space-y-2">
          <p className="text-xs text-rose-600 dark:text-rose-400 font-mono font-bold">
            Compilation Error: {result.error}
          </p>
        </div>
      )}

      {/* Precision Video Editor Modal */}
      {editVideoAsset && (
        <VideoEditorModal
          isOpen={Boolean(editVideoAsset)}
          onClose={() => setEditVideoAsset(null)}
          videoUrl={editVideoAsset.url}
          filename={editVideoAsset.filename}
        />
      )}

      {/* Spend Safeguard Confirmation Modal */}
      <GenerationConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => {
          setConfirmModalOpen(false);
          run();
        }}
        details={confirmDetails}
        loading={loading}
      />
    </div>
  );
}

export default function PipelinePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-500 font-mono">Loading Cinema Studio...</div>}>
      <PipelineContent />
    </Suspense>
  );
}
