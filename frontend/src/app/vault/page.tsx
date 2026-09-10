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
  Flame,
  Check,
  X,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Sparkles,
  ExternalLink,
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

  // Full View Lightbox state
  const [lightboxAsset, setLightboxAsset] = useState<VaultAsset | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [lightboxCopied, setLightboxCopied] = useState<boolean>(false);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number } | null>(null);

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

  // All image assets in current active list for lightbox carousel
  const imageFiles = useMemo(() => {
    return activeFiles.filter((f) => f.type === "images");
  }, [activeFiles]);

  const currentLightboxIndex = useMemo(() => {
    if (!lightboxAsset) return -1;
    return imageFiles.findIndex((f) => f.filename === lightboxAsset.filename);
  }, [lightboxAsset, imageFiles]);

  // Lightbox keyboard navigation (Esc, Arrow keys, Zoom shortcuts)
  useEffect(() => {
    if (!lightboxAsset) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxAsset(null);
        setLightboxZoom(1);
        setImgNaturalSize(null);
      } else if (e.key === "ArrowRight") {
        if (currentLightboxIndex >= 0 && currentLightboxIndex < imageFiles.length - 1) {
          setLightboxAsset(imageFiles[currentLightboxIndex + 1]);
          setLightboxZoom(1);
          setImgNaturalSize(null);
        }
      } else if (e.key === "ArrowLeft") {
        if (currentLightboxIndex > 0) {
          setLightboxAsset(imageFiles[currentLightboxIndex - 1]);
          setLightboxZoom(1);
          setImgNaturalSize(null);
        }
      } else if (e.key === "+" || e.key === "=") {
        setLightboxZoom((prev) => Math.min(prev + 0.25, 3));
      } else if (e.key === "-") {
        setLightboxZoom((prev) => Math.max(prev - 0.25, 0.5));
      } else if (e.key === "0") {
        setLightboxZoom(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxAsset, currentLightboxIndex, imageFiles]);

  // Open Lightbox
  const openLightbox = (file: VaultAsset) => {
    setLightboxAsset(file);
    setLightboxZoom(1);
    setImgNaturalSize(null);
    setLightboxCopied(false);
  };

  const copyLightboxUrl = async () => {
    if (!lightboxAsset) return;
    try {
      await navigator.clipboard.writeText(getMediaUrl(lightboxAsset.url));
      setLightboxCopied(true);
      setTimeout(() => setLightboxCopied(false), 2200);
    } catch {
      // Fallback
    }
  };

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
        await api.emptyTrash();
      } else if (modalIsRestore) {
        const payload = modalItems.map((i) => ({
          media_type: i.type || "images",
          filename: i.filename,
        }));
        await api.restoreFromTrash(payload);
      } else if (modalIsPermanent) {
        const payload = modalItems.map((i) => ({
          media_type: i.type || "images",
          filename: i.filename,
        }));
        await api.bulkDeleteAssets(payload, true, tab === "trash");
      } else {
        const payload = modalItems.map((i) => ({
          media_type: i.type || "images",
          filename: i.filename,
        }));
        await api.moveToTrash(payload);
      }
      setSelectedKeys(new Set());
      setModalOpen(false);
      // Close lightbox if the deleted item was currently open in lightbox
      if (lightboxAsset && modalItems.some((m) => m.filename === lightboxAsset.filename)) {
        setLightboxAsset(null);
      }
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
            <span className="text-zinc-950 dark:text-zinc-200 font-semibold">Storage Vault</span>
            <span>•</span>
            <span>Local Vault & Cloud Storage</span>
          </div>
          <h1 className="text-3xl font-heading font-extrabold text-zinc-950 dark:text-white tracking-tight">
            Asset Repository
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300">
            <HardDrive className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
            <span>{assets?.total || 0} ACTIVE</span>
            <span className="text-zinc-400 dark:text-zinc-600">•</span>
            <span>{formatBytes(totalBytes)}</span>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
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
            const isActive = tab === t;

            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition-all font-mono cursor-pointer whitespace-nowrap shrink-0",
                  isActive
                    ? isTrashTab
                      ? "bg-rose-600 text-white font-semibold shadow-sm"
                      : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-sm"
                    : isTrashTab && trashCount > 0
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/60"
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:text-black dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isTrashTab && !isActive && "text-rose-500")} />
                <span>{t === "final" ? "Masters" : t === "trash" ? "Trash Bin" : t}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                    isActive
                      ? isTrashTab
                        ? "bg-white/20 text-white"
                        : "bg-white/20 dark:bg-zinc-900/40 text-white dark:text-zinc-950 font-bold"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
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
              className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full pl-9 pr-3.5 py-1.5 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 font-jakarta transition-all"
            />
          </div>
        </div>
      </div>

      {/* Trash Tab Banner Notice */}
      {tab === "trash" && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-heading text-rose-950 dark:text-rose-200">
                Recycle Bin ({trashCount} Assets • {formatBytes(trashBytes)})
              </h3>
              <p className="text-xs text-rose-700/80 dark:text-rose-400/80 font-jakarta">
                Files here are preserved safely. You can restore them anytime or empty trash for permanent cleanup.
              </p>
            </div>
          </div>

          {trashCount > 0 && (
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={selectAll}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 text-xs font-mono hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleEmptyTrashClick}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-heading font-medium text-xs tracking-tight transition-all cursor-pointer shadow-sm active:scale-[0.98] whitespace-nowrap shrink-0"
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
          const isImage = file.type === "images";

          return (
            <div
              key={`${file.type}-${file.filename}-${i}`}
              className={cn(
                "bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between group relative transition-all duration-200 hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-md",
                selected &&
                  "ring-2 ring-zinc-950 dark:ring-white border-zinc-950 dark:border-white bg-zinc-50 dark:bg-zinc-800/40"
              )}
            >
              {/* Checkbox Trigger Top Right */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(file.type, file.filename);
                }}
                className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-md bg-black/60 hover:bg-black/90 backdrop-blur-md text-white transition-all cursor-pointer border border-white/20"
                title={selected ? "Deselect" : "Select"}
              >
                {selected ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Square className="w-4 h-4 text-zinc-300" />
                )}
              </button>

              {/* Viewport Preview */}
              <div
                onClick={() => {
                  if (isImage) openLightbox(file);
                }}
                className={cn(
                  "h-48 bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center overflow-hidden relative border-b border-zinc-200 dark:border-zinc-800/80",
                  isImage && "cursor-zoom-in"
                )}
              >
                {isImage && (
                  <>
                    <img
                      src={getMediaUrl(file.url)}
                      alt={file.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Hover Full View Indicator */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                      <span className="px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-white text-[11px] font-mono flex items-center gap-1.5 border border-white/20 shadow-xl">
                        <Eye className="w-3.5 h-3.5" />
                        <span>FULL VIEW</span>
                      </span>
                    </div>
                  </>
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
                    <Mic className="h-8 w-8 text-zinc-400 mx-auto" />
                    <audio src={getMediaUrl(file.url)} controls className="w-full" />
                  </div>
                )}

                <span
                  className={cn(
                    "absolute top-2.5 left-2.5 text-[9px] font-mono uppercase px-2 py-0.5 rounded backdrop-blur-md border",
                    tab === "trash"
                      ? "bg-rose-950/80 text-rose-300 border-rose-800/40"
                      : "bg-black/80 text-zinc-300 border-white/10"
                  )}
                >
                  {tab === "trash" ? `TRASH / ${file.type}` : file.type.toUpperCase()}
                </span>
              </div>

              {/* Metadata & Actions */}
              <div className="p-3.5 space-y-2.5">
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

                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
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

                    {isImage && (
                      <button
                        type="button"
                        onClick={() => openLightbox(file)}
                        className="flex items-center gap-1 text-[11px] font-mono text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                        title="Open Full View"
                      >
                        <Eye className="h-3 w-3" />
                        <span>VIEW</span>
                      </button>
                    )}

                    {isImage && tab !== "trash" && (
                      <button
                        type="button"
                        onClick={() => router.push(`/studio?mode=image_to_video&image=${encodeURIComponent(file.url)}`)}
                        className="flex items-center gap-1 text-[11px] font-mono text-zinc-900 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-2 py-0.5 rounded transition-colors cursor-pointer"
                        title="Send to Studio to Animate"
                      >
                        <span>STUDIO</span>
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
          <div className="col-span-full text-center py-20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
            {tab === "trash" ? (
               <Trash2 className="h-10 w-10 text-zinc-400 dark:text-zinc-600 mx-auto" />
            ) : (
               <FolderArchive className="h-10 w-10 text-zinc-400 dark:text-zinc-600 mx-auto" />
            )}
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
        <div className="fixed bottom-6 left-0 lg:left-64 right-0 mx-auto w-fit z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-300 dark:border-zinc-700 rounded-full px-5 py-2.5 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 border-r border-zinc-200 dark:border-zinc-800 pr-4">
            <div className="w-5 h-5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-mono text-[10px] font-bold">
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
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-heading font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98] whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESTORE SELECTED</span>
                </button>
                <button
                  type="button"
                  onClick={handleBulkPermanentDeleteClick}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-heading font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98] whitespace-nowrap shrink-0"
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
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-heading font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98] whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>MOVE TO TRASH</span>
                </button>
                <button
                  type="button"
                  onClick={handleBulkPermanentDeleteClick}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-heading font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98] whitespace-nowrap shrink-0"
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

      {/* Interactive Full View Lightbox Modal */}
      {lightboxAsset && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-2xl animate-in fade-in duration-200"
          onClick={() => setLightboxAsset(null)}
        >
          {/* Lightbox Top Control Bar */}
          <div
            className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 bg-black/60 backdrop-blur-md z-10 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] tracking-wider uppercase font-semibold">
                IMAGE FULL VIEW
              </span>
              <div className="min-w-0">
                <p className="text-sm font-mono font-medium text-white truncate max-w-md" title={lightboxAsset.filename}>
                  {lightboxAsset.filename}
                </p>
                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                  <span>{formatBytes(lightboxAsset.size_bytes)}</span>
                  {imgNaturalSize && (
                    <>
                      <span>•</span>
                      <span>{imgNaturalSize.width} × {imgNaturalSize.height} px</span>
                    </>
                  )}
                  {imageFiles.length > 1 && (
                    <>
                      <span>•</span>
                      <span className="text-zinc-300">
                        {currentLightboxIndex + 1} of {imageFiles.length}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Zoom Controls & Close Button */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-zinc-900/80 border border-white/10 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setLightboxZoom((prev) => Math.max(prev - 0.25, 0.5))}
                  className="p-1.5 rounded hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-zinc-300 px-2 min-w-[48px] text-center select-none">
                  {Math.round(lightboxZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxZoom((prev) => Math.min(prev + 0.25, 3))}
                  className="p-1.5 rounded hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                {lightboxZoom !== 1 && (
                  <button
                    type="button"
                    onClick={() => setLightboxZoom(1)}
                    className="p-1.5 rounded hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Reset Zoom (0)"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setLightboxAsset(null)}
                className="p-2 rounded-lg bg-zinc-900/80 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                title="Close Lightbox (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Interactive Stage with Carousel Navigation */}
          <div
            className="flex-1 relative flex items-center justify-center p-6 overflow-auto"
            onClick={(e) => {
              // Click outside image closes lightbox
              if (e.target === e.currentTarget) {
                setLightboxAsset(null);
              }
            }}
          >
            {/* Previous Image Arrow */}
            {imageFiles.length > 1 && currentLightboxIndex > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxAsset(imageFiles[currentLightboxIndex - 1]);
                  setLightboxZoom(1);
                  setImgNaturalSize(null);
                }}
                className="absolute left-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 transition-all hover:scale-105 cursor-pointer shadow-2xl"
                title="Previous Image (Left Arrow)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* High-Resolution Zoomable Image Display */}
            <div
              className="relative max-h-full max-w-full flex items-center justify-center transition-transform duration-150"
              style={{ transform: `scale(${lightboxZoom})` }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={getMediaUrl(lightboxAsset.url)}
                alt={lightboxAsset.filename}
                onLoad={(e) => {
                  const target = e.currentTarget;
                  setImgNaturalSize({
                    width: target.naturalWidth,
                    height: target.naturalHeight,
                  });
                }}
                className="max-h-[75vh] max-w-[85vw] object-contain rounded-lg shadow-2xl select-none"
              />
            </div>

            {/* Next Image Arrow */}
            {imageFiles.length > 1 && currentLightboxIndex < imageFiles.length - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxAsset(imageFiles[currentLightboxIndex + 1]);
                  setLightboxZoom(1);
                  setImgNaturalSize(null);
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 transition-all hover:scale-105 cursor-pointer shadow-2xl"
                title="Next Image (Right Arrow)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Lightbox Bottom Action Bar */}
          <div
            className="px-6 py-3.5 border-t border-white/10 bg-black/70 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shrink-0 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-zinc-400">
                Navigation: <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">Left / Right Arrows</kbd> • Zoom: <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">+/-</kbd>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyLightboxUrl}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 text-xs font-mono transition-colors cursor-pointer"
              >
                {lightboxCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">COPIED URL</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>COPY LINK</span>
                  </>
                )}
              </button>

              <a
                href={getMediaUrl(lightboxAsset.url)}
                download={lightboxAsset.filename}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 text-xs font-mono transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>DOWNLOAD</span>
              </a>

              {tab !== "trash" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/image?source=${encodeURIComponent(lightboxAsset.url)}`);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 text-xs font-mono transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>VARIATIONS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/studio?mode=image_to_video&image=${encodeURIComponent(lightboxAsset.url)}`);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-heading font-semibold transition-all cursor-pointer shadow-lg active:scale-95"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>ANIMATE IN STUDIO</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </>
              )}

              {tab === "trash" ? (
                <button
                  type="button"
                  onClick={() => handleSingleRestore(lightboxAsset)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESTORE</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSingleTrashClick(lightboxAsset)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 border border-white/10 transition-colors cursor-pointer"
                  title="Move to Trash"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
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
