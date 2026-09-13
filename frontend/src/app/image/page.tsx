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
  ChevronDown,
  Type,
  Palette,
  Crop,
  SlidersHorizontal,
  Trash2,
  ImagePlus,
  Bookmark,
  ShieldCheck,
  Info,
  Gem,
  AtSign,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import GenerationConfirmModal, { GenerationConfirmDetails } from "@/components/ui/GenerationConfirmModal";
import LiveProgressBar, { LogEntry } from "@/components/ui/LiveProgressBar";
import HowItWorksModal from "@/components/ui/HowItWorksModal";
import BrandKitModal from "@/components/brand/BrandKitModal";
import BeforeAfterSlider from "@/components/ui/BeforeAfterSlider";
import SocialRepurposerModal from "@/components/social/SocialRepurposerModal";
import JewelleryPromptSuite from "@/components/studio/JewelleryPromptSuite";
import MentionReferencePopover, { MentionCandidate } from "@/components/studio/MentionReferencePopover";

interface ModelOption {
  value: string;
  label: string;
  description: string;
  badge?: string;
  category?: string;
  iconType?: "openai" | "google" | "flux" | "midjourney" | "bytedance" | "custom";
  active?: boolean;
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

  // Studio Mode: 'text_to_image' | 'image_variations' | 'image_editor'
  const [studioMode, setStudioMode] = useState<"text_to_image" | "image_variations" | "image_editor">("text_to_image");

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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Image-to-Image / Variations State
  const [refImageFile, setRefImageFile] = useState<File | null>(null);
  const [refImageUrl, setRefImageUrl] = useState("");
  const [uploadingRef, setUploadingRef] = useState(false);
  const [variationStrength, setVariationStrength] = useState(0.65);
  const [batchSize, setBatchSize] = useState(4);
  const [styleExploration, setStyleExploration] = useState(true);
  const [variationsResult, setVariationsResult] = useState<any>(null);
  const [loadingVariations, setLoadingVariations] = useState(false);

  // Multi-Reference & Character Consistency State (Matching user screenshot media_1789093591015.png)
  const [refImages, setRefImages] = useState<Array<{ url: string; name: string }>>([]);
  const [uploadingMultiRef, setUploadingMultiRef] = useState(false);
  const [lockFace, setLockFace] = useState(true);
  const [lockDress, setLockDress] = useState(true);
  const [lockJewelry, setLockJewelry] = useState(true);
  const [lockBackground, setLockBackground] = useState(false);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [applyBrandKit, setApplyBrandKit] = useState(false); // Default OFF
  const [referenceDrawerOpen, setReferenceDrawerOpen] = useState(false);
  const [showAdvancedInfo, setShowAdvancedInfo] = useState(false);
  const [showJewellerySuite, setShowJewellerySuite] = useState(false);
  const multiRefFileInputRef = useRef<HTMLInputElement>(null);

  const handleMultiRefUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;
    setUploadingMultiRef(true);
    setMultiRefUploadProgress(0);
    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        if (file.size > 25 * 1024 * 1024) {
          alert(`File ${file.name} exceeds 25MB limit.`);
          continue;
        }
        const res = await api.uploadWithProgress<any>("/api/image/upload-reference", file, "file", (pct) => {
          const overall = Math.round(((i * 100) + pct) / fileArray.length);
          setMultiRefUploadProgress(overall);
        });
        if (res?.url) {
          setRefImages((prev) => [...prev, { url: res.url, name: file.name }]);
          setRefImageUrl((prev) => prev || res.url);
        }
      }
    } catch (err: any) {
      alert(err?.message || "Failed to upload reference image");
    } finally {
      setUploadingMultiRef(false);
      setMultiRefUploadProgress(0);
    }
  };

  const removeRefImage = (index: number) => {
    setRefImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setRefImageUrl(next.length > 0 ? next[0].url : "");
      return next;
    });
  };

  const clearAllRefImages = () => {
    setRefImages([]);
    setRefImageUrl("");
  };

  // @ Mention Autocomplete States for Vault Assets & Direct Upload
  const [mentionMenuOpen, setMentionMenuOpen] = useState<boolean>(false);
  const [mentionQuery, setMentionQuery] = useState<string>("");
  const [mentionAnchor, setMentionAnchor] = useState<{ start: number; end: number } | null>(null);

  const insertMentionTag = (tagWithAt: string) => {
    const cleanTag = tagWithAt.startsWith("@") ? tagWithAt : `@${tagWithAt}`;
    if (mentionAnchor && promptTextareaRef.current) {
      const before = prompt.substring(0, mentionAnchor.start);
      const after = prompt.substring(mentionAnchor.end);
      const updated = `${before}${cleanTag} ${after}`;
      setPrompt(updated);
      setMentionMenuOpen(false);
      setMentionAnchor(null);
      setTimeout(() => {
        if (promptTextareaRef.current) {
          promptTextareaRef.current.focus();
          const nextPos = before.length + cleanTag.length + 1;
          promptTextareaRef.current.setSelectionRange(nextPos, nextPos);
        }
      }, 10);
    } else {
      setPrompt((prev) => (prev.trim() ? `${prev.trim()} ${cleanTag} ` : `${cleanTag} `));
      setMentionMenuOpen(false);
      setMentionAnchor(null);
      if (promptTextareaRef.current) {
        promptTextareaRef.current.focus();
      }
    }
  };

  const handleSelectMention = (item: MentionCandidate) => {
    const alreadyInRefs = refImages.some((r) => r.url === item.url);
    if (!alreadyInRefs) {
      setRefImages((prev) => [...prev, { url: item.url, name: item.filename }]);
      if (!refImageUrl) setRefImageUrl(item.url);
    }
    insertMentionTag(item.tag);
  };

  // Image Precision Editor State
  const [editorImageFile, setEditorImageFile] = useState<File | null>(null);
  const [editorImageUrl, setEditorImageUrl] = useState<string>("");
  const [editorBrightness, setEditorBrightness] = useState<number>(0); // -50 to 50
  const [editorContrast, setEditorContrast] = useState<number>(0); // -50 to 50
  const [editorSaturation, setEditorSaturation] = useState<number>(0); // -50 to 50
  const [editorSharpness, setEditorSharpness] = useState<number>(0); // 0 to 100
  const [editorFilter, setEditorFilter] = useState<string>("none"); // none, cinematic, noir, cyberpunk, vintage, editorial, golden_hour, vibrant, pastel
  const [editorCropRatio, setEditorCropRatio] = useState<string>("original"); // original, 16:9, 9:16, 1:1, 4:3, 3:4, 21:9
  const [editorUpscale, setEditorUpscale] = useState<boolean>(false);
  const [uploadingEditorImage, setUploadingEditorImage] = useState<boolean>(false);
  const [editorUploadProgress, setEditorUploadProgress] = useState<number>(0);
  const [refUploadProgress, setRefUploadProgress] = useState<number>(0);
  const [multiRefUploadProgress, setMultiRefUploadProgress] = useState<number>(0);
  const [isEditorDragOver, setIsEditorDragOver] = useState<boolean>(false);
  const [processingImageEdit, setProcessingImageEdit] = useState<boolean>(false);
  const editorFileInputRef = useRef<HTMLInputElement>(null);
  const quickUploadInputRef = useRef<HTMLInputElement>(null);

  // New HSL, Color Temp, Curves, Text, Resize & Compression States
  const [editorHue, setEditorHue] = useState<number>(0); // -180 to 180
  const [editorLightness, setEditorLightness] = useState<number>(0); // -50 to 50
  const [editorTemperature, setEditorTemperature] = useState<number>(0); // -100 to 100 (warm/cool)
  const [editorTint, setEditorTint] = useState<number>(0); // -100 to 100 (green/magenta)
  const [editorCurvePreset, setEditorCurvePreset] = useState<string>("linear"); // linear, s_curve, matte, high_contrast, moody
  const [editorTextOverlay, setEditorTextOverlay] = useState<string>("");
  const [editorTextPosition, setEditorTextPosition] = useState<string>("bottom"); // top, center, bottom
  const [editorTextColor, setEditorTextColor] = useState<string>("#ffffff");
  const [editorTextSize, setEditorTextSize] = useState<number>(36);
  const [editorResizeEnabled, setEditorResizeEnabled] = useState<boolean>(false);
  const [editorWidth, setEditorWidth] = useState<number>(1920);
  const [editorHeight, setEditorHeight] = useState<number>(1080);
  const [editorLockAspectRatio, setEditorLockAspectRatio] = useState<boolean>(true);
  const [editorCompressionQuality, setEditorCompressionQuality] = useState<number>(92);
  const [editorOutputFormat, setEditorOutputFormat] = useState<string>("png"); // png, jpeg, webp
  const [editorActiveTab, setEditorActiveTab] = useState<"ai_tools" | "filters" | "hsl" | "curves" | "text" | "resize" | "export">("ai_tools");
  const [promptDockCollapsed, setPromptDockCollapsed] = useState<boolean>(false);
  const [downloadingMaster, setDownloadingMaster] = useState(false);
  const [lastExportedResult, setLastExportedResult] = useState<any>(null);

  // Brand Kit, Social Repurposer, Before/After & AI Tools State
  const [brandKitModalOpen, setBrandKitModalOpen] = useState(false);
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [socialMediaUrl, setSocialMediaUrl] = useState<string>("");
  const [originalEditorImageUrl, setOriginalEditorImageUrl] = useState<string>("");
  const [showBeforeAfter, setShowBeforeAfter] = useState<boolean>(false);
  const [processingBgRemoval, setProcessingBgRemoval] = useState<boolean>(false);
  const [processingRelight, setProcessingRelight] = useState<boolean>(false);
  const [processingFaceRestore, setProcessingFaceRestore] = useState<boolean>(false);
  const [processingOutpaint, setProcessingOutpaint] = useState<boolean>(false);
  const [relightPreset, setRelightPreset] = useState<string>("golden_hour");
  const [outpaintAspect, setOutpaintAspect] = useState<string>("16:9");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("omnistudio_sidebar_collapsed") === "true";
      } catch {}
    }
    return false;
  });

  useEffect(() => {
    const handleCollapse = () => setIsSidebarCollapsed(true);
    const handleExpand = () => setIsSidebarCollapsed(false);
    const handleToggle = () => setIsSidebarCollapsed((prev) => !prev);
    window.addEventListener("omnistudio:collapse-sidebar", handleCollapse);
    window.addEventListener("omnistudio:expand-sidebar", handleExpand);
    window.addEventListener("omnistudio:toggle-sidebar", handleToggle);
    return () => {
      window.removeEventListener("omnistudio:collapse-sidebar", handleCollapse);
      window.removeEventListener("omnistudio:expand-sidebar", handleExpand);
      window.removeEventListener("omnistudio:toggle-sidebar", handleToggle);
    };
  }, []);

  // Vault Picker Modal State
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultImages, setVaultImages] = useState<any[]>([]);
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

  // Dynamic Models State
  const [availableModels, setAvailableModels] = useState<ModelOption[]>(DIFFUSION_MODELS);

  useEffect(() => {
    // Fetch active model status from backend based on available API keys
    api.getImageModels()
      .then((data: any) => {
        if (data && data.models && Array.isArray(data.models)) {
          const activeMap = new Map<string, boolean>(
            data.models.map((m: { id: string; active?: boolean }) => [m.id, Boolean(m.active)])
          );
          setAvailableModels((prev: ModelOption[]) =>
            prev.map((m: ModelOption) => ({
              ...m,
              active: activeMap.has(m.value) ? Boolean(activeMap.get(m.value)) : false,
            }))
          );
        }
      })
      .catch((e: unknown) => console.error("Failed to fetch model status", e));
  }, []);

  // Load Studio Preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("omnistudio_preferences");
      if (saved) {
        const p = JSON.parse(saved);
        if (p.defaultImageModel) setModel(p.defaultImageModel);
        if (p.defaultResolution) setResolution(p.defaultResolution);
        if (p.defaultAspectRatio) setAspectRatio(p.defaultAspectRatio);
      }
    } catch {}
  }, []);

  // Close popovers on click outside
  const dockRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Unmount cleanup for progress intervals
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Pre-fill prompt and input_image from URL query params (e.g. when 'Edit in Image Studio' or 'Reuse Prompt' is clicked)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlPrompt = params.get("prompt");
      if (urlPrompt && urlPrompt.trim()) {
        setPrompt(urlPrompt.trim());
      }
      const urlImage = params.get("input_image") || params.get("image");
      if (urlImage && urlImage.trim()) {
        const cleanUrl = urlImage.trim();
        setRefImageUrl(cleanUrl);
        setResult({ success: true, url: cleanUrl, local_path: cleanUrl });
      }
    }
  }, []);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-popover-content="true"]') && !target.closest('[data-popover-trigger="true"]')) {
        closeAllPopovers();
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

    let shouldSkipModal = false;
    try {
      const savedPrefs = localStorage.getItem("omnistudio_preferences");
      if (savedPrefs && JSON.parse(savedPrefs).skipConfirmModal) shouldSkipModal = true;
    } catch {}

    if (shouldSkipModal) {
      if (studioMode === "text_to_image") generate();
      else generateBulkVariations();
      return;
    }

    setConfirmModalOpen(true);
  };

  // AI Prompt Enhancer Copilot
  const [enhancingPrompt, setEnhancingPrompt] = useState(false);
  // 1-Click Instant Style Preset Modifiers (Zero AI latency, never triggers Improve Enhancing)
  const handleApplyPromptModifier = (stylePreset: string) => {
    const styleModifiers: Record<string, string> = {
      more_realistic: "8K photography, Hasselblad H6D-100c, 85mm f/1.4 lens, natural daylight, raw authentic textures, micro-details, hyper-realistic documentary quality",
      more_cinematic: "shot on 35mm Arri Alexa LF, anamorphic lens flare, shallow depth of field, dramatic atmospheric haze, cinematic rim light, Hollywood color grade",
      more_luxury: "ultra-luxury high-end commercial aesthetic, opulent materials, gold caustics, architectural luxury lighting, pristine reflections, Vogue editorial",
      more_fashion: "Paris Fashion Week haute couture, Profoto softbox studio lighting, dramatic angles, avant-garde styling, crisp rim light, Harper's Bazaar cover",
      more_commercial: "crisp commercial product advertising, clean high-key studio lighting, flawless pristine surfaces, sharp macro focus, vibrant commercial color grade",
      more_viral: "high-energy dynamic composition, dramatic perspective, punchy saturated colors, eye-catching visual hook, trending TikTok & Instagram viral aesthetic"
    };

    const mod = styleModifiers[stylePreset] || "cinematic lighting, photorealistic 8k";
    const current = prompt.trim();
    if (!current) {
      setPrompt(mod);
      return;
    }
    // Prevent duplicate appending
    if (current.toLowerCase().includes(mod.slice(0, 20).toLowerCase())) {
      return;
    }
    setPrompt(`${current}, ${mod}`);
  };

  // Dedicated AI Prompt Copilot (Triggered ONLY by 'Improve Prompt' wand button)
  const enhancePromptText = async () => {
    const current = prompt.trim();
    if (!current || enhancingPrompt) return;
    setEnhancingPrompt(true);
    try {
      const data = await api.enhancePrompt({ prompt: current, enhance_style: "more_cinematic", style: "more_cinematic" });
      const enhancedText = data?.enhanced || data?.enhanced_prompt;
      if (enhancedText) {
        setPrompt(enhancedText);
      }
    } catch (err) {
      console.error("AI Enhance error:", err);
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
    setProgress(15);
    setStageTitle("01 • Initializing Synthesis Engine");
    setStatusMessage(`Dispatching prompt to ${activeModel.label}...`);
    setElapsedSeconds(0);
    const nowTime = new Date().toTimeString().split(" ")[0];
    setTelemetryLogs([
      { timestamp: nowTime, message: `Dispatched synthesis request on model: ${activeModel.label} (Batch Count: ${imageCount})` },
      { timestamp: nowTime, message: `Configured specs: ${aspectRatio} aspect ratio, ${resolution}, ${quality.toUpperCase()} quality` },
    ]);

    const startTimestamp = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed === 2) {
        setProgress(50);
        setStageTitle("02 • Neural Cloud Diffusion");
        setStatusMessage(`Rendering scene with optics (${lens || "35mm"}, ${aperture || "f/1.4"})...`);
        setTelemetryLogs((prev) => [
          ...prev,
          { timestamp: new Date().toTimeString().split(" ")[0], message: `Applying lighting & style: ${lighting || "Natural Studio"} • ${filmStock || "Cinematic"}` },
        ]);
      } else if (elapsed === 5) {
        setProgress(80);
        setStageTitle("03 • Finalizing High-Res Render");
        setStatusMessage(`Receiving generated frame and saving to secure storage...`);
        setTelemetryLogs((prev) => [
          ...prev,
          { timestamp: new Date().toTimeString().split(" ")[0], message: `Processing render output stream...` },
        ]);
      } else if (elapsed >= 7 && elapsed < 25) {
        setProgress((prev) => Math.min(prev + 2, 96));
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

      let finalPromptText = prompt.trim();
      let finalNegativePrompt = negativePrompt.trim();

      // Multi-Reference & Character Consistency Modulation
      if (refImages.length > 0) {
        const consistencyDirectives: string[] = [];
        const negDirectives: string[] = [];
        if (lockFace) {
          consistencyDirectives.push("exact facial geometry and likeness matching reference character");
          negDirectives.push("morphed face, distorted facial features, changing face identity");
        }
        if (lockDress) {
          consistencyDirectives.push("exact clothing costume, wardrobe silhouette and fabric texture matching reference");
          negDirectives.push("changing clothes, different dress, wrong wardrobe");
        }
        if (lockJewelry) {
          consistencyDirectives.push("consistent jewelry ornaments, accessories, and necklace matching reference");
          negDirectives.push("missing jewelry, changed jewelry");
        }
        if (lockBackground) {
          consistencyDirectives.push("consistent background environment, architectural backdrop, and scene lighting");
        }
        if (consistencyDirectives.length > 0) {
          finalPromptText += ` [Character Consistency: ${consistencyDirectives.join("; ")}].`;
        }
        if (negDirectives.length > 0) {
          finalNegativePrompt = finalNegativePrompt
            ? `${finalNegativePrompt}, ${negDirectives.join(", ")}`
            : negDirectives.join(", ");
        }
      }

      try {
        const savedPrefs = localStorage.getItem("omnistudio_preferences");
        if (savedPrefs) {
          const p = JSON.parse(savedPrefs);
          if (p.enablePromptDirective && p.promptDirective) {
            finalPromptText = `${finalPromptText}, ${p.promptDirective}`;
          }
        }
      } catch {}

      const data = await api.generateImage({
        prompt: finalPromptText,
        negative_prompt: finalNegativePrompt,
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
        apply_brand_kit: applyBrandKit,
      });

      setResult(data);
      if (data && data.success) {
        setProgress(100);
        setStageTitle("CANVAS DIFFUSION COMPLETE");
        setStatusMessage("Visual canvas synthesized successfully!");
        setPromptDockCollapsed(true);
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
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
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
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
        setPromptDockCollapsed(true);
      }
    } catch (e: any) {
      setVariationsResult({ success: false, error: e.message });
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setLoadingVariations(false);
    }
  };

  // Upload reference image
  const handleRefFileUpload = async (file: File) => {
    setUploadingRef(true);
    setRefUploadProgress(0);
    try {
      const data = await api.uploadWithProgress<any>("/api/image/upload-reference", file, "file", (pct) => {
        setRefUploadProgress(pct);
      });
      if (data && (data.url || data.path)) {
        const url = data.url || data.path;
        setRefImageUrl(url);
      }
    } catch (e: any) {
      alert(`Upload failed: ${e.message}`);
    } finally {
      setUploadingRef(false);
      setRefUploadProgress(0);
    }
  };

  // Upload image for precision editing
  const handleEditorImageUpload = async (file: File) => {
    if (!file) return;
    setUploadingEditorImage(true);
    setEditorUploadProgress(0);
    try {
      const res = await api.uploadWithProgress<any>("/api/image/upload", file, "file", (pct) => {
        setEditorUploadProgress(pct);
      });
      const url = res?.url || (typeof res === "string" ? res : "");
      if (url) {
        setEditorImageUrl(url);
        setOriginalEditorImageUrl(url);
        setEditorImageFile(file);
        setStudioMode("image_editor");
        setPromptDockCollapsed(true);
        // Auto-collapse left sidebar so image canvas and controls have full width
        window.dispatchEvent(new CustomEvent("omnistudio:collapse-sidebar"));
      }
    } catch (err) {
      console.error("Failed to upload image for editing:", err);
    } finally {
      setUploadingEditorImage(false);
      setEditorUploadProgress(0);
    }
  };

  // Apply edits to image
  const handleApplyImageEdit = async () => {
    if (!editorImageUrl) return;
    setProcessingImageEdit(true);
    try {
      const filename = editorImageUrl.split("/").pop() || "source_image.png";
      const res = await api.editImage({
        filename: filename,
        image_path: editorImageUrl,
        brightness: editorBrightness,
        contrast: editorContrast,
        saturation: editorSaturation,
        sharpness: editorSharpness,
        filter: editorFilter,
        aspect_ratio: editorCropRatio !== "original" ? editorCropRatio : undefined,
        upscale: editorUpscale,
        upscale_factor: editorUpscale ? 2 : 1,
        hue: editorHue,
        lightness: editorLightness,
        temperature: editorTemperature,
        tint: editorTint,
        curve_preset: editorCurvePreset !== "linear" ? editorCurvePreset : undefined,
        text_overlay: editorTextOverlay.trim() || undefined,
        text_position: editorTextPosition,
        text_color: editorTextColor,
        text_size: editorTextSize,
        resize_width: editorResizeEnabled ? editorWidth : undefined,
        resize_height: editorResizeEnabled ? editorHeight : undefined,
        compression_quality: editorCompressionQuality,
        output_format: editorOutputFormat,
      });
      if (res && res.success) {
        setResult(res);
        setLastExportedResult(res);
        if (res.url) {
          if (!originalEditorImageUrl) setOriginalEditorImageUrl(editorImageUrl);
          setEditorImageUrl(res.url);
          setShowBeforeAfter(true);
        }
      } else {
        alert(res?.detail || res?.error || "Image edit failed");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to process image edit");
    } finally {
      setProcessingImageEdit(false);
    }
  };

  // 1-Click AI Background Removal
  const handleAiRemoveBackground = async () => {
    if (!editorImageUrl) return;
    setProcessingBgRemoval(true);
    try {
      if (!originalEditorImageUrl) setOriginalEditorImageUrl(editorImageUrl);
      const res = await api.aiRemoveBackground(editorImageUrl);
      if (res && res.success && res.url) {
        setEditorImageUrl(res.url);
        setShowBeforeAfter(true);
      } else {
        alert(res?.error || "Background removal failed");
      }
    } catch (e: any) {
      alert("Background removal failed: " + (e.message || e));
    } finally {
      setProcessingBgRemoval(false);
    }
  };

  // AI Studio Relighting
  const handleAiRelight = async () => {
    if (!editorImageUrl) return;
    setProcessingRelight(true);
    try {
      if (!originalEditorImageUrl) setOriginalEditorImageUrl(editorImageUrl);
      const res = await api.aiRelight(editorImageUrl, relightPreset, relightIntensity);
      if (res && res.success && res.url) {
        setEditorImageUrl(res.url);
        setShowBeforeAfter(true);
      } else {
        alert(res?.error || "Relighting failed");
      }
    } catch (e: any) {
      alert("Relighting failed: " + (e.message || e));
    } finally {
      setProcessingRelight(false);
    }
  };

  // AI Face Restoration
  const handleAiFaceRestore = async () => {
    if (!editorImageUrl) return;
    setProcessingFaceRestore(true);
    try {
      if (!originalEditorImageUrl) setOriginalEditorImageUrl(editorImageUrl);
      const res = await api.aiFaceRestore(editorImageUrl);
      if (res && res.success && res.url) {
        setEditorImageUrl(res.url);
        setShowBeforeAfter(true);
      } else {
        alert(res?.error || "Face restoration failed");
      }
    } catch (e: any) {
      alert("Face restoration failed: " + (e.message || e));
    } finally {
      setProcessingFaceRestore(false);
    }
  };

  // AI Expand (Outpaint)
  const handleAiOutpaint = async () => {
    if (!editorImageUrl) return;
    setProcessingOutpaint(true);
    try {
      if (!originalEditorImageUrl) setOriginalEditorImageUrl(editorImageUrl);
      const res = await api.aiOutpaint(editorImageUrl, outpaintAspect);
      if (res && res.success && res.url) {
        setEditorImageUrl(res.url);
        setShowBeforeAfter(true);
      } else {
        alert(res?.error || "Outpaint expansion failed");
      }
    } catch (e: any) {
      alert("Outpaint failed: " + (e.message || e));
    } finally {
      setProcessingOutpaint(false);
    }
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

  // Direct blob download helper (bypasses cross-origin restrictions on <a download>)
  const handleDirectDownload = async (mediaUrl: string, targetFilename?: string) => {
    if (!mediaUrl) return;
    setDownloadingMaster(true);
    try {
      const fullUrl = getMediaUrl(mediaUrl);
      const res = await fetch(fullUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const cleanFilename = targetFilename || mediaUrl.split("/").pop() || `omnistudio_${Date.now()}.png`;
      a.download = cleanFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.warn("Direct blob download failed, opening in tab as fallback:", e);
      window.open(getMediaUrl(mediaUrl), "_blank");
    } finally {
      setDownloadingMaster(false);
    }
  };

  // Copy prompt helper with fallback for non-secure/mobile/iframe
  const handleCopyPrompt = async () => {
    const textToCopy = (currentDisplayImage as any)?.prompt || prompt;
    if (!textToCopy) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  // Filtered models for search in popover
  const filteredModels = availableModels.filter((m) => {
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

  // Actual Spend Calculation (Dynamic based on model, resolution, quality, and batch count)
  const activeBatchCount = studioMode === "text_to_image" ? imageCount : batchSize;
  const baseUnitCost = MODEL_PRICES[model] ?? 0.040;
  // 4K resolution and Ultra/HD quality double the GPU diffusion passes
  const isHighRes = resolution === "4k" || quality === "ultra" || quality === "hd";
  const resolutionMultiplier = isHighRes ? 2.0 : resolution === "2k" ? 1.5 : 1.0;
  const currentUnitCost = baseUnitCost * resolutionMultiplier;
  const currentTotalSpendUsd = currentUnitCost * activeBatchCount;
  const currentTotalSpendInr = Math.round(currentTotalSpendUsd * 83.5 * 100) / 100;

  // Dynamic Aspect Ratio classes for the preview canvas
  const getAspectRatioClass = (ratio: string) => {
    switch (ratio) {
      case "16:9": return "aspect-[16/9] max-h-[500px]";
      case "9:16": return "aspect-[9/16] max-h-[540px]";
      case "1:1": return "aspect-square max-h-[460px]";
      case "4:3": return "aspect-[4/3] max-h-[480px]";
      case "3:4": return "aspect-[3/4] max-h-[520px]";
      case "21:9": return "aspect-[21/9] max-h-[400px]";
      default: return "aspect-auto max-h-[520px]";
    }
  };

  const getAspectRatioLabel = (ratio: string) => {
    switch (ratio) {
      case "16:9": return "1920 × 1080 (16:9 Cinema)";
      case "9:16": return "1080 × 1920 (9:16 Shorts/Reels)";
      case "1:1": return "1080 × 1080 (1:1 Square Feed)";
      case "4:3": return "1440 × 1080 (4:3 Classic Photo)";
      case "3:4": return "1080 × 1440 (3:4 Editorial Portrait)";
      case "21:9": return "2560 × 1080 (21:9 Ultra-Wide)";
      default: return "Original Native Aspect";
    }
  };

  const computeLiveFilterStyle = () => {
    const parts: string[] = [];
    const b = Math.max(10, Math.min(220, 100 + editorBrightness + editorLightness));
    parts.push(`brightness(${b}%)`);

    let c = 100 + editorContrast;
    if (editorCurvePreset === "s_curve") c += 18;
    else if (editorCurvePreset === "high_contrast") c += 35;
    else if (editorCurvePreset === "matte") c -= 12;
    parts.push(`contrast(${Math.max(10, Math.min(250, c))}%)`);

    let s = Math.max(0, Math.min(250, 100 + Math.round(editorSaturation * 1.8)));
    if (editorCurvePreset === "s_curve") s += 8;
    else if (editorCurvePreset === "matte") s -= 10;
    parts.push(`saturate(${s}%)`);

    // Unified Hue + Tint + Cool Temperature angle to prevent conflicting rotations
    const combinedHue = editorHue + Math.round(editorTint * 0.35) + (editorTemperature < 0 ? Math.round(editorTemperature * 0.25) : 0);
    if (combinedHue !== 0) {
      parts.push(`hue-rotate(${combinedHue}deg)`);
    }

    if (editorTemperature > 0) {
      parts.push(`sepia(${Math.min(60, Math.round(editorTemperature * 0.35))}%)`);
    }

    if (editorFilter === "noir" || editorFilter === "black_white") {
      parts.push("grayscale(100%) contrast(125%)");
    } else if (editorFilter === "sepia") {
      parts.push("sepia(80%) contrast(95%)");
    } else if (editorFilter === "cyberpunk") {
      parts.push("hue-rotate(275deg) saturate(160%) contrast(115%)");
    } else if (editorFilter === "cinematic") {
      parts.push("contrast(115%) saturate(120%)");
    } else if (editorFilter === "golden_hour") {
      parts.push("sepia(30%) saturate(125%) contrast(108%)");
    } else if (editorFilter === "vintage") {
      parts.push("sepia(40%) saturate(85%) contrast(98%)");
    } else if (editorFilter === "editorial") {
      parts.push("contrast(118%) saturate(105%)");
    } else if (editorFilter === "vibrant") {
      parts.push("saturate(140%) contrast(108%)");
    } else if (editorFilter === "pastel") {
      parts.push("contrast(92%) brightness(106%) saturate(108%)");
    }

    return parts.join(" ");
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-between pb-72 font-jakarta bg-[#fafafa] dark:bg-[#06060a]">
      {/* Top Bar: Studio Mode Tabs & Guide Trigger (Sticky in Image Editor) */}
      <div className={cn(
        "transition-all",
        studioMode === "image_editor"
          ? "sticky top-14 sm:top-16 z-30 bg-[#fafafa]/95 dark:bg-[#06060a]/95 backdrop-blur-md shadow-xs border-b border-black/[0.08] dark:border-white/[0.08]"
          : "border-b border-black/[0.06] dark:border-white/[0.06]"
      )}>
        {/* Row 1: Studio Mode Tabs & Action Buttons */}
        <div className="flex items-center justify-between gap-4 py-3 px-4 w-full">
          <div className="flex items-center gap-2 bg-white dark:bg-[#0d0d14] p-1 rounded-xl border border-black/[0.08] dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setStudioMode("text_to_image")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
                studioMode === "text_to_image"
                  ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-bold shadow-sm border border-violet-200 dark:border-violet-500/20"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/[0.04] border border-transparent"
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
                  ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-bold shadow-sm border border-violet-200 dark:border-violet-500/20"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/[0.04] border border-transparent"
              )}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Image Variations</span>
            </button>
            <button
              type="button"
              onClick={() => setStudioMode("image_editor")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
                studioMode === "image_editor"
                  ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-bold shadow-sm border border-violet-200 dark:border-violet-500/20"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/[0.04] border border-transparent"
              )}
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-500" />
              <span>Image Editor</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                STUDIO
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Image Upload Button */}
            <input
              ref={quickUploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleEditorImageUpload(f);
                e.target.value = "";
              }}
              disabled={uploadingEditorImage}
            />
            <button
              type="button"
              onClick={() => quickUploadInputRef.current?.click()}
              disabled={uploadingEditorImage}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0d0d14] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:border-emerald-500/40 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
            >
              {uploadingEditorImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                  <span>Uploading {editorUploadProgress}%</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Upload Image</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={openVaultPicker}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0d0d14] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:border-violet-500/40 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
              title="Pick from Vault"
            >
              <FolderArchive className="w-3.5 h-3.5 text-violet-500" />
              <span>From Vault</span>
            </button>
            <button
              type="button"
              onClick={() => setReferenceDrawerOpen((prev) => !prev)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-xs",
                referenceDrawerOpen || refImages.length > 0
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold"
                  : "bg-white dark:bg-[#0d0d14] border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white"
              )}
            >
              <ImagePlus className="w-3.5 h-3.5 text-emerald-500" />
              <span>References {refImages.length > 0 ? `(${refImages.length})` : ""}</span>
            </button>
            <button
              type="button"
              onClick={() => setHowItWorksOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
              <span>Studio Guide</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-violet-700 dark:text-violet-300 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              <span>ACTIVE: {activeModel.label}</span>
            </div>
          </div>
        </div>

        {/* Row 2: Precision Image Studio & Color Lab Toolbar (Shown in image_editor mode) */}
        {studioMode === "image_editor" && (
          <div className="flex flex-wrap items-center justify-between gap-3 py-2 px-4 border-t border-black/[0.04] dark:border-white/[0.04] w-full bg-white/50 dark:bg-black/25">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-500" />
              <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-950 dark:text-white">
                Precision Image Studio & Color Lab
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                LIVE REAL-TIME PREVIEW
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={editorFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleEditorImageUpload(f);
                  e.target.value = "";
                }}
                disabled={uploadingEditorImage}
              />
              <button
                type="button"
                onClick={() => editorFileInputRef.current?.click()}
                disabled={uploadingEditorImage}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {uploadingEditorImage ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                    <span>{editorUploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload New</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={openVaultPicker}
                className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <FolderArchive className="w-3.5 h-3.5 text-violet-400" />
                <span>Pick from Vault</span>
              </button>
            </div>
          </div>
        )}
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
        {!loading && !loadingVariations && result && result.success && studioMode !== "image_editor" && (
          <div className="w-full space-y-4 animate-in fade-in duration-200">
            {/* Batch Variations Selector Strip */}
            {displayImages.length > 1 && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/90 dark:bg-[#111118]/90 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] shadow-sm">
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
                          ? "border-violet-500 ring-2 ring-violet-500/20 scale-105"
                          : "border-black/[0.08] dark:border-white/[0.08] opacity-70 hover:opacity-100 hover:border-violet-400/50"
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

            {/* Primary High-Resolution Result Canvas */}
            <div className="relative rounded-3xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] bg-zinc-950 shadow-2xl flex items-center justify-center group min-h-[420px] max-h-[750px]">
              {/* Image with Fade-in and Smooth Aspect Ratio Rendering */}
              <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4">
                <img
                  src={getMediaUrl(currentDisplayImage.url)}
                  alt={prompt || "Master Generated Image"}
                  onLoad={() => setImageLoaded(true)}
                  className={cn(
                    "max-h-[700px] w-auto max-w-full object-contain rounded-2xl transition-all duration-500 shadow-2xl",
                    imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-98"
                  )}
                />

                {/* Floating Top Left Model Badge */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                  <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-black/80 text-white border border-white/10 backdrop-blur-md font-semibold flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>{activeModel.label}</span>
                    <span className="opacity-60">•</span>
                    <span>{resolution.toUpperCase()}</span>
                    {displayImages.length > 1 && (
                      <>
                        <span className="opacity-60">•</span>
                        <span>Var {selectedImageIndex + 1}/{displayImages.length}</span>
                      </>
                    )}
                  </span>
                  {result.simulated && (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30">
                      SIMULATED
                    </span>
                  )}
                </div>

                {/* Floating Top Right Zoom Trigger */}
                <div className="absolute top-4 right-4 z-20">
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="p-2 rounded-full bg-white/90 dark:bg-black/70 hover:bg-white dark:hover:bg-black text-zinc-800 dark:text-white border border-black/[0.08] dark:border-white/[0.15] backdrop-blur-md transition-colors cursor-pointer shadow-sm hover:scale-105"
                    title="Fullscreen Zoom"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                {/* Floating Actions on Canvas Bottom (Edit Image, Copy Prompt, Download Master) */}
                <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 opacity-95 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => {
                      setEditorImageUrl(currentDisplayImage.url);
                      setOriginalEditorImageUrl(currentDisplayImage.url);
                      setStudioMode("image_editor");
                      setPromptDockCollapsed(true);
                      window.dispatchEvent(new CustomEvent("omnistudio:collapse-sidebar"));
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/90 dark:bg-black/80 hover:bg-white dark:hover:bg-black text-zinc-800 dark:text-white text-xs font-mono border border-black/[0.08] dark:border-white/[0.2] backdrop-blur-md cursor-pointer transition-colors shadow-sm whitespace-nowrap shrink-0 hover:scale-105"
                    title="Open in Precision Image Editor"
                  >
                    <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Edit Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSocialMediaUrl(currentDisplayImage.url);
                      setSocialModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/90 dark:bg-black/80 hover:bg-white dark:hover:bg-black text-zinc-800 dark:text-white text-xs font-mono border border-black/[0.08] dark:border-white/[0.2] backdrop-blur-md cursor-pointer transition-colors shadow-sm whitespace-nowrap shrink-0 hover:scale-105"
                    title="1-Click Multi-Platform Social Media Repurposer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Socials</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/90 dark:bg-black/80 hover:bg-white dark:hover:bg-black text-zinc-800 dark:text-white text-xs font-mono border border-black/[0.08] dark:border-white/[0.2] backdrop-blur-md cursor-pointer transition-colors shadow-sm whitespace-nowrap shrink-0 hover:scale-105"
                    title="Copy Prompt"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPrompt ? "Copied" : "Prompt"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDirectDownload(currentDisplayImage.url, currentDisplayImage.filename)}
                    disabled={downloadingMaster}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-heading font-bold shadow-md shadow-emerald-500/25 cursor-pointer transition-all active:scale-95 whitespace-nowrap shrink-0 hover:scale-105 disabled:opacity-60"
                    title="Direct Download Master Image"
                  >
                    {downloadingMaster ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>{downloadingMaster ? "Downloading..." : "Download Master"}</span>
                  </button>
                </div>
              </div>

              {/* Lightbox Modal (Fullscreen 4K Inspector) */}
              {lightboxOpen && (
                <div
                  className="fixed inset-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-200"
                  onClick={() => setLightboxOpen(false)}
                >
                  <div className="relative max-w-7xl max-h-[95vh] flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(false)}
                      className="absolute -top-12 right-0 p-2 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-zinc-800 dark:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-6 h-6" />
                    </button>

                    <img
                      src={getMediaUrl(currentDisplayImage.url)}
                      alt="Master Preview"
                      className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-black/10 dark:border-white/10"
                      onClick={(e) => e.stopPropagation()}
                    />

                    <div className="mt-3 flex items-center gap-4 text-xs font-mono text-zinc-600 dark:text-zinc-300">
                      <span>{activeModel.label} • {resolution.toUpperCase()}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDirectDownload(currentDisplayImage.url, currentDisplayImage.filename);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                className="text-xs font-mono text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Dismiss</span>
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {variationsResult.variations?.map((v: any, idx: number) => (
                <div key={idx} className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#0d0d14] shadow-sm overflow-hidden group relative flex flex-col justify-between hover:border-violet-500/30 transition-colors">
                  <img src={getMediaUrl(v.url)} alt={v.description} className="w-full aspect-square object-cover" />
                  <div className="p-2.5 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <p className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 line-clamp-1">{v.description}</p>
                    <a
                      href={getMediaUrl(v.url)}
                      download
                      className="mt-2 w-full flex items-center justify-center gap-1 py-1 rounded bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300 text-[10px] font-mono font-bold hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
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
          <div className="w-full max-w-lg my-12 p-6 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-center space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-mono font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">Generation Failed</h3>
              <p className="text-xs text-rose-600/80 dark:text-zinc-300 font-mono leading-relaxed max-w-md mx-auto">
                {result.error || "An error occurred during image generation."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-mono border border-black/[0.08] dark:border-zinc-800 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={generate}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition-colors shadow-sm cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* State Variations Error: Display clear variations error feedback */}
        {!loading && !loadingVariations && variationsResult && !variationsResult.success && (
          <div className="w-full max-w-lg my-12 p-6 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-center space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-mono font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">Variations Failed</h3>
              <p className="text-xs text-rose-600/80 dark:text-zinc-300 font-mono leading-relaxed max-w-md mx-auto">
                {variationsResult.error || "An error occurred during variations generation."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVariationsResult(null)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-mono border border-black/[0.08] dark:border-zinc-800 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={generateBulkVariations}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition-colors shadow-sm cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* State E: Image Precision Editor & Color Lab */}
        {studioMode === "image_editor" && (
          <div className="w-full max-w-[1650px] mx-auto space-y-6 animate-in fade-in duration-200">
            {editorImageUrl ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Image Live Viewport & Canvas */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-4">
                  {/* Canvas Controls Toolbar: Before/After toggle + Social Repurpose */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      {originalEditorImageUrl && (
                        <button
                          type="button"
                          onClick={() => setShowBeforeAfter((prev) => !prev)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer border",
                            showBeforeAfter
                              ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                              : "bg-zinc-100 dark:bg-white/[0.05] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/10 hover:bg-zinc-200"
                          )}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>{showBeforeAfter ? "Exit Split View" : "Before / After Compare"}</span>
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSocialMediaUrl(editorImageUrl);
                        setSocialModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-white/90 dark:bg-black/80 hover:bg-white dark:hover:bg-black text-zinc-800 dark:text-white border border-black/[0.08] dark:border-white/[0.2] backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105"
                      title="1-Click Multi-Platform Social Media Repurposer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Social Repurpose</span>
                    </button>
                  </div>

                  {/* Aspect Ratio Canvas Container (Tightly fits the image's actual size) */}
                  <div className="flex justify-center items-center w-full min-h-[300px]">
                    <div
                      className={cn(
                        "relative rounded-2xl overflow-hidden border border-black/[0.12] dark:border-white/[0.14] bg-zinc-950 shadow-2xl transition-all duration-300 flex items-center justify-center",
                        editorCropRatio === "original"
                          ? "w-fit max-w-full"
                          : cn("w-full max-w-2xl", getAspectRatioClass(editorCropRatio))
                      )}
                    >
                      {showBeforeAfter && originalEditorImageUrl ? (
                        <BeforeAfterSlider
                          beforeSrc={getMediaUrl(originalEditorImageUrl)}
                          afterSrc={getMediaUrl(editorImageUrl)}
                          beforeLabel="Original"
                          afterLabel="AI Edited"
                          className="max-h-[58vh] sm:max-h-[66vh] max-w-full w-auto"
                        />
                      ) : (
                        <div className="relative inline-flex items-center justify-center max-w-full">
                          <img
                            src={getMediaUrl(editorImageUrl)}
                            alt="Editor Preview"
                            style={{
                              filter: computeLiveFilterStyle(),
                            }}
                            className={cn(
                              "block transition-all duration-150 select-none",
                              editorCropRatio !== "original"
                                ? "w-full h-full object-cover"
                                : "max-h-[58vh] sm:max-h-[66vh] max-w-full w-auto h-auto object-contain"
                            )}
                          />

                          {/* Live Text Overlay on Canvas */}
                          {editorTextOverlay.trim() && (
                            <div
                              className={cn(
                                "absolute left-0 right-0 px-4 text-center font-bold tracking-wide pointer-events-none select-none",
                                editorTextPosition === "top" && "top-4",
                                editorTextPosition === "center" && "top-1/2 -translate-y-1/2",
                                editorTextPosition === "bottom" && "bottom-4"
                              )}
                              style={{
                                color: editorTextColor,
                                fontSize: `${Math.max(12, Math.min(48, editorTextSize))}px`,
                                textShadow: "0 2px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.8)",
                              }}
                            >
                              {editorTextOverlay}
                            </div>
                          )}

                          {/* Live Status Overlay Badge */}
                          <div className="absolute top-2.5 left-2.5 text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/75 text-white backdrop-blur-md border border-white/10 flex items-center gap-1.5 shadow-sm pointer-events-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{getAspectRatioLabel(editorCropRatio)}</span>
                            {editorFilter !== "none" && <span className="opacity-75">• {editorFilter.toUpperCase()}</span>}
                            {editorCurvePreset !== "linear" && <span className="opacity-75">• {editorCurvePreset.toUpperCase()}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reformat Canvas Aspect Ratio Toolbar */}
                  <div className="p-3 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-1.5">
                        <Crop className="w-3 h-3 text-emerald-500" />
                        Reformat Canvas Aspect Ratio
                      </span>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {getAspectRatioLabel(editorCropRatio)}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 text-xs font-mono">
                      {[
                        { id: "original", label: "Original" },
                        { id: "16:9", label: "16:9" },
                        { id: "9:16", label: "9:16" },
                        { id: "1:1", label: "1:1" },
                        { id: "4:3", label: "4:3" },
                        { id: "3:4", label: "3:4" },
                        { id: "21:9", label: "21:9" },
                      ].map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setEditorCropRatio(r.id)}
                          className={cn(
                            "py-1.5 rounded-xl border text-center transition-all cursor-pointer font-bold",
                            editorCropRatio === r.id
                              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-transparent shadow-xs"
                              : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                          )}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Quick Bar Under Canvas */}
                  <div className="flex items-center justify-between gap-2 pt-1 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEditorBrightness(0);
                        setEditorContrast(0);
                        setEditorSaturation(0);
                        setEditorSharpness(0);
                        setEditorHue(0);
                        setEditorLightness(0);
                        setEditorTemperature(0);
                        setEditorTint(0);
                        setEditorCurvePreset("linear");
                        setEditorFilter("none");
                        setEditorCropRatio("original");
                        setEditorTextOverlay("");
                        setEditorResizeEnabled(false);
                      }}
                      className="text-zinc-500 hover:text-rose-500 transition-colors cursor-pointer text-[11px]"
                    >
                      Reset All Adjustments
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push(`/video?image=${encodeURIComponent(editorImageUrl)}`)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all cursor-pointer font-bold shadow-xs"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Animate to Video</span>
                    </button>
                  </div>
                </div>

                {/* Editor Adjustments Sidebar (Multi-Tab Suite) */}
                <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm font-jakarta max-h-[82vh] overflow-y-auto custom-scrollbar">
                  {/* Category Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl overflow-x-auto custom-scrollbar">
                    {[
                      { id: "ai_tools", label: "✨ AI Tools" },
                      { id: "filters", label: "Filters" },
                      { id: "hsl", label: "HSL & Color" },
                      { id: "curves", label: "Curves" },
                      { id: "text", label: "Text" },
                      { id: "resize", label: "Resize" },
                      { id: "export", label: "Export" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setEditorActiveTab(tab.id as any)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0",
                          editorActiveTab === tab.id
                            ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-bold"
                            : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab 0: AI Editing Tools (Background Removal, Relighting, Face Restore, AI Expand) */}
                  {editorActiveTab === "ai_tools" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/10 to-pink-500/10 border border-indigo-500/20">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                          <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                            Zero-Cost Neural & Vision Suite
                          </p>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                          Automated local AI transforms with split comparison slider
                        </p>
                      </div>

                      {/* Tool 1: Background Removal */}
                      <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-emerald-500" />
                            <div>
                              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">AI Background Removal</h4>
                              <p className="text-[10px] text-zinc-500">1-Click transparent cut-out PNG</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            FREE
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAiRemoveBackground}
                          disabled={processingBgRemoval || !editorImageUrl}
                          className="w-full py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          {processingBgRemoval ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Extracting Alpha Mask...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Remove Background</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Tool 2: Studio Relighting */}
                      <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sun className="w-4 h-4 text-amber-500" />
                            <div>
                              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Studio Relighting</h4>
                              <p className="text-[10px] text-zinc-500">Directional lighting gradient & caustics</p>
                            </div>
                          </div>
                        </div>

                        {/* Presets */}
                        <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                          {[
                            { id: "golden_hour", label: "Golden Hour" },
                            { id: "studio_softbox", label: "Studio Softbox" },
                            { id: "neon_cyberpunk", label: "Cyberpunk Neon" },
                            { id: "dramatic_chiaroscuro", label: "Chiaroscuro" },
                            { id: "warm_sunset", label: "Warm Sunset" },
                          ].map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setRelightPreset(p.id)}
                              className={cn(
                                "p-2 rounded-lg text-left transition-all cursor-pointer border",
                                relightPreset === p.id
                                  ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold"
                                  : "bg-white dark:bg-white/[0.03] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                              )}
                            >
                              <span className="text-[11px] block">{p.label}</span>
                            </button>
                          ))}
                        </div>

                        {/* Intensity Slider */}
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                            <span>Relight Intensity</span>
                            <span className="font-bold text-zinc-900 dark:text-white">{relightIntensity.toFixed(1)}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.2"
                            max="1.8"
                            step="0.1"
                            value={relightIntensity}
                            onChange={(e) => setRelightIntensity(Number(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleAiRelight}
                          disabled={processingRelight || !editorImageUrl}
                          className="w-full py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          {processingRelight ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Relighting Scene...</span>
                            </>
                          ) : (
                            <>
                              <Sun className="w-3.5 h-3.5" />
                              <span>Apply Studio Relight</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Tool 3: Face Restoration */}
                      <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wand2 className="w-4 h-4 text-violet-500" />
                            <div>
                              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Face & Texture Restoration</h4>
                              <p className="text-[10px] text-zinc-500">Sharpen micro-textures and facial features</p>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleAiFaceRestore}
                          disabled={processingFaceRestore || !editorImageUrl}
                          className="w-full py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          {processingFaceRestore ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Restoring Textures...</span>
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-3.5 h-3.5" />
                              <span>Restore Face Details</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Tool 4: AI Expand (Outpaint) */}
                      <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Maximize2 className="w-4 h-4 text-blue-500" />
                            <div>
                              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">AI Expand (Outpainting)</h4>
                              <p className="text-[10px] text-zinc-500">Expand canvas to widescreen or portrait</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1 text-xs font-mono">
                          {["16:9", "9:16", "21:9", "4:3"].map((asp) => (
                            <button
                              key={asp}
                              type="button"
                              onClick={() => setOutpaintAspect(asp)}
                              className={cn(
                                "py-1.5 rounded-lg text-center transition-all cursor-pointer border",
                                outpaintAspect === asp
                                  ? "bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400 font-bold"
                                  : "bg-white dark:bg-white/[0.03] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                              )}
                            >
                              {asp}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handleAiOutpaint}
                          disabled={processingOutpaint || !editorImageUrl}
                          className="w-full py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          {processingOutpaint ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Expanding Canvas...</span>
                            </>
                          ) : (
                            <>
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span>Expand Canvas ({outpaintAspect})</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tab 1: Preset Filters & Core Adjustments */}
                  {editorActiveTab === "filters" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold block">
                          Color Filter LUT Presets
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: "none", label: "Original" },
                            { id: "cinematic", label: "Cinematic" },
                            { id: "noir", label: "Film Noir" },
                            { id: "cyberpunk", label: "Cyberpunk" },
                            { id: "golden_hour", label: "Golden Hour" },
                            { id: "vintage", label: "Vintage 70s" },
                            { id: "editorial", label: "Editorial" },
                            { id: "vibrant", label: "Vibrant Pop" },
                            { id: "pastel", label: "Pastel Soft" },
                          ].map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setEditorFilter(f.id)}
                              className={cn(
                                "px-2 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer truncate text-center",
                                editorFilter === f.id
                                  ? "bg-emerald-500 text-zinc-950 font-bold shadow-xs"
                                  : "bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                              )}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                            <span>Brightness</span>
                            <span>{editorBrightness > 0 ? `+${editorBrightness}` : editorBrightness}%</span>
                          </div>
                          <input
                            type="range"
                            min="-50"
                            max="50"
                            value={editorBrightness}
                            onChange={(e) => setEditorBrightness(Number(e.target.value))}
                            className="w-full accent-emerald-500 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                            <span>Contrast</span>
                            <span>{editorContrast > 0 ? `+${editorContrast}` : editorContrast}%</span>
                          </div>
                          <input
                            type="range"
                            min="-50"
                            max="50"
                            value={editorContrast}
                            onChange={(e) => setEditorContrast(Number(e.target.value))}
                            className="w-full accent-emerald-500 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                            <span>Saturation</span>
                            <span>{editorSaturation > 0 ? `+${editorSaturation}` : editorSaturation}%</span>
                          </div>
                          <input
                            type="range"
                            min="-50"
                            max="50"
                            value={editorSaturation}
                            onChange={(e) => setEditorSaturation(Number(e.target.value))}
                            className="w-full accent-emerald-500 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                            <span>Sharpness Texture</span>
                            <span>{editorSharpness}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={editorSharpness}
                            onChange={(e) => setEditorSharpness(Number(e.target.value))}
                            className="w-full accent-emerald-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: HSL, Color Temperature & Tint */}
                  {editorActiveTab === "hsl" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-400" />
                              Color Temperature
                            </span>
                            <span className="font-bold">
                              {editorTemperature > 0 ? `+${editorTemperature} (Warm)` : editorTemperature < 0 ? `${editorTemperature} (Cool)` : "Neutral 0"}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={editorTemperature}
                            onChange={(e) => setEditorTemperature(Number(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                          <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                            <span>Cool Blue (-100)</span>
                            <span>Warm Amber (+100)</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-fuchsia-400" />
                              Tint (Green / Magenta)
                            </span>
                            <span className="font-bold">
                              {editorTint > 0 ? `+${editorTint} (Magenta)` : editorTint < 0 ? `${editorTint} (Green)` : "Neutral 0"}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={editorTint}
                            onChange={(e) => setEditorTint(Number(e.target.value))}
                            className="w-full accent-fuchsia-500 cursor-pointer"
                          />
                          <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                            <span>Green (-100)</span>
                            <span>Magenta (+100)</span>
                          </div>
                        </div>

                        <div className="space-y-1 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                          <div className="flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                            <span className="flex items-center gap-1.5">
                              <Palette className="w-3.5 h-3.5 text-indigo-400" />
                              Hue Wheel Angle
                            </span>
                            <span className="font-bold">{editorHue}°</span>
                          </div>
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            value={editorHue}
                            onChange={(e) => setEditorHue(Number(e.target.value))}
                            className="w-full accent-indigo-500 cursor-pointer"
                          />
                          {/* Visual Rainbow Spectrum Strip */}
                          <div className="h-2 rounded-full w-full bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 via-cyan-400 via-blue-500 via-purple-500 to-red-500 opacity-85" />
                        </div>

                        {/* Saturation Vibrance Slider in HSL */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-cyan-400" />
                              Saturation Vibrance
                            </span>
                            <span className="font-bold">{editorSaturation > 0 ? `+${editorSaturation}` : editorSaturation}%</span>
                          </div>
                          <input
                            type="range"
                            min="-50"
                            max="50"
                            value={editorSaturation}
                            onChange={(e) => setEditorSaturation(Number(e.target.value))}
                            className="w-full accent-cyan-500 cursor-pointer"
                          />
                          <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                            <span>Muted (-50%)</span>
                            <span>Punchy Color (+50%)</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                            <span>Lightness Shift</span>
                            <span>{editorLightness > 0 ? `+${editorLightness}` : editorLightness}%</span>
                          </div>
                          <input
                            type="range"
                            min="-50"
                            max="50"
                            value={editorLightness}
                            onChange={(e) => setEditorLightness(Number(e.target.value))}
                            className="w-full accent-emerald-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Curves Tone Grading with Live Curve Graph */}
                  {editorActiveTab === "curves" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold block">
                            Tone Curve Visualizer
                          </label>
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                            {editorCurvePreset.replace("_", " ")}
                          </span>
                        </div>

                        {/* Interactive / Visual SVG Curve Display */}
                        <div className="relative w-full h-44 rounded-2xl bg-[#09090f] border border-black/[0.1] dark:border-white/[0.1] p-3 shadow-inner overflow-hidden flex flex-col justify-between select-none">
                          <svg className="w-full h-full overflow-visible" viewBox="0 0 240 130" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                              </linearGradient>
                            </defs>

                            {/* 4x4 Grid lines */}
                            <line x1="60" y1="5" x2="60" y2="125" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                            <line x1="120" y1="5" x2="120" y2="125" stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
                            <line x1="180" y1="5" x2="180" y2="125" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                            <line x1="10" y1="35" x2="230" y2="35" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                            <line x1="10" y1="65" x2="230" y2="65" stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
                            <line x1="10" y1="95" x2="230" y2="95" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />

                            {/* Linear 45° baseline */}
                            <line x1="10" y1="125" x2="230" y2="5" stroke="rgba(255,255,255,0.18)" strokeDasharray="4 4" strokeWidth="1" />

                            {/* Area fill under curve */}
                            <path
                              d={
                                editorCurvePreset === "linear"
                                  ? "M 10,125 L 230,5 L 230,125 Z"
                                  : editorCurvePreset === "s_curve"
                                  ? "M 10,125 C 70,128 90,75 120,65 C 150,55 170,8 230,5 L 230,125 Z"
                                  : editorCurvePreset === "matte"
                                  ? "M 10,105 C 60,105 100,70 120,65 C 140,60 180,25 230,22 L 230,125 Z"
                                  : editorCurvePreset === "high_contrast"
                                  ? "M 10,125 C 65,125 90,95 120,65 C 150,35 175,5 230,5 L 230,125 Z"
                                  : "M 10,118 C 60,122 95,80 120,65 C 145,50 180,18 230,15 L 230,125 Z"
                              }
                              fill="url(#curveGradient)"
                            />

                            {/* Active Tone Curve Path */}
                            <path
                              d={
                                editorCurvePreset === "linear"
                                  ? "M 10,125 L 230,5"
                                  : editorCurvePreset === "s_curve"
                                  ? "M 10,125 C 70,128 90,75 120,65 C 150,55 170,8 230,5"
                                  : editorCurvePreset === "matte"
                                  ? "M 10,105 C 60,105 100,70 120,65 C 140,60 180,25 230,22"
                                  : editorCurvePreset === "high_contrast"
                                  ? "M 10,125 C 65,125 90,95 120,65 C 150,35 175,5 230,5"
                                  : "M 10,118 C 60,122 95,80 120,65 C 145,50 180,18 230,15"
                              }
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />

                            {/* Control Nodes */}
                            <circle cx="10" cy={editorCurvePreset === "matte" ? 105 : editorCurvePreset === "moody" ? 118 : 125} r="3.5" fill="#10b981" />
                            <circle cx="60" cy={editorCurvePreset === "s_curve" ? 108 : editorCurvePreset === "matte" ? 92 : editorCurvePreset === "high_contrast" ? 110 : 95} r="3.5" fill="#34d399" />
                            <circle cx="120" cy="65" r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
                            <circle cx="180" cy={editorCurvePreset === "s_curve" ? 28 : editorCurvePreset === "matte" ? 38 : editorCurvePreset === "high_contrast" ? 20 : 35} r="3.5" fill="#34d399" />
                            <circle cx="230" cy={editorCurvePreset === "matte" ? 22 : editorCurvePreset === "moody" ? 15 : 5} r="3.5" fill="#10b981" />
                          </svg>

                          {/* Graph Axes Labels */}
                          <div className="flex items-center justify-between text-[8px] font-mono text-zinc-500 pt-1 border-t border-white/[0.06]">
                            <span>Shadows (0)</span>
                            <span>Midtones (128)</span>
                            <span>Highlights (255)</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold block">
                          Curve Color Grading Presets
                        </label>
                        {[
                          { id: "linear", name: "Linear (Default)", desc: "Neutral flat tone response without contrast curve" },
                          { id: "s_curve", name: "S-Curve (High Definition)", desc: "Punchy contrast, deeper rich blacks, and luminous highlights" },
                          { id: "matte", name: "Faded Matte Film", desc: "Lifted darks, muted vintage blacks, and soft retro skin tones" },
                          { id: "high_contrast", name: "High Contrast Punch", desc: "Dramatic commercial shadows with crisp high dynamic range" },
                          { id: "moody", name: "Moody Blockbuster", desc: "Hollywood teal shadows with warm amber skin highlights" },
                        ].map((c) => (
                          <div
                            key={c.id}
                            onClick={() => setEditorCurvePreset(c.id)}
                            className={cn(
                              "p-3 rounded-xl border text-left cursor-pointer transition-all",
                              editorCurvePreset === c.id
                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-xs"
                                : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200/70 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-bold">{c.name}</span>
                              {editorCurvePreset === c.id && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                            </div>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{c.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab 4: Typography & Text Overlay */}
                  {editorActiveTab === "text" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold block">
                          Overlay Caption / Watermark
                        </label>
                        <input
                          type="text"
                          value={editorTextOverlay}
                          onChange={(e) => setEditorTextOverlay(e.target.value)}
                          placeholder="Type overlay text (e.g. SUMMER 2026)..."
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs font-jakarta focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold block">
                          Position
                        </label>
                        <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                          {["top", "center", "bottom"].map((pos) => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => setEditorTextPosition(pos)}
                              className={cn(
                                "py-1.5 rounded-xl border uppercase transition-all cursor-pointer font-bold",
                                editorTextPosition === pos
                                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-transparent"
                                  : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                              )}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                          <span>Font Size</span>
                          <span>{editorTextSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="16"
                          max="72"
                          value={editorTextSize}
                          onChange={(e) => setEditorTextSize(Number(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold block">
                          Text Color
                        </label>
                        <div className="flex items-center gap-2">
                          {[
                            { color: "#ffffff", label: "White" },
                            { color: "#fbbf24", label: "Gold" },
                            { color: "#06b6d4", label: "Cyan" },
                            { color: "#ec4899", label: "Pink" },
                            { color: "#10b981", label: "Emerald" },
                            { color: "#18181b", label: "Black" },
                          ].map((c) => (
                            <button
                              key={c.color}
                              type="button"
                              onClick={() => setEditorTextColor(c.color)}
                              className={cn(
                                "w-7 h-7 rounded-full border-2 transition-transform cursor-pointer shadow-xs",
                                editorTextColor === c.color ? "scale-115 border-emerald-500" : "border-white/30"
                              )}
                              style={{ backgroundColor: c.color }}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 5: Dimensions & Resize */}
                  {editorActiveTab === "resize" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.06]">
                        <div>
                          <span className="text-xs font-bold text-zinc-900 dark:text-white block">Custom Canvas Resize</span>
                          <span className="text-[10px] font-mono text-zinc-500">Rescale pixels with Lanczos resampling</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={editorResizeEnabled}
                          onChange={(e) => setEditorResizeEnabled(e.target.checked)}
                          className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                        />
                      </div>

                      {editorResizeEnabled && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                            <div>
                              <label className="text-[10px] uppercase text-zinc-500 block mb-1">Width (px)</label>
                              <input
                                type="number"
                                value={editorWidth}
                                onChange={(e) => setEditorWidth(Number(e.target.value))}
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase text-zinc-500 block mb-1">Height (px)</label>
                              <input
                                type="number"
                                value={editorHeight}
                                onChange={(e) => setEditorHeight(Number(e.target.value))}
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3 py-2"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold block">
                              Quick Dimension Presets
                            </label>
                            <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
                              {[
                                { label: "1080p FHD (1920x1080)", w: 1920, h: 1080 },
                                { label: "2K QHD (2560x1440)", w: 2560, h: 1440 },
                                { label: "4K UHD (3840x2160)", w: 3840, h: 2160 },
                                { label: "Square (1080x1080)", w: 1080, h: 1080 },
                                { label: "Story (1080x1920)", w: 1080, h: 1920 },
                              ].map((p) => (
                                <button
                                  key={p.label}
                                  type="button"
                                  onClick={() => {
                                    setEditorWidth(p.w);
                                    setEditorHeight(p.h);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-[11px] truncate text-left hover:border-emerald-500 cursor-pointer"
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 6: Export, Compression & Super-Resolution */}
                  {editorActiveTab === "export" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold block">
                          Output Format
                        </label>
                        <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                          {[
                            { id: "png", label: "PNG (Lossless)" },
                            { id: "jpeg", label: "JPEG (Photo)" },
                            { id: "webp", label: "WEBP (Compact)" },
                          ].map((fmt) => (
                            <button
                              key={fmt.id}
                              type="button"
                              onClick={() => setEditorOutputFormat(fmt.id)}
                              className={cn(
                                "py-2 rounded-xl border text-center transition-all cursor-pointer font-bold",
                                editorOutputFormat === fmt.id
                                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-transparent"
                                  : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                              )}
                            >
                              {fmt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                          <span>Compression Quality</span>
                          <span className="font-bold">{editorCompressionQuality}%</span>
                        </div>
                        <input
                          type="range"
                          min="40"
                          max="100"
                          value={editorCompressionQuality}
                          onChange={(e) => setEditorCompressionQuality(Number(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                          <span>Smaller File</span>
                          <span>Maximum Clarity</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.06]">
                        <div>
                          <span className="text-xs font-bold text-zinc-900 dark:text-white block">AI Super-Resolution 4K</span>
                          <span className="text-[10px] font-mono text-zinc-500">Sharpen micro-textures & double resolution</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={editorUpscale}
                          onChange={(e) => setEditorUpscale(e.target.checked)}
                          className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* Primary Save & Export Action Button */}
                  <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2">
                    <button
                      type="button"
                      onClick={handleApplyImageEdit}
                      disabled={processingImageEdit}
                      className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-xs tracking-tight shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {processingImageEdit ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Rendering & Exporting...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Save & Export to Vault ({editorOutputFormat.toUpperCase()})</span>
                        </>
                      )}
                    </button>

                    {lastExportedResult && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Exported: {lastExportedResult.filename} ({lastExportedResult.format?.toUpperCase() || editorOutputFormat.toUpperCase()})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDirectDownload(lastExportedResult.url, lastExportedResult.filename)}
                          disabled={downloadingMaster}
                          className="w-full py-2 rounded-lg bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold text-xs font-heading flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
                        >
                          {downloadingMaster ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          <span>{downloadingMaster ? "Downloading..." : `Download ${lastExportedResult.filename}`}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEditorDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEditorDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEditorDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleEditorImageUpload(file);
                }}
                onClick={() => editorFileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-3xl aspect-[16/9] max-w-2xl mx-auto flex flex-col items-center justify-center gap-4 p-8 sm:p-12 transition-all cursor-pointer relative overflow-hidden",
                  isEditorDragOver
                    ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]"
                    : "border-zinc-300 dark:border-zinc-700/80 hover:border-emerald-500/60 bg-zinc-50/70 dark:bg-[#0d0d15]/70 shadow-lg"
                )}
              >
                {uploadingEditorImage ? (
                  <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                    <Loader2 className="h-9 w-9 animate-spin text-emerald-500" />
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-150"
                        style={{ width: `${editorUploadProgress}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Uploading from PC... {editorUploadProgress}%
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-sm">
                      <Upload className="h-7 w-7" />
                    </div>
                    <div className="text-center space-y-1.5 max-w-md">
                      <p className="text-base font-heading font-bold text-zinc-900 dark:text-white">
                        Drag & drop image here, or select an upload method
                      </p>
                      <p className="text-xs text-zinc-400 font-mono">
                        PNG, JPG, WEBP • AI Relighting, BG Removal, 4K Upscale & Color Grading
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => editorFileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload from PC</span>
                      </button>
                      <button
                        type="button"
                        onClick={openVaultPicker}
                        className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-zinc-800 dark:text-zinc-200 font-semibold text-xs border border-black/10 dark:border-white/10 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                      >
                        <FolderArchive className="w-4 h-4 text-violet-400" />
                        <span>Pick from Vault</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* State D1: Multi-Reference Images & Character Consistency Suite (Horizontal 2-Column Layout) */}
        {!loading && !loadingVariations && !result && !variationsResult && (studioMode === "image_variations" || referenceDrawerOpen || refImages.length > 0) && (
          <div className="w-full max-w-5xl mx-auto py-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#0e0e16] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl p-5 sm:p-7 shadow-xl space-y-5 text-left">
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-500/20">
                    <ImagePlus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-heading font-bold text-zinc-950 dark:text-white">
                        Image Variations & Style Directives
                      </h3>
                      {refImages.length > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                          {refImages.length} ATTACHED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-jakarta">
                      Reference images, character consistency locks, negative prompt exclusion aur advanced sampling settings.
                    </p>
                  </div>
                </div>

                {referenceDrawerOpen && (
                  <button
                    type="button"
                    onClick={() => setReferenceDrawerOpen(false)}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="Close Reference Panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 2-Column Horizontal Layout Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                {/* ── LEFT COLUMN: Reference Images & Character Consistency Locks ── */}
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/60 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase font-bold tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-violet-500" />
                      <span>Reference Images ({refImages.length})</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={openVaultPicker}
                        className="text-[11px] font-mono text-violet-600 dark:text-violet-400 hover:text-violet-500 flex items-center gap-1.5 cursor-pointer transition-colors px-2.5 py-1 rounded-lg border border-violet-500/20 bg-violet-500/10 hover:bg-violet-500/20"
                        title="Pick reference from Vault"
                      >
                        <FolderArchive className="w-3 h-3" />
                        <span>From Vault</span>
                      </button>
                      {refImages.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAllRefImages}
                          className="text-[11px] font-mono text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear All</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files?.length) {
                        handleMultiRefUpload(e.dataTransfer.files);
                      }
                    }}
                    onClick={() => multiRefFileInputRef.current?.click()}
                    className="rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-500/30 hover:border-violet-500 bg-violet-50/40 dark:bg-violet-500/[0.03] hover:bg-violet-50/70 dark:hover:bg-violet-500/[0.06] p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <input
                      ref={multiRefFileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.length) {
                          handleMultiRefUpload(e.target.files);
                        }
                        e.target.value = "";
                      }}
                    />
                    {uploadingMultiRef ? (
                      <Loader2 className="w-7 h-7 text-violet-600 animate-spin" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                        <Upload className="w-4 h-4" />
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-violet-700 dark:text-violet-300 font-heading">
                        {uploadingMultiRef ? `Uploading References... ${multiRefUploadProgress}%` : "Upload Image or Drag & Drop"}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        Supports JPG, PNG, WEBP - Up to 25MB
                      </p>
                    </div>
                  </div>

                  {/* Attached Thumbnails Carousel */}
                  {refImages.length > 0 && (
                    <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                        Attached Active References:
                      </span>
                      <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 custom-scrollbar">
                        {refImages.map((img, idx) => (
                          <div key={idx} className="relative group shrink-0">
                            <img
                              src={getMediaUrl(img.url)}
                              alt={img.name}
                              className="w-16 h-16 rounded-xl object-cover border-2 border-zinc-200 dark:border-zinc-700 shadow-sm"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRefImage(idx);
                              }}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 text-zinc-500 hover:text-rose-500 shadow-sm flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                              title="Remove image"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Character Consistency Locks */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#111118] border border-black/[0.06] dark:border-white/[0.08] space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-bold">
                          Character Consistency Locks
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const anyOn = lockFace || lockDress || lockJewelry || lockBackground;
                          const nextVal = !anyOn;
                          setLockFace(nextVal);
                          setLockDress(nextVal);
                          setLockJewelry(nextVal);
                          setLockBackground(nextVal);
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all cursor-pointer border shadow-xs select-none",
                          (lockFace || lockDress || lockJewelry || lockBackground)
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                            : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700"
                        )}
                      >
                        <span>{(lockFace || lockDress || lockJewelry || lockBackground) ? "ALL ON" : "ALL OFF"}</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <label className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lockFace}
                          onChange={(e) => setLockFace(e.target.checked)}
                          className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                        />
                        <span>Lock Face</span>
                      </label>
                      <label className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lockDress}
                          onChange={(e) => setLockDress(e.target.checked)}
                          className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                        />
                        <span>Lock Dress</span>
                      </label>
                      <label className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lockJewelry}
                          onChange={(e) => setLockJewelry(e.target.checked)}
                          className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                        />
                        <span>Lock Jewelry</span>
                      </label>
                      <label className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lockBackground}
                          onChange={(e) => setLockBackground(e.target.checked)}
                          className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                        />
                        <span>Lock Background</span>
                      </label>
                    </div>
                  </div>

                  {/* 💎 Jewellery Reference Prompt Suite */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-500/[0.04] border border-amber-500/25 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gem className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <span className="text-xs font-heading font-bold text-zinc-900 dark:text-white block">
                            Jewellery Reference Suite
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                            Pre-filled prompts for models, aesthetics & macro jewelry
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowJewellerySuite(!showJewellerySuite)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border shadow-xs select-none",
                          showJewellerySuite
                            ? "bg-amber-500 text-zinc-950 border-amber-500 font-extrabold"
                            : "bg-white dark:bg-zinc-800 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
                        )}
                      >
                        <Gem className="w-3 h-3" />
                        <span>{showJewellerySuite ? "Hide Suite" : "Open Suite"}</span>
                      </button>
                    </div>

                    {showJewellerySuite && (
                      <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <JewelleryPromptSuite
                          hasReferenceImage={refImages.length > 0 || Boolean(refImageUrl)}
                          onSelectPrompt={(text, ratio) => {
                            setPrompt(text);
                            if (ratio) setAspectRatio(ratio);
                            setLockJewelry(true);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* ── RIGHT COLUMN: Negative Prompt & Advanced Settings ── */}
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/60 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-4">
                  {/* Negative Prompt */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase font-bold tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-violet-500" />
                        <span>Negative Prompt (Exclude Elements)</span>
                      </span>
                      {negativePrompt && (
                        <button
                          type="button"
                          onClick={() => setNegativePrompt("")}
                          className="text-[11px] font-mono text-zinc-400 hover:text-rose-500 cursor-pointer transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="e.g. blurry, low quality, extra fingers, deformed face, bad anatomy, watermark..."
                      rows={3}
                      className="w-full bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] rounded-xl p-3 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 font-mono resize-none leading-relaxed shadow-xs"
                    />
                    {/* Quick Exclude Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {["blurry", "extra fingers", "watermark", "deformed face", "low quality"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (!negativePrompt.includes(tag)) {
                              setNegativePrompt((prev) => (prev ? `${prev}, ${tag}` : tag));
                            }
                          }}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-white dark:bg-zinc-800/80 hover:bg-violet-500/10 hover:text-violet-600 border border-black/[0.06] dark:border-white/[0.06] text-zinc-500 dark:text-zinc-400 transition-colors cursor-pointer"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#111118] p-3.5 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-zinc-700 dark:text-zinc-300 block">
                          Advanced Synthesis Parameters
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAdvancedInfo((p) => !p)}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-mono transition-all flex items-center gap-1 cursor-pointer select-none",
                            showAdvancedInfo
                              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30"
                              : "bg-zinc-100 dark:bg-white/[0.05] text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-black/[0.06] dark:border-white/[0.06]"
                          )}
                          title="Tap to see model compatibility details"
                        >
                          <Info className="w-3 h-3 text-emerald-500" />
                          <span>Model Support</span>
                        </button>
                      </div>
                    </div>

                    {showAdvancedInfo && (
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-[11px] space-y-1.5 transition-all">
                        <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          <span>Supported AI Models:</span>
                        </div>
                        <p className="text-[10.5px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                          • <strong>Applies directly to:</strong> Flux.1 (Schnell/Dev), Stable Diffusion 3.5, and Replicate diffusion backends.<br />
                          • <strong>Server-side managed:</strong> OpenAI (DALL-E 3) and Google Gemini calibrate guidance and denoising steps automatically on their server clusters.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                          <div className="flex items-center gap-1">
                            <span>CFG Guidance:</span>
                            <span className="group relative cursor-help inline-flex items-center">
                              <Info className="w-3 h-3 text-zinc-400 hover:text-emerald-500 transition-colors" />
                              <span className="pointer-events-none absolute bottom-full left-0 mb-1.5 hidden group-hover:block w-52 p-2 bg-zinc-900/95 backdrop-blur-md text-zinc-100 text-[10px] rounded-lg shadow-xl border border-zinc-700 z-50 font-sans normal-case leading-snug">
                                <strong className="text-emerald-400 block mb-0.5">CFG Scale (1-20):</strong> Controls how strictly the AI adheres to your prompt. <strong>7.0-8.5</strong> is optimal. Lower (3-5) gives creative freedom; higher (12+) forces prompt strictly.
                              </span>
                            </span>
                          </div>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{cfgScale}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          step="0.5"
                          value={cfgScale}
                          onChange={(e) => setCfgScale(Number(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                          <div className="flex items-center gap-1">
                            <span>Sampling Steps:</span>
                            <span className="group relative cursor-help inline-flex items-center">
                              <Info className="w-3 h-3 text-zinc-400 hover:text-emerald-500 transition-colors" />
                              <span className="pointer-events-none absolute bottom-full right-0 sm:left-0 mb-1.5 hidden group-hover:block w-52 p-2 bg-zinc-900/95 backdrop-blur-md text-zinc-100 text-[10px] rounded-lg shadow-xl border border-zinc-700 z-50 font-sans normal-case leading-snug">
                                <strong className="text-emerald-400 block mb-0.5">Sampling Steps (10-50):</strong> Denoising passes used to sculpt detail. Default <strong>30</strong> is balanced; <strong>40-50</strong> delivers finer micro-textures and sharp details.
                              </span>
                            </span>
                          </div>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{samplingSteps}</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="50"
                          value={samplingSteps}
                          onChange={(e) => setSamplingSteps(Number(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="pt-1">
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase text-zinc-400 font-semibold mb-1">
                        <div className="flex items-center gap-1">
                          <span>Seed (Optional)</span>
                          <span className="group relative cursor-help inline-flex items-center">
                            <Info className="w-3 h-3 text-zinc-400 hover:text-emerald-500 transition-colors" />
                            <span className="pointer-events-none absolute bottom-full left-0 mb-1.5 hidden group-hover:block w-56 p-2 bg-zinc-900/95 backdrop-blur-md text-zinc-100 text-[10px] rounded-lg shadow-xl border border-zinc-700 z-50 font-sans normal-case leading-snug">
                              <strong className="text-emerald-400 block mb-0.5">Random Seed:</strong> Numerical seed for reproducible noise. Identical seed + identical prompt reproduces the exact same image. Leave blank for random generation.
                            </span>
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-normal lowercase">leave blank for random</span>
                      </div>
                      <input
                        type="text"
                        value={seed}
                        onChange={(e) => setSeed(e.target.value)}
                        placeholder="Random seed (e.g. 42)..."
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Save as Preset Box */}
                  <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#111118] p-3 space-y-2 shadow-xs">
                    <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-zinc-800 dark:text-zinc-200">
                      <Bookmark className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Save as Preset</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        placeholder="Preset name (e.g. Cyberpunk Portrait)..."
                        className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!presetName.trim()) {
                            alert("Please enter a name for the preset.");
                            return;
                          }
                          try {
                            const newPreset = {
                              id: `preset_${Date.now()}`,
                              name: presetName.trim(),
                              prompt,
                              negativePrompt,
                              model,
                              aspectRatio,
                              quality,
                              resolution,
                              lens,
                              aperture,
                              lighting,
                              filmStock,
                              cfgScale,
                              samplingSteps,
                              createdAt: new Date().toISOString(),
                            };
                            const existing = JSON.parse(localStorage.getItem("omnistudio_image_presets") || "[]");
                            existing.push(newPreset);
                            localStorage.setItem("omnistudio_image_presets", JSON.stringify(existing));
                            alert(`Preset "${presetName.trim()}" saved successfully to your Local Workspace!`);
                            setPresetName("");
                          } catch (_) {
                            alert("Failed to save preset to local workspace.");
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-mono text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* State D: Idle Showcase Hero (only shown if not in variations and no references attached) */}
        {!loading && !loadingVariations && !result && !variationsResult && studioMode !== "image_editor" && studioMode !== "image_variations" && !referenceDrawerOpen && refImages.length === 0 && (
          <div className="w-full flex flex-col items-center justify-center text-center space-y-6 py-6 animate-in fade-in duration-300">
            {/* Visual Overlapping Gallery Cards */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 py-3 overflow-hidden max-w-md sm:max-w-xl mx-auto">
              <div className="w-24 sm:w-28 h-36 sm:h-44 rounded-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06] shadow-sm transform -rotate-6 transition-transform hover:rotate-0 hover:scale-[1.02]">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
                  alt="Fashion Portrait"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-24 sm:w-28 h-36 sm:h-44 rounded-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06] shadow-md transform -translate-y-2 hover:scale-[1.02] transition-transform">
                <img
                  src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80"
                  alt="Sculpture Art"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-24 sm:w-28 h-36 sm:h-44 rounded-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06] shadow-sm transform rotate-6 transition-transform hover:rotate-0 hover:scale-[1.02]">
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
                <span className="text-violet-600 dark:text-violet-400 underline decoration-violet-500/30">
                  {activeModel.label}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-jakarta leading-relaxed">
                Describe a character, mood, or style — and watch it come to life with studio-grade lighting and precision optics.
              </p>
            </div>

            {/* Quick Inspiration Prompt Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl pt-2">
              {INSPIRATION_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(item.prompt)}
                  className="flex items-center px-3.5 py-1.5 rounded-full bg-white dark:bg-[#111118] hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-300 border border-black/[0.06] dark:border-white/[0.06] hover:border-violet-200 dark:hover:border-violet-500/30 text-xs font-jakarta text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer font-medium shadow-sm"
                >
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Outside-click backdrop to dismiss any open dock popover */}
      {(modelPopoverOpen || ratioPopoverOpen || qualityPopoverOpen || resolutionPopoverOpen || opticsPopoverOpen) && (
        <div className="fixed inset-0 z-30 bg-black/10 dark:bg-black/25 backdrop-blur-[0.5px]" onClick={closeAllPopovers} />
      )}

      {/* Floating Bottom Studio Dock */}
      {promptDockCollapsed ? (
        <div
          onClick={() => setPromptDockCollapsed(false)}
          className={cn(
            "fixed bottom-6 right-0 mx-auto z-40 w-[96%] max-w-5xl xl:max-w-6xl bg-white/95 dark:bg-[#111118]/95 backdrop-blur-2xl border border-black/[0.1] dark:border-white/[0.1] rounded-full shadow-xl px-5 py-2.5 flex items-center justify-between cursor-pointer hover:border-emerald-500/50 transition-all duration-200 group",
            isSidebarCollapsed ? "left-0 lg:left-16" : "left-0 lg:left-64"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono font-bold text-zinc-900 dark:text-white truncate">
              {studioMode === "image_editor" ? "Precision Image Studio Canvas Active" : "Prompt Dock Minimized"}
            </span>
            {prompt.trim() && (
              <span className="text-[11px] font-mono text-zinc-400 truncate hidden sm:inline">
                • &ldquo;{prompt.slice(0, 45)}...&rdquo;
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPromptDockCollapsed(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/[0.08] text-xs font-mono text-zinc-700 dark:text-zinc-300 group-hover:bg-emerald-500 group-hover:text-white transition-colors cursor-pointer"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Expand Prompt Bar</span>
          </button>
        </div>
      ) : (
        <div
          ref={dockRef}
          data-lenis-prevent="true"
          className={cn(
            "fixed bottom-6 right-0 mx-auto z-40 w-[96%] max-w-5xl xl:max-w-6xl bg-white/90 dark:bg-[#111118]/90 backdrop-blur-2xl border border-black/[0.1] dark:border-white/[0.1] rounded-2xl shadow-xl p-3 space-y-2.5 transition-all duration-200 pointer-events-auto glass-dock",
            isSidebarCollapsed ? "left-0 lg:left-16" : "left-0 lg:left-64",
            (loading || loadingVariations) && "lightning-border-active ring-2 ring-emerald-500/40"
          )}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.06] dark:border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider flex items-center gap-1.5">
              {(loading || loadingVariations) && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
              <span>{loading || loadingVariations ? "Active Diffusion Synthesis in Progress..." : studioMode === "image_editor" ? "Precision Image Studio Canvas" : studioMode === "image_variations" ? "Image Variations Studio" : "Diffusion Prompt & Model Dock"}</span>
            </span>
            <button
              type="button"
              onClick={() => setPromptDockCollapsed(true)}
              className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-black dark:hover:text-white cursor-pointer transition-colors px-2 py-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
              title="Collapse Prompt Bar to view full canvas"
            >
              <span>Collapse Bar</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          {/* Prompt Engineer 6 Quick-Modifier Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1 shrink-0 font-bold">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Prompt Engineer:
            </span>
            {[
              { label: "More Realistic", style: "more_realistic" },
              { label: "More Cinematic", style: "more_cinematic" },
              { label: "More Luxury", style: "more_luxury" },
              { label: "More Fashion", style: "more_fashion" },
              { label: "More Commercial", style: "more_commercial" },
              { label: "More Viral", style: "more_viral" },
            ].map((btn) => (
              <button
                key={btn.style}
                type="button"
                onClick={() => handleApplyPromptModifier(btn.style)}
                disabled={enhancingPrompt}
                className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-100 hover:bg-indigo-500/10 dark:bg-white/[0.05] dark:hover:bg-indigo-500/10 border border-zinc-200/80 dark:border-white/10 hover:border-indigo-500/40 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span>{btn.label}</span>
              </button>
            ))}

            <div className="shrink-0 ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setApplyBrandKit((prev) => !prev)}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-mono font-bold border transition-all flex items-center gap-1.5 cursor-pointer select-none",
                  applyBrandKit
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-xs ring-2 ring-emerald-500/20"
                    : "bg-zinc-100 dark:bg-white/[0.05] text-zinc-500 dark:text-zinc-400 border-black/[0.08] dark:border-white/[0.08] hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
                title="Tap to toggle Brand Kit injection ON / OFF (Default: OFF)"
              >
                <Palette className={cn("w-3 h-3 transition-colors", applyBrandKit ? "text-emerald-500" : "text-zinc-400")} />
                <span>Brand Kit</span>
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    applyBrandKit ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                  )}
                />
              </button>

              <button
                type="button"
                onClick={() => setBrandKitModalOpen(true)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Configure Brand Guidelines & Palette"
              >
                <Sliders className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Row 1: Professional Studio Prompt Input Bar */}
          <div className={cn(
            "relative flex flex-col rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border transition-all p-2.5 space-y-1.5",
            enhancingPrompt
              ? "border-violet-500/60 ring-2 ring-violet-500/30 shadow-[0_0_22px_rgba(139,92,246,0.25)] dark:bg-violet-950/15"
              : "border-black/[0.08] dark:border-white/[0.08] focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20"
          )}>
            {/* Embedded Badged Labels for Tagged References (INSIDE PROMPT BOX) */}
            {refImages.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-black/[0.06] dark:border-white/[0.06] w-full">
                <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider mr-1">
                  <AtSign className="w-3 h-3 text-emerald-500" />
                  <span>Tagged ({refImages.length}):</span>
                </div>
                {refImages.map((img, idx) => {
                  const tagName = (img.name || `ref_${idx + 1}`).replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-medium shadow-xs hover:bg-emerald-500/20 transition-all select-none animate-in fade-in zoom-in-95 duration-150"
                    >
                      <img
                        src={getMediaUrl(img.url)}
                        alt={img.name}
                        className="w-5 h-5 rounded-full object-cover border border-emerald-500/40 shrink-0"
                      />
                      <span className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400">@{tagName}</span>
                      <span className="text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
                        IMG
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRefImage(idx)}
                        className="hover:text-rose-500 hover:bg-rose-500/10 rounded-full p-0.5 text-zinc-400 transition-colors cursor-pointer ml-0.5"
                        title={`Remove @${tagName}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  onClick={() => multiRefFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 text-zinc-400 hover:text-emerald-500 text-[10px] font-mono transition-colors cursor-pointer"
                  title="Tag more reference images"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tag More</span>
                </button>
              </div>
            )}

            <div className="relative w-full flex items-start">
              {/* @ Mention Autocomplete Popover with Vault Assets & Direct Device Upload */}
              <MentionReferencePopover
                isOpen={mentionMenuOpen}
                query={mentionQuery}
                onClose={() => setMentionMenuOpen(false)}
                onSelect={handleSelectMention}
                onUploadClick={() => multiRefFileInputRef.current?.click()}
                currentRefs={refImages.map((img, i) => ({
                  id: `current_ref_${i}`,
                  url: img.url,
                  filename: img.name || `Ref ${i + 1}`,
                  tag: (img.name || `ref_${i + 1}`).replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase(),
                  type: "image",
                  badge: "CURRENT REF",
                  source: "current",
                }))}
                isUploading={uploadingMultiRef}
              />

              <textarea
                ref={promptTextareaRef}
                value={prompt}
                onChange={(e) => {
                  const val = e.target.value;
                  setPrompt(val);

                  const cursorPos = e.target.selectionStart;
                  const textBefore = val.substring(0, cursorPos);
                  const match = textBefore.match(/(?:^|\s)@([a-zA-Z0-9_\.\-]*)$/);

                  if (match) {
                    setMentionQuery(match[1].toLowerCase());
                    setMentionMenuOpen(true);
                    const startIdx = cursorPos - match[1].length - 1;
                    setMentionAnchor({ start: startIdx, end: cursorPos });
                  } else {
                    setMentionMenuOpen(false);
                    setMentionAnchor(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && mentionMenuOpen) {
                    setMentionMenuOpen(false);
                    return;
                  }
                  if (e.key === "Enter" && !e.shiftKey && !mentionMenuOpen) {
                    e.preventDefault();
                    requestImageConfirm();
                  }
                }}
                placeholder={
                  studioMode === "text_to_image"
                    ? "Describe what you want to create (type @ to tag from Vault or upload)..."
                    : "Describe modifications or style directives (type @ to tag from Vault or upload)..."
                }
                className="w-full bg-transparent border-none px-1 py-1 text-xs sm:text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none font-jakarta resize-none pr-16 min-h-[44px] max-h-36 leading-relaxed overflow-y-auto"
              />

          {/* Prompt Bar Actions */}
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
              onClick={enhancePromptText}
              disabled={!prompt.trim() || enhancingPrompt}
              className={cn(
                "relative p-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer overflow-hidden select-none",
                enhancingPrompt
                  ? "magic-pulse-active bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 text-white border-violet-400/80 shadow-[0_0_15px_rgba(168,85,247,0.6)]"
                  : "bg-white/80 dark:bg-white/[0.04] text-zinc-500 hover:text-violet-600 dark:hover:text-violet-400 border-black/[0.08] dark:border-white/[0.08] hover:border-violet-500/30 disabled:opacity-30 hover:shadow-xs"
              )}
              title="Improve Prompt with AI Copilot (GPT-4o-mini & Gemini)"
            >
              <Wand2 className={cn("w-3.5 h-3.5 transition-all duration-300", enhancingPrompt ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.95)] animate-pulse text-white" : "")} />
            </button>

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

            <button
              type="button"
              onClick={() => setReferenceDrawerOpen((p) => !p)}
              className={cn(
                "p-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer flex items-center gap-1",
                referenceDrawerOpen || refImages.length > 0
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 shadow-sm"
                  : "bg-white/80 dark:bg-white/[0.04] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 border-black/[0.08] dark:border-white/[0.08]"
              )}
              title="Toggle Reference Images & Character Consistency"
            >
              <ImagePlus className="w-3.5 h-3.5 text-emerald-500" />
              {refImages.length > 0 && <span className="text-[10px] font-bold">{refImages.length}</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowJewellerySuite((p) => !p);
                setStudioMode("image_variations");
              }}
              className={cn(
                "p-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer flex items-center gap-1",
                showJewellerySuite
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 shadow-sm"
                  : "bg-white/80 dark:bg-white/[0.04] text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 border-black/[0.08] dark:border-white/[0.08]"
              )}
              title="Toggle Jewellery Prompt Suite"
            >
              <Gem className="w-3.5 h-3.5 text-amber-500" />
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
              placeholder="Negative prompt (e.g. blurry, extra fingers, low quality, artifacts, watermark)..."
              className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none font-mono focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/30 transition-all"
            />
          </div>
        )}

        {/* Reference Image Bar (In Variations Mode) */}
        {studioMode === "image_variations" && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">REFERENCE IMAGE:</span>
              {refImageUrl ? (
                <div className="flex items-center gap-2">
                  <img src={getMediaUrl(refImageUrl)} alt="Ref" className="w-6 h-6 rounded object-cover border border-white/20" />
                  <span className="text-xs font-mono text-zinc-800 dark:text-zinc-200 truncate max-w-[140px]">
                    {refImageUrl.split("/").pop()}
                  </span>
                  <button onClick={() => setRefImageUrl("")} className="text-zinc-400 hover:text-red-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-zinc-400 italic font-jakarta">No image selected</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openVaultPicker}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#16161f] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-200 dark:hover:border-violet-500/30 flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
              >
                <FolderArchive className="w-3 h-3" />
                <span>Vault</span>
              </button>
              <label className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#16161f] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-200 dark:hover:border-violet-500/30 flex items-center gap-1 cursor-pointer transition-colors shadow-sm">
                {uploadingRef ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                    <span>{refUploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3 h-3" />
                    <span>Upload</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingRef} onChange={(e) => e.target.files?.[0] && handleRefFileUpload(e.target.files[0])} />
              </label>
            </div>
          </div>
        )}

        {/* Row 2: Bottom Control Pills Strip + Generate Button */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 mt-1.5 border-t border-black/[0.06] dark:border-white/[0.06]">
          {/* Left Controls Group */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* 1. Model Selector Pill */}
            <div className="relative">
              <button
                type="button"
                data-popover-trigger="true"
                onClick={() => {
                  const next = !modelPopoverOpen;
                  closeAllPopovers();
                  setModelPopoverOpen(next);
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
                <ChevronUp className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform", modelPopoverOpen && "rotate-180")} />
              </button>

              {/* Model Selector Upward Popover */}
              {modelPopoverOpen && (
                <div
                  data-popover-content="true"
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
                      placeholder="Search models..."
                      className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none font-jakarta focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                    />
                  </div>

                  <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase px-1 font-semibold flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-violet-500" />
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
                      const isInactive = m.active === false;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          disabled={isInactive}
                          onClick={() => {
                            if (!isInactive) {
                              setModel(m.value);
                              setModelPopoverOpen(false);
                            }
                          }}
                          className={cn(
                            "w-full flex items-start justify-between p-2.5 rounded-xl text-left transition-all font-jakarta",
                            isInactive ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                            isSelected && !isInactive
                              ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/20"
                              : (!isInactive && "hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 border border-transparent")
                          )}
                        >
                          <div className="space-y-0.5 min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold font-heading">{m.label}</span>
                              {isInactive ? (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
                                  INACTIVE
                                </span>
                              ) : m.badge && (
                                <span
                                  className={cn(
                                    "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                                    m.badge === "PREMIUM"
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                      : m.badge === "NEW"
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                                      : "bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300"
                                  )}
                                >
                                  {m.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-1">
                              {isInactive ? "API Key required in Settings to activate" : m.description}
                            </p>
                          </div>
                          {isSelected && !isInactive && <Check className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-1" />}
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
                data-popover-trigger="true"
                onClick={() => {
                  const next = !ratioPopoverOpen;
                  closeAllPopovers();
                  setRatioPopoverOpen(next);
                }}
                className={cn(
                  "flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm min-w-[68px]",
                  ratioPopoverOpen
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold"
                    : "bg-white dark:bg-[#16161f] hover:bg-zinc-50 dark:hover:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] text-zinc-800 dark:text-zinc-200"
                )}
                title="Select Aspect Ratio"
              >
                <Maximize2 className={cn("w-3 h-3", ratioPopoverOpen ? "text-emerald-500" : "text-zinc-400")} />
                <span>{aspectRatio}</span>
              </button>

              {ratioPopoverOpen && (
                <div
                  data-popover-content="true"
                  className="absolute bottom-full left-0 mb-2 w-56 rounded-2xl bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-2 z-50 space-y-1 animate-slide-up"
                >
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
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-colors cursor-pointer border",
                        aspectRatio === r.id
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20 font-bold"
                          : "bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-zinc-700 dark:text-zinc-300"
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
                data-popover-trigger="true"
                onClick={() => {
                  const next = !qualityPopoverOpen;
                  closeAllPopovers();
                  setQualityPopoverOpen(next);
                }}
                className={cn(
                  "flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm min-w-[84px]",
                  qualityPopoverOpen
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold"
                    : "bg-white dark:bg-[#16161f] hover:bg-zinc-50 dark:hover:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] text-zinc-800 dark:text-zinc-200"
                )}
                title="Select Quality Profile"
              >
                <Sun className={cn("w-3 h-3", qualityPopoverOpen ? "text-emerald-500" : "text-zinc-400")} />
                <span className="capitalize">{quality === "ultra" ? "Master 8K" : quality === "hd" ? "High" : "Standard"}</span>
              </button>

              {qualityPopoverOpen && (
                <div
                  data-popover-content="true"
                  className="absolute bottom-full left-0 mb-2 w-52 rounded-2xl bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-2 z-50 space-y-1 animate-slide-up"
                >
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
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-colors cursor-pointer border",
                        quality === q.id
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20 font-bold"
                          : "bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-zinc-700 dark:text-zinc-300"
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
                data-popover-trigger="true"
                onClick={() => {
                  const next = !resolutionPopoverOpen;
                  closeAllPopovers();
                  setResolutionPopoverOpen(next);
                }}
                className={cn(
                  "flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm min-w-[76px]",
                  resolutionPopoverOpen
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold"
                    : "bg-white dark:bg-[#16161f] hover:bg-zinc-50 dark:hover:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] text-zinc-800 dark:text-zinc-200"
                )}
                title="Select Resolution"
              >
                <Gauge className={cn("w-3 h-3", resolutionPopoverOpen ? "text-emerald-500" : "text-zinc-400")} />
                <span className="uppercase">{resolution}</span>
              </button>

              {resolutionPopoverOpen && (
                <div
                  data-popover-content="true"
                  className="absolute bottom-full left-0 mb-2 w-52 rounded-2xl bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-2 z-50 space-y-1 animate-slide-up"
                >
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
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-colors cursor-pointer border",
                        resolution === res.id
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20 font-bold"
                          : "bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-zinc-700 dark:text-zinc-300"
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
                data-popover-trigger="true"
                onClick={() => {
                  const next = !opticsPopoverOpen;
                  closeAllPopovers();
                  setOpticsPopoverOpen(next);
                }}
                className={cn(
                  "hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm",
                  opticsPopoverOpen
                    ? "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-300"
                    : "bg-white dark:bg-[#16161f] hover:bg-zinc-50 dark:hover:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] text-zinc-800 dark:text-zinc-200"
                )}
                title="Camera Optics & Lens"
              >
                <Camera className={cn("w-3 h-3", opticsPopoverOpen ? "text-violet-500" : "text-zinc-400")} />
                <span>{lens.split(" ")[0] || "Optics"}</span>
              </button>

              {opticsPopoverOpen && (
                <div
                  data-popover-content="true"
                  className="absolute bottom-full left-0 mb-2 w-72 rounded-2xl bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-3 z-50 space-y-2 font-mono text-xs animate-slide-up"
                >
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
                            ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/20 font-bold"
                            : "border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.04]"
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
                            ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/20 font-bold"
                            : "border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.04]"
                        )}
                      >
                        {ap.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 6. Batch Stepper */}
            <div className="flex items-center bg-white dark:bg-[#16161f] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-2 py-1 text-xs font-mono text-zinc-800 dark:text-zinc-200 shadow-sm">
              <button
                type="button"
                onClick={handleBatchDecrement}
                className="px-1.5 py-0.5 hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer transition-colors"
                title="Decrease Batch"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="px-2 font-bold tracking-widest">{imageCount}/4</span>
              <button
                type="button"
                onClick={handleBatchIncrement}
                className="px-1.5 py-0.5 hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer transition-colors"
                title="Increase Batch"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Right Generate CTA Action Button */}
          <button
            type="button"
            onClick={requestImageConfirm}
            disabled={loading || loadingVariations || (!prompt.trim() && studioMode === "text_to_image")}
            className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 dark:disabled:text-zinc-500 font-heading font-extrabold text-xs sm:text-sm tracking-tight transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap shrink-0"
          >
            {loading || loadingVariations ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <span>Generate</span>
                <span className="font-mono text-xs font-semibold opacity-90 border-l border-white/20 pl-2">
                  ₹{currentTotalSpendInr.toFixed(2)} (${currentTotalSpendUsd.toFixed(3)})
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    )}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#111118] border border-black/[0.1] dark:border-white/[0.1] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-900 dark:text-white">Select From Vault</span>
              <button onClick={() => setVaultOpen(false)} className="text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-3 custom-scrollbar">
              {vaultImages.length === 0 ? (
                <div className="col-span-full py-12 text-center space-y-2">
                  <FolderArchive className="w-8 h-8 text-zinc-400 mx-auto" />
                  <p className="text-xs text-zinc-400 font-mono">No images found in your Vault.</p>
                </div>
              ) : (
                vaultImages.map((img, i) => {
                  const itemUrl = typeof img === "string" ? img : (img.url || (img.filename ? `/outputs/images/${img.filename}` : ""));
                  const itemName = typeof img === "string" ? img.split("/").pop() || "image.png" : (img.filename || "image.png");
                  if (!itemUrl) return null;

                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (studioMode === "image_editor") {
                          setEditorImageUrl(itemUrl);
                          setOriginalEditorImageUrl(itemUrl);
                          setPromptDockCollapsed(true);
                          window.dispatchEvent(new CustomEvent("omnistudio:collapse-sidebar"));
                        } else {
                          setRefImageUrl(itemUrl);
                          setRefImages((prev) => {
                            if (prev.some((p) => p.url === itemUrl)) return prev;
                            return [...prev, { url: itemUrl, name: itemName }];
                          });
                        }
                        setVaultOpen(false);
                      }}
                      className="rounded-xl overflow-hidden aspect-square border border-black/[0.08] dark:border-white/[0.08] hover:border-violet-500/50 cursor-pointer transition-all hover:scale-[1.02] relative group bg-black/5 dark:bg-white/5"
                    >
                      <img src={getMediaUrl(itemUrl)} alt={itemName} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[10px] text-white font-mono truncate">{itemName}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* How It Works Studio Guide Modal */}
      <HowItWorksModal
        isOpen={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
      />

      {/* Brand Kit Modal */}
      <BrandKitModal
        isOpen={brandKitModalOpen}
        onClose={() => setBrandKitModalOpen(false)}
      />

      {/* Social Media Repurposer Modal */}
      <SocialRepurposerModal
        isOpen={socialModalOpen}
        onClose={() => setSocialModalOpen(false)}
        mediaUrl={socialMediaUrl || result?.url || editorImageUrl || ""}
        mediaType="image"
        prompt={prompt}
      />
    </div>
  );
}
