/**
 * Shared rules for email vs phone across register, login OTP, etc.
 * Must stay aligned with server parseSignupIdentifier / normalizeLoginIdentifier.
 */

export const isValidEmail = (raw) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(raw || "").trim().toLowerCase());

const phoneKeyFromInput = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const key = digits.slice(-10);
  return /^\d{10}$/.test(key) ? key : null;
};

/**
 * If @ is present → treat as email only. Otherwise → last 10 digits when ≥10 digits.
 */
export const parseAuthContactInput = (raw) => {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;
  if (trimmed.includes("@")) {
    if (!isValidEmail(trimmed)) return null;
    return { type: "email", value: trimmed.toLowerCase() };
  }
  const phoneKey = phoneKeyFromInput(trimmed);
  if (phoneKey) return { type: "phone", value: phoneKey };
  return null;
};
