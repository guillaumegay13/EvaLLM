import { createDefaultConfig } from "./defaults";
import type { BatchResponse, ConfigState, EvalModel, ProviderConfig } from "./types";

export const STORAGE_KEY = "evallm-config-v1";
export const BATCH_STORAGE_KEY = "evallm-batch-v1";

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Old flat model shape (pre-migration). */
interface LegacyModel {
  id: string;
  enabled: boolean;
  name: string;
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  jsonMode: string;
  headersJson: string;
}

function isLegacyModel(m: unknown): m is LegacyModel {
  return !!m && typeof m === "object" && "apiKey" in m && "baseUrl" in m && "provider" in m;
}

function migrateLegacyConfig(parsed: Record<string, unknown>): ConfigState {
  const defaults = createDefaultConfig();
  const oldModels = (parsed.models ?? []) as LegacyModel[];

  // Group old models by (provider, baseUrl, apiKey, headersJson) to create providers
  const providerMap = new Map<string, ProviderConfig>();
  const newModels: EvalModel[] = [];

  for (const m of oldModels) {
    const key = `${m.provider}|${m.baseUrl}|${m.apiKey}`;
    let prov = providerMap.get(key);
    if (!prov) {
      // Derive a provider name from the baseUrl or provider type
      let name = m.provider === "anthropic" ? "Anthropic" : "OpenAI";
      if (m.baseUrl.includes("openrouter")) name = "OpenRouter";
      else if (!m.baseUrl.includes("openai.com") && !m.baseUrl.includes("anthropic.com")) {
        // Custom endpoint, use domain as name
        try {
          name = new URL(m.baseUrl).hostname;
        } catch { /* keep default */ }
      }

      // Deduplicate names
      const existingNames = [...providerMap.values()].map((p) => p.name);
      let finalName = name;
      let counter = 2;
      while (existingNames.includes(finalName)) {
        finalName = `${name} ${counter}`;
        counter++;
      }

      prov = {
        id: crypto.randomUUID(),
        name: finalName,
        type: m.provider as ProviderConfig["type"],
        baseUrl: m.baseUrl,
        apiKey: m.apiKey,
        jsonMode: (m.jsonMode || "native") as ProviderConfig["jsonMode"],
        headersJson: m.headersJson || "",
      };
      providerMap.set(key, prov);
    }

    newModels.push({
      id: m.id,
      enabled: m.enabled,
      name: m.name,
      providerId: prov.id,
      model: m.model,
    });
  }

  return {
    settings: {
      ...defaults.settings,
      ...((parsed.settings as Record<string, unknown>) || {}),
    },
    providers: providerMap.size > 0 ? [...providerMap.values()] : defaults.providers,
    models: newModels.length > 0 ? newModels : defaults.models,
    promptCases:
      Array.isArray(parsed.promptCases) && parsed.promptCases.length
        ? parsed.promptCases
        : defaults.promptCases,
  };
}

export function normalizeConfig(input: unknown): ConfigState {
  const defaults = createDefaultConfig();
  const parsed = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  // Detect legacy format: models have apiKey field
  const models = parsed.models;
  if (Array.isArray(models) && models.length > 0 && isLegacyModel(models[0])) {
    return migrateLegacyConfig(parsed);
  }

  return {
    settings: {
      ...defaults.settings,
      ...((parsed.settings as Record<string, unknown>) || {}),
    },
    providers:
      Array.isArray(parsed.providers) && parsed.providers.length
        ? parsed.providers
        : defaults.providers,
    models:
      Array.isArray(parsed.models) && parsed.models.length ? parsed.models : defaults.models,
    promptCases:
      Array.isArray(parsed.promptCases) && parsed.promptCases.length
        ? parsed.promptCases
        : defaults.promptCases,
  };
}

export function loadConfig(): ConfigState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultConfig();
    }

    return normalizeConfig(JSON.parse(raw));
  } catch {
    return createDefaultConfig();
  }
}

export function saveConfig(config: ConfigState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function cloneConfig(config: ConfigState): ConfigState {
  return deepClone(config);
}

export function loadBatch(): BatchResponse | null {
  try {
    const raw = window.localStorage.getItem(BATCH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BatchResponse;
  } catch {
    return null;
  }
}

export function saveBatch(batch: BatchResponse | null) {
  if (batch) {
    window.localStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(batch));
  } else {
    window.localStorage.removeItem(BATCH_STORAGE_KEY);
  }
}
