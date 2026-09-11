import React from "react";
import Spinner from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner">
          <Spinner size="md" variant="emerald" />
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-heading">
            Loading Workspace Space
          </h3>
          <p className="text-xs text-zinc-500 font-mono">
            Synchronizing AI engines & assets...
          </p>
        </div>

        {/* Shimmer progress line */}
        <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-2">
          <div className="h-full w-2/3 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
