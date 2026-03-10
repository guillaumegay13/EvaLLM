import type { EvaluationResult, GroupedPromptResults } from "./types";

export function durationLabel(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function costLabel(cost: number | null | undefined): string {
  if (cost == null || cost <= 0) return "n/a";
  if (cost < 0.0001) return `$${cost.toExponential(1)}`;
  return `$${cost.toFixed(4)}`;
}

export function scoreClass(score: number) {
  if (score >= 80) return "score high";
  if (score >= 50) return "score mid";
  return "score low";
}

export function usageLabel(usage: Record<string, unknown> | null) {
  if (!usage) {
    return "n/a";
  }

  const promptTokens = (usage.prompt_tokens ?? usage.input_tokens) as number | undefined;
  const completionTokens = (usage.completion_tokens ?? usage.output_tokens) as number | undefined;
  const totalTokens = usage.total_tokens as number | undefined;
  const bits: string[] = [];

  if (promptTokens) bits.push(`in ${promptTokens}`);
  if (completionTokens) bits.push(`out ${completionTokens}`);
  if (totalTokens) bits.push(`total ${totalTokens}`);
  return bits.length ? bits.join(" / ") : "n/a";
}

export function groupResults(results: EvaluationResult[]): GroupedPromptResults[] {
  const byPrompt = new Map<string, GroupedPromptResults>();

  for (const result of results) {
    const existing = byPrompt.get(result.promptId);
    if (existing) {
      existing.results.push(result);
      continue;
    }

    byPrompt.set(result.promptId, {
      id: result.promptId,
      name: result.promptName,
      results: [result],
    });
  }

  return Array.from(byPrompt.values());
}

export function previewText(result: EvaluationResult) {
  if (result.parsedJson) {
    return JSON.stringify(result.parsedJson, null, 2);
  }

  return result.outputText || result.error || "";
}
