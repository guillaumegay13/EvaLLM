import type { ConfigState, EvalModel, PromptCase, ProviderConfig } from "./types";

function createId() {
  return crypto.randomUUID();
}

// Stable IDs for default providers so models can reference them.
const DEFAULT_OPENAI_PROVIDER_ID = "default-openai";
const DEFAULT_ANTHROPIC_PROVIDER_ID = "default-anthropic";
const DEFAULT_OPENROUTER_PROVIDER_ID = "default-openrouter";

export const sessionSchema = {
  type: "object",
  required: ["sessionName", "description", "durationMin", "exercises"],
  properties: {
    sessionName: { type: "string", minLength: 3 },
    description: { type: "string", minLength: 12 },
    durationMin: { type: "number" },
    focus: { type: "string" },
    exercises: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        required: ["name", "sets", "reps"],
        properties: {
          name: { type: "string", minLength: 2 },
          sets: { type: "string", minLength: 1 },
          reps: { type: "string", minLength: 1 },
          restSeconds: { type: "number" },
          notes: { type: "string" },
        },
      },
    },
  },
};

export const mealSchema = {
  type: "object",
  required: ["dayName", "targetCalories", "meals"],
  properties: {
    dayName: { type: "string", minLength: 3 },
    targetCalories: { type: "number" },
    macros: {
      type: "object",
      required: ["protein", "carbs", "fat"],
      properties: {
        protein: { type: "number" },
        carbs: { type: "number" },
        fat: { type: "number" },
      },
    },
    meals: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        required: ["name", "time", "items"],
        properties: {
          name: { type: "string", minLength: 2 },
          time: { type: "string", minLength: 2 },
          calories: { type: "number" },
          items: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["food", "quantity"],
              properties: {
                food: { type: "string", minLength: 2 },
                quantity: { type: "string", minLength: 1 },
                protein: { type: "number" },
                carbs: { type: "number" },
                fat: { type: "number" },
              },
            },
          },
        },
      },
    },
  },
};

export function createDefaultPromptCases(): PromptCase[] {
  return [
    {
      id: createId(),
      enabled: true,
      name: "Beginner Full-Body Session",
      systemPrompt:
        "You are a senior strength coach writing practical gym sessions for the MyTrainer app.",
      userPrompt:
        "Client: John, 25, beginner, full gym access, goal is muscle and strength, 45 minutes. Create a detailed onboarding full-body session with a warm-up, 4 to 5 exercises, tempos, rest times, coaching notes, and an easy progression rule for next week.",
      schemaText: JSON.stringify(sessionSchema, null, 2),
    },
    {
      id: createId(),
      enabled: true,
      name: "Basketball Performance Session",
      systemPrompt:
        "You are a performance coach specializing in basketball strength and athletic development.",
      userPrompt:
        "Client: intermediate female basketball player, 60-minute gym session, wants better first-step explosiveness and resilient knees. Build one lower-body performance session with power work, strength work, unilateral work, and short coaching cues.",
      schemaText: JSON.stringify(sessionSchema, null, 2),
    },
    {
      id: createId(),
      enabled: true,
      name: "Muscle Gain Meal Day",
      systemPrompt:
        "You are a sports nutrition coach who writes realistic meal plans athletes will actually follow.",
      userPrompt:
        "Create one full day of meals for a 75 kg male beginner trying to gain muscle slowly. He trains after work, eats four times per day, tolerates dairy, and wants simple grocery-store foods.",
      schemaText: JSON.stringify(mealSchema, null, 2),
    },
    {
      id: createId(),
      enabled: false,
      name: "Fat Loss Vegetarian Meal Day",
      systemPrompt:
        "You are a nutrition coach optimizing for adherence, satiety, and protein quality.",
      userPrompt:
        "Create one vegetarian fat-loss day for a 31-year-old woman with a desk job, 3 meals plus 1 snack, around 1800 calories, high protein, and fast prep.",
      schemaText: JSON.stringify(mealSchema, null, 2),
    },
  ];
}

export function createDefaultProviders(): ProviderConfig[] {
  return [
    {
      id: DEFAULT_OPENAI_PROVIDER_ID,
      name: "OpenAI",
      type: "openai-compatible",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "",
      jsonMode: "native",
      headersJson: "",
    },
    {
      id: DEFAULT_ANTHROPIC_PROVIDER_ID,
      name: "Anthropic",
      type: "anthropic",
      baseUrl: "https://api.anthropic.com/v1",
      apiKey: "",
      jsonMode: "prompt-only",
      headersJson: "",
    },
    {
      id: DEFAULT_OPENROUTER_PROVIDER_ID,
      name: "OpenRouter",
      type: "openai-compatible",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "",
      jsonMode: "native",
      headersJson: JSON.stringify(
        {
          "HTTP-Referer": "http://127.0.0.1:3030",
          "X-Title": "EvaLLM",
        },
        null,
        2,
      ),
    },
  ];
}

export function createDefaultModels(): EvalModel[] {
  return [
    {
      id: createId(),
      enabled: true,
      name: "GPT-4.1",
      providerId: DEFAULT_OPENAI_PROVIDER_ID,
      model: "gpt-4.1",
    },
    {
      id: createId(),
      enabled: false,
      name: "Claude Sonnet",
      providerId: DEFAULT_ANTHROPIC_PROVIDER_ID,
      model: "claude-sonnet-4-20250514",
    },
    {
      id: createId(),
      enabled: false,
      name: "OpenRouter Slot",
      providerId: DEFAULT_OPENROUTER_PROVIDER_ID,
      model: "openai/gpt-4.1-mini",
    },
  ];
}

export function createDefaultConfig(): ConfigState {
  return {
    settings: {
      temperature: 0,
      maxTokens: 0,
      timeoutMs: 120000,
      strictJson: true,
    },
    providers: createDefaultProviders(),
    models: createDefaultModels(),
    promptCases: createDefaultPromptCases(),
  };
}
