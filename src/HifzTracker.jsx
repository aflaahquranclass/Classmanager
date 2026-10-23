import { useState, useEffect, useCallback } from "react";
import { BookOpenText, RotateCw, History, Flame, CalendarDays, CheckCircle2, Clock, Pencil, ChevronLeft, ChevronRight, AlertTriangle, ArrowRight, X } from "lucide-react";
import { TP } from "./App.jsx";
import { SURAHS, JUZ_START_PAGES, TOTAL_PAGES, TOTAL_UNITS, UNITS_PER_PAGE, UNITS_PER_LINE, pageToUnit, unitToPage, juzStartUnit, juzEndUnit, juzOfPage, surahsOnPages, describeRange, describeUnit, describeAmount } from "./hifz/quran.js";
import { NEW_TARGET_OPTIONS, SHORT_TARGET_OPTIONS, unitsOf, intersect, subtract, toSet, goalCheck, validateSettings, localDate } from "./hifz/engine.js";
import { loadTracker, recordProgress, saveSettings, previewSettingsChange } from "./hifz/service.js";

const ACTIVITY_INFO = {
  new: { title: "New Hifz", Icon: BookOpenText },
  short: { title: "Short Muraja'ah", Icon: RotateCw },
  long: { title: "Long Muraja'ah", Icon: History },
};

const fmtDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const surahEndPage = (i) => (i + 1 < SURAHS.length ? Math.max(SURAHS[i].startPage, SURAHS[i + 1].startPage - 1) : TOTAL_PAGES);
const pagesOfSurah = (num) => {
  const i = num - 1;
  return Array.from({ length: surahEndPage(i) - SURAHS[i].startPage + 1 }, (_, k) => SURAHS[i].startPage + k);
};
const surahNames = ([s, e]) => surahsOnPages(unitToPage(s), unitToPage(e - 1)).map((x) => x.name).join(", ");

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
  @media (max-width: 420px) {
    .hz-card { padding: 16px; }
    .hz-grid3 { grid-template-columns: 1fr; }
    .hz-kv { grid-template-columns: 1fr 1fr; }
  }
`;

// ---------- position picker (Surah → page → line) ----------

function PositionPicker({ label, unit, onChange, allowLine = true, minPage = 1, maxPage = TOTAL_PAGES }) {
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

// ---------- setup / edit wizard ----------

const PATHS = {
  baqarah: { label: "Surah Al-Baqarah", hint: "Front to back, page 2 onward", direction: "forward", startUnit: pageToUnit(2) },
  naba: { label: "Surah An-Naba (Juz Amma)", hint: "Juz 30 first, then Juz 29, 28 …", direction: "juz_reverse", startUnit: pageToUnit(582) },
};

function defaultSettings(today) {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    goalYear: +today.slice(0, 4) + 5,
    startUnit: PATHS.baqarah.startUnit,
    direction: "forward",
    currentUnit: PATHS.baqarah.startUnit,
    extraMemorized: [],
    newTarget: UNITS_PER_PAGE,
    shortTarget: UNITS_PER_PAGE,
    longTarget: 2 * UNITS_PER_PAGE,
    longStartUnit: pageToUnit(1),
  };
}

export function SetupWizard({ repo, initial, onDone, onCancel }) {
  const today = localDate(new Date(), initial?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [s, setS] = useState(() => initial || defaultSettings(today));
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmNotes, setConfirmNotes] = useState(null);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const pathKey = s.direction === "juz_reverse" ? "naba" : "baqarah";
  const check = goalCheck(s, today);
  const extraJuz = new Set(JUZ_START_PAGES.map((_, i) => i + 1).filter((j) => unitsOf(intersect([[juzStartUnit(j), juzEndUnit(j)]], s.extraMemorized)) === juzEndUnit(j) - juzStartUnit(j)));
  const steps = ["Goal", "Start", "New Hifz", "Short", "Long"];
  const thisYear = +today.slice(0, 4);

  const toggleJuz = (j) => {
    const r = [juzStartUnit(j), juzEndUnit(j)];
    set({ extraMemorized: extraJuz.has(j) ? subtract(toSet(s.extraMemorized), [r]) : toSet([...s.extraMemorized, r]) });
  };

  const finish = async (confirmed = false) => {
    const errors = validateSettings(s, today);
    if (errors.length) { setError(errors.join(" ")); return; }
    setError("");
    if (initial && !confirmed) {
      const notes = await previewSettingsChange(repo, s);
      if (notes.length) { setConfirmNotes(notes); return; }
    }
    setSaving(true);
    try {
      await saveSettings(repo, s);
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
      setConfirmNotes(null);
    }
  };

  return (
    <section className="hz-card" aria-label={initial ? "Edit Hifz plan" : "Set up Hifz Tracker"}>
      <div className="hz-row" style={{ marginBottom: 12 }}>
        <h2 className="hz-h2" style={{ margin: 0 }}><BookOpenText size={22} aria-hidden="true" />{initial ? "Edit Hifz Plan" : "Set up your Hifz plan"}</h2>
        {onCancel && <button className="hz-btn hz-btn-ghost" onClick={onCancel} aria-label="Close"><X size={18} aria-hidden="true" /></button>}
      </div>
      <div className="hz-wiz-steps" aria-label={`Step ${step + 1} of ${steps.length}: ${steps[step]}`}>
        {steps.map((name, i) => <span key={name} className={i <= step ? "on" : ""} />)}
      </div>

      {step === 0 && (
        <>
          <p className="hz-q">By which year do you want to complete memorizing the Quran?</p>
          <div className="hz-chips" style={{ marginTop: 14 }}>
            {Array.from({ length: 16 }, (_, i) => thisYear + i).map((y) => (
              <button key={y} className="hz-chip" style={{ minWidth: 72 }} aria-pressed={s.goalYear === y} onClick={() => set({ goalYear: y })}>{y}</button>
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <p className="hz-q">Where have you started your Hifz?</p>
          <div className="hz-options">
            {Object.entries(PATHS).map(([key, p]) => (
              <button key={key} className="hz-option" aria-pressed={pathKey === key}
                onClick={() => set({ direction: p.direction, startUnit: p.startUnit, currentUnit: p.startUnit })}>
                {p.label}<small>{p.hint}</small>
              </button>
            ))}
          </div>
          <PositionPicker label="Exact starting point" unit={s.startUnit} allowLine={false}
            minPage={pathKey === "naba" ? 1 : 2}
            onChange={(u) => set({ startUnit: u, currentUnit: u })} />
          <PositionPicker label="Where you are now (the next portion you'll memorize)" unit={s.currentUnit}
            onChange={(u) => set({ currentUnit: u })} />
          <p className="hz-muted" style={{ marginTop: 8 }}>
            Everything from your starting point up to here counts as already memorized. {pathKey === "naba" ? "After Juz 30 you continue with Juz 29, then 28, and so on." : "You continue page by page towards the end of the Mushaf."}
          </p>
        </>
      )}

      {step === 2 && (
        <>
          <p className="hz-q">How much Quran can you memorize per day?</p>
          <div className="hz-options">
            {NEW_TARGET_OPTIONS.map((o) => (
              <button key={o.units} className="hz-option" aria-pressed={s.newTarget === o.units} onClick={() => set({ newTarget: o.units })}>{o.label}</button>
            ))}
          </div>
          <p className="hz-muted" style={{ marginTop: 12 }}>This is your daily maximum. If you fall behind, unfinished work comes first and the rest of the plan moves later. Your daily amount never grows.</p>
          <div className="hz-kv">
            <div><span>Estimated completion</span><strong>{fmtDate(check.estimatedDate)}</strong></div>
            <div><span>Your goal</span><strong>End of {s.goalYear}</strong></div>
          </div>
          {!check.onTrack && (
            <div className="hz-note"><AlertTriangle size={18} aria-hidden="true" />
              <span>At this pace you'd finish after {s.goalYear}. {check.recommended ? `To reach your goal, about ${check.recommended.label} a day would work.` : "Reaching that year would need more than 2 pages a day. You could pick a later year."} You can keep your choice.</span>
            </div>
          )}
        </>
      )}

      {step === 3 && (
        <>
          <p className="hz-q">How many pages can you revise daily for Short Muraja'ah?</p>
          <div className="hz-options">
            {SHORT_TARGET_OPTIONS.map((o) => (
              <button key={o.units} className="hz-option" aria-pressed={s.shortTarget === o.units} onClick={() => set({ shortTarget: o.units })}>{o.label}</button>
            ))}
          </div>
          <p className="hz-muted" style={{ marginTop: 12 }}>Short Muraja'ah goes through what you've memorized on your Hifz path, in order, and starts again from the beginning when it reaches the end. New pages are added as you memorize them.</p>
        </>
      )}

      {step === 4 && (
        <>
          <p className="hz-q">Where would you like to start your Long Muraja'ah?</p>
          <div className="hz-field">
            <span>Juz</span>
            <select className="hz-select" value={juzOfPage(unitToPage(s.longStartUnit))} onChange={(e) => set({ longStartUnit: juzStartUnit(+e.target.value) })}>
              {JUZ_START_PAGES.map((p, i) => <option key={i} value={i + 1}>Juz {i + 1} (page {p})</option>)}
            </select>
          </div>
          <PositionPicker label="Surah and page" unit={s.longStartUnit} allowLine={false} onChange={(u) => set({ longStartUnit: u })} />
          <div className="hz-field">
            <label htmlFor="hz-long-target">How many pages would you like to revise daily for Long Muraja'ah?</label>
            <input id="hz-long-target" className="hz-input" type="number" min="0.5" step="0.5" inputMode="decimal"
              value={s.longTarget / UNITS_PER_PAGE}
              onChange={(e) => { const v = Math.round(+e.target.value * 2) / 2; set({ longTarget: v > 0 ? v * UNITS_PER_PAGE : 0 }); }} />
          </div>
          <div className="hz-field">
            <span>Have you memorized any other complete juz outside your Hifz path?</span>
            <div className="hz-chips">
              {JUZ_START_PAGES.map((_, i) => (
                <button key={i} className="hz-chip" aria-pressed={extraJuz.has(i + 1)} onClick={() => toggleJuz(i + 1)}>{i + 1}</button>
              ))}
            </div>
            <span className="hz-muted" style={{ fontWeight: 400 }}>Long Muraja'ah only uses pages you've memorized, so this helps it include them.</span>
          </div>
        </>
      )}

      {error && <div className="hz-error" style={{ marginTop: 14 }} role="alert">{error}</div>}

      <div className="hz-wiz-nav">
        <button className="hz-btn hz-btn-outline" onClick={() => setStep(step - 1)} disabled={step === 0}><ChevronLeft size={18} aria-hidden="true" />Back</button>
        {step < steps.length - 1
          ? <button className="hz-btn hz-btn-primary" onClick={() => setStep(step + 1)}>Next<ChevronRight size={18} aria-hidden="true" /></button>
          : <button className="hz-btn hz-btn-primary" onClick={() => finish()} disabled={saving}>{saving ? "Saving…" : initial ? "Save changes" : "Create my plan"}</button>}
      </div>

      {confirmNotes && (
        <div className="hz-modal-back" role="dialog" aria-modal="true" aria-labelledby="hz-confirm-title">
          <div className="hz-modal">
            <h3 id="hz-confirm-title" className="hz-q">Before you save</h3>
            <ul>{confirmNotes.map((n) => <li key={n}>{n}</li>)}</ul>
            <div className="hz-wiz-nav">
              <button className="hz-btn hz-btn-outline" onClick={() => setConfirmNotes(null)}>Go back</button>
              <button className="hz-btn hz-btn-primary" onClick={() => finish(true)} disabled={saving}>{saving ? "Saving…" : "Apply changes"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------- task card ----------

function TaskCard({ activity, row, onProgress, busy }) {
  const { title, Icon } = ACTIVITY_INFO[activity];
  const [partial, setPartial] = useState("");
  if (!row) return null;
  const total = unitsOf(row.segments);
  const done = unitsOf(row.completed);
  const carried = toSet(intersect(row.segments, row.pendingIn));
  const isCarried = ([s, e]) => carried.some(([cs, ce]) => s < ce && e > cs);
  const statusLabel = { completed: "Completed", partial: "Partly done", pending: "To do", empty: "Nothing to revise" }[row.status];
  const partialChoices = [];
  for (let u = UNITS_PER_LINE; u < total; u += UNITS_PER_LINE) partialChoices.push(u);

  return (
    <article className={`hz-task ${row.status === "completed" ? "hz-task-done" : ""}`} aria-label={title}>
      <div className="hz-task-head">
        <span className="hz-task-icon">{row.status === "completed" ? <CheckCircle2 size={20} aria-hidden="true" /> : <Icon size={20} aria-hidden="true" />}</span>
        <span className="hz-task-title">{title}</span>
        <span className={`hz-badge hz-badge-${row.status}`}>{statusLabel}</span>
      </div>
      {total === 0 ? (
        <p className="hz-muted" style={{ margin: 0 }}>{activity === "new" ? "You've reached the end of your Hifz path. MashaAllah!" : "Nothing memorized yet for this revision. It starts once you have memorized pages."}</p>
      ) : (
        <>
          {row.segments.map((r) => (
            <div key={r.join("-")} className="hz-portion">
              {describeRange(r)}{isCarried(r) && <span className="hz-carry">Carried over</span>}
              <small>{surahNames(r)}</small>
            </div>
          ))}
          <div className="hz-muted">Daily target: {describeAmount(row.target)} · Done: {describeAmount(done)} of {describeAmount(total)}</div>
          <div className="hz-bar hz-bar-sm" aria-hidden="true"><div style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
          {row.status !== "completed" ? (
            <>
              <button className="hz-btn hz-btn-primary" disabled={busy} onClick={() => onProgress(row, total)}><CheckCircle2 size={18} aria-hidden="true" />Mark as completed</button>
              {partialChoices.length > 0 && (
                <div className="hz-partial">
                  <select className="hz-select" aria-label={`${title}: how much is done`} value={partial} onChange={(e) => setPartial(e.target.value)}>
                    <option value="">Record partly done…</option>
                    {done > 0 && <option value="0">Nothing done yet (undo)</option>}
                    {partialChoices.map((u) => <option key={u} value={u}>{describeAmount(u)} done</option>)}
                  </select>
                  <button className="hz-btn hz-btn-outline" disabled={busy || partial === ""} onClick={() => { onProgress(row, +partial); setPartial(""); }}>Save</button>
                </div>
              )}
            </>
          ) : (
            <button className="hz-btn hz-btn-ghost" disabled={busy} onClick={() => onProgress(row, 0)}>Undo</button>
          )}
        </>
      )}
    </article>
  );
}

// ---------- main tracker ----------

export default function HifzTracker({ repo, onSummary }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const t = await loadTracker(repo);
      setState(t);
      onSummary?.(t);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, [repo, onSummary]);

  useEffect(() => { refresh(); }, [refresh]);

  const onProgress = async (row, units) => {
    setBusy(true);
    try {
      await recordProgress(repo, row.id, units);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !state) return <div className="hz"><div className="hz-error" role="alert">{error}</div></div>;
  if (!state) return <div className="hz"><div className="hz-card hz-muted">Loading your Hifz plan…</div></div>;
  if (state.needsSetup) return <div className="hz"><SetupWizard repo={repo} onDone={refresh} /></div>;
  if (editing) return <div className="hz"><SetupWizard repo={repo} initial={state.settings} onCancel={() => setEditing(false)} onDone={() => { setEditing(false); refresh(); }} /></div>;

  const { stats, streak, todayRows, today } = state;
  const pct = stats.percent;
  const backlog = ["new", "short", "long"].map((a) => {
    const row = todayRows[a];
    if (!row) return null;
    const carriedToday = intersect(row.segments, row.pendingIn);
    const later = subtract(row.pendingIn, row.segments);
    return unitsOf(row.pendingIn) ? { a, carriedToday, later } : null;
  }).filter(Boolean);

  return (
    <div className="hz">
      {error && <div className="hz-error" role="alert">{error}</div>}

      <section className="hz-card" aria-label="Overall memorization">
        <div className="hz-row">
          <h2 className="hz-h2" style={{ margin: 0 }}><BookOpenText size={22} aria-hidden="true" />Overall Memorization</h2>
          <button className="hz-btn hz-btn-outline" onClick={() => setEditing(true)}><Pencil size={16} aria-hidden="true" />Edit Hifz Plan</button>
        </div>
        <div className="hz-row" style={{ margin: "14px 0 10px" }}>
          <span className="hz-muted">{describeAmount(stats.memorizedUnits)} of 604 pages</span>
          <span className="hz-big">{pct}%</span>
        </div>
        <div className="hz-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><div style={{ width: `${pct}%` }} /></div>
        <div className="hz-kv">
          <div><span>Remaining</span><strong>{describeAmount(stats.remainingUnits)}</strong></div>
          <div><span>Completion goal</span><strong>End of {stats.goalYear}</strong></div>
          <div><span>Estimated completion</span><strong>{fmtDate(stats.estimatedDate)}</strong></div>
          <div><span>Left on your Hifz path</span><strong>{describeAmount(stats.planRemainingUnits)}</strong></div>
        </div>
        {!stats.onTrack && (
          <div className="hz-note"><AlertTriangle size={18} aria-hidden="true" />
            <span>At your current daily target you'd finish after {stats.goalYear}. {stats.recommended ? `About ${stats.recommended.label} a day would reach your goal.` : "Your goal would need more than 2 pages a day. You could choose a later year."} You can change this in Edit Hifz Plan.</span>
          </div>
        )}
      </section>

      <section className="hz-card" aria-label="Today's Hifz plan">
        <h2 className="hz-h2"><CalendarDays size={22} aria-hidden="true" />Today's Hifz Plan <span className="hz-muted" style={{ fontWeight: 400 }}>· {fmtDate(today)}</span></h2>
        <div className="hz-tasks">
          {["new", "short", "long"].map((a) => <TaskCard key={a} activity={a} row={todayRows[a]} onProgress={onProgress} busy={busy} />)}
        </div>
      </section>

      <section className="hz-card" aria-label="Pending work">
        <h2 className="hz-h2"><Clock size={22} aria-hidden="true" />Pending Work</h2>
        {backlog.length === 0 ? (
          <p className="hz-muted" style={{ margin: 0 }}>Nothing carried over. You're on schedule.</p>
        ) : (
          <ul className="hz-pending-list">
            {backlog.map(({ a, carriedToday, later }) => (
              <li key={a}>
                <b>{ACTIVITY_INFO[a].title}</b>
                <span>
                  {unitsOf(carriedToday) > 0 && <>Carried into today: {toSet(carriedToday).map(describeRange).join(", ")}. </>}
                  {unitsOf(later) > 0 && <>Still waiting: {toSet(later).map(describeRange).join(", ")} ({describeAmount(unitsOf(later))}). </>}
                  <span className="hz-muted">Your schedule moved later so today stays within your daily target.</span>
                </span>
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
            <div key={d.date} className={`${d.active ? "on" : ""} ${d.date === today ? "today" : ""}`} title={`${fmtDate(d.date)}${d.active ? ": active" : ""}`}>
              {+d.date.slice(8)}
            </div>
          ))}
        </div>
        <p className="hz-muted" style={{ marginBottom: 0 }}>Complete at least one task a day to keep your streak. It survives one missed day and resets after two missed days in a row.</p>
      </section>

      <section className="hz-card" aria-label="Revision tracking">
        <h2 className="hz-h2"><RotateCw size={22} aria-hidden="true" />Revision Tracking</h2>
        <div className="hz-rev">
          {["short", "long"].map((a) => {
            const r = stats.revision[a];
            return (
              <div key={a}>
                <strong style={{ color: TP.navy }}>{ACTIVITY_INFO[a].title}</strong>
                <span className="hz-muted">Cycle {r.cycle} · {Math.round(r.cycleProgress * 100)}% through</span>
                <div className="hz-bar hz-bar-sm" aria-hidden="true"><div style={{ width: `${r.cycleProgress * 100}%` }} /></div>
                <span className="hz-muted">
                  {r.eligibleUnits ? <>Next up: {r.position == null ? "the beginning" : describeUnit(r.position)} <ArrowRight size={12} aria-hidden="true" /> {describeAmount(r.eligibleUnits)} in this cycle</> : "Nothing memorized for this revision yet"}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
