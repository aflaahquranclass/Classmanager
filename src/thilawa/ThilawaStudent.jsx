// Student portal: Thilawa (reading the Quran by looking). Kept simple, three
// screens — the student's last recitation in the Mushaf with the words to
// correct highlighted (plus levels and the teacher's notes), the reading the
// teacher set (ticked when done) and free reading.
// Uses the .hz-* styles from HifzTracker.jsx plus the .th-* styles below.

import { useState, useEffect } from "react";
import { useBackLayer } from "../useBackNav.js";
import { AudioLines, Gauge, StickyNote, ListChecks, BookMarked, CheckCircle2, ChevronLeft, ChevronRight, Trophy, ArrowRight, Circle, CalendarDays, Highlighter, BookOpen, Clock } from "lucide-react";
import MushafPage, { MushafPresent, useMushafSwipe } from "./MushafPage.jsx";
import { SURAHS, JUZ_START_PAGES } from "../hifz/quran.js";
import { TOTAL_PAGES, describePages, pageLabel, pagesIn, levelLabel, pagesWithMarks, mistakeCategory, mistakeColors } from "./engine.js";
import { LetterChips } from "./LettersPanel.jsx";
import { markPageRead, unmarkPage, completeAssignment, reopenAssignment } from "./service.js";

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
  .th-out { color: #8A5A00; font-weight: 600; }
  .hz-btn.th-back { min-height: 0; padding: 0 4px; font-size: 13px; }
  .th-read-done { background: #1E8A5A !important; box-shadow: 0 8px 18px rgba(30,138,90,0.25) !important; }
  .th-pick { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
  .th-today { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .th-today span { background: #DDF5E9; color: #156B45; border-radius: 999px; padding: 3px 10px; font-size: 12px; font-weight: 700; }
  .th-recite { padding: 0 !important; overflow: hidden; border-radius: 20px; }
  .th-recite-head { position: relative; display: flex; align-items: center; gap: 16px; padding: 20px 22px; color: #FFFFFF; overflow: hidden;
    background: linear-gradient(120deg, #0D4F85 0%, #176FD1 55%, #0A94B1 100%); }
  .th-recite-head::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 90% -30%, rgba(255,255,255,0.28), transparent 60%); }
  .th-recite-head > * { position: relative; z-index: 1; }
  .th-recite-icon { flex-shrink: 0; width: 54px; height: 54px; border-radius: 16px; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center; }
  .th-recite-title { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .th-recite-title small { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85; }
  .th-recite-title h2 { margin: 0; font-size: clamp(20px, 4.6vw, 28px); font-weight: 700; line-height: 1.2; overflow-wrap: anywhere; }
  .th-recite-title span { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; opacity: 0.92; }
  .th-recite-count { flex-shrink: 0; min-width: 96px; padding: 10px 14px; border-radius: 16px; background: #FFFFFF; color: #123B67; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 2px; box-shadow: 0 8px 20px rgba(8,40,80,0.25); }
  .th-recite-count b { font-size: 34px; line-height: 1; color: #C2410C; }
  .th-recite-count span { font-size: 12px; font-weight: 700; color: #567493; }
  .th-recite-ok { color: #1E8A5A; }
  .th-recite-ok span { color: #1E8A5A; }
  .th-recite-body { padding: 16px 20px 20px; }
  .th-recite-empty { margin: 0; padding: 16px 22px 20px; color: #567493; font-size: 15px; line-height: 1.5; }
  .th-recite-hint { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; color: #123B67; font-size: 15px; font-weight: 600; }
  .th-recite-hint svg { color: #176FD1; flex-shrink: 0; }
  .th-recite-key { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 12px; }
  .th-recite-key span { display: inline-flex; align-items: center; gap: 8px; padding: 5px 6px 5px 12px; border-radius: 999px; font-size: 13px; font-weight: 700; }
  .th-recite-key .th-key-ar { font-family: "Noto Naskh Arabic", "Geeza Pro", serif; font-size: 15px; font-weight: 600; }
  .th-recite-key b { min-width: 22px; height: 22px; border-radius: 999px; background: rgba(255,255,255,0.75); display: inline-flex; align-items: center; justify-content: center; font: 700 12px/1 Inter, system-ui, sans-serif; }
  @media (max-width: 520px) {
    .th-recite-head { flex-wrap: wrap; padding: 16px; gap: 12px; }
    .th-recite-icon { width: 44px; height: 44px; border-radius: 13px; }
    .th-recite-count { flex-direction: row; gap: 8px; min-width: 0; width: 100%; justify-content: center; padding: 8px 12px; }
    .th-recite-count b { font-size: 26px; }
    .th-recite-body { padding: 12px 6px 14px; }
    .th-recite-body > .th-recite-hint, .th-recite-body > .th-recite-key, .th-recite-body > .lc { margin-left: 8px !important; margin-right: 8px !important; }
    .th-recite .mp-page { padding: 4% 2.5% 2%; border-radius: 10px; }
  }
  .th-hadith { background: linear-gradient(135deg, #FFFBF0, #FFFFFF); border: 1px solid #F1E0B0; border-radius: 14px; padding: 14px 16px; color: #5C4410; font-size: 14px; line-height: 1.6; }
  .th-hadith b { display: block; color: #7A5410; margin-bottom: 4px; }
  @media (max-width: 520px) {
    .th-pick { grid-template-columns: 1fr; }
    /* Phones: the Read / Open button drops under the text instead of squeezing the teacher's instructions into a thin column. */
    .th-item { flex-wrap: wrap; }
    .th-item-body { flex: 1 1 180px; }
    .th-tick ~ .hz-btn { margin-left: 56px; }
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

// ---------- last recitation ----------
// The reading or lesson the teacher listened to last, open in the Mushaf with
// the words to correct highlighted (no list: the highlights are the list).
export function LastRecitation({ data }) {
  const a = data?.lastRecitation;
  const marks = data?.lastMarks || [];
  const [page, setPage] = useState(null);
  if (!a) {
    return (
      <section className="hz-card th-recite" aria-label="Your last recitation">
        <header className="th-recite-head">
          <span className="th-recite-icon"><BookOpen size={26} aria-hidden="true" /></span>
          <div className="th-recite-title"><small>Your last recitation</small><h2>Nothing yet</h2></div>
        </header>
        <p className="th-recite-empty">When your teacher listens to you read, the page shows here with the words to correct highlighted.</p>
      </section>
    );
  }
  const { fromPage, toPage } = pagesWithMarks(a, marks);
  const at = page ?? marks.map((m) => m.page).sort((x, y) => x - y)[0] ?? a.fromPage;
  // The highlighter key: each kind of mistake marked, with how many.
  const kinds = [];
  for (const m of marks) {
    const c = mistakeCategory(m.category);
    const k = kinds.find((x) => x.id === (c?.id ?? null));
    if (k) k.n += 1;
    else kinds.push({ id: c?.id ?? null, label: c?.ar ?? "To correct", ar: !!c, style: c ? mistakeColors(c.id) : { background: "#FBD5CC", color: "#8A2E1A", boxShadow: "0 0 0 1px #F2A595" }, n: 1 });
  }
  return (
    <section className="hz-card th-recite" aria-label="Your last recitation">
      <header className="th-recite-head">
        <span className="th-recite-icon"><BookOpen size={26} aria-hidden="true" /></span>
        <div className="th-recite-title">
          <small>Your last recitation</small>
          <h2>{a.instructions || describePages(a.fromPage, a.toPage).split(" · ")[0]}</h2>
          <span><CalendarDays size={14} aria-hidden="true" /> {fmtWhen(a.checkedAt || a.createdAt)} · {a.fromPage === a.toPage ? `Page ${a.fromPage}` : `Pages ${a.fromPage}–${a.toPage}`}</span>
        </div>
        {marks.length
          ? <div className="th-recite-count"><b>{marks.length}</b><span>word{marks.length === 1 ? "" : "s"} to correct</span></div>
          : <div className="th-recite-count th-recite-ok"><CheckCircle2 size={28} aria-hidden="true" /><span>MashaAllah!</span></div>}
      </header>
      <div className="th-recite-body">
        <p className="th-recite-hint">{marks.length
          ? <><Highlighter size={16} aria-hidden="true" /> Practise the highlighted words before your next class.</>
          : <><CheckCircle2 size={16} aria-hidden="true" /> No words to correct this time. Keep it up!</>}</p>
        {kinds.length > 0 && (
          <div className="th-recite-key" aria-label="Highlighter colours">
            {kinds.map((k) => <span key={k.id ?? "plain"} style={k.style} lang={k.ar ? "ar" : undefined} className={k.ar ? "th-key-ar" : undefined}>{k.label}<b>{k.n}</b></span>)}
          </div>
        )}
        <LetterChips letters={a.letters} style={{ margin: "0 0 12px" }} inMushaf />
        <Reader from={fromPage} to={toPage} page={at} onPage={setPage} marks={marks} letters={a.letters} />
      </div>
    </section>
  );
}

// ---------- Thilawa tracker ----------

export function ThilawaTracker({ data, onGo }) {
  if (!data) return <div className="hz"><div className="hz-card hz-muted">Loading your Thilawa…</div></div>;
  const { levels, notes } = data;
  const last = levels.latest;
  return (
    <div className="hz">
      <LastRecitation data={data} />

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

      {notes.length > 0 && (
        <section className="hz-card" aria-label="Teacher's notes">
          <h2 className="hz-h2"><StickyNote size={22} aria-hidden="true" />Teacher's Notes</h2>
          <ul className="th-notes">
            {notes.map((n) => <li key={n.id}>{n.body}<small>{fmtWhen(n.createdAt)}</small></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

// ---------- page reader ----------

// The Madinah Mushaf one page at a time. It opens on `page` and turns freely
// through the whole Mushaf; `from`–`to` is the part being read (counted in the
// title, with a way back when the reader goes past it). With onTick/onUntick each page can be
// ticked as read today. `header` goes above the page.
export function Reader({ from, to, page, onPage, readToday, onTick, onUntick, busy, footer, marks = [], letters = [], header = null }) {
  const read = readToday?.has(page);
  // Like a printed Mushaf: the next page is to the left.
  const next = () => { if (page < TOTAL_PAGES) onPage(page + 1); };
  const prev = () => { if (page > 1) onPage(page - 1); };
  const swipe = useMushafSwipe(next, prev);
  useEffect(() => { window.scrollTo?.({ top: 0, behavior: "smooth" }); }, [page]);
  const whole = from <= 1 && to >= TOTAL_PAGES;
  const inPart = page >= from && page <= to;
  return (
    <MushafPresent onNext={page < TOTAL_PAGES ? next : null} onPrev={page > 1 ? prev : null}><div className="th-reader">
      {header}
      <div className="th-reader-nav">
        <button className="hz-btn hz-btn-outline" disabled={page >= TOTAL_PAGES} onClick={next} aria-label="Next page"><ChevronLeft size={18} aria-hidden="true" /><span>Next</span></button>
        <div className="th-reader-title">{pageLabel(page)}
          {!whole && <small>{inPart
            ? (to > from ? `Page ${page - from + 1} of ${to - from + 1} of the reading` : "The reading's page")
            : <span className="th-out">Past the reading · <button type="button" className="hz-btn hz-btn-ghost th-back" onClick={() => onPage(from)}>back to page {from}</button></span>}</small>}
        </div>
        <button className="hz-btn hz-btn-outline" disabled={page <= 1} onClick={prev} aria-label="Previous page"><span>Previous</span><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
      <div {...swipe}><MushafPage page={page} marks={marks} letters={letters} /></div>
      {onTick && (read
        ? <button className="hz-btn hz-btn-primary th-read-btn th-read-done" disabled={busy} onClick={() => onUntick(page)} title="Tap to undo"><CheckCircle2 size={18} aria-hidden="true" />Read today · tap to undo</button>
        : <button className="hz-btn hz-btn-primary th-read-btn" disabled={busy} onClick={() => onTick(page)}><Circle size={18} aria-hidden="true" />I've read this page</button>)}
      {footer}
    </div></MushafPresent>
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
  useBackLayer(!!open, () => setOpen(null), "thilawa-reading");
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
          <LetterChips letters={a.letters} style={{ marginBottom: 12 }} inMushaf />
          {error && <div className="hz-error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
          {a.checkedAt && <div className="hz-muted" style={{ marginBottom: 10 }}><Highlighter size={14} aria-hidden="true" /> {listenedLabel(a)}. Marked words are highlighted.</div>}
          <Reader from={a.fromPage} to={a.toPage} page={page} onPage={setPage} marks={marksOf(a)} letters={a.letters}
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
        <p className="hz-muted" style={{ marginTop: 0 }}>Read what your teacher set, then tick it.</p>
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
                    <LetterChips letters={a.letters} />
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
                  {l.instructions && <div className="th-instr">{l.instructions}</div>}
                  <LetterChips letters={l.letters} />
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
        <p className="hz-muted" style={{ margin: 0 }}>Read anywhere you like, and tick each page you read.</p>
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
