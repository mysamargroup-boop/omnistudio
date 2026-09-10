'use client';
import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Sun, Moon, ChevronDown, Menu, LogIn, LogOut, User as UserIcon, Sparkles, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/context/AuthContext';
import HowItWorksModal from '@/components/ui/HowItWorksModal';

const NAV_TABS = [
  { id: 'studio', label: 'Studio', path: '/studio', badge: 'ALL' },
  { id: 'image', label: 'Image', path: '/image' },
  { id: 'video', label: 'Video', path: '/video', hasDropdown: true },
  { id: 'audio', label: 'Voice', path: '/voice', hasDropdown: true },
  { id: 'pipeline', label: 'Agent', path: '/pipeline', badge: 'AI' },
  { id: 'vault', label: 'Vault', path: '/vault' },
  { id: 'settings', label: 'Settings', path: '/settings' },
];

const VIDEO_FEATURES = [
  { name: 'First Frame', desc: 'Image to motion video' },
  { name: 'First + Last Frame', desc: 'Morphing between two keyframes' },
  { name: 'Text to Video', desc: 'Generate cinema from text prompt' },
  { name: 'Motion Transfer', desc: 'Transfer motion from source video' },
];

const VIDEO_MODELS = [
  { name: 'FFmpeg Local', desc: 'Fast local renderer' },
  { name: 'Kling AI 2.0', desc: 'Photorealistic motion' },
  { name: 'Runway Gen-3', desc: 'Studio cinematic realism' },
  { name: 'Luma Dream Machine', desc: 'Fluid camera moves' },
];

const AUDIO_FEATURES = [
  { name: 'Text to Speech', desc: 'Synthesize speech from scripts' },
  { name: 'Voice Change', desc: 'Swap audio or video voiceover' },
  { name: 'Translate and Dub', desc: 'Auto-dubbing across 20+ languages' },
];

const AUDIO_MODELS = [
  { name: 'Edge Neural', desc: 'Free high-fidelity voice' },
  { name: 'ElevenLabs v3', desc: 'Studio voice cloning' },
  { name: 'OpenAI TTS HD', desc: 'Standard studio narration' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  
  const [isOnline, setIsOnline] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const { user, profile, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
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
    let mounted = true;
    const checkStatus = async () => {
      try {
        await api.health();
        if (mounted) setIsOnline(true);
      } catch (e) {
        if (mounted) setIsOnline(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 25000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="mx-auto flex items-center justify-between h-13 glass-dock border border-black/[0.06] dark:border-white/[0.06] rounded-2xl px-3 sm:px-5 shadow-sm w-full max-w-6xl select-none">
      {/* Left: Mobile Trigger & Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('toggle-mobile-sidebar'))}
          className="lg:hidden p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/" className="flex items-center gap-2 cursor-pointer group whitespace-nowrap shrink-0">
          <div className="w-6 h-6 rounded-lg bg-zinc-950 dark:bg-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <Zap className="w-3.5 h-3.5 text-white dark:text-zinc-950" />
          </div>
          <span className="font-heading font-bold text-sm tracking-tight text-zinc-900 dark:text-white">
            OmniStudio
          </span>
        </Link>
      </div>

      {/* Middle: Clean Navigation Tabs with Dropdowns */}
      <nav 
        className="hidden md:flex items-center h-full relative gap-0.5"
        onMouseLeave={() => setActiveDropdown(null)}
      >
        {NAV_TABS.map((tab) => {
          const isActive = pathname === tab.path || (tab.path !== '/' && pathname.startsWith(tab.path));
          return (
            <div 
              key={tab.id}
              className="relative flex items-center h-full"
              onMouseEnter={() => tab.hasDropdown ? setActiveDropdown(tab.id) : setActiveDropdown(null)}
            >
              <Link
                href={tab.path}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer',
                  isActive 
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                )}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={cn(
                    "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded",
                    isActive
                      ? "bg-white/20 dark:bg-zinc-900/20 text-white dark:text-zinc-950"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                  )}>
                    {tab.badge}
                  </span>
                )}
                {tab.hasDropdown && (
                  <ChevronDown className={cn(
                    'w-3 h-3 text-zinc-400 transition-transform duration-200',
                    activeDropdown === tab.id && 'rotate-180 text-zinc-900 dark:text-white'
                  )} />
                )}
              </Link>
            </div>
          );
        })}

        {/* Video Dropdown Panel */}
        {activeDropdown === 'video' && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-4 shadow-xl w-[500px] flex gap-4 animate-scale-in z-50">
            <div className="flex-1 space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 px-2 mb-1">Features</div>
              {VIDEO_FEATURES.map((f) => (
                <div 
                  key={f.name}
                  onClick={() => { setActiveDropdown(null); router.push('/video'); }}
                  className="p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/[0.04] cursor-pointer transition-colors"
                >
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{f.name}</div>
                  <div className="text-xs text-zinc-500">{f.desc}</div>
                </div>
              ))}
            </div>
            <div className="w-px bg-black/[0.08] dark:bg-white/[0.08]" />
            <div className="flex-1 space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 px-2 mb-1">Motion Engines</div>
              {VIDEO_MODELS.map((m) => (
                <div 
                  key={m.name}
                  onClick={() => { setActiveDropdown(null); router.push('/video'); }}
                  className="p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/[0.04] cursor-pointer transition-colors"
                >
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{m.name}</div>
                  <div className="text-xs text-zinc-500">{m.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audio Dropdown Panel */}
        {activeDropdown === 'audio' && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-4 shadow-xl w-[480px] flex gap-4 animate-scale-in z-50">
            <div className="flex-1 space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 px-2 mb-1">Audio Modes</div>
              {AUDIO_FEATURES.map((f) => (
                <div 
                  key={f.name}
                  onClick={() => { setActiveDropdown(null); router.push('/voice'); }}
                  className="p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/[0.04] cursor-pointer transition-colors"
                >
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{f.name}</div>
                  <div className="text-xs text-zinc-500">{f.desc}</div>
                </div>
              ))}
            </div>
            <div className="w-px bg-black/[0.08] dark:bg-white/[0.08]" />
            <div className="flex-1 space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 px-2 mb-1">Speech Models</div>
              {AUDIO_MODELS.map((m) => (
                <div 
                  key={m.name}
                  onClick={() => { setActiveDropdown(null); router.push('/voice'); }}
                  className="p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/[0.04] cursor-pointer transition-colors"
                >
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{m.name}</div>
                  <div className="text-xs text-zinc-500">{m.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Right Controls: Online Status + Theme + Auth + Create CTA */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Live Engine Status */}
        <div 
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 text-xs font-medium"
          title={isOnline ? 'All AI backend services running' : 'Backend offline'}
        >
          <span className="relative flex h-1.5 w-1.5">
            {isOnline && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', isOnline ? 'bg-emerald-500' : 'bg-rose-500')} />
          </span>
          <span className="text-zinc-600 dark:text-zinc-400 text-xs">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* How It Works Guide Trigger */}
        <button
          onClick={() => setHowItWorksOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 border border-zinc-200/80 dark:border-zinc-800/80"
          title="Studio Workflow & Model Guide"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden md:inline">How It Works</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Auth / Profile */}
        {user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700/60"
              title="User Menu"
            >
              <div className="w-5 h-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-[10px]">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
              </div>
              <span className="hidden sm:inline-block max-w-[80px] truncate font-medium text-zinc-900 dark:text-zinc-100">
                {profile?.full_name || user.email?.split('@')[0]}
              </span>
              <ChevronDown className={cn('w-3 h-3 text-zinc-400 transition-transform', userMenuOpen && 'rotate-180')} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 p-1.5 bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] rounded-xl shadow-xl animate-scale-in z-50">
                <div className="px-3 py-2 border-b border-black/[0.08] dark:border-white/[0.08]">
                  <div className="font-semibold text-xs text-zinc-900 dark:text-white truncate">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">{user.email}</div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => { setUserMenuOpen(false); router.push('/settings'); }}
                    className="w-full flex items-center gap-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-white/[0.04] px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-left"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Account & BYOK Settings</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-black/[0.08] dark:border-white/[0.08]">
                  <button
                    onClick={async () => { setUserMenuOpen(false); await signOut(); }}
                    className="w-full flex items-center gap-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 transition-colors cursor-pointer text-left"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700/60"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign In</span>
          </Link>
        )}

        {/* Primary CTA Button */}
        <button 
          onClick={() => router.push('/pipeline')}
          className="flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 rounded-xl px-3.5 py-1.5 text-xs font-heading font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Create</span>
        </button>
      </div>

      <HowItWorksModal
        isOpen={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
      />
    </header>
  );
}
