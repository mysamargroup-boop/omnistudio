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
  Sparkles
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
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

  const fetchStatus = async () => {
    try {
      const [statusData, keysData] = await Promise.allSettled([
        api.getStatus(),
        api.getKeys(),
      ]);
      if (statusData.status === "fulfilled") {
        setStatus(statusData.value);
        if (statusData.value.database) setDbResult(statusData.value.database);
        if (statusData.value.storage) setR2Result(statusData.value.storage);
      }
      if (keysData.status === "fulfilled" && keysData.value) {
        if (keysData.value.masked_keys) setMaskedKeys(keysData.value.masked_keys);
        if (keysData.value.source) setKeySource(keysData.value.source);
      }
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
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

  const toggleShow = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
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
      statusKey: "openai" 
    },
    { 
      key: "GEMINI_API_KEY", 
      label: "Google Gemini API Key", 
      desc: "Powers Google Imagen 3 diffusion, Google Veo video, and multimodal analysis.", 
      statusKey: "gemini" 
    },
    { 
      key: "ELEVENLABS_API_KEY", 
      label: "ElevenLabs API Key (Optional)", 
      desc: "Ultra-realistic studio voice cloning and custom vocal synthesis. (Edge Neural TTS is free fallback).", 
      statusKey: "elevenlabs" 
    },
    { 
      key: "REPLICATE_API_TOKEN", 
      label: "Replicate API Token (Optional)", 
      desc: "Black Forest Labs Flux Schnell diffusion and cloud video choreographers (Kling, Luma, Minimax).", 
      statusKey: "replicate" 
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Database Synced: {keySource}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight">
            BYOK & Cloud Settings
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your AI model API credentials and persistent storage. All keys are securely stored in your Supabase database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={testConnection}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", testing && "animate-spin")} />
            <span>Test Health</span>
          </button>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-black font-semibold text-xs hover:opacity-90 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{saved ? "Saved to Supabase!" : "Save Keys"}</span>
          </button>
        </div>
      </div>

      {/* Compute Runtime Telemetry */}
      <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0c0c12] border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cpu className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            <h2 className="text-sm font-heading font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Compute & Engine Runtime
            </h2>
          </div>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#121218] border border-zinc-200/80 dark:border-zinc-800/80 space-y-1">
            <span className="text-xs text-zinc-500 font-medium">Video Compiler</span>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-bold text-zinc-950 dark:text-white">FFmpeg 5.1 / 8.1</span>
            </div>
            <p className="text-xs text-zinc-400 truncate">Hardware accelerated local engine</p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#121218] border border-zinc-200/80 dark:border-zinc-800/80 space-y-1">
            <span className="text-xs text-zinc-500 font-medium">Database Storage</span>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-bold text-zinc-950 dark:text-white truncate">
                Supabase Cloud PostgreSQL
              </span>
            </div>
            <p className="text-xs text-zinc-400">Synced with studio_settings table</p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#121218] border border-zinc-200/80 dark:border-zinc-800/80 space-y-1">
            <span className="text-xs text-zinc-500 font-medium">Asset Storage</span>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-bold text-zinc-950 dark:text-white">
                Hostinger 100GB SSD
              </span>
            </div>
            <p className="text-xs text-zinc-400">Local NVMe + Cloudflare R2</p>
          </div>
        </div>
      </div>

      {/* AI Model API Keys */}
      <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0c0c12] border border-zinc-200 dark:border-zinc-800 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <Key className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            <h2 className="text-sm font-heading font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              AI Model API Keys (BYOK)
            </h2>
          </div>
          <span className="text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-700">
            Synced from Supabase
          </span>
        </div>

        <div className="space-y-5">
          {aiKeyConfigs.map((cfg) => {
            const isConfigured = status?.keys?.[cfg.statusKey];
            const maskedVal = maskedKeys[cfg.key];

            return (
              <div key={cfg.key} className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {cfg.label}
                  </label>
                  <span
                    className={cn(
                      "text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5",
                      isConfigured
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border-zinc-200 dark:border-zinc-800"
                    )}
                  >
                    {isConfigured ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Active in Supabase</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Not Configured</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showKeys[cfg.key] ? "text" : "password"}
                    value={keys[cfg.key as keyof typeof keys]}
                    onChange={(e) =>
                      setKeys((prev) => ({ ...prev, [cfg.key]: e.target.value }))
                    }
                    placeholder={
                      maskedVal
                        ? `${maskedVal} (Active from Supabase)`
                        : "Enter API key to save in Supabase..."
                    }
                    className="w-full bg-zinc-50 dark:bg-[#121218] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 pr-10 text-sm text-zinc-950 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShow(cfg.key)}
                    className="absolute right-3 text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer p-1"
                    title={showKeys[cfg.key] ? "Hide Key" : "Show Key"}
                  >
                    {showKeys[cfg.key] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-zinc-500 font-sans leading-normal">
                  {cfg.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cloud Object Storage (Cloudflare R2) */}
      <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0c0c12] border border-zinc-200 dark:border-zinc-800 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
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
            className="text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white flex items-center gap-1.5 transition-colors border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
          >
            {testingR2 ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cloud className="h-3.5 w-3.5 text-cyan-500" />}
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
              className="w-full bg-zinc-50 dark:bg-[#121218] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">R2 BUCKET NAME</label>
            <input
              type="text"
              value={keys.R2_BUCKET_NAME}
              onChange={(e) => setKeys((prev) => ({ ...prev, R2_BUCKET_NAME: e.target.value }))}
              placeholder={maskedKeys["R2_BUCKET_NAME"] || "omnistudio-assets"}
              className="w-full bg-zinc-50 dark:bg-[#121218] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">R2 ACCESS KEY ID</label>
            <input
              type="text"
              value={keys.R2_ACCESS_KEY_ID}
              onChange={(e) => setKeys((prev) => ({ ...prev, R2_ACCESS_KEY_ID: e.target.value }))}
              placeholder={maskedKeys["R2_ACCESS_KEY_ID"] ? `${maskedKeys["R2_ACCESS_KEY_ID"]} (from Supabase)` : "Access Key"}
              className="w-full bg-zinc-50 dark:bg-[#121218] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">R2 SECRET ACCESS KEY</label>
            <input
              type="password"
              value={keys.R2_SECRET_ACCESS_KEY}
              onChange={(e) => setKeys((prev) => ({ ...prev, R2_SECRET_ACCESS_KEY: e.target.value }))}
              placeholder={maskedKeys["R2_SECRET_ACCESS_KEY"] ? "•••••••••••••••• (from Supabase)" : "Secret Key"}
              className="w-full bg-zinc-50 dark:bg-[#121218] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

    </div>
  );
}
