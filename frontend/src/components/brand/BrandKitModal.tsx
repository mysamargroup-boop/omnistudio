"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, Sparkles, Palette, Type, Upload, Check, Loader2, 
  ShieldCheck, Sliders, Wand2, Image as ImageIcon, Trash2, Save 
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface BrandKitData {
  brand_name: string;
  tagline: string;
  logo_url: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  typography: {
    primary_font: string;
    heading_style: string;
  };
  style_guidelines: string;
  negative_guidelines: string;
  apply_to_generation: boolean;
}

export const PRESET_TEMPLATES = [
  {
    name: "Emerald Pro (Omni)",
    colors: { primary: "#10b981", secondary: "#71717a", accent: "#06b6d4", background: "#09090b" },
    typography: { primary_font: "Inter", heading_style: "Modern Sans" },
    style_guidelines: "Linear-inspired dark interface aesthetic, clean edge reflections, subtle emerald luminescence, pristine studio contrast, minimalist precision.",
    negative_guidelines: "cluttered, rainbow gradients, noisy, low contrast, washed out"
  },
  {
    name: "Luxury Couture",
    colors: { primary: "#c5a059", secondary: "#1c1917", accent: "#fef08a", background: "#0c0a09" },
    typography: { primary_font: "Playfair Display", heading_style: "Luxury Serif" },
    style_guidelines: "Vogue luxury aesthetic, opulent warm caustics, soft architectural chiaroscuro, cinematic shallow depth of field, high-fashion editorial styling.",
    negative_guidelines: "cheap, plastic, cartoony, low-res, amateur"
  },
  {
    name: "Cyberpunk Tech",
    colors: { primary: "#06b6d4", secondary: "#8b5cf6", accent: "#10b981", background: "#09090b" },
    typography: { primary_font: "JetBrains Mono", heading_style: "Tech Mono" },
    style_guidelines: "High-tech cyberpunk aesthetic, volumetric neon glow, wet reflective asphalt, atmospheric haze, octane render 8k detail.",
    negative_guidelines: "daylight, sepia, vintage, muted, flat lighting"
  },
  {
    name: "Minimalist Studio",
    colors: { primary: "#3b82f6", secondary: "#64748b", accent: "#38bdf8", background: "#ffffff" },
    typography: { primary_font: "Inter", heading_style: "Modern Sans" },
    style_guidelines: "Clean commercial product lighting, high-key studio, pristine reflections, Apple advertising aesthetic, ultra sharp focus.",
    negative_guidelines: "grunge, noisy, messy background, low contrast"
  },
  {
    name: "Cinematic Noir",
    colors: { primary: "#e4e4e7", secondary: "#52525b", accent: "#38bdf8", background: "#09090b" },
    typography: { primary_font: "Cinzel", heading_style: "Modern Sans" },
    style_guidelines: "35mm anamorphic film grain, dramatic high-contrast key lighting, moody atmospheric shadows, masterpiece cinematography.",
    negative_guidelines: "oversaturated, flat lighting, digital look, cartoony"
  }
];

export interface BrandKitPanelProps {
  onSaved?: (kit: BrandKitData) => void;
  className?: string;
  isEmbedded?: boolean;
}

export function BrandKitPanel({ onSaved, className, isEmbedded = false }: BrandKitPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [brandName, setBrandName] = useState("OmniStudio");
  const [tagline, setTagline] = useState("Next-Gen AI Cinematic Production");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#10b981");
  const [secondaryColor, setSecondaryColor] = useState("#71717a");
  const [accentColor, setAccentColor] = useState("#06b6d4");
  const [backgroundColor, setBackgroundColor] = useState("#09090b");
  const [primaryFont, setPrimaryFont] = useState("Inter");
  const [headingStyle, setHeadingStyle] = useState("Modern Sans");
  const [styleGuidelines, setStyleGuidelines] = useState("");
  const [negativeGuidelines, setNegativeGuidelines] = useState("");
  const [applyToGeneration, setApplyToGeneration] = useState(true);

  useEffect(() => {
    async function fetchKit() {
      setLoading(true);
      try {
        const res = await api.getBrandKit();
        if (res && res.brand_kit) {
          const k = res.brand_kit;
          setBrandName(k.brand_name || "OmniStudio");
          setTagline(k.tagline || "");
          setLogoUrl(k.logo_url || "");
          if (k.colors) {
            setPrimaryColor(k.colors.primary || "#10b981");
            setSecondaryColor(k.colors.secondary || "#71717a");
            setAccentColor(k.colors.accent || "#06b6d4");
            setBackgroundColor(k.colors.background || "#09090b");
          }
          if (k.typography) {
            setPrimaryFont(k.typography.primary_font || "Inter");
            setHeadingStyle(k.typography.heading_style || "Modern Sans");
          }
          setStyleGuidelines(k.style_guidelines || "");
          setNegativeGuidelines(k.negative_guidelines || "");
          setApplyToGeneration(k.apply_to_generation ?? true);
        }
      } catch (e) {
        console.error("Failed to load Brand Kit:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchKit();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await api.uploadBrandLogo(file);
      if (res.success && res.logo_url) {
        setLogoUrl(res.logo_url);
      }
    } catch (err: any) {
      alert("Failed to upload logo: " + (err.message || err));
    } finally {
      setUploadingLogo(false);
    }
  };

  const applyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setPrimaryColor(preset.colors.primary);
    setSecondaryColor(preset.colors.secondary);
    setAccentColor(preset.colors.accent);
    setBackgroundColor(preset.colors.background);
    setPrimaryFont(preset.typography.primary_font);
    setHeadingStyle(preset.typography.heading_style);
    setStyleGuidelines(preset.style_guidelines);
    setNegativeGuidelines(preset.negative_guidelines);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const payload: BrandKitData = {
        brand_name: brandName,
        tagline,
        logo_url: logoUrl,
        colors: {
          primary: primaryColor,
          secondary: secondaryColor,
          accent: accentColor,
          background: backgroundColor
        },
        typography: {
          primary_font: primaryFont,
          heading_style: headingStyle
        },
        style_guidelines: styleGuidelines,
        negative_guidelines: negativeGuidelines,
        apply_to_generation: applyToGeneration
      };
      await api.updateBrandKit(payload);
      setSaveSuccess(true);
      if (onSaved) onSaved(payload);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2500);
    } catch (err: any) {
      alert("Failed to save Brand Kit: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3 font-mono text-xs text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
        <p>Loading Brand Kit Assets...</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Embedded Header (when on Settings page) */}
      {isEmbedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.06] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shadow-xs border border-black/10 dark:border-white/20">
              <Palette className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-heading font-bold text-zinc-950 dark:text-white">
                  Brand Kit & Visual Identity
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  IDENTITY
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-jakarta mt-0.5">
                Configure brand logos, color harmonies, and aesthetic guidelines automatically injected into your AI generations.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 font-heading font-bold text-xs tracking-tight transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{saveSuccess ? "Saved Brand Kit!" : "Save Brand Kit"}</span>
          </button>
        </div>
      )}

      {/* Quick Industry Presets */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-mono">
          <Wand2 className="w-3.5 h-3.5 text-emerald-500" />
          Industry Style Presets
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {PRESET_TEMPLATES.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p)}
              className="flex flex-col items-start p-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] hover:border-emerald-500/50 bg-zinc-50 dark:bg-white/[0.03] hover:bg-emerald-500/[0.04] transition-all text-left group cursor-pointer"
            >
              <span className="text-xs font-bold font-heading text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-500 transition-colors truncate w-full">
                {p.name}
              </span>
              <div className="flex items-center gap-1.5 mt-2.5">
                <span className="w-3 h-3 rounded-full border border-black/10 dark:border-white/20 shadow-xs" style={{ backgroundColor: p.colors.primary }} />
                <span className="w-3 h-3 rounded-full border border-black/10 dark:border-white/20 shadow-xs" style={{ backgroundColor: p.colors.secondary }} />
                <span className="w-3 h-3 rounded-full border border-black/10 dark:border-white/20 shadow-xs" style={{ backgroundColor: p.colors.accent }} />
                <span className="w-3 h-3 rounded-full border border-black/10 dark:border-white/20 shadow-xs" style={{ backgroundColor: p.colors.background }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Brand Identity & Logo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
            Brand / Studio / Agency Name
          </label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="e.g. Acme Studios"
            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-black/[0.08] dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
            Tagline / Sub-Brand Concept
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g. Next-Gen Cinematic Production"
            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-black/[0.08] dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-mono"
          />
        </div>
      </div>

      {/* Logo Upload & Preview */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
          Brand Logo / Watermark Asset
        </label>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-dashed border-black/[0.12] dark:border-white/[0.12] bg-zinc-50 dark:bg-white/[0.02]">
          {logoUrl ? (
            <div className="relative w-16 h-16 rounded-xl bg-zinc-900 border border-black/10 dark:border-white/10 flex items-center justify-center p-2 overflow-hidden shrink-0 shadow-xs">
              <img src={getMediaUrl(logoUrl)} alt="Brand Logo" className="max-w-full max-h-full object-contain" />
              <button
                type="button"
                onClick={() => setLogoUrl("")}
                className="absolute top-1 right-1 p-1 rounded-md bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                title="Remove Logo"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-center text-zinc-400 shrink-0">
              <ImageIcon className="w-6 h-6" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {logoUrl ? "Active Brand Logo Configured" : "Upload Brand Watermark or Logo"}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-sans leading-relaxed">
              Supports PNG, SVG, WebP with transparency. Used for automatic overlays and brand watermark branding.
            </p>
            <label className="inline-flex items-center gap-2 mt-2.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all cursor-pointer shadow-xs active:scale-98">
              {uploadingLogo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Choose Logo File</span>
                </>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Color Palette */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-mono">
          <Palette className="w-3.5 h-3.5 text-emerald-500" />
          Color Palette Harmony
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.02] space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Primary Brand</span>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-zinc-900">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-6 h-6 rounded-md border-0 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-full text-xs font-mono bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none uppercase"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.02] space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Secondary Slate</span>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-zinc-900">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-6 h-6 rounded-md border-0 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-full text-xs font-mono bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none uppercase"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.02] space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Accent Highlight</span>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-zinc-900">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-6 h-6 rounded-md border-0 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-full text-xs font-mono bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none uppercase"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.02] space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Base / Backdrop</span>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-zinc-900">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-6 h-6 rounded-md border-0 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-full text-xs font-mono bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none uppercase"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Typography Tone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-mono">
            <Type className="w-3.5 h-3.5 text-emerald-500" />
            Primary Font Identity
          </label>
          <select
            value={primaryFont}
            onChange={(e) => setPrimaryFont(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-black/[0.08] dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 font-mono"
          >
            <option value="Inter">Inter (Clean Modern Sans)</option>
            <option value="Playfair Display">Playfair Display (Editorial Luxury Serif)</option>
            <option value="Syne">Syne (Avant-Garde Commercial Display)</option>
            <option value="Cinzel">Cinzel (Cinematic Roman Capital)</option>
            <option value="JetBrains Mono">JetBrains Mono (High-Tech Developer)</option>
            <option value="Montserrat">Montserrat (Bold Fashion Geometric)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-mono">
            <Sliders className="w-3.5 h-3.5 text-emerald-500" />
            Heading Stylistic Tone
          </label>
          <select
            value={headingStyle}
            onChange={(e) => setHeadingStyle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-black/[0.08] dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 font-mono"
          >
            <option value="Modern Sans">Modern Sans (Sleek & Minimal)</option>
            <option value="Luxury Serif">Luxury Serif (High-End & Opulent)</option>
            <option value="Bold Display">Bold Display (Punchy & Viral)</option>
            <option value="Tech Mono">Tech Mono (Futuristic Cyber)</option>
          </select>
        </div>
      </div>

      {/* Aesthetic Guidelines */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
          Brand Aesthetic Rules & Lighting Directives (Appended to Prompts)
        </label>
        <textarea
          rows={2}
          value={styleGuidelines}
          onChange={(e) => setStyleGuidelines(e.target.value)}
          placeholder="e.g. Premium aesthetic, high contrast, clean studio lighting, sophisticated presentation"
          className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-black/[0.08] dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
          Excluded / Negative Guidelines (Filtered out from Prompts)
        </label>
        <textarea
          rows={2}
          value={negativeGuidelines}
          onChange={(e) => setNegativeGuidelines(e.target.value)}
          placeholder="e.g. cheap, cartoonish, low resolution, blurry, distorted"
          className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-black/[0.08] dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none font-mono"
        />
      </div>

      {/* Auto-Apply Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03]">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-zinc-950 dark:text-white">
              Auto-Apply Brand Kit to Generations
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Injects brand colors, typography tone, and lighting guidelines into studio synthesis prompts automatically.
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
          <input
            type="checkbox"
            checked={applyToGeneration}
            onChange={(e) => setApplyToGeneration(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-500"></div>
        </label>
      </div>

      {/* Embedded Action Footer (when on Settings page) */}
      {isEmbedded && (
        <div className="pt-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
            <span>Active: {brandName || "OmniStudio"}</span>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 font-heading font-bold text-xs tracking-tight transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving Brand Kit...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Brand Kit</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export interface BrandKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplied?: (brandKit: BrandKitData) => void;
}

export default function BrandKitModal({ isOpen, onClose, onApplied }: BrandKitModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-3xl max-h-[88vh] flex flex-col bg-white dark:bg-[#0c0d14] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden cursor-default my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shadow-xs border border-black/10 dark:border-white/20">
              <Palette className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-heading font-bold text-zinc-950 dark:text-white">
                  Brand Kit Studio
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  IDENTITY
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Define your visual identity and aesthetic guidelines applied to every AI generation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <BrandKitPanel 
            onSaved={(kit) => {
              if (onApplied) onApplied(kit);
              setTimeout(() => {
                onClose();
              }, 600);
            }} 
            isEmbedded={false} 
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t border-black/[0.06] dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.02] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

