// Teacher: a class lesson. The whole class reads the same portion, so the
// teacher picks it once and opens the Mushaf with a dropdown of the class;
// switching student shows that student's own marked words. Each student has
// their own lesson, made the first time the teacher marks a word, chooses
// letters or finishes them (a student who didn't read gets nothing). Opening
// the same portion again the same day picks up the lessons already made.

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { BookOpen, X } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { localDate } from "../hifz/engine.js";
import { TOTAL_PAGES, describePages, findClassLesson } from "./engine.js";
import { browserTimezone } from "./service.js";
import { createSupabaseThilawaRepo } from "./repos.js";
import ListenScreen from "./ListenScreen.jsx";
import SurahAyahPicker from "./SurahAyahPicker.jsx";

// The portion for the whole class: surah and ayahs, or pages.
// onOpen({ fromPage, toPage, instructions }).
export function ClassLessonForm({ className, count, onOpen, onCancel }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ayahs, setAyahs] = useState(null);
  const [error, setError] = useState("");
  const pick = (r) => { setFrom(String(r.fromPage)); setTo(String(r.toPage)); setAyahs(r.whole ? null : r.label); };
  const open = () => {
    const a = Math.round(+from);
    const b = Math.round(+(to || from));
    if (!(a >= 1 && a <= TOTAL_PAGES && b >= a && b <= TOTAL_PAGES)) { setError(`Pages must be between 1 and ${TOTAL_PAGES}, with the last page not before the first.`); return; }
    onOpen({ fromPage: a, toPage: b, instructions: ayahs || "" });
  };
  const valid = +from >= 1 && +from <= TOTAL_PAGES && (+to || +from) >= +from && (+to || +from) <= TOTAL_PAGES;
  return (
    <section className="hz-card" aria-label={`Class lesson for ${className}`}>
      <div className="hz-row" style={{ alignItems: "flex-start" }}>
        <h2 className="hz-h2" style={{ margin: 0 }}><BookOpen size={22} aria-hidden="true" />Class lesson · {className}</h2>
        <button className="tt-icon-btn" onClick={onCancel} aria-label="Cancel"><X size={16} aria-hidden="true" /></button>
      </div>
      <p className="hz-muted">The whole class reads the same portion. Choose it once, then switch between the {count} students in the Mushaf. Each student's marked words are saved for them alone.</p>
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
        <button className="hz-btn hz-btn-primary" disabled={!from} onClick={open}><BookOpen size={18} aria-hidden="true" />Open Mushaf</button>
      </div>
    </section>
  );
}

// The Mushaf for the class lesson. students: the class (app shape), in the
// order the dropdown shows them. makeRepo(studentId): a student's Thilawa repo
// (Supabase unless given, e.g. the in-memory one).
export default function ClassLesson({ students, teacherId, portion, onClose, makeRepo = null }) {
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
      refresh={() => load([studentId])} onClose={onClose}
      classmates={classmates} onStudent={setStudentId} onFinished={next} />
  );
}
