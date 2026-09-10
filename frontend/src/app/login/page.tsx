"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  KeyRound,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Zap,
  Fingerprint,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

type TabType = "pin" | "supabase";
type AuthMode = "signin" | "signup";

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
    signUp,
    signInWithGoogle,
    signOut,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("pin");

  // ─── PIN OTP Boxes State ───
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isPinVerifying, setIsPinVerifying] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  // ─── Supabase State ───
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-focus first digit on mount
  useEffect(() => {
    if (!loading && !isAuthenticated && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [loading, isAuthenticated]);

  // Handle PIN Input
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
      const fullPin = newPin.join("");
      executePinLogin(fullPin);
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
    setIsPinVerifying(true);
    setPinError(null);

    setTimeout(async () => {
      const res = await loginWithPin(fullCode);
      if (res.success) {
        setPinSuccess(true);
        setIsPinVerifying(false);
        setTimeout(() => {
          router.replace("/");
        }, 600);
      } else {
        setIsPinVerifying(false);
        setPinError("Invalid Passcode. Enter correct Studio PIN.");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin(["", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    }, 250);
  };

  // Supabase Auth Submit
  const handleSupabaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === "signin") {
        if (!email || !password) {
          setErrorMessage("Please enter both email and password.");
          setIsSubmitting(false);
          return;
        }
        const { error } = await signInWithPassword(email, password);
        if (error) {
          setErrorMessage(error.message);
        } else {
          setSuccessMessage("Supabase verified! Redirecting to workstation...");
          setTimeout(() => router.replace("/"), 800);
        }
      } else {
        if (!email || !password) {
          setErrorMessage("Please fill all required fields.");
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setErrorMessage("Password must be at least 6 characters.");
          setIsSubmitting(false);
          return;
        }
        const { error, session } = await signUp(email, password, fullName);
        if (error) {
          setErrorMessage(error.message);
        } else {
          if (session) {
            setSuccessMessage("Account created! Redirecting to studio...");
            setTimeout(() => router.replace("/"), 1000);
          } else {
            setSuccessMessage("Verification email sent! Check your inbox.");
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Already Authenticated View ───
  if (!loading && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#050508] text-white">
        {/* Ambient */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/6 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-md w-full space-y-6" style={{ animation: "loginCardEnter 0.6s cubic-bezier(0.16,1,0.3,1) forwards" }}>
          {/* Gradient border wrapper */}
          <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-emerald-500/40 via-white/10 to-cyan-500/30">
            <div className="rounded-3xl bg-[#0a0a10]/95 backdrop-blur-2xl p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <ShieldCheck className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400 block" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                    Security Cleared • Active
                  </span>
                  <h2 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                    OmniStudio Workstation
                  </h2>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3 text-xs" style={{ fontFamily: "var(--font-mono)" }}>
                <div className="flex justify-between items-center pb-2.5 border-b border-white/[0.06]">
                  <span className="text-zinc-500">AUTH TYPE</span>
                  <span className="font-semibold text-emerald-400">
                    {isPinAuthenticated ? "STUDIO PIN" : "SUPABASE CLOUD"}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2.5 border-b border-white/[0.06]">
                  <span className="text-zinc-500">USER</span>
                  <span className="text-zinc-300 truncate max-w-[200px]">
                    {user ? user.email : "Studio Admin"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">STATUS</span>
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ONLINE
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.push("/")}
                  className="group w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-white to-zinc-100 text-zinc-900 font-bold text-sm tracking-tight transition-all duration-300 cursor-pointer shadow-lg shadow-white/10 hover:shadow-white/20 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  onClick={() => router.push("/studio")}
                  className="group w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-300 font-bold text-sm tracking-tight transition-all duration-300 cursor-pointer border border-amber-500/20 hover:border-amber-500/40 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Studio</span>
                </button>
              </div>

              <button
                onClick={() => signOut()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm text-rose-400 bg-rose-500/8 hover:bg-rose-500/15 transition-all duration-300 font-semibold cursor-pointer border border-rose-500/15 hover:border-rose-500/30"
                style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
              >
                <LogOut className="w-4 h-4" />
                <span>End Session</span>
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes loginCardEnter {
            from { opacity: 0; transform: translateY(20px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>
    );
  }

  // ─── Main Login UI ───
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#050508] text-white relative overflow-hidden">
      {/* Dynamic Ambient Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Floating orbs */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[160px] opacity-60"
          style={{
            top: "15%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(251,191,36,0.06) 50%, transparent 80%)",
            animation: "orbFloat1 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full blur-[120px] opacity-40"
          style={{
            bottom: "10%",
            right: "15%",
            background: "radial-gradient(circle, rgba(6,182,212,0.1) 0%, rgba(139,92,246,0.05) 60%, transparent 80%)",
            animation: "orbFloat2 10s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full blur-[100px] opacity-30"
          style={{
            top: "60%",
            left: "10%",
            background: "radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)",
            animation: "orbFloat3 12s ease-in-out infinite",
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-[440px]" style={{ animation: "loginCardEnter 0.7s cubic-bezier(0.16,1,0.3,1) forwards" }}>
        {/* Animated gradient border */}
        <div className="relative rounded-3xl p-[1px]" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.4), rgba(251,191,36,0.3), rgba(6,182,212,0.4), rgba(139,92,246,0.4))", backgroundSize: "300% 300%", animation: "gradientShift 6s ease infinite" }}>
          <div className="rounded-3xl bg-[#0a0a10]/90 backdrop-blur-3xl p-7 sm:p-9 space-y-7">

            {/* Brand Header */}
            <div className="text-center space-y-3">
              {/* Animated badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 to-violet-500/10 border border-white/[0.08]">
                <Lock className="w-3.5 h-3.5 text-amber-400" style={{ animation: "lockPulse 3s ease-in-out infinite" }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-300" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                  Protected Workstation
                </span>
              </div>

              {/* Title with gradient */}
              <h1
                className="text-3xl sm:text-4xl font-extrabold tracking-tight"
                style={{
                  fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
                  background: "linear-gradient(135deg, #ffffff 0%, #a1a1aa 50%, #ffffff 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                OmniStudio AI
              </h1>

              <p className="text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                Enter your 4-digit passcode or sign in with your Cloud account
              </p>
            </div>

            {/* Tab Switcher — Pill style */}
            <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("pin");
                  setPinError(null);
                }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer",
                  activeTab === "pin"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
                style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
              >
                <KeyRound className="w-4 h-4" />
                <span>PIN Code</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("supabase");
                  setErrorMessage(null);
                }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer",
                  activeTab === "supabase"
                    ? "bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/20"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
                style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Cloud Login</span>
              </button>
            </div>

            {/* ─── TAB 1: PIN CODE ─── */}
            {activeTab === "pin" && (
              <div className="space-y-6 pt-1" style={{ animation: "tabSlideIn 0.35s ease-out" }}>
                <div className="text-center space-y-1.5">
                  <div className="flex items-center justify-center gap-2">
                    <Fingerprint className="w-5 h-5 text-amber-400/70" />
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                      Enter 4-Digit Security PIN
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                    Auto-authenticates on the 4th digit
                  </p>
                </div>

                {/* 4 OTP Digit Boxes — Glowing */}
                <div
                  className={cn(
                    "flex justify-center items-center gap-3 sm:gap-4 transition-transform",
                    shake && "animate-shake"
                  )}
                  onPaste={handlePaste}
                >
                  {[0, 1, 2, 3].map((idx) => (
                    <div key={idx} className="relative group">
                      {/* Glow ring behind */}
                      <div className={cn(
                        "absolute -inset-1 rounded-2xl transition-opacity duration-300",
                        pin[idx] ? "opacity-100 bg-amber-500/15 blur-md" : "opacity-0"
                      )} />
                      <input
                        ref={(el) => {
                          inputRefs.current[idx] = el;
                        }}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={pin[idx]}
                        onChange={(e) => handlePinChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        disabled={isPinVerifying || pinSuccess}
                        className={cn(
                          "relative w-16 h-[72px] rounded-2xl bg-white/[0.03] border-2 text-center text-2xl font-bold text-white transition-all duration-300 outline-none",
                          pin[idx]
                            ? "border-amber-400/60 bg-white/[0.06] shadow-[0_0_25px_rgba(251,191,36,0.12)]"
                            : "border-white/[0.08] hover:border-white/[0.15] focus:border-amber-400/80 focus:bg-white/[0.05] focus:shadow-[0_0_20px_rgba(251,191,36,0.1)]"
                        )}
                        style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
                        autoComplete="one-time-code"
                      />
                      {/* Dot indicator below */}
                      <div className={cn(
                        "absolute -bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-all duration-300",
                        pin[idx] ? "bg-amber-400 scale-100" : "bg-zinc-700 scale-75"
                      )} />
                    </div>
                  ))}
                </div>

                {/* Verification & Error Feedback */}
                <div className="min-h-[36px] flex items-center justify-center">
                  {isPinVerifying && (
                    <div className="flex items-center justify-center gap-2.5 text-sm font-semibold text-amber-400 animate-pulse" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  )}

                  {pinSuccess && (
                    <div className="flex items-center justify-center gap-2.5 text-sm font-semibold text-emerald-400" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", animation: "successPop 0.4s ease-out" }}>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Access Granted! Launching...</span>
                    </div>
                  )}

                  {pinError && (
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 py-2.5 px-4 rounded-2xl" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", animation: "errorSlide 0.3s ease-out" }}>
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{pinError}</span>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <span className="text-[11px] text-zinc-600" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                    Passcode secured via environment configuration
                  </span>
                </div>
              </div>
            )}

            {/* ─── TAB 2: Supabase Cloud Login ─── */}
            {activeTab === "supabase" && (
              <form onSubmit={handleSupabaseSubmit} className="space-y-5 pt-1" style={{ animation: "tabSlideIn 0.35s ease-out" }}>
                <div className="flex justify-between items-center pb-1">
                  <span className="text-sm font-bold text-zinc-200" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                    {mode === "signin" ? "Sign In — OmniStudio Cloud" : "Create New Account"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "signin" ? "signup" : "signin");
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
                    style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
                  >
                    {mode === "signin" ? "Register →" : "Log in →"}
                  </button>
                </div>

                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>Full Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Samar Creator"
                        className="w-full bg-white/[0.03] border-2 border-white/[0.08] rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.05] transition-all duration-300"
                        style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="creator@omnistudio.ai"
                      required
                      className="w-full bg-white/[0.03] border-2 border-white/[0.08] rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.05] transition-all duration-300"
                      style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-white/[0.03] border-2 border-white/[0.08] rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.05] transition-all duration-300"
                      style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-sm font-semibold text-rose-400" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", animation: "errorSlide 0.3s ease-out" }}>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-sm font-semibold text-emerald-400" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* Primary CTA — Gradient Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm tracking-tight transition-all duration-300 cursor-pointer shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                  style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{mode === "signin" ? "Sign In with Supabase" : "Create Account"}</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>or</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>

                {/* Google OAuth Button */}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage("Google Cloud OAuth configuration pending. Use Email & Password or Studio PIN Passcode.");
                  }}
                  className="group w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] text-zinc-300 hover:text-white border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 text-sm font-semibold cursor-pointer"
                  style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  <span className="text-[10px] text-zinc-500 font-normal">(Coming Soon)</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom branding */}
        <div className="text-center mt-6">
          <p className="text-[10px] text-zinc-600 tracking-wider" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
            © 2025 OmniStudio AI • Powered by Samar Group
          </p>
        </div>
      </div>

      {/* Inline CSS animations */}
      <style jsx>{`
        @keyframes loginCardEnter {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes orbFloat1 {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-30px); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(20px) translateX(-15px); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-25px); }
        }
        @keyframes lockPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        @keyframes tabSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes successPop {
          0% { opacity: 0; transform: scale(0.9); }
          50% { transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes errorSlide {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes animate-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: animate-shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
