
import http from "node:http";

const PORT = Number(process.env.PORT || 3000);
const ACCESS_KEY = process.env.KINOMASTER_ACCESS_KEY;
const SYNTX_TOKEN = process.env.SYNTX_TOKEN;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const SYNTX_API = "https://api.syntx.ai";

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, X-Kino-Key",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  });

  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk;

      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

function authorized(req) {
  return Boolean(
    ACCESS_KEY &&
    req.headers["x-kino-key"] === ACCESS_KEY
  );
}

async function syntxRequest(path, options = {}) {
  if (!SYNTX_TOKEN) {
    throw new Error("SYNTX_TOKEN is not configured");
  }

  const response = await fetch(`${SYNTX_API}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${SYNTX_TOKEN}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    },
    signal: AbortSignal.timeout(120000)
  });

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(
      data?.message ||
      data?.detail ||
      `SYNTX API error: ${response.status}`
    );

    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
      "Access-Control-Allow-Headers": "Content-Type, X-Kino-Key",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, {
      status: "ok",
      service: "Kinomaster Server",
      syntx_configured: Boolean(SYNTX_TOKEN),
      access_key_configured: Boolean(ACCESS_KEY)
    });
  }

  if (!authorized(req)) {
    return send(res, 401, {
      error: "Unauthorized"
    });
  }

  try {
    if (
      req.method === "POST" &&
      url.pathname === "/api/video/start"
    ) {
      const body = await readBody(req);

      const prompt = String(body.prompt || "").trim();
      const chatId = String(body.chat_id || "").trim();
      const aiName = String(body.ai_name || "").trim();

      if (!prompt || !chatId || !aiName) {
        return send(res, 400, {
          error: "Required fields: prompt, chat_id, ai_name"
        });
      }

      const result = await syntxRequest(
        `/api/v1/video/generate?ai_name=${encodeURIComponent(aiName)}`,
        {
          method: "POST",
          body: JSON.stringify({
            chat_id: chatId,
            prompt,
            settings: body.settings || {},
            file_urls: body.file_urls || [],
            audio_url: body.audio_url || undefined
          })
        }
      );

      return send(res, 200, {
        status: "submitted",
        result
      });
    }

    if (
      req.method === "GET" &&
      url.pathname === "/api/video/status"
    ) {
      const chatId = String(
        url.searchParams.get("chat_id") || ""
      ).trim();

      if (!chatId) {
        return send(res, 400, {
          error: "chat_id is required"
        });
      }

      const encodedChatId = encodeURIComponent(chatId);

      const [messages, progress] = await Promise.all([
        syntxRequest(
          `/api/v1/chats/${encodedChatId}/messages`
        ),
        syntxRequest(
          `/api/v1/chats/${encodedChatId}/inprogress`
        )
      ]);

      return send(res, 200, {
        chat_id: chatId,
        messages,
        progress
      });
    }

    return send(res, 404, {
      error: "Not found"
    });

  } catch (error) {
    console.error("Server error:", error);

    return send(res, error.status || 500, {
      error: "SYNTX request failed",
      message: error.message,
      details: error.details || null
    });
  }
});

server.listen(PORT, () => {
  console.log(`Kinomaster server listening on port ${PORT}`);
});

