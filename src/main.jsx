// ============================================================
//  main.jsx — Application Entry Point
//  Mounts the React app to the DOM.
//  StrictMode enabled for development warnings.
// ============================================================
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "remixicon/fonts/remixicon.css";
import App from "./App.jsx";

/**
 * Mobile browsers (Chrome on Android, Safari on iOS, WhatsApp/Instagram in-app
 * browsers) restore SPA pages from the back-forward cache (bfcache) when users
 * navigate via a link or back button. The DOM is reused, useEffects do NOT run
 * again, and React Query / sessionStorage state stays frozen — which is why the
 * page looked stale until the user manually refreshed.
 *
 * `pageshow` with `event.persisted === true` fires only on a bfcache restore.
 * Forcing a fresh navigation gets the page back into its normal lifecycle.
 */
if (typeof window !== "undefined") {
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      window.location.reload();
    }
  });

  /**
   * Render free-tier services sleep after 15 min of idle and cold-start in 30–60s.
   * Firing a tiny no-op request as soon as the bundle parses lets the server warm
   * up in parallel with React mounting + the first `/countries` fetch, so the
   * heavier request lands on an already-awake instance.
   */
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    try {
      fetch(`${apiUrl.replace(/\/+$/, "")}/`, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
      }).catch(() => {});
    } catch {
      /* warmup is best-effort */
    }
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
