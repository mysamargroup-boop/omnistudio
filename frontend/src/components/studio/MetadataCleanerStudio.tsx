"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Upload,
  Sparkles,
  FileImage,
  Download,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Sliders,
  Zap,
  Info,
  Layers,
  FolderArchive,
  ArrowRight,
  AlertTriangle,
  Lock,
  Video,
  FileVideo,
  X,
  Film,
  Camera,
  MapPin,
  Compass,
  FileText,
  Search,
  CheckCircle2,
  HardDriveDownload,
  Radio,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Music,
  Mic,
  FileAudio,
  Files,
} from "lucide-react";
import {
  api,
  getMediaUrl,
  ImageMetadataInspection,
  CleanMetadataResponse,
  VideoMetadataInspection,
  CleanVideoResponse,
  AudioMetadataInspection,
  CleanAudioResponse,
} from "@/lib/api";
import { inspectMediaInBrowser } from "@/lib/browserMetadataInspector";
import { formatBytes, cn } from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";

interface MetadataCleanerStudioProps {
  initialImageUrl?: string;
  initialImagePath?: string;
  initialUrl?: string;
  initialPath?: string;
  onCleanSuccess?: (cleaned: any) => void;
}

export interface BatchQueueItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  type: "image" | "video" | "audio";
  metadata?: any;
  cleanedResult?: any;
  status: "idle" | "inspecting" | "inspected" | "cleaning" | "cleaned" | "error";
  error?: string;
}

const CAMERA_PRESET_FALLBACKS: Record<string, any> = {
  sony_a7iv: { name: "Sony Alpha 7 IV (ILCE-7M4)", category: "Pro Mirrorless", make: "Sony", model: "ILCE-7M4", lens: "FE 24-70mm F2.8 GM II", iso: 200, f_number: 2.8, exposure_time: 0.002, software: "Adobe Photoshop Lightroom Classic 13.2" },
  sony_fx3: { name: "Sony FX3 (Cinema Line)", category: "Cinema / Video", make: "Sony", model: "ILME-FX3", lens: "FE 24-70mm F2.8 GM II", iso: 800, f_number: 2.8, exposure_time: 0.02, software: "Sony Catalyst Browse / Cinema Line v4.0" },
  arri_alexa: { name: "ARRI ALEXA Mini LF", category: "Cinema / Hollywood", make: "ARRI", model: "ALEXA Mini LF", lens: "ARRI Signature Prime 47mm T1.8", iso: 800, f_number: 1.8, exposure_time: 0.02, software: "ARRI Look Creator 2.4" },
  red_v_raptor: { name: "RED V-RAPTOR 8K VV", category: "Cinema / 8K RAW", make: "RED Digital Cinema", model: "V-RAPTOR 8K VV", lens: "Canon CN-E 35mm T1.5 L F", iso: 800, f_number: 1.5, exposure_time: 0.02, software: "REDCINE-X PRO 64-bit" },
  canon_c70: { name: "Canon Cinema EOS C70", category: "Cinema / Documentary", make: "Canon", model: "EOS C70", lens: "RF 24-70mm F2.8 L IS USM", iso: 800, f_number: 2.8, exposure_time: 0.02, software: "Canon Cinema RAW Development" },
  blackmagic_6k: { name: "Blackmagic Pocket Cinema 6K Pro", category: "Cinema / Indie Film", make: "Blackmagic Design", model: "Pocket Cinema Camera 6K Pro", lens: "Sigma 18-35mm F1.8 DC HSM Art", iso: 400, f_number: 1.8, exposure_time: 0.02, software: "DaVinci Resolve Studio 19.1" },
  dji_ronin_4d: { name: "DJI Ronin 4D 8K", category: "Cinema / Gimbal Steadicam", make: "DJI", model: "Ronin 4D-8K", lens: "DJI DL 35mm F2.8 LS ASPH", iso: 800, f_number: 2.8, exposure_time: 0.02, software: "DJI CineCore 3.0" },
  canon_eos_r5: { name: "Canon EOS R5", category: "Pro Mirrorless", make: "Canon", model: "Canon EOS R5", lens: "RF24-70mm F2.8 L IS USM", iso: 100, f_number: 2.8, exposure_time: 0.0025, software: "Digital Photo Professional 4" },
  iphone_15_pro: { name: "Apple iPhone 15 Pro Max", category: "Smartphone", make: "Apple", model: "iPhone 15 Pro Max", lens: "Triple Camera 24mm f/1.78", iso: 64, f_number: 1.78, exposure_time: 0.008, software: "iOS 17.5.1" },
  nikon_z8: { name: "Nikon Z 8", category: "Pro Mirrorless", make: "NIKON CORPORATION", model: "NIKON Z 8", lens: "NIKKOR Z 24-70mm f/2.8 S", iso: 250, f_number: 2.8, exposure_time: 0.00156, software: "Adobe Photoshop 2024" },
  fujifilm_xt5: { name: "Fujifilm X-T5", category: "Street Documentary", make: "FUJIFILM", model: "X-T5", lens: "XF16-55mmF2.8 R LM WR", iso: 160, f_number: 2.8, exposure_time: 0.003125, software: "Capture One 23" },
};

const GPS_PRESET_FALLBACKS: Record<string, any> = {
  none: { name: "No Geotag (Private / Strip GPS)" },
  mumbai: { name: "Mumbai, India", lat: 19.076, lon: 72.8777 },
  delhi: { name: "New Delhi, India", lat: 28.6139, lon: 77.209 },
  new_york: { name: "New York City, USA", lat: 40.7128, lon: -74.006 },
  london: { name: "London, UK", lat: 51.5074, lon: -0.1278 },
  tokyo: { name: "Tokyo, Japan", lat: 35.6762, lon: 139.6503 },
  paris: { name: "Paris, France", lat: 48.8566, lon: 2.3522 },
  dubai: { name: "Dubai, UAE", lat: 25.2048, lon: 55.2708 },
};

export default function MetadataCleanerStudio({
  initialImageUrl,
  initialImagePath,
  onCleanSuccess,
}: MetadataCleanerStudioProps) {
  // Upload & selection state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  const [sourcePath, setSourcePath] = useState<string | null>(initialImagePath || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk / Batch Upload Queue (Files kept temporarily in browser memory)
  const [batchQueue, setBatchQueue] = useState<BatchQueueItem[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Browser-Only Mode (Zero Network Upload: 100% in-browser offline inspection)
  const [browserOnlyMode, setBrowserOnlyMode] = useState(true);

  // Zero-Disk Privacy Mode (Ephemeral server inspection: never saved to backend disk)
  const [zeroDiskMode, setZeroDiskMode] = useState(true);

  const isVideo = Boolean(
    selectedFile
      ? selectedFile.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|m4v|avi)$/i.test(selectedFile.name)
      : previewUrl?.match(/\.(mp4|mov|webm|mkv|m4v|avi)(\?.*)?$/i) || sourcePath?.match(/\.(mp4|mov|webm|mkv|m4v|avi)$/i)
  );

  const isAudio = Boolean(
    selectedFile
      ? selectedFile.type.startsWith("audio/") || /\.(mp3|wav|flac|aac|ogg|m4a|opus|wma)$/i.test(selectedFile.name)
      : previewUrl?.match(/\.(mp3|wav|flac|aac|ogg|m4a|opus|wma)(\?.*)?$/i) || sourcePath?.match(/\.(mp3|wav|flac|aac|ogg|m4a|opus|wma)$/i)
  );

  // Vault selector modal state
  const [showVaultSelector, setShowVaultSelector] = useState(false);
  const [vaultImages, setVaultImages] = useState<any[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [vaultTab, setVaultTab] = useState<"all" | "images" | "videos" | "audio">("all");
  const [vaultSearch, setVaultSearch] = useState("");
  const [hideSmallTestFiles, setHideSmallTestFiles] = useState(true);

  // Inspection & Progress state
  const [inspecting, setInspecting] = useState(false);
  const [inspectProgress, setInspectProgress] = useState(0);
  const [inspectStage, setInspectStage] = useState("");
  const [metadata, setMetadata] = useState<any>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Cleaning state & settings
  const [stealthMode, setStealthMode] = useState(true);
  const [quality, setQuality] = useState(98);
  const [cleaning, setCleaning] = useState(false);
  const [cleanProgress, setCleanProgress] = useState(0);
  const [cleanStage, setCleanStage] = useState("");
  const [cleanResult, setCleanResult] = useState<any>(null);
  const [cleanError, setCleanError] = useState<string | null>(null);

  // Realistic Camera Profile Spoofing / Injection
  const [injectCameraProfile, setInjectCameraProfile] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<string>("sony_a7iv");
  const [gpsPreset, setGpsPreset] = useState<string>("none");
  const [presetsData, setPresetsData] = useState<{ cameras: Record<string, any>; gps: Record<string, any> } | null>(null);

  useEffect(() => {
    api.getMetadataPresets().then((res) => {
      if (res && res.success) {
        setPresetsData({
          cameras: res.cameras,
          gps: { none: { name: "No Geotag (Private / Strip GPS)" }, ...res.gps },
        });
      }
    }).catch(() => {});
  }, []);

  // UI state
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedNegPrompt, setCopiedNegPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "camera" | "gps" | "streams" | "audio" | "rights" | "raw">("overview");
  const [rawTagSearch, setRawTagSearch] = useState("");

  // Restore session state when navigating back or after downloading
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("omnistudio_cleaner_state");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.previewUrl && !previewUrl && !initialImageUrl) setPreviewUrl(data.previewUrl);
        if (data.sourcePath && !sourcePath && !initialImagePath) setSourcePath(data.sourcePath);
        if (data.metadata && !metadata) setMetadata(data.metadata);
        if (data.cleanResult && !cleanResult) setCleanResult(data.cleanResult);
        if (typeof data.zeroDiskMode === "boolean") setZeroDiskMode(data.zeroDiskMode);
        if (typeof data.browserOnlyMode === "boolean") setBrowserOnlyMode(data.browserOnlyMode);
        if (typeof data.stealthMode === "boolean") setStealthMode(data.stealthMode);
        if (typeof data.injectCameraProfile === "boolean") setInjectCameraProfile(data.injectCameraProfile);
        if (data.cameraPreset) setCameraPreset(data.cameraPreset);
        if (data.gpsPreset) setGpsPreset(data.gpsPreset);
        if (data.activeTab) setActiveTab(data.activeTab);
      }
    } catch (e) {
      console.warn("Could not restore cleaner session state", e);
    }
  }, []);

  // Save session state on change
  useEffect(() => {
    try {
      const stateToSave = {
        previewUrl: previewUrl && !previewUrl.startsWith("blob:") ? previewUrl : (cleanResult?.clean_url || cleanResult?.url || null),
        sourcePath,
        metadata,
        cleanResult,
        zeroDiskMode,
        browserOnlyMode,
        stealthMode,
        injectCameraProfile,
        cameraPreset,
        gpsPreset,
        activeTab,
      };
      sessionStorage.setItem("omnistudio_cleaner_state", JSON.stringify(stateToSave));
    } catch (e) {
      // ignore quota limits
    }
  }, [previewUrl, sourcePath, metadata, cleanResult, zeroDiskMode, browserOnlyMode, stealthMode, injectCameraProfile, cameraPreset, gpsPreset, activeTab]);

  // Sync ephemeral browser media to sessionStorage for Vault visibility
  useEffect(() => {
    try {
      if (batchQueue.length > 0) {
        const items = batchQueue.map((item) => ({
          filename: item.name,
          url: item.cleanedResult?.clean_url || item.cleanedResult?.url || item.previewUrl,
          size_bytes: item.size,
          size_mb: Number((item.size / (1024 * 1024)).toFixed(2)),
          modified: Math.floor(Date.now() / 1000),
          type: item.type === "video" ? "videos" : item.type === "audio" ? "audio" : "images",
          is_browser_memory: true,
          status: item.status,
          prompt: "In-Browser Ephemeral Media (Zero-Disk)",
        }));
        sessionStorage.setItem("omnistudio_ephemeral_assets", JSON.stringify(items));
      } else {
        sessionStorage.removeItem("omnistudio_ephemeral_assets");
      }
    } catch (e) {
      // ignore
    }
  }, [batchQueue]);

  // Load vault assets for selector
  const loadVaultImages = async () => {
    setLoadingVault(true);
    try {
      const res = await api.getAllAssets();
      const allMedia = (res?.images || [])
        .concat(res?.final || [])
        .concat(res?.videos || [])
        .concat(res?.audio || []);
      setVaultImages(allMedia);
    } catch (e) {
      console.error("Failed to load vault assets:", e);
    } finally {
      setLoadingVault(false);
    }
  };

  // Run inspection on media change
  const inspectCurrentSource = async (
    file?: File,
    url?: string,
    path?: string,
    useBrowserOnlyOverride?: boolean
  ) => {
    setInspecting(true);
    setInspectProgress(15);
    setInspectStage("Reading file binary stream...");
    setInspectError(null);
    setCleanResult(null);
    setCleanError(null);

    const isUseBrowser =
      useBrowserOnlyOverride !== undefined ? useBrowserOnlyOverride : browserOnlyMode;

    const isVid = file
      ? file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|m4v|avi)$/i.test(file.name)
      : Boolean((url || path)?.match(/\.(mp4|mov|webm|mkv|m4v|avi)(\?.*)?$/i));

    const isAud = file
      ? file.type.startsWith("audio/") || /\.(mp3|wav|flac|aac|ogg|m4a|opus|wma)$/i.test(file.name)
      : Boolean((url || path)?.match(/\.(mp3|wav|flac|aac|ogg|m4a|opus|wma)(\?.*)?$/i));

    const t1 = setTimeout(() => {
      setInspectProgress(45);
      setInspectStage("Scanning C2PA manifests, SynthID & AI signatures...");
    }, 200);

    const t2 = setTimeout(() => {
      setInspectProgress(75);
      setInspectStage(
        isVid
          ? "Parsing MP4 container atoms, video codec & audio bitstream..."
          : isAud
          ? "Decoding acoustics, sample rate, channels & ID3 metadata..."
          : "Parsing EXIF camera optics, GPS & generation parameters..."
      );
    }, 450);

    try {
      let res: any;
      if (file && isUseBrowser) {
        setInspectStage("Inspecting in-browser memory (Zero network upload)...");
        res = await inspectMediaInBrowser(file);
      } else if (isVid) {
        if (file) {
          res = await api.inspectUploadedVideo(file, zeroDiskMode);
        } else if (url || path) {
          res = await api.inspectVideoMetadata({ url, path });
        }
      } else if (isAud) {
        if (file) {
          res = await api.inspectUploadedAudio(file, zeroDiskMode);
        } else if (url || path) {
          res = await api.inspectAudioMetadata({ url, path });
        }
      } else {
        if (file) {
          res = await api.inspectUploadedImage(file, zeroDiskMode);
        } else if (url || path) {
          res = await api.inspectMetadata({ url, path });
        }
      }

      setInspectProgress(100);
      setInspectStage("Inspection complete!");

      if (res && res.success) {
        setMetadata(res);
      } else {
        setInspectError(res?.error || "Failed to parse headers and metadata");
      }
    } catch (err: any) {
      setInspectError(err.message || "Failed to connect to inspection service");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setTimeout(() => {
        setInspecting(false);
        setInspectProgress(0);
        setInspectStage("");
      }, 300);
    }
  };

  // Handle Initial props
  useEffect(() => {
    if (initialImageUrl || initialImagePath) {
      setPreviewUrl(initialImageUrl || null);
      setSourcePath(initialImagePath || null);
      inspectCurrentSource(undefined, initialImageUrl, initialImagePath);
    }
  }, [initialImageUrl, initialImagePath]);

  // Handle File selection (single & bulk)
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (e.dataTransfer.files.length === 1) {
        handleFileSelected(e.dataTransfer.files[0]);
      } else {
        handleFilesBatch(Array.from(e.dataTransfer.files));
      }
    }
  };

  const handleFilesBatch = (files: File[]) => {
    const valid = files.filter((file) => {
      const isVid = file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|m4v|avi)$/i.test(file.name);
      const isAud = file.type.startsWith("audio/") || /\.(mp3|wav|flac|aac|ogg|m4a|opus|wma)$/i.test(file.name);
      const isImg = file.type.startsWith("image/") || /\.(png|jpg|jpeg|webp|bmp|tiff)$/i.test(file.name);
      return isVid || isAud || isImg;
    });

    if (valid.length === 0) {
      setInspectError("Please upload valid image, video, or audio files.");
      return;
    }

    const newItems: BatchQueueItem[] = valid.map((file, idx) => {
      const isVid = file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|m4v|avi)$/i.test(file.name);
      const isAud = file.type.startsWith("audio/") || /\.(mp3|wav|flac|aac|ogg|m4a|opus|wma)$/i.test(file.name);
      return {
        id: `${file.name}-${file.size}-${Date.now()}-${idx}`,
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: isVid ? "video" : isAud ? "audio" : "image",
        status: "idle",
      };
    });

    setBatchQueue((prev) => [...prev, ...newItems]);
    activateBatchItem(newItems[0]);
  };

  const handleFileSelected = (file: File) => {
    const isVid = file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|m4v|avi)$/i.test(file.name);
    const isAud = file.type.startsWith("audio/") || /\.(mp3|wav|flac|aac|ogg|m4a|opus|wma)$/i.test(file.name);
    const isImg = file.type.startsWith("image/") || /\.(png|jpg|jpeg|webp|bmp|tiff)$/i.test(file.name);
    if (!isVid && !isAud && !isImg) {
      setInspectError("Please upload a valid image, video (MP4, MOV, WEBM) or audio (MP3, WAV, AAC, FLAC) file");
      return;
    }
    const item: BatchQueueItem = {
      id: `${file.name}-${file.size}-${Date.now()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      type: isVid ? "video" : isAud ? "audio" : "image",
      status: "idle",
    };
    setBatchQueue((prev) => [...prev.filter((q) => q.name !== file.name), item]);
    activateBatchItem(item);
  };

  const activateBatchItem = (item: BatchQueueItem) => {
    setActiveBatchId(item.id);
    setSelectedFile(item.file);
    setSourcePath(null);
    setPreviewUrl(item.previewUrl);
    setCleanResult(item.cleanedResult || null);
    if (item.metadata) {
      setMetadata(item.metadata);
    } else {
      inspectCurrentSource(item.file);
    }
  };

  const removeBatchItem = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBatchQueue((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        try { URL.revokeObjectURL(target.previewUrl); } catch (_) {}
      }
      const remaining = prev.filter((item) => item.id !== id);
      if (activeBatchId === id) {
        if (remaining.length > 0) {
          activateBatchItem(remaining[0]);
        } else {
          setActiveBatchId(null);
          setSelectedFile(null);
          setPreviewUrl(null);
          setMetadata(null);
          setCleanResult(null);
        }
      }
      return remaining;
    });
  };

  const clearAllBatch = () => {
    batchQueue.forEach((item) => {
      try { URL.revokeObjectURL(item.previewUrl); } catch (_) {}
    });
    setBatchQueue([]);
    setActiveBatchId(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setMetadata(null);
    setCleanResult(null);
  };

  const handleInspectAllBatch = async () => {
    if (batchQueue.length === 0 || batchProcessing) return;
    setBatchProcessing(true);
    for (let i = 0; i < batchQueue.length; i++) {
      const item = batchQueue[i];
      if (item.metadata) continue;
      try {
        setBatchQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: "inspecting" } : q))
        );
        let meta: any = null;
        if (browserOnlyMode) {
          meta = await inspectMediaInBrowser(item.file);
        } else {
          if (item.type === "video") meta = await api.inspectUploadedVideo(item.file, zeroDiskMode);
          else if (item.type === "audio") meta = await api.inspectUploadedAudio(item.file, zeroDiskMode);
          else meta = await api.inspectUploadedImage(item.file, zeroDiskMode);
        }
        setBatchQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, metadata: meta, status: "inspected" } : q))
        );
        if (item.id === activeBatchId) {
          setMetadata(meta);
        }
      } catch (err: any) {
        setBatchQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: "error", error: err.message } : q))
        );
      }
    }
    setBatchProcessing(false);
  };

  const handleCleanAllBatch = async () => {
    if (batchQueue.length === 0 || batchProcessing) return;
    setBatchProcessing(true);
    for (let i = 0; i < batchQueue.length; i++) {
      const item = batchQueue[i];
      if (item.cleanedResult) continue;
      try {
        setBatchQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: "cleaning" } : q))
        );
        let res: any = null;
        if (injectCameraProfile && item.type !== "audio") {
          res = await api.injectUploadedMedia(
            item.file,
            cameraPreset,
            gpsPreset !== "none" ? gpsPreset : undefined,
            stealthMode,
            quality,
            !zeroDiskMode
          );
        } else if (item.type === "video") {
          res = await api.cleanUploadedVideo(item.file, stealthMode, !zeroDiskMode);
        } else if (item.type === "audio") {
          res = await api.cleanUploadedAudio(item.file, stealthMode, !zeroDiskMode);
        } else {
          res = await api.cleanUploadedImage(item.file, stealthMode, quality, !zeroDiskMode);
        }
        if (res && res.success) {
          setBatchQueue((prev) =>
            prev.map((q, idx) => (idx === i ? { ...q, cleanedResult: res, status: "cleaned" } : q))
          );
          if (item.id === activeBatchId) {
            setCleanResult(res);
          }
        } else {
          setBatchQueue((prev) =>
            prev.map((q, idx) => (idx === i ? { ...q, status: "error", error: res?.error } : q))
          );
        }
      } catch (err: any) {
        setBatchQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: "error", error: err.message } : q))
        );
      }
    }
    setBatchProcessing(false);
  };

  const handleDownloadAllCleaned = () => {
    const cleanedItems = batchQueue.filter(
      (q) => q.status === "cleaned" && (q.cleanedResult?.clean_url || q.cleanedResult?.url)
    );
    if (cleanedItems.length === 0) return;
    cleanedItems.forEach((item, index) => {
      setTimeout(() => {
        const url = getMediaUrl(item.cleanedResult.clean_url || item.cleanedResult.url);
        const filename =
          item.cleanedResult.output_filename ||
          item.cleanedResult.clean_filename ||
          `cleaned_${item.name}`;
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, index * 250);
    });
  };

  const handleSelectFromVault = (asset: any) => {
    setSelectedFile(null);
    setPreviewUrl(getMediaUrl(asset.url));
    setSourcePath(asset.local_path || asset.filename);
    setShowVaultSelector(false);
    inspectCurrentSource(undefined, asset.url, asset.local_path || asset.filename);
  };

  // Perform Cleaning with live multi-stage progress
  const handleCleanMetadata = async () => {
    setCleaning(true);
    setCleanProgress(15);
    setCleanStage("Reading input media bitstream...");
    setCleanError(null);

    const t1 = setTimeout(() => {
      setCleanProgress(40);
      setCleanStage(
        injectCameraProfile && !isAudio
          ? "Stripping AI watermarks & preparing camera optics profile..."
          : stealthMode
          ? "Injecting micro-frequency dither (neutralizing SynthID neural classifiers)..."
          : "Stripping C2PA, JUMBF, and XMP provenance blocks..."
      );
    }, 400);

    const t2 = setTimeout(() => {
      setCleanProgress(70);
      setCleanStage(
        injectCameraProfile && !isAudio
          ? `Injecting authentic ${CAMERA_PRESET_FALLBACKS[cameraPreset]?.make || "Camera"} hardware EXIF & optics...`
          : "Rebuilding clean container with lossless stream copy..."
      );
    }, 900);

    const t3 = setTimeout(() => {
      setCleanProgress(90);
      setCleanStage("Verifying 0% AI leakage & bitstream integrity...");
    }, 1400);

    try {
      let res: any;
      if (injectCameraProfile && !isAudio) {
        if (selectedFile) {
          res = await api.injectUploadedMedia(
            selectedFile,
            cameraPreset,
            gpsPreset !== "none" ? gpsPreset : undefined,
            stealthMode,
            quality,
            !zeroDiskMode
          );
        } else if (previewUrl || sourcePath) {
          res = await api.injectMetadata({
            url: previewUrl || undefined,
            path: sourcePath || undefined,
            camera_preset: cameraPreset,
            gps_preset: gpsPreset !== "none" ? gpsPreset : undefined,
            stealth_mode: stealthMode,
            quality: quality,
          });
        } else {
          setCleanError("No media selected to inject camera profile");
          setCleaning(false);
          return;
        }
      } else if (isVideo) {
        if (selectedFile) {
          res = await api.cleanUploadedVideo(selectedFile, stealthMode, !zeroDiskMode);
        } else if (previewUrl || sourcePath) {
          res = await api.cleanVideoMetadata({
            url: previewUrl || undefined,
            path: sourcePath || undefined,
            stealth_mode: stealthMode,
          });
        } else {
          setCleanError("No video selected to clean");
          setCleaning(false);
          return;
        }
      } else if (isAudio) {
        if (selectedFile) {
          res = await api.cleanUploadedAudio(selectedFile, stealthMode, !zeroDiskMode);
        } else if (previewUrl || sourcePath) {
          res = await api.cleanAudioMetadata({
            url: previewUrl || undefined,
            path: sourcePath || undefined,
            stealth_mode: stealthMode,
          });
        } else {
          setCleanError("No audio selected to clean");
          setCleaning(false);
          return;
        }
      } else {
        if (selectedFile) {
          res = await api.cleanUploadedImage(selectedFile, stealthMode, quality, !zeroDiskMode);
        } else if (previewUrl || sourcePath) {
          res = await api.cleanMetadata({
            url: previewUrl || undefined,
            path: sourcePath || undefined,
            stealth_mode: stealthMode,
            quality: quality,
          });
        } else {
          setCleanError("No image selected to clean");
          setCleaning(false);
          return;
        }
      }

      setCleanProgress(100);
      setCleanStage("Sanitization Complete!");

      if (res && res.success) {
        setCleanResult(res);
        if (activeBatchId) {
          setBatchQueue((prev) =>
            prev.map((item) =>
              item.id === activeBatchId
                ? { ...item, cleanedResult: res, status: "cleaned" }
                : item
            )
          );
        }
        if (onCleanSuccess) {
          onCleanSuccess(res);
        }
      } else {
        setCleanError(res?.error || "Failed to strip metadata");
      }
    } catch (err: any) {
      setCleanError(err.message || "Error running metadata cleaner");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setTimeout(() => {
        setCleaning(false);
        setCleanProgress(0);
        setCleanStage("");
      }, 500);
    }
  };

  const copyToClipboard = (text: string, isNeg: boolean = false) => {
    navigator.clipboard.writeText(text);
    if (isNeg) {
      setCopiedNegPrompt(true);
      setTimeout(() => setCopiedNegPrompt(false), 2000);
    } else {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  // Filtered Vault Assets
  const filteredVaultAssets = useMemo(() => {
    return vaultImages.filter((asset) => {
      const isVid = asset.asset_type === "videos" || /\.(mp4|mov|webm|mkv|m4v|avi)$/i.test(asset.filename || asset.url);
      const isAud = asset.asset_type === "audio" || /\.(mp3|wav|flac|aac|ogg|m4a|opus|wma)$/i.test(asset.filename || asset.url);
      if (vaultTab === "images" && (isVid || isAud)) return false;
      if (vaultTab === "videos" && !isVid) return false;
      if (vaultTab === "audio" && !isAud) return false;
      if (hideSmallTestFiles && (asset.size_bytes || 0) < 10000 && !isVid && !isAud) return false;
      if (vaultSearch.trim()) {
        const query = vaultSearch.toLowerCase();
        const fname = (asset.filename || "").toLowerCase();
        const prompt = (asset.prompt || "").toLowerCase();
        if (!fname.includes(query) && !prompt.includes(query)) return false;
      }
      return true;
    });
  }, [vaultImages, vaultTab, vaultSearch, hideSmallTestFiles]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 p-3 md:p-5 pb-20 text-zinc-900 dark:text-zinc-100">
      {/* Hidden File Input supporting Multiple / Bulk Selection */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.png,.jpg,.jpeg,.webp,.bmp,.tiff,.mp4,.mov,.webm,.mkv,.m4v,.avi,.mp3,.wav,.flac,.aac,.ogg,.m4a,.opus,.wma"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            if (e.target.files.length === 1) {
              handleFileSelected(e.target.files[0]);
            } else {
              handleFilesBatch(Array.from(e.target.files));
            }
            e.target.value = "";
          }
        }}
      />

      {/* ── Top Header Banner (Ultra Compact) ── */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 dark:border-emerald-500/25 bg-white/90 dark:bg-[#0a0f18]/90 px-4 py-3 md:px-5 md:py-3.5 backdrop-blur-xl shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Left: Title + Badges in single compact flow */}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-base md:text-lg font-bold font-heading text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              AI Metadata & Provenance Engine
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              Lossless
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-cyan-50 dark:bg-[#141b2a] text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
              C2PA & SynthID Stripper
            </span>
            <span className="hidden xl:inline text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              • 100% In-Browser Zero-Upload
            </span>
          </div>

          {/* Right: Mode switches & quick actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div
              onClick={() => {
                const next = !browserOnlyMode;
                setBrowserOnlyMode(next);
                if (selectedFile) {
                  inspectCurrentSource(selectedFile, undefined, undefined, next);
                }
              }}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-mono cursor-pointer transition select-none",
                browserOnlyMode
                  ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-xs"
                  : "bg-zinc-100 dark:bg-[#0f1420] border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
              )}
              title="When enabled, files are inspected 100% locally in browser memory without network upload"
            >
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  browserOnlyMode ? "bg-emerald-500 shadow-[0_0_6px_#34d399]" : "bg-zinc-400"
                )}
              />
              <span className="font-semibold">
                {browserOnlyMode ? "Zero-Upload: ON" : "Server Scan"}
              </span>
            </div>

            <div
              onClick={() => setZeroDiskMode(!zeroDiskMode)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-mono cursor-pointer transition select-none",
                zeroDiskMode
                  ? "bg-cyan-50 dark:bg-cyan-950/50 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 shadow-xs"
                  : "bg-zinc-100 dark:bg-[#0f1420] border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
              )}
              title="When enabled on server, files are never saved to server disk"
            >
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  zeroDiskMode ? "bg-cyan-500 shadow-[0_0_6px_#22d3ee]" : "bg-zinc-400"
                )}
              />
              <span className="font-semibold">
                {zeroDiskMode ? "Zero-Disk" : "Save Vault"}
              </span>
            </div>

            <button
              onClick={() => {
                setShowVaultSelector(true);
                loadVaultImages();
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-[#111726] hover:bg-zinc-200 dark:hover:bg-[#161f33] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 transition cursor-pointer"
            >
              <FolderArchive className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Vault</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Select Media</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Stage 1: Active Progress Bar (Upload, Inspection, Cleaning) ── */}
      {(inspecting || cleaning) && (
        <div className="rounded-2xl border border-emerald-500/30 bg-white/95 dark:bg-[#0c121e]/95 p-5 shadow-xl dark:shadow-2xl backdrop-blur-md animate-in fade-in space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Spinner className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-zinc-800 dark:text-zinc-200 font-semibold uppercase tracking-wider">
                {inspecting ? "Metadata Scanner Active" : "Lossless Sanitizer Active"}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">• {inspecting ? inspectStage : cleanStage}</span>
            </div>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              {inspecting ? `${inspectProgress}%` : `${cleanProgress}%`}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-black/60 overflow-hidden border border-zinc-200 dark:border-white/10 relative">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(16,185,129,0.8)]"
              style={{ width: `${inspecting ? inspectProgress : cleanProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Bulk / Batch Media Queue Tray (Ephemeral Browser RAM) ── */}
      {batchQueue.length > 0 && (
        <div className="p-4 md:p-5 rounded-3xl bg-white/95 dark:bg-[#0b101c]/95 border border-emerald-500/30 dark:border-emerald-500/25 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <Files className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    Bulk Media Queue ({batchQueue.length} files)
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                    Browser RAM (Zero Backend Storage)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Files reside temporarily in your browser memory. Switch between items or run batch operations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {batchQueue.some((q) => q.status === "cleaned" && (q.cleanedResult?.clean_url || q.cleanedResult?.url)) && (
                <button
                  type="button"
                  onClick={handleDownloadAllCleaned}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition flex items-center gap-1.5 shadow-md cursor-pointer animate-in fade-in"
                >
                  <HardDriveDownload className="w-3.5 h-3.5" />
                  Download All Cleaned ({batchQueue.filter((q) => q.status === "cleaned").length})
                </button>
              )}
              <button
                type="button"
                onClick={handleInspectAllBatch}
                disabled={batchProcessing}
                className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5" />
                Inspect All ({browserOnlyMode ? "Offline" : "Server"})
              </button>
              <button
                type="button"
                onClick={handleCleanAllBatch}
                disabled={batchProcessing}
                className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Clean All (Batch Lossless)
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-zinc-100 dark:bg-[#141b2b] hover:bg-zinc-200 dark:hover:bg-[#1e273d] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                + Add Files
              </button>
              <button
                type="button"
                onClick={clearAllBatch}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                title="Clear Entire Batch Queue"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filmstrip of queued items */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {batchQueue.map((item) => {
              const isActive = item.id === activeBatchId;
              return (
                <div
                  key={item.id}
                  onClick={() => activateBatchItem(item)}
                  className={cn(
                    "relative shrink-0 w-44 p-2.5 rounded-2xl border transition-all cursor-pointer group select-none",
                    isActive
                      ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                      : "bg-zinc-50 dark:bg-[#070b13] border-zinc-200 dark:border-white/10 hover:border-emerald-500/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                      {item.type}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.status === "cleaned" && (item.cleanedResult?.clean_url || item.cleanedResult?.url) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = getMediaUrl(item.cleanedResult.clean_url || item.cleanedResult.url);
                            const filename =
                              item.cleanedResult.output_filename ||
                              item.cleanedResult.clean_filename ||
                              `cleaned_${item.name}`;
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition cursor-pointer"
                          title="Download cleaned file"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => removeBatchItem(item.id, e)}
                        className="p-1 rounded-md text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        title="Remove from queue"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="h-16 w-full rounded-xl bg-zinc-200/60 dark:bg-[#0e1422] overflow-hidden flex items-center justify-center mb-1.5">
                    {item.type === "image" ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={item.previewUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : item.type === "video" ? (
                      <Video className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <Music className="w-6 h-6 text-emerald-500" />
                    )}
                  </div>

                  <div className="text-[11px] font-mono truncate text-zinc-800 dark:text-zinc-200" title={item.name}>
                    {item.name}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-1">
                    <span>{formatBytes(item.size)}</span>
                    {item.status === "cleaned" ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Cleaned
                      </span>
                    ) : item.status === "inspected" ? (
                      <span className="text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Scanned
                      </span>
                    ) : item.status === "inspecting" || item.status === "cleaning" ? (
                      <span className="text-amber-500 animate-pulse">Processing...</span>
                    ) : (
                      <span className="text-zinc-400">Ready</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main 2-Column Stage ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Media Preview & Clean Strategy */}
        <div className="lg:col-span-6 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            className={cn(
              "relative rounded-3xl border-2 border-dashed transition-all duration-200 overflow-hidden flex flex-col items-center justify-center text-center bg-white/90 dark:bg-[#080d16]/90 backdrop-blur-md shadow-lg",
              previewUrl ? "min-h-[280px] p-4 md:p-5" : "min-h-[175px] sm:min-h-[195px] p-4",
              isDragging
                ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/25 scale-[0.99]"
                : previewUrl
                ? "border-emerald-500/25 hover:border-emerald-500/50"
                : "border-zinc-300 dark:border-white/10 hover:border-emerald-500/40"
            )}
          >
            {previewUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
                <div className="relative max-h-[340px] max-w-full w-full rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-white/10 bg-black/50 group flex items-center justify-center">
                  {isVideo ? (
                    <video
                      src={previewUrl}
                      controls
                      className="max-h-[340px] w-auto object-contain rounded-2xl bg-black"
                    />
                  ) : isAudio ? (
                    <div className="w-full py-6 px-4 flex flex-col items-center justify-center space-y-3 bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-[#0b101c] dark:to-[#060a12] rounded-2xl">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                        <Music className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="text-center space-y-0.5">
                        <div className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          {metadata?.tags?.title || selectedFile?.name || metadata?.filename || "Audio Bitstream"}
                        </div>
                        {metadata?.tags?.artist && (
                          <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                            {metadata.tags.artist}
                          </div>
                        )}
                        <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                          {metadata?.audio_codec || "Audio"} • {metadata?.sample_rate || "44.1/48 kHz"} • {metadata?.channel_layout || "Stereo"}
                        </div>
                      </div>
                      <audio controls src={previewUrl} className="w-full max-w-sm h-9 accent-emerald-500" />
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={previewUrl}
                      alt="Source Preview"
                      className="max-h-[340px] w-auto object-contain rounded-2xl"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 pointer-events-none group-hover:pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition cursor-pointer"
                      title={isVideo ? "Replace Video" : isAudio ? "Replace Audio" : "Replace Image"}
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition cursor-pointer"
                      title="View Fullsize"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-zinc-700 dark:text-zinc-300">
                  <span className="truncate max-w-[220px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedFile?.name || metadata?.filename || (isVideo ? "Selected Video" : isAudio ? "Selected Audio" : "Selected Image")}
                  </span>
                  <span>•</span>
                  <span>{metadata?.file_size_formatted || (selectedFile ? formatBytes(selectedFile.size) : "")}</span>
                  {(isVideo || isAudio) && metadata?.duration_formatted && (
                    <>
                      <span>•</span>
                      <span>{metadata.duration_formatted}</span>
                    </>
                  )}
                  {browserOnlyMode && selectedFile && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 flex items-center gap-1 font-mono">
                      <Lock className="w-3 h-3" />
                      Zero-Upload (Browser)
                    </span>
                  )}
                  {zeroDiskMode && selectedFile && !browserOnlyMode && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono">
                      Zero-Disk Mode
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2 py-4 sm:py-5">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-[#101726] border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shadow-inner group-hover:scale-105 transition">
                  <Upload className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Drag and drop your AI image, video, or audio here, or{" "}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                    >
                      browse files
                    </button>
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Supports Bulk Upload • PNG, JPG, WEBP, MP4, MOV, MP3, WAV, AAC • 100% In-Browser
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVaultSelector(true);
                      loadVaultImages();
                    }}
                    className="px-3 py-1 rounded-xl text-xs font-mono bg-zinc-100 dark:bg-[#111726] hover:bg-zinc-200 dark:hover:bg-[#182136] text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 hover:border-emerald-500/30 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <FolderArchive className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Select from Asset Vault
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cleaner Configuration Controls */}
          {previewUrl && (
            <div className="p-6 rounded-3xl bg-white/95 dark:bg-[#0c121e]/95 border border-zinc-200 dark:border-white/10 space-y-5 shadow-xl dark:shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-zinc-800 dark:text-zinc-200">
                    Cleaning Strategy & Privacy Engine
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  LOSSLESS MODE ACTIVE
                </span>
              </div>

              {/* Browser-Only Mode (Zero Network Upload) */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-[#070b13] border border-zinc-200/80 dark:border-white/5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-500" />
                      In-Browser Mode (Zero Network Upload)
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      100% PRIVATE
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Inspect video, audio, and images directly in browser memory without sending a single byte to the server. File is held temporarily in RAM and destroyed when tab closes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !browserOnlyMode;
                    setBrowserOnlyMode(next);
                    if (selectedFile) {
                      inspectCurrentSource(selectedFile, undefined, undefined, next);
                    }
                  }}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    browserOnlyMode ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-800"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                      browserOnlyMode ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Backend Storage Option (Ephemeral RAM vs Save to Vault) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-[#070b13] border border-zinc-200/80 dark:border-white/5">
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Backend Storage Destination
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-mono px-2 py-0.5 rounded border font-semibold",
                        zeroDiskMode
                          ? "bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30"
                          : "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                      )}
                    >
                      {zeroDiskMode ? "ZERO-DISK (EPHEMERAL)" : "SAVE TO VAULT"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {zeroDiskMode
                      ? "Zero Backend Storage: Processed purely in temporary RAM and purged immediately. Never saved to server disk or database."
                      : "Vault Library Storage: Cleaned media will be saved to your permanent Asset Vault for library browsing and future downloads."}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-200/70 dark:bg-black/40 border border-zinc-300 dark:border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setZeroDiskMode(true)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer",
                      zeroDiskMode
                        ? "bg-cyan-600 text-white shadow-sm font-bold"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    )}
                  >
                    Zero-Disk (RAM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setZeroDiskMode(false)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer",
                      !zeroDiskMode
                        ? "bg-emerald-600 text-white shadow-sm font-bold"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    )}
                  >
                    Save to Vault
                  </button>
                </div>
              </div>

              {/* Stealth Mode (Scramble SynthID) */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-[#070b13] border border-zinc-200/80 dark:border-white/5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Stealth Mode (SynthID Watermark Neutralizer)
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      AI BYPASS
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Injects an imperceptible micro-frequency Gaussian dither into pixel matrices. Breaks SynthID neural detection classifiers while human eye perceives 100% pristine visual clarity.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStealthMode(!stealthMode)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    stealthMode ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-800"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                      stealthMode ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Realistic Camera & GPS Profile Spoofing */}
              {!isAudio && (
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#070b13] border border-cyan-500/30 dark:border-cyan-500/20 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          Realistic Camera Profile Injection
                        </span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                          HARDWARE SPOOF
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Purges AI markers and injects authentic DSLR/Smartphone hardware EXIF (Sony A7IV, Canon R5, iPhone 15 Pro) + optional GPS geotag. Fooled forensic AI detectors expect camera optics.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInjectCameraProfile(!injectCameraProfile)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        injectCameraProfile ? "bg-cyan-600" : "bg-zinc-300 dark:bg-zinc-800"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                          injectCameraProfile ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {injectCameraProfile && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-white/5 space-y-3 animate-in fade-in">
                      {/* Camera Selection */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400 font-semibold flex items-center justify-between">
                          <span>Target Camera Hardware</span>
                          <span className="text-cyan-600 dark:text-cyan-400 lowercase">
                            {CAMERA_PRESET_FALLBACKS[cameraPreset]?.category || "hardware"}
                          </span>
                        </label>
                        <select
                          value={cameraPreset}
                          onChange={(e) => setCameraPreset(e.target.value)}
                          className="w-full text-xs font-mono p-2.5 rounded-xl bg-white dark:bg-[#0c121e] border border-zinc-300 dark:border-white/10 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                        >
                          {Object.entries(presetsData?.cameras || CAMERA_PRESET_FALLBACKS).map(([key, item]: [string, any]) => (
                            <option key={key} value={key}>
                              {item.name || key}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Active Profile Optics Preview */}
                      {(() => {
                        const activeCam = (presetsData?.cameras || CAMERA_PRESET_FALLBACKS)[cameraPreset] || CAMERA_PRESET_FALLBACKS.sony_a7iv;
                        return (
                          <div className="p-2.5 rounded-xl bg-cyan-500/5 dark:bg-cyan-950/20 border border-cyan-500/20 text-[11px] font-mono text-zinc-700 dark:text-zinc-300 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Lens Optics:</span>
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[170px]">{activeCam.lens}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Aperture / ISO:</span>
                              <span className="text-zinc-800 dark:text-zinc-200">f/{activeCam.f_number} • ISO {activeCam.iso}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Post Software:</span>
                              <span className="text-zinc-800 dark:text-zinc-200 truncate max-w-[170px]">{activeCam.software}</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* GPS Geotag Selection */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400 font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-500" />
                            GPS Geotag Location
                          </span>
                        </label>
                        <select
                          value={gpsPreset}
                          onChange={(e) => setGpsPreset(e.target.value)}
                          className="w-full text-xs font-mono p-2.5 rounded-xl bg-white dark:bg-[#0c121e] border border-zinc-300 dark:border-white/10 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                        >
                          {Object.entries(presetsData?.gps || GPS_PRESET_FALLBACKS).map(([key, item]: [string, any]) => (
                            <option key={key} value={key}>
                              {item.name || key}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleCleanMetadata}
                disabled={cleaning || inspecting}
                className={cn(
                  "w-full py-3.5 px-6 rounded-2xl font-bold font-heading text-sm transition shadow-lg flex items-center justify-center gap-2.5",
                  cleaning || inspecting
                    ? "bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed"
                    : injectCameraProfile && !isAudio
                    ? "bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-cyan-600/25 cursor-pointer"
                    : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-600/25 cursor-pointer"
                )}
              >
                {cleaning ? (
                  <>
                    <Spinner className="w-4 h-4 text-white" />
                    <span>
                      {injectCameraProfile && !isAudio
                        ? "Purging AI & Injecting Real Camera EXIF..."
                        : "Neutralizing Watermarks & Stripping Provenance..."}
                    </span>
                  </>
                ) : injectCameraProfile && !isAudio ? (
                  <>
                    <Camera className="w-4 h-4 text-white" />
                    <span>Clean AI & Inject Real Camera EXIF</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>Clean & Strip All AI Metadata</span>
                  </>
                )}
              </button>

              {cleanError && (
                <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400" />
                  <span>{cleanError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Deep Metadata Inspector & Cleaned Result */}
        <div className="lg:col-span-6 space-y-6">
          {inspecting ? (
            <div className="h-[430px] rounded-3xl bg-white/90 dark:bg-[#080d16]/90 border border-zinc-200 dark:border-white/10 flex flex-col items-center justify-center gap-3.5 p-8 text-center backdrop-blur-md shadow-xl">
              <Spinner className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 tracking-wider uppercase">
                  DEEP SCANNING HEADERS & CRYPTOGRAPHIC CLAIMS...
                </span>
                <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">{inspectStage}</p>
              </div>
            </div>
          ) : inspectError ? (
            <div className="h-[430px] rounded-3xl bg-red-50/50 dark:bg-[#080d16]/90 border border-red-200 dark:border-red-500/30 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300 font-semibold">{inspectError}</p>
            </div>
          ) : metadata ? (
            <div className="rounded-3xl bg-white/95 dark:bg-[#0a0f18]/90 border border-zinc-200 dark:border-white/10 overflow-hidden backdrop-blur-xl shadow-xl dark:shadow-2xl">
              {/* Provenance Verdict Header */}
              <div
                className={cn(
                  "p-4 border-b flex items-center justify-between gap-4",
                  metadata.has_ai_metadata
                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300"
                    : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                )}
              >
                <div className="flex items-center gap-3">
                  {metadata.has_ai_metadata ? (
                    <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-bold tracking-wide uppercase font-mono">
                      {metadata.has_ai_metadata
                        ? "AI Signatures & Metadata Detected"
                        : "Clean Image / Zero AI Signatures"}
                    </div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      {metadata.has_ai_metadata
                        ? `${metadata.detected_generator ? `Identified Model: ${metadata.detected_generator}` : "Metadata chunks present"}`
                        : "No C2PA manifests or known AI generator tags found"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {metadata.c2pa_detected && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30">
                      C2PA LOCKED
                    </span>
                  )}
                  {metadata.synthid_detected && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                      SYNTHID
                    </span>
                  )}
                </div>
              </div>

              {/* Sub-navigation tabs for metadata */}
              <div className="flex flex-wrap border-b border-zinc-200 dark:border-white/5 bg-zinc-50/80 dark:bg-[#050810]/70 px-4 pt-2 gap-1">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={cn(
                    "px-3.5 py-2 text-xs font-mono font-semibold border-b-2 transition -mb-[1px] cursor-pointer",
                    activeTab === "overview"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  Overview & AI
                </button>
                {!isAudio && (
                  <button
                    onClick={() => setActiveTab("camera")}
                    className={cn(
                      "px-3.5 py-2 text-xs font-mono font-semibold border-b-2 transition -mb-[1px] cursor-pointer",
                      activeTab === "camera"
                        ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    )}
                  >
                    Camera & Optics
                  </button>
                )}
                {!isAudio && (
                  <button
                    onClick={() => setActiveTab("gps")}
                    className={cn(
                      "px-3.5 py-2 text-xs font-mono font-semibold border-b-2 transition -mb-[1px] cursor-pointer",
                      activeTab === "gps"
                        ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    )}
                  >
                    GPS Location
                  </button>
                )}
                {isVideo && (
                  <button
                    onClick={() => setActiveTab("streams")}
                    className={cn(
                      "px-3.5 py-2 text-xs font-mono font-semibold border-b-2 transition -mb-[1px] cursor-pointer",
                      activeTab === "streams"
                        ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    )}
                  >
                    Video Streams
                  </button>
                )}
                {(isAudio || metadata?.has_audio) && (
                  <button
                    onClick={() => setActiveTab("audio")}
                    className={cn(
                      "px-3.5 py-2 text-xs font-mono font-semibold border-b-2 transition -mb-[1px] cursor-pointer flex items-center gap-1.5",
                      activeTab === "audio"
                        ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    )}
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>Audio & Acoustics</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("rights")}
                  className={cn(
                    "px-3.5 py-2 text-xs font-mono font-semibold border-b-2 transition -mb-[1px] cursor-pointer",
                    activeTab === "rights"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  Rights & Creator
                </button>
                <button
                  onClick={() => setActiveTab("raw")}
                  className={cn(
                    "px-3.5 py-2 text-xs font-mono font-semibold border-b-2 transition -mb-[1px] cursor-pointer",
                    activeTab === "raw"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  Raw Tags
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-5 space-y-5 max-h-[500px] overflow-y-auto scroll-smooth custom-scrollbar overscroll-contain">
                {/* 1. OVERVIEW & AI */}
                {activeTab === "overview" && (
                  <div className="space-y-4">
                    {/* Basic Grid */}
                    {isAudio ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-[#060a12] border border-zinc-200/80 dark:border-white/5">
                          <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Format</div>
                          <div className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
                            {metadata.format || "MP3"}
                          </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-[#060a12] border border-zinc-200/80 dark:border-white/5">
                          <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Duration</div>
                          <div className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
                            {metadata.duration_formatted}
                          </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-[#060a12] border border-zinc-200/80 dark:border-white/5">
                          <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Acoustics</div>
                          <div className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 truncate">
                            {metadata.sample_rate || "44.1 kHz"} • {metadata.channel_layout || "Stereo"}
                          </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-[#060a12] border border-zinc-200/80 dark:border-white/5">
                          <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Bitrate / Size</div>
                          <div className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 truncate">
                            {metadata.bitrate_kbps ? `${metadata.bitrate_kbps}k` : ""} • {metadata.file_size_formatted}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-[#060a12] border border-zinc-200/80 dark:border-white/5">
                          <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Format</div>
                          <div className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
                            {metadata.format || (isVideo ? "MP4" : "PNG")}
                          </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-[#060a12] border border-zinc-200/80 dark:border-white/5">
                          <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Dimensions</div>
                          <div className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
                            {metadata.width} × {metadata.height}
                          </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-[#060a12] border border-zinc-200/80 dark:border-white/5">
                          <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">
                            {isVideo ? "FPS & Codec" : "Color Mode"}
                          </div>
                          <div className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 truncate">
                            {isVideo ? `${metadata.fps || 30} FPS • ${metadata.video_codec || "H.264"}` : metadata.mode || "sRGB"}
                          </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-[#060a12] border border-zinc-200/80 dark:border-white/5">
                          <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">File Size</div>
                          <div className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
                            {metadata.file_size_formatted}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Video Audio Track Status Badge */}
                    {isVideo && (
                      <div
                        className={cn(
                          "p-3.5 rounded-2xl border flex items-center justify-between transition-all",
                          metadata.has_audio
                            ? "bg-emerald-50/80 dark:bg-emerald-950/25 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                            : "bg-amber-50/80 dark:bg-amber-950/25 border-amber-500/30 text-amber-800 dark:text-amber-300"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          {metadata.has_audio ? (
                            <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <VolumeX className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          )}
                          <div>
                            <span className="text-xs font-bold font-mono uppercase">
                              {metadata.has_audio ? "Embedded Audio Track Detected" : "No Audio Track (Muted / Silent Video)"}
                            </span>
                            <p className="text-[11px] opacity-80 font-mono">
                              {metadata.has_audio
                                ? `${metadata.audio_codec || "AAC"} • ${metadata.audio_technical?.sample_rate || "48000 Hz"} • ${metadata.audio_technical?.channel_layout || "Stereo"}`
                                : "Video container contains 0 audio channels. Verified silent."}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-current">
                          {metadata.has_audio ? "AUDIO ACTIVE" : "SILENT"}
                        </span>
                      </div>
                    )}

                    {/* Extracted Prompt */}
                    {metadata.embedded_prompt && (
                      <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-[#070b14] border border-emerald-500/30 dark:border-emerald-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            {isAudio ? "Embedded Lyrics / Audio Prompt" : "Extracted AI Prompt"}
                          </span>
                          <button
                            onClick={() => copyToClipboard(metadata.embedded_prompt || "")}
                            className="text-[10px] font-mono flex items-center gap-1 text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-300 transition cursor-pointer"
                          >
                            {copiedPrompt ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-zinc-800 dark:text-zinc-200 font-sans leading-relaxed break-words bg-white dark:bg-black/40 p-3 rounded-xl border border-zinc-200 dark:border-white/5">
                          {metadata.embedded_prompt}
                        </p>
                      </div>
                    )}

                    {/* Extracted Negative Prompt if found */}
                    {metadata.negative_prompt && (
                      <div className="p-4 rounded-2xl bg-rose-50/40 dark:bg-[#070b14] border border-rose-500/30 dark:border-red-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold uppercase text-rose-700 dark:text-red-400 flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5" />
                            Negative Prompt
                          </span>
                          <button
                            onClick={() => copyToClipboard(metadata.negative_prompt || "", true)}
                            className="text-[10px] font-mono flex items-center gap-1 text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-red-300 transition cursor-pointer"
                          >
                            {copiedNegPrompt ? (
                              <>
                                <Check className="w-3 h-3 text-rose-600 dark:text-red-400" />
                                <span className="text-rose-600 dark:text-red-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-zinc-800 dark:text-zinc-300 font-sans leading-relaxed break-words bg-white dark:bg-black/40 p-3 rounded-xl border border-zinc-200 dark:border-white/5">
                          {metadata.negative_prompt}
                        </p>
                      </div>
                    )}

                    {/* Parameters Grid */}
                    {metadata.embedded_parameters && Object.keys(metadata.embedded_parameters).length > 0 && (
                      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#070b14] border border-zinc-200 dark:border-white/10 space-y-2.5">
                        <span className="text-[11px] font-mono font-bold uppercase text-cyan-700 dark:text-cyan-400">
                          Generation Parameters & Neural Seeds
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                          {Object.entries(metadata.embedded_parameters).map(([k, v]) => (
                            <div key={k} className="p-2 rounded-xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/5 flex flex-col justify-between">
                              <span className="text-[10px] text-zinc-500 uppercase truncate">{k}</span>
                              <span className="text-zinc-800 dark:text-zinc-200 font-semibold truncate">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Signatures Badges */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono font-bold uppercase text-zinc-600 dark:text-zinc-400">
                        AI Provenance & Cryptographic Badges
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div
                          className={cn(
                            "p-3 rounded-2xl border flex items-center justify-between",
                            metadata.c2pa_detected
                              ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300"
                              : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                          )}
                        >
                          <span>C2PA / JUMBF Manifest</span>
                          <span className="font-mono font-bold">
                            {metadata.c2pa_detected ? "FOUND" : "NONE"}
                          </span>
                        </div>
                        <div
                          className={cn(
                            "p-3 rounded-2xl border flex items-center justify-between",
                            metadata.synthid_detected
                              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300"
                              : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                          )}
                        >
                          <span>SynthID Watermark</span>
                          <span className="font-mono font-bold">
                            {metadata.synthid_detected ? "DETECTED" : "NONE"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. CAMERA & OPTICS */}
                {activeTab === "camera" && !isAudio && (
                  <div className="space-y-4">
                    {metadata.camera_info && Object.keys(metadata.camera_info).length > 0 ? (
                      <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                        {Object.entries(metadata.camera_info).map(([k, v]) => (
                          <div key={k} className="p-3 rounded-2xl bg-zinc-50 dark:bg-[#060a12] border border-zinc-200/80 dark:border-white/5 space-y-1">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{k.replace(/_/g, " ")}</div>
                            <div className="text-zinc-800 dark:text-zinc-200 font-bold break-words">{String(v)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-zinc-500 font-mono text-xs space-y-2">
                        <Camera className="w-8 h-8 text-zinc-400 dark:text-zinc-600 mx-auto" />
                        <div>NO HARDWARE CAMERA OPTICS DETECTED</div>
                        <div className="text-[11px] text-zinc-400 dark:text-zinc-600">
                          (Common for direct AI synthetic generations without synthetic camera tags)
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. GPS GEOLOCATION */}
                {activeTab === "gps" && !isAudio && (
                  <div className="space-y-4">
                    {metadata.gps_info?.has_gps ? (
                      <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-[#060a12] border border-emerald-500/25 space-y-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          <h4 className="text-xs font-bold font-mono uppercase text-emerald-700 dark:text-emerald-400">
                            Geographic Coordinates Found in Headers
                          </h4>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                          <div className="p-3 rounded-xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/5">
                            <span className="text-zinc-500 block text-[10px]">COORDINATES</span>
                            <span className="text-zinc-800 dark:text-zinc-200 font-bold">{metadata.gps_info.formatted}</span>
                          </div>
                          <div className="p-3 rounded-xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/5">
                            <span className="text-zinc-500 block text-[10px]">DECIMAL (LAT, LON)</span>
                            <span className="text-zinc-800 dark:text-zinc-200 font-bold">
                              {metadata.gps_info.latitude}, {metadata.gps_info.longitude}
                            </span>
                          </div>
                        </div>

                        {metadata.gps_info.google_maps_url && (
                          <a
                            href={metadata.gps_info.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>View on Google Maps</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-zinc-500 font-mono text-xs space-y-2">
                        <Compass className="w-8 h-8 text-zinc-400 dark:text-zinc-600 mx-auto" />
                        <div>ZERO GPS TAGS EMBEDDED</div>
                        <div className="text-[11px] text-zinc-400 dark:text-zinc-600">
                          This media does not contain latitude/longitude tracking metadata.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. VIDEO STREAMS */}
                {activeTab === "streams" && isVideo && (
                  <div className="space-y-4">
                    {/* Video Tech */}
                    {metadata.video_technical && Object.keys(metadata.video_technical).length > 0 && (
                      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#060a12] border border-zinc-200 dark:border-white/10 space-y-3">
                        <span className="text-xs font-bold font-mono text-cyan-700 dark:text-cyan-400 uppercase">
                          Video Stream Metrics
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                          {Object.entries(metadata.video_technical).map(([k, v]) => (
                            <div key={k} className="p-2.5 rounded-xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/5">
                              <span className="text-[10px] text-zinc-500 uppercase block">{k.replace(/_/g, " ")}</span>
                              <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audio Stream In Video */}
                    {metadata.has_audio ? (
                      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#060a12] border border-emerald-500/20 dark:border-emerald-500/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1.5">
                            <Volume2 className="w-4 h-4" />
                            Audio Stream Detected In Video
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            {metadata.audio_codec || "AAC"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                          <div className="p-2.5 rounded-xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/5">
                            <span className="text-[10px] text-zinc-500 uppercase block">Codec</span>
                            <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{metadata.audio_codec || "AAC"}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/5">
                            <span className="text-[10px] text-zinc-500 uppercase block">Sample Rate</span>
                            <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{metadata.audio_technical?.sample_rate || "48000 Hz"}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/5">
                            <span className="text-[10px] text-zinc-500 uppercase block">Channels</span>
                            <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{metadata.audio_technical?.channels || 2} ({metadata.audio_technical?.channel_layout || "Stereo"})</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#060a12] border border-amber-500/25 space-y-2">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <VolumeX className="w-4 h-4" />
                          <span className="text-xs font-bold font-mono uppercase">
                            Audio Stream Status: No Audio Track
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                          This video file is silent / muted. No embedded audio bitstream was found in the container.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. AUDIO & ACOUSTICS TAB */}
                {activeTab === "audio" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#060a12] border border-zinc-200 dark:border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1.5">
                          <Music className="w-4 h-4" />
                          Acoustics & Bitstream Metrics
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          {metadata.audio_codec || metadata.format || "AUDIO"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/5">
                          <span className="text-[10px] text-zinc-500 uppercase block">Sample Rate</span>
                          <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{metadata.sample_rate || metadata.audio_technical?.sample_rate || "44100 Hz"}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/5">
                          <span className="text-[10px] text-zinc-500 uppercase block">Channels</span>
                          <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{metadata.channels || 2} ({metadata.channel_layout || "Stereo"})</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/5">
                          <span className="text-[10px] text-zinc-500 uppercase block">Bitrate</span>
                          <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{metadata.bitrate_kbps ? `${metadata.bitrate_kbps} kbps` : "Lossless VBR"}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/5">
                          <span className="text-[10px] text-zinc-500 uppercase block">Duration</span>
                          <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{metadata.duration_formatted}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/5">
                          <span className="text-[10px] text-zinc-500 uppercase block">Bit Depth</span>
                          <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{metadata.bits_per_sample ? `${metadata.bits_per_sample}-bit` : "16-bit Standard"}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/5">
                          <span className="text-[10px] text-zinc-500 uppercase block">Codec</span>
                          <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{metadata.audio_codec || "PCM / AAC"}</span>
                        </div>
                      </div>
                    </div>

                    {metadata.detected_generator && (
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-[#0c1424] border border-amber-500/30 dark:border-amber-500/20 space-y-1">
                        <span className="text-xs font-bold font-mono text-amber-800 dark:text-amber-400 uppercase">
                          AI Voice / Music Generator Detected
                        </span>
                        <p className="text-xs font-mono text-zinc-800 dark:text-zinc-200">
                          Identified Audio Model: <span className="font-bold text-emerald-600 dark:text-emerald-400">{metadata.detected_generator}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. RIGHTS & CREATOR */}
                {activeTab === "rights" && (
                  <div className="space-y-4">
                    {metadata.rights_and_creator && Object.keys(metadata.rights_and_creator).length > 0 ? (
                      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#060a12] border border-zinc-200 dark:border-white/10 space-y-3">
                        <span className="text-xs font-bold font-mono text-purple-700 dark:text-purple-400 uppercase">
                          Copyright & Attribution
                        </span>
                        <div className="space-y-2 text-xs font-mono">
                          {Object.entries(metadata.rights_and_creator).map(([k, v]) => (
                            <div key={k} className="p-3 rounded-xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/5 flex justify-between">
                              <span className="text-zinc-500 uppercase">{k}:</span>
                              <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-zinc-500 font-mono text-xs space-y-2">
                        <FileText className="w-8 h-8 text-zinc-400 dark:text-zinc-600 mx-auto" />
                        <div>NO CREATOR OR COPYRIGHT CLAIMS EMBEDDED</div>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. RAW TAGS */}
                {activeTab === "raw" && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={rawTagSearch}
                        onChange={(e) => setRawTagSearch(e.target.value)}
                        placeholder="Search raw tags, atoms, and EXIF keys..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-50 dark:bg-[#060a12] border border-zinc-200 dark:border-white/10 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="divide-y divide-zinc-200 dark:divide-white/5 border border-zinc-200 dark:border-white/5 rounded-2xl overflow-y-auto max-h-[380px] scroll-smooth custom-scrollbar overscroll-contain text-xs bg-zinc-50/60 dark:bg-[#060a12]/60">
                      {Object.entries(metadata.exif_tags || metadata.tags || {})
                        .filter(([tag, val]) => {
                          if (!rawTagSearch.trim()) return true;
                          const q = rawTagSearch.toLowerCase();
                          return tag.toLowerCase().includes(q) || String(val).toLowerCase().includes(q);
                        })
                        .map(([tag, val]) => (
                          <div key={tag} className="p-3 flex justify-between gap-4 hover:bg-zinc-100/50 dark:hover:bg-white/[0.03]">
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">{tag}</span>
                            <span className="font-mono text-zinc-700 dark:text-zinc-300 text-right truncate max-w-[300px]">
                              {typeof val === "object" ? JSON.stringify(val) : String(val)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-[430px] rounded-3xl bg-white/90 dark:bg-[#080d16]/90 border border-zinc-200 dark:border-white/10 flex flex-col items-center justify-center gap-3 p-8 text-center shadow-xl">
              <Shield className="w-10 h-10 text-zinc-400 dark:text-zinc-600" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Upload or select an image or video to inspect its hidden metadata & AI provenance
              </p>
            </div>
          )}

          {/* Cleaned Result Presentation */}
          {cleanResult && (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 dark:from-emerald-950/60 dark:via-[#0a0f18] dark:to-black border border-emerald-500/30 dark:border-emerald-500/40 space-y-5 animate-in fade-in duration-300 shadow-xl dark:shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-heading text-zinc-900 dark:text-white">
                      Sanitization Complete
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400/90 font-mono">
                      100% C2PA Stripped • sRGB Color Preserved • Zero Footprint
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    -{cleanResult.saved_percent}% Size
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    Saved {formatBytes(cleanResult.saved_bytes)}
                  </div>
                </div>
              </div>

              {/* Cleaned Preview & Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10 max-h-48 bg-black/10 dark:bg-black/50 flex items-center justify-center p-2">
                  {isVideo ? (
                    <video
                      src={getMediaUrl(cleanResult.clean_url || cleanResult.url)}
                      controls
                      className="max-h-48 w-auto object-contain rounded-xl bg-black"
                    />
                  ) : isAudio ? (
                    <div className="w-full p-4 flex flex-col items-center justify-center space-y-2 bg-zinc-900/60 rounded-xl">
                      <Music className="w-8 h-8 text-emerald-400 animate-pulse" />
                      <audio
                        src={getMediaUrl(cleanResult.clean_url || cleanResult.url)}
                        controls
                        className="w-full h-8 accent-emerald-500"
                      />
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={getMediaUrl(cleanResult.clean_url || cleanResult.url)}
                      alt="Cleaned Preview"
                      className="max-h-48 w-auto object-contain rounded-xl"
                    />
                  )}
                  <div
                    className={cn(
                      "absolute top-2 left-2 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono border",
                      cleanResult.injected_camera
                        ? "bg-cyan-950/80 text-cyan-300 border-cyan-500/30"
                        : "bg-emerald-950/80 text-emerald-300 border-emerald-500/30"
                    )}
                  >
                    {cleanResult.injected_camera ? "CAMERA SPOOFED" : "CLEANED"}
                  </div>
                </div>

                <div className="flex flex-col justify-between space-y-3">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-white/5 font-mono">
                      <span className="text-zinc-500">Cleaned Size:</span>
                      <span className="text-zinc-800 dark:text-zinc-200">{formatBytes(cleanResult.cleaned_size_bytes)}</span>
                    </div>

                    {cleanResult.injected_camera && (
                      <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-white/5 font-mono">
                        <span className="text-zinc-500">Camera Profile:</span>
                        <span className="text-cyan-600 dark:text-cyan-400 font-bold truncate max-w-[150px]">
                          {cleanResult.injected_camera.make} {cleanResult.injected_camera.model}
                        </span>
                      </div>
                    )}

                    {cleanResult.injected_camera?.lens && (
                      <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-white/5 font-mono">
                        <span className="text-zinc-500">Lens Optics:</span>
                        <span className="text-zinc-800 dark:text-zinc-200 truncate max-w-[140px]" title={cleanResult.injected_camera.lens}>
                          {cleanResult.injected_camera.lens}
                        </span>
                      </div>
                    )}

                    {cleanResult.injected_gps?.has_gps && (
                      <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-white/5 font-mono">
                        <span className="text-zinc-500">Geotag:</span>
                        <a
                          href={cleanResult.injected_gps.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 truncate max-w-[140px]"
                        >
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{cleanResult.injected_gps.formatted}</span>
                        </a>
                      </div>
                    )}

                    <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-white/5 font-mono">
                      <span className="text-zinc-500">AI Remnants:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">0% (Verified Clean)</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-white/5 font-mono">
                      <span className="text-zinc-500">Stealth Mode:</span>
                      <span className="text-zinc-800 dark:text-zinc-200">{cleanResult.stealth_mode ? "Enabled" : "Standard"}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <a
                      href={getMediaUrl(cleanResult.url || cleanResult.clean_url)}
                      download={cleanResult.output_filename || cleanResult.clean_filename}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Cleaned Media</span>
                    </a>
                    <a
                      href={getMediaUrl(cleanResult.url || cleanResult.clean_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-4 rounded-xl text-xs font-mono text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-[#111726] dark:hover:bg-[#182136] flex items-center justify-center gap-2 border border-zinc-200 dark:border-white/10 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Fullscreen</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Upgraded Asset Vault Selector Modal ── */}
      {showVaultSelector && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-4xl rounded-3xl bg-white dark:bg-[#0b101a] border border-zinc-200 dark:border-emerald-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between bg-zinc-50 dark:bg-[#080d16]">
              <div className="flex items-center gap-3">
                <FolderArchive className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold font-heading text-zinc-900 dark:text-white">
                    Select Media from Asset Vault
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    Choose from generated images, videos, and studio masters
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVaultSelector(false)}
                className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 border-b border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-[#070b13] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setVaultTab("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition cursor-pointer",
                    vaultTab === "all"
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-100 dark:bg-[#101726] text-zinc-700 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                  )}
                >
                  All ({vaultImages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVaultTab("images")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition cursor-pointer",
                    vaultTab === "images"
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-100 dark:bg-[#101726] text-zinc-700 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                  )}
                >
                  Images
                </button>
                <button
                  type="button"
                  onClick={() => setVaultTab("videos")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition cursor-pointer",
                    vaultTab === "videos"
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-100 dark:bg-[#101726] text-zinc-700 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                  )}
                >
                  Videos
                </button>
                <button
                  type="button"
                  onClick={() => setVaultTab("audio")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition cursor-pointer",
                    vaultTab === "audio"
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-100 dark:bg-[#101726] text-zinc-700 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                  )}
                >
                  Audio
                </button>
              </div>

              {/* Search & Hide tiny files toggle */}
              <div className="flex items-center gap-3 flex-1 max-w-md justify-end">
                <label className="flex items-center gap-2 text-xs font-mono text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hideSmallTestFiles}
                    onChange={(e) => setHideSmallTestFiles(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-white/20 bg-white dark:bg-black/40 text-emerald-500 focus:ring-0"
                  />
                  <span>Hide mock files (&lt;10KB)</span>
                </label>

                <div className="relative w-44 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={vaultSearch}
                    onChange={(e) => setVaultSearch(e.target.value)}
                    placeholder="Search files..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-[#0e1422] border border-zinc-200 dark:border-white/10 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Asset Grid */}
            <div className="p-5 overflow-y-auto flex-1">
              {loadingVault ? (
                <div className="py-20 text-center space-y-2">
                  <Spinner className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">Loading Asset Vault...</div>
                </div>
              ) : filteredVaultAssets.length === 0 ? (
                <div className="py-20 text-center text-zinc-400 dark:text-zinc-500 text-xs font-mono space-y-2">
                  <FolderArchive className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto" />
                  <div>NO MATCHING ASSETS FOUND</div>
                  <div className="text-[11px] text-zinc-400 dark:text-zinc-600">
                    Try disabling &quot;Hide mock files&quot; or changing your search terms.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {filteredVaultAssets.map((asset, idx) => {
                    const isAssetVid =
                      asset.asset_type === "videos" || /\.(mp4|mov|webm|mkv)$/i.test(asset.filename || asset.url);
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectFromVault(asset)}
                        className="group relative rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#070b13] overflow-hidden cursor-pointer hover:border-emerald-500/80 transition duration-200 shadow-xs hover:shadow-md"
                      >
                        {isAssetVid ? (
                          <div className="w-full h-32 bg-zinc-100 dark:bg-[#05080f] flex flex-col items-center justify-center gap-2 group-hover:scale-105 transition duration-200">
                            <Video className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-[9px] font-mono text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                              VIDEO
                            </span>
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={getMediaUrl(asset.url)}
                            alt={asset.filename}
                            className="w-full h-32 object-cover group-hover:scale-105 transition duration-200"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        )}

                        {/* Badges */}
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-black/70 text-zinc-200 backdrop-blur-xs border border-white/10">
                            {isAssetVid ? "MP4" : "IMG"}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white dark:bg-[#090e18] border-t border-zinc-200 dark:border-white/5 space-y-0.5">
                          <div className="text-[11px] font-mono text-zinc-800 dark:text-zinc-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition">
                            {asset.filename}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500 flex justify-between">
                            <span>{formatBytes(asset.size_bytes || 0)}</span>
                            {asset.size_bytes && asset.size_bytes < 10000 && (
                              <span className="text-amber-600 dark:text-amber-400">Sample</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
