// Teacher portal: Hifz. The teacher plans each student's Hifz — New Hifz,
// Short and Long Muraja'ah portions for a day — changes or moves them, sets
// the next day's portion in one tap, and while listening highlights mistakes
// on the Madinah Mushaf (tap a word), clearing each one once it's corrected.
// The student's portal updates live and they get a phone notification.

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { BookOpenText, CalendarDays, ChevronLeft, Trash2, Pencil, Plus, CheckCircle2, CheckCheck, Highlighter, ArrowRight, Search, Flame, Target, X, Undo2, Check, History } from "lucide-react";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient.js";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { HIFZ_CSS, ACTIVITY_INFO, PositionPicker, PortionText, TaskReader, useHifz, fmtDate, fmtDay } from "../HifzTracker.jsx";
import { TOTAL_UNITS, UNITS_PER_LINE, pageToUnit, unitToPage, juzOfPage, wholeJuz, describeRange, describeAmount } from "./quran.js";
import { unitsOf, toSet, subtract } from "./engine.js";
import { mistakesForTask, summarizeHifz, planOf, PATH_STARTS, directionFor, memorizedRanges, describeAyahs, ayahAtLine, ayahName, nextTasksToSet, previewNext, teacherTaskGroups } from "./tasks.js";
import { createSupabaseHifzRepo, HIFZ_TASK_MAPS } from "./taskRepos.js";
import { selectAll } from "../thilawa/repos.js";
import { maldivesToday } from "../dates.js";
import ClassBrowser from "../thilawa/ClassBrowser.jsx";

const teacherCss = `
  .ht { display: flex; flex-direction: column; gap: 18px; }
  .ht-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
  .ht-card { text-align: left; font: inherit; cursor: pointer; border: 1px solid #DCEBF8; border-radius: 16px; background: #FFFFFF; padding: 16px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 6px 18px rgba(18,59,103,0.06); transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .ht-card:hover { transform: translateY(-3px); box-shadow: 0 14px 30px rgba(23,111,209,0.14); }
  .ht-card:focus-visible { outline: 2px solid #176FD1; outline-offset: 2px; }
  .ht-card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .ht-card-head b { color: #123B67; font-size: 16px; }
  .ht-card-head span { color: #567493; font-size: 12px; }
  .ht-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .ht-search { position: relative; max-width: 360px; }
  .ht-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #8FADC0; pointer-events: none; }
  .ht-search .hz-input { padding-left: 38px; }
  .ht-assign { display: flex; flex-direction: column; gap: 12px; }
  .ht-day { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
  .ht-day label { font-size: 14px; font-weight: 700; color: #123B67; margin-right: 4px; }
  .ht-day .hz-input { width: auto; min-width: 170px; }
  .ht-act { border: 1px solid #DCEBF8; border-radius: 14px; background: #FFFFFF; overflow: hidden; }
  .ht-act-head { display: flex; align-items: center; gap: 10px; padding: 8px 12px 8px 14px; background: #F3F8FD; border-bottom: 1px solid #E1EDF8; }
  .ht-act-toggle { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; min-height: 40px; padding: 0; border: none; background: none; font: inherit; text-align: left; cursor: pointer; }
  .ht-act-toggle:disabled { cursor: default; }
  .ht-act-toggle:focus-visible { outline: 2px solid #176FD1; outline-offset: 2px; border-radius: 8px; }
  .ht-act-title { font-weight: 700; color: #123B67; font-size: 15px; margin-right: auto; }
  .ht-act-chev { color: #567493; transition: transform 0.2s ease; flex-shrink: 0; }
  .ht-act-toggle[aria-expanded="true"] .ht-act-chev { transform: rotate(180deg); }
  .ht-act-closed .ht-act-body { display: none; }
  .ht-act-closed .ht-act-head { border-bottom: none; }
  .ht-act-repeat { background: #FCF1DD; color: #7A5410; }
  .ht-act-head input { width: 20px; height: 20px; accent-color: #176FD1; }
  .ht-act-icon { width: 30px; height: 30px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0D4F85, #176FD1); color: #FFFFFF; }
  .ht-act-sum { font-size: 13px; font-weight: 600; color: #1452A8; background: #FFFFFF; border: 1px solid #DCEBF8; border-radius: 999px; padding: 4px 12px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ht-act-body { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 10px; }
  .ht-act-off .ht-act-body { display: none; }
  .ht-act-off .ht-act-head { border-bottom: none; }
  .ht-act-off .ht-act-sum { color: #8296A8; }
  .ht-act-hint { font-size: 13px; color: #567493; background: #EEF6FD; border-radius: 10px; padding: 7px 10px; }
  .ht-link { border: none; background: none; padding: 0; color: #176FD1; font: inherit; font-weight: 700; cursor: pointer; text-decoration: underline; }
  .ht-portion { display: flex; flex-direction: column; gap: 10px; }
  .ht-note { min-height: 42px !important; }
  .ht-sum { font-size: 13px; color: #1452A8; margin-top: 8px; }
  .ht-next { border: 1px dashed #9FC3EA; border-radius: 12px; background: #F6FAFE; padding: 12px; }
  .ht-next-head { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #123B67; margin-bottom: 10px; }
  .ht-hist-day + .ht-hist-day { margin-top: 14px; }
  .ht-hist { margin: 8px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
  .ht-hist li { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; border-radius: 10px; background: #F7FAFD; border: 1px solid #E8F0F8; font-size: 14px; color: #123B67; }
  .ht-hist li > div { min-width: 0; }
  .ht-hist small { display: block; color: #567493; font-size: 12px; margin-top: 2px; }
  .ht-hist-icon { flex-shrink: 0; width: 26px; height: 26px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; background: #DDF5E9; color: #156B45; }
  .ht-rows { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
  .ht-row { border: 1px solid #E1EDF8; border-radius: 14px; background: #F7FAFD; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
  .ht-row-done { background: linear-gradient(160deg, #ECFAF4, #FFFFFF 60%); border-color: #9FD9BE; }
  .ht-done-next { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 13px; font-weight: 600; color: #156B45; }
  .ht-row-open { box-shadow: 0 0 0 2px #176FD1; }
  .ht-row-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .ht-row-head b { color: #123B67; }
  .ht-row-actions { display: flex; flex-wrap: wrap; gap: 6px; }
  .ht-row-actions .hz-btn { min-height: 38px; padding: 0 12px; font-size: 13px; }
  .ht-group { margin: 16px 0 8px; font-size: 13px; font-weight: 700; color: #567493; text-transform: uppercase; letter-spacing: 0.04em; }
  .ht-markbar { position: sticky; bottom: 12px; z-index: 5; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #123B67; color: #FFFFFF; border-radius: 14px; padding: 10px 12px; box-shadow: 0 12px 30px rgba(13,40,70,0.35); }
  .ht-markbar .hz-ar { color: #FFD9CF; font-size: 26px; }
  .ht-markbar span { flex: 1; min-width: 120px; font-size: 13px; }
  .ht-markbar .hz-btn { min-height: 40px; }
  .ht-markbar .hz-btn-outline { background: transparent; color: #FFFFFF; border-color: rgba(255,255,255,0.5); }

  /* Listen & mark: the Mushaf full screen, then the next task to confirm. */
  .ht-full { position: fixed; inset: 0; z-index: 1000; display: flex; flex-direction: column; background: #F4F8FC; color: #123B67; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  .ht-full-top { flex-shrink: 0; display: flex; align-items: center; gap: 12px; padding: 10px 16px; padding-top: max(10px, env(safe-area-inset-top)); color: #FFFFFF;
    background: linear-gradient(90deg, #0D4F85 0%, #176FD1 55%, #0A94B1 100%); box-shadow: 0 4px 16px rgba(13,40,70,0.18); }
  .ht-full-top .hz-btn { background: rgba(255,255,255,0.16); color: #FFFFFF; border: 1px solid rgba(255,255,255,0.4); min-height: 40px; }
  .ht-full-top .hz-btn:hover { background: rgba(255,255,255,0.26); }
  .ht-full-title { flex: 1; min-width: 0; font-weight: 700; font-size: 16px; line-height: 1.25; }
  .ht-full-title small { display: block; font-weight: 400; font-size: 13px; opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ht-full-body { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .ht-full-inner { max-width: 860px; margin: 0 auto; padding: 16px 16px 24px; display: flex; flex-direction: column; gap: 12px; }
  .ht-full-foot { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; padding-bottom: max(12px, env(safe-area-inset-bottom));
    background: #FFFFFF; border-top: 1px solid #DCEBF8; box-shadow: 0 -6px 20px rgba(18,59,103,0.08); }
  .ht-full-foot .hz-btn { min-height: 48px; padding: 0 22px; font-size: 15px; }
  .ht-full .ht-markbar { bottom: 8px; }
  .ht-confirm { background: #FFFFFF; border: 1px solid #DCEBF8; border-radius: 16px; padding: 16px; }
  .ht-steps { display: flex; gap: 6px; font-size: 12px; font-weight: 600; color: #8FADC0; }
  .ht-steps b { color: #FFFFFF; }
  @media (max-width: 640px) {
    .ht-full-inner { padding: 10px 6px 20px; }
    .ht-full-top .hz-btn span { display: none; }
  }
  .ht-ranges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .ht-ranges span { display: inline-flex; align-items: center; gap: 6px; background: #E4F1FC; color: #1D5FA8; border-radius: 999px; padding: 4px 6px 4px 12px; font-size: 13px; font-weight: 600; }
  .ht-ranges button { border: none; background: transparent; color: inherit; cursor: pointer; width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
  .ht-ranges button:hover { background: #CFE4F8; }
  .ht-plan { display: flex; flex-direction: column; gap: 10px; }
  .ht-plan-step { border: 1px solid #E1EDF8; border-radius: 14px; padding: 14px; background: #F9FBFE; }
  .ht-plan-step h4 { margin: 0 0 10px; font-size: 15px; color: #123B67; }
  .ht-plan-step .hz-field:first-of-type { margin-top: 10px; }
  .ht-plan-step-open { background: #FFFFFF; border-color: #9FC3EA; box-shadow: 0 8px 22px rgba(23,111,209,0.08); }
  .ht-plan-step-open .hz-wiz-nav { margin-top: 16px; }
  .ht-wiz-head { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 14px; font-size: 13px; font-weight: 700; color: #567493; }
  .ht-wiz-head > span { white-space: nowrap; }
  .ht-wiz-head .hz-wiz-steps { flex: 1 1 160px; margin: 0; }
  .ht-wiz-sum { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; font: inherit; cursor: pointer; border: 1px solid #E1EDF8; border-radius: 14px; background: #F9FBFE; padding: 10px 14px; transition: border-color 0.2s, background 0.2s; }
  .ht-wiz-sum:hover { border-color: #9FC3EA; background: #FFFFFF; }
  .ht-wiz-sum:focus-visible { outline: 2px solid #176FD1; outline-offset: 2px; }
  .ht-wiz-sum > div { flex: 1; min-width: 0; }
  .ht-wiz-sum small { display: block; font-size: 12px; font-weight: 600; color: #567493; }
  .ht-wiz-sum b { display: block; margin-top: 2px; font-size: 14px; color: #123B67; overflow-wrap: anywhere; }
  .ht-wiz-check { flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: #DDF5E9; color: #156B45; }
  .ht-wiz-change { flex-shrink: 0; display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 700; color: #176FD1; }
  .ht-juz { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
  .ht-juz > span { font-size: 13px; font-weight: 700; color: #567493; margin-right: 4px; }
  .ht-juz .hz-chip { min-width: 64px; }
  .ht-juz .hz-select { width: auto; min-width: 96px; min-height: 40px; }
  .ht-juz .hz-btn { min-height: 40px; }
  @media (max-width: 520px) { .ht-row-actions .hz-btn { flex: 1 1 auto; } }
`;

// From / To (this line included) for a [start, end) portion.
function PortionFields({ value, onChange }) {
  const toUnit = Math.max(value.start, value.end - UNITS_PER_LINE);
  return (
    <div className="ht-portion">
      {/* A new "From" keeps the portion's length (1 page stays 1 page). */}
      <PositionPicker label="From" unit={value.start} onChange={(u) => onChange({ start: u, end: Math.min(TOTAL_UNITS, u + Math.max(UNITS_PER_LINE, value.end - value.start)) })} />
      <PositionPicker label="To" edge="end" unit={toUnit} onChange={(u) => onChange({ start: Math.min(value.start, u), end: Math.min(TOTAL_UNITS, u + UNITS_PER_LINE) })} />
    </div>
  );
}

// "p. 158 · 1 page · Al-A'raf 58 – 67"
const portionSummary = (r) => `${describeRange([r.start, r.end])} · ${describeAmount(r.end - r.start)} · ${describeAyahs([r.start, r.end])}`;

// ---------- the student's Hifz plan ----------
// What was memorised before (page to page or whole juz from the front or
// back), where the student starts Hifz, and how
// Short and Long Muraja'ah work. New, Short and Long portions are worked out
// from this (tasks.js: suggestPortion). The target year is the student's own.

const NEW_AMOUNTS = [
  { units: 10, label: "5 lines" },
  { units: 15, label: "½ page" },
  { units: 30, label: "1 page" },
  { units: 45, label: "1½ pages" },
  { units: 60, label: "2 pages" },
];

const JUZ_COUNTS = Array.from({ length: 30 }, (_, i) => i + 1);

// Which way New Hifz goes from the start, in words.
function pathNote(plan) {
  if (plan.direction !== "juz_reverse") return "New Hifz goes on from here to the end of the Quran.";
  const j = juzOfPage(unitToPage(plan.startUnit));
  if (j === 1) return "New Hifz goes to the end of Juz 1.";
  return `New Hifz goes to the end of Juz ${j}, then Juz ${j - 1}${j > 2 ? `, ${j - 2}` : ""}${j > 3 ? " …" : ""} towards the front.`;
}

function ProfileEditor({ profile, tasks = [], onSave, onCancel, busy }) {
  const start = planOf(profile);
  const [plan, setPlan] = useState(() => ({ ...start, memorized: toSet(start.memorized), startUnit: start.startUnit ?? PATH_STARTS[start.direction] }));
  // The direction isn't asked: a saved plan keeps its own until the start or
  // the pages memorised before change, then it follows from them (directionFor,
  // with completed New Hifz counted too).
  const set = (patch) => setPlan((p) => {
    const next = { ...p, ...patch };
    if ("startUnit" in patch || "memorized" in patch) next.direction = directionFor(next.startUnit, memorizedRanges({ memorized: next.memorized }, tasks));
    return next;
  });
  const [juzSide, setJuzSide] = useState("first");
  const [juzCount, setJuzCount] = useState(1);
  const juzRange = wholeJuz(juzSide, juzCount);
  const juzName = juzSide === "last" ? (juzCount === 1 ? "Juz 30" : `Juz ${31 - juzCount}–30`) : juzCount === 1 ? "Juz 1" : `Juz 1–${juzCount}`;
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pagesError, setPagesError] = useState("");
  const addPages = () => {
    const a = Math.round(+from);
    const b = Math.round(+(to || from));
    if (!(a >= 1 && b >= a && b <= 604)) { setPagesError("Pages go from 1 to 604, and the last page can't be before the first."); return false; }
    set({ memorized: toSet([...plan.memorized, [pageToUnit(a), pageToUnit(b + 1)]]) });
    setFrom(""); setTo(""); setPagesError("");
    return true;
  };
  const longStart = plan.longStartUnit ?? plan.memorized[0]?.[0] ?? pageToUnit(1);
  const save = () => onSave({ ...plan, longStartUnit: longStart });

  // One question at a time: the next appears once the one before is answered
  // (Next), answered ones stay as a short summary to tap and change. A saved
  // plan opens with every answer shown, so it's quick to change one thing.
  const steps = [
    {
      title: "Pages memorised before",
      summary: plan.memorized.length ? `${plan.memorized.map(describeRange).join(", ")} · ${describeAmount(unitsOf(plan.memorized))}` : "Nothing yet",
      body: (
        <>
          <div className="hz-grid3">
            <input className="hz-input" type="number" min="1" max="604" inputMode="numeric" placeholder="From page" aria-label="From page" value={from} onChange={(e) => setFrom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPages()} />
            <input className="hz-input" type="number" min="1" max="604" inputMode="numeric" placeholder="To page" aria-label="To page" value={to} onChange={(e) => setTo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPages()} />
            <button type="button" className="hz-btn hz-btn-outline" onClick={addPages} disabled={!from}><Plus size={16} aria-hidden="true" />Add pages</button>
          </div>
          {pagesError && <div className="hz-error" role="alert" style={{ marginTop: 8 }}>{pagesError}</div>}
          <div className="ht-juz">
            <span>Or whole juz</span>
            <div className="hz-chips" role="group" aria-label="From the front or the back">
              <button type="button" className="hz-chip" aria-pressed={juzSide === "first"} onClick={() => setJuzSide("first")}>First</button>
              <button type="button" className="hz-chip" aria-pressed={juzSide === "last"} onClick={() => setJuzSide("last")}>Last</button>
            </div>
            <select className="hz-select" aria-label="How many juz" value={juzCount} onChange={(e) => setJuzCount(+e.target.value)}>
              {JUZ_COUNTS.map((n) => <option key={n} value={n}>{n} juz</option>)}
            </select>
            <button type="button" className="hz-btn hz-btn-outline" onClick={() => set({ memorized: toSet([...plan.memorized, juzRange]) })}><Plus size={16} aria-hidden="true" />Add {juzName}</button>
          </div>
          <div className="ht-ranges" aria-label="Memorised before">
            {plan.memorized.length === 0 && <span style={{ background: "#EEF0F3", color: "#5B6B79", paddingRight: 12 }}>Nothing yet</span>}
            {plan.memorized.map((r) => (
              <span key={r.join("-")}>{describeRange(r)}
                <button type="button" aria-label={`Remove ${describeRange(r)}`} onClick={() => set({ memorized: subtract(plan.memorized, [r]) })}><X size={14} aria-hidden="true" /></button>
              </span>
            ))}
          </div>
          <p className="hz-muted" style={{ margin: "8px 0 0" }}>{describeAmount(unitsOf(plan.memorized))} memorised before. Completed New Hifz tasks are added automatically.</p>
        </>
      ),
    },
    {
      title: "Where will the student start Hifz?",
      summary: `${ayahName(ayahAtLine(plan.startUnit))} · p. ${unitToPage(plan.startUnit)} · ${plan.direction === "juz_reverse" ? "juz by juz towards the front" : "on to the end"}`,
      body: (
        <>
          <PositionPicker label="Start" unit={plan.startUnit} allowLine={false} onChange={(u) => set({ startUnit: u })} />
          <p className="hz-muted" style={{ margin: "8px 0 0" }}>{pathNote(plan)}</p>
        </>
      ),
    },
    {
      title: "New Hifz: how much a day?",
      summary: `${describeAmount(plan.newUnits)} a day`,
      body: (
        <>
          <div className="hz-options" style={{ marginTop: 0 }}>
            {NEW_AMOUNTS.map((o) => (
              <button key={o.units} type="button" className="hz-option" aria-pressed={plan.newUnits === o.units} onClick={() => set({ newUnits: o.units })}>{o.label}</button>
            ))}
          </div>
          <p className="hz-muted" style={{ margin: "8px 0 0" }}>Each class day the next {describeAmount(plan.newUnits)} of the Hifz path is set.</p>
        </>
      ),
    },
    {
      title: "Short Muraja'ah: how many pages a day?",
      summary: `${plan.shortPages} page${plan.shortPages === 1 ? "" : "s"} a day`,
      body: (
        <>
          <div className="hz-chips">
            {[1, 2, 3, 4, 5, 6].map((n) => <button key={n} type="button" className="hz-chip" style={{ minWidth: 52 }} aria-pressed={plan.shortPages === n} onClick={() => set({ shortPages: n })}>{n}</button>)}
            <input className="hz-input" style={{ width: 110 }} type="number" min="0.5" max="40" step="0.5" inputMode="decimal" aria-label="Short Muraja'ah pages"
              value={plan.shortPages} onChange={(e) => { const v = Math.round(+e.target.value * 2) / 2; if (v > 0) set({ shortPages: Math.min(40, v) }); }} />
          </div>
          <p className="hz-muted" style={{ margin: "8px 0 0" }}>Each day it revises the {plan.shortPages} most recently memorised page{plan.shortPages === 1 ? "" : "s"} of the Hifz path.</p>
        </>
      ),
    },
    {
      title: "Long Muraja'ah",
      summary: `From p. ${unitToPage(longStart)} · ${plan.longMode === "pages" ? `${plan.longPages} page${plan.longPages === 1 ? "" : "s"} a day` : "to the end of the juz each day"}`,
      body: (
        <>
          <PositionPicker label="Start from" unit={longStart} allowLine={false} onChange={(u) => set({ longStartUnit: u })} />
          <div className="hz-field">
            <span>How much a day?</span>
            <div className="hz-options" style={{ marginTop: 0 }}>
              <button type="button" className="hz-option" aria-pressed={plan.longMode === "juz"} onClick={() => set({ longMode: "juz" })}>To the end of the juz<small>One juz a day</small></button>
              <button type="button" className="hz-option" aria-pressed={plan.longMode === "pages"} onClick={() => set({ longMode: "pages" })}>A number of pages<small>{plan.longPages} page{plan.longPages === 1 ? "" : "s"} a day</small></button>
            </div>
            {plan.longMode === "pages" && (
              <input className="hz-input" style={{ maxWidth: 160 }} type="number" min="0.5" max="40" step="0.5" inputMode="decimal" aria-label="Long Muraja'ah pages a day"
                value={plan.longPages} onChange={(e) => { const v = Math.round(+e.target.value * 2) / 2; if (v > 0) set({ longPages: Math.min(40, v) }); }} />
            )}
          </div>
          <p className="hz-muted" style={{ margin: "8px 0 0" }}>Goes through the memorised pages from here, then starts again from the beginning.</p>
        </>
      ),
    },
  ];
  const last = steps.length - 1;
  const [open, setOpen] = useState(profile ? null : 0);
  const [reached, setReached] = useState(profile ? last : 0);
  const go = (i) => { setOpen(i); setReached((r) => Math.max(r, i)); };
  // Pages typed but not added yet count when moving on.
  const next = () => { if (open === 0 && from && !addPages()) return; go(open + 1); };
  const openRef = useRef(null);
  const moved = useRef(false);
  useEffect(() => {
    if (moved.current) openRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    moved.current = true;
  }, [open]);

  return (
    <div className="ht-plan">
      {profile?.fromLegacy && <div className="hz-note" style={{ marginTop: 0, marginBottom: 0 }}><Target size={18} aria-hidden="true" /><span>Filled in from the plan the student made themself. Check it and save.</span></div>}

      <div className="ht-wiz-head">
        <span>{open != null ? `Step ${open + 1} of ${steps.length}` : "All answered · tap one to change it"}</span>
        <div className="hz-wiz-steps" aria-hidden="true">{steps.map((st, i) => <span key={st.title} className={i <= reached ? "on" : ""} />)}</div>
      </div>

      {steps.slice(0, reached + 1).map((st, i) => (i === open ? (
        <div key={st.title} ref={openRef} className="ht-plan-step ht-plan-step-open hz-wiz-body">
          <h4>{i + 1}. {st.title}</h4>
          {st.body}
          <div className="hz-wiz-nav">
            {i > 0 ? <button className="hz-btn hz-btn-outline" onClick={() => setOpen(i - 1)}><ChevronLeft size={16} aria-hidden="true" />Back</button> : <span />}
            {i < last
              ? <button className="hz-btn hz-btn-primary" onClick={next}>Next<ArrowRight size={16} aria-hidden="true" /></button>
              : <button className="hz-btn hz-btn-primary" disabled={busy} onClick={save}>Save plan</button>}
          </div>
        </div>
      ) : (
        <button key={st.title} type="button" className="ht-wiz-sum" onClick={() => setOpen(i)} aria-label={`${i + 1}. ${st.title}: ${st.summary}. Change`}>
          <span className="ht-wiz-check"><Check size={15} aria-hidden="true" /></span>
          <div><small>{i + 1}. {st.title}</small><b>{st.summary}</b></div>
          <span className="ht-wiz-change"><Pencil size={14} aria-hidden="true" />Change</span>
        </button>
      )))}

      {open !== last && (reached === last || onCancel) && (
        <div className="hz-wiz-nav" style={{ justifyContent: "flex-end", marginTop: 4 }}>
          {onCancel && <button className="hz-btn hz-btn-outline" onClick={onCancel}>Cancel</button>}
          {reached === last && <button className="hz-btn hz-btn-primary" disabled={busy} onClick={save}>Save plan</button>}
        </div>
      )}
    </div>
  );
}

function EditTask({ task, onSave, onCancel, busy, saveLabel = "Save changes", cancelLabel = "Cancel" }) {
  const [draft, setDraft] = useState({ taskDate: task.taskDate, start: task.start, end: task.end, notes: task.notes });
  return (
    <div>
      <div className="hz-field" style={{ marginTop: 0 }}>
        <label htmlFor={`ht-edit-date-${task.id}`}>Day</label>
        <input id={`ht-edit-date-${task.id}`} className="hz-input" style={{ maxWidth: 220 }} type="date" value={draft.taskDate} onChange={(e) => e.target.value && setDraft((d) => ({ ...d, taskDate: e.target.value }))} />
      </div>
      <PortionFields value={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} />
      <div className="ht-sum">{portionSummary(draft)}</div>
      <div className="hz-field">
        <label htmlFor={`ht-edit-notes-${task.id}`}>Note for the student</label>
        <input id={`ht-edit-notes-${task.id}`} className="hz-input" maxLength={1000} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
      </div>
      <div className="hz-wiz-nav" style={{ justifyContent: "flex-end", marginTop: 12 }}>
        <button className="hz-btn hz-btn-outline" onClick={onCancel}>{cancelLabel}</button>
        <button className="hz-btn hz-btn-primary" disabled={busy} onClick={() => onSave(draft)}>{saveLabel}</button>
      </div>
    </div>
  );
}

// ---------- history ----------
// The student's done tasks, newest first, grouped by day (the student sees
// the same history in their portal).
function HistorySection({ tasks, mistakes }) {
  const [shown, setShown] = useState(20);
  const done = tasks.filter((t) => t.completedAt).sort((a, b) => (a.taskDate < b.taskDate ? 1 : a.taskDate > b.taskDate ? -1 : a.completedAt < b.completedAt ? 1 : -1));
  const days = [];
  for (const t of done.slice(0, shown)) {
    if (!days.length || days[days.length - 1].date !== t.taskDate) days.push({ date: t.taskDate, list: [] });
    days[days.length - 1].list.push(t);
  }
  return (
    <section className="hz-card" aria-label="History">
      <h2 className="hz-h2"><History size={22} aria-hidden="true" />History <span className="hz-muted" style={{ fontWeight: 400 }}>· {done.length} done</span></h2>
      {done.length === 0 ? <p className="hz-muted" style={{ margin: 0 }}>Nothing done yet.</p> : (
        <>
          {days.map((d) => (
            <div key={d.date} className="ht-hist-day">
              <div className="ht-group" style={{ marginTop: 0 }}>{fmtDay(d.date)}</div>
              <ul className="ht-hist">
                {d.list.map((t) => {
                  const { title, Icon } = ACTIVITY_INFO[t.activity];
                  const marks = mistakes.filter((m) => m.taskId === t.id).length;
                  const late = t.completedAt.slice(0, 10) > t.taskDate;
                  return (
                    <li key={t.id}>
                      <span className="ht-hist-icon"><Icon size={15} aria-hidden="true" /></span>
                      <div>
                        <b>{title}</b> · {portionSummary(t)}
                        <small>Done {fmtDate(t.completedAt.slice(0, 10))}{late ? " (later than set)" : ""}{marks ? ` · ${marks} word${marks === 1 ? "" : "s"} marked` : ""}{t.notes ? ` · “${t.notes}”` : ""}</small>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {done.length > shown && <button className="hz-btn hz-btn-ghost" onClick={() => setShown((n) => n + 20)}>Show older</button>}
        </>
      )}
    </section>
  );
}

// ---------- one student ----------

export function TeacherHifzStudent({ student, repo, onBack, onChanged }) {
  const { state: data, error, setError, refresh } = useHifz(repo, onChanged);
  const [busy, setBusy] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [markingId, setMarkingId] = useState(null); // task open in the Mushaf
  const [selectedKey, setSelectedKey] = useState(null);
  const [drafts, setDrafts] = useState({}); // activity → the teacher's confirmed next task
  const [nextOpen, setNextOpen] = useState(null); // task whose next task is being looked at
  const [markStep, setMarkStep] = useState("mark"); // full screen: "mark" the Mushaf, then "next" to confirm
  const generating = useRef(false);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try { await fn(); await refresh(); return true; } catch (e) { setError(e.message); return false; } finally { setBusy(false); }
  };

  // Tasks come from the Hifz plan: keep one waiting for each of New Hifz,
  // Short and Long Muraja'ah on the student's class days (e.g. after the
  // plan is first saved, or a task the student ticked done at home).
  const planReady = !!data && data.hasProfile && !data.profile?.fromLegacy;
  useEffect(() => {
    if (!planReady || generating.current) return;
    const rows = nextTasksToSet({ tasks: data.tasks, memorized: data.memorized, profile: data.profile, today: data.today, schedule: student.schedule, drafts });
    if (!rows.length) return;
    generating.current = true;
    repo.addTasks(rows)
      .then(() => { setDrafts((d) => { const n = { ...d }; rows.forEach((r) => delete n[r.activity]); return n; }); return refresh(); })
      .catch((e) => setError(e.message))
      .finally(() => { generating.current = false; });
  }, [data, planReady]);

  useEffect(() => {
    if (!markingId) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") { if (markStep === "next") setMarkStep("mark"); else closeMarking(); } };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [markingId, markStep]);

  if (!data) return <div className="ht">{error ? <div className="hz-error" role="alert">{error}</div> : <div className="hz-card hz-muted">Loading {student.name}…</div>}</div>;

  const { stats, streak, today, mistakes, openMistakes, memorized, tasks } = data;
  const marking = tasks.find((t) => t.id === markingId) || null;
  const openMarking = (t) => { setSelectedKey(null); setMarkStep("mark"); setMarkingId(t.id); };
  function closeMarking() { setMarkingId(null); setSelectedKey(null); setMarkStep("mark"); }
  const selected = openMistakes.find((m) => `${m.verseKey}:${m.position}` === selectedKey) || null;
  const needsProfile = !data.hasProfile || data.profile?.fromLegacy;

  const ctx = { tasks, memorized, profile: data.profile, today, schedule: student.schedule };
  const nextOf = (t) => drafts[t.activity] || previewNext(t, ctx);
  // Done: the next class day's task for the same activity is set (with the
  // teacher's confirmed changes, if any) and the student is notified.
  const markDone = (t, chosen = null) => {
    const next = chosen || nextOf(t);
    const stillOpen = tasks.some((x) => x.activity === t.activity && !x.completedAt && x.id !== t.id);
    generating.current = true;
    return run(async () => {
      await repo.setTaskDone(t.id, true);
      if (next && !stillOpen) await repo.addTasks([{ activity: t.activity, taskDate: next.taskDate, start: next.start, end: next.end, notes: next.notes || "" }]);
      setDrafts((d) => { const n = { ...d }; delete n[t.activity]; return n; });
      setNextOpen(null);
      if (markingId === t.id) closeMarking();
    }).finally(() => { generating.current = false; });
  };
  const nextBox = (t) => {
    const next = nextOf(t);
    if (!next) return <div className="ht-next"><span className="hz-muted">Nothing comes next on the plan.</span></div>;
    return (
      <div className="ht-next">
        <div className="ht-next-head"><ArrowRight size={16} aria-hidden="true" />Next {ACTIVITY_INFO[t.activity].title} · {fmtDay(next.taskDate)}{drafts[t.activity] ? " · confirmed" : ""}</div>
        <EditTask key={`${t.id}-${next.taskDate}-${next.start}-${next.end}`} task={{ ...next, id: `next-${t.id}`, notes: next.notes || "" }} busy={busy} saveLabel="Confirm"
          onCancel={() => setNextOpen(null)}
          onSave={(d) => { setDrafts((prev) => ({ ...prev, [t.activity]: d })); setNextOpen(null); }} />
        <p className="hz-muted" style={{ margin: "8px 0 0" }}>It's set when you mark this task done, and the student is notified.</p>
      </div>
    );
  };

  const tapWord = (w) => {
    setSelectedKey(w.key);
    const open = openMistakes.find((m) => m.verseKey === w.verseKey && m.position === w.position);
    if (open || busy) return; // tapping a marked word selects it; ignore taps while saving
    run(() => repo.addMistake({ page: w.page, line: w.line, verseKey: w.verseKey, position: w.position, wordText: w.text, taskId: marking?.id }));
  };
  const remove = async (what, fn) => {
    if (await confirmDialog({ title: `Delete this ${what}?`, message: "This can't be undone.", confirmLabel: "Delete" })) run(fn);
  };

  // Listen & mark, full screen: 1) the task's pages in the Mushaf, tap words
  // to mark mistakes; Continue → 2) the next class day's task, change it if
  // needed and Confirm: this task is marked done, the next one is set and
  // the student is notified.
  const listenAndMark = () => {
    const { title, Icon } = ACTIVITY_INFO[marking.activity];
    const count = mistakesForTask(marking, mistakes).length;
    const next = nextOf(marking);
    const alreadySet = tasks.find((x) => x.activity === marking.activity && !x.completedAt && x.id !== marking.id) || null;
    const onNext = markStep === "next";
    // On the page body, so nothing in the portal layout can cover or clip it.
    return createPortal(
      <div className="ht-full" role="dialog" aria-modal="true" aria-label={`Listen and mark · ${title}`}>
        <div className="ht-full-top">
          <button className="hz-btn" onClick={() => (onNext ? setMarkStep("mark") : closeMarking())}>
            <ChevronLeft size={18} aria-hidden="true" /><span>{onNext ? "Back to Mushaf" : "Back"}</span>
          </button>
          <div className="ht-full-title">
            {onNext ? "Confirm the next task" : <>{title} · {student.name}</>}
            <small>{onNext ? `${title} · ${student.name}` : `${fmtDay(marking.taskDate)} · ${portionSummary(marking)}`}</small>
          </div>
          <div className="ht-steps" aria-hidden="true">{onNext ? <>1 · <b>2</b></> : <><b>1</b> · 2</>}</div>
        </div>

        <div className="ht-full-body">
          <div className="ht-full-inner">
            {!onNext ? (
              <>
                <div className="hz-legend">
                  <span>Tap a word the student gets wrong to highlight it. Tap a highlighted word to clear it.</span>
                  <span><i style={{ background: "#FBD5CC", boxShadow: "0 0 0 1px #F2A595" }} />To fix</span>
                  <span><i style={{ background: "#DDF5E9" }} />Corrected</span>
                </div>
                {marking.notes && <div className="hz-task-notes">{marking.notes}</div>}
                <TaskReader task={marking} mistakes={mistakes} onWordTap={tapWord} selectedKey={selectedKey} showCorrected />
                {selected && (
                  <div className="ht-markbar" role="region" aria-label="Selected mistake">
                    <b className="hz-ar" lang="ar">{selected.wordText}</b>
                    <span>Page {selected.page} · Ayah {selected.verseKey}</span>
                    <button className="hz-btn hz-btn-primary" disabled={busy} onClick={() => run(() => repo.setMistakeCorrected(selected.id, true)).then(() => setSelectedKey(null))}><Check size={16} aria-hidden="true" />Corrected</button>
                    <button className="hz-btn hz-btn-outline" disabled={busy} onClick={() => run(() => repo.deleteMistake(selected.id)).then(() => setSelectedKey(null))}>Remove</button>
                    <button className="hz-btn hz-btn-outline" onClick={() => setSelectedKey(null)} aria-label="Close"><X size={16} aria-hidden="true" /></button>
                  </div>
                )}
              </>
            ) : (
              <div className="ht-confirm">
                <div className="ht-next-head"><Icon size={18} aria-hidden="true" />Next {title}{next && !alreadySet ? ` · ${fmtDay(next.taskDate)}` : ""}</div>
                {alreadySet ? (
                  <p className="hz-muted" style={{ margin: 0 }}>The next {title} is already set for {fmtDay(alreadySet.taskDate)}: {portionSummary(alreadySet)}. Finish to mark this one done.</p>
                ) : !next ? (
                  <p className="hz-muted" style={{ margin: 0 }}>Nothing comes next on the plan. Finish to mark this one done.</p>
                ) : (
                  <>
                    <EditTask key={`${marking.id}-${next.taskDate}-${next.start}-${next.end}`} task={{ ...next, id: `next-${marking.id}`, notes: next.notes || "" }} busy={busy}
                      saveLabel="Confirm & finish" onCancel={() => setMarkStep("mark")} cancelLabel="Back"
                      onSave={(d) => markDone(marking, d)} />
                    <p className="hz-muted" style={{ margin: "8px 0 0" }}>Confirm marks today's {title} done, sets this one and notifies the student.</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {(!onNext || alreadySet || !next) && (
          <div className="ht-full-foot">
            <span className="hz-muted">{count} mistake{count === 1 ? "" : "s"} marked on these pages</span>
            {marking.completedAt
              ? <button className="hz-btn hz-btn-primary" onClick={closeMarking}>Close</button>
              : onNext
                ? <button className="hz-btn hz-btn-primary" disabled={busy} onClick={() => markDone(marking)}><CheckCircle2 size={18} aria-hidden="true" />Finish</button>
                : <button className="hz-btn hz-btn-primary" onClick={() => { setSelectedKey(null); setMarkStep("next"); }}>Continue<ArrowRight size={18} aria-hidden="true" /></button>}
          </div>
        )}
      </div>,
      document.body,
    );
  };

  const groups = teacherTaskGroups(tasks, today);
  // Approved today: stays in its place, green, with the next one (set for a
  // later day) under it to check or change.
  const finishedRow = (t) => {
    const { title, Icon } = ACTIVITY_INFO[t.activity];
    const count = mistakesForTask(t, mistakes).length;
    const next = groups.next[t.activity];
    return (
      <li key={t.id} className={`ht-row ht-row-done ${markingId === t.id ? "ht-row-open" : ""}`}>
        <div className="ht-row-head">
          <Icon size={18} aria-hidden="true" /><b>{title}</b>
          <span className="hz-muted">{fmtDay(t.taskDate)}</span>
          <span className="hz-badge hz-badge-completed"><CheckCircle2 size={13} aria-hidden="true" /> Finished today</span>
          {count > 0 && <span className="hz-mistake-badge"><Highlighter size={12} aria-hidden="true" />{count}</span>}
        </div>
        <PortionText task={t} />
        {next && editingId === next.id ? (
          <div className="ht-next">
            <div className="ht-next-head"><ArrowRight size={16} aria-hidden="true" />Change the next {title}</div>
            <EditTask task={next} busy={busy} onCancel={() => setEditingId(null)}
              onSave={(d) => run(() => repo.updateTask(next.id, d)).then((ok) => ok && setEditingId(null))} />
          </div>
        ) : next && <div className="ht-done-next"><ArrowRight size={14} aria-hidden="true" />Next: {fmtDay(next.taskDate)} · {portionSummary(next)}</div>}
        <div className="ht-row-actions">
          <button className="hz-btn hz-btn-outline" onClick={() => openMarking(t)}><Highlighter size={15} aria-hidden="true" />Listen & mark</button>
          {next && editingId !== next.id && <button className="hz-btn hz-btn-outline" onClick={() => setEditingId(next.id)}><Pencil size={15} aria-hidden="true" />Change next</button>}
          <button className="hz-btn hz-btn-ghost" disabled={busy} onClick={() => run(() => repo.setTaskDone(t.id, false))}><Undo2 size={15} aria-hidden="true" />Not done</button>
        </div>
      </li>
    );
  };
  const taskRow = (t) => {
    const { title, Icon } = ACTIVITY_INFO[t.activity];
    const confirmed = drafts[t.activity];
    const count = mistakesForTask(t, mistakes).length;
    if (t.completedAt) return finishedRow(t);
    if (editingId === t.id) {
      return (
        <li key={t.id} className="ht-row ht-row-open">
          <div className="ht-row-head"><Icon size={18} aria-hidden="true" /><b>Change {title}</b></div>
          <EditTask task={t} busy={busy} onCancel={() => setEditingId(null)}
            onSave={(d) => run(() => repo.updateTask(t.id, d)).then((ok) => ok && setEditingId(null))} />
        </li>
      );
    }
    return (
      <li key={t.id} className={`ht-row ${t.completedAt ? "ht-row-done" : ""} ${markingId === t.id ? "ht-row-open" : ""}`}>
        <div className="ht-row-head">
          <Icon size={18} aria-hidden="true" /><b>{title}</b>
          <span className="hz-muted">{fmtDay(t.taskDate)}</span>
          {t.studentDoneAt && !t.completedAt
            ? <span className="hz-badge hz-badge-submitted" title={`Finished ${fmtDate(t.studentDoneAt.slice(0, 10))}`}><CheckCheck size={13} aria-hidden="true" /> Student finished · listen & approve</span>
            : <span className={`hz-badge ${t.completedAt ? "hz-badge-completed" : t.taskDate < today ? "hz-badge-partial" : "hz-badge-pending"}`}>{t.completedAt ? "Done" : t.taskDate < today ? "Not done" : "To do"}</span>}
          {count > 0 && <span className="hz-mistake-badge"><Highlighter size={12} aria-hidden="true" />{count}</span>}
        </div>
        <PortionText task={t} />
        {t.notes && <div className="hz-task-notes">{t.notes}</div>}
        <div className="ht-row-actions">
          <button className="hz-btn hz-btn-primary" onClick={() => openMarking(t)}>
            <Highlighter size={15} aria-hidden="true" />Listen & mark
          </button>
          <button className="hz-btn hz-btn-outline" disabled={busy} onClick={() => (t.completedAt ? run(() => repo.setTaskDone(t.id, false)) : markDone(t))}>
            {t.completedAt ? <><Undo2 size={15} aria-hidden="true" />Not done</> : <><CheckCircle2 size={15} aria-hidden="true" />Approve</>}
          </button>
          <button className="hz-btn hz-btn-outline" aria-expanded={nextOpen === t.id} onClick={() => setNextOpen(nextOpen === t.id ? null : t.id)}>
            <ArrowRight size={15} aria-hidden="true" />Next task
          </button>
          <button className="hz-btn hz-btn-outline" onClick={() => setEditingId(t.id)}><Pencil size={15} aria-hidden="true" />Change</button>
          <button className="hz-btn hz-btn-ghost" aria-label={`Delete ${title} for ${fmtDay(t.taskDate)}`} onClick={() => remove("task", () => repo.deleteTask(t.id))}><Trash2 size={15} aria-hidden="true" /></button>
        </div>
        {confirmed && nextOpen !== t.id && <div className="hz-muted" style={{ fontSize: 13 }}>Next (confirmed): {fmtDay(confirmed.taskDate)} · {portionSummary(confirmed)}</div>}
        {nextOpen === t.id && markingId !== t.id && nextBox(t)}
      </li>
    );
  };
  const group = (label, list) => list.length > 0 && (
    <>
      <div className="ht-group">{label}</div>
      <ul className="ht-rows">{list.map(taskRow)}</ul>
    </>
  );

  return (
    <div className="ht">
      <style>{HIFZ_CSS}{teacherCss}</style>
      {onBack && <div><button className="hz-btn hz-btn-ghost" onClick={onBack}><ChevronLeft size={18} aria-hidden="true" />{student.className || "Back"}</button></div>}
      {error && <div className="hz-error" role="alert">{error}</div>}

      <section className="hz-card" aria-label="Memorization">
        <div className="hz-row">
          <h2 className="hz-h2" style={{ margin: 0 }}><BookOpenText size={22} aria-hidden="true" />{student.name} <span className="hz-muted" style={{ fontWeight: 400 }}>{student.studentCode}</span></h2>
          <span className="hz-big">{stats.percent}%</span>
        </div>
        <div className="hz-bar" style={{ margin: "12px 0" }} role="progressbar" aria-label="Quran memorized" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.percent}><div style={{ width: `${stats.percent}%` }} /></div>
        <div className="hz-kv">
          <div><span>Memorised</span><strong>{describeAmount(stats.memorizedUnits)}</strong></div>
          <div><span>Target year (set by the student)</span><strong>{stats.goalYear ? `End of ${stats.goalYear}` : "Not chosen yet"}</strong></div>
          <div><span>Streak</span><strong><Flame size={14} aria-hidden="true" /> {streak.current} day{streak.current === 1 ? "" : "s"}</strong></div>
          <div><span>Tasks waiting</span><strong>{tasks.filter((t) => !t.completedAt).length}</strong></div>
        </div>
        {editingProfile || needsProfile ? (
          <div style={{ marginTop: 16 }}>
            <h3 className="hz-h2" style={{ fontSize: 16 }}><Target size={18} aria-hidden="true" />Hifz plan</h3>
            <ProfileEditor profile={data.profile} tasks={tasks} busy={busy} onCancel={data.hasProfile && !data.profile?.fromLegacy ? () => setEditingProfile(false) : null}
              onSave={(p) => run(() => repo.saveProfile(p)).then((ok) => ok && setEditingProfile(false))} />
          </div>
        ) : (
          <button className="hz-btn hz-btn-ghost" style={{ marginTop: 8 }} onClick={() => setEditingProfile(true)}><Target size={16} aria-hidden="true" />Change Hifz plan</button>
        )}
      </section>

      <section className="hz-card" aria-label="Tasks">
        <h2 className="hz-h2"><CalendarDays size={22} aria-hidden="true" />Tasks</h2>
        <p className="hz-muted" style={{ marginTop: 0 }}>
          {planReady
            ? <>Set automatically from the Hifz plan for the class days{student.schedule?.days?.length ? ` (${student.schedule.days.join(", ")})` : ""}. When the student finishes a task you see “Student finished”. Listen, then approve it and the next one is set; the student is notified.</>
            : "Save the Hifz plan above to start. The tasks are then set automatically for the class days."}
        </p>
        {/* New Hifz, Short, Long Muraja'ah always in that order; approved today stays green in its place until tomorrow. */}
        {(() => {
          const doneCount = tasks.filter((t) => t.completedAt).length;
          const any = groups.today.length + groups.overdue.length + groups.upcoming.length;
          return (
            <>
              {!any && planReady && <p className="hz-muted" style={{ margin: 0 }}>Setting the next tasks…</p>}
              {group(`Today · ${fmtDate(today)}`, groups.today)}
              {group("Not finished from earlier days", groups.overdue)}
              {group("Coming up", groups.upcoming)}
              {doneCount > 0 && <p className="hz-muted" style={{ margin: "14px 0 0" }}>{doneCount} done task{doneCount === 1 ? "" : "s"} below in History.</p>}
            </>
          );
        })()}
      </section>

      <HistorySection tasks={tasks} mistakes={mistakes} />

      {marking && listenAndMark()}

    </div>
  );
}

// ---------- all of the teacher's Hifz students ----------

export function TeacherHifz({ students, teacherId }) {
  const [openId, setOpenId] = useState(null);
  const [query, setQuery] = useState("");
  const [openClass, setOpenClass] = useState(null); // class whose students are shown
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const ids = useMemo(() => students.map((s) => s.id), [students]);

  // One query per table for all of them (row-level security keeps it to theirs).
  const loadOverview = useCallback(async () => {
    if (!ids.length) { setOverview({}); return; }
    try {
      // hifz_profiles is keyed by student_id (no id column).
      const fetch = (table) => selectAll(() => supabase.from(table).select("*").in("student_id", ids).order("created_at").order(table === "hifz_profiles" ? "student_id" : "id"));
      const goalsRes = supabase.from("hifz_goals").select("student_id, goal_year").in("student_id", ids);
      const [profiles, tasks, mistakes, { data: goalRows, error: goalsErr }] = await Promise.all([...["hifz_profiles", "hifz_tasks", "hifz_mistakes"].map(fetch), goalsRes]);
      if (goalsErr) throw new Error(goalsErr.message);
      const goals = goalRows || [];
      const today = maldivesToday();
      const out = {};
      for (const id of ids) {
        const p = profiles.find((r) => r.student_id === id);
        out[id] = summarizeHifz({
          profile: p ? HIFZ_TASK_MAPS.profileFromDb(p) : null,
          goalYear: goals.find((g) => g.student_id === id)?.goal_year ?? null,
          tasks: tasks.filter((r) => r.student_id === id).map(HIFZ_TASK_MAPS.taskFromDb),
          mistakes: mistakes.filter((r) => r.student_id === id).map(HIFZ_TASK_MAPS.mistakeFromDb),
        }, today);
      }
      setOverview(out);
      setError("");
    } catch (e) { setError(e.message); }
  }, [ids]);
  useEffect(() => { loadOverview(); }, [loadOverview]);

  const opened = students.find((s) => s.id === openId);
  const repo = useMemo(() => (opened ? createSupabaseHifzRepo(supabase, opened.id, teacherId) : null), [opened, teacherId]);

  return (
    <div>
      <style>{HIFZ_CSS}{teacherCss}</style>
      {opened ? (
        <TeacherHifzStudent key={opened.id} student={opened} repo={repo} onBack={() => { setOpenId(null); loadOverview(); }} />
      ) : (
        <div className="ht">
          <div className="hz-row">
            <div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#123B67" }}>Hifz</div>
              <div className="hz-muted">Set each student's New Hifz, Short and Long Muraja'ah, and mark mistakes on the Mushaf.</div>
            </div>
          </div>
          {error && <div className="hz-error" role="alert">{error}</div>}
          {students.length === 0 ? (
            <div className="hz-card hz-muted">None of your students are enrolled in Hifz. The admin chooses Hifz, Thilawa or both when adding a student.</div>
          ) : (
            <ClassBrowser students={students} query={query} onQuery={setQuery} openClass={openClass} onOpenClass={setOpenClass} gridClass="ht-grid"
              summary={(list) => {
                const os = list.map((s) => overview?.[s.id]).filter(Boolean);
                const behind = os.filter((o) => o.overdue.length > 0).length;
                const check = os.filter((o) => o.toCheck.length > 0).length;
                const noStart = os.filter((o) => !o.hasProfile).length;
                return <>{check > 0 && <span className="hz-badge hz-badge-submitted"><CheckCheck size={12} aria-hidden="true" /> {check} to listen</span>}{behind > 0 && <span className="hz-badge hz-badge-partial">{behind} not finished</span>}{noStart > 0 && <span className="hz-badge hz-badge-empty">{noStart} starting point not set</span>}</>;
              }}
              renderStudent={(s) => {
                const o = overview?.[s.id];
                const doneToday = o?.todayTasks.filter((t) => t.completedAt).length ?? 0;
                return (
                  <button key={s.id} type="button" className="ht-card" onClick={() => setOpenId(s.id)}>
                    <div className="ht-card-head"><b>{s.name}</b><span>{s.studentCode}</span></div>
                    <div className="hz-row"><span className="hz-muted">Memorised</span><b style={{ color: "#1452A8" }}>{o ? `${o.stats.percent}%` : "—"}</b></div>
                    <div className="hz-bar hz-bar-sm" aria-hidden="true"><div style={{ width: `${o?.stats.percent ?? 0}%` }} /></div>
                    <div className="ht-tags">
                      {!o ? <span className="hz-muted">Loading…</span> : (
                        <>
                          {o.todayTasks.length > 0
                            ? <span className={`hz-badge ${doneToday === o.todayTasks.length ? "hz-badge-completed" : "hz-badge-pending"}`}>Today {doneToday}/{o.todayTasks.length} done</span>
                            : <span className="hz-badge hz-badge-empty">Nothing set today</span>}
                          {o.toCheck.length > 0 && <span className="hz-badge hz-badge-submitted"><CheckCheck size={12} aria-hidden="true" /> {o.toCheck.length} finished · listen</span>}
                          {o.overdue.length > 0 && <span className="hz-badge hz-badge-partial">{o.overdue.length} not finished</span>}
                          {o.openMistakes.length > 0 && <span className="hz-mistake-badge"><Highlighter size={12} aria-hidden="true" />{o.openMistakes.length}</span>}
                          {!o.hasProfile && <span className="hz-badge hz-badge-empty">Starting point not set</span>}
                        </>
                      )}
                    </div>
                  </button>
                );
              }} />
          )}
        </div>
      )}
    </div>
  );
}
