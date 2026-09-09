'use client';
import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Sun, Moon, Radio, ChevronDown, Menu, Image as ImageIcon, Video, Mic, Layers, Settings, FolderArchive, Cpu, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/context/AuthContext';

const NAV_TABS = [
  { id: 'overview', label: 'Overview', path: '/' },
  { id: 'pipeline', label: 'Pipeline', path: '/pipeline', badge: 'Agent' },
  { id: 'image', label: 'Image', path: '/image' },
  { id: 'video', label: 'Video', path: '/video', hasDropdown: true },
  { id: 'audio', label: 'Audio', path: '/voice', hasDropdown: true },
  { id: 'vault', label: 'Vault', path: '/vault' },
  { id: 'usage', label: 'Usage & Costs', path: '/usage', badge: 'Live' },
  { id: 'config', label: 'Config', path: '/settings' },
];

const VIDEO_FEATURES = [
  { name: 'First Frame', desc: 'Img-to-Video' },
  { name: 'First + Last Frame', desc: 'Morph' },
  { name: 'Text-to-Video', desc: 'Generate from prompt' },
  { name: 'Motion Transfer', desc: 'Copy motion from source' },
];

const VIDEO_MODELS = [
  { name: 'FFmpeg Local', desc: 'Free / Fast' },
  { name: 'Kling AI 2.0', desc: 'Photoreal' },
  { name: 'Seedance ByteDance', desc: 'New Choreography' },
  { name: 'OmniMotion 3.0', desc: 'Native 3D' },
  { name: 'Runway Gen-3 Alpha', desc: 'Studio Cinema' },
  { name: 'OpenAI Sora', desc: 'World Sim' },
  { name: 'Luma Dream 1.5', desc: 'Parallax' },
  { name: 'Minimax Video-01', desc: 'Hailuo Natural' },
  { name: 'Google Veo 2', desc: '4K Multimodal' },
];

const AUDIO_FEATURES = [
  { name: 'Text to Speech', desc: 'Generate speech from text' },
  { name: 'Voice Change', desc: 'Swap voices in any audio/video' },
  { name: 'Translate / Lip-sync', desc: 'Auto-dub in 20+ languages' },
];

const AUDIO_MODELS = [
  { name: 'Edge Neural', desc: 'Free' },
  { name: 'ElevenLabs v3', desc: 'Premium' },
  { name: 'OpenAI TTS', desc: 'Standard' },
  { name: 'Seed Audio 1.0', desc: 'New' },
  { name: 'MiniMax Speech 2.8 HD', desc: 'Pro' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  
  const [isOnline, setIsOnline] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const { user, profile, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  useEffect(() => {
    const checkStatus = async () => {
      try {
        await api.health();
        setIsOnline(true);
      } catch (e) {
        setIsOnline(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  let dropdownContent = null;
  if (activeDropdown === 'video') {
    dropdownContent = (
      <div className="flex p-4 w-[600px] gap-6">
        <div className="flex-1">
          <h3 className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-3">Features</h3>
          <div className="flex flex-col gap-1">
            {VIDEO_FEATURES.map((feat) => (
              <div key={feat.name} className="px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors" onClick={() => router.push('/video')}>
                <div className="font-heading text-sm font-medium">{feat.name}</div>
                <div className="text-xs text-zinc-500">{feat.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-px bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex-1">
          <h3 className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-3">Models</h3>
          <div className="grid grid-cols-2 gap-1">
            {VIDEO_MODELS.map((model) => (
              <div key={model.name} className="px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors" onClick={() => router.push('/video')}>
                <div className="font-heading text-sm font-medium truncate">{model.name}</div>
                <div className="text-xs text-zinc-500">{model.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  } else if (activeDropdown === 'audio') {
    dropdownContent = (
      <div className="flex p-4 w-[600px] gap-6">
        <div className="flex-1">
          <h3 className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-3">Features</h3>
          <div className="flex flex-col gap-1">
            {AUDIO_FEATURES.map((feat) => (
              <div key={feat.name} className="px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors" onClick={() => router.push('/voice')}>
                <div className="font-heading text-sm font-medium">{feat.name}</div>
                <div className="text-xs text-zinc-500">{feat.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-px bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex-1">
          <h3 className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-3">Models</h3>
          <div className="grid grid-cols-2 gap-1">
            {AUDIO_MODELS.map((model) => (
              <div key={model.name} className="px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors" onClick={() => router.push('/voice')}>
                <div className="font-heading text-sm font-medium truncate">{model.name}</div>
                <div className="text-xs text-zinc-500">{model.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <header className="sticky top-4 z-40 mx-auto my-3 flex items-center h-14 bg-white/90 dark:bg-[#09090d]/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-800/50 rounded-full px-3 sm:px-4 shadow-md w-max max-w-[calc(100vw-2rem)] lg:max-w-[calc(100vw-18rem)] select-none">
      {/* Mobile Drawer Trigger */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("toggle-mobile-sidebar"))}
        className="lg:hidden mr-2 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
        title="Open Navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Brand */}
      <div className="flex items-center gap-2 mr-3 sm:mr-6 shrink-0 cursor-pointer" onClick={() => router.push('/')}>
        <div className="w-8 h-8 rounded-full bg-zinc-950 dark:bg-white flex items-center justify-center">
          <Zap className="w-4 h-4 text-white dark:text-zinc-950" />
        </div>
        <span className="font-heading font-semibold text-lg hidden sm:block">OmniStudio</span>
      </div>

      {/* Navigation */}
      <nav className="flex items-center h-full relative" onMouseLeave={() => setActiveDropdown(null)}>
        <div className="flex items-center gap-1 sm:gap-2 mr-4">
          {NAV_TABS.map((tab) => {
            const isActive = pathname === tab.path || pathname.startsWith(`${tab.path}/`);
            return (
              <div 
                key={tab.id}
                className="relative flex items-center h-full"
                onMouseEnter={() => tab.hasDropdown ? setActiveDropdown(tab.id) : setActiveDropdown(null)}
              >
                <Link
                  href={tab.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-jakarta font-medium transition-colors cursor-pointer",
                    isActive 
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white" 
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  )}
                >
                  {tab.label}
                  {tab.badge && (
                    <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                      {tab.badge}
                    </span>
                  )}
                  {tab.hasDropdown && (
                    <ChevronDown className={cn(
                      "w-3 h-3 opacity-50 transition-transform",
                      activeDropdown === tab.id && "rotate-180"
                    )} />
                  )}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Dropdown Panel */}
        {activeDropdown && dropdownContent && (
          <div className="absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 bg-white dark:bg-[#09090d] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {dropdownContent}
          </div>
        )}
      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0 border-l border-zinc-200 dark:border-zinc-800 pl-4 ml-auto">
        {/* Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="relative flex h-2 w-2">
            {isOnline && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            )}
            <span className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              isOnline ? "bg-green-500" : "bg-red-500"
            )}></span>
          </div>
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Supabase User Account / Sign In */}
        {user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-jakarta transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700/60"
              title="Account Menu"
            >
              <div className="w-5 h-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-[10px]">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
              </div>
              <span className="hidden sm:inline-block max-w-[85px] truncate font-medium text-zinc-900 dark:text-zinc-100">
                {profile?.full_name || user.email?.split('@')[0]}
              </span>
              <ChevronDown className={cn("w-3 h-3 text-zinc-400 transition-transform", userMenuOpen && "rotate-180")} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-56 p-2 rounded-xl bg-white dark:bg-[#09090d] border border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 font-jakarta">
                <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/80">
                  <div className="font-semibold text-xs text-zinc-900 dark:text-white truncate">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate">{user.email}</div>
                  <div className="mt-1 inline-block text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {profile?.role || 'CREATOR'}
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      router.push('/login');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Manage Account</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      router.push('/settings');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                  >
                    <Settings className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Studio Config</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                  <button
                    onClick={async () => {
                      setUserMenuOpen(false);
                      await signOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-jakarta font-medium text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700/60"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign In</span>
          </Link>
        )}

        {/* CTA */}
        <button 
          onClick={() => router.push('/video')}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors text-sm font-jakarta font-medium cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Create</span>
        </button>
      </div>
    </header>
  );
}
