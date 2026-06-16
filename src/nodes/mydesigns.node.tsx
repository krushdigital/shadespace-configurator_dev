import { createPortal } from "react-dom";
import MyDesigns from "../shopify/MyDesigns";

export function MyDesignsPortal() {
  const target = document.querySelector<HTMLElement>("#MY_DESIGNS_ROOT");
  if (!target) return null;

  const { customerEmail, customerName, loggedIn } = target.dataset;

  return createPortal(
    <MyDesigns
      email={customerEmail || ""}
      name={customerName || ""}
      isLoggedIn={loggedIn === "true"}
    />,
    target
  );
}
