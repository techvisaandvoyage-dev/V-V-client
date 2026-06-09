import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function updateIndexHtml() {
  try {
    console.log("Fetching SEO settings from backend...");
    // Use the production backend URL by default, or VITE_API_URL
    const apiUrl = process.env.VITE_API_URL || 'https://api.visavo.in';
    const response = await fetch(`${apiUrl}/api/config/seo`);
    const data = await response.json();
    
    if (data && data.success && data.config) {
      const config = data.config;
      
      const indexPath = path.join(__dirname, 'index.html');
      let html = fs.readFileSync(indexPath, 'utf-8');
      
      // Helper to replace or inject meta tags
      const replaceOrInjectMeta = (htmlStr, nameAttr, nameValue, contentValue) => {
        const regex = new RegExp(`<meta\\s+${nameAttr}="${nameValue}"\\s+content=".*—\\s*\\/>`, 'is');
        if (regex.test(htmlStr)) {
          return htmlStr.replace(regex, `<meta ${nameAttr}="${nameValue}" content="${contentValue}" />`);
        } else {
          // Inject before closing head if not found
          return htmlStr.replace('</head>', `  <meta ${nameAttr}="${nameValue}" content="${contentValue}" />\n  </head>`);
        }
      };
      
      // Update Title
      if (config.seoWebsiteTitle) {
        html = html.replace(/<title>.*<\/title>/i, `<title>${config.seoWebsiteTitle}</title>`);
      }
      
      // Update Meta Description
      if (config.seoMetaDescription) {
        html = replaceOrInjectMeta(html, 'name', 'description', config.seoMetaDescription);
      }
      
      // Update Keywords
      if (config.seoMetaKeywords) {
        html = replaceOrInjectMeta(html, 'name', 'keywords', config.seoMetaKeywords);
      }

      // Update OG Title
      if (config.seoWebsiteTitle) {
        html = replaceOrInjectMeta(html, 'property', 'og:title', config.seoWebsiteTitle);
      }

      // Update OG Description
      if (config.seoMetaDescription) {
        html = replaceOrInjectMeta(html, 'property', 'og:description', config.seoMetaDescription);
      }
      
      fs.writeFileSync(indexPath, html, 'utf-8');
      console.log("Successfully injected dynamic SEO settings into index.html!");
    } else {
      console.log("Failed to fetch valid SEO config, using default index.html");
    }
  } catch (error) {
    console.error("Error during prebuild SEO fetch:", error.message);
  }
}

updateIndexHtml();
