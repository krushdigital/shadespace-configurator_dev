import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "../components/ui/ToastProvider";
import { ErrorBoundary } from "../components/ErrorBoundary";
import App from "../App";
import { applyAppScope } from "../utils/appScope";
import { installGlobalErrorReporting } from "../utils/errorReporter";

export function mountConfigurator() {
  const el = document.getElementById("SHADE_SPACE");
  if (!el) return;
  installGlobalErrorReporting();
  el.setAttribute("data-lenis-prevent", "");
  applyAppScope();
  createRoot(el).render(
    <StrictMode>
      <ErrorBoundary>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
