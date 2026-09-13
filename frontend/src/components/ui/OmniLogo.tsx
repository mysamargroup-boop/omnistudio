import React from "react";

interface OmniLogoProps {
  size?: number | string;
  className?: string;
  showText?: boolean;
  textSize?: "sm" | "md" | "lg";
}

export default function OmniLogo({
  size = 28,
  className = "",
  showText = false,
  textSize = "md",
}: OmniLogoProps) {
  const numericSize = typeof size === "number" ? size : 28;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Sleek Minimalist Luxury Aperture Spark Logo */}
      <svg
        width={numericSize}
        height={numericSize}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
      >
        <defs>
          <linearGradient id="omni-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="omni-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Subtle Ambient Rounded Outer Frame */}
        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="11"
          fill="currentColor"
          fillOpacity="0.04"
          stroke="url(#omni-grad)"
          strokeWidth="1.2"
        />

        {/* Minimal Kinetic O Orbit */}
        <circle
          cx="20"
          cy="20"
          r="10"
          stroke="url(#omni-grad)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="45 18"
        />

        {/* Precision Center Star Spark */}
        <path
          d="M20 13V27M13 20H27"
          stroke="#10B981"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="20" cy="20" r="2.2" fill="#FFFFFF" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={`font-heading font-extrabold tracking-tight text-zinc-950 dark:text-white ${
              textSize === "sm" ? "text-xs" : textSize === "lg" ? "text-lg" : "text-sm"
            }`}
          >
            Omni<span className="text-emerald-500">Studio</span>
          </span>
          <span className="text-[8px] font-mono tracking-widest text-zinc-400 dark:text-zinc-500 uppercase mt-0.5">
            AI WORKSTATION
          </span>
        </div>
      )}
    </div>
  );
}
