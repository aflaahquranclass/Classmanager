import { useState, useEffect, useCallback } from "react";
import { Menu, X, ChevronDown, Phone, Mail, MapPin } from "lucide-react";
import "./landing.css";
import { CONTACT, SHOW } from "./content.js";
import { Link, useReveal } from "./parts.jsx";
import HomePage from "./HomePage.jsx";
import HifzPage from "./HifzPage.jsx";
import StorePage from "./StorePage.jsx";
import RulesPage from "./RulesPage.jsx";
import ReviewPage from "./ReviewPage.jsx";
import InstallPage from "./InstallPage.jsx";
import RegisterPage from "./RegisterPage.jsx";
import UpdatePage from "./UpdatePage.jsx";
import { lockedCategory, categoryOf } from "../registrations/registrations.js";
import { LangProvider, LangSwitch, useLang } from "./i18n.jsx";

// Public website on the main domain: Home, Hifz program, Store and Rules, the
// phone install guide (/install), plus the review form, which nothing links to (only the admin's private link). The
// staff sign-in that used to live at "/" is now at "/login" (see main.jsx).
const PAGES = {
  "/": "Aflaah Quran Class",
  "/hifz": "Hifz program · Aflaah Quran Class",
  "/store": "Book store · Aflaah Quran Class",
  "/review": "Write a review · Aflaah Quran Class",
  "/install": "Install the app · Aflaah Quran Class",
  "/register": "Register for a class · Aflaah Quran Class",
  "/update": "Update student details · Aflaah Quran Class",
  ...(SHOW.rules ? { "/rules": "Rules and regulations · Aflaah Quran Class" } : {}),
};

const LOCAL = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const LOGINS = [
  { label: "nav.studentPortal", href: LOCAL ? "/?portal=student" : "https://students.aflaahqc.com" },
  { label: "nav.teachersPortal", href: LOCAL ? "/?portal=teacher" : "https://teachers.aflaahqc.com" },
  { label: "nav.admin", href: LOCAL ? "/?portal=admin" : "https://admin.aflaahqc.com" },
];

// Each class's own registration form (/register/hifz …) is the register page.
const pageOf = (pathname) => (lockedCategory(pathname) ? "/register" : PAGES[pathname] ? pathname : "/");
const pathOf = (loc) => pageOf(loc.pathname);

export default function Landing() {
  return <LangProvider><Site /></LangProvider>;
}

function Site() {
  const { lang, t } = useLang();
  const [path, setPath] = useState(() => pathOf(window.location));
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  // Bumped on every in-site move, so the register form starts afresh.
  const [visit, setVisit] = useState(0);

  // "/store" or "/#classes": switch page, then scroll to the section if any.
  const navigate = useCallback((to) => {
    const [pathAndQuery, hash] = to.split("#");
    const target = pageOf(pathAndQuery.split("?")[0] || "/");
    setMenuOpen(false);
    if (pathAndQuery !== window.location.pathname + window.location.search || hash) window.history.pushState({}, "", to);
    setPath(target);
    setVisit((v) => v + 1);
    requestAnimationFrame(() => {
      const el = hash && document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
      else window.scrollTo(0, 0);
    });
  }, []);

  useEffect(() => {
    const onPop = () => { setPath(pathOf(window.location)); setVisit((v) => v + 1); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const cat = path === "/register" && categoryOf(lockedCategory());
    document.title = cat ? `Register for ${cat.en} · Aflaah Quran Class` : PAGES[path];
  }, [path, visit]);
  // Keep the private review and info update forms out of search engines.
  useEffect(() => {
    if (path !== "/review" && path !== "/update") return undefined;
    const meta = Object.assign(document.createElement("meta"), { name: "robots", content: "noindex, nofollow" });
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [path]);
  useEffect(() => {
    if (!loginOpen) return undefined;
    const close = () => setLoginOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [loginOpen]);
  useReveal(path);

  const navLink = (to, label) => (
    <Link to={to} navigate={navigate} className={to === path ? "on" : ""}>{label}</Link>
  );

  const logins = LOGINS.map((l) => <a key={l.label} href={l.href}>{t(l.label)}</a>);
  const brand = <span className="ld-brand-name">{t("brand.name")}<small>{t("brand.sub")}</small></span>;

  return (
    <div className="ld" lang={lang} dir={lang === "dv" ? "rtl" : "ltr"}>
      <header className="ld-nav">
        <div className="ld-wrap ld-nav-in">
          <Link to="/" navigate={navigate} className="ld-brand"><img src="/images/logo-icon-only.png" alt="" />{brand}</Link>
          <nav className={`ld-links ${menuOpen ? "open" : ""}`} aria-label="Main">
            {navLink("/#classes", t("nav.classes"))}
            {navLink("/hifz", t("nav.hifz"))}
            {navLink("/store", t("nav.store"))}
            {SHOW.rules && navLink("/rules", t("nav.rules"))}
            <a href="#contact" onClick={() => setMenuOpen(false)}>{t("nav.contact")}</a>
            <div className="ld-links-portal">
              <b>{t("nav.portalLogin")}</b>
              {logins}
            </div>
          </nav>
          <div className="ld-nav-cta">
            <LangSwitch />
            <div className="ld-login ld-hide-sm">
              <button type="button" className="ld-btn ld-btn-outline ld-btn-sm" aria-expanded={loginOpen} onClick={(e) => { e.stopPropagation(); setLoginOpen((o) => !o); }}>
                {t("nav.portalLogin")} <ChevronDown size={16} aria-hidden="true" />
              </button>
              {loginOpen && (
                <div className="ld-login-menu">{logins}</div>
              )}
            </div>
            <Link to="/register" navigate={navigate} className="ld-btn ld-btn-primary ld-btn-sm">{t("nav.register")}</Link>
            <button type="button" className="ld-burger" aria-label={t(menuOpen ? "nav.closeMenu" : "nav.openMenu")} aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
              {menuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </header>

      <main>
        {path === "/" && <HomePage navigate={navigate} />}
        {path === "/hifz" && <HifzPage navigate={navigate} />}
        {path === "/store" && <StorePage />}
        {path === "/rules" && <RulesPage />}
        {path === "/review" && <ReviewPage />}
        {path === "/install" && <InstallPage />}
        {path === "/register" && <RegisterPage key={visit} />}
        {path === "/update" && <UpdatePage />}
      </main>

      <footer className="ld-foot" id="contact">
        <div className="ld-wrap">
          <div className="ld-foot-in">
            <div className="ld-foot-about">
              <span className="ld-brand"><img src="/images/logo-icon-only.png" alt="" />{brand}</span>
              <p>{t("foot.about")}</p>
            </div>
            <div className="ld-foot-col">
              <b>{t("foot.contact")}</b>
              <span><MapPin size={16} aria-hidden="true" />{t("contact.location")}</span>
              {CONTACT.phone && <a href={`tel:${CONTACT.phone}`}><Phone size={16} aria-hidden="true" /><span dir="ltr">{CONTACT.phoneDisplay}</span></a>}
              {CONTACT.email && <a href={`mailto:${CONTACT.email}`}><Mail size={16} aria-hidden="true" /><span dir="ltr">{CONTACT.email}</span></a>}
            </div>
            <div className="ld-foot-col">
              <b>{t("foot.explore")}</b>
              <Link to="/#classes" navigate={navigate}>{t("nav.classes")}</Link>
              <Link to="/register" navigate={navigate}>{t("foot.registerClass")}</Link>
              <Link to="/hifz" navigate={navigate}>{t("nav.hifz")}</Link>
              <Link to="/store" navigate={navigate}>{t("foot.bookStore")}</Link>
              {SHOW.rules && <Link to="/rules" navigate={navigate}>{t("foot.rules")}</Link>}
            </div>
            <div className="ld-foot-col">
              <b>{t("foot.signIn")}</b>
              {logins}
              <Link to="/install" navigate={navigate}>{t("foot.install")}</Link>
            </div>
          </div>
          <div className="ld-copy"><span>{t("foot.rights", { year: new Date().getFullYear() })}</span><span>{t("contact.location")}</span></div>
        </div>
      </footer>
    </div>
  );
}
