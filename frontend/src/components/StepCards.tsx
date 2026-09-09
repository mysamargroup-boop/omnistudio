"use client";
import React from "react";
import { Layers, Image as ImageIcon, Video, Mic, Film } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepCardItem {
  id: number;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const PIPELINE_STEPS: StepCardItem[] = [
  { id: 1, label: "01 • Script", desc: "Storyboard Director", icon: Layers },
  { id: 2, label: "02 • Diffusion", desc: "Visual Sampler", icon: ImageIcon },
  { id: 3, label: "03 • Dynamics", desc: "Camera Vector Engine", icon: Video },
  { id: 4, label: "04 • Narration", desc: "Neural Speech Sync", icon: Mic },
  { id: 5, label: "05 • Master", desc: "FFmpeg MP4 Compiler", icon: Film },
];

interface StepCardsProps {
  currentStep?: number; // 0 to 5, or -1 if idle
  className?: string;
}

export default function StepCards({ currentStep = -1, className }: StepCardsProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white/70 dark:bg-[#0d0d14]/80 p-3 sm:p-3.5 backdrop-blur-md shadow-sm",
        className
      )}
    >
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        {PIPELINE_STEPS.map((step, idx) => {
          const isDone = currentStep > idx;
          const isCurrent = currentStep === idx;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={cn(
                "group relative rounded-xl border p-4 sm:p-4.5 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-default",
                isCurrent
                  ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 scale-[1.02] ring-1 ring-violet-400/30"
                  : isDone
                  ? "bg-zinc-50 dark:bg-[#111118] border-violet-200 dark:border-violet-500/20 text-zinc-900 dark:text-zinc-100"
                  : "bg-zinc-50 dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:border-black/[0.1] dark:hover:border-white/[0.1]"
              )}
            >
              {/* Step Icon */}
              <div
                className={cn(
                  "p-2 rounded-lg mb-2.5 transition-colors",
                  isCurrent
                    ? "text-white bg-white/20"
                    : isDone
                    ? "text-violet-500 bg-violet-100 dark:bg-violet-500/10"
                    : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 bg-zinc-200/60 dark:bg-white/[0.04]"
                )}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>

              {/* Step Title */}
              <span
                className={cn(
                  "text-[11px] sm:text-xs font-bold font-mono tracking-wider uppercase block",
                  isCurrent
                    ? "text-white"
                    : "text-zinc-800 dark:text-zinc-200"
                )}
              >
                {step.label}
              </span>

              {/* Step Subtitle */}
              <span
                className={cn(
                  "text-[10px] sm:text-[11px] block mt-1 tracking-tight font-sans truncate max-w-full",
                  isCurrent
                    ? "text-zinc-200 font-medium"
                    : "text-zinc-500 dark:text-zinc-400"
                )}
              >
                {step.desc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
