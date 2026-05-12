// ============================================================
//  App.jsx — Root Entry
//  Sets up React Router and Providers
// ============================================================
import { useEffect } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Toast from "./components/ui/Toast";
import AppRoutes from "./routes/AppRoutes";

/** Outside Suspense so lazy routes still reset scroll on SPA navigation. */
const ScrollToTop = () => {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.key]);
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

// ── Project Integrity & Licensing ─────────────────────────────
// This code protects the project from unauthorized resale.
const useIntegrity = () => {
  useEffect(() => {
    // 1. Console Watermark (Proof of Ownership)
    console.log(
      "%c Visa & Voyage %c AUTHORIZED BUILD %c © 2026 Yash Raj Singh ",
      "background: #0284c7; color: #ffffff; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;",
      "background: #f0f4f8; color: #000000; font-weight: bold; padding: 4px 8px;",
      "background: #d97706; color: #ffffff; font-weight: bold; padding: 4px 8px; border-radius: 0 4px 4px 0;"
    );
    console.log("%c Unique ID: VG-9921-XQ77-YASH-2026 | Verified Owner: yashrajsingh28359@gmail.com", "color: #4b5563; font-style: italic;");
    
    // 2. Hidden "Kill Switch" indicator
    window.__VG_LICENSE__ = {
      owner: "Yash Raj Singh",
      contact: "yashrajsingh28359@gmail.com",
      serial: "VG-9921-XQ77-YASH-2026",
      verified: true,
      timestamp: new Date().toISOString()
    };
  }, []);
};

function App() {
  useIntegrity(); // Initializing integrity check
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        {/* Global toast notification */}
        <Toast />
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;


