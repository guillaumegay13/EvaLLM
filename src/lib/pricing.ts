/** Known model pricing: cost per 1M tokens (USD). */
interface ModelPricing {
  input: number;
  output: number;
}

const PRICING_TABLE: Record<string, ModelPricing> = {
  // OpenAI
  "gpt-4.1":              { input: 2.00,   output: 8.00 },
  "gpt-4.1-mini":         { input: 0.40,   output: 1.60 },
  "gpt-4.1-nano":         { input: 0.10,   output: 0.40 },
  "gpt-4o":               { input: 2.50,   output: 10.00 },
  "gpt-4o-mini":          { input: 0.15,   output: 0.60 },
  "o1":                   { input: 15.00,  output: 60.00 },
  "o1-mini":              { input: 1.10,   output: 4.40 },
  "o3":                   { input: 2.00,   output: 8.00 },
  "o3-mini":              { input: 1.10,   output: 4.40 },
  "o4-mini":              { input: 1.10,   output: 4.40 },

  // Anthropic
  "claude-opus-4-6":            { input: 5.00,  output: 25.00 },
  "claude-opus-4-5":            { input: 5.00,  output: 25.00 },
  "claude-sonnet-4-6":          { input: 3.00,  output: 15.00 },
  "claude-sonnet-4-5":          { input: 3.00,  output: 15.00 },
  "claude-sonnet-4-0":          { input: 3.00,  output: 15.00 },
  "claude-opus-4-0":            { input: 15.00, output: 75.00 },
  "claude-haiku-4-5":           { input: 1.00,  output: 5.00 },
  "claude-3-5-haiku":           { input: 0.80,  output: 4.00 },
  "claude-3-haiku":             { input: 0.25,  output: 1.25 },

  // Google Gemini
  "gemini-2.5-pro":      { input: 1.25,  output: 10.00 },
  "gemini-2.5-flash":    { input: 0.30,  output: 2.50 },
  "gemini-2.5-flash-lite": { input: 0.10, output: 0.40 },
  "gemini-2.0-flash":    { input: 0.10,  output: 0.40 },
  "gemini-2.0-flash-lite": { input: 0.075, output: 0.30 },

  // DeepSeek
  "deepseek-chat":       { input: 0.28,  output: 0.42 },
  "deepseek-reasoner":   { input: 0.28,  output: 0.42 },

  // Mistral
  "mistral-large-latest":  { input: 0.50,  output: 1.50 },
  "mistral-medium-latest": { input: 0.40,  output: 2.00 },
  "mistral-small-latest":  { input: 0.10,  output: 0.30 },
  "codestral-latest":      { input: 0.30,  output: 0.90 },
  "pixtral-large-latest":  { input: 2.00,  output: 6.00 },
  "ministral-8b-latest":   { input: 0.10,  output: 0.10 },

  // xAI (Grok)
  "grok-3":       { input: 3.00,  output: 15.00 },
  "grok-3-mini":  { input: 0.25,  output: 0.50 },
  "grok-3-fast":  { input: 5.00,  output: 25.00 },

  // Meta Llama (OpenRouter)
  "meta-llama/llama-4-maverick": { input: 0.15, output: 0.60 },
  "meta-llama/llama-4-scout":    { input: 0.08, output: 0.30 },

  // Qwen (OpenRouter)
  "qwen/qwen3-235b-a22b": { input: 0.46, output: 1.82 },
  "qwen/qwen3-32b":       { input: 0.15, output: 0.75 },
};

// OpenRouter prefixed aliases — same pricing as the base model
const OPENROUTER_PREFIXES: Record<string, string> = {
  "openai/": "",
  "anthropic/": "",
  "google/": "",
  "deepseek/": "",
  "mistralai/": "",
  "x-ai/": "",
};

/**
 * Look up pricing for a model slug. Tries exact match first, then strips
 * OpenRouter prefixes, then does prefix matching (handles dated suffixes
 * like "claude-sonnet-4-20250514" → matches "claude-sonnet-4-").
 */
export function lookupPricing(slug: string): ModelPricing | null {
  if (!slug) return null;
  const s = slug.trim().toLowerCase();

  // Exact match
  if (PRICING_TABLE[s]) return PRICING_TABLE[s];

  // Try stripping OpenRouter prefix
  for (const prefix of Object.keys(OPENROUTER_PREFIXES)) {
    if (s.startsWith(prefix)) {
      const bare = s.slice(prefix.length);
      if (PRICING_TABLE[bare]) return PRICING_TABLE[bare];
    }
  }

  // Prefix match: find the longest key that is a prefix of the slug
  // This handles dated suffixes like "claude-sonnet-4-6-20250514"
  let bestMatch: string | null = null;
  for (const key of Object.keys(PRICING_TABLE)) {
    if (s.startsWith(key) && (!bestMatch || key.length > bestMatch.length)) {
      bestMatch = key;
    }
  }
  if (bestMatch) return PRICING_TABLE[bestMatch];

  return null;
}
