/**
 * Maps stored `continent` + canonical country name → user-facing macro-region labels.
 * Fixes vague DB values like "Americas" (e.g. Canada → "North America").
 */

const NORTH_AMERICA_NAMES = new Set(["Canada", "Mexico", "United States"]);

const CENTRAL_AMERICA_NAMES = new Set([
  "Belize",
  "Costa Rica",
  "El Salvador",
  "Guatemala",
  "Honduras",
  "Nicaragua",
  "Panama",
]);

const SOUTH_AMERICA_NAMES = new Set([
  "Argentina",
  "Bolivia",
  "Brazil",
  "Chile",
  "Colombia",
  "Ecuador",
  "Guyana",
  "Paraguay",
  "Peru",
  "Suriname",
  "Uruguay",
  "Venezuela",
]);

/** Caribbean sovereign states in our country list */
const CARIBBEAN_NAMES = new Set([
  "Antigua and Barbuda",
  "Bahamas",
  "Barbados",
  "Cuba",
  "Dominica",
  "Dominican Republic",
  "Grenada",
  "Haiti",
  "Jamaica",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Trinidad and Tobago",
]);

/** When slug overrides differ from slugify(name) */
const SLUG_TO_MACROREGION = {
  usa: "North America",
  canada: "North America",
  mexico: "North America",
};

function prettifyStoredContinent(raw) {
  const c = String(raw || "").trim();
  if (!c) return "Global";
  const lower = c.toLowerCase();
  if (lower === "europe/asia" || lower === "europe / asia") return "Europe & Asia";
  return c;
}

/**
 * @param {{ name?: string, id?: string, continent?: string }} country
 * @returns {string}
 */
export function getCountryRegionLabel(country) {
  const name = String(country?.name || "").trim();
  const continentRaw = String(country?.continent || "").trim();
  const slug = String(country?.id || "").toLowerCase();

  if (SLUG_TO_MACROREGION[slug]) return SLUG_TO_MACROREGION[slug];

  if (name) {
    if (NORTH_AMERICA_NAMES.has(name)) return "North America";
    if (CENTRAL_AMERICA_NAMES.has(name)) return "Central America";
    if (SOUTH_AMERICA_NAMES.has(name)) return "South America";
    if (CARIBBEAN_NAMES.has(name)) return "Caribbean";
  }

  if (/americas?/i.test(continentRaw)) return "Americas";

  return prettifyStoredContinent(continentRaw);
}
