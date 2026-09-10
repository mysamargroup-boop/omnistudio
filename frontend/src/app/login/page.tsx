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
  const { user, profile, loading, signInWithPassword, signUp, signInWithOtp, signInWithGoogle, signOut } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setErrorMessage(null);
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMessage(error.message);
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to initiate Google sign-in.");
      setIsGoogleLoading(false);
    }
  };

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
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 font-heading font-bold text-xs tracking-tight transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98]"
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-zinc-500/5 dark:bg-zinc-800/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header Badge & Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-700 dark:text-zinc-300">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>Supabase Cloud Auth • RLS Enforced</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-zinc-950 dark:text-white tracking-tight pb-1">
            OmniStudio Cloud
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto font-jakarta">
            Sign in to sync your AI pipelines, asset vault, custom models, and project timelines.
          </p>
        </div>

        {/* Google OAuth Button */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isSubmitting}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white dark:bg-white/[0.06] hover:bg-zinc-50 dark:hover:bg-white/[0.1] text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/[0.1] transition-all font-jakarta font-semibold text-xs tracking-tight shadow-sm hover:shadow active:scale-[0.99] cursor-pointer disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
            ) : (
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
            )}
            <span>{isGoogleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center pt-1 pb-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-black/[0.08] dark:border-white/[0.08]" />
            </div>
            <div className="relative px-3 bg-white dark:bg-[#0d0d14] text-[10px] font-mono tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">
              or continue with email
            </div>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-50 dark:bg-white/[0.04] rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={cn(
              "py-2 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer font-jakarta",
              mode === "signin"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm font-semibold"
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
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm font-semibold"
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
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm font-semibold"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:border-zinc-500 transition-all font-jakarta placeholder:text-zinc-400"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 disabled:opacity-50 font-heading font-bold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98] mt-2 whitespace-nowrap shrink-0"
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
