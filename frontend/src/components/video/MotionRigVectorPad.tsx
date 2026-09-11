"use client";

import React, { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import Dropdown from "@/components/ui/Dropdown";
import { Compass, RotateCcw, Camera } from "lucide-react";

export interface MotionRigConfig {
  orbitX: number; // -45 to +45 deg
  orbitY: number; // -30 to +30 deg
  pushSpeed: number; // 0 to 10 m/s
  craneElevation: number; // -5 to +5 m
  dutchRoll: number; // -45 to +45 deg
  focalLens: string;
  aperture: string;
  shutterAngle: string;
  colorLut: string;
}

export const FOCAL_LENSES = [
  { value: "35mm Prime", label: "35mm Prime (Cinema S35)" },
  { value: "50mm Anamorphic 2x", label: "50mm Anamorphic 2x" },
  { value: "85mm Portrait", label: "85mm Portrait (T1.4)" },
  { value: "24mm Ultra Wide", label: "24mm Ultra Wide Angle" },
  { value: "100mm Macro", label: "100mm Macro Close-Up" },
];

export const APERTURES = [
  { value: "T1.5 Master Shallow", label: "T1.5 Master (Ultra Shallow DoF)" },
  { value: "f/2.8 Cine Medium", label: "f/2.8 Cine Medium" },
  { value: "f/5.6 Deep Focus", label: "f/5.6 Deep Focus (Full Sharpness)" },
  { value: "f/11 Landscape Hyperfocal", label: "f/11 Hyperfocal" },
];

export const SHUTTER_ANGLES = [
  { value: "180.0° Cine", label: "180.0° Cine (1/48s Film Standard)" },
  { value: "90.0° Action", label: "90.0° Action (1/96s Crisp Motion)" },
  { value: "45.0° Strobe", label: "45.0° Strobe High-Kinetic" },
  { value: "360.0° Dream Glow", label: "360.0° Dream Shutter (Ghosting)" },
];

export const COLOR_LUTS = [
  { value: "Kodak Vision3 5219", label: "Kodak Vision3 5219 (Tungsten Warm)" },
  { value: "Fujifilm Eterna 250D", label: "Fujifilm Eterna 250D (Cool Pastel)" },
  { value: "Bleach Bypass 70%", label: "Bleach Bypass 70% (High Contrast)" },
  { value: "Teal & Orange", label: "Teal & Orange (Blockbuster)" },
  { value: "Noir High Contrast", label: "Noir High Contrast (Monochrome)" },
  { value: "Neutral D65 Linear", label: "Neutral D65 Linear (ACEScg)" },
];

export const DEFAULT_MOTION_RIG: MotionRigConfig = {
  orbitX: 14.2,
  orbitY: -3.8,
  pushSpeed: 3.8,
  craneElevation: 1.2,
  dutchRoll: -4.5,
  focalLens: "35mm Prime",
  aperture: "T1.5 Master Shallow",
  shutterAngle: "180.0° Cine",
  colorLut: "Kodak Vision3 5219",
};

interface MotionRigVectorPadProps {
  config: MotionRigConfig;
  onChange: (config: MotionRigConfig) => void;
  className?: string;
  isCompact?: boolean;
}

export default function MotionRigVectorPad({
  config,
  onChange,
  className,
}: MotionRigVectorPadProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Update Orbit X & Y based on click/drag inside pad
  const handleVectorMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!padRef.current) return;
      const rect = padRef.current.getBoundingClientRect();
      const xRel = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const yRel = Math.max(0, Math.min(rect.height, clientY - rect.top));

      // Normalized coordinates (-1 to 1)
      const nx = (xRel / rect.width) * 2 - 1;
      const ny = (yRel / rect.height) * 2 - 1;

      // Orbit X (-45 to +45 deg), Orbit Y (+30 to -30 deg)
      const newOrbitX = Math.round(nx * 45 * 10) / 10;
      const newOrbitY = Math.round(-ny * 30 * 10) / 10;

      onChange({
        ...config,
        orbitX: newOrbitX,
        orbitY: newOrbitY,
      });
    },
    [config, onChange]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleVectorMove(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleVectorMove(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetRig = () => {
    onChange(DEFAULT_MOTION_RIG);
  };

  // Convert orbitX/Y to SVG coordinate percentages (0 to 100)
  const padCenterX = 50 + (config.orbitX / 45) * 40;
  const padCenterY = 50 - (config.orbitY / 30) * 40;

  return (
    <div
      className={cn(
        "rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-black/[0.08] dark:border-white/[0.08] p-3 sm:p-4 space-y-3 font-mono text-xs",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
          <Compass className="w-3.5 h-3.5 text-emerald-500" />
          <span>6-Axis Motion Rig Trajectory</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
            VECTOR LOCK
          </span>
          <button
            type="button"
            onClick={resetRig}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Reset Rig to Default Trajectory"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2D Vector Coordinate Pad & Axis Sliders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        {/* Interactive 2D Vector Pad */}
        <div className="flex flex-col items-center bg-black/5 dark:bg-zinc-950/80 rounded-xl p-2.5 border border-black/10 dark:border-white/10 relative overflow-hidden select-none">
          <div className="w-full flex items-center justify-between text-[10px] text-zinc-400 mb-1">
            <span>ORBIT X / Y</span>
            <span className="text-emerald-500 font-bold">
              {config.orbitX >= 0 ? `+${config.orbitX}` : config.orbitX}° /{" "}
              {config.orbitY >= 0 ? `+${config.orbitY}` : config.orbitY}°
            </span>
          </div>

          <div
            ref={padRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-28 relative rounded-lg border border-black/10 dark:border-white/10 bg-zinc-900/30 dark:bg-black/40 cursor-crosshair overflow-hidden"
          >
            <svg className="w-full h-full text-zinc-700/60 pointer-events-none" viewBox="0 0 100 100">
              {/* Grid Lines */}
              <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeDasharray="2 2" strokeWidth="0.8" />
              <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeDasharray="2 2" strokeWidth="0.8" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 3" />
              <circle cx="50" cy="50" r="18" fill="none" stroke="currentColor" strokeWidth="0.6" />

              {/* Trajectory Arc to Current Point */}
              <path
                d={`M 50 50 Q 50 ${padCenterY} ${padCenterX} ${padCenterY}`}
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />

              {/* Center Cross Origin Dot */}
              <circle cx="50" cy="50" r="1.5" fill="#71717a" />

              {/* Active Vector Target Dot */}
              <circle cx={padCenterX} cy={padCenterY} r="5" fill="#10b981" />
              <circle cx={padCenterX} cy={padCenterY} r="9" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.6" className="animate-ping" />
            </svg>
          </div>

          <span className="text-[9px] uppercase tracking-wider text-zinc-500 mt-1.5 font-bold">
            Interactive Vector Coordinate Lock
          </span>
        </div>

        {/* Rig Axis Sliders: Push-In, Crane Elevation, Dutch Roll */}
        <div className="space-y-2.5">
          {/* Push-in Zoom Speed */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span>PUSH-IN (DOLLY ZOOM)</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-bold">{config.pushSpeed} m/s</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={config.pushSpeed}
              onChange={(e) => onChange({ ...config, pushSpeed: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 mt-1"
            />
          </div>

          {/* Crane Elevation */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span>CRANE ELEVATION</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                {config.craneElevation >= 0 ? `+${config.craneElevation}` : config.craneElevation} m
              </span>
            </div>
            <input
              type="range"
              min="-5"
              max="5"
              step="0.1"
              value={config.craneElevation}
              onChange={(e) => onChange({ ...config, craneElevation: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 mt-1"
            />
          </div>

          {/* Dutch Roll / Tilt */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span>DUTCH ROLL (TILT)</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                {config.dutchRoll >= 0 ? `+${config.dutchRoll}` : config.dutchRoll}°
              </span>
            </div>
            <input
              type="range"
              min="-45"
              max="45"
              step="0.5"
              value={config.dutchRoll}
              onChange={(e) => onChange({ ...config, dutchRoll: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 mt-1"
            />
          </div>
        </div>
      </div>

      {/* Virtual Optics & Camera Physics Selectors */}
      <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1 font-bold">
          <Camera className="w-3 h-3 text-emerald-500" />
          <span>Virtual Camera & Optics Emulation</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          {/* Focal Lens */}
          <div className="p-1 rounded-xl bg-black/5 dark:bg-zinc-950/60 border border-black/5 dark:border-white/5 space-y-0.5">
            <span className="text-[9px] uppercase text-zinc-400 block px-1.5 pt-0.5">Focal Lens</span>
            <Dropdown
              size="sm"
              value={config.focalLens}
              onChange={(val) => onChange({ ...config, focalLens: val })}
              options={FOCAL_LENSES.map((l) => ({ value: l.value, label: l.value }))}
              triggerClassName="bg-transparent border-0 shadow-none px-1.5 py-0.5"
            />
          </div>

          {/* Aperture */}
          <div className="p-1 rounded-xl bg-black/5 dark:bg-zinc-950/60 border border-black/5 dark:border-white/5 space-y-0.5">
            <span className="text-[9px] uppercase text-zinc-400 block px-1.5 pt-0.5">Aperture</span>
            <Dropdown
              size="sm"
              value={config.aperture}
              onChange={(val) => onChange({ ...config, aperture: val })}
              options={APERTURES.map((a) => ({ value: a.value, label: a.value.split(" ")[0] }))}
              triggerClassName="bg-transparent border-0 shadow-none px-1.5 py-0.5"
            />
          </div>

          {/* Shutter Angle */}
          <div className="p-1 rounded-xl bg-black/5 dark:bg-zinc-950/60 border border-black/5 dark:border-white/5 space-y-0.5">
            <span className="text-[9px] uppercase text-zinc-400 block px-1.5 pt-0.5">Shutter</span>
            <Dropdown
              size="sm"
              value={config.shutterAngle}
              onChange={(val) => onChange({ ...config, shutterAngle: val })}
              options={SHUTTER_ANGLES.map((s) => ({ value: s.value, label: s.value.split(" ")[0] }))}
              triggerClassName="bg-transparent border-0 shadow-none px-1.5 py-0.5"
            />
          </div>

          {/* Color LUT / Film Stock */}
          <div className="p-1 rounded-xl bg-black/5 dark:bg-zinc-950/60 border border-black/5 dark:border-white/5 space-y-0.5">
            <span className="text-[9px] uppercase text-zinc-400 block px-1.5 pt-0.5">Film / LUT</span>
            <Dropdown
              size="sm"
              value={config.colorLut}
              onChange={(val) => onChange({ ...config, colorLut: val })}
              options={COLOR_LUTS.map((c) => ({ value: c.value, label: c.value.split(" (")[0] }))}
              triggerClassName="bg-transparent border-0 shadow-none px-1.5 py-0.5"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
