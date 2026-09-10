"use client";
import React, { useEffect, useRef, useState } from "react";
import { Clock, ChevronDown, ChevronUp, Cpu, Aperture, Wand2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LogEntry {
  timestamp: string;
  message: string;
  stage?: string;
}

interface LiveProgressBarProps {
  progress: number; // 0 - 100
  stageTitle?: string;
  statusMessage?: string;
  elapsedSeconds?: number;
  logs?: LogEntry[];
  isActive?: boolean;
  className?: string;
  showTerminal?: boolean;
}

export default function LiveProgressBar({
  progress,
  stageTitle = "SYNTHESIZING MEDIA",
  statusMessage = "Processing neural latent weights...",
  elapsedSeconds = 0,
  logs = [],
  isActive = true,
  className,
  showTerminal = true,
}: LiveProgressBarProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [logsOpen, setLogsOpen] = useState(false);

  useEffect(() => {
    if (terminalEndRef.current && logsOpen) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, logsOpen]);

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}s`;
  };

  const clampedProgress = Math.min(Math.max(Math.round(progress), 0), 100);

  // Stepper milestones
  const steps = [
    {
      id: 1,
      label: "Prompt & Optics",
      desc: "Parameter conditioning",
      icon: Wand2,
      active: clampedProgress >= 10 && clampedProgress < 45,
      done: clampedProgress >= 45,
    },
    {
      id: 2,
      label: "Neural Diffusion",
      desc: "Cloud GPU rendering",
      icon: Aperture,
      active: clampedProgress >= 45 && clampedProgress < 90,
      done: clampedProgress >= 90,
    },
    {
      id: 3,
      label: "Vault Master",
      desc: "Storage & delivery",
      icon: ShieldCheck,
      active: clampedProgress >= 90 && clampedProgress < 100,
      done: clampedProgress === 100,
    },
  ];

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white/90 dark:bg-[#0d0d14]/90 backdrop-blur-xl p-5 sm:p-6 space-y-4 font-jakarta transition-all shadow-sm",
        className
      )}
    >
      {/* 1. Header Telemetry Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            {isActive && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
            )}
            <span
              className={cn(
                "relative inline-flex rounded-full h-3 w-3",
                isActive ? "bg-emerald-500" : "bg-zinc-400"
              )}
            />
          </div>

          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 dark:text-zinc-500 block font-semibold">
              SYNTHESIS PIPELINE IN PROGRESS
            </span>
            <h3 className="text-sm sm:text-base font-heading font-bold text-zinc-950 dark:text-white tracking-tight">
              {stageTitle}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Elapsed Time Pill */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-white/[0.06] px-3 py-1.5 rounded-full border border-black/[0.06] dark:border-white/[0.08]">
            <Clock className="h-3.5 w-3.5 text-zinc-500" />
            <span>{formatElapsed(elapsedSeconds)}</span>
          </div>

          {/* Large Numerical Percentage */}
          <div className="px-3.5 py-1 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-black font-heading font-black text-sm sm:text-base shadow-sm">
            {clampedProgress}%
          </div>
        </div>
      </div>

      {/* 2. Visual Step Progression Stepper */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-1">
        {steps.map((step) => {
          const StepIcon = step.icon;
          return (
            <div
              key={step.id}
              className={cn(
                "p-3 sm:p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-2",
                step.done
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                  : step.active
                  ? "bg-zinc-100 dark:bg-white/[0.08] border-black/20 dark:border-white/20 text-zinc-950 dark:text-white shadow-sm"
                  : "bg-zinc-50/50 dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.04] text-zinc-400 dark:text-zinc-600"
              )}
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "w-7 h-7 rounded-xl flex items-center justify-center transition-colors",
                    step.done
                      ? "bg-emerald-500 text-white"
                      : step.active
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-black"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                  )}
                >
                  {step.done ? <CheckCircle2 className="w-4 h-4" /> : <StepIcon className="w-3.5 h-3.5" />}
                </div>
                <span className="text-[10px] font-mono font-bold opacity-60">0{step.id}</span>
              </div>

              <div>
                <h4 className="text-xs font-heading font-bold truncate">{step.label}</h4>
                <p className="text-[10px] font-jakarta opacity-70 truncate hidden sm:block">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Smooth Animated Progress Bar */}
      <div className="space-y-2">
        <div className="relative w-full h-2.5 sm:h-3 bg-zinc-100 dark:bg-white/[0.06] rounded-full overflow-hidden border border-black/[0.06] dark:border-white/[0.08] shadow-inner">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden",
              clampedProgress === 100
                ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                : "bg-zinc-950 dark:bg-white shadow-sm"
            )}
            style={{ width: `${clampedProgress}%` }}
          >
            {/* Smooth moving light sweep */}
            {isActive && clampedProgress < 100 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            )}
          </div>
        </div>

        {/* Live Subtext Status Message */}
        <div className="flex items-center justify-between text-xs font-jakarta pt-0.5">
          <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate">
            {statusMessage}
          </span>
          <span className={cn("text-[11px] font-mono shrink-0 uppercase tracking-wider ml-2", clampedProgress === 100 ? "text-emerald-500 font-bold" : "text-zinc-500 dark:text-zinc-400 font-medium")}>
            {clampedProgress === 100 ? "Ready in Vault" : "Rendering Frame"}
          </span>
        </div>
      </div>

      {/* 4. Elegant Live Activity Feed */}
      {showTerminal && logs.length > 0 && (
        <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
          <button
            type="button"
            onClick={() => setLogsOpen(!logsOpen)}
            className="flex items-center justify-between w-full py-1 text-xs font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>Live Engine Activity ({logs.length} events)</span>
            </span>
            {logsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {logsOpen && (
            <div className="mt-2 p-3.5 rounded-xl bg-zinc-950 dark:bg-[#06060a] border border-black/[0.1] dark:border-white/[0.06] max-h-36 overflow-y-auto space-y-1.5 font-mono text-[11px] text-zinc-400 animate-in fade-in duration-150 custom-scrollbar">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-violet-400 shrink-0">[{log.timestamp}]</span>
                  <span className="text-zinc-200">{log.message}</span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
