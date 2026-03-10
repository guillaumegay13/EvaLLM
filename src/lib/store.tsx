import { createContext, useContext } from "solid-js";
import { createEffect, createMemo, createSignal } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import type { ParentProps } from "solid-js";
import { createDefaultConfig } from "./defaults";
import { cloneConfig, loadBatch, loadConfig, normalizeConfig, saveBatch, saveConfig } from "./storage";
import type {
  AppStore,
  BatchResponse,
  ConfigState,
  EvalModel,
  HydratedModel,
  JsonMode,
  Provider,
  PromptCase,
  ProviderConfig,
  StatusTone,
} from "./types";

/** Infer provider type and JSON mode from a base URL. */
function inferProviderType(baseUrl: string): { type: Provider; jsonMode: JsonMode } {
  if (/anthropic\.com/i.test(baseUrl)) {
    return { type: "anthropic", jsonMode: "prompt-only" };
  }
  return { type: "openai-compatible", jsonMode: "native" };
}

function createId() {
  return crypto.randomUUID();
}

function exportJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const StoreContext = createContext<AppStore>();

export function useAppStore(): AppStore {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}

export function AppStoreProvider(props: ParentProps) {
  const [config, setConfig] = createStore<ConfigState>(loadConfig());
  const [batch, setBatch] = createSignal<BatchResponse | null>(loadBatch());
  const [isRunning, setIsRunning] = createSignal(false);
  const [status, setStatus] = createSignal("Ready");
  const [statusTone, setStatusTone] = createSignal<StatusTone>("neutral");

  createEffect(() => {
    saveConfig(JSON.parse(JSON.stringify(config)) as ConfigState);
  });

  createEffect(() => {
    saveBatch(batch());
  });

  const enabledModels = createMemo(() => config.models.filter((m) => m.enabled));
  const enabledPromptCases = createMemo(() => config.promptCases.filter((p) => p.enabled));

  const promptCountLabel = createMemo(
    () => `${enabledPromptCases().length} prompts \u00d7 ${enabledModels().length} models ready`,
  );

  createEffect(() => {
    if (!isRunning() && statusTone() === "neutral") {
      setStatus(promptCountLabel());
    }
  });

  const setStatusState = (msg: string, tone: StatusTone = "neutral") => {
    setStatus(msg);
    setStatusTone(tone);
  };

  const getProvider = (id: string) => config.providers.find((p) => p.id === id);

  const modelsForProvider = (providerId: string) =>
    config.models.filter((m) => m.providerId === providerId);

  const updatePrompt = <K extends keyof PromptCase>(id: string, field: K, value: PromptCase[K]) => {
    const index = config.promptCases.findIndex((p) => p.id === id);
    if (index >= 0) setConfig("promptCases", index, field, value);
  };

  const updateModel = <K extends keyof EvalModel>(id: string, field: K, value: EvalModel[K]) => {
    const index = config.models.findIndex((m) => m.id === id);
    if (index >= 0) setConfig("models", index, field, value);
  };

  const updateProvider = <K extends keyof ProviderConfig>(
    id: string,
    field: K,
    value: ProviderConfig[K],
  ) => {
    const index = config.providers.findIndex((p) => p.id === id);
    if (index < 0) return;
    setConfig("providers", index, field, value);
    if (field === "baseUrl") {
      const inferred = inferProviderType(value as string);
      setConfig("providers", index, "type", inferred.type);
    }
  };

  const addPromptCase = () => {
    setConfig("promptCases", (items) => [
      {
        id: createId(),
        enabled: true,
        name: "New Prompt",
        systemPrompt: "You are a precise assistant that returns structured JSON.",
        userPrompt: "Create a JSON response for this case.",
        schemaText: JSON.stringify(
          { type: "object", required: ["title"], properties: { title: { type: "string" } } },
          null,
          2,
        ),
      },
      ...items,
    ]);
  };

  const addModel = (providerId: string) => {
    setConfig("models", (items) => [
      ...items,
      {
        id: createId(),
        enabled: true,
        name: "New Model",
        providerId,
        model: "",
      },
    ]);
  };

  const addProvider = (data?: Omit<ProviderConfig, "id">) => {
    setConfig("providers", (items) => [
      ...items,
      {
        id: createId(),
        name: data?.name ?? "New Provider",
        type: data?.type ?? ("openai-compatible" as const),
        baseUrl: data?.baseUrl ?? "https://api.openai.com/v1",
        apiKey: data?.apiKey ?? "",
        jsonMode: data?.jsonMode ?? ("native" as const),
        headersJson: data?.headersJson ?? "",
      },
    ]);
  };

  const removeProvider = (providerId: string) => {
    // Remove provider and all its models
    setConfig("models", config.models.filter((m) => m.providerId !== providerId));
    setConfig("providers", config.providers.filter((p) => p.id !== providerId));
  };

  const duplicatePrompt = (promptId: string) => {
    const index = config.promptCases.findIndex((p) => p.id === promptId);
    if (index < 0) return;
    const copy = cloneConfig({
      settings: config.settings,
      providers: [],
      models: [],
      promptCases: [config.promptCases[index]],
    }).promptCases[0];
    copy.id = createId();
    copy.name = `${copy.name} Copy`;
    setConfig("promptCases", (items) => {
      const next = [...items];
      next.splice(index, 0, copy);
      return next;
    });
  };

  const removePrompt = (promptId: string) => {
    setConfig("promptCases", config.promptCases.filter((p) => p.id !== promptId));
  };

  const removeModel = (modelId: string) => {
    setConfig("models", config.models.filter((m) => m.id !== modelId));
  };

  const resetStarterKit = () => {
    setConfig(reconcile(createDefaultConfig()));
    setBatch(null);
    setStatusState("Starter kit restored", "success");
  };

  const clearResults = () => {
    setBatch(null);
    setStatusState("Results cleared");
  };

  const importConfigFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = normalizeConfig(JSON.parse(String(reader.result)));
        setConfig(reconcile(parsed));
        setBatch(null);
        setStatusState("Config imported", "success");
      } catch (error) {
        setStatusState(
          `Import failed: ${error instanceof Error ? error.message : "unknown error"}`,
          "danger",
        );
      }
    };
    reader.readAsText(file);
  };

  const exportConfig = () => {
    exportJson("evallm-config.json", JSON.parse(JSON.stringify(config)));
  };

  const exportResults = () => {
    if (batch()) {
      exportJson("evallm-results.json", batch());
    } else {
      setStatusState("No results to export", "warning");
    }
  };

  /** Hydrate a model with its provider's connection details for the server. */
  function hydrateModel(model: EvalModel): HydratedModel | null {
    const provider = getProvider(model.providerId);
    if (!provider) return null;
    return {
      id: model.id,
      name: model.name,
      provider: provider.type,
      model: model.model,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      jsonMode: provider.jsonMode,
      headersJson: provider.headersJson,
    };
  }

  const runBatch = async () => {
    if (!enabledModels().length) {
      setStatusState("Enable at least one model", "warning");
      return;
    }
    if (!enabledPromptCases().length) {
      setStatusState("Enable at least one prompt case", "warning");
      return;
    }

    const hydrated = enabledModels()
      .map(hydrateModel)
      .filter((m): m is HydratedModel => m !== null);

    if (!hydrated.length) {
      setStatusState("No models could be resolved to a provider", "warning");
      return;
    }

    setIsRunning(true);
    setStatusState("Running...", "warning");

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          models: hydrated,
          promptCases: enabledPromptCases(),
          settings: config.settings,
        }),
      });

      const payload = (await response.json()) as BatchResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Evaluation failed");

      setBatch(payload);
      setStatusState(
        `Finished ${enabledPromptCases().length} prompts \u00d7 ${enabledModels().length} models`,
        "success",
      );
    } catch (error) {
      setStatusState(
        error instanceof Error ? error.message : "Unexpected evaluation error",
        "danger",
      );
    } finally {
      setIsRunning(false);
    }
  };

  const loadLocalPrompts = async () => {
    try {
      const response = await fetch("/api/local-prompts");
      const payload = (await response.json()) as { prompts?: PromptCase[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to load local prompts");
      const prompts = payload.prompts || [];
      if (!prompts.length) {
        setStatusState("No local prompts found in data/prompts.json", "warning");
        return;
      }
      // Assign fresh IDs to avoid collisions with existing prompts
      const withFreshIds = prompts.map((p) => ({ ...p, id: createId() }));
      setConfig("promptCases", (items) => [...items, ...withFreshIds]);
      setStatusState(`Loaded ${withFreshIds.length} local prompt(s)`, "success");
    } catch (error) {
      setStatusState(
        error instanceof Error ? error.message : "Failed to load local prompts",
        "danger",
      );
    }
  };

  const fetchProviderModels = async (providerId: string): Promise<{ id: string; name: string }[]> => {
    const provider = getProvider(providerId);
    if (!provider) throw new Error("Provider not found");

    const response = await fetch("/api/list-models", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: provider.type,
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        headersJson: provider.headersJson,
      }),
    });

    const payload = (await response.json()) as { models?: { id: string; name: string }[]; error?: string };
    if (!response.ok) throw new Error(payload.error || "Failed to fetch models");
    return payload.models || [];
  };

  const store: AppStore = {
    config,
    batch,
    isRunning,
    status,
    statusTone,
    enabledModels,
    enabledPromptCases,
    setConfig: setConfig as AppStore["setConfig"],
    updatePrompt,
    updateModel,
    updateProvider,
    addPromptCase,
    addModel,
    addProvider,
    removeProvider,
    duplicatePrompt,
    removePrompt,
    removeModel,
    resetStarterKit,
    clearResults,
    importConfigFromFile,
    exportConfig,
    exportResults,
    runBatch,
    loadLocalPrompts,
    fetchProviderModels,
    getProvider,
    modelsForProvider,
  };

  return (
    <StoreContext.Provider value={store}>
      {props.children}
    </StoreContext.Provider>
  );
}
