import { createSignal, For, Show } from "solid-js";
import { scoreClass, usageLabel, previewText, durationLabel, costLabel } from "../lib/resultUtils";
import type { EvaluationResult } from "../lib/types";

interface InferenceRowProps {
  result: EvaluationResult;
}

export default function InferenceRow(props: InferenceRowProps) {
  const [expanded, setExpanded] = createSignal(false);
  const r = () => props.result;

  return (
    <div class="inference-row">
      <div class="inference-row-summary" onClick={() => setExpanded(!expanded())}>
        <div class="inference-row-primary">
          <h4>{r().modelName}</h4>
          <p class="muted">{r().promptName}</p>
        </div>
        <div class="chips">
          <span class={`chip ${r().parseOk ? "ok" : "error"}`}>
            {r().parseOk ? "JSON" : "Fail"}
          </span>
          <span class={`chip ${r().schemaOk ? "ok" : "warn"}`}>
            {r().schemaOk ? "Schema" : "Drift"}
          </span>
        </div>
        <span class="chip neutral">{durationLabel(r().durationMs)}</span>
        <Show when={r().cost != null && r().cost! > 0}>
          <span class="chip neutral">{costLabel(r().cost)}</span>
        </Show>
        <span class={scoreClass(r().score)}>{r().score}</span>
      </div>

      <Show when={expanded()}>
        <div class="inference-row-body">
          <div class="chips compact">
            <span class="chip neutral">{usageLabel(r().usage)}</span>
            <Show when={r().modelSlug}>
              <span class="chip neutral">{r().modelSlug}</span>
            </Show>
          </div>

          <pre class="result-preview">{previewText(r())}</pre>

          <Show when={r().issues.length}>
            <ul class="issues">
              <For each={r().issues}>{(issue) => <li>{issue}</li>}</For>
            </ul>
          </Show>

          <div class="result-details">
            <Show when={r().jsonOutline.length}>
              <details>
                <summary>JSON outline</summary>
                <pre>{r().jsonOutline.join("\n")}</pre>
              </details>
            </Show>
            <details>
              <summary>Raw output</summary>
              <pre>{r().outputText || r().error || ""}</pre>
            </details>
          </div>
        </div>
      </Show>
    </div>
  );
}
