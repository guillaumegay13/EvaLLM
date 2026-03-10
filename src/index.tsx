import { render } from "solid-js/web";
import { Route, Router, Navigate } from "@solidjs/router";
import App from "./App";
import { AppStoreProvider } from "./lib/store";
import OverviewPage from "./pages/OverviewPage";
import InferencesPage from "./pages/InferencesPage";
import ProvidersPage from "./pages/ProvidersPage";
import PromptsPage from "./pages/PromptsPage";
import SettingsPage from "./pages/SettingsPage";
import "./styles/theme.css";
import "./styles/layout.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

render(
  () => (
    <AppStoreProvider>
      <Router root={App}>
        <Route path="/" component={() => <Navigate href="/overview" />} />
        <Route path="/overview" component={OverviewPage} />
        <Route path="/inferences" component={InferencesPage} />
        <Route path="/providers" component={ProvidersPage} />
        <Route path="/prompts" component={PromptsPage} />
        <Route path="/settings" component={SettingsPage} />
      </Router>
    </AppStoreProvider>
  ),
  root,
);
