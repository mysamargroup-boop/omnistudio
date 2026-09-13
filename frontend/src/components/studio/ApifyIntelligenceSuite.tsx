"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  Share2,
  Sparkles,
  Terminal,
  Play,
  Copy,
  ArrowRight,
  Check,
  Loader2,
  RefreshCw,
  FileText,
  Database,
  Layers,
  Film,
  Clapperboard,
  ExternalLink,
  SlidersHorizontal,
  Eye,
  ThumbsUp,
  Clock,
  Bot,
  Zap,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Video,
  Mic,
  Image as ImageIcon,
  Send,
  Code,
  Lightbulb,
  Volume2,
  Search,
  Hash,
  Link2,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FaYoutube, FaInstagram, FaTiktok } from "react-icons/fa6";

interface ActorConfig {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  default_input?: Record<string, any>;
}

interface ScrapedItem {
  id?: string;
  title?: string;
  channel?: string;
  views?: number;
  likes?: number;
  duration?: string;
  url?: string;
  transcript_snippet?: string;
  key_hooks?: string[];
  [key: string]: any;
}

interface ScenePrompt {
  scene_number: number;
  name: string;
  prompt: string;
  camera_motion: string;
  sfx_cue: string;
}

interface ScreenplayOutput {
  title: string;
  viral_angle: string;
  estimated_duration: string;
  aspect_ratio: string;
  scenes: ScenePrompt[];
  full_studio_prompt: string;
  lighting_directive: string;
  recommended_model: string;
}

interface ApifyIntelligenceSuiteProps {
  onTransferToStudio?: (
    target: "video" | "image" | "voice",
    payload: { prompt?: string; script?: string; cameraMotion?: string }
  ) => void;
}

const STYLE_PRESETS = [
  {
    id: "cinematic",
    label: "2.39:1 Anamorphic Cinema",
    desc: "35mm scope, volumetric haze, high contrast, wet asphalt reflections",
    icon: Film,
    color: "from-amber-500/20 to-orange-500/20 text-amber-500 border-amber-500/30",
  },
  {
    id: "viral_hook",
    label: "9:16 Viral Social Hook",
    desc: "0.8s drop, high-velocity push-in, bold subject isolation, retention spike",
    icon: Zap,
    color: "from-rose-500/20 to-pink-500/20 text-rose-500 border-rose-500/30",
  },
  {
    id: "luxury_commercial",
    label: "Luxury Commercial Ad",
    desc: "Macro facet textures, 5600K key softbox, golden champagne reflection",
    icon: Sparkles,
    color: "from-emerald-500/20 to-teal-500/20 text-emerald-500 border-emerald-500/30",
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk Sci-Fi",
    desc: "Teal & neon violet rim, ionized plasma glow, dark city depth",
    icon: Terminal,
    color: "from-cyan-500/20 to-blue-500/20 text-cyan-500 border-cyan-500/30",
  },
  {
    id: "documentary",
    label: "Cinematic Documentary",
    desc: "Natural window lighting, 50mm eye-level portrait, authentic storytelling",
    icon: Clapperboard,
    color: "from-purple-500/20 to-violet-500/20 text-purple-500 border-purple-500/30",
  },
];

export default function ApifyIntelligenceSuite({ onTransferToStudio }: ApifyIntelligenceSuiteProps) {
  // Navigation tabs within Apify Suite
  const [activeSubtab, setActiveSubtab] = useState<"scrapers" | "instant_url" | "direct_text">("scrapers");

  // Actors state
  const [actors, setActors] = useState<ActorConfig[]>([]);
  const [tokenConfigured, setTokenConfigured] = useState<boolean>(false);
  const [selectedActorId, setSelectedActorId] = useState<string>("streamers/youtube-scraper");
  const [isCustomActor, setIsCustomActor] = useState<boolean>(false);
  const [customActorId, setCustomActorId] = useState<string>("");
  const [customJsonInput, setCustomJsonInput] = useState<string>("{\n  \"maxResults\": 5\n}");

  // Form input parameters
  const [targetUrl, setTargetUrl] = useState<string>("https://www.youtube.com/watch?v=sample-filmmaking");
  const [searchQuery, setSearchQuery] = useState<string>("Cinematic lighting techniques 2026");
  const [hashtags, setHashtags] = useState<string>("cinematic, filmmaking, aiart");
  const [maxResults, setMaxResults] = useState<number>(5);
  const [downloadSubtitles, setDownloadSubtitles] = useState<boolean>(true);

  // Execution & results state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runMessage, setRunMessage] = useState<string>("");
  const [datasetItems, setDatasetItems] = useState<ScrapedItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);

  // Instant Web URL fetch
  const [instantUrl, setInstantUrl] = useState<string>("");
  const [isFetchingUrl, setIsFetchingUrl] = useState<boolean>(false);
  const [fetchedUrlData, setFetchedUrlData] = useState<{ title?: string; content: string } | null>(null);

  // Direct Text state
  const [manualText, setManualText] = useState<string>("");

  // AI Screenplay Transformation state
  const [targetStyle, setTargetStyle] = useState<string>("cinematic");
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);
  const [screenplay, setScreenplay] = useState<ScreenplayOutput | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load curated actors on mount
  useEffect(() => {
    async function loadActors() {
      try {
        const res = await api.getApifyActors();
        if (res.success && res.actors?.length) {
          setActors(res.actors);
          setTokenConfigured(res.token_configured);
        }
      } catch (err) {
        console.warn("Apify actors fetch fallback", err);
      }
    }
    loadActors();
  }, []);

  const currentActor = actors.find((a) => a.id === selectedActorId);

  // Execute Apify Actor
  const handleRunScraper = async () => {
    setIsRunning(true);
    setRunMessage("Launching Apify Actor container...");
    try {
      let actorToRun = isCustomActor ? customActorId : selectedActorId;
      if (!actorToRun) {
        actorToRun = "streamers/youtube-scraper";
      }

      let payloadInput: Record<string, any> = {};

      if (isCustomActor) {
        try {
          payloadInput = JSON.parse(customJsonInput);
        } catch (e) {
          setRunMessage("Invalid custom JSON format. Please correct it.");
          setIsRunning(false);
          return;
        }
      } else {
        if (actorToRun === "streamers/youtube-scraper") {
          payloadInput = {
            startUrls: [{ url: targetUrl }],
            maxResults: maxResults,
            downloadSubtitles: downloadSubtitles,
          };
        } else if (actorToRun === "apify/instagram-reel-scraper") {
          payloadInput = {
            directUrls: [targetUrl],
            resultsLimit: maxResults,
          };
        } else if (actorToRun === "clockworks/tiktok-scraper") {
          payloadInput = {
            hashtags: hashtags.split(",").map((s) => s.trim()).filter(Boolean),
            resultsPerPage: maxResults,
          };
        } else if (actorToRun === "apify/website-content-crawler") {
          payloadInput = {
            startUrls: [{ url: targetUrl }],
            maxCrawlPages: maxResults,
          };
        } else if (actorToRun === "apify/google-search-scraper") {
          payloadInput = {
            queries: searchQuery,
            maxPagesPerQuery: 1,
          };
        }
      }

      setRunMessage("Running scraper task & extracting raw data...");
      const runRes = await api.runApifyActor(actorToRun, payloadInput);

      if (runRes.success && runRes.default_dataset_id) {
        setRunMessage("Fetching extracted dataset items...");
        const dataRes = await api.getApifyDatasetItems(runRes.default_dataset_id, 20);
        if (dataRes.success && dataRes.items?.length) {
          setDatasetItems(dataRes.items);
          setSelectedItemIndex(0);
          setRunMessage(`Success! ${dataRes.items.length} items extracted.`);
        } else {
          setRunMessage("Run completed, but no items found in dataset.");
        }
      }
    } catch (err: any) {
      setRunMessage(`Error running scraper: ${err.message || "Unknown error"}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Instant Web URL Scrape
  const handleFetchInstantUrl = async () => {
    if (!instantUrl.trim()) return;
    setIsFetchingUrl(true);
    try {
      const res = await api.apifyWebFetch(instantUrl.trim());
      if (res.success && res.content) {
        setFetchedUrlData({ title: res.title, content: res.content });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Trigger AI Creative Screenplay Transformation (Replacing Claude / ChatGPT)
  const handleSynthesizeScreenplay = async (sourceTextOverride?: string) => {
    let textToAnalyze = "";

    if (sourceTextOverride) {
      textToAnalyze = sourceTextOverride;
    } else if (activeSubtab === "scrapers") {
      const activeItem = datasetItems[selectedItemIndex];
      if (activeItem) {
        textToAnalyze = `Title: ${activeItem.title || ""}\nChannel: ${activeItem.channel || ""}\nTranscript: ${
          activeItem.transcript_snippet || ""
        }\nHooks: ${(activeItem.key_hooks || []).join("; ")}`;
      } else {
        textToAnalyze = targetUrl || searchQuery;
      }
    } else if (activeSubtab === "instant_url") {
      textToAnalyze = fetchedUrlData ? `${fetchedUrlData.title}\n\n${fetchedUrlData.content}` : instantUrl;
    } else if (activeSubtab === "direct_text") {
      textToAnalyze = manualText;
    }

    if (!textToAnalyze.trim()) {
      alert("Please extract or enter content before generating the AI screenplay.");
      return;
    }

    setIsAnalyzingAi(true);
    try {
      const res = await api.analyzeApifyDataWithAI({
        scraped_text: textToAnalyze,
        target_style: targetStyle,
      });

      if (res.success && res.screenplay) {
        setScreenplay(res.screenplay);
      }
    } catch (err: any) {
      console.error("AI screenplay error", err);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSendToStudio = (
    target: "video" | "image" | "voice",
    payload: { prompt?: string; script?: string; cameraMotion?: string }
  ) => {
    if (onTransferToStudio) {
      onTransferToStudio(target, payload);
    } else {
      // Fallback: Store in sessionStorage and alert
      if (payload.prompt) sessionStorage.setItem("omnistudio_draft_prompt", payload.prompt);
      if (payload.script) sessionStorage.setItem("omnistudio_draft_script", payload.script);
      alert(`Sent to ${target.toUpperCase()} Studio! Click the ${target} tab above to continue.`);
    }
  };

  const renderActorIcon = (iconName: string) => {
    switch (iconName) {
      case "youtube":
        return <FaYoutube className="w-4 h-4 text-rose-500" />;
      case "instagram":
        return <FaInstagram className="w-4 h-4 text-pink-500" />;
      case "tiktok":
        return <FaTiktok className="w-4 h-4 text-cyan-500" />;
      case "globe":
        return <Globe className="w-4 h-4 text-blue-500" />;
      case "search":
        return <Search className="w-4 h-4 text-amber-500" />;
      default:
        return <Database className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-8 animate-in fade-in duration-300">
      {/* ── Top Hero Banner / Apify MCP Neural Status ── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-amber-500/[0.08] via-orange-500/[0.04] to-zinc-900/[0.02] dark:from-amber-500/[0.12] dark:via-orange-500/[0.06] dark:to-[#0c0c11] border border-amber-500/20 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-mono font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Apify MCP Scrapers + Built-in AI Screenplay Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-zinc-900 dark:text-white tracking-tight">
              Competitor Research & AI Video Prompts
            </h1>
            <p className="text-sm font-jakarta text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Scrape trending YouTube transcripts, Instagram Reels, TikTok audio hooks, and web articles via Apify.
              Transform raw competitor insights into ready-to-render 2.39:1 cinematic screenplays and video prompts
              instantly — <strong className="text-amber-500 font-bold">without leaving OmniStudio or switching to Claude/ChatGPT</strong>.
            </p>
          </div>

          {/* Status Indicators Pill */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.08] shadow-sm">
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-full animate-ping",
                  tokenConfigured ? "bg-emerald-500" : "bg-amber-500"
                )}
              />
              <div className="text-left">
                <div className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                  Apify Engine
                </div>
                <div className="text-xs font-heading font-bold text-zinc-900 dark:text-white">
                  {tokenConfigured ? "Live Apify API Connected" : "Autonomous Simulator Ready"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.08] shadow-sm">
              <Bot className="w-4 h-4 text-emerald-500" />
              <div className="text-left">
                <div className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                  Screenplay AI
                </div>
                <div className="text-xs font-heading font-bold text-zinc-900 dark:text-white">
                  Gemini / OpenAI Pro
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sub-navigation: Scrapers vs Instant URL vs Direct Text ── */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-100 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] w-fit">
        <button
          type="button"
          onClick={() => setActiveSubtab("scrapers")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all cursor-pointer",
            activeSubtab === "scrapers"
              ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
          )}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Apify Actor Scrapers</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubtab("instant_url")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all cursor-pointer",
            activeSubtab === "instant_url"
              ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
          )}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>1-Click URL to Screenplay</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubtab("direct_text")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all cursor-pointer",
            activeSubtab === "direct_text"
              ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Direct Transcript / Text</span>
        </button>
      </div>

      {/* ── SUBTAB 1: CURATED & CUSTOM APIFY ACTORS ── */}
      {activeSubtab === "scrapers" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Actor Selection & Parameters (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Actor Presets Picker */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#121218] border border-black/[0.08] dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Select Apify Scraper
                </span>
                <button
                  type="button"
                  onClick={() => setIsCustomActor(!isCustomActor)}
                  className="text-[11px] font-mono text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Code className="w-3 h-3" />
                  {isCustomActor ? "Show Curated Actors" : "Enter Custom Actor ID"}
                </button>
              </div>

              {!isCustomActor ? (
                <div className="space-y-2.5">
                  {actors.map((actor) => {
                    const isSelected = selectedActorId === actor.id;
                    return (
                      <div
                        key={actor.id}
                        onClick={() => setSelectedActorId(actor.id)}
                        className={cn(
                          "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none",
                          isSelected
                            ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/20"
                            : "bg-zinc-50 dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.12] dark:hover:border-white/[0.12]"
                        )}
                      >
                        <div className="p-2 rounded-xl bg-white dark:bg-zinc-800 shadow-xs shrink-0 mt-0.5">
                          {renderActorIcon(actor.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-heading font-bold text-zinc-900 dark:text-white truncate">
                              {actor.name}
                            </h4>
                            <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                              {actor.category}
                            </span>
                          </div>
                          <p className="text-[11px] font-jakarta text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                            {actor.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                      Apify Actor ID (e.g. apify/web-scraper)
                    </label>
                    <input
                      type="text"
                      value={customActorId}
                      onChange={(e) => setCustomActorId(e.target.value)}
                      placeholder="username/actor-name"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-black/[0.1] dark:border-white/[0.1] text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                      Actor JSON Input Payload
                    </label>
                    <textarea
                      rows={5}
                      value={customJsonInput}
                      onChange={(e) => setCustomJsonInput(e.target.value)}
                      className="w-full p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-black/[0.1] dark:border-white/[0.1] text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Scraper Inputs & Action Card */}
            {!isCustomActor && (
              <div className="p-5 rounded-3xl bg-white dark:bg-[#121218] border border-black/[0.08] dark:border-white/[0.08] shadow-sm space-y-4">
                <span className="text-xs font-heading font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Configure Run Parameters
                </span>

                {/* Conditional inputs depending on selected actor */}
                {(selectedActorId === "streamers/youtube-scraper" ||
                  selectedActorId === "apify/instagram-reel-scraper" ||
                  selectedActorId === "apify/website-content-crawler") && (
                  <div>
                    <label className="block text-[11px] font-jakarta font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Target URL
                    </label>
                    <input
                      type="text"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] text-xs font-jakarta text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {selectedActorId === "clockworks/tiktok-scraper" && (
                  <div>
                    <label className="block text-[11px] font-jakarta font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Hashtags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={hashtags}
                      onChange={(e) => setHashtags(e.target.value)}
                      placeholder="cinematic, filmmaking, aiart"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] text-xs font-jakarta text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {selectedActorId === "apify/google-search-scraper" && (
                  <div>
                    <label className="block text-[11px] font-jakarta font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Search Query or Trend Topic
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter trend query..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] text-xs font-jakarta text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {/* Limit Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-jakarta">
                    <span className="text-zinc-500">Max Results</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">{maxResults} items</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={maxResults}
                    onChange={(e) => setMaxResults(parseInt(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Subtitles toggle for YouTube */}
                {selectedActorId === "streamers/youtube-scraper" && (
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={downloadSubtitles}
                      onChange={(e) => setDownloadSubtitles(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span className="text-xs font-jakarta text-zinc-700 dark:text-zinc-300">
                      Extract full spoken transcripts & subtitles
                    </span>
                  </label>
                )}

                {/* Run CTA Button */}
                <button
                  type="button"
                  onClick={handleRunScraper}
                  disabled={isRunning}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-heading font-extrabold text-xs tracking-wide uppercase shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{runMessage || "Scraping via Apify..."}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Execute Apify Scraper</span>
                    </>
                  )}
                </button>

                {runMessage && (
                  <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 text-center">
                    {runMessage}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Extracted Dataset Items Browser (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-5 rounded-3xl bg-white dark:bg-[#121218] border border-black/[0.08] dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-heading font-extrabold uppercase tracking-wider text-zinc-900 dark:text-white">
                    Extracted Dataset ({datasetItems.length} items)
                  </h3>
                </div>
                {datasetItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSynthesizeScreenplay()}
                    disabled={isAnalyzingAi}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-heading font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Convert Selected to Screenplay</span>
                  </button>
                )}
              </div>

              {datasetItems.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-black/[0.1] dark:border-white/[0.1] rounded-2xl space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto">
                    <Database className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-heading font-bold text-zinc-800 dark:text-zinc-200">
                      No Scraped Items Yet
                    </h4>
                    <p className="text-[11px] font-jakarta text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                      Select an Apify scraper on the left and click &quot;Execute Apify Scraper&quot; to fetch transcripts, viral trends, or article content.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {datasetItems.map((item, idx) => {
                    const isSelected = selectedItemIndex === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedItemIndex(idx)}
                        className={cn(
                          "p-4 rounded-2xl border transition-all cursor-pointer select-none space-y-3",
                          isSelected
                            ? "bg-amber-500/[0.05] border-amber-500/40 ring-1 ring-amber-500/20"
                            : "bg-zinc-50 dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.12]"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-mono text-amber-500 uppercase font-bold">
                              Item #{idx + 1}
                            </span>
                            <h4 className="text-xs sm:text-sm font-heading font-bold text-zinc-900 dark:text-white">
                              {item.title || item.name || "Competitor Content Item"}
                            </h4>
                            {item.channel && (
                              <span className="text-[11px] font-jakarta text-zinc-500">
                                Creator: {item.channel}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.views && (
                              <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-lg">
                                <Eye className="w-3 h-3 text-zinc-400" />
                                {item.views.toLocaleString()}
                              </div>
                            )}
                            {item.likes && (
                              <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-lg">
                                <ThumbsUp className="w-3 h-3 text-zinc-400" />
                                {item.likes.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Transcript snippet */}
                        {item.transcript_snippet && (
                          <div className="p-3 rounded-xl bg-white/70 dark:bg-black/30 border border-black/[0.04] dark:border-white/[0.04] text-xs font-jakarta text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
                            &ldquo;{item.transcript_snippet}&rdquo;
                          </div>
                        )}

                        {/* Key hooks tags */}
                        {item.key_hooks && item.key_hooks.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.key_hooks.map((hook, hIdx) => (
                              <span
                                key={hIdx}
                                className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-mono"
                              >
                                ⚡ {hook}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                          <span className="text-[10px] font-mono text-zinc-400">
                            {isSelected ? "✓ Selected for AI Screenplay" : "Click to select"}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemIndex(idx);
                              handleSynthesizeScreenplay();
                            }}
                            className="text-xs font-heading font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Convert to Screenplay</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
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

      {/* ── SUBTAB 2: INSTANT WEB URL TO SCREENPLAY ── */}
      {activeSubtab === "instant_url" && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#121218] border border-black/[0.08] dark:border-white/[0.08] shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-heading font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider">
                Instant Article / Web Page to Video Screenplay
              </h3>
              <p className="text-xs font-jakarta text-zinc-500 dark:text-zinc-400">
                Paste any article, blog post, or competitor announcement URL. The crawler will strip ads, extract the core narrative, and build 3 cinematic scene prompts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="url"
                value={instantUrl}
                onChange={(e) => setInstantUrl(e.target.value)}
                placeholder="https://example.com/article-or-case-study"
                className="flex-1 px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] text-xs font-jakarta text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleFetchInstantUrl}
                disabled={isFetchingUrl || !instantUrl.trim()}
                className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-heading font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isFetchingUrl ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Extract & Preview</span>
                  </>
                )}
              </button>
            </div>

            {fetchedUrlData && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-zinc-400 uppercase font-bold truncate">
                    Title: {fetchedUrlData.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSynthesizeScreenplay(fetchedUrlData.content)}
                    disabled={isAnalyzingAi}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-heading font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm hover:bg-amber-400"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Screenplay</span>
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto p-3 rounded-xl bg-white dark:bg-zinc-900 text-xs font-jakarta text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {fetchedUrlData.content}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUBTAB 3: DIRECT TRANSCRIPT / TEXT ── */}
      {activeSubtab === "direct_text" && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#121218] border border-black/[0.08] dark:border-white/[0.08] shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-heading font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider">
                Direct Script / Raw Transcript Input
              </h3>
              <p className="text-xs font-jakarta text-zinc-500 dark:text-zinc-400">
                Paste raw interview notes, YouTube transcript text, or story pitches directly here.
              </p>
            </div>

            <textarea
              rows={8}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Paste raw transcript, voiceover dialogue, or competitor concept here..."
              className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] text-xs font-jakarta text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleSynthesizeScreenplay(manualText)}
                disabled={isAnalyzingAi || !manualText.trim()}
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-heading font-extrabold text-xs tracking-wide uppercase flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Transform to 3-Scene Screenplay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CINEMATIC STYLE SELECTOR BAR ── */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#121218] border border-black/[0.08] dark:border-white/[0.08] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-heading font-extrabold uppercase tracking-wider text-zinc-900 dark:text-white">
              Target Screenplay & Aesthetic Style
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Selected: {STYLE_PRESETS.find((s) => s.id === targetStyle)?.label}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {STYLE_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = targetStyle === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => setTargetStyle(preset.id)}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all cursor-pointer select-none space-y-2",
                  isSelected
                    ? "bg-gradient-to-br " + preset.color + " ring-1 ring-amber-500/20 font-bold"
                    : "bg-zinc-50 dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.12]"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <h4 className="text-xs font-heading font-bold text-zinc-900 dark:text-white truncate">
                    {preset.label}
                  </h4>
                </div>
                <p className="text-[10px] font-jakarta text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  {preset.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── AI SCREENPLAY RESULTS SUITE (REPLACING CHATGPT / CLAUDE) ── */}
      {isAnalyzingAi && (
        <div className="py-20 text-center rounded-3xl bg-white dark:bg-[#121218] border border-black/[0.08] dark:border-white/[0.08] space-y-4 animate-in fade-in">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-heading font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider">
              Screenplay AI Synthesizing Production Breakdown...
            </h3>
            <p className="text-xs font-jakarta text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Analyzing competitor transcript pacing, lighting directives, camera focal lengths, and 3-shot scene prompts.
            </p>
          </div>
        </div>
      )}

      {screenplay && !isAnalyzingAi && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#121218] border border-amber-500/30 shadow-2xl space-y-8 animate-in fade-in">
          {/* Header & Meta */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-black/[0.08] dark:border-white/[0.08]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold uppercase">
                  ⚡ Screenplay Ready
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[10px] font-mono text-zinc-400">
                  {screenplay.aspect_ratio || "2.39:1"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[10px] font-mono text-zinc-400">
                  {screenplay.estimated_duration || "15s Teaser"}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-heading font-black text-zinc-900 dark:text-white">
                {screenplay.title}
              </h2>
              <p className="text-xs font-jakarta text-zinc-500 dark:text-zinc-400 max-w-2xl">
                <strong className="text-zinc-700 dark:text-zinc-200">Viral Hook Angle:</strong>{" "}
                {screenplay.viral_angle}
              </p>
            </div>

            {/* Quick Action Dock */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  handleSendToStudio("video", {
                    prompt: screenplay.full_studio_prompt,
                    cameraMotion: screenplay.scenes?.[0]?.camera_motion || "fast_push_in",
                  })
                }
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-heading font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Send to Video Studio</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSendToStudio("image", {
                    prompt: screenplay.scenes?.[0]?.prompt || screenplay.full_studio_prompt,
                  })
                }
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-heading font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-violet-500/20 cursor-pointer transition-all"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Send to Image Studio</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSendToStudio("voice", {
                    script: `${screenplay.title}. ${screenplay.viral_angle}`,
                  })
                }
                className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-heading font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-sky-500/20 cursor-pointer transition-all"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Send to Voice Studio</span>
              </button>
            </div>
          </div>

          {/* 3-Shot Scene Grid */}
          <div className="space-y-4">
            <h3 className="text-xs font-heading font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Multi-Shot Production Scenes
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {screenplay.scenes?.map((scene, sIdx) => (
                <div
                  key={sIdx}
                  className="p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-mono text-[10px] font-bold uppercase">
                        Shot 0{scene.scene_number || sIdx + 1}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase">
                        {scene.camera_motion}
                      </span>
                    </div>

                    <h4 className="text-xs font-heading font-bold text-zinc-900 dark:text-white">
                      {scene.name}
                    </h4>

                    <p className="text-xs font-jakarta text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {scene.prompt}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.04]">
                    {scene.sfx_cue && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                        <Volume2 className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="truncate">{scene.sfx_cue}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(scene.prompt, `scene_${sIdx}`)}
                        className="flex-1 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 text-[11px] font-mono flex items-center justify-center gap-1 cursor-pointer transition-all"
                      >
                        {copiedKey === `scene_${sIdx}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Prompt</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleSendToStudio("video", {
                            prompt: scene.prompt,
                            cameraMotion: scene.camera_motion,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-heading font-bold flex items-center gap-1 cursor-pointer transition-all"
                        title="Load into Video Studio"
                      >
                        <Video className="w-3 h-3" />
                        <span>Use</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Master Directives & Studio Console Prompt Card */}
          <div className="p-5 rounded-2xl bg-zinc-950 text-white dark:bg-black border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                  Master Studio Console Directive
                </h4>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(screenplay.full_studio_prompt, "master_prompt")}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-mono flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {copiedKey === "master_prompt" ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied Master Prompt</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Master Prompt</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs font-mono text-zinc-300 leading-relaxed bg-white/[0.04] p-3.5 rounded-xl border border-white/5">
              {screenplay.full_studio_prompt}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-zinc-400 pt-1">
              <div>
                <strong className="text-zinc-200">Lighting Directive:</strong>{" "}
                {screenplay.lighting_directive}
              </div>
              <div>
                <strong className="text-zinc-200">Recommended Model:</strong>{" "}
                {screenplay.recommended_model}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
