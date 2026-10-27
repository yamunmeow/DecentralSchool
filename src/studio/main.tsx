import "@fontsource-variable/fredoka";
import "@fontsource-variable/nunito";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./studio.css";

// decentralschool.org/privacy is the address given to Google and Microsoft; the studio routes by #.
if (window.location.pathname === "/privacy") history.replaceState(null, "", "/#/privacy");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline after the first visit (the worker is made at build time).
if (import.meta.env.PROD && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
