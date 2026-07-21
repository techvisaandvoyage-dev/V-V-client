import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, LayoutDashboard, LogOut, Menu, X, BookOpen, Search } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { getAdminAppUrl } from "../../utils/adminAppUrl";
import { useSiteLogo } from "../../hooks/useSiteLogo";
import NotificationBell from "./NotificationBell";

const AuthPageModal = lazy(() => import("../auth/AuthPageModal"));

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Zustand Store Fixes (Performance Optimized) ──────────
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  const mobileMenuOpen = useUIStore((state) => state.mobileMenuOpen);
  const toggleMobileMenu = useUIStore((state) => state.toggleMobileMenu);
  const closeMobileMenu = useUIStore((state) => state.closeMobileMenu);

  const [scrolled, setScrolled] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const siteLogo = useSiteLogo();

  // ── Detect scroll to toggle navbar style ─────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname, closeMobileMenu]);



  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const isLanding = location.pathname === "/";
  const isTransientPage =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname.startsWith("/apply") ||
    location.pathname.endsWith("/summary");

  const handleDashboardOpen = () => {
    if (user?.role === "admin") {
      window.location.href = getAdminAppUrl("/");
    } else {
      navigate("/dashboard", { replace: isTransientPage });
    }
  };

  const handleProfileIconClick = () => {
    if (isAuthenticated) {
      setProfileDropdownOpen((prev) => !prev);
    } else {
      closeMobileMenu();
      setAuthModalOpen(true);
    }
  };

  const handleLogoClick = (event) => {
    event.preventDefault();
    closeMobileMenu();

    if (location.pathname === "/") {
      window.dispatchEvent(new CustomEvent("vb:reset-home-search"));
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      return;
    }

    navigate("/", {
      replace: isTransientPage,
      state: { resetSearch: true },
    });
  };

  return (
    <>
      <header
        className={`
          fixed top-0 left-0 right-0 z-[999] transition-all duration-300
          ${!isLanding
            ? "bg-white border-b border-border shadow-card"
            : "bg-white"
          }
        `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-[72px]">
            {/* ── Logo ── */}
            <Link
              to="/"
              replace
              onClick={handleLogoClick}
              className="flex h-[72px] items-center"
              aria-label="VISAANDVOYAGE Home"
            >
              <img
                src={siteLogo}
                alt="Visa &amp; Voyage"
                width="240"
                height="64"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="block h-[63px] w-auto object-contain sm:h-[68px]"
              />
            </Link>

            {/* ── Right side: public links + profile icon ── */}
            <div className="hidden md:flex items-center gap-2">
              <Link
                to="/blog"
                replace={isTransientPage}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname.startsWith("/blog")
                    ? "text-black"
                    : "text-black hover:text-black/80"
                }`}
              >
                <BookOpen size={15} />
                Blog
              </Link>
              {!isLanding && (
                <button
                  onClick={() => navigate("/")}
                  className="w-10 h-10 rounded-full bg-cyan/10 border border-cyan/20 flex items-center justify-center text-cyan hover:bg-cyan/20 transition-all duration-200"
                  aria-label="Search"
                >
                  <Search size={18} />
                </button>
              )}
              <NotificationBell className="ml-2" />
              <div className="relative" ref={dropdownRef}>
                <button
                  id="user-dashboard-btn"
                  onClick={handleProfileIconClick}
                  className="w-10 h-10 rounded-full bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan hover:bg-cyan/20 hover:shadow-cyan-glow transition-all duration-200"
                  aria-label={isAuthenticated ? "Open account menu" : "Open login"}
                  aria-haspopup={isAuthenticated ? "menu" : undefined}
                >
                  <User size={18} />
                </button>

                {isAuthenticated && (
                  <div
                    className={`absolute right-0 top-full z-50 w-64 rounded-xl border border-border bg-white shadow-card transition-all duration-150 overflow-hidden ${
                      profileDropdownOpen
                        ? "visible translate-y-2 opacity-100"
                        : "invisible translate-y-3 opacity-0"
                    }`}
                    role="menu"
                  >
                    <div className="px-4 py-3 border-b border-border bg-slate-50/50">
                      <p className="text-sm font-semibold text-text-primary truncate">
                        {user?.name || "User"}
                      </p>
                      {user?.email && (
                        <p className="text-xs text-text-secondary truncate mt-1">
                          {user?.email}
                        </p>
                      )}
                      {user?.phone && (
                        <p className="text-xs text-text-secondary truncate mt-0.5">
                          {user?.phone}
                        </p>
                      )}
                    </div>
                    <div className="py-2">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          navigate("/dashboard/profile", { replace: isTransientPage });
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-text-secondary transition-colors hover:bg-cyan/10 hover:text-cyan"
                        role="menuitem"
                      >
                        <User size={15} />
                        Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          handleDashboardOpen();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-text-secondary transition-colors hover:bg-cyan/10 hover:text-cyan"
                        role="menuitem"
                      >
                        <LayoutDashboard size={15} />
                        Dashboard
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
                        role="menuitem"
                      >
                        <LogOut size={15} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Mobile notification & hamburger ── */}
            <div className="flex md:hidden items-center gap-1.5">
              <NotificationBell />
              {!isLanding && (
                <button
                  onClick={() => navigate("/")}
                  className="w-10 h-10 rounded-full bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan hover:bg-cyan/20 hover:shadow-cyan-glow transition-all duration-200"
                  aria-label="Search destinations"
                >
                  <Search size={18} />
                </button>
              )}
              <button
                id="mobile-menu-btn"
                onClick={toggleMobileMenu}
                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white transition-colors"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile menu drawer ── */}
        {mobileMenuOpen && (
            <div className="md:hidden border-t border-border bg-white overflow-hidden animate-mobile-menu-in">
              {isAuthenticated && (
                <div className="px-4 py-3 border-b border-border bg-slate-50/50 text-center">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {user?.name || "User"}
                  </p>
                  {user?.email && (
                    <p className="text-xs text-text-secondary truncate mt-1">
                      {user?.email}
                    </p>
                  )}
                  {user?.phone && (
                    <p className="text-xs text-text-secondary truncate mt-0.5">
                      {user?.phone}
                    </p>
                  )}
                </div>
              )}
              
              <div className="py-2">
                <Link
                  to="/blog"
                  replace={isTransientPage}
                  onClick={closeMobileMenu}
                  className="flex w-full justify-center items-center gap-2 px-4 py-2.5 text-center text-sm font-medium text-text-secondary transition-colors hover:bg-cyan/10 hover:text-cyan"
                >
                  <BookOpen size={15} />
                  Blog
                </Link>

                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => {
                        closeMobileMenu();
                        navigate("/dashboard/profile", { replace: isTransientPage });
                      }}
                      className="flex w-full justify-center items-center gap-2 px-4 py-2.5 text-center text-sm font-medium text-text-secondary transition-colors hover:bg-cyan/10 hover:text-cyan"
                    >
                      <User size={15} />
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        closeMobileMenu();
                        if (user?.role === "admin") {
                          window.location.href = getAdminAppUrl("/");
                        } else {
                          navigate("/dashboard", { replace: isTransientPage });
                        }
                      }}
                      className="flex w-full justify-center items-center gap-2 px-4 py-2.5 text-center text-sm font-medium text-text-secondary transition-colors hover:bg-cyan/10 hover:text-cyan"
                    >
                      <LayoutDashboard size={15} />
                      Dashboard
                    </button>
                    <button
                      onClick={() => {
                        closeMobileMenu();
                        handleLogout();
                      }}
                      className="flex w-full justify-center items-center gap-2 px-4 py-2.5 text-center text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
                    >
                      <LogOut size={15} />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <div className="px-4 pt-2 border-t border-border mt-2">
                    <button
                      onClick={() => {
                        closeMobileMenu();
                        setAuthModalOpen(true);
                      }}
                      className="w-full px-4 py-2.5 bg-cyan text-background text-sm font-bold rounded-xl hover:bg-cyan/90 transition-all text-center shadow-lg shadow-cyan/20"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
      </header>

      {/* Spacer so content doesn't hide behind fixed navbar */}
      <div className="h-16" aria-hidden="true" />
      <Suspense fallback={null}>
        <AuthPageModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </Suspense>
    </>
  );
};

export default Navbar;
