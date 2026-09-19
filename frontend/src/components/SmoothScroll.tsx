"use client";
import { useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Disable smooth scroll if reduced motion is preferred or on low-power devices
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const lenis = new Lenis({
      duration: 0.9,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      touchMultiplier: 1.2,
      prevent: (node) => {
        if (!node || !(node instanceof HTMLElement)) return false;
        return !!node.closest(
          "[data-lenis-prevent], .overflow-y-auto, .overflow-y-scroll, .custom-scrollbar, textarea, [role='dialog'], select, input"
        );
      },
    });

    let rafId: number | null = null;
    let isRunning = true;

    function raf(time: number) {
      if (!isRunning) return;
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    // Pause RAF when document is hidden to conserve CPU/GPU
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isRunning = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      } else {
        if (!isRunning) {
          isRunning = true;
          rafId = requestAnimationFrame(raf);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    rafId = requestAnimationFrame(raf);

    return () => {
      isRunning = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (rafId) cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
