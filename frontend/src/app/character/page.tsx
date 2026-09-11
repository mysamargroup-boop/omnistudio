'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserCheck,
  UserX,
  UserPlus,
  Lock,
  Unlock,
  Upload,
  Sparkles,
  Plus,
  Trash2,
  Check,
  Video,
  Image as ImageIcon,
  FolderArchive,
  Loader2,
  RefreshCw,
  Search,
  Sliders,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import { api, getMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  CharacterData,
  getStoredCharacters,
  saveCharacter,
  deleteCharacter,
  getActiveCharacter,
  setActiveCharacter
} from '@/lib/characters';
import { ARCHETYPES } from '@/components/video/CharacterStudioModal';

export default function CharacterStudioPage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [activeChar, setActiveCharState] = useState<CharacterData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'custom' | 'archetype'>('all');
  
  // Creation form state
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [visualDescription, setVisualDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lockFace, setLockFace] = useState(true);
  const [lockHair, setLockHair] = useState(true);
  const [lockCostume, setLockCostume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    setCharacters(getStoredCharacters());
    setActiveCharState(getActiveCharacter());
  };

  useEffect(() => {
    loadData();

    const handleCharUpdate = (e: any) => {
      if (e.detail) setCharacters(e.detail);
      else loadData();
    };

    const handleActiveUpdate = (e: any) => {
      setActiveCharState(e.detail || null);
    };

    window.addEventListener('omnistudio:characters_updated', handleCharUpdate);
    window.addEventListener('omnistudio:active_character_updated', handleActiveUpdate);
    window.addEventListener('storage', loadData);

    return () => {
      window.removeEventListener('omnistudio:characters_updated', handleCharUpdate);
      window.removeEventListener('omnistudio:active_character_updated', handleActiveUpdate);
      window.removeEventListener('storage', loadData);
    };
  }, []);

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await api.uploadReferenceImage(file);
      if (res?.url) {
        setImageUrl(res.url);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to upload character face reference');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveCharacter = (autoLock = true) => {
    if (!name.trim() && !imageUrl) {
      alert('Please provide at least a character name or face image.');
      return;
    }

    const charName = name.trim() || 'Consistent Identity';
    const newChar: CharacterData = {
      id: `custom_${Date.now()}`,
      name: charName,
      tagline: tagline.trim() || 'Custom Locked Identity',
      description: visualDescription.trim() || charName,
      prompt: visualDescription.trim() || charName,
      imageUrl: imageUrl || undefined,
      isLocked: autoLock,
      category: 'custom',
      createdAt: new Date().toISOString(),
    };

    const updated = saveCharacter(newChar);
    setCharacters(updated);

    if (autoLock) {
      setActiveCharacter(newChar);
      setActiveCharState(newChar);
    }

    // Reset form
    setName('');
    setTagline('');
    setVisualDescription('');
    setImageUrl('');
    setIsCreating(false);
  };

  const handleToggleLock = (char: CharacterData) => {
    if (activeChar?.id === char.id) {
      setActiveCharacter(null);
      setActiveCharState(null);
    } else {
      setActiveCharacter(char);
      setActiveCharState(char);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this custom character?')) {
      const updated = deleteCharacter(id);
      setCharacters(updated);
    }
  };

  const filtered = characters.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      Boolean(c.tagline && c.tagline.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (selectedFilter === 'custom') return c.category === 'custom';
    if (selectedFilter === 'archetype') return c.category === 'archetype' || !c.category;
    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#07070b] text-zinc-900 dark:text-zinc-100 font-jakarta p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-bold">
              CHARACTER CONSISTENCY ENGINE 4.0
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase">
              <ShieldCheck className="w-3 h-3" />
              STUDIO-WIDE IDENTITY SYNC
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight">
            Character Locking Studio
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-sans mt-1">
            Create, manage, and lock persona identities across Video Studio, Image Studio, and Storyboard.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-heading font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Character</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/video')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white text-xs font-mono transition-all cursor-pointer shadow-xs"
          >
            <Video className="w-3.5 h-3.5 text-emerald-500" />
            <span>Open Video Studio</span>
          </button>
        </div>
      </div>

      {/* Active Locked Character Hero Status */}
      {activeChar ? (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-emerald-500 bg-zinc-800 flex-shrink-0 shadow-md relative">
              {activeChar.imageUrl ? (
                <img
                  src={getMediaUrl(activeChar.imageUrl)}
                  alt={activeChar.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-emerald-500/20 text-emerald-400 font-bold text-lg font-heading">
                  {activeChar.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="absolute bottom-0 right-0 p-0.5 bg-emerald-500 text-zinc-950 rounded-tl">
                <Lock className="w-2.5 h-2.5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  ACTIVE STUDIO LOCK
                </span>
                <span className="text-xs text-zinc-400 font-mono">ID: {activeChar.id}</span>
              </div>
              <h3 className="text-lg font-heading font-extrabold text-zinc-950 dark:text-white mt-0.5">
                {activeChar.name}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-1 max-w-xl">
                {activeChar.prompt || activeChar.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => handleToggleLock(activeChar)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-mono border border-rose-200 dark:border-rose-500/30 transition-all cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock Identity</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/video')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-heading font-bold hover:opacity-90 transition-all cursor-pointer shadow-sm"
            >
              <span>Use in Video</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-heading font-bold text-zinc-900 dark:text-white">
                No Character Currently Locked
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Select any character below or create one to automatically inject identity consistency into prompts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Creation Drawer / Card */}
      {isCreating && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0e0e16] border border-emerald-500/30 dark:border-emerald-500/20 shadow-xl space-y-5 animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-500" />
              <h2 className="text-base font-heading font-bold text-zinc-950 dark:text-white">
                New Consistent Character Identity
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-mono cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left: Image Upload */}
            <div className="md:col-span-4 space-y-3">
              <label className="text-xs font-mono font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block">
                Face / Reference Photo
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImageUpload(f);
                  e.target.value = '';
                }}
              />

              {imageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 bg-zinc-900 aspect-square max-h-56 flex items-center justify-center group">
                  <img
                    src={getMediaUrl(imageUrl)}
                    alt="Uploaded character"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-mono backdrop-blur-xs cursor-pointer"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/80 hover:bg-rose-500 text-white text-xs font-mono cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500/50 rounded-xl p-6 aspect-square max-h-56 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-900/30"
                >
                  {uploadingImage ? (
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
                  ) : (
                    <Upload className="w-8 h-8 text-zinc-400 mb-2" />
                  )}
                  <span className="text-xs font-heading font-bold text-zinc-800 dark:text-zinc-200">
                    {uploadingImage ? 'Uploading Face...' : 'Upload Face Image'}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono mt-1">
                    JPG, PNG, WebP up to 10MB
                  </span>
                </div>
              )}
            </div>

            {/* Right: Form Details */}
            <div className="md:col-span-8 space-y-3.5">
              <div>
                <label className="text-xs font-mono font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  Character Name <span className="text-emerald-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Elena Rostova, Detective Vance, Cyber Monk..."
                  className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  Role / Tagline (Optional)
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Lead Protagonist, Sci-Fi Operative, Corporate Spokesperson..."
                  className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-mono font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    Visual Description <span className="text-zinc-400 lowercase font-normal">(Optional)</span>
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Leave blank to use image only
                  </span>
                </div>
                <textarea
                  value={visualDescription}
                  onChange={(e) => setVisualDescription(e.target.value)}
                  placeholder="Optional: Describe specific hair style, eye color, signature costume, jewelry, or aesthetic traits..."
                  rows={3}
                  className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none font-sans leading-relaxed"
                />
              </div>

              {/* Consistency Checkboxes */}
              <div className="pt-1 space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block font-semibold">
                  Consistency Enforcement:
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={lockFace}
                      onChange={(e) => setLockFace(e.target.checked)}
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Face Lock</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={lockHair}
                      onChange={(e) => setLockHair(e.target.checked)}
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Hair Lock</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={lockCostume}
                      onChange={(e) => setLockCostume(e.target.checked)}
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Costume Lock</span>
                  </label>
                </div>
              </div>

              {/* Save Buttons */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveCharacter(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-heading font-bold shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Save & Lock Character Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCharacter(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-mono transition-all cursor-pointer"
                >
                  Save to Vault Only
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 bg-zinc-200/70 dark:bg-zinc-900 p-1 rounded-xl w-fit border border-zinc-300/60 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer",
              selectedFilter === 'all'
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
          >
            All Characters ({characters.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('custom')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer",
              selectedFilter === 'custom'
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
          >
            Custom Uploads ({characters.filter((c) => c.category === 'custom').length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('archetype')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer",
              selectedFilter === 'archetype'
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
          >
            Archetypes ({characters.filter((c) => c.category === 'archetype' || !c.category).length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search characters..."
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none font-jakarta shadow-2xs"
          />
        </div>
      </div>

      {/* Characters Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((char) => {
          const isCurrentActive = activeChar?.id === char.id;
          const isCustom = char.category === 'custom';

          return (
            <div
              key={char.id}
              className={cn(
                "rounded-2xl border transition-all flex flex-col justify-between overflow-hidden p-3.5 bg-white dark:bg-[#0d0d14] shadow-xs group",
                isCurrentActive
                  ? "border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-md bg-emerald-500/5"
                  : "border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm"
              )}
            >
              <div>
                {/* Thumbnail and badges */}
                <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 mb-3 border border-zinc-200 dark:border-zinc-800">
                  {char.imageUrl ? (
                    <img
                      src={getMediaUrl(char.imageUrl)}
                      alt={char.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold text-2xl font-heading">
                      {char.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {isCurrentActive && (
                    <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500 text-zinc-950 text-[10px] font-mono font-bold shadow-md">
                      <Lock className="w-2.5 h-2.5" />
                      LOCKED
                    </span>
                  )}

                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-black/60 text-white backdrop-blur-xs">
                    {isCustom ? "CUSTOM" : "ARCHETYPE"}
                  </span>

                  {isCustom && (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(char.id, e)}
                      className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-zinc-300 hover:text-white transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Delete custom character"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-heading font-bold text-zinc-950 dark:text-white truncate">
                      {char.name}
                    </h3>
                  </div>
                  {char.tagline && (
                    <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 truncate">
                      {char.tagline}
                    </p>
                  )}
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed font-sans pt-0.5">
                    {char.description || char.prompt}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleLock(char)}
                  className={cn(
                    "flex-1 py-1.5 px-2.5 rounded-xl text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    isCurrentActive
                      ? "bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30"
                      : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 shadow-xs"
                  )}
                >
                  {isCurrentActive ? (
                    <>
                      <Unlock className="w-3 h-3" />
                      <span>Unlock</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>Lock for Studio</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveCharacter(char);
                    router.push('/video');
                  }}
                  className="p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  title="Launch in Video Studio"
                >
                  <Video className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
