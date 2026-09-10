import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "./components/ui/ToastProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App";
import "./index.css";
import { preloadCurrencyMap, detectCountryFromIp } from "./utils/currencySync";
import { applyAppScope } from "./utils/appScope";
import { installGlobalErrorReporting } from "./utils/errorReporter";

declare const __BUILD_VERSION__: string;
console.info(`[ShadeSpace] bundle version: ${typeof __BUILD_VERSION__ === "string" ? __BUILD_VERSION__ : "unknown"}`);

installGlobalErrorReporting();
applyAppScope();

if (document.getElementById('CONFIGURATOR_ROOT')) {
  preloadCurrencyMap();
  detectCountryFromIp();
}

const container = document.getElementById("SHADESAIL_ROOT");

if (container) {
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
