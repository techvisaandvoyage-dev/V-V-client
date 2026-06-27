// ============================================================
//  Footer Component
//  Landing page footer: CMS links, social icons, trust badges.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Shield, Lock, Globe, Link as LinkIcon, MessageCircle, Send } from "lucide-react";
import { api, SERVER_URL } from "../../store/authStore";
import { useSiteLogo } from "../../hooks/useSiteLogo";

const FOOTER_CONTENT_FALLBACK = {
  logo: "",
  brandPrimaryText: "Visa &",
  brandAccentText: "Voyage",
  description:
    "Your trusted partner for seamless visa applications worldwide. Fast, secure, and professionally managed.",
  sections: [
    { key: "Company", title: "Company" },
    { key: "Services", title: "Services" },
    { key: "Support", title: "Support" },
    { key: "Legal", title: "Legal" },
  ],
};

const InstagramIcon = ({ size = 16, className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    width={size}
    height={size}
    aria-hidden="true"
  >
    <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const FacebookIcon = ({ size = 16, className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    width={size}
    height={size}
    aria-hidden="true"
  >
    <path d="M13.5 21v-7h2.4l.36-2.76H13.5V9.48c0-.8.22-1.35 1.37-1.35h1.47V5.66c-.25-.03-1.11-.11-2.11-.11-2.09 0-3.52 1.27-3.52 3.61v2.08H8.34V14h2.37v7h2.79Z" />
  </svg>
);

const TwitterIcon = ({ size = 16, className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    width={size}
    height={size}
    aria-hidden="true"
  >
    <path d="M18.9 3H22l-6.77 7.74L23 21h-6.08l-4.76-6.22L6.72 21H3.6l7.24-8.28L1 3h6.23l4.3 5.68L18.9 3Zm-1.07 16.18h1.69L6.31 4.73H4.5l13.33 14.45Z" />
  </svg>
);

const YoutubeIcon = ({ size = 16, className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    width={size}
    height={size}
    aria-hidden="true"
  >
    <path d="M21.6 7.2a2.9 2.9 0 0 0-2.04-2.05C17.74 4.67 12 4.67 12 4.67s-5.74 0-7.56.48A2.9 2.9 0 0 0 2.4 7.2C1.92 9.03 1.92 12 1.92 12s0 2.97.48 4.8a2.9 2.9 0 0 0 2.04 2.05c1.82.48 7.56.48 7.56.48s5.74 0 7.56-.48a2.9 2.9 0 0 0 2.04-2.05c.48-1.83.48-4.8.48-4.8s0-2.97-.48-4.8ZM10.08 15.03V8.97L15.36 12l-5.28 3.03Z" />
  </svg>
);

const LinkedinIcon = ({ size = 16, className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    width={size}
    height={size}
    aria-hidden="true"
  >
    <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A2.02 2.02 0 1 0 5.3 7.04 2.02 2.02 0 0 0 5.25 3ZM20.44 12.4c0-3.44-1.83-5.04-4.27-5.04-1.97 0-2.85 1.08-3.34 1.84V8.5H9.46c.05 1.15 0 11.5 0 11.5h3.38v-6.42c0-.34.02-.68.13-.92.27-.68.9-1.38 1.95-1.38 1.38 0 1.93 1.04 1.93 2.56V20h3.38v-7.6Z" />
  </svg>
);

const FOOTER_SOCIAL_ICON_COMPONENTS = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  twitter: TwitterIcon,
  youtube: YoutubeIcon,
  linkedin: LinkedinIcon,
  whatsapp: MessageCircle,
  telegram: Send,
  email: Mail,
  website: Globe,
  custom: LinkIcon,
};

const resolveAssetUrl = (value) => {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${SERVER_URL}${url}`;
  return `${SERVER_URL}/${url}`;
};

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const siteLogo = useSiteLogo();
  const [pages, setPages] = useState([]);
  const [socialIcons, setSocialIcons] = useState([]);
  const [footerContent, setFooterContent] = useState(FOOTER_CONTENT_FALLBACK);
  const [footerSections, setFooterSections] = useState(FOOTER_CONTENT_FALLBACK.sections);
  const [activeCountryCount, setActiveCountryCount] = useState(0);
  useEffect(() => {
    let active = true;

    const loadFooterData = async () => {
      try {
        const [pagesRes, iconsRes, footerConfigRes, countriesRes] = await Promise.all([
          api.get("/pages"),
          api.get("/footer-social-icons"),
          api.get("/config/footer"),
          api.get("/countries", { params: { active: true } }),
        ]);

        if (!active) return;

        if (pagesRes?.data?.success) {
          setPages(Array.isArray(pagesRes.data.items) ? pagesRes.data.items : []);
        } else {
          setPages([]);
        }

        if (iconsRes?.data?.success) {
          setSocialIcons(Array.isArray(iconsRes.data.icons) ? iconsRes.data.icons : []);
        } else {
          setSocialIcons([]);
        }

        if (footerConfigRes?.data?.success && footerConfigRes?.data?.config) {
          const config = footerConfigRes.data.config;
          setFooterContent({
            logo: config.logo || "",
            brandPrimaryText:
              String(config.brandPrimaryText || "").trim() || FOOTER_CONTENT_FALLBACK.brandPrimaryText,
            brandAccentText:
              String(config.brandAccentText || "").trim() || FOOTER_CONTENT_FALLBACK.brandAccentText,
            description:
              String(config.description || "").trim() || FOOTER_CONTENT_FALLBACK.description,
          });
          const sections = Array.isArray(config.sections)
            ? config.sections.map((s) => ({ key: s.key, title: s.label }))
            : FOOTER_CONTENT_FALLBACK.sections;
          setFooterSections(sections);
        } else {
          setFooterContent(FOOTER_CONTENT_FALLBACK);
          setFooterSections(FOOTER_CONTENT_FALLBACK.sections);
        }

        if (countriesRes?.data?.success && Array.isArray(countriesRes.data.countries)) {
          setActiveCountryCount(countriesRes.data.countries.length);
        } else {
          setActiveCountryCount(0);
        }
      } catch {
        if (active) {
          setPages([]);
          setSocialIcons([]);
          setFooterContent(FOOTER_CONTENT_FALLBACK);
          setFooterSections(FOOTER_CONTENT_FALLBACK.sections);
          setActiveCountryCount(0);
        }
      }
    };

    loadFooterData();
    return () => {
      active = false;
    };
  }, []);

  const columns = useMemo(
    () =>
      footerSections.map((section) => ({
        ...section,
        links: pages
          .filter((page) => page.footerSection === section.key)
          .map((page) => ({
            page,
            label: page.title,
            slug: page.slug,
          })),
      })),
    [pages, footerSections]
  );

  const trustBadges = [
    { icon: Shield, label: "SSL Secured" },
    { icon: Lock, label: "Data Protected" },
    { icon: Globe, label: `${activeCountryCount || 0} Countries` },
  ];

  return (
    <footer className="bg-white" id="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex flex-col lg:flex-row justify-between gap-8 lg:gap-12 mb-12">
          <div className="w-full lg:w-[35%] lg:max-w-sm lg:pr-12 shrink-0">
            <div className="flex flex-col items-start">
              <Link to="/" replace className="flex h-[38px] items-center overflow-hidden leading-none -ml-3 mb-3">
                <img
                  src={siteLogo}
                  alt={`${footerContent.brandPrimaryText} ${footerContent.brandAccentText}`}
                  width="240"
                  height="80"
                  loading="lazy"
                  decoding="async"
                  className="block h-16 shrink-0 w-auto object-contain"
                />
              </Link>
              <p className="max-w-[20rem] text-base leading-relaxed text-text-secondary">
                {footerContent.description}
              </p>

              {socialIcons.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  {socialIcons.map(({ _id, label, type, url }) => {
                    const Icon = FOOTER_SOCIAL_ICON_COMPONENTS[type] || LinkIcon;

                    let finalUrl = url || "";
                  let target = "_blank";
                  if (type === "email") {
                    if (finalUrl.toLowerCase().startsWith("mailto:https://")) {
                      finalUrl = finalUrl.substring(7);
                    } else if (finalUrl.toLowerCase().startsWith("mailto:")) {
                      const emailAddr = finalUrl.substring(7);
                      finalUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${emailAddr}`;
                    } else if (finalUrl.includes("@") && !finalUrl.toLowerCase().startsWith("http")) {
                      finalUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${finalUrl}`;
                    }
                    
                    if (finalUrl.toLowerCase().startsWith("mailto:")) {
                      target = "_self";
                    } else {
                      target = "_blank";
                    }
                  }

                    return (
                      <a
                        key={_id || `${type}-${label}`}
                        href={finalUrl}
                        aria-label={label}
                        title={label}
                        target={target}
                        rel="noopener noreferrer"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-text-muted transition-all duration-200 hover:border-cyan/30 hover:text-cyan"
                      >
                        <Icon size={16} />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap justify-start lg:justify-end gap-8 lg:gap-12 xl:gap-16 w-full lg:w-auto flex-1">
            {columns.map((col) => (
              <div key={col.key} className="w-[calc(50%-1rem)] sm:w-auto sm:min-w-[140px]">
                <h3 className="text-base font-semibold text-text-primary mb-4">{col.title}</h3>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.slug}>
                      <Link
                        to={`/page/${link.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base text-text-secondary hover:text-cyan transition-colors duration-200 block"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  {col.links.length === 0 && (
                    <li className="text-base text-text-muted">No pages yet</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="text-sm text-text-muted space-y-1.5 text-left">
              <p className="font-semibold text-text-primary text-base mb-1">Visa &amp; Voyage</p>
              <p>
                Supported by{" "}
                <a
                  href="https://krishnaagarwalassociates.co.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan transition-colors"
                >
                  Krishna Agarwal &amp; Associates
                </a>
              </p>
              <p>&copy; 2026 Visa &amp; Voyage. All Rights Reserved.</p>
            </div>

            <div className="flex items-center flex-wrap gap-4 md:gap-6 md:pb-1">
              {trustBadges.map(({ icon: Icon, label }, index) => (
                <div key={label} className="flex items-center gap-4 md:gap-6">
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Icon size={20} strokeWidth={1.5} className="text-blue-600 flex-shrink-0" />
                    <span>{label}</span>
                  </div>
                  {index < trustBadges.length - 1 && (
                    <div className="h-4 w-px bg-slate-300" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
