"use client";

import React from "react";
import Link from "next/link";
import { Shield, ArrowLeft, Lock, Database, Key, Server, Eye } from "lucide-react";

export default function PrivacyPolicyPage() {
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
          <span className="text-[10px] font-mono text-zinc-400">EFFECTIVE: SEPTEMBER 2026</span>
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-semibold">
            <Shield className="w-3 h-3" />
            <span>DATA CONFIDENTIALITY & SOVEREIGNTY</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
            OmniStudio AI is built as a personal, sovereign generative media suite. We respect your intellectual property, creative assets, and confidential credentials.
          </p>
        </div>

        {/* Core Principles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.08] space-y-2 shadow-xs">
            <Lock className="w-5 h-5 text-violet-500" />
            <h3 className="text-sm font-bold font-heading text-zinc-900 dark:text-white">Zero Cloud Snooping</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Your API keys and generated media are stored directly in your private database (Supabase Cloud / SQLite) and Cloudflare R2 bucket.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.08] space-y-2 shadow-xs">
            <Key className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold font-heading text-zinc-900 dark:text-white">BYOK (Bring Your Own Keys)</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              All AI model calls (OpenAI, Anthropic, ElevenLabs, Replicate) use your credentials. Requests go directly from your server to the provider.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.08] space-y-2 shadow-xs">
            <Database className="w-5 h-5 text-cyan-500" />
            <h3 className="text-sm font-bold font-heading text-zinc-900 dark:text-white">Self-Hosted Isolation</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              The application runs inside isolated Docker containers on your Hostinger Cloud VPS with strict token authentication and sandboxing.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-6 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-sm font-bold font-heading text-zinc-950 dark:text-zinc-200 uppercase tracking-wider font-mono">
              1. Information We Collect and Process
            </h2>
            <p>
              OmniStudio AI operates primarily in a single-tenant personal environment. When you log in using your private Passcode PIN or authenticated email, a secure cryptographic JWT is generated. We process prompts, image keyframes, audio scripts, and rendering settings solely for the purpose of executing the requested generative workflows.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold font-heading text-zinc-950 dark:text-zinc-200 uppercase tracking-wider font-mono">
              2. Storage of Generated Assets & Vault
            </h2>
            <p>
              All rendered media (MP4 videos, PNG images, WAV audio) are saved on your local host volume and synced with your designated Cloudflare R2 bucket. OmniStudio AI does not publish, train upon, or transmit your assets to any unauthorized third parties. You retain 100% full copyright and ownership over everything produced.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold font-heading text-zinc-950 dark:text-zinc-200 uppercase tracking-wider font-mono">
              3. Third-Party Neural Providers
            </h2>
            <p>
              When initiating requests to external providers (such as OpenAI, Replicate, or ElevenLabs), the prompt and source keyframes are transmitted securely over HTTPS under the respective provider’s API data privacy terms. These providers contractually state that API data is not used to train models.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold font-heading text-zinc-950 dark:text-zinc-200 uppercase tracking-wider font-mono">
              4. Asset Deletion & Trash Bin Retention
            </h2>
            <p>
              Assets moved to the Trash Bin remain recoverable until you trigger a Permanent Delete or Empty Trash action. Once purged, the underlying files are permanently unlinked from disk and removed from SQLite and Cloudflare R2.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
