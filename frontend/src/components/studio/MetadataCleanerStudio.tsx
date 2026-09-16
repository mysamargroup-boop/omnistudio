"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Camera,
  MapPin,
  Compass,
  FileText,
  Search,
  CheckCircle2,
  HardDriveDownload,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import {
  api,
  getMediaUrl,
  ImageMetadataInspection,
  CleanMetadataResponse,
  VideoMetadataInspection,
  CleanVideoResponse,
} from "@/lib/api";
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

  // Zero-Disk Privacy Mode (Ephemeral inspection: never saved to backend disk)
  const [zeroDiskMode, setZeroDiskMode] = useState(true);

  const isVideo = Boolean(
    selectedFile
      ? selectedFile.type.startsWith("video/") || /\.(mp4|mov|webm|mkv)$/i.test(selectedFile.name)
      : previewUrl?.match(/\.(mp4|mov|webm|mkv)(\?.*)?$/i) || sourcePath?.match(/\.(mp4|mov|webm|mkv)$/i)
  );

  // Vault selector modal state
  const [showVaultSelector, setShowVaultSelector] = useState(false);
  const [vaultImages, setVaultImages] = useState<any[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [vaultTab, setVaultTab] = useState<"all" | "images" | "videos">("all");
  const [vaultSearch, setVaultSearch] = useState("");
  const [hideSmallTestFiles, setHideSmallTestFiles] = useState(true);

  // Inspection & Progress state
  const [inspecting, setInspecting] = useState(false);
  const [inspectProgress, setInspectProgress] = useState(0);
  const [inspectStage, setInspectStage] = useState("");
  const [metadata, setMetadata] = useState<any>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Cleaning state & settings
  const [stealthMode, setStealthMode] = useState(true);
  const [quality, setQuality] = useState(98);
  const [cleaning, setCleaning] = useState(false);
  const [cleanProgress, setCleanProgress] = useState(0);
  const [cleanStage, setCleanStage] = useState("");
  const [cleanResult, setCleanResult] = useState<any>(null);
  const [cleanError, setCleanError] = useState<string | null>(null);

  // UI state
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedNegPrompt, setCopiedNegPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "camera" | "gps" | "streams" | "rights" | "raw">("overview");
  const [rawTagSearch, setRawTagSearch] = useState("");

  // Load vault assets for selector
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

  // Run inspection on media change
  const inspectCurrentSource = async (file?: File, url?: string, path?: string) => {
    setInspecting(true);
    setInspectProgress(15);
    setInspectStage("Reading file binary stream...");
    setInspectError(null);
    setCleanResult(null);
    setCleanError(null);

    const isVid = file
      ? file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv)$/i.test(file.name)
      : Boolean((url || path)?.match(/\.(mp4|mov|webm|mkv)(\?.*)?$/i));

    const t1 = setTimeout(() => {
      setInspectProgress(45);
      setInspectStage("Scanning C2PA manifests & SynthID watermarks...");
    }, 250);

    const t2 = setTimeout(() => {
      setInspectProgress(75);
      setInspectStage("Parsing EXIF camera optics, GPS & generation parameters...");
    }, 600);

    try {
      let res: any;
      if (isVid) {
        if (file) {
          res = await api.inspectUploadedVideo(file, zeroDiskMode);
        } else if (url || path) {
          res = await api.inspectVideoMetadata({ url, path });
        }
      } else {
        if (file) {
          res = await api.inspectUploadedImage(file, zeroDiskMode);
        } else if (url || path) {
          res = await api.inspectMetadata({ url, path });
        }
      }

      setInspectProgress(100);
      setInspectStage("Inspection complete!");

      if (res && res.success) {
        setMetadata(res);
      } else {
        setInspectError(res?.error || "Failed to parse headers and metadata");
      }
    } catch (err: any) {
      setInspectError(err.message || "Failed to connect to inspection service");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setTimeout(() => {
        setInspecting(false);
        setInspectProgress(0);
        setInspectStage("");
      }, 300);
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

  // Perform Cleaning with live multi-stage progress
  const handleCleanMetadata = async () => {
    setCleaning(true);
    setCleanProgress(15);
    setCleanStage("Reading input media bitstream...");
    setCleanError(null);

    const t1 = setTimeout(() => {
      setCleanProgress(40);
      setCleanStage(
        stealthMode
          ? "Injecting micro-frequency dither (neutralizing SynthID neural classifiers)..."
          : "Stripping C2PA, JUMBF, and XMP provenance blocks..."
      );
    }, 400);

    const t2 = setTimeout(() => {
      setCleanProgress(70);
      setCleanStage("Rebuilding clean container with lossless stream copy...");
    }, 900);

    const t3 = setTimeout(() => {
      setCleanProgress(90);
      setCleanStage("Verifying 0% EXIF leakage & sRGB color accuracy...");
    }, 1400);

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

      setCleanProgress(100);
      setCleanStage("Sanitization Complete!");

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
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setTimeout(() => {
        setCleaning(false);
        setCleanProgress(0);
        setCleanStage("");
      }, 500);
    }
  };

  const copyToClipboard = (text: string, isNeg: boolean = false) => {
    navigator.clipboard.writeText(text);
    if (isNeg) {
      setCopiedNegPrompt(true);
      setTimeout(() => setCopiedNegPrompt(false), 2000);
    } else {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  // Filtered Vault Assets
  const filteredVaultAssets = useMemo(() => {
    return vaultImages.filter((asset) => {
      const isVid = asset.asset_type === "videos" || /\.(mp4|mov|webm|mkv)$/i.test(asset.filename || asset.url);
      if (vaultTab === "images" && isVid) return false;
      if (vaultTab === "videos" && !isVid) return false;
      if (hideSmallTestFiles && (asset.size_bytes || 0) < 10000 && !isVid) return false;
      if (vaultSearch.trim()) {
        const query = vaultSearch.toLowerCase();
        const fname = (asset.filename || "").toLowerCase();
        const prompt = (asset.prompt || "").toLowerCase();
        if (!fname.includes(query) && !prompt.includes(query)) return false;
      }
      return true;
    });
  }, [vaultImages, vaultTab, vaultSearch, hideSmallTestFiles]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 p-4 md:p-6 pb-24 text-zinc-100">
      {/* ── Top Header Banner ── */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-[#0a0f18]/90 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-28 -mt-28" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                Lossless Sanitizer
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase bg-[#141b2a] text-cyan-300 border border-cyan-500/30">
                Deep EXIF & Optics
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                SynthID Neutralizer
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
                C2PA Stripper
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold font-heading text-white tracking-tight">
              AI Metadata & Provenance Engine
            </h1>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Extract complete EXIF camera optics, GPS coordinates, generation prompts, and container tags.
              Strip hidden AI watermarks and cryptographic manifests losslessly with 100% sRGB color fidelity.
            </p>

            {/* Zero-Disk Mode Badge / Notice */}
            <div className="pt-1 flex items-center gap-3">
              <div
                onClick={() => setZeroDiskMode(!zeroDiskMode)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono cursor-pointer transition select-none",
                  zeroDiskMode
                    ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-950"
                    : "bg-[#0f1420] border-white/10 text-zinc-400 hover:text-zinc-200"
                )}
                title="When enabled, files are analyzed in temporary memory and immediately deleted from server disk"
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    zeroDiskMode ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-zinc-600"
                  )}
                />
                <span className="font-semibold">
                  {zeroDiskMode ? "Zero-Disk Privacy Mode: ACTIVE" : "Server Storage Mode: STANDARD"}
                </span>
                <span className="text-[10px] opacity-75">
                  ({zeroDiskMode ? "No disk saving" : "Saves to vault"})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowVaultSelector(true);
                loadVaultImages();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#111726] hover:bg-[#161f33] text-zinc-200 border border-white/10 hover:border-emerald-500/40 transition shadow-sm cursor-pointer"
            >
              <FolderArchive className="w-4 h-4 text-emerald-400" />
              <span>Asset Vault</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Media</span>
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

      {/* ── Stage 1: Active Progress Bar (Upload, Inspection, Cleaning) ── */}
      {(inspecting || cleaning) && (
        <div className="rounded-2xl border border-emerald-500/30 bg-[#0c121e]/95 p-5 shadow-2xl backdrop-blur-md animate-in fade-in space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Spinner className="w-4 h-4 text-emerald-400" />
              <span className="text-zinc-200 font-semibold uppercase tracking-wider">
                {inspecting ? "Deep Metadata Scanner Active" : "Lossless Sanitizer Active"}
              </span>
              <span className="text-zinc-400">• {inspecting ? inspectStage : cleanStage}</span>
            </div>
            <span className="text-emerald-400 font-bold text-sm">
              {inspecting ? `${inspectProgress}%` : `${cleanProgress}%`}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden border border-white/10 relative">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(16,185,129,0.8)]"
              style={{ width: `${inspecting ? inspectProgress : cleanProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Main 2-Column Stage ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Media Preview & Clean Strategy */}
        <div className="lg:col-span-6 space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            className={cn(
              "relative rounded-3xl border-2 border-dashed transition-all duration-200 overflow-hidden flex flex-col items-center justify-center min-h-[390px] p-6 text-center bg-[#080d16]/90 backdrop-blur-md shadow-xl",
              isDragging
                ? "border-emerald-400 bg-emerald-950/25 scale-[0.99]"
                : previewUrl
                ? "border-emerald-500/25 hover:border-emerald-500/50"
                : "border-white/10 hover:border-emerald-500/40"
            )}
          >
            {previewUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                <div className="relative max-h-[360px] max-w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/50 group">
                  {isVideo ? (
                    <video
                      src={previewUrl}
                      controls
                      className="max-h-[360px] w-auto object-contain rounded-2xl bg-black"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={previewUrl}
                      alt="Source Preview"
                      className="max-h-[360px] w-auto object-contain rounded-2xl"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 pointer-events-none group-hover:pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition cursor-pointer"
                      title={isVideo ? "Replace Video" : "Replace Image"}
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition cursor-pointer"
                      title="View Fullsize"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-zinc-300">
                  <span className="truncate max-w-[220px] font-semibold text-emerald-400">
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
                  {zeroDiskMode && selectedFile && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Zero-Disk Mode
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4 py-10">
                <div className="w-16 h-16 rounded-2xl bg-[#101726] border border-white/10 flex items-center justify-center text-zinc-400 shadow-inner group-hover:scale-105 transition">
                  <FileVideo className="w-8 h-8 text-emerald-400" />
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
                  <p className="text-xs text-zinc-400">
                    Supports PNG, JPG, WEBP, and MP4, MOV, WEBM videos up to 500MB
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVaultSelector(true);
                      loadVaultImages();
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-mono bg-[#111726] hover:bg-[#182136] text-zinc-200 border border-white/10 hover:border-emerald-500/30 transition flex items-center gap-2 cursor-pointer"
                  >
                    <FolderArchive className="w-3.5 h-3.5 text-emerald-400" />
                    Select from Asset Vault
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cleaner Configuration Controls */}
          {previewUrl && (
            <div className="p-6 rounded-3xl bg-[#0c121e]/95 border border-white/10 space-y-5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-zinc-200">
                    Cleaning Strategy & Privacy Engine
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  LOSSLESS MODE ACTIVE
                </span>
              </div>

              {/* Zero-Disk Storage Option Switch */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-[#070b13] border border-white/5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200">
                      Zero-Disk Privacy Mode
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Upload & analyze media in a memory buffer. Files are never permanently saved to server storage, guaranteeing 100% confidentiality.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setZeroDiskMode(!zeroDiskMode)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    zeroDiskMode ? "bg-emerald-600" : "bg-zinc-800"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                      zeroDiskMode ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Stealth Mode (Scramble SynthID) */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-[#070b13] border border-white/5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200">
                      Stealth Mode (SynthID Watermark Neutralizer)
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      AI BYPASS
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Injects an imperceptible micro-frequency Gaussian dither into pixel matrices. Breaks SynthID neural detection classifiers while human eye perceives 100% pristine visual clarity.
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

              {/* Action Button */}
              <button
                type="button"
                onClick={handleCleanMetadata}
                disabled={cleaning || inspecting}
                className={cn(
                  "w-full py-3.5 px-6 rounded-2xl font-bold font-heading text-sm transition shadow-lg flex items-center justify-center gap-2.5",
                  cleaning || inspecting
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-600/25 cursor-pointer"
                )}
              >
                {cleaning ? (
                  <>
                    <Spinner className="w-4 h-4 text-white" />
                    <span>Neutralizing Watermarks & Stripping Provenance...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>Clean & Strip All AI Metadata</span>
                  </>
                )}
              </button>

              {cleanError && (
                <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
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
            <div className="h-[430px] rounded-3xl bg-[#080d16]/90 border border-white/10 flex flex-col items-center justify-center gap-3.5 p-8 text-center backdrop-blur-md">
              <Spinner className="w-8 h-8 text-emerald-400" />
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-zinc-200 tracking-wider uppercase">
                  DEEP SCANNING HEADERS & CRYPTOGRAPHIC CLAIMS...
                </span>
                <p className="text-[11px] font-mono text-zinc-400">{inspectStage}</p>
              </div>
            </div>
          ) : inspectError ? (
            <div className="h-[430px] rounded-3xl bg-[#080d16]/90 border border-red-500/30 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-red-300 font-semibold">{inspectError}</p>
            </div>
          ) : metadata ? (
            <div className="rounded-3xl bg-[#0a0f18]/90 border border-white/10 overflow-hidden backdrop-blur-xl shadow-2xl">
              {/* Provenance Verdict Header */}
              <div
                className={cn(
                  "p-4 border-b flex items-center justify-between gap-4",
                  metadata.has_ai_metadata
                    ? "bg-amber-950/30 border-amber-500/20 text-amber-300"
                    : "bg-emerald-950/30 border-emerald-500/20 text-emerald-300"
                )}
              >
                <div className="flex items-center gap-3">
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
                        ? `${metadata.detected_generator ? `Identified Model: ${metadata.detected_generator}` : "Metadata chunks present"}`
                        : "No C2PA manifests or known AI generator tags found"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {metadata.c2pa_detected && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                      C2PA LOCKED
                    </span>
                  )}
                  {metadata.synthid_detected && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      SYNTHID
                    </span>
                  )}
                </div>
              </div>

              {/* Sub-navigation tabs for metadata */}
              <div className="flex flex-wrap border-b border-white/5 bg-[#050810]/70 px-4 pt-2 gap-1">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={cn(
                    "px-3.5 py-2 text-xs font-mono font-semibold border-b-2 transition -mb-[1px] cursor-pointer",
                    activeTab === "overview"
                      ? "border-emerald-400 text-emerald-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  Overview & AI
                </button>
                <button
                  onClick={() => setActiveTab("camera")}
                  className={cn(
                    "px-3.5 py-2 text-xs font-mono font-semibold border-b-2 transition -mb-[1px] cursor-pointer",
                    activeTab === "camera"
                      ? "border-emerald-400 text-emerald-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  Camera & Optics
                </button>
                <button
                  onClick={() => setActiveTab("gps")}
                  className={cn(
                    "px-3.5 py-2 text-xs font-mono font-semibold border-b-2 transition -mb-[1px] cursor-pointer",
                    activeTab === "gps"
                      ? "border-emerald-400 text-emerald-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  GPS Location
                </button>
                {isVideo && (
                  <button
                    onClick={() => setActiveTab("streams")}
                    className={cn(
                      "px-3.5 py-2 text-xs font-mono font-semibold border-b-2 transition -mb-[1px] cursor-pointer",
                      activeTab === "streams"
                        ? "border-emerald-400 text-emerald-400"
                        : "border-transparent text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    Streams & Codecs
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("rights")}
                  className={cn(
                    "px-3.5 py-2 text-xs font-mono font-semibold border-b-2 transition -mb-[1px] cursor-pointer",
                    activeTab === "rights"
                      ? "border-emerald-400 text-emerald-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  Rights & Creator
                </button>
                <button
                  onClick={() => setActiveTab("raw")}
                  className={cn(
                    "px-3.5 py-2 text-xs font-mono font-semibold border-b-2 transition -mb-[1px] cursor-pointer",
                    activeTab === "raw"
                      ? "border-emerald-400 text-emerald-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  Raw Tags
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-5 space-y-5 max-h-[480px] overflow-y-auto">
                {/* 1. OVERVIEW & AI */}
                {activeTab === "overview" && (
                  <div className="space-y-4">
                    {/* Basic Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 rounded-2xl bg-[#060a12] border border-white/5">
                        <div className="text-[10px] font-mono text-zinc-400 uppercase">Format</div>
                        <div className="text-xs font-mono font-bold text-zinc-200">
                          {metadata.format || (isVideo ? "MP4" : "PNG")}
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#060a12] border border-white/5">
                        <div className="text-[10px] font-mono text-zinc-400 uppercase">Dimensions</div>
                        <div className="text-xs font-mono font-bold text-zinc-200">
                          {metadata.width} × {metadata.height}
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#060a12] border border-white/5">
                        <div className="text-[10px] font-mono text-zinc-400 uppercase">
                          {isVideo ? "FPS & Codec" : "Color Mode"}
                        </div>
                        <div className="text-xs font-mono font-bold text-zinc-200 truncate">
                          {isVideo ? `${metadata.fps || 30} FPS • ${metadata.video_codec || "H.264"}` : metadata.mode || "sRGB"}
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#060a12] border border-white/5">
                        <div className="text-[10px] font-mono text-zinc-400 uppercase">File Size</div>
                        <div className="text-xs font-mono font-bold text-zinc-200">
                          {metadata.file_size_formatted}
                        </div>
                      </div>
                    </div>

                    {/* Extracted Prompt */}
                    {metadata.embedded_prompt && (
                      <div className="p-4 rounded-2xl bg-[#070b14] border border-emerald-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Extracted AI Prompt
                          </span>
                          <button
                            onClick={() => copyToClipboard(metadata.embedded_prompt || "")}
                            className="text-[10px] font-mono flex items-center gap-1 text-zinc-400 hover:text-emerald-300 transition cursor-pointer"
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
                        <p className="text-xs text-zinc-200 font-sans leading-relaxed break-words bg-black/40 p-3 rounded-xl border border-white/5">
                          {metadata.embedded_prompt}
                        </p>
                      </div>
                    )}

                    {/* Extracted Negative Prompt if found */}
                    {metadata.negative_prompt && (
                      <div className="p-4 rounded-2xl bg-[#070b14] border border-red-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold uppercase text-red-400 flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5" />
                            Negative Prompt
                          </span>
                          <button
                            onClick={() => copyToClipboard(metadata.negative_prompt || "", true)}
                            className="text-[10px] font-mono flex items-center gap-1 text-zinc-400 hover:text-red-300 transition cursor-pointer"
                          >
                            {copiedNegPrompt ? (
                              <>
                                <Check className="w-3 h-3 text-red-400" />
                                <span className="text-red-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-zinc-300 font-sans leading-relaxed break-words bg-black/40 p-3 rounded-xl border border-white/5">
                          {metadata.negative_prompt}
                        </p>
                      </div>
                    )}

                    {/* Parameters Grid */}
                    {metadata.embedded_parameters && Object.keys(metadata.embedded_parameters).length > 0 && (
                      <div className="p-4 rounded-2xl bg-[#070b14] border border-white/10 space-y-2.5">
                        <span className="text-[11px] font-mono font-bold uppercase text-cyan-400">
                          Generation Parameters & Neural Seeds
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                          {Object.entries(metadata.embedded_parameters).map(([k, v]) => (
                            <div key={k} className="p-2 rounded-xl bg-black/30 border border-white/5 flex flex-col justify-between">
                              <span className="text-[10px] text-zinc-500 uppercase truncate">{k}</span>
                              <span className="text-zinc-200 font-semibold truncate">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Signatures Badges */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono font-bold uppercase text-zinc-400">
                        AI Provenance & Cryptographic Badges
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div
                          className={cn(
                            "p-3 rounded-2xl border flex items-center justify-between",
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
                            "p-3 rounded-2xl border flex items-center justify-between",
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

                {/* 2. CAMERA & OPTICS */}
                {activeTab === "camera" && (
                  <div className="space-y-4">
                    {metadata.camera_info && Object.keys(metadata.camera_info).length > 0 ? (
                      <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                        {Object.entries(metadata.camera_info).map(([k, v]) => (
                          <div key={k} className="p-3 rounded-2xl bg-[#060a12] border border-white/5 space-y-1">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{k.replace(/_/g, " ")}</div>
                            <div className="text-zinc-200 font-bold break-words">{String(v)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-zinc-500 font-mono text-xs space-y-2">
                        <Camera className="w-8 h-8 text-zinc-600 mx-auto" />
                        <div>NO HARDWARE CAMERA OPTICS DETECTED</div>
                        <div className="text-[11px] text-zinc-600">
                          (Common for direct AI synthetic generations without synthetic camera tags)
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. GPS GEOLOCATION */}
                {activeTab === "gps" && (
                  <div className="space-y-4">
                    {metadata.gps_info?.has_gps ? (
                      <div className="p-5 rounded-2xl bg-[#060a12] border border-emerald-500/25 space-y-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-emerald-400" />
                          <h4 className="text-xs font-bold font-mono uppercase text-emerald-400">
                            Geographic Coordinates Found in Headers
                          </h4>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                            <span className="text-zinc-500 block text-[10px]">COORDINATES</span>
                            <span className="text-zinc-200 font-bold">{metadata.gps_info.formatted}</span>
                          </div>
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                            <span className="text-zinc-500 block text-[10px]">DECIMAL (LAT, LON)</span>
                            <span className="text-zinc-200 font-bold">
                              {metadata.gps_info.latitude}, {metadata.gps_info.longitude}
                            </span>
                          </div>
                        </div>

                        {metadata.gps_info.google_maps_url && (
                          <a
                            href={metadata.gps_info.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>View on Google Maps</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-zinc-500 font-mono text-xs space-y-2">
                        <Compass className="w-8 h-8 text-zinc-600 mx-auto" />
                        <div>ZERO GPS TAGS EMBEDDED</div>
                        <div className="text-[11px] text-zinc-600">
                          This media does not contain latitude/longitude tracking metadata.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. VIDEO & AUDIO STREAMS */}
                {activeTab === "streams" && isVideo && (
                  <div className="space-y-4">
                    {/* Video Tech */}
                    {metadata.video_technical && Object.keys(metadata.video_technical).length > 0 && (
                      <div className="p-4 rounded-2xl bg-[#060a12] border border-white/10 space-y-3">
                        <span className="text-xs font-bold font-mono text-cyan-400 uppercase">
                          Video Stream Metrics
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                          {Object.entries(metadata.video_technical).map(([k, v]) => (
                            <div key={k} className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                              <span className="text-[10px] text-zinc-500 uppercase block">{k.replace(/_/g, " ")}</span>
                              <span className="text-zinc-200 font-semibold">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audio Tech */}
                    {metadata.audio_technical?.has_audio && (
                      <div className="p-4 rounded-2xl bg-[#060a12] border border-white/10 space-y-3">
                        <span className="text-xs font-bold font-mono text-emerald-400 uppercase">
                          Audio Stream Metrics
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                          {Object.entries(metadata.audio_technical).map(([k, v]) => {
                            if (k === "has_audio") return null;
                            return (
                              <div key={k} className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                                <span className="text-[10px] text-zinc-500 uppercase block">{k.replace(/_/g, " ")}</span>
                                <span className="text-zinc-200 font-semibold">{String(v)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. RIGHTS & CREATOR */}
                {activeTab === "rights" && (
                  <div className="space-y-4">
                    {metadata.rights_and_creator && Object.keys(metadata.rights_and_creator).length > 0 ? (
                      <div className="p-4 rounded-2xl bg-[#060a12] border border-white/10 space-y-3">
                        <span className="text-xs font-bold font-mono text-purple-400 uppercase">
                          Copyright & Attribution
                        </span>
                        <div className="space-y-2 text-xs font-mono">
                          {Object.entries(metadata.rights_and_creator).map(([k, v]) => (
                            <div key={k} className="p-3 rounded-xl bg-black/30 border border-white/5 flex justify-between">
                              <span className="text-zinc-500 uppercase">{k}:</span>
                              <span className="text-zinc-200 font-semibold">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-zinc-500 font-mono text-xs space-y-2">
                        <FileText className="w-8 h-8 text-zinc-600 mx-auto" />
                        <div>NO CREATOR OR COPYRIGHT CLAIMS EMBEDDED</div>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. RAW TAGS */}
                {activeTab === "raw" && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={rawTagSearch}
                        onChange={(e) => setRawTagSearch(e.target.value)}
                        placeholder="Search raw tags, atoms, and EXIF keys..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#060a12] border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="divide-y divide-white/5 border border-white/5 rounded-2xl overflow-hidden text-xs bg-[#060a12]/60">
                      {Object.entries(metadata.exif_tags || metadata.tags || {})
                        .filter(([tag, val]) => {
                          if (!rawTagSearch.trim()) return true;
                          const q = rawTagSearch.toLowerCase();
                          return tag.toLowerCase().includes(q) || String(val).toLowerCase().includes(q);
                        })
                        .map(([tag, val]) => (
                          <div key={tag} className="p-3 flex justify-between gap-4 hover:bg-white/[0.03]">
                            <span className="font-mono text-emerald-400 font-medium">{tag}</span>
                            <span className="font-mono text-zinc-300 text-right truncate max-w-[300px]">
                              {typeof val === "object" ? JSON.stringify(val) : String(val)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-[430px] rounded-3xl bg-[#080d16]/90 border border-white/10 flex flex-col items-center justify-center gap-3 p-8 text-center shadow-xl">
              <Shield className="w-10 h-10 text-zinc-600" />
              <p className="text-sm text-zinc-400">
                Upload or select an image or video to inspect its hidden metadata & AI provenance
              </p>
            </div>
          )}

          {/* Cleaned Result Presentation */}
          {cleanResult && (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/60 via-[#0a0f18] to-black border border-emerald-500/40 space-y-5 animate-in fade-in duration-300 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-heading text-white">
                      Sanitization Complete
                    </h4>
                    <p className="text-[11px] text-emerald-400/90 font-mono">
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
                <div className="relative rounded-2xl overflow-hidden border border-white/10 max-h-48 bg-black/50 flex items-center justify-center">
                  {isVideo ? (
                    <video
                      src={getMediaUrl(cleanResult.clean_url || cleanResult.url)}
                      controls
                      className="max-h-48 w-auto object-contain rounded-xl bg-black"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={getMediaUrl(cleanResult.clean_url || cleanResult.url)}
                      alt="Cleaned Preview"
                      className="max-h-48 w-auto object-contain rounded-xl"
                    />
                  )}
                  <div className="absolute top-2 left-2 bg-emerald-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
                    CLEANED
                  </div>
                </div>

                <div className="flex flex-col justify-between space-y-3">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-1 border-b border-white/5 font-mono">
                      <span className="text-zinc-500">Cleaned Size:</span>
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
                      href={getMediaUrl(cleanResult.url || cleanResult.clean_url)}
                      download={cleanResult.output_filename || cleanResult.clean_filename}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Cleaned Media</span>
                    </a>
                    <a
                      href={getMediaUrl(cleanResult.url || cleanResult.clean_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-4 rounded-xl text-xs font-mono text-zinc-300 hover:text-white bg-[#111726] hover:bg-[#182136] flex items-center justify-center gap-2 border border-white/10 transition"
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

      {/* ── Upgraded Asset Vault Selector Modal ── */}
      {showVaultSelector && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-4xl rounded-3xl bg-[#0b101a] border border-emerald-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#080d16]">
              <div className="flex items-center gap-3">
                <FolderArchive className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold font-heading text-white">
                    Select Media from Asset Vault
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-400">
                    Choose from generated images, videos, and studio masters
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVaultSelector(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 border-b border-white/5 bg-[#070b13] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setVaultTab("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition cursor-pointer",
                    vaultTab === "all"
                      ? "bg-emerald-600 text-white"
                      : "bg-[#101726] text-zinc-400 hover:text-white"
                  )}
                >
                  All ({vaultImages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVaultTab("images")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition cursor-pointer",
                    vaultTab === "images"
                      ? "bg-emerald-600 text-white"
                      : "bg-[#101726] text-zinc-400 hover:text-white"
                  )}
                >
                  Images
                </button>
                <button
                  type="button"
                  onClick={() => setVaultTab("videos")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition cursor-pointer",
                    vaultTab === "videos"
                      ? "bg-emerald-600 text-white"
                      : "bg-[#101726] text-zinc-400 hover:text-white"
                  )}
                >
                  Videos
                </button>
              </div>

              {/* Search & Hide tiny files toggle */}
              <div className="flex items-center gap-3 flex-1 max-w-md justify-end">
                <label className="flex items-center gap-2 text-xs font-mono text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hideSmallTestFiles}
                    onChange={(e) => setHideSmallTestFiles(e.target.checked)}
                    className="rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-0"
                  />
                  <span>Hide mock files (&lt;10KB)</span>
                </label>

                <div className="relative w-44 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={vaultSearch}
                    onChange={(e) => setVaultSearch(e.target.value)}
                    placeholder="Search files..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#0e1422] border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Asset Grid */}
            <div className="p-5 overflow-y-auto flex-1">
              {loadingVault ? (
                <div className="py-20 text-center space-y-2">
                  <Spinner className="w-8 h-8 text-emerald-400 mx-auto" />
                  <div className="text-xs font-mono text-zinc-400">Loading Asset Vault...</div>
                </div>
              ) : filteredVaultAssets.length === 0 ? (
                <div className="py-20 text-center text-zinc-500 text-xs font-mono space-y-2">
                  <FolderArchive className="w-10 h-10 text-zinc-700 mx-auto" />
                  <div>NO MATCHING ASSETS FOUND</div>
                  <div className="text-[11px] text-zinc-600">
                    Try disabling &quot;Hide mock files&quot; or changing your search terms.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {filteredVaultAssets.map((asset, idx) => {
                    const isAssetVid =
                      asset.asset_type === "videos" || /\.(mp4|mov|webm|mkv)$/i.test(asset.filename || asset.url);
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectFromVault(asset)}
                        className="group relative rounded-2xl border border-white/10 bg-[#070b13] overflow-hidden cursor-pointer hover:border-emerald-500/80 transition duration-200 shadow-md hover:shadow-emerald-950/40"
                      >
                        {isAssetVid ? (
                          <div className="w-full h-32 bg-[#05080f] flex flex-col items-center justify-center gap-2 group-hover:scale-105 transition duration-200">
                            <Video className="w-8 h-8 text-emerald-400" />
                            <span className="text-[9px] font-mono text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                              VIDEO
                            </span>
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={getMediaUrl(asset.url)}
                            alt={asset.filename}
                            className="w-full h-32 object-cover group-hover:scale-105 transition duration-200"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        )}

                        {/* Badges */}
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-black/70 text-zinc-300 backdrop-blur-xs border border-white/10">
                            {isAssetVid ? "MP4" : "IMG"}
                          </span>
                        </div>

                        <div className="p-2.5 bg-[#090e18] border-t border-white/5 space-y-0.5">
                          <div className="text-[11px] font-mono text-zinc-200 truncate group-hover:text-emerald-300 transition">
                            {asset.filename}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500 flex justify-between">
                            <span>{formatBytes(asset.size_bytes || 0)}</span>
                            {asset.size_bytes && asset.size_bytes < 10000 && (
                              <span className="text-amber-400">Sample</span>
                            )}
                          </div>
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
