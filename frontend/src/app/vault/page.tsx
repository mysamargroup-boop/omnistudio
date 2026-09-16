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
  Star,
  Share2,
  FolderPlus,
  Layers,
  Heart,
  MoreVertical,
  Edit3,
  Plus,
  Volume2,
  VolumeX,
  Scissors,
  Sparkles,
  ArrowUpDown,
  SlidersHorizontal,
  Calendar,
  Zap,
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { formatBytes, cn } from "@/lib/utils";
import DeleteConfirmModal, { DeleteModalItem } from "@/components/ui/DeleteConfirmModal";
import LazyImage from "@/components/ui/LazyImage";
import ShareModal from "@/components/ui/ShareModal";
import CreateCollectionModal from "@/components/ui/CreateCollectionModal";
import VideoEditorModal from "@/components/video/VideoEditorModal";
import Spinner from "@/components/ui/Spinner";

type Tab = "all" | "favorites" | "browser_ram" | "final" | "videos" | "images" | "audio" | "trash";
type SortOption = "date_desc" | "date_asc" | "size_desc" | "size_asc" | "name_asc" | "name_desc";
type FilterMediaType = "all" | "images" | "videos" | "audio";
type FilterDateRange = "all" | "today" | "week" | "month";

interface VaultAsset {
  filename: string;
  url: string;
  local_path?: string;
  size_bytes: number;
  size_mb: number;
  modified: number;
  type: string;
  is_trash?: boolean;
  is_browser_memory?: boolean;
  status?: string;
  prompt?: string;
  has_prompt?: boolean;
}

export default function VaultPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");
  const [filterType, setFilterType] = useState<FilterMediaType>("all");
  const [filterDate, setFilterDate] = useState<FilterDateRange>("all");
  const [assets, setAssets] = useState<any>(null);
  const [trashAssets, setTrashAssets] = useState<any>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collectionFilenames, setCollectionFilenames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // New Feature Modals state
  const [shareModalAsset, setShareModalAsset] = useState<VaultAsset | null>(null);
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false);
  const [editVideoAsset, setEditVideoAsset] = useState<VaultAsset | null>(null);

  // Multi-selection state: Set of "type::filename"
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [lastSelectedKey, setLastSelectedKey] = useState<string | null>(null);

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
  const [mediaAspects, setMediaAspects] = useState<Record<string, { ratio: number; label: string }>>({});
  const [loadedMedia, setLoadedMedia] = useState<Record<string, boolean>>({});
  const [mediaErrors, setMediaErrors] = useState<Record<string, boolean>>({});
  const [lightboxLoading, setLightboxLoading] = useState<boolean>(true);

  // Context Menu & Rename states matching Reference Images
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null);
  const [renameModalAsset, setRenameModalAsset] = useState<VaultAsset | null>(null);
  const [renameNewName, setRenameNewName] = useState<string>("");
  const [renaming, setRenaming] = useState<boolean>(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // In-Browser Memory (RAM) Ephemeral Assets state
  const [browserMemoryAssets, setBrowserMemoryAssets] = useState<VaultAsset[]>([]);

  // Marquee Drag-to-Select state
  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
  } | null>(null);
  const marqueeRef = React.useRef<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
    initialKeys: Set<string>;
    shiftKey: boolean;
  } | null>(null);

  const loadBrowserMemoryAssets = () => {
    try {
      const raw = sessionStorage.getItem("omnistudio_ephemeral_assets");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setBrowserMemoryAssets(parsed);
          return;
        }
      }
      setBrowserMemoryAssets([]);
    } catch {
      setBrowserMemoryAssets([]);
    }
  };

  useEffect(() => {
    loadBrowserMemoryAssets();
    const handleStorage = () => loadBrowserMemoryAssets();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleStorage);
    };
  }, []);

  // Marquee mouse drag listener on window
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!marqueeRef.current) return;
      const m = marqueeRef.current;

      const dx = e.clientX - m.startX;
      const dy = e.clientY - m.startY;

      // 5px distance threshold to distinguish deliberate drag from click
      if (!m.active && Math.sqrt(dx * dx + dy * dy) > 5) {
        m.active = true;
        document.body.style.userSelect = "none";
      }

      m.currentX = e.clientX;
      m.currentY = e.clientY;

      if (m.active) {
        setMarquee({
          startX: m.startX,
          startY: m.startY,
          currentX: m.currentX,
          currentY: m.currentY,
          active: true,
        });

        const boxLeft = Math.min(m.startX, m.currentX);
        const boxRight = Math.max(m.startX, m.currentX);
        const boxTop = Math.min(m.startY, m.currentY);
        const boxBottom = Math.max(m.startY, m.currentY);

        const cardEls = document.querySelectorAll("[data-asset-card='true']");
        const intersectedKeys = new Set<string>(m.initialKeys);

        cardEls.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const intersects = !(
            rect.right < boxLeft ||
            rect.left > boxRight ||
            rect.bottom < boxTop ||
            rect.top > boxBottom
          );

          const key = el.getAttribute("data-asset-key");
          if (key && intersects) {
            intersectedKeys.add(key);
          }
        });

        setSelectedKeys(intersectedKeys);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!marqueeRef.current) return;
      const m = marqueeRef.current;

      document.body.style.userSelect = "";

      if (!m.active) {
        // Simple click on empty space: clear selection if Shift not held
        if (!m.shiftKey) {
          setSelectedKeys(new Set());
        }
      }

      marqueeRef.current = null;
      setMarquee(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };
  }, []);

  const handleGalleryMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left-click triggers marquee

    const target = e.target as HTMLElement;
    // Do not initiate marquee on interactive controls or inside an asset card
    if (
      target.closest(
        "button, a, input, select, textarea, [data-no-marquee='true'], [data-asset-card='true']"
      )
    ) {
      return;
    }

    const isShift = e.shiftKey;
    const initialKeys = isShift ? new Set(selectedKeys) : new Set<string>();

    marqueeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      active: false,
      initialKeys,
      shiftKey: isShift,
    };
  };

  useEffect(() => {
    const handleWindowClick = () => setActiveMenuKey(null);
    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, []);

  const loadData = async () => {
    setLoading(true);
    loadBrowserMemoryAssets();
    try {
      const [allRes, trashRes, favRes, colRes] = await Promise.allSettled([
        api.getAllAssets(),
        api.getTrashAssets(),
        api.getFavorites(),
        api.getCollections(),
      ]);
      if (allRes.status === "fulfilled") setAssets(allRes.value);
      if (trashRes.status === "fulfilled") setTrashAssets(trashRes.value);
      if (favRes.status === "fulfilled" && favRes.value?.favorites) {
        setFavorites(new Set(favRes.value.favorites));
      }
      if (colRes.status === "fulfilled" && colRes.value?.collections) {
        setCollections(colRes.value.collections);
      }
    } catch (e) {
      console.error("Failed to load vault assets", e);
    }
    setLoading(false);
  };

  const handleToggleFavorite = async (e: React.MouseEvent, filename: string) => {
    e.stopPropagation();
    const isFav = favorites.has(filename);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(filename);
      else next.add(filename);
      return next;
    });
    try {
      await api.toggleFavorite(filename, !isFav);
    } catch (err) {
      console.error("Failed to toggle favorite", err);
    }
  };

  const handleRename = async () => {
    if (!renameModalAsset || !renameNewName.trim()) return;
    setRenaming(true);
    setRenameError(null);
    try {
      const res = await api.renameAsset(renameModalAsset.type, renameModalAsset.filename, renameNewName.trim());
      if (res.success) {
        setRenameModalAsset(null);
        await loadData();
      } else {
        setRenameError(res.error || "Failed to rename asset");
      }
    } catch (e: any) {
      setRenameError(e.message || "Failed to rename asset");
    } finally {
      setRenaming(false);
    }
  };

  const copyAssetToClipboard = (file: VaultAsset) => {
    const fullUrl = getMediaUrl(file.url);
    navigator.clipboard.writeText(fullUrl);
    setCopiedKey(file.filename);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleReusePrompt = (promptText: string) => {
    if (!promptText) return;
    try {
      navigator.clipboard.writeText(promptText);
    } catch (e) {
      console.warn("Clipboard copy failed", e);
    }
    router.push(`/image?prompt=${encodeURIComponent(promptText)}`);
  };

  const downloadAsset = async (url: string, filename: string) => {
    try {
      const res = await fetch(getMediaUrl(url));
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error('Download failed:', e);
      window.open(getMediaUrl(url), '_blank');
    }
  };

  const downloadAssetWithFormat = async (
    url: string,
    filename: string,
    format: 'original' | 'png' | 'jpeg' | 'webp' = 'original'
  ) => {
    if (format === 'original') {
      return downloadAsset(url, filename);
    }
    try {
      const mediaFullUrl = getMediaUrl(url);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = mediaFullUrl;
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(true);
        img.onerror = (e) => reject(e);
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      if (format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);

      const mimeType = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp';
      const quality = format === 'jpeg' ? 0.95 : format === 'webp' ? 0.92 : undefined;
      const ext = format === 'jpeg' ? 'jpg' : format;
      const baseName = filename.replace(/\.[^/.]+$/, "");
      const targetFilename = `${baseName}.${ext}`;

      canvas.toBlob((blob) => {
        if (!blob) {
          downloadAsset(url, filename);
          return;
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = targetFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, mimeType, quality);
    } catch (e) {
      console.error(`Download as ${format} failed, falling back to original:`, e);
      downloadAsset(url, filename);
    }
  };


  // Sync collection items when a collection is selected
  useEffect(() => {
    if (!selectedCollectionId) {
      setCollectionFilenames(new Set());
      return;
    }
    api.getCollectionItems(selectedCollectionId).then((res) => {
      if (res.success && res.filenames) {
        setCollectionFilenames(new Set(res.filenames));
      }
    }).catch(console.error);
  }, [selectedCollectionId]);

  useEffect(() => {
    loadData();
  }, []);

  // Clear selections on tab switch
  useEffect(() => {
    setSelectedKeys(new Set());
  }, [tab]);

  // Derive current list based on tab, collection, filters & sort
  const activeFiles: VaultAsset[] = useMemo(() => {
    let list: VaultAsset[] = [];
    if (tab === "trash") {
      if (!trashAssets?.items) return [];
      list = [...trashAssets.items];
    } else if (tab === "browser_ram") {
      list = [...browserMemoryAssets];
    } else if (!assets) {
      list = [...browserMemoryAssets];
    } else if (tab === "favorites") {
      list = [
        ...browserMemoryAssets.filter((f) => favorites.has(f.filename)),
        ...(assets.final || []),
        ...(assets.videos || []),
        ...(assets.images || []),
        ...(assets.audio || []),
      ].filter((f) => favorites.has(f.filename));
    } else if (tab === "all") {
      list = [
        ...browserMemoryAssets,
        ...(assets.final || []),
        ...(assets.videos || []),
        ...(assets.images || []),
        ...(assets.audio || []),
      ];
    } else {
      const ramItems = browserMemoryAssets.filter((f) => f.type === tab);
      list = [...ramItems, ...(assets[tab] || [])];
    }

    // Filter by selected collection if active
    if (selectedCollectionId && collectionFilenames.size > 0) {
      list = list.filter((f) => collectionFilenames.has(f.filename));
    }

    // Filter by Media Type (if active)
    if (filterType !== "all") {
      list = list.filter((f) => {
        if (filterType === "images") return f.type === "images";
        if (filterType === "videos") return f.type === "videos" || f.type === "final";
        if (filterType === "audio") return f.type === "audio";
        return true;
      });
    }

    // Filter by Date Range
    if (filterDate !== "all") {
      const nowSec = Date.now() / 1000;
      let windowSec = 86400; // today
      if (filterDate === "week") windowSec = 86400 * 7;
      else if (filterDate === "month") windowSec = 86400 * 30;
      const cutoff = nowSec - windowSec;
      list = list.filter((f) => (f.modified || 0) >= cutoff);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.filename.toLowerCase().includes(q) ||
          (f.prompt && f.prompt.toLowerCase().includes(q))
      );
    }

    // Deterministic Sorting (Newest modified date first by default)
    list.sort((a, b) => {
      if (sortBy === "date_desc") return (b.modified || 0) - (a.modified || 0);
      if (sortBy === "date_asc") return (a.modified || 0) - (b.modified || 0);
      if (sortBy === "size_desc") return (b.size_bytes || 0) - (a.size_bytes || 0);
      if (sortBy === "size_asc") return (a.size_bytes || 0) - (b.size_bytes || 0);
      if (sortBy === "name_asc") return a.filename.localeCompare(b.filename);
      if (sortBy === "name_desc") return b.filename.localeCompare(a.filename);
      return (b.modified || 0) - (a.modified || 0);
    });

    return list;
  }, [
    tab,
    assets,
    trashAssets,
    browserMemoryAssets,
    search,
    favorites,
    selectedCollectionId,
    collectionFilenames,
    filterType,
    filterDate,
    sortBy,
  ]);

  // All media assets in current active list for lightbox carousel
  const lightboxFiles = useMemo(() => {
    return activeFiles;
  }, [activeFiles]);

  const currentLightboxIndex = useMemo(() => {
    if (!lightboxAsset) return -1;
    return lightboxFiles.findIndex((f) => f.filename === lightboxAsset.filename);
  }, [lightboxAsset, lightboxFiles]);

  // Lightbox keyboard navigation (Esc, Arrow keys, Zoom shortcuts)
  useEffect(() => {
    if (!lightboxAsset) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxAsset(null);
        setLightboxZoom(1);
        setImgNaturalSize(null);
      } else if (e.key === "ArrowRight") {
        if (currentLightboxIndex >= 0 && currentLightboxIndex < lightboxFiles.length - 1) {
          setLightboxAsset(lightboxFiles[currentLightboxIndex + 1]);
          setLightboxZoom(1);
          setImgNaturalSize(null);
        }
      } else if (e.key === "ArrowLeft") {
        if (currentLightboxIndex > 0) {
          setLightboxAsset(lightboxFiles[currentLightboxIndex - 1]);
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
  }, [lightboxAsset, currentLightboxIndex, lightboxFiles]);

  // Open Lightbox
  const openLightbox = (file: VaultAsset) => {
    setLightboxAsset(file);
    setLightboxZoom(1);
    setImgNaturalSize(null);
    setLightboxCopied(false);
    setLightboxLoading(true);
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

  // Selection toggle with Shift+Click Range Selection
  const toggleSelect = (type: string, filename: string, shiftKey: boolean = false) => {
    const key = `${type}::${filename}`;
    if (shiftKey && lastSelectedKey) {
      const lastIdx = activeFiles.findIndex((f) => `${f.type}::${f.filename}` === lastSelectedKey);
      const currIdx = activeFiles.findIndex((f) => `${f.type}::${f.filename}` === key);
      if (lastIdx !== -1 && currIdx !== -1) {
        const start = Math.min(lastIdx, currIdx);
        const end = Math.max(lastIdx, currIdx);
        setSelectedKeys((prev) => {
          const next = new Set(prev);
          for (let i = start; i <= end; i++) {
            const item = activeFiles[i];
            next.add(`${item.type}::${item.filename}`);
          }
          return next;
        });
        setLastSelectedKey(key);
        return;
      }
    }

    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    setLastSelectedKey(key);
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

  // Bulk Actions
  const handleBulkDownload = async () => {
    const items = getSelectedItems();
    if (items.length === 0) return;
    items.forEach((item, index) => {
      setTimeout(() => {
        downloadAsset(item.url, item.filename);
      }, index * 250);
    });
  };

  const handleBulkFavorite = async () => {
    const items = getSelectedItems();
    if (items.length === 0) return;
    const allFav = items.every((i) => favorites.has(i.filename));
    const newFavState = !allFav;
    setFavorites((prev) => {
      const next = new Set(prev);
      items.forEach((i) => {
        if (newFavState) next.add(i.filename);
        else next.delete(i.filename);
      });
      return next;
    });
    for (const item of items) {
      try {
        await api.toggleFavorite(item.filename, newFavState);
      } catch (_) {}
    }
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

      // If any deleted items were in-browser RAM ephemeral assets, purge them from memory & sessionStorage
      const ramFilenames = new Set(
        modalItems
          .filter((i) => browserMemoryAssets.some((b) => b.filename === i.filename))
          .map((i) => i.filename)
      );
      if (ramFilenames.size > 0) {
        const updated = browserMemoryAssets.filter((b) => !ramFilenames.has(b.filename));
        setBrowserMemoryAssets(updated);
        try {
          if (updated.length > 0) {
            sessionStorage.setItem("omnistudio_ephemeral_assets", JSON.stringify(updated));
          } else {
            sessionStorage.removeItem("omnistudio_ephemeral_assets");
          }
        } catch {}
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
    favorites: Star,
    browser_ram: Zap,
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
            {loading ? <Spinner size="xs" variant="emerald" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-nowrap whitespace-nowrap">
          {(["all", "favorites", "browser_ram", "final", "videos", "images", "audio", "trash"] as Tab[]).map((t) => {
            const Icon = tabIcon[t];
            const count =
              t === "trash"
                ? trashCount
                : t === "favorites"
                ? favorites.size
                : t === "browser_ram"
                ? browserMemoryAssets.length
                : t === "all"
                ? (assets?.total || 0) + browserMemoryAssets.length
                : (assets?.[t]?.length || 0) + browserMemoryAssets.filter((b) => b.type === t).length;

            const isTrashTab = t === "trash";
            const isFavTab = t === "favorites";
            const isBrowserRamTab = t === "browser_ram";
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
                      : isFavTab
                      ? "bg-amber-400 text-zinc-950 font-bold shadow-sm"
                      : isBrowserRamTab
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-bold shadow-sm"
                      : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-sm"
                    : isTrashTab && trashCount > 0
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/60"
                    : isFavTab && favorites.size > 0
                    ? "bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                    : isBrowserRamTab && browserMemoryAssets.length > 0
                    ? "bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:text-black dark:hover:text-white hover:border-zinc-300 dark:border-zinc-700"
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5",
                    isTrashTab && !isActive && "text-rose-500",
                    isFavTab && (isActive ? "text-zinc-950 fill-current" : "text-amber-400 fill-current"),
                    isBrowserRamTab && (isActive ? "text-zinc-950 fill-current" : "text-amber-400 fill-current")
                  )}
                />
                <span>
                  {t === "final"
                    ? "Masters"
                    : t === "trash"
                    ? "Trash Bin"
                    : t === "favorites"
                    ? "Favorites"
                    : t === "browser_ram"
                    ? "Browser RAM"
                    : t}
                </span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                    isActive
                      ? isTrashTab
                        ? "bg-white/20 text-white"
                        : isFavTab
                        ? "bg-black/20 text-zinc-950 font-bold"
                        : isBrowserRamTab
                        ? "bg-black/20 text-zinc-950 font-bold"
                        : "bg-white/20 dark:bg-zinc-900/40 text-white dark:text-zinc-950 font-bold"
                      : isTrashTab && trashCount > 0
                      ? "bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold"
                      : isBrowserRamTab && browserMemoryAssets.length > 0
                      ? "bg-amber-400/20 text-amber-600 dark:text-amber-300 font-bold"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Sort, Filter & Bulk Select All */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-[10px] uppercase font-bold text-zinc-400 hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer pr-1"
            >
              <option value="date_desc" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Date (Newest First)</option>
              <option value="date_asc" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Date (Oldest First)</option>
              <option value="size_desc" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Size (Largest First)</option>
              <option value="size_asc" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Size (Smallest First)</option>
              <option value="name_asc" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Name (A → Z)</option>
              <option value="name_desc" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Name (Z → A)</option>
            </select>
          </div>

          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value as FilterDateRange)}
              className="bg-transparent text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">All Time</option>
              <option value="today" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Today</option>
              <option value="week" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Past 7 Days</option>
              <option value="month" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Past 30 Days</option>
            </select>
          </div>

          {/* Media Type Filter (on All, Favorites, Trash) */}
          {(tab === "all" || tab === "favorites" || tab === "trash") && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterMediaType)}
                className="bg-transparent text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">All Types</option>
                <option value="images" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Images</option>
                <option value="videos" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Videos</option>
                <option value="audio" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Audio</option>
              </select>
            </div>
          )}

          {activeFiles.length > 0 && (
            <>
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

              <button
                type="button"
                onClick={() => {
                  if (selectedKeys.size > 0) {
                    handleBulkDownload();
                  } else {
                    selectAll();
                    activeFiles.forEach((item, index) => {
                      setTimeout(() => {
                        downloadAsset(item.url, item.filename);
                      }, index * 250);
                    });
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98] whitespace-nowrap shrink-0"
                title={selectedKeys.size > 0 ? `Download ${selectedKeys.size} selected assets` : `Download all ${activeFiles.length} assets`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {selectedKeys.size > 0
                    ? `Download Selected (${selectedKeys.size})`
                    : `Bulk Download (${activeFiles.length})`}
                </span>
              </button>
            </>
          )}

          <div className="relative min-w-[200px] flex-1">
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

      {/* Collections Filter Strip */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 pl-1 pr-2">
          <Layers className="w-3.5 h-3.5" />
          <span className="uppercase text-[10px] tracking-wider font-semibold">COLLECTIONS:</span>
        </div>

        <button
          type="button"
          onClick={() => setSelectedCollectionId(null)}
          className={cn(
            "px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer",
            selectedCollectionId === null
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs"
              : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-zinc-200 dark:border-zinc-800"
          )}
        >
          All Collections
        </button>

        {collections.map((col) => (
          <button
            key={col.id}
            type="button"
            onClick={() => setSelectedCollectionId(col.id === selectedCollectionId ? null : col.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer",
              selectedCollectionId === col.id
                ? "bg-amber-400 text-zinc-950 font-bold shadow-xs"
                : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-zinc-200 dark:border-zinc-800"
            )}
          >
            <span>{col.name}</span>
            <span className="text-[10px] px-1 rounded bg-black/10 dark:bg-white/10 font-bold">
              {col.item_count || 0}
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => setCreateCollectionOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-all cursor-pointer ml-auto"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>+ New Collection</span>
        </button>
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

      {/* Loading Skeleton Animation when vault is syncing or opening */}
      {loading && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs font-mono">
            <div className="flex items-center gap-2.5">
              <Spinner size="sm" variant="emerald" />
              <span className="text-zinc-800 dark:text-zinc-200 font-semibold tracking-wide">
                Synchronizing Asset Vault & Media Repository...
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider hidden sm:inline">
              OMNISTUDIO REPOSITORY
            </span>
          </div>
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {[
              "aspect-video",
              "aspect-[9/16]",
              "aspect-square",
              "aspect-[4/5]",
              "aspect-[9/16]",
              "aspect-video",
              "aspect-[4/5]",
              "aspect-square",
            ].map((aspect, idx) => (
              <div
                key={`vault-skeleton-${idx}`}
                className="break-inside-avoid inline-block w-full mb-4 rounded-2xl bg-zinc-950 overflow-hidden shadow-sm align-top"
              >
                <div
                  className={cn(
                    "w-full relative overflow-hidden bg-zinc-900/90 flex items-center justify-center animate-pulse",
                    aspect
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-pulse" />
                  <ImageIcon className="w-8 h-8 text-zinc-800 animate-pulse" />
                </div>
                <div className="p-3 bg-zinc-950 space-y-2 border-t border-white/5">
                  <div className="h-3 w-3/4 rounded bg-zinc-800/80 animate-pulse" />
                  <div className="flex items-center justify-between pt-1">
                    <div className="h-2 w-16 rounded bg-zinc-800/60 animate-pulse" />
                    <div className="h-2 w-12 rounded bg-zinc-800/60 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stable Media Display with True Masonry Layout & Smooth Faded Image Transitions & Marquee Lasso Selection */}
      {!loading && (
        <div
          onMouseDown={handleGalleryMouseDown}
          className="relative min-h-[500px] select-none pb-28"
        >
          {/* Marquee Selection Rectangle Box */}
          {marquee && marquee.active && (
            <div
              className="fixed pointer-events-none z-[99999] border-2 border-emerald-500 bg-emerald-500/15 backdrop-blur-[0.5px] rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-none"
              style={{
                left: Math.min(marquee.startX, marquee.currentX),
                top: Math.min(marquee.startY, marquee.currentY),
                width: Math.abs(marquee.currentX - marquee.startX),
                height: Math.abs(marquee.currentY - marquee.startY),
              }}
            />
          )}

          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {activeFiles.map((file, i) => {
              const selected = isSelected(file.type, file.filename);
              const isImage = file.type === "images";
              const isVideo = file.type === "videos" || file.type === "final";
              const isAudio = file.type === "audio";
              const isMenuOpen = activeMenuKey === file.filename;

              return (
                <div
                  key={`${file.type}-${file.filename}-${i}`}
                  data-asset-card="true"
                  data-asset-key={`${file.type}::${file.filename}`}
                  onClick={(e) => {
                    if (e.shiftKey || selectedKeys.size > 0) {
                      e.stopPropagation();
                      toggleSelect(file.type, file.filename, e.shiftKey);
                    } else {
                      openLightbox(file);
                    }
                  }}
                  onMouseEnter={(e) => {
                    const v = e.currentTarget.querySelector("video");
                    if (v) {
                      v.muted = true;
                      v.play().catch(() => {});
                    }
                  }}
                  onMouseLeave={(e) => {
                    const v = e.currentTarget.querySelector("video");
                    if (v) {
                      v.pause();
                      v.currentTime = 0;
                    }
                  }}
                  className={cn(
                    "break-inside-avoid inline-block w-full mb-4 align-top group relative rounded-2xl bg-zinc-950 shadow-sm hover:shadow-2xl transition-all duration-300 select-none cursor-pointer border-0",
                    isMenuOpen ? "overflow-visible z-[100] relative" : "overflow-hidden z-10",
                    selected && "ring-2 ring-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                  )}
                >
                {/* Media Display with Faded Smooth Transition & Aspect Ratio */}
                <div className="w-full relative overflow-hidden rounded-t-2xl bg-zinc-900/90 flex items-center justify-center min-h-[160px]">
                  {/* Shimmer skeleton placeholder while image/video is loading */}
                  {!loadedMedia[file.filename] && !mediaErrors[file.filename] && !isAudio && (
                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-800/60 to-zinc-900 animate-pulse flex items-center justify-center pointer-events-none">
                      <ImageIcon className="w-6 h-6 text-zinc-700 animate-pulse opacity-60" />
                    </div>
                  )}

                  {mediaErrors[file.filename] ? (
                    <div className="w-full h-44 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 flex flex-col items-center justify-center gap-2.5 p-4 text-center select-none border-b border-zinc-800/60">
                      <div className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center shadow-lg border",
                        isVideo 
                          ? "bg-cyan-950/50 border-cyan-500/30 text-cyan-400" 
                          : "bg-emerald-950/50 border-emerald-500/30 text-emerald-400"
                      )}>
                        {isVideo ? <Film className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                      </div>
                      <div className="flex flex-col items-center max-w-[85%]">
                        <span className="text-[11px] font-medium text-zinc-300 truncate max-w-full">
                          {file.filename}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-zinc-500 mt-0.5 font-mono">
                          {isVideo ? "Video Clip" : "Image Asset"} • {formatBytes(file.size_bytes)}
                        </span>
                      </div>
                    </div>
                  ) : isImage ? (
                    <img
                      src={getMediaUrl(file.url)}
                      alt={file.filename}
                      loading="lazy"
                      decoding="async"
                      onError={() => {
                        setMediaErrors((prev) => ({ ...prev, [file.filename]: true }));
                        setLoadedMedia((prev) => ({ ...prev, [file.filename]: true }));
                      }}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        if (img.naturalWidth && img.naturalHeight) {
                          const r = img.naturalWidth / img.naturalHeight;
                          let lbl = "IMG";
                          if (r >= 1.6) lbl = "16:9";
                          else if (r <= 0.65) lbl = "9:16";
                          else if (r >= 0.95 && r <= 1.05) lbl = "1:1";
                          else if (r > 0.65 && r < 0.95) lbl = "4:5";
                          else lbl = `${img.naturalWidth}×${img.naturalHeight}`;
                          setMediaAspects((prev) => ({ ...prev, [file.filename]: { ratio: r, label: lbl } }));
                        }
                        setLoadedMedia((prev) => ({ ...prev, [file.filename]: true }));
                      }}
                      className={cn(
                        "w-full h-auto block object-cover group-hover:scale-[1.02] transition-all duration-700 ease-out will-change-[opacity,transform]",
                        loadedMedia[file.filename]
                          ? "opacity-100 scale-100 filter-none"
                          : "opacity-0 scale-[1.02] blur-xs"
                      )}
                    />
                  ) : isVideo ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <video
                        src={`${getMediaUrl(file.url)}${file.url.includes("#") ? "" : "#t=0.5"}`}
                        playsInline
                        loop
                        muted
                        preload="metadata"
                        onError={() => {
                          setMediaErrors((prev) => ({ ...prev, [file.filename]: true }));
                          setLoadedMedia((prev) => ({ ...prev, [file.filename]: true }));
                        }}
                        onLoadedData={() => {
                          setLoadedMedia((prev) => ({ ...prev, [file.filename]: true }));
                        }}
                        onLoadedMetadata={(e) => {
                          const v = e.currentTarget;
                          if (v.videoWidth && v.videoHeight) {
                            const r = v.videoWidth / v.videoHeight;
                            let lbl = "VIDEO";
                            if (r >= 1.6) lbl = "16:9";
                            else if (r <= 0.65) lbl = "9:16";
                            else if (r >= 0.95 && r <= 1.05) lbl = "1:1";
                            else if (r > 0.65 && r < 0.95) lbl = "4:5";
                            else lbl = `${v.videoWidth}×${v.videoHeight}`;
                            setMediaAspects((prev) => ({ ...prev, [file.filename]: { ratio: r, label: lbl } }));
                          }
                        }}
                        className={cn(
                          "w-full h-auto block object-cover group-hover:scale-[1.02] transition-all duration-700 ease-out pointer-events-none will-change-[opacity,transform]",
                          loadedMedia[file.filename]
                            ? "opacity-100 scale-100"
                            : "opacity-0 scale-[1.02]"
                        )}
                      />
                    </div>
                  ) : null}

                  {isAudio && (
                  <div className="w-full bg-zinc-900 flex flex-col items-center justify-center gap-3 p-6 min-h-[190px]">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-rose-400">
                      <Mic className="w-6 h-6" />
                    </div>
                    <audio src={getMediaUrl(file.url)} controls className="w-full max-w-[200px]" onClick={(e) => e.stopPropagation()} />
                  </div>
                )}

                {/* Subtle gradient vignette at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-80 pointer-events-none" />

                {/* Type & Native Aspect Ratio Badge */}
                <div className="absolute top-3 left-11 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-[9px] font-mono text-zinc-300 flex items-center gap-1 pointer-events-none z-20 shadow-sm">
                  {isVideo ? (
                    <>
                      <Film className="w-2.5 h-2.5 text-cyan-400" />
                      <span className="text-cyan-300 font-semibold">{mediaAspects[file.filename]?.label || "VIDEO"}</span>
                    </>
                  ) : isImage ? (
                    <>
                      <ImageIcon className="w-2.5 h-2.5 text-emerald-400" />
                      <span className="text-zinc-200 font-semibold">{mediaAspects[file.filename]?.label || "IMAGE"}</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-2.5 h-2.5 text-rose-400" />
                      <span className="text-rose-300 font-semibold">AUDIO</span>
                    </>
                  )}
                </div>
              </div>

              {/* Multi-Select Trigger (Top Left) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(file.type, file.filename);
                }}
                className={cn(
                  "absolute top-3 left-3 z-30 w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md",
                  selected
                    ? "bg-emerald-500 text-white ring-2 ring-white/90 scale-105 opacity-100 shadow-emerald-500/40"
                    : cn(
                        "bg-black/40 backdrop-blur-md border-2 border-white/70 hover:border-white hover:bg-black/60 hover:scale-110",
                        selectedKeys.size > 0 ? "opacity-90" : "opacity-0 group-hover:opacity-100"
                      )
                )}
                title={selected ? "Deselect item" : "Select item"}
              >
                {selected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
              </button>

              {/* Ephemeral In-Browser RAM Label Badge */}
              {file.is_browser_memory && (
                <div
                  className="absolute top-3 right-20 z-30 flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 px-2 py-0.5 rounded-md shadow-md border border-amber-300/50 pointer-events-none"
                  title="In-Browser Ephemeral Media (Held in RAM, Zero-Disk)"
                >
                  <Zap className="w-2.5 h-2.5 fill-current animate-pulse" />
                  <span className="font-mono text-[9px] font-extrabold tracking-wider">BROWSER RAM</span>
                </div>
              )}

              {/* Top Right Floating Capsule: Heart (Favorite) + Three-Dots (Options) */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-black/60 hover:bg-black/80 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 text-white transition-all shadow-lg"
              >
                {tab !== "trash" && (
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, file.filename)}
                    className="p-1 hover:scale-110 transition-transform cursor-pointer"
                    title={favorites.has(file.filename) ? "Remove Favorite" : "Favorite"}
                  >
                    <Heart
                      className={cn(
                        "w-3.5 h-3.5 transition-colors",
                        favorites.has(file.filename) ? "text-rose-500 fill-current" : "text-white/80 hover:text-white"
                      )}
                    />
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuKey(isMenuOpen ? null : file.filename);
                  }}
                  className={cn(
                    "p-1 hover:scale-110 transition-transform cursor-pointer",
                    isMenuOpen ? "text-white" : "text-white/80 hover:text-white"
                  )}
                  title="More Options"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bottom Left Floating Label: Media Icon + Original Filename */}
              <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
                <div
                  className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white max-w-[85%] pointer-events-auto shadow-md"
                  title={file.filename}
                >
                  {isImage && <ImageIcon className="w-3.5 h-3.5 text-zinc-300 shrink-0" />}
                  {isVideo && <Video className="w-3.5 h-3.5 text-cyan-300 shrink-0" />}
                  {isAudio && <Mic className="w-3.5 h-3.5 text-rose-300 shrink-0" />}
                  <span className="text-[11px] font-mono truncate">{file.filename}</span>
                  {file.is_browser_memory && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-400 text-zinc-950 font-bold shrink-0 shadow-xs">
                      RAM
                    </span>
                  )}
                </div>

                {isVideo && (
                  <div className="bg-black/70 backdrop-blur-md p-1.5 rounded-lg border border-white/10 text-white pointer-events-auto shadow-md">
                    <Volume2 className="w-3 h-3 text-emerald-400" />
                  </div>
                )}
              </div>

              {/* Floating Context Menu matching Reference Image 2 */}
              {isMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-11 right-3 z-[110] w-52 bg-[#121216]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl text-xs font-jakarta space-y-0.5 animate-in fade-in zoom-in-95 duration-150 text-zinc-200 select-none"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      handleToggleFavorite(e, file.filename);
                      setActiveMenuKey(null);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <Heart className={cn("w-4 h-4", favorites.has(file.filename) ? "text-rose-500 fill-current" : "text-zinc-400")} />
                    <span>{favorites.has(file.filename) ? "Unfavorite" : "Favorite"}</span>
                  </button>

                  {/* Reuse Prompt (Only for platform-generated media that has prompt metadata) */}
                  {file.prompt && tab !== "trash" && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuKey(null);
                        handleReusePrompt(file.prompt!);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-emerald-500/15 text-emerald-400 hover:text-emerald-300 transition-colors text-left cursor-pointer group/reuse"
                      title={file.prompt}
                    >
                      <Sparkles className="w-4 h-4 text-emerald-400 group-hover/reuse:rotate-12 transition-transform shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-emerald-400">Reuse Prompt</span>
                        <span className="text-[10px] text-zinc-400 truncate max-w-[150px]">{file.prompt}</span>
                      </div>
                    </button>
                  )}

                  {(isImage || isVideo) && tab !== "trash" && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuKey(null);
                        router.push(`/video?image=${encodeURIComponent(file.url)}`);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-left cursor-pointer"
                    >
                      <Film className="w-4 h-4 text-cyan-400" />
                      <span>Animate</span>
                    </button>
                  )}

                  {isVideo && tab !== "trash" && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuKey(null);
                        setEditVideoAsset(file);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 text-emerald-400 transition-colors text-left cursor-pointer"
                    >
                      <Scissors className="w-4 h-4 text-emerald-400" />
                      <span>Video Editor</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuKey(null);
                      setShareModalAsset(file);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-zinc-400" />
                    <span>Share</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuKey(null);
                      navigator.clipboard.writeText(file.filename);
                      setCopiedKey(file.filename);
                      setTimeout(() => setCopiedKey(null), 2000);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-zinc-400" />
                    <span>Add to prompt</span>
                  </button>

                  {/* Download with Interactive Format Submenu on Hover */}
                  <div className="relative group/download">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuKey(null);
                        downloadAssetWithFormat(file.url, file.filename, 'original');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Download className="w-4 h-4 text-zinc-400 group-hover/download:text-white" />
                        <span>Download</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover/download:text-white group-hover/download:translate-x-0.5 transition-all" />
                    </button>

                    {/* Submenu on Hover (Pops out to the left) */}
                    <div className="absolute right-full -top-1 mr-1.5 w-48 bg-[#16161d] border border-white/10 rounded-2xl p-1.5 shadow-2xl space-y-0.5 z-[120] text-xs font-jakarta opacity-0 invisible group-hover/download:opacity-100 group-hover/download:visible transition-all duration-150 backdrop-blur-xl">
                      <div className="px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider border-b border-white/5 mb-1 flex items-center justify-between">
                        <span>Download As</span>
                        <span className="text-[9px] text-zinc-500">FORMAT</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuKey(null);
                          downloadAssetWithFormat(file.url, file.filename, 'original');
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-zinc-200 hover:text-white transition-colors text-left cursor-pointer"
                      >
                        <span className="font-medium">Original File</span>
                        <span className="text-[9px] font-mono px-1 rounded bg-white/10 text-zinc-400">SRC</span>
                      </button>

                      {isImage && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuKey(null);
                              downloadAssetWithFormat(file.url, file.filename, 'png');
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-emerald-500/15 text-zinc-200 hover:text-emerald-300 transition-colors text-left cursor-pointer"
                          >
                            <span className="font-medium">PNG (Lossless)</span>
                            <span className="text-[9px] font-mono px-1 rounded bg-emerald-500/20 text-emerald-400 font-bold">PNG</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuKey(null);
                              downloadAssetWithFormat(file.url, file.filename, 'jpeg');
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-zinc-200 hover:text-white transition-colors text-left cursor-pointer"
                          >
                            <span className="font-medium">JPEG (High-Res)</span>
                            <span className="text-[9px] font-mono px-1 rounded bg-white/10 text-zinc-400 font-bold">JPG</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuKey(null);
                              downloadAssetWithFormat(file.url, file.filename, 'webp');
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-cyan-500/15 text-zinc-200 hover:text-cyan-300 transition-colors text-left cursor-pointer"
                          >
                            <span className="font-medium">WebP (Web-Ready)</span>
                            <span className="text-[9px] font-mono px-1 rounded bg-cyan-500/20 text-cyan-400 font-bold">WEBP</span>
                          </button>
                        </>
                      )}

                      {isVideo && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuKey(null);
                            downloadAssetWithFormat(file.url, file.filename, 'original');
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-cyan-500/15 text-zinc-200 hover:text-cyan-300 transition-colors text-left cursor-pointer"
                        >
                          <span className="font-medium">MP4 Video</span>
                          <span className="text-[9px] font-mono px-1 rounded bg-cyan-500/20 text-cyan-400 font-bold">1080P</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      copyAssetToClipboard(file);
                      setActiveMenuKey(null);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-zinc-400" />
                    <span>{copiedKey === file.filename ? "Copied!" : "Copy URL"}</span>
                  </button>

                  {tab !== "trash" && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuKey(null);
                        setRenameModalAsset(file);
                        setRenameNewName(file.filename);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-left cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4 text-zinc-400" />
                      <span>Rename</span>
                    </button>
                  )}

                  <div className="border-t border-white/10 my-1" />

                  {tab === "trash" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuKey(null);
                          handleSingleRestore(file);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-emerald-500/10 text-emerald-400 transition-colors text-left cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4 text-emerald-400" />
                        <span>Restore from trash</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuKey(null);
                          handleSinglePermanentDeleteClick(file);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 transition-colors text-left cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        <span>Delete forever</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuKey(null);
                        handleSingleTrashClick(file);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 transition-colors text-left cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      <span>Move to trash</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {activeFiles.length === 0 && (
          <div className="col-span-full break-inside-avoid w-full text-center py-20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
            {tab === "trash" ? (
               <Trash2 className="h-10 w-10 text-zinc-400 dark:text-zinc-600 mx-auto" />
            ) : tab === "browser_ram" ? (
               <Zap className="h-10 w-10 text-amber-500 mx-auto" />
            ) : (
               <FolderArchive className="h-10 w-10 text-zinc-400 dark:text-zinc-600 mx-auto" />
            )}
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 font-heading tracking-tight uppercase">
              {tab === "trash"
                ? "TRASH BIN EMPTY"
                : tab === "browser_ram"
                ? "NO IN-BROWSER MEDIA IN RAM"
                : "REPOSITORY EMPTY"}
            </p>
            <p className="text-[11px] text-zinc-500 font-mono max-w-sm mx-auto">
              {tab === "trash"
                ? "There are no discarded assets in the Recycle Bin."
                : tab === "browser_ram"
                ? "Media uploaded or cleaned in Metadata Cleaner with Zero-Disk or Browser-Only mode will appear here while held in browser memory."
                : "Generate images, videos, or cinema productions to store them in your vault."}
            </p>
          </div>
        )}
          </div>
        </div>
      )}

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

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Download Selected (Universal Bulk Download) */}
            <button
              type="button"
              onClick={handleBulkDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-heading font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98] whitespace-nowrap shrink-0"
              title="Download all selected files to your computer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD ({selectedKeys.size})</span>
            </button>

            {tab !== "trash" && (
              <button
                type="button"
                onClick={handleBulkFavorite}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-heading font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98] whitespace-nowrap shrink-0"
                title="Toggle Favorite for selected assets"
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>FAVORITE</span>
              </button>
            )}

            {tab === "trash" ? (
              <>
                <button
                  type="button"
                  onClick={handleBulkRestoreClick}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-teal-600 hover:bg-teal-500 text-white text-xs font-heading font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98] whitespace-nowrap shrink-0"
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

      {/* Interactive Universal Media Lightbox Modal */}
      {lightboxAsset && (() => {
        const fname = lightboxAsset.filename || "";
        const isLbImage = lightboxAsset.type === "images" || Boolean(fname.match(/\.(png|jpg|jpeg|webp|gif)$/i));
        const isLbVideo = lightboxAsset.type === "videos" || lightboxAsset.type === "final" || Boolean(fname.match(/\.(mp4|mov|webm)$/i));
        const isLbAudio = lightboxAsset.type === "audio" || Boolean(fname.match(/\.(mp3|wav|ogg|aac|m4a)$/i));

        return (
          <div
            className="fixed inset-0 z-[100000] flex flex-col bg-black/95 backdrop-blur-2xl animate-in fade-in duration-200"
            onClick={() => setLightboxAsset(null)}
          >
            {/* Lightbox Top Control Bar */}
            <div
              className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 bg-black/60 backdrop-blur-md z-10 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] tracking-wider uppercase font-semibold">
                  {isLbVideo ? "CINEMA VIDEO PLAYER" : isLbAudio ? "AUDIO PREVIEW" : "IMAGE FULL VIEW"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-mono font-medium text-white truncate max-w-md" title={lightboxAsset.filename}>
                    {lightboxAsset.filename}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                    <span>{formatBytes(lightboxAsset.size_bytes)}</span>
                    {imgNaturalSize && isLbImage && (
                      <>
                        <span>•</span>
                        <span>{imgNaturalSize.width} × {imgNaturalSize.height} px</span>
                      </>
                    )}
                    {lightboxFiles.length > 1 && currentLightboxIndex >= 0 && (
                      <>
                        <span>•</span>
                        <span className="text-zinc-300">
                          {currentLightboxIndex + 1} of {lightboxFiles.length}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Zoom Controls & Close Button */}
              <div className="flex items-center gap-2">
                {isLbImage && (
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
                )}

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
                if (e.target === e.currentTarget) {
                  setLightboxAsset(null);
                }
              }}
            >
              {/* Previous Media Arrow */}
              {lightboxFiles.length > 1 && currentLightboxIndex > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxAsset(lightboxFiles[currentLightboxIndex - 1]);
                    setLightboxZoom(1);
                    setImgNaturalSize(null);
                    setLightboxLoading(true);
                  }}
                  className="absolute left-6 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 transition-all hover:scale-105 cursor-pointer shadow-2xl"
                  title="Previous Media (Left Arrow)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Centered Professional Loading Animation when opening large media */}
              {lightboxLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none animate-in fade-in duration-200">
                  <div className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-2xl flex flex-col items-center gap-3">
                    <Spinner size="xl" variant="emerald" />
                    <p className="text-xs font-mono font-medium text-zinc-300 tracking-wider uppercase">
                      Opening High-Res Media...
                    </p>
                  </div>
                </div>
              )}

              {/* High-Resolution Zoomable Image Display */}
              {isLbImage && (
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
                      setLightboxLoading(false);
                    }}
                    onError={() => setLightboxLoading(false)}
                    className={cn(
                      "max-h-[75vh] max-w-[85vw] object-contain rounded-lg shadow-2xl select-none transition-all duration-500 ease-out",
                      lightboxLoading ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"
                    )}
                  />
                </div>
              )}

              {/* Cinema Video Player */}
              {isLbVideo && (
                <div
                  className="relative max-h-full max-w-full flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <video
                    src={getMediaUrl(lightboxAsset.url)}
                    controls
                    autoPlay
                    playsInline
                    loop
                    onLoadedData={() => setLightboxLoading(false)}
                    onCanPlay={() => setLightboxLoading(false)}
                    onError={() => setLightboxLoading(false)}
                    className={cn(
                      "max-h-[75vh] max-w-[85vw] object-contain rounded-2xl shadow-2xl border border-white/10 bg-black transition-all duration-500 ease-out",
                      lightboxLoading ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"
                    )}
                  />
                </div>
              )}

              {/* Audio Player Card */}
              {isLbAudio && (
                <div
                  className="relative max-h-full max-w-md w-full bg-zinc-900 border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-white shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-20 h-20 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shadow-lg">
                    <Mic className="w-10 h-10" />
                  </div>
                  <p className="text-sm font-mono font-bold truncate max-w-xs">{lightboxAsset.filename}</p>
                  <audio
                    src={getMediaUrl(lightboxAsset.url)}
                    controls
                    className="w-full"
                    autoPlay
                    onCanPlay={() => setLightboxLoading(false)}
                  />
                </div>
              )}

              {/* Next Media Arrow */}
              {lightboxFiles.length > 1 && currentLightboxIndex < lightboxFiles.length - 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxAsset(lightboxFiles[currentLightboxIndex + 1]);
                    setLightboxZoom(1);
                    setImgNaturalSize(null);
                    setLightboxLoading(true);
                  }}
                  className="absolute right-6 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 transition-all hover:scale-105 cursor-pointer shadow-2xl"
                  title="Next Media (Right Arrow)"
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
                  Navigation: <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">Left / Right Arrows</kbd> {isLbImage && <>• Zoom: <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">+/-</kbd></>}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isLbVideo && (
                  <button
                    type="button"
                    onClick={() => {
                      const asset = lightboxAsset;
                      setLightboxAsset(null);
                      setEditVideoAsset(asset);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-heading font-bold shadow-md transition-all cursor-pointer"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>LAUNCH IN VIDEO EDITOR</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => handleToggleFavorite(e, lightboxAsset.filename)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-mono transition-colors cursor-pointer",
                    favorites.has(lightboxAsset.filename)
                      ? "bg-amber-400 text-zinc-950 border-amber-400 font-bold"
                      : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-white/10"
                  )}
                >
                  <Star className={cn("w-3.5 h-3.5", favorites.has(lightboxAsset.filename) && "fill-current")} />
                  <span>{favorites.has(lightboxAsset.filename) ? "FAVORITED" : "FAVORITE"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShareModalAsset(lightboxAsset)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 text-xs font-mono transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>SHARE</span>
                </button>

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

                <button
                  type="button"
                  onClick={() => downloadAsset(lightboxAsset.url, lightboxAsset.filename)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black font-heading font-medium text-xs tracking-tight transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>DOWNLOAD</span>
                </button>

                {tab !== "trash" && lightboxAsset.prompt && (
                  <button
                    type="button"
                    onClick={() => {
                      const p = lightboxAsset.prompt!;
                      setLightboxAsset(null);
                      handleReusePrompt(p);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-mono transition-colors cursor-pointer"
                    title={lightboxAsset.prompt}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>REUSE PROMPT</span>
                  </button>
                )}

                {tab !== "trash" && isLbImage && (
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
                )}

                {tab !== "trash" && (
                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/studio?mode=image_to_video&image=${encodeURIComponent(lightboxAsset.url)}`);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 text-xs font-mono transition-colors cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>STUDIO</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
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
        );
      })()}

      {/* Share Modal */}
      <ShareModal
        isOpen={Boolean(shareModalAsset)}
        onClose={() => setShareModalAsset(null)}
        asset={shareModalAsset}
      />

      {/* Create Collection Modal */}
      <CreateCollectionModal
        isOpen={createCollectionOpen}
        onClose={() => setCreateCollectionOpen(false)}
        onCreated={(newCol) => {
          setCollections((prev) => [newCol, ...prev]);
        }}
      />

      {/* Video Editor Modal */}
      {editVideoAsset && (
        <VideoEditorModal
          isOpen={Boolean(editVideoAsset)}
          onClose={() => setEditVideoAsset(null)}
          videoUrl={editVideoAsset.url}
          filename={editVideoAsset.filename}
          onSaved={() => loadData()}
        />
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

      {/* Rename Asset Modal */}
      {renameModalAsset && (
        <div className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full rounded-2xl bg-white dark:bg-[#121218] border border-black/10 dark:border-white/10 p-6 shadow-2xl space-y-4 font-jakarta animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-violet-500" />
                <h3 className="text-base font-bold font-heading text-zinc-950 dark:text-white">Rename Asset</h3>
              </div>
              <button
                type="button"
                onClick={() => setRenameModalAsset(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Enter a new name for this asset. The file extension is preserved automatically.
            </p>

            <div>
              <input
                type="text"
                value={renameNewName}
                onChange={(e) => setRenameNewName(e.target.value)}
                placeholder="New filename..."
                className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/10 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-950 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setRenameModalAsset(null);
                }}
              />
              {renameError && (
                <p className="text-[11px] text-rose-500 mt-1 font-mono">{renameError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRenameModalAsset(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-mono font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRename}
                disabled={renaming || !renameNewName.trim()}
                className="px-4 py-2 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-mono font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {renaming && <Spinner size="xs" variant="current" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
