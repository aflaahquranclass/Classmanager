// Storage for Thilawa. One repo = one student's data, opened either by the
// student themself (student portal) or by their teacher (teacher portal).
// Row-level security decides what each of them may read and write (see
// supabase/migrations/20261104_thilawa.sql); the in-memory repo mirrors the
// parts the UI relies on, for tests and the localhost demo.
//
// Interface:
//   getSettings() → { timezone, goalDate } | null      saveSettings(s)
//   listReading() → rows                                addReading({ readOn, fromPage, toPage, assignmentId }) → row
//   deleteReading(id)
//   listAssignments() → rows                            setAssignmentDone(id, done)
//   addAssignment({ fromPage, toPage, instructions, dueDate, kind }) → row (teacher;
//     kind "lesson" = a lesson held today, done when made)
//   setAssignmentChecked(id, checked) (teacher: finished listening)
//   setAssignmentLetters(id, letters) (teacher: Arabic letters the student needs to work on)
//   deleteAssignment(id) (teacher)
//   listMistakes() → rows                               addMistake({ assignmentId, page, line, verseKey, position, wordText }) (teacher)
//   setMistakeCorrected(id, corrected) (teacher)        deleteMistake(id) (teacher)
//   setMistakeCategory(id, category) (teacher; an id from MISTAKE_CATEGORIES, or null)
//   setMistakeTicked(id, ticked) (the student's own tick)
//   listAssessments() → rows                            addAssessment({ tajweed, fluency, comment }) (teacher)
//   deleteAssessment(id) (teacher)
//   listNotes() → rows (students only get shared ones)  addNote({ body, visibleToStudent }) (teacher)
//   updateNote(id, patch) (teacher)                     deleteNote(id) (teacher)

import { sortLetters } from "./engine.js";

const readingFromDb = (r) => ({ id: r.id, readOn: r.read_on, fromPage: r.from_page, toPage: r.to_page, assignmentId: r.assignment_id, createdAt: r.created_at });
const assignmentFromDb = (r) => ({
  id: r.id, teacherId: r.teacher_id, fromPage: r.from_page, toPage: r.to_page, instructions: r.instructions || "",
  dueDate: r.due_date, completedAt: r.completed_at, createdAt: r.created_at, kind: r.kind || "reading", checkedAt: r.checked_at || null,
  letters: r.letters || [],
});
const mistakeFromDb = (r) => ({
  id: r.id, teacherId: r.teacher_id, assignmentId: r.assignment_id, page: r.page, line: r.word_line, verseKey: r.verse_key, position: r.word_position,
  wordText: r.word_text || "", category: r.category || null, note: r.note || "", correctedAt: r.corrected_at, tickedAt: r.student_ticked_at || null, createdAt: r.created_at,
});
const assessmentFromDb = (r) => ({ id: r.id, teacherId: r.teacher_id, tajweed: r.tajweed, fluency: r.fluency, comment: r.comment || "", assessedOn: r.assessed_on, createdAt: r.created_at });
const noteFromDb = (r) => ({ id: r.id, teacherId: r.teacher_id, body: r.body, visibleToStudent: r.visible_to_student, createdAt: r.created_at, updatedAt: r.updated_at });

// Every row of a query, fetched 1000 at a time (Supabase's limit per request).
// makeQuery() must return a fresh, ordered select each time.
export async function selectAll(makeQuery) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await makeQuery().range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

export const THILAWA_MAPS = { readingFromDb, assignmentFromDb, assessmentFromDb, noteFromDb, mistakeFromDb };

// teacherId: the signed-in teacher writing rows (null in the student portal).
export function createSupabaseThilawaRepo(supabase, studentId, teacherId = null) {
  const check = ({ data, error }) => {
    if (error) throw new Error(error.message);
    return data;
  };
  const list = async (table, map) => (await selectAll(() => supabase.from(table).select("*").eq("student_id", studentId).order("created_at").order("id"))).map(map);
  const remove = async (table, id) => { check(await supabase.from(table).delete().eq("id", id).eq("student_id", studentId)); };
  return {
    async getSettings() {
      const r = check(await supabase.from("thilawa_settings").select("*").eq("student_id", studentId).maybeSingle());
      return r && { timezone: r.timezone, goalDate: r.goal_date };
    },
    async saveSettings(s) {
      check(await supabase.from("thilawa_settings").upsert(
        { student_id: studentId, timezone: s.timezone, goal_date: s.goalDate, updated_at: new Date().toISOString() },
        { onConflict: "student_id" },
      ));
    },
    listReading: () => list("thilawa_reading", readingFromDb),
    async addReading(r) {
      return readingFromDb(check(await supabase.from("thilawa_reading")
        .insert({ student_id: studentId, read_on: r.readOn, from_page: r.fromPage, to_page: r.toPage, assignment_id: r.assignmentId || null })
        .select("*").single()));
    },
    deleteReading: (id) => remove("thilawa_reading", id),
    listAssignments: () => list("thilawa_assignments", assignmentFromDb),
    async setAssignmentDone(id, done) {
      check(await supabase.from("thilawa_assignments").update({ completed_at: done ? new Date().toISOString() : null }).eq("id", id).eq("student_id", studentId));
    },
    async addAssignment(a) {
      const lesson = a.kind === "lesson";
      return assignmentFromDb(check(await supabase.from("thilawa_assignments").insert({
        student_id: studentId, teacher_id: teacherId, from_page: a.fromPage, to_page: a.toPage,
        instructions: a.instructions?.trim() || null, due_date: a.dueDate || null,
        kind: lesson ? "lesson" : "reading", completed_at: lesson ? new Date().toISOString() : null,
      }).select("*").single()));
    },
    async setAssignmentChecked(id, checked) {
      check(await supabase.from("thilawa_assignments").update({ checked_at: checked ? new Date().toISOString() : null }).eq("id", id).eq("student_id", studentId));
    },
    async setAssignmentLetters(id, letters) {
      check(await supabase.from("thilawa_assignments").update({ letters: sortLetters(letters) }).eq("id", id).eq("student_id", studentId));
    },
    listMistakes: () => list("thilawa_mistakes", mistakeFromDb),
    async addMistake(m) {
      check(await supabase.from("thilawa_mistakes").insert({
        student_id: studentId, teacher_id: teacherId, assignment_id: m.assignmentId, page: m.page,
        verse_key: m.verseKey, word_position: m.position, word_line: m.line || null, word_text: m.wordText || null,
      }));
    },
    async setMistakeCorrected(id, corrected) {
      check(await supabase.from("thilawa_mistakes").update({ corrected_at: corrected ? new Date().toISOString() : null }).eq("id", id).eq("student_id", studentId));
    },
    async setMistakeCategory(id, category) {
      check(await supabase.from("thilawa_mistakes").update({ category: category || null }).eq("id", id).eq("student_id", studentId));
    },
    async setMistakeTicked(id, ticked) {
      check(await supabase.from("thilawa_mistakes").update({ student_ticked_at: ticked ? new Date().toISOString() : null }).eq("id", id).eq("student_id", studentId));
    },
    deleteMistake: (id) => remove("thilawa_mistakes", id),
    deleteAssignment: (id) => remove("thilawa_assignments", id),
    listAssessments: () => list("thilawa_assessments", assessmentFromDb),
    async addAssessment(a) {
      check(await supabase.from("thilawa_assessments").insert({
        student_id: studentId, teacher_id: teacherId, tajweed: a.tajweed, fluency: a.fluency, comment: a.comment?.trim() || null,
      }));
    },
    deleteAssessment: (id) => remove("thilawa_assessments", id),
    listNotes: () => list("thilawa_notes", noteFromDb),
    async addNote(n) {
      check(await supabase.from("thilawa_notes").insert({ student_id: studentId, teacher_id: teacherId, body: n.body.trim(), visible_to_student: n.visibleToStudent }));
    },
    async updateNote(id, patch) {
      const row = { updated_at: new Date().toISOString() };
      if (patch.body != null) row.body = patch.body.trim();
      if (patch.visibleToStudent != null) row.visible_to_student = patch.visibleToStudent;
      check(await supabase.from("thilawa_notes").update(row).eq("id", id).eq("student_id", studentId));
    },
    deleteNote: (id) => remove("thilawa_notes", id),
    // Live updates when the teacher sets reading, levels, notes or marks mistakes.
    subscribe(onChange) {
      const channel = supabase.channel(`thilawa-${studentId}-${Math.random().toString(36).slice(2)}`);
      for (const table of ["thilawa_assignments", "thilawa_assessments", "thilawa_notes", "thilawa_mistakes"]) {
        channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `student_id=eq.${studentId}` }, () => onChange());
      }
      channel.subscribe();
      return () => { supabase.removeChannel(channel); };
    },
  };
}

// ---------- In-memory (tests and local demo) ----------

export function createThilawaMemoryStore() {
  return { settings: new Map(), reading: [], assignments: [], assessments: [], notes: [], mistakes: [], nextId: 1, tick: 0, listeners: new Set() };
}

// asStudent: hides private notes and only lets the student tick readings and
// mistakes, like row-level security does for a signed-in student.
export function createMemoryThilawaRepo(store, studentId, { asStudent = false, teacherId = null } = {}) {
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const own = (r) => r.studentId === studentId;
  // Strictly increasing timestamps, so rows added in the same millisecond keep their order.
  const stamp = () => new Date(Date.now() + store.tick++).toISOString();
  const add = (table, row) => {
    const full = { ...clone(row), id: `t${store.nextId++}`, studentId, createdAt: stamp() };
    store[table].push(full);
    return clone(full);
  };
  const find = (table, id) => {
    const row = store[table].find((r) => r.id === id);
    if (!row || !own(row)) throw new Error("Not allowed: that record belongs to another student.");
    return row;
  };
  const remove = (table, id) => { find(table, id); store[table] = store[table].filter((r) => r.id !== id); };
  const teacherOnly = () => { if (asStudent) throw new Error("Only the teacher can do this."); };
  const changed = () => { for (const fn of store.listeners || []) fn(); };
  return {
    async getSettings() { const s = store.settings.get(studentId); return s ? clone(s) : null; },
    async saveSettings(s) { store.settings.set(studentId, clone(s)); },
    async listReading() { return clone(store.reading.filter(own)); },
    async addReading(r) { return add("reading", { readOn: r.readOn, fromPage: r.fromPage, toPage: r.toPage, assignmentId: r.assignmentId || null }); },
    async deleteReading(id) { remove("reading", id); },
    async listAssignments() { return clone(store.assignments.filter(own)); },
    async setAssignmentDone(id, done) { find("assignments", id).completedAt = done ? stamp() : null; changed(); },
    async addAssignment(a) {
      teacherOnly();
      const lesson = a.kind === "lesson";
      const row = add("assignments", { teacherId, fromPage: a.fromPage, toPage: a.toPage, instructions: a.instructions?.trim() || "", dueDate: a.dueDate || null,
        kind: lesson ? "lesson" : "reading", completedAt: lesson ? stamp() : null, checkedAt: null, letters: [] });
      changed();
      return row;
    },
    async setAssignmentChecked(id, checked) { teacherOnly(); find("assignments", id).checkedAt = checked ? stamp() : null; changed(); },
    async setAssignmentLetters(id, letters) { teacherOnly(); find("assignments", id).letters = sortLetters(letters); changed(); },
    async listMistakes() { return clone(store.mistakes.filter(own)); },
    async addMistake(m) {
      teacherOnly();
      if (store.mistakes.some((x) => own(x) && !x.correctedAt && x.assignmentId === m.assignmentId && x.verseKey === m.verseKey && x.position === m.position)) throw new Error("That word is already marked.");
      add("mistakes", { teacherId, assignmentId: m.assignmentId, page: m.page, line: m.line || null, verseKey: m.verseKey, position: m.position, wordText: m.wordText || "", category: null, note: "", correctedAt: null, tickedAt: null });
      changed();
    },
    async setMistakeCorrected(id, corrected) { teacherOnly(); find("mistakes", id).correctedAt = corrected ? stamp() : null; changed(); },
    async setMistakeCategory(id, category) { teacherOnly(); find("mistakes", id).category = category || null; changed(); },
    async setMistakeTicked(id, ticked) { find("mistakes", id).tickedAt = ticked ? stamp() : null; changed(); },
    async deleteMistake(id) { teacherOnly(); remove("mistakes", id); changed(); },
    subscribe(onChange) { store.listeners ??= new Set(); store.listeners.add(onChange); return () => store.listeners.delete(onChange); },
    async deleteAssignment(id) { teacherOnly(); remove("assignments", id); },
    async listAssessments() { return clone(store.assessments.filter(own)); },
    async addAssessment(a) { teacherOnly(); add("assessments", { teacherId, tajweed: a.tajweed, fluency: a.fluency, comment: a.comment?.trim() || "", assessedOn: stamp().slice(0, 10) }); },
    async deleteAssessment(id) { teacherOnly(); remove("assessments", id); },
    async listNotes() { return clone(store.notes.filter((n) => own(n) && (!asStudent || n.visibleToStudent))); },
    async addNote(n) { teacherOnly(); add("notes", { teacherId, body: n.body.trim(), visibleToStudent: n.visibleToStudent }); },
    async updateNote(id, patch) {
      teacherOnly();
      const row = find("notes", id);
      if (patch.body != null) row.body = patch.body.trim();
      if (patch.visibleToStudent != null) row.visibleToStudent = patch.visibleToStudent;
      row.updatedAt = stamp();
    },
    async deleteNote(id) { teacherOnly(); remove("notes", id); },
  };
}

// ---------- A class's Thilawa: its open reading and Tajweed topics ----------
// See supabase/migrations/20261119_thilawa_class_reading.sql.
//   getReading() → the open reading | null          listReadings() → every reading, newest first
//   openReading({ fromPage, toPage, firstAyah, lastAyah, label, page }) → row (teacher; ends the open one)
//   setReadingPage(id, page) (teacher: where the class stopped)
//   listTopics() → topics, newest first             addTopic({ topic, note, taughtOn }) (teacher)
//   deleteTopic(id) (teacher)                       subscribe(onChange) → stop

const classReadingFromDb = (r) => ({
  id: r.id, classId: r.class_id, teacherId: r.teacher_id, fromPage: r.from_page, toPage: r.to_page,
  firstAyah: r.first_ayah ?? null, lastAyah: r.last_ayah ?? null, label: r.label || "", page: r.page,
  endedAt: r.ended_at || null, createdAt: r.created_at, updatedAt: r.updated_at,
});
const classTopicFromDb = (r) => ({ id: r.id, classId: r.class_id, teacherId: r.teacher_id, topic: r.topic, note: r.note || "", taughtOn: r.taught_on, createdAt: r.created_at });
export const CLASS_MAPS = { classReadingFromDb, classTopicFromDb };

const byNewest = (a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);
const topicOrder = (a, b) => (a.taughtOn < b.taughtOn ? 1 : a.taughtOn > b.taughtOn ? -1 : byNewest(a, b));

export function createSupabaseClassRepo(supabase, classId, teacherId = null) {
  const check = ({ data, error }) => {
    if (error) throw new Error(error.message);
    return data;
  };
  return {
    classId,
    async getReading() {
      const r = check(await supabase.from("thilawa_class_readings").select("*").eq("class_id", classId).is("ended_at", null).maybeSingle());
      return r ? classReadingFromDb(r) : null;
    },
    async listReadings() {
      return check(await supabase.from("thilawa_class_readings").select("*").eq("class_id", classId).order("created_at", { ascending: false }).limit(50)).map(classReadingFromDb);
    },
    async openReading(r) {
      const now = new Date().toISOString();
      check(await supabase.from("thilawa_class_readings").update({ ended_at: now, updated_at: now }).eq("class_id", classId).is("ended_at", null));
      return classReadingFromDb(check(await supabase.from("thilawa_class_readings").insert({
        class_id: classId, teacher_id: teacherId, from_page: r.fromPage, to_page: r.toPage,
        first_ayah: r.firstAyah ?? null, last_ayah: r.lastAyah ?? null, label: r.label?.trim() || null, page: r.page ?? r.fromPage,
      }).select("*").single()));
    },
    async setReadingPage(id, page) {
      check(await supabase.from("thilawa_class_readings").update({ page, updated_at: new Date().toISOString() }).eq("id", id).eq("class_id", classId));
    },
    async listTopics() {
      return check(await supabase.from("thilawa_class_topics").select("*").eq("class_id", classId).order("taught_on", { ascending: false }).order("created_at", { ascending: false })).map(classTopicFromDb);
    },
    async addTopic(t) {
      check(await supabase.from("thilawa_class_topics").insert({
        class_id: classId, teacher_id: teacherId, topic: t.topic.trim(), note: t.note?.trim() || null, ...(t.taughtOn ? { taught_on: t.taughtOn } : {}),
      }));
    },
    async deleteTopic(id) { check(await supabase.from("thilawa_class_topics").delete().eq("id", id).eq("class_id", classId)); },
    subscribe(onChange) {
      const channel = supabase.channel(`thilawa-class-${classId}-${Math.random().toString(36).slice(2)}`);
      for (const table of ["thilawa_class_readings", "thilawa_class_topics"]) {
        channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `class_id=eq.${classId}` }, () => onChange());
      }
      channel.subscribe();
      return () => { supabase.removeChannel(channel); };
    },
  };
}

// In memory (tests and the localhost demo). asStudent: read only.
export function createClassMemoryStore() {
  return { readings: [], topics: [], nextId: 1, tick: 0, listeners: new Set() };
}
export function createMemoryClassRepo(store, classId, { asStudent = false, teacherId = null } = {}) {
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const stamp = () => new Date(Date.now() + store.tick++).toISOString();
  const teacherOnly = () => { if (asStudent) throw new Error("Only the teacher can do this."); };
  const changed = () => { for (const fn of store.listeners) fn(); };
  const mine = (r) => r.classId === classId;
  return {
    classId,
    async getReading() { const r = store.readings.find((x) => mine(x) && !x.endedAt); return r ? clone(r) : null; },
    async listReadings() { return clone(store.readings.filter(mine).sort(byNewest)); },
    async openReading(r) {
      teacherOnly();
      const now = stamp();
      for (const x of store.readings) if (mine(x) && !x.endedAt) x.endedAt = now;
      const row = { id: `c${store.nextId++}`, classId, teacherId, fromPage: r.fromPage, toPage: r.toPage, firstAyah: r.firstAyah ?? null, lastAyah: r.lastAyah ?? null,
        label: r.label?.trim() || "", page: r.page ?? r.fromPage, endedAt: null, createdAt: stamp(), updatedAt: now };
      store.readings.push(row);
      changed();
      return clone(row);
    },
    async setReadingPage(id, page) {
      teacherOnly();
      const r = store.readings.find((x) => x.id === id && mine(x));
      if (!r) throw new Error("That reading belongs to another class.");
      r.page = page; r.updatedAt = stamp();
      changed();
    },
    async listTopics() { return clone(store.topics.filter(mine).sort(topicOrder)); },
    async addTopic(t) {
      teacherOnly();
      store.topics.push({ id: `k${store.nextId++}`, classId, teacherId, topic: t.topic.trim(), note: t.note?.trim() || "", taughtOn: t.taughtOn || stamp().slice(0, 10), createdAt: stamp() });
      changed();
    },
    async deleteTopic(id) { teacherOnly(); store.topics = store.topics.filter((t) => !(t.id === id && mine(t))); changed(); },
    subscribe(onChange) { store.listeners.add(onChange); return () => store.listeners.delete(onChange); },
  };
}
