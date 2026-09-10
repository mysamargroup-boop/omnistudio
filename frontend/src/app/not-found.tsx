"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Video, Image as ImageIcon, Mic, Cpu, FolderArchive, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-6 font-jakarta relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/10 dark:bg-violet-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-xl w-full text-center space-y-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>ERROR 404 • WORKSPACE NOT FOUND</span>
        </div>

        <h1 className="text-6xl md:text-8xl font-heading font-extrabold tracking-tighter text-zinc-950 dark:text-white">
          404
        </h1>

        <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 font-jakarta max-w-md mx-auto leading-relaxed">
          The creative canvas or endpoint you are looking for does not exist or has been relocated. Return to the workstation below.
        </p>

        {/* Quick studio destinations */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 text-left">
          <Link
            href="/studio"
            className="p-3.5 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.08] hover:border-violet-500/40 transition-all group shadow-xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-violet-500 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-white font-heading">Studio Pro</div>
            <div className="text-[10px] text-zinc-500 font-mono">All-in-one suite</div>
          </Link>

          <Link
            href="/pipeline"
            className="p-3.5 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.08] hover:border-violet-500/40 transition-all group shadow-xs cursor-pointer"
          >
            <Cpu className="w-4 h-4 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-white font-heading">Auto Pipeline</div>
            <div className="text-[10px] text-zinc-500 font-mono">Autonomous cinema</div>
          </Link>

          <Link
            href="/video"
            className="p-3.5 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.08] hover:border-violet-500/40 transition-all group shadow-xs cursor-pointer"
          >
            <Video className="w-4 h-4 text-cyan-500 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-white font-heading">Video Studio</div>
            <div className="text-[10px] text-zinc-500 font-mono">Camera kinematics</div>
          </Link>

          <Link
            href="/image"
            className="p-3.5 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.08] hover:border-violet-500/40 transition-all group shadow-xs cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-white font-heading">Image Studio</div>
            <div className="text-[10px] text-zinc-500 font-mono">Diffusion sampler</div>
          </Link>

          <Link
            href="/voice"
            className="p-3.5 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.08] hover:border-violet-500/40 transition-all group shadow-xs cursor-pointer"
          >
            <Mic className="w-4 h-4 text-rose-500 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-white font-heading">Voice Studio</div>
            <div className="text-[10px] text-zinc-500 font-mono">Neural speech</div>
          </Link>

          <Link
            href="/vault"
            className="p-3.5 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.08] hover:border-violet-500/40 transition-all group shadow-xs cursor-pointer"
          >
            <FolderArchive className="w-4 h-4 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-white font-heading">Asset Vault</div>
            <div className="text-[10px] text-zinc-500 font-mono">Storage & repository</div>
          </Link>
        </div>

        <div className="pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 font-heading font-bold text-xs shadow-md transition-all active:scale-98 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>RETURN TO DASHBOARD</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
