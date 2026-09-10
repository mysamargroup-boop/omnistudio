"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Sparkles,
  Video,
  Image as ImageIcon,
  Mic,
  Cpu,
  Play,
  Loader2,
  Download,
  FolderArchive,
  X,
  Check,
  Search,
  ChevronUp,
  Sliders,
  Maximize2,
  Clock,
  Gauge,
  Film,
  Sparkle,
  Wand2,
  Repeat,
  ArrowRightLeft,
  RotateCw,
  Upload,
  BookOpen,
  Volume2,
  Languages,
  ArrowRight,
  Sun,
  Layers,
  AlertTriangle,
  Copy,
  CheckCircle2,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import GenerationConfirmModal, { GenerationConfirmDetails } from "@/components/ui/GenerationConfirmModal";
import LiveProgressBar, { LogEntry } from "@/components/ui/LiveProgressBar";
import HowItWorksModal from "@/components/ui/HowItWorksModal";
import VideoEditorModal from "@/components/video/VideoEditorModal";
import ShareModal from "@/components/ui/ShareModal";

type StudioMasterMode = "video" | "image" | "voice" | "cinema";

// Video Models
const VIDEO_MODELS = [
  { value: "ffmpeg_local", label: "Local Ken Burns / Morph Engine", description: "Hardware Accelerated FFmpeg 8.1 (100% Free & Unlimited)", badge: "FREE LOCAL", category: "Hardware Engine" },
  { value: "google_veo", label: "Google Veo 3.1 / 2 (DeepMind)", description: "High-Definition 4K Video Generation (Google Cloud AI)", badge: "ACTIVE", category: "Featured Cloud" },
  { value: "kling_2.0", label: "Kling AI 2.0 Pro", description: "Photorealistic Physics & High Dynamic Kinematics", badge: "PRO", category: "Featured Cloud" },
  { value: "runway_gen3", label: "Runway Gen-3 Alpha Turbo", description: "Ultra-Realistic Cinema Motion Coherence & Camera Controls", badge: "CINEMA", category: "Featured Cloud" },
  { value: "luma_dream", label: "Luma Dream Machine 1.5", description: "Consistent 3D Camera Parallax & Fluid Dynamics", badge: "CLOUD", category: "Cloud SOTA" },
  { value: "minimax_video", label: "Minimax Hailuo Video-01", description: "Cinematic Resolution & Natural Human Kinetics", badge: "SOTA", category: "Cloud SOTA" },
  { value: "seedance_v1", label: "ByteDance Seedance 1.0", description: "High-Fidelity Character & Dance Choreography", badge: "DANCE", category: "Cloud SOTA" },
  { value: "hunyuan_video", label: "Tencent HunyuanVideo", description: "Open-Weights High Definition Video Diffusion", badge: "OPEN", category: "Open Weights" },
  { value: "openai_sora", label: "OpenAI Sora", description: "World Simulator & Complex Multi-Shot Kinematics", badge: "CLOUD", category: "Cloud SOTA" },
  { value: "pika_v2", label: "Pika 2.0", description: "Creative Stylized Motion & Kinetic Lens Effects", badge: "FAST", category: "Cloud SOTA" },
  { value: "cogvideox_5b", label: "CogVideoX-5B", description: "Deep Expert 3D VAE Latent Video Synthesis", badge: "DEV", category: "Open Weights" },
];

// Image Models
const IMAGE_MODELS = [
  { value: "gpt-image-2", label: "GPT Image 2", description: "4K Images with near-perfect text rendering & skin textures", badge: "PREMIUM", category: "Featured models" },
  { value: "gpt-image-1", label: "GPT Image 1 Pro", description: "Cinema-grade visual creation & dynamic range", badge: "PRO", category: "Featured models" },
  { value: "imagen_3", label: "Nano Banana Pro (Imagen 3)", description: "Google's flagship hyper-realistic lighting & micro-textures", badge: "ACTIVE", category: "Featured models" },
  { value: "gemini_flash_image", label: "Nano Banana 2 (Gemini Flash)", description: "Pro quality generation at flash speed", badge: "PREMIUM", category: "Google AI" },
  { value: "dall-e-3", label: "DALL-E 3 HD", description: "Auto-routes to OpenAI 8K precision pipeline", badge: "PRO", category: "OpenAI" },
  { value: "flux_pro", label: "Flux.1 Pro (BFL)", description: "Next generation ultra-realistic studio typography & lighting", badge: "SOTA", category: "Black Forest Labs" },
  { value: "midjourney_v6", label: "Midjourney v6.1", description: "Artistic contrast, cinematic mood & editorial aesthetics", badge: "PRO", category: "Midjourney" },
  { value: "sd_35_large", label: "Stable Diffusion 3.5 Large", description: "Open frontier multimodal prompt adherence", badge: "OPEN", category: "Stability AI" },
];

// Voice Models
const VOICE_MODELS = [
  { value: "edge", label: "Microsoft Edge Neural", description: "High fidelity zero-cost neural speech synthesizer", badge: "100% FREE", category: "Neural Local" },
  { value: "elevenlabs", label: "ElevenLabs v3 Multilingual", description: "Hyper-expressive studio grade voice actor cloning", badge: "PRO", category: "Cloud Studio" },
  { value: "openai", label: "OpenAI TTS HD", description: "Clean audio narration with studio acoustic clarity", badge: "STANDARD", category: "OpenAI Cloud" },
];

const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9", desc: "Cinema / YouTube" },
  { value: "9:16", label: "9:16", desc: "Reels / TikTok / Shorts" },
  { value: "1:1", label: "1:1", desc: "Square Social" },
  { value: "4:3", label: "4:3", desc: "Classic Photography" },
  { value: "21:9", label: "21:9", desc: "Cinemascope Ultrawide" },
];

const MOTIONS = [
  { id: "zoom_in", label: "Push In", desc: "Smooth cinematic lens forward push" },
  { id: "zoom_out", label: "Pull Back", desc: "Expansive reveal pulling backward" },
  { id: "pan_left", label: "Pan Left", desc: "Horizontal track smoothly to the left" },
  { id: "pan_right", label: "Pan Right", desc: "Horizontal track smoothly to the right" },
  { id: "tilt_up", label: "Tilt Up", desc: "Vertical reveal tilting upward" },
  { id: "tilt_down", label: "Tilt Down", desc: "Vertical reveal tilting downward" },
  { id: "orbit", label: "360 Orbit", desc: "Dynamic orbital rotational arc around subject" },
  { id: "subtle", label: "Subtle Ambient", desc: "Natural organic micro-motion & light breath" },
];

const TRANSITIONS = [
  { id: "smooth_morph", label: "Smooth Morph", desc: "Continuous optical flow blending" },
  { id: "fast_cut", label: "Action Whip", desc: "Dynamic kinetic motion cut" },
  { id: "cinematic_pan", label: "Parallax Drift", desc: "Depth-guided camera drift" },
  { id: "blur_dissolve", label: "Atmospheric Fade", desc: "Luminescent vapor dissolve" },
];

const VOICE_OPTIONS = [
  { id: "rachel", label: "Rachel (Calm & Cinematic)", provider: "elevenlabs" },
  { id: "drew", label: "Drew (Authoritative News)", provider: "elevenlabs" },
  { id: "clyde", label: "Clyde (Gritty Veteran)", provider: "elevenlabs" },
  { id: "en-US-AriaNeural", label: "Aria (Natural Storyteller)", provider: "edge" },
  { id: "en-US-GuyNeural", label: "Guy (Professional Host)", provider: "edge" },
  { id: "alloy", label: "Alloy (Neutral Studio)", provider: "openai" },
  { id: "echo", label: "Echo (Warm Narration)", provider: "openai" },
];

function StudioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Master Studio Mode
  const [masterMode, setMasterMode] = useState<StudioMasterMode>("video");

  // Sub-Modes
  const [videoSubMode, setVideoSubMode] = useState<"first_frame" | "first_to_last_frame" | "text_to_video" | "motion_transfer">("first_frame");
  const [imageSubMode, setImageSubMode] = useState<"text_to_image" | "image_variations">("text_to_image");
  const [voiceSubMode, setVoiceSubMode] = useState<"tts" | "voice_change" | "translate">("tts");

  // Inputs & Keyframes
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [showNegativePrompt, setShowNegativePrompt] = useState(false);
  const [startImage, setStartImage] = useState(searchParams?.get("image") || "");
  const [endImage, setEndImage] = useState("");
  const [refImage, setRefImage] = useState("");
  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [voiceScript, setVoiceScript] = useState("");
  const [targetVoice, setTargetVoice] = useState("rachel");

  // Controls
  const [videoModel, setVideoModel] = useState("ffmpeg_local");
  const [imageModel, setImageModel] = useState("gpt-image-2");
  const [voiceProvider, setVoiceProvider] = useState("edge");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [motion, setMotion] = useState("zoom_in");
  const [transition, setTransition] = useState("smooth_morph");
  const [duration, setDuration] = useState(4);
  const [fps, setFps] = useState(30);
  const [resolution, setResolution] = useState("1080p");
  const [quality, setQuality] = useState("hd");

  // Popover States
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);
  const [ratioPopoverOpen, setRatioPopoverOpen] = useState(false);
  const [motionPopoverOpen, setMotionPopoverOpen] = useState(false);
  const [durationPopoverOpen, setDurationPopoverOpen] = useState(false);
  const [voicePopoverOpen, setVoicePopoverOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState("");

  // Modals
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultTarget, setVaultTarget] = useState<"start" | "end" | "ref">("start");
  const [vaultImages, setVaultImages] = useState<any[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState<GenerationConfirmDetails | null>(null);

  // Execution & Output State
  const [loading, setLoading] = useState(false);
  const [directing, setDirecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageTitle, setStageTitle] = useState("STUDIO COMPILATION ENGINE");
  const [statusMessage, setStatusMessage] = useState("Allocating creative buffer...");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [telemetryLogs, setTelemetryLogs] = useState<LogEntry[]>([]);

  const [videoResult, setVideoResult] = useState<any>(null);
  const [imageResult, setImageResult] = useState<any>(null);
  const [voiceResult, setVoiceResult] = useState<any>(null);

  // Auto-resize prompt textarea
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (promptTextareaRef.current) {
      promptTextareaRef.current.style.height = "auto";
      const scrollH = promptTextareaRef.current.scrollHeight;
      promptTextareaRef.current.style.height = `${Math.min(Math.max(scrollH, 48), 140)}px`;
    }
  }, [prompt]);

  // Click outside to close popovers
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
    setVoicePopoverOpen(false);
  };

  const openVaultPicker = async (target: "start" | "end" | "ref") => {
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

  const [generationError, setGenerationError] = useState<{ title: string; message: string; details?: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [videoToEdit, setVideoToEdit] = useState<{ url: string; filename: string } | null>(null);
  const [shareModalAsset, setShareModalAsset] = useState<any | null>(null);

  const handleCopyUrl = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(getMediaUrl(url));
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // AI Copilot / Director Prompt Refinement
  const runCopilot = async () => {
    if (!prompt.trim()) return;
    setDirecting(true);
    try {
      if (masterMode === "image") {
        const res = await api.enhancePrompt({ prompt });
        if (res && res.enhanced_prompt) setPrompt(res.enhanced_prompt);
      } else {
        const res = await api.directVideoPrompt({ idea: prompt, prompt, motion_type: motion });
        const enhanced = res?.enhanced_prompt || res?.cinematic_prompt;
        if (enhanced) setPrompt(enhanced);
        if (res?.camera_direction) setMotion(res.camera_direction);
        if (res?.negative_prompt) setNegativePrompt(res.negative_prompt);
      }
    } catch (e: any) {
      console.error("Copilot error:", e);
    } finally {
      setDirecting(false);
    }
  };

  // Cost calculation
  const getSpendInfo = () => {
    if (masterMode === "video") {
      const isFree = videoModel === "ffmpeg_local";
      const usd = isFree ? 0 : duration * 0.15;
      const inr = Math.round(usd * 83.5 * 100) / 100;
      return { isFree, usd, inr, label: isFree ? "(100% Free)" : `• ₹${inr.toFixed(2)} ($${usd.toFixed(2)})` };
    } else if (masterMode === "image") {
      const usd = 0.035;
      const inr = Math.round(usd * 83.5 * 100) / 100;
      return { isFree: false, usd, inr, label: `• ₹${inr.toFixed(2)} ($${usd.toFixed(2)})` };
    } else if (masterMode === "voice") {
      const isFree = voiceProvider === "edge";
      const usd = isFree ? 0 : 0.030;
      const inr = Math.round(usd * 83.5 * 100) / 100;
      return { isFree, usd, inr, label: isFree ? "(100% Free)" : `• ₹${inr.toFixed(2)} ($${usd.toFixed(2)})` };
    }
    return { isFree: false, usd: 0.12, inr: 10, label: "• ₹10.00 ($0.12)" };
  };

  const spendInfo = getSpendInfo();

  // Execution dispatch
  const requestExecutionConfirm = () => {
    if (masterMode === "video") {
      if (videoSubMode === "first_frame" && !startImage.trim()) {
        alert("Please select a Start Keyframe image first.");
        return;
      }
      setConfirmDetails({
        serviceType: "video",
        modelName: videoModel,
        provider: videoModel === "ffmpeg_local" ? "Local Hardware Acceleration" : "Cloud AI Cluster",
        isFree: videoModel === "ffmpeg_local",
        costUsd: spendInfo.usd,
        costInr: spendInfo.inr,
        prompt: prompt || "Visual Keyframe Motion Interpolation",
        specs: { mode: videoSubMode, motion, duration: `${duration}s`, fps: `${fps}fps`, resolution },
      });
      setConfirmModalOpen(true);
    } else if (masterMode === "image") {
      if (!prompt.trim()) {
        alert("Please enter an image prompt.");
        return;
      }
      setConfirmDetails({
        serviceType: "image",
        modelName: imageModel,
        provider: "Diffusion SOTA Cluster",
        isFree: false,
        costUsd: spendInfo.usd,
        costInr: spendInfo.inr,
        prompt: prompt.trim(),
        specs: { aspectRatio, quality, resolution },
      });
      setConfirmModalOpen(true);
    } else if (masterMode === "voice") {
      const textToSynthesize = prompt.trim() || voiceScript.trim();
      if (!textToSynthesize) {
        alert("Please enter text or script to synthesize voice.");
        return;
      }
      setConfirmDetails({
        serviceType: "voice",
        modelName: voiceProvider,
        provider: voiceProvider === "edge" ? "Microsoft Edge Neural" : "ElevenLabs v3",
        isFree: voiceProvider === "edge",
        costUsd: spendInfo.usd,
        costInr: spendInfo.inr,
        prompt: textToSynthesize,
        specs: { voice: targetVoice },
      });
      setConfirmModalOpen(true);
    }
  };

  const executeGeneration = async () => {
    setGenerationError(null);
    setLoading(true);
    setProgress(15);
    setElapsedSeconds(0);
    setTelemetryLogs([
      { timestamp: new Date().toTimeString().split(" ")[0], message: `Initiating ${masterMode.toUpperCase()} synthesis pipeline...` },
    ]);

    const timer = setInterval(() => setElapsedSeconds((p) => p + 1), 1000);

    try {
      if (masterMode === "video") {
        setStageTitle("SYNTHESIZING NEURAL FRAMES");
        setStatusMessage("Applying cinematic camera vectors & keyframe morphing...");
        setProgress(45);
        const data = await api.generateVideo({
          mode: videoSubMode,
          image_path: startImage,
          end_image_path: videoSubMode === "first_to_last_frame" ? endImage : null,
          source_video_path: videoSubMode === "motion_transfer" ? sourceVideoUrl : null,
          prompt,
          negative_prompt: negativePrompt,
          motion_type: motion,
          transition_type: transition,
          duration,
          fps,
          resolution,
          aspect_ratio: aspectRatio,
          quality,
          model: videoModel,
        });

        if (!data || data.success === false || data.error) {
          setGenerationError({
            title: "Video Synthesis Notice",
            message: data?.error || "Video rendering could not be completed with the selected engine.",
            details: `Engine: ${activeVideoModel.label} • Mode: ${videoSubMode}`
          });
        } else {
          setVideoResult(data);
          setProgress(100);
        }
      } else if (masterMode === "image") {
        setStageTitle("DIFFUSION LATENT SAMPLING");
        setStatusMessage("Generating high-fidelity studio textures...");
        setProgress(50);
        const data = await api.generateImage({
          prompt,
          negative_prompt: negativePrompt,
          aspect_ratio: aspectRatio,
          quality,
          resolution,
          model: imageModel,
          batch_size: 1,
        });

        if (!data || data.success === false || data.error) {
          setGenerationError({
            title: "Image Synthesis Notice",
            message: data?.error || "Image generation could not be completed with the selected engine.",
            details: `Model: ${activeImageModel.label} • Aspect: ${aspectRatio}`
          });
        } else {
          setImageResult(data);
          setProgress(100);
        }
      } else if (masterMode === "voice") {
        setStageTitle("NEURAL VOCAL PHONATION");
        setStatusMessage("Synthesizing audio waveforms with studio acoustic clarity...");
        setProgress(60);
        const data = await api.generateVoice({
          text: prompt.trim() || voiceScript.trim(),
          provider: voiceProvider,
          voice_id: targetVoice,
          model: "eleven_v3",
          pacing: "1.0",
        });

        if (!data || data.success === false || data.error) {
          setGenerationError({
            title: "Voice Synthesis Notice",
            message: data?.error || "Voice synthesis could not be completed.",
            details: `Provider: ${voiceProvider} • Voice: ${targetVoice}`
          });
        } else {
          setVoiceResult(data);
          setProgress(100);
        }
      }
    } catch (e: any) {
      setGenerationError({
        title: "Communication / Engine Error",
        message: e?.message || "Failed to reach OmniStudio engine. Please verify local server connectivity.",
      });
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  // Cross-Engine Quick Transitions
  const handleAnimateImageInVideo = (imageUrl: string) => {
    setStartImage(imageUrl);
    setMasterMode("video");
    setVideoSubMode("first_frame");
  };

  const handleDubVideoInVoice = () => {
    setMasterMode("voice");
    setVoiceSubMode("tts");
  };

  const activeVideoModel = VIDEO_MODELS.find((m) => m.value === videoModel) || VIDEO_MODELS[0];
  const activeImageModel = IMAGE_MODELS.find((m) => m.value === imageModel) || IMAGE_MODELS[0];
  const activeMotion = MOTIONS.find((m) => m.id === motion) || MOTIONS[0];

  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-between pb-48 font-jakarta bg-[var(--bg-primary)]">
      {/* Top Header: Master Engine Switcher & Sub-Mode Navigation */}
      <div className="space-y-3 pb-4 border-b border-black/[0.06] dark:border-white/[0.06] px-4 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Engine Master Switch Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-100 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-xl">
            <button
              type="button"
              onClick={() => setMasterMode("video")}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0",
                masterMode === "video"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs border border-transparent font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white border border-transparent"
              )}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video Studio</span>
            </button>

            <button
              type="button"
              onClick={() => setMasterMode("image")}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0",
                masterMode === "image"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs border border-transparent font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white border border-transparent"
              )}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Image Studio</span>
            </button>

            <button
              type="button"
              onClick={() => setMasterMode("voice")}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0",
                masterMode === "voice"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs border border-transparent font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white border border-transparent"
              )}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Studio</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setHowItWorksOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:hover:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.06] text-xs font-mono text-zinc-700 dark:text-zinc-300 transition-colors duration-200 cursor-pointer whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Studio Guide</span>
            </button>
            <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-zinc-800 dark:text-zinc-200 px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold">UNIFIED STUDIO WORKSTATION</span>
            </div>
          </div>
        </div>

        {/* Sub-Mode Context Pill Strip */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {masterMode === "video" && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold pr-1">Modes:</span>
              <button
                type="button"
                onClick={() => setVideoSubMode("first_frame")}
                className={cn(
                  "px-3 py-1 rounded-lg border transition-all duration-200 cursor-pointer",
                  videoSubMode === "first_frame"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold shadow-xs"
                    : "bg-zinc-100 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                First Frame
              </button>
              <button
                type="button"
                onClick={() => setVideoSubMode("first_to_last_frame")}
                className={cn(
                  "px-3 py-1 rounded-lg border transition-all duration-200 cursor-pointer",
                  videoSubMode === "first_to_last_frame"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold shadow-xs"
                    : "bg-zinc-100 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                First + Last Frame (Morph)
              </button>
              <button
                type="button"
                onClick={() => setVideoSubMode("text_to_video")}
                className={cn(
                  "px-3 py-1 rounded-lg border transition-all duration-200 cursor-pointer",
                  videoSubMode === "text_to_video"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold shadow-xs"
                    : "bg-zinc-100 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                Text to Video
              </button>
              <button
                type="button"
                onClick={() => setVideoSubMode("motion_transfer")}
                className={cn(
                  "px-3 py-1 rounded-lg border transition-all duration-200 cursor-pointer",
                  videoSubMode === "motion_transfer"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold shadow-xs"
                    : "bg-zinc-100 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                Motion Transfer
              </button>
            </div>
          )}

          {masterMode === "image" && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold pr-1">Modes:</span>
              <button
                type="button"
                onClick={() => setImageSubMode("text_to_image")}
                className={cn(
                  "px-3 py-1 rounded-lg border transition-all duration-200 cursor-pointer",
                  imageSubMode === "text_to_image"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold shadow-xs"
                    : "bg-zinc-100 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                Text to Image
              </button>
              <button
                type="button"
                onClick={() => setImageSubMode("image_variations")}
                className={cn(
                  "px-3 py-1 rounded-lg border transition-all duration-200 cursor-pointer",
                  imageSubMode === "image_variations"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold shadow-xs"
                    : "bg-zinc-100 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                Reference Variations
              </button>
            </div>
          )}

          {masterMode === "voice" && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold pr-1">Modes:</span>
              <button
                type="button"
                onClick={() => setVoiceSubMode("tts")}
                className={cn(
                  "px-3 py-1 rounded-lg border transition-all duration-200 cursor-pointer",
                  voiceSubMode === "tts"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold shadow-xs"
                    : "bg-zinc-100 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                Text to Speech
              </button>
              <button
                type="button"
                onClick={() => setVoiceSubMode("voice_change")}
                className={cn(
                  "px-3 py-1 rounded-lg border transition-all duration-200 cursor-pointer",
                  voiceSubMode === "voice_change"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold shadow-xs"
                    : "bg-zinc-100 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                Voice Changer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center Viewport / Canvas (Adapts dynamically to Mode) */}
      <div className="flex-1 flex flex-col justify-center items-center py-6 px-4 w-full max-w-5xl mx-auto">
        {/* Loading Progress State */}
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

        {/* Error Diagnostics & Recovery Card */}
        {!loading && generationError && (
          <div className="w-full max-w-2xl mx-auto my-4 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#111114] border border-rose-500/20 dark:border-rose-500/30 shadow-lg animate-in fade-in duration-200 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold font-heading text-zinc-950 dark:text-white">
                    {generationError.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setGenerationError(null)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 font-sans mt-1 leading-relaxed">
                  {generationError.message}
                </p>
                {generationError.details && (
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono mt-1">
                    {generationError.details}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center justify-end gap-2">
              {generationError.message.toLowerCase().includes("key") && (
                <Link
                  href="/settings"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-mono font-medium hover:opacity-90 transition-opacity"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Configure API Keys in Settings</span>
                </Link>
              )}
              {masterMode === "video" && videoModel !== "ffmpeg_local" && (
                <button
                  type="button"
                  onClick={() => {
                    setVideoModel("ffmpeg_local");
                    setGenerationError(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/[0.08] text-zinc-800 dark:text-zinc-200 border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono font-medium hover:bg-zinc-200 dark:hover:bg-white/[0.12] transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Switch to Free Local Engine</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setGenerationError(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Video Render Output */}
        {!loading && masterMode === "video" && videoResult && videoResult.success && (
          <div className="w-full space-y-4 animate-in fade-in duration-200">
            <div className="relative rounded-3xl overflow-hidden border border-black/[0.1] dark:border-white/[0.1] bg-black shadow-2xl max-w-4xl mx-auto">
              <video src={getMediaUrl(videoResult.url)} controls autoPlay loop className="w-full aspect-video object-contain" />
            </div>
            <div className="max-w-4xl mx-auto p-4 rounded-2xl bg-white/95 dark:bg-[#111114]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-zinc-950 dark:text-white truncate max-w-xs">{videoResult.filename || "rendered_video.mp4"}</span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">READY</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setVideoToEdit({
                      url: videoResult.url,
                      filename: videoResult.filename || "rendered_video.mp4",
                    })
                  }
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-heading font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer"
                  title="Open Pure Video Editing Tools (Trim, Speed, Aspect, Color LUTs, Audio, Text)"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>EDIT IN STUDIO</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setShareModalAsset({
                      url: videoResult.url,
                      filename: videoResult.filename || "rendered_video.mp4",
                      type: "videos",
                    })
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200 text-xs font-mono font-medium hover:bg-zinc-200 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyUrl(videoResult.url)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200 text-xs font-mono font-medium hover:bg-zinc-200 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                >
                  {copiedUrl ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? "Copied Link" : "Copy Link"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDubVideoInVoice}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200 text-xs font-mono font-medium hover:bg-zinc-200 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Add Voiceover</span>
                </button>
                <a
                  href={getMediaUrl(videoResult.url)}
                  download
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-bold tracking-tight shadow-sm cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download MP4</span>
                </a>
                <button
                  type="button"
                  onClick={() => setVideoResult(null)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Create New Video"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Render Output */}
        {!loading && masterMode === "image" && imageResult && imageResult.success && (
          <div className="w-full space-y-4 animate-in fade-in duration-200">
            <div className="relative rounded-3xl overflow-hidden border border-black/[0.1] dark:border-white/[0.1] bg-black shadow-2xl max-w-2xl mx-auto">
              <img src={getMediaUrl(imageResult.url || imageResult.images?.[0]?.url)} alt="Generated" className="w-full object-contain" />
            </div>
            <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-white/95 dark:bg-[#111114]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-zinc-950 dark:text-white">Generated Visual</span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">READY</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setShareModalAsset({
                      url: imageResult.url || imageResult.images?.[0]?.url,
                      filename: "generated_visual.png",
                      type: "images",
                    })
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200 text-xs font-mono font-medium hover:bg-zinc-200 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyUrl(imageResult.url || imageResult.images?.[0]?.url)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200 text-xs font-mono font-medium hover:bg-zinc-200 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                >
                  {copiedUrl ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? "Copied Link" : "Copy Link"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAnimateImageInVideo(imageResult.url || imageResult.images?.[0]?.url)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200 border border-transparent text-xs font-mono font-medium hover:bg-zinc-200 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Animate as Video</span>
                </button>
                <a
                  href={getMediaUrl(imageResult.url || imageResult.images?.[0]?.url)}
                  download
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-bold tracking-tight shadow-sm cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setImageResult(null)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Create New Image"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Voice Render Output */}
        {!loading && masterMode === "voice" && voiceResult && voiceResult.success && (
          <div className="w-full max-w-xl p-6 rounded-3xl bg-white/95 dark:bg-[#111114]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] space-y-4 animate-in fade-in duration-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/[0.06] flex items-center justify-center text-zinc-900 dark:text-white border border-black/[0.08] dark:border-white/[0.08]">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold font-heading text-zinc-950 dark:text-white">Synthesized Audio Output</h4>
                  <p className="text-[10px] font-mono text-zinc-500">Neural Speech Stream Ready</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVoiceResult(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Create New Audio"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
            <audio src={getMediaUrl(voiceResult.url)} controls className="w-full" />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleCopyUrl(voiceResult.url)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200 text-xs font-mono font-medium hover:bg-zinc-200 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
              >
                {copiedUrl ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? "Copied Link" : "Copy Link"}</span>
              </button>
              <a
                href={getMediaUrl(voiceResult.url)}
                download
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-bold tracking-tight shadow-sm cursor-pointer transition-all active:scale-[0.98]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download MP3</span>
              </a>
            </div>
          </div>
        )}

        {/* Idle Canvas Workspace */}
        {!loading && !videoResult && !imageResult && !voiceResult && (
          <div className="w-full max-w-4xl space-y-6">
            {/* 1. Video Staging Canvas */}
            {masterMode === "video" && videoSubMode !== "text_to_video" && (
              <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#111114] shadow-sm p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-zinc-950 dark:text-white" />
                    <span className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-950 dark:text-white">
                      Keyframe Staging Canvas
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase font-medium">
                    {videoSubMode === "first_to_last_frame" ? "Dual Keyframe Interpolation" : "Single Start Keyframe"}
                  </span>
                </div>

                <div className={cn("grid gap-4", videoSubMode === "first_to_last_frame" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-xl mx-auto")}>
                  {/* Start Keyframe */}
                  <div className="space-y-2.5 p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-bold">
                        START KEYFRAME (01)
                      </label>
                      <button
                        type="button"
                        onClick={() => openVaultPicker("start")}
                        className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 border border-black/[0.08] dark:border-white/[0.08] px-2.5 py-1 rounded-full bg-white dark:bg-[#16161a] cursor-pointer transition-colors duration-200"
                      >
                        <FolderArchive className="h-3 w-3" />
                        <span>VAULT</span>
                      </button>
                    </div>

                    {startImage ? (
                      <div className="relative rounded-xl overflow-hidden border border-black/[0.1] dark:border-white/[0.1] aspect-video bg-black group shadow-sm">
                        <img src={getMediaUrl(startImage)} alt="Start Frame" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setStartImage("")}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black cursor-pointer transition-colors duration-200"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => openVaultPicker("start")}
                        className="border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl aspect-video flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-zinc-500 dark:hover:border-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-white/[0.03] transition-all duration-200 bg-white/50 dark:bg-black/20"
                      >
                        <ImageIcon className="h-7 w-7 text-zinc-400 mb-2" />
                        <span className="text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200">
                          Select Start Keyframe
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 mt-1">Pick from vault or paste path</span>
                      </div>
                    )}
                    <input
                      type="text"
                      value={startImage}
                      onChange={(e) => setStartImage(e.target.value)}
                      placeholder="Or enter filepath / URL..."
                      className="w-full bg-white dark:bg-[#16161a] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all duration-200"
                    />
                  </div>

                  {/* End Keyframe (in dual frame mode) */}
                  {videoSubMode === "first_to_last_frame" && (
                    <div className="space-y-2.5 p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06]">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-bold">
                          END KEYFRAME (02)
                        </label>
                        <button
                          type="button"
                          onClick={() => openVaultPicker("end")}
                          className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 border border-black/[0.08] dark:border-white/[0.08] px-2.5 py-1 rounded-full bg-white dark:bg-[#16161a] cursor-pointer transition-colors duration-200"
                        >
                          <FolderArchive className="h-3 w-3" />
                          <span>VAULT</span>
                        </button>
                      </div>

                      {endImage ? (
                        <div className="relative rounded-xl overflow-hidden border border-black/[0.1] dark:border-white/[0.1] aspect-video bg-black group shadow-sm">
                          <img src={getMediaUrl(endImage)} alt="End Frame" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setEndImage("")}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black cursor-pointer transition-colors duration-200"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => openVaultPicker("end")}
                          className="border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl aspect-video flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-zinc-500 dark:hover:border-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-white/[0.03] transition-all duration-200 bg-white/50 dark:bg-black/20"
                        >
                          <ImageIcon className="h-7 w-7 text-zinc-400 mb-2" />
                          <span className="text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200">
                            Select Destination Keyframe
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500 mt-1">Destination frame to morph towards</span>
                        </div>
                      )}
                      <input
                        type="text"
                        value={endImage}
                        onChange={(e) => setEndImage(e.target.value)}
                        placeholder="Or enter filepath / URL..."
                        className="w-full bg-white dark:bg-[#16161a] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all duration-200"
                      />
                    </div>
                  )}
                </div>

                {/* Transitions */}
                {videoSubMode === "first_to_last_frame" && (
                  <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold block mb-2">
                      TRANSITION DYNAMICS:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {TRANSITIONS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTransition(t.id)}
                          className={cn(
                            "p-3 rounded-xl border text-left font-mono transition-all duration-200 cursor-pointer",
                            transition === t.id
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold shadow-xs"
                              : "bg-zinc-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                          )}
                        >
                          <span className="text-xs font-bold block">{t.label}</span>
                          <span className="text-[9px] opacity-75 block truncate mt-0.5">{t.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. Text to Video or Image Hero */}
            {(masterMode === "image" || (masterMode === "video" && videoSubMode === "text_to_video")) && (
              <div className="space-y-6 text-center py-10">
                <div className="space-y-3 max-w-lg mx-auto">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-[10px] font-mono text-zinc-800 dark:text-zinc-200 uppercase tracking-widest font-semibold">
                    <Sparkles className="w-3 h-3 text-zinc-900 dark:text-white" />
                    <span>{masterMode === "image" ? "Diffusion Neural Canvas" : "Text to Cinema Synthesis"}</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight uppercase">
                    ALL-IN-ONE CREATIVE STUDIO
                  </h2>
                  <p className="text-sm font-jakarta text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-md mx-auto">
                    Direct visual generation, camera vectors, and neural speech right from a single unified dock below.
                  </p>
                </div>
              </div>
            )}

            {/* 3. Voice Staging Canvas */}
            {masterMode === "voice" && (
              <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#111114] shadow-sm p-6 space-y-4 max-w-2xl mx-auto text-left">
                <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-zinc-950 dark:text-white" />
                    <span className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-950 dark:text-white">
                      Neural Script Phonation
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase font-medium">Voiceover Director</span>
                </div>

                <div className="space-y-3 pt-1">
                  <label className="text-[11px] font-mono uppercase text-zinc-500 font-semibold">Voice Actor & Accent:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {VOICE_OPTIONS.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setTargetVoice(v.id);
                          setVoiceProvider(v.provider);
                        }}
                        className={cn(
                          "p-2.5 rounded-xl border text-left font-mono text-xs transition-all duration-200 cursor-pointer",
                          targetVoice === v.id
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold shadow-xs"
                            : "bg-zinc-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        )}
                      >
                        <span className="block font-bold truncate">{v.label.split(" (")[0]}</span>
                        <span className="text-[9px] opacity-70 block truncate mt-0.5">{v.label.split(" (")[1]?.replace(")", "") || v.provider}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Bottom Studio Dock (All Options in One Place) */}
      <div
        ref={dockRef}
        data-lenis-prevent="true"
        className="glass-dock fixed bottom-6 left-0 lg:left-64 right-0 mx-auto z-40 w-[94%] max-w-4xl bg-white/95 dark:bg-[#111114]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.08] rounded-2xl sm:rounded-3xl shadow-2xl p-3 sm:p-3.5 space-y-2.5 transition-all duration-200 pointer-events-auto"
      >
        {/* Row 1: Integrated Prompt Input Bar */}
        <div className="relative flex items-start gap-2">
          <textarea
            ref={promptTextareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                requestExecutionConfirm();
              }
            }}
            placeholder={
              masterMode === "video"
                ? "Describe camera movement, cinematography, lighting, or click 'Copilot'..."
                : masterMode === "image"
                ? "Describe subject, aesthetic, lighting, optics, or click 'Copilot'..."
                : "Type speech script or narration dialogue to synthesize with neural voice..."
            }
            className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-4 py-3 text-xs sm:text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:border-zinc-500 font-jakarta resize-none pr-36 min-h-[48px] max-h-36 leading-relaxed custom-scrollbar transition-all duration-200"
          />

          <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 z-10">
            <button
              type="button"
              onClick={runCopilot}
              disabled={directing || !prompt.trim()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#16161a] text-[11px] font-mono text-zinc-800 dark:text-zinc-200 border border-black/[0.08] dark:border-white/[0.08] hover:bg-zinc-100 dark:hover:bg-white/[0.08] disabled:opacity-40 transition-colors duration-200 cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
              title="Enhance prompt with AI Copilot"
            >
              <Wand2 className={cn("w-3 h-3 text-zinc-900 dark:text-white", directing && "animate-spin")} />
              <span className="hidden sm:inline">Copilot</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNegativePrompt((p) => !p)}
              className={cn(
                "p-1.5 rounded-lg border text-xs font-mono transition-colors duration-200 cursor-pointer shadow-sm",
                showNegativePrompt || negativePrompt
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold"
                  : "bg-white dark:bg-[#16161a] text-zinc-500 border-black/[0.08] dark:border-white/[0.08] hover:bg-zinc-100 dark:hover:bg-white/[0.04]"
              )}
              title="Toggle Negative Prompt"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Negative Prompt Expandable */}
        {showNegativePrompt && (
          <div className="animate-in fade-in slide-in-from-bottom-1 duration-150">
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Negative prompt (e.g. flickering, artifacts, low resolution, extra limbs)..."
              className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 font-mono transition-all duration-200"
            />
          </div>
        )}

        {/* Row 2: Master Controls Strip + Action CTA */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
          {/* Controls Left Group */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1">
            {/* 1. Model / Engine Selector Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  closeAllPopovers();
                  setModelPopoverOpen(!modelPopoverOpen);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-heading font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 shadow-sm",
                  modelPopoverOpen
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold"
                    : "bg-zinc-50 dark:bg-white/[0.04] hover:bg-zinc-100 dark:hover:bg-white/[0.08] border-black/[0.08] dark:border-white/[0.08] text-zinc-800 dark:text-zinc-200"
                )}
              >
                <Sparkle className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />
                <span>{masterMode === "video" ? activeVideoModel.label : masterMode === "image" ? activeImageModel.label : "Edge / ElevenLabs"}</span>
                <ChevronUp className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform duration-200", modelPopoverOpen && "rotate-180")} />
              </button>

              {/* Model Popover */}
              {modelPopoverOpen && (
                <div
                  data-lenis-prevent="true"
                  className="absolute bottom-full left-0 mb-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#16161a] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-3 z-50 animate-slide-up space-y-2.5"
                >
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      placeholder="Search engines..."
                      className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 font-jakarta transition-all duration-200"
                    />
                  </div>

                  <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase px-1 font-semibold flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Film className="w-3 h-3 text-zinc-700 dark:text-zinc-300" />
                      <span>{masterMode.toUpperCase()} ENGINES</span>
                    </div>
                  </div>

                  {/* Scrollable Model List */}
                  <div
                    data-lenis-prevent="true"
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    className="max-h-72 sm:max-h-80 overflow-y-auto overscroll-contain space-y-1 pr-1.5 custom-scrollbar"
                  >
                    {(masterMode === "video" ? VIDEO_MODELS : masterMode === "image" ? IMAGE_MODELS : VOICE_MODELS)
                      .filter((m) => !modelSearchQuery.trim() || m.label.toLowerCase().includes(modelSearchQuery.toLowerCase()))
                      .map((m) => {
                        const isSelected = (masterMode === "video" ? videoModel : masterMode === "image" ? imageModel : voiceProvider) === m.value;
                        return (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => {
                              if (masterMode === "video") setVideoModel(m.value);
                              else if (masterMode === "image") setImageModel(m.value);
                              else setVoiceProvider(m.value);
                              setModelPopoverOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-start justify-between p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer font-jakarta",
                              isSelected
                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold"
                                : "hover:bg-zinc-100 dark:hover:bg-white/[0.04] text-zinc-700 dark:text-zinc-300"
                            )}
                          >
                            <div className="space-y-0.5 min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold font-heading">{m.label}</span>
                                {m.badge && (
                                  <span className={cn("text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider", isSelected ? "bg-white/20 text-white dark:bg-black/20 dark:text-black" : "bg-zinc-100 dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 border border-black/[0.08] dark:border-white/[0.08]")}>
                                    {m.badge}
                                  </span>
                                )}
                              </div>
                              <p className={cn("text-[10px] leading-snug line-clamp-1", isSelected ? "opacity-80" : "text-zinc-500 dark:text-zinc-400")}>{m.description}</p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-white dark:text-zinc-950 shrink-0 mt-1" />}
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
                  "flex items-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-mono font-medium transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 shadow-sm",
                  ratioPopoverOpen
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold"
                    : "bg-zinc-50 dark:bg-white/[0.04] hover:bg-zinc-100 dark:hover:bg-white/[0.08] border-black/[0.08] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300"
                )}
              >
                <Maximize2 className="w-3 h-3 text-zinc-400" />
                <span>{aspectRatio}</span>
                <ChevronUp className={cn("w-3 h-3 text-zinc-400 transition-transform duration-200", ratioPopoverOpen && "rotate-180")} />
              </button>

              {ratioPopoverOpen && (
                <div
                  data-lenis-prevent="true"
                  className="absolute bottom-full left-0 mb-2 w-56 rounded-2xl bg-white dark:bg-[#16161a] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-2 z-50 animate-slide-up space-y-1"
                >
                  <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase px-2 py-1 font-semibold">Aspect Ratio</div>
                  {ASPECT_RATIOS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => {
                        setAspectRatio(r.value);
                        setRatioPopoverOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-mono transition-colors duration-200 cursor-pointer",
                        aspectRatio === r.value
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold"
                          : "hover:bg-zinc-100 dark:hover:bg-white/[0.04] text-zinc-600 dark:text-zinc-400"
                      )}
                    >
                      <span>{r.label}</span>
                      {aspectRatio === r.value && <Check className="w-3.5 h-3.5 text-white dark:text-zinc-950" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Contextual Controls */}
            {masterMode === "video" && (
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      closeAllPopovers();
                      setMotionPopoverOpen(!motionPopoverOpen);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-mono font-medium transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 shadow-sm",
                      motionPopoverOpen
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold"
                        : "bg-zinc-50 dark:bg-white/[0.04] hover:bg-zinc-100 dark:hover:bg-white/[0.08] border-black/[0.08] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300"
                    )}
                  >
                    <span>{activeMotion.label}</span>
                    <ChevronUp className={cn("w-3 h-3 text-zinc-400 transition-transform duration-200", motionPopoverOpen && "rotate-180")} />
                  </button>

                  {motionPopoverOpen && (
                    <div
                      data-lenis-prevent="true"
                      className="absolute bottom-full left-0 mb-2 w-72 rounded-2xl bg-white dark:bg-[#16161a] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-3 z-50 animate-slide-up space-y-2.5"
                    >
                      <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase px-1 font-semibold">Camera Vector</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {MOTIONS.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setMotion(m.id);
                              setMotionPopoverOpen(false);
                            }}
                            className={cn(
                              "p-2.5 rounded-xl border text-left font-mono text-xs transition-all duration-200 cursor-pointer",
                              motion === m.id
                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent shadow-sm font-bold"
                                : "bg-zinc-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-white"
                            )}
                          >
                            <span className="block truncate">{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      closeAllPopovers();
                      setDurationPopoverOpen(!durationPopoverOpen);
                    }}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-mono font-medium transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 shadow-sm",
                      durationPopoverOpen
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold"
                        : "bg-zinc-50 dark:bg-white/[0.04] hover:bg-zinc-100 dark:hover:bg-white/[0.08] border-black/[0.08] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300"
                    )}
                  >
                    <Clock className="w-3 h-3 text-zinc-400" />
                    <span>{duration}s</span>
                    <ChevronUp className={cn("w-3 h-3 text-zinc-400 transition-transform duration-200", durationPopoverOpen && "rotate-180")} />
                  </button>

                  {durationPopoverOpen && (
                    <div
                      data-lenis-prevent="true"
                      className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl bg-white dark:bg-[#16161a] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-3 z-50 animate-slide-up space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold">Clip Duration</span>
                        <span className="text-xs font-bold font-mono text-zinc-950 dark:text-white">{duration} SECONDS</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        {[2, 4, 6, 8, 10].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDuration(d)}
                            className={cn(
                              "flex-1 py-1.5 rounded-lg text-xs border text-center transition-colors duration-200 cursor-pointer",
                              duration === d
                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold"
                                : "bg-zinc-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.08]"
                            )}
                          >
                            {d}s
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {masterMode === "image" && (
              <div className="flex items-center gap-1.5">
                {["standard", "hd", "ultra"].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuality(q)}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs font-mono font-medium uppercase tracking-wider border transition-colors duration-200 cursor-pointer shadow-sm",
                      quality === q
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold"
                        : "bg-zinc-50 dark:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.08]"
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Master Render Action Button */}
          <button
            type="button"
            onClick={requestExecutionConfirm}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2.5 mt-1 sm:mt-0 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-heading font-bold text-xs sm:text-sm tracking-tight disabled:opacity-50 transition-all duration-200 shadow-sm border border-zinc-900/10 dark:border-white/10 active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white dark:text-zinc-950" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Render {spendInfo.label}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Vault Picker Modal */}
      {vaultOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111114] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs text-zinc-950 dark:text-white font-semibold">
                <FolderArchive className="h-4 w-4 text-zinc-950 dark:text-white" />
                <span>SELECT {vaultTarget.toUpperCase()} FRAME FROM VAULT</span>
              </div>
              <button
                type="button"
                onClick={() => setVaultOpen(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
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
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-xs text-zinc-500 font-mono">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-950 dark:text-white" />
                  <span>Loading vault images...</span>
                </div>
              ) : vaultImages.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 font-mono">
                  No images found in local vault. Generate an image first!
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
                        else setRefImage(img.url);
                        setVaultOpen(false);
                      }}
                      className="group rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] hover:border-zinc-500 hover:ring-2 hover:ring-zinc-400/30 text-left transition-all relative aspect-video bg-black cursor-pointer shadow-sm"
                    >
                      <img src={getMediaUrl(img.url)} alt={img.filename} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/80 p-2 pt-4">
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

      {/* Confirmation Modal */}
      <GenerationConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => {
          setConfirmModalOpen(false);
          executeGeneration();
        }}
        details={confirmDetails}
        loading={loading}
      />

      {/* Studio Guide Modal */}
      <HowItWorksModal isOpen={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />

      {/* Video Editor Modal */}
      {videoToEdit && (
        <VideoEditorModal
          isOpen={Boolean(videoToEdit)}
          onClose={() => setVideoToEdit(null)}
          videoUrl={videoToEdit.url}
          filename={videoToEdit.filename}
          onSaved={(edited) => {
            setVideoResult(edited);
            setVideoToEdit(null);
          }}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={Boolean(shareModalAsset)}
        onClose={() => setShareModalAsset(null)}
        asset={shareModalAsset}
      />
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-500 font-mono flex flex-col items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-zinc-900 dark:text-white" />Loading Unified Studio...</div>}>
      <StudioContent />
    </Suspense>
  );
}
