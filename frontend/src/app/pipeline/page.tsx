"use client";
import React, { useState, useEffect, Suspense } from "react";
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
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import Dropdown from "@/components/ui/Dropdown";
import StepCards from "@/components/StepCards";
import GenerationConfirmModal, { GenerationConfirmDetails } from "@/components/ui/GenerationConfirmModal";
import LiveProgressBar, { LogEntry } from "@/components/ui/LiveProgressBar";

const PHASES = [
  { id: 1, label: "01 // SCRIPT", desc: "Storyboard Director", icon: Layers },
  { id: 2, label: "02 // DIFFUSION", desc: "Visual Sampler", icon: ImageIcon },
  { id: 3, label: "03 // DYNAMICS", desc: "Camera Vector Engine", icon: Video },
  { id: 4, label: "04 // NARRATION", desc: "Neural Speech Sync", icon: Mic },
  { id: 5, label: "05 // MASTER", desc: "FFmpeg MP4 Compiler", icon: Film },
];

const PRESETS = [
  "Cyberpunk detective uncovering an AI mystery in rainy Neo-Tokyo",
  "Deep space expedition finding an alien monolith orbiting Jupiter",
  "Ancient samurai meditating beneath falling cherry blossoms at dusk",
  "Futuristic Formula-1 hypercar race through neon orbital tracks",
];

function PipelineContent() {
  const searchParams = useSearchParams();
  const [topic, setTopic] = useState(searchParams?.get("topic") || "");
  const [scenes, setScenes] = useState(2);
  const [style, setStyle] = useState("cinematic");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [voiceProvider, setVoiceProvider] = useState("edge");
  const [imageModel, setImageModel] = useState("gemini_flash_image");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [enhancing, setEnhancing] = useState(false);

  // Real-Time Live Progress Bar States
  const [progress, setProgress] = useState(0);
  const [stageTitle, setStageTitle] = useState("DIRECTOR INITIALIZATION");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [telemetryLogs, setTelemetryLogs] = useState<LogEntry[]>([]);

  // Safeguard Confirmation Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState<GenerationConfirmDetails | null>(null);

  const requestPipelineConfirm = () => {
    if (!topic.trim()) return;
    const isEdge = voiceProvider === "edge";
    const costPerScene = isEdge ? 0.04 : 0.06;
    const costUsd = costPerScene * scenes;
    const costInr = Math.round(costUsd * 83.5 * 100) / 100;

    setConfirmDetails({
      serviceType: "pipeline",
      modelName: `Autonomous Cinema Agent (${scenes} Scenes)`,
      provider: isEdge ? "OpenAI DALL-E 3 + Edge Neural + FFmpeg" : "OpenAI DALL-E 3 + ElevenLabs + FFmpeg",
      isFree: false,
      costUsd,
      costInr,
      prompt: topic.trim(),
      specs: {
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
      const data = await api.enhancePrompt({ prompt: topic, style });
      if (data && data.enhanced_prompt) {
        setTopic(data.enhanced_prompt);
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
    if (!topic.trim()) return;
    setLoading(true);
    setResult(null);
    setProgress(5);
    setCurrentStep(0);
    setStageTitle("01 // INITIALIZING AUTONOMOUS AGENT");
    setStatusText("Drafting screenplay & scene visual compositions...");
    setElapsedSeconds(0);
    const nowTime = new Date().toTimeString().split(" ")[0];
    setTelemetryLogs([
      { timestamp: nowTime, message: `Initialized Autonomous Cinema Pipeline for: "${topic.slice(0, 45)}..."` }
    ]);

    const startTimestamp = Date.now();
    const timerInterval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimestamp) / 1000));
    }, 1000);

    try {
      const streamResult = await api.runPipelineStream({
        topic,
        num_scenes: scenes,
        style,
        image_model: imageModel,
        aspect_ratio: aspectRatio,
        voice_provider: voiceProvider,
        enhance_prompts: true,
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
          if (event.stage.includes("storyboard")) setStageTitle("01 // SCREENPLAY DIRECTIVE");
          else if (event.stage.includes("visual")) setStageTitle(`02 // VISUAL DIFFUSION (SCENE ${event.scene || 1})`);
          else if (event.stage.includes("motion")) setStageTitle(`03 // CAMERA KINEMATICS (SCENE ${event.scene || 1})`);
          else if (event.stage.includes("voice")) setStageTitle(`04 // NEURAL NARRATION (SCENE ${event.scene || 1})`);
          else if (event.stage.includes("merge")) setStageTitle(`05 // AUDIO-VIDEO SYNC (SCENE ${event.scene || 1})`);
          else if (event.stage.includes("master")) setStageTitle("06 // MASTER FFMPEG COMPILATION");
          else if (event.stage.includes("subtitles")) setStageTitle("07 // SYNCHRONIZING SUBTITLES");
          else if (event.stage.includes("cloud_sync")) setStageTitle("08 // SUPABASE & VAULT SYNC");
          else if (event.stage.includes("complete")) setStageTitle("09 // RENDER COMPLETE");
        }
      });

      if (streamResult) {
        setResult(streamResult);
        setProgress(100);
        setCurrentStep(5);
        setStageTitle("CINEMA MASTERPIECE COMPILED");
        setStatusText("Production compilation completed successfully.");
      }
    } catch (e: any) {
      setResult({ success: false, error: e.message });
      setStatusText("Pipeline compilation error");
      setTelemetryLogs((prev) => [
        ...prev,
        { timestamp: new Date().toTimeString().split(" ")[0], message: `Error: ${e.message}` }
      ]);
    } finally {
      clearInterval(timerInterval);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] text-zinc-500 uppercase">
            <span>CINEMA STUDIO 5.0</span>
            <span>//</span>
            <span>AUTONOMOUS AGENT DIRECTOR</span>
          </div>
          <h1 className="text-3xl font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight">
            Autonomous Cinema Agent
          </h1>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-700 dark:text-zinc-400 bg-white dark:bg-[#09090d] border border-black/[0.08] dark:border-white/[0.08] px-3.5 py-1.5 rounded-full shadow-2xs">
          <Clock className="h-3 w-3 text-zinc-500" />
          <span>EST. RUNTIME: ~20-35 SECONDS</span>
        </div>
      </div>

      {/* Production Milestone Step Cards */}
      <StepCards currentStep={currentStep} />

      {/* Studio Console Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Direction Parameters */}
        <div className="lg:col-span-5 space-y-4">
          <div className="hf-card p-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2 font-mono">
                <label className="text-[11px] text-zinc-600 dark:text-zinc-400 uppercase tracking-widest block font-medium">
                  NARRATIVE CONCEPT //
                </label>
                <button
                  type="button"
                  onClick={enhancePrompt}
                  disabled={enhancing || !topic.trim()}
                  className="flex items-center gap-1 text-[10px] text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer border border-black/10 dark:border-white/10 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-[#060609]"
                >
                  <Wand2 className={cn("h-2.5 w-2.5", enhancing && "animate-spin")} />
                  <span>AI ENHANCE</span>
                </button>
              </div>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Describe screenplay idea, world-building atmosphere, and visual narrative..."
                className="w-full h-32 bg-zinc-50/80 dark:bg-[#060609] border border-black/[0.1] dark:border-white/[0.08] rounded-xl p-3.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 resize-none focus:outline-none focus:border-black/30 dark:focus:border-white/30 font-jakarta leading-relaxed"
              />

              {/* Preset Chips */}
              <div className="mt-2.5 space-y-1.5 font-mono">
                <span className="text-[9px] uppercase tracking-widest text-zinc-500 block font-medium">
                  PRESET CONCEPTS:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTopic(p)}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-[#07070a] border border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-white/[0.2] truncate max-w-[280px] text-left transition-colors cursor-pointer"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dropdowns for Timeline and Style */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Dropdown
                label="SCENE TIMELINE"
                options={[
                  { value: 2, label: "2 Scenes", description: "~10s Teaser Cut" },
                  { value: 3, label: "3 Scenes", description: "~15s Standard Story" },
                  { value: 4, label: "4 Scenes", description: "~20s Cinematic Cut" },
                  { value: 5, label: "5 Scenes", description: "~25s Feature Short" },
                ]}
                value={scenes}
                onChange={(val) => setScenes(Number(val))}
              />

              <Dropdown
                label="AESTHETIC STYLE"
                options={[
                  { value: "cinematic", label: "Cinematic", description: "35mm Arri Alexa Lighting" },
                  { value: "cyberpunk", label: "Cyberpunk", description: "Neon Noir Atmosphere" },
                  { value: "anime", label: "Anime", description: "Ghibli Painterly Sky" },
                  { value: "3d_pixar", label: "3D Animation", description: "Subsurface Scattering" },
                  { value: "photoreal", label: "Photoreal", description: "Hasselblad Sharp Focus" },
                ]}
                value={style}
                onChange={setStyle}
              />
            </div>

            {/* Aspect Ratio & Format */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 dark:text-zinc-400 block mb-2 font-medium">
                ASPECT RATIO FORMAT //
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "16:9", label: "16:9", desc: "Landscape / Film" },
                  { id: "9:16", label: "9:16", desc: "Shorts / Reels" },
                  { id: "1:1", label: "1:1", desc: "Square Social" },
                ].map((ar) => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => setAspectRatio(ar.id)}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                      aspectRatio === ar.id
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent shadow-xs"
                        : "bg-zinc-100 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                    )}
                  >
                    <span className="text-xs font-bold font-heading block">{ar.label}</span>
                    <span className="text-[9px] font-mono opacity-70 block">{ar.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Provider Switcher */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 dark:text-zinc-400 block mb-2 font-medium">
                SPEECH ENGINE //
              </label>
              <div className="grid grid-cols-2 gap-2 font-jakarta">
                <button
                  type="button"
                  onClick={() => setVoiceProvider("edge")}
                  className={cn(
                    "p-3 rounded-xl text-left border transition-all cursor-pointer",
                    voiceProvider === "edge"
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent shadow-xs"
                      : "bg-zinc-100 dark:bg-[#07070a] border-black/[0.08] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                  )}
                >
                  <span className="text-xs font-bold font-heading block">Edge Neural</span>
                  <span className="text-[9px] font-mono opacity-70 block">Free / Offline Active</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceProvider("elevenlabs")}
                  className={cn(
                    "p-3 rounded-xl text-left border transition-all cursor-pointer",
                    voiceProvider === "elevenlabs"
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent shadow-xs"
                      : "bg-zinc-100 dark:bg-[#07070a] border-black/[0.08] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                  )}
                >
                  <span className="text-xs font-bold font-heading block">ElevenLabs</span>
                  <span className="text-[9px] font-mono opacity-70 block">Ultra-Realistic Speech</span>
                </button>
              </div>
            </div>

            <button
              onClick={requestPipelineConfirm}
              disabled={loading || !topic.trim()}
              className="w-full py-3.5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-black font-heading font-bold text-xs tracking-tight flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-30 transition-all shadow-xl active:scale-98 mt-3 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-current" />
                  <span>SYNTHESIZING PRODUCTION...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>EXECUTE CINEMA PIPELINE</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Master Cinema Viewport */}
        <div className="lg:col-span-7">
          <div className="hf-card p-6 flex flex-col justify-between min-h-[520px] technical-corner relative">
            {loading && (
              <div className="my-auto space-y-6 py-6">
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
              <div className="my-auto text-center space-y-4 py-20">
                <div className="h-16 w-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center mx-auto text-zinc-400 dark:text-zinc-600 shadow-inner">
                  <Film className="h-8 w-8" />
                </div>
                <div className="space-y-1.5 max-w-sm mx-auto">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-200 font-heading tracking-tight">
                    AUTONOMOUS CINEMA AGENT IDLE
                  </p>
                  <p className="text-xs text-zinc-500 font-jakarta leading-relaxed">
                    Select your topic or pick a cinematic preset on the left, then click &quot;Execute Cinema Pipeline&quot; to stream real-time screenplay drafting, visual diffusion, and video compilation.
                  </p>
                </div>
              </div>
            )}

            {result && result.success && result.final_video && (
              <div className="space-y-5">
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
                  <span className="absolute top-3 left-3 text-[9px] font-mono px-2 py-0.5 rounded bg-black/80 text-zinc-300 border border-white/10 backdrop-blur-sm">
                    [ MASTER 1080P // 30 FPS ]
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="space-y-0.5 font-mono">
                    <p className="text-xs text-zinc-950 dark:text-white font-semibold">{result.final_video.filename}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                      {result.scenes?.length} SCENES • COMPILED IN {result.elapsed_seconds}S
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setResult(null);
                        setCurrentStep(-1);
                        setProgress(0);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-zinc-100 dark:bg-[#09090d] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>NEW CUT</span>
                    </button>

                    {result.final_video?.srt_url && (
                      <a
                        href={getMediaUrl(result.final_video.srt_url)}
                        download
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-zinc-100 dark:bg-[#09090d] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors"
                        title="Download Subtitles (.srt)"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>.SRT</span>
                      </a>
                    )}

                    <a
                      href={getMediaUrl(result.final_video.url)}
                      download
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-black text-xs font-heading font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-md active:scale-95"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>DOWNLOAD MASTER MP4</span>
                    </a>
                  </div>
                </div>

                {/* Scene Sequence Breakdown */}
                {result.scenes && result.scenes.length > 0 && (
                  <div className="pt-4 border-t border-black/[0.08] dark:border-white/[0.08] space-y-2.5 font-mono">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-500">
                      <span>SCENE BREAKDOWN // {result.scenes.length} KEYFRAMES</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {result.scenes.map((s: any, i: number) => (
                        <div
                          key={i}
                          className="rounded-xl bg-zinc-100 dark:bg-[#07070a] border border-black/[0.07] dark:border-white/[0.07] p-2 space-y-1.5 text-left"
                        >
                          {s.image?.url && (
                            <img
                              src={getMediaUrl(s.image.url)}
                              alt={s.title}
                              className="w-full h-16 object-cover rounded-lg border border-black/[0.06] dark:border-white/[0.06]"
                            />
                          )}
                          <div className="pt-0.5">
                            <span className="text-[10px] font-bold text-zinc-950 dark:text-white block truncate">
                              SCENE {s.scene}: {s.title}
                            </span>
                            <span className="text-[8px] text-zinc-500 block uppercase">
                              VECTOR: {s.video?.motion_type || "zoom"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {result && !result.success && (
              <div className="my-auto text-center space-y-2 py-12">
                <p className="text-xs text-red-500 dark:text-red-400 font-mono">{result.error}</p>
              </div>
            )}

            {!loading && !result && (
              <div className="my-auto text-center space-y-3 py-20">
                <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center mx-auto text-zinc-400 dark:text-zinc-600">
                  <Film className="h-6 w-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-300 font-heading tracking-tight">
                    CINEMA STAGE IDLE
                  </p>
                  <p className="text-[11px] text-zinc-500 font-jakarta">
                    Configure a narrative concept on the left and execute the pipeline to generate a master movie.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
