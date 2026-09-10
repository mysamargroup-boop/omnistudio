"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  Layers,
  Image as ImageIcon,
  Video,
  Mic,
  Film,
  Zap,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Sliders,
  Play
} from "lucide-react";
import { cn } from "@/lib/utils";

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Screenplay Directive & Storyboard",
    desc: "The autonomous Director Agent receives your creative prompt or narrative idea. It breaks down the plot into cinematic beats, determines lens specifications, lighting schemes, camera angles, and detailed visual prompts for each scene.",
    icon: Layers,
    badge: "DIRECTOR AGENT",
    highlight: "Autonomous script & prompt enhancement"
  },
  {
    step: "02",
    title: "Visual Diffusion Latent Generation",
    desc: "High-resolution keyframes are synthesized through cutting-edge diffusion engines (OpenAI DALL-E 3, Flux Schnell, or Gemini Flash). Color grading and aspect ratios (16:9, 9:16, 1:1) are applied precisely.",
    icon: ImageIcon,
    badge: "IMAGE DIFFUSION",
    highlight: "Up to 4K resolution keyframe renders"
  },
  {
    step: "03",
    title: "Camera Kinematics & Motion Interpolation",
    desc: "Static keyframes are brought to life through camera dynamics (Pan, Tilt, Zoom, Orbit) or multi-frame morphing. By default, camera motion is set to Static/None for locked-off shots or animated seamlessly with FFmpeg filters.",
    icon: Video,
    badge: "VIDEO KINEMATICS",
    highlight: "Static locked shots or continuous morphs"
  },
  {
    step: "04",
    title: "Neural Speech & Acoustic Synthesis",
    desc: "Screenplay dialogue is voiced using state-of-the-art neural audio engines (ElevenLabs Studio, Edge Neural, or OpenAI TTS). Pacing, timbre, and emotion are tailored to the world atmosphere.",
    icon: Mic,
    badge: "VOICE SYNTHESIS",
    highlight: "High-fidelity voices in 20+ languages"
  },
  {
    step: "05",
    title: "Master FFmpeg Compilation & Remuxing",
    desc: "The scenes, camera movements, audio narration, and subtitle overlays are compiled and remuxed into a broadcast-ready MP4 master file, automatically cataloged in your Asset Vault and Cloudflare R2 storage.",
    icon: Film,
    badge: "MASTER COMPILER",
    highlight: "Instant streaming MP4 output with zero quality loss"
  }
];

export default function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-zinc-900 dark:text-zinc-100 p-6 md:p-12 font-jakarta">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Navigation */}
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO STUDIO</span>
          </Link>
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>STUDIO ARCHITECTURE GUIDE</span>
          </div>
        </div>

        {/* Hero */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-mono text-violet-600 dark:text-violet-400 uppercase tracking-widest font-semibold">
            <Sparkles className="w-3 h-3" />
            <span>AUTONOMOUS WORKFLOW BREAKDOWN</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight">
            How OmniStudio AI Works
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
            Discover the 5-stage neural compilation pipeline that transforms a single sentence or prompt into a multi-scene, broadcast-ready cinematic production.
          </p>
        </div>

        {/* Interactive Steps Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {WORKFLOW_STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isSelected = activeStep === idx;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-2 shadow-xs",
                  isSelected
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-transparent shadow-md scale-[1.02]"
                    : "bg-white dark:bg-[#0d0d14] border-black/[0.06] dark:border-white/[0.08] text-zinc-600 dark:text-zinc-400 hover:border-violet-500/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-[11px] font-mono font-bold", isSelected ? "opacity-90" : "text-violet-500")}>
                    {s.step}
                  </span>
                  <Icon className="w-4 h-4 opacity-80" />
                </div>
                <div className="text-xs font-bold font-heading line-clamp-1">{s.title}</div>
                <div className={cn("text-[10px] font-mono uppercase tracking-wider truncate", isSelected ? "opacity-80" : "text-zinc-400")}>
                  {s.badge}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Step Deep-Dive Card */}
        {(() => {
          const current = WORKFLOW_STEPS[activeStep];
          const CurrentIcon = current.icon;
          return (
            <div className="p-8 rounded-3xl bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.04] dark:border-white/[0.04] pb-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-lg font-mono">
                    {current.step}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block font-medium">
                      {current.badge}
                    </span>
                    <h2 className="text-xl md:text-2xl font-heading font-extrabold text-zinc-950 dark:text-white">
                      {current.title}
                    </h2>
                  </div>
                </div>
                <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium whitespace-nowrap shrink-0">
                  {current.highlight}
                </div>
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-jakarta">
                {current.desc}
              </p>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setActiveStep((prev) => (prev > 0 ? prev - 1 : WORKFLOW_STEPS.length - 1))}
                  className="text-xs font-mono text-zinc-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                >
                  ← PREVIOUS PHASE
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep((prev) => (prev < WORKFLOW_STEPS.length - 1 ? prev + 1 : 0))}
                  className="text-xs font-mono text-violet-600 dark:text-violet-400 font-bold hover:underline transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>NEXT PHASE</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })()}

        {/* Direct Action */}
        <div className="text-center pt-4">
          <Link
            href="/pipeline"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 font-heading font-bold text-sm shadow-md transition-all active:scale-98 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>LAUNCH AUTONOMOUS PIPELINE</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
