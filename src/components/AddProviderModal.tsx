import { createEffect, createSignal, Show } from "solid-js";
import Modal from "./Modal";
import type { JsonMode, Provider } from "../lib/types";

export interface NewProviderData {
  name: string;
  type: Provider;
  baseUrl: string;
  apiKey: string;
  jsonMode: JsonMode;
  headersJson: string;
}

interface AddProviderModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: NewProviderData) => void;
}

interface ProviderPreset {
  type: Provider;
  name: string;
  hint: string;
  logoDomain: string;
  baseUrl: string;
  jsonMode: JsonMode;
  headersJson: string;
  keyUrl: string;
}

const PRESETS: ProviderPreset[] = [
  {
    type: "openai-compatible",
    name: "OpenAI",
    hint: "GPT-4.1, GPT-4o, o-series",
    logoDomain: "openai.com",
    baseUrl: "https://api.openai.com/v1",
    jsonMode: "native",
    headersJson: "",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    type: "anthropic",
    name: "Anthropic",
    hint: "Claude Sonnet, Haiku, Opus",
    logoDomain: "anthropic.com",
    baseUrl: "https://api.anthropic.com/v1",
    jsonMode: "prompt-only",
    headersJson: "",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    type: "openai-compatible",
    name: "OpenRouter",
    hint: "Unified API for 200+ models",
    logoDomain: "openrouter.ai",
    baseUrl: "https://openrouter.ai/api/v1",
    jsonMode: "native",
    headersJson: JSON.stringify({ "HTTP-Referer": "http://127.0.0.1:3030", "X-Title": "EvaLLM" }, null, 2),
    keyUrl: "https://openrouter.ai/keys",
  },
];

export default function AddProviderModal(props: AddProviderModalProps) {
  const [step, setStep] = createSignal<"pick" | "form">("pick");
  const [direction, setDirection] = createSignal<"forward" | "back">("forward");

  // Form state
  const [name, setName] = createSignal("");
  const [type, setType] = createSignal<Provider>("openai-compatible");
  const [baseUrl, setBaseUrl] = createSignal("https://api.openai.com/v1");
  const [apiKey, setApiKey] = createSignal("");
  const [jsonMode, setJsonMode] = createSignal<JsonMode>("native");
  const [headersJson, setHeadersJson] = createSignal("");
  const [keyUrl, setKeyUrl] = createSignal("");

  // Reset when modal opens
  createEffect(() => {
    if (props.open) {
      setStep("pick");
      setDirection("forward");
      setName("");
      setType("openai-compatible");
      setBaseUrl("https://api.openai.com/v1");
      setApiKey("");
      setJsonMode("native");
      setHeadersJson("");
      setKeyUrl("");
    }
  });

  const selectPreset = (preset: ProviderPreset) => {
    setName(preset.name);
    setType(preset.type);
    setBaseUrl(preset.baseUrl);
    setJsonMode(preset.jsonMode);
    setHeadersJson(preset.headersJson);
    setKeyUrl(preset.keyUrl);
    setDirection("forward");
    setStep("form");
  };

  const selectCustom = () => {
    setName("");
    setType("openai-compatible");
    setBaseUrl("");
    setApiKey("");
    setJsonMode("native");
    setHeadersJson("");
    setKeyUrl("");
    setDirection("forward");
    setStep("form");
  };

  const goBack = () => {
    setDirection("back");
    setStep("pick");
  };

  const handleAdd = () => {
    props.onAdd({
      name: name(),
      type: type(),
      baseUrl: baseUrl(),
      apiKey: apiKey(),
      jsonMode: jsonMode(),
      headersJson: headersJson(),
    });
    props.onClose();
  };

  const canSubmit = () => name().trim() && baseUrl().trim();

  return (
    <Modal open={props.open} onClose={props.onClose}>
      {/* Step 1: Pick provider type */}
      <Show when={step() === "pick"}>
        <div class={`modal-view ${direction() === "back" ? "modal-view--from-left" : ""}`}>
          <h2 class="modal-card__title">Add provider</h2>
          <p class="modal-card__desc">Choose a provider preset or add a custom endpoint.</p>

          <div class="provider-presets">
            {PRESETS.map((preset) => (
              <button class="provider-preset" type="button" onClick={() => selectPreset(preset)}>
                <span class="provider-preset__icon">
                  <img
                    src={`https://cdn.brandfetch.io/domain/${preset.logoDomain}?c=1idsVqHOloRnPo4L1ao`}
                    alt={preset.name}
                    width="24"
                    height="24"
                    style={{ "border-radius": "4px" }}
                  />
                </span>
                <span class="provider-preset__info">
                  <span class="provider-preset__name">{preset.name}</span>
                  <span class="provider-preset__hint">{preset.hint}</span>
                </span>
              </button>
            ))}

            <button class="provider-preset" type="button" onClick={selectCustom}>
              <span class="provider-preset__icon">+</span>
              <span class="provider-preset__info">
                <span class="provider-preset__name">Custom endpoint</span>
                <span class="provider-preset__hint">Any OpenAI-compatible or Anthropic API</span>
              </span>
            </button>
          </div>
        </div>
      </Show>

      {/* Step 2: Connection form */}
      <Show when={step() === "form"}>
        <div class="modal-view modal-view--from-right">
          <button class="modal-back" type="button" onClick={goBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back
          </button>

          <h2 class="modal-card__title">{name() || "New provider"}</h2>
          <p class="modal-card__desc">Configure the connection details.</p>

          <div class="stack">
            <label class="field">
              <span>Name</span>
              <input
                type="text"
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
                placeholder="My Provider"
                autofocus
              />
            </label>

            <label class="field">
              <span>Base URL</span>
              <input
                type="text"
                value={baseUrl()}
                onInput={(e) => setBaseUrl(e.currentTarget.value)}
                placeholder="https://api.example.com/v1"
              />
            </label>

            <label class="field">
              <span>API key</span>
              <input
                type="password"
                value={apiKey()}
                onInput={(e) => setApiKey(e.currentTarget.value)}
                placeholder="sk-..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSubmit()) handleAdd();
                }}
              />
              <Show when={keyUrl()}>
                <a
                  class="field-hint-link"
                  href={keyUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get your API key &rarr;
                </a>
              </Show>
            </label>

          </div>

          <div class="modal-card__footer">
            <button class="button ghost" type="button" onClick={props.onClose}>
              Cancel
            </button>
            <button
              class="button primary"
              type="button"
              disabled={!canSubmit()}
              onClick={handleAdd}
            >
              Add provider
            </button>
          </div>
        </div>
      </Show>
    </Modal>
  );
}
