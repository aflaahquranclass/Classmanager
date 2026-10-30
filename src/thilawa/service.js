// Thilawa service: loads a student's Thilawa data from a repo (see repos.js)
// and works out everything the screens show.

import { localDate } from "../hifz/engine.js";
import { khatamProgress, completedCounts, readingStreak, recentPace, goalCheck, latestLevels, nextFreePage, pagesOn, TOTAL_PAGES } from "./engine.js";

export const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export async function loadThilawa(repo, now = new Date()) {
  const [settings, reading, assignments, assessments, notes] = await Promise.all([
    repo.getSettings(), repo.listReading(), repo.listAssignments(), repo.listAssessments(), repo.listNotes(),
  ]);
  return summarizeThilawa({ settings, reading, assignments, assessments, notes }, now);
}

export function summarizeThilawa({ settings, reading, assignments, assessments, notes }, now = new Date()) {
  const today = localDate(now, settings?.timezone || browserTimezone());
  const progress = khatamProgress(reading);
  const pace = recentPace(reading, today);
  return {
    settings,
    today,
    reading,
    assignments: [...assignments].sort((a, b) => (!!a.completedAt - !!b.completedAt) || (a.createdAt < b.createdAt ? 1 : -1)),
    assessments,
    notes: [...notes].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    progress,
    counts: completedCounts(progress.pagesRead),
    streak: readingStreak(reading, today),
    pace,
    goal: settings ? goalCheck(settings.goalDate, TOTAL_PAGES - progress.count, pace, today) : null,
    levels: latestLevels(assessments),
    nextFreePage: nextFreePage(reading),
    readToday: pagesOn(reading, today),
    openAssignments: assignments.filter((a) => !a.completedAt).length,
  };
}

// Tick one page as read today (free reading).
export const markPageRead = (repo, page, today) => repo.addReading({ readOn: today, fromPage: page, toPage: page });

// Untick a page ticked today by mistake.
export async function unmarkPage(repo, reading, page, today) {
  const rows = reading.filter((r) => r.readOn === today && !r.assignmentId && r.fromPage === page && r.toPage === page);
  for (const r of rows) await repo.deleteReading(r.id);
}

// The teacher's set reading is done: its pages count as read today.
export async function completeAssignment(repo, assignment, today) {
  await repo.addReading({ readOn: today, fromPage: assignment.fromPage, toPage: assignment.toPage, assignmentId: assignment.id });
  await repo.setAssignmentDone(assignment.id, true);
}

// Untick it. Its pages are taken off the log too (the database only allows
// that within a day; after that the reading stays in the history).
export async function reopenAssignment(repo, assignment, reading) {
  for (const r of reading.filter((x) => x.assignmentId === assignment.id)) {
    try { await repo.deleteReading(r.id); } catch { /* older than a day: keep it */ }
  }
  await repo.setAssignmentDone(assignment.id, false);
}
