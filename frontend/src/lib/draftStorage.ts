// Safe localStorage Draft and State Persistence for OmniStudio Studios

const DRAFT_PREFIX = "omnistudio_draft_";

export function loadStudioDraft<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`${DRAFT_PREFIX}${key}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(fallback) && typeof fallback === "object") {
      return { ...fallback, ...parsed };
    }
    return (parsed as T) ?? fallback;
  } catch (err) {
    console.warn(`[DraftStorage] Failed to read draft for ${key}:`, err);
    return fallback;
  }
}

const timers: Record<string, ReturnType<typeof setTimeout>> = {};

export function saveStudioDraft<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${DRAFT_PREFIX}${key}`, JSON.stringify(data));
  } catch (err) {
    console.warn(`[DraftStorage] Failed to save draft for ${key}:`, err);
  }
}

export function saveStudioDraftDebounced<T>(key: string, data: T, delayMs: number = 300): void {
  if (typeof window === "undefined") return;
  if (timers[key]) {
    clearTimeout(timers[key]);
  }
  timers[key] = setTimeout(() => {
    saveStudioDraft(key, data);
    delete timers[key];
  }, delayMs);
}

export function clearStudioDraft(key: string): void {
  if (typeof window === "undefined") return;
  if (timers[key]) {
    clearTimeout(timers[key]);
    delete timers[key];
  }
  try {
    window.localStorage.removeItem(`${DRAFT_PREFIX}${key}`);
  } catch (err) {
    console.warn(`[DraftStorage] Failed to clear draft for ${key}:`, err);
  }
}

