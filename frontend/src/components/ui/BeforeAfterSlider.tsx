"use client";
import React, { useState, useRef, useCallback } from "react";
import { ChevronsLeftRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  isVideo?: boolean;
  className?: string;
}

export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Original",
  afterLabel = "AI Enhanced",
  isVideo = false,
  className
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage (0 - 100)
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    handleMove(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl select-none touch-none bg-black/40 border border-zinc-200 dark:border-white/10 cursor-ew-resize group",
        className
      )}
      style={{ minHeight: "360px", maxHeight: "72vh" }}
    >
      {/* After Image (Background Layer) */}
      <div className="absolute inset-0 w-full h-full">
        {isVideo ? (
          <video src={afterSrc} autoPlay loop muted playsInline className="w-full h-full object-contain pointer-events-none" />
        ) : (
          <img src={afterSrc} alt="After" className="w-full h-full object-contain pointer-events-none" />
        )}
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-indigo-500/90 backdrop-blur-md text-[11px] font-semibold text-white shadow-lg flex items-center gap-1 pointer-events-none">
          <Sparkles className="w-3 h-3" />
          {afterLabel}
        </div>
      </div>

      {/* Before Image (Clipped Overlay Layer) */}
      <div
        className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
        style={{
          clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`
        }}
      >
        {isVideo ? (
          <video src={beforeSrc} autoPlay loop muted playsInline className="w-full h-full object-contain pointer-events-none" />
        ) : (
          <img src={beforeSrc} alt="Before" className="w-full h-full object-contain pointer-events-none" />
        )}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-semibold text-zinc-300 shadow-lg border border-white/10 pointer-events-none">
          {beforeLabel}
        </div>
      </div>

      {/* Divider Bar & Handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] pointer-events-none transition-none"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border-2 border-indigo-500 shadow-2xl flex items-center justify-center text-zinc-800 dark:text-white transition-transform group-hover:scale-110 active:scale-95">
          <ChevronsLeftRight className="w-4 h-4 text-indigo-500" />
        </div>
      </div>
    </div>
  );
}
