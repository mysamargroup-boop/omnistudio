"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Video,
  Loader2,
  Play,
  Download,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Wind,
  Image as ImageIcon,
  FolderArchive,
  X,
  Check,
  Sparkles,
  Compass,
  Layers,
  ArrowRightLeft,
  Sliders,
  Sparkle,
  Cpu,
  Eye,
  Film,
  Maximize2,
  RotateCw,
  Upload,
  Dices,
  Repeat,
  Gauge,
  Zap,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import Dropdown, { DropdownOption } from "@/components/ui/Dropdown";
import GenerationConfirmModal, { GenerationConfirmDetails } from "@/components/ui/GenerationConfirmModal";
import LiveProgressBar, { LogEntry } from "@/components/ui/LiveProgressBar";

type VideoMode = "first_frame" | "first_to_last_frame" | "text_to_video" | "motion_transfer";

const MOTIONS = [
  { id: "zoom_in", label: "Push In", desc: "Dramatic Approach", icon: ZoomIn },
  { id: "zoom_out", label: "Pull Out", desc: "Expansive Reveal", icon: ZoomOut },
  { id: "pan_left", label: "Pan Left", desc: "Horizontal Sweep", icon: ArrowLeft },
  { id: "pan_right", label: "Pan Right", desc: "Horizontal Sweep", icon: ArrowRight },
  { id: "tilt_up", label: "Tilt Up", desc: "Ascending Angle", icon: ArrowUp },
  { id: "tilt_down", label: "Tilt Down", desc: "Descending Angle", icon: ArrowDown },
  { id: "orbit", label: "Orbital Arc", desc: "Circular Parallax", icon: Compass },
  { id: "subtle", label: "Subtle Float", desc: "Organic Handheld", icon: Wind },
];

const TRANSITIONS = [
  { id: "smooth_morph", label: "Dissolve Morph", desc: "Seamless cross-morph" },
  { id: "cross_dissolve", label: "Cinematic Fade", desc: "Theatrical crossfade" },
  { id: "zoom_blend", label: "Radial Zoom Blend", desc: "Speed burst transition" },
  { id: "directional_wipe", label: "Directional Sweep", desc: "Kinetic wipe motion" },
];

const VIDEO_MODELS: DropdownOption[] = [
  { value: "ffmpeg_local", label: "Local Ken Burns / Morph Engine", description: "Hardware Accelerated FFmpeg 8.1 (100% Free / Instant)", badge: "FREE LOCAL" },
  { value: "google_veo", label: "Google Veo 3.1 / 2 (DeepMind)", description: "High-Definition 4K Video Generation (Billing Active)", badge: "ACTIVE" },
  { value: "kling_2.0", label: "Kling AI 2.0 Pro", description: "Photorealistic Physics & High Dynamic Kinematics", badge: "PRO" },
  { value: "runway_gen3", label: "Runway Gen-3 Alpha Turbo", description: "Ultra-Realistic Cinema Motion Coherence", badge: "CINEMA" },
  { value: "luma_dream", label: "Luma Dream Machine 1.5", description: "Consistent 3D Camera Parallax & Fluid Dynamics", badge: "CLOUD" },
  { value: "minimax_video", label: "Minimax Hailuo Video-01", description: "Cinematic Resolution & Natural Human Kinetics", badge: "SOTA" },
  { value: "seedance_v1", label: "ByteDance Seedance 1.0", description: "High-Fidelity Character & Dance Choreography", badge: "DANCE" },
  { value: "hunyuan_video", label: "Tencent HunyuanVideo", description: "Open-Weights High Definition Video Diffusion", badge: "OPEN" },
  { value: "openai_sora", label: "OpenAI Sora", description: "World Simulator & Complex Multi-Shot Kinematics", badge: "CLOUD" },
  { value: "pika_v2", label: "Pika 2.0", description: "Creative Stylized Motion & Kinetic Lens Effects", badge: "FAST" },
  { value: "cogvideox_5b", label: "CogVideoX-5B", description: "Deep Expert 3D VAE Latent Video Synthesis", badge: "DEV" },
];

const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9 Cinema" },
  { value: "9:16", label: "9:16 Shorts/Reels" },
  { value: "1:1", label: "1:1 Square" },
  { value: "21:9", label: "21:9 Scope" },
];

const FPS_PROFILES = [
  { value: 24, label: "24 FPS", desc: "Cinematic Film" },
  { value: 30, label: "30 FPS", desc: "Standard ProRes" },
  { value: 60, label: "60 FPS", desc: "High Frame Rate" },
];

const QUALITY_PROFILES = [
  { value: "draft", label: "Draft", desc: "CRF 24 Fast" },
  { value: "balanced", label: "Production", desc: "CRF 18 1080p" },
  { value: "cinema", label: "Cinema Master", desc: "CRF 14 ProRes" },
];

const SPEED_PROFILES = [
  { value: 0.5, label: "0.5x", desc: "Slow-Mo" },
  { value: 1.0, label: "1.0x", desc: "Cinematic" },
  { value: 1.5, label: "1.5x", desc: "Dynamic" },
  { value: 2.0, label: "2.0x", desc: "Hyperlapse" },
];

const RESOLUTIONS = [
  { value: "720p", label: "720p HD", desc: "Fast Mobile" },
  { value: "1080p", label: "1080p Full HD", desc: "Standard" },
  { value: "2k", label: "2K QHD", desc: "1440p High Res" },
  { value: "4k", label: "4K Ultra HD", desc: "2160p Cinema" },
];

const DURATION_PRESETS = [5, 10, 15, 30, 45, 60];

function VideoStudioContent() {
  const searchParams = useSearchParams();

  // Mode Selection
  const [mode, setMode] = useState<VideoMode>("first_frame");

  // Frames State
  const [startImage, setStartImage] = useState(searchParams?.get("image") || "");
  const [endImage, setEndImage] = useState("");
  
  // Motion Transfer State
  const [sourceVideoFile, setSourceVideoFile] = useState<File | null>(null);
  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Prompt & OpenAI Director Agent State
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [directing, setDirecting] = useState(false);
  const [directorNotes, setDirectorNotes] = useState<any>(null);

  // Video Settings
  const [model, setModel] = useState("ffmpeg_local");
  const [motion, setMotion] = useState("zoom_in");
  const [transition, setTransition] = useState("smooth_morph");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState(4);
  const [fps, setFps] = useState(30);
  const [resolution, setResolution] = useState("1080p");
  const [quality, setQuality] = useState("balanced");
  const [motionIntensity, setMotionIntensity] = useState(1.0);
  const [loop, setLoop] = useState(false);
  const [seed, setSeed] = useState("");

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 999999999).toString());
  };

  // Generation & Result State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Vault Picker Modal State
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultTarget, setVaultTarget] = useState<"start" | "end">("start");
  const [vaultImages, setVaultImages] = useState<any[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);

  useEffect(() => {
    const qImg = searchParams?.get("image");
    if (qImg) {
      setStartImage(qImg);
      setMode("first_frame");
    }
  }, [searchParams]);

  const openVaultPicker = async (target: "start" | "end") => {
    setVaultTarget(target);
    setVaultOpen(true);
    setLoadingVault(true);
    try {
      const data = await api.getAllAssets();
      setVaultImages(data.images || []);
    } catch {}
    setLoadingVault(false);
  };

  const handleSourceVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSourceVideoFile(file);
    setUploadingVideo(true);
    try {
      const result = await (api as any).uploadSourceVideo(file);
      const url = typeof result === "string" ? result : result?.url;
      if (url) {
        setSourceVideoUrl(url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingVideo(false);
    }
  };

  // Run Parallel OpenAI Director Agent
  const runDirectorAgent = async () => {
    const inputIdea = prompt.trim() || (mode === "first_to_last_frame" ? "Interpolate keyframes with cinematic camera movement" : "Dynamic camera tracking shot");
    setDirecting(true);
    try {
      const res = await api.directVideoPrompt({
        idea: inputIdea,
        generation_mode: mode,
        target_video_model: model,
        style: "cinematic",
        aspect_ratio: aspectRatio,
      });

      if (res.success) {
        setPrompt(res.enhanced_prompt);
        if (res.camera_direction) setMotion(res.camera_direction);
        if (res.transition_type) setTransition(res.transition_type);
        if (res.negative_prompt) setNegativePrompt(res.negative_prompt);
        setDirectorNotes({
          notes: res.director_notes,
          lighting: res.lighting_directive,
          model: res.model_used,
        });
      }
    } catch (e: any) {
      console.error(e);
    }
    setDirecting(false);
  };

  // Real-Time Progress States
  const [progress, setProgress] = useState(0);
  const [stageTitle, setStageTitle] = useState("VIDEO MOTION ENGINE");
  const [statusMessage, setStatusMessage] = useState("Initializing frame buffer...");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [telemetryLogs, setTelemetryLogs] = useState<LogEntry[]>([]);

  // Trigger Video Synthesis
  const generate = async () => {
    setLoading(true);
    setResult(null);
    setProgress(8);
    setStageTitle("01 // INITIALIZING FRAME BUFFER");
    setStatusMessage(`Preparing ${resolution} canvas texture...`);
    setElapsedSeconds(0);
    const nowTime = new Date().toTimeString().split(" ")[0];
    setTelemetryLogs([
      { timestamp: nowTime, message: `Started ${mode.toUpperCase()} synthesis on ${model}...` }
    ]);

    const startTimestamp = Date.now();
    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed === 1) {
        setProgress(25);
        setStageTitle("02 // CALCULATING CAMERA KINEMATICS");
        setStatusMessage(`Applying motion vector: ${motion} (${resolution}, ${fps} FPS)...`);
        setTelemetryLogs((prev) => [
          ...prev,
          { timestamp: new Date().toTimeString().split(" ")[0], message: `Computing camera motion trajectory (${motion}, ${duration}s)` }
        ]);
      } else if (elapsed === 3) {
        setProgress(55);
        setStageTitle("03 // INTERPOLATING SUB-PIXEL FRAMES");
        setStatusMessage("Hardware-accelerated frame interpolation in progress...");
        setTelemetryLogs((prev) => [
          ...prev,
          { timestamp: new Date().toTimeString().split(" ")[0], message: `Synthesizing ${Math.round(duration * fps)} frames at ${fps} FPS` }
        ]);
      } else if (elapsed === 6) {
        setProgress(80);
        setStageTitle("04 // FFMPEG 8.1 PRORES ENCODING");
        setStatusMessage(`Compressing video with ${quality} CRF profile...`);
        setTelemetryLogs((prev) => [
          ...prev,
          { timestamp: new Date().toTimeString().split(" ")[0], message: `Encoding libx264 container with ${aspectRatio} aspect ratio` }
        ]);
      } else if (elapsed >= 9 && elapsed < 16) {
        setProgress((prev) => Math.min(prev + 2, 95));
      }
    }, 1000);

    try {
      const payload: any = {
        mode,
        start_image_path: startImage,
        end_image_path: mode === "first_to_last_frame" ? endImage : null,
        source_video_path: mode === "motion_transfer" ? sourceVideoUrl : null,
        prompt,
        negative_prompt: negativePrompt,
        motion_type: motion,
        transition_type: transition,
        duration,
        fps,
        resolution,
        aspect_ratio: aspectRatio,
        quality,
        motion_intensity: motionIntensity,
        loop,
        seed: seed ? parseInt(seed, 10) : undefined,
        model,
      };

      const data = await api.generateVideo(payload);
      setResult(data);
      if (data && data.success) {
        setProgress(100);
        setStageTitle("VIDEO RENDER COMPLETE");
        setStatusMessage("Video synthesized successfully!");
        setTelemetryLogs((prev) => [
          ...prev,
          { timestamp: new Date().toTimeString().split(" ")[0], message: `Render complete: ${data.filename} (${data.duration}s)` }
        ]);
      }
    } catch (e: any) {
      setResult({ success: false, error: e.message });
      setTelemetryLogs((prev) => [
        ...prev,
        { timestamp: new Date().toTimeString().split(" ")[0], message: `Error: ${e.message}` }
      ]);
    } finally {
      clearInterval(timerInterval);
      setLoading(false);
    }
  };

  // Confirmation Modal State (Zero Unintended API Calls)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState<GenerationConfirmDetails | null>(null);

  const requestVideoConfirm = () => {
    if (!isFormValid()) return;

    let costUsd = 0.0;
    let provider = "Local Hardware (FFmpeg 8.1)";
    let isFree = true;

    if (model === "google_veo") {
      costUsd = duration * 0.150;
      provider = "Google AI Studio (Veo 3.1)";
      isFree = false;
    } else if (model.includes("kling") || model.includes("runway") || model.includes("luma")) {
      costUsd = duration * 0.200;
      provider = "Cloud Video Engine";
      isFree = false;
    } else if (model === "ffmpeg_local") {
      costUsd = 0.0;
      provider = "Local Hardware (FFmpeg 8.1)";
      isFree = true;
    }

    const costInr = Math.round(costUsd * 83.5 * 100) / 100;
    const modelObj = VIDEO_MODELS.find((m) => m.value === model);

    setConfirmDetails({
      serviceType: "video",
      modelName: modelObj?.label || model,
      provider,
      prompt: prompt.trim() || `Motion: ${motion} on keyframe`,
      specs: {
        mode,
        duration,
        resolution,
        fps,
        motion,
        quality,
      },
      costUsd,
      costInr,
      isFree,
    });
    setConfirmModalOpen(true);
  };

  const isFormValid = () => {
    if (mode === "first_frame") return !!startImage.trim();
    if (mode === "first_to_last_frame") return !!startImage.trim() && !!endImage.trim();
    if (mode === "text_to_video") return !!prompt.trim();
    if (mode === "motion_transfer") return !!startImage.trim() && !!sourceVideoUrl.trim();
    return false;
  };

  return (
    <div className="space-y-8 pb-12 font-jakarta">
      {/* Page Header & System Telemetry */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] text-zinc-500 uppercase">
            <span>MOTION ENGINE 5.0</span>
            <span>//</span>
            <span>KEYFRAME INTERPOLATION & AI DIRECTOR</span>
          </div>
          <h1 className="text-3xl font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight">
            Video Motion Studio
          </h1>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-700 dark:text-zinc-400 bg-zinc-100 dark:bg-[#09090d] border border-black/[0.08] dark:border-white/[0.08] px-3.5 py-1.5 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>PARALLEL AGENT: OPENAI GPT-4o</span>
          <span className="text-zinc-400">•</span>
          <span>COMPILER: FFMPEG 8.1</span>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-zinc-100 dark:bg-[#09090d] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl max-w-fit">
        <button
          type="button"
          onClick={() => setMode("first_frame")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer",
            mode === "first_frame"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-semibold shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
          )}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span>FIRST FRAME (IMG-TO-VIDEO)</span>
        </button>

        <button
          type="button"
          onClick={() => setMode("first_to_last_frame")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer",
            mode === "first_to_last_frame"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-semibold shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
          )}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          <span>FIRST + LAST FRAME (MORPH)</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
            NEW
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMode("text_to_video")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer",
            mode === "text_to_video"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-semibold shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>TEXT-TO-VIDEO</span>
        </button>

        <button
          type="button"
          onClick={() => setMode("motion_transfer")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer",
            mode === "motion_transfer"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-semibold shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
          )}
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>MOTION TRANSFER</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Video Settings / Controls Column (Right Side) */}
        <div className="lg:col-span-6 lg:order-2 space-y-5">
          {/* Keyframe Staging Section (for First Frame, First+Last Frame, and Motion Transfer) */}
          {mode !== "text_to_video" && (
            <div className="hf-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
                <span className="text-[10px] font-mono tracking-widest text-zinc-600 dark:text-zinc-400 uppercase font-semibold flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-zinc-950 dark:text-white" />
                  <span>KEYFRAME STAGING //</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {mode === "first_to_last_frame" ? "DUAL KEYFRAME INTERPOLATION" : mode === "motion_transfer" ? "MOTION TRANSFER" : "SINGLE KEYFRAME"}
                </span>
              </div>

              {/* Dynamic Staging Layout */}
              <div className={cn("grid gap-4", (mode === "first_to_last_frame" || mode === "motion_transfer") ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                {/* Start Frame (or Target Image) */}
                <div className="space-y-2 p-3.5 rounded-xl bg-zinc-50 dark:bg-[#07070a] border border-black/[0.06] dark:border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-bold">
                      {mode === "motion_transfer" ? "TARGET IMAGE //" : "START FRAME (01) //"}
                    </label>
                    <button
                      type="button"
                      onClick={() => openVaultPicker("start")}
                      className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white flex items-center gap-1 border border-black/[0.08] dark:border-white/[0.08] px-2 py-0.5 rounded-full bg-white dark:bg-[#09090d] cursor-pointer"
                    >
                      <FolderArchive className="h-3 w-3" />
                      <span>VAULT</span>
                    </button>
                  </div>

                  {startImage ? (
                    <div className="relative rounded-lg overflow-hidden border border-black/[0.1] dark:border-white/[0.1] aspect-video bg-black group">
                      <img src={getMediaUrl(startImage)} alt="Start Frame" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setStartImage("")}
                          className="p-1.5 rounded-full bg-white/20 text-white hover:bg-white/40 cursor-pointer"
                          title="Remove image"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="absolute bottom-1.5 left-1.5 text-[8px] font-mono px-1.5 py-0.5 rounded bg-black/80 text-zinc-200 truncate max-w-[90%]">
                        {startImage.split("/").pop()}
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => openVaultPicker("start")}
                      className="border border-dashed border-black/[0.15] dark:border-white/[0.15] rounded-lg aspect-video flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-black/40 dark:hover:border-white/40 transition-colors bg-white/50 dark:bg-black/20"
                    >
                      <ImageIcon className="h-6 w-6 text-zinc-400 mb-1" />
                      <span className="text-[11px] font-mono font-medium text-zinc-700 dark:text-zinc-300">Click to Select {mode === "motion_transfer" ? "Target Image" : "Start Frame"}</span>
                      <span className="text-[9px] font-mono text-zinc-500">Pick from local vault or paste path</span>
                    </div>
                  )}

                  <input
                    type="text"
                    value={startImage}
                    onChange={(e) => setStartImage(e.target.value)}
                    placeholder="Or enter filepath / URL"
                    className="w-full bg-white dark:bg-[#09090d] border border-black/[0.08] dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-900 dark:text-white font-mono placeholder-zinc-400 focus:outline-none"
                  />
                </div>

                {/* End Frame (Last Frame) - Only visible in first_to_last_frame mode */}
                {mode === "first_to_last_frame" && (
                  <div className="space-y-2 p-3.5 rounded-xl bg-zinc-50 dark:bg-[#07070a] border border-black/[0.06] dark:border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-bold">
                        END FRAME (02) //
                      </label>
                      <button
                        type="button"
                        onClick={() => openVaultPicker("end")}
                        className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white flex items-center gap-1 border border-black/[0.08] dark:border-white/[0.08] px-2 py-0.5 rounded-full bg-white dark:bg-[#09090d] cursor-pointer"
                      >
                        <FolderArchive className="h-3 w-3" />
                        <span>VAULT</span>
                      </button>
                    </div>

                    {endImage ? (
                      <div className="relative rounded-lg overflow-hidden border border-black/[0.1] dark:border-white/[0.1] aspect-video bg-black group">
                        <img src={getMediaUrl(endImage)} alt="End Frame" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEndImage("")}
                            className="p-1.5 rounded-full bg-white/20 text-white hover:bg-white/40 cursor-pointer"
                            title="Remove image"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="absolute bottom-1.5 left-1.5 text-[8px] font-mono px-1.5 py-0.5 rounded bg-black/80 text-zinc-200 truncate max-w-[90%]">
                          {endImage.split("/").pop()}
                        </span>
                      </div>
                    ) : (
                      <div
                        onClick={() => openVaultPicker("end")}
                        className="border border-dashed border-black/[0.15] dark:border-white/[0.15] rounded-lg aspect-video flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-black/40 dark:hover:border-white/40 transition-colors bg-white/50 dark:bg-black/20"
                      >
                        <ImageIcon className="h-6 w-6 text-zinc-400 mb-1" />
                        <span className="text-[11px] font-mono font-medium text-zinc-700 dark:text-zinc-300">Click to Select End Frame</span>
                        <span className="text-[9px] font-mono text-zinc-500">Pick destination keyframe</span>
                      </div>
                    )}

                    <input
                      type="text"
                      value={endImage}
                      onChange={(e) => setEndImage(e.target.value)}
                      placeholder="Or enter filepath / URL"
                      className="w-full bg-white dark:bg-[#09090d] border border-black/[0.08] dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-900 dark:text-white font-mono placeholder-zinc-400 focus:outline-none"
                    />
                  </div>
                )}

                {/* Source Video - Only visible in motion_transfer mode */}
                {mode === "motion_transfer" && (
                  <div className="space-y-2 p-3.5 rounded-xl bg-zinc-50 dark:bg-[#07070a] border border-black/[0.06] dark:border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-bold">
                        SOURCE MOTION VIDEO //
                      </label>
                    </div>

                    {sourceVideoUrl ? (
                      <div className="relative rounded-lg overflow-hidden border border-black/[0.1] dark:border-white/[0.1] aspect-video bg-black group">
                        <video src={getMediaUrl(sourceVideoUrl)} className="w-full h-full object-cover" controls={false} autoPlay loop muted />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => { setSourceVideoUrl(""); setSourceVideoFile(null); }}
                            className="p-1.5 rounded-full bg-white/20 text-white hover:bg-white/40 cursor-pointer"
                            title="Remove video"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="absolute bottom-1.5 left-1.5 text-[8px] font-mono px-1.5 py-0.5 rounded bg-black/80 text-zinc-200 truncate max-w-[90%]">
                          {sourceVideoUrl.split("/").pop() || "source_video.mp4"}
                        </span>
                      </div>
                    ) : (
                      <label className="border border-dashed border-black/[0.15] dark:border-white/[0.15] rounded-lg aspect-video flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-black/40 dark:hover:border-white/40 transition-colors bg-white/50 dark:bg-black/20 relative">
                        <input type="file" accept="video/*" className="hidden" onChange={handleSourceVideoUpload} disabled={uploadingVideo} />
                        {uploadingVideo ? (
                          <>
                            <Loader2 className="h-6 w-6 text-zinc-400 mb-1 animate-spin" />
                            <span className="text-[11px] font-mono font-medium text-zinc-700 dark:text-zinc-300">Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-zinc-400 mb-1" />
                            <span className="text-[11px] font-mono font-medium text-zinc-700 dark:text-zinc-300">Click to Upload Video</span>
                            <span className="text-[9px] font-mono text-zinc-500">Provide source motion (MP4/MOV)</span>
                          </>
                        )}
                      </label>
                    )}

                    <input
                      type="text"
                      value={sourceVideoUrl}
                      onChange={(e) => setSourceVideoUrl(e.target.value)}
                      placeholder="Or enter filepath / URL"
                      className="w-full bg-white dark:bg-[#09090d] border border-black/[0.08] dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-900 dark:text-white font-mono placeholder-zinc-400 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Interpolation Dynamics Selector (Only in first_to_last_frame mode) */}
              {mode === "first_to_last_frame" && (
                <div className="pt-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-2 font-medium">
                    TRANSITION DYNAMICS //
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {TRANSITIONS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTransition(t.id)}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-all cursor-pointer font-mono",
                          transition === t.id
                            ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent shadow-sm"
                            : "bg-zinc-50 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                        )}
                      >
                        <span className="text-xs font-bold block">{t.label}</span>
                        <span className="text-[9px] opacity-75 block">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Parallel OpenAI Director Agent Card */}
          <div className="hf-card p-6 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
              <span className="text-[10px] font-mono tracking-widest text-zinc-600 dark:text-zinc-400 uppercase font-semibold flex items-center gap-2">
                <Sparkle className="h-3.5 w-3.5 text-zinc-950 dark:text-white" />
                <span>AI DIRECTOR COPILOT (OPENAI GPT-4o) //</span>
              </span>
              <button
                type="button"
                onClick={runDirectorAgent}
                disabled={directing}
                className="text-[10px] font-mono text-zinc-950 dark:text-white hover:opacity-80 flex items-center gap-1.5 transition-all bg-zinc-100 dark:bg-[#09090d] border border-black/[0.1] dark:border-white/[0.1] px-3 py-1 rounded-full cursor-pointer disabled:opacity-40"
              >
                {directing ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>DIRECTING IN PARALLEL...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>DIRECT WITH OPENAI</span>
                  </>
                )}
              </button>
            </div>

            {/* Prompt input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block font-medium">
                SCENE VISION & MOTION DIRECTIVE //
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter scene narrative, physics, speed, or click 'Direct with OpenAI' for parallel enhancement..."
                className="w-full h-24 bg-zinc-50 dark:bg-[#060609] border border-black/[0.08] dark:border-white/[0.08] rounded-xl p-3.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 resize-none focus:outline-none focus:border-black/40 dark:focus:border-white/30 font-jakarta leading-relaxed"
              />
            </div>

            {/* Director Notes Display */}
            {directorNotes && (
              <div className="p-3.5 rounded-xl bg-zinc-100/70 dark:bg-[#060609] border border-black/[0.06] dark:border-white/[0.06] space-y-1.5 font-mono text-[10px]">
                <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300 font-semibold">
                  <span>DIRECTOR COMMENTARY:</span>
                  <span className="text-zinc-500">{directorNotes.model}</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 font-jakarta text-[11px] leading-snug">
                  {directorNotes.notes}
                </p>
                <div className="pt-1 text-zinc-500">
                  <span>LIGHTING: {directorNotes.lighting}</span>
                </div>
              </div>
            )}

            {/* Negative Prompt Field */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                NEGATIVE PROMPT (MOTION DEFECT SUPPRESSION) //
              </label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="jitter, blur, flickering, low quality, morphing artifacts, extra limbs..."
                className="w-full bg-zinc-50 dark:bg-[#060609] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-2 text-[11px] text-zinc-900 dark:text-white font-mono placeholder-zinc-400 focus:outline-none focus:border-black/30 dark:focus:border-white/30"
              />
            </div>
          </div>

          {/* Video Engine & Camera Configuration Card */}
          <div className="hf-card p-6 space-y-5">
            {/* Target Video Model Selector */}
            <Dropdown
              label="TARGET VIDEO ENGINE (INDEPENDENT FROM PROMPT COPILOT)"
              options={VIDEO_MODELS}
              value={model}
              onChange={setModel}
            />

            {/* Camera Motion Compass (for single frame or text-to-video) */}
            {mode !== "first_to_last_frame" && mode !== "motion_transfer" && (
              <div>
                <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 dark:text-zinc-400 block mb-2 font-medium">
                  CAMERA MOTION VECTOR COMPASS //
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {MOTIONS.map((m) => {
                    const isSelected = motion === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMotion(m.id)}
                        className={cn(
                          "flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                          isSelected
                            ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent shadow-md scale-[1.01]"
                            : "bg-zinc-50 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                        )}
                      >
                        <m.icon className={cn("h-4 w-4 shrink-0 mt-0.5", isSelected ? "text-current" : "text-zinc-400")} />
                        <div className="min-w-0">
                          <span className="text-xs font-bold font-heading block">{m.label}</span>
                          <span className={cn("text-[9px] font-mono block truncate", isSelected ? "opacity-80" : "text-zinc-500")}>
                            {m.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Aspect Ratio, Frame Rate, & Resolution Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Aspect Ratio */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5 font-medium">
                  ASPECT RATIO //
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {ASPECT_RATIOS.map((ar) => (
                    <button
                      key={ar.value}
                      type="button"
                      onClick={() => setAspectRatio(ar.value)}
                      className={cn(
                        "py-2 px-2.5 rounded-lg border text-center font-mono text-[11px] transition-all cursor-pointer",
                        aspectRatio === ar.value
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent font-bold"
                          : "bg-zinc-50 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                      )}
                    >
                      {ar.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame Rate */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5 font-medium">
                  FRAME RATE //
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {FPS_PROFILES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setFps(p.value)}
                      className={cn(
                        "py-2 px-1 rounded-lg border text-center font-mono text-[11px] transition-all cursor-pointer",
                        fps === p.value
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent font-bold"
                          : "bg-zinc-50 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution (4 options including 2K) */}
              <div className="sm:col-span-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5 font-medium">
                  RESOLUTION //
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {RESOLUTIONS.map((res) => (
                    <button
                      key={res.value}
                      type="button"
                      onClick={() => setResolution(res.value)}
                      className={cn(
                        "py-2 px-1 rounded-lg border text-center font-mono text-[11px] transition-all cursor-pointer",
                        resolution === res.value
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent font-bold"
                          : "bg-zinc-50 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                      )}
                    >
                      <span className="block font-bold">{res.label}</span>
                      <span className="text-[8px] opacity-70 block">{res.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Video Quality Bitrate Profile */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 dark:text-zinc-400 block mb-1.5 font-medium">
                QUALITY BITRATE PROFILE //
              </label>
              <div className="grid grid-cols-3 gap-2 font-mono">
                {QUALITY_PROFILES.map((qp) => (
                  <button
                    key={qp.value}
                    type="button"
                    onClick={() => setQuality(qp.value)}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                      quality === qp.value
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent shadow-sm"
                        : "bg-zinc-50 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                    )}
                  >
                    <span className="text-xs font-bold block">{qp.label}</span>
                    <span className="text-[9px] opacity-70 block">{qp.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Motion Speed / Intensity Multiplier */}
            {mode !== "first_to_last_frame" && mode !== "motion_transfer" && (
              <div>
                <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 dark:text-zinc-400 block mb-1.5 font-medium">
                  CAMERA MOTION INTENSITY //
                </label>
                <div className="grid grid-cols-4 gap-1.5 font-mono">
                  {SPEED_PROFILES.map((sp) => (
                    <button
                      key={sp.value}
                      type="button"
                      onClick={() => setMotionIntensity(sp.value)}
                      className={cn(
                        "p-2 rounded-lg border text-center transition-all cursor-pointer",
                        motionIntensity === sp.value
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent font-bold"
                          : "bg-zinc-50 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                      )}
                    >
                      <span className="text-xs font-bold block">{sp.label}</span>
                      <span className="text-[8px] opacity-70 block">{sp.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Duration Slider + Quick Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono">
                <label className="text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400 block font-medium">
                  CLIP DURATION //
                </label>
                <span className="text-xs font-bold text-zinc-950 dark:text-white font-heading">{duration} SECONDS</span>
              </div>
              
              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-[9px] text-zinc-500 uppercase mr-1">PRESETS:</span>
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] border transition-all cursor-pointer",
                      duration === d
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent font-bold"
                        : "bg-zinc-100 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                    )}
                  >
                    {d}s
                  </button>
                ))}
              </div>

              <input
                type="range"
                min={2}
                max={60}
                step={1}
                value={duration}
                onChange={(e) => setDuration(parseFloat(e.target.value))}
                className="w-full accent-zinc-950 dark:accent-white cursor-pointer"
              />
              <div className="flex justify-between text-[8px] font-mono text-zinc-500 uppercase">
                <span>5s (Teaser)</span>
                <span>15s (Standard)</span>
                <span>30s (Extended)</span>
                <span>60s (Long Master)</span>
              </div>
            </div>

            {/* Seamless Loop & Seed Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
              {/* Seamless Loop Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-[#07070a] border border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Repeat className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                  <div>
                    <span className="text-xs text-zinc-900 dark:text-white font-medium block">Seamless Loop</span>
                    <span className="text-[9px] font-mono text-zinc-500 block">Infinite ping-pong bounce</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={loop}
                  onChange={(e) => setLoop(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-400 dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-900 accent-zinc-950 dark:accent-white cursor-pointer"
                />
              </div>

              {/* Seed Input */}
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#07070a] border border-black/[0.06] dark:border-white/[0.06] space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-600 dark:text-zinc-400 uppercase">SEED //</span>
                  <button
                    type="button"
                    onClick={randomizeSeed}
                    className="text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Dices className="h-3 w-3" />
                    <span>RANDOM</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Random seed"
                  className="w-full bg-white dark:bg-[#09090d] border border-black/[0.08] dark:border-white/[0.08] rounded-lg px-2.5 py-1 text-[11px] text-zinc-900 dark:text-white font-mono placeholder-zinc-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Main Action Button */}
            <button
              onClick={requestVideoConfirm}
              disabled={loading || !isFormValid()}
              className="w-full py-4 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-black font-heading font-bold text-xs tracking-tight flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-30 transition-all shadow-xl active:scale-98 mt-3 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-current" />
                  <span>SYNTHESIZING CINEMATIC FRAMES...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>RENDER CINEMATIC VIDEO</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Master Viewport Column (Left Side) */}
        <div className="lg:col-span-6 lg:order-1">
          <div className="hf-card p-6 flex flex-col justify-between min-h-[580px] technical-corner relative">
            {loading && (
              <div className="my-auto space-y-6 py-6">
                <LiveProgressBar
                  progress={progress}
                  stageTitle={stageTitle}
                  statusMessage={statusMessage}
                  elapsedSeconds={elapsedSeconds}
                  logs={telemetryLogs}
                  isActive={loading}
                  showTerminal={true}
                />
              </div>
            )}

            {result && result.success && (
              <div className="space-y-5">
                <div className="relative rounded-2xl overflow-hidden border border-black/[0.1] dark:border-white/[0.1] bg-black shadow-2xl group">
                  <video
                    src={getMediaUrl(result.url)}
                    controls
                    autoPlay
                    loop
                    className="w-full aspect-video object-contain"
                  />
                  <span className="absolute top-3 left-3 text-[9px] font-mono px-2.5 py-1 rounded-md bg-black/80 text-zinc-200 border border-white/10 backdrop-blur-sm">
                    [ {result.mode?.toUpperCase() || "MOTION"} // {fps} FPS // {aspectRatio} ]
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="font-mono text-xs text-zinc-500 space-y-0.5">
                    <p className="text-zinc-950 dark:text-white font-medium">{result.engine || model}</p>
                    <p className="text-[10px] truncate max-w-sm">{result.filename}</p>
                  </div>

                  <a
                    href={getMediaUrl(result.url)}
                    download
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-black text-xs font-heading font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-md active:scale-95"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>DOWNLOAD MOTION MP4</span>
                  </a>
                </div>
              </div>
            )}

            {result && !result.success && (
              <div className="my-auto text-center space-y-2 py-16">
                <p className="text-xs text-red-500 dark:text-red-400 font-mono">{result.error}</p>
              </div>
            )}

            {!loading && !result && (
              <div className="my-auto text-center space-y-4 py-24">
                <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center mx-auto text-zinc-500 dark:text-zinc-600">
                  <Video className="h-7 w-7" />
                </div>
                <div className="space-y-1.5 max-w-sm mx-auto">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-200 font-heading tracking-tight">
                    MOTION STAGE READY
                  </p>
                  <p className="text-xs text-zinc-500 font-jakarta leading-relaxed">
                    Select First Frame & Last Frame for morphing, or click &quot;Direct with OpenAI&quot; to formulate cinematography vision.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vault Picker Modal */}
      {vaultOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#09090d] border border-black/[0.12] dark:border-white/[0.12] rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs text-zinc-950 dark:text-white font-semibold">
                <FolderArchive className="h-4 w-4 text-zinc-500" />
                <span>SELECT {vaultTarget.toUpperCase()} FRAME FROM VAULT</span>
              </div>
              <button
                type="button"
                onClick={() => setVaultOpen(false)}
                className="p-1 rounded-lg text-zinc-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {loadingVault ? (
                <div className="py-12 text-center text-xs text-zinc-500 font-mono">Loading vault images...</div>
              ) : vaultImages.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 font-mono">
                  No images found in local vault. Generate an image in Image Studio first!
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {vaultImages.map((img: any, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (vaultTarget === "start") setStartImage(img.url);
                        else setEndImage(img.url);
                        setVaultOpen(false);
                      }}
                      className="group rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] hover:border-zinc-950 dark:hover:border-white text-left transition-all relative aspect-video bg-black cursor-pointer"
                    >
                      <img
                        src={getMediaUrl(img.url)}
                        alt={img.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-2">
                        <p className="text-[10px] font-mono text-white truncate">{img.filename}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generation Confirmation & Spend Authorization Modal */}
      <GenerationConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => {
          setConfirmModalOpen(false);
          generate();
        }}
        details={confirmDetails}
        loading={loading}
      />
    </div>
  );
}

export default function VideoStudio() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-500 font-mono">Loading Motion Studio...</div>}>
      <VideoStudioContent />
    </Suspense>
  );
}
