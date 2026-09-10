"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Auth callback session error:", error);
          router.replace("/login?error=" + encodeURIComponent(error.message));
          return;
        }

        if (data.session) {
          router.replace("/studio");
        } else {
          // Listen once for auth state change in case hash is processing
          const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
              if (session) {
                authListener.subscription.unsubscribe();
                router.replace("/studio");
              }
            }
          );

          // Fallback timeout after 3s
          setTimeout(() => {
            router.replace("/studio");
          }, 3000);
        }
      } catch (err) {
        console.error("Callback error:", err);
        router.replace("/login");
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-sm w-full p-8 rounded-2xl bg-white dark:bg-[#0d0d14] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold font-heading text-zinc-900 dark:text-white">
            Authenticating Session
          </h2>
          <p className="text-xs text-zinc-500 font-jakarta">
            Finalizing Google authentication with Supabase Cloud...
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/[0.04] text-[10px] font-mono text-zinc-500">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>RLS Session Establishing</span>
        </div>
      </div>
    </div>
  );
}
