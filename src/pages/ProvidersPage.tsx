import { createSignal, For } from "solid-js";
import { useAppStore } from "../lib/store";
import ProviderRow from "../components/ProviderRow";
import AddProviderModal from "../components/AddProviderModal";
import type { NewProviderData } from "../components/AddProviderModal";

export default function ProvidersPage() {
  const store = useAppStore();
  const [showModal, setShowModal] = createSignal(false);

  const handleAdd = (data: NewProviderData) => {
    store.addProvider(data);
  };

  return (
    <>
      <div class="page-actions">
        <p class="muted">
          {store.config.providers.length} provider{store.config.providers.length !== 1 ? "s" : ""},{" "}
          {store.config.models.length} model{store.config.models.length !== 1 ? "s" : ""}
        </p>
        <button class="button ghost" type="button" onClick={() => setShowModal(true)}>
          Add provider
        </button>
      </div>

      <div class="table-list">
        <For each={store.config.providers}>
          {(provider) => <ProviderRow provider={provider} />}
        </For>
      </div>

      <AddProviderModal
        open={showModal()}
        onClose={() => setShowModal(false)}
        onAdd={handleAdd}
      />
    </>
  );
}
