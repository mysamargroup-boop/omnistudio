"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
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
  Undo2,
  Redo2,
  Mic,
  FileText,
  Video,
  Clapperboard,
  Share2,
  Clock,
  Sparkle,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import Dropdown from "@/components/ui/Dropdown";

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
  | "concat"
  | "captions"
  | "ai_audio"
  | "ai_ads"
  | "export";

interface ConcatClip {
  id: string;
  url: string;
  name: string;
  duration?: number;
}

interface CaptionItem {
  start: number;
  end: number;
  text: string;
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
  const adProductImgRef = useRef<HTMLInputElement>(null);

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
  const [brightness, setBrightness] = useState(0.0);
  const [contrast, setContrast] = useState(1.0);
  const [saturation, setSaturation] = useState(1.0);
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

  // 9. AI Captions & Subtitles
  const [captions, setCaptions] = useState<CaptionItem[]>([]);
  const [captionLang, setCaptionLang] = useState("en");
  const [captionStyle, setCaptionStyle] = useState<"karaoke_glow" | "tiktok_bold" | "clean_modern" | "classic_bar">("karaoke_glow");
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);

  // 10. AI Audio Tools (Silence Removal, Denoise, Voice Enhance)
  const [isProcessingAiAudio, setIsProcessingAiAudio] = useState(false);
  const [aiAudioStatus, setAiAudioStatus] = useState<string | null>(null);

  // 11. AI Ads Creator
  const [adProductTitle, setAdProductTitle] = useState("");
  const [adTargetAudience, setAdTargetAudience] = useState("Modern lifestyle consumers");
  const [adLanguage, setAdLanguage] = useState("en");
  const [adProductImgUrl, setAdProductImgUrl] = useState("");
  const [isGeneratingAd, setIsGeneratingAd] = useState(false);
  const [adStoryboard, setAdStoryboard] = useState<any>(null);

  // 12. Export Settings
  const [exportResolution, setExportResolution] = useState<"720p" | "1080p" | "2k" | "4k">("1080p");
  const [exportFormat, setExportFormat] = useState<"mp4" | "mov" | "gif">("mp4");

  // Undo / Redo History
  interface EditorSnapshot {
    startTime: number;
    endTime: number;
    speed: number;
    aspectRatio: "original" | "16:9" | "9:16" | "1:1" | "4:3" | "21:9";
    brightness: number;
    contrast: number;
    saturation: number;
    presetLut: string;
    textOverlay: string;
  }
  const [history, setHistory] = useState<EditorSnapshot[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const pushSnapshot = useCallback(() => {
    const snap: EditorSnapshot = {
      startTime,
      endTime,
      speed,
      aspectRatio,
      brightness,
      contrast,
      saturation,
      presetLut,
      textOverlay,
    };
    setHistory((prev) => [...prev.slice(0, historyIdx + 1), snap]);
    setHistoryIdx((prev) => prev + 1);
  }, [startTime, endTime, speed, aspectRatio, brightness, contrast, saturation, presetLut, textOverlay, historyIdx]);

  const handleUndo = () => {
    if (historyIdx > 0) {
      const prev = history[historyIdx - 1];
      setStartTime(prev.startTime);
      setEndTime(prev.endTime);
      setSpeed(prev.speed);
      setAspectRatio(prev.aspectRatio);
      setBrightness(prev.brightness);
      setContrast(prev.contrast);
      setSaturation(prev.saturation);
      setPresetLut(prev.presetLut);
      setTextOverlay(prev.textOverlay);
      setHistoryIdx(historyIdx - 1);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const next = history[historyIdx + 1];
      setStartTime(next.startTime);
      setEndTime(next.endTime);
      setSpeed(next.speed);
      setAspectRatio(next.aspectRatio);
      setBrightness(next.brightness);
      setContrast(next.contrast);
      setSaturation(next.saturation);
      setPresetLut(next.presetLut);
      setTextOverlay(next.textOverlay);
      setHistoryIdx(historyIdx + 1);
    }
  };

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIdx, history]);

  // Upload Progress Tracking
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
    pushSnapshot();
  };

  const setEndToPlayhead = () => {
    const newEnd = Math.max(currentTime, startTime + 0.2);
    setEndTime(Math.min(duration, Number(newEnd.toFixed(2))));
    pushSnapshot();
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

  // Upload Handlers
  const handleMainVideoUpload = async (file: File) => {
    setUploadType("Video");
    setUploadProgress(0);
    try {
      const res = await api.uploadVideoWithProgress(file, (pct) => setUploadProgress(pct));
      if (res && res.url) {
        setVideoUrl(res.url);
        setFilename(res.filename || file.name);
        if (res.duration) {
          setDuration(res.duration);
          setEndTime(res.duration);
        }
      }
    } catch (e: any) {
      alert("Failed to upload video: " + e.message);
    } finally {
      setUploadProgress(null);
    }
  };

  const handleBgAudioUpload = async (file: File) => {
    setUploadType("Audio Track");
    setUploadProgress(0);
    try {
      const res = await api.uploadVideoWithProgress(file, (pct) => setUploadProgress(pct));
      if (res && res.url) {
        setBgAudioUrl(res.url);
      }
    } catch (e: any) {
      alert("Failed to upload background audio: " + e.message);
    } finally {
      setUploadProgress(null);
    }
  };

  const handleWatermarkUpload = async (file: File) => {
    setUploadType("Watermark");
    setUploadProgress(0);
    try {
      const res = await api.uploadImage(file);
      if (res && res.url) {
        setWatermarkUrl(res.url);
      }
    } catch (e: any) {
      alert("Failed to upload watermark: " + e.message);
    } finally {
      setUploadProgress(null);
    }
  };

  const handleConcatAdd = async (file: File) => {
    setUploadType("Video Clip");
    setUploadProgress(0);
    try {
      const res = await api.uploadVideoWithProgress(file, (pct) => setUploadProgress(pct));
      if (res && res.url) {
        setConcatClips((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            url: res.url,
            name: res.filename || file.name,
            duration: res.duration,
          },
        ]);
      }
    } catch (e: any) {
      alert("Failed to add clip: " + e.message);
    } finally {
      setUploadProgress(null);
    }
  };

  // AI Actions: Auto Captions
  const handleGenerateCaptions = async () => {
    if (!videoUrl) return;
    setIsGeneratingCaptions(true);
    try {
      const res = await api.aiCaptions(videoUrl, captionLang);
      if (res.success && res.captions) {
        setCaptions(res.captions);
      } else {
        alert(res.error || "Failed to generate captions");
      }
    } catch (e: any) {
      alert("Captions error: " + e.message);
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  // AI Actions: Silence Removal
  const handleRemoveSilence = async () => {
    if (!videoUrl) return;
    setIsProcessingAiAudio(true);
    setAiAudioStatus("Analyzing audio & cutting pauses...");
    try {
      const res = await api.aiRemoveSilence(videoUrl, -30.0, 0.5);
      if (res.success && res.url) {
        setVideoUrl(res.url);
        setFilename(res.filename);
        if (res.new_duration) {
          setDuration(res.new_duration);
          setEndTime(res.new_duration);
        }
        setAiAudioStatus(res.message);
        setTimeout(() => setAiAudioStatus(null), 5000);
      } else {
        alert(res.error || "Failed to remove silence");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsProcessingAiAudio(false);
    }
  };

  // AI Actions: Denoise
  const handleDenoiseAudio = async () => {
    if (!videoUrl) return;
    setIsProcessingAiAudio(true);
    setAiAudioStatus("Filtering fan noise, traffic & mic hiss...");
    try {
      const res = await api.aiDenoiseAudio(videoUrl);
      if (res.success && res.url) {
        setVideoUrl(res.url);
        setFilename(res.filename);
        setAiAudioStatus(res.message);
        setTimeout(() => setAiAudioStatus(null), 5000);
      } else {
        alert(res.error || "Failed to denoise audio");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsProcessingAiAudio(false);
    }
  };

  // AI Actions: Voice Enhancement
  const handleEnhanceVoice = async () => {
    if (!videoUrl) return;
    setIsProcessingAiAudio(true);
    setAiAudioStatus("Applying studio broadcast EQ, compression & loudness norm...");
    try {
      const res = await api.aiEnhanceVoice(videoUrl);
      if (res.success && res.url) {
        setVideoUrl(res.url);
        setFilename(res.filename);
        setAiAudioStatus(res.message);
        setTimeout(() => setAiAudioStatus(null), 5000);
      } else {
        alert(res.error || "Failed to enhance voice");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsProcessingAiAudio(false);
    }
  };

  // AI Actions: Product to Ad Campaign
  const handleGenerateProductAd = async () => {
    if (!adProductImgUrl || !adProductTitle.trim()) {
      alert("Please upload a product photo and enter a product title");
      return;
    }
    setIsGeneratingAd(true);
    try {
      const res = await api.aiProductAd(adProductImgUrl, adProductTitle, adTargetAudience, adLanguage);
      if (res.success && res.url) {
        setVideoUrl(res.url);
        setFilename(res.filename);
        if (res.duration) {
          setDuration(res.duration);
          setEndTime(res.duration);
        }
        setAdStoryboard(res.storyboard);
        alert("Commercial ad campaign generated successfully!");
      } else {
        alert(res.error || "Failed to generate commercial ad");
      }
    } catch (e: any) {
      alert("Ad error: " + e.message);
    } finally {
      setIsGeneratingAd(false);
    }
  };

  // Render & Export Handler
  const handleRenderExport = async () => {
    if (!videoUrl && concatClips.length === 0) return;
    setIsRendering(true);
    setRenderError(null);
    setRenderStage("Synthesizing multi-track edits with FFmpeg...");

    try {
      if (concatClips.length > 0) {
        const allUrls = videoUrl ? [videoUrl, ...concatClips.map((c) => c.url)] : concatClips.map((c) => c.url);
        const concatRes = await api.concatVideos(allUrls, concatTransition, concatTransitionDuration);
        if (!concatRes.success) throw new Error(concatRes.error || "Failed to merge clips");
        setRenderedResult(concatRes);
        if (onSaved) onSaved(concatRes);
        return;
      }

      const payload = {
        video_path: videoUrl,
        start_time: startTime,
        end_time: endTime,
        speed,
        aspect_ratio: aspectRatio,
        brightness,
        contrast,
        saturation,
        preset_lut: presetLut !== "none" ? presetLut : null,
        mute_original: muteOriginal,
        original_audio_volume: originalVolume,
        bg_audio_path: bgAudioUrl || null,
        bg_audio_volume: bgAudioVolume,
        text_overlay: textOverlay.trim() || null,
        text_position: textPosition,
        watermark_path: watermarkUrl || null,
        watermark_position: watermarkPosition,
        chroma_key_color: chromaKeyEnabled ? chromaKeyColor : null,
        chroma_bg_path: chromaKeyEnabled && chromaBgUrl ? chromaBgUrl : null,
      };

      const res = await api.editVideo(payload);
      if (!res.success) throw new Error(res.error || "Failed to render video");
      setRenderedResult(res);
      if (onSaved) onSaved(res);
    } catch (e: any) {
      setRenderError(e.message);
    } finally {
      setIsRendering(false);
      setRenderStage("");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  const getLiveCssFilter = () => {
    let f = `brightness(${1 + brightness}) contrast(${contrast}) saturate(${saturation})`;
    if (presetLut === "noir") f += " grayscale(100%) contrast(1.2)";
    if (presetLut === "vintage") f += " sepia(40%) contrast(0.9)";
    if (presetLut === "cyberpunk") f += " hue-rotate(45deg) saturate(1.8)";
    if (presetLut === "teal_orange") f += " contrast(1.1) saturate(1.2)";
    return f;
  };

  // Find active caption
  const activeCaption = captions.find((c) => currentTime >= c.start && currentTime <= c.end);

  return (
    <div className="flex flex-col w-full h-full max-h-full flex-1 bg-[#07070b] text-zinc-100 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl animate-in fade-in duration-150">
      {/* ─── Top Control Header ─── */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-[#0d0d14]/95 backdrop-blur-md z-20">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-mono text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Studio</span>
          </button>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Scissors className="w-3.5 h-3.5" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-heading font-bold text-white tracking-wide flex items-center gap-1.5">
                Precision Timeline Editor
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  FULL SUITE
                </span>
              </h1>
              <p className="text-[10px] font-mono text-zinc-500 truncate max-w-xs">{filename || "No video loaded"}</p>
            </div>
          </div>
        </div>

        {/* Action Controls: Undo, Redo, Reset, Render */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIdx <= 0}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 hover:text-white transition-all cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIdx >= history.length - 1}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 hover:text-white transition-all cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={resetAllEdits}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-mono transition-all cursor-pointer"
            title="Reset edits"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={handleRenderExport}
            disabled={isRendering || (!videoUrl && concatClips.length === 0)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-zinc-800 text-white text-xs font-heading font-bold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            {isRendering ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-300" />
                <span>Exporting...</span>
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

      {/* AI Audio Status Notification */}
      {aiAudioStatus && (
        <div className="flex-shrink-0 px-4 py-1.5 bg-emerald-950/40 border-b border-emerald-800/40 flex items-center justify-between text-xs font-mono text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{aiAudioStatus}</span>
          </div>
        </div>
      )}

      {/* Upload Progress Banner */}
      {uploadProgress !== null && (
        <div className="flex-shrink-0 px-4 py-1.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-xs font-mono text-emerald-400">
          <span>Uploading {uploadType}... {uploadProgress}%</span>
          <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* ─── Center Viewport & Inspector (Split View) ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* ── Left / Center Video Stage (col-span-8) ── */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center p-2 sm:p-3 bg-[#09090f] relative border-b lg:border-b-0 lg:border-r border-zinc-800/80 min-h-0 overflow-hidden">
          {videoUrl ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center min-h-0">
              {/* Aspect Container */}
              <div
                className={cn(
                  "relative rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-xl flex items-center justify-center transition-all duration-300 max-h-[35vh] w-auto max-w-full",
                  aspectRatio === "16:9" && "aspect-video",
                  aspectRatio === "9:16" && "aspect-[9/16]",
                  aspectRatio === "1:1" && "aspect-square",
                  aspectRatio === "4:3" && "aspect-[4/3]",
                  aspectRatio === "21:9" && "aspect-[21/9]",
                  aspectRatio === "original" && "aspect-video"
                )}
              >
                <video
                  ref={videoRef}
                  src={getMediaUrl(videoUrl)}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  style={{ filter: getLiveCssFilter() }}
                  className="w-full h-full object-contain cursor-pointer max-h-[35vh]"
                  onClick={togglePlay}
                />

                {/* Live Text Overlay Preview */}
                {textOverlay && (
                  <div
                    className={cn(
                      "absolute left-0 right-0 px-4 py-1 pointer-events-none text-center font-bold tracking-wide transition-all drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]",
                      textPosition === "top" && "top-3",
                      textPosition === "center" && "top-1/2 -translate-y-1/2",
                      textPosition === "bottom" && "bottom-4"
                    )}
                    style={{ fontSize: `${textSize}px`, color: "#ffffff" }}
                  >
                    <span className="bg-black/60 px-2.5 py-0.5 rounded-lg backdrop-blur-xs">{textOverlay}</span>
                  </div>
                )}

                {/* Live Watermark PIP Preview */}
                {watermarkUrl && (
                  <div
                    className={cn(
                      "absolute p-2 pointer-events-none transition-all",
                      watermarkPosition === "top_left" && "top-2 left-2",
                      watermarkPosition === "top_right" && "top-2 right-2",
                      watermarkPosition === "bottom_left" && "bottom-2 left-2",
                      watermarkPosition === "bottom_right" && "bottom-2 right-2",
                      watermarkPosition === "center" && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    )}
                    style={{ opacity: watermarkOpacity }}
                  >
                    <img
                      src={getMediaUrl(watermarkUrl)}
                      alt="Watermark"
                      className="w-10 h-10 object-contain drop-shadow-md"
                    />
                  </div>
                )}

                {/* Live AI Animated Subtitles Display */}
                {activeCaption && (
                  <div className="absolute bottom-6 left-0 right-0 px-4 text-center pointer-events-none">
                    <span
                      className={cn(
                        "px-3 py-1 rounded-lg font-bold text-xs sm:text-sm tracking-wide shadow-lg",
                        captionStyle === "karaoke_glow" && "bg-black/80 text-amber-300 border border-amber-500/40 shadow-amber-500/20",
                        captionStyle === "tiktok_bold" && "bg-yellow-400 text-black font-extrabold uppercase",
                        captionStyle === "clean_modern" && "bg-black/70 text-white",
                        captionStyle === "classic_bar" && "bg-black/90 text-white border-y border-white/20"
                      )}
                    >
                      {activeCaption.text}
                    </span>
                  </div>
                )}

                {/* Play/Pause Center Button Overlay */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center backdrop-blur-xs opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
              </div>

              {/* Viewport Mini Controls & Timecode */}
              <div className="flex items-center justify-between w-full mt-2 px-2 text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{formatTime(currentTime)}</span>
                  <span className="text-zinc-600">/</span>
                  <span>{formatTime(duration)}</span>
                  {speed !== 1.0 && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                      {speed}x
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => stepFrame(-1)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Previous Frame"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-1 rounded hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => stepFrame(1)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Next Frame"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm">
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
                className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 hover:scale-105 transition-transform cursor-pointer shadow-lg shadow-emerald-500/5"
              >
                <Upload className="w-6 h-6" />
              </div>
              <h2 className="text-sm font-heading font-bold text-white mb-1">Load Video into Precision Editor</h2>
              <p className="text-xs font-mono text-zinc-400 mb-4 leading-relaxed">
                Upload MP4, MOV, or WEBM from disk to begin multi-track timeline editing.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Browse Video File
              </button>
            </div>
          )}
        </div>

        {/* ── Right Inspector Panel (col-span-4) ── */}
        <div className="lg:col-span-4 flex flex-col bg-[#0b0b12] border-t lg:border-t-0 min-h-0 overflow-hidden">
          {/* Top Category Tabs Bar */}
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-1 p-1.5 bg-[#09090e] border-b border-zinc-800 overflow-x-auto no-scrollbar flex-shrink-0">
            {[
              { id: "trim", label: "Trim & Cut", icon: Scissors },
              { id: "speed", label: "Speed", icon: Gauge },
              { id: "aspect", label: "Aspect", icon: Crop },
              { id: "color", label: "Color", icon: Palette },
              { id: "audio", label: "Audio", icon: Volume2 },
              { id: "captions", label: "AI Captions", icon: FileText },
              { id: "ai_audio", label: "AI Audio", icon: Mic },
              { id: "ai_ads", label: "AI Ads", icon: Clapperboard },
              { id: "overlay", label: "Overlay", icon: Type },
              { id: "chroma", label: "BG Remove", icon: Pipette },
              { id: "concat", label: "Merge", icon: Film },
              { id: "export", label: "Export", icon: Share2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as EditorTab)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg text-[9px] font-mono transition-all cursor-pointer whitespace-nowrap",
                    isActive
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs font-bold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Body (Scrolls Internally) */}
          <div className="p-3.5 space-y-3.5 flex-1 overflow-y-auto custom-scrollbar">
            {/* 1. TRIM & CUT TAB */}
            {activeTab === "trim" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                    Clip In / Out Points
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">Duration: {((endTime - startTime) / speed).toFixed(2)}s</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    <label className="text-[10px] font-mono text-zinc-400 block mb-1">In Point (Start)</label>
                    <div className="text-base font-bold font-mono text-emerald-400 mb-1.5">{startTime.toFixed(2)}s</div>
                    <button
                      type="button"
                      onClick={setStartToPlayhead}
                      className="w-full py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-mono transition-colors cursor-pointer"
                    >
                      Set to Playhead
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    <label className="text-[10px] font-mono text-zinc-400 block mb-1">Out Point (End)</label>
                    <div className="text-base font-bold font-mono text-emerald-400 mb-1.5">{endTime.toFixed(2)}s</div>
                    <button
                      type="button"
                      onClick={setEndToPlayhead}
                      className="w-full py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-mono transition-colors cursor-pointer"
                    >
                      Set to Playhead
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={splitAtPlayhead}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-emerald-500/50 text-xs font-mono text-zinc-200 hover:text-white transition-all cursor-pointer"
                  >
                    <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cut Clip at Playhead ({currentTime.toFixed(2)}s)</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. SPEED RETIMING TAB */}
            {activeTab === "speed" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                    Speed Retiming
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">{speed}x</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSpeed(s);
                        pushSnapshot();
                      }}
                      className={cn(
                        "py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border",
                        speed === s
                          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                          : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white"
                      )}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. ASPECT RATIO & SOCIAL PRESETS */}
            {activeTab === "aspect" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                    <Crop className="w-3.5 h-3.5 text-emerald-400" />
                    Aspect Ratio & Framing
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "original", label: "Original Source", sub: "Native aspect" },
                    { id: "16:9", label: "16:9 Cinema", sub: "YouTube / TV" },
                    { id: "9:16", label: "9:16 Vertical", sub: "Reels / Shorts / TikTok" },
                    { id: "1:1", label: "1:1 Square", sub: "Instagram Post" },
                    { id: "4:3", label: "4:3 Retro", sub: "Classic TV" },
                    { id: "21:9", label: "21:9 Ultra-wide", sub: "Cinemascope" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setAspectRatio(r.id as any);
                        pushSnapshot();
                      }}
                      className={cn(
                        "p-2.5 rounded-xl text-left font-mono transition-all cursor-pointer border",
                        aspectRatio === r.id
                          ? "bg-emerald-500/20 border-emerald-500/50 text-white font-bold"
                          : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white"
                      )}
                    >
                      <div className="text-xs">{r.label}</div>
                      <div className="text-[10px] text-zinc-500">{r.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. COLOR GRADING & LUTS */}
            {activeTab === "color" && (
              <div className="space-y-3.5">
                <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-emerald-400" />
                  Color Grading & Film LUTs
                </span>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400">Brightness</span>
                    <span className="text-white">{brightness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.5"
                    step="0.05"
                    value={brightness}
                    onChange={(e) => setBrightness(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />

                  <div className="flex justify-between text-xs font-mono pt-1">
                    <span className="text-zinc-400">Contrast</span>
                    <span className="text-white">{contrast.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={contrast}
                    onChange={(e) => setContrast(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />

                  <div className="flex justify-between text-xs font-mono pt-1">
                    <span className="text-zinc-400">Saturation</span>
                    <span className="text-white">{saturation.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2.5"
                    step="0.05"
                    value={saturation}
                    onChange={(e) => setSaturation(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase">Cinema LUT Presets</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {LUT_PRESETS.map((lut) => (
                      <button
                        key={lut.id}
                        type="button"
                        onClick={() => {
                          setPresetLut(lut.id);
                          pushSnapshot();
                        }}
                        className={cn(
                          "p-2 rounded-xl text-left text-xs font-mono transition-all cursor-pointer border",
                          presetLut === lut.id
                            ? "bg-emerald-500/20 border-emerald-500/50 text-white font-bold"
                            : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white"
                        )}
                      >
                        {lut.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. AI AUTO CAPTIONS */}
            {activeTab === "captions" && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    AI Auto Captions & Subtitles
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">{captions.length} Segments</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block mb-1">Language</label>
                    <Dropdown
                      size="sm"
                      value={captionLang}
                      onChange={(val) => setCaptionLang(val)}
                      options={[
                        { value: "en", label: "English" },
                        { value: "hi", label: "Hindi" },
                        { value: "hinglish", label: "Hinglish" },
                        { value: "es", label: "Spanish" },
                        { value: "fr", label: "French" },
                        { value: "de", label: "German" },
                        { value: "ja", label: "Japanese" },
                        { value: "zh", label: "Chinese" },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block mb-1">Animation Style</label>
                    <Dropdown
                      size="sm"
                      value={captionStyle}
                      onChange={(val) => setCaptionStyle(val as any)}
                      options={[
                        { value: "karaoke_glow", label: "Karaoke Glow", badge: "GLOW" },
                        { value: "tiktok_bold", label: "TikTok Bold Yellow", badge: "TIKTOK" },
                        { value: "clean_modern", label: "Clean Modern", badge: "CLEAN" },
                        { value: "classic_bar", label: "Classic Cinema Bar", badge: "BAR" },
                      ]}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateCaptions}
                  disabled={isGeneratingCaptions || !videoUrl}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingCaptions ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Transcribing Video Audio...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Timestamped Captions</span>
                    </>
                  )}
                </button>

                {captions.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pt-2 border-t border-zinc-800">
                    {captions.map((c, i) => (
                      <div
                        key={i}
                        onClick={() => seekTo(c.start)}
                        className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/40 text-xs font-mono flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className="truncate max-w-[200px] text-zinc-200">{c.text}</span>
                        <span className="text-[10px] text-emerald-400 font-bold shrink-0">{c.start}s</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 6. AI AUDIO INTELLIGENCE TAB */}
            {activeTab === "ai_audio" && (
              <div className="space-y-3.5">
                <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  AI Audio Intelligence Suite
                </span>

                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">AI Silence & Dead Air Removal</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">POPULAR</span>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-400 mb-2.5">
                      Automatically detects and cuts awkward pauses, "umms", and dead air without affecting talking tempo.
                    </p>
                    <button
                      type="button"
                      onClick={handleRemoveSilence}
                      disabled={isProcessingAiAudio || !videoUrl}
                      className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-600 text-white text-xs font-mono font-bold transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {isProcessingAiAudio ? "Cutting Dead Air..." : "Cut Silences (<0.5s)"}
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                    <span className="text-xs font-bold text-white block mb-1">AI Background Noise Cleaner</span>
                    <p className="text-[10px] font-mono text-zinc-400 mb-2.5">
                      Eliminate fan noise, street traffic, room echo, and mic hiss using adaptive FFT noise suppression.
                    </p>
                    <button
                      type="button"
                      onClick={handleDenoiseAudio}
                      disabled={isProcessingAiAudio || !videoUrl}
                      className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-600 text-white text-xs font-mono font-bold transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Clean Background Noise
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                    <span className="text-xs font-bold text-white block mb-1">AI Voice Enhancement (Podcast Clarity)</span>
                    <p className="text-[10px] font-mono text-zinc-400 mb-2.5">
                      Apply broadcast-grade EQ, multi-band compression, and EBU R128 loudness normalization.
                    </p>
                    <button
                      type="button"
                      onClick={handleEnhanceVoice}
                      disabled={isProcessingAiAudio || !videoUrl}
                      className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-600 text-white text-xs font-mono font-bold transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Enhance to Studio Podcast Vocal
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 7. AI ADS CREATOR */}
            {activeTab === "ai_ads" && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                    <Clapperboard className="w-3.5 h-3.5 text-emerald-400" />
                    AI Commercial Ads Creator
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">GAME CHANGER</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block mb-1">Product Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Diamond Halo Necklace / Smart Watch"
                      value={adProductTitle}
                      onChange={(e) => setAdProductTitle(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block mb-1">Target Audience</label>
                    <input
                      type="text"
                      value={adTargetAudience}
                      onChange={(e) => setAdTargetAudience(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block mb-1">Product Image</label>
                    <input
                      ref={adProductImgRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const res = await api.uploadImage(f);
                          if (res.url) setAdProductImgUrl(res.url);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => adProductImgRef.current?.click()}
                      className="w-full py-2 rounded-xl bg-zinc-900 border border-dashed border-zinc-700 hover:border-emerald-500 text-xs font-mono text-zinc-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{adProductImgUrl ? "Product Photo Loaded" : "Upload Product Photo"}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateProductAd}
                    disabled={isGeneratingAd || !adProductImgUrl || !adProductTitle.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingAd ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Rendering Storyboard & Ad...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Commercial Video Ad (9:16)</span>
                      </>
                    )}
                  </button>

                  {adStoryboard && (
                    <div className="space-y-1 pt-2 border-t border-zinc-800 text-[10px] font-mono">
                      <span className="text-zinc-400 uppercase font-bold">Generated Storyboard:</span>
                      {adStoryboard.scenes?.map((s: any, idx: number) => (
                        <div key={idx} className="p-2 rounded bg-zinc-900 border border-zinc-800">
                          <span className="text-amber-400 font-bold">Scene {s.scene_id}: {s.shot_type}</span>
                          <p className="text-zinc-300 truncate">{s.voiceover}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 8. AUDIO CONTROLS & BGM */}
            {activeTab === "audio" && (
              <div className="space-y-3.5">
                <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  Audio Mixing & BGM
                </span>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                    <span className="text-xs font-mono text-zinc-300">Mute Original Video Audio</span>
                    <button
                      type="button"
                      onClick={() => setMuteOriginal(!muteOriginal)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer",
                        muteOriginal ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {muteOriginal ? "Muted" : "Active"}
                    </button>
                  </div>

                  <div>
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
                    <button
                      type="button"
                      onClick={() => bgAudioInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-mono text-zinc-300 cursor-pointer"
                    >
                      <Music className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{bgAudioUrl ? "Change Background Music" : "Upload Background Music (MP3)"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 9. OVERLAY TAB */}
            {activeTab === "overlay" && (
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-emerald-400" />
                  Text & Watermark PIP
                </span>
                <input
                  type="text"
                  placeholder="Enter text overlay..."
                  value={textOverlay}
                  onChange={(e) => setTextOverlay(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-hidden focus:border-emerald-500"
                />

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
                <button
                  type="button"
                  onClick={() => watermarkInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{watermarkUrl ? "Replace Logo Watermark" : "Upload Logo Watermark (PNG)"}</span>
                </button>
              </div>
            )}

            {/* 10. CHROMA KEY (BG REMOVE) */}
            {activeTab === "chroma" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-xs font-mono text-zinc-300">Chroma Key Background Removal</span>
                  <button
                    type="button"
                    onClick={() => setChromaKeyEnabled(!chromaKeyEnabled)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer",
                      chromaKeyEnabled ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-zinc-800 text-zinc-400"
                    )}
                  >
                    {chromaKeyEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>
            )}

            {/* 11. CONCAT / MERGE TAB */}
            {activeTab === "concat" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-emerald-400" />
                    Multi-Video Sequence Concat
                  </span>
                  <input
                    ref={concatInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleConcatAdd(f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => concatInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-mono cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Video</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                  {concatClips.map((c, idx) => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs font-mono">
                      <span className="truncate max-w-[180px] text-zinc-300">{idx + 2}. {c.name}</span>
                      <button
                        type="button"
                        onClick={() => setConcatClips((prev) => prev.filter((item) => item.id !== c.id))}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 12. EXPORT OPTIONS & SOCIAL PRESETS */}
            {activeTab === "export" && (
              <div className="space-y-3.5">
                <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  Export Presets & Resolution
                </span>

                <div>
                  <label className="text-[10px] font-mono text-zinc-400 block mb-1">Resolution</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["720p", "1080p", "2k", "4k"] as const).map((res) => (
                      <button
                        key={res}
                        type="button"
                        onClick={() => setExportResolution(res)}
                        className={cn(
                          "py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer",
                          exportResolution === res ? "bg-emerald-500/20 border-emerald-500/50 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400"
                        )}
                      >
                        {res.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-400 block mb-1">Format</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["mp4", "mov", "gif"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setExportFormat(fmt)}
                        className={cn(
                          "py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer",
                          exportFormat === fmt ? "bg-emerald-500/20 border-emerald-500/50 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400"
                        )}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={handleRenderExport}
                    disabled={isRendering || !videoUrl}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isRendering ? "Processing Export..." : `Export in ${exportResolution.toUpperCase()} (${exportFormat.toUpperCase()})`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Bottom Multi-Track Professional Timeline Dock (Pinned, Never Cut Off) ─── */}
      <div className="flex-shrink-0 bg-[#0a0a10] border-t border-zinc-800 p-2 sm:p-2.5 space-y-1.5 z-10 select-none">
        {/* Timeline Control Bar */}
        <div className="flex items-center justify-between px-1 text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all cursor-pointer shadow-sm"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>
            <button
              type="button"
              onClick={() => seekTo(0)}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Jump to Start"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={splitAtPlayhead}
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer text-[11px]"
              title="Split video at current playhead"
            >
              <Scissors className="w-3 h-3 text-emerald-400" />
              <span>Split</span>
            </button>
          </div>

          {/* Timecode */}
          <div className="font-bold font-mono text-zinc-200 tracking-wider text-xs">
            <span className="text-emerald-400">{formatTime(currentTime)}</span> / {formatTime(duration)}
          </div>

          {/* Zoom Slider */}
          <div className="flex items-center gap-2 text-zinc-400">
            <ZoomOut className="w-3.5 h-3.5" />
            <input
              type="range"
              min="1"
              max="4"
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
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const targetTime = (clickX / rect.width) * duration;
            seekTo(targetTime);
          }}
          className="relative w-full h-24 bg-[#060609] rounded-xl border border-zinc-800 overflow-hidden cursor-pointer select-none"
        >
          {/* Track 0: Time Ruler */}
          <div className="absolute top-0 left-0 right-0 h-4 bg-zinc-900/80 border-b border-zinc-800 flex items-center px-2 text-[8px] font-mono text-zinc-500 pointer-events-none justify-between">
            <span>0.00s</span>
            <span>{(duration * 0.25).toFixed(1)}s</span>
            <span>{(duration * 0.5).toFixed(1)}s</span>
            <span>{(duration * 0.75).toFixed(1)}s</span>
            <span>{duration.toFixed(1)}s</span>
          </div>

          {/* Track 1: Video Track */}
          <div className="absolute top-4.5 left-0 right-0 h-5 px-1.5 flex items-center">
            <div className="relative w-full h-full bg-zinc-900/80 rounded border border-zinc-800 flex items-center">
              {/* Active Trim Range */}
              <div
                className="absolute top-0 bottom-0 bg-emerald-500/20 border-y border-emerald-500/50 flex items-center justify-between pointer-events-none"
                style={{
                  left: `${(startTime / duration) * 100}%`,
                  width: `${((endTime - startTime) / duration) * 100}%`,
                }}
              />
              {/* Split Markers */}
              {splitPoints.map((sp, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-xs z-10 pointer-events-none"
                  style={{ left: `${(sp / duration) * 100}%` }}
                />
              ))}
              <span className="text-[8px] font-mono text-zinc-400 pl-2 pointer-events-none">VIDEO: {filename}</span>
            </div>
          </div>

          {/* Track 2: Audio & BGM Track */}
          <div className="absolute top-10.5 left-0 right-0 h-4 px-1.5 flex items-center">
            <div className="relative w-full h-full bg-zinc-950 rounded border border-zinc-800 flex items-center px-2">
              <span className="text-[8px] font-mono text-emerald-500/80 pointer-events-none">
                AUDIO: {muteOriginal ? "MUTED" : `${Math.round(originalVolume * 100)}%`} {bgAudioUrl ? "+ BGM" : ""}
              </span>
            </div>
          </div>

          {/* Track 3: Subtitles & Captions Track */}
          <div className="absolute top-15.5 left-0 right-0 h-4 px-1.5 flex items-center">
            <div className="relative w-full h-full bg-zinc-950 rounded border border-zinc-800 flex items-center">
              {captions.map((c, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 bg-amber-500/25 border-x border-amber-500/40 rounded px-1 overflow-hidden truncate text-[7px] font-mono text-amber-300 pointer-events-none"
                  style={{
                    left: `${(c.start / duration) * 100}%`,
                    width: `${Math.max(2, ((c.end - c.start) / duration) * 100)}%`,
                  }}
                >
                  {c.text}
                </div>
              ))}
              {captions.length === 0 && (
                <span className="text-[8px] font-mono text-zinc-600 pl-2 pointer-events-none">SUBTITLES: (Empty)</span>
              )}
            </div>
          </div>

          {/* Scrubber Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none flex flex-col items-center"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          >
            <div className="w-2.5 h-2.5 -mt-0.5 bg-red-500 rounded-full shadow-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
