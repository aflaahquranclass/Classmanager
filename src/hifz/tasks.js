// Teacher-planned Hifz: pure calculations, no database or UI.
//
// The teacher sets tasks — New Hifz, Short or Long Muraja'ah over a
// [start, end) portion in half-line units (see quran.js) for a day — and the
// student ticks them done. A student's memorisation is what the teacher
// recorded as already memorised (profile.memorized) plus every completed
// New Hifz task.
//
// task:    { id, taskDate, activity, start, end, notes, completedAt, studentDoneAt, createdAt }
//          studentDoneAt: the student says they've finished; completedAt: the
//          teacher listened and approved (only then is it done and the next one set).
// profile: the plan the teacher sets —
//   { memorized: [[s, e], …], direction: "forward" | "juz_reverse", startUnit,
//     newUnits, shortPages, longStartUnit, longMode: "juz" | "pages", longPages }
//   newUnits: how much New Hifz a day (half-line units; 30 = a page).
//   direction/startUnit: where the Hifz starts and which way it goes (on to
//   the end, or juz by juz towards the front; see directionFor); it orders
//   New Hifz and tells which pages were memorised most recently.
// goalYear: the year the student wants to finish by (the student sets it).
// mistake: { id, page, line, verseKey, position, wordText, note, taskId, correctedAt, createdAt }

import { TOTAL_UNITS, UNITS_PER_PAGE, UNITS_PER_LINE, unitToPage, pageToUnit } from "./quran.js";
import { unitsOf, union, intersect, subtract, toSet, computeStreak, localDate, addDays, memorizedAll, newHifzSequence, positionIn, takeFirst } from "./engine.js";
import { juzOfPage, juzEndUnit, JUZ_START_PAGES } from "./quran.js";
import { countAyahs, TOTAL_AYAHS, ayahRef, SURAH_AYAH_COUNTS } from "./ayahs.js";
import { AYAH_START_LINE, AYAH_END_LINE } from "./ayahLines.js";
import { SURAHS } from "./quran.js";

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

// "Al-A'raf 58 – 67" / "Al-A'raf 200 – Al-Anfal 5" for a [start, end) portion.
export function describeAyahs([s, e]) {
  const a = ayahAtLine(s, "start");
  const b = ayahAtLine(e - 1, "end");
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
export const DEFAULT_PLAN = { memorized: [], direction: "forward", startUnit: null, newUnits: UNITS_PER_PAGE, shortPages: 1, longStartUnit: null, longMode: "juz", longPages: 2 };
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
    direction: s.direction, startUnit: s.startUnit, shortPages: s.shortTarget / UNITS_PER_PAGE,
    longStartUnit: s.longStartUnit, longMode: "pages", longPages: s.longTarget / UNITS_PER_PAGE,
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

// Open mistakes inside a task's portion (by the word's line; older marks
// without a line count for their whole page).
export const mistakeInTask = (m, task) => {
  if (!m.line) return taskPages(task).includes(m.page);
  const u = pageToUnit(m.page, m.line);
  return u < task.end && u + UNITS_PER_LINE > task.start;
};
export const mistakesForTask = (task, mistakes) => mistakes.filter((m) => !m.correctedAt && mistakeInTask(m, task));

// ---------- suggestions for the teacher's next task ----------
// Worked out from the student's plan, so the teacher only adjusts when needed.

const lastOf = (tasks, activity) => tasks.filter((t) => t.activity === activity).sort(byDateThenMade).pop() || null;

// The portion that naturally comes next for an activity:
//  new   — the next part of the Hifz path that is neither memorised nor
//          already set, the same size as the last New Hifz (1 page at first);
//          if the last New Hifz was due (today or before) and isn't done, the
//          same part again;
//  short — the plan's number of Short Muraja'ah pages straight before the
//          New Hifz (e.g. New Hifz Al-A'raf 58–67 with 4 pages → Al-A'raf
//          31–57): the most recently memorised part of the path;
//  long  — from where Long Muraja'ah is up to (the plan's start, then the
//          end of the last Long Muraja'ah) to the end of that juz, or the
//          plan's number of pages; only memorised pages, wrapping back to the
//          beginning after the last. Not done when due → the same part again.
export function suggestPortion(activity, tasks, memorized, profile = null, today = null) {
  const plan = planOf(profile);
  const path = hifzPath(plan);
  const last = lastOf(tasks, activity);
  // Today's results: a part that was due and isn't done comes again.
  if (last && today && activity !== "short" && !last.completedAt && last.taskDate <= today) return { start: last.start, end: last.end, repeat: true };
  if (activity === "new") {
    const size = plan.newUnits || UNITS_PER_PAGE;
    const set = tasks.filter((t) => t.activity === "new").map(range);
    const left = subtract(path, union(memorized, set));
    if (!left.length) return null;
    const [s, e] = left[0];
    return { start: s, end: Math.min(s + size, e) };
  }
  if (activity === "short") {
    // Before the New Hifz that's set and not done yet, else the one that comes next.
    const openNew = tasks.filter((t) => t.activity === "new" && !t.completedAt).sort(byDateThenMade)[0];
    const next = openNew || suggestPortion("new", tasks, memorized, plan, today);
    return shortBefore(next ? next.start : null, memorized, plan);
  }
  if (!memorized.length) return null;
  let pos = last ? last.end : plan.longStartUnit ?? memorized[0][0];
  // Only memorised pages; back to the beginning after the last one.
  const block = memorized.find(([, e]) => e > pos) || memorized[0];
  pos = Math.max(pos, block[0]);
  if (pos >= block[1]) pos = block[0];
  const end = plan.longMode === "pages"
    ? Math.min(pos + Math.round(plan.longPages * UNITS_PER_PAGE), block[1])
    : Math.min(juzEndUnit(juzOfPage(unitToPage(pos))), block[1]);
  return { start: pos, end: Math.max(end, pos + UNITS_PER_LINE) };
}

// Short Muraja'ah for a New Hifz starting at `newStart`: the plan's number of
// pages straight before it — e.g. New Hifz Al-A'raf 58–67 with 4 pages →
// Al-A'raf 31–57. On the An-Naba path the New Hifz at the start of a juz is
// preceded by the end of the juz memorised before it (Juz 29 p. 562 → the end
// of Juz 30); otherwise it's simply the pages before it in the Mushaf.
// Without a New Hifz: the end of what's memorised along the path.
export function shortBefore(newStart, memorized, profile = null) {
  const plan = planOf(profile);
  const size = Math.round(plan.shortPages * UNITS_PER_PAGE);
  if (newStart != null) {
    let end = newStart;
    if (plan.direction === "juz_reverse") {
      // At the very start of a juz on the An-Naba path, the pages before it
      // on the path are the end of the following juz.
      const path = hifzPath(plan);
      const pos = positionIn(path, newStart);
      const before = pos ? takeFirst(path, pos)[0].filter(([s, e]) => e > s) : [];
      const last = before[before.length - 1];
      if (last && last[1] !== newStart) end = last[1];
      else if (!last) {
        // The very start of the path, at the start of a juz (e.g. Juz 28 with
        // Juz 29–30 memorised before): the end of the juz after it, if known.
        const j = juzOfPage(unitToPage(newStart));
        const after = juzEndUnit(j + 1);
        if (j < 30 && newStart === pageToUnit(JUZ_START_PAGES[j - 1]) && memorized.some(([s, e]) => s < after && e >= after)) end = after;
      }
    }
    if (end <= 0) return null;
    // On the An-Naba path, stay inside the juz (the juz before it isn't memorised yet).
    const floor = plan.direction === "juz_reverse" ? pageToUnit(JUZ_START_PAGES[juzOfPage(unitToPage(end - 1)) - 1]) : 0;
    return { start: Math.max(floor, end - size), end };
  }
  const onPath = intersect(hifzPath(plan), memorized);
  const latest = onPath.length ? onPath[onPath.length - 1] : memorized[memorized.length - 1];
  if (!latest) return null;
  return { start: Math.max(latest[0], latest[1] - size), end: latest[1] };
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

// Tasks to create so every activity has one waiting: for each of New Hifz,
// Short and Long Muraja'ah with no open (not done) task, the next one on the
// student's next class day — today, if today is a class day and the last one
// was before today. `drafts` (by activity) are the teacher's confirmed edits.
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

// "Next" after a task: the same activity on the student's next class day.
export function nextAfter(task, tasks, memorized, today, profile = null, schedule = null) {
  const day = nextClassDay(schedule, task.taskDate > today ? task.taskDate : today);
  const portion = suggestPortion(task.activity, tasks, memorized, profile, today);
  return portion && portion.start < TOTAL_UNITS ? { activity: task.activity, taskDate: day, ...portion } : null;
}
