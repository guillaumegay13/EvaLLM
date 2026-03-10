import { useAppStore } from "../lib/store";

interface HeaderProps {
  title: string;
}

export default function Header(props: HeaderProps) {
  const store = useAppStore();

  return (
    <header class="app-header">
      <h1>{props.title}</h1>
      <div class={`status-pill ${store.statusTone()}`}>{store.status()}</div>
    </header>
  );
}
