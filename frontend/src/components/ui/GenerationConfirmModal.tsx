'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  Coins,
  X,
  ArrowRight,
  AlertTriangle,
  Cpu,
  Sparkles,
  Image as ImageIcon,
  Film,
  Mic,
  Workflow,
  Copy,
  Check,
  Loader2,
  Lock,
  Server
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
  const [copied, setCopied] = useState(false);

  // Keyboard shortcut: Escape to close, Ctrl/Cmd+Enter to confirm
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !loading) {
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose, onConfirm]);

  if (!isOpen || !details) return null;

  const isFree = details.isFree || details.costUsd === 0;

  const handleCopyPrompt = () => {
    if (!details.prompt) return;
    navigator.clipboard.writeText(details.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getServiceMeta = (type: string) => {
    switch (type) {
      case 'image':
        return { label: 'Visual Diffusion Studio', icon: ImageIcon, accent: 'text-zinc-900 dark:text-zinc-100' };
      case 'video':
        return { label: 'Motion Cinema Studio', icon: Film, accent: 'text-zinc-900 dark:text-zinc-100' };
      case 'voice':
        return { label: 'Neural Voice Workstation', icon: Mic, accent: 'text-zinc-900 dark:text-zinc-100' };
      case 'pipeline':
        return { label: 'Autonomous AI Pipeline', icon: Workflow, accent: 'text-zinc-900 dark:text-zinc-100' };
      default:
        return { label: 'OmniStudio Creative', icon: Sparkles, accent: 'text-zinc-900 dark:text-zinc-100' };
    }
  };

  const serviceMeta = getServiceMeta(details.serviceType);
  const ServiceIcon = serviceMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Background ambient glow halo */}
      <div
        className={cn(
          'absolute w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-all',
          isFree
            ? 'bg-emerald-500/20'
            : 'bg-violet-500/20'
        )}
      />

      <div
        className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl overflow-hidden font-sans text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Rim */}
        <div
          className={cn(
            'h-1 w-full',
            isFree
              ? 'bg-emerald-500'
              : 'bg-zinc-950 dark:bg-white'
          )}
        />

        <div className="p-5 sm:p-6 space-y-5">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                {isFree ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/25 shadow-sm">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    <ShieldCheck className="h-3 w-3" /> Zero-Spend Local Compute
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-zinc-950 dark:bg-white" />
                    </span>
                    <Lock className="h-3 w-3" /> API Spend Authorization
                  </span>
                )}

                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest hidden sm:inline-flex items-center gap-1">
                  <ServiceIcon className="h-3 w-3" /> {serviceMeta.label}
                </span>
              </div>

              <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight flex items-center gap-2 font-heading">
                <span>Confirm Generation Request</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
                Review model specifications and credit deduction before execution.
              </p>
            </div>

            <button
              onClick={onClose}
              disabled={loading}
              className="text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white p-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.06] transition-colors cursor-pointer shrink-0"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Spend Highlight Tile (Fintech Grade) */}
          <div
            className={cn(
              'relative rounded-2xl border p-4 sm:p-5 overflow-hidden transition-all shadow-inner',
              isFree
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30'
                : 'bg-zinc-50 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800'
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={cn(
                    'h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 shadow-sm border',
                    isFree
                      ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 shadow-emerald-500/10'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700'
                  )}
                >
                  {isFree ? (
                    <Zap className="h-5 w-5" />
                  ) : (
                    <Coins className="h-5 w-5" />
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {isFree ? 'Estimated Compute Cost' : 'Estimated Generation Cost'}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-zinc-950 dark:text-white">
                      {isFree ? '₹0.00' : `₹${details.costInr.toFixed(2)}`}
                    </span>
                    {!isFree ? (
                      <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                        (~${details.costUsd.toFixed(3)} USD)
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                        Free Tier
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className={cn(
                    'text-[10px] font-mono px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider border shadow-sm',
                    isFree
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                      : 'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30'
                  )}
                >
                  {isFree ? 'Zero Cloud Spend' : 'Cloud Credit'}
                </span>
                <span className="text-[9px] font-mono text-zinc-500">
                  {isFree ? 'Local Hardware' : 'Direct BYOK'}
                </span>
              </div>
            </div>
          </div>

          {/* Model & Technical Specs Details Card */}
          <div className="bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-4 space-y-3.5">
            {/* Model & Provider Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                  AI Model
                </span>
                <div className="flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <span className="font-semibold text-zinc-900 dark:text-white truncate text-sm">
                    {details.modelName}
                  </span>
                </div>
              </div>

              <div className="text-right space-y-0.5 shrink-0">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                  Provider
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] text-[11px] font-mono font-medium text-zinc-700 dark:text-zinc-300 uppercase shadow-sm">
                  <Server className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                  {details.provider}
                </span>
              </div>
            </div>

            {/* Configured Parameters Badges */}
            {details.specs && Object.keys(details.specs).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                  Specifications
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(details.specs).map(([key, val]) => {
                    if (!val) return null;
                    return (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1 bg-white dark:bg-zinc-900/90 hover:bg-zinc-50 dark:hover:bg-zinc-800/90 border border-black/[0.07] dark:border-white/[0.07] px-2.5 py-1 rounded-lg text-[10px] font-mono text-zinc-700 dark:text-zinc-300 transition-colors shadow-sm"
                      >
                        <span className="text-zinc-500 capitalize">{key}:</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-200">{String(val)}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Prompt Preview Block */}
            {details.prompt && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                    Active Prompt Preview
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative rounded-xl bg-black/[0.03] dark:bg-black/50 border border-black/[0.06] dark:border-white/[0.06] p-3 text-xs text-zinc-700 dark:text-zinc-300 font-sans italic leading-relaxed line-clamp-3">
                  "{details.prompt}"
                </div>
              </div>
            )}
          </div>

          {/* Security & Billing Notice */}
          {!isFree ? (
            <div className="flex items-start gap-2.5 text-[11px] text-zinc-600 dark:text-zinc-400 bg-amber-50 dark:bg-amber-500/[0.04] border border-amber-200 dark:border-amber-500/20 p-3 rounded-2xl leading-relaxed font-mono">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400 mt-0.5" />
              <span>
                Zero platform commission. Clicking <strong className="text-zinc-900 dark:text-zinc-200">"Confirm & Generate"</strong> will execute this request against your active {details.provider} API account.
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 text-[11px] text-emerald-700 dark:text-emerald-400/90 bg-emerald-50 dark:bg-emerald-500/[0.04] border border-emerald-200 dark:border-emerald-500/20 p-3 rounded-2xl leading-relaxed font-mono">
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400 mt-0.5" />
              <span>
                This generation runs completely on your local machine using hardware-accelerated synthesis. No cloud tokens will be billed.
              </span>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-400">Esc</kbd>
              <span>to cancel</span>
              <span className="mx-1">•</span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-400">Ctrl+↵</kbd>
              <span>to confirm</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-1/2 sm:w-auto px-4 py-2.5 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white bg-zinc-100 dark:bg-white/[0.03] hover:bg-zinc-200 dark:hover:bg-white/[0.08] border border-black/[0.08] dark:border-white/[0.08] rounded-xl transition-all cursor-pointer font-medium disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={cn(
                  'w-1/2 sm:w-auto relative flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-mono font-bold rounded-xl transition-all shadow-md cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed',
                  isFree
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                    : 'bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950'
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Dispatching...</span>
                  </>
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
    </div>
  );
}
