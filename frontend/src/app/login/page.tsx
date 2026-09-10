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
  Sparkles,
  LogOut,
  Zap,
  Fingerprint,
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
    // Only accept numeric digit
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

    // Auto-advance to next box if not on last
    if (index < 3) {
      inputRefs.current[index + 1]?.focus();
    } else if (index === 3) {
      // 4th digit entered: Trigger AUTO-LOGIN immediately!
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
        // Clear boxes on fail
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

  // If already authenticated, show active session banner with direct navigation
  if (!loading && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#07070a] text-white">
        <div className="max-w-md w-full rounded-2xl bg-zinc-900/90 border border-white/[0.1] p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400 block font-semibold">
                SECURITY CLEARED • ACTIVE SESSION
              </span>
              <h2 className="text-xl font-bold font-heading text-white">
                OmniStudio Workstation
              </h2>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] space-y-2.5 font-mono text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
              <span className="text-zinc-500">AUTH TYPE:</span>
              <span className="font-semibold text-emerald-400">
                {isPinAuthenticated ? "STUDIO PASSCODE PIN" : "SUPABASE CLOUD"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
              <span className="text-zinc-500">USER ID:</span>
              <span className="text-zinc-300 truncate max-w-[200px]">
                {user ? user.email : "Studio Admin (Local Session)"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">PERSISTENCE:</span>
              <span className="text-zinc-300">BROWSER SAVED</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => router.push("/")}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-heading font-bold text-xs tracking-tight transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98]"
            >
              <span>DASHBOARD</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => router.push("/studio")}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-heading font-medium text-xs tracking-tight transition-all duration-200 cursor-pointer border border-white/[0.08]"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>STUDIO</span>
            </button>
          </div>

          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors font-mono cursor-pointer border border-rose-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>TERMINATE SAVED SESSION</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#07070a] text-white relative overflow-hidden">
      {/* Dynamic Ambient Background Aura */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-violet-600/10 via-amber-500/5 to-cyan-500/10 blur-[130px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-zinc-950/80 border border-white/[0.1] p-6 sm:p-8 shadow-2xl backdrop-blur-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-300">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>PROTECTED WORKSTATION ACCESS</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-white tracking-tight">
            OmniStudio AI
          </h1>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto font-jakarta">
            Enter your secure 4-digit Passcode PIN or connect with Supabase Cloud.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs font-mono">
          <button
            type="button"
            onClick={() => {
              setActiveTab("pin");
              setPinError(null);
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer",
              activeTab === "pin"
                ? "bg-white text-zinc-950 font-bold shadow-sm"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>PIN PASSCODE</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("supabase");
              setErrorMessage(null);
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer",
              activeTab === "supabase"
                ? "bg-white text-zinc-950 font-bold shadow-sm"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SUPABASE CLOUD</span>
          </button>
        </div>

        {/* TAB 1: PIN CODE (Primary Fast Unlock) */}
        {activeTab === "pin" && (
          <div className="space-y-6 pt-2">
            <div className="text-center space-y-1">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                ENTER 4-DIGIT SECURITY PIN
              </span>
              <p className="text-[10px] text-zinc-600 font-mono">
                Auto-logs in on typing the 4th digit • Browser saved session
              </p>
            </div>

            {/* 4 OTP Digit Boxes */}
            <div
              className={cn(
                "flex justify-center items-center gap-3 sm:gap-4 transition-transform",
                shake && "animate-shake"
              )}
              onPaste={handlePaste}
            >
              {[0, 1, 2, 3].map((idx) => (
                <input
                  key={idx}
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
                    "w-14 h-16 sm:w-16 sm:h-18 rounded-xl bg-white/[0.04] border text-center text-2xl font-mono font-bold text-white transition-all outline-none",
                    pin[idx]
                      ? "border-amber-400/80 bg-white/[0.08] shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                      : "border-white/[0.1] hover:border-white/[0.2] focus:border-amber-400 focus:bg-white/[0.06]"
                  )}
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {/* Verification & Error Feedback */}
            {isPinVerifying && (
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-amber-400 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating Passcode...</span>
              </div>
            )}

            {pinSuccess && (
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-emerald-400 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>Passcode Approved! Launching Studio...</span>
              </div>
            )}

            {pinError && (
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 py-2 px-3 rounded-xl animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <div className="pt-2 text-center">
              <span className="text-[10px] font-mono text-zinc-500">
                Studio Passcode is secured via environment configuration
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: Supabase Cloud Login */}
        {activeTab === "supabase" && (
          <form onSubmit={handleSupabaseSubmit} className="space-y-4 pt-1">
            <div className="flex justify-between items-center pb-1">
              <span className="text-xs font-mono font-semibold text-zinc-300">
                {mode === "signin" ? "Sign In to OmniCloud" : "Create New Creator Account"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-[11px] font-mono text-amber-400 hover:underline cursor-pointer"
              >
                {mode === "signin" ? "Need an account? Register" : "Already registered? Log in"}
              </button>
            </div>

            {mode === "signup" && (
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-400">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Samar Creator"
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@omnistudio.ai"
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-heading font-bold text-xs tracking-tight transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
              ) : (
                <>
                  <span>{mode === "signin" ? "AUTHENTICATE VIA SUPABASE" : "REGISTER ACCOUNT"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Google OAuth (Marked for future setup as requested) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage("Google Cloud OAuth configuration pending. Use Email & Password or Studio PIN Passcode.");
                }}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.08] transition-all text-xs font-mono cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                <span>Google OAuth (Coming Soon)</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
