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
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  }, [handleMove]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  }, [isDragging, handleMove]);

  return (
    <div
      ref={containerRef}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl select-none bg-black/40 border border-zinc-200 dark:border-white/10 cursor-ew-resize group",
        className
      )}
      style={{ aspectRatio: "16/9" }}
    >
      {/* After Image (Background Layer) */}
      <div className="absolute inset-0 w-full h-full">
        {isVideo ? (
          <video src={afterSrc} autoPlay loop muted playsInline className="w-full h-full object-contain" />
        ) : (
          <img src={afterSrc} alt="After" className="w-full h-full object-contain" />
        )}
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-indigo-500/80 backdrop-blur-md text-[11px] font-semibold text-white shadow-lg flex items-center gap-1">
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
          <video src={beforeSrc} autoPlay loop muted playsInline className="w-full h-full object-contain" />
        ) : (
          <img src={beforeSrc} alt="Before" className="w-full h-full object-contain" />
        )}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-semibold text-zinc-300 shadow-lg border border-white/10">
          {beforeLabel}
        </div>
      </div>

      {/* Divider Bar & Handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none transition-transform duration-75"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border-2 border-indigo-500 shadow-xl flex items-center justify-center text-zinc-800 dark:text-white transition-transform group-hover:scale-110">
          <ChevronsLeftRight className="w-4 h-4 text-indigo-500" />
        </div>
      </div>
    </div>
  );
}
