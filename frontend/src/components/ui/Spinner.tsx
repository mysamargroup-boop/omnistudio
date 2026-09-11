"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "emerald" | "cyan" | "violet" | "white" | "current";
  className?: string;
  label?: string;
  labelPosition?: "right" | "bottom";
}

const sizeMap = {
  xs: "w-3.5 h-3.5",
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

const strokeMap = {
  xs: 2.5,
  sm: 2.5,
  md: 2.2,
  lg: 2.0,
  xl: 1.8,
};

const variantColorMap = {
  emerald: {
    track: "text-emerald-500/20 dark:text-emerald-400/20",
    arc: "text-emerald-500 dark:text-emerald-400",
    glow: "bg-emerald-500/25",
    dot: "bg-emerald-400",
  },
  cyan: {
    track: "text-cyan-500/20 dark:text-cyan-400/20",
    arc: "text-cyan-500 dark:text-cyan-400",
    glow: "bg-cyan-500/25",
    dot: "bg-cyan-400",
  },
  violet: {
    track: "text-violet-500/20 dark:text-violet-400/20",
    arc: "text-violet-500 dark:text-violet-400",
    glow: "bg-violet-500/25",
    dot: "bg-violet-400",
  },
  white: {
    track: "text-white/20",
    arc: "text-white",
    glow: "bg-white/20",
    dot: "bg-white",
  },
  current: {
    track: "opacity-20",
    arc: "opacity-100",
    glow: "bg-current opacity-20",
    dot: "bg-current",
  },
};

export default function Spinner({
  size = "md",
  variant = "emerald",
  className,
  label,
  labelPosition = "right",
}: SpinnerProps) {
  const sizeClasses = sizeMap[size] || sizeMap.md;
  const strokeWidth = strokeMap[size] || 2.2;
  const colors = variantColorMap[variant] || variantColorMap.emerald;

  const spinnerContent = (
    <div className={cn("relative inline-flex items-center justify-center shrink-0", sizeClasses, className)}>
      {/* Subtle background ambient luminescence for luxury high-end look */}
      <span
        className={cn(
          "absolute inset-0 rounded-full blur-[3px] animate-pulse pointer-events-none",
          colors.glow
        )}
      />

      {/* Dual orbital SVG rotating ring */}
      <svg
        className="w-full h-full animate-spin will-change-transform"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background track circle */}
        <circle
          cx="12"
          cy="12"
          r="9.5"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={colors.track}
        />
        {/* Foreground active glowing arc with rounded tips */}
        <path
          d="M12 2.5C17.2467 2.5 21.5 6.75329 21.5 12"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={colors.arc}
        />
      </svg>

      {/* Central luminous micro-dot on larger sizes */}
      {(size === "lg" || size === "xl") && (
        <span
          className={cn(
            "absolute rounded-full animate-ping opacity-75 pointer-events-none",
            size === "xl" ? "w-1.5 h-1.5" : "w-1 h-1",
            colors.dot
          )}
        />
      )}
    </div>
  );

  if (!label) {
    return spinnerContent;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5",
        labelPosition === "bottom" ? "flex-col justify-center text-center" : "flex-row"
      )}
    >
      {spinnerContent}
      <span className="text-xs font-mono font-medium tracking-wide text-zinc-600 dark:text-zinc-400">
        {label}
      </span>
    </div>
  );
}
