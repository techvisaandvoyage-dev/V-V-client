import { memo } from "react";
import DestinationCard from "../country/DestinationCard";
import { getCountryRouteId } from "../../utils/countryRouting";

const LandingCountriesGrid = memo(
  function LandingCountriesGrid({
    countryIdsKey,
    filteredCountries,
    countryCardRefs,
    display,
    documentCatalog,
    heading = "Countries",
    loading = false,
    showVisaRequirements = true,
    onNavigateDestination,
    hasMore = false,
    onLoadMore,
  }) {
    const skeletonItems = Array.from({ length: 8 }, (_, index) => index);
    const showHeading = String(heading || "").trim().length > 0;

    return (
      <section id="destinations" className="pt-8 pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
        {showHeading ? (
          <div className="mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold">{heading}</h2>
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {skeletonItems.map((item) => (
              <div
                key={item}
                className="min-h-[500px] rounded-3xl border border-border bg-white overflow-hidden animate-pulse"
              >
                <div className="h-[58%] bg-slate-100" />
                <div className="space-y-4 p-6">
                  <div className="h-5 w-2/3 rounded-full bg-slate-100" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-14 rounded-2xl bg-slate-100" />
                    <div className="h-14 rounded-2xl bg-slate-100" />
                    <div className="h-14 rounded-2xl bg-slate-100" />
                    <div className="h-14 rounded-2xl bg-slate-100" />
                  </div>
                  <div className="h-10 rounded-2xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredCountries.map((country, i) => (
              <DestinationCard
                key={getCountryRouteId(country)}
                id={`country-card-${getCountryRouteId(country)}`}
                cardRef={(el) => {
                  countryCardRefs.current[getCountryRouteId(country)] = el;
                }}
                country={country}
                index={i}
                display={display}
                documentCatalog={documentCatalog}
                showVisaRequirements={showVisaRequirements}
                showTotalFee
                onClick={() => onNavigateDestination(country)}
              />
            ))}
          </div>
        )}
        
        {hasMore && !loading && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={onLoadMore}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-white px-8 font-semibold text-text-primary shadow-[0_2px_12px_rgba(15,23,42,0.06)] ring-1 ring-border transition-all hover:bg-surface hover:text-cyan hover:shadow-[0_8px_24px_rgba(14,116,217,0.12)] hover:ring-cyan/30 active:scale-[0.98]"
            >
              Show More Destinations
            </button>
          </div>
        )}
      </section>
    );
  },
  (prev, next) =>
    prev.countryIdsKey === next.countryIdsKey &&
    prev.display === next.display &&
    prev.documentCatalog === next.documentCatalog &&
    prev.heading === next.heading &&
    prev.loading === next.loading &&
    prev.showVisaRequirements === next.showVisaRequirements &&
    prev.hasMore === next.hasMore
);

export default LandingCountriesGrid;
