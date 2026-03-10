import { createSignal, For, Show } from "solid-js";
import { useAppStore } from "../lib/store";
import type { JsonMode, ProviderConfig } from "../lib/types";
import { lookupPricing } from "../lib/pricing";
import AddModelModal from "./AddModelModal";

interface ProviderRowProps {
  provider: ProviderConfig;
}

export default function ProviderRow(props: ProviderRowProps) {
  const store = useAppStore();
  const [editing, setEditing] = createSignal(false);
  const [fetching, setFetching] = createSignal(false);
  const [fetchError, setFetchError] = createSignal<string | null>(null);
  const [fetchedModels, setFetchedModels] = createSignal<{ id: string; name: string }[]>([]);
  const [showAddModel, setShowAddModel] = createSignal(false);

  const models = () => store.modelsForProvider(props.provider.id);

  const existingModelSlugs = () => new Set(models().map((m) => m.model));

  const handleFetch = async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const result = await store.fetchProviderModels(props.provider.id);
      setFetchedModels(result);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to fetch models");
    } finally {
      setFetching(false);
    }
  };

  const autoFillPricing = (modelInternalId: string, slug: string) => {
    const pricing = lookupPricing(slug);
    if (pricing) {
      store.updateModel(modelInternalId, "inputPrice", pricing.input);
      store.updateModel(modelInternalId, "outputPrice", pricing.output);
    }
  };

  const toggleFetchedModel = (modelId: string, modelName: string) => {
    const existing = models().find((m) => m.model === modelId);
    if (existing) {
      store.updateModel(existing.id, "enabled", !existing.enabled);
    } else {
      store.addModel(props.provider.id);
      const allModels = store.modelsForProvider(props.provider.id);
      const newest = allModels[allModels.length - 1];
      if (newest) {
        store.updateModel(newest.id, "model", modelId);
        store.updateModel(newest.id, "name", modelName);
        autoFillPricing(newest.id, modelId);
      }
    }
  };

  const handleAddManual = (slug: string, displayName: string) => {
    store.addModel(props.provider.id);
    const allModels = store.modelsForProvider(props.provider.id);
    const newest = allModels[allModels.length - 1];
    if (newest) {
      store.updateModel(newest.id, "model", slug);
      store.updateModel(newest.id, "name", displayName);
      autoFillPricing(newest.id, slug);
    }
  };

  return (
    <div class="table-row">
      <div class="table-row-summary" onClick={() => setEditing(!editing())}>
        <div class="table-row-info">
          <h4>{props.provider.name || "Untitled provider"}</h4>
        </div>
        <div class="table-row-meta">
          <span class="chip neutral">{props.provider.type}</span>
          <span class="chip neutral">
            {models().filter((m) => m.enabled).length}/{models().length} models
          </span>
          <span class="status-chip muted" style={{ cursor: "pointer" }}>
            {editing() ? "close" : "edit"}
          </span>
        </div>
      </div>

      {/* Model chips (always visible) */}
      <div style={{ padding: "0 16px 12px" }}>
        <div class="chips flat">
          <For each={models()}>
            {(model) => {
              const priceHint = () => {
                if (model.inputPrice || model.outputPrice) {
                  return `$${model.inputPrice ?? 0}/$${model.outputPrice ?? 0}`;
                }
                return null;
              };
              return (
                <span
                  class={`chip ${model.enabled ? "ok" : "neutral"}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => store.updateModel(model.id, "enabled", !model.enabled)}
                  title={`${model.model} — in $${model.inputPrice ?? "?"}/out $${model.outputPrice ?? "?"} per 1M tok`}
                >
                  {model.name || model.model || "unnamed"}
                  <Show when={priceHint()}>
                    <span style={{ "margin-left": "4px", opacity: 0.5, "font-size": "0.8em" }}>
                      {priceHint()}
                    </span>
                  </Show>
                  <span style={{ "margin-left": "4px", opacity: 0.6 }}>
                    {model.enabled ? "On" : "Off"}
                  </span>
                </span>
              );
            }}
          </For>
          <Show when={!models().length}>
            <span class="chip neutral">No models yet</span>
          </Show>
        </div>
        <div class="row" style={{ "margin-top": "10px", gap: "8px" }}>
          <button
            class="button primary"
            type="button"
            disabled={fetching() || !props.provider.apiKey}
            onClick={handleFetch}
          >
            {fetching() ? "Fetching..." : "Fetch models"}
          </button>
          <button class="button ghost" type="button" onClick={() => setShowAddModel(true)}>
            Add model manually
          </button>
        </div>
        <Show when={fetchError()}>
          <p style={{ color: "hsl(var(--danger))", "font-size": "0.85rem", margin: "8px 0 0" }}>
            {fetchError()}
          </p>
        </Show>

        {/* Fetched models as toggleable chips */}
        <Show when={fetchedModels().length > 0}>
          <div style={{ "margin-top": "10px" }}>
            <p class="muted" style={{ "margin-bottom": "8px", "font-size": "0.82rem" }}>
              Available models (click to add/toggle):
            </p>
            <div class="chips flat" style={{ "max-height": "200px", "overflow-y": "auto" }}>
              <For each={fetchedModels()}>
                {(fm) => {
                  const isAdded = () => existingModelSlugs().has(fm.id);
                  const isEnabled = () => {
                    const m = models().find((m) => m.model === fm.id);
                    return m?.enabled ?? false;
                  };
                  return (
                    <span
                      class={`chip ${isAdded() && isEnabled() ? "ok" : isAdded() ? "warn" : "neutral"}`}
                      style={{ cursor: "pointer", "font-size": "0.78rem" }}
                      onClick={() => toggleFetchedModel(fm.id, fm.name)}
                      title={fm.id}
                    >
                      {fm.name || fm.id}
                    </span>
                  );
                }}
              </For>
            </div>
          </div>
        </Show>
      </div>

      {/* Expanded editing section */}
      <Show when={editing()}>
        <div class="table-row-body">
          <div class="editor-body">
            <label class="field">
              <span>Provider name</span>
              <input
                type="text"
                value={props.provider.name}
                onInput={(e) => store.updateProvider(props.provider.id, "name", e.currentTarget.value)}
              />
            </label>

            <label class="field">
              <span>Base URL</span>
              <input
                type="text"
                value={props.provider.baseUrl}
                onInput={(e) =>
                  store.updateProvider(props.provider.id, "baseUrl", e.currentTarget.value)
                }
              />
            </label>

            <label class="field">
              <span>API key</span>
              <input
                type="password"
                value={props.provider.apiKey}
                onInput={(e) =>
                  store.updateProvider(props.provider.id, "apiKey", e.currentTarget.value)
                }
              />
            </label>

            <label class="field">
              <span>JSON mode</span>
              <select
                value={props.provider.jsonMode}
                onChange={(e) =>
                  store.updateProvider(
                    props.provider.id,
                    "jsonMode",
                    e.currentTarget.value as JsonMode,
                  )
                }
              >
                <option value="native">Native JSON mode</option>
                <option value="prompt-only">Prompt only</option>
              </select>
            </label>

            <label class="field">
              <span>Custom headers JSON</span>
              <textarea
                rows={3}
                value={props.provider.headersJson}
                onInput={(e) =>
                  store.updateProvider(props.provider.id, "headersJson", e.currentTarget.value)
                }
              />
            </label>

            {/* Inline model editing */}
            <Show when={models().length > 0}>
              <div style={{ "border-top": "1px solid hsl(var(--border))", "padding-top": "14px" }}>
                <p class="muted" style={{ "margin-bottom": "10px" }}>Models</p>
                <div class="stack">
                  <For each={models()}>
                    {(model) => (
                      <div class="grid two" style={{ "align-items": "end" }}>
                        <label class="field">
                          <span>Name</span>
                          <input
                            type="text"
                            value={model.name}
                            onInput={(e) =>
                              store.updateModel(model.id, "name", e.currentTarget.value)
                            }
                          />
                        </label>
                        <div class="row" style={{ gap: "8px" }}>
                          <label class="field" style={{ flex: 1 }}>
                            <span>Slug</span>
                            <input
                              type="text"
                              value={model.model}
                              onInput={(e) =>
                                store.updateModel(model.id, "model", e.currentTarget.value)
                              }
                            />
                          </label>
                          <button
                            class="button ghost danger"
                            type="button"
                            style={{ "align-self": "end" }}
                            onClick={() => store.removeModel(model.id)}
                          >
                            Remove
                          </button>
                        </div>
                        <label class="field">
                          <span>Input $/1M tokens</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={model.inputPrice ?? ""}
                            placeholder="0.00"
                            onInput={(e) => {
                              const v = e.currentTarget.value;
                              store.updateModel(model.id, "inputPrice", v ? Number(v) : undefined);
                            }}
                          />
                        </label>
                        <label class="field">
                          <span>Output $/1M tokens</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={model.outputPrice ?? ""}
                            placeholder="0.00"
                            onInput={(e) => {
                              const v = e.currentTarget.value;
                              store.updateModel(model.id, "outputPrice", v ? Number(v) : undefined);
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            <footer class="row end">
              <button
                class="button ghost danger"
                type="button"
                onClick={() => store.removeProvider(props.provider.id)}
              >
                Remove provider
              </button>
            </footer>
          </div>
        </div>
      </Show>

      <AddModelModal
        open={showAddModel()}
        providerName={props.provider.name}
        onClose={() => setShowAddModel(false)}
        onAdd={handleAddManual}
      />
    </div>
  );
}
