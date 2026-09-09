'use client';

import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Coins,
  X,
  ArrowRight,
  AlertTriangle,
  Info,
  Clock,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GenerationConfirmDetails {
  serviceType: 'image' | 'video' | 'voice' | 'pipeline';
  modelName: string;
  provider: string;
  prompt?: string;
  specs?: Record<string, any>;
  costUsd: number;
  costInr: number;
  isFree?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  details: GenerationConfirmDetails | null;
  loading?: boolean;
}

export default function GenerationConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  details,
  loading = false,
}: Props) {
  if (!isOpen || !details) return null;

  const isFree = details.isFree || details.costUsd === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-[#0c0c12] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden font-sans text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Glow */}
        <div
          className={cn(
            'h-1.5 w-full',
            isFree
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
              : 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600'
          )}
        />

        <div className="p-6 space-y-5">
          {/* Header Row */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {isFree ? (
                  <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <ShieldCheck className="h-3.5 w-3.5" /> 100% Free Local Execution
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    <ShieldAlert className="h-3.5 w-3.5" /> API Spend Authorization
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Confirm Generation Request?
              </h2>
            </div>

            <button
              onClick={onClose}
              disabled={loading}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Spend Highlight Banner */}
          <div
            className={cn(
              'p-4 rounded-xl border flex items-center justify-between',
              isFree
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-zinc-900/80 border-rose-500/30 text-zinc-200'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center font-bold text-lg',
                  isFree
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                )}
              >
                {isFree ? '₹0' : <Coins className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  {isFree ? 'Zero Cloud Spend' : 'Estimated Generation Cost'}
                </p>
                <p className="text-xl font-black font-mono text-white">
                  {isFree ? '₹0.00 FREE' : `₹${details.costInr.toFixed(2)}`}
                  {!isFree && (
                    <span className="text-xs font-normal text-zinc-400 ml-2">
                      (~${details.costUsd.toFixed(3)} USD)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <span
              className={cn(
                'text-[10px] font-mono px-2 py-1 rounded font-bold uppercase',
                isFree
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              )}
            >
              {isFree ? 'No API Usage' : 'Cloud Credit'}
            </span>
          </div>

          {/* Details Card */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div>
                <span className="text-zinc-500 block">MODEL:</span>
                <span className="font-semibold text-zinc-200 truncate block">
                  {details.modelName}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">PROVIDER:</span>
                <span className="font-semibold text-zinc-200 uppercase block">
                  {details.provider}
                </span>
              </div>
            </div>

            {/* Parameters Row */}
            {details.specs && Object.keys(details.specs).length > 0 && (
              <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap gap-2 text-[10px] font-mono text-zinc-400">
                {details.specs.resolution && (
                  <span className="bg-zinc-800 px-2 py-0.5 rounded">
                    Res: {details.specs.resolution}
                  </span>
                )}
                {details.specs.duration && (
                  <span className="bg-zinc-800 px-2 py-0.5 rounded">
                    Duration: {details.specs.duration}s
                  </span>
                )}
                {details.specs.quality && (
                  <span className="bg-zinc-800 px-2 py-0.5 rounded">
                    Quality: {details.specs.quality}
                  </span>
                )}
                {details.specs.motion && (
                  <span className="bg-zinc-800 px-2 py-0.5 rounded">
                    Motion: {details.specs.motion}
                  </span>
                )}
                {details.specs.scenes && (
                  <span className="bg-zinc-800 px-2 py-0.5 rounded">
                    Scenes: {details.specs.scenes}
                  </span>
                )}
                {details.specs.characters && (
                  <span className="bg-zinc-800 px-2 py-0.5 rounded">
                    Chars: {details.specs.characters}
                  </span>
                )}
              </div>
            )}

            {/* Prompt Preview */}
            {details.prompt && (
              <div className="pt-2 border-t border-zinc-800/80">
                <span className="text-zinc-500 text-[10px] font-mono block mb-1">
                  PROMPT:
                </span>
                <p className="text-zinc-300 line-clamp-2 italic bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/50">
                  "{details.prompt}"
                </p>
              </div>
            )}
          </div>

          {/* Cloud API Warning Note (If Paid) */}
          {!isFree ? (
            <div className="flex items-start gap-2 text-[11px] text-amber-400/90 bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl leading-relaxed font-mono">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                Clicking "Confirm & Proceed" will execute this request against your active {details.provider} billing account.
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-[11px] text-emerald-400/90 bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-xl leading-relaxed font-mono">
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>
                This generation runs completely on your local machine. No external cloud charges will apply.
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-mono text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all cursor-pointer"
            >
              Cancel (Don't Generate)
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                'flex items-center gap-2 px-5 py-2 text-xs font-mono font-bold rounded-xl transition-all shadow-lg cursor-pointer',
                isFree
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              )}
            >
              {loading ? (
                <span>Executing...</span>
              ) : (
                <>
                  <span>Confirm & Generate</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
