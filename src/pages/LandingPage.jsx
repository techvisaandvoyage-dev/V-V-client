// ============================================================
//  Landing Page
//  Sections:
//  1. Hero — search bar + animated background
//  2. Countries Grid — trending countries display
// ============================================================
import {
  useEffect,
  lazy,
  Suspense,
  useState,
  useRef,
  useCallback,
  useMemo,
  startTransition,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search, MapPin, CheckCircle, Clock, Globe, Users, CreditCard, Plane, HeartHandshake, Smile,
  ShieldCheck, FileText, Lock, Zap, X, ChevronDown, CalendarDays,
} from "lucide-react";

const AVAILABLE_ICONS = {
  Zap, ShieldCheck, FileText, Lock, CheckCircle, Clock,
  Globe, Users, CreditCard, MapPin, Plane, HeartHandshake, Smile, Search
};
import Navbar from "../components/layout/Navbar";
import LandingCountriesGrid from "../components/landing/LandingCountriesGrid";
import { normalizeCountryFromApi, useCountries } from "../hooks/useCountries";
import { api, useAuthStore } from "../store/authStore";
import { getCountryFlagEmoji, getCountrySearchHint, matchesCountrySearch } from "../utils/countrySearch";
import { getCountryRouteId } from "../utils/countryRouting";

const GEOCODE_DEBOUNCE_MS = 680;
const GEOCODE_MIN_CHARS = 3;
const INITIAL_COUNTRY_CARD_COUNT = 8;
const Footer = lazy(() => import("../components/layout/Footer"));

const scheduleAfterPaint = (callback) => {
  if (typeof window === "undefined") return undefined;
  const frame = window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(callback, { timeout: 1800 });
      } else {
        window.setTimeout(callback, 600);
      }
    });
  });
  return () => window.cancelAnimationFrame(frame);
};

const DEFAULT_HERO_HIGHLIGHTS = [
  {
    icon: Zap,
    title: "Fast Processing",
    body: "Quick application flow and updates",
  },
  {
    icon: ShieldCheck,
    title: "Trusted Guidance",
    body: "Accurate help for every step",
  },
  {
    icon: FileText,
    title: "All-in-One Platform",
    body: "Search, apply, track, and upload",
  },
  {
    icon: Lock,
    title: "Secure & Private",
    body: "Your documents stay protected",
  },
];

// ── Animation variants ─────────────────────────────────────
const POPULAR_COUNTRIES_CACHE_KEY = "vb_popular_countries_home_v3";
const POPULAR_COUNTRIES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const loadPopularCountriesCache = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(POPULAR_COUNTRIES_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - Number(parsed.savedAt) > POPULAR_COUNTRIES_CACHE_TTL_MS) {
      return [];
    }
    return Array.isArray(parsed.countries)
      ? parsed.countries.map((country) => normalizeCountryFromApi(country)).filter(Boolean)
      : [];
  } catch {
    return [];
  }
};

const savePopularCountriesCache = (countries) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      POPULAR_COUNTRIES_CACHE_KEY,
      JSON.stringify({
        countries,
        savedAt: Date.now(),
      })
    );
  } catch {
    /* ignore storage failures */
  }
};

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const countryCardRefs = useRef({});
  const searchInputRef = useRef(null);
  const searchAnchorRef = useRef(null);
  const filterAnchorRef = useRef(null);
  const searchFormRef = useRef(null);
  const geocodeAbortRef = useRef(null);
  const popularFetchStartedRef = useRef(false);
  const geocodeReqSeq = useRef(0);
  const homeExitGuardRef = useRef(false);
  const { countries: allCountries, trendingCountries, display: countryDisplay, documentCatalog } = useCountries();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Global requirements for merging logic on cards
  const [globalRequirements, setGlobalRequirements] = useState([]);
  const [showVisaRequirements, setShowVisaRequirements] = useState(false);
  const [heroHighlights, setHeroHighlights] = useState(DEFAULT_HERO_HIGHLIGHTS);
  const [popularCountryCards, setPopularCountryCards] = useState(() => loadPopularCountriesCache());
  const [popularCountriesLoading, setPopularCountriesLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNTRY_CARD_COUNT);
  const [isSearchPinned, setIsSearchPinned] = useState(false);
  const [isFilterPinned, setIsFilterPinned] = useState(false);
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);
  const [showDeferredFooter, setShowDeferredFooter] = useState(false);

  // ── Filter state ──────────────────────────────────────────
  const [siteConfig, setSiteConfig] = useState(null);
  useEffect(() => {
    let alive = true;
    api.get("/config/site-state").then(({ data }) => {
      if (alive && data?.config) setSiteConfig(data.config);
    }).catch(console.error);
    return () => { alive = false; };
  }, []);

  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedVisaType, setSelectedVisaType] = useState("All Visa Types");
  const [selectedValidity, setSelectedValidity] = useState("Any Validity");
  const [selectedLengthOfStay, setSelectedLengthOfStay] = useState("Any Length of Stay");
  const [selectedEntryType, setSelectedEntryType] = useState("Any Entry Type");

  const visaTypes = useMemo(() => {
    const types = new Set(allCountries.map((c) => c.visaType).filter(Boolean));
    return ["All Visa Types", ...Array.from(types).sort()];
  }, [allCountries]);

  const validities = useMemo(() => {
    const vals = new Set(allCountries.map((c) => c.validity).filter(Boolean));
    return ["Any Validity", ...Array.from(vals).sort()];
  }, [allCountries]);

  const lengthsOfStay = useMemo(() => {
    const vals = new Set(allCountries.map((c) => c.lengthOfStay).filter(Boolean));
    return ["Any Length of Stay", ...Array.from(vals).sort()];
  }, [allCountries]);

  const entryTypes = useMemo(() => {
    const vals = new Set(allCountries.map((c) => c.entryType).filter(Boolean));
    return ["Any Entry Type", ...Array.from(vals).sort()];
  }, [allCountries]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".filter-dropdown-container")) setOpenDropdown(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const clearFilters = () => {
    setSelectedVisaType("All Visa Types");
    setSelectedValidity("Any Validity");
    setSelectedLengthOfStay("Any Length of Stay");
    setSelectedEntryType("Any Entry Type");
  };


  useEffect(() => {
    if (homeExitGuardRef.current) return undefined;
    homeExitGuardRef.current = true;

    const pushHomeGuardState = () => {
      window.history.pushState(
        { vbHomeExitGuard: true, time: Date.now() },
        "",
        window.location.href
      );
    };

    const handleHomeBackAttempt = () => {
      const shouldLeave = window.confirm("Do you want to close VISAANDVOYAGE?");

      if (!shouldLeave) {
        pushHomeGuardState();
        return;
      }

      window.removeEventListener("popstate", handleHomeBackAttempt);
      window.close();
    };

    pushHomeGuardState();
    window.addEventListener("popstate", handleHomeBackAttempt);

    return () => {
      window.removeEventListener("popstate", handleHomeBackAttempt);
      homeExitGuardRef.current = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const cancelSchedule = scheduleAfterPaint(async () => {
      try {
        const { data } = await api.get("/config/destination-content");
        if (alive && data?.success) {
          if (data.config?.visaRequirements) setGlobalRequirements(data.config.visaRequirements);
          if (data.config?.showVisaRequirements !== undefined) setShowVisaRequirements(data.config.showVisaRequirements);
          if (Array.isArray(data.config?.landingHeroHighlights) && data.config.landingHeroHighlights.length) {
            setHeroHighlights(
              DEFAULT_HERO_HIGHLIGHTS.map((fallback, index) => {
                const iconName = data.config.landingHeroHighlights[index]?.icon;
                return {
                  ...fallback,
                  icon: AVAILABLE_ICONS[iconName] || fallback.icon,
                  title: String(data.config.landingHeroHighlights[index]?.title ?? "").trim() || fallback.title,
                  body: String(data.config.landingHeroHighlights[index]?.body ?? "").trim() || fallback.body,
                };
              })
            );
          }
        }
      } catch (err) {
        console.error("Failed to fetch global requirements:", err);
      }
    });
    return () => {
      alive = false;
      cancelSchedule?.();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    if (popularFetchStartedRef.current) return undefined;
    popularFetchStartedRef.current = true;

    const fallbackCountries = (source = []) => source;

    const cancelSchedule = scheduleAfterPaint(async () => {
      if (popularCountryCards.length === 0 && allCountries.length === 0 && trendingCountries.length === 0) {
        setPopularCountriesLoading(true);
      }
      try {
        const { data } = await api.get("/countries/popular", { params: { limit: 250, _ts: Date.now() } });
        if (!alive) return;

        const normalized = Array.isArray(data?.countries)
          ? data.countries.map((country) => normalizeCountryFromApi(country)).filter(Boolean)
          : [];

        if (normalized.length > 0) {
          setPopularCountryCards(normalized);
          savePopularCountriesCache(data.countries);
        } else {
          const fallback = fallbackCountries(allCountries.length ? allCountries : trendingCountries);
          setPopularCountryCards(fallback);
        }
      } catch (err) {
        console.error("Failed to fetch popular countries:", err);
        if (!alive) return;
        const fallback = fallbackCountries(allCountries.length ? allCountries : trendingCountries);
        setPopularCountryCards(fallback);
      } finally {
        if (alive) setPopularCountriesLoading(false);
      }
    });

    return () => {
      alive = false;
      cancelSchedule?.();
    };
  }, [allCountries, trendingCountries, popularCountryCards.length]);

  // Search bar state
  const [searchDestination, setSearchDestination] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  /** Full place list from Nominatim — updated in startTransition to keep typing smooth. */
  const [geocodePlaces, setGeocodePlaces] = useState([]);

  const searchTerm = searchDestination.trim().toLowerCase();

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(INITIAL_COUNTRY_CARD_COUNT);
  }, [searchDestination]);

  useEffect(() => {
    const resetHomeSearch = () => {
      setSearchDestination("");
      setGeocodePlaces([]);
      setIsSearchFocused(false);
    };

    window.addEventListener("vb:reset-home-search", resetHomeSearch);
    return () => window.removeEventListener("vb:reset-home-search", resetHomeSearch);
  }, []);

  useEffect(() => {
    if (!location.state?.resetSearch) return;
    setSearchDestination("");
    setGeocodePlaces([]);
    setIsSearchFocused(false);
    window.history.replaceState(
      { ...window.history.state, usr: { ...window.history.state?.usr, resetSearch: false } },
      "",
      window.location.href
    );
  }, [location.state]);

  useEffect(() => {
    const q = searchDestination.trim();
    if (q.length < GEOCODE_MIN_CHARS) {
      geocodeAbortRef.current?.abort();
      startTransition(() => setGeocodePlaces([]));
      return undefined;
    }

    geocodeAbortRef.current?.abort();
    const controller = new AbortController();
    geocodeAbortRef.current = controller;

    const seq = ++geocodeReqSeq.current;
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/geocode/places", {
          params: { q, limit: 24 },
          signal: controller.signal,
        });
        if (seq !== geocodeReqSeq.current) return;
        if (!data?.success) {
          startTransition(() => setGeocodePlaces([]));
          return;
        }
        const nextPlaces =
          Array.isArray(data.places) && data.places.length > 0
            ? data.places
            : Array.isArray(data.matches) && data.matches.length > 0
              ? data.matches.map((m) => ({
                  placeKey: `country-${m.id}`,
                  primaryLabel: m.name,
                  detailLabel: m.hint?.replace(/^Includes /, "") || m.name,
                  countrySlug: m.id,
                  countryName: m.name,
                }))
              : [];

        startTransition(() => setGeocodePlaces(nextPlaces));
      } catch (err) {
        if (controller.signal.aborted || err?.code === "ERR_CANCELED") return;
        if (seq === geocodeReqSeq.current) startTransition(() => setGeocodePlaces([]));
      }
    }, GEOCODE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchDestination]);

  const suggestionRows = useMemo(() => {
    if (!searchTerm) return [];
    const localList = allCountries
      .filter((country) => matchesCountrySearch(country, searchTerm))
      .slice(0, 10);
    const rows = [];
    const seenPlace = new Set();
    for (const c of localList) {
      rows.push({
        kind: "country",
        key: `local-${c.id}`,
        country: c,
        hint: getCountrySearchHint(c, searchTerm),
      });
    }
    for (const p of geocodePlaces) {
      const pk = p.placeKey || `${p.countrySlug}-${p.primaryLabel}`;
      if (seenPlace.has(pk)) continue;
      seenPlace.add(pk);
      const country = allCountries.find(
        (c) => c.id === p.countrySlug || c.name === p.countryName
      );
      if (!country) continue;
      rows.push({
        kind: "place",
        key: `place-${pk}`,
        country,
        primaryLabel: p.primaryLabel,
        detailLabel: p.detailLabel || p.countryName,
      });
    }
    return rows.slice(0, 42);
  }, [searchTerm, allCountries, geocodePlaces]);

  const filteredCountries = useMemo(() => {
    let baseList = [];
    const term = searchDestination.trim();
    if (!term) {
      if (popularCountryCards.length > 0) {
        const freshById = new Map(
          [...allCountries, ...trendingCountries].map((country) => [getCountryRouteId(country), country])
        );
        baseList = popularCountryCards.map((country) => {
          const fresh = freshById.get(getCountryRouteId(country));
          if (!fresh) return country;
          return {
            ...country,
            ...fresh,
            imageUrl: fresh.imageUrl || country.imageUrl || "",
          };
        });
      } else if (popularCountriesLoading) {
        baseList = [];
      } else {
        baseList = allCountries.length > 0 ? allCountries : trendingCountries;
      }
    } else {
      const local = allCountries.filter((country) => matchesCountrySearch(country, term));
      const byId = new Map(local.map((c) => [getCountryRouteId(c), c]));
      for (const p of geocodePlaces) {
        const country = allCountries.find(
          (c) => c.id === p.countrySlug || c.name === p.countryName
        );
        const routeId = getCountryRouteId(country);
        if (country && !byId.has(routeId)) byId.set(routeId, country);
      }
      baseList = Array.from(byId.values());
    }

    // Apply dropdown filters
    if (selectedVisaType !== "All Visa Types") baseList = baseList.filter((c) => c.visaType === selectedVisaType);
    if (selectedValidity !== "Any Validity") baseList = baseList.filter((c) => c.validity === selectedValidity);
    if (selectedLengthOfStay !== "Any Length of Stay") baseList = baseList.filter((c) => c.lengthOfStay === selectedLengthOfStay);
    if (selectedEntryType !== "Any Entry Type") baseList = baseList.filter((c) => c.entryType === selectedEntryType);
    
    return baseList;
  }, [searchDestination, popularCountryCards, trendingCountries, allCountries, geocodePlaces, selectedVisaType, selectedValidity, selectedLengthOfStay, selectedEntryType, popularCountriesLoading]);

  const shouldShowPopularCountriesLoading =
    !searchDestination.trim() &&
    popularCountriesLoading &&
    popularCountryCards.length === 0;

  /** Stable key so the memoized grid skips unrelated ticks but still updates when card images arrive. */
  const displayedCountries = useMemo(() => {
    return filteredCountries.slice(0, visibleCount);
  }, [filteredCountries, visibleCount]);

  const countryIdsKey = useMemo(
    () => displayedCountries.map((c) => `${getCountryRouteId(c)}:${c.imageUrl || ""}`).join("|"),
    [displayedCountries]
  );

  const scrollToCountry = useCallback((countryId) => {
    const card = countryCardRefs.current[countryId];
    if (card?.scrollIntoView) {
      card.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
  }, []);

  useEffect(() => {
    const term = searchDestination.trim();
    if (!term || allCountries.length === 0) return;

    const merged = new Map();
    for (const c of allCountries.filter((country) => matchesCountrySearch(country, term))) {
      merged.set(getCountryRouteId(c), c);
    }
    for (const p of geocodePlaces) {
      const c = allCountries.find(
        (x) => x.id === p.countrySlug || x.name === p.countryName
      );
      if (c) merged.set(getCountryRouteId(c), c);
    }
    const list = Array.from(merged.values());
    if (list.length !== 1) return;

    const id = getCountryRouteId(list[0]);
    const timer = setTimeout(() => scrollToCountry(id), 240);
    return () => clearTimeout(timer);
  }, [searchDestination, allCountries, scrollToCountry, geocodePlaces]);

  const handleSuggestionRowClick = (row) => {
    setIsSearchFocused(false);
    if (row.kind === "country") {
      setSearchDestination(row.country.name);
      setTimeout(() => scrollToCountry(getCountryRouteId(row.country)), 150);
      return;
    }
    setSearchDestination(row.primaryLabel);
    setTimeout(() => scrollToCountry(getCountryRouteId(row.country)), 150);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setIsSearchFocused(false);
    const term = searchDestination.trim();
    if (!term) {
      return;
    }

    const localMatches = allCountries.filter((country) => matchesCountrySearch(country, term));
    if (localMatches.length >= 1) {
      setTimeout(() => scrollToCountry(getCountryRouteId(localMatches[0])), 150);
      return;
    }
    const p = geocodePlaces[0];
    if (p) {
      const c = allCountries.find(
        (x) => x.id === p.countrySlug || x.name === p.countryName
      );
      if (c) setTimeout(() => scrollToCountry(getCountryRouteId(c)), 150);
    }
  };

  const handleNavigateDestination = useCallback(
    (country) => navigate(`/destination/${encodeURIComponent(getCountryRouteId(country))}`),
    [navigate]
  );

  useEffect(() => {
    const handleGlobalTyping = (event) => {
      const input = searchInputRef.current;
      if (!input) return;

      const activeElement = document.activeElement;
      const tagName = activeElement?.tagName?.toLowerCase();
      const isTypingInFormField = (
        activeElement?.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
      );
      if (isTypingInFormField) return;

      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length !== 1 && event.key !== "Backspace") return;

      event.preventDefault();
      input.focus();

      if (event.key === "Backspace") {
        setSearchDestination((prev) => prev.slice(0, -1));
        return;
      }

      setSearchDestination((prev) => `${prev}${event.key}`);
    };

    window.addEventListener("keydown", handleGlobalTyping);
    return () => window.removeEventListener("keydown", handleGlobalTyping);
  }, []);

  useEffect(() => {
    return scheduleAfterPaint(() => setShowDeferredFooter(true));
  }, []);

  useEffect(() => {
    let searchTriggerTop = 0;
    let filterTriggerTop = 0;
    let rafId = null;
    let resizeTimer = null;

    const measurePositions = () => {
      const searchAnchor = searchAnchorRef.current;
      const filterAnchor = filterAnchorRef.current;
      if (searchAnchor) searchTriggerTop = searchAnchor.getBoundingClientRect().top + window.scrollY;
      // Trigger when the bottom of the filter section goes past the bottom of the navbar (approx 72px)
      if (filterAnchor) filterTriggerTop = filterAnchor.getBoundingClientRect().bottom + window.scrollY - 72;
    };

    // rAF-throttled scroll: browser batches layout reads, no forced reflow per scroll px
    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!searchTriggerTop || !filterTriggerTop) measurePositions();
        const searchPinned = window.scrollY >= searchTriggerTop;
        const filterPinned = window.scrollY >= filterTriggerTop;
        setIsSearchPinned(searchPinned);
        setIsFilterPinned(filterPinned);
        if (!searchPinned) setMobileSearchExpanded(false);
      });
    };

    // Debounced resize: only re-measure after user stops resizing (150ms)
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measurePositions, 150);
    };

    measurePositions();
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(resizeTimer);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const effectiveMobileSearchExpanded = mobileSearchExpanded || searchDestination.trim().length > 0;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section id="hero" className="relative bg-white pt-8 sm:pt-10">
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            ref={searchAnchorRef}
            className="relative mx-auto w-full max-w-[48rem] bg-white py-2 sm:py-3 animate-home-enter"
          >
              <form
                onSubmit={handleSearch}
                autoComplete="off"
                className="relative rounded-full border border-slate-200 bg-white h-16 px-4 sm:px-5 w-full transition-shadow hover:shadow-md"
                role="search"
                aria-label="Search visa destinations"
              >
                <div className="flex h-full items-center gap-3">
                  <input
                    ref={!isSearchPinned ? searchInputRef : null}
                    type="text"
                    autoComplete="off"
                    placeholder="Search country"
                    value={searchDestination}
                    onChange={(e) => setSearchDestination(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={(e) => {
                      const nextFocused = e.relatedTarget;
                      if (searchFormRef.current?.contains(nextFocused)) return;
                      window.setTimeout(() => setIsSearchFocused(false), 120);
                    }}
                    className="h-full min-w-0 flex-1 bg-transparent px-3 text-base leading-none text-text-primary placeholder:text-[#858da3] focus:outline-none sm:px-4 sm:text-lg"
                    aria-label="Destination search"
                    id="hero-destination-input"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="flex h-11 w-11 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-cyan text-white shadow-[0_12px_28px_rgba(2,132,199,0.26)] transition-all hover:scale-[1.03] hover:bg-cyan-dim"
                    aria-label="Search destinations"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                </div>

              {!isSearchPinned && searchTerm && isSearchFocused && (
                <div className="absolute left-0 right-0 top-[calc(100%+14px)] z-30 text-left">
                  <div
                    ref={searchFormRef}
                    className="max-h-[min(70vh,520px)] overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
                  >
                    {suggestionRows.length > 0 ? (
                      <div className="overflow-y-auto overscroll-contain">
                        {suggestionRows.map((row) => (
                          <button
                            type="button"
                            key={row.key}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSuggestionRowClick(row)}
                            className="w-full flex items-start justify-between gap-3 px-4 py-3 text-sm text-text-primary hover:bg-white transition-colors text-left"
                          >
                            <span className="flex flex-col gap-0.5 min-w-0 flex-1">
                              {row.kind === "country" ? (
                                <>
                                  <span className="font-medium truncate">{row.country.name}</span>
                                  {row.hint ? (
                                    <span className="text-xs text-text-muted">{row.hint}</span>
                                  ) : null}
                                </>
                              ) : (
                                <>
                                  <span className="flex items-center gap-2 font-medium text-text-primary min-w-0">
                                    <MapPin size={14} className="text-cyan flex-shrink-0 mt-0.5" />
                                    <span className="truncate">{row.primaryLabel}</span>
                                  </span>
                                  <span className="text-xs text-text-muted pl-6 truncate">
                                    {row.detailLabel}
                                  </span>
                                </>
                              )}
                            </span>
                            <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-lg shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex-shrink-0">
                              {getCountryFlagEmoji(row.country.name, row.country.flagEmoji)}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-sm text-text-muted">
                        No matching destinations found.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Pinned Navbar Search */}
          <div
            className={`fixed inset-x-0 top-0 z-[1000] flex h-[72px] items-center transition-all duration-300 ${
              isSearchPinned ? "opacity-100" : "opacity-0 pointer-events-none"
            } ${
              effectiveMobileSearchExpanded 
                ? "bg-white px-2 sm:px-4 pointer-events-auto" 
                : `pointer-events-none justify-end md:justify-center px-4 sm:px-6 lg:px-8 ${isAuthenticated ? "pr-[104px]" : "pr-[62px]"} md:pr-4`
            }`}
          >
            <div className={`pointer-events-auto transition-all duration-300 ${effectiveMobileSearchExpanded ? "w-full flex items-center gap-2" : "w-auto md:w-full md:max-w-[34rem] lg:max-w-[38rem]"}`}>
              
              {effectiveMobileSearchExpanded && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileSearchExpanded(false);
                    setSearchDestination("");
                  }}
                  className="md:hidden flex-shrink-0 text-text-secondary p-2 ml-1 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!effectiveMobileSearchExpanded && window.innerWidth < 768) {
                    setMobileSearchExpanded(true);
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                    return;
                  }
                  handleSearch(e);
                }}
                autoComplete="off"
                className={`relative flex items-center justify-center transition-all duration-300 ${
                  effectiveMobileSearchExpanded
                    ? "flex-1 rounded-full border border-slate-200 bg-white h-11 px-2 pr-1 shadow-inner"
                    : "md:rounded-full md:border md:border-slate-200 md:bg-white md:h-11 md:w-full md:px-4 md:shadow-sm"
                }`}
              >
                <div className={`flex h-full w-full items-center ${effectiveMobileSearchExpanded ? "gap-1" : "md:gap-3"}`}>
                  <input
                    ref={isSearchPinned ? searchInputRef : null}
                    type="text"
                    placeholder="Search country"
                    value={searchDestination}
                    onChange={(e) => setSearchDestination(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={(e) => {
                      const nextFocused = e.relatedTarget;
                      if (searchFormRef.current?.contains(nextFocused)) return;
                      window.setTimeout(() => setIsSearchFocused(false), 120);
                    }}
                    className={`h-full min-w-0 flex-1 bg-transparent px-3 text-sm leading-none text-text-primary placeholder:text-[#858da3] focus:outline-none ${
                      effectiveMobileSearchExpanded ? "block" : "hidden md:block"
                    }`}
                  />
                  <button
                    type={!effectiveMobileSearchExpanded && window.innerWidth < 768 ? "button" : "submit"}
                    onClick={(e) => {
                      if (!effectiveMobileSearchExpanded && window.innerWidth < 768) {
                        e.preventDefault();
                        setMobileSearchExpanded(true);
                        setTimeout(() => searchInputRef.current?.focus(), 100);
                      }
                    }}
                    className={`flex items-center justify-center rounded-full transition-all flex-shrink-0 ${
                      effectiveMobileSearchExpanded
                        ? "h-9 w-9 text-cyan hover:bg-cyan/10"
                        : "h-10 w-10 bg-cyan/15 border border-cyan/30 text-cyan hover:bg-cyan/20 hover:shadow-cyan-glow md:border-0 md:h-8 md:w-8 md:bg-cyan md:text-white md:hover:scale-[1.03] md:hover:bg-cyan-dim md:shadow-sm"
                    }`}
                  >
                    <Search className={effectiveMobileSearchExpanded ? "h-4 w-4" : "h-5 w-5 md:h-4 md:w-4"} />
                  </button>
                </div>

                {isSearchPinned && searchTerm && isSearchFocused && (
                  <div className={`z-30 text-left ${effectiveMobileSearchExpanded ? "fixed inset-x-2 top-[72px] block md:absolute md:inset-x-0 md:top-[calc(100%+14px)]" : "hidden md:absolute md:inset-x-0 md:top-[calc(100%+14px)] md:block"}`}>
                    <div
                      ref={searchFormRef}
                      className="max-h-[min(70vh,520px)] overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
                    >
                      {suggestionRows.length > 0 ? (
                        <div className="overflow-y-auto overscroll-contain">
                          {suggestionRows.map((row) => (
                            <button
                              type="button"
                              key={row.key}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSuggestionRowClick(row)}
                              className="w-full flex items-start justify-between gap-3 px-4 py-3 text-sm text-text-primary hover:bg-white transition-colors text-left"
                            >
                              <span className="flex flex-col gap-0.5 min-w-0 flex-1">
                                {row.kind === "country" ? (
                                  <>
                                    <span className="font-medium truncate">{row.country.name}</span>
                                    {row.hint ? (
                                      <span className="text-xs text-text-muted">{row.hint}</span>
                                    ) : null}
                                  </>
                                ) : (
                                  <>
                                    <span className="flex items-center gap-2 font-medium text-text-primary min-w-0">
                                      <MapPin size={14} className="text-cyan flex-shrink-0 mt-0.5" />
                                      <span className="truncate">{row.primaryLabel}</span>
                                    </span>
                                    <span className="text-xs text-text-muted pl-6 truncate">
                                      {row.detailLabel}
                                    </span>
                                  </>
                                )}
                              </span>
                              <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-lg shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex-shrink-0">
                                {getCountryFlagEmoji(row.country.name, row.country.flagEmoji)}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-sm text-text-muted">
                          No matching destinations found.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* ── Pinned Filters (visible on scroll, desktop only) ── */}
          {siteConfig?.landingPage?.hideFilter !== true && (
            <div
              className={`fixed inset-x-0 top-[72px] z-[990] flex h-[64px] items-center justify-center transition-all duration-300 pointer-events-none ${
                isFilterPinned && !effectiveMobileSearchExpanded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
              }`}
            >
              <div className="hidden lg:flex items-center gap-3 filter-dropdown-container pointer-events-auto">
                {/* Visa Type */}
                <div className="relative">
                  <button type="button" onClick={() => setOpenDropdown(openDropdown === 'pinnedVisaType' ? null : 'pinnedVisaType')} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-text-primary shadow-sm  transition-colors hover:border-cyan hover:text-cyan">
                    {selectedVisaType} <ChevronDown size={14} className={`transition-transform ${openDropdown === 'pinnedVisaType' ? "rotate-180" : ""}`} />
                  </button>
                  {openDropdown === 'pinnedVisaType' && (
                    <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
                      {visaTypes.map((type) => (
                        <button key={type} onClick={() => { setSelectedVisaType(type); setOpenDropdown(null); }} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedVisaType === type ? "bg-cyan/10 text-cyan font-semibold" : "text-text-secondary hover:bg-white hover:text-text-primary"}`}>{type}</button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Validity */}
                <div className="relative">
                  <button type="button" onClick={() => setOpenDropdown(openDropdown === 'pinnedValidity' ? null : 'pinnedValidity')} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-text-primary shadow-sm  transition-colors hover:border-cyan hover:text-cyan">
                    {selectedValidity} <ChevronDown size={14} className={`transition-transform ${openDropdown === 'pinnedValidity' ? "rotate-180" : ""}`} />
                  </button>
                  {openDropdown === 'pinnedValidity' && (
                    <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
                      {validities.map((val) => (
                        <button key={val} onClick={() => { setSelectedValidity(val); setOpenDropdown(null); }} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedValidity === val ? "bg-cyan/10 text-cyan font-semibold" : "text-text-secondary hover:bg-white hover:text-text-primary"}`}>{val}</button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Length of Stay */}
                <div className="relative">
                  <button type="button" onClick={() => setOpenDropdown(openDropdown === 'pinnedLength' ? null : 'pinnedLength')} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-text-primary shadow-sm  transition-colors hover:border-cyan hover:text-cyan">
                    {selectedLengthOfStay} <ChevronDown size={14} className={`transition-transform ${openDropdown === 'pinnedLength' ? "rotate-180" : ""}`} />
                  </button>
                  {openDropdown === 'pinnedLength' && (
                    <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
                      {lengthsOfStay.map((len) => (
                        <button key={len} onClick={() => { setSelectedLengthOfStay(len); setOpenDropdown(null); }} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedLengthOfStay === len ? "bg-cyan/10 text-cyan font-semibold" : "text-text-secondary hover:bg-white hover:text-text-primary"}`}>{len}</button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Entry Type */}
                <div className="relative">
                  <button type="button" onClick={() => setOpenDropdown(openDropdown === 'pinnedEntry' ? null : 'pinnedEntry')} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-text-primary shadow-sm  transition-colors hover:border-cyan hover:text-cyan">
                    {selectedEntryType} <ChevronDown size={14} className={`transition-transform ${openDropdown === 'pinnedEntry' ? "rotate-180" : ""}`} />
                  </button>
                  {openDropdown === 'pinnedEntry' && (
                    <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
                      {entryTypes.map((type) => (
                        <button key={type} onClick={() => { setSelectedEntryType(type); setOpenDropdown(null); }} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedEntryType === type ? "bg-cyan/10 text-cyan font-semibold" : "text-text-secondary hover:bg-white hover:text-text-primary"}`}>{type}</button>
                      ))}
                    </div>
                  )}
                </div>
                {(selectedVisaType !== "All Visa Types" || selectedValidity !== "Any Validity" || selectedLengthOfStay !== "Any Length of Stay" || selectedEntryType !== "Any Entry Type") && (
                  <button onClick={clearFilters} className="text-sm font-medium text-[#0b1f45] transition-colors hover:text-cyan ml-2">Clear</button>
                )}
              </div>
            </div>
          )}

          {/* ── Standard Filter Bar (always visible in hero, sleek design) ── */}
          {siteConfig?.landingPage?.hideFilter !== true && (
            <div ref={filterAnchorRef} className="relative z-30 mx-auto mt-6 sm:mt-8 w-full max-w-6xl flex flex-col lg:flex-row lg:items-center rounded-3xl lg:rounded-[48px] bg-white p-2 lg:p-2 filter-dropdown-container animate-home-enter [animation-delay:40ms]">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-1 lg:items-center w-full">
                
                {/* Visa Type */}
                <div className="relative w-full lg:flex-1">
                  <button type="button" onClick={() => setOpenDropdown(openDropdown === 'heroVisaType' ? null : 'heroVisaType')} className="flex items-center justify-between w-full p-2 sm:p-3 lg:px-5 lg:py-2 hover:bg-white transition-colors lg:rounded-[36px] rounded-2xl group text-left">
                    <div className="flex items-center gap-3 lg:gap-4 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-[#eff4ff] text-[#0052cc] flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <FileText size={20} className="lg:w-5 lg:h-5" strokeWidth={1.5} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] lg:text-xs font-medium text-slate-500 mb-0.5">Visa Type</span>
                        <span className="text-sm lg:text-[15px] font-semibold text-slate-900 truncate">{selectedVisaType}</span>
                      </div>
                    </div>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform flex-shrink-0 ml-2 ${openDropdown === 'heroVisaType' ? "rotate-180 text-[#0052cc]" : "group-hover:text-[#0052cc]"}`} />
                  </button>
                  {openDropdown === 'heroVisaType' && (
                    <div className="absolute left-0 top-full z-10 mt-2 w-[calc(100vw-3rem)] sm:w-64 lg:w-full rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
                      {visaTypes.map((type) => (
                        <button key={type} onClick={() => { setSelectedVisaType(type); setOpenDropdown(null); }} className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${selectedVisaType === type ? "bg-[#eff4ff] text-[#0052cc] font-semibold" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}>{type}</button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="hidden lg:block w-[1px] h-10 bg-slate-100 flex-shrink-0 mx-1" />

                {/* Validity */}
                <div className="relative w-full lg:flex-1">
                  <button type="button" onClick={() => setOpenDropdown(openDropdown === 'heroValidity' ? null : 'heroValidity')} className="flex items-center justify-between w-full p-2 sm:p-3 lg:px-5 lg:py-2 hover:bg-white transition-colors lg:rounded-[36px] rounded-2xl group text-left">
                    <div className="flex items-center gap-3 lg:gap-4 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-[#eff4ff] text-[#0052cc] flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <CalendarDays size={20} className="lg:w-5 lg:h-5" strokeWidth={1.5} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] lg:text-xs font-medium text-slate-500 mb-0.5">Validity</span>
                        <span className="text-sm lg:text-[15px] font-semibold text-slate-900 truncate">{selectedValidity}</span>
                      </div>
                    </div>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform flex-shrink-0 ml-2 ${openDropdown === 'heroValidity' ? "rotate-180 text-[#0052cc]" : "group-hover:text-[#0052cc]"}`} />
                  </button>
                  {openDropdown === 'heroValidity' && (
                    <div className="absolute left-0 top-full z-10 mt-2 w-[calc(100vw-3rem)] sm:w-64 lg:w-full rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
                      {validities.map((val) => (
                        <button key={val} onClick={() => { setSelectedValidity(val); setOpenDropdown(null); }} className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${selectedValidity === val ? "bg-[#eff4ff] text-[#0052cc] font-semibold" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}>{val}</button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="hidden lg:block w-[1px] h-10 bg-slate-100 flex-shrink-0 mx-1" />

                {/* Length of Stay */}
                <div className="relative w-full lg:flex-1">
                  <button type="button" onClick={() => setOpenDropdown(openDropdown === 'heroLength' ? null : 'heroLength')} className="flex items-center justify-between w-full p-2 sm:p-3 lg:px-5 lg:py-2 hover:bg-white transition-colors lg:rounded-[36px] rounded-2xl group text-left">
                    <div className="flex items-center gap-3 lg:gap-4 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-[#eff4ff] text-[#0052cc] flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <Clock size={20} className="lg:w-5 lg:h-5" strokeWidth={1.5} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] lg:text-xs font-medium text-slate-500 mb-0.5">Length of Stay</span>
                        <span className="text-sm lg:text-[15px] font-semibold text-slate-900 truncate">{selectedLengthOfStay}</span>
                      </div>
                    </div>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform flex-shrink-0 ml-2 ${openDropdown === 'heroLength' ? "rotate-180 text-[#0052cc]" : "group-hover:text-[#0052cc]"}`} />
                  </button>
                  {openDropdown === 'heroLength' && (
                    <div className="absolute right-0 lg:left-0 top-full z-10 mt-2 w-[calc(100vw-3rem)] sm:w-64 lg:w-full rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
                      {lengthsOfStay.map((len) => (
                        <button key={len} onClick={() => { setSelectedLengthOfStay(len); setOpenDropdown(null); }} className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${selectedLengthOfStay === len ? "bg-[#eff4ff] text-[#0052cc] font-semibold" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}>{len}</button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="hidden lg:block w-[1px] h-10 bg-slate-100 flex-shrink-0 mx-1" />

                {/* Entry Type */}
                <div className="relative w-full lg:flex-1">
                  <button type="button" onClick={() => setOpenDropdown(openDropdown === 'heroEntry' ? null : 'heroEntry')} className="flex items-center justify-between w-full p-2 sm:p-3 lg:px-5 lg:py-2 hover:bg-white transition-colors lg:rounded-[36px] rounded-2xl group text-left">
                    <div className="flex items-center gap-3 lg:gap-4 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-[#eff4ff] text-[#0052cc] flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <Plane size={20} className="lg:w-5 lg:h-5" strokeWidth={1.5} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] lg:text-xs font-medium text-slate-500 mb-0.5">Entry Type</span>
                        <span className="text-sm lg:text-[15px] font-semibold text-slate-900 truncate">{selectedEntryType}</span>
                      </div>
                    </div>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform flex-shrink-0 ml-2 ${openDropdown === 'heroEntry' ? "rotate-180 text-[#0052cc]" : "group-hover:text-[#0052cc]"}`} />
                  </button>
                  {openDropdown === 'heroEntry' && (
                    <div className="absolute right-0 lg:left-0 top-full z-10 mt-2 w-[calc(100vw-3rem)] sm:w-64 lg:w-[120%] rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
                      {entryTypes.map((type) => (
                        <button key={type} onClick={() => { setSelectedEntryType(type); setOpenDropdown(null); }} className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${selectedEntryType === type ? "bg-[#eff4ff] text-[#0052cc] font-semibold" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}>{type}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Clear All */}
                {(selectedVisaType !== "All Visa Types" || selectedValidity !== "Any Validity" || selectedLengthOfStay !== "Any Length of Stay" || selectedEntryType !== "Any Entry Type") && (
                  <div className="col-span-1 sm:col-span-2 lg:col-span-1 flex justify-center lg:justify-end lg:pr-4 mt-2 lg:mt-0">
                    <button onClick={clearFilters} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-rose-500 transition-colors whitespace-nowrap lg:p-2 lg:bg-white lg:hover:bg-rose-50 lg:rounded-full">
                      <span className="lg:hidden">Clear all filters</span>
                      <X size={16} className="hidden lg:block" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div
            className="mx-auto mt-6 w-full max-w-5xl rounded-2xl bg-white px-4 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)] sm:mt-8 sm:px-6 animate-home-enter [animation-delay:80ms]"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {heroHighlights.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex items-center gap-3 rounded-xl px-2 py-2 lg:px-4 first:lg:pl-0 last:lg:pr-0">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-cyan">
                    <Icon size={20} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-tight text-[#0b1f45]">{title}</p>
                    <p className="mt-0.5 text-xs leading-4 text-[#496382]">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <LandingCountriesGrid
          countryIdsKey={countryIdsKey}
          filteredCountries={displayedCountries}
          countryCardRefs={countryCardRefs}
          display={countryDisplay}
          documentCatalog={documentCatalog}
          heading=""
          loading={shouldShowPopularCountriesLoading}
          globalRequirements={globalRequirements}
          showVisaRequirements={countryDisplay?.showRequiredDocuments !== false}
          onNavigateDestination={handleNavigateDestination}
          hasMore={visibleCount < filteredCountries.length}
          onLoadMore={() => setVisibleCount((v) => v + 12)}
        />
      </section>

      {showDeferredFooter ? (
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      ) : null}
    </div>
  );
};

export default LandingPage;
