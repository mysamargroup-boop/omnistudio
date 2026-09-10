"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    setTransitioning(true);
    const timer = setTimeout(() => setTransitioning(false), 250);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div key={pathname} className={cn("relative", transitioning && "animate-page-enter")}>
      {transitioning && (
        <div className="fixed top-0 left-0 lg:left-64 right-0 h-[2px] bg-gradient-to-r from-transparent via-zinc-950 to-transparent dark:via-white z-50 animate-top-progress pointer-events-none" />
      )}
      {children}
    </div>
  );
}
