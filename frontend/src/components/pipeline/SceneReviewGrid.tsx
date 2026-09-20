"use client";
import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  ImageIcon,
  Film,
  Mic,
  RotateCcw,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
  Maximize2,
  Sparkles,
} from "lucide-react";
import { getMediaUrl } from "@/lib/api";

export interface SceneData {
  index: number;
  title: string;
  script: string;
  description: string;
  camera_angle: string;
  motion_type: string;
  lighting: string;
  duration_seconds: number;
  image_prompt: string;
  negative_prompt: string;
  image_path?: string | null;
  video_path?: string | null;
  audio_path?: string | null;
}

interface SceneReviewGridProps {
  scenes: SceneData[];
  onRegenerateScene?: (index: number) => void;
  onPreviewScene?: (index: number) => void;
  compact?: boolean;
}

export default function SceneReviewGrid({
  scenes,
  onRegenerateScene,
  onPreviewScene,
  compact = false,
}: SceneReviewGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxMediaType, setLightboxMediaType] = useState<"image" | "video">("image");
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const activeScene = lightboxIndex !== null && scenes[lightboxIndex] ? scenes[lightboxIndex] : null;

  // Handle keyboard navigation for Lightbox
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;

      if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : scenes.length - 1));
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev !== null && prev < scenes.length - 1 ? prev + 1 : 0));
      }
    },
    [lightboxIndex, scenes.length]
  );

  useEffect(() => {
    if (lightboxIndex !== null) {
      window.addEventListener("keydown", handleKeyDown);
      // Lock background scrolling
      document.body.style.overflow = "hidden";
      // Auto-set preferred media type based on what is available
      const sc = scenes[lightboxIndex];
      if (sc) {
        if (sc.image_path) {
          setLightboxMediaType("image");
        } else if (sc.video_path) {
          setLightboxMediaType("video");
        }
      }
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, handleKeyDown, scenes]);

  const openLightbox = (index: number, preferredMedia: "image" | "video" = "image") => {
    setLightboxIndex(index);
    setLightboxMediaType(preferredMedia);
    if (onPreviewScene) {
      onPreviewScene(index);
    }
  };

  const copyPromptText = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  if (!scenes.length) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto">
            <Film className="w-5 h-5 text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-500">No scenes generated yet</p>
          <p className="text-xs text-zinc-400">Start the agent pipeline to generate scenes</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "grid gap-3",
          compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {scenes.map((scene, i) => {
          const hasImage = !!scene.image_path;
          const hasVideo = !!scene.video_path;
          const hasAudio = !!scene.audio_path;
          const imageUrl = hasImage ? getMediaUrl(scene.image_path!) : null;
          const videoUrl = hasVideo ? getMediaUrl(scene.video_path!) : null;
          const sceneDisplayNum = typeof scene.index === "number" && scene.index > 0
            ? scene.index
            : (scene.index === 0 ? 1 : i + 1);

          return (
            <div
              key={scene.index ?? i}
              className="group rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0e0e16] overflow-hidden transition-all hover:shadow-md hover:border-emerald-500/30 flex flex-col"
            >
              {/* Thumbnail Container (Clickable for Lightbox) */}
              <div
                onClick={() => openLightbox(i, hasVideo && !hasImage ? "video" : "image")}
                className="relative aspect-video bg-zinc-100 dark:bg-zinc-800 overflow-hidden cursor-zoom-in select-none"
                title="Click to expand scene in high-res lightbox"
              >
                {hasVideo ? (
                  <video
                    src={videoUrl!}
                    poster={imageUrl || undefined}
                    preload="metadata"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    muted
                    loop
                    playsInline
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                  />
                ) : hasImage ? (
                  <img
                    src={imageUrl!}
                    alt={scene.title || `Scene ${sceneDisplayNum}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                  </div>
                )}

                {/* Scene Number Badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono font-bold border border-white/10 flex items-center gap-1">
                  <span>Scene {sceneDisplayNum}</span>
                </div>

                {/* Lightbox Quick Hover Hint */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <div className="p-2.5 rounded-xl bg-black/70 backdrop-blur-md text-white border border-white/20 shadow-lg flex items-center gap-1.5 text-xs font-mono">
                    <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>View Lightbox</span>
                  </div>
                  {onRegenerateScene && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRegenerateScene(i);
                      }}
                      className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
                      title="Regenerate scene"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Asset Indicators */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1">
                  {hasImage && (
                    <div
                      className="w-5 h-5 rounded-md bg-emerald-500/90 flex items-center justify-center shadow-xs"
                      title="Keyframe Image Available"
                    >
                      <ImageIcon className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {hasVideo && (
                    <div
                      className="w-5 h-5 rounded-md bg-blue-500/90 flex items-center justify-center shadow-xs"
                      title="Kinematic Video Available"
                    >
                      <Film className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {hasAudio && (
                    <div
                      className="w-5 h-5 rounded-md bg-violet-500/90 flex items-center justify-center shadow-xs"
                      title="Voice Track Available"
                    >
                      <Mic className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info Block */}
              {!compact && (
                <div className="p-3 space-y-1.5 min-w-0 flex-1 flex flex-col justify-between">
                  <div className="space-y-1 min-w-0">
                    <h4
                      className="text-xs font-heading font-bold text-zinc-900 dark:text-white truncate cursor-pointer hover:text-emerald-500"
                      onClick={() => openLightbox(i)}
                      title={scene.title || `Scene ${sceneDisplayNum}`}
                    >
                      {scene.title || `Scene ${sceneDisplayNum}`}
                    </h4>
                    {scene.script && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed break-words">
                        {scene.script}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-400 font-mono pt-1 min-w-0">
                    {scene.camera_angle && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/[0.04] max-w-full truncate" title={scene.camera_angle}>
                        {scene.camera_angle}
                      </span>
                    )}
                    {scene.duration_seconds > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/[0.04] shrink-0">
                        {scene.duration_seconds}s
                      </span>
                    )}
                    {scene.motion_type && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 max-w-full truncate font-semibold" title={scene.motion_type}>
                        {scene.motion_type}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── HIGH-END LIGHTBOX MODAL ── */}
      {activeScene && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 backdrop-blur-2xl p-4 sm:p-6 text-white animate-in fade-in duration-200"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between gap-4 pb-3 border-b border-white/10 font-mono text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Scene counter & Title */}
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[11px] tracking-wider">
                SCENE {(activeScene.index ?? lightboxIndex ?? 0) + 1} OF {scenes.length}
              </div>
              <h3 className="text-sm font-heading font-extrabold text-white truncate max-w-md hidden sm:block">
                {activeScene.title || `Scene ${(activeScene.index ?? lightboxIndex ?? 0) + 1}`}
              </h3>
            </div>

            {/* Center: Media Mode Toggle (Image vs Video) */}
            <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/10">
              {activeScene.image_path && (
                <button
                  type="button"
                  onClick={() => setLightboxMediaType("image")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    lightboxMediaType === "image"
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Keyframe Image</span>
                </button>
              )}
              {activeScene.video_path && (
                <button
                  type="button"
                  onClick={() => setLightboxMediaType("video")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    lightboxMediaType === "video"
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Kinematic Video</span>
                </button>
              )}
            </div>

            {/* Right: Actions (Download & Close) */}
            <div className="flex items-center gap-2">
              {lightboxMediaType === "video" && activeScene.video_path ? (
                <a
                  href={getMediaUrl(activeScene.video_path)}
                  download
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Download Scene Video"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Download MP4</span>
                </a>
              ) : activeScene.image_path ? (
                <a
                  href={getMediaUrl(activeScene.image_path)}
                  download
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Download Keyframe Image"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Download Image</span>
                </a>
              ) : null}

              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white transition-all cursor-pointer border border-rose-500/40 flex items-center gap-1.5 text-xs font-mono font-bold shadow-md hover:scale-105 active:scale-95"
                title="Close Lightbox (Esc)"
              >
                <X className="w-4 h-4 text-rose-400" />
                <span>Close (Esc)</span>
              </button>
            </div>
          </div>

          {/* Center Showcase with Left/Right Navigation */}
          <div
            className="relative flex-1 flex items-center justify-center my-auto p-2 sm:p-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Previous Button */}
            {scenes.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : scenes.length - 1))
                }
                className="absolute left-2 sm:left-6 z-10 p-3 rounded-2xl bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all hover:scale-110 cursor-pointer shadow-xl backdrop-blur-md"
                title="Previous Scene (Left Arrow)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Media Content */}
            <div className="max-h-[68vh] max-w-[85vw] flex items-center justify-center">
              {lightboxMediaType === "video" && activeScene.video_path ? (
                <video
                  key={activeScene.video_path}
                  src={getMediaUrl(activeScene.video_path)}
                  poster={activeScene.image_path ? getMediaUrl(activeScene.image_path) : undefined}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[68vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl border border-white/15"
                />
              ) : activeScene.image_path ? (
                <img
                  src={getMediaUrl(activeScene.image_path)}
                  alt={activeScene.title || "Scene image"}
                  className="max-h-[68vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl border border-white/15 select-none"
                />
              ) : (
                <div className="p-12 text-center text-zinc-500 font-mono">
                  <ImageIcon className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p>Visual card not yet synthesized for this scene.</p>
                </div>
              )}
            </div>

            {/* Next Button */}
            {scenes.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) => (prev !== null && prev < scenes.length - 1 ? prev + 1 : 0))
                }
                className="absolute right-2 sm:right-6 z-10 p-3 rounded-2xl bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all hover:scale-110 cursor-pointer shadow-xl backdrop-blur-md"
                title="Next Scene (Right Arrow)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Info Drawer */}
          <div
            className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 max-w-5xl mx-auto w-full space-y-3 font-jakarta shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-white font-heading">
                  {activeScene.title || `Scene ${(activeScene.index ?? lightboxIndex ?? 0) + 1}`}
                </h4>
                {activeScene.script && (
                  <p className="text-xs text-zinc-300 italic pt-0.5 leading-relaxed">
                    &ldquo;{activeScene.script}&rdquo;
                  </p>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] shrink-0">
                {activeScene.camera_angle && (
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-zinc-300 border border-white/10">
                    📷 {activeScene.camera_angle}
                  </span>
                )}
                {activeScene.motion_type && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    🎬 {activeScene.motion_type}
                  </span>
                )}
                {activeScene.duration_seconds > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-zinc-300 border border-white/10">
                    ⏱️ {activeScene.duration_seconds}s
                  </span>
                )}
              </div>
            </div>

            {/* Prompt snippet & copy button */}
            {activeScene.image_prompt && (
              <div className="pt-2 border-t border-white/10 flex items-start justify-between gap-3 text-xs font-mono">
                <div className="flex items-start gap-2 text-zinc-400 overflow-hidden">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2 text-[11px] text-zinc-300">
                    {activeScene.image_prompt}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyPromptText(activeScene.image_prompt)}
                  className="shrink-0 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                  title="Copy prompt"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-zinc-400" />
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

