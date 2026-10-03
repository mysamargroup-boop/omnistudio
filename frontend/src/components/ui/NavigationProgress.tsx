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
      const isDownload = target.hasAttribute("download");
      const isHash = href && href.startsWith("#");
      // Only internal routes
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("//") &&
        !isDownload &&
        !isHash &&
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
        setProgress(30);

        // Smoothly advance progress bar while waiting for route chunk
        const t1 = setTimeout(() => setProgress(55), 180);
        const t2 = setTimeout(() => setProgress(75), 450);
        const t3 = setTimeout(() => setProgress(88), 1100);
        const t4 = setTimeout(() => setProgress(94), 2500);

        // Safety timeout: Only if route is completely aborted/stuck after 15s, quietly reset without fake 100%
        const tSafety = setTimeout(() => {
          setIsNavigating(false);
          setProgress(0);
        }, 15000);

        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
          clearTimeout(t4);
          clearTimeout(tSafety);
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
