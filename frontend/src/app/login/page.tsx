"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Zap,
  Fingerprint,
  Sparkles,
  Eye,
  EyeOff,
  Shield,
  KeyRound,
  RotateCcw,
  Key,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";

type TabType = "pin" | "email";
type EmailAuthMode = "password" | "otp";

// Whitelisted authorized studio accounts
const AUTHORIZED_EMAILS = ["mysamargroup@gmail.com"];

function playStudioUnlockSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Rich cinematic synth chord progression (C4, G4, C5, E5, B5, C6) with 2.0s acoustic decay
    const notes = [
      { freq: 261.63, delay: 0.00, gain: 0.20, type: "sine" as OscillatorType },
      { freq: 392.00, delay: 0.06, gain: 0.18, type: "sine" as OscillatorType },
      { freq: 523.25, delay: 0.12, gain: 0.22, type: "triangle" as OscillatorType },
      { freq: 659.25, delay: 0.18, gain: 0.20, type: "sine" as OscillatorType },
      { freq: 987.77, delay: 0.24, gain: 0.14, type: "sine" as OscillatorType },
      { freq: 1046.50, delay: 0.30, gain: 0.16, type: "sine" as OscillatorType },
    ];

    notes.forEach(({ freq, delay, gain, type }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.004, now + delay + 1.2);

      // Envelope: 40ms attack, gentle sustain, 2.0s exponential decay tail
      gainNode.gain.setValueAtTime(0.0001, now + delay);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + delay + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(gain * 0.45, now + delay + 0.6);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + 2.0);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 2.1);
    });
  } catch (e) {
    console.warn("Studio unlock chime error:", e);
  }
}

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    profile,
    isPinAuthenticated,
    isAuthenticated,
    loading,
    loginWithPin,
    signInWithPassword,
    signOut,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("pin");

  // ─── PIN State ───
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [showPin, setShowPin] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isPinVerifying, setIsPinVerifying] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  // ─── Email / Supabase State ───
  const [emailAuthMode, setEmailAuthMode] = useState<EmailAuthMode>("password");
  const [email, setEmail] = useState("mysamargroup@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated && activeTab === "pin" && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [loading, isAuthenticated, activeTab]);

  const handlePinChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const newPin = [...pin];
      newPin[index] = "";
      setPin(newPin);
      return;
    }
    const digit = cleaned[cleaned.length - 1];
    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    setPinError(null);
    if (index < 3) {
      inputRefs.current[index + 1]?.focus();
    } else if (index === 3) {
      executePinLogin(newPin.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;
    const newPin = [...pin];
    for (let i = 0; i < pasted.length; i++) {
      newPin[i] = pasted[i];
    }
    setPin(newPin);
    if (pasted.length === 4) {
      executePinLogin(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  const executePinLogin = async (fullCode: string) => {
    if (fullCode.length < 4) {
      setPinError("Please enter all 4 digits");
      return;
    }
    setIsPinVerifying(true);
    setPinError(null);
    setTimeout(async () => {
      try {
        const res = await loginWithPin(fullCode);
        if (res.success) {
          playStudioUnlockSound();
          setPinSuccess(true);
          setIsPinVerifying(false);
          setTimeout(() => router.replace("/"), 1100);
        } else {
          setIsPinVerifying(false);
          setPinError(res.error || "Invalid passcode. Please verify.");
          setShake(true);
          setTimeout(() => setShake(false), 500);
          setPin(["", "", "", ""]);
          inputRefs.current[0]?.focus();
        }
      } catch (err: any) {
        setIsPinVerifying(false);
        setPinError(err?.message || "Authentication failed");
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    }, 200);
  };

  // Check if an email is authorized
  const isEmailAuthorized = (targetEmail: string) => {
    const clean = targetEmail.trim().toLowerCase();
    return AUTHORIZED_EMAILS.includes(clean);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    // Security check: only authorized studio email
    if (!isEmailAuthorized(cleanEmail)) {
      setErrorMessage(`Access Restricted: Only authorized accounts (${AUTHORIZED_EMAILS.join(", ")}) can log in.`);
      return;
    }

    setIsSubmitting(true);

    try {
      if (emailAuthMode === "password") {
        if (!password) {
          setErrorMessage("Please enter your password.");
          setIsSubmitting(false);
          return;
        }

        const { error } = await signInWithPassword(cleanEmail, password);

        if (error) {
          if (error.message?.toLowerCase().includes("email not confirmed")) {
            setErrorMessage(
              "Email confirmation pending. Please check your inbox or switch to 'Verify 6-Digit Code' below."
            );
          } else if (error.message?.toLowerCase().includes("invalid login credentials")) {
            setErrorMessage("Invalid credentials. Please verify your password or use your PIN passcode.");
          } else {
            setErrorMessage(error.message);
          }
        } else {
          setSuccessMessage("Authentication successful. Entering studio...");
          setTimeout(() => router.replace("/"), 800);
        }
      } else {
        // OTP Verification Mode
        if (!otpCode || otpCode.trim().length < 6) {
          setErrorMessage("Please enter the 6-digit confirmation code sent to your email.");
          setIsSubmitting(false);
          return;
        }

        // Try signup OTP first, then fallback to email OTP
        let { data, error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: otpCode.trim(),
          type: "signup",
        });

        if (error) {
          const fallback = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: otpCode.trim(),
            type: "email",
          });
          data = fallback.data;
          error = fallback.error;
        }

        if (error) {
          setErrorMessage(error.message || "Invalid or expired verification code.");
        } else if (data.session) {
          setSuccessMessage("Email confirmed and session authenticated! Entering studio...");
          setTimeout(() => router.replace("/"), 800);
        } else {
          setSuccessMessage("Verification complete. You can now sign in with your password.");
          setEmailAuthMode("password");
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected authentication error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!isEmailAuthorized(cleanEmail)) {
      setErrorMessage(`Only authorized accounts (${AUTHORIZED_EMAILS.join(", ")}) can request confirmation.`);
      return;
    }
    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: cleanEmail,
      });

      if (error) {
        if (error.message?.toLowerCase().includes("rate limit")) {
          setErrorMessage("Confirmation was recently sent. Please check your inbox or spam folder.");
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setSuccessMessage(`Confirmation email resent to ${cleanEmail}. Check your inbox!`);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to resend confirmation.");
    } finally {
      setIsResending(false);
    }
  };

  // ─── Authenticated State Screen ───
  if (!loading && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#07070a] font-montserrat">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-md w-full animate-cardIn">
          <div className="relative rounded-[28px] border border-white/[0.08] bg-[#0c0d15]/85 backdrop-blur-2xl p-8 space-y-7 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-4">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-emerald-400/15 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <ShieldCheck className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Active Session</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">OmniStudio Workstation</h2>
              </div>
            </div>

            <div className="space-y-3 p-4 rounded-2xl bg-[#08080e]/70 border border-white/[0.05]">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-medium">Access Method</span>
                <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {isPinAuthenticated ? "Studio Passcode" : "Cloud Account"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-medium">Authorized User</span>
                <span className="font-semibold text-zinc-200 truncate max-w-[200px]">
                  {user?.email || profile?.full_name || "Studio Administrator"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-medium">Session Status</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Authorized
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="group flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-white via-zinc-100 to-zinc-200 text-[#07070a] font-bold text-xs tracking-wide hover:shadow-[0_0_25px_rgba(255,255,255,0.25)] active:scale-[0.98] transition-all cursor-pointer"
              >
                Dashboard
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                type="button"
                onClick={() => router.push("/studio")}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600/15 text-indigo-200 font-semibold text-xs tracking-wide border border-indigo-500/30 hover:bg-indigo-600/25 hover:border-indigo-500/50 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 text-indigo-400" />
                Launch Studio
              </button>
            </div>

            <button
              type="button"
              onClick={() => signOut()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold text-rose-400/90 hover:text-rose-300 bg-rose-500/[0.06] hover:bg-rose-500/[0.12] border border-rose-500/15 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Disconnect Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Primary Authentication Screen ───
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[#07070a] text-white font-montserrat select-none">
      {/* Dynamic Ambient Glow Backdrops */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: "28px 28px",
          }}
        />

        {/* Ambient Top Glow */}
        <div
          className="absolute -top-[120px] left-1/2 -translate-x-1/2 w-[700px] h-[450px] rounded-full opacity-40 blur-[120px] pointer-events-none"
          style={{
            background:
              activeTab === "pin"
                ? "radial-gradient(circle, rgba(245,158,11,0.25) 0%, rgba(217,119,6,0.08) 50%, transparent 80%)"
                : "radial-gradient(circle, rgba(99,102,241,0.3) 0%, rgba(59,130,246,0.12) 50%, transparent 80%)",
            transition: "background 0.6s ease",
          }}
        />

        {/* Secondary Corner Glow */}
        <div
          className="absolute -bottom-[80px] -right-[80px] w-[500px] h-[400px] rounded-full opacity-25 blur-[100px] pointer-events-none"
          style={{
            background:
              activeTab === "pin"
                ? "radial-gradient(circle, rgba(234,88,12,0.3) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)",
            transition: "background 0.6s ease",
          }}
        />
      </div>

      {/* Main Glassmorphic Chassis */}
      <div className="relative z-10 w-full max-w-[440px] animate-cardIn">
        {/* Outer Halo Glow */}
        <div
          className="relative rounded-[32px] p-[1px] transition-all duration-500"
          style={{
            background:
              activeTab === "pin"
                ? "linear-gradient(135deg, rgba(245,158,11,0.4) 0%, rgba(255,255,255,0.08) 50%, rgba(217,119,6,0.2) 100%)"
                : "linear-gradient(135deg, rgba(99,102,241,0.45) 0%, rgba(255,255,255,0.08) 50%, rgba(59,130,246,0.25) 100%)",
            boxShadow:
              activeTab === "pin"
                ? "0 25px 60px -15px rgba(0,0,0,0.9), 0 0 50px -10px rgba(245,158,11,0.15)"
                : "0 25px 60px -15px rgba(0,0,0,0.9), 0 0 60px -10px rgba(99,102,241,0.2)",
          }}
        >
          {/* Inner Card Container */}
          <div className="relative rounded-[31px] bg-[#0c0d15]/90 backdrop-blur-3xl overflow-hidden border border-white/[0.04]">
            {/* Top Specular Edge Highlight */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

            {/* Header / Brand Architecture */}
            <div className="pt-9 pb-5 px-8 text-center relative">
              {/* Brand Emblem */}
              <div className="inline-flex justify-center mb-4">
                <div
                  className="relative p-3.5 rounded-2xl transition-all duration-500 shadow-lg"
                  style={{
                    background:
                      activeTab === "pin"
                        ? "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(217,119,6,0.05) 100%)"
                        : "linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(59,130,246,0.08) 100%)",
                    border:
                      activeTab === "pin"
                        ? "1px solid rgba(245,158,11,0.35)"
                        : "1px solid rgba(99,102,241,0.4)",
                    boxShadow:
                      activeTab === "pin"
                        ? "0 0 25px rgba(245,158,11,0.25)"
                        : "0 0 25px rgba(99,102,241,0.3)",
                  }}
                >
                  {activeTab === "pin" ? (
                    <Fingerprint className="w-7 h-7 text-amber-400 transition-colors" />
                  ) : (
                    <Sparkles className="w-7 h-7 text-indigo-400 transition-colors" />
                  )}
                </div>
              </div>

              {/* Title & Tagline */}
              <h1 className="text-[26px] sm:text-[28px] font-extrabold tracking-tight bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent leading-none">
                OmniStudio
              </h1>
              <p className="text-xs text-zinc-400 mt-2 font-medium tracking-wide">
                Professional AI Creative Workstation
              </p>

              {/* Security Pill */}
              <div className="inline-flex items-center gap-1.5 mt-3.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] shadow-inner">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                  Authorized Access Only
                </span>
              </div>
            </div>

            {/* Segmented Tab Switcher */}
            <div className="px-7 mb-6">
              <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-[#07080e] border border-white/[0.07] shadow-inner">
                {/* Passcode Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("pin");
                    setPinError(null);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 cursor-pointer",
                    activeTab === "pin"
                      ? "bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 text-amber-300 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                  )}
                >
                  <KeyRound className={cn("w-4 h-4", activeTab === "pin" ? "text-amber-400" : "text-zinc-400")} />
                  <span>Passcode PIN</span>
                </button>

                {/* Email Account Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("email");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 cursor-pointer",
                    activeTab === "email"
                      ? "bg-gradient-to-r from-indigo-500/25 via-blue-500/20 to-purple-500/15 text-indigo-200 border border-indigo-500/40 shadow-[0_0_18px_rgba(99,102,241,0.25)]"
                      : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                  )}
                >
                  <Mail className={cn("w-4 h-4", activeTab === "email" ? "text-indigo-400" : "text-zinc-400")} />
                  <span>Cloud Account</span>
                </button>
              </div>
            </div>

            {/* Form & Actions Area */}
            <div className="px-7 pb-8">
              {/* ══════════════ TAB 1: STUDIO PASSCODE ══════════════ */}
              {activeTab === "pin" && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Subheader with View / Hide Password Toggle */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-medium">Enter 4-digit passcode</span>
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-amber-300/80 hover:text-amber-300 border border-amber-500/20 transition-all cursor-pointer text-[11px] font-semibold"
                      title={showPin ? "Hide passcode digits" : "Show passcode digits"}
                    >
                      {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPin ? "Hide" : "View"}</span>
                    </button>
                  </div>

                  {/* 4 Digit OTP Entry */}
                  <div
                    className={cn("flex justify-center gap-3 sm:gap-3.5", shake && "animate-shake")}
                    onPaste={handlePaste}
                  >
                    {[0, 1, 2, 3].map((idx) => {
                      const isFilled = Boolean(pin[idx]);
                      return (
                        <div key={idx} className="flex flex-col items-center gap-2">
                          <input
                            ref={(el) => {
                              inputRefs.current[idx] = el;
                            }}
                            type={showPin ? "text" : "password"}
                            inputMode="numeric"
                            maxLength={1}
                            value={pin[idx]}
                            onChange={(e) => handlePinChange(idx, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(idx, e)}
                            disabled={isPinVerifying || pinSuccess}
                            className={cn(
                              "w-14 h-16 sm:w-16 sm:h-18 rounded-2xl text-center text-2xl font-black text-amber-300 outline-none transition-all duration-200",
                              "bg-[#07080e]/90 border-2",
                              isFilled
                                ? "border-amber-400/80 bg-amber-500/[0.08] shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                                : "border-white/[0.08] focus:border-amber-400/60 focus:bg-amber-500/[0.04] focus:ring-4 focus:ring-amber-500/15",
                              (isPinVerifying || pinSuccess) && "opacity-60 cursor-not-allowed"
                            )}
                            autoComplete="one-time-code"
                          />
                          {/* Dot indicator */}
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full transition-all duration-300",
                              isFilled ? "bg-amber-400 scale-125 shadow-[0_0_8px_rgba(245,158,11,0.8)]" : "bg-white/10"
                            )}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Status Indicator */}
                  <div className="min-h-[28px] flex items-center justify-center">
                    {isPinVerifying && (
                      <div className="inline-flex items-center gap-2 text-xs text-amber-300/90 font-medium">
                        <Spinner size="xs" variant="current" className="text-amber-400" />
                        <span>Verifying studio credentials...</span>
                      </div>
                    )}
                    {pinSuccess && (
                      <div className="inline-flex items-center gap-2 text-xs text-emerald-400 font-semibold animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Passcode verified. Unlocking workstation...</span>
                      </div>
                    )}
                    {pinError && (
                      <div className="inline-flex items-center gap-2 text-xs text-rose-300 font-medium bg-rose-500/10 border border-rose-500/25 py-2 px-3.5 rounded-xl animate-fadeIn">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{pinError}</span>
                      </div>
                    )}
                  </div>

                  {/* Rich Unlock Button */}
                  <button
                    type="button"
                    onClick={() => executePinLogin(pin.join(""))}
                    disabled={isPinVerifying || pinSuccess || pin.join("").length < 4}
                    className={cn(
                      "group relative w-full overflow-hidden rounded-xl py-3.5 px-6 font-bold text-xs tracking-wider uppercase transition-all duration-300 cursor-pointer flex items-center justify-center gap-2.5",
                      "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-[#07070a]",
                      "shadow-[0_10px_25px_-5px_rgba(245,158,11,0.4),0_0_20px_rgba(245,158,11,0.25)]",
                      "hover:from-amber-400 hover:via-orange-400 hover:to-amber-500 hover:shadow-[0_15px_30px_-5px_rgba(245,158,11,0.55),0_0_25px_rgba(245,158,11,0.35)]",
                      "active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
                    )}
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

                    {isPinVerifying ? (
                      <Spinner size="sm" variant="current" className="text-[#07070a]" />
                    ) : (
                      <>
                        <Shield className="w-4 h-4 text-[#07070a]" />
                        <span>Unlock Studio Access</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-[11px] text-zinc-400 font-medium">
                    Auto-authenticates on 4th digit · Direct instant access
                  </p>
                </div>
              )}

              {/* ══════════════ TAB 2: EMAIL / PROFESSIONAL CLOUD ══════════════ */}
              {activeTab === "email" && (
                <form onSubmit={handleEmailSubmit} className="space-y-4 animate-fadeIn">
                  {/* Mode Switcher: Password vs 6-Digit Email Code */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEmailAuthMode("password");
                          setErrorMessage(null);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          emailAuthMode === "password"
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            : "text-zinc-400 hover:text-zinc-200"
                        )}
                      >
                        Password Login
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailAuthMode("otp");
                          setErrorMessage(null);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          emailAuthMode === "otp"
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            : "text-zinc-400 hover:text-zinc-200"
                        )}
                      >
                        Enter 6-Digit Code
                      </button>
                    </div>

                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Whitelisted
                    </span>
                  </div>

                  {/* Email Address (Prefilled & Restricted to Authorized Account) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Authorized Studio Email
                      </label>
                      <span className="text-[10px] text-zinc-400 font-medium">Samar Group Admin</span>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 transition-colors" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="mysamargroup@gmail.com"
                        required
                        className="w-full bg-[#07080e]/90 border border-indigo-500/30 rounded-xl pl-11 pr-4 py-3 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none hover:border-indigo-500/50 focus:border-indigo-400 focus:bg-[#0a0c16] focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Mode A: Password Login */}
                  {emailAuthMode === "password" && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-indigo-300 hover:text-white border border-white/[0.08] transition-colors cursor-pointer text-[11px] font-medium"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{showPassword ? "Hide" : "View"}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 transition-colors" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your account password"
                          required
                          className="w-full bg-[#07080e]/90 border border-white/[0.08] rounded-xl pl-11 pr-12 py-3 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none hover:border-white/15 focus:border-indigo-400/80 focus:bg-[#0a0c16] focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
                          title={showPassword ? "Hide password" : "View password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mode B: 6-Digit Email Verification Code (OTP) */}
                  {emailAuthMode === "otp" && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                          6-Digit Email Code
                        </label>
                        <span className="text-[10px] text-indigo-400">Sent to mysamargroup@gmail.com</span>
                      </div>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 transition-colors" />
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={8}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="e.g. 123456"
                          required
                          className="w-full bg-[#07080e]/90 border border-indigo-500/30 rounded-xl pl-11 pr-4 py-3 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none hover:border-indigo-500/50 focus:border-indigo-400 focus:bg-[#0a0c16] focus:ring-2 focus:ring-indigo-500/20 transition-all tracking-widest font-mono font-bold"
                        />
                      </div>
                    </div>
                  )}

                  {/* Feedback Alerts */}
                  {errorMessage && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{errorMessage}</span>
                    </div>
                  )}
                  {successMessage && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{successMessage}</span>
                    </div>
                  )}

                  {/* Professional Gradient Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "group relative w-full overflow-hidden rounded-xl py-3.5 px-6 font-bold text-xs tracking-wider uppercase transition-all duration-300 cursor-pointer flex items-center justify-center gap-2.5",
                      "bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white",
                      "border border-indigo-400/30",
                      "shadow-[0_10px_25px_-5px_rgba(79,70,229,0.5),0_0_20px_rgba(99,102,241,0.3)]",
                      "hover:from-indigo-500 hover:via-indigo-400 hover:to-blue-500 hover:shadow-[0_15px_30px_-5px_rgba(79,70,229,0.65),0_0_30px_rgba(99,102,241,0.45)]",
                      "active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
                    )}
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <>
                        <span>
                          {emailAuthMode === "password"
                            ? "Authenticate with Password"
                            : "Verify Code & Enter Studio"}
                        </span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>

                  {/* Resend Confirmation Link Helper */}
                  <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-400 border-t border-white/[0.04]">
                    <span>Need a new confirmation link?</span>
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={isResending}
                      className="inline-flex items-center gap-1 font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      {isResending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      <span>Resend Email</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Footer Attribution */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-[11px] text-zinc-400 font-medium tracking-wide">
            OmniStudio AI · Samar Group Infrastructure
          </p>
          <p className="text-[10px] text-zinc-500">
            Authorized Studio Access · 256-bit TLS Encrypted
          </p>
        </div>
      </div>

      {/* Scoped CSS Keyframes */}
      <style jsx>{`
        @keyframes cardIn {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          20%,
          60% {
            transform: translateX(-6px);
          }
          40%,
          80% {
            transform: translateX(6px);
          }
        }
        .animate-cardIn {
          animation: cardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
