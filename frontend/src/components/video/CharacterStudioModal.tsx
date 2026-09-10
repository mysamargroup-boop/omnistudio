"use client";

import React, { useState, useRef } from "react";
import {
  ArrowLeft,
  Upload,
  Plus,
  Sparkles,
  Check,
  X,
  FolderArchive,
  Loader2,
  Lock,
  Unlock,
  Sliders,
  ChevronDown
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface CharacterData {
  id: string;
  name: string;
  tagline: string;
  description: string;
  prompt: string;
  imageUrl?: string;
  isLocked: boolean;
}

interface CharacterStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCharacter: CharacterData | null;
  onSelectCharacter: (character: CharacterData) => void;
  onUnlockCharacter: () => void;
}

const ARCHETYPES = [
  {
    id: "the_eccentric",
    name: "The Eccentric",
    description: "Unforgettable quirky humans. Magnetic scene-stealers with offbeat charm.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
    prompt: "An unforgettable eccentric personality with stylized sculpted hair, avant-garde collar, expressive magnetic gaze, high fashion editorial lighting",
  },
  {
    id: "the_professional",
    name: "The Professional",
    description: "Clean cut, well spoken, competent",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80",
    prompt: "A polished, clean-cut professional with immaculate posture, tailored minimal uniform, calm commanding focus, studio chiaroscuro lighting",
  },
  {
    id: "the_wildcard",
    name: "The Wildcard",
    description: "Beyond human, anything can be a character, right?",
    avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80",
    prompt: "A futuristic synthetic entity with crystalline faceted geometric features, luminescent lavender core, intricate cybernetic filigree",
  },
  {
    id: "the_familiar",
    name: "The Familiar",
    description: "Grounded and authentic, a relatable anchor for your story",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
    prompt: "A weathered authentic wanderer with warm expressive eyes, textured canvas field jacket, grounded presence, natural golden hour sunlight",
  },
  {
    id: "the_wicked",
    name: "The Wicked",
    description: "Powerful antagonistic figures that command the screen",
    avatar: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=300&auto=format&fit=crop&q=80",
    prompt: "A formidable antagonistic figure with sharp angular bangs, tailored high-collar obsidian coat, commanding piercing glare, dramatic rim light",
  },
  {
    id: "the_fantastical",
    name: "The Fantastical",
    description: "Ethereal, dreamlike beings fusing the human and the mythical",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80",
    prompt: "An ethereal porcelain entity adorned with delicate silver filigree crown, iridescent celestial skin, floating starlight particles, dreamlike mist",
  },
];

export default function CharacterStudioModal({
  isOpen,
  onClose,
  activeCharacter,
  onSelectCharacter,
  onUnlockCharacter,
}: CharacterStudioModalProps) {
  const [selectedArchetype, setSelectedArchetype] = useState<string>(
    activeCharacter?.id || ARCHETYPES[0].id
  );
  const [characterPrompt, setCharacterPrompt] = useState<string>(
    activeCharacter?.prompt || ARCHETYPES[0].prompt
  );
  const [characterName, setCharacterName] = useState<string>(
    activeCharacter?.name || ARCHETYPES[0].name
  );
  const [characterImage, setCharacterImage] = useState<string>(
    activeCharacter?.imageUrl || ARCHETYPES[0].avatar
  );
  const [selectedModel, setSelectedModel] = useState("Nano Banana 2");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultImages, setVaultImages] = useState<any[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSelectArchetype = (arch: (typeof ARCHETYPES)[0]) => {
    setSelectedArchetype(arch.id);
    setCharacterName(arch.name);
    setCharacterPrompt(arch.prompt);
    setCharacterImage(arch.avatar);
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await api.uploadImage(file);
      const url = res?.url || (typeof res === "string" ? res : "");
      if (url) {
        setCharacterImage(url);
      }
    } catch (err) {
      console.error("Failed to upload character image:", err);
    } finally {
      setUploadingImage(false);
    }
  };

  const openVaultPicker = async () => {
    setVaultOpen(true);
    setLoadingVault(true);
    try {
      const data = await api.getAllAssets();
      setVaultImages(data?.images || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVault(false);
    }
  };

  const handleLockAndApply = () => {
    onSelectCharacter({
      id: selectedArchetype || `custom_${Date.now()}`,
      name: characterName || "Custom Character",
      tagline: "Locked Character Identity",
      description: characterPrompt.slice(0, 80) + "...",
      prompt: characterPrompt,
      imageUrl: characterImage,
      isLocked: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white font-jakarta animate-in fade-in duration-200 overflow-y-auto">
      {/* Top Header matching reference image: Back Arrow + "New character" */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-black/80 backdrop-blur-md sticky top-0 z-20">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2.5 text-sm font-semibold text-white/90 hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-base font-heading">New character</span>
        </button>

        <div className="flex items-center gap-3">
          {activeCharacter?.isLocked && (
            <button
              type="button"
              onClick={() => {
                onUnlockCharacter();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-mono border border-rose-500/30 transition-all cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock Character</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLockAndApply}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-heading font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Character</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-between">
        {/* Hero Title & Subtitle matching Reference Image 1 */}
        <div className="text-center space-y-2 mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl font-heading font-normal tracking-tight text-white/90 max-w-2xl leading-tight">
            Build and reuse characters for consistent videos.
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 font-sans font-light">
            Use a sample prompt below, or create from scratch.
          </p>
        </div>

        {/* 6 Archetype Cards Grid matching Reference Image 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 w-full mb-10">
          {ARCHETYPES.map((arch) => {
            const isSelected = selectedArchetype === arch.id;
            return (
              <div
                key={arch.id}
                onClick={() => handleSelectArchetype(arch)}
                className={cn(
                  "flex items-center gap-3.5 p-3 rounded-2xl border transition-all cursor-pointer text-left group",
                  isSelected
                    ? "bg-zinc-900 border-white/30 shadow-md ring-1 ring-white/20"
                    : "bg-zinc-950/80 border-white/[0.08] hover:border-white/[0.18] hover:bg-zinc-900/60"
                )}
              >
                {/* Character Thumbnail */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 relative border border-white/10">
                  <img
                    src={arch.avatar}
                    alt={arch.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Character Details */}
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="text-sm font-heading font-bold text-white tracking-tight flex items-center justify-between">
                    <span>{arch.name}</span>
                    {isSelected && (
                      <span className="text-[9px] font-mono uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Selected
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-zinc-400 font-sans line-clamp-2 leading-relaxed">
                    {arch.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Composer Bar matching Reference Image 1 */}
        <div className="w-full max-w-2xl space-y-4">
          <div className="relative rounded-2xl bg-zinc-900/90 border border-white/[0.12] p-2.5 shadow-2xl backdrop-blur-xl flex flex-col gap-2">
            {/* Active Character Face & Prompt */}
            <div className="flex items-start gap-2.5 px-2 pt-1">
              {characterImage && (
                <div className="w-9 h-9 rounded-lg overflow-hidden border border-white/20 flex-shrink-0 relative">
                  <img
                    src={getMediaUrl(characterImage)}
                    alt="Character"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <textarea
                value={characterPrompt}
                onChange={(e) => setCharacterPrompt(e.target.value)}
                placeholder="Describe your character..."
                rows={2}
                className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none resize-none font-sans leading-relaxed"
              />
            </div>

            {/* Bottom Controls inside composer bar */}
            <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] px-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                  title="Upload reference"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Format</span>
                </button>

                {/* Model Badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] text-xs font-mono text-amber-300 border border-white/[0.08]">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{selectedModel}</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </div>
              </div>

              <button
                type="button"
                onClick={handleLockAndApply}
                className="p-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 transition-transform active:scale-95 cursor-pointer shadow-sm"
                title="Lock Character"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action Buttons matching Reference Image 1: Upload and Add from project */}
          <div className="flex items-center justify-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f);
                e.target.value = "";
              }}
              disabled={uploadingImage}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-mono font-medium border border-white/[0.1] transition-all cursor-pointer shadow-sm active:scale-95"
            >
              {uploadingImage ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-zinc-300" />
              )}
              <span>{uploadingImage ? "Uploading..." : "Upload"}</span>
            </button>

            <button
              type="button"
              onClick={openVaultPicker}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-mono font-medium border border-white/[0.1] transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-300" />
              <span>Add from project</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vault Picker Modal */}
      {vaultOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-zinc-900 border border-white/[0.15] rounded-2xl p-6 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-heading font-bold text-white">
                  Pick Character Face from Vault
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVaultOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loadingVault ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs font-mono">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>Loading vault images...</span>
                </div>
              ) : vaultImages.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                  No images found in your Vault. Generate or upload one first!
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {vaultImages.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setCharacterImage(img.url);
                        setVaultOpen(false);
                      }}
                      className="group relative rounded-xl overflow-hidden border border-white/10 aspect-square bg-black cursor-pointer hover:border-emerald-400 transition-all"
                    >
                      <img
                        src={getMediaUrl(img.url)}
                        alt={img.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-500 text-zinc-950 font-bold">
                          Select
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
