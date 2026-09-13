'use client';

import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Search,
  Star,
  Trash2,
  Copy,
  Check,
  X,
  Plus,
  ArrowRight
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface SavedPromptItem {
  id: string;
  title: string;
  prompt: string;
  negative_prompt?: string;
  negativePrompt?: string;
  category: string;
  tags: string[];
  studio_type: string;
  is_favorite: number | boolean;
  isFavorite?: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
}

interface PromptVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (promptText: string, negativePromptText?: string) => void;
  currentPrompt?: string;
  currentNegativePrompt?: string;
  studioType?: 'all' | 'image' | 'video';
}

const CATEGORIES = [
  'all',
  'cinematic',
  'fashion',
  'commercial',
  'portrait',
  'architecture',
  'action',
  'fantasy',
  'custom'
];

export default function PromptVaultModal({
  isOpen,
  onClose,
  onSelectPrompt,
  currentPrompt = '',
  currentNegativePrompt = '',
  studioType = 'all'
}: PromptVaultModalProps) {
  const [activeTab, setActiveTab] = useState<'browse' | 'save'>('browse');
  const [prompts, setPrompts] = useState<SavedPromptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Save Prompt Form States
  const [newTitle, setNewTitle] = useState('');
  const [newPromptText, setNewPromptText] = useState(currentPrompt);
  const [newNegativePrompt, setNewNegativePrompt] = useState(currentNegativePrompt);
  const [newCategory, setNewCategory] = useState('cinematic');
  const [newTags, setNewTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPrompts();
      if (currentPrompt) {
        setNewPromptText(currentPrompt);
        setNewNegativePrompt(currentNegativePrompt);
        setNewTitle(currentPrompt.slice(0, 40).trim() + (currentPrompt.length > 40 ? '...' : ''));
      }
    }
  }, [isOpen, selectedCategory, favoriteOnly, studioType]);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const res = await api.getPrompts({
        category: selectedCategory,
        studio_type: studioType !== 'all' ? studioType : undefined,
        favorite_only: favoriteOnly
      });
      if (res?.prompts) {
        setPrompts(res.prompts);
      }
    } catch (err) {
      console.error('Failed to load prompts from vault:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.toggleFavoritePrompt(id);
      if (res?.success) {
        setPrompts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_favorite: res.is_favorite, isFavorite: Boolean(res.is_favorite) } : p))
        );
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this prompt from your Vault?')) return;
    try {
      await api.deletePrompt(id);
      setPrompts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete prompt:', err);
    }
  };

  const handleCopy = (id: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptText.trim() || !newTitle.trim()) return;
    setSaving(true);
    try {
      const tagsArray = newTags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const res = await api.createPrompt({
        title: newTitle.trim(),
        prompt: newPromptText.trim(),
        negative_prompt: newNegativePrompt.trim(),
        category: newCategory,
        tags: tagsArray,
        studio_type: studioType
      });

      if (res) {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          setActiveTab('browse');
          loadPrompts();
        }, 800);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to save prompt to vault');
    } finally {
      setSaving(false);
    }
  };

  const filteredPrompts = prompts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.prompt.toLowerCase().includes(q) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-[#111118] border border-black/[0.1] dark:border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.08] dark:border-white/[0.08] bg-zinc-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                Prompt Vault & Collection
                <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  DB Persistent
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                1-click access to curated master prompts and your personal creative collection
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
          <button
            type="button"
            onClick={() => setActiveTab('browse')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer',
              activeTab === 'browse'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'
            )}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Browse Vault ({prompts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('save')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer',
              activeTab === 'save'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save Current Prompt</span>
          </button>
        </div>

        {/* Body Content */}
        {activeTab === 'browse' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search prompts, keywords, or tags..."
                  className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs font-sans text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFavoriteOnly((prev) => !prev)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-xs font-mono border transition-all flex items-center gap-1.5 cursor-pointer select-none',
                    favoriteOnly
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'border-black/[0.08] dark:border-white/[0.08] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  )}
                >
                  <Star className={cn('w-3.5 h-3.5', favoriteOnly && 'fill-amber-500 text-amber-500')} />
                  <span>Favorites</span>
                </button>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer',
                    selectedCategory === cat
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold shadow-xs'
                      : 'bg-zinc-100 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.08]'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Prompts Cards List */}
            {loading ? (
              <div className="py-12 text-center text-xs font-mono text-zinc-400">
                Loading saved prompts...
              </div>
            ) : filteredPrompts.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Bookmark className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto" />
                <p className="text-xs font-mono text-zinc-500">No prompts found in this view.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('save')}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer"
                >
                  Save your first prompt now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredPrompts.map((p) => {
                  const isFav = Boolean(p.is_favorite || p.isFavorite);
                  return (
                    <div
                      key={p.id}
                      className="group relative rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#14141d] p-3.5 hover:border-emerald-500/40 hover:shadow-md transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                              {p.title}
                            </h4>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 border border-black/[0.04] dark:border-white/[0.04]">
                              {p.category}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleToggleFavorite(p.id, e)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-500 transition-colors cursor-pointer"
                            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Star className={cn('w-3.5 h-3.5', isFav && 'fill-amber-500 text-amber-500')} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleCopy(p.id, p.prompt, e)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                            title="Copy prompt text"
                          >
                            {copiedId === p.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(p.id, e)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Delete prompt"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-jakarta line-clamp-3 bg-zinc-50 dark:bg-white/[0.02] p-2.5 rounded-lg border border-black/[0.04] dark:border-white/[0.04]">
                        {p.prompt}
                      </p>

                      {p.negative_prompt && (
                        <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-mono truncate">
                          <span className="font-bold">Avoid:</span> {p.negative_prompt}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-zinc-400">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {p.tags &&
                            p.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/[0.05] px-2 py-0.5 rounded-md"
                              >
                                #{tag}
                              </span>
                            ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onSelectPrompt(p.prompt, p.negative_prompt || p.negativePrompt || '');
                            onClose();
                          }}
                          className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        >
                          <span>Use Prompt</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Save Prompt Tab */
          <form onSubmit={handleSavePrompt} className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 block">
                Prompt Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Cyberpunk Rain Portrait 8K"
                className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-2 text-xs font-sans text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 block">
                Generation Prompt Text <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                placeholder="Describe subject, scene, lighting, camera lens..."
                className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs font-sans text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 block">
                Negative Prompt (Optional Elements to Exclude)
              </label>
              <input
                type="text"
                value={newNegativePrompt}
                onChange={(e) => setNewNegativePrompt(e.target.value)}
                placeholder="e.g. blurry, cartoon, oversaturated, deformed hands"
                className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-2 text-xs font-sans text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 block">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-[#181822] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {CATEGORIES.filter((c) => c !== 'all').map((c) => (
                    <option key={c} value={c}>
                      {c.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 block">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="e.g. 8k, portrait, cinematic"
                  className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-2 text-xs font-sans text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setActiveTab('browse')}
                className="px-4 py-2 rounded-xl text-xs font-mono border border-black/[0.08] dark:border-white/[0.08] text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !newTitle.trim() || !newPromptText.trim()}
                className={cn(
                  'px-5 py-2 rounded-xl text-xs font-mono font-bold text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-40',
                  saveSuccess ? 'bg-emerald-600' : 'bg-emerald-500 hover:bg-emerald-600'
                )}
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved to Vault!</span>
                  </>
                ) : saving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save to Vault</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
