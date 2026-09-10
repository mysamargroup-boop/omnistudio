"use client";

import React, { useState, useEffect } from "react";
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
  Activity
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
  gradient: string;
  bgGlow: string;
  features: string[];
}

const STUDIO_CARDS: StudioCard[] = [
  {
    href: "/studio",
    title: "All-in-One Studio",
    tag: "Unified Cinema Suite",
    category: "FLAGSHIP",
    desc: "Seamlessly generate images, text-to-video, image-to-video, and keyframe transitions with real-time AI Director prompt intelligence.",
    icon: Film,
    badge: "Cinema Master",
    cta: "Launch Studio",
    gradient: "from-zinc-900/90 via-zinc-900/60 to-transparent",
    bgGlow: "group-hover:bg-zinc-800/30",
    features: ["4K Multi-Engine", "Live Director AI", "Keyframe Staging", "Audio Sync"]
  },
  {
    href: "/video",
    title: "Video Studio",
    tag: "Motion & Camera",
    category: "MOTION",
    desc: "Generate cinematic scenes from prompts, transform photos into motion, or morph keyframes with precision camera physics.",
    icon: Video,
    badge: "Runway • Kling • Luma",
    cta: "Direct Video",
    gradient: "from-zinc-900/90 via-zinc-900/60 to-transparent",
    bgGlow: "group-hover:bg-zinc-800/30",
    features: ["Cinematic Ken Burns", "Morph Kinematics", "Hardware FFmpeg 8.1", "Speed & FPS Dial"]
  },
  {
    href: "/image",
    title: "Image Studio",
    tag: "Visual Diffusion",
    category: "DIFFUSION",
    desc: "Create photorealistic visuals with OpenAI GPT-Image models, Google Imagen 3, and Flux with physical camera lens optics.",
    icon: ImageIcon,
    badge: "GPT-Image • Imagen 3",
    cta: "Generate Image",
    gradient: "from-zinc-900/90 via-zinc-900/60 to-transparent",
    bgGlow: "group-hover:bg-zinc-800/30",
    features: ["35mm / 85mm Optics", "Aperture & Bokeh", "Golden Hour Preset", "Ultra 4K UHD"]
  },
  {
    href: "/voice",
    title: "Voice Studio",
    tag: "Speech & Audio",
    category: "NEURAL",
    desc: "Studio-grade voiceovers with free Edge Neural TTS, ElevenLabs voice cloning, voice changer, and instant dubbing across 20+ languages.",
    icon: Mic,
    badge: "Edge Neural • Eleven",
    cta: "Open Voice Booth",
    gradient: "from-zinc-900/90 via-zinc-900/60 to-transparent",
    bgGlow: "group-hover:bg-zinc-800/30",
    features: ["20+ Natural Accents", "ElevenLabs Cloning", "Zero Latency Synthesis", "MP3 / WAV Master"]
  },
  {
    href: "/pipeline",
    title: "Cinema Agent",
    tag: "Full AI Director",
    category: "AUTONOMOUS",
    desc: "Give a single prompt. The AI Director writes the screenplay, creates visual storyboards, choreographs camera motions, and renders a 1080p film.",
    icon: Layers,
    badge: "Autonomous Agent",
    cta: "Launch Director",
    gradient: "from-zinc-900/90 via-zinc-900/60 to-transparent",
    bgGlow: "group-hover:bg-zinc-800/30",
    features: ["Auto Scriptwriting", "Multi-Scene Storyboard", "Auto Voiceover", "Master MP4 Render"]
  },
  {
    href: "/vault",
    title: "Asset Vault",
    tag: "Storage & CDN",
    category: "STORAGE",
    desc: "Cloudflare R2 zero-egress media storage + VPS NVMe fast cache. Browse, preview, inspect telemetry, and batch export renders.",
    icon: FolderArchive,
    badge: "NVMe + R2 Bucket",
    cta: "Explore Vault",
    gradient: "from-zinc-900/90 via-zinc-900/60 to-transparent",
    bgGlow: "group-hover:bg-zinc-800/30",
    features: ["Zero Egress Fees", "Instant CDN Cache", "Interactive Lightbox", "Metadata Tagging"]
  }
];

const PROMPT_SUGGESTIONS = [
  "Cyberpunk detective walking through rainy Neo-Tokyo alley, neon reflections, 8k raw detail",
  "Majestic ancient temple hidden inside emerald mist jungle at sunrise, volumetric rays",
  "Macro shot of mechanical hummingbird sipping nectar, titanium plumage, shallow depth of field",
  "Cinematic tracking drone shot through snow-capped alpine mountain pass, golden hour"
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
  const [recentAssets, setRecentAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    router.push(`/studio?prompt=${encodeURIComponent(text)}`);
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
    <div className="w-full space-y-12 pb-20 animate-in fade-in duration-300 font-jakarta">
      
      {/* Dashboard Header / Hero */}
      <section className="relative pt-3 pb-2 text-center space-y-5 max-w-4xl mx-auto">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-800 dark:text-zinc-200 shadow-sm transition-all">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">OmniStudio Dashboard</span>
          <span className="text-zinc-400 dark:text-zinc-600">•</span>
          <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">All AI Engines Online</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight text-zinc-950 dark:text-white leading-[1.12]">
          Unified Cinema Workstation. <br className="hidden sm:inline" />
          <span className="text-zinc-700 dark:text-zinc-300">
            Professional Multi-Model Creative Suite.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto font-sans leading-relaxed">
          Create photorealistic AI imagery, choreograph cinema videos, synthesize multi-lingual neural voiceover, and direct complete films with your personal BYOK cloud.
        </p>

        {/* Universal Studio Command Bar */}
        <div className="pt-2 max-w-3xl mx-auto w-full">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLaunchPrompt(prompt);
            }}
            className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl p-2 sm:p-2.5 shadow-xl focus-within:ring-2 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-600 focus-within:border-zinc-500 transition-all gap-2"
          >
            <div className="pl-3 text-zinc-400 dark:text-zinc-500 hidden sm:flex items-center">
              <Sparkles className="w-5 h-5 text-amber-500/80" />
            </div>

            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe any film idea, visual scene, or character prompt to create..."
              className="flex-1 bg-transparent px-2 sm:px-3 py-2 text-sm sm:text-base text-zinc-950 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none font-sans"
            />

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 font-heading font-bold text-xs tracking-wider uppercase transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
            >
              <span>Generate</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Prompt Suggestions */}
          <div className="flex items-center gap-2 pt-3 overflow-x-auto hide-scrollbar pb-1 text-xs">
            <span className="text-zinc-400 font-medium shrink-0 font-mono text-[11px]">Try:</span>
            {PROMPT_SUGGESTIONS.map((idea, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(idea);
                  handleLaunchPrompt(idea);
                }}
                className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors whitespace-nowrap cursor-pointer text-[11px] font-medium border border-zinc-200 dark:border-zinc-700/60"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Portrait Creative Studios Grid */}
      <section className="space-y-5">
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-zinc-950 dark:text-white tracking-tight flex items-center gap-2.5">
              <Camera className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
              <span>Creative Production Spaces</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 font-jakarta">
              Engineered studio spaces matching high-end digital cinema standards.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-mono text-zinc-400">
            <span>6 Workstations</span>
          </span>
        </div>

        {/* Portrait Cards Layout (3:4.2 aspect / luxury vertical cinema cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {STUDIO_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className={cn(
                  "group relative rounded-2xl border border-zinc-200 dark:border-zinc-800/90 bg-white dark:bg-[#111118] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 hover:-translate-y-1 min-h-[380px]"
                )}
              >
                {/* Ambient Top Glow */}
                <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-zinc-200/40 dark:from-white/[0.04] to-transparent pointer-events-none" />

                {/* Card Top Header */}
                <div className="p-6 relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    {/* Studio Icon */}
                    <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/80 flex items-center justify-center text-zinc-900 dark:text-zinc-100 group-hover:scale-110 group-hover:bg-zinc-950 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-950 transition-all duration-300 shadow-sm">
                      <Icon className="w-6 h-6" />
                    </div>

                    {/* Category Pill */}
                    <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60 font-semibold">
                      {card.category}
                    </span>
                  </div>

                  {/* Title & Tag */}
                  <div>
                    <h3 className="text-lg font-heading font-bold text-zinc-950 dark:text-white group-hover:text-zinc-800 dark:group-hover:text-zinc-100 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mt-0.5">
                      {card.tag}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-jakarta line-clamp-3">
                    {card.desc}
                  </p>

                  {/* Feature Highlights Pills */}
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {card.features.map((feat, fIdx) => (
                      <span
                        key={fIdx}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Bottom CTA Bar */}
                <div className="relative z-10 px-6 py-4 bg-zinc-50/80 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800/60 transition-colors">
                  <span className="text-xs font-heading font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <span>{card.cta}</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
                  </span>
                  <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 group-hover:bg-zinc-950 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-950 transition-all">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Production Infrastructure Telemetry */}
      <section className="rounded-2xl p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111118] shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            <h3 className="text-base font-heading font-bold text-zinc-950 dark:text-white tracking-tight">
              Hostinger VPS & Engine Telemetry
            </h3>
          </div>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Hardware Acceleration & R2 Active
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-zinc-800 space-y-1 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Video Compiler</span>
            <div className="text-sm font-bold text-zinc-900 dark:text-white flex items-center justify-between">
              <span>FFmpeg 5.1 / 8.1</span>
              <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-300">1080p Master</span>
            </div>
            <span className="text-[11px] text-zinc-400 block font-jakarta">Local hardware encoder</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-zinc-800 space-y-1 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Visual AI Engine</span>
            <div className="text-sm font-bold text-zinc-900 dark:text-white flex items-center justify-between">
              <span>OpenAI + Gemini</span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Connected</span>
            </div>
            <span className="text-[11px] text-zinc-400 block font-jakarta">GPT-Image 1 & Imagen 3</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-zinc-800 space-y-1 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Acoustic Engine</span>
            <div className="text-sm font-bold text-zinc-900 dark:text-white flex items-center justify-between">
              <span>Edge + Eleven</span>
              <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-300">20+ Languages</span>
            </div>
            <span className="text-[11px] text-zinc-400 block font-jakarta">Neural narration & dubbing</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-zinc-800 space-y-1 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Storage & Vault</span>
            <div className="text-sm font-bold text-zinc-900 dark:text-white flex items-center justify-between">
              <span>VPS NVMe + R2</span>
              <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-300">Fast Storage</span>
            </div>
            <span className="text-[11px] text-zinc-400 block font-jakarta">Dual persistent storage</span>
          </div>
        </div>
      </section>

      {/* Recent Vault Creations Showcase (Portrait Cards + In-Place Click to Open) */}
      {recentAssets.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <FolderArchive className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
              <div>
                <h2 className="text-lg font-heading font-bold text-zinc-950 dark:text-white tracking-tight">
                  Recent Studio Creations
                </h2>
                <p className="text-xs text-zinc-500 font-jakarta">
                  Click any creation to inspect or play directly in high definition.
                </p>
              </div>
            </div>
            <Link
              href="/vault"
              className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white flex items-center gap-1.5 transition-colors font-mono"
            >
              <span>VAULT REPOSITORY</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Portrait Aspect Cards (3:4) with Smooth Lazy Loading */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {recentAssets.map((asset, idx) => {
              const isImg = asset.type === "images" || (asset.filename && /\.(png|jpe?g|webp)$/i.test(asset.filename));
              const isVid = asset.type === "videos" || asset.type === "final" || (asset.filename && /\.(mp4|webm|mov)$/i.test(asset.filename));

              return (
                <div
                  key={idx}
                  onClick={() => openAssetModal(asset)}
                  className="group relative rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-[#111118] cursor-pointer hover:shadow-xl transition-all duration-300 hover:border-zinc-400 dark:hover:border-zinc-600 hover:-translate-y-1 flex flex-col"
                >
                  {/* Portrait Media Container (aspect-[3/4]) */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                    {isImg ? (
                      <LazyImage
                        src={getMediaUrl(asset.url)}
                        alt={asset.filename || "Recent creation"}
                        aspectRatio="aspect-[3/4]"
                        className="group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : isVid ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-zinc-950 text-center relative overflow-hidden">
                        {/* Video thumbnail simulation */}
                        <div className="absolute inset-0 bg-radial from-zinc-800 to-zinc-950 opacity-80" />
                        <Video className="w-10 h-10 text-zinc-400 mb-2 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold relative z-10 px-2.5 py-1 rounded-full bg-white/10 border border-white/10">
                          {asset.assetCategory || "VIDEO"}
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                        <ImageIcon className="w-8 h-8 text-zinc-500" />
                      </div>
                    )}

                    {/* Top Type Badge */}
                    <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                      <span className="text-[9px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white border border-white/10 shadow-sm">
                        {isImg ? "IMAGE" : "VIDEO"}
                      </span>
                    </div>

                    {/* Hover Action Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 flex flex-col items-center justify-center p-3 text-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-200">
                        {isVid ? <Play className="w-5 h-5 ml-0.5" /> : <Eye className="w-5 h-5" />}
                      </div>
                      <span className="text-[11px] font-mono text-white font-medium">
                        Click to Inspect
                      </span>
                    </div>
                  </div>

                  {/* Card Info Footer */}
                  <div className="p-3 bg-white dark:bg-[#111118] border-t border-black/[0.04] dark:border-white/[0.06] space-y-1">
                    <p className="text-xs font-mono font-medium text-zinc-900 dark:text-white truncate" title={asset.filename}>
                      {asset.filename || "creation"}
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>{formatBytes(asset.size_bytes)}</span>
                      <span className="text-emerald-500 font-medium">{asset.assetCategory || "READY"}</span>
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
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col animate-in fade-in duration-200"
          onClick={() => setActiveAsset(null)}
        >
          {/* Lightbox Header Bar */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-0.5 min-w-0 pr-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 text-white font-bold">
                  {activeAsset.assetCategory || (activeAsset.filename?.endsWith(".mp4") ? "VIDEO MASTER" : "IMAGE RENDER")}
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  {formatBytes(activeAsset.size_bytes)}
                </span>
              </div>
              <h3 className="text-sm font-mono font-medium text-white truncate max-w-lg" title={activeAsset.filename}>
                {activeAsset.filename}
              </h3>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Zoom Buttons for Images */}
              {/\.(png|jpe?g|webp)$/i.test(activeAsset.filename || "") && (
                <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/10 mr-2">
                  <button
                    onClick={() => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5))}
                    className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="px-2 text-xs font-mono text-zinc-300 min-w-[48px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((prev) => Math.min(prev + 0.25, 3))}
                    className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  {zoomLevel !== 1 && (
                    <button
                      onClick={() => setZoomLevel(1)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border-l border-white/10 ml-1"
                      title="Reset Zoom (0)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Copy URL */}
              <button
                onClick={copyAssetUrl}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono border border-white/10 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? "Copied" : "Copy Link"}</span>
              </button>

              {/* Download */}
              <a
                href={getMediaUrl(activeAsset.url)}
                download={activeAsset.filename}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-heading font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>

              {/* Close Button */}
              <button
                onClick={() => setActiveAsset(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white transition-colors cursor-pointer ml-1"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Media Content Display Area */}
          <div
            className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-auto min-h-0"
            onClick={() => setActiveAsset(null)}
          >
            <div
              className="relative max-h-full max-w-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/\.(mp4|webm|mov)$/i.test(activeAsset.filename || "") ? (
                <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 max-w-4xl max-h-[75vh] bg-black">
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
                    className="max-h-[75vh] max-w-[85vw] object-contain rounded-xl shadow-2xl border border-white/10"
                    draggable={false}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Lightbox Footer Bar */}
          <div
            className="px-6 py-3 border-t border-white/10 bg-black/60 flex items-center justify-between text-xs font-mono text-zinc-400 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span>OmniStudio Cloud Renderer • Verified Asset</span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-zinc-500">Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">Esc</kbd> to close</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
