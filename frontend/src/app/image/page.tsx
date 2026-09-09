"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  Sparkles,
  Download,
  ArrowRight,
  Loader2,
  Wand2,
  Copy,
  Check,
  Sliders,
  Camera,
  Sun,
  Layers,
  Sparkle,
  Dices,
  Eye,
  Aperture,
  Film,
  Gauge,
  Maximize2,
  Upload,
  Grid,
  RefreshCw,
  FolderArchive,
  X,
  Plus,
  Minus,
  Play,
  AlertCircle,
  Key,
  ChevronUp,
  Search,
  BookOpen,
  ZoomIn,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import GenerationConfirmModal, { GenerationConfirmDetails } from "@/components/ui/GenerationConfirmModal";
import LiveProgressBar, { LogEntry } from "@/components/ui/LiveProgressBar";
import HowItWorksModal from "@/components/ui/HowItWorksModal";

interface ModelOption {
  value: string;
  label: string;
  description: string;
  badge?: string;
  category?: string;
  iconType?: "openai" | "google" | "flux" | "midjourney" | "bytedance" | "custom";
}

const DIFFUSION_MODELS: ModelOption[] = [
  { value: "gpt-image-2", label: "GPT Image 2", description: "4K Images with near-perfect text rendering & skin textures", badge: "PREMIUM", category: "Featured models", iconType: "openai" },
  { value: "gpt-image-1", label: "GPT Image 1 Pro", description: "Cinema-grade visual creation & dynamic range", badge: "PRO", category: "Featured models", iconType: "openai" },
  { value: "gpt-image-1-mini", label: "GPT Image 1 Mini", description: "Stunning everyday images, ultra-fast generation", badge: "FAST", category: "Featured models", iconType: "openai" },
  { value: "imagen_3", label: "Nano Banana Pro (Imagen 3)", description: "Google's flagship hyper-realistic lighting & micro-textures", badge: "ACTIVE", category: "Featured models", iconType: "google" },
  { value: "gemini_flash_image", label: "Nano Banana 2 (Gemini Flash)", description: "Pro quality generation at flash speed", badge: "PREMIUM", category: "Google AI", iconType: "google" },
  { value: "dall-e-3", label: "DALL-E 3 HD", description: "Auto-routes to OpenAI 8K precision pipeline", badge: "PRO", category: "OpenAI", iconType: "openai" },
  { value: "flux_pro", label: "Flux.1 Pro (BFL)", description: "Next generation ultra-realistic studio typography & lighting", badge: "SOTA", category: "Black Forest Labs", iconType: "flux" },
  { value: "flux-schnell", label: "Flux.1 Schnell", description: "Speed latent diffusion and rapid concept ideation", badge: "FAST", category: "Black Forest Labs", iconType: "flux" },
  { value: "midjourney_v6", label: "Midjourney v6.1", description: "Artistic contrast, cinematic mood & editorial aesthetics", badge: "PRO", category: "Midjourney", iconType: "midjourney" },
  { value: "seedream_pro", label: "Seedream 5.0 Pro", description: "Logically consistent images with intelligent visual reasoning", badge: "PREMIUM", category: "ByteDance", iconType: "bytedance" },
  { value: "recraft_v3", label: "Recraft V3", description: "Top-tier vector graphics, branding & graphic design", badge: "NEW", category: "Graphic Studio", iconType: "custom" },
  { value: "sd_35_large", label: "Stable Diffusion 3.5 Large", description: "Open frontier multimodal prompt adherence", badge: "OPEN", category: "Stability AI", iconType: "custom" },
];

const MODEL_PRICES: Record<string, number> = {
  "gpt-image-2": 0.040,
  "gpt-image-1": 0.035,
  "gpt-image-1-mini": 0.020,
  "dall-e-3": 0.040,
  "imagen_3": 0.030,
  "gemini_flash_image": 0.025,
  "flux_pro": 0.050,
  "flux-schnell": 0.010,
  "midjourney_v6": 0.045,
  "seedream_pro": 0.035,
  "recraft_v3": 0.025,
  "sd_35_large": 0.030,
};

const RATIOS = [
  { id: "16:9", label: "16:9", sub: "Cinema / YouTube" },
  { id: "9:16", label: "9:16", sub: "Reels / TikTok" },
  { id: "1:1", label: "1:1", sub: "Square Social" },
  { id: "4:3", label: "4:3", sub: "Classic Photography" },
  { id: "21:9", label: "21:9", sub: "Cinemascope Ultrawide" },
];

const QUALITIES = [
  { id: "standard", label: "Standard", sub: "Fast Draft" },
  { id: "hd", label: "High", sub: "Studio Clarity" },
  { id: "ultra", label: "Master 8K", sub: "RAW Details & Micro-Textures" },
];

const RESOLUTIONS = [
  { id: "720p", label: "720p", sub: "1280x720 Draft" },
  { id: "1080p", label: "1080p", sub: "1920x1080 FHD" },
  { id: "2k", label: "2K", sub: "2560x1440 QHD" },
  { id: "4k", label: "4K", sub: "3840x2160 UHD" },
];

const LENSES = [
  { id: "Auto", label: "Auto Optics", sub: "AI Director Framing" },
  { id: "35mm Prime", label: "35mm Prime", sub: "Natural Street & Environmental" },
  { id: "85mm Portrait", label: "85mm Portrait", sub: "Glamour Shallow DOF" },
  { id: "24mm Anamorphic", label: "24mm Anamorphic", sub: "Cinematic Horizontal Flares" },
  { id: "50mm Natural", label: "50mm Natural", sub: "Standard Eye-Level" },
  { id: "100mm Macro", label: "100mm Macro", sub: "Extreme Facet Detail" },
];

const APERTURES = [
  { id: "f/1.2", label: "f/1.2 Ultra Bokeh" },
  { id: "f/2.8", label: "f/2.8 Portrait" },
  { id: "f/8", label: "f/8 Landscape" },
  { id: "f/16", label: "f/16 Deep Field" },
];

const LIGHTING_PRESETS = [
  { id: "Golden Hour Sunlight", label: "Golden Hour", desc: "Warm Low-Angle Sun" },
  { id: "Volumetric God Rays", label: "God Rays", desc: "Hazy Atmospheric Beams" },
  { id: "Studio Softbox Lighting", label: "Studio Softbox", desc: "Clean Diffused Fashion" },
  { id: "Cyberpunk Neon Lighting", label: "Cyberpunk Neon", desc: "Dual-Tone Blue & Magenta" },
  { id: "Moody Low-Key Chiaroscuro", label: "Chiaroscuro", desc: "High Contrast Rim Light" },
];

const INSPIRATION_PROMPTS = [
  {
    title: "Cinematic Portrait",
    prompt: "35mm film portrait of a futuristic cyberpunk traveler in rainy Tokyo, neon reflections on wet jacket, volumetric steam, f/1.4 shallow depth of field, 8k raw detail",
  },
  {
    title: "Classical Sculpture",
    prompt: "Hyperrealistic marble bust of Apollo emerging from dark liquid glass, fractures inlaid with 24k gold leaf, dramatic chiaroscuro studio rim lighting",
  },
  {
    title: "Architectural Pavilion",
    prompt: "Minimalist concrete and glass cantilevered pavilion floating over alpine mountain mist at twilight, interior warm glowing lights, architectural photography",
  },
  {
    title: "Emerald Macro Facets",
    prompt: "Cinematic extreme macro of an uncut Colombian emerald gemstone, internal crystalline refraction, subtle gold flecks, ethereal caustics, master studio lighting",
  },
];

export default function ImageStudioPage() {
  const router = useRouter();

  // Studio Mode: 'text_to_image' | 'image_variations'
  const [studioMode, setStudioMode] = useState<"text_to_image" | "image_variations">("text_to_image");

  // Core Prompt & Settings
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gpt-image-2");
  const [quality, setQuality] = useState("hd");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [resolution, setResolution] = useState("2k");
  const [lens, setLens] = useState("35mm Prime");
  const [aperture, setAperture] = useState("f/1.2");
  const [lighting, setLighting] = useState("Golden Hour Sunlight");
  const [filmStock, setFilmStock] = useState("Kodak Portra 400");
  const [cfgScale, setCfgScale] = useState(7.5);
  const [samplingSteps, setSamplingSteps] = useState(30);
  const [seed, setSeed] = useState("");
  const [imageCount, setImageCount] = useState<number>(1); // 1, 2, 4
  const [negativePrompt, setNegativePrompt] = useState("");
  const [showNegativePrompt, setShowNegativePrompt] = useState(false);
  const [showAdvancedOptics, setShowAdvancedOptics] = useState(false);

  // Popover Toggles for Floating Bottom Dock
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);
  const [ratioPopoverOpen, setRatioPopoverOpen] = useState(false);
  const [qualityPopoverOpen, setQualityPopoverOpen] = useState(false);
  const [resolutionPopoverOpen, setResolutionPopoverOpen] = useState(false);
  const [opticsPopoverOpen, setOpticsPopoverOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState("");

  // Guide Modal State
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  // Status & Single/Multi Result
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Image-to-Image / Variations State
  const [refImageFile, setRefImageFile] = useState<File | null>(null);
  const [refImageUrl, setRefImageUrl] = useState("");
  const [uploadingRef, setUploadingRef] = useState(false);
  const [variationStrength, setVariationStrength] = useState(0.65);
  const [batchSize, setBatchSize] = useState(4);
  const [styleExploration, setStyleExploration] = useState(true);
  const [variationsResult, setVariationsResult] = useState<any>(null);
  const [loadingVariations, setLoadingVariations] = useState(false);

  // Vault Picker Modal State
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultImages, setVaultImages] = useState<string[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);

  // Safeguard Confirmation Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState<GenerationConfirmDetails | null>(null);

  // Real-Time Progress States
  const [progress, setProgress] = useState(0);
  const [stageTitle, setStageTitle] = useState("DIFFUSION SAMPLER");
  const [statusMessage, setStatusMessage] = useState("Conditioning text latents...");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [telemetryLogs, setTelemetryLogs] = useState<LogEntry[]>([]);

  // Close popovers on click outside
  const dockRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setModelPopoverOpen(false);
        setRatioPopoverOpen(false);
        setQualityPopoverOpen(false);
        setResolutionPopoverOpen(false);
        setOpticsPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeAllPopovers = () => {
    setModelPopoverOpen(false);
    setRatioPopoverOpen(false);
    setQualityPopoverOpen(false);
    setResolutionPopoverOpen(false);
    setOpticsPopoverOpen(false);
  };

  // Auto-resize prompt textarea so the full prompt is visible without clipping
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (promptTextareaRef.current) {
      promptTextareaRef.current.style.height = "auto";
      const scrollH = promptTextareaRef.current.scrollHeight;
      promptTextareaRef.current.style.height = `${Math.min(Math.max(scrollH, 46), 140)}px`;
    }
  }, [prompt]);

  // Model details
  const activeModel = DIFFUSION_MODELS.find((m) => m.value === model) || DIFFUSION_MODELS[0];

  // Batch count stepper handlers
  const handleBatchIncrement = () => {
    if (imageCount === 1) setImageCount(2);
    else if (imageCount === 2) setImageCount(4);
    else setImageCount(1);
  };

  const handleBatchDecrement = () => {
    if (imageCount === 4) setImageCount(2);
    else if (imageCount === 2) setImageCount(1);
    else setImageCount(4);
  };

  // Safeguard Spend Confirmation Modal
  const requestImageConfirm = () => {
    if (!prompt.trim() && studioMode === "text_to_image") return;
    if (!refImageUrl && studioMode === "image_variations") return;

    const isFree = false;
    const baseUsd = model === "gpt-image-2" ? 0.040 : model === "gpt-image-1" ? 0.035 : 0.020;
    const costUsd = baseUsd * (studioMode === "text_to_image" ? imageCount : batchSize);
    const costInr = Math.round(costUsd * 83.5 * 100) / 100;

    setConfirmDetails({
      serviceType: "image",
      modelName: activeModel.label,
      provider: model.includes("gpt") || model.includes("dall") ? "OpenAI Flagship" : model.includes("imagen") ? "Google DeepMind" : "Replicate Diffusion",
      isFree,
      costUsd,
      costInr,
      prompt: studioMode === "text_to_image" ? prompt.trim() : `Reference: ${refImageUrl.split("/").pop()}`,
      specs: {
        dimensions: aspectRatio,
        resolution,
        quality,
        batchCount: `${studioMode === "text_to_image" ? imageCount : batchSize} variation(s)`,
        lens,
      },
    });
    setConfirmModalOpen(true);
  };

  // AI Prompt Enhancer Copilot
  const [enhancingPrompt, setEnhancingPrompt] = useState(false);
  const enhancePromptText = async () => {
    if (!prompt.trim()) return;
    setEnhancingPrompt(true);
    try {
      const data = await api.enhancePrompt({ prompt, style: "cinematic" });
      if (data && data.enhanced_prompt) {
        setPrompt(data.enhanced_prompt);
      } else {
        setPrompt(
          (prev) =>
            `${prev.trim()}, 8k master photography, raw photo detail, hyper-realistic skin texture, 35mm prime lens at f/1.4, volumetric rim lighting, cinematic color grading, master composition`
        );
      }
    } catch (_) {
      setPrompt(
        (prev) =>
          `${prev.trim()}, 8k master photography, raw photo detail, hyper-realistic skin texture, 35mm prime lens at f/1.4, volumetric rim lighting, cinematic color grading, master composition`
      );
    } finally {
      setEnhancingPrompt(false);
    }
  };

  // Single or Multi-Variation Generation
  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    setSelectedImageIndex(0);
    setProgress(10);
    setStageTitle("01 • Text Prompt Conditioning");
    setStatusMessage(`Encoding CLIP prompt vectors on ${activeModel.label}...`);
    setElapsedSeconds(0);
    const nowTime = new Date().toTimeString().split(" ")[0];
    setTelemetryLogs([
      { timestamp: nowTime, message: `Dispatched image synthesis on model: ${model} (Batch Count: ${imageCount})` },
    ]);

    const startTimestamp = Date.now();
    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed === 1) {
        setProgress(35);
        setStageTitle("02 • Sampling Latent Noise Tensor");
        setStatusMessage(`Denoising ${samplingSteps} steps (CFG: ${cfgScale})...`);
        setTelemetryLogs((prev) => [
          ...prev,
          { timestamp: new Date().toTimeString().split(" ")[0], message: `Applying optical preset: ${lens}, ${aperture}, ${lighting}` },
        ]);
      } else if (elapsed === 3) {
        setProgress(70);
        setStageTitle("03 • Photoreal Texture Diffusion");
        setStatusMessage(`Refining ${resolution} micro-textures & film grain...`);
        setTelemetryLogs((prev) => [
          ...prev,
          { timestamp: new Date().toTimeString().split(" ")[0], message: `Simulating ${filmStock} emulation color response` },
        ]);
      } else if (elapsed >= 5 && elapsed < 12) {
        setProgress((prev) => Math.min(prev + 3, 95));
      }
    }, 1000);

    try {
      const sizeMap: Record<string, string> = {
        "16:9": "1792x1024",
        "9:16": "1024x1792",
        "1:1": "1024x1024",
        "4:3": "1536x1152",
        "21:9": "1536x640",
      };
      const sizeParam = sizeMap[aspectRatio] || "1792x1024";

      const data = await api.generateImage({
        prompt: prompt.trim(),
        negative_prompt: negativePrompt.trim(),
        model,
        size: sizeParam,
        aspect_ratio: aspectRatio,
        resolution,
        quality,
        style: "cinematic",
        enhance_prompt: false,
        lens,
        aperture,
        lighting,
        film_stock: filmStock,
        cfg_scale: cfgScale,
        sampling_steps: samplingSteps,
        seed: seed ? parseInt(seed, 10) : undefined,
        count: imageCount,
      });

      setResult(data);
      if (data && data.success) {
        setProgress(100);
        setStageTitle("CANVAS DIFFUSION COMPLETE");
        setStatusMessage("Visual canvas synthesized successfully!");
        setTelemetryLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toTimeString().split(" ")[0],
            message: `Render complete: ${data.filename || (data.images && data.images.length + " variations")}`,
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

  // Image-to-Image Variations Generation
  const generateBulkVariations = async () => {
    if (!refImageUrl) return;
    setLoadingVariations(true);
    setVariationsResult(null);
    setProgress(15);
    setStageTitle("01 • Reference Latent Encoding");
    setStatusMessage(`Encoding source image features at strength ${variationStrength}...`);
    setElapsedSeconds(0);
    const nowTime = new Date().toTimeString().split(" ")[0];
    setTelemetryLogs([
      { timestamp: nowTime, message: `Generating ${batchSize}x batch variations from reference...` },
    ]);

    const startTimestamp = Date.now();
    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed === 1) {
        setProgress(40);
        setStageTitle("02 • Multi-Angle Camera Perturbation");
        setStatusMessage(`Calculating ${batchSize} alternate perspective vectors...`);
      } else if (elapsed === 3) {
        setProgress(75);
        setStageTitle("03 • Rendering Batch Keyframes");
        setStatusMessage(`Denoising ${batchSize} distinct variations...`);
      } else if (elapsed >= 5 && elapsed < 12) {
        setProgress((prev) => Math.min(prev + 3, 95));
      }
    }, 1000);

    try {
      const data = await api.generateVariations({
        reference_image_path: refImageUrl,
        prompt: prompt.trim(),
        batch_size: batchSize,
        variation_strength: variationStrength,
        style_exploration: styleExploration,
        aspect_ratio: aspectRatio,
        resolution,
      });
      setVariationsResult(data);
      if (data && data.success) {
        setProgress(100);
        setStageTitle("VARIATIONS COMPLETE");
        setStatusMessage(`Successfully generated ${data.total_generated || data.variations?.length || batchSize} variations!`);
      }
    } catch (e: any) {
      setVariationsResult({ success: false, error: e.message });
    } finally {
      clearInterval(timerInterval);
      setLoadingVariations(false);
    }
  };

  // Upload reference image
  const handleRefFileUpload = async (file: File) => {
    setUploadingRef(true);
    try {
      const data = await api.uploadReferenceImage(file);
      if (data.success && data.url) {
        setRefImageUrl(data.url);
      }
    } catch (e: any) {
      alert(`Upload failed: ${e.message}`);
    }
    setUploadingRef(false);
  };

  // Open Vault Picker Modal
  const openVaultPicker = async () => {
    setVaultOpen(true);
    setLoadingVault(true);
    try {
      const data = await api.getVaultImages();
      setVaultImages(data.files || []);
    } catch (e: any) {
      console.error(e);
    }
    setLoadingVault(false);
  };

  // Copy prompt helper
  const handleCopyPrompt = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Filtered models for search in popover
  const filteredModels = DIFFUSION_MODELS.filter((m) => {
    if (!modelSearchQuery.trim()) return true;
    const q = modelSearchQuery.toLowerCase();
    return (
      m.label.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      (m.category && m.category.toLowerCase().includes(q))
    );
  });

  // Current display image from result
  const displayImages: Array<{ url: string; filename: string }> =
    result?.images && result.images.length > 0
      ? result.images
      : result?.url
      ? [{ url: result.url, filename: result.filename || "output.png" }]
      : [];

  const currentDisplayImage = displayImages[selectedImageIndex] || displayImages[0];

  // Actual Spend Calculation (Dynamic based on selected model and batch count)
  const activeBatchCount = studioMode === "text_to_image" ? imageCount : batchSize;
  const currentUnitCost = MODEL_PRICES[model] ?? 0.020;
  const currentTotalSpendUsd = currentUnitCost * activeBatchCount;
  const currentTotalSpendInr = Math.round(currentTotalSpendUsd * 83.5 * 100) / 100;

  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-between pb-32 font-jakarta">
      {/* Top Bar: Studio Mode Tabs & Guide Trigger */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-[#09090d] p-1 rounded-xl border border-black/[0.08] dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => setStudioMode("text_to_image")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
              studioMode === "text_to_image"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-bold shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Text to Image</span>
          </button>
          <button
            type="button"
            onClick={() => setStudioMode("image_variations")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
              studioMode === "image_variations"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-bold shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Image Variations</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setHowItWorksOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-[#09090d] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>Studio Guide</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-zinc-500 px-3 py-1 rounded-full bg-zinc-100/60 dark:bg-zinc-900/60 border border-black/[0.06] dark:border-white/[0.06]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>ACTIVE: {activeModel.label}</span>
          </div>
        </div>
      </div>

      {/* Center Canvas Viewport */}
      <div className="flex-1 flex flex-col justify-center items-center py-6 px-2 w-full max-w-6xl mx-auto">
        {/* State A: In-Flight Progress Bar */}
        {(loading || loadingVariations) && (
          <div className="w-full max-w-2xl py-12 space-y-6 animate-in fade-in duration-200">
            <LiveProgressBar
              progress={progress}
              stageTitle={stageTitle}
              statusMessage={statusMessage}
              elapsedSeconds={elapsedSeconds}
              logs={telemetryLogs}
              isActive={loading || loadingVariations}
              showTerminal={true}
            />
          </div>
        )}

        {/* State B: Result Ready (Single or Multi-Variation Canvas) */}
        {!loading && !loadingVariations && result && result.success && (
          <div className="w-full space-y-4 animate-in fade-in duration-200">
            {/* Batch Variations Selector Strip */}
            {displayImages.length > 1 && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-100/90 dark:bg-[#09090d]/90 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-semibold">
                    Batch Variations ({displayImages.length})
                  </span>
                </div>
                <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide py-1">
                  {displayImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={cn(
                        "relative rounded-xl overflow-hidden aspect-square w-16 h-16 border-2 transition-all cursor-pointer shrink-0 shadow-sm",
                        selectedImageIndex === idx
                          ? "border-zinc-950 dark:border-white ring-2 ring-zinc-950/20 dark:ring-white/20 scale-105"
                          : "border-black/[0.08] dark:border-white/[0.08] opacity-70 hover:opacity-100"
                      )}
                    >
                      <img src={getMediaUrl(img.url)} alt={`Variation ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0.5 right-1 text-[8px] font-mono bg-black/80 text-white px-1 rounded">
                        #{idx + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Master Image Viewport */}
            <div className="relative rounded-2xl overflow-hidden border border-black/[0.1] dark:border-white/[0.1] bg-black shadow-2xl group flex items-center justify-center min-h-[460px] max-h-[680px]">
              <img
                src={getMediaUrl(currentDisplayImage.url)}
                alt="Synthesized Output"
                className="w-full h-full object-contain max-h-[680px]"
              />

              {/* Floating Top Left Specs Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-black/80 text-zinc-200 border border-white/10 backdrop-blur-sm">
                  {activeModel.label} • {resolution.toUpperCase()} • {aspectRatio}
                </span>
                {result.simulated && (
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    SIMULATED
                  </span>
                )}
              </div>

              {/* Floating Actions on Canvas */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-95 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black text-white text-xs font-mono border border-white/20 backdrop-blur-md cursor-pointer transition-colors shadow-md whitespace-nowrap shrink-0"
                  title="Copy Prompt"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPrompt ? "Copied" : "Prompt"}</span>
                </button>

                <a
                  href={getMediaUrl(currentDisplayImage.url)}
                  download={`omnistudio_${Date.now()}.png`}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-heading font-bold shadow-lg cursor-pointer transition-all active:scale-95 whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Master</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* State C: Variations Mode Output (when Variations mode has run) */}
        {!loading && !loadingVariations && variationsResult && variationsResult.success && (
          <div className="w-full space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest font-semibold">
                Generated {variationsResult.variations?.length || 0} Variations
              </span>
              <button
                type="button"
                onClick={() => setVariationsResult(null)}
                className="text-xs font-mono text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Dismiss</span>
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {variationsResult.variations?.map((v: any, idx: number) => (
                <div key={idx} className="hf-card rounded-xl overflow-hidden group relative flex flex-col justify-between">
                  <img src={getMediaUrl(v.url)} alt={v.description} className="w-full aspect-square object-cover" />
                  <div className="p-2.5 bg-zinc-50 dark:bg-[#060609] border-t border-black/[0.06] dark:border-white/[0.06]">
                    <p className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 line-clamp-1">{v.description}</p>
                    <a
                      href={getMediaUrl(v.url)}
                      download
                      className="mt-2 w-full flex items-center justify-center gap-1 py-1 rounded bg-zinc-950 text-white dark:bg-white dark:text-black text-[10px] font-mono font-bold hover:opacity-90"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* State Error: Display clear error feedback if image generation fails */}
        {!loading && !loadingVariations && result && !result.success && (
          <div className="w-full max-w-lg my-12 p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-mono font-bold text-rose-300 uppercase tracking-wider">Generation Failed</h3>
              <p className="text-xs text-zinc-300 font-mono leading-relaxed max-w-md mx-auto">
                {result.error || "An error occurred during image generation."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono border border-zinc-800 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={generate}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition-colors shadow-lg cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* State Variations Error: Display clear variations error feedback */}
        {!loading && !loadingVariations && variationsResult && !variationsResult.success && (
          <div className="w-full max-w-lg my-12 p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-mono font-bold text-rose-300 uppercase tracking-wider">Variations Failed</h3>
              <p className="text-xs text-zinc-300 font-mono leading-relaxed max-w-md mx-auto">
                {variationsResult.error || "An error occurred during variations generation."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVariationsResult(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono border border-zinc-800 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={generateBulkVariations}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition-colors shadow-lg cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* State D: Idle Showcase Hero (Matching Higgsfield Reference Screenshot) */}
        {!loading && !loadingVariations && !result && !variationsResult && (
          <div className="w-full flex flex-col items-center justify-center text-center space-y-6 py-6 animate-in fade-in duration-300">
            {/* Visual Overlapping Gallery Cards */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 py-3 overflow-hidden max-w-md sm:max-w-xl mx-auto">
              <div className="w-24 sm:w-28 h-36 sm:h-44 rounded-2xl overflow-hidden border border-black/[0.1] dark:border-white/[0.1] shadow-xl transform -rotate-6 transition-transform hover:rotate-0 hover:scale-105">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
                  alt="Fashion Portrait"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-24 sm:w-28 h-36 sm:h-44 rounded-2xl overflow-hidden border border-black/[0.1] dark:border-white/[0.1] shadow-2xl transform -translate-y-2 scale-105">
                <img
                  src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80"
                  alt="Sculpture Art"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-24 sm:w-28 h-36 sm:h-44 rounded-2xl overflow-hidden border border-black/[0.1] dark:border-white/[0.1] shadow-xl transform rotate-6 transition-transform hover:rotate-0 hover:scale-105">
                <img
                  src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=400&q=80"
                  alt="Neon Architecture"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Hero Headlines */}
            <div className="space-y-2 max-w-xl">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight text-zinc-950 dark:text-white uppercase">
                START CREATING WITH{" "}
                <span className="text-emerald-600 dark:text-emerald-400 underline decoration-emerald-500/30">
                  {activeModel.label}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-jakarta leading-relaxed">
                Describe a character, mood, or style — and watch it come to life with studio-grade lighting and precision optics.
              </p>
            </div>

            {/* Quick Inspiration Prompt Chips (Clean, No Star Signs) */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl pt-2">
              {INSPIRATION_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(item.prompt)}
                  className="flex items-center px-3.5 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-[#0c0c12] dark:hover:bg-zinc-800/80 border border-black/[0.07] dark:border-white/[0.08] text-xs font-jakarta text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer hover:scale-102 font-medium"
                >
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Studio Dock (The Higgsfield Signature Dock) */}
      <div
        ref={dockRef}
        data-lenis-prevent="true"
        className="fixed bottom-6 left-0 lg:left-64 right-0 mx-auto z-40 w-[94%] max-w-4xl bg-white/95 dark:bg-[#0b0b10]/95 backdrop-blur-2xl border border-black/[0.12] dark:border-white/[0.14] rounded-2xl shadow-2xl p-3 space-y-2.5 transition-all duration-200 pointer-events-auto"
      >
        {/* Row 1: Professional Studio Prompt Input Bar (Auto-Expanding, Clean & Minimalist) */}
        <div className="relative flex items-start rounded-2xl bg-zinc-100/80 dark:bg-[#07070b]/90 border border-black/[0.08] dark:border-white/[0.1] focus-within:border-zinc-400 dark:focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-400/20 dark:focus-within:ring-zinc-500/20 transition-all p-1">
          <textarea
            ref={promptTextareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                requestImageConfirm();
              }
            }}
            placeholder={
              studioMode === "text_to_image"
                ? "Describe what you want to create (subject, scene, lighting, camera angle)..."
                : "Describe modifications or style directives for reference image..."
            }
            className="w-full bg-transparent border-none px-3.5 py-2.5 text-xs sm:text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none font-jakarta resize-none pr-16 min-h-[48px] max-h-36 leading-relaxed overflow-y-auto"
          />

          {/* Prompt Bar Actions (Clear & Negative Filter) */}
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 z-10">
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
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent shadow-xs"
                  : "bg-white/80 dark:bg-zinc-800/80 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 border-black/[0.08] dark:border-white/[0.08]"
              )}
              title="Toggle Negative Prompt (Exclude elements)"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Negative Prompt Expandable Input */}
        {showNegativePrompt && (
          <div className="animate-in fade-in slide-in-from-bottom-1 duration-150">
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Negative prompt (e.g. blurry, extra fingers, low quality, artifacts, watermark)..."
              className="w-full bg-zinc-100/70 dark:bg-[#060609] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none font-mono"
            />
          </div>
        )}

        {/* Reference Image Bar (In Variations Mode) */}
        {studioMode === "image_variations" && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-100/80 dark:bg-[#060609] border border-black/[0.08] dark:border-white/[0.08] gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">REFERENCE IMAGE:</span>
              {refImageUrl ? (
                <div className="flex items-center gap-2">
                  <img src={getMediaUrl(refImageUrl)} alt="Ref" className="w-6 h-6 rounded object-cover border border-white/20" />
                  <span className="text-xs font-mono text-zinc-800 dark:text-zinc-200 truncate max-w-[140px]">
                    {refImageUrl.split("/").pop()}
                  </span>
                  <button onClick={() => setRefImageUrl("")} className="text-zinc-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-zinc-400 italic">No image selected</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openVaultPicker}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <FolderArchive className="w-3 h-3" />
                <span>Vault</span>
              </button>
              <label className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer">
                <Upload className="w-3 h-3" />
                <span>Upload</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleRefFileUpload(e.target.files[0])} />
              </label>
            </div>
          </div>
        )}

        {/* Row 2: Bottom Control Pills Strip + Generate Button */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
          {/* Left Controls Group */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* 1. Model Selector Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  closeAllPopovers();
                  setModelPopoverOpen(!modelPopoverOpen);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-[#12121a] dark:hover:bg-[#181824] border border-black/[0.08] dark:border-white/[0.08] text-xs font-heading font-bold text-zinc-900 dark:text-white transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
              >
                <Sparkle className="w-3.5 h-3.5 text-emerald-500" />
                <span>{activeModel.label}</span>
                <ChevronUp className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform", modelPopoverOpen && "rotate-180")} />
              </button>

              {/* Model Selector Upward Popover (Exact Higgsfield Menu) */}
              {modelPopoverOpen && (
                <div
                  data-lenis-prevent="true"
                  className="absolute bottom-full left-0 mb-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#0c0c12] border border-black/[0.12] dark:border-white/[0.12] shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2.5"
                >
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      placeholder="Search models..."
                      className="w-full bg-zinc-100 dark:bg-[#14141c] border border-black/[0.08] dark:border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none font-jakarta"
                    />
                  </div>

                  <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase px-1 font-semibold flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Featured Models</span>
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
                              ? "bg-zinc-100 dark:bg-[#1a1a26] text-zinc-950 dark:text-white ring-1 ring-black/[0.1] dark:ring-white/[0.1]"
                              : "hover:bg-zinc-50 dark:hover:bg-[#14141c] text-zinc-700 dark:text-zinc-300"
                          )}
                        >
                          <div className="space-y-0.5 min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold font-heading">{m.label}</span>
                              {m.badge && (
                                <span
                                  className={cn(
                                    "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider",
                                    m.badge === "PREMIUM"
                                      ? "bg-amber-400/20 text-amber-600 dark:text-amber-400"
                                      : m.badge === "NEW"
                                      ? "bg-emerald-400/20 text-emerald-600 dark:text-emerald-400"
                                      : "bg-black/10 dark:bg-white/10 text-zinc-600 dark:text-zinc-300"
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
                          {isSelected && <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />}
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
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-[#12121a] dark:hover:bg-[#181824] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
                title="Select Aspect Ratio"
              >
                <Maximize2 className="w-3 h-3 text-zinc-400" />
                <span>{aspectRatio}</span>
              </button>

              {ratioPopoverOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-56 rounded-2xl bg-white dark:bg-[#0c0c12] border border-black/[0.12] dark:border-white/[0.12] shadow-2xl p-2 z-50 space-y-1">
                  <div className="text-[10px] font-mono text-zinc-500 px-2 py-1 uppercase tracking-wider">
                    Aspect Ratio
                  </div>
                  {RATIOS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setAspectRatio(r.id);
                        setRatioPopoverOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-colors cursor-pointer",
                        aspectRatio === r.id
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-bold"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <span>{r.label}</span>
                      <span className="text-[10px] opacity-70">{r.sub}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Quality Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  closeAllPopovers();
                  setQualityPopoverOpen(!qualityPopoverOpen);
                }}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-[#12121a] dark:hover:bg-[#181824] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
                title="Select Quality Profile"
              >
                <Sun className="w-3 h-3 text-zinc-400" />
                <span className="capitalize">{quality === "ultra" ? "Master 8K" : quality === "hd" ? "High" : "Standard"}</span>
              </button>

              {qualityPopoverOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-52 rounded-2xl bg-white dark:bg-[#0c0c12] border border-black/[0.12] dark:border-white/[0.12] shadow-2xl p-2 z-50 space-y-1">
                  <div className="text-[10px] font-mono text-zinc-500 px-2 py-1 uppercase tracking-wider">
                    Quality Profile
                  </div>
                  {QUALITIES.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setQuality(q.id);
                        setQualityPopoverOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-colors cursor-pointer",
                        quality === q.id
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-bold"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <span>{q.label}</span>
                      <span className="text-[10px] opacity-70">{q.sub}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Resolution Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  closeAllPopovers();
                  setResolutionPopoverOpen(!resolutionPopoverOpen);
                }}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-[#12121a] dark:hover:bg-[#181824] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
                title="Select Resolution"
              >
                <Gauge className="w-3 h-3 text-zinc-400" />
                <span className="uppercase">{resolution}</span>
              </button>

              {resolutionPopoverOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-52 rounded-2xl bg-white dark:bg-[#0c0c12] border border-black/[0.12] dark:border-white/[0.12] shadow-2xl p-2 z-50 space-y-1">
                  <div className="text-[10px] font-mono text-zinc-500 px-2 py-1 uppercase tracking-wider">
                    Output Resolution
                  </div>
                  {RESOLUTIONS.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => {
                        setResolution(res.id);
                        setResolutionPopoverOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-colors cursor-pointer",
                        resolution === res.id
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-bold"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <span className="uppercase">{res.label}</span>
                      <span className="text-[10px] opacity-70">{res.sub}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Optics Pill (Lenses / Apertures) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  closeAllPopovers();
                  setOpticsPopoverOpen(!opticsPopoverOpen);
                }}
                className="hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-[#12121a] dark:hover:bg-[#181824] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
                title="Camera Optics & Lens"
              >
                <Camera className="w-3 h-3 text-zinc-400" />
                <span>{lens.split(" ")[0] || "Optics"}</span>
              </button>

              {opticsPopoverOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-72 rounded-2xl bg-white dark:bg-[#0c0c12] border border-black/[0.12] dark:border-white/[0.12] shadow-2xl p-3 z-50 space-y-2 font-mono text-xs">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    Focal Length & Lens
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {LENSES.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          setLens(l.id);
                          setOpticsPopoverOpen(false);
                        }}
                        className={cn(
                          "p-2 rounded-xl text-left border text-[11px] transition-colors cursor-pointer",
                          lens === l.id
                            ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent font-bold"
                            : "border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>

                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                    Aperture Depth of Field
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {APERTURES.map((ap) => (
                      <button
                        key={ap.id}
                        type="button"
                        onClick={() => {
                          setAperture(ap.id);
                          setOpticsPopoverOpen(false);
                        }}
                        className={cn(
                          "p-1.5 rounded-lg text-center border text-[11px] transition-colors cursor-pointer",
                          aperture === ap.id
                            ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent font-bold"
                            : "border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        {ap.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 6. Batch Stepper (– 1/4 +) Exactly Matching Higgsfield Screenshot */}
            <div className="flex items-center bg-zinc-100 dark:bg-[#12121a] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-2 py-1 text-xs font-mono text-zinc-800 dark:text-zinc-200">
              <button
                type="button"
                onClick={handleBatchDecrement}
                className="px-1.5 py-0.5 hover:text-black dark:hover:text-white cursor-pointer"
                title="Decrease Batch"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="px-2 font-bold tracking-widest">{imageCount}/4</span>
              <button
                type="button"
                onClick={handleBatchIncrement}
                className="px-1.5 py-0.5 hover:text-black dark:hover:text-white cursor-pointer"
                title="Increase Batch"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Right Generate CTA Action Button (Actual Spend, No Star Signs) */}
          <button
            type="button"
            onClick={requestImageConfirm}
            disabled={loading || loadingVariations || (!prompt.trim() && studioMode === "text_to_image")}
            className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-40 font-heading font-extrabold text-xs sm:text-sm tracking-tight transition-all cursor-pointer shadow-lg active:scale-98 whitespace-nowrap shrink-0"
          >
            {loading || loadingVariations ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <span>Generate</span>
                <span className="font-mono text-xs font-semibold opacity-90 border-l border-current/25 pl-2">
                  ₹{currentTotalSpendInr.toFixed(2)} (${currentTotalSpendUsd.toFixed(3)})
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Spend Safeguard Confirmation Modal */}
      <GenerationConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => {
          setConfirmModalOpen(false);
          if (studioMode === "text_to_image") {
            generate();
          } else {
            generateBulkVariations();
          }
        }}
        details={confirmDetails}
        loading={loading || loadingVariations}
      />

      {/* Vault Picker Modal */}
      {vaultOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#09090d] border border-black/[0.1] dark:border-white/[0.1] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider">Select From Vault</span>
              <button onClick={() => setVaultOpen(false)} className="text-zinc-500 hover:text-black dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-3">
              {vaultImages.map((img, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setRefImageUrl(img);
                    setVaultOpen(false);
                  }}
                  className="rounded-xl overflow-hidden aspect-square border border-black/[0.08] dark:border-white/[0.08] hover:border-black dark:hover:border-white cursor-pointer"
                >
                  <img src={getMediaUrl(img)} alt="Vault item" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* How It Works Studio Guide Modal */}
      <HowItWorksModal
        isOpen={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
      />
    </div>
  );
}
