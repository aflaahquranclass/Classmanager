// Hifz Tracker scheduling engine — pure functions, no database or UI.
//
// Positions are integer half-line units (see quran.js). Work is described by
// *ordered* range lists: arrays of [start, end) pairs kept in the order the
// student should do them (pending work first, then new portions).
//
// Core rule: the units assigned for one activity on one day never exceed that
// activity's daily target. Unfinished work is carried forward as a backlog and
// takes priority inside the limit; new portions only fill leftover capacity,
// so falling behind shifts the schedule later instead of adding work.

import { TOTAL_UNITS, UNITS_PER_PAGE, UNITS_PER_LINE, juzOfPage, juzStartUnit, juzEndUnit, unitToPage } from "./quran.js";

export const ACTIVITIES = ["new", "short", "long"];

export const NEW_TARGET_OPTIONS = [
  { units: 5 * UNITS_PER_LINE, label: "5 lines" },
  { units: UNITS_PER_PAGE / 2, label: "½ page" },
  { units: UNITS_PER_PAGE, label: "1 page" },
  { units: UNITS_PER_PAGE * 1.5, label: "1½ pages" },
  { units: UNITS_PER_PAGE * 2, label: "2 pages" },
];
export const SHORT_TARGET_OPTIONS = [1, 2, 3, 4].map((p) => ({ units: p * UNITS_PER_PAGE, label: `${p} page${p > 1 ? "s" : ""}` }));

// ---------- range-list helpers ----------

export const unitsOf = (list) => list.reduce((n, [s, e]) => n + (e - s), 0);

// Sorted, merged copy (a "set" of units).
export function toSet(list) {
  const sorted = list.filter(([s, e]) => e > s).map((r) => [...r]).sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else out.push(r);
  }
  return out;
}

export const union = (...lists) => toSet(lists.flat());

// Remove every unit in `remove` from `list`, keeping the order of `list`.
export function subtract(list, remove) {
  const set = toSet(remove);
  const out = [];
  for (const [s0, e0] of list) {
    let s = s0;
    for (const [rs, re] of set) {
      if (re <= s) continue;
      if (rs >= e0) break;
      if (rs > s) out.push([s, Math.min(rs, e0)]);
      s = Math.max(s, re);
      if (s >= e0) break;
    }
    if (s < e0) out.push([s, e0]);
  }
  return out;
}

// Keep only units of `list` that are in `keep`, in the order of `list`.
export function intersect(list, keep) {
  const set = toSet(keep);
  const out = [];
  for (const [s, e] of list) {
    for (const [ks, ke] of set) {
      const a = Math.max(s, ks);
      const b = Math.min(e, ke);
      if (a < b) out.push([a, b]);
    }
  }
  return out;
}

// First n units of an ordered list → [taken, rest].
export function takeFirst(list, n) {
  const taken = [];
  const rest = [];
  let need = Math.max(0, n);
  for (const [s, e] of list) {
    if (need <= 0) { rest.push([s, e]); continue; }
    const len = e - s;
    if (len <= need) { taken.push([s, e]); need -= len; }
    else { taken.push([s, s + need]); rest.push([s + need, e]); need = 0; }
  }
  return [taken, rest];
}

// Units at positions [from, to) of an ordered list.
function slice(list, from, to) {
  return takeFirst(takeFirst(list, from)[1], to - from)[0];
}

// ---------- dates (student's timezone) ----------

export function localDate(date, timeZone) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
const dayMs = 86400000;
const toUtc = (d) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export const diffDays = (from, to) => Math.round((toUtc(to) - toUtc(from)) / dayMs);
export const addDays = (d, n) => new Date(toUtc(d) + n * dayMs).toISOString().slice(0, 10);

// ---------- memorization sequence ----------

// Ordered list covering the whole New Hifz path.
//  forward:     startUnit → end of the Mushaf (e.g. from Al-Baqarah).
//  juz_reverse: startUnit → end of its juz, then each earlier juz front to back
//               (the usual Juz Amma path: An-Naba → An-Nas, then Al-Mulk → …).
export function newHifzSequence({ startUnit, direction }) {
  if (direction !== "juz_reverse") return [[startUnit, TOTAL_UNITS]];
  const j = juzOfPage(unitToPage(startUnit));
  const seq = [[startUnit, juzEndUnit(j)]];
  for (let k = j - 1; k >= 1; k--) seq.push([juzStartUnit(k), juzEndUnit(k)]);
  return seq;
}

// Position (count of units walked) of `unit` in an ordered list, or null.
export function positionIn(list, unit) {
  let acc = 0;
  for (const [s, e] of list) {
    if (unit >= s && unit <= e) return acc + (unit - s);
    acc += e - s;
  }
  return null;
}

// What the student had memorized along the New Hifz path at setup / last edit:
// everything from startUnit up to (not including) currentUnit.
export function baselineMemorized(settings) {
  const seq = newHifzSequence(settings);
  const pos = positionIn(seq, settings.currentUnit);
  return pos == null ? [] : slice(seq, 0, pos);
}

export const targetFor = (settings, activity) =>
  activity === "new" ? settings.newTarget : activity === "short" ? settings.shortTarget : settings.longTarget;

export function memorizedNew(settings, rows) {
  return union(baselineMemorized(settings), ...rows.filter((r) => r.activity === "new").map((r) => r.completed));
}
export const memorizedAll = (settings, rows) => union(memorizedNew(settings, rows), settings.extraMemorized || []);

// Units the activity still owes after a day: that day's incoming backlog plus
// its new portions, minus what was completed. Oldest first.
export function backlogAfter(row) {
  const fresh = subtract(row.segments, row.pendingIn);
  return subtract([...row.pendingIn, ...fresh], row.completed);
}

// Revision order: Short follows the memorization path, Long follows the Mushaf.
// (Short only ever uses the newest end of this order; see latestPortion.)
function revisionOrder(activity, settings, rows) {
  if (activity === "short") return intersect(newHifzSequence(settings), memorizedNew(settings, rows));
  return memorizedAll(settings, rows);
}

function revisionCursor(activity, settings, last) {
  // A Long start edit applies to the first plan made after it.
  const overridden = activity === "long" && settings.longOverrideAt && (!last || new Date(last.plannedAt) < new Date(settings.longOverrideAt));
  if (overridden) return { cursor: settings.longStartUnit, cycle: last?.cycleAfter || 1 };
  if (last && last.cursorAfter != null) return { cursor: last.cursorAfter, cycle: last.cycleAfter || 1 };
  return { cursor: activity === "long" ? settings.longStartUnit : null, cycle: 1 };
}

function cursorPosition(order, cursor) {
  if (cursor == null) return 0;
  const pos = positionIn(order, cursor);
  if (pos != null) return pos;
  // Cursor sits on unmemorized ground (e.g. a Long start page): begin at the
  // next eligible unit after it in Mushaf order, or wrap to the beginning.
  let acc = 0;
  for (const [s, e] of order) {
    if (s >= cursor) return acc;
    acc += e - s;
  }
  return 0;
}

// Take up to n revision units from the cursor onward, wrapping around once
// (which starts a new cycle). `exclude` = units already assigned today.
function takeRevision(order, cursor, cycle, n, exclude) {
  const total = unitsOf(order);
  const idx = cursorPosition(order, cursor);
  const ahead = subtract(slice(order, idx, total), exclude);
  const behind = subtract(slice(order, 0, idx), exclude);
  const [first, afterFirst] = takeFirst(ahead, n);
  let taken = first;
  let newCycle = cycle;
  const need = n - unitsOf(first);
  // Only wrap when the stretch ahead is used up (backlog units excluded above
  // are still owed, so they don't hold the cycle open).
  if (need > 0 && unitsOf(afterFirst) === 0 && unitsOf(behind) > 0) {
    const [second] = takeFirst(behind, need);
    if (unitsOf(second)) { taken = [...first, ...second]; newCycle = cycle + 1; }
  }
  const lastRange = taken[taken.length - 1];
  return { taken, cursorAfter: lastRange ? lastRange[1] : cursor, cycleAfter: newCycle };
}

// Short Muraja'ah: the student's most recently memorized n units on their
// New Hifz path (skipping units already assigned today), in reading order.
function latestPortion(order, n, exclude) {
  const available = subtract(order, exclude);
  const total = unitsOf(available);
  return slice(available, Math.max(0, total - n), total);
}

// ---------- daily plan ----------

// Build one activity's assignment for planDate from the rows of earlier days.
// Pending work goes first (oldest first) up to the target; leftover capacity is
// filled with the next eligible portions. Never more than the target.
export function planDay({ activity, settings, priorRows, planDate, now }) {
  const rowsA = priorRows.filter((r) => r.activity === activity && r.planDate < planDate).sort((a, b) => (a.planDate < b.planDate ? -1 : 1));
  const prior = priorRows.filter((r) => r.planDate < planDate);
  const last = rowsA[rowsA.length - 1];
  const target = targetFor(settings, activity);
  const memAll = memorizedAll(settings, prior);

  let pendingIn = last ? backlogAfter(last) : [];
  if (activity === "new") pendingIn = subtract(pendingIn, memAll);
  else pendingIn = intersect(pendingIn, revisionOrder(activity, settings, prior));

  const [pendingTaken] = takeFirst(pendingIn, target);
  const room = target - unitsOf(pendingTaken);

  let fresh = [];
  let cursorAfter = null;
  let cycleAfter = 1;
  if (activity === "new") {
    const available = subtract(newHifzSequence(settings), union(memAll, pendingIn));
    [fresh] = takeFirst(available, room);
  } else if (activity === "short") {
    // Revise the latest pages memorized before today, so the window moves
    // forward as New Hifz is completed.
    fresh = room > 0 ? latestPortion(revisionOrder("short", settings, prior), room, pendingIn) : [];
  } else {
    const { cursor, cycle } = revisionCursor(activity, settings, last);
    const order = revisionOrder(activity, settings, prior);
    const r = room > 0 ? takeRevision(order, cursor, cycle, room, pendingIn) : { taken: [], cursorAfter: cursor, cycleAfter: cycle };
    fresh = r.taken;
    cursorAfter = r.cursorAfter;
    cycleAfter = r.cycleAfter;
  }

  const segments = [...pendingTaken, ...fresh];
  return {
    activity,
    planDate,
    target,
    pendingIn,
    segments,
    completed: [],
    cursorAfter,
    cycleAfter,
    status: segments.length ? "pending" : "empty",
    completedAt: null,
    plannedAt: now,
  };
}

// Record that the first `unitsDone` units of today's assignment are done
// (assignments are done in order: carried-over work first).
export function applyProgress(row, unitsDone, now) {
  const total = unitsOf(row.segments);
  const done = Math.max(0, Math.min(total, Math.round(unitsDone)));
  const [completed] = takeFirst(row.segments, done);
  const status = total === 0 ? "empty" : done === total ? "completed" : done > 0 ? "partial" : "pending";
  return { ...row, completed, status, completedAt: status === "completed" ? now : null };
}

// ---------- streaks ----------

// An active day = at least one activity fully completed that day. The streak
// survives one empty day and resets only after two full consecutive empty days.
export function computeStreak(rows, today, calendarDays = 35) {
  const active = [...new Set(rows.filter((r) => r.status === "completed" && r.planDate <= today).map((r) => r.planDate))].sort();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < active.length; i++) {
    run = i > 0 && diffDays(active[i - 1], active[i]) <= 2 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const lastActive = active[active.length - 1] || null;
  const current = lastActive && diffDays(lastActive, today) <= 2 ? run : 0;
  const activeSet = new Set(active);
  const calendar = [];
  for (let i = calendarDays - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    calendar.push({ date: d, active: activeSet.has(d) });
  }
  return { current, longest, lastActive, calendar };
}

// ---------- progress & estimates ----------

export function computeStats(settings, rows, today) {
  const memAll = memorizedAll(settings, rows);
  const memorizedUnits = unitsOf(memAll);
  const seqRemaining = unitsOf(subtract(newHifzSequence(settings), memAll));
  const daysNeeded = Math.ceil(seqRemaining / settings.newTarget);
  const estimatedDate = addDays(today, daysNeeded);
  const deadline = `${settings.goalYear}-12-31`;
  const daysLeft = Math.max(1, diffDays(today, deadline) + 1);
  const neededPerDay = Math.ceil(seqRemaining / daysLeft);
  const onTrack = seqRemaining === 0 || settings.newTarget >= neededPerDay;
  const recommended = onTrack ? null : NEW_TARGET_OPTIONS.find((o) => o.units >= neededPerDay) || null;

  const shortOrder = revisionOrder("short", settings, rows);
  const longOrder = revisionOrder("long", settings, rows);
  const lastLong = rows.filter((r) => r.activity === "long").sort((a, b) => (a.planDate < b.planDate ? -1 : 1)).pop();
  const { cursor, cycle } = revisionCursor("long", settings, lastLong);
  const longTotal = unitsOf(longOrder);
  const revision = {
    short: { eligibleUnits: unitsOf(shortOrder), latest: toSet(latestPortion(shortOrder, settings.shortTarget, [])) },
    long: { eligibleUnits: longTotal, position: cursor, cycle, cycleProgress: longTotal ? cursorPosition(longOrder, cursor) / longTotal : 0 },
  };

  return {
    memorizedRanges: memAll,
    memorizedUnits,
    percent: Math.floor((memorizedUnits / TOTAL_UNITS) * 1000) / 10,
    remainingUnits: TOTAL_UNITS - memorizedUnits,
    planRemainingUnits: seqRemaining,
    estimatedDate: seqRemaining ? estimatedDate : today,
    goalYear: settings.goalYear,
    onTrack,
    neededPerDay,
    recommended,
    revision,
  };
}

// Recommendation shown during setup before anything is saved.
export function goalCheck(settings, today) {
  return computeStats(settings, [], today);
}

// ---------- settings ----------

export function validateSettings(s, today) {
  const errors = [];
  if (!(s.goalYear >= +today.slice(0, 4))) errors.push("Pick a completion year from this year onward.");
  if (!(s.newTarget > 0) || !(s.shortTarget > 0) || !(s.longTarget > 0)) errors.push("Daily targets must be more than zero.");
  if (positionIn(newHifzSequence(s), s.currentUnit) == null) errors.push("Your current position must be on your memorization path, at or after your starting point.");
  if (!(s.longStartUnit >= 0 && s.longStartUnit < TOTAL_UNITS)) errors.push("Pick where Long Muraja'ah starts.");
  if (!s.timezone) errors.push("Timezone is missing.");
  return errors;
}

// Explain what a settings edit does to recorded progress, before applying it.
export function settingsChangeEffects(prev, next, rows, today) {
  const notes = [];
  const recorded = union(...rows.filter((r) => r.activity === "new").map((r) => r.completed));
  const pathChanged = prev.startUnit !== next.startUnit || prev.direction !== next.direction;
  const oldBase = baselineMemorized(prev);
  const newBase = baselineMemorized(next);
  const lost = subtract(oldBase, union(newBase, recorded, next.extraMemorized || []));
  if (unitsOf(lost)) {
    notes.push(`About ${Math.round(unitsOf(lost) / UNITS_PER_PAGE * 10) / 10} pages that your old position counted as memorized will no longer count. Pages you recorded in the tracker always stay memorized.`);
  }
  if (pathChanged) {
    const outside = subtract(recorded, newHifzSequence(next));
    notes.push("New Hifz will follow the new path from the first page you haven't memorized yet.");
    if (unitsOf(outside)) notes.push("Some pages you already recorded are outside the new path. They stay in your history and still count as memorized.");
  }
  if (prev.longStartUnit !== next.longStartUnit) notes.push("Long Muraja'ah will continue from the new starting point. Your cycle count is kept.");
  const todayTouched = rows.filter((r) => r.planDate === today && unitsOf(r.completed) > 0).map((r) => r.activity);
  if (todayTouched.length && (pathChanged || prev.currentUnit !== next.currentUnit || ACTIVITIES.some((a) => targetFor(prev, a) !== targetFor(next, a)))) {
    notes.push("Today's tasks that you've already started stay as they are. The changes apply to them from tomorrow.");
  }
  return notes;
}

export function describeUnitsAsPages(units) {
  return Math.round((units / UNITS_PER_PAGE) * 10) / 10;
}
