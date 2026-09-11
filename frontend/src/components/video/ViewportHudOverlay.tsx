"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Grid, Eye, EyeOff, Film, Camera } from "lucide-react";

interface ViewportHudOverlayProps {
  showHud: boolean;
  onToggleHud: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showScope: boolean;
  onToggleScope: () => void;
  aspectRatio: string;
  fps: number;
  resolution: string;
  timecode?: string;
  characterName?: string;
  orbitX?: number;
  orbitY?: number;
  motionLabel?: string;
  focalLens?: string;
  className?: string;
}

export default function ViewportHudOverlay({
  showHud,
  onToggleHud,
  showGrid,
  onToggleGrid,
  showScope,
  onToggleScope,
  aspectRatio,
  fps,
  resolution,
  timecode = "00:00:04:18",
  characterName,
  orbitX = 14.2,
  orbitY = -3.8,
  motionLabel = "Orbit Arc",
  focalLens = "35mm Prime",
  className,
}: ViewportHudOverlayProps) {
  return (
    <>
      {/* Top Floating Viewport Toolbar (Grid, Scope, HUD toggle) */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 p-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white font-mono text-[10px]">
        <button
          type="button"
          onClick={onToggleGrid}
          className={cn(
            "px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer",
            showGrid ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "hover:bg-white/10 text-zinc-400"
          )}
          title="Toggle 4x4 Framing Grid"
        >
          <Grid className="w-3 h-3" />
          <span>GRID</span>
        </button>

        <button
          type="button"
          onClick={onToggleScope}
          className={cn(
            "px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer",
            showScope ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "hover:bg-white/10 text-zinc-400"
          )}
          title="Toggle 2.39:1 Anamorphic Cinema Scope"
        >
          <Film className="w-3 h-3" />
          <span>SCOPE</span>
        </button>

        <button
          type="button"
          onClick={onToggleHud}
          className={cn(
            "px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer font-bold",
            showHud ? "bg-emerald-500 text-zinc-950 shadow-xs" : "hover:bg-white/10 text-zinc-400"
          )}
          title="Toggle Cinematic Telemetry HUD"
        >
          {showHud ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>HUD</span>
        </button>
      </div>

      {/* 4x4 Grid Overlay */}
      {showGrid && (
        <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-4 grid-rows-4 border border-white/10">
          <div className="border-r border-b border-white/[0.08]" />
          <div className="border-r border-b border-white/[0.08]" />
          <div className="border-r border-b border-white/[0.08]" />
          <div className="border-b border-white/[0.08]" />
          <div className="border-r border-b border-white/[0.08]" />
          <div className="border-r border-b border-white/[0.08]" />
          <div className="border-r border-b border-white/[0.08]" />
          <div className="border-b border-white/[0.08]" />
          <div className="border-r border-b border-white/[0.08]" />
          <div className="border-r border-b border-white/[0.08]" />
          <div className="border-r border-b border-white/[0.08]" />
          <div className="border-b border-white/[0.08]" />
          <div className="border-r border-white/[0.08]" />
          <div className="border-r border-white/[0.08]" />
          <div className="border-r border-white/[0.08]" />
          <div className="" />
        </div>
      )}

      {/* Anamorphic Scope Mask (Cinemascope 2.39:1 Letterbox Bars) */}
      {showScope && (
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between">
          <div className="w-full h-[8%] bg-black/90 backdrop-blur-xs border-b border-white/10 flex items-center justify-between px-3 text-[9px] font-mono text-zinc-500">
            <span>ANAMORPHIC SCOPE 2.39:1 MASK</span>
            <span>COLORSPACE: ACEScg (LINEAR)</span>
          </div>
          <div className="w-full h-[8%] bg-black/90 backdrop-blur-xs border-t border-white/10 flex items-center justify-between px-3 text-[9px] font-mono text-zinc-500">
            <span>RASTER: {(resolution || "1080p").toUpperCase()} DCI-P3 D65</span>
            <span>SHUTTER: 180.0° CINE</span>
          </div>
        </div>
      )}

      {/* Full Cinematic Telemetry HUD Overlay */}
      {showHud && (
        <div className={cn("absolute inset-0 pointer-events-none z-[25] flex flex-col justify-between p-3 sm:p-4 select-none font-mono text-white", className)}>
          {/* Top Telemetry Row */}
          <div className="flex items-start justify-between gap-2">
            {/* Top-Left: REC & Sensor Stamp */}
            <div className="flex flex-col gap-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-[10px] text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>REC {fps || 24}.00P [{(focalLens || "35mm Prime").toUpperCase()}]</span>
              </div>
              <div className="text-[9px] text-zinc-400 px-1 font-mono tracking-wider drop-shadow-md">
                BUFFER: 120/120 F · SHUTTER 1/48s
              </div>
            </div>

            {/* Top-Right: SMPTE Master Timecode & Parallax */}
            <div className="flex flex-col items-end gap-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-[11px] text-zinc-100 font-bold">
                <span className="text-zinc-400 font-normal">TC:</span>
                <span className="text-emerald-400 tracking-wider">{timecode}</span>
              </div>
              <div className="text-[9px] text-zinc-400 px-1 font-mono tracking-wider drop-shadow-md">
                PARALLAX LOCK: 98.4% · {aspectRatio}
              </div>
            </div>
          </div>

          {/* Center Optical Target Crosshairs & Trajectory Arc */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg className="w-64 h-64 sm:w-80 sm:h-80 text-emerald-500/40 pointer-events-none drop-shadow-lg" viewBox="0 0 200 200">
              {/* Concentric Reticle Rings */}
              <circle cx="100" cy="100" r="45" stroke="currentColor" strokeDasharray="3 3" strokeWidth="0.8" fill="none" />
              <circle cx="100" cy="100" r="20" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.6" />
              <circle cx="100" cy="100" r="3" fill="#10b981" />

              {/* Crosshair Spikes */}
              <line x1="20" y1="100" x2="65" y2="100" stroke="currentColor" strokeWidth="0.8" />
              <line x1="135" y1="100" x2="180" y2="100" stroke="currentColor" strokeWidth="0.8" />
              <line x1="100" y1="20" x2="100" y2="65" stroke="currentColor" strokeWidth="0.8" />
              <line x1="100" y1="135" x2="100" y2="180" stroke="currentColor" strokeWidth="0.8" />

              {/* Dynamic Camera Pan Trajectory Arc: CAM_START to CAM_END */}
              <path
                d="M 55 125 Q 100 145 150 115"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                fill="none"
              />
              <polygon points="152,110 158,118 148,120" fill="#10b981" />

              {/* Trajectory Labels */}
              <text x="35" y="140" fill="#a1a1aa" fontSize="6" fontFamily="monospace">CAM_START [T0]</text>
              <text x="135" y="105" fill="#10b981" fontSize="6" fontFamily="monospace" fontWeight="bold">CAM_END [T120]</text>
            </svg>
          </div>

          {/* Bottom Telemetry Row */}
          <div className="flex items-end justify-between gap-2">
            {/* Bottom-Left: 3D Coordinate Vectors & Rig Readout */}
            <div className="flex flex-col gap-1">
              <div className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-[10px] text-zinc-300">
                <span className="text-zinc-500 mr-1.5">COORDS:</span>
                <span className="text-emerald-400 font-bold">
                  X{orbitX >= 0 ? `+${orbitX}` : orbitX}° Y{orbitY >= 0 ? `+${orbitY}` : orbitY}° Z+2.4m
                </span>
              </div>
              <div className="text-[9px] text-zinc-400 px-1 font-mono tracking-wider drop-shadow-md">
                RIG: {(motionLabel || "Static").toUpperCase()} · STAGE_A ACTIVE
              </div>
            </div>

            {/* Bottom-Right: Identity Anchor & Resolution */}
            <div className="flex flex-col items-end gap-1">
              <div className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-[10px]">
                <span className="text-zinc-400 mr-1.5">IDENTITY:</span>
                <span className="text-emerald-400 font-bold uppercase">
                  {characterName ? `ANCHORED (${characterName})` : "UNBOUND SEED"}
                </span>
              </div>
              <div className="text-[9px] text-zinc-400 px-1 font-mono tracking-wider drop-shadow-md">
                {(resolution || "1080p").toUpperCase()} MASTER · PRORES 422 HQ
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
