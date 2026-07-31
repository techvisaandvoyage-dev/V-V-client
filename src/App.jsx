// ============================================================
//  App.jsx — Root Entry
//  Sets up React Router and Providers
// ============================================================
import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Toast from "./components/ui/Toast";
import ClientErrorBoundary from "./components/ClientErrorBoundary";
import AppRoutes from "./routes/AppRoutes";
import SiteSeoManager from "./components/common/SiteSeoManager";

// Lazy-loaded: these components render null and run side-effects only.
// Lazy loading removes their parse cost from the critical startup path.
// FirebaseGoogleRedirectHandler: Google OAuth redirect is preserved because
// the component still mounts immediately — Suspense only defers the JS parse.
const FirebaseGoogleRedirectHandler = lazy(() =>
  import("./components/auth/FirebaseGoogleRedirectHandler")
);
const ExitIntentBanner = lazy(() =>
  import("./components/common/ExitIntentBanner")
);

const scheduleAfterPaint = (callback) => {
  if (typeof window === "undefined") return undefined;
  const frame = window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(callback, { timeout: 1600 });
      } else {
        window.setTimeout(callback, 800);
      }
    });
  });
  return () => window.cancelAnimationFrame(frame);
};

/** Outside Suspense so lazy routes still reset scroll on SPA navigation. */
const ScrollToTop = () => {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);
  return null;
};

// ── React Query client (for future API calls) ──────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  const [loadDeferredShell, setLoadDeferredShell] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(sessionStorage.getItem("VG_GOOGLE_OAUTH_AFTER"));
  });

  useEffect(() => {
    if (loadDeferredShell) return undefined;
    return scheduleAfterPaint(() => setLoadDeferredShell(true));
  }, [loadDeferredShell]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <SiteSeoManager />
        {/* Both components render null — Suspense fallback is null so no flash */}
        {loadDeferredShell ? (
          <Suspense fallback={null}>
            <FirebaseGoogleRedirectHandler />
            <ExitIntentBanner />
          </Suspense>
        ) : null}
        {/* Global toast notification */}
        <Toast />
        <ClientErrorBoundary>
          <AppRoutes />
        </ClientErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
