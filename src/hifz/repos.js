// Storage backends for the Hifz Tracker service (see service.js for the interface).

// ---------- Supabase (production) ----------
// Row-level security on hifz_settings / hifz_assignments limits every query to
// the signed-in student's own records; studentId here is only used to fill the
// column on insert, and the database rejects any id that isn't theirs.

const settingsFromDb = (r) => r && {
  timezone: r.timezone,
  goalYear: r.goal_year,
  startUnit: r.start_unit,
  direction: r.direction,
  currentUnit: r.current_unit,
  extraMemorized: r.extra_memorized || [],
  newTarget: r.new_target,
  shortTarget: r.short_target,
  longTarget: r.long_target,
  longStartUnit: r.long_start_unit,
  longOverrideAt: r.long_override_at,
};
const settingsToDb = (s) => ({
  timezone: s.timezone,
  goal_year: s.goalYear,
  start_unit: s.startUnit,
  direction: s.direction,
  current_unit: s.currentUnit,
  extra_memorized: s.extraMemorized || [],
  new_target: s.newTarget,
  short_target: s.shortTarget,
  long_target: s.longTarget,
  long_start_unit: s.longStartUnit,
  long_override_at: s.longOverrideAt ?? null,
});
const rowFromDb = (r) => ({
  id: r.id,
  studentId: r.student_id,
  planDate: r.plan_date,
  activity: r.activity,
  target: r.target,
  pendingIn: r.pending_in || [],
  segments: r.segments || [],
  completed: r.completed || [],
  cursorAfter: r.cursor_after,
  cycleAfter: r.cycle_after,
  status: r.status,
  completedAt: r.completed_at,
  plannedAt: r.planned_at,
  version: r.version,
});
const patchToDb = (p) => {
  const map = { target: "target", pendingIn: "pending_in", segments: "segments", completed: "completed", cursorAfter: "cursor_after", cycleAfter: "cycle_after", status: "status", completedAt: "completed_at", plannedAt: "planned_at" };
  return Object.fromEntries(Object.entries(p).filter(([k]) => map[k]).map(([k, v]) => [map[k], v]));
};

export function createSupabaseRepo(supabase, studentId) {
  const check = ({ data, error }) => {
    if (error) throw new Error(error.message);
    return data;
  };
  return {
    async getSettings() {
      return settingsFromDb(check(await supabase.from("hifz_settings").select("*").eq("student_id", studentId).maybeSingle()));
    },
    async saveSettings(s) {
      const data = check(await supabase.from("hifz_settings")
        .upsert({ student_id: studentId, ...settingsToDb(s), updated_at: new Date().toISOString() }, { onConflict: "student_id" })
        .select("*").single());
      return settingsFromDb(data);
    },
    async listAssignments() {
      const data = check(await supabase.from("hifz_assignments").select("*").eq("student_id", studentId).order("plan_date"));
      return data.map(rowFromDb);
    },
    async insertAssignments(rows) {
      const payload = rows.map((r) => ({
        student_id: studentId,
        plan_date: r.planDate,
        activity: r.activity,
        ...patchToDb(r),
      }));
      // ignoreDuplicates → ON CONFLICT DO NOTHING on (student_id, plan_date, activity).
      check(await supabase.from("hifz_assignments").upsert(payload, { onConflict: "student_id,plan_date,activity", ignoreDuplicates: true }));
    },
    async updateAssignment(id, patch, expectedVersion) {
      const data = check(await supabase.from("hifz_assignments")
        .update({ ...patchToDb(patch), version: expectedVersion + 1, updated_at: new Date().toISOString() })
        .eq("id", id).eq("student_id", studentId).eq("version", expectedVersion)
        .select("*"));
      return data.length ? rowFromDb(data[0]) : null;
    },
  };
}

// ---------- In-memory (tests and local demo) ----------
// Mirrors the database rules: a repo only ever sees the student it was opened
// for, the (student, date, activity) key is unique, and updates need the
// current version.

export function createMemoryStore() {
  return { settings: new Map(), rows: [], nextId: 1 };
}

export function createMemoryRepo(store, studentId) {
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const own = (r) => r.studentId === studentId;
  return {
    async getSettings() {
      const s = store.settings.get(studentId);
      return s ? clone(s) : null;
    },
    async saveSettings(s) {
      store.settings.set(studentId, clone(s));
      return clone(s);
    },
    async listAssignments() {
      return clone(store.rows.filter(own).sort((a, b) => (a.planDate < b.planDate ? -1 : 1)));
    },
    async insertAssignments(rows) {
      for (const r of rows) {
        if (store.rows.some((x) => own(x) && x.planDate === r.planDate && x.activity === r.activity)) continue;
        store.rows.push({ ...clone(r), id: `a${store.nextId++}`, studentId, version: 0 });
      }
    },
    async updateAssignment(id, patch, expectedVersion) {
      const row = store.rows.find((r) => r.id === id);
      if (!row || !own(row)) throw new Error("Not allowed: that record belongs to another student.");
      if (row.version !== expectedVersion) return null;
      Object.assign(row, clone(patch), { version: row.version + 1 });
      return clone(row);
    },
  };
}
