/** Today's calendar date as YYYY-MM-DD in the user's local timezone (for `<input type="date" min>`). */
export function getLocalDateYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Later of two YYYY-MM-DD strings (lexicographic compare is valid for ISO dates). */
export function maxYmd(a, b) {
  if (!a) return b || "";
  if (!b) return a || "";
  return a >= b ? a : b;
}
