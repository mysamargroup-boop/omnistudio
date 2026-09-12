"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Image as ImageIcon,
  Video,
  Mic,
  Cpu,
  FolderArchive,
  Sliders,
  Radio,
  Plus,
  Zap,
  ExternalLink,
  ChevronDown,
  Terminal,
  HardDrive,
  RefreshCw,
  Sparkles,
  Activity,
  Share2,
  Palette,
  UserCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { api } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [assetCount, setAssetCount] = useState<number | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const [currentSearch, setCurrentSearch] = useState<string>("");
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  useEffect(() => {
    const handleCollapse = () => setIsDesktopCollapsed(true);
    const handleExpand = () => setIsDesktopCollapsed(false);
    const handleToggle = () => setIsDesktopCollapsed((prev) => !prev);
    window.addEventListener("omnistudio:collapse-sidebar", handleCollapse);
    window.addEventListener("omnistudio:expand-sidebar", handleExpand);
    window.addEventListener("omnistudio:toggle-sidebar", handleToggle);
    return () => {
      window.removeEventListener("omnistudio:collapse-sidebar", handleCollapse);
      window.removeEventListener("omnistudio:expand-sidebar", handleExpand);
      window.removeEventListener("omnistudio:toggle-sidebar", handleToggle);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentSearch(window.location.search);
    }
  }, [pathname]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      setCurrentDateTime(`${dateStr} • ${timeStr}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    const handleClose = () => setMobileOpen(false);
    window.addEventListener("toggle-mobile-sidebar", handleToggle);
    window.addEventListener("close-mobile-sidebar", handleClose);
    return () => {
      window.removeEventListener("toggle-mobile-sidebar", handleToggle);
      window.removeEventListener("close-mobile-sidebar", handleClose);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setPendingHref(null);
  }, [pathname]);

  const fetchTelemetry = async () => {
    setIsRefreshing(true);
    try {
      const [hData, aData] = await Promise.allSettled([
        api.health(),
        api.getAllAssets(),
      ]);
      if (hData.status === "fulfilled") setHealth(hData.value);
      if (aData.status === "fulfilled" && aData.value) {
        const val = aData.value;
        const total = typeof val.total === "number"
          ? val.total
          : (val.images?.length || 0) + (val.videos?.length || 0) + (val.audio?.length || 0) + (val.final?.length || 0);
        setAssetCount(total);
      }
    } catch {}
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 30000);
    return () => clearInterval(interval);
  }, []);

  const navGroups: NavGroup[] = [
    {
      label: "STUDIO SPACES",
      items: [
        { href: "/", label: "Dashboard", icon: LayoutDashboard },
        { href: "/studio", label: "Studio (All-in-One)", icon: Sparkles, badge: "PRO" },
        { href: "/pipeline", label: "Auto Pipeline", icon: Cpu, badge: "AI AGENT" },
        { href: "/publish", label: "Publish Studio", icon: Share2, badge: "MULTI-CHANNEL" },
      ],
    },
    {
      label: "CREATIVE ENGINES",
      items: [
        { href: "/image", label: "Image Studio", icon: ImageIcon, badge: "DIFFUSION" },
        { href: "/video", label: "Video Studio", icon: Video, badge: "MOTION" },
        { href: "/voice", label: "Voice Studio", icon: Mic, badge: "NEURAL" },
        { href: "/character", label: "Character Studio", icon: UserCheck, badge: "LOCK" },
      ],
    },
    {
      label: "SYSTEM INFRASTRUCTURE",
      items: [
        {
          href: "/vault",
          label: "Asset Vault",
          icon: FolderArchive,
          badge: assetCount !== null ? `${assetCount}` : undefined,
        },
        {
          href: "/usage",
          label: "Usage & Spend History",
          icon: Activity,
          badge: "SPEND",
        },
        {
          href: "/brand-kit",
          label: "Brand Kit Studio",
          icon: Palette,
          badge: "IDENTITY",
        },
        { href: "/settings", label: "BYOK & Settings", icon: Sliders, badge: "KEYS" },
      ],
    },
  ];

  return (
    <>
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden"
        />
      )}
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-[var(--bg-secondary)] border-r border-black/[0.06] dark:border-white/[0.06] flex flex-col justify-between select-none transition-all duration-300",
        isDesktopCollapsed ? "w-16" : "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className={cn(
          "flex items-center h-14 border-b border-black/[0.06] dark:border-white/[0.06] shrink-0 transition-all",
          isDesktopCollapsed ? "justify-center px-2" : "justify-between px-5"
        )}>
          {isDesktopCollapsed ? (
            <button
              type="button"
              onClick={() => {
                setIsDesktopCollapsed(false);
                window.dispatchEvent(new CustomEvent("omnistudio:expand-sidebar"));
              }}
              title="Expand Sidebar"
              className="h-8 w-8 rounded-lg bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs shadow-sm border border-black/10 dark:border-white/20 hover:scale-105 transition-transform cursor-pointer"
            >
              <span className="font-heading tracking-tighter text-[11px] font-bold">OS</span>
            </button>
          ) : (
            <>
              <Link href="/" className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs shadow-sm border border-black/10 dark:border-white/20">
                  <span className="font-heading tracking-tighter text-[11px] font-bold">OS</span>
                </div>
                <div>
                  <span className="text-sm font-bold text-zinc-950 dark:text-white tracking-tight font-heading block leading-none">
                    OMNISTUDIO
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 font-mono block mt-0.5">
                    AI CREATIVE SUITE
                  </span>
                </div>
              </Link>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 border border-black/[0.06] dark:border-white/[0.08]">
                  v4.5
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsDesktopCollapsed(true);
                    window.dispatchEvent(new CustomEvent("omnistudio:collapse-sidebar"));
                  }}
                  title="Collapse Sidebar"
                  className="hidden lg:flex p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Quick Action Button */}
        <div className={cn("shrink-0", isDesktopCollapsed ? "p-2" : "p-2.5 px-3")}>
          <button
            type="button"
            title="New Production (/pipeline)"
            onClick={() => {
              if (pathname !== "/pipeline") setPendingHref("/pipeline");
              router.push("/pipeline");
            }}
            className={cn(
              "flex items-center justify-center transition-all font-heading font-bold text-xs tracking-tight active:scale-98 cursor-pointer",
              isDesktopCollapsed
                ? "w-10 h-10 mx-auto p-0 bg-transparent hover:bg-transparent text-emerald-500 hover:text-emerald-400 hover:scale-110 shadow-none border-0"
                : "w-full py-2 px-3 gap-2 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 rounded-xl shadow-sm"
            )}
          >
            {pendingHref === "/pipeline" ? (
              <Spinner size="xs" variant="emerald" />
            ) : (
              <Zap className="h-3.5 w-3.5 fill-current" />
            )}
            {!isDesktopCollapsed && (
              <span>{pendingHref === "/pipeline" ? "LAUNCHING..." : "NEW PRODUCTION"}</span>
            )}
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="overflow-y-auto flex-1 hide-scrollbar">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-1">
              {!isDesktopCollapsed ? (
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-600 px-3 pt-3 pb-1 block">
                  {group.label}
                </span>
              ) : (
                <div className="my-2 mx-3 border-t border-black/[0.06] dark:border-white/[0.06]" />
              )}
              <div className="space-y-0.5">
              {group.items.map((item) => {
                const isBrandKitLink = item.href === "/brand-kit";
                const isSettingsLink = item.href === "/settings";
                const isBrandKitActive = pathname === "/brand-kit" || (pathname === "/settings" && currentSearch.includes("tab=brand_kit"));
                const isActive = isBrandKitLink 
                  ? isBrandKitActive 
                  : isSettingsLink 
                  ? (pathname === "/settings" && !isBrandKitActive) 
                  : (pathname === item.href);
                const isPending = pendingHref === item.href && !isActive;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    title={isDesktopCollapsed ? `${item.label} ${item.badge ? `(${item.badge})` : ""}` : undefined}
                    onClick={() => {
                      if (pathname !== item.href) {
                        setPendingHref(item.href);
                      }
                      if (isSettingsLink) {
                        setCurrentSearch("");
                      }
                    }}
                    className={cn(
                      "group flex items-center font-jakarta rounded-xl text-xs transition-all duration-150 relative cursor-pointer",
                      isDesktopCollapsed
                        ? "w-10 h-10 mx-auto justify-center p-0 bg-transparent hover:bg-transparent border-transparent shadow-none"
                        : cn(
                            "gap-2.5 mx-2 px-2.5 py-1.5",
                            isActive
                              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-sm"
                              : isPending
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/40 ring-2 ring-emerald-500/10 shadow-xs"
                              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/[0.04] border border-transparent font-medium"
                          )
                    )}
                  >
                    {isPending ? (
                      <Spinner size="xs" variant="emerald" className="shrink-0" />
                    ) : (
                      <item.icon
                        className={cn(
                          "shrink-0 transition-all duration-150",
                          isDesktopCollapsed ? "h-5 w-5" : "h-4 w-4",
                          isDesktopCollapsed
                            ? isActive
                              ? "text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.55)] scale-110"
                              : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white group-hover:scale-110"
                            : isActive
                            ? "text-white dark:text-zinc-950"
                            : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"
                        )}
                      />
                    )}
                    {isDesktopCollapsed && isActive && (
                      <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                    )}
                    {!isDesktopCollapsed && (
                      <>
                        <span className="truncate">{item.label}</span>
                        {isPending ? (
                          <span className="rounded-full px-1.5 py-0.2 text-[8px] font-mono ml-auto shrink-0 bg-emerald-500 text-black font-bold animate-pulse">
                            OPENING...
                          </span>
                        ) : item.badge ? (
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.2 text-[9px] font-mono ml-auto shrink-0",
                              isActive
                                ? "bg-white/20 dark:bg-zinc-900/20 text-white dark:text-zinc-950 font-bold"
                                : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-500 dark:text-zinc-400"
                            )}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </>
                    )}
                  </Link>
                );
              })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnostics & Meta Footer */}
      {isDesktopCollapsed ? (
        <div className="p-2 border-t border-black/[0.06] dark:border-white/[0.06] shrink-0 flex flex-col items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="System Online" />
          <button
            type="button"
            onClick={() => {
              setIsDesktopCollapsed(false);
              window.dispatchEvent(new CustomEvent("omnistudio:expand-sidebar"));
            }}
            title="Expand Sidebar"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="p-2.5 border-t border-black/[0.06] dark:border-white/[0.06] shrink-0 space-y-1.5 font-mono">
          <div className="rounded-xl bg-zinc-50 dark:bg-[#111118] border border-black/[0.06] dark:border-white/[0.06] px-2.5 py-1.5 flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5">
              <Radio className="h-2.5 w-2.5 text-emerald-500 animate-pulse shrink-0" />
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">ONLINE</span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="text-zinc-500 dark:text-zinc-400 text-[9px]">
                {assetCount !== null ? `${assetCount} ASSETS` : "VAULT READY"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={fetchTelemetry}
                className="p-0.5 rounded text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white transition-colors cursor-pointer"
                title="Refresh Status"
              >
                <RefreshCw className={cn("h-2.5 w-2.5", isRefreshing && "animate-spin")} />
              </button>
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="p-0.5 rounded text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white transition-colors cursor-pointer"
                title="Toggle Details"
              >
                <ChevronDown className={cn("h-2.5 w-2.5 transition-transform duration-200", showDetails && "rotate-180")} />
              </button>
            </div>
          </div>

          {showDetails && (
            <div className="rounded-xl bg-zinc-50/80 dark:bg-[#111118]/80 border border-black/[0.06] dark:border-white/[0.06] p-2 space-y-1 text-[9px] text-zinc-600 dark:text-zinc-400 animate-in fade-in duration-150">
              <div className="flex justify-between">
                <span>COMPILER:</span>
                <span className="text-zinc-700 dark:text-zinc-300">FFMPEG 1080P</span>
              </div>
              <div className="flex justify-between">
                <span>VOICE ENGINE:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">EDGE NEURAL</span>
              </div>
              <div className="flex justify-between">
                <span>DIFFUSION:</span>
                <span className="text-zinc-700 dark:text-zinc-300">FLUX / DALL-E</span>
              </div>
              {currentDateTime && (
                <div className="text-center pt-1 border-t border-black/[0.04] dark:border-white/[0.04] text-[8px] text-zinc-400">
                  {currentDateTime}
                </div>
              )}
            </div>
          )}

          {/* Compact meta footer */}
          <div className="flex items-center justify-between px-1 text-[9px] text-zinc-400 dark:text-zinc-500">
            <div className="flex items-center gap-2">
              <Link href="/how-it-works" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">Guide</Link>
              <span>•</span>
              <Link href="/privacy" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">Privacy</Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">Terms</Link>
            </div>
            <a href="/docs" target="_blank" rel="noreferrer" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors flex items-center gap-0.5">
              <span>Docs</span>
              <ExternalLink className="h-2 w-2" />
            </a>
          </div>
        </div>
      )}
    </aside>
    </>
  );
}
