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
  Radio,
  HardDrive,
  Cpu,
  Play,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  FolderArchive
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

const STUDIO_CARDS = [
  {
    href: "/studio",
    title: "Studio All-in-One",
    tag: "Unified Cinema Workstation",
    desc: "Seamlessly generate images, text-to-video, image-to-video, and keyframe transitions with real-time AI Director prompt enhancements in one place.",
    icon: Film,
    accent: "bg-zinc-100 dark:bg-zinc-800",
    border: "hover:border-zinc-400 dark:hover:border-zinc-600",
    badge: "Flagship Suite",
    cta: "Launch Studio"
  },
  {
    href: "/video",
    title: "Video Studio",
    tag: "Motion & Camera",
    desc: "Generate cinematic scenes from prompts, transform photos into motion, or morph keyframes with precision camera controls.",
    icon: Video,
    accent: "bg-zinc-100 dark:bg-zinc-800",
    border: "hover:border-zinc-400 dark:hover:border-zinc-600",
    badge: "Runway • Kling • Luma",
    cta: "Create Video"
  },
  {
    href: "/image",
    title: "Image Studio",
    tag: "Visual Diffusion",
    desc: "Create photorealistic visuals with OpenAI GPT-Image advance models, Google Imagen 3, and Flux. Features camera lens and lighting simulation.",
    icon: ImageIcon,
    accent: "bg-zinc-100 dark:bg-zinc-800",
    border: "hover:border-zinc-400 dark:hover:border-zinc-600",
    badge: "OpenAI GPT-Image • Imagen 3",
    cta: "Generate Image"
  },
  {
    href: "/voice",
    title: "Voice Studio",
    tag: "Speech & Audio",
    desc: "Studio-grade voiceovers with free Edge Neural TTS, ElevenLabs voice cloning, voice changer, and instant dubbing across 20+ languages.",
    icon: Mic,
    accent: "bg-zinc-100 dark:bg-zinc-800",
    border: "hover:border-zinc-400 dark:hover:border-zinc-600",
    badge: "Edge Neural • ElevenLabs",
    cta: "Open Voice Booth"
  },
  {
    href: "/pipeline",
    title: "Autonomous Cinema Agent",
    tag: "Full AI Director",
    desc: "Give a single prompt. The AI Director writes the screenplay, creates visual storyboards, choreographs camera motions, and renders a complete 1080p MP4 film.",
    icon: Layers,
    accent: "bg-zinc-100 dark:bg-zinc-800",
    border: "hover:border-zinc-400 dark:hover:border-zinc-600",
    badge: "End-to-End Pipeline",
    cta: "Launch Director"
  },
];

const PROMPT_SUGGESTIONS = [
  "Cyberpunk detective walking through rainy Neo-Tokyo alley, neon reflections",
  "Majestic ancient temple hidden inside emerald mist jungle at sunrise",
  "Macro shot of mechanical hummingbird sipping nectar, titanium plumage, 8k",
  "Cinematic tracking drone shot through snow-capped alpine mountain pass"
];

export default function DashboardOverviewPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [recentAssets, setRecentAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecent() {
      try {
        const res = await api.getAllAssets();
        if (res) {
          const combined = [
            ...(res.final || []),
            ...(res.videos || []),
            ...(res.images || [])
          ].sort((a, b) => (b.modified || 0) - (a.modified || 0));
          setRecentAssets(combined.slice(0, 6));
        }
      } catch (err) {
        console.error("Failed to load recent vault assets", err);
      } finally {
        setLoading(false);
      }
    }
    loadRecent();
  }, []);

  const handleLaunchPrompt = (text: string) => {
    if (!text.trim()) return;
    router.push(`/studio?prompt=${encodeURIComponent(text)}`);
  };

  return (
    <div className="w-full space-y-10 pb-16 animate-in fade-in duration-300 font-jakarta">
      
      {/* Hero Section */}
      <section className="relative pt-4 pb-2 text-center space-y-5 max-w-4xl mx-auto">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-800 dark:text-zinc-200 shadow-sm transition-all">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>OmniStudio Production Workstation</span>
          <span className="text-zinc-400 dark:text-zinc-600">•</span>
          <span className="text-zinc-500 dark:text-zinc-400">Enterprise Suite</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight text-zinc-950 dark:text-white leading-[1.15]">
          One Platform. Every Model. <br className="hidden sm:inline" />
          <span className="text-zinc-900 dark:text-zinc-100">
            Zero Subscription Limits.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto font-sans leading-relaxed">
          Create photorealistic AI imagery, choreograph cinema videos, synthesize multi-lingual neural voiceover, and direct complete films with your own API keys.
        </p>

        {/* Universal Studio Command Bar */}
        <div className="pt-3 max-w-3xl mx-auto w-full">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLaunchPrompt(prompt);
            }}
            className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl p-2 sm:p-2.5 shadow-xl focus-within:ring-2 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-600 focus-within:border-zinc-500 transition-all gap-2"
          >
            <div className="pl-3 text-zinc-400 dark:text-zinc-500 hidden sm:flex items-center">
              <Sparkles className="w-5 h-5" />
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 font-heading font-bold text-sm transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
            >
              <span>Generate</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Prompt Suggestions */}
          <div className="flex items-center gap-2 pt-3 overflow-x-auto hide-scrollbar pb-1 text-xs">
            <span className="text-zinc-400 font-medium shrink-0 font-mono">Ideas:</span>
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

      {/* Creative Studios Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-zinc-950 dark:text-white tracking-tight">
              Creative Production Studios
            </h2>
            <p className="text-sm text-zinc-500 font-jakarta">
              Select a dedicated creative engine or direct autonomous multi-scene cinema.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {STUDIO_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className={cn(
                  "group relative rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600"
                )}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100 group-hover:scale-105 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-heading font-bold text-zinc-900 dark:text-white group-hover:text-zinc-950 dark:group-hover:text-zinc-200 transition-colors">
                          {card.title}
                        </h3>
                        <span className="text-xs font-medium text-zinc-500">
                          {card.tag}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      {card.badge}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-jakarta">
                    {card.desc}
                  </p>
                </div>

                <div className="pt-5 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 mt-4">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5 transition-colors">
                    <span>{card.cta}</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 group-hover:bg-zinc-950 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-950 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Production Infrastructure Telemetry */}
      <section className="rounded-2xl p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            <h3 className="text-base font-heading font-bold text-zinc-950 dark:text-white tracking-tight">
              Studio Infrastructure Status
            </h3>
          </div>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            All Production Engines Active
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-1 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Video Compiler</span>
            <div className="text-sm font-bold text-zinc-900 dark:text-white flex items-center justify-between">
              <span>FFmpeg 5.1 / 8.1</span>
              <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-300">1080p Master</span>
            </div>
            <span className="text-[11px] text-zinc-400 block font-jakarta">Local hardware acceleration</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-1 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Visual AI Engine</span>
            <div className="text-sm font-bold text-zinc-900 dark:text-white flex items-center justify-between">
              <span>OpenAI + Gemini</span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Connected</span>
            </div>
            <span className="text-[11px] text-zinc-400 block font-jakarta">GPT-Image 1 & Imagen 3</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-1 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Acoustic Engine</span>
            <div className="text-sm font-bold text-zinc-900 dark:text-white flex items-center justify-between">
              <span>Edge + Eleven</span>
              <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-300">20+ Languages</span>
            </div>
            <span className="text-[11px] text-zinc-400 block font-jakarta">Neural narration & dubbing</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-1 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Storage & Vault</span>
            <div className="text-sm font-bold text-zinc-900 dark:text-white flex items-center justify-between">
              <span>VPS NVMe + R2</span>
              <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-300">Fast Storage</span>
            </div>
            <span className="text-[11px] text-zinc-400 block font-jakarta">Dual persistent storage</span>
          </div>
        </div>
      </section>

      {/* Recent Vault Creations Showcase */}
      {recentAssets.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderArchive className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
              <h2 className="text-lg font-heading font-bold text-zinc-950 dark:text-white tracking-tight">
                Recent Studio Vault Creations
              </h2>
            </div>
            <Link
              href="/vault"
              className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>View All Vault</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {recentAssets.map((asset, idx) => {
              const isImg = asset.type === "images" || (asset.filename && /\.(png|jpe?g|webp)$/i.test(asset.filename));
              return (
                <div
                  key={idx}
                  onClick={() => router.push("/vault")}
                  className="group relative rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900 aspect-square cursor-pointer hover:shadow-md transition-all hover:border-zinc-400 dark:hover:border-zinc-600 hover:scale-[1.02]"
                >
                  {isImg ? (
                    <img
                      src={getMediaUrl(asset.url)}
                      alt={asset.filename}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-zinc-100 dark:bg-zinc-900 text-center">
                      <Video className="w-6 h-6 text-zinc-400 mb-1" />
                      <span className="text-[10px] font-mono text-zinc-500 font-medium truncate max-w-full">
                        {asset.filename}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-8 h-8 text-white drop-shadow-md transform scale-75 group-hover:scale-100 transition-transform duration-300" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
