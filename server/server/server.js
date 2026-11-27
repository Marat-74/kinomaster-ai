import http from "node:http";
import { SyntxClient } from "syntx-ai-mcp";

const PORT = Number(process.env.PORT || 3000);
const ACCESS_KEY = process.env.KINOMASTER_ACCESS_KEY;
const SYNTX_TOKEN = process.env.SYNTX_TOKEN;

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";

let syntx = null;

if (SYNTX_TOKEN) {
  syntx = new SyntxClient({ token: SYNTX_TOKEN });
}

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

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return send(res, 204, {});
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, {
      status: "ok",
      service: "Kinomaster Server",
      syntx_configured: Boolean(syntx)
    });
  }

  if (!authorized(req)) {
    return send(res, 401, {
      error: "Unauthorized"
    });
  }

  if (!syntx) {
    return send(res, 503, {
      error: "SYNTX_TOKEN is not configured"
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

      const result = await syntx.video.generate(aiName, {
        chat_id: chatId,
        prompt,
        settings: body.settings || {},
        file_urls: body.file_urls || [],
        audio_url: body.audio_url || null
      });

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

      const [messages, progress] = await Promise.all([
        syntx.chats.getMessages(chatId),
        syntx.chats.getInProgress(chatId)
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

    return send(res, 500, {
      error: "Server error",
      message: error.message
    });
  }
});

server.listen(PORT, () => {
  console.log(`Kinomaster server listening on port ${PORT}`);
});
