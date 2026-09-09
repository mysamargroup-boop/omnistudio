"use client";
import React, { useState } from "react";
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
  Play,
  AlertCircle,
  Key,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import Dropdown from "@/components/ui/Dropdown";
import GenerationConfirmModal, { GenerationConfirmDetails } from "@/components/ui/GenerationConfirmModal";
import LiveProgressBar, { LogEntry } from "@/components/ui/LiveProgressBar";

const DIFFUSION_MODELS = [
  { value: "gpt-image-1-mini", label: "OpenAI GPT-Image 1 Mini", description: "Fast, High-Precision Photorealism & Semantic Fidelity", badge: "ACTIVE" },
  { value: "gpt-image-1", label: "OpenAI GPT-Image 1 Pro", description: "Flagship High-Precision Photographic Diffusion Engine", badge: "PRO" },
  { value: "gpt-image-2", label: "OpenAI GPT-Image 2 (Next-Gen)", description: "Frontier Multimodal Diffusion with Dynamic Light Simulation", badge: "ULTRA" },
  { value: "imagen_3", label: "Google Imagen 3 (DeepMind)", description: "Hyper-realistic Lighting & Texture Precision", badge: "ACTIVE" },
  { value: "gemini_flash_image", label: "Google Gemini 2.5 Flash Image", description: "Ultra-Fast Multimodal Photorealism", badge: "FAST" },
  { value: "dall-e-3", label: "DALL-E 3 HD (OpenAI Auto-Route)", description: "Auto-routes to GPT-Image 1 with 8K Clarity", badge: "PRO" },
  { value: "flux_pro", label: "Flux.1 Pro (Black Forest Labs)", description: "State-of-the-Art Typography & Photorealism", badge: "SOTA" },
  { value: "flux_dev", label: "Flux.1 Dev (Open Weights)", description: "High-Fidelity Guidance & Fine Detail", badge: "DEV" },
  { value: "flux-schnell", label: "Flux.1 Schnell (Fast Latent)", description: "Speed Latent Diffusion & Rapid Generation", badge: "FAST" },
  { value: "midjourney_v6", label: "Midjourney v6.1 (Photoreal)", description: "Cinematic Lighting, Contrast & Color Grading", badge: "PRO" },
  { value: "recraft_v3", label: "Recraft V3 (Design & Vector)", description: "Top-Tier Brand Asset & Digital Art Engine", badge: "NEW" },
  { value: "sd_35_large", label: "Stable Diffusion 3.5 Large", description: "Advanced Multimodal Prompt Adherence", badge: "OPEN" },
  { value: "ideogram_v2", label: "Ideogram v2 (Typography & Art)", description: "Flawless In-Image Lettering & Graphic Design", badge: "TYPE" },
  { value: "omni_diffusion", label: "OmniDiffusion 4.0 Pro", description: "Parametric Studio Neural Diffusion Engine", badge: "LOCAL" },
];

const RESOLUTIONS = [
  { id: "720p", label: "720p HD", sub: "1280x720" },
  { id: "1080p", label: "1080p FHD", sub: "1920x1080" },
  { id: "2k", label: "2K QHD", sub: "2560x1440" },
  { id: "4k", label: "4K UHD", sub: "3840x2160" },
  { id: "8k", label: "8K Master", sub: "7680x4320" },
];

const RATIOS = [
  { id: "16:9", label: "16:9", sub: "Landscape", iconClass: "w-6 h-3.5" },
  { id: "9:16", label: "9:16", sub: "Reels / Story", iconClass: "w-3.5 h-6" },
  { id: "1:1", label: "1:1", sub: "Square", iconClass: "w-4 h-4" },
  { id: "4:3", label: "4:3", sub: "Classic / TV", iconClass: "w-5 h-4" },
  { id: "21:9", label: "21:9", sub: "Cinemascope", iconClass: "w-7 h-3" },
];

const QUALITIES = [
  { id: "standard", label: "Standard", desc: "Fast Draft" },
  { id: "hd", label: "HD Studio", desc: "High Clarity" },
  { id: "ultra", label: "Master 8K", desc: "RAW Detail" },
];

const LENSES = [
  { id: "16mm Ultra-Wide", label: "16mm Ultra-Wide" },
  { id: "24mm Anamorphic", label: "24mm Anamorphic" },
  { id: "35mm Prime", label: "35mm Prime" },
  { id: "50mm Natural", label: "50mm Natural" },
  { id: "85mm Portrait", label: "85mm Portrait" },
  { id: "100mm Macro", label: "100mm Macro" },
];

const APERTURES = [
  { id: "f/1.2", label: "f/1.2", desc: "Ultra Bokeh" },
  { id: "f/2.8", label: "f/2.8", desc: "Portrait" },
  { id: "f/8", label: "f/8", desc: "Landscape" },
  { id: "f/16", label: "f/16", desc: "Deep Field" },
];

const LIGHTING_PRESETS = [
  { id: "Golden Hour Sunlight", label: "Golden Hour", desc: "Warm Sun" },
  { id: "Volumetric God Rays", label: "God Rays", desc: "Atmospheric" },
  { id: "Studio Softbox Lighting", label: "Studio Softbox", desc: "Clean" },
  { id: "Cyberpunk Neon Lighting", label: "Cyberpunk Neon", desc: "Dual Tone" },
  { id: "Moody Low-Key Chiaroscuro", label: "Chiaroscuro", desc: "Dramatic" },
  { id: "Harsh Direct Sunlight", label: "Direct Sun", desc: "High Contrast" },
];

const FILM_STOCKS = [
  { id: "Kodak Portra 400", label: "Kodak Portra 400", desc: "Warm Skin" },
  { id: "Fujifilm Velvia", label: "Fuji Velvia", desc: "Vivid Tone" },
  { id: "Hollywood Teal & Orange", label: "Teal & Orange", desc: "Blockbuster" },
  { id: "Monochrome Silver Noir", label: "Silver Noir", desc: "B&W Film" },
  { id: "Cinematic Bleach Bypass", label: "Bleach Bypass", desc: "Gritty" },
];

const STEP_PRESETS = [
  { value: 20, label: "20 Steps", desc: "Fast" },
  { value: 30, label: "30 Steps", desc: "Balanced" },
  { value: 50, label: "50 Steps", desc: "Ultra" },
];

export default function ImageStudio() {
  const router = useRouter();

  // Studio Mode: Single Text-to-Image vs Bulk Image-to-Image Variations
  const [activeMode, setActiveMode] = useState<"text_to_image" | "image_variations">("text_to_image");

  // Prompt & Model (Text to Image)
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [model, setModel] = useState("dall-e-3");
  const [enhance, setEnhance] = useState(true);

  // Quality, Resolution & Dimensions
  const [resolution, setResolution] = useState("1080p");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [quality, setQuality] = useState("hd");
  const [style, setStyle] = useState("cinematic");

  // Camera Optics & Environment
  const [lens, setLens] = useState("35mm Prime");
  const [aperture, setAperture] = useState("f/2.8");
  const [lighting, setLighting] = useState("Volumetric God Rays");
  const [filmStock, setFilmStock] = useState("Kodak Portra 400");

  // Fine-tuning Controls
  const [cfgScale, setCfgScale] = useState(7.5);
  const [samplingSteps, setSamplingSteps] = useState(30);
  const [seed, setSeed] = useState<string>("");

  // Status & Single/Multi Result
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [imageCount, setImageCount] = useState<number>(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  // ─── Image-to-Image / Bulk Variations State ───
  const [refImageUrl, setRefImageUrl] = useState<string>("");
  const [uploadingRef, setUploadingRef] = useState(false);
  const [varPrompt, setVarPrompt] = useState("");
  const [batchSize, setBatchSize] = useState<number>(4);
  const [variationStrength, setVariationStrength] = useState<number>(0.5);
  const [variationsResult, setVariationsResult] = useState<any>(null);
  const [loadingVariations, setLoadingVariations] = useState(false);
  const [copiedVarId, setCopiedVarId] = useState<number | null>(null);

  // Vault Picker Modal State
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultImages, setVaultImages] = useState<any[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);

  // Confirmation Modal State (Zero Unintended API Calls)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState<GenerationConfirmDetails | null>(null);
  const [confirmAction, setConfirmAction] = useState<"single" | "variations">("single");

  const requestGenerateConfirm = () => {
    if (!prompt.trim()) return;
    setConfirmAction("single");

    let costUsd = 0.030;
    let provider = "Google AI Studio";
    let isFree = false;

    if (model === "imagen_3" || model === "gemini_flash_image") {
      costUsd = 0.030;
      provider = "Google AI Studio";
    } else if (model === "dall-e-3") {
      costUsd = quality === "hd" || quality === "ultra" ? 0.080 : 0.040;
      provider = "OpenAI";
    } else if (model.includes("schnell")) {
      costUsd = 0.003;
      provider = "Replicate / Flux";
    } else if (model.includes("dev")) {
      costUsd = 0.025;
      provider = "Replicate / Flux";
    } else if (model.includes("pro") || model.includes("midjourney")) {
      costUsd = 0.050;
      provider = "Cloud Diffusion";
    } else if (model === "omni_diffusion") {
      costUsd = 0.000;
      provider = "Local Hardware";
      isFree = true;
    }

    const costInr = Math.round(costUsd * 83.5 * 100) / 100;
    const modelObj = DIFFUSION_MODELS.find((m) => m.value === model);

    setConfirmDetails({
      serviceType: "image",
      modelName: modelObj?.label || model,
      provider,
      prompt: prompt.trim(),
      specs: {
        resolution,
        aspectRatio,
        quality,
        lens,
        lighting,
      },
      costUsd,
      costInr,
      isFree,
    });
    setConfirmModalOpen(true);
  };

  const requestVariationsConfirm = () => {
    if (!refImageUrl) return;
    setConfirmAction("variations");
    setConfirmDetails({
      serviceType: "image",
      modelName: `Neural Variation Engine (${batchSize}x Variations)`,
      provider: "Local Hardware",
      prompt: `Generate ${batchSize} multi-angle variations from reference image`,
      specs: {
        batchSize,
        variationStrength: `${Math.round(variationStrength * 100)}%`,
      },
      costUsd: 0.000,
      costInr: 0.00,
      isFree: true,
    });
    setConfirmModalOpen(true);
  };

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 999999999).toString());
  };

  // Upload source reference image
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
            `${prev.trim()}, 8k master photography, raw photo detail, hyper-realistic skin texture, 35mm anamorphic prime lens, volumetric rim lighting, cinematic color grading, master composition`
        );
      }
    } catch (_) {
      setPrompt(
        (prev) =>
          `${prev.trim()}, 8k master photography, raw photo detail, hyper-realistic skin texture, 35mm anamorphic prime lens, volumetric rim lighting, cinematic color grading, master composition`
      );
    } finally {
      setEnhancingPrompt(false);
    }
  };

  // Real-Time Progress States
  const [progress, setProgress] = useState(0);
  const [stageTitle, setStageTitle] = useState("DIFFUSION SAMPLER");
  const [statusMessage, setStatusMessage] = useState("Conditioning text latents...");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [telemetryLogs, setTelemetryLogs] = useState<LogEntry[]>([]);

  // Generate Image (Single or Batch)
  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    setSelectedImageIndex(0);
    setProgress(10);
    setStageTitle("01 • Text Prompt Conditioning");
    setStatusMessage(`Encoding CLIP prompt vectors (${style} style)...`);
    setElapsedSeconds(0);
    const nowTime = new Date().toTimeString().split(" ")[0];
    setTelemetryLogs([
      { timestamp: nowTime, message: `Dispatched image synthesis on model: ${model} (Count: ${imageCount})` }
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
          { timestamp: new Date().toTimeString().split(" ")[0], message: `Applying optical preset: ${lens}, ${aperture}, ${lighting}` }
        ]);
      } else if (elapsed === 3) {
        setProgress(70);
        setStageTitle("03 • Photoreal Texture Diffusion");
        setStatusMessage(`Refining ${resolution} micro-textures & film grain...`);
        setTelemetryLogs((prev) => [
          ...prev,
          { timestamp: new Date().toTimeString().split(" ")[0], message: `Simulating ${filmStock} emulation color response` }
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
        style,
        enhance_prompt: enhance,
        enhance_style: "cinematic",
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
          { timestamp: new Date().toTimeString().split(" ")[0], message: `Render complete: ${data.filename || (data.images && data.images.length + ' variations')}` }
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

  // Generate Bulk Image Variations
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
      { timestamp: nowTime, message: `Generating ${batchSize}x batch variations from reference...` }
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
        prompt: varPrompt.trim(),
        batch_size: batchSize,
        variation_strength: variationStrength,
        model,
        quality,
        resolution,
        aspect_ratio: aspectRatio,
      });
      setVariationsResult(data);
      if (data && data.success) {
        setProgress(100);
        setStageTitle("VARIATIONS BATCH READY");
        setStatusMessage(`Successfully rendered ${data.total || batchSize} variations!`);
      }
    } catch (e: any) {
      setVariationsResult({ success: false, error: e.message });
    } finally {
      clearInterval(timerInterval);
      setLoadingVariations(false);
    }
  };

  const copyPath = (path: string, id?: number) => {
    navigator.clipboard.writeText(path);
    if (id !== undefined) {
      setCopiedVarId(id);
      setTimeout(() => setCopiedVarId(null), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8 pb-12 font-jakarta">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] text-zinc-500 uppercase">
            <span>DIFFUSION LAB 5.0</span>
            <span>•</span>
            <span>TEXT-TO-IMAGE & BULK VARIATIONS</span>
          </div>
          <h1 className="text-3xl font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight">
            Image Diffusion Studio
          </h1>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-700 dark:text-zinc-400 bg-zinc-100 dark:bg-[#09090d] border border-black/[0.08] dark:border-white/[0.08] px-3.5 py-1.5 rounded-full shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>9 DIFFUSION ENGINES + BATCH VARIATION SUITE</span>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-zinc-100 dark:bg-[#09090d] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl max-w-fit">
        <button
          type="button"
          onClick={() => setActiveMode("text_to_image")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer",
            activeMode === "text_to_image"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-semibold shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>TEXT TO IMAGE</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode("image_variations")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer",
            activeMode === "image_variations"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-semibold shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
          )}
        >
          <Grid className="h-3.5 w-3.5" />
          <span>IMAGE-TO-IMAGE / BULK VARIATIONS</span>
        </button>
      </div>

      {/* Main Studio Grid: Viewport on Left (lg:col-span-7), Settings on Right (lg:col-span-5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: Master Viewport / Variations Gallery (order-1 on desktop) */}
        <div className="lg:col-span-7 lg:order-1 space-y-6">
          {/* ─── VIEW 1: SINGLE TEXT-TO-IMAGE CANVAS ─── */}
          {activeMode === "text_to_image" && (
            <div className="hf-card p-6 flex flex-col justify-between min-h-[620px] technical-corner relative">
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

              {result && result.success && (() => {
                const activeImg = (result.images && result.images[selectedImageIndex]) || result;
                const totalBatch = result.images?.length || 1;

                return (
                <div className="space-y-5">
                  {/* Multi-Image Batch Selector Strip */}
                  {totalBatch > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar p-2 rounded-xl bg-zinc-50 dark:bg-[#07070a] border border-black/[0.06] dark:border-white/[0.06]">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider shrink-0 mr-1 font-semibold">
                        Batch Sets ({totalBatch}):
                      </span>
                      {result.images.map((imgItem: any, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedImageIndex(idx)}
                          className={cn(
                            "relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer aspect-video h-12 sm:h-14 shrink-0",
                            selectedImageIndex === idx
                              ? "border-emerald-500 ring-2 ring-emerald-500/40 shadow-sm"
                              : "border-zinc-200 dark:border-zinc-800 opacity-60 hover:opacity-100"
                          )}
                        >
                          <img
                            src={getMediaUrl(imgItem.url)}
                            alt={`Variation ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-bold px-1 bg-black/80 text-white rounded">
                            #{idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="relative rounded-2xl overflow-hidden border border-black/[0.1] dark:border-white/[0.1] bg-black shadow-2xl group">
                    <img
                      src={getMediaUrl(activeImg.url)}
                      alt="Synthesized Canvas"
                      className="w-full aspect-video object-contain"
                    />
                    <span className="absolute top-3 left-3 text-[9px] font-mono px-2.5 py-1 rounded-md bg-black/80 text-zinc-200 border border-white/10 backdrop-blur-sm">
                      [ {activeImg.model?.toUpperCase() || model.toUpperCase()} • {resolution.toUpperCase()} • {aspectRatio} ]
                    </span>
                    {totalBatch > 1 && (
                      <span className="absolute top-3 right-3 text-[9px] font-mono px-2.5 py-1 rounded-md bg-emerald-600/90 text-white font-bold backdrop-blur-sm">
                        VARIATION {selectedImageIndex + 1} OF {totalBatch}
                      </span>
                    )}
                  </div>

                  {/* Parameters HUD */}
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#07070a] border border-black/[0.06] dark:border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px]">
                    <div>
                      <span className="text-zinc-500 block">OPTICS:</span>
                      <span className="text-zinc-900 dark:text-zinc-200 font-bold truncate block">{lens}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">APERTURE:</span>
                      <span className="text-zinc-900 dark:text-zinc-200 font-bold block">{aperture}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">ATMOSPHERE:</span>
                      <span className="text-zinc-900 dark:text-zinc-200 font-bold truncate block">{lighting}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">RESOLUTION:</span>
                      <span className="text-zinc-900 dark:text-zinc-200 font-bold truncate block">{resolution.toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="font-mono text-xs text-zinc-500 space-y-0.5">
                      <p className="text-zinc-950 dark:text-white font-medium">{activeImg.model || model}</p>
                      <p className="text-[10px] truncate max-w-xs sm:max-w-sm">{activeImg.filename}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyPath(activeImg.local_path || activeImg.url)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-[#09090d] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        <span>{copied ? "COPIED" : "COPY PATH"}</span>
                      </button>

                      <a
                        href={getMediaUrl(activeImg.url)}
                        download
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-[#09090d] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
                      >
                        <Download className="h-3 w-3" />
                        <span>DOWNLOAD</span>
                      </a>

                      <button
                        onClick={() => {
                          router.push(`/video?image=${encodeURIComponent(activeImg.url)}`);
                        }}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-black text-xs font-heading font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <span>ANIMATE IN VIDEO</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Enhanced Prompt Inspector */}
                  {result.enhanced_prompt && (
                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#060609] border border-black/[0.06] dark:border-white/[0.06] space-y-1">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 block font-medium">
                        HOLLYWOOD ENHANCED PROMPT:
                      </span>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 font-jakarta leading-relaxed">{result.enhanced_prompt}</p>
                    </div>
                  )}
                </div>
                );
              })()}

              {result && !result.success && (
                <div className="my-auto text-center space-y-5 py-16 px-4">
                  <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 dark:text-red-400 shadow-sm animate-pulse">
                    <AlertCircle className="h-8 w-8" />
                  </div>
                  
                  <div className="space-y-2 max-w-md mx-auto">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-mono font-bold tracking-wider uppercase">
                      <span>{result.error_type || "GENERATION ERROR"}</span>
                    </div>

                    <h3 className="text-lg font-heading font-extrabold text-zinc-950 dark:text-white">
                      {result.error_type === "KEY_MISSING" ? "API Key Required" : "Generation Failed"}
                    </h3>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 font-jakarta leading-relaxed">
                      {result.error || "The image generation request could not be completed. Please configure your API key in Settings."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => router.push("/settings")}
                      className="px-5 py-2.5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-black font-heading font-bold text-xs flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-md cursor-pointer"
                    >
                      <Key className="h-3.5 w-3.5" />
                      <span>OPEN SETTINGS TO ADD KEY</span>
                    </button>
                    
                    <button
                      onClick={() => setResult(null)}
                      className="px-4 py-2.5 rounded-xl border border-black/[0.1] dark:border-white/[0.1] text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <span>DISMISS</span>
                    </button>
                  </div>
                </div>
              )}

              {!loading && !result && (
                <div className="my-auto text-center space-y-4 py-24">
                  <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center mx-auto text-zinc-500 dark:text-zinc-600">
                    <ImageIcon className="h-7 w-7" />
                  </div>
                  <div className="space-y-1.5 max-w-sm mx-auto">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-200 font-heading tracking-tight">
                      DIFFUSION CANVAS IDLE
                    </p>
                    <p className="text-xs text-zinc-500 font-jakarta leading-relaxed">
                      Configure your prompt, model engine, resolution, and camera optics on the right, then click Synthesize.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── VIEW 2: BULK VARIATIONS GALLERY VIEWPORT ─── */}
          {activeMode === "image_variations" && (
            <div className="hf-card p-6 flex flex-col justify-between min-h-[620px] technical-corner relative">
              {loadingVariations && (
                <div className="my-auto space-y-6 py-6">
                  <LiveProgressBar
                    progress={progress}
                    stageTitle={stageTitle}
                    statusMessage={statusMessage}
                    elapsedSeconds={elapsedSeconds}
                    logs={telemetryLogs}
                    isActive={loadingVariations}
                    showTerminal={true}
                  />
                </div>
              )}

              {variationsResult && variationsResult.success && (
                <div className="space-y-5">
                  {/* Gallery Top Bar */}
                  <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-bold text-zinc-950 dark:text-white">
                        {variationsResult.total} VARIATIONS GENERATED
                      </span>
                      <span className="text-zinc-400">•</span>
                      <span className="text-zinc-500">Strength: {variationsResult.variation_strength}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (variationsResult.variations?.[0]) {
                            router.push(`/video?image=${encodeURIComponent(variationsResult.variations[0].url)}`);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-black text-xs font-mono font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all cursor-pointer"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>ANIMATE #1</span>
                      </button>
                    </div>
                  </div>

                  {/* Variations Grid */}
                  <div className={cn(
                    "grid gap-4",
                    batchSize === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2"
                  )}>
                    {variationsResult.variations.map((v: any) => (
                      <div
                        key={v.id}
                        className="group relative rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] bg-black shadow-md hover:border-black/30 dark:hover:border-white/30 transition-all"
                      >
                        <img
                          src={getMediaUrl(v.url)}
                          alt={`Variation ${v.id}`}
                          className="w-full aspect-video object-cover"
                        />

                        {/* Top Badge */}
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-black/80 text-white border border-white/10 backdrop-blur-xs font-semibold">
                            #{v.id}
                          </span>
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-white/90 dark:bg-black/90 text-zinc-900 dark:text-zinc-200 border border-black/10 dark:border-white/10">
                            {v.style?.toUpperCase() || "VARIATION"}
                          </span>
                        </div>

                        {/* Hover Overlay with Action Buttons */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                          <p className="text-[10px] text-zinc-200 font-mono line-clamp-2">
                            {v.angle}
                          </p>

                          <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-white/20">
                            <button
                              onClick={() => copyPath(v.local_path || v.url, v.id)}
                              className="px-2 py-1 rounded bg-white/20 hover:bg-white/40 text-white text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              {copiedVarId === v.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedVarId === v.id ? "COPIED" : "PATH"}</span>
                            </button>

                            <a
                              href={getMediaUrl(v.url)}
                              download
                              className="px-2 py-1 rounded bg-white/20 hover:bg-white/40 text-white text-[10px] font-mono flex items-center gap-1 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              <span>SAVE</span>
                            </a>

                            <button
                              onClick={() => {
                                router.push(`/video?image=${encodeURIComponent(v.url)}`);
                              }}
                              className="px-2.5 py-1 rounded bg-white text-black font-heading font-bold text-[10px] flex items-center gap-1 hover:bg-zinc-200 transition-colors cursor-pointer"
                            >
                              <span>ANIMATE</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {variationsResult && !variationsResult.success && (
                <div className="my-auto text-center space-y-5 py-16 px-4">
                  <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 dark:text-red-400 shadow-sm animate-pulse">
                    <AlertCircle className="h-8 w-8" />
                  </div>
                  
                  <div className="space-y-2 max-w-md mx-auto">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-mono font-bold tracking-wider uppercase">
                      <span>{variationsResult.error_type || "VARIATION ERROR"}</span>
                    </div>

                    <h3 className="text-lg font-heading font-extrabold text-zinc-950 dark:text-white">
                      {variationsResult.error_type === "KEY_MISSING" ? "API Key Required" : "Variation Synthesis Failed"}
                    </h3>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 font-jakarta leading-relaxed">
                      {variationsResult.error || "Failed to generate variations. Please check your reference image or API credentials in Settings."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => router.push("/settings")}
                      className="px-5 py-2.5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-black font-heading font-bold text-xs flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-md cursor-pointer"
                    >
                      <Key className="h-3.5 w-3.5" />
                      <span>OPEN SETTINGS</span>
                    </button>
                    
                    <button
                      onClick={() => setVariationsResult(null)}
                      className="px-4 py-2.5 rounded-xl border border-black/[0.1] dark:border-white/[0.1] text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <span>DISMISS</span>
                    </button>
                  </div>
                </div>
              )}

              {!loadingVariations && !variationsResult && (
                <div className="my-auto text-center space-y-4 py-24">
                  <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center mx-auto text-zinc-500 dark:text-zinc-600">
                    <Grid className="h-7 w-7" />
                  </div>
                  <div className="space-y-1.5 max-w-sm mx-auto">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-200 font-heading tracking-tight">
                      BULK VARIATIONS GALLERY IDLE
                    </p>
                    <p className="text-xs text-zinc-500 font-jakarta leading-relaxed">
                      Upload a source photo on the right, choose your batch quantity (2, 4, or 8), and click Generate Variations to see multi-angle results.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: All Controls & Settings Deck (order-2 on desktop) */}
        <div className="lg:col-span-5 lg:order-2 space-y-5">
          {/* Global Alert Banner if Error */}
          {result && !result.success && (
            <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300 flex items-start justify-between gap-3 font-mono text-xs shadow-sm animate-page-enter">
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold uppercase tracking-wider block text-[11px] text-red-600 dark:text-red-400">
                    {result.error_type || "GENERATION ERROR"}
                  </span>
                  <p className="text-xs font-jakarta text-zinc-800 dark:text-zinc-200 leading-snug">
                    {result.error}
                  </p>
                  <button
                    onClick={() => router.push("/settings")}
                    className="text-[11px] text-zinc-950 dark:text-white font-bold underline hover:opacity-80 pt-1 block cursor-pointer"
                  >
                    Go to Settings page to add API Key →
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="p-1 rounded-md text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* ─── MODE 1: TEXT TO IMAGE CONTROLS ─── */}
          {activeMode === "text_to_image" && (
            <div className="space-y-5">
              {/* Prompt Section */}
              <div className="hf-card p-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2 font-mono">
                    <label className="text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400 font-medium">
                      PROMPT DIRECTIVE
                    </label>
                    <button
                      type="button"
                      onClick={enhancePromptText}
                      className="text-[10px] text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-1 font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Wand2 className="h-3 w-3" />
                      <span>ENHANCE PROMPT</span>
                    </button>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your subject, environment, lighting, and camera composition in vivid cinematic detail..."
                    rows={4}
                    className="w-full bg-zinc-50 dark:bg-[#07070a] border border-black/[0.08] dark:border-white/[0.08] rounded-xl p-3 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-black/30 dark:focus:border-white/30 resize-none font-jakarta leading-relaxed"
                  />
                </div>

                {/* Negative Prompt */}
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 dark:text-zinc-400 block mb-1.5 font-medium">
                    NEGATIVE PROMPT
                  </label>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="blurry, distorted, oversaturated, low quality, artifacts"
                    className="w-full bg-zinc-50 dark:bg-[#07070a] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-black/30 dark:focus:border-white/30 font-jakarta"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── MODE 2: BULK VARIATIONS CONTROLS ─── */}
          {activeMode === "image_variations" && (
            <div className="hf-card p-6 space-y-5">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 dark:text-zinc-400 block mb-2 font-medium">
                  SOURCE REFERENCE IMAGE
                </label>

                {/* Drag-drop upload area or preview */}
                {refImageUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-black/[0.1] dark:border-white/[0.1] bg-black group">
                    <img
                      src={getMediaUrl(refImageUrl)}
                      alt="Source Reference"
                      className="w-full aspect-video object-contain"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => setRefImageUrl("")}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-mono text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>REMOVE</span>
                      </button>
                      <button
                        onClick={openVaultPicker}
                        className="px-3 py-1.5 rounded-lg bg-white text-black font-mono text-xs flex items-center gap-1 cursor-pointer font-bold whitespace-nowrap shrink-0"
                      >
                        <FolderArchive className="h-3.5 w-3.5" />
                        <span>CHANGE</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-black/[0.12] dark:border-white/[0.12] hover:border-black/30 dark:hover:border-white/30 rounded-xl p-6 text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-[#07070a]/50">
                      {uploadingRef ? (
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mb-2" />
                      ) : (
                        <Upload className="h-8 w-8 text-zinc-400 mb-2" />
                      )}
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200">
                        Upload Reference Image
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 mt-1">
                        PNG, JPG, WEBP up to 25MB
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleRefFileUpload(e.target.files[0]);
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={openVaultPicker}
                      className="w-full py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0a0a0f] text-zinc-700 dark:text-zinc-300 font-mono text-xs flex items-center justify-center gap-2 hover:text-black dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <FolderArchive className="h-3.5 w-3.5" />
                      <span>PICK FROM ASSET VAULT</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Variation Directive Prompt */}
              <div>
                <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 dark:text-zinc-400 block mb-1.5 font-medium">
                  VARIATION MODIFIER PROMPT (OPTIONAL)
                </label>
                <textarea
                  value={varPrompt}
                  onChange={(e) => setVarPrompt(e.target.value)}
                  placeholder="e.g., Switch outfit to emerald royal sherwani, evening twilight lighting, wide lens perspective..."
                  rows={2}
                  className="w-full bg-zinc-50 dark:bg-[#07070a] border border-black/[0.08] dark:border-white/[0.08] rounded-xl p-3 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-black/30 dark:focus:border-white/30 resize-none font-jakarta"
                />
              </div>

              {/* Batch Quantity Selector (2, 4, 8) */}
              <div>
                <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 dark:text-zinc-400 block mb-2 font-medium">
                  BATCH QUANTITY
                </label>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  {[2, 4, 8].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setBatchSize(qty)}
                      className={cn(
                        "p-2.5 rounded-xl border text-center transition-all cursor-pointer whitespace-nowrap shrink-0",
                        batchSize === qty
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent font-bold shadow-xs"
                          : "bg-zinc-50 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                      )}
                    >
                      <span className="text-xs font-bold block">{qty} Variations</span>
                      <span className="text-[8px] opacity-70 block">
                        {qty === 2 ? "Dual Look" : qty === 4 ? "Full Matrix" : "Max Diversity"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Variation Strength Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5 font-mono text-[10px]">
                  <span className="text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
                    VARIATION STRENGTH (DIVERGENCE)
                  </span>
                  <span className="font-bold text-zinc-950 dark:text-white font-mono">
                    {variationStrength.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={variationStrength}
                  onChange={(e) => setVariationStrength(parseFloat(e.target.value))}
                  className="w-full accent-zinc-950 dark:accent-white cursor-pointer"
                />
                <div className="flex justify-between text-[8px] font-mono text-zinc-500 uppercase mt-0.5">
                  <span>0.10 (Faithful/Subtle)</span>
                  <span>0.50 (Balanced)</span>
                  <span>0.90 (Radical Change)</span>
                </div>
              </div>

              {/* Action Button for Variations */}
              <button
                onClick={requestVariationsConfirm}
                disabled={loadingVariations || !refImageUrl}
                className="w-full py-3.5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-black font-heading font-bold text-xs tracking-tight flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-30 transition-all shadow-xl active:scale-98 cursor-pointer"
              >
                {loadingVariations ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-current" />
                    <span>SYNTHESIZING {batchSize} VARIATIONS...</span>
                  </>
                ) : (
                  <>
                    <Grid className="h-3.5 w-3.5" />
                    <span>GENERATE {batchSize} VARIATIONS IN BULK</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Core Engine & Quality Deck (Always visible in Settings) */}
          <div className="hf-card p-6 space-y-5">
            {/* Model Dropdown: All 9 Diffusion Engines */}
            <Dropdown
              label="DIFFUSION MODEL ENGINE"
              options={DIFFUSION_MODELS}
              value={model}
              onChange={setModel}
            />

            {/* Resolution Selector (NEW) */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 dark:text-zinc-400 block mb-2 font-medium">
                OUTPUT RESOLUTION
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 font-mono">
                {RESOLUTIONS.map((res) => (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => setResolution(res.id)}
                    className={cn(
                      "p-2 rounded-xl border text-center transition-all cursor-pointer whitespace-nowrap shrink-0",
                      resolution === res.id
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent font-bold shadow-xs"
                        : "bg-zinc-50 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                    )}
                  >
                    <span className="text-[11px] font-bold block">{res.label}</span>
                    <span className="text-[8px] opacity-70 block">{res.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Batch Count Selector (NEW) */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 dark:text-zinc-400 block mb-2 font-medium">
                GENERATION BATCH COUNT
              </label>
              <div className="grid grid-cols-3 gap-2 font-mono">
                {[
                  { count: 1, label: "1 Image", sub: "Single Master" },
                  { count: 2, label: "2 Variations", sub: "Dual Set" },
                  { count: 4, label: "4 Batch", sub: "Quad Set" },
                ].map((item) => (
                  <button
                    key={item.count}
                    type="button"
                    onClick={() => setImageCount(item.count)}
                    className={cn(
                      "p-2.5 rounded-xl border text-center transition-all cursor-pointer whitespace-nowrap shrink-0",
                      imageCount === item.count
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent font-bold shadow-xs"
                        : "bg-zinc-50 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                    )}
                  >
                    <span className="text-[11px] font-bold block">{item.label}</span>
                    <span className="text-[8px] opacity-70 block">{item.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Preset */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 dark:text-zinc-400 block mb-2 font-medium">
                QUALITY PROFILE
              </label>
              <div className="grid grid-cols-3 gap-2">
                {QUALITIES.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setQuality(q.id)}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition-all cursor-pointer font-mono whitespace-nowrap shrink-0",
                      quality === q.id
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent shadow-sm"
                        : "bg-zinc-50 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                    )}
                  >
                    <span className="text-xs font-bold block">{q.label}</span>
                    <span className="text-[9px] opacity-70 block">{q.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio Matrix */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 dark:text-zinc-400 block mb-2 font-medium">
                ASPECT RATIO MATRIX //
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {RATIOS.map((r) => {
                  const isSelected = aspectRatio === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setAspectRatio(r.id)}
                      className={cn(
                        "flex flex-col items-center p-2 rounded-xl border text-center transition-all cursor-pointer",
                        isSelected
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent shadow-md scale-[1.02]"
                          : "bg-zinc-50 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                      )}
                    >
                      <div
                        className={cn(
                          "border rounded-xs mb-1",
                          r.iconClass,
                          isSelected
                            ? "border-current bg-current opacity-20"
                            : "border-zinc-400 dark:border-zinc-500 bg-zinc-300 dark:bg-zinc-800"
                        )}
                      />
                      <span className="text-[11px] font-bold font-heading">{r.label}</span>
                      <span className={cn("text-[8px] font-mono", isSelected ? "opacity-80" : "text-zinc-500")}>
                        {r.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lens Optics */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 dark:text-zinc-400 block mb-2 font-medium">
                CAMERA LENS (OPTICS)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
                {LENSES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLens(l.id)}
                    className={cn(
                      "p-2 rounded-xl border text-left transition-all cursor-pointer whitespace-nowrap shrink-0",
                      lens === l.id
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent font-semibold shadow-xs"
                        : "bg-zinc-50 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                    )}
                  >
                    <span className="text-[11px] block truncate">{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Aperture / Depth of Field */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 dark:text-zinc-400 block mb-2 font-medium">
                APERTURE (DEPTH OF FIELD)
              </label>
              <div className="grid grid-cols-4 gap-1.5 font-mono">
                {APERTURES.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAperture(a.id)}
                    className={cn(
                      "p-2 rounded-lg border text-center transition-all cursor-pointer whitespace-nowrap shrink-0",
                      aperture === a.id
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent font-bold"
                        : "bg-zinc-50 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                    )}
                  >
                    <span className="text-xs block">{a.label}</span>
                    <span className="text-[8px] opacity-70 block">{a.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Lighting Atmosphere */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 dark:text-zinc-400 block mb-2 font-medium">
                LIGHTING ATMOSPHERE
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
                {LIGHTING_PRESETS.map((lp) => (
                  <button
                    key={lp.id}
                    type="button"
                    onClick={() => setLighting(lp.id)}
                    className={cn(
                      "p-2 rounded-xl border text-left transition-all cursor-pointer whitespace-nowrap shrink-0",
                      lighting === lp.id
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent font-semibold shadow-xs"
                        : "bg-zinc-50 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                    )}
                  >
                    <span className="text-[11px] block truncate">{lp.label}</span>
                    <span className="text-[8px] opacity-70 block truncate">{lp.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Film Stock & Color Grading */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 dark:text-zinc-400 block mb-2 font-medium">
                FILM STOCK & COLOR EMULATION
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
                {FILM_STOCKS.map((fs) => (
                  <button
                    key={fs.id}
                    type="button"
                    onClick={() => setFilmStock(fs.id)}
                    className={cn(
                      "p-2 rounded-xl border text-left transition-all cursor-pointer whitespace-nowrap shrink-0",
                      filmStock === fs.id
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent font-semibold shadow-xs"
                        : "bg-zinc-50 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                    )}
                  >
                    <span className="text-[11px] block truncate">{fs.label}</span>
                    <span className="text-[8px] opacity-70 block truncate">{fs.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fine Tuning: CFG Scale + Steps + Seed */}
            <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] space-y-4">
              {/* CFG Scale */}
              <div>
                <div className="flex items-center justify-between mb-1.5 font-mono text-[10px]">
                  <span className="text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
                    CFG PROMPT GUIDANCE
                  </span>
                  <span className="font-bold text-zinc-950 dark:text-white">{cfgScale.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={3.0}
                  max={15.0}
                  step={0.5}
                  value={cfgScale}
                  onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                  className="w-full accent-zinc-950 dark:accent-white cursor-pointer"
                />
                <div className="flex justify-between text-[8px] font-mono text-zinc-500 uppercase mt-0.5">
                  <span>3.0 (Creative)</span>
                  <span>7.5 (Standard)</span>
                  <span>15.0 (Strict)</span>
                </div>
              </div>

              {/* Sampling Steps & Seed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 dark:text-zinc-400 block mb-1.5 font-medium">
                    SAMPLING STEPS
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {STEP_PRESETS.map((sp) => (
                      <button
                        key={sp.value}
                        type="button"
                        onClick={() => setSamplingSteps(sp.value)}
                        className={cn(
                          "py-1.5 px-1 rounded-lg border text-center font-mono text-[10px] transition-all cursor-pointer whitespace-nowrap shrink-0",
                          samplingSteps === sp.value
                            ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent font-bold"
                            : "bg-zinc-50 dark:bg-[#07070a] border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                        )}
                      >
                        {sp.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 font-mono text-[10px]">
                    <span className="text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
                      SEED
                    </span>
                    <button
                      type="button"
                      onClick={randomizeSeed}
                      className="text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Dices className="h-3 w-3" />
                      <span>RANDOM</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="Random (Leave empty)"
                    className="w-full bg-zinc-50 dark:bg-[#07070a] border border-black/[0.08] dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white font-mono placeholder-zinc-400 focus:outline-none focus:border-black/30 dark:focus:border-white/30"
                  />
                </div>
              </div>
            </div>

            {/* Synthesize Button for Text-to-Image */}
            {activeMode === "text_to_image" && (
              <button
                onClick={requestGenerateConfirm}
                disabled={loading || !prompt.trim()}
                className="w-full py-4 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-black font-heading font-bold text-xs tracking-tight flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-30 transition-all shadow-xl active:scale-98 mt-3 cursor-pointer whitespace-nowrap shrink-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-current" />
                    <span>DIFFUSING MASTER VISUAL CANVAS...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 fill-current" />
                    <span>SYNTHESIZE CINEMATIC VISUAL</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Vault Picker Modal */}
      {vaultOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c0c12] border border-black/[0.1] dark:border-white/[0.1] rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <FolderArchive className="h-4 w-4 text-zinc-950 dark:text-white" />
                <span className="font-heading font-bold text-sm text-zinc-950 dark:text-white">
                  Pick Reference Image from Asset Vault
                </span>
              </div>
              <button
                onClick={() => setVaultOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingVault ? (
              <div className="py-12 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500 mx-auto" />
                <span className="text-xs font-mono text-zinc-500 mt-2 block">Loading Vault Assets...</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 overflow-y-auto max-h-[55vh] p-1">
                {vaultImages.length === 0 ? (
                  <div className="col-span-3 text-center py-10 text-xs font-mono text-zinc-500">
                    No images found in Asset Vault. Generate some first!
                  </div>
                ) : (
                  vaultImages.map((img: any, i: number) => (
                    <div
                      key={i}
                      onClick={() => {
                        setRefImageUrl(img.url);
                        setVaultOpen(false);
                      }}
                      className="group relative rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] bg-black aspect-video cursor-pointer hover:border-black/50 dark:hover:border-white/50 transition-all"
                    >
                      <img
                        src={getMediaUrl(img.url)}
                        alt={img.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-2 py-1 rounded bg-white text-black font-mono text-[10px] font-bold">
                          SELECT
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generation Confirmation & Spend Authorization Modal */}
      <GenerationConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => {
          setConfirmModalOpen(false);
          if (confirmAction === "variations") {
            generateBulkVariations();
          } else {
            generate();
          }
        }}
        details={confirmDetails}
        loading={loading || loadingVariations}
      />
    </div>
  );
}
