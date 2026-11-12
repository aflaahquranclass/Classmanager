// Brand colours, the portal page styles and small helpers shared by every
// portal. Kept out of App.jsx so the Students Portal (and each lazily loaded
// admin tab) can use them without downloading the whole staff app.
import { useState, useEffect, useMemo, useRef } from "react";
import { ChevronRight, Search } from "lucide-react";

// Palette + background pattern for the sign-in screen only (kept separate from
// the `C` palette below, which drives the rest of the app's inner screens).
// Palette for the redesigned Teacher Portal shell (sidebar + "My timetable"
// page). Kept separate from `C` so the rest of the teacher portal (Attendance,
// Class records) is unaffected.
export const TP = {
  bg: "#EEF6FA",
  navy: "#123B67",
  blue: "#176FD1",
  teal: "#0A94B1",
  border: "#C7DDF4",
  secondaryText: "#567493",
  gradStart: "#0D4F85",
  gradEnd: "#0A94B1",
};

// Decorative Islamic geometric corner accents for the Teacher Portal shell —
// finished transparent PNG assets (not CSS-generated), served from
// /public/images/. Rendered once in TeacherPortalLayout so they appear
// consistently behind every teacher-portal page without duplication.
export const TP_PATTERN_SIDEBAR_URL = "/images/tp-pattern-sidebar.png";
// The official logo with its wordmark, white (also logo-full-color / -black.png).
export const TP_LOGO_FULL_WHITE_URL = "/images/logo-full-white.png";
export const TP_PATTERN_MAIN_URL = "/images/tp-pattern-main.png";

// Shared CSS for the Teacher Portal and Admin Portal shells (sidebar,
// header/card/accordion/badge page chrome) — defined once so the two
// layouts never duplicate each other's styles.
// The brand blue gradient (sign-in pages, loading screen, sidebar, buttons).
const BRAND_GRADIENT = (angle) => `linear-gradient(${angle}, ${TP.gradStart} 0%, ${TP.blue} 55%, ${TP.gradEnd} 100%)`;

export const TP_SHARED_STYLES = `
        .tp-shell { display: flex; align-items: stretch; min-height: 100vh; min-height: 100dvh; font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; background: ${TP.bg}; }
        .tp-mobile-bar { display: none; }
        .tp-sidebar-wrap { display: contents; }
        .tp-sidebar {
          position: relative; overflow: hidden; width: clamp(260px, 20vw, 300px); flex-shrink: 0;
          background: radial-gradient(circle at 20% 0%, rgba(255,255,255,0.14), transparent 45%), ${BRAND_GRADIENT("170deg")};
          color: #FFFFFF; padding: 28px 18px 20px; display: flex; flex-direction: column; box-sizing: border-box;
        }
        /* Wide screens: the sidebar fills the window and stays put while the page scrolls. */
        @media (min-width: 901px) {
          .tp-sidebar { position: sticky; top: 0; height: 100vh; height: 100dvh; overflow-y: auto; }
        }
        /* The rosette's centre sits in the sidebar's bottom-left corner; faded
           before its rough outer edge (as on the sign-in pages). */
        .tp-sidebar-pattern {
          position: absolute; left: 0; bottom: 0; width: 300px; max-width: 95%; height: auto; opacity: 0.16;
          pointer-events: none; user-select: none; z-index: 0;
          -webkit-mask-image: radial-gradient(circle at 0% 100%, #000 0%, #000 42%, rgba(0,0,0,0.55) 56%, transparent 72%);
          mask-image: radial-gradient(circle at 0% 100%, #000 0%, #000 42%, rgba(0,0,0,0.55) 56%, transparent 72%);
        }
        .tp-content { position: relative; flex: 1; min-width: 0; overflow: hidden; background: ${TP.bg}; }
        .tp-content-tinted { background: ${TP.bg}; }
        .tp-content .lc-main { position: relative; z-index: 1; }
        .tp-page-pattern {
          position: absolute; top: 0; right: 0; width: 320px; max-width: 90%; height: auto; opacity: 0.18;
          pointer-events: none; user-select: none; z-index: 0;
        }
        @media (max-width: 640px) {
          .tp-sidebar-pattern { width: 190px; }
          .tp-page-pattern { width: 200px; }
        }
        .tp-sidebar-logo { display: flex; justify-content: center; margin-bottom: 8px; position: relative; z-index: 1; }
        .tp-sidebar-logo img { width: 150px; height: auto; display: block; }
        .tp-sidebar-brand { position: relative; z-index: 1; text-align: center; font-size: 19px; font-weight: 700; line-height: 1.25; }
        .tp-sidebar-role {
          position: relative; z-index: 1; text-align: center; font-size: 13px; color: rgba(255,255,255,0.78);
          margin: 4px 0 20px; padding-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,0.2);
        }
        .tp-avatar-row { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }
        .tp-avatar {
          width: 46px; height: 46px; border-radius: 50%; background: #FFFFFF; color: ${TP.gradStart};
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .tp-avatar-name { font-size: 16px; font-weight: 700; line-height: 1.25; }
        .tp-avatar-role { font-size: 13px; color: rgba(255,255,255,0.78); }
        .tp-nav { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 6px; }
        .tp-nav-item {
          display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px;
          font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.88); cursor: pointer;
          background: transparent; border: none; text-align: left; width: 100%;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .tp-nav-item:hover { background: rgba(255,255,255,0.10); color: #FFFFFF; }
        .tp-nav-item:focus-visible { outline: 2px solid #FFFFFF; outline-offset: 2px; }
        .tp-nav-item-active { background: #FFFFFF; color: ${TP.gradStart}; box-shadow: 0 4px 14px rgba(0,0,0,0.18); }
        .tp-nav-item-active:hover { background: #FFFFFF; color: ${TP.gradStart}; }
        .tp-sidebar-spacer { flex: 1; }
        .tp-logout {
          position: relative; z-index: 1; display: flex; align-items: center; gap: 10px; justify-content: center;
          padding: 12px 16px; border-radius: 12px; font-size: 14px; font-weight: 600; color: #FFFFFF;
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.35); cursor: pointer;
          margin-top: 16px; transition: background 0.15s ease, box-shadow 0.15s ease;
        }
        .tp-logout:hover { background: rgba(255,255,255,0.18); }
        .tp-logout:focus-visible { outline: 2px solid #FFFFFF; outline-offset: 2px; }
        .tp-ghost-btn {
          position: relative; z-index: 1; display: flex; align-items: center; gap: 10px; justify-content: center;
          padding: 12px 16px; border-radius: 12px; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.88);
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.28); cursor: pointer;
          margin-top: 16px; transition: background 0.15s ease, box-shadow 0.15s ease;
        }
        .tp-ghost-btn:hover { background: rgba(255,255,255,0.16); color: #FFFFFF; }
        .tp-ghost-btn:focus-visible { outline: 2px solid #FFFFFF; outline-offset: 2px; }

        /* ---- Shared page chrome reused by every portal page: header,
           chip, buttons, cards, segmented control, accordion rows,
           badges. Defined once here so no page duplicates its own copy. ---- */
        .tp-header { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 22px; }
        .tp-title-group { display: flex; align-items: center; gap: 12px; }
        .tp-title-icon { width: 42px; height: 42px; border-radius: 12px; background: #E4F1FC; color: ${TP.blue}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .tp-title { font-size: clamp(26px, 3vw, 40px); font-weight: 700; color: ${TP.navy}; margin: 0; font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .tp-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .tp-chip { display: inline-flex; align-items: center; gap: 8px; height: 48px; padding: 0 16px; border-radius: 12px; background: #FFFFFF; border: 1px solid ${TP.border}; color: ${TP.navy}; font-weight: 600; font-size: 14px; min-height: 44px; }
        .tp-btn-outline { display: inline-flex; align-items: center; gap: 8px; height: 48px; padding: 0 16px; border-radius: 12px; background: #FFFFFF; border: 1px solid ${TP.border}; color: ${TP.navy}; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.15s ease, box-shadow 0.15s ease; min-height: 44px; }
        .tp-btn-outline:hover { background: #F3F9FD; box-shadow: 0 3px 10px rgba(23,111,209,0.12); }
        .tp-btn-outline:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
        .tp-btn-outline:disabled { opacity: 0.6; cursor: not-allowed; }
        .tp-btn-gradient { display: inline-flex; align-items: center; gap: 8px; height: 48px; padding: 0 18px; border-radius: 12px; border: none; background: ${BRAND_GRADIENT("90deg")}; color: #FFFFFF; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 8px 18px rgba(13,79,133,0.26); transition: filter 0.15s ease, transform 0.1s ease; min-height: 44px; }
        .tp-btn-gradient:hover { filter: brightness(1.06); }
        .tp-btn-gradient:active { transform: scale(0.98); }
        .tp-btn-gradient:focus-visible { outline: 2px solid ${TP.navy}; outline-offset: 2px; }
        .tp-btn-gradient:disabled { opacity: 0.65; cursor: not-allowed; filter: none; }
        .tp-card { position: relative; z-index: 1; background: #FFFFFF; border: 1px solid ${TP.border}; border-radius: 20px; padding: 18px; box-shadow: 0 10px 30px rgba(18,59,103,0.08); }
        .tp-subtext { font-size: 14px; color: ${TP.secondaryText}; margin-bottom: 16px; }
        .tp-date-picker { display: inline-flex; align-items: center; gap: 8px; height: 48px; padding: 0 16px; border-radius: 12px; background: #FFFFFF; border: 1px solid ${TP.border}; min-height: 44px; }
        .tp-date-picker svg { color: ${TP.blue}; flex-shrink: 0; }
        .tp-date-picker input[type="date"] { border: none; outline: none; font-size: 14px; font-weight: 600; color: ${TP.navy}; background: transparent; font-family: inherit; cursor: pointer; }
        .tp-date-picker input[type="date"]:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; border-radius: 4px; }
        .tp-segment { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
        .tp-segment-btn { flex: 0 0 auto; padding: 12px 22px; border-radius: 12px; border: 1px solid ${TP.border}; background: #FFFFFF; color: ${TP.navy}; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease; min-height: 44px; font-family: inherit; }
        .tp-segment-btn:hover { background: #F3F9FD; }
        .tp-segment-btn:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
        .tp-segment-btn-active { background: ${BRAND_GRADIENT("90deg")}; color: #FFFFFF; border-color: transparent; }
        .tp-segment-btn-active:hover { background: ${BRAND_GRADIENT("90deg")}; }
        .tp-accordion-row { display: flex; align-items: center; gap: 14px; width: 100%; box-sizing: border-box; padding: 16px 18px; border: 1px solid ${TP.border}; border-radius: 14px; background: #FFFFFF; cursor: pointer; text-align: left; font-family: inherit; transition: box-shadow 0.15s ease, border-color 0.15s ease; margin-bottom: 10px; min-height: 44px; }
        .tp-accordion-row:hover { box-shadow: 0 4px 14px rgba(18,59,103,0.08); border-color: #AFCFEC; }
        .tp-accordion-row:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
        .tp-accordion-chevron { color: ${TP.blue}; flex-shrink: 0; transition: transform 0.2s ease; }
        .tp-accordion-chevron-open { transform: rotate(90deg); }
        .tp-code-badge { flex-shrink: 0; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 8px; }
        .tp-accordion-title { flex: 1; min-width: 0; font-weight: 700; color: ${TP.navy}; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tp-count-badge { flex-shrink: 0; font-size: 13px; font-weight: 600; color: ${TP.navy}; background: #EAF3FC; padding: 6px 14px; border-radius: 999px; white-space: nowrap; }
        .tp-accordion-panel { padding: 4px 4px 4px 18px; margin-bottom: 12px; }
        .tp-month-heading-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
        .tp-month-icon { color: ${TP.blue}; flex-shrink: 0; }
        .tp-month-heading { font-size: 19px; font-weight: 700; color: ${TP.navy}; white-space: nowrap; }
        .tp-month-underline { width: 56px; height: 3px; border-radius: 2px; background: ${BRAND_GRADIENT("90deg")}; flex-shrink: 0; }
        .tp-month-line { flex: 1; min-width: 24px; height: 1px; background: ${TP.border}; }
        .tp-date-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: ${TP.navy}; background: #EAF3FC; border: 1px solid ${TP.border}; padding: 6px 14px; border-radius: 999px; margin-bottom: 10px; }
        .tp-table-wrap { overflow-x: auto; }
        table.tp-list-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 560px; }
        table.tp-list-table thead th { background: #EAF3FC; color: ${TP.navy}; font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: 0.04em; padding: 14px 12px; text-align: left; border-bottom: 1px solid ${TP.border}; }
        table.tp-list-table thead th:first-child { border-top-left-radius: 12px; }
        table.tp-list-table thead th:last-child { border-top-right-radius: 12px; }
        table.tp-list-table td { padding: 10px 12px; border-bottom: 1px solid #E4EFF9; vertical-align: middle; font-size: 14px; color: ${TP.navy}; }
        table.tp-list-table tbody tr:last-child td { border-bottom: none; }
        table.tp-list-table tbody tr:hover td { background: #F8FBFE; }
        table.tp-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 760px; }
        table.tp-table thead th { background: #EAF3FC; color: ${TP.navy}; font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: 0.04em; padding: 14px 12px; text-align: left; border-bottom: 1px solid ${TP.border}; position: sticky; top: 0; }
        table.tp-table thead th:first-child { border-top-left-radius: 12px; width: 150px; }
        table.tp-table thead th:last-child { border-top-right-radius: 12px; }
        table.tp-table td { padding: 10px 12px; border-bottom: 1px solid #E4EFF9; vertical-align: top; }
        table.tp-table td.tp-time-cell { color: ${TP.navy}; font-weight: 600; white-space: nowrap; background: #F8FBFE; }
        .tp-entry { display: block; box-sizing: border-box; padding: 8px 10px 8px 12px; margin-bottom: 6px; border-radius: 10px; font-size: 13px; font-weight: 600; color: ${TP.navy}; border-left: 3px solid ${TP.blue}; }
        .tp-entry:last-child { margin-bottom: 0; }
        .tp-entry-blue { background: #E3EFFC; border-left-color: ${TP.blue}; }
        .tp-entry-aqua { background: #E6F2FA; border-left-color: ${TP.gradStart}; }
        @media (max-width: 640px) {
          .tp-header { gap: 12px; }
          .tp-actions { width: 100%; }
          .tp-actions .tp-chip, .tp-actions .tp-btn-outline, .tp-actions .tp-btn-gradient, .tp-actions .tp-date-picker { flex: 1 1 auto; justify-content: center; }
          .tp-segment { width: 100%; }
          .tp-segment-btn { flex: 1 1 auto; }
          .tp-accordion-row { flex-wrap: wrap; }
          .tp-accordion-title { min-width: 120px; }
        }
        @media (max-width: 900px) {
          .tp-bell-desktop { display: none; }
          .tp-mobile-bar {
            display: flex; align-items: center; justify-content: space-between; padding: 12px 16px;
            background: ${BRAND_GRADIENT("90deg")}; color: #FFFFFF;
            position: sticky; top: 0; z-index: 50;
          }
          .tp-mobile-bar-brand { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 700; }
          .tp-mobile-bar-brand img { height: 30px; width: auto; }
          .tp-mobile-toggle {
            background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.32); border-radius: 8px;
            color: #FFFFFF; padding: 7px; display: flex; cursor: pointer;
          }
          .tp-mobile-toggle:focus-visible { outline: 2px solid #FFFFFF; outline-offset: 2px; }
          .tp-shell { flex-direction: column; }
          .tp-sidebar-wrap { display: block; }
          .tp-sidebar {
            position: fixed; top: 0; left: 0; bottom: 0; width: 82vw; max-width: 310px; z-index: 60;
            overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
            transform: translateX(-100%); transition: transform 0.25s ease; box-shadow: 6px 0 28px rgba(0,0,0,0.25);
          }
          .tp-sidebar-wrap-open .tp-sidebar { transform: translateX(0); }
          .tp-backdrop { position: fixed; inset: 0; background: rgba(10,30,50,0.45); z-index: 55; }
        }
      `;

export const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function shiftMonth(key, delta) {
  let [y, m] = key.split("-").map(Number);
  m += delta;
  while (m > 12) { m -= 12; y += 1; }
  while (m < 1) { m += 12; y -= 1; }
  return `${y}-${String(m).padStart(2, "0")}`;
}
export function fmtMoney(n) {
  const num = Number.isFinite(n) ? n : 0;
  const text = num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return (
    <>
      <MvrIcon />
      {text}
    </>
  );
}
function MvrIcon({ style }) {
  return (
    <svg
      viewBox="0 0 960 609"
      style={{ width: "0.95em", height: "0.6em", display: "inline-block", verticalAlign: "-0.02em", marginRight: "0.22em", flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        transform="translate(0,609) scale(0.1,-0.1)"
        d="M9073 6075 c-56 -15 -300 -136 -778 -383 -415 -214 -1124 -586 -1403 -735 l-232 -124 -103 39 c-227 86 -540 173 -716 199 -265 38 -483 -58 -580 -255 -84 -171 -81 -445 6 -609 38 -71 145 -176 220 -215 35 -18 63 -35 63 -37 0 -2 -55 -45 -122 -96 -68 -52 -181 -140 -252 -196 -71 -57 -133 -103 -138 -103 -5 0 -109 36 -231 79 -272 97 -424 146 -531 171 -98 24 -251 26 -351 5 -268 -57 -455 -287 -455 -560 0 -194 93 -369 254 -480 31 -21 56 -40 56 -42 0 -5 -401 -271 -550 -365 -474 -298 -1005 -596 -1485 -833 -307 -151 -421 -200 -505 -216 -88 -16 -297 -14 -510 5 -295 27 -482 20 -565 -21 -54 -27 -114 -94 -136 -153 -59 -156 -19 -468 90 -695 60 -127 95 -178 184 -271 133 -141 240 -190 389 -180 280 19 693 176 1287 490 729 386 1727 1008 2724 1699 118 81 164 108 180 104 12 -3 134 -44 271 -91 438 -152 875 -274 1111 -311 233 -37 413 11 546 144 75 75 122 162 144 269 44 204 -9 376 -160 527 -119 119 -273 201 -545 290 -63 21 -119 41 -123 45 -4 4 70 65 165 137 95 71 195 148 221 171 27 23 56 42 66 42 10 0 51 -11 92 -25 257 -89 954 -291 1202 -349 323 -76 533 -44 670 103 90 96 131 213 130 371 0 119 -18 204 -63 295 -87 176 -277 293 -708 434 l-203 67 108 61 c201 114 677 348 898 443 399 169 638 299 759 410 84 77 136 188 136 290 0 94 -49 230 -116 321 -89 122 -255 176 -411 134z"
      />
    </svg>
  );
}

// Drop-in replacement for a native <select> that adds a search box to the
// options list. Works the same everywhere (laptop, tablet, phone) because it's
// pure CSS positioning — no separate mobile code path — except the dropdown
// panel switches to a bottom-anchored fixed sheet under 640px so it's always
// reachable with a thumb instead of getting clipped by the viewport.
export function SearchableSelect({ options, value, onChange, placeholder = "Select…", disabled = false, style, className = "" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value)) || null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || (o.keywords && o.keywords.includes(q)));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const raf = requestAnimationFrame(() => inputRef.current && inputRef.current.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const pick = (opt) => { onChange(opt.value); setOpen(false); };
  const handleKeyDown = (e) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter") { e.preventDefault(); if (filtered[activeIndex]) pick(filtered[activeIndex]); }
  };

  return (
    <div className={`lc-ss ${className}`} style={style} ref={rootRef}>
      <button type="button" className="lc-ss-trigger" disabled={disabled} onClick={() => setOpen((o) => !o)}>
        <span className={selected ? "" : "lc-ss-placeholder"}>{selected ? selected.label : placeholder}</span>
        <ChevronRight size={14} style={{ transform: "rotate(90deg)", flexShrink: 0, opacity: 0.55 }} aria-hidden="true" />
      </button>
      {open && (
        <div className="lc-ss-panel">
          <div className="lc-ss-search-wrap">
            <Search size={14} color="#5B6B79" aria-hidden="true" />
            <input
              ref={inputRef}
              className="lc-ss-search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Search…"
            />
          </div>
          <div className="lc-ss-list">
            {filtered.length === 0 ? (
              <div className="lc-ss-empty">No matches</div>
            ) : (
              filtered.map((opt, i) => (
                <div
                  key={opt.value}
                  className={`lc-ss-option ${String(opt.value) === String(value) ? "lc-ss-option-selected" : ""} ${i === activeIndex ? "lc-ss-option-active" : ""}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => pick(opt)}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
