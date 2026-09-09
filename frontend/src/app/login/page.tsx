"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full rounded-2xl bg-white/90 dark:bg-[#09090d]/90 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 block font-semibold">
                SUPABASE AUTHENTICATED
              </span>
              <h2 className="text-xl font-bold font-heading text-zinc-900 dark:text-white">
                Active Session
              </h2>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#030304] border border-black/[0.06] dark:border-white/[0.06] space-y-3 font-mono text-xs">
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
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-zinc-950 text-white dark:bg-white dark:text-black">
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
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 font-heading font-medium text-xs tracking-tight transition-all cursor-pointer shadow-md"
            >
              <span>DASHBOARD</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => router.push("/pipeline")}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 font-heading font-medium text-xs tracking-tight transition-all cursor-pointer border border-black/[0.06] dark:border-white/[0.06]"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>PIPELINE</span>
            </button>
          </div>

          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors font-mono cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>TERMINATE SUPABASE SESSION</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[82vh] flex items-center justify-center py-10 px-4">
      <div className="max-w-md w-full rounded-2xl bg-white/95 dark:bg-[#09090d]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header Badge & Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>SUPABASE CLOUD AUTH // RLS ENFORCED</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-zinc-950 dark:text-white tracking-tight">
            OmniStudio Cloud
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto font-jakarta">
            Sign in to sync your AI pipelines, asset vault, custom models, and project timelines.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 dark:bg-[#030304] rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={cn(
              "py-2 text-xs font-medium rounded-lg transition-all cursor-pointer font-jakarta",
              mode === "signin"
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm font-semibold"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
            )}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={cn(
              "py-2 text-xs font-medium rounded-lg transition-all cursor-pointer font-jakarta",
              mode === "signup"
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm font-semibold"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
            )}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => switchMode("magic")}
            className={cn(
              "py-2 text-xs font-medium rounded-lg transition-all cursor-pointer font-jakarta",
              mode === "magic"
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm font-semibold"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
            )}
          >
            Magic Link
          </button>
        </div>

        {/* Feedback Alert Banners */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs animate-in fade-in duration-150">
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#030304] border border-black/[0.08] dark:border-white/[0.08] text-sm text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all font-jakarta placeholder:text-zinc-400"
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
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#030304] border border-black/[0.08] dark:border-white/[0.08] text-sm text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all font-jakarta placeholder:text-zinc-400"
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
                    className="text-[11px] text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer font-jakarta"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#030304] border border-black/[0.08] dark:border-white/[0.08] text-sm text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all font-jakarta placeholder:text-zinc-400"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 font-heading font-semibold text-xs tracking-wider uppercase transition-all cursor-pointer shadow-lg active:scale-98 mt-2"
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
          <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              DATABASE SYNC
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              JWT SESSIONS
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              RLS GUARD
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
