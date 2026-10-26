import { useState, useEffect, useCallback } from "react";
import { Menu, X, ChevronDown, Phone, Mail, MapPin } from "lucide-react";
import "./landing.css";
import { CONTACT, SHOW } from "./content.js";
import { Link, useReveal } from "./parts.jsx";
import HomePage from "./HomePage.jsx";
import HifzPage from "./HifzPage.jsx";
import StorePage from "./StorePage.jsx";
import RulesPage from "./RulesPage.jsx";

// Public website on the main domain: Home, Hifz program, Store and Rules. The
// staff sign-in that used to live at "/" is now at "/login" (see main.jsx).
const PAGES = {
  "/": "Aflaah Quran Class",
  "/hifz": "Hifz program · Aflaah Quran Class",
  "/store": "Book store · Aflaah Quran Class",
  ...(SHOW.rules ? { "/rules": "Rules and regulations · Aflaah Quran Class" } : {}),
};
// Pages with their own "Enrol" band at the bottom; the rest jump to Home's.
const HAS_ENROL = ["/", "/hifz"];

const LOCAL = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const LOGINS = [
  { label: "Student portal", href: LOCAL ? "/?portal=student" : "https://students.aflaahqc.com" },
  { label: "Teachers portal", href: LOCAL ? "/?portal=teacher" : "https://teachers.aflaahqc.com" },
  { label: "Admin", href: LOCAL ? "/?portal=admin" : "https://admin.aflaahqc.com" },
];

const pathOf = (loc) => (PAGES[loc.pathname] ? loc.pathname : "/");

export default function Landing() {
  const [path, setPath] = useState(() => pathOf(window.location));
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  // "/store" or "/#classes": switch page, then scroll to the section if any.
  const navigate = useCallback((to) => {
    const [p, hash] = to.split("#");
    const target = PAGES[p || "/"] ? (p || "/") : "/";
    setMenuOpen(false);
    if (target !== window.location.pathname || hash) window.history.pushState({}, "", to);
    setPath(target);
    requestAnimationFrame(() => {
      const el = hash && document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
      else window.scrollTo(0, 0);
    });
  }, []);

  useEffect(() => {
    const onPop = () => setPath(pathOf(window.location));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => { document.title = PAGES[path]; }, [path]);
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

  return (
    <div className="ld">
      <header className="ld-nav">
        <div className="ld-wrap ld-nav-in">
          <Link to="/" navigate={navigate} className="ld-brand"><img src="/images/logo-icon-only.png" alt="" /><span className="ld-brand-name">Aflaah<small>Quran Class</small></span></Link>
          <nav className={`ld-links ${menuOpen ? "open" : ""}`} aria-label="Main">
            {navLink("/#classes", "Classes")}
            {navLink("/hifz", "Hifz program")}
            {navLink("/store", "Store")}
            {SHOW.rules && navLink("/rules", "Rules")}
            <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
            <div className="ld-links-portal">
              <b>Portal login</b>
              {LOGINS.map((l) => <a key={l.label} href={l.href}>{l.label}</a>)}
            </div>
          </nav>
          <div className="ld-nav-cta">
            <div className="ld-login ld-hide-sm">
              <button type="button" className="ld-btn ld-btn-outline ld-btn-sm" aria-expanded={loginOpen} onClick={(e) => { e.stopPropagation(); setLoginOpen((o) => !o); }}>
                Portal login <ChevronDown size={16} aria-hidden="true" />
              </button>
              {loginOpen && (
                <div className="ld-login-menu">
                  {LOGINS.map((l) => <a key={l.label} href={l.href}>{l.label}</a>)}
                </div>
              )}
            </div>
            <Link to={HAS_ENROL.includes(path) ? `${path}#enrol` : "/#enrol"} navigate={navigate} className="ld-btn ld-btn-primary ld-btn-sm">Enrol now</Link>
            <button type="button" className="ld-burger" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
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
      </main>

      <footer className="ld-foot" id="contact">
        <div className="ld-wrap">
          <div className="ld-foot-in">
            <div className="ld-foot-about">
              <span className="ld-brand"><img src="/images/logo-icon-only.png" alt="" /><span className="ld-brand-name">Aflaah<small>Quran Class</small></span></span>
              <p>Quran classes for children and adults in Malé, with a student portal that tracks every step.</p>
            </div>
            <div className="ld-foot-col">
              <b>Contact</b>
              <span><MapPin size={16} aria-hidden="true" />{CONTACT.location}</span>
              {CONTACT.phone && <a href={`tel:${CONTACT.phone}`}><Phone size={16} aria-hidden="true" />{CONTACT.phoneDisplay}</a>}
              {CONTACT.email && <a href={`mailto:${CONTACT.email}`}><Mail size={16} aria-hidden="true" />{CONTACT.email}</a>}
            </div>
            <div className="ld-foot-col">
              <b>Explore</b>
              <Link to="/#classes" navigate={navigate}>Classes</Link>
              <Link to="/hifz" navigate={navigate}>Hifz program</Link>
              <Link to="/store" navigate={navigate}>Book store</Link>
              {SHOW.rules && <Link to="/rules" navigate={navigate}>Rules and regulations</Link>}
            </div>
            <div className="ld-foot-col">
              <b>Sign in</b>
              {LOGINS.map((l) => <a key={l.label} href={l.href}>{l.label}</a>)}
            </div>
          </div>
          <div className="ld-copy"><span>© {new Date().getFullYear()} Aflaah Quran Class. All rights reserved.</span><span>{CONTACT.location}</span></div>
        </div>
      </footer>
    </div>
  );
}
