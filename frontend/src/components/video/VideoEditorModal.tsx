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

  // Audio Controls
  const [muteOriginal, setMuteOriginal] = useState(false);
  const [originalVolume, setOriginalVolume] = useState(1.0);
  const [bgAudioPath, setBgAudioPath] = useState<string>("");
  const [bgAudioVolume, setBgAudioVolume] = useState(0.5);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0d0d14] border border-white/[0.1] shadow-2xl overflow-hidden text-white">
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

              {/* TAB 5: AUDIO */}
              {activeTab === "audio" && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-zinc-200">Audio Track & Soundtrack Mix</span>
                    <p className="text-[11px] font-jakarta text-zinc-400">
                      Mute or blend original sound with background music tracks.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      {muteOriginal ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                      <span className="text-xs font-mono">Mute Original Audio Track</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMuteOriginal(!muteOriginal)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                        muteOriginal
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-white/[0.06] text-zinc-300 hover:text-white"
                      )}
                    >
                      {muteOriginal ? "MUTED" : "ACTIVE"}
                    </button>
                  </div>

                  {!muteOriginal && (
                    <div className="space-y-1.5 bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
                      <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                        <span>Original Track Gain</span>
                        <span>{(originalVolume * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.0}
                        max={1.5}
                        step={0.05}
                        value={originalVolume}
                        onChange={(e) => setOriginalVolume(parseFloat(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/[0.1] rounded-lg"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5 bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase">Background Music Path / Filename</label>
                    <input
                      type="text"
                      placeholder="e.g. outputs/audio/soundtrack.mp3"
                      value={bgAudioPath}
                      onChange={(e) => setBgAudioPath(e.target.value)}
                      className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none"
                    />
                  </div>
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
    </div>
  );
}
