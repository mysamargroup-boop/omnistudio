"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  AtSign,
  Upload,
  Image as ImageIcon,
  Film,
  Search,
  X,
  Check,
  Plus,
  Loader2,
  FolderArchive,
  Sparkles,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface MentionCandidate {
  id: string;
  url: string;
  filename: string;
  tag: string;
  type: "image" | "video";
  badge?: string;
  source?: "current" | "vault";
}

interface MentionReferencePopoverProps {
  isOpen: boolean;
  query: string;
  onClose: () => void;
  onSelect: (item: MentionCandidate) => void;
  onUploadClick: () => void;
  currentRefs?: MentionCandidate[];
  isUploading?: boolean;
}

export default function MentionReferencePopover({
  isOpen,
  query,
  onClose,
  onSelect,
  onUploadClick,
  currentRefs = [],
  isUploading = false,
}: MentionReferencePopoverProps) {
  const [vaultAssets, setVaultAssets] = useState<MentionCandidate[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Load Vault assets when popover opens
  useEffect(() => {
    if (isOpen && !hasFetched) {
      setLoadingVault(true);
      api.getAllAssets()
        .then((data) => {
          const list: MentionCandidate[] = [];
          if (data?.images && Array.isArray(data.images)) {
            data.images.slice(0, 40).forEach((img: any, idx: number) => {
              const clean = (img.filename || `vault_img_${idx}`)
                .replace(/\.[^/.]+$/, "")
                .replace(/[^a-zA-Z0-9_\-]/g, "_")
                .toLowerCase();
              list.push({
                id: `vault_img_${idx}_${img.url}`,
                url: img.url,
                filename: img.filename || `Image ${idx + 1}`,
                tag: clean,
                type: "image",
                badge: "VAULT IMG",
                source: "vault",
              });
            });
          }
          if (data?.videos && Array.isArray(data.videos)) {
            data.videos.slice(0, 20).forEach((vid: any, idx: number) => {
              const clean = (vid.filename || `vault_vid_${idx}`)
                .replace(/\.[^/.]+$/, "")
                .replace(/[^a-zA-Z0-9_\-]/g, "_")
                .toLowerCase();
              list.push({
                id: `vault_vid_${idx}_${vid.url}`,
                url: vid.url,
                filename: vid.filename || `Video ${idx + 1}`,
                tag: clean,
                type: "video",
                badge: "VAULT VID",
                source: "vault",
              });
            });
          }
          setVaultAssets(list);
          setHasFetched(true);
        })
        .catch((err) => console.warn("Could not fetch vault assets for @ mention:", err))
        .finally(() => setLoadingVault(false));
    }
  }, [isOpen, hasFetched]);

  // Combine current references and vault assets, avoiding duplicate URLs
  const seenUrls = new Set<string>();
  const combinedCandidates: MentionCandidate[] = [];

  for (const c of currentRefs) {
    if (!seenUrls.has(c.url)) {
      seenUrls.add(c.url);
      combinedCandidates.push({ ...c, source: "current", badge: c.badge || (c.type === "video" ? "VIDEO REF" : "IMG REF") });
    }
  }

  for (const v of vaultAssets) {
    if (!seenUrls.has(v.url)) {
      seenUrls.add(v.url);
      combinedCandidates.push(v);
    }
  }

  // Filter candidates by query
  const q = query.trim().toLowerCase();
  const filtered = combinedCandidates.filter((item) => {
    if (!q) return true;
    return (
      item.tag.toLowerCase().includes(q) ||
      item.filename.toLowerCase().includes(q) ||
      (item.badge && item.badge.toLowerCase().includes(q))
    );
  });

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (filtered.length > 0 && filtered[selectedIndex]) {
          e.preventDefault();
          onSelect(filtered[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      data-popover-content="true"
      className="absolute bottom-full left-0 mb-2 w-80 sm:w-96 max-h-[380px] rounded-2xl bg-white/95 dark:bg-[#12121c]/95 backdrop-blur-2xl border border-black/[0.1] dark:border-white/[0.12] shadow-2xl p-2.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 flex flex-col gap-2"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
          <div className="w-5 h-5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <AtSign className="w-3.5 h-3.5" />
          </div>
          <span>Tag Reference Asset</span>
          {query && (
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal">
              • @{query}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top Action: Upload New Reference Button */}
      <button
        type="button"
        onClick={() => {
          onUploadClick();
          onClose();
        }}
        disabled={isUploading}
        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-heading font-bold flex items-center justify-between transition-all cursor-pointer shadow-xs active:scale-[0.99]"
      >
        <div className="flex items-center gap-2">
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          ) : (
            <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          )}
          <span>{isUploading ? "Uploading Reference..." : "+ Upload Reference from Device"}</span>
        </div>
        <span className="text-[10px] font-mono opacity-70">PNG, JPG, MP4</span>
      </button>

      {/* Asset Candidates List (Scrollable) */}
      <div className="flex-1 overflow-y-auto max-h-56 space-y-1 pr-1 custom-scrollbar">
        {loadingVault && filtered.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs font-mono">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            <span>Fetching assets from Vault...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-6 px-3 text-center text-xs font-mono text-zinc-400 dark:text-zinc-500 space-y-1">
            <p>No matching reference assets found.</p>
            <p className="text-[10px] text-zinc-400">Click &ldquo;+ Upload Reference&rdquo; above to add one directly.</p>
          </div>
        ) : (
          filtered.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => onSelect(item)}
                className={cn(
                  "w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all cursor-pointer",
                  isSelected
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-950 dark:text-emerald-100 shadow-xs"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border border-transparent"
                )}
              >
                {/* Media thumbnail */}
                <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-black shrink-0 border border-black/10 dark:border-white/10">
                  {item.type === "video" ? (
                    <video src={getMediaUrl(item.url)} className="w-full h-full object-cover" />
                  ) : (
                    <img src={getMediaUrl(item.url)} alt={item.tag} className="w-full h-full object-cover" />
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[7px] font-mono text-center text-zinc-200 uppercase font-bold">
                    {item.type === "video" ? "VID" : "IMG"}
                  </span>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate">
                      @{item.tag}
                    </span>
                    <span className="text-[8px] font-mono uppercase px-1.5 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0 border border-zinc-200 dark:border-zinc-700">
                      {item.badge || item.source}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate block">
                    {item.filename}
                  </span>
                </div>

                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
              </button>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="pt-1.5 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-zinc-400">
        <span>Press &uarr; &darr; to navigate</span>
        <span>Enter or click to tag</span>
      </div>
    </div>
  );
}
