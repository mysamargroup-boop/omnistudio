"use client";

import React from "react";
import Link from "next/link";
import { Palette, Sparkles, ArrowLeft, Sliders, ShieldCheck } from "lucide-react";
import { BrandKitPanel } from "@/components/brand/BrandKitModal";

export default function BrandKitPage() {
  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.06] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="p-2 rounded-xl bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
            title="Back to Settings"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-mono tracking-widest uppercase text-emerald-600 dark:text-emerald-400 font-semibold">
                STUDIO IDENTITY // VISUAL ARCHITECTURE
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-zinc-950 dark:text-white flex items-center gap-3">
              Brand Kit Studio
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-xs font-mono text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-zinc-500" />
            <span>API Settings</span>
          </Link>
        </div>
      </div>

      {/* Main Brand Kit Card Container */}
      <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] shadow-sm">
        <BrandKitPanel isEmbedded={true} />
      </div>
    </div>
  );
}
