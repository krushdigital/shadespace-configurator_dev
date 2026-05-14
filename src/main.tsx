import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "./components/ui/ToastProvider";
import App from "./App";
import "./index.css";
import { preloadCurrencyMap } from "./utils/currencySync";

declare const __BUILD_VERSION__: string;
console.info(`[ShadeSpace] bundle version: ${typeof __BUILD_VERSION__ === "string" ? __BUILD_VERSION__ : "unknown"}`);

preloadCurrencyMap();

const container = document.getElementById("SHADE_SPACE");

if (container) {
  createRoot(container).render(
   <StrictMode>
      <ToastProvider>
        <App />
      </ToastProvider>
    </StrictMode>
  );
} else {
  console.error("❌ Root element #SHADE_SPACE not found in DOM.");
}
