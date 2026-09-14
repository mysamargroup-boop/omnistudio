"use client";

import React, { useState, useEffect } from "react";
import {
  Gem,
  X,
  Check,
  Copy,
  ArrowRight,
  Upload,
  FolderArchive,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  JEWELLERY_ITEMS,
  JEWELLERY_PRESETS,
  JewelleryPreset,
} from "./JewelleryPromptSuite";

interface JewellerySuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (promptText: string, recommendedRatio?: string) => void;
  onUploadImage?: (file: File) => void;
  onOpenVault?: () => void;
  hasReferenceImage?: boolean;
}

export default function JewellerySuiteModal({
  isOpen,
  onClose,
  onSelectPrompt,
  onUploadImage,
  onOpenVault,
  hasReferenceImage = false,
}: JewellerySuiteModalProps) {
  const [selectedItem, setSelectedItem] = useState("necklace");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeItemObj =
    JEWELLERY_ITEMS.find((i) => i.id === selectedItem) || JEWELLERY_ITEMS[0];

  const filteredPresets =
    selectedCategory === "all"
      ? JEWELLERY_PRESETS
      : JEWELLERY_PRESETS.filter((p) => p.category === selectedCategory);

  const handleApply = (preset: JewelleryPreset) => {
    const text = preset.promptTemplate(activeItemObj.label);
    onSelectPrompt(text, preset.recommendedRatio);
    setAppliedId(preset.id);
    setTimeout(() => {
      setAppliedId(null);
      onClose();
    }, 600);
  };

  const handleCopy = (preset: JewelleryPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = preset.promptTemplate(activeItemObj.label);
    navigator.clipboard.writeText(text);
    setCopiedId(preset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-5 bg-black/70 dark:bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0f0f17] border border-black/10 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Sticky Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.08] dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#13131d]/70 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <Gem className="w-5 h-5 drop-shadow-xs" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight truncate">
                  Jewellery Reference & Styling Suite
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase shrink-0">
                  PRO PRESETS
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-jakarta line-clamp-1">
                {hasReferenceImage
                  ? "Pre-engineered luxury prompts adapted to your uploaded reference piece"
                  : "Select target jewellery item & 1-click apply high-conversion commercial, editorial & macro prompts"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            {onUploadImage && (
              <label className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 text-xs font-mono cursor-pointer transition-colors shadow-xs">
                <Upload className="w-3.5 h-3.5 text-amber-500" />
                <span>Upload Piece</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && onUploadImage(e.target.files[0])
                  }
                />
              </label>
            )}

            {onOpenVault && (
              <button
                type="button"
                onClick={onOpenVault}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 text-xs font-mono cursor-pointer transition-colors shadow-xs"
              >
                <FolderArchive className="w-3.5 h-3.5 text-violet-500" />
                <span>From Vault</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Controls Bar: Item Pills & Categories */}
        <div className="px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06] bg-zinc-50/40 dark:bg-[#11111a]/40 space-y-2.5 shrink-0">
          {/* Target Jewellery Piece Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider mr-1">
              Piece:
            </span>
            {JEWELLERY_ITEMS.map((item) => {
              const isSelected = item.id === selectedItem;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItem(item.id)}
                  className={cn(
                    "px-3 py-1 rounded-xl text-xs font-heading font-semibold transition-all cursor-pointer border",
                    isSelected
                      ? "bg-amber-500 text-zinc-950 border-amber-500 font-bold shadow-xs shadow-amber-500/20"
                      : "bg-white dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 border-black/[0.08] dark:border-white/[0.08] hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.08]"
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: "all", label: "All Styles (8)" },
              { id: "model", label: "Model Wearing" },
              { id: "aesthetic", label: "Aesthetic Still-Life" },
              { id: "macro", label: "Macro 8K Sparkle" },
              { id: "bridal", label: "Royal Bridal" },
              { id: "dark_moody", label: "Dark Obsidian" },
              { id: "cinema", label: "360 Video Motion" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-mono whitespace-nowrap transition-colors cursor-pointer border",
                  selectedCategory === cat.id
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold"
                    : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.04]"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3-COLUMN PRESET CARDS GRID */}
        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPresets.map((preset) => {
              const isApplied = appliedId === preset.id;
              const isCopied = copiedId === preset.id;
              const promptText = preset.promptTemplate(activeItemObj.label);

              return (
                <div
                  key={preset.id}
                  onClick={() => handleApply(preset)}
                  className={cn(
                    "group relative rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md",
                    isApplied
                      ? "border-emerald-500 bg-emerald-500/[0.08] ring-2 ring-emerald-500/40"
                      : "border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#13131e] hover:border-amber-500/50 hover:bg-amber-500/[0.02]"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 uppercase">
                        {preset.badge}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                        <span>Ratio:</span>
                        <span className="font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-black/[0.06] dark:border-white/[0.06]">
                          {preset.recommendedRatio}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-sm font-heading font-bold text-zinc-950 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {preset.title}
                    </h4>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed font-jakarta">
                      {preset.summary}
                    </p>
                  </div>

                  {/* Prompt Text Preview Box */}
                  <div className="rounded-xl bg-zinc-50 dark:bg-black/30 border border-black/[0.05] dark:border-white/[0.05] p-2.5 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 line-clamp-3 italic leading-relaxed">
                    &ldquo;{promptText}&rdquo;
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-black/[0.05] dark:border-white/[0.05]">
                    <div className="flex items-center gap-1 text-xs font-mono font-semibold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
                      <span>Apply Prompt</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleCopy(preset, e)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        title="Copy prompt text"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApply(preset);
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-heading font-bold flex items-center gap-1.5 transition-all shadow-xs",
                          isApplied
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-500 hover:bg-amber-400 text-zinc-950 hover:shadow-amber-500/25"
                        )}
                      >
                        {isApplied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Applied!</span>
                          </>
                        ) : (
                          <span>Use Prompt</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Bottom Status Bar */}
        <div className="px-5 py-2.5 border-t border-black/[0.06] dark:border-white/[0.06] bg-zinc-50/50 dark:bg-[#11111a]/50 flex items-center justify-between text-[11px] font-mono text-zinc-400 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Target Piece: <strong className="text-zinc-700 dark:text-zinc-200">{activeItemObj.label}</strong> ({activeItemObj.focus})</span>
          </div>
          <span className="hidden sm:inline">Tap any card to 1-click insert prompt into editor</span>
        </div>
      </div>
    </div>
  );
}
