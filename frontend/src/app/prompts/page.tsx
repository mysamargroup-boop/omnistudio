"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Sparkles,
  Copy,
  Check,
  Search,
  Gem,
  Film,
  Camera,
  Layers,
  Sliders,
  CheckCircle2,
  Cpu,
  Video,
  Image as ImageIcon,
  ShieldCheck,
  Flame,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ModernSelect from "@/components/ui/ModernSelect";
import { JEWELLERY_ITEMS, JEWELLERY_PRESETS } from "@/components/studio/JewelleryPromptSuite";
import {
  PromptItem,
  PROMPT_LIBRARY_DATA,
  UNIVERSAL_REALISM_TAG,
  MASTER_NEGATIVE_PROMPT,
  VIDEO_CONSISTENCY_NEGATIVE_PROMPT,
} from "@/lib/promptLibraryData";

const BUILDER_OUTFIT_OPTIONS = [
  { value: "royal wine-purple silk saree with gold zari motifs", label: "Wine-Purple Silk Saree (Gold Zari)" },
  { value: "trending blush pink embroidered lehenga with zardozi details", label: "Blush Pink Lehenga (Zardozi)" },
  { value: "couture crimson velvet lehenga with royal antique embroidery", label: "Crimson Velvet Lehenga (Royal Antique)" },
  { value: "pastel sky blue organza saree with sleeveless embroidered blouse", label: "Pastel Sky Blue Organza Saree" },
  { value: "ivory and gold tissue silk saree with delicate border", label: "Ivory & Gold Tissue Silk Saree" },
  { value: "emerald green designer lehenga with heavy border", label: "Emerald Green Designer Lehenga" },
];

const BUILDER_POSE_OPTIONS = [
  { value: "one hand gently holding saree pallu near collarbone, neck elongated", label: "Hand Holding Pallu Near Collarbone" },
  { value: "body turned 45 degrees, face looking back over shoulder with soft smile", label: "Looking Over Shoulder (45° Turn)" },
  { value: "fingers gently touching earring, head tilted slightly sideways", label: "Touching Earring Beauty Close-Up" },
  { value: "both hands softly framing necklace, looking at camera, macro jewellery focus", label: "Both Hands Framing Necklace" },
  { value: "standing on grand marble staircase, one hand on railing, looking directly at camera", label: "Royal Staircase Pose" },
  { value: "sheer embroidered dupatta covering half face, eyes visible with intense gaze", label: "Dupatta Covering Half Face (Eyes Visible)" },
  { value: "seated gracefully on sofa, elbow resting on armrest, chin lightly supported", label: "Seated Chin Rest Pose" },
  { value: "walking slowly toward camera, saree flowing naturally, confident expression", label: "Slow Walking Toward Camera" },
];

const BUILDER_LIGHTING_OPTIONS = [
  { value: "soft morning daylight entering through carved sandstone palace window", label: "Window Daylight (Palace Sandstone)" },
  { value: "golden hour warm sunlight creating rim light around hair, cinematic shadows", label: "Golden Hour Rim Lighting" },
  { value: "surrounded by candles and warm palace decor, cinematic low-light glow", label: "Candlelight Low-Light Glow" },
  { value: "standing beneath crystal chandelier, dramatic luxury lighting reflections", label: "Crystal Chandelier Reflections" },
  { value: "cool blue moonlight on luxury terrace, subtle cinematic rim light", label: "Moonlight Cool Blue Terrace" },
  { value: "large octabox key light, soft directional studio lighting, gentle shadow transitions", label: "Large Octabox Studio Key Light" },
];

const BUILDER_JEWELLERY_OPTIONS = [
  { value: "heirloom uncut polki choker and matching jhumka earrings", label: "Uncut Polki Choker & Jhumkas" },
  { value: "statement royal kundan necklace set with green emerald drops", label: "Royal Kundan Set (Emerald Drops)" },
  { value: "solitaire diamond earrings and matching delicate diamond necklace", label: "Solitaire Diamond Set" },
  { value: "rose gold bridal necklace set with intricate filigree work", label: "Rose Gold Filigree Bridal Set" },
  { value: "authentic South Indian temple jewellery necklace with goddess motifs", label: "South Indian Temple Jewellery" },
];

const BUILDER_CAMERA_OPTIONS = [
  { value: "Sony A7R V, 85mm GM lens, f/2.0 aperture, RAW photo, shallow depth of field", label: "Sony A7R V (85mm GM f/2.0)" },
  { value: "Canon R5, 135mm lens, f/2.0, telephoto compression, creamy bokeh", label: "Canon R5 (135mm f/2.0 Telephoto)" },
  { value: "Hasselblad H6D-100c, 85mm f/1.4, medium format clarity, unedited RAW", label: "Hasselblad H6D-100c (Medium Format)" },
  { value: "Leica M11, 35mm Summilux f/1.4, natural daylight, authentic film grain", label: "Leica M11 (35mm Documentary)" },
  { value: "Sony A7R V, 90mm macro lens, f/2.8, extreme jewellery detail", label: "Sony 90mm Macro (Extreme Detail)" },
];

// Combine the jewellery presets with our PDF prompt items
const FULL_CATALOG: PromptItem[] = [
  ...PROMPT_LIBRARY_DATA,
  ...JEWELLERY_PRESETS.map((p) => ({
    id: p.id,
    category: (p.category === "bridal" ? "bridal" : p.category === "macro" ? "jewellery" : "jewellery") as PromptItem["category"],
    subCategory: "Customizable Suite",
    title: p.title,
    badge: p.badge,
    recommendedRatio: p.recommendedRatio,
    description: p.summary,
    prompt: p.promptTemplate("Necklace / Choker"),
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["jewellery", p.category, "luxury", "8k"],
    isCustomizableJewellery: true,
  })),
];

const CATEGORIES = [
  { id: "all", label: "All Prompts", count: FULL_CATALOG.length },
  { id: "jewellery", label: "Jewellery & Hero", count: FULL_CATALOG.filter((p) => p.category === "jewellery").length },
  { id: "bridal", label: "Bridal & Heritage", count: FULL_CATALOG.filter((p) => p.category === "bridal").length },
  { id: "poses", label: "Model Poses (30+)", count: FULL_CATALOG.filter((p) => p.category === "poses").length },
  { id: "consistent_video", label: "AI Video Consistency", count: FULL_CATALOG.filter((p) => p.category === "consistent_video").length },
  { id: "realism", label: "Anti-AI & Realism", count: FULL_CATALOG.filter((p) => p.category === "realism").length },
  { id: "fashion", label: "Haute Couture", count: FULL_CATALOG.filter((p) => p.category === "fashion").length },
  { id: "commercial", label: "Commercial Luxury", count: FULL_CATALOG.filter((p) => p.category === "commercial").length },
  { id: "cinematic", label: "Cinematic & Film", count: FULL_CATALOG.filter((p) => p.category === "cinematic").length },
];

export default function PromptLibraryPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJewelleryItem, setSelectedJewelleryItem] = useState("Necklace / Choker");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedNegativeId, setExpandedNegativeId] = useState<string | null>(null);

  // Interactive Prompt Builder State
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderOutfit, setBuilderOutfit] = useState("royal wine-purple silk saree with gold zari motifs");
  const [builderPose, setBuilderPose] = useState("one hand gently holding saree pallu near collarbone, neck elongated");
  const [builderLighting, setBuilderLighting] = useState("soft morning daylight entering through carved sandstone palace window");
  const [builderJewellery, setBuilderJewellery] = useState("heirloom uncut polki choker and matching jhumka earrings");
  const [builderCamera, setBuilderCamera] = useState("Sony A7R V, 85mm GM lens, f/2.0 aperture, RAW photo");
  const [includeRealismTag, setIncludeRealismTag] = useState(true);

  const builtCustomPrompt = useMemo(() => {
    let text = `Ultra-realistic luxury Indian fashion editorial photoshoot. Stunning Indian woman wearing a ${builderOutfit}, adorned with ${builderJewellery}. Pose: ${builderPose}. Lighting: ${builderLighting}. Shot on ${builderCamera}.`;
    if (includeRealismTag) {
      text += ` ${UNIVERSAL_REALISM_TAG}`;
    }
    return text;
  }, [builderOutfit, builderPose, builderLighting, builderJewellery, builderCamera, includeRealismTag]);

  const filteredPrompts = useMemo(() => {
    return FULL_CATALOG.filter((p) => {
      const matchesCat = activeCategory === "all" || p.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.prompt.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const getResolvedPrompt = (item: PromptItem) => {
    if (item.isCustomizableJewellery) {
      const preset = JEWELLERY_PRESETS.find((p) => p.id === item.id);
      if (preset) {
        return preset.promptTemplate(selectedJewelleryItem);
      }
    }
    return item.prompt;
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendToPipeline = (promptText: string, ratio: string) => {
    const encoded = encodeURIComponent(promptText);
    router.push(`/pipeline?prompt=${encoded}&aspect=${ratio}`);
  };

  const handleSendToVideo = (promptText: string, ratio: string) => {
    const encoded = encodeURIComponent(promptText);
    router.push(`/video?prompt=${encoded}&aspect=${ratio}`);
  };

  const handleSendToImage = (promptText: string, ratio: string) => {
    const encoded = encodeURIComponent(promptText);
    router.push(`/image?prompt=${encoded}&aspect=${ratio}`);
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.06] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 shadow-sm">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest uppercase text-amber-500 font-bold">
                HIGH-END PRODUCTION SUITE
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold">
                {FULL_CATALOG.length} PRESETS
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-zinc-950 dark:text-white">
              Prompt Library
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Interactive Prompt Builder */}
          <button
            type="button"
            onClick={() => setShowBuilder(!showBuilder)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-heading font-bold border transition-all cursor-pointer shadow-xs",
              showBuilder
                ? "bg-amber-500 text-zinc-950 border-amber-500"
                : "bg-zinc-100 dark:bg-white/[0.05] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-zinc-800 dark:text-zinc-200 border-black/[0.08] dark:border-white/[0.08]"
            )}
          >
            <Sliders className="w-4 h-4 text-amber-500" />
            <span>{showBuilder ? "Close Builder" : "Mix & Match Builder"}</span>
          </button>

          {/* Jewellery Piece Selector */}
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-white/[0.05] p-1.5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] min-w-[200px]">
            <span className="text-[11px] font-mono text-zinc-500 pl-2">Piece:</span>
            <div className="flex-1">
              <ModernSelect
                value={selectedJewelleryItem}
                onChange={(val) => setSelectedJewelleryItem(val)}
                options={JEWELLERY_ITEMS.map((item) => ({ value: item.label, label: item.label }))}
                size="sm"
                triggerClassName="rounded-xl border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#181820]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Mix & Match Prompt Builder (Collapsible) */}
      {showBuilder && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.03] p-5 sm:p-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-heading font-bold text-zinc-950 dark:text-white">
                Interactive Studio Prompt Builder
              </h2>
            </div>
            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
              Assemble & Launch
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* Outfit */}
            <div className="space-y-1">
              <ModernSelect
                label="Outfit & Fabric"
                value={builderOutfit}
                onChange={(val) => setBuilderOutfit(val)}
                options={BUILDER_OUTFIT_OPTIONS}
                searchable
              />
            </div>

            {/* Pose */}
            <div className="space-y-1">
              <ModernSelect
                label="Pose & Posture"
                value={builderPose}
                onChange={(val) => setBuilderPose(val)}
                options={BUILDER_POSE_OPTIONS}
                searchable
              />
            </div>

            {/* Lighting */}
            <div className="space-y-1">
              <ModernSelect
                label="Lighting & Atmosphere"
                value={builderLighting}
                onChange={(val) => setBuilderLighting(val)}
                options={BUILDER_LIGHTING_OPTIONS}
                searchable
              />
            </div>

            {/* Jewellery */}
            <div className="space-y-1">
              <ModernSelect
                label="Jewellery Style"
                value={builderJewellery}
                onChange={(val) => setBuilderJewellery(val)}
                options={BUILDER_JEWELLERY_OPTIONS}
                searchable
              />
            </div>

            {/* Camera / Lens */}
            <div className="space-y-1">
              <ModernSelect
                label="Camera & Lens"
                value={builderCamera}
                onChange={(val) => setBuilderCamera(val)}
                options={BUILDER_CAMERA_OPTIONS}
                searchable
              />
            </div>

            {/* Universal Realism Checkbox */}
            <div className="flex items-center gap-2 pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={includeRealismTag}
                  onChange={(e) => setIncludeRealismTag(e.target.checked)}
                  className="rounded border-amber-500 text-amber-500 focus:ring-amber-500 cursor-pointer w-4 h-4"
                />
                <span>Include Universal Realism Tag (No-AI look)</span>
              </label>
            </div>
          </div>

          {/* Generated Result Box */}
          <div className="p-3.5 rounded-xl bg-black/5 dark:bg-black/50 border border-black/[0.06] dark:border-white/[0.08] text-[11px] font-mono text-zinc-800 dark:text-zinc-200 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">
            {builtCustomPrompt}
          </div>

          {/* Builder Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleCopy(builtCustomPrompt, "custom_builder")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all cursor-pointer font-bold shadow-xs"
            >
              {copiedId === "custom_builder" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === "custom_builder" ? "Copied!" : "Copy Custom Prompt"}</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSendToPipeline(builtCustomPrompt, "9:16")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-mono bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold transition-all cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Launch in Pipeline</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendToVideo(builtCustomPrompt, "9:16")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-mono bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 font-bold transition-all cursor-pointer"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video Studio</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendToImage(builtCustomPrompt, "9:16")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-mono bg-violet-500/15 hover:bg-violet-500/25 text-violet-600 dark:text-violet-400 border border-violet-500/30 font-bold transition-all cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Image Studio</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Realism & Anti-AI Pro Tips Banner */}
      <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-zinc-50 dark:bg-[#14141c] p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-heading font-bold text-zinc-950 dark:text-white">
              Studio Realism Formula (No-AI Look)
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-2xl">
            Never use words like <code className="text-red-500">masterpiece, 8k, award winning</code>. Instead, use camera lenses (
            <code className="text-emerald-500">Sony A7R V, 85mm GM, f/2</code>) and organic tags (
            <code className="text-emerald-500">visible pores, natural asymmetry, RAW photo, unretouched skin</code>).
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleCopy(UNIVERSAL_REALISM_TAG, "universal_realism_tag")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer shrink-0 font-medium"
        >
          {copiedId === "universal_realism_tag" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedId === "universal_realism_tag" ? "Copied Realism Tag!" : "Copy Realism Tag"}</span>
        </button>
      </div>

      {/* Search & Category Filter Pills */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts by title, pose, jewellery type, lighting (e.g. chandelier, kundan, staircase, leica)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono bg-zinc-100 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-amber-500/50"
          />
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-heading shrink-0 transition-all cursor-pointer flex items-center gap-1.5 font-medium",
                  isActive
                    ? "bg-amber-500 text-zinc-950 font-bold shadow-xs scale-[1.02]"
                    : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.08] border border-black/[0.04] dark:border-white/[0.06]"
                )}
              >
                <span>{cat.label}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-md font-mono",
                    isActive
                      ? "bg-zinc-950/20 text-zinc-950 font-bold"
                      : "bg-black/[0.04] dark:bg-white/[0.06] text-zinc-500"
                  )}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Prompt Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPrompts.map((item) => {
          const resolvedPrompt = getResolvedPrompt(item);
          const isCopied = copiedId === item.id;
          const isNegativeExpanded = expandedNegativeId === item.id;

          return (
            <div
              key={item.id}
              className="group rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#121218] p-4 sm:p-5 flex flex-col justify-between hover:border-amber-500/40 hover:shadow-lg transition-all space-y-3.5"
            >
              <div className="space-y-3">
                {/* Card Top: Badges & Aspect Ratio */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 uppercase">
                      {item.badge}
                    </span>
                    {item.subCategory && (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-mono bg-zinc-100 dark:bg-white/[0.04] text-zinc-500 dark:text-zinc-400 border border-black/[0.04] dark:border-white/[0.06]">
                        {item.subCategory}
                      </span>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-mono bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 border border-black/[0.06] dark:border-white/[0.06] shrink-0">
                    {item.recommendedRatio}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-sm font-heading font-bold text-zinc-950 dark:text-white group-hover:text-amber-500 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                    {item.description}
                  </p>
                </div>

                {/* Camera / Lens Tag if provided */}
                {item.cameraDetails && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-white/[0.03] px-2 py-1 rounded-lg border border-black/[0.04] dark:border-white/[0.05]">
                    <Camera className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="truncate">{item.cameraDetails}</span>
                  </div>
                )}

                {/* Prompt Preview Box */}
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-black/40 border border-black/[0.04] dark:border-white/[0.06] text-[11px] font-mono text-zinc-800 dark:text-zinc-300 max-h-28 overflow-y-auto custom-scrollbar leading-relaxed">
                  {resolvedPrompt}
                </div>

                {/* Negative Prompt Collapsible if present */}
                {item.negativePrompt && (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setExpandedNegativeId(isNegativeExpanded ? null : item.id)}
                      className="flex items-center justify-between w-full text-[10px] font-mono text-zinc-400 hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1 text-red-400/80">
                        <span>Negative Prompt</span>
                      </span>
                      {isNegativeExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {isNegativeExpanded && (
                      <div className="p-2.5 rounded-lg bg-red-500/[0.03] border border-red-500/20 text-[10px] font-mono text-red-300/90 leading-relaxed animate-in fade-in duration-150">
                        {item.negativePrompt}
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-white/[0.03] px-1.5 py-0.5 rounded"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(resolvedPrompt, item.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer border",
                    isCopied
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-zinc-800 dark:text-zinc-200 border-black/[0.08] dark:border-white/[0.08]"
                  )}
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
                  <span>{isCopied ? "Copied" : "Copy"}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSendToPipeline(resolvedPrompt, item.recommendedRatio)}
                    title="Run in Auto Pipeline"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Pipeline</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendToVideo(resolvedPrompt, item.recommendedRatio)}
                    title="Open in Video Studio"
                    className="p-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 transition-all cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendToImage(resolvedPrompt, item.recommendedRatio)}
                    title="Open in Image Studio"
                    className="p-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30 transition-all cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
