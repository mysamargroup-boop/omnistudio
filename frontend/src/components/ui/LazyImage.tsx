"use client";

import React, { useState } from "react";
import { Image as ImageIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: string; // e.g. "aspect-square", "aspect-[3/4]", "aspect-video"
  showPlaceholder?: boolean;
}

export default function LazyImage({
  src,
  alt,
  className,
  containerClassName,
  aspectRatio = "aspect-square",
  showPlaceholder = true,
  onClick,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-zinc-100 dark:bg-zinc-900/80 select-none",
        aspectRatio,
        containerClassName
      )}
      onClick={onClick}
    >
      {/* Skeleton Shimmer Pulse while loading */}
      {!isLoaded && !hasError && showPlaceholder && (
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-200/50 via-zinc-100 to-zinc-200/50 dark:from-zinc-800/40 dark:via-zinc-800/80 dark:to-zinc-800/40 animate-pulse flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-zinc-300 dark:text-zinc-700 animate-pulse" />
        </div>
      )}

      {/* Error Fallback */}
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 space-y-1.5">
          <AlertCircle className="w-5 h-5 text-zinc-400" />
          <span className="text-[10px] font-mono uppercase tracking-wider">Preview Unavailable</span>
        </div>
      ) : (
        /* Image with Smooth Fade & Blur-up Transition */
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            "w-full h-full object-cover transition-all duration-700 ease-out will-change-[opacity,transform,filter]",
            isLoaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-[1.03] blur-xs",
            className
          )}
          {...props}
        />
      )}
    </div>
  );
}
