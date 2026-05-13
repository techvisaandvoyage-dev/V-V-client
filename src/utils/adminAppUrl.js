const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

const normalizePath = (path = "/") => {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
};

export const getAdminAppUrl = (path = "/") => {
  const normalizedPath = normalizePath(path);
  const envAdmin = String(import.meta.env.VITE_ADMIN_APP_ORIGIN || "").trim();
  if (envAdmin) {
    const base = envAdmin.replace(/\/+$/, "");
    return `${base}${normalizedPath}`;
  }
  if (typeof window !== "undefined" && LOCAL_HOSTS.has(window.location.hostname)) {
    return `http://localhost:5174${normalizedPath}`;
  }
  return `/admin${normalizedPath === "/" ? "" : normalizedPath}`;
};
