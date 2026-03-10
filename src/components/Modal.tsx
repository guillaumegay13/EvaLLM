import { Show, onCleanup, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import type { JSX } from "solid-js";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: JSX.Element;
}

export default function Modal(props: ModalProps) {
  let overlayRef: HTMLDivElement | undefined;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") props.onClose();
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <Show when={props.open}>
      <Portal>
        <div
          ref={overlayRef}
          class="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) props.onClose();
          }}
        >
          <div class="modal-card" onClick={(e) => e.stopPropagation()}>
            {props.children}
          </div>
        </div>
      </Portal>
    </Show>
  );
}
