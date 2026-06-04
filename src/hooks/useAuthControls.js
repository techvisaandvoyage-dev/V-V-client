import { useEffect, useState } from "react";
import { api } from "../store/authStore";

export const DEFAULT_AUTH_CONTROLS = {
  passwordEnabled: true,
  googleEnabled: true,
  facebookEnabled: false,
  phoneOtpEnabled: true,
  emailOtpEnabled: true,
};

let cachedAuthControls = null;

const normalizeAuthControls = (value = {}) => ({
  passwordEnabled: value.passwordEnabled !== false,
  googleEnabled: value.googleEnabled !== false,
  facebookEnabled: value.facebookEnabled === true,
  phoneOtpEnabled: value.phoneOtpEnabled !== false,
  emailOtpEnabled: value.emailOtpEnabled !== false,
});

export const useAuthControls = () => {
  const [authControls, setAuthControls] = useState(
    cachedAuthControls || DEFAULT_AUTH_CONTROLS
  );
  const [loading, setLoading] = useState(!cachedAuthControls);

  useEffect(() => {
    let active = true;
    setLoading(!cachedAuthControls);

    api
      .get("/auth/otp-config")
      .then(({ data }) => {
        if (!active) return;
        const next = normalizeAuthControls(data?.authControls);
        cachedAuthControls = next;
        setAuthControls(next);
      })
      .catch(() => {
        if (!active) return;
        setAuthControls(cachedAuthControls || DEFAULT_AUTH_CONTROLS);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { authControls, loading };
};
