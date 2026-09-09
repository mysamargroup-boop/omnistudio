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
  Coins
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
      const [sumRes, histRes, ratesRes] = await Promise.all([
        api.getUsageSummary(),
        api.getUsageHistory(serviceFilter === 'all' ? undefined : serviceFilter, 100),
        api.getRateCards()
      ]);

      setSummary(sumRes);
      setHistory(histRes.records || []);
      setRateCards(ratesRes.rates || []);
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
    <div className="min-h-screen bg-[#070709] text-zinc-100 font-sans pb-24 pt-4 selection:bg-rose-500/30">
      {/* Top Background Glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-rose-600/10 blur-3xl" />
        <div className="absolute top-20 right-1/4 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6 pt-2">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[11px] font-mono tracking-widest uppercase text-emerald-400 font-semibold">
                STUDIO TELEMETRY // REAL-TIME SPEND & AUDIT INTELLIGENCE
              </p>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Usage & Cost Analytics
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Real-time audit of every generation event, exact spending breakdowns, and official model price benchmarks.
            </p>
          </div>

          {/* Top Actions: Currency Toggle & Refresh */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* Currency Selector */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setCurrency('INR')}
                className={cn(
                  'px-3 py-1.5 text-xs font-mono font-semibold rounded-md transition-all cursor-pointer',
                  currency === 'INR'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                ₹ INR
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={cn(
                  'px-3 py-1.5 text-xs font-mono font-semibold rounded-md transition-all cursor-pointer',
                  currency === 'USD'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                $ USD
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 transition-all cursor-pointer"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              <span>{refreshing ? 'Syncing...' : 'Sync Logs'}</span>
            </button>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Spend */}
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-rose-500/40 transition-all">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-2">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-zinc-400">
                <Coins className="h-4 w-4 text-rose-400" /> Total Spend
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
                ACTIVE
              </span>
            </div>
            <div className="text-3xl font-black text-white font-mono tracking-tight mt-1">
              {summary ? formatCost(summary.total_spend_usd, summary.total_spend_inr) : '₹0.00'}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-2">
              <span>Equivalent:</span>
              <span className="text-zinc-300 font-mono">
                {summary
                  ? currency === 'INR'
                    ? `$${summary.total_spend_usd.toFixed(3)} USD`
                    : `₹${summary.total_spend_inr.toFixed(2)} INR`
                  : '$0.00'}
              </span>
            </div>
          </div>

          {/* Card 2: Total Generations */}
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-blue-500/40 transition-all">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-2">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-zinc-400">
                <Zap className="h-4 w-4 text-blue-400" /> Generations Run
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                AUDITED
              </span>
            </div>
            <div className="text-3xl font-black text-white font-mono tracking-tight mt-1">
              {summary ? summary.total_generations : 0}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-2">
              <span>Img: {summary?.by_service?.image?.count || 0}</span>
              <span>•</span>
              <span>Vid: {summary?.by_service?.video?.count || 0}</span>
              <span>•</span>
              <span>Audio: {summary?.by_service?.voice?.count || 0}</span>
            </div>
          </div>

          {/* Card 3: Free Savings via Local Hardware */}
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-2">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-zinc-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> In-House Savings
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                SAVED
              </span>
            </div>
            <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight mt-1">
              {summary ? formatCost(summary.total_saved_usd, summary.total_saved_inr) : '₹0.00'}
            </div>
            <div className="text-[11px] text-zinc-400 mt-2">
              Saved using Local FFmpeg 8.1 & Edge Neural TTS
            </div>
          </div>

          {/* Card 4: Top Model / Status */}
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-2">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-zinc-400">
                <Activity className="h-4 w-4 text-amber-400" /> Active Provider
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                VERIFIED
              </span>
            </div>
            <div className="text-xl font-bold text-white tracking-tight mt-1 truncate">
              Google Gemini / Veo
            </div>
            <div className="text-[11px] text-emerald-400 mt-2 font-mono flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Pay-As-You-Go Active
            </div>
          </div>
        </div>

        {/* Primary View Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer',
                activeTab === 'history'
                  ? 'bg-zinc-100 text-black shadow-lg font-bold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              )}
            >
              <Clock className="h-4 w-4" />
              <span>Generation Activity Audit ({filteredHistory.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('rates')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer',
                activeTab === 'rates'
                  ? 'bg-zinc-100 text-black shadow-lg font-bold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
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
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-rose-400 transition-all font-mono self-end cursor-pointer"
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
              {/* Service Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {['all', 'image', 'video', 'voice', 'pipeline'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setServiceFilter(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap',
                      serviceFilter === s
                        ? 'bg-rose-600 text-white font-bold'
                        : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
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
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-all"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-zinc-800/80 bg-zinc-900/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 font-mono text-[11px] uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Service & Provider</th>
                    <th className="py-3 px-4">Model Engine</th>
                    <th className="py-3 px-4">Prompt / Specs</th>
                    <th className="py-3 px-4 text-right">Spend</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-400 font-mono">
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
                          className="hover:bg-zinc-800/30 transition-all group"
                        >
                          {/* Time */}
                          <td className="py-3.5 px-4 font-mono text-zinc-400 whitespace-nowrap">
                            {item.display_time || item.timestamp.slice(11, 19)}
                          </td>

                          {/* Service & Provider */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {item.service_type === 'image' && <ImageIcon className="h-4 w-4 text-purple-400" />}
                              {item.service_type === 'video' && <Video className="h-4 w-4 text-blue-400" />}
                              {item.service_type === 'voice' && <Mic className="h-4 w-4 text-emerald-400" />}
                              {item.service_type === 'pipeline' && <Layers className="h-4 w-4 text-amber-400" />}
                              <span className="font-semibold text-zinc-200 uppercase text-[11px] font-mono">
                                {item.service_type}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 font-mono text-zinc-400">
                                {item.provider}
                              </span>
                            </div>
                          </td>

                          {/* Model Engine */}
                          <td className="py-3.5 px-4 font-mono text-zinc-300 font-medium whitespace-nowrap">
                            {item.model}
                          </td>

                          {/* Prompt & Specs */}
                          <td className="py-3.5 px-4 max-w-md">
                            <div
                              onClick={() => setSelectedPromptModal(item.full_prompt || item.prompt)}
                              className="text-zinc-300 truncate cursor-pointer hover:text-rose-400 transition-colors"
                              title="Click to view full prompt"
                            >
                              "{item.prompt || 'No prompt specified'}"
                            </div>
                            {item.specs && Object.keys(item.specs).length > 0 && (
                              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-zinc-400">
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
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                                FREE (₹0)
                              </span>
                            ) : (
                              <div>
                                <span className="font-bold text-white text-xs">
                                  {formatCost(item.cost_usd, item.cost_inr)}
                                </span>
                                <div className="text-[10px] text-zinc-400">
                                  {currency === 'INR' ? `$${item.cost_usd.toFixed(3)}` : `₹${item.cost_inr.toFixed(2)}`}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {item.status === 'success' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                SUCCESS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
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
                                className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-400 hover:text-rose-300 transition-colors"
                              >
                                <span>Inspect</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-zinc-500 text-[10px] font-mono">—</span>
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
            <div className="flex flex-wrap items-center gap-2 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
              <span className="text-xs font-mono text-zinc-400 mr-2 flex items-center gap-1">
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
                    'px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer',
                    rateCategoryFilter === p.id
                      ? 'bg-rose-600 text-white font-bold'
                      : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Comprehensive Rates Table */}
            <div className="overflow-x-auto rounded-2xl border border-zinc-800/80 bg-zinc-900/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 font-mono text-[11px] uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="py-3.5 px-4">Provider</th>
                    <th className="py-3.5 px-4">Model Engine</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Billing Metric</th>
                    <th className="py-3.5 px-4 text-right">Cost (USD)</th>
                    <th className="py-3.5 px-4 text-right">Cost (INR)</th>
                    <th className="py-3.5 px-4">Free Quota / Tier</th>
                    <th className="py-3.5 px-4">How Billing Works & Spends Analysis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {filteredRateCards.map((rc, idx) => {
                    const isZero = rc.cost_usd === 0;
                    return (
                      <tr key={idx} className="hover:bg-zinc-800/30 transition-all">
                        {/* Provider */}
                        <td className="py-4 px-4 whitespace-nowrap font-mono font-semibold text-zinc-300">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px]',
                              rc.provider.includes('Google') && 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                              rc.provider.includes('OpenAI') && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                              rc.provider.includes('Replicate') && 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
                              rc.provider.includes('Eleven') && 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                              rc.provider.includes('Local') && 'bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold'
                            )}
                          >
                            {rc.provider}
                          </span>
                        </td>

                        {/* Model */}
                        <td className="py-4 px-4 font-mono font-bold text-white whitespace-nowrap">
                          {rc.model}
                        </td>

                        {/* Category */}
                        <td className="py-4 px-4 font-mono text-zinc-400 whitespace-nowrap">
                          {rc.category}
                        </td>

                        {/* Billing Metric */}
                        <td className="py-4 px-4 font-mono text-zinc-300 whitespace-nowrap">
                          {rc.unit}
                        </td>

                        {/* Cost USD */}
                        <td className="py-4 px-4 text-right whitespace-nowrap font-mono font-bold">
                          {isZero ? (
                            <span className="text-emerald-400">$0.00</span>
                          ) : (
                            <span className="text-white">${rc.cost_usd.toFixed(3)}</span>
                          )}
                        </td>

                        {/* Cost INR */}
                        <td className="py-4 px-4 text-right whitespace-nowrap font-mono font-bold">
                          {isZero ? (
                            <span className="text-emerald-400">₹0.00 (FREE)</span>
                          ) : (
                            <span className="text-rose-400">₹{rc.cost_inr.toFixed(2)}</span>
                          )}
                        </td>

                        {/* Free Quota */}
                        <td className="py-4 px-4 font-mono text-xs text-zinc-300 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px]">
                            {rc.free_tier}
                          </span>
                        </td>

                        {/* Billing Mechanism & Explanation */}
                        <td className="py-4 px-4 text-xs text-zinc-400 max-w-md leading-relaxed">
                          {rc.billing_mechanism}
                          <div className="mt-1">
                            <a
                              href={rc.official_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-zinc-500 hover:text-rose-400 transition-colors inline-flex items-center gap-1 font-mono"
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
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold">
                  <Sparkles className="h-4 w-4" /> Tip 1: Image Generation
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Google Gemini 2.5 Flash Image costs approx <span className="text-white font-mono font-bold">₹2.50 ($0.030)</span> per image vs DALL-E 3 HD at <span className="text-white font-mono font-bold">₹6.68 ($0.080)</span>. Using Gemini gives you faster generation and cuts image costs by 62%.
                </p>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold">
                  <ShieldCheck className="h-4 w-4" /> Tip 2: Video Motion (100% Free)
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Cloud video engines like Google Veo cost <span className="text-white font-mono font-bold">₹50 ($0.60)</span> per 4-second clip. Our Local FFmpeg 8.1 Motion Engine generates 1080p camera motion at <span className="text-emerald-400 font-mono font-bold">₹0.00 cost</span> on your local hardware.
                </p>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-mono text-xs font-bold">
                  <Mic className="h-4 w-4" /> Tip 3: Audio & Voice
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Microsoft Edge Neural TTS is completely <span className="text-emerald-400 font-mono font-bold">FREE & UNLIMITED</span> with zero API keys. Use ElevenLabs only when specialized voice cloning or custom emotion modulation is explicitly needed.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Prompt View Modal */}
      {selectedPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Full Generation Prompt
              </h3>
              <button
                onClick={() => setSelectedPromptModal(null)}
                className="text-zinc-400 hover:text-white text-xs font-mono cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 text-xs font-mono text-zinc-300 leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap">
              {selectedPromptModal}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
