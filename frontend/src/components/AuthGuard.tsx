"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { ShieldAlert, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import Spinner from "@/components/ui/Spinner";
import NavigationProgress from "@/components/ui/NavigationProgress";
import { Suspense } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = pathname === "/login" || pathname?.startsWith("/auth/callback");

  useEffect(() => {
    if (!loading && !isAuthenticated && !isPublicRoute) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, isPublicRoute, router]);

  // If on public login route, render standalone without sidebar/header
  if (isPublicRoute) {
    return <main className="min-h-screen w-full bg-[var(--bg-primary)]">{children}</main>;
  }

  // If checking authentication state, show polished dark splash loader
  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#07070a] text-white">
        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-center shadow-2xl backdrop-blur-md">
            <Spinner size="md" variant="emerald" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-xs font-mono font-bold tracking-[0.25em] text-zinc-300 uppercase">
              OmniStudio Workstation
            </p>
            <p className="text-[10px] font-mono text-zinc-500">Verifying Security Credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated and attempting to view a protected route, show redirect screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#07070a] text-white">
        <div className="flex flex-col items-center gap-3 text-center">
          <ShieldAlert className="w-8 h-8 text-amber-500 animate-bounce" />
          <p className="text-sm font-heading font-semibold text-zinc-200">Authentication Required</p>
          <p className="text-xs font-mono text-zinc-500">Redirecting to Studio Passcode Unlock...</p>
        </div>
      </div>
    );
  }

  const isStudioRoute = pathname === "/video" || pathname === "/studio";

  // Authenticated: Render full workspace with navigation
  return (
    <>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Sidebar />
      <div className={cn(
        "lg:ml-64 ml-0 flex flex-col bg-[var(--bg-primary)] text-zinc-900 dark:text-zinc-100 transition-colors duration-200 max-w-full overflow-x-clip",
        isStudioRoute ? "h-screen max-h-screen overflow-hidden" : "min-h-screen"
      )}>
        <div className="sticky top-0 z-40 w-full py-2 px-3 sm:px-6 bg-[var(--bg-primary)]/85 backdrop-blur-xl border-b border-transparent transition-all flex-shrink-0">
          <Header />
        </div>
        <main className={cn(
          "flex-1 w-full overflow-x-clip min-h-0 flex flex-col",
          isStudioRoute ? "p-0 overflow-hidden" : "px-4 sm:px-8 py-4 max-w-7xl mx-auto"
        )}>
          <PageTransition className={isStudioRoute ? "h-full flex-1 flex flex-col min-h-0" : undefined}>{children}</PageTransition>
        </main>
      </div>
    </>
  );
}
