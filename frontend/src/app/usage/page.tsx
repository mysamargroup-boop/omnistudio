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
  X
} from 'lucide-react';
import { api, getMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

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

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [sumRes, histRes, ratesRes, keysRes] = await Promise.all([
        api.getUsageSummary(),
        api.getUsageHistory(serviceFilter === 'all' ? undefined : serviceFilter, 100),
        api.getRateCards(),
        api.getKeys().catch(() => ({ keys_detail: {} }))
      ]);

      setSummary(sumRes);
      setHistory(histRes.records || []);
      setRateCards(ratesRes.rates || []);
      if (keysRes && keysRes.keys_detail) {
        setConfiguredKeys(keysRes.keys_detail);
      }
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
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
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
            <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
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

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Spend */}
          <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-5 relative overflow-hidden group hover:border-zinc-400 dark:hover:border-zinc-700 transition-all duration-200 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-mono mb-2">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Coins className="h-4 w-4 text-zinc-700 dark:text-zinc-300" /> Total Spend
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold border border-zinc-200 dark:border-zinc-700">
                ACTIVE
              </span>
            </div>
            <div className="text-3xl font-heading font-black text-zinc-950 dark:text-white tracking-tight mt-1">
              {summary ? formatCost(summary.total_spend_usd, summary.total_spend_inr) : '₹0.00'}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-2">
              <span>Equivalent:</span>
              <span className="text-zinc-700 dark:text-zinc-300 font-mono">
                {summary
                  ? currency === 'INR'
                    ? `$${summary.total_spend_usd.toFixed(3)} USD`
                    : `₹${summary.total_spend_inr.toFixed(2)} INR`
                  : '$0.00'}
              </span>
            </div>
          </div>

          {/* Card 2: Total Generations */}
          <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-5 relative overflow-hidden group hover:border-blue-500/40 transition-all duration-200 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-mono mb-2">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Zap className="h-4 w-4 text-blue-500" /> Generations Run
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
                AUDITED
              </span>
            </div>
            <div className="text-3xl font-heading font-black text-zinc-950 dark:text-white tracking-tight mt-1">
              {summary ? summary.total_generations : 0}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-2">
              <span>Img: {summary?.by_service?.image?.count || 0}</span>
              <span>•</span>
              <span>Vid: {summary?.by_service?.video?.count || 0}</span>
              <span>•</span>
              <span>Audio: {summary?.by_service?.voice?.count || 0}</span>
            </div>
          </div>

          {/* Card 3: Free Savings via Local Hardware */}
          <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-200 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-mono mb-2">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> In-House Savings
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                SAVED
              </span>
            </div>
            <div className="text-3xl font-heading font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-1">
              {summary ? formatCost(summary.total_saved_usd, summary.total_saved_inr) : '₹0.00'}
            </div>
            <div className="text-[11px] text-zinc-500 mt-2">
              Saved using Local FFmpeg 8.1 & Edge Neural TTS
            </div>
          </div>

          {/* Card 4: Multi-Provider AI Engine Suite */}
          <div className="bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-200 shadow-sm">
            <div className="flex items-center justify-between text-xs font-mono mb-2.5 gap-2">
              <span className="flex items-center gap-1.5 uppercase tracking-wider font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                <Activity className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> AI Engines
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap shrink-0">
                MULTI-PROVIDER
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs font-mono py-0.5">
                <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 min-w-0 truncate">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", configuredKeys["OPENAI_API_KEY"]?.configured !== false ? "bg-emerald-500 animate-pulse" : "bg-zinc-400")} />
                  <span className="truncate" title="OpenAI GPT-4o, DALL-E">OpenAI (GPT-4o)</span>
                </span>
                <span className={cn("text-[10px] font-bold whitespace-nowrap shrink-0 px-1.5 py-0.2 rounded font-mono", configuredKeys["OPENAI_API_KEY"]?.configured !== false ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400")}>
                  {configuredKeys["OPENAI_API_KEY"]?.configured !== false ? "ACTIVE" : "STANDBY"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs font-mono py-0.5">
                <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 min-w-0 truncate">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", configuredKeys["GEMINI_API_KEY"]?.configured !== false ? "bg-emerald-500 animate-pulse" : "bg-zinc-400")} />
                  <span className="truncate" title="Google Gemini 2.5, Veo">Google (Gemini)</span>
                </span>
                <span className={cn("text-[10px] font-bold whitespace-nowrap shrink-0 px-1.5 py-0.2 rounded font-mono", configuredKeys["GEMINI_API_KEY"]?.configured !== false ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400")}>
                  {configuredKeys["GEMINI_API_KEY"]?.configured !== false ? "ACTIVE" : "STANDBY"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs font-mono py-0.5">
                <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 min-w-0 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate" title="Edge Neural Audio TTS">Edge Neural TTS</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0 px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-500/10 font-mono">
                  100% FREE
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs font-mono py-0.5">
                <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 min-w-0 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate" title="FFmpeg 8.1 Motion Engine">FFmpeg 8.1 Local</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0 px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-500/10 font-mono">
                  LOCAL FREE
                </span>
              </div>
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2.5 font-mono flex items-center justify-between pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
              <span className="flex items-center gap-1 truncate text-zinc-700 dark:text-zinc-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">Multimodal AI Suite</span>
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider shrink-0">
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

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0d0d14] shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-[#111118] text-zinc-500 font-mono text-[10px] uppercase tracking-wider border-b border-black/[0.08] dark:border-white/[0.08]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Time</th>
                    <th className="py-3 px-4 font-semibold">Service & Provider</th>
                    <th className="py-3 px-4 font-semibold">Model Engine</th>
                    <th className="py-3 px-4 font-semibold">Prompt / Specs</th>
                    <th className="py-3 px-4 text-right font-semibold">Spend</th>
                    <th className="py-3 px-4 text-center font-semibold">Status</th>
                    <th className="py-3 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04] font-sans">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-violet-500" />
                        Loading generation records...
                      </td>
                    </tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
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
                          <td className="py-3.5 px-4 font-mono text-zinc-500 whitespace-nowrap">
                            {item.display_time || item.timestamp.slice(11, 19)}
                          </td>

                          {/* Service & Provider */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {item.service_type === 'image' && <ImageIcon className="h-4 w-4 text-violet-500" />}
                              {item.service_type === 'video' && <Video className="h-4 w-4 text-blue-500" />}
                              {item.service_type === 'voice' && <Mic className="h-4 w-4 text-emerald-500" />}
                              {item.service_type === 'pipeline' && <Layers className="h-4 w-4 text-amber-500" />}
                              <span className="font-semibold text-zinc-900 dark:text-zinc-200 uppercase text-[11px] font-mono">
                                {item.service_type}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/[0.06] font-mono text-zinc-500 border border-black/[0.04] dark:border-white/[0.04]">
                                {item.provider}
                              </span>
                            </div>
                          </td>

                          {/* Model Engine */}
                          <td className="py-3.5 px-4 font-mono text-zinc-700 dark:text-zinc-300 font-medium whitespace-nowrap">
                            {item.model}
                          </td>

                          {/* Prompt & Specs */}
                          <td className="py-3.5 px-4 max-w-md">
                            <div
                              onClick={() => setSelectedPromptModal(item.full_prompt || item.prompt)}
                              className="text-zinc-700 dark:text-zinc-300 truncate cursor-pointer hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                              title="Click to view full prompt"
                            >
                              "{item.prompt || 'No prompt specified'}"
                            </div>
                            {item.specs && Object.keys(item.specs).length > 0 && (
                              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-zinc-500">
                                {item.specs.resolution && <span>Res: {item.specs.resolution}</span>}
                                {item.specs.duration && <span>• {item.specs.duration}s</span>}
                                {item.specs.motion && <span>• Motion: {item.specs.motion}</span>}
                                {item.specs.quality && <span>• {item.specs.quality}</span>}
                                {item.specs.characters && <span>• {item.specs.characters} chars</span>}
                              </div>
                            )}
                          </td>

                          {/* Spend */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono">
                            {isFree ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20 text-[11px]">
                                FREE (₹0)
                              </span>
                            ) : (
                              <div>
                                <span className="font-bold text-zinc-950 dark:text-white text-xs">
                                  {formatCost(item.cost_usd, item.cost_inr)}
                                </span>
                                <div className="text-[10px] text-zinc-500">
                                  {currency === 'INR' ? `$${item.cost_usd.toFixed(3)}` : `₹${item.cost_inr.toFixed(2)}`}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {item.status === 'success' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                SUCCESS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-500/20">
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
                                className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                              >
                                <span>Inspect</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-zinc-400 text-[10px] font-mono">—</span>
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

            {/* Comprehensive Rates Table */}
            <div className="overflow-x-auto rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0d0d14] shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-[#111118] text-zinc-500 font-mono text-[10px] uppercase tracking-wider border-b border-black/[0.08] dark:border-white/[0.08]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Provider</th>
                    <th className="py-3.5 px-4 font-semibold">Model Engine</th>
                    <th className="py-3.5 px-4 font-semibold">Category</th>
                    <th className="py-3.5 px-4 font-semibold">Billing Metric</th>
                    <th className="py-3.5 px-4 text-right font-semibold">Cost (USD)</th>
                    <th className="py-3.5 px-4 text-right font-semibold">Cost (INR)</th>
                    <th className="py-3.5 px-4 font-semibold">Free Quota / Tier</th>
                    <th className="py-3.5 px-4 font-semibold">How Billing Works & Spends Analysis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04] font-sans">
                  {filteredRateCards.map((rc, idx) => {
                    const isZero = rc.cost_usd === 0;
                    return (
                      <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors">
                        {/* Provider */}
                        <td className="py-4 px-4 whitespace-nowrap font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-md text-[10px] border',
                              rc.provider.includes('Google') && 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
                              rc.provider.includes('OpenAI') && 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
                              rc.provider.includes('Replicate') && 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20',
                              rc.provider.includes('Eleven') && 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
                              rc.provider.includes('Local') && 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-900 dark:text-zinc-100 border-black/[0.08] dark:border-white/[0.08] font-bold'
                            )}
                          >
                            {rc.provider}
                          </span>
                        </td>

                        {/* Model */}
                        <td className="py-4 px-4 font-mono font-bold text-zinc-950 dark:text-white whitespace-nowrap">
                          {rc.model}
                        </td>

                        {/* Category */}
                        <td className="py-4 px-4 font-mono text-zinc-500 whitespace-nowrap">
                          {rc.category}
                        </td>

                        {/* Billing Metric */}
                        <td className="py-4 px-4 font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {rc.unit}
                        </td>

                        {/* Cost USD */}
                        <td className="py-4 px-4 text-right whitespace-nowrap font-mono font-bold">
                          {isZero ? (
                            <span className="text-emerald-600 dark:text-emerald-400">$0.00</span>
                          ) : (
                            <span className="text-zinc-950 dark:text-white">${rc.cost_usd.toFixed(3)}</span>
                          )}
                        </td>

                        {/* Cost INR */}
                        <td className="py-4 px-4 text-right whitespace-nowrap font-mono font-bold">
                          {isZero ? (
                            <span className="text-emerald-600 dark:text-emerald-400">₹0.00 (FREE)</span>
                          ) : (
                            <span className="text-violet-600 dark:text-violet-400">₹{rc.cost_inr.toFixed(2)}</span>
                          )}
                        </td>

                        {/* Free Quota */}
                        <td className="py-4 px-4 font-mono text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.06] text-[11px]">
                            {rc.free_tier}
                          </span>
                        </td>

                        {/* Billing Mechanism & Explanation */}
                        <td className="py-4 px-4 text-xs text-zinc-500 max-w-md leading-relaxed">
                          {rc.billing_mechanism}
                          <div className="mt-1">
                            <a
                              href={rc.official_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors inline-flex items-center gap-1 font-mono font-medium"
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
