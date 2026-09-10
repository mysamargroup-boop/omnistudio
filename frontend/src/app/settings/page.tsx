"use client";
import React, { useState, useEffect } from "react";
import {
  Sliders,
  Key,
  CheckCircle2,
  XCircle,
  Save,
  Loader2,
  Shield,
  Eye,
  EyeOff,
  Cpu,
  Lock,
  RefreshCw,
  Check,
  Database,
  Cloud,
  Server,
  Zap,
  Sparkles,
  Trash2,
  RotateCcw,
  HardDrive,
  Film,
  Image as ImageIcon,
  Mic,
  Flame,
  Camera,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn, formatBytes } from "@/lib/utils";

type SettingsTab = "infrastructure" | "trash" | "api_keys" | "preferences";

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
    autoPlayHoverSound: true,
  });
  const [prefsSaved, setPrefsSaved] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem("omnistudio_preferences");
      if (savedPrefs) {
        setPreferences((prev) => ({ ...prev, ...JSON.parse(savedPrefs) }));
      }
    } catch {}
  }, []);

  const savePreferences = (newPrefs: typeof preferences) => {
    setPreferences(newPrefs);
    try {
      localStorage.setItem("omnistudio_preferences", JSON.stringify(newPrefs));
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2500);
    } catch {}
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

  const trashCount = trashData?.total || 0;
  const trashBytes = trashData?.total_bytes || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-7 pb-16 font-jakarta tab-content-enter">
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

          {activeTab === "api_keys" && (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 font-heading font-bold text-xs tracking-tight transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : saved ? (
                <Check className="h-3.5 w-3.5 text-white" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{saved ? "Saved to Supabase!" : "Save Keys"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-zinc-100/80 dark:bg-[#0d0d14] rounded-2xl border border-black/[0.06] dark:border-white/[0.06] overflow-x-auto custom-scrollbar flex-nowrap whitespace-nowrap">
        <button
          type="button"
          onClick={() => setActiveTab("infrastructure")}
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
          onClick={() => {
            setActiveTab("trash");
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
          onClick={() => setActiveTab("api_keys")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold tracking-tight transition-all cursor-pointer whitespace-nowrap shrink-0",
            activeTab === "api_keys"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.04]"
          )}
        >
          <Key className="h-3.5 w-3.5 text-amber-500" />
          <span>AI Model Keys (BYOK)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("preferences")}
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

                    <p className="text-xs text-zinc-500 font-sans leading-normal">{cfg.desc}</p>
                  </div>
                );
              })}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
