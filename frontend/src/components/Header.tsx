'use client';
import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Sun, Moon, ChevronDown, Menu, LogIn, LogOut, User as UserIcon, Sparkles, BookOpen, Activity, Palette, LayoutDashboard, Sliders } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/context/AuthContext';
import HowItWorksModal from '@/components/ui/HowItWorksModal';
import BrandKitModal from '@/components/brand/BrandKitModal';

const PRIMARY_NAV_TABS = [
  { id: 'image', label: 'Image', path: '/image', hasDropdown: true },
  { id: 'video', label: 'Video', path: '/video', hasDropdown: true },
  { id: 'audio', label: 'Voice', path: '/voice', hasDropdown: true },
  { id: 'pipeline', label: 'Agent', path: '/pipeline', badge: 'AI' },
  { id: 'publish', label: 'Publish', path: '/publish', badge: 'NEW' },
  { id: 'vault', label: 'Vault', path: '/vault' },
];

const IMAGE_FEATURES = [
  { name: 'Text to Image', desc: 'Synthesize images from prompts', mode: 'text_to_image' },
  { name: 'Image Variations', desc: 'Generate variations from reference', mode: 'image_variations' },
  { name: 'Precision Editor', desc: 'Inpaint, canvas expansion & retouching', mode: 'image_editor' },
  { name: 'Social Repurposer', desc: 'Multi-aspect ratio generation for socials', mode: 'repurpose' },
];

const IMAGE_MODELS = [
  { name: 'FLUX.1 Schnell', desc: 'Ultra-fast 12B diffusion engine', model: 'flux_schnell' },
  { name: 'FLUX.1 Dev', desc: 'Photorealistic textures & accuracy', model: 'flux_dev' },
  { name: 'Stable Diffusion XL', desc: 'Cinematic high-contrast master', model: 'sdxl' },
  { name: 'SD 3.5 Large', desc: 'Complex prompt typography & layout', model: 'sd35' },
];

const MORE_NAV_ITEMS = [
  { id: 'studio', label: 'Studio Hub', path: '/studio', desc: 'Unified multi-modal generator', badge: 'ALL', icon: LayoutDashboard },
  { id: 'usage', label: 'Usage & Spend', path: '/usage', desc: 'Real-time telemetry & API spend', badge: 'SPEND', icon: Activity },
  { id: 'settings', label: 'System Settings', path: '/settings', desc: 'BYOK API keys & security', icon: Sliders },
  { id: 'brand_kit', label: 'Brand Kit', action: 'brand_kit', desc: 'Logos, colors & visual identity', icon: Palette },
  { id: 'how_it_works', label: 'How It Works', action: 'how_it_works', desc: 'Studio workflow & model guide', icon: BookOpen },
];

const VIDEO_FEATURES = [
  { name: 'First Frame', desc: 'Image to motion video', mode: 'first_frame' },
  { name: 'First + Last Frame', desc: 'Morphing between two keyframes', mode: 'first_to_last_frame' },
  { name: 'Multi-Keyframes', desc: 'Interpolate multiple uploaded images', mode: 'multi_frame' },
  { name: 'Text to Video', desc: 'Generate cinema from text prompt', mode: 'text_to_video' },
  { name: 'Motion Transfer', desc: 'Transfer motion from source video', mode: 'motion_transfer' },
];

const VIDEO_MODELS = [
  { name: 'Google Omni / Veo', desc: 'Google Cloud AI 4K video (Default)', model: 'google_veo' },
  { name: 'FFmpeg Local', desc: 'Fast local renderer (100% Free)', model: 'ffmpeg_local' },
  { name: 'Kling AI 2.0', desc: 'Photorealistic physics', model: 'kling_2.0' },
  { name: 'Runway Gen-3', desc: 'Studio cinematic realism', model: 'runway_gen3' },
  { name: 'Luma Dream Machine', desc: 'Fluid camera moves', model: 'luma_dream' },
];

const AUDIO_FEATURES = [
  { name: 'Text to Speech', desc: 'Synthesize speech from scripts', mode: 'tts' },
  { name: 'Voice Change', desc: 'Swap audio or video voiceover', mode: 'voice_change' },
  { name: 'Translate and Dub', desc: 'Auto-dubbing across 20+ languages', mode: 'translate' },
];

const AUDIO_MODELS = [
  { name: 'Edge Neural', desc: 'Free high-fidelity voice', model: 'edge' },
  { name: 'ElevenLabs v3', desc: 'Studio voice cloning', model: 'elevenlabs' },
  { name: 'OpenAI TTS HD', desc: 'Standard studio narration', model: 'openai' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  
  const [isOnline, setIsOnline] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const { user, profile, isPinAuthenticated, isAuthenticated, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [brandKitOpen, setBrandKitOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isAuthed = isAuthenticated || isPinAuthenticated || Boolean(user);
  const displayName = isPinAuthenticated
    ? "Samar"
    : (profile?.full_name || (user?.email?.toLowerCase().includes("samar") ? "Samar" : user?.email?.split('@')[0] || "Samar"));
  const displayEmail = isPinAuthenticated ? "mysamargroup@gmail.com (PIN Admin)" : (user?.email || "mysamargroup@gmail.com");

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
    <header className="mx-auto flex items-center justify-between h-12 glass-dock border border-black/[0.08] dark:border-[#2A2A2D] bg-white/90 dark:bg-[#0E0E10]/95 backdrop-blur-md rounded-xl px-2.5 sm:px-4 shadow-sm w-full max-w-[96vw] xl:max-w-7xl 2xl:max-w-[1440px] select-none transition-all">
      {/* Left: Mobile Trigger & Brand */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('toggle-mobile-sidebar'))}
          className="lg:hidden p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer shrink-0"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/" className="flex items-center gap-2.5 cursor-pointer group whitespace-nowrap shrink-0">
          <div className="w-6 h-6 rounded-md bg-zinc-950 dark:bg-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
            <Zap className="w-3.5 h-3.5 text-white dark:text-zinc-950" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading font-bold text-sm tracking-tight text-zinc-900 dark:text-white">
              OmniStudio
            </span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              PRO
            </span>
          </div>
        </Link>
      </div>

      {/* Middle: Clean Navigation Tabs with Dropdowns */}
      <nav 
        className="hidden md:flex items-center h-full relative gap-0.5 shrink min-w-0"
        onMouseLeave={() => setActiveDropdown(null)}
      >
        {PRIMARY_NAV_TABS.map((tab) => {
          const isActive = pathname === tab.path || (tab.path !== '/' && pathname.startsWith(tab.path));
          return (
            <div 
              key={tab.id}
              className="relative flex items-center h-full shrink-0"
              onMouseEnter={() => tab.hasDropdown ? setActiveDropdown(tab.id) : setActiveDropdown(null)}
            >
              <Link
                href={tab.path}
                prefetch={true}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 xl:px-3 xl:py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer',
                  isActive 
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs font-bold' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                )}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={cn(
                    "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded leading-none",
                    isActive
                      ? "bg-white/20 dark:bg-zinc-900/20 text-white dark:text-zinc-950"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
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

        {/* More ▾ Dropdown Trigger (Contains Studio Hub, Usage, Settings, Brand Kit, Guide) */}
        <div 
          className="relative flex items-center h-full shrink-0"
          onMouseEnter={() => setActiveDropdown('more')}
        >
          {(() => {
            const isMoreActive = pathname === '/studio' || pathname === '/usage' || pathname === '/settings';
            return (
              <button
                type="button"
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 xl:px-3 xl:py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer',
                  isMoreActive || activeDropdown === 'more'
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs font-bold' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                )}
              >
                <span>More</span>
                <ChevronDown className={cn(
                  'w-3 h-3 text-zinc-400 transition-transform duration-200',
                  activeDropdown === 'more' && 'rotate-180 text-zinc-900 dark:text-white'
                )} />
              </button>
            );
          })()}
        </div>

        {/* Image Dropdown Panel */}
        {activeDropdown === 'image' && (
          <div className="absolute top-full -mt-0.5 left-1/2 -translate-x-1/2 bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-3.5 shadow-2xl w-[500px] flex gap-4 animate-scale-in z-50 before:absolute before:-top-3 before:left-0 before:right-0 before:h-4 before:content-['']">
            <div className="flex-1 space-y-1">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2.5 mb-1.5">Creation Modes</div>
              {IMAGE_FEATURES.map((f) => (
                <div 
                  key={f.name}
                  onClick={() => { setActiveDropdown(null); router.push(`/image?mode=${f.mode}`); }}
                  className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                >
                  <div className="text-xs font-heading font-bold text-zinc-900 dark:text-zinc-100">{f.name}</div>
                  <div className="text-[11px] font-jakarta text-zinc-500 dark:text-zinc-400">{f.desc}</div>
                </div>
              ))}
            </div>
            <div className="w-px bg-black/[0.08] dark:border-white/[0.08]" />
            <div className="flex-1 space-y-1">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2.5 mb-1.5">Diffusion Engines</div>
              {IMAGE_MODELS.map((m) => (
                <div 
                  key={m.name}
                  onClick={() => { setActiveDropdown(null); router.push(`/image?model=${m.model}`); }}
                  className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                >
                  <div className="text-xs font-heading font-bold text-zinc-900 dark:text-zinc-100">{m.name}</div>
                  <div className="text-[11px] font-jakarta text-zinc-500 dark:text-zinc-400">{m.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video Dropdown Panel */}
        {activeDropdown === 'video' && (
          <div className="absolute top-full -mt-0.5 left-1/2 -translate-x-1/2 bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-3.5 shadow-2xl w-[500px] flex gap-4 animate-scale-in z-50 before:absolute before:-top-3 before:left-0 before:right-0 before:h-4 before:content-['']">
            <div className="flex-1 space-y-1">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2.5 mb-1.5">Features</div>
              {VIDEO_FEATURES.map((f) => (
                <div 
                  key={f.name}
                  onClick={() => { setActiveDropdown(null); router.push(`/video?mode=${f.mode}`); }}
                  className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                >
                  <div className="text-xs font-heading font-bold text-zinc-900 dark:text-zinc-100">{f.name}</div>
                  <div className="text-[11px] font-jakarta text-zinc-500 dark:text-zinc-400">{f.desc}</div>
                </div>
              ))}
            </div>
            <div className="w-px bg-black/[0.08] dark:border-white/[0.08]" />
            <div className="flex-1 space-y-1">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2.5 mb-1.5">Motion Engines</div>
              {VIDEO_MODELS.map((m) => (
                <div 
                  key={m.name}
                  onClick={() => { setActiveDropdown(null); router.push(`/video?model=${m.model}`); }}
                  className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                >
                  <div className="text-xs font-heading font-bold text-zinc-900 dark:text-zinc-100">{m.name}</div>
                  <div className="text-[11px] font-jakarta text-zinc-500 dark:text-zinc-400">{m.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audio Dropdown Panel */}
        {activeDropdown === 'audio' && (
          <div className="absolute top-full -mt-0.5 left-1/2 -translate-x-1/2 bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-3.5 shadow-2xl w-[480px] flex gap-4 animate-scale-in z-50 before:absolute before:-top-3 before:left-0 before:right-0 before:h-4 before:content-['']">
            <div className="flex-1 space-y-1">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2.5 mb-1.5">Audio Modes</div>
              {AUDIO_FEATURES.map((f) => (
                <div 
                  key={f.name}
                  onClick={() => { setActiveDropdown(null); router.push(`/voice?mode=${f.mode}`); }}
                  className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                >
                  <div className="text-xs font-heading font-bold text-zinc-900 dark:text-zinc-100">{f.name}</div>
                  <div className="text-[11px] font-jakarta text-zinc-500 dark:text-zinc-400">{f.desc}</div>
                </div>
              ))}
            </div>
            <div className="w-px bg-black/[0.08] dark:border-white/[0.08]" />
            <div className="flex-1 space-y-1">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2.5 mb-1.5">Speech Models</div>
              {AUDIO_MODELS.map((m) => (
                <div 
                  key={m.name}
                  onClick={() => { setActiveDropdown(null); router.push(`/voice?model=${m.model}`); }}
                  className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                >
                  <div className="text-xs font-heading font-bold text-zinc-900 dark:text-zinc-100">{m.name}</div>
                  <div className="text-[11px] font-jakarta text-zinc-500 dark:text-zinc-400">{m.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* More Tools Dropdown Panel */}
        {activeDropdown === 'more' && (
          <div className="absolute top-full -mt-0.5 right-0 bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-2.5 shadow-2xl w-72 animate-scale-in z-50 space-y-1 before:absolute before:-top-3 before:left-0 before:right-0 before:h-4 before:content-['']">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2.5 py-1 font-bold">
              Studio Tools & Utilities
            </div>
            
            <Link
              href="/studio"
              prefetch={true}
              onClick={() => setActiveDropdown(null)}
              className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors group cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-violet-500/15 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-bold text-zinc-900 dark:text-zinc-100">Studio Hub</span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">ALL</span>
                </div>
                <p className="text-[11px] font-jakarta text-zinc-500 dark:text-zinc-400 line-clamp-1">Unified multi-modal generator</p>
              </div>
            </Link>

            <Link
              href="/usage"
              prefetch={true}
              onClick={() => setActiveDropdown(null)}
              className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors group cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-emerald-500/15 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                <Activity className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-bold text-zinc-900 dark:text-zinc-100">Usage & Spend</span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">TELEMETRY</span>
                </div>
                <p className="text-[11px] font-jakarta text-zinc-500 dark:text-zinc-400 line-clamp-1">Real-time spend & API analytics</p>
              </div>
            </Link>

            <Link
              href="/settings"
              prefetch={true}
              onClick={() => setActiveDropdown(null)}
              className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors group cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-blue-500/15 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                <Sliders className="w-4 h-4 text-blue-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-heading font-bold text-zinc-900 dark:text-zinc-100">System Settings</div>
                <p className="text-[11px] font-jakarta text-zinc-500 dark:text-zinc-400 line-clamp-1">BYOK API keys & passcodes</p>
              </div>
            </Link>

            <div className="h-px bg-black/[0.06] dark:bg-white/[0.06] my-1" />

            <Link
              href="/brand-kit"
              prefetch={true}
              onClick={() => setActiveDropdown(null)}
              className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors group cursor-pointer text-left"
            >
              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-emerald-500/15 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                <Palette className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-heading font-bold text-zinc-900 dark:text-zinc-100">Brand Kit Studio</div>
                <p className="text-[11px] font-jakarta text-zinc-500 dark:text-zinc-400 line-clamp-1">Logos, colors & visual identity</p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => { setActiveDropdown(null); setHowItWorksOpen(true); }}
              className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors group cursor-pointer text-left"
            >
              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-amber-500/15 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                <BookOpen className="w-4 h-4 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-heading font-bold text-zinc-900 dark:text-zinc-100">How It Works</div>
                <p className="text-[11px] font-jakarta text-zinc-500 dark:text-zinc-400 line-clamp-1">Studio workflow & model guide</p>
              </div>
            </button>
          </div>
        )}
      </nav>

      {/* Right Controls: Online Status + Theme + Auth + Create CTA */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Live Engine Status */}
        <div 
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 text-[11px] font-medium shrink-0"
          title={isOnline ? 'All AI backend services running' : 'Backend offline'}
        >
          <span className="relative flex h-1.5 w-1.5">
            {isOnline && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', isOnline ? 'bg-emerald-500' : 'bg-rose-500')} />
          </span>
          <span className="text-zinc-600 dark:text-zinc-400 font-mono">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white shrink-0 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
        </button>

        {/* Primary CTA Button */}
        <button 
          onClick={() => router.push('/pipeline')}
          className="flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-heading font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>Create</span>
        </button>

        {/* Auth / Profile Avatar with Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700/60"
            title="User Account & Quick Navigation"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-500/40"
              />
            ) : isAuthed ? (
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center text-[10px]">
                <UserIcon className="w-3 h-3" />
              </div>
            )}
            <span className="hidden sm:inline-block max-w-[90px] truncate font-bold text-zinc-900 dark:text-zinc-100">
              {displayName}
            </span>
            <ChevronDown className={cn('w-3 h-3 text-zinc-400 transition-transform', userMenuOpen && 'rotate-180')} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-60 p-1.5 bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl shadow-2xl animate-scale-in z-50 space-y-1">
              <div className="px-3 py-2 border-b border-black/[0.08] dark:border-white/[0.08]">
                <div className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                  {displayName}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono truncate">{displayEmail}</div>
              </div>

              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => { setUserMenuOpen(false); router.push('/settings'); }}
                  className="w-full flex items-center gap-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-left"
                >
                  <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Account & BYOK Settings</span>
                </button>
                <button
                  onClick={() => { setUserMenuOpen(false); router.push('/usage'); }}
                  className="w-full flex items-center gap-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-left"
                >
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Usage & Spend Telemetry</span>
                </button>
                <button
                  onClick={() => { setUserMenuOpen(false); setBrandKitOpen(true); }}
                  className="w-full flex items-center gap-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-left"
                >
                  <Palette className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Brand Kit & Visual Identity</span>
                </button>
                <button
                  onClick={() => { setUserMenuOpen(false); setHowItWorksOpen(true); }}
                  className="w-full flex items-center gap-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-left"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                  <span>Studio Workflow Guide</span>
                </button>
              </div>

              <div className="pt-1 border-t border-black/[0.08] dark:border-white/[0.08]">
                {isAuthed ? (
                  <button
                    onClick={async () => { setUserMenuOpen(false); await signOut(); }}
                    className="w-full flex items-center gap-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button
                    onClick={() => { setUserMenuOpen(false); router.push('/login'); }}
                    className="w-full flex items-center gap-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer text-left font-bold"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <HowItWorksModal
        isOpen={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
      />

      <BrandKitModal
        isOpen={brandKitOpen}
        onClose={() => setBrandKitOpen(false)}
      />
    </header>
  );
}
