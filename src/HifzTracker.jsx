// Student portal: Hifz Tracker. The teacher plans the Hifz — New Hifz,
// Short and Long Muraja'ah portions for each day — and the student reads each
// one in the Madinah Mushaf, sees the mistakes the teacher highlighted, and
// ticks it done. Progress, streaks and revision come from the ticked tasks
// (see hifz/tasks.js). Updates from the teacher arrive live.
//
// HIFZ_CSS and PositionPicker are shared with the teacher's screens.

import { useState, useEffect, useCallback } from "react";
import { BookOpenText, RotateCw, History, Flame, CalendarDays, CheckCircle2, Clock, ChevronLeft, ChevronRight, AlertTriangle, X, BookOpen, Highlighter, CalendarClock } from "lucide-react";
import { TP } from "./App.jsx";
import { SURAHS, JUZ_START_PAGES, TOTAL_PAGES, TOTAL_UNITS, UNITS_PER_PAGE, UNITS_PER_LINE, pageToUnit, unitToPage, juzStartUnit, juzEndUnit, surahsOnPages, describeRange, describeAmount } from "./hifz/quran.js";
import { unitsOf, intersect } from "./hifz/engine.js";
import { describeAyahRange, nearestAyahs } from "./hifz/ayahs.js";
import { ACTIVITY_TITLES, taskPages, mistakesForTask, mistakeInTask } from "./hifz/tasks.js";
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
const pagesOfSurah = (num) => {
  const i = num - 1;
  return Array.from({ length: surahEndPage(i) - SURAHS[i].startPage + 1 }, (_, k) => SURAHS[i].startPage + k);
};
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
  @font-face { font-family: "UthmanicHafs"; src: url("/fonts/UthmanicHafs1Ver18.woff2") format("woff2"); font-display: swap; }
  @media (max-width: 520px) {
    .hz-reader-card { padding: 12px 6px; }
    .hz-reader-card > .hz-row, .hz-reader-card > .hz-legend, .hz-reader-card > .hz-task-notes { margin-left: 8px; margin-right: 8px; }
    .hz-reader .mp-page { padding: 4% 2.5% 2%; border-radius: 10px; }
    .hz-reader-nav .hz-btn span { display: none; }
  }
`;

// ---------- position picker (Surah → page → line) ----------

export function PositionPicker({ label, unit, onChange, allowLine = true, minPage = 1, maxPage = TOTAL_PAGES }) {
  const page = unitToPage(Math.min(unit, TOTAL_UNITS - 1));
  const line = Math.floor((unit % UNITS_PER_PAGE) / UNITS_PER_LINE) + 1;
  const surah = surahsOnPages(page, page).pop() || SURAHS[0];
  const surahChoices = SURAHS.filter((s, i) => s.startPage <= maxPage && surahEndPage(i) >= minPage);
  const pageChoices = pagesOfSurah(surah.number).filter((p) => p >= minPage && p <= maxPage);
  return (
    <div className="hz-field">
      <span>{label}</span>
      <div className="hz-grid3">
        <select className="hz-select" aria-label={`${label}: surah`} value={surah.number}
          onChange={(e) => onChange(pageToUnit(Math.max(minPage, SURAHS[+e.target.value - 1].startPage)))}>
          {surahChoices.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.name}</option>)}
        </select>
        <select className="hz-select" aria-label={`${label}: page`} value={page} onChange={(e) => onChange(pageToUnit(+e.target.value))}>
          {pageChoices.map((p) => <option key={p} value={p}>Page {p}</option>)}
        </select>
        {allowLine && (
          <select className="hz-select" aria-label={`${label}: line`} value={line} onChange={(e) => onChange(pageToUnit(page, +e.target.value))}>
            {Array.from({ length: 15 }, (_, i) => <option key={i} value={i + 1}>Line {i + 1}</option>)}
          </select>
        )}
      </div>
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
      <small className="hz-ayah">Ayah {describeAyahRange(r)}</small>
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

// ---------- student tracker ----------

export default function HifzTracker({ repo, onSummary }) {
  const { state, error, setError, refresh } = useHifz(repo, onSummary);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState(null); // task shown in the Mushaf
  const [focusPage, setFocusPage] = useState(null); // page to open on (a mistake's page)

  if (error && !state) return <div className="hz"><div className="hz-error" role="alert">{error}</div></div>;
  if (!state) return <div className="hz"><div className="hz-card hz-muted">Loading your Hifz…</div></div>;

  const { stats, streak, todayTasks, overdue, upcoming, recentDone, today, mistakes, openMistakes } = state;
  const toggle = async (task, done) => {
    setBusy(true);
    try { await repo.setTaskDone(task.id, done); await refresh(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const allOpen = [...todayTasks, ...overdue, ...upcoming, ...recentDone];
  const opened = allOpen.find((t) => t.id === openId) || null;
  const toReader = () => setTimeout(() => document.getElementById("hz-reader")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  const openTask = (id, page = null) => { setOpenId(id); setFocusPage(page); toReader(); };
  // The task a mistake belongs to: one covering its page, Muraja'ah first,
  // today's before unfinished and coming ones.
  const taskFor = (m) => {
    const covering = [...todayTasks, ...overdue, ...upcoming].filter((t) => mistakeInTask(m, t));
    return covering.find((t) => t.activity !== "new") || covering[0] || null;
  };
  const whenOf = (t) => (t.taskDate === today ? "today's" : t.taskDate < today ? "unfinished" : `${fmtDay(t.taskDate)}`);
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
          <div><span>Completion goal</span><strong>{stats.goalYear ? `End of ${stats.goalYear}` : "Your teacher will set it"}</strong></div>
        </div>
        {!state.hasProfile && state.tasks.length === 0 && (
          <div className="hz-note"><CalendarClock size={18} aria-hidden="true" /><span>Your teacher plans your Hifz. Your daily New Hifz, Short and Long Muraja'ah will show here as soon as they are set.</span></div>
        )}
      </section>

      <section className="hz-card" aria-label="Today's Hifz">
        <h2 className="hz-h2"><CalendarDays size={22} aria-hidden="true" />Today's Hifz <span className="hz-muted" style={{ fontWeight: 400 }}>· {fmtDate(today)}</span></h2>
        {todayTasks.length === 0 && overdue.length === 0
          ? <p className="hz-muted" style={{ margin: 0 }}>{upcoming.length ? `Nothing set for today. Your next task is on ${fmtDay(upcoming[0].taskDate)}.` : "Nothing set for today yet."}</p>
          : <div className="hz-tasks">{todayTasks.map(card)}</div>}
        {overdue.length > 0 && (
          <>
            <div className="hz-sub"><AlertTriangle size={16} aria-hidden="true" />Not finished from earlier days</div>
            <div className="hz-tasks">{overdue.map(card)}</div>
          </>
        )}
      </section>

      {reader}

      <section className="hz-card" aria-label="Mistakes to fix">
        <h2 className="hz-h2"><Highlighter size={22} aria-hidden="true" />Mistakes to fix</h2>
        {openMistakes.length === 0 ? <p className="hz-muted" style={{ margin: 0 }}>No mistakes to fix. MashaAllah!</p> : (
          <>
            <p className="hz-muted" style={{ marginTop: 0 }}>Your teacher highlighted these words. Practise them; your teacher clears each one when you read it correctly.</p>
            <ul className="hz-list">
              {openMistakes.map((m) => {
                const t = taskFor(m);
                return (
                  <li key={m.id}>
                    <span className="hz-ar" lang="ar">{m.wordText || "—"}</span>
                    <div>Page {m.page} · Ayah {m.verseKey}
                      <small>{t ? `In ${whenOf(t)} ${ACTIVITY_INFO[t.activity].title}` : "Not in a task yet: it shows when your teacher sets this page"}</small>
                      {m.note && <small>{m.note}</small>}
                    </div>
                    {t && <button className="hz-btn hz-btn-outline" onClick={() => openTask(t.id, m.page)}>Show</button>}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section className="hz-card" aria-label="Coming up">
        <h2 className="hz-h2"><Clock size={22} aria-hidden="true" />Coming Up</h2>
        {upcoming.length === 0 ? <p className="hz-muted" style={{ margin: 0 }}>Nothing set for the coming days yet.</p> : (
          <ul className="hz-list">
            {upcoming.map((t) => (
              <li key={t.id}>
                <span className="hz-date">{fmtDay(t.taskDate)}</span>
                <div><b>{ACTIVITY_INFO[t.activity].title}</b> · {describeRange([t.start, t.end])}<small>{surahNames([t.start, t.end])}</small></div>
                <button className="hz-btn hz-btn-ghost" onClick={() => openTask(t.id)}>Open</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="hz-card" aria-label="Streaks">
        <h2 className="hz-h2"><Flame size={22} aria-hidden="true" />Streaks</h2>
        <div className="hz-streak">
          <div><strong>{streak.current}</strong><span>Current streak</span></div>
          <div><strong>{streak.longest}</strong><span>Longest streak</span></div>
          <div><strong style={{ fontSize: 15, lineHeight: "28px" }}>{streak.lastActive ? fmtDate(streak.lastActive) : "—"}</strong><span>Last active</span></div>
        </div>
        <div className="hz-cal" aria-label="Activity in the last 5 weeks">
          {streak.calendar.map((d) => (
            <div key={d.date} className={`${d.active ? "on" : ""} ${d.date === today ? "today" : ""}`} title={`${fmtDate(d.date)}${d.active ? ": active" : ""}`}>{+d.date.slice(8)}</div>
          ))}
        </div>
        <p className="hz-muted" style={{ marginBottom: 0 }}>Finish at least one task a day to keep your streak. It survives one missed day and resets after two missed days in a row.</p>
      </section>

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
        {recentDone.length > 0 && (
          <>
            <div className="hz-sub" style={{ color: TP.navy }}><CheckCircle2 size={16} aria-hidden="true" />Recently done</div>
            <ul className="hz-list">
              {recentDone.map((t) => (
                <li key={t.id}><span className="hz-date">{fmtDay(t.taskDate)}</span><div><b>{ACTIVITY_INFO[t.activity].title}</b> · {describeRange([t.start, t.end])}<small>{surahNames([t.start, t.end])}</small></div></li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
