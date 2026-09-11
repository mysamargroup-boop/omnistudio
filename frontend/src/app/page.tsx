"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  Video,
  Mic,
  ArrowRight,
  Sparkles,
  Zap,
  Film,
  Layers,
  Cpu,
  Play,
  ChevronRight,
  FolderArchive,
  Download,
  Copy,
  Check,
  X,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  ExternalLink,
  Eye,
  Camera,
  Activity,
  Share2,
  Calendar,
  Crosshair,
  SlidersHorizontal,
  Compass,
  Radio,
  Clock,
  Terminal,
  Gauge,
  Dices,
  Info,
  Sparkle,
  Plus,
  Pause,
  Scissors,
  Volume2,
  Clapperboard,
  Wand2
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import LazyImage from "@/components/ui/LazyImage";

interface StudioCard {
  href: string;
  title: string;
  tag: string;
  category: string;
  desc: string;
  icon: React.ElementType;
  badge: string;
  cta: string;
  features: string[];
  telemetry: string;
}

const STUDIO_CARDS: StudioCard[] = [
  {
    href: "/studio",
    title: "Cinema Director Studio",
    tag: "Unified Multi-Model Suite",
    category: "FLAGSHIP",
    desc: "Choreograph complete scenes with real-time prompt intelligence, multi-engine routing, and anamorphic 2.39:1 scope.",
    icon: Film,
    badge: "Cinema Master",
    cta: "Launch Studio",
    features: ["4K Multi-Engine", "Director AI Copilot", "Keyframe Staging", "Audio Sync Master"],
    telemetry: "ENGINE: V2.5_PRO • 3840x1608"
  },
  {
    href: "/video",
    title: "Motion Rig & Video",
    tag: "6-Axis Camera Kinematics",
    category: "MOTION",
    desc: "Precision virtual camera optics with orbit vector pad, crane elevation, Dutch roll, and first-to-last frame morphing.",
    icon: Video,
    badge: "Kling • Runway • Luma",
    cta: "Direct Motion",
    features: ["6-Axis Vector Pad", "2.39:1 Scope HUD", "Hardware FFmpeg", "24/60 FPS Master"],
    telemetry: "FOV: 35mm PRIME • T1.5"
  },
  {
    href: "/image",
    title: "Visual Diffusion",
    tag: "Optical Photorealism",
    category: "DIFFUSION",
    desc: "Generate high-fidelity imagery with physical lens focal lengths, aperture depth-of-field, and cinematic color palettes.",
    icon: ImageIcon,
    badge: "GPT-Image • Imagen 3",
    cta: "Create Visuals",
    features: ["35mm/85mm Optics", "Aperture & Bokeh", "Brand Kit Lock", "UHD 4K Raw"],
    telemetry: "DCI-P3 D65 • 16-BIT DEPTH"
  },
  {
    href: "/voice",
    title: "Neural Acoustic Suite",
    tag: "Speech Synthesis & Dubbing",
    category: "ACOUSTIC",
    desc: "Zero-cost Edge Neural TTS alongside ElevenLabs voice cloning, voice changer, and instant multi-lingual dubbing.",
    icon: Mic,
    badge: "Edge • ElevenLabs",
    cta: "Open Voice Booth",
    features: ["20+ Neural Voices", "Voice Cloning", "Zero-Cost Audio", "Lossless WAV/MP3"],
    telemetry: "LUFS: -14.0 • 48kHz STEREO"
  },
  {
    href: "/pipeline",
    title: "Cinema Agent Pipeline",
    tag: "Autonomous Screenplay & Film",
    category: "AUTONOMOUS",
    desc: "Feed a single prompt. The AI Director writes the screenplay, choreographs scenes, renders visuals, and composes a finished film.",
    icon: Layers,
    badge: "Full Autonomous",
    cta: "Launch Agent",
    features: ["Auto Screenplay", "Multi-Scene Shots", "Neural Narration", "Master Render"],
    telemetry: "PIPELINE: 4-STAGE AGENT"
  },
  {
    href: "/publish",
    title: "Omni Publish Studio",
    tag: "Multi-Network Social Dispatch",
    category: "DISTRIBUTION",
    desc: "Schedule and syndicate videos across 7 social networks with viral calendar presets, AI captions, and BYOK credentials.",
    icon: Share2,
    badge: "7 Social Networks",
    cta: "Open Dispatch",
    features: ["Modern Calendar", "BYOK API Keys", "Auto-Resizing", "Batch Scheduling"],
    telemetry: "NETWORKS: 7 ACTIVE CHANNELS"
  },
  {
    href: "/vault",
    title: "Cloud Asset Vault",
    tag: "Zero-Egress Storage & CDN",
    category: "STORAGE",
    desc: "Cloudflare R2 storage + VPS NVMe fast cache. Inspect full telemetry, zoom high-resolution frames, and export.",
    icon: FolderArchive,
    badge: "R2 + VPS NVMe",
    cta: "Browse Vault",
    features: ["Zero Egress Fees", "Fast NVMe Cache", "Telemetry Inspector", "Multi-Format Export"],
    telemetry: "STORAGE: R2 SYNCED"
  }
];

const PROMPT_SUGGESTIONS = [
  "35mm anamorphic, neon reflections, rain drenched asphalt, cyberpunk operative, slow orbit push-in",
  "Volumetric sunlight cutting through ancient emerald jungle temple, cinematic aerial drone pass",
  "Macro titanium mechanical hummingbird sipping nectar, shallow depth of field, 8k raw master",
  "Nordic cinematic wide shot, snow-covered fjords under aurora borealis, anamorphic 2.39:1 scope"
];

export interface PromptToken {
  label: string;
  name: string;
  weight: string;
  category: "optics" | "lighting" | "atmosphere" | "grade";
  desc: string;
}

const DEFAULT_TOKENS: PromptToken[] = [
  { label: "anamorphic:1.3", name: "Anamorphic Scope", weight: "1.3x", category: "optics", desc: "+30% attention: 2.39:1 scope lens flare & oval bokeh" },
  { label: "rain_slicked:1.1", name: "Rain Slicked", weight: "1.1x", category: "atmosphere", desc: "+10% attention: Wet asphalt reflections & puddle caustics" },
  { label: "chiaroscuro:1.4", name: "Chiaroscuro", weight: "1.4x", category: "lighting", desc: "+40% attention: High-contrast chiaroscuro Rembrandt rim lighting" },
  { label: "35mm_prime:1.2", name: "35mm Prime", weight: "1.2x", category: "optics", desc: "+20% attention: Zeiss Master Prime optical focal depth" },
  { label: "volumetric_fog:1.1", name: "Volumetric Fog", weight: "1.1x", category: "atmosphere", desc: "+10% attention: Raymarched atmospheric sunlight haze" },
  { label: "kodak_5219:1.2", name: "Kodak 5219", weight: "1.2x", category: "grade", desc: "+20% attention: 35mm motion picture celluloid film grain" }
];

const STORYBOARD_FALLBACK = [
  {
    id: "01",
    title: "Cyberpunk Alley Encounter",
    duration: "4.0s",
    ratio: "2.39:1",
    status: "PASS",
    statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    motion: "Pan R 15° • Dolly 2.2m/s",
    lens: "35mm Prime T1.5",
    url: "/outputs/images/indian_couple_prewedding.jpg",
    isVideo: false,
    rawAsset: null as any
  },
  {
    id: "02",
    title: "Hero Close Reaction",
    duration: "3.5s",
    ratio: "2.39:1",
    status: "ACTIVE",
    statusColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    motion: "Push-In • 50mm T1.5",
    lens: "50mm Anamorphic",
    url: "/outputs/images/indian_woman_lehenga.jpg",
    isVideo: false,
    rawAsset: null as any
  },
  {
    id: "03",
    title: "Alien Crystalline Plain",
    duration: "6.0s",
    ratio: "2.39:1",
    status: "QUEUED",
    statusColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    motion: "Crane Down 18m/s",
    lens: "24mm Ultra-Wide",
    url: "",
    isVideo: false,
    rawAsset: null as any
  },
  {
    id: "04",
    title: "Atmosphere Entry",
    duration: "3.6s",
    ratio: "2.39:1",
    status: "DRAFT",
    statusColor: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
    motion: "Dynamic Handheld",
    lens: "35mm Scope",
    url: "",
    isVideo: false,
    rawAsset: null as any
  }
];

function formatBytes(bytes?: number) {
  if (!bytes || bytes === 0) return "—";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("2.39:1");
  const [activeTokens, setActiveTokens] = useState<string[]>([]);
  const [tokenList, setTokenList] = useState<PromptToken[]>(DEFAULT_TOKENS);
  const [customTokenInput, setCustomTokenInput] = useState("");
  const [showAddToken, setShowAddToken] = useState(false);
  const [seed, setSeed] = useState("890241944810");
  const [showTokenGuide, setShowTokenGuide] = useState(false);
  const [recentAssets, setRecentAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Accurate dynamic token budget calculation
  const tokenMetrics = useMemo(() => {
    const rawWords = prompt.trim() ? prompt.trim().split(/\s+/).filter(Boolean) : [];
    const promptTokens = rawWords.length === 0 ? 0 : Math.round(rawWords.length * 1.3);
    const modifierTokens = activeTokens.length * 2;
    const total = Math.min(promptTokens + modifierTokens, 75);
    return {
      promptTokens,
      modifierTokens,
      total,
      isNearLimit: total >= 65,
      isWarning: total >= 50,
    };
  }, [prompt, activeTokens]);

  // In-place Modal / Lightbox State
  const [activeAsset, setActiveAsset] = useState<any | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    async function loadRecent() {
      try {
        const res = await api.getAllAssets();
        if (res) {
          const combined = [
            ...(res.final || []).map((item: any) => ({ ...item, assetCategory: "Film Master" })),
            ...(res.videos || []).map((item: any) => ({ ...item, assetCategory: "Video Scene" })),
            ...(res.images || []).map((item: any) => ({ ...item, assetCategory: "Image Render" }))
          ].sort((a, b) => (b.modified || 0) - (a.modified || 0));
          setRecentAssets(combined.slice(0, 8));
        }
      } catch (err) {
        console.error("Failed to load recent vault assets", err);
      } finally {
        setLoading(false);
      }
    }
    loadRecent();
  }, []);

  // Interactive Storyboard States
  const [selectedShotId, setSelectedShotId] = useState<string>("02");
  const [isPlayingSequence, setIsPlayingSequence] = useState<boolean>(false);
  const [sequenceProgress, setSequenceProgress] = useState<number>(35);
  const [shotTransitions, setShotTransitions] = useState<Record<string, string>>({
    "01": "CUT",
    "02": "DISSOLVE 0.5s",
    "03": "WHIP PAN",
  });
  const [customShotDurations, setCustomShotDurations] = useState<Record<string, number>>({
    "01": 3.0,
    "02": 3.0,
    "03": 3.0,
    "04": 3.0,
  });
  const [customLenses, setCustomLenses] = useState<Record<string, string>>({});
  const [customMotions, setCustomMotions] = useState<Record<string, string>>({});

  // Play sequence simulation
  useEffect(() => {
    let timer: any;
    if (isPlayingSequence) {
      timer = setInterval(() => {
        setSequenceProgress((prev) => {
          if (prev >= 100) {
            setIsPlayingSequence(false);
            return 0;
          }
          const nextVal = prev + 1.5;
          const shotIndex = Math.min(3, Math.floor(nextVal / 25));
          setSelectedShotId(`0${shotIndex + 1}`);
          return nextVal;
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isPlayingSequence]);

  const cycleTransition = (shotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const transitions = ["CUT", "DISSOLVE 0.5s", "WHIP PAN", "FADE BLACK"];
    setShotTransitions((prev) => {
      const current = prev[shotId] || "CUT";
      const nextIdx = (transitions.indexOf(current) + 1) % transitions.length;
      return { ...prev, [shotId]: transitions[nextIdx] };
    });
  };

  const adjustDuration = (shotId: string, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomShotDurations((prev) => {
      const curr = prev[shotId] || 3.0;
      const updated = Math.max(1.0, Math.min(10.0, Number((curr + delta).toFixed(1))));
      return { ...prev, [shotId]: updated };
    });
  };

  const totalSequenceSeconds = React.useMemo(() => {
    return Object.values(customShotDurations).reduce((acc, curr) => acc + curr, 0);
  }, [customShotDurations]);

  // Compute Real Storyboard Shots dynamically from Vault assets
  const realStoryboardShots = React.useMemo(() => {
    if (recentAssets && recentAssets.length > 0) {
      return recentAssets.slice(0, 4).map((asset, idx) => {
        const isVideo = asset.url?.endsWith(".mp4") || asset.assetCategory === "Video Scene" || asset.assetCategory === "Film Master";
        const cleanTitle = asset.filename
          ? asset.filename.replace(/[-_]/g, " ").replace(/\.\w+$/, "")
          : asset.prompt ? asset.prompt.slice(0, 32) + "..." : `Sequence Shot 0${idx + 1}`;

        const lensPresets = [
          "35mm Anamorphic T1.5",
          "85mm Portrait Cine",
          "24mm Ultra-Wide Angle",
          "50mm Master Prime T1.4"
        ];
        const motionPresets = [
          "Pan R 15° • Dolly 2.2m/s",
          "Slow Push-In • Orbit 45°",
          "Crane Descend 12m/s",
          "Dynamic Handheld Track"
        ];

        const shotId = `0${idx + 1}`;
        const dur = customShotDurations[shotId] || (isVideo ? 4.5 : 3.0);
        const lens = customLenses[shotId] || lensPresets[idx % lensPresets.length];
        const motion = customMotions[shotId] || motionPresets[idx % motionPresets.length];

        return {
          id: shotId,
          title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
          duration: `${dur.toFixed(1)}s`,
          ratio: "2.39:1",
          status: isVideo ? "RENDERED" : "READY",
          statusColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
          motion,
          lens,
          url: asset.url,
          isVideo,
          rawAsset: asset
        };
      });
    }

    return STORYBOARD_FALLBACK.map((shot) => ({
      ...shot,
      duration: `${(customShotDurations[shot.id] || parseFloat(shot.duration)).toFixed(1)}s`,
      lens: customLenses[shot.id] || shot.lens,
      motion: customMotions[shot.id] || shot.motion,
    }));
  }, [recentAssets, customShotDurations, customLenses, customMotions]);

  const handleRandomizeSeed = () => {
    setSeed(Math.floor(100000000000 + Math.random() * 900000000000).toString());
  };

  const handleAddCustomToken = () => {
    if (!customTokenInput.trim()) return;
    let clean = customTokenInput.trim().toLowerCase();
    if (!clean.includes(":")) {
      clean = `${clean}:1.2`;
    }
    const [namePart, weightPart] = clean.split(":");
    const newToken: PromptToken = {
      label: clean,
      name: namePart.replace(/_/g, " "),
      weight: `${weightPart}x`,
      category: "optics",
      desc: `Custom attention multiplier ${weightPart}x`
    };
    if (!tokenList.some((t) => t.label === clean)) {
      setTokenList((prev) => [...prev, newToken]);
    }
    if (!activeTokens.includes(clean)) {
      setActiveTokens((prev) => [...prev, clean]);
    }
    setCustomTokenInput("");
    setShowAddToken(false);
  };

  // Keyboard shortcut support for in-place lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeAsset) return;
      if (e.key === "Escape") {
        setActiveAsset(null);
        setZoomLevel(1);
      }
      if (e.key === "+" || e.key === "=") {
        setZoomLevel((prev) => Math.min(prev + 0.25, 3));
      }
      if (e.key === "-") {
        setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
      }
      if (e.key === "0") {
        setZoomLevel(1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeAsset]);

  const handleLaunchPrompt = (text: string) => {
    if (!text.trim()) return;
    const fullPrompt = activeTokens.length > 0 ? `${text}, ${activeTokens.join(", ")}` : text;
    router.push(`/studio?prompt=${encodeURIComponent(fullPrompt)}&ratio=${encodeURIComponent(aspectRatio)}`);
  };

  const toggleToken = (tok: string) => {
    setActiveTokens((prev) =>
      prev.includes(tok) ? prev.filter((t) => t !== tok) : [...prev, tok]
    );
  };

  const openAssetModal = (asset: any) => {
    setActiveAsset(asset);
    setZoomLevel(1);
    setCopied(false);
  };

  const copyAssetUrl = async () => {
    if (!activeAsset) return;
    await navigator.clipboard.writeText(getMediaUrl(activeAsset.url));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-8 pb-20 animate-in fade-in duration-300 font-sans">

      {/* TOP STUDIO TELEMETRY BAR (Synthex / Higgsfield Inspired) */}
      <div className="w-full bg-white dark:bg-[#0E0E10] border border-black/[0.08] dark:border-[#2A2A2D] rounded-xl px-3 py-2 flex items-center justify-between flex-wrap gap-2 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 select-none shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-zinc-950 dark:text-white">OMNISTUDIO</span>
            <span className="text-zinc-400 dark:text-zinc-600">/</span>
            <span className="text-zinc-700 dark:text-zinc-300">PRO_SUITE</span>
          </div>
          <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">|</span>
          <span className="hidden md:inline text-zinc-500">PROJ: <span className="text-zinc-700 dark:text-zinc-300">NEURAL_DIRECTOR_2026</span></span>
          <span className="hidden lg:inline text-zinc-300 dark:text-zinc-700">|</span>
          <span className="hidden lg:inline text-zinc-500">RENDER_ENGINE: <span className="text-zinc-700 dark:text-zinc-300">HIGGSFIELD_CINEMA_V2.5_PRO</span></span>
        </div>

        <div className="flex items-center gap-3 flex-wrap ml-auto">
          <span className="text-zinc-500 hidden sm:inline">COLOR: <span className="text-zinc-700 dark:text-zinc-300">DCI-P3 D65</span></span>
          <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">|</span>
          <span className="text-zinc-500 hidden md:inline">SCOPE: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">2.39:1 RAW</span></span>
          <span className="text-zinc-300 dark:text-zinc-700 hidden md:inline">|</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span>ONLINE</span>
          </div>
        </div>
      </div>

      {/* HERO COMMAND CENTER: POSITIVE PROMPT MATRIX & DIRECTOR RIG CONTROLS */}
      {/* HERO COMMAND CENTER: POSITIVE PROMPT MATRIX & DIRECTOR RIG CONTROLS (Cinematic Gradient Border) */}
      <section className="relative rounded-3xl p-[1.5px] bg-gradient-to-r from-emerald-500/50 via-cyan-500/40 to-violet-500/50 shadow-2xl shadow-emerald-500/10 group">
        {/* Inner Dark Glass Director Deck */}
        <div className="relative rounded-[23px] bg-white/95 dark:bg-[#0c0c14]/95 backdrop-blur-2xl p-5 sm:p-6 space-y-5 overflow-hidden">
          {/* Subtle Viewfinder Optical Reticle Brackets */}
          <div className="absolute top-3 left-3 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-500/50 pointer-events-none" />
          <div className="absolute top-3 right-3 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-500/50 pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-500/50 pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-3.5 h-3.5 border-b-2 border-r-2 border-violet-500/50 pointer-events-none" />

          {/* Radial Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Top Director Slate Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-black/[0.08] dark:border-[#202026] pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-[10px] font-mono font-bold tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>REC 24.00 FPS</span>
              </div>
              <Terminal className="w-4 h-4 text-emerald-500" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Positive Prompt Matrix</span>
                <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-500 hidden sm:inline">// CINEMA DIRECTOR DECK</span>
              </h2>
            </div>

            <div className="flex items-center gap-2.5 text-[10px] font-mono">
              {/* Dynamic Accurate Token Budget Counter */}
              <div
                className="flex items-center gap-1.5 bg-zinc-100 dark:bg-[#13131a] px-2.5 py-1 rounded-lg border border-black/[0.06] dark:border-[#2A2A35]"
                title={`Prompt Text: ${tokenMetrics.promptTokens} tok | Modifiers: ${tokenMetrics.modifierTokens} tok (Max: 75 tokens)`}
              >
                <span className="text-zinc-500">TOKENS:</span>
                <span className={cn(
                  "font-bold font-mono",
                  tokenMetrics.isNearLimit ? "text-rose-500" : tokenMetrics.isWarning ? "text-amber-500" : "text-emerald-500"
                )}>
                  {tokenMetrics.total}/75
                </span>
                <button
                  type="button"
                  onClick={() => setShowTokenGuide((prev) => !prev)}
                  className="ml-1 text-zinc-400 hover:text-emerald-500 transition-colors cursor-pointer"
                  title="What are Tokens & Weights?"
                >
                  <Info className="w-3 h-3" />
                </button>
              </div>

              <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">•</span>

              {/* Interactive Seed Box */}
              <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-[#13131a] px-2.5 py-1 rounded-lg border border-black/[0.06] dark:border-[#2A2A35]">
                <span className="text-zinc-500">SEED:</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-mono font-semibold">{seed}</span>
                <button
                  type="button"
                  onClick={handleRandomizeSeed}
                  className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Generate Random Seed"
                >
                  <Dices className="w-3.5 h-3.5 text-emerald-500" />
                </button>
              </div>
            </div>
          </div>

        {/* Informational Token Guide Drawer */}
        {showTokenGuide && (
          <div className="p-3.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/30 space-y-2 text-xs font-mono animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold">
              <span className="flex items-center gap-1.5">
                <Sparkle className="w-3.5 h-3.5 text-emerald-500" />
                Prompt Tokens & Attention Weights Guide
              </span>
              <button
                type="button"
                onClick={() => setShowTokenGuide(false)}
                className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-950 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
              <strong>Tokens</strong> AI diffusion model (CLIP/T5) ke sub-words hote hain (Standard Limit: 75). Har token ke saath <code>:weight</code> (jaise <code>:1.3</code>) lagane se AI us specific visual attribute ko <strong>30% extra boost aur priority</strong> deta hai.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px]">
              <div className="p-1.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-800 dark:text-cyan-300">
                <span className="font-bold block">Optics (:1.2 - :1.4)</span>
                <span>Camera lens & bokeh</span>
              </div>
              <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                <span className="font-bold block">Atmosphere (:1.1 - :1.3)</span>
                <span>Weather, rain & fog</span>
              </div>
              <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
                <span className="font-bold block">Lighting (:1.2 - :1.5)</span>
                <span>Chiaroscuro & rim light</span>
              </div>
              <div className="p-1.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-800 dark:text-purple-300">
                <span className="font-bold block">Grade (:1.1 - :1.3)</span>
                <span>Film stocks & color tone</span>
              </div>
            </div>
          </div>
        )}

        {/* Command Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLaunchPrompt(prompt);
          }}
          className="space-y-4"
        >
          {/* Main Input Matrix Area */}
          <div className="relative rounded-xl border border-black/[0.08] dark:border-[#2A2A2D] bg-zinc-50/80 dark:bg-[#0E0E10] focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all p-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe any cinematic sequence, actor choreography, camera optics, or visual diffusion prompt... (e.g. 35mm anamorphic, neon reflections, rain drenched asphalt, cyberpunk operative)"
              rows={3}
              className="w-full bg-transparent text-sm sm:text-base text-zinc-900 dark:text-[#F7F7F6] placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none resize-none font-sans leading-relaxed"
            />

            {/* Token Chips Row with Category Highlights */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-black/[0.06] dark:border-[#1C1B1C] mt-2 text-[11px] font-mono">
              <span className="text-zinc-500 text-[10px] uppercase font-bold mr-1 flex items-center gap-1">
                <span>Tokens:</span>
              </span>

              {tokenList.map((tok) => {
                const isSelected = activeTokens.includes(tok.label);
                const categoryClasses = {
                  optics: isSelected
                    ? "bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 border-cyan-500/40 shadow-xs ring-1 ring-cyan-500/30"
                    : "hover:border-cyan-500/30 text-zinc-600 dark:text-zinc-400",
                  atmosphere: isSelected
                    ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/40 shadow-xs ring-1 ring-emerald-500/30"
                    : "hover:border-emerald-500/30 text-zinc-600 dark:text-zinc-400",
                  lighting: isSelected
                    ? "bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40 shadow-xs ring-1 ring-amber-500/30"
                    : "hover:border-amber-500/30 text-zinc-600 dark:text-zinc-400",
                  grade: isSelected
                    ? "bg-purple-500/20 text-purple-800 dark:text-purple-200 border-purple-500/40 shadow-xs ring-1 ring-purple-500/30"
                    : "hover:border-purple-500/30 text-zinc-600 dark:text-zinc-400",
                }[tok.category] || "text-zinc-600 dark:text-zinc-400";

                return (
                  <button
                    key={tok.label}
                    type="button"
                    onClick={() => toggleToken(tok.label)}
                    title={tok.desc}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer border flex items-center gap-1.5",
                      isSelected
                        ? categoryClasses
                        : "bg-white dark:bg-[#161618] border-black/[0.08] dark:border-[#2A2A2D] hover:text-zinc-950 dark:hover:text-zinc-200"
                    )}
                  >
                    <span>{tok.name}</span>
                    <span className={cn(
                      "text-[9px] px-1 py-0.2 rounded font-bold",
                      isSelected ? "bg-black/20 dark:bg-white/20" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    )}>
                      {tok.weight}
                    </span>
                    <span className="text-[10px] font-bold opacity-75">{isSelected ? "×" : "+"}</span>
                  </button>
                );
              })}

              {/* Add Custom Token Input */}
              {showAddToken ? (
                <div className="flex items-center gap-1 bg-white dark:bg-[#161618] border border-emerald-500/50 rounded-lg px-1.5 py-0.5">
                  <input
                    type="text"
                    value={customTokenInput}
                    onChange={(e) => setCustomTokenInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomToken();
                      }
                      if (e.key === "Escape") {
                        setShowAddToken(false);
                      }
                    }}
                    placeholder="tag:1.3"
                    className="w-20 bg-transparent text-[11px] font-mono text-zinc-900 dark:text-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomToken}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold px-1 hover:underline cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddToken(false)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddToken(true)}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/50 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Custom Token</span>
                </button>
              )}
            </div>
          </div>

          {/* Direct Camera Controls & Execution Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
            {/* Aspect Ratio Selector with Highlighted Active Pill */}
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-[#0E0E10] border border-black/[0.08] dark:border-[#2A2A2D] rounded-xl p-1 text-[11px] font-mono">
              {[
                { label: "2.39:1", name: "Anamorphic Scope" },
                { label: "16:9", name: "Cinema Standard" },
                { label: "9:16", name: "Vertical Reel" },
                { label: "1:1", name: "Square Master" }
              ].map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => setAspectRatio(r.label)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-mono text-xs",
                    aspectRatio === r.label
                      ? "bg-white dark:bg-[#2A2A2D] text-zinc-950 dark:text-white font-bold shadow-xs border border-emerald-500/40 ring-1 ring-emerald-500/20"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                  )}
                >
                  <span>{r.label}</span>
                  <span className="hidden sm:inline text-[9px] text-zinc-400 dark:text-zinc-500 font-normal">({r.name})</span>
                </button>
              ))}
            </div>

            {/* Rig Shortcut & High-Visibility Primary Execute CTA */}
            <div className="flex items-center gap-2 ml-auto">
              <Link
                href="/video"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1C1B1C] dark:hover:bg-[#252528] border border-black/[0.08] dark:border-[#2A2A2D] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-500" />
                <span>6-Axis Kinematics Rig</span>
              </Link>

              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-800 hover:from-black hover:to-zinc-900 text-white dark:from-white dark:via-zinc-100 dark:to-zinc-200 dark:hover:from-white dark:hover:to-white dark:text-zinc-950 font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md ring-1 ring-emerald-500/30 hover:shadow-emerald-500/10 active:scale-95"
              >
                <Film className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                <span>Execute Shot</span>
                <span className="hidden sm:inline text-[10px] opacity-70 border-l border-white/20 dark:border-black/20 pl-1.5">[⌘ ↵]</span>
              </button>
            </div>
          </div>

          {/* Quick Preset Ideas Strip */}
          <div className="flex items-center gap-2 pt-1 overflow-x-auto hide-scrollbar text-xs font-mono">
            <span className="text-zinc-500 text-[10px] uppercase font-bold shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              Presets:
            </span>
            {PROMPT_SUGGESTIONS.map((idea, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(idea);
                  handleLaunchPrompt(idea);
                }}
                className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-[#0E0E10] hover:bg-zinc-200 dark:hover:bg-[#1A1A1C] hover:border-emerald-500/30 text-zinc-700 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200 transition-colors whitespace-nowrap cursor-pointer text-[11px] border border-black/[0.08] dark:border-[#2A2A2D] truncate max-w-xs"
                title={idea}
              >
                {idea}
              </button>
            ))}
          </div>
        </form>
        </div>
      </section>

      {/* CINEMATIC STORYBOARD SEQUENCE STRIP (Hollywood NLE Film Reel Deck with Gradient Border) */}
      <section className="relative rounded-3xl p-[1.5px] bg-gradient-to-r from-violet-500/40 via-emerald-500/40 to-cyan-500/40 shadow-2xl shadow-cyan-500/10 group text-left">
        {/* Inner Hollywood NLE Deck */}
        <div className="relative rounded-[23px] bg-white/95 dark:bg-[#0c0c14]/95 backdrop-blur-2xl p-4 sm:p-5 space-y-4 overflow-hidden">
          {/* Viewfinder Reticle Corner Accents */}
          <div className="absolute top-3 left-3 w-3.5 h-3.5 border-t-2 border-l-2 border-violet-500/50 pointer-events-none" />
          <div className="absolute top-3 right-3 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-500/50 pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-500/50 pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-3.5 h-3.5 border-b-2 border-r-2 border-violet-500/50 pointer-events-none" />

          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/[0.08] dark:border-[#202026] pb-3.5 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <Clapperboard className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>Storyboard Multi-Shot Sequence</span>
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    REAL MEDIA TIMELINE
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 font-medium">
                    • 4-Shot Continuity
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                  Staged multi-angle keyframes with 6-axis camera vectors &amp; automated scene continuity
                </p>
              </div>
            </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            {/* Play All Sequence Simulation Button */}
            <button
              type="button"
              onClick={() => setIsPlayingSequence(!isPlayingSequence)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-xs border cursor-pointer",
                isPlayingSequence
                  ? "bg-amber-500 text-black border-amber-400 shadow-amber-500/20"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-emerald-950/20"
              )}
            >
              {isPlayingSequence ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>PAUSE SEQUENCE</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>PLAY SEQUENCE</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-900/80 px-2.5 py-1.5 rounded-lg border border-black/[0.06] dark:border-[#2A2A2D]">
              <span>TOTAL: <strong className="text-zinc-800 dark:text-zinc-200 font-bold font-mono">{totalSequenceSeconds.toFixed(1)}s</strong></span>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <Link href="/video" className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1">
                FULL TIMELINE →
              </Link>
            </div>
          </div>
        </div>

        {/* Visual Timeline Track Ruler & Scrubber */}
        <div className="bg-zinc-100 dark:bg-[#0A0A0C] border border-black/[0.06] dark:border-[#2A2A2D] rounded-xl p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 font-bold">
              <Clock className="w-3 h-3 text-emerald-500" />
              <span>TIMELINE SCRUBBER &amp; SYNC</span>
            </span>
            <span className="font-bold text-zinc-700 dark:text-zinc-300">
              {((sequenceProgress / 100) * totalSequenceSeconds).toFixed(1)}s / {totalSequenceSeconds.toFixed(1)}s • 24 FPS MASTER
            </span>
          </div>

          {/* Interactive Progress Bar with Shot segments */}
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const pct = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
              setSequenceProgress(pct);
              const shotIdx = Math.min(3, Math.floor(pct / 25));
              setSelectedShotId(`0${shotIdx + 1}`);
            }}
            className="relative h-6 bg-zinc-200 dark:bg-zinc-900 rounded-lg overflow-hidden cursor-pointer flex border border-black/[0.06] dark:border-[#2A2A2D]"
          >
            {/* Segment blocks for each shot */}
            {realStoryboardShots.map((shot) => {
              const isSelected = selectedShotId === shot.id;
              return (
                <div
                  key={shot.id}
                  className={cn(
                    "h-full flex-1 border-r last:border-r-0 border-black/10 dark:border-white/10 flex items-center justify-between px-2 text-[9px] font-mono transition-colors",
                    isSelected
                      ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold"
                      : "bg-transparent text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5"
                  )}
                >
                  <span>SHOT {shot.id}</span>
                  <span>{shot.duration}</span>
                </div>
              );
            })}

            {/* Playhead Marker */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-emerald-500 shadow-md transition-all duration-100 pointer-events-none"
              style={{ left: `${sequenceProgress}%` }}
            >
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-emerald-500 rounded-full shadow-xs" />
            </div>
          </div>
        </div>

        {/* Shot Sequence Cards Grid with Connectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative">
          {realStoryboardShots.map((shot, idx) => {
            const hasMedia = !!shot.url;
            const isSelected = selectedShotId === shot.id;
            const transition = shotTransitions[shot.id] || "CUT";

            return (
              <div key={shot.id} className="relative flex flex-col">
                <div
                  onClick={() => setSelectedShotId(shot.id)}
                  className={cn(
                    "group rounded-xl border bg-zinc-50/70 dark:bg-[#0E0E10] p-3 cursor-pointer space-y-2.5 flex flex-col justify-between transition-all duration-200 shadow-xs h-full",
                    isSelected
                      ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/10 dark:bg-emerald-950/20 shadow-md"
                      : "border-black/[0.08] dark:border-[#2A2A2D] hover:border-emerald-500/50 hover:shadow-md dark:hover:border-emerald-500/40"
                  )}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "font-bold transition-colors",
                        isSelected ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-zinc-900 dark:text-zinc-100"
                      )}>
                        SHOT {shot.id}
                      </span>
                      <div className="flex items-center gap-1 bg-zinc-200/70 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-zinc-600 dark:text-zinc-300">
                        <button
                          type="button"
                          onClick={(e) => adjustDuration(shot.id, -0.5, e)}
                          className="hover:text-black dark:hover:text-white font-bold cursor-pointer px-0.5"
                          title="Decrease duration by 0.5s"
                        >
                          -
                        </button>
                        <span>{shot.duration}</span>
                        <button
                          type="button"
                          onClick={(e) => adjustDuration(shot.id, 0.5, e)}
                          className="hover:text-black dark:hover:text-white font-bold cursor-pointer px-0.5"
                          title="Increase duration by 0.5s"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold border", shot.statusColor)}>
                      {shot.status}
                    </span>
                  </div>

                  {/* Cinematic Letterbox Preview with Real Media & Hover Video Scrub */}
                  <div className="relative aspect-[2.39/1] w-full rounded-lg bg-zinc-900 overflow-hidden border border-black/[0.06] dark:border-[#2A2A2D] group/media">
                    {hasMedia ? (
                      shot.isVideo ? (
                        <>
                          <video
                            src={getMediaUrl(shot.url)}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                            onMouseEnter={(e) => {
                              try { e.currentTarget.play().catch(() => {}); } catch {}
                            }}
                            onMouseLeave={(e) => {
                              try { e.currentTarget.pause(); e.currentTarget.currentTime = 0; } catch {}
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover/media:opacity-100 group-hover/media:scale-110 transition-all pointer-events-none">
                            <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
                              <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <LazyImage
                            src={getMediaUrl(shot.url)}
                            alt={shot.title}
                            className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        </>
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-950">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                        <Crosshair className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors z-20" />
                      </div>
                    )}

                    {/* Scope Overlay Reticle */}
                    <div className="absolute bottom-1.5 left-2 z-20 text-[9px] font-mono text-white/90 font-semibold drop-shadow-md">
                      {shot.ratio} RAW
                    </div>
                    <div className="absolute top-1.5 right-1.5 z-20 text-[8px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-emerald-300 border border-emerald-500/30 backdrop-blur-xs">
                      {hasMedia ? "REAL MEDIA" : "VIRTUAL CAM"}
                    </div>

                    {/* Lightbox Quick View Icon */}
                    {shot.rawAsset && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAssetModal(shot.rawAsset);
                        }}
                        className="absolute top-1.5 left-1.5 z-20 p-1 rounded bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 opacity-0 group-hover/media:opacity-100 transition-opacity cursor-pointer"
                        title="Enlarge Keyframe"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Shot Meta Details */}
                  <div className="space-y-1 text-[11px] font-mono text-left">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {shot.title}
                    </div>
                    <div className="text-zinc-500 text-[10px] truncate flex items-center gap-1">
                      <Compass className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>{shot.motion}</span>
                    </div>
                    <div className="text-zinc-400 dark:text-zinc-500 text-[10px] truncate flex items-center gap-1">
                      <Camera className="w-3 h-3 text-sky-400 shrink-0" />
                      <span>{shot.lens}</span>
                    </div>
                  </div>

                  {/* Transition Connector Pill at Card Bottom (if not last card) */}
                  {idx < 3 && (
                    <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between text-[9px] font-mono">
                      <span className="text-zinc-400">TRANSITION:</span>
                      <button
                        type="button"
                        onClick={(e) => cycleTransition(shot.id, e)}
                        className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-emerald-500/20 text-zinc-700 dark:text-zinc-300 hover:text-emerald-400 font-bold border border-black/[0.06] dark:border-white/10 transition-colors cursor-pointer"
                        title="Click to switch transition type"
                      >
                        {transition} ⟳
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ACTIVE SHOT DIRECTOR & KINEMATICS CONTROL BAR */}
        {(() => {
          const activeShot = realStoryboardShots.find((s) => s.id === selectedShotId) || realStoryboardShots[0];
          return (
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#0B0B0D] border border-emerald-500/30 dark:border-emerald-500/20 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-left animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono font-bold text-xs shrink-0 border border-emerald-500/30">
                  {activeShot.id}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      SHOT {activeShot.id} DIRECTIVE INSPECTOR:
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[220px]">
                      {activeShot.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-zinc-500 flex-wrap">
                    <span>Current Lens: <strong className="text-zinc-700 dark:text-zinc-300">{activeShot.lens}</strong></span>
                    <span>•</span>
                    <span>Kinematics: <strong className="text-zinc-700 dark:text-zinc-300">{activeShot.motion}</strong></span>
                    <span>•</span>
                    <span>Duration: <strong className="text-zinc-700 dark:text-zinc-300">{activeShot.duration}</strong></span>
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons for Selected Shot */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-black/[0.06] dark:border-[#2A2A2D]">
                  <span className="text-[10px] font-mono text-zinc-400 px-1.5">LENS:</span>
                  {["24mm Wide", "35mm Cine", "50mm Prime", "85mm Tele"].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setCustomLenses(prev => ({ ...prev, [activeShot.id]: l }))}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer",
                        (customLenses[activeShot.id] || activeShot.lens).includes(l.split(" ")[0])
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                <Link
                  href="/video"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition-all shadow-xs shrink-0"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>DIRECT IN MOTION RIG</span>
                </Link>
              </div>
            </div>
          );
        })()}

        {/* Multi-Shot Timeline Track Ribbon Footer */}
        <div className="pt-2 border-t border-black/[0.06] dark:border-[#2A2A2D] flex items-center justify-between flex-wrap gap-2 text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-zinc-700 dark:text-zinc-300">SEQUENCE CONTINUITY:</span>
            <span>Shot 01 (00:00)</span>
            <span>→</span>
            <span>Shot 02 ({customShotDurations["01"]?.toFixed(1) || "3.0"}s)</span>
            <span>→</span>
            <span>Shot 03 ({((customShotDurations["01"] || 3.0) + (customShotDurations["02"] || 3.0)).toFixed(1)}s)</span>
            <span>→</span>
            <span>Shot 04 ({((customShotDurations["01"] || 3.0) + (customShotDurations["02"] || 3.0) + (customShotDurations["03"] || 3.0)).toFixed(1)}s)</span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-zinc-400">PRORES 422 MASTER</span>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">4K DCI-P3 24FPS</span>
          </div>
        </div>
        </div>
      </section>

      {/* PORTRAIT CREATIVE STUDIOS GRID (Synthex Pro Card System) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-black/[0.08] dark:border-[#2A2A2D] pb-2.5">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
                Studio Workstations & Neural Engines
              </h2>
            </div>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            7 DEDICATED SUITES
          </span>
        </div>

        {/* High-density architectural grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {STUDIO_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className="group rounded-xl border border-black/[0.08] dark:border-[#2A2A2D] bg-white dark:bg-[#131314] hover:bg-zinc-50/80 dark:hover:bg-[#161618] hover:border-black/[0.15] dark:hover:border-zinc-500 transition-all duration-200 p-4 flex flex-col justify-between cursor-pointer space-y-4 shadow-xs"
              >
                {/* Header */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-[#1C1B1C] border border-black/[0.08] dark:border-[#2A2A2D] flex items-center justify-center text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-950 dark:group-hover:text-white group-hover:border-zinc-400 dark:group-hover:border-zinc-500 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-[#1A1A1C] text-zinc-600 dark:text-zinc-400 border border-black/[0.08] dark:border-[#2A2A2D] font-bold">
                      {card.category}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-sans font-bold text-zinc-950 dark:text-[#F7F7F6] group-hover:text-violet-600 dark:group-hover:text-white transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                      {card.tag}
                    </p>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3 font-sans">
                    {card.desc}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {card.features.slice(0, 3).map((feat, fIdx) => (
                      <span
                        key={fIdx}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-[#0E0E10] text-zinc-600 dark:text-zinc-400 border border-black/[0.06] dark:border-[#2A2A2D]"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Telemetry & CTA */}
                <div className="pt-3 border-t border-black/[0.06] dark:border-[#2A2A2D] flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-500 truncate max-w-[140px]">{card.telemetry}</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-bold uppercase tracking-wider flex items-center gap-1 group-hover:text-violet-600 dark:group-hover:text-white transition-colors">
                    <span>{card.cta}</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* HOSTINGER VPS & PRODUCTION TELEMETRY */}
      <section className="rounded-xl border border-black/[0.08] dark:border-[#2A2A2D] bg-white dark:bg-[#131314] p-4 sm:p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-black/[0.08] dark:border-[#2A2A2D] pb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
              Hostinger VPS KVM Telemetry & Hardware State
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ALL SYSTEMS NOMINAL • ZERO BILLING ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-zinc-50/80 dark:bg-[#0E0E10] border border-black/[0.06] dark:border-[#2A2A2D] space-y-1">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Video Compiler</span>
            <div className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-200 flex items-center justify-between">
              <span>FFmpeg 5.1 / 8.1</span>
              <span className="text-[9px] text-zinc-500">NVENC / CPU</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 block">1080p Cinema Master</span>
          </div>

          <div className="p-3 rounded-lg bg-zinc-50/80 dark:bg-[#0E0E10] border border-black/[0.06] dark:border-[#2A2A2D] space-y-1">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Visual Diffusion</span>
            <div className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-200 flex items-center justify-between">
              <span>OpenAI + Imagen</span>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Ready</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 block">GPT-Image & Imagen 3</span>
          </div>

          <div className="p-3 rounded-lg bg-zinc-50/80 dark:bg-[#0E0E10] border border-black/[0.06] dark:border-[#2A2A2D] space-y-1">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Neural Acoustic</span>
            <div className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-200 flex items-center justify-between">
              <span>Edge + Eleven</span>
              <span className="text-[9px] text-zinc-500">20+ Langs</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 block">Zero-Cost Edge TTS</span>
          </div>

          <div className="p-3 rounded-lg bg-zinc-50/80 dark:bg-[#0E0E10] border border-black/[0.06] dark:border-[#2A2A2D] space-y-1">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Storage & Egress</span>
            <div className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-200 flex items-center justify-between">
              <span>VPS NVMe + R2</span>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">0$ Egress</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 block">Cloudflare CDN Synced</span>
          </div>
        </div>
      </section>

      {/* RECENT STUDIO CREATIONS */}
      {recentAssets.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-black/[0.08] dark:border-[#2A2A2D] pb-2.5">
            <div className="flex items-center gap-2">
              <FolderArchive className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
                Recent Studio Creations
              </h2>
            </div>
            <Link
              href="/vault"
              className="text-[11px] font-mono text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>VAULT REPOSITORY</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
            {recentAssets.map((asset, idx) => {
              const isImg = asset.type === "images" || (asset.filename && /\.(png|jpe?g|webp)$/i.test(asset.filename));
              const isVid = asset.type === "videos" || asset.type === "final" || (asset.filename && /\.(mp4|webm|mov)$/i.test(asset.filename));

              return (
                <div
                  key={idx}
                  onClick={() => openAssetModal(asset)}
                  className="group rounded-xl border border-black/[0.08] dark:border-[#2A2A2D] overflow-hidden bg-white dark:bg-[#0E0E10] hover:border-black/[0.15] dark:hover:border-zinc-500 cursor-pointer transition-all flex flex-col shadow-xs"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-100 dark:bg-[#161618]">
                    {isImg ? (
                      <LazyImage
                        src={getMediaUrl(asset.url)}
                        alt={asset.filename || "Recent creation"}
                        aspectRatio="aspect-[3/4]"
                        className="group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : isVid ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-zinc-100 dark:bg-[#0E0E10] text-center relative overflow-hidden">
                        <Video className="w-8 h-8 text-zinc-400 dark:text-zinc-500 mb-2 relative z-10 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-700 dark:text-zinc-400 font-bold relative z-10 px-2 py-0.5 rounded bg-white/80 dark:bg-white/10 border border-black/[0.08] dark:border-white/10">
                          {asset.assetCategory || "VIDEO"}
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-[#0E0E10]">
                        <ImageIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                      </div>
                    )}

                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
                      <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-white border border-white/10">
                        {isImg ? "IMAGE" : "VIDEO"}
                      </span>
                    </div>

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 flex flex-col items-center justify-center p-3 text-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-lg">
                        {isVid ? <Play className="w-4 h-4 ml-0.5" /> : <Eye className="w-4 h-4" />}
                      </div>
                      <span className="text-[10px] font-mono text-white font-medium">
                        Inspect
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-[#0E0E10] border-t border-black/[0.06] dark:border-[#1C1B1C] space-y-1 font-mono">
                    <p className="text-xs text-zinc-900 dark:text-zinc-200 truncate font-medium" title={asset.filename}>
                      {asset.filename || "creation"}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span>{formatBytes(asset.size_bytes)}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{asset.assetCategory || "READY"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* IN-PLACE MEDIA PREVIEW LIGHTBOX MODAL */}
      {activeAsset && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col animate-in fade-in duration-150"
          onClick={() => setActiveAsset(null)}
        >
          <div
            className="flex items-center justify-between px-5 py-3 border-b border-[#2A2A2D] bg-[#0E0E10]/90 shrink-0 font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-0.5 min-w-0 pr-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/10 text-white">
                  {activeAsset.assetCategory || (activeAsset.filename?.endsWith(".mp4") ? "VIDEO MASTER" : "IMAGE RENDER")}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {formatBytes(activeAsset.size_bytes)}
                </span>
              </div>
              <h3 className="text-xs text-white truncate max-w-lg" title={activeAsset.filename}>
                {activeAsset.filename}
              </h3>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/\.(png|jpe?g|webp)$/i.test(activeAsset.filename || "") && (
                <div className="flex items-center bg-white/10 rounded p-0.5 border border-white/10 mr-2">
                  <button
                    onClick={() => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5))}
                    className="p-1 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1.5 text-[11px] font-mono text-zinc-300 min-w-[40px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((prev) => Math.min(prev + 0.25, 3))}
                    className="p-1 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  {zoomLevel !== 1 && (
                    <button
                      onClick={() => setZoomLevel(1)}
                      className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer border-l border-white/10 ml-1"
                      title="Reset Zoom (0)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={copyAssetUrl}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-mono border border-white/10 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span className="hidden sm:inline">{copied ? "Copied" : "Copy Link"}</span>
              </button>

              <a
                href={getMediaUrl(activeAsset.url)}
                download={activeAsset.filename}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-mono font-bold transition-all cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">Download</span>
              </a>

              <button
                onClick={() => setActiveAsset(null)}
                className="p-1.5 rounded bg-white/10 hover:bg-rose-500 text-white transition-colors cursor-pointer ml-1"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-auto min-h-0"
            onClick={() => setActiveAsset(null)}
          >
            <div
              className="relative max-h-full max-w-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/\.(mp4|webm|mov)$/i.test(activeAsset.filename || "") ? (
                <div className="rounded-md overflow-hidden shadow-2xl border border-white/10 max-w-4xl max-h-[75vh] bg-black">
                  <video
                    src={getMediaUrl(activeAsset.url)}
                    controls
                    autoPlay
                    loop
                    className="max-h-[75vh] w-auto max-w-full"
                  />
                </div>
              ) : (
                <div
                  className="transition-transform duration-200 select-none cursor-grab active:cursor-grabbing"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  <img
                    src={getMediaUrl(activeAsset.url)}
                    alt={activeAsset.filename}
                    className="max-h-[75vh] max-w-[85vw] object-contain rounded-md shadow-2xl border border-white/10"
                    draggable={false}
                  />
                </div>
              )}
            </div>
          </div>

          <div
            className="px-5 py-2.5 border-t border-[#2A2A2D] bg-[#0E0E10]/80 flex items-center justify-between text-[11px] font-mono text-zinc-400 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span>OmniStudio Cinema Suite • Verified Asset</span>
            <span className="text-zinc-500">Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-white font-bold">Esc</kbd> to exit</span>
          </div>
        </div>
      )}

    </div>
  );
}
