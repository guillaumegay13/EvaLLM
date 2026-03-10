import type { ParentProps } from "solid-js";
import { useLocation } from "@solidjs/router";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

const pageTitles: Record<string, string> = {
  "/overview": "Overview",
  "/inferences": "Inferences",
  "/providers": "Providers",
  "/prompts": "Prompts",
  "/settings": "Settings",
};

export default function App(props: ParentProps) {
  const location = useLocation();
  const title = () => pageTitles[location.pathname] || "EvaLLM";

  return (
    <div class="app-layout">
      <Sidebar />
      <Header title={title()} />
      <div class="app-content">
        <div class="page-content">
          {props.children}
        </div>
      </div>
    </div>
  );
}
