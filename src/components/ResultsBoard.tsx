import { For, Show, createMemo } from "solid-js";
import { scoreClass, usageLabel, groupResults, previewText } from "../lib/resultUtils";
import type { BatchResponse, EvaluationResult } from "../lib/types";

interface ResultsBoardProps {
  batch: BatchResponse | null;
}

function ResultCard(props: { result: EvaluationResult }) {
  const result = () => props.result;

  return (
    <article class="surface result-card">
      <div class="row between">
        <div>
          <h4>{result().modelName}</h4>
          <div class="chips">
            <span class={`chip ${result().parseOk ? "ok" : "error"}`}>
              {result().parseOk ? "Valid JSON" : "Invalid JSON"}
            </span>
            <span class={`chip ${result().schemaOk ? "ok" : "warn"}`}>
              {result().schemaOk ? "Schema OK" : "Schema drift"}
            </span>
          </div>
        </div>
        <span class={scoreClass(result().score)}>{result().score}</span>
      </div>

      <div class="chips compact">
        <span class="chip neutral">{result().durationMs} ms</span>
        <span class="chip neutral">{usageLabel(result().usage)}</span>
        <Show when={result().modelSlug}>
          <span class="chip neutral">{result().modelSlug}</span>
        </Show>
      </div>

      <pre class="result-preview">{previewText(result())}</pre>

      <Show when={result().issues.length}>
        <ul class="issues">
          <For each={result().issues}>{(issue) => <li>{issue}</li>}</For>
        </ul>
      </Show>

      <div class="result-details">
        <Show when={result().jsonOutline.length}>
          <details>
            <summary>JSON outline</summary>
            <pre>{result().jsonOutline.join("\n")}</pre>
          </details>
        </Show>
        <details>
          <summary>Raw output</summary>
          <pre>{result().outputText || result().error || ""}</pre>
        </details>
      </div>
    </article>
  );
}

export default function ResultsBoard(props: ResultsBoardProps) {
  const grouped = createMemo(() =>
    props.batch?.results ? groupResults(props.batch.results) : [],
  );

  return (
    <section class="surface section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Results</p>
          <h2>Comparison</h2>
        </div>
      </div>

      <Show
        when={props.batch?.results.length}
        fallback={<div class="empty">Run once and the outputs will appear here.</div>}
      >
        <div class="results-stack">
          <For each={grouped()}>
            {(group) => {
              const sorted = [...group.results].sort((left, right) => right.score - left.score);
              const best = sorted[0];

              return (
                <section class="result-group">
                  <div class="result-group-head">
                    <div>
                      <h3>{group.name}</h3>
                    </div>
                    <Show when={best}>
                      <div class="group-callout">
                        <span class="status-chip live">Best</span>
                        <strong>{best.modelName}</strong>
                        <span class={scoreClass(best.score)}>{best.score}</span>
                      </div>
                    </Show>
                  </div>
                  <div class="result-grid">
                    <For each={sorted}>{(result) => <ResultCard result={result} />}</For>
                  </div>
                </section>
              );
            }}
          </For>
        </div>
      </Show>
    </section>
  );
}
