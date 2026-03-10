import { For, Show } from "solid-js";
import { useAppStore } from "../lib/store";
import InferenceRow from "../components/InferenceRow";

export default function InferencesPage() {
  const store = useAppStore();

  return (
    <>
      <section class="surface section">
        <div class="section-head">
          <div>
            <p class="eyebrow">Results log</p>
            <h2>Inferences</h2>
          </div>
          <Show when={store.batch()}>
            <div class="row">
              <span class="chip neutral">
                {store.batch()!.results.length} result{store.batch()!.results.length !== 1 ? "s" : ""}
              </span>
              <button class="button ghost" type="button" onClick={store.clearResults}>
                Clear
              </button>
            </div>
          </Show>
        </div>

        <Show
          when={store.batch()?.results.length}
          fallback={
            <div class="empty">
              Run from the Overview page and the inference log will appear here.
            </div>
          }
        >
          <div class="table-list">
            <For each={store.batch()!.results}>
              {(result) => <InferenceRow result={result} />}
            </For>
          </div>
        </Show>
      </section>
    </>
  );
}
