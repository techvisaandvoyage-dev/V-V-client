import regions from "../data/countryRegions.json";

/** @type {Record<string, string>} */
const LOCATED_IN_BY_COUNTRY_NAME = Object.fromEntries(
  regions.map((r) => [r.country, r.located_in])
);

/** Canonical English country name → macro-region (matches countryRegions.json). */
export function getLocatedInLabel(countryName) {
  const n = String(countryName || "").trim();
  return LOCATED_IN_BY_COUNTRY_NAME[n] || null;
}
