"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Plus,
  Trash2,
  Clapperboard,
  CheckCircle2,
  Loader2,
  Clock,
  Sparkles,
  ChevronDown,
  Layers,
} from "lucide-react";
import { getMediaUrl } from "@/lib/api";

export interface StoryboardShot {
  id: string;
  shotNumber: number;
  title: string;
  prompt: string;
  duration: number;
  model: string;
  version: string;
  status: "approved" | "rendering" | "queued" | "draft";
  progress?: number;
  thumbnailUrl?: string;
  videoUrl?: string;
  cameraTrajectory?: string;
  creditsEstimate?: number;
}

const DEFAULT_SHOTS: StoryboardShot[] = [
  {
    id: "shot-1",
    shotNumber: 1,
    title: "Alley Encounter",
    prompt: "35mm anamorphic, neon reflections, rain drenched asphalt, cyberpunk operative with glowing neural interface collar, slow orbit push-in, shallow depth of field, chiaroscuro lighting, volumetric steam, 24fps Kodak 5219 texture",
    duration: 4.0,
    model: "RUNWAY G3",
    version: "v3",
    status: "approved",
    thumbnailUrl: "/outputs/images/shot_alley.jpg",
    cameraTrajectory: "PAN R 15° · DOLLY 2.2M/S",
    creditsEstimate: 12,
  },
  {
    id: "shot-2",
    shotNumber: 2,
    title: "Vance Reaction Close",
    prompt: "Tight cinematic portrait shot of cyber detective with intense focused gaze, rain drops dripping from leather coat collar, neon bokeh, 85mm portrait T1.4 aperture, subtle facial micro-expression",
    duration: 3.5,
    model: "KLING 2.0",
    version: "v2",
    status: "rendering",
    progress: 74,
    thumbnailUrl: "/outputs/images/shot_vance.jpg",
    cameraTrajectory: "PUSH IN · 50MM T1.5",
    creditsEstimate: 15,
  },
  {
    id: "shot-3",
    shotNumber: 3,
    title: "Alien Terrain Transition",
    prompt: "Wide expansive panoramic drone shot descending over glowing bioluminescent crystalline sand dunes under twin moons, atmospheric dust haze, anamorphic flare",
    duration: 6.0,
    model: "LUMA DREAM",
    version: "v1",
    status: "queued",
    cameraTrajectory: "CRANE DOWN 18M/S",
    creditsEstimate: 18,
  },
  {
    id: "shot-4",
    shotNumber: 4,
    title: "Atmosphere Entry",
    prompt: "High kinetic exterior tracking shot of tactical stealth gunship piercing low neon clouds into city skyline, engine plasma trails, dynamic handheld turbulence",
    duration: 3.6,
    model: "FFMPEG LOCAL",
    version: "v1",
    status: "draft",
    cameraTrajectory: "DYNAMIC HANDHELD",
    creditsEstimate: 4,
  },
];

interface StoryboardTimelineStripProps {
  activeShotId: string | null;
  onSelectShot: (shot: StoryboardShot) => void;
  className?: string;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export default function StoryboardTimelineStrip({
  activeShotId,
  onSelectShot,
  className,
  isOpen,
  onToggleOpen,
}: StoryboardTimelineStripProps) {
  const [shots, setShots] = useState<StoryboardShot[]>(DEFAULT_SHOTS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState("1.0x");
  const [timelineZoom, setTimelineZoom] = useState(60);

  // Load saved sequence from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("omnistudio_video_storyboard_shots");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setShots(parsed);
        }
      }
    } catch {}
  }, []);

  const saveShots = (newShots: StoryboardShot[]) => {
    setShots(newShots);
    try {
      localStorage.setItem("omnistudio_video_storyboard_shots", JSON.stringify(newShots));
    } catch {}
  };

  const handleAddShot = () => {
    const nextNum = shots.length + 1;
    const newShot: StoryboardShot = {
      id: `shot-${Date.now()}`,
      shotNumber: nextNum,
      title: `Shot 0${nextNum} Sequence`,
      prompt: "Cinematic shot with master lighting and dynamic camera kinematics...",
      duration: 4.0,
      model: "FFMPEG LOCAL",
      version: "v1",
      status: "draft",
      cameraTrajectory: "ORBIT ARC 15°",
      creditsEstimate: 6,
    };
    const updated = [...shots, newShot];
    saveShots(updated);
    onSelectShot(newShot);
  };

  const handleDeleteShot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (shots.length <= 1) return;
    const updated = shots
      .filter((s) => s.id !== id)
      .map((s, idx) => ({ ...s, shotNumber: idx + 1 }));
    saveShots(updated);
    if (activeShotId === id && updated.length > 0) {
      onSelectShot(updated[0]);
    }
  };

  // Calculate total sequence duration
  const totalDuration = shots.reduce((acc, s) => acc + s.duration, 0);
  const totalDurationStr = `00:00:${Math.floor(totalDuration).toString().padStart(2, "0")}:${Math.round((totalDuration % 1) * 24).toString().padStart(2, "0")}`;

  if (!isOpen) {
    return (
      <div className="w-full bg-zinc-950/90 border-t border-white/10 px-4 py-2 flex items-center justify-between text-xs font-mono select-none">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-4 h-4 text-emerald-500" />
          <span className="text-zinc-200 font-bold uppercase tracking-wider">Storyboard Sequence Strip</span>
          <span className="text-[10px] text-zinc-500 font-mono">({shots.length} SHOTS · {totalDuration.toFixed(1)}s TOTAL)</span>
        </div>
        <button
          type="button"
          onClick={onToggleOpen}
          className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all cursor-pointer"
        >
          Open Storyboard
        </button>
      </div>
    );
  }

  return (
    <div className={cn("w-full bg-zinc-950/95 backdrop-blur-xl border-t border-white/10 flex flex-col font-mono text-xs select-none shadow-2xl", className)}>
      {/* Top Bar: Sequence Manifest & Master SMPTE Transport Controls */}
      <div className="px-3 sm:px-4 py-2 bg-black/60 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
        {/* Left: Sequence Title & Metadata */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="flex items-center gap-1.5 font-bold text-white uppercase tracking-wider text-[11px]">
            <Clapperboard className="w-3.5 h-3.5 text-emerald-500" />
            <span>SEQ_04_CYBER_RAIN</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              SCENE 08
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-zinc-400 text-[10px]">
            <span>FPS: <strong className="text-white">24.00 SMPTE</strong></span>
            <span>·</span>
            <span>TOTAL DURATION: <strong className="text-emerald-400">{totalDurationStr}</strong></span>
          </div>
        </div>

        {/* Center: Transport Controls & SMPTE Master Timecode */}
        <div className="flex items-center gap-2">
          {/* Step Back */}
          <button
            type="button"
            onClick={() => {
              const curIdx = shots.findIndex((s) => s.id === activeShotId);
              if (curIdx > 0) onSelectShot(shots[curIdx - 1]);
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Previous Shot"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Play / Pause Sequence */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
            title={isPlaying ? "Pause Sequence" : "Play Sequence"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span className="text-[10px] font-bold">{isPlaying ? "PAUSE" : "PLAY"}</span>
          </button>

          {/* Step Next */}
          <button
            type="button"
            onClick={() => {
              const curIdx = shots.findIndex((s) => s.id === activeShotId);
              if (curIdx < shots.length - 1) onSelectShot(shots[curIdx + 1]);
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Next Shot"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Loop Toggle */}
          <button
            type="button"
            onClick={() => setIsLooping(!isLooping)}
            className={cn(
              "p-1.5 rounded-lg transition-colors cursor-pointer",
              isLooping ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "hover:bg-white/10 text-zinc-400"
            )}
            title="Loop Sequence"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          {/* Master SMPTE Timecode Display */}
          <div className="ml-1 sm:ml-3 px-2 py-1 rounded bg-black/80 border border-white/10 text-[11px] font-bold tracking-wider">
            <span className="text-zinc-500">TC: </span>
            <span className="text-emerald-400">00:00:04:18</span>
            <span className="text-zinc-500 font-normal"> / {totalDurationStr}</span>
          </div>
        </div>

        {/* Right: Close / Collapse Drawer */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400 font-normal hidden lg:inline">
            SNAP: FRAME
          </span>
          <button
            type="button"
            onClick={onToggleOpen}
            className="px-2 py-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] uppercase transition-colors cursor-pointer"
          >
            Hide
          </button>
        </div>
      </div>

      {/* Horizontal Storyboard Shot Cards Container */}
      <div className="p-3 overflow-x-auto flex items-stretch gap-3 custom-scrollbar">
        {shots.map((shot) => {
          const isActive = shot.id === activeShotId;
          return (
            <div
              key={shot.id}
              onClick={() => onSelectShot(shot)}
              className={cn(
                "w-60 sm:w-64 shrink-0 rounded-xl p-2.5 flex flex-col gap-2 transition-all cursor-pointer border relative group select-none",
                isActive
                  ? "bg-zinc-900 border-emerald-500 shadow-md ring-1 ring-emerald-500/40"
                  : "bg-zinc-900/60 hover:bg-zinc-900 border-white/[0.08] hover:border-white/20"
              )}
            >
              {/* Thumbnail Container with Shot Number and Duration */}
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black/80 border border-white/10 flex items-center justify-center">
                {shot.thumbnailUrl ? (
                  <img src={getMediaUrl(shot.thumbnailUrl)} alt={shot.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-zinc-600">
                    <Clapperboard className="w-6 h-6" />
                    <span className="text-[9px] uppercase tracking-wider">Awaiting Render</span>
                  </div>
                )}

                {/* Shot Number Badge */}
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[10px] font-bold text-white">
                  0{shot.shotNumber}
                </span>

                {/* Duration Badge */}
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[10px] font-bold text-emerald-400">
                  {shot.duration.toFixed(1)}s
                </span>

                {/* Active Indicator Overlay */}
                {isActive && <div className="absolute inset-0 border-2 border-emerald-500 rounded-lg pointer-events-none" />}
              </div>

              {/* Shot Title and Version Chip */}
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs truncate max-w-[140px]">
                  {shot.title}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-black/50 text-[9px] text-emerald-400 font-bold border border-white/10">
                  {shot.version}
                </span>
              </div>

              {/* Trajectory & Model Metadata */}
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span className="truncate">{shot.cameraTrajectory || "ORBIT 15°"}</span>
                <span className="text-zinc-500 font-semibold">{shot.model}</span>
              </div>

              {/* Status Bar & Delete Button */}
              <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06] text-[10px]">
                {shot.status === "approved" && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>APPROVED</span>
                  </span>
                )}
                {shot.status === "rendering" && (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>RENDERING {shot.progress || 50}%</span>
                  </span>
                )}
                {shot.status === "queued" && (
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>QUEUED</span>
                  </span>
                )}
                {shot.status === "draft" && (
                  <span className="text-zinc-500 flex items-center gap-1">
                    <span>DRAFT</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={(e) => handleDeleteShot(shot.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 transition-all cursor-pointer"
                  title="Delete Shot"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Add Shot Card */}
        <button
          type="button"
          onClick={handleAddShot}
          className="w-48 shrink-0 rounded-xl p-3 flex flex-col items-center justify-center gap-2 border border-dashed border-white/20 hover:border-emerald-500/60 bg-white/[0.02] hover:bg-emerald-500/[0.04] text-zinc-400 hover:text-emerald-400 transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-emerald-500/20 flex items-center justify-center text-zinc-300 group-hover:text-emerald-400 transition-colors">
            <Plus className="w-4 h-4" />
          </div>
          <span className="font-bold text-xs">ADD SHOT</span>
          <span className="text-[10px] text-zinc-500">Append next sequence take</span>
        </button>
      </div>
    </div>
  );
}
