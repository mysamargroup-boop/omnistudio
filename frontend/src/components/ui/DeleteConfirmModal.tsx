"use client";

import React, { useEffect } from "react";
import {
  Trash2,
  Flame,
  X,
  RotateCcw,
} from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";

export interface DeleteModalItem {
  filename: string;
  type?: string;
  size_bytes?: number;
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  items: DeleteModalItem[];
  isPermanent?: boolean;
  isRestore?: boolean;
  isLoading?: boolean;
  title?: string;
  description?: string;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  items,
  isPermanent = false,
  isRestore = false,
  isLoading = false,
  title,
  description,
}: DeleteConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const totalBytes = items.reduce((acc, it) => acc + (it.size_bytes || 0), 0);
  const itemCount = items.length;

  const defaultTitle = isRestore
    ? `Restore ${itemCount === 1 ? "Asset" : `${itemCount} Assets`}?`
    : isPermanent
    ? `Permanently Purge ${itemCount === 1 ? "Asset" : `${itemCount} Assets`}?`
    : `Move ${itemCount === 1 ? "Asset" : `${itemCount} Assets`} to Trash?`;

  const defaultDescription = isRestore
    ? "These assets will be restored to your active vault and available across all creative studios."
    : isPermanent
    ? "Warning: This action is irreversible. Selected files will be permanently erased from your local hardware vault, Supabase database, and cloud storage."
    : "Assets will be safely moved to the Trash bin. You can restore them back to your vault anytime or permanently delete them later.";

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-jakarta"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-black/[0.06] dark:border-white/[0.06] flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border",
                isRestore
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                  : isPermanent
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-500"
              )}
            >
              {isRestore ? (
               <RotateCcw className="w-5 h-5" />
              ) : isPermanent ? (
                <Flame className="w-5 h-5" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-[10px] font-mono font-semibold tracking-wider uppercase px-2 py-0.5 rounded",
                    isRestore
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : isPermanent
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                  )}
                >
                  {isRestore ? "RESTORE" : isPermanent ? "PERMANENT DELETION" : "RECYCLE BIN"}
                </span>
                {totalBytes > 0 && (
                  <span className="text-[11px] font-mono text-zinc-500">
                    {formatBytes(totalBytes)}
                  </span>
                )}
              </div>

              <h2 className="text-lg font-bold font-heading text-zinc-950 dark:text-white tracking-tight">
                {title || defaultTitle}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Description & Item Preview */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-jakarta">
            {description || defaultDescription}
          </p>

          {/* Items list preview */}
          <div className="rounded-xl bg-zinc-50 dark:bg-[#111118] border border-black/[0.06] dark:border-white/[0.06] p-3 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            <div className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider flex justify-between">
              <span>TARGET FILE ({items.length})</span>
              <span>SIZE</span>
            </div>

            <div className="space-y-1.5">
              {items.slice(0, 5).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs font-mono py-1 px-2 rounded bg-white dark:bg-[#1c1c27] border border-black/[0.04] dark:border-white/[0.04]"
                >
                  <div className="flex items-center gap-2 truncate max-w-[280px]">
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-[#06060a] text-zinc-700 dark:text-zinc-400">
                      {item.type || "FILE"}
                    </span>
                    <span className="truncate text-zinc-900 dark:text-zinc-200">
                      {item.filename}
                    </span>
                  </div>
                  <span className="text-zinc-500 text-[11px] shrink-0">
                    {item.size_bytes ? formatBytes(item.size_bytes) : "—"}
                  </span>
                </div>
              ))}

              {items.length > 5 && (
                <p className="text-[11px] font-mono text-zinc-500 text-center pt-1">
                  ...and {items.length - 5} more files
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-50 dark:bg-[#16161f] border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-medium font-jakarta text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer bg-transparent"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-heading font-semibold tracking-tight transition-all cursor-pointer shadow-md active:scale-98 disabled:opacity-50",
              isRestore
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : isPermanent
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
                : "bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950"
            )}
          >
            {isLoading ? (
              <>
                <Spinner size="xs" variant="white" />
                <span>PROCESSING...</span>
              </>
            ) : isRestore ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESTORE TO VAULT</span>
              </>
            ) : isPermanent ? (
              <>
                <Flame className="w-3.5 h-3.5" />
                <span>PURGE PERMANENTLY</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>MOVE TO TRASH</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
