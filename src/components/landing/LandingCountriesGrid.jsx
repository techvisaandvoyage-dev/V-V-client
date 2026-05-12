import { memo } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Button from "../ui/Button";
import ImageWithShimmer from "../ui/ImageWithShimmer";
import { getCountryFlagEmoji, getCountryCardCodeBadge } from "../../utils/countrySearch";

function getVisaCardTypeLabel(visaTypeValue) {
  const value = String(visaTypeValue || "").toLowerCase();
  if (value.includes("free")) return "Visa Free";
  if (value.includes("e-visa") || value.includes("evisa")) return "e-Visa Only";
  return "All Visa Types";
}

/**
 * Isolated grid so typing / geocode updates in the hero do not re-render these heavy cards.
 */
const LandingCountriesGrid = memo(function LandingCountriesGrid({
  filteredCountries,
  countryCardRefs,
  onNavigateDestination,
  onNavigateAll,
}) {
  return (
    <section id="destinations" className="pt-8 pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-3xl sm:text-4xl font-bold">Countries</h2>
        <Button
          variant="secondary"
          rightIcon={<ArrowRight size={16} />}
          onClick={onNavigateAll}
          id="view-all-destinations-btn"
        >
          View All Countries
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredCountries.map((country, i) => (
          <motion.div
            ref={(el) => {
              countryCardRefs.current[country.id] = el;
            }}
            key={country.id}
            id={`country-card-${country.id}`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ delay: Math.min(i * 0.04, 0.6), duration: 0.4 }}
            whileHover="hover"
            variants={{ hover: { y: -6, scale: 1.03, transition: { duration: 0.18, ease: "easeOut" } } }}
            style={{ willChange: "transform" }}
            className="group cursor-pointer h-full"
            onClick={() => onNavigateDestination(country.id)}
          >
            <div className="bg-surface border border-border rounded-3xl overflow-hidden hover:border-cyan/30 hover:shadow-cyan-glow transition-shadow duration-200 h-full min-h-[500px]">
              <ImageWithShimmer
                src={country.imageUrl}
                alt={country.name}
                className="h-full min-h-[500px]"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/95" />

                  <div className="absolute top-3 left-3 text-[10px] font-semibold text-white drop-shadow-md bg-black/50 px-2 py-1 rounded-md">
                    {getCountryCardCodeBadge(country)}
                  </div>

                {!country.imageUrl ? (
                  <div
                    className="absolute top-[40%] left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white/92 border border-white/70 shadow-xl flex items-center justify-center text-3xl select-none"
                    role="img"
                    aria-label={country.name}
                  >
                    {getCountryFlagEmoji(country.name, country.flagEmoji)}
                  </div>
                ) : null}

                <div
                  className={`absolute left-0 w-full px-3 text-center ${
                    country.imageUrl ? "top-1/2 -translate-y-1/2" : "top-[52%]"
                  }`}
                >
                  <h3 className="font-semibold text-white text-2xl tracking-wide drop-shadow-md uppercase leading-tight">
                    {country.name}
                  </h3>
                </div>

                <div className="absolute bottom-0 left-0 w-full p-6">
                  <div className="grid grid-cols-2 pb-2 gap-2 text-center">
                    <div>
                      <p className="text-[15px] tracking-widest text-white/65 mb-0.5">VISA TYPE</p>
                      <p className="text-[13px] font-semibold text-white">
                        {getVisaCardTypeLabel(country.visaType)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[15px] tracking-widest text-white/65 mb-0.5">FEES</p>
                      <p className="text-[13px] font-semibold text-white">₹{country.basePrice}</p>
                    </div>
                  </div>
                </div>
              </ImageWithShimmer>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}, (prev, next) => prev.countryIdsKey === next.countryIdsKey);

export default LandingCountriesGrid;

