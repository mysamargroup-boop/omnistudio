'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, Trash2 } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception for telemetry
    console.error('OmniStudio Runtime Error Caught:', error);
  }, [error]);

  const handleClearCacheAndReset = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('omnistudio_studio_draft_v1');
        sessionStorage.clear();
      }
    } catch (e) {
      console.warn('Cache clear failed:', e);
    }
    reset();
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-neutral-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-900/80 border border-red-500/30 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">Execution Interrupted</h2>
            <p className="text-xs text-neutral-400">OmniStudio Neural Engine Client Boundary</p>
          </div>
        </div>

        <p className="text-sm text-neutral-300 mb-4 leading-relaxed">
          An unexpected interface exception occurred. The runtime caught the error safely to prevent session corruption.
        </p>

        {error.message && (
          <div className="p-3 bg-black/50 border border-white/5 rounded-lg mb-6 overflow-x-auto text-xs font-mono text-red-300 max-h-32 select-all">
            {error.message}
            {error.digest && (
              <div className="mt-1 text-neutral-500 text-[10px]">
                Digest ID: {error.digest}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => reset()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-red-950/40 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Component
          </button>

          <button
            onClick={handleClearCacheAndReset}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-medium text-xs rounded-xl transition-all border border-white/5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-neutral-400" />
            Reset Studio Draft Cache & Retry
          </button>

          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-transparent hover:bg-white/5 text-neutral-400 hover:text-neutral-200 text-xs rounded-xl transition-all cursor-pointer text-center"
          >
            <Home className="w-3.5 h-3.5" />
            Return to Studio Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
