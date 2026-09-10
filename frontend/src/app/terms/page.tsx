"use client";

import React from "react";
import Link from "next/link";
import { FileText, ArrowLeft, CheckCircle2, ShieldAlert, Cpu } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-zinc-900 dark:text-zinc-100 p-6 md:p-12 font-jakarta">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Navigation */}
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO STUDIO</span>
          </Link>
          <span className="text-[10px] font-mono text-zinc-400">VERSION 4.5 • SEPTEMBER 2026</span>
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-mono text-violet-600 dark:text-violet-400 uppercase tracking-widest font-semibold">
            <FileText className="w-3 h-3" />
            <span>STUDIO USAGE RIGHTS & TERMS</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
            These terms govern your usage of the OmniStudio AI generative workstation, autonomous cinema compiler, and associated APIs.
          </p>
        </div>

        <div className="space-y-6 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-sm font-bold font-heading text-zinc-950 dark:text-zinc-200 uppercase tracking-wider font-mono">
              1. Commercial Ownership of Generated Assets
            </h2>
            <p>
              You maintain 100% full commercial ownership and distribution rights for all images, videos, soundscapes, and compiled productions created through OmniStudio AI. You may broadcast, publish, monetize, and distribute these assets freely across social media, cinema, broadcast television, and digital platforms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold font-heading text-zinc-950 dark:text-zinc-200 uppercase tracking-wider font-mono">
              2. BYOK API Keys & Usage Quotas
            </h2>
            <p>
              OmniStudio AI facilitates direct invocation of third-party foundational models (such as OpenAI GPT/DALL-E, Anthropic Claude, ElevenLabs Speech, and Replicate Flux). You are responsible for maintaining valid API credentials and any billing incurred through your individual provider accounts.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold font-heading text-zinc-950 dark:text-zinc-200 uppercase tracking-wider font-mono">
              3. Responsible Generative Media Use
            </h2>
            <p>
              You agree not to use OmniStudio AI to generate unlawful content, non-consensual deepfakes, defamatory material, or media that infringes on trademark or intellectual property rights. OmniStudio AI provides tools for creative storytelling, artistic expression, and enterprise marketing.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold font-heading text-zinc-950 dark:text-zinc-200 uppercase tracking-wider font-mono">
              4. System Availability & Self-Hosting
            </h2>
            <p>
              The platform is architected for continuous Docker-based self-hosting on your private VPS infrastructure. Automated backups, health probes, and rate-limiting middleware are provided to ensure stable studio operation.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
