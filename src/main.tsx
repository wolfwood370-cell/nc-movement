import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import { installGlobalBugListeners } from "./lib/bugReporter.ts";
import "./index.css";

// Catch non-React errors (event handlers, async rejections) before React boots.
installGlobalBugListeners();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
