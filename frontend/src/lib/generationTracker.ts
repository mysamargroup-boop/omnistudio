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
    // Filter out stale jobs older than 6 hours
    const now = Date.now();
    const valid = jobs.filter((j) => now - j.startTime < 6 * 60 * 60 * 1000 && j.status === "running");
    return valid;
  } catch {
    return [];
  }
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
