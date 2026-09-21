"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Sparkles,
  Layers,
  Download,
  Copy,
  Check,
  Video,
  Image as ImageIcon,
  ExternalLink,
  RefreshCw,
  Eye,
  ShieldCheck,
  Lock,
  ChevronRight,
  Maximize2,
  ZoomIn,
  Camera,
  Compass
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import LazyImage from "@/components/ui/LazyImage";
import Spinner from "@/components/ui/Spinner";

export interface AngleItem {
  angle_id: string;
  label: string;
  degrees: string;
  description: string;
  filename: string;
  image_url: string;
  size_bytes?: number;
}

export interface CharacterSheetData {
  success: boolean;
  character_id?: string;
  character_name: string;
  composite_sheet_url?: string;
  angles: AngleItem[];
  generated_at?: number;
}

interface CharacterSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: {
    id: string;
    name: string;
    prompt?: string;
    description?: string;
    imageUrl?: string;
    image_url?: string;
    isLocked?: boolean;
  } | null;
}

export default function CharacterSheetModal({
  isOpen,
  onClose,
  character,
}: CharacterSheetModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sheetData, setSheetData] = useState<CharacterSheetData | null>(null);
  const [activeTab, setActiveTab] = useState<"grid" | "angles">("grid");
  const [selectedAngle, setSelectedAngle] = useState<AngleItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load existing sheet whenever modal opens for character
  useEffect(() => {
    if (!isOpen || !character?.id) {
      setSheetData(null);
      return;
    }

    async function loadSheet() {
      setLoading(true);
      try {
        const res = await api.getCharacterSheet(character!.id);
        if (res && res.success && res.sheet && res.sheet.angles?.length > 0) {
          setSheetData(res.sheet);
          if (res.sheet.angles?.length > 0) {
            setSelectedAngle(res.sheet.angles[0]);
          }
        } else {
          setSheetData(null);
        }
      } catch (err) {
        console.warn("Could not load character sheet:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSheet();
  }, [isOpen, character?.id]);

  if (!isOpen || !character) return null;

  const charImg = character.imageUrl || character.image_url || "";

  const handleGenerateSheet = async () => {
    setGenerating(true);
    try {
      const res = await api.generateCharacterSheet({
        character_id: character.id,
        name: character.name,
        prompt: character.prompt || character.description || "",
        imageUrl: charImg,
        use_ai: true,
      });

      if (res && res.success) {
        setSheetData(res);
        if (res.angles && res.angles.length > 0) {
          setSelectedAngle(res.angles[0]);
        }
      }
    } catch (err: any) {
      alert("Character sheet generation failed: " + (err?.message || "Unknown error"));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (url: string, key: string) => {
    const full = getMediaUrl(url);
    navigator.clipboard.writeText(full);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = getMediaUrl(url);
    link.download = filename || "character_angle.png";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUseInVideo = (url: string) => {
    onClose();
    router.push(`/video?image=${encodeURIComponent(url)}&character=${encodeURIComponent(character.name)}`);
  };

  const handleUseInImage = (url: string) => {
    onClose();
    router.push(`/image?input_image=${encodeURIComponent(url)}`);
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#0E0E12] border border-white/10 rounded-2xl shadow-2xl text-white overflow-hidden font-jakarta">
        {/* Top Header Bar */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#121217]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-800 border border-white/15 flex-shrink-0 relative">
              {charImg ? (
                <img
                  src={getMediaUrl(charImg)}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-emerald-400">
                  {character.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  CHARACTER TURNAROUND SHEET
                </span>
                <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
                  5-Axis Multi-Angle Reference
                </span>
              </div>
              <h2 className="text-lg font-heading font-extrabold text-white mt-0.5 flex items-center gap-2">
                <span>{character.name}</span>
                {character.isLocked && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <Lock className="w-2.5 h-2.5" /> LOCKED
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sheetData && (
              <button
                type="button"
                onClick={handleGenerateSheet}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white border border-white/10 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", generating && "animate-spin text-emerald-400")} />
                <span className="hidden sm:inline">{generating ? "Regenerating..." : "Regenerate Sheet"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Grid vs Angles) */}
        {sheetData && (
          <div className="flex-shrink-0 flex items-center gap-1 px-6 py-2 border-b border-white/[0.06] bg-[#0c0c10]">
            <button
              type="button"
              onClick={() => setActiveTab("grid")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer",
                activeTab === "grid"
                  ? "bg-white/10 text-white font-bold border border-white/15"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              )}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full Turnaround Model Sheet</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("angles")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer",
                activeTab === "angles"
                  ? "bg-white/10 text-white font-bold border border-white/15"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              )}
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Individual Camera Angles ({sheetData.angles?.length || 0})</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-[380px]">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Spinner className="w-8 h-8 text-emerald-500" />
              <p className="text-xs font-mono">Loading character sheet data...</p>
            </div>
          ) : !sheetData ? (
            /* Empty State / Generate Call to Action */
            <div className="max-w-2xl mx-auto my-8 text-center space-y-5 p-8 rounded-2xl border border-white/[0.08] bg-[#121217]/60">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <Compass className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-heading font-bold text-white">
                  No Turnaround Sheet Generated Yet
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 font-sans max-w-lg mx-auto">
                  A Character Sheet generates 5 high-precision camera angles (Frontal 0°, 3/4 View 45°, Profile 90°, Over-The-Shoulder 135°, and Emotive Close-Up) along with an all-in-one turnaround model sheet.
                </p>
              </div>

              {/* Angles preview pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {["0° Frontal", "45° Three-Quarter", "90° Side Profile", "135° Over-Shoulder", "Emotive Macro"].map((tag, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-white/5 text-zinc-300 border border-white/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleGenerateSheet}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-heading font-bold shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {generating ? (
                    <>
                      <Spinner className="w-4 h-4 text-zinc-950" />
                      <span>Synthesizing Multi-Angle Sheet...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate 5-Axis Character Sheet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : activeTab === "grid" ? (
            /* TAB 1: Composite Full Turnaround Model Sheet */
            <div className="space-y-4">
              {sheetData.composite_sheet_url ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#07070A] shadow-2xl group">
                    <img
                      src={getMediaUrl(sheetData.composite_sheet_url)}
                      alt={`${character.name} Turnaround Model Sheet`}
                      className="w-full h-auto object-contain max-h-[62vh] mx-auto transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownload(sheetData.composite_sheet_url!, `${character.name}_turnaround_sheet.png`)}
                        className="p-2 rounded-xl bg-black/70 hover:bg-black text-white backdrop-blur-md border border-white/20 transition-all shadow-md cursor-pointer"
                        title="Download Turnaround Sheet"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(sheetData.composite_sheet_url!, "composite")}
                        className="p-2 rounded-xl bg-black/70 hover:bg-black text-white backdrop-blur-md border border-white/20 transition-all shadow-md cursor-pointer"
                        title="Copy Sheet Image URL"
                      >
                        {copiedKey === "composite" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#121217] border border-white/[0.08]">
                    <div className="text-xs font-mono text-zinc-400">
                      <span>Standard 5-Axis Turnaround Model Sheet • High-Fidelity Reference for Video AI</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownload(sheetData.composite_sheet_url!, `${character.name}_turnaround_sheet.png`)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Full Model Sheet</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("angles")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-mono transition-all cursor-pointer"
                      >
                        <span>View Angles Individually</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-400 text-xs font-mono">
                  Composite sheet is being compiled. Please switch to Individual Angles tab.
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: Individual Angles Gallery & Actions */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Interactive 5-Angle Strip / Cards */}
              <div className="md:col-span-4 space-y-2.5">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-bold">
                  Select Camera Angle
                </span>
                <div className="space-y-2">
                  {sheetData.angles.map((angle) => {
                    const isSelected = selectedAngle?.angle_id === angle.angle_id;
                    return (
                      <div
                        key={angle.angle_id}
                        onClick={() => setSelectedAngle(angle)}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer text-left group",
                          isSelected
                            ? "bg-white/10 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30"
                            : "bg-[#14141A] border-white/[0.08] hover:border-white/20 hover:bg-white/5"
                        )}
                      >
                        <div className="w-12 h-14 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 border border-white/10 relative">
                          <img
                            src={getMediaUrl(angle.image_url)}
                            alt={angle.label}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-white group-hover:text-emerald-400 transition-colors">
                              {angle.label}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-zinc-400">
                              {angle.degrees}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-400 line-clamp-1 font-sans mt-0.5">
                            {angle.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Angle Large Preview & Direct Pipeline Actions */}
              {selectedAngle && (
                <div className="md:col-span-8 flex flex-col justify-between space-y-4 bg-[#121217] p-5 rounded-2xl border border-white/[0.08]">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {selectedAngle.degrees} CAMERA PERSPECTIVE
                          </span>
                          <span className="text-xs text-zinc-400 font-mono">
                            {selectedAngle.filename}
                          </span>
                        </div>
                        <h3 className="text-base font-heading font-extrabold text-white mt-1">
                          {selectedAngle.label}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(selectedAngle.image_url, selectedAngle.filename)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                          title="Download Angle"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedAngle.image_url, selectedAngle.angle_id)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                          title="Copy Image URL"
                        >
                          {copiedKey === selectedAngle.angle_id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Image Viewport */}
                    <div className="relative aspect-[4/3] w-full max-h-[380px] rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center shadow-inner">
                      <img
                        src={getMediaUrl(selectedAngle.image_url)}
                        alt={selectedAngle.label}
                        className="w-full h-full object-contain mx-auto"
                      />
                    </div>

                    <p className="text-xs text-zinc-400 font-sans">
                      {selectedAngle.description}
                    </p>
                  </div>

                  {/* Send to Pipeline Buttons */}
                  <div className="pt-3 border-t border-white/[0.08] flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleUseInVideo(selectedAngle.image_url)}
                      className="flex-1 min-w-[170px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-mono font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
                    >
                      <Video className="w-4 h-4" />
                      <span>Animate Angle in Video Studio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUseInImage(selectedAngle.image_url)}
                      className="flex-1 min-w-[170px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono font-bold transition-all cursor-pointer border border-white/15 active:scale-95"
                    >
                      <ImageIcon className="w-4 h-4 text-cyan-400" />
                      <span>Edit in Image Studio</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-white/[0.08] bg-[#0c0c10] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>OmniStudio Multi-Axis Character Locking</span>
          <span className="text-emerald-400 font-bold">100% Identity Consistency Guaranteed</span>
        </div>
      </div>
    </div>
  );
}
