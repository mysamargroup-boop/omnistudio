"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  Film,
  Maximize2,
  RotateCw,
  Upload,
  Dices,
  Repeat,
  Gauge,
  Clock,
  Search,
  ChevronUp,
  BookOpen,
  Wand2,
  CheckCircle2,
  Paperclip,
  UploadCloud,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import GenerationConfirmModal, { GenerationConfirmDetails } from "@/components/ui/GenerationConfirmModal";
import LiveProgressBar, { LogEntry } from "@/components/ui/LiveProgressBar";
import HowItWorksModal from "@/components/ui/HowItWorksModal";

type VideoMode = "first_frame" | "first_to_last_frame" | "text_to_video" | "motion_transfer";

interface VideoModelOption {
  value: string;
  label: string;
  description: string;
  badge?: string;
  category?: string;
  iconType?: "ffmpeg" | "google" | "kling" | "runway" | "luma" | "minimax" | "sora" | "pika" | "custom";
}

const VIDEO_MODELS: VideoModelOption[] = [
  {
    value: "ffmpeg_local",
    label: "Local Ken Burns / Morph Engine",
    description: "Hardware Accelerated FFmpeg 8.1 (100% Free & Unlimited)",
    badge: "FREE LOCAL",
    category: "Hardware Engine",
    iconType: "ffmpeg",
  },
  {
    value: "google_veo",
    label: "Google Veo 3.1 / 2 (DeepMind)",
    description: "High-Definition 4K Video Generation (Google Cloud AI)",
    badge: "ACTIVE",
    category: "Featured Cloud",
    iconType: "google",
  },
  {
    value: "kling_2.0",
    label: "Kling AI 2.0 Pro",
    description: "Photorealistic Physics & High Dynamic Kinematics",
    badge: "PRO",
    category: "Featured Cloud",
    iconType: "kling",
  },
  {
    value: "runway_gen3",
    label: "Runway Gen-3 Alpha Turbo",
    description: "Ultra-Realistic Cinema Motion Coherence & Camera Controls",
    badge: "CINEMA",
    category: "Featured Cloud",
    iconType: "runway",
  },
  {
    value: "luma_dream",
    label: "Luma Dream Machine 1.5",
    description: "Consistent 3D Camera Parallax & Fluid Dynamics",
    badge: "CLOUD",
    category: "Cloud SOTA",
    iconType: "luma",
  },
  {
    value: "minimax_video",
    label: "Minimax Hailuo Video-01",
    description: "Cinematic Resolution & Natural Human Kinetics",
    badge: "SOTA",
    category: "Cloud SOTA",
    iconType: "minimax",
  },
  {
    value: "seedance_v1",
    label: "ByteDance Seedance 1.0",
    description: "High-Fidelity Character & Dance Choreography",
    badge: "DANCE",
    category: "Cloud SOTA",
    iconType: "custom",
  },
  {
    value: "hunyuan_video",
    label: "Tencent HunyuanVideo",
    description: "Open-Weights High Definition Video Diffusion",
    badge: "OPEN",
    category: "Open Weights",
    iconType: "custom",
  },
  {
    value: "openai_sora",
    label: "OpenAI Sora",
    description: "World Simulator & Complex Multi-Shot Kinematics",
    badge: "CLOUD",
    category: "Cloud SOTA",
    iconType: "sora",
  },
  {
    value: "pika_v2",
    label: "Pika 2.0",
    description: "Creative Stylized Motion & Kinetic Lens Effects",
    badge: "FAST",
    category: "Cloud SOTA",
    iconType: "pika",
  },
  {
    value: "cogvideox_5b",
    label: "CogVideoX-5B",
    description: "Deep Expert 3D VAE Latent Video Synthesis",
    badge: "DEV",
    category: "Open Weights",
    iconType: "custom",
  },
];

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

const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9", desc: "Cinema / YouTube" },
  { value: "9:16", label: "9:16", desc: "Reels / TikTok" },
  { value: "1:1", label: "1:1", desc: "Square Feed" },
  { value: "21:9", label: "21:9", desc: "Cinemascope Scope" },
];

const RESOLUTIONS = [
  { value: "720p", label: "720p HD", desc: "Fast Mobile" },
  { value: "1080p", label: "1080p FHD", desc: "Standard Master" },
  { value: "2k", label: "2K QHD", desc: "1440p High Res" },
  { value: "4k", label: "4K UHD", desc: "2160p Cinema Master" },
];

const FPS_PROFILES = [
  { value: 24, label: "24 FPS", desc: "Cinematic Film" },
  { value: 30, label: "30 FPS", desc: "Standard ProRes" },
  { value: 60, label: "60 FPS", desc: "High Frame Rate" },
];

const QUALITY_PROFILES = [
  { value: "draft", label: "Draft", desc: "CRF 24 Fast Render" },
  { value: "balanced", label: "Production", desc: "CRF 18 Crisp Quality" },
  { value: "cinema", label: "Cinema Master", desc: "CRF 14 ProRes RAW" },
];

const SPEED_PROFILES = [
  { value: 0.5, label: "0.5x", desc: "Slow Motion" },
  { value: 1.0, label: "1.0x", desc: "Standard Speed" },
  { value: 1.5, label: "1.5x", desc: "Dynamic Pace" },
  { value: 2.0, label: "2.0x", desc: "Hyperlapse" },
];

const DURATION_PRESETS = [4, 8, 12, 16, 24, 30];

const INSPIRATION_VIDEOS = [
  {
    title: "Cyberpunk Tokyo Drift",
    mode: "text_to_video" as VideoMode,
    prompt: "Cinematic drone tracking shot through neon-lit futuristic Tokyo alleyways in heavy rain, puddles reflecting magenta holographic signs, 4k 60fps photorealistic",
    motion: "zoom_in",
  },
  {
    title: "Rainforest Temple Reveal",
    mode: "text_to_video" as VideoMode,
    prompt: "Slow ascending tilt up revealing an ancient overgrown Mayan pyramid nestled deep within misty bioluminescent jungle at dawn, sun rays piercing foliage",
    motion: "tilt_up",
  },
  {
    title: "Liquid Gold Lotus",
    mode: "text_to_video" as VideoMode,
    prompt: "Macro slow motion shot of molten 24k gold splashing outward and gracefully coalescing into a blooming sacred lotus blossom, studio chiaroscuro lighting",
    motion: "subtle",
  },
  {
    title: "Pacific Coastline Highway",
    mode: "text_to_video" as VideoMode,
    prompt: "Kinetic low-angle orbital sweep around a classic midnight blue sports car cruising along sunlit Big Sur California cliffside highway at golden hour",
    motion: "orbit",
  },
];

function VideoStudioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Mode Selection
  const [mode, setMode] = useState<VideoMode>("first_frame");

  // Frames State
  const [startImage, setStartImage] = useState(searchParams?.get("image") || "");
  const [endImage, setEndImage] = useState("");

  // Motion Transfer State
  const [sourceVideoFile, setSourceVideoFile] = useState<File | null>(null);
  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Keyframe Upload State & Drag State
  const [uploadingStartImage, setUploadingStartImage] = useState(false);
  const [uploadingEndImage, setUploadingEndImage] = useState(false);
  const [startDragOver, setStartDragOver] = useState(false);
  const [endDragOver, setEndDragOver] = useState(false);
  const [videoDragOver, setVideoDragOver] = useState(false);

  // Hidden File Input Refs for direct native file picking
  const startFileInputRef = useRef<HTMLInputElement>(null);
  const endFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const dockFileInputRef = useRef<HTMLInputElement>(null);

  // Prompt & OpenAI Director Agent State
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [showNegativePrompt, setShowNegativePrompt] = useState(false);
  const [directing, setDirecting] = useState(false);
  const [directorNotes, setDirectorNotes] = useState<any>(null);

  // Auto-resize prompt textarea so the full prompt is visible without clipping
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (promptTextareaRef.current) {
      promptTextareaRef.current.style.height = "auto";
      const scrollH = promptTextareaRef.current.scrollHeight;
      promptTextareaRef.current.style.height = `${Math.min(Math.max(scrollH, 48), 140)}px`;
    }
  }, [prompt]);

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

  // Popover States for Floating Dock
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);
  const [ratioPopoverOpen, setRatioPopoverOpen] = useState(false);
  const [motionPopoverOpen, setMotionPopoverOpen] = useState(false);
  const [durationPopoverOpen, setDurationPopoverOpen] = useState(false);
  const [specPopoverOpen, setSpecPopoverOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState("");

  // Modals & Extras
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Generation & Result State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Real-Time Progress States
  const [progress, setProgress] = useState(0);
  const [stageTitle, setStageTitle] = useState("VIDEO MOTION ENGINE");
  const [statusMessage, setStatusMessage] = useState("Initializing frame buffer...");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [telemetryLogs, setTelemetryLogs] = useState<LogEntry[]>([]);

  // Vault Picker Modal State
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultTarget, setVaultTarget] = useState<"start" | "end">("start");
  const [vaultImages, setVaultImages] = useState<any[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);

  // Confirmation Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState<GenerationConfirmDetails | null>(null);

  const activeModel = VIDEO_MODELS.find((m) => m.value === model) || VIDEO_MODELS[0];
  const activeMotion = MOTIONS.find((m) => m.id === motion) || MOTIONS[0];

  useEffect(() => {
    const qImg = searchParams?.get("image");
    if (qImg) {
      setStartImage(qImg);
      setMode("first_frame");
    }
  }, [searchParams]);

  // Close popovers on click outside
  const dockRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        closeAllPopovers();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeAllPopovers = () => {
    setModelPopoverOpen(false);
    setRatioPopoverOpen(false);
    setMotionPopoverOpen(false);
    setDurationPopoverOpen(false);
    setSpecPopoverOpen(false);
  };

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 999999999).toString());
  };

  const openVaultPicker = async (target: "start" | "end") => {
    setVaultTarget(target);
    setVaultOpen(true);
    setLoadingVault(true);
    try {
      const data = await api.getAllAssets();
      setVaultImages(data.images || []);
    } catch {
      // fallback
    }
    setLoadingVault(false);
  };

  const handleStartImageUpload = async (file: File) => {
    if (!file) return;
    setUploadingStartImage(true);
    try {
      const res = await api.uploadVideoKeyframe(file);
      const url = typeof res === "string" ? res : res?.url;
      if (url) {
        setStartImage(url);
      }
    } catch (err) {
      console.error("Failed to upload start keyframe:", err);
    } finally {
      setUploadingStartImage(false);
    }
  };

  const handleEndImageUpload = async (file: File) => {
    if (!file) return;
    setUploadingEndImage(true);
    try {
      const res = await api.uploadVideoKeyframe(file);
      const url = typeof res === "string" ? res : res?.url;
      if (url) {
        setEndImage(url);
      }
    } catch (err) {
      console.error("Failed to upload end keyframe:", err);
    } finally {
      setUploadingEndImage(false);
    }
  };

  const handleDockImageUpload = async (file: File) => {
    if (!file) return;
    setUploadingStartImage(true);
    try {
      const res = await api.uploadVideoKeyframe(file);
      const url = typeof res === "string" ? res : res?.url;
      if (url) {
        setStartImage(url);
        if (mode === "text_to_video") {
          setMode("first_frame");
        }
      }
    } catch (err) {
      console.error("Failed to upload keyframe from dock:", err);
    } finally {
      setUploadingStartImage(false);
    }
  };

  const handleVideoFileProcess = async (file: File) => {
    if (!file) return;
    setSourceVideoFile(file);
    setUploadingVideo(true);
    try {
      const res = await api.uploadSourceVideo(file);
      const url = typeof res === "string" ? res : res?.url;
      if (url) {
        setSourceVideoUrl(url);
      }
    } catch (err) {
      console.error("Failed to upload source video:", err);
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSourceVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleVideoFileProcess(file);
    e.target.value = "";
  };

  // Run Parallel OpenAI Director Agent
  const runDirectorAgent = async () => {
    const inputIdea =
      prompt.trim() ||
      (mode === "first_to_last_frame"
        ? "Interpolate keyframes with cinematic camera movement"
        : "Dynamic camera tracking shot");
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

  // Form Validation
  const isFormValid = () => {
    if (mode === "first_frame") return !!startImage.trim();
    if (mode === "first_to_last_frame") return !!startImage.trim() && !!endImage.trim();
    if (mode === "text_to_video") return !!prompt.trim();
    if (mode === "motion_transfer") return !!startImage.trim() && !!sourceVideoUrl.trim();
    return false;
  };

  // Trigger Video Synthesis Confirmation
  const requestVideoConfirm = () => {
    if (!isFormValid()) return;

    let costUsd = 0.0;
    let provider = "Local Hardware (FFmpeg 8.1)";
    let isFree = true;

    if (model === "google_veo") {
      costUsd = duration * 0.15;
      provider = "Google AI Studio (Veo 3.1)";
      isFree = false;
    } else if (model.includes("kling") || model.includes("runway") || model.includes("luma")) {
      costUsd = duration * 0.2;
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

  // Video Synthesis Core
  const generate = async () => {
    setLoading(true);
    setResult(null);
    setProgress(8);
    setStageTitle("01 • Initializing Frame Buffer");
    setStatusMessage(`Preparing ${resolution} canvas texture...`);
    setElapsedSeconds(0);
    const nowTime = new Date().toTimeString().split(" ")[0];
    setTelemetryLogs([
      { timestamp: nowTime, message: `Started ${mode.toUpperCase()} synthesis on ${activeModel.label}...` },
    ]);

    const startTimestamp = Date.now();
    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed === 1) {
        setProgress(25);
        setStageTitle("02 • Calculating Camera Kinematics");
        setStatusMessage(`Applying motion vector: ${activeMotion.label} (${resolution}, ${fps} FPS)...`);
        setTelemetryLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toTimeString().split(" ")[0],
            message: `Computing camera motion trajectory (${motion}, ${duration}s)`,
          },
        ]);
      } else if (elapsed === 3) {
        setProgress(55);
        setStageTitle("03 • Interpolating Sub-Pixel Frames");
        setStatusMessage("Hardware-accelerated frame interpolation in progress...");
        setTelemetryLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toTimeString().split(" ")[0],
            message: `Synthesizing ${Math.round(duration * fps)} frames at ${fps} FPS`,
          },
        ]);
      } else if (elapsed === 6) {
        setProgress(80);
        setStageTitle("04 • FFmpeg ProRes Encoding");
        setStatusMessage(`Compressing video with ${quality} CRF profile...`);
        setTelemetryLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toTimeString().split(" ")[0],
            message: `Encoding libx264 container with ${aspectRatio} aspect ratio`,
          },
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
          {
            timestamp: new Date().toTimeString().split(" ")[0],
            message: `Render complete: ${data.filename} (${data.duration}s)`,
          },
        ]);
      }
    } catch (e: any) {
      setResult({ success: false, error: e.message });
      setTelemetryLogs((prev) => [
        ...prev,
        { timestamp: new Date().toTimeString().split(" ")[0], message: `Error: ${e.message}` },
      ]);
    } finally {
      clearInterval(timerInterval);
      setLoading(false);
    }
  };

  const handleCopyPrompt = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const filteredModels = VIDEO_MODELS.filter((m) => {
    if (!modelSearchQuery.trim()) return true;
    const q = modelSearchQuery.toLowerCase();
    return (
      m.label.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      (m.category && m.category.toLowerCase().includes(q))
    );
  });

  // Live Actual Spend Calculation for Video
  const videoCostUsd = model === "ffmpeg_local" ? 0 : duration * 0.15;
  const videoCostInr = Math.round(videoCostUsd * 83.5 * 100) / 100;

  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-between pb-48 font-jakarta bg-[#fafafa] dark:bg-[#06060a]">
      {/* Top Bar: Mode Selector Tabs & Studio Guide Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/[0.06] dark:border-white/[0.06] px-4 pt-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl">
          <button
            type="button"
            onClick={() => setMode("first_frame")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
              mode === "first_frame"
                ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-bold shadow-sm border border-violet-200 dark:border-violet-500/20"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/[0.04] border border-transparent"
            )}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>First Frame</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("first_to_last_frame")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
              mode === "first_to_last_frame"
                ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-bold shadow-sm border border-violet-200 dark:border-violet-500/20"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/[0.04] border border-transparent"
            )}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>First + Last Frame</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
              NEW
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode("text_to_video")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
              mode === "text_to_video"
                ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-bold shadow-sm border border-violet-200 dark:border-violet-500/20"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/[0.04] border border-transparent"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Text to Video</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("motion_transfer")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
              mode === "motion_transfer"
                ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-bold shadow-sm border border-violet-200 dark:border-violet-500/20"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/[0.04] border border-transparent"
            )}
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Motion Transfer</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setHowItWorksOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>Studio Guide</span>
          </button>

          <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-violet-700 dark:text-violet-300 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            <span>ENGINE: {activeModel.label}</span>
          </div>
        </div>
      </div>

      {/* Center Viewport / Canvas */}
      <div className="flex-1 flex flex-col justify-center items-center py-6 px-2 w-full max-w-5xl mx-auto">
        {/* State A: Generation In Progress */}
        {loading && (
          <div className="w-full max-w-2xl py-12 space-y-6 animate-in fade-in duration-200">
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

        {/* State B: Video Render Completed */}
        {!loading && result && result.success && (
          <div className="w-full space-y-4 animate-in fade-in duration-200">
            <div className="relative rounded-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06] bg-zinc-50 dark:bg-[#111118] shadow-sm group max-w-4xl mx-auto">
              <video
                src={getMediaUrl(result.url)}
                controls
                autoPlay
                loop
                className="w-full aspect-video object-contain"
              />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="text-[9px] font-mono px-2.5 py-1 rounded-full bg-white/90 dark:bg-black/80 text-zinc-800 dark:text-zinc-100 border border-black/[0.08] dark:border-white/[0.15] backdrop-blur-md shadow-sm">
                  {result.mode?.toUpperCase() || "CINEMATIC"} • {fps} FPS • {aspectRatio}
                </span>
                <span className="text-[9px] font-mono px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 backdrop-blur-md">
                  RENDERED
                </span>
              </div>
            </div>

            {/* Video Metadata & Action Bar */}
            <div className="max-w-4xl mx-auto p-4 rounded-2xl bg-white/90 dark:bg-[#111118]/90 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-zinc-950 dark:text-white">
                    {result.engine || activeModel.label}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">• {resolution.toUpperCase()}</span>
                </div>
                <p className="text-[11px] font-mono text-zinc-500 truncate max-w-md">
                  {result.filename || "cinematic_video.mp4"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={getMediaUrl(result.url)}
                  download
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-heading font-bold transition-all shadow-md active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download MP4</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* State C: Error State */}
        {!loading && result && !result.success && (
          <div className="w-full max-w-md py-12 text-center space-y-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-6 shadow-sm">
            <p className="text-xs text-rose-600 dark:text-rose-400 font-mono leading-relaxed">
              {result.error || "Video synthesis encountered an issue."}
            </p>
            <button
              onClick={() => setResult(null)}
              className="px-4 py-1.5 rounded-xl bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-xs font-mono hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-black/[0.08] dark:border-zinc-800 transition-colors shadow-sm"
            >
              Reset Canvas
            </button>
          </div>
        )}

        {/* State D: Idle / Staging Canvas */}
        {!loading && !result && (
          <div className="w-full max-w-4xl space-y-6">
            {/* Keyframe Staging Grid (when mode is not pure text-to-video) */}
            {mode !== "text_to_video" ? (
              <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl shadow-sm p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    <span className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-950 dark:text-white">
                      Keyframe Staging Canvas
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">
                    {mode === "first_to_last_frame"
                      ? "Dual Keyframe Interpolation"
                      : mode === "motion_transfer"
                      ? "Motion Transfer Reference"
                      : "Single Start Keyframe"}
                  </span>
                </div>

                <div
                  className={cn(
                    "grid gap-4",
                    mode === "first_to_last_frame" || mode === "motion_transfer"
                      ? "grid-cols-1 md:grid-cols-2"
                      : "grid-cols-1 max-w-xl mx-auto"
                  )}
                >
                  {/* Start Frame / Target Image Card */}
                  <div className="space-y-2.5 p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-bold">
                        {mode === "motion_transfer" ? "TARGET STILL IMAGE" : "START FRAME (KEYFRAME 01)"}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          ref={startFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/bmp,image/tiff"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleStartImageUpload(f);
                            e.target.value = "";
                          }}
                          disabled={uploadingStartImage}
                        />
                        <button
                          type="button"
                          onClick={() => startFileInputRef.current?.click()}
                          disabled={uploadingStartImage}
                          className="text-[10px] font-mono text-zinc-800 dark:text-zinc-200 hover:text-violet-600 dark:hover:text-violet-400 flex items-center gap-1.5 border border-black/[0.08] dark:border-white/[0.08] px-2.5 py-1 rounded-lg bg-white dark:bg-[#16161f] hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:border-violet-200 dark:hover:border-violet-500/30 cursor-pointer whitespace-nowrap shrink-0 shadow-sm transition-all"
                          title="Upload image from computer"
                        >
                          {uploadingStartImage ? (
                            <Loader2 className="h-3 w-3 animate-spin text-violet-500" />
                          ) : (
                            <Upload className="h-3 w-3 text-violet-500" />
                          )}
                          <span className="font-semibold">{uploadingStartImage ? "UPLOADING..." : "UPLOAD"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openVaultPicker("start")}
                          className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400 flex items-center gap-1 border border-black/[0.08] dark:border-white/[0.08] px-2.5 py-1 rounded-lg bg-white dark:bg-[#16161f] hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:border-violet-200 dark:hover:border-violet-500/30 cursor-pointer whitespace-nowrap shrink-0 shadow-sm transition-all"
                        >
                          <FolderArchive className="h-3 w-3" />
                          <span>VAULT</span>
                        </button>
                      </div>
                    </div>

                    {startImage ? (
                      <div className="relative rounded-xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06] aspect-video bg-zinc-100 dark:bg-[#111118] group shadow-sm">
                        <img
                          src={getMediaUrl(startImage)}
                          alt="Start Frame"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => startFileInputRef.current?.click()}
                            className="px-2.5 py-1.5 rounded-lg bg-white/20 text-white hover:bg-white/40 text-[11px] font-mono flex items-center gap-1 cursor-pointer backdrop-blur-sm transition-colors"
                            title="Replace image with a new upload"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            <span>Replace</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setStartImage("")}
                            className="p-1.5 rounded-lg bg-rose-500/60 text-white hover:bg-rose-500 cursor-pointer backdrop-blur-sm transition-colors"
                            title="Remove image"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="absolute bottom-1.5 left-1.5 text-[9px] font-mono px-2 py-0.5 rounded bg-black/80 text-zinc-200 truncate max-w-[90%] shadow-sm">
                          {startImage.split("/").pop()}
                        </span>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setStartDragOver(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setStartDragOver(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setStartDragOver(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file && file.type.startsWith("image/")) {
                            handleStartImageUpload(file);
                          }
                        }}
                        onClick={() => startFileInputRef.current?.click()}
                        className={cn(
                          "border-2 border-dashed rounded-xl aspect-video flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all bg-white dark:bg-[#111118] group",
                          startDragOver
                            ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10 scale-[1.01]"
                            : "border-black/[0.1] dark:border-white/[0.1] hover:border-violet-400 dark:hover:border-violet-500/40 hover:bg-zinc-50 dark:hover:bg-white/[0.04]"
                        )}
                      >
                        {uploadingStartImage ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                            <span className="text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200">
                              Uploading Keyframe...
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                              <Upload className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                              Upload {mode === "motion_transfer" ? "Target Image" : "Start Keyframe"}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500 mt-1">
                              Drag & drop or click to browse (PNG, JPG, WebP)
                            </span>
                            <div className="mt-2.5 flex items-center gap-2">
                              <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400">
                                Click to Upload
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openVaultPicker("start");
                                }}
                                className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-zinc-600 dark:text-zinc-400 transition-colors"
                              >
                                Or Pick Vault
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <input
                      type="text"
                      value={startImage}
                      onChange={(e) => setStartImage(e.target.value)}
                      placeholder="Or enter filepath / URL..."
                      className="w-full bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white font-mono placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                    />
                  </div>

                  {/* End Frame Card (In first_to_last_frame mode) */}
                  {mode === "first_to_last_frame" && (
                    <div className="space-y-2.5 p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06]">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-bold">
                          END FRAME (KEYFRAME 02)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            ref={endFileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/bmp,image/tiff"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleEndImageUpload(f);
                              e.target.value = "";
                            }}
                            disabled={uploadingEndImage}
                          />
                          <button
                            type="button"
                            onClick={() => endFileInputRef.current?.click()}
                            disabled={uploadingEndImage}
                            className="text-[10px] font-mono text-zinc-800 dark:text-zinc-200 hover:text-violet-600 dark:hover:text-violet-400 flex items-center gap-1.5 border border-black/[0.08] dark:border-white/[0.08] px-2.5 py-1 rounded-lg bg-white dark:bg-[#16161f] hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:border-violet-200 dark:hover:border-violet-500/30 cursor-pointer whitespace-nowrap shrink-0 shadow-sm transition-all"
                            title="Upload destination keyframe"
                          >
                            {uploadingEndImage ? (
                              <Loader2 className="h-3 w-3 animate-spin text-violet-500" />
                            ) : (
                              <Upload className="h-3 w-3 text-violet-500" />
                            )}
                            <span className="font-semibold">{uploadingEndImage ? "UPLOADING..." : "UPLOAD"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openVaultPicker("end")}
                            className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400 flex items-center gap-1 border border-black/[0.08] dark:border-white/[0.08] px-2.5 py-1 rounded-lg bg-white dark:bg-[#16161f] hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:border-violet-200 dark:hover:border-violet-500/30 cursor-pointer whitespace-nowrap shrink-0 shadow-sm transition-all"
                          >
                            <FolderArchive className="h-3 w-3" />
                            <span>VAULT</span>
                          </button>
                        </div>
                      </div>

                      {endImage ? (
                        <div className="relative rounded-xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06] aspect-video bg-zinc-100 dark:bg-[#111118] group shadow-sm">
                          <img
                            src={getMediaUrl(endImage)}
                            alt="End Frame"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => endFileInputRef.current?.click()}
                              className="px-2.5 py-1.5 rounded-lg bg-white/20 text-white hover:bg-white/40 text-[11px] font-mono flex items-center gap-1 cursor-pointer backdrop-blur-sm transition-colors"
                              title="Replace end frame"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              <span>Replace</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEndImage("")}
                              className="p-1.5 rounded-lg bg-rose-500/60 text-white hover:bg-rose-500 cursor-pointer backdrop-blur-sm transition-colors"
                              title="Remove image"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <span className="absolute bottom-1.5 left-1.5 text-[9px] font-mono px-2 py-0.5 rounded bg-black/80 text-zinc-200 truncate max-w-[90%] shadow-sm">
                            {endImage.split("/").pop()}
                          </span>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setEndDragOver(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setEndDragOver(false);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setEndDragOver(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file && file.type.startsWith("image/")) {
                              handleEndImageUpload(file);
                            }
                          }}
                          onClick={() => endFileInputRef.current?.click()}
                          className={cn(
                            "border-2 border-dashed rounded-xl aspect-video flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all bg-white dark:bg-[#111118] group",
                            endDragOver
                              ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10 scale-[1.01]"
                              : "border-black/[0.1] dark:border-white/[0.1] hover:border-violet-400 dark:hover:border-violet-500/40 hover:bg-zinc-50 dark:hover:bg-white/[0.04]"
                          )}
                        >
                          {uploadingEndImage ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                              <span className="text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200">
                                Uploading Keyframe...
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                <Upload className="h-5 w-5" />
                              </div>
                              <span className="text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                                Upload Destination Keyframe
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500 mt-1">
                                Drag & drop or click to browse (PNG, JPG, WebP)
                              </span>
                              <div className="mt-2.5 flex items-center gap-2">
                                <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400">
                                  Click to Upload
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openVaultPicker("end");
                                  }}
                                  className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-zinc-600 dark:text-zinc-400 transition-colors"
                                >
                                  Or Pick Vault
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <input
                        type="text"
                        value={endImage}
                        onChange={(e) => setEndImage(e.target.value)}
                        placeholder="Or enter filepath / URL..."
                        className="w-full bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white font-mono placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                      />
                    </div>
                  )}

                  {/* Source Motion Video (In motion_transfer mode) */}
                  {mode === "motion_transfer" && (
                    <div className="space-y-2.5 p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06]">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-bold">
                          SOURCE MOTION VIDEO (MP4/MOV)
                        </label>
                        <input
                          ref={videoFileInputRef}
                          type="file"
                          accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska"
                          className="hidden"
                          onChange={handleSourceVideoUpload}
                          disabled={uploadingVideo}
                        />
                        <button
                          type="button"
                          onClick={() => videoFileInputRef.current?.click()}
                          disabled={uploadingVideo}
                          className="text-[10px] font-mono text-zinc-800 dark:text-zinc-200 hover:text-violet-600 dark:hover:text-violet-400 flex items-center gap-1.5 border border-black/[0.08] dark:border-white/[0.08] px-2.5 py-1 rounded-lg bg-white dark:bg-[#16161f] hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:border-violet-200 dark:hover:border-violet-500/30 cursor-pointer whitespace-nowrap shrink-0 shadow-sm transition-all"
                          title="Upload source video file"
                        >
                          {uploadingVideo ? (
                            <Loader2 className="h-3 w-3 animate-spin text-violet-500" />
                          ) : (
                            <Upload className="h-3 w-3 text-violet-500" />
                          )}
                          <span className="font-semibold">{uploadingVideo ? "UPLOADING..." : "UPLOAD VIDEO"}</span>
                        </button>
                      </div>

                      {sourceVideoUrl ? (
                        <div className="relative rounded-xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06] aspect-video bg-zinc-100 dark:bg-[#111118] group shadow-sm">
                          <video
                            src={getMediaUrl(sourceVideoUrl)}
                            className="w-full h-full object-cover"
                            controls={false}
                            autoPlay
                            loop
                            muted
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => videoFileInputRef.current?.click()}
                              className="px-2.5 py-1.5 rounded-lg bg-white/20 text-white hover:bg-white/40 text-[11px] font-mono flex items-center gap-1 cursor-pointer backdrop-blur-sm transition-colors"
                              title="Upload new video"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              <span>Replace</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSourceVideoUrl("");
                                setSourceVideoFile(null);
                              }}
                              className="p-1.5 rounded-lg bg-rose-500/60 text-white hover:bg-rose-500 cursor-pointer backdrop-blur-sm transition-colors"
                              title="Remove video"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <span className="absolute bottom-1.5 left-1.5 text-[9px] font-mono px-2 py-0.5 rounded bg-black/80 text-zinc-200 truncate max-w-[90%] shadow-sm">
                            {sourceVideoUrl.split("/").pop() || "source_video.mp4"}
                          </span>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setVideoDragOver(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setVideoDragOver(false);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setVideoDragOver(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file && file.type.startsWith("video/")) {
                              handleVideoFileProcess(file);
                            }
                          }}
                          onClick={() => videoFileInputRef.current?.click()}
                          className={cn(
                            "border-2 border-dashed rounded-xl aspect-video flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all bg-white dark:bg-[#111118] group",
                            videoDragOver
                              ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10 scale-[1.01]"
                              : "border-black/[0.1] dark:border-white/[0.1] hover:border-violet-400 dark:hover:border-violet-500/40 hover:bg-zinc-50 dark:hover:bg-white/[0.04]"
                          )}
                        >
                          {uploadingVideo ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                              <span className="text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200">
                                Uploading motion track...
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                <Film className="h-5 w-5" />
                              </div>
                              <span className="text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                                Upload Source Motion Video
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500 mt-1">
                                Drag & drop or click to browse (MP4, MOV, WebM)
                              </span>
                              <div className="mt-2.5">
                                <span className="text-[9px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400">
                                  Click to Upload Motion Video
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <input
                        type="text"
                        value={sourceVideoUrl}
                        onChange={(e) => setSourceVideoUrl(e.target.value)}
                        placeholder="Or enter filepath / URL..."
                        className="w-full bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white font-mono placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* Transition Dynamics Pills (for first_to_last_frame) */}
                {mode === "first_to_last_frame" && (
                  <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold block mb-2">
                      TRANSITION INTERPOLATION DYNAMICS:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {TRANSITIONS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTransition(t.id)}
                          className={cn(
                            "p-2.5 rounded-xl border text-left font-mono transition-all cursor-pointer",
                            transition === t.id
                              ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/20 shadow-sm"
                              : "bg-zinc-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.08]"
                          )}
                        >
                          <span className="text-xs font-bold block">{t.label}</span>
                          <span className="text-[9px] opacity-75 block truncate">{t.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Text-to-Video Hero Visual Inspiration */
              <div className="space-y-6 text-center py-4">
                <div className="space-y-2 max-w-lg mx-auto">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-[10px] font-mono text-violet-700 dark:text-violet-300 uppercase tracking-widest font-semibold shadow-sm">
                    <span>Next-Gen Cinema Synthesis</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight uppercase">
                    START CREATING WITH {activeModel.label}
                  </h2>
                  <p className="text-xs font-jakarta text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Direct your shot below with our parallel AI Director copilot, select camera motion vectors, and compile with high-performance engines.
                  </p>
                </div>

                {/* Inspiration Video Prompt Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {INSPIRATION_VIDEOS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPrompt(item.prompt);
                        setMotion(item.motion);
                      }}
                      className="group p-4 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] hover:border-violet-200 dark:hover:border-violet-500/30 transition-all cursor-pointer text-left space-y-1.5 shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-heading font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                          {item.title}
                        </span>
                        <span className="text-[9px] font-mono text-violet-500 uppercase tracking-wider border border-violet-100 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded-full">
                          {item.motion}
                        </span>
                      </div>
                      <p className="text-[11px] font-jakarta text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        &quot;{item.prompt}&quot;
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Bottom Studio Dock */}
      <div
        ref={dockRef}
        data-lenis-prevent="true"
        className="fixed bottom-6 left-0 lg:left-64 right-0 mx-auto z-40 w-[94%] max-w-4xl bg-white/90 dark:bg-[#111118]/90 backdrop-blur-2xl border border-black/[0.1] dark:border-white/[0.1] rounded-2xl sm:rounded-3xl shadow-xl p-3 sm:p-3.5 space-y-2.5 transition-all duration-200 pointer-events-auto glass-dock"
      >
        <input
          ref={dockFileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/bmp,image/tiff"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleDockImageUpload(f);
            e.target.value = "";
          }}
          disabled={uploadingStartImage}
        />

        {/* Row 1: Professional Studio Prompt Input Bar */}
        <div className="relative flex flex-col rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/30 transition-all p-1">
          {/* Staged Keyframe Chip in Prompt Bar */}
          {startImage && (
            <div className="flex items-center gap-1.5 px-3 pt-2 pb-0.5">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white dark:bg-[#16161f] text-[11px] font-mono text-zinc-800 dark:text-zinc-200 border border-black/[0.08] dark:border-white/[0.08] shadow-sm">
                <img
                  src={getMediaUrl(startImage)}
                  alt="Keyframe preview"
                  className="w-4 h-4 object-cover rounded"
                />
                <span className="font-semibold text-violet-600 dark:text-violet-400">KEYFRAME:</span>
                <span className="truncate max-w-[160px]">{startImage.split("/").pop()}</span>
                <button
                  type="button"
                  onClick={() => setStartImage("")}
                  className="p-0.5 hover:text-red-500 rounded cursor-pointer transition-colors"
                  title="Remove keyframe"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          <div className="relative flex items-start w-full">
            <textarea
              ref={promptTextareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  requestVideoConfirm();
                }
              }}
              placeholder={
                mode === "text_to_video"
                  ? "Describe scene cinematography, camera trajectory, lighting, motion dynamics..."
                  : mode === "first_to_last_frame"
                  ? "Describe morph transition dynamics, lighting shifts, speed ramps..."
                  : mode === "motion_transfer"
                  ? "Describe motion retargeting, kinetic flow, or artistic adaptation..."
                  : "Describe camera motion vector, subject dynamics, scene lighting..."
              }
              className="w-full bg-transparent border-none px-3.5 py-2.5 text-xs sm:text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none font-jakarta resize-none pr-24 min-h-[48px] max-h-36 leading-relaxed overflow-y-auto"
            />

            {/* Prompt Bar Actions (Attach Image, Clear & Negative Filter) */}
            <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 z-10">
              {/* Direct Image Attachment / Upload Keyframe button */}
              <button
                type="button"
                onClick={() => dockFileInputRef.current?.click()}
                disabled={uploadingStartImage}
                className={cn(
                  "p-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer flex items-center gap-1",
                  startImage
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 border-violet-200 dark:border-violet-500/30 shadow-sm"
                    : "bg-white/80 dark:bg-white/[0.04] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 border-black/[0.08] dark:border-white/[0.08]"
                )}
                title={startImage ? "Change keyframe image" : "Attach image to animate (Image to Video)"}
              >
                {uploadingStartImage ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5" />
                )}
              </button>

              {prompt.trim() && (
                <button
                  type="button"
                  onClick={() => setPrompt("")}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  title="Clear prompt"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowNegativePrompt((p) => !p)}
                className={cn(
                  "p-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer",
                  showNegativePrompt || negativePrompt
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 border-violet-200 dark:border-violet-500/30 shadow-sm"
                    : "bg-white/80 dark:bg-white/[0.04] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 border-black/[0.08] dark:border-white/[0.08]"
                )}
                title="Toggle Negative Prompt (Exclude elements)"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Negative Prompt Expandable Input */}
        {showNegativePrompt && (
          <div className="animate-in fade-in slide-in-from-bottom-1 duration-150">
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Negative prompt (e.g. jitter, flickering, blur, morph artifacts, extra limbs)..."
              className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none font-mono focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
            />
          </div>
        )}

        {/* Director Notes Badge (if generated) */}
        {directorNotes && (
          <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-between text-[10px] font-mono text-violet-700 dark:text-violet-300 shadow-sm">
            <span className="truncate max-w-md">
              DIRECTOR: {directorNotes.notes} ({directorNotes.lighting})
            </span>
            <button
              type="button"
              onClick={() => setDirectorNotes(null)}
              className="text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 ml-2 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Row 2: Control Pills Strip + Main Render CTA */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
          {/* Left Controls Group */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* 1. Video Engine Selector Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  closeAllPopovers();
                  setModelPopoverOpen(!modelPopoverOpen);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-heading font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-sm",
                  modelPopoverOpen 
                    ? "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-300" 
                    : "bg-white dark:bg-[#16161f] hover:bg-zinc-50 dark:hover:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] text-zinc-900 dark:text-white"
                )}
              >
                <Sparkle className={cn("w-3.5 h-3.5", modelPopoverOpen ? "text-violet-500" : "text-emerald-500")} />
                <span>{activeModel.label}</span>
                <ChevronUp
                  className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform", modelPopoverOpen && "rotate-180")}
                />
              </button>

              {/* Model Popover */}
              {modelPopoverOpen && (
                <div
                  data-lenis-prevent="true"
                  className="absolute bottom-full left-0 mb-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-3 z-50 animate-slide-up space-y-2.5"
                >
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      placeholder="Search video engines..."
                      className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none font-jakarta focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                    />
                  </div>

                  <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase px-1 font-semibold flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Film className="w-3 h-3 text-violet-500" />
                      <span>Available Video Engines</span>
                    </div>
                    <span className="text-[9px] text-zinc-400 font-normal font-mono">
                      {filteredModels.length} models
                    </span>
                  </div>

                  {/* Scrollable Model List */}
                  <div
                    data-lenis-prevent="true"
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    className="max-h-72 sm:max-h-80 overflow-y-auto overscroll-contain space-y-1 pr-1.5 custom-scrollbar"
                  >
                    {filteredModels.map((m) => {
                      const isSelected = model === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => {
                            setModel(m.value);
                            setModelPopoverOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-start justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer font-jakarta",
                            isSelected
                              ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/20"
                              : "hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 border border-transparent"
                          )}
                        >
                          <div className="space-y-0.5 min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold font-heading">{m.label}</span>
                              {m.badge && (
                                <span
                                  className={cn(
                                    "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider",
                                    m.badge === "FREE LOCAL" || m.badge === "OPEN"
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                                      : "bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300"
                                  )}
                                >
                                  {m.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-1">
                              {m.description}
                            </p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Aspect Ratio Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  closeAllPopovers();
                  setRatioPopoverOpen(!ratioPopoverOpen);
                }}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm",
                  ratioPopoverOpen
                    ? "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-300"
                    : "bg-white dark:bg-[#16161f] hover:bg-zinc-50 dark:hover:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] text-zinc-800 dark:text-zinc-200"
                )}
                title="Select Aspect Ratio"
              >
                <Maximize2 className={cn("w-3 h-3", ratioPopoverOpen ? "text-violet-500" : "text-zinc-400")} />
                <span>{aspectRatio}</span>
                <ChevronUp
                  className={cn("w-3 h-3 text-zinc-400 transition-transform", ratioPopoverOpen && "rotate-180")}
                />
              </button>

              {ratioPopoverOpen && (
                <div
                  data-lenis-prevent="true"
                  className="absolute bottom-full left-0 mb-2 w-56 rounded-2xl bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-2 z-50 animate-slide-up space-y-1"
                >
                  <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase px-2 py-1 font-semibold">
                    Aspect Ratio
                  </div>
                  {ASPECT_RATIOS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => {
                        setAspectRatio(r.value);
                        setRatioPopoverOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-mono transition-colors cursor-pointer border",
                        aspectRatio === r.value
                          ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/20 font-bold"
                          : "bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-zinc-600 dark:text-zinc-400"
                      )}
                    >
                      <div className="text-left">
                        <span className="block font-bold">{r.label}</span>
                        <span className="text-[9px] opacity-70 block">{r.desc}</span>
                      </div>
                      {aspectRatio === r.value && <Check className="w-3.5 h-3.5 text-violet-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Camera Motion Compass Pill */}
            {mode !== "first_to_last_frame" && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    closeAllPopovers();
                    setMotionPopoverOpen(!motionPopoverOpen);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm",
                    motionPopoverOpen
                      ? "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-300"
                      : "bg-white dark:bg-[#16161f] hover:bg-zinc-50 dark:hover:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] text-zinc-800 dark:text-zinc-200"
                  )}
                  title="Camera Motion Vector"
                >
                  <activeMotion.icon className={cn("w-3.5 h-3.5", motionPopoverOpen ? "text-violet-500" : "text-zinc-500 dark:text-zinc-400")} />
                  <span className="hidden sm:inline">{activeMotion.label}</span>
                  <span className="sm:hidden">{activeMotion.label.split(" ")[0]}</span>
                  <ChevronUp
                    className={cn("w-3 h-3 text-zinc-400 transition-transform", motionPopoverOpen && "rotate-180")}
                  />
                </button>

                {motionPopoverOpen && (
                  <div
                    data-lenis-prevent="true"
                    className="absolute bottom-full left-0 mb-2 w-72 rounded-2xl bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-3 z-50 animate-slide-up space-y-2.5"
                  >
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold">
                        Camera Motion Vector
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {MOTIONS.map((m) => {
                        const isSelected = motion === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setMotion(m.id);
                              setMotionPopoverOpen(false);
                            }}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-xl border text-left font-mono text-xs transition-all cursor-pointer",
                              isSelected
                                ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/20 shadow-sm"
                                : "bg-zinc-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white"
                            )}
                          >
                            <m.icon className="w-3.5 h-3.5 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-bold block truncate">{m.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Speed / Intensity */}
                    <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1.5">
                        Motion Intensity:
                      </span>
                      <div className="grid grid-cols-4 gap-1 font-mono">
                        {SPEED_PROFILES.map((sp) => (
                          <button
                            key={sp.value}
                            type="button"
                            onClick={() => setMotionIntensity(sp.value)}
                            className={cn(
                              "py-1 text-center rounded-lg text-[10px] border transition-colors cursor-pointer",
                              motionIntensity === sp.value
                                ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/20 font-bold shadow-sm"
                                : "bg-zinc-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                            )}
                          >
                            {sp.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Duration Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  closeAllPopovers();
                  setDurationPopoverOpen(!durationPopoverOpen);
                }}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm",
                  durationPopoverOpen
                    ? "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-300"
                    : "bg-white dark:bg-[#16161f] hover:bg-zinc-50 dark:hover:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] text-zinc-800 dark:text-zinc-200"
                )}
                title="Select Duration"
              >
                <Clock className={cn("w-3 h-3", durationPopoverOpen ? "text-violet-500" : "text-zinc-400")} />
                <span>{duration}s</span>
                <ChevronUp
                  className={cn("w-3 h-3 text-zinc-400 transition-transform", durationPopoverOpen && "rotate-180")}
                />
              </button>

              {durationPopoverOpen && (
                <div
                  data-lenis-prevent="true"
                  className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-3 z-50 animate-slide-up space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold">
                      Clip Duration
                    </span>
                    <span className="text-xs font-bold font-mono text-zinc-950 dark:text-white">
                      {duration} SECONDS
                    </span>
                  </div>

                  <div className="flex items-center gap-1 font-mono">
                    {DURATION_PRESETS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDuration(d)}
                        className={cn(
                          "flex-1 py-1 rounded text-[10px] border text-center transition-colors cursor-pointer",
                          duration === d
                            ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/20 font-bold shadow-sm"
                            : "bg-zinc-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                        )}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>

                  <input
                    type="range"
                    min={2}
                    max={30}
                    step={1}
                    value={duration}
                    onChange={(e) => setDuration(parseFloat(e.target.value))}
                    className="w-full accent-violet-600 cursor-pointer"
                  />

                  {/* Seamless Loop Option */}
                  <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-800 dark:text-zinc-200">
                      <Repeat className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Seamless Loop</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={loop}
                      onChange={(e) => setLoop(e.target.checked)}
                      className="h-4 w-4 rounded border-black/[0.1] dark:border-white/[0.1] accent-violet-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. Resolution & FPS Master Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  closeAllPopovers();
                  setSpecPopoverOpen(!specPopoverOpen);
                }}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm",
                  specPopoverOpen
                    ? "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-300"
                    : "bg-white dark:bg-[#16161f] hover:bg-zinc-50 dark:hover:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] text-zinc-800 dark:text-zinc-200"
                )}
                title="Resolution, FPS, Quality"
              >
                <Gauge className={cn("w-3 h-3", specPopoverOpen ? "text-violet-500" : "text-zinc-400")} />
                <span>{resolution} • {fps}fps</span>
                <ChevronUp
                  className={cn("w-3 h-3 text-zinc-400 transition-transform", specPopoverOpen && "rotate-180")}
                />
              </button>

              {specPopoverOpen && (
                <div
                  data-lenis-prevent="true"
                  className="absolute bottom-full left-0 sm:left-auto sm:right-0 mb-2 w-72 rounded-2xl bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-3 z-50 animate-slide-up space-y-3"
                >
                  {/* Resolution */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold block">
                      Resolution
                    </span>
                    <div className="grid grid-cols-2 gap-1 font-mono">
                      {RESOLUTIONS.map((res) => (
                        <button
                          key={res.value}
                          type="button"
                          onClick={() => setResolution(res.value)}
                          className={cn(
                            "p-1.5 text-center rounded-lg border text-[11px] transition-colors cursor-pointer",
                            resolution === res.value
                              ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/20 font-bold shadow-sm"
                              : "bg-zinc-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                          )}
                        >
                          <span className="block font-bold">{res.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frame Rate */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold block">
                      Frame Rate
                    </span>
                    <div className="grid grid-cols-3 gap-1 font-mono">
                      {FPS_PROFILES.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setFps(p.value)}
                          className={cn(
                            "p-1.5 text-center rounded-lg border text-[10px] transition-colors cursor-pointer",
                            fps === p.value
                              ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/20 font-bold shadow-sm"
                              : "bg-zinc-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold block">
                      Quality Profile
                    </span>
                    <div className="grid grid-cols-3 gap-1 font-mono">
                      {QUALITY_PROFILES.map((qp) => (
                        <button
                          key={qp.value}
                          type="button"
                          onClick={() => setQuality(qp.value)}
                          className={cn(
                            "p-1.5 text-center rounded-lg border text-[10px] transition-colors cursor-pointer",
                            quality === qp.value
                              ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/20 font-bold shadow-sm"
                              : "bg-zinc-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                          )}
                        >
                          {qp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Action: Render Button */}
          <button
            type="button"
            onClick={requestVideoConfirm}
            disabled={loading || !isFormValid()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 font-heading font-extrabold text-xs sm:text-sm tracking-tight disabled:opacity-40 transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-current" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  Render {model === "ffmpeg_local" ? "(100% Free)" : `• ₹${videoCostInr.toFixed(2)} ($${videoCostUsd.toFixed(2)})`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Vault Picker Modal */}
      {vaultOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
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

            <div
              data-lenis-prevent="true"
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              className="p-4 overflow-y-auto flex-1 custom-scrollbar"
            >
              {loadingVault ? (
                <div className="py-12 text-center text-xs text-zinc-500 font-mono flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                  Loading vault images...
                </div>
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
                      className="group rounded-xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06] hover:border-violet-500/50 hover:ring-2 hover:ring-violet-500/20 text-left transition-all relative aspect-video bg-zinc-100 dark:bg-[#0d0d14] cursor-pointer"
                    >
                      <img
                        src={getMediaUrl(img.url)}
                        alt={img.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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

      {/* Confirmation & Authorization Modal */}
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

      {/* Interactive 5-Step Visual Studio Guide */}
      <HowItWorksModal isOpen={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
    </div>
  );
}

export default function VideoStudio() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
          <span className="text-xs text-zinc-500 font-mono">Loading Video Motion Studio...</span>
        </div>
      }
    >
      <VideoStudioContent />
    </Suspense>
  );
}
