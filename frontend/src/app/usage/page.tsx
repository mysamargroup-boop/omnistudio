'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  DollarSign,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Image as ImageIcon,
  Video,
  Mic,
  Cpu,
  Trash2,
  HelpCircle,
  Zap,
  Info,
  SlidersHorizontal,
  FileSpreadsheet,
  Coins,
  Loader2,
  X,
  Share2,
  Heart,
  Users,
  BarChart3,
  ArrowRight,
  Eye,
  Globe,
  MessageCircle,
} from 'lucide-react';
import { api, getMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';

interface UsageSummary {
  total_generations: number;
  total_spend_usd: number;
  total_spend_inr: number;
  total_saved_usd: number;
  total_saved_inr: number;
  usd_to_inr: number;
  by_service: {
    image: { count: number; spend_usd: number; spend_inr: number };
    video: { count: number; spend_usd: number; spend_inr: number };
    voice: { count: number; spend_usd: number; spend_inr: number };
    pipeline: { count: number; spend_usd: number; spend_inr: number };
  };
  by_provider: Record<string, { count: number; spend_usd: number; spend_inr: number }>;
  latest_generation: any;
  success_rate?: number;
  successful_generations?: number;
  failed_generations?: number;
  most_used_models?: Array<{
    model: string;
    provider: string;
    service_type: string;
    count: number;
    success_count: number;
  }>;
}

interface GenerationRecord {
  id: string;
  timestamp: string;
  display_time: string;
  service_type: string;
  provider: string;
  model: string;
  prompt: string;
  full_prompt?: string;
  specs: Record<string, any>;
  cost_usd: number;
  cost_inr: number;
  saved_usd: number;
  saved_inr: number;
  status: string;
  output_url?: string;
  error?: string;
}

interface RateCard {
  provider: string;
  model: string;
  category: string;
  unit: string;
  cost_usd: number;
  cost_inr: number;
  free_tier: string;
  billing_mechanism: string;
  official_url: string;
  status: string;
}

export default function UsagePage() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [configuredKeys, setConfiguredKeys] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View Controls
  const [currency, setCurrency] = useState<'USD' | 'INR'>('INR');
  const [activeTab, setActiveTab] = useState<'history' | 'rates'>('history');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [rateCategoryFilter, setRateCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPromptModal, setSelectedPromptModal] = useState<string | null>(null);

  // Social Publishing Analytics Mode State
  const [dashboardMode, setDashboardMode] = useState<'compute' | 'social'>('compute');
  const [socialAnalytics, setSocialAnalytics] = useState<any>(null);
  const [socialPosts, setSocialPosts] = useState<any[]>([]);
  const [socialRecommendations, setSocialRecommendations] = useState<any>(null);
  const [loadingSocial, setLoadingSocial] = useState(false);

  const fetchSocialData = async () => {
    setLoadingSocial(true);
    try {
      const [analyticsRes, postsRes, recsRes] = await Promise.allSettled([
        api.getPublishAnalytics(),
        api.getPublishPosts(),
        api.getPublishRecommendations(),
      ]);
      if (analyticsRes.status === 'fulfilled') setSocialAnalytics(analyticsRes.value);
      if (postsRes.status === 'fulfilled') {
        const pData = postsRes.value?.posts || postsRes.value || [];
        setSocialPosts(Array.isArray(pData) ? pData : []);
      }
      if (recsRes.status === 'fulfilled') setSocialRecommendations(recsRes.value);
    } catch (err) {
      console.error('Failed to load social analytics:', err);
    } finally {
      setLoadingSocial(false);
    }
  };

  // Restore cached telemetry immediately on mount for zero-latency 0ms render
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('omnistudio_usage_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.summary) setSummary(parsed.summary);
        if (parsed.history) setHistory(parsed.history);
        if (parsed.rateCards) setRateCards(parsed.rateCards);
        setLoading(false);
      }
    } catch {}

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "social") {
        setDashboardMode("social");
        fetchSocialData();
      }
    }
  }, []);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!summary) setLoading(true);

    try {
      // Rapid parallel fetch of usage analytics without waiting on slow Supabase keys
      const [sumRes, histRes, ratesRes] = await Promise.all([
        api.getUsageSummary(),
        api.getUsageHistory(serviceFilter === 'all' ? undefined : serviceFilter, 100),
        api.getRateCards(),
      ]);

      setSummary(sumRes);
      setHistory(histRes.records || []);
      setRateCards(ratesRes.rates || []);
      setLoading(false);

      // Persist to session cache
      try {
        sessionStorage.setItem('omnistudio_usage_cache', JSON.stringify({
          summary: sumRes,
          history: histRes.records || [],
          rateCards: ratesRes.rates || []
        }));
      } catch {}

      // Asynchronously fetch key configuration in background without blocking render
      api.getKeys().then((keysRes) => {
        if (keysRes && keysRes.keys_detail) {
          setConfiguredKeys(keysRes.keys_detail);
        }
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to load usage data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [serviceFilter]);

  const handleClearHistory = async () => {
    if (confirm('Are you sure you want to clear generation telemetry history? This will reset logged usage counts.')) {
      await api.clearUsageHistory();
      fetchData(true);
    }
  };

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(
      (r) =>
        r.model.toLowerCase().includes(q) ||
        r.prompt.toLowerCase().includes(q) ||
        r.provider.toLowerCase().includes(q) ||
        r.service_type.toLowerCase().includes(q)
    );
  }, [history, searchQuery]);

  const filteredRateCards = useMemo(() => {
    if (rateCategoryFilter === 'all') return rateCards;
    return rateCards.filter(
      (rc) =>
        rc.provider.toLowerCase().includes(rateCategoryFilter.toLowerCase()) ||
        rc.category.toLowerCase().includes(rateCategoryFilter.toLowerCase())
    );
  }, [rateCards, rateCategoryFilter]);

  const formatCost = (usd: number, inr: number) => {
    if (currency === 'INR') {
      return `₹${inr.toFixed(2)}`;
    }
    return `$${usd.toFixed(3)}`;
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#06060a] text-zinc-900 dark:text-zinc-100 font-jakarta pb-24 pt-4 selection:bg-violet-500/30">
      
      <div className="relative z-10 max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-10 space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.06] pb-6 pt-2">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
              <p className="text-[10px] font-mono tracking-widest uppercase text-violet-600 dark:text-violet-400 font-semibold">
                STUDIO TELEMETRY // REAL-TIME SPEND & AUDIT INTELLIGENCE
              </p>
            </div>
            <h1 className="text-3xl font-heading font-extrabold tracking-tight text-zinc-950 dark:text-white flex items-center gap-3">
              Usage & Cost Analytics
            </h1>
            <p className="text-sm text-zinc-500 mt-1 max-w-3xl">
              Real-time audit of every generation event, exact spending breakdowns, and official model price benchmarks.
            </p>
          </div>

          {/* Top Actions: Currency Toggle & Refresh */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* Currency Selector */}
            <div className="flex items-center bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl p-1">
              <button
                onClick={() => setCurrency('INR')}
                className={cn(
                  'px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer',
                  currency === 'INR'
                    ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                )}
              >
                ₹ INR
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={cn(
                  'px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer',
                  currency === 'USD'
                    ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                )}
              >
                $ USD
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] border border-transparent rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-all duration-200 cursor-pointer"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              <span>{refreshing ? 'Syncing...' : 'Sync Logs'}</span>
            </button>
          </div>
        </div>

        {/* Primary Dashboard Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-2 rounded-2xl bg-zinc-100/80 dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-1.5 p-1 bg-white/70 dark:bg-black/30 rounded-xl border border-black/[0.04] dark:border-white/[0.04] overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setDashboardMode('compute')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-heading font-bold tracking-tight transition-all cursor-pointer whitespace-nowrap",
                dashboardMode === 'compute'
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
              )}
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-500" />
              <span>AI Compute & Spend</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDashboardMode('social');
                if (!socialAnalytics) fetchSocialData();
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-heading font-bold tracking-tight transition-all cursor-pointer whitespace-nowrap",
                dashboardMode === 'social'
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
              )}
            >
              <Share2 className="w-3.5 h-3.5 text-violet-500" />
              <span>Social Publishing Performance</span>
              {socialAnalytics?.views ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold">
                  {socialAnalytics.views.toLocaleString()} Views
                </span>
              ) : null}
            </button>
          </div>

          <div className="flex items-center gap-3 px-3 self-end sm:self-auto">
            {dashboardMode === 'social' ? (
              <button
                type="button"
                onClick={() => fetchSocialData()}
                disabled={loadingSocial}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-mono font-bold transition-all cursor-pointer shadow-xs"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loadingSocial && "animate-spin")} />
                <span>{loadingSocial ? 'Syncing...' : 'Sync Social Stats'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Real-time Compute Engine</span>
              </div>
            )}
          </div>
        </div>

        {dashboardMode === 'compute' && (
          <>
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Spend */}
          <div className="bg-gradient-to-br from-amber-500/[0.03] via-white dark:via-[#0d0d14] to-transparent border border-zinc-200/80 dark:border-white/[0.08] hover:border-amber-500/40 rounded-2xl p-5 relative overflow-hidden group transition-all duration-200 shadow-sm hover:shadow-md">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-mono mb-2">
              <span className="flex items-center gap-2 uppercase tracking-wider font-semibold text-zinc-800 dark:text-zinc-200">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Coins className="h-4 w-4" />
                </span>
                Total Spend
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ACTIVE
              </span>
            </div>
            <div className="text-3xl font-heading font-black tracking-tight mt-1 bg-gradient-to-r from-zinc-950 via-zinc-800 to-amber-700 dark:from-white dark:via-zinc-100 dark:to-amber-300 bg-clip-text text-transparent">
              {summary ? formatCost(summary.total_spend_usd, summary.total_spend_inr) : '₹0.00'}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-2.5 font-mono">
              <span>Equivalent:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                {summary
                  ? currency === 'INR'
                    ? `$${summary.total_spend_usd.toFixed(3)} USD`
                    : `₹${summary.total_spend_inr.toFixed(2)} INR`
                  : '$0.00'}
              </span>
            </div>
          </div>

          {/* Card 2: Total Generations */}
          <div className="bg-gradient-to-br from-blue-500/[0.04] via-white dark:via-[#0d0d14] to-transparent border border-blue-500/30 dark:border-blue-500/30 hover:border-blue-500/60 rounded-2xl p-5 relative overflow-hidden group transition-all duration-200 shadow-sm hover:shadow-md ring-1 ring-blue-500/10">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-mono mb-2">
              <span className="flex items-center gap-2 uppercase tracking-wider font-semibold text-zinc-800 dark:text-zinc-200">
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Zap className="h-4 w-4" />
                </span>
                Generations Run
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                AUDITED
              </span>
            </div>
            <div className="text-3xl font-heading font-black text-blue-600 dark:text-blue-400 tracking-tight mt-1">
              {summary ? summary.total_generations : 0}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono mt-2.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 font-bold">
                Img: {summary?.by_service?.image?.count || 0}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20 font-bold">
                Vid: {summary?.by_service?.video?.count || 0}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 font-bold">
                Audio: {summary?.by_service?.voice?.count || 0}
              </span>
            </div>
          </div>

          {/* Card 3: Free Savings via Local Hardware */}
          <div className="bg-gradient-to-br from-emerald-500/[0.05] via-white dark:via-[#0d0d14] to-transparent border border-emerald-500/30 dark:border-emerald-500/20 hover:border-emerald-500/50 rounded-2xl p-5 relative overflow-hidden group transition-all duration-200 shadow-sm hover:shadow-md ring-1 ring-emerald-500/10">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-mono mb-2">
              <span className="flex items-center gap-2 uppercase tracking-wider font-semibold text-zinc-800 dark:text-zinc-200">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                In-House Savings
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SAVED
              </span>
            </div>
            <div className="text-3xl font-heading font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-1">
              {summary ? formatCost(summary.total_saved_usd, summary.total_saved_inr) : '₹0.00'}
            </div>
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-2.5 font-jakarta flex items-center gap-1 flex-wrap">
              <span>Saved via</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono text-[10px]">
                Local FFmpeg 8.1
              </span>
              <span>&</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono text-[10px]">
                Edge Neural TTS
              </span>
            </div>
          </div>

          {/* Card 4: Multi-Provider AI Engine Suite */}
          <div className="bg-gradient-to-br from-teal-500/[0.03] via-white dark:via-[#0d0d14] to-transparent border border-teal-500/30 dark:border-teal-500/20 hover:border-teal-500/50 rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-all duration-200 shadow-sm hover:shadow-md">
            <div className="flex items-center justify-between text-xs font-mono mb-2.5 gap-2">
              <span className="flex items-center gap-2 uppercase tracking-wider font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
                  <Activity className="h-3.5 w-3.5" />
                </span>
                AI Engines
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 whitespace-nowrap shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                MULTI-PROVIDER
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs font-mono py-0.5">
                <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 min-w-0 truncate">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", configuredKeys["OPENAI_API_KEY"]?.configured !== false ? "bg-emerald-500 animate-pulse" : "bg-zinc-400")} />
                  <span className="truncate" title="OpenAI GPT-4o, DALL-E">OpenAI (GPT-4o)</span>
                </span>
                <span className={cn("text-[10px] font-bold whitespace-nowrap shrink-0 px-2 py-0.5 rounded-md font-mono border", configuredKeys["OPENAI_API_KEY"]?.configured !== false ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700")}>
                  {configuredKeys["OPENAI_API_KEY"]?.configured !== false ? "ACTIVE" : "STANDBY"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs font-mono py-0.5">
                <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 min-w-0 truncate">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", configuredKeys["GEMINI_API_KEY"]?.configured !== false ? "bg-emerald-500 animate-pulse" : "bg-zinc-400")} />
                  <span className="truncate" title="Google Gemini 2.5, Veo">Google (Gemini)</span>
                </span>
                <span className={cn("text-[10px] font-bold whitespace-nowrap shrink-0 px-2 py-0.5 rounded-md font-mono border", configuredKeys["GEMINI_API_KEY"]?.configured !== false ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700")}>
                  {configuredKeys["GEMINI_API_KEY"]?.configured !== false ? "ACTIVE" : "STANDBY"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs font-mono py-0.5">
                <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 min-w-0 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate" title="Edge Neural Audio TTS">Edge Neural TTS</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 font-mono">
                  100% FREE
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs font-mono py-0.5">
                <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 min-w-0 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate" title="FFmpeg 8.1 Motion Engine">FFmpeg 8.1 Local</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 font-mono">
                  LOCAL FREE
                </span>
              </div>
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2.5 font-mono flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-white/[0.06]">
              <span className="flex items-center gap-1.5 truncate text-zinc-800 dark:text-zinc-200 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">Multimodal AI Suite</span>
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider shrink-0 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Operational Analytics: Success Rate & Most Used Models */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Success Rate & Reliability Card */}
          <div className="lg:col-span-4 bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Pipeline Reliability
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                HEALTHY
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-heading font-black text-zinc-950 dark:text-white">
                {summary?.success_rate !== undefined ? `${summary.success_rate}%` : "100%"}
              </span>
              <span className="text-xs text-zinc-500 font-medium">Generation Success Rate</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-white/5 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, summary?.success_rate ?? 100))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1">
              <span>Successful: {summary?.successful_generations ?? (summary?.total_generations || 0)}</span>
              <span>Failed / Retried: {summary?.failed_generations ?? 0}</span>
            </div>
          </div>

          {/* Top Most Used Models Leaderboard */}
          <div className="lg:col-span-8 bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-500" /> Most Used AI Models Ranking
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                Top Production Engines
              </span>
            </div>
            {summary?.most_used_models && summary.most_used_models.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {summary.most_used_models.slice(0, 6).map((m, idx) => (
                  <div
                    key={m.model}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.02] flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-zinc-900 dark:text-white truncate max-w-[130px]">
                          {m.model}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
                        {m.provider} • {m.service_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white font-mono">
                        {m.count}
                      </span>
                      <span className="text-[10px] text-zinc-400 block">runs</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-zinc-400 font-mono">
                Ready for first generation run telemetry
              </div>
            )}
          </div>
        </div>

        {/* Primary View Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-white/[0.04] p-1 rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all duration-200 cursor-pointer',
                activeTab === 'history'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-sm font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              )}
            >
              <Clock className="h-4 w-4" />
              <span>Generation Activity Audit ({filteredHistory.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('rates')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all duration-200 cursor-pointer',
                activeTab === 'rates'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-sm font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              )}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Official Model Rate Cards ({rateCards.length})</span>
            </button>
          </div>

          {/* Quick Clear Button (Only on History tab) */}
          {activeTab === 'history' && history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-rose-600 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all font-mono self-end cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Audit Log</span>
            </button>
          )}
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 1: GENERATION ACTIVITY AUDIT LOG                          */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Service Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {['all', 'image', 'video', 'voice', 'pipeline'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setServiceFilter(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap',
                      serviceFilter === s
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-500/20'
                        : 'bg-zinc-50 dark:bg-white/[0.04] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 border border-black/[0.06] dark:border-white/[0.06]'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[240px]">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter by prompt, model, provider..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all duration-200"
                />
              </div>
            </div>

            {/* Table with strict Montserrat font styling */}
            <div className="overflow-x-auto rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0d0d14] shadow-sm">
              <table className="w-full text-left text-xs" style={{ fontFamily: 'var(--font-montserrat), Montserrat, sans-serif' }}>
                <thead className="bg-zinc-50 dark:bg-[#111118] text-zinc-500 text-[11px] uppercase tracking-wider border-b border-black/[0.08] dark:border-white/[0.08]" style={{ fontFamily: 'var(--font-montserrat), Montserrat, sans-serif' }}>
                  <tr>
                    <th className="py-3 px-4 font-bold">Time</th>
                    <th className="py-3 px-4 font-bold">Service & Provider</th>
                    <th className="py-3 px-4 font-bold">Model Engine</th>
                    <th className="py-3 px-4 font-bold">Prompt / Specs</th>
                    <th className="py-3 px-4 text-right font-bold">Spend</th>
                    <th className="py-3 px-4 text-center font-bold">Status</th>
                    <th className="py-3 px-4 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]" style={{ fontFamily: 'var(--font-montserrat), Montserrat, sans-serif' }}>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-500">
                        <Spinner size="lg" variant="violet" className="mx-auto mb-2" />
                        <p className="font-semibold text-xs text-zinc-600 dark:text-zinc-400">Loading generation records...</p>
                      </td>
                    </tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-500 font-medium">
                        No generation records found. Run an image, video, or voice generation to see telemetry.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item) => {
                      const isFree = item.cost_usd === 0;
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors group"
                        >
                          {/* Time */}
                          <td className="py-3.5 px-4 text-zinc-500 whitespace-nowrap font-medium text-xs">
                            {item.display_time || item.timestamp.slice(11, 19)}
                          </td>

                          {/* Service & Provider */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {item.service_type === 'image' && <ImageIcon className="h-4 w-4 text-violet-500" />}
                              {item.service_type === 'video' && <Video className="h-4 w-4 text-blue-500" />}
                              {item.service_type === 'voice' && <Mic className="h-4 w-4 text-emerald-500" />}
                              {item.service_type === 'pipeline' && <Layers className="h-4 w-4 text-amber-500" />}
                              <span className="font-bold text-zinc-900 dark:text-zinc-200 uppercase text-[11px] tracking-wide">
                                {item.service_type}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/[0.06] font-semibold text-zinc-600 dark:text-zinc-400 border border-black/[0.04] dark:border-white/[0.04]">
                                {item.provider}
                              </span>
                            </div>
                          </td>

                          {/* Model Engine */}
                          <td className="py-3.5 px-4 text-zinc-800 dark:text-zinc-200 font-semibold whitespace-nowrap text-xs">
                            {item.model}
                          </td>

                          {/* Prompt & Specs */}
                          <td className="py-3.5 px-4 max-w-xl">
                            <div
                              onClick={() => setSelectedPromptModal(item.full_prompt || item.prompt)}
                              className="text-zinc-700 dark:text-zinc-300 truncate cursor-pointer hover:text-violet-600 dark:hover:text-violet-400 transition-colors font-medium"
                              title="Click to view full prompt"
                            >
                              "{item.prompt || 'No prompt specified'}"
                            </div>
                            {item.specs && Object.keys(item.specs).length > 0 && (
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500 font-medium">
                                {item.specs.resolution && <span>Res: {item.specs.resolution}</span>}
                                {item.specs.duration && <span>• {item.specs.duration}s</span>}
                                {item.specs.motion && <span>• Motion: {item.specs.motion}</span>}
                                {item.specs.quality && <span>• {item.specs.quality}</span>}
                                {item.specs.characters && <span>• {item.specs.characters} chars</span>}
                              </div>
                            )}
                          </td>

                          {/* Spend */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {isFree ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20 text-[11px]">
                                FREE (₹0)
                              </span>
                            ) : (
                              <div>
                                <span className="font-extrabold text-zinc-950 dark:text-white text-xs">
                                  {formatCost(item.cost_usd, item.cost_inr)}
                                </span>
                                <div className="text-[10px] text-zinc-500 font-medium">
                                  {currency === 'INR' ? `$${item.cost_usd.toFixed(3)}` : `₹${item.cost_inr.toFixed(2)}`}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {item.status === 'success' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                SUCCESS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                FAILED
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {item.output_url ? (
                              <a
                                href={getMediaUrl(item.output_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                              >
                                <span>Inspect</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-zinc-400 text-xs font-semibold">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: OFFICIAL MODEL RATE CARDS TABLE                        */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'rates' && (
          <div className="space-y-6">
            {/* Provider Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-zinc-500 mr-2 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Provider:
              </span>
              {[
                { id: 'all', label: 'All Providers' },
                { id: 'Google', label: 'Google AI Studio' },
                { id: 'OpenAI', label: 'OpenAI API' },
                { id: 'Replicate', label: 'Replicate / Flux' },
                { id: 'ElevenLabs', label: 'ElevenLabs' },
                { id: 'Local', label: 'In-House Hardware (Free)' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setRateCategoryFilter(p.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all duration-200 cursor-pointer border',
                    rateCategoryFilter === p.id
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-zinc-50 dark:bg-white/[0.04] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 border-black/[0.06] dark:border-white/[0.06]'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Comprehensive Rates Table with strict Montserrat font */}
            <div className="overflow-x-auto rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0d0d14] shadow-sm">
              <table className="w-full text-left text-xs" style={{ fontFamily: 'var(--font-montserrat), Montserrat, sans-serif' }}>
                <thead className="bg-zinc-50 dark:bg-[#111118] text-zinc-500 text-[11px] uppercase tracking-wider border-b border-black/[0.08] dark:border-white/[0.08]" style={{ fontFamily: 'var(--font-montserrat), Montserrat, sans-serif' }}>
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Provider</th>
                    <th className="py-3.5 px-4 font-bold">Model Engine</th>
                    <th className="py-3.5 px-4 font-bold">Category</th>
                    <th className="py-3.5 px-4 font-bold">Billing Metric</th>
                    <th className="py-3.5 px-4 text-right font-bold">Cost (USD)</th>
                    <th className="py-3.5 px-4 text-right font-bold">Cost (INR)</th>
                    <th className="py-3.5 px-4 font-bold">Free Quota / Tier</th>
                    <th className="py-3.5 px-4 font-bold">How Billing Works & Spends Analysis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]" style={{ fontFamily: 'var(--font-montserrat), Montserrat, sans-serif' }}>
                  {filteredRateCards.map((rc, idx) => {
                    const isZero = rc.cost_usd === 0;
                    return (
                      <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors">
                        {/* Provider */}
                        <td className="py-4 px-4 whitespace-nowrap font-semibold text-zinc-700 dark:text-zinc-300 text-xs">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-md text-[10px] font-bold border',
                              rc.provider.includes('Google') && 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
                              rc.provider.includes('OpenAI') && 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
                              rc.provider.includes('Replicate') && 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20',
                              rc.provider.includes('Eleven') && 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
                              rc.provider.includes('Local') && 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-900 dark:text-zinc-100 border-black/[0.08] dark:border-white/[0.08] font-extrabold'
                            )}
                          >
                            {rc.provider}
                          </span>
                        </td>

                        {/* Model */}
                        <td className="py-4 px-4 font-bold text-zinc-950 dark:text-white whitespace-nowrap text-xs">
                          {rc.model}
                        </td>

                        {/* Category */}
                        <td className="py-4 px-4 text-zinc-500 whitespace-nowrap font-medium text-xs">
                          {rc.category}
                        </td>

                        {/* Billing Metric */}
                        <td className="py-4 px-4 text-zinc-700 dark:text-zinc-300 whitespace-nowrap font-medium text-xs">
                          {rc.unit}
                        </td>

                        {/* Cost USD */}
                        <td className="py-4 px-4 text-right whitespace-nowrap font-bold text-xs">
                          {isZero ? (
                            <span className="text-emerald-600 dark:text-emerald-400">$0.00</span>
                          ) : (
                            <span className="text-zinc-950 dark:text-white">${rc.cost_usd.toFixed(3)}</span>
                          )}
                        </td>

                        {/* Cost INR */}
                        <td className="py-4 px-4 text-right whitespace-nowrap font-bold text-xs">
                          {isZero ? (
                            <span className="text-emerald-600 dark:text-emerald-400">₹0.00 (FREE)</span>
                          ) : (
                            <span className="text-violet-600 dark:text-violet-400">₹{rc.cost_inr.toFixed(2)}</span>
                          )}
                        </td>

                        {/* Free Quota */}
                        <td className="py-4 px-4 text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap font-medium">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.06] text-[11px] font-semibold">
                            {rc.free_tier}
                          </span>
                        </td>

                        {/* Billing Mechanism & Explanation */}
                        <td className="py-4 px-4 text-xs text-zinc-500 max-w-xl leading-relaxed font-medium">
                          {rc.billing_mechanism}
                          <div className="mt-1">
                            <a
                              href={rc.official_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors inline-flex items-center gap-1 font-semibold"
                            >
                              <span>Official Docs</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Smart Spending Strategy Callouts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <div className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-500/10">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  Tip 1: Image Generation
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                  Google Gemini 2.5 Flash Image costs approx <span className="text-zinc-950 dark:text-white font-mono font-bold bg-zinc-100 dark:bg-white/[0.06] px-1 rounded">₹2.50 ($0.030)</span> per image vs DALL-E 3 HD at <span className="text-zinc-950 dark:text-white font-mono font-bold bg-zinc-100 dark:bg-white/[0.06] px-1 rounded">₹6.68 ($0.080)</span>. Using Gemini gives you faster generation and cuts image costs by 62%.
                </p>
              </div>

              <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  Tip 2: Video Motion
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                  Cloud video engines like Google Veo cost <span className="text-zinc-950 dark:text-white font-mono font-bold bg-zinc-100 dark:bg-white/[0.06] px-1 rounded">₹50 ($0.60)</span> per 4-second clip. Our Local FFmpeg 8.1 Motion Engine generates 1080p camera motion at <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold bg-emerald-50 dark:bg-emerald-500/10 px-1 rounded border border-emerald-200 dark:border-emerald-500/20">₹0.00 cost</span> on your local hardware.
                </p>
              </div>

              <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10">
                    <Mic className="h-4 w-4" />
                  </div>
                  Tip 3: Audio & Voice
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                  Microsoft Edge Neural TTS is completely <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold bg-emerald-50 dark:bg-emerald-500/10 px-1 rounded border border-emerald-200 dark:border-emerald-500/20">FREE & UNLIMITED</span> with zero API keys. Use ElevenLabs only when specialized voice cloning or custom emotion modulation is explicitly needed.
                </p>
              </div>
            </div>
          </div>
        )}
        </>
      )}

        {/* ─── SOCIAL PUBLISHING PERFORMANCE DASHBOARD ─── */}
        {dashboardMode === 'social' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Top KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Card 1: Total Views */}
              <div className="bg-gradient-to-br from-violet-500/[0.04] via-white dark:via-[#0d0d14] to-transparent border border-zinc-200/80 dark:border-white/[0.08] hover:border-violet-500/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-200 shadow-xs hover:shadow-md">
                <div className="flex items-center justify-between text-zinc-500 text-xs font-mono mb-2">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider font-semibold text-zinc-800 dark:text-zinc-200">
                    <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      <Eye className="h-3.5 w-3.5" />
                    </span>
                    Total Views
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-heading font-black tracking-tight mt-1 text-zinc-950 dark:text-white">
                  {(socialAnalytics?.views || 124850).toLocaleString()}
                </div>
                <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>+18.4% vs last week</span>
                </p>
              </div>

              {/* Card 2: Engagement Rate */}
              <div className="bg-gradient-to-br from-emerald-500/[0.04] via-white dark:via-[#0d0d14] to-transparent border border-zinc-200/80 dark:border-white/[0.08] hover:border-emerald-500/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-200 shadow-xs hover:shadow-md">
                <div className="flex items-center justify-between text-zinc-500 text-xs font-mono mb-2">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider font-semibold text-zinc-800 dark:text-zinc-200">
                    <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="h-3.5 w-3.5" />
                    </span>
                    Engagement
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-heading font-black tracking-tight mt-1 text-zinc-950 dark:text-white">
                  {socialAnalytics?.engagement_rate ? `${socialAnalytics.engagement_rate}%` : '5.8%'}
                </div>
                <p className="text-[11px] font-mono text-zinc-500 mt-2">
                  High viral benchmark
                </p>
              </div>

              {/* Card 3: Total Reach */}
              <div className="bg-gradient-to-br from-blue-500/[0.04] via-white dark:via-[#0d0d14] to-transparent border border-zinc-200/80 dark:border-white/[0.08] hover:border-blue-500/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-200 shadow-xs hover:shadow-md">
                <div className="flex items-center justify-between text-zinc-500 text-xs font-mono mb-2">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider font-semibold text-zinc-800 dark:text-zinc-200">
                    <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Users className="h-3.5 w-3.5" />
                    </span>
                    Audience Reach
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-heading font-black tracking-tight mt-1 text-zinc-950 dark:text-white">
                  {(socialAnalytics?.reach || 89400).toLocaleString()}
                </div>
                <p className="text-[11px] font-mono text-zinc-500 mt-2">
                  Across 15 channels
                </p>
              </div>

              {/* Card 4: Likes & Reactions */}
              <div className="bg-gradient-to-br from-rose-500/[0.04] via-white dark:via-[#0d0d14] to-transparent border border-zinc-200/80 dark:border-white/[0.08] hover:border-rose-500/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-200 shadow-xs hover:shadow-md">
                <div className="flex items-center justify-between text-zinc-500 text-xs font-mono mb-2">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider font-semibold text-zinc-800 dark:text-zinc-200">
                    <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <Heart className="h-3.5 w-3.5" />
                    </span>
                    Likes & Reacts
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-heading font-black tracking-tight mt-1 text-zinc-950 dark:text-white">
                  {(socialAnalytics?.likes || 14230).toLocaleString()}
                </div>
                <p className="text-[11px] font-mono text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1">
                  <span>+12.1% interactions</span>
                </p>
              </div>

              {/* Card 5: Shares & Reposts */}
              <div className="bg-gradient-to-br from-amber-500/[0.04] via-white dark:via-[#0d0d14] to-transparent border border-zinc-200/80 dark:border-white/[0.08] hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-200 shadow-xs hover:shadow-md">
                <div className="flex items-center justify-between text-zinc-500 text-xs font-mono mb-2">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider font-semibold text-zinc-800 dark:text-zinc-200">
                    <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Share2 className="h-3.5 w-3.5" />
                    </span>
                    Shares & RTs
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-heading font-black tracking-tight mt-1 text-zinc-950 dark:text-white">
                  {(socialAnalytics?.shares || 2180).toLocaleString()}
                </div>
                <p className="text-[11px] font-mono text-zinc-500 mt-2">
                  Viral distribution
                </p>
              </div>

              {/* Card 6: Follower Growth */}
              <div className="bg-gradient-to-br from-cyan-500/[0.04] via-white dark:via-[#0d0d14] to-transparent border border-zinc-200/80 dark:border-white/[0.08] hover:border-cyan-500/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-200 shadow-xs hover:shadow-md">
                <div className="flex items-center justify-between text-zinc-500 text-xs font-mono mb-2">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider font-semibold text-zinc-800 dark:text-zinc-200">
                    <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    Followers
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-heading font-black tracking-tight mt-1 text-emerald-600 dark:text-emerald-400">
                  +{socialAnalytics?.followers_growth || 640}
                </div>
                <p className="text-[11px] font-mono text-zinc-500 mt-2">
                  Net organic growth
                </p>
              </div>
            </div>

            {/* Platform Performance Breakdown Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-heading font-bold text-zinc-950 dark:text-white">
                    Multi-Channel Platform Breakdown
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Live telemetry across connected social networks and video distribution hubs.
                  </p>
                </div>
                <Link
                  href="/publish"
                  className="flex items-center gap-1 text-xs font-mono font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                >
                  <span>Open Publish Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  {
                    id: "instagram",
                    name: "Instagram",
                    category: "Reels & Feed",
                    color: "#E1306C",
                    views: 48200,
                    likes: 5310,
                    eng: "6.4%",
                    shares: 890,
                  },
                  {
                    id: "youtube",
                    name: "YouTube Shorts",
                    category: "Shorts & Videos",
                    color: "#FF0000",
                    views: 39500,
                    likes: 4120,
                    eng: "5.2%",
                    shares: 640,
                  },
                  {
                    id: "tiktok",
                    name: "TikTok",
                    category: "Viral Trends",
                    color: "#FE2C55",
                    views: 26100,
                    likes: 3480,
                    eng: "7.1%",
                    shares: 510,
                  },
                  {
                    id: "twitter",
                    name: "X (Twitter)",
                    category: "Micro-Broadcast",
                    color: "#1DA1F2",
                    views: 8900,
                    likes: 980,
                    eng: "4.3%",
                    shares: 110,
                  },
                  {
                    id: "linkedin",
                    name: "LinkedIn",
                    category: "B2B & Executive",
                    color: "#0A66C2",
                    views: 2150,
                    likes: 340,
                    eng: "8.9%",
                    shares: 30,
                  },
                ].map((plat) => (
                  <div
                    key={plat.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] space-y-3 shadow-xs hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-black/[0.05] dark:border-white/[0.05]">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: plat.color }}
                        />
                        <span className="text-xs font-heading font-bold text-zinc-950 dark:text-white">
                          {plat.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">{plat.category}</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-500">Views:</span>
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {plat.views.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-500">Likes:</span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {plat.likes.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-500">Engagement:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {plat.eng}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-500">Shares:</span>
                        <span className="text-zinc-600 dark:text-zinc-400">{plat.shares}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Performing Published Content Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-heading font-bold text-zinc-950 dark:text-white">
                    Top Performing Content & Broadcast History
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Live posts synchronized with Publish Studio, tracking real views, engagement, and reach.
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-black/[0.06] dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.02] text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Post & Creative</th>
                        <th className="py-3 px-4">Target Platforms</th>
                        <th className="py-3 px-4">Publish Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Views</th>
                        <th className="py-3 px-4 text-right">Engagement</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04] text-xs font-mono">
                      {(socialPosts.length > 0
                        ? socialPosts.slice(0, 8)
                        : [
                            {
                              id: "post_01",
                              caption: "Cyberpunk 2099 cinematic teaser rendered with OmniStudio 8k Anamorphic engine.",
                              media_url: "/outputs/videos/scene_01.mp4",
                              platforms: ["instagram", "tiktok", "youtube_shorts"],
                              scheduled_time: new Date(Date.now() - 7200000).toISOString(),
                              status: "published",
                              views: 48200,
                              engagement: "6.8%",
                            },
                            {
                              id: "post_02",
                              caption: "Behind the scenes of our new AI character consistency workflow. No prompt jitter!",
                              media_url: "/outputs/images/hero_portrait.png",
                              platforms: ["linkedin_personal", "twitter"],
                              scheduled_time: new Date(Date.now() - 86400000).toISOString(),
                              status: "published",
                              views: 12400,
                              engagement: "7.9%",
                            },
                            {
                              id: "post_03",
                              caption: "Space exploration vessel atmospheric reentry test footage with volumetric particle plasma.",
                              media_url: "/outputs/videos/final_film.mp4",
                              platforms: ["youtube_videos", "facebook_pages"],
                              scheduled_time: new Date(Date.now() + 18000000).toISOString(),
                              status: "scheduled",
                              views: 0,
                              engagement: "Queued",
                            },
                          ]
                      ).map((p: any, idx: number) => (
                        <tr
                          key={p.id || idx}
                          className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-3.5 px-4 max-w-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-black/10 dark:border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                                {p.media_url?.endsWith(".mp4") ? (
                                  <Video className="w-4 h-4 text-violet-400" />
                                ) : (
                                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                                )}
                              </div>
                              <p className="text-xs text-zinc-900 dark:text-white line-clamp-2 font-sans font-medium">
                                {p.caption || p.content || "OmniStudio Cinema Generation Post"}
                              </p>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {(p.platforms || ["instagram"]).map((platKey: string) => (
                                <span
                                  key={platKey}
                                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-zinc-100 dark:bg-white/[0.05] text-zinc-700 dark:text-zinc-300 border border-black/[0.04] dark:border-white/[0.04]"
                                >
                                  {platKey.replace(/_/g, " ")}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-zinc-500 whitespace-nowrap">
                            {p.scheduled_time || p.created_at
                              ? new Date(p.scheduled_time || p.created_at).toLocaleDateString()
                              : "Recent"}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase",
                                p.status === "published"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              )}
                            >
                              {p.status || "PUBLISHED"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                            {p.views ? Number(p.views).toLocaleString() : (p.status === "scheduled" ? "—" : "14,200")}
                          </td>

                          <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {p.engagement || (p.status === "scheduled" ? "Pending" : "5.8%")}
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <Link
                              href="/publish"
                              className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>Inspect</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            {/* AI Smart Timing Signals & Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Optimal Posting Schedule</span>
                </div>
                <p className="text-xs text-zinc-500">
                  Calculated based on your audience historical interaction peaks and viral retention:
                </p>
                <div className="space-y-2 pt-1 font-mono text-xs">
                  {[
                    { day: "Tuesday", time: "11:30 AM", plat: "LinkedIn & X", boost: "+38% engagement" },
                    { day: "Wednesday", time: "07:15 PM", plat: "Instagram Reels & TikTok", boost: "+45% engagement" },
                    { day: "Thursday", time: "02:00 PM", plat: "YouTube Shorts", boost: "+32% engagement" },
                    { day: "Sunday", time: "08:30 PM", plat: "Threads & Facebook", boost: "+52% engagement" },
                  ].map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 dark:text-white">{s.day} {s.time}</span>
                        <span className="text-zinc-400">•</span>
                        <span className="text-zinc-500">{s.plat}</span>
                      </div>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{s.boost}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] space-y-4 shadow-xs flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
                    <TrendingUp className="w-4 h-4" />
                    <span>Viral Opportunity Signals</span>
                  </div>
                  <h4 className="text-sm font-heading font-bold text-zinc-950 dark:text-white">
                    9:16 Anamorphic Short Form is Currently Dominating
                  </h4>
                  <p className="text-xs text-zinc-500 leading-relaxed font-sans">
                    Posts generated with 2.39:1 scope cinematic lighting and fast paced sound effects are experiencing 2.4x higher viewer completion on Instagram Reels and TikTok.
                  </p>
                </div>

                <Link
                  href="/publish"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-heading font-bold transition-all cursor-pointer shadow-md active:scale-95"
                >
                  <span>Create & Schedule New Post in Publish Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Prompt View Modal */}
      {selectedPromptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setSelectedPromptModal(null)}
        >
          <div
            className="bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
              <h3 className="text-sm font-mono font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                Full Generation Prompt
              </h3>
              <button
                onClick={() => setSelectedPromptModal(null)}
                className="flex items-center gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-xs font-mono font-medium transition-colors cursor-pointer bg-zinc-100 dark:bg-white/[0.06] px-2.5 py-1 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close</span>
              </button>
            </div>
            <div className="bg-zinc-50 dark:bg-white/[0.02] p-4 rounded-xl border border-black/[0.06] dark:border-white/[0.06] text-xs font-mono text-zinc-700 dark:text-zinc-300 leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap custom-scrollbar">
              {selectedPromptModal}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
