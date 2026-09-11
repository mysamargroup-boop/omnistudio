"use client";

import React, { useState } from "react";
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Code,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";
import { getMediaUrl } from "@/lib/api";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    filename: string;
    url: string;
    type: string;
    size_bytes?: number;
  } | null;
}

export default function ShareModal({ isOpen, onClose, asset }: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  if (!isOpen || !asset) return null;

  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}${getMediaUrl(asset.url)}`
    : getMediaUrl(asset.url);

  const markdownSnippet = asset.type === "images"
    ? `![${asset.filename}](${fullUrl})`
    : `[Watch ${asset.filename}](${fullUrl})`;

  const htmlSnippet = asset.type === "images"
    ? `<img src="${fullUrl}" alt="${asset.filename}" />`
    : `<video src="${fullUrl}" controls></video>`;

  const copyToClipboard = (text: string, type: "link" | "md" | "html") => {
    navigator.clipboard.writeText(text);
    if (type === "link") {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else if (type === "md") {
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } else {
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `OmniStudio Asset: ${asset.filename}`,
          text: `Check out this generated AI asset: ${asset.filename}`,
          url: fullUrl,
        });
      } catch (err) {
        console.warn("Native share error or dismissed", err);
      }
    } else {
      copyToClipboard(fullUrl, "link");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#0d0d14] border border-white/[0.1] shadow-2xl p-6 text-white space-y-5 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-heading uppercase tracking-wide text-white">
                Send & Share Asset
              </h2>
              <p className="text-[11px] font-mono text-zinc-400 truncate max-w-xs">{asset.filename}</p>
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

        {/* Action: Native Quick Share */}
        <button
          type="button"
          onClick={handleNativeShare}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-heading font-bold text-xs tracking-tight transition-all cursor-pointer shadow-sm active:scale-[0.98]"
        >
          <Share2 className="w-4 h-4" />
          <span>SEND TO SOCIAL (WHATSAPP, TELEGRAM, APPS)</span>
        </button>

        {/* Share Options */}
        <div className="space-y-3 pt-1">
          {/* 1. Direct Media Link */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-zinc-400 uppercase flex items-center gap-1.5">
              <LinkIcon className="w-3 h-3 text-zinc-400" />
              <span>DIRECT ASSET URL</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={fullUrl}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 truncate outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(fullUrl, "link")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-mono text-white transition-all shrink-0 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* 2. Markdown Embed */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-zinc-400 uppercase flex items-center gap-1.5">
              <Code className="w-3 h-3 text-zinc-400" />
              <span>MARKDOWN EMBED SNIPPET</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={markdownSnippet}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 truncate outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(markdownSnippet, "md")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-mono text-white transition-all shrink-0 cursor-pointer"
              >
                {copiedMarkdown ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMarkdown ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* 3. HTML Embed */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-zinc-400 uppercase flex items-center gap-1.5">
              <Code className="w-3 h-3 text-zinc-400" />
              <span>HTML EMBED CODE</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={htmlSnippet}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 truncate outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(htmlSnippet, "html")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-mono text-white transition-all shrink-0 cursor-pointer"
              >
                {copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedHtml ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in New Tab</span>
          </a>

          <a
            href={fullUrl}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono text-zinc-200 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>
    </div>
  );
}
