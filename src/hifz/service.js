// Hifz Tracker service: ties the pure engine to a storage repo.
//
// Repo interface (one student's data; the backend enforces ownership):
//   getSettings() → settings | null
//   saveSettings(settings) → settings
//   listAssignments() → rows
//   insertAssignments(rows)  — must ignore rows whose (planDate, activity)
//                              already exists, so generation is idempotent
//   updateAssignment(id, patch, expectedVersion) → row | null (version clash)

import { ACTIVITIES, planDay, applyProgress, computeStats, computeStreak, localDate, validateSettings, settingsChangeEffects, unitsOf } from "./engine.js";

const PLAN_FIELDS = ["target", "pendingIn", "segments", "completed", "cursorAfter", "cycleAfter", "status", "completedAt", "plannedAt"];
const pick = (row) => Object.fromEntries(PLAN_FIELDS.map((k) => [k, row[k]]));

export function todayFor(settings, now) {
  return localDate(now, settings.timezone);
}

// Load everything the tracker screen needs, creating today's three tasks if
// they don't exist yet. Safe to call repeatedly (refreshes, several tabs).
export async function loadTracker(repo, now = new Date()) {
  const settings = await repo.getSettings();
  if (!settings) return { needsSetup: true };
  const today = todayFor(settings, now);
  let rows = await repo.listAssignments();
  const missing = ACTIVITIES.filter((a) => !rows.some((r) => r.planDate === today && r.activity === a));
  if (missing.length) {
    const prior = rows.filter((r) => r.planDate < today);
    const created = missing.map((activity) => planDay({ activity, settings, priorRows: prior, planDate: today, now: now.toISOString() }));
    await repo.insertAssignments(created);
    rows = await repo.listAssignments();
  }
  return summarize(settings, rows, today);
}

export function summarize(settings, rows, today) {
  const todayRows = Object.fromEntries(ACTIVITIES.map((a) => [a, rows.find((r) => r.planDate === today && r.activity === a) || null]));
  return {
    needsSetup: false,
    settings,
    today,
    rows,
    todayRows,
    stats: computeStats(settings, rows, today),
    streak: computeStreak(rows, today),
  };
}

// Mark how much of today's task is done (all of it = unitsDone equal to the
// assignment size). Only today's task can be changed; past days are history.
export async function recordProgress(repo, rowId, unitsDone, now = new Date()) {
  const settings = await repo.getSettings();
  if (!settings) throw new Error("Set up your Hifz plan first.");
  const today = todayFor(settings, now);
  for (let attempt = 0; attempt < 3; attempt++) {
    const rows = await repo.listAssignments();
    const row = rows.find((r) => r.id === rowId);
    if (!row) throw new Error("That task wasn't found.");
    if (row.planDate !== today) throw new Error("Only today's tasks can be updated.");
    const next = applyProgress(row, unitsDone, now.toISOString());
    const saved = await repo.updateAssignment(rowId, pick(next), row.version);
    if (saved) return saved;
    // Someone else saved first: re-read and apply on top of the latest version.
  }
  throw new Error("Couldn't save because the task kept changing. Please try again.");
}

export const markComplete = (repo, row, now) => recordProgress(repo, row.id, unitsOf(row.segments), now);

// Notes to show (and confirm) before an edit is applied.
export async function previewSettingsChange(repo, next, now = new Date()) {
  const prev = await repo.getSettings();
  if (!prev) return [];
  const rows = await repo.listAssignments();
  return settingsChangeEffects(prev, next, rows, todayFor(next, now));
}

// First-time setup or an edit. Completed history, streaks and pending work are
// never deleted: only today's untouched tasks are re-planned with the new
// settings; everything after today is generated from the new settings anyway.
export async function saveSettings(repo, next, now = new Date()) {
  const today = todayFor(next, now);
  const errors = validateSettings(next, today);
  if (errors.length) throw new Error(errors.join(" "));
  const prev = await repo.getSettings();
  const toSave = { ...next };
  if (!prev || prev.longStartUnit !== next.longStartUnit) toSave.longOverrideAt = prev ? now.toISOString() : null;
  else toSave.longOverrideAt = prev.longOverrideAt ?? null;
  const saved = await repo.saveSettings(toSave);

  if (prev) {
    const rows = await repo.listAssignments();
    const prior = rows.filter((r) => r.planDate < today);
    for (const row of rows.filter((r) => r.planDate === today && unitsOf(r.completed) === 0)) {
      const fresh = planDay({ activity: row.activity, settings: saved, priorRows: prior, planDate: today, now: now.toISOString() });
      await repo.updateAssignment(row.id, pick(fresh), row.version);
    }
  }
  return saved;
}
