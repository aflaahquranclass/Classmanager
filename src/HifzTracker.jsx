// Student portal: Hifz Tracker. The teacher plans the Hifz — New Hifz,
// Short and Long Muraja'ah portions for each day — and the student reads each
// one in the Madinah Mushaf, sees the mistakes the teacher highlighted, and
// ticks it done. Progress, streaks and revision come from the ticked tasks
// (see hifz/tasks.js). Updates from the teacher arrive live.
//
// HIFZ_CSS and PositionPicker are shared with the teacher's screens.

import { useState, useEffect, useCallback } from "react";
import { BookOpenText, RotateCw, History, CalendarDays, CheckCircle2, Clock, ChevronLeft, ChevronRight, AlertTriangle, X, BookOpen, Highlighter, CalendarClock } from "lucide-react";
import { TP } from "./App.jsx";
import { SURAHS, JUZ_START_PAGES, TOTAL_PAGES, TOTAL_UNITS, UNITS_PER_PAGE, UNITS_PER_LINE, pageToUnit, unitToPage, juzStartUnit, juzEndUnit, surahsOnPages, describeRange, describeAmount } from "./hifz/quran.js";
import { unitsOf, intersect } from "./hifz/engine.js";
import { nearestAyahs } from "./hifz/ayahs.js";
import { ACTIVITY_TITLES, taskPages, mistakesForTask, mistakeInTask, ayahAtLine, unitOfAyah, describeAyahs } from "./hifz/tasks.js";
import { SURAH_AYAH_COUNTS } from "./hifz/ayahs.js";
import { loadHifz } from "./hifz/taskService.js";
import MushafPage from "./thilawa/MushafPage.jsx";

export const ACTIVITY_INFO = {
  new: { title: ACTIVITY_TITLES.new, Icon: BookOpenText },
  short: { title: ACTIVITY_TITLES.short, Icon: RotateCw },
  long: { title: ACTIVITY_TITLES.long, Icon: History },
};

export const fmtDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const fmtDay = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
export const surahEndPage = (i) => (i + 1 < SURAHS.length ? Math.max(SURAHS[i].startPage, SURAHS[i + 1].startPage - 1) : TOTAL_PAGES);
// Surahs in a range, from the ayah data (accurate even when a surah starts mid-page).
export const surahNames = (range) => {
  const { first, last } = nearestAyahs(range);
  return SURAHS.slice(first.surah - 1, last.surah).map((x) => x.name).join(", ");
};

// Surahs / juz whose pages are all memorized (page-level approximation).
export function completedCounts(memorizedRanges) {
  const covered = (r) => unitsOf(intersect([r], memorizedRanges)) === r[1] - r[0];
  const surahs = SURAHS.filter((s, i) => covered([pageToUnit(s.startPage), pageToUnit(surahEndPage(i) + 1)])).length;
  const juz = JUZ_START_PAGES.filter((_, i) => covered([juzStartUnit(i + 1), juzEndUnit(i + 1)])).length;
  return { surahs, juz };
}

export const HIFZ_CSS = `
  .hz { display: flex; flex-direction: column; gap: 18px; }
  .hz-card { position: relative; background: rgba(255,255,255,0.94); border: 1px solid #DCEBF8; border-radius: 18px; box-shadow: 0 10px 30px rgba(18,59,103,0.08); padding: 20px; }
  .hz-h2 { margin: 0 0 14px; font-size: 19px; font-weight: 700; color: #0F2F8A; display: flex; align-items: center; gap: 10px; }
  .hz-h2 svg { color: ${TP.blue}; flex-shrink: 0; }
  .hz-muted { color: ${TP.secondaryText}; font-size: 14px; }
  .hz-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .hz-big { font-size: 30px; font-weight: 700; color: #1452A8; }
  .hz-bar { height: 14px; border-radius: 999px; background: #E3EAF1; overflow: hidden; }
  .hz-bar > div { height: 100%; border-radius: inherit; background: linear-gradient(90deg, ${TP.gradStart}, ${TP.blue} 45%, #22D3E0); transition: width 0.6s ease; }
  .hz-bar-sm { height: 8px; }
  .hz-kv { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
  .hz-kv div { background: #F3F8FD; border: 1px solid #E1EDF8; border-radius: 12px; padding: 10px 12px; }
  .hz-kv span { display: block; font-size: 12px; color: ${TP.secondaryText}; }
  .hz-kv strong { display: block; font-size: 15px; color: ${TP.navy}; margin-top: 2px; }
  .hz-note { display: flex; gap: 10px; align-items: flex-start; background: #FFF7E8; border: 1px solid #F1D39A; color: #7A5410; border-radius: 12px; padding: 10px 12px; font-size: 14px; margin-top: 14px; }
  .hz-note svg { flex-shrink: 0; margin-top: 1px; }
  .hz-tasks { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
  .hz-task { border: 1px solid #DCEBF8; border-radius: 16px; padding: 16px; background: #FFFFFF; display: flex; flex-direction: column; gap: 10px; transition: border-color 0.2s, background 0.2s; }
  .hz-task-done { background: linear-gradient(160deg, #ECFAF4, #FFFFFF 60%); border-color: #9FD9BE; }
  .hz-task-head { display: flex; align-items: center; gap: 10px; }
  .hz-task-icon { width: 38px; height: 38px; border-radius: 11px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, ${TP.gradStart}, ${TP.gradEnd}); color: #FFFFFF; flex-shrink: 0; }
  .hz-task-done .hz-task-icon { background: #1E8A5A; }
  .hz-task-title { font-weight: 700; color: ${TP.navy}; font-size: 16px; flex: 1; }
  .hz-badge { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
  .hz-badge-completed { background: #DDF5E9; color: #156B45; }
  .hz-badge-partial { background: #FCF1DD; color: #9C6B12; }
  .hz-badge-pending { background: #EAF3FC; color: #1D5FA8; }
  .hz-badge-empty { background: #EEF0F3; color: #5B6B79; }
  .hz-portion { font-size: 15px; color: ${TP.navy}; font-weight: 600; }
  .hz-portion small { display: block; font-weight: 400; color: ${TP.secondaryText}; font-size: 13px; }
  .hz-portion .hz-ayah { color: ${TP.blue}; font-weight: 600; }
  .hz-carry { font-size: 12px; font-weight: 700; color: #9C6B12; background: #FCF1DD; border-radius: 6px; padding: 1px 6px; margin-left: 6px; }
  .hz-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 16px; border-radius: 12px; border: none; font: inherit; font-weight: 700; font-size: 14px; cursor: pointer; }
  .hz-btn:disabled { opacity: 0.55; cursor: default; }
  .hz-btn-primary { background: linear-gradient(90deg, ${TP.blue}, ${TP.teal}); color: #FFFFFF; box-shadow: 0 8px 18px rgba(23,111,209,0.25); }
  .hz-btn-outline { background: #FFFFFF; color: ${TP.navy}; border: 1px solid ${TP.border}; }
  .hz-btn-ghost { background: transparent; color: ${TP.blue}; padding: 0 8px; }
  .hz-btn:focus-visible, .hz-select:focus-visible, .hz-input:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
  .hz-select, .hz-input { min-height: 44px; border: 1px solid ${TP.border}; border-radius: 12px; padding: 0 12px; font: inherit; font-size: 15px; color: ${TP.navy}; background: #FFFFFF; width: 100%; box-sizing: border-box; }
  .hz-partial { display: flex; gap: 8px; }
  .hz-partial .hz-select { flex: 1; min-width: 0; }
  .hz-streak { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; text-align: center; }
  .hz-streak div { background: #F3F8FD; border-radius: 12px; padding: 12px 6px; }
  .hz-streak strong { display: block; font-size: 24px; color: #1452A8; }
  .hz-streak span { font-size: 12px; color: ${TP.secondaryText}; }
  .hz-cal { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; margin-top: 14px; }
  .hz-cal div { aspect-ratio: 1; border-radius: 8px; background: #EEF3F8; display: flex; align-items: center; justify-content: center; font-size: 11px; color: ${TP.secondaryText}; }
  .hz-cal .on { background: linear-gradient(135deg, ${TP.blue}, ${TP.teal}); color: #FFFFFF; font-weight: 700; }
  .hz-cal .today { box-shadow: inset 0 0 0 2px ${TP.navy}; }
  .hz-rev { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
  .hz-rev > div { background: #F7FAFD; border: 1px solid #E1EDF8; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
  .hz-pending-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
  .hz-pending-list li { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; font-size: 14px; color: ${TP.navy}; }
  .hz-pending-list b { min-width: 130px; }
  .hz-error { background: #FBEAE6; color: #A5432C; border-radius: 12px; padding: 10px 12px; font-size: 14px; }

  .hz-wiz-steps { display: flex; gap: 6px; margin-bottom: 18px; }
  .hz-wiz-steps span { flex: 1; height: 6px; border-radius: 999px; background: #E3EAF1; }
  .hz-wiz-steps span.on { background: linear-gradient(90deg, ${TP.blue}, ${TP.teal}); }
  .hz-q { font-size: 20px; font-weight: 700; color: #0F2F8A; margin: 0 0 6px; }
  .hz-field { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; }
  .hz-field > label, .hz-field > span { font-size: 14px; font-weight: 600; color: ${TP.navy}; }
  .hz-grid3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .hz-options { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-top: 14px; }
  .hz-option { min-height: 52px; border-radius: 14px; border: 1px solid ${TP.border}; background: #FFFFFF; color: ${TP.navy}; font: inherit; font-weight: 600; font-size: 15px; cursor: pointer; padding: 10px; text-align: center; }
  .hz-option small { display: block; font-weight: 400; font-size: 12px; color: ${TP.secondaryText}; margin-top: 2px; }
  .hz-option[aria-pressed="true"] { background: linear-gradient(135deg, ${TP.gradStart}, ${TP.blue}); color: #FFFFFF; border-color: transparent; }
  .hz-option[aria-pressed="true"] small { color: rgba(255,255,255,0.85); }
  .hz-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .hz-chip { min-width: 44px; min-height: 40px; border-radius: 10px; border: 1px solid ${TP.border}; background: #FFFFFF; color: ${TP.navy}; font: inherit; font-size: 14px; cursor: pointer; }
  .hz-chip[aria-pressed="true"] { background: ${TP.blue}; color: #FFFFFF; border-color: ${TP.blue}; }
  .hz-wiz-nav { display: flex; justify-content: space-between; gap: 10px; margin-top: 22px; }
  .hz-modal-back { position: fixed; inset: 0; background: rgba(13,40,70,0.45); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 50; }
  .hz-modal { background: #FFFFFF; border-radius: 18px; padding: 22px; max-width: 460px; width: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.25); }
  .hz-modal ul { padding-left: 18px; color: ${TP.navy}; font-size: 14px; line-height: 1.5; }

  /* ---------- animations ---------- */
  @keyframes hz-rise { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: none; } }
  @keyframes hz-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes hz-done { 0% { transform: scale(1); } 35% { transform: scale(1.035); box-shadow: 0 0 0 8px rgba(30,138,90,0.15); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(30,138,90,0); } }
  @keyframes hz-check { 0% { transform: scale(0) rotate(-45deg); } 60% { transform: scale(1.25) rotate(8deg); } 100% { transform: scale(1) rotate(0); } }
  @keyframes hz-cell { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: none; } }
  @keyframes hz-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(23,111,209,0.35); } 50% { box-shadow: 0 0 0 5px rgba(23,111,209,0); } }
  @keyframes hz-slide { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }

  .hz > * { animation: hz-rise 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
  .hz > *:nth-child(2) { animation-delay: 0.08s; }
  .hz > *:nth-child(3) { animation-delay: 0.16s; }
  .hz > *:nth-child(4) { animation-delay: 0.24s; }
  .hz > *:nth-child(5) { animation-delay: 0.32s; }
  .hz > *:nth-child(6) { animation-delay: 0.4s; }
  .hz-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
  .hz > .hz-card:hover { transform: translateY(-3px); box-shadow: 0 16px 36px rgba(18,59,103,0.13); }

  .hz-task { animation: hz-rise 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) both; transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.3s, background 0.3s; }
  .hz-task:nth-child(1) { animation-delay: 0.2s; }
  .hz-task:nth-child(2) { animation-delay: 0.3s; }
  .hz-task:nth-child(3) { animation-delay: 0.4s; }
  .hz-task:hover { transform: translateY(-4px); box-shadow: 0 14px 30px rgba(23,111,209,0.16); }
  .hz-task-icon { transition: transform 0.3s ease, background 0.3s; }
  .hz-task:hover .hz-task-icon { transform: rotate(-8deg) scale(1.08); }
  .hz-task-done { animation: hz-done 0.7s ease both; }
  .hz-task-done .hz-task-icon svg { animation: hz-check 0.55s cubic-bezier(0.3, 1.5, 0.5, 1) both; }
  .hz-badge { transition: background 0.3s, color 0.3s; animation: hz-cell 0.35s ease both; }
  .hz-btn { transition: transform 0.15s ease, box-shadow 0.2s ease, filter 0.2s; }
  .hz-btn:not(:disabled):hover { transform: translateY(-1px); filter: brightness(1.05); }
  .hz-btn:not(:disabled):active { transform: scale(0.97); }
  .hz-option, .hz-chip { transition: transform 0.15s ease, background 0.2s, color 0.2s, box-shadow 0.2s; }
  .hz-option:hover, .hz-chip:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(23,111,209,0.14); }

  .hz-bar > div { transform-origin: left center; animation: hz-grow 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s both; }
  .hz-cal div { animation: hz-cell 0.35s ease both; }
  .hz-cal div:nth-child(7n+1) { animation-delay: 0.05s; } .hz-cal div:nth-child(7n+2) { animation-delay: 0.1s; }
  .hz-cal div:nth-child(7n+3) { animation-delay: 0.15s; } .hz-cal div:nth-child(7n+4) { animation-delay: 0.2s; }
  .hz-cal div:nth-child(7n+5) { animation-delay: 0.25s; } .hz-cal div:nth-child(7n+6) { animation-delay: 0.3s; }
  .hz-cal div:nth-child(7n) { animation-delay: 0.35s; }
  .hz-cal .on.today { animation: hz-cell 0.35s ease both, hz-glow 2s ease-in-out 0.6s infinite; }
  .hz-streak div, .hz-kv div, .hz-rev > div { transition: transform 0.2s ease; }
  .hz-streak div:hover, .hz-kv div:hover, .hz-rev > div:hover { transform: translateY(-2px); }
  .hz-wiz-body { animation: hz-slide 0.35s ease both; }
  .hz-note { animation: hz-rise 0.4s ease both; }
  .hz-modal { animation: hz-rise 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) both; }

  @media (prefers-reduced-motion: reduce) {
    .hz *, .hz *::before, .hz *::after { animation: none !important; transition: none !important; }
  }
  @media (max-width: 520px) {
    .hz-grid3 { grid-template-columns: 1fr 1fr; }
    .hz-grid3 > :first-child { grid-column: 1 / -1; }
  }
  @media (max-width: 420px) {
    .hz-card { padding: 16px; }
    .hz-kv { grid-template-columns: 1fr 1fr; }
  }
  /* ---------- teacher-planned tasks ---------- */
  .hz-sub { margin: 18px 0 10px; font-size: 14px; font-weight: 700; color: #7A5410; display: flex; align-items: center; gap: 8px; }
  .hz-task-notes { font-size: 14px; color: ${TP.navy}; background: #F3F8FD; border-radius: 10px; padding: 8px 10px; white-space: pre-wrap; }
  .hz-task-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; }
  .hz-task-actions .hz-btn { flex: 1 1 auto; }
  .hz-mistake-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; color: #9B1C0A; background: #FBEAE6; border-radius: 999px; padding: 3px 10px; }
  .hz-task-open { box-shadow: 0 0 0 2px ${TP.blue}; }
  .hz-reader { display: flex; flex-direction: column; gap: 12px; }
  .hz-reader-nav { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .hz-reader-title { flex: 1; min-width: 0; text-align: center; font-weight: 700; color: ${TP.navy}; font-size: 15px; }
  .hz-reader-title small { display: block; font-weight: 400; color: ${TP.secondaryText}; font-size: 13px; }
  .hz-legend { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: ${TP.secondaryText}; }
  .hz-legend i { display: inline-block; width: 14px; height: 14px; border-radius: 4px; vertical-align: -2px; margin-right: 5px; }
  .hz-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .hz-list li { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #F7FAFD; border: 1px solid #E1EDF8; border-radius: 12px; padding: 10px 12px; font-size: 14px; color: ${TP.navy}; }
  .hz-list li > div { flex: 1; min-width: 160px; }
  .hz-list small { display: block; color: ${TP.secondaryText}; font-size: 12px; margin-top: 2px; }
  .hz-ar { font-family: "UthmanicHafs", serif; font-size: 24px; line-height: 1.5; color: #9B1C0A; direction: rtl; }
  .hz-date { font-weight: 700; color: ${TP.navy}; min-width: 92px; }
  /* Position: Surah → Ayah → Page → Line, each kept in step with the others */
  .hz-pos { display: grid; grid-template-columns: 52px minmax(150px, 2.2fr) minmax(64px, 0.8fr) minmax(70px, 0.9fr) minmax(64px, 0.8fr) auto; align-items: end; gap: 8px; }
  .hz-pos-noline { grid-template-columns: 52px minmax(150px, 2.2fr) minmax(64px, 0.8fr) minmax(70px, 0.9fr) auto; }
  .hz-pos-label { align-self: center; padding-top: 16px; font-size: 13px; font-weight: 700; color: ${TP.secondaryText}; text-transform: uppercase; letter-spacing: 0.04em; }
  .hz-pos > label { display: flex; flex-direction: column; gap: 3px; min-width: 0; font-size: 11px; font-weight: 600; color: ${TP.secondaryText}; }
  .hz-pos .hz-input, .hz-pos .hz-select { min-height: 42px; font-size: 15px; font-weight: 600; padding: 0 8px; }
  .hz-pos-juz { align-self: center; padding-top: 16px; font-size: 12px; font-weight: 600; color: ${TP.secondaryText}; white-space: nowrap; }
  @media (max-width: 640px) {
    .hz-pos, .hz-pos-noline { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .hz-pos-label { grid-column: 1 / 3; grid-row: 1; padding-top: 0; }
    .hz-pos-juz { grid-column: 3 / 4; grid-row: 1; padding-top: 0; text-align: right; }
    .hz-pos-surah-pick { grid-column: 1 / -1; }
    .hz-pos-noline .hz-pos-page { grid-column: span 2; }
  }
  @font-face { font-family: "UthmanicHafs"; src: url("/fonts/UthmanicHafs1Ver18.woff2") format("woff2"); font-display: swap; }
  @media (max-width: 520px) {
    .hz-reader-card { padding: 12px 6px; }
    .hz-reader-card > .hz-row, .hz-reader-card > .hz-legend, .hz-reader-card > .hz-task-notes { margin-left: 8px; margin-right: 8px; }
    .hz-reader .mp-page { padding: 4% 2.5% 2%; border-radius: 10px; }
    .hz-reader-nav .hz-btn span { display: none; }
  }
`;

// ---------- position picker (Surah → page → line) ----------

// Surah → Ayah → Page → Line. Changing any one moves the others with it:
// a surah goes to its first ayah, an ayah to the line it's on, a typed page to
// its first line, and the surah/ayah always show what's on the chosen line.
// `edge`: "start" (a portion's first line: the first ayah on it) or "end"
// (its last line: the last ayah on it). allowLine={false} works by page.
export function PositionPicker({ label, unit, onChange, allowLine = true, minPage = 1, maxPage = TOTAL_PAGES, edge = "start" }) {
  const page = unitToPage(Math.min(unit, TOTAL_UNITS - 1));
  const line = Math.floor((unit % UNITS_PER_PAGE) / UNITS_PER_LINE) + 1;
  // The ayah the teacher picked stays shown while it's on the chosen line (an
  // ayah can start mid-line, after the end of the one before it).
  const [picked, setPicked] = useState(null);
  const here = picked && picked.unit === unit ? picked : ayahAtLine(allowLine ? unit : pageToUnit(page), edge);
  const [text, setText] = useState(String(page));
  useEffect(() => { setText(String(page)); }, [page]);
  const clampPage = (u) => {
    const p = unitToPage(u);
    if (p < minPage) return pageToUnit(minPage);
    if (p > maxPage) return pageToUnit(maxPage);
    return allowLine ? u : pageToUnit(p);
  };
  const toAyah = (surah, ayah) => {
    const u = clampPage(unitOfAyah(surah, ayah, edge));
    setPicked({ surah, ayah, unit: u });
    onChange(u);
  };
  const commitPage = (v) => {
    const p = Math.round(+v);
    if (p >= minPage && p <= maxPage) onChange(pageToUnit(p, 1));
    else setText(String(page));
  };
  const juz = JUZ_START_PAGES.filter((p) => p <= page).length;
  return (
    <div className={`hz-pos ${allowLine ? "" : "hz-pos-noline"}`}>
      <span className="hz-pos-label">{label}</span>
      <label className="hz-pos-surah-pick">
        <span>Surah</span>
        <select className="hz-select" aria-label={`${label}: surah`} value={here.surah} onChange={(e) => toAyah(+e.target.value, 1)}>
          {SURAHS.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.name}</option>)}
        </select>
      </label>
      <label className="hz-pos-ayah">
        <span>Ayah</span>
        <select className="hz-select" aria-label={`${label}: ayah`} value={here.ayah} onChange={(e) => toAyah(here.surah, +e.target.value)}>
          {Array.from({ length: SURAH_AYAH_COUNTS[here.surah - 1] }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
        </select>
      </label>
      <label className="hz-pos-page">
        <span>Page</span>
        <input className="hz-input" type="number" inputMode="numeric" min={minPage} max={maxPage} value={text} aria-label={`${label}: page`}
          onChange={(e) => {
            // Apply as soon as the number can't get longer (e.g. "158"); otherwise
            // on leaving the box or Enter, so typing "1…" doesn't jump to page 1.
            setText(e.target.value);
            const p = Math.round(+e.target.value);
            if (p >= minPage && p <= maxPage && p * 10 > maxPage) commitPage(p);
          }}
          onBlur={(e) => commitPage(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitPage(e.currentTarget.value); } }} />
      </label>
      {allowLine && (
        <label className="hz-pos-line">
          <span>Line</span>
          <select className="hz-select" aria-label={`${label}: line`} value={line} onChange={(e) => onChange(pageToUnit(page, +e.target.value))}>
            {Array.from({ length: 15 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
          </select>
        </label>
      )}
      <span className="hz-pos-juz">Juz {juz}</span>
    </div>
  );
}

// ---------- shared task pieces ----------

// "p. 45 – 46 · Al-Baqarah · Ayah 197 – 210"
export function PortionText({ task }) {
  const r = [task.start, task.end];
  return (
    <div className="hz-portion">
      {describeRange(r)} <span className="hz-muted" style={{ fontWeight: 400 }}>· {describeAmount(task.end - task.start)}</span>
      <small>{surahNames(r)}</small>
      <small className="hz-ayah">Ayah {describeAyahs(r)}</small>
    </div>
  );
}

// The task's pages in the Mushaf, its portion bright and the rest faded.
// Only the task's own pages can be turned to; without a task, only `page`.
// `page` also picks the page to open on (e.g. where a mistake is).
// Teacher mode: onWordTap / selectedKey / showCorrected (see MushafPage).
export function TaskReader({ task, page: focus = null, mistakes, onWordTap, selectedKey, showCorrected = false }) {
  const pages = task ? taskPages(task) : [focus ?? 1];
  const first = pages[0];
  const last = pages[pages.length - 1];
  const clamp = (p) => Math.min(last, Math.max(first, p ?? first));
  const [page, setPage] = useState(() => clamp(focus));
  useEffect(() => { setPage(clamp(focus)); }, [task?.id, task?.start, task?.end, focus]);
  const shown = clamp(page);
  const open = mistakes.filter((m) => !m.correctedAt && m.page === shown).length;
  const title = (
    <div className="hz-reader-title">Page {shown} · {surahsOnPages(shown, shown).map((s) => s.name).join(", ")}
      <small>{pages.length > 1 ? `Page ${shown - first + 1} of ${pages.length}` : `Juz ${JUZ_START_PAGES.filter((p) => p <= shown).length}`}{open ? ` · ${open} mistake${open === 1 ? "" : "s"} here` : ""}</small>
    </div>
  );
  return (
    <div className="hz-reader">
      {pages.length > 1 ? (
        <div className="hz-reader-nav">
          <button className="hz-btn hz-btn-outline" disabled={shown <= first} onClick={() => setPage(shown - 1)} aria-label="Previous page"><ChevronLeft size={18} aria-hidden="true" /><span>Previous</span></button>
          {title}
          <button className="hz-btn hz-btn-outline" disabled={shown >= last} onClick={() => setPage(shown + 1)} aria-label="Next page"><span>Next</span><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
      ) : <div className="hz-reader-nav">{title}</div>}
      <MushafPage page={shown} range={task ? [task.start, task.end] : null} marks={mistakes} onWordTap={onWordTap} selectedKey={selectedKey} showCorrected={showCorrected} />
    </div>
  );
}

const statusOf = (task, today) => (task.completedAt ? "completed" : task.taskDate < today ? "partial" : "pending");
const STATUS_LABEL = { completed: "Done", partial: "Not done yet", pending: "To do" };

function StudentTaskCard({ task, today, mistakes, open, onOpen, onToggle, busy }) {
  const { title, Icon } = ACTIVITY_INFO[task.activity];
  const status = statusOf(task, today);
  const count = mistakesForTask(task, mistakes).length;
  return (
    <article className={`hz-task ${status === "completed" ? "hz-task-done" : ""} ${open ? "hz-task-open" : ""}`} aria-label={title}>
      <div className="hz-task-head">
        <span className="hz-task-icon">{status === "completed" ? <CheckCircle2 size={20} aria-hidden="true" /> : <Icon size={20} aria-hidden="true" />}</span>
        <span className="hz-task-title">{title}</span>
        <span className={`hz-badge hz-badge-${status}`}>{STATUS_LABEL[status]}</span>
      </div>
      {task.taskDate !== today && <span className="hz-muted"><CalendarDays size={13} aria-hidden="true" /> Set for {fmtDay(task.taskDate)}</span>}
      <PortionText task={task} />
      {task.notes && <div className="hz-task-notes">{task.notes}</div>}
      {count > 0 && <span className="hz-mistake-badge"><Highlighter size={13} aria-hidden="true" />{count} mistake{count === 1 ? "" : "s"} to fix</span>}
      <div className="hz-task-actions">
        <button className="hz-btn hz-btn-outline" onClick={onOpen} aria-expanded={open}><BookOpen size={17} aria-hidden="true" />{open ? "Close Mushaf" : "Open Mushaf"}</button>
        {status === "completed"
          ? <button className="hz-btn hz-btn-ghost" disabled={busy} onClick={() => onToggle(task, false)}>Undo</button>
          : <button className="hz-btn hz-btn-primary" disabled={busy} onClick={() => onToggle(task, true)}><CheckCircle2 size={17} aria-hidden="true" />Mark as done</button>}
      </div>
    </article>
  );
}

// Keeps a summary loaded and fresh: reloads on the teacher's changes (live)
// and when the student comes back to the app.
export function useHifz(repo, onSummary) {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!repo) return;
    try {
      const s = await loadHifz(repo);
      setState(s);
      onSummary?.(s);
      setError("");
    } catch (e) { setError(e.message); }
  }, [repo, onSummary]);
  useEffect(() => {
    refresh();
    const stop = repo?.subscribe?.(() => refresh());
    const onShow = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { stop?.(); document.removeEventListener("visibilitychange", onShow); };
  }, [repo, refresh]);
  return { state, error, setError, refresh };
}

// ---------- the student's target year ----------
// Asked the first time a Hifz student opens the portal (required, can't be
// closed), and changeable later from the Hifz Tracker.
export function GoalYearDialog({ initial = null, required = false, onSave, onClose }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setBusy(true);
    setError("");
    try { await onSave(year); onClose?.(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="hz-modal-back" style={{ zIndex: 1000 }} role="dialog" aria-modal="true" aria-labelledby="hz-goal-title">
      <div className="hz-modal hz">
        <h3 id="hz-goal-title" className="hz-q" style={{ display: "flex", alignItems: "center", gap: 10 }}><CalendarClock size={22} color={TP.blue} aria-hidden="true" />{required ? "Your Hifz goal" : "Change your Hifz goal"}</h3>
        <p className="hz-muted" style={{ marginTop: 0 }}>By which year do you want to finish memorising the whole Quran?{required ? " You can change it later." : ""}</p>
        <div className="hz-chips">
          {Array.from({ length: 16 }, (_, i) => thisYear + i).map((y) => (
            <button key={y} type="button" className="hz-chip" style={{ minWidth: 72 }} aria-pressed={year === y} onClick={() => setYear(y)}>{y}</button>
          ))}
        </div>
        {error && <div className="hz-error" role="alert" style={{ marginTop: 12 }}>{error}</div>}
        <div className="hz-wiz-nav">
          {!required ? <button className="hz-btn hz-btn-outline" onClick={onClose}>Cancel</button> : <span />}
          <button className="hz-btn hz-btn-primary" disabled={!year || busy} onClick={save}>{busy ? "Saving…" : "Save my goal"}</button>
        </div>
      </div>
    </div>
  );
}

// ---------- history ----------
// Done tasks, newest first, grouped by the day they were set for.
function StudentHistory({ done, today, onOpen }) {
  const [shown, setShown] = useState(15);
  const byDay = [...done].sort((a, b) => (a.taskDate < b.taskDate ? 1 : a.taskDate > b.taskDate ? -1 : 0));
  const days = [];
  for (const t of byDay.slice(0, shown)) {
    if (!days.length || days[days.length - 1].date !== t.taskDate) days.push({ date: t.taskDate, list: [] });
    days[days.length - 1].list.push(t);
  }
  return (
    <section className="hz-card" aria-label="History">
      <h2 className="hz-h2"><History size={22} aria-hidden="true" />History <span className="hz-muted" style={{ fontWeight: 400 }}>· {done.length} done</span></h2>
      {done.length === 0 ? <p className="hz-muted" style={{ margin: 0 }}>Your finished tasks will show here.</p> : (
        <>
          {days.map((d) => (
            <div key={d.date} style={{ marginTop: 10 }}>
              <div className="hz-sub" style={{ color: TP.navy, margin: "0 0 6px" }}>{d.date === today ? "Today" : fmtDay(d.date)}</div>
              <ul className="hz-list">
                {d.list.map((t) => (
                  <li key={t.id}>
                    <CheckCircle2 size={18} color="#1E8A5A" aria-hidden="true" />
                    <div><b>{ACTIVITY_INFO[t.activity].title}</b> · {describeRange([t.start, t.end])}<small>{describeAyahs([t.start, t.end])} · done {fmtDate(t.completedAt.slice(0, 10))}</small></div>
                    <button className="hz-btn hz-btn-ghost" onClick={() => onOpen(t.id)}>Open</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {done.length > shown && <button className="hz-btn hz-btn-ghost" onClick={() => setShown((n) => n + 15)}>Show older</button>}
        </>
      )}
    </section>
  );
}

// ---------- student tracker ----------

export default function HifzTracker({ repo, onSummary }) {
  const { state, error, setError, refresh } = useHifz(repo, onSummary);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState(null); // task shown in the Mushaf
  const [focusPage, setFocusPage] = useState(null); // page to open on (a mistake's page)
  const [editingGoal, setEditingGoal] = useState(false);

  if (error && !state) return <div className="hz"><div className="hz-error" role="alert">{error}</div></div>;
  if (!state) return <div className="hz"><div className="hz-card hz-muted">Loading your Hifz…</div></div>;

  const { stats, today, mistakes, tasks } = state;
  const toggle = async (task, done) => {
    setBusy(true);
    try { await repo.setTaskDone(task.id, done); await refresh(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const opened = tasks.find((t) => t.id === openId) || null;
  const toReader = () => setTimeout(() => document.getElementById("hz-reader")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  const openTask = (id, page = null) => { setOpenId(id); setFocusPage(page); toReader(); };

  // The main card: what's waiting for today (and anything not finished from
  // before) or, when today is all done, the next class day's tasks — named by
  // that day until it comes. Done tasks move to History.
  const actOrder = (t) => ["new", "short", "long"].indexOf(t.activity);
  const waiting = tasks.filter((t) => !t.completedAt);
  const due = waiting.filter((t) => t.taskDate <= today).sort((a, b) => (a.taskDate < b.taskDate ? -1 : a.taskDate > b.taskDate ? 1 : actOrder(a) - actOrder(b)));
  const future = waiting.filter((t) => t.taskDate > today).sort((a, b) => (a.taskDate < b.taskDate ? -1 : a.taskDate > b.taskDate ? 1 : actOrder(a) - actOrder(b)));
  const mainDate = due.length ? today : future[0]?.taskDate || null;
  const main = due.length ? due : future.filter((t) => t.taskDate === mainDate);
  const comingUp = future.filter((t) => !main.includes(t));
  const dayName = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  const mainTitle = !mainDate || mainDate === today ? "Today's Hifz" : `${dayName(mainDate)}'s Hifz`;

  // Mistakes from the last lesson: words the teacher marked in the most
  // recently finished day's tasks, until corrected. The next lesson replaces them.
  const done = tasks.filter((t) => t.completedAt).sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  const lessonDay = done[0]?.taskDate || null;
  const lessonTasks = done.filter((t) => t.taskDate === lessonDay);
  const lessonIds = new Set(lessonTasks.map((t) => t.id));
  const lessonTaskOf = (m) => lessonTasks.find((t) => t.id === m.taskId) || lessonTasks.find((t) => mistakeInTask(m, t));
  const lessonMistakes = mistakes.filter((m) => !m.correctedAt && (lessonIds.has(m.taskId) || (!m.taskId && lessonTaskOf(m))));
  const counts = completedCounts(state.memorized);
  const card = (t) => (
    <StudentTaskCard key={t.id} task={t} today={today} mistakes={mistakes} busy={busy} open={openId === t.id}
      onOpen={() => (openId === t.id ? setOpenId(null) : openTask(t.id))} onToggle={toggle} />
  );
  const reader = opened && (
    <section className="hz-card hz-reader-card" aria-label="Mushaf" id="hz-reader">
      <div className="hz-row" style={{ marginBottom: 8 }}>
        <h2 className="hz-h2" style={{ margin: 0 }}><BookOpen size={22} aria-hidden="true" />{ACTIVITY_INFO[opened.activity].title} <span className="hz-muted" style={{ fontWeight: 400 }}>· {describeRange([opened.start, opened.end])}</span></h2>
        <button className="hz-btn hz-btn-ghost" onClick={() => { setOpenId(null); setFocusPage(null); }} aria-label="Close Mushaf"><X size={18} aria-hidden="true" /></button>
      </div>
      {opened.notes && <div className="hz-task-notes" style={{ marginBottom: 10 }}>{opened.notes}</div>}
      <div className="hz-legend" style={{ marginBottom: 10 }}>
        <span><i style={{ background: "#1A1F36" }} />Your portion (other lines are faded)</span>
        <span><i style={{ background: "#FBD5CC", boxShadow: "0 0 0 1px #F2A595" }} />Mistake your teacher marked</span>
      </div>
      <TaskReader task={opened} page={focusPage} mistakes={mistakes} />
      {!opened.completedAt && (
        <button className="hz-btn hz-btn-primary" style={{ width: "100%", marginTop: 12 }} disabled={busy} onClick={() => toggle(opened, true)}>
          <CheckCircle2 size={18} aria-hidden="true" />Mark {ACTIVITY_INFO[opened.activity].title} as done
        </button>
      )}
    </section>
  );

  return (
    <div className="hz">
      {error && <div className="hz-error" role="alert">{error}</div>}

      {editingGoal && <GoalYearDialog initial={stats.goalYear} onClose={() => setEditingGoal(false)} onSave={async (y) => { await repo.saveGoal(y); await refresh(); }} />}

      <section className="hz-card" aria-label="Overall memorization">
        <h2 className="hz-h2"><BookOpenText size={22} aria-hidden="true" />Overall Memorization</h2>
        <div className="hz-row" style={{ margin: "4px 0 10px" }}>
          <span className="hz-muted">{describeAmount(stats.memorizedUnits)} of 604 pages · {stats.ayahs} of 6236 ayahs</span>
          <span className="hz-big">{stats.percent}%</span>
        </div>
        <div className="hz-bar" role="progressbar" aria-label="Quran memorized" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.percent}><div style={{ width: `${stats.percent}%` }} /></div>
        <div className="hz-kv">
          <div><span>Juz completed</span><strong>{counts.juz} / 30</strong></div>
          <div><span>Surahs completed</span><strong>{counts.surahs} / 114</strong></div>
          <div><span>Remaining</span><strong>{describeAmount(stats.remainingUnits)}</strong></div>
          <div><span>Completion goal</span><strong>{stats.goalYear ? `End of ${stats.goalYear}` : "Not chosen yet"}{" "}
            <button type="button" className="hz-btn hz-btn-ghost" style={{ minHeight: 28, padding: "0 4px", fontSize: 13 }} onClick={() => setEditingGoal(true)}>Change</button></strong></div>
        </div>
        {!state.hasProfile && state.tasks.length === 0 && (
          <div className="hz-note"><CalendarClock size={18} aria-hidden="true" /><span>Your teacher plans your Hifz. Your daily New Hifz, Short and Long Muraja'ah will show here as soon as they are set.</span></div>
        )}
      </section>

      <section className="hz-card" aria-label={mainTitle}>
        <h2 className="hz-h2"><CalendarDays size={22} aria-hidden="true" />{mainTitle} {mainDate && <span className="hz-muted" style={{ fontWeight: 400 }}>· {fmtDate(mainDate)}</span>}</h2>
        {main.length === 0
          ? <p className="hz-muted" style={{ margin: 0 }}>{done.length ? "All done. Your next tasks show here as soon as your teacher sets them." : "Nothing set yet."}</p>
          : <div className="hz-tasks">{main.map(card)}</div>}
      </section>

      {reader}

      {lessonDay && (
        <section className="hz-card" aria-label="Mistakes from your last lesson">
          <h2 className="hz-h2"><Highlighter size={22} aria-hidden="true" />Mistakes from your last lesson <span className="hz-muted" style={{ fontWeight: 400 }}>· {fmtDay(lessonDay)}</span></h2>
          {lessonMistakes.length === 0 ? <p className="hz-muted" style={{ margin: 0 }}>No mistakes marked in your last lesson. MashaAllah!</p> : (
            <ul className="hz-list">
              {lessonMistakes.map((m) => {
                const t = lessonTaskOf(m);
                return (
                  <li key={m.id}>
                    <span className="hz-ar" lang="ar">{m.wordText || "—"}</span>
                    <div>{ACTIVITY_INFO[t.activity].title} · Page {m.page} · Ayah {m.verseKey}{m.note && <small>{m.note}</small>}</div>
                    <button className="hz-btn hz-btn-outline" onClick={() => openTask(t.id, m.page)}>Show</button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {comingUp.length > 0 && (
        <section className="hz-card" aria-label="Coming up">
          <h2 className="hz-h2"><Clock size={22} aria-hidden="true" />Coming Up</h2>
          <ul className="hz-list">
            {comingUp.map((t) => (
              <li key={t.id}>
                <span className="hz-date">{fmtDay(t.taskDate)}</span>
                <div><b>{ACTIVITY_INFO[t.activity].title}</b> · {describeRange([t.start, t.end])}<small>{describeAyahs([t.start, t.end])}</small></div>
                <button className="hz-btn hz-btn-ghost" onClick={() => openTask(t.id)}>Open</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <StudentHistory done={done} today={today} onOpen={(id) => openTask(id)} />

      <section className="hz-card" aria-label="Revision tracking">
        <h2 className="hz-h2"><RotateCw size={22} aria-hidden="true" />Revision Tracking</h2>
        <div className="hz-rev">
          <div>
            <strong style={{ color: TP.navy }}>{ACTIVITY_INFO.short.title}</strong>
            <span className="hz-muted">Revised in the last 7 days: {describeAmount(stats.shortWeekUnits)}</span>
            <div className="hz-bar hz-bar-sm" aria-hidden="true"><div style={{ width: `${Math.min(100, (stats.shortWeekUnits / (7 * UNITS_PER_PAGE)) * 100)}%` }} /></div>
          </div>
          <div>
            <strong style={{ color: TP.navy }}>{ACTIVITY_INFO.long.title}</strong>
            <span className="hz-muted">{stats.longMonthPercent}% of what you've memorized revised in the last 30 days</span>
            <div className="hz-bar hz-bar-sm" aria-hidden="true"><div style={{ width: `${stats.longMonthPercent}%` }} /></div>
          </div>
        </div>
      </section>
    </div>
  );
}
