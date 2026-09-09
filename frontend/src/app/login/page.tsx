"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  LogOut,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup" | "magic";

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, loading, signInWithPassword, signUp, signInWithOtp, signOut } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clear messages when mode changes
  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
          setSuccessMessage("Authentication successful! Redirecting to studio...");
          setTimeout(() => {
            router.push("/");
          }, 1000);
        }
      } else if (mode === "signup") {
        if (!email || !password) {
          setErrorMessage("Please fill in all required fields.");
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setErrorMessage("Password must be at least 6 characters long.");
          setIsSubmitting(false);
          return;
        }
        const { error, session } = await signUp(email, password, fullName);
        if (error) {
          setErrorMessage(error.message);
        } else {
          if (session) {
            setSuccessMessage("Account created successfully! Redirecting...");
            setTimeout(() => {
              router.push("/");
            }, 1200);
          } else {
            setSuccessMessage(
              "Account registered! Please check your email inbox for the verification link."
            );
          }
        }
      } else if (mode === "magic") {
        if (!email) {
          setErrorMessage("Please enter your email address for the magic link.");
          setIsSubmitting(false);
          return;
        }
        const { error } = await signInWithOtp(email);
        if (error) {
          setErrorMessage(error.message);
        } else {
          setSuccessMessage("Magic link sent! Check your inbox to sign in instantly.");
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If already logged in, show authenticated state
  if (!loading && user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 relative">
        <div className="max-w-md w-full rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400 block font-semibold">
                SUPABASE AUTHENTICATED
              </span>
              <h2 className="text-xl font-bold font-heading text-zinc-900 dark:text-white">
                Active Session
              </h2>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-black/[0.04] dark:border-white/[0.04]">
              <span className="text-zinc-500">USER:</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[200px]">
                {profile?.full_name || user.email?.split("@")[0]}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-black/[0.04] dark:border-white/[0.04]">
              <span className="text-zinc-500">EMAIL:</span>
              <span className="text-zinc-800 dark:text-zinc-200 font-sans truncate max-w-[200px]">
                {user.email}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-black/[0.04] dark:border-white/[0.04]">
              <span className="text-zinc-500">ROLE:</span>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                {profile?.role || "CREATOR"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">SUPABASE UID:</span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-[180px]">
                {user.id}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => router.push("/")}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-heading font-medium text-xs tracking-tight transition-all duration-200 cursor-pointer shadow-sm shadow-violet-500/25 active:scale-[0.98]"
            >
              <span>DASHBOARD</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => router.push("/pipeline")}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-zinc-900 dark:text-white font-heading font-medium text-xs tracking-tight transition-all duration-200 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>PIPELINE</span>
            </button>
          </div>

          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs text-rose-600 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors font-mono cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>TERMINATE SUPABASE SESSION</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[82vh] flex items-center justify-center py-10 px-4 relative">
      {/* Background Gradient Effect */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/10 dark:bg-violet-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header Badge & Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-[10px] font-mono uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
            <ShieldCheck className="w-3 h-3 text-violet-500" />
            <span>Supabase Cloud Auth • RLS Enforced</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 tracking-tight pb-1">
            OmniStudio Cloud
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto font-jakarta">
            Sign in to sync your AI pipelines, asset vault, custom models, and project timelines.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-50 dark:bg-white/[0.04] rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={cn(
              "py-2 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer font-jakarta",
              mode === "signin"
                ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 shadow-sm font-semibold"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
            )}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={cn(
              "py-2 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer font-jakarta",
              mode === "signup"
                ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 shadow-sm font-semibold"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
            )}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => switchMode("magic")}
            className={cn(
              "py-2 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer font-jakarta",
              mode === "magic"
                ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 shadow-sm font-semibold"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
            )}
          >
            Magic Link
          </button>
        </div>

        {/* Feedback Alert Banners */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 font-jakarta flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Christopher Nolan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all font-jakarta placeholder:text-zinc-400"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 font-jakarta flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-zinc-400" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              required
              placeholder="director@studio.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all font-jakarta placeholder:text-zinc-400"
            />
          </div>

          {mode !== "magic" && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 font-jakarta flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Password</span>
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => switchMode("magic")}
                    className="text-[11px] text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors cursor-pointer font-jakarta"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all font-jakarta placeholder:text-zinc-400"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white disabled:opacity-50 font-heading font-semibold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-sm shadow-violet-500/25 active:scale-[0.98] mt-2 whitespace-nowrap shrink-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>CONNECTING TO SUPABASE...</span>
              </>
            ) : mode === "signin" ? (
              <>
                <KeyRound className="w-3.5 h-3.5" />
                <span>SIGN IN TO OMNISTUDIO</span>
              </>
            ) : mode === "signup" ? (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>CREATE CREATOR ACCOUNT</span>
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5" />
                <span>SEND MAGIC LINK</span>
              </>
            )}
          </button>
        </form>

        {/* Cloud Footnote & Security Badges */}
        <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.06] text-center space-y-2">
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
            CONNECTED PROJECT REF: <span className="text-zinc-700 dark:text-zinc-300">lsttnpynhwtpkzfbfntf</span>
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] font-mono uppercase bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] px-2 py-0.5 rounded-lg text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              DB SYNC
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono uppercase bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] px-2 py-0.5 rounded-lg text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              JWT SESSIONS
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono uppercase bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] px-2 py-0.5 rounded-lg text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              RLS GUARD
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
