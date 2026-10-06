"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useActiveJobs,
  ActiveJob,
  CompletedJobRecord,
  dismissCompletedJob,
} from "@/lib/generationTracker";
import {
  Sparkles,
  Video,
  ImageIcon,
  Cpu,
  Mic,
  CheckCircle2,
  X,
  ExternalLink,
  Loader2,
} from "lucide-react";

export default function GlobalJobIndicator() {
  const { activeJobs } = useActiveJobs();
  const pathname = usePathname();
  const [completedJob, setCompletedJob] = useState<CompletedJobRecord | null>(null);

  useEffect(() => {
    const handleJobCompleted = (e: any) => {
      if (e.detail) {
        setCompletedJob(e.detail);
        // Auto-dismiss after 20s
        const timer = setTimeout(() => {
          setCompletedJob(null);
        }, 20000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener("omnistudio:job-completed", handleJobCompleted);
    return () => {
      window.removeEventListener("omnistudio:job-completed", handleJobCompleted);
    };
  }, []);

  // Filter out any active job if user is ALREADY on that page (the page itself renders its own large progress)
  // But show it if user is on a DIFFERENT page!
  const backgroundJobs = activeJobs.filter((j) => j.path !== pathname);

  if (backgroundJobs.length === 0 && !completedJob) {
    return null;
  }

  const primaryActive = backgroundJobs[0];

  const getIcon = (type: ActiveJob["type"]) => {
    switch (type) {
      case "video":
        return <Video className="w-4 h-4 text-violet-400" />;
      case "image":
        return <ImageIcon className="w-4 h-4 text-sky-400" />;
      case "pipeline":
        return <Cpu className="w-4 h-4 text-emerald-400" />;
      case "voice":
        return <Mic className="w-4 h-4 text-amber-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <aside aria-label="Active Generation Tracker" className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-auto animate-in slide-in-from-bottom-5 duration-300">
      {/* ── Active Background Job Banner ── */}
      {primaryActive && (
        <div className="relative overflow-hidden rounded-2xl bg-zinc-950/90 dark:bg-black/95 backdrop-blur-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] p-3.5 text-zinc-100 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex-shrink-0 w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Background Job
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {primaryActive.progress ? `${Math.round(primaryActive.progress)}%` : "Processing"}
                  </span>
                </div>
                <p className="text-xs font-medium text-zinc-200 truncate mt-0.5">
                  {primaryActive.label}
                </p>
              </div>
            </div>

            <Link
              href={primaryActive.path}
              className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[11px] font-mono font-medium border border-sky-500/30 transition-all flex items-center gap-1"
            >
              <span>View</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(primaryActive.progress || 25, 8)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Completed Job Notification Toast ── */}
      {completedJob && (
        <div className="relative overflow-hidden rounded-2xl bg-zinc-950/95 dark:bg-black/95 backdrop-blur-2xl border border-emerald-500/30 shadow-[0_12px_40px_rgba(16,185,129,0.2)] p-3.5 text-zinc-100 flex items-center justify-between gap-3 animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                Render Complete
              </span>
              <p className="text-xs font-medium text-zinc-200 truncate mt-0.5">
                {completedJob.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Link
              href={completedJob.path}
              onClick={() => {
                dismissCompletedJob(completedJob.id);
                setCompletedJob(null);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-mono font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1"
            >
              <span>Open</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              onClick={() => {
                dismissCompletedJob(completedJob.id);
                setCompletedJob(null);
              }}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
