import type { PromptCase } from "../lib/types";

interface PromptCaseCardProps {
  promptCase: PromptCase;
  onUpdate: <K extends keyof PromptCase>(field: K, value: PromptCase[K]) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export default function PromptCaseCard(props: PromptCaseCardProps) {
  return (
    <details class="editor-card">
      <summary class="editor-summary">
        <div>
          <h3>{props.promptCase.name || "Untitled prompt"}</h3>
          <p class="editor-meta">prompt</p>
        </div>
        <span
          class={`status-chip ${props.promptCase.enabled ? "live" : "muted"}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            props.onUpdate("enabled", !props.promptCase.enabled);
          }}
        >
          {props.promptCase.enabled ? "Enabled" : "Disabled"}
        </span>
      </summary>

      <div class="editor-body">
        <label class="field">
          <span>Name</span>
          <input
            type="text"
            value={props.promptCase.name}
            onInput={(event) => props.onUpdate("name", event.currentTarget.value)}
          />
        </label>

        <label class="field">
          <span>System prompt</span>
          <textarea
            rows={4}
            value={props.promptCase.systemPrompt}
            onInput={(event) => props.onUpdate("systemPrompt", event.currentTarget.value)}
          />
        </label>

        <label class="field">
          <span>User prompt</span>
          <textarea
            rows={5}
            value={props.promptCase.userPrompt}
            onInput={(event) => props.onUpdate("userPrompt", event.currentTarget.value)}
          />
        </label>

        <label class="field">
          <span>Expected schema JSON</span>
          <textarea
            rows={9}
            value={props.promptCase.schemaText}
            onInput={(event) => props.onUpdate("schemaText", event.currentTarget.value)}
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
    </details>
  );
}
