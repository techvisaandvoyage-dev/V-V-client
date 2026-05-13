import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Button from "../components/ui/Button";
import ImageWithShimmer from "../components/ui/ImageWithShimmer";
import { useCountries } from "../hooks/useCountries";
import { getCountryFlagEmoji, getCountryCardCodeBadge } from "../utils/countrySearch";

// Reuse the same scroll-in animation style to keep page transitions consistent.
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.5, ease: "easeOut" },
};

const AllDestinationsPage = () => {
  const navigate = useNavigate();
  const { countries } = useCountries();

  const getVisaCardTypeLabel = (visaTypeValue) => {
    const value = String(visaTypeValue || "").toLowerCase();
    if (value.includes("free")) return "Visa Free";
    if (value.includes("e-visa") || value.includes("evisa")) return "e-Visa Only";
    return "All Visa Types";
  };

  // Always open this listing from the top when users arrive from the landing page CTA.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  // Always go to actual previous browser history entry.
  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero copy introduces the dedicated destinations listing page. */}
        <section className="border-b border-border bg-surface/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft size={16} />}
              onClick={handleBack}
              className="mb-6 w-fit"
              id="all-destinations-back-btn"
            >
              Back
            </Button>

            <motion.div {...fadeUp} className="max-w-3xl">
              <span className="text-xs font-semibold text-cyan uppercase tracking-widest mb-3 block">
                Explore More
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary mb-4">
                All Destinations
              </h1>
              <p className="text-text-secondary text-base sm:text-lg leading-relaxed">
                Browse every available visa destination in one place and open any country
                page to review pricing, processing time, and application details.
              </p>
            </motion.div>
          </div>
        </section>

        {/* The card grid mirrors the landing page so the experience feels familiar. */}
        <section className="py-10 sm:py-14 px-4 sm:px-6 max-w-7xl mx-auto w-full">
          <motion.div
            {...fadeUp}
            className="flex items-center justify-between gap-4 flex-wrap mb-8"
          >
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
                Available Countries
              </h2>
              <p className="text-text-secondary mt-2">
                {countries.length} destinations ready to explore
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {countries.map((country, index) => (
              <motion.div
                key={country.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                whileHover="hover"
                variants={{ hover: { y: -6, scale: 1.03, transition: { duration: 0.18, ease: "easeOut" } } }}
                style={{ willChange: "transform" }}
                className="group cursor-pointer h-full"
                onClick={() => navigate(`/destination/${country.id}`)}
              >
                <div className="bg-surface border border-border rounded-3xl overflow-hidden hover:border-cyan/30 hover:shadow-cyan-glow transition-shadow duration-200 h-full min-h-[500px]">
                  <ImageWithShimmer
                    src={country.imageUrl}
                    alt={country.name}
                    className="h-full min-h-[500px]"
                    priority={index < 4}
                    width={500}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/95" />

                    {!country.imageUrl ? (
                      <div
                        className="absolute top-[40%] left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white/92 border border-white/70 shadow-xl flex items-center justify-center text-3xl select-none"
                        role="img"
                        aria-label={country.name}
                      >
                        {getCountryFlagEmoji(country.name, country.flagEmoji)}
                      </div>
                    ) : null}

                    <div className="absolute top-3 left-3 text-[10px] font-semibold text-white drop-shadow-md bg-black/50 px-2 py-1 rounded-md">
                      {getCountryCardCodeBadge(country)}
                    </div>

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
                      <div className="grid grid-cols-2 pb-2 gap-2 text-center text-xs">
                        <div>
                          <p className="text-[15px] tracking-widest text-white/65 mb-0.5">VISA TYPE</p>
                          <p className="text-[13px] font-semibold text-white">{getVisaCardTypeLabel(country.visaType)}</p>
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
      </main>

      <Footer />
    </div>
  );
};

export default AllDestinationsPage;
