/**
 * KinoMaster AI 2.0 — SYNTX HTTP client
 *
 * Browser-side transport only. SYNTX credentials must remain on the server.
 * Expected backend routes:
 *   POST /api/syntx/upload  multipart form-data: files[]
 *   POST /api/syntx/chat    JSON
 *   POST /api/syntx/video   JSON
 *   POST /api/syntx/wait    JSON
 */

export const DEFAULT_ENDPOINTS = Object.freeze({
  upload: "/api/syntx/upload",
  createChat: "/api/syntx/chat",
  generateVideo: "/api/syntx/video",
  waitForResult: "/api/syntx/wait",
});

export function createSyntxHttpClient(options = {}) {
  const endpoints = { ...DEFAULT_ENDPOINTS, ...(options.endpoints || {}) };
  const fetchImpl = options.fetch || globalThis.fetch;

  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch API is not available in this environment.");
  }

  const baseUrl = options.baseUrl || "";

  function endpoint(path) {
    if (/^https?:\/\//i.test(path)) return path;
    return `${baseUrl}${path}`;
  }

  async function request(path, init = {}) {
    const response = await fetchImpl(endpoint(path), {
      credentials: "same-origin",
      ...init,
      headers: {
        ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
        ...(init.headers || {}),
      },
    });

    const raw = await response.text();
    let data = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = { message: raw };
      }
    }

    if (!response.ok) {
      const message = data?.error || data?.message || `HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  async function uploadFiles(files) {
    if (!files || !files.length) return [];
    const form = new FormData();
    for (const file of files) form.append("files", file, file.name);
    const result = await request(endpoints.upload, { method: "POST", body: form });
    const uploaded = result?.files ?? result?.data?.files;
    if (!Array.isArray(uploaded)) {
      throw new Error("Upload response must contain a files array.");
    }
    return uploaded;
  }

  async function createChat(payload = {}) {
    const result = await request(endpoints.createChat, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const chatId = result?.chat_id ?? result?.id ?? result?.chatId;
    if (!chatId) throw new Error("Chat response did not include chat_id or id.");
    return { ...result, chat_id: chatId };
  }

  async function generateVideo(payload) {
    if (!payload || !payload.chatId) throw new Error("chatId is required.");
    if (!payload.prompt) throw new Error("prompt is required.");

    return request(endpoints.generateVideo, {
      method: "POST",
      body: JSON.stringify({
        chatId: payload.chatId,
        prompt: payload.prompt,
        aiName: payload.aiName,
        modelType: payload.modelType,
        parameters: payload.parameters || {},
        fileUrls: payload.fileUrls || [],
      }),
    });
  }

  async function waitForResult(chatId) {
    if (!chatId) throw new Error("chatId is required.");
    const result = await request(endpoints.waitForResult, {
      method: "POST",
      body: JSON.stringify({ chatId }),
    });
    return result?.media ?? result?.data?.media ?? result;
  }

  return Object.freeze({
    uploadFiles,
    createChat,
    generateVideo,
    waitForResult,
    endpoints: Object.freeze({ ...endpoints }),
  });
}

export default createSyntxHttpClient;
