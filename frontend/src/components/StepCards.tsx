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
  { id: 1, label: "01 // SCRIPT", desc: "Storyboard Director", icon: Layers },
  { id: 2, label: "02 // DIFFUSION", desc: "Visual Sampler", icon: ImageIcon },
  { id: 3, label: "03 // DYNAMICS", desc: "Camera Vector Engine", icon: Video },
  { id: 4, label: "04 // NARRATION", desc: "Neural Speech Sync", icon: Mic },
  { id: 5, label: "05 // MASTER", desc: "FFmpeg MP4 Compiler", icon: Film },
];

interface StepCardsProps {
  currentStep?: number; // 0 to 5, or -1 if idle
  className?: string;
}

export default function StepCards({ currentStep = -1, className }: StepCardsProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white/70 dark:bg-[#0a0a0f]/80 p-3 sm:p-3.5 backdrop-blur-md shadow-xs",
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
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-lg scale-[1.02] ring-1 ring-black/10 dark:ring-white/20"
                  : isDone
                  ? "bg-zinc-50 dark:bg-[#121218] border-zinc-300 dark:border-white/15 text-zinc-900 dark:text-zinc-100"
                  : "bg-white dark:bg-[#0e0e14] border-zinc-200/80 dark:border-white/[0.07] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-white/15"
              )}
            >
              {/* Step Icon */}
              <div
                className={cn(
                  "p-2 rounded-lg mb-2.5 transition-colors",
                  isCurrent
                    ? "text-white dark:text-black bg-white/10 dark:bg-black/10"
                    : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 bg-zinc-100/60 dark:bg-white/[0.03]"
                )}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>

              {/* Step Title */}
              <span
                className={cn(
                  "text-[11px] sm:text-xs font-bold font-mono tracking-wider uppercase block",
                  isCurrent
                    ? "text-white dark:text-black"
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
                    ? "text-zinc-300 dark:text-zinc-700 font-medium"
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
