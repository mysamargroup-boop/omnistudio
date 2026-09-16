"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, ArrowLeft, Sliders, FolderArchive, Sparkles } from "lucide-react";
import MetadataCleanerStudio from "@/components/studio/MetadataCleanerStudio";

function MetadataPageContent() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams?.get("url") || undefined;
  const initialPath = searchParams?.get("path") || undefined;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.06] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/studio"
            className="p-2 rounded-xl bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
            title="Back to Studio"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-500 font-bold">
                PROVENANCE SANITIZATION
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-emerald-500" />
              <span>AI Metadata Cleaner</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/vault"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-xs font-mono text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <FolderArchive className="w-3.5 h-3.5 text-zinc-500" />
            <span>Asset Vault</span>
          </Link>
          <Link
            href="/image"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-mono text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Image Studio</span>
          </Link>
        </div>
      </div>

      {/* Main Studio Engine */}
      <MetadataCleanerStudio initialImageUrl={initialUrl} initialImagePath={initialPath} />
    </div>
  );
}

export default function MetadataPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            Initializing Metadata Cleaner Engine...
          </span>
        </div>
      }
    >
      <MetadataPageContent />
    </Suspense>
  );
}
