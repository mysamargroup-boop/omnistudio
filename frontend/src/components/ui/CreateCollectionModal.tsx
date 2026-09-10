"use client";

import React, { useState } from "react";
import { X, FolderPlus, Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newCol: any) => void;
}

export default function CreateCollectionModal({
  isOpen,
  onClose,
  onCreated,
}: CreateCollectionModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a collection name.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.createCollection(name.trim(), description.trim());
      if (res.success && res.collection) {
        onCreated(res.collection);
        setName("");
        setDescription("");
        onClose();
      } else {
        setError(res.error || "Failed to create collection.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-[#0d0d14] border border-white/[0.1] shadow-2xl p-6 text-white space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-heading uppercase tracking-wide text-white">
                New Asset Collection
              </h2>
              <p className="text-[11px] font-mono text-zinc-400">Organize assets into custom projects</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-zinc-400 uppercase">Collection Name *</label>
            <input
              type="text"
              placeholder="e.g. YouTube Shorts Q1, Cyberpunk Series"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-zinc-600 outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-zinc-400 uppercase">Description (Optional)</label>
            <textarea
              placeholder="Short note or tags for this collection..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs font-jakarta text-white placeholder:text-zinc-600 outline-none focus:border-amber-400 resize-none"
            />
          </div>

          {error && (
            <p className="text-xs font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-heading font-bold text-xs tracking-tight transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
              ) : (
                <>
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>CREATE COLLECTION</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
