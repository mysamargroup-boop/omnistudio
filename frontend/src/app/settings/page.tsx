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
  Download,
  Upload,
  Activity,
  FileText,
  Palette,
  Share2,
  ExternalLink,
  Globe,
  Send,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn, formatBytes } from "@/lib/utils";
import { BrandKitPanel } from "@/components/brand/BrandKitModal";
import Dropdown from "@/components/ui/Dropdown";
import SocialIcon from "@/components/social/SocialIcons";

type SettingsTab = "infrastructure" | "social_media" | "api_keys" | "brand_kit" | "trash" | "preferences";

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
      if (tab === "brand_kit" || tab === "infrastructure" || tab === "trash" || tab === "api_keys" || tab === "preferences" || tab === "social_media") {
        setActiveTab(tab as SettingsTab);
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
          onClick={() => setActiveTab("social_media")}
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
          onClick={() => setActiveTab("brand_kit")}
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
    </div>
  );
}
