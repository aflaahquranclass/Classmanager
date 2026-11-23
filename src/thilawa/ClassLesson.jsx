// Teacher: the class reading open in the Mushaf. The whole class reads the
// same part (the class reading, see ClassThilawa.jsx), so the Mushaf opens
// with a dropdown of the class; switching student shows that student's own
// marked words. Each student has their own lesson for the day, made the first
// time the teacher marks a word, chooses letters or finishes them (a student
// who didn't read gets nothing). Opening the same part again the same day
// picks up the lessons already made. Pages turn freely in the Mushaf, and
// onPage(page) hears every turn (the class reading keeps where it stopped).
// recitation ({ recitations, onSet }, see RecitationMarking.jsx): tapping ayah
// numbers marks today's and the next recitation.
// "All students" (first in the dropdown): while it's chosen, every marked word
// (its kind of mistake, Corrected, Remove), the letters, a note and Finish go
// to every student of the class, until the teacher picks one student again. It
// shows a word as marked when any student has it, and everyone's letters.

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient.js";
import { localDate } from "../hifz/engine.js";
import { findClassLesson } from "./engine.js";
import { browserTimezone } from "./service.js";
import { createSupabaseThilawaRepo } from "./repos.js";
import ListenScreen from "./ListenScreen.jsx";
import { useRecitationMarking } from "./RecitationMarking.jsx";

const ALL = "all"; // "All students" in the dropdown

// students: the class (app shape), in the order the dropdown shows them.
// portion: { fromPage, toPage, instructions }. makeRepo(studentId): a
// student's Thilawa repo (Supabase unless given, e.g. the in-memory one).
export default function ClassLesson({ students, teacherId, portion, onClose, makeRepo = null, startPage = null, onPage = null, recitation = null }) {
  const ayah = useRecitationMarking(recitation || { recitations: [], onSet: async () => {} });
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
  const dataRef = useRef(data);
  dataRef.current = data;
  const all = studentId === ALL;
  const student = all ? { id: ALL, name: "All students" } : students.find((s) => s.id === studentId);
  // Until a student has their lesson, the first write makes it and goes to it.
  // It is made once per student and part (kept outside the render, so marks
  // saved while the screen redraws all go to the same lesson).
  const making = useRef(new Map()); // "studentId|part" → Promise<lesson id>
  const ensureFor = useCallback((sid) => {
    const d = dataRef.current[sid];
    const known = d ? findClassLesson(d.assignments, portion, today, timeZone) : null;
    if (known) return Promise.resolve(known.id);
    const k = `${sid}|${portion.fromPage}|${portion.toPage}|${portion.instructions || ""}`;
    if (!making.current.has(k)) {
      const p = repos.get(sid).addAssignment({ ...portion, kind: "lesson" }).then((a) => a.id);
      p.catch(() => making.current.delete(k));
      making.current.set(k, p);
    }
    return making.current.get(k);
  }, [repos, portion, today, timeZone]);
  const lessonRepo = useMemo(() => {
    if (all) return null;
    const repo = repos.get(studentId);
    return {
      ...repo,
      addMistake: async (m) => repo.addMistake({ ...m, assignmentId: await ensureFor(studentId) }),
      setAssignmentLetters: async (_id, letters) => repo.setAssignmentLetters(await ensureFor(studentId), letters),
      setAssignmentChecked: async (_id, checked) => repo.setAssignmentChecked(await ensureFor(studentId), checked),
    };
  }, [repos, studentId, all, ensureFor]);

  // All students: every change goes to each student's own lesson. A word is
  // "all|<verse>:<position>"; changing it changes that word wherever it's marked.
  const allRepo = useMemo(() => {
    const keyOf = (m) => `${m.verseKey}:${m.position}`;
    const each = (fn) => Promise.all(students.map((s) => fn(s.id, repos.get(s.id))));
    const onWord = (id, fn) => {
      const key = String(id).replace(/^all\|/, "");
      return each(async (sid, r) => {
        const l = findClassLesson(await r.listAssignments(), portion, today, timeZone);
        if (!l) return;
        for (const m of (await r.listMistakes()).filter((x) => x.assignmentId === l.id && !x.correctedAt && keyOf(x) === key)) await fn(r, m);
      });
    };
    return {
      async addMistake(m) {
        const key = `${m.verseKey}:${m.position}`;
        await each(async (sid, r) => {
          const lid = await ensureFor(sid);
          if ((await r.listMistakes()).some((x) => x.assignmentId === lid && !x.correctedAt && keyOf(x) === key)) return;
          await r.addMistake({ ...m, assignmentId: lid });
        });
        return { id: `all|${key}` };
      },
      setMistakeCategory: (id, c) => onWord(id, (r, m) => r.setMistakeCategory(m.id, c)),
      setMistakeCorrected: (id, v) => onWord(id, (r, m) => r.setMistakeCorrected(m.id, v)),
      deleteMistake: (id) => onWord(id, (r, m) => r.deleteMistake(m.id)),
      setAssignmentLetters: (_id, letters) => each(async (sid, r) => r.setAssignmentLetters(await ensureFor(sid), letters)),
      setAssignmentChecked: (_id, checked) => each(async (sid, r) => r.setAssignmentChecked(await ensureFor(sid), checked)),
      addNote: (n) => each((sid, r) => r.addNote(n)),
      listNotes: async () => [],
    };
  }, [students, repos, portion, today, timeZone, ensureFor]);
  // What All students shows: a word marked for any student (open if it's open
  // for any), everyone's letters, finished once everyone is.
  const allView = () => {
    const lessons = students.map((s) => [s.id, lessonOf(s.id)]);
    const byKey = new Map();
    for (const [sid, l] of lessons) {
      if (!l) continue;
      for (const m of data[sid].mistakes.filter((x) => x.assignmentId === l.id)) {
        const k = `${m.verseKey}:${m.position}`;
        const had = byKey.get(k);
        if (!had || (had.correctedAt && !m.correctedAt)) byKey.set(k, { ...m, id: `all|${k}`, assignmentId: ALL });
      }
    }
    const done = lessons.every(([, l]) => l?.checkedAt);
    return {
      mistakes: [...byKey.values()],
      assignment: { id: ALL, kind: "lesson", ...portion, letters: [...new Set(lessons.flatMap(([, l]) => l?.letters || []))], checkedAt: done ? lessons[0][1].checkedAt : null },
      done,
    };
  };

  // Where the class is: kept as the pages turn, so switching student stays on the page.
  const [page, setPage] = useState(startPage);
  const turn = (p) => { setPage(p); onPage?.(p); };

  // Finish (full screen): every other student who read today (has a lesson) is finished too.
  const finishOthers = async () => {
    await Promise.all(students.filter((s) => s.id !== studentId).map(async (s) => {
      const r = repos.get(s.id);
      const l = findClassLesson(await r.listAssignments(), portion, today, timeZone);
      if (l && !l.checkedAt) await r.setAssignmentChecked(l.id, true);
    }));
  };
  const loaded = students.every((s) => data[s.id]);
  const view = all && loaded ? allView() : null;
  const classmates = [{ id: ALL, name: "All students", done: !!view?.done || (loaded && students.every((s) => lessonOf(s.id)?.checkedAt)) },
    ...students.map((s) => ({ id: s.id, name: s.name, done: !!lessonOf(s.id)?.checkedAt }))];
  // After Finish: the next student who isn't finished yet, or close when everyone is.
  const next = () => {
    const at = students.findIndex((s) => s.id === studentId);
    const after = [...students.slice(at + 1), ...students.slice(0, at)].find((s) => !lessonOf(s.id)?.checkedAt);
    if (after) setStudentId(after.id); else onClose();
  };

  if (all ? !loaded : !data[studentId]) {
    return createPortal(
      <div className="lm" role="dialog" aria-modal="true" aria-label="Class reading" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#F4F8FC", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, fontFamily: "Inter, system-ui, sans-serif", color: "#123B67" }}>
        {error ? <><div className="hz-error" role="alert">{error}</div><button className="hz-btn hz-btn-outline" onClick={onClose}>Close</button></> : "Opening the class reading…"}
      </div>,
      document.body,
    );
  }
  const lesson = all ? null : lessonOf(studentId);
  return (
    <ListenScreen student={student} repo={all ? allRepo : lessonRepo} mistakes={all ? view.mistakes : data[studentId].mistakes}
      assignment={all ? view.assignment : lesson || { id: null, kind: "lesson", ...portion, letters: [], checkedAt: null }}
      refresh={() => load(all ? students.map((s) => s.id) : [studentId])} onClose={onClose} startPage={page} onPage={turn}
      classmates={classmates} onStudent={setStudentId} onFinished={all ? onClose : next} ayah={recitation ? ayah : null}
      onFinishAll={finishOthers} repoFor={(id) => (id === ALL ? allRepo : repos.get(id))} />
  );
}
