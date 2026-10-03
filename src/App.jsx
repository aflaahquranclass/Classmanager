import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Users, GraduationCap, Wallet, ArrowRight, ChevronRight, ChevronLeft, LayoutDashboard, CalendarDays, Search, X, PartyPopper, ClipboardCheck, BookOpen, LogOut, KeyRound, Layers, CheckCircle2, XCircle, Ban, Clock, Repeat2, Trash2, AlertTriangle, Sun, CheckCheck, Shield, Eye, EyeOff, Mail, Lock, Menu, Image as ImageIcon, FileText, RotateCw, User, Phone, Plus } from "lucide-react";
import { supabase } from "./supabaseClient.js";

const LOGO_DATA_URI = "data:image/png;base64,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";
const LOGO_WHITE_DATA_URI = "data:image/png;base64,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";

// Palette + background pattern for the sign-in screen only (kept separate from
// the `C` palette below, which drives the rest of the app's inner screens).
const LOGIN = {
  bg: "#EFF8FF",
  primary: "#2D87C8",
  primaryDark: "#256FA8",
  accent: "#74C0E8",
  text: "#173B57",
  white: "#FFFFFF",
  gold: "#C89B43",
  gradStart: "#2A4B8D",
  gradEnd: "#22B8C4",
};

// Full-bleed background photo/illustration for the sign-in screen — a finished
// asset (not CSS-generated), served from /public/images/.
const LOGIN_BACKGROUND_URL = "/images/aflaah-login-background.jpg";

// Sign-in screen logo icon only (cropped from the client-supplied brand
// graphic). Kept separate from LOGO_DATA_URI, which stays wired to PDF/report
// generation elsewhere in the app and shouldn't change with this.
const LOGIN_LOGO_ICON_URL = "/images/logo-icon-only.png";

// Palette for the redesigned Teacher Portal shell (sidebar + "My timetable"
// page). Kept separate from `C` so the rest of the teacher portal (Attendance,
// Class records) is unaffected.
const TP = {
  bg: "#EEF6FA",
  navy: "#123B67",
  blue: "#176FD1",
  teal: "#18A9BD",
  border: "#C7DDF4",
  secondaryText: "#567493",
  logoutCoral: "#FF817D",
  gradStart: "#0D4F85",
  gradMid: "#0875A2",
  gradEnd: "#0A94B1",
};

// Short class-code badge (e.g. "PC", "DLC", "HC") derived from the existing
// class name — never hard-coded. Cycles through pastel colorways by a stable
// hash of the code so the same class always gets the same color, and the
// code text itself (not just color) conveys the class type.
const TP_BADGE_STYLES = [
  { bg: "#DCEBFB", color: "#1D5FA8" }, // pale blue
  { bg: "#DAF3F1", color: "#0F7A78" }, // pale aqua
  { bg: "#EDE3FA", color: "#6A3FA0" }, // pale lavender
];
function classCode(name) {
  return (name || "—").trim().split(/\s+/)[0].slice(0, 4).toUpperCase();
}
function classBadgeStyle(code) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  return TP_BADGE_STYLES[hash % TP_BADGE_STYLES.length];
}

// Decorative Islamic geometric corner accents for the Teacher Portal shell —
// finished transparent PNG assets (not CSS-generated), served from
// /public/images/. Rendered once in TeacherPortalLayout so they appear
// consistently behind every teacher-portal page without duplication.
const TP_PATTERN_SIDEBAR_URL = "/images/tp-pattern-sidebar.png";
const TP_PATTERN_MAIN_URL = "/images/tp-pattern-main.png";

// Shared CSS for the Teacher Portal and Admin Portal shells (sidebar,
// header/card/accordion/badge page chrome) — defined once so the two
// layouts never duplicate each other's styles.
const TP_SHARED_STYLES = `
        .tp-shell { display: flex; align-items: stretch; min-height: 640px; font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .tp-mobile-bar { display: none; }
        .tp-sidebar-wrap { display: contents; }
        .tp-sidebar {
          position: sticky; top: 0; align-self: flex-start; height: 100vh; height: 100dvh; overflow-x: hidden; overflow-y: auto;
          width: clamp(260px, 20vw, 300px); flex-shrink: 0;
          background: linear-gradient(180deg, ${TP.gradStart} 0%, ${TP.gradMid} 58%, ${TP.gradEnd} 100%);
          color: #FFFFFF; padding: 28px 18px 20px; display: flex; flex-direction: column; box-sizing: border-box;
        }
        .tp-sidebar-pattern {
          position: absolute; left: 0; bottom: 0; width: 300px; max-width: 90%; height: auto; opacity: 0.13;
          pointer-events: none; user-select: none; z-index: 0;
        }
        .tp-content { position: relative; flex: 1; min-width: 0; overflow: hidden; }
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
        .tp-sidebar-logo img { height: 52px; width: auto; display: block; }
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
          padding: 12px 16px; border-radius: 12px; font-size: 14px; font-weight: 600; color: ${TP.logoutCoral};
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,129,125,0.55); cursor: pointer;
          margin-top: 16px; transition: background 0.15s ease, box-shadow 0.15s ease;
        }
        .tp-logout:hover { background: rgba(255,129,125,0.16); }
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
        .tp-btn-gradient { display: inline-flex; align-items: center; gap: 8px; height: 48px; padding: 0 18px; border-radius: 12px; border: none; background: linear-gradient(90deg, ${TP.blue}, ${TP.teal}); color: #FFFFFF; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 8px 18px rgba(23,111,209,0.28); transition: filter 0.15s ease, transform 0.1s ease; min-height: 44px; }
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
        .tp-segment-btn-active { background: linear-gradient(90deg, ${TP.blue}, ${TP.teal}); color: #FFFFFF; border-color: transparent; }
        .tp-segment-btn-active:hover { background: linear-gradient(90deg, ${TP.blue}, ${TP.teal}); }
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
        .tp-month-underline { width: 56px; height: 3px; border-radius: 2px; background: linear-gradient(90deg, ${TP.blue}, ${TP.teal}); flex-shrink: 0; }
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
        .tp-entry { display: block; box-sizing: border-box; padding: 8px 10px; margin-bottom: 6px; border-radius: 10px; font-size: 13px; font-weight: 600; color: ${TP.navy}; }
        .tp-entry:last-child { margin-bottom: 0; }
        .tp-entry-blue { background: #DCEBFB; }
        .tp-entry-aqua { background: #DAF3F1; }
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
          .tp-mobile-bar {
            display: flex; align-items: center; justify-content: space-between; padding: 12px 16px;
            background: linear-gradient(90deg, ${TP.gradStart}, ${TP.gradEnd}); color: #FFFFFF;
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
            position: fixed; top: 0; left: 0; bottom: 0; height: auto; width: 82vw; max-width: 310px; z-index: 60;
            transform: translateX(-100%); transition: transform 0.25s ease; box-shadow: 6px 0 28px rgba(0,0,0,0.25);
          }
          .tp-sidebar-wrap-open .tp-sidebar { transform: translateX(0); }
          .tp-backdrop { position: fixed; inset: 0; background: rgba(10,30,50,0.45); z-index: 55; }
        }
      `;

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// Shared color palette (short keys keep inline style objects compact)
// a=muted b=rust c=white d=green e=blue f=navy g=blueBg h=roseBg i=greenBg j=teal
// k=slate l=tealBg m=black n=grayMuted o=peach p=purpleBg q=purpleLight r=purpleMid
// s=purple t=yellowBg u=amber v=blueBg2 w=ink x=grayBg y=orange
const C = {
a:"#5B6B79",
b:"#A5432C",
c:"#FFFFFF",
d:"#1E6B45",
e:"#2E86C1",
f:"#1B4F72",
g:"#F4F9FD",
h:"#FBEAE6",
i:"#E3F0E7",
j:"#1B6E82",
k:"#4B5563",
l:"#E4F3F6",
m:"#000000",
n:"#8A93A0",
o:"#EAB5A2",
p:"#EEE7F8",
q:"#C6AEE8",
r:"#9B6FD1",
s:"#6A3FA0",
t:"#FCF1DD",
u:"#9C6B12",
v:"#EAF4FB",
w:"#1B2733",
x:"#EDEFF2",
y:"#D9573A",
};

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}
function isEnrolledInMonth(student, monthKey) {
  return !student.joinedMonth || student.joinedMonth <= monthKey;
}
function shiftMonth(key, delta) {
  let [y, m] = key.split("-").map(Number);
  m += delta;
  while (m > 12) { m -= 12; y += 1; }
  while (m < 1) { m += 12; y -= 1; }
  return `${y}-${String(m).padStart(2, "0")}`;
}
function fmtMoney(n) {
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
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Drop-in replacement for a native <select> that adds a search box to the
// options list. Works the same everywhere (laptop, tablet, phone) because it's
// pure CSS positioning — no separate mobile code path — except the dropdown
// panel switches to a bottom-anchored fixed sheet under 640px so it's always
// reachable with a thumb instead of getting clipped by the viewport.
function SearchableSelect({ options, value, onChange, placeholder = "Select…", disabled = false, style, className = "" }) {
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

const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// The "unmarked attendance" reminder only applies going forward from the day
// this policy started — older gaps from before it existed are grandfathered
// in and never flagged.
const UNMARKED_ATTENDANCE_START_DATE = "2026-09-18";

// Shared visual theme for attendance-day status — used to color and iconify
// calendar cells consistently (background, border, icon, text all match).
const ATT_STATUS_THEME = {
  present: { bg: C.i, border: "#9FCBAE", ring: "#5FA579", color: C.d, label: "Present" },
  absent: { bg: C.h, border: C.o, ring: "#D9825F", color: C.b, label: "Absent" },
  cancelled: { bg: "#EEF0F3", border: "#C6CCD4", ring: "#98A2AE", color: C.k, label: "Cancelled" },
  moved: { bg: C.p, border: C.q, ring: C.r, color: C.s, label: "Moved" },
  movedHere: { bg: C.p, border: C.q, ring: C.r, color: C.s, label: "Moved here" },
  pending: { bg: C.t, border: "#EFCB86", ring: "#D9A234", color: C.u, label: "Pending" },
  holiday: { bg: C.l, border: "#A7D8E3", ring: "#5FB6CB", color: C.j, label: "Holiday" },
};

// English transliterated surah names, in Quran order — used by the Hifz Exam
// question builder's Surah dropdowns.
const SURAH_NAMES_EN = [
  "Al-Fatihah", "Al-Baqarah", "Al-Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal",
  "At-Tawbah", "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf",
  "Maryam", "Ta-Ha", "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara", "An-Naml",
  "Al-Qasas", "Al-Ankabut", "Ar-Rum", "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin",
  "As-Saffat", "Sad", "Az-Zumar", "Ghafir", "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah",
  "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf", "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar",
  "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadila", "Al-Hashr", "Al-Mumtahanah", "As-Saff", "Al-Jumu'ah",
  "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij",
  "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba",
  "An-Nazi'at", "Abasa", "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq",
  "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad", "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin",
  "Al-Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-Adiyat", "Al-Qari'ah", "At-Takathur", "Al-Asr",
  "Al-Humazah", "Al-Fil", "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr", "Al-Masad",
  "Al-Ikhlas", "Al-Falaq", "An-Nas",
];
const SURAH_OPTIONS_EN = SURAH_NAMES_EN.map((name, i) => ({ value: name, label: `${i + 1}. ${name}`, keywords: String(i + 1) }));

const EXAM_QUESTION_TYPES = [
  "Continue recitation",
  "Recite from memory",
  "Identify next ayah",
  "Tajweed check",
  "Revision (Muraja'ah)",
];

function fmtTime12(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h)) return t;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatSchedule(schedule) {
  if (!schedule || !schedule.days || schedule.days.length === 0) return "—";
  return `${schedule.days.join(", ")} · ${fmtTime12(schedule.startTime)}–${fmtTime12(schedule.endTime)}`;
}

function formatRecordSummaryText(rec) {
  if (!rec) return "";
  if (rec.recordType === "hifz" && (rec.hifz || rec.shortMuraja || rec.longMuraja)) {
    const sections = [
      { label: "Hifz", data: rec.hifz },
      { label: "Short Muraja'ah", data: rec.shortMuraja },
      { label: "Long Muraja'ah", data: rec.longMuraja },
    ].filter((s) => s.data && (s.data.startSurah || s.data.endSurah));
    if (sections.length === 0) return "";
    return sections
      .map((s) => {
        const d = s.data;
        const from = d.startSurah ? `${d.startSurah}${d.startAyah ? `:${d.startAyah}` : ""}` : "—";
        const to = d.endSurah ? `${d.endSurah}${d.endAyah ? `:${d.endAyah}` : ""}` : "—";
        return `${s.label}: ${from} to ${to} (${d.mistakes || 0} mistakes)`;
      })
      .join("; ");
  }
  return rec.note || "";
}

function CountUp({ value, formatter }) {
  const [display, setDisplay] = useState(0);
  const isMoney = typeof formatter === "function";
  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    const start = 0;
    const duration = 650;
    const startTime = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(start + (target - start) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{isMoney ? formatter(display) : Math.round(display)}</>;
}

// Which portal this web address serves. aqc-teachers.* shows only the teacher
// login and aqc-admin.* only the admin login; any other address (the original
// aflaah-app.vercel.app, localhost) keeps both. On localhost, ?portal=teacher|admin
// lets you try the single-portal modes. This is UX separation only — the real
// access control is the database's row-level security.
function detectPortal() {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    const q = new URLSearchParams(window.location.search).get("portal");
    return q === "teacher" || q === "admin" ? q : null;
  }
  if (host.startsWith("aqc-teachers")) return "teacher";
  if (host.startsWith("aqc-admin")) return "admin";
  return null;
}
const PORTAL = detectPortal();

// Unified sign-in screen: Teachers Portal and Admin Portal (or just one of
// them when this address is dedicated to a single portal).
function LoginScreen({
  accountType,
  onAccountTypeChange,
  fields,
  showPassword,
  onToggleShowPassword,
  rememberMe,
  onToggleRememberMe,
  onSubmit,
  onForgotPassword,
  forgotPasswordStatus,
}) {
  const segments = [
    { key: "teacher", label: "Teachers Portal", renderIcon: () => <BookOpen size={44} aria-hidden="true" /> },
    {
      key: "admin",
      label: "Admin Portal",
      renderIcon: () => (
        <span className="login-segment-icon-shield">
          <Shield size={44} aria-hidden="true" />
          <KeyRound size={44} aria-hidden="true" />
        </span>
      ),
    },
  ].filter((s) => !PORTAL || s.key === PORTAL);

  // Focus ring is driven by explicit state (not just the :focus pseudo-class)
  // so it's guaranteed visible and testable across environments.
  const [focusedField, setFocusedField] = useState(null); // "email" | "password" | null

  return (
    <div className="login-page">
      <style>{`
        body { margin: 0; }
        .login-page { position: relative; min-height: 100vh; min-height: 100dvh; background-color: ${LOGIN.bg}; background-image: url("${LOGIN_BACKGROUND_URL}"); background-size: cover; background-position: center; background-repeat: no-repeat; display: flex; align-items: center; justify-content: center; font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; color: ${LOGIN.text}; }
        .login-card { position: relative; width: min(460px, calc(100vw - 32px)); box-sizing: border-box; background: transparent; border: none; border-radius: 0; padding: 40px 8px; box-shadow: none; }
        .login-card-logo { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 26px; }
        .login-card-logo img { width: clamp(84px, 8vw, 100px); height: auto; display: block; margin-bottom: 14px; }
        .login-card-brand-name { font-size: clamp(24px, 2.4vw, 30px); font-weight: 600; color: ${LOGIN.text}; line-height: 1.25; }
        .login-card-sub { font-size: clamp(17px, 1.4vw, 20px); color: #5A7C93; text-align: center; margin-bottom: 28px; }
        .login-segment { display: flex; border: 1px solid #DCEEFA; border-radius: 16px; overflow: hidden; margin-bottom: 28px; height: clamp(100px, 10vw, 118px); background: ${LOGIN.white}; }
        .login-segment-btn { flex: 1 1 0%; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; padding: 6px 4px; border: none; border-right: 1px solid #E3F0FA; background: transparent; color: #5A8CB8; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
        .login-segment-btn:last-child { border-right: none; }
        .login-segment-btn:hover { background: rgba(45,135,200,0.06); }
        .login-segment-btn:active { transform: scale(0.98); }
        .login-segment-btn:focus-visible { outline: 2px solid ${LOGIN.primary}; outline-offset: -3px; }
        .login-segment-btn-active { background: #EAF4FB; color: ${LOGIN.primary}; box-shadow: inset 0 0 0 2px ${LOGIN.primary}; border-radius: 14px; }
        .login-segment-btn svg { width: clamp(28px, 4.2vw, 44px); height: clamp(28px, 4.2vw, 44px); }
        .login-segment-icon-shield { position: relative; width: clamp(28px, 4.2vw, 44px); height: clamp(28px, 4.2vw, 44px); display: inline-flex; align-items: center; justify-content: center; }
        .login-segment-icon-shield svg { position: absolute; }
        .login-segment-icon-shield svg:last-child { width: 46% !important; height: 46% !important; transform: rotate(-45deg); }
        .login-segment-label { font-size: clamp(12px, 1.3vw, 16px); font-weight: 600; color: ${LOGIN.text}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        .login-field { margin-bottom: 18px; }
        .login-field label { display: block; font-size: 14px; font-weight: 600; color: ${LOGIN.text}; margin-bottom: 8px; }
        .login-input-wrap { position: relative; display: flex; align-items: center; }
        .login-input-wrap svg.login-input-icon { position: absolute; left: 16px; color: #8FADC0; pointer-events: none; }
        .login-input { width: 100%; box-sizing: border-box; height: 54px; border: 1px solid #C4DCEC; border-radius: 11px; padding: 0 44px; font-size: 16px; background: ${LOGIN.white}; color: ${LOGIN.text}; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .login-input:hover { border-color: ${LOGIN.accent}; }
        .login-input:focus, .login-input-focused { outline: none; border-color: ${LOGIN.primary}; box-shadow: 0 0 0 3px rgba(45,135,200,0.16); }
        .login-input-toggle { position: absolute; right: 12px; background: none; border: none; padding: 6px; display: flex; color: #8FADC0; cursor: pointer; border-radius: 6px; }
        .login-input-toggle:hover { color: ${LOGIN.primary}; }
        .login-input-toggle:focus-visible { outline: 2px solid ${LOGIN.primary}; outline-offset: 1px; }
        .login-row-between { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; font-size: 14px; flex-wrap: wrap; gap: 10px; }
        .login-remember { display: flex; align-items: center; gap: 9px; color: #43617A; cursor: pointer; }
        .login-remember input { width: 17px; height: 17px; accent-color: ${LOGIN.primary}; cursor: pointer; }
        .login-forgot { background: none; border: none; padding: 0; color: ${LOGIN.primary}; font-size: 14px; font-weight: 600; cursor: pointer; }
        .login-forgot:hover { text-decoration: underline; }
        .login-forgot:focus-visible { outline: 2px solid ${LOGIN.primary}; outline-offset: 2px; }
        .login-error { font-size: 14px; color: #B5432E; margin: -6px 0 16px; }
        .login-status { font-size: 14px; color: ${LOGIN.primaryDark}; margin: -6px 0 16px; }
        .login-submit { width: 100%; border: none; border-radius: 12px; height: 64px; font-size: 19px; font-weight: 700; color: ${LOGIN.white}; background: linear-gradient(90deg, ${LOGIN.gradStart}, ${LOGIN.gradEnd}); cursor: pointer; box-shadow: 0 10px 24px rgba(34,184,196,0.28); transition: filter 0.15s ease, transform 0.1s ease; }
        .login-submit:hover { filter: brightness(1.06); }
        .login-submit:active { transform: scale(0.99); }
        .login-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .login-submit:focus-visible { outline: 3px solid ${LOGIN.accent}; outline-offset: 2px; }
        @media (max-width: 480px) {
          .login-page { background-position: center top; }
          .login-card { width: calc(100vw - 24px); padding: 24px; border-radius: 18px; }
          .login-card-logo { margin-bottom: 20px; }
          .login-card-sub { margin-bottom: 22px; }
          .login-segment { height: clamp(88px, 24vw, 104px); margin-bottom: 22px; }
        }
        /* Short viewports (laptops, browser chrome eating into height): shrink
           vertical rhythm so the card fits without page scroll. Sized off vh
           (not vw) so it responds to height regardless of how wide the window
           is. Independent of the width breakpoints above, can combine with them. */
        @media (max-height: 820px) {
          .login-page { padding: 6px 0; align-items: flex-start; }
          .login-card { padding-top: 14px; padding-bottom: 14px; margin: auto 0; }
          .login-card-logo { margin-bottom: 6px; }
          .login-card-logo img { width: clamp(36px, 8vh, 60px); margin-bottom: 4px; }
          .login-card-brand-name { font-size: clamp(16px, 2.6vh, 22px); }
          .login-card-sub { font-size: clamp(11px, 1.8vh, 15px); margin-bottom: 6px; }
          .login-segment { height: clamp(50px, 9vh, 80px); margin-bottom: 6px; }
          .login-segment-btn svg, .login-segment-icon-shield { width: clamp(16px, 3.4vh, 28px); height: clamp(16px, 3.4vh, 28px); }
          .login-segment-label { font-size: clamp(9px, 1.4vh, 12px); }
          .login-field { margin-bottom: 6px; }
          .login-field label { margin-bottom: 2px; font-size: 12px; }
          .login-input { height: clamp(32px, 5.6vh, 44px); }
          .login-row-between { margin-bottom: 6px; font-size: 12px; }
          .login-submit { height: clamp(38px, 6vh, 48px); font-size: clamp(14px, 1.8vh, 16px); }
        }
      `}</style>
      <div className="login-card">
        <div className="login-card-logo">
          <img src={LOGIN_LOGO_ICON_URL} alt="Aflaah Quran Class logo" />
          <div className="login-card-brand-name">Aflaah Quran Class</div>
        </div>

        <div className="login-card-sub">{segments.length === 1 ? `Sign in to the ${segments[0].label}` : "Sign in to continue"}</div>

        {segments.length > 1 && (
          <div className="login-segment" role="group" aria-label="Portal">
            {segments.map(({ key, label, renderIcon }) => (
              <button
                key={key}
                type="button"
                aria-pressed={accountType === key}
                className={`login-segment-btn ${accountType === key ? "login-segment-btn-active" : ""}`}
                onClick={() => onAccountTypeChange(key)}
              >
                {renderIcon()}
                <span className="login-segment-label">{label}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          <div className="login-field">
            <label htmlFor="login-email">Email address</label>
            <div className="login-input-wrap">
              <Mail size={17} className="login-input-icon" aria-hidden="true" />
              <input
                id="login-email"
                className={`login-input ${focusedField === "email" ? "login-input-focused" : ""}`}
                type="email"
                autoComplete="email"
                autoFocus
                value={fields.email}
                onChange={(e) => fields.setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField((f) => (f === "email" ? null : f))}
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <div className="login-input-wrap">
              <Lock size={17} className="login-input-icon" aria-hidden="true" />
              <input
                id="login-password"
                className={`login-input ${focusedField === "password" ? "login-input-focused" : ""}`}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={fields.password}
                onChange={(e) => fields.setPassword(e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField((f) => (f === "password" ? null : f))}
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="login-input-toggle"
                onClick={onToggleShowPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <div className="login-row-between">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => onToggleRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <button type="button" className="login-forgot" onClick={onForgotPassword}>
              Forgot password?
            </button>
          </div>

          {fields.error ? (
            <div className="login-error">{fields.error}</div>
          ) : forgotPasswordStatus ? (
            <div className="login-status">{forgotPasswordStatus}</div>
          ) : null}

          <button type="submit" className="login-submit" disabled={fields.loading}>
            {fields.loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Shared shell for every Teacher Portal page (My timetable, Attendance, Class
// records): gradient sidebar with avatar + nav, collapsing to an accessible
// drawer on mobile. Page content is passed as children — this component only
// owns navigation chrome, not page-specific layout.
function TeacherPortalLayout({ activeSection, navItems, teacherDisplayName, onLogout, children }) {
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (e) => { if (e.key === "Escape") setNavOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  const sidebar = (
    <nav className="tp-sidebar" aria-label="Teacher portal navigation">
      <img src={TP_PATTERN_SIDEBAR_URL} className="tp-sidebar-pattern" alt="" aria-hidden="true" />
      <div className="tp-sidebar-logo"><img src={LOGO_WHITE_DATA_URI} alt="" /></div>
      <div className="tp-sidebar-brand">Aflaah Quran Class</div>
      <div className="tp-sidebar-role">Teacher Portal</div>
      <div className="tp-avatar-row">
        <span className="tp-avatar" aria-hidden="true"><GraduationCap size={24} /></span>
        <div>
          <div className="tp-avatar-name">{teacherDisplayName}</div>
          <div className="tp-avatar-role">Teacher</div>
        </div>
      </div>
      <div className="tp-nav">
        {navItems.map(({ key, label, icon: Icon, onClick }) => (
          <button
            key={key}
            type="button"
            className={`tp-nav-item ${activeSection === key ? "tp-nav-item-active" : ""}`}
            aria-current={activeSection === key ? "page" : undefined}
            onClick={() => { onClick(); setNavOpen(false); }}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <div className="tp-sidebar-spacer" />
      <button type="button" className="tp-logout" onClick={onLogout}>
        <LogOut size={16} aria-hidden="true" />
        Log out
      </button>
    </nav>
  );

  return (
    <div className="tp-shell">
      <style>{TP_SHARED_STYLES}</style>
      <div className="tp-mobile-bar no-print">
        <span className="tp-mobile-bar-brand">
          <img src={LOGO_WHITE_DATA_URI} alt="" />
          Teacher Portal
        </span>
        <button
          type="button"
          className="tp-mobile-toggle"
          aria-label={navOpen ? "Close menu" : "Open menu"}
          aria-expanded={navOpen}
          onClick={() => setNavOpen((v) => !v)}
        >
          {navOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>
      {navOpen && <div className="tp-backdrop no-print" onClick={() => setNavOpen(false)} />}
      <div className={`tp-sidebar-wrap no-print ${navOpen ? "tp-sidebar-wrap-open" : ""}`}>{sidebar}</div>
      <div className={`tp-content ${activeSection === "timetable" ? "tp-content-tinted" : ""}`}>
        <img src={TP_PATTERN_MAIN_URL} className="tp-page-pattern" alt="" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

// Shared shell for the Admin portal — same gradient sidebar,
// Islamic pattern assets, and page chrome as TeacherPortalLayout (reusing
// TP_SHARED_STYLES so nothing is duplicated), reskinned with an admin
// avatar and an optional "Teacher login" shortcut alongside Log out.
function AdminPortalLayout({ activeSection, navItems, portalLabel, displayName, roleLabel, onTeacherLogin, onLogout, children }) {
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (e) => { if (e.key === "Escape") setNavOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  const sidebar = (
    <nav className="tp-sidebar" aria-label="Admin portal navigation">
      <img src={TP_PATTERN_SIDEBAR_URL} className="tp-sidebar-pattern" alt="" aria-hidden="true" />
      <div className="tp-sidebar-logo"><img src={LOGO_WHITE_DATA_URI} alt="" /></div>
      <div className="tp-sidebar-brand">Aflaah Quran Class</div>
      <div className="tp-sidebar-role">{portalLabel}</div>
      <div className="tp-avatar-row">
        <span className="tp-avatar" aria-hidden="true"><Shield size={22} /></span>
        <div>
          <div className="tp-avatar-name">{displayName}</div>
          <div className="tp-avatar-role">{roleLabel}</div>
        </div>
      </div>
      <div className="tp-nav">
        {navItems.map(({ key, label, icon: Icon, onClick }) => (
          <button
            key={key}
            type="button"
            className={`tp-nav-item ${activeSection === key ? "tp-nav-item-active" : ""}`}
            aria-current={activeSection === key ? "page" : undefined}
            onClick={() => { onClick(); setNavOpen(false); }}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <div className="tp-sidebar-spacer" />
      {onTeacherLogin && (
        <button type="button" className="tp-ghost-btn" onClick={onTeacherLogin}>
          <KeyRound size={15} aria-hidden="true" />
          Teacher login
        </button>
      )}
      <button type="button" className="tp-logout" onClick={onLogout}>
        <LogOut size={16} aria-hidden="true" />
        Log out
      </button>
    </nav>
  );

  return (
    <div className="tp-shell">
      <style>{TP_SHARED_STYLES}</style>
      <div className="tp-mobile-bar no-print">
        <span className="tp-mobile-bar-brand">
          <img src={LOGO_WHITE_DATA_URI} alt="" />
          {portalLabel}
        </span>
        <button
          type="button"
          className="tp-mobile-toggle"
          aria-label={navOpen ? "Close menu" : "Open menu"}
          aria-expanded={navOpen}
          onClick={() => setNavOpen((v) => !v)}
        >
          {navOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>
      {navOpen && <div className="tp-backdrop no-print" onClick={() => setNavOpen(false)} />}
      <div className={`tp-sidebar-wrap no-print ${navOpen ? "tp-sidebar-wrap-open" : ""}`}>{sidebar}</div>
      <div className="tp-content">
        <img src={TP_PATTERN_MAIN_URL} className="tp-page-pattern" alt="" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [paymentsByMonth, setPaymentsByMonth] = useState({});
  const [expensesByMonth, setExpensesByMonth] = useState({});
  const [otherIncomeByMonth, setOtherIncomeByMonth] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2200);
  };
  const [logoImg, setLogoImg] = useState(null);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setLogoImg(img);
    img.src = LOGO_DATA_URI;
  }, []);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const [section, setSection] = useState("dashboard"); // dashboard | students | teachers | classes | timetable | finance | data
  const [dataMonths, setDataMonths] = useState([]);
  const [dataOverviewLoading, setDataOverviewLoading] = useState(false);
  const [dataOverviewLoaded, setDataOverviewLoaded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { month, scope } | null
  const [deletingKey, setDeletingKey] = useState(null); // `${month}:${scope}` while deleting
  const [backupLoadingKey, setBackupLoadingKey] = useState(null); // `${month}:${format}` while preparing
  const [financeView, setFinanceView] = useState("dashboard"); // dashboard | payments | salaries | ledger | student
  const [finStudentSearch, setFinStudentSearch] = useState("");
  const [finStudentId, setFinStudentId] = useState("");
  const [finStudentPayments, setFinStudentPayments] = useState([]); // { month, paid, amountPaid, paidDate }
  const [finStudentLoading, setFinStudentLoading] = useState(false);
  const [expenseDescInput, setExpenseDescInput] = useState("");
  const [expenseAmountInput, setExpenseAmountInput] = useState("");
  const [expenseDateInput, setExpenseDateInput] = useState("");
  const [incomeDescInput, setIncomeDescInput] = useState("");
  const [incomeAmountInput, setIncomeAmountInput] = useState("");
  const [incomeDateInput, setIncomeDateInput] = useState("");

  const [month, setMonth] = useState(currentMonthKey());

  const [timetableView, setTimetableView] = useState("students"); // students | teachers
  const [ttStudentId, setTtStudentId] = useState("");
  const [ttTeacherId, setTtTeacherId] = useState("");

  // ---- Auth / roles ----
  // Real Supabase Auth: email + password go to supabase.auth.signInWithPassword().
  // Once signed in, we read the caller's row from `profiles` (role: admin|teacher)
  // to decide which portal to show. RLS on every table enforces this server-side
  // too, so this is UX routing, not the actual security boundary.
  const [role, setRole] = useState("admin"); // admin | teacher
  const [authView, setAuthView] = useState("checking"); // checking | login | app
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [loggedInTeacherId, setLoggedInTeacherId] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [teacherLoginLoading, setTeacherLoginLoading] = useState(false);

  // Sign-in screen: which of the two segmented options (teacher/admin) is active.
  const [accountType, setAccountType] = useState(PORTAL || "teacher"); // teacher | admin
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState("");

  // Restore an existing Supabase session on load, and react to sign-out (e.g. token expiry).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) { setAuthView("login"); return; }
      await routeSignedInUser(session.user.id);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setRole("admin"); setIsAdminAuthenticated(false); setLoggedInTeacherId(null);
        setAuthView("login");
      }
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  // "Remember me" only remembers the last-used account type + email (never
  // the password) so the sign-in form is prefilled on the next visit. Actual
  // session persistence is handled by Supabase Auth itself, independently.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("aflaah_remembered_login") || "null");
      if (!saved || (PORTAL && saved.type !== PORTAL)) return;
      if (saved.type === "admin") { setAccountType("admin"); setAdminEmailInput(saved.email || ""); }
      else if (saved.type === "teacher") { setAccountType("teacher"); setLoginEmail(saved.email || ""); }
    } catch {
      // ignore malformed/blocked storage
    }
  }, []);

  // After a successful sign-in (fresh login or restored session), figure out
  // whether this user is an admin or a teacher and route them accordingly.
  const routeSignedInUser = async (userId) => {
    const { data: profile, error: profileErr } = await supabase
      .from("profiles").select("role").eq("id", userId).maybeSingle();
    if (profileErr || !profile) {
      await supabase.auth.signOut();
      setAdminLoginError("Couldn't load this account's role. Contact the admin.");
      setLoginError("Couldn't load this account's role. Contact the admin.");
      setAuthView("login");
      return;
    }
    if (profile.role === "admin") {
      if (PORTAL === "teacher") {
        await supabase.auth.signOut();
        setLoginError("This is the teachers' login. Admins sign in at the admin address.");
        setAuthView("login");
        return;
      }
      setRole("admin"); setIsAdminAuthenticated(true); setAuthView("app");
      return;
    }
    const { data: teacherRow } = await supabase
      .from("teachers").select("id").eq("user_id", userId).maybeSingle();
    if (teacherRow) {
      if (PORTAL === "admin") {
        await supabase.auth.signOut();
        setAdminLoginError("This is the admin login. Teachers sign in at the teachers' address.");
        setAuthView("login");
        return;
      }
      setRole("teacher"); setLoggedInTeacherId(teacherRow.id); setAuthView("app"); setSection("timetable");
      return;
    }
    await supabase.auth.signOut();
    setLoginError("This login isn't linked to a teacher record yet. Ask the admin to link it.");
    setAdminLoginError("This account isn't an admin account.");
    setAccountType(PORTAL || "teacher");
    setAuthView("login");
  };

  const signInAdmin = async () => {
    const email = adminEmailInput.trim().toLowerCase();
    if (!email || !adminPasswordInput) { setAdminLoginError("Enter an email and password."); return; }
    setAdminLoginLoading(true);
    setAdminLoginError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: adminPasswordInput });
    if (error || !data.user) {
      setAdminLoginError("Incorrect email or password.");
      setAdminLoginLoading(false);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (profile && profile.role === "admin") {
      setIsAdminAuthenticated(true);
      setRole("admin");
      setAuthView("app");
      setAdminEmailInput(""); setAdminPasswordInput("");
      setAdminLoginLoading(false);
      return;
    }
    await supabase.auth.signOut();
    setAdminLoginError("This account isn't an admin account.");
    setAdminLoginLoading(false);
  };

  const signInTeacher = async () => {
    const email = loginEmail.trim().toLowerCase();
    if (!email || !loginPassword) { setLoginError("Enter an email and password."); return; }
    setTeacherLoginLoading(true);
    setLoginError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: loginPassword });
    if (error || !data.user) {
      setLoginError("Incorrect email or password.");
      setTeacherLoginLoading(false);
      return;
    }
    const { data: teacherRow } = await supabase.from("teachers").select("id").eq("user_id", data.user.id).maybeSingle();
    if (!teacherRow) {
      await supabase.auth.signOut();
      setLoginError("This login isn't linked to a teacher record yet. Ask the admin to link it under Teachers.");
      setTeacherLoginLoading(false);
      return;
    }
    setRole("teacher");
    setLoggedInTeacherId(teacherRow.id);
    setAuthView("app");
    setSection("timetable");
    setLoginEmail(""); setLoginPassword("");
    setTeacherLoginLoading(false);
  };

  const accountTypeFields = {
    admin: { email: adminEmailInput, setEmail: setAdminEmailInput, password: adminPasswordInput, setPassword: setAdminPasswordInput, error: adminLoginError, loading: adminLoginLoading },
    teacher: { email: loginEmail, setEmail: setLoginEmail, password: loginPassword, setPassword: setLoginPassword, error: loginError, loading: teacherLoginLoading },
  };

  const handleAccountTypeChange = (type) => {
    setAccountType(type);
    setAdminLoginError(""); setLoginError(""); setForgotPasswordStatus("");
  };

  const handleUnifiedSignIn = () => {
    const email = accountTypeFields[accountType].email.trim();
    if (rememberMe && email) {
      localStorage.setItem("aflaah_remembered_login", JSON.stringify({ type: accountType, email }));
    } else {
      localStorage.removeItem("aflaah_remembered_login");
    }
    if (accountType === "admin") signInAdmin();
    else signInTeacher();
  };

  const handleForgotPassword = async () => {
    const email = accountTypeFields[accountType].email.trim().toLowerCase();
    if (!email) { setForgotPasswordStatus("Enter your email above first."); return; }
    setForgotPasswordStatus("Sending…");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setForgotPasswordStatus(error ? (error.message || "Couldn't send reset email.") : "Password reset email sent — check your inbox.");
  };

  const signOutUser = async () => {
    await supabase.auth.signOut();
    setRole("admin"); setIsAdminAuthenticated(false); setLoggedInTeacherId(null);
    setAuthView("login");
  };

  // ---- Supabase <-> app field mapping ----
  // The app's in-memory shape (camelCase) is kept exactly as it was, so none of
  // the UI code below needs to change — only these mappers + the load/save
  // functions know that Supabase uses snake_case columns.
  const STUDENT_TO_DB = (s) => ({
    name: s.name, class_id: s.classId || null, class_name: s.className || null,
    fee: Number(s.fee) || 0, phone: s.phone || null, teacher_id: s.teacherId || null,
    teacher_share_percent: Number(s.sharePercent) || 0, schedule: s.schedule || null,
    joined_month: s.joinedMonth || null,
  });
  const STUDENT_FROM_DB = (r) => ({
    id: r.id, userId: r.user_id, name: r.name, classId: r.class_id, className: r.class_name,
    fee: r.fee, phone: r.phone, teacherId: r.teacher_id,
    sharePercent: r.teacher_share_percent, schedule: r.schedule, joinedMonth: r.joined_month,
    email: r.email,
  });
  const TEACHER_TO_DB = (t) => ({
    name: t.name, subject: t.subject || null, phone: t.phone || null, email: t.email || null,
  });
  const TEACHER_FROM_DB = (r) => ({
    id: r.id, userId: r.user_id, name: r.name, subject: r.subject, phone: r.phone, email: r.email,
  });
  const CLASS_TO_DB = (c) => ({
    name: c.name, code: c.code || null, teacher_id: c.teacherId || null, days: c.days || [],
    start_time: c.startTime || null, end_time: c.endTime || null,
  });
  const CLASS_FROM_DB = (r) => ({
    id: r.id, name: r.name, code: r.code || "", teacherId: r.teacher_id, days: r.days || [],
    startTime: r.start_time || "", endTime: r.end_time || "",
  });
  const HOLIDAY_TO_DB = (h) => ({ label: h.label, start_date: h.startDate, end_date: h.endDate });
  const HOLIDAY_FROM_DB = (r) => ({ id: r.id, label: r.label, startDate: r.start_date, endDate: r.end_date });

  // Reconciles a full new list against the last-known list for a table:
  // inserts new rows, updates changed rows, deletes removed rows. Returns the
  // authoritative list (with real DB-issued ids swapped in for new items) so
  // callers can keep using local ids like `students`/`classes` unchanged.
  const syncTable = async (table, oldList, newList, toDb, fromDb) => {
    const oldIds = new Set(oldList.map((x) => x.id));
    const newIds = new Set(newList.map((x) => x.id));
    const toDelete = oldList.filter((x) => !newIds.has(x.id)).map((x) => x.id);
    const toInsert = newList.filter((x) => !oldIds.has(x.id));
    const toUpdate = newList.filter((x) => oldIds.has(x.id));

    if (toDelete.length) {
      const { error } = await supabase.from(table).delete().in("id", toDelete);
      if (error) throw error;
    }
    let insertedRows = [];
    if (toInsert.length) {
      const { data, error } = await supabase.from(table).insert(toInsert.map(toDb)).select();
      if (error) throw error;
      insertedRows = data;
    }
    if (toUpdate.length) {
      const rows = toUpdate.map((item) => ({ id: item.id, ...toDb(item) }));
      const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }
    // Rebuild the list in the same order as newList, swapping in real ids for inserts.
    let insertCursor = 0;
    return newList.map((item) => {
      if (!oldIds.has(item.id)) {
        const row = insertedRows[insertCursor]; insertCursor += 1;
        return row ? fromDb(row) : item;
      }
      return item;
    });
  };

  // ---- Attendance & class records (teacher portal) ----
  const [attendanceView, setAttendanceView] = useState("day"); // day | calendar — Day view is the default landing view
  const [attendanceByDate, setAttendanceByDate] = useState({});
  const [recordDate, setRecordDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [openClassName, setOpenClassName] = useState(null); // which class is open in Day view; null = class list
  const [attDraft, setAttDraft] = useState({}); // unsaved present/absent picks for the open class
  const [attReschedule, setAttReschedule] = useState(null); // null | { type: "day" } | { type: "class", className }
  const [attRescheduleDate, setAttRescheduleDate] = useState("");
  const [attRescheduleStart, setAttRescheduleStart] = useState("");
  const [attRescheduleEnd, setAttRescheduleEnd] = useState("");
  const [attRescheduleError, setAttRescheduleError] = useState("");
  const [attCalendarYear, setAttCalendarYear] = useState(() => new Date().getFullYear());
  const [attCalendarMonth0, setAttCalendarMonth0] = useState(() => new Date().getMonth());
  const [attStudentId, setAttStudentId] = useState("");
  const [attClassId, setAttClassId] = useState("");
  const [attDetailOpen, setAttDetailOpen] = useState(false);
  const [attendanceBulkLoaded, setAttendanceBulkLoaded] = useState(false);
  const [attendanceBulkLoading, setAttendanceBulkLoading] = useState(false);
  const [teacherUnmarkedDismissals, setTeacherUnmarkedDismissals] = useState([]); // { date, className }
  const [unmarkedDismissingKey, setUnmarkedDismissingKey] = useState(null);

  const [expandedClasses, setExpandedClasses] = useState(new Set());

  // ---- Hifz Exams (teacher portal "Exams" page) ----
  const [examView, setExamView] = useState("details"); // details | history
  const [examStudentName, setExamStudentName] = useState("");
  const [examDate, setExamDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [examQuestions, setExamQuestions] = useState([{ id: 1, surah: "", ayah: "", questionType: EXAM_QUESTION_TYPES[0], result: "correct", remark: "" }]);
  const [examComments, setExamComments] = useState("");
  const [examFinalResult, setExamFinalResult] = useState(null); // null | "pass" | "not_passed"
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [examReports, setExamReports] = useState([]);
  const [examReportsLoaded, setExamReportsLoaded] = useState(false);
  const [examReportsLoading, setExamReportsLoading] = useState(false);
  const [viewExamId, setViewExamId] = useState(null);
  const [editingExamId, setEditingExamId] = useState(null);
  const [examDeletingId, setExamDeletingId] = useState(null);

  const toggleClassExpand = (key) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const groupByClass = (items) => {
    const map = new Map();
    items.forEach((item) => {
      const cls = item.className || "Unassigned";
      if (!map.has(cls)) map.set(cls, []);
      map.get(cls).push(item);
    });
    return Array.from(map.entries()).map(([className, entries]) => ({ className, entries }));
  };

  // Student form
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [sName, setSName] = useState("");
  const [sClassId, setSClassId] = useState("");
  const [sFee, setSFee] = useState("");
  const [sPhone, setSPhone] = useState("");
  const [sSharePercent, setSSharePercent] = useState("0");
  const [sJoinedMonth, setSJoinedMonth] = useState("");

  // Teacher form
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [tName, setTName] = useState("");
  const [tSubject, setTSubject] = useState("");
  const [tPhone, setTPhone] = useState("");
  const [tEmail, setTEmail] = useState("");

  // Class form
  const [classesView, setClassesView] = useState("classes"); // classes | students
  const [classes, setClasses] = useState([]);
  const [showClassForm, setShowClassForm] = useState(false);
  const [editingClassId, setEditingClassId] = useState(null);
  const [cName, setCName] = useState("");
  const [cCode, setCCode] = useState("");
  const [cTeacherId, setCTeacherId] = useState("");
  const [cDays, setCDays] = useState([]);
  const [cStartTime, setCStartTime] = useState("");
  const [cEndTime, setCEndTime] = useState("");
  const [classFormError, setClassFormError] = useState("");

  // Holiday / term-break form
  const [holidays, setHolidays] = useState([]);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState(null);
  const [hLabel, setHLabel] = useState("");
  const [hStartDate, setHStartDate] = useState("");
  const [hEndDate, setHEndDate] = useState("");
  const [holidayFormError, setHolidayFormError] = useState("");

  const [payDrafts, setPayDrafts] = useState({});

  // ---- Admin Attendance (Student Records + Follow-up Alerts) ----
  const [adminAttendanceView, setAdminAttendanceView] = useState("records"); // records | alerts
  const [adminAttSearch, setAdminAttSearch] = useState("");
  const [adminAttClassId, setAdminAttClassId] = useState("");
  const [adminAttContactFilter, setAdminAttContactFilter] = useState("");
  const [adminAttRangeStart, setAdminAttRangeStart] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [adminAttRangeEnd, setAdminAttRangeEnd] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [adminAttRecordsLoaded, setAdminAttRecordsLoaded] = useState(false);
  const [adminAttRecordsLoading, setAdminAttRecordsLoading] = useState(false);
  const [adminAllAttendance, setAdminAllAttendance] = useState([]); // flat rows: { date, studentId, status }
  const [adminAttPage, setAdminAttPage] = useState(1);
  const [adminAttPageSize, setAdminAttPageSize] = useState(20);
  const [adminAttViewStudentId, setAdminAttViewStudentId] = useState(null);
  const [followUps, setFollowUps] = useState([]); // { studentId, contactStatus, remarks, remarkDraft }
  const [followUpDrafts, setFollowUpDrafts] = useState({}); // studentId -> { remarks, contacted }
  const [followUpSavingId, setFollowUpSavingId] = useState(null);
  const [unrecordedDismissals, setUnrecordedDismissals] = useState([]); // { teacherId, dismissedAt }
  const [adminAttUnrecordedTeacherId, setAdminAttUnrecordedTeacherId] = useState(null);
  const [unrecordedDismissingId, setUnrecordedDismissingId] = useState(null);

  // ---- Admin Exams (all teachers' Hifz exam reports) ----
  const [adminExamSearch, setAdminExamSearch] = useState("");
  const [adminExamTeacherId, setAdminExamTeacherId] = useState("");
  const [adminExamResultFilter, setAdminExamResultFilter] = useState("");
  const [adminExamReports, setAdminExamReports] = useState([]);
  const [adminExamReportsLoaded, setAdminExamReportsLoaded] = useState(false);
  const [adminExamReportsLoading, setAdminExamReportsLoading] = useState(false);
  const [adminViewExamId, setAdminViewExamId] = useState(null);
  const [adminExamDeletingId, setAdminExamDeletingId] = useState(null);

  useEffect(() => {
    if (authView !== "app") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [studentsRes, teachersRes, classesRes, holidaysRes] = await Promise.all([
          supabase.from("students").select("*"),
          supabase.from("teachers").select("*"),
          supabase.from("classes").select("*"),
          supabase.from("holidays").select("*"),
        ]);
        if (studentsRes.error) throw studentsRes.error;
        if (teachersRes.error) throw teachersRes.error;
        if (classesRes.error) throw classesRes.error;
        if (holidaysRes.error) throw holidaysRes.error;
        if (!cancelled) {
          setStudents(studentsRes.data.map(STUDENT_FROM_DB));
          setTeachers(teachersRes.data.map(TEACHER_FROM_DB));
          setClasses(classesRes.data.map(CLASS_FROM_DB));
          setHolidays(holidaysRes.data.map(HOLIDAY_FROM_DB));
        }
      } catch {
        if (!cancelled) setLoadError("Couldn't load your data. Try refreshing.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authView]);

  const loadMonthPayments = useCallback(async (key) => {
    if (paymentsByMonth[key]) return;
    try {
      const { data, error } = await supabase.from("payments").select("*").eq("month", key);
      if (error) throw error;
      const map = {};
      (data || []).forEach((r) => {
        map[r.student_id] = { paid: r.paid, amountPaid: r.amount_paid, paidDate: r.paid_date };
      });
      setPaymentsByMonth((prev) => ({ ...prev, [key]: map }));
    } catch {
      setPaymentsByMonth((prev) => ({ ...prev, [key]: {} }));
    }
  }, [paymentsByMonth]);

  useEffect(() => { if (authView === "app") loadMonthPayments(month); }, [month, authView]);

  const saveStudents = async (list) => {
    const previous = students;
    setStudents(list);
    try {
      const authoritative = await syncTable("students", previous, list, STUDENT_TO_DB, STUDENT_FROM_DB);
      setStudents(authoritative);
      setSaveError(null);
    } catch {
      setStudents(previous);
      setSaveError("Save failed. Your change may not persist.");
    }
  };

  const saveTeachers = async (list) => {
    const previous = teachers;
    setTeachers(list);
    try {
      const authoritative = await syncTable("teachers", previous, list, TEACHER_TO_DB, TEACHER_FROM_DB);
      setTeachers(authoritative);
      setSaveError(null);
    } catch {
      setTeachers(previous);
      setSaveError("Save failed. Your change may not persist.");
    }
  };

  const saveClasses = async (list) => {
    const previous = classes;
    setClasses(list);
    try {
      const authoritative = await syncTable("classes", previous, list, CLASS_TO_DB, CLASS_FROM_DB);
      setClasses(authoritative);
      setSaveError(null);
    } catch {
      setClasses(previous);
      setSaveError("Save failed. Your change may not persist.");
    }
  };

  const saveMonthPayments = async (key, data) => {
    const previous = paymentsByMonth[key] || {};
    setPaymentsByMonth((prev) => ({ ...prev, [key]: data }));
    try {
      const validStudentIds = new Set(students.map((s) => s.id));
      const rows = Object.entries(data)
        .filter(([studentId]) => validStudentIds.has(studentId))
        .map(([studentId, rec]) => ({
          student_id: studentId,
          month: key,
          paid: !!rec.paid,
          amount_paid: rec.amountPaid ?? null,
          paid_date: rec.paidDate || null,
        }));
      if (rows.length) {
        const { error } = await supabase.from("payments").upsert(rows, { onConflict: "student_id,month" });
        if (error) throw error;
      }
      setSaveError(null);
    } catch {
      setPaymentsByMonth((prev) => ({ ...prev, [key]: previous }));
      setSaveError("Save failed. Your change may not persist.");
    }
  };

  const monthData = paymentsByMonth[month] || {};

  // ---- Finance: free-form expense / other-income ledgers (month-scoped) ----
  const loadMonthExpenses = useCallback(async (key) => {
    if (expensesByMonth[key]) return;
    try {
      const { data, error } = await supabase.from("class_expenses").select("*").eq("month", key).order("created_at");
      if (error) throw error;
      setExpensesByMonth((prev) => ({ ...prev, [key]: (data || []).map((r) => ({ id: r.id, description: r.description, amount: r.amount, date: r.expense_date })) }));
    } catch {
      setExpensesByMonth((prev) => ({ ...prev, [key]: [] }));
    }
  }, [expensesByMonth]);

  const loadMonthOtherIncome = useCallback(async (key) => {
    if (otherIncomeByMonth[key]) return;
    try {
      const { data, error } = await supabase.from("other_income").select("*").eq("month", key).order("created_at");
      if (error) throw error;
      setOtherIncomeByMonth((prev) => ({ ...prev, [key]: (data || []).map((r) => ({ id: r.id, description: r.description, amount: r.amount, date: r.income_date })) }));
    } catch {
      setOtherIncomeByMonth((prev) => ({ ...prev, [key]: [] }));
    }
  }, [otherIncomeByMonth]);

  useEffect(() => {
    if (authView !== "app") return;
    loadMonthExpenses(month);
    loadMonthOtherIncome(month);
  }, [month, authView]);

  const addExpense = async (key, description, amount, date) => {
    try {
      const { data, error } = await supabase.from("class_expenses").insert({ month: key, description, amount, expense_date: date || null }).select().single();
      if (error) throw error;
      setExpensesByMonth((prev) => ({ ...prev, [key]: [...(prev[key] || []), { id: data.id, description: data.description, amount: data.amount, date: data.expense_date }] }));
      setSaveError(null);
    } catch {
      setSaveError("Save failed. Your change may not persist.");
    }
  };
  const removeExpense = async (key, id) => {
    const previous = expensesByMonth[key] || [];
    setExpensesByMonth((prev) => ({ ...prev, [key]: previous.filter((e) => e.id !== id) }));
    try {
      const { error } = await supabase.from("class_expenses").delete().eq("id", id);
      if (error) throw error;
    } catch {
      setExpensesByMonth((prev) => ({ ...prev, [key]: previous }));
      setSaveError("Delete failed.");
    }
  };

  const addOtherIncome = async (key, description, amount, date) => {
    try {
      const { data, error } = await supabase.from("other_income").insert({ month: key, description, amount, income_date: date || null }).select().single();
      if (error) throw error;
      setOtherIncomeByMonth((prev) => ({ ...prev, [key]: [...(prev[key] || []), { id: data.id, description: data.description, amount: data.amount, date: data.income_date }] }));
      setSaveError(null);
    } catch {
      setSaveError("Save failed. Your change may not persist.");
    }
  };
  const removeOtherIncome = async (key, id) => {
    const previous = otherIncomeByMonth[key] || [];
    setOtherIncomeByMonth((prev) => ({ ...prev, [key]: previous.filter((e) => e.id !== id) }));
    try {
      const { error } = await supabase.from("other_income").delete().eq("id", id);
      if (error) throw error;
    } catch {
      setOtherIncomeByMonth((prev) => ({ ...prev, [key]: previous }));
      setSaveError("Delete failed.");
    }
  };

  // ---- Attendance record mapping (student_id+date is the unique key) ----
  const ATT_FROM_DB = (r) => ({
    status: r.status || undefined,
    note: r.note || undefined,
    recordType: r.record_type || undefined,
    hifz: r.hifz || undefined,
    shortMuraja: r.short_muraja || undefined,
    longMuraja: r.long_muraja || undefined,
    recorded: !!r.recorded,
    rescheduledTo: r.rescheduled_to || undefined,
    rescheduledStartTime: r.rescheduled_start_time || undefined,
    rescheduledEndTime: r.rescheduled_end_time || undefined,
  });
  const ATT_TO_DB = (studentId, dateStr, rec) => ({
    student_id: studentId,
    teacher_id: loggedInTeacherId || null,
    record_date: dateStr,
    status: rec.status || null,
    record_type: rec.recordType || null,
    recorded: !!rec.recorded,
    note: rec.note || null,
    hifz: rec.hifz || null,
    short_muraja: rec.shortMuraja || null,
    long_muraja: rec.longMuraja || null,
    rescheduled_to: rec.rescheduledTo || null,
    rescheduled_start_time: rec.rescheduledStartTime || null,
    rescheduled_end_time: rec.rescheduledEndTime || null,
  });

  const loadAttendanceForDate = useCallback(async (dateStr) => {
    if (attendanceByDate[dateStr]) return;
    try {
      const { data, error } = await supabase.from("attendance_records").select("*").eq("record_date", dateStr);
      if (error) throw error;
      const map = {};
      (data || []).forEach((r) => { map[r.student_id] = ATT_FROM_DB(r); });
      setAttendanceByDate((prev) => ({ ...prev, [dateStr]: map }));
    } catch {
      setAttendanceByDate((prev) => ({ ...prev, [dateStr]: {} }));
    }
  }, [attendanceByDate]);

  useEffect(() => { if (role === "teacher") loadAttendanceForDate(recordDate); }, [recordDate, role]);

  const loadAttendanceBulk = useCallback(async () => {
    setAttendanceBulkLoading(true);
    try {
      const [attRes, dismissRes] = await Promise.all([
        supabase.from("attendance_records").select("*"),
        supabase.from("teacher_unmarked_dismissals").select("record_date, class_name"),
      ]);
      if (attRes.error) throw attRes.error;
      const merged = {};
      (attRes.data || []).forEach((r) => {
        if (!merged[r.record_date]) merged[r.record_date] = {};
        merged[r.record_date][r.student_id] = ATT_FROM_DB(r);
      });
      setAttendanceByDate((prev) => ({ ...merged, ...prev }));
      if (!dismissRes.error) {
        setTeacherUnmarkedDismissals((dismissRes.data || []).map((r) => ({ date: r.record_date, className: r.class_name })));
      }
    } catch { /* leave whatever is cached */ }
    setAttendanceBulkLoading(false);
    setAttendanceBulkLoaded(true);
  }, []);

  // Lets a teacher manually clear one unmarked-attendance reminder they don't
  // want to deal with (e.g. the class didn't actually happen). Persisted per
  // teacher so it stays cleared across sessions/reloads.
  const dismissUnmarked = async (dateStr, className) => {
    const key = `${dateStr}|${className}`;
    setUnmarkedDismissingKey(key);
    try {
      const { error } = await supabase
        .from("teacher_unmarked_dismissals")
        .upsert({ teacher_id: loggedInTeacherId, record_date: dateStr, class_name: className }, { onConflict: "teacher_id,record_date,class_name" });
      if (error) throw error;
      setTeacherUnmarkedDismissals((prev) => [...prev, { date: dateStr, className }]);
    } catch {
      showToast("Couldn't clear that reminder. Please try again.");
    }
    setUnmarkedDismissingKey(null);
  };

  const dismissAllUnmarked = async (items) => {
    if (items.length === 0) return;
    setUnmarkedDismissingKey("__all__");
    try {
      const { error } = await supabase
        .from("teacher_unmarked_dismissals")
        .upsert(
          items.map((g) => ({ teacher_id: loggedInTeacherId, record_date: g.date, class_name: g.className })),
          { onConflict: "teacher_id,record_date,class_name" }
        );
      if (error) throw error;
      setTeacherUnmarkedDismissals((prev) => [...prev, ...items.map((g) => ({ date: g.date, className: g.className }))]);
    } catch {
      showToast("Couldn't clear the reminders. Please try again.");
    }
    setUnmarkedDismissingKey(null);
  };

  useEffect(() => {
    if (role === "teacher" && section === "attendance" && !attendanceBulkLoaded && !attendanceBulkLoading) {
      loadAttendanceBulk();
    }
  }, [role, section, attendanceBulkLoaded, attendanceBulkLoading, loadAttendanceBulk]);

  const saveAttendanceForDate = async (dateStr, data) => {
    const previous = attendanceByDate[dateStr] || {};
    setAttendanceByDate((prev) => ({ ...prev, [dateStr]: data }));
    try {
      const rows = Object.entries(data).map(([studentId, rec]) => ATT_TO_DB(studentId, dateStr, rec));
      if (rows.length) {
        const { error } = await supabase.from("attendance_records").upsert(rows, { onConflict: "student_id,record_date" });
        if (error) throw error;
      }
      setSaveError(null);
    } catch {
      setAttendanceByDate((prev) => ({ ...prev, [dateStr]: previous }));
      setSaveError("Save failed. Your change may not persist.");
    }
  };

  // ---- Admin: attendance/records data cleanup (keeps the database from growing forever) ----
  const ATTENDANCE_FIELDS = ["status", "rescheduledTo", "rescheduledStartTime", "rescheduledEndTime"];
  const RECORD_FIELDS = ["note", "recordType", "hifz", "shortMuraja", "longMuraja", "recorded"];

  const loadDataOverview = useCallback(async () => {
    setDataOverviewLoading(true);
    try {
      const { data, error } = await supabase.from("attendance_records").select("record_date, status, recorded");
      if (error) throw error;
      const grouped = {};
      (data || []).forEach((r) => {
        const dateStr = r.record_date;
        const monthKey = dateStr.slice(0, 7);
        if (!grouped[monthKey]) grouped[monthKey] = { month: monthKey, dates: {} };
        const existing = grouped[monthKey].dates[dateStr] || { date: dateStr, hasAttendance: false, hasRecords: false };
        if (r.status) existing.hasAttendance = true;
        if (r.recorded) existing.hasRecords = true;
        grouped[monthKey].dates[dateStr] = existing;
      });
      const months = Object.keys(grouped).sort().map((m) => {
        const entry = grouped[m];
        const dates = Object.values(entry.dates).sort((a, b) => a.date.localeCompare(b.date));
        return {
          month: m,
          dates,
          attendanceCount: dates.filter((d) => d.hasAttendance).length,
          recordsCount: dates.filter((d) => d.hasRecords).length,
        };
      });
      setDataMonths(months);
    } catch { /* leave whatever was loaded before */ }
    setDataOverviewLoading(false);
    setDataOverviewLoaded(true);
  }, []);

  useEffect(() => {
    if (role === "admin" && section === "data" && !dataOverviewLoaded && !dataOverviewLoading) {
      loadDataOverview();
    }
  }, [role, section, dataOverviewLoaded, dataOverviewLoading, loadDataOverview]);

  const deleteMonthData = async (month, scope) => {
    const entry = dataMonths.find((m) => m.month === month);
    if (!entry) return;
    const key = `${month}:${scope}`;
    setDeletingKey(key);
    const fieldsToStrip = scope === "attendance" ? ATTENDANCE_FIELDS : scope === "records" ? RECORD_FIELDS : [...ATTENDANCE_FIELDS, ...RECORD_FIELDS];
    const dbFieldMap = {
      status: "status", rescheduledTo: "rescheduled_to", rescheduledStartTime: "rescheduled_start_time", rescheduledEndTime: "rescheduled_end_time",
      note: "note", recordType: "record_type", hifz: "hifz", shortMuraja: "short_muraja", longMuraja: "long_muraja", recorded: "recorded",
    };
    for (const { date } of entry.dates) {
      try {
        const { data: rows, error: fetchErr } = await supabase.from("attendance_records").select("*").eq("record_date", date);
        if (fetchErr) throw fetchErr;
        const nextData = {};
        for (const row of rows || []) {
          const rec = ATT_FROM_DB(row);
          fieldsToStrip.forEach((f) => { delete rec[f]; });
          const hasAnything = Object.values(rec).some((v) => v !== undefined && v !== null && v !== false);
          if (!hasAnything) {
            await supabase.from("attendance_records").delete().eq("id", row.id);
          } else {
            const clearedCols = {};
            fieldsToStrip.forEach((f) => { clearedCols[dbFieldMap[f]] = f === "recorded" ? false : null; });
            await supabase.from("attendance_records").update(clearedCols).eq("id", row.id);
            nextData[row.student_id] = rec;
          }
        }
        setAttendanceByDate((prev) => ({ ...prev, [date]: nextData }));
      } catch { /* continue with remaining dates */ }
    }
    setDeletingKey(null);
    setConfirmDelete(null);
    const scopeLabel = scope === "both" ? "attendance & class records" : scope === "attendance" ? "attendance" : "class records";
    showToast(`Deleted ${scopeLabel} for ${month}`);
    loadDataOverview();
  };

  const downloadMonthBackup = async (month, format) => {
    const entry = dataMonths.find((m) => m.month === month);
    if (!entry) return;
    const key = `${month}:${format}`;
    setBackupLoadingKey(key);
    const rows = [];
    try {
      const dates = entry.dates.map((d) => d.date);
      const { data, error } = await supabase.from("attendance_records").select("*").in("record_date", dates);
      if (error) throw error;
      (data || []).forEach((row) => {
        const rec = ATT_FROM_DB(row);
        const date = row.record_date;
        const s = students.find((st) => st.id === row.student_id);
        const studentName = s ? s.name : "(removed student)";
        const className = s ? s.className || "" : "";
        let statusText = "";
        if (rec.status === "present") statusText = "Present";
        else if (rec.status === "absent") statusText = "Absent";
        else if (rec.status === "cancelled") statusText = "Cancelled";
        else if (rec.status === "rescheduled") statusText = `Moved to ${rec.rescheduledTo || "—"}`;
        const recordText = formatRecordSummaryText(rec);
        if (!statusText && !recordText) return;
        rows.push([date, weekdayAbbrev(date), studentName, className, statusText || "—", recordText || "—"]);
      });
    } catch { /* leave rows as whatever was gathered */ }
    rows.sort((a, b) => a[0].localeCompare(b[0]) || a[2].localeCompare(b[2]));
    setBackupLoadingKey(null);
    if (rows.length === 0) { showToast("Nothing to back up for this month"); return; }
    const [y, mo] = month.split("-").map(Number);
    const label = `${MONTH_NAMES[mo - 1]} ${y}`;
    const columns = ["Date", "Day", "Student", "Class", "Status", "Record"];
    const filenameBase = `attendance_backup_${month}`;
    if (format === "pdf") {
      downloadRowsAsPDF("Attendance & Records Backup", label, columns, rows, `${filenameBase}.pdf`);
    } else {
      downloadRowsAsImage("Attendance & Records Backup", label, columns, rows, `${filenameBase}.png`);
    }
    showToast(`Backup ready — ${rows.length} record${rows.length === 1 ? "" : "s"}`);
  };

  // ---- Hifz Exams ----
  const EXAM_FROM_DB = (r) => ({
    id: r.id, teacherId: r.teacher_id, studentName: r.student_name, examDate: r.exam_date,
    questions: r.questions || [], comments: r.recitation_comments || "", finalResult: r.final_result,
    createdAt: r.created_at,
  });

  const loadExamReports = useCallback(async (teacherId) => {
    setExamReportsLoading(true);
    try {
      const { data, error } = await supabase.from("hifz_exams").select("*").eq("teacher_id", teacherId).order("exam_date", { ascending: false });
      if (error) throw error;
      setExamReports((data || []).map(EXAM_FROM_DB));
    } catch {
      showToast("Couldn't load exam reports. Please try again.");
    }
    setExamReportsLoading(false);
    setExamReportsLoaded(true);
  }, []);

  const addExamQuestion = () => {
    setExamQuestions((prev) => [
      ...prev,
      { id: (prev[prev.length - 1]?.id || 0) + 1, surah: "", ayah: "", questionType: EXAM_QUESTION_TYPES[0], result: "correct", remark: "" },
    ]);
  };
  const removeExamQuestion = (id) => setExamQuestions((prev) => prev.filter((q) => q.id !== id));
  const updateExamQuestion = (id, field, value) => {
    setExamQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  };

  const resetExamForm = () => {
    setExamStudentName("");
    setExamDate(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
    setExamQuestions([{ id: 1, surah: "", ayah: "", questionType: EXAM_QUESTION_TYPES[0], result: "correct", remark: "" }]);
    setExamComments("");
    setExamFinalResult(null);
    setEditingExamId(null);
  };

  // Loads a previously-submitted report back into the form so the teacher can
  // correct it — Submit then updates the same row instead of creating a new one.
  const startEditExam = (exam) => {
    setExamStudentName(exam.studentName);
    setExamDate(exam.examDate);
    setExamQuestions(
      exam.questions.length > 0
        ? exam.questions.map((q, i) => ({ id: i + 1, surah: q.surah ?? q.startSurah ?? "", ayah: q.ayah ?? q.startAyah ?? "", questionType: q.questionType || EXAM_QUESTION_TYPES[0], result: q.result || "correct", remark: q.remark || "" }))
        : [{ id: 1, surah: "", ayah: "", questionType: EXAM_QUESTION_TYPES[0], result: "correct", remark: "" }]
    );
    setExamComments(exam.comments || "");
    setExamFinalResult(exam.finalResult);
    setEditingExamId(exam.id);
    setExamView("details");
  };

  const submitExam = async () => {
    if (!examStudentName.trim()) { showToast("Enter the student's name."); return; }
    if (!examDate) { showToast("Pick an exam date."); return; }
    const missingRemark = examQuestions.find((q) => q.result === "incorrect" && !q.remark.trim());
    if (missingRemark) { showToast("Add a mistake/remark for every question marked Incorrect."); return; }
    if (!examFinalResult) { showToast("Choose a final decision — Pass or Not Passed."); return; }
    setExamSubmitting(true);
    try {
      const payload = {
        teacher_id: loggedInTeacherId,
        student_name: examStudentName.trim(),
        exam_date: examDate,
        questions: examQuestions.map(({ id, ...q }) => q),
        recitation_comments: examComments.trim() || null,
        final_result: examFinalResult,
      };
      const { error } = editingExamId
        ? await supabase.from("hifz_exams").update(payload).eq("id", editingExamId)
        : await supabase.from("hifz_exams").insert(payload);
      if (error) throw error;
      showToast(editingExamId ? "Exam result updated" : "Exam result submitted");
      resetExamForm();
      setExamView("history");
      setExamReportsLoaded(false);
    } catch {
      showToast("Couldn't save the exam. Please try again.");
    }
    setExamSubmitting(false);
  };

  const deleteExam = async (examId) => {
    setExamDeletingId(examId);
    try {
      const { error } = await supabase.from("hifz_exams").delete().eq("id", examId);
      if (error) throw error;
      setExamReports((prev) => prev.filter((e) => e.id !== examId));
      if (viewExamId === examId) setViewExamId(null);
      showToast("Exam report deleted");
    } catch {
      showToast("Couldn't delete the exam. Please try again.");
    }
    setExamDeletingId(null);
  };

  useEffect(() => {
    if (role === "teacher" && section === "exams" && !examReportsLoaded && !examReportsLoading) {
      loadExamReports(loggedInTeacherId);
    }
  }, [role, section, examReportsLoaded, examReportsLoading, loadExamReports, loggedInTeacherId]);

  const weekdayAbbrev = (dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return DAY_ORDER[new Date(y, m - 1, d).getDay()];
  };

  const timesOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

  const findScheduleClash = (teacherId, excludeStudentId, days, startTime, endTime) => {
    for (const s of students) {
      if (s.teacherId !== teacherId || s.id === excludeStudentId) continue;
      if (!s.schedule || !s.schedule.days) continue;
      for (const day of s.schedule.days) {
        if (!days.includes(day)) continue;
        if (timesOverlap(startTime, endTime, s.schedule.startTime, s.schedule.endTime)) {
          return { studentName: s.name, day };
        }
      }
    }
    return null;
  };

  // ---- Students ----
  const resetStudentForm = () => {
    setSName(""); setSClassId(""); setSFee(""); setSPhone(""); setSSharePercent("0");
    setSJoinedMonth(month);
    setShowStudentForm(false); setEditingStudentId(null);
  };

  const handleSaveStudent = () => {
    const name = sName.trim();
    const fee = parseFloat(sFee);
    if (!name || !Number.isFinite(fee) || fee < 0) return;
    let sharePercent = parseFloat(sSharePercent);
    if (!Number.isFinite(sharePercent)) sharePercent = 0;
    sharePercent = Math.min(100, Math.max(0, sharePercent));
    const cls = classes.find((c) => c.id === sClassId) || null;
    const schedule = cls && cls.days && cls.days.length > 0 && cls.startTime && cls.endTime
      ? { days: cls.days, startTime: cls.startTime, endTime: cls.endTime }
      : null;
    const payload = {
      name,
      classId: cls ? cls.id : null,
      className: cls ? cls.name : "",
      fee,
      phone: sPhone.trim(),
      teacherId: cls ? cls.teacherId || null : null,
      sharePercent,
      schedule,
      joinedMonth: sJoinedMonth || month,
    };
    if (editingStudentId) {
      saveStudents(students.map((s) => (s.id === editingStudentId ? { ...s, ...payload } : s)));
      showToast(`Saved changes for ${name}`);
    } else {
      saveStudents([...students, { id: uid(), ...payload }]);
      showToast(`${name} added`);
    }
    resetStudentForm();
  };

  const startEditStudent = (s) => {
    setEditingStudentId(s.id);
    setSName(s.name); setSClassId(s.classId || ""); setSFee(String(s.fee));
    setSPhone(s.phone || "");
    setSSharePercent(s.sharePercent != null ? String(s.sharePercent) : "0");
    setSJoinedMonth(s.joinedMonth || month);
    setShowStudentForm(true);
  };

  const removeStudent = (id) => {
    saveStudents(students.filter((s) => s.id !== id));
    // Drop any cached payment entries for this student so a later save for
    // someone else doesn't try to upsert a row for a student that's gone
    // (that FK violation used to fail the whole month's batch, not just theirs).
    setPaymentsByMonth((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, monthMap]) => {
        if (!monthMap[id]) { next[key] = monthMap; return; }
        const { [id]: _removed, ...rest } = monthMap;
        next[key] = rest;
      });
      return next;
    });
  };

  // ---- Classes ----
  const resetClassForm = () => {
    setCName(""); setCCode(""); setCTeacherId(""); setCDays([]); setCStartTime(""); setCEndTime("");
    setClassFormError(""); setShowClassForm(false); setEditingClassId(null);
  };

  // Suggests the next class code in sequence, e.g. existing "B01","B02" -> "B03".
  // Defaults to "B01" when no class has a code matching <letters><digits> yet.
  const nextClassCode = () => {
    let bestPrefix = "B", bestNum = 0, bestWidth = 2;
    classes.forEach((c) => {
      const m = /^([A-Za-z]*)(\d+)$/.exec((c.code || "").trim());
      if (!m) return;
      const num = parseInt(m[2], 10);
      if (num > bestNum) { bestNum = num; bestPrefix = m[1] || ""; bestWidth = m[2].length; }
    });
    return `${bestPrefix}${String(bestNum + 1).padStart(bestWidth, "0")}`;
  };
  const openNewClassForm = () => {
    resetClassForm();
    setCCode(nextClassCode());
    setShowClassForm(true);
  };

  const toggleCDay = (day) => {
    setCDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const getClassClash = (excludeId, teacherId, days, startTime, endTime) => {
    if (!teacherId || !days || days.length === 0 || !startTime || !endTime) return null;
    for (const c of classes) {
      if (c.id === excludeId || c.teacherId !== teacherId) continue;
      if (!c.days || c.days.length === 0 || !c.startTime || !c.endTime) continue;
      for (const day of c.days) {
        if (!days.includes(day)) continue;
        if (timesOverlap(startTime, endTime, c.startTime, c.endTime)) {
          return { className: c.name, day, startTime: c.startTime, endTime: c.endTime };
        }
      }
    }
    return null;
  };

  const handleSaveClass = () => {
    const name = cName.trim();
    if (!name) { setClassFormError("Class name is required."); return; }
    const days = [...cDays].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
    const clash = getClassClash(editingClassId, cTeacherId, days, cStartTime, cEndTime);
    if (clash) {
      setClassFormError(
        `Schedule clash: ${teacherName(cTeacherId)} already teaches "${clash.className}" on ${clash.day} at ${fmtTime12(clash.startTime)}–${fmtTime12(clash.endTime)}. Choose a different time or day.`
      );
      return;
    }
    setClassFormError("");
    const payload = { name, code: cCode.trim() || null, teacherId: cTeacherId || null, days, startTime: cStartTime || "", endTime: cEndTime || "" };
    if (editingClassId) {
      saveClasses(classes.map((c) => (c.id === editingClassId ? { ...c, ...payload } : c)));
      const schedule = days.length > 0 && cStartTime && cEndTime ? { days, startTime: cStartTime, endTime: cEndTime } : null;
      saveStudents(students.map((s) =>
        s.classId === editingClassId
          ? { ...s, className: name, teacherId: cTeacherId || null, schedule }
          : s
      ));
      showToast(`Saved changes for ${name}`);
    } else {
      saveClasses([...classes, { id: uid(), ...payload }]);
      showToast(`${name} added`);
    }
    resetClassForm();
  };

  const startEditClass = (c) => {
    setEditingClassId(c.id);
    setCName(c.name); setCCode(c.code || ""); setCTeacherId(c.teacherId || "");
    setCDays(c.days || []); setCStartTime(c.startTime || ""); setCEndTime(c.endTime || "");
    setClassFormError("");
    setShowClassForm(true);
  };

  const removeClass = (id) => {
    saveClasses(classes.filter((c) => c.id !== id));
    saveStudents(students.map((s) =>
      s.classId === id ? { ...s, classId: null, className: "", teacherId: null, schedule: null } : s
    ));
  };

  const classLabel = (id) => classes.find((c) => c.id === id)?.name || "No class";

  // ---- Holidays / term breaks (apply to every student & class) ----
  const saveHolidays = async (list) => {
    const previous = holidays;
    setHolidays(list);
    try {
      const authoritative = await syncTable("holidays", previous, list, HOLIDAY_TO_DB, HOLIDAY_FROM_DB);
      setHolidays(authoritative);
      setSaveError(null);
    } catch {
      setHolidays(previous);
      setSaveError("Save failed. Your change may not persist.");
    }
  };

  const isHoliday = (dateStr) => holidays.some((h) => dateStr >= h.startDate && dateStr <= h.endDate);
  const holidayFor = (dateStr) => holidays.find((h) => dateStr >= h.startDate && dateStr <= h.endDate) || null;

  const resetHolidayForm = () => {
    setHLabel(""); setHStartDate(""); setHEndDate("");
    setHolidayFormError(""); setShowHolidayForm(false); setEditingHolidayId(null);
  };

  const handleSaveHoliday = () => {
    const label = hLabel.trim();
    if (!label) { setHolidayFormError("Give this holiday a name."); return; }
    if (!hStartDate || !hEndDate || hStartDate > hEndDate) { setHolidayFormError("Pick a valid start and end date."); return; }
    const payload = { label, startDate: hStartDate, endDate: hEndDate };
    if (editingHolidayId) {
      saveHolidays(holidays.map((h) => (h.id === editingHolidayId ? { ...h, ...payload } : h)));
      showToast(`Saved changes for ${label}`);
    } else {
      saveHolidays([...holidays, { id: uid(), ...payload }]);
      showToast(`${label} added`);
    }
    resetHolidayForm();
  };

  const startEditHoliday = (h) => {
    setEditingHolidayId(h.id);
    setHLabel(h.label); setHStartDate(h.startDate); setHEndDate(h.endDate);
    setHolidayFormError("");
    setShowHolidayForm(true);
  };

  const removeHoliday = (id) => saveHolidays(holidays.filter((h) => h.id !== id));

  // ---- Admin Attendance: all attendance records + follow-up tracking ----
  const loadAdminAttendance = useCallback(async () => {
    setAdminAttRecordsLoading(true);
    try {
      const [attRes, followUpRes, dismissalsRes] = await Promise.all([
        supabase.from("attendance_records").select("student_id, record_date, status"),
        supabase.from("attendance_followups").select("*"),
        supabase.from("unrecorded_dismissals").select("*"),
      ]);
      if (!attRes.error) {
        setAdminAllAttendance((attRes.data || []).map((r) => ({ studentId: r.student_id, date: r.record_date, status: r.status || null })));
      }
      if (!followUpRes.error) {
        setFollowUps((followUpRes.data || []).map((r) => ({
          studentId: r.student_id, contactStatus: r.contact_status || "not_contacted", remarks: r.remarks || "", updatedAt: r.updated_at,
        })));
      }
      if (!dismissalsRes.error) {
        setUnrecordedDismissals((dismissalsRes.data || []).map((r) => ({ teacherId: r.teacher_id, dismissedAt: r.dismissed_at })));
      }
    } catch { /* leave whatever was loaded before */ }
    setAdminAttRecordsLoading(false);
    setAdminAttRecordsLoaded(true);
  }, []);

  useEffect(() => {
    if (role === "admin" && section === "attendance" && !adminAttRecordsLoaded && !adminAttRecordsLoading) {
      loadAdminAttendance();
    }
  }, [role, section, adminAttRecordsLoaded, adminAttRecordsLoading, loadAdminAttendance]);

  const saveFollowUp = async (studentId, contactStatus, remarks) => {
    setFollowUpSavingId(studentId);
    try {
      const { data, error } = await supabase
        .from("attendance_followups")
        .upsert({ student_id: studentId, contact_status: contactStatus, remarks, updated_at: new Date().toISOString() }, { onConflict: "student_id" })
        .select()
        .single();
      if (error) throw error;
      setFollowUps((prev) => {
        const next = prev.filter((f) => f.studentId !== studentId);
        next.push({ studentId, contactStatus: data.contact_status, remarks: data.remarks || "", updatedAt: data.updated_at });
        return next;
      });
      setFollowUpDrafts((prev) => { const n = { ...prev }; delete n[studentId]; return n; });
      showToast("Follow-up saved");
    } catch {
      showToast("Couldn't save follow-up. Please try again.");
    }
    setFollowUpSavingId(null);
  };

  // Dismisses every currently-unrecorded class for one teacher from the alert
  // list. Any class still unrecorded from AFTER this moment (a later missed
  // day) reopens the alert — it isn't a blanket permanent mute.
  const dismissUnrecordedForTeacher = async (teacherId) => {
    setUnrecordedDismissingId(teacherId);
    try {
      const dismissedAt = new Date().toISOString();
      const { error } = await supabase
        .from("unrecorded_dismissals")
        .upsert({ teacher_id: teacherId, dismissed_at: dismissedAt }, { onConflict: "teacher_id" });
      if (error) throw error;
      setUnrecordedDismissals((prev) => [...prev.filter((d) => d.teacherId !== teacherId), { teacherId, dismissedAt }]);
      if (adminAttUnrecordedTeacherId === teacherId) setAdminAttUnrecordedTeacherId(null);
      showToast("Dismissed");
    } catch {
      showToast("Couldn't dismiss. Please try again.");
    }
    setUnrecordedDismissingId(null);
  };

  // ---- Admin Exams: all teachers' Hifz exam reports ----
  const loadAdminExamReports = useCallback(async () => {
    setAdminExamReportsLoading(true);
    try {
      const { data, error } = await supabase.from("hifz_exams").select("*").order("exam_date", { ascending: false });
      if (error) throw error;
      setAdminExamReports((data || []).map((r) => ({
        id: r.id, teacherId: r.teacher_id, studentName: r.student_name, examDate: r.exam_date,
        questions: r.questions || [], comments: r.recitation_comments || "", finalResult: r.final_result,
        createdAt: r.created_at,
      })));
    } catch {
      showToast("Couldn't load exam reports. Please try again.");
    }
    setAdminExamReportsLoading(false);
    setAdminExamReportsLoaded(true);
  }, []);

  useEffect(() => {
    if (role === "admin" && section === "exams" && !adminExamReportsLoaded && !adminExamReportsLoading) {
      loadAdminExamReports();
    }
  }, [role, section, adminExamReportsLoaded, adminExamReportsLoading, loadAdminExamReports]);

  const deleteAdminExam = async (examId) => {
    setAdminExamDeletingId(examId);
    try {
      const { error } = await supabase.from("hifz_exams").delete().eq("id", examId);
      if (error) throw error;
      setAdminExamReports((prev) => prev.filter((e) => e.id !== examId));
      if (adminViewExamId === examId) setAdminViewExamId(null);
      showToast("Exam report deleted");
    } catch {
      showToast("Couldn't delete the exam. Please try again.");
    }
    setAdminExamDeletingId(null);
  };

  // ---- Finance: one student's payment history (all months) ----
  const loadStudentPayments = useCallback(async (studentId) => {
    setFinStudentLoading(true);
    try {
      const { data, error } = await supabase.from("payments").select("month, paid, amount_paid, paid_date").eq("student_id", studentId);
      if (error) throw error;
      setFinStudentPayments((data || []).map((r) => ({ month: r.month, paid: r.paid, amountPaid: Number(r.amount_paid) || 0, paidDate: r.paid_date })));
    } catch {
      setFinStudentPayments([]);
      showToast("Couldn't load this student's payments. Please try again.");
    }
    setFinStudentLoading(false);
  }, []);

  // Reload whenever the selection changes or a payment is marked/undone elsewhere.
  useEffect(() => {
    if (role === "admin" && section === "finance" && financeView === "student" && finStudentId) {
      loadStudentPayments(finStudentId);
    }
  }, [role, section, financeView, finStudentId, paymentsByMonth, loadStudentPayments]);

  const getDraft = (studentId, fee) => {
    if (payDrafts[studentId] !== undefined) return payDrafts[studentId];
    const rec = monthData[studentId];
    return rec && rec.amountPaid != null ? String(rec.amountPaid) : String(fee);
  };

  const markPaid = (studentId, fee) => {
    const amt = parseFloat(getDraft(studentId, fee));
    const amountPaid = Number.isFinite(amt) ? amt : fee;
    saveMonthPayments(month, {
      ...monthData,
      [studentId]: { paid: true, amountPaid, paidDate: new Date().toISOString().slice(0, 10) },
    });
  };

  const markUnpaid = (studentId) => {
    saveMonthPayments(month, { ...monthData, [studentId]: { paid: false, amountPaid: 0, paidDate: null } });
  };

  // ---- Teachers ----
  const resetTeacherForm = () => {
    setTName(""); setTSubject(""); setTPhone(""); setTEmail("");
    setShowTeacherForm(false); setEditingTeacherId(null);
  };

  const handleSaveTeacher = () => {
    const name = tName.trim();
    if (!name) return;
    const email = tEmail.trim().toLowerCase();
    const payload = { name, subject: tSubject.trim(), phone: tPhone.trim(), email };
    if (editingTeacherId) {
      saveTeachers(teachers.map((t) => (t.id === editingTeacherId ? { ...t, ...payload } : t)));
      showToast(`Saved changes for ${name}`);
    } else {
      saveTeachers([...teachers, { id: uid(), userId: null, ...payload }]);
      showToast(`${name} added`);
    }
    resetTeacherForm();
  };

  const [linkLoginError, setLinkLoginError] = useState("");
  const [linkLoginLoadingId, setLinkLoginLoadingId] = useState(null);

  // Links an EXISTING Supabase Auth login (created in the dashboard, or by the
  // teacher signing up) to this teacher record by email. Real passwords are
  // never handled by this app — Supabase Auth owns them.
  const linkTeacherLogin = async (teacherId, email) => {
    const trimmedEmail = (email || "").trim();
    if (!trimmedEmail) { setLinkLoginError("Add an email for this teacher first."); return; }
    setLinkLoginLoadingId(teacherId);
    setLinkLoginError("");
    const { error } = await supabase.rpc("admin_link_teacher_by_email", {
      p_teacher_id: teacherId, p_email: trimmedEmail,
    });
    setLinkLoginLoadingId(null);
    if (error) {
      setLinkLoginError(error.message || "Couldn't link that login.");
      return;
    }
    setTeachers((prev) => prev.map((t) => (t.id === teacherId ? { ...t } : t)));
    showToast("Login linked");
    // Refresh so the teacher's userId shows as linked in the UI.
    const { data } = await supabase.from("teachers").select("*");
    if (data) setTeachers(data.map(TEACHER_FROM_DB));
  };

  const startEditTeacher = (t) => {
    setEditingTeacherId(t.id);
    setTName(t.name); setTSubject(t.subject || ""); setTPhone(t.phone || "");
    setTEmail(t.email || "");
    setShowTeacherForm(true);
  };

  const removeTeacher = (id) => {
    saveTeachers(teachers.filter((t) => t.id !== id));
    saveStudents(students.map((s) => (s.teacherId === id ? { ...s, teacherId: null } : s)));
    saveClasses(classes.map((c) => (c.teacherId === id ? { ...c, teacherId: null } : c)));
  };

  const teacherName = (id) => teachers.find((t) => t.id === id)?.name || "Unassigned";

  // ---- Finance derived ----
  const activeStudents = useMemo(
    () => students.filter((s) => isEnrolledInMonth(s, month)),
    [students, month]
  );

  const totals = useMemo(() => {
    let expected = 0, received = 0, pending = 0;
    activeStudents.forEach((s) => {
      expected += s.fee;
      const rec = monthData[s.id];
      if (rec && rec.paid) received += rec.amountPaid || 0;
      else pending += s.fee;
    });
    return { expected, received, pending };
  }, [activeStudents, monthData]);

  const pendingStudents = activeStudents.filter((s) => !(monthData[s.id] && monthData[s.id].paid));

  // ---- Dashboard: month-by-month performance table ----
  const DASHBOARD_MONTHLY_SPAN = 6;
  const dashboardMonthKeys = useMemo(() => {
    const keys = [];
    for (let i = 0; i < DASHBOARD_MONTHLY_SPAN; i++) keys.push(shiftMonth(month, -i));
    return keys;
  }, [month]);

  useEffect(() => {
    if (authView !== "app" || role !== "admin") return;
    dashboardMonthKeys.forEach((key) => loadMonthPayments(key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardMonthKeys, authView, role]);

  const monthlyPerformance = useMemo(() => {
    return dashboardMonthKeys.map((key) => {
      const monthMap = paymentsByMonth[key] || {};
      const active = students.filter((s) => isEnrolledInMonth(s, key));
      let expected = 0, received = 0;
      active.forEach((s) => {
        expected += s.fee;
        const rec = monthMap[s.id];
        if (rec && rec.paid) received += rec.amountPaid || 0;
      });
      return { key, expected, received, pending: Math.max(0, expected - received) };
    });
  }, [dashboardMonthKeys, paymentsByMonth, students]);

  const salaryByTeacher = useMemo(() => {
    const rows = teachers.map((t) => ({ teacherId: t.id, name: t.name, collected: 0, payout: 0, studentCount: 0 }));
    const byId = Object.fromEntries(rows.map((r) => [r.teacherId, r]));
    activeStudents.forEach((s) => {
      const rec = monthData[s.id];
      if (!rec || !rec.paid || !s.teacherId || !byId[s.teacherId]) return;
      const amt = rec.amountPaid || 0;
      const pct = Math.min(100, Math.max(0, s.sharePercent || 0));
      byId[s.teacherId].collected += amt;
      byId[s.teacherId].payout += amt * (pct / 100);
      byId[s.teacherId].studentCount += 1;
    });
    return rows;
  }, [teachers, activeStudents, monthData]);

  const totalPayouts = useMemo(
    () => salaryByTeacher.reduce((sum, r) => sum + r.payout, 0),
    [salaryByTeacher]
  );
  const monthExpenses = expensesByMonth[month] || [];
  const monthOtherIncome = otherIncomeByMonth[month] || [];
  const totalExpensesThisMonth = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalOtherIncomeThisMonth = monthOtherIncome.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const centerProfit = totals.received + totalOtherIncomeThisMonth - totalPayouts - totalExpensesThisMonth;

  // ---- Timetable ----
  const scheduleRows = useMemo(() => {
    const rows = [];
    students.forEach((s) => {
      if (!s.schedule || !s.schedule.days || s.schedule.days.length === 0) return;
      s.schedule.days.forEach((day) => {
        rows.push({
          day,
          dayIndex: DAY_ORDER.indexOf(day),
          startTime: s.schedule.startTime,
          endTime: s.schedule.endTime,
          studentId: s.id,
          studentName: s.name,
          classId: s.classId || null,
          className: s.className || "—",
          teacherId: s.teacherId || null,
          teacherLabel: teacherName(s.teacherId),
        });
      });
    });
    rows.sort((a, b) => a.dayIndex - b.dayIndex || (a.startTime || "").localeCompare(b.startTime || ""));
    return rows;
  }, [students, teachers]);

  const buildTimetableGrid = (rows, cellLabel, dedupeKeyFn) => {
    const keyFn = dedupeKeyFn || cellLabel;
    const slotsMap = new Map();
    rows.forEach((r) => {
      const key = `${r.startTime}|${r.endTime}`;
      if (!slotsMap.has(key)) slotsMap.set(key, { startTime: r.startTime, endTime: r.endTime });
    });
    const slots = Array.from(slotsMap.values()).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    return slots.map((slot) => ({
      timeLabel: `${fmtTime12(slot.startTime)} – ${fmtTime12(slot.endTime)}`,
      cells: DAY_ORDER.map((day) => {
        const matched = rows.filter((r) => r.day === day && r.startTime === slot.startTime && r.endTime === slot.endTime);
        // A class stays a single entry in the schedule no matter how many
        // students are in it — dedupe by class (or by the rendered label
        // when no dedupe key is supplied, e.g. a teacher's own roster where
        // each student should still be listed).
        const seen = new Set();
        const labels = [];
        matched.forEach((r) => {
          const dKey = keyFn(r);
          if (!seen.has(dKey)) { seen.add(dKey); labels.push(cellLabel(r)); }
        });
        return labels;
      }),
    }));
  };

  const fmtDateStr = (dateObj) =>
    `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;

  // All sessions actually taking place on a given calendar date for the
  // logged-in teacher: the recurring weekly sessions for that weekday, minus
  // any that were rescheduled away from this date, plus any sessions moved
  // INTO this date from elsewhere.
  const getSessionsForDate = (dateStr) => {
    const weekday = weekdayAbbrev(dateStr);
    const base = scheduleRows
      .filter((r) => r.teacherId === loggedInTeacherId && r.day === weekday);

    const incoming = [];
    Object.keys(attendanceByDate).forEach((srcDate) => {
      if (srcDate === dateStr) return;
      const recs = attendanceByDate[srcDate] || {};
      Object.keys(recs).forEach((studentId) => {
        const rec = recs[studentId];
        if (!rec || rec.status !== "rescheduled" || rec.rescheduledTo !== dateStr) return;
        const s = students.find((st) => st.id === studentId);
        if (!s || s.teacherId !== loggedInTeacherId) return;
        incoming.push({
          day: weekday,
          dayIndex: DAY_ORDER.indexOf(weekday),
          startTime: rec.rescheduledStartTime || (s.schedule ? s.schedule.startTime : "") || "",
          endTime: rec.rescheduledEndTime || (s.schedule ? s.schedule.endTime : "") || "",
          studentId,
          studentName: s.name,
          classId: s.classId || null,
          className: s.className || "—",
          teacherId: s.teacherId,
          teacherLabel: teacherName(s.teacherId),
          rescheduledFromDate: srcDate,
        });
      });
    });

    return [...base, ...incoming].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  };

  const getDayStatusSummary = (dateStr, studentId) => {
    let sessions = getSessionsForDate(dateStr);
    if (studentId) sessions = sessions.filter((r) => r.studentId === studentId);
    if (sessions.length === 0) return null;
    const dayRecords = attendanceByDate[dateStr] || {};
    let present = 0, absent = 0, cancelled = 0, pending = 0, movedAway = 0;
    sessions.forEach((r) => {
      const status = dayRecords[r.studentId] && dayRecords[r.studentId].status;
      if (status === "present") present++;
      else if (status === "absent") absent++;
      else if (status === "cancelled") cancelled++;
      else if (status === "rescheduled") movedAway++;
      else pending++;
    });
    return { total: sessions.length, present, absent, cancelled, pending, movedAway };
  };

  // A single student's session + status for one calendar day (used to draw
  // the status icon directly on that day's cell).
  const getStudentDayStatus = (dateStr, studentId) => {
    const sessions = getSessionsForDate(dateStr).filter((r) => r.studentId === studentId);
    if (sessions.length === 0) return null;
    const dayRecords = attendanceByDate[dateStr] || {};
    const rec = dayRecords[studentId] || {};
    return { session: sessions[0], status: rec.status || null, movedHere: !!sessions[0].rescheduledFromDate };
  };

  const buildTableCanvas = (title, subtitle, columns, rows) => {
    const padding = 24;
    const cellPaddingX = 10;
    const rowHeight = 34;
    const colHeaderHeight = 34;
    const hasLogo = !!logoImg;
    const logoH = 40;
    const logoW = hasLogo ? logoH * (logoImg.width / logoImg.height) : 0;
    const titleAreaHeight = hasLogo ? (subtitle ? 74 : 60) : (subtitle ? 74 : 56);
    const fontFamily = "system-ui, -apple-system, sans-serif";
    const measure = document.createElement("canvas").getContext("2d");
    measure.font = "13px " + fontFamily;
    const colWidths = columns.map((col, i) => {
      let max = measure.measureText(col).width;
      rows.forEach((r) => {
        const w = measure.measureText(String(r[i] ?? "")).width;
        if (w > max) max = w;
      });
      return Math.max(90, Math.ceil(max) + cellPaddingX * 2);
    });
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const width = Math.max(tableWidth + padding * 2, hasLogo ? padding * 2 + logoW + 220 : 0);
    const bodyHeight = rows.length === 0 ? 40 : rows.length * rowHeight;
    const height = titleAreaHeight + colHeaderHeight + bodyHeight + padding;

    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    // Plain white background
    ctx.fillStyle = C.c;
    ctx.fillRect(0, 0, width, height);

    if (hasLogo) {
      const logoY = 10;
      ctx.drawImage(logoImg, padding, logoY, logoW, logoH);
      const textX = padding + logoW + 14;
      ctx.fillStyle = C.f;
      ctx.font = "700 15px " + fontFamily;
      ctx.fillText(title, textX, logoY + 18);
      if (subtitle) {
        ctx.fillStyle = C.a;
        ctx.font = "13px " + fontFamily;
        ctx.fillText(subtitle, textX, logoY + 36);
      }
    } else {
      // Fallback if the logo hasn't finished loading yet
      ctx.fillStyle = C.m;
      ctx.font = "600 19px Georgia, 'Times New Roman', serif";
      ctx.fillText("Aflaah Quran Class", padding, 28);
      ctx.font = "13px " + fontFamily;
      ctx.fillText(title, padding, 48);
      if (subtitle) ctx.fillText(subtitle, padding, 66);
    }

    // Brand-colour accent rule separating the header from the table
    ctx.fillStyle = C.e;
    ctx.fillRect(0, titleAreaHeight - 6, width, 2);

    const tableTop = titleAreaHeight;
    const tableLeft = padding;
    const tableHeight = colHeaderHeight + bodyHeight;

    // Column x-boundaries
    const colX = [tableLeft];
    colWidths.forEach((w) => colX.push(colX[colX.length - 1] + w));

    ctx.strokeStyle = C.m;
    ctx.lineWidth = 1;

    // Header row text (bold, no fill)
    ctx.fillStyle = C.m;
    ctx.font = "700 12px " + fontFamily;
    columns.forEach((col, i) => {
      ctx.fillText(col.toUpperCase(), colX[i] + cellPaddingX, tableTop + 22);
    });

    if (rows.length === 0) {
      ctx.font = "13px " + fontFamily;
      ctx.fillText("No schedule entries yet.", tableLeft + cellPaddingX, tableTop + colHeaderHeight + 24);
    } else {
      ctx.font = "13px " + fontFamily;
      rows.forEach((r, ri) => {
        const rowY = tableTop + colHeaderHeight + ri * rowHeight;
        columns.forEach((col, i) => {
          ctx.fillText(String(r[i] ?? ""), colX[i] + cellPaddingX, rowY + rowHeight / 2 + 4);
        });
      });
    }

    // Full grid lines: outer border + every column divider + every row divider
    ctx.beginPath();
    colX.forEach((x) => { ctx.moveTo(x, tableTop); ctx.lineTo(x, tableTop + tableHeight); });
    for (let i = 0; i <= (rows.length || 1); i++) {
      const y = tableTop + colHeaderHeight + i * (rows.length === 0 ? bodyHeight : rowHeight);
      ctx.moveTo(tableLeft, y); ctx.lineTo(tableLeft + tableWidth, y);
    }
    ctx.moveTo(tableLeft, tableTop); ctx.lineTo(tableLeft + tableWidth, tableTop);
    ctx.stroke();

    return { canvas, width, height };
  };

  const triggerDownload = (href, filename) => {
    const link = document.createElement("a");
    link.download = filename;
    link.href = href;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCanvasAsImage = (canvas, filename) => {
    triggerDownload(canvas.toDataURL("image/png"), filename);
  };

  // Builds a real, valid PDF by hand (single page, one embedded JPEG of the canvas).
  // This avoids relying on the browser's print dialog, which can behave
  // inconsistently inside a sandboxed preview — this download always works the same way.
  const downloadCanvasAsPDF = (canvas, width, height, filename) => {
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const base64 = dataUrl.split(",")[1];
    const binary = atob(base64);
    const jpegBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) jpegBytes[i] = binary.charCodeAt(i);

    // Fit the rendered table onto a real A4 page — pick whichever orientation
    // wastes the least space, then center the content with a margin.
    const A4_PORTRAIT = [595, 842];
    const A4_LANDSCAPE = [842, 595];
    const margin = 36;
    const fitScale = ([pw, ph]) => Math.min((pw - margin * 2) / width, (ph - margin * 2) / height);
    const scalePortrait = fitScale(A4_PORTRAIT);
    const scaleLandscape = fitScale(A4_LANDSCAPE);
    const useLandscape = scaleLandscape > scalePortrait;
    const [pageW, pageH] = useLandscape ? A4_LANDSCAPE : A4_PORTRAIT;
    const scale = Math.min(useLandscape ? scaleLandscape : scalePortrait, 1.4);
    const drawW = width * scale;
    const drawH = height * scale;
    const drawX = (pageW - drawW) / 2;
    const drawY = pageH - margin - drawH;

    const enc = new TextEncoder();
    const chunks = [];
    let offset = 0;
    const objOffsets = [];
    const push = (data) => {
      const bytes = typeof data === "string" ? enc.encode(data) : data;
      chunks.push(bytes);
      offset += bytes.length;
    };
    const startObj = (num) => { objOffsets[num] = offset; };

    push("%PDF-1.4\n");

    startObj(1);
    push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

    startObj(2);
    push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

    startObj(3);
    push(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`);

    const contentStream = `q ${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm /Im0 Do Q`;
    startObj(4);
    push(`4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`);

    startObj(5);
    push(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
    push(jpegBytes);
    push("\nendstream\nendobj\n");

    const xrefStart = offset;
    let xref = "xref\n0 6\n0000000000 65535 f \n";
    for (let i = 1; i <= 5; i++) xref += String(objOffsets[i]).padStart(10, "0") + " 00000 n \n";
    push(xref);
    push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    const pdfBytes = new Uint8Array(total);
    let pos = 0;
    for (const c of chunks) { pdfBytes.set(c, pos); pos += c.length; }

    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const downloadRowsAsImage = (title, subtitle, columns, rows, filename) => {
    const { canvas } = buildTableCanvas(title, subtitle, columns, rows);
    downloadCanvasAsImage(canvas, filename);
  };

  const downloadRowsAsPDF = (title, subtitle, columns, rows, filename) => {
    const { canvas, width, height } = buildTableCanvas(title, subtitle, columns, rows);
    downloadCanvasAsPDF(canvas, width, height, filename);
  };

  // Builds a printable Hifz exam report: header (student/date/teacher/result),
  // a questions table, and a wrapped Recitation Comments block underneath.
  const buildExamReportCanvas = (exam, teacherLabel) => {
    const padding = 24;
    const cellPaddingX = 10;
    const rowHeight = 34;
    const colHeaderHeight = 34;
    const hasLogo = !!logoImg;
    const logoH = 40;
    const logoW = hasLogo ? logoH * (logoImg.width / logoImg.height) : 0;
    const fontFamily = "system-ui, -apple-system, sans-serif";
    const measure = document.createElement("canvas").getContext("2d");

    const columns = ["#", "Surah", "Ayah", "Type", "Result", "Remark"];
    const rows = exam.questions.map((q, i) => [
      String(i + 1), (q.surah ?? q.startSurah) || "—", (q.ayah ?? q.startAyah) || "—",
      q.questionType || "—", q.result === "correct" ? "Correct" : "Incorrect", q.remark || "—",
    ]);
    measure.font = "13px " + fontFamily;
    const colWidths = columns.map((col, i) => {
      let max = measure.measureText(col).width;
      rows.forEach((r) => {
        const w = measure.measureText(String(r[i] ?? "")).width;
        if (w > max) max = w;
      });
      return Math.max(70, Math.ceil(max) + cellPaddingX * 2);
    });
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);

    const resultLabel = exam.finalResult === "pass" ? "PASS" : "NOT PASSED";
    const resultColor = exam.finalResult === "pass" ? C.d : C.b;
    const resultBg = exam.finalResult === "pass" ? C.i : C.h;

    // Clearly-labelled header block: title, then one line each for student,
    // exam date, and teacher, plus a colored result banner — nothing crammed
    // onto a single subtitle line.
    const headerLinesY = hasLogo ? 10 : 0;
    const titleAreaHeight = (hasLogo ? 60 : 56) + 3 * 18 + 14;

    // Word-wrap the comments to the table's width
    measure.font = "13px " + fontFamily;
    const commentsLabel = "Recitation Comments";
    const commentLines = [];
    const commentText = exam.comments || "—";
    commentText.split("\n").forEach((paragraph) => {
      const words = paragraph.split(" ");
      let line = "";
      words.forEach((word) => {
        const test = line ? `${line} ${word}` : word;
        if (measure.measureText(test).width > tableWidth && line) {
          commentLines.push(line);
          line = word;
        } else {
          line = test;
        }
      });
      commentLines.push(line);
    });
    const commentsBlockHeight = 24 + commentLines.length * 18 + 16;

    const tableHeaderY = titleAreaHeight;
    const bodyHeight = rows.length === 0 ? 40 : rows.length * rowHeight;
    const tableHeight = colHeaderHeight + bodyHeight;
    const width = Math.max(tableWidth + padding * 2, hasLogo ? padding * 2 + logoW + 260 : 320);
    const height = tableHeaderY + tableHeight + commentsBlockHeight + padding;

    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    ctx.fillStyle = C.c;
    ctx.fillRect(0, 0, width, height);

    const textX = hasLogo ? padding + logoW + 14 : padding;
    if (hasLogo) ctx.drawImage(logoImg, padding, headerLinesY, logoW, logoH);
    else {
      ctx.fillStyle = C.m;
      ctx.font = "600 19px Georgia, 'Times New Roman', serif";
      ctx.fillText("Aflaah Quran Class", padding, 20);
    }
    ctx.fillStyle = C.f;
    ctx.font = "700 16px " + fontFamily;
    ctx.fillText("Hifz Exam Report", textX, headerLinesY + 18);

    ctx.font = "13px " + fontFamily;
    const infoLines = [
      ["Student: ", exam.studentName],
      ["Exam Date: ", exam.examDate],
      ["Teacher: ", teacherLabel],
    ];
    infoLines.forEach(([label, value], i) => {
      const lineY = headerLinesY + 40 + i * 18;
      ctx.fillStyle = C.a;
      ctx.fillText(label, textX, lineY);
      const labelW = measure.measureText(label).width;
      ctx.fillStyle = C.w;
      ctx.font = "700 13px " + fontFamily;
      ctx.fillText(value, textX + labelW, lineY);
      ctx.font = "13px " + fontFamily;
    });

    const badgeW = 130, badgeH = 30;
    const badgeX = width - padding - badgeW;
    const badgeY = headerLinesY + 4;
    ctx.fillStyle = resultBg;
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.fillStyle = resultColor;
    ctx.font = "700 13px " + fontFamily;
    ctx.textAlign = "center";
    ctx.fillText(resultLabel, badgeX + badgeW / 2, badgeY + badgeH / 2 + 4);
    ctx.textAlign = "left";

    ctx.fillStyle = C.e;
    ctx.fillRect(0, titleAreaHeight - 6, width, 2);

    const tableLeft = padding;
    const colX = [tableLeft];
    colWidths.forEach((w) => colX.push(colX[colX.length - 1] + w));

    ctx.fillStyle = C.m;
    ctx.font = "700 12px " + fontFamily;
    columns.forEach((col, i) => ctx.fillText(col.toUpperCase(), colX[i] + cellPaddingX, tableHeaderY + 22));

    ctx.font = "13px " + fontFamily;
    if (rows.length === 0) {
      ctx.fillText("No questions recorded.", tableLeft + cellPaddingX, tableHeaderY + colHeaderHeight + 24);
    } else {
      rows.forEach((r, ri) => {
        const rowY = tableHeaderY + colHeaderHeight + ri * rowHeight;
        columns.forEach((col, i) => ctx.fillText(String(r[i] ?? ""), colX[i] + cellPaddingX, rowY + rowHeight / 2 + 4));
      });
    }

    ctx.strokeStyle = C.m;
    ctx.lineWidth = 1;
    ctx.beginPath();
    colX.forEach((x) => { ctx.moveTo(x, tableHeaderY); ctx.lineTo(x, tableHeaderY + tableHeight); });
    for (let i = 0; i <= (rows.length || 1); i++) {
      const y = tableHeaderY + colHeaderHeight + i * (rows.length === 0 ? bodyHeight : rowHeight);
      ctx.moveTo(tableLeft, y); ctx.lineTo(tableLeft + tableWidth, y);
    }
    ctx.moveTo(tableLeft, tableHeaderY); ctx.lineTo(tableLeft + tableWidth, tableHeaderY);
    ctx.stroke();

    const commentsTop = tableHeaderY + tableHeight + 20;
    ctx.fillStyle = C.m;
    ctx.font = "700 12px " + fontFamily;
    ctx.fillText(commentsLabel.toUpperCase(), tableLeft, commentsTop);
    ctx.fillStyle = C.w;
    ctx.font = "13px " + fontFamily;
    commentLines.forEach((line, i) => ctx.fillText(line, tableLeft, commentsTop + 22 + i * 18));

    return { canvas, width, height };
  };

  const downloadExamReportAsImage = (exam, teacherLabel, filename) => {
    const { canvas } = buildExamReportCanvas(exam, teacherLabel);
    downloadCanvasAsImage(canvas, filename);
  };
  const downloadExamReportAsPDF = (exam, teacherLabel, filename) => {
    const { canvas, width, height } = buildExamReportCanvas(exam, teacherLabel);
    downloadCanvasAsPDF(canvas, width, height, filename);
  };

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", background: C.v, minHeight: authView === "login" ? undefined : "640px", color: C.w }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes lc-fade-up { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lc-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lc-slide-down { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lc-spin { to { transform: rotate(360deg); } }
        @keyframes lc-pop { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

        .lc-btn { border: 1px solid #BBDCF0; background: #FFFFFF; border-radius: 8px; padding: 8px 14px; font-size: 14px; cursor: pointer; color: #1B2733; transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease; }
        .lc-btn:hover { background: #EAF4FB; box-shadow: 0 2px 6px rgba(46,134,193,0.14); transform: translateY(-1px); }
        .lc-btn:active { transform: translateY(0) scale(0.97); }
        .lc-btn-primary { background: #2E86C1; color: #FFFFFF; border: 1px solid #2E86C1; }
        .lc-btn-primary:hover { background: #256FA3; box-shadow: 0 3px 10px rgba(46,134,193,0.35); }
        .lc-btn:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
        .lc-btn-danger { background: #FFFFFF; color: #B5432E; border: 1px solid #E3C3BA; }
        .lc-btn-danger:hover { background: #FBEDEA; box-shadow: 0 2px 6px rgba(181,67,46,0.18); }
        .lc-input, .lc-select { border: 1px solid #BBDCF0; border-radius: 8px; padding: 8px 10px; font-size: 14px; width: 100%; box-sizing: border-box; background: #FFFFFF; color: #1B2733; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .lc-input:hover, .lc-select:hover { border-color: #8FC4E8; }
        .lc-input:focus, .lc-select:focus { outline: none; border-color: #2E86C1; box-shadow: 0 0 0 3px rgba(46,134,193,0.18); }
        .lc-ss { position: relative; }
        .lc-ss-trigger { border: 1px solid #BBDCF0; border-radius: 8px; padding: 8px 10px; font-size: 14px; width: 100%; box-sizing: border-box; background: #FFFFFF; color: #1B2733; text-align: left; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .lc-ss-trigger:hover { border-color: #8FC4E8; }
        .lc-ss-trigger:focus { outline: none; border-color: #2E86C1; box-shadow: 0 0 0 3px rgba(46,134,193,0.18); }
        .lc-ss-trigger:disabled { opacity: 0.5; cursor: not-allowed; }
        .lc-ss-trigger span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lc-ss-placeholder { color: #8A93A0; }
        .lc-ss-panel { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #FFFFFF; border: 1px solid #BBDCF0; border-radius: 10px; box-shadow: 0 8px 24px rgba(27,79,114,0.18); z-index: 60; overflow: hidden; animation: lc-slide-down 0.15s ease both; }
        .lc-ss-search-wrap { position: relative; padding: 8px; border-bottom: 1px solid #E7F2FA; }
        .lc-ss-search-wrap svg { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); pointer-events: none; }
        .lc-ss-search { width: 100%; box-sizing: border-box; border: 1px solid #D3E9F7; border-radius: 8px; padding: 7px 10px 7px 30px; font-size: 14px; background: #FAFCFE; color: #1B2733; }
        .lc-ss-search:focus { outline: none; border-color: #2E86C1; }
        .lc-ss-list { max-height: 220px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
        .lc-ss-option { padding: 9px 12px; font-size: 14px; cursor: pointer; color: #1B2733; }
        .lc-ss-option-active { background: #EAF4FB; }
        .lc-ss-option-selected { font-weight: 600; color: #2E86C1; }
        .lc-ss-empty { padding: 14px 12px; font-size: 13px; color: #5B6B79; text-align: center; }
        @media (max-width: 640px) {
          .lc-ss-panel { position: fixed; left: 12px; right: 12px; top: auto; bottom: 12px; max-height: 60vh; }
          .lc-ss-list { max-height: 44vh; }
        }
        .lc-card { background: #FFFFFF; border: 1px solid #D3E9F7; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 2px rgba(27,79,114,0.05); transition: box-shadow 0.2s ease, transform 0.2s ease; animation: lc-fade-up 0.3s ease both; }
        .lc-tab { padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; color: #DCEEFB; transition: background 0.18s ease, color 0.18s ease, transform 0.1s ease; }
        .lc-tab:hover { background: #2670A0; color: #FFFFFF; transform: translateX(2px); }
        .lc-tab-active { background: #FFFFFF; color: #1B4F72; font-weight: 600; box-shadow: 0 2px 6px rgba(0,0,0,0.12); }
        .lc-tab-active:hover { transform: none; }
        .lc-sidebar-actions { margin-top: 18px; border-top: 1px solid #2A5D85; padding-top: 16px; display: flex; flex-direction: column; gap: 8px; }
        .lc-sidebar-btn { display: flex; align-items: center; gap: 9px; padding: 9px 14px; border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: background 0.18s ease, color 0.18s ease, transform 0.12s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
        .lc-sidebar-btn:active { transform: scale(0.97); }
        .lc-sidebar-btn-ghost { color: #DCEEFB; border-color: #2A5D85; background: rgba(255,255,255,0.03); }
        .lc-sidebar-btn-ghost:hover { background: #2670A0; color: #FFFFFF; border-color: #2670A0; transform: translateX(2px); }
        .lc-sidebar-btn-logout { color: #FBD9CF; border-color: rgba(229,115,90,0.4); background: rgba(229,115,90,0.08); }
        .lc-sidebar-btn-logout:hover { background: #D9573A; color: #FFFFFF; border-color: #D9573A; box-shadow: 0 3px 10px rgba(217,87,58,0.35); transform: translateX(2px); }
        .lc-subtab { padding: 6px 14px; border-radius: 999px; cursor: pointer; font-size: 13px; border: 1px solid #BBDCF0; color: #1B2733; background: #FFFFFF; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.1s ease; }
        .lc-subtab:hover { border-color: #2E86C1; transform: translateY(-1px); }
        .lc-subtab-active { background: #2E86C1; color: #FFFFFF; border-color: #2E86C1; }
        table.lc-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        table.lc-table th { text-align: left; color: #5B6B79; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; padding: 8px 10px; border-bottom: 1px solid #D3E9F7; }
        table.lc-table td { padding: 10px 10px; border-bottom: 1px solid #E7F2FA; vertical-align: middle; }
        table.lc-table tbody tr { transition: background 0.15s ease; }
        table.lc-table tbody tr:hover { background: #F7FBFE; }
        .lc-badge { font-size: 12px; padding: 3px 10px; border-radius: 999px; font-weight: 600; border: none; cursor: pointer; transition: transform 0.12s ease, box-shadow 0.12s ease; }
        .lc-badge:hover { transform: scale(1.06); }
        .lc-badge-paid { background: #E3F0E7; color: #1E6B45; }
        .lc-badge-pending { background: #FBEAE6; color: #A5432C; animation: lc-pop 0.25s ease; }
        .lc-badge-neutral { background: #EDEFF2; color: #4B5563; }
        .lc-badge-move { background: #EDE7F6; color: #6A3FA0; }
        .lc-stat-card { background: #FFFFFF; border: 1px solid ${TP.border}; border-radius: 14px; padding: 20px 22px; display: flex; align-items: flex-start; gap: 14px; transition: box-shadow 0.2s ease, transform 0.2s ease; animation: lc-fade-up 0.35s ease both; }
        .lc-stat-card:hover { box-shadow: 0 8px 20px rgba(27,79,114,0.14); transform: translateY(-3px); }
        .lc-stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 0.2s ease; }
        .lc-stat-card:hover .lc-stat-icon { transform: scale(1.1) rotate(-4deg); }
        .lc-stat-value { font-size: 28px; font-weight: 600; line-height: 1.2; }
        .lc-stat-label { font-size: 13px; color: #5B6B79; margin-top: 2px; }
        .lc-quick-link { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 1px solid ${TP.border}; border-radius: 10px; cursor: pointer; background: #FFFFFF; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
        .lc-quick-link:hover { background: #EAF4FB; box-shadow: 0 3px 10px rgba(27,79,114,0.10); transform: translateX(2px); }
        .lc-quick-link svg { transition: transform 0.15s ease; }
        .lc-quick-link:hover svg { transform: translateX(3px); }
        table.lc-grid { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
        table.lc-grid th, table.lc-grid td { border: 1px solid #E7F2FA; padding: 8px 8px; vertical-align: top; }
        table.lc-grid th { background: #F4F9FD; color: #1B4F72; font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em; text-align: center; }
        table.lc-grid td.lc-time-cell { background: #FAFCFE; color: #5B6B79; font-weight: 600; white-space: nowrap; text-align: center; }
        table.lc-grid td { transition: background 0.15s ease; }
        table.lc-grid td:hover { background: #F7FBFE; }
        .lc-cell-entry { padding: 3px 6px; margin-bottom: 3px; background: #E6F1FB; border-radius: 6px; font-size: 12px; line-height: 1.3; transition: background 0.15s ease; }
        .lc-cell-entry:hover { background: #D3E9F7; }
        .lc-cell-entry:last-child { margin-bottom: 0; }
        .lc-class-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #FFFFFF; border: 1px solid #D3E9F7; border-radius: 10px; cursor: pointer; transition: background 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease; }
        .lc-class-header:hover { background: #EAF4FB; box-shadow: 0 2px 8px rgba(27,79,114,0.10); border-color: #8FC4E8; }
        .lc-class-header-left { display: flex; align-items: center; gap: 8px; }
        .lc-class-header-left svg { transition: transform 0.2s ease; }
        .lc-expand-panel { animation: lc-slide-down 0.22s ease both; }
        .lc-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        .lc-cal-dow { font-size: 11px; font-weight: 600; color: #5B6B79; text-align: center; text-transform: uppercase; letter-spacing: 0.03em; padding-bottom: 4px; }
        .lc-cal-cell { border: 1px solid #E7F2FA; border-radius: 10px; padding: 6px 6px 8px; min-height: 64px; cursor: pointer; background: #FFFFFF; transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease; display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
        .lc-cal-cell:hover { border-color: #8FC4E8; transform: translateY(-1px); }
        .lc-cal-cell-out { opacity: 0.35; }
        .lc-cal-cell-pending { animation: lc-pending-glow 2.2s ease-in-out infinite; }
        @keyframes lc-pending-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(217,162,52,0.35); } 50% { box-shadow: 0 0 0 3px rgba(217,162,52,0.18); } }
        .lc-cal-daynum { font-size: 12px; font-weight: 600; color: #1B2733; }
        .lc-cal-pill { align-self: flex-start; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 999px; }
        .lc-btn-tap { padding: 14px 10px; font-size: 14px; font-weight: 600; text-align: center; }
        .lc-modal-backdrop { position: fixed; inset: 0; background: rgba(20,35,50,0.45); display: flex; align-items: flex-end; justify-content: center; z-index: 50; animation: lc-fade-up 0.15s ease both; }
        .lc-modal-sheet { background: #FFFFFF; width: 100%; max-width: 480px; max-height: 82vh; overflow-y: auto; border-radius: 18px 18px 0 0; padding: 18px 18px 26px; box-shadow: 0 -4px 24px rgba(0,0,0,0.18); animation: lc-slide-down 0.2s ease both; }
        @media (min-width: 640px) {
          .lc-modal-backdrop { align-items: center; }
          .lc-modal-sheet { border-radius: 16px; max-height: 85vh; }
        }
        .lc-app { display: flex; min-height: 640px; }
        .lc-sidebar { width: 200px; background: #1B4F72; padding: 24px 14px; flex-shrink: 0; }
        .lc-brand { font-family: Georgia, 'Times New Roman', serif; color: #FFFFFF; font-size: 18px; line-height: 1.3; margin-bottom: 4px; padding: 0 6px; }
        .lc-sidebar-logo { display: block; margin-bottom: 14px; animation: lc-fade-in 0.4s ease; }
        .lc-sidebar-logo img { height: 68px; width: auto; display: block; }
        .lc-brand-sub { color: #AFD4EC; font-size: 12px; margin-bottom: 24px; padding: 0 6px; }
        .lc-navlist { display: flex; flex-direction: column; gap: 4px; }
        .lc-tab-icon { display: flex; align-items: center; gap: 9px; }
        .lc-main { flex: 1; padding: 28px 32px; min-width: 0; animation: lc-fade-in 0.25s ease; }
        .lc-headerrow { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
        .lc-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .lc-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
        .lc-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 24px; }
        .lc-grid-3 > *:nth-child(1) { animation-delay: 0.02s; }
        .lc-grid-3 > *:nth-child(2) { animation-delay: 0.08s; }
        .lc-grid-3 > *:nth-child(3) { animation-delay: 0.14s; }
        .lc-grid-2 > *:nth-child(1) { animation-delay: 0.02s; }
        .lc-grid-2 > *:nth-child(2) { animation-delay: 0.08s; }
        .lc-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        table.lc-table { min-width: 480px; }
        .lc-spinner { width: 16px; height: 16px; border: 2px solid #D3E9F7; border-top-color: #2E86C1; border-radius: 50%; display: inline-block; animation: lc-spin 0.7s linear infinite; vertical-align: middle; margin-right: 8px; }
        .lc-loading-row { display: flex; align-items: center; color: #5B6B79; font-size: 14px; }
        .lc-toast { position: fixed; bottom: 24px; right: 24px; background: #1B4F72; color: #FFFFFF; padding: 12px 18px; border-radius: 10px; font-size: 14px; box-shadow: 0 6px 20px rgba(0,0,0,0.2); z-index: 1000; animation: lc-slide-up 0.25s ease both; display: flex; align-items: center; gap: 8px; }
        .lc-progress-track { width: 100%; height: 8px; background: #E7F2FA; border-radius: 999px; overflow: hidden; }
        .lc-progress-fill { height: 100%; background: linear-gradient(90deg, ${TP.blue}, ${TP.teal}); border-radius: 999px; transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
        .lc-search-wrap { position: relative; flex: 1; min-width: 180px; max-width: 320px; }
        .lc-search-wrap svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; }
        .lc-search-wrap input { padding-left: 32px; padding-right: 28px; }
        .lc-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px; display: flex; color: #5B6B79; }
        .lc-empty-state { text-align: center; padding: 32px 16px; color: #5B6B79; }
        .lc-empty-state svg { margin: 0 auto 10px; opacity: 0.5; }
        .lc-celebrate { display: flex; align-items: center; gap: 8px; animation: lc-pop 0.35s ease; }
        @keyframes lc-slide-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        h1 { transition: opacity 0.15s ease; }
        @media (max-width: 820px) {
          .lc-app { flex-direction: column; }
          .lc-sidebar { width: 100%; box-sizing: border-box; padding: 14px 16px; display: flex; align-items: center; flex-wrap: wrap; gap: 12px 20px; }
          .lc-brand { margin-bottom: 0; padding: 0; font-size: 16px; }
          .lc-brand-sub { display: none; }
          .lc-sidebar-logo { margin-bottom: 0; }
          .lc-sidebar-logo img { height: 44px; }
          .lc-navlist { flex-direction: row; gap: 6px; flex-wrap: wrap; }
          .lc-tab { padding: 7px 12px; }
          .lc-main { padding: 18px 16px; }
        }
        @media (min-width: 821px) and (max-width: 1000px) {
          .lc-grid-3 { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1300px) {
          .lc-main { flex: 0 1 1180px; margin: 0 auto; }
        }
        @media (max-width: 640px) {
          .lc-form-grid { grid-template-columns: 1fr; }
          .lc-grid-3 { grid-template-columns: 1fr; margin-bottom: 14px; }
          .lc-grid-2 { grid-template-columns: 1fr; margin-bottom: 14px; }
          .lc-card { padding: 14px 16px; }
        }
        @media (max-width: 430px) {
          .lc-cal-grid { gap: 3px; }
          .lc-cal-cell { min-height: 46px; padding: 4px 2px 5px; border-radius: 8px; }
          .lc-cal-cell svg { width: 13px !important; height: 13px !important; }
          .lc-cal-daynum { font-size: 11px; }
          .lc-cal-dow { font-size: 9px; }
          .lc-modal-sheet { padding: 14px 14px 20px; }
        }
        @media print {
          .no-print { display: none !important; }
          .lc-main { padding: 0 !important; }
          .lc-app, body { background: #FFFFFF !important; }
          table.lc-table { min-width: 0; }
        }
      `}</style>

      {authView === "checking" ? (
        <div style={{ minHeight: "640px", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: C.f }}>
          <div style={{ color: C.a, fontSize: "14px" }}>Loading…</div>
        </div>
      ) : authView === "login" ? (
        <LoginScreen
          accountType={accountType}
          onAccountTypeChange={handleAccountTypeChange}
          fields={accountTypeFields[accountType]}
          showPassword={showLoginPassword}
          onToggleShowPassword={() => setShowLoginPassword((v) => !v)}
          rememberMe={rememberMe}
          onToggleRememberMe={setRememberMe}
          onSubmit={handleUnifiedSignIn}
          onForgotPassword={handleForgotPassword}
          forgotPasswordStatus={forgotPasswordStatus}
        />
      ) : role === "teacher" ? (
        <TeacherPortalLayout
          activeSection={section}
          navItems={[
            { key: "timetable", label: "My timetable", icon: CalendarDays, onClick: () => setSection("timetable") },
            { key: "attendance", label: "Attendance", icon: ClipboardCheck, onClick: () => { setSection("attendance"); setAttendanceView("day"); } },
            { key: "exams", label: "Exams", icon: FileText, onClick: () => { setSection("exams"); setExamView("details"); } },
          ]}
          teacherDisplayName={teacherName(loggedInTeacherId)}
          onLogout={() => { setSection("dashboard"); signOutUser(); }}
        >
          <div className="lc-main" key={`teacher-${section}`}>
            {saveError && <div style={{ color: C.b, fontSize: "13px", marginBottom: "14px" }}>{saveError}</div>}

            {section === "timetable" && (() => {
              const filtered = scheduleRows.filter((r) => r.teacherId === loggedInTeacherId);
              const grid = buildTimetableGrid(filtered, (r) => r.className || "—", (r) => r.classId || r.className || "—");
              const gridColumnsForImage = ["Time", ...DAY_ORDER];
              const imageRows = grid.map((row) => [row.timeLabel, ...row.cells.map((c) => c.join(", "))]);
              const subtitle = teacherName(loggedInTeacherId);
              return (
                <div className="tp-timetable-page">
                  <style>{`
                    .tp-timetable-page { position: relative; margin: -28px -32px; padding: 32px; min-height: calc(100% + 56px); overflow: hidden; box-sizing: border-box; }
                    /* .lc-main's own padding shrinks at 820px (shared with admin/staff
                       screens) — match the bleed margin there so the background stays
                       flush with .lc-main's real edge instead of overshooting it. */
                    @media (max-width: 820px) {
                      .tp-timetable-page { margin: -18px -16px; padding: 24px; min-height: calc(100% + 36px); }
                    }
                    @media (max-width: 640px) {
                      .tp-timetable-page { padding: 20px; }
                    }
                  `}</style>
                  <div className="tp-header">
                    <div className="tp-title-group">
                      <span className="tp-title-icon" aria-hidden="true"><CalendarDays size={22} /></span>
                      <h1 className="tp-title">My timetable</h1>
                    </div>
                    <div className="tp-actions no-print">
                      <span className="tp-chip">
                        <Users size={16} aria-hidden="true" />
                        {subtitle}
                      </span>
                      <button
                        type="button"
                        className="tp-btn-outline"
                        aria-label={`Download ${subtitle}'s timetable as an image`}
                        onClick={() => downloadRowsAsImage("My Timetable", subtitle, gridColumnsForImage, imageRows, `${subtitle.replace(/\s+/g, "_")}_timetable.png`)}
                      >
                        <ImageIcon size={16} aria-hidden="true" />
                        Download as image
                      </button>
                      <button
                        type="button"
                        className="tp-btn-gradient"
                        aria-label={`Download ${subtitle}'s timetable as a PDF`}
                        onClick={() => downloadRowsAsPDF("My Timetable", subtitle, gridColumnsForImage, imageRows, `${subtitle.replace(/\s+/g, "_")}_timetable.pdf`)}
                      >
                        <FileText size={16} aria-hidden="true" />
                        Download as PDF
                      </button>
                    </div>
                  </div>
                  <div className="tp-card">
                    {grid.length === 0 ? (
                      <div style={{ color: C.a, fontSize: "14px" }}>No classes scheduled for you yet. Ask the admin to assign your students and set their class days.</div>
                    ) : (
                      <div className="tp-table-wrap">
                        <table className="tp-table">
                          <thead>
                            <tr>
                              <th scope="col">Time</th>
                              {DAY_ORDER.map((d) => <th key={d} scope="col">{d}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {grid.map((row, i) => (
                              <tr key={i}>
                                <td className="tp-time-cell">{row.timeLabel}</td>
                                {row.cells.map((entries, j) => (
                                  <td key={j}>
                                    {entries.map((label, k) => (
                                      <div key={k} className={`tp-entry ${(j + k) % 2 === 0 ? "tp-entry-blue" : "tp-entry-aqua"}`}>{label}</div>
                                    ))}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {section === "attendance" && (() => {
              const todayStr = fmtDateStr(new Date());
              const selectedDate = recordDate;
              const selectedWeekday = weekdayAbbrev(selectedDate);
              const dayRecords = attendanceByDate[selectedDate] || {};
              const selectedStudent = students.find((s) => s.id === attStudentId) || null;
              const modalSessions = attStudentId
                ? getSessionsForDate(selectedDate).filter((r) => r.studentId === attStudentId)
                : [];

              const setStatus = (studentId, status) => {
                const current = dayRecords[studentId] || {};
                const updated = { ...dayRecords, [studentId]: { ...current, status, rescheduledTo: undefined, rescheduledStartTime: undefined, rescheduledEndTime: undefined } };
                saveAttendanceForDate(selectedDate, updated);
                showToast(status === "present" ? "Saved: Present" : "Saved: Absent");
              };
              const setStatusBulk = (studentIds, status) => {
                const updated = { ...dayRecords };
                studentIds.forEach((studentId) => {
                  const current = updated[studentId] || {};
                  updated[studentId] = { ...current, status, rescheduledTo: undefined, rescheduledStartTime: undefined, rescheduledEndTime: undefined };
                });
                saveAttendanceForDate(selectedDate, updated);
                showToast(`Marked ${studentIds.length} student${studentIds.length === 1 ? "" : "s"} as ${status === "present" ? "Present" : "Absent"}`);
              };

              const undoReschedule = (studentId) => {
                const current = dayRecords[studentId] || {};
                const updated = { ...dayRecords, [studentId]: { ...current, status: undefined, rescheduledTo: undefined, rescheduledStartTime: undefined, rescheduledEndTime: undefined } };
                saveAttendanceForDate(selectedDate, updated);
                showToast("Move undone");
              };

              const closeDetail = () => setAttDetailOpen(false);

              const statusBadge = (status) => {
                if (status === "present") return <span className="lc-badge lc-badge-paid">Present</span>;
                if (status === "absent") return <span className="lc-badge lc-badge-pending">Absent</span>;
                if (status === "cancelled") return <span className="lc-badge lc-badge-neutral">Cancelled</span>;
                return null;
              };

              const daySessions = scheduleRows
                .filter((r) => r.teacherId === loggedInTeacherId && r.day === selectedWeekday)
                .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
              const dayGroups = groupByClass(daySessions);
              const openGroup = openClassName ? dayGroups.find((g) => g.className === openClassName) : null;

              // ---- Unmarked attendance: this teacher's own past classes (last 14 days,
              // already ended) with no present/absent mark saved yet. Only counts from
              // UNMARKED_ATTENDANCE_START_DATE onward — older gaps don't count, and
              // nothing here expires with time; it only clears once marked or the
              // teacher dismisses it via dismissUnmarked. ----
              const teacherUnmarked = (() => {
                const now = new Date();
                const nowTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                const dismissedSet = new Set(teacherUnmarkedDismissals.map((d) => `${d.date}|${d.className}`));
                const groups = new Map();
                for (let d = new Date(`${UNMARKED_ATTENDANCE_START_DATE}T00:00:00`); fmtDateStr(d) <= todayStr; d.setDate(d.getDate() + 1)) {
                  const dateStr = fmtDateStr(d);
                  if (isHoliday(dateStr)) continue;
                  const isToday = dateStr === todayStr;
                  const weekday = weekdayAbbrev(dateStr);
                  const dateRecords = attendanceByDate[dateStr] || {};
                  scheduleRows.filter((r) => r.teacherId === loggedInTeacherId && r.day === weekday).forEach((r) => {
                    if (isToday && r.endTime > nowTimeStr) return; // class hasn't ended yet today
                    const st = (dateRecords[r.studentId] || {}).status;
                    if (st) return; // already marked
                    const key = `${dateStr}|${r.className}`;
                    if (dismissedSet.has(key)) return; // teacher cleared this one
                    if (!groups.has(key)) groups.set(key, { date: dateStr, className: r.className, entries: [] });
                    groups.get(key).entries.push(r);
                  });
                }
                return Array.from(groups.values()).sort((a, b) => b.date.localeCompare(a.date) || a.className.localeCompare(b.className));
              })();

              const jumpToUnmarked = (dateStr, className, entries) => {
                setAttendanceView("day");
                setRecordDate(dateStr);
                const freshRecords = attendanceByDate[dateStr] || {};
                const draft = {};
                entries.forEach((r) => {
                  const st = (freshRecords[r.studentId] || {}).status;
                  draft[r.studentId] = st === "present" || st === "absent" ? st : undefined;
                });
                setAttDraft(draft);
                setOpenClassName(className);
              };

              // ---- Whole-day / whole-class reschedule ----
              const startBulkReschedule = (scope) => {
                setAttReschedule(scope);
                setAttRescheduleDate("");
                setAttRescheduleStart("");
                setAttRescheduleEnd("");
                setAttRescheduleError("");
              };
              const cancelBulkReschedule = () => {
                setAttReschedule(null);
                setAttRescheduleError("");
              };
              const confirmBulkReschedule = () => {
                if (!attRescheduleDate) { setAttRescheduleError("Pick a new date."); return; }
                if (!attRescheduleStart || !attRescheduleEnd || attRescheduleStart >= attRescheduleEnd) { setAttRescheduleError("Set a valid start and end time."); return; }
                const targets = attReschedule.type === "day"
                  ? daySessions
                  : daySessions.filter((r) => r.className === attReschedule.className);
                const updated = { ...dayRecords };
                let moved = 0, clashed = 0;
                targets.forEach((r) => {
                  const clash = getSessionsForDate(attRescheduleDate)
                    .filter((s) => s.studentId !== r.studentId)
                    .find((s) => timesOverlap(attRescheduleStart, attRescheduleEnd, s.startTime, s.endTime));
                  if (clash) { clashed++; return; }
                  const current = updated[r.studentId] || {};
                  updated[r.studentId] = { ...current, status: "rescheduled", rescheduledTo: attRescheduleDate, rescheduledStartTime: attRescheduleStart, rescheduledEndTime: attRescheduleEnd };
                  moved++;
                });
                saveAttendanceForDate(selectedDate, updated);
                setAttReschedule(null);
                showToast(moved === 0 ? "No classes moved — all clashed with existing sessions." : clashed > 0 ? `Moved ${moved}, skipped ${clashed} (time clash)` : `Moved ${moved} to ${attRescheduleDate}`);
              };

              // ---- Class detail draft (Save / Reset / Cancel) ----
              const draftFromSaved = (entries) => {
                const draft = {};
                entries.forEach((r) => {
                  const st = (dayRecords[r.studentId] || {}).status;
                  draft[r.studentId] = st === "present" || st === "absent" ? st : undefined;
                });
                return draft;
              };
              const openClass = (className, entries) => {
                setAttDraft(draftFromSaved(entries));
                setOpenClassName(className);
              };
              const closeClass = () => {
                setOpenClassName(null);
                setAttDraft({});
                cancelBulkReschedule();
              };
              const resetDraft = () => {
                if (!openGroup) return;
                setAttDraft(draftFromSaved(openGroup.entries));
              };
              const saveDraft = () => {
                if (!openGroup) return;
                const updated = { ...dayRecords };
                openGroup.entries.forEach((r) => {
                  const val = attDraft[r.studentId];
                  if (!val) return;
                  const current = updated[r.studentId] || {};
                  updated[r.studentId] = { ...current, status: val, rescheduledTo: undefined, rescheduledStartTime: undefined, rescheduledEndTime: undefined };
                });
                saveAttendanceForDate(selectedDate, updated);
                showToast("Attendance saved");
                closeClass();
              };

              // Build the month calendar grid
              const firstOfMonth = new Date(attCalendarYear, attCalendarMonth0, 1);
              const startWeekday = firstOfMonth.getDay();
              const daysInMonth = new Date(attCalendarYear, attCalendarMonth0 + 1, 0).getDate();
              const cellsFlat = [];
              for (let i = 0; i < startWeekday; i++) {
                cellsFlat.push({ date: new Date(attCalendarYear, attCalendarMonth0, i - startWeekday + 1), inMonth: false });
              }
              for (let d = 1; d <= daysInMonth; d++) {
                cellsFlat.push({ date: new Date(attCalendarYear, attCalendarMonth0, d), inMonth: true });
              }
              while (cellsFlat.length % 7 !== 0) {
                const last = cellsFlat[cellsFlat.length - 1].date;
                const next = new Date(last);
                next.setDate(last.getDate() + 1);
                cellsFlat.push({ date: next, inMonth: false });
              }

              const goPrevMonth = () => {
                let m = attCalendarMonth0 - 1, y = attCalendarYear;
                if (m < 0) { m = 11; y -= 1; }
                setAttCalendarMonth0(m); setAttCalendarYear(y);
              };
              const goNextMonth = () => {
                let m = attCalendarMonth0 + 1, y = attCalendarYear;
                if (m > 11) { m = 0; y += 1; }
                setAttCalendarMonth0(m); setAttCalendarYear(y);
              };
              const goThisMonth = () => {
                const d = new Date();
                setAttCalendarMonth0(d.getMonth()); setAttCalendarYear(d.getFullYear());
                setRecordDate(fmtDateStr(d));
              };

              // Build the printable attendance report for the month currently shown
              const monthReportRows = attStudentId
                ? cellsFlat
                    .filter((cell) => cell.inMonth)
                    .map((cell) => {
                      const dateStr = fmtDateStr(cell.date);
                      const dayStatus = getStudentDayStatus(dateStr, attStudentId);
                      if (!dayStatus) return null;
                      const { session, status, movedHere } = dayStatus;
                      let statusLabel;
                      if (status === "present") statusLabel = "Present";
                      else if (status === "absent") statusLabel = "Absent";
                      else if (status === "cancelled") statusLabel = "Cancelled";
                      else if (status === "rescheduled") {
                        const rec = (attendanceByDate[dateStr] || {})[attStudentId] || {};
                        statusLabel = `Moved to ${rec.rescheduledTo || "—"}`;
                      } else if (movedHere) statusLabel = `Moved here from ${session.rescheduledFromDate}`;
                      else statusLabel = "Pending";
                      return [dateStr, weekdayAbbrev(dateStr), `${fmtTime12(session.startTime)} – ${fmtTime12(session.endTime)}`, session.className, statusLabel];
                    })
                    .filter(Boolean)
                : [];
              const monthReportColumns = ["Date", "Day", "Time", "Class", "Status"];
              const monthReportSubtitle = `${selectedStudent ? selectedStudent.name : ""} — ${MONTH_NAMES[attCalendarMonth0]} ${attCalendarYear}`;
              const monthReportFilenameBase = `${(selectedStudent ? selectedStudent.name : "student").replace(/\s+/g, "_")}_${attCalendarYear}-${String(attCalendarMonth0 + 1).padStart(2, "0")}_attendance`;

              // Attendance rate for the month currently shown (present vs absent;
              // cancelled/holiday/pending days don't count for or against the student)
              const monthAttendanceStats = (() => {
                if (!attStudentId) return null;
                let present = 0, absent = 0;
                cellsFlat.filter((c) => c.inMonth).forEach((cell) => {
                  const dateStr = fmtDateStr(cell.date);
                  const ds = getStudentDayStatus(dateStr, attStudentId);
                  if (ds && ds.status === "present") present++;
                  else if (ds && ds.status === "absent") absent++;
                });
                const total = present + absent;
                return { present, absent, total, rate: total > 0 ? Math.round((present / total) * 100) : null };
              })();

              const attSubtitle = teacherName(loggedInTeacherId);

              const rescheduleBox = attReschedule && (
                <div className="lc-card" style={{ marginBottom: "18px", background: C.g }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "10px" }}>
                    {attReschedule.type === "day" ? `Move the whole day (${daySessions.length} class${daySessions.length === 1 ? "" : "es"})` : `Move all of ${attReschedule.className}`}
                  </div>
                  <label style={{ fontSize: "12px", color: C.a }}>New date</label>
                  <input className="lc-input" style={{ marginBottom: "10px" }} type="date" value={attRescheduleDate} onChange={(e) => setAttRescheduleDate(e.target.value)} />
                  <div className="lc-form-grid" style={{ marginBottom: "10px" }}>
                    <div>
                      <label style={{ fontSize: "12px", color: C.a }}>Start time</label>
                      <input className="lc-input" type="time" value={attRescheduleStart} onChange={(e) => setAttRescheduleStart(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: "12px", color: C.a }}>End time</label>
                      <input className="lc-input" type="time" value={attRescheduleEnd} onChange={(e) => setAttRescheduleEnd(e.target.value)} />
                    </div>
                  </div>
                  {attRescheduleError && <div style={{ color: C.b, fontSize: "13px", marginBottom: "10px" }}>{attRescheduleError}</div>}
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="lc-btn lc-btn-primary" style={{ flex: 1 }} onClick={confirmBulkReschedule}>Move classes</button>
                    <button className="lc-btn" onClick={cancelBulkReschedule}>Cancel</button>
                  </div>
                </div>
              );

              return (
                <div className="tp-attendance-page">
                  <style>{`
                    .tp-attendance-page { position: relative; margin: -28px -32px; padding: 32px; min-height: calc(100% + 56px); overflow: hidden; box-sizing: border-box; }
                    @media (max-width: 820px) {
                      .tp-attendance-page { margin: -18px -16px; padding: 24px; min-height: calc(100% + 36px); }
                    }
                    @media (max-width: 640px) {
                      .tp-attendance-page { padding: 20px; }
                    }
                    .tp-att-table { width: 100%; border-collapse: collapse; font-size: 14px; }
                    .tp-att-table th { text-align: left; color: #5B6B79; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; padding: 10px; border-bottom: 1px solid #D3E9F7; }
                    .tp-att-table th.tp-att-radio-col { text-align: center; }
                    .tp-att-table td { padding: 10px; border-bottom: 1px solid #E7F2FA; vertical-align: middle; }
                    .tp-att-table td.tp-att-radio-col { text-align: center; }
                    .tp-att-radio { width: 20px; height: 20px; cursor: pointer; }
                    .tp-alert-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: #D9573A; color: #FFFFFF; font-size: 11px; font-weight: 700; margin-left: 8px; }
                  `}</style>
                  <div className="tp-header">
                    <div className="tp-title-group">
                      <span className="tp-title-icon" aria-hidden="true"><ClipboardCheck size={22} /></span>
                      <h1 className="tp-title">Attendance</h1>
                    </div>
                    <div className="tp-actions no-print">
                      <span className="tp-chip">
                        <Users size={16} aria-hidden="true" />
                        {attSubtitle}
                      </span>
                      <label className="tp-date-picker">
                        <CalendarDays size={16} aria-hidden="true" />
                        <input
                          type="date"
                          aria-label="Selected date"
                          value={recordDate}
                          onChange={(e) => { setRecordDate(e.target.value); closeClass(); }}
                        />
                      </label>
                      {attendanceView === "calendar" && attendanceBulkLoading && (
                        <span style={{ fontSize: "13px", color: TP.secondaryText, display: "inline-flex", alignItems: "center" }}>
                          <span className="lc-spinner"></span>Loading…
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="tp-card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "18px" }}>
                      <div className="tp-segment" role="group" aria-label="Attendance view" style={{ margin: 0 }}>
                        <button
                          type="button"
                          aria-pressed={attendanceView === "day"}
                          className={`tp-segment-btn ${attendanceView === "day" ? "tp-segment-btn-active" : ""}`}
                          onClick={() => { setAttendanceView("day"); closeClass(); }}
                        >
                          Day view
                        </button>
                        <button
                          type="button"
                          aria-pressed={attendanceView === "calendar"}
                          className={`tp-segment-btn ${attendanceView === "calendar" ? "tp-segment-btn-active" : ""}`}
                          onClick={() => setAttendanceView("calendar")}
                        >
                          Calendar view
                        </button>
                        <button
                          type="button"
                          aria-pressed={attendanceView === "unmarked"}
                          className={`tp-segment-btn ${attendanceView === "unmarked" ? "tp-segment-btn-active" : ""}`}
                          onClick={() => { setAttendanceView("unmarked"); closeClass(); }}
                        >
                          Unmarked Attendance
                          {attendanceBulkLoaded && teacherUnmarked.length > 0 && <span className="tp-alert-badge">{teacherUnmarked.length}</span>}
                        </button>
                      </div>
                      {attendanceView === "day" && !openClassName && daySessions.length > 0 && (
                        <button type="button" className="lc-btn no-print" onClick={() => startBulkReschedule({ type: "day" })}>
                          <CalendarDays size={14} aria-hidden="true" style={{ marginRight: "6px", verticalAlign: "-2px" }} />
                          Reschedule Whole Day
                        </button>
                      )}
                    </div>

                  {attendanceView === "day" && (
                    <>
                      {!openClassName ? (
                        <>
                          <div className="tp-subtext">
                            Showing classes scheduled for {selectedWeekday}, {recordDate}
                          </div>

                          {attReschedule && attReschedule.type === "day" && rescheduleBox}

                          {dayGroups.length === 0 ? (
                            <div style={{ color: TP.secondaryText, fontSize: "14px" }}>No classes scheduled for you on this day.</div>
                          ) : (
                            <div>
                              {dayGroups.map(({ className, entries }) => {
                                const code = classCode(className);
                                const badge = classBadgeStyle(code);
                                return (
                                  <button
                                    key={className}
                                    type="button"
                                    className="tp-accordion-row"
                                    onClick={() => openClass(className, entries)}
                                  >
                                    <ChevronRight size={18} className="tp-accordion-chevron" aria-hidden="true" />
                                    <span className="tp-code-badge" style={{ background: badge.bg, color: badge.color }}>{code}</span>
                                    <span className="tp-accordion-title">{className}</span>
                                    <span className="tp-count-badge">{entries.length} student{entries.length === 1 ? "" : "s"}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (() => {
                        if (!openGroup) return null;
                        const { className, entries } = openGroup;
                        const code = classCode(className);
                        const badge = classBadgeStyle(code);
                        const presentCount = entries.filter((r) => attDraft[r.studentId] === "present").length;
                        const absentCount = entries.filter((r) => attDraft[r.studentId] === "absent").length;
                        const timeLabel = entries.length > 0 ? `${fmtTime12(entries[0].startTime)} – ${fmtTime12(entries[0].endTime)}` : "";
                        return (
                          <>
                            <button type="button" className="lc-btn no-print" style={{ marginBottom: "14px" }} onClick={closeClass}>
                              <ChevronLeft size={14} aria-hidden="true" style={{ marginRight: "4px", verticalAlign: "-2px" }} />
                              All classes
                            </button>

                            <div className="lc-card" style={{ marginBottom: "18px" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <span className="tp-code-badge" style={{ background: badge.bg, color: badge.color }}>{code}</span>
                                  <div>
                                    <div style={{ fontWeight: 700, fontSize: "16px" }}>{className}</div>
                                    <div style={{ fontSize: "12px", color: C.a }}>{timeLabel} · {entries.length} student{entries.length === 1 ? "" : "s"}</div>
                                  </div>
                                </div>
                                <button type="button" className="lc-btn no-print" onClick={() => startBulkReschedule({ type: "class", className })}>
                                  <CalendarDays size={14} aria-hidden="true" style={{ marginRight: "6px", verticalAlign: "-2px" }} />
                                  Reschedule Whole Class
                                </button>
                              </div>

                              {attReschedule && attReschedule.type === "class" && attReschedule.className === className && rescheduleBox}

                              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
                                <span className="lc-badge lc-badge-paid" style={{ fontSize: "13px", padding: "6px 14px" }}>{presentCount} Present</span>
                                <span className="lc-badge lc-badge-pending" style={{ fontSize: "13px", padding: "6px 14px" }}>{absentCount} Absent</span>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                                <div style={{ fontSize: "13px", fontWeight: 600 }}>Mark attendance for each student</div>
                                <button
                                  type="button"
                                  className="lc-btn"
                                  style={{ fontSize: "12px", padding: "4px 10px" }}
                                  onClick={() => setAttDraft((prev) => {
                                    const next = { ...prev };
                                    entries.forEach((r) => { next[r.studentId] = "present"; });
                                    return next;
                                  })}
                                >
                                  Select all present
                                </button>
                              </div>
                              <div className="lc-table-wrap">
                                <table className="tp-att-table">
                                  <thead>
                                    <tr>
                                      <th>Student</th>
                                      <th className="tp-att-radio-col">Present</th>
                                      <th className="tp-att-radio-col">Absent</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {entries.map((r) => (
                                      <tr key={r.studentId}>
                                        <td>{r.studentName}</td>
                                        <td className="tp-att-radio-col">
                                          <input
                                            type="radio"
                                            className="tp-att-radio"
                                            style={{ accentColor: C.d }}
                                            aria-label={`${r.studentName} present`}
                                            checked={attDraft[r.studentId] === "present"}
                                            onChange={() => setAttDraft((prev) => ({ ...prev, [r.studentId]: "present" }))}
                                          />
                                        </td>
                                        <td className="tp-att-radio-col">
                                          <input
                                            type="radio"
                                            className="tp-att-radio"
                                            style={{ accentColor: C.b }}
                                            aria-label={`${r.studentName} absent`}
                                            checked={attDraft[r.studentId] === "absent"}
                                            onChange={() => setAttDraft((prev) => ({ ...prev, [r.studentId]: "absent" }))}
                                          />
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px" }}>
                                <button type="button" className="lc-btn lc-btn-primary" onClick={saveDraft}>Save Attendance</button>
                                <button type="button" className="lc-btn" onClick={resetDraft}>Reset</button>
                                <button type="button" className="lc-btn" onClick={closeClass}>Cancel</button>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </>
                  )}

                  {attendanceView === "unmarked" && (
                    <>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
                        <div className="tp-subtext" style={{ marginBottom: 0 }}>
                          Classes with no attendance recorded yet. This is a standing reminder — an entry only leaves once you actually mark that class.
                        </div>
                        {attendanceBulkLoaded && teacherUnmarked.length > 0 && (
                          <button
                            type="button"
                            className="lc-btn no-print"
                            style={{ padding: "6px 8px", flexShrink: 0 }}
                            title="Clear all"
                            aria-label="Clear all unmarked reminders"
                            disabled={unmarkedDismissingKey === "__all__"}
                            onClick={() => dismissAllUnmarked(teacherUnmarked)}
                          >
                            <X size={16} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      {!attendanceBulkLoaded ? (
                        <div style={{ color: TP.secondaryText, fontSize: "14px" }}>Loading…</div>
                      ) : teacherUnmarked.length === 0 ? (
                        <div className="lc-card">
                          <div className="lc-celebrate" style={{ color: C.d, fontSize: "14px" }}><PartyPopper size={16} aria-hidden="true" />Nothing unmarked — you're all caught up.</div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {teacherUnmarked.map((g) => {
                            const key = `${g.date}|${g.className}`;
                            return (
                              <div key={key} className="tp-accordion-row" style={{ cursor: "default" }}>
                                <button
                                  type="button"
                                  onClick={() => jumpToUnmarked(g.date, g.className, g.entries)}
                                  style={{ flex: 1, display: "flex", alignItems: "center", gap: "14px", background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", textAlign: "left" }}
                                >
                                  <AlertTriangle size={18} color={C.b} aria-hidden="true" />
                                  <span className="tp-accordion-title">{weekdayAbbrev(g.date)}, {g.date} — {g.className}</span>
                                  <span className="tp-count-badge">{g.entries.length} student{g.entries.length === 1 ? "" : "s"}</span>
                                </button>
                                <button
                                  type="button"
                                  className="lc-btn"
                                  style={{ fontSize: "12px", padding: "6px 12px", flexShrink: 0 }}
                                  disabled={unmarkedDismissingKey === key}
                                  onClick={() => dismissUnmarked(g.date, g.className)}
                                >
                                  {unmarkedDismissingKey === key ? "…" : "Clear"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {attendanceView === "calendar" && (
                  <>
                  <div style={{ fontSize: "13px", color: C.a, marginBottom: "14px" }}>
                    Pick a class, then a student, then tap a day to mark it.
                  </div>

                  <div className="lc-card" style={{ marginBottom: "18px" }}>
                    <label style={{ fontSize: "12px", color: C.a, display: "block", marginBottom: "6px" }}>Class</label>
                    <SearchableSelect
                      style={{ maxWidth: "320px" }}
                      value={attClassId}
                      onChange={(val) => { setAttClassId(val); setAttStudentId(""); closeDetail(); }}
                      placeholder="Select a class…"
                      options={classes.filter((c) => c.teacherId === loggedInTeacherId).map((c) => ({ value: c.id, label: c.name }))}
                    />
                  </div>

                  {!attClassId ? (
                    <div className="lc-card">
                      <div style={{ color: C.a, fontSize: "14px" }}>Choose a class above to see its students.</div>
                    </div>
                  ) : !attStudentId ? (
                    <div className="lc-card">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                        <span style={{ fontSize: "12px", color: C.a }}>Mark a day for the whole class, or tap a student to open their calendar</span>
                        <button className="lc-btn" style={{ fontSize: "12px", padding: "4px 10px" }} onClick={() => setAttClassId("")}>Change class</button>
                      </div>
                      {(() => {
                        const classStudents = students.filter((s) => s.classId === attClassId && s.teacherId === loggedInTeacherId);
                        if (classStudents.length === 0) {
                          return <div style={{ color: C.a, fontSize: "14px" }}>No students assigned to this class yet.</div>;
                        }
                        const classStudentIds = new Set(classStudents.map((s) => s.id));
                        const sessionsToday = getSessionsForDate(selectedDate).filter((r) => classStudentIds.has(r.studentId));
                        const sessionStudentIds = sessionsToday.map((r) => r.studentId);
                        const holiday = holidayFor(selectedDate);
                        return (
                          <>
                            <div style={{ background: C.g, border: "1px solid #D3E9F7", borderRadius: "10px", padding: "12px", marginBottom: "14px" }}>
                              <label style={{ fontSize: "12px", color: C.a, display: "block", marginBottom: "6px" }}>Date</label>
                              <input className="lc-input" style={{ maxWidth: "180px", marginBottom: "10px" }} type="date" value={selectedDate} onChange={(e) => setRecordDate(e.target.value)} />
                              {holiday && (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: C.j, marginBottom: "10px" }}>
                                  <Sun size={14} aria-hidden="true" />{holiday.label} — marked as a holiday
                                </div>
                              )}
                              {sessionStudentIds.length === 0 ? (
                                <div style={{ fontSize: "13px", color: C.a }}>No one in this class has a scheduled session on this date.</div>
                              ) : (
                                <>
                                  <div style={{ fontSize: "12px", color: C.a, marginBottom: "8px" }}>
                                    Mark all {sessionStudentIds.length} student{sessionStudentIds.length === 1 ? "" : "s"} with a class today:
                                  </div>
                                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    <button className="lc-btn" onClick={() => setStatusBulk(sessionStudentIds, "present")}>Mark all present</button>
                                    <button className="lc-btn" onClick={() => setStatusBulk(sessionStudentIds, "absent")}>Mark all absent</button>
                                  </div>
                                </>
                              )}
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {classStudents.map((s) => {
                                const ds = getStudentDayStatus(selectedDate, s.id);
                                const rec = dayRecords[s.id] || {};
                                const hasSessionToday = !!ds;
                                return (
                                  <div key={s.id} className="lc-card" style={{ padding: "12px 14px" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", cursor: "pointer" }} onClick={() => { setAttStudentId(s.id); closeDetail(); }}>
                                        <span style={{ fontWeight: 600 }}>{s.name}</span>
                                        {rec.status && statusBadge(rec.status)}
                                        {!rec.status && hasSessionToday && holiday && <span className="lc-badge" style={{ background: C.l, color: C.j }}>Holiday</span>}
                                        {!rec.status && hasSessionToday && !holiday && <span className="lc-badge lc-badge-neutral">Not marked</span>}
                                        {!hasSessionToday && <span className="lc-badge lc-badge-neutral">No class today</span>}
                                      </div>
                                      <ChevronRight size={16} color={C.a} style={{ cursor: "pointer" }} onClick={() => { setAttStudentId(s.id); closeDetail(); }} />
                                    </div>
                                    {hasSessionToday && (
                                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                                        <button
                                          className="lc-btn"
                                          style={{ padding: "6px 10px", fontSize: "12px", ...(rec.status === "present" ? { background: C.i, borderColor: C.d, color: C.d } : {}) }}
                                          onClick={() => setStatus(s.id, "present")}
                                        >
                                          Present
                                        </button>
                                        <button
                                          className="lc-btn"
                                          style={{ padding: "6px 10px", fontSize: "12px", ...(rec.status === "absent" ? { background: C.h, borderColor: C.b, color: C.b } : {}) }}
                                          onClick={() => setStatus(s.id, "absent")}
                                        >
                                          Absent
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <>
                  <div className="lc-card" style={{ marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: "13px" }}>
                      <span style={{ color: C.a }}>Class: </span>{classes.find((c) => c.id === attClassId)?.name || ""}
                      <span style={{ color: C.a }}> · Student: </span><strong>{selectedStudent ? selectedStudent.name : ""}</strong>
                    </div>
                    <button className="lc-btn" onClick={() => { setAttStudentId(""); closeDetail(); }}>Change student</button>
                  </div>
                    <div className="lc-card">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                        <button className="lc-btn" onClick={goPrevMonth}>←</button>
                        <div style={{ fontWeight: 600, fontSize: "15px", textAlign: "center" }}>
                          {MONTH_NAMES[attCalendarMonth0]} {attCalendarYear}
                          <div style={{ fontSize: "12px", fontWeight: 400, color: C.a }}>{selectedStudent ? selectedStudent.name : ""}</div>
                        </div>
                        <button className="lc-btn" onClick={goNextMonth}>→</button>
                      </div>
                      <div style={{ textAlign: "center", marginBottom: "10px" }}>
                        <span className="lc-btn" style={{ fontSize: "12px", padding: "4px 10px" }} onClick={goThisMonth}>Today</span>
                      </div>
                      {monthAttendanceStats && monthAttendanceStats.total > 0 && (() => {
                        const rate = monthAttendanceStats.rate;
                        const rateColor = rate >= 90 ? C.d : rate >= 75 ? C.u : C.b;
                        const rateBg = rate >= 90 ? C.i : rate >= 75 ? C.t : C.h;
                        return (
                          <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: rateColor, background: rateBg, borderRadius: "999px", padding: "5px 14px" }}>
                              <CheckCheck size={14} aria-hidden="true" />
                              {rate}% attendance this month
                              <span style={{ fontWeight: 400, opacity: 0.85 }}>({monthAttendanceStats.present}/{monthAttendanceStats.total})</span>
                            </span>
                          </div>
                        );
                      })()}
                      {monthReportRows.length > 0 && (
                        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }} className="no-print">
                          <button
                            className="lc-btn"
                            style={{ fontSize: "12px", padding: "6px 12px" }}
                            onClick={() => downloadRowsAsImage("Attendance Report", monthReportSubtitle, monthReportColumns, monthReportRows, `${monthReportFilenameBase}.png`)}
                          >
                            Download report (image)
                          </button>
                          <button
                            className="lc-btn"
                            style={{ fontSize: "12px", padding: "6px 12px" }}
                            onClick={() => downloadRowsAsPDF("Attendance Report", monthReportSubtitle, monthReportColumns, monthReportRows, `${monthReportFilenameBase}.pdf`)}
                          >
                            Download report (PDF)
                          </button>
                        </div>
                      )}
                      <div className="lc-cal-grid" style={{ marginBottom: "6px" }}>
                        {DAY_ORDER.map((d) => <div key={d} className="lc-cal-dow">{d}</div>)}
                      </div>
                      <div className="lc-cal-grid">
                        {cellsFlat.map((cell, idx) => {
                          const dateStr = fmtDateStr(cell.date);
                          const dayStatus = cell.inMonth && attStudentId ? getStudentDayStatus(dateStr, attStudentId) : null;
                          const isToday = dateStr === todayStr;
                          const isSelected = attDetailOpen && dateStr === selectedDate;

                          let StatusIcon = null, theme = null, statusKey = null;
                          if (dayStatus) {
                            if (dayStatus.status === "present") { statusKey = "present"; StatusIcon = CheckCircle2; }
                            else if (dayStatus.status === "absent") { statusKey = "absent"; StatusIcon = XCircle; }
                            else if (dayStatus.status === "cancelled") { statusKey = "cancelled"; StatusIcon = Ban; }
                            else if (dayStatus.status === "rescheduled") { statusKey = "moved"; StatusIcon = Repeat2; }
                            else if (dayStatus.movedHere) { statusKey = "movedHere"; StatusIcon = Repeat2; }
                            else if (isHoliday(dateStr)) { statusKey = "holiday"; StatusIcon = Sun; }
                            else { statusKey = "pending"; StatusIcon = Clock; }
                            theme = ATT_STATUS_THEME[statusKey];
                          }

                          const cellStyle = {};
                          if (theme) { cellStyle.background = theme.bg; cellStyle.borderColor = theme.border; }
                          if (isSelected) { cellStyle.boxShadow = `0 0 0 2px ${theme ? theme.ring : C.e} inset`; cellStyle.borderColor = theme ? theme.ring : C.e; }
                          else if (isToday) { cellStyle.boxShadow = `0 0 0 1.5px ${theme ? theme.ring : C.e} inset`; }

                          return (
                            <div
                              key={idx}
                              className={`lc-cal-cell ${!cell.inMonth ? "lc-cal-cell-out" : ""} ${statusKey === "pending" ? "lc-cal-cell-pending" : ""}`}
                              style={cellStyle}
                              onClick={() => { if (!cell.inMonth) return; setRecordDate(dateStr); setAttDetailOpen(true); }}
                            >
                              <div className="lc-cal-daynum" style={theme ? { color: theme.color } : undefined}>{cell.date.getDate()}</div>
                              {dayStatus && (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
                                  <StatusIcon size={16} color={theme.color} aria-hidden="true" />
                                  <span style={{ fontSize: "9px", fontWeight: 700, color: theme.color, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{theme.label}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "14px" }}>
                        {Object.entries({ present: CheckCircle2, absent: XCircle, moved: Repeat2, pending: Clock, holiday: Sun }).map(([key, Icon]) => {
                          const t = ATT_STATUS_THEME[key];
                          return (
                            <span
                              key={key}
                              style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", color: t.color, background: t.bg, border: `1px solid ${t.border}`, borderRadius: "999px", padding: "3px 9px 3px 7px" }}
                            >
                              <Icon size={12} aria-hidden="true" />{t.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    </>
                  )}

                  {attDetailOpen && attStudentId && (
                    <div className="lc-modal-backdrop" onClick={closeDetail}>
                      <div className="lc-modal-sheet" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <div style={{ fontWeight: 600 }}>{selectedWeekday}, {selectedDate}</div>
                          <button className="lc-btn" style={{ padding: "6px 10px" }} onClick={closeDetail} aria-label="Close"><X size={16} /></button>
                        </div>
                        <div style={{ fontSize: "12px", color: C.a, marginBottom: "14px" }}>{selectedStudent ? selectedStudent.name : ""}</div>

                        {modalSessions.length === 0 ? (
                          <div style={{ color: C.a, fontSize: "14px" }}>No class for this student on this day.</div>
                        ) : modalSessions.map((r) => {
                          const rec = dayRecords[r.studentId] || {};
                          const isMovedAway = rec.status === "rescheduled";
                          return (
                            <div key={r.studentId + r.startTime}>
                              <div style={{ fontSize: "13px", color: C.a, marginBottom: "12px" }}>
                                {fmtTime12(r.startTime)} – {fmtTime12(r.endTime)} · {r.className}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                                {statusBadge(rec.status)}
                                {isMovedAway && <span className="lc-badge lc-badge-move">Moved to {rec.rescheduledTo}</span>}
                                {r.rescheduledFromDate && <span className="lc-badge lc-badge-move">Moved from {r.rescheduledFromDate}</span>}
                                {!rec.status && !r.rescheduledFromDate && isHoliday(selectedDate) && (
                                  <span className="lc-badge" style={{ background: C.l, color: C.j }}>Holiday{holidayFor(selectedDate) ? `: ${holidayFor(selectedDate).label}` : ""}</span>
                                )}
                                {!rec.status && !r.rescheduledFromDate && !isHoliday(selectedDate) && <span className="lc-badge lc-badge-neutral">Not marked yet</span>}
                              </div>

                              {isMovedAway ? (
                                <button className="lc-btn" style={{ width: "100%" }} onClick={() => undoReschedule(r.studentId)}>Undo move</button>
                              ) : (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                  <button
                                    className="lc-btn lc-btn-tap"
                                    style={rec.status === "present" ? { background: C.i, borderColor: C.d, color: C.d } : {}}
                                    onClick={() => setStatus(r.studentId, "present")}
                                  >
                                    Present
                                  </button>
                                  <button
                                    className="lc-btn lc-btn-tap"
                                    style={rec.status === "absent" ? { background: C.h, borderColor: C.b, color: C.b } : {}}
                                    onClick={() => setStatus(r.studentId, "absent")}
                                  >
                                    Absent
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  </>
                  )}
                  </div>
                </div>
              );
            })()}

            {section === "exams" && (() => {
              const teacherLabel = teacherName(loggedInTeacherId);
              const viewingExam = viewExamId ? examReports.find((e) => e.id === viewExamId) : null;

              const resultBadge = (result) => (
                <span
                  style={{
                    display: "inline-block", fontSize: "12px", fontWeight: 700, padding: "4px 12px", borderRadius: "999px",
                    background: result === "pass" ? C.i : C.h, color: result === "pass" ? C.d : C.b,
                  }}
                >
                  {result === "pass" ? "Pass" : "Not Passed"}
                </span>
              );

              const filenameFor = (exam) => `${exam.studentName.replace(/\s+/g, "_")}_${exam.examDate}_hifz_exam`;

              return (
                <div className="tp-exams-page">
                  <style>{`
                    .tp-exams-page { position: relative; margin: -28px -32px; padding: 32px; min-height: calc(100% + 56px); overflow: hidden; box-sizing: border-box; }
                    @media (max-width: 820px) {
                      .tp-exams-page { margin: -18px -16px; padding: 24px; min-height: calc(100% + 36px); }
                    }
                    @media (max-width: 640px) {
                      .tp-exams-page { padding: 20px; }
                    }
                    .tp-exam-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                    .tp-exam-table th { text-align: left; color: #5B6B79; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; padding: 8px; border-bottom: 1px solid #D3E9F7; white-space: nowrap; }
                    .tp-exam-table td { padding: 6px 8px; border-bottom: 1px solid #E7F2FA; vertical-align: middle; min-width: 110px; }
                    .tp-decision-btn { border: 2px solid #D3E9F7; border-radius: 14px; padding: 18px; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 16px; font-weight: 700; cursor: pointer; background: #FFFFFF; color: #1B2733; transition: all 0.15s ease; }
                    .tp-decision-btn:hover { border-color: #8FC4E8; }
                    .tp-decision-btn-pass-active { border-color: #5FA579; background: ${C.i}; color: ${C.d}; }
                    .tp-decision-btn-fail-active { border-color: #D9825F; background: ${C.h}; color: ${C.b}; }
                  `}</style>

                  <div className="tp-header">
                    <div className="tp-title-group">
                      <span className="tp-title-icon" aria-hidden="true"><FileText size={22} /></span>
                      <h1 className="tp-title">Exams</h1>
                    </div>
                    <div className="tp-actions no-print">
                      <span className="tp-chip">
                        <Users size={16} aria-hidden="true" />
                        {teacherLabel}
                      </span>
                    </div>
                  </div>

                  <div className="tp-card">
                    <div className="tp-segment" role="group" aria-label="Exams view">
                      <button
                        type="button"
                        aria-pressed={examView === "details"}
                        className={`tp-segment-btn ${examView === "details" ? "tp-segment-btn-active" : ""}`}
                        onClick={() => setExamView("details")}
                      >
                        Exam Details
                      </button>
                      <button
                        type="button"
                        aria-pressed={examView === "history"}
                        className={`tp-segment-btn ${examView === "history" ? "tp-segment-btn-active" : ""}`}
                        onClick={() => setExamView("history")}
                      >
                        Exam Report History
                      </button>
                    </div>

                    {examView === "details" ? (
                      <div className="lc-card">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
                          <div style={{ fontSize: "18px", fontWeight: 700 }}>{editingExamId ? "Edit Hifz Exam" : "Create Hifz Exam"}</div>
                          {editingExamId && (
                            <button type="button" className="lc-btn" onClick={resetExamForm}>Cancel edit</button>
                          )}
                        </div>

                        <div className="lc-form-grid" style={{ marginBottom: "20px" }}>
                          <div>
                            <label style={{ fontSize: "12px", color: C.a, display: "block", marginBottom: "6px" }}>Student name</label>
                            <input className="lc-input" value={examStudentName} onChange={(e) => setExamStudentName(e.target.value)} placeholder="Enter student name" />
                          </div>
                          <div>
                            <label style={{ fontSize: "12px", color: C.a, display: "block", marginBottom: "6px" }}>Exam date</label>
                            <input className="lc-input" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
                          </div>
                        </div>

                        <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>Hifz Questions</div>
                        <div className="lc-table-wrap">
                          <table className="tp-exam-table">
                            <thead>
                              <tr>
                                <th>Question</th>
                                <th>Surah</th>
                                <th>Ayah</th>
                                <th>Question Type</th>
                                <th>Result</th>
                                <th>Mistake / Remark</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {examQuestions.map((q, i) => {
                                const remarkRequired = q.result === "incorrect";
                                const remarkMissing = remarkRequired && !q.remark.trim();
                                return (
                                  <tr key={q.id}>
                                    <td>{i + 1}</td>
                                    <td style={{ minWidth: "170px" }}>
                                      <SearchableSelect
                                        value={q.surah}
                                        onChange={(val) => updateExamQuestion(q.id, "surah", val)}
                                        placeholder="Select surah"
                                        options={SURAH_OPTIONS_EN}
                                      />
                                    </td>
                                    <td style={{ minWidth: "90px" }}>
                                      <input className="lc-input" type="number" min="1" value={q.ayah} onChange={(e) => updateExamQuestion(q.id, "ayah", e.target.value)} placeholder="Ayah" />
                                    </td>
                                    <td style={{ minWidth: "170px" }}>
                                      <select className="lc-select" value={q.questionType} onChange={(e) => updateExamQuestion(q.id, "questionType", e.target.value)}>
                                        {EXAM_QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                      </select>
                                    </td>
                                    <td style={{ minWidth: "130px" }}>
                                      <select
                                        className="lc-select"
                                        style={{ fontWeight: 700, color: q.result === "correct" ? C.d : C.b, background: q.result === "correct" ? C.i : C.h, border: "none" }}
                                        value={q.result}
                                        onChange={(e) => updateExamQuestion(q.id, "result", e.target.value)}
                                      >
                                        <option value="correct">Correct</option>
                                        <option value="incorrect">Incorrect</option>
                                      </select>
                                    </td>
                                    <td style={{ minWidth: "200px" }}>
                                      <input
                                        className="lc-input"
                                        value={q.remark}
                                        onChange={(e) => updateExamQuestion(q.id, "remark", e.target.value)}
                                        placeholder={remarkRequired ? "Required — describe the mistake" : "Optional remark"}
                                        style={remarkMissing ? { borderColor: C.b, background: C.h } : {}}
                                      />
                                    </td>
                                    <td>
                                      {examQuestions.length > 1 && (
                                        <button type="button" className="lc-btn" style={{ padding: "6px 8px" }} onClick={() => removeExamQuestion(q.id)} aria-label="Remove question">
                                          <X size={14} aria-hidden="true" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <button type="button" className="lc-btn" style={{ marginTop: "14px", color: TP.blue, fontWeight: 600 }} onClick={addExamQuestion}>
                          <Plus size={14} aria-hidden="true" style={{ marginRight: "6px", verticalAlign: "-2px" }} />
                          Add question
                        </button>

                        <div style={{ marginTop: "24px" }}>
                          <label style={{ fontSize: "14px", fontWeight: 700, display: "block", marginBottom: "8px" }}>Recitation comments</label>
                          <textarea
                            className="lc-input"
                            rows={4}
                            style={{ resize: "vertical" }}
                            value={examComments}
                            onChange={(e) => setExamComments(e.target.value)}
                            placeholder="Recitation quality, fluency, pronunciation, memorization accuracy, strengths, areas requiring improvement…"
                          />
                        </div>

                        <div style={{ marginTop: "24px", background: C.g, border: "1px solid #D3E9F7", borderRadius: "14px", padding: "18px" }}>
                          <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>Final decision</div>
                          <div style={{ fontSize: "13px", color: C.a, marginBottom: "14px" }}>Please select the final result for this exam (required).</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <button
                              type="button"
                              className={`tp-decision-btn ${examFinalResult === "pass" ? "tp-decision-btn-pass-active" : ""}`}
                              onClick={() => setExamFinalResult("pass")}
                            >
                              <CheckCircle2 size={20} aria-hidden="true" />
                              Pass
                            </button>
                            <button
                              type="button"
                              className={`tp-decision-btn ${examFinalResult === "not_passed" ? "tp-decision-btn-fail-active" : ""}`}
                              onClick={() => setExamFinalResult("not_passed")}
                            >
                              <XCircle size={20} aria-hidden="true" />
                              Not Passed
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="tp-btn-gradient"
                          style={{ marginTop: "22px" }}
                          disabled={examSubmitting}
                          onClick={submitExam}
                        >
                          {examSubmitting ? <span className="lc-spinner"></span> : <FileText size={16} aria-hidden="true" />}
                          {examSubmitting ? "Saving…" : editingExamId ? "Update exam result" : "Submit exam result"}
                        </button>
                      </div>
                    ) : (
                      <div>
                        {examReportsLoading ? (
                          <div className="lc-loading-row"><span className="lc-spinner"></span>Loading exam reports…</div>
                        ) : examReports.length === 0 ? (
                          <div className="lc-empty-state">
                            <FileText size={32} aria-hidden="true" />
                            <div>No exam reports submitted yet.</div>
                          </div>
                        ) : (
                          <div className="lc-table-wrap">
                            <table className="lc-table">
                              <thead>
                                <tr>
                                  <th>Student</th>
                                  <th>Exam date</th>
                                  <th>Teacher</th>
                                  <th>Final result</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {examReports.map((exam) => (
                                  <tr key={exam.id}>
                                    <td style={{ fontWeight: 600 }}>{exam.studentName}</td>
                                    <td>{exam.examDate}</td>
                                    <td>{teacherLabel}</td>
                                    <td>{resultBadge(exam.finalResult)}</td>
                                    <td>
                                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                        <button type="button" className="lc-btn" onClick={() => setViewExamId(exam.id)}>
                                          <FileText size={14} aria-hidden="true" style={{ marginRight: "4px", verticalAlign: "-2px" }} />
                                          View Report
                                        </button>
                                        <button type="button" className="lc-btn" onClick={() => downloadExamReportAsPDF(exam, teacherLabel, `${filenameFor(exam)}.pdf`)}>
                                          Download PDF
                                        </button>
                                        <button type="button" className="lc-btn" onClick={() => startEditExam(exam)}>
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          className="lc-btn lc-btn-danger"
                                          disabled={examDeletingId === exam.id}
                                          onClick={() => deleteExam(exam.id)}
                                        >
                                          {examDeletingId === exam.id ? "Deleting…" : "Delete"}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {viewingExam && (
                    <div className="lc-modal-backdrop" onClick={() => setViewExamId(null)}>
                      <div className="lc-modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "640px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <div style={{ fontWeight: 700, fontSize: "16px" }}>{viewingExam.studentName}</div>
                          <button className="lc-btn" style={{ padding: "6px 10px" }} onClick={() => setViewExamId(null)} aria-label="Close"><X size={16} /></button>
                        </div>
                        <div style={{ fontSize: "13px", color: C.a, marginBottom: "10px" }}>
                          {viewingExam.examDate} · {teacherLabel}
                        </div>
                        <div style={{ marginBottom: "16px" }}>{resultBadge(viewingExam.finalResult)}</div>

                        <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Questions</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                          {viewingExam.questions.length === 0 ? (
                            <div style={{ fontSize: "13px", color: C.a }}>No questions recorded.</div>
                          ) : viewingExam.questions.map((q, i) => (
                            <div key={i} className="lc-card" style={{ padding: "10px 14px", margin: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
                                <span style={{ fontWeight: 600, fontSize: "13px" }}>Q{i + 1} · {q.questionType || "—"}</span>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: q.result === "correct" ? C.d : C.b }}>
                                  {q.result === "correct" ? "Correct" : "Incorrect"}
                                </span>
                              </div>
                              <div style={{ fontSize: "12px", color: C.a }}>
                                {(q.surah ?? q.startSurah) || "—"}{(q.ayah ?? q.startAyah) ? `:${q.ayah ?? q.startAyah}` : ""}
                              </div>
                              {q.remark && <div style={{ fontSize: "13px", marginTop: "4px" }}>{q.remark}</div>}
                            </div>
                          ))}
                        </div>

                        <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>Recitation comments</div>
                        <div style={{ fontSize: "13px", color: viewingExam.comments ? C.w : C.a, marginBottom: "18px", whiteSpace: "pre-wrap" }}>
                          {viewingExam.comments || "No comments recorded."}
                        </div>

                        <button
                          type="button"
                          className="lc-btn lc-btn-primary"
                          style={{ width: "100%" }}
                          onClick={() => downloadExamReportAsPDF(viewingExam, teacherLabel, `${filenameFor(viewingExam)}.pdf`)}
                        >
                          Download PDF
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </TeacherPortalLayout>
      ) : (
      <AdminPortalLayout
        activeSection={section}
        navItems={[
          { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, onClick: () => setSection("dashboard") },
          { key: "classes", label: "Classes", icon: Layers, onClick: () => { setSection("classes"); setClassesView("classes"); } },
          { key: "teachers", label: "Teachers", icon: GraduationCap, onClick: () => setSection("teachers") },
          { key: "attendance", label: "Attendance", icon: ClipboardCheck, onClick: () => { setSection("attendance"); setAdminAttendanceView("records"); } },
          { key: "exams", label: "Exams", icon: FileText, onClick: () => setSection("exams") },
          { key: "timetable", label: "Timetable", icon: CalendarDays, onClick: () => setSection("timetable") },
          { key: "finance", label: "Finance", icon: Wallet, onClick: () => setSection("finance") },
          { key: "data", label: "Data", icon: Trash2, onClick: () => setSection("data") },
        ]}
        portalLabel="Admin Portal"
        displayName="Admin"
        roleLabel="Administrator"
        onTeacherLogin={PORTAL ? undefined : () => { setLoginEmail(""); setLoginPassword(""); setLoginError(""); setAccountType("teacher"); setAuthView("login"); }}
        onLogout={() => {
          setIsAdminAuthenticated(false); setAuthView("login"); setAdminEmailInput(""); setAdminPasswordInput("");
          setRole("admin"); setAccountType("admin");
        }}
      >
        <div className="lc-main" key={`admin-${section}`}>
          {loading ? (
            <div className="lc-loading-row"><span className="lc-spinner"></span>Loading your data…</div>
          ) : loadError ? (
            <div style={{ color: C.b, fontSize: "14px" }}>{loadError}</div>
          ) : (
            <>
              {saveError && <div style={{ color: C.b, fontSize: "13px", marginBottom: "14px" }}>{saveError}</div>}

              {/* ---------------- DASHBOARD (OVERVIEW) ---------------- */}
              {section === "dashboard" && role === "admin" && (
                <div className="tp-dashboard-page">
                  <style>{`
                    .tp-dashboard-page { position: relative; margin: -28px -32px; padding: 32px; min-height: calc(100% + 56px); overflow: hidden; box-sizing: border-box; }
                    @media (max-width: 820px) {
                      .tp-dashboard-page { margin: -18px -16px; padding: 24px; min-height: calc(100% + 36px); }
                    }
                    @media (max-width: 640px) {
                      .tp-dashboard-page { padding: 20px; }
                    }
                  `}</style>
                  <div className="tp-header">
                    <div className="tp-title-group">
                      <span className="tp-title-icon" aria-hidden="true"><LayoutDashboard size={22} /></span>
                      <h1 className="tp-title">Overview</h1>
                    </div>
                  </div>
                  <div className="tp-subtext" style={{ marginTop: "-14px" }}>Aflaah Quran Class at a glance</div>

                  <div className="lc-grid-3">
                    <div className="lc-stat-card">
                      <div className="lc-stat-icon" style={{ background: "#E6F1FB" }}>
                        <Users size={22} color={TP.navy} aria-hidden="true" />
                      </div>
                      <div>
                        <div className="lc-stat-value"><CountUp value={students.length} /></div>
                        <div className="lc-stat-label">Total students</div>
                      </div>
                    </div>
                    <div className="lc-stat-card">
                      <div className="lc-stat-icon" style={{ background: "#EAF3DE" }}>
                        <GraduationCap size={22} color="#3B6D11" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="lc-stat-value"><CountUp value={teachers.length} /></div>
                        <div className="lc-stat-label">Total teachers</div>
                      </div>
                    </div>
                    <div className="lc-stat-card">
                      <div className="lc-stat-icon" style={{ background: "#FAEEDA" }}>
                        <Wallet size={22} color="#854F0B" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="lc-stat-value"><CountUp value={totals.received} formatter={fmtMoney} /></div>
                        <div className="lc-stat-label">Revenue received — {monthLabel(month)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="tp-card" style={{ marginBottom: "18px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: TP.navy }}>This month — {monthLabel(month)}</div>
                      <div style={{ fontSize: "12px", color: TP.secondaryText, fontWeight: 600 }}>
                        {totals.expected > 0 ? Math.round((totals.received / totals.expected) * 100) : 0}% collected
                      </div>
                    </div>
                    <div className="lc-progress-track" style={{ marginBottom: "16px" }}>
                      <div
                        className="lc-progress-fill"
                        style={{ width: `${totals.expected > 0 ? Math.min(100, (totals.received / totals.expected) * 100) : 0}%` }}
                      />
                    </div>
                    <div className="lc-grid-3" style={{ marginBottom: 0 }}>
                      <div>
                        <div style={{ fontSize: "13px", color: TP.secondaryText, marginBottom: "4px" }}>Expected</div>
                        <div style={{ fontSize: "20px", fontWeight: 600, color: TP.navy }}>{fmtMoney(totals.expected)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "13px", color: TP.secondaryText, marginBottom: "4px" }}>Received</div>
                        <div style={{ fontSize: "20px", fontWeight: 600, color: C.d }}>{fmtMoney(totals.received)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "13px", color: TP.secondaryText, marginBottom: "4px" }}>Pending</div>
                        <div style={{ fontSize: "20px", fontWeight: 600, color: C.b }}>{fmtMoney(totals.pending)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="tp-card" style={{ marginBottom: "18px" }}>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: TP.navy, marginBottom: "12px" }}>
                      Monthly performance — last {DASHBOARD_MONTHLY_SPAN} months
                    </div>
                    <div className="tp-table-wrap"><table className="tp-list-table">
                      <thead><tr><th>Month</th><th>Expected</th><th>Received</th><th>Pending</th><th>Collected</th></tr></thead>
                      <tbody>
                        {monthlyPerformance.map((m) => (
                          <tr key={m.key}>
                            <td>{monthLabel(m.key)}</td>
                            <td>{fmtMoney(m.expected)}</td>
                            <td style={{ color: C.d }}>{fmtMoney(m.received)}</td>
                            <td style={{ color: C.b }}>{fmtMoney(m.pending)}</td>
                            <td>{m.expected > 0 ? Math.round((m.received / m.expected) * 100) : 0}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                  </div>

                  <div className="tp-card" style={{ marginBottom: "18px", ...(pendingStudents.length > 0 ? { borderColor: C.o, background: "#FEF8F6" } : {}) }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: pendingStudents.length > 0 ? "12px" : "0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {pendingStudents.length > 0 && <AlertTriangle size={17} color={C.b} aria-hidden="true" />}
                        <div style={{ fontSize: "15px", fontWeight: 600, color: TP.navy }}>
                          Overdue fees — {monthLabel(month)}
                          {pendingStudents.length > 0 && (
                            <span style={{ marginLeft: "8px", fontSize: "12px", fontWeight: 700, color: C.b, background: C.h, borderRadius: "999px", padding: "2px 9px" }}>
                              {pendingStudents.length}
                            </span>
                          )}
                        </div>
                      </div>
                      {pendingStudents.length > 0 && (
                        <button className="tp-btn-outline" style={{ height: "36px", minHeight: "36px", padding: "0 12px", fontSize: "12px" }} onClick={() => { setSection("finance"); setFinanceView("dashboard"); }}>
                          Go collect →
                        </button>
                      )}
                    </div>
                    {pendingStudents.length === 0 ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: C.d }}>
                        <PartyPopper size={16} aria-hidden="true" />Everyone's paid up for this month.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {pendingStudents.slice(0, 5).map((s) => (
                          <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px" }}>
                            <span>{s.name}</span>
                            <span style={{ color: C.b, fontWeight: 600 }}>{fmtMoney(s.fee)}</span>
                          </div>
                        ))}
                        {pendingStudents.length > 5 && (
                          <div style={{ fontSize: "12px", color: TP.secondaryText, marginTop: "2px" }}>
                            +{pendingStudents.length - 5} more — see all in Finance
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div className="lc-quick-link" onClick={() => { setSection("classes"); setClassesView("students"); }}>
                      <span style={{ fontSize: "14px", color: TP.navy }}>Manage students</span>
                      <ArrowRight size={16} color={TP.blue} aria-hidden="true" />
                    </div>
                    <div className="lc-quick-link" onClick={() => setSection("teachers")}>
                      <span style={{ fontSize: "14px", color: TP.navy }}>Manage teachers</span>
                      <ArrowRight size={16} color={TP.blue} aria-hidden="true" />
                    </div>
                    <div className="lc-quick-link" onClick={() => { setSection("classes"); setClassesView("classes"); }}>
                      <span style={{ fontSize: "14px", color: TP.navy }}>Manage classes</span>
                      <ArrowRight size={16} color={TP.blue} aria-hidden="true" />
                    </div>
                    <div className="lc-quick-link" onClick={() => { setSection("finance"); setFinanceView("dashboard"); }}>
                      <span style={{ fontSize: "14px", color: TP.navy }}>Open finance dashboard</span>
                      <ArrowRight size={16} color={TP.blue} aria-hidden="true" />
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- CLASSES & STUDENTS ---------------- */}
              {section === "classes" && (
                <div className="tp-classes-page">
                  <style>{`
                    .tp-classes-page { position: relative; margin: -28px -32px; padding: 32px; min-height: calc(100% + 56px); overflow: hidden; box-sizing: border-box; }
                    @media (max-width: 820px) {
                      .tp-classes-page { margin: -18px -16px; padding: 24px; min-height: calc(100% + 36px); }
                    }
                    @media (max-width: 640px) {
                      .tp-classes-page { padding: 20px; }
                    }
                  `}</style>
                  <div className="tp-header">
                    <div className="tp-title-group">
                      <span className="tp-title-icon" aria-hidden="true"><Layers size={22} /></span>
                      <h1 className="tp-title">{classesView === "students" ? "All students" : "Classes"}</h1>
                    </div>
                    <div className="tp-actions">
                      <button
                        type="button"
                        className="tp-btn-gradient"
                        onClick={() => (classesView === "students" ? (() => { resetStudentForm(); setShowStudentForm(true); })() : openNewClassForm())}
                      >
                        + {classesView === "students" ? "Add student" : "Add class"}
                      </button>
                    </div>
                  </div>

                  <div className="tp-segment" role="group" aria-label="Classes view">
                    <button
                      type="button"
                      aria-pressed={classesView === "classes"}
                      className={`tp-segment-btn ${classesView === "classes" ? "tp-segment-btn-active" : ""}`}
                      onClick={() => setClassesView("classes")}
                    >
                      Classes
                    </button>
                    <button
                      type="button"
                      aria-pressed={classesView === "students"}
                      className={`tp-segment-btn ${classesView === "students" ? "tp-segment-btn-active" : ""}`}
                      onClick={() => setClassesView("students")}
                    >
                      All students
                    </button>
                  </div>

                  {classesView === "students" ? (
                    <>
                      {showStudentForm && (
                        <div className="tp-card" style={{ marginBottom: "18px" }}>
                          <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px", color: TP.navy }}>
                            {editingStudentId ? "Edit student" : "New student"}
                          </div>
                          <div className="lc-form-grid">
                            <div>
                              <label style={{ fontSize: "12px", color: C.a }}>Name</label>
                              <input className="lc-input" value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Student name" />
                            </div>
                            <div>
                              <label style={{ fontSize: "12px", color: C.a }}>Class</label>
                              <SearchableSelect
                                value={sClassId}
                                onChange={setSClassId}
                                placeholder="No class"
                                options={classes.map((c) => ({ value: c.id, label: c.name }))}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: "12px", color: C.a }}>Monthly fee</label>
                              <input className="lc-input" type="number" min="0" step="0.01" value={sFee} onChange={(e) => setSFee(e.target.value)} placeholder="0.00" />
                            </div>
                            <div>
                              <label style={{ fontSize: "12px", color: C.a }}>Phone (optional)</label>
                              <input className="lc-input" value={sPhone} onChange={(e) => setSPhone(e.target.value)} placeholder="Contact number" />
                            </div>
                            <div>
                              <label style={{ fontSize: "12px", color: C.a }}>Teacher's share of fee (%)</label>
                              <input className="lc-input" type="number" min="0" max="100" step="1" value={sSharePercent} onChange={(e) => setSSharePercent(e.target.value)} placeholder="0" />
                            </div>
                            <div>
                              <label style={{ fontSize: "12px", color: C.a }}>Fee starts from</label>
                              <input className="lc-input" type="month" value={sJoinedMonth} onChange={(e) => setSJoinedMonth(e.target.value)} />
                            </div>
                          </div>
                          <div style={{ fontSize: "12px", color: C.a, marginBottom: "12px" }}>
                            The rest of the fee goes to the center. Use 0% for classes that are fully retained by the center.
                            {" "}Fee starts from {monthLabel(sJoinedMonth || month)} — no fee is shown as due before that month.
                          </div>

                          {classes.length === 0 ? (
                            <div className="lc-card" style={{ background: C.g, marginBottom: "4px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                              <span style={{ fontSize: "13px", color: C.a }}>No classes set up yet. Create one to assign a teacher and time automatically.</span>
                              <button className="lc-btn" onClick={() => { setClassesView("classes"); openNewClassForm(); }}>+ Add a class</button>
                            </div>
                          ) : sClassId ? (
                            (() => {
                              const cls = classes.find((c) => c.id === sClassId);
                              if (!cls) return null;
                              return (
                                <div className="lc-card" style={{ background: C.g, marginBottom: "4px" }}>
                                  <div style={{ fontSize: "13px", color: C.w }}>
                                    <strong>{teacherName(cls.teacherId)}</strong> · {formatSchedule({ days: cls.days, startTime: cls.startTime, endTime: cls.endTime })}
                                  </div>
                                  <div style={{ fontSize: "12px", color: C.a, marginTop: "2px" }}>
                                    Teacher and class time come from the class. Manage them under Classes.
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div style={{ fontSize: "12px", color: C.a, marginBottom: "4px" }}>
                              Choose a class above to automatically set this student's teacher and class time.
                            </div>
                          )}

                          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                            <button className="lc-btn lc-btn-primary" onClick={handleSaveStudent}>{editingStudentId ? "Save changes" : "Add student"}</button>
                            <button className="lc-btn" onClick={resetStudentForm}>Cancel</button>
                          </div>
                        </div>
                      )}

                      <div className="tp-card" style={{ marginBottom: "14px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                          <div className="lc-search-wrap">
                            <Search size={15} color={C.a} aria-hidden="true" />
                            <input
                              className="lc-input"
                              placeholder="Search students or classes…"
                              value={studentSearch}
                              onChange={(e) => setStudentSearch(e.target.value)}
                            />
                            {studentSearch && (
                              <button className="lc-search-clear" onClick={() => setStudentSearch("")} aria-label="Clear search"><X size={14} /></button>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <button className="lc-btn" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month">‹</button>
                            <div style={{ fontSize: "14px", fontWeight: 600, minWidth: "130px", textAlign: "center", color: TP.navy }}>{monthLabel(month)}</div>
                            <button className="lc-btn" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Next month">›</button>
                          </div>
                        </div>

                        {(() => {
                          const q = studentSearch.trim().toLowerCase();
                          const filteredStudents = q
                            ? students.filter((s) => s.name.toLowerCase().includes(q) || (s.className || "").toLowerCase().includes(q))
                            : students;
                          if (students.length === 0) {
                            return (
                              <div className="lc-empty-state">
                                <Users size={32} aria-hidden="true" />
                                <div>No students yet. Add your first one above.</div>
                              </div>
                            );
                          }
                          if (filteredStudents.length === 0) {
                            return (
                              <div className="lc-empty-state">
                                <Search size={32} aria-hidden="true" />
                                <div>No students match "{studentSearch}".</div>
                              </div>
                            );
                          }
                          return (
                          <div className="tp-table-wrap"><table className="tp-list-table">
                            <thead><tr><th>Name</th><th>Class</th><th>Teacher</th><th>Fee</th><th>Teacher %</th><th>Schedule</th><th>Portal</th><th>{monthLabel(month)}</th><th></th></tr></thead>
                            <tbody>
                              {filteredStudents.map((s) => {
                                const inMonth = isEnrolledInMonth(s, month);
                                const rec = monthData[s.id];
                                const paid = !!(rec && rec.paid);
                                return (
                                  <tr key={s.id}>
                                    <td>{s.name}</td>
                                    <td>{s.className || "—"}</td>
                                    <td>{teacherName(s.teacherId)}</td>
                                    <td>{fmtMoney(s.fee)}</td>
                                    <td>{s.teacherId ? `${s.sharePercent || 0}%` : "—"}</td>
                                    <td style={{ whiteSpace: "nowrap" }}>{formatSchedule(s.schedule)}</td>
                                    <td>
                                      {s.userId ? (
                                        <span className="lc-badge lc-badge-paid" style={{ cursor: "default" }}>Login linked</span>
                                      ) : (
                                        <span className="lc-badge lc-badge-pending" style={{ cursor: "default" }}>Not linked</span>
                                      )}
                                    </td>
                                    <td>
                                      {inMonth ? (
                                        <button
                                          className={`lc-badge ${paid ? "lc-badge-paid" : "lc-badge-pending"}`}
                                          onClick={() => (paid ? markUnpaid(s.id) : markPaid(s.id, s.fee))}
                                          title={paid ? "Click to mark unpaid" : "Click to mark paid"}
                                        >
                                          {paid ? "Paid" : "Pending"}
                                        </button>
                                      ) : (
                                        <span style={{ fontSize: "12px", color: TP.secondaryText }}>Not enrolled yet</span>
                                      )}
                                    </td>
                                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                      <button className="lc-btn" style={{ marginRight: "8px" }} onClick={() => startEditStudent(s)}>Edit</button>
                                      <button className="lc-btn lc-btn-danger" onClick={() => removeStudent(s.id)}>Remove</button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table></div>
                          );
                        })()}
                      </div>
                      <div className="tp-subtext" style={{ marginBottom: 0 }}>
                        Marking paid/pending here updates the same record shown in Finance.
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="tp-subtext">
                        Set up each class once with its code, teacher and schedule. When adding a student, just pick the class — no need to re-enter the teacher or times.
                      </div>

                      {showClassForm && (() => {
                        const liveDays = [...cDays].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
                        const liveClash = getClassClash(editingClassId, cTeacherId, liveDays, cStartTime, cEndTime);
                        return (
                        <div className="tp-card" style={{ marginBottom: "18px" }}>
                          <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px", color: TP.navy }}>
                            {editingClassId ? "Edit class" : "New class"}
                          </div>
                          <div className="lc-form-grid">
                            <div>
                              <label style={{ fontSize: "12px", color: C.a }}>Class name</label>
                              <input className="lc-input" value={cName} onChange={(e) => setCName(e.target.value)} placeholder="e.g. Hifz, Thilawa, Thajweed" />
                            </div>
                            <div>
                              <label style={{ fontSize: "12px", color: C.a }}>Class code</label>
                              <input className="lc-input" value={cCode} onChange={(e) => setCCode(e.target.value)} placeholder="e.g. B01" />
                            </div>
                            <div>
                              <label style={{ fontSize: "12px", color: C.a }}>Teacher</label>
                              <SearchableSelect
                                value={cTeacherId}
                                onChange={(val) => { setCTeacherId(val); setClassFormError(""); }}
                                placeholder="Unassigned"
                                options={teachers.map((t) => ({ value: t.id, label: t.name }))}
                              />
                            </div>
                          </div>

                          <div style={{ marginBottom: "12px" }}>
                            <label style={{ fontSize: "12px", color: C.a, display: "block", marginBottom: "6px" }}>Class days</label>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              {DAY_ORDER.map((day) => (
                                <div
                                  key={day}
                                  className={`lc-subtab ${cDays.includes(day) ? "lc-subtab-active" : ""}`}
                                  onClick={() => { toggleCDay(day); setClassFormError(""); }}
                                  style={{ userSelect: "none" }}
                                >
                                  {day}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="lc-form-grid">
                            <div>
                              <label style={{ fontSize: "12px", color: C.a }}>Start time</label>
                              <input className="lc-input" type="time" value={cStartTime} onChange={(e) => { setCStartTime(e.target.value); setClassFormError(""); }} />
                            </div>
                            <div>
                              <label style={{ fontSize: "12px", color: C.a }}>End time</label>
                              <input className="lc-input" type="time" value={cEndTime} onChange={(e) => { setCEndTime(e.target.value); setClassFormError(""); }} />
                            </div>
                          </div>

                          {liveClash && (
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", background: "#FBEDEA", border: "1px solid #E3C3BA", borderRadius: "8px", padding: "10px 12px", marginBottom: "12px" }}>
                              <span style={{ color: C.b, fontSize: "13px" }}>
                                <strong>{teacherName(cTeacherId)}</strong> is already teaching <strong>{liveClash.className}</strong> on <strong>{liveClash.day}</strong> at {fmtTime12(liveClash.startTime)}–{fmtTime12(liveClash.endTime)} — this overlaps. Pick a different time, day, or teacher.
                              </span>
                            </div>
                          )}
                          {!liveClash && classFormError && <div style={{ color: C.b, fontSize: "13px", marginBottom: "12px" }}>{classFormError}</div>}

                          <div style={{ fontSize: "12px", color: C.a, marginBottom: "12px" }}>
                            Editing an existing class updates the teacher and time for every student already assigned to it.
                          </div>

                          <div style={{ display: "flex", gap: "10px" }}>
                            <button className="lc-btn lc-btn-primary" onClick={handleSaveClass} disabled={!!liveClash}>{editingClassId ? "Save changes" : "Add class"}</button>
                            <button className="lc-btn" onClick={resetClassForm}>Cancel</button>
                          </div>
                        </div>
                        );
                      })()}

                      <div className="tp-card">
                        {classes.length > 0 && (
                          <div className="lc-search-wrap" style={{ marginBottom: "14px", maxWidth: "320px" }}>
                            <Search size={15} color={C.a} aria-hidden="true" />
                            <input
                              className="lc-input"
                              placeholder="Search classes…"
                              value={classSearch}
                              onChange={(e) => setClassSearch(e.target.value)}
                            />
                            {classSearch && (
                              <button className="lc-search-clear" onClick={() => setClassSearch("")} aria-label="Clear search"><X size={14} /></button>
                            )}
                          </div>
                        )}
                        {(() => {
                          const q = classSearch.trim().toLowerCase();
                          const filteredClasses = q
                            ? classes.filter((c) => c.name.toLowerCase().includes(q) || teacherName(c.teacherId).toLowerCase().includes(q))
                            : classes;
                          if (classes.length === 0) {
                            return (
                              <div className="lc-empty-state">
                                <Layers size={32} aria-hidden="true" />
                                <div>No classes yet. Add your first one above.</div>
                              </div>
                            );
                          }
                          if (filteredClasses.length === 0) {
                            return (
                              <div className="lc-empty-state">
                                <Search size={32} aria-hidden="true" />
                                <div>No classes match "{classSearch}".</div>
                              </div>
                            );
                          }
                          return (
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {filteredClasses.map((c) => {
                              const classStudents = students.filter((s) => s.classId === c.id);
                              const key = `admin-class:${c.id}`;
                              const isOpen = expandedClasses.has(key);
                              const badge = classBadgeStyle(c.code || classCode(c.name));
                              return (
                                <div key={c.id}>
                                  <div className="tp-accordion-row" style={{ cursor: "default", flexWrap: "wrap", rowGap: "10px" }}>
                                    <button
                                      type="button"
                                      aria-expanded={isOpen}
                                      onClick={() => toggleClassExpand(key)}
                                      style={{ display: "flex", alignItems: "center", gap: "14px", flex: "1 1 200px", minWidth: "200px", background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", textAlign: "left" }}
                                    >
                                      <ChevronRight size={18} className={`tp-accordion-chevron ${isOpen ? "tp-accordion-chevron-open" : ""}`} aria-hidden="true" />
                                      {c.code && <span className="tp-code-badge" style={{ background: badge.bg, color: badge.color }}>{c.code}</span>}
                                      <span className="tp-accordion-title">{c.name}</span>
                                      <span className="tp-count-badge">{classStudents.length} student{classStudents.length === 1 ? "" : "s"}</span>
                                    </button>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                      <span style={{ fontSize: "13px", color: TP.secondaryText }}>
                                        {teacherName(c.teacherId)} · {formatSchedule({ days: c.days, startTime: c.startTime, endTime: c.endTime })}
                                      </span>
                                      <button
                                        type="button"
                                        className="tp-btn-outline"
                                        style={{ height: "36px", minHeight: "36px", padding: "0 12px", fontSize: "13px" }}
                                        onClick={() => startEditClass(c)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="tp-btn-outline"
                                        style={{ height: "36px", minHeight: "36px", padding: "0 12px", fontSize: "13px", color: "#A5432C", borderColor: "#E3C3BA" }}
                                        onClick={() => removeClass(c.id)}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                  {isOpen && (
                                    <div className="lc-expand-panel" style={{ marginTop: "8px", paddingLeft: "8px" }}>
                                      <div style={{ marginBottom: "10px" }}>
                                        <button
                                          className="lc-btn"
                                          style={{ fontSize: "12px", padding: "5px 10px" }}
                                          onClick={() => { setClassesView("students"); resetStudentForm(); setSClassId(c.id); setShowStudentForm(true); }}
                                        >
                                          + Add student
                                        </button>
                                      </div>
                                      {classStudents.length === 0 ? (
                                        <div className="lc-card" style={{ fontSize: "13px", color: C.a }}>
                                          No students in this class yet.
                                        </div>
                                      ) : (
                                        <div className="tp-table-wrap"><table className="tp-list-table">
                                          <thead><tr><th>Student</th><th>Phone</th><th>Monthly fee</th><th></th></tr></thead>
                                          <tbody>
                                            {classStudents.map((s) => (
                                              <tr key={s.id}>
                                                <td>{s.name}</td>
                                                <td>{s.phone || "—"}</td>
                                                <td>{fmtMoney(s.fee)}</td>
                                                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                                  <button className="lc-btn" onClick={() => { setClassesView("students"); startEditStudent(s); }}>Edit student</button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table></div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          );
                        })()}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ---------------- TEACHERS ---------------- */}
              {section === "teachers" && role === "admin" && (
                <div className="tp-teachers-page">
                  <style>{`
                    .tp-teachers-page { position: relative; margin: -28px -32px; padding: 32px; min-height: calc(100% + 56px); overflow: hidden; box-sizing: border-box; }
                    @media (max-width: 820px) {
                      .tp-teachers-page { margin: -18px -16px; padding: 24px; min-height: calc(100% + 36px); }
                    }
                    @media (max-width: 640px) {
                      .tp-teachers-page { padding: 20px; }
                    }
                  `}</style>
                  <div className="tp-header">
                    <div className="tp-title-group">
                      <span className="tp-title-icon" aria-hidden="true"><GraduationCap size={22} /></span>
                      <h1 className="tp-title">Teachers</h1>
                    </div>
                    <div className="tp-actions">
                      <button type="button" className="tp-btn-gradient" onClick={() => { resetTeacherForm(); setShowTeacherForm(true); }}>+ Add teacher</button>
                    </div>
                  </div>

                  {showTeacherForm && (
                    <div className="tp-card" style={{ marginBottom: "18px" }}>
                      <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px", color: TP.navy }}>
                        {editingTeacherId ? "Edit teacher" : "New teacher"}
                      </div>
                      <div className="lc-form-grid">
                        <div>
                          <label style={{ fontSize: "12px", color: C.a }}>Name</label>
                          <input className="lc-input" value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Teacher name" />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", color: C.a }}>Subject / class</label>
                          <input className="lc-input" value={tSubject} onChange={(e) => setTSubject(e.target.value)} placeholder="e.g. Hifz" />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", color: C.a }}>Phone (optional)</label>
                          <input className="lc-input" value={tPhone} onChange={(e) => setTPhone(e.target.value)} placeholder="Contact number" />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", color: C.a }}>Login email</label>
                          <input className="lc-input" type="email" value={tEmail} onChange={(e) => setTEmail(e.target.value)} placeholder="teacher@aflaah.com" />
                        </div>
                      </div>
                      <div style={{ fontSize: "12px", color: C.a, marginBottom: "12px" }}>
                        Passwords are handled by Supabase Auth, not this app. To give a teacher access: create their login in Supabase → Authentication → Users (or have them sign up), then use "Link login" below with the same email to connect it to this teacher record.
                      </div>
                      {linkLoginError && <div style={{ color: C.b, fontSize: "13px", marginBottom: "12px" }}>{linkLoginError}</div>}
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button className="lc-btn lc-btn-primary" onClick={handleSaveTeacher}>{editingTeacherId ? "Save changes" : "Add teacher"}</button>
                        <button className="lc-btn" onClick={resetTeacherForm}>Cancel</button>
                        {editingTeacherId && (
                          <button
                            className="lc-btn"
                            disabled={linkLoginLoadingId === editingTeacherId}
                            onClick={() => linkTeacherLogin(editingTeacherId, tEmail)}
                          >
                            {linkLoginLoadingId === editingTeacherId ? "Linking…" : "Link login"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="tp-card">
                    {teachers.length > 0 && (
                      <div className="lc-search-wrap" style={{ marginBottom: "14px", maxWidth: "320px" }}>
                        <Search size={15} color={C.a} aria-hidden="true" />
                        <input
                          className="lc-input"
                          placeholder="Search teachers or subjects…"
                          value={teacherSearch}
                          onChange={(e) => setTeacherSearch(e.target.value)}
                        />
                        {teacherSearch && (
                          <button className="lc-search-clear" onClick={() => setTeacherSearch("")} aria-label="Clear search"><X size={14} /></button>
                        )}
                      </div>
                    )}
                    {(() => {
                      const q = teacherSearch.trim().toLowerCase();
                      const filteredTeachers = q
                        ? teachers.filter((t) => t.name.toLowerCase().includes(q) || (t.subject || "").toLowerCase().includes(q))
                        : teachers;
                      if (teachers.length === 0) {
                        return (
                          <div className="lc-empty-state">
                            <GraduationCap size={32} aria-hidden="true" />
                            <div>No teachers yet. Add your first one above.</div>
                          </div>
                        );
                      }
                      if (filteredTeachers.length === 0) {
                        return (
                          <div className="lc-empty-state">
                            <Search size={32} aria-hidden="true" />
                            <div>No teachers match "{teacherSearch}".</div>
                          </div>
                        );
                      }
                      return (
                      <div className="tp-table-wrap"><table className="tp-list-table">
                        <thead><tr><th>Name</th><th>Subject</th><th>Phone</th><th>Students</th><th>Portal</th><th></th></tr></thead>
                        <tbody>
                          {filteredTeachers.map((t) => {
                            const count = students.filter((s) => s.teacherId === t.id).length;
                            return (
                              <tr key={t.id}>
                                <td>{t.name}</td>
                                <td>{t.subject || "—"}</td>
                                <td>{t.phone || "—"}</td>
                                <td>{count}</td>
                                <td>
                                  {t.userId ? (
                                    <span className="lc-badge lc-badge-paid" style={{ cursor: "default" }}>Login linked</span>
                                  ) : (
                                    <span className="lc-badge lc-badge-pending" style={{ cursor: "default" }}>Not linked</span>
                                  )}
                                </td>
                                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                  <button className="lc-btn" style={{ marginRight: "8px" }} onClick={() => startEditTeacher(t)}>Edit</button>
                                  <button className="lc-btn lc-btn-danger" onClick={() => removeTeacher(t.id)}>Remove</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table></div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* ---------------- TIMETABLE (includes Holidays) ---------------- */}
              {section === "timetable" && role === "admin" && (
                <div className="tp-admtimetable-page">
                  <style>{`
                    .tp-admtimetable-page { position: relative; margin: -28px -32px; padding: 32px; min-height: calc(100% + 56px); overflow: hidden; box-sizing: border-box; }
                    @media (max-width: 820px) {
                      .tp-admtimetable-page { margin: -18px -16px; padding: 24px; min-height: calc(100% + 36px); }
                    }
                    @media (max-width: 640px) {
                      .tp-admtimetable-page { padding: 20px; }
                    }
                  `}</style>
                  <div className="tp-header">
                    <div className="tp-title-group">
                      <span className="tp-title-icon" aria-hidden="true"><CalendarDays size={22} /></span>
                      <h1 className="tp-title">Timetable</h1>
                    </div>
                  </div>

                  <div className="tp-segment no-print" role="group" aria-label="Timetable view">
                    <button
                      type="button"
                      aria-pressed={timetableView === "students"}
                      className={`tp-segment-btn ${timetableView === "students" ? "tp-segment-btn-active" : ""}`}
                      onClick={() => setTimetableView("students")}
                    >
                      Students timetable
                    </button>
                    <button
                      type="button"
                      aria-pressed={timetableView === "teachers"}
                      className={`tp-segment-btn ${timetableView === "teachers" ? "tp-segment-btn-active" : ""}`}
                      onClick={() => setTimetableView("teachers")}
                    >
                      Teachers timetable
                    </button>
                    <button
                      type="button"
                      aria-pressed={timetableView === "holidays"}
                      className={`tp-segment-btn ${timetableView === "holidays" ? "tp-segment-btn-active" : ""}`}
                      onClick={() => setTimetableView("holidays")}
                    >
                      Holidays
                    </button>
                  </div>

                  {timetableView === "holidays" && (
                    <>
                      <div className="tp-subtext">
                        Mark public holidays or term breaks here — a single day or a whole range. They apply to every class and every student automatically, so those days won't sit there as "pending" on anyone's attendance calendar.
                      </div>

                      <div style={{ marginBottom: "18px" }}>
                        <button type="button" className="tp-btn-gradient" onClick={() => { resetHolidayForm(); setShowHolidayForm(true); }}>+ Add holiday</button>
                      </div>

                      {showHolidayForm && (
                        <div className="tp-card" style={{ marginBottom: "18px" }}>
                          <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px", color: TP.navy }}>
                            {editingHolidayId ? "Edit holiday" : "New holiday"}
                          </div>
                          <div style={{ marginBottom: "12px" }}>
                            <label style={{ fontSize: "12px", color: C.a }}>Name</label>
                            <input className="lc-input" value={hLabel} onChange={(e) => setHLabel(e.target.value)} placeholder="e.g. Eid Al-Fitr, Term 1 break" />
                          </div>
                          <div className="lc-form-grid">
                            <div>
                              <label style={{ fontSize: "12px", color: C.a }}>Start date</label>
                              <input className="lc-input" type="date" value={hStartDate} onChange={(e) => setHStartDate(e.target.value)} />
                            </div>
                            <div>
                              <label style={{ fontSize: "12px", color: C.a }}>End date</label>
                              <input className="lc-input" type="date" value={hEndDate} onChange={(e) => setHEndDate(e.target.value)} />
                            </div>
                          </div>
                          <div style={{ fontSize: "12px", color: C.a, marginBottom: "12px" }}>
                            For a single day, set the start and end date the same.
                          </div>
                          {holidayFormError && <div style={{ color: C.b, fontSize: "13px", marginBottom: "12px" }}>{holidayFormError}</div>}
                          <div style={{ display: "flex", gap: "10px" }}>
                            <button className="lc-btn lc-btn-primary" onClick={handleSaveHoliday}>{editingHolidayId ? "Save changes" : "Add holiday"}</button>
                            <button className="lc-btn" onClick={resetHolidayForm}>Cancel</button>
                          </div>
                        </div>
                      )}

                      <div className="tp-card">
                        {holidays.length === 0 ? (
                          <div className="lc-empty-state">
                            <Sun size={32} aria-hidden="true" />
                            <div>No holidays added yet.</div>
                          </div>
                        ) : (
                          <div className="tp-table-wrap"><table className="tp-list-table">
                            <thead><tr><th>Name</th><th>Dates</th><th></th></tr></thead>
                            <tbody>
                              {[...holidays].sort((a, b) => a.startDate.localeCompare(b.startDate)).map((h) => (
                                <tr key={h.id}>
                                  <td>{h.label}</td>
                                  <td>{h.startDate === h.endDate ? h.startDate : `${h.startDate} → ${h.endDate}`}</td>
                                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                    <button className="lc-btn" style={{ marginRight: "8px" }} onClick={() => startEditHoliday(h)}>Edit</button>
                                    <button className="lc-btn lc-btn-danger" onClick={() => removeHoliday(h.id)}>Remove</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table></div>
                        )}
                      </div>
                    </>
                  )}

                  {timetableView === "students" && (() => {
                    const filtered = ttStudentId ? scheduleRows.filter((r) => r.studentId === ttStudentId) : scheduleRows;
                    const grid = buildTimetableGrid(filtered, (r) => r.className || "—", (r) => r.classId || r.className || "—");
                    const gridColumnsForImage = ["Time", ...DAY_ORDER];
                    const imageRows = grid.map((row) => [row.timeLabel, ...row.cells.map((c) => c.join(", "))]);
                    const selectedStudent = students.find((s) => s.id === ttStudentId);
                    const title = "Students Timetable";
                    const subtitle = selectedStudent ? selectedStudent.name : "All students";
                    return (
                      <>
                        <div className="tp-actions no-print" style={{ justifyContent: "space-between", marginBottom: "14px" }}>
                          <SearchableSelect
                            style={{ maxWidth: "260px" }}
                            value={ttStudentId}
                            onChange={setTtStudentId}
                            placeholder="All students"
                            options={students.map((s) => ({ value: s.id, label: s.name }))}
                          />
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                            <span className="tp-chip">
                              <Users size={16} aria-hidden="true" />
                              {subtitle}
                            </span>
                            <button
                              type="button"
                              className="tp-btn-outline"
                              onClick={() => downloadRowsAsImage(title, subtitle, gridColumnsForImage, imageRows, `${subtitle.replace(/\s+/g, "_")}_timetable.png`)}
                            >
                              <ImageIcon size={16} aria-hidden="true" />
                              Download as image
                            </button>
                            <button
                              type="button"
                              className="tp-btn-gradient"
                              onClick={() => downloadRowsAsPDF(title, subtitle, gridColumnsForImage, imageRows, `${subtitle.replace(/\s+/g, "_")}_timetable.pdf`)}
                            >
                              <FileText size={16} aria-hidden="true" />
                              Download as PDF
                            </button>
                          </div>
                        </div>
                        <div className="tp-card">
                          {grid.length === 0 ? (
                            <div style={{ color: TP.secondaryText, fontSize: "14px" }}>
                              No schedule set yet. Add class days and times when creating or editing a student.
                            </div>
                          ) : (
                            <div className="tp-table-wrap"><table className="tp-table">
                              <thead>
                                <tr>
                                  <th style={{ width: "110px" }}>Time</th>
                                  {DAY_ORDER.map((d) => <th key={d}>{d}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {grid.map((row, i) => (
                                  <tr key={i}>
                                    <td className="tp-time-cell">{row.timeLabel}</td>
                                    {row.cells.map((entries, j) => (
                                      <td key={j}>
                                        {entries.map((label, k) => <div key={k} className={`tp-entry ${(j + k) % 2 === 0 ? "tp-entry-blue" : "tp-entry-aqua"}`}>{label}</div>)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table></div>
                          )}
                        </div>
                      </>
                    );
                  })()}

                  {timetableView === "teachers" && (() => {
                    const filtered = ttTeacherId ? scheduleRows.filter((r) => r.teacherId === ttTeacherId) : scheduleRows.filter((r) => r.teacherId);
                    const grid = buildTimetableGrid(filtered, (r) => r.className || "—", (r) => r.classId || r.className || "—");
                    const gridColumnsForImage = ["Time", ...DAY_ORDER];
                    const imageRows = grid.map((row) => [row.timeLabel, ...row.cells.map((c) => c.join(", "))]);
                    const selectedTeacher = teachers.find((t) => t.id === ttTeacherId);
                    const title = "Teachers Timetable";
                    const subtitle = selectedTeacher ? selectedTeacher.name : "All teachers";
                    return (
                      <>
                        <div className="tp-actions no-print" style={{ justifyContent: "space-between", marginBottom: "14px" }}>
                          <SearchableSelect
                            style={{ maxWidth: "260px" }}
                            value={ttTeacherId}
                            onChange={setTtTeacherId}
                            placeholder="All teachers"
                            options={teachers.map((t) => ({ value: t.id, label: t.name }))}
                          />
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                            <span className="tp-chip">
                              <GraduationCap size={16} aria-hidden="true" />
                              {subtitle}
                            </span>
                            <button
                              type="button"
                              className="tp-btn-outline"
                              onClick={() => downloadRowsAsImage(title, subtitle, gridColumnsForImage, imageRows, `${subtitle.replace(/\s+/g, "_")}_timetable.png`)}
                            >
                              <ImageIcon size={16} aria-hidden="true" />
                              Download as image
                            </button>
                            <button
                              type="button"
                              className="tp-btn-gradient"
                              onClick={() => downloadRowsAsPDF(title, subtitle, gridColumnsForImage, imageRows, `${subtitle.replace(/\s+/g, "_")}_timetable.pdf`)}
                            >
                              <FileText size={16} aria-hidden="true" />
                              Download as PDF
                            </button>
                          </div>
                        </div>
                        <div className="tp-card">
                          {teachers.length === 0 ? (
                            <div style={{ color: TP.secondaryText, fontSize: "14px" }}>No teachers yet. Add one in the Teachers section.</div>
                          ) : grid.length === 0 ? (
                            <div style={{ color: TP.secondaryText, fontSize: "14px" }}>No scheduled classes for this selection yet.</div>
                          ) : (
                            <div className="tp-table-wrap"><table className="tp-table">
                              <thead>
                                <tr>
                                  <th style={{ width: "110px" }}>Time</th>
                                  {DAY_ORDER.map((d) => <th key={d}>{d}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {grid.map((row, i) => (
                                  <tr key={i}>
                                    <td className="tp-time-cell">{row.timeLabel}</td>
                                    {row.cells.map((entries, j) => (
                                      <td key={j}>
                                        {entries.map((label, k) => <div key={k} className={`tp-entry ${(j + k) % 2 === 0 ? "tp-entry-blue" : "tp-entry-aqua"}`}>{label}</div>)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table></div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ---------------- FINANCE ---------------- */}
              {section === "finance" && (
                <div className="tp-finance-page">
                  <style>{`
                    .tp-finance-page { position: relative; margin: -28px -32px; padding: 32px; min-height: calc(100% + 56px); overflow: hidden; box-sizing: border-box; }
                    @media (max-width: 820px) {
                      .tp-finance-page { margin: -18px -16px; padding: 24px; min-height: calc(100% + 36px); }
                    }
                    @media (max-width: 640px) {
                      .tp-finance-page { padding: 20px; }
                    }
                  `}</style>
                  <div className="tp-header">
                    <div className="tp-title-group">
                      <span className="tp-title-icon" aria-hidden="true"><Wallet size={22} /></span>
                      <h1 className="tp-title">Finance</h1>
                    </div>
                    <div className="tp-actions">
                      <button type="button" className="tp-btn-outline" style={{ width: "44px", padding: 0, justifyContent: "center" }} onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month">‹</button>
                      <span className="tp-chip" style={{ minWidth: "140px", justifyContent: "center" }}>{monthLabel(month)}</span>
                      <button type="button" className="tp-btn-outline" style={{ width: "44px", padding: 0, justifyContent: "center" }} onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Next month">›</button>
                    </div>
                  </div>

                  {role === "admin" && (
                    <div className="tp-segment" role="group" aria-label="Finance view">
                      <button type="button" aria-pressed={financeView === "dashboard"} className={`tp-segment-btn ${financeView === "dashboard" ? "tp-segment-btn-active" : ""}`} onClick={() => setFinanceView("dashboard")}>Dashboard</button>
                      <button type="button" aria-pressed={financeView === "payments"} className={`tp-segment-btn ${financeView === "payments" ? "tp-segment-btn-active" : ""}`} onClick={() => setFinanceView("payments")}>Payments</button>
                      <button type="button" aria-pressed={financeView === "salaries"} className={`tp-segment-btn ${financeView === "salaries" ? "tp-segment-btn-active" : ""}`} onClick={() => setFinanceView("salaries")}>Salaries</button>
                      <button type="button" aria-pressed={financeView === "ledger"} className={`tp-segment-btn ${financeView === "ledger" ? "tp-segment-btn-active" : ""}`} onClick={() => setFinanceView("ledger")}>Expenses & income</button>
                      <button type="button" aria-pressed={financeView === "student"} className={`tp-segment-btn ${financeView === "student" ? "tp-segment-btn-active" : ""}`} onClick={() => setFinanceView("student")}>Student search</button>
                    </div>
                  )}

                  {role === "admin" && financeView === "dashboard" && (
                    <>
                      <div className="tp-card" style={{ marginBottom: "18px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
                          <div style={{ fontSize: "13px", color: TP.secondaryText }}>Collected this month</div>
                          <div style={{ fontSize: "12px", color: TP.secondaryText, fontWeight: 600 }}>
                            {totals.expected > 0 ? Math.round((totals.received / totals.expected) * 100) : 0}%
                          </div>
                        </div>
                        <div className="lc-progress-track">
                          <div
                            className="lc-progress-fill"
                            style={{ width: `${totals.expected > 0 ? Math.min(100, (totals.received / totals.expected) * 100) : 0}%` }}
                          />
                        </div>
                      </div>

                      <div className="lc-grid-3">
                        <div className="tp-card">
                          <div style={{ fontSize: "13px", color: TP.secondaryText, marginBottom: "6px" }}>Expected this month</div>
                          <div style={{ fontSize: "26px", fontWeight: 600, color: TP.navy }}><CountUp value={totals.expected} formatter={fmtMoney} /></div>
                        </div>
                        <div className="tp-card">
                          <div style={{ fontSize: "13px", color: TP.secondaryText, marginBottom: "6px" }}>Received</div>
                          <div style={{ fontSize: "26px", fontWeight: 600, color: C.d }}><CountUp value={totals.received} formatter={fmtMoney} /></div>
                        </div>
                        <div className="tp-card">
                          <div style={{ fontSize: "13px", color: TP.secondaryText, marginBottom: "6px" }}>Pending</div>
                          <div style={{ fontSize: "26px", fontWeight: 600, color: C.b }}><CountUp value={totals.pending} formatter={fmtMoney} /></div>
                        </div>
                      </div>

                      <div className="lc-grid-2">
                        <div className="tp-card">
                          <div style={{ fontSize: "13px", color: TP.secondaryText, marginBottom: "6px" }}>Other income this month</div>
                          <div style={{ fontSize: "26px", fontWeight: 600, color: C.d }}><CountUp value={totalOtherIncomeThisMonth} formatter={fmtMoney} /></div>
                        </div>
                        <div className="tp-card">
                          <div style={{ fontSize: "13px", color: TP.secondaryText, marginBottom: "6px" }}>Expenses this month</div>
                          <div style={{ fontSize: "26px", fontWeight: 600, color: C.b }}><CountUp value={totalExpensesThisMonth} formatter={fmtMoney} /></div>
                        </div>
                      </div>

                      <div className="lc-grid-2">
                        <div className="tp-card">
                          <div style={{ fontSize: "13px", color: TP.secondaryText, marginBottom: "6px" }}>Teacher payouts (from collected)</div>
                          <div style={{ fontSize: "26px", fontWeight: 600, color: TP.navy }}><CountUp value={totalPayouts} formatter={fmtMoney} /></div>
                        </div>
                        <div className="tp-card">
                          <div style={{ fontSize: "13px", color: TP.secondaryText, marginBottom: "6px" }}>Center profit (received + other income − payouts − expenses)</div>
                          <div style={{ fontSize: "26px", fontWeight: 600, color: C.d }}><CountUp value={centerProfit} formatter={fmtMoney} /></div>
                        </div>
                      </div>

                      <div className="tp-card">
                        <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "10px", color: TP.navy }}>
                          Students pending for {monthLabel(month)} {pendingStudents.length > 0 && `(${pendingStudents.length})`}
                        </div>
                        {activeStudents.length === 0 ? (
                          <div style={{ color: TP.secondaryText, fontSize: "14px" }}>No students yet. Add one in the Students section.</div>
                        ) : pendingStudents.length === 0 ? (
                          <div className="lc-celebrate" style={{ color: C.d, fontSize: "14px" }}><PartyPopper size={16} aria-hidden="true" />Everyone has paid for this month.</div>
                        ) : (
                          <div className="tp-table-wrap"><table className="tp-list-table">
                            <thead><tr><th>Name</th><th>Class</th><th>Monthly fee</th><th></th></tr></thead>
                            <tbody>
                              {pendingStudents.map((s) => (
                                <tr key={s.id}>
                                  <td>{s.name}</td>
                                  <td>{s.className || "—"}</td>
                                  <td>{fmtMoney(s.fee)}</td>
                                  <td style={{ textAlign: "right" }}>
                                    <button className="lc-btn lc-btn-primary" onClick={() => markPaid(s.id, s.fee)}>Mark paid</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table></div>
                        )}
                      </div>
                    </>
                  )}

                  {financeView === "payments" && (
                    <div className="tp-card">
                      {activeStudents.length === 0 ? (
                        <div style={{ color: TP.secondaryText, fontSize: "14px" }}>No students yet. Add one in the Students section.</div>
                      ) : (
                        <div className="tp-table-wrap"><table className="tp-list-table">
                          <thead><tr><th>Name</th><th>Class</th><th>Fee</th><th>Status</th><th>Amount</th><th></th></tr></thead>
                          <tbody>
                            {activeStudents.map((s) => {
                              const rec = monthData[s.id];
                              const paid = !!(rec && rec.paid);
                              return (
                                <tr key={s.id}>
                                  <td>{s.name}</td>
                                  <td>{s.className || "—"}</td>
                                  <td>{fmtMoney(s.fee)}</td>
                                  <td>
                                    <span className={`lc-badge ${paid ? "lc-badge-paid" : "lc-badge-pending"}`}>{paid ? "Paid" : "Pending"}</span>
                                    {paid && rec.paidDate && <div style={{ fontSize: "11px", color: TP.secondaryText, marginTop: "3px" }}>on {rec.paidDate}</div>}
                                  </td>
                                  <td style={{ width: "120px" }}>
                                    <input
                                      className="lc-input"
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={getDraft(s.id, s.fee)}
                                      onChange={(e) => setPayDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                                      disabled={paid}
                                    />
                                  </td>
                                  <td style={{ textAlign: "right" }}>
                                    {paid ? (
                                      <button className="lc-btn" onClick={() => markUnpaid(s.id)}>Undo</button>
                                    ) : (
                                      <button className="lc-btn lc-btn-primary" onClick={() => markPaid(s.id, s.fee)}>Mark paid</button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table></div>
                      )}
                    </div>
                  )}

                  {role === "admin" && financeView === "salaries" && (
                    <>
                      <div className="tp-card" style={{ marginBottom: "14px" }}>
                        {teachers.length === 0 ? (
                          <div style={{ color: TP.secondaryText, fontSize: "14px" }}>No teachers yet. Add one in the Teachers section, then assign students to them.</div>
                        ) : (
                          <div className="tp-table-wrap"><table className="tp-list-table">
                            <thead><tr><th>Teacher</th><th>Paid students</th><th>Fee collected</th><th>Salary ({monthLabel(month)})</th></tr></thead>
                            <tbody>
                              {salaryByTeacher.map((r) => (
                                <tr key={r.teacherId}>
                                  <td>{r.name}</td>
                                  <td>{r.studentCount}</td>
                                  <td>{fmtMoney(r.collected)}</td>
                                  <td style={{ fontWeight: 600 }}>{fmtMoney(r.payout)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table></div>
                        )}
                      </div>

                      <div className="tp-card">
                        <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "10px", color: TP.navy }}>Profit summary — {monthLabel(month)}</div>
                        <div className="tp-table-wrap"><table className="tp-list-table">
                          <tbody>
                            <tr><td>Total received</td><td style={{ textAlign: "right" }}>{fmtMoney(totals.received)}</td></tr>
                            <tr><td>Other income</td><td style={{ textAlign: "right" }}>+ {fmtMoney(totalOtherIncomeThisMonth)}</td></tr>
                            <tr><td>Total teacher payouts</td><td style={{ textAlign: "right" }}>− {fmtMoney(totalPayouts)}</td></tr>
                            <tr><td>Expenses</td><td style={{ textAlign: "right" }}>− {fmtMoney(totalExpensesThisMonth)}</td></tr>
                            <tr><td style={{ fontWeight: 600 }}>Center profit</td><td style={{ textAlign: "right", fontWeight: 600, color: C.d }}>{fmtMoney(centerProfit)}</td></tr>
                          </tbody>
                        </table></div>
                        <div style={{ fontSize: "12px", color: TP.secondaryText, marginTop: "10px" }}>
                          Profit is based on fees actually received this month. Students with no teacher assigned, or a 0% share, are fully retained by the center.
                        </div>
                      </div>
                    </>
                  )}

                  {role === "admin" && financeView === "ledger" && (
                    <div className="lc-grid-2" style={{ alignItems: "start" }}>
                      <div>
                        <div className="tp-card" style={{ marginBottom: "14px" }}>
                          <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px", color: TP.navy }}>Add class expense</div>
                          <label style={{ fontSize: "12px", color: C.a }}>Description</label>
                          <input className="lc-input" style={{ marginBottom: "10px" }} value={expenseDescInput} onChange={(e) => setExpenseDescInput(e.target.value)} placeholder="e.g. Printing materials" />
                          <div className="lc-form-grid">
                            <div>
                              <label style={{ fontSize: "12px", color: C.a }}>Amount</label>
                              <input className="lc-input" type="number" min="0" step="0.01" value={expenseAmountInput} onChange={(e) => setExpenseAmountInput(e.target.value)} placeholder="0.00" />
                            </div>
                            <div>
                              <label style={{ fontSize: "12px", color: C.a }}>Date (optional)</label>
                              <input className="lc-input" type="date" value={expenseDateInput} onChange={(e) => setExpenseDateInput(e.target.value)} />
                            </div>
                          </div>
                          <button
                            className="lc-btn lc-btn-primary"
                            disabled={!expenseDescInput.trim() || !expenseAmountInput}
                            onClick={() => {
                              addExpense(month, expenseDescInput.trim(), Number(expenseAmountInput) || 0, expenseDateInput);
                              setExpenseDescInput(""); setExpenseAmountInput(""); setExpenseDateInput("");
                              showToast("Expense added");
                            }}
                          >
                            Add expense
                          </button>
                        </div>
                        <div className="tp-card">
                          <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "10px", color: TP.navy }}>Expenses — {monthLabel(month)}</div>
                          {monthExpenses.length === 0 ? (
                            <div style={{ color: TP.secondaryText, fontSize: "14px" }}>No expenses logged for this month.</div>
                          ) : (
                            <div className="tp-table-wrap"><table className="tp-list-table">
                              <thead><tr><th>Description</th><th>Date</th><th>Amount</th><th></th></tr></thead>
                              <tbody>
                                {monthExpenses.map((e) => (
                                  <tr key={e.id}>
                                    <td>{e.description}</td>
                                    <td>{e.date || "—"}</td>
                                    <td>{fmtMoney(e.amount)}</td>
                                    <td style={{ textAlign: "right" }}><button className="lc-btn lc-btn-danger" onClick={() => removeExpense(month, e.id)}>Remove</button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table></div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="tp-card" style={{ marginBottom: "14px" }}>
                          <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px", color: TP.navy }}>Add other income</div>
                          <label style={{ fontSize: "12px", color: C.a }}>Description</label>
                          <input className="lc-input" style={{ marginBottom: "10px" }} value={incomeDescInput} onChange={(e) => setIncomeDescInput(e.target.value)} placeholder="e.g. Student registration fee — Ahmed" />
                          <div className="lc-form-grid">
                            <div>
                              <label style={{ fontSize: "12px", color: C.a }}>Amount</label>
                              <input className="lc-input" type="number" min="0" step="0.01" value={incomeAmountInput} onChange={(e) => setIncomeAmountInput(e.target.value)} placeholder="0.00" />
                            </div>
                            <div>
                              <label style={{ fontSize: "12px", color: C.a }}>Date (optional)</label>
                              <input className="lc-input" type="date" value={incomeDateInput} onChange={(e) => setIncomeDateInput(e.target.value)} />
                            </div>
                          </div>
                          <button
                            className="lc-btn lc-btn-primary"
                            disabled={!incomeDescInput.trim() || !incomeAmountInput}
                            onClick={() => {
                              addOtherIncome(month, incomeDescInput.trim(), Number(incomeAmountInput) || 0, incomeDateInput);
                              setIncomeDescInput(""); setIncomeAmountInput(""); setIncomeDateInput("");
                              showToast("Income added");
                            }}
                          >
                            Add income
                          </button>
                        </div>
                        <div className="tp-card">
                          <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "10px", color: TP.navy }}>Other income — {monthLabel(month)}</div>
                          {monthOtherIncome.length === 0 ? (
                            <div style={{ color: TP.secondaryText, fontSize: "14px" }}>No other income logged for this month.</div>
                          ) : (
                            <div className="tp-table-wrap"><table className="tp-list-table">
                              <thead><tr><th>Description</th><th>Date</th><th>Amount</th><th></th></tr></thead>
                              <tbody>
                                {monthOtherIncome.map((e) => (
                                  <tr key={e.id}>
                                    <td>{e.description}</td>
                                    <td>{e.date || "—"}</td>
                                    <td>{fmtMoney(e.amount)}</td>
                                    <td style={{ textAlign: "right" }}><button className="lc-btn lc-btn-danger" onClick={() => removeOtherIncome(month, e.id)}>Remove</button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table></div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {role === "admin" && financeView === "student" && (() => {
                    const q = finStudentSearch.trim().toLowerCase();
                    const matches = q
                      ? students.filter((s) => s.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8)
                      : [];
                    const selected = finStudentId ? students.find((s) => s.id === finStudentId) : null;

                    // One row per month from when the student joined (or first paid) up to now.
                    const byMonth = new Map(finStudentPayments.map((p) => [p.month, p]));
                    const firstMonth = [selected && selected.joinedMonth, ...finStudentPayments.map((p) => p.month)]
                      .filter(Boolean).sort()[0] || currentMonthKey();
                    const months = [];
                    for (let k = currentMonthKey(); k >= firstMonth; k = shiftMonth(k, -1)) months.push(k);
                    const paidRows = finStudentPayments.filter((p) => p.paid);
                    const totalPaid = paidRows.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
                    const lastPaid = paidRows.filter((p) => p.paidDate).sort((a, b) => b.paidDate.localeCompare(a.paidDate))[0];

                    return (
                      <div className="tp-card">
                        <div className="lc-search-wrap" style={{ maxWidth: "420px", marginBottom: "14px" }}>
                          <Search size={16} aria-hidden="true" color={C.a} />
                          <input
                            className="lc-input"
                            value={finStudentSearch}
                            onChange={(e) => setFinStudentSearch(e.target.value)}
                            placeholder="Search student by name…"
                          />
                          {finStudentSearch && (
                            <button className="lc-search-clear" onClick={() => setFinStudentSearch("")} aria-label="Clear search"><X size={14} /></button>
                          )}
                        </div>

                        {q && (
                          matches.length === 0 ? (
                            <div style={{ color: TP.secondaryText, fontSize: "14px", marginBottom: "14px" }}>No students match "{finStudentSearch}".</div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "18px" }}>
                              {matches.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  className="tp-accordion-row"
                                  style={{ marginBottom: 0, ...(s.id === finStudentId ? { borderColor: TP.blue } : {}) }}
                                  onClick={() => { setFinStudentId(s.id); setFinStudentSearch(""); }}
                                >
                                  <span className="tp-accordion-title">{s.name}</span>
                                  <span className="tp-count-badge">{s.className || "No class"}</span>
                                </button>
                              ))}
                            </div>
                          )
                        )}

                        {!selected ? (
                          !q && (
                            <div className="lc-empty-state">
                              <Search size={32} aria-hidden="true" />
                              <div>Search for a student to see when they paid.</div>
                            </div>
                          )
                        ) : (
                          <>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
                              <div>
                                <div style={{ fontSize: "18px", fontWeight: 700, color: TP.navy }}>{selected.name}</div>
                                <div style={{ fontSize: "13px", color: TP.secondaryText }}>
                                  {selected.className || "No class"} · Monthly fee {fmtMoney(selected.fee)}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                <span className="tp-chip" style={{ height: "auto", padding: "8px 14px" }}>Total paid: {fmtMoney(totalPaid)}</span>
                                <span className="tp-chip" style={{ height: "auto", padding: "8px 14px" }}>
                                  Last paid: {lastPaid ? lastPaid.paidDate : "—"}
                                </span>
                              </div>
                            </div>

                            {finStudentLoading ? (
                              <div className="lc-loading-row"><span className="lc-spinner"></span>Loading payments…</div>
                            ) : (
                              <div className="tp-table-wrap"><table className="tp-list-table">
                                <thead><tr><th>Month</th><th>Status</th><th>Amount paid</th><th>Paid on</th></tr></thead>
                                <tbody>
                                  {months.map((k) => {
                                    const p = byMonth.get(k);
                                    const paid = !!(p && p.paid);
                                    return (
                                      <tr key={k}>
                                        <td>{monthLabel(k)}</td>
                                        <td><span className={`lc-badge ${paid ? "lc-badge-paid" : "lc-badge-pending"}`}>{paid ? "Paid" : "Pending"}</span></td>
                                        <td>{paid ? fmtMoney(p.amountPaid) : "—"}</td>
                                        <td>{paid && p.paidDate ? p.paidDate : "—"}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table></div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ---------------- DATA (attendance & records cleanup) ---------------- */}
              {section === "data" && role === "admin" && (() => {
                const scopeLabel = { attendance: "Attendance", records: "Class records", both: "Both" };
                return (
                  <div className="tp-data-page">
                    <style>{`
                      .tp-data-page { position: relative; margin: -28px -32px; padding: 32px; min-height: calc(100% + 56px); overflow: hidden; box-sizing: border-box; }
                      @media (max-width: 820px) {
                        .tp-data-page { margin: -18px -16px; padding: 24px; min-height: calc(100% + 36px); }
                      }
                      @media (max-width: 640px) {
                        .tp-data-page { padding: 20px; }
                      }
                    `}</style>
                    <div className="tp-header">
                      <div className="tp-title-group">
                        <span className="tp-title-icon" aria-hidden="true"><Trash2 size={22} /></span>
                        <h1 className="tp-title">Data</h1>
                      </div>
                      <div className="tp-actions">
                        <button
                          type="button"
                          className="tp-btn-gradient"
                          disabled={dataOverviewLoading}
                          onClick={loadDataOverview}
                        >
                          {dataOverviewLoading ? <span className="lc-spinner"></span> : <RotateCw size={16} aria-hidden="true" />}
                          {dataOverviewLoading ? "Refreshing…" : "Refresh"}
                        </button>
                      </div>
                    </div>
                    <div className="tp-subtext">
                      Attendance status and class records (notes/Hifz) are saved per day and build up over time. Pick a month below and choose what to clear — attendance marks, class records, or both. This never touches students, teachers, classes, or finance history.
                    </div>

                    {dataOverviewLoading ? (
                      <div className="tp-card"><div className="lc-loading-row"><span className="lc-spinner"></span>Scanning stored records…</div></div>
                    ) : dataMonths.length === 0 ? (
                      <div className="lc-empty-state">
                        <Trash2 size={32} aria-hidden="true" />
                        <div>No attendance or record data saved yet.</div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {dataMonths.map((m) => {
                          const [y, mo] = m.month.split("-").map(Number);
                          const label = `${MONTH_NAMES[mo - 1]} ${y}`;
                          const isConfirming = confirmDelete && confirmDelete.month === m.month;
                          return (
                            <div key={m.month} className="tp-card">
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                                <div>
                                  <div style={{ fontWeight: 600, color: TP.navy }}>{label}</div>
                                  <div style={{ fontSize: "12px", color: TP.secondaryText }}>
                                    {m.attendanceCount} day{m.attendanceCount === 1 ? "" : "s"} with attendance · {m.recordsCount} day{m.recordsCount === 1 ? "" : "s"} with class records
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                  <button
                                    type="button"
                                    className="tp-btn-gradient"
                                    style={{ height: "40px", minHeight: "40px", padding: "0 14px", fontSize: "13px" }}
                                    disabled={backupLoadingKey === `${m.month}:pdf`}
                                    onClick={() => downloadMonthBackup(m.month, "pdf")}
                                  >
                                    {backupLoadingKey === `${m.month}:pdf` ? "Preparing…" : "Save as PDF"}
                                  </button>
                                  <button
                                    type="button"
                                    className="tp-btn-outline"
                                    style={{ height: "40px", minHeight: "40px", padding: "0 14px", fontSize: "13px" }}
                                    disabled={backupLoadingKey === `${m.month}:image`}
                                    onClick={() => downloadMonthBackup(m.month, "image")}
                                  >
                                    {backupLoadingKey === `${m.month}:image` ? "Preparing…" : "Save as image"}
                                  </button>
                                </div>
                              </div>
                              <div style={{ fontSize: "11px", color: C.n, marginBottom: "12px" }}>
                                Tip: save a backup before deleting — once deleted, this data can't be recovered.
                              </div>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: isConfirming ? "12px" : "0" }}>
                                <div />
                                {!isConfirming && (
                                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    <button className="lc-btn" disabled={m.attendanceCount === 0} onClick={() => setConfirmDelete({ month: m.month, scope: "attendance" })}>
                                      Delete attendance
                                    </button>
                                    <button className="lc-btn" disabled={m.recordsCount === 0} onClick={() => setConfirmDelete({ month: m.month, scope: "records" })}>
                                      Delete class records
                                    </button>
                                    <button className="lc-btn" onClick={() => setConfirmDelete({ month: m.month, scope: "both" })}>
                                      Delete both
                                    </button>
                                  </div>
                                )}
                              </div>
                              {isConfirming && (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                                  <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: C.b }}>
                                    <AlertTriangle size={14} aria-hidden="true" />
                                    Delete {scopeLabel[confirmDelete.scope].toLowerCase()} for {label}? This can't be undone.
                                  </span>
                                  <button
                                    className="lc-btn"
                                    style={{ background: C.y, borderColor: C.y, color: C.c }}
                                    disabled={deletingKey === `${m.month}:${confirmDelete.scope}`}
                                    onClick={() => deleteMonthData(m.month, confirmDelete.scope)}
                                  >
                                    {deletingKey === `${m.month}:${confirmDelete.scope}` ? "Deleting…" : "Confirm delete"}
                                  </button>
                                  <button className="lc-btn" disabled={deletingKey === `${m.month}:${confirmDelete.scope}`} onClick={() => setConfirmDelete(null)}>Cancel</button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ---------------- ATTENDANCE (admin) ---------------- */}
              {section === "attendance" && role === "admin" && (() => {
                const studentInitials = (name) => (name || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "?";
                const todayStr = fmtDateStr(new Date());

                const inRange = (dateStr) => (!adminAttRangeStart || dateStr >= adminAttRangeStart) && (!adminAttRangeEnd || dateStr <= adminAttRangeEnd);

                const attendanceByStudent = new Map();
                adminAllAttendance.forEach((r) => {
                  if (!attendanceByStudent.has(r.studentId)) attendanceByStudent.set(r.studentId, []);
                  attendanceByStudent.get(r.studentId).push(r);
                });

                const percentFor = (studentId) => {
                  const rows = (attendanceByStudent.get(studentId) || []).filter((r) => (r.status === "present" || r.status === "absent") && inRange(r.date));
                  if (rows.length === 0) return null;
                  const present = rows.filter((r) => r.status === "present").length;
                  return Math.round((present / rows.length) * 100);
                };
                const percentTheme = (pct) => {
                  if (pct === null) return { bg: "#EDEFF2", color: "#4B5563" };
                  if (pct >= 90) return { bg: C.i, color: C.d };
                  if (pct >= 75) return { bg: C.t, color: C.u };
                  return { bg: C.h, color: C.b };
                };

                const q = adminAttSearch.trim().toLowerCase();
                const filteredStudents = students
                  .filter((s) => !q || s.name.toLowerCase().includes(q))
                  .filter((s) => !adminAttClassId || s.classId === adminAttClassId)
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name));

                const totalFiltered = filteredStudents.length;
                const totalPages = Math.max(1, Math.ceil(totalFiltered / adminAttPageSize));
                const currentPage = Math.min(adminAttPage, totalPages);
                const pageStart = (currentPage - 1) * adminAttPageSize;
                const pageRows = filteredStudents.slice(pageStart, pageStart + adminAttPageSize);

                const exportReport = () => {
                  const rows = filteredStudents.map((s) => {
                    const pct = percentFor(s.id);
                    return [s.name, s.className || "—", pct === null ? "No data" : `${pct}%`];
                  });
                  const rangeLabel = adminAttRangeStart && adminAttRangeEnd ? `${adminAttRangeStart} to ${adminAttRangeEnd}` : "All time";
                  downloadRowsAsPDF("Student Attendance Report", rangeLabel, ["Student", "Class", "Attendance"], rows, "student_attendance_report.pdf");
                };

                // ---- Follow-up alerts: students on a 2+ recorded-session absence streak ----
                const flagged = [];
                attendanceByStudent.forEach((rows, studentId) => {
                  const sorted = rows.filter((r) => r.status === "present" || r.status === "absent").slice().sort((a, b) => b.date.localeCompare(a.date));
                  let streak = 0;
                  const streakDates = [];
                  for (const r of sorted) {
                    if (r.status === "absent") { streak++; streakDates.push(r.date); }
                    else break;
                  }
                  if (streak >= 2) {
                    const datesAsc = streakDates.slice().reverse();
                    flagged.push({ studentId, streak, fromDate: datesAsc[0], toDate: datesAsc[datesAsc.length - 1], dates: datesAsc });
                  }
                });

                // "2026-09-02","2026-09-03" → "Sep 2, 3" — a month label only when it changes.
                const formatAbsenceDates = (dates) => {
                  let lastMonth = null;
                  return dates.map((d) => {
                    const [, m, day] = d.split("-").map(Number);
                    const monthLabel = MONTH_NAMES[m - 1].slice(0, 3);
                    const isNewMonth = monthLabel !== lastMonth;
                    lastMonth = monthLabel;
                    return isNewMonth ? `${monthLabel} ${day}` : String(day);
                  }).join(", ");
                };

                const followUpFor = (studentId) => followUps.find((f) => f.studentId === studentId) || null;

                // A follow-up resolves ITS CURRENT absence streak once the parent is marked
                // Contacted with a remark (or explicitly Resolved) — but only if that happened
                // on or after the streak's most recent absence. A fresh absence after that
                // reopens the alert (the student attending a class breaks the streak entirely,
                // handled above by `flagged` simply no longer including them).
                const isResolvedForStreak = (f) => {
                  const fu = followUpFor(f.studentId);
                  if (!fu) return false;
                  const resolved = fu.contactStatus === "resolved" || (fu.contactStatus === "contacted" && (fu.remarks || "").trim() !== "");
                  if (!resolved) return false;
                  return (fu.updatedAt || "").slice(0, 10) >= f.toDate;
                };
                const activeFlagged = flagged.filter((f) => !isResolvedForStreak(f));

                const needsContact = activeFlagged.filter((f) => {
                  const fu = followUpFor(f.studentId);
                  return !fu || fu.contactStatus === "not_contacted";
                }).length;
                const contactedToday = followUps.filter((f) => f.contactStatus === "contacted" && (f.updatedAt || "").slice(0, 10) === todayStr).length;
                const awaitingResponse = activeFlagged.filter((f) => (followUpFor(f.studentId) || {}).contactStatus === "awaiting_response").length;
                const resolvedCount = followUps.filter((f) => f.contactStatus === "resolved" || (f.contactStatus === "contacted" && (f.remarks || "").trim() !== "")).length;

                const filteredFlagged = activeFlagged
                  .map((f) => ({ ...f, student: students.find((s) => s.id === f.studentId) }))
                  .filter((f) => f.student)
                  .filter((f) => !q || f.student.name.toLowerCase().includes(q))
                  .filter((f) => !adminAttClassId || f.student.classId === adminAttClassId)
                  .filter((f) => {
                    if (!adminAttContactFilter) return true;
                    const fu = followUpFor(f.studentId);
                    const status = fu ? fu.contactStatus : "not_contacted";
                    return status === adminAttContactFilter;
                  })
                  .sort((a, b) => b.streak - a.streak);

                const contactStatusLabel = { not_contacted: "Not contacted", contacted: "Contacted", awaiting_response: "Awaiting response", resolved: "Resolved" };
                const contactStatusTheme = {
                  not_contacted: { bg: C.h, color: C.b },
                  contacted: { bg: C.i, color: C.d },
                  awaiting_response: { bg: C.t, color: C.u },
                  resolved: { bg: C.i, color: C.d },
                };

                const getDraft = (studentId) => {
                  if (followUpDrafts[studentId] !== undefined) return followUpDrafts[studentId];
                  const fu = followUpFor(studentId);
                  return { contactStatus: fu ? fu.contactStatus : "not_contacted", remarks: fu ? fu.remarks : "" };
                };
                const setDraftField = (studentId, field, value) => {
                  setFollowUpDrafts((prev) => ({ ...prev, [studentId]: { ...getDraft(studentId), [field]: value } }));
                };

                const viewStudent = adminAttViewStudentId ? students.find((s) => s.id === adminAttViewStudentId) : null;
                const viewRows = viewStudent
                  ? (attendanceByStudent.get(viewStudent.id) || [])
                      .filter((r) => r.status)
                      .slice()
                      .sort((a, b) => b.date.localeCompare(a.date))
                  : [];

                // ---- Unrecorded Attendance: scheduled classes, already ended, with no
                // attendance mark saved for one or more of their students ----
                const unrecordedGroups = (() => {
                  const now = new Date();
                  const nowTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                  const LOOKBACK_DAYS = 14;
                  const recordedSet = new Set(
                    adminAllAttendance.filter((r) => r.status).map((r) => `${r.studentId}:${r.date}`)
                  );
                  const groups = new Map();
                  for (let i = 0; i < LOOKBACK_DAYS; i++) {
                    const d = new Date(now);
                    d.setDate(d.getDate() - i);
                    const dateStr = fmtDateStr(d);
                    if (isHoliday(dateStr)) continue;
                    const isToday = dateStr === todayStr;
                    const weekday = weekdayAbbrev(dateStr);
                    scheduleRows.filter((r) => r.day === weekday).forEach((r) => {
                      if (isToday && r.endTime > nowTimeStr) return; // class hasn't ended yet today
                      if (recordedSet.has(`${r.studentId}:${dateStr}`)) return;
                      const key = `${dateStr}|${r.className}|${r.teacherId}`;
                      if (!groups.has(key)) {
                        groups.set(key, { date: dateStr, className: r.className, teacherId: r.teacherId, startTime: r.startTime, endTime: r.endTime, studentCount: 0 });
                      }
                      groups.get(key).studentCount++;
                    });
                  }
                  return Array.from(groups.values()).sort((a, b) => b.date.localeCompare(a.date) || a.className.localeCompare(b.className));
                })();

                const dismissalFor = (teacherId) => unrecordedDismissals.find((d) => d.teacherId === teacherId) || null;
                const activeUnrecordedGroups = unrecordedGroups.filter((g) => {
                  const d = dismissalFor(g.teacherId);
                  if (!d) return true;
                  return g.date > (d.dismissedAt || "").slice(0, 10);
                });

                const unrecordedByTeacher = (() => {
                  const map = new Map();
                  activeUnrecordedGroups.forEach((g) => {
                    if (!map.has(g.teacherId)) map.set(g.teacherId, []);
                    map.get(g.teacherId).push(g);
                  });
                  return Array.from(map.entries())
                    .map(([teacherId, groups]) => ({ teacherId, teacherLabel: teacherName(teacherId), groups, count: groups.length }))
                    .sort((a, b) => b.count - a.count || a.teacherLabel.localeCompare(b.teacherLabel));
                })();

                const openUnrecordedTeacher = adminAttUnrecordedTeacherId
                  ? unrecordedByTeacher.find((t) => t.teacherId === adminAttUnrecordedTeacherId)
                  : null;

                return (
                  <div className="tp-adminattendance-page">
                    <style>{`
                      .tp-adminattendance-page { position: relative; margin: -28px -32px; padding: 32px; min-height: calc(100% + 56px); overflow: hidden; box-sizing: border-box; }
                      @media (max-width: 820px) {
                        .tp-adminattendance-page { margin: -18px -16px; padding: 24px; min-height: calc(100% + 36px); }
                      }
                      @media (max-width: 640px) {
                        .tp-adminattendance-page { padding: 20px; }
                      }
                      .tp-alert-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: #D9573A; color: #FFFFFF; font-size: 11px; font-weight: 700; margin-left: 8px; }
                    `}</style>
                    <div className="tp-header">
                      <div className="tp-title-group">
                        <span className="tp-title-icon" aria-hidden="true"><ClipboardCheck size={22} /></span>
                        <div>
                          <h1 className="tp-title">Student Attendance</h1>
                          <div className="tp-subtext" style={{ margin: 0 }}>Monitor student attendance</div>
                        </div>
                      </div>
                      {adminAttRecordsLoading && (
                        <span style={{ fontSize: "13px", color: TP.secondaryText, display: "inline-flex", alignItems: "center" }}>
                          <span className="lc-spinner"></span>Loading…
                        </span>
                      )}
                    </div>

                    <div className="tp-segment" role="group" aria-label="Attendance view">
                      <button
                        type="button"
                        aria-pressed={adminAttendanceView === "records"}
                        className={`tp-segment-btn ${adminAttendanceView === "records" ? "tp-segment-btn-active" : ""}`}
                        onClick={() => { setAdminAttendanceView("records"); setAdminAttUnrecordedTeacherId(null); }}
                      >
                        Student Records
                      </button>
                      <button
                        type="button"
                        aria-pressed={adminAttendanceView === "alerts"}
                        className={`tp-segment-btn ${adminAttendanceView === "alerts" ? "tp-segment-btn-active" : ""}`}
                        onClick={() => { setAdminAttendanceView("alerts"); setAdminAttUnrecordedTeacherId(null); }}
                      >
                        Follow-up Alerts
                        {activeFlagged.length > 0 && <span className="tp-alert-badge">{activeFlagged.length}</span>}
                      </button>
                      <button
                        type="button"
                        aria-pressed={adminAttendanceView === "unrecorded"}
                        className={`tp-segment-btn ${adminAttendanceView === "unrecorded" ? "tp-segment-btn-active" : ""}`}
                        onClick={() => setAdminAttendanceView("unrecorded")}
                      >
                        Unrecorded Attendance
                        {activeUnrecordedGroups.length > 0 && <span className="tp-alert-badge">{activeUnrecordedGroups.length}</span>}
                      </button>
                    </div>

                    <div className="tp-card">
                      {adminAttendanceView !== "unrecorded" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
                          <div className="lc-search-wrap" style={{ maxWidth: "280px" }}>
                            <Search size={16} aria-hidden="true" color={C.a} />
                            <input
                              className="lc-input"
                              value={adminAttSearch}
                              onChange={(e) => { setAdminAttSearch(e.target.value); setAdminAttPage(1); }}
                              placeholder="Search student…"
                            />
                            {adminAttSearch && (
                              <button className="lc-search-clear" onClick={() => setAdminAttSearch("")} aria-label="Clear search"><X size={14} /></button>
                            )}
                          </div>
                          <SearchableSelect
                            style={{ maxWidth: "220px" }}
                            value={adminAttClassId}
                            onChange={(val) => { setAdminAttClassId(val); setAdminAttPage(1); }}
                            placeholder="All Classes"
                            options={classes.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: c.name }))}
                          />
                          {adminAttendanceView === "records" ? (
                            <>
                              <label className="tp-date-picker">
                                <CalendarDays size={16} aria-hidden="true" />
                                <input type="date" aria-label="From date" value={adminAttRangeStart} onChange={(e) => setAdminAttRangeStart(e.target.value)} />
                                <span style={{ color: TP.secondaryText }}>–</span>
                                <input type="date" aria-label="To date" value={adminAttRangeEnd} onChange={(e) => setAdminAttRangeEnd(e.target.value)} />
                              </label>
                              <button type="button" className="tp-btn-gradient" onClick={exportReport} style={{ marginLeft: "auto" }}>
                                <FileText size={16} aria-hidden="true" />
                                Export Report
                              </button>
                            </>
                          ) : (
                            <select
                              className="lc-select"
                              style={{ maxWidth: "200px" }}
                              value={adminAttContactFilter}
                              onChange={(e) => setAdminAttContactFilter(e.target.value)}
                            >
                              <option value="">Contact Status</option>
                              {Object.entries(contactStatusLabel).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                            </select>
                          )}
                        </div>
                      )}

                      {adminAttendanceView === "records" ? (
                        <>
                          {pageRows.length === 0 ? (
                            <div className="lc-empty-state">
                              <Users size={32} aria-hidden="true" />
                              <div>No students match your filters.</div>
                            </div>
                          ) : (
                            <div className="lc-table-wrap">
                              <table className="lc-table">
                                <thead>
                                  <tr>
                                    <th>Student</th>
                                    <th>Class</th>
                                    <th>Attendance</th>
                                    <th>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pageRows.map((s) => {
                                    const pct = percentFor(s.id);
                                    const theme = percentTheme(pct);
                                    const avatar = classBadgeStyle(studentInitials(s.name));
                                    return (
                                      <tr key={s.id}>
                                        <td>
                                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <span style={{ width: "34px", height: "34px", borderRadius: "50%", background: avatar.bg, color: avatar.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px", flexShrink: 0 }}>
                                              {studentInitials(s.name)}
                                            </span>
                                            <span style={{ fontWeight: 600 }}>{s.name}</span>
                                          </div>
                                        </td>
                                        <td>{s.className || "—"}</td>
                                        <td>
                                          <span style={{ display: "inline-block", fontSize: "13px", fontWeight: 700, padding: "4px 12px", borderRadius: "999px", background: theme.bg, color: theme.color }}>
                                            {pct === null ? "No data" : `${pct}%`}
                                          </span>
                                        </td>
                                        <td>
                                          <button type="button" className="lc-btn" onClick={() => setAdminAttViewStudentId(s.id)}>View Attendance</button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginTop: "18px" }}>
                            <div style={{ fontSize: "13px", color: C.a }}>
                              Showing {totalFiltered === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + adminAttPageSize, totalFiltered)} of {totalFiltered}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <button className="lc-btn" disabled={currentPage <= 1} onClick={() => setAdminAttPage(currentPage - 1)}>Previous</button>
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <button
                                  key={p}
                                  className="lc-btn"
                                  style={p === currentPage ? { background: TP.blue, color: "#FFFFFF", borderColor: TP.blue } : {}}
                                  onClick={() => setAdminAttPage(p)}
                                >
                                  {p}
                                </button>
                              ))}
                              <button className="lc-btn" disabled={currentPage >= totalPages} onClick={() => setAdminAttPage(currentPage + 1)}>Next</button>
                              <select
                                className="lc-select"
                                style={{ width: "auto" }}
                                value={adminAttPageSize}
                                onChange={(e) => { setAdminAttPageSize(Number(e.target.value)); setAdminAttPage(1); }}
                              >
                                {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} per page</option>)}
                              </select>
                            </div>
                          </div>
                        </>
                      ) : adminAttendanceView === "alerts" ? (
                        <>
                          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "22px" }}>
                            {[
                              { label: "Needs Contact", value: needsContact, icon: AlertTriangle, bg: C.h, color: C.b },
                              { label: "Contacted Today", value: contactedToday, icon: Phone, bg: C.v, color: TP.blue },
                              { label: "Awaiting Response", value: awaitingResponse, icon: Clock, bg: C.t, color: C.u },
                              { label: "Resolved", value: resolvedCount, icon: CheckCircle2, bg: C.i, color: C.d },
                            ].map((chip) => (
                              <div key={chip.label} className="lc-stat-card" style={{ flex: "1 1 200px", padding: "14px 18px" }}>
                                <div className="lc-stat-icon" style={{ background: chip.bg, width: "40px", height: "40px", borderRadius: "10px" }}>
                                  <chip.icon size={18} color={chip.color} aria-hidden="true" />
                                </div>
                                <div>
                                  <div className="lc-stat-value" style={{ fontSize: "22px" }}><CountUp value={chip.value} /></div>
                                  <div className="lc-stat-label">{chip.label}</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {filteredFlagged.length === 0 ? (
                            <div className="lc-empty-state">
                              <CheckCircle2 size={32} aria-hidden="true" />
                              <div>No follow-up alerts right now.</div>
                            </div>
                          ) : (
                            <div className="lc-table-wrap">
                              <table className="lc-table">
                                <thead>
                                  <tr>
                                    <th>Student</th>
                                    <th>Class</th>
                                    <th>Absence</th>
                                    <th>Phone</th>
                                    <th>Contact Status</th>
                                    <th>Remarks</th>
                                    <th>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredFlagged.map((f) => {
                                    const draft = getDraft(f.studentId);
                                    const theme = contactStatusTheme[draft.contactStatus] || contactStatusTheme.not_contacted;
                                    return (
                                      <tr key={f.studentId}>
                                        <td style={{ fontWeight: 600 }}>{f.student.name}</td>
                                        <td>{f.student.className || "—"}</td>
                                        <td>
                                          <span style={{ display: "inline-block", fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", background: C.h, color: C.b, whiteSpace: "nowrap" }}>
                                            Absent {f.streak} day{f.streak === 1 ? "" : "s"}
                                          </span>
                                          <div style={{ fontSize: "12px", color: C.a, marginTop: "4px" }}>
                                            {formatAbsenceDates(f.dates)}
                                          </div>
                                        </td>
                                        <td style={{ whiteSpace: "nowrap" }}>{f.student.phone || "—"}</td>
                                        <td>
                                          <select
                                            className="lc-select"
                                            style={{ fontWeight: 700, color: theme.color, background: theme.bg, border: "none", minWidth: "150px" }}
                                            value={draft.contactStatus}
                                            onChange={(e) => setDraftField(f.studentId, "contactStatus", e.target.value)}
                                          >
                                            {Object.entries(contactStatusLabel).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                                          </select>
                                        </td>
                                        <td style={{ minWidth: "180px" }}>
                                          <textarea
                                            className="lc-input"
                                            rows={2}
                                            style={{ resize: "vertical" }}
                                            value={draft.remarks}
                                            onChange={(e) => setDraftField(f.studentId, "remarks", e.target.value)}
                                            placeholder="Write a remark…"
                                          />
                                        </td>
                                        <td>
                                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                            <button type="button" className="lc-btn" onClick={() => setAdminAttViewStudentId(f.studentId)}>View Attendance</button>
                                            <button
                                              type="button"
                                              className="lc-btn lc-btn-primary"
                                              disabled={followUpSavingId === f.studentId}
                                              onClick={() => saveFollowUp(f.studentId, draft.contactStatus, draft.remarks)}
                                            >
                                              {followUpSavingId === f.studentId ? "Saving…" : "Save Follow-up"}
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      ) : !openUnrecordedTeacher ? (
                        <>
                          {unrecordedByTeacher.length === 0 ? (
                            <div className="lc-empty-state">
                              <CheckCircle2 size={32} aria-hidden="true" />
                              <div>All attendance is up to date.</div>
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                              {unrecordedByTeacher.map((t) => (
                                <div key={t.teacherId} className="tp-accordion-row" style={{ cursor: "default" }}>
                                  <button
                                    type="button"
                                    onClick={() => setAdminAttUnrecordedTeacherId(t.teacherId)}
                                    style={{ flex: 1, display: "flex", alignItems: "center", gap: "14px", background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", textAlign: "left" }}
                                  >
                                    <ChevronRight size={18} aria-hidden="true" />
                                    <span className="tp-accordion-title" style={{ flex: "none" }}>{t.teacherLabel}</span>
                                    <span className="tp-count-badge">{t.count} unrecorded class{t.count === 1 ? "" : "es"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="lc-btn lc-btn-danger"
                                    style={{ padding: "6px 12px", fontSize: "12px", flexShrink: 0 }}
                                    disabled={unrecordedDismissingId === t.teacherId}
                                    onClick={() => dismissUnrecordedForTeacher(t.teacherId)}
                                  >
                                    {unrecordedDismissingId === t.teacherId ? "…" : "Delete"}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
                            <button type="button" className="lc-btn" onClick={() => setAdminAttUnrecordedTeacherId(null)}>
                              <ChevronLeft size={14} aria-hidden="true" style={{ marginRight: "4px", verticalAlign: "-2px" }} />
                              All teachers
                            </button>
                            <button
                              type="button"
                              className="lc-btn lc-btn-danger"
                              disabled={unrecordedDismissingId === openUnrecordedTeacher.teacherId}
                              onClick={() => dismissUnrecordedForTeacher(openUnrecordedTeacher.teacherId)}
                            >
                              {unrecordedDismissingId === openUnrecordedTeacher.teacherId ? "Deleting…" : "Delete all for this teacher"}
                            </button>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "14px" }}>{openUnrecordedTeacher.teacherLabel}</div>
                          <div className="lc-table-wrap">
                            <table className="lc-table">
                              <thead>
                                <tr>
                                  <th>Class</th>
                                  <th>Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {openUnrecordedTeacher.groups.map((g) => {
                                  const code = classCode(g.className);
                                  const badge = classBadgeStyle(code);
                                  return (
                                    <tr key={`${g.date}|${g.className}`}>
                                      <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                          <span className="tp-code-badge" style={{ background: badge.bg, color: badge.color }}>{code}</span>
                                          <div>
                                            <div style={{ fontWeight: 600 }}>{g.className}</div>
                                            <div style={{ fontSize: "12px", color: C.a }}>
                                              {fmtTime12(g.startTime)} – {fmtTime12(g.endTime)} · {g.studentCount} student{g.studentCount === 1 ? "" : "s"}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                      <td>{weekdayAbbrev(g.date)}, {g.date}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>

                    {viewStudent && (
                      <div className="lc-modal-backdrop" onClick={() => setAdminAttViewStudentId(null)}>
                        <div className="lc-modal-sheet" onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                            <div style={{ fontWeight: 700, fontSize: "16px" }}>{viewStudent.name}</div>
                            <button className="lc-btn" style={{ padding: "6px 10px" }} onClick={() => setAdminAttViewStudentId(null)} aria-label="Close"><X size={16} /></button>
                          </div>
                          <div style={{ fontSize: "12px", color: C.a, marginBottom: "14px" }}>{viewStudent.className || "—"}</div>
                          {viewRows.length === 0 ? (
                            <div style={{ color: C.a, fontSize: "14px" }}>No attendance recorded yet.</div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "50vh", overflowY: "auto" }}>
                              {viewRows.map((r) => (
                                <div key={r.date} className="lc-card" style={{ padding: "10px 14px", margin: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: "13px" }}>{weekdayAbbrev(r.date)}, {r.date}</span>
                                  {r.status === "present" && <span className="lc-badge lc-badge-paid">Present</span>}
                                  {r.status === "absent" && <span className="lc-badge lc-badge-pending">Absent</span>}
                                  {r.status === "cancelled" && <span className="lc-badge lc-badge-neutral">Cancelled</span>}
                                  {r.status === "rescheduled" && <span className="lc-badge lc-badge-move">Rescheduled</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* ---------------- EXAMS (admin) ---------------- */}
              {section === "exams" && role === "admin" && (() => {
                const q = adminExamSearch.trim().toLowerCase();
                const filteredExams = adminExamReports
                  .filter((e) => !q || e.studentName.toLowerCase().includes(q))
                  .filter((e) => !adminExamTeacherId || e.teacherId === adminExamTeacherId)
                  .filter((e) => !adminExamResultFilter || e.finalResult === adminExamResultFilter);

                const resultBadge = (result) => (
                  <span
                    style={{
                      display: "inline-block", fontSize: "12px", fontWeight: 700, padding: "4px 12px", borderRadius: "999px",
                      background: result === "pass" ? C.i : C.h, color: result === "pass" ? C.d : C.b,
                    }}
                  >
                    {result === "pass" ? "Pass" : "Not Passed"}
                  </span>
                );

                const filenameFor = (exam) => `${exam.studentName.replace(/\s+/g, "_")}_${exam.examDate}_hifz_exam`;
                const viewingExam = adminViewExamId ? adminExamReports.find((e) => e.id === adminViewExamId) : null;

                return (
                  <div className="tp-adminexams-page">
                    <style>{`
                      .tp-adminexams-page { position: relative; margin: -28px -32px; padding: 32px; min-height: calc(100% + 56px); overflow: hidden; box-sizing: border-box; }
                      @media (max-width: 820px) {
                        .tp-adminexams-page { margin: -18px -16px; padding: 24px; min-height: calc(100% + 36px); }
                      }
                      @media (max-width: 640px) {
                        .tp-adminexams-page { padding: 20px; }
                      }
                    `}</style>
                    <div className="tp-header">
                      <div className="tp-title-group">
                        <span className="tp-title-icon" aria-hidden="true"><FileText size={22} /></span>
                        <div>
                          <h1 className="tp-title">Exam Reports</h1>
                          <div className="tp-subtext" style={{ margin: 0 }}>Hifz exams submitted by every teacher</div>
                        </div>
                      </div>
                      {adminExamReportsLoading && (
                        <span style={{ fontSize: "13px", color: TP.secondaryText, display: "inline-flex", alignItems: "center" }}>
                          <span className="lc-spinner"></span>Loading…
                        </span>
                      )}
                    </div>

                    <div className="tp-card">
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
                        <div className="lc-search-wrap" style={{ maxWidth: "280px" }}>
                          <Search size={16} aria-hidden="true" color={C.a} />
                          <input
                            className="lc-input"
                            value={adminExamSearch}
                            onChange={(e) => setAdminExamSearch(e.target.value)}
                            placeholder="Search student…"
                          />
                          {adminExamSearch && (
                            <button className="lc-search-clear" onClick={() => setAdminExamSearch("")} aria-label="Clear search"><X size={14} /></button>
                          )}
                        </div>
                        <SearchableSelect
                          style={{ maxWidth: "220px" }}
                          value={adminExamTeacherId}
                          onChange={setAdminExamTeacherId}
                          placeholder="All Teachers"
                          options={teachers.slice().sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ value: t.id, label: t.name }))}
                        />
                        <select
                          className="lc-select"
                          style={{ maxWidth: "180px" }}
                          value={adminExamResultFilter}
                          onChange={(e) => setAdminExamResultFilter(e.target.value)}
                        >
                          <option value="">All Results</option>
                          <option value="pass">Pass</option>
                          <option value="not_passed">Not Passed</option>
                        </select>
                      </div>

                      {filteredExams.length === 0 ? (
                        <div className="lc-empty-state">
                          <FileText size={32} aria-hidden="true" />
                          <div>No exam reports match your filters.</div>
                        </div>
                      ) : (
                        <div className="lc-table-wrap">
                          <table className="lc-table">
                            <thead>
                              <tr>
                                <th>Student</th>
                                <th>Exam date</th>
                                <th>Teacher</th>
                                <th>Final result</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredExams.map((exam) => (
                                <tr key={exam.id}>
                                  <td style={{ fontWeight: 600 }}>{exam.studentName}</td>
                                  <td>{exam.examDate}</td>
                                  <td>{teacherName(exam.teacherId)}</td>
                                  <td>{resultBadge(exam.finalResult)}</td>
                                  <td>
                                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                      <button type="button" className="lc-btn" onClick={() => setAdminViewExamId(exam.id)}>
                                        <FileText size={14} aria-hidden="true" style={{ marginRight: "4px", verticalAlign: "-2px" }} />
                                        View Report
                                      </button>
                                      <button type="button" className="lc-btn" onClick={() => downloadExamReportAsPDF(exam, teacherName(exam.teacherId), `${filenameFor(exam)}.pdf`)}>
                                        Download PDF
                                      </button>
                                      <button
                                        type="button"
                                        className="lc-btn lc-btn-danger"
                                        disabled={adminExamDeletingId === exam.id}
                                        onClick={() => deleteAdminExam(exam.id)}
                                      >
                                        {adminExamDeletingId === exam.id ? "Deleting…" : "Delete"}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {viewingExam && (
                      <div className="lc-modal-backdrop" onClick={() => setAdminViewExamId(null)}>
                        <div className="lc-modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "640px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                            <div style={{ fontWeight: 700, fontSize: "16px" }}>{viewingExam.studentName}</div>
                            <button className="lc-btn" style={{ padding: "6px 10px" }} onClick={() => setAdminViewExamId(null)} aria-label="Close"><X size={16} /></button>
                          </div>
                          <div style={{ fontSize: "13px", color: C.a, marginBottom: "10px" }}>
                            {viewingExam.examDate} · {teacherName(viewingExam.teacherId)}
                          </div>
                          <div style={{ marginBottom: "16px" }}>{resultBadge(viewingExam.finalResult)}</div>

                          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Questions</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                            {viewingExam.questions.length === 0 ? (
                              <div style={{ fontSize: "13px", color: C.a }}>No questions recorded.</div>
                            ) : viewingExam.questions.map((q, i) => (
                              <div key={i} className="lc-card" style={{ padding: "10px 14px", margin: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
                                  <span style={{ fontWeight: 600, fontSize: "13px" }}>Q{i + 1} · {q.questionType || "—"}</span>
                                  <span style={{ fontSize: "12px", fontWeight: 700, color: q.result === "correct" ? C.d : C.b }}>
                                    {q.result === "correct" ? "Correct" : "Incorrect"}
                                  </span>
                                </div>
                                <div style={{ fontSize: "12px", color: C.a }}>
                                  {(q.surah ?? q.startSurah) || "—"}{(q.ayah ?? q.startAyah) ? `:${q.ayah ?? q.startAyah}` : ""}
                                </div>
                                {q.remark && <div style={{ fontSize: "13px", marginTop: "4px" }}>{q.remark}</div>}
                              </div>
                            ))}
                          </div>

                          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>Recitation comments</div>
                          <div style={{ fontSize: "13px", color: viewingExam.comments ? C.w : C.a, marginBottom: "18px", whiteSpace: "pre-wrap" }}>
                            {viewingExam.comments || "No comments recorded."}
                          </div>

                          <button
                            type="button"
                            className="lc-btn lc-btn-primary"
                            style={{ width: "100%" }}
                            onClick={() => downloadExamReportAsPDF(viewingExam, teacherName(viewingExam.teacherId), `${filenameFor(viewingExam)}.pdf`)}
                          >
                            Download PDF
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </AdminPortalLayout>
      )}
      {toast && <div className="lc-toast no-print">{toast}</div>}
    </div>
  );
}
