// Student portal: Thilawa (reading the Quran by looking). Three screens —
// the tracker (khatam goal, Tajweed and fluency levels, streak, teacher's
// notes), the reading the teacher set (ticked when done) and free reading.
// Uses the .hz-* styles from HifzTracker.jsx plus the .th-* styles below.

import { useState, useEffect } from "react";
import { BookOpenCheck, Target, AudioLines, Gauge, Flame, StickyNote, ListChecks, BookMarked, CheckCircle2, ChevronLeft, ChevronRight, Pencil, X, AlertTriangle, Trophy, ArrowRight, Circle, CalendarDays, Highlighter, BookOpen, Clock } from "lucide-react";
import MushafPage, { useMushafSwipe } from "./MushafPage.jsx";
import { SURAHS, JUZ_START_PAGES } from "../hifz/quran.js";
import { addDays } from "../hifz/engine.js";
import { TOTAL_PAGES, describePages, pageLabel, pagesIn, levelLabel } from "./engine.js";
import { browserTimezone, markPageRead, unmarkPage, completeAssignment, reopenAssignment } from "./service.js";

export const fmtDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fmtWhen = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const THILAWA_HADITH = {
  short: "Every letter I read is a reward, multiplied by ten",
  text: "Whoever reads a letter from the Book of Allah receives a reward for it, and the reward is multiplied by ten. I do not say that Alif-Lam-Mim is one letter: Alif is a letter, Lam is a letter and Mim is a letter.",
  source: "( Sunan at-Tirmidhi 2910 )",
};

export const thilawaCss = () => `
  .th-levels { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
  .th-level { background: #F7FAFD; border: 1px solid #E1EDF8; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
  .th-level-head { display: flex; align-items: center; gap: 10px; }
  .th-level-head svg { color: #176FD1; flex-shrink: 0; }
  .th-level-head strong { flex: 1; color: #123B67; font-size: 15px; }
  .th-level-val { font-size: 22px; font-weight: 700; color: #1452A8; }
  .th-level-word { font-size: 13px; font-weight: 700; color: #1D5FA8; }
  .th-up { color: #1E8A5A; font-size: 12px; font-weight: 700; }
  .th-down { color: #A5432C; font-size: 12px; font-weight: 700; }
  .th-bar-tajweed > div { background: linear-gradient(90deg, #6A3FA0, #9C6ADE 55%, #C9A8F0); }
  .th-bar-fluency > div { background: linear-gradient(90deg, #0F7A78, #18A9BD 55%, #7FE0D0); }
  .th-notes { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
  .th-notes li { background: #FFFBF0; border: 1px solid #F1E0B0; border-radius: 12px; padding: 12px 14px; color: #123B67; font-size: 15px; line-height: 1.5; white-space: pre-wrap; }
  .th-notes small { display: block; margin-top: 6px; color: #8A6A22; font-size: 12px; }
  .th-list { display: flex; flex-direction: column; gap: 12px; }
  .th-item { border: 1px solid #DCEBF8; border-radius: 16px; padding: 14px 16px; background: #FFFFFF; display: flex; gap: 12px; align-items: flex-start; }
  .th-item-done { background: linear-gradient(160deg, #ECFAF4, #FFFFFF 60%); border-color: #9FD9BE; }
  .th-tick { flex-shrink: 0; width: 44px; height: 44px; border-radius: 12px; border: 2px solid #BBDCF0; background: #FFFFFF; color: #8FADC0; display: flex; align-items: center; justify-content: center; cursor: pointer; }
  .th-tick[aria-pressed="true"] { background: #1E8A5A; border-color: #1E8A5A; color: #FFFFFF; }
  .th-tick:disabled { opacity: 0.55; cursor: default; }
  .th-tick:focus-visible { outline: 2px solid #176FD1; outline-offset: 2px; }
  .th-item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .th-item-title { font-weight: 700; color: #123B67; font-size: 16px; }
  .th-instr { color: #123B67; font-size: 14px; background: #F3F8FD; border-radius: 10px; padding: 8px 10px; white-space: pre-wrap; }
  .th-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 13px; color: #567493; }
  .th-due-late { color: #A5432C; font-weight: 700; }
  .th-reader { display: flex; flex-direction: column; gap: 12px; }
  .th-reader-nav { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .th-reader-title { text-align: center; font-weight: 700; color: #123B67; font-size: 15px; flex: 1; min-width: 0; }
  .th-reader-title small { display: block; font-weight: 400; color: #567493; font-size: 13px; }
  .th-read-btn { width: 100%; }
  .th-read-done { background: #1E8A5A !important; box-shadow: 0 8px 18px rgba(30,138,90,0.25) !important; }
  .th-pick { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
  .th-today { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .th-today span { background: #DDF5E9; color: #156B45; border-radius: 999px; padding: 3px 10px; font-size: 12px; font-weight: 700; }
  .th-hadith { background: linear-gradient(135deg, #FFFBF0, #FFFFFF); border: 1px solid #F1E0B0; border-radius: 14px; padding: 14px 16px; color: #5C4410; font-size: 14px; line-height: 1.6; }
  .th-hadith b { display: block; color: #7A5410; margin-bottom: 4px; }
  @media (max-width: 520px) {
    .th-pick { grid-template-columns: 1fr; }
    .th-reader-card { padding: 12px 6px; }
    .th-reader-card > .hz-row, .th-reader-card > .th-instr, .th-reader-card > .hz-error { margin-left: 8px !important; margin-right: 8px !important; }
    .th-reader .mp-page { padding: 4% 2.5% 2%; border-radius: 10px; }
    .th-reader-nav .hz-btn span { display: none; }
  }
`;

// One teacher-set level (0–100) with its bar.
export function LevelMeter({ kind, value, change = 0 }) {
  const info = kind === "tajweed" ? { title: "Tajweed", Icon: AudioLines } : { title: "Reading fluency", Icon: Gauge };
  const pct = value ?? 0;
  return (
    <div className="th-level">
      <div className="th-level-head">
        <info.Icon size={22} aria-hidden="true" />
        <strong>{info.title}</strong>
        <span className="th-level-val">{value == null ? "—" : `${value}%`}</span>
      </div>
      <div className={`hz-bar th-bar-${kind}`} role="progressbar" aria-label={`${info.title} level`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><div style={{ width: `${pct}%` }} /></div>
      <div className="hz-row">
        <span className="th-level-word">{levelLabel(value)}</span>
        {change > 0 && <span className="th-up">▲ {change} since last time</span>}
        {change < 0 && <span className="th-down">▼ {-change} since last time</span>}
      </div>
    </div>
  );
}

// The student's khatam goal: the date they want to finish reading the Quran by.
function GoalEditor({ repo, settings, today, pagesLeft, onSaved, onCancel }) {
  const [goalDate, setGoalDate] = useState(settings?.goalDate || addDays(today, 89));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const quick = [["1 month", 29], ["3 months", 89], ["6 months", 181], ["1 year", 364]];
  const days = goalDate >= today ? Math.round((Date.parse(goalDate) - Date.parse(today)) / 86400000) + 1 : 0;
  const save = async () => {
    if (!goalDate || goalDate < today) { setError("Choose a date from today onward."); return; }
    setBusy(true);
    try {
      await repo.saveSettings({ timezone: settings?.timezone || browserTimezone(), goalDate });
      onSaved();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <section className="hz-card" aria-label="Khatam goal">
      <div className="hz-row" style={{ marginBottom: 6 }}>
        <h2 className="hz-h2" style={{ margin: 0 }}><Target size={22} aria-hidden="true" />{settings ? "Change your khatam goal" : "Set your khatam goal"}</h2>
        {onCancel && <button className="hz-btn hz-btn-ghost" onClick={onCancel} aria-label="Close"><X size={18} aria-hidden="true" /></button>}
      </div>
      <p className="hz-q">By when do you want to finish reading the whole Quran?</p>
      <div className="hz-chips" style={{ marginTop: 10 }}>
        {quick.map(([label, n]) => {
          const d = addDays(today, n);
          return <button key={label} className="hz-chip" style={{ padding: "0 14px" }} aria-pressed={goalDate === d} onClick={() => setGoalDate(d)}>{label}</button>;
        })}
      </div>
      <div className="hz-field">
        <label htmlFor="th-goal-date">Or pick a date</label>
        <input id="th-goal-date" className="hz-input" type="date" min={today} value={goalDate} onChange={(e) => setGoalDate(e.target.value)} />
      </div>
      {days > 0 && <p className="hz-muted" style={{ marginBottom: 0 }}>That's {days} day{days === 1 ? "" : "s"}: about <b>{Math.ceil((pagesLeft / days) * 10) / 10} page{pagesLeft / days === 1 ? "" : "s"} a day</b> for the {pagesLeft} pages left.</p>}
      {error && <div className="hz-error" style={{ marginTop: 12 }} role="alert">{error}</div>}
      <div className="hz-wiz-nav" style={{ justifyContent: "flex-end" }}>
        <button className="hz-btn hz-btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save goal"}</button>
      </div>
    </section>
  );
}

// ---------- corrections from the teacher ----------
// The words the teacher marked in the reading or lesson they listened to last.
// The student ticks each one off once they've fixed it.
export function Corrections({ repo, data, refresh }) {
  const { busy, error, run } = useAction(refresh);
  const [showing, setShowing] = useState(false);
  const [page, setPage] = useState(null);
  const a = data?.lastChecked;
  if (!a) return null;
  const list = data.corrections;
  const marks = list;
  const at = page ?? list[0]?.page ?? a.fromPage;
  return (
    <section className="hz-card th-reader-card" aria-label="Corrections from your teacher">
      <h2 className="hz-h2"><Highlighter size={22} aria-hidden="true" />Corrections from your teacher</h2>
      <p className="hz-muted" style={{ marginTop: 0 }}>{a.kind === "lesson" ? "Lesson" : "Reading"} · {describePages(a.fromPage, a.toPage)} · listened {fmtWhen(a.checkedAt)}</p>
      {error && <div className="hz-error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
      {list.length === 0 ? <p className="hz-muted" style={{ margin: 0 }}>No words to correct. MashaAllah!</p> : (
        <ul className="hz-list">
          {list.map((m) => (
            <li key={m.id}>
              <span className="hz-ar hz-mark" lang="ar">{m.wordText || "—"}</span>
              <div>Page {m.page} · Ayah {m.verseKey}</div>
              <button className="hz-tick" disabled={busy} onClick={() => run(() => repo.setMistakeTicked(m.id, true))} aria-label={`Tick off ${m.wordText || "this word"} as fixed`} title="Fixed it"><CheckCircle2 size={22} aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      )}
      <button className="hz-btn hz-btn-outline" style={{ marginTop: 12 }} onClick={() => setShowing((v) => !v)}><BookOpen size={16} aria-hidden="true" />{showing ? "Hide the Mushaf" : "Show in the Mushaf"}</button>
      {showing && <div style={{ marginTop: 12 }}><Reader from={a.fromPage} to={a.toPage} page={at} onPage={setPage} marks={marks} /></div>}
    </section>
  );
}

// ---------- Thilawa tracker ----------

export function ThilawaTracker({ repo, data, refresh, onGo }) {
  const [editingGoal, setEditingGoal] = useState(false);
  if (!data) return <div className="hz"><div className="hz-card hz-muted">Loading your Thilawa…</div></div>;
  const { progress, goal, settings, streak, today, levels, notes, counts, pace } = data;
  const pagesLeft = TOTAL_PAGES - progress.count;
  const last = levels.latest;
  if (!settings || editingGoal) {
    return (
      <div className="hz">
        {!editingGoal && <Corrections repo={repo} data={data} refresh={refresh} />}
        <GoalEditor repo={repo} settings={settings} today={today} pagesLeft={pagesLeft}
          onCancel={settings ? () => setEditingGoal(false) : null}
          onSaved={() => { setEditingGoal(false); refresh(); }} />
      </div>
    );
  }
  return (
    <div className="hz">
      <Corrections repo={repo} data={data} refresh={refresh} />

      <section className="hz-card" aria-label="Khatam progress">
        <div className="hz-row">
          <h2 className="hz-h2" style={{ margin: 0 }}><BookOpenCheck size={22} aria-hidden="true" />Khatam Progress</h2>
          <button className="hz-btn hz-btn-outline" onClick={() => setEditingGoal(true)}><Pencil size={16} aria-hidden="true" />Change goal</button>
        </div>
        <div className="hz-row" style={{ margin: "14px 0 10px" }}>
          <span className="hz-muted">{progress.count} of {TOTAL_PAGES} pages read{progress.khatams ? ` in khatam ${progress.khatams + 1}` : ""}</span>
          <span className="hz-big">{progress.percent}%</span>
        </div>
        <div className="hz-bar" role="progressbar" aria-label="Khatam progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}><div style={{ width: `${progress.percent}%` }} /></div>
        <div className="hz-kv">
          <div><span>Pages left</span><strong>{pagesLeft}</strong></div>
          <div><span>Khatam goal</span><strong>{fmtDate(settings.goalDate)}</strong></div>
          <div><span>Needed per day</span><strong>{goal.passed ? "Goal date passed" : `${goal.neededPerDay} page${goal.neededPerDay === 1 ? "" : "s"}`}</strong></div>
          <div><span>Estimated finish</span><strong>{goal.estimatedDate ? fmtDate(goal.estimatedDate) : "Start reading to see"}</strong></div>
          <div><span>Surahs read</span><strong>{counts.surahs} / 114</strong></div>
          <div><span>Khatams completed</span><strong>{progress.khatams}{progress.lastKhatamOn ? ` · last ${fmtDate(progress.lastKhatamOn)}` : ""}</strong></div>
        </div>
        {(goal.passed || !goal.onTrack) && progress.count < TOTAL_PAGES && (
          <div className="hz-note"><AlertTriangle size={18} aria-hidden="true" />
            <span>{goal.passed
              ? "Your goal date has passed. Choose a new date to keep going."
              : pace > 0
                ? `At your pace (about ${Math.round(pace * 10) / 10} pages a day) you'd finish after your goal. Reading ${goal.neededPerDay} pages a day will reach it.`
                : `Read ${goal.neededPerDay} pages a day to reach your goal.`}</span>
          </div>
        )}
      </section>

      <section className="hz-card" aria-label="Tajweed and fluency levels">
        <h2 className="hz-h2"><Trophy size={22} aria-hidden="true" />My Levels</h2>
        <div className="th-levels">
          <LevelMeter kind="tajweed" value={last?.tajweed} change={levels.tajweedChange} />
          <LevelMeter kind="fluency" value={last?.fluency} change={levels.fluencyChange} />
        </div>
        <p className="hz-muted" style={{ marginBottom: 0 }}>
          {last ? <>Assessed by your teacher on {fmtDate(last.assessedOn)}.{last.comment && <> “{last.comment}”</>}</> : "Your teacher will assess your Tajweed and how fluently you read. Your levels show here."}
        </p>
      </section>

      <section className="hz-card" aria-label="Teacher's notes">
        <h2 className="hz-h2"><StickyNote size={22} aria-hidden="true" />Teacher's Notes</h2>
        {notes.length === 0 ? <p className="hz-muted" style={{ margin: 0 }}>No notes from your teacher yet.</p> : (
          <ul className="th-notes">
            {notes.map((n) => <li key={n.id}>{n.body}<small>{fmtWhen(n.createdAt)}</small></li>)}
          </ul>
        )}
      </section>

      <section className="hz-card" aria-label="Streaks">
        <h2 className="hz-h2"><Flame size={22} aria-hidden="true" />Reading Streak</h2>
        <div className="hz-streak">
          <div><strong>{streak.current}</strong><span>Current streak</span></div>
          <div><strong>{streak.longest}</strong><span>Longest streak</span></div>
          <div><strong style={{ fontSize: 15, lineHeight: "28px" }}>{streak.lastActive ? fmtDate(streak.lastActive) : "—"}</strong><span>Last read</span></div>
        </div>
        <div className="hz-cal" aria-label="Reading in the last 5 weeks">
          {streak.calendar.map((d) => (
            <div key={d.date} className={`${d.active ? "on" : ""} ${d.date === today ? "today" : ""}`} title={`${fmtDate(d.date)}${d.active ? ": read" : ""}`}>{+d.date.slice(8)}</div>
          ))}
        </div>
        <p className="hz-muted" style={{ marginBottom: 0 }}>Read at least one page a day to keep your streak. It survives one missed day and resets after two missed days in a row.</p>
      </section>

      <section className="hz-card" aria-label="Read now">
        <h2 className="hz-h2"><BookMarked size={22} aria-hidden="true" />Read now</h2>
        <div className="hz-rev">
          <div>
            <strong style={{ color: "#123B67" }}>Teacher's Reading</strong>
            <span className="hz-muted">{data.openAssignments ? `${data.openAssignments} reading${data.openAssignments === 1 ? "" : "s"} waiting for you` : "All done. MashaAllah!"}</span>
            <button className="hz-btn hz-btn-outline" onClick={() => onGo("thilawa-assigned")}>Open<ArrowRight size={16} aria-hidden="true" /></button>
          </div>
          <div>
            <strong style={{ color: "#123B67" }}>Free Reading</strong>
            <span className="hz-muted">Carry on from page {data.nextFreePage}</span>
            <button className="hz-btn hz-btn-outline" onClick={() => onGo("thilawa-free")}>Open<ArrowRight size={16} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="th-hadith" style={{ marginTop: 14 }}><b>{THILAWA_HADITH.short}</b>{THILAWA_HADITH.text} {THILAWA_HADITH.source}</div>
      </section>
    </div>
  );
}

// ---------- page reader ----------

// Shows the Madinah Mushaf one page at a time between `from` and `to`.
// With onTick/onUntick each page can be ticked as read today.
function Reader({ from, to, page, onPage, readToday, onTick, onUntick, busy, footer, marks = [] }) {
  const read = readToday?.has(page);
  // Like a printed Mushaf: the next page is to the left.
  const next = () => { if (page < to) onPage(page + 1); };
  const prev = () => { if (page > from) onPage(page - 1); };
  const swipe = useMushafSwipe(next, prev);
  useEffect(() => { window.scrollTo?.({ top: 0, behavior: "smooth" }); }, [page]);
  return (
    <div className="th-reader">
      <div className="th-reader-nav">
        <button className="hz-btn hz-btn-outline" disabled={page >= to} onClick={next} aria-label="Next page"><ChevronLeft size={18} aria-hidden="true" /><span>Next</span></button>
        <div className="th-reader-title">{pageLabel(page)}{to > from && <small>Page {page - from + 1} of {to - from + 1}</small>}</div>
        <button className="hz-btn hz-btn-outline" disabled={page <= from} onClick={prev} aria-label="Previous page"><span>Previous</span><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
      <div {...swipe}><MushafPage page={page} marks={marks} /></div>
      {onTick && (read
        ? <button className="hz-btn hz-btn-primary th-read-btn th-read-done" disabled={busy} onClick={() => onUntick(page)} title="Tap to undo"><CheckCircle2 size={18} aria-hidden="true" />Read today · tap to undo</button>
        : <button className="hz-btn hz-btn-primary th-read-btn" disabled={busy} onClick={() => onTick(page)}><Circle size={18} aria-hidden="true" />I've read this page</button>)}
      {footer}
    </div>
  );
}

// Runs a save, then reloads; shows the error if it fails.
function useAction(refresh) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try { await fn(); await refresh(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return { busy, error, run };
}

// ---------- teacher's set reading ----------

export function AssignedReading({ repo, data, refresh }) {
  const { busy, error, run } = useAction(refresh);
  const [open, setOpen] = useState(null); // assignment being read
  const [page, setPage] = useState(1);
  if (!data) return <div className="hz"><div className="hz-card hz-muted">Loading…</div></div>;
  const { assignments, today, reading } = data;
  const toggle = (a) => run(() => (a.completedAt ? reopenAssignment(repo, a, reading) : completeAssignment(repo, a, today)));

  const marksOf = (a) => data.mistakes.filter((m) => m.assignmentId === a.id && !m.correctedAt && !m.tickedAt);
  const listenedLabel = (a) => {
    const n = data.mistakes.filter((m) => m.assignmentId === a.id && !m.correctedAt).length;
    return `Teacher listened${n ? ` · ${n} word${n === 1 ? "" : "s"} to correct` : " · no corrections"}`;
  };
  if (open) {
    const a = [...assignments, ...data.lessons].find((x) => x.id === open) || null;
    if (!a) { setOpen(null); return null; }
    const lesson = a.kind === "lesson";
    return (
      <div className="hz">
        <section className="hz-card th-reader-card" aria-label="Reading from your teacher">
          <div className="hz-row" style={{ marginBottom: 10 }}>
            <h2 className="hz-h2" style={{ margin: 0 }}><ListChecks size={22} aria-hidden="true" />{lesson ? "Lesson · " : ""}{describePages(a.fromPage, a.toPage)}</h2>
            <button className="hz-btn hz-btn-ghost" onClick={() => setOpen(null)}><ChevronLeft size={18} aria-hidden="true" />All readings</button>
          </div>
          {a.instructions && <div className="th-instr" style={{ marginBottom: 12 }}>{a.instructions}</div>}
          {error && <div className="hz-error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
          {a.checkedAt && <div className="hz-muted" style={{ marginBottom: 10 }}><Highlighter size={14} aria-hidden="true" /> {listenedLabel(a)}. Marked words are highlighted.</div>}
          <Reader from={a.fromPage} to={a.toPage} page={page} onPage={setPage} marks={marksOf(a)}
            footer={lesson ? null : a.completedAt
              ? <button className="hz-btn hz-btn-primary th-read-btn th-read-done" disabled={busy} onClick={() => toggle(a)}><CheckCircle2 size={18} aria-hidden="true" />Done · tap to undo</button>
              : <button className="hz-btn hz-btn-primary th-read-btn" disabled={busy} onClick={() => toggle(a)}><CheckCircle2 size={18} aria-hidden="true" />I've finished this reading</button>} />
        </section>
      </div>
    );
  }

  return (
    <div className="hz">
      <section className="hz-card" aria-label="Reading from your teacher">
        <h2 className="hz-h2"><ListChecks size={22} aria-hidden="true" />Teacher's Reading</h2>
        <p className="hz-muted" style={{ marginTop: 0 }}>Read what your teacher set, then tick it. Ticked pages count towards your khatam.</p>
        {error && <div className="hz-error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
        {assignments.length === 0 ? <p className="hz-muted" style={{ margin: 0 }}>Your teacher hasn't set any reading yet.</p> : (
          <div className="th-list">
            {assignments.map((a) => {
              const late = !a.completedAt && a.dueDate && a.dueDate < today;
              return (
                <article key={a.id} className={`th-item ${a.completedAt ? "th-item-done" : ""}`}>
                  <button className="th-tick" aria-pressed={!!a.completedAt} disabled={busy} onClick={() => toggle(a)}
                    aria-label={a.completedAt ? `Untick ${describePages(a.fromPage, a.toPage)}` : `Tick ${describePages(a.fromPage, a.toPage)} as read`}>
                    <CheckCircle2 size={22} aria-hidden="true" />
                  </button>
                  <div className="th-item-body">
                    <span className="th-item-title">{describePages(a.fromPage, a.toPage)}</span>
                    {a.instructions && <div className="th-instr">{a.instructions}</div>}
                    <div className="th-meta">
                      <span>{a.toPage - a.fromPage + 1} page{a.toPage === a.fromPage ? "" : "s"}</span>
                      {a.dueDate && <span className={late ? "th-due-late" : undefined}><CalendarDays size={13} aria-hidden="true" /> {late ? "Was due" : "Due"} {fmtDate(a.dueDate)}</span>}
                      {a.completedAt && <span className="hz-badge hz-badge-completed">Done {fmtWhen(a.completedAt)}</span>}
                      {a.completedAt && (a.checkedAt
                        ? <span className="hz-badge hz-badge-empty"><Highlighter size={12} aria-hidden="true" /> {listenedLabel(a)}</span>
                        : <span className="hz-badge hz-badge-pending"><Clock size={12} aria-hidden="true" /> Waiting for your teacher to listen</span>)}
                    </div>
                  </div>
                  <button className="hz-btn hz-btn-outline" onClick={() => { setOpen(a.id); setPage(a.fromPage); }}>Read</button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {data.lessons.length > 0 && (
        <section className="hz-card" aria-label="Lessons with your teacher">
          <h2 className="hz-h2"><BookOpen size={22} aria-hidden="true" />Lessons with your teacher</h2>
          <div className="th-list">
            {data.lessons.map((l) => (
              <article key={l.id} className="th-item">
                <div className="th-item-body">
                  <span className="th-item-title">{describePages(l.fromPage, l.toPage)}</span>
                  <div className="th-meta">
                    <span><CalendarDays size={13} aria-hidden="true" /> {fmtWhen(l.createdAt)}</span>
                    {l.checkedAt
                      ? <span className="hz-badge hz-badge-empty"><Highlighter size={12} aria-hidden="true" /> {listenedLabel(l)}</span>
                      : <span className="hz-badge hz-badge-pending">In progress</span>}
                  </div>
                </div>
                <button className="hz-btn hz-btn-outline" onClick={() => { setOpen(l.id); setPage(marksOf(l)[0]?.page ?? l.fromPage); }}>Open</button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------- free reading ----------

export function FreeReading({ repo, data, refresh }) {
  const { busy, error, run } = useAction(refresh);
  const [page, setPage] = useState(null);
  useEffect(() => { if (data && page == null) setPage(data.nextFreePage); }, [data, page]);
  if (!data || page == null) return <div className="hz"><div className="hz-card hz-muted">Loading…</div></div>;
  const { today, readToday, reading } = data;
  const surahIndex = SURAHS.reduce((found, s, i) => (s.startPage <= page ? i : found), 0);
  const juz = JUZ_START_PAGES.reduce((found, p, i) => (p <= page ? i + 1 : found), 1);
  const tick = (p) => run(async () => {
    await markPageRead(repo, p, today);
    if (p < TOTAL_PAGES) setPage(p + 1);
  });
  const untick = (p) => run(() => unmarkPage(repo, reading, p, today));
  const todayPages = [...readToday].sort((a, b) => a - b);

  return (
    <div className="hz">
      <section className="hz-card" aria-label="Choose where to read">
        <h2 className="hz-h2"><BookMarked size={22} aria-hidden="true" />Free Reading</h2>
        <p className="hz-muted" style={{ margin: 0 }}>Read anywhere you like. Tick each page you read and it counts towards your khatam.</p>
        <div className="th-pick">
          <label className="hz-field" style={{ marginTop: 0 }}><span>Surah</span>
            <select className="hz-select" value={surahIndex} onChange={(e) => setPage(SURAHS[+e.target.value].startPage)}>
              {SURAHS.map((s, i) => <option key={s.number} value={i}>{s.number}. {s.name}</option>)}
            </select>
          </label>
          <label className="hz-field" style={{ marginTop: 0 }}><span>Juz</span>
            <select className="hz-select" value={juz} onChange={(e) => setPage(JUZ_START_PAGES[+e.target.value - 1])}>
              {JUZ_START_PAGES.map((p, i) => <option key={i} value={i + 1}>Juz {i + 1}</option>)}
            </select>
          </label>
          <label className="hz-field" style={{ marginTop: 0 }}><span>Page</span>
            <select className="hz-select" value={page} onChange={(e) => setPage(+e.target.value)}>
              {pagesIn(1, TOTAL_PAGES).map((p) => <option key={p} value={p}>Page {p}</option>)}
            </select>
          </label>
        </div>
        {page !== data.nextFreePage && <button className="hz-btn hz-btn-ghost" style={{ marginTop: 8 }} onClick={() => setPage(data.nextFreePage)}>Carry on from page {data.nextFreePage}</button>}
        {todayPages.length > 0 && <div className="th-today" aria-label="Pages read today">{todayPages.map((p) => <span key={p}>p. {p}</span>)}</div>}
      </section>
      <section className="hz-card th-reader-card" aria-label={`Page ${page}`}>
        {error && <div className="hz-error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
        <Reader from={1} to={TOTAL_PAGES} page={page} onPage={setPage} readToday={readToday} onTick={tick} onUntick={untick} busy={busy} />
      </section>
    </div>
  );
}
