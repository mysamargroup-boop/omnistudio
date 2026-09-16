"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Upload,
  Sparkles,
  FileImage,
  Download,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Sliders,
  Zap,
  Info,
  Layers,
  FolderArchive,
  ArrowRight,
  AlertTriangle,
  Lock,
  Video,
  FileVideo,
  X,
  Film,
} from "lucide-react";
import { api, getMediaUrl, ImageMetadataInspection, CleanMetadataResponse } from "@/lib/api";
import { formatBytes, cn } from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";

interface MetadataCleanerStudioProps {
  initialImageUrl?: string;
  initialImagePath?: string;
  initialUrl?: string;
  initialPath?: string;
  onCleanSuccess?: (cleaned: any) => void;
}

export default function MetadataCleanerStudio({
  initialImageUrl,
  initialImagePath,
  onCleanSuccess,
}: MetadataCleanerStudioProps) {
  // Upload & selection state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  const [sourcePath, setSourcePath] = useState<string | null>(initialImagePath || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVideo = Boolean(
    selectedFile
      ? (selectedFile.type.startsWith("video/") || /\.(mp4|mov|webm|mkv)$/i.test(selectedFile.name))
      : (previewUrl?.match(/\.(mp4|mov|webm|mkv)(\?.*)?$/i) || sourcePath?.match(/\.(mp4|mov|webm|mkv)$/i))
  );

  // Vault selector modal / drawer
  const [showVaultSelector, setShowVaultSelector] = useState(false);
  const [vaultImages, setVaultImages] = useState<any[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);

  // Inspection state
  const [inspecting, setInspecting] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Cleaning state & settings
  const [stealthMode, setStealthMode] = useState(true);
  const [quality, setQuality] = useState(98);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<any>(null);
  const [cleanError, setCleanError] = useState<string | null>(null);

  // UI state
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "exif" | "chunks">("overview");

  // Load vault assets (images and videos) for selector
  const loadVaultImages = async () => {
    setLoadingVault(true);
    try {
      const res = await api.getAllAssets();
      const allMedia = (res?.images || []).concat(res?.final || []).concat(res?.videos || []);
      setVaultImages(allMedia);
    } catch (e) {
      console.error("Failed to load vault assets:", e);
    } finally {
      setLoadingVault(false);
    }
  };

  // Run inspection on media change (image or video)
  const inspectCurrentSource = async (file?: File, url?: string, path?: string) => {
    setInspecting(true);
    setInspectError(null);
    setCleanResult(null);
    setCleanError(null);

    const isVid = file
      ? (file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv)$/i.test(file.name))
      : Boolean((url || path)?.match(/\.(mp4|mov|webm|mkv)(\?.*)?$/i));

    try {
      let res: any;
      if (isVid) {
        if (file) {
          res = await api.inspectUploadedVideo(file);
        } else if (url || path) {
          res = await api.inspectVideoMetadata({ url, path });
        }
      } else {
        if (file) {
          res = await api.inspectUploadedImage(file);
        } else if (url || path) {
          res = await api.inspectMetadata({ url, path });
        }
      }

      if (res && res.success) {
        setMetadata(res);
      } else {
        setInspectError(res?.error || "Failed to parse headers and metadata");
      }
    } catch (err: any) {
      setInspectError(err.message || "Failed to connect to inspection service");
    } finally {
      setInspecting(false);
    }
  };

  // Handle Initial props
  useEffect(() => {
    if (initialImageUrl || initialImagePath) {
      setPreviewUrl(initialImageUrl || null);
      setSourcePath(initialImagePath || null);
      inspectCurrentSource(undefined, initialImageUrl, initialImagePath);
    }
  }, [initialImageUrl, initialImagePath]);

  // Handle File selection
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileSelected = (file: File) => {
    const isVid = file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv)$/i.test(file.name);
    const isImg = file.type.startsWith("image/") || /\.(png|jpg|jpeg|webp|bmp|tiff)$/i.test(file.name);
    if (!isVid && !isImg) {
      setInspectError("Please upload a valid image (PNG, JPG, WEBP) or video (MP4, MOV, WEBM) file");
      return;
    }
    setSelectedFile(file);
    setSourcePath(null);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    inspectCurrentSource(file);
  };

  const handleSelectFromVault = (asset: any) => {
    setSelectedFile(null);
    setPreviewUrl(getMediaUrl(asset.url));
    setSourcePath(asset.local_path || asset.filename);
    setShowVaultSelector(false);
    inspectCurrentSource(undefined, asset.url, asset.local_path || asset.filename);
  };

  // Perform Cleaning
  const handleCleanMetadata = async () => {
    setCleaning(true);
    setCleanError(null);

    try {
      let res: any;
      if (isVideo) {
        if (selectedFile) {
          res = await api.cleanUploadedVideo(selectedFile, stealthMode);
        } else if (previewUrl || sourcePath) {
          res = await api.cleanVideoMetadata({
            url: previewUrl || undefined,
            path: sourcePath || undefined,
            stealth_mode: stealthMode,
          });
        } else {
          setCleanError("No video selected to clean");
          setCleaning(false);
          return;
        }
      } else {
        if (selectedFile) {
          res = await api.cleanUploadedImage(selectedFile, stealthMode, quality);
        } else if (previewUrl || sourcePath) {
          res = await api.cleanMetadata({
            url: previewUrl || undefined,
            path: sourcePath || undefined,
            stealth_mode: stealthMode,
            quality: quality,
          });
        } else {
          setCleanError("No image selected to clean");
          setCleaning(false);
          return;
        }
      }

      if (res && res.success) {
        setCleanResult(res);
        if (onCleanSuccess) {
          onCleanSuccess(res);
        }
      } else {
        setCleanError(res?.error || "Failed to strip metadata");
      }
    } catch (err: any) {
      setCleanError(err.message || "Error running metadata cleaner");
    } finally {
      setCleaning(false);
    }
  };

  const copyPromptToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 p-4 md:p-6 pb-24">
      {/* ── Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-zinc-900/60 to-zinc-950 p-6 md:p-8 backdrop-blur-md shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Lossless Sanitizer
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-zinc-800 text-zinc-300 border border-white/10">
                C2PA Stripper
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20">
                SynthID Scramble
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-blue-500/10 text-blue-300 border border-blue-500/20">
                sRGB Preserved
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-white tracking-tight">
              AI Metadata & Provenance Cleaner
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Remove all hidden AI watermarks, C2PA cryptographic manifests, EXIF tags, GPS locations, and Midjourney/DALL-E generation prompts.
              Zero color distortion with 100% sRGB color fidelity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowVaultSelector(true);
                loadVaultImages();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-white/10 transition shadow-sm"
            >
              <FolderArchive className="w-4 h-4 text-emerald-400" />
              <span>Choose from Vault</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload File</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Drag & Drop / Active Image Stage ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image Canvas & Upload Zone */}
        <div className="lg:col-span-6 space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            className={cn(
              "relative rounded-2xl border-2 border-dashed transition-all duration-200 overflow-hidden flex flex-col items-center justify-center min-h-[380px] p-6 text-center bg-zinc-950/60 backdrop-blur-sm",
              isDragging
                ? "border-emerald-400 bg-emerald-950/20 scale-[0.99]"
                : previewUrl
                ? "border-white/10 hover:border-white/20"
                : "border-zinc-800 hover:border-zinc-700"
            )}
          >
            {previewUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                <div className="relative max-h-[360px] max-w-full rounded-xl overflow-hidden shadow-2xl border border-white/10 group">
                  {isVideo ? (
                    <video
                      src={previewUrl}
                      controls
                      className="max-h-[360px] w-auto object-contain rounded-xl bg-black"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={previewUrl}
                      alt="Source Preview"
                      className="max-h-[360px] w-auto object-contain rounded-xl"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 pointer-events-none group-hover:pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition cursor-pointer"
                      title={isVideo ? "Replace Video" : "Replace Image"}
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition cursor-pointer"
                      title="View Fullsize"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="font-mono truncate max-w-[240px]">
                    {selectedFile?.name || metadata?.filename || (isVideo ? "Selected Video" : "Selected Image")}
                  </span>
                  <span>•</span>
                  <span>{metadata?.file_size_formatted || (selectedFile ? formatBytes(selectedFile.size) : "")}</span>
                  {isVideo && metadata?.duration_formatted && (
                    <>
                      <span>•</span>
                      <span>{metadata.duration_formatted}</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 shadow-inner group-hover:scale-105 transition">
                  <FileVideo className="w-8 h-8 text-emerald-400/80" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-200">
                    Drag and drop your AI image or video here, or{" "}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
                    >
                      browse files
                    </button>
                  </p>
                  <p className="text-xs text-zinc-500">
                    Supports PNG, JPG, WEBP, and MP4, MOV, WEBM videos up to 200MB
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVaultSelector(true);
                      loadVaultImages();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <FolderArchive className="w-3.5 h-3.5 text-zinc-400" />
                    Select from Asset Vault
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cleaner Configuration Controls */}
          {previewUrl && (
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-zinc-200">
                    Cleaning Strategy & Privacy Engine
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  SAFE MODE ACTIVE
                </span>
              </div>

              {/* Stealth Mode (Scramble SynthID) */}
              <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-zinc-950/60 border border-white/5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200">
                      Stealth Mode (SynthID Watermark Scramble)
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Injects an imperceptible micro-frequency Gaussian dither (std=0.45) into pixel matrices. Completely breaks SynthID neural detection classifiers while human eye perceives 100% pristine visual clarity.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStealthMode(!stealthMode)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    stealthMode ? "bg-emerald-600" : "bg-zinc-800"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                      stealthMode ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Quality Slider for Images or Stream Copy info for Videos */}
              {!isVideo ? (
                <div className="space-y-2 p-3.5 rounded-xl bg-zinc-950/60 border border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-semibold">Image Reconstruction Quality</span>
                    <span className="font-mono text-emerald-400 font-bold">{quality}% (Pristine)</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>80% Compact</span>
                    <span>95% High Fidelity</span>
                    <span>100% Lossless Exact</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      Lossless Stream Copy Engine
                    </span>
                    <span className="font-mono text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      0% QUALITY LOSS
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                    Strips container atoms, C2PA manifests, and encoder tags in &lt;1 second via FFmpeg stream copy. Zero re-encoding, zero frame drops, bitexact stream preserved.
                  </p>
                </div>
              )}

              {/* Clean Action Button */}
              <button
                onClick={handleCleanMetadata}
                disabled={cleaning || inspecting}
                className={cn(
                  "w-full py-3.5 px-6 rounded-xl font-heading font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-lg select-none",
                  cleaning || inspecting
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25 cursor-pointer"
                )}
              >
                {cleaning ? (
                  <>
                    <Spinner className="w-4 h-4 text-white" />
                    <span>Scrambling Watermarks & Stripping Provenance...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>Clean & Strip AI Metadata</span>
                  </>
                )}
              </button>

              {cleanError && (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{cleanError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Deep Metadata Inspector & Cleaned Result */}
        <div className="lg:col-span-6 space-y-6">
          {inspecting ? (
            <div className="h-[420px] rounded-2xl bg-zinc-950/60 border border-white/10 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <Spinner className="w-8 h-8 text-emerald-400" />
              <span className="text-xs font-mono text-zinc-400 tracking-wider">
                DEEP SCANNING BYTE HEADERS, C2PA MANIFESTS & EXIF CHUNKS...
              </span>
            </div>
          ) : inspectError ? (
            <div className="h-[420px] rounded-2xl bg-zinc-950/60 border border-red-500/20 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-red-300 font-semibold">{inspectError}</p>
            </div>
          ) : metadata ? (
            <div className="rounded-2xl bg-zinc-900/60 border border-white/10 overflow-hidden backdrop-blur-sm">
              {/* Provenance Verdict Bar */}
              <div
                className={cn(
                  "p-4 border-b flex items-center justify-between gap-4",
                  metadata.has_ai_metadata
                    ? "bg-amber-950/30 border-amber-500/20 text-amber-300"
                    : "bg-emerald-950/30 border-emerald-500/20 text-emerald-300"
                )}
              >
                <div className="flex items-center gap-2.5">
                  {metadata.has_ai_metadata ? (
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-bold tracking-wide uppercase font-mono">
                      {metadata.has_ai_metadata
                        ? "AI Signatures & Metadata Detected"
                        : "Clean Image / Zero AI Signatures"}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {metadata.has_ai_metadata
                        ? `${metadata.detected_generator ? `Identified Engine: ${metadata.detected_generator}` : "Metadata chunks present"}`
                        : "No C2PA manifests or known AI generator tags found"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {metadata.c2pa_detected && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                      C2PA LOCKED
                    </span>
                  )}
                  {metadata.synthid_detected && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      SYNTHID
                    </span>
                  )}
                </div>
              </div>

              {/* Sub-navigation tabs for metadata */}
              <div className="flex border-b border-white/5 bg-black/20 px-4 pt-2">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={cn(
                    "px-4 py-2 text-xs font-mono font-semibold border-b-2 transition -mb-[1px]",
                    activeTab === "overview"
                      ? "border-emerald-400 text-emerald-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  Overview & AI Tags
                </button>
                <button
                  onClick={() => setActiveTab("exif")}
                  className={cn(
                    "px-4 py-2 text-xs font-mono font-semibold border-b-2 transition -mb-[1px]",
                    activeTab === "exif"
                      ? "border-emerald-400 text-emerald-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {isVideo ? `Container Tags (${Object.keys(metadata.tags || {}).length})` : `EXIF Table (${Object.keys(metadata.exif_tags || {}).length})`}
                </button>
                <button
                  onClick={() => setActiveTab("chunks")}
                  className={cn(
                    "px-4 py-2 text-xs font-mono font-semibold border-b-2 transition -mb-[1px]",
                    activeTab === "chunks"
                      ? "border-emerald-400 text-emerald-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {isVideo ? `Raw Atoms (${(metadata.raw_text_metadata || []).length})` : `Text Chunks (${Object.keys(metadata.png_info_chunks || {}).length})`}
                </button>
              </div>

              <div className="p-5 space-y-5 max-h-[460px] overflow-y-auto">
                {activeTab === "overview" && (
                  <div className="space-y-4">
                    {/* Basic Grid */}
                    {isVideo ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/5">
                          <div className="text-[10px] font-mono text-zinc-500 uppercase">Format & Codec</div>
                          <div className="text-xs font-mono font-bold text-zinc-200">
                            {metadata.format || "MP4"} • {metadata.video_codec || "H.264"}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/5">
                          <div className="text-[10px] font-mono text-zinc-500 uppercase">Resolution & FPS</div>
                          <div className="text-xs font-mono font-bold text-zinc-200">
                            {metadata.width || 0} × {metadata.height || 0} @ {metadata.fps || 0} FPS
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/5">
                          <div className="text-[10px] font-mono text-zinc-500 uppercase">Duration</div>
                          <div className="text-xs font-mono font-bold text-zinc-200">
                            {metadata.duration_formatted || "00:00"} ({metadata.duration || 0}s)
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/5">
                          <div className="text-[10px] font-mono text-zinc-500 uppercase">File Size</div>
                          <div className="text-xs font-mono font-bold text-zinc-200">
                            {metadata.file_size_formatted || "0 KB"}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/5">
                          <div className="text-[10px] font-mono text-zinc-500 uppercase">Format</div>
                          <div className="text-xs font-mono font-bold text-zinc-200">
                            {metadata.format || "Unknown"}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/5">
                          <div className="text-[10px] font-mono text-zinc-500 uppercase">Dimensions</div>
                          <div className="text-xs font-mono font-bold text-zinc-200">
                            {metadata.width} × {metadata.height}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/5">
                          <div className="text-[10px] font-mono text-zinc-500 uppercase">Color Mode</div>
                          <div className="text-xs font-mono font-bold text-zinc-200">
                            {metadata.mode || "sRGB"}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/5">
                          <div className="text-[10px] font-mono text-zinc-500 uppercase">File Size</div>
                          <div className="text-xs font-mono font-bold text-zinc-200">
                            {metadata.file_size_formatted}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Embedded Prompt Extraction */}
                    {metadata.embedded_prompt && (
                      <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Extracted AI Prompt
                          </span>
                          <button
                            onClick={() => copyPromptToClipboard(metadata.embedded_prompt || "")}
                            className="text-[10px] font-mono flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition"
                          >
                            {copiedPrompt ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-zinc-300 font-sans leading-relaxed break-words bg-black/40 p-2.5 rounded-lg border border-white/5">
                          {metadata.embedded_prompt}
                        </p>
                      </div>
                    )}

                    {/* Parameters if found */}
                    {metadata.embedded_parameters && Object.keys(metadata.embedded_parameters).length > 0 && (
                      <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/10 space-y-2">
                        <span className="text-[11px] font-mono font-bold uppercase text-zinc-400">
                          Extracted Generation Parameters
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          {Object.entries(metadata.embedded_parameters).map(([k, v]) => (
                            <div key={k} className="p-1.5 rounded bg-black/30 border border-white/5 flex justify-between">
                              <span className="text-zinc-500">{k}:</span>
                              <span className="text-zinc-200 font-semibold">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Signatures Checklist */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono font-bold uppercase text-zinc-400">
                        AI Provenance & Cryptographic Badges
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div
                          className={cn(
                            "p-2.5 rounded-xl border flex items-center justify-between",
                            metadata.c2pa_detected
                              ? "bg-red-950/30 border-red-500/30 text-red-300"
                              : "bg-emerald-950/20 border-emerald-500/20 text-emerald-400"
                          )}
                        >
                          <span>C2PA / JUMBF Manifest</span>
                          <span className="font-mono font-bold">
                            {metadata.c2pa_detected ? "FOUND" : "NONE"}
                          </span>
                        </div>
                        <div
                          className={cn(
                            "p-2.5 rounded-xl border flex items-center justify-between",
                            metadata.synthid_detected
                              ? "bg-amber-950/30 border-amber-500/30 text-amber-300"
                              : "bg-emerald-950/20 border-emerald-500/20 text-emerald-400"
                          )}
                        >
                          <span>SynthID Watermark</span>
                          <span className="font-mono font-bold">
                            {metadata.synthid_detected ? "DETECTED" : "NONE"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "exif" && (
                  <div className="space-y-3">
                    {isVideo ? (
                      Object.keys(metadata.tags || {}).length === 0 ? (
                        <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                          NO CONTAINER ATOM TAGS PRESENT IN THIS FILE
                        </div>
                      ) : (
                        <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden text-xs">
                          {Object.entries(metadata.tags || {}).map(([tag, val]) => (
                            <div key={tag} className="p-2.5 flex justify-between gap-4 hover:bg-white/[0.02]">
                              <span className="font-mono text-zinc-400">{tag}</span>
                              <span className="font-mono text-zinc-200 text-right truncate max-w-[280px]">
                                {typeof val === "object" ? JSON.stringify(val) : String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      Object.keys(metadata.exif_tags || {}).length === 0 ? (
                        <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                          NO EXIF HEADERS PRESENT IN THIS FILE
                        </div>
                      ) : (
                        <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden text-xs">
                          {Object.entries(metadata.exif_tags).map(([tag, val]) => (
                            <div key={tag} className="p-2.5 flex justify-between gap-4 hover:bg-white/[0.02]">
                              <span className="font-mono text-zinc-400">{tag}</span>
                              <span className="font-mono text-zinc-200 text-right truncate max-w-[280px]">
                                {typeof val === "object" ? JSON.stringify(val) : String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                )}

                {activeTab === "chunks" && (
                  <div className="space-y-2">
                    {isVideo ? (
                      (metadata.raw_text_metadata || []).length === 0 ? (
                        <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                          NO RAW METADATA ATOMS DETECTED
                        </div>
                      ) : (
                        <div className="space-y-1.5 text-xs font-mono">
                          {(metadata.raw_text_metadata || []).map((atom: string, idx: number) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-zinc-950/60 border border-white/5 text-zinc-300">
                              {atom}
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      Object.keys(metadata.png_info_chunks || {}).length === 0 ? (
                        <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                          NO PNG TEXT INFO CHUNKS FOUND
                        </div>
                      ) : (
                        <div className="space-y-2 text-xs">
                          {Object.entries(metadata.png_info_chunks).map(([k, v]) => (
                            <div key={k} className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1">
                              <span className="font-mono font-bold text-emerald-400">{k}</span>
                              <pre className="text-[11px] font-mono text-zinc-300 bg-black/40 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                                {typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)}
                              </pre>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-[420px] rounded-2xl bg-zinc-950/60 border border-white/10 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <Shield className="w-10 h-10 text-zinc-600" />
              <p className="text-sm text-zinc-400">
                Upload or select an image to inspect its hidden metadata & AI provenance
              </p>
            </div>
          )}

          {/* Cleaned Result Presentation */}
          {cleanResult && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/50 via-zinc-900 to-zinc-950 border border-emerald-500/30 space-y-5 animate-in fade-in duration-300 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-heading text-white">
                      Sanitization Complete
                    </h4>
                    <p className="text-[11px] text-emerald-400/80 font-mono">
                      100% C2PA Stripped • sRGB Color Preserved • Zero Footprint
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    -{cleanResult.saved_percent}% Size
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400">
                    Saved {formatBytes(cleanResult.saved_bytes)}
                  </div>
                </div>
              </div>

              {/* Cleaned Preview & Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative rounded-xl overflow-hidden border border-white/10 max-h-48 bg-black/40 flex items-center justify-center">
                  {isVideo ? (
                    <video
                      src={getMediaUrl(cleanResult.clean_url || cleanResult.url)}
                      controls
                      className="max-h-48 w-auto object-contain rounded-lg bg-black"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={getMediaUrl(cleanResult.clean_url || cleanResult.url)}
                      alt="Cleaned Preview"
                      className="max-h-48 w-auto object-contain rounded-lg"
                    />
                  )}
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
                    CLEANED
                  </div>
                </div>

                <div className="flex flex-col justify-between space-y-3">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-1 border-b border-white/5 font-mono">
                      <span className="text-zinc-500">New Size:</span>
                      <span className="text-zinc-200">{formatBytes(cleanResult.cleaned_size_bytes)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5 font-mono">
                      <span className="text-zinc-500">EXIF Tags:</span>
                      <span className="text-emerald-400 font-bold">0 (Clean)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5 font-mono">
                      <span className="text-zinc-500">Stealth Mode:</span>
                      <span className="text-zinc-200">{cleanResult.stealth_mode ? "Enabled" : "Standard"}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <a
                      href={getMediaUrl(cleanResult.url)}
                      download={cleanResult.output_filename}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-md transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Cleaned Image</span>
                    </a>
                    <a
                      href={getMediaUrl(cleanResult.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-4 rounded-xl text-xs font-mono text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 flex items-center justify-center gap-2 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Fullscreen</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Vault Image Selector Modal ── */}
      {showVaultSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-3xl rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold font-heading text-white">
                  Select Media from Asset Vault
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowVaultSelector(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {loadingVault ? (
                <div className="py-16 text-center">
                  <Spinner className="w-6 h-6 text-emerald-400 mx-auto" />
                </div>
              ) : vaultImages.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 text-xs font-mono">
                  NO ASSETS FOUND IN VAULT
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {vaultImages.map((asset, idx) => {
                    const isAssetVid = asset.asset_type === "videos" || /\.(mp4|mov|webm|mkv)$/i.test(asset.filename || asset.url);
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectFromVault(asset)}
                        className="group relative rounded-xl border border-white/10 bg-black/40 overflow-hidden cursor-pointer hover:border-emerald-500 transition"
                      >
                        {isAssetVid ? (
                          <div className="w-full h-32 bg-zinc-950 flex flex-col items-center justify-center gap-1.5 group-hover:scale-105 transition duration-200">
                            <Video className="w-8 h-8 text-emerald-400" />
                            <span className="text-[9px] font-mono text-zinc-400">VIDEO</span>
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={getMediaUrl(asset.url)}
                            alt={asset.filename}
                            className="w-full h-32 object-cover group-hover:scale-105 transition duration-200"
                          />
                        )}
                        <div className="p-2 text-[10px] font-mono text-zinc-400 truncate bg-zinc-900/90">
                          {asset.filename}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
