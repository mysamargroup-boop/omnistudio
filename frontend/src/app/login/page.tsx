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
          setTimeout(() => router.replace("/"), 950);
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
    }, 700);
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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-zinc-50 dark:bg-[#08080c] text-zinc-900 dark:text-white font-jakarta select-none transition-colors">
      <div className={cn(
        "w-full max-w-[540px] sm:max-w-[580px] relative transition-all duration-700",
        pinSuccess ? "animate-cardUnlockOpen pointer-events-none" : "animate-cardIn"
      )}>
        {/* Outer Border Wave Shell */}
        <div className={cn(
          "relative rounded-[30px] p-[2.5px] transition-all duration-500 overflow-hidden",
          (isPinVerifying || isSubmitting) && "shadow-[0_0_45px_rgba(16,185,129,0.4)]",
          pinSuccess && "shadow-[0_0_70px_rgba(16,185,129,0.7)]"
        )}>
          {/* Animated Border Wave Beam (sweeps in continuous waves along the border) */}
          {(isPinVerifying || isSubmitting || pinSuccess) && (
            <div className="absolute -top-[100%] -left-[100%] w-[300%] h-[300%] pointer-events-none">
              <div className={cn(
                "w-full h-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_250deg,#10b981_290deg,#34d399_320deg,#6ee7b7_345deg,#10b981_360deg)]",
                pinSuccess ? "animate-borderWaveFast" : "animate-borderWave"
              )} />
            </div>
          )}

          {/* Radiating Wave Rings around border during loading */}
          {(isPinVerifying || isSubmitting) && (
            <>
              <div className="absolute -inset-1.5 rounded-[32px] border-2 border-emerald-500/40 animate-ping opacity-25 pointer-events-none" />
              <div className="absolute -inset-3 rounded-[36px] border border-emerald-400/20 animate-pulse pointer-events-none" />
            </>
          )}

          {/* Clean Studio Card */}
          <div className="relative rounded-[27px] bg-white dark:bg-[#12121c] border border-zinc-200/80 dark:border-zinc-800 shadow-xl dark:shadow-2xl overflow-hidden p-6 sm:px-10 sm:py-7 space-y-5 z-10">
            {/* Header / Brand Architecture */}
            <div className="text-center space-y-2">
              <div className="inline-flex justify-center mb-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-xs">
                  <Fingerprint className="w-6 h-6" />
                </div>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white leading-none font-heading">
                OmniStudio
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Professional AI Creative Workstation
              </p>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  Authorized Studio Access
                </span>
              </div>
            </div>

            {/* Segmented Tab Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("pin");
                  setPinError(null);
                }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                  activeTab === "pin"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Passcode PIN</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("email");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                  activeTab === "email"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Cloud Account</span>
              </button>
            </div>

            {/* Form & Actions Area */}
            <div>
              {/* ══════════════ TAB 1: STUDIO PASSCODE ══════════════ */}
              {activeTab === "pin" && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">Enter 4-digit passcode</span>
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPin ? "Hide" : "View"}</span>
                    </button>
                  </div>

                  {/* 4 Digit OTP Entry (Dots removed, wider and horizontal proportion) */}
                  <div
                    className={cn("flex justify-center gap-3 sm:gap-4.5", shake && "animate-shake")}
                    onPaste={handlePaste}
                  >
                    {[0, 1, 2, 3].map((idx) => {
                      const isFilled = Boolean(pin[idx]);
                      return (
                        <input
                          key={idx}
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
                            "w-16 h-15 sm:w-20 sm:h-16 rounded-2xl text-center text-2xl font-bold font-mono outline-none transition-all",
                            "bg-zinc-50 dark:bg-zinc-900/90 border-2 text-zinc-900 dark:text-white",
                            isFilled
                              ? "border-emerald-500 bg-emerald-500/[0.06] shadow-sm text-emerald-600 dark:text-emerald-400"
                              : "border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20",
                            (isPinVerifying || pinSuccess) && "opacity-70 cursor-not-allowed"
                          )}
                          autoComplete="one-time-code"
                        />
                      );
                    })}
                  </div>

                  {/* Status Indicator */}
                  <div className="min-h-[22px] flex items-center justify-center">
                    {isPinVerifying && (
                      <div className="inline-flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>Verifying studio security key...</span>
                      </div>
                    )}
                    {pinSuccess && (
                      <div className="inline-flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Access Authorized. Launching Studio...</span>
                      </div>
                    )}
                    {pinError && (
                      <div className="inline-flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 py-1.5 px-3 rounded-xl animate-fadeIn">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{pinError}</span>
                      </div>
                    )}
                  </div>

                  {/* Unlock Button */}
                  <button
                    type="button"
                    onClick={() => executePinLogin(pin.join(""))}
                    disabled={isPinVerifying || pinSuccess || pin.join("").length < 4}
                    className={cn(
                      "w-full rounded-xl py-3.5 px-5 font-bold text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2",
                      "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20",
                      "active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
                      (isPinVerifying || pinSuccess) && "bg-emerald-500"
                    )}
                  >
                    {isPinVerifying ? (
                      <div className="flex items-center gap-2">
                        <Spinner size="sm" variant="current" className="text-white" />
                        <span>Authenticating Credentials...</span>
                      </div>
                    ) : pinSuccess ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>Passcode Verified · Opening Studio...</span>
                      </div>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        <span>Unlock Studio Access</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-[11px] text-zinc-400 font-mono">
                    Auto-authenticates on 4th digit · Direct instant access
                  </p>
                </div>
              )}

            {/* ══════════════ TAB 2: EMAIL / PROFESSIONAL CLOUD ══════════════ */}
            {activeTab === "email" && (
              <form onSubmit={handleEmailSubmit} className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEmailAuthMode("password");
                        setErrorMessage(null);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                        emailAuthMode === "password"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
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
                        "px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                        emailAuthMode === "otp"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      )}
                    >
                      Enter 6-Digit Code
                    </button>
                  </div>

                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Whitelisted
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block">
                    Authorized Studio Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="mysamargroup@gmail.com"
                      required
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                    />
                  </div>
                </div>

                {emailAuthMode === "password" && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-mono font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showPassword ? "Hide" : "View"}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your account password"
                        required
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>
                )}

                {emailAuthMode === "otp" && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-mono font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                        6-Digit Email Code
                      </label>
                      <span className="text-[10px] text-zinc-400 font-mono">Check your inbox</span>
                    </div>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={8}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="e.g. 123456"
                        required
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono font-bold tracking-widest"
                      />
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span className="leading-snug">{errorMessage}</span>
                  </div>
                )}
                {successMessage && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-snug">{successMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl py-3 px-5 font-bold text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-40"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <span>
                        {emailAuthMode === "password"
                          ? "Authenticate with Password"
                          : "Verify Code & Enter Studio"}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-800">
                  <span>Need a new confirmation link?</span>
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={isResending}
                    className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-40 transition-colors cursor-pointer"
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
      <div className="text-center mt-4 space-y-0.5">
        <p className="text-[11px] text-zinc-400 font-medium">
          OmniStudio AI · Production Studio Workstation
        </p>
        <p className="text-[10px] text-zinc-400/80 font-mono">
          Authorized Studio Access · 256-bit TLS Encrypted
        </p>
      </div>
    </div>

    {/* Scoped CSS Keyframes */}
    <style jsx>{`
      @keyframes cardIn {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.97);
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
      @keyframes borderWave {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
      @keyframes borderWaveFast {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
      @keyframes cardUnlockOpen {
        0% {
          transform: scale(1);
          opacity: 1;
          filter: blur(0px);
        }
        50% {
          transform: scale(1.025);
          opacity: 0.95;
          box-shadow: 0 0 50px rgba(16, 185, 129, 0.4);
        }
        100% {
          transform: scale(1.08);
          opacity: 0;
          filter: blur(4px);
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
      .animate-borderWave {
        animation: borderWave 2.2s linear infinite;
      }
      .animate-borderWaveFast {
        animation: borderWaveFast 0.75s linear infinite;
      }
      .animate-cardUnlockOpen {
        animation: cardUnlockOpen 0.95s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
    `}</style>
    </div>
  );
}
