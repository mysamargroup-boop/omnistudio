'use client';

import React, { useState, useRef, useEffect } from 'react';
import { api, getMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import Dropdown, { DropdownOption } from '@/components/ui/Dropdown';
import { 
  Mic, Loader2, Download, Volume2, VolumeX, Play, Pause, FileText, 
  Clock, Sparkles, Check, Music, Gauge, Upload, 
  Languages, ArrowRightLeft, RefreshCw 
} from 'lucide-react';
import GenerationConfirmModal, { GenerationConfirmDetails } from '@/components/ui/GenerationConfirmModal';
import LiveProgressBar, { LogEntry } from '@/components/ui/LiveProgressBar';

type Mode = 'tts' | 'voice_change' | 'translate';

const LANGUAGES: DropdownOption[] = [
  { value: 'en', label: 'English (EN)' },
  { value: 'hi', label: 'Hindi (HI)' },
  { value: 'es', label: 'Spanish (ES)' },
  { value: 'fr', label: 'French (FR)' },
  { value: 'de', label: 'German (DE)' },
  { value: 'ja', label: 'Japanese (JA)' },
  { value: 'ko', label: 'Korean (KO)' },
  { value: 'zh', label: 'Chinese (ZH)' },
  { value: 'ar', label: 'Arabic (AR)' },
  { value: 'pt', label: 'Portuguese (PT)' },
  { value: 'ru', label: 'Russian (RU)' },
  { value: 'it', label: 'Italian (IT)' },
  { value: 'tr', label: 'Turkish (TR)' },
  { value: 'nl', label: 'Dutch (NL)' },
  { value: 'pl', label: 'Polish (PL)' },
  { value: 'sv', label: 'Swedish (SV)' },
  { value: 'th', label: 'Thai (TH)' },
  { value: 'vi', label: 'Vietnamese (VI)' },
  { value: 'id', label: 'Indonesian (ID)' },
  { value: 'ta', label: 'Tamil (TA)' }
];

const PROVIDERS: DropdownOption[] = [
  { value: 'edge', label: 'Edge Neural (Free)', active: true },
  { value: 'elevenlabs', label: 'ElevenLabs (Pro)', active: false },
  { value: 'openai', label: 'OpenAI TTS (Standard)', active: false }
];

const MODELS: DropdownOption[] = [
  { value: 'seed_audio', label: 'Seed Audio 1.0', active: true },
  { value: 'eleven_v3', label: 'Eleven v3', active: false },
  { value: 'qwen_audio', label: 'Qwen Audio 3.0', active: true },
  { value: 'minimax', label: 'MiniMax Speech 2.8 HD', active: true },
  { value: 'seed_speech', label: 'Seed Speech', active: true }
];

const VOICES = {
  edge: [
    { value: 'en-US-AriaNeural', label: 'Aria (Female, US)' },
    { value: 'en-US-GuyNeural', label: 'Guy (Male, US)' },
    { value: 'en-GB-SoniaNeural', label: 'Sonia (Female, UK)' }
  ],
  elevenlabs: [
    { value: 'rachel', label: 'Rachel (Calm)' },
    { value: 'drew', label: 'Drew (News)' },
    { value: 'clyde', label: 'Clyde (War Veteran)' }
  ],
  openai: [
    { value: 'alloy', label: 'Alloy' },
    { value: 'echo', label: 'Echo' },
    { value: 'fable', label: 'Fable' }
  ]
};

const SAMPLE_SCRIPTS = [
  "In a world where artificial intelligence pushes the boundaries of imagination, one studio stands above the rest. Welcome to the future of neural generation.",
  "Discover the latest breakthroughs in quantum computing and how they'll revolutionize data processing by the year 2030.",
  "Hello, and welcome back to our podcast series! Today we're diving deep into the art of synthetic soundscapes."
];

export default function VoiceStudioPage() {
  const [activeTab, setActiveTab] = useState<Mode>('tts');
  const [isGenerating, setIsGenerating] = useState(false);
  const [outputAudioUrl, setOutputAudioUrl] = useState<string | null>(null);

  // Dynamic Models & Active Key Status
  const [providersList, setProvidersList] = useState<DropdownOption[]>(PROVIDERS);
  const [modelsList, setModelsList] = useState<DropdownOption[]>(MODELS);
  const [keyStatus, setKeyStatus] = useState<{ elevenlabs: boolean; openai: boolean }>({
    elevenlabs: false,
    openai: false
  });

  // Tab 1: TTS State (Default to 100% Free & Active Edge Neural)
  const [text, setText] = useState('');
  const [ttsProvider, setTtsProvider] = useState('edge');
  const [ttsModel, setTtsModel] = useState('seed_audio');
  const [ttsVoice, setTtsVoice] = useState('en-US-AriaNeural');
  const [pacing, setPacing] = useState('1.0');

  // Tab 2: Voice Change State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [vcTargetVoice, setVcTargetVoice] = useState('en-US-GuyNeural');
  const [vcIsVideo, setVcIsVideo] = useState(false);

  // Tab 3: Translate State
  const [transText, setTransText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('hi');
  const [transTtsProvider, setTransTtsProvider] = useState('edge');
  const [transVoice, setTransVoice] = useState('en-US-AriaNeural');
  const [videoPath, setVideoPath] = useState('');
  const [translatedResultText, setTranslatedResultText] = useState('');

  // Audio Playback State
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch dynamic voice models and active API key status
  useEffect(() => {
    const fetchVoiceModels = async () => {
      try {
        const res = await api.getVoiceModels();
        if (res) {
          if (Array.isArray(res.providers)) {
            setProvidersList(res.providers);
            const hasEl = res.providers.find((p: any) => p.value === 'elevenlabs')?.active || false;
            const hasOai = res.providers.find((p: any) => p.value === 'openai')?.active || false;
            setKeyStatus({ elevenlabs: hasEl, openai: hasOai });
          }
          if (Array.isArray(res.models)) {
            setModelsList(res.models);
          }
        }
      } catch (err) {
        console.error('Failed to load dynamic voice models:', err);
      }
    };
    fetchVoiceModels();
  }, []);

  // Unmount cleanup for progress timers and audio element
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  const toggleMute = () => {
    if (audioRef.current) {
      const nextMuted = !isMuted;
      audioRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      if (newVol === 0) {
        audioRef.current.muted = true;
        setIsMuted(true);
      } else if (isMuted) {
        audioRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  const handleExportAudio = () => {
    if (!outputAudioUrl) return;
    const a = document.createElement("a");
    a.href = outputAudioUrl;
    a.download = `omnistudio_voice_${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const estimatedDurationSecs = Math.max(1, Math.round((wordCount / 130) * 60));

  // Safeguard Confirmation Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState<GenerationConfirmDetails | null>(null);
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null);

  const requestVoiceConfirm = () => {
    if (!text.trim()) return;
    const isFree = ttsProvider === 'edge';
    const isKeyConfigured = isFree ? true : (ttsProvider === 'elevenlabs' ? keyStatus.elevenlabs : keyStatus.openai);
    const costUsd = isFree ? 0 : (ttsProvider === 'elevenlabs' ? 0.030 : 0.015);
    const costInr = isFree ? 0 : Math.round(costUsd * 83.5 * 100) / 100;

    setConfirmDetails({
      serviceType: 'voice',
      modelName: ttsModel,
      provider: ttsProvider === 'edge' ? 'Microsoft Edge Neural (Local)' : ttsProvider === 'elevenlabs' ? 'ElevenLabs v3' : 'OpenAI Audio TTS',
      isFree,
      isKeyConfigured,
      keyMissingMessage: !isKeyConfigured
        ? `${ttsProvider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI'} API key is not configured in Settings! Please add your key in BYOK Settings to proceed, or choose Microsoft Edge Neural (100% Free & Active).`
        : undefined,
      costUsd,
      costInr,
      prompt: text.trim(),
      specs: {
        voice: ttsVoice,
        pacing: `${pacing}x`,
        length: `${wordCount} words (~${estimatedDurationSecs}s)`
      }
    });
    setOnConfirmCallback(() => () => handleGenerateVoice());
    setConfirmModalOpen(true);
  };

  const requestVoiceChangeConfirm = () => {
    if (!uploadFile) return;
    const isKeyConfigured = keyStatus.elevenlabs;
    setConfirmDetails({
      serviceType: 'voice',
      modelName: 'ElevenLabs Speech-to-Speech v2',
      provider: 'ElevenLabs STS',
      isFree: false,
      isKeyConfigured,
      keyMissingMessage: !isKeyConfigured
        ? 'ElevenLabs API key is not configured in Settings! Please enter your key in BYOK Settings to proceed with Voice Change.'
        : undefined,
      costUsd: 0.050,
      costInr: 4.18,
      prompt: `File: ${uploadFile.name} (${(uploadFile.size / 1024 / 1024).toFixed(1)} MB)`,
      specs: {
        targetVoice: vcTargetVoice,
        mediaType: vcIsVideo ? 'Video (Audio Remux)' : 'Audio'
      }
    });
    setOnConfirmCallback(() => () => handleVoiceChange());
    setConfirmModalOpen(true);
  };

  const requestTranslateConfirm = (dub: boolean) => {
    if (!transText.trim()) return;
    const isFree = !dub || transTtsProvider === 'edge';
    const costUsd = isFree ? 0 : 0.020;
    const costInr = isFree ? 0 : 1.67;

    setConfirmDetails({
      serviceType: 'voice',
      modelName: dub ? `${transTtsProvider.toUpperCase()} + Neural Translate` : 'Neural Translate Engine',
      provider: dub ? (transTtsProvider === 'edge' ? 'Microsoft Edge (Free)' : 'OpenAI / ElevenLabs') : 'Local NMT',
      isFree,
      costUsd,
      costInr,
      prompt: transText.trim(),
      specs: {
        languagePair: `${sourceLang.toUpperCase()} -> ${targetLang.toUpperCase()}`,
        mode: dub ? 'Translate + Neural Dubbing' : 'Text Translation Only',
        audioEngine: dub ? transTtsProvider : 'None'
      }
    });
    setOnConfirmCallback(() => () => handleTranslate(dub));
    setConfirmModalOpen(true);
  };

  // Real-Time Progress States
  const [progress, setProgress] = useState(0);
  const [stageTitle, setStageTitle] = useState('ACOUSTIC SPEECH SYNTHESIZER');
  const [statusMessage, setStatusMessage] = useState('Synthesizing neural speech audio...');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [telemetryLogs, setTelemetryLogs] = useState<LogEntry[]>([]);

  const handleGenerateVoice = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    setOutputAudioUrl(null);
    setProgress(15);
    setStageTitle("01 • Text Normalization & Phonemes");
    setStatusMessage(`Tokenizing ${wordCount} words for ${ttsVoice}...`);
    setElapsedSeconds(0);
    setTelemetryLogs([
      { timestamp: new Date().toTimeString().split(" ")[0], message: `Started ${ttsProvider.toUpperCase()} voice generation (${ttsVoice})` }
    ]);
    const startTimestamp = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed === 1) {
        setProgress(50);
        setStageTitle("02 • Neural Acoustic Modeling");
        setStatusMessage("Synthesizing human vocal timbre and cadence...");
        setTelemetryLogs((prev) => [
          ...prev,
          { timestamp: new Date().toTimeString().split(" ")[0], message: `Acoustic waveform synthesis at ${pacing}x pacing` }
        ]);
      } else if (elapsed === 3) {
        setProgress(80);
        setStageTitle("03 • High-Bitrate MP3 Encoding");
        setStatusMessage("Muxing audio stream & frequency equalization...");
      } else if (elapsed >= 5 && elapsed < 10) {
        setProgress((prev) => Math.min(prev + 4, 95));
      }
    }, 1000);

    try {
      const response = await api.generateVoice({
        text,
        provider: ttsProvider,
        voice_id: ttsVoice,
        model: ttsModel
      });
      if (response && !response.success) {
        alert(response.error || "Voice generation failed");
        setTelemetryLogs((prev) => [
          ...prev,
          { timestamp: new Date().toTimeString().split(" ")[0], message: `Error: ${response.error || 'Generation failed'}` }
        ]);
        return;
      }
      const mediaUrl = response?.url || response?.audio_url;
      if (mediaUrl) {
        setOutputAudioUrl(getMediaUrl(mediaUrl));
        setProgress(100);
        setStageTitle("SPEECH SYNTHESIS COMPLETE");
        setStatusMessage("Audio synthesized successfully!");
        setTelemetryLogs((prev) => [
          ...prev,
          { timestamp: new Date().toTimeString().split(" ")[0], message: `Audio generated: ${response.filename || 'voice output'}` }
        ]);
      } else {
        console.warn("Voice response missing URL:", response);
      }
    } catch (err: any) {
      console.error("Voice generation error:", err);
      alert(err.message || "Voice generation failed");
      setTelemetryLogs((prev) => [
        ...prev,
        { timestamp: new Date().toTimeString().split(" ")[0], message: `Error: ${err.message}` }
      ]);
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsGenerating(false);
    }
  };

  const handleVoiceChange = async () => {
    if (!uploadFile) return;
    setIsGenerating(true);
    setOutputAudioUrl(null);
    setProgress(20);
    setStageTitle("01 • Extracting Audio From Source");
    setStatusMessage(`Demuxing ${uploadFile.name}...`);
    setElapsedSeconds(0);
    setTelemetryLogs([
      { timestamp: new Date().toTimeString().split(" ")[0], message: `Started Speech-to-Speech voice swap to ${vcTargetVoice}` }
    ]);
    const startTimestamp = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed === 1) {
        setProgress(55);
        setStageTitle("02 • ElevenLabs STS Timbre Cloning");
        setStatusMessage("Transferring speaker identity & pitch contours...");
      } else if (elapsed === 4) {
        setProgress(85);
        setStageTitle("03 • Remuxing Audio Track");
        setStatusMessage("Recombining transformed audio track with original master...");
      }
    }, 1000);

    try {
      const response = await api.changeVoice(
        uploadFile, 
        vcTargetVoice, 
        'elevenlabs', 
        vcIsVideo
      );
      const mediaUrl = response?.url || response?.audio_url;
      if (mediaUrl) {
        setOutputAudioUrl(getMediaUrl(mediaUrl));
        setProgress(100);
        setStageTitle("VOICE CHANGE COMPLETE");
        setStatusMessage("Voice transformed successfully!");
      } else {
        console.warn("Voice change response missing URL:", response);
      }
    } catch (err: any) {
      console.error("Voice change error:", err);
      alert(err.message || "Voice change failed");
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsGenerating(false);
    }
  };

  const handleTranslate = async (dub: boolean) => {
    if (!transText.trim()) return;
    setIsGenerating(true);
    setOutputAudioUrl(null);
    setTranslatedResultText('');
    setProgress(25);
    setStageTitle("01 • Neural Language Translation");
    setStatusMessage(`Translating ${sourceLang.toUpperCase()} -> ${targetLang.toUpperCase()}...`);
    setElapsedSeconds(0);
    setTelemetryLogs([
      { timestamp: new Date().toTimeString().split(" ")[0], message: `Translating text from ${sourceLang.toUpperCase()} to ${targetLang.toUpperCase()}` }
    ]);
    const startTimestamp = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed === 1 && dub) {
        setProgress(65);
        setStageTitle("02 • Neural Speech Dubbing");
        setStatusMessage(`Synthesizing dubbed voiceover in ${targetLang.toUpperCase()}...`);
      }
    }, 1000);

    try {
      if (dub) {
        const response = await api.translateAndDub({
          text: transText,
          source_lang: sourceLang,
          target_lang: targetLang,
          tts_provider: transTtsProvider,
          voice_id: transVoice,
          video_path: videoPath
        });
        if (response) {
          setTranslatedResultText(response.translated_text || 'Translated text preview...');
          const mediaUrl = response.url || response.audio_url;
          if (mediaUrl) setOutputAudioUrl(getMediaUrl(mediaUrl));
          setProgress(100);
          setStageTitle("TRANSLATE & DUB COMPLETE");
          setStatusMessage("Translated and dubbed successfully!");
        }
      } else {
        const response = await api.translateText({
          text: transText,
          source_lang: sourceLang,
          target_lang: targetLang
        });
        if (response) {
          setTranslatedResultText(response.translated_text || 'Translated text preview...');
          setProgress(100);
          setStageTitle("TRANSLATION COMPLETE");
          setStatusMessage("Text translated successfully!");
        }
      }
    } catch (err: any) {
      console.error("Translate error:", err);
      alert(err.message || "Translation failed");
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsGenerating(false);
    }
  };


  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#06060a] text-zinc-950 dark:text-zinc-50 flex flex-col p-3 sm:p-5 sm:pt-3 font-jakarta">
      <div className="max-w-6xl mx-auto w-full flex flex-col flex-1">
        {/* Centered Compact Studio Header */}
        <div className="mb-4 sm:mb-5 flex flex-col items-center justify-center text-center space-y-1.5 max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-zinc-950 dark:text-white">
            Audio Production Studio
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans max-w-lg">
            Broadcast-grade neural speech synthesis, real-time voice conversion, and multilingual dubbing.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              EDGE NEURAL (100% FREE ACTIVE)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] text-zinc-600 dark:text-zinc-400 text-[10px] font-mono">
              ELEVENLABS V3
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] text-zinc-600 dark:text-zinc-400 text-[10px] font-mono">
              OPENAI AUDIO
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] text-zinc-600 dark:text-zinc-400 text-[10px] font-mono">
              SEED AUDIO
            </span>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        
        {/* LEFT PANEL: CONTROLS (Compact & Pinned Fixed on Desktop) */}
        <div className="lg:col-span-5 flex flex-col gap-3 lg:sticky lg:top-4 self-start max-h-[calc(100vh-3.5rem)] overflow-y-auto custom-scrollbar">
          
          {/* Tabs - Single Line Non-Wrapping */}
          <div className="bg-zinc-100 dark:bg-[#0d0d14] p-1 rounded-xl flex flex-nowrap whitespace-nowrap gap-1 w-full border border-black/[0.06] dark:border-white/[0.06] overflow-x-auto scrollbar-hide">
            {[
              { id: 'tts', label: 'Text to Speech', icon: FileText },
              { id: 'voice_change', label: 'Voice Change', icon: RefreshCw },
              { id: 'translate', label: 'Translate & Sync', icon: Languages }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Mode)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0",
                  activeTab === tab.id
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs font-bold border border-zinc-900 dark:border-white"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-white/[0.04]"
                )}
              >
                <tab.icon size={14} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] shadow-sm flex-1">
            
            {/* TAB 1: TEXT TO SPEECH */}
            {activeTab === 'tts' && (
              <div className="flex flex-col gap-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-medium">Script Content</label>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono">
                      <span className="flex items-center gap-1"><FileText size={12}/> {wordCount} words</span>
                      <span className="flex items-center gap-1"><Clock size={12}/> ~{estimatedDurationSecs}s</span>
                    </div>
                  </div>
                  <textarea 
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter the text you want to synthesize into speech..."
                    className="w-full h-24 sm:h-28 bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl p-3 text-xs sm:text-sm font-jakarta focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 resize-none transition-all leading-relaxed"
                  />
                  <div className="flex gap-1.5 mt-0.5 overflow-x-auto pb-1 scrollbar-hide custom-scrollbar">
                    {SAMPLE_SCRIPTS.map((script, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setText(script)}
                        className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-white/[0.04] hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-black/[0.06] dark:border-white/[0.06] text-[10px] font-mono text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                      >
                        Sample {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-medium">Provider</label>
                    <Dropdown 
                      options={providersList} 
                      value={ttsProvider} 
                      onChange={setTtsProvider} 
                      className="w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-medium">Model Engine</label>
                    <Dropdown 
                      options={modelsList} 
                      value={ttsModel} 
                      onChange={setTtsModel} 
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-medium">Voice Persona</label>
                    <Dropdown 
                      options={VOICES[ttsProvider as keyof typeof VOICES] || VOICES.edge} 
                      value={ttsVoice} 
                      onChange={setTtsVoice} 
                      className="w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-medium">Pacing</label>
                    <div className="flex bg-zinc-50 dark:bg-white/[0.04] p-1 rounded-xl border border-black/[0.08] dark:border-white/[0.08] h-9">
                      {['0.8', '1.0', '1.2', '1.5'].map(speed => (
                        <button
                          key={speed}
                          onClick={() => setPacing(speed)}
                          className={cn(
                            "flex-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer",
                            pacing === speed 
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs font-bold" 
                              : "text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-300"
                          )}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={requestVoiceConfirm}
                    disabled={isGenerating || text.trim().length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 py-2.5 rounded-xl font-bold font-heading text-xs tracking-tight transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
                  >
                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                    <span>{isGenerating ? 'Synthesizing...' : 'Generate Voice'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: VOICE CHANGE */}
            {activeTab === 'voice_change' && (
              <div className="flex flex-col gap-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-medium">Source Audio/Video</label>
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-zinc-300 dark:border-white/[0.1] hover:border-violet-400 dark:hover:border-violet-400 rounded-xl transition-colors cursor-pointer bg-zinc-50/50 dark:bg-white/[0.02] p-2">
                    <Upload size={18} className="text-zinc-400 mb-1" />
                    <span className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">Click to upload or drag and drop</span>
                    <span className="text-[10px] text-zinc-400 font-mono">MP3, WAV, MP4 up to 50MB</span>
                    <input type="file" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                  </label>
                  {uploadFile && (
                    <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-white/[0.04] p-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08]">
                      <Music size={14} className="text-violet-500" />
                      <span className="truncate flex-1 font-mono">{uploadFile.name}</span>
                      <Check size={14} className="text-green-500" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-medium">Target Voice</label>
                  <Dropdown 
                    options={VOICES.elevenlabs} 
                    value={vcTargetVoice} 
                    onChange={setVcTargetVoice} 
                    className="w-full"
                  />
                </div>

                <label className="flex items-center gap-2.5 p-2.5 border border-black/[0.08] dark:border-white/[0.08] rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors">
                  <input 
                    type="checkbox" 
                    checked={vcIsVideo}
                    onChange={(e) => setVcIsVideo(e.target.checked)}
                    className="w-4 h-4 text-violet-600 bg-zinc-50 border-zinc-300 rounded focus:ring-violet-500/30"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 font-heading">Input is video file</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Extracts audio, processes, and remuxes back to video</span>
                  </div>
                </label>

                <div className="pt-2">
                  <button 
                    onClick={requestVoiceChangeConfirm}
                    disabled={isGenerating || !uploadFile}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 py-2.5 rounded-xl font-bold font-heading text-xs tracking-tight transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
                  >
                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    <span>{isGenerating ? 'Processing...' : 'Transform Voice'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: TRANSLATE / LIP-SYNC */}
            {activeTab === 'translate' && (
              <div className="flex flex-col gap-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-medium">Source</label>
                    <Dropdown options={LANGUAGES} value={sourceLang} onChange={setSourceLang} />
                  </div>
                  <div className="mt-4 flex items-center justify-center text-zinc-400 w-7 h-7 rounded-full bg-zinc-50 dark:bg-white/[0.04]">
                    <ArrowRightLeft size={13} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-medium">Target</label>
                    <Dropdown options={LANGUAGES} value={targetLang} onChange={setTargetLang} />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-medium">Original Text</label>
                  <textarea 
                    value={transText}
                    onChange={(e) => setTransText(e.target.value)}
                    placeholder="Enter text to translate and dub..."
                    className="w-full h-20 bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl p-3 text-xs font-jakarta focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 resize-none transition-all leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-medium">TTS Provider</label>
                    <Dropdown options={PROVIDERS} value={transTtsProvider} onChange={setTransTtsProvider} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-medium">Output Voice</label>
                    <Dropdown options={VOICES[transTtsProvider as keyof typeof VOICES] || VOICES.openai} value={transVoice} onChange={setTransVoice} />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-medium">Video Path (Optional for Lip-sync)</label>
                  <input 
                    type="text"
                    value={videoPath}
                    onChange={(e) => setVideoPath(e.target.value)}
                    placeholder="/path/to/local/video.mp4"
                    className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/30 font-mono transition-all"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button 
                    onClick={() => requestTranslateConfirm(false)}
                    disabled={isGenerating || transText.trim().length === 0}
                    className="flex-1 bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-zinc-900 dark:text-zinc-100 py-2.5 rounded-xl text-xs font-mono font-medium transition-transform active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Translate Text
                  </button>
                  <button 
                    onClick={() => requestTranslateConfirm(true)}
                    disabled={isGenerating || transText.trim().length === 0}
                    className="flex-1 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 py-2.5 rounded-xl font-bold font-heading text-xs transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
                  >
                    Translate & Dub
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: PREVIEW */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.06] dark:border-white/[0.06] shadow-sm flex flex-col overflow-hidden h-[300px] lg:h-full relative group">
            
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-[#0d0d14] dark:to-[#111118] -z-10" />
            
            <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.06] flex justify-between items-center bg-white/50 dark:bg-[#0d0d14]/50 backdrop-blur-sm">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-medium">Output Monitor</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-white/[0.04]">
                  <button 
                    onClick={toggleMute}
                    className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-white/[0.08] text-zinc-500 dark:text-zinc-400 transition-colors cursor-pointer" 
                    title={isMuted || volume === 0 ? "Unmute" : "Mute"}
                  >
                    {isMuted || volume === 0 ? <VolumeX size={14} className="text-red-500" /> : <Volume2 size={14} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                  />
                </div>
                <button 
                  onClick={handleExportAudio}
                  className={cn(
                    "p-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-mono whitespace-nowrap shrink-0",
                    outputAudioUrl 
                      ? "bg-zinc-100 dark:bg-white/[0.06] text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-white/[0.1] cursor-pointer" 
                      : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                  )}
                  disabled={!outputAudioUrl}
                >
                  <Download size={14} />
                  EXPORT
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
              {isGenerating ? (
                <div className="w-full max-w-md my-auto py-6">
                  <LiveProgressBar
                    progress={progress}
                    stageTitle={stageTitle}
                    statusMessage={statusMessage}
                    elapsedSeconds={elapsedSeconds}
                    logs={telemetryLogs}
                    isActive={isGenerating}
                    showTerminal={true}
                  />
                </div>
              ) : outputAudioUrl ? (
                <div className="flex flex-col items-center gap-8 w-full max-w-md">
                  
                  {activeTab === 'translate' && translatedResultText && (
                    <div className="w-full bg-zinc-50 dark:bg-[#111118] p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-center text-sm italic text-zinc-700 dark:text-zinc-300 shadow-inner mb-4 max-h-32 overflow-y-auto custom-scrollbar">
                      "{translatedResultText}"
                    </div>
                  )}
                  
                  <div className="relative group/play cursor-pointer w-24 h-24 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shadow-2xl transition-transform hover:scale-105 active:scale-95" onClick={togglePlayback}>
                    <div className={cn(
                      "absolute inset-0 rounded-full border-2 border-zinc-400 dark:border-zinc-600 opacity-30",
                      isPlaying && "animate-ping"
                    )} />
                    {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-2" />}
                  </div>
                  
                  <div className="w-full h-12 flex items-center justify-center gap-1 opacity-70">
                    {/* Simulated Waveform Bars */}
                    {Array.from({length: 40}).map((_, i) => {
                      const h = isPlaying 
                        ? Math.max(20, Math.random() * 100) 
                        : 20 + Math.sin(i * 0.5) * 10;
                      return (
                        <div 
                          key={i} 
                          className="w-1.5 rounded-full bg-zinc-950 dark:bg-white transition-all duration-75"
                          style={{ height: `${h}%` }}
                        />
                      );
                    })}
                  </div>
                  
                  {/* Audio element with reactive event bindings */}
                  <audio 
                    ref={audioRef} 
                    src={outputAudioUrl} 
                    className="hidden" 
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-zinc-300 dark:text-zinc-700">
                  <Mic size={48} strokeWidth={1} />
                  <span className="text-[10px] font-mono tracking-widest uppercase font-medium">Waiting for input</span>
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>

        {/* Spend Safeguard Confirmation Modal */}
        <GenerationConfirmModal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={() => {
            setConfirmModalOpen(false);
            if (onConfirmCallback) onConfirmCallback();
          }}
          details={confirmDetails}
          loading={isGenerating}
        />
      </div>
    </div>
  );
}
