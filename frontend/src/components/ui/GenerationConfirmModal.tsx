'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  isKeyConfigured?: boolean;
  keyMissingMessage?: string;
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard shortcut: Escape to close, Ctrl/Cmd+Enter to confirm
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !loading && details?.isKeyConfigured !== false) {
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose, onConfirm, details?.isKeyConfigured]);

  if (!isOpen || !details || !mounted) return null;

  const isFree = details.isFree || details.costUsd === 0;
  const isKeyMissing = details.isKeyConfigured === false;

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

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      {/* Background ambient glow halo */}
      <div
        className={cn(
          'absolute w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-all',
          isFree
            ? 'bg-emerald-500/20'
            : isKeyMissing
            ? 'bg-rose-500/20'
            : 'bg-emerald-500/20'
        )}
      />

      <div
        className="relative w-full max-w-4xl rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl overflow-hidden font-sans text-zinc-900 dark:text-zinc-100 cursor-default animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Rim */}
        <div
          className={cn(
            'h-1.5 w-full bg-gradient-to-r',
            isFree
              ? 'from-emerald-500 via-teal-400 to-cyan-500'
              : 'from-violet-600 via-indigo-500 to-cyan-400'
          )}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs",
              isFree ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500" : "bg-violet-500/15 border-violet-500/30 text-violet-400"
            )}>
              <ServiceIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white font-heading">
                  Confirm Generation Request
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 font-semibold border border-black/[0.06] dark:border-white/[0.06]">
                  {serviceMeta.label}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
                Review model specifications and estimated compute spend before execution.
              </p>
            </div>
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

        {/* Landscape Body: 2 Columns */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          {/* Left Column (5 Cols): Compute Spend & Security Info */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-4">
            {/* Spend Tile */}
            <div
              className={cn(
                'rounded-2xl border p-4 sm:p-5 overflow-hidden transition-all shadow-inner space-y-3',
                isFree
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-500/30'
                  : 'bg-zinc-50 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border shadow-xs',
                      isFree
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700'
                    )}
                  >
                    {isFree ? <Zap className="h-4 w-4" /> : <Coins className="h-4 w-4" />}
                  </div>
                  <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-zinc-600 dark:text-zinc-400">
                    {isFree ? 'Compute Cost' : 'Estimated Cost'}
                  </span>
                </div>
                <span
                  className={cn(
                    'text-[9px] font-mono px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border shadow-xs',
                    isFree
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                      : 'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30'
                  )}
                >
                  {isFree ? 'Zero Spend' : 'Direct BYOK'}
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-zinc-950 dark:text-white">
                    {isFree ? '₹0.00' : `₹${details.costInr.toFixed(2)}`}
                  </span>
                  {!isFree ? (
                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      (~${details.costUsd.toFixed(3)} USD)
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                      Free Local Engine
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  {isFree
                    ? "Runs completely on local accelerated hardware. No cloud credit billed."
                    : "Zero platform markup. Deducted directly from your configured API key."}
                </p>
              </div>
            </div>

            {/* Security / Key Notice */}
            <div className="flex-1 flex flex-col justify-center">
              {isKeyMissing ? (
                <div className="flex items-start gap-2.5 text-[11px] text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/[0.08] border border-rose-200 dark:border-rose-500/30 p-3.5 rounded-xl leading-relaxed font-mono">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <div>
                    <strong className="block font-bold mb-0.5">API Key Required</strong>
                    <span>{details.keyMissingMessage || `API key for ${details.provider} is not configured in Settings.`}</span>
                  </div>
                </div>
              ) : !isFree ? (
                <div className="flex items-start gap-2.5 text-[11px] text-zinc-600 dark:text-zinc-400 bg-amber-500/[0.06] border border-amber-500/20 p-3.5 rounded-xl leading-relaxed font-mono">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  <span>
                    Direct BYOK synthesis authorized. Authenticated against your personal {details.provider} token.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 text-[11px] text-emerald-700 dark:text-emerald-400/90 bg-emerald-500/[0.06] border border-emerald-500/20 p-3.5 rounded-xl leading-relaxed font-mono">
                  <Sparkles className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>
                    Synthesized locally on your system using zero-spend hardware pipelines.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (7 Cols): Model Specs, Active Parameters, and Prompt Preview */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            <div className="bg-zinc-50/80 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-4 space-y-3">
              {/* Model & Provider */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-black/[0.06] dark:border-white/[0.06]">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                    AI Model Engine
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Cpu className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-zinc-950 dark:text-white truncate text-sm">
                      {details.modelName}
                    </span>
                  </div>
                </div>

                <div className="text-right space-y-0.5 shrink-0">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                    Provider
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] text-[11px] font-mono font-medium text-zinc-700 dark:text-zinc-300 uppercase shadow-xs">
                    <Server className="h-3 w-3 text-zinc-400" />
                    {details.provider}
                  </span>
                </div>
              </div>

              {/* Specifications Pills */}
              {details.specs && Object.keys(details.specs).length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                    Active Shot Specifications
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(details.specs).map(([key, val]) => {
                      if (!val) return null;
                      return (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1 bg-white dark:bg-zinc-900/90 border border-black/[0.07] dark:border-white/[0.07] px-2 py-0.5 rounded-md text-[10px] font-mono text-zinc-700 dark:text-zinc-300 shadow-2xs"
                        >
                          <span className="text-zinc-400 capitalize">{key}:</span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-200">{String(val)}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Prompt Preview */}
              {details.prompt && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Prompt Preview
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="rounded-xl bg-black/[0.03] dark:bg-black/50 border border-black/[0.06] dark:border-white/[0.06] p-2.5 text-xs text-zinc-700 dark:text-zinc-300 font-sans italic leading-relaxed max-h-24 overflow-y-auto custom-scrollbar">
                    "{details.prompt}"
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Landscape Footer */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-white/[0.02] border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between flex-wrap gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-400 font-semibold">Esc</kbd>
            <span>Cancel</span>
            <span className="mx-1">•</span>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-400 font-semibold">Ctrl+↵</kbd>
            <span>Quick Confirm</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white bg-zinc-200/70 hover:bg-zinc-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-black/[0.08] dark:border-white/[0.08] rounded-xl transition-all cursor-pointer font-medium disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading || isKeyMissing}
              className={cn(
                'relative flex items-center justify-center gap-2 px-6 py-2 text-xs font-mono font-bold rounded-xl transition-all shadow-md cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed',
                isFree
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                  : isKeyMissing
                  ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500 shadow-none'
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
                  <span>{isKeyMissing ? 'Key Required' : 'Confirm & Execute'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

    </div>,
    document.body
  );
}
