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
  ShieldCheck, FileText, Lock, Zap,
} from "lucide-react";

const AVAILABLE_ICONS = {
  Zap, ShieldCheck, FileText, Lock, CheckCircle, Clock,
  Globe, Users, CreditCard, MapPin, Plane, HeartHandshake, Smile, Search
};
import Navbar from "../components/layout/Navbar";
import LandingCountriesGrid from "../components/landing/LandingCountriesGrid";
import { normalizeCountryFromApi, useCountries } from "../hooks/useCountries";
import { api } from "../store/authStore";
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
const POPULAR_COUNTRIES_CACHE_KEY = "vb_popular_countries_home_v1";
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
  const searchFormRef = useRef(null);
  const geocodeAbortRef = useRef(null);
  const popularFetchStartedRef = useRef(false);
  const geocodeReqSeq = useRef(0);
  const homeExitGuardRef = useRef(false);
  const { countries: allCountries, trendingCountries, display: countryDisplay, documentCatalog } = useCountries();

  // Global requirements for merging logic on cards
  const [globalRequirements, setGlobalRequirements] = useState([]);
  const [showVisaRequirements, setShowVisaRequirements] = useState(true);
  const [heroHighlights, setHeroHighlights] = useState(DEFAULT_HERO_HIGHLIGHTS);
  const [popularCountryCards, setPopularCountryCards] = useState(() => loadPopularCountriesCache());
  const [popularCountriesLoading, setPopularCountriesLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNTRY_CARD_COUNT);
  const [isSearchPinned, setIsSearchPinned] = useState(false);
  const [showDeferredFooter, setShowDeferredFooter] = useState(false);


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
        const { data } = await api.get("/countries/popular", { params: { limit: 250 } });
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
    const term = searchDestination.trim();
    if (!term) {
      if (popularCountryCards.length > 0) return popularCountryCards;
      if (popularCountriesLoading) return [];
      return allCountries.length > 0 ? allCountries : trendingCountries;
    }
    const local = allCountries.filter((country) => matchesCountrySearch(country, term));
    const byId = new Map(local.map((c) => [getCountryRouteId(c), c]));
    for (const p of geocodePlaces) {
      const country = allCountries.find(
        (c) => c.id === p.countrySlug || c.name === p.countryName
      );
      const routeId = getCountryRouteId(country);
      if (country && !byId.has(routeId)) byId.set(routeId, country);
    }
    return Array.from(byId.values());
  }, [searchDestination, popularCountryCards, trendingCountries, allCountries, geocodePlaces]);

  const shouldShowPopularCountriesLoading =
    !searchDestination.trim() &&
    popularCountriesLoading &&
    popularCountryCards.length === 0;

  /** Stable key so the memoized grid skips re-rendering when unrelated parent state ticks. */
  const displayedCountries = useMemo(() => {
    return filteredCountries.slice(0, visibleCount);
  }, [filteredCountries, visibleCount]);

  const countryIdsKey = useMemo(
    () => displayedCountries.map((c) => getCountryRouteId(c)).join("|"),
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
    let triggerTop = 0;
    let rafId = null;
    let resizeTimer = null;

    const measureSearchPosition = () => {
      const anchor = searchAnchorRef.current;
      if (!anchor) return;
      // getBoundingClientRect is batched here — called at most once per resize
      triggerTop = anchor.getBoundingClientRect().top + window.scrollY;
    };

    // rAF-throttled scroll: browser batches layout reads, no forced reflow per scroll px
    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!triggerTop) measureSearchPosition();
        setIsSearchPinned(window.scrollY >= triggerTop);
      });
    };

    // Debounced resize: only re-measure after user stops resizing (150ms)
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measureSearchPosition, 150);
    };

    measureSearchPosition();
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

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section id="hero" className="relative bg-white pt-8 sm:pt-10">
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            ref={searchAnchorRef}
            className={isSearchPinned ? "h-16" : ""}
          >
          <div
            className={
              isSearchPinned
                ? "pointer-events-none fixed inset-x-0 top-0 z-[100] flex h-16 items-center px-4 sm:px-6 lg:px-8"
                : "relative z-20 mx-auto w-full max-w-[48rem] bg-white py-2 sm:py-3 animate-home-enter"
            }
            >
              <div className={isSearchPinned ? "pointer-events-auto mx-auto w-full max-w-[34rem] md:max-w-[36rem] lg:max-w-[38rem]" : ""}>
            <form
              onSubmit={handleSearch}
              autoComplete="off"
              className="relative h-16 rounded-full border border-sky-100 bg-white px-4 shadow-[0_16px_38px_rgba(15,23,42,0.11)] sm:px-5"
              role="search"
              aria-label="Search visa destinations"
            >
              <div className="flex h-full items-center gap-3">
                <input
                  ref={searchInputRef}
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
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-cyan text-white shadow-[0_12px_28px_rgba(2,132,199,0.26)] transition-all hover:scale-[1.03] hover:bg-cyan-dim sm:h-12 sm:w-12"
                  aria-label="Search destinations"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>

              {searchTerm && isSearchFocused && (
                <div className="absolute left-0 right-0 top-[calc(100%+14px)] z-30 text-left">
                  <div
                    ref={searchFormRef}
                    className="max-h-[min(70vh,520px)] overflow-hidden rounded-2xl border border-border bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
                  >
                    {suggestionRows.length > 0 ? (
                      <div className="overflow-y-auto overscroll-contain divide-y divide-border">
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
                            <span className="w-9 h-9 rounded-full bg-white border border-border flex items-center justify-center text-lg shadow-sm flex-shrink-0">
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
          </div>

          <div
            className="mx-auto mt-6 w-full max-w-5xl rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-[0_10px_28px_rgba(2,132,199,0.06)] sm:mt-8 sm:px-6 animate-home-enter [animation-delay:80ms]"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-sky-100">
              {heroHighlights.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex items-center gap-3 rounded-xl px-2 py-2 lg:px-4 first:lg:pl-0 last:lg:pr-0">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-sky-50 text-cyan">
                    <Icon size={18} strokeWidth={2.2} />
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
