// Teacher-planned Hifz: pure calculations, no database or UI.
//
// The teacher sets tasks — New Hifz, Short or Long Muraja'ah over a
// [start, end) portion in half-line units (see quran.js) for a day — and the
// student ticks them done. A student's memorisation is what the teacher
// recorded as already memorised (profile.memorized) plus every completed
// New Hifz task.
//
// task:    { id, taskDate, activity, start, end, notes, completedAt, createdAt }
// profile: the plan the teacher sets —
//   { memorized: [[s, e], …], direction: "forward" | "juz_reverse", startUnit,
//     shortPages, longStartUnit, longMode: "juz" | "pages", longPages }
//   direction/startUnit: where the Hifz started (Al-Baqarah onward, or
//   An-Naba juz by juz towards the front); it orders New Hifz and tells which
//   pages were memorised most recently.
// goalYear: the year the student wants to finish by (the student sets it).
// mistake: { id, page, line, verseKey, position, wordText, note, taskId, correctedAt, createdAt }

import { TOTAL_UNITS, UNITS_PER_PAGE, UNITS_PER_LINE, unitToPage, pageToUnit } from "./quran.js";
import { unitsOf, union, intersect, subtract, toSet, computeStreak, localDate, addDays, memorizedAll, newHifzSequence } from "./engine.js";
import { juzOfPage, juzEndUnit } from "./quran.js";
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

// Where each path starts when the teacher hasn't picked the exact page.
export const PATH_STARTS = { forward: pageToUnit(2), juz_reverse: pageToUnit(582) };
export const DEFAULT_PLAN = { memorized: [], direction: "forward", startUnit: null, shortPages: 1, longStartUnit: null, longMode: "juz", longPages: 2 };
export const planOf = (profile) => ({ ...DEFAULT_PLAN, ...(profile || {}) });

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
//  short — the student's most recently memorised pages along the path, as
//          many as the plan's Short Muraja'ah pages;
//  long  — from where Long Muraja'ah is up to (the plan's start, then the
//          end of the last Long Muraja'ah) to the end of that juz, or the
//          plan's number of pages; only memorised pages, wrapping back to the
//          beginning after the last.
export function suggestPortion(activity, tasks, memorized, profile = null) {
  const plan = planOf(profile);
  const path = hifzPath(plan);
  const last = lastOf(tasks, activity);
  if (activity === "new") {
    const size = last ? last.end - last.start : UNITS_PER_PAGE;
    const set = tasks.filter((t) => t.activity === "new").map(range);
    const left = subtract(path, union(memorized, set));
    if (!left.length) return null;
    const [s, e] = left[0];
    return { start: s, end: Math.min(s + size, e) };
  }
  if (activity === "short") {
    const size = Math.round(plan.shortPages * UNITS_PER_PAGE);
    const onPath = intersect(path, memorized);
    const latest = onPath.length ? onPath[onPath.length - 1] : memorized[memorized.length - 1];
    if (!latest) return null;
    return { start: Math.max(latest[0], latest[1] - size), end: latest[1] };
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

// The day a new task most likely belongs to: tomorrow if today already has
// tasks, otherwise today.
export function suggestDate(tasks, today) {
  return tasks.some((t) => t.taskDate === today) ? addDays(today, 1) : today;
}

// "Next" after a task: the same activity on the following day.
export function nextAfter(task, tasks, memorized, today, profile = null) {
  const day = addDays(task.taskDate > today ? task.taskDate : today, 1);
  const portion = suggestPortion(task.activity, tasks, memorized, profile);
  return portion && portion.start < TOTAL_UNITS ? { activity: task.activity, taskDate: day, ...portion } : null;
}
