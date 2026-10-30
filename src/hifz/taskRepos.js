// Storage for teacher-planned Hifz (see tasks.js and the migration
// 20261105_hifz_teacher_tasks.sql). One repo = one student's data, opened by
// the student (portal) or their teacher. Row-level security decides who may
// write what: students can only tick tasks; everything else is the teacher's.
//
// Interface:
//   getProfile() → profile | null          saveProfile({ memorized, goalYear })
//   getLegacy() → { settings, rows } | null  (the student's old self-made plan)
//   listTasks() → tasks                    addTasks([{ taskDate, activity, start, end, notes }])
//   updateTask(id, patch)                  deleteTask(id)          setTaskDone(id, done)
//   listMistakes() → mistakes              addMistake({ page, line, verseKey, position, wordText, taskId })
//   setMistakeCorrected(id, corrected)     deleteMistake(id)
//   subscribe(onChange) → unsubscribe       (live updates)

import { createSupabaseRepo } from "./repos.js";
import { selectAll } from "../thilawa/repos.js";

const taskFromDb = (r) => ({
  id: r.id, teacherId: r.teacher_id, taskDate: r.task_date, activity: r.activity, start: r.start_unit, end: r.end_unit,
  notes: r.notes || "", completedAt: r.completed_at, createdAt: r.created_at, updatedAt: r.updated_at,
});
const mistakeFromDb = (r) => ({
  id: r.id, teacherId: r.teacher_id, taskId: r.task_id, page: r.page, line: r.word_line, verseKey: r.verse_key, position: r.word_position,
  wordText: r.word_text || "", note: r.note || "", correctedAt: r.corrected_at, createdAt: r.created_at,
});
const taskPatchToDb = (p) => {
  const map = { taskDate: "task_date", activity: "activity", start: "start_unit", end: "end_unit", notes: "notes" };
  return Object.fromEntries(Object.entries(p).filter(([k]) => map[k]).map(([k, v]) => [map[k], k === "notes" ? (v?.trim() || null) : v]));
};

export const HIFZ_TASK_MAPS = { taskFromDb, mistakeFromDb };

// teacherId: the signed-in teacher (null in the student portal).
export function createSupabaseHifzRepo(supabase, studentId, teacherId = null) {
  const check = ({ data, error }) => {
    if (error) throw new Error(error.message);
    return data;
  };
  const own = (table) => supabase.from(table).select("*").eq("student_id", studentId);
  return {
    async getProfile() {
      const r = check(await own("hifz_profiles").maybeSingle());
      return r && { memorized: r.memorized || [], goalYear: r.goal_year };
    },
    async saveProfile(p) {
      check(await supabase.from("hifz_profiles").upsert(
        { student_id: studentId, memorized: p.memorized, goal_year: p.goalYear || null, updated_by: teacherId, updated_at: new Date().toISOString() },
        { onConflict: "student_id" },
      ));
    },
    async getLegacy() {
      const old = createSupabaseRepo(supabase, studentId);
      const settings = await old.getSettings().catch(() => null);
      return settings ? { settings, rows: await old.listAssignments().catch(() => []) } : null;
    },
    listTasks: async () => (await selectAll(() => own("hifz_tasks").order("task_date").order("created_at").order("id"))).map(taskFromDb),
    async addTasks(rows) {
      // One insert, so the student gets one notification for the whole set.
      check(await supabase.from("hifz_tasks").insert(rows.map((t) => ({ student_id: studentId, teacher_id: teacherId, ...taskPatchToDb(t) }))));
    },
    async updateTask(id, patch) { check(await supabase.from("hifz_tasks").update(taskPatchToDb(patch)).eq("id", id).eq("student_id", studentId)); },
    async deleteTask(id) { check(await supabase.from("hifz_tasks").delete().eq("id", id).eq("student_id", studentId)); },
    async setTaskDone(id, done) {
      check(await supabase.from("hifz_tasks").update({ completed_at: done ? new Date().toISOString() : null }).eq("id", id).eq("student_id", studentId));
    },
    listMistakes: async () => (await selectAll(() => own("hifz_mistakes").order("created_at").order("id"))).map(mistakeFromDb),
    async addMistake(m) {
      check(await supabase.from("hifz_mistakes").insert({
        student_id: studentId, teacher_id: teacherId, task_id: m.taskId || null, page: m.page,
        verse_key: m.verseKey, word_position: m.position, word_line: m.line || null, word_text: m.wordText || null, note: m.note || null,
      }));
    },
    async setMistakeCorrected(id, corrected) {
      check(await supabase.from("hifz_mistakes").update({ corrected_at: corrected ? new Date().toISOString() : null }).eq("id", id).eq("student_id", studentId));
    },
    async deleteMistake(id) { check(await supabase.from("hifz_mistakes").delete().eq("id", id).eq("student_id", studentId)); },
    subscribe(onChange) {
      const channel = supabase.channel(`hifz-${studentId}-${Math.random().toString(36).slice(2)}`);
      for (const table of ["hifz_tasks", "hifz_mistakes", "hifz_profiles"]) {
        channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `student_id=eq.${studentId}` }, () => onChange());
      }
      channel.subscribe();
      return () => { supabase.removeChannel(channel); };
    },
  };
}

// ---------- In-memory (tests and local demo) ----------

export function createHifzMemoryStore() {
  return { profiles: new Map(), legacy: new Map(), tasks: [], mistakes: [], nextId: 1, tick: 0, listeners: new Set() };
}

// asStudent: like row-level security for a signed-in student — read only,
// except ticking tasks done.
export function createMemoryHifzRepo(store, studentId, { asStudent = false, teacherId = null } = {}) {
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const own = (r) => r.studentId === studentId;
  const stamp = () => new Date(Date.now() + store.tick++).toISOString();
  const changed = () => { for (const fn of store.listeners) fn(); };
  const teacherOnly = () => { if (asStudent) throw new Error("Only the teacher can do this."); };
  const find = (table, id) => {
    const row = store[table].find((r) => r.id === id);
    if (!row || !own(row)) throw new Error("Not allowed: that record belongs to another student.");
    return row;
  };
  return {
    async getProfile() { const p = store.profiles.get(studentId); return p ? clone(p) : null; },
    async saveProfile(p) { teacherOnly(); store.profiles.set(studentId, clone({ memorized: p.memorized, goalYear: p.goalYear || null })); changed(); },
    async getLegacy() { const l = store.legacy.get(studentId); return l ? clone(l) : null; },
    async listTasks() { return clone(store.tasks.filter(own)); },
    async addTasks(rows) {
      teacherOnly();
      for (const t of rows) {
        store.tasks.push({ notes: "", ...clone(t), id: `h${store.nextId++}`, studentId, teacherId, completedAt: null, createdAt: stamp() });
      }
      changed();
    },
    async updateTask(id, patch) {
      teacherOnly();
      const row = find("tasks", id);
      for (const k of ["taskDate", "activity", "start", "end", "notes"]) if (patch[k] !== undefined) row[k] = patch[k];
      changed();
    },
    async deleteTask(id) { teacherOnly(); find("tasks", id); store.tasks = store.tasks.filter((t) => t.id !== id); changed(); },
    async setTaskDone(id, done) { find("tasks", id).completedAt = done ? stamp() : null; changed(); },
    async listMistakes() { return clone(store.mistakes.filter(own)); },
    async addMistake(m) {
      teacherOnly();
      if (store.mistakes.some((x) => own(x) && !x.correctedAt && x.verseKey === m.verseKey && x.position === m.position)) throw new Error("That word is already marked.");
      store.mistakes.push({ note: "", wordText: "", taskId: null, ...clone(m), id: `m${store.nextId++}`, studentId, teacherId, correctedAt: null, createdAt: stamp() });
      changed();
    },
    async setMistakeCorrected(id, corrected) { teacherOnly(); find("mistakes", id).correctedAt = corrected ? stamp() : null; changed(); },
    async deleteMistake(id) { teacherOnly(); find("mistakes", id); store.mistakes = store.mistakes.filter((m) => m.id !== id); changed(); },
    subscribe(onChange) { store.listeners.add(onChange); return () => store.listeners.delete(onChange); },
  };
}
