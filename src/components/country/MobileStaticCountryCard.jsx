import { memo, useMemo } from "react";
import { ArrowRight, Check } from "lucide-react";
import ImageWithShimmer from "../ui/ImageWithShimmer";
import CountryFlagBadge from "../ui/CountryFlagBadge";

function getCardVisaTypeLabel(visaTypeValue) {
  const value = String(visaTypeValue || "").trim();
  return value || "Tourist Visa";
}

function getProcessingDaysLabel(value) {
  const v = String(value ?? "").trim();
  if (!v) return "-";
  return /^\d+(\s*-\s*\d+)?$/.test(v) ? `${v} days` : v;
}

function getGovernmentFeeValue(country) {
  const candidates = [
    country?.governmentFee,
    country?.governmentFeeOverride,
    country?.governmentFees,
    country?.govtFee,
    country?.govFee,
    country?.embassyFee,
    country?.visaFee,
  ];
  const match = candidates.find((value) => Number.isFinite(Number(value)) && Number(value) >= 0);
  return Number.isFinite(Number(match)) ? Number(match) : 0;
}

function getServiceFeeValue(country) {
  return Number.isFinite(Number(country?.basePrice)) && Number(country.basePrice) >= 0
    ? Number(country.basePrice)
    : 0;
}

function getCountryTotalFeeValue(country) {
  const serviceFee = getServiceFeeValue(country);
  const governmentFee = getGovernmentFeeValue(country);
  const gstEnabled = country?.gstEnabled !== false;
  const gstRate = Number.isFinite(Number(country?.gstRate)) ? Number(country.gstRate) : 18;
  const gstAmount = gstEnabled ? Math.round(serviceFee * (gstRate / 100)) : 0;
  return governmentFee + serviceFee + gstAmount;
}

function buildCountryTiles(country, display, showTotalFee = false) {
  const tiles = [];
  if (display?.showVisaType !== false) {
    tiles.push({ key: "visaType", label: "VISA TYPE", value: getCardVisaTypeLabel(country.visaType) });
  }
  if (display?.showValidity !== false) {
    tiles.push({ key: "validity", label: "VALIDITY", value: country.validity || "-" });
  }
  if (display?.showProcessingDays !== false && tiles.length + 1 < 3) {
    tiles.push({
      key: "processingDays",
      label: "PROCESSING",
      value: getProcessingDaysLabel(country.processingDays),
    });
  }
  tiles.push({ key: "fees", label: "GOVT FEE", value: `₹${getGovernmentFeeValue(country)}` });
  return tiles;
}

function buildCountryTilesResolved(country, display, showTotalFee = false) {
  const tiles = [];
  if (display?.showVisaType !== false) {
    tiles.push({ key: "visaType", label: "VISA TYPE", value: getCardVisaTypeLabel(country.visaType) });
  }
  if (display?.showValidity !== false) {
    tiles.push({ key: "validity", label: "VALIDITY", value: country.validity || "-" });
  }
  if (display?.showProcessingDays !== false && tiles.length + 1 < 3) {
    tiles.push({
      key: "processingDays",
      label: "PROCESSING",
      value: getProcessingDaysLabel(country.processingDays),
    });
  }
  tiles.push({
    key: "fees",
    label: showTotalFee ? "TOTAL FEE" : "GOVT FEE",
    value: `₹${showTotalFee ? getCountryTotalFeeValue(country) : getGovernmentFeeValue(country)}`,
  });
  return tiles;
}

const GRID_COLS_BY_COUNT = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

const DOCUMENT_LABELS = {
  passport: "Passport",
  oldPassport: "Old Passport",
  photo: "Passport Photo",
  idCard: "Aadhaar / ID Card",
  panCard: "PAN Card",
  drivingLicense: "Driving License",
  birthCertificate: "Birth Certificate",
  dobCertificate: "DOB Certificate",
  marriageCertificate: "Marriage Certificate",
  educationCertificate: "Academic Records",
  employmentLetter: "Employment Letter",
  offerLetter: "Offer Letter",
  salarySlip: "Salary Slip",
  form16: "Form 16",
  taxReturn: "ITR / Tax Return",
  bankStatement: "Bank Statement",
  bankCertificate: "Bank Certificate",
  propertyDocuments: "Property Documents",
  travelInsurance: "Travel Insurance",
  healthInsurance: "Health Insurance",
  flightTicket: "Flight Ticket",
  hotelBooking: "Hotel Booking",
  itinerary: "Travel Itinerary",
  coverLetter: "Cover Letter",
  invitationLetter: "Invitation Letter",
  sponsorLetter: "Sponsor Letter",
  policeClearance: "Police Clearance",
  noObjectionCertificate: "NOC",
  yellowFever: "Yellow Fever",
  covidVaccination: "COVID Proof",
  visaApplicationForm: "Visa Form",
  businessLicense: "Business License",
  companyRegistration: "Company Registration",
};

function getCountryDocuments(country) {
  const docs =
    country?.documentRequirements ||
    country?.documentsRequired ||
    country?.requiredDocuments ||
    country?.documentChecklist ||
    country?.visaRequirements ||
    [];

  if (Array.isArray(docs)) {
    return docs.map((d) => (typeof d === "string" ? d : d.label || d.key || "")).filter(Boolean);
  }

  if (typeof docs === "string") {
    return docs
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getDocumentLabel(key, documentCatalog) {
  if (!key) return "";
  if (key.length > 20 || key.includes(" ")) return key;

  const fromCatalog = documentCatalog?.find?.((d) => d.key === key)?.label;
  if (fromCatalog) return fromCatalog;
  if (DOCUMENT_LABELS[key]) return DOCUMENT_LABELS[key];

  return key
    .replace(/^custom_/, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim();
}

const MobileStaticCountryCard = memo(function MobileStaticCountryCard({
  country,
  index = 0,
  display,
  documentCatalog = [],
  showVisaRequirements = true,
  showTotalFee = false,
  onClick,
  cardRef,
  id,
}) {
  const allDocs = useMemo(() => getCountryDocuments(country).slice(0, 4), [country]);
  const tiles = useMemo(
    () => buildCountryTilesResolved(country, display, showTotalFee),
    [country, display, showTotalFee]
  );
  const cols = GRID_COLS_BY_COUNT[tiles.length] || "grid-cols-3";
  // Memoized so height is not recalculated on every parent re-render
  const panelHeight = useMemo(
    () => 110 + Math.ceil(allDocs.length / 2) * 32,
    [allDocs.length]
  );

  return (
    <div
      ref={cardRef}
      id={id}
      className="group relative h-full cursor-pointer animate-card-in"
      onClick={onClick}
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <div className="relative isolate h-full min-h-[420px] overflow-hidden rounded-3xl border border-border bg-white transition-all duration-300 hover:border-cyan/30 hover:shadow-cyan-glow">
        <ImageWithShimmer
          src={country.imageUrl}
          alt={country.name}
          className="h-full min-h-[400px] [&>img]:contrast-125 [&>img]:saturate-125"
          priority={index < 4}
          width={400}
          height={600}
          quality={82}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
        >
          {/* Dark gradient for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-opacity duration-500" />

          {/* Hover state: Blur that covers the raised panel & text, but keeps the top image clear */}
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-[8px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ maskImage: 'linear-gradient(to top, black 0%, black 55%, transparent 85%)', WebkitMaskImage: 'linear-gradient(to top, black 0%, black 55%, transparent 85%)' }}
          />

          <CountryFlagBadge country={country} sizeClass="h-10 w-10" className="absolute left-4 top-4 z-30 text-3xl" />

          {!country.imageUrl ? (
            <CountryFlagBadge
              country={country}
              sizeClass="h-16 w-16"
              className="absolute left-1/2 top-[40%] -translate-x-1/2 text-5xl"
            />
          ) : null}

          <div
            className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-end p-6"
            style={{ willChange: "transform", backfaceVisibility: "hidden" }}
          >
            <div className={`mb-6 text-center ${country.imageUrl ? "" : "translate-y-[-20%]"}`}>
              <h3
                className="text-3xl font-bold uppercase leading-tight tracking-wide text-white drop-shadow-2xl"
              >
                {country.name}
              </h3>
            </div>

                <div className={`grid ${cols} gap-2 text-center`}>
                  {tiles.map((tile) => (
                    <div key={tile.key} className="min-w-0">
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-white/80 drop-shadow-md">
                        {tile.label}
                      </p>
                      <p className="truncate text-[12px] font-bold text-white drop-shadow-xl" title={tile.value}>
                        {tile.value}
                      </p>
                    </div>
                  ))}
                </div>
          </div>

          {showVisaRequirements && (
            <div
              className="absolute bottom-0 left-0 right-0 z-20 flex flex-col p-6"
              style={{
                height: panelHeight,
                transform: `translateY(${panelHeight}px)`,
                willChange: "transform",
                background: "linear-gradient(to bottom, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.5) 100%)",
                maskImage: "linear-gradient(to top, black 80%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to top, black 80%, transparent 100%)",
              }}
            >
              <p className="mb-4 px-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/50 drop-shadow-md">
                Documents Required
              </p>

              <div className="flex-1">
                {allDocs.length > 0 ? (
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-3.5">
                    {allDocs.map((key, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-1.5 text-[11px] font-semibold leading-tight text-white/95 drop-shadow-lg"
                      >
                        <Check size={11} className="mt-0.5 shrink-0 text-cyan" strokeWidth={3} />
                        <span className="line-clamp-2" title={getDocumentLabel(key, documentCatalog)}>
                          {getDocumentLabel(key, documentCatalog)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 px-1 text-[11px] italic text-white/60">Documents will be shown on details page</p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Instant Application</span>
                <div className="flex items-center gap-1.5 text-cyan">
                  <span className="text-[10px] font-black uppercase">Apply Now</span>
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          )}
        </ImageWithShimmer>
      </div>
    </div>
  );
});

export default MobileStaticCountryCard;
