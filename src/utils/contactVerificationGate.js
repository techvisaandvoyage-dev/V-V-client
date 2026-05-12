/**
 * When to prompt for phone / email before apply flows (same rules as dashboard).
 * Phone OTP users typically have phone; email / Firebase / password users need a 10-digit phone on file.
 */

export const hasValidIndiaPhone10 = (user) => {
  const d = String(user?.phone || "").replace(/\D/g, "");
  if (d.length < 10) return false;
  return /^\d{10}$/.test(d.slice(-10));
};

export const hasValidEmailOnUser = (user) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(user?.email || "").trim().toLowerCase());

/** Password, Firebase email, or Google sign-in — need Indian mobile on profile for applications */
export const needsPhoneContactGate = (sessionAuthMethod, user) => {
  if (!user) return false;
  if (hasValidIndiaPhone10(user)) return false;
  if (
    sessionAuthMethod === "password" ||
    sessionAuthMethod === "firebase" ||
    sessionAuthMethod === "google" ||
    sessionAuthMethod === "facebook"
  ) {
    return true;
  }
  /* Older sessions without sessionAuthMethod: if they have email but no phone, same as email sign-in */
  if (!sessionAuthMethod && hasValidEmailOnUser(user)) return true;
  return false;
};

/** Phone OTP login — need a reachable email on profile */
export const needsEmailContactGate = (sessionAuthMethod, user) => {
  if (!user) return false;
  if (hasValidEmailOnUser(user)) return false;
  if (sessionAuthMethod === "otp") return true;
  if (!sessionAuthMethod && hasValidIndiaPhone10(user)) return true;
  return false;
};

export const normalizePhoneInputTo10 = (raw) => {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length < 10) return null;
  const key = d.slice(-10);
  return /^\d{10}$/.test(key) ? key : null;
};
