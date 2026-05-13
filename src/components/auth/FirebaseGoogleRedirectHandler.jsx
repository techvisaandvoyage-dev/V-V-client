import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { consumeGoogleRedirectIdToken } from "../../utils/firebaseAuth";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";

/** sessionStorage key — set on Login / Register before signInWithGoogleRedirect */
export const GOOGLE_OAUTH_RETURN_KEY = "VG_GOOGLE_OAUTH_AFTER";

/**
 * Firebase OAuth redirect often lands on `/` (or another path), not `/login`.
 * Consume getRedirectResult once at app root so login completes everywhere.
 */
export default function FirebaseGoogleRedirectHandler() {
  const navigate = useNavigate();
  const loginWithFirebaseGoogle = useAuthStore((s) => s.loginWithFirebaseGoogle);
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const idToken = await consumeGoogleRedirectIdToken();
        if (cancelled || !idToken) return;

        let target = "/dashboard";
        try {
          const raw = sessionStorage.getItem(GOOGLE_OAUTH_RETURN_KEY);
          sessionStorage.removeItem(GOOGLE_OAUTH_RETURN_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            const p = parsed?.path;
            if (typeof p === "string" && p.startsWith("/") && !p.startsWith("//")) {
              target = p.split("#")[0] || "/dashboard";
            }
          }
        } catch {
          /* ignore bad JSON */
        }

        const { success } = await loginWithFirebaseGoogle(idToken);
        if (cancelled || !success) return;
        showToast("Logged in with Google.");
        navigate(target, { replace: true });
      } catch (err) {
        if (!cancelled) showToast(err.message || "Google login failed", "error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loginWithFirebaseGoogle, navigate, showToast]);

  return null;
}
