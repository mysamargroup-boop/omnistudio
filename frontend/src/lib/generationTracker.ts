// Centralized Generation & Agent Job Tracker for OmniStudio
// Persists active generation jobs across page refreshes and multi-tab sessions with BroadcastChannel sync

export interface ActiveJob {
  id: string;
  type: "pipeline" | "image" | "video" | "voice" | "studio";
  path: string; // e.g. "/pipeline", "/video", "/image"
  label: string;
  status: "running" | "paused" | "complete" | "failed";
  progress?: number;
  startTime: number;
  completedAt?: number;
  data?: any;
}

export interface CompletedJobRecord {
  id: string;
  type: ActiveJob["type"];
  path: string;
  label: string;
  completedAt: number;
  data: any;
}

const STORAGE_KEY = "omnistudio_active_jobs";
const COMPLETED_STORAGE_KEY = "omnistudio_completed_jobs";
const EVENT_KEY = "omnistudio:active-jobs-updated";
const CHANNEL_NAME = "omnistudio_jobs_channel";

// Initialize BroadcastChannel safely for SSR & older environments
function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      return new BroadcastChannel(CHANNEL_NAME);
    } catch {
      return null;
    }
  }
  return null;
}

export function getActiveJobs(): ActiveJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const jobs: ActiveJob[] = JSON.parse(raw);
    // Filter out stale jobs older than 300 seconds (5 min) to prevent ghost jobs
    const now = Date.now();
    const maxAgeMs = 300 * 1000;
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

export function getActiveJobForType(type: ActiveJob["type"]): ActiveJob | null {
  const jobs = getActiveJobs();
  return jobs.find((j) => j.type === type && j.status === "running") || null;
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
    notifySubscribers([]);
  } catch {}
}

function notifySubscribers(jobs: ActiveJob[]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: jobs }));
  const bc = getBroadcastChannel();
  if (bc) {
    try {
      bc.postMessage({ type: "SYNC_JOBS", jobs });
      bc.close();
    } catch {}
  }
}

function saveJobs(jobs: ActiveJob[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    notifySubscribers(jobs);
  } catch {}
}

// ── Completed Job Persistence (for Canvas / Studio Restoration) ──
export function saveCompletedJob(job: ActiveJob, resultData: any) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
    const completed: CompletedJobRecord[] = raw ? JSON.parse(raw) : [];
    const record: CompletedJobRecord = {
      id: job.id,
      type: job.type,
      path: job.path,
      label: job.label,
      completedAt: Date.now(),
      data: resultData,
    };
    // Keep max 10 recent completed jobs
    const filtered = completed.filter((c) => c.id !== job.id);
    const updated = [record, ...filtered].slice(0, 10);
    localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(updated));

    // Also broadcast completed event
    const bc = getBroadcastChannel();
    if (bc) {
      try {
        bc.postMessage({ type: "JOB_COMPLETED", record });
        bc.close();
      } catch {}
    }
    window.dispatchEvent(new CustomEvent("omnistudio:job-completed", { detail: record }));
  } catch {}
}

export function getLastCompletedJob(type: ActiveJob["type"], maxAgeMs = 1800000): CompletedJobRecord | null {
  // Default maxAgeMs is 30 minutes
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
    if (!raw) return null;
    const completed: CompletedJobRecord[] = JSON.parse(raw);
    const now = Date.now();
    const match = completed.find((c) => c.type === type && now - c.completedAt < maxAgeMs);
    return match || null;
  } catch {
    return null;
  }
}

export function dismissCompletedJob(id: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
    if (!raw) return;
    const completed: CompletedJobRecord[] = JSON.parse(raw);
    const filtered = completed.filter((c) => c.id !== id);
    localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent("omnistudio:completed-jobs-updated"));
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
    progress: 10,
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
    const target = { ...updated[idx], ...updates };
    
    if (updates.status === "complete") {
      target.completedAt = Date.now();
      saveCompletedJob(target, updates.data || target.data);
      updated.splice(idx, 1);
    } else if (updates.status === "failed") {
      updated.splice(idx, 1);
    } else {
      updated[idx] = target;
    }
    saveJobs(updated);
  }
}

export function completeActiveJob(id: string, finalData?: any) {
  const current = getActiveJobs();
  const match = current.find((j) => j.id === id);
  if (match) {
    saveCompletedJob(match, finalData || match.data);
  }
  const filtered = current.filter((j) => j.id !== id);
  saveJobs(filtered);
}

export function isTabProcessing(path: string): boolean {
  const jobs = getActiveJobs();
  return jobs.some((j) => j.path === path && j.status === "running");
}

// ── React Hook with Multi-Tab Broadcast Synchronization ──
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

    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel(CHANNEL_NAME);
        bc.onmessage = (event) => {
          if (event.data?.type === "SYNC_JOBS") {
            setJobs(getActiveJobs());
          }
        };
      } catch {}
    }

    return () => {
      window.removeEventListener(EVENT_KEY, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
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
