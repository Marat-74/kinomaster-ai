/**
 * KinoMaster AI 2.0 — Video Engine Adapter
 * Version: 1.0.0
 *
 * Provider-neutral video generation layer.
 *
 * SECURITY:
 * - Never put SYNTX_TOKEN or any provider secret in this browser module.
 * - Supply a trusted server-side transport through createSyntxAdapter({ client }).
 * - The transport is responsible for authenticating to SYNTX and mapping its
 *   server/MCP SDK calls to the small interface documented below.
 *
 * This file does not guess undocumented HTTP endpoints and does not make
 * network requests by itself.
 */

const VERSION = "1.0.0";

const PROVIDER_RULES = Object.freeze([
  {
    match: ({ aiName }) => aiName === "grok_i2v",
    remove: ["aspect_ratio"]
  },
  {
    match: ({ aiName }) => aiName === "grok_v2v",
    remove: ["aspect_ratio", "video_duration", "resolution"]
  },
  {
    match: ({ aiName, modelType }) =>
      String(aiName || "").startsWith("kling_o1_") ||
      String(modelType || "").startsWith("kling_o1_"),
    remove: ["mode"]
  },
  {
    match: ({ aiName, modelType }) =>
      /runway/i.test(`${aiName || ""} ${modelType || ""}`) &&
      /acttwo/i.test(`${aiName || ""} ${modelType || ""}`),
    remove: ["video_duration"]
  }
]);

function cloneObject(value) {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Параметры генерации должны быть объектом.");
  }
  return { ...value };
}

function normalizeVideoParameters(parameters, provider = {}) {
  const result = cloneObject(parameters);
  const context = {
    aiName: provider.aiName || provider.ai_name || "",
    modelType: provider.modelType || provider.model_type || ""
  };
  const removed = [];

  for (const rule of PROVIDER_RULES) {
    if (rule.match(context)) {
      for (const key of rule.remove) {
        if (Object.prototype.hasOwnProperty.call(result, key)) {
          delete result[key];
          removed.push(key);
        }
      }
    }
  }

  return {
    parameters: result,
    removed: [...new Set(removed)]
  };
}

function requireFunction(object, name, ownerLabel = "client") {
  if (!object || typeof object[name] !== "function") {
    throw new TypeError(
      `Не настроен обязательный метод ${ownerLabel}.${name}().`
    );
  }
}

function normalizeMediaResult(response) {
  if (!response || typeof response !== "object") return [];
  const media = response.media;
  if (Array.isArray(media)) return media;
  if (media && typeof media === "object") return [media];
  if (typeof response.url === "string") {
    return [{ url: response.url, type: "video" }];
  }
  return [];
}

function validateVideoRequest(request) {
  if (!request || typeof request !== "object") {
    throw new TypeError("Запрос генерации должен быть объектом.");
  }

  const prompt = String(request.prompt || "").trim();
  if (!prompt) throw new Error("Добавь описание сцены для генерации видео.");

  const aiName = String(request.aiName || request.ai_name || "").trim();
  const modelType = String(request.modelType || request.model_type || "").trim();
  if (!aiName) throw new Error("Не выбрана видеомодель (aiName).");
  if (!modelType) throw new Error("Не указан тип модели (modelType).");

  const files = Array.isArray(request.files) ? request.files : [];
  if (files.length > 10) {
    throw new Error("SYNTX допускает не более 10 файлов в одной загрузке.");
  }

  return { prompt, aiName, modelType, files };
}

/**
 * Create the SYNTX adapter around a trusted transport.
 *
 * Required transport contract:
 *   client.uploadFiles({ files }) -> [{ url, filename?, mimeType? }]
 *   client.createChat({}) -> { chat_id } OR { id }
 *   client.generateVideo({
 *     chatId, prompt, aiName, modelType, parameters, fileUrls
 *   }) -> provider response / acknowledgement
 *   client.waitForResponse({ chatId }) -> completed response with `media`
 *
 * The transport may wrap the SYNTX MCP tools/SDK on a server. It must keep
 * credentials server-side and convert browser File/Blob inputs to SYNTX's
 * supported upload format. No API endpoint or auth scheme is assumed here.
 */
function createSyntxAdapter({ client, onProgress } = {}) {
  requireFunction(client, "uploadFiles");
  requireFunction(client, "createChat");
  requireFunction(client, "generateVideo");
  requireFunction(client, "waitForResponse");

  const progress = typeof onProgress === "function" ? onProgress : () => {};

  return {
    id: "syntx",
    name: "SYNTX",
    version: VERSION,

    async generate(request) {
      const validated = validateVideoRequest(request);
      const normalized = normalizeVideoParameters(
        request.parameters || {},
        {
          aiName: validated.aiName,
          modelType: validated.modelType
        }
      );

      progress({ stage: "starting", message: "Подготавливаем генерацию." });

      let fileUrls = [];
      if (validated.files.length) {
        progress({
          stage: "uploading",
          message: "Загружаем референсы персонажа и материалы."
        });

        const uploaded = await client.uploadFiles({
          files: validated.files
        });

        if (!Array.isArray(uploaded)) {
          throw new Error("Сервер загрузки должен вернуть массив загруженных файлов.");
        }

        fileUrls = uploaded.map(item => {
          const url = typeof item === "string" ? item : item && item.url;
          if (typeof url !== "string" || !url.trim()) {
            throw new Error("Сервер загрузки вернул файл без URL.");
          }
          return url;
        });

        if (fileUrls.length !== validated.files.length) {
          throw new Error("Количество загруженных файлов не совпадает с количеством исходных.");
        }
      }

      progress({ stage: "creating-chat", message: "Создаём задачу генерации." });
      const chat = await client.createChat({});
      const chatId = chat && (chat.chat_id || chat.id);
      if (!chatId) {
        throw new Error("SYNTX transport не вернул chat_id после создания чата.");
      }

      progress({ stage: "generating", message: "Передаём сценарий видеомодели." });
      const generation = await client.generateVideo({
        chatId,
        prompt: validated.prompt,
        aiName: validated.aiName,
        modelType: validated.modelType,
        parameters: normalized.parameters,
        fileUrls
      });

      progress({ stage: "waiting", message: "Ожидаем готовое видео." });
      const completed = await client.waitForResponse({ chatId });
      const media = normalizeMediaResult(completed);

      if (!media.length) {
        throw new Error(
          "Задача завершилась, но в ответе нет готового media URL. Проверь ответ SYNTX transport."
        );
      }

      progress({ stage: "completed", message: "Видео получено." });

      return {
        provider: "syntx",
        chatId,
        generation,
        result: completed,
        media,
        normalizedParameters: normalized.parameters,
        removedParameters: normalized.removed
      };
    }
  };
}

function createVideoEngineManager() {
  const adapters = new Map();

  return {
    register(adapter) {
      if (!adapter || !adapter.id || typeof adapter.generate !== "function") {
        throw new TypeError("Адаптер должен иметь id и метод generate().");
      }
      adapters.set(String(adapter.id), adapter);
      return this;
    },

    has(id) {
      return adapters.has(String(id));
    },

    list() {
      return [...adapters.values()].map(adapter => ({
        id: adapter.id,
        name: adapter.name || adapter.id,
        version: adapter.version || "unknown"
      }));
    },

    get(id) {
      const adapter = adapters.get(String(id));
      if (!adapter) throw new Error(`Видеодвижок "${id}" не зарегистрирован.`);
      return adapter;
    },

    async generate(providerId, request) {
      return this.get(providerId).generate(request);
    }
  };
}

const KinoVideoEngines = Object.freeze({
  version: VERSION,
  normalizeVideoParameters,
  createSyntxAdapter,
  createVideoEngineManager
});

if (typeof globalThis !== "undefined") {
  globalThis.KinoVideoEngines = KinoVideoEngines;
}

export {
  VERSION,
  normalizeVideoParameters,
  createSyntxAdapter,
  createVideoEngineManager
};

export default KinoVideoEngines;
