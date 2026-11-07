// Thilawa by class. The teacher opens one reading for the whole class; it
// stays open for every student of the class, day after day, until the
// teacher changes it, and the class carries on from the page where it
// stopped (kept in the database, so any device picks it up). The teacher
// also writes down the Tajweed topics taken with the class; every student of
// the class sees them.
//
// TeacherClassPanel: the class's reading and topics in the teacher portal.
// StudentClassReading: the student's "Class Reading" page.
// A class repo is createSupabaseClassRepo / createMemoryClassRepo (repos.js).

import { useState, useEffect, useCallback, useRef } from "react";
import { BookOpen, ArrowRight, RefreshCw, X, Plus, Trash2, GraduationCap, CalendarDays, Navigation, Highlighter, BookMarked } from "lucide-react";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { TOTAL_PAGES, describePages, readingTitle } from "./engine.js";
import { browserTimezone } from "./service.js";
import { localDate } from "../hifz/engine.js";
import SurahAyahPicker from "./SurahAyahPicker.jsx";
import ClassLesson from "./ClassLesson.jsx";
import { Reader, fmtDate } from "./ThilawaStudent.jsx";

const fmtWhen = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const CLASS_CSS = `
  .ct { display: flex; flex-direction: column; gap: 14px; margin-bottom: 18px; }
  .ct-reading { padding: 0 !important; overflow: hidden; }
  .ct-head { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 18px 20px; color: #FFFFFF; background: linear-gradient(120deg, #0D4F85 0%, #176FD1 55%, #0A94B1 100%); }
  .ct-head-icon { flex-shrink: 0; width: 50px; height: 50px; border-radius: 15px; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center; }
  .ct-head-text { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 3px; }
  .ct-head-text small { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85; }
  .ct-head-text h2 { margin: 0; font-size: clamp(19px, 4.4vw, 26px); line-height: 1.2; overflow-wrap: anywhere; }
  .ct-head-text span { font-size: 14px; opacity: 0.92; }
  .ct-head .hz-btn-primary { background: #FFFFFF; color: #0D4F85; box-shadow: 0 8px 18px rgba(8,40,80,0.25); min-height: 50px; padding: 0 22px; font-size: 15px; }
  .ct-body { padding: 16px 20px 18px; display: flex; flex-direction: column; gap: 12px; }
  .ct-stop { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 14px; color: #123B67; }
  .ct-stop b { font-size: 15px; }
  .ct-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: #DDF3F6; color: #0A6F84; font-size: 13px; font-weight: 700; }
  .ct-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .ct-form .ct-wide { grid-column: 1 / -1; }
  .ct-form .hz-field { margin-top: 0; }
  .ct-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
  .ct-topics { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .ct-topics li { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; border-radius: 12px; background: #F7F4FC; border: 1px solid #E5DCF4; }
  .ct-topic-icon { flex-shrink: 0; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: #ECE5FA; color: #6A3FA0; }
  .ct-topics li > div { flex: 1; min-width: 0; }
  .ct-topics b { color: #2D1B4E; font-size: 15px; overflow-wrap: anywhere; }
  .ct-topics small { display: block; color: #6B5A86; font-size: 12.5px; margin-top: 2px; }
  .ct-topics p { margin: 4px 0 0; color: #3D2D5C; font-size: 13.5px; white-space: pre-wrap; }
  .ct-del { flex-shrink: 0; width: 38px; height: 38px; border-radius: 10px; border: 1px solid #E5DCF4; background: #FFFFFF; color: #6B5A86; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
  .ct-del:hover { color: #A5432C; border-color: #F0C2B6; }
  .ct-add { display: grid; grid-template-columns: minmax(0, 1fr) 160px auto; gap: 8px; align-items: end; }
  .ct-add .hz-field { margin-top: 0; }
  .ct-follow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 12px; border-radius: 12px; background: #EEF6FE; border: 1px solid #BFDDF6; color: #123B67; font-size: 14px; }
  .ct-follow .hz-btn { min-height: 38px; margin-left: auto; }
  @media (max-width: 560px) {
    .ct-form, .ct-add { grid-template-columns: 1fr; }
    .ct-head { padding: 16px; }
    .ct-body { padding: 12px 12px 14px; }
    .ct-reader-card { padding: 12px 6px !important; }
    .ct-reader-card > .ct-follow, .ct-reader-card > .hz-h2 { margin-left: 8px; margin-right: 8px; }
  }
`;

// The class's open reading and topics, kept fresh (live when the repo can).
export function useClassThilawa(repo) {
  const [state, setState] = useState(null); // { reading, topics }
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!repo) return;
    try {
      const [reading, topics] = await Promise.all([repo.getReading(), repo.listTopics()]);
      setState({ reading, topics });
      setError("");
    } catch (e) { setError(e.message); }
  }, [repo]);
  useEffect(() => {
    setState(null);
    refresh();
    const stop = repo?.subscribe?.(() => refresh());
    const onShow = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { stop?.(); document.removeEventListener("visibilitychange", onShow); };
  }, [repo, refresh]);
  return { state, error, setError, refresh };
}

// Choosing the part: a surah and its ayahs, or pages. onOpen({ fromPage,
// toPage, firstAyah, lastAyah, label }). fromPage: where the pages start (e.g.
// where the class stopped).
function ReadingForm({ id, fromPage = "", onOpen, onCancel, busy, openLabel }) {
  const [from, setFrom] = useState(String(fromPage || ""));
  const [to, setTo] = useState("");
  const [picked, setPicked] = useState(null); // from the surah picker, until the pages are typed over
  const [pickerKey, setPickerKey] = useState(0);
  const [error, setError] = useState("");
  const pick = (r) => { setFrom(String(r.fromPage)); setTo(String(r.toPage)); setPicked(r); };
  const a = Math.round(+from);
  const b = Math.round(+(to || from));
  const valid = a >= 1 && a <= TOTAL_PAGES && b >= a && b <= TOTAL_PAGES;
  const open = () => {
    if (!valid) { setError(`Pages must be between 1 and ${TOTAL_PAGES}, with the last page not before the first.`); return; }
    setError("");
    onOpen(picked
      ? { fromPage: a, toPage: b, firstAyah: picked.first, lastAyah: picked.last, label: picked.label }
      : { fromPage: a, toPage: b, firstAyah: null, lastAyah: null, label: "" });
  };
  return (
    <div className="ct-form">
      <div className="ct-wide"><SurahAyahPicker key={pickerKey} id={`${id}-surah`} onPick={pick} /></div>
      <div className="hz-field">
        <label htmlFor={`${id}-from`}>From page</label>
        <input id={`${id}-from`} className="hz-input" type="number" inputMode="numeric" min="1" max={TOTAL_PAGES} value={from} placeholder="e.g. 582"
          onChange={(e) => { setFrom(e.target.value); setPicked(null); setPickerKey((k) => k + 1); }} />
      </div>
      <div className="hz-field">
        <label htmlFor={`${id}-to`}>To page</label>
        <input id={`${id}-to`} className="hz-input" type="number" inputMode="numeric" min="1" max={TOTAL_PAGES} value={to} placeholder="Same page"
          onChange={(e) => { setTo(e.target.value); setPicked(null); setPickerKey((k) => k + 1); }} />
      </div>
      {valid && <p className="hz-muted ct-wide" style={{ margin: 0 }}>{picked ? `${picked.label} · ` : ""}{describePages(a, b)}</p>}
      {error && <div className="hz-error ct-wide" role="alert">{error}</div>}
      <div className="ct-actions ct-wide">
        {onCancel && <button className="hz-btn hz-btn-ghost" onClick={onCancel}>Cancel</button>}
        <button className="hz-btn hz-btn-primary" disabled={busy || !from} onClick={open}><BookOpen size={18} aria-hidden="true" />{openLabel}</button>
      </div>
    </div>
  );
}

// The Tajweed topics taken with the class, newest first. With onAdd /
// onDelete the teacher can add and remove them.
export function TopicsCard({ topics, onAdd = null, onDelete = null, busy = false, error = "" }) {
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState("");
  const [day, setDay] = useState(() => localDate(new Date(), browserTimezone()));
  const add = async () => {
    if (!topic.trim()) return;
    if (await onAdd({ topic, note, taughtOn: day })) { setTopic(""); setNote(""); }
  };
  return (
    <section className="hz-card" aria-label="Tajweed topics">
      <h2 className="hz-h2"><GraduationCap size={22} aria-hidden="true" />Tajweed topics taken{topics.length > 0 && <span className="hz-muted" style={{ fontWeight: 400 }}>· {topics.length}</span>}</h2>
      {onAdd && (
        <>
          <div className="ct-add">
            <div className="hz-field">
              <label htmlFor="ct-topic">Topic</label>
              <input id="ct-topic" className="hz-input" maxLength={200} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Noon sakinah: Ikhfa"
                onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
            </div>
            <div className="hz-field">
              <label htmlFor="ct-day">Taken on</label>
              <input id="ct-day" className="hz-input" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
            </div>
            <button className="hz-btn hz-btn-primary" disabled={busy || !topic.trim() || !day} onClick={add}><Plus size={18} aria-hidden="true" />Add</button>
          </div>
          <div className="hz-field">
            <label htmlFor="ct-note">Note for the students (optional)</label>
            <input id="ct-note" className="hz-input" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 15 letters; practise with page 582" />
          </div>
          {error && <div className="hz-error" role="alert" style={{ marginTop: 12 }}>{error}</div>}
        </>
      )}
      {topics.length === 0
        ? <p className="hz-muted" style={{ margin: onAdd ? "14px 0 0" : 0 }}>{onAdd ? "No topics yet." : "No topics yet."}</p>
        : (
          <ul className="ct-topics" style={{ marginTop: onAdd ? 14 : 0 }}>
            {topics.map((t) => (
              <li key={t.id}>
                <span className="ct-topic-icon" aria-hidden="true"><GraduationCap size={18} /></span>
                <div><b>{t.topic}</b><small><CalendarDays size={12} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> {fmtDate(t.taughtOn)}</small>{t.note && <p>{t.note}</p>}</div>
                {onDelete && <button className="ct-del" disabled={busy} aria-label={`Delete ${t.topic}`} title="Delete" onClick={() => onDelete(t)}><Trash2 size={16} aria-hidden="true" /></button>}
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}

// ---------- teacher ----------

// className / students: the class open in the teacher portal. classRepo: its
// class repo (null when the students have no class). makeStudentRepo: for the
// in-memory demo (see ClassLesson).
export function TeacherClassPanel({ className, students, classRepo, teacherId, makeStudentRepo = null, onClosed = null }) {
  const { state, error, setError, refresh } = useClassThilawa(classRepo);
  const [busy, setBusy] = useState(false);
  const [changing, setChanging] = useState(false);
  const [lesson, setLesson] = useState(false); // the reading open in the Mushaf
  const [topicError, setTopicError] = useState("");
  const pending = useRef(null); // the page waiting to be saved
  const timer = useRef(null);

  const run = async (fn, onError = setError) => {
    setBusy(true);
    onError("");
    try { await fn(); await refresh(); return true; } catch (e) { onError(e.message); return false; } finally { setBusy(false); }
  };

  // Every page turn is kept (a moment after turning, and when the Mushaf closes),
  // so the next lesson carries on from there.
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const p = pending.current;
    pending.current = null;
    if (p) { try { await classRepo.setReadingPage(p.id, p.page); } catch (e) { setError(e.message); } }
  }, [classRepo, setError]);
  useEffect(() => () => { flush(); }, [flush]);
  const onPage = (page) => {
    if (!state?.reading) return;
    pending.current = { id: state.reading.id, page };
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  };

  if (!classRepo) {
    return <div className="hz-card hz-muted">These students aren't in a class yet. The admin puts them in one, then you can open a reading for the whole class.</div>;
  }
  if (!state) return <div className="ct">{error ? <div className="hz-error" role="alert">{error}</div> : <div className="hz-card hz-muted">Loading {className}…</div>}</div>;

  const { reading, topics } = state;
  const openReading = (r) => run(async () => { await classRepo.openReading({ ...r, page: r.fromPage }); setChanging(false); });
  const close = async () => { setLesson(false); await flush(); await refresh(); onClosed?.(); };

  return (
    <div className="ct">
      <style>{CLASS_CSS}</style>
      {lesson && reading && (
        <ClassLesson students={students} teacherId={teacherId} makeRepo={makeStudentRepo}
          portion={{ fromPage: reading.fromPage, toPage: reading.toPage, instructions: readingTitle(reading) }}
          startPage={reading.page} onPage={onPage} onClose={close} />
      )}

      <section className="hz-card ct-reading" aria-label={`Class reading for ${className}`}>
        <header className="ct-head">
          <span className="ct-head-icon"><BookOpen size={24} aria-hidden="true" /></span>
          <div className="ct-head-text">
            <small>Class reading · {className}</small>
            <h2>{reading ? readingTitle(reading) : "No reading open"}</h2>
            <span>{reading ? `${describePages(reading.fromPage, reading.toPage)} · since ${fmtWhen(reading.createdAt)}` : `${students.length} students`}</span>
          </div>
          {reading && !changing && (
            <button className="hz-btn hz-btn-primary" disabled={busy} onClick={() => setLesson(true)}>
              {reading.page !== reading.fromPage ? `Continue from page ${reading.page}` : "Open Mushaf"}<ArrowRight size={18} aria-hidden="true" />
            </button>
          )}
        </header>
        <div className="ct-body">
          {reading && !changing && (
            <>
              <div className="ct-stop">
                <span className="ct-pill"><Navigation size={13} aria-hidden="true" />Stopped at page {reading.page}</span>
              </div>
              <div className="ct-actions" style={{ justifyContent: "flex-start" }}>
                <button className="hz-btn hz-btn-outline" disabled={busy} onClick={() => setChanging(true)}><RefreshCw size={16} aria-hidden="true" />Change reading</button>
              </div>
            </>
          )}
          {(!reading || changing) && (
            <>
              {changing && <div className="hz-row"><b style={{ color: "#123B67" }}>New reading for the class</b><button className="ct-del" style={{ borderColor: "#DCEBF8" }} aria-label="Cancel" onClick={() => setChanging(false)}><X size={16} aria-hidden="true" /></button></div>}
              <ReadingForm id="ct-reading" fromPage={reading ? reading.page : ""} busy={busy} openLabel={reading ? "Open for the class" : "Open reading for the class"}
                onCancel={changing ? () => setChanging(false) : null} onOpen={openReading} />
            </>
          )}
          {error && <div className="hz-error" role="alert">{error}</div>}
        </div>
      </section>

      <TopicsCard topics={topics} busy={busy} error={topicError}
        onAdd={(t) => run(() => classRepo.addTopic(t), setTopicError)}
        onDelete={async (t) => {
          if (await confirmDialog({ title: `Delete “${t.topic}”?`, message: "The students won't see it any more.", confirmLabel: "Delete", danger: true })) run(() => classRepo.deleteTopic(t.id), setTopicError);
        }} />
    </div>
  );
}

// ---------- student ----------

// The class reading in the Mushaf, opened at the page the teacher is on and
// following them as they turn (until the student turns the page themself);
// the student's words to correct are highlighted. Then the Tajweed topics.
// data: the student's Thilawa summary (for their marked words).
export function StudentClassReading({ classRepo, data, onGo }) {
  const { state, error } = useClassThilawa(classRepo);
  const [page, setPage] = useState(null);
  const [follow, setFollow] = useState(true);
  const reading = state?.reading || null;
  const teacherPage = reading?.page ?? null;
  useEffect(() => { if (follow && teacherPage) setPage(teacherPage); }, [follow, teacherPage, reading?.id]);

  if (!classRepo) return <div className="hz"><div className="hz-card hz-muted">You aren't in a class yet. Ask the admin to put you in your class.</div></div>;
  if (!state) return <div className="hz">{error ? <div className="hz-error" role="alert">{error}</div> : <div className="hz-card hz-muted">Loading your class reading…</div>}</div>;

  const marks = (data?.mistakes || []).filter((m) => !m.correctedAt && !m.tickedAt);
  const shown = page ?? reading?.fromPage ?? 1;
  const turn = (p) => { setFollow(false); setPage(p); };
  return (
    <div className="hz">
      <style>{CLASS_CSS}</style>
      <section className="hz-card ct-reading" aria-label="Class reading">
        <header className="ct-head">
          <span className="ct-head-icon"><BookOpen size={24} aria-hidden="true" /></span>
          <div className="ct-head-text">
            <small>Class reading</small>
            <h2>{reading ? readingTitle(reading) : "Not open yet"}</h2>
            <span>{reading ? `${describePages(reading.fromPage, reading.toPage)} · since ${fmtWhen(reading.createdAt)}` : "When your teacher opens the class reading, it shows here."}</span>
          </div>
        </header>
        {!reading && (
          <div className="ct-body">
            <button className="hz-btn hz-btn-outline" style={{ alignSelf: "flex-start" }} onClick={() => onGo?.("thilawa-free")}><BookMarked size={16} aria-hidden="true" />Free reading meanwhile</button>
          </div>
        )}
      </section>

      {reading && (
        <section className="hz-card ct-reader-card" aria-label={`Page ${shown}`}>
          <div className="ct-follow" style={{ marginBottom: 10 }}>
            <Navigation size={16} color="#176FD1" aria-hidden="true" />
            {shown === teacherPage
              ? <span>Your class is on <b>page {teacherPage}</b>.{follow ? " The page turns with your teacher." : ""}</span>
              : <span>Your class is on <b>page {teacherPage}</b>.</span>}
            {(shown !== teacherPage || !follow) && <button className="hz-btn hz-btn-primary" onClick={() => setFollow(true)}>Go to page {teacherPage}</button>}
          </div>
          {marks.length > 0 && (
            <div className="hz-legend" style={{ marginBottom: 10 }}>
              <span><i style={{ background: "#FBD5CC", boxShadow: "0 0 0 1px #F2A595" }} /><Highlighter size={12} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> Your words to correct ({marks.length})</span>
            </div>
          )}
          <Reader from={reading.fromPage} to={reading.toPage} page={shown} onPage={turn} marks={marks} />
        </section>
      )}

      <TopicsCard topics={state.topics} />
    </div>
  );
}
