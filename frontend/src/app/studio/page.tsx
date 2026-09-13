"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Video,
  Image as ImageIcon,
  Mic,
  Sparkles,
  Zap,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Layers,
  HelpCircle,
  Gem,
} from "lucide-react";
import { cn } from "@/lib/utils";
import VideoStudio from "@/app/video/page";
import ImageStudioPage from "@/app/image/page";
import VoiceStudioPage from "@/app/voice/page";
import ApifyIntelligenceSuite from "@/components/studio/ApifyIntelligenceSuite";

type StudioTab = "video" | "image" | "voice" | "apify";

interface TabConfig {
  id: StudioTab;
  label: string;
  icon: React.ElementType;
  badge: string;
  description: string;
  color: string;
  activeColor: string;
}

const STUDIO_TABS: TabConfig[] = [
  {
    id: "video",
    label: "Video Studio",
    icon: Video,
    badge: "CINEMA 4K",
    description: "Multi-shot kinematics, keyframe morphing & AI camera director",
    color: "text-emerald-500",
    activeColor: "bg-emerald-500 text-zinc-950 shadow-emerald-500/20",
  },
  {
    id: "image",
    label: "Image Studio",
    icon: ImageIcon,
    badge: "DIFFUSION 8K",
    description: "Neural diffusion, character consistency locks & jewellery presets",
    color: "text-violet-500",
    activeColor: "bg-violet-600 text-white shadow-violet-500/20",
  },
  {
    id: "voice",
    label: "Voice Studio",
    icon: Mic,
    badge: "NEURAL TTS",
    description: "Hyper-realistic actor speech, accent cloning & soundscapes",
    color: "text-sky-500",
    activeColor: "bg-sky-500 text-white shadow-sky-500/20",
  },
  {
    id: "apify",
    label: "Apify Intelligence",
    icon: Sparkles,
    badge: "MCP + AI",
    description: "Competitor scraper & built-in AI cinematic screenplay studio (No Claude/ChatGPT needed)",
    color: "text-amber-500",
    activeColor: "bg-amber-500 text-zinc-950 shadow-amber-500/20",
  },
];

function AllInOneStudioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read initial mode from URL search params (?mode=video|image|voice or ?tab=...)
  const initialMode = (searchParams?.get("mode") || searchParams?.get("tab") || "video") as StudioTab;
  const [activeTab, setActiveTab] = useState<StudioTab>(
    ["video", "image", "voice"].includes(initialMode) ? initialMode : "video"
  );

  // Sync state if URL query changes externally
  useEffect(() => {
    const modeParam = searchParams?.get("mode") || searchParams?.get("tab");
    if (modeParam && ["video", "image", "voice"].includes(modeParam) && modeParam !== activeTab) {
      setActiveTab(modeParam as StudioTab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: StudioTab) => {
    setActiveTab(tabId);
    // Update URL query without full reload
    const url = new URL(window.location.href);
    url.searchParams.set("mode", tabId);
    window.history.replaceState({}, "", url.toString());
  };

  const currentTabConfig = STUDIO_TABS.find((t) => t.id === activeTab) || STUDIO_TABS[0];

  return (
    <div className="min-h-screen pb-20">
      {/* ── Studio Master Switcher Bar (Sticky Top Header) ── */}
      <div className="sticky top-[56px] z-30 bg-white/95 dark:bg-[#0c0c11]/95 backdrop-blur-xl border-b border-black/[0.08] dark:border-white/[0.08] py-2 px-3 sm:px-6 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          
          {/* Left: Studio Identity & Live Sync Pill */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="w-8 h-8 rounded-xl bg-zinc-950 dark:bg-white flex items-center justify-center text-white dark:text-zinc-950 shadow-xs shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-heading font-extrabold text-zinc-900 dark:text-white tracking-tight uppercase">
                  All-In-One Creative Studio
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] font-jakarta text-zinc-500 dark:text-zinc-400 line-clamp-1">
                {currentTabConfig.description}
              </p>
            </div>
          </div>

          {/* Center / Right: Direct Studio Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-100 dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] shadow-inner shrink-0 w-full sm:w-auto justify-center sm:justify-start">
            {STUDIO_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-heading font-bold transition-all duration-200 cursor-pointer select-none",
                    isActive
                      ? tab.activeColor
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.04]"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", isActive ? "" : tab.color)} />
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "hidden lg:inline-block text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded-md uppercase tracking-wider",
                      isActive
                        ? "bg-black/15 dark:bg-white/20 text-current"
                        : "bg-black/5 dark:bg-white/10 text-zinc-500 dark:text-zinc-400"
                    )}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* ── Studio Direct Layout Engine ── */}
      {/* Renders the EXACT same layout and components as /video, /image, and /voice so any future changes automatically reflect here */}
      <main className="w-full">
        {activeTab === "video" && (
          <div className="animate-in fade-in duration-200">
            <VideoStudio />
          </div>
        )}

        {activeTab === "image" && (
          <div className="animate-in fade-in duration-200">
            <ImageStudioPage />
          </div>
        )}

        {activeTab === "voice" && (
          <div className="animate-in fade-in duration-200">
            <VoiceStudioPage />
          </div>
        )}
      </main>
    </div>
  );
}

export default function StudioMasterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            Synchronizing All-In-One Studio...
          </span>
        </div>
      }
    >
      <AllInOneStudioContent />
    </Suspense>
  );
}
