import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, CreditCard, Loader2, ShieldCheck, Info, FileText, CreditCard as CreditCardIcon, ImageIcon } from "lucide-react";
import SharedGoogleDriveLinkSection from "../components/application/SharedGoogleDriveLinkSection";
import PassportUploadRow from "../components/application/PassportUploadRow";
import Navbar from "../components/layout/Navbar";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { api, SERVER_URL, useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { openRazorpayForApplication, validateRazorpayCheckoutReadiness } from "../utils/razorpayCheckout";
import { slugifyCountryRoute } from "../utils/countryRouting";
import { getLocalDateYmd } from "../utils/dateInput";
import { useCountries, useMergedCountry } from "../hooks/useCountries";
import { optimizeUploadFile } from "../utils/optimizeUploadFile";
import { formatOrdinalDate } from "../utils/dateUtils";
import { saveTravelDraft } from "../utils/travelDraftStorage";
import { getFileValidationRules } from "../utils/fileValidation";
import FilePreviewModal from "../components/ui/FilePreviewModal";
import { getFileUrl } from "../utils/fileUrl";
import CountryFlagBadge from "../components/ui/CountryFlagBadge";

const SUMMARY_UPLOAD_MAX_BYTES = 300 * 1024;

// ── Document metadata catalog (mirrors ApplicationForm.jsx) ──────────────────
const DOCUMENT_META = {
  passport: { label: "Passport Upload", Icon: FileText },
  oldPassport: { label: "Old Passport Upload", Icon: FileText },
  photo: { label: "Passport Photo Upload", Icon: ImageIcon },
  idCard: { label: "Aadhaar / ID Card Upload", Icon: CreditCardIcon },
  panCard: { label: "PAN Card Upload", Icon: CreditCardIcon },
  drivingLicense: { label: "Driving License Upload", Icon: FileText },
  birthCertificate: { label: "Birth Certificate Upload", Icon: FileText },
  dobCertificate: { label: "DOB Certificate Upload", Icon: FileText },
  marriageCertificate: { label: "Marriage Certificate Upload", Icon: FileText },
  educationCertificate: { label: "Education / Academic Records Upload", Icon: FileText },
  employmentLetter: { label: "Employment Letter Upload", Icon: FileText },
  offerLetter: { label: "Offer Letter Upload", Icon: FileText },
  salarySlip: { label: "Salary Slip / Pay Stub Upload", Icon: FileText },
  bankStatement: { label: "Bank Statement Upload", Icon: FileText },
  travelInsurance: { label: "Travel Insurance Upload", Icon: FileText },
  flightTicket: { label: "Flight Ticket Upload", Icon: FileText },
  hotelBooking: { label: "Hotel Booking Upload", Icon: FileText },
  itinerary: { label: "Travel Itinerary Upload", Icon: FileText },
  coverLetter: { label: "Cover Letter Upload", Icon: FileText },
  invitationLetter: { label: "Invitation Letter Upload", Icon: FileText },
  sponsorLetter: { label: "Sponsor / Affidavit Letter Upload", Icon: FileText },
  policeClearance: { label: "Police Clearance Certificate Upload", Icon: FileText },
  noObjectionCertificate: { label: "No Objection Certificate Upload", Icon: FileText },
  visaApplicationForm: { label: "Visa Application Form Upload", Icon: FileText },
  companyRegistration: { label: "Company Registration Certificate Upload", Icon: FileText },
};

/**
 * Build a list of required document field descriptors from the country's requiredDocuments array.
 * Always puts passport first; falls back to [passport] if the list is empty.
 */
const buildDocFields = (documentKeys = ["passport"], catalog = []) => {
  const keys = Array.isArray(documentKeys) && documentKeys.length ? documentKeys : ["passport"];
  const seen = new Set();
  const normalizedKeys = ["passport", ...keys.filter((key) => key !== "passport")];
  const catalogByKey = new Map(
    (Array.isArray(catalog) ? catalog : [])
      .map((item) => ({
        key: String(item?.key ?? "").trim(),
        label: String(item?.label ?? "").trim(),
        description: String(item?.description ?? "").trim(),
      }))
      .filter((item) => item.key && item.key !== "[object Object]")
      .map((item) => [item.key, item])
  );
  const fields = normalizedKeys.reduce((acc, key, index) => {
    if (!key || seen.has(key)) return acc;
    seen.add(key);
    const catalogItem = catalogByKey.get(key);
    acc.push({
      key,
      label: catalogItem?.label || DOCUMENT_META[key]?.label || `${key.replace(/([A-Z])/g, " $1")} Upload`,
      Icon: DOCUMENT_META[key]?.Icon || FileText,
      required: index === 0,
    });
    return acc;
  }, []);
  return fields.length
    ? fields
    : [{ key: "passport", label: DOCUMENT_META.passport.label, Icon: FileText, required: true }];
};

const getDocumentDisplayName = (label = "") =>
  String(label || "").replace(/\s*Upload\s*$/i, "").trim();
const isReusableUnpaidApplication = (application) => {
  const paymentStatus = String(application?.paymentStatus || "").trim().toLowerCase();
  return ["pending_payment", "failed", "cancelled"].includes(paymentStatus);
};

const formatFileSize = (size = 0) => {
  if (!size) return "0 KB";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const normalizeProcessingDays = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const matches = String(value || "").match(/\d+/g);
  if (!matches?.length) return 0;
  return Number(matches[matches.length - 1]);
};

/** Same slug as `/terms` and the CMS seed — public GET `/api/pages/:slug`. */
const TERMS_CMS_SLUG = "terms-and-conditions";

const formatTravelerDateForInput = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const formatSummaryDate = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return formatOrdinalDate(parsed);
};



const getTravelerPassportDetail = (application, travelerNo) => {
  const traveler = Array.isArray(application?.travellerDocuments)
    ? application.travellerDocuments.find((entry) => Number(entry?.travelerNo) === Number(travelerNo))
    : null;
  if (!traveler) return null;

  const docs = traveler.documents;
  const url =
    docs instanceof Map
      ? docs.get("passport")
      : typeof docs?.get === "function"
        ? docs.get("passport")
        : docs?.passport;
  if (!url) return null;

  const details = traveler.documentDetails;
  const detail =
    details instanceof Map
      ? details.get("passport")
      : typeof details?.get === "function"
        ? details.get("passport")
        : details?.passport;

  return {
    url,
    fileName: detail?.fileName || String(url).split("/").pop() || "Passport",
    fileSize: Number(detail?.fileSize || 0),
    mimeType: detail?.mimeType || "",
  };
};

const getTravelerPassportDetailFromSummaryData = (summaryData, travelerNo) => {
  const details =
    summaryData?.uploadedDocDetails && typeof summaryData.uploadedDocDetails === "object"
      ? summaryData.uploadedDocDetails
      : null;
  if (!details) return null;

  const detail = details[travelerNo] || details[String(travelerNo)];
  if (!detail?.url) return null;

  return {
    url: detail.url,
    fileName: detail.fileName || String(detail.url).split("/").pop() || "Passport",
    fileSize: Number(detail?.fileSize || 0),
    mimeType: detail?.mimeType || "",
  };
};

const getTravelerPassportDetailForSummary = (application, summaryData, travelerNo) =>
  getTravelerPassportDetail(application, travelerNo) ||
  getTravelerPassportDetailFromSummaryData(summaryData, travelerNo);

const getTravelerDocumentDetail = (application, travelerNo, docKey) => {
  const traveler = Array.isArray(application?.travellerDocuments)
    ? application.travellerDocuments.find((entry) => Number(entry?.travelerNo) === Number(travelerNo))
    : null;
  if (!traveler) return null;
  const docs = traveler.documents;
  const url =
    docs instanceof Map
      ? docs.get(docKey)
      : typeof docs?.get === "function"
        ? docs.get(docKey)
        : docs?.[docKey];
  if (!url) return null;
  const details = traveler.documentDetails;
  const detail =
    details instanceof Map
      ? details.get(docKey)
      : typeof details?.get === "function"
        ? details.get(docKey)
        : details?.[docKey];
  return {
    url,
    fileName: detail?.fileName || String(url).split("/").pop() || docKey,
    fileSize: Number(detail?.fileSize || 0),
    mimeType: detail?.mimeType || "",
  };
};

const buildTravelerDocSuccessMap = ({ application, summaryData, uploadSuccesses, travelerCount }) => {
  const applicationSuccesses = buildSuccessMapFromApplication(application);
  const summarySuccesses =
    !application && summaryData?.uploadedDocSuccesses && typeof summaryData.uploadedDocSuccesses === "object"
      ? summaryData.uploadedDocSuccesses
      : {};
  const merged = {
    ...summarySuccesses,
    ...uploadSuccesses,
    ...applicationSuccesses,
  };
  return merged;
};

// Keep legacy alias for backward compat with syncPaymentSummarySource
const buildTravelerPassportSuccessMap = buildTravelerDocSuccessMap;

const buildTravelerPassportDetailsMap = (application, travelerCount) => {
  const details = {};

  Array.from({ length: travelerCount }).forEach((_, index) => {
    const travelerNo = index + 1;
    const passportDetail = getTravelerPassportDetail(application, travelerNo);
    if (passportDetail?.url) {
      details[travelerNo] = passportDetail;
    }
  });

  return details;
};

const syncPaymentSummarySource = ({ application, applicationId, summaryData, docsSkipped, hiddenUploadedPassportNos }) => {
  try {
    const raw = sessionStorage.getItem("paymentSummarySource");
    const existing = raw ? JSON.parse(raw) : {};
    const travelerCount = Math.max(
      1,
      Number(application?.travellerCount || summaryData?.travellerCount || 1)
    );
    const nextSummaryData = {
      ...(existing?.summaryData && typeof existing.summaryData === "object" ? existing.summaryData : {}),
      ...(summaryData && typeof summaryData === "object" ? summaryData : {}),
      applicationId: application?._id || applicationId || summaryData?.applicationId || existing?.applicationDraftId || null,
      sharedDriveLink: String(application?.gdriveLink || summaryData?.sharedDriveLink || "").trim(),
      uploadedDocSuccesses: buildTravelerPassportSuccessMap({
        application,
        summaryData,
        uploadSuccesses: {},
        travelerCount,
      }),
      uploadedDocDetails: buildTravelerPassportDetailsMap(application, travelerCount),
      hiddenPassportTravelerNos:
        hiddenUploadedPassportNos && typeof hiddenUploadedPassportNos === "object"
          ? hiddenUploadedPassportNos
          : {},
    };

    sessionStorage.setItem(
      "paymentSummarySource",
      JSON.stringify({
        ...(existing && typeof existing === "object" ? existing : {}),
        applicationDraftId: nextSummaryData.applicationId,
        docsSkipped,
        summaryData: nextSummaryData,
      })
    );
  } catch {
    /* ignore storage errors */
  }
};

const getApplicationDocSuccessStorageKey = (applicationId) =>
  applicationId ? `application-doc-successes:${applicationId}` : "";

const buildSuccessMapFromApplication = (application) => {
  const map = {};
  const travelers = Array.isArray(application?.travellerDocuments)
    ? application.travellerDocuments
    : [];

  travelers.forEach((traveler) => {
    const travelerNo = String(traveler?.travelerNo || "");
    if (!travelerNo) return;

    const docs = traveler?.documents;
    if (docs instanceof Map) {
      docs.forEach((value, key) => {
        if (value) map[`${travelerNo}-${key}`] = true;
      });
      return;
    }

    if (docs && typeof docs === "object") {
      Object.entries(docs).forEach(([key, value]) => {
        if (value) map[`${travelerNo}-${key}`] = true;
      });
    }
  });

  return map;
};

const getStoredApplicationDocSuccesses = (applicationId) => {
  if (!applicationId) return {};
  try {
    const raw = localStorage.getItem(getApplicationDocSuccessStorageKey(applicationId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const setStoredApplicationDocSuccesses = (applicationId, successes) => {
  if (!applicationId) return;
  try {
    localStorage.setItem(
      getApplicationDocSuccessStorageKey(applicationId),
      JSON.stringify(successes && typeof successes === "object" ? successes : {})
    );
  } catch {
    /* ignore storage errors */
  }
};

const buildFallbackApplication = (applicationId, summaryData) => {
  if (!summaryData) return null;
  return {
    _id: applicationId || null,
    applicationId: summaryData.applicationId || applicationId || null,
    countryId: summaryData.countryId || "",
    countryName: summaryData.countryName || "Visa",
    flagEmoji: summaryData.flagEmoji || "",
    visaType: summaryData.visaType || "e-Visa",
    travellerCount: summaryData.travellerCount || 1,
    travelerNames: Array.isArray(summaryData.travelerNames) ? summaryData.travelerNames : [],
    fee: Number(summaryData.fee || 0),
    gdriveLink: summaryData.sharedDriveLink || "",
    travellerDocuments: [],
  };
};

const ApplicationSummaryPage = () => {
  const { id: paramId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const persistedSummarySource = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("paymentSummarySource");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
  const summaryData = location.state?.summaryData || persistedSummarySource?.summaryData || null;
  const [docsSkipped, setDocsSkipped] = useState(() => Boolean(location.state?.docsSkipped ?? persistedSummarySource?.docsSkipped));
  const isDashboardSummaryRoute = location.pathname.startsWith("/dashboard/application/");
  const id = isDashboardSummaryRoute
    ? (
        paramId ||
        location.state?.applicationDraftId ||
        summaryData?.applicationId ||
        persistedSummarySource?.applicationDraftId ||
        null
      )
    : (
        location.state?.applicationDraftId ||
        summaryData?.applicationId ||
        persistedSummarySource?.applicationDraftId ||
        paramId ||
        null
      );
  const { user } = useAuthStore();
  const { showToast } = useUIStore();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsPage, setTermsPage] = useState(null);
  const [termsPageLoading, setTermsPageLoading] = useState(false);
  const [termsPageError, setTermsPageError] = useState("");
  const [paying, setPaying] = useState(false);
  const [uploadDocumentsModalOpen, setUploadDocumentsModalOpen] = useState(false);
  const [uploadModalTravelers, setUploadModalTravelers] = useState([]);
  const [uploadModalDriveLink, setUploadModalDriveLink] = useState("");
  const [uploadModalErrors, setUploadModalErrors] = useState({});
  const [uploadModalUploading, setUploadModalUploading] = useState({});
  const [uploadModalOptimizing, setUploadModalOptimizing] = useState({});
  const [uploadSuccesses, setUploadSuccesses] = useState({});
  const [hiddenUploadedPassportNos, setHiddenUploadedPassportNos] = useState(
    () => (
      summaryData?.hiddenPassportTravelerNos && typeof summaryData.hiddenPassportTravelerNos === "object"
        ? summaryData.hiddenPassportTravelerNos
        : summaryData?.hiddenUploadedPassportNos && typeof summaryData.hiddenUploadedPassportNos === "object"
          ? summaryData.hiddenUploadedPassportNos
          : {}
    )
  );
  const [passportPreview, setPassportPreview] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [uploadSettings, setUploadSettings] = useState({ enableFileUpload: true, enableGDriveUpload: true, allowedFileFormats: ["pdf", "jpg", "jpeg", "png"] });
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [razorpayMessage, setRazorpayMessage] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/config/upload-settings");
        if (alive && data?.success && data.config) {
          setUploadSettings(data.config);
        }
      } catch {
        /* keep defaults */
      }
    })();
    return () => { alive = false; };
  }, []);
  const countryIdForPricing = summaryData?.countryId || application?.countryId || "";
  const { countries: allCountries } = useCountries();
  const listCountry = allCountries.find((c) => c.id === countryIdForPricing);
  const country = useMergedCountry(countryIdForPricing, listCountry);
  const fallbackApplication = useMemo(
    () => buildFallbackApplication(id, summaryData),
    [id, summaryData]
  );
  const applicationIdForUploads = String(
    application?._id || application?.applicationId || id || summaryData?.applicationId || ""
  );

  useEffect(() => {
    if (!summaryData && typeof location.state?.docsSkipped === "undefined") return;
    try {
      sessionStorage.setItem(
        "paymentSummarySource",
        JSON.stringify({
          ...(persistedSummarySource && typeof persistedSummarySource === "object"
            ? persistedSummarySource
            : {}),
          applicationDraftId: id || persistedSummarySource?.applicationDraftId || null,
          docsSkipped,
          summaryData: summaryData || persistedSummarySource?.summaryData || null,
        })
      );
    } catch {
      /* ignore storage errors */
    }
  }, [docsSkipped, id, location.state?.docsSkipped, persistedSummarySource, summaryData]);

  useEffect(() => {
    const nextHidden =
      summaryData?.hiddenPassportTravelerNos && typeof summaryData.hiddenPassportTravelerNos === "object"
        ? summaryData.hiddenPassportTravelerNos
        : summaryData?.hiddenUploadedPassportNos && typeof summaryData.hiddenUploadedPassportNos === "object"
          ? summaryData.hiddenUploadedPassportNos
          : null;
    if (nextHidden) {
      setHiddenUploadedPassportNos(nextHidden);
    }
  }, [summaryData]);

  useEffect(() => {
    if (!application) return;
    syncPaymentSummarySource({
      application,
      applicationId: applicationIdForUploads,
      summaryData,
      docsSkipped,
      hiddenUploadedPassportNos,
    });
  }, [application, applicationIdForUploads, docsSkipped, hiddenUploadedPassportNos, summaryData]);

  useEffect(() => {
    setUploadSuccesses(getStoredApplicationDocSuccesses(applicationIdForUploads));
  }, [applicationIdForUploads]);

  useEffect(() => {
    if (!applicationIdForUploads) return;
    const serverSuccesses = buildSuccessMapFromApplication(application);
    if (!Object.keys(serverSuccesses).length) return;
    const merged = {
      ...getStoredApplicationDocSuccesses(applicationIdForUploads),
      ...serverSuccesses,
    };
    setStoredApplicationDocSuccesses(applicationIdForUploads, merged);
    setUploadSuccesses((prev) => ({ ...prev, ...merged }));
  }, [application, applicationIdForUploads]);

  const targetAppId = id || summaryData?.applicationId;

  useEffect(() => {
    if (!targetAppId) {
      if (fallbackApplication) {
        setApplication(fallbackApplication);
      } else if (summaryData) {
        setApplication({
          _id: null,
          countryName: summaryData.countryName || "Visa",
          flagEmoji: summaryData.flagEmoji || "🛂",
          visaType: summaryData.visaType || "e-Visa",
          travellerCount: summaryData.travellerCount || 1,
          travelerNames: summaryData.travelerNames || [],
          fee: Number(summaryData.fee || 0),
          travellerDocuments: summaryData.docsUploaded ? [{}] : [],
        });
      }
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/users/applications/${targetAppId}`);
        if (data?.success) setApplication(data.application);
        else showToast(data?.message || "Could not load application.", "error");
      } catch (err) {
        if (fallbackApplication) {
          setApplication(fallbackApplication);
        }
        if (err?.response?.status === 401 && fallbackApplication) {
          showToast("Session expired. Showing your saved summary. Please log in again to sync the latest uploads.", "info");
        } else {
          showToast(err.response?.data?.message || "Could not load application summary.", "error");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fallbackApplication, targetAppId, summaryData, showToast]);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const result = await validateRazorpayCheckoutReadiness();
      if (!mounted) return; 
      setRazorpayReady(!!result.ok);
      setRazorpayMessage(result.ok ? "" : result.message || "Razorpay unavailable.");
    };
    check();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!targetAppId) return;
    let cancelled = false;

    const refreshApplication = async () => {
      try {
        const { data } = await api.get(`/users/applications/${targetAppId}`);
        if (!cancelled && data?.success && data.application) {
          setApplication(data.application);
        }
      } catch {
        /* non-blocking background refresh */
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshApplication();
      }
    };

    window.addEventListener("focus", refreshApplication);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshApplication);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [targetAppId]);

  useEffect(() => {
    if (!termsModalOpen) return;
    if (termsPage) return;
    let cancelled = false;
    const loadTerms = async () => {
      setTermsPageLoading(true);
      setTermsPageError("");
      try {
        const { data } = await api.get(`/pages/${TERMS_CMS_SLUG}`);
        if (cancelled) return;
        if (data?.page) setTermsPage(data.page);
        else setTermsPageError(data?.message || "Terms page is not available.");
      } catch (err) {
        if (!cancelled) {
          setTermsPageError(err.response?.data?.message || "Could not load terms and conditions.");
        }
      } finally {
        if (!cancelled) setTermsPageLoading(false);
      }
    };
    loadTerms();
    return () => { cancelled = true; };
  }, [termsModalOpen, termsPage]);

  const travelerCount = Math.max(1, Number(application?.travellerCount || 1));
  const summaryVisaType = summaryData?.visaType || application?.visaType || "e-Visa";
  const summaryTravelDateFrom = summaryData?.travelDateFrom ?? application?.travelDate ?? null;
  const summaryTravelDateTo = summaryData?.travelDateTo ?? application?.returnDate ?? null;
  const summaryTravelRange = summaryTravelDateFrom || summaryTravelDateTo
    ? `${formatSummaryDate(summaryTravelDateFrom)} - ${formatSummaryDate(summaryTravelDateTo)}`
    : "—";

  const travelerNames = useMemo(() => {
    const names = Array.isArray(application?.travelerNames) ? application.travelerNames : [];
    return Array.from({ length: travelerCount }).map((_, i) => names[i] || `Traveler ${i + 1}`);
  }, [application?.travelerNames, travelerCount]);

  const effectiveGstEnabled =
    typeof summaryData?.gstEnabled === "boolean"
      ? summaryData.gstEnabled
      : country?.gstEnabled !== false;
  const effectiveGstRate = Number.isFinite(Number(summaryData?.gstRate))
    ? Number(summaryData.gstRate)
    : Number.isFinite(Number(country?.gstRate))
      ? Number(country.gstRate)
      : 18;

  const governmentFeePerTraveler = useMemo(() => {
    const candidates = [
      summaryData?.governmentFeePerTraveler,
      summaryData?.governmentFee,
      country?.governmentFee,
      country?.governmentFeeOverride,
      country?.governmentFees,
      country?.govtFee,
      country?.govFee,
      country?.embassyFee,
      country?.visaFee,
    ];

    const resolved = candidates.find((value) => Number.isFinite(Number(value)));
    return Number.isFinite(Number(resolved)) ? Number(resolved) : 0;
  }, [
    summaryData?.governmentFeePerTraveler,
    summaryData?.governmentFee,
    country?.governmentFee,
    country?.governmentFeeOverride,
    country?.governmentFees,
    country?.govtFee,
    country?.govFee,
    country?.embassyFee,
    country?.visaFee,
  ]);

  const { serviceFee, taxes, governmentFeeTotal, totalAmount } = useMemo(() => {
    const service = Number.isFinite(Number(summaryData?.baseFee))
      ? Number(summaryData.baseFee)
      : Number.isFinite(Number(country?.basePrice))
        ? Number(country.basePrice) * travelerCount
        : 0;
    const gst = Number.isFinite(Number(summaryData?.gstAmount))
      ? Number(summaryData.gstAmount)
      : effectiveGstEnabled
        ? Math.round(service * (effectiveGstRate / 100))
        : 0;
    const governmentFee = Number.isFinite(Number(summaryData?.governmentFeeTotal))
      ? Number(summaryData.governmentFeeTotal)
      : governmentFeePerTraveler * travelerCount;
    const fromServer = Number(application?.fee);
    const fromState = Number(summaryData?.fee);
    return {
      serviceFee: service,
      taxes: gst,
      governmentFeeTotal: governmentFee,
      totalAmount:
        Number.isFinite(fromServer) && fromServer > 0
          ? fromServer
          : Number.isFinite(fromState) && fromState > 0
            ? fromState
            : governmentFee + service + gst,
    };
  }, [
    application?.fee,
    summaryData?.fee,
    summaryData?.baseFee,
    summaryData?.gstAmount,
    summaryData?.governmentFeeTotal,
    country?.basePrice,
    travelerCount,
    effectiveGstEnabled,
    effectiveGstRate,
    governmentFeePerTraveler,
  ]);

  /**
   * IMPORTANT: `application.travellerDocuments` is created with one entry per
   * traveler by the upload flow even when the user uploads no files (the form
   * still calls `PUT /users/applications/:id` to save the traveler name /
   * gdriveLink). So `travellerDocuments.length >= travelerCount` is NOT a
   * reliable signal — we have to look at whether each entry actually contains
   * a non-empty `documents` map (or any `otherDocuments` / `gdriveLink`).
   *
   * Priority:
   *   1. If the caller explicitly told us via `location.state.docsSkipped`
   *      that the user chose to skip the upload step → docsUploaded = false.
   *   2. If `summaryData.docsUploaded` is an explicit boolean → trust it.
   *   3. Otherwise inspect each traveler entry on the server record.
   */
  // Dynamic document fields computed from country required docs
  const requiredDocFields = useMemo(
    () => buildDocFields(country?.requiredDocuments, country?.documentCatalog),
    [country?.requiredDocuments, country?.documentCatalog]
  );

  const travelerPassportSuccesses = useMemo(
    () => buildTravelerDocSuccessMap({
      application,
      summaryData,
      uploadSuccesses,
      travelerCount,
    }),
    [application, summaryData, uploadSuccesses, travelerCount]
  );

  const allRequiredUploaded = useMemo(() => {
    const visibleDocFields = uploadSettings.enableFileUpload
      ? (requiredDocFields || [{ key: "passport" }])
      : (requiredDocFields || [{ key: "passport" }]).filter((f) => f.key === "passport");

    return Array.from({ length: travelerCount }).every((_, index) => {
      const travelerNo = index + 1;
      if (hiddenUploadedPassportNos[travelerNo]) return false;
      return visibleDocFields.every(field => 
        Boolean(travelerPassportSuccesses[`${travelerNo}-${field.key}`])
      );
    });
  }, [requiredDocFields, uploadSettings.enableFileUpload, travelerCount, hiddenUploadedPassportNos, travelerPassportSuccesses]);

  const hasGDriveLink = Boolean(uploadSettings.enableGDriveUpload && String(application?.gdriveLink || summaryData?.sharedDriveLink || "").trim());

  const isFullySubmitted = allRequiredUploaded && (!uploadSettings.enableGDriveUpload || hasGDriveLink);

  const docsUploaded = useMemo(() => {
    if (docsSkipped) return false;
    return isFullySubmitted;
  }, [docsSkipped, isFullySubmitted]);

  const passportPreviewIsPdf = passportPreview?.mimeType.includes("pdf")
    || /\.pdf($|\?)/i.test(String(passportPreview?.url || ""));
  const passportPreviewIsImage = /^image\//i.test(String(passportPreview?.mimeType || ""))
    || /\.(png|jpe?g|gif|webp|bmp|svg)($|\?)/i.test(String(passportPreview?.url || ""));

  useEffect(() => {
    if (!application || !applicationIdForUploads || !Object.keys(travelerPassportSuccesses).length) return;
    setStoredApplicationDocSuccesses(applicationIdForUploads, travelerPassportSuccesses);
    setUploadSuccesses((prev) => {
      const missingEntries = Object.entries(travelerPassportSuccesses).filter(
        ([key, value]) => value && !prev[key]
      );
      if (!missingEntries.length) return prev;
      return { ...prev, ...travelerPassportSuccesses };
    });
  }, [applicationIdForUploads, travelerPassportSuccesses]);

  const ensureApplicationDraft = async () => {
    let app = application;
    let appId = app?._id;

    if (!appId && id) {
      try {
        const { data } = await api.get(`/users/applications/${id}`);
        if (data?.success && data.application?._id && isReusableUnpaidApplication(data.application)) {
          app = data.application;
          appId = data.application._id;
          setApplication(data.application);
        }
      } catch {
        /* fall through to draft creation */
      }
    }

    if (!appId && summaryData?.countryId) {
      const { data } = await api.post("/users/application/checkout-draft", {
        applicationDraftId: String(id || summaryData?.applicationId || "").trim() || undefined,
        countryId: summaryData.countryId,
        countryName: summaryData.countryName,
        flagEmoji: summaryData.flagEmoji || "🛂",
        visaType: summaryData.visaType || "e-Visa",
        travelDateFrom: summaryData.travelDateFrom ?? null,
        travelDateTo: summaryData.travelDateTo ?? null,
        travellerCount: summaryData.travellerCount || 1,
        travelerNames: Array.isArray(summaryData.travelerNames) ? summaryData.travelerNames : [],
        travelers: Array.isArray(summaryData.travelers) ? summaryData.travelers : [],
        processingDays: normalizeProcessingDays(summaryData.processingDays),
      });
      if (!data?.success || !data.application?._id) {
        throw new Error(data?.message || "Could not start application.");
      }
      app = data.application;
      appId = data.application._id;
      setApplication(data.application);
    }

    if (!appId) {
      throw new Error("Application not found. Go back and continue from the document step.");
    }

    return { app, appId };
  };

  const openUploadDocumentsModal = () => {
    const uploadedEntries = Array.isArray(application?.travellerDocuments)
      ? application.travellerDocuments
      : [];
    const firstDriveLink = uploadedEntries.find((entry) => String(entry?.gdriveLink || "").trim())?.gdriveLink || "";
    setUploadModalTravelers(
      Array.from({ length: travelerCount }).map((_, index) => ({
        id: index + 1,
        name: travelerNames[index] || `Traveler ${index + 1}`,
        // files is a map of docKey -> File (for files chosen but not yet uploaded)
        files: {},
        // uploadedDocs is a map of docKey -> bool (already uploaded to server)
        uploadedDocs: Object.fromEntries(
          (requiredDocFields || [{ key: "passport" }]).map((f) => [
            f.key,
            Boolean(travelerPassportSuccesses[`${index + 1}-${f.key}`]) && !hiddenUploadedPassportNos[index + 1],
          ])
        ),
      }))
    );
    setUploadModalDriveLink(
      String(summaryData?.sharedDriveLink || application?.gdriveLink || firstDriveLink || "").trim()
    );
    setUploadModalErrors({});
    setUploadModalUploading({});
    setUploadModalOptimizing({});
    setUploadDocumentsModalOpen(true); 
  };

  const openPassportPreview = (travelerNo) => {
    const detail = getTravelerPassportDetailForSummary(application, summaryData, travelerNo);
    const previewUrl = getFileUrl(detail?.url);
    if (!detail || !previewUrl) {
      showToast("Preview is not available for this file yet.", "error");
      return;
    }
    setPassportPreview({
      url: previewUrl,
      fileName: detail.fileName || `Traveler ${travelerNo} Passport`,
      mimeType: String(detail.mimeType || "").toLowerCase(),
    });
  };

  const closePassportPreview = () => {
    setPassportPreview(null);
  };

  const openDocumentPreview = (travelerNo, docKey) => {
    let detail = getTravelerDocumentDetail(application, travelerNo, docKey);
    if (!detail) {
      try {
        const zoneKey = `${travelerNo}-${docKey}`;
        const raw = localStorage.getItem(`application-doc-details:${applicationIdForUploads}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const entry = parsed?.[zoneKey];
          if (entry?.url) detail = entry;
        }
      } catch { /* ignore */ }
    }
    const previewUrl = getFileUrl(detail?.url);
    if (!detail || !previewUrl) {
      showToast("Preview is not available for this file yet.", "error");
      return;
    }
    setDocumentPreview({
      url: previewUrl,
      fileName: detail.fileName || `Traveler ${travelerNo} ${docKey}`,
      mimeType: String(detail.mimeType || "").toLowerCase(),
    });
  };

  const closeDocumentPreview = () => {
    setDocumentPreview(null);
  };

  const removeUploadedDoc = async (travelerNo, travelerIndex, docKey) => {
    try {
      const { appId } = await ensureApplicationDraft();
      const { data } = await api.put(`/users/applications/${appId}`, {
        travelerUpdate: {
          travelerNo: String(travelerNo),
          removeDocumentTypes: [docKey],
        },
      });
      if (!data?.success || !data.application) {
        throw new Error(data?.message || "Could not remove document.");
      }

      setApplication(data.application);
      if (docKey === "passport") {
        setHiddenUploadedPassportNos((prev) => { const n = { ...prev }; delete n[travelerNo]; return n; });
        if (passportPreview) closePassportPreview();
      }
      setUploadSuccesses((prev) => {
        const next = { ...prev };
        delete next[`${travelerNo}-${docKey}`];
        setStoredApplicationDocSuccesses(appId, next);
        try {
          const detailsKey = `application-doc-details:${appId}`;
          const raw = localStorage.getItem(detailsKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            delete parsed[`${travelerNo}-${docKey}`];
            localStorage.setItem(detailsKey, JSON.stringify(parsed));
          }
        } catch { /* ignore */ }
        return next;
      });
      setUploadModalTravelers((prev) =>
        prev.map((traveler, ti) => (
          ti === travelerIndex
            ? {
                ...traveler,
                files: { ...(traveler.files || {}), [docKey]: null },
                uploadedDocs: { ...(traveler.uploadedDocs || {}), [docKey]: false },
              }
            : traveler
        ))
      );
      showToast(`${getDocumentDisplayName(DOCUMENT_META[docKey]?.label || docKey)} removed successfully.`, "success");
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || "Could not remove document.", "error");
    }
  };

  useEffect(() => {
    if (!uploadDocumentsModalOpen) return;
    setUploadModalTravelers((prev) => (
      prev.length
        ? prev.map((traveler, index) => ({
            ...traveler,
            name: travelerNames[index] || `Traveler ${index + 1}`,
            uploadedDocs: Object.fromEntries(
              (requiredDocFields || [{ key: "passport" }]).map((f) => [
                f.key,
                Boolean(travelerPassportSuccesses[`${index + 1}-${f.key}`]) && !hiddenUploadedPassportNos[index + 1],
              ])
            ),
          }))
        : Array.from({ length: travelerCount }).map((_, index) => ({
            id: index + 1,
            name: travelerNames[index] || `Traveler ${index + 1}`,
            files: {},
            uploadedDocs: Object.fromEntries(
              (requiredDocFields || [{ key: "passport" }]).map((f) => [
                f.key,
                Boolean(travelerPassportSuccesses[`${index + 1}-${f.key}`]) && !hiddenUploadedPassportNos[index + 1],
              ])
            ),
          }))
    ));
  }, [uploadDocumentsModalOpen, travelerCount, travelerNames, travelerPassportSuccesses, hiddenUploadedPassportNos, requiredDocFields]);

  /**
   * Handle file selection + upload for any required document type.
   * @param {number} travelerIndex - 0-based traveler index
   * @param {string} docKey - e.g. "passport", "panCard", "idCard"
   * @param {File} file
   */
  const handleUploadModalDocChange = async (travelerIndex, docKey, file) => {
    if (!file) return;
    const zoneKey = `${travelerIndex}-${docKey}`;
    const rules = getFileValidationRules(uploadSettings?.allowedFileFormats);
    if (!rules.isValidFile(file)) {
      const err = `Only ${rules.displayLabel} files are allowed.`;
      setUploadModalErrors((prev) => ({ ...prev, [zoneKey]: err }));
      showToast(err, "error");
      return;
    }
    setUploadModalUploading((prev) => ({ ...prev, [zoneKey]: true }));
    setUploadModalOptimizing((prev) => ({ ...prev, [zoneKey]: true }));
    const { file: optimizedFile, error } = await optimizeUploadFile(file, { targetBytes: SUMMARY_UPLOAD_MAX_BYTES });
    setUploadModalOptimizing((prev) => { const n = { ...prev }; delete n[zoneKey]; return n; });
    if (error || !optimizedFile) {
      setUploadModalErrors((prev) => ({ ...prev, [zoneKey]: error || "Could not prepare this file for upload." }));
      showToast(error || "Could not prepare this file for upload.", "error");
      setUploadModalUploading((prev) => { const n = { ...prev }; delete n[zoneKey]; return n; });
      return;
    }
    if (optimizedFile.size > SUMMARY_UPLOAD_MAX_BYTES) {
      const message = "Document is too large. Please upload a smaller file.";
      setUploadModalErrors((prev) => ({ ...prev, [zoneKey]: message }));
      showToast(message, "error");
      setUploadModalUploading((prev) => { const n = { ...prev }; delete n[zoneKey]; return n; });
      return;
    }
    setUploadModalErrors((prev) => { const n = { ...prev }; delete n[zoneKey]; return n; });
    try {
      const { appId } = await ensureApplicationDraft();
      const travelerNo = travelerIndex + 1;
      const travelerName = travelerNames[travelerIndex] || `Traveler ${travelerNo}`;
      const formData = new FormData();
      const ext = (optimizedFile.name.split(".").pop() || "").toLowerCase();
      const safeExt = ext ? `.${ext}` : "";
      formData.append(
        "documents",
        new File([optimizedFile], `traveler-${travelerNo}_${docKey}${safeExt}`, { type: optimizedFile.type })
      );
      formData.append("travelerNo", String(travelerNo));
      formData.append("travelerName", travelerName);
      formData.append("documentsMeta", JSON.stringify([{ docType: docKey, kind: "required" }]));

      const { data } = await api.post(`/users/applications/${appId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!data?.success || !data?.application) {
        throw new Error(data?.message || "Could not upload document.");
      }

      setApplication(data.application);
      // Extract document detail from server response
      const docDetail = (() => {
        const traveller = Array.isArray(data.application.travellerDocuments)
          ? data.application.travellerDocuments.find((e) => Number(e?.travelerNo) === Number(travelerNo))
          : null;
        if (!traveller) return null;
        const docs = traveller.documents;
        const url =
          docs instanceof Map
            ? docs.get(docKey)
            : typeof docs?.get === "function"
              ? docs.get(docKey)
              : docs?.[docKey];
        if (!url) return null;
        const dets = traveller.documentDetails;
        const det =
          dets instanceof Map
            ? dets.get(docKey)
            : typeof dets?.get === "function"
              ? dets.get(docKey)
              : dets?.[docKey];
        return { url, fileName: det?.fileName || String(url).split("/").pop() || docKey, fileSize: Number(det?.fileSize || 0), mimeType: det?.mimeType || "" };
      })();
      // Remove from hidden list if it was the passport
      if (docKey === "passport") {
        setHiddenUploadedPassportNos((prev) => { const n = { ...prev }; delete n[travelerNo]; return n; });
      }
      setUploadSuccesses((prev) => {
        setDocsSkipped(false);
        const next = { ...prev, [`${travelerNo}-${docKey}`]: true };
        setStoredApplicationDocSuccesses(appId, next);
        return next;
      });
      if (docDetail) {
        try {
          const detailsKey = `application-doc-details:${appId}`;
          const raw = localStorage.getItem(detailsKey);
          const existing = raw ? JSON.parse(raw) : {};
          localStorage.setItem(detailsKey, JSON.stringify({ ...existing, [`${travelerNo}-${docKey}`]: docDetail }));
        } catch { /* ignore */ }
      }
      setUploadModalTravelers((prev) =>
        prev.map((traveler, ti) => (
          ti === travelerIndex
            ? {
                ...traveler,
                files: { ...(traveler.files || {}), [docKey]: null },
                uploadedDocs: { ...(traveler.uploadedDocs || {}), [docKey]: true },
              }
            : traveler
        ))
      );
      showToast(`${getDocumentDisplayName(DOCUMENT_META[docKey]?.label || docKey)} uploaded successfully!`, "success");
    } catch (err) {
      setUploadModalErrors((prev) => ({
        ...prev,
        [zoneKey]: err?.response?.data?.message || err?.message || "Could not upload document.",
      }));
      showToast(err?.response?.data?.message || err?.message || "Could not upload document.", "error");
    } finally {
      setUploadModalUploading((prev) => { const n = { ...prev }; delete n[zoneKey]; return n; });
    }
  };

  const persistUploadDocumentsState = async () => {
    const sharedLink = String(uploadModalDriveLink || "").trim();
    try {
      const { appId } = await ensureApplicationDraft();
      if (sharedLink) {
        const { data } = await api.put(`/users/applications/${appId}`, { gdriveLink: sharedLink });
        if (data?.success && data.application) {
          setApplication(data.application);
        }
      }
      showToast("Upload details saved.", "success");
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || "Could not save upload details.", "error");
    }
  };

  const closeUploadDocumentsModal = async () => {
    await persistUploadDocumentsState();
    setUploadDocumentsModalOpen(false);
  };

  const handleDriveLinkBlurSave = async () => {
    const sharedLink = String(uploadModalDriveLink || "").trim();
    if (!sharedLink) return;
    try {
      const { appId } = await ensureApplicationDraft();
      const { data } = await api.put(`/users/applications/${appId}`, { gdriveLink: sharedLink });
      if (data?.success && data.application) {
        setDocsSkipped(false);
        setApplication(data.application);
        showToast("Google Drive link saved.", "success");
      }
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || "Could not save Drive link.", "error");
    }
  };

  const handleBack = () => {
    const formatDateToYmd = (val) => {
      if (!val) return null;
      const str = String(val);
      if (str.includes("T")) return str.slice(0, 10);
      return str;
    };

    const travelDetailsPassportSuccesses = {};
    if (travelerPassportSuccesses && typeof travelerPassportSuccesses === "object") {
      Object.entries(travelerPassportSuccesses).forEach(([key, val]) => {
        if (key.endsWith("-passport")) {
          const num = key.replace("-passport", "");
          if (val) {
            travelDetailsPassportSuccesses[num] = true;
          }
        } else if (!isNaN(Number(key))) {
          if (val) {
            travelDetailsPassportSuccesses[key] = true;
          }
        }
      });
    }

    const travelDetailsPassportDetails = {
      ...(summaryData?.uploadedDocDetails && typeof summaryData.uploadedDocDetails === "object"
        ? summaryData.uploadedDocDetails
        : {}),
      ...buildTravelerPassportDetailsMap(application, travelerCount),
    };

    const uploadedDocDetails = (() => {
      const details = {};
      if (!application?.travellerDocuments) return details;
      Array.from({ length: travelerCount }).forEach((_, idx) => {
        const travelerNo = idx + 1;
        const traveler = Array.isArray(application.travellerDocuments)
          ? application.travellerDocuments.find((e) => Number(e?.travelerNo) === Number(travelerNo))
          : null;
        if (!traveler) return;
        const docs = traveler.documents;
        const dets = traveler.documentDetails;
        if (!docs) return;
        const docEntries = docs instanceof Map ? [...docs.entries()] : Object.entries(docs || {});
        docEntries.forEach(([docKey, url]) => {
          if (!url) return;
          const det =
            dets instanceof Map
              ? dets.get(docKey)
              : typeof dets?.get === "function"
                ? dets.get(docKey)
                : dets?.[docKey];
          details[`${travelerNo}-${docKey}`] = {
            url,
            fileName: det?.fileName || String(url).split("/").pop() || docKey,
            fileSize: Number(det?.fileSize || 0),
            mimeType: det?.mimeType || "",
          };
        });
      });
      return details;
    })();

    const restoreTravelDetails = {
      travelDateFrom: formatDateToYmd(summaryData?.travelDateFrom ?? application?.travelDate),
      travelDateTo: formatDateToYmd(summaryData?.travelDateTo ?? application?.returnDate),
      visaOption: summaryData?.visaType || application?.visaType,
      sharedDriveLink: String(summaryData?.sharedDriveLink || application?.gdriveLink || "").trim(),
      applicationDraftId: id || applicationIdForUploads || null,
      passportSuccesses: travelDetailsPassportSuccesses,
      passportDetails: travelDetailsPassportDetails,
      hiddenPassportTravelerNos: hiddenUploadedPassportNos,
      travelers: Array.isArray(summaryData?.travelers) && summaryData.travelers.length
        ? summaryData.travelers.map((traveler) => ({
            ...traveler,
            name: traveler?.name ?? traveler?.fullName ?? "",
          }))
        : (Array.isArray(application?.travelerSelections) && application.travelerSelections.length
            ? application.travelerSelections.map((entry, index) => ({
                travelerProfileId: entry?.travelerProfileId || entry?.travelerSnapshot?.travelerProfileId || "",
                fullName: entry?.travelerSnapshot?.fullName || application?.travelerNames?.[index] || "",
                name: entry?.travelerSnapshot?.fullName || application?.travelerNames?.[index] || "",
                dateOfBirth: formatTravelerDateForInput(entry?.travelerSnapshot?.dateOfBirth),
                gender: entry?.travelerSnapshot?.gender || "",
                passportNumber: entry?.travelerSnapshot?.passportNumber || "",
                passportExpiryDate: formatTravelerDateForInput(entry?.travelerSnapshot?.passportExpiryDate),
                nationality: entry?.travelerSnapshot?.nationality || "",
                mobileNumber: entry?.travelerSnapshot?.mobileNumber || "",
                email: entry?.travelerSnapshot?.email || "",
                relationship: entry?.travelerSnapshot?.relationship || "Self",
              }))
            : (summaryData?.travelerNames || application?.travelerNames || []).map((name) => ({
                name: String(name || ""),
                fullName: String(name || ""),
              }))),
    };

    const savedCountryId = localStorage.getItem("lastActiveCountryId");
    const savedCountryName = localStorage.getItem("lastActiveCountryName");

    let exactBackPath = location.state?.backTo || location.state?.applicationPrev?.path;
    if (!exactBackPath) {
      try {
        const rawSource = sessionStorage.getItem("paymentSummarySource");
        if (rawSource) {
          const source = JSON.parse(rawSource);
          if (source?.backTo) exactBackPath = source.backTo;
        }
      } catch (e) {
        /* ignore */
      }
    }

    const countryRoute = slugifyCountryRoute(
      summaryData?.countryName ||
      application?.countryName ||
      savedCountryName ||
      ""
    );

    if (exactBackPath || countryRoute) {
      const draftCountryKey = exactBackPath ? exactBackPath.split('/').pop() : countryRoute;
      try {
        const hasNewData =
          restoreTravelDetails.travelers &&
          restoreTravelDetails.travelers.length > 0 &&
          restoreTravelDetails.travelers.some((t) => String(t.name || "").trim().length > 0);

        if (hasNewData) {
          saveTravelDraft(draftCountryKey, {
            applicationId: restoreTravelDetails.applicationDraftId,
            travelDateFrom: restoreTravelDetails.travelDateFrom,
            travelDateTo: restoreTravelDetails.travelDateTo,
            visaOption: restoreTravelDetails.visaOption,
            sharedDriveLink: restoreTravelDetails.sharedDriveLink,
            travelers: restoreTravelDetails.travelers,
            passportSuccesses: travelDetailsPassportSuccesses,
            passportDetails: travelDetailsPassportDetails,
            hiddenPassportTravelerNos: hiddenUploadedPassportNos,
            uploadedDocSuccesses: travelerPassportSuccesses,
            uploadedDocDetails,
            showTravelDetails: true,
          });
        }
      } catch (err) {
        console.error("Failed to write fallback travel draft", err);
      }

      navigate(exactBackPath || `/destination/${encodeURIComponent(countryRoute)}`, {
        state: {
          restoreTravelDetails,
          applicationDraftId: restoreTravelDetails.applicationDraftId,
        },
        replace: true,
      });
      return;
    }

    const countryId =
      summaryData?.countryId ||
      application?.countryId ||
      savedCountryId;

    if (countryId) {
      try {
        const hasNewData =
          restoreTravelDetails.travelers &&
          restoreTravelDetails.travelers.length > 0 &&
          restoreTravelDetails.travelers.some((t) => String(t.name || "").trim().length > 0);

        if (hasNewData) {
          saveTravelDraft(countryId, {
            applicationId: restoreTravelDetails.applicationDraftId,
            travelDateFrom: restoreTravelDetails.travelDateFrom,
            travelDateTo: restoreTravelDetails.travelDateTo,
            visaOption: restoreTravelDetails.visaOption,
            sharedDriveLink: restoreTravelDetails.sharedDriveLink,
            travelers: restoreTravelDetails.travelers,
            passportSuccesses: travelDetailsPassportSuccesses,
            passportDetails: travelDetailsPassportDetails,
            hiddenPassportTravelerNos: hiddenUploadedPassportNos,
            uploadedDocSuccesses: travelerPassportSuccesses,
            uploadedDocDetails,
            showTravelDetails: true,
          });
        }
      } catch (err) {
        console.error("Failed to write fallback travel draft", err);
      }

      navigate(`/destination/${encodeURIComponent(countryId)}`, {
        state: {
          restoreTravelDetails,
          applicationDraftId: restoreTravelDetails.applicationDraftId,
        },
        replace: true,
      });
      return;
    }

    // Default ultimate fallback - home page instead of dashboard
    navigate("/", { replace: true });
  };

  const resolvePayAmountRupees = (appDoc) => {
    return totalAmount;
  };

  const handlePay = async () => {
    if (!termsAccepted) {
      showToast("Please accept the terms and conditions.", "error");
      return;
    }
    if (!razorpayReady) {
      showToast(razorpayMessage || "Payment is not available right now.", "error");
      return;
    }

    setPaying(true);
    try {
      const { app, appId } = await ensureApplicationDraft();

      const amountRupees = resolvePayAmountRupees(app);

      await openRazorpayForApplication({
        applicationId: appId,
        amountRupees,
        description: `${app.countryName || "Visa"} — total payment`,
        applicantName: user?.name || "Applicant",
        applicantEmail: user?.email || "",
        onSuccess: () => {
          try {
            localStorage.removeItem("exitIntentPendingContext");
          } catch {}
          showToast("Payment successful!", "success");
          navigate(`/dashboard/application/${encodeURIComponent(appId)}`, { replace: true });
        },
        onDismiss: () => {
          showToast("Payment was not completed. You can continue from this summary page anytime.", "info");
        },
        onFailure: (m) => {
          showToast(m || "Payment could not be started.", "error");
          navigate(`/dashboard?payment=failed&applicationId=${encodeURIComponent(appId)}`, { replace: true });
        },
      });
    } catch (err) {
      showToast(err.response?.data?.message || "Could not start payment.", "error");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan animate-spin" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-text-primary font-semibold">Application not found.</p>
          <Button variant="secondary" onClick={handleBack}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <Navbar />
      <main className="flex-1 px-4 sm:px-6 py-8">

        {/* Back */}
        <button
          type="button"
          onClick={handleBack}
          className="group flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-cyan transition-colors mb-6 w-fit"
        >
          <ArrowLeft size={16} className="pointer-events-none group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        <div className="max-w-lg w-full mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan">
            <CountryFlagBadge countryName={application.countryName} flagEmoji={application.flagEmoji} sizeClass="h-5 w-5" className="text-lg" />
            <span>{application.countryName}</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Payment Summary</h1>
          <p className="text-sm text-text-secondary mt-1">{application.visaType}</p>
          <p className="text-xs font-mono text-text-muted mt-2">
            Application ID: {application.applicationId || application._id || "Will be assigned on application creation"}
          </p>
        </div>

        {/* Travel Details */}
        <div className="rounded-2xl border border-border bg-white p-5 space-y-2">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Travel Details</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Visa type</span>
            <span className="font-medium text-text-primary">{summaryVisaType}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Travel dates</span>
            <span className="font-medium text-text-primary text-right">{summaryTravelRange}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Travelers</span>
            <span className="font-medium text-text-primary">{travelerCount}</span>
          </div>
          <div className="border-t border-border pt-3 mt-3">
            <h4 className="text-sm font-semibold text-text-primary mb-3">Traveler Details</h4>
          {travelerNames.map((name, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Traveler {idx + 1}</span>
              <span className="font-medium text-text-primary">{name}</span>
            </div>
          ))}
          </div>
        </div>
        {!docsUploaded ? (
          <>
            <div className="rounded-2xl border border-border bg-white p-5">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={openUploadDocumentsModal}
          >
            {docsUploaded ? "Review Uploaded documents" : "Upload Doc Now"}
          </Button>
        </div>

            <div className="rounded-2xl border border-cyan/30 bg-cyan/5 p-4">
              <div className="flex items-start gap-3">
                <Info size={18} className="text-cyan mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    No worries — you can upload your documents anytime later.
                  </p>
                  <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                    After payment, your application will remain available in <span className="text-text-primary font-medium">My Dashboard → Open Your Application → Upload Documents</span>, where you can upload documents for each traveler whenever it’s convenient for you.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-white p-5">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={openUploadDocumentsModal}
              >
                {docsUploaded ? "Review Uploaded documents" : "Upload Doc Now"}
              </Button>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-2 text-emerald-600 font-medium text-sm justify-center">
              <CheckCircle size={18} />
              All documents submitted
            </div>
          </>
        )}

        {/* Billing */}
        <div className="rounded-2xl border border-border bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Billing</h3>

          <div className="flex justify-between text-sm">
            <div>
              <span className="text-text-secondary">Government Fee</span>
              {travelerCount > 1 && (
                <p className="text-xs text-text-muted mt-0.5">x{travelerCount}</p>
              )}
            </div>
            <span className="text-text-primary">₹{governmentFeeTotal.toLocaleString("en-IN")}</span>
          </div>
          <div className="group relative flex justify-between text-sm">
            <div>
              <span className="text-text-secondary">Our Service Fee</span>
              {travelerCount > 1 && (
                <p className="text-xs text-text-muted mt-0.5">x{travelerCount}</p>
              )}
            </div>
            <span className="text-text-primary">₹{(effectiveGstEnabled ? serviceFee + taxes : serviceFee).toLocaleString("en-IN")}</span>
            {effectiveGstEnabled && (
              <div className="pointer-events-none absolute right-0 top-full z-10 mt-2 w-64 rounded-2xl border border-cyan/20 bg-surface px-3 py-3 opacity-0 shadow-lg transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-3 text-text-secondary">
                    <span>Our Service Fee</span>
                    <span className="font-semibold text-text-primary">₹{serviceFee.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-text-secondary">
                    <span>GST</span>
                    <span className="font-semibold text-text-primary">₹{taxes.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="border-t border-border pt-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-text-primary">Our Service + GST</span>
                      <span className="font-bold text-cyan">₹{(serviceFee + taxes).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-border pt-3 flex justify-between text-base font-semibold">
            <span className="text-text-primary">Total Amount</span>
            <span className="text-cyan">₹{totalAmount.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* T&C + Pay */}
        <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border text-cyan accent-cyan"
            />
            <span className="text-sm text-text-secondary leading-snug">
              I agree to the{" "}
              <button
                type="button"
                className="text-cyan hover:underline font-medium bg-transparent border-0 p-0 cursor-pointer inline align-baseline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTermsModalOpen(true);
                }}
              >
                terms and conditions
              </button>{" "}
              and understand that the amount above is the total payment shown in this summary.
            </span>
          </label>

          {!razorpayReady && (
            <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-xl px-3 py-2">
              <ShieldCheck size={14} className="mt-0.5 shrink-0" />
              {razorpayMessage || "Payment gateway is not configured. Contact support."}
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={<CreditCard size={18} />}
            loading={paying}
            disabled={!termsAccepted || !razorpayReady || paying}
            onClick={handlePay}
          >
            Proceed to Payment
          </Button>

          <p className="text-xs text-text-muted text-center">
            Secured by Razorpay · Your payment info is never stored
          </p>
        </div>
        </div>

      </main>

      <Modal
        isOpen={uploadDocumentsModalOpen}
        onClose={closeUploadDocumentsModal}
        title="Upload Documents"
        size="xl"
        closeOnBackdropClick={false}
        footer={
          isFullySubmitted ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button variant="primary" size="md" onClick={() => {
                setDocsSkipped(false);
                closeUploadDocumentsModal();
              }} className="min-w-[120px]">
                Done
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button variant="secondary" size="md" onClick={closeUploadDocumentsModal}>
                Skip, I'll upload later
              </Button>
            </div>
          )
        }
      >
        <div className="space-y-6">
          <div className="rounded-2xl border border-cyan/20 bg-cyan/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <ShieldCheck size={16} className="text-cyan shrink-0" />
              <span>Your documents are safe and secure with us.</span>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-text-primary">Travelers ({travelerCount})</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Add a single Google Drive link for all travelers if needed.
            </p>
          </div>

          <div className="space-y-4">
            {uploadModalTravelers.map((traveler, travelerIndex) => {
              const visibleDocFields = uploadSettings.enableFileUpload
                ? (requiredDocFields || [{ key: "passport" }])
                : (requiredDocFields || [{ key: "passport" }]).filter((f) => f.key === "passport");
              const allDocUploaded = visibleDocFields.every(
                (f) => Boolean((traveler.uploadedDocs || {})[f.key])
              );
              return (
                <div
                  key={`summary-upload-${traveler.id}`}
                  className="rounded-2xl border border-border bg-surface p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan/10 text-cyan font-bold">
                      {String(traveler.id).padStart(2, "0")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-semibold text-text-primary">Traveler {traveler.id}</h4>
                        {allDocUploaded ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle size={12} />
                            All documents uploaded
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        {traveler.name || `Traveler ${traveler.id}`}
                      </p>

                      {/* Dynamic document upload rows */}
                      <div className="mt-5 space-y-4">
                        {visibleDocFields.map((field) => {
                          const zoneKey = `${travelerIndex}-${field.key}`;
                          const localFile = (traveler.files || {})[field.key];
                          const Icon = field.Icon || FileText;
                          const isUploading = Boolean(uploadModalUploading[zoneKey]);
                          const isOptimizing = Boolean(uploadModalOptimizing[zoneKey]);
                          const fieldError = uploadModalErrors[zoneKey];
                          const displayName = getDocumentDisplayName(field.label);

                          let docDetail = getTravelerDocumentDetail(application, traveler.id, field.key);
                          if (!docDetail) {
                            try {
                              const zoneKey = `${traveler.id}-${field.key}`;
                              const raw = localStorage.getItem(`application-doc-details:${applicationIdForUploads}`);
                              if (raw) {
                                const parsed = JSON.parse(raw);
                                const entry = parsed?.[zoneKey];
                                if (entry?.url) docDetail = entry;
                              }
                            } catch { /* ignore */ }
                          }

                          return (
                            <div key={field.key}>
                              <PassportUploadRow
                                inputId={`summary-${field.key}-upload-${traveler.id}`}
                                label={field.label}
                                file={localFile}
                                error={fieldError}
                                uploading={isUploading}
                                optimizing={isOptimizing}
                                saved={Boolean((traveler.uploadedDocs || {})[field.key] && !localFile) || Boolean(docDetail?.url)}
                                previewEnabled={Boolean(docDetail?.url)}
                                accept={getFileValidationRules(uploadSettings?.allowedFileFormats).acceptString}
                                helperText={
                                  localFile
                                    ? localFile.name
                                    : docDetail?.fileName
                                      ? `${docDetail.fileName} - ${formatFileSize(docDetail.fileSize)}`
                                      : `${getFileValidationRules(uploadSettings?.allowedFileFormats).displayLabel} - max 300 KB`
                                }
                                fileSizeText={localFile ? formatFileSize(localFile.size) : ""}
                                savedText={`${displayName} uploaded`}
                                reuploadLabel="Replace File"
                                removeLabel="Remove"
                                onChange={(file) => handleUploadModalDocChange(travelerIndex, field.key, file)}
                                onPreview={() => openDocumentPreview(traveler.id, field.key)}
                                onRemove={() => removeUploadedDoc(traveler.id, travelerIndex, field.key)}
                                onReupload={() => {
                                  setUploadModalErrors((prev) => { const n = { ...prev }; delete n[zoneKey]; return n; });
                                  if (field.key === "passport") {
                                    setHiddenUploadedPassportNos((prev) => { const n = { ...prev }; delete n[traveler.id]; return n; });
                                  }
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <SharedGoogleDriveLinkSection
            value={uploadModalDriveLink}
            onChange={setUploadModalDriveLink}
            onSave={handleDriveLinkBlurSave}
            showSkipHint={application?.paymentStatus !== "completed"}
            savedLink={application?.gdriveLink || ""}
          />
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(passportPreview)}
        onClose={closePassportPreview}
        title={passportPreview?.fileName || "Passport Preview"}
        size="xl"
        zIndexClass="z-[70]"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">
                {passportPreview?.fileName || "Uploaded file"}
              </p>
              <p className="text-xs text-text-muted">
                Review the uploaded passport file.
              </p>
            </div>
            {passportPreview?.url ? (
              <a
                href={passportPreview.url}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-lg bg-cyan/15 px-3 py-2 text-xs font-semibold text-cyan transition-colors hover:bg-cyan/25"
              >
                Open in new tab
              </a>
            ) : null}
          </div>

          {passportPreviewIsImage ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-black/5">
              <img
                src={passportPreview.url}
                alt={passportPreview.fileName || "Uploaded passport"}
                className="max-h-[70vh] w-full object-contain bg-slate-950/5"
              />
            </div>
          ) : passportPreviewIsPdf ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
              <iframe
                src={passportPreview.url}
                title={passportPreview.fileName || "Passport preview"}
                className="h-[70vh] w-full bg-white"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-10 text-center">
              <p className="text-sm font-medium text-text-primary">
                This file type cannot be previewed here.
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Use "Open in new tab" to inspect the uploaded document.
              </p>
            </div>
          )}
        </div>
      </Modal>

      <FilePreviewModal
        isOpen={Boolean(documentPreview)}
        onClose={closeDocumentPreview}
        previewFile={documentPreview ? {
          url: documentPreview.url,
          name: documentPreview.fileName,
          type: documentPreview.type || documentPreview.mimeType
        } : null}
      />

      <Modal
        isOpen={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        title={termsPage?.title || "Terms and Conditions"}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setTermsAccepted(false);
                setTermsModalOpen(false);
              }}
            >
              Deny
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setTermsAccepted(true);
                setTermsModalOpen(false);
              }}
            >
              Accept
            </Button>
          </div>
        }
      >
        <div className="max-h-[min(52vh,400px)] overflow-y-auto overscroll-contain pr-0.5 -mr-0.5">
          {termsPageLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-cyan animate-spin" />
            </div>
          )}
          {!termsPageLoading && termsPageError && (
            <p className="text-sm text-amber-400 text-center py-6">{termsPageError}</p>
          )}
          {!termsPageLoading && !termsPageError && termsPage?.content && (
            <article
              className="prose prose-sm prose-neutral max-w-none text-text-primary prose-headings:text-text-primary prose-p:text-text-secondary prose-li:text-text-secondary prose-strong:text-text-primary prose-a:text-cyan [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:bg-surface-2 [&_th]:p-2 [&_ul]:pl-4"
              dangerouslySetInnerHTML={{ __html: termsPage.content }}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ApplicationSummaryPage;

