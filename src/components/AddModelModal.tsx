import { createEffect, createSignal, Show } from "solid-js";
import Modal from "./Modal";

interface AddModelModalProps {
  open: boolean;
  providerName: string;
  onClose: () => void;
  onAdd: (slug: string, displayName: string) => void;
}

export default function AddModelModal(props: AddModelModalProps) {
  const [slug, setSlug] = createSignal("");
  const [displayName, setDisplayName] = createSignal("");

  createEffect(() => {
    if (props.open) {
      setSlug("");
      setDisplayName("");
    }
  });

  const canSubmit = () => slug().trim().length > 0;

  const handleAdd = () => {
    if (!canSubmit()) return;
    props.onAdd(slug().trim(), displayName().trim() || slug().trim());
    props.onClose();
  };

  return (
    <Modal open={props.open} onClose={props.onClose}>
      <h2 class="modal-card__title">Add model</h2>
      <p class="modal-card__desc">Add a model to {props.providerName}.</p>

      <div class="stack">
        <label class="field">
          <span>Model slug</span>
          <input
            type="text"
            value={slug()}
            onInput={(e) => setSlug(e.currentTarget.value)}
            placeholder="e.g. gpt-4.1-mini"
            autofocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit()) handleAdd();
            }}
          />
        </label>

        <label class="field">
          <span>Display name (optional)</span>
          <input
            type="text"
            value={displayName()}
            onInput={(e) => setDisplayName(e.currentTarget.value)}
            placeholder={slug() || "Same as slug"}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit()) handleAdd();
            }}
          />
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
          Add model
        </button>
      </div>
    </Modal>
  );
}
