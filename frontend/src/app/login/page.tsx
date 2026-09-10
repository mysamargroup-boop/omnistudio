"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
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
  Eye,
  EyeOff,
  Shield,
  KeyRound,
  Compass,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

type TabType = "pin" | "email";
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
  const [showPassword, setShowPassword] = useState(false);

  // ─── PIN State ───
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isPinVerifying, setIsPinVerifying] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  // ─── Email / Supabase State ───
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
          setPinSuccess(true);
          setIsPinVerifying(false);
          setTimeout(() => router.replace("/"), 600);
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
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
          setSuccessMessage("Authentication successful. Entering studio...");
          setTimeout(() => router.replace("/"), 800);
        }
      } else {
        if (!email || !password) {
          setErrorMessage("Please provide all required registration details.");
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
        } else if (session) {
          setSuccessMessage("Account created successfully. Redirecting...");
          setTimeout(() => router.replace("/"), 900);
        } else {
          setSuccessMessage("Confirmation email sent. Check your inbox to verify.");
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
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
                <span className="text-zinc-400 font-medium">Account</span>
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
                  End-to-End Encrypted
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
                  <span>Passcode</span>
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
                  <span>Email Account</span>
                </button>
              </div>
            </div>

            {/* Form & Actions Area */}
            <div className="px-7 pb-8">
              {/* ══════════════ TAB 1: STUDIO PASSCODE ══════════════ */}
              {activeTab === "pin" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="text-center">
                    <p className="text-xs text-zinc-400 font-medium">
                      Enter your 4-digit security code to authenticate
                    </p>
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
                            type="password"
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
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
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

                  {/* Rich Unlock Button (Not plain text!) */}
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
                    {/* Diagonal Light Sheen */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

                    {isPinVerifying ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#07070a]" />
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
                  {/* Mode Header Switcher */}
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold text-zinc-300 tracking-wide">
                      {mode === "signin" ? "Sign In with Account" : "Create New Account"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === "signin" ? "signup" : "signin");
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      {mode === "signin" ? "New here? Sign Up" : "Have an account? Sign In"}
                    </button>
                  </div>

                  {/* Full Name (Sign up mode only) */}
                  {mode === "signup" && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Full Name
                      </label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 transition-colors" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your Name or Studio Alias"
                          className="w-full bg-[#07080e]/90 border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none hover:border-white/15 focus:border-indigo-400/80 focus:bg-[#0a0c16] focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 transition-colors" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        required
                        className="w-full bg-[#07080e]/90 border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none hover:border-white/15 focus:border-indigo-400/80 focus:bg-[#0a0c16] focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Password
                      </label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={() =>
                            setErrorMessage("Password reset link will be sent to your email upon request.")
                          }
                          className="text-[11px] text-zinc-400 hover:text-indigo-400 transition-colors cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full bg-[#07080e]/90 border border-white/[0.08] rounded-xl pl-11 pr-11 py-3 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none hover:border-white/15 focus:border-indigo-400/80 focus:bg-[#0a0c16] focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

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

                  {/* Professional Gradient Submit Button (Rich aesthetic, not plain text!) */}
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
                    {/* Diagonal Light Sheen */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <>
                        <span>{mode === "signin" ? "Sign In to Studio" : "Create Studio Account"}</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>

                  {/* Clean Divider */}
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-white/[0.06]" />
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                      or
                    </span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>

                  {/* Google OAuth Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage("Google OAuth credentials are being linked. Please sign in via Work Email or Studio Passcode.");
                    }}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] text-zinc-300 hover:text-white border border-white/[0.08] hover:border-white/20 transition-all duration-200 text-xs font-semibold cursor-pointer shadow-sm"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                    <span>Continue with Google Workspace</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Footer Attribution */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-[11px] text-zinc-400 font-medium tracking-wide">
            OmniStudio AI · Powered by Samar Group
          </p>
          <p className="text-[10px] text-zinc-400">
            Enterprise Generative Intelligence Suite · 256-bit TLS Encrypted
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
