"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
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
  ArrowRight,
  Filter,
  Play,
  Share2,
  Sliders,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Cpu,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { JEWELLERY_ITEMS, JEWELLERY_PRESETS, JewelleryPreset } from "@/components/studio/JewelleryPromptSuite";

interface PromptItem {
  id: string;
  category: "jewellery" | "bridal" | "fashion" | "commercial" | "cinematic" | "macro" | "scifi" | "portrait";
  title: string;
  badge: string;
  recommendedRatio: "9:16" | "16:9" | "1:1" | "4:5";
  description: string;
  prompt: string;
  negativePrompt?: string;
  tags: string[];
  isCustomizableJewellery?: boolean;
}

const MASTER_PROMPT_CATALOG: PromptItem[] = [
  // 1. Jewellery & Bridal Collection (From JewelleryPromptSuite)
  ...JEWELLERY_PRESETS.map((p) => ({
    id: p.id,
    category: (p.category === "bridal" ? "bridal" : p.category === "macro" ? "macro" : "jewellery") as PromptItem["category"],
    title: p.title,
    badge: p.badge,
    recommendedRatio: p.recommendedRatio,
    description: p.summary,
    prompt: p.promptTemplate("Necklace / Choker"),
    negativePrompt: "blurry, low quality, distorted metal, extra fingers, cartoon, plastic",
    tags: ["jewellery", p.category, "luxury", "8k"],
    isCustomizableJewellery: true,
  })),

  // 2. High-Fashion & Editorial
  {
    id: "fashion_haute_couture",
    category: "fashion",
    title: "Vogue Haute Couture Silk Editorial",
    badge: "HAUTE COUTURE",
    recommendedRatio: "9:16",
    description: "Striking high-fashion model wearing champagne raw silk in minimalist architectural lighting.",
    prompt: "High-fashion editorial model in champagne haute couture pleated silk garment, dramatic studio key lighting, soft natural shadows, Hasselblad 85mm f/1.2, Vogue magazine cover aesthetic, delicate skin textures, ultra-realistic, 8k.",
    negativePrompt: "bad anatomy, cartoon, drawing, plastic skin, flat lighting",
    tags: ["fashion", "editorial", "portrait", "vogue"],
  },
  {
    id: "fashion_paris_runway",
    category: "fashion",
    title: "Paris Fashion Week Runway Motion",
    badge: "RUNWAY 4K",
    recommendedRatio: "9:16",
    description: "Dynamic low-angle runway walk with flash photography and flowing haute couture textiles.",
    prompt: "Ultra-luxury Paris Fashion Week runway show, elegant female model striding forward in flowing crimson chiffon gown, dynamic fabric motion flutter, front camera flash with dark background, 85mm f/1.4 lens, 60fps cinematic runway walk, 8k resolution.",
    negativePrompt: "blurry, jerky motion, deformed limbs, CGI, render",
    tags: ["runway", "fashion", "model", "motion"],
  },

  // 3. Cinematic & Video Studio
  {
    id: "cinema_cyberpunk_rain",
    category: "cinematic",
    title: "Cinematic Cyberpunk Neon Rain",
    badge: "ANAMORPHIC",
    recommendedRatio: "16:9",
    description: "Atmospheric neon rain reflections on wet asphalt with anamorphic flares and volumetric steam.",
    prompt: "Cinematic cyberpunk cityscape in heavy neon rain, reflections on wet asphalt, volumetric blue and amber steam, anamorphic horizontal lens flare, Arri Alexa LF 35mm, Blade Runner 2049 aesthetic, shallow depth of field, 8k cinematic masterpiece.",
    negativePrompt: "oversaturated, flat, lowres, cartoon, noisy",
    tags: ["cyberpunk", "rain", "neon", "cinematic"],
  },
  {
    id: "cinema_rajasthan_royal",
    category: "bridal",
    title: "Royal Indian Palace Courtyard Entrance",
    badge: "HERITAGE 4K",
    recommendedRatio: "9:16",
    description: "Opulent royal bride walking through sun-drenched Jodhpur palace corridor with gold zardozi lehenga.",
    prompt: "Cinematic tracking shot of an Indian royal bride walking through an antique sandstone palace corridor in Jaipur, draped in a crimson velvet lehenga adorned with authentic gold zardozi embroidery and heirloom polki jewellery, soft warm sunlight streaming through carved jharokha arches, 85mm f/1.2 lens, 24fps motion, 8k photorealistic.",
    negativePrompt: "western style, modern clothing, cartoon, blurry, distorted face, plastic",
    tags: ["bridal", "palace", "indian", "heritage", "reel"],
  },

  // 4. Commercial & Luxury Products
  {
    id: "commercial_swiss_chronometer",
    category: "commercial",
    title: "Swiss Luxury Chronometer on Obsidian",
    badge: "COMMERCIAL AD",
    recommendedRatio: "1:1",
    description: "Macro advertising shot of a gold chronograph watch on volcanic black stone with water caustics.",
    prompt: "Ultra-luxury commercial product photograph of a gold Swiss chronograph watch on polished volcanic black obsidian slate, crystal-clear water caustics reflecting shimmering rays, 100mm macro lens, pristine reflections, Rolex and Patek Philippe advertising grade, 8k.",
    negativePrompt: "scratches, dust, fingerprint smudges, low contrast, cartoon",
    tags: ["watch", "luxury", "product", "commercial"],
  },
  {
    id: "commercial_perfume_water",
    category: "commercial",
    title: "Crystal Perfume Flacon & Liquid Waves",
    badge: "COSMETICS 8K",
    recommendedRatio: "9:16",
    description: "Artisanal glass perfume bottle rising through turquoise water ripples with sunlit caustics.",
    prompt: "High-end luxury beauty advertisement of an amber glass perfume bottle emerging from crystalline turquoise water ripples. Golden sunset caustics, floating droplets frozen in air, soft pastel coral background, ultra-sharp macro clarity, high-speed photography, 8k.",
    negativePrompt: "murky water, bubbles, blurry bottle, distorted logo",
    tags: ["perfume", "cosmetics", "commercial", "macro"],
  },

  // 5. Sci-Fi & Unreal Worlds
  {
    id: "scifi_interstellar_horizon",
    category: "scifi",
    title: "Planetary Twin-Moon Horizon",
    badge: "SCI-FI EPIC",
    recommendedRatio: "16:9",
    description: "Lone astronaut standing on alien red sand dune beneath dual crescent celestial bodies.",
    prompt: "Cinematic sci-fi still of an astronaut standing on a sweeping red sand dune on an alien world, looking up at two giant crescent moons rising over a glowing atmospheric horizon, dramatic golden rim lighting, epic scale, Interstellar cinematic color grading, 70mm IMAX format.",
    negativePrompt: "cartoon, flat lighting, CGI look, blurry",
    tags: ["scifi", "space", "astronaut", "imax"],
  },

  // 6. Realistic Portraiture
  {
    id: "portrait_documentary_leica",
    category: "portrait",
    title: "Authentic Leica M11 Documentary Portrait",
    badge: "LEICA REALISM",
    recommendedRatio: "4:5",
    description: "National Geographic grade documentary portrait with authentic skin texture and natural overcast light.",
    prompt: "Intimate documentary portrait of a weathered artisan craftsman in his workshop, natural soft window light, deep authentic eye reflections, natural skin pores and textures, Leica M11 with 50mm Summilux f/1.4 lens, National Geographic award-winning photography, rich black and white or muted film tones, 8k.",
    negativePrompt: "airbrushed skin, plastic, doll, CGI, render, blurry eyes",
    tags: ["portrait", "leica", "documentary", "realism"],
  },
];

const CATEGORIES = [
  { id: "all", label: "All Prompts" },
  { id: "jewellery", label: "Jewellery" },
  { id: "bridal", label: "Bridal & Heritage" },
  { id: "fashion", label: "Haute Couture" },
  { id: "commercial", label: "Commercial" },
  { id: "cinematic", label: "Cinematic" },
  { id: "macro", label: "Macro 8K" },
  { id: "scifi", label: "Sci-Fi" },
  { id: "portrait", label: "Portraiture" },
];

export default function PromptLibraryPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJewelleryItem, setSelectedJewelleryItem] = useState("Necklace / Choker");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredPrompts = useMemo(() => {
    return MASTER_PROMPT_CATALOG.filter((p) => {
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

  const handleCopy = (item: PromptItem) => {
    const text = getResolvedPrompt(item);
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendToPipeline = (item: PromptItem) => {
    const text = getResolvedPrompt(item);
    const encoded = encodeURIComponent(text);
    router.push(`/pipeline?prompt=${encoded}&aspect=${item.recommendedRatio}`);
  };

  const handleSendToVideo = (item: PromptItem) => {
    const text = getResolvedPrompt(item);
    const encoded = encodeURIComponent(text);
    router.push(`/video?prompt=${encoded}&aspect=${item.recommendedRatio}`);
  };

  const handleSendToImage = (item: PromptItem) => {
    const text = getResolvedPrompt(item);
    const encoded = encodeURIComponent(text);
    router.push(`/image?prompt=${encoded}&aspect=${item.recommendedRatio}`);
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.06] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest uppercase text-amber-500 font-bold">
                CURATED PROMPT REPOSITORY
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {MASTER_PROMPT_CATALOG.length} PRESETS
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-zinc-950 dark:text-white">
              Prompt Library
            </h1>
          </div>
        </div>

        {/* Global Item Customizer for Jewellery */}
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-white/[0.05] p-1.5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08]">
          <span className="text-[11px] font-mono text-zinc-500 pl-2">Piece:</span>
          <select
            value={selectedJewelleryItem}
            onChange={(e) => setSelectedJewelleryItem(e.target.value)}
            className="bg-white dark:bg-[#181820] text-xs font-heading font-bold rounded-xl px-3 py-1.5 border border-black/[0.08] dark:border-white/[0.1] text-zinc-800 dark:text-zinc-200 outline-hidden cursor-pointer"
          >
            {JEWELLERY_ITEMS.map((item) => (
              <option key={item.id} value={item.label}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search & Category Filter Pills */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts by title, style, jewellery piece, or keywords (e.g. bridal, lehenga, macro)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono bg-zinc-100 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-amber-500/50"
            />
          </div>
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
                  "px-3.5 py-1.5 rounded-xl text-xs font-heading shrink-0 transition-all cursor-pointer font-medium",
                  isActive
                    ? "bg-amber-500 text-zinc-950 font-bold shadow-xs scale-[1.02]"
                    : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.08] border border-black/[0.04] dark:border-white/[0.06]"
                )}
              >
                {cat.label}
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

          return (
            <div
              key={item.id}
              className="group rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#121218] p-4 sm:p-5 flex flex-col justify-between hover:border-amber-500/40 hover:shadow-lg transition-all space-y-4"
            >
              <div className="space-y-3">
                {/* Card Top: Badges & Aspect Ratio */}
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 uppercase">
                    {item.badge}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-mono bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 border border-black/[0.06] dark:border-white/[0.06]">
                    Ratio: {item.recommendedRatio}
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

                {/* Prompt Preview Box */}
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-black/40 border border-black/[0.04] dark:border-white/[0.06] text-[11px] font-mono text-zinc-800 dark:text-zinc-300 max-h-28 overflow-y-auto custom-scrollbar leading-relaxed">
                  {resolvedPrompt}
                </div>

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
                  onClick={() => handleCopy(item)}
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
                    onClick={() => handleSendToPipeline(item)}
                    title="Run in Auto Pipeline"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Pipeline</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendToVideo(item)}
                    title="Open in Video Studio"
                    className="p-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 transition-all cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendToImage(item)}
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
