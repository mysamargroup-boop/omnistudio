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
  if (sessionToken && sessionToken.length > 5) return sessionToken;
  const legacyToken = localStorage.getItem("omnistudio_backend_jwt")?.trim();
  if (legacyToken && legacyToken.length > 5) {
    try { sessionStorage.setItem("omnistudio_backend_jwt", legacyToken); localStorage.removeItem("omnistudio_backend_jwt"); } catch { /* ignore */ }
    return legacyToken;
  }
  // Check if PIN session is active
  try {
    const pinSession = sessionStorage.getItem("omnistudio_pin_session") || localStorage.getItem("omnistudio_pin_session");
    if (pinSession) {
      const p = JSON.parse(pinSession);
      if (p?.authenticated) {
        return process.env.NEXT_PUBLIC_STUDIO_PIN || process.env.NEXT_PUBLIC_STUDIO_PASSCODE || null;
      }
    }
  } catch {}
  // Studio Passcode from environment variable only
  return process.env.NEXT_PUBLIC_STUDIO_PIN || process.env.NEXT_PUBLIC_STUDIO_PASSCODE || process.env.NEXT_PUBLIC_DEFAULT_PIN || null;
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

  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:") || path.startsWith("data:")) return path;
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
  planAgenticPoses: (data: { prompt: string; reference_image_path?: string; count?: number }) =>
    fetchApi<any>("/api/image/agentic-plan", { method: "POST", body: JSON.stringify(data) }),
  generateAgenticPoses: (data: { plan: any; reference_image_path?: string; model?: string; aspect_ratio?: string }) =>
    fetchApi<any>("/api/image/agentic-generate", { method: "POST", body: JSON.stringify(data) }),
  aiRemoveBackground: (image_path: string, model_name: string = "u2net") =>
    fetchApi<any>("/api/image/remove-background", {
      method: "POST",
      body: JSON.stringify({ image_path, model_name }),
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
  switchBrandKit: (brand_id: string) =>
    fetchApi<any>("/api/brand-kit/switch", {
      method: "POST",
      body: JSON.stringify({ brand_id }),
    }),
  createBrandProfile: (data: { name: string; tagline?: string; template?: string }) =>
    fetchApi<any>("/api/brand-kit/create", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteBrandProfile: (brand_id: string) =>
    fetchApi<any>(`/api/brand-kit/${brand_id}`, {
      method: "DELETE",
    }),
  uploadBrandLogo: (file: File, logo_type: "primary" | "dark" | "icon" = "primary", brand_id?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    const qs = new URLSearchParams({ logo_type });
    if (brand_id) qs.append("brand_id", brand_id);
    return fetchApiFormData<any>(`/api/brand-kit/upload-logo?${qs.toString()}`, formData);
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
  getStoryboardPrompts: (data: { image_url?: string; story_hint?: string; style?: string; num_scenes?: number }) =>
    fetchApi<any>("/api/pipeline/storyboard-prompts", { method: "POST", body: JSON.stringify(data) }),
  generateStoryboard: (data: { scenes: any[]; reference_image_url?: string; aspect_ratio?: string; model?: string }) =>
    fetchApi<any>("/api/pipeline/storyboard-generate", { method: "POST", body: JSON.stringify(data) }),

  // Agent Pipeline (Agentic AI Creative Operating System)
  startAgentPipeline: (data: {
    prompt: string;
    mode?: string;
    num_scenes?: number;
    style?: string;
    aspect_ratio?: string;
    image_model?: string;
    video_model?: string;
    voice_provider?: string;
    voice_id?: string;
    apply_brand_kit?: boolean;
  }) => fetchApi<any>("/api/pipeline/agent/start", { method: "POST", body: JSON.stringify(data) }),

  streamAgentPipeline: async (
    pipelineId: string,
    onEvent: (event: any) => void,
    signal?: AbortSignal
  ): Promise<any> => {
    const base = getApiBase();
    const res = await fetch(`${base}/api/pipeline/agent/stream/${pipelineId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
            if (parsed.state === "complete" || (parsed.stage === "complete" && parsed.result) || parsed.master_video_path) {
              finalResult = parsed.result || parsed;
            }
          } catch (e) {
            console.error("Agent SSE parse error", e);
          }
        }
      }
    }
    return finalResult;
  },

  approveAgentStep: (pipelineId: string) =>
    fetchApi<any>(`/api/pipeline/agent/approve/${pipelineId}`, { method: "POST" }),

  rejectAgentStep: (pipelineId: string, feedback: string = "") =>
    fetchApi<any>(`/api/pipeline/agent/reject/${pipelineId}`, {
      method: "POST",
      body: JSON.stringify({ feedback }),
    }),

  resumeAgentPipeline: (pipelineId: string) =>
    fetchApi<any>(`/api/pipeline/agent/resume/${pipelineId}`, { method: "POST" }),

  getAgentPipelineStatus: (pipelineId: string) =>
    fetchApi<any>(`/api/pipeline/agent/status/${pipelineId}`),

  getAgentPipelineHistory: () =>
    fetchApi<any>("/api/pipeline/agent/history"),

  cancelAgentPipeline: (pipelineId: string) =>
    fetchApi<any>(`/api/pipeline/agent/${pipelineId}`, { method: "DELETE" }),

  // Assets
  getAllAssets: () => fetchApi<any>("/api/assets/all"),
  getVaultImages: () => fetchApi<any>("/api/assets/images"),
  getVaultVideos: () => fetchApi<any>("/api/assets/videos"),
  getVaultAudios: () => fetchApi<any>("/api/assets/audio"),
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
  searchInstagramProfile: (handle: string, useGraphApi: boolean = false) => {
    const cleanHandle = handle.replace(/^@/, "").trim();
    const q = new URLSearchParams({ handle: cleanHandle });
    if (useGraphApi) q.append("use_graph_api", "true");
    return fetchApi<any>(`/api/analytics/instagram/search?${q.toString()}`);
  },
  getConnectedInstagramAnalytics: (accountId?: string) => {
    const q = accountId ? `?account_id=${encodeURIComponent(accountId)}` : "";
    return fetchApi<any>(`/api/analytics/instagram/connected${q}`);
  },
  getInstagramSuggestions: (query: string, limit: number = 8) => {
    const q = new URLSearchParams();
    if (query) q.append("q", query);
    q.append("limit", String(limit));
    return fetchApi<{ success: boolean; query: string; suggestions: any[] }>(`/api/analytics/instagram/suggest?${q.toString()}`);
  },

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
  generateBatchThumbnails: (data: { title: string; formats: string[]; source_image_path?: string; category_badge?: string; accent_color?: string }) =>
    fetchApi<any>("/api/publish/thumbnails/batch", { method: "POST", body: JSON.stringify(data) }),
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
    return fetchApi<any>("/api/publish/upload-media", { method: "POST", body: formData });
  },
  getCronStatus: () =>
    fetchApi<any>("/api/publish/cron/status"),
  runDueScheduledPosts: () =>
    fetchApi<any>("/api/publish/cron/run", { method: "POST" }),
  getSocialKeysStatus: () =>
    fetchApi<any>("/api/publish/social-keys/status"),
  testSocialPlatformApi: (platform: string) =>
    fetchApi<any>(`/api/publish/social-keys/test/${platform}`, { method: "POST" }),

  // Character Consistency & Studio DB Endpoints
  getCharacters: () =>
    fetchApi<{ success: boolean; characters: any[] }>("/api/characters"),
  saveCharacter: (data: any) =>
    fetchApi<{ success: boolean; character: any }>("/api/characters", { method: "POST", body: JSON.stringify(data) }),
  deleteCharacter: (id: string) =>
    fetchApi<{ success: boolean; deleted_id: string }>(`/api/characters/${id}`, { method: "DELETE" }),
  getActiveCharacter: () =>
    fetchApi<{ success: boolean; character: any }>("/api/characters/active"),
  setActiveCharacter: (character: any) =>
    fetchApi<{ success: boolean; character: any }>("/api/characters/active", { method: "POST", body: JSON.stringify({ character }) }),

  // Apify Scraper & AI Screenplay Studio Endpoints
  getApifyActors: () =>
    fetchApi<{ success: boolean; token_configured: boolean; actors: any[] }>("/api/apify/actors"),
  runApifyActor: (actorId: string, input?: Record<string, any>) =>
    fetchApi<{
      success: boolean;
      run_id: string;
      actor_id: string;
      status: string;
      default_dataset_id: string;
      started_at: string;
      mode: string;
      message?: string;
    }>("/api/apify/run", {
      method: "POST",
      body: JSON.stringify({ actor_id: actorId, input: input || {} }),
    }),
  getApifyRunStatus: (runId: string) =>
    fetchApi<{ success: boolean; run_id: string; status: string; default_dataset_id?: string }>(`/api/apify/runs/${runId}`),
  getApifyDatasetItems: (datasetId: string, limit: number = 25) =>
    fetchApi<{ success: boolean; dataset_id: string; count: number; items: any[] }>(
      `/api/apify/datasets/${datasetId}?limit=${limit}`
    ),
  analyzeApifyDataWithAI: (data: { scraped_text: string; target_style?: string }) =>
    fetchApi<{ success: boolean; screenplay: any }>("/api/apify/ai-analyze", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  apifyWebFetch: (url: string) =>
    fetchApi<{ success: boolean; url: string; title?: string; content: string }>("/api/apify/web-fetch", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  // Prompt Vault / Prompt Maker Collection
  getPrompts: (params?: { search?: string; category?: string; studio_type?: string; favorite_only?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.category && params.category !== "all") query.append("category", params.category);
    if (params?.studio_type && params.studio_type !== "all") query.append("studio_type", params.studio_type);
    if (params?.favorite_only) query.append("favorite_only", "true");
    const qs = query.toString();
    return fetchApi<{ success: boolean; prompts: any[]; total: number }>(`/api/prompts${qs ? `?${qs}` : ""}`);
  },
  createPrompt: (data: {
    title: string;
    prompt: string;
    negative_prompt?: string;
    category?: string;
    tags?: string[];
    studio_type?: string;
    metadata?: Record<string, any>;
  }) => fetchApi<{ success: boolean; prompt?: any; id?: string }>("/api/prompts", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  updatePrompt: (id: string, data: any) =>
    fetchApi<any>(`/api/prompts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deletePrompt: (id: string) =>
    fetchApi<{ success: boolean; id: string }>(`/api/prompts/${id}`, {
      method: "DELETE",
    }),
  toggleFavoritePrompt: (id: string) =>
    fetchApi<{ success: boolean; id: string; is_favorite: number; isFavorite: boolean }>(`/api/prompts/${id}/favorite`, {
      method: "POST",
    }),

  // AI Metadata Cleaner & Provenance Inspector
  inspectMetadata: (params: { url?: string; path?: string; filename?: string }) =>
    fetchApi<ImageMetadataInspection>("/api/metadata/inspect", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  inspectUploadedImage: (file: File, ephemeral: boolean = false, onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("ephemeral", ephemeral ? "true" : "false");
    return fetchApiFormData<ImageMetadataInspection>("/api/metadata/inspect-upload", formData);
  },
  cleanMetadata: (params: {
    url?: string;
    path?: string;
    filename?: string;
    stealth_mode?: boolean;
    quality?: number;
    save_as_copy?: boolean;
  }) =>
    fetchApi<CleanMetadataResponse>("/api/metadata/clean", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  cleanUploadedImage: (
    file: File,
    stealth_mode: boolean = false,
    quality: number = 95,
    save_to_vault: boolean = false
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("save_to_vault", save_to_vault ? "true" : "false");
    const qs = new URLSearchParams({
      stealth_mode: stealth_mode ? "true" : "false",
      quality: String(quality),
    }).toString();
    return fetchApi<CleanMetadataResponse>(`/api/metadata/clean-upload?${qs}`, {
      method: "POST",
      body: formData,
    });
  },

  // Video AI Metadata Cleaner & Provenance Inspector
  inspectVideoMetadata: (params: { url?: string; path?: string; filename?: string }) =>
    fetchApi<VideoMetadataInspection>("/api/metadata/video/inspect", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  inspectUploadedVideo: (file: File, ephemeral: boolean = false, onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("ephemeral", ephemeral ? "true" : "false");
    return fetchApiFormData<VideoMetadataInspection>("/api/metadata/inspect-upload", formData);
  },
  cleanVideoMetadata: (params: {
    url?: string;
    path?: string;
    filename?: string;
    stealth_mode?: boolean;
  }) =>
    fetchApi<CleanVideoResponse>("/api/metadata/video/clean", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  cleanUploadedVideo: (file: File, stealth_mode: boolean = false, save_to_vault: boolean = false) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("save_to_vault", save_to_vault ? "true" : "false");
    const qs = new URLSearchParams({
      stealth_mode: stealth_mode ? "true" : "false",
    }).toString();
    return fetchApi<CleanVideoResponse>(`/api/metadata/clean-upload?${qs}`, {
      method: "POST",
      body: formData,
    });
  },

  // Audio AI Metadata Cleaner & Provenance Inspector
  inspectAudioMetadata: (params: { url?: string; path?: string; filename?: string }) =>
    fetchApi<AudioMetadataInspection>("/api/metadata/audio/inspect", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  inspectUploadedAudio: (file: File, ephemeral: boolean = false) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("ephemeral", ephemeral ? "true" : "false");
    return fetchApiFormData<AudioMetadataInspection>("/api/metadata/inspect-upload", formData);
  },
  cleanAudioMetadata: (params: {
    url?: string;
    path?: string;
    filename?: string;
    stealth_mode?: boolean;
  }) =>
    fetchApi<CleanAudioResponse>("/api/metadata/audio/clean", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  cleanUploadedAudio: (file: File, stealth_mode: boolean = false, save_to_vault: boolean = false) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("save_to_vault", save_to_vault ? "true" : "false");
    const qs = new URLSearchParams({
      stealth_mode: stealth_mode ? "true" : "false",
    }).toString();
    return fetchApi<CleanAudioResponse>(`/api/metadata/clean-upload?${qs}`, {
      method: "POST",
      body: formData,
    });
  },

  // Realistic Camera Profile Injection & Metadata Spoofing
  getMetadataPresets: () =>
    fetchApi<MetadataPresetsResponse>("/api/metadata/presets"),
  injectMetadata: (params: {
    url?: string;
    path?: string;
    filename?: string;
    camera_preset?: string;
    custom_camera?: any;
    gps_preset?: string;
    custom_gps?: any;
    stealth_mode?: boolean;
    quality?: number;
  }) =>
    fetchApi<InjectMetadataResponse>("/api/metadata/inject", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  injectUploadedMedia: (
    file: File,
    camera_preset: string = "sony_a7iv",
    gps_preset?: string,
    stealth_mode: boolean = false,
    quality: number = 98,
    save_to_vault: boolean = false,
    custom_gps?: { lat: number; lon: number; name?: string }
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("camera_preset", camera_preset);
    if (gps_preset) formData.append("gps_preset", gps_preset);
    if (custom_gps) formData.append("custom_gps", JSON.stringify(custom_gps));
    formData.append("stealth_mode", stealth_mode ? "true" : "false");
    formData.append("quality", String(quality));
    formData.append("save_to_vault", save_to_vault ? "true" : "false");
    return fetchApi<InjectMetadataResponse>("/api/metadata/inject-upload", {
      method: "POST",
      body: formData,
    });
  },
};

export interface ImageMetadataInspection {
  success: boolean;
  filename: string;
  file_size_bytes: number;
  file_size_formatted: string;
  format: string | null;
  mode: string | null;
  width: number;
  height: number;
  aspect_ratio: string;
  has_exif: boolean;
  exif_tags: Record<string, any>;
  png_info_chunks: Record<string, any>;
  raw_text_metadata: string[];
  c2pa_detected: boolean;
  synthid_detected: boolean;
  detected_generator: string | null;
  embedded_prompt: string | null;
  negative_prompt?: string | null;
  embedded_parameters: Record<string, any>;
  has_ai_metadata: boolean;
  camera_info?: Record<string, any>;
  gps_info?: {
    has_gps: boolean;
    latitude?: number;
    longitude?: number;
    formatted?: string;
    google_maps_url?: string;
    altitude_meters?: number;
  };
  rights_and_creator?: {
    artist?: string;
    copyright?: string;
    description?: string;
  };
  color_profile?: Record<string, any>;
  saved_to_disk?: boolean;
  ephemeral?: boolean;
  storage_status?: string;
  url?: string;
  error?: string;
}

export interface CleanMetadataResponse {
  success: boolean;
  input_filename: string;
  output_filename: string;
  url: string;
  clean_url?: string;
  local_path: string;
  original_size_bytes: number;
  cleaned_size_bytes: number;
  saved_bytes: number;
  saved_percent: number;
  format: string;
  stealth_mode: boolean;
  before_metadata: ImageMetadataInspection;
  after_metadata: ImageMetadataInspection;
  error?: string;
}

export interface VideoMetadataInspection {
  success: boolean;
  filename: string;
  file_size_bytes: number;
  file_size_formatted: string;
  format: string;
  duration: number;
  duration_formatted: string;
  width: number;
  height: number;
  aspect_ratio: string;
  fps: number;
  video_codec: string | null;
  audio_codec: string | null;
  bitrate_kbps: number;
  has_audio: boolean;
  c2pa_detected: boolean;
  synthid_detected: boolean;
  detected_generator: string | null;
  has_ai_metadata: boolean;
  tags: Record<string, any>;
  raw_text_metadata: string[];
  video_technical?: Record<string, any>;
  audio_technical?: Record<string, any>;
  container_tags?: Record<string, any>;
  camera_info?: Record<string, any>;
  gps_info?: {
    has_gps: boolean;
    latitude?: number;
    longitude?: number;
    formatted?: string;
    google_maps_url?: string;
  };
  saved_to_disk?: boolean;
  ephemeral?: boolean;
  storage_status?: string;
  url?: string;
  media_type?: string;
  error?: string;
}

export interface CleanVideoResponse {
  success: boolean;
  media_type: string;
  url: string;
  clean_url: string;
  input_filename: string;
  output_filename: string;
  clean_filename: string;
  local_path: string;
  original_size_bytes: number;
  cleaned_size_bytes: number;
  saved_bytes: number;
  saved_percent: number;
  format: string;
  stealth_mode: boolean;
  verified_clean: boolean;
  before_metadata: VideoMetadataInspection;
  after_metadata: VideoMetadataInspection;
  error?: string;
}

export interface AudioMetadataInspection {
  success: boolean;
  media_type: "audio";
  filename: string;
  file_size_bytes: number;
  file_size_formatted: string;
  format: string;
  duration: number;
  duration_formatted: string;
  audio_codec: string | null;
  bitrate_kbps: number;
  sample_rate: string | null;
  channels: number;
  channel_layout: string;
  bits_per_sample?: number | null;
  c2pa_detected: boolean;
  synthid_detected: boolean;
  detected_generator: string | null;
  has_ai_metadata: boolean;
  tags: Record<string, any>;
  raw_text_metadata: string[];
  audio_technical?: Record<string, any>;
  rights_and_creator?: Record<string, any>;
  embedded_prompt?: string | null;
  saved_to_disk?: boolean;
  ephemeral?: boolean;
  storage_status?: string;
  url?: string;
  error?: string;
}

export interface CleanAudioResponse {
  success: boolean;
  media_type: string;
  url: string;
  clean_url: string;
  input_filename: string;
  output_filename: string;
  clean_filename: string;
  local_path: string;
  original_size_bytes: number;
  cleaned_size_bytes: number;
  saved_bytes: number;
  saved_percent: number;
  format: string;
  stealth_mode: boolean;
  verified_clean: boolean;
  before_metadata: AudioMetadataInspection;
  after_metadata: AudioMetadataInspection;
  error?: string;
}

export interface CameraPreset {
  id: string;
  name: string;
  category: string;
  make: string;
  model: string;
  lens: string;
  software: string;
  focal_length: number;
  f_number: number;
  exposure_time: number;
  iso: number;
  artist?: string;
  copyright?: string;
}

export interface GpsPreset {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface MetadataPresetsResponse {
  success: boolean;
  cameras: Record<string, CameraPreset>;
  gps: Record<string, GpsPreset>;
}

export interface InjectMetadataResponse {
  success: boolean;
  media_type: "image" | "video";
  url: string;
  clean_url: string;
  output_path: string;
  output_filename: string;
  size_before: number;
  size_after: number;
  original_size_bytes: number;
  cleaned_size_bytes: number;
  camera_preset: string;
  injected_camera: Record<string, any>;
  injected_gps?: Record<string, any>;
  verified_clean: boolean;
  remaining_metadata?: Record<string, any>;
  error?: string;
}
