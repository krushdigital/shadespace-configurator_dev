import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "./components/ui/ToastProvider";
import App from "./App";
import "./index.css";
import { preloadCurrencyMap } from "./utils/currencySync";

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
