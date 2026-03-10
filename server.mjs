import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function readRequestBody(request) {
  const chunks = [];
  let totalLength = 0;

  for await (const chunk of request) {
    totalLength += chunk.length;
    if (totalLength > 2_000_000) {
      throw new Error("Request body is too large");
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function normalizeBaseUrl(baseUrl, fallback) {
  const candidate = String(baseUrl || fallback || "").trim();
  return candidate.replace(/\/+$/, "");
}

function safeParseHeaders(headersJson) {
  if (!headersJson || !String(headersJson).trim()) {
    return {};
  }

  let parsed;
  try {
    parsed = JSON.parse(headersJson);
  } catch (error) {
    throw new Error(`Invalid custom headers JSON: ${error.message}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Custom headers JSON must be an object");
  }

  return Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [key, String(value)]),
  );
}

function buildPromptEnvelope(promptCase, schema, settings) {
  const parts = [];
  const baseSystemPrompt = String(promptCase.systemPrompt || "").trim();
  if (baseSystemPrompt) {
    parts.push(baseSystemPrompt);
  }

  if (settings.strictJson !== false) {
    parts.push(
      [
        "Return only valid JSON.",
        "Do not wrap it in markdown fences.",
        "Do not add commentary before or after the JSON payload.",
      ].join(" "),
    );
  }

  if (schema) {
    parts.push(["Target output shape:", JSON.stringify(schema, null, 2)].join("\n"));
  }

  return {
    systemPrompt: parts.join("\n\n").trim(),
    userPrompt: String(promptCase.userPrompt || "").trim(),
  };
}

function normalizeTextContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object") {
          if (typeof item.text === "string") {
            return item.text;
          }
          if (typeof item.content === "string") {
            return item.content;
          }
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  if (content && typeof content === "object") {
    if (typeof content.text === "string") {
      return content.text;
    }
    if (typeof content.content === "string") {
      return content.content;
    }
  }

  return "";
}

function sliceBalancedJson(text) {
  const objectStart = text.indexOf("{");
  const arrayStart = text.indexOf("[");
  const indexes = [objectStart, arrayStart].filter((value) => value >= 0);

  if (!indexes.length) {
    return null;
  }

  const start = Math.min(...indexes);
  const openingChar = text[start];
  const closingChar = openingChar === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === openingChar) {
      depth += 1;
    } else if (char === closingChar) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}

function extractJsonCandidate(rawText) {
  const trimmed = String(rawText || "").trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("```")) {
    const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return sliceBalancedJson(trimmed) || trimmed;
}

function getTypeName(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function validateAgainstSchema(schema, value, pathLabel = "$") {
  const issues = [];

  function visit(currentSchema, currentValue, currentPath) {
    if (!currentSchema || typeof currentSchema !== "object" || Array.isArray(currentSchema)) {
      return;
    }

    if (currentSchema.enum && !currentSchema.enum.includes(currentValue)) {
      issues.push(`${currentPath} must be one of: ${currentSchema.enum.join(", ")}`);
      return;
    }

    switch (currentSchema.type) {
      case "object": {
        if (!currentValue || typeof currentValue !== "object" || Array.isArray(currentValue)) {
          issues.push(`${currentPath} must be an object`);
          return;
        }

        for (const requiredKey of currentSchema.required || []) {
          if (!(requiredKey in currentValue)) {
            issues.push(`${currentPath}.${requiredKey} is required`);
          }
        }

        for (const [key, propertySchema] of Object.entries(currentSchema.properties || {})) {
          if (key in currentValue) {
            visit(propertySchema, currentValue[key], `${currentPath}.${key}`);
          }
        }
        return;
      }
      case "array": {
        if (!Array.isArray(currentValue)) {
          issues.push(`${currentPath} must be an array`);
          return;
        }

        if (
          typeof currentSchema.minItems === "number" &&
          currentValue.length < currentSchema.minItems
        ) {
          issues.push(`${currentPath} must contain at least ${currentSchema.minItems} item(s)`);
        }

        if (currentSchema.items) {
          currentValue.slice(0, 12).forEach((item, index) => {
            visit(currentSchema.items, item, `${currentPath}[${index}]`);
          });
        }
        return;
      }
      case "string": {
        if (typeof currentValue !== "string") {
          issues.push(`${currentPath} must be a string, received ${getTypeName(currentValue)}`);
          return;
        }
        if (
          typeof currentSchema.minLength === "number" &&
          currentValue.length < currentSchema.minLength
        ) {
          issues.push(`${currentPath} must be at least ${currentSchema.minLength} characters`);
        }
        return;
      }
      case "number": {
        if (typeof currentValue !== "number") {
          issues.push(`${currentPath} must be a number, received ${getTypeName(currentValue)}`);
        }
        return;
      }
      case "integer": {
        if (!Number.isInteger(currentValue)) {
          issues.push(`${currentPath} must be an integer, received ${getTypeName(currentValue)}`);
        }
        return;
      }
      case "boolean": {
        if (typeof currentValue !== "boolean") {
          issues.push(`${currentPath} must be a boolean, received ${getTypeName(currentValue)}`);
        }
        return;
      }
      default:
        return;
    }
  }

  visit(schema, value, pathLabel);
  return {
    ok: issues.length === 0,
    issues,
  };
}

function collectJsonOutline(value, prefix = "$", acc = []) {
  if (acc.length >= 48) {
    return acc;
  }

  if (Array.isArray(value)) {
    acc.push(`${prefix}[]`);
    if (value.length > 0) {
      collectJsonOutline(value[0], `${prefix}[0]`, acc);
    }
    return acc;
  }

  if (value && typeof value === "object") {
    for (const key of Object.keys(value).slice(0, 12)) {
      const nextPrefix = `${prefix}.${key}`;
      acc.push(nextPrefix);
      collectJsonOutline(value[key], nextPrefix, acc);
      if (acc.length >= 48) {
        break;
      }
    }
  }

  return acc;
}

function computeScore({ outputText, parseOk, issues }) {
  let score = 0;

  if (String(outputText || "").trim()) {
    score += 10;
  }

  if (parseOk) {
    score += 45;
  }

  if (parseOk && issues.length === 0) {
    score += 45;
  } else if (parseOk) {
    score += Math.max(0, 35 - issues.length * 8);
  }

  return Math.max(0, Math.min(score, 100));
}

function createAbortSignal(timeoutMs) {
  const timeout = Math.max(1000, Number(timeoutMs) || 120000);
  return AbortSignal.timeout(timeout);
}

async function runOpenAiCompatible(model, prompt, settings, { omitTemperature = false } = {}) {
  if (!String(model.apiKey || "").trim()) {
    throw new Error("Missing API key");
  }

  if (!String(model.model || "").trim()) {
    throw new Error("Missing model name");
  }

  const endpoint = `${normalizeBaseUrl(model.baseUrl, "https://api.openai.com/v1")}/chat/completions`;
  const headers = {
    authorization: `Bearer ${String(model.apiKey).trim()}`,
    "content-type": "application/json",
    ...safeParseHeaders(model.headersJson),
  };

  const messages = [];
  if (prompt.systemPrompt) {
    messages.push({ role: "system", content: prompt.systemPrompt });
  }
  messages.push({ role: "user", content: prompt.userPrompt });

  const maxTokens = Number(settings.maxTokens) || 0;
  const temperature = Number(settings.temperature ?? 0);

  const body = {
    model: String(model.model).trim(),
    messages,
    ...(!omitTemperature && { temperature }),
    ...(maxTokens > 0 && { max_completion_tokens: maxTokens }),
  };

  if (model.jsonMode === "native") {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: createAbortSignal(settings.timeoutMs),
  });

  // Read body as text first, then parse — avoids "Body has already been read"
  const rawBody = await response.text();
  let data;
  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new Error(`Invalid provider response: ${rawBody.slice(0, 400)}`);
  }

  if (!response.ok) {
    const errorMessage = data?.error?.message || data?.message || `Provider error (${response.status})`;

    // Retry once without temperature if the API rejects it
    if (!omitTemperature && temperature !== 0 && /temperature/i.test(errorMessage)) {
      return runOpenAiCompatible(model, prompt, settings, { omitTemperature: true });
    }

    // Fall back to legacy /v1/completions for non-chat models (e.g. gpt-5.x-pro)
    if (/not a chat model/i.test(errorMessage)) {
      return runOpenAiCompletions(model, prompt, settings);
    }

    throw new Error(errorMessage);
  }

  const outputText = normalizeTextContent(data?.choices?.[0]?.message?.content);
  const usage = data?.usage || null;

  // Detect reasoning models that consumed all tokens internally
  if (!outputText.trim() && usage?.completion_tokens_details?.reasoning_tokens > 0) {
    throw new Error(
      "Model used all tokens for reasoning with no visible output — try increasing max tokens",
    );
  }

  return { endpoint, outputText, usage };
}

async function runOpenAiCompletions(model, prompt, settings) {
  const endpoint = `${normalizeBaseUrl(model.baseUrl, "https://api.openai.com/v1")}/completions`;
  const headers = {
    authorization: `Bearer ${String(model.apiKey).trim()}`,
    "content-type": "application/json",
    ...safeParseHeaders(model.headersJson),
  };

  // Flatten system + user prompts into a single prompt string
  const parts = [];
  if (prompt.systemPrompt) {
    parts.push(prompt.systemPrompt);
  }
  parts.push(prompt.userPrompt);

  const maxTokens = Number(settings.maxTokens) || 16384;
  const temperature = Number(settings.temperature ?? 0);

  const body = {
    model: String(model.model).trim(),
    prompt: parts.join("\n\n"),
    temperature,
    max_tokens: maxTokens,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: createAbortSignal(settings.timeoutMs),
  });

  const rawBody = await response.text();
  let data;
  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new Error(`Invalid provider response: ${rawBody.slice(0, 400)}`);
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `Provider error (${response.status})`);
  }

  return {
    endpoint,
    outputText: String(data?.choices?.[0]?.text || ""),
    usage: data?.usage || null,
  };
}

async function runAnthropic(model, prompt, settings) {
  if (!String(model.apiKey || "").trim()) {
    throw new Error("Missing API key");
  }

  if (!String(model.model || "").trim()) {
    throw new Error("Missing model name");
  }

  const endpoint = `${normalizeBaseUrl(model.baseUrl, "https://api.anthropic.com/v1")}/messages`;
  const headers = {
    "x-api-key": String(model.apiKey).trim(),
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
    ...safeParseHeaders(model.headersJson),
  };

  const body = {
    model: String(model.model).trim(),
    system: prompt.systemPrompt,
    max_tokens: Number(settings.maxTokens) || 16384,
    temperature: Number(settings.temperature ?? 0),
    messages: [{ role: "user", content: prompt.userPrompt }],
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: createAbortSignal(settings.timeoutMs),
  });

  // Read body as text first, then parse — avoids "Body has already been read"
  const rawBody = await response.text();
  let data;
  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new Error(`Invalid provider response: ${rawBody.slice(0, 400)}`);
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `Provider error (${response.status})`);
  }

  return {
    endpoint,
    outputText: normalizeTextContent(Array.isArray(data?.content) ? data.content : []),
    usage: data?.usage || null,
  };
}

const providerRunners = {
  anthropic: runAnthropic,
  "openai-compatible": runOpenAiCompatible,
};

async function evaluateSingle(promptCase, model, settings) {
  const startedAt = Date.now();
  let schema = null;

  if (promptCase.schemaText && String(promptCase.schemaText).trim()) {
    try {
      schema = JSON.parse(promptCase.schemaText);
    } catch (error) {
      return {
        durationMs: Date.now() - startedAt,
        error: `Invalid schema JSON: ${error.message}`,
        issues: [`Schema error for "${promptCase.name}"`],
        jsonOutline: [],
        modelId: model.id,
        modelName: model.name,
        outputText: "",
        parseOk: false,
        promptId: promptCase.id,
        promptKind: promptCase.kind,
        promptName: promptCase.name,
        provider: model.provider,
        score: 0,
        schemaOk: false,
        usage: null,
      };
    }
  }

  const runner = providerRunners[model.provider];
  if (!runner) {
    return {
      durationMs: Date.now() - startedAt,
      error: `Unsupported provider: ${model.provider}`,
      issues: [`Unsupported provider for "${model.name}"`],
      jsonOutline: [],
      modelId: model.id,
      modelName: model.name,
      outputText: "",
      parseOk: false,
      promptId: promptCase.id,
      promptKind: promptCase.kind,
      promptName: promptCase.name,
      provider: model.provider,
      score: 0,
      schemaOk: false,
      usage: null,
    };
  }

  try {
    const prompt = buildPromptEnvelope(promptCase, schema, settings);
    const providerResponse = await runner(model, prompt, settings);
    const outputText = String(providerResponse.outputText || "");
    const jsonCandidate = extractJsonCandidate(outputText);

    let parsedJson = null;
    let parseError = null;

    if (jsonCandidate) {
      try {
        parsedJson = JSON.parse(jsonCandidate);
      } catch (error) {
        parseError = error.message;
      }
    } else {
      parseError = "No JSON object or array found in response";
    }

    const validation = parsedJson && schema
      ? validateAgainstSchema(schema, parsedJson)
      : { ok: !!parsedJson, issues: parsedJson ? [] : [parseError || "Output is not valid JSON"] };

    const issues = [];
    if (parseError) {
      issues.push(`JSON parse failed: ${parseError}`);
    }
    issues.push(...validation.issues);

    // Compute cost from token usage and model pricing
    let cost = null;
    const usage = providerResponse.usage;
    if (usage && (model.inputPrice || model.outputPrice)) {
      const inputTokens = Number(usage.prompt_tokens ?? usage.input_tokens ?? 0);
      const outputTokens = Number(usage.completion_tokens ?? usage.output_tokens ?? 0);
      cost = (inputTokens * (model.inputPrice || 0) + outputTokens * (model.outputPrice || 0)) / 1_000_000;
    }

    return {
      cost,
      durationMs: Date.now() - startedAt,
      endpoint: providerResponse.endpoint,
      error: null,
      issues,
      jsonCandidate,
      jsonOutline: parsedJson ? collectJsonOutline(parsedJson) : [],
      modelId: model.id,
      modelName: model.name,
      modelSlug: model.model,
      outputText,
      parseOk: !!parsedJson,
      parsedJson,
      promptId: promptCase.id,
      promptKind: promptCase.kind,
      promptName: promptCase.name,
      provider: model.provider,
      score: computeScore({
        outputText,
        parseOk: !!parsedJson,
        issues,
      }),
      schemaOk: validation.ok,
      usage,
    };
  } catch (error) {
    return {
      durationMs: Date.now() - startedAt,
      error: error.message || "Unexpected provider error",
      issues: [error.message || "Unexpected provider error"],
      jsonOutline: [],
      modelId: model.id,
      modelName: model.name,
      modelSlug: model.model,
      outputText: "",
      parseOk: false,
      promptId: promptCase.id,
      promptKind: promptCase.kind,
      promptName: promptCase.name,
      provider: model.provider,
      score: 0,
      schemaOk: false,
      usage: null,
    };
  }
}

async function handleEvaluate(request, response) {
  const payload = await readRequestBody(request);
  const models = Array.isArray(payload.models) ? payload.models : [];
  const promptCases = Array.isArray(payload.promptCases) ? payload.promptCases : [];
  const settings = payload.settings && typeof payload.settings === "object" ? payload.settings : {};

  if (!models.length) {
    sendJson(response, 400, { error: "No models selected" });
    return;
  }

  if (!promptCases.length) {
    sendJson(response, 400, { error: "No prompt cases selected" });
    return;
  }

  const tasks = [];
  for (const promptCase of promptCases) {
    for (const model of models) {
      tasks.push(evaluateSingle(promptCase, model, settings));
    }
  }

  const results = await Promise.all(tasks);
  sendJson(response, 200, {
    generatedAt: new Date().toISOString(),
    models: models.length,
    promptCases: promptCases.length,
    results,
  });
}

async function handleListModels(request, response) {
  const payload = await readRequestBody(request);
  const { type, baseUrl, apiKey, headersJson } = payload;

  if (!type || !baseUrl) {
    sendJson(response, 400, { error: "Missing type or baseUrl" });
    return;
  }

  if (!apiKey) {
    sendJson(response, 400, { error: "Missing apiKey" });
    return;
  }

  const base = normalizeBaseUrl(baseUrl, "");
  const customHeaders = safeParseHeaders(headersJson);

  if (type === "anthropic") {
    const endpoint = `${base}/models?limit=100`;
    const headers = {
      "x-api-key": String(apiKey).trim(),
      "anthropic-version": "2023-06-01",
      ...customHeaders,
    };

    const res = await fetch(endpoint, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || `Provider error (${res.status})`);
    }

    const models = (data.data || []).map((m) => ({
      id: m.id,
      name: m.display_name || m.id,
    }));

    sendJson(response, 200, { models });
    return;
  }

  // openai-compatible
  const endpoint = `${base}/models`;
  const headers = {
    authorization: `Bearer ${String(apiKey).trim()}`,
    ...customHeaders,
  };

  const res = await fetch(endpoint, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(15000),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Provider error (${res.status})`);
  }

  const models = (data.data || []).map((m) => ({
    id: m.id,
    name: m.name || m.id,
  }));

  sendJson(response, 200, { models });
}

async function handleLocalPrompts(_request, response) {
  const filePath = join(__dirname, "data", "prompts.json");
  try {
    const raw = await readFile(filePath, "utf8");
    const prompts = JSON.parse(raw);
    sendJson(response, 200, { prompts: Array.isArray(prompts) ? prompts : [] });
  } catch (error) {
    if (error.code === "ENOENT") {
      sendJson(response, 200, { prompts: [] });
    } else {
      sendJson(response, 500, { error: error.message || "Failed to read local prompts" });
    }
  }
}

async function requestHandler(request, response) {
  const url = new URL(request.url || "/", "http://localhost");

  if (request.method === "GET" && url.pathname === "/api/local-prompts") {
    try {
      await handleLocalPrompts(request, response);
    } catch (error) {
      sendJson(response, 500, {
        error: error.message || "Failed to read local prompts",
      });
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      service: "EvaLLM API",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/evaluate") {
    try {
      await handleEvaluate(request, response);
    } catch (error) {
      sendJson(response, 500, {
        error: error.message || "Unexpected evaluation error",
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/list-models") {
    try {
      await handleListModels(request, response);
    } catch (error) {
      sendJson(response, 500, {
        error: error.message || "Failed to list models",
      });
    }
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

export function startServer({
  host = process.env.HOST || "127.0.0.1",
  port = Number(process.env.PORT || 3031),
} = {}) {
  const server = createServer(requestHandler);
  server.listen(port, host, () => {
    console.log(`EvaLLM API running at http://${host}:${port}`);
  });
  return server;
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).pathname === new URL(import.meta.url).pathname) {
  startServer();
}
