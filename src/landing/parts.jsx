import { useState, useEffect, useRef } from "react";
import { Flame, Star, BookOpen, Users, Mic, Baby, Award, LineChart, Smartphone, UserRound, Phone, Mail, MapPin } from "lucide-react";
import { CONTACT, SHOW } from "./content.js";
import { useLang } from "./i18n.jsx";

export const ICONS = { flame: Flame, star: Star, book: BookOpen, users: Users, mic: Mic, baby: Baby, award: Award, chart: LineChart, phone: Smartphone };

const AVATAR_COLORS = ["#176FD1", "#18A9BD", "#123B67", "#0A94B1"];
export const avatarColor = (i) => AVATAR_COLORS[i % AVATAR_COLORS.length];
// Thaana names keep the first letter with its vowel sign ("ސާ"); a bare
// letter or a lone vowel sign doesn't read as an initial.
export const initials = (name) => (/[\u0780-\u07BF]/.test(name)
  ? [...name.trim()].slice(0, 2).join("")
  : name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase());

// Client-side navigation between the site's pages, so moving from Home to
// Store doesn't reload the app. Plain clicks only; new-tab clicks fall through.
export function Link({ to, navigate, className, children, ...rest }) {
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} className={className} onClick={onClick} {...rest}>{children}</a>;
}

export function Stars({ size = 16, rating = 5 }) {
  return (
    <span className="ld-stars" aria-label={`${rating} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={size} fill="currentColor" strokeWidth={0} className={i < rating ? undefined : "ld-star-off"} />)}
    </span>
  );
}

// Strip of items that scrolls sideways forever. The list is drawn twice so
// the loop has no gap; the copy is hidden from screen readers.
export function Marquee({ items, render, className = "" }) {
  return (
    <div className={`ld-track ${className}`}>
      {items.map((item, i) => render(item, i, false))}
      {items.map((item, i) => render(item, i, true))}
    </div>
  );
}

export function UpdateChips({ updates, light = false }) {
  return (
    <div className={`ld-ticker ${light ? "ld-ticker-light" : ""}`}>
      <Marquee
        items={updates}
        render={(u, i, copy) => {
          const Icon = ICONS[u.icon] || Star;
          return <span key={`${copy}-${i}`} className="ld-chip" aria-hidden={copy || undefined}><Icon size={16} aria-hidden="true" />{u.text}</span>;
        }}
      />
    </div>
  );
}

// Counts from 0 to `value` the first time it scrolls into view.
export function CountOnView({ value, decimals = 0, duration = 1400 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) { setShown(value); return undefined; }
    let raf;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - start) / duration);
        setShown(value * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);
  return <span ref={ref}>{shown.toFixed(decimals)}</span>;
}

// Fades `.ld-reveal` elements in as they scroll into view, and fills
// `.ld-bar-fill[data-w]` progress bars. Re-run whenever the page changes.
export function useReveal(key) {
  useEffect(() => {
    const els = document.querySelectorAll(".ld-reveal:not(.is-in), .ld-bar-fill[data-w]");
    const show = (el) => {
      el.classList.add("is-in");
      if (el.dataset.w) el.style.width = el.dataset.w;
    };
    if (!("IntersectionObserver" in window)) { els.forEach(show); return undefined; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [key]);
}

// Mock of the student portal's dashboard (header with streak, hifz
// percentage tracker, stat tiles) filled with sample numbers.
export function PortalPreview({ sample, className = "" }) {
  const { t } = useLang();
  return (
    <div className={`ld-portal ${className}`} aria-label={t("sample.label")}>
      <div className="ld-portal-head">
        <span className="ld-portal-av"><UserRound size={22} aria-hidden="true" /></span>
        <span className="ld-who">{t("sample.student")}<small>{t("sample.portal")}</small></span>
        <span className="ld-streak"><Flame size={26} aria-hidden="true" /><b>{sample.streak}</b>{t("sample.dayStreak")}</span>
      </div>
      <div className="ld-panel">
        <div className="ld-panel-row"><span>{t("sample.tracker")}</span><span><CountOnView value={sample.percent} decimals={1} />%</span></div>
        <div className="ld-bar"><div className="ld-bar-fill" data-w={`${Math.max(sample.percent * 2, 6)}%`} /></div>
        <div className="ld-bar-foot"><span>{t("sample.ayaat", { n: sample.ayahs })}</span><span>{t("sample.path")}</span></div>
      </div>
      <div className="ld-mini">
        <div>{t("sample.surahs")}<b><CountOnView value={sample.surahs} /> / 114</b></div>
        <div>{t("sample.pages")}<b><CountOnView value={sample.pagesThisWeek} /></b></div>
      </div>
    </div>
  );
}

// Closing band on Home and Hifz: how to get in touch to enrol. Call and
// email buttons only appear once CONTACT has a real phone or email.
export function EnrolCta({ title, text, navigate }) {
  const { t } = useLang();
  return (
    <section className="ld-cta">
      <div className="ld-wrap ld-cta-in ld-reveal">
        <div>
          <h2 className="ld-h2">{title}</h2>
          <p>{text}</p>
        </div>
        <div className="ld-cta-actions">
          {CONTACT.phone && <a className="ld-btn ld-btn-white" href={`tel:${CONTACT.phone}`}><Phone size={18} aria-hidden="true" />{t("cta.call", { phone: CONTACT.phoneDisplay })}</a>}
          {CONTACT.email && <a className="ld-btn ld-btn-ghost" href={`mailto:${CONTACT.email}`}><Mail size={18} aria-hidden="true" />{t("cta.email")}</a>}
          {!CONTACT.phone && !CONTACT.email && <span className="ld-cta-visit"><MapPin size={18} aria-hidden="true" />{t("cta.visit", { location: t("contact.location") })}</span>}
          {SHOW.rules && <Link to="/rules" navigate={navigate} className="ld-btn ld-btn-ghost">{t("cta.rules")}</Link>}
        </div>
      </div>
    </section>
  );
}

// Banner at the top of the website's forms (review, registration): the
// same logo, calligraphy and translation as the home page's hero.
export function FormHeader() {
  return (
    <div className="ld-rv-banner">
      <img className="ld-rv-logo" src="/images/logo-full-white.png" alt="Aflaah Quran Class" />
      <img className="ld-callig" src="/images/calligraphy-khairukum.png" alt="خيركم من تعلم القرآن وعلمه — The best of you are those who learn the Quran and teach it" />
      <p className="ld-callig-tr">“The best of you are those who learn the Quran and teach it.”</p>
    </div>
  );
}
