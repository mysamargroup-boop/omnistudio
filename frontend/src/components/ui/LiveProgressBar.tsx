"use client";
import React, { useEffect, useRef } from "react";
import { Terminal, Activity, Clock, Layers, Sparkles, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
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
  const [terminalOpen, setTerminalOpen] = React.useState(true);

  // Auto-scroll terminal to bottom on new log
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}s`;
  };

  const clampedProgress = Math.min(Math.max(Math.round(progress), 0), 100);

  return (
    <div
      className={cn(
        "rounded-2xl border border-black/[0.1] dark:border-white/[0.12] bg-white/90 dark:bg-[#09090e]/90 backdrop-blur-xl p-5 sm:p-6 space-y-4 shadow-xl font-jakarta transition-all",
        className
      )}
    >
      {/* Top Header Telemetry */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-2.5 w-2.5">
            {isActive && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={cn(
                "relative inline-flex rounded-full h-2.5 w-2.5",
                isActive ? "bg-emerald-500" : "bg-zinc-400"
              )}
            />
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 block font-semibold">
              REAL-TIME COMPILATION HUD //
            </span>
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              {stageTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {/* Elapsed Time */}
          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-white/[0.05] px-2.5 py-1 rounded-full border border-black/[0.06] dark:border-white/[0.06]">
            <Clock className="h-3 w-3 text-zinc-500" />
            <span>ELAPSED: {formatElapsed(elapsedSeconds)}</span>
          </div>

          {/* Large Numerical Percentage */}
          <div className="text-right">
            <span className="text-2xl font-black font-heading tracking-tight text-zinc-950 dark:text-white">
              {clampedProgress}%
            </span>
          </div>
        </div>
      </div>

      {/* Main High-Contrast Track */}
      <div className="relative w-full h-3 bg-zinc-100 dark:bg-white/[0.06] rounded-full overflow-hidden border border-black/[0.06] dark:border-white/[0.08] shadow-inner">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden",
            clampedProgress === 100
              ? "bg-emerald-500"
              : "bg-gradient-to-r from-zinc-800 via-zinc-950 to-zinc-700 dark:from-white dark:via-zinc-200 dark:to-zinc-400"
          )}
          style={{ width: `${clampedProgress}%` }}
        >
          {/* Dynamic Shimmer Light Sweep */}
          {isActive && clampedProgress < 100 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          )}
        </div>
      </div>

      {/* Subtext Status Notification */}
      <div className="flex items-center justify-between gap-2 text-xs font-mono">
        <p className="text-zinc-700 dark:text-zinc-300 truncate font-medium">
          {statusMessage}
        </p>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 uppercase tracking-wider">
          {clampedProgress === 100 ? "RENDER READY" : "PROCESSING FRAMES"}
        </span>
      </div>

      {/* Collapsible Real-Time Terminal Log Stream */}
      {showTerminal && logs.length > 0 && (
        <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2">
          <button
            type="button"
            onClick={() => setTerminalOpen(!terminalOpen)}
            className="flex items-center justify-between w-full text-[10px] font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 tracking-wider uppercase transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Terminal className="h-3 w-3" />
              <span>STREAMING TELEMETRY CONSOLE ({logs.length} EVENTS)</span>
            </span>
            {terminalOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {terminalOpen && (
            <div className="bg-zinc-950 dark:bg-[#050508] border border-black/[0.15] dark:border-white/[0.08] rounded-xl p-3.5 max-h-40 overflow-y-auto font-mono text-[11px] leading-relaxed text-zinc-300 shadow-inner space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-zinc-600 dark:text-zinc-500 select-none shrink-0">
                    [{log.timestamp}]
                  </span>
                  <span className="text-emerald-400 select-none shrink-0">&gt;</span>
                  <span className="text-zinc-200 break-words">{log.message}</span>
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
