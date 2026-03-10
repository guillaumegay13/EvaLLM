import { createSignal, Show } from "solid-js";
import type { PromptCase } from "../lib/types";

interface PromptRowProps {
  promptCase: PromptCase;
  onUpdate: <K extends keyof PromptCase>(field: K, value: PromptCase[K]) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export default function PromptRow(props: PromptRowProps) {
  const [expanded, setExpanded] = createSignal(false);

  return (
    <div class="table-row">
      <div class="table-row-summary" onClick={() => setExpanded(!expanded())}>
        <div class="table-row-info">
          <h4>{props.promptCase.name || "Untitled prompt"}</h4>
        </div>
        <div class="table-row-meta">
          <span class={`status-chip ${props.promptCase.enabled ? "live" : "muted"}`}>
            {props.promptCase.enabled ? "On" : "Off"}
          </span>
        </div>
      </div>

      <Show when={expanded()}>
        <div class="table-row-body">
          <div class="editor-body">
            <label class="field">
              <span>Name</span>
              <input
                type="text"
                value={props.promptCase.name}
                onInput={(e) => props.onUpdate("name", e.currentTarget.value)}
              />
            </label>

            <label class="field inline-toggle">
              <span>Include in next run</span>
              <input
                type="checkbox"
                checked={props.promptCase.enabled}
                onChange={(e) => props.onUpdate("enabled", e.currentTarget.checked)}
              />
            </label>

            <label class="field">
              <span>System prompt</span>
              <textarea
                rows={4}
                value={props.promptCase.systemPrompt}
                onInput={(e) => props.onUpdate("systemPrompt", e.currentTarget.value)}
              />
            </label>

            <label class="field">
              <span>User prompt</span>
              <textarea
                rows={5}
                value={props.promptCase.userPrompt}
                onInput={(e) => props.onUpdate("userPrompt", e.currentTarget.value)}
              />
            </label>

            <label class="field">
              <span>Expected schema JSON</span>
              <textarea
                rows={9}
                value={props.promptCase.schemaText}
                onInput={(e) => props.onUpdate("schemaText", e.currentTarget.value)}
              />
            </label>

            <footer class="row end">
              <button class="button ghost" type="button" onClick={props.onDuplicate}>
                Duplicate
              </button>
              <button class="button ghost danger" type="button" onClick={props.onRemove}>
                Remove
              </button>
            </footer>
          </div>
        </div>
      </Show>
    </div>
  );
}
