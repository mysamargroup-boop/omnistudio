"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { getApiBase } from "@/lib/api";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isPinAuthenticated: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  loginWithPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: AuthError | null; user: User | null; session: Session | null }>;
  signInWithOtp: (email: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isPinAuthenticated: false,
  isAuthenticated: false,
  loading: true,
  loginWithPin: async () => ({ success: false }),
  signInWithPassword: async () => ({ error: null }),
  signUp: async () => ({ error: null, user: null, session: null }),
  signInWithOtp: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isPinAuthenticated, setIsPinAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const STORAGE_PREFIX = "omnistudio_";
  const PIN_SESSION_KEY = `${STORAGE_PREFIX}pin_session`;
  const BACKEND_JWT_KEY = `${STORAGE_PREFIX}backend_jwt`;

  const getSessionStore = useCallback(() => {
    if (typeof window === "undefined") return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    return window.sessionStorage;
  }, []);

  const saveBackendToken = useCallback((token: string | null) => {
    if (typeof window === "undefined") return;
    const store = getSessionStore();
    if (token) store.setItem(BACKEND_JWT_KEY, token);
    else store.removeItem(BACKEND_JWT_KEY);
    try { localStorage.removeItem(BACKEND_JWT_KEY); } catch { /* ignore migration cleanup errors */ }
  }, [getSessionStore, BACKEND_JWT_KEY]);

  const getBackendToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    const store = getSessionStore();
    const token = store.getItem(BACKEND_JWT_KEY);
    if (token && typeof token === "string" && token.length > 40) return token;
    try {
      const legacy = localStorage.getItem(BACKEND_JWT_KEY);
      if (legacy && typeof legacy === "string" && legacy.length > 40) {
        store.setItem(BACKEND_JWT_KEY, legacy);
        localStorage.removeItem(BACKEND_JWT_KEY);
        return legacy;
      }
    } catch { /* ignore */ }
    return null;
  }, [getSessionStore, BACKEND_JWT_KEY]);

  const fetchProfile = useCallback(async (userId: string, userEmail?: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (data) {
        setProfile(data);
      } else if (!error && userEmail) {
        // Fallback profile if trigger was delayed or initial setup
        const fallbackProfile: Profile = {
          id: userId,
          email: userEmail,
          full_name: userEmail.split("@")[0],
          avatar_url: null,
          role: "creator",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
      }
    } catch (err) {
      console.warn("Could not fetch profile:", err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id, user.email);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    // 0. A PIN session is valid only while its server-issued token is present.
    try {
      if (typeof window !== "undefined") {
        const store = getSessionStore();
        const savedPinSession = store.getItem(PIN_SESSION_KEY);
        const backendToken = getBackendToken();
        if (savedPinSession && backendToken) {
          const parsed = JSON.parse(savedPinSession);
          const tokenAge = Date.now() - (parsed?.timestamp || 0);
          const maxAgeHours = 12;
          if (parsed?.authenticated && tokenAge < maxAgeHours * 60 * 60 * 1000) {
            setIsPinAuthenticated(true);
            setProfile((prev) => prev || {
              id: "pin-samar-master",
              email: "mysamargroup@gmail.com",
              full_name: "Samar",
              avatar_url: null,
              role: "admin",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
        try { localStorage.removeItem("omnistudio_pin_session"); } catch { /* migration */ }
      }
    } catch (e) {
      console.warn("Failed to read local pin session", e);
    }

    // 1. Initial active Supabase session check
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.access_token) saveBackendToken(currentSession.access_token);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id, currentSession.user.email);
      }
      setLoading(false);
    });

    // 2. Auth state subscription listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.access_token) saveBackendToken(newSession.access_token);
      if (newSession?.user) {
        await fetchProfile(newSession.user.id, newSession.user.email);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, saveBackendToken]);

  const signInWithPassword = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        await fetchProfile(data.user.id, data.user.email);
      }
    }
    setLoading(false);
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split("@")[0],
        },
      },
    });
    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        await fetchProfile(data.user.id, data.user.email);
      }
    }
    setLoading(false);
    return { error, user: data.user, session: data.session };
  };

  const signInWithOtp = async (email: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    setLoading(false);
    return { error };
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    const redirectUrl = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });
    if (error) {
      setLoading(false);
    }
    return { error };
  };

  const loginWithPin = async (pin: string) => {
    try {
      const response = await fetch(`${getApiBase()}/api/auth/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      if (!response.ok) return { success: false, error: "Invalid Studio Passcode. Access denied." };
      const result = await response.json();
      if (!result.access_token || typeof result.access_token !== "string" || result.access_token.length < 40) {
        return { success: false, error: "Authentication token was not issued." };
      }
      saveBackendToken(result.access_token);
      const store = getSessionStore();
      store.setItem(PIN_SESSION_KEY, JSON.stringify({ authenticated: true, timestamp: Date.now() }));
      try { localStorage.removeItem("omnistudio_pin_session"); } catch { /* migration */ }
      setIsPinAuthenticated(true);
      setProfile({
        id: "pin-samar-master",
        email: "mysamargroup@gmail.com",
        full_name: "Samar",
        avatar_url: null,
        role: "admin",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return { success: true };
    } catch {
      return { success: false, error: "Could not reach the authentication server." };
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        const store = getSessionStore();
        store.removeItem(PIN_SESSION_KEY);
        store.removeItem(BACKEND_JWT_KEY);
        localStorage.removeItem("omnistudio_pin_session");
        localStorage.removeItem("omnistudio_backend_jwt");
      }
    } catch (e) {
      console.warn("Failed to remove pin session", e);
    }
    setIsPinAuthenticated(false);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  const isAuthenticated = Boolean(user || isPinAuthenticated);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isPinAuthenticated,
        isAuthenticated,
        loading,
        loginWithPin,
        signInWithPassword,
        signUp,
        signInWithOtp,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
