"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, Sparkles, Palette, Type, Upload, Check, Loader2, 
  ShieldCheck, Sliders, RefreshCw, Wand2, Image as ImageIcon 
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BrandKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplied?: (brandKit: any) => void;
}

const PRESET_TEMPLATES = [
  {
    name: "Luxury Couture",
    colors: { primary: "#c5a059", secondary: "#1c1917", accent: "#fef08a", background: "#0c0a09" },
    typography: { primary_font: "Playfair Display", heading_style: "Luxury Serif" },
    style_guidelines: "Vogue luxury aesthetic, opulent gold caustics, soft architectural chiaroscuro, cinematic shallow depth of field, high-fashion styling.",
    negative_guidelines: "cheap, plastic, cartoony, low-res, amateur"
  },
  {
    name: "Cyberpunk Tech",
    colors: { primary: "#06b6d4", secondary: "#d946ef", accent: "#10b981", background: "#09090b" },
    typography: { primary_font: "JetBrains Mono", heading_style: "Tech Mono" },
    style_guidelines: "High-tech cyberpunk aesthetic, volumetric neon glow, wet reflective asphalt, moody atmospheric haze, octane render 8k.",
    negative_guidelines: "daylight, sepia, vintage, muted, washed out"
  },
  {
    name: "Minimalist Studio",
    colors: { primary: "#3b82f6", secondary: "#64748b", accent: "#38bdf8", background: "#ffffff" },
    typography: { primary_font: "Inter", heading_style: "Modern Sans" },
    style_guidelines: "Clean commercial product lighting, high-key studio, pristine reflections, Apple advertising aesthetic, ultra sharp focus.",
    negative_guidelines: "grunge, noisy, messy background, low contrast"
  },
  {
    name: "Viral Commercial",
    colors: { primary: "#f43f5e", secondary: "#8b5cf6", accent: "#fbbf24", background: "#0f172a" },
    typography: { primary_font: "Syne", heading_style: "Bold Display" },
    style_guidelines: "Dynamic eye-catching perspective, saturated punchy colors, trending TikTok aesthetic, high engagement visual hook.",
    negative_guidelines: "dull, boring, dark, blurry, motionless"
  }
];

export default function BrandKitModal({ isOpen, onClose, onApplied }: BrandKitModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [brandName, setBrandName] = useState("OmniStudio");
  const [tagline, setTagline] = useState("Next-Gen AI Cinematic Production");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState("#ec4899");
  const [accentColor, setAccentColor] = useState("#10b981");
  const [backgroundColor, setBackgroundColor] = useState("#0b0c10");
  const [primaryFont, setPrimaryFont] = useState("Inter");
  const [headingStyle, setHeadingStyle] = useState("Modern Sans");
  const [styleGuidelines, setStyleGuidelines] = useState("");
  const [negativeGuidelines, setNegativeGuidelines] = useState("");
  const [applyToGeneration, setApplyToGeneration] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
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
            setPrimaryColor(k.colors.primary || "#6366f1");
            setSecondaryColor(k.colors.secondary || "#ec4899");
            setAccentColor(k.colors.accent || "#10b981");
            setBackgroundColor(k.colors.background || "#0b0c10");
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
  }, [isOpen]);

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
      const payload = {
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
      if (onApplied) onApplied(payload);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 900);
    } catch (err: any) {
      alert("Failed to save Brand Kit: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-white dark:bg-[#0c0d14] border border-zinc-200 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden cursor-default my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/20">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                Brand Kit Studio
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/20">
                  Enterprise
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Define your visual identity and aesthetic guidelines applied to every AI generation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm text-zinc-400">Loading Brand Assets...</p>
            </div>
          ) : (
            <>
              {/* Quick Presets */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-2.5">
                  <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
                  Quick Industry Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_TEMPLATES.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="flex flex-col items-start p-2.5 rounded-xl border border-zinc-200 dark:border-white/10 hover:border-indigo-500/50 bg-zinc-50 dark:bg-white/[0.02] hover:bg-indigo-500/[0.04] transition-all text-left group"
                    >
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-500 transition-colors">
                        {p.name}
                      </span>
                      <div className="flex items-center gap-1 mt-2">
                        <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: p.colors.primary }} />
                        <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: p.colors.secondary }} />
                        <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: p.colors.accent }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Identity & Logo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Brand / Agency Name
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Acme Studios"
                    className="w-full px-3.5 py-2 rounded-xl text-sm border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Tagline / Sub-brand
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Next-Gen Luxury Creation"
                    className="w-full px-3.5 py-2 rounded-xl text-sm border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              {/* Logo Upload & Preview */}
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Brand Logo / Watermark
                </label>
                <div className="flex items-center gap-4 p-3 rounded-xl border border-dashed border-zinc-300 dark:border-white/20 bg-zinc-50 dark:bg-white/[0.02]">
                  {logoUrl ? (
                    <div className="relative w-16 h-16 rounded-lg bg-black/20 border border-white/10 flex items-center justify-center p-1.5 overflow-hidden">
                      <img src={getMediaUrl(logoUrl)} alt="Brand Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-zinc-200 dark:bg-white/5 flex items-center justify-center text-zinc-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                      {logoUrl ? "Active Brand Logo" : "Upload Brand Logo (PNG, SVG, Transparent)"}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Used for automated watermarking and brand consistency
                    </p>
                    <label className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 cursor-pointer transition-colors">
                      {uploadingLogo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          Choose Logo File
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
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-2.5">
                  <Palette className="w-3.5 h-3.5 text-indigo-500" />
                  Color Palette Harmony
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">Primary Color</span>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.03]">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full text-xs font-mono bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">Secondary Color</span>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.03]">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-full text-xs font-mono bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">Accent Glow</span>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.03]">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-full text-xs font-mono bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">Base / Canvas</span>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.03]">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-full text-xs font-mono bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1.5">
                    <Type className="w-3.5 h-3.5 text-indigo-500" />
                    Primary Typography
                  </label>
                  <select
                    value={primaryFont}
                    onChange={(e) => setPrimaryFont(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-sm border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#12131c] text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="Inter">Inter (Clean Modern Sans)</option>
                    <option value="Playfair Display">Playfair Display (Editorial Luxury Serif)</option>
                    <option value="Syne">Syne (Avant-Garde Commercial Display)</option>
                    <option value="Cinzel">Cinzel (Cinematic Roman Capital)</option>
                    <option value="JetBrains Mono">JetBrains Mono (High-Tech Developer)</option>
                    <option value="Montserrat">Montserrat (Bold Fashion Geometric)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                    Heading Tone
                  </label>
                  <select
                    value={headingStyle}
                    onChange={(e) => setHeadingStyle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-sm border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#12131c] text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="Modern Sans">Modern Sans (Sleek & Minimal)</option>
                    <option value="Luxury Serif">Luxury Serif (High-End & Opulent)</option>
                    <option value="Bold Display">Bold Display (Punchy & Viral)</option>
                    <option value="Tech Mono">Tech Mono (Futuristic Cyber)</option>
                  </select>
                </div>
              </div>

              {/* Aesthetic Guidelines */}
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Brand Voice & Aesthetic Guidelines (Appended to Prompts)
                </label>
                <textarea
                  rows={2}
                  value={styleGuidelines}
                  onChange={(e) => setStyleGuidelines(e.target.value)}
                  placeholder="e.g. Premium aesthetic, high contrast, clean studio lighting, sophisticated presentation"
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Negative / Excluded Guidelines
                </label>
                <textarea
                  rows={2}
                  value={negativeGuidelines}
                  onChange={(e) => setNegativeGuidelines(e.target.value)}
                  placeholder="e.g. cheap, cartoonish, low resolution, blurry, distorted"
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                />
              </div>

              {/* Apply Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04]">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-500" />
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">
                      Auto-Apply Brand Kit to Generations
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Injects brand colors and rules into image and video prompts automatically
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyToGeneration}
                    onChange={(e) => setApplyToGeneration(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-t border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 truncate max-w-[160px] sm:max-w-none">
              {brandName || "Active Brand Profile"}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-700 text-white shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving Brand Kit...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  Saved!
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Save & Apply Brand Kit
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
