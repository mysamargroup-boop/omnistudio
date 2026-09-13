"use client";
import React from "react";
import { cn } from "@/lib/utils";
import {
  ImageIcon,
  Film,
  Mic,
  FileText,
  RotateCcw,
  Play,
  Download,
  Eye,
} from "lucide-react";
import { getMediaUrl } from "@/lib/api";

interface SceneData {
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
    <div className={cn(
      "grid gap-3",
      compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    )}>
      {scenes.map((scene, i) => {
        const hasImage = !!scene.image_path;
        const hasVideo = !!scene.video_path;
        const hasAudio = !!scene.audio_path;
        const imageUrl = hasImage ? getMediaUrl(scene.image_path!) : null;
        const videoUrl = hasVideo ? getMediaUrl(scene.video_path!) : null;

        return (
          <div
            key={scene.index ?? i}
            className="group rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0e0e16] overflow-hidden transition-all hover:shadow-md hover:border-emerald-500/20"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              {hasVideo ? (
                <video
                  src={videoUrl!}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  playsInline
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                />
              ) : hasImage ? (
                <img src={imageUrl!} alt={scene.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                </div>
              )}

              {/* Scene Number Badge */}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono font-bold">
                Scene {(scene.index ?? i) + 1}
              </div>

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {onPreviewScene && (
                  <button
                    type="button"
                    onClick={() => onPreviewScene(scene.index ?? i)}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                {onRegenerateScene && (
                  <button
                    type="button"
                    onClick={() => onRegenerateScene(scene.index ?? i)}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Asset Indicators */}
              <div className="absolute bottom-2 right-2 flex items-center gap-1">
                {hasImage && (
                  <div className="w-5 h-5 rounded-md bg-emerald-500/80 flex items-center justify-center">
                    <ImageIcon className="w-3 h-3 text-white" />
                  </div>
                )}
                {hasVideo && (
                  <div className="w-5 h-5 rounded-md bg-blue-500/80 flex items-center justify-center">
                    <Film className="w-3 h-3 text-white" />
                  </div>
                )}
                {hasAudio && (
                  <div className="w-5 h-5 rounded-md bg-violet-500/80 flex items-center justify-center">
                    <Mic className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            {!compact && (
              <div className="p-3 space-y-1.5">
                <h4 className="text-xs font-heading font-bold text-zinc-900 dark:text-white truncate">
                  {scene.title || `Scene ${(scene.index ?? i) + 1}`}
                </h4>
                {scene.script && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {scene.script}
                  </p>
                )}
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                  {scene.camera_angle && <span>Angle: {scene.camera_angle}</span>}
                  {scene.duration_seconds > 0 && <span>Duration: {scene.duration_seconds}s</span>}
                  {scene.motion_type && <span>Motion: {scene.motion_type}</span>}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
