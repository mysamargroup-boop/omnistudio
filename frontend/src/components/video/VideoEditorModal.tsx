"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Music,
  Upload,
  Trash2,
  FolderOpen,
  Mic,
  Zap,
  Cpu,
  Search,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

interface VideoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  filename: string;
  onSaved?: (newAsset: any) => void;
}

type TabType = "trim" | "speed" | "aspect" | "color" | "audio" | "text" | "effects";

const LUT_PRESETS = [
  { id: "none", name: "Natural (Original)", desc: "No color filter applied" },
  { id: "teal_orange", name: "Teal & Orange", desc: "Hollywood blockbuster skin tone contrast" },
  { id: "cyberpunk", name: "Cyberpunk Neon", desc: "Vibrant high-contrast violet & neon hues" },
  { id: "noir", name: "Film Noir (B&W)", desc: "Deep monochrome with theatrical contrast" },
  { id: "vintage", name: "Vintage 1970s", desc: "Warm nostalgic sepia tone with soft highlights" },
];

export default function VideoEditorModal({
  isOpen,
  onClose,
  videoUrl,
  filename,
  onSaved,
}: VideoEditorModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>("trim");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(5.0);

  // ─── Edit Settings ───
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(5.0);
  const [speed, setSpeed] = useState(1.0);
  const [aspectRatio, setAspectRatio] = useState<"original" | "16:9" | "9:16" | "1:1" | "4:3">("original");

  // Color Grading
  const [brightness, setBrightness] = useState(0.0); // -0.5 to 0.5
  const [contrast, setContrast] = useState(1.0); // 0.5 to 2.0
  const [saturation, setSaturation] = useState(1.0); // 0 to 2.5
  const [presetLut, setPresetLut] = useState<string>("none");

  // Audio Controls & AI Voice Suite
  const [muteOriginal, setMuteOriginal] = useState(false);
  const [originalVolume, setOriginalVolume] = useState(1.0);
  const [bgAudioPath, setBgAudioPath] = useState<string>("");
  const [bgAudioName, setBgAudioName] = useState<string>("");
  const [bgAudioVolume, setBgAudioVolume] = useState(0.8);
  const [audioModeTab, setAudioModeTab] = useState<"track" | "ai_voice">("track");
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioUploadProgress, setAudioUploadProgress] = useState<number | null>(null);
  const [audioPreviewPlaying, setAudioPreviewPlaying] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  // Vault Audio Picker State
  const [vaultAudioPickerOpen, setVaultAudioPickerOpen] = useState(false);
  const [vaultAudios, setVaultAudios] = useState<any[]>([]);
  const [vaultAudioLoading, setVaultAudioLoading] = useState(false);
  const [vaultAudioSearch, setVaultAudioSearch] = useState("");

  // AI Voiceover Generator State
  const [aiVoiceScript, setAiVoiceScript] = useState("");
  const [aiVoiceProvider, setAiVoiceProvider] = useState<"edge" | "elevenlabs" | "openai">("edge");
  const [aiVoiceModel, setAiVoiceModel] = useState("seed_audio");
  const [aiVoiceId, setAiVoiceId] = useState("en-US-GuyNeural");
  const [aiVoiceSpeed, setAiVoiceSpeed] = useState(1.0);
  const [isGeneratingAiVoice, setIsGeneratingAiVoice] = useState(false);
  const [generatedVoiceUrl, setGeneratedVoiceUrl] = useState("");
  const [generatedVoiceName, setGeneratedVoiceName] = useState("");
  const [autoMuteOnVoice, setAutoMuteOnVoice] = useState(true);

  const handleAudioUpload = async (file: File) => {
    setAudioUploading(true);
    setAudioUploadProgress(0);
    try {
      const res = await api.uploadVideoWithProgress(file, (pct) => setAudioUploadProgress(pct));
      if (res && res.url) {
        setBgAudioPath(res.url);
        setBgAudioName(file.name);
      }
    } catch (e: any) {
      alert("Failed to upload audio: " + e.message);
    } finally {
      setAudioUploading(false);
      setAudioUploadProgress(null);
    }
  };

  const openVaultAudioPicker = async () => {
    setVaultAudioPickerOpen(true);
    setVaultAudioLoading(true);
    try {
      const res = await api.getVaultAudios();
      const files = res?.files || (Array.isArray(res) ? res : []);
      setVaultAudios(files);
    } catch (err) {
      console.error("Failed to load vault audios:", err);
    } finally {
      setVaultAudioLoading(false);
    }
  };

  const handleGenerateAiVoice = async () => {
    if (!aiVoiceScript.trim()) {
      alert("Please enter a voiceover script or dialogue first.");
      return;
    }
    setIsGeneratingAiVoice(true);
    try {
      const res = await api.generateVoice({
        text: aiVoiceScript.trim(),
        provider: aiVoiceProvider,
        voice_id: aiVoiceId,
        model: aiVoiceModel,
      });
      if (res && res.success && res.audio_url) {
        setGeneratedVoiceUrl(res.audio_url);
        setGeneratedVoiceName(res.filename || `voice_${aiVoiceProvider}_${Date.now()}.mp3`);
      } else {
        alert(res?.error || "Failed to generate AI voice. Please check provider settings.");
      }
    } catch (e: any) {
      alert("Error generating voice: " + (e?.message || "Unknown error"));
    } finally {
      setIsGeneratingAiVoice(false);
    }
  };

  const handleAttachGeneratedVoice = () => {
    if (!generatedVoiceUrl) return;
    setBgAudioPath(generatedVoiceUrl);
    setBgAudioName(generatedVoiceName || "AI Voiceover");
    if (autoMuteOnVoice) {
      setMuteOriginal(true);
    }
    setAudioModeTab("track");
  };

  // Text Overlay
  const [textOverlay, setTextOverlay] = useState("");
  const [textPosition, setTextPosition] = useState<"top" | "center" | "bottom">("bottom");

  // Advanced Effects
  const [videoFadeIn, setVideoFadeIn] = useState(0.0);
  const [videoFadeOut, setVideoFadeOut] = useState(0.0);
  const [audioFadeIn, setAudioFadeIn] = useState(0.0);
  const [audioFadeOut, setAudioFadeOut] = useState(0.0);
  const [watermarkPath, setWatermarkPath] = useState("");
  const [chromaKeyColor, setChromaKeyColor] = useState("");

  // Export State
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState("");
  const [renderedResult, setRenderedResult] = useState<any>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Sync video metadata on load
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || 5.0;
      setDuration(dur);
      setEndTime(dur);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      // Loop within trim bounds
      if (videoRef.current.currentTime >= endTime) {
        videoRef.current.currentTime = startTime;
      }
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Compute live CSS filter style for real-time visual preview
  const getLiveCssFilter = () => {
    let b = 1 + brightness;
    let c = contrast;
    let s = saturation;
    let sepia = 0;
    let gray = 0;

    if (presetLut === "noir") {
      gray = 1;
      c = 1.3;
      b = 0.95;
    } else if (presetLut === "teal_orange") {
      s = 1.35;
      c = 1.15;
      b = 1.02;
    } else if (presetLut === "cyberpunk") {
      s = 1.5;
      c = 1.25;
      b = 1.05;
    } else if (presetLut === "vintage") {
      sepia = 0.45;
      s = 0.8;
      c = 0.95;
    }

    return `brightness(${b}) contrast(${c}) saturate(${s}) grayscale(${gray}) sepia(${sepia})`;
  };

  // Reset Edits
  const handleReset = () => {
    setStartTime(0);
    setEndTime(duration);
    setSpeed(1.0);
    setAspectRatio("original");
    setBrightness(0.0);
    setContrast(1.0);
    setSaturation(1.0);
    setPresetLut("none");
    setMuteOriginal(false);
    setOriginalVolume(1.0);
    setBgAudioPath("");
    setTextOverlay("");
    setTextPosition("bottom");
    setVideoFadeIn(0.0);
    setVideoFadeOut(0.0);
    setAudioFadeIn(0.0);
    setAudioFadeOut(0.0);
    setWatermarkPath("");
    setChromaKeyColor("");
    setRenderedResult(null);
    setRenderError(null);
  };

  // Render & Export Video
  const handleRenderExport = async () => {
    setIsRendering(true);
    setRenderError(null);
    setRenderProgress("Encoding timeline with FFmpeg hardware engine...");

    try {
      const payload = {
        video_path: videoUrl,
        start_time: startTime,
        end_time: endTime,
        speed: speed,
        aspect_ratio: aspectRatio,
        brightness: brightness,
        contrast: contrast,
        saturation: saturation,
        preset_lut: presetLut === "none" ? null : presetLut,
        mute_original: muteOriginal,
        original_audio_volume: originalVolume,
        bg_audio_path: bgAudioPath ? bgAudioPath : null,
        bg_audio_volume: bgAudioVolume,
        text_overlay: textOverlay ? textOverlay : null,
        text_position: textPosition,
        video_fade_in: videoFadeIn,
        video_fade_out: videoFadeOut,
        audio_fade_in: audioFadeIn,
        audio_fade_out: audioFadeOut,
        watermark_path: watermarkPath ? watermarkPath : null,
        chroma_key_color: chromaKeyColor ? chromaKeyColor : null,
      };

      const res = await api.editVideo(payload);
      if (res.success) {
        setRenderedResult(res);
        if (onSaved) onSaved(res);
      } else {
        setRenderError(res.error || "Failed to render edited video.");
      }
    } catch (e: any) {
      setRenderError(e?.message || "An unexpected error occurred during rendering.");
    } finally {
      setIsRendering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0d0d14] border border-white/[0.1] shadow-2xl overflow-hidden text-white cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold font-heading uppercase tracking-wide text-white">
                  Studio Video Editor
                </h2>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
                  FFmpeg 8.1 Engine
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-400 truncate max-w-md">{filename}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.06] text-xs font-mono transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Split Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* Left / Center: Interactive Video Canvas & Timeline (7 Cols) */}
          <div className="lg:col-span-7 p-5 flex flex-col justify-between items-center bg-black/40 border-b lg:border-b-0 lg:border-r border-white/[0.08] space-y-4">
            {/* Viewport Frame with Aspect Ratio Simulation */}
            <div className="w-full flex-1 flex items-center justify-center min-h-[300px] max-h-[440px] relative overflow-hidden rounded-xl bg-zinc-950 border border-white/[0.06]">
              <div
                className={cn(
                  "relative max-h-full max-w-full transition-all duration-300 flex items-center justify-center overflow-hidden",
                  aspectRatio === "9:16" && "aspect-[9/16] h-full",
                  aspectRatio === "16:9" && "aspect-[16/9] w-full",
                  aspectRatio === "1:1" && "aspect-square h-full",
                  aspectRatio === "4:3" && "aspect-[4/3] h-full",
                  aspectRatio === "original" && "w-full h-full"
                )}
              >
                <video
                  ref={videoRef}
                  src={getMediaUrl(videoUrl)}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  muted={muteOriginal}
                  className="w-full h-full object-contain transition-all"
                  style={{ filter: getLiveCssFilter() }}
                  playsInline
                />

                {/* Live Text Overlay Preview */}
                {textOverlay && (
                  <div
                    className={cn(
                      "absolute px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-xs text-white font-heading font-bold text-center text-sm sm:text-base pointer-events-none transition-all max-w-[85%]",
                      textPosition === "top" && "top-4",
                      textPosition === "center" && "top-1/2 -translate-y-1/2",
                      textPosition === "bottom" && "bottom-4"
                    )}
                  >
                    {textOverlay}
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Scrub Bar & Playback Controls */}
            <div className="w-full space-y-2 bg-white/[0.02] border border-white/[0.06] p-3 rounded-xl">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-1 rounded-md bg-white/[0.08] hover:bg-white/[0.14] text-white transition-all cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <span>
                    {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-amber-400 font-semibold">
                    Trim: {startTime.toFixed(1)}s – {endTime.toFixed(1)}s
                  </span>
                  <span>Speed: {speed}x</span>
                </div>
              </div>

              {/* Progress Slider */}
              <input
                type="range"
                min={0}
                max={duration || 5.0}
                step={0.05}
                value={currentTime}
                onChange={(e) => {
                  const t = parseFloat(e.target.value);
                  setCurrentTime(t);
                  if (videoRef.current) videoRef.current.currentTime = t;
                }}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/[0.1] rounded-lg"
              />
            </div>
          </div>

          {/* Right: Editing Tools Panels (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between p-5 space-y-4 overflow-y-auto">
            {/* Tool Nav Pills */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setActiveTab("trim")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer",
                  activeTab === "trim"
                    ? "bg-white text-zinc-950 font-bold shadow-xs"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Scissors className="w-3 h-3" />
                <span>Trim</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("speed")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer",
                  activeTab === "speed"
                    ? "bg-white text-zinc-950 font-bold shadow-xs"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Gauge className="w-3 h-3" />
                <span>Speed</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("aspect")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer",
                  activeTab === "aspect"
                    ? "bg-white text-zinc-950 font-bold shadow-xs"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Crop className="w-3 h-3" />
                <span>Aspect</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("color")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer",
                  activeTab === "color"
                    ? "bg-white text-zinc-950 font-bold shadow-xs"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Palette className="w-3 h-3" />
                <span>Color</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("audio")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer",
                  activeTab === "audio"
                    ? "bg-white text-zinc-950 font-bold shadow-xs"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Volume2 className="w-3 h-3" />
                <span>Audio</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("text")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer",
                  activeTab === "text"
                    ? "bg-white text-zinc-950 font-bold shadow-xs"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Type className="w-3 h-3" />
                <span>Text</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("effects")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer",
                  activeTab === "effects"
                    ? "bg-white text-zinc-950 font-bold shadow-xs"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Sparkles className="w-3 h-3" />
                <span>Effects</span>
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 space-y-4">
              {/* TAB 1: TRIM */}
              {activeTab === "trim" && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-zinc-200">Cut & Trim Boundaries</span>
                    <p className="text-[11px] font-jakarta text-zinc-400">
                      Set in-point and out-point to trim unneeded start or end sections.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1.5 bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase">START TIME (s)</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={endTime - 0.2}
                          value={startTime}
                          onChange={(e) => setStartTime(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-2 py-1 text-xs font-mono text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setStartTime(currentTime)}
                          className="px-2 py-1 rounded bg-white/[0.08] hover:bg-white/[0.14] text-[10px] font-mono text-zinc-300"
                        >
                          Mark
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase">END TIME (s)</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step={0.1}
                          min={startTime + 0.2}
                          max={duration}
                          value={endTime}
                          onChange={(e) => setEndTime(Math.min(duration, parseFloat(e.target.value) || duration))}
                          className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-2 py-1 text-xs font-mono text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setEndTime(currentTime)}
                          className="px-2 py-1 rounded bg-white/[0.08] hover:bg-white/[0.14] text-[10px] font-mono text-zinc-300"
                        >
                          Mark
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[11px] font-mono text-amber-300 flex items-center justify-between">
                    <span>Export Duration:</span>
                    <span className="font-bold">{((endTime - startTime) / speed).toFixed(2)}s</span>
                  </div>
                </div>
              )}

              {/* TAB 2: SPEED */}
              {activeTab === "speed" && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-zinc-200">Playback Velocity & Slow-Mo</span>
                    <p className="text-[11px] font-jakarta text-zinc-400">
                      Scale timing for cinematic slow-motion or fast hyperlapse acceleration.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 0.25, label: "0.25x Ultra Slow" },
                      { val: 0.5, label: "0.5x Slow-Mo" },
                      { val: 0.75, label: "0.75x Gentle" },
                      { val: 1.0, label: "1.0x Normal" },
                      { val: 1.5, label: "1.5x Fast" },
                      { val: 2.0, label: "2.0x Hyperlapse" },
                    ].map((s) => (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => {
                          setSpeed(s.val);
                          if (videoRef.current) videoRef.current.playbackRate = s.val;
                        }}
                        className={cn(
                          "py-2 px-2.5 rounded-xl border text-xs font-mono transition-all cursor-pointer text-center",
                          speed === s.val
                            ? "bg-amber-400 text-zinc-950 font-bold border-amber-400 shadow-sm"
                            : "bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/[0.15]"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: ASPECT RATIO */}
              {activeTab === "aspect" && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-zinc-200">Reframe & Social Aspect Ratio</span>
                    <p className="text-[11px] font-jakarta text-zinc-400">
                      Convert between YouTube widescreen, Instagram reels, and square feeds.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { val: "original", label: "Original Aspect", sub: "Preserve source" },
                      { val: "16:9", label: "16:9 Cinema", sub: "YouTube & TV" },
                      { val: "9:16", label: "9:16 Vertical", sub: "Reels / TikTok / Shorts" },
                      { val: "1:1", label: "1:1 Square", sub: "Instagram Post" },
                      { val: "4:3", label: "4:3 Classic", sub: "Retro Television" },
                    ].map((ar) => (
                      <button
                        key={ar.val}
                        type="button"
                        onClick={() => setAspectRatio(ar.val as any)}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all cursor-pointer",
                          aspectRatio === ar.val
                            ? "bg-white text-zinc-950 font-bold border-white shadow-xs"
                            : "bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/[0.12]"
                        )}
                      >
                        <div className="text-xs font-mono font-bold">{ar.label}</div>
                        <div className={cn("text-[10px] font-mono", aspectRatio === ar.val ? "text-zinc-700" : "text-zinc-500")}>
                          {ar.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: COLOR GRADING */}
              {activeTab === "color" && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-zinc-200">Cinematic Color LUTs & Grading</span>
                    <p className="text-[11px] font-jakarta text-zinc-400">
                      Live preview updates instantly on the canvas.
                    </p>
                  </div>

                  {/* Preset LUTs */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">AESTHETIC PRESETS</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {LUT_PRESETS.map((lut) => (
                        <button
                          key={lut.id}
                          type="button"
                          onClick={() => setPresetLut(lut.id)}
                          className={cn(
                            "py-1.5 px-2 rounded-lg border text-left text-xs font-mono transition-all cursor-pointer",
                            presetLut === lut.id
                              ? "bg-amber-400/20 text-amber-300 border-amber-400 font-bold"
                              : "bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white"
                          )}
                        >
                          {lut.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sliders */}
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                        <span>Brightness</span>
                        <span>{brightness > 0 ? `+${brightness}` : brightness}</span>
                      </div>
                      <input
                        type="range"
                        min={-0.4}
                        max={0.4}
                        step={0.02}
                        value={brightness}
                        onChange={(e) => setBrightness(parseFloat(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/[0.1] rounded-lg"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                        <span>Contrast</span>
                        <span>{contrast}x</span>
                      </div>
                      <input
                        type="range"
                        min={0.6}
                        max={1.8}
                        step={0.05}
                        value={contrast}
                        onChange={(e) => setContrast(parseFloat(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/[0.1] rounded-lg"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                        <span>Saturation</span>
                        <span>{saturation}x</span>
                      </div>
                      <input
                        type="range"
                        min={0.0}
                        max={2.2}
                        step={0.05}
                        value={saturation}
                        onChange={(e) => setSaturation(parseFloat(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/[0.1] rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: AUDIO & AI VOICEOVER SUITE */}
              {activeTab === "audio" && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex rounded-xl bg-white/[0.04] p-1 border border-white/[0.08] text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setAudioModeTab("track")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer font-semibold",
                        audioModeTab === "track"
                          ? "bg-white/[0.1] text-emerald-400 border border-white/[0.1] shadow-xs"
                          : "text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Audio Track & Mix</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioModeTab("ai_voice")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer font-semibold",
                        audioModeTab === "ai_voice"
                          ? "bg-white/[0.1] text-teal-400 border border-white/[0.1] shadow-xs"
                          : "text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>AI Voiceover Generator</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-teal-500/20 text-teal-300 font-bold">AI</span>
                    </button>
                  </div>

                  {audioModeTab === "track" && (
                    <div className="space-y-3.5 animate-in fade-in">
                      {/* Master Original Audio Track */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="flex items-center gap-2">
                          {muteOriginal ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                          <div>
                            <span className="text-xs font-mono font-bold text-zinc-200 block">Original Audio Track</span>
                            <span className="text-[10px] font-mono text-zinc-400">{muteOriginal ? "Muted" : `${Math.round(originalVolume * 100)}% Volume`}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMuteOriginal(!muteOriginal)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                            muteOriginal
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          )}
                        >
                          {muteOriginal ? "MUTED" : "ACTIVE"}
                        </button>
                      </div>

                      {!muteOriginal && (
                        <div className="space-y-1.5 bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
                          <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                            <span>Original Track Gain</span>
                            <span className="text-emerald-400">{(originalVolume * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min={0.0}
                            max={1.5}
                            step={0.05}
                            value={originalVolume}
                            onChange={(e) => setOriginalVolume(parseFloat(e.target.value))}
                            className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-white/[0.1] rounded-lg"
                          />
                        </div>
                      )}

                      {/* Added Soundtrack */}
                      <div className="space-y-2.5 bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-mono text-zinc-400 uppercase flex items-center gap-1.5">
                            <Music className="w-3.5 h-3.5 text-blue-400" />
                            Added Audio / Soundtrack
                          </label>
                          {bgAudioPath && (
                            <button
                              type="button"
                              onClick={() => {
                                setBgAudioPath("");
                                setBgAudioName("");
                                if (audioPreviewRef.current) audioPreviewRef.current.pause();
                                setAudioPreviewPlaying(false);
                              }}
                              className="text-[10px] font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remove
                            </button>
                          )}
                        </div>

                        {bgAudioPath ? (
                          <div className="space-y-3">
                            <div className="p-2.5 rounded-xl bg-blue-950/20 border border-blue-500/30 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!audioPreviewRef.current) return;
                                    if (audioPreviewPlaying) {
                                      audioPreviewRef.current.pause();
                                      setAudioPreviewPlaying(false);
                                    } else {
                                      audioPreviewRef.current.play();
                                      setAudioPreviewPlaying(true);
                                    }
                                  }}
                                  className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 transition-all cursor-pointer shrink-0"
                                >
                                  {audioPreviewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                </button>
                                <div className="min-w-0">
                                  <p className="text-xs font-mono font-semibold text-blue-200 truncate" title={bgAudioName || bgAudioPath}>
                                    {bgAudioName || "Attached Audio Track"}
                                  </p>
                                  <span className="text-[10px] font-mono text-blue-400/80">Active Soundtrack</span>
                                </div>
                                <audio
                                  ref={audioPreviewRef}
                                  src={getMediaUrl(bgAudioPath)}
                                  onEnded={() => setAudioPreviewPlaying(false)}
                                  className="hidden"
                                />
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={openVaultAudioPicker}
                                  className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-[10px] font-mono transition-colors cursor-pointer"
                                >
                                  Vault
                                </button>
                                <button
                                  type="button"
                                  onClick={() => audioFileInputRef.current?.click()}
                                  className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-[10px] font-mono transition-colors cursor-pointer"
                                >
                                  Upload
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                                <span>Soundtrack Gain Level</span>
                                <span className="text-blue-400">{(bgAudioVolume * 100).toFixed(0)}%</span>
                              </div>
                              <input
                                type="range"
                                min={0.0}
                                max={1.5}
                                step={0.05}
                                value={bgAudioVolume}
                                onChange={(e) => setBgAudioVolume(parseFloat(e.target.value))}
                                className="w-full accent-blue-400 cursor-pointer h-1.5 bg-white/[0.1] rounded-lg"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <input
                              ref={audioFileInputRef}
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleAudioUpload(f);
                                e.target.value = "";
                              }}
                            />
                            <div
                              onClick={() => audioFileInputRef.current?.click()}
                              className="w-full flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.04] text-zinc-300 transition-all cursor-pointer"
                            >
                              <Upload className="w-5 h-5 text-blue-400" />
                              <span className="font-semibold text-xs font-mono text-white">
                                {audioUploading ? `Uploading Audio (${audioUploadProgress || 0}%)...` : "Upload Audio from PC (MP3, WAV, AAC)"}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500">Click or drag local audio file</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={openVaultAudioPicker}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
                              >
                                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                                <span>Pick from Vault</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setAudioModeTab("ai_voice")}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-teal-950/30 hover:bg-teal-900/40 border border-teal-500/30 text-xs font-mono text-teal-300 hover:text-teal-200 transition-colors cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                                <span>Generate by AI</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {audioModeTab === "ai_voice" && (
                    <div className="space-y-3.5 animate-in fade-in">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                          <span>Voiceover Script / Dialogue</span>
                          <span>{aiVoiceScript.length} chars</span>
                        </div>
                        <textarea
                          rows={3}
                          value={aiVoiceScript}
                          onChange={(e) => setAiVoiceScript(e.target.value)}
                          placeholder="Type dialogue or narration script..."
                          className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none focus:border-teal-500 transition-colors"
                        />
                        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-0.5">
                          {[
                            { label: "Cinematic", text: "In a world sculpted by shadows, one final spark will ignite the revolution." },
                            { label: "Product Ad", text: "Engineered for pure precision. Designed to transcend the ordinary." },
                            { label: "Viral Hook", text: "Wait until you see what happens next. This completely changed everything." },
                          ].map((chip) => (
                            <button
                              key={chip.label}
                              type="button"
                              onClick={() => setAiVoiceScript(chip.text)}
                              className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[10px] font-mono text-zinc-400 hover:text-teal-300 transition-colors whitespace-nowrap cursor-pointer"
                            >
                              + {chip.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-zinc-400 uppercase">Engine / Provider</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: "edge", label: "Edge Neural", sub: "100% Free", icon: Zap, color: "text-emerald-400" },
                            { id: "elevenlabs", label: "ElevenLabs", sub: "Pro Audio", icon: Sparkles, color: "text-amber-400" },
                            { id: "openai", label: "OpenAI TTS", sub: "Studio HD", icon: Cpu, color: "text-blue-400" },
                          ].map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                const newProv = p.id as "edge" | "elevenlabs" | "openai";
                                setAiVoiceProvider(newProv);
                                if (newProv === "edge") {
                                  setAiVoiceModel("seed_audio");
                                  setAiVoiceId("en-US-GuyNeural");
                                } else if (newProv === "elevenlabs") {
                                  setAiVoiceModel("eleven_v3");
                                  setAiVoiceId("pNInz6obpgDQGcFmaJgB");
                                } else {
                                  setAiVoiceModel("tts-1-hd");
                                  setAiVoiceId("alloy");
                                }
                              }}
                              className={cn(
                                "p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5",
                                aiVoiceProvider === p.id
                                  ? "bg-white/[0.08] border-teal-500/60 ring-1 ring-teal-500/30"
                                  : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className={cn("text-xs font-mono font-bold", aiVoiceProvider === p.id ? "text-teal-300" : "text-zinc-200")}>
                                  {p.label}
                                </span>
                                <p.icon className={cn("w-3 h-3", p.color)} />
                              </div>
                              <span className="text-[9px] font-mono text-zinc-500">{p.sub}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-zinc-400 uppercase">Model</label>
                          <select
                            value={aiVoiceModel}
                            onChange={(e) => setAiVoiceModel(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
                          >
                            {aiVoiceProvider === "edge" && (
                              <>
                                <option value="seed_audio">Seed Audio 1.0 (HD)</option>
                                <option value="minimax">MiniMax Speech 2.8 HD</option>
                                <option value="qwen_audio">Qwen Audio 3.0</option>
                                <option value="edge_standard">Edge Standard</option>
                              </>
                            )}
                            {aiVoiceProvider === "elevenlabs" && (
                              <>
                                <option value="eleven_v3">Eleven v3 Multilingual</option>
                                <option value="eleven_turbo">Eleven Turbo v2.5</option>
                                <option value="eleven_multilingual_v2">Eleven Multilingual v2</option>
                              </>
                            )}
                            {aiVoiceProvider === "openai" && (
                              <>
                                <option value="tts-1-hd">TTS-1-HD (Studio HD)</option>
                                <option value="tts-1">TTS-1 (Standard)</option>
                              </>
                            )}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-zinc-400 uppercase">Voice Persona</label>
                          <select
                            value={aiVoiceId}
                            onChange={(e) => setAiVoiceId(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
                          >
                            {aiVoiceProvider === "edge" && (
                              <>
                                <option value="en-US-GuyNeural">Guy (Male - Deep & Narrative)</option>
                                <option value="en-US-JennyNeural">Jenny (Female - Expressive)</option>
                                <option value="en-US-ChristopherNeural">Christopher (Male - Authority)</option>
                                <option value="en-GB-SoniaNeural">Sonia (British Female)</option>
                                <option value="hi-IN-MadhurNeural">Madhur (Hindi Male)</option>
                                <option value="hi-IN-SwaraNeural">Swara (Hindi Female)</option>
                              </>
                            )}
                            {aiVoiceProvider === "elevenlabs" && (
                              <>
                                <option value="pNInz6obpgDQGcFmaJgB">Adam (Deep Cinema)</option>
                                <option value="21m00Tcm4TlvDq8ikWAM">Rachel (Calm Professional)</option>
                                <option value="ErXwobaYiN019PkySvjV">Antoni (Storyteller)</option>
                                <option value="EXAVITQu4vr4xnSDxMaL">Bella (Soft Expressive)</option>
                              </>
                            )}
                            {aiVoiceProvider === "openai" && (
                              <>
                                <option value="alloy">Alloy (Neutral)</option>
                                <option value="echo">Echo (Warm)</option>
                                <option value="fable">Fable (British)</option>
                                <option value="onyx">Onyx (Deep Cinema)</option>
                                <option value="nova">Nova (Energetic)</option>
                                <option value="shimmer">Shimmer (Gentle)</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-mono">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none text-[10px] text-zinc-300">
                          <input
                            type="checkbox"
                            checked={autoMuteOnVoice}
                            onChange={(e) => setAutoMuteOnVoice(e.target.checked)}
                            className="rounded border-zinc-700 bg-zinc-800 text-teal-500 focus:ring-0 cursor-pointer"
                          />
                          <span>Auto-mute video audio</span>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateAiVoice}
                        disabled={isGeneratingAiVoice || !aiVoiceScript.trim()}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-md",
                          isGeneratingAiVoice || !aiVoiceScript.trim()
                            ? "bg-white/[0.06] text-zinc-500 cursor-not-allowed"
                            : "bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-400 hover:to-emerald-500 text-black shadow-teal-500/20 active:scale-[0.99]"
                        )}
                      >
                        {isGeneratingAiVoice ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Synthesizing Voiceover...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Generate Voice with AI ({aiVoiceProvider.toUpperCase()})</span>
                          </>
                        )}
                      </button>

                      {generatedVoiceUrl && (
                        <div className="p-3 rounded-xl bg-teal-950/30 border border-teal-500/40 space-y-2.5 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-teal-400" />
                              <span className="text-xs font-mono font-bold text-white">Voiceover Generated</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/[0.06]">
                            <audio controls src={getMediaUrl(generatedVoiceUrl)} className="w-full h-8" />
                          </div>

                          <button
                            type="button"
                            onClick={handleAttachGeneratedVoice}
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-mono font-bold text-xs transition-all cursor-pointer shadow-md active:scale-95"
                          >
                            <Music className="w-3.5 h-3.5" />
                            <span>1-Click Attach to Video Track</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: TEXT OVERLAY */}
              {activeTab === "text" && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-zinc-200">Text & Title Overlay</span>
                    <p className="text-[11px] font-jakarta text-zinc-400">
                      Add captions, titles, or lower-thirds with cinematic drop-shadows.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase">Overlay Text</label>
                    <input
                      type="text"
                      placeholder="e.g. THE FUTURE OF INTELLIGENCE"
                      value={textOverlay}
                      onChange={(e) => setTextOverlay(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Placement</span>
                    <div className="grid grid-cols-3 gap-2">
                      {(["top", "center", "bottom"] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setTextPosition(pos)}
                          className={cn(
                            "py-1.5 rounded-lg border text-xs font-mono uppercase transition-all cursor-pointer",
                            textPosition === pos
                              ? "bg-white text-zinc-950 font-bold shadow-xs"
                              : "bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white"
                          )}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: EFFECTS */}
              {activeTab === "effects" && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-zinc-200">Advanced Effects</span>
                    <p className="text-[11px] font-jakarta text-zinc-400">
                      Fade transitions, watermark overlay, and green screen compositing.
                    </p>
                  </div>

                  {/* Fade In/Out */}
                  <div className="space-y-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Video Fade</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-zinc-500">Fade In (sec)</label>
                        <input
                          type="range"
                          min={0} max={5} step={0.1}
                          value={videoFadeIn}
                          onChange={(e) => setVideoFadeIn(parseFloat(e.target.value))}
                          className="w-full accent-violet-500"
                        />
                        <span className="text-[10px] font-mono text-violet-400">{videoFadeIn}s</span>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-zinc-500">Fade Out (sec)</label>
                        <input
                          type="range"
                          min={0} max={5} step={0.1}
                          value={videoFadeOut}
                          onChange={(e) => setVideoFadeOut(parseFloat(e.target.value))}
                          className="w-full accent-violet-500"
                        />
                        <span className="text-[10px] font-mono text-violet-400">{videoFadeOut}s</span>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Audio Fade</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-zinc-500">Fade In (sec)</label>
                        <input
                          type="range"
                          min={0} max={5} step={0.1}
                          value={audioFadeIn}
                          onChange={(e) => setAudioFadeIn(parseFloat(e.target.value))}
                          className="w-full accent-violet-500"
                        />
                        <span className="text-[10px] font-mono text-violet-400">{audioFadeIn}s</span>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-zinc-500">Fade Out (sec)</label>
                        <input
                          type="range"
                          min={0} max={5} step={0.1}
                          value={audioFadeOut}
                          onChange={(e) => setAudioFadeOut(parseFloat(e.target.value))}
                          className="w-full accent-violet-500"
                        />
                        <span className="text-[10px] font-mono text-violet-400">{audioFadeOut}s</span>
                      </div>
                    </div>
                  </div>

                  {/* Watermark */}
                  <div className="space-y-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Watermark / Logo</span>
                    <input
                      type="text"
                      placeholder="Vault image path (e.g. /outputs/images/logo.png)"
                      value={watermarkPath}
                      onChange={(e) => setWatermarkPath(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-violet-400"
                    />
                    <p className="text-[9px] text-zinc-500 font-mono">Use an image from your Vault as a watermark overlay.</p>
                  </div>

                  {/* Chroma Key */}
                  <div className="space-y-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Chroma Key (Green Screen)</span>
                    <div className="grid grid-cols-3 gap-2">
                      {["", "green", "blue"].map((color) => (
                        <button
                          key={color || "none"}
                          type="button"
                          onClick={() => setChromaKeyColor(color)}
                          className={cn(
                            "py-1.5 rounded-lg border text-xs font-mono uppercase transition-all cursor-pointer",
                            chromaKeyColor === color
                              ? "bg-white text-zinc-950 font-bold shadow-xs"
                              : "bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white"
                          )}
                        >
                          {color || "Off"}
                        </button>
                      ))}
                    </div>
                    {chromaKeyColor && (
                      <p className="text-[9px] text-amber-400 font-mono">⚠ Requires a replacement background image in the API payload (chroma_bg_path).</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Error or Success Feedback */}
            {renderError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-400">
                {renderError}
              </div>
            )}

            {renderedResult && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Video rendered and stored in Asset Vault!</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={getMediaUrl(renderedResult.url)}
                    download
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Edited File</span>
                  </a>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <button
              type="button"
              onClick={handleRenderExport}
              disabled={isRendering}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-heading font-bold text-xs tracking-tight transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              {isRendering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                  <span>{renderProgress}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>RENDER & SAVE TO ASSET VAULT</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Vault Audio Picker Modal */}
      {vaultAudioPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-[#0d0d16] border border-white/[0.08] rounded-2xl p-5 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-heading font-bold text-white">Select Audio from Vault</h3>
                  <p className="text-[11px] font-mono text-zinc-400">Choose any generated or uploaded soundtrack</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVaultAudioPickerOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 flex-shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search audio files..."
                  value={vaultAudioSearch}
                  onChange={(e) => setVaultAudioSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-1">
              {vaultAudioLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs font-mono">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                  <span>Loading audios from Vault...</span>
                </div>
              ) : vaultAudios.filter(a => !vaultAudioSearch || a.filename.toLowerCase().includes(vaultAudioSearch.toLowerCase())).length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs font-mono">
                  <Music className="w-8 h-8 text-zinc-600" />
                  <p>No audio files found in vault.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {vaultAudios
                    .filter(a => !vaultAudioSearch || a.filename.toLowerCase().includes(vaultAudioSearch.toLowerCase()))
                    .map((item) => (
                      <div
                        key={item.filename}
                        onClick={() => {
                          setBgAudioPath(item.url);
                          setBgAudioName(item.filename);
                          setVaultAudioPickerOpen(false);
                        }}
                        className="group p-3 rounded-xl border border-white/[0.06] hover:border-blue-500/50 bg-white/[0.02] hover:bg-white/[0.06] transition-all cursor-pointer flex flex-col gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <Music className="w-4 h-4 text-blue-400 shrink-0" />
                          <p className="text-xs font-mono font-semibold text-zinc-200 truncate group-hover:text-blue-300" title={item.filename}>
                            {item.filename}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                          <span>{item.size_mb ? `${item.size_mb} MB` : "Audio"}</span>
                          <span className="text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Select →</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setVaultAudioPickerOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-white/[0.1] hover:bg-white/[0.06] text-zinc-300 text-xs font-mono transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
