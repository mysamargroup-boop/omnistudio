"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FolderArchive,
  Image as ImageIcon,
  Video,
  Mic,
  Film,
  Trash2,
  RefreshCw,
  Download,
  Search,
  HardDrive,
  ArrowUpRight,
  RotateCcw,
  CheckSquare,
  Square,
  AlertTriangle,
  Flame,
  Check,
  X,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { formatBytes, cn } from "@/lib/utils";
import DeleteConfirmModal, { DeleteModalItem } from "@/components/ui/DeleteConfirmModal";

type Tab = "all" | "final" | "videos" | "images" | "audio" | "trash";

interface VaultAsset {
  filename: string;
  url: string;
  local_path: string;
  size_bytes: number;
  size_mb: number;
  modified: number;
  type: string;
  is_trash?: boolean;
}

export default function VaultPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [assets, setAssets] = useState<any>(null);
  const [trashAssets, setTrashAssets] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Multi-selection state: Set of "type::filename"
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItems, setModalItems] = useState<DeleteModalItem[]>([]);
  const [modalIsPermanent, setModalIsPermanent] = useState(false);
  const [modalIsRestore, setModalIsRestore] = useState(false);
  const [modalActionLoading, setModalActionLoading] = useState(false);
  const [modalTitle, setModalTitle] = useState<string | undefined>();
  const [modalDesc, setModalDesc] = useState<string | undefined>();

  const loadData = async () => {
    setLoading(true);
    try {
      const [allRes, trashRes] = await Promise.allSettled([
        api.getAllAssets(),
        api.getTrashAssets(),
      ]);
      if (allRes.status === "fulfilled") setAssets(allRes.value);
      if (trashRes.status === "fulfilled") setTrashAssets(trashRes.value);
    } catch (e) {
      console.error("Failed to load vault assets", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Clear selections on tab switch
  useEffect(() => {
    setSelectedKeys(new Set());
  }, [tab]);

  // Derive current list based on tab
  const activeFiles: VaultAsset[] = useMemo(() => {
    if (tab === "trash") {
      if (!trashAssets?.items) return [];
      let list: VaultAsset[] = trashAssets.items;
      if (search.trim()) {
        const q = search.toLowerCase();
        list = list.filter((f) => f.filename.toLowerCase().includes(q));
      }
      return list;
    }

    if (!assets) return [];
    let list: VaultAsset[] = [];
    if (tab === "all") {
      list = [
        ...(assets.final || []),
        ...(assets.videos || []),
        ...(assets.images || []),
        ...(assets.audio || []),
      ];
    } else {
      list = assets[tab] || [];
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) => f.filename.toLowerCase().includes(q));
    }
    return list;
  }, [tab, assets, trashAssets, search]);

  // Selection toggle
  const toggleSelect = (type: string, filename: string) => {
    const key = `${type}::${filename}`;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isSelected = (type: string, filename: string) =>
    selectedKeys.has(`${type}::${filename}`);

  const selectAll = () => {
    const next = new Set<string>();
    activeFiles.forEach((f) => next.add(`${f.type}::${f.filename}`));
    setSelectedKeys(next);
  };

  const clearSelection = () => {
    setSelectedKeys(new Set());
  };

  // Convert selected keys to array of items
  const getSelectedItems = (): VaultAsset[] => {
    const items: VaultAsset[] = [];
    activeFiles.forEach((f) => {
      if (selectedKeys.has(`${f.type}::${f.filename}`)) {
        items.push(f);
      }
    });
    return items;
  };

  // ─── Modal Triggers ───

  // 1. Single Move to Trash
  const handleSingleTrashClick = (file: VaultAsset) => {
    setModalItems([
      { filename: file.filename, type: file.type, size_bytes: file.size_bytes },
    ]);
    setModalIsPermanent(false);
    setModalIsRestore(false);
    setModalTitle(`Move ${file.filename} to Trash?`);
    setModalDesc(
      `The file will be moved to your Trash bin. You can restore it anytime or delete it permanently later.`
    );
    setModalOpen(true);
  };

  // 2. Single Delete Forever (from Trash)
  const handleSinglePermanentDeleteClick = (file: VaultAsset) => {
    setModalItems([
      { filename: file.filename, type: file.type, size_bytes: file.size_bytes },
    ]);
    setModalIsPermanent(true);
    setModalIsRestore(false);
    setModalTitle(`Permanently Erase ${file.filename}?`);
    setModalDesc(
      `This will completely erase ${file.filename} from your local storage disk, Supabase Cloud database, and Cloudflare R2 bucket. This cannot be undone.`
    );
    setModalOpen(true);
  };

  // 3. Single Restore
  const handleSingleRestore = async (file: VaultAsset) => {
    try {
      await api.restoreFromTrash([{ media_type: file.type, filename: file.filename }]);
      await loadData();
    } catch (e) {
      console.error("Restore failed", e);
    }
  };

  // 4. Bulk Move to Trash
  const handleBulkTrashClick = () => {
    const items = getSelectedItems();
    if (items.length === 0) return;
    setModalItems(
      items.map((i) => ({ filename: i.filename, type: i.type, size_bytes: i.size_bytes }))
    );
    setModalIsPermanent(false);
    setModalIsRestore(false);
    setModalTitle(`Move ${items.length} Assets to Trash?`);
    setModalDesc(
      `These ${items.length} assets will be moved to the Trash bin. You can restore them anytime.`
    );
    setModalOpen(true);
  };

  // 5. Bulk Delete Forever (from Trash or normal)
  const handleBulkPermanentDeleteClick = () => {
    const items = getSelectedItems();
    if (items.length === 0) return;
    setModalItems(
      items.map((i) => ({ filename: i.filename, type: i.type, size_bytes: i.size_bytes }))
    );
    setModalIsPermanent(true);
    setModalIsRestore(false);
    setModalTitle(`Permanently Destroy ${items.length} Selected Assets?`);
    setModalDesc(
      `Warning: This action cannot be undone. All ${items.length} files will be permanently purged from local disk, Supabase Cloud, and R2 storage.`
    );
    setModalOpen(true);
  };

  // 6. Bulk Restore
  const handleBulkRestoreClick = () => {
    const items = getSelectedItems();
    if (items.length === 0) return;
    setModalItems(
      items.map((i) => ({ filename: i.filename, type: i.type, size_bytes: i.size_bytes }))
    );
    setModalIsPermanent(false);
    setModalIsRestore(true);
    setModalTitle(`Restore ${items.length} Assets to Vault?`);
    setModalDesc(
      `All ${items.length} assets will be moved back from Trash to their respective active folders.`
    );
    setModalOpen(true);
  };

  // 7. Empty Trash
  const handleEmptyTrashClick = () => {
    const items = trashAssets?.items || [];
    if (items.length === 0) return;
    setModalItems(
      items.map((i: any) => ({ filename: i.filename, type: i.type, size_bytes: i.size_bytes }))
    );
    setModalIsPermanent(true);
    setModalIsRestore(false);
    setModalTitle(`Empty Entire Trash Bin (${items.length} Assets)?`);
    setModalDesc(
      `This will permanently purge ALL ${items.length} files in the Trash bin across all media categories. This cannot be undone.`
    );
    setModalOpen(true);
  };

  // Modal Execution Handler
  const handleModalConfirm = async () => {
    setModalActionLoading(true);
    try {
      if (modalTitle?.includes("Empty Entire Trash Bin")) {
        // Empty Trash
        await api.emptyTrash();
      } else if (modalIsRestore) {
        // Restore
        const payload = modalItems.map((i) => ({
          media_type: i.type || "images",
          filename: i.filename,
        }));
        await api.restoreFromTrash(payload);
      } else if (modalIsPermanent) {
        // Permanent Delete
        const payload = modalItems.map((i) => ({
          media_type: i.type || "images",
          filename: i.filename,
        }));
        await api.bulkDeleteAssets(payload, true, tab === "trash");
      } else {
        // Move to Trash
        const payload = modalItems.map((i) => ({
          media_type: i.type || "images",
          filename: i.filename,
        }));
        await api.moveToTrash(payload);
      }
      setSelectedKeys(new Set());
      setModalOpen(false);
      await loadData();
    } catch (e) {
      console.error("Action execution failed", e);
    } finally {
      setModalActionLoading(false);
    }
  };

  const totalBytes = assets
    ? [
        ...(assets.images || []),
        ...(assets.videos || []),
        ...(assets.audio || []),
        ...(assets.final || []),
      ].reduce((acc: number, f: any) => acc + (f.size_bytes || 0), 0)
    : 0;

  const trashCount = trashAssets?.total || assets?.trash_count || 0;
  const trashBytes = trashAssets?.total_bytes || assets?.trash_bytes || 0;

  const tabIcon = {
    all: FolderArchive,
    final: Film,
    videos: Video,
    images: ImageIcon,
    audio: Mic,
    trash: Trash2,
  };

  return (
    <div className="space-y-6 pb-20 font-jakarta">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] text-zinc-500 uppercase">
            <span>STORAGE VAULT 5.0</span>
            <span>//</span>
            <span>HARDWARE & SUPABASE CLOUD</span>
          </div>
          <h1 className="text-3xl font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight">
            Asset Repository
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-[#09090d] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-zinc-700 dark:text-zinc-400">
            <HardDrive className="h-3.5 w-3.5 text-zinc-500" />
            <span>{assets?.total || 0} ACTIVE</span>
            <span className="text-zinc-400 dark:text-zinc-600">•</span>
            <span>{formatBytes(totalBytes)}</span>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-full bg-zinc-100 dark:bg-[#09090d] border border-black/[0.08] dark:border-white/[0.08] hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            title="Refresh Vault & Storage"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "final", "videos", "images", "audio", "trash"] as Tab[]).map((t) => {
            const Icon = tabIcon[t];
            const count =
              t === "trash"
                ? trashCount
                : t === "all"
                ? assets?.total || 0
                : assets?.[t]?.length || 0;

            const isTrashTab = t === "trash";

            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition-all font-mono cursor-pointer",
                  tab === t
                    ? isTrashTab
                      ? "bg-rose-600 text-white border border-transparent font-semibold shadow-md shadow-rose-600/20"
                      : "bg-zinc-950 text-white dark:bg-white dark:text-black border border-transparent font-semibold shadow-sm"
                    : isTrashTab && trashCount > 0
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100"
                    : "bg-zinc-100 dark:bg-[#09090d] text-zinc-700 dark:text-zinc-400 border border-black/[0.07] dark:border-white/[0.07] hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-white/[0.18]"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isTrashTab && tab !== t && "text-rose-500")} />
                <span>{t === "final" ? "Masters" : t === "trash" ? "Trash Bin" : t}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                    tab === t
                      ? "bg-white/20 text-white dark:bg-black/10 dark:text-black"
                      : isTrashTab && trashCount > 0
                      ? "bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Bulk Select All */}
        <div className="flex items-center gap-2">
          {activeFiles.length > 0 && (
            <button
              onClick={selectedKeys.size === activeFiles.length ? clearSelection : selectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-[#09090d] border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              {selectedKeys.size === activeFiles.length ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-zinc-950 dark:text-white" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Select All</span>
                </>
              )}
            </button>
          )}

          <div className="relative min-w-[220px]">
            <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filenames..."
              className="w-full bg-zinc-100 dark:bg-[#09090d] border border-black/[0.08] dark:border-white/[0.08] rounded-full pl-9 pr-3.5 py-1.5 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-black/40 dark:focus:border-white/30 font-jakarta"
            />
          </div>
        </div>
      </div>

      {/* Trash Tab Banner Notice */}
      {tab === "trash" && (
        <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-heading text-rose-950 dark:text-rose-200">
                Recycle Bin ({trashCount} Assets • {formatBytes(trashBytes)})
              </h3>
              <p className="text-xs text-rose-700/80 dark:text-rose-400 font-jakarta">
                Files here are preserved safely. You can restore them anytime or empty trash for permanent cleanup.
              </p>
            </div>
          </div>

          {trashCount > 0 && (
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={selectAll}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-black/[0.08] dark:border-white/[0.08] text-xs font-mono hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleEmptyTrashClick}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-heading font-medium text-xs tracking-tight transition-all cursor-pointer shadow-md shadow-rose-600/20 active:scale-98"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>EMPTY TRASH</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {activeFiles.map((file, i) => {
          const selected = isSelected(file.type, file.filename);

          return (
            <div
              key={`${file.type}-${file.filename}-${i}`}
              className={cn(
                "hf-card overflow-hidden flex flex-col justify-between group relative transition-all duration-200",
                selected &&
                  "ring-2 ring-zinc-950 dark:ring-white border-zinc-950 dark:border-white bg-zinc-50/50 dark:bg-zinc-900/40"
              )}
            >
              {/* Checkbox Trigger Top Right */}
              <button
                type="button"
                onClick={() => toggleSelect(file.type, file.filename)}
                className="absolute top-2.5 right-2.5 z-20 p-1 rounded-md bg-black/60 hover:bg-black/90 backdrop-blur-md text-white transition-all cursor-pointer border border-white/20"
                title={selected ? "Deselect" : "Select"}
              >
                {selected ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Square className="w-4 h-4 text-zinc-300" />
                )}
              </button>

              {/* Viewport Preview */}
              <div className="h-44 bg-zinc-950 flex items-center justify-center overflow-hidden relative border-b border-black/[0.06] dark:border-white/[0.06]">
                {file.type === "images" && (
                  <img
                    src={getMediaUrl(file.url)}
                    alt={file.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}

                {(file.type === "videos" || file.type === "final") && (
                  <video
                    src={getMediaUrl(file.url)}
                    controls
                    className="w-full h-full object-cover"
                  />
                )}

                {file.type === "audio" && (
                  <div className="w-full p-4 text-center space-y-2">
                    <Mic className="h-8 w-8 text-zinc-400 dark:text-zinc-600 mx-auto" />
                    <audio src={getMediaUrl(file.url)} controls className="w-full" />
                  </div>
                )}

                <span
                  className={cn(
                    "absolute top-2.5 left-2.5 text-[8px] font-mono uppercase px-2 py-0.5 rounded backdrop-blur-sm border",
                    tab === "trash"
                      ? "bg-rose-950/80 text-rose-300 border-rose-800/40"
                      : "bg-black/80 text-zinc-300 border-white/10"
                  )}
                >
                  [ {tab === "trash" ? `TRASH / ${file.type}` : file.type.toUpperCase()} ]
                </span>
              </div>

              {/* Metadata & Actions */}
              <div className="p-3.5 space-y-2">
                <div className="min-w-0 pr-6">
                  <p
                    className="text-xs font-mono font-medium text-zinc-950 dark:text-white truncate"
                    title={file.filename}
                  >
                    {file.filename}
                  </p>
                  <p className="text-[10px] font-mono text-zinc-500">
                    {formatBytes(file.size_bytes)}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <a
                      href={getMediaUrl(file.url)}
                      download
                      className="flex items-center gap-1 text-[11px] font-mono text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                      title="Download Asset"
                    >
                      <Download className="h-3 w-3" />
                      <span>DL</span>
                    </a>

                    {file.type === "images" && tab !== "trash" && (
                      <button
                        type="button"
                        onClick={() => router.push(`/video?image=${encodeURIComponent(file.url)}`)}
                        className="flex items-center gap-0.5 text-[11px] font-mono text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <span>ANIMATE</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Right Action: Trash/Restore/Permanent Delete */}
                  {tab === "trash" ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSingleRestore(file)}
                        className="p-1 rounded text-emerald-600 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                        title="Restore to Active Vault"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSinglePermanentDeleteClick(file)}
                        className="p-1 rounded text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Delete Forever"
                      >
                        <Flame className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSingleTrashClick(file)}
                      className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Move to Trash"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {activeFiles.length === 0 && !loading && (
          <div className="col-span-full text-center py-20 rounded-2xl border border-dashed border-black/[0.1] dark:border-white/[0.08] space-y-2">
            <FolderArchive className="h-10 w-10 text-zinc-400 dark:text-zinc-700 mx-auto" />
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 font-heading tracking-tight uppercase">
              {tab === "trash" ? "TRASH BIN EMPTY" : "REPOSITORY EMPTY"}
            </p>
            <p className="text-[11px] text-zinc-500 font-mono max-w-sm mx-auto">
              {tab === "trash"
                ? "There are no discarded assets in the Recycle Bin."
                : "Generate images, videos, or cinema productions to store them in your vault."}
            </p>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar (when 1 or more selected) */}
      {selectedKeys.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-[#09090d]/95 backdrop-blur-xl border border-black/[0.12] dark:border-white/[0.12] rounded-full px-5 py-2.5 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 border-r border-black/[0.08] dark:border-white/[0.08] pr-4">
            <div className="w-5 h-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-black flex items-center justify-center font-mono text-[10px] font-bold">
              {selectedKeys.size}
            </div>
            <span className="text-xs font-mono text-zinc-800 dark:text-zinc-200 font-medium">
              SELECTED
            </span>
          </div>

          <div className="flex items-center gap-2">
            {tab === "trash" ? (
              <>
                <button
                  type="button"
                  onClick={handleBulkRestoreClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-heading font-semibold transition-all cursor-pointer shadow-sm active:scale-98"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESTORE SELECTED</span>
                </button>
                <button
                  type="button"
                  onClick={handleBulkPermanentDeleteClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-heading font-semibold transition-all cursor-pointer shadow-sm active:scale-98"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>DESTROY PERMANENTLY</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleBulkTrashClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-heading font-semibold transition-all cursor-pointer shadow-sm active:scale-98"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>MOVE TO TRASH</span>
                </button>
                <button
                  type="button"
                  onClick={handleBulkPermanentDeleteClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-heading font-semibold transition-all cursor-pointer shadow-sm active:scale-98"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>PURGE PERMANENTLY</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={clearSelection}
              className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Cancel Selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleModalConfirm}
        items={modalItems}
        isPermanent={modalIsPermanent}
        isRestore={modalIsRestore}
        isLoading={modalActionLoading}
        title={modalTitle}
        description={modalDesc}
      />
    </div>
  );
}
