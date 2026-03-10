import { For, Show, createMemo } from "solid-js";
import { useAppStore } from "../lib/store";
import MetricCard from "../components/MetricCard";
import { groupResults, scoreClass } from "../lib/resultUtils";

export default function OverviewPage() {
  const store = useAppStore();

  const avgScore = createMemo(() => {
    const results = store.batch()?.results;
    if (!results?.length) return null;
    const sum = results.reduce((acc, r) => acc + r.score, 0);
    return Math.round(sum / results.length);
  });

  const totalTokens = createMemo(() => {
    const results = store.batch()?.results;
    if (!results?.length) return null;
    let total = 0;
    for (const r of results) {
      if (r.usage) {
        total += ((r.usage.total_tokens ?? 0) as number);
      }
    }
    return total || null;
  });

  const grouped = createMemo(() => {
    const results = store.batch()?.results;
    return results?.length ? groupResults(results) : [];
  });

  return (
    <>
      <section class="surface section">
        <div class="section-head">
          <div>
            <p class="eyebrow">Dashboard</p>
            <h2>Overview</h2>
            <p class="muted">Run prompts across models and compare the JSON output.</p>
          </div>
          <div class="row">
            <button
              class="button primary"
              type="button"
              disabled={store.isRunning()}
              onClick={store.runBatch}
            >
              {store.isRunning() ? "Running..." : "Run comparison"}
            </button>
            <button class="button ghost" type="button" onClick={store.clearResults}>
              Clear
            </button>
          </div>
        </div>

        <div class="metrics-grid">
          <MetricCard label="Prompts" value={store.enabledPromptCases().length} />
          <MetricCard label="Models" value={store.enabledModels().length} />
          <Show when={avgScore() !== null}>
            <MetricCard label="Avg score" value={avgScore()!} />
          </Show>
          <Show when={totalTokens()}>
            <MetricCard label="Total tokens" value={totalTokens()!} />
          </Show>
          <Show when={store.batch()}>
            <MetricCard label="Results" value={store.batch()!.results.length} />
          </Show>
        </div>
      </section>

      <section class="surface section">
        <div class="section-head">
          <div>
            <p class="eyebrow">Active set</p>
            <h2>Run configuration</h2>
          </div>
        </div>

        <div class="summary-stack">
          <div class="summary-strip">
            <span class="strip-label">Prompt set</span>
            <div class="chips flat">
              <For each={store.enabledPromptCases()}>
                {(p) => <span class="chip neutral">{p.name}</span>}
              </For>
              <Show when={!store.enabledPromptCases().length}>
                <span class="chip neutral">No prompt enabled</span>
              </Show>
            </div>
          </div>
          <div class="summary-strip">
            <span class="strip-label">Model set</span>
            <div class="chips flat">
              <For each={store.enabledModels()}>
                {(m) => {
                  const prov = () => store.getProvider(m.providerId);
                  return (
                    <span class="chip neutral">
                      {m.name}
                      {prov() ? ` (${prov()!.name})` : ""}
                    </span>
                  );
                }}
              </For>
              <Show when={!store.enabledModels().length}>
                <span class="chip neutral">No model enabled</span>
              </Show>
            </div>
          </div>
        </div>
      </section>

      <Show when={grouped().length}>
        <section class="surface section">
          <div class="section-head">
            <div>
              <p class="eyebrow">Last run</p>
              <h2>Summary</h2>
            </div>
          </div>

          <div class="table-list">
            <For each={grouped()}>
              {(group) => {
                const sorted = [...group.results].sort((a, b) => b.score - a.score);
                const best = sorted[0];
                return (
                  <div class="table-row">
                    <div class="table-row-summary">
                      <div class="table-row-info">
                        <h4>{group.name}</h4>
                      </div>
                      <div class="table-row-meta">
                        <Show when={best}>
                          <span class="status-chip live">Best: {best.modelName}</span>
                          <span class={scoreClass(best.score)}>{best.score}</span>
                        </Show>
                      </div>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </section>
      </Show>
    </>
  );
}
