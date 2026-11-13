import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import "./i18n";
import { applyCachedOverrides, loadAndApplyOverrides } from "./lib/i18nOverrides";

// Apply cached overrides synchronously to prevent flash, then refresh from DB
applyCachedOverrides();
loadAndApplyOverrides();

// Arm the CSS reveal system only once JavaScript is running. Elements that
// animate on scroll (see components/site/Reveal.tsx and SplitWords) stay fully
// visible until this class lands, so there is never a flash of hidden content
// when JS is disabled or still loading.
document.documentElement.classList.add("reveal-ready");

// Register the minimal, non-caching service worker needed for the "install
// as app" (PWA) prompt to be eligible in supporting browsers.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  });
}

// Vite fires this event when a lazy-loaded route chunk fails to fetch
// (typically because the visitor's browser is holding an index.html from
// just before the latest deploy, so it's requesting a JS chunk hash that no
// longer exists). This is the #1 cause of "blank white page, works after
// refresh" reports. We reload once automatically so visitors never have to
// figure that out themselves.
const RELOAD_FLAG_KEY = "rw_chunk_reload_attempted";
window.addEventListener("vite:preloadError", () => {
  if (!sessionStorage.getItem(RELOAD_FLAG_KEY)) {
    sessionStorage.setItem(RELOAD_FLAG_KEY, "1");
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>
);
