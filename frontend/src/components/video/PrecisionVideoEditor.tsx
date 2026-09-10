"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Scissors,
  Gauge,
  Crop,
  Palette,
  Volume2,
  VolumeX,
  Type,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Download,
  Loader2,
  CheckCircle2,
  Film,
  Maximize2,
  FolderArchive,
  Upload,
  Plus,
  Trash2,
  Layers,
  Sliders,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  Music,
  Split,
  Pipette,
  RefreshCw,
  Eye,
  Check,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface PrecisionVideoEditorProps {
  videoUrl?: string;
  filename?: string;
  onClose: () => void;
  onSaved?: (newAsset: any) => void;
}

type EditorTab =
  | "trim"
  | "speed"
  | "aspect"
  | "color"
  | "overlay"
  | "chroma"
  | "audio"
  | "concat";

interface ConcatClip {
  id: string;
  url: string;
  name: string;
  duration?: number;
}

const LUT_PRESETS = [
  { id: "none", name: "Natural (Original)", desc: "Raw clean video without color cast" },
  { id: "teal_orange", name: "Teal & Orange", desc: "Hollywood blockbuster skin tone contrast" },
  { id: "cyberpunk", name: "Cyberpunk Neon", desc: "Vibrant electric violet & neon cyan hues" },
  { id: "noir", name: "Film Noir (B&W)", desc: "Deep monochrome with dramatic shadows" },
  { id: "vintage", name: "Vintage 1970s", desc: "Warm nostalgic sepia tone with soft highlights" },
  { id: "cinema_warm", name: "Cinema Warm", desc: "Golden hour sunlit warmth & soft roll-off" },
  { id: "matrix_cool", name: "Matrix Green/Cool", desc: "Subtle emerald tint for tech & sci-fi" },
];

export default function PrecisionVideoEditor({
  videoUrl: initialVideoUrl = "",
  filename: initialFilename = "video.mp4",
  onClose,
  onSaved,
}: PrecisionVideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgAudioInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const concatInputRef = useRef<HTMLInputElement>(null);

  // Active video source
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);
  const [filename, setFilename] = useState(initialFilename);

  // Navigation & UI
  const [activeTab, setActiveTab] = useState<EditorTab>("trim");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(5.0);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // 1. Trim & Split Settings
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(5.0);
  const [splitPoints, setSplitPoints] = useState<number[]>([]);

  // 2. Speed Retiming
  const [speed, setSpeed] = useState(1.0);

  // 3. Aspect Ratio & Crop
  const [aspectRatio, setAspectRatio] = useState<"original" | "16:9" | "9:16" | "1:1" | "4:3" | "21:9">("original");

  // 4. Color & LUT Grading
  const [brightness, setBrightness] = useState(0.0); // -0.5 to 0.5
  const [contrast, setContrast] = useState(1.0); // 0.5 to 2.0
  const [saturation, setSaturation] = useState(1.0); // 0 to 2.5
  const [presetLut, setPresetLut] = useState<string>("none");

  // 5. Overlays (Text & Watermark PIP)
  const [textOverlay, setTextOverlay] = useState("");
  const [textPosition, setTextPosition] = useState<"top" | "center" | "bottom">("bottom");
  const [textSize, setTextSize] = useState(24);
  const [watermarkUrl, setWatermarkUrl] = useState("");
  const [watermarkPosition, setWatermarkPosition] = useState<"top_left" | "top_right" | "bottom_left" | "bottom_right" | "center">("bottom_right");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.85);

  // 6. Video Background Removal (Chroma Key)
  const [chromaKeyEnabled, setChromaKeyEnabled] = useState(false);
  const [chromaKeyColor, setChromaKeyColor] = useState("#00ff00");
  const [chromaTolerance, setChromaTolerance] = useState(0.25);
  const [chromaBgUrl, setChromaBgUrl] = useState("");

  // 7. Audio Mixing
  const [muteOriginal, setMuteOriginal] = useState(false);
  const [originalVolume, setOriginalVolume] = useState(1.0);
  const [bgAudioUrl, setBgAudioUrl] = useState("");
  const [bgAudioVolume, setBgAudioVolume] = useState(0.5);

  // 8. Multi-Video Concat / Merge
  const [concatClips, setConcatClips] = useState<ConcatClip[]>([]);
  const [concatTransition, setConcatTransition] = useState<string>("none");
  const [concatTransitionDuration, setConcatTransitionDuration] = useState(1.0);

  // Upload Progress Tracking (0-100%)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadType, setUploadType] = useState<string>("");

  // Rendering & Export
  const [isRendering, setIsRendering] = useState(false);
  const [renderStage, setRenderStage] = useState("");
  const [renderedResult, setRenderedResult] = useState<any>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Sync video duration on loadedmetadata
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || 5.0;
      setDuration(dur);
      if (endTime === 5.0 || endTime > dur) {
        setEndTime(dur);
      }
    }
  };

  // Video time update listener
  const handleTimeUpdate = () => {
    if (videoRef.current && !isScrubbing) {
      const ct = videoRef.current.currentTime;
      setCurrentTime(ct);

      // Loop within active trim bounds
      if (ct >= endTime) {
        videoRef.current.currentTime = startTime;
        if (!isPlaying) {
          videoRef.current.pause();
        }
      }
    }
  };

  // Playback speed sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Audio volume and mute sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muteOriginal;
      videoRef.current.volume = muteOriginal ? 0 : Math.min(Math.max(originalVolume, 0), 1);
    }
  }, [muteOriginal, originalVolume]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (currentTime >= endTime || currentTime < startTime) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const seekTo = (time: number) => {
    const clamped = Math.max(0, Math.min(time, duration));
    setCurrentTime(clamped);
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  };

  const stepFrame = (frames: number) => {
    const fps = 30;
    const newTime = currentTime + frames * (1 / fps);
    seekTo(newTime);
  };

  const setStartToPlayhead = () => {
    const newStart = Math.min(currentTime, endTime - 0.2);
    setStartTime(Math.max(0, Number(newStart.toFixed(2))));
  };

  const setEndToPlayhead = () => {
    const newEnd = Math.max(currentTime, startTime + 0.2);
    setEndTime(Math.min(duration, Number(newEnd.toFixed(2))));
  };

  const splitAtPlayhead = () => {
    const current = Number(currentTime.toFixed(2));
    if (current > startTime && current < endTime && !splitPoints.includes(current)) {
      setSplitPoints((prev) => [...prev, current].sort((a, b) => a - b));
    }
  };

  const resetAllEdits = () => {
    setStartTime(0);
    setEndTime(duration);
    setSpeed(1.0);
    setAspectRatio("original");
    setBrightness(0.0);
    setContrast(1.0);
    setSaturation(1.0);
    setPresetLut("none");
    setTextOverlay("");
    setWatermarkUrl("");
    setChromaKeyEnabled(false);
    setMuteOriginal(false);
    setOriginalVolume(1.0);
    setBgAudioUrl("");
    setSplitPoints([]);
  };

  // Live CSS Filter computation for instant viewport feedback
  const getLiveCssFilter = () => {
    let b = 1 + brightness;
    let c = contrast;
    let s = saturation;
    let sepia = 0;
    let gray = 0;
    let hue = 0;

    if (presetLut === "noir") {
      gray = 1;
      c = 1.35;
      b = 0.95;
    } else if (presetLut === "teal_orange") {
      s = 1.35;
      c = 1.15;
      b = 1.02;
    } else if (presetLut === "cyberpunk") {
      s = 1.6;
      c = 1.3;
      b = 1.05;
      hue = 15;
    } else if (presetLut === "vintage") {
      sepia = 0.45;
      s = 0.85;
      c = 1.05;
    } else if (presetLut === "cinema_warm") {
      sepia = 0.2;
      s = 1.15;
      b = 1.02;
    } else if (presetLut === "matrix_cool") {
      hue = -20;
      s = 0.9;
      c = 1.15;
    }

    return `brightness(${b}) contrast(${c}) saturate(${s}) sepia(${sepia}) grayscale(${gray}) hue-rotate(${hue}deg)`;
  };

  // Timeline scrubber drag handling
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineContainerRef.current) return;
    setIsScrubbing(true);
    const rect = timelineContainerRef.current.getBoundingClientRect();
    const posRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(posRatio * duration);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const r = timelineContainerRef.current?.getBoundingClientRect();
      if (!r) return;
      const ratio = Math.max(0, Math.min(1, (moveEvent.clientX - r.left) / r.width));
      seekTo(ratio * duration);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Format time in MM:SS.ms
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  // Upload handlers with progress
  const handleMainVideoUpload = async (file: File) => {
    if (!file) return;
    setUploadType("Video");
    setUploadProgress(0);
    try {
      const res = await api.uploadVideoWithProgress(file, (pct) => setUploadProgress(pct));
      const url = res?.url || (typeof res === "string" ? res : "");
      if (url) {
        setVideoUrl(url);
        setFilename(file.name);
      }
    } catch (err: any) {
      alert("Failed to upload video: " + (err?.message || "Network error"));
    } finally {
      setUploadProgress(null);
    }
  };

  const handleBgAudioUpload = async (file: File) => {
    if (!file) return;
    setUploadType("Audio Track");
    setUploadProgress(0);
    try {
      const res = await api.uploadWithProgress("/video/upload", file, "file", (pct: number) => setUploadProgress(pct));
      const url = res?.url || (typeof res === "string" ? res : "");
      if (url) setBgAudioUrl(url);
    } catch (err: any) {
      alert("Failed to upload background audio: " + (err?.message || "Network error"));
    } finally {
      setUploadProgress(null);
    }
  };

  const handleWatermarkUpload = async (file: File) => {
    if (!file) return;
    setUploadType("Overlay Image");
    setUploadProgress(0);
    try {
      const res = await api.uploadVideoKeyframeWithProgress(file, (pct) => setUploadProgress(pct));
      const url = typeof res === "string" ? res : res?.url;
      if (url) setWatermarkUrl(url);
    } catch (err: any) {
      alert("Failed to upload overlay image: " + (err?.message || "Network error"));
    } finally {
      setUploadProgress(null);
    }
  };

  const handleConcatVideoAdd = async (file: File) => {
    if (!file) return;
    setUploadType("Additional Video Clip");
    setUploadProgress(0);
    try {
      const res = await api.uploadVideoWithProgress(file, (pct) => setUploadProgress(pct));
      const url = res?.url || (typeof res === "string" ? res : "");
      if (url) {
        setConcatClips((prev) => [
          ...prev,
          { id: Math.random().toString(), url, name: file.name },
        ]);
      }
    } catch (err: any) {
      alert("Failed to add clip: " + (err?.message || "Network error"));
    } finally {
      setUploadProgress(null);
    }
  };

  // Render Pipeline Execution
  const handleRenderExport = async () => {
    if (!videoUrl && concatClips.length === 0) {
      alert("Please upload a video or add clips to edit.");
      return;
    }

    setIsRendering(true);
    setRenderError(null);
    setRenderedResult(null);
    setRenderStage("Initializing FFmpeg render pipeline...");

    try {
      // If we are in Concat mode with multiple clips
      if (activeTab === "concat" && concatClips.length > 0) {
        setRenderStage("Stitching video clips with transitions...");
        const allClips = [videoUrl, ...concatClips.map((c) => c.url)].filter(Boolean);
        const res = await api.concatVideos(allClips, concatTransition, concatTransitionDuration);
        setRenderedResult(res);
        if (onSaved) onSaved(res);
      } else {
        // Standard precision edit pipeline
        setRenderStage("Applying precision filters, retiming & audio mix...");
        const payload: any = {
          video_path: videoUrl,
          start_time: startTime > 0 ? startTime : undefined,
          end_time: endTime < duration ? endTime : undefined,
          speed: speed !== 1.0 ? speed : undefined,
          aspect_ratio: aspectRatio !== "original" ? aspectRatio : undefined,
          brightness: brightness !== 0.0 ? brightness : undefined,
          contrast: contrast !== 1.0 ? contrast : undefined,
          saturation: saturation !== 1.0 ? saturation : undefined,
          preset_lut: presetLut !== "none" ? presetLut : undefined,
          mute_original: muteOriginal,
          original_audio_volume: !muteOriginal && originalVolume !== 1.0 ? originalVolume : undefined,
          bg_audio_path: bgAudioUrl || undefined,
          bg_audio_volume: bgAudioUrl ? bgAudioVolume : undefined,
          text_overlay: textOverlay.trim() || undefined,
          text_position: textPosition,
          watermark_path: watermarkUrl || undefined,
          watermark_position: watermarkPosition,
          chroma_key_color: chromaKeyEnabled ? chromaKeyColor : undefined,
          chroma_bg_path: chromaKeyEnabled && chromaBgUrl ? chromaBgUrl : undefined,
        };

        const res = await api.editVideo(payload);
        setRenderedResult(res);
        if (onSaved) onSaved(res);
      }
    } catch (err: any) {
      console.error("Video render error:", err);
      setRenderError(err?.message || "FFmpeg processing failed");
    } finally {
      setIsRendering(false);
      setRenderStage("");
    }
  };

  return (
    <div className="flex flex-col w-full h-full min-h-[calc(100vh-4.5rem)] bg-[#07070b] text-zinc-100 rounded-3xl overflow-hidden border border-zinc-800/80 shadow-2xl animate-in fade-in duration-200">
      {/* ─── Top Control Header ─── */}
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80 bg-[#0d0d14]/90 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-mono text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Studio</span>
          </button>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-heading font-bold text-white tracking-wide flex items-center gap-2">
                Precision Timeline Editor
                <span className="text-[9px] font-mono font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  FULL SUITE
                </span>
              </h1>
              <p className="text-[10px] font-mono text-zinc-500 truncate max-w-xs">
                {filename || "No source loaded"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={resetAllEdits}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-mono transition-all cursor-pointer"
            title="Reset all filters and trim"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={handleRenderExport}
            disabled={isRendering || (!videoUrl && concatClips.length === 0)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white disabled:text-zinc-500 text-xs font-heading font-bold shadow-lg shadow-emerald-900/30 transition-all active:scale-95 cursor-pointer"
          >
            {isRendering ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-300" />
                <span>Rendering...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Render & Export</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Upload Progress Notification Banner */}
      {uploadProgress !== null && (
        <div className="px-6 py-2 bg-emerald-950/40 border-b border-emerald-800/40 flex items-center justify-between gap-4 text-xs font-mono text-emerald-300">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Uploading {uploadType}... {uploadProgress}%</span>
          </div>
          <div className="w-48 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* ─── Center Viewport & Inspector (Split View) ─── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* ── Left / Center Video Stage (col-span-8) ── */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center p-4 bg-[#09090f] relative border-b lg:border-b-0 lg:border-r border-zinc-800/80">
          {videoUrl ? (
            <div className="relative w-full max-w-2xl flex flex-col items-center justify-center">
              {/* Aspect Container */}
              <div
                className={cn(
                  "relative w-full rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-2xl flex items-center justify-center transition-all duration-300",
                  aspectRatio === "16:9" && "aspect-video",
                  aspectRatio === "9:16" && "aspect-[9/16] max-h-[480px]",
                  aspectRatio === "1:1" && "aspect-square max-h-[460px]",
                  aspectRatio === "4:3" && "aspect-[4/3] max-h-[460px]",
                  aspectRatio === "21:9" && "aspect-[21/9]",
                  aspectRatio === "original" && "aspect-video max-h-[480px]"
                )}
              >
                <video
                  ref={videoRef}
                  src={getMediaUrl(videoUrl)}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  style={{ filter: getLiveCssFilter() }}
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={togglePlay}
                />

                {/* Live Text Overlay Preview */}
                {textOverlay && (
                  <div
                    className={cn(
                      "absolute left-0 right-0 px-6 py-2 pointer-events-none text-center font-bold tracking-wide transition-all drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]",
                      textPosition === "top" && "top-4",
                      textPosition === "center" && "top-1/2 -translate-y-1/2",
                      textPosition === "bottom" && "bottom-6"
                    )}
                    style={{ fontSize: `${textSize}px`, color: "#ffffff" }}
                  >
                    <span className="bg-black/60 px-3 py-1 rounded-lg backdrop-blur-xs">
                      {textOverlay}
                    </span>
                  </div>
                )}

                {/* Live Watermark / PIP Preview */}
                {watermarkUrl && (
                  <div
                    className={cn(
                      "absolute p-3 pointer-events-none transition-all",
                      watermarkPosition === "top_left" && "top-3 left-3",
                      watermarkPosition === "top_right" && "top-3 right-3",
                      watermarkPosition === "bottom_left" && "bottom-3 left-3",
                      watermarkPosition === "bottom_right" && "bottom-3 right-3",
                      watermarkPosition === "center" && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    )}
                    style={{ opacity: watermarkOpacity }}
                  >
                    <img
                      src={getMediaUrl(watermarkUrl)}
                      alt="Watermark"
                      className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-md"
                    />
                  </div>
                )}

                {/* Play/Pause Overlay Icon on Hover */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center backdrop-blur-xs opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>
              </div>

              {/* Timecode & Viewport Mini Controls */}
              <div className="flex items-center justify-between w-full mt-3 px-2 text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{formatTime(currentTime)}</span>
                  <span className="text-zinc-600">/</span>
                  <span>{formatTime(duration)}</span>
                  {speed !== 1.0 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                      {speed}x
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => stepFrame(-1)}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Step back 1 frame"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => stepFrame(1)}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Step forward 1 frame"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State: Prompt to upload or select video */
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleMainVideoUpload(f);
                  e.target.value = "";
                }}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 hover:scale-110 transition-transform cursor-pointer shadow-lg shadow-emerald-500/5"
              >
                <Upload className="w-8 h-8" />
              </div>
              <h2 className="text-base font-heading font-bold text-white mb-1">
                Load Video into Precision Editor
              </h2>
              <p className="text-xs font-mono text-zinc-400 mb-5 leading-relaxed">
                Upload an MP4, MOV, or WEBM file from your disk to begin editing with multi-track timeline, color grading, chroma key, and overlays.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Browse Video File
              </button>
            </div>
          )}
        </div>

        {/* ── Right Inspector Panel (col-span-4) ── */}
        <div className="lg:col-span-4 flex flex-col bg-[#0b0b12] overflow-y-auto max-h-[500px] lg:max-h-none border-t lg:border-t-0">
          {/* Inspector Tabs */}
          <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-4 gap-1 p-2 bg-[#09090e] border-b border-zinc-800/80">
            {[
              { id: "trim", label: "Trim", icon: Scissors },
              { id: "speed", label: "Speed", icon: Gauge },
              { id: "aspect", label: "Crop", icon: Crop },
              { id: "color", label: "Color", icon: Palette },
              { id: "overlay", label: "Overlay", icon: Type },
              { id: "chroma", label: "BG Remove", icon: Pipette },
              { id: "audio", label: "Audio", icon: Volume2 },
              { id: "concat", label: "Merge", icon: Film },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as EditorTab)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-mono transition-all cursor-pointer",
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Body */}
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* 1. TRIM TAB */}
            {activeTab === "trim" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                    Clip In / Out Points
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Duration: {(endTime - startTime).toFixed(2)}s
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
                    <span className="text-[10px] font-mono text-zinc-400 block">In Point (Start)</span>
                    <div className="text-sm font-mono font-bold text-emerald-400">{startTime.toFixed(2)}s</div>
                    <button
                      type="button"
                      onClick={setStartToPlayhead}
                      className="w-full py-1 text-[10px] font-mono rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                    >
                      Set to Playhead
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
                    <span className="text-[10px] font-mono text-zinc-400 block">Out Point (End)</span>
                    <div className="text-sm font-mono font-bold text-teal-400">{endTime.toFixed(2)}s</div>
                    <button
                      type="button"
                      onClick={setEndToPlayhead}
                      className="w-full py-1 text-[10px] font-mono rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                    >
                      Set to Playhead
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                  <span className="text-[11px] font-mono font-semibold text-zinc-300 block">
                    Split at Playhead ({currentTime.toFixed(2)}s)
                  </span>
                  <button
                    type="button"
                    onClick={splitAtPlayhead}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition-colors cursor-pointer"
                  >
                    <Split className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cut Clip at Current Time</span>
                  </button>

                  {splitPoints.length > 0 && (
                    <div className="text-[10px] font-mono text-zinc-400 pt-1">
                      Cuts created at: {splitPoints.map((p) => `${p}s`).join(", ")}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. SPEED TAB */}
            {activeTab === "speed" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                    Speed Ramp & Retiming
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">{speed}x</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s)}
                      className={cn(
                        "py-2 px-2 rounded-xl text-xs font-mono transition-all cursor-pointer text-center",
                        speed === s
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
                          : "bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                      )}
                    >
                      {s}x {s === 1.0 ? "(Normal)" : s < 1 ? "(Slow)" : "(Fast)"}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] font-mono text-zinc-500 leading-relaxed">
                  FFmpeg high-fidelity PTS retiming ensures clean audio pitch correction and smooth motion interpolation.
                </p>
              </div>
            )}

            {/* 3. ASPECT RATIO & CROP TAB */}
            {activeTab === "aspect" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                    <Crop className="w-3.5 h-3.5 text-emerald-400" />
                    Aspect Ratio & Social Crop
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">{aspectRatio}</span>
                </div>

                <div className="space-y-2">
                  {[
                    { id: "original", label: "Original Aspect", desc: "Maintain source video dimensions" },
                    { id: "16:9", label: "16:9 Cinema / YouTube", desc: "Horizontal landscape video" },
                    { id: "9:16", label: "9:16 Reels / TikTok / Shorts", desc: "Vertical mobile format" },
                    { id: "1:1", label: "1:1 Square Feed", desc: "Instagram / LinkedIn square" },
                    { id: "4:3", label: "4:3 Classic TV", desc: "Retro standard resolution" },
                    { id: "21:9", label: "21:9 Ultra-Wide Cinemascope", desc: "Anamorphic cinema width" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAspectRatio(item.id as any)}
                      className={cn(
                        "w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                        aspectRatio === item.id
                          ? "bg-emerald-500/10 border-emerald-500/30 text-white"
                          : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                      )}
                    >
                      <div>
                        <div className="text-xs font-mono font-bold text-white">{item.label}</div>
                        <div className="text-[10px] text-zinc-500">{item.desc}</div>
                      </div>
                      {aspectRatio === item.id && <Check className="w-4 h-4 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. COLOR & LUT TAB */}
            {activeTab === "color" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-emerald-400" />
                    Color Grading & LUTs
                  </span>
                </div>

                {/* LUT Presets */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase">LUT Presets</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {LUT_PRESETS.map((lut) => (
                      <button
                        key={lut.id}
                        type="button"
                        onClick={() => setPresetLut(lut.id)}
                        className={cn(
                          "p-2 rounded-xl border text-left transition-all cursor-pointer",
                          presetLut === lut.id
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold"
                            : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                        )}
                      >
                        <div className="text-[11px] font-mono">{lut.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brightness */}
                <div className="space-y-1 pt-2 border-t border-zinc-800/80">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-zinc-400">Brightness</span>
                    <span className="text-white font-bold">{brightness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.5"
                    step="0.05"
                    value={brightness}
                    onChange={(e) => setBrightness(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-zinc-400">Contrast</span>
                    <span className="text-white font-bold">{contrast.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={contrast}
                    onChange={(e) => setContrast(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Saturation */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-zinc-400">Saturation</span>
                    <span className="text-white font-bold">{saturation.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="2.5"
                    step="0.1"
                    value={saturation}
                    onChange={(e) => setSaturation(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* 5. OVERLAYS TAB (TEXT & WATERMARK) */}
            {activeTab === "overlay" && (
              <div className="space-y-4">
                <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-emerald-400" />
                  Text & PIP Watermark
                </span>

                {/* Text Overlay */}
                <div className="space-y-2 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                  <label className="text-[11px] font-mono text-zinc-300 font-bold block">Text Overlay</label>
                  <input
                    type="text"
                    value={textOverlay}
                    onChange={(e) => setTextOverlay(e.target.value)}
                    placeholder="Enter caption or subtitle..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />

                  <div className="grid grid-cols-3 gap-1 pt-1">
                    {(['top', 'center', 'bottom'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setTextPosition(pos)}
                        className={cn(
                          "py-1 text-[10px] font-mono rounded capitalize transition-all cursor-pointer",
                          textPosition === pos
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold"
                            : "bg-zinc-800 text-zinc-400 hover:text-white"
                        )}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Watermark / PIP Image */}
                <div className="space-y-2 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                  <input
                    ref={watermarkInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleWatermarkUpload(f);
                      e.target.value = "";
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-zinc-300 font-bold">PIP Image / Watermark</label>
                    {watermarkUrl && (
                      <button
                        type="button"
                        onClick={() => setWatermarkUrl("")}
                        className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {watermarkUrl ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={getMediaUrl(watermarkUrl)}
                        alt="Watermark Preview"
                        className="w-12 h-12 object-contain rounded-lg border border-zinc-700 bg-zinc-950 p-1"
                      />
                      <div className="text-[10px] font-mono text-zinc-400">
                        Watermark active. Choose placement below:
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => watermarkInputRef.current?.click()}
                      className="w-full py-2.5 rounded-xl border border-dashed border-zinc-700 hover:border-emerald-500 text-xs font-mono text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Upload PNG Logo / Watermark</span>
                    </button>
                  )}

                  {watermarkUrl && (
                    <div className="grid grid-cols-3 gap-1 pt-1">
                      {[
                        { id: "top_left", label: "Top Left" },
                        { id: "top_right", label: "Top Right" },
                        { id: "bottom_left", label: "Btm Left" },
                        { id: "bottom_right", label: "Btm Right" },
                        { id: "center", label: "Center" },
                      ].map((pos) => (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => setWatermarkPosition(pos.id as any)}
                          className={cn(
                            "py-1 text-[10px] font-mono rounded transition-all cursor-pointer",
                            watermarkPosition === pos.id
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold"
                              : "bg-zinc-800 text-zinc-400 hover:text-white"
                          )}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. CHROMA KEY / BACKGROUND REMOVAL */}
            {activeTab === "chroma" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                    <Pipette className="w-3.5 h-3.5 text-emerald-400" />
                    Chroma Key & BG Removal
                  </span>
                  <input
                    type="checkbox"
                    checked={chromaKeyEnabled}
                    onChange={(e) => setChromaKeyEnabled(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                {chromaKeyEnabled ? (
                  <div className="space-y-3 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-300">Key Color</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={chromaKeyColor}
                          onChange={(e) => setChromaKeyColor(e.target.value)}
                          className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
                        />
                        <span className="text-xs font-mono text-zinc-400 uppercase">{chromaKeyColor}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-zinc-400">Similarity Tolerance</span>
                        <span className="text-white font-bold">{chromaTolerance.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.6"
                        step="0.05"
                        value={chromaTolerance}
                        onChange={(e) => setChromaTolerance(parseFloat(e.target.value))}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    <p className="text-[10px] font-mono text-zinc-500 leading-relaxed">
                      Removes green/blue screen background and creates a transparent video matte for composite layering.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 text-center text-xs font-mono text-zinc-400">
                    Toggle Chroma Key above to remove solid colored backgrounds from your video.
                  </div>
                )}
              </div>
            )}

            {/* 7. AUDIO TAB */}
            {activeTab === "audio" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    Audio Mixing & BGM
                  </span>
                </div>

                {/* Mute toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                    {muteOriginal ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                    <span>Mute Original Video Audio</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={muteOriginal}
                    onChange={(e) => setMuteOriginal(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                {/* Original volume slider */}
                {!muteOriginal && (
                  <div className="space-y-1 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-zinc-400">Original Volume</span>
                      <span className="text-white font-bold">{Math.round(originalVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2.0"
                      step="0.1"
                      value={originalVolume}
                      onChange={(e) => setOriginalVolume(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                )}

                {/* Background music */}
                <div className="space-y-2 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <input
                    ref={bgAudioInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleBgAudioUpload(f);
                      e.target.value = "";
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-300 font-bold flex items-center gap-1">
                      <Music className="w-3.5 h-3.5 text-emerald-400" />
                      Background Soundtrack
                    </span>
                    {bgAudioUrl && (
                      <button
                        type="button"
                        onClick={() => setBgAudioUrl("")}
                        className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {bgAudioUrl ? (
                    <div className="space-y-2">
                      <div className="text-[11px] font-mono text-emerald-400 truncate">
                        Audio track loaded
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-zinc-400">BGM Volume</span>
                          <span className="text-white font-bold">{Math.round(bgAudioVolume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1.0"
                          step="0.05"
                          value={bgAudioVolume}
                          onChange={(e) => setBgAudioVolume(parseFloat(e.target.value))}
                          className="w-full accent-emerald-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => bgAudioInputRef.current?.click()}
                      className="w-full py-2.5 rounded-xl border border-dashed border-zinc-700 hover:border-emerald-500 text-xs font-mono text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Upload MP3/WAV Background Music</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 8. CONCAT / MERGE CLIPS TAB */}
            {activeTab === "concat" && (
              <div className="space-y-4">
                <input
                  ref={concatInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleConcatVideoAdd(f);
                    e.target.value = "";
                  }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-emerald-400" />
                    Multi-Clip Video Concat
                  </span>
                  <button
                    type="button"
                    onClick={() => concatInputRef.current?.click()}
                    className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Video</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Base Video */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono">
                    <div className="flex items-center gap-2 truncate">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        Clip #1
                      </span>
                      <span className="text-white truncate">{filename || "Current Video"}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">Master</span>
                  </div>

                  {/* Additional Clips */}
                  {concatClips.map((clip, idx) => (
                    <div
                      key={clip.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400 text-[10px] font-bold">
                          Clip #{idx + 2}
                        </span>
                        <span className="text-zinc-300 truncate">{clip.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConcatClips((prev) => prev.filter((c) => c.id !== clip.id))}
                        className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {concatClips.length === 0 && (
                    <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center text-[11px] font-mono text-zinc-500">
                      Click "Add Video" above to stitch multiple clips sequentially into one continuous film.
                    </div>
                  )}
                </div>

                {/* Transition Selector */}
                {concatClips.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase">Cut Transition</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: "none", label: "Hard Cut (None)" },
                        { id: "fade", label: "Cross Dissolve" },
                        { id: "wipeleft", label: "Directional Wipe" },
                        { id: "circleopen", label: "Circle Iris" },
                        { id: "smooth_morph", label: "AI Morph Blend" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setConcatTransition(t.id)}
                          className={cn(
                            "p-2 rounded-xl text-left text-[10px] font-mono transition-all cursor-pointer border",
                            concatTransition === t.id
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold"
                              : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white"
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Bottom Multi-Track Professional Timeline Dock ─── */}
      <div className="bg-[#0a0a10] border-t border-zinc-800/80 p-3 space-y-2 z-10">
        {/* Timeline Control Bar */}
        <div className="flex items-center justify-between px-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all cursor-pointer shadow-sm"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>
            <button
              type="button"
              onClick={() => seekTo(0)}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Jump to Start"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={splitAtPlayhead}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer text-[11px]"
              title="Split video at current playhead"
            >
              <Scissors className="w-3 h-3 text-emerald-400" />
              <span>Split</span>
            </button>
          </div>

          {/* Timecode */}
          <div className="font-bold font-mono text-zinc-200 tracking-wider">
            <span className="text-emerald-400">{formatTime(currentTime)}</span> / {formatTime(duration)}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2 text-zinc-400">
            <ZoomOut className="w-3.5 h-3.5" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.5"
              value={timelineZoom}
              onChange={(e) => setTimelineZoom(parseFloat(e.target.value))}
              className="w-16 accent-emerald-500 cursor-pointer"
            />
            <ZoomIn className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Multi-Track Timeline Canvas */}
        <div
          ref={timelineContainerRef}
          onMouseDown={handleTimelineMouseDown}
          className="relative w-full h-24 bg-[#060609] rounded-xl border border-zinc-800/80 overflow-hidden cursor-pointer select-none"
        >
          {/* Track 0: Time Ruler Markers */}
          <div className="absolute top-0 left-0 right-0 h-5 bg-zinc-900/60 border-b border-zinc-800 flex items-center px-2 text-[9px] font-mono text-zinc-500 pointer-events-none justify-between">
            <span>0.00s</span>
            <span>{(duration * 0.25).toFixed(1)}s</span>
            <span>{(duration * 0.5).toFixed(1)}s</span>
            <span>{(duration * 0.75).toFixed(1)}s</span>
            <span>{duration.toFixed(1)}s</span>
          </div>

          {/* Track 1: Video Track with In/Out Trim Handles */}
          <div className="absolute top-6 left-0 right-0 h-8 px-2 flex items-center">
            <div className="relative w-full h-full bg-zinc-900/80 rounded-lg overflow-hidden border border-zinc-800/80 flex items-center">
              {/* Active Trim Range Highlight */}
              <div
                className="absolute top-0 bottom-0 bg-emerald-500/20 border-y border-emerald-500/50 flex items-center justify-between pointer-events-none"
                style={{
                  left: `${(startTime / duration) * 100}%`,
                  width: `${((endTime - startTime) / duration) * 100}%`,
                }}
              >
                {/* Trim In Handle */}
                <div className="w-2 h-full bg-emerald-500 pointer-events-auto cursor-ew-resize rounded-l flex items-center justify-center">
                  <div className="w-0.5 h-3 bg-black/60 rounded-full" />
                </div>
                <div className="text-[9px] font-mono text-emerald-300 font-bold px-1 truncate select-none">
                  VIDEO [{(endTime - startTime).toFixed(1)}s]
                </div>
                {/* Trim Out Handle */}
                <div className="w-2 h-full bg-teal-500 pointer-events-auto cursor-ew-resize rounded-r flex items-center justify-center">
                  <div className="w-0.5 h-3 bg-black/60 rounded-full" />
                </div>
              </div>

              {/* Split markers */}
              {splitPoints.map((pt, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10 pointer-events-none"
                  style={{ left: `${(pt / duration) * 100}%` }}
                />
              ))}
            </div>
          </div>

          {/* Track 2: Audio Track Representation */}
          <div className="absolute top-15 left-0 right-0 h-6 px-2 flex items-center">
            <div className="relative w-full h-full bg-zinc-950/60 rounded border border-zinc-800/40 flex items-center px-2">
              <div className="flex items-center gap-1.5 text-[8px] font-mono text-zinc-500">
                <Volume2 className="w-2.5 h-2.5 text-zinc-400" />
                <span>{muteOriginal ? "AUDIO (MUTED)" : "AUDIO (ORIGINAL)"}</span>
                {bgAudioUrl && <span className="text-emerald-400 font-bold">+ BGM ACTIVE</span>}
              </div>
              {/* Audio Waveform dummy representation */}
              <div className="flex-1 flex items-center justify-around h-2 px-4 opacity-30">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-emerald-400 rounded-full"
                    style={{ height: `${20 + (i % 5) * 15}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Draggable Playhead Scrubber Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 pointer-events-none transition-all duration-75"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          >
            <div className="-translate-x-1/2 -top-1 w-2.5 h-2.5 bg-rose-500 rotate-45 rounded-xs shadow-md" />
          </div>
        </div>
      </div>

      {/* ─── Render Result Preview Modal / Drawer ─── */}
      {renderedResult && (
        <div className="p-4 bg-emerald-950/40 border-t border-emerald-800/40 flex flex-wrap items-center justify-between gap-4 text-xs font-mono animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Render Complete! Exported to high-resolution MP4.</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={getMediaUrl(renderedResult?.url || renderedResult?.video_url)}
              download
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Video</span>
            </a>
            <button
              type="button"
              onClick={() => setRenderedResult(null)}
              className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Render Error Banner */}
      {renderError && (
        <div className="p-3 bg-rose-950/50 border-t border-rose-800/50 flex items-center justify-between text-xs font-mono text-rose-300">
          <span>Render Error: {renderError}</span>
          <button
            type="button"
            onClick={() => setRenderError(null)}
            className="text-rose-400 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
