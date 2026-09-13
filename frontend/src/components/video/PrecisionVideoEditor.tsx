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
  Zap,
  Cpu,
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
  Diamond,
  Key,
  SlidersHorizontal,
  FolderOpen,
  Search,
  X,
  Info,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import Dropdown from "@/components/ui/Dropdown";
import AudioMusicLibraryModal, { CURATED_AUDIO_LIBRARY, AudioTrack } from "@/components/audio/AudioMusicLibraryModal";

export interface PrecisionVideoEditorProps {
  videoUrl?: string;
  filename?: string;
  onClose: () => void;
  onSaved?: (newAsset: any) => void;
}

export interface VideoKeyframe {
  id: string;
  time: number; // in seconds
  scale: number; // 0.5 to 3.0
  positionX: number; // -50% to +50%
  positionY: number; // -50% to +50%
  rotation: number; // -180 to 180 deg
  opacity: number; // 0.0 to 1.0
  easing: "linear" | "ease_in_out";
}

type EditorTab =
  | "trim"
  | "keyframes"
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

  // 7. Audio Mixing & AI Voiceover Studio
  const [muteOriginal, setMuteOriginal] = useState(false);
  const [originalVolume, setOriginalVolume] = useState(1.0);
  const [bgAudioUrl, setBgAudioUrl] = useState("");
  const [bgAudioName, setBgAudioName] = useState("");
  const [bgAudioVolume, setBgAudioVolume] = useState(0.8);
  const [audioFadeIn, setAudioFadeIn] = useState(0.0);
  const [audioFadeOut, setAudioFadeOut] = useState(0.0);
  const [audioModeTab, setAudioModeTab] = useState<"track" | "ai_voice" | "library">("track");
  const [audioPreviewPlaying, setAudioPreviewPlaying] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [audioLibraryModalOpen, setAudioLibraryModalOpen] = useState(false);
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const libraryAudioPreviewRef = useRef<HTMLAudioElement | null>(null);

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

  // 13. Asset Vault Picker State
  const [vaultPickerOpen, setVaultPickerOpen] = useState(false);
  const [vaultTarget, setVaultTarget] = useState<"main" | "concat" | "audio">("main");
  const [vaultVideos, setVaultVideos] = useState<any[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultSearch, setVaultSearch] = useState("");

  // 14. Drag and Drop Feedback States
  const [isDraggingMain, setIsDraggingMain] = useState(false);
  const [isDraggingBgAudio, setIsDraggingBgAudio] = useState(false);
  const [isDraggingWatermark, setIsDraggingWatermark] = useState(false);
  const [isDraggingConcat, setIsDraggingConcat] = useState(false);
  const [isDraggingProductImg, setIsDraggingProductImg] = useState(false);

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

  // Native video dimensions & resolution label
  const [naturalWidth, setNaturalWidth] = useState<number>(1920);
  const [naturalHeight, setNaturalHeight] = useState<number>(1080);
  const [videoDimensionLabel, setVideoDimensionLabel] = useState<string>("");

  // Keyframes State
  const [keyframes, setKeyframes] = useState<VideoKeyframe[]>([]);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);

  // Sync video duration & dimensions on loadedmetadata
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || 5.0;
      const vw = videoRef.current.videoWidth || 1920;
      const vh = videoRef.current.videoHeight || 1080;
      setNaturalWidth(vw);
      setNaturalHeight(vh);
      setVideoDimensionLabel(`${vw}×${vh}`);
      setDuration(dur);
      if (endTime === 5.0 || endTime > dur) {
        setEndTime(dur);
      }
    }
  };

  // Keyframe Interpolation Logic
  const interpKeyframe = (() => {
    if (keyframes.length === 0) {
      return { scale: 1.0, positionX: 0, positionY: 0, rotation: 0, opacity: 1.0 };
    }
    const sorted = [...keyframes].sort((a, b) => a.time - b.time);
    if (currentTime <= sorted[0].time) {
      return sorted[0];
    }
    if (currentTime >= sorted[sorted.length - 1].time) {
      return sorted[sorted.length - 1];
    }
    for (let i = 0; i < sorted.length - 1; i++) {
      const kf1 = sorted[i];
      const kf2 = sorted[i + 1];
      if (currentTime >= kf1.time && currentTime <= kf2.time) {
        const dt = kf2.time - kf1.time;
        let t = dt > 0 ? (currentTime - kf1.time) / dt : 0;
        if (kf2.easing === "ease_in_out") {
          t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }
        return {
          scale: kf1.scale + (kf2.scale - kf1.scale) * t,
          positionX: kf1.positionX + (kf2.positionX - kf1.positionX) * t,
          positionY: kf1.positionY + (kf2.positionY - kf1.positionY) * t,
          rotation: kf1.rotation + (kf2.rotation - kf1.rotation) * t,
          opacity: kf1.opacity + (kf2.opacity - kf1.opacity) * t,
        };
      }
    }
    return sorted[0];
  })();

  const activeOrNearestKeyframe = keyframes.find((k) => Math.abs(k.time - currentTime) < 0.15) ||
    (selectedKeyframeId ? keyframes.find((k) => k.id === selectedKeyframeId) : null);

  const addOrUpdateKeyframeAtPlayhead = () => {
    const playheadTime = Number(currentTime.toFixed(2));
    const existing = keyframes.find((k) => Math.abs(k.time - playheadTime) < 0.15);
    if (existing) {
      setSelectedKeyframeId(existing.id);
      setActiveTab("keyframes");
    } else {
      const newKf: VideoKeyframe = {
        id: "kf_" + Math.random().toString(36).substring(2, 9),
        time: playheadTime,
        scale: 1.25,
        positionX: 0,
        positionY: 0,
        rotation: 0,
        opacity: 1.0,
        easing: "ease_in_out",
      };
      setKeyframes((prev) => [...prev, newKf].sort((a, b) => a.time - b.time));
      setSelectedKeyframeId(newKf.id);
      setActiveTab("keyframes");
    }
  };

  const deleteKeyframe = (id: string) => {
    setKeyframes((prev) => prev.filter((k) => k.id !== id));
    if (selectedKeyframeId === id) setSelectedKeyframeId(null);
  };

  const updateKeyframeProperty = (id: string, prop: keyof VideoKeyframe, val: any) => {
    setKeyframes((prev) => prev.map((k) => (k.id === id ? { ...k, [prop]: val } : k)));
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
        setBgAudioName(file.name);
      }
    } catch (e: any) {
      alert("Failed to upload background audio: " + e.message);
    } finally {
      setUploadProgress(null);
    }
  };

  // AI Voiceover Generation Handler
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
    setBgAudioUrl(generatedVoiceUrl);
    setBgAudioName(generatedVoiceName || "AI Voiceover");
    if (autoMuteOnVoice) {
      setMuteOriginal(true);
    }
    setAudioModeTab("track");
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

  // Asset Vault Picker Handlers
  const openVaultPicker = async (target: "main" | "concat" | "audio" = "main") => {
    setVaultTarget(target);
    setVaultPickerOpen(true);
    setVaultLoading(true);
    try {
      if (target === "audio") {
        const res = await api.getVaultAudios();
        const files = res?.files || (Array.isArray(res) ? res : []);
        setVaultVideos(files);
      } else {
        const res = await api.getVaultVideos();
        const files = res?.files || (Array.isArray(res) ? res : []);
        setVaultVideos(files);
      }
    } catch (err) {
      console.error("Failed to load vault assets:", err);
    } finally {
      setVaultLoading(false);
    }
  };

  const handleSelectFromVault = (asset: { filename: string; url: string }) => {
    if (vaultTarget === "audio") {
      setBgAudioUrl(asset.url);
      setBgAudioName(asset.filename);
    } else if (vaultTarget === "concat") {
      setConcatClips((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          url: asset.url,
          name: asset.filename,
        },
      ]);
    } else {
      setVideoUrl(asset.url);
      setFilename(asset.filename);
      setStartTime(0);
      setEndTime(5.0);
      setCurrentTime(0);
      setIsPlaying(false);
      setKeyframes([]);
      setSplitPoints([]);
    }
    setVaultPickerOpen(false);
  };

  const filteredVaultVideos = vaultVideos.filter((v) =>
    (v.filename || "").toLowerCase().includes(vaultSearch.toLowerCase())
  );

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
        audio_fade_in: audioFadeIn,
        audio_fade_out: audioFadeOut,
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
            onClick={() => openVaultPicker("main")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-800 hover:border-amber-500/40 bg-zinc-900/60 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 text-xs font-mono transition-all cursor-pointer"
            title="Open Video from Asset Vault"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vault</span>
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
                style={aspectRatio === "original" && naturalWidth && naturalHeight ? { aspectRatio: `${naturalWidth} / ${naturalHeight}` } : undefined}
                className={cn(
                  "relative rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-xl flex items-center justify-center transition-all duration-300 max-h-[36vh] w-auto max-w-full",
                  aspectRatio === "16:9" && "aspect-video",
                  aspectRatio === "9:16" && "aspect-[9/16]",
                  aspectRatio === "1:1" && "aspect-square",
                  aspectRatio === "4:3" && "aspect-[4/3]",
                  aspectRatio === "21:9" && "aspect-[21/9]"
                )}
              >
                <video
                  ref={videoRef}
                  src={getMediaUrl(videoUrl)}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  style={{
                    filter: getLiveCssFilter(),
                    transform: `scale(${interpKeyframe.scale}) translate(${interpKeyframe.positionX}%, ${interpKeyframe.positionY}%) rotate(${interpKeyframe.rotation}deg)`,
                    opacity: interpKeyframe.opacity,
                    transition: isPlaying ? "none" : "transform 0.15s ease-out, opacity 0.15s ease-out",
                  }}
                  className="w-full h-full object-contain cursor-pointer max-h-[36vh]"
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
                  {videoDimensionLabel && (
                    <span className="px-1.5 py-0.2 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 text-[10px]">
                      {videoDimensionLabel} ({aspectRatio === "original" ? "Native" : aspectRatio})
                    </span>
                  )}
                  {keyframes.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30 text-[10px] flex items-center gap-1 font-bold">
                      <Diamond className="w-2.5 h-2.5 fill-violet-400 text-violet-400" />
                      <span>{keyframes.length} KF</span>
                    </span>
                  )}
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
            /* Empty State / Upload Progress */
            uploadProgress !== null ? (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm w-full animate-in fade-in duration-200">
                <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-zinc-800" />
                  <div
                    className="absolute inset-0 rounded-full border-4 border-emerald-500 transition-all duration-150"
                    style={{
                      clipPath: `polygon(50% 50%, 50% 0%, ${uploadProgress >= 25 ? "100% 0%," : ""}${uploadProgress >= 50 ? "100% 100%," : ""}${uploadProgress >= 75 ? "0% 100%," : ""}${uploadProgress > 0 ? `${uploadProgress <= 25 ? 50 + 2 * uploadProgress : 100}%` : "50%"} ${uploadProgress > 50 ? (uploadProgress <= 75 ? 100 - 4 * (uploadProgress - 50) : 0) : 0}%)`
                    }}
                  />
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-mono font-extrabold text-emerald-400">{uploadProgress}%</span>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase">Uploaded</span>
                  </div>
                </div>
                <h3 className="text-sm font-heading font-bold text-white mb-1.5 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Uploading {uploadType}...</span>
                </h3>
                <p className="text-xs font-mono text-zinc-400 mb-3 text-center">
                  Decoding media stream & initializing timeline tracks...
                </p>
                <div className="w-full max-w-xs h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-200 shadow-sm shadow-emerald-500/50"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingMain(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingMain(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingMain(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingMain(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f && (f.type.startsWith("video/") || f.name.endsWith(".mp4") || f.name.endsWith(".mov") || f.name.endsWith(".webm"))) {
                    handleMainVideoUpload(f);
                  } else if (f) {
                    alert("Please drop a valid video file (MP4, MOV, WEBM).");
                  }
                }}
                className={cn(
                  "flex flex-col items-center justify-center p-8 text-center max-w-md w-full rounded-2xl border transition-all duration-200",
                  isDraggingMain
                    ? "border-2 border-dashed border-emerald-400 bg-emerald-500/15 scale-[1.02] shadow-2xl shadow-emerald-500/20"
                    : "border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700"
                )}
              >
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
                  className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-3 transition-transform cursor-pointer shadow-lg",
                    isDraggingMain
                      ? "bg-emerald-500 text-black animate-bounce"
                      : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:scale-105 shadow-emerald-500/5"
                  )}
                >
                  <Upload className="w-7 h-7" />
                </div>
                <h2 className="text-sm font-heading font-bold text-white mb-1">
                  {isDraggingMain ? "Drop Video to Open" : "Load Video into Precision Editor"}
                </h2>
                <p className="text-xs font-mono text-zinc-400 mb-5 leading-relaxed max-w-xs">
                  {isDraggingMain
                    ? "Release mouse to immediately load this video into timeline"
                    : "Drag & drop video from computer, browse local disk, or select from Asset Vault."}
                </p>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Browse File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openVaultPicker("main")}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-amber-500/50 text-amber-400 font-heading font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Select from Vault</span>
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {/* ── Right Inspector Panel (col-span-4) ── */}
        <div className="lg:col-span-4 flex flex-col bg-[#0b0b12] border-t lg:border-t-0 min-h-0 overflow-hidden">
          {/* Top Category Tabs Bar */}
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-1 p-1.5 bg-[#09090e] border-b border-zinc-800 overflow-x-auto no-scrollbar flex-shrink-0">
            {[
              { id: "trim", label: "Trim & Cut", icon: Scissors, accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
              { id: "keyframes", label: "Keyframe", icon: Diamond, accent: "text-violet-400 bg-violet-500/10 border-violet-500/30", badge: keyframes.length > 0 ? `${keyframes.length}` : "PRO" },
              { id: "speed", label: "Speed", icon: Gauge, accent: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
              { id: "aspect", label: "Aspect", icon: Crop, accent: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
              { id: "color", label: "Color", icon: Palette, accent: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
              { id: "audio", label: "Audio", icon: Volume2, accent: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
              { id: "captions", label: "AI Captions", icon: FileText, accent: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
              { id: "ai_audio", label: "AI Audio", icon: Mic, accent: "text-teal-400 bg-teal-500/10 border-teal-500/30" },
              { id: "ai_ads", label: "AI Ads", icon: Clapperboard, accent: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" },
              { id: "overlay", label: "Overlay", icon: Type, accent: "text-orange-400 bg-orange-500/10 border-orange-500/30" },
              { id: "chroma", label: "BG Remove", icon: Pipette, accent: "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30" },
              { id: "concat", label: "Merge", icon: Film, accent: "text-zinc-300 bg-zinc-800 border-zinc-700" },
              { id: "export", label: "Export", icon: Share2, accent: "text-emerald-300 bg-emerald-900/30 border-emerald-500/40" },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as EditorTab)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[9px] font-mono transition-all cursor-pointer border group",
                    isActive
                      ? "bg-zinc-800/90 border-emerald-500/50 text-white shadow-xs font-bold"
                      : "bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 hover:border-zinc-700"
                  )}
                >
                  <div className={cn(
                    "p-1 rounded-lg transition-all",
                    isActive
                      ? tab.accent
                      : "text-zinc-400 group-hover:text-zinc-200"
                  )}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate max-w-[65px]">{tab.label}</span>
                  {tab.badge && (
                    <span className="absolute top-0.5 right-0.5 text-[7px] font-extrabold px-1 py-0.2 rounded-full bg-violet-500/30 text-violet-300 border border-violet-500/40">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content Body (Scrolls Internally) */}
          <div className="p-3.5 space-y-3.5 flex-1 overflow-y-auto custom-scrollbar">
            {/* 1.5 KEYFRAME MOTION & ANIMATION TAB */}
            {activeTab === "keyframes" && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                    <Diamond className="w-3.5 h-3.5 text-violet-400 fill-violet-400/20" />
                    Keyframe Motion & Transform
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {keyframes.length} Keyframe{keyframes.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-xs font-mono text-zinc-300">
                        Playhead: <strong className="text-emerald-400">{currentTime.toFixed(2)}s</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={addOrUpdateKeyframeAtPlayhead}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-mono font-bold shadow-md shadow-violet-600/20 transition-all cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{activeOrNearestKeyframe ? "Update Keyframe" : "+ Add Keyframe"}</span>
                    </button>
                  </div>

                  {activeOrNearestKeyframe ? (
                    <div className="space-y-3 pt-2.5 border-t border-zinc-800">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-violet-400 font-bold flex items-center gap-1">
                          <Diamond className="w-3 h-3 fill-violet-400" /> Keyframe @ {activeOrNearestKeyframe.time.toFixed(2)}s
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteKeyframe(activeOrNearestKeyframe.id)}
                          className="text-zinc-500 hover:text-red-400 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>

                      {/* Scale / Zoom Slider */}
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
                          <span>Scale / Zoom</span>
                          <span className="text-white font-bold">{activeOrNearestKeyframe.scale.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.5"
                          step="0.05"
                          value={activeOrNearestKeyframe.scale}
                          onChange={(e) => updateKeyframeProperty(activeOrNearestKeyframe.id, "scale", parseFloat(e.target.value))}
                          className="w-full accent-violet-500 cursor-pointer h-1.5 bg-zinc-800 rounded"
                        />
                      </div>

                      {/* Pan X Slider */}
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
                          <span>Pan X (Horizontal)</span>
                          <span className="text-white font-bold">{activeOrNearestKeyframe.positionX > 0 ? `+${activeOrNearestKeyframe.positionX}%` : `${activeOrNearestKeyframe.positionX}%`}</span>
                        </div>
                        <input
                          type="range"
                          min="-50"
                          max="50"
                          step="1"
                          value={activeOrNearestKeyframe.positionX}
                          onChange={(e) => updateKeyframeProperty(activeOrNearestKeyframe.id, "positionX", parseInt(e.target.value))}
                          className="w-full accent-violet-500 cursor-pointer h-1.5 bg-zinc-800 rounded"
                        />
                      </div>

                      {/* Pan Y Slider */}
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
                          <span>Pan Y (Vertical)</span>
                          <span className="text-white font-bold">{activeOrNearestKeyframe.positionY > 0 ? `+${activeOrNearestKeyframe.positionY}%` : `${activeOrNearestKeyframe.positionY}%`}</span>
                        </div>
                        <input
                          type="range"
                          min="-50"
                          max="50"
                          step="1"
                          value={activeOrNearestKeyframe.positionY}
                          onChange={(e) => updateKeyframeProperty(activeOrNearestKeyframe.id, "positionY", parseInt(e.target.value))}
                          className="w-full accent-violet-500 cursor-pointer h-1.5 bg-zinc-800 rounded"
                        />
                      </div>

                      {/* Rotation Slider */}
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
                          <span>Rotation Angle</span>
                          <span className="text-white font-bold">{activeOrNearestKeyframe.rotation}°</span>
                        </div>
                        <input
                          type="range"
                          min="-45"
                          max="45"
                          step="1"
                          value={activeOrNearestKeyframe.rotation}
                          onChange={(e) => updateKeyframeProperty(activeOrNearestKeyframe.id, "rotation", parseInt(e.target.value))}
                          className="w-full accent-violet-500 cursor-pointer h-1.5 bg-zinc-800 rounded"
                        />
                      </div>

                      {/* Opacity Slider */}
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
                          <span>Opacity</span>
                          <span className="text-white font-bold">{Math.round(activeOrNearestKeyframe.opacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={activeOrNearestKeyframe.opacity}
                          onChange={(e) => updateKeyframeProperty(activeOrNearestKeyframe.id, "opacity", parseFloat(e.target.value))}
                          className="w-full accent-violet-500 cursor-pointer h-1.5 bg-zinc-800 rounded"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-zinc-950/60 border border-dashed border-zinc-800 text-center">
                      <p className="text-[11px] font-mono text-zinc-400">
                        No keyframe at playhead position ({currentTime.toFixed(2)}s). Click "+ Add Keyframe" to animate scale, position, or opacity.
                      </p>
                    </div>
                  )}
                </div>

                {/* Keyframe List Chips */}
                {keyframes.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 block">Keyframe Markers ({keyframes.length})</span>
                    <div className="flex flex-wrap gap-1.5">
                      {keyframes.slice().sort((a, b) => a.time - b.time).map((kf) => (
                        <button
                          key={kf.id}
                          type="button"
                          onClick={() => {
                            seekTo(kf.time);
                            setSelectedKeyframeId(kf.id);
                          }}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer border",
                            Math.abs(currentTime - kf.time) < 0.1
                              ? "bg-violet-500/20 text-violet-300 border-violet-500/50 shadow-xs"
                              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                          )}
                        >
                          <Diamond className="w-2.5 h-2.5 fill-violet-400 text-violet-400" />
                          <span>{kf.time.toFixed(2)}s</span>
                          <span className="text-[8px] text-zinc-500">({kf.scale.toFixed(1)}x)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingProductImg(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingProductImg(false); }}
                      onDrop={async (e) => {
                        e.preventDefault(); e.stopPropagation(); setIsDraggingProductImg(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f && f.type.startsWith("image/")) {
                          const res = await api.uploadImage(f);
                          if (res.url) setAdProductImgUrl(res.url);
                        }
                      }}
                      onClick={() => adProductImgRef.current?.click()}
                      className={cn(
                        "w-full py-2.5 rounded-xl border border-dashed text-xs font-mono flex items-center justify-center gap-2 cursor-pointer transition-all",
                        isDraggingProductImg
                          ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 scale-[1.01]"
                          : "border-zinc-700 bg-zinc-900 hover:border-emerald-500 text-zinc-300"
                      )}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isDraggingProductImg ? "Drop Image Here" : (adProductImgUrl ? "Product Photo Loaded" : "Upload / Drop Product Photo")}</span>
                    </div>
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

            {/* 8. AUDIO CONTROLS, SOUNDTRACK & AI VOICEOVER SUITE */}
            {activeTab === "audio" && (
              <div className="space-y-4">
                {/* Mode Selector: Audio Track Mix vs Music & SFX Library vs AI Voiceover Generator */}
                <div className="flex rounded-xl bg-zinc-900/90 p-1 border border-zinc-800 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setAudioModeTab("track")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer font-semibold",
                      audioModeTab === "track"
                        ? "bg-zinc-800 text-emerald-400 border border-zinc-700/60 shadow-xs"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Track Mix</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioModeTab("library")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer font-semibold",
                      audioModeTab === "library"
                        ? "bg-zinc-800 text-violet-400 border border-zinc-700/60 shadow-xs"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <Music className="w-3.5 h-3.5 text-violet-400" />
                    <span>BGM & SFX</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-violet-500/20 text-violet-300 font-bold">CC0</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioModeTab("ai_voice")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer font-semibold",
                      audioModeTab === "ai_voice"
                        ? "bg-zinc-800 text-teal-400 border border-zinc-700/60 shadow-xs"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <Mic className="w-3.5 h-3.5 text-teal-400" />
                    <span>AI Voice</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-teal-500/20 text-teal-300 font-bold">AI</span>
                  </button>
                </div>

                {/* TAB 1: AUDIO TRACK & MIX */}
                {audioModeTab === "track" && (
                  <div className="space-y-3.5 animate-in fade-in duration-150">
                    {/* Master Original Video Audio */}
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {muteOriginal ? (
                            <VolumeX className="w-4 h-4 text-rose-400" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-emerald-400" />
                          )}
                          <div>
                            <span className="text-xs font-mono font-bold text-white block">Original Video Audio</span>
                            <span className="text-[10px] font-mono text-zinc-400">
                              {muteOriginal ? "Muted during export" : `Volume: ${Math.round(originalVolume * 100)}%`}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMuteOriginal(!muteOriginal)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                            muteOriginal
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          )}
                        >
                          {muteOriginal ? "MUTED" : "ACTIVE"}
                        </button>
                      </div>

                      {!muteOriginal && (
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                            <span>Original Gain Level</span>
                            <span className="text-emerald-400">{Math.round(originalVolume * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1.5"
                            step="0.05"
                            value={originalVolume}
                            onChange={(e) => setOriginalVolume(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                          />
                        </div>
                      )}
                    </div>

                    {/* Added Soundtrack / Voiceover Track */}
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                          <Music className="w-3.5 h-3.5 text-blue-400" />
                          Added Audio / Soundtrack
                        </span>
                        {bgAudioUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setBgAudioUrl("");
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

                      {/* If track is loaded */}
                      {bgAudioUrl ? (
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
                                title={audioPreviewPlaying ? "Pause preview" : "Play preview"}
                              >
                                {audioPreviewPlaying ? (
                                  <Pause className="w-3.5 h-3.5" />
                                ) : (
                                  <Play className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <div className="min-w-0">
                                <p className="text-xs font-mono font-semibold text-blue-200 truncate" title={bgAudioName || bgAudioUrl}>
                                  {bgAudioName || "Attached Audio Track"}
                                </p>
                                <span className="text-[10px] font-mono text-blue-400/80 block">Ready to mix on timeline</span>
                              </div>
                              <audio
                                ref={audioPreviewRef}
                                src={getMediaUrl(bgAudioUrl)}
                                onEnded={() => setAudioPreviewPlaying(false)}
                                className="hidden"
                              />
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => openVaultPicker("audio")}
                                className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono transition-colors cursor-pointer"
                              >
                                Vault
                              </button>
                              <button
                                type="button"
                                onClick={() => bgAudioInputRef.current?.click()}
                                className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono transition-colors cursor-pointer"
                              >
                                Upload
                              </button>
                            </div>
                          </div>

                          {/* Added Track Volume Slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                              <span>Soundtrack Volume Gain</span>
                              <span className="text-blue-400">{Math.round(bgAudioVolume * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="1.5"
                              step="0.05"
                              value={bgAudioVolume}
                              onChange={(e) => setBgAudioVolume(parseFloat(e.target.value))}
                              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
                            />
                          </div>

                          {/* Audio Fade In & Fade Out Sliders */}
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                                <span>Fade In</span>
                                <span className="text-blue-400">{audioFadeIn}s</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="5.0"
                                step="0.5"
                                value={audioFadeIn}
                                onChange={(e) => setAudioFadeIn(parseFloat(e.target.value))}
                                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                                <span>Fade Out</span>
                                <span className="text-blue-400">{audioFadeOut}s</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="5.0"
                                step="0.5"
                                value={audioFadeOut}
                                onChange={(e) => setAudioFadeOut(parseFloat(e.target.value))}
                                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* No track loaded: show upload from PC and vault picker */
                        <div className="space-y-2">
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
                          <div
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingBgAudio(true); }}
                            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingBgAudio(false); }}
                            onDrop={(e) => {
                              e.preventDefault(); e.stopPropagation(); setIsDraggingBgAudio(false);
                              const f = e.dataTransfer.files?.[0];
                              if (f && (f.type.startsWith("audio/") || f.name.endsWith(".mp3") || f.name.endsWith(".wav") || f.name.endsWith(".m4a") || f.name.endsWith(".aac"))) {
                                handleBgAudioUpload(f);
                              } else if (f) {
                                alert("Please drop a valid audio file (MP3, WAV, M4A, AAC).");
                              }
                            }}
                            onClick={() => bgAudioInputRef.current?.click()}
                            className={cn(
                              "w-full flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-xl border border-dashed text-xs font-mono transition-all cursor-pointer",
                              isDraggingBgAudio
                                ? "border-blue-400 bg-blue-500/20 text-blue-300 scale-[1.01]"
                                : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-300"
                            )}
                          >
                            <Upload className="w-5 h-5 text-blue-400" />
                            <span className="font-semibold text-white">
                              {isDraggingBgAudio ? "Drop Audio Track Here" : "Upload Audio from PC (MP3, WAV, AAC)"}
                            </span>
                            <span className="text-[10px] text-zinc-500">Drag & drop or click to browse local files</span>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() => openVaultPicker("audio")}
                              className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
                            >
                              <FolderOpen className="w-3 h-3 text-amber-400" />
                              <span>Vault</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setAudioLibraryModalOpen(true)}
                              className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-violet-950/30 hover:bg-violet-900/40 border border-violet-500/30 text-[11px] font-mono text-violet-300 hover:text-violet-200 transition-colors cursor-pointer"
                            >
                              <Music className="w-3 h-3 text-violet-400" />
                              <span>BGM Suite</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setAudioModeTab("ai_voice")}
                              className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-teal-950/30 hover:bg-teal-900/40 border border-teal-500/30 text-[11px] font-mono text-teal-300 hover:text-teal-200 transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3 text-teal-400" />
                              <span>AI Voice</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: BUILT-IN MUSIC & SFX LIBRARY */}
                {audioModeTab === "library" && (
                  <div className="space-y-3.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                          <Music className="w-3.5 h-3.5 text-violet-400" />
                          Royalty-Free Audio Library
                        </span>
                        <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                          Studio-grade cinematic scores, cyberpunk tracks & Foley sound effects
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAudioLibraryModalOpen(true)}
                        className="px-2.5 py-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-mono font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Open Full Suite</span>
                      </button>
                    </div>

                    {/* Quick-Pick Audio Tracks Stream */}
                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                      {CURATED_AUDIO_LIBRARY.slice(0, 8).map((track) => {
                        const isAttached = bgAudioUrl === track.url;
                        const isPreviewing = previewingTrackId === track.id;

                        return (
                          <div
                            key={track.id}
                            className={cn(
                              "p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5",
                              isAttached
                                ? "bg-violet-500/10 border-violet-500/40 ring-1 ring-violet-500/20"
                                : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (previewingTrackId === track.id) {
                                    if (libraryAudioPreviewRef.current) libraryAudioPreviewRef.current.pause();
                                    setPreviewingTrackId(null);
                                  } else {
                                    setPreviewingTrackId(track.id);
                                    if (libraryAudioPreviewRef.current) {
                                      libraryAudioPreviewRef.current.src = track.url;
                                      libraryAudioPreviewRef.current.play().catch(() => {});
                                    }
                                  }
                                }}
                                className={cn(
                                  "w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0",
                                  isPreviewing
                                    ? "bg-violet-600 text-white animate-pulse"
                                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                                )}
                              >
                                {isPreviewing ? (
                                  <Pause className="w-3 h-3 fill-current" />
                                ) : (
                                  <Play className="w-3 h-3 fill-current ml-0.5" />
                                )}
                              </button>

                              <div className="min-w-0">
                                <p className="text-xs font-mono font-bold text-white truncate">
                                  {track.title}
                                </p>
                                <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-400">
                                  <span className="text-violet-400">{track.genre}</span>
                                  <span>•</span>
                                  <span>{track.duration}</span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setBgAudioUrl(track.url);
                                setBgAudioName(track.title);
                                setBgAudioVolume(0.85);
                                setAudioModeTab("track");
                              }}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1",
                                isAttached
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                  : "bg-zinc-800 hover:bg-violet-600 text-zinc-300 hover:text-white"
                              )}
                            >
                              {isAttached ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Active</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>Use Track</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <audio
                      ref={libraryAudioPreviewRef}
                      onEnded={() => setPreviewingTrackId(null)}
                      className="hidden"
                    />

                    <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                      <span>Need more tracks or Foley SFX?</span>
                      <button
                        type="button"
                        onClick={() => setAudioLibraryModalOpen(true)}
                        className="text-violet-400 hover:text-violet-300 font-bold underline cursor-pointer"
                      >
                        Browse All 100+ Sounds →
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: AI VOICEOVER GENERATOR */}
                {audioModeTab === "ai_voice" && (
                  <div className="space-y-3.5 animate-in fade-in duration-150">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                          <Mic className="w-3.5 h-3.5 text-teal-400" />
                          AI Voiceover & Dialogue Engine
                        </span>
                        <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                          Synthesize realistic speech with multiple neural models & attach directly to video
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-mono">
                        {aiVoiceProvider === "edge" ? "FREE ACTIVE" : "PRO ENGINE"}
                      </span>
                    </div>

                    {/* Script Prompt Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                        <span>Voiceover Script / Dialogue</span>
                        <div className="flex items-center gap-2">
                          <span>{aiVoiceScript.length} chars</span>
                          <span className="text-teal-400">
                            ~{Math.max(1, Math.round(aiVoiceScript.split(/\s+/).filter(Boolean).length / 2.5))}s duration
                          </span>
                        </div>
                      </div>
                      <textarea
                        rows={3}
                        value={aiVoiceScript}
                        onChange={(e) => setAiVoiceScript(e.target.value)}
                        placeholder="Type narration or dialogue script... (e.g. 'In the heart of the neon city, memories are the only currency that matters.')"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-hidden focus:border-teal-500 transition-colors"
                      />

                      {/* Quick starter script chips */}
                      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-0.5">
                        {[
                          { label: "Cinematic", text: "In a world sculpted by shadows, one final spark will ignite the revolution." },
                          { label: "Product Ad", text: "Engineered for pure precision. Designed to transcend the ordinary." },
                          { label: "Viral Hook", text: "Wait until you see what happens next. This completely changed everything." },
                          { label: "Documentary", text: "Centuries of untouched history, preserved in absolute silence beneath the surface." }
                        ].map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => setAiVoiceScript(chip.text)}
                            className="px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-teal-500/40 text-[10px] font-mono text-zinc-400 hover:text-teal-300 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            + {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Provider Selection */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase">1. Select AI Engine / Provider</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "edge", label: "Edge Neural", sub: "100% Free", icon: Zap, color: "text-emerald-400" },
                          { id: "elevenlabs", label: "ElevenLabs", sub: "Pro Expressive", icon: Sparkles, color: "text-amber-400" },
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
                                ? "bg-zinc-850 border-teal-500/60 ring-1 ring-teal-500/30"
                                : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
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

                    {/* Model & Voice Configuration */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Model Selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-zinc-400 uppercase">2. AI Model</label>
                        <select
                          value={aiVoiceModel}
                          onChange={(e) => setAiVoiceModel(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white focus:outline-hidden focus:border-teal-500"
                        >
                          {aiVoiceProvider === "edge" && (
                            <>
                              <option value="seed_audio">Seed Audio 1.0 (HD Neural)</option>
                              <option value="minimax">MiniMax Speech 2.8 HD</option>
                              <option value="qwen_audio">Qwen Audio 3.0</option>
                              <option value="edge_standard">Edge Neural Standard</option>
                            </>
                          )}
                          {aiVoiceProvider === "elevenlabs" && (
                            <>
                              <option value="eleven_v3">Eleven v3 Multilingual</option>
                              <option value="eleven_turbo">Eleven Turbo v2.5 (Fast)</option>
                              <option value="eleven_multilingual_v2">Eleven Multilingual v2</option>
                            </>
                          )}
                          {aiVoiceProvider === "openai" && (
                            <>
                              <option value="tts-1-hd">TTS-1-HD (Studio High Definition)</option>
                              <option value="tts-1">TTS-1 (Standard Fast)</option>
                            </>
                          )}
                        </select>
                      </div>

                      {/* Voice Persona Selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-zinc-400 uppercase">3. Voice Persona</label>
                        <select
                          value={aiVoiceId}
                          onChange={(e) => setAiVoiceId(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white focus:outline-hidden focus:border-teal-500"
                        >
                          {aiVoiceProvider === "edge" && (
                            <>
                              <option value="en-US-GuyNeural">Guy (Male - Deep & Narrative)</option>
                              <option value="en-US-JennyNeural">Jenny (Female - Expressive & Warm)</option>
                              <option value="en-US-ChristopherNeural">Christopher (Male - Authoritative)</option>
                              <option value="en-US-AriaNeural">Aria (Female - Crisp Professional)</option>
                              <option value="en-GB-SoniaNeural">Sonia (British Female - Elegant)</option>
                              <option value="en-GB-RyanNeural">Ryan (British Male - Dynamic)</option>
                              <option value="hi-IN-MadhurNeural">Madhur (Hindi Male - Studio)</option>
                              <option value="hi-IN-SwaraNeural">Swara (Hindi Female - Clear)</option>
                            </>
                          )}
                          {aiVoiceProvider === "elevenlabs" && (
                            <>
                              <option value="pNInz6obpgDQGcFmaJgB">Adam (Deep Cinema & Narrative)</option>
                              <option value="21m00Tcm4TlvDq8ikWAM">Rachel (Calm Professional)</option>
                              <option value="ErXwobaYiN019PkySvjV">Antoni (Smooth Storyteller)</option>
                              <option value="EXAVITQu4vr4xnSDxMaL">Bella (Soft & Intimate)</option>
                              <option value="TxGEqnHWrfWFTfGW9XjX">Josh (Young & Energetic)</option>
                            </>
                          )}
                          {aiVoiceProvider === "openai" && (
                            <>
                              <option value="alloy">Alloy (Balanced & Neutral)</option>
                              <option value="echo">Echo (Warm & Dynamic)</option>
                              <option value="fable">Fable (British & Expressive)</option>
                              <option value="onyx">Onyx (Deep Cinema)</option>
                              <option value="nova">Nova (Bright & Energetic)</option>
                              <option value="shimmer">Shimmer (Gentle & Smooth)</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Pacing Speed & Auto-mute option */}
                    <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-400">Pacing:</span>
                        {[0.8, 1.0, 1.25].map((spd) => (
                          <button
                            key={spd}
                            type="button"
                            onClick={() => setAiVoiceSpeed(spd)}
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer",
                              aiVoiceSpeed === spd ? "bg-teal-500/20 text-teal-300 border border-teal-500/40" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                            )}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>

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

                    {/* Generate Voice Button */}
                    <button
                      type="button"
                      onClick={handleGenerateAiVoice}
                      disabled={isGeneratingAiVoice || !aiVoiceScript.trim()}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-md",
                        isGeneratingAiVoice || !aiVoiceScript.trim()
                          ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                          : "bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-400 hover:to-emerald-500 text-black shadow-teal-500/20 active:scale-[0.99]"
                      )}
                    >
                      {isGeneratingAiVoice ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Synthesizing Neural Voiceover...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Generate Voice with AI ({aiVoiceProvider.toUpperCase()})</span>
                        </>
                      )}
                    </button>

                    {/* Generated Voiceover Result Card */}
                    {generatedVoiceUrl && (
                      <div className="p-3 rounded-xl bg-teal-950/30 border border-teal-500/40 space-y-2.5 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-teal-400" />
                            <span className="text-xs font-mono font-bold text-white">Voiceover Audio Generated</span>
                          </div>
                          <span className="text-[10px] font-mono text-teal-400 px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20">
                            Ready to Attach
                          </span>
                        </div>

                        {/* Inline Audio Preview Player */}
                        <div className="flex items-center gap-2 bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                          <audio
                            controls
                            src={getMediaUrl(generatedVoiceUrl)}
                            className="w-full h-8 accent-teal-400"
                          />
                        </div>

                        {/* Attach to Video Track CTA */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleAttachGeneratedVoice}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-mono font-bold text-xs transition-all cursor-pointer shadow-md active:scale-95"
                          >
                            <Music className="w-3.5 h-3.5" />
                            <span>1-Click Attach to Video Track</span>
                          </button>
                          <a
                            href={getMediaUrl(generatedVoiceUrl)}
                            download={generatedVoiceName || "voiceover.mp3"}
                            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                            title="Download MP3"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingWatermark(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingWatermark(false); }}
                  onDrop={(e) => {
                    e.preventDefault(); e.stopPropagation(); setIsDraggingWatermark(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f && f.type.startsWith("image/")) {
                      handleWatermarkUpload(f);
                    } else if (f) {
                      alert("Please drop a valid image file (PNG, JPG, SVG, WebP).");
                    }
                  }}
                  onClick={() => watermarkInputRef.current?.click()}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-mono transition-all cursor-pointer",
                    isDraggingWatermark
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 scale-[1.01]"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-300"
                  )}
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isDraggingWatermark ? "Drop Logo Here" : (watermarkUrl ? "Replace Logo Watermark" : "Upload / Drop Logo (PNG, SVG)")}</span>
                </div>
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
                    Multi-Video Concat
                  </span>
                  <div className="flex items-center gap-1.5">
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
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-mono cursor-pointer transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Upload</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openVaultPicker("concat")}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-[11px] font-mono border border-zinc-700 cursor-pointer transition-all"
                    >
                      <FolderOpen className="w-3 h-3" />
                      <span>Vault</span>
                    </button>
                  </div>
                </div>

                {/* Drag and Drop Zone for Concat Clips */}
                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingConcat(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingConcat(false); }}
                  onDrop={(e) => {
                    e.preventDefault(); e.stopPropagation(); setIsDraggingConcat(false);
                    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("video/"));
                    for (const f of files) {
                      handleConcatAdd(f);
                    }
                  }}
                  onClick={() => concatInputRef.current?.click()}
                  className={cn(
                    "p-2.5 rounded-xl border border-dashed text-center transition-all cursor-pointer",
                    isDraggingConcat
                      ? "border-emerald-400 bg-emerald-500/20 scale-[1.01]"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                  )}
                >
                  <p className="text-[11px] font-mono text-zinc-400">
                    {isDraggingConcat ? "Drop video clips to append" : "Drag & drop video clips here, or choose from Vault"}
                  </p>
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
      <div className="flex-shrink-0 bg-[#09090f] border-t border-zinc-800 p-2 sm:p-2.5 space-y-2 z-10 select-none">
        {/* Timeline Control Bar */}
        <div className="flex items-center justify-between px-1 text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all cursor-pointer shadow-sm active:scale-95"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>
            <button
              type="button"
              onClick={() => seekTo(0)}
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Jump to Start"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => stepFrame(-1)}
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Step -1 Frame"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => stepFrame(1)}
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Step +1 Frame"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={splitAtPlayhead}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer text-[11px]"
              title="Split video at current playhead"
            >
              <Scissors className="w-3 h-3 text-emerald-400" />
              <span>Split</span>
            </button>
            <button
              type="button"
              onClick={addOrUpdateKeyframeAtPlayhead}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-violet-500/30 bg-violet-950/40 hover:bg-violet-900/50 text-violet-300 hover:text-white transition-all cursor-pointer text-[11px] shadow-xs"
              title="Add Keyframe at Playhead"
            >
              <Diamond className="w-3 h-3 fill-violet-400 text-violet-400" />
              <span>+ Keyframe</span>
            </button>
          </div>

          {/* Timecode & Range */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="px-2.5 py-0.5 rounded-lg bg-black/60 border border-zinc-800 text-zinc-200">
              <span className="text-emerald-400 font-bold">{formatTime(currentTime)}</span>
              <span className="text-zinc-600 mx-1">/</span>
              <span className="text-zinc-400">{formatTime(duration)}</span>
            </div>
            <span className="hidden md:inline text-[10px] text-zinc-500">
              Range: {startTime.toFixed(2)}s - {endTime.toFixed(2)}s ({((endTime - startTime) / speed).toFixed(2)}s)
            </span>
          </div>

          {/* Zoom Slider */}
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono">
            <ZoomOut className="w-3 h-3" />
            <input
              type="range"
              min="1"
              max="4"
              step="0.5"
              value={timelineZoom}
              onChange={(e) => setTimelineZoom(parseFloat(e.target.value))}
              className="w-16 accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded"
            />
            <ZoomIn className="w-3 h-3" />
          </div>
        </div>

        {/* Multi-Track Timeline Canvas with Track Headers */}
        <div className="flex rounded-xl border border-zinc-800 bg-[#06060a] overflow-hidden">
          {/* Left Track Headers Column */}
          <div className="w-24 sm:w-28 flex-shrink-0 bg-zinc-950/90 border-r border-zinc-800 flex flex-col text-[9px] font-mono text-zinc-400 select-none">
            {/* Ruler Header */}
            <div className="h-5 px-2 border-b border-zinc-800/80 flex items-center gap-1 bg-zinc-900/60 text-zinc-500 font-bold">
              <Clock className="w-2.5 h-2.5" />
              <span>TIME</span>
            </div>
            {/* V1 Video Header */}
            <div className="h-9 px-2 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/30">
              <div className="flex items-center gap-1 text-emerald-400 font-bold truncate">
                <Film className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>V1 Video</span>
              </div>
              {keyframes.length > 0 && (
                <span className="text-[8px] font-bold text-violet-400 bg-violet-500/15 px-1 rounded">
                  {keyframes.length}◆
                </span>
              )}
            </div>
            {/* A1 Audio Header */}
            <div className="h-7 px-2 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/20 group/a1 relative">
              <div className="flex items-center gap-1 text-cyan-400 font-bold truncate">
                <Music className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>A1 Audio</span>
                <span
                  className="text-[9px] font-mono text-zinc-500 hover:text-cyan-400 cursor-help px-1 rounded bg-zinc-800/60"
                  title="A1 = Master Audio Track. Visualizes soundtrack waveform, controls video volume levels (0-100%), 1-click mute/unmute, and background music (BGM) mixing."
                >
                  INFO
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[8px] font-mono text-zinc-400">
                  {muteOriginal ? "MUTED" : `${Math.round(originalVolume * 100)}%`}
                </span>
                <button
                  type="button"
                  onClick={() => setMuteOriginal(!muteOriginal)}
                  className="text-zinc-500 hover:text-white"
                  title={muteOriginal ? "Unmute Master Audio" : "Mute Master Audio"}
                >
                  {muteOriginal ? <VolumeX className="w-2.5 h-2.5 text-red-400" /> : <Volume2 className="w-2.5 h-2.5" />}
                </button>
              </div>
            </div>
            {/* T1 Subtitles / Overlay Header */}
            <div className="h-7 px-2 flex items-center gap-1 text-amber-400 font-bold bg-zinc-900/10 truncate">
              <Type className="w-3 h-3 text-amber-400 shrink-0" />
              <span>T1 Text</span>
            </div>
          </div>

          {/* Right Tracks Scrubber Canvas */}
          <div
            ref={timelineContainerRef}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = Math.max(0, e.clientX - rect.left);
              const targetTime = (clickX / rect.width) * duration;
              seekTo(targetTime);
            }}
            className="relative flex-1 h-28 bg-[#040407] overflow-hidden cursor-pointer select-none"
          >
            {/* Track 0: Time Ruler */}
            <div className="absolute top-0 left-0 right-0 h-5 bg-zinc-900/90 border-b border-zinc-800 flex items-center px-2 text-[8px] font-mono text-zinc-400 pointer-events-none justify-between">
              <span>0.00s</span>
              <span>{(duration * 0.2).toFixed(1)}s</span>
              <span>{(duration * 0.4).toFixed(1)}s</span>
              <span>{(duration * 0.6).toFixed(1)}s</span>
              <span>{(duration * 0.8).toFixed(1)}s</span>
              <span>{duration.toFixed(1)}s</span>
            </div>

            {/* Track 1: Video Track with Filmstrip & Keyframe Diamonds */}
            <div className="absolute top-5 left-0 right-0 h-9 px-1 py-0.5 flex items-center border-b border-zinc-800/60">
              <div className="relative w-full h-full bg-zinc-900/80 rounded border border-zinc-800 overflow-hidden flex items-center">
                {/* Visual Filmstrip Pattern */}
                <div className="absolute inset-0 flex opacity-20 pointer-events-none">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="flex-1 border-r border-zinc-700/60 h-full flex items-center justify-center text-[7px] text-zinc-600 font-mono">
                      #{i + 1}
                    </div>
                  ))}
                </div>

                {/* Active In/Out Trim Range Highlight */}
                <div
                  className="absolute top-0 bottom-0 bg-emerald-500/20 border-x-2 border-emerald-400 pointer-events-none flex items-center justify-between"
                  style={{
                    left: `${(startTime / duration) * 100}%`,
                    width: `${((endTime - startTime) / duration) * 100}%`,
                  }}
                >
                  <span className="text-[7px] font-mono text-emerald-300 pl-1 font-bold">IN</span>
                  <span className="text-[7px] font-mono text-emerald-300 pr-1 font-bold">OUT</span>
                </div>

                {/* Split Cuts Markers */}
                {splitPoints.map((sp, idx) => (
                  <div
                    key={idx}
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-sm shadow-amber-400/50 z-20 pointer-events-none"
                    style={{ left: `${(sp / duration) * 100}%` }}
                  >
                    <div className="w-1.5 h-1.5 -ml-0.5 bg-amber-400 rounded-full" />
                  </div>
                ))}

                {/* Keyframe Markers (Diamond Pins) */}
                {keyframes.map((kf) => (
                  <div
                    key={kf.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      seekTo(kf.time);
                      setSelectedKeyframeId(kf.id);
                      setActiveTab("keyframes");
                    }}
                    className="absolute top-1 bottom-1 z-30 flex items-center justify-center -translate-x-1/2 cursor-pointer group"
                    style={{ left: `${(kf.time / duration) * 100}%` }}
                    title={`Keyframe at ${kf.time.toFixed(2)}s (Scale: ${kf.scale}x)`}
                  >
                    <div className={cn(
                      "w-3 h-3 rotate-45 border transition-transform group-hover:scale-125",
                      selectedKeyframeId === kf.id || Math.abs(currentTime - kf.time) < 0.1
                        ? "bg-violet-400 border-white shadow-md shadow-violet-500/50 scale-110"
                        : "bg-violet-600 border-violet-300/80"
                    )} />
                  </div>
                ))}

                <span className="text-[8px] font-mono text-zinc-300 pl-2 pointer-events-none truncate z-10">
                  {filename} {keyframes.length > 0 ? `• ${keyframes.length} Keyframe${keyframes.length === 1 ? "" : "s"}` : ""}
                </span>
              </div>
            </div>

            {/* Track 2: Audio Track with Waveform Visualizer */}
            <div className="absolute top-14 left-0 right-0 h-7 px-1 py-0.5 flex items-center border-b border-zinc-800/60">
              <div className="relative w-full h-full bg-zinc-950 rounded border border-zinc-800/80 overflow-hidden flex items-center px-1">
                {/* Simulated Audio Waveform Bars */}
                <div className="absolute inset-0 flex items-center justify-between px-2 gap-0.5 opacity-60 pointer-events-none">
                  {Array.from({ length: 48 }).map((_, i) => {
                    const hPercent = 20 + Math.abs(Math.sin(i * 0.45 + 0.2)) * 65;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 rounded-full transition-all",
                          muteOriginal ? "bg-zinc-700" : "bg-gradient-to-t from-cyan-600 to-teal-400"
                        )}
                        style={{ height: `${muteOriginal ? 10 : hPercent}%` }}
                      />
                    );
                  })}
                </div>
                <span className="text-[8px] font-mono text-cyan-300/90 z-10 pointer-events-none truncate pl-1">
                  AUDIO: {muteOriginal ? "MUTED" : `${Math.round(originalVolume * 100)}% VOL`} {bgAudioUrl ? "+ BGM TRACK" : ""}
                </span>
              </div>
            </div>

            {/* Track 3: Subtitles / Captions Track */}
            <div className="absolute top-21 left-0 right-0 h-7 px-1 py-0.5 flex items-center">
              <div className="relative w-full h-full bg-zinc-950 rounded border border-zinc-800/80 overflow-hidden flex items-center">
                {captions.map((c, i) => (
                  <div
                    key={i}
                    className="absolute top-0.5 bottom-0.5 bg-amber-500/25 border border-amber-500/40 rounded px-1.5 overflow-hidden truncate text-[7px] font-mono text-amber-300 pointer-events-none flex items-center"
                    style={{
                      left: `${(c.start / duration) * 100}%`,
                      width: `${Math.max(2, ((c.end - c.start) / duration) * 100)}%`,
                    }}
                  >
                    {c.text}
                  </div>
                ))}
                {captions.length === 0 && textOverlay && (
                  <div className="absolute top-0.5 bottom-0.5 left-0 right-0 bg-orange-500/20 border border-orange-500/40 rounded px-1.5 text-[7px] font-mono text-orange-300 flex items-center truncate">
                    OVERLAY: {textOverlay}
                  </div>
                )}
                {captions.length === 0 && !textOverlay && (
                  <span className="text-[8px] font-mono text-zinc-600 pl-2 pointer-events-none">
                    NO CAPTIONS / OVERLAYS (Select "AI Captions" tab)
                  </span>
                )}
              </div>
            </div>

            {/* Scrubber Playhead Laser & Tag */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-40 pointer-events-none flex flex-col items-center shadow-lg shadow-red-500/50"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            >
              <div className="w-3 h-2.5 -mt-0.5 bg-red-500 rounded-b-sm flex items-center justify-center shadow-md shadow-red-500/80">
                <div className="w-1 h-1 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Vault Video Picker Modal */}
      {vaultPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-3xl bg-[#0d0d16] border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-xs">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-heading font-bold text-white flex items-center gap-2">
                    Select from Asset Vault
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {vaultTarget === "concat" ? "Concat Track" : vaultTarget === "audio" ? "Audio Track" : "Master Track"}
                    </span>
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-400">
                    {vaultTarget === "concat"
                      ? "Pick a video clip from your vault to append into the merge sequence"
                      : vaultTarget === "audio"
                      ? "Choose any soundtrack or generated AI voiceover from your vault"
                      : "Choose any generated or saved video to load directly into the precision timeline"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVaultPickerOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="py-3 flex-shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder={vaultTarget === "audio" ? "Search vault audios by name..." : "Search vault videos by name..."}
                  value={vaultSearch}
                  onChange={(e) => setVaultSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Video & Audio Cards Grid */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-1">
              {vaultLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2.5 text-zinc-400 text-xs font-mono">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <span>{vaultTarget === "audio" ? "Scanning Asset Vault for audio files..." : "Scanning Asset Vault for video files..."}</span>
                </div>
              ) : filteredVaultVideos.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-center text-zinc-500 text-xs font-mono">
                  {vaultTarget === "audio" ? <Music className="w-10 h-10 text-zinc-700 mb-1" /> : <Film className="w-10 h-10 text-zinc-700 mb-1" />}
                  <p className="font-semibold text-zinc-400">
                    {vaultTarget === "audio" ? "No matching audio tracks found in vault" : "No matching video assets found"}
                  </p>
                  <p className="text-[10px] text-zinc-600 max-w-xs">
                    {vaultTarget === "audio" ? "Upload an audio file from PC or generate one with AI Voiceover Studio." : "Try another search term or upload a video file directly from your device."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredVaultVideos.map((item) => (
                    <div
                      key={item.filename}
                      onClick={() => handleSelectFromVault(item)}
                      className="group cursor-pointer rounded-xl border border-zinc-800 hover:border-emerald-500/60 bg-zinc-900/50 hover:bg-zinc-850 p-2.5 transition-all flex flex-col gap-2 hover:shadow-xl hover:shadow-emerald-500/5"
                    >
                      {vaultTarget === "audio" ? (
                        <div className="aspect-video bg-gradient-to-br from-zinc-950 via-zinc-900 to-blue-950/40 rounded-lg overflow-hidden relative flex flex-col items-center justify-center p-3 border border-zinc-800/80 group-hover:border-blue-500/40 transition-colors">
                          <Music className="w-8 h-8 text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
                          <div className="flex items-center gap-0.5 opacity-60 w-3/4 justify-center">
                            {Array.from({ length: 16 }).map((_, i) => (
                              <div
                                key={i}
                                className="w-1 bg-blue-400 rounded-full"
                                style={{ height: `${8 + Math.abs(Math.sin(i * 0.6)) * 18}px` }}
                              />
                            ))}
                          </div>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-mono font-bold shadow-md active:scale-95 transition-transform">
                              Select Audio Track
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-video bg-black rounded-lg overflow-hidden relative flex items-center justify-center border border-zinc-800/80 group-hover:border-emerald-500/40 transition-colors">
                          <video
                            src={getMediaUrl(item.url)}
                            className="w-full h-full object-cover"
                            preload="metadata"
                            muted
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-mono font-bold shadow-md active:scale-95 transition-transform">
                              {vaultTarget === "concat" ? "+ Append Clip" : "Load into Timeline"}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-zinc-200 truncate font-semibold group-hover:text-emerald-300 transition-colors" title={item.filename}>
                          {item.filename}
                        </p>
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mt-0.5">
                          <span>{item.size_mb ? `${item.size_mb} MB` : (item.size_bytes ? `${Math.round(item.size_bytes / 1024)} KB` : (vaultTarget === "audio" ? "Audio Track" : "Video"))}</span>
                          <span className="text-emerald-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">1-Click Load →</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-400 flex-shrink-0">
              <span>{filteredVaultVideos.length} vault {filteredVaultVideos.length === 1 ? "video" : "videos"} available</span>
              <button
                type="button"
                onClick={() => setVaultPickerOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio & Music Production Library Modal */}
      <AudioMusicLibraryModal
        isOpen={audioLibraryModalOpen}
        onClose={() => setAudioLibraryModalOpen(false)}
        onSelectTrack={(t) => {
          setBgAudioUrl(t.url);
          setBgAudioName(t.title);
          setBgAudioVolume(t.volume);
          setAudioModeTab("track");
        }}
      />
    </div>
  );
}
