export type Provider = "openai-compatible" | "anthropic";
export type JsonMode = "native" | "prompt-only";

export interface EvalSettings {
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  strictJson: boolean;
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: Provider;
  baseUrl: string;
  apiKey: string;
  jsonMode: JsonMode;
  headersJson: string;
}

export interface EvalModel {
  id: string;
  enabled: boolean;
  name: string;
  providerId: string;
  model: string;
}

export interface PromptCase {
  id: string;
  enabled: boolean;
  name: string;
  systemPrompt: string;
  userPrompt: string;
  schemaText: string;
}

export interface ConfigState {
  settings: EvalSettings;
  providers: ProviderConfig[];
  models: EvalModel[];
  promptCases: PromptCase[];
}

/** Flat model shape sent to the server (hydrated from provider + model). */
export interface HydratedModel {
  id: string;
  name: string;
  provider: Provider;
  model: string;
  baseUrl: string;
  apiKey: string;
  jsonMode: JsonMode;
  headersJson: string;
}

export interface EvaluationResult {
  durationMs: number;
  endpoint?: string;
  error: string | null;
  issues: string[];
  jsonCandidate?: string | null;
  jsonOutline: string[];
  modelId: string;
  modelName: string;
  modelSlug?: string;
  outputText: string;
  parseOk: boolean;
  parsedJson?: unknown;
  promptId: string;
  promptName: string;
  provider: Provider;
  score: number;
  schemaOk: boolean;
  usage: Record<string, unknown> | null;
}

export interface BatchResponse {
  generatedAt: string;
  models: number;
  promptCases: number;
  results: EvaluationResult[];
}

export interface GroupedPromptResults {
  id: string;
  name: string;
  results: EvaluationResult[];
}

export type StatusTone = "neutral" | "success" | "warning" | "danger";

export interface AppStore {
  config: ConfigState;
  batch: () => BatchResponse | null;
  isRunning: () => boolean;
  status: () => string;
  statusTone: () => StatusTone;
  enabledModels: () => EvalModel[];
  enabledPromptCases: () => PromptCase[];

  setConfig: (...args: unknown[]) => void;
  updatePrompt: <K extends keyof PromptCase>(id: string, field: K, value: PromptCase[K]) => void;
  updateModel: <K extends keyof EvalModel>(id: string, field: K, value: EvalModel[K]) => void;
  updateProvider: <K extends keyof ProviderConfig>(id: string, field: K, value: ProviderConfig[K]) => void;
  addPromptCase: () => void;
  addModel: (providerId: string) => void;
  addProvider: (data?: Omit<ProviderConfig, "id">) => void;
  removeProvider: (id: string) => void;
  duplicatePrompt: (id: string) => void;
  removePrompt: (id: string) => void;
  removeModel: (id: string) => void;
  resetStarterKit: () => void;
  clearResults: () => void;
  importConfigFromFile: (file: File) => void;
  exportConfig: () => void;
  exportResults: () => void;
  runBatch: () => Promise<void>;
  loadLocalPrompts: () => Promise<void>;
  fetchProviderModels: (providerId: string) => Promise<{ id: string; name: string }[]>;
  getProvider: (id: string) => ProviderConfig | undefined;
  modelsForProvider: (providerId: string) => EvalModel[];
}
