// ============================================================
//  Footer Component
//  Landing page footer: CMS links, social icons, trust badges.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Mail, Shield, Lock, Globe, Link as LinkIcon, MessageCircle, Send } from "lucide-react";
import { api } from "../../store/authStore";

const BRAND_LOGO_SRC = "/images/visa-voyage-logo.png";

const FOOTER_SECTIONS = [
  { key: "company", title: "Company" },
  { key: "services", title: "Services" },
  { key: "support", title: "Support" },
  { key: "legal", title: "Legal" },
];

const FOOTER_CONTENT_FALLBACK = {
  brandPrimaryText: "Visa &",
  brandAccentText: "Voyage",
  description:
    "Your trusted partner for seamless visa applications worldwide. Fast, secure, and professionally managed.",
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

const Footer = () => {
  const location = useLocation();
  const isTransientPage =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname.startsWith("/apply") ||
    location.pathname.endsWith("/summary");
  const currentYear = new Date().getFullYear();
  const [pages, setPages] = useState([]);
  const [socialIcons, setSocialIcons] = useState([]);
  const [footerContent, setFooterContent] = useState(FOOTER_CONTENT_FALLBACK);

  useEffect(() => {
    let active = true;

    const loadFooterData = async () => {
      try {
        const [pagesRes, iconsRes, footerConfigRes] = await Promise.all([
          api.get("/pages"),
          api.get("/footer-social-icons"),
          api.get("/config/footer"),
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
            brandPrimaryText:
              String(config.brandPrimaryText || "").trim() || FOOTER_CONTENT_FALLBACK.brandPrimaryText,
            brandAccentText:
              String(config.brandAccentText || "").trim() || FOOTER_CONTENT_FALLBACK.brandAccentText,
            description:
              String(config.description || "").trim() || FOOTER_CONTENT_FALLBACK.description,
          });
        } else {
          setFooterContent(FOOTER_CONTENT_FALLBACK);
        }
      } catch {
        if (active) {
          setPages([]);
          setSocialIcons([]);
          setFooterContent(FOOTER_CONTENT_FALLBACK);
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
      FOOTER_SECTIONS.map((section) => ({
        ...section,
        links: pages
          .filter((page) => (page.footerSection || "company") === section.key)
          .map((page) => ({
            label: page.title,
            to: `/page/${page.slug}`,
          })),
      })),
    [pages]
  );

  const trustBadges = [
    { icon: Shield, label: "SSL Secured" },
    { icon: Lock, label: "Data Protected" },
    { icon: Globe, label: "150+ Countries" },
  ];

  return (
    <footer className="bg-surface border-t border-border" id="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-12 mb-12">
          <div className="lg:col-span-2 lg:pr-12">
            <Link to="/" replace className="mb-0 flex items-center">
              <img
                src="/images/visa-voyage-logo.webp"
                alt={`${footerContent.brandPrimaryText} ${footerContent.brandAccentText}`}
                width="240"
                height="80"
                loading="lazy"
                decoding="async"
                className="block h-20 w-auto object-contain scale-[2.2] sm:scale-[2.6] origin-left -translate-x-6 sm:-translate-x-12 lg:-translate-x-16 translate-y-2 sm:translate-y-4"
              />
            </Link>
            <p className="text-sm text-text-secondary leading-relaxed mb-6">
              {footerContent.description}
            </p>

            <div className="flex items-center gap-3">
              {socialIcons.map(({ _id, label, type, url }) => {
                const Icon = FOOTER_SOCIAL_ICON_COMPONENTS[type] || LinkIcon;
                return (
                <a
                  key={_id || `${type}-${label}`}
                  href={url}
                  aria-label={label}
                  title={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-cyan hover:border-cyan/30 transition-all duration-200"
                >
                  <Icon size={16} />
                </a>
                );
              })}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.key}>
              <h3 className="text-sm font-semibold text-text-primary mb-4">{col.title}</h3>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      replace={isTransientPage}
                      state={{
                        from: `${location.pathname}${location.search}${location.hash}`,
                      }}
                      className="text-sm text-text-secondary hover:text-cyan transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {col.links.length === 0 && (
                  <li className="text-sm text-text-muted">No pages yet</li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-sm text-text-muted">
              &copy; {currentYear} Visa & Voyage. All rights reserved.
            </p>

            <div className="flex items-center gap-6">
              {trustBadges.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-text-muted">
                  <Icon size={14} className="text-cyan flex-shrink-0" />
                  <span>{label}</span>
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
