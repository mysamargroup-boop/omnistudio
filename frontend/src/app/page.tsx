"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cpu,
  Image as ImageIcon,
  Video,
  Mic,
  ArrowRight,
  ArrowUpRight,
  HardDrive,
  Sparkles,
  Zap,
  Play,
  Film,
  Layers,
  Radio,
  Sliders,
  Wand2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  RefreshCw,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import StepCards from "@/components/StepCards";

const studios = [
  {
    href: "/pipeline",
    number: "01",
    code: "AGENT-PIPELINE",
    title: "Autonomous Cinema Agent",
    tag: "END-TO-END",
    desc: "Single-prompt director. AI writes the screenplay, breaks into cinematic scenes, diffuses visuals, choreographs camera motions, synthesizes neural voiceover, and compiles a final 1080p MP4.",
    specs: ["STORYBOARD DIRECTOR", "KEN BURNS INTERPOLATION", "FFMPEG 8.1 MASTER"],
    cta: "Launch Cinema Studio",
  },
  {
    href: "/image",
    number: "02",
    code: "DIFFUSION-LAB",
    title: "Multi-Model Diffusion Lab",
    tag: "STILL PHOTOGRAPHY",
    desc: "Direct integration with OpenAI DALL-E 3 and Black Forest Labs Flux Schnell. Features intelligent Hollywood prompt expansion and aspect ratio formatting.",
    specs: ["DALL-E 3 & FLUX", "16:9 / 1:1 / 9:16", "DIRECT VIDEO DISPATCH"],
    cta: "Open Diffusion Lab",
  },
  {
    href: "/video",
    number: "03",
    code: "CAMERA-MOTION",
    title: "Camera Choreography Engine",
    tag: "MOTION DYNAMICS",
    desc: "Transforms still photography into cinematic camera moves. Features First + Last Frame morphing, parallel OpenAI Director Agent, and multi-model cloud video synthesis.",
    specs: ["KEYFRAME MORPHING", "OPENAI PROMPT DIRECTOR", "MULTI-MODEL ENGINES"],
    cta: "Open Motion Studio",
  },
  {
    href: "/voice",
    number: "04",
    code: "NEURAL-AUDIO",
    title: "Neural Audio & Speech Studio",
    tag: "ACOUSTIC SUITE",
    desc: "Studio voiceover booth with ElevenLabs, OpenAI TTS, and free built-in Edge Neural TTS offering 100+ natural human voices in English and Hindi.",
    specs: ["ELEVENLABS + EDGE NEURAL", "ENGLISH & HINDI NARRATORS", "WAVEFORM VISUALIZER"],
    cta: "Open Audio Booth",
  },
];

const TRENDING_TAGS = [
  "Cyberpunk Detective in Neo-Tokyo",
  "Deep Space Monolith Expedition",
  "Samurai Cherry Blossom Duel",
  "Hypercar Racing Neon Track",
  "Ancient Mayan Sun Temple at Twilight",
  "Bioluminescent Deep Sea Leviathan",
  "Quantum Core Gravitational Distortion",
  "Post-Apocalyptic Desert Convoy",
  "Steampunk Floating Airship Armada",
  "Alpine Peak Storm Drone Chase",
];

export default function Dashboard() {
  const router = useRouter();
  const [quickPrompt, setQuickPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [assets, setAssets] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  // Horizontal Scroll References
  const trendingScrollRef = useRef<HTMLDivElement>(null);
  const filmstripScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (trendingScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = trendingScrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  const scrollTrending = (direction: "left" | "right") => {
    if (trendingScrollRef.current) {
      const amount = direction === "left" ? -280 : 280;
      trendingScrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
      setTimeout(checkScroll, 300);
    }
  };

  const scrollFilmstrip = (direction: "left" | "right") => {
    if (filmstripScrollRef.current) {
      const amount = direction === "left" ? -340 : 340;
      filmstripScrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  useEffect(() => {
    setLoadingHealth(true);
    api.health()
      .then((data) => {
        setHealth(data);
        setLoadingHealth(false);
      })
      .catch((err) => {
        setErrorMessage("BACKEND_OFFLINE // Hardware acceleration engine at http://localhost:8000 is not responding. Please verify the backend service is running.");
        setLoadingHealth(false);
      });

    api.getAllAssets()
      .then(setAssets)
      .catch(() => {});
  }, []);

  const handleExecute = (promptText: string) => {
    const clean = promptText.trim();
    if (!clean) {
      setErrorMessage("PROMPT_REQUIRED // Please specify a cinematic scene concept or click one of the trending suggestions below to launch the autonomous pipeline.");
      return;
    }
    setErrorMessage(null);
    router.push(`/pipeline?topic=${encodeURIComponent(clean)}`);
  };

  return (
    <div className="space-y-10 pb-12 font-jakarta">
      {/* Editorial Hero */}
      <div className="relative pt-4 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white dark:bg-[#0a0a0f] border border-black/[0.08] dark:border-white/[0.08] text-[10px] font-mono tracking-widest text-zinc-700 dark:text-zinc-300 uppercase shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-950 dark:bg-white" />
            <span>AI-NATIVE CREATIVE SUITE // PERSONAL WORKSTATION v6.0</span>
          </div>

          {health && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-white dark:bg-[#0a0a0f] border border-black/[0.08] dark:border-white/[0.08] px-3 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>COMPILER: FFMPEG 8.1 ONLINE</span>
            </div>
          )}
        </div>

        <div className="space-y-3 max-w-4xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight leading-[1.06]">
            One platform. Every model. Zero subscriptions.
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 font-jakarta max-w-3xl leading-relaxed">
            Autonomous multi-model video generation, keyframe morphing, visual diffusion, and neural voiceover. Bring-your-own-keys architecture with 100% local hard drive vault.
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="w-full flex items-start justify-between gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-mono text-xs animate-page-enter">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="p-1 rounded-md text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer shrink-0"
              title="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Full-Width Flagship Command Bar */}
        <div className="w-full space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExecute(quickPrompt);
            }}
            className="w-full flex items-center bg-white dark:bg-[#0a0a0f] border border-black/[0.1] dark:border-white/[0.12] rounded-2xl p-2.5 shadow-lg dark:shadow-2xl focus-within:border-black/50 dark:focus-within:border-white/50 transition-all"
          >
            <div className="pl-3 pr-2 text-zinc-400 dark:text-zinc-500 font-mono text-xs hidden sm:flex items-center gap-1.5 shrink-0 select-none">
              <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
              <span>PROMPT //</span>
            </div>

            <input
              type="text"
              value={quickPrompt}
              onChange={(e) => {
                setQuickPrompt(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Describe a cinematic narrative, screenplay, or scene to launch the autonomous pipeline..."
              className="flex-1 bg-transparent px-3 py-2.5 text-xs sm:text-sm text-zinc-950 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none font-jakarta"
            />

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-black text-xs font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shrink-0 font-heading tracking-tight active:scale-95 cursor-pointer shadow-md"
            >
              <span>EXECUTE</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Smooth Horizontal Scroll Trending Tags Bar */}
          <div className="relative w-full flex items-center gap-2 pt-1">
            {/* Left Scroll Trigger Button */}
            <button
              type="button"
              onClick={() => scrollTrending("left")}
              disabled={!canScrollLeft}
              className={cn(
                "p-1.5 rounded-full bg-white dark:bg-[#0a0a0f] border border-black/[0.1] dark:border-white/[0.1] text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-all shrink-0 cursor-pointer shadow-xs disabled:opacity-20 disabled:cursor-default",
                !canScrollLeft && "opacity-20"
              )}
              title="Scroll Left"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {/* Scrolling Track */}
            <div
              ref={trendingScrollRef}
              onScroll={checkScroll}
              className="flex-1 flex items-center gap-2 overflow-x-auto hide-scrollbar scroll-smooth py-1"
            >
              <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold pl-1 select-none">
                TRENDING:
              </span>

              {TRENDING_TAGS.map((tag, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setQuickPrompt(tag);
                    handleExecute(tag);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#09090d] border border-black/[0.08] dark:border-white/[0.08] text-zinc-800 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30 whitespace-nowrap text-[11px] font-mono transition-all cursor-pointer shadow-2xs active:scale-96 shrink-0"
                  title={`Run prompt: "${tag}"`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Right Scroll Trigger Button */}
            <button
              type="button"
              onClick={() => scrollTrending("right")}
              disabled={!canScrollRight}
              className={cn(
                "p-1.5 rounded-full bg-white dark:bg-[#0a0a0f] border border-black/[0.1] dark:border-white/[0.1] text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-all shrink-0 cursor-pointer shadow-xs disabled:opacity-20 disabled:cursor-default",
                !canScrollRight && "opacity-20"
              )}
              title="Scroll Right"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 5-Step Pipeline Architecture Ribbon */}
        <div className="w-full pt-2">
          <StepCards />
        </div>
      </div>

      {/* Telemetry Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        <div className="rounded-2xl bg-white dark:bg-[#07070a] border border-black/[0.08] dark:border-white/[0.08] p-4 space-y-1 shadow-xs">
          <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 block">COMPILER ENGINE</span>
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-zinc-950 dark:text-white font-heading">FFmpeg 8.1</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">ONLINE</span>
          </div>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-600 block">HARDWARE ACCELERATED</span>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#07070a] border border-black/[0.08] dark:border-white/[0.08] p-4 space-y-1 shadow-xs">
          <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 block">AI VIDEO & DIFFUSION</span>
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-zinc-950 dark:text-white font-heading">Kling + Flux</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">5 ENGINES</span>
          </div>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-600 block">MULTI-MODEL SUITE</span>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#07070a] border border-black/[0.08] dark:border-white/[0.08] p-4 space-y-1 shadow-xs">
          <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 block">LOCAL ASSET VAULT</span>
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-zinc-950 dark:text-white font-heading">{assets?.total || 0} ASSETS</span>
            <HardDrive className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          </div>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-600 block">OUTPUTS DIRECTORY</span>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#07070a] border border-black/[0.08] dark:border-white/[0.08] p-4 space-y-1 shadow-xs">
          <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 block">DATABASE & STORAGE</span>
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-zinc-950 dark:text-white font-heading">PostgreSQL</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">ACTIVE</span>
          </div>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-600 block">NEON / SQLITE DUAL</span>
        </div>
      </div>

      {/* Studio Workstations Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-heading font-bold text-zinc-950 dark:text-white tracking-tight">Studio Workspaces</h2>
            <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Generative Production Engines</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {studios.map((s) => (
            <div
              key={s.href}
              className="hf-card p-6 flex flex-col justify-between group technical-corner relative transition-all duration-200"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-400 dark:text-zinc-500">{s.number} //</span>
                    <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] text-zinc-800 dark:text-zinc-300">
                      {s.tag}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono uppercase text-zinc-400 dark:text-zinc-600">{s.code}</span>
                </div>

                <div>
                  <h3 className="text-lg font-heading font-bold text-zinc-950 dark:text-white tracking-tight">
                    {s.title}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 font-jakarta leading-relaxed mt-1.5">{s.desc}</p>
                </div>

                <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-wrap gap-1.5 font-mono text-[9px] text-zinc-500 dark:text-zinc-400">
                  {s.specs.map((spec, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-[#101015] border border-black/[0.05] dark:border-white/[0.05] text-zinc-700 dark:text-zinc-400"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-black/[0.05] dark:border-white/[0.05]">
                <button
                  type="button"
                  onClick={() => router.push(s.href)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-[#0e0e13] border border-black/[0.08] dark:border-white/[0.08] hover:bg-zinc-950 hover:text-white dark:hover:bg-white dark:hover:text-black hover:border-transparent text-xs font-semibold text-zinc-900 dark:text-white transition-all font-heading tracking-tight group/btn cursor-pointer"
                >
                  <span>{s.cta}</span>
                  <ArrowUpRight className="h-4 w-4 text-zinc-500 group-hover/btn:text-current transition-colors" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Studio Outputs Horizontal Filmstrip */}
      {assets && assets.total > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-heading font-bold text-zinc-950 dark:text-white tracking-tight">Local Productions</h2>
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">
                Media Generated on Local File System ({assets.total} Assets)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollFilmstrip("left")}
                className="p-1.5 rounded-full bg-white dark:bg-[#0a0a0f] border border-black/[0.1] dark:border-white/[0.1] text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-all cursor-pointer shadow-xs"
                title="Scroll Left"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollFilmstrip("right")}
                className="p-1.5 rounded-full bg-white dark:bg-[#0a0a0f] border border-black/[0.1] dark:border-white/[0.1] text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-all cursor-pointer shadow-xs"
                title="Scroll Right"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <Link
                href="/vault"
                className="text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white flex items-center gap-1.5 transition-colors ml-2"
              >
                <span>OPEN VAULT</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Smooth Horizontal Scrolling Filmstrip */}
          <div
            ref={filmstripScrollRef}
            className="flex items-center gap-3.5 overflow-x-auto hide-scrollbar scroll-smooth py-1"
          >
            {[...(assets.final || []), ...(assets.videos || []), ...(assets.images || [])]
              .map((file: any, i: number) => (
                <div
                  key={i}
                  className="hf-card overflow-hidden p-2 space-y-2 group flex flex-col justify-between shrink-0 w-[240px]"
                >
                  <div className="h-32 rounded-lg bg-black flex items-center justify-center overflow-hidden relative border border-black/[0.06] dark:border-white/[0.06]">
                    {file.type === "images" ? (
                      <img
                        src={getMediaUrl(file.url)}
                        alt={file.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <video src={getMediaUrl(file.url)} className="w-full h-full object-cover" />
                    )}
                    <span className="absolute bottom-2 left-2 text-[8px] font-mono uppercase px-2 py-0.5 rounded bg-black/80 text-zinc-300 border border-white/10 backdrop-blur-sm">
                      [ {file.type.toUpperCase()} ]
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 truncate max-w-[130px]" title={file.filename}>
                      {file.filename}
                    </p>
                    {file.type === "images" ? (
                      <button
                        type="button"
                        onClick={() => router.push(`/video?image=${encodeURIComponent(file.url)}`)}
                        className="text-[9px] font-mono text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white flex items-center gap-0.5 cursor-pointer"
                        title="Animate in Video"
                      >
                        <span>ANIMATE</span>
                        <ArrowUpRight className="h-2.5 w-2.5" />
                      </button>
                    ) : (
                      <Link
                        href="/vault"
                        className="text-[9px] font-mono text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white flex items-center gap-0.5"
                      >
                        <span>VIEW</span>
                        <ArrowUpRight className="h-2.5 w-2.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
