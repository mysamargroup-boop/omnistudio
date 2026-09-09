function getApiBase(): string {
  if (typeof window !== "undefined") {
    // In browser: if remote IP or domain, always use relative path "" so Next.js proxies to backend
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      return envUrl;
    }
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}

const API_BASE = getApiBase();

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE}${cleanPath}`;
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const errJson = await res.json();
      if (errJson && errJson.detail) {
        msg = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      } else if (errJson && errJson.error) {
        msg = errJson.error;
      }
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

async function fetchApiFormData<T>(path: string, formData: FormData): Promise<T> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE}${cleanPath}`;
  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const errJson = await res.json();
      if (errJson && errJson.detail) {
        msg = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      } else if (errJson && errJson.error) {
        msg = errJson.error;
      }
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

export function getMediaUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = API_BASE ? API_BASE.replace(/\/$/, "") : "";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export const api = {
  health: () => fetchApi<any>("/api/health"),

  // Image
  generateImage: (data: any) => fetchApi<any>("/api/image/generate", { method: "POST", body: JSON.stringify(data) }),
  enhancePrompt: (data: any) => fetchApi<any>("/api/image/enhance-prompt", { method: "POST", body: JSON.stringify(data) }),
  getImageModels: () => fetchApi<any>("/api/image/models"),
  uploadReferenceImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchApiFormData<any>("/api/image/upload-reference", formData);
  },
  generateVariations: (data: any) => fetchApi<any>("/api/image/variations", { method: "POST", body: JSON.stringify(data) }),

  // Video
  generateVideo: (data: any) => fetchApi<any>("/api/video/generate", { method: "POST", body: JSON.stringify(data) }),
  directVideoPrompt: (data: any) => fetchApi<any>("/api/video/director-agent", { method: "POST", body: JSON.stringify(data) }),
  getMotions: () => fetchApi<any>("/api/video/motions"),
  uploadSourceVideo: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchApiFormData<any>("/api/video/upload-source-video", formData);
  },

  // Voice — Text to Speech
  generateVoice: (data: any) => fetchApi<any>("/api/voice/generate", { method: "POST", body: JSON.stringify(data) }),
  getVoices: () => fetchApi<any>("/api/voice/voices"),

  // Voice — Voice Change
  changeVoice: (file: File, targetVoiceId: string, provider: string = "elevenlabs", isVideo: boolean = false) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_voice_id", targetVoiceId);
    formData.append("provider", provider);
    formData.append("is_video", String(isVideo));
    return fetchApiFormData<any>("/api/voice/change", formData);
  },

  // Voice — Translate & Dub
  translateText: (data: any) => fetchApi<any>("/api/voice/translate-text", { method: "POST", body: JSON.stringify(data) }),
  translateAndDub: (data: any) => fetchApi<any>("/api/voice/translate", { method: "POST", body: JSON.stringify(data) }),
  getLanguages: () => fetchApi<any>("/api/voice/languages"),

  // Pipeline
  runPipeline: (data: any) => fetchApi<any>("/api/pipeline/run", { method: "POST", body: JSON.stringify(data) }),
  runPipelineStream: async (
    data: any,
    onEvent: (event: any) => void
  ): Promise<any> => {
    const res = await fetch(`${API_BASE}/api/pipeline/run-stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const errJson = await res.json();
        msg = errJson.detail || errJson.error || msg;
      } catch (_) {}
      throw new Error(msg);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error("Stream reader not supported");
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() || "";
      for (const chunk of chunks) {
        const trimmed = chunk.trim();
        if (trimmed.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            onEvent(parsed);
            if (parsed.stage === "complete" && parsed.result) {
              finalResult = parsed.result;
            }
          } catch (e) {
            console.error("SSE parse error", e);
          }
        }
      }
    }
    return finalResult;
  },

  // Assets
  getAllAssets: () => fetchApi<any>("/api/assets/all"),
  getVaultImages: () => fetchApi<any>("/api/assets/images"),
  getVaultVideos: () => fetchApi<any>("/api/assets/videos"),
  getTrashAssets: () => fetchApi<any>("/api/assets/trash"),
  deleteAsset: (type: string, filename: string, permanent: boolean = false, fromTrash: boolean = false) =>
    fetchApi<any>(`/api/assets/${type}/${encodeURIComponent(filename)}?permanent=${permanent}&from_trash=${fromTrash}`, { method: "DELETE" }),
  moveToTrash: (items: { media_type: string; filename: string }[]) =>
    fetchApi<any>("/api/assets/trash", { method: "POST", body: JSON.stringify({ items }) }),
  restoreFromTrash: (items: { media_type: string; filename: string }[]) =>
    fetchApi<any>("/api/assets/restore", { method: "POST", body: JSON.stringify({ items }) }),
  bulkDeleteAssets: (items: { media_type: string; filename: string }[], permanent: boolean = false, fromTrash: boolean = false) =>
    fetchApi<any>("/api/assets/bulk-delete", { method: "POST", body: JSON.stringify({ items, permanent, from_trash: fromTrash }) }),
  emptyTrash: () => fetchApi<any>("/api/assets/trash/empty", { method: "DELETE" }),

  // Settings
  getStatus: () => fetchApi<any>("/api/settings/status"),
  getKeys: () => fetchApi<any>("/api/settings/keys"),
  updateKeys: (data: any) => fetchApi<any>("/api/settings/keys", { method: "POST", body: JSON.stringify(data) }),
  testDatabase: (url?: string) => fetchApi<any>("/api/settings/test-db", { method: "POST", body: JSON.stringify({ database_url: url }) }),
  testStorage: () => fetchApi<any>("/api/settings/test-r2", { method: "POST" }),

  // Analytics & Usage
  getUsageSummary: () => fetchApi<any>("/api/analytics/summary"),
  getUsageHistory: (service?: string, limit: number = 50) => {
    const q = service && service !== "all" ? `?service=${service}&limit=${limit}` : `?limit=${limit}`;
    return fetchApi<any>(`/api/analytics/history${q}`);
  },
  getRateCards: () => fetchApi<any>("/api/analytics/rates"),
  clearUsageHistory: () => fetchApi<any>("/api/analytics/clear", { method: "POST" }),
};
