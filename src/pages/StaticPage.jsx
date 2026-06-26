import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Button from "../components/ui/Button";
import ImageWithShimmer from "../components/ui/ImageWithShimmer";
import { api, SERVER_URL } from "../store/authStore";

const resolveAssetUrl = (value) => {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${SERVER_URL}${url}`;
  return `${SERVER_URL}/${url}`;
};

const ensureMetaTag = (selector, creator) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = creator();
    document.head.appendChild(element);
  }
  return element;
};

/**
 * Render a CMS-managed static page.
 *
 * Usually mounted at `/page/:slug` and reads the slug from the route params.
 * Pages with a "fixed" public URL (e.g. `/terms` → Terms & Conditions) can
 * mount this same component and supply `slugOverride` to pin the document
 * being fetched. Falling back through the same UI keeps the look-and-feel,
 * SEO meta handling and admin editability identical regardless of URL.
 */
const StaticPage = ({ slugOverride } = {}) => {
  const { slug: paramSlug } = useParams();
  const slug = slugOverride || paramSlug;
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadPage = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/pages/${slug}`);
        if (!active) return;
        setPage(data.page || null);
      } catch (err) {
        if (!active) return;
        setError(err.response?.data?.message || "Page not found.");
        setPage(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPage();
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!page) return;

    document.title = page.seo?.metaTitle || `${page.title} | visavo.in`;

    const metaDescription = ensureMetaTag('meta[name="description"]', () => {
      const meta = document.createElement("meta");
      meta.name = "description";
      return meta;
    });
    metaDescription.setAttribute("content", page.seo?.metaDescription || page.summary || "");

    const metaKeywords = ensureMetaTag('meta[name="keywords"]', () => {
      const meta = document.createElement("meta");
      meta.name = "keywords";
      return meta;
    });
    metaKeywords.setAttribute("content", Array.isArray(page.seo?.keywords) ? page.seo.keywords.join(", ") : "");

    const canonical = ensureMetaTag('link[rel="canonical"]', () => {
      const link = document.createElement("link");
      link.rel = "canonical";
      return link;
    });
    canonical.setAttribute("href", page.seo?.canonicalUrl || `${window.location.origin}/page/${page.slug}`);

    const ogImage = ensureMetaTag('meta[property="og:image"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:image");
      return meta;
    });
    ogImage.setAttribute("content", resolveAssetUrl(page.seo?.openGraphImage || page.featuredImage));
  }, [page]);

  const handleBack = () => {
    const from = location.state?.from;
    if (typeof from === "string" && from.startsWith("/")) {
      navigate(from, { replace: true });
      return;
    }
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <button
          type="button"
          onClick={handleBack}
          className="mb-8 -ml-1.5 inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {loading ? (
          <div className="space-y-6">
            <div className="animate-pulse rounded-3xl border border-border bg-surface p-8">
              <div className="h-4 w-28 rounded bg-surface-2" />
              <div className="mt-4 h-12 w-3/4 rounded bg-surface-2" />
              <div className="mt-4 h-5 w-full rounded bg-surface-2" />
              <div className="mt-2 h-5 w-5/6 rounded bg-surface-2" />
            </div>
            <div className="animate-pulse rounded-3xl border border-border bg-surface p-8">
              <div className="h-5 w-full rounded bg-surface-2" />
              <div className="mt-3 h-5 w-full rounded bg-surface-2" />
              <div className="mt-3 h-5 w-4/5 rounded bg-surface-2" />
            </div>
          </div>
        ) : error || !page ? (
          <div className="rounded-3xl border border-border bg-surface px-6 py-14 text-center">
            <Loader2 size={28} className="mx-auto mb-4 text-cyan" />
            <h1 className="text-2xl font-bold text-text-primary">Page unavailable</h1>
            <p className="mt-3 text-sm text-text-secondary">{error || "This page is not published yet."}</p>
            <div className="mt-6">
              <Button variant="primary" onClick={() => navigate("/")}>Return Home</Button>
            </div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <section className="rounded-[28px] bg-surface px-6 py-8 sm:px-10 sm:py-10">
              <article
                className="text-base text-text-primary
                  [&_a]:text-cyan [&_a]:underline
                  [&_blockquote]:border-l-4 [&_blockquote]:border-cyan/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4
                  [&_h1]:mt-6 [&_h1]:text-3xl [&_h1]:font-bold
                  [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold
                  [&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-semibold
                  [&_h4]:mt-4 [&_h4]:text-lg [&_h4]:font-semibold
                  [&_li]:ml-5 [&_ul]:list-disc [&_ol]:list-decimal [&_p]:mb-3
                  [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
                  [&_th]:border [&_td]:border [&_th]:border-border [&_td]:border-border [&_th]:px-3 [&_td]:py-2 [&_th]:bg-surface-2 [&_th]:text-left
                  [&_img]:max-w-full [&_img]:rounded-xl"
                dangerouslySetInnerHTML={{ __html: page.content }}
              />
            </section>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default StaticPage;
