// Centralized Generation & Agent Job Tracker for OmniStudio
// Persists active generation jobs across page refreshes and multi-tab sessions

export interface ActiveJob {
  id: string;
  type: "pipeline" | "image" | "video" | "voice" | "studio";
  path: string; // e.g. "/pipeline", "/video", "/image"
  label: string;
  status: "running" | "paused" | "complete" | "failed";
  progress?: number;
  startTime: number;
  data?: any;
}

const STORAGE_KEY = "omnistudio_active_jobs";
const EVENT_KEY = "omnistudio:active-jobs-updated";

export function getActiveJobs(): ActiveJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const jobs: ActiveJob[] = JSON.parse(raw);
    // Filter out stale jobs older than 90 seconds (prevents ghost jobs hanging sidebar)
    const now = Date.now();
    const maxAgeMs = 90 * 1000;
    const valid = jobs.filter((j) => now - j.startTime < maxAgeMs && j.status === "running");
    if (valid.length !== jobs.length) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
      } catch {}
    }
    return valid;
  } catch {
    return [];
  }
}

export function clearTabProcessing(path: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getActiveJobs();
    const updated = current.filter((j) => j.path !== path);
    saveJobs(updated);
  } catch {}
}

export function clearAllActiveJobs() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: [] }));
  } catch {}
}

function saveJobs(jobs: ActiveJob[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: jobs }));
  } catch {}
}

export function startActiveJob(
  id: string,
  type: ActiveJob["type"],
  path: string,
  label: string,
  data?: any
): ActiveJob {
  const current = getActiveJobs();
  const existingIndex = current.findIndex((j) => j.id === id || j.type === type);
  const newJob: ActiveJob = {
    id,
    type,
    path,
    label,
    status: "running",
    startTime: Date.now(),
    data,
  };

  let updated: ActiveJob[];
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = newJob;
  } else {
    updated = [newJob, ...current];
  }
  saveJobs(updated);
  return newJob;
}

export function updateActiveJob(id: string, updates: Partial<ActiveJob>) {
  const current = getActiveJobs();
  const idx = current.findIndex((j) => j.id === id);
  if (idx >= 0) {
    const updated = [...current];
    updated[idx] = { ...updated[idx], ...updates };
    if (updates.status === "complete" || updates.status === "failed") {
      // Remove from active list
      updated.splice(idx, 1);
    }
    saveJobs(updated);
  }
}

export function completeActiveJob(id: string) {
  const current = getActiveJobs();
  const filtered = current.filter((j) => j.id !== id);
  saveJobs(filtered);
}

export function isTabProcessing(path: string): boolean {
  const jobs = getActiveJobs();
  return jobs.some((j) => j.path === path && j.status === "running");
}

// React Hook
import { useState, useEffect, useCallback } from "react";

export function useActiveJobs() {
  const [jobs, setJobs] = useState<ActiveJob[]>([]);

  useEffect(() => {
    setJobs(getActiveJobs());

    const handleUpdate = () => {
      setJobs(getActiveJobs());
    };

    window.addEventListener(EVENT_KEY, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(EVENT_KEY, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const isProcessing = useCallback(
    (path: string) => {
      return jobs.some((j) => j.path === path && j.status === "running");
    },
    [jobs]
  );

  return { activeJobs: jobs, isProcessing };
}
