import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../store/authStore";

const DEFAULT_SEO = {
  websiteTitle: "Visa & Voyage",
  metaDescription:
    "Visa & Voyage makes visa applications effortless with expert guidance, transparent pricing, and quick updates.",
  metaKeywords: "visa application, travel visa, tourist visa, visa services",
  homepageTitle: "Visa & Voyage",
  homepageDescription:
    "Visa & Voyage makes visa applications effortless with expert guidance, transparent pricing, and quick updates.",
  twitterTitle: "Visa & Voyage",
  twitterDescription:
    "Visa & Voyage makes visa applications effortless with expert guidance, transparent pricing, and quick updates.",
  canonicalUrl: "https://visavo.in",
  robotsIndex: true,
  sitemapUrl: "https://visavo.in/sitemap.xml",
  faviconUrl: "",
  favicon32Url: "",
  favicon192Url: "",
  appleTouchIconUrl: "",
  organizationSchema: {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Visa & Voyage",
    url: "https://visavo.in",
  },
  websiteSchema: {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: "https://visavo.in",
    name: "Visa & Voyage",
  },
};

const ensureHeadElement = (selector, create) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = create();
    document.head.appendChild(element);
  }
  return element;
};

const setMetaContent = (selector, attrs, content) => {
  const element = ensureHeadElement(selector, () => {
    const meta = document.createElement("meta");
    Object.entries(attrs).forEach(([key, value]) => meta.setAttribute(key, value));
    return meta;
  });
  element.setAttribute("content", content);
};

const setLinkHref = (selector, attrs, href) => {
  const element = ensureHeadElement(selector, () => {
    const link = document.createElement("link");
    Object.entries(attrs).forEach(([key, value]) => link.setAttribute(key, value));
    return link;
  });
  element.setAttribute("href", href);
};

const setJsonLd = (id, payload) => {
  const selector = `script[data-seo-schema="${id}"]`;
  const element = ensureHeadElement(selector, () => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seoSchema = id;
    return script;
  });
  element.textContent = JSON.stringify(payload);
};

const buildCanonicalUrl = (baseUrl, pathname, search, hash) => {
  const base = String(baseUrl || "").trim() || DEFAULT_SEO.canonicalUrl;
  try {
    const url = new URL(base);
    url.pathname = pathname || "/";
    url.search = search || "";
    url.hash = hash || "";
    return url.toString();
  } catch {
    return base;
  }
};

const hasPageManagedSeo = (pathname) =>
  pathname.startsWith("/page/") ||
  pathname === "/terms" ||
  pathname === "/blog" ||
  pathname.startsWith("/blog/");

const SiteSeoManager = () => {
  const location = useLocation();
  const [seo, setSeo] = useState(DEFAULT_SEO);

  useEffect(() => {
    let cancelled = false;

    const loadSeo = async () => {
      try {
        const { data } = await api.get("/config/seo");
        if (!cancelled && data?.success && data?.config) {
          setSeo({ ...DEFAULT_SEO, ...data.config });
        }
      } catch {
        if (!cancelled) setSeo(DEFAULT_SEO);
      }
    };

    loadSeo();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const canonicalForRoute = buildCanonicalUrl(
      seo.canonicalUrl,
      location.pathname,
      location.search,
      location.hash
    );

    const routeManagedSeo = hasPageManagedSeo(location.pathname);
    const isHomepage = location.pathname === "/";
    const title = isHomepage
      ? seo.homepageTitle || seo.websiteTitle
      : seo.websiteTitle;
    const description = isHomepage
      ? seo.homepageDescription || seo.metaDescription
      : seo.metaDescription;
    const twitterTitle = isHomepage
      ? seo.twitterTitle || title
      : seo.twitterTitle || seo.websiteTitle;
    const twitterDescription = isHomepage
      ? seo.twitterDescription || description
      : seo.twitterDescription || seo.metaDescription;

    if (!routeManagedSeo) {
      document.title = title;
      setMetaContent('meta[name="description"]', { name: "description" }, description);
      setMetaContent('meta[name="keywords"]', { name: "keywords" }, seo.metaKeywords || "");
      setLinkHref('link[rel="canonical"]', { rel: "canonical" }, canonicalForRoute);
      setMetaContent('meta[name="twitter:title"]', { name: "twitter:title" }, twitterTitle);
      setMetaContent('meta[name="twitter:description"]', { name: "twitter:description" }, twitterDescription);
    }

    setMetaContent('meta[name="robots"]', { name: "robots" }, seo.robotsIndex ? "index,follow" : "noindex,nofollow");
    setMetaContent('meta[name="twitter:card"]', { name: "twitter:card" }, "summary_large_image");

    const twitterImage = seo.favicon192Url || seo.favicon32Url || seo.faviconUrl;
    if (twitterImage) {
      setMetaContent('meta[name="twitter:image"]', { name: "twitter:image" }, twitterImage);
    }

    const faviconHref = seo.faviconUrl || seo.favicon32Url || seo.favicon192Url;
    if (faviconHref) {
      setLinkHref('link[rel="icon"]', { rel: "icon", type: "image/png" }, faviconHref);
      setLinkHref('link[rel="shortcut icon"]', { rel: "shortcut icon" }, faviconHref);
    }
    if (seo.favicon32Url) {
      setLinkHref('link[rel="icon"][sizes="32x32"]', { rel: "icon", sizes: "32x32", type: "image/png" }, seo.favicon32Url);
    }
    if (seo.favicon192Url) {
      setLinkHref('link[rel="icon"][sizes="192x192"]', { rel: "icon", sizes: "192x192", type: "image/png" }, seo.favicon192Url);
    }
    if (seo.appleTouchIconUrl) {
      setLinkHref('link[rel="apple-touch-icon"]', { rel: "apple-touch-icon" }, seo.appleTouchIconUrl);
    }

    setJsonLd("organization", seo.organizationSchema || DEFAULT_SEO.organizationSchema);
    setJsonLd("website", seo.websiteSchema || DEFAULT_SEO.websiteSchema);
  }, [location.hash, location.pathname, location.search, seo]);

  return null;
};

export default SiteSeoManager;
