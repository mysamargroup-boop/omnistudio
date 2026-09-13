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
  UserX,
  UserPlus,
  Scissors,
  RotateCcw,
  AlertCircle,
  Palette,
  Lock,
  Shirt,
  Users,
  Paperclip,
  AtSign,
  Tag,
  Music,
  Bookmark,
  ShieldAlert,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { loadStudioDraft, saveStudioDraftDebounced } from "@/lib/draftStorage";
import GenerationConfirmModal, { GenerationConfirmDetails } from "@/components/ui/GenerationConfirmModal";
import LiveProgressBar, { LogEntry } from "@/components/ui/LiveProgressBar";
import HowItWorksModal from "@/components/ui/HowItWorksModal";
import LazyImage from "@/components/ui/LazyImage";
import CharacterStudioModal, { CharacterData, ARCHETYPES } from "@/components/video/CharacterStudioModal";
import { getActiveCharacter, getStoredCharacters, setActiveCharacter as setStoredActiveCharacter, fetchActiveCharacterAsync } from "@/lib/characters";
import MentionReferencePopover, { MentionCandidate } from "@/components/studio/MentionReferencePopover";
import VideoEditorModal from "@/components/video/VideoEditorModal";
import PrecisionVideoEditor from "@/components/video/PrecisionVideoEditor";
import BrandKitModal from "@/components/brand/BrandKitModal";
import AudioMusicLibraryModal from "@/components/audio/AudioMusicLibraryModal";
import PromptVaultModal from "@/components/prompt/PromptVaultModal";

type VideoMode = "first_frame" | "first_to_last_frame" | "multi_frame" | "text_to_video" | "motion_transfer" | "video_editor";

interface VideoModelOption {
  value: string;
  label: string;
  description: string;
  badge?: string;
  category?: string;
  active?: boolean;
}

export interface ReferenceAsset {
  id: string;
  url: string;
  filename: string;
  tag: string;
  type: "image" | "video";
}

const VIDEO_MODELS: VideoModelOption[] = [
  {
    value: "google_veo",
    label: "Google Veo 3.1 (DeepMind)",
    description: "Cinema-grade 4K generative video by Google DeepMind",
    badge: "ACTIVE",
    category: "Featured Cloud",
  },
  {
    value: "ffmpeg_local",
    label: "Local Ken Burns / Morph (FFmpeg)",
    description: "Fast Local FFmpeg (100% Free)",
    badge: "FREE LOCAL",
    category: "Hardware Engine",
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

const DURATION_PRESETS = [4, 5, 8, 10, 12, 16, 20, 30, 60];

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
  const [videoDockCollapsed, setVideoDockCollapsed] = useState(false);

  // Frames State
  const [startImage, setStartImage] = useState(searchParams?.get("image") || "");
  const [endImage, setEndImage] = useState("");
  // Multi-Frame Sequence State (2 to 8 keyframes)
  const [keyframeImages, setKeyframeImages] = useState<string[]>([]);

  // Motion Transfer State
  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Character Lock State (Sidebar & Consistent Persona)
  const [characterModalOpen, setCharacterModalOpen] = useState(false);
  const [activeCharacter, setActiveCharacter] = useState<CharacterData | null>(null);
  const [characterLockActive, setCharacterLockActive] = useState<boolean>(true);
  const [customCharName, setCustomCharName] = useState("");
  const [customCharPrompt, setCustomCharPrompt] = useState("");
  const [customCharImage, setCustomCharImage] = useState("");
  const [uploadingCharImage, setUploadingCharImage] = useState(false);
  const charFileInputRef = useRef<HTMLInputElement>(null);

  // Character Consistency Specific Toggles (All ON by default for maximum fidelity)
  const [charSelectTab, setCharSelectTab] = useState<"presets" | "custom">("presets");
  const [lockFace, setLockFace] = useState<boolean>(true);
  const [lockDress, setLockDress] = useState<boolean>(true);
  const [lockJewelry, setLockJewelry] = useState<boolean>(true);
  const [lockBackground, setLockBackground] = useState<boolean>(true);
  const [lockHair, setLockHair] = useState<boolean>(true);
  const [lockLighting, setLockLighting] = useState<boolean>(true);
  const [lockStyle, setLockStyle] = useState<boolean>(true);
  const [lockPhysique, setLockPhysique] = useState<boolean>(true);
  const [customLocks, setCustomLocks] = useState<string[]>([]);
  const [newCustomLockInput, setNewCustomLockInput] = useState<string>("");
  const [vaultSearch, setVaultSearch] = useState<string>("");

  // Batch / Multi-Video Generation Variations (1x, 2x, 4x)
  const [batchCount, setBatchCount] = useState<number>(1);

  // Multi-Image / Reference Asset Tray & @ Mention Tagging
  const [referenceAssets, setReferenceAssets] = useState<ReferenceAsset[]>([]);
  const [uploadingRefs, setUploadingRefs] = useState<boolean>(false);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  // @ Mention Autocomplete States
  const [mentionMenuOpen, setMentionMenuOpen] = useState<boolean>(false);
  const [mentionQuery, setMentionQuery] = useState<string>("");
  const [mentionIndex, setMentionIndex] = useState<number>(0);
  const [mentionAnchor, setMentionAnchor] = useState<{ start: number; end: number } | null>(null);
  const mentionMenuRef = useRef<HTMLDivElement>(null);

  // Render Queue (Midjourney-Style Jobs)
  const [sidebarTab, setSidebarTab] = useState<"settings" | "queue">("settings");
  const [queueTab, setQueueTab] = useState<"rendering" | "completed" | "failed" | "cancelled">("completed");
  const [renderJobs, setRenderJobs] = useState<Array<{
    id: string;
    prompt: string;
    model: string;
    motion: string;
    duration: number;
    aspectRatio: string;
    status: "rendering" | "completed" | "failed" | "cancelled";
    progress?: number;
    stage?: string;
    createdAt: number;
    completedAt?: number;
    videoUrl?: string;
    thumbnailUrl?: string;
    error?: string;
  }>>([]);
  const activeJobIdRef = useRef<string | null>(null);

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
  const [brandKitModalOpen, setBrandKitModalOpen] = useState(false);
  const [applyBrandKit, setApplyBrandKit] = useState(false);
  const [audioLibraryOpen, setAudioLibraryOpen] = useState(false);
  const [selectedBgmTrack, setSelectedBgmTrack] = useState<{
    id: string;
    title: string;
    url: string;
    category: "bgm" | "sfx";
    volume: number;
    loop: boolean;
  } | null>(null);
  const [promptVaultOpen, setPromptVaultOpen] = useState(false);

  // Video Settings (Camera motion defaults to "zoom_in" - Cinematic Dolly Push)
  const [model, setModel] = useState("google_veo");
  const [motion, setMotion] = useState("zoom_in");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState(4);
  const [fps, setFps] = useState(30);
  const [resolution, setResolution] = useState("1080p");
  const [quality, setQuality] = useState("balanced");
  const [motionIntensity, setMotionIntensity] = useState(1.0);
  const [loop, setLoop] = useState(false);
  const [seed, setSeed] = useState("");
  const [modelSearchQuery, setModelSearchQuery] = useState("");

  // Auto-resize prompt textarea
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Hydration ref for localStorage persistence
  const hasHydrated = useRef(false);

  // Restore draft from localStorage on mount (URL query params take precedence)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const draft = loadStudioDraft("video_studio", {
        mode: "first_frame" as VideoMode,
        prompt: "",
        negativePrompt: "",
        model: "google_veo",
        motion: "zoom_in",
        aspectRatio: "16:9",
        duration: 4,
        fps: 30,
        resolution: "1080p",
        quality: "balanced",
        motionIntensity: 1.0,
        batchCount: 1,
        characterLockActive: true,
        lockFace: true,
        lockDress: true,
        lockJewelry: true,
        lockBackground: true,
        lockHair: true,
        lockLighting: true,
        lockStyle: true,
        lockPhysique: true,
        startImage: "",
      });

      const urlPrompt = searchParams?.get("prompt");
      if (urlPrompt && urlPrompt.trim()) {
        setPrompt(urlPrompt.trim());
      } else if (draft.prompt) {
        setPrompt(draft.prompt);
      }

      const urlImage = searchParams?.get("image");
      if (urlImage && urlImage.trim()) {
        setStartImage(urlImage.trim());
      } else if (draft.startImage) {
        setStartImage(draft.startImage);
      }

      if (draft.mode) setMode(draft.mode);
      if (draft.negativePrompt) setNegativePrompt(draft.negativePrompt);
      if (draft.model) setModel(draft.model);
      if (draft.motion) setMotion(draft.motion);
      if (draft.aspectRatio) setAspectRatio(draft.aspectRatio);
      if (draft.duration) setDuration(draft.duration);
      if (draft.fps) setFps(draft.fps);
      if (draft.resolution) setResolution(draft.resolution);
      if (draft.quality) setQuality(draft.quality);
      if (typeof draft.motionIntensity === "number") setMotionIntensity(draft.motionIntensity);
      if (typeof draft.batchCount === "number") setBatchCount(draft.batchCount);
      if (typeof draft.characterLockActive === "boolean") setCharacterLockActive(draft.characterLockActive);
      if (typeof draft.lockFace === "boolean") setLockFace(draft.lockFace);
      if (typeof draft.lockDress === "boolean") setLockDress(draft.lockDress);
      if (typeof draft.lockJewelry === "boolean") setLockJewelry(draft.lockJewelry);
      if (typeof draft.lockBackground === "boolean") setLockBackground(draft.lockBackground);
      if (typeof draft.lockHair === "boolean") setLockHair(draft.lockHair);
      if (typeof draft.lockLighting === "boolean") setLockLighting(draft.lockLighting);
      if (typeof draft.lockStyle === "boolean") setLockStyle(draft.lockStyle);
      if (typeof draft.lockPhysique === "boolean") setLockPhysique(draft.lockPhysique);

      hasHydrated.current = true;
    }
  }, [searchParams]);

  // Persist draft to localStorage whenever settings or prompt change
  useEffect(() => {
    if (!hasHydrated.current) return;
    saveStudioDraftDebounced("video_studio", {
      mode,
      prompt,
      negativePrompt,
      model,
      motion,
      aspectRatio,
      duration,
      fps,
      resolution,
      quality,
      motionIntensity,
      batchCount,
      characterLockActive,
      lockFace,
      lockDress,
      lockJewelry,
      lockBackground,
      lockHair,
      lockLighting,
      lockStyle,
      lockPhysique,
      startImage,
    });
  }, [
    mode,
    prompt,
    negativePrompt,
    model,
    motion,
    aspectRatio,
    duration,
    fps,
    resolution,
    quality,
    motionIntensity,
    batchCount,
    characterLockActive,
    lockFace,
    lockDress,
    lockJewelry,
    lockBackground,
    lockHair,
    lockLighting,
    lockStyle,
    lockPhysique,
    startImage,
  ]);

  const persistJobs = (jobs: typeof renderJobs) => {
    setRenderJobs(jobs);
    try {
      localStorage.setItem("omnistudio_video_render_queue", JSON.stringify(jobs.slice(0, 50)));
    } catch {}
  };

  const abortActiveJob = (jobId: string) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setLoading(false);
    const updated = renderJobs.map((j) =>
      j.id === jobId ? { ...j, status: "cancelled" as const, stage: "Cancelled by user" } : j
    );
    persistJobs(updated);
    setStatusMessage("Video render cancelled by user.");
  };

  const retryJob = (job: any) => {
    setPrompt(job.prompt);
    setSidebarTab("queue");
    setQueueTab("rendering");
    setTimeout(() => {
      generate();
    }, 100);
  };

  const deleteJob = (jobId: string) => {
    persistJobs(renderJobs.filter((j) => j.id !== jobId));
  };

  const clearNonRenderingJobs = () => {
    persistJobs(renderJobs.filter((j) => j.status === "rendering"));
  };

  useEffect(() => {
    if (promptTextareaRef.current) {
      promptTextareaRef.current.style.height = "auto";
      const scrollH = promptTextareaRef.current.scrollHeight;
      promptTextareaRef.current.style.height = `${Math.min(Math.max(scrollH, 44), 130)}px`;
    }
  }, [prompt]);


  // Inline Bottom Dock Popover States
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);
  const [ratioPopoverOpen, setRatioPopoverOpen] = useState(false);
  const [motionPopoverOpen, setMotionPopoverOpen] = useState(false);
  const [durationPopoverOpen, setDurationPopoverOpen] = useState(false);
  const [qualityPopoverOpen, setQualityPopoverOpen] = useState(false);

  const dockRef = useRef<HTMLDivElement>(null);

  const closeAllPopovers = () => {
    setModelPopoverOpen(false);
    setRatioPopoverOpen(false);
    setMotionPopoverOpen(false);
    setDurationPopoverOpen(false);
    setQualityPopoverOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-popover-content="true"]') && !target.closest('[data-popover-trigger="true"]')) {
        closeAllPopovers();
      }
      if (mentionMenuRef.current && !mentionMenuRef.current.contains(target) && promptTextareaRef.current && !promptTextareaRef.current.contains(target)) {
        setMentionMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Dynamic Video Models State with Active Flags
  const [availableModels, setAvailableModels] = useState<VideoModelOption[]>(VIDEO_MODELS);

  useEffect(() => {
    api.getVideoModels()
      .then((data: any) => {
        if (data && data.models && Array.isArray(data.models)) {
          setAvailableModels(data.models);
        }
      })
      .catch((err) => console.warn("Could not fetch video models:", err));
  }, []);

  const filteredModels = availableModels.filter((m) => {
    if (!modelSearchQuery.trim()) return true;
    const q = modelSearchQuery.toLowerCase();
    return (
      m.label.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      Boolean(m.category && m.category.toLowerCase().includes(q))
    );
  });

  // Right Sidebar & Stacked Accordions State (Default Collapsed)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    character: false,
    motion: false,
    render: false,
  });

  // Desktop Left Sidebar Collapsed Tracking (for perfect canvas centering)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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

  // Real Upload Progress Tracking (0-100%)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadType, setUploadType] = useState<string>("");

  // Full-View Precision Video Editor State
  const [precisionEditorOpen, setPrecisionEditorOpen] = useState(false);
  const [precisionEditorUrl, setPrecisionEditorUrl] = useState("");
  const [precisionEditorFilename, setPrecisionEditorFilename] = useState("");

  const toggleSection = (s: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [s]: !prev[s] }));
  };

  const toggleAllSections = () => {
    const allOpen = Object.values(openSections).every(Boolean);
    setOpenSections({
      character: !allOpen,
      motion: !allOpen,
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

  const activeModel = availableModels.find((m) => m.value === model) || availableModels[0] || VIDEO_MODELS[0];
  const activeMotion = MOTIONS.find((m) => m.id === motion) || MOTIONS[0];

  // URL query sync & Character Lock Integration
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

    // Character Lock Query & Storage Sync
    try {
      const charId = searchParams?.get("character");
      if (charId) {
        const stored = getStoredCharacters();
        const found = stored.find((c) => c.id === charId);
        if (found) {
          setActiveCharacter(found);
          setCharacterLockActive(true);
          if (found.imageUrl) {
            setStartImage(found.imageUrl);
            setMode("first_frame");
          }
          const charPromptParam = searchParams?.get("char_prompt");
          if (charPromptParam) {
            setPrompt(decodeURIComponent(charPromptParam));
          } else if (found.prompt && !prompt.trim()) {
            setPrompt(found.prompt);
          }
          setOpenSections((prev) => ({ ...prev, character: true }));
          return;
        }
      }

      // Check active character in storage and database
      const active = getActiveCharacter();
      if (active) {
        setActiveCharacter(active);
        setCharacterLockActive(true);
        if (active.imageUrl && !startImage) {
          setStartImage(active.imageUrl);
        }
      }
      fetchActiveCharacterAsync().then((remoteActive) => {
        if (remoteActive) {
          setActiveCharacter(remoteActive);
          setCharacterLockActive(true);
          if (remoteActive.imageUrl && !startImage) {
            setStartImage(remoteActive.imageUrl);
          }
        }
      }).catch(() => {});
    } catch (e) {
      console.warn("Character sync error in video page:", e);
    }
  }, [searchParams]);

  // Real-time listener for character updates across tabs/modals
  useEffect(() => {
    const handleCharUpdate = (e: any) => {
      const char = e?.detail;
      if (char) {
        setActiveCharacter(char);
        setCharacterLockActive(true);
        if (char.imageUrl) {
          setStartImage(char.imageUrl);
          setMode("first_frame");
        }
      } else {
        setActiveCharacter(null);
      }
    };
    window.addEventListener("omnistudio:active_character_updated", handleCharUpdate as EventListener);
    return () => window.removeEventListener("omnistudio:active_character_updated", handleCharUpdate as EventListener);
  }, []);

  // Load Studio Preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("omnistudio_preferences");
      if (saved) {
        const p = JSON.parse(saved);
        if (p.cameraMotion) setMotion(p.cameraMotion);
        if (p.defaultVideoEngine) setModel(p.defaultVideoEngine);
        if (p.defaultResolution) setResolution(p.defaultResolution);
        if (p.defaultAspectRatio) setAspectRatio(p.defaultAspectRatio);
      }
    } catch {}
  }, []);

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
    setUploadType("Start Keyframe");
    setUploadProgress(0);
    try {
      const res = await api.uploadVideoKeyframeWithProgress(file, (pct) => setUploadProgress(pct));
      const url = typeof res === "string" ? res : res?.url;
      if (url) setStartImage(url);
    } catch (err) {
      console.error("Failed to upload start keyframe:", err);
    } finally {
      setUploadingStartImage(false);
      setUploadProgress(null);
    }
  };

  const handleEndImageUpload = async (file: File) => {
    if (!file) return;
    setUploadingEndImage(true);
    setUploadType("End Keyframe");
    setUploadProgress(0);
    try {
      const res = await api.uploadVideoKeyframeWithProgress(file, (pct) => setUploadProgress(pct));
      const url = typeof res === "string" ? res : res?.url;
      if (url) setEndImage(url);
    } catch (err) {
      console.error("Failed to upload end keyframe:", err);
    } finally {
      setUploadingEndImage(false);
      setUploadProgress(null);
    }
  };

  const handleMultiImageUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;
    setUploadingMulti(true);
    setUploadType("Keyframe Sequence");
    setUploadProgress(0);
    const availableSlots = Math.max(0, 8 - keyframeImages.length);
    const selected = fileArray.slice(0, availableSlots);

    for (let i = 0; i < selected.length; i++) {
      const f = selected[i];
      try {
        const res = await api.uploadVideoKeyframeWithProgress(f, (p) => {
          const overall = Math.round(((i + p / 100) / selected.length) * 100);
          setUploadProgress(overall);
        });
        const url = typeof res === "string" ? res : res?.url;
        if (url) {
          setKeyframeImages((prev) => [...prev, url]);
        }
      } catch (e) {
        console.error("Error uploading multi image:", e);
      }
    }
    setUploadingMulti(false);
    setUploadProgress(null);
  };

  const removeKeyframeImage = (index: number) => {
    setKeyframeImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoFileProcess = async (file: File) => {
    if (!file) return;
    setUploadingVideo(true);
    setUploadType("Motion Reference Video");
    setUploadProgress(0);
    try {
      const res = await api.uploadSourceVideoWithProgress(file, (pct) => setUploadProgress(pct));
      const url = typeof res === "string" ? res : res?.url;
      if (url) setSourceVideoUrl(url);
    } catch (err) {
      console.error("Failed to upload source video:", err);
    } finally {
      setUploadingVideo(false);
      setUploadProgress(null);
    }
  };

  const handleEditorVideoUpload = async (file: File) => {
    if (!file) return;
    setUploadingEditorVideo(true);
    setUploadType("Video");
    setUploadProgress(0);
    try {
      const res = await api.uploadVideoWithProgress(file, (pct) => setUploadProgress(pct));
      const url = res?.url || (typeof res === "string" ? res : "");
      if (url) {
        setEditorVideoUrl(url);
        setEditorVideoFile(file);
        setPrecisionEditorUrl(url);
        setPrecisionEditorFilename(file.name);
        setPrecisionEditorOpen(true);
        setSidebarOpen(false);
      }
    } catch (err) {
      console.error("Failed to upload video for editor:", err);
    } finally {
      setUploadingEditorVideo(false);
      setUploadProgress(null);
    }
  };

  // 1-Click Instant Style Preset Modifiers (Zero AI latency, never triggers Improve Enhancing)
  const handleApplyPromptModifier = (stylePreset: string) => {
    const styleModifiers: Record<string, string> = {
      more_realistic: "8K cinema camera, Hasselblad optical precision, natural lighting, raw micro-textures, hyper-realistic motion physics",
      more_cinematic: "shot on 35mm Arri Alexa LF, anamorphic lens flare, shallow depth of field, volumetric haze, Hollywood cinematic color grade",
      more_luxury: "ultra-luxury commercial production, opulent materials, gold caustics, architectural studio lighting, Vogue luxury aesthetic",
      more_fashion: "haute couture fashion film, Paris Fashion Week styling, dynamic Profoto rim light, high-fashion editorial movement",
      more_commercial: "crisp commercial product advertising, clean high-key studio, pristine reflections, Apple advertising aesthetic",
      more_viral: "high-energy dynamic camera track, dramatic speed ramp, punchy saturated colors, viral TikTok & Reels visual hook"
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

  // Dedicated AI Prompt Copilot (Triggered ONLY by 'Improve Prompt' button)
  const handleEnhancePrompt = async () => {
    const current = prompt.trim();
    if (!current || enhancingPrompt) return;
    setEnhancingPrompt(true);
    try {
      const res = await api.enhancePrompt({ prompt: current, enhance_style: "cinematic", style: "cinematic" });
      if (res?.enhanced) {
        setPrompt(res.enhanced);
      }
    } catch (err) {
      console.error("AI Enhance error:", err);
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

  // Multi-Asset Reference Handlers (@ Mention Assets)
  const handleReferenceFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingRefs(true);
    try {
      const newAssets: ReferenceAsset[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVid = file.type.startsWith("video/");
        const cleanTag = file.name.replace(/[^a-zA-Z0-9_\.\-]/g, "_");
        let uploadRes;
        if (isVid) {
          uploadRes = await api.uploadSourceVideo(file);
        } else {
          uploadRes = await api.uploadReferenceImage(file);
        }
        const fileUrl = uploadRes?.url || uploadRes?.file_path || "";
        if (fileUrl) {
          newAssets.push({
            id: `ref_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
            url: fileUrl,
            filename: file.name,
            tag: cleanTag,
            type: isVid ? "video" : "image",
          });
        }
      }
      if (newAssets.length > 0) {
        setReferenceAssets((prev) => [...prev, ...newAssets]);
        insertMentionTag(newAssets[0].tag);
      }
    } catch (err: any) {
      console.error("Reference upload error:", err);
      alert(err?.message || "Failed to upload reference assets");
    } finally {
      setUploadingRefs(false);
      if (e.target) e.target.value = "";
    }
  };

  const removeReferenceAsset = (id: string) => {
    setReferenceAssets((prev) => prev.filter((a) => a.id !== id));
  };

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
    const alreadyInRefs = referenceAssets.some((r) => r.url === item.url);
    if (!alreadyInRefs) {
      setReferenceAssets((prev) => [
        ...prev,
        {
          id: item.id || `ref_${Date.now()}`,
          url: item.url,
          filename: item.filename,
          tag: item.tag,
          type: item.type,
        },
      ]);
    }
    insertMentionTag(item.tag);
  };

  const mentionCandidates = [
    ...referenceAssets.map((a) => ({
      id: a.id,
      tag: a.tag,
      label: `@${a.tag}`,
      sub: `${a.type === 'video' ? 'Video' : 'Image'} (${a.filename})`,
      url: a.url,
      filename: a.filename || a.tag,
      type: a.type,
      badge: a.type === 'video' ? 'VIDEO REF' : 'IMG REF',
    })),
    ...(startImage.trim() ? [{
      id: "start_frame_ref",
      tag: "start_frame",
      label: "@start_frame",
      sub: "Active Start Keyframe",
      url: startImage,
      filename: "start_frame.png",
      type: "image" as const,
      badge: "FRAME 1",
    }] : []),
    ...(endImage.trim() ? [{
      id: "end_frame_ref",
      tag: "end_frame",
      label: "@end_frame",
      sub: "Active End Keyframe",
      url: endImage,
      filename: "end_frame.png",
      type: "image" as const,
      badge: "FRAME 2",
    }] : []),
    ...(activeCharacter?.imageUrl ? [{
      id: "character_ref",
      tag: `char_${activeCharacter.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      label: `@char_${activeCharacter.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      sub: `Character: ${activeCharacter.name}`,
      url: activeCharacter.imageUrl,
      filename: `${activeCharacter.name}.png`,
      type: "image" as const,
      badge: "PERSONA",
    }] : []),
  ].filter((c) =>
    !mentionQuery || c.tag.toLowerCase().includes(mentionQuery) || c.sub.toLowerCase().includes(mentionQuery)
  );

  // Validation: prompt alone or image alone is valid for first_frame mode
  const isFormValid = () => {
    if (mode === "first_frame") return !!startImage.trim() || !!prompt.trim();
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

    // Calculate total cost for batch variations
    costUsd = costUsd * batchCount;

    const costInr = Math.round(costUsd * 83.5 * 100) / 100;
    const modelObj = availableModels.find((m) => m.value === model) || VIDEO_MODELS.find((m) => m.value === model);
    const isConfigured = modelObj ? (modelObj.active !== false) : true;
    const keyMissingMessage = !isConfigured
      ? `API Key for ${modelObj?.label || model} is missing. Configure it in Settings or switch to Local Ken Burns (100% Free).`
      : undefined;
    const effectiveMode = (mode === "first_frame" && !startImage.trim() && !!prompt.trim()) ? "text_to_video" : mode;
    const characterContext = (activeCharacter?.isLocked && characterLockActive && activeCharacter?.prompt)
      ? `[Character: ${activeCharacter.name}, ${activeCharacter.prompt}]. `
      : "";
    const displayPrompt = (characterContext + prompt).trim() || `Motion: ${motion} on keyframe`;

    setConfirmDetails({
      serviceType: "video",
      modelName: `${modelObj?.label || model}${batchCount > 1 ? ` (${batchCount}x Batch)` : ""}`,
      provider: batchCount > 1 ? `${provider} • ${batchCount} Variations` : provider,
      prompt: displayPrompt,
      specs: {
        mode: effectiveMode,
        duration,
        resolution,
        fps,
        motion,
        quality,
        batchCount: `${batchCount}x`,
      },
      costUsd,
      costInr,
      isFree,
      isKeyConfigured: isConfigured,
      keyMissingMessage,
    });

    let shouldSkipModal = false;
    try {
      const savedPrefs = localStorage.getItem("omnistudio_preferences");
      if (savedPrefs && JSON.parse(savedPrefs).skipConfirmModal) shouldSkipModal = true;
    } catch {}

    // Never skip confirmation modal if key is missing so user receives explicit warning
    if (shouldSkipModal && isConfigured) {
      generate();
      return;
    }

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

    const effectiveMode = (mode === "first_frame" && !startImage.trim() && !!prompt.trim()) ? "text_to_video" : mode;
    const isCharLockActive = Boolean(characterLockActive && activeCharacter?.isLocked);
    const effectiveStartImage = (!startImage.trim() && isCharLockActive && activeCharacter?.imageUrl) ? activeCharacter.imageUrl : startImage;

    // Character Consistency Directives (strictly conditioned on active Character Lock)
    let characterContext = "";
    let effectiveNegative = negativePrompt.trim();

    if (isCharLockActive) {
      const consistencyDirectives: string[] = [];
      if (lockFace) consistencyDirectives.push("exact facial geometry, features, and likeness");
      if (lockDress) consistencyDirectives.push("exact outfit costume fabric texture and garment cut");
      if (lockJewelry) consistencyDirectives.push("consistent jewelry ornaments and accessories");
      if (lockBackground) consistencyDirectives.push("consistent background environment and atmosphere");
      if (lockHair) consistencyDirectives.push("consistent hairstyle, hair color, and hairline");
      if (lockLighting) consistencyDirectives.push("consistent lighting direction, color temperature, and rim lights");
      if (lockStyle) consistencyDirectives.push("consistent cinematic color grade, lens optics, and film style");
      if (lockPhysique) consistencyDirectives.push("consistent body proportions, physique, and posture");
      
      // Inject user custom lock tags
      if (customLocks.length > 0) {
        consistencyDirectives.push(...customLocks.map((c) => `strictly preserved ${c.trim()}`));
      }

      const consistencyString = consistencyDirectives.length > 0 ? `[Consistency Lock: ${consistencyDirectives.join(", ")}]. ` : "";

      characterContext = activeCharacter?.prompt
        ? `[Featuring Character: ${activeCharacter.name}, ${activeCharacter.prompt}]. ${consistencyString}`
        : consistencyString;

      // Negative Prompt with Granular Consistency Suppressions
      const negativeDirectives: string[] = [];
      if (lockFace) negativeDirectives.push("morphed face, mismatched face, distorted facial features, different person");
      if (lockDress) negativeDirectives.push("changing clothes, different costume, mismatched dress, fluctuating colors");
      if (lockJewelry) negativeDirectives.push("missing jewelry, disappearing ornaments, changing necklace, shifting accessories");
      if (lockBackground) negativeDirectives.push("disrupted background, abrupt environment change, inconsistent scenery");
      if (lockHair) negativeDirectives.push("different hairstyle, shifting hair color, disappearing curls, bald spots");
      if (lockLighting) negativeDirectives.push("flickering lighting, inconsistent shadow direction, random color casts");
      if (lockStyle) negativeDirectives.push("inconsistent art style, cartoonish shift, blurry lens flare artifacts");
      if (lockPhysique) negativeDirectives.push("distorted body proportions, changing height, mutated limbs");
      
      // Custom locks negative suppression
      if (customLocks.length > 0) {
        negativeDirectives.push(...customLocks.map((c) => `missing ${c.trim()}, distorted ${c.trim()}, changing ${c.trim()}`));
      }

      if (negativeDirectives.length > 0) {
        effectiveNegative = effectiveNegative
          ? `${effectiveNegative}, ${negativeDirectives.join(", ")}`
          : negativeDirectives.join(", ");
      }
    }

    let promptDirectiveText = "";
    try {
      const savedPrefs = localStorage.getItem("omnistudio_preferences");
      if (savedPrefs) {
        const p = JSON.parse(savedPrefs);
        if (p.enablePromptDirective && p.promptDirective) {
          promptDirectiveText = `, ${p.promptDirective}`;
        }
      }
    } catch {}

    const refDirectives = referenceAssets.length > 0
      ? ` [Visual References: ${referenceAssets.map((r) => `@${r.tag}`).join(", ")}]`
      : "";
    const finalPrompt = (characterContext + prompt + promptDirectiveText + refDirectives).trim();

    const basePayload: any = {
      mode: effectiveMode,
      start_image_path: mode === "multi_frame" ? keyframeImages[0] : effectiveStartImage,
      end_image_path: mode === "multi_frame" ? keyframeImages[keyframeImages.length - 1] : mode === "first_to_last_frame" ? endImage : null,
      image_paths: mode === "multi_frame" ? keyframeImages : undefined,
      source_video_path: mode === "motion_transfer" ? sourceVideoUrl : null,
      prompt: finalPrompt,
      negative_prompt: effectiveNegative,
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
      character_name: activeCharacter?.isLocked ? activeCharacter.name : undefined,
      character_image: activeCharacter?.isLocked ? activeCharacter.imageUrl : undefined,
      reference_images: referenceAssets.map((r) => r.url),
    };

    // Batch Multi-Video Generation Flow (When batchCount > 1)
    if (batchCount > 1) {
      setSidebarOpen(true);
      setSidebarTab("queue");

      const batchJobs = Array.from({ length: batchCount }, (_, b) => {
        const vIdx = b + 1;
        const vId = `job_${Date.now()}_var${vIdx}`;
        return {
          id: vId,
          prompt: `${finalPrompt} (Variation #${vIdx})`,
          model: activeModel.label,
          motion: activeMotion.label,
          duration,
          aspectRatio,
          status: "rendering" as const,
          progress: 10,
          stage: `Queued Variation #${vIdx}`,
          createdAt: Date.now() + b,
          thumbnailUrl: effectiveStartImage || undefined,
        };
      });

      persistJobs([...batchJobs, ...renderJobs]);

      try {
        for (let b = 0; b < batchCount; b++) {
          const vIdx = b + 1;
          const currentJob = batchJobs[b];
          const vSeed = seed ? (parseInt(seed, 10) + b * 10007) : Math.floor(Math.random() * 9000000) + 1000000;

          setStageTitle(`0${vIdx} • Synthesizing Variation ${vIdx} of ${batchCount}`);
          setStatusMessage(`Rendering ${activeModel.label} • Seed: ${vSeed}`);
          setProgress(Math.round(((b) / batchCount) * 100) + 10);

          setRenderJobs((prev) =>
            prev.map((j) => (j.id === currentJob.id ? { ...j, progress: 45, stage: `Rendering Var #${vIdx}` } : j))
          );

          const curPayload = {
            ...basePayload,
            prompt: `${finalPrompt} (Variation #${vIdx})`,
            seed: vSeed,
          };

          const data = await api.generateVideo(curPayload);
          if (data && data.success) {
            setResult(data);
            setVideoDockCollapsed(true);
            const doneJob = {
              ...currentJob,
              status: "completed" as const,
              progress: 100,
              stage: "Render Complete",
              completedAt: Date.now(),
              videoUrl: data.url,
              thumbnailUrl: data.thumbnail_url || currentJob.thumbnailUrl,
            };
            setRenderJobs((prev) => {
              const next = prev.map((j) => (j.id === currentJob.id ? doneJob : j));
              persistJobs(next);
              return next;
            });
            setTelemetryLogs((prev) => [
              ...prev,
              {
                timestamp: new Date().toTimeString().split(" ")[0],
                message: `Variation #${vIdx}/${batchCount} complete: ${data.filename}`,
              },
            ]);
          } else {
            const errorMsg = data?.error || "Variation synthesis failed";
            const failJob = {
              ...currentJob,
              status: "failed" as const,
              stage: "Failed",
              error: errorMsg,
            };
            setRenderJobs((prev) => {
              const next = prev.map((j) => (j.id === currentJob.id ? failJob : j));
              persistJobs(next);
              return next;
            });
          }
        }

        setProgress(100);
        setStageTitle("BATCH RENDERING COMPLETE");
        setStatusMessage(`Finished generating ${batchCount} video variations!`);
      } catch (err: any) {
        setStatusMessage(err?.message || "Batch synthesis failed");
        setStageTitle("SYNTHESIS FAILED");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Initialize Render Queue Record for Single Job
    const newJobId = "job_" + Date.now();
    activeJobIdRef.current = newJobId;
    const initialJob = {
      id: newJobId,
      prompt: finalPrompt,
      model: activeModel.label,
      motion: activeMotion.label,
      duration,
      aspectRatio,
      status: "rendering" as const,
      progress: 10,
      stage: "01 • Initializing Frame Buffer",
      createdAt: Date.now(),
      thumbnailUrl: effectiveStartImage || undefined,
    };
    persistJobs([initialJob, ...renderJobs]);

    const startTimestamp = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
      setElapsedSeconds(elapsed);
      let curProg = 10;
      let curStage = "01 • Initializing Frame Buffer";
      if (elapsed === 1) {
        curProg = 28;
        curStage = "02 • Calculating Kinematics";
        setProgress(28);
        setStageTitle("02 • Calculating Kinematics");
        setStatusMessage(`Applying camera vector: ${activeMotion.label} (${resolution}, ${fps} FPS)...`);
      } else if (elapsed === 3) {
        curProg = 58;
        curStage = "03 • Interpolating Frames";
        setProgress(58);
        setStageTitle("03 • Interpolating Frames");
        setStatusMessage("Hardware-accelerated frame interpolation running...");
      } else if (elapsed === 6) {
        curProg = 82;
        curStage = "04 • FFmpeg ProRes Encoding";
        setProgress(82);
        setStageTitle("04 • FFmpeg ProRes Encoding");
        setStatusMessage(`Encoding libx264 container at ${aspectRatio}...`);
      } else if (elapsed >= 9 && elapsed < 16) {
        curProg = Math.min(82 + (elapsed - 6) * 2, 95);
        curStage = "05 • Polishing Stream Container";
        setProgress(curProg);
      }
      setRenderJobs((prev) =>
        prev.map((j) => (j.id === newJobId ? { ...j, progress: curProg, stage: curStage } : j))
      );
    }, 1000);

    try {
      const payload: any = {
        ...basePayload,
      };

      const data = await api.generateVideo(payload);
      setResult(data);
      if (data && data.success) {
        setVideoDockCollapsed(true);
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

        const completedJob = {
          ...initialJob,
          status: "completed" as const,
          progress: 100,
          stage: "Render Complete",
          completedAt: Date.now(),
          videoUrl: data.url,
          thumbnailUrl: data.thumbnail_url || initialJob.thumbnailUrl,
        };
        setRenderJobs((prev) => {
          const next = prev.map((j) => (j.id === newJobId ? completedJob : j));
          try {
            localStorage.setItem("omnistudio_video_render_queue", JSON.stringify(next.slice(0, 50)));
          } catch {}
          return next;
        });
      } else {
        const errorMsg = (data && data.error) ? data.error : "Video generation failed or timed out";
        setStageTitle("SYNTHESIS FAILED");
        setStatusMessage(errorMsg);
        setTelemetryLogs((prev) => [
          ...prev,
          { timestamp: new Date().toTimeString().split(" ")[0], message: `Error: ${errorMsg}` },
        ]);
        const failedJob = {
          ...initialJob,
          status: "failed" as const,
          stage: "Synthesis Failed",
          error: errorMsg,
        };
        setRenderJobs((prev) => {
          const next = prev.map((j) => (j.id === newJobId ? failedJob : j));
          try {
            localStorage.setItem("omnistudio_video_render_queue", JSON.stringify(next.slice(0, 50)));
          } catch {}
          return next;
        });
      }
    } catch (e: any) {
      const errorMsg = e.message || "Synthesis failed";
      setResult({ success: false, error: errorMsg });
      setStageTitle("SYNTHESIS FAILED");
      setStatusMessage(errorMsg);
      setTelemetryLogs((prev) => [
        ...prev,
        { timestamp: new Date().toTimeString().split(" ")[0], message: `Error: ${errorMsg}` },
      ]);
      const failedJob = {
        ...initialJob,
        status: "failed" as const,
        stage: "Synthesis Failed",
        error: errorMsg,
      };
      setRenderJobs((prev) => {
        const next = prev.map((j) => (j.id === newJobId ? failedJob : j));
        try {
          localStorage.setItem("omnistudio_video_render_queue", JSON.stringify(next.slice(0, 50)));
        } catch {}
        return next;
      });
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setLoading(false);
    }
  };

  const videoCostUsd = model === "ffmpeg_local" ? 0 : duration * 0.15;
  const videoCostInr = Math.round(videoCostUsd * 83.5 * 100) / 100;

  return (
    <div className="relative h-full flex flex-col overflow-hidden font-jakarta bg-[#fafafa] dark:bg-[#06060a]">
      {/* Top Header: Mode Switcher Tabs + Active Engine Indicator + Sidebar Toggle */}
      <div className="flex-shrink-0 sticky top-0 flex items-center justify-between gap-2.5 px-3 sm:px-4 py-2 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md z-30 w-full overflow-hidden">
        {/* Left: Mode Tabs (flex-1 scrollable, never pushes right utilities off-screen) */}
        <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
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
            onClick={() => {
              setMode("video_editor");
              setSidebarOpen(false);
            }}
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

        {/* Right: Pinned Utilities (Engine, Character Lock, Guide, Settings) - NEVER overflows */}
        <div className="shrink-0 flex items-center gap-2">
          {/* Engine & Ken Burns Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap shadow-xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
            <span className="truncate max-w-[130px]">{activeModel.label}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold uppercase">
              {activeModel.value === "ffmpeg_local" ? "FREE" : activeModel.active ? "ACTIVE" : "KEY"}
            </span>
          </div>

          {/* Character Lock Button */}
          <button
            type="button"
            onClick={() => {
              setSidebarOpen(true);
              setOpenSections((prev) => ({ ...prev, character: true }));
            }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 border",
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
            <span className="hidden md:inline">{activeCharacter?.isLocked ? `Locked: ${activeCharacter.name}` : "Character Lock"}</span>
            {activeCharacter?.isLocked && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setHowItWorksOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden lg:inline">Guide</span>
          </button>

          {/* Render Queue (Midjourney Jobs) Button */}
          <button
            type="button"
            onClick={() => {
              if (sidebarOpen && sidebarTab === "queue") {
                setSidebarOpen(false);
              } else {
                setSidebarOpen(true);
                setSidebarTab("queue");
              }
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border shrink-0",
              sidebarOpen && sidebarTab === "queue"
                ? "bg-emerald-600 text-white border-transparent font-bold shadow-xs"
                : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            )}
            title="Toggle Render Queue (Midjourney Jobs)"
          >
            <Film className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-semibold">Queue</span>
            {renderJobs.some((j) => j.status === "rendering") ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : renderJobs.length > 0 ? (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold">
                {renderJobs.length}
              </span>
            ) : null}
          </button>

          {/* Right Sidebar Toggle Button */}
          {mode !== "video_editor" && !precisionEditorOpen && (
            <button
              type="button"
              onClick={() => {
                if (sidebarOpen && sidebarTab === "settings") {
                  setSidebarOpen(false);
                } else {
                  setSidebarOpen(true);
                  setSidebarTab("settings");
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border shrink-0",
                sidebarOpen && sidebarTab === "settings"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent font-bold"
                  : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
              )}
              title="Toggle Settings Sidebar"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-semibold">Settings</span>
              {sidebarOpen && sidebarTab === "settings" ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport: Canvas on Left + Settings Sidebar on Right */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {precisionEditorOpen || mode === "video_editor" ? (
          <div className="flex-1 min-h-0 overflow-hidden p-1.5 sm:p-2.5 flex flex-col">
            <PrecisionVideoEditor
              videoUrl={precisionEditorUrl || editorVideoUrl || (result?.url ? getMediaUrl(result.url) : "")}
              filename={precisionEditorFilename || editorVideoFile?.name || result?.filename || "video.mp4"}
              onClose={() => {
                setPrecisionEditorOpen(false);
                if (mode === "video_editor") {
                  setMode("first_frame");
                }
              }}
              onSaved={(newAsset) => {
                setResult(newAsset);
                setPrecisionEditorOpen(false);
                if (mode === "video_editor") {
                  setMode("first_frame");
                }
              }}
            />
          </div>
        ) : (
          <>
        {/* Left Workspace / Canvas */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 pb-[540px] sm:pb-[620px] custom-scrollbar relative min-h-0">
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
                      onClick={() => {
                        setPrecisionEditorUrl(result.url);
                        setPrecisionEditorFilename(result.filename || "generated_video.mp4");
                        setPrecisionEditorOpen(true);
                        setSidebarOpen(false);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-mono font-bold transition-colors cursor-pointer"
                    >
                      <Scissors className="w-3.5 h-3.5 text-amber-500" />
                      <span>Precision Editor</span>
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
              <div className="space-y-4">
                {/* Real Upload Progress Banner (0% -> 100%) */}
                {uploadProgress !== null && (
                  <div className="p-3 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs font-mono text-emerald-800 dark:text-emerald-300">
                      <div className="flex items-center gap-2 font-bold">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                        <span>Uploading {uploadType}...</span>
                      </div>
                      <span className="font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        {uploadProgress}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-150"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Global File Inputs for Keyframe Staging (Always mounted in DOM) */}
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

                {/* ── Mode 1: First Frame Single Staging ── */}
                {mode === "first_frame" && (
                  <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl shadow-sm p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-2.5">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-950 dark:text-white">
                          Start Keyframe Stage
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openVaultPicker("start")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold shadow-xs transition-all hover:scale-105 cursor-pointer"
                        >
                          <FolderArchive className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Select from Vault</span>
                        </button>
                      </div>
                    </div>

                    {startImage ? (
                      /* Crisp Preview Card when Image is Uploaded - Displays in natural uploaded size and aspect ratio */
                      <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950/90 group shadow-sm flex items-center justify-center p-2 min-h-[160px] max-h-[300px] w-full">
                        <img
                          src={getMediaUrl(startImage)}
                          alt="Start Frame"
                          className="max-h-[280px] w-auto max-w-full object-contain rounded-xl shadow-md transition-all mx-auto"
                        />
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-xs text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>START FRAME ACTIVE</span>
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 backdrop-blur-xs">
                          <button
                            type="button"
                            onClick={() => startFileInputRef.current?.click()}
                            className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            <span>Replace Frame</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setStartImage("")}
                            className="p-2 rounded-xl bg-rose-500/80 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                            title="Remove Keyframe"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Sleek, Compact Dropzone Bar (Zero-Scroll Pattern) */
                      <div
                        onClick={() => startFileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setStartDragOver(true);
                        }}
                        onDragLeave={() => setStartDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setStartDragOver(false);
                          const f = e.dataTransfer.files?.[0];
                          if (f) handleStartImageUpload(f);
                        }}
                        className={cn(
                          "group relative rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer transition-all duration-300 border-2 border-dashed",
                          startDragOver
                            ? "border-emerald-500 bg-emerald-500/10 scale-[1.01] shadow-lg shadow-emerald-500/10"
                            : "border-zinc-300 dark:border-zinc-800 hover:border-emerald-500/80 dark:hover:border-emerald-500/80 bg-gradient-to-r from-zinc-50 to-zinc-100/50 dark:from-[#11111a] dark:to-[#0c0c14] shadow-xs"
                        )}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800/80 border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 group-hover:border-emerald-500/50 transition-all">
                            {uploadingStartImage ? (
                              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                            ) : (
                              <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            )}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-xs sm:text-sm font-heading font-bold text-zinc-900 dark:text-white truncate">
                              {uploadingStartImage ? "Uploading Start Keyframe..." : "Tap to browse or drop Start Keyframe"}
                            </p>
                            <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate">
                              Supports PNG, JPG, WEBP • Fast Hardware Buffer • Up to 25MB
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startFileInputRef.current?.click();
                            }}
                            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-heading font-bold transition-all shadow-xs cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Browse Image</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openVaultPicker("start");
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-bold transition-all shadow-xs hover:scale-105 cursor-pointer"
                          >
                            <FolderArchive className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Vault</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Mode 2: First + Last Dual Frame Staging ── */}
                {mode === "first_to_last_frame" && (
                  <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl shadow-sm p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-2.5">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-950 dark:text-white">
                          First + Last Frame Morph Stage
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        AI Morph & Smooth Interpolation
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Start Frame Slot */}
                      <div className="p-3 rounded-xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Start Frame (01)
                          </span>
                          <button
                            type="button"
                            onClick={() => openVaultPicker("start")}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold transition-all shadow-2xs hover:scale-105 cursor-pointer"
                          >
                            <FolderArchive className="w-3 h-3 text-emerald-500" />
                            <span>Vault</span>
                          </button>
                        </div>

                        {startImage ? (
                          <div className="relative rounded-xl overflow-hidden min-h-[160px] max-h-[260px] border border-zinc-200 dark:border-zinc-800 bg-zinc-950/90 group shadow-xs flex items-center justify-center p-1.5 pointer-events-auto">
                            <img src={getMediaUrl(startImage)} alt="Start Frame" className="max-h-[240px] w-auto max-w-full object-contain rounded-lg mx-auto shadow-sm transition-all select-none pointer-events-none" />
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 text-[9px] font-mono font-bold text-emerald-400 border border-emerald-500/30">
                              01 START
                            </div>
                            <button
                              type="button"
                              onClick={() => setStartImage("")}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-sm"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => startFileInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const f = e.dataTransfer.files?.[0];
                              if (f) handleStartImageUpload(f);
                            }}
                            className="w-full min-h-[160px] rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-emerald-500 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-emerald-500 bg-white/40 dark:bg-zinc-900/40 transition-all cursor-pointer group p-4"
                          >
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-center group-hover:scale-105 group-hover:border-emerald-500/50 transition-all shadow-xs">
                              {uploadingStartImage ? <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> : <Upload className="w-4 h-4 text-emerald-500" />}
                            </div>
                            <div className="text-center">
                              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-500 block">
                                {uploadingStartImage ? "Uploading Frame..." : "Select Start Frame"}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400">
                                Click or drag image here
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* End Frame Slot */}
                      <div className="p-3 rounded-xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                            End Frame (02)
                          </span>
                          <button
                            type="button"
                            onClick={() => openVaultPicker("end")}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 text-[10px] font-mono font-bold transition-all shadow-2xs hover:scale-105 cursor-pointer"
                          >
                            <FolderArchive className="w-3 h-3 text-teal-500" />
                            <span>Vault</span>
                          </button>
                        </div>

                        {endImage ? (
                          <div className="relative rounded-xl overflow-hidden min-h-[160px] max-h-[260px] border border-zinc-200 dark:border-zinc-800 bg-zinc-950/90 group shadow-xs flex items-center justify-center p-1.5 pointer-events-auto">
                            <img src={getMediaUrl(endImage)} alt="End Frame" className="max-h-[240px] w-auto max-w-full object-contain rounded-lg mx-auto shadow-sm transition-all select-none pointer-events-none" />
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 text-[9px] font-mono font-bold text-teal-400 border border-teal-500/30">
                              02 END
                            </div>
                            <button
                              type="button"
                              onClick={() => setEndImage("")}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-sm"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => endFileInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const f = e.dataTransfer.files?.[0];
                              if (f) handleEndImageUpload(f);
                            }}
                            className="w-full min-h-[160px] rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-teal-500 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-teal-500 bg-white/40 dark:bg-zinc-900/40 transition-all cursor-pointer group p-4"
                          >
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-center group-hover:scale-105 group-hover:border-teal-500/50 transition-all shadow-xs">
                              {uploadingEndImage ? <Loader2 className="w-4 h-4 animate-spin text-teal-500" /> : <Upload className="w-4 h-4 text-teal-500" />}
                            </div>
                            <div className="text-center">
                              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-teal-500 block">
                                {uploadingEndImage ? "Uploading Frame..." : "Select End Frame"}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400">
                                Click or drag image here
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Mode 3: Multi-Frame Keyframe Sequence (Filmstrip Pattern) ── */}
                {mode === "multi_frame" && (
                  <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl shadow-sm p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-2.5">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-950 dark:text-white">
                          Multi-Frame Filmstrip ({keyframeImages.length}/8 Frames)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openVaultPicker("multi")}
                          className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 cursor-pointer"
                        >
                          <FolderArchive className="h-3 w-3 text-emerald-500" />
                          <span>Vault</span>
                        </button>
                      </div>
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

                    {keyframeImages.length > 0 ? (
                      /* Sleek Horizontal Filmstrip Pattern */
                      <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
                        {keyframeImages.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 w-32 h-20 shrink-0 bg-zinc-950 group shadow-xs"
                          >
                            <LazyImage
                              src={getMediaUrl(imgUrl)}
                              alt={`Frame ${idx + 1}`}
                              aspectRatio="aspect-video"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-1 left-1 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/80 text-emerald-400 border border-emerald-500/30">
                              #{idx + 1}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeKeyframeImage(idx)}
                              className="absolute top-1 right-1 p-1 rounded-md bg-rose-500/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Remove frame"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}

                        {/* Add Keyframe Slot Button */}
                        {keyframeImages.length < 8 && (
                          <button
                            type="button"
                            onClick={() => multiFileInputRef.current?.click()}
                            disabled={uploadingMulti}
                            className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 w-24 h-20 shrink-0 text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/5 transition-all cursor-pointer"
                          >
                            {uploadingMulti ? (
                              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                            ) : (
                              <Plus className="w-4 h-4 text-emerald-500" />
                            )}
                            <span className="text-[10px] font-mono font-semibold">
                              {uploadingMulti ? "Uploading" : "+ Frame"}
                            </span>
                          </button>
                        )}
                      </div>
                    ) : (
                      /* Compact Multi Dropzone Strip */
                      <div
                        onClick={() => multiFileInputRef.current?.click()}
                        className="p-4 sm:p-5 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-emerald-500 flex items-center justify-between gap-4 cursor-pointer bg-gradient-to-r from-zinc-50 to-zinc-100/50 dark:from-[#11111a] dark:to-[#0c0c14] transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-800 border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform">
                            {uploadingMulti ? <Loader2 className="w-5 h-5 animate-spin" /> : <Layers className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-heading font-bold text-zinc-900 dark:text-white">
                              Tap to select 2 to 8 Keyframe Images
                            </p>
                            <p className="text-[10px] sm:text-xs text-zinc-500 font-mono">
                              Hardware-accelerated fluid morph sequence
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            multiFileInputRef.current?.click();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition-all shadow-xs cursor-pointer"
                        >
                          Select Frames
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Mode 4: Motion Transfer Staging ── */}
                {mode === "motion_transfer" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
                      <label className="text-[10px] font-mono uppercase font-bold text-zinc-700 dark:text-zinc-300">
                        TARGET STILL IMAGE
                      </label>
                      {startImage ? (
                        <div className="relative rounded-xl overflow-hidden min-h-[160px] max-h-[260px] border border-zinc-200 dark:border-zinc-800 bg-zinc-950/90 group shadow-xs flex items-center justify-center p-1.5">
                          <img src={getMediaUrl(startImage)} alt="Target" className="max-h-[240px] w-auto max-w-full object-contain rounded-lg mx-auto shadow-sm transition-all" />
                          <button
                            type="button"
                            onClick={() => setStartImage("")}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-500 text-white cursor-pointer shadow-sm transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startFileInputRef.current?.click()}
                          className="w-full min-h-[160px] border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-500 cursor-pointer transition-colors bg-white/40 dark:bg-zinc-900/40"
                        >
                          <Upload className="w-4 h-4 text-emerald-500" />
                          <span>Select Target Character Image</span>
                        </button>
                      )}
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
                      <label className="text-[10px] font-mono uppercase font-bold text-zinc-700 dark:text-zinc-300">
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
                        <div className="relative rounded-xl overflow-hidden min-h-[160px] max-h-[260px] border border-zinc-200 dark:border-zinc-800 bg-black flex items-center justify-center p-1.5">
                          <video src={getMediaUrl(sourceVideoUrl)} controls className="max-h-[240px] w-auto max-w-full object-contain mx-auto rounded-lg" />
                          <button
                            type="button"
                            onClick={() => setSourceVideoUrl("")}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-500 text-white cursor-pointer shadow-sm transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => videoFileInputRef.current?.click()}
                          className="w-full h-36 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-500 cursor-pointer transition-colors"
                        >
                          {uploadingVideo ? <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> : <Film className="w-4 h-4 text-emerald-500" />}
                          <span>Upload Motion Reference Video</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Mode 5: Text to Video Inspiration Prompts ── */}
                {mode === "text_to_video" && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
                      <span>Cinematic Scene Templates (Click to apply)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {INSPIRATION_VIDEOS.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPrompt(item.prompt);
                            setMotion(item.motion);
                          }}
                          className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0d0d14] hover:border-emerald-500/50 hover:bg-emerald-50/10 text-left transition-all group cursor-pointer"
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
              </div>
            )}
          </div>

          {/* Backdrop to dismiss any open popovers on outside click anywhere on the page */}
          {(modelPopoverOpen || ratioPopoverOpen || motionPopoverOpen || durationPopoverOpen || qualityPopoverOpen) && (
            <div className="fixed inset-0 z-30 bg-black/10 dark:bg-black/25 backdrop-blur-[0.5px]" onClick={closeAllPopovers} />
          )}

          {/* Prompt Control Bar Fixed at Bottom of Canvas (Auto-shrinks when sidebar is open) */}
          {videoDockCollapsed ? (
            <div
              onClick={() => setVideoDockCollapsed(false)}
              className={cn(
                "fixed bottom-4 z-40 transition-all duration-300 pointer-events-auto px-3 sm:px-4 justify-center cursor-pointer",
                sidebarOpen ? "hidden lg:flex right-0 lg:right-96" : "flex right-0",
                isSidebarCollapsed ? "left-0 lg:left-16" : "left-0 lg:left-64"
              )}
            >
              <div className="w-full max-w-xl bg-white/95 dark:bg-[#0e0e16]/95 backdrop-blur-xl border border-black/[0.1] dark:border-white/[0.1] rounded-full shadow-2xl px-5 py-2.5 flex items-center justify-between hover:border-emerald-500/50 transition-all group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={cn("w-2 h-2 rounded-full", loading ? "bg-emerald-400 animate-ping" : "bg-emerald-500 animate-pulse")} />
                  <span className="text-xs font-mono font-bold text-zinc-900 dark:text-white truncate">
                    {loading ? "Video Rendering in Progress..." : "Video Studio Dock Collapsed"}
                  </span>
                  {prompt.trim() && (
                    <span className="text-[11px] font-mono text-zinc-400 truncate hidden sm:inline">
                      • &ldquo;{prompt.slice(0, 35)}...&rdquo;
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideoDockCollapsed(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/[0.08] text-xs font-mono text-zinc-700 dark:text-zinc-300 group-hover:bg-emerald-500 group-hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Expand Controls</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              ref={dockRef}
              className={cn(
                "fixed bottom-4 z-40 transition-all duration-300 pointer-events-auto px-3 sm:px-4 justify-center",
                sidebarOpen ? "hidden lg:flex right-0 lg:right-96" : "flex right-0",
                isSidebarCollapsed ? "left-0 lg:left-16" : "left-0 lg:left-64"
              )}
            >
              <div
                className={cn(
                  "w-full p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#0e0e16]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl space-y-3 transition-all duration-300",
                  sidebarOpen ? "max-w-3xl xl:max-w-4xl" : "max-w-5xl xl:max-w-6xl",
                  loading && "lightning-border-active ring-2 ring-emerald-500/40"
                )}
              >
                {/* Header with collapse button */}
                <div className="flex items-center justify-between pb-1 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider flex items-center gap-1.5">
                    {loading && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
                    <span>{loading ? "Neural Video Engine Processing..." : "Motion Studio Director Dock"}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setVideoDockCollapsed(true)}
                    className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-black dark:hover:text-white cursor-pointer transition-colors px-2 py-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                    title="Collapse Dock to view full canvas without obstruction"
                  >
                    <span>Collapse Dock</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              {/* Active Character Lock Pill (Reference Image 1) with ON/OFF Toggle */}
              {activeCharacter?.isLocked && (
                <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in flex-wrap gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {activeCharacter.imageUrl && (
                      <img
                        src={getMediaUrl(activeCharacter.imageUrl)}
                        alt={activeCharacter.name}
                        className="w-7 h-7 rounded-lg object-cover border border-emerald-500 shadow-xs shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <span className="font-bold font-heading text-xs block truncate">{activeCharacter.name}</span>
                      <span className="text-[10px] font-mono text-emerald-700/80 dark:text-emerald-300/80 block truncate">
                        Character identity locked for consistent generations
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Character Lock Toggle Switch with visual slider icon and ON/OFF */}
                    <button
                      type="button"
                      onClick={() => setCharacterLockActive(!characterLockActive)}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition-all cursor-pointer border shadow-xs select-none",
                        characterLockActive
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                          : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700"
                      )}
                      title={characterLockActive ? "Character Lock is Active (Click to turn OFF)" : "Character Lock is Disabled (Click to turn ON)"}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider">Lock</span>
                      <div className={cn(
                        "w-7 h-4 rounded-full p-0.5 transition-colors relative flex items-center",
                        characterLockActive ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"
                      )}>
                        <div className={cn(
                          "w-3 h-3 rounded-full bg-white transition-transform transform shadow-sm",
                          characterLockActive ? "translate-x-3" : "translate-x-0"
                        )} />
                      </div>
                      <span className={cn("text-[10px] font-bold font-mono", characterLockActive ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500")}>
                        {characterLockActive ? "ON" : "OFF"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSidebarOpen(true);
                        setOpenSections((prev) => ({ ...prev, character: true }));
                      }}
                      className="text-[11px] font-mono px-2 py-1 rounded-lg bg-white/70 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer border border-black/[0.06] dark:border-white/[0.06]"
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
                    title="Tap to toggle Brand Kit (Active indicated by green highlight)"
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

                  <div className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
                    {prompt.length} / 1,000 chars
                  </div>
                </div>
              </div>

              {/* Action Icons Row: 1-Click Prompt Enhancer + Director + Negative Prompt + Character Lock */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* 1-Click Improve Prompt Button */}
                  <button
                    type="button"
                    onClick={handleEnhancePrompt}
                    disabled={enhancingPrompt}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-semibold cursor-pointer shadow-xs transition-all active:scale-95 select-none",
                      enhancingPrompt
                        ? "magic-pulse-active bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 text-white border-violet-400/80 shadow-[0_0_15px_rgba(168,85,247,0.6)]"
                        : "bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300"
                    )}
                    title="1-Click AI Prompt Enhancer"
                  >
                    <Wand2 className={cn("h-3.5 w-3.5 transition-all duration-300", enhancingPrompt ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.95)] animate-pulse text-white" : "text-purple-600 dark:text-purple-400")} />
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
                    <Sparkle className={cn("h-3 w-3 text-amber-500 transition-all", directing ? "animate-pulse scale-110 text-amber-400" : "")} />
                    <span>Director Agent</span>
                  </button>

                  {/* Prompt Vault Drawer Button */}
                  <button
                    type="button"
                    onClick={() => setPromptVaultOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer border shadow-xs active:scale-95 select-none bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-emerald-500/40"
                    title="Open Prompt Vault & Presets"
                  >
                    <Bookmark className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>Prompt Vault</span>
                  </button>

                  {/* Character Lock Quick Toggle Button */}
                  {activeCharacter?.isLocked ? (
                    <button
                      type="button"
                      onClick={() => setCharacterLockActive(!characterLockActive)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-all active:scale-95 border select-none",
                        characterLockActive
                          ? "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                          : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700 text-zinc-500"
                      )}
                      title={characterLockActive ? "Character Lock is Active (Click to turn OFF for next generation)" : "Character Lock is Disabled (Click to turn ON)"}
                    >
                      {characterLockActive ? (
                        <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <UserX className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                      )}
                      <span className="truncate max-w-[120px]">{activeCharacter.name}</span>
                      <div className={cn(
                        "w-6 h-3.5 rounded-full p-0.5 transition-colors relative flex items-center shrink-0",
                        characterLockActive ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"
                      )}>
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full bg-white transition-transform transform shadow-xs",
                          characterLockActive ? "translate-x-2.5" : "translate-x-0"
                        )} />
                      </div>
                      <span className={cn("text-[10px] font-bold font-mono shrink-0", characterLockActive ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500")}>
                        {characterLockActive ? "ON" : "OFF"}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSidebarOpen(true);
                        setOpenSections((prev) => ({ ...prev, character: true }));
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-mono cursor-pointer transition-all active:scale-95"
                      title="Open Character Studio to Lock Persona"
                    >
                      <UserPlus className="h-3.5 w-3.5 text-zinc-400" />
                      <span>Character Lock</span>
                    </button>
                  )}

                  {/* Attach Reference Assets Button */}
                  <button
                    type="button"
                    onClick={() => refFileInputRef.current?.click()}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer border shadow-xs active:scale-95",
                      referenceAssets.length > 0
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold"
                        : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                    )}
                    title="Upload reference images or videos to tag with @ in prompt"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>Attach @Refs</span>
                    {referenceAssets.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-black text-[9px] font-bold">
                        {referenceAssets.length}
                      </span>
                    )}
                  </button>
                  <input
                    ref={refFileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleReferenceFilesUpload}
                  />

                  {/* Negative Prompt Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowNegativePrompt(!showNegativePrompt)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer border select-none shadow-xs active:scale-95",
                      showNegativePrompt
                        ? "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300 font-bold"
                        : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                    )}
                    title="Toggle Negative Prompt (Exclude unwanted visuals)"
                  >
                    <ShieldAlert className={cn("w-3.5 h-3.5 shrink-0 transition-colors", showNegativePrompt ? "text-rose-500" : "text-zinc-400")} />
                    <span>Negative Prompt</span>
                  </button>

                  {/* Audio & Music Library Selector */}
                  <button
                    type="button"
                    onClick={() => setAudioLibraryOpen(true)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer border shadow-xs active:scale-95 select-none",
                      selectedBgmTrack
                        ? "bg-violet-500/15 border-violet-500/30 text-violet-700 dark:text-violet-300 font-bold"
                        : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                    )}
                    title="Attach background music or SFX from royalty-free library"
                  >
                    <Music className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                    <span>{selectedBgmTrack ? selectedBgmTrack.title : "Audio / BGM"}</span>
                    {selectedBgmTrack && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBgmTrack(null);
                        }}
                        className="hover:text-rose-500 text-zinc-400 p-0.5 rounded-full"
                        title="Remove audio track"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </button>
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

              {/* Modern Unified Studio Prompt Box with Embedded Badged References */}
              <div className="relative rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all p-2.5 space-y-2">
                
                {/* Embedded Badged Labels for Tagged References (INSIDE PROMPT BOX) */}
                {referenceAssets.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
                    <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider mr-1">
                      <AtSign className="w-3 h-3 text-emerald-500" />
                      <span>Tagged:</span>
                    </div>
                    {referenceAssets.map((asset) => (
                      <span
                        key={asset.id}
                        className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-medium shadow-xs hover:bg-emerald-500/20 transition-all group select-none animate-in fade-in zoom-in-95 duration-150"
                      >
                        <div className="relative w-5 h-5 rounded-full overflow-hidden bg-black shrink-0 border border-emerald-500/40">
                          {asset.type === "video" ? (
                            <video src={getMediaUrl(asset.url)} className="w-full h-full object-cover" />
                          ) : (
                            <img src={getMediaUrl(asset.url)} alt={asset.tag} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <span className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400">@{asset.tag}</span>
                        <span className="text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
                          {asset.type === "video" ? "VID" : "IMG"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeReferenceAsset(asset.id)}
                          className="hover:text-rose-500 hover:bg-rose-500/10 rounded-full p-0.5 text-zinc-400 transition-colors cursor-pointer ml-0.5"
                          title={`Remove @${asset.tag}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}

                    {uploadingRefs && (
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono shrink-0 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Uploading ref...</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => refFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 text-zinc-400 hover:text-emerald-500 text-[10px] font-mono transition-colors cursor-pointer"
                      title="Add more reference images or videos"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tag More</span>
                    </button>
                  </div>
                )}

                {/* Floating Autocomplete Popover */}
                <MentionReferencePopover
                  isOpen={mentionMenuOpen}
                  query={mentionQuery}
                  onClose={() => setMentionMenuOpen(false)}
                  onSelect={handleSelectMention}
                  onUploadClick={() => refFileInputRef.current?.click()}
                  currentRefs={mentionCandidates}
                  isUploading={uploadingRefs}
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
                      setMentionIndex(0);
                      const startIdx = cursorPos - match[1].length - 1;
                      setMentionAnchor({ start: startIdx, end: cursorPos });
                    } else {
                      setMentionMenuOpen(false);
                      setMentionAnchor(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (mentionMenuOpen && mentionCandidates.length > 0) {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setMentionIndex((prev) => (prev + 1) % mentionCandidates.length);
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setMentionIndex((prev) => (prev - 1 + mentionCandidates.length) % mentionCandidates.length);
                      } else if (e.key === "Enter" || e.key === "Tab") {
                        e.preventDefault();
                        insertMentionTag(mentionCandidates[mentionIndex].tag);
                      } else if (e.key === "Escape") {
                        setMentionMenuOpen(false);
                      }
                    }
                  }}
                  placeholder={
                    mode === "first_frame"
                      ? "Describe camera movement, lighting changes, or visual effects over the keyframe (type @ to tag images)..."
                      : mode === "multi_frame"
                      ? "Describe the visual transition dynamics between the sequence of frames (type @ to tag images)..."
                      : mode === "text_to_video"
                      ? "Describe your scene in cinematic detail (e.g., drone shot through misty cyberpunk alley, type @ to tag images)..."
                      : "Describe the desired motion synthesis (type @ to tag images)..."
                  }
                  rows={2}
                  className="w-full bg-transparent border-0 p-1 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-0 resize-none font-sans leading-relaxed"
                />
              </div>

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
                        "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-heading font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-xs",
                        modelPopoverOpen 
                          ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300" 
                          : "bg-white dark:bg-[#16161f] hover:bg-zinc-50 dark:hover:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] text-zinc-900 dark:text-white"
                      )}
                    >
                      <Sparkle className={cn("w-3.5 h-3.5", modelPopoverOpen ? "text-emerald-500" : "text-emerald-500")} />
                      <span>{activeModel.label}</span>
                      <ChevronUp className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform", modelPopoverOpen && "rotate-180")} />
                    </button>

                    {modelPopoverOpen && (
                      <div
                        data-popover-content="true"
                        data-lenis-prevent="true"
                        className="absolute bottom-full left-0 mb-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-3 z-50 animate-slide-up space-y-2.5"
                      >
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={modelSearchQuery}
                            onChange={(e) => setModelSearchQuery(e.target.value)}
                            placeholder="Search video models..."
                            className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none font-jakarta focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                          />
                        </div>

                        <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase px-1 font-semibold flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-500" />
                            <span>Video Synthesis Models</span>
                          </div>
                          <span className="text-[9px] text-zinc-400 font-normal font-mono">
                            {filteredModels.length} models
                          </span>
                        </div>

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
                                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20"
                                    : (!isInactive && "hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 border border-transparent")
                                )}
                              >
                                <div className="space-y-0.5 min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold font-heading">{m.label}</span>
                                    {isInactive ? (
                                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">
                                        INACTIVE
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        {m.badge || (m.value === "ffmpeg_local" ? "FREE LOCAL" : "ACTIVE")}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-1">
                                    {isInactive ? "API Key required in Settings to activate" : m.description}
                                  </p>
                                </div>
                                {isSelected && !isInactive && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />}
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
                        "flex items-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs",
                        ratioPopoverOpen
                          ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-white dark:bg-[#16161f] hover:bg-zinc-50 dark:hover:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <span>↗ {aspectRatio}</span>
                      <ChevronUp className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform", ratioPopoverOpen && "rotate-180")} />
                    </button>

                    {ratioPopoverOpen && (
                      <div
                        data-popover-content="true"
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
                              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all text-left cursor-pointer",
                              aspectRatio === r.value
                                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold"
                                : "hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-zinc-700 dark:text-zinc-300"
                            )}
                          >
                            <div className="space-y-0.5">
                              <span className="block font-bold">{r.label}</span>
                              <span className="text-[10px] text-zinc-400 font-normal">{r.desc}</span>
                            </div>
                            {aspectRatio === r.value && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3. Camera Motion Pill */}
                  <div className="relative">
                    <button
                      type="button"
                      data-popover-trigger="true"
                      onClick={() => {
                        const next = !motionPopoverOpen;
                        closeAllPopovers();
                        setMotionPopoverOpen(next);
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-jakarta font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs",
                        motionPopoverOpen
                          ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-white dark:bg-[#16161f] hover:bg-zinc-50 dark:hover:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      {React.createElement(activeMotion.icon, {
                        className: cn("w-3.5 h-3.5 shrink-0", motion !== "none" ? "text-emerald-500 animate-pulse" : "text-zinc-400")
                      })}
                      <span>{activeMotion.label}</span>
                      {motion !== "none" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30 animate-ping" />
                      )}
                      <ChevronUp className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform", motionPopoverOpen && "rotate-180")} />
                    </button>

                    {motionPopoverOpen && (
                      <div
                        data-popover-content="true"
                        data-lenis-prevent="true"
                        className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-2 z-50 animate-slide-up space-y-1"
                      >
                        <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase px-2 py-1 font-semibold">
                          Camera Motion
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                          {MOTIONS.map((m) => {
                            const MotionIcon = m.icon;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setMotion(m.id);
                                  setMotionPopoverOpen(false);
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all text-left cursor-pointer",
                                  motion === m.id
                                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold"
                                    : "hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-zinc-700 dark:text-zinc-300"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <MotionIcon className="w-3.5 h-3.5 text-emerald-500" />
                                  <div>
                                    <span className="block font-heading">{m.label}</span>
                                    <span className="text-[10px] text-zinc-400 font-normal">{m.desc}</span>
                                  </div>
                                </div>
                                {motion === m.id && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Duration & Resolution Pill */}
                  <div className="relative">
                    <button
                      type="button"
                      data-popover-trigger="true"
                      onClick={() => {
                        const next = !durationPopoverOpen;
                        closeAllPopovers();
                        setDurationPopoverOpen(next);
                      }}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs",
                        durationPopoverOpen
                          ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-white dark:bg-[#16161f] hover:bg-zinc-50 dark:hover:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <span>⏱ {duration}s • {resolution}</span>
                      <ChevronUp className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform", durationPopoverOpen && "rotate-180")} />
                    </button>

                    {durationPopoverOpen && (
                      <div
                        data-popover-content="true"
                        data-lenis-prevent="true"
                        className="absolute bottom-full left-0 mb-2 w-60 rounded-2xl bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-3 z-50 animate-slide-up space-y-3"
                      >
                        <div>
                          <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-semibold">
                            Duration
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {DURATION_PRESETS.map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setDuration(d)}
                                className={cn(
                                  "py-1.5 px-1 text-center text-xs font-mono rounded-lg border transition-all cursor-pointer relative flex flex-col items-center justify-center",
                                  duration === d
                                    ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs"
                                    : "bg-zinc-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:border-emerald-500/30",
                                  d === 10 && duration !== d && "border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                                )}
                              >
                                <span>{d}s</span>
                                {d === 10 && (
                                  <span className="text-[7.5px] font-mono tracking-tighter uppercase font-extrabold opacity-90">
                                    Veo/Pro
                                  </span>
                                )}
                                {d === 5 && (
                                  <span className="text-[7.5px] font-mono tracking-tighter uppercase font-semibold opacity-75">
                                    Quick
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-black/[0.06] dark:border-white/[0.06] pt-2">
                          <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-semibold">
                            Resolution
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {RESOLUTIONS.map((r) => (
                              <button
                                key={r.value}
                                type="button"
                                onClick={() => setResolution(r.value)}
                                className={cn(
                                  "py-1.5 px-2 text-left text-xs font-mono rounded-lg border transition-all cursor-pointer",
                                  resolution === r.value
                                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20 font-bold"
                                    : "bg-zinc-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:border-emerald-500/30"
                                )}
                              >
                                <span className="block font-bold">{r.label}</span>
                                <span className="text-[9px] text-zinc-400 font-normal">{r.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. Quality & FPS Pill */}
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
                        "flex items-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs",
                        qualityPopoverOpen
                          ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-white dark:bg-[#16161f] hover:bg-zinc-50 dark:hover:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <span>🎞 {quality.toUpperCase()} • {fps}fps</span>
                      <ChevronUp className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform", qualityPopoverOpen && "rotate-180")} />
                    </button>

                    {qualityPopoverOpen && (
                      <div
                        data-popover-content="true"
                        data-lenis-prevent="true"
                        className="absolute bottom-full left-0 mb-2 w-60 rounded-2xl bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-3 z-50 animate-slide-up space-y-3"
                      >
                        <div>
                          <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-semibold">
                            Render Quality
                          </div>
                          <div className="space-y-1">
                            {QUALITY_PROFILES.map((q) => (
                              <button
                                key={q.value}
                                type="button"
                                onClick={() => setQuality(q.value)}
                                className={cn(
                                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all text-left cursor-pointer",
                                  quality === q.value
                                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold"
                                    : "hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-zinc-700 dark:text-zinc-300"
                                )}
                              >
                                <div className="space-y-0.5">
                                  <span className="block font-bold">{q.label}</span>
                                  <span className="text-[10px] text-zinc-400 font-normal">{q.desc}</span>
                                </div>
                                {quality === q.value && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-black/[0.06] dark:border-white/[0.06] pt-2">
                          <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-semibold">
                            Frame Rate
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {FPS_PROFILES.map((f) => (
                              <button
                                key={f.value}
                                type="button"
                                onClick={() => setFps(f.value)}
                                className={cn(
                                  "py-1.5 text-center text-xs font-mono rounded-lg border transition-all cursor-pointer",
                                  fps === f.value
                                    ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                                    : "bg-zinc-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:border-emerald-500/30"
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
                </div>

                {/* Right: Batch Variation Selector + Submit Button */}
                <div className="flex items-center gap-2 ml-auto">
                  {/* Batch Selector (1x, 2x, 4x) */}
                  <div className="flex items-center bg-zinc-100 dark:bg-[#16161f] p-0.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] shrink-0 shadow-xs">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 px-1.5 uppercase hidden sm:inline">
                      Batch
                    </span>
                    {[1, 2, 4].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setBatchCount(cnt)}
                        className={cn(
                          "px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                          batchCount === cnt
                            ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-emerald-500/30"
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        )}
                        title={`Generate ${cnt} video variation${cnt > 1 ? "s" : ""} in bulk`}
                      >
                        {cnt}x
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={requestVideoConfirm}
                    disabled={loading || !isFormValid()}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-heading font-bold text-xs tracking-tight transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap shrink-0 disabled:cursor-not-allowed"
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
                          Generate {batchCount > 1 ? `(${batchCount}x)` : ""}{" "}
                          {model === "ffmpeg_local"
                            ? "• Free (₹0)"
                            : `• ₹${(videoCostInr * batchCount).toFixed(0)} ($${(videoCostUsd * batchCount).toFixed(2)})`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Right Settings Sidebar (Collapsible with Stacked Close Accordions & Independent Scroll) */}
        {sidebarOpen && !precisionEditorOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed inset-y-0 right-0 z-40 w-80 sm:w-96 lg:static lg:z-10 lg:w-96 flex-shrink-0 bg-white dark:bg-[#0c0c14] border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-full min-h-0 overflow-hidden transition-all duration-300 shadow-2xl lg:shadow-lg">
            {/* Sidebar Header with Stacked Close Toggle All */}
            {/* Sidebar Header with Segmented Switch: Settings vs Render Queue */}
            <div className="flex-shrink-0 p-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/70">
              <div className="flex items-center gap-1 bg-zinc-200/80 dark:bg-zinc-800 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSidebarTab("settings")}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer",
                    sidebarTab === "settings"
                      ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  <Sliders className="w-3 h-3 text-emerald-500" />
                  <span>Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab("queue")}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer",
                    sidebarTab === "queue"
                      ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  <Film className="w-3 h-3 text-emerald-500" />
                  <span>Queue</span>
                  {renderJobs.some((j) => j.status === "rendering") ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  ) : renderJobs.length > 0 ? (
                    <span className="text-[9px] px-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                      {renderJobs.length}
                    </span>
                  ) : null}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {sidebarTab === "settings" && (
                  <button
                    type="button"
                    onClick={toggleAllSections}
                    className="text-[10px] font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-white px-2 py-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Toggle all accordion sections"
                  >
                    {Object.values(openSections).every(Boolean) ? "Collapse" : "Expand"}
                  </button>
                )}
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

            {/* If Settings Tab is active: Scrollable Accordions Container */}
            {sidebarTab === "settings" && (
              <>
                <div data-lenis-prevent="true" className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
                  {/* Section 0: Character Lock & Consistency (Native Right Sidebar) */}
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => toggleSection("character")}
                      className="w-full p-3 flex items-center justify-between text-left font-mono text-xs font-bold text-zinc-900 dark:text-white hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-emerald-500" />
                        <span>CHARACTER LOCK</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold truncate max-w-[120px]",
                          activeCharacter?.isLocked
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                            : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                        )}>
                          {activeCharacter?.isLocked ? `LOCKED: ${activeCharacter.name}` : "UNLOCKED"}
                        </span>
                        <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform duration-200", openSections.character && "rotate-180")} />
                      </div>
                    </button>

                    {openSections.character && (
                      <div className="p-3 pt-0 space-y-3 border-t border-zinc-100 dark:border-zinc-800/50">
                        {/* Active Locked Character Status */}
                        {activeCharacter?.isLocked ? (
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {activeCharacter.imageUrl && (
                                  <img
                                    src={getMediaUrl(activeCharacter.imageUrl)}
                                    alt={activeCharacter.name}
                                    className="w-8 h-8 rounded-lg object-cover border border-emerald-500"
                                  />
                                )}
                                <div>
                                  <p className="text-xs font-bold font-heading text-emerald-900 dark:text-emerald-100">{activeCharacter.name}</p>
                                  <p className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active in Synthesis
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setCharacterLockActive(!characterLockActive)}
                                  className={cn(
                                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all cursor-pointer border shadow-xs select-none",
                                    characterLockActive
                                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700"
                                  )}
                                  title={characterLockActive ? "Lock is ON (Click to turn OFF)" : "Lock is OFF (Click to turn ON)"}
                                >
                                  <div className={cn(
                                    "w-5 h-3 rounded-full p-0.5 transition-colors relative flex items-center",
                                    characterLockActive ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"
                                  )}>
                                    <div className={cn(
                                      "w-2 h-2 rounded-full bg-white transition-transform transform shadow-xs",
                                      characterLockActive ? "translate-x-2" : "translate-x-0"
                                    )} />
                                  </div>
                                  <span>{characterLockActive ? "ON" : "OFF"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveCharacter(null)}
                                  className="text-[10px] font-mono px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                                >
                                  Unlock
                                </button>
                              </div>
                            </div>
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-jakarta line-clamp-2 leading-relaxed">
                              {activeCharacter.prompt}
                            </p>

                            {/* Live Consistency Toggles for Active Character */}
                            <div className="pt-2.5 border-t border-emerald-500/20 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-700 dark:text-emerald-300 font-bold block">
                                  Multi-Feature Consistency Locks
                                </span>
                                <span className="text-[9px] font-mono text-zinc-400">
                                  8 Granular Locks Active
                                </span>
                              </div>

                              {/* 8 Granular Locks Grid */}
                              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                                <label className="flex items-center gap-1.5 p-1 rounded-md hover:bg-emerald-500/5 text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={lockFace}
                                    onChange={(e) => setLockFace(e.target.checked)}
                                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                                  />
                                  <span>Lock Face</span>
                                </label>
                                <label className="flex items-center gap-1.5 p-1 rounded-md hover:bg-emerald-500/5 text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={lockDress}
                                    onChange={(e) => setLockDress(e.target.checked)}
                                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                                  />
                                  <span>Lock Dress</span>
                                </label>
                                <label className="flex items-center gap-1.5 p-1 rounded-md hover:bg-emerald-500/5 text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={lockJewelry}
                                    onChange={(e) => setLockJewelry(e.target.checked)}
                                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                                  />
                                  <span>Lock Jewelry</span>
                                </label>
                                <label className="flex items-center gap-1.5 p-1 rounded-md hover:bg-emerald-500/5 text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={lockHair}
                                    onChange={(e) => setLockHair(e.target.checked)}
                                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                                  />
                                  <span>Lock Hair & Cut</span>
                                </label>
                                <label className="flex items-center gap-1.5 p-1 rounded-md hover:bg-emerald-500/5 text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={lockBackground}
                                    onChange={(e) => setLockBackground(e.target.checked)}
                                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                                  />
                                  <span>Lock Scenery</span>
                                </label>
                                <label className="flex items-center gap-1.5 p-1 rounded-md hover:bg-emerald-500/5 text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={lockLighting}
                                    onChange={(e) => setLockLighting(e.target.checked)}
                                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                                  />
                                  <span>Lock Lighting</span>
                                </label>
                                <label className="flex items-center gap-1.5 p-1 rounded-md hover:bg-emerald-500/5 text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={lockStyle}
                                    onChange={(e) => setLockStyle(e.target.checked)}
                                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                                  />
                                  <span>Lock Cinema Style</span>
                                </label>
                                <label className="flex items-center gap-1.5 p-1 rounded-md hover:bg-emerald-500/5 text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={lockPhysique}
                                    onChange={(e) => setLockPhysique(e.target.checked)}
                                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                                  />
                                  <span>Lock Physique</span>
                                </label>
                              </div>

                              {/* Custom Locks Tag Manager */}
                              <div className="pt-2 border-t border-emerald-500/20 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-700 dark:text-emerald-300 font-bold">
                                    Custom Feature Locks ({customLocks.length})
                                  </span>
                                  <span className="text-[9px] font-mono text-zinc-400">
                                    Tattoos, props, scars
                                  </span>
                                </div>

                                {/* Custom Lock Chips */}
                                {customLocks.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {customLocks.map((tag, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono"
                                      >
                                        <span>{tag}</span>
                                        <button
                                          type="button"
                                          onClick={() => setCustomLocks((prev) => prev.filter((_, i) => i !== idx))}
                                          className="text-emerald-500 hover:text-rose-500 cursor-pointer"
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Add Custom Lock Input Bar */}
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={newCustomLockInput}
                                    onChange={(e) => setNewCustomLockInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && newCustomLockInput.trim()) {
                                        e.preventDefault();
                                        if (!customLocks.includes(newCustomLockInput.trim())) {
                                          setCustomLocks((prev) => [...prev, newCustomLockInput.trim()]);
                                        }
                                        setNewCustomLockInput("");
                                      }
                                    }}
                                    placeholder="Add custom lock (e.g. Red Scarf, Katana...)"
                                    className="flex-1 px-2.5 py-1 text-[11px] font-mono rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (newCustomLockInput.trim() && !customLocks.includes(newCustomLockInput.trim())) {
                                        setCustomLocks((prev) => [...prev, newCustomLockInput.trim()]);
                                        setNewCustomLockInput("");
                                      }
                                    }}
                                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono font-bold transition-colors cursor-pointer"
                                  >
                                    + Add
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-zinc-500 font-jakarta leading-relaxed">
                            Lock a character identity to keep the same face, costume, and persona consistent across all camera motions and takes.
                          </p>
                        )}

                        {/* Mode Switch: Archetypes vs Custom Identity */}
                        <div className="flex rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70 p-1 border border-zinc-300/50 dark:border-zinc-700/50 gap-1">
                          <button
                            type="button"
                            onClick={() => setCharSelectTab("presets")}
                            className={cn(
                              "flex-1 py-1.5 px-2 text-[11px] font-mono rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                              charSelectTab === "presets"
                                ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs"
                                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                            )}
                          >
                            <Users className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Archetypes ({ARCHETYPES.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCharSelectTab("custom")}
                            className={cn(
                              "flex-1 py-1.5 px-2 text-[11px] font-mono rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                              charSelectTab === "custom"
                                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                            )}
                          >
                            <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
                            <span>+ Custom Character</span>
                          </button>
                        </div>

                        {/* Predefined Archetypes */}
                        {charSelectTab === "presets" && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-0.5">
                              {ARCHETYPES.map((arch) => {
                                const isSelected = activeCharacter?.id === arch.id && activeCharacter?.isLocked;
                                return (
                                  <button
                                    key={arch.id}
                                    type="button"
                                    onClick={() => {
                                      setActiveCharacter({
                                        id: arch.id,
                                        name: arch.name,
                                        tagline: "",
                                        description: arch.description,
                                        prompt: arch.prompt,
                                        imageUrl: arch.avatar,
                                        isLocked: true,
                                      });
                                      setLockFace(true);
                                      setLockDress(true);
                                      setLockJewelry(true);
                                      setLockBackground(true);
                                      setLockHair(true);
                                      setLockLighting(true);
                                      setLockStyle(true);
                                      setLockPhysique(true);
                                      setCharacterLockActive(true);
                                    }}
                                    className={cn(
                                      "p-2.5 rounded-xl text-left transition-all cursor-pointer border flex flex-col gap-1.5 relative group",
                                      isSelected
                                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500/40 shadow-xs"
                                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60"
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <img
                                        src={arch.avatar}
                                        alt={arch.name}
                                        className="w-7 h-7 rounded-lg object-cover border border-black/10 dark:border-white/10 shrink-0"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <span className="text-[11px] font-bold font-heading truncate block">{arch.name}</span>
                                        <span className="text-[9px] text-zinc-400 line-clamp-1 block">{arch.description}</span>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-black flex items-center justify-center">
                                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Custom Character Creator */}
                        {charSelectTab === "custom" && (
                          <div className="space-y-3 pt-1">
                            {/* Input: Name */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                                <User className="w-3 h-3 text-emerald-500" />
                                <span>Character Persona Name</span>
                              </label>
                              <input
                                type="text"
                                value={customCharName}
                                onChange={(e) => setCustomCharName(e.target.value)}
                                placeholder="e.g. Captain Nova / Elena Vance..."
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1.5 focus:ring-emerald-500 transition-all"
                              />
                            </div>

                            {/* Input: Description */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-emerald-500" />
                                <span>Visual Traits & Styling Prompt</span>
                              </label>
                              <textarea
                                value={customCharPrompt}
                                onChange={(e) => setCustomCharPrompt(e.target.value)}
                                placeholder="Visual description: platinum braided hair, cyberpunk leather trench coat, neon amber eyes, athletic build..."
                                rows={2}
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1.5 focus:ring-emerald-500 resize-none transition-all"
                              />
                            </div>

                            {/* Image Upload for Custom Character */}
                            <input
                              ref={charFileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploadingCharImage(true);
                                try {
                                  const res = await api.uploadReferenceImage(file);
                                  if (res?.url) {
                                    setCustomCharImage(res.url);
                                    setLockFace(true);
                                    setLockDress(true);
                                    setLockJewelry(true);
                                    setLockBackground(true);
                                    setLockHair(true);
                                    setLockLighting(true);
                                    setLockStyle(true);
                                    setLockPhysique(true);
                                    setCharacterLockActive(true);
                                  }
                                } catch (err: any) {
                                  alert(err?.message || "Failed to upload reference character image");
                                } finally {
                                  setUploadingCharImage(false);
                                  e.target.value = "";
                                }
                              }}
                            />
                            {customCharImage ? (
                              <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 bg-zinc-100/90 dark:bg-zinc-800/90 flex items-center gap-2.5 p-2 shadow-xs">
                                <img
                                  src={getMediaUrl(customCharImage)}
                                  alt="Custom character"
                                  className="w-10 h-10 rounded-lg object-cover border border-emerald-500/40 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block">
                                      Reference Image Attached
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-mono text-zinc-400 truncate block">
                                    {customCharImage.split("/").pop()}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setCustomCharImage("")}
                                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                                  title="Remove image"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => charFileInputRef.current?.click()}
                                disabled={uploadingCharImage}
                                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 bg-zinc-50/50 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 text-[11px] font-mono transition-colors cursor-pointer"
                              >
                                {uploadingCharImage ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                                ) : (
                                  <Upload className="w-3.5 h-3.5 text-emerald-500" />
                                )}
                                <span>{uploadingCharImage ? "Uploading Image..." : "Upload Face / Identity Reference"}</span>
                              </button>
                            )}

                            {/* Fine-Grained Consistency Interactive Cards */}
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block font-bold">
                                  Lock Consistency Matrix:
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLockFace(true);
                                      setLockDress(true);
                                      setLockJewelry(true);
                                      setLockBackground(true);
                                      setLockHair(true);
                                      setLockLighting(true);
                                      setLockStyle(true);
                                      setLockPhysique(true);
                                      setCharacterLockActive(true);
                                    }}
                                    className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                  >
                                    All ON
                                  </button>
                                  <span className="text-zinc-400 text-[9px]">•</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLockFace(false);
                                      setLockDress(false);
                                      setLockJewelry(false);
                                      setLockBackground(false);
                                      setLockHair(false);
                                      setLockLighting(false);
                                      setLockStyle(false);
                                      setLockPhysique(false);
                                    }}
                                    className="text-[9px] font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:underline cursor-pointer"
                                  >
                                    All OFF
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                {/* Card 1: Face */}
                                <button
                                  type="button"
                                  onClick={() => setLockFace(!lockFace)}
                                  className={cn(
                                    "p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-1.5",
                                    lockFace
                                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-100"
                                      : "bg-zinc-100/60 dark:bg-zinc-800/40 border-zinc-200/70 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                  )}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <User className={cn("w-3.5 h-3.5 shrink-0", lockFace ? "text-emerald-500" : "text-zinc-400")} />
                                    <span className="text-[10px] font-mono font-bold truncate">Face</span>
                                  </div>
                                  <span className={cn(
                                    "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0",
                                    lockFace ? "bg-emerald-500 text-black" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400"
                                  )}>
                                    {lockFace ? "ON" : "OFF"}
                                  </span>
                                </button>

                                {/* Card 2: Dress */}
                                <button
                                  type="button"
                                  onClick={() => setLockDress(!lockDress)}
                                  className={cn(
                                    "p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-1.5",
                                    lockDress
                                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-100"
                                      : "bg-zinc-100/60 dark:bg-zinc-800/40 border-zinc-200/70 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                  )}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Shirt className={cn("w-3.5 h-3.5 shrink-0", lockDress ? "text-emerald-500" : "text-zinc-400")} />
                                    <span className="text-[10px] font-mono font-bold truncate">Costume</span>
                                  </div>
                                  <span className={cn(
                                    "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0",
                                    lockDress ? "bg-emerald-500 text-black" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400"
                                  )}>
                                    {lockDress ? "ON" : "OFF"}
                                  </span>
                                </button>

                                {/* Card 3: Jewelry */}
                                <button
                                  type="button"
                                  onClick={() => setLockJewelry(!lockJewelry)}
                                  className={cn(
                                    "p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-1.5",
                                    lockJewelry
                                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-100"
                                      : "bg-zinc-100/60 dark:bg-zinc-800/40 border-zinc-200/70 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                  )}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Sparkles className={cn("w-3.5 h-3.5 shrink-0", lockJewelry ? "text-emerald-500" : "text-zinc-400")} />
                                    <span className="text-[10px] font-mono font-bold truncate">Jewelry</span>
                                  </div>
                                  <span className={cn(
                                    "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0",
                                    lockJewelry ? "bg-emerald-500 text-black" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400"
                                  )}>
                                    {lockJewelry ? "ON" : "OFF"}
                                  </span>
                                </button>

                                {/* Card 4: Background */}
                                <button
                                  type="button"
                                  onClick={() => setLockBackground(!lockBackground)}
                                  className={cn(
                                    "p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-1.5",
                                    lockBackground
                                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-100"
                                      : "bg-zinc-100/60 dark:bg-zinc-800/40 border-zinc-200/70 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                  )}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <ImageIcon className={cn("w-3.5 h-3.5 shrink-0", lockBackground ? "text-emerald-500" : "text-zinc-400")} />
                                    <span className="text-[10px] font-mono font-bold truncate">Background</span>
                                  </div>
                                  <span className={cn(
                                    "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0",
                                    lockBackground ? "bg-emerald-500 text-black" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400"
                                  )}>
                                    {lockBackground ? "ON" : "OFF"}
                                  </span>
                                </button>
                              </div>
                            </div>

                            {/* Sticky Docked Action Button - Ultra-Modern Gradient */}
                            <div className="sticky bottom-0 pt-2 pb-0.5 bg-zinc-50/95 dark:bg-[#0c0c14]/95 backdrop-blur-xs z-10 border-t border-zinc-200/60 dark:border-zinc-800/60">
                              <button
                                type="button"
                                disabled={!customCharName.trim() || !customCharPrompt.trim()}
                                onClick={() => {
                                  setActiveCharacter({
                                    id: "custom_" + Date.now(),
                                    name: customCharName.trim(),
                                    tagline: "",
                                    description: customCharPrompt.trim(),
                                    prompt: customCharPrompt.trim(),
                                    imageUrl: customCharImage || undefined,
                                    isLocked: true,
                                  });
                                  setLockFace(true);
                                  setLockDress(true);
                                  setLockJewelry(true);
                                  setLockBackground(true);
                                  setLockHair(true);
                                  setLockLighting(true);
                                  setLockStyle(true);
                                  setLockPhysique(true);
                                  setCharacterLockActive(true);
                                }}
                                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-mono text-xs font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Lock Custom Character</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

              {/* Section 1: Camera Kinematics & Motion Dynamics */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("motion")}
                  className="w-full p-3 flex items-center justify-between text-left font-mono text-xs font-bold text-zinc-900 dark:text-white hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-emerald-500" />
                    <span>MOTION KINEMATICS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
                      {activeMotion.label} • {motionIntensity}x
                    </span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform duration-200", openSections.motion && "rotate-180")} />
                  </div>
                </button>

                {openSections.motion && (
                  <div className="p-3 pt-0 space-y-3 border-t border-zinc-100 dark:border-zinc-800/50">
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                        <span>Velocity / Motion Intensity</span>
                        <span className="font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">{motionIntensity}x</span>
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
                      <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                        <span>0.5x (Subtle)</span>
                        <span>1.0x (Standard)</span>
                        <span>2.0x (Extreme)</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed pt-1 font-jakarta">
                        Controls camera velocity and dynamic kinematics. Motion trajectory is selected via the prompt dock below.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Advanced Output & Compiler */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("render")}
                  className="w-full p-3 flex items-center justify-between text-left font-mono text-xs font-bold text-zinc-900 dark:text-white hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Repeat className="w-3.5 h-3.5 text-emerald-500" />
                    <span>ADVANCED COMPILER</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
                      {fps} FPS {loop ? "• LOOP" : ""}
                    </span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform duration-200", openSections.render && "rotate-180")} />
                  </div>
                </button>

                {openSections.render && (
                  <div className="p-3 pt-0 space-y-3.5 border-t border-zinc-100 dark:border-zinc-800/50">
                    {/* Framerate */}
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] font-mono font-semibold text-zinc-400 uppercase">Framerate (FPS Profile)</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {FPS_PROFILES.map((f) => (
                          <button
                            key={f.value}
                            type="button"
                            onClick={() => setFps(f.value)}
                            className={cn(
                              "py-1.5 text-center text-xs font-mono rounded-lg border transition-all cursor-pointer",
                              fps === f.value
                                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs"
                                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            )}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Seamless Loop Toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <Repeat className="w-3.5 h-3.5 text-emerald-500" />
                        <div>
                          <span className="text-xs font-mono text-zinc-800 dark:text-zinc-200 font-semibold block">Loop Seamlessly</span>
                          <span className="text-[10px] text-zinc-400 font-jakarta">Matches first and last frame for infinite replay</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLoop(!loop)}
                        className={cn(
                          "w-8 h-4 rounded-full transition-colors relative cursor-pointer shrink-0",
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
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded font-bold",
                activeModel.active === false
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              )}>
                {activeModel.active === false ? "INACTIVE" : activeModel.badge || (activeModel.value === "ffmpeg_local" ? "FREE LOCAL" : "ACTIVE")}
              </span>
            </div>
          </>
        )}

        {/* If Render Queue Tab is active: Midjourney Jobs Drawer */}
        {sidebarTab === "queue" && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* 4 State Tabs: Rendering | Completed | Failed | Cancelled */}
            <div className="flex-shrink-0 p-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
              <div className="grid grid-cols-4 gap-1 p-0.5 rounded-xl bg-zinc-200/70 dark:bg-zinc-800 text-[10px] font-mono font-bold">
                {[
                  { id: "rendering", label: "Rendering", count: renderJobs.filter(j => j.status === "rendering").length, pulse: true },
                  { id: "completed", label: "Done", count: renderJobs.filter(j => j.status === "completed").length },
                  { id: "failed", label: "Failed", count: renderJobs.filter(j => j.status === "failed").length },
                  { id: "cancelled", label: "Cancelled", count: renderJobs.filter(j => j.status === "cancelled").length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setQueueTab(tab.id as any)}
                    className={cn(
                      "py-1.5 px-1 rounded-lg text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer",
                      queueTab === tab.id
                        ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {tab.pulse && tab.count > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                      <span className="truncate">{tab.label}</span>
                    </div>
                    <span className={cn(
                      "text-[9px] px-1.5 rounded-full",
                      queueTab === tab.id
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold"
                        : "bg-black/5 dark:bg-white/5 text-zinc-400"
                    )}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Jobs Feed List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {renderJobs.filter((j) => j.status === queueTab).length === 0 ? (
                <div className="py-12 px-4 text-center space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 mx-auto flex items-center justify-center text-zinc-400">
                    {queueTab === "rendering" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Film className="w-5 h-5" />}
                  </div>
                  <p className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
                    No {queueTab} jobs
                  </p>
                  <p className="text-[11px] text-zinc-400 font-jakarta max-w-[200px] mx-auto leading-relaxed">
                    {queueTab === "rendering"
                      ? "Active video generations will stream real-time progress here."
                      : `Completed or past runs in ${queueTab} status will be indexed here.`}
                  </p>
                </div>
              ) : (
                renderJobs
                  .filter((j) => j.status === queueTab)
                  .map((job) => (
                    <div
                      key={job.id}
                      className="p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2.5 shadow-xs transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                    >
                      {/* Card Header: Model & Meta */}
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {job.model}
                          </span>
                          <span className="text-zinc-400">
                            {job.duration}s • {job.aspectRatio}
                          </span>
                        </div>
                        <span className="text-zinc-400">
                          {new Date(job.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {/* Prompt Snippet */}
                      <p className="text-xs text-zinc-800 dark:text-zinc-200 line-clamp-2 font-jakarta leading-relaxed">
                        {job.prompt}
                      </p>

                      {/* Rendering State UI */}
                      {job.status === "rendering" && (
                        <div className="space-y-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                          <div className="flex items-center justify-between text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                            <span className="flex items-center gap-1.5">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>{job.stage || "Rendering..."}</span>
                            </span>
                            <span className="font-bold">{job.progress || 15}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${job.progress || 15}%` }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => abortActiveJob(job.id)}
                            className="w-full py-1 text-center text-[10px] font-mono text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            Cancel Render
                          </button>
                        </div>
                      )}

                      {/* Completed State UI */}
                      {job.status === "completed" && (
                        <div className="space-y-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                          {job.videoUrl && (
                            <div className="relative rounded-xl overflow-hidden aspect-video bg-black flex items-center justify-center group">
                              <video
                                src={getMediaUrl(job.videoUrl)}
                                className="w-full h-full object-cover"
                                preload="metadata"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setResult({
                                    success: true,
                                    url: job.videoUrl,
                                    filename: job.videoUrl?.split("/").pop() || "render.mp4",
                                    duration: job.duration,
                                  });
                                }}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-mono font-bold cursor-pointer"
                              >
                                <Play className="w-5 h-5 fill-current" />
                                <span>Load in Canvas</span>
                              </button>
                            </div>
                          )}

                          {/* Completed Quick Actions */}
                          <div className="flex items-center justify-between gap-1 text-[10px] font-mono pt-1">
                            <div className="flex items-center gap-1">
                              {job.videoUrl && (
                                <a
                                  href={getMediaUrl(job.videoUrl)}
                                  download={job.videoUrl.split("/").pop() || "render.mp4"}
                                  className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:text-emerald-500 flex items-center gap-1 transition-colors"
                                  title="Download MP4"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Save</span>
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => setPrompt(job.prompt)}
                                className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:text-emerald-500 flex items-center gap-1 transition-colors cursor-pointer"
                                title="Reuse Prompt"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Prompt</span>
                              </button>
                              {job.videoUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditorVideoUrl(job.videoUrl!);
                                    setEditorModalOpen(true);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:text-emerald-500 flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Open in Precision Video Editor"
                                >
                                  <Scissors className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => deleteJob(job.id)}
                              className="p-1 rounded-md text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete from Queue"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Failed State UI */}
                      {job.status === "failed" && (
                        <div className="space-y-2 pt-1 border-t border-rose-500/20">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-rose-600 dark:text-rose-400 bg-rose-500/10 p-1.5 rounded-lg">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{job.error || "Generation error"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => retryJob(job)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Retry Run</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteJob(job.id)}
                              className="p-1 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Cancelled State UI */}
                      {job.status === "cancelled" && (
                            <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[10px] font-mono">
                              <span className="text-zinc-400 italic">Render cancelled</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => retryJob(job)}
                                  className="px-2 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-emerald-500 transition-colors cursor-pointer"
                                >
                                  Re-run
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteJob(job.id)}
                                  className="p-1 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                      )}
                    </div>
                  ))
              )}
            </div>

            {/* Queue Bottom Summary & Cleanup */}
            <div className="flex-shrink-0 p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60 flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-400 font-bold">
                {renderJobs.length} Jobs Indexed
              </span>
              {renderJobs.some((j) => j.status !== "rendering") && (
                <button
                  type="button"
                  onClick={clearNonRenderingJobs}
                  className="text-zinc-500 hover:text-rose-500 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear Inactive</span>
                </button>
              )}
            </div>
          </div>
        )}

            </aside>
          </>
        )}
        </>
      )}
      </div>

      {/* Redesigned Asset Vault Keyframe Picker Modal */}
      {vaultOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setVaultOpen(false)}
        >
          <div 
            className="bg-white dark:bg-[#0e0e16] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-xs">
                  <FolderArchive className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-sm sm:text-base text-zinc-950 dark:text-white truncate">
                      Select {vaultTarget.toUpperCase()} Frame from Vault
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
                      {vaultImages.filter((img: any) => !vaultSearch.trim() || (img.filename || "").toLowerCase().includes(vaultSearch.toLowerCase())).length} Assets
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    Select a high-resolution frame from your library to anchor cinematic video synthesis
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVaultOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="px-4 sm:px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#0e0e16] flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={vaultSearch}
                  onChange={(e) => setVaultSearch(e.target.value)}
                  placeholder="Search assets by filename or tag..."
                  className="w-full pl-9 pr-8 py-2 text-xs font-mono rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                {vaultSearch && (
                  <button
                    type="button"
                    onClick={() => setVaultSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-mono text-zinc-400">
                <span className="hidden sm:inline">Target:</span>
                <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold uppercase">
                  {vaultTarget}
                </span>
              </div>
            </div>

            {/* Assets Grid Content */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 custom-scrollbar min-h-[300px]">
              {loadingVault ? (
                <div className="py-20 text-center text-xs text-zinc-500 font-mono flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  <span>Loading Asset Vault library...</span>
                </div>
              ) : vaultImages.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 mx-auto flex items-center justify-center text-zinc-400">
                    <FolderArchive className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-heading font-bold text-zinc-900 dark:text-white">
                    No images in local vault yet
                  </p>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Generate an image in Image Studio or upload files to populate your asset repository.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {vaultImages
                    .filter((img: any) => !vaultSearch.trim() || (img.filename || "").toLowerCase().includes(vaultSearch.toLowerCase()))
                    .map((img: any, idx: number) => (
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
                        className="group rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/80 hover:shadow-xl hover:shadow-emerald-500/10 text-left transition-all duration-200 relative aspect-video bg-zinc-950 cursor-pointer flex flex-col"
                      >
                        <LazyImage
                          src={getMediaUrl(img.url)}
                          alt={img.filename}
                          aspectRatio="aspect-video"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        
                        {/* Hover Overlay with 1-Click Select Badge */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 backdrop-blur-[1px]">
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-heading font-bold shadow-md flex items-center gap-1.5 transform scale-95 group-hover:scale-100 transition-transform">
                            <Check className="w-3.5 h-3.5" />
                            <span>Select Frame</span>
                          </span>
                        </div>

                        {/* Bottom Label Bar */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2.5 flex items-center justify-between">
                          <p className="text-[10px] font-mono text-zinc-200 truncate pr-1">
                            {img.filename || `frame_${idx + 1}.png`}
                          </p>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-white/80 shrink-0">
                            IMG
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-black/[0.06] dark:border-white/[0.06] bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between flex-wrap gap-2 text-xs font-mono text-zinc-500">
              <span className="text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Selected frame will automatically populate the active stage</span>
              </span>
              <button
                type="button"
                onClick={() => setVaultOpen(false)}
                className="px-4 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
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
        onSelectCharacter={(char) => {
          setActiveCharacter(char);
          setStoredActiveCharacter(char);
          setLockFace(true);
          setLockDress(true);
          setLockJewelry(true);
          setLockBackground(true);
          setLockHair(true);
          setLockLighting(true);
          setLockStyle(true);
          setLockPhysique(true);
          setCharacterLockActive(true);
        }}
        onUnlockCharacter={() => {
          setActiveCharacter(null);
          setStoredActiveCharacter(null);
        }}
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

      {/* Brand Kit Modal */}
      <BrandKitModal
        isOpen={brandKitModalOpen}
        onClose={() => setBrandKitModalOpen(false)}
      />

      {/* Audio & Music Production Library Modal */}
      <AudioMusicLibraryModal
        isOpen={audioLibraryOpen}
        onClose={() => setAudioLibraryOpen(false)}
        onSelectTrack={(t) => setSelectedBgmTrack(t)}
        initialSelectedId={selectedBgmTrack?.id}
      />

      {/* Prompt Vault Modal */}
      <PromptVaultModal
        isOpen={promptVaultOpen}
        onClose={() => setPromptVaultOpen(false)}
        onSelectPrompt={(pText, negText) => {
          setPrompt(pText);
          if (negText) {
            setNegativePrompt(negText);
            setShowNegativePrompt(true);
          }
        }}
        currentPrompt={prompt}
        currentNegativePrompt={negativePrompt}
        studioType="video"
      />
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
