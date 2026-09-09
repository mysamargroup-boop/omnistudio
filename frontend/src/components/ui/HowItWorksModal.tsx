"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Cpu,
  Camera,
  Layers,
  HardDrive,
  CheckCircle2,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStep?: number;
}

const GUIDE_STEPS = [
  {
    id: 1,
    title: "1. Select AI Foundation Engine",
    subtitle: "Frontier multimodal models tailored for precision",
    icon: Cpu,
    tag: "ENGINE FOUNDATION",
    summary:
      "OmniStudio connects to the world's most advanced frontier image and video models with zero vendor lock-in.",
    highlights: [
      {
        name: "OpenAI GPT-Image 2 (Flagship)",
        desc: "Best-in-class prompt adherence, realistic skin textures, multi-subject staging, and near-perfect in-image typography.",
      },
      {
        name: "Google Imagen 3 (DeepMind)",
        desc: "Hyper-realistic volumetric lighting, reflections, micro-textures, and high-fidelity photorealism.",
      },
      {
        name: "OpenAI GPT-Image 1 Mini",
        desc: "Super-fast generation (~6-8s) engineered for rapid concept exploration and agile ideation.",
      },
      {
        name: "Video Engines (FFmpeg / Kling / Runway)",
        desc: "From zero-cost local CPU/GPU FFmpeg morphing to state-of-the-art cinematic video synthesis.",
      },
    ],
    proTip:
      "Use 'GPT-Image 2' when your scene requires readable text, signage, or complex interaction between multiple characters.",
  },
  {
    id: 2,
    title: "2. AI Director & Prompt Copilot",
    subtitle: "Parallel narrative enrichment with OpenAI GPT-4o",
    icon: Sparkles,
    tag: "PARALLEL AGENT",
    summary:
      "Transform simple concepts into Hollywood-grade cinematographic prompts with one click using the built-in AI Director.",
    highlights: [
      {
        name: "Automatic Optics Conditioning",
        desc: "The director agent injects optimal focal lengths, anamorphic lens profiles, and ISO settings based on your narrative.",
      },
      {
        name: "Volumetric Lighting Schemes",
        desc: "Chooses between Golden Hour sun, dramatic Chiaroscuro rim light, or cyber neon reflections to establish visual mood.",
      },
      {
        name: "Negative Prompt Defect Suppression",
        desc: "Suppresses motion blur, jitter, extra limbs, and artificial plastic sheen automatically.",
      },
    ],
    proTip:
      "Click 'Direct with OpenAI' in either Image Studio or Video Studio to watch the AI director compose professional technical directives in real time.",
  },
  {
    id: 3,
    title: "3. Optics, Aspect Ratio & Bitrate",
    subtitle: "Precision camera parameters for cinematic framing",
    icon: Camera,
    tag: "STUDIO OPTICS",
    summary:
      "Shape composition, depth of field, and resolution directly from the floating studio dock.",
    highlights: [
      {
        name: "Aspect Ratios",
        desc: "16:9 for YouTube & Cinema, 9:16 for TikTok/Reels/Shorts, 1:1 for Social Square, and 21:9 for Cinemascope.",
      },
      {
        name: "Aperture & Bokeh",
        desc: "Choose f/1.2 for ultra-shallow depth of field and creamy background blur, or f/8 to f/16 for crisp architectural deep field.",
      },
      {
        name: "Lens Profiles",
        desc: "35mm Prime for natural environmental portraits, 85mm Portrait for close-up glamour, 24mm Anamorphic for widescreen drama.",
      },
      {
        name: "Resolution & FPS",
        desc: "Render from 720p HD drafts up to 4K Master resolution with 24fps cinematic cadence or 60fps smooth playback.",
      },
    ],
    proTip:
      "Pair an 85mm lens with f/1.2 aperture and Golden Hour lighting for breathtaking character close-ups.",
  },
  {
    id: 4,
    title: "4. Batch Variations & Keyframes",
    subtitle: "Multi-angle variation strips & video interpolation",
    icon: Layers,
    tag: "BATCH SYNTHESIS",
    summary:
      "Generate multiple parallel variations at once and inspect them in interactive thumbnail strips.",
    highlights: [
      {
        name: "1, 2, 4 Batch Stepper",
        desc: "Use the '– 1/4 +' stepper on the floating dock to produce up to 4 distinct variations in a single click.",
      },
      {
        name: "Interactive Variations Strip",
        desc: "Instantly preview, compare, zoom, and download individual variation keyframes above the main canvas.",
      },
      {
        name: "Keyframe Staging & Morphing",
        desc: "In Video Studio, select Start Frame and End Frame from your Vault to synthesize smooth neural transitions.",
      },
      {
        name: "Motion Transfer",
        desc: "Upload a source video to transfer dynamic human motion onto any target still character image.",
      },
    ],
    proTip:
      "Select '4 Batch' to explore distinct seeds simultaneously, then pick the winning frame to animate into video.",
  },
  {
    id: 5,
    title: "5. Dual Storage & Resilient BYOK",
    subtitle: "Hostinger NVMe speed + Cloudflare R2 backup + Supabase fail-safe",
    icon: HardDrive,
    tag: "ENTERPRISE SECURITY",
    summary:
      "Your assets and API keys are protected by an enterprise-grade fail-safe architecture.",
    highlights: [
      {
        name: "Dual Media Delivery",
        desc: "Assets are delivered instantly via Hostinger NVMe SSD HTTP 200 OK proxy, and backed up in Cloudflare R2 object storage.",
      },
      {
        name: "Fail-Safe Key Hierarchy",
        desc: "Backend queries Supabase cloud database first. If Supabase is offline or a key is missing, it falls back to local VPS .env without downtime.",
      },
      {
        name: "Live Security Transparency",
        desc: "BYOK settings reveal exact active key sources with show/hide toggle, masked previews, and verification badges.",
      },
      {
        name: "Asset Vault & Safe Recycle Bin",
        desc: "Manage masters, videos, images, and audio with soft-delete Trash protection, bulk restores, and permanent purges.",
      },
    ],
    proTip:
      "You can add or update your keys anytime in Settings (/settings) — changes sync instantly across Supabase and VPS runtime.",
  },
];

export default function HowItWorksModal({ isOpen, onClose, initialStep = 1 }: HowItWorksModalProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);

  useEffect(() => {
    setCurrentStep(initialStep);
  }, [initialStep]);

  if (!isOpen) return null;

  const step = GUIDE_STEPS.find((s) => s.id === currentStep) || GUIDE_STEPS[0];
  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-jakarta"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between bg-zinc-50/50 dark:bg-black/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold">
                  OMNISTUDIO GUIDE
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400 font-bold uppercase">
                  5-STEP WORKFLOW
                </span>
              </div>
              <h2 className="text-xl font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight">
                How OmniStudio Works
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            title="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Navigation Pills */}
        <div className="flex items-center gap-1.5 p-3 px-5 border-b border-black/[0.06] dark:border-white/[0.06] bg-zinc-100/60 dark:bg-[#06060a] overflow-x-auto custom-scrollbar">
          {GUIDE_STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(s.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0",
                currentStep === s.id
                  ? "bg-violet-600 text-white font-bold shadow-sm"
                  : "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.1]"
              )}
            >
              <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">
                {s.id}
              </span>
              <span>{s.tag}</span>
            </button>
          ))}
        </div>

        {/* Step Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar">
          {/* Step Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-[#111118] border border-black/[0.06] dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-black">
                <StepIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-heading font-bold text-zinc-950 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-jakarta">
                  {step.subtitle}
                </p>
              </div>
            </div>
            <span className="self-start sm:self-center text-[10px] font-mono px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 font-semibold">
              STEP {step.id} OF 5
            </span>
          </div>

          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-jakarta">
            {step.summary}
          </p>

          {/* Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {step.highlights.map((h, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-zinc-50 dark:bg-[#111118] border border-black/[0.06] dark:border-white/[0.06] space-y-1.5 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />
                  <h4 className="text-xs font-heading font-bold text-zinc-950 dark:text-white">
                    {h.name}
                  </h4>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed pl-6">
                  {h.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Pro Tip Callout */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold uppercase font-mono tracking-wider mr-1.5 text-amber-600 dark:text-amber-400">
                PRO TIP:
              </span>
              <span>{step.proTip}</span>
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-black/[0.08] dark:border-white/[0.08] bg-zinc-50/50 dark:bg-black/30 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((p) => Math.max(1, p - 1))}
            className="px-4 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#06060a] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-all whitespace-nowrap shrink-0"
          >
            Previous Step
          </button>

          <div className="flex items-center gap-1.5">
            {GUIDE_STEPS.map((s) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(s.id)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all cursor-pointer",
                  currentStep === s.id
                    ? "w-6 bg-violet-500"
                    : "bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400"
                )}
                aria-label={`Go to step ${s.id}`}
              />
            ))}
          </div>

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((p) => Math.min(5, p + 1))}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-black font-heading font-bold text-xs tracking-tight hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-heading font-bold text-xs tracking-tight transition-all cursor-pointer shadow-md shadow-violet-600/20 whitespace-nowrap shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Start Creating</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
