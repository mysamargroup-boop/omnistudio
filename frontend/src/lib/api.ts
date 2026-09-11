export function getApiBase(): string {
  // 1. Explicit env configuration takes highest priority
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl.trim().replace(/\/$/, "");
  }

  // 2. In browser environment:
  if (typeof window !== "undefined") {
    const { hostname, protocol, port } = window.location;
    // When running locally on developer machine, communicate directly with FastAPI backend on port 8000
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }
    // When running on VPS port 3050, backend is exposed on port 8050
    if (port === "3050") {
      return `${protocol}//${hostname}:8050`;
    }
    // In production on VPS / domain behind Nginx or Traefik reverse proxy (port 80 or 443), use relative path ""
    return "";
  }

  // 3. Node / SSR environment fallback
  return process.env.BACKEND_INTERNAL_URL || "http://omni-backend:8000";
}

function getBackendToken(): string | null {
  if (typeof window === "undefined") return null;
  const sessionToken = sessionStorage.getItem("omnistudio_backend_jwt")?.trim();
  if (sessionToken && sessionToken.length > 40) return sessionToken;
  const legacyToken = localStorage.getItem("omnistudio_backend_jwt")?.trim();
  if (legacyToken && legacyToken.length > 40) {
    try { sessionStorage.setItem("omnistudio_backend_jwt", legacyToken); localStorage.removeItem("omnistudio_backend_jwt"); } catch { /* ignore */ }
    return legacyToken;
  }
  return null;
}

function getAuthHeaders(): Record<string, string> {
  const token = getBackendToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getApiBase();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${cleanPath}`;
  const authHeaders = getAuthHeaders();
  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...authHeaders,
    ...((options?.headers as Record<string, string>) || {}),
  };
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, {
    ...options,
    headers,
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
  const base = getApiBase();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${cleanPath}`;
  const authHeaders = getAuthHeaders();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...authHeaders,
    },
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

export function uploadWithProgress<T = any>(
  endpoint: string,
  file: File,
  fieldName: string = "file",
  onProgress?: (percent: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const base = getApiBase();
    const cleanPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${base}${cleanPath}`;
    const xhr = new XMLHttpRequest();

    xhr.open("POST", url);

    const token = getBackendToken();
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve(res);
        } catch {
          resolve(xhr.responseText as any);
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail || err.error || `HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network upload error"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));

    const formData = new FormData();
    formData.append(fieldName, file);
    xhr.send(formData);
  });
}

export function getMediaUrl(path: string): string {
  if (!path) return "";

  // If path is a Cloudflare R2 URL, route through backend proxy so it never fails with 401
  if (path.includes("r2.dev") || path.includes("cloudflarestorage.com")) {
    const filename = path.split("/").pop();
    const typeFolder = path.includes("/videos/") ? "videos" : path.includes("/audio/") ? "audio" : "images";
    const base = getApiBase();
    return `${base}/outputs/${typeFolder}/${filename}`;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getApiBase();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const token = getBackendToken() || "";
  // Native image/video/audio tags cannot attach Authorization headers. The
  // backend accepts this query token only for authenticated output requests.
  return token && cleanPath.startsWith("/outputs/")
    ? `${base}${cleanPath}?access_token=${encodeURIComponent(token)}`
    : `${base}${cleanPath}`;
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
  aiRemoveBackground: (image_path: string) =>
    fetchApi<any>("/api/image/remove-background", {
      method: "POST",
      body: JSON.stringify({ image_path }),
    }),
  aiRelight: (image_path: string, preset: string = "golden_hour", intensity: number = 1.0) =>
    fetchApi<any>("/api/image/relight", {
      method: "POST",
      body: JSON.stringify({ image_path, preset, intensity }),
    }),
  aiFaceRestore: (image_path: string) =>
    fetchApi<any>("/api/image/face-restore", {
      method: "POST",
      body: JSON.stringify({ image_path }),
    }),
  aiOutpaint: (image_path: string, target_aspect: string = "16:9") =>
    fetchApi<any>("/api/image/outpaint", {
      method: "POST",
      body: JSON.stringify({ image_path, target_aspect }),
    }),

  // Brand Kit
  getBrandKit: () => fetchApi<any>("/api/brand-kit"),
  updateBrandKit: (data: any) =>
    fetchApi<any>("/api/brand-kit", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  uploadBrandLogo: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchApiFormData<any>("/api/brand-kit/upload-logo", formData);
  },

  // Video
  generateVideo: (data: any) => fetchApi<any>("/api/video/generate", { method: "POST", body: JSON.stringify(data) }),
  getVideoModels: () => fetchApi<any>("/api/video/models"),
  directVideoPrompt: (data: any) =>
    fetchApi<any>("/api/video/director-agent", {
      method: "POST",
      body: JSON.stringify({ idea: data.idea || data.prompt || "", prompt: data.prompt || data.idea || "", ...data }),
    }),
  getMotions: () => fetchApi<any>("/api/video/motions"),
  uploadSourceVideo: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchApiFormData<any>("/api/video/upload-source-video", formData);
  },
  uploadVideoKeyframe: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchApiFormData<any>("/api/video/upload-keyframe", formData);
  },

  // Voice — Text to Speech
  generateVoice: (data: any) => fetchApi<any>("/api/voice/generate", { method: "POST", body: JSON.stringify(data) }),
  getVoices: () => fetchApi<any>("/api/voice/voices"),
  getVoiceModels: () => fetchApi<any>("/api/voice/models"),

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
  draftPipelinePrompts: (data: { topic: string; style?: string }) =>
    fetchApi<any>("/api/pipeline/draft-prompts", { method: "POST", body: JSON.stringify(data) }),
  runPipeline: (data: any) => fetchApi<any>("/api/pipeline/run", { method: "POST", body: JSON.stringify(data) }),
  runPipelineStream: async (
    data: any,
    onEvent: (event: any) => void,
    signal?: AbortSignal
  ): Promise<any> => {
    const base = getApiBase();
    const res = await fetch(`${base}/api/pipeline/run-stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(data),
      signal,
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
  testTrashSystem: () => fetchApi<any>("/api/assets/trash/test", { method: "POST" }),

  // Favorites & Collections
  getFavorites: () => fetchApi<{ success: boolean; favorites: string[] }>("/api/assets/favorites"),
  toggleFavorite: (filename: string, is_favorite?: boolean) =>
    fetchApi<any>("/api/assets/favorite", { method: "POST", body: JSON.stringify({ filename, is_favorite }) }),
  getCollections: () => fetchApi<{ success: boolean; collections: any[] }>("/api/assets/collections"),
  createCollection: (name: string, description?: string) =>
    fetchApi<any>("/api/assets/collections", { method: "POST", body: JSON.stringify({ name, description }) }),
  deleteCollection: (id: string) => fetchApi<any>(`/api/assets/collections/${id}`, { method: "DELETE" }),
  getCollectionItems: (id: string) => fetchApi<any>(`/api/assets/collections/${id}/items`),
  addToCollection: (id: string, filenames: string[]) =>
    fetchApi<any>(`/api/assets/collections/${id}/items`, { method: "POST", body: JSON.stringify({ filenames }) }),
  removeFromCollection: (id: string, filename: string) =>
    fetchApi<any>(`/api/assets/collections/${id}/items/${encodeURIComponent(filename)}`, { method: "DELETE" }),

  // Video & Image Upload / Edit Tools
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchApi<any>("/api/image/upload", { method: "POST", body: formData });
  },
  editImage: (data: any) => fetchApi<any>("/api/image/edit", { method: "POST", body: JSON.stringify(data) }),
  uploadVideo: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchApi<any>("/api/video/upload", { method: "POST", body: formData });
  },
  uploadWithProgress,
  uploadVideoWithProgress: (file: File, onProgress?: (percent: number) => void) =>
    uploadWithProgress<any>("/api/video/upload", file, "file", onProgress),
  uploadVideoKeyframeWithProgress: (file: File, onProgress?: (percent: number) => void) =>
    uploadWithProgress<any>("/api/video/upload-keyframe", file, "file", onProgress),
  uploadSourceVideoWithProgress: (file: File, onProgress?: (percent: number) => void) =>
    uploadWithProgress<any>("/api/video/upload-source-video", file, "file", onProgress),
  editVideo: (data: any) => fetchApi<any>("/api/video/edit", { method: "POST", body: JSON.stringify(data) }),
  concatVideos: (videoPaths: string[], transition?: string, transitionDuration?: number) =>
    fetchApi<any>("/api/video/concat", {
      method: "POST",
      body: JSON.stringify({
        video_paths: videoPaths,
        transition: transition || "none",
        transition_duration: transitionDuration || 1.0,
      }),
    }),
  renameAsset: (media_type: string, old_filename: string, new_filename: string) =>
    fetchApi<any>("/api/assets/rename", {
      method: "POST",
      body: JSON.stringify({ media_type, old_filename, new_filename }),
    }),

  // AI Video Intelligence & Creator Tools
  aiRemoveSilence: (video_path: string, noise_threshold_db: number = -30.0, min_silence_duration: number = 0.5) =>
    fetchApi<any>("/api/video/ai-remove-silence", {
      method: "POST",
      body: JSON.stringify({ video_path, noise_threshold_db, min_silence_duration }),
    }),
  aiDenoiseAudio: (video_path: string) =>
    fetchApi<any>("/api/video/ai-denoise", {
      method: "POST",
      body: JSON.stringify({ video_path }),
    }),
  aiEnhanceVoice: (video_path: string) =>
    fetchApi<any>("/api/video/ai-enhance-voice", {
      method: "POST",
      body: JSON.stringify({ video_path }),
    }),
  aiCaptions: (video_path: string, language: string = "en", translate_to?: string) =>
    fetchApi<any>("/api/video/ai-captions", {
      method: "POST",
      body: JSON.stringify({ video_path, language, translate_to }),
    }),
  aiProductAd: (product_image_path: string, product_title: string, target_audience: string = "Luxury consumers", language: string = "en") =>
    fetchApi<any>("/api/video/ai-product-ad", {
      method: "POST",
      body: JSON.stringify({ product_image_path, product_title, target_audience, language }),
    }),

  // Settings
  getStatus: () => fetchApi<any>("/api/settings/status"),
  getKeys: () => fetchApi<any>("/api/settings/keys"),
  getSystemMetrics: () => fetchApi<any>("/api/settings/system-metrics"),
  updateKeys: (data: any) => fetchApi<any>("/api/settings/keys", { method: "POST", body: JSON.stringify(data) }),
  testDatabase: (url?: string) => fetchApi<any>("/api/settings/test-db", { method: "POST", body: JSON.stringify({ database_url: url }) }),
  testStorage: () => fetchApi<any>("/api/settings/test-r2", { method: "POST" }),
  clearCache: () => fetchApi<any>("/api/settings/cache-clear", { method: "POST" }),
  pingLatency: async (): Promise<{ status: string; latency_ms: number; server?: string; version?: string }> => {
    const start = performance.now();
    const data = await fetchApi<any>("/api/settings/ping");
    const latency_ms = Math.round(performance.now() - start);
    return { status: data?.status || "online", server: data?.server || "OmniStudio Engine", version: data?.version || "5.0.0", latency_ms };
  },

  // Analytics & Usage
  getUsageSummary: () => fetchApi<any>("/api/analytics/summary"),
  getUsageHistory: (service?: string, limit: number = 50) => {
    const q = service && service !== "all" ? `?service=${service}&limit=${limit}` : `?limit=${limit}`;
    return fetchApi<any>(`/api/analytics/history${q}`);
  },
  getRateCards: () => fetchApi<any>("/api/analytics/rates"),
  clearUsageHistory: () => fetchApi<any>("/api/analytics/clear", { method: "POST" }),

  // Publish Studio & Multi-Platform Distribution
  getPublishPlatforms: () => fetchApi<any>("/api/publish/platforms"),
  getConnectedAccounts: () => fetchApi<any>("/api/publish/accounts"),
  connectAccount: (data: { platform: string; account_name: string; username?: string }) =>
    fetchApi<any>("/api/publish/accounts/connect", { method: "POST", body: JSON.stringify(data) }),
  disconnectAccount: (accountId: string) =>
    fetchApi<any>(`/api/publish/accounts/${accountId}`, { method: "DELETE" }),
  aiOptimizePublishContent: (data: { title?: string; content: string; platforms: string[]; media_type?: string }) =>
    fetchApi<any>("/api/publish/optimize", { method: "POST", body: JSON.stringify(data) }),
  generatePublishThumbnail: (data: { title: string; platform_format?: string; source_image_path?: string; category_badge?: string; accent_color?: string }) =>
    fetchApi<any>("/api/publish/thumbnails", { method: "POST", body: JSON.stringify(data) }),
  repurposePublishContent: (data: { title?: string; content: string; media_url?: string }) =>
    fetchApi<any>("/api/publish/repurpose", { method: "POST", body: JSON.stringify(data) }),
  aiSocialMediaManagerPlan: (data: { campaign_goal: string; target_audience?: string; duration_days?: number }) =>
    fetchApi<any>("/api/publish/ai-manager", { method: "POST", body: JSON.stringify(data) }),
  runCreatorMode: (data: { concept: string; media_url?: string }) =>
    fetchApi<any>("/api/publish/creator-mode", { method: "POST", body: JSON.stringify(data) }),
  createPublishPost: (data: any) =>
    fetchApi<any>("/api/publish/posts", { method: "POST", body: JSON.stringify(data) }),
  getPublishPosts: (params?: { status?: string; workspace_id?: string; platform?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append("status", params.status);
    if (params?.workspace_id) q.append("workspace_id", params.workspace_id);
    if (params?.platform) q.append("platform", params.platform);
    const qs = q.toString();
    return fetchApi<any>(`/api/publish/posts${qs ? `?${qs}` : ""}`);
  },
  getPublishPost: (postId: string) =>
    fetchApi<any>(`/api/publish/posts/${postId}`),
  deletePublishPost: (postId: string) =>
    fetchApi<any>(`/api/publish/posts/${postId}`, { method: "DELETE" }),
  publishPostNow: (postId: string) =>
    fetchApi<any>(`/api/publish/posts/${postId}/publish-now`, { method: "POST" }),
  approvePublishPost: (postId: string, approved: boolean = true) =>
    fetchApi<any>(`/api/publish/posts/${postId}/approve`, { method: "POST", body: JSON.stringify({ approved }) }),
  recyclePublishPost: (postId: string) =>
    fetchApi<any>(`/api/publish/posts/${postId}/recycle`, { method: "POST" }),
  getPublishCalendar: () =>
    fetchApi<any>("/api/publish/calendar"),
  getPublishAnalytics: () =>
    fetchApi<any>("/api/publish/analytics"),
  getPublishRecommendations: () =>
    fetchApi<any>("/api/publish/recommendations"),
  getPublishTemplates: () =>
    fetchApi<any>("/api/publish/templates"),
  savePublishTemplate: (data: any) =>
    fetchApi<any>("/api/publish/templates", { method: "POST", body: JSON.stringify(data) }),
  getPublishWorkspaces: () =>
    fetchApi<any>("/api/publish/workspaces"),
  createPublishWorkspace: (data: { name: string; client_name?: string; approval_required?: boolean }) =>
    fetchApi<any>("/api/publish/workspaces", { method: "POST", body: JSON.stringify(data) }),
  uploadPublishMedia: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchApiFormData<any>("/api/publish/upload-media", formData);
  },
  getCronStatus: () =>
    fetchApi<any>("/api/publish/cron/status"),
  runDueScheduledPosts: () =>
    fetchApi<any>("/api/publish/cron/run", { method: "POST" }),
};
