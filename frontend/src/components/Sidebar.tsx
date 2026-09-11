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
} from "lucide-react";
import { api } from "@/lib/api";

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
        "fixed left-0 top-0 z-40 h-screen w-64 bg-[var(--bg-secondary)] border-r border-black/[0.06] dark:border-white/[0.06] flex flex-col justify-between select-none transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
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
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 border border-black/[0.06] dark:border-white/[0.08]">
            v4.5
          </span>
        </div>

        {/* Quick Action Button */}
        <div className="p-2.5 px-3 shrink-0">
          <button
            type="button"
            onClick={() => router.push("/pipeline")}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 rounded-xl shadow-sm transition-all font-heading font-bold text-xs tracking-tight active:scale-98 cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5 fill-current" />
            <span>NEW PRODUCTION</span>
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="overflow-y-auto flex-1 hide-scrollbar">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-1">
              <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-600 px-3 pt-3 pb-1 block">
                {group.label}
              </span>
              <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-2.5 font-jakarta mx-2 px-2.5 py-1.5 rounded-xl text-xs transition-all duration-150 relative",
                      isActive
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/[0.04] border border-transparent font-medium"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-colors",
                        isActive
                          ? "text-white dark:text-zinc-950"
                          : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
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
                    )}
                  </Link>
                );
              })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ultra-Compact Diagnostics & Meta Footer */}
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
    </aside>
    </>
  );
}
