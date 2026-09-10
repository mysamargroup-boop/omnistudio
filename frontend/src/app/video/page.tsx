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
  RotateCw,
  Upload,
  Dices,
  Repeat,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Wand2,
  CheckCircle2,
  Plus,
  Trash2,
  PanelRightClose,
  PanelRightOpen,
  Eye,
  SlidersHorizontal,
  User,
  UserCheck,
  Scissors,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import GenerationConfirmModal, { GenerationConfirmDetails } from "@/components/ui/GenerationConfirmModal";
import LiveProgressBar, { LogEntry } from "@/components/ui/LiveProgressBar";
import HowItWorksModal from "@/components/ui/HowItWorksModal";
import LazyImage from "@/components/ui/LazyImage";
import CharacterStudioModal, { CharacterData } from "@/components/video/CharacterStudioModal";
import VideoEditorModal from "@/components/video/VideoEditorModal";

type VideoMode = "first_frame" | "first_to_last_frame" | "multi_frame" | "text_to_video" | "motion_transfer" | "video_editor";

interface VideoModelOption {
  value: string;
  label: string;
  description: string;
  badge?: string;
  category?: string;
}

const VIDEO_MODELS: VideoModelOption[] = [
  {
    value: "ffmpeg_local",
    label: "Local Ken Burns / Morph",
    description: "Fast Local FFmpeg (100% Free)",
    badge: "FREE LOCAL",
    category: "Hardware Engine",
  },
  {
    value: "google_veo",
    label: "Google Veo 3.1 / 2 (DeepMind)",
    description: "High-Definition 4K Video Generation (Google Cloud AI)",
    badge: "ACTIVE",
    category: "Featured Cloud",
  },
  {
    value: "kling_2.0",
    label: "Kling AI 2.0 Pro",
    description: "Photorealistic Physics & High Dynamic Kinematics",
    badge: "PRO",
    category: "Featured Cloud",
  },
  {
    value: "runway_gen3",
    label: "Runway Gen-3 Alpha Turbo",
    description: "Ultra-Realistic Cinema Motion Coherence & Camera Controls",
    badge: "CINEMA",
    category: "Featured Cloud",
  },
  {
    value: "luma_dream",
    label: "Luma Dream Machine 1.5",
    description: "Consistent 3D Camera Parallax & Fluid Dynamics",
    badge: "CLOUD",
    category: "Cloud SOTA",
  },
  {
    value: "minimax_video",
    label: "Minimax Hailuo Video-01",
    description: "Cinematic Resolution & Natural Human Kinetics",
    badge: "SOTA",
    category: "Cloud SOTA",
  },
  {
    value: "seedance_v1",
    label: "ByteDance Seedance 1.0",
    description: "High-Fidelity Character & Dance Choreography",
    badge: "DANCE",
    category: "Cloud SOTA",
  },
  {
    value: "hunyuan_video",
    label: "Tencent HunyuanVideo",
    description: "Open-Weights High Definition Video Diffusion",
    badge: "OPEN",
    category: "Open Weights",
  },
  {
    value: "openai_sora",
    label: "OpenAI Sora",
    description: "World Simulator & Complex Multi-Shot Kinematics",
    badge: "CLOUD",
    category: "Cloud SOTA",
  },
  {
    value: "pika_v2",
    label: "Pika 2.0",
    description: "Creative Stylized Motion & Kinetic Lens Effects",
    badge: "FAST",
    category: "Cloud SOTA",
  },
];

// Default camera motion must be "none" (Static Camera)
const MOTIONS = [
  { id: "none", label: "Static / None", desc: "Locked-off Camera (No Motion)", icon: Video },
  { id: "zoom_in", label: "Push In", desc: "Dramatic Approach", icon: ZoomIn },
  { id: "zoom_out", label: "Pull Out", desc: "Expansive Reveal", icon: ZoomOut },
  { id: "pan_left", label: "Pan Left", desc: "Horizontal Sweep", icon: ArrowLeft },
  { id: "pan_right", label: "Pan Right", desc: "Horizontal Sweep", icon: ArrowRight },
  { id: "tilt_up", label: "Tilt Up", desc: "Ascending Angle", icon: ArrowUp },
  { id: "tilt_down", label: "Tilt Down", desc: "Descending Angle", icon: ArrowDown },
  { id: "orbit", label: "Orbital Arc", desc: "Circular Parallax", icon: Compass },
  { id: "subtle", label: "Subtle Float", desc: "Organic Handheld", icon: Wind },
];

const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9", desc: "Cinema / YouTube" },
  { value: "9:16", label: "9:16", desc: "Reels / TikTok" },
  { value: "1:1", label: "1:1", desc: "Square Feed" },
  { value: "21:9", label: "21:9", desc: "Cinemascope" },
];

const RESOLUTIONS = [
  { value: "720p", label: "720p HD", desc: "Fast Mobile" },
  { value: "1080p", label: "1080p FHD", desc: "Standard Master" },
  { value: "2k", label: "2K QHD", desc: "1440p High Res" },
  { value: "4k", label: "4K UHD", desc: "2160p Cinema Master" },
];

const FPS_PROFILES = [
  { value: 24, label: "24 FPS", desc: "Cinematic Film" },
  { value: 30, label: "30 FPS", desc: "Standard" },
  { value: 60, label: "60 FPS", desc: "High Frame Rate" },
];

const QUALITY_PROFILES = [
  { value: "draft", label: "Draft", desc: "Fast Render" },
  { value: "balanced", label: "Production", desc: "Crisp Quality" },
  { value: "cinema", label: "Cinema Master", desc: "ProRes RAW" },
];

const DURATION_PRESETS = [4, 8, 12, 16, 24, 30];

const INSPIRATION_VIDEOS = [
  {
    title: "Cyberpunk Tokyo Drift",
    prompt: "Cinematic drone tracking shot through neon-lit futuristic Tokyo alleyways in heavy rain, puddles reflecting magenta holographic signs, 4k 60fps photorealistic",
    motion: "none",
  },
  {
    title: "Rainforest Temple Reveal",
    prompt: "Slow ascending tilt up revealing an ancient overgrown Mayan pyramid nestled deep within misty bioluminescent jungle at dawn, sun rays piercing foliage",
    motion: "tilt_up",
  },
  {
    title: "Liquid Gold Lotus",
    prompt: "Macro slow motion shot of molten 24k gold splashing outward and gracefully coalescing into a blooming sacred lotus blossom, studio chiaroscuro lighting",
    motion: "subtle",
  },
  {
    title: "Pacific Coastline Highway",
    prompt: "Kinetic low-angle sweep around a classic midnight blue sports car cruising along sunlit Big Sur California cliffside highway at golden hour",
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
  // Multi-Frame Sequence State (2 to 8 keyframes)
  const [keyframeImages, setKeyframeImages] = useState<string[]>([]);

  // Motion Transfer State
  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Character Lock State (Reference Image 1)
  const [characterModalOpen, setCharacterModalOpen] = useState(false);
  const [activeCharacter, setActiveCharacter] = useState<CharacterData | null>(null);

  // Video Editor & Upload Mode State
  const [editorVideoFile, setEditorVideoFile] = useState<File | null>(null);
  const [editorVideoUrl, setEditorVideoUrl] = useState("");
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [uploadingEditorVideo, setUploadingEditorVideo] = useState(false);
  const editorUploadInputRef = useRef<HTMLInputElement>(null);

  // Upload States
  const [uploadingStartImage, setUploadingStartImage] = useState(false);
  const [uploadingEndImage, setUploadingEndImage] = useState(false);
  const [uploadingMulti, setUploadingMulti] = useState(false);

  // Drag States
  const [startDragOver, setStartDragOver] = useState(false);
  const [endDragOver, setEndDragOver] = useState(false);

  // File Input Refs
  const startFileInputRef = useRef<HTMLInputElement>(null);
  const endFileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Prompt & Enhancer State
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [showNegativePrompt, setShowNegativePrompt] = useState(false);
  const [enhancingPrompt, setEnhancingPrompt] = useState(false);
  const [directing, setDirecting] = useState(false);
  const [directorNotes, setDirectorNotes] = useState<any>(null);

  // Auto-resize prompt textarea
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (promptTextareaRef.current) {
      promptTextareaRef.current.style.height = "auto";
      const scrollH = promptTextareaRef.current.scrollHeight;
      promptTextareaRef.current.style.height = `${Math.min(Math.max(scrollH, 44), 130)}px`;
    }
  }, [prompt]);

  // Video Settings (Camera motion defaults to "none")
  const [model, setModel] = useState("ffmpeg_local");
  const [motion, setMotion] = useState("none");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState(4);
  const [fps, setFps] = useState(30);
  const [resolution, setResolution] = useState("1080p");
  const [quality, setQuality] = useState("balanced");
  const [motionIntensity, setMotionIntensity] = useState(1.0);
  const [loop, setLoop] = useState(false);
  const [seed, setSeed] = useState("");
  const [modelSearchQuery, setModelSearchQuery] = useState("");

  // Right Sidebar & Stacked Accordions State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    model: false,
    motion: false,
    specs: false,
    render: false,
  });

  const toggleSection = (s: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [s]: !prev[s] }));
  };

  const toggleAllSections = () => {
    const allOpen = Object.values(openSections).every(Boolean);
    setOpenSections({
      model: !allOpen,
      motion: !allOpen,
      specs: !allOpen,
      render: !allOpen,
    });
  };

  // Modals & Vault
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultTarget, setVaultTarget] = useState<"start" | "end" | "multi">("start");
  const [vaultImages, setVaultImages] = useState<any[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);

  // Generation & Result State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Progress Bar Telemetry
  const [progress, setProgress] = useState(0);
  const [stageTitle, setStageTitle] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [telemetryLogs, setTelemetryLogs] = useState<LogEntry[]>([]);

  // Confirmation Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState<GenerationConfirmDetails | null>(null);

  const activeModel = VIDEO_MODELS.find((m) => m.value === model) || VIDEO_MODELS[0];
  const activeMotion = MOTIONS.find((m) => m.id === motion) || MOTIONS[0];

  // URL query sync
  useEffect(() => {
    const qImg = searchParams?.get("image");
    if (qImg) {
      setStartImage(qImg);
      setMode("first_frame");
    }
    const qMode = searchParams?.get("mode");
    if (qMode && ["first_frame", "first_to_last_frame", "multi_frame", "text_to_video", "motion_transfer"].includes(qMode)) {
      setMode(qMode as VideoMode);
    }
    const qModel = searchParams?.get("model");
    if (qModel) {
      const found = VIDEO_MODELS.find((m) => m.value === qModel);
      if (found) setModel(qModel);
    }
  }, [searchParams]);

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 999999999).toString());
  };

  const openVaultPicker = async (target: "start" | "end" | "multi") => {
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
      if (url) setStartImage(url);
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
      if (url) setEndImage(url);
    } catch (err) {
      console.error("Failed to upload end keyframe:", err);
    } finally {
      setUploadingEndImage(false);
    }
  };

  const handleMultiImageUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;
    setUploadingMulti(true);
    const availableSlots = Math.max(0, 8 - keyframeImages.length);
    const selected = fileArray.slice(0, availableSlots);

    for (const f of selected) {
      try {
        const res = await api.uploadVideoKeyframe(f);
        const url = typeof res === "string" ? res : res?.url;
        if (url) {
          setKeyframeImages((prev) => [...prev, url]);
        }
      } catch (e) {
        console.error("Error uploading multi image:", e);
      }
    }
    setUploadingMulti(false);
  };

  const removeKeyframeImage = (index: number) => {
    setKeyframeImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoFileProcess = async (file: File) => {
    if (!file) return;
    setUploadingVideo(true);
    try {
      const res = await api.uploadSourceVideo(file);
      const url = typeof res === "string" ? res : res?.url;
      if (url) setSourceVideoUrl(url);
    } catch (err) {
      console.error("Failed to upload source video:", err);
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleEditorVideoUpload = async (file: File) => {
    if (!file) return;
    setUploadingEditorVideo(true);
    try {
      const res = await api.uploadVideo(file);
      const url = res?.url || (typeof res === "string" ? res : "");
      if (url) {
        setEditorVideoUrl(url);
        setEditorVideoFile(file);
      }
    } catch (err) {
      console.error("Failed to upload video for editor:", err);
    } finally {
      setUploadingEditorVideo(false);
    }
  };

  // 1-Click Prompt Enhancer
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) {
      setPrompt("Cinematic sequence, dramatic atmospheric lighting, photorealistic 8k, slow motion");
      return;
    }
    setEnhancingPrompt(true);
    try {
      const res = await api.enhancePrompt({ prompt, enhance_style: "cinematic" });
      if (res?.enhanced) {
        setPrompt(res.enhanced);
      }
    } catch (err) {
      console.error("Failed to enhance prompt:", err);
    } finally {
      setEnhancingPrompt(false);
    }
  };

  // OpenAI Director Agent
  const runDirectorAgent = async () => {
    const inputIdea =
      prompt.trim() ||
      (mode === "first_to_last_frame"
        ? "Interpolate keyframes with cinematic motion"
        : "Dynamic camera tracking shot");
    setDirecting(true);
    try {
      const res = await api.directVideoPrompt({
        idea: inputIdea,
        generation_mode: mode === "multi_frame" ? "first_to_last_frame" : mode,
        target_video_model: model,
        style: "cinematic",
        aspect_ratio: aspectRatio,
      });

      if (res.success) {
        setPrompt(res.enhanced_prompt);
        if (res.camera_direction) setMotion(res.camera_direction);
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

  // Validation
  const isFormValid = () => {
    if (mode === "first_frame") return !!startImage.trim();
    if (mode === "first_to_last_frame") return !!startImage.trim() && !!endImage.trim();
    if (mode === "multi_frame") return keyframeImages.length >= 2;
    if (mode === "text_to_video") return !!prompt.trim();
    if (mode === "motion_transfer") return !!startImage.trim() && !!sourceVideoUrl.trim();
    return false;
  };

  // Initiate Generation with Confirmation
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

  // Synthesis Execution
  const generate = async () => {
    setLoading(true);
    setResult(null);
    setProgress(10);
    setStageTitle("01 • Initializing Frame Buffer");
    setStatusMessage(`Preparing ${resolution} canvas pipeline...`);
    setElapsedSeconds(0);
    const nowTime = new Date().toTimeString().split(" ")[0];
    setTelemetryLogs([
      { timestamp: nowTime, message: `Started ${mode.toUpperCase()} synthesis on ${activeModel.label}...` },
    ]);

    const startTimestamp = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed === 1) {
        setProgress(28);
        setStageTitle("02 • Calculating Kinematics");
        setStatusMessage(`Applying camera vector: ${activeMotion.label} (${resolution}, ${fps} FPS)...`);
      } else if (elapsed === 3) {
        setProgress(58);
        setStageTitle("03 • Interpolating Frames");
        setStatusMessage("Hardware-accelerated frame interpolation running...");
      } else if (elapsed === 6) {
        setProgress(82);
        setStageTitle("04 • FFmpeg ProRes Encoding");
        setStatusMessage(`Encoding libx264 container at ${aspectRatio}...`);
      } else if (elapsed >= 9 && elapsed < 16) {
        setProgress((prev) => Math.min(prev + 2, 95));
      }
    }, 1000);

    try {
      const payload: any = {
        mode,
        start_image_path: mode === "multi_frame" ? keyframeImages[0] : startImage,
        end_image_path: mode === "multi_frame" ? keyframeImages[keyframeImages.length - 1] : mode === "first_to_last_frame" ? endImage : null,
        image_paths: mode === "multi_frame" ? keyframeImages : undefined,
        source_video_path: mode === "motion_transfer" ? sourceVideoUrl : null,
        prompt,
        negative_prompt: negativePrompt,
        motion_type: motion,
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setLoading(false);
    }
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

  const videoCostUsd = model === "ffmpeg_local" ? 0 : duration * 0.15;
  const videoCostInr = Math.round(videoCostUsd * 83.5 * 100) / 100;

  return (
    <div className="relative h-[calc(100vh-4rem)] flex flex-col overflow-hidden font-jakarta bg-[#fafafa] dark:bg-[#06060a]">
      {/* Top Header: Mode Switcher Tabs + Active Engine Indicator + Sidebar Toggle */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-b border-black/[0.06] dark:border-white/[0.06] bg-white/80 dark:bg-[#0c0c12]/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex-wrap">
          <button
            type="button"
            onClick={() => setMode("first_frame")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
              mode === "first_frame"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>First Frame</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("first_to_last_frame")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
              mode === "first_to_last_frame"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>First + Last Frame</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("multi_frame")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
              mode === "multi_frame"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
          >
            <Layers className="h-3.5 w-3.5 text-emerald-500" />
            <span>Multi-Frame (2-8)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
              NEW
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode("text_to_video")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
              mode === "text_to_video"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Text to Video</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("motion_transfer")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
              mode === "motion_transfer"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Motion Transfer</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("video_editor")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
              mode === "video_editor"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
          >
            <Scissors className="h-3.5 w-3.5 text-amber-500" />
            <span>Video Editor</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
              RECUT
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Character Lock Button (Reference Image 1) */}
          <button
            type="button"
            onClick={() => setCharacterModalOpen(true)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 border",
              activeCharacter?.isLocked
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-sm"
                : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-emerald-500/40"
            )}
          >
            {activeCharacter?.imageUrl ? (
              <img
                src={getMediaUrl(activeCharacter.imageUrl)}
                alt={activeCharacter.name}
                className="w-4 h-4 rounded-full object-cover border border-emerald-500"
              />
            ) : (
              <User className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <span>{activeCharacter?.isLocked ? `Locked: ${activeCharacter.name}` : "Character Lock"}</span>
            {activeCharacter?.isLocked && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          {/* Active Model Indicator in GREEN */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
            <span className="truncate max-w-[180px]">ENGINE: {activeModel.label}</span>
          </div>

          <button
            type="button"
            onClick={() => setHowItWorksOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">Studio Guide</span>
          </button>

          {/* Right Sidebar Toggle Button */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border shrink-0",
              sidebarOpen
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold"
                : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
            )}
            title="Toggle Settings Sidebar"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-semibold">Settings</span>
            {sidebarOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Viewport: Canvas on Left + Settings Sidebar on Right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Workspace / Canvas */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto p-4 sm:p-6 custom-scrollbar relative">
          <div className="max-w-4xl w-full mx-auto space-y-6">
            {/* 1. Progress Telemetry */}
            {loading && (
              <div className="w-full max-w-2xl mx-auto py-8 space-y-6 animate-in fade-in duration-200">
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

            {/* 2. Render Completed Video Player */}
            {!loading && result && result.success && (
              <div className="w-full space-y-4 animate-in fade-in duration-200">
                <div className="relative rounded-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06] bg-zinc-50 dark:bg-[#111118] shadow-sm max-w-4xl mx-auto">
                  <video
                    src={getMediaUrl(result.url)}
                    controls
                    autoPlay
                    loop={loop}
                    className="w-full aspect-video object-contain bg-black"
                    onMouseEnter={(e) => {
                      try {
                        e.currentTarget.muted = false;
                        e.currentTarget.volume = 0.8;
                        e.currentTarget.play().catch(() => {});
                      } catch {}
                    }}
                    onMouseLeave={(e) => {
                      try {
                        e.currentTarget.pause();
                      } catch {}
                    }}
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/90 dark:bg-black/80 text-zinc-800 dark:text-zinc-100 border border-black/[0.08] dark:border-white/[0.15] backdrop-blur-md shadow-sm">
                      {result.mode?.toUpperCase() || "CINEMATIC"} • {fps} FPS • {aspectRatio}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 backdrop-blur-md flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>RENDERED</span>
                    </span>
                  </div>
                </div>

                <div className="max-w-4xl mx-auto p-4 rounded-2xl bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                    <button
                      type="button"
                      onClick={() => setResult(null)}
                      className="px-4 py-2 rounded-xl text-xs font-mono border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      New Generation
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorModalOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-mono font-bold transition-colors cursor-pointer"
                    >
                      <Scissors className="w-3.5 h-3.5 text-amber-500" />
                      <span>Edit Video</span>
                    </button>
                    <a
                      href={getMediaUrl(result.url)}
                      download
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-heading font-bold transition-all shadow-md active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download MP4</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Error Alert */}
            {!loading && result && !result.success && (
              <div className="w-full max-w-md mx-auto py-8 text-center space-y-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-6 shadow-sm">
                <p className="text-xs text-rose-600 dark:text-rose-400 font-mono leading-relaxed">
                  {result.error || "Video synthesis encountered an issue."}
                </p>
                <button
                  onClick={() => setResult(null)}
                  className="px-4 py-1.5 rounded-xl bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-xs font-mono hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-black/[0.08] dark:border-zinc-800 transition-colors shadow-sm cursor-pointer"
                >
                  Reset Canvas
                </button>
              </div>
            )}

            {/* 4. Canvas Staging & Keyframe Areas */}
            {!loading && !result && (
              <div className="space-y-6">
                {/* Mode: Multi-Frame Keyframe Sequence (2 to 8 Images) */}
                {mode === "multi_frame" && (
                  <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-950 dark:text-white">
                          Multi-Frame Keyframe Sequence ({keyframeImages.length}/8)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        Smooth Hardware-Accelerated Morph
                      </span>
                    </div>

                    <input
                      ref={multiFileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) handleMultiImageUpload(e.target.files);
                        e.target.value = "";
                      }}
                      disabled={uploadingMulti}
                    />

                    {/* Image Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {keyframeImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 aspect-video bg-zinc-100 dark:bg-zinc-900 group shadow-xs">
                          <LazyImage
                            src={getMediaUrl(imgUrl)}
                            alt={`Frame ${idx + 1}`}
                            aspectRatio="aspect-video"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1.5 left-1.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/80 text-white">
                            Frame #{idx + 1}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeKeyframeImage(idx)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-500/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Remove frame"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {/* Add Keyframe Slot Button (up to 8) */}
                      {keyframeImages.length < 8 && (
                        <button
                          type="button"
                          onClick={() => multiFileInputRef.current?.click()}
                          disabled={uploadingMulti}
                          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-500/5 aspect-video text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer"
                        >
                          {uploadingMulti ? (
                            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                          ) : (
                            <Plus className="w-5 h-5 text-emerald-500" />
                          )}
                          <span className="text-[11px] font-mono font-semibold">
                            {uploadingMulti ? "Uploading..." : "Add Keyframe"}
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-zinc-500 pt-1">
                      <span>Upload 2 to 8 images for fluid keyframe morphing</span>
                      <button
                        type="button"
                        onClick={() => openVaultPicker("multi")}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <FolderArchive className="w-3 h-3" />
                        <span>Pick from Vault</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Mode: First Frame Single Staging */}
                {mode === "first_frame" && (
                  <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl shadow-sm p-6 space-y-4 max-w-xl mx-auto">
                    <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-950 dark:text-white">
                          Start Keyframe
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openVaultPicker("start")}
                          className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 cursor-pointer"
                        >
                          <FolderArchive className="h-3 w-3" />
                          <span>Vault</span>
                        </button>
                      </div>
                    </div>

                    <input
                      ref={startFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleStartImageUpload(f);
                        e.target.value = "";
                      }}
                      disabled={uploadingStartImage}
                    />

                    {startImage ? (
                      <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 aspect-video bg-zinc-100 dark:bg-zinc-900 group shadow-sm">
                        <LazyImage
                          src={getMediaUrl(startImage)}
                          alt="Start Frame"
                          aspectRatio="aspect-video"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => startFileInputRef.current?.click()}
                            className="px-2.5 py-1.5 rounded-lg bg-white/20 text-white text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            <span>Replace</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setStartImage("")}
                            className="p-1.5 rounded-lg bg-rose-500/80 text-white cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => startFileInputRef.current?.click()}
                        className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl aspect-video flex flex-col items-center justify-center gap-2.5 p-6 cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-900/50"
                      >
                        {uploadingStartImage ? (
                          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                        ) : (
                          <Upload className="h-6 w-6 text-emerald-500" />
                        )}
                        <div className="text-center">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                            {uploadingStartImage ? "Uploading..." : "Click or drag start keyframe image"}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">PNG, JPG, WEBP up to 25MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mode: First + Last Dual Frame Staging */}
                {mode === "first_to_last_frame" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Start Frame */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-mono uppercase font-bold text-zinc-700 dark:text-zinc-300">
                          START FRAME (KEYFRAME 01)
                        </label>
                        <button
                          type="button"
                          onClick={() => openVaultPicker("start")}
                          className="text-[10px] font-mono text-zinc-500 hover:text-emerald-500"
                        >
                          Vault
                        </button>
                      </div>
                      {startImage ? (
                        <div className="relative rounded-xl overflow-hidden aspect-video border border-zinc-200 dark:border-zinc-800">
                          <LazyImage src={getMediaUrl(startImage)} alt="Start" aspectRatio="aspect-video" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setStartImage("")}
                            className="absolute top-2 right-2 p-1 rounded-md bg-black/60 text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startFileInputRef.current?.click()}
                          className="w-full aspect-video border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-1 text-xs text-zinc-500 hover:border-emerald-500"
                        >
                          <Upload className="w-4 h-4 text-emerald-500" />
                          <span>Upload Start Frame</span>
                        </button>
                      )}
                    </div>

                    {/* End Frame */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-mono uppercase font-bold text-zinc-700 dark:text-zinc-300">
                          END FRAME (KEYFRAME 02)
                        </label>
                        <button
                          type="button"
                          onClick={() => openVaultPicker("end")}
                          className="text-[10px] font-mono text-zinc-500 hover:text-emerald-500"
                        >
                          Vault
                        </button>
                      </div>
                      <input
                        ref={endFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleEndImageUpload(f);
                          e.target.value = "";
                        }}
                        disabled={uploadingEndImage}
                      />
                      {endImage ? (
                        <div className="relative rounded-xl overflow-hidden aspect-video border border-zinc-200 dark:border-zinc-800">
                          <LazyImage src={getMediaUrl(endImage)} alt="End" aspectRatio="aspect-video" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setEndImage("")}
                            className="absolute top-2 right-2 p-1 rounded-md bg-black/60 text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => endFileInputRef.current?.click()}
                          className="w-full aspect-video border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-1 text-xs text-zinc-500 hover:border-emerald-500"
                        >
                          <Upload className="w-4 h-4 text-emerald-500" />
                          <span>Upload End Frame</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Mode: Motion Transfer Staging */}
                {mode === "motion_transfer" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] space-y-3">
                      <label className="text-[11px] font-mono uppercase font-bold text-zinc-700 dark:text-zinc-300">
                        TARGET STILL IMAGE
                      </label>
                      {startImage ? (
                        <div className="relative rounded-xl overflow-hidden aspect-video border border-zinc-200 dark:border-zinc-800">
                          <LazyImage src={getMediaUrl(startImage)} alt="Target" aspectRatio="aspect-video" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startFileInputRef.current?.click()}
                          className="w-full aspect-video border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-1 text-xs text-zinc-500 hover:border-emerald-500"
                        >
                          <Upload className="w-4 h-4 text-emerald-500" />
                          <span>Upload Target Image</span>
                        </button>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] space-y-3">
                      <label className="text-[11px] font-mono uppercase font-bold text-zinc-700 dark:text-zinc-300">
                        SOURCE MOTION VIDEO
                      </label>
                      <input
                        ref={videoFileInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleVideoFileProcess(f);
                          e.target.value = "";
                        }}
                        disabled={uploadingVideo}
                      />
                      {sourceVideoUrl ? (
                        <div className="relative rounded-xl overflow-hidden aspect-video border border-zinc-200 dark:border-zinc-800 bg-black">
                          <video src={getMediaUrl(sourceVideoUrl)} controls className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => videoFileInputRef.current?.click()}
                          className="w-full aspect-video border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-1 text-xs text-zinc-500 hover:border-emerald-500"
                        >
                          {uploadingVideo ? <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> : <Film className="w-4 h-4 text-emerald-500" />}
                          <span>Upload Motion Reference Video</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Mode: Text to Video Inspiration Prompts */}
                {mode === "text_to_video" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
                      <span>Cinematic Scene Templates (Click to apply)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {INSPIRATION_VIDEOS.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPrompt(item.prompt);
                            setMotion(item.motion);
                          }}
                          className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0d0d14] hover:border-emerald-500/50 hover:bg-emerald-50/10 text-left transition-all group cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                              {item.title}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400 uppercase">
                              Motion: {item.motion}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                            {item.prompt}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mode: Video Editor Upload & Precision Studio */}
                {mode === "video_editor" && (
                  <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl shadow-sm p-6 space-y-5 max-w-2xl mx-auto">
                    <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
                      <div className="flex items-center gap-2">
                        <Scissors className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-950 dark:text-white">
                          Video Upload & Precision Editor
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        Trim • Speed • Aspect • Filters
                      </span>
                    </div>

                    <input
                      ref={editorUploadInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleEditorVideoUpload(f);
                        e.target.value = "";
                      }}
                      disabled={uploadingEditorVideo}
                    />

                    {editorVideoUrl ? (
                      <div className="space-y-4">
                        <div className="relative rounded-xl overflow-hidden aspect-video border border-zinc-200 dark:border-zinc-800 bg-black">
                          <video
                            src={getMediaUrl(editorVideoUrl)}
                            controls
                            className="w-full h-full object-contain"
                            onMouseEnter={(e) => {
                              try {
                                e.currentTarget.muted = false;
                                e.currentTarget.volume = 0.8;
                                e.currentTarget.play().catch(() => {});
                              } catch {}
                            }}
                            onMouseLeave={(e) => {
                              try {
                                e.currentTarget.pause();
                              } catch {}
                            }}
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-0.5 font-mono text-xs">
                            <p className="font-semibold text-zinc-900 dark:text-white truncate max-w-xs">
                              {editorVideoFile?.name || "Uploaded Video"}
                            </p>
                            <p className="text-[10px] text-zinc-500">Ready for editing and adjustments</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => editorUploadInputRef.current?.click()}
                              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-mono hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              Replace Video
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditorModalOpen(true)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-heading font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                            >
                              <Scissors className="w-3.5 h-3.5" />
                              <span>Launch Precision Editor</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => editorUploadInputRef.current?.click()}
                        className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl aspect-video flex flex-col items-center justify-center gap-2.5 p-6 cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-900/50"
                      >
                        {uploadingEditorVideo ? (
                          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                        ) : (
                          <Upload className="h-6 w-6 text-emerald-500" />
                        )}
                        <div className="text-center">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                            {uploadingEditorVideo ? "Uploading Video..." : "Click or drag video file to edit"}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">MP4, WEBM, MOV up to 200MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prompt Control Bar Pinned at Bottom of Canvas */}
          <div className="max-w-4xl w-full mx-auto mt-4 pt-2">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#0e0e16]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] shadow-lg space-y-3">
              {/* Active Character Lock Pill (Reference Image 1) */}
              {activeCharacter?.isLocked && (
                <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    {activeCharacter.imageUrl && (
                      <img
                        src={getMediaUrl(activeCharacter.imageUrl)}
                        alt={activeCharacter.name}
                        className="w-7 h-7 rounded-lg object-cover border border-emerald-500 shadow-xs"
                      />
                    )}
                    <div>
                      <span className="font-bold font-heading text-xs block">{activeCharacter.name}</span>
                      <span className="text-[10px] font-mono text-emerald-700/80 dark:text-emerald-300/80">
                        Character identity locked for consistent generations
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCharacterModalOpen(true)}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-200 transition-colors cursor-pointer"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCharacter(null)}
                      className="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                      title="Unlock Character"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Action Icons Row: 1-Click Prompt Enhancer + Director + Negative Prompt */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* 1-Click Improve Prompt Button */}
                  <button
                    type="button"
                    onClick={handleEnhancePrompt}
                    disabled={enhancingPrompt}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-semibold cursor-pointer shadow-xs transition-all active:scale-95"
                    title="1-Click AI Prompt Enhancer"
                  >
                    <Wand2 className={cn("h-3.5 w-3.5 text-purple-600 dark:text-purple-400", enhancingPrompt && "animate-spin")} />
                    <span>{enhancingPrompt ? "Enhancing..." : "Improve Prompt"}</span>
                  </button>

                  {/* AI Director Agent */}
                  <button
                    type="button"
                    onClick={runDirectorAgent}
                    disabled={directing}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-mono cursor-pointer transition-all"
                    title="OpenAI Visual Director"
                  >
                    <Sparkle className={cn("h-3 w-3 text-amber-500", directing && "animate-spin")} />
                    <span>Director Agent</span>
                  </button>

                  {/* Negative Prompt Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowNegativePrompt(!showNegativePrompt)}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-xs font-mono transition-colors cursor-pointer",
                      showNegativePrompt
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    )}
                  >
                    Negative Prompt
                  </button>
                </div>

                <div className="text-[11px] font-mono text-zinc-400">
                  {prompt.length} chars
                </div>
              </div>

              {/* Negative Prompt Drawer */}
              {showNegativePrompt && (
                <div className="animate-in slide-in-from-top-2 duration-150">
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Exclude unwanted visuals (e.g. blurry, watermark, bad anatomy, jitter)..."
                    className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
                  />
                </div>
              )}

              {/* Textarea + Submit Row */}
              <div className="flex items-end gap-2.5">
                <textarea
                  ref={promptTextareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    mode === "first_frame"
                      ? "Describe camera movement, lighting changes, or visual effects over the keyframe..."
                      : mode === "multi_frame"
                      ? "Describe the visual transition dynamics between the sequence of frames..."
                      : mode === "text_to_video"
                      ? "Describe your scene in cinematic detail (e.g., drone shot through misty cyberpunk alley)..."
                      : "Describe the desired motion synthesis..."
                  }
                  rows={2}
                  className="flex-1 bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 resize-none font-sans leading-relaxed"
                />

                <button
                  type="button"
                  onClick={requestVideoConfirm}
                  disabled={loading || !isFormValid()}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white font-heading font-bold text-xs sm:text-sm tracking-tight transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap shrink-0 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        Generate {model === "ffmpeg_local" ? "(Free)" : `• ₹${videoCostInr.toFixed(0)}`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Settings Sidebar (Collapsible with Stacked Close Accordions & Independent Scroll) */}
        {sidebarOpen && (
          <aside className="w-80 lg:w-96 flex-shrink-0 bg-white dark:bg-[#0c0c14] border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-full overflow-hidden transition-all duration-300 shadow-lg z-10">
            {/* Sidebar Header with Stacked Close Toggle All */}
            <div className="flex-shrink-0 p-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-heading font-extrabold uppercase tracking-wider text-zinc-900 dark:text-white">
                  Studio Settings
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleAllSections}
                  className="text-[10px] font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-white px-2 py-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Toggle all accordion sections"
                >
                  {Object.values(openSections).every(Boolean) ? "Collapse All" : "Expand All"}
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  title="Close sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Accordions Container (Independent Scroll) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
              {/* Section 1: AI Model & Engine (Active in GREEN) */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("model")}
                  className="w-full p-3 flex items-center justify-between text-left font-mono text-xs font-bold text-zinc-900 dark:text-white hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Film className="w-3.5 h-3.5 text-emerald-500" />
                    <span>AI VIDEO MODEL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold truncate max-w-[110px]">
                      {activeModel.badge || "ACTIVE"}
                    </span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform duration-200", openSections.model && "rotate-180")} />
                  </div>
                </button>

                {openSections.model && (
                  <div className="p-3 pt-0 space-y-2 border-t border-zinc-100 dark:border-zinc-800/50">
                    <div className="relative my-2">
                      <Search className="w-3 h-3 text-zinc-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={modelSearchQuery}
                        onChange={(e) => setModelSearchQuery(e.target.value)}
                        placeholder="Search model..."
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-7 pr-2.5 py-1.5 text-[11px] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                      {filteredModels.map((m) => {
                        const isSelected = model === m.value;
                        return (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => setModel(m.value)}
                            className={cn(
                              "w-full p-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer flex items-start justify-between gap-2",
                              isSelected
                                ? "border border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500/30 shadow-xs"
                                : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border border-transparent"
                            )}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={cn("text-xs font-bold font-heading truncate", isSelected && "text-emerald-700 dark:text-emerald-400")}>
                                  {m.label}
                                </span>
                                {m.badge && (
                                  <span className={cn("text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase", isSelected ? "bg-emerald-500 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400")}>
                                    {m.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-zinc-400 truncate">{m.description}</p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Camera Motion (Default: None / Static) */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("motion")}
                  className="w-full p-3 flex items-center justify-between text-left font-mono text-xs font-bold text-zinc-900 dark:text-white hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-emerald-500" />
                    <span>CAMERA MOTION</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
                      {activeMotion.label}
                    </span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform duration-200", openSections.motion && "rotate-180")} />
                  </div>
                </button>

                {openSections.motion && (
                  <div className="p-3 pt-0 space-y-3 border-t border-zinc-100 dark:border-zinc-800/50">
                    <div className="grid grid-cols-2 gap-1.5 my-2">
                      {MOTIONS.map((m) => {
                        const Icon = m.icon;
                        const isSelected = motion === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMotion(m.id)}
                            className={cn(
                              "flex items-center gap-1.5 p-2 rounded-lg text-left text-xs transition-all cursor-pointer",
                              isSelected
                                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 font-bold shadow-xs"
                                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-800/60"
                            )}
                          >
                            <Icon className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-emerald-500" : "text-zinc-400")} />
                            <span className="truncate">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Motion Intensity Slider */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                        <span>Motion Intensity</span>
                        <span className="font-bold text-zinc-900 dark:text-white">{motionIntensity}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={motionIntensity}
                        onChange={(e) => setMotionIntensity(parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Aspect Ratio, Resolution & FPS */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("specs")}
                  className="w-full p-3 flex items-center justify-between text-left font-mono text-xs font-bold text-zinc-900 dark:text-white hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
                    <span>FORMAT & RESOLUTION</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
                      {aspectRatio} • {resolution}
                    </span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform duration-200", openSections.specs && "rotate-180")} />
                  </div>
                </button>

                {openSections.specs && (
                  <div className="p-3 pt-0 space-y-3.5 border-t border-zinc-100 dark:border-zinc-800/50">
                    {/* Aspect Ratio */}
                    <div className="space-y-1.5 my-2">
                      <span className="text-[10px] font-mono font-semibold text-zinc-400 uppercase">Aspect Ratio</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {ASPECT_RATIOS.map((ar) => (
                          <button
                            key={ar.value}
                            type="button"
                            onClick={() => setAspectRatio(ar.value)}
                            className={cn(
                              "py-1.5 text-center text-xs font-mono rounded-lg border transition-all cursor-pointer",
                              aspectRatio === ar.value
                                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold"
                                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            )}
                          >
                            {ar.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Resolution */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono font-semibold text-zinc-400 uppercase">Resolution</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {RESOLUTIONS.map((res) => (
                          <button
                            key={res.value}
                            type="button"
                            onClick={() => setResolution(res.value)}
                            className={cn(
                              "py-1.5 text-center text-xs font-mono rounded-lg border transition-all cursor-pointer",
                              resolution === res.value
                                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold"
                                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            )}
                          >
                            {res.value.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Framerate */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono font-semibold text-zinc-400 uppercase">Framerate (FPS)</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {FPS_PROFILES.map((f) => (
                          <button
                            key={f.value}
                            type="button"
                            onClick={() => setFps(f.value)}
                            className={cn(
                              "py-1.5 text-center text-xs font-mono rounded-lg border transition-all cursor-pointer",
                              fps === f.value
                                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold"
                                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            )}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Duration, Quality & Seed */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("render")}
                  className="w-full p-3 flex items-center justify-between text-left font-mono text-xs font-bold text-zinc-900 dark:text-white hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Repeat className="w-3.5 h-3.5 text-emerald-500" />
                    <span>DURATION & RENDER</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
                      {duration}s • {quality}
                    </span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform duration-200", openSections.render && "rotate-180")} />
                  </div>
                </button>

                {openSections.render && (
                  <div className="p-3 pt-0 space-y-3.5 border-t border-zinc-100 dark:border-zinc-800/50">
                    {/* Duration Presets */}
                    <div className="space-y-1.5 my-2">
                      <span className="text-[10px] font-mono font-semibold text-zinc-400 uppercase">Duration (Seconds)</span>
                      <div className="grid grid-cols-6 gap-1">
                        {DURATION_PRESETS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDuration(d)}
                            className={cn(
                              "py-1 text-center text-xs font-mono rounded-lg border transition-all cursor-pointer",
                              duration === d
                                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold"
                                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            )}
                          >
                            {d}s
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quality Profile */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono font-semibold text-zinc-400 uppercase">Render Quality</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {QUALITY_PROFILES.map((qp) => (
                          <button
                            key={qp.value}
                            type="button"
                            onClick={() => setQuality(qp.value)}
                            className={cn(
                              "py-1.5 text-center text-xs font-mono rounded-lg border transition-all cursor-pointer",
                              quality === qp.value
                                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold"
                                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            )}
                          >
                            {qp.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Loop Toggle */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <Repeat className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-mono text-zinc-800 dark:text-zinc-200 font-semibold">Loop Seamlessly</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLoop(!loop)}
                        className={cn(
                          "w-8 h-4 rounded-full transition-colors relative cursor-pointer",
                          loop ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                        )}
                      >
                        <div className={cn("w-3 h-3 rounded-full bg-white transition-transform absolute top-0.5", loop ? "left-4.5" : "left-0.5")} />
                      </button>
                    </div>

                    {/* Seed Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-zinc-400 uppercase">
                        <span>Seed (Reproducibility)</span>
                        <button
                          type="button"
                          onClick={randomizeSeed}
                          className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          <Dices className="w-3 h-3" />
                          <span>Random</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={seed}
                        onChange={(e) => setSeed(e.target.value)}
                        placeholder="Random seed (optional)"
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Bottom: Cost & Specs Summary */}
            <div className="flex-shrink-0 p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between text-xs font-mono">
              <div className="space-y-0.5">
                <span className="text-zinc-400 text-[10px] uppercase">Estimated Spend</span>
                <div className="font-bold text-zinc-900 dark:text-white">
                  {model === "ffmpeg_local" ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">100% Free Local</span>
                  ) : (
                    <span>₹{videoCostInr.toFixed(2)} (${videoCostUsd.toFixed(2)})</span>
                  )}
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold">
                {activeModel.badge || "ACTIVE"}
              </span>
            </div>
          </aside>
        )}
      </div>

      {/* Vault Picker Modal */}
      {vaultOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs text-zinc-950 dark:text-white font-semibold">
                <FolderArchive className="h-4 w-4 text-emerald-500" />
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

            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              {loadingVault ? (
                <div className="py-12 text-center text-xs text-zinc-500 font-mono flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
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
                        else if (vaultTarget === "end") setEndImage(img.url);
                        else if (vaultTarget === "multi") {
                          if (keyframeImages.length < 8) {
                            setKeyframeImages((prev) => [...prev, img.url]);
                          }
                        }
                        setVaultOpen(false);
                      }}
                      className="group rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:shadow-md text-left transition-all relative aspect-video bg-zinc-100 dark:bg-zinc-900 cursor-pointer"
                    >
                      <LazyImage
                        src={getMediaUrl(img.url)}
                        alt={img.filename}
                        aspectRatio="aspect-video"
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

      {/* Consistent Character Studio Modal (Reference Image 1) */}
      <CharacterStudioModal
        isOpen={characterModalOpen}
        onClose={() => setCharacterModalOpen(false)}
        activeCharacter={activeCharacter}
        onSelectCharacter={(char) => setActiveCharacter(char)}
        onUnlockCharacter={() => setActiveCharacter(null)}
      />

      {/* Video Precision Editor Modal */}
      {editorModalOpen && (
        <VideoEditorModal
          isOpen={editorModalOpen}
          onClose={() => setEditorModalOpen(false)}
          videoUrl={editorVideoUrl || (result?.url ? getMediaUrl(result.url) : "")}
          filename={editorVideoFile?.name || result?.filename || "video.mp4"}
          onSaved={(newAsset) => {
            setResult(newAsset);
            setEditorModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default function VideoStudio() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="text-xs text-zinc-500 font-mono">Loading Video Studio...</span>
        </div>
      }
    >
      <VideoStudioContent />
    </Suspense>
  );
}
