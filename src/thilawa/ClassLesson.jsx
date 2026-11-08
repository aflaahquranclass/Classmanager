// Teacher: the class reading open in the Mushaf. The whole class reads the
// same part (the class reading, see ClassThilawa.jsx), so the Mushaf opens
// with a dropdown of the class; switching student shows that student's own
// marked words. Each student has their own lesson for the day, made the first
// time the teacher marks a word, chooses letters or finishes them (a student
// who didn't read gets nothing). Opening the same part again the same day
// picks up the lessons already made. Pages turn freely in the Mushaf, and
// onPage(page) hears every turn (the class reading keeps where it stopped).

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient.js";
import { localDate } from "../hifz/engine.js";
import { findClassLesson } from "./engine.js";
import { browserTimezone } from "./service.js";
import { createSupabaseThilawaRepo } from "./repos.js";
import ListenScreen from "./ListenScreen.jsx";

// students: the class (app shape), in the order the dropdown shows them.
// portion: { fromPage, toPage, instructions }. makeRepo(studentId): a
// student's Thilawa repo (Supabase unless given, e.g. the in-memory one).
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
  // first write makes the real one and goes to it. It is made once per student
  // and part (kept outside the render, so marks saved while the screen
  // redraws all go to the same lesson).
  const making = useRef(new Map()); // "studentId|part" → Promise<lesson id>
  const lessonRepo = useMemo(() => {
    const k = `${studentId}|${portion.fromPage}|${portion.toPage}|${portion.instructions || ""}`;
    const ensure = () => {
      if (lessonId) return Promise.resolve(lessonId);
      if (!making.current.has(k)) {
        making.current.set(k, repo.addAssignment({ ...portion, kind: "lesson" }).then((a) => a.id, (e) => { making.current.delete(k); throw e; }));
      }
      return making.current.get(k);
    };
    return {
      ...repo,
      addMistake: async (m) => repo.addMistake({ ...m, assignmentId: await ensure() }),
      setAssignmentLetters: async (_id, letters) => repo.setAssignmentLetters(await ensure(), letters),
      setAssignmentChecked: async (_id, checked) => repo.setAssignmentChecked(await ensure(), checked),
    };
  }, [repo, lessonId, portion, studentId]);

  // Where the class is: kept as the pages turn, so switching student stays on the page.
  const [page, setPage] = useState(startPage);
  const turn = (p) => { setPage(p); onPage?.(p); };

  const classmates = students.map((s) => ({ id: s.id, name: s.name, done: !!lessonOf(s.id)?.checkedAt }));
  // After Finish: the next student who isn't finished yet, or close when everyone is.
  const next = () => {
    const at = students.findIndex((s) => s.id === studentId);
    const after = [...students.slice(at + 1), ...students.slice(0, at)].find((s) => !lessonOf(s.id)?.checkedAt);
    if (after) setStudentId(after.id); else onClose();
  };

  if (!data[studentId]) {
    return createPortal(
      <div className="lm" role="dialog" aria-modal="true" aria-label="Class reading" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#F4F8FC", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, fontFamily: "Inter, system-ui, sans-serif", color: "#123B67" }}>
        {error ? <><div className="hz-error" role="alert">{error}</div><button className="hz-btn hz-btn-outline" onClick={onClose}>Close</button></> : "Opening the class reading…"}
      </div>,
      document.body,
    );
  }
  return (
    <ListenScreen student={student} repo={lessonRepo} mistakes={data[studentId].mistakes}
      assignment={lesson || { id: null, kind: "lesson", ...portion, letters: [], checkedAt: null }}
      refresh={() => load([studentId])} onClose={onClose} startPage={page} onPage={turn}
      classmates={classmates} onStudent={setStudentId} onFinished={next} />
  );
}
