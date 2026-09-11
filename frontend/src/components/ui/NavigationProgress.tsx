"use client";

import React, { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  // When pathname or searchParams change, navigation has finished
  useEffect(() => {
    if (isNavigating) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Intercept all internal Link clicks for 0ms instant feedback
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      // Only internal routes
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("//") &&
        target.getAttribute("target") !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        // If clicking the current exact route, don't trigger
        const currentFull = window.location.pathname + window.location.search;
        if (href === currentFull || href === window.location.pathname) {
          return;
        }

        setIsNavigating(true);
        setProgress(25);

        // Gradually advance progress while waiting for chunk
        const t1 = setTimeout(() => setProgress(60), 100);
        const t2 = setTimeout(() => setProgress(85), 350);

        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }
    };

    const handleCustomStart = () => {
      setIsNavigating(true);
      setProgress(30);
    };

    const handleCustomEnd = () => {
      setProgress(100);
      setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 250);
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });
    window.addEventListener("omni-nav-start", handleCustomStart);
    window.addEventListener("omni-nav-end", handleCustomEnd);

    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
      window.removeEventListener("omni-nav-start", handleCustomStart);
      window.removeEventListener("omni-nav-end", handleCustomEnd);
    };
  }, []);

  if (!isNavigating && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[3px] bg-transparent">
      {/* Glow shadow container */}
      <div
        className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 transition-all duration-200 ease-out shadow-[0_0_12px_rgba(16,185,129,0.9)] relative"
        style={{ width: `${progress}%` }}
      >
        {/* Shimmer head */}
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-r from-transparent to-white/80 animate-pulse" />
      </div>
    </div>
  );
}
