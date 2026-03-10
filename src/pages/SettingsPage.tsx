import { useAppStore } from "../lib/store";

export default function SettingsPage() {
  const store = useAppStore();
  const fileInputId = "config-import";

  return (
    <>
      <section class="surface section">
        <div class="section-head">
          <div>
            <p class="eyebrow">Parameters</p>
            <h2>Evaluation settings</h2>
          </div>
        </div>

        <div class="grid two">
          <label class="field">
            <span>Temperature</span>
            <input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={store.config.settings.temperature}
              onInput={(e) => store.setConfig("settings", "temperature", Number(e.currentTarget.value))}
            />
          </label>
          <label class="field">
            <span>Max tokens</span>
            <input
              type="number"
              min="200"
              max="16000"
              step="100"
              value={store.config.settings.maxTokens}
              onInput={(e) => store.setConfig("settings", "maxTokens", Number(e.currentTarget.value))}
            />
          </label>
          <label class="field">
            <span>Timeout (ms)</span>
            <input
              type="number"
              min="1000"
              max="300000"
              step="1000"
              value={store.config.settings.timeoutMs}
              onInput={(e) => store.setConfig("settings", "timeoutMs", Number(e.currentTarget.value))}
            />
          </label>
          <label class="field inline-toggle">
            <span>Strict JSON instructions</span>
            <input
              type="checkbox"
              checked={store.config.settings.strictJson}
              onChange={(e) => store.setConfig("settings", "strictJson", e.currentTarget.checked)}
            />
          </label>
        </div>
      </section>

      <section class="surface section">
        <div class="section-head">
          <div>
            <p class="eyebrow">Data</p>
            <h2>Import / Export / Reset</h2>
          </div>
        </div>

        <div class="row" style={{ "flex-wrap": "wrap", gap: "10px" }}>
          <label class="button ghost" for={fileInputId}>
            Import config
          </label>
          <input
            id={fileInputId}
            class="hidden-input"
            type="file"
            accept="application/json"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) store.importConfigFromFile(file);
              e.currentTarget.value = "";
            }}
          />
          <button class="button ghost" type="button" onClick={store.exportConfig}>
            Export config
          </button>
          <button class="button ghost" type="button" onClick={store.exportResults}>
            Export results
          </button>
          <button class="button ghost danger" type="button" onClick={store.resetStarterKit}>
            Reset starter kit
          </button>
        </div>
      </section>
    </>
  );
}
