// Teacher-planned Hifz: pure calculations, no database or UI.
//
// The teacher sets tasks — New Hifz, Short or Long Muraja'ah over a
// [start, end) portion in half-line units (see quran.js) for a day — and the
// student ticks them done. A student's memorisation is what the teacher
// recorded as already memorised (profile.memorized) plus every completed
// New Hifz task.
//
// task:    { id, taskDate, activity, start, end, startAyah, endAyah, notes, completedAt, studentDoneAt, createdAt }
//          startAyah/endAyah (1–6236, both included, or null): the ayahs the
//          teacher tapped on the Mushaf; start/end are then worked out from them.
//          studentDoneAt: the student says they've finished; completedAt: the
//          teacher listened and approved (only then is it done and the next one set).
//          New Hifz comes from the plan; Short and Long Muraja'ah only from the
//          teacher (picked, or marked on the Mushaf).
// profile: the plan the teacher sets —
//   { memorized: [[s, e], …], direction: "forward" | "juz_reverse", startUnit, newUnits }
//   newUnits: how much New Hifz a day (half-line units; 30 = a page).
//   direction/startUnit: where the Hifz starts and which way it goes (on to
//   the end, or juz by juz towards the front; see directionFor); it orders
//   New Hifz and tells which pages were memorised most recently.
// goalYear: the year the student wants to finish by (the student sets it).
// mistake: { id, page, line, verseKey, position, wordText, note, taskId, correctedAt, createdAt }

import { TOTAL_UNITS, UNITS_PER_PAGE, UNITS_PER_LINE, unitToPage, pageToUnit } from "./quran.js";
import { unitsOf, union, intersect, subtract, toSet, computeStreak, localDate, addDays, memorizedAll, newHifzSequence } from "./engine.js";
import { juzOfPage, juzEndUnit, wholeJuz } from "./quran.js";
import { countAyahs, TOTAL_AYAHS, ayahRef, SURAH_AYAH_COUNTS } from "./ayahs.js";
import { AYAH_START_LINE, AYAH_END_LINE, AYAH_START_POS, AYAH_END_POS } from "./ayahLines.js";
import { SURAHS } from "./quran.js";

// In class order: New Hifz first, then Short Muraja'ah, then Long Muraja'ah.
// Every task list (teacher, student, the shared task list) follows it.
export const ACTIVITIES = ["new", "short", "long"];
export const ACTIVITY_TITLES = { new: "New Hifz", short: "Short Muraja'ah", long: "Long Muraja'ah" };
export const TIMEZONE = "Indian/Maldives";

const byDateThenMade = (a, b) => (a.taskDate < b.taskDate ? -1 : a.taskDate > b.taskDate ? 1 : a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0);
const range = (t) => [t.start, t.end];

// The ayah on the Mushaf line holding unit `u` (quran.com's line layout):
// "start" → the first ayah on that line, "end" → the last one.
export function ayahAtLine(u, edge = "start") {
  const line = Math.floor(u / UNITS_PER_LINE);
  if (edge === "start") {
    for (let n = 1; n <= TOTAL_AYAHS; n++) if (AYAH_END_LINE[n - 1] >= line) return ayahRef(n);
    return ayahRef(TOTAL_AYAHS);
  }
  for (let n = TOTAL_AYAHS; n >= 1; n--) if (AYAH_START_LINE[n - 1] <= line) return ayahRef(n);
  return ayahRef(1);
}
export const ayahName = (r) => `${SURAHS[r.surah - 1].name} ${r.ayah}`;

// The position of an ayah: the start of the line it starts on ("start"), or
// the start of the line it ends on ("end", for a portion's last line).
const SURAH_FIRST_AYAH = SURAH_AYAH_COUNTS.reduce((acc, n, i) => [...acc, acc[i] + n], [1]);
export function unitOfAyah(surah, ayah, edge = "start") {
  const n = SURAH_FIRST_AYAH[surah - 1] + Math.min(Math.max(1, ayah), SURAH_AYAH_COUNTS[surah - 1]) - 1;
  return (edge === "end" ? AYAH_END_LINE[n - 1] : AYAH_START_LINE[n - 1]) * UNITS_PER_LINE;
}

// ---------- whole surahs ----------

// Where each surah is in the Mushaf, in half-line units: from the end of the
// surah before it (so its heading lines count with it) to the end of its last
// ayah. The 114 surahs tile the Mushaf with no gaps or overlaps, so
// neighbouring surahs join into one range and a run of surahs that starts at
// a juz (Al-Mulk, An-Naba…) is exactly those juz.
const endOfAyah = (n) => Math.ceil(AYAH_END_POS[n - 1] * UNITS_PER_LINE - 1e-6);
export const SURAH_START_UNIT = SURAH_FIRST_AYAH.slice(0, 114).map((first, i) => (i === 0 ? 0 : endOfAyah(first - 1)));
export const surahRange = (n) => [SURAH_START_UNIT[n - 1], n < 114 ? SURAH_START_UNIT[n] : TOTAL_UNITS];
// Surahs a to b (either order), both included.
export const surahsRange = (a, b) => [surahRange(Math.min(a, b))[0], surahRange(Math.max(a, b))[1]];

// Surah numbers → runs of neighbouring surahs: [67, 78, 79, 80] → [[67, 67], [78, 80]].
export function surahRuns(numbers) {
  const runs = [];
  for (const n of [...new Set(numbers)].sort((a, b) => a - b)) {
    const last = runs[runs.length - 1];
    if (last && n === last[1] + 1) last[1] = n;
    else runs.push([n, n]);
  }
  return runs;
}
// "Al-Mulk" / "An-Naba – An-Nas" for a run.
export const describeSurahRun = ([a, b]) => (a === b ? SURAHS[a - 1].name : `${SURAHS[a - 1].name} – ${SURAHS[b - 1].name}`);

const sameSet = (a, b) => a.length === b.length && a.every((r, i) => r[0] === b[i][0] && r[1] === b[i][1]);

// What the memorised part of a plan is made of, for the plan editor: whole
// juz from the front or the back of the Quran ({ side: "first" | "last",
// count: 0–30 }) plus whole surahs outside them, as runs of neighbouring
// surahs ([[67, 67], [78, 114]]). The most juz that fit are taken first.
// null when it's made of something else (e.g. pages from an old plan).
export function memorizedParts(memorized) {
  const mem = toSet(memorized || []);
  if (!mem.length) return { side: "first", count: 0, surahs: [] };
  const inside = (r, set) => unitsOf(subtract([r], set)) === 0;
  for (let count = 30; count >= 0; count--) {
    for (const side of count > 0 && count < 30 ? ["first", "last"] : ["first"]) {
      const juz = count ? [wholeJuz(side, count)] : [];
      if (count && !inside(juz[0], mem)) continue;
      const nums = [];
      for (let n = 1; n <= 114; n++) {
        const r = surahRange(n);
        if (inside(r, mem) && !(count && inside(r, juz))) nums.push(n);
      }
      if (sameSet(union(juz, nums.map(surahRange)), mem)) return { side, count, surahs: surahRuns(nums) };
    }
  }
  return null;
}

// ---------- portions marked on the Mushaf, by ayah ----------

// "2:255" ↔ 1–6236.
export const ayahNumber = (verseKey) => {
  const [s, a] = String(verseKey).split(":").map(Number);
  return SURAH_FIRST_AYAH[s - 1] + a - 1;
};
export const verseKeyOf = (n) => { const r = ayahRef(n); return `${r.surah}:${r.ayah}`; };

// The portion from ayah `a` to ayah `b` (1–6236, both included, either
// order) in half-line units: from the half-line the first ayah starts in to
// the end of the half-line the last one ends in.
export function ayahPortion(a, b) {
  const first = Math.min(a, b), last = Math.max(a, b);
  const start = Math.floor(AYAH_START_POS[first - 1] * UNITS_PER_LINE + 1e-6);
  const end = Math.min(TOTAL_UNITS, Math.max(start + 1, Math.ceil(AYAH_END_POS[last - 1] * UNITS_PER_LINE - 1e-6)));
  return { start, end, startAyah: first, endAyah: last };
}

// The ayah numbers to colour on the Mushaf for portions marked by ayah:
// { "2:6": "new", "2:10": "new", "2:1": "short", … } ("both" when one ayah
// is a New Hifz and a Short Muraja'ah start or end).
export function ayahMarksOf(portions) {
  const marks = {};
  const put = (n, kind) => {
    if (!n) return;
    const k = verseKeyOf(n);
    marks[k] = marks[k] && marks[k] !== kind ? "both" : kind;
  };
  for (const p of portions) {
    if (!p) continue;
    put(p.startAyah, p.activity);
    put(p.endAyah ?? (p.open ? null : p.startAyah), p.activity);
  }
  return marks;
}

// "Al-A'raf 58 – 67" / "Al-A'raf 200 – Al-Anfal 5" for a portion: a task (or
// { start, end, startAyah, endAyah }) or a [start, end) range. Exact for a
// portion marked by ayah; otherwise from the lines it starts and ends on.
export function describeAyahs(portion) {
  const p = Array.isArray(portion) ? { start: portion[0], end: portion[1] } : portion;
  const a = p.startAyah ? ayahRef(p.startAyah) : ayahAtLine(p.start, "start");
  const b = p.endAyah ? ayahRef(p.endAyah) : ayahAtLine(p.end - 1, "end");
  if (a.surah !== b.surah) return `${ayahName(a)} – ${ayahName(b)}`;
  return a.ayah === b.ayah ? ayahName(a) : `${ayahName(a)} – ${b.ayah}`;
}

// Pages a task covers.
export const taskPages = (t) => {
  const pages = [];
  for (let p = unitToPage(t.start); p <= unitToPage(t.end - 1); p++) pages.push(p);
  return pages;
};

// Where each path starts when the teacher hasn't picked the exact page.
export const PATH_STARTS = { forward: pageToUnit(2), juz_reverse: pageToUnit(582) };
export const DEFAULT_PLAN = { memorized: [], direction: "forward", startUnit: null, newUnits: UNITS_PER_PAGE };
export const planOf = (profile) => ({ ...DEFAULT_PLAN, ...(profile || {}) });

// Which way New Hifz goes from where the student starts: on to the end of the
// Quran, or juz by juz towards the front (the usual Juz Amma path) when there
// is nothing left after the start's juz — it's in Juz 30, or everything after
// it is memorised already (e.g. Juz 29–30 known, starting in Juz 28).
export function directionFor(startUnit, memorized = []) {
  const juz = juzOfPage(unitToPage(startUnit));
  if (juz === 30) return "juz_reverse";
  return unitsOf(subtract([[juzEndUnit(juz), TOTAL_UNITS]], memorized)) === 0 ? "juz_reverse" : "forward";
}

// The New Hifz path in order (see engine.newHifzSequence).
export const hifzPath = (profile) => {
  const plan = planOf(profile);
  return newHifzSequence({ direction: plan.direction, startUnit: plan.startUnit ?? PATH_STARTS[plan.direction] ?? PATH_STARTS.forward });
};

// The starting point from a student's old self-made plan, if they had one.
export function legacyProfile(legacy) {
  if (!legacy?.settings) return null;
  const s = legacy.settings;
  return {
    memorized: memorizedAll(s, legacy.rows || []), goalYear: s.goalYear, fromLegacy: true,
    direction: s.direction, startUnit: s.startUnit,
  };
}

export function memorizedRanges(profile, tasks) {
  return union(profile?.memorized || [], ...tasks.filter((t) => t.activity === "new" && t.completedAt).map((t) => [range(t)]));
}

// Ranges of an activity completed in the `days` days up to today.
function revisedSince(tasks, activity, today, days, timezone) {
  const from = addDays(today, -(days - 1));
  return toSet(tasks
    .filter((t) => t.activity === activity && t.completedAt && localDate(new Date(t.completedAt), timezone) >= from)
    .map(range));
}

export function summarizeHifz({ profile, tasks, mistakes = [], goalYear = null }, today, timezone = TIMEZONE) {
  const sorted = [...tasks].sort(byDateThenMade);
  const memorized = memorizedRanges(profile, sorted);
  const memorizedUnits = unitsOf(memorized);
  const ayahs = countAyahs(memorized);
  const order = (t) => ACTIVITIES.indexOf(t.activity);
  const byActivity = (a, b) => order(a) - order(b) || byDateThenMade(a, b);
  // Streak: a day on which at least one task was ticked done.
  const doneDays = sorted.filter((t) => t.completedAt).map((t) => ({ status: "completed", planDate: localDate(new Date(t.completedAt), timezone) }));
  const longRevised = intersect(revisedSince(sorted, "long", today, 30, timezone), memorized);
  return {
    profile,
    today,
    tasks: sorted,
    todayTasks: sorted.filter((t) => t.taskDate === today).sort(byActivity),
    overdue: sorted.filter((t) => t.taskDate < today && !t.completedAt).sort(byActivity),
    // Finished by the student, waiting for the teacher to listen and approve.
    toCheck: sorted.filter((t) => t.studentDoneAt && !t.completedAt).sort(byActivity),
    upcoming: sorted.filter((t) => t.taskDate > today).sort(byDateThenMade),
    recentDone: sorted.filter((t) => t.completedAt && t.taskDate < today).reverse().slice(0, 10),
    memorized,
    stats: {
      memorizedUnits,
      remainingUnits: TOTAL_UNITS - memorizedUnits,
      ayahs,
      percent: Math.floor((ayahs / TOTAL_AYAHS) * 1000) / 10,
      goalYear: goalYear ?? profile?.goalYear ?? null,
      shortWeekUnits: unitsOf(revisedSince(sorted, "short", today, 7, timezone)),
      longMonthUnits: unitsOf(longRevised),
      longMonthPercent: memorizedUnits ? Math.round((unitsOf(longRevised) / memorizedUnits) * 100) : 0,
    },
    streak: computeStreak(doneDays, today),
    mistakes,
    openMistakes: mistakes.filter((m) => !m.correctedAt),
    hasProfile: !!profile,
    hasGoal: (goalYear ?? profile?.goalYear) != null,
  };
}

// A class's task list to share as an image: for each student (A–Z), the
// next task not done yet of each of New Hifz, Short and Long Muraja'ah, as
// "Al-Baqarah 23 – 34". `tasksOf(student)` gives that student's tasks.
// `date` is the day most of the tasks are for; a task for another day keeps
// its own `date`. A part the teacher isn't giving at the student's class (its
// Given switch off: moved to a later day than the student's other parts) is
// left out.
export const SHEET_LABELS = { new: "Hifz", short: "Short Muraja'ah", long: "Long Muraja'ah" };
export function classTaskSheet(students, tasksOf) {
  const rows = [...students].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })).map((s) => {
    const open = [...(tasksOf(s) || [])].filter((t) => !t.completedAt).sort(byDateThenMade);
    const items = ACTIVITIES.map((activity) => {
      const t = open.find((x) => x.activity === activity);
      return { activity, label: SHEET_LABELS[activity], text: t ? describeAyahs(t) : null, date: t?.taskDate || null };
    });
    return { name: s.name, items };
  });
  const counts = new Map();
  for (const r of rows) for (const i of r.items) if (i.date) counts.set(i.date, (counts.get(i.date) || 0) + 1);
  const date = [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] || null;
  for (const r of rows) {
    // The student's class day: their soonest part, a late one counting as the class's day.
    const day = r.items.filter((i) => i.date).map((i) => (date && i.date < date ? date : i.date)).sort()[0];
    r.items = r.items.filter((i) => !i.date || i.date <= day);
  }
  for (const r of rows) for (const i of r.items) if (i.date === date) i.date = null;
  return { date, rows };
}

// The teacher's task list: the tasks not done yet, always New Hifz, Short then
// Long Muraja'ah (then by day), so an approved task's next one takes its
// place and nothing moves around. Done tasks are in History.
export function teacherTaskList(tasks) {
  const order = (t) => ACTIVITIES.indexOf(t.activity);
  return tasks.filter((t) => !t.completedAt).sort((a, b) => order(a) - order(b) || byDateThenMade(a, b));
}

// Open mistakes inside a task's portion (by the word's line; older marks
// without a line count for their whole page).
export const mistakeInTask = (m, task) => {
  if (!m.line) return taskPages(task).includes(m.page);
  const u = pageToUnit(m.page, m.line);
  return u < task.end && u + UNITS_PER_LINE > task.start;
};
export const mistakesForTask = (task, mistakes) => mistakes.filter((m) => !m.correctedAt && mistakeInTask(m, task));

// ---------- New Hifz from the plan ----------
// Only New Hifz is worked out from the student's plan. Short and Long
// Muraja'ah are whatever the teacher sets: picked by surah, ayah and page, or
// marked on the Mushaf (see MANUAL_ACTIVITIES).

export const PLANNED_ACTIVITIES = ["new"];
export const MANUAL_ACTIVITIES = ["short", "long"];

const lastOf = (tasks, activity) => tasks.filter((t) => t.activity === activity).sort(byDateThenMade).pop() || null;

// The New Hifz that naturally comes next: the next part of the Hifz path
// that is neither memorised nor already set, the same size as the plan's
// New Hifz a day (1 page at first); if the last New Hifz was due (today or
// before) and isn't done, the same part again. null for Short and Long
// Muraja'ah, which the teacher sets.
export function suggestPortion(activity, tasks, memorized, profile = null, today = null) {
  if (activity !== "new") return null;
  const plan = planOf(profile);
  const last = lastOf(tasks, activity);
  if (last && today && !last.completedAt && last.taskDate <= today) return { start: last.start, end: last.end, repeat: true };
  const size = plan.newUnits || UNITS_PER_PAGE;
  const set = tasks.filter((t) => t.activity === "new").map(range);
  const left = subtract(hifzPath(plan), union(memorized, set));
  if (!left.length) return null;
  const [s, e] = left[0];
  return { start: s, end: Math.min(s + size, e) };
}

// ---------- class days (from the timetable) ----------

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const weekdayOf = (d) => WEEKDAYS[new Date(`${d}T00:00:00Z`).getUTCDay()];

// The student's next class day after `after` (or on it, with `orSame`). With
// no class days known, simply the next day.
export function nextClassDay(schedule, after, orSame = false) {
  const days = schedule?.days || [];
  if (!days.length) return orSame ? after : addDays(after, 1);
  for (let i = orSame ? 0 : 1; i <= 7; i++) {
    const d = addDays(after, i);
    if (days.includes(weekdayOf(d))) return d;
  }
  return addDays(after, 1);
}

// The day new tasks most likely belong to: the next class day, or today when
// today is a class day that has nothing set yet.
export function suggestDate(tasks, today, schedule = null) {
  return tasks.some((t) => t.taskDate === today) ? nextClassDay(schedule, today) : nextClassDay(schedule, today, true);
}

// ---------- tasks generated from the plan ----------

// Tasks to create: when New Hifz has no open (not done) task, the next one
// from the plan on the student's next class day — today, if today is a class
// day and the last one was before today. `drafts` (by activity) are the
// teacher's confirmed next tasks; for Short and Long Muraja'ah they are the
// only thing set (nothing comes from the plan).
export function nextTasksToSet({ tasks, memorized, profile, today, schedule = null, drafts = {} }) {
  const out = [];
  let all = [...tasks];
  for (const a of ACTIVITIES) {
    if (all.some((t) => t.activity === a && !t.completedAt)) continue;
    const last = lastOf(all, a);
    const day = last && last.taskDate >= today ? nextClassDay(schedule, last.taskDate) : nextClassDay(schedule, today, true);
    const d = drafts[a];
    const p = d || suggestPortion(a, all, memorized, profile, today);
    if (!p) continue;
    const row = { activity: a, taskDate: d?.taskDate || day, start: p.start, end: p.end, notes: d?.notes || "" };
    if (d?.startAyah) Object.assign(row, { startAyah: d.startAyah, endAyah: d.endAyah });
    out.push(row);
    all = [...all, { ...row, id: `planned-${a}`, completedAt: null, createdAt: "~" }];
  }
  return out;
}

// What comes after an open task if today's part is done: the next class
// day's task for the same activity (as if that day's open tasks were done).
export function previewNext(task, { tasks, memorized, profile, today, schedule = null }) {
  const sim = tasks.map((t) => (!t.completedAt && t.taskDate <= task.taskDate ? { ...t, completedAt: "~" } : t));
  const mem = union(memorized, ...sim.filter((t) => t.activity === "new" && t.completedAt === "~").map((t) => [range(t)]));
  return nextTasksToSet({ tasks: sim, memorized: mem, profile, today: task.taskDate > today ? task.taskDate : today, schedule })
    .find((r) => r.activity === task.activity) || null;
}
