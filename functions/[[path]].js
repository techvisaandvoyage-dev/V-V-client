export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  // Pass-through static assets to avoid unnecessary processing
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|map|json)$/)) {
    return context.next();
  }

  // Fetch the actual static index.html from Cloudflare
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  
  if (!contentType.includes("text/html")) {
    return response;
  }

  try {
    // Determine API URL (fallback to prod if env is missing)
    const apiUrl = context.env.VITE_API_URL || "https://api.visavo.in";
    
    // Fetch SEO configuration from backend
    const seoResp = await fetch(`${apiUrl}/api/config/seo`, {
      cf: { cacheTtl: 30, cacheEverything: true } // Cache at the edge for 30s
    });
    
    if (!seoResp.ok) return response;
    
    const seoData = await seoResp.json();
    if (seoData.success && seoData.config) {
      const config = seoData.config;
      
      const title = config.seoHomepageTitle || config.seoWebsiteTitle || "Visa & Voyage";
      const description = config.seoHomepageDescription || config.seoMetaDescription || "";
      const keywords = config.seoMetaKeywords || "";
      const canonical = config.seoCanonicalUrl || "https://visavo.in";
      const ogTitle = config.seoOpenGraphTitle || title;
      const ogDescription = config.seoOpenGraphDescription || description;
      const twitterTitle = config.seoTwitterTitle || title;
      const twitterDescription = config.seoTwitterDescription || description;
      const robots = config.seoRobotsIndex ? "index,follow" : "noindex,nofollow";
      
      const faviconUrl = config.seoFaviconUrl || "";
      const favicon32 = config.seoFavicon32Url || faviconUrl;
      const favicon192 = config.seoFavicon192Url || faviconUrl;
      const appleTouchIcon = config.seoAppleTouchIconUrl || faviconUrl;
      
      // We will use HTMLRewriter to rewrite the tags on the fly.
      // This is executed in microseconds at the edge!
      let rewriter = new HTMLRewriter()
        .on('title', {
          element(e) {
            if (title) e.setInnerContent(title);
          }
        })
        .on('meta[name="description"]', {
          element(e) {
            if (description) e.setAttribute("content", description);
          }
        })
        .on('meta[name="keywords"]', {
          element(e) {
            if (keywords) e.setAttribute("content", keywords);
          }
        })
        .on('meta[name="robots"]', {
          element(e) {
            e.setAttribute("content", robots);
          }
        })
        .on('meta[property="og:title"]', {
          element(e) {
            if (ogTitle) e.setAttribute("content", ogTitle);
          }
        })
        .on('meta[property="og:description"]', {
          element(e) {
            if (ogDescription) e.setAttribute("content", ogDescription);
          }
        })
        .on('meta[property="og:image"]', {
          element(e) {
            if (favicon192) e.setAttribute("content", favicon192);
          }
        })
        .on('meta[name="twitter:title"]', {
          element(e) {
            if (twitterTitle) e.setAttribute("content", twitterTitle);
          }
        })
        .on('meta[name="twitter:description"]', {
          element(e) {
            if (twitterDescription) e.setAttribute("content", twitterDescription);
          }
        })
        .on('head', {
          element(e) {
            let injected = "";
            
            // Add Canonical
            if (canonical) {
              injected += `\n<link rel="canonical" href="${canonical}" />`;
            }

            // Replace favicons entirely (the original might exist, we can just append ours and browsers use the latest or we can let HTMLRewriter replace the existing ones, but appending is safer if we want to ensure they exist)
            if (faviconUrl) injected += `\n<link rel="icon" href="${faviconUrl}" />`;
            if (favicon32) injected += `\n<link rel="icon" sizes="32x32" type="image/png" href="${favicon32}" />`;
            if (favicon192) injected += `\n<link rel="icon" sizes="192x192" type="image/png" href="${favicon192}" />`;
            if (appleTouchIcon) injected += `\n<link rel="apple-touch-icon" href="${appleTouchIcon}" />`;

            // JSON-LD Structured Data
            const orgSchema = {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": title,
              "url": canonical,
              "logo": faviconUrl || ""
            };

            const webSchema = {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "url": canonical,
              "name": title
            };

            injected += `\n<script type="application/ld+json">${JSON.stringify(orgSchema)}</script>`;
            injected += `\n<script type="application/ld+json">${JSON.stringify(webSchema)}</script>\n`;

            e.append(injected, { html: true });
          }
        });

      return rewriter.transform(response);
    }
  } catch (error) {
    console.error("HTMLRewriter Error:", error);
  }

  return response;
}
