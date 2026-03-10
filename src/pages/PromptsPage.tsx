import { For } from "solid-js";
import { useAppStore } from "../lib/store";
import PromptRow from "../components/PromptRow";

export default function PromptsPage() {
  const store = useAppStore();

  return (
    <>
      <div class="page-actions">
        <p class="muted">{store.config.promptCases.length} prompt{store.config.promptCases.length !== 1 ? "s" : ""}</p>
        <button class="button primary" type="button" onClick={store.addPromptCase}>
          Add prompt
        </button>
      </div>

      <div class="table-list">
        <For each={store.config.promptCases}>
          {(promptCase) => (
            <PromptRow
              promptCase={promptCase}
              onUpdate={(field, value) => store.updatePrompt(promptCase.id, field, value)}
              onDuplicate={() => store.duplicatePrompt(promptCase.id)}
              onRemove={() => store.removePrompt(promptCase.id)}
            />
          )}
        </For>
      </div>
    </>
  );
}
