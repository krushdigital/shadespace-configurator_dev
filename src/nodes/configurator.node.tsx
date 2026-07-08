import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "../components/ui/ToastProvider";
import App from "../App";
import { applyAppScope } from "../utils/appScope";

export function mountConfigurator() {
  const el = document.getElementById("SHADE_SPACE");
  if (!el) return;
  el.setAttribute("data-lenis-prevent", "");
  applyAppScope();
  createRoot(el).render(
    <StrictMode>
      <ToastProvider>
        <App />
      </ToastProvider>
    </StrictMode>
  );
}
