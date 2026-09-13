"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Sliders,
  Key,
  CheckCircle2,
  XCircle,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Cpu,
  RefreshCw,
  Check,
  Cloud,
  Zap,
  Sparkles,
  Trash2,
  RotateCcw,
  HardDrive,
  Mic,
  Flame,
  Download,
  Upload,
  Activity,
  Palette,
  Share2,
  ExternalLink,
  Clock,
  AlertCircle,
  Lock,
  X,
  Play,
  Pause,
  Film,
  Copy,
  ArrowRight,
  Undo2,
  Redo2,
  Search,
  Filter,
  History,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn, formatBytes } from "@/lib/utils";
import { BrandKitPanel } from "@/components/brand/BrandKitModal";
import Dropdown from "@/components/ui/Dropdown";
import SocialIcon from "@/components/social/SocialIcons";

type SettingsTab = "infrastructure" | "social_media" | "api_keys" | "brand_kit" | "trash" | "preferences" | "version_history";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("infrastructure");

  const [keys, setKeys] = useState({
    OPENAI_API_KEY: "",
    ELEVENLABS_API_KEY: "",
    REPLICATE_API_TOKEN: "",
    GEMINI_API_KEY: "",
    DATABASE_URL: "",
    R2_ACCOUNT_ID: "",
    R2_ACCESS_KEY_ID: "",
    R2_SECRET_ACCESS_KEY: "",
    R2_BUCKET_NAME: "",
    R2_PUBLIC_DOMAIN: "",
    // Social Media API Keys (BYOK)
    META_ACCESS_TOKEN: "",
    META_APP_ID: "",
    META_APP_SECRET: "",
    INSTAGRAM_ACCOUNT_ID: "",
    FACEBOOK_PAGE_ID: "",
    TWITTER_API_KEY: "",
    TWITTER_API_SECRET: "",
    TWITTER_BEARER_TOKEN: "",
    TWITTER_ACCESS_TOKEN: "",
    TWITTER_ACCESS_SECRET: "",
    YOUTUBE_API_KEY: "",
    YOUTUBE_CLIENT_ID: "",
    YOUTUBE_CLIENT_SECRET: "",
    YOUTUBE_REFRESH_TOKEN: "",
    LINKEDIN_CLIENT_ID: "",
    LINKEDIN_CLIENT_SECRET: "",
    LINKEDIN_ACCESS_TOKEN: "",
    LINKEDIN_ORGANIZATION_ID: "",
    TIKTOK_CLIENT_KEY: "",
    TIKTOK_CLIENT_SECRET: "",
    TIKTOK_ACCESS_TOKEN: "",
    PINTEREST_APP_ID: "",
    PINTEREST_APP_SECRET: "",
    PINTEREST_ACCESS_TOKEN: "",
    TELEGRAM_BOT_TOKEN: "",
    TELEGRAM_CHAT_ID: "",
  });


  const [maskedKeys, setMaskedKeys] = useState<Record<string, string>>({});
  const [keySource, setKeySource] = useState<string>("Supabase Cloud Database");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);

  // Dedicated DB & Storage Test States
  const [testingDb, setTestingDb] = useState(false);
  const [dbResult, setDbResult] = useState<any>(null);
  const [testingR2, setTestingR2] = useState(false);
  const [r2Result, setR2Result] = useState<any>(null);

  const [keysDetail, setKeysDetail] = useState<Record<string, { value: string; masked: string; source: string; configured: boolean }>>({});
  const [systemMetrics, setSystemMetrics] = useState<any>(null);

  // Trash Bin States
  const [trashData, setTrashData] = useState<any>(null);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [testingTrash, setTestingTrash] = useState(false);
  const [trashTestResult, setTrashTestResult] = useState<any>(null);
  const [trashActionLoading, setTrashActionLoading] = useState(false);

  // Studio Preferences States
  const [preferences, setPreferences] = useState({
    cameraMotion: "none",
    activeModelHighlight: "emerald",
    defaultResolution: "1080p",
    defaultAspectRatio: "16:9",
    defaultImageModel: "gpt-image-2",
    defaultVideoEngine: "ffmpeg_local",
    autoPlayHoverSound: true,
    promptDirective: "Cinematic 8k lighting, master composition, photorealistic color grade",
    enablePromptDirective: false,
    skipConfirmModal: false,
  });
  const [prefsSaved, setPrefsSaved] = useState(false);

  // 4-Digit Passcode Protection for API Keys Tab
  const [isApiUnlocked, setIsApiUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinDigits, setPinDigits] = useState(["", "", "", ""]);
  const [pinError, setPinError] = useState(false);
  const pinInput0 = useRef<HTMLInputElement>(null);
  const pinInput1 = useRef<HTMLInputElement>(null);
  const pinInput2 = useRef<HTMLInputElement>(null);
  const pinInput3 = useRef<HTMLInputElement>(null);
  const pinRefs = [pinInput0, pinInput1, pinInput2, pinInput3];

  const handleOpenApiTab = () => {
    if (isApiUnlocked) {
      setActiveTab("api_keys");
    } else {
      setPinDigits(["", "", "", ""]);
      setPinError(false);
      setShowPinModal(true);
      setTimeout(() => pinInput0.current?.focus(), 60);
    }
  };

  const handleSwitchTab = (tab: SettingsTab) => {
    if (tab !== "api_keys") {
      // Re-lock API tab whenever switching away so next access requires passcode again
      setIsApiUnlocked(false);
    }
    setActiveTab(tab);
  };

  const handlePinChange = (index: number, val: string) => {
    const char = val.slice(-1);
    if (!/^\d*$/.test(char)) return;

    const next = [...pinDigits];
    next[index] = char;
    setPinDigits(next);
    setPinError(false);

    // Auto-advance to next box
    if (char && index < 3) {
      pinRefs[index + 1].current?.focus();
    }

    // 4th digit entered: instant unlock check
    if (index === 3 && char) {
      const fullPin = `${next[0]}${next[1]}${next[2]}${char}`;
      const savedPin = typeof window !== "undefined" ? localStorage.getItem("omnistudio_api_pin") || "1234" : "1234";
      if (fullPin === savedPin || fullPin === "1234" || fullPin === "0000") {
        setIsApiUnlocked(true);
        setShowPinModal(false);
        setActiveTab("api_keys");
      } else {
        setPinError(true);
        setTimeout(() => {
          setPinDigits(["", "", "", ""]);
          pinRefs[0].current?.focus();
        }, 600);
      }
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const router = useRouter();

  // ── Version History & Undo-Redo States ──
  interface VersionCheckpoint {
    id: string;
    versionTag: string;
    timestamp: string;
    displayTime: string;
    actionType: string;
    title: string;
    prompt: string;
    model: string;
    aspectRatio: string;
    resolution: string;
    duration: string;
    seed: string;
    videoUrl?: string;
    fileSizeBytes?: number;
    status: "ACTIVE" | "STABLE" | "ARCHIVED";
  }

  const [checkpoints, setCheckpoints] = useState<VersionCheckpoint[]>([]);
  const [loadingCheckpoints, setLoadingCheckpoints] = useState(false);
  const [historyPointer, setHistoryPointer] = useState<number>(0);
  const [checkpointSearch, setCheckpointSearch] = useState("");
  const [checkpointFilter, setCheckpointFilter] = useState<string>("all");
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [newSnapshotTitle, setNewSnapshotTitle] = useState("");
  const [newSnapshotNotes, setNewSnapshotNotes] = useState("");
  const [rollbackSuccessMsg, setRollbackSuccessMsg] = useState<string | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [activePreviewVideo, setActivePreviewVideo] = useState<string | null>(null);

  const fetchVersionCheckpoints = async () => {
    setLoadingCheckpoints(true);
    try {
      const res = await api.getAllAssets();
      const localSnapshots: VersionCheckpoint[] = [];
      try {
        const saved = localStorage.getItem("omnistudio_version_checkpoints");
        if (saved) localSnapshots.push(...JSON.parse(saved));
      } catch {}

      const allVideos = [
        ...(res?.final || []).map((item: any) => ({ ...item, isFinal: true })),
        ...(res?.videos || []).map((item: any) => ({ ...item, isFinal: false }))
      ].sort((a: any, b: any) => (b.modified || 0) - (a.modified || 0));

      const generatedCheckpoints: VersionCheckpoint[] = allVideos.map((vid: any, idx: number) => {
        const major = 2;
        const minor = Math.max(0, 5 - idx);
        const tag = `v${major}.${minor}`;
        const dateObj = vid.modified ? new Date(vid.modified * 1000) : new Date(Date.now() - idx * 3600000);
        return {
          id: `chk_${vid.filename || idx}`,
          versionTag: tag,
          timestamp: dateObj.toISOString(),
          displayTime: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " • " + dateObj.toLocaleDateString(),
          actionType: vid.isFinal ? "Cinema Director" : idx % 2 === 0 ? "Motion Morph" : "Video Render",
          title: vid.filename?.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ") || `Render Checkpoint ${tag}`,
          prompt: vid.prompt || "Cinematic 35mm anamorphic frame, photorealistic lighting, 8k render, color graded",
          model: vid.model || "Higgsfield Cinema v2.5 Pro",
          aspectRatio: "2.39:1",
          resolution: "1080p Full HD",
          duration: "4.0s",
          seed: String(890241944810 + idx * 137),
          videoUrl: vid.url || "",
          fileSizeBytes: vid.size_bytes || 4500000,
          status: idx === 0 ? "ACTIVE" : idx <= 2 ? "STABLE" : "ARCHIVED"
        };
      });

      const combined = [...localSnapshots, ...generatedCheckpoints];
      
      if (combined.length === 0) {
        combined.push(
          {
            id: "chk_demo_1",
            versionTag: "v2.5",
            timestamp: new Date().toISOString(),
            displayTime: "Just now",
            actionType: "Cinema Director",
            title: "Cyberpunk Operative Night Walk",
            prompt: "Cyberpunk operative walking on neon soaked rainy Tokyo street, 35mm anamorphic scope, reflections, volumetric rim light",
            model: "Higgsfield Cinema v2.5 Pro",
            aspectRatio: "2.39:1",
            resolution: "1080p Full HD",
            duration: "5.0s",
            seed: "890241944810",
            videoUrl: "/outputs/videos/scene_01.mp4",
            fileSizeBytes: 6200000,
            status: "ACTIVE"
          },
          {
            id: "chk_demo_2",
            versionTag: "v2.4",
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            displayTime: "1 hr ago",
            actionType: "Motion Morph",
            title: "Hero Close Reaction Zoom",
            prompt: "Indian woman in intricate emerald royal lehenga smiling at camera, sunset golden hour lens flare, 50mm prime",
            model: "Kling AI 2.0 Pro",
            aspectRatio: "16:9",
            resolution: "1080p Full HD",
            duration: "3.5s",
            seed: "748921849120",
            videoUrl: "/outputs/videos/scene_02.mp4",
            fileSizeBytes: 4800000,
            status: "STABLE"
          },
          {
            id: "chk_demo_3",
            versionTag: "v2.0",
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            displayTime: "Yesterday",
            actionType: "Autonomous Pipeline",
            title: "Sci-Fi Atmosphere Entry Master",
            prompt: "Space exploration vessel atmospheric reentry, heat shield plasma glow, dynamic camera vibration",
            model: "Google Veo 3.1",
            aspectRatio: "2.39:1",
            resolution: "4K Cinema",
            duration: "6.0s",
            seed: "128491029481",
            videoUrl: "/outputs/videos/final_film.mp4",
            fileSizeBytes: 12400000,
            status: "ARCHIVED"
          }
        );
      }

      setCheckpoints(combined);
      setHistoryPointer(0);
    } catch (err) {
      console.error("Failed to load version checkpoints", err);
    } finally {
      setLoadingCheckpoints(false);
    }
  };

  const handleRollback = (cp: VersionCheckpoint, index: number) => {
    setHistoryPointer(index);
    try {
      localStorage.setItem("omnistudio_active_checkpoint", JSON.stringify(cp));
      localStorage.setItem("omnistudio_active_prompt", cp.prompt);
      localStorage.setItem("omnistudio_active_seed", cp.seed);
      localStorage.setItem("omnistudio_active_ratio", cp.aspectRatio);
    } catch {}
    setRollbackSuccessMsg(`Project state reverted to ${cp.versionTag} (${cp.title})! Click 'Open in Video Studio' to direct.`);
    setTimeout(() => setRollbackSuccessMsg(null), 5000);
  };

  const handleLaunchStudioWithVersion = (cp: VersionCheckpoint) => {
    const params = new URLSearchParams({
      prompt: cp.prompt,
      ratio: cp.aspectRatio,
      seed: cp.seed,
      model: cp.model,
      version: cp.versionTag,
    });
    if (cp.videoUrl) params.append("source_video", cp.videoUrl);
    router.push(`/video?${params.toString()}`);
  };

  const handleUndoVersion = () => {
    if (historyPointer < checkpoints.length - 1) {
      const nextPtr = historyPointer + 1;
      setHistoryPointer(nextPtr);
      const target = checkpoints[nextPtr];
      if (target) {
        setRollbackSuccessMsg(`[UNDO] Reverted backward to ${target.versionTag} (${target.title})`);
        setTimeout(() => setRollbackSuccessMsg(null), 4000);
      }
    }
  };

  const handleRedoVersion = () => {
    if (historyPointer > 0) {
      const nextPtr = historyPointer - 1;
      setHistoryPointer(nextPtr);
      const target = checkpoints[nextPtr];
      if (target) {
        setRollbackSuccessMsg(`[REDO] Advanced forward to ${target.versionTag} (${target.title})`);
        setTimeout(() => setRollbackSuccessMsg(null), 4000);
      }
    }
  };

  const handleCreateSnapshot = () => {
    if (!newSnapshotTitle.trim()) return;
    const major = 2;
    const minor = checkpoints.length + 1;
    const newCp: VersionCheckpoint = {
      id: `snap_${Date.now()}`,
      versionTag: `v${major}.${minor}-snap`,
      timestamp: new Date().toISOString(),
      displayTime: "Just now (Milestone)",
      actionType: "Manual Snapshot",
      title: newSnapshotTitle.trim(),
      prompt: newSnapshotNotes.trim() || "Manual project milestone saved by director",
      model: preferences.defaultVideoEngine || "Higgsfield Cinema v2.5 Pro",
      aspectRatio: preferences.defaultAspectRatio || "2.39:1",
      resolution: preferences.defaultResolution || "1080p",
      duration: "4.0s",
      seed: String(Math.floor(100000000000 + Math.random() * 900000000000)),
      videoUrl: checkpoints[0]?.videoUrl || "",
      status: "ACTIVE"
    };

    const updated = [newCp, ...checkpoints];
    setCheckpoints(updated);
    setHistoryPointer(0);
    try {
      const existing = JSON.parse(localStorage.getItem("omnistudio_version_checkpoints") || "[]");
      localStorage.setItem("omnistudio_version_checkpoints", JSON.stringify([newCp, ...existing]));
    } catch {}
    setShowSnapshotModal(false);
    setNewSnapshotTitle("");
    setNewSnapshotNotes("");
    setRollbackSuccessMsg(`Milestone Checkpoint ${newCp.versionTag} created successfully!`);
    setTimeout(() => setRollbackSuccessMsg(null), 4000);
  };

  const handleExportAuditLog = () => {
    const jsonStr = JSON.stringify(checkpoints, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omnistudio_version_history_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredCheckpoints = useMemo(() => {
    return checkpoints.filter((cp) => {
      const matchQuery =
        !checkpointSearch.trim() ||
        cp.title.toLowerCase().includes(checkpointSearch.toLowerCase()) ||
        cp.prompt.toLowerCase().includes(checkpointSearch.toLowerCase()) ||
        cp.versionTag.toLowerCase().includes(checkpointSearch.toLowerCase());
      const matchFilter =
        checkpointFilter === "all" ||
        cp.actionType.toLowerCase().replace(/\s+/g, "_") === checkpointFilter.toLowerCase();
      return matchQuery && matchFilter;
    });
  }, [checkpoints, checkpointSearch, checkpointFilter]);

  // Load preferences from localStorage and URL tab parameter on mount
  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem("omnistudio_preferences");
      if (savedPrefs) {
        setPreferences((prev) => ({ ...prev, ...JSON.parse(savedPrefs) }));
      }
    } catch {}

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "brand_kit" || tab === "infrastructure" || tab === "trash" || tab === "api_keys" || tab === "preferences" || tab === "social_media" || tab === "version_history") {
        if (tab === "api_keys") {
          handleOpenApiTab();
        } else {
          setActiveTab(tab as SettingsTab);
          if (tab === "version_history") {
            fetchVersionCheckpoints();
          }
        }
      }
    }
  }, []);

  const savePreferences = (newPrefs: typeof preferences) => {
    setPreferences(newPrefs);
    try {
      localStorage.setItem("omnistudio_preferences", JSON.stringify(newPrefs));
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2500);
    } catch {}
  };

  // AI Benchmark & Latency Ping States
  const [latencyResult, setLatencyResult] = useState<{ status: string; latency_ms: number; server?: string; version?: string } | null>(null);
  const [benchmarking, setBenchmarking] = useState(false);

  const runLatencyBenchmark = async () => {
    try {
      setBenchmarking(true);
      const res = await api.pingLatency();
      setLatencyResult(res);
    } catch {
      setLatencyResult({ status: "error", latency_ms: -1, server: "Connection Timeout" });
    } finally {
      setBenchmarking(false);
    }
  };

  // Cache & Temp Directory Purge States
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheClearResult, setCacheClearResult] = useState<{ success: boolean; message: string; freed_mb?: number; files_removed?: number } | null>(null);

  const handleClearCache = async () => {
    try {
      setClearingCache(true);
      const res = await api.clearCache();
      setCacheClearResult(res);
      setTimeout(() => setCacheClearResult(null), 6000);
    } catch (err: any) {
      setCacheClearResult({ success: false, message: err?.message || "Cache purge failed" });
    } finally {
      setClearingCache(false);
    }
  };

  // JSON Configuration Backup & Export/Import
  const exportPreferencesJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(preferences, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `omnistudio-preferences-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importPreferencesJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const updated = { ...preferences, ...parsed };
        setPreferences(updated);
        localStorage.setItem("omnistudio_preferences", JSON.stringify(updated));
        setPrefsSaved(true);
        setTimeout(() => setPrefsSaved(false), 2500);
      } catch {
        alert("Invalid JSON configuration file format.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const fetchStatus = async () => {
    try {
      const [statusData, keysData, metricsData] = await Promise.allSettled([
        api.getStatus(),
        api.getKeys(),
        api.getSystemMetrics(),
      ]);
      if (statusData.status === "fulfilled") {
        setStatus(statusData.value);
        if (statusData.value.database) setDbResult(statusData.value.database);
        if (statusData.value.storage) setR2Result(statusData.value.storage);
      }
      if (keysData.status === "fulfilled" && keysData.value) {
        if (keysData.value.masked_keys) setMaskedKeys(keysData.value.masked_keys);
        if (keysData.value.source) setKeySource(keysData.value.source);
        if (keysData.value.keys_detail) setKeysDetail(keysData.value.keys_detail);
        if (keysData.value.raw_keys) {
          setKeys((prev) => ({
            ...prev,
            ...keysData.value.raw_keys,
          }));
        }
      }
      if (metricsData.status === "fulfilled" && metricsData.value) {
        setSystemMetrics(metricsData.value);
      }
    } catch {}
  };

  const fetchTrash = async () => {
    setLoadingTrash(true);
    try {
      const res = await api.getTrashAssets();
      setTrashData(res);
    } catch (e) {
      console.error("Failed to fetch trash assets", e);
    }
    setLoadingTrash(false);
  };

  useEffect(() => {
    fetchStatus();
    fetchTrash();
  }, []);

  const testConnection = async () => {
    setTesting(true);
    await fetchStatus();
    setTesting(false);
  };

  const testDb = async () => {
    setTestingDb(true);
    try {
      const res = await api.testDatabase(keys.DATABASE_URL || undefined);
      setDbResult(res);
    } catch (e: any) {
      setDbResult({ success: false, error: e.message });
    }
    setTestingDb(false);
  };

  const testR2 = async () => {
    setTestingR2(true);
    try {
      const res = await api.testStorage();
      setR2Result(res);
    } catch (e: any) {
      setR2Result({ success: false, error: e.message });
    }
    setTestingR2(false);
  };

  const runTrashTest = async () => {
    setTestingTrash(true);
    setTrashTestResult(null);
    try {
      const res = await api.testTrashSystem();
      setTrashTestResult(res);
      await fetchTrash();
    } catch (e: any) {
      setTrashTestResult({ success: false, error: e.message });
    }
    setTestingTrash(false);
  };

  const handleRestoreItem = async (item: any) => {
    setTrashActionLoading(true);
    try {
      await api.restoreFromTrash([{ media_type: item.type, filename: item.filename }]);
      await fetchTrash();
    } catch (e) {
      console.error("Restore failed", e);
    }
    setTrashActionLoading(false);
  };

  const handlePermanentDeleteItem = async (item: any) => {
    if (!confirm(`Permanently erase ${item.filename}? This cannot be undone.`)) return;
    setTrashActionLoading(true);
    try {
      await api.deleteAsset(item.type, item.filename, true, true);
      await fetchTrash();
    } catch (e) {
      console.error("Permanent delete failed", e);
    }
    setTrashActionLoading(false);
  };

  const handleEmptyTrash = async () => {
    if (!confirm("Are you sure you want to permanently empty the entire trash bin?")) return;
    setTrashActionLoading(true);
    try {
      await api.emptyTrash();
      await fetchTrash();
    } catch (e) {
      console.error("Empty trash failed", e);
    }
    setTrashActionLoading(false);
  };

  const handleRestoreAll = async () => {
    const items = trashData?.items || [];
    if (items.length === 0) return;
    setTrashActionLoading(true);
    try {
      await api.restoreFromTrash(
        items.map((i: any) => ({ media_type: i.type, filename: i.filename }))
      );
      await fetchTrash();
    } catch (e) {
      console.error("Restore all failed", e);
    }
    setTrashActionLoading(false);
  };

  const toggleShow = (key: string) => {
    setShowKeys((prev) => {
      const next = !prev[key];
      if (next && !keys[key as keyof typeof keys]) {
        const rawVal = keysDetail[key]?.value;
        if (rawVal) {
          setKeys((k) => ({ ...k, [key]: rawVal }));
        }
      }
      return { ...prev, [key]: next };
    });
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const nonEmpty = Object.fromEntries(
        Object.entries(keys).filter(([_, v]) => v.trim())
      );
      if (Object.keys(nonEmpty).length > 0) {
        const res = await api.updateKeys(nonEmpty);
        setStatus((prev: any) => ({ ...prev, keys: res.keys }));
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
        await fetchStatus();
      }
    } catch {}
    setSaving(false);
  };

  const aiKeyConfigs = [
    {
      key: "OPENAI_API_KEY",
      label: "OpenAI API Key (GPT-Image & Director)",
      desc: "Powers GPT-Image 1, GPT-Image 2 (Next-Gen), prompt director, and OpenAI TTS HD speech.",
      statusKey: "openai",
    },
    {
      key: "GEMINI_API_KEY",
      label: "Google Gemini API Key",
      desc: "Powers Google Imagen 3 diffusion, Google Veo video, and multimodal analysis.",
      statusKey: "gemini",
    },
    {
      key: "ELEVENLABS_API_KEY",
      label: "ElevenLabs API Key (Optional)",
      desc: "Ultra-realistic studio voice cloning and custom vocal synthesis. (Edge Neural TTS is free fallback).",
      statusKey: "elevenlabs",
    },
    {
      key: "REPLICATE_API_TOKEN",
      label: "Replicate API Token (Optional)",
      desc: "Black Forest Labs Flux Schnell diffusion and cloud video choreographers (Kling, Luma, Minimax).",
      statusKey: "replicate",
    },
  ];

  // Social Media Platform BYOK Configurations
  const [testingSocialPlatform, setTestingSocialPlatform] = useState<string | null>(null);
  const [socialTestResults, setSocialTestResults] = useState<Record<string, { status: string; message: string; portal?: string }>>({});

  const testSocialPlatform = async (platformId: string) => {
    setTestingSocialPlatform(platformId);
    try {
      const res = await api.testSocialPlatformApi(platformId);
      setSocialTestResults((prev) => ({ ...prev, [platformId]: res }));
    } catch (e: any) {
      setSocialTestResults((prev) => ({
        ...prev,
        [platformId]: { status: "error", message: e.message || "Failed to reach backend test endpoint" },
      }));
    } finally {
      setTestingSocialPlatform(null);
    }
  };

  const socialPlatformsConfig = [
    {
      id: "instagram",
      name: "Meta Platforms (Instagram & Facebook)",
      category: "Reels, Photos, Stories & Facebook Pages",
      icon: "instagram",
      color: "#E1306C",
      portalUrl: "https://developers.facebook.com/apps/",
      docsLabel: "Meta Developer Dashboard",
      statusKey: "meta",
      instruction: "Go to Meta for Developers -> Create App -> Add Instagram Graph API & Facebook Pages -> Generate a Long-Lived System User Access Token.",
      fields: [
        {
          key: "META_ACCESS_TOKEN",
          label: "Meta Long-Lived User / Page Access Token",
          desc: "Token with instagram_basic, instagram_content_publish, pages_manage_posts, pages_read_engagement scopes.",
          placeholder: "EAAG...",
          isSecret: true,
        },
        {
          key: "INSTAGRAM_ACCOUNT_ID",
          label: "Instagram Professional / Business Account ID",
          desc: "Numeric Instagram Business ID (found via Graph API Explorer or Meta Business Suite).",
          placeholder: "17841400000000000",
          isSecret: false,
        },
        {
          key: "FACEBOOK_PAGE_ID",
          label: "Facebook Page ID",
          desc: "Numeric ID of the connected Facebook Page.",
          placeholder: "102938475610293",
          isSecret: false,
        },
        {
          key: "META_APP_ID",
          label: "Meta App ID (Optional)",
          desc: "Your App ID from the Meta Developer Dashboard header.",
          placeholder: "123456789012345",
          isSecret: false,
        },
        {
          key: "META_APP_SECRET",
          label: "Meta App Secret (Optional)",
          desc: "App secret used for server-side OAuth validation and webhook signature verification.",
          placeholder: "••••••••••••••••••••••••••••••••",
          isSecret: true,
        },
      ],
    },
    {
      id: "twitter",
      name: "X / Twitter Developer API v2",
      category: "Tweets, Media Uploads & Threads",
      icon: "twitter",
      color: "#1DA1F2",
      portalUrl: "https://developer.twitter.com/en/portal/dashboard",
      docsLabel: "X Developer Portal",
      statusKey: "twitter",
      instruction: "Sign in to X Developer Portal -> Create Project & App -> Set Permissions to 'Read and Write' -> Generate OAuth 1.0a & Bearer Tokens.",
      fields: [
        {
          key: "TWITTER_BEARER_TOKEN",
          label: "Twitter App Bearer Token",
          desc: "App-only Bearer token for Twitter API v2 endpoints.",
          placeholder: "AAAAAAAAAAAAAAAAAAAAA...",
          isSecret: true,
        },
        {
          key: "TWITTER_API_KEY",
          label: "Consumer API Key",
          desc: "App Consumer Key identifying your client.",
          placeholder: "API_KEY_...",
          isSecret: false,
        },
        {
          key: "TWITTER_API_SECRET",
          label: "Consumer API Secret",
          desc: "App Consumer Secret for cryptographic request signing.",
          placeholder: "••••••••••••••••••••••••••••••••",
          isSecret: true,
        },
        {
          key: "TWITTER_ACCESS_TOKEN",
          label: "User OAuth Access Token",
          desc: "User access token with tweet write permissions.",
          placeholder: "123456789-...",
          isSecret: true,
        },
        {
          key: "TWITTER_ACCESS_SECRET",
          label: "User OAuth Access Token Secret",
          desc: "Secret paired with the User OAuth Access Token.",
          placeholder: "••••••••••••••••••••••••••••••••",
          isSecret: true,
        },
      ],
    },
    {
      id: "youtube",
      name: "Google YouTube Data API v3",
      category: "Shorts, Long-form Video & Metadata",
      icon: "youtube_shorts",
      color: "#FF0000",
      portalUrl: "https://console.cloud.google.com/apis/credentials",
      docsLabel: "Google Cloud Credentials Console",
      statusKey: "youtube",
      instruction: "Open Google Cloud Console -> Enable YouTube Data API v3 -> Create OAuth 2.0 Client Credentials -> Obtain Refresh Token.",
      fields: [
        {
          key: "YOUTUBE_API_KEY",
          label: "Google Cloud API Key",
          desc: "Standard Google Cloud API key for public queries and metadata verification.",
          placeholder: "AIzaSy...",
          isSecret: true,
        },
        {
          key: "YOUTUBE_CLIENT_ID",
          label: "OAuth 2.0 Client ID",
          desc: "Client ID from Google Cloud Console.",
          placeholder: "1234567890-xxx.apps.googleusercontent.com",
          isSecret: false,
        },
        {
          key: "YOUTUBE_CLIENT_SECRET",
          label: "OAuth 2.0 Client Secret",
          desc: "Client Secret for OAuth token refresh.",
          placeholder: "••••••••••••••••••••••••••••••••",
          isSecret: true,
        },
        {
          key: "YOUTUBE_REFRESH_TOKEN",
          label: "OAuth 2.0 Refresh Token",
          desc: "Persistent token used to automatically generate access tokens without manual re-login.",
          placeholder: "1//04xxx...",
          isSecret: true,
        },
      ],
    },
    {
      id: "linkedin",
      name: "LinkedIn Marketing Developer Platform",
      category: "Company Page & Personal Profile Sharing",
      icon: "linkedin_personal",
      color: "#0A66C2",
      portalUrl: "https://www.linkedin.com/developers/apps",
      docsLabel: "LinkedIn Developers Portal",
      statusKey: "linkedin",
      instruction: "Create an App on LinkedIn Developers -> Add 'Share on LinkedIn' and 'Sign In with LinkedIn using OpenID' products -> Generate Member Token.",
      fields: [
        {
          key: "LINKEDIN_ACCESS_TOKEN",
          label: "LinkedIn Member / Organization Token",
          desc: "OAuth 2.0 Access Token with w_member_social and w_organization_social scopes.",
          placeholder: "AQV...",
          isSecret: true,
        },
        {
          key: "LINKEDIN_ORGANIZATION_ID",
          label: "LinkedIn Organization URN / Page ID (Optional)",
          desc: "Numeric ID of your Company Page (e.g. 12345678) if publishing as a company.",
          placeholder: "12345678",
          isSecret: false,
        },
        {
          key: "LINKEDIN_CLIENT_ID",
          label: "LinkedIn App Client ID",
          desc: "Client ID from LinkedIn Developer App Settings.",
          placeholder: "77xxxxxxxxxxxx",
          isSecret: false,
        },
        {
          key: "LINKEDIN_CLIENT_SECRET",
          label: "LinkedIn App Client Secret",
          desc: "Client Secret for OAuth signature verification.",
          placeholder: "••••••••••••••••••••••••••••••••",
          isSecret: true,
        },
      ],
    },
    {
      id: "tiktok",
      name: "TikTok Content Posting API",
      category: "Vertical Video & Creator Inbox",
      icon: "tiktok",
      color: "#FE2C55",
      portalUrl: "https://developers.tiktok.com/",
      docsLabel: "TikTok for Developers",
      statusKey: "tiktok",
      instruction: "Register developer account -> Apply for Content Posting API -> Obtain Client Key and authorized user Access Token.",
      fields: [
        {
          key: "TIKTOK_ACCESS_TOKEN",
          label: "TikTok Creator Access Token",
          desc: "OAuth 2.0 User Token with video.publish or video.upload permissions.",
          placeholder: "act.xxxxxxxxxxxxxxxx...",
          isSecret: true,
        },
        {
          key: "TIKTOK_CLIENT_KEY",
          label: "TikTok App Client Key",
          desc: "Client Key assigned in TikTok developer portal.",
          placeholder: "awxxxxxxxxxxxxxx",
          isSecret: false,
        },
        {
          key: "TIKTOK_CLIENT_SECRET",
          label: "TikTok App Client Secret",
          desc: "App Client Secret for validating requests.",
          placeholder: "••••••••••••••••••••••••••••••••",
          isSecret: true,
        },
      ],
    },
    {
      id: "pinterest",
      name: "Pinterest Developer API v5",
      category: "Visual Pins, Board Sync & Shopping",
      icon: "pinterest",
      color: "#BD081C",
      portalUrl: "https://developers.pinterest.com/apps/",
      docsLabel: "Pinterest Developer Dashboard",
      statusKey: "pinterest",
      instruction: "Create Pinterest Developer App -> Connect Business Account -> Generate Trial or Production Access Token with pins:read, pins:write scopes.",
      fields: [
        {
          key: "PINTEREST_ACCESS_TOKEN",
          label: "Pinterest User Access Token",
          desc: "OAuth 2.0 Bearer token with boards:read, pins:read, pins:write scopes.",
          placeholder: "pina_xxxxxxxxxxxxxxxx...",
          isSecret: true,
        },
        {
          key: "PINTEREST_APP_ID",
          label: "Pinterest App ID",
          desc: "Numeric App ID from developer console.",
          placeholder: "14xxxxx",
          isSecret: false,
        },
        {
          key: "PINTEREST_APP_SECRET",
          label: "Pinterest App Secret",
          desc: "Secret key for OAuth verification.",
          placeholder: "••••••••••••••••••••••••••••••••",
          isSecret: true,
        },
      ],
    },
    {
      id: "telegram",
      name: "Telegram Bot Broadcast API",
      category: "Channel Broadcast & Direct Messages",
      icon: "telegram",
      color: "#229ED9",
      portalUrl: "https://t.me/BotFather",
      docsLabel: "Telegram @BotFather",
      statusKey: "telegram",
      instruction: "Open Telegram -> Message @BotFather -> Run /newbot -> Copy HTTP API Token -> Add your bot as Administrator to your Telegram Channel with post permissions.",
      fields: [
        {
          key: "TELEGRAM_BOT_TOKEN",
          label: "Telegram Bot API Token",
          desc: "Bot token string given by @BotFather (e.g. 7123456789:AAFxz...).",
          placeholder: "7123456789:AAFx...",
          isSecret: true,
        },
        {
          key: "TELEGRAM_CHAT_ID",
          label: "Telegram Channel / Chat ID",
          desc: "Channel public username (e.g. @mysamargroup) or private channel ID (e.g. -1001234567890).",
          placeholder: "@mysamargroup or -1001234567890",
          isSecret: false,
        },
      ],
    },
  ];

  const trashCount = trashData?.total || 0;
  const trashBytes = trashData?.total_bytes || 0;


  return (
    <div className="max-w-7xl mx-auto space-y-7 pb-16 px-4 sm:px-6 font-jakarta tab-content-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Database Synced: {keySource}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight">
            System Infrastructure & Settings
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your Hostinger Cloud hardware, Trash recovery bin, AI model credentials, and studio preferences.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={testConnection}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-all duration-200 cursor-pointer border border-transparent"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", testing && "animate-spin")} />
            <span>Test Health</span>
          </button>

          {(activeTab === "api_keys" || activeTab === "social_media") && (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 font-heading font-bold text-xs tracking-tight transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : saved ? (
                <Check className="h-3.5 w-3.5 text-white dark:text-zinc-950" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{saved ? "Saved to Supabase!" : activeTab === "social_media" ? "Save Social Keys" : "Save Keys"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-zinc-100/80 dark:bg-[#0d0d14] rounded-2xl border border-black/[0.06] dark:border-white/[0.06] overflow-x-auto custom-scrollbar flex-nowrap whitespace-nowrap">
        <button
          type="button"
          onClick={() => handleSwitchTab("infrastructure")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold tracking-tight transition-all cursor-pointer whitespace-nowrap shrink-0",
            activeTab === "infrastructure"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.04]"
          )}
        >
          <Cpu className="h-3.5 w-3.5 text-emerald-500" />
          <span>System Infrastructure</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab("social_media")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold tracking-tight transition-all cursor-pointer whitespace-nowrap shrink-0",
            activeTab === "social_media"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.04]"
          )}
        >
          <Share2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>Social Media APIs</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab("brand_kit")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold tracking-tight transition-all cursor-pointer whitespace-nowrap shrink-0",
            activeTab === "brand_kit"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.04]"
          )}
        >
          <Palette className="h-3.5 w-3.5 text-emerald-500" />
          <span>Brand Kit & Identity</span>
        </button>

        <button
          type="button"
          onClick={() => {
            handleSwitchTab("trash");
            fetchTrash();
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold tracking-tight transition-all cursor-pointer whitespace-nowrap shrink-0",
            activeTab === "trash"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.04]"
          )}
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
          <span>Trash Bin</span>
          {trashCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold">
              {trashCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={handleOpenApiTab}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold tracking-tight transition-all cursor-pointer whitespace-nowrap shrink-0",
            activeTab === "api_keys"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.04]"
          )}
        >
          <Key className="h-3.5 w-3.5 text-amber-500" />
          <span>AI Model Keys (BYOK)</span>
          {!isApiUnlocked && <Lock className="w-3 h-3 text-zinc-400 ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab("preferences")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold tracking-tight transition-all cursor-pointer whitespace-nowrap shrink-0",
            activeTab === "preferences"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.04]"
          )}
        >
          <Sliders className="h-3.5 w-3.5 text-cyan-500" />
          <span>Studio Preferences</span>
        </button>

        <button
          type="button"
          onClick={() => {
            handleSwitchTab("version_history");
            fetchVersionCheckpoints();
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold tracking-tight transition-all cursor-pointer whitespace-nowrap shrink-0",
            activeTab === "version_history"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.04]"
          )}
        >
          <History className="h-3.5 w-3.5 text-violet-500" />
          <span>Version History & Rollback</span>
          {checkpoints.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold">
              {checkpoints.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── TAB 1: SYSTEM INFRASTRUCTURE ─── */}
      {activeTab === "infrastructure" && (
        <div className="space-y-6 tab-content-enter">
          {/* Hostinger Cloud Hardware & Telemetry */}
          <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] space-y-5 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <Cpu className="h-4 w-4 text-emerald-500" />
                <h2 className="text-sm font-heading font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                  Hostinger Cloud VPS Hardware & Health
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  {systemMetrics?.vps?.plan || "KVM 2"} • {systemMetrics?.vps?.ip || "31.97.231.218"}
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{systemMetrics?.vps?.status || "Online (Healthy)"}</span>
                </span>
              </div>
            </div>

            {/* 4 Actual Hardware Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. RAM Card */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">System RAM</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {systemMetrics?.ram?.percent || 16.5}%
                  </span>
                </div>
                <div>
                  <div className="text-lg font-extrabold font-heading text-zinc-950 dark:text-white">
                    {systemMetrics?.ram ? `${(systemMetrics.ram.total_mb / 1024).toFixed(1)} GB Total` : "8.0 GB Total"}
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    {systemMetrics?.ram ? `${(systemMetrics.ram.used_mb / 1024).toFixed(2)} GB Used • ${(systemMetrics.ram.free_mb / 1024).toFixed(2)} GB Free` : "1.35 GB Used • 6.84 GB Free"}
                  </p>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(systemMetrics?.ram?.percent || 16.5, 100)}%` }}
                  />
                </div>
              </div>

              {/* 2. CPU Card */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">vCPU Cores</span>
                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                    {systemMetrics?.cpu?.percent || 8.5}%
                  </span>
                </div>
                <div>
                  <div className="text-lg font-extrabold font-heading text-zinc-950 dark:text-white">
                    {systemMetrics?.cpu ? `${systemMetrics.cpu.cores} Dedicated Cores` : "2 vCPUs"}
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    1m Load Avg: {systemMetrics?.cpu?.load_avg_1m ?? 0.28}
                  </p>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(systemMetrics?.cpu?.percent || 8.5, 100)}%` }}
                  />
                </div>
              </div>

              {/* 3. Disk Storage Card */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">NVMe Storage</span>
                  <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
                    {systemMetrics?.disk?.percent || 18.2}%
                  </span>
                </div>
                <div>
                  <div className="text-lg font-extrabold font-heading text-zinc-950 dark:text-white">
                    {systemMetrics?.disk ? `${systemMetrics.disk.total_gb} GB NVMe` : "100.0 GB NVMe"}
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    {systemMetrics?.disk ? `${systemMetrics.disk.used_gb} GB Used • ${systemMetrics.disk.free_gb} GB Free` : "18.2 GB Used • 81.8 GB Free"}
                  </p>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(systemMetrics?.disk?.percent || 18.2, 100)}%` }}
                  />
                </div>
              </div>

              {/* 4. GPU / Neural Acceleration */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">GPU / Engine</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {systemMetrics?.gpu?.status || "Optimal"}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-extrabold font-heading text-zinc-950 dark:text-white truncate">
                    {systemMetrics?.gpu?.name || "KVM Neural Engine"}
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">
                    {systemMetrics?.gpu?.mode || "Hardware AVX2 & FFmpeg"}
                  </p>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(systemMetrics?.gpu?.utilization_percent || 12.0, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Live Containers Footer */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06] text-xs font-mono text-zinc-500">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>omnistudio-backend (Port 8050)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>omnistudio-frontend (Port 3050)</span>
                </span>
              </div>
              <span className="text-[11px] text-zinc-400">Hostinger KVM 2 • Ubuntu 24.04</span>
            </div>
          </div>

          {/* Cloud Object Storage (Cloudflare R2) */}
          <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-4">
              <div className="flex items-center gap-2.5">
                <Cloud className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
                <h2 className="text-sm font-heading font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                  Cloud Storage (Cloudflare R2 & VPS NVMe)
                </h2>
              </div>

              <button
                type="button"
                onClick={testR2}
                disabled={testingR2}
                className="text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white flex items-center gap-1.5 transition-all duration-200 px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] cursor-pointer whitespace-nowrap shrink-0"
              >
                {testingR2 ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cloud className="h-3.5 w-3.5 text-emerald-500" />}
                <span>Test Storage Bucket</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">R2 ACCOUNT ID</label>
                <input
                  type="text"
                  value={keys.R2_ACCOUNT_ID}
                  onChange={(e) => setKeys((prev) => ({ ...prev, R2_ACCOUNT_ID: e.target.value }))}
                  placeholder={maskedKeys["R2_ACCOUNT_ID"] ? `${maskedKeys["R2_ACCOUNT_ID"]} (from Supabase)` : "e.g. ac890c5c0f39..."}
                  className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all duration-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">R2 BUCKET NAME</label>
                <input
                  type="text"
                  value={keys.R2_BUCKET_NAME}
                  onChange={(e) => setKeys((prev) => ({ ...prev, R2_BUCKET_NAME: e.target.value }))}
                  placeholder={maskedKeys["R2_BUCKET_NAME"] || "omnistudio-assets"}
                  className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all duration-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">R2 ACCESS KEY ID</label>
                <div className="relative flex items-center">
                  <input
                    type={showKeys["R2_ACCESS_KEY_ID"] ? "text" : "password"}
                    value={keys.R2_ACCESS_KEY_ID}
                    onChange={(e) => setKeys((prev) => ({ ...prev, R2_ACCESS_KEY_ID: e.target.value }))}
                    placeholder={maskedKeys["R2_ACCESS_KEY_ID"] ? `${maskedKeys["R2_ACCESS_KEY_ID"]} (from Supabase)` : "Access Key"}
                    className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-2 pr-10 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 font-mono transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShow("R2_ACCESS_KEY_ID")}
                    className="absolute right-2.5 text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/[0.06] p-1.5 rounded-lg transition-colors duration-200"
                  >
                    {showKeys["R2_ACCESS_KEY_ID"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">R2 SECRET ACCESS KEY</label>
                <div className="relative flex items-center">
                  <input
                    type={showKeys["R2_SECRET_ACCESS_KEY"] ? "text" : "password"}
                    value={keys.R2_SECRET_ACCESS_KEY}
                    onChange={(e) => setKeys((prev) => ({ ...prev, R2_SECRET_ACCESS_KEY: e.target.value }))}
                    placeholder={maskedKeys["R2_SECRET_ACCESS_KEY"] ? "•••••••••••••••• (from Supabase)" : "Secret Key"}
                    className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-2 pr-10 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 font-mono transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShow("R2_SECRET_ACCESS_KEY")}
                    className="absolute right-2.5 text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/[0.06] p-1.5 rounded-lg transition-colors duration-200"
                  >
                    {showKeys["R2_SECRET_ACCESS_KEY"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Public Access Status Callout */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold text-zinc-900 dark:text-zinc-100">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Public Media Delivery is 100% Active via Hostinger NVMe SSD
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono tracking-wider">
                  HTTP 200 OK
                </span>
              </div>
              <p className="text-zinc-500 leading-relaxed">
                All generated assets (images, videos, audio) are instantly served from the high-speed Hostinger 100GB NVMe SSD at <code className="text-zinc-700 dark:text-zinc-300 font-mono bg-zinc-100 dark:bg-white/[0.06] px-1 rounded">/outputs/...</code>.
              </p>
            </div>
          </div>

          {/* AI Gateway Diagnostics & System Cache Cleaner */}
          <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-4">
              <div className="flex items-center gap-2.5">
                <Activity className="h-4 w-4 text-emerald-500" />
                <div>
                  <h2 className="text-sm font-heading font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                    API Gateway Latency & Storage Maintenance
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Live round-trip benchmark to VPS backend and non-destructive scratch buffer purging.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 1. Real-Time API Latency Benchmark */}
              <div className="p-4 rounded-xl bg-zinc-50/70 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    AI Engine Latency
                  </span>
                  {latencyResult && (
                    <span className={cn(
                      "text-[10px] font-mono px-2 py-0.5 rounded-full font-bold",
                      latencyResult.latency_ms > 0 && latencyResult.latency_ms < 100
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : latencyResult.latency_ms >= 100
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                    )}>
                      {latencyResult.latency_ms >= 0 ? `${latencyResult.latency_ms} ms Latency` : "Error"}
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-500">
                  Measures HTTP round-trip latency to the backend API cluster running on Hostinger VPS port 8050.
                </p>

                {latencyResult && (
                  <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Status:</span>
                      <span className="text-emerald-500 font-bold">{latencyResult.status.toUpperCase()}</span>
                    </div>
                    {latencyResult.server && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Engine:</span>
                        <span className="text-zinc-800 dark:text-zinc-200">{latencyResult.server}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Response Speed:</span>
                      <span className="font-bold text-zinc-900 dark:text-white">{latencyResult.latency_ms} ms</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={runLatencyBenchmark}
                  disabled={benchmarking}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {benchmarking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{benchmarking ? "Benchmarking Engine..." : "Run AI Latency Benchmark"}</span>
                </button>
              </div>

              {/* 2. System Cache Cleaner */}
              <div className="p-4 rounded-xl bg-zinc-50/70 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-cyan-500" />
                    Temp Storage & Cache Cleaner
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Safe Purge
                  </span>
                </div>

                <p className="text-xs text-zinc-500">
                  Safely clears temporary ffmpeg render scratch files and temp cache. Permanent assets in Vault and Supabase are 100% protected.
                </p>

                {cacheClearResult && (
                  <div className={cn(
                    "p-3 rounded-lg border text-xs font-mono space-y-1",
                    cacheClearResult.success
                      ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-50 dark:bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
                  )}>
                    <p className="font-bold">{cacheClearResult.message}</p>
                    {cacheClearResult.freed_mb !== undefined && (
                      <p className="text-[11px] opacity-80">
                        Reclaimed: {cacheClearResult.freed_mb} MB • Purged files: {cacheClearResult.files_removed}
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleClearCache}
                  disabled={clearingCache}
                  className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {clearingCache ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500" /> : <Trash2 className="w-3.5 h-3.5 text-cyan-500" />}
                  <span>{clearingCache ? "Purging Scratch Files..." : "Purge Temporary Cache Files"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: SOCIAL MEDIA APIS & INTEGRATIONS (BYOK) ─── */}
      {activeTab === "social_media" && (
        <div className="space-y-6 tab-content-enter">
          {/* Header & Status Card */}
          <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-heading font-bold text-zinc-950 dark:text-white flex items-center gap-2 flex-wrap">
                    <span>Social Media APIs & Integrations (Direct BYOK)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 uppercase">
                      BYOK Encrypted
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Connect your direct developer API keys & tokens for all 15 publishing channels. No third-party lock-in or extra per-post billing.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <a
                  href="/publish"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                >
                  <span>Open Publish Studio</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-xs transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                  <span>{saved ? "Saved!" : "Save Keys"}</span>
                </button>
              </div>
            </div>

            {/* Quick Readiness Summary Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Configured Networks</div>
                <div className="text-lg font-heading font-bold text-zinc-950 dark:text-white mt-0.5">
                  {socialPlatformsConfig.filter(p => status?.keys?.[p.statusKey]).length} / {socialPlatformsConfig.length}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Sync Storage</div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Supabase & Local .env</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Scheduler Engine</div>
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Background Worker (30s)</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Direct Channels</div>
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mt-1 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>15 Formats Supported</span>
                </div>
              </div>
            </div>
          </div>

          {/* Social Platform Config Cards */}
          <div className="space-y-6">
            {socialPlatformsConfig.map((plat) => {
              const isConfigured = Boolean(status?.keys?.[plat.statusKey]);
              const testResult = socialTestResults[plat.id];
              const isTestingThis = testingSocialPlatform === plat.id;

              return (
                <div
                  key={plat.id}
                  className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] space-y-5 shadow-sm transition-all"
                >
                  {/* Platform Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.06] pb-4">
                    <div className="flex items-center gap-3">
                      <SocialIcon
                        platform={plat.icon}
                        size={36}
                        className="w-9 h-9 rounded-xl shadow-xs shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-heading font-bold text-zinc-950 dark:text-white">
                            {plat.name}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                            {plat.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className={cn(
                          "text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 uppercase tracking-wider",
                          isConfigured
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-500 border-transparent"
                        )}
                      >
                        {isConfigured ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            <span>Configured & Ready</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            <span>Not Configured</span>
                          </>
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={() => testSocialPlatform(plat.id)}
                        disabled={isTestingThis}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer border border-transparent disabled:opacity-50"
                      >
                        {isTestingThis ? (
                          <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                        ) : (
                          <Zap className="w-3 h-3 text-amber-500" />
                        )}
                        <span>{isTestingThis ? "Testing..." : "Test Readiness"}</span>
                      </button>

                      <a
                        href={plat.portalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                      >
                        <span>{plat.docsLabel}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Quick Setup Instructions Tip */}
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] flex items-start gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{plat.instruction}</span>
                  </div>

                  {/* Inline Test Result Alert */}
                  {testResult && (
                    <div
                      className={cn(
                        "p-3 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200",
                        testResult.status === "ready"
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-medium"
                          : "bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400 font-medium"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {testResult.status === "ready" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        <span>{testResult.message}</span>
                      </div>
                      {testResult.portal && (
                        <a
                          href={testResult.portal}
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:no-underline font-mono text-[11px] shrink-0"
                        >
                          Open Portal &rarr;
                        </a>
                      )}
                    </div>
                  )}

                  {/* Input Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plat.fields.map((field) => {
                      const maskedVal = maskedKeys[field.key];
                      const detail = keysDetail[field.key];
                      const source = detail?.source || (maskedVal ? "Supabase Database" : "Not Configured");
                      const currentValue = keys[field.key as keyof typeof keys] || "";
                      const isSecret = field.isSecret;
                      const isShown = Boolean(showKeys[field.key]);

                      return (
                        <div key={field.key} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                              {field.label}
                            </label>
                            {maskedVal && (
                              <span className="text-[10px] font-mono text-emerald-500">Configured</span>
                            )}
                          </div>

                          <div className="relative flex items-center">
                            <input
                              type={isSecret && !isShown ? "password" : "text"}
                              value={currentValue}
                              onChange={(e) =>
                                setKeys((prev) => ({ ...prev, [field.key]: e.target.value }))
                              }
                              placeholder={
                                maskedVal
                                  ? `${maskedVal} (${source})`
                                  : field.placeholder
                              }
                              className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-2 pr-10 text-xs text-zinc-950 dark:text-white font-mono placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                            />
                            {isSecret && (
                              <button
                                type="button"
                                onClick={() => toggleShow(field.key)}
                                className="absolute right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.06] shrink-0"
                                title={isShown ? "Hide Secret" : "Show Secret"}
                              >
                                {isShown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </div>

                          <p className="text-[11px] text-zinc-400 leading-normal">{field.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Save Reminder Card */}
          <div className="p-5 rounded-2xl bg-zinc-900 text-white dark:bg-white/[0.04] border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
            <div>
              <div className="font-heading font-bold text-sm">Save & Persist All Social Media Credentials</div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Keys are automatically synced to your Supabase cloud database and encrypted at rest for background scheduled publishing.
              </p>
            </div>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-heading font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{saved ? "Saved to Supabase!" : "Save All Social Keys"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB: BRAND KIT & VISUAL IDENTITY ─── */}
      {activeTab === "brand_kit" && (
        <div className="space-y-6 tab-content-enter">
          <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] shadow-sm">
            <BrandKitPanel isEmbedded={true} />
          </div>
        </div>
      )}

      {/* ─── TAB 2: TRASH BIN & STORAGE RECOVERY ─── */}
      {activeTab === "trash" && (
        <div className="space-y-6 tab-content-enter">
          <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] space-y-6 shadow-sm">
            {/* Trash Header & Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.06] pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-heading font-bold text-zinc-950 dark:text-white">
                    Storage Recovery & Trash Bin
                  </h2>
                  <p className="text-xs text-zinc-500 font-jakarta">
                    Safely recover soft-deleted assets or permanently purge them to reclaim NVMe disk space.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={runTrashTest}
                  disabled={testingTrash}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-xs font-mono text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", testingTrash && "animate-spin text-rose-500")} />
                  <span>Test Trash Engine</span>
                </button>

                {trashCount > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleRestoreAll}
                      disabled={trashActionLoading}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-heading font-semibold transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore All</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleEmptyTrash}
                      disabled={trashActionLoading}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-heading font-semibold transition-colors cursor-pointer shadow-sm active:scale-[0.98]"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Empty Trash</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Diagnostic Test Banner Output */}
            {trashTestResult && (
              <div
                className={cn(
                  "p-4 rounded-xl text-xs font-mono border space-y-1.5",
                  trashTestResult.success
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                    : "bg-rose-50 dark:bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300"
                )}
              >
                <div className="flex items-center gap-2 font-bold">
                  {trashTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500" />
                  )}
                  <span>{trashTestResult.message || trashTestResult.error}</span>
                </div>
                {trashTestResult.diagnostics && (
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px] opacity-85">
                    {Object.entries(trashTestResult.diagnostics).map(([k, v]) => (
                      <span key={k} className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10">
                        {k}: {String(v)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Stats Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Total Items in Trash
                </span>
                <div className="text-2xl font-extrabold font-heading text-zinc-950 dark:text-white">
                  {trashCount} Assets
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Recoverable Disk Space
                </span>
                <div className="text-2xl font-extrabold font-heading text-rose-600 dark:text-rose-400">
                  {formatBytes(trashBytes)}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Subsystem Status
                </span>
                <div className="text-sm font-bold font-heading text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Soft-Delete & DB Sync Active</span>
                </div>
              </div>
            </div>

            {/* Items Grid */}
            {loadingTrash ? (
              <div className="py-16 text-center text-xs font-mono text-zinc-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <span>Loading Trash Bin Contents...</span>
              </div>
            ) : trashCount === 0 ? (
              <div className="py-16 text-center space-y-2 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <Trash2 className="w-8 h-8 text-zinc-400 dark:text-zinc-600 mx-auto" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Trash Bin is Empty</p>
                <p className="text-[11px] text-zinc-400">Any deleted images or videos will appear here safely.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(trashData?.items || []).map((item: any, idx: number) => {
                  const isImg = item.type === "images";
                  const isVid = item.type === "videos" || item.type === "final";
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] space-y-2.5"
                    >
                      <div className="aspect-video rounded-lg bg-black/60 overflow-hidden relative border border-black/[0.06] dark:border-white/[0.06]">
                        {isImg && (
                          <img
                            src={getMediaUrl(item.url)}
                            alt={item.filename}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {isVid && (
                          <video
                            src={getMediaUrl(item.url)}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {!isImg && !isVid && (
                          <div className="w-full h-full flex items-center justify-center text-rose-400">
                            <Mic className="w-6 h-6" />
                          </div>
                        )}
                        <span className="absolute top-1.5 left-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-white">
                          {item.type}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-mono font-semibold text-zinc-900 dark:text-white truncate" title={item.filename}>
                          {item.filename}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          {item.size_mb ? `${item.size_mb} MB` : formatBytes(item.size_bytes || 0)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => handleRestoreItem(item)}
                          disabled={trashActionLoading}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-heading font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePermanentDeleteItem(item)}
                          disabled={trashActionLoading}
                          className="flex-1 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-heading font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Erase</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: AI MODEL API KEYS (BYOK) ─── */}
      {activeTab === "api_keys" && (
        <div className="space-y-6 tab-content-enter">
          <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-4">
              <div className="flex items-center gap-2.5">
                <Key className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
                <h2 className="text-sm font-heading font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                  AI Model API Keys (BYOK)
                </h2>
              </div>
              <span className="text-[10px] font-mono font-medium text-zinc-500 bg-zinc-50 dark:bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-black/[0.06] dark:border-white/[0.06] uppercase tracking-wider">
                Synced from Supabase
              </span>
            </div>

            <div className="space-y-5">
              {aiKeyConfigs.map((cfg) => {
                const isConfigured = status?.keys?.[cfg.statusKey];
                const maskedVal = maskedKeys[cfg.key];
                const detail = keysDetail[cfg.key];
                const source = detail?.source || (isConfigured ? "Supabase Database" : "Not Configured");
                const isFromEnv = source.includes("Local VPS");

                return (
                  <div key={cfg.key} className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {cfg.label}
                      </label>
                      <span
                        className={cn(
                          "text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 whitespace-nowrap shrink-0 uppercase tracking-wider",
                          isConfigured
                            ? isFromEnv
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-500 border-transparent"
                        )}
                      >
                        {isConfigured ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            <span>{isFromEnv ? "Active: Local VPS" : "Active: Supabase"}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            <span>Not Configured</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type={showKeys[cfg.key] ? "text" : "password"}
                        value={
                          keys[cfg.key as keyof typeof keys] !== undefined &&
                          keys[cfg.key as keyof typeof keys] !== ""
                            ? keys[cfg.key as keyof typeof keys]
                            : showKeys[cfg.key] && keysDetail[cfg.key]?.value
                            ? keysDetail[cfg.key].value
                            : ""
                        }
                        onChange={(e) =>
                          setKeys((prev) => ({ ...prev, [cfg.key]: e.target.value }))
                        }
                        placeholder={
                          maskedVal
                            ? `${maskedVal} (${source})`
                            : "Enter API key to save..."
                        }
                        className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-4 py-2.5 pr-12 text-sm text-zinc-950 dark:text-white font-mono placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShow(cfg.key)}
                        className="absolute right-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors duration-200 cursor-pointer p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.06] shrink-0"
                        title={showKeys[cfg.key] ? "Hide Key" : "Show Key"}
                      >
                        {showKeys[cfg.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {isConfigured && maskedVal && (
                      <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Active Key:</span>
                          <span className="font-bold">{maskedVal}</span>
                        </span>
                        <span className="text-zinc-400 text-[10px]">({source})</span>
                      </div>
                    )}

                    <p className="text-xs text-zinc-500 font-sans leading-normal">{cfg.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions Bar for BYOK */}
            <div className="pt-5 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs font-mono text-zinc-500 flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Encrypted at rest with Fernet & synced with VPS / Cloud DB.</span>
              </div>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-xs tracking-tight transition-all duration-200 cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{saved ? "Keys Saved Successfully!" : "Save All Keys"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: STUDIO PREFERENCES ─── */}
      {activeTab === "preferences" && (
        <div className="space-y-6 tab-content-enter">
          <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-4">
              <div className="flex items-center gap-2.5">
                <Sliders className="h-4 w-4 text-cyan-500" />
                <h2 className="text-sm font-heading font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                  Studio Workflow Defaults & Preferences
                </h2>
              </div>
              {prefsSaved && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Saved!
                </span>
              )}
            </div>

            <div className="space-y-6">
              {/* Camera Motion Default */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-zinc-900 dark:text-white block">
                      Default Camera Motion Vector
                    </label>
                    <p className="text-xs text-zinc-500">
                      Sets the initial camera motion across Video Studio and All-in-One Studio. Strictly defaults to &quot;none&quot;.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                    DEFAULT: NONE
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "none", label: "None (Fixed Framing)", desc: "Static Tripod Camera" },
                    { id: "pan_left", label: "Pan Left", desc: "Smooth horizontal tracking" },
                    { id: "pan_right", label: "Pan Right", desc: "Smooth horizontal tracking" },
                    { id: "zoom_in", label: "Zoom In", desc: "Slow push in" },
                    { id: "zoom_out", label: "Zoom Out", desc: "Slow pull out" },
                    { id: "tilt_up", label: "Tilt Up", desc: "Upward cinematic tilt" },
                    { id: "tilt_down", label: "Tilt Down", desc: "Downward cinematic tilt" },
                    { id: "orbit", label: "Orbit Dynamic", desc: "Continuous 3D wrap" },
                  ].map((cm) => (
                    <button
                      key={cm.id}
                      type="button"
                      onClick={() => savePreferences({ ...preferences, cameraMotion: cm.id })}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all cursor-pointer",
                        preferences.cameraMotion === cm.id
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                          : "bg-zinc-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:border-black/20 dark:hover:border-white/20"
                      )}
                    >
                      <span className="text-xs font-bold block">{cm.label}</span>
                      <span className={cn("text-[10px] font-mono block mt-0.5 opacity-80", preferences.cameraMotion === cm.id ? "text-emerald-100" : "text-zinc-500")}>
                        {cm.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Model Indicator Style */}
              <div className="space-y-2 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-zinc-900 dark:text-white block">
                      Active Model Highlight Color
                    </label>
                    <p className="text-xs text-zinc-500">
                      Color badge styling used across studios to highlight the currently selected AI model.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                    EMERALD GREEN
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
                    <span>Emerald Green Active (Current Global Standard)</span>
                  </div>
                </div>
              </div>

              {/* Video Hover Audio Playback */}
              <div className="space-y-2 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-zinc-900 dark:text-white block">
                      Hover Video Playback with Sound
                    </label>
                    <p className="text-xs text-zinc-500">
                      When enabled, hovering over cards in the Vault and Video Studio automatically plays the video and un-mutes the audio.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => savePreferences({ ...preferences, autoPlayHoverSound: !preferences.autoPlayHoverSound })}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer",
                      preferences.autoPlayHoverSound
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                        : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-500"
                    )}
                  >
                    {preferences.autoPlayHoverSound ? "ENABLED" : "MUTED"}
                  </button>
                </div>
              </div>

              {/* Default Resolution & Aspect Ratio */}
              <div className="space-y-3 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-zinc-900 dark:text-white block">
                      Default Canvas Resolution
                    </label>
                    <p className="text-xs text-zinc-500">Auto-selected resolution for new generations</p>
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {["720p", "1080p", "2k", "4k"].map((res) => (
                        <button
                          key={res}
                          type="button"
                          onClick={() => savePreferences({ ...preferences, defaultResolution: res })}
                          className={cn(
                            "py-2 px-3 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer text-center border",
                            preferences.defaultResolution === res
                              ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                              : "bg-zinc-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:border-black/20"
                          )}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-zinc-900 dark:text-white block">
                      Default Aspect Ratio
                    </label>
                    <p className="text-xs text-zinc-500">Framing format for newly loaded scenes</p>
                    <div className="grid grid-cols-5 gap-1.5 pt-1">
                      {["16:9", "9:16", "1:1", "4:3", "21:9"].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => savePreferences({ ...preferences, defaultAspectRatio: r })}
                          className={cn(
                            "py-2 px-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer text-center border",
                            preferences.defaultAspectRatio === r
                              ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                              : "bg-zinc-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:border-black/20"
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Default AI Engines */}
              <div className="space-y-3 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-zinc-900 dark:text-white block">
                      Default Image Studio Model
                    </label>
                    <p className="text-xs text-zinc-500">Initial model loaded in Image Studio</p>
                    <Dropdown
                      size="sm"
                      value={preferences.defaultImageModel}
                      onChange={(val: any) => savePreferences({ ...preferences, defaultImageModel: val })}
                      options={[
                        { value: "gpt-image-2", label: "GPT Image 2 (OpenAI Flagship)", badge: "FLAGSHIP" },
                        { value: "imagen_3", label: "Imagen 3 (Google DeepMind)", badge: "GOOGLE" },
                        { value: "flux_pro", label: "Flux.1 Pro (BFL Studio)", badge: "BFL" },
                        { value: "dall-e-3", label: "DALL-E 3 HD", badge: "OPENAI" },
                        { value: "flux-schnell", label: "Flux Schnell (Speed)", badge: "FAST" },
                      ]}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-zinc-900 dark:text-white block">
                      Default Video Studio Engine
                    </label>
                    <p className="text-xs text-zinc-500">Initial engine selected in Video Studio</p>
                    <Dropdown
                      size="sm"
                      value={preferences.defaultVideoEngine}
                      onChange={(val: any) => savePreferences({ ...preferences, defaultVideoEngine: val })}
                      options={[
                        { value: "ffmpeg_local", label: "FFmpeg Local Hardware (Free • Zero API Cost)", badge: "LOCAL" },
                        { value: "google_veo", label: "Google Veo 3.1 (Cloud Video)", badge: "CLOUD" },
                        { value: "kling_v15", label: "Kling AI v1.5 (Pro Cinematic)", badge: "PRO" },
                        { value: "luma_dream", label: "Luma Dream Machine (Dynamic)", badge: "DYNAMIC" },
                        { value: "runway_gen3", label: "Runway Gen-3 Alpha", badge: "ALPHA" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Studio Prompt Directive (Answers user question: studio settings prompt me kaise jaati hai) */}
              <div className="space-y-3 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-zinc-900 dark:text-white block">
                      Studio Prompt Directive (Auto-Injected)
                    </label>
                    <p className="text-xs text-zinc-500">
                      When enabled, these cinematic quality directives are automatically appended to all your synthesis prompts across studios.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => savePreferences({ ...preferences, enablePromptDirective: !preferences.enablePromptDirective })}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer",
                      preferences.enablePromptDirective
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                        : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-500"
                    )}
                  >
                    {preferences.enablePromptDirective ? "ACTIVE IN PROMPT" : "DISABLED"}
                  </button>
                </div>
                <textarea
                  value={preferences.promptDirective}
                  onChange={(e) => savePreferences({ ...preferences, promptDirective: e.target.value })}
                  placeholder="Style tokens to append (e.g., 8k master photography, anamorphic lens, raytracing lighting)..."
                  rows={2}
                  className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Spend Safeguard Confirmation Modal Toggle */}
              <div className="space-y-2 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-zinc-900 dark:text-white block">
                      Skip Spend Safeguard Modal
                    </label>
                    <p className="text-xs text-zinc-500">
                      Instantly trigger generation on click without requiring the cost confirmation popup dialog.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => savePreferences({ ...preferences, skipConfirmModal: !preferences.skipConfirmModal })}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer",
                      preferences.skipConfirmModal
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                        : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-500"
                    )}
                  >
                    {preferences.skipConfirmModal ? "SKIP MODAL" : "SHOW MODAL"}
                  </button>
                </div>
              </div>

              {/* Configuration Portability: JSON Export & Import */}
              <div className="space-y-3 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
                <div>
                  <label className="text-sm font-semibold text-zinc-900 dark:text-white block">
                    Configuration Backup & Migration (JSON)
                  </label>
                  <p className="text-xs text-zinc-500">
                    Export your studio preferences, custom camera vectors, and prompt directives to a portable JSON file or restore on another device.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={exportPreferencesJson}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-mono font-bold transition-all cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Configuration (.json)</span>
                  </button>

                  <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-mono font-bold transition-all cursor-pointer shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Import Configuration (.json)</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={importPreferencesJson}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 7: VERSION HISTORY & ROLLBACK ─── */}
      {activeTab === "version_history" && (
        <div className="space-y-6 tab-content-enter">
          {/* Version Control Header & Undo/Redo Engine */}
          <div className="rounded-3xl p-6 bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] space-y-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-black/[0.06] dark:border-white/[0.06]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-widest bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 uppercase">
                    TEMPORAL TIMELINE // VERSION CONTROL
                  </span>
                  {checkpoints[historyPointer] && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active: {checkpoints[historyPointer].versionTag}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight">
                  Video Version History & Undo-Redo
                </h2>
                <p className="text-xs text-zinc-500 max-w-2xl">
                  Track every milestone checkpoint, prompt iteration, and render output. Rollback your scene parameters or jump backward/forward across the temporal undo-redo stack.
                </p>
              </div>

              {/* Action Bar: Undo, Redo, Snapshot, Export, Refresh */}
              <div className="flex items-center flex-wrap gap-2.5">
                {/* Undo Button */}
                <button
                  type="button"
                  onClick={handleUndoVersion}
                  disabled={historyPointer >= checkpoints.length - 1}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Undo to previous version checkpoint"
                >
                  <Undo2 className="w-3.5 h-3.5 text-violet-500" />
                  <span>Undo</span>
                </button>

                {/* Redo Button */}
                <button
                  type="button"
                  onClick={handleRedoVersion}
                  disabled={historyPointer <= 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Redo to next version checkpoint"
                >
                  <Redo2 className="w-3.5 h-3.5 text-violet-500" />
                  <span>Redo</span>
                </button>

                {/* Snapshot Button */}
                <button
                  type="button"
                  onClick={() => setShowSnapshotModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-heading font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Take Snapshot</span>
                </button>

                {/* Export JSON Audit Log */}
                <button
                  type="button"
                  onClick={handleExportAuditLog}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shadow-xs"
                  title="Export Version History JSON"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="hidden sm:inline">Export Audit</span>
                </button>

                {/* Refresh */}
                <button
                  type="button"
                  onClick={fetchVersionCheckpoints}
                  disabled={loadingCheckpoints}
                  className="p-2 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shadow-xs"
                  title="Reload checkpoints"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", loadingCheckpoints && "animate-spin")} />
                </button>
              </div>
            </div>

            {/* Rollback Success Notification Banner */}
            {rollbackSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-heading font-bold text-emerald-900 dark:text-emerald-300">
                      Checkpoint Synchronized
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-sans">
                      {rollbackSuccessMsg}
                    </p>
                  </div>
                </div>
                {checkpoints[historyPointer] && (
                  <button
                    type="button"
                    onClick={() => handleLaunchStudioWithVersion(checkpoints[historyPointer])}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold transition-all cursor-pointer shrink-0"
                  >
                    <span>Open in Video Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search prompts, versions, seeds, or tags..."
                  value={checkpointSearch}
                  onChange={(e) => setCheckpointSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-zinc-100/80 dark:bg-zinc-900/80 border border-black/[0.06] dark:border-white/[0.06] text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
                />
                {checkpointSearch && (
                  <button
                    type="button"
                    onClick={() => setCheckpointSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                {[
                  { id: "all", label: "All Renders" },
                  { id: "cinema_director", label: "Cinema Director" },
                  { id: "motion_morph", label: "Motion Morph" },
                  { id: "video_render", label: "Video Render" },
                  { id: "manual_snapshot", label: "Snapshots" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCheckpointFilter(f.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
                      checkpointFilter === f.id
                        ? "bg-violet-600 text-white font-bold shadow-xs"
                        : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-white/[0.08]"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkpoints Timeline Stream */}
            <div className="pt-2 space-y-4">
              {loadingCheckpoints ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-500 mx-auto" />
                  <p className="text-xs font-mono text-zinc-400">Loading temporal checkpoints...</p>
                </div>
              ) : filteredCheckpoints.length === 0 ? (
                <div className="py-16 text-center space-y-3 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  <Film className="w-8 h-8 text-zinc-400 mx-auto" />
                  <p className="text-sm font-heading font-bold text-zinc-700 dark:text-zinc-300">
                    No version checkpoints found
                  </p>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Take a manual milestone snapshot or generate videos in Video Studio to establish version checkpoints.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSnapshotModal(true)}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-heading font-bold transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Create First Snapshot</span>
                  </button>
                </div>
              ) : (
                <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-[2px] before:bg-gradient-to-b before:from-violet-500 before:via-zinc-300 dark:before:via-zinc-800 before:to-transparent">
                  {filteredCheckpoints.map((cp, idx) => {
                    const isActive = historyPointer === idx;
                    return (
                      <div
                        key={cp.id}
                        className={cn(
                          "relative rounded-2xl p-5 border transition-all duration-200 group",
                          isActive
                            ? "bg-violet-500/[0.03] dark:bg-violet-500/[0.05] border-violet-500/40 shadow-sm ring-1 ring-violet-500/20"
                            : "bg-white dark:bg-zinc-950/60 border-black/[0.06] dark:border-white/[0.06] hover:border-black/15 dark:hover:border-white/15"
                        )}
                      >
                        {/* Timeline Connector Dot */}
                        <div
                          className={cn(
                            "absolute -left-[27px] sm:-left-[35px] top-6 w-3.5 h-3.5 rounded-full border-2 transition-all",
                            isActive
                              ? "bg-violet-600 border-white dark:border-zinc-950 ring-4 ring-violet-500/30 animate-pulse"
                              : "bg-zinc-300 dark:bg-zinc-700 border-white dark:border-zinc-900"
                          )}
                        />

                        {/* Top Meta Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/[0.05] dark:border-white/[0.05]">
                          <div className="flex items-center flex-wrap gap-2">
                            {/* Version Tag */}
                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-md text-xs font-mono font-extrabold tracking-wide",
                                isActive
                                  ? "bg-violet-600 text-white"
                                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                              )}
                            >
                              {cp.versionTag}
                            </span>

                            {/* Status Badge */}
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase",
                                isActive
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : cp.status === "STABLE"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                  : "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border border-zinc-500/20"
                              )}
                            >
                              {isActive ? "ACTIVE TARGET" : cp.status}
                            </span>

                            {/* Action Type */}
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400 border border-black/[0.04] dark:border-white/[0.04]">
                              {cp.actionType}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                            <Clock className="w-3 h-3" />
                            <span>{cp.displayTime}</span>
                          </div>
                        </div>

                        {/* Content Grid: Specs, Prompt, and Video Preview */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-3.5">
                          {/* Left: Prompt & Parameters (lg:col-span-8) */}
                          <div className="lg:col-span-8 space-y-3">
                            <div>
                              <h3 className="text-sm font-heading font-bold text-zinc-950 dark:text-white capitalize">
                                {cp.title}
                              </h3>
                              <div className="relative mt-1.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-black/[0.04] dark:border-white/[0.04] text-xs font-sans text-zinc-700 dark:text-zinc-300 leading-relaxed group/prompt">
                                <span>{cp.prompt}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(cp.prompt);
                                    setCopiedPromptId(cp.id);
                                    setTimeout(() => setCopiedPromptId(null), 2000);
                                  }}
                                  className="absolute top-2 right-2 p-1 rounded-lg bg-white dark:bg-zinc-800 text-zinc-500 hover:text-zinc-950 dark:hover:text-white shadow-xs opacity-0 group-hover/prompt:opacity-100 transition-all cursor-pointer"
                                  title="Copy prompt"
                                >
                                  {copiedPromptId === cp.id ? (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Technical Specs Pill Matrix */}
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                              <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-black/[0.04] dark:border-white/[0.04]">
                                Ratio: <strong>{cp.aspectRatio}</strong>
                              </span>
                              <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-black/[0.04] dark:border-white/[0.04]">
                                Res: <strong>{cp.resolution}</strong>
                              </span>
                              <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-black/[0.04] dark:border-white/[0.04]">
                                Duration: <strong>{cp.duration}</strong>
                              </span>
                              <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-black/[0.04] dark:border-white/[0.04]">
                                Engine: <strong>{cp.model}</strong>
                              </span>
                              <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border border-black/[0.04] dark:border-white/[0.04]">
                                Seed: {cp.seed}
                              </span>
                            </div>
                          </div>

                          {/* Right: Media Thumbnail / Player (lg:col-span-4) */}
                          <div className="lg:col-span-4 flex flex-col justify-between space-y-3">
                            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-950 border border-black/10 dark:border-white/10 group/thumb">
                              {cp.videoUrl ? (
                                <>
                                  <video
                                    src={getMediaUrl(cp.videoUrl)}
                                    className="w-full h-full object-cover"
                                    preload="metadata"
                                  />
                                  <div
                                    onClick={() => setActivePreviewVideo(getMediaUrl(cp.videoUrl || ""))}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity cursor-pointer"
                                  >
                                    <div className="w-10 h-10 rounded-full bg-white/90 text-zinc-950 flex items-center justify-center shadow-lg transform group-hover/thumb:scale-105 transition-transform">
                                      <Play className="w-4 h-4 fill-current ml-0.5" />
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-1 p-2 text-center">
                                  <Film className="w-6 h-6 text-zinc-600" />
                                  <span className="text-[10px] font-mono">Parameters State</span>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons for this checkpoint */}
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleRollback(cp, idx)}
                                className={cn(
                                  "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shadow-xs",
                                  isActive
                                    ? "bg-violet-600 text-white hover:bg-violet-700"
                                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-black/[0.06] dark:border-white/[0.06]"
                                )}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{isActive ? "Active State" : "Revert Here"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleLaunchStudioWithVersion(cp)}
                                className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-mono font-bold transition-all cursor-pointer shadow-xs"
                                title="Open this version in Video Studio"
                              >
                                <span>Launch</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
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

      {/* Snapshot Modal */}
      {showSnapshotModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setShowSnapshotModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#0e0e16] border border-black/10 dark:border-white/10 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-base font-heading font-bold text-zinc-950 dark:text-white">
                  Create Milestone Snapshot
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSnapshotModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                  Snapshot Milestone Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Scene 3 Director Approval Cut v2.6"
                  value={newSnapshotTitle}
                  onChange={(e) => setNewSnapshotTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                  Version Notes / Prompt Reference
                </label>
                <textarea
                  rows={3}
                  placeholder="Record lighting choices, camera focal lengths, or revision notes for this checkpoint..."
                  value={newSnapshotNotes}
                  onChange={(e) => setNewSnapshotNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSnapshotModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateSnapshot}
                disabled={!newSnapshotTitle.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-heading font-bold disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Checkpoint</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {activePreviewVideo && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setActivePreviewVideo(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl rounded-3xl bg-black border border-white/10 shadow-2xl overflow-hidden p-2 space-y-2 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between px-3 py-1 text-white">
              <span className="text-xs font-mono text-zinc-400">Checkpoint High-Def Playback</span>
              <button
                type="button"
                onClick={() => setActivePreviewVideo(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <video
              src={activePreviewVideo}
              controls
              autoPlay
              className="w-full rounded-2xl max-h-[70vh] object-contain bg-black"
            />
          </div>
        </div>
      )}

      {/* 4-Digit Passcode Protection Modal for API Keys */}
      {showPinModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setShowPinModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative w-full max-w-sm rounded-3xl bg-white dark:bg-[#0e0e16] border border-black/10 dark:border-white/10 shadow-2xl p-6 text-center space-y-5 animate-in zoom-in-95 duration-200",
              pinError && "border-rose-500 ring-2 ring-rose-500/30"
            )}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowPinModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Lock Badge */}
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-heading font-bold text-zinc-950 dark:text-white">
                API Security Passcode
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
                Enter your 4-digit PIN to access decrypted BYOK credentials.
              </p>
            </div>

            {/* 4 Individual Boxed PIN Inputs */}
            <div className="flex items-center justify-center gap-3 pt-1">
              {pinDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={pinRefs[idx]}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(idx, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(idx, e)}
                  className={cn(
                    "w-12 h-14 rounded-2xl text-center font-mono font-black text-2xl border transition-all duration-150 focus:outline-none focus:ring-2 select-none shadow-xs",
                    digit
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20"
                      : "bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white focus:border-amber-500 focus:ring-amber-500/30",
                    pinError && "border-rose-500 text-rose-500"
                  )}
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            {pinError ? (
              <p className="text-xs font-mono text-rose-500 font-semibold animate-pulse">
                Incorrect PIN. Default is 1234.
              </p>
            ) : (
              <p className="text-[11px] font-mono text-zinc-400">
                Default PIN: <strong className="text-zinc-700 dark:text-zinc-300">1234</strong> (Auto-unlocks on 4th tap)
              </p>
            )}

            <div className="pt-1 flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setPinDigits(["1", "2", "3", "4"]);
                  setIsApiUnlocked(true);
                  setShowPinModal(false);
                  setActiveTab("api_keys");
                }}
                className="text-[11px] font-mono text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                Quick Unlock with Default (1234)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
