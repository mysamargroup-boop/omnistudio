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
} from "lucide-react";
import { api } from "@/lib/api";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  index: string;
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
      if (aData.status === "fulfilled") setAssetCount(aData.value?.total || 0);
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
        { href: "/", label: "Overview", icon: LayoutDashboard, index: "01" },
        { href: "/pipeline", label: "Auto Pipeline", icon: Cpu, badge: "AI AGENT", index: "02" },
      ],
    },
    {
      label: "CREATIVE ENGINES",
      items: [
        { href: "/image", label: "Image Studio", icon: ImageIcon, badge: "DIFFUSION", index: "03" },
        { href: "/video", label: "Video Studio", icon: Video, badge: "MOTION", index: "04" },
        { href: "/voice", label: "Voice Studio", icon: Mic, badge: "NEURAL", index: "05" },
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
          index: "06",
        },
        { href: "/settings", label: "BYOK & Settings", icon: Sliders, badge: "KEYS", index: "07" },
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
        "fixed left-0 top-0 z-40 h-screen w-64 border-r border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#030304] flex flex-col justify-between select-none transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-black/[0.08] dark:border-white/[0.08] shrink-0">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shadow-sm">
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
        <div className="p-3 shrink-0">
          <button
            type="button"
            onClick={() => router.push("/pipeline")}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all font-heading font-bold text-xs tracking-tight shadow-md active:scale-98 cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5 fill-current" />
            <span>NEW PRODUCTION</span>
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="px-3 py-2 space-y-5 overflow-y-auto flex-1 hide-scrollbar">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <span className="px-3 text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 block mb-1.5 font-medium">
                {group.label}
              </span>
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 relative font-jakarta",
                      isActive
                        ? "bg-zinc-100 text-zinc-950 dark:bg-white/[0.08] dark:text-white border border-zinc-300 dark:border-white/[0.12] shadow-sm font-semibold"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100/70 dark:hover:bg-white/[0.03] border border-transparent"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive
                          ? "text-zinc-950 dark:text-white"
                          : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                    <div className="ml-auto shrink-0 flex items-center gap-1.5">
                      {item.badge ? (
                        <span
                          className={cn(
                            "text-[8px] font-mono font-bold tracking-wider px-1.5 py-0.2 rounded-full",
                            isActive
                              ? "bg-zinc-950 text-white dark:bg-white dark:text-black"
                              : "bg-zinc-200 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-400 border border-zinc-300 dark:border-white/[0.06]"
                          )}
                        >
                          {item.badge}
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-400">
                          {item.index}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Diagnostics HUD Card */}
      <div className="p-3 border-t border-black/[0.08] dark:border-white/[0.08] shrink-0 bg-white dark:bg-[#030304]">
        <div className="rounded-xl bg-zinc-50 dark:bg-[#09090d] border border-black/[0.06] dark:border-white/[0.06] p-3 space-y-2 font-mono text-[10px]">
          <div className="flex items-center justify-between text-zinc-800 dark:text-zinc-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
              SYSTEM ACTIVE
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={fetchTelemetry}
                className="p-0.5 rounded text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white transition-colors cursor-pointer"
                title="Refresh Status"
              >
                <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
              </button>
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="p-0.5 rounded text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white transition-colors cursor-pointer"
                title="Toggle System Specs"
              >
                <ChevronDown
                  className={cn("h-3 w-3 transition-transform duration-200", showDetails && "rotate-180")}
                />
              </button>
            </div>
          </div>

          <div className="space-y-0.5 text-zinc-500 text-[9px] border-t border-black/[0.04] dark:border-white/[0.04] pt-1.5">
            <div className="flex justify-between">
              <span>STORAGE:</span>
              <span className="text-zinc-700 dark:text-zinc-400">{assetCount !== null ? `${assetCount} ASSETS` : "VAULT READY"}</span>
            </div>
            <div className="flex justify-between">
              <span>COMPILER:</span>
              <span className="text-zinc-700 dark:text-zinc-400">FFMPEG 8.1 1080P</span>
            </div>
          </div>

          {showDetails && (
            <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] space-y-1.5 text-[9px] text-zinc-600 dark:text-zinc-400 animate-in fade-in duration-150">
              <div className="flex justify-between">
                <span>VOICE ENGINE:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">EDGE NEURAL (ACTIVE)</span>
              </div>
              <div className="flex justify-between">
                <span>LATENT SAMPLER:</span>
                <span className="text-zinc-800 dark:text-zinc-300">DALL-E 3 & FLUX</span>
              </div>
              <div className="pt-1 flex items-center justify-between border-t border-black/[0.04] dark:border-white/[0.04]">
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center gap-1 transition-colors"
                >
                  <Terminal className="h-2.5 w-2.5" />
                  <span>API SWAGGER DOCS</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}
