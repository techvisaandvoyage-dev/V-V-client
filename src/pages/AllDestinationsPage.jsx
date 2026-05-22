import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Button from "../components/ui/Button";
import DestinationCard from "../components/country/DestinationCard";
import { useCountries } from "../hooks/useCountries";
import { getCountryRouteId } from "../utils/countryRouting";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.5, ease: "easeOut" },
};

const AllDestinationsPage = () => {
  const navigate = useNavigate();
  const { countries, display, documentCatalog } = useCountries();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="border-b border-border bg-surface/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft size={16} />}
              onClick={() => navigate(-1)}
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

        <section className="py-10 sm:py-14 px-4 sm:px-6 max-w-7xl mx-auto w-full">
          <motion.div {...fadeUp} className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
                Available Countries
              </h2>
              <p className="mt-2 text-text-secondary">{countries.length} destinations ready to explore</p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {countries.map((country, index) => (
              <DestinationCard
                key={getCountryRouteId(country)}
                country={country}
                index={index}
                display={display}
                documentCatalog={documentCatalog}
                showVisaRequirements={display?.showRequiredDocuments !== false}
                onClick={() => navigate(`/destination/${encodeURIComponent(getCountryRouteId(country))}`)}
              />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AllDestinationsPage;
