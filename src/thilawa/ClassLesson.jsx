// Teacher: a class lesson. The whole class reads the same portion, so the
// teacher picks it once and opens the Mushaf with a dropdown of the class;
// switching student shows that student's own marked words. Each student has
// their own lesson, made the first time the teacher marks a word, chooses
// letters or finishes them (a student who didn't read gets nothing). Opening
// the same portion again the same day picks up the lessons already made.
// A class mostly carries on with the part it read last time, so the form
// offers that first (at the page where the class stopped), and a new part
// only when the teacher asks for one. Pages turn freely in the Mushaf.

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { BookOpen, X, Plus, ArrowRight } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { localDate } from "../hifz/engine.js";
import { TOTAL_PAGES, describePages, findClassLesson } from "./engine.js";
import { browserTimezone } from "./service.js";
import { createSupabaseThilawaRepo } from "./repos.js";
import ListenScreen from "./ListenScreen.jsx";
import SurahAyahPicker from "./SurahAyahPicker.jsx";

const fmtWhen = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// Where a class stopped in the Mushaf, kept on this device per class:
// { fromPage, toPage, instructions, page }. The page only counts for the same part.
const stopKey = (className) => `thilawa-class-stop:${className}`;
const samePart = (a, b) => a && b && a.fromPage === b.fromPage && a.toPage === b.toPage && (a.instructions || "") === (b.instructions || "");
export function classStopPage(className, portion) {
  try {
    const saved = JSON.parse(localStorage.getItem(stopKey(className)) || "null");
    return samePart(saved, portion) ? saved.page : null;
  } catch { return null; }
}
export function saveClassStop(className, portion, page) {
  try { localStorage.setItem(stopKey(className), JSON.stringify({ ...portion, page })); } catch { /* storage off: it opens at the part's first page */ }
}

// The portion for the whole class: the last part to carry on with (last:
// { fromPage, toPage, instructions, createdAt } or null, stopPage: where the
// class stopped in it), or a new one by surah and ayahs or pages.
// onOpen({ fromPage, toPage, instructions }, startPage).
export function ClassLessonForm({ className, count, last = null, stopPage = null, onOpen, onCancel }) {
  const [picking, setPicking] = useState(!last);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ayahs, setAyahs] = useState(null);
  const [error, setError] = useState("");
  const pick = (r) => { setFrom(String(r.fromPage)); setTo(String(r.toPage)); setAyahs(r.whole ? null : r.label); };
  const open = () => {
    const a = Math.round(+from);
    const b = Math.round(+(to || from));
    if (!(a >= 1 && a <= TOTAL_PAGES && b >= a && b <= TOTAL_PAGES)) { setError(`Pages must be between 1 and ${TOTAL_PAGES}, with the last page not before the first.`); return; }
    onOpen({ fromPage: a, toPage: b, instructions: ayahs || "" }, a);
  };
  const carryOn = () => onOpen({ fromPage: last.fromPage, toPage: last.toPage, instructions: last.instructions }, stopPage ?? last.fromPage);
  const valid = +from >= 1 && +from <= TOTAL_PAGES && (+to || +from) >= +from && (+to || +from) <= TOTAL_PAGES;
  return (
    <section className="hz-card" aria-label={`Class lesson for ${className}`}>
      <div className="hz-row" style={{ alignItems: "flex-start" }}>
        <h2 className="hz-h2" style={{ margin: 0 }}><BookOpen size={22} aria-hidden="true" />Class lesson · {className}</h2>
        <button className="tt-icon-btn" onClick={onCancel} aria-label="Cancel"><X size={16} aria-hidden="true" /></button>
      </div>
      <p className="hz-muted">The whole class reads the same part. Switch between the {count} students in the Mushaf; each student's marked words are saved for them alone. Turn the pages freely.</p>
      {last && (
        <div className="cl-carry">
          <div>
            <small>Carry on with the last part · {fmtWhen(last.createdAt)}</small>
            <b>{last.instructions || describePages(last.fromPage, last.toPage)}</b>
            <span>{last.instructions ? `${describePages(last.fromPage, last.toPage)} · ` : ""}{stopPage && stopPage !== last.fromPage ? `stopped at page ${stopPage}` : `starts at page ${last.fromPage}`}</span>
          </div>
          <button className="hz-btn hz-btn-primary" onClick={carryOn}>Carry on<ArrowRight size={18} aria-hidden="true" /></button>
        </div>
      )}
      {last && !picking && (
        <button className="hz-btn hz-btn-outline" style={{ marginTop: 12 }} onClick={() => setPicking(true)}><Plus size={17} aria-hidden="true" />New part</button>
      )}
      {picking && <>
      {last && <h3 className="hz-h2" style={{ fontSize: 15, margin: "16px 0 8px" }}><Plus size={18} aria-hidden="true" />New part</h3>}
      <div className="tt-form">
        <div className="tt-wide"><SurahAyahPicker id="tt-class" onPick={pick} /></div>
        <div className="hz-field">
          <label htmlFor="tt-class-from">From page</label>
          <input id="tt-class-from" className="hz-input" type="number" inputMode="numeric" min="1" max={TOTAL_PAGES} value={from} onChange={(e) => { setFrom(e.target.value); setAyahs(null); }} placeholder="e.g. 582" />
        </div>
        <div className="hz-field">
          <label htmlFor="tt-class-to">To page</label>
          <input id="tt-class-to" className="hz-input" type="number" inputMode="numeric" min="1" max={TOTAL_PAGES} value={to} onChange={(e) => { setTo(e.target.value); setAyahs(null); }} placeholder="Same page" />
        </div>
      </div>
      {valid && <p className="hz-muted" style={{ marginBottom: 0 }}>{ayahs ? `${ayahs} · ` : ""}{describePages(+from, +(to || from))}</p>}
      {error && <div className="hz-error" role="alert" style={{ marginTop: 12 }}>{error}</div>}
      <div className="hz-wiz-nav" style={{ justifyContent: "flex-end", marginTop: 12 }}>
        {last && <button className="hz-btn hz-btn-ghost" onClick={() => setPicking(false)}>Cancel</button>}
        <button className="hz-btn hz-btn-primary" disabled={!from} onClick={open}><BookOpen size={18} aria-hidden="true" />Open Mushaf</button>
      </div>
      </>}
      <style>{`
        .cl-carry { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 14px 16px; border-radius: 14px; border: 1px solid #BFDDF6; background: linear-gradient(135deg, #EEF6FE, #FFFFFF); }
        .cl-carry > div { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 3px; }
        .cl-carry small { color: #567493; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .cl-carry b { color: #123B67; font-size: 18px; }
        .cl-carry span { color: #567493; font-size: 13px; }
        .cl-carry .hz-btn { min-height: 48px; padding: 0 22px; }
      `}</style>
    </section>
  );
}

// The Mushaf for the class lesson. students: the class (app shape), in the
// order the dropdown shows them. makeRepo(studentId): a student's Thilawa repo
// (Supabase unless given, e.g. the in-memory one).
export default function ClassLesson({ students, teacherId, portion, onClose, makeRepo = null, startPage = null, onPage = null }) {
  const repos = useMemo(() => new Map(students.map((s) => [s.id, makeRepo ? makeRepo(s.id) : createSupabaseThilawaRepo(supabase, s.id, teacherId)])), [students, teacherId, makeRepo]);
  const [studentId, setStudentId] = useState(students[0]?.id);
  const [data, setData] = useState({}); // student id → { assignments, mistakes }
  const [error, setError] = useState("");
  const timeZone = browserTimezone();
  const today = localDate(new Date(), timeZone);

  const load = useCallback(async (ids) => {
    const rows = await Promise.all(ids.map(async (id) => {
      const repo = repos.get(id);
      const [assignments, mistakes] = await Promise.all([repo.listAssignments(), repo.listMistakes()]);
      return [id, { assignments, mistakes }];
    }));
    setData((d) => ({ ...d, ...Object.fromEntries(rows) }));
  }, [repos]);
  useEffect(() => { load(students.map((s) => s.id)).catch((e) => setError(e.message)); }, [load, students]);

  const lessonOf = (id) => (data[id] ? findClassLesson(data[id].assignments, portion, today, timeZone) : null);
  const student = students.find((s) => s.id === studentId);
  const repo = repos.get(studentId);
  const lesson = lessonOf(studentId);
  const lessonId = lesson?.id ?? null;
  // Until the student has their lesson, Listen & mark gets one with no id; the
  // first write makes the real one and goes to it.
  const lessonRepo = useMemo(() => {
    let made = null;
    const ensure = () => (lessonId ? Promise.resolve(lessonId) : (made ??= repo.addAssignment({ ...portion, kind: "lesson" }).then((a) => a.id, (e) => { made = null; throw e; })));
    return {
      ...repo,
      addMistake: async (m) => repo.addMistake({ ...m, assignmentId: await ensure() }),
      setAssignmentLetters: async (_id, letters) => repo.setAssignmentLetters(await ensure(), letters),
      setAssignmentChecked: async (_id, checked) => repo.setAssignmentChecked(await ensure(), checked),
    };
  }, [repo, lessonId, portion]);

  const classmates = students.map((s) => ({ id: s.id, name: s.name, done: !!lessonOf(s.id)?.checkedAt }));
  // After Finish: the next student who isn't finished yet, or close when everyone is.
  const next = () => {
    const at = students.findIndex((s) => s.id === studentId);
    const after = [...students.slice(at + 1), ...students.slice(0, at)].find((s) => !lessonOf(s.id)?.checkedAt);
    if (after) setStudentId(after.id); else onClose();
  };

  if (!data[studentId]) {
    return createPortal(
      <div className="lm" role="dialog" aria-modal="true" aria-label="Class lesson" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#F4F8FC", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, fontFamily: "Inter, system-ui, sans-serif", color: "#123B67" }}>
        {error ? <><div className="hz-error" role="alert">{error}</div><button className="hz-btn hz-btn-outline" onClick={onClose}>Close</button></> : "Opening the class lesson…"}
      </div>,
      document.body,
    );
  }
  return (
    <ListenScreen student={student} repo={lessonRepo} mistakes={data[studentId].mistakes}
      assignment={lesson || { id: null, kind: "lesson", ...portion, letters: [], checkedAt: null }}
      refresh={() => load([studentId])} onClose={onClose} startPage={startPage} onPage={onPage}
      classmates={classmates} onStudent={setStudentId} onFinished={next} />
  );
}
