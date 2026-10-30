// Teacher-planned Hifz: pure calculations, no database or UI.
//
// The teacher sets tasks — New Hifz, Short or Long Muraja'ah over a
// [start, end) portion in half-line units (see quran.js) for a day — and the
// student ticks them done. A student's memorisation is what the teacher
// recorded as already memorised (profile.memorized) plus every completed
// New Hifz task.
//
// task:    { id, taskDate, activity, start, end, notes, completedAt, createdAt }
// profile: { memorized: [[s, e], …], goalYear }
// mistake: { id, page, line, verseKey, position, wordText, note, taskId, correctedAt, createdAt }

import { TOTAL_UNITS, UNITS_PER_PAGE, UNITS_PER_LINE, unitToPage, pageToUnit } from "./quran.js";
import { unitsOf, union, intersect, toSet, computeStreak, localDate, addDays, memorizedAll } from "./engine.js";
import { countAyahs, TOTAL_AYAHS } from "./ayahs.js";

export const ACTIVITIES = ["new", "short", "long"];
export const ACTIVITY_TITLES = { new: "New Hifz", short: "Short Muraja'ah", long: "Long Muraja'ah" };
export const TIMEZONE = "Indian/Maldives";

const byDateThenMade = (a, b) => (a.taskDate < b.taskDate ? -1 : a.taskDate > b.taskDate ? 1 : a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0);
const range = (t) => [t.start, t.end];

// Pages a task covers.
export const taskPages = (t) => {
  const pages = [];
  for (let p = unitToPage(t.start); p <= unitToPage(t.end - 1); p++) pages.push(p);
  return pages;
};

// The starting point from a student's old self-made plan, if they had one.
export function legacyProfile(legacy) {
  if (!legacy?.settings) return null;
  return { memorized: memorizedAll(legacy.settings, legacy.rows || []), goalYear: legacy.settings.goalYear, fromLegacy: true };
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

export function summarizeHifz({ profile, tasks, mistakes = [] }, today, timezone = TIMEZONE) {
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
    upcoming: sorted.filter((t) => t.taskDate > today).sort(byDateThenMade),
    recentDone: sorted.filter((t) => t.completedAt && t.taskDate < today).reverse().slice(0, 10),
    memorized,
    stats: {
      memorizedUnits,
      remainingUnits: TOTAL_UNITS - memorizedUnits,
      ayahs,
      percent: Math.floor((ayahs / TOTAL_AYAHS) * 1000) / 10,
      goalYear: profile?.goalYear ?? null,
      shortWeekUnits: unitsOf(revisedSince(sorted, "short", today, 7, timezone)),
      longMonthUnits: unitsOf(longRevised),
      longMonthPercent: memorizedUnits ? Math.round((unitsOf(longRevised) / memorizedUnits) * 100) : 0,
    },
    streak: computeStreak(doneDays, today),
    mistakes,
    openMistakes: mistakes.filter((m) => !m.correctedAt),
    hasProfile: !!profile,
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

const DEFAULT_SIZE = { new: UNITS_PER_PAGE, short: UNITS_PER_PAGE, long: 2 * UNITS_PER_PAGE };
const lastOf = (tasks, activity) => tasks.filter((t) => t.activity === activity).sort(byDateThenMade).pop() || null;
const clampEnd = (start, size) => Math.min(TOTAL_UNITS, start + size);

// The portion that naturally comes next for an activity:
//  new   — straight after the last New Hifz task (skipping anything already
//          memorised), the same size;
//  short — the most recently memorised portion, the same size as last time
//          (or the last revision again while nothing new is done yet);
//  long  — carries on after the last Long Muraja'ah, back to the start of
//          what's memorised once it passes the end.
export function suggestPortion(activity, tasks, memorized) {
  const last = lastOf(tasks, activity);
  const size = last ? last.end - last.start : DEFAULT_SIZE[activity];
  const memEnd = memorized.length ? memorized[memorized.length - 1][1] : 0;
  if (activity === "new") {
    let start = last ? last.end : memEnd || pageToUnit(2);
    for (const [s, e] of memorized) if (start >= s && start < e) start = e;
    if (start >= TOTAL_UNITS) return null;
    const next = memorized.find(([s]) => s > start);
    return { start, end: Math.min(clampEnd(start, size), next ? next[0] : TOTAL_UNITS) };
  }
  if (activity === "short") {
    const lastNew = lastOf(tasks.filter((t) => t.completedAt), "new");
    if (!lastNew && last) return { start: last.start, end: last.end };
    const end = lastNew ? lastNew.end : memEnd;
    if (!end) return null;
    return { start: Math.max(0, end - size), end };
  }
  if (!memorized.length) return null;
  let start = last ? last.end : memorized[0][0];
  // Skip forward to memorised pages; wrap to the beginning after the last one.
  const next = memorized.find(([s, e]) => e > start);
  start = next ? Math.max(start, next[0]) : memorized[0][0];
  return { start, end: clampEnd(start, size) };
}

// The day a new task most likely belongs to: tomorrow if today already has
// tasks, otherwise today.
export function suggestDate(tasks, today) {
  return tasks.some((t) => t.taskDate === today) ? addDays(today, 1) : today;
}

// "Next" after a task: the same activity on the following day.
export function nextAfter(task, tasks, memorized, today) {
  const day = addDays(task.taskDate > today ? task.taskDate : today, 1);
  const portion = task.activity === "new"
    ? suggestPortion("new", [task], memorized)
    : suggestPortion(task.activity, tasks, memorized);
  return portion && portion.start < TOTAL_UNITS ? { activity: task.activity, taskDate: day, ...portion } : null;
}
