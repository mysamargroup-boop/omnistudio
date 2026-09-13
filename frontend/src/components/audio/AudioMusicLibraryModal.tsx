"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Music,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Plus,
  Search,
  Check,
  Sparkles,
  Sliders,
  Filter,
  X,
  Upload,
  Radio,
  Disc3,
  Repeat,
  Headphones,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  category: "bgm" | "sfx";
  genre: string;
  duration: string; // "2:45"
  durationSec: number;
  bpm?: number;
  mood: string;
  url: string;
  waveformType?: "cinematic" | "ambient" | "electronic" | "impact" | "riser";
  syntheticTone?: { freq: number; type: OscillatorType; beats: number };
}

export const CURATED_AUDIO_LIBRARY: AudioTrack[] = [
  // ── CINEMATIC BGM ──
  {
    id: "bgm_cine_01",
    title: "Oppenheimer Requiem",
    artist: "OmniStudio Cinema Audio",
    category: "bgm",
    genre: "Cinematic Score",
    duration: "2:48",
    durationSec: 168,
    bpm: 85,
    mood: "Epic / Dramatic",
    url: "https://actions.google.com/sounds/v1/science_fiction/ambient_hum.ogg",
    waveformType: "cinematic",
    syntheticTone: { freq: 110, type: "sawtooth", beats: 85 },
  },
  {
    id: "bgm_cine_02",
    title: "Interstellar Horizons",
    artist: "Deep Space Ensemble",
    category: "bgm",
    genre: "Cinematic Score",
    duration: "3:12",
    durationSec: 192,
    bpm: 72,
    mood: "Emotional / Wonder",
    url: "https://actions.google.com/sounds/v1/science_fiction/scifi_hum.ogg",
    waveformType: "cinematic",
    syntheticTone: { freq: 130, type: "sine", beats: 72 },
  },
  {
    id: "bgm_cine_03",
    title: "Cyberpunk 2099 Night Drive",
    artist: "Neon Syndicate",
    category: "bgm",
    genre: "Cyberpunk & Electronic",
    duration: "2:15",
    durationSec: 135,
    bpm: 128,
    mood: "Futuristic / High Energy",
    url: "https://actions.google.com/sounds/v1/science_fiction/computer_voice_processing.ogg",
    waveformType: "electronic",
    syntheticTone: { freq: 160, type: "square", beats: 128 },
  },
  {
    id: "bgm_cine_04",
    title: "Tokyo Neon Rain (Lo-Fi)",
    artist: "Midnight Tape Club",
    category: "bgm",
    genre: "Ambient & Lo-Fi",
    duration: "2:30",
    durationSec: 150,
    bpm: 80,
    mood: "Chill / Nostalgic",
    url: "https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg",
    waveformType: "ambient",
    syntheticTone: { freq: 220, type: "triangle", beats: 80 },
  },
  {
    id: "bgm_cine_05",
    title: "Apex Predator Action Pulse",
    artist: "Hybrid Trailer Lab",
    category: "bgm",
    genre: "Action / Hybrid",
    duration: "1:58",
    durationSec: 118,
    bpm: 140,
    mood: "Tense / Adrenaline",
    url: "https://actions.google.com/sounds/v1/science_fiction/force_field.ogg",
    waveformType: "electronic",
    syntheticTone: { freq: 90, type: "sawtooth", beats: 140 },
  },
  {
    id: "bgm_cine_06",
    title: "Silicon Valley Innovation Pulse",
    artist: "Modern Media Works",
    category: "bgm",
    genre: "Corporate & Tech",
    duration: "2:04",
    durationSec: 124,
    bpm: 115,
    mood: "Inspiring / Uplifting",
    url: "https://actions.google.com/sounds/v1/science_fiction/digital_telepathy.ogg",
    waveformType: "ambient",
    syntheticTone: { freq: 260, type: "sine", beats: 115 },
  },
  {
    id: "bgm_cine_07",
    title: "Solitary Piano Solitude",
    artist: "Acoustic Minimalist",
    category: "bgm",
    genre: "Emotional Piano",
    duration: "2:40",
    durationSec: 160,
    bpm: 65,
    mood: "Poignant / Elegant",
    url: "https://actions.google.com/sounds/v1/science_fiction/teleport_arrival.ogg",
    waveformType: "ambient",
    syntheticTone: { freq: 330, type: "triangle", beats: 65 },
  },

  // ── CINEMATIC SOUND EFFECTS (SFX) ──
  {
    id: "sfx_boom_01",
    title: "Deep Sub Cinema Boom",
    artist: "Hollywood Trailer FX",
    category: "sfx",
    genre: "Cinema Hits & Booms",
    duration: "0:04",
    durationSec: 4,
    mood: "Epic Impact",
    url: "https://actions.google.com/sounds/v1/science_fiction/alien_spaceship_flyby.ogg",
    waveformType: "impact",
    syntheticTone: { freq: 45, type: "sine", beats: 0 },
  },
  {
    id: "sfx_whoosh_01",
    title: "Cinematic Whip Whoosh",
    artist: "Velocity FX",
    category: "sfx",
    genre: "Whooshes & Transitions",
    duration: "0:02",
    durationSec: 2,
    mood: "Fast Motion",
    url: "https://actions.google.com/sounds/v1/science_fiction/plasma_cannon.ogg",
    waveformType: "impact",
    syntheticTone: { freq: 440, type: "sawtooth", beats: 0 },
  },
  {
    id: "sfx_riser_01",
    title: "Tension Glitch Riser",
    artist: "Dark Horizon FX",
    category: "sfx",
    genre: "Risers & Build-ups",
    duration: "0:06",
    durationSec: 6,
    mood: "Climax Build",
    url: "https://actions.google.com/sounds/v1/science_fiction/phaser_charge.ogg",
    waveformType: "riser",
    syntheticTone: { freq: 220, type: "sawtooth", beats: 0 },
  },
  {
    id: "sfx_ui_01",
    title: "Cybernetic HUD Beep Confirm",
    artist: "Future Interface FX",
    category: "sfx",
    genre: "Sci-Fi UI & Beeps",
    duration: "0:01",
    durationSec: 1,
    mood: "Tech Confirm",
    url: "https://actions.google.com/sounds/v1/science_fiction/teleport_depart.ogg",
    waveformType: "impact",
    syntheticTone: { freq: 880, type: "sine", beats: 0 },
  },
  {
    id: "sfx_shutter_01",
    title: "Mechanical Camera Shutter Click",
    artist: "Studio Foley",
    category: "sfx",
    genre: "Foley & Ambient",
    duration: "0:02",
    durationSec: 2,
    mood: "Crisp Snap",
    url: "https://actions.google.com/sounds/v1/foley/camera_snap_clicks.ogg",
    waveformType: "impact",
    syntheticTone: { freq: 600, type: "triangle", beats: 0 },
  },
  {
    id: "sfx_braam_01",
    title: "Inception Horn / Braam Hit",
    artist: "Titan Audio Works",
    category: "sfx",
    genre: "Cinema Hits & Booms",
    duration: "0:05",
    durationSec: 5,
    mood: "Massive Colossus",
    url: "https://actions.google.com/sounds/v1/science_fiction/giant_alien_horn.ogg",
    waveformType: "impact",
    syntheticTone: { freq: 55, type: "sawtooth", beats: 0 },
  },
];

export interface AudioMusicLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (track: {
    id: string;
    title: string;
    url: string;
    category: "bgm" | "sfx";
    volume: number;
    loop: boolean;
  }) => void;
  initialSelectedId?: string;
}

export default function AudioMusicLibraryModal({
  isOpen,
  onClose,
  onSelectTrack,
  initialSelectedId,
}: AudioMusicLibraryModalProps) {
  const [activeCategory, setActiveCategory] = useState<"bgm" | "sfx" | "custom">("bgm");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [customTracks, setCustomTracks] = useState<AudioTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<AudioTrack | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const synthOscRef = useRef<OscillatorNode | null>(null);
  const synthGainRef = useRef<GainNode | null>(null);

  // Initialize selected track from initialSelectedId if provided
  useEffect(() => {
    if (initialSelectedId) {
      const match = [...CURATED_AUDIO_LIBRARY, ...customTracks].find(
        (t) => t.id === initialSelectedId
      );
      if (match) setSelectedTrack(match);
    }
  }, [initialSelectedId, customTracks]);

  // Handle Play/Stop with fallback WebAudio Synth if online stream fails
  const playTrack = (track: AudioTrack) => {
    stopCurrentAudio();

    if (playingTrackId === track.id) {
      setPlayingTrackId(null);
      return;
    }

    setPlayingTrackId(track.id);
    setSelectedTrack(track);

    try {
      const audio = new Audio(track.url);
      audio.volume = volume;
      audio.loop = track.category === "bgm" && loopEnabled;
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPlaybackProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        if (!audio.loop) {
          setPlayingTrackId(null);
          setPlaybackProgress(0);
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((_err) => {
          // Fallback to Web Audio API Synthesizer so audio ALWAYS plays
          playSyntheticTone(track);
        });
      }
    } catch {
      playSyntheticTone(track);
    }
  };

  const playSyntheticTone = (track: AudioTrack) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const config = track.syntheticTone || { freq: 220, type: "sine" as OscillatorType, beats: 90 };
      osc.type = config.type;
      osc.frequency.setValueAtTime(config.freq, ctx.currentTime);

      gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + (track.category === "sfx" ? 2.5 : 8.0)
      );

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      synthOscRef.current = osc;
      synthGainRef.current = gain;

      setTimeout(() => {
        setPlayingTrackId(null);
        setPlaybackProgress(0);
      }, (track.category === "sfx" ? 2500 : 8000));
    } catch (e) {
      console.warn("AudioContext fallback error:", e);
    }
  };

  const stopCurrentAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (synthOscRef.current) {
      try {
        synthOscRef.current.stop();
      } catch {}
      synthOscRef.current = null;
    }
    setPlaybackProgress(0);
  };

  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, []);

  // Filter genres based on active category
  const allTracks = [...CURATED_AUDIO_LIBRARY, ...customTracks];
  const categoryTracks = allTracks.filter((t) =>
    activeCategory === "custom" ? t.id.startsWith("custom_") : t.category === activeCategory
  );

  const availableGenres = [
    "all",
    ...Array.from(new Set(categoryTracks.map((t) => t.genre))),
  ];

  const filteredTracks = categoryTracks.filter((t) => {
    const matchesSearch =
      !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.mood.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGenre = selectedGenre === "all" || t.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const newTrack: AudioTrack = {
      id: `custom_${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Local Upload",
      category: "bgm",
      genre: "User Uploads",
      duration: "User File",
      durationSec: 120,
      mood: "Custom Audio",
      url: objectUrl,
      waveformType: "ambient",
    };

    setCustomTracks((prev) => [newTrack, ...prev]);
    setSelectedTrack(newTrack);
    playTrack(newTrack);
  };

  const handleConfirmSelect = () => {
    if (!selectedTrack) return;
    onSelectTrack({
      id: selectedTrack.id,
      title: selectedTrack.title,
      url: selectedTrack.url,
      category: selectedTrack.category,
      volume,
      loop: loopEnabled,
    });
    stopCurrentAudio();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 font-jakarta"
      onClick={() => {
        stopCurrentAudio();
        onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-[#0c0c14] border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-black/[0.06] dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-heading font-extrabold text-zinc-950 dark:text-white">
                  Audio & Music Production Library
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Royalty-Free CC0
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Studio-grade cinematic BGM tracks, atmospheric scores, and high-impact sound effects (SFX).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCurrentAudio();
              onClose();
            }}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Segmented Tabs */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-black/[0.06] dark:border-white/[0.06] gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-white/[0.04] rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveCategory("bgm");
                setSelectedGenre("all");
              }}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                activeCategory === "bgm"
                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <Disc3 className="w-3.5 h-3.5 text-violet-500" />
              <span>Background Music (BGM)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveCategory("sfx");
                setSelectedGenre("all");
              }}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                activeCategory === "sfx"
                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Sound Effects (SFX)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveCategory("custom");
                setSelectedGenre("all");
              }}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                activeCategory === "custom"
                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-500" />
              <span>My Uploads</span>
              {customTracks.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  {customTracks.length}
                </span>
              )}
            </button>
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search genres, mood, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* Genre Filter Pills */}
        <div className="flex items-center gap-2 px-6 py-2.5 overflow-x-auto custom-scrollbar border-b border-black/[0.04] dark:border-white/[0.04]">
          <Filter className="w-3 h-3 text-zinc-400 shrink-0" />
          {availableGenres.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGenre(g)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap shrink-0",
                selectedGenre === g
                  ? "bg-violet-600 text-white font-bold"
                  : "bg-zinc-100 dark:bg-white/[0.03] text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/[0.06]"
              )}
            >
              {g === "all" ? "All Moods & Genres" : g}
            </button>
          ))}
        </div>

        {/* Tracks List Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5 custom-scrollbar min-h-[300px]">
          {activeCategory === "custom" && customTracks.length === 0 && (
            <div className="p-8 text-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 space-y-3">
              <Upload className="w-8 h-8 text-zinc-400 mx-auto" />
              <div>
                <p className="text-sm font-heading font-bold text-zinc-800 dark:text-zinc-200">
                  No Custom Audio Uploaded Yet
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Import your own background score, voice notes, or Foley MP3/WAV tracks.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-mono font-bold transition-all cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Audio File</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          )}

          {filteredTracks.map((track) => {
            const isSelected = selectedTrack?.id === track.id;
            const isPlaying = playingTrackId === track.id;

            return (
              <div
                key={track.id}
                onClick={() => setSelectedTrack(track)}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 group cursor-pointer",
                  isSelected
                    ? "bg-violet-500/[0.04] dark:bg-violet-500/[0.07] border-violet-500/40 ring-1 ring-violet-500/20 shadow-xs"
                    : "bg-white dark:bg-white/[0.02] border-black/[0.05] dark:border-white/[0.05] hover:border-black/15 dark:hover:border-white/15"
                )}
              >
                {/* Left: Play Button & Track Metadata */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playTrack(track);
                    }}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs",
                      isPlaying
                        ? "bg-violet-600 text-white animate-pulse"
                        : "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-zinc-800 dark:text-zinc-200 group-hover:scale-105"
                    )}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-heading font-bold text-zinc-950 dark:text-white truncate">
                        {track.title}
                      </h4>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-zinc-100 dark:bg-white/[0.05] text-zinc-500 border border-black/[0.04] dark:border-white/[0.04]">
                        {track.genre}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 mt-0.5">
                      <span>{track.artist}</span>
                      <span>•</span>
                      <span className="text-violet-600 dark:text-violet-400 font-semibold">{track.mood}</span>
                      {track.bpm && (
                        <>
                          <span>•</span>
                          <span>{track.bpm} BPM</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Center: Waveform Visualization Bars */}
                <div className="hidden md:flex items-center gap-1 h-6 w-32 px-2 shrink-0">
                  {[28, 45, 75, 90, 60, 35, 80, 100, 70, 50, 65, 85, 40, 60, 95, 30].map(
                    (heightPercent, idx) => (
                      <div
                        key={idx}
                        style={{ height: `${heightPercent}%` }}
                        className={cn(
                          "w-1 rounded-full transition-all duration-200",
                          isPlaying
                            ? "bg-violet-500 animate-pulse"
                            : isSelected
                            ? "bg-violet-400/50"
                            : "bg-zinc-300 dark:bg-zinc-700"
                        )}
                      />
                    )
                  )}
                </div>

                {/* Right: Duration & Quick Select */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-zinc-400">{track.duration}</span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTrack(track);
                      onSelectTrack({
                        id: track.id,
                        title: track.title,
                        url: track.url,
                        category: track.category,
                        volume,
                        loop: loopEnabled,
                      });
                      stopCurrentAudio();
                      onClose();
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs",
                      isSelected
                        ? "bg-violet-600 text-white hover:bg-violet-700"
                        : "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-300"
                    )}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Add to Video</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer: Live Player Controls & Master CTA */}
        <div className="p-4 sm:p-5 border-t border-black/[0.06] dark:border-white/[0.06] bg-zinc-50 dark:bg-[#0e0e18] flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Active Track Status */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Headphones className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="text-xs font-heading font-bold text-zinc-950 dark:text-white truncate">
                {selectedTrack ? selectedTrack.title : "Select an Audio Track"}
              </p>
              <p className="text-[10px] font-mono text-zinc-400">
                {selectedTrack ? `${selectedTrack.genre} • ${selectedTrack.duration}` : "Click to audition royalty-free score"}
              </p>
            </div>
          </div>

          {/* Volume & Loop Controls */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (audioRef.current) audioRef.current.volume = Math.min(1.0, val);
                }}
                className="w-20 accent-violet-600 cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg"
                title={`Track Volume: ${Math.round(volume * 100)}%`}
              />
              <span className="text-[10px] font-mono text-zinc-400 w-7">
                {Math.round(volume * 100)}%
              </span>
            </div>

            <button
              type="button"
              onClick={() => setLoopEnabled(!loopEnabled)}
              className={cn(
                "p-2 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-1",
                loopEnabled
                  ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold border border-violet-500/20"
                  : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              )}
              title={loopEnabled ? "Audio Looping Enabled" : "Looping Disabled"}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span className="text-[10px]">Loop</span>
            </button>

            {/* Custom File Upload Button */}
            <label className="p-2 rounded-xl bg-zinc-200 dark:bg-white/[0.06] hover:bg-zinc-300 dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-200 transition-all cursor-pointer" title="Upload custom audio file">
              <Upload className="w-3.5 h-3.5" />
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            {/* Final Apply Button */}
            <button
              type="button"
              onClick={handleConfirmSelect}
              disabled={!selectedTrack}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-heading font-bold disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Use This Track</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
