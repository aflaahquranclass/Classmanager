// Teacher portal: Hifz. The teacher plans each student's Hifz — New Hifz,
// Short and Long Muraja'ah portions for a day — changes or moves them, sets
// the next day's portion in one tap, and while listening highlights mistakes
// on the Madinah Mushaf (tap a word), clearing each one once it's corrected.
// The student's portal updates live and they get a phone notification.

import { useState, useEffect, useMemo, useCallback } from "react";
import { BookOpenText, CalendarDays, ChevronLeft, Trash2, Pencil, Plus, CheckCircle2, Highlighter, ArrowRight, Search, Flame, Target, X, Undo2, Check } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { HIFZ_CSS, ACTIVITY_INFO, PositionPicker, PortionText, TaskReader, useHifz, fmtDate, fmtDay, surahNames } from "../HifzTracker.jsx";
import { TOTAL_UNITS, UNITS_PER_LINE, pageToUnit, describeRange, describeAmount } from "./quran.js";
import { unitsOf, toSet, subtract, addDays } from "./engine.js";
import { ACTIVITIES, suggestPortion, suggestDate, nextAfter, mistakesForTask, summarizeHifz, planOf, PATH_STARTS } from "./tasks.js";
import { createSupabaseHifzRepo, HIFZ_TASK_MAPS } from "./taskRepos.js";
import { selectAll } from "../thilawa/repos.js";
import { maldivesToday } from "../dates.js";

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
  .ht-act { border: 1px solid #DCEBF8; border-radius: 14px; padding: 12px 14px; background: #FFFFFF; }
  .ht-act-off { background: #F7F9FB; }
  .ht-act-off .ht-act-body { display: none; }
  .ht-act-head { display: flex; align-items: center; gap: 10px; min-height: 40px; }
  .ht-act-head label { display: flex; align-items: center; gap: 10px; font-weight: 700; color: #123B67; cursor: pointer; flex: 1; }
  .ht-act-head input { width: 20px; height: 20px; accent-color: #176FD1; }
  .ht-act-head .hz-muted { font-size: 13px; }
  .ht-act-body .hz-field { margin-top: 8px; }
  .ht-sum { font-size: 13px; color: #1452A8; margin-top: 8px; }
  .ht-rows { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
  .ht-row { border: 1px solid #E1EDF8; border-radius: 14px; background: #F7FAFD; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
  .ht-row-done { background: linear-gradient(160deg, #ECFAF4, #FFFFFF 60%); border-color: #9FD9BE; }
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
  .ht-ranges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .ht-ranges span { display: inline-flex; align-items: center; gap: 6px; background: #E4F1FC; color: #1D5FA8; border-radius: 999px; padding: 4px 6px 4px 12px; font-size: 13px; font-weight: 600; }
  .ht-ranges button { border: none; background: transparent; color: inherit; cursor: pointer; width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
  .ht-ranges button:hover { background: #CFE4F8; }
  .ht-plan { display: flex; flex-direction: column; gap: 14px; }
  .ht-plan-step { border: 1px solid #E1EDF8; border-radius: 14px; padding: 14px; background: #F9FBFE; }
  .ht-plan-step h4 { margin: 0 0 10px; font-size: 15px; color: #123B67; }
  .ht-plan-step .hz-field:first-of-type { margin-top: 10px; }
  @media (max-width: 520px) { .ht-row-actions .hz-btn { flex: 1 1 auto; } }
`;

// From / To (last line included) pickers for a [start, end) portion.
function PortionFields({ value, onChange }) {
  const toUnit = Math.max(value.start, value.end - UNITS_PER_LINE);
  return (
    <>
      <PositionPicker label="From" unit={value.start} onChange={(u) => onChange({ start: u, end: Math.max(value.end, u + UNITS_PER_LINE) })} />
      <PositionPicker label="To (this line included)" unit={toUnit} onChange={(u) => onChange({ start: Math.min(value.start, u), end: Math.min(TOTAL_UNITS, u + UNITS_PER_LINE) })} />
      <div className="ht-sum">{describeRange([value.start, value.end])} · {describeAmount(value.end - value.start)} · {surahNames([value.start, value.end])}</div>
    </>
  );
}

// ---------- the student's Hifz plan ----------
// Where the Hifz started, what was memorised before (page to page), and how
// Short and Long Muraja'ah work. New, Short and Long portions are worked out
// from this (tasks.js: suggestPortion). The target year is the student's own.

const PATHS = [
  { direction: "forward", label: "From Al-Baqarah", hint: "Front to back, page 2 onward" },
  { direction: "juz_reverse", label: "From An-Naba", hint: "Juz 30 first, then Juz 29, 28 …" },
];

function ProfileEditor({ profile, onSave, onCancel, busy }) {
  const start = planOf(profile);
  const [plan, setPlan] = useState(() => ({ ...start, memorized: toSet(start.memorized), startUnit: start.startUnit ?? PATH_STARTS[start.direction] }));
  const set = (patch) => setPlan((p) => ({ ...p, ...patch }));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pagesError, setPagesError] = useState("");
  const addPages = () => {
    const a = Math.round(+from);
    const b = Math.round(+(to || from));
    if (!(a >= 1 && b >= a && b <= 604)) { setPagesError("Pages go from 1 to 604, and the last page can't be before the first."); return; }
    set({ memorized: toSet([...plan.memorized, [pageToUnit(a), pageToUnit(b + 1)]]) });
    setFrom(""); setTo(""); setPagesError("");
  };
  const longStart = plan.longStartUnit ?? plan.memorized[0]?.[0] ?? pageToUnit(1);
  return (
    <div className="ht-plan">
      {profile?.fromLegacy && <div className="hz-note" style={{ marginTop: 0, marginBottom: 12 }}><Target size={18} aria-hidden="true" /><span>Filled in from the plan the student made themself. Check it and save.</span></div>}

      <div className="ht-plan-step">
        <h4>1. Where did the Hifz start?</h4>
        <div className="hz-options" style={{ marginTop: 0 }}>
          {PATHS.map((p) => (
            <button key={p.direction} type="button" className="hz-option" aria-pressed={plan.direction === p.direction}
              onClick={() => set({ direction: p.direction, startUnit: PATH_STARTS[p.direction] })}>{p.label}<small>{p.hint}</small></button>
          ))}
        </div>
        <PositionPicker label="Exact starting page" unit={plan.startUnit} allowLine={false} minPage={plan.direction === "forward" ? 2 : 1} onChange={(u) => set({ startUnit: u })} />
      </div>

      <div className="ht-plan-step">
        <h4>2. Pages memorised before</h4>
        <div className="hz-grid3">
          <input className="hz-input" type="number" min="1" max="604" inputMode="numeric" placeholder="From page" aria-label="From page" value={from} onChange={(e) => setFrom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPages()} />
          <input className="hz-input" type="number" min="1" max="604" inputMode="numeric" placeholder="To page" aria-label="To page" value={to} onChange={(e) => setTo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPages()} />
          <button type="button" className="hz-btn hz-btn-outline" onClick={addPages} disabled={!from}><Plus size={16} aria-hidden="true" />Add pages</button>
        </div>
        {pagesError && <div className="hz-error" role="alert" style={{ marginTop: 8 }}>{pagesError}</div>}
        <div className="ht-ranges" aria-label="Memorised before">
          {plan.memorized.length === 0 && <span style={{ background: "#EEF0F3", color: "#5B6B79", paddingRight: 12 }}>Nothing yet</span>}
          {plan.memorized.map((r) => (
            <span key={r.join("-")}>{describeRange(r)}
              <button type="button" aria-label={`Remove ${describeRange(r)}`} onClick={() => set({ memorized: subtract(plan.memorized, [r]) })}><X size={14} aria-hidden="true" /></button>
            </span>
          ))}
        </div>
        <p className="hz-muted" style={{ margin: "8px 0 0" }}>{describeAmount(unitsOf(plan.memorized))} memorised before. Completed New Hifz tasks are added automatically.</p>
      </div>

      <div className="ht-plan-step">
        <h4>3. Short Muraja'ah: how many pages a day?</h4>
        <div className="hz-chips">
          {[1, 2, 3, 4, 5, 6].map((n) => <button key={n} type="button" className="hz-chip" style={{ minWidth: 52 }} aria-pressed={plan.shortPages === n} onClick={() => set({ shortPages: n })}>{n}</button>)}
          <input className="hz-input" style={{ width: 110 }} type="number" min="0.5" max="40" step="0.5" inputMode="decimal" aria-label="Short Muraja'ah pages"
            value={plan.shortPages} onChange={(e) => { const v = Math.round(+e.target.value * 2) / 2; if (v > 0) set({ shortPages: Math.min(40, v) }); }} />
        </div>
        <p className="hz-muted" style={{ margin: "8px 0 0" }}>Each day it revises the {plan.shortPages} most recently memorised page{plan.shortPages === 1 ? "" : "s"} of the Hifz path.</p>
      </div>

      <div className="ht-plan-step">
        <h4>4. Long Muraja'ah</h4>
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
      </div>

      <div className="hz-wiz-nav" style={{ justifyContent: "flex-end" }}>
        {onCancel && <button className="hz-btn hz-btn-outline" onClick={onCancel}>Cancel</button>}
        <button className="hz-btn hz-btn-primary" disabled={busy} onClick={() => onSave({ ...plan, longStartUnit: longStart })}>Save plan</button>
      </div>
    </div>
  );
}

// ---------- assigning ----------

const freshForm = (data) => {
  const date = suggestDate(data.tasks, data.today);
  const rows = {};
  for (const a of ACTIVITIES) {
    const p = suggestPortion(a, data.tasks, data.memorized, data.profile);
    rows[a] = { on: !!p, start: p?.start ?? pageToUnit(582), end: p?.end ?? pageToUnit(583), notes: "" };
  }
  return { date, rows };
};

function AssignForm({ data, onAssign, busy }) {
  const [form, setForm] = useState(() => freshForm(data));
  const setRow = (a, patch) => setForm((f) => ({ ...f, rows: { ...f.rows, [a]: { ...f.rows[a], ...patch } } }));
  const chosen = ACTIVITIES.filter((a) => form.rows[a].on);
  const already = data.tasks.filter((t) => t.taskDate === form.date);
  const submit = async () => {
    const ok = await onAssign(chosen.map((a) => ({ taskDate: form.date, activity: a, start: form.rows[a].start, end: form.rows[a].end, notes: form.rows[a].notes })));
    if (ok) setForm(freshForm({ ...data, tasks: [...data.tasks, ...chosen.map((a) => ({ ...form.rows[a], activity: a, taskDate: form.date, createdAt: new Date().toISOString() }))] }));
  };
  return (
    <div className="ht-assign">
      <div className="hz-field" style={{ marginTop: 0 }}>
        <label htmlFor="ht-date">Day</label>
        <div className="hz-row" style={{ justifyContent: "flex-start" }}>
          <input id="ht-date" className="hz-input" style={{ maxWidth: 220 }} type="date" value={form.date} onChange={(e) => e.target.value && setForm((f) => ({ ...f, date: e.target.value }))} />
          {[["Today", data.today], ["Tomorrow", addDays(data.today, 1)]].map(([label, d]) => (
            <button key={label} type="button" className="hz-chip" style={{ padding: "0 14px" }} aria-pressed={form.date === d} onClick={() => setForm((f) => ({ ...f, date: d }))}>{label}</button>
          ))}
        </div>
        {already.length > 0 && <span className="hz-muted" style={{ fontWeight: 400 }}>Already set for {fmtDay(form.date)}: {already.map((t) => ACTIVITY_INFO[t.activity].title).join(", ")}</span>}
      </div>
      {ACTIVITIES.map((a) => {
        const r = form.rows[a];
        const { title, Icon } = ACTIVITY_INFO[a];
        return (
          <div key={a} className={`ht-act ${r.on ? "" : "ht-act-off"}`}>
            <div className="ht-act-head">
              <label><input type="checkbox" checked={r.on} onChange={(e) => setRow(a, { on: e.target.checked })} /><Icon size={18} aria-hidden="true" />{title}</label>
              {!r.on && <span className="hz-muted">Not set</span>}
            </div>
            <div className="ht-act-body">
              <PortionFields value={r} onChange={(p) => setRow(a, p)} />
              <div className="hz-field">
                <label htmlFor={`ht-notes-${a}`}>Note for the student (optional)</label>
                <input id={`ht-notes-${a}`} className="hz-input" maxLength={1000} value={r.notes} onChange={(e) => setRow(a, { notes: e.target.value })} placeholder="e.g. Read it 10 times before memorising" />
              </div>
            </div>
          </div>
        );
      })}
      <button className="hz-btn hz-btn-primary" disabled={busy || chosen.length === 0} onClick={submit}>
        <Plus size={18} aria-hidden="true" />Set {chosen.length || ""} task{chosen.length === 1 ? "" : "s"} for {fmtDay(form.date)}
      </button>
    </div>
  );
}

function EditTask({ task, onSave, onCancel, busy }) {
  const [draft, setDraft] = useState({ taskDate: task.taskDate, start: task.start, end: task.end, notes: task.notes });
  return (
    <div>
      <div className="hz-field" style={{ marginTop: 0 }}>
        <label htmlFor={`ht-edit-date-${task.id}`}>Day</label>
        <input id={`ht-edit-date-${task.id}`} className="hz-input" style={{ maxWidth: 220 }} type="date" value={draft.taskDate} onChange={(e) => e.target.value && setDraft((d) => ({ ...d, taskDate: e.target.value }))} />
      </div>
      <PortionFields value={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} />
      <div className="hz-field">
        <label htmlFor={`ht-edit-notes-${task.id}`}>Note for the student</label>
        <input id={`ht-edit-notes-${task.id}`} className="hz-input" maxLength={1000} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
      </div>
      <div className="hz-wiz-nav" style={{ justifyContent: "flex-end", marginTop: 12 }}>
        <button className="hz-btn hz-btn-outline" onClick={onCancel}>Cancel</button>
        <button className="hz-btn hz-btn-primary" disabled={busy} onClick={() => onSave(draft)}>Save changes</button>
      </div>
    </div>
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

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try { await fn(); await refresh(); return true; } catch (e) { setError(e.message); return false; } finally { setBusy(false); }
  };

  if (!data) return <div className="ht">{error ? <div className="hz-error" role="alert">{error}</div> : <div className="hz-card hz-muted">Loading {student.name}…</div>}</div>;

  const { stats, streak, todayTasks, overdue, upcoming, recentDone, today, mistakes, openMistakes, memorized, tasks } = data;
  const marking = tasks.find((t) => t.id === markingId) || null;
  const selected = openMistakes.find((m) => `${m.verseKey}:${m.position}` === selectedKey) || null;
  const needsProfile = !data.hasProfile || data.profile?.fromLegacy;

  const tapWord = (w) => {
    setSelectedKey(w.key);
    const open = openMistakes.find((m) => m.verseKey === w.verseKey && m.position === w.position);
    if (open || busy) return; // tapping a marked word selects it; ignore taps while saving
    run(() => repo.addMistake({ page: w.page, line: w.line, verseKey: w.verseKey, position: w.position, wordText: w.text, taskId: marking?.id }));
  };
  const remove = async (what, fn) => {
    if (await confirmDialog({ title: `Delete this ${what}?`, message: "This can't be undone.", confirmLabel: "Delete" })) run(fn);
  };

  const taskRow = (t) => {
    const { title, Icon } = ACTIVITY_INFO[t.activity];
    const next = nextAfter(t, tasks, memorized, today, data.profile);
    const count = mistakesForTask(t, mistakes).length;
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
          <span className={`hz-badge ${t.completedAt ? "hz-badge-completed" : t.taskDate < today ? "hz-badge-partial" : "hz-badge-pending"}`}>{t.completedAt ? "Done" : t.taskDate < today ? "Not done" : "To do"}</span>
          {count > 0 && <span className="hz-mistake-badge"><Highlighter size={12} aria-hidden="true" />{count}</span>}
        </div>
        <PortionText task={t} />
        {t.notes && <div className="hz-task-notes">{t.notes}</div>}
        <div className="ht-row-actions">
          <button className="hz-btn hz-btn-primary" onClick={() => { setSelectedKey(null); setMarkingId(markingId === t.id ? null : t.id); setTimeout(() => document.getElementById("ht-mushaf")?.scrollIntoView({ behavior: "smooth" }), 50); }}>
            <Highlighter size={15} aria-hidden="true" />{markingId === t.id ? "Close Mushaf" : "Listen & mark"}
          </button>
          <button className="hz-btn hz-btn-outline" disabled={busy} onClick={() => run(() => repo.setTaskDone(t.id, !t.completedAt))}>
            {t.completedAt ? <><Undo2 size={15} aria-hidden="true" />Not done</> : <><CheckCircle2 size={15} aria-hidden="true" />Done</>}
          </button>
          <button className="hz-btn hz-btn-outline" onClick={() => setEditingId(t.id)}><Pencil size={15} aria-hidden="true" />Change</button>
          {next && (
            <button className="hz-btn hz-btn-outline" disabled={busy} title={`Set ${title} for ${fmtDay(next.taskDate)}: ${describeRange([next.start, next.end])}`}
              onClick={() => run(() => repo.addTasks([{ ...next, notes: "" }]))}>
              Next day: {describeRange([next.start, next.end])}<ArrowRight size={15} aria-hidden="true" />
            </button>
          )}
          <button className="hz-btn hz-btn-ghost" aria-label={`Delete ${title} for ${fmtDay(t.taskDate)}`} onClick={() => remove("task", () => repo.deleteTask(t.id))}><Trash2 size={15} aria-hidden="true" /></button>
        </div>
      </li>
    );
  };
  const group = (label, list) => list.length > 0 && (
    <>
      <div className="ht-group">{label}</div>
      <ul className="ht-rows">{list.map(taskRow)}</ul>
    </>
  );
  const recentFixed = mistakes.filter((m) => m.correctedAt).sort((a, b) => (a.correctedAt < b.correctedAt ? 1 : -1)).slice(0, 8);

  return (
    <div className="ht">
      <style>{HIFZ_CSS}{teacherCss}</style>
      {onBack && <div><button className="hz-btn hz-btn-ghost" onClick={onBack}><ChevronLeft size={18} aria-hidden="true" />All Hifz students</button></div>}
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
          <div><span>Mistakes to fix</span><strong>{openMistakes.length}</strong></div>
        </div>
        {editingProfile || needsProfile ? (
          <div style={{ marginTop: 16 }}>
            <h3 className="hz-h2" style={{ fontSize: 16 }}><Target size={18} aria-hidden="true" />Hifz plan</h3>
            <ProfileEditor profile={data.profile} busy={busy} onCancel={data.hasProfile && !data.profile?.fromLegacy ? () => setEditingProfile(false) : null}
              onSave={(p) => run(() => repo.saveProfile(p)).then((ok) => ok && setEditingProfile(false))} />
          </div>
        ) : (
          <button className="hz-btn hz-btn-ghost" style={{ marginTop: 8 }} onClick={() => setEditingProfile(true)}><Target size={16} aria-hidden="true" />Change Hifz plan</button>
        )}
      </section>

      <section className="hz-card" aria-label="Set Hifz tasks">
        <h2 className="hz-h2"><Plus size={22} aria-hidden="true" />Set Hifz Tasks</h2>
        <p className="hz-muted" style={{ marginTop: 0 }}>Portions are filled in to carry on from the last tasks. The student gets a phone notification.</p>
        <AssignForm key={`${tasks.length}-${data.today}-${stats.memorizedUnits}-${JSON.stringify(planOf(data.profile))}`} data={data} busy={busy} onAssign={(rows) => run(() => repo.addTasks(rows))} />
      </section>

      <section className="hz-card" aria-label="Tasks">
        <h2 className="hz-h2"><CalendarDays size={22} aria-hidden="true" />Tasks</h2>
        {tasks.length === 0 && <p className="hz-muted" style={{ margin: 0 }}>No tasks yet. Set the first ones above.</p>}
        {group(`Today · ${fmtDate(today)}`, todayTasks)}
        {group("Not finished from earlier days", overdue)}
        {group("Coming up", upcoming)}
        {group("Recently done", recentDone.slice(0, 6))}
      </section>

      {marking && (
        <section className="hz-card hz-reader-card" aria-label="Listen and mark mistakes" id="ht-mushaf">
          <div className="hz-row" style={{ marginBottom: 8 }}>
            <h2 className="hz-h2" style={{ margin: 0 }}><Highlighter size={22} aria-hidden="true" />Listen & mark · {ACTIVITY_INFO[marking.activity].title}</h2>
            <button className="hz-btn hz-btn-ghost" onClick={() => { setMarkingId(null); setSelectedKey(null); }} aria-label="Close Mushaf"><X size={18} aria-hidden="true" /></button>
          </div>
          <div className="hz-legend" style={{ marginBottom: 10 }}>
            <span>Tap a word the student gets wrong to highlight it. Tap a highlighted word to clear it.</span>
            <span><i style={{ background: "#FBD5CC", boxShadow: "0 0 0 1px #F2A595" }} />To fix</span>
            <span><i style={{ background: "#DDF5E9" }} />Corrected</span>
          </div>
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
          <div className="hz-wiz-nav" style={{ marginTop: 12 }}>
            <span className="hz-muted">{mistakesForTask(marking, mistakes).length} mistake(s) to fix on these pages</span>
            {!marking.completedAt && <button className="hz-btn hz-btn-primary" disabled={busy} onClick={() => run(() => repo.setTaskDone(marking.id, true))}><CheckCircle2 size={17} aria-hidden="true" />Mark task done</button>}
          </div>
        </section>
      )}

      <section className="hz-card" aria-label="Mistakes">
        <h2 className="hz-h2"><Highlighter size={22} aria-hidden="true" />Mistakes to Fix</h2>
        {openMistakes.length === 0 ? <p className="hz-muted" style={{ margin: 0 }}>None. Use “Listen & mark” on a task to highlight mistakes.</p> : (
          <ul className="hz-list">
            {openMistakes.map((m) => (
              <li key={m.id}>
                <span className="hz-ar" lang="ar">{m.wordText || "—"}</span>
                <div>Page {m.page} · Ayah {m.verseKey}<small>Marked {fmtDate(m.createdAt.slice(0, 10))}</small></div>
                <button className="hz-btn hz-btn-primary" disabled={busy} onClick={() => run(() => repo.setMistakeCorrected(m.id, true))}><Check size={16} aria-hidden="true" />Corrected</button>
              </li>
            ))}
          </ul>
        )}
        {recentFixed.length > 0 && (
          <>
            <div className="ht-group">Recently corrected</div>
            <ul className="hz-list">
              {recentFixed.map((m) => (
                <li key={m.id}>
                  <span className="hz-ar" lang="ar" style={{ color: "#156B45" }}>{m.wordText || "—"}</span>
                  <div>Page {m.page} · Ayah {m.verseKey}</div>
                  <button className="hz-btn hz-btn-ghost" disabled={busy} onClick={() => run(() => repo.setMistakeCorrected(m.id, false))}><Undo2 size={15} aria-hidden="true" />Not yet</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

// ---------- all of the teacher's Hifz students ----------

export function TeacherHifz({ students, teacherId }) {
  const [openId, setOpenId] = useState(null);
  const [query, setQuery] = useState("");
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
  const shown = students
    .filter((s) => !query.trim() || `${s.name} ${s.studentCode}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

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
            {students.length > 6 && (
              <label className="ht-search"><Search size={16} aria-hidden="true" />
                <input className="hz-input" type="search" placeholder="Search students" aria-label="Search students" value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
            )}
          </div>
          {error && <div className="hz-error" role="alert">{error}</div>}
          {students.length === 0 ? (
            <div className="hz-card hz-muted">None of your students are enrolled in Hifz. The admin chooses Hifz, Thilawa or both when adding a student.</div>
          ) : (
            <div className="ht-grid">
              {shown.map((s) => {
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
                          {o.overdue.length > 0 && <span className="hz-badge hz-badge-partial">{o.overdue.length} not finished</span>}
                          {o.openMistakes.length > 0 && <span className="hz-mistake-badge"><Highlighter size={12} aria-hidden="true" />{o.openMistakes.length}</span>}
                          {!o.hasProfile && <span className="hz-badge hz-badge-empty">Starting point not set</span>}
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
