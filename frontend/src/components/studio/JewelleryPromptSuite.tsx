"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Check,
  Copy,
  ChevronRight,
  Eye,
  Sliders,
  Gem,
  Palette,
  Sun,
  Flame,
  ArrowRight,
  X,
  Upload,
  FolderArchive,
  Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface JewelleryPreset {
  id: string;
  category: "model" | "aesthetic" | "macro" | "bridal" | "dark_moody" | "cinema";
  title: string;
  badge: string;
  recommendedRatio: "1:1" | "4:5" | "9:16" | "16:9";
  summary: string;
  promptTemplate: (item: string) => string;
}

export const JEWELLERY_ITEMS = [
  { id: "necklace", label: "Necklace / Choker", focus: "collarbone, neckline & décolletage" },
  { id: "earrings", label: "Earrings / Drops", focus: "earlobes, jawline & tucked hairstyle" },
  { id: "ring", label: "Gemstone / Diamond Ring", focus: "manicured hand, elegant fingers & velvet" },
  { id: "bracelet", label: "Bracelet / Bangle", focus: "wrist, forearm & silk cuff" },
  { id: "bridal_set", label: "Full Bridal Jewellery Set", focus: "royal bride neck, maang tikka, earrings" },
  { id: "watch", label: "Luxury Chronograph Watch", focus: "wrist, metallic dial & sapphire crystal" },
];

export const JEWELLERY_PRESETS: JewelleryPreset[] = [
  {
    id: "model_vogue_editorial",
    category: "model",
    title: "Vogue Haute Couture Editorial",
    badge: "HIGH-FASHION",
    recommendedRatio: "4:5",
    summary: "High-end fashion magazine editorial featuring an elegant model wearing the reference piece.",
    promptTemplate: (item) =>
      `Ultra-luxury Vogue editorial photography of a high-fashion female model wearing the exquisite reference ${item}. Champagne silk haute couture gown with elegant neckline, soft natural studio key light, delicate golden rim light highlighting skin texture and metal finish, shallow depth of field, f/1.8, 85mm portrait lens, 8k resolution, crisp photorealistic details.`
  },
  {
    id: "model_modern_lifestyle",
    category: "model",
    title: "Effortless Chic Lifestyle",
    badge: "LIFESTYLE",
    recommendedRatio: "1:1",
    summary: "Warm daylight portrait on an oversized linen blazer, effortless European luxury vibe.",
    promptTemplate: (item) =>
      `Effortless modern luxury lifestyle portrait, close crop focusing on model wearing the fine reference ${item}. Styled with an oversized neutral beige linen blazer, sun-drenched warm afternoon daylight casting soft shadows, candid natural pose, clean Pinterest aesthetic, 35mm film grain, Hasselblad commercial quality, 8k.`
  },
  {
    id: "aesthetic_travertine_silk",
    category: "aesthetic",
    title: "Travertine & Raw Silk Pedestal",
    badge: "COMMERCIAL STILL-LIFE",
    recommendedRatio: "1:1",
    summary: "Organic architectural still-life on sculpted beige travertine stone draped with raw cream silk.",
    promptTemplate: (item) =>
      `Aesthetic luxury commercial still-life of the reference ${item} artfully placed on a sculpted beige travertine stone pedestal, draped with flowing cream raw silk fabric folds. Warm morning architectural sunlight streaming through sheer curtains creating soft textured shadows, minimal Scandinavian luxury brand campaign, hyper-detailed macro textures, 8k.`
  },
  {
    id: "aesthetic_white_marble_water",
    category: "aesthetic",
    title: "Carrara Marble & Water Ripples",
    badge: "SPA LUXURY",
    recommendedRatio: "16:9",
    summary: "Pristine white Carrara marble with crystalline water ripples and natural caustics.",
    promptTemplate: (item) =>
      `High-end luxury jewelry advertising shot of the reference ${item} resting on smooth polished white Carrara marble with shallow crystal-clear water ripples. Radiant sunlight caustics reflecting shimmering golden rays across the gemstones, clean minimalist spa aesthetic, ultra-crisp reflections, 8k resolution.`
  },
  {
    id: "macro_gemstone_prism",
    category: "macro",
    title: "Extreme Gemstone Macro & Prisms",
    badge: "MACRO 8K",
    recommendedRatio: "1:1",
    summary: "Hyper-detailed macro highlighting diamond facets, brilliant refractive dispersion & gold finish.",
    promptTemplate: (item) =>
      `Extreme macro photography of the reference ${item}, capturing microscopic artisanal craftsmanship. Diamond facets catching direct studio light with brilliant spectral prismatic color dispersion, micro-reflections in polished gold, creamy blurred luxury bokeh background, studio precision lighting, 8k hyper-detail.`
  },
  {
    id: "bridal_heritage_palace",
    category: "bridal",
    title: "Royal Heritage Bridal Grandeur",
    badge: "ROYAL HERITAGE",
    recommendedRatio: "4:5",
    summary: "Opulent Indian royal bride draped in embroidered velvet lehenga in an antique palace corridor.",
    promptTemplate: (item) =>
      `Regal Indian royal bridal portrait, graceful bride adorned with the majestic reference ${item}. Rich crimson velvet lehenga intricately embroidered with antique gold zardozi motifs, vintage Rajasthani palace hallway with warm candle chandelier glow, cinematic regal masterpiece, rich atmospheric depth, 8k.`
  },
  {
    id: "dark_obsidian_spotlight",
    category: "dark_moody",
    title: "Dark Obsidian & Gold Chiaroscuro",
    badge: "DARK MOODY",
    recommendedRatio: "1:1",
    summary: "Dramatic moody chiaroscuro on volcanic black slate with focused golden spotlight beam.",
    promptTemplate: (item) =>
      `Dark moody chiaroscuro luxury product photography of the reference ${item} displayed on raw volcanic black obsidian slate with subtle fine mist droplets. Single high-intensity focused golden spotlight beam illuminating the metalwork and gemstones, dramatic contrast, deep obsidian shadows, Cartier and Bvlgari luxury catalog look, 8k.`
  },
  {
    id: "cinema_orbital_motion",
    category: "cinema",
    title: "Cinematic Orbital 360 Video Motion",
    badge: "VIDEO READY",
    recommendedRatio: "16:9",
    summary: "Smooth 360 orbital camera rotation with glistening light sweeps, ideal for AI Video Engines.",
    promptTemplate: (item) =>
      `Cinematic slow orbital 360 camera rotation gliding around the reference ${item}, dynamic light sweeps catching every gemstone facet with radiant glistening flares, smooth push-in camera trajectory, shallow depth of field with velvet bokeh, 60fps buttery cinematic motion, movie studio lighting.`
  }
];

interface JewelleryPromptSuiteProps {
  hasReferenceImage?: boolean;
  onSelectPrompt: (promptText: string, recommendedRatio?: string) => void;
  onUploadImage?: (file: File) => void;
  onOpenVault?: () => void;
  className?: string;
  isCompact?: boolean;
}

export default function JewelleryPromptSuite({
  hasReferenceImage = false,
  onSelectPrompt,
  onUploadImage,
  onOpenVault,
  className,
  isCompact = false,
}: JewelleryPromptSuiteProps) {
  const [selectedItem, setSelectedItem] = useState("necklace");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const activeItemObj = JEWELLERY_ITEMS.find((i) => i.id === selectedItem) || JEWELLERY_ITEMS[0];

  const filteredPresets = selectedCategory === "all"
    ? JEWELLERY_PRESETS
    : JEWELLERY_PRESETS.filter((p) => p.category === selectedCategory);

  const handleApply = (preset: JewelleryPreset) => {
    const text = preset.promptTemplate(activeItemObj.label);
    onSelectPrompt(text, preset.recommendedRatio);
    setAppliedId(preset.id);
    setTimeout(() => setAppliedId(null), 2500);
  };

  const handleCopy = (preset: JewelleryPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = preset.promptTemplate(activeItemObj.label);
    navigator.clipboard.writeText(text);
    setCopiedId(preset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-white/95 dark:bg-[#121218]/95 backdrop-blur-md p-4 sm:p-5 space-y-4 shadow-xl text-zinc-900 dark:text-zinc-100",
        className
      )}
    >
      {/* Top Banner & Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
            <Gem className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-heading font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                Jewellery Reference Variations
              </h3>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 uppercase">
                PRO PRESETS
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {hasReferenceImage
                ? "Pre-engineered luxury prompts adapted to your uploaded reference piece"
                : "Select jewellery piece & 1-click apply high-conversion editorial and aesthetic prompts"}
            </p>
          </div>
        </div>

        {/* Action Controls & Small Upload Button */}
        <div className="flex items-center gap-2">
          {onUploadImage && (
            <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-mono cursor-pointer transition-colors shadow-xs">
              <Upload className="w-3 h-3 text-amber-500" />
              <span>Upload Jewellery</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onUploadImage(e.target.files[0])}
              />
            </label>
          )}

          {onOpenVault && (
            <button
              type="button"
              onClick={onOpenVault}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-mono cursor-pointer transition-colors shadow-xs"
            >
              <FolderArchive className="w-3 h-3 text-violet-500" />
              <span>From Vault</span>
            </button>
          )}

          {appliedId && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>Prompt Applied</span>
            </div>
          )}
        </div>
      </div>

      {/* Item Type Selector Pills - Zero Emojis */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold flex items-center gap-1">
          <span>Target Jewellery Piece:</span>
          <span className="text-amber-600 dark:text-amber-400 font-bold">{activeItemObj.label}</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {JEWELLERY_ITEMS.map((item) => {
            const isSelected = item.id === selectedItem;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItem(item.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-heading transition-all duration-150 cursor-pointer",
                  isSelected
                    ? "bg-amber-500 text-zinc-950 font-bold shadow-xs scale-[1.01]"
                    : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-black/[0.06] dark:border-white/[0.06] hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Tabs - Clean Text Without Emojis */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: "all", label: "All Variations (8)" },
          { id: "model", label: "Model Wearing" },
          { id: "aesthetic", label: "Aesthetic Still-Life" },
          { id: "macro", label: "Macro Sparkle" },
          { id: "bridal", label: "Royal Bridal" },
          { id: "dark_moody", label: "Dark Obsidian" },
          { id: "cinema", label: "360 Video Motion" },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-mono whitespace-nowrap transition-colors cursor-pointer border",
              selectedCategory === cat.id
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold"
                : "text-zinc-600 dark:text-zinc-400 border-transparent hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.04]"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
        {filteredPresets.map((preset) => {
          const isApplied = appliedId === preset.id;
          const isCopied = copiedId === preset.id;
          const promptText = preset.promptTemplate(activeItemObj.label);

          return (
            <div
              key={preset.id}
              onClick={() => handleApply(preset)}
              className={cn(
                "group relative rounded-xl border p-3.5 flex flex-col justify-between gap-2.5 transition-all duration-200 cursor-pointer",
                isApplied
                  ? "border-emerald-500 bg-emerald-500/[0.06] ring-1 ring-emerald-500/40"
                  : "border-black/[0.08] dark:border-white/[0.08] bg-zinc-50/70 dark:bg-zinc-900/60 hover:border-amber-500/40 hover:bg-amber-500/[0.03]"
              )}
            >
              {/* Card Header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 uppercase">
                    {preset.badge}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
                    <span>Ratio:</span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      {preset.recommendedRatio}
                    </span>
                  </div>
                </div>

                <h4 className="text-xs font-heading font-bold text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                  {preset.title}
                </h4>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed font-jakarta">
                  {preset.summary}
                </p>
              </div>

              {/* Prompt Snippet Preview */}
              <div className="rounded-lg bg-zinc-100 dark:bg-black/40 border border-black/[0.04] dark:border-white/[0.04] p-2 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 line-clamp-2 italic">
                &ldquo;{promptText}&rdquo;
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-1 border-t border-black/[0.04] dark:border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform font-medium">
                  <span>Apply to Prompt</span>
                  <ArrowRight className="w-3 h-3" />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleCopy(preset, e)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    title="Copy full prompt text"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApply(preset);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-heading font-bold flex items-center gap-1 transition-all",
                      isApplied
                        ? "bg-emerald-600 text-white"
                        : "bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-xs"
                    )}
                  >
                    {isApplied ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Applied</span>
                      </>
                    ) : (
                      <span>Use Prompt</span>
                    )}
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
