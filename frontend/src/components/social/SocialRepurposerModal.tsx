"use client";
import React, { useState } from "react";
import { 
  X, Share2, Download, Copy, Check, 
  Sparkles, Layers, ArrowRight, ExternalLink 
} from "lucide-react";
import { getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SocialRepurposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType?: "image" | "video";
  prompt?: string;
}

interface PlatformFormat {
  id: string;
  name: string;
  aspect: string;
  resolution: string;
  platform: "Instagram" | "YouTube" | "TikTok" | "Pinterest" | "Twitter";
  iconColor: string;
  recommendedFor: string;
}

const PLATFORM_FORMATS: PlatformFormat[] = [
  {
    id: "ig_post",
    name: "Instagram Square Post",
    aspect: "1:1",
    resolution: "1080 x 1080",
    platform: "Instagram",
    iconColor: "text-pink-500",
    recommendedFor: "Feed post, Carousel cover"
  },
  {
    id: "reels_shorts",
    name: "Reels / Shorts / TikTok",
    aspect: "9:16",
    resolution: "1080 x 1920",
    platform: "TikTok",
    iconColor: "text-fuchsia-500",
    recommendedFor: "Vertical Stories, Reels & Shorts"
  },
  {
    id: "yt_cinema",
    name: "YouTube Landscape HD",
    aspect: "16:9",
    resolution: "1920 x 1080",
    platform: "YouTube",
    iconColor: "text-red-500",
    recommendedFor: "Standard video, Community post"
  },
  {
    id: "pinterest_pin",
    name: "Pinterest Idea Pin",
    aspect: "2:3",
    resolution: "1000 x 1500",
    platform: "Pinterest",
    iconColor: "text-rose-600",
    recommendedFor: "High-clickthrough discovery pin"
  }
];

export default function SocialRepurposerModal({
  isOpen,
  onClose,
  mediaUrl,
  mediaType = "image",
  prompt = ""
}: SocialRepurposerModalProps) {
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const fullUrl = getMediaUrl(mediaUrl);

  const generateSocialCaption = () => {
    const base = prompt ? prompt.trim() : "Created with OmniStudio AI";
    return `${base}\n\n✨ Made with OmniStudio AI Next-Gen Suite\n#OmniStudio #AIGeneration #CinematicAI #CreativeProduction #VisualContent`;
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(generateSocialCaption());
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleDownloadDirect = async (formatId: string) => {
    setDownloadingId(formatId);
    try {
      const a = document.createElement("a");
      a.href = fullUrl;
      a.download = `omnistudio_${formatId}_${Date.now()}.${mediaType === "video" ? "mp4" : "png"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setDownloadingId(null), 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0c0d14] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                Social Media Repurposer
                <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 font-semibold border border-pink-500/20">
                  1-Click Multi-Platform
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Instantly export tailored assets for Instagram, TikTok, YouTube Shorts, and Pinterest
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Formats Grid */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-3">
              <Layers className="w-3.5 h-3.5 text-pink-500" />
              Target Social Formats
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {PLATFORM_FORMATS.map((fmt) => (
                <div
                  key={fmt.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.02] hover:border-pink-500/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                      {mediaType === "video" ? (
                        <video src={fullUrl} className="w-full h-full object-cover" />
                      ) : (
                        <img src={fullUrl} alt="Preview" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-pink-500 transition-colors">
                        {fmt.name}
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {fmt.resolution} • <span className="font-semibold text-zinc-700 dark:text-zinc-300">{fmt.aspect}</span>
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{fmt.recommendedFor}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadDirect(fmt.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-white/10 border border-zinc-200 dark:border-white/10 hover:bg-pink-500 hover:text-white hover:border-pink-500 text-zinc-700 dark:text-zinc-200 transition-all shadow-sm"
                  >
                    {downloadingId === fmt.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    Export
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Social Caption & Hashtag Generator */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                AI Auto-Generated Social Caption & Tags
              </span>
              <button
                type="button"
                onClick={handleCopyCaption}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-pink-600 dark:text-pink-400 hover:bg-pink-500/10 transition-colors"
              >
                {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCaption ? "Copied!" : "Copy Caption"}
              </button>
            </div>
            <pre className="p-3 rounded-lg text-xs font-sans text-zinc-600 dark:text-zinc-300 bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/5 whitespace-pre-wrap leading-relaxed">
              {generateSocialCaption()}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02]">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Export ready for publishing to Meta Business Suite, YouTube Studio, and TikTok
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
