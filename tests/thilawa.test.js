import { test } from "node:test";
import assert from "node:assert/strict";
import { khatamProgress, completedCounts, goalCheck, readingStreak, recentPace, ayahsOnPages, describePages, levelLabel, latestLevels, nextFreePage } from "../src/thilawa/engine.js";
import { loadThilawa, markPageRead, unmarkPage, completeAssignment, reopenAssignment } from "../src/thilawa/service.js";
import { createThilawaMemoryStore, createMemoryThilawaRepo } from "../src/thilawa/repos.js";

let n = 0;
const row = (readOn, fromPage, toPage = fromPage, assignmentId = null) => ({ id: `r${++n}`, readOn, fromPage, toPage, assignmentId, createdAt: `${readOn}T08:00:${String(n % 60).padStart(2, "0")}.${String(n).padStart(3, "0")}Z` });
const at = (date) => new Date(`${date}T08:00:00Z`);

test("khatam progress counts each page once and starts over after 604", () => {
  const p = khatamProgress([row("2026-10-01", 1, 10), row("2026-10-02", 5, 12)]);
  assert.equal(p.count, 12);
  assert.equal(p.khatams, 0);
  const full = khatamProgress([row("2026-10-01", 1, 600), row("2026-10-02", 601, 604), row("2026-10-03", 1, 2)]);
  assert.equal(full.khatams, 1);
  assert.equal(full.lastKhatamOn, "2026-10-02");
  assert.equal(full.count, 2);
});

test("completed surahs and juz need every page read", () => {
  const pages = new Set(Array.from({ length: 21 }, (_, i) => 582 + i)); // 582–602
  const c = completedCounts(pages);
  assert.equal(c.juz, 0); // Juz 30 runs to 604
  assert.ok(c.surahs > 20);
  assert.equal(completedCounts(new Set([1])).surahs, 1); // Al-Fatihah is page 1
});

test("ayahs on a page range", () => {
  assert.deepEqual(ayahsOnPages(1, 1), { first: 1, last: 7 });
  assert.equal(ayahsOnPages(604, 604).last, 6236);
  assert.match(describePages(1, 2), /Al-Fatihah – Al-Baqarah · pages 1–2/);
});

test("goal: pages a day needed and whether recent pace reaches it", () => {
  const g = goalCheck("2026-11-09", 100, 5, "2026-10-31"); // 10 days incl. both ends
  assert.equal(g.daysLeft, 10);
  assert.equal(g.neededPerDay, 10);
  assert.equal(g.estimatedDate, "2026-11-19");
  assert.equal(g.onTrack, false);
  assert.equal(goalCheck("2026-11-09", 100, 20, "2026-10-31").onTrack, true);
  assert.equal(goalCheck("2026-10-01", 10, 1, "2026-10-31").passed, true);
});

test("streak and pace come from reading days", () => {
  const reading = [row("2026-10-28", 1), row("2026-10-29", 2, 3), row("2026-10-31", 4)];
  const s = readingStreak(reading, "2026-10-31");
  assert.equal(s.current, 3); // one empty day doesn't break it
  assert.equal(recentPace(reading, "2026-10-31", 4), 1);
});

test("levels and where free reading carries on", () => {
  assert.equal(levelLabel(null), "Not assessed yet");
  assert.equal(levelLabel(72), "Very good");
  const l = latestLevels([{ tajweed: 40, fluency: 50, createdAt: "1" }, { tajweed: 55, fluency: 45, createdAt: "2" }]);
  assert.equal(l.tajweedChange, 15);
  assert.equal(l.fluencyChange, -5);
  assert.equal(nextFreePage([row("2026-10-01", 9, 10), row("2026-10-02", 3, 3, "a1")]), 11);
  assert.equal(nextFreePage([row("2026-10-01", 604)]), 1);
});

test("student ticks pages and set reading; teacher-only actions are refused", async () => {
  const store = createThilawaMemoryStore();
  const teacher = createMemoryThilawaRepo(store, "s1", { teacherId: "t1" });
  const student = createMemoryThilawaRepo(store, "s1", { asStudent: true });
  await teacher.addAssignment({ fromPage: 50, toPage: 52, instructions: "Watch the madd" });
  await teacher.addNote({ body: "Shared", visibleToStudent: true });
  await teacher.addNote({ body: "Private", visibleToStudent: false });
  await assert.rejects(student.addAssessment({ tajweed: 90, fluency: 90 }));

  const day = "2026-10-31";
  await markPageRead(student, 1, day);
  await markPageRead(student, 2, day);
  let t = await loadThilawa(student, at(day));
  assert.equal(t.progress.count, 2);
  assert.equal(t.notes.length, 1);
  assert.equal(t.openAssignments, 1);

  await unmarkPage(student, t.reading, 2, day);
  await completeAssignment(student, t.assignments[0], day);
  t = await loadThilawa(student, at(day));
  assert.equal(t.progress.count, 4); // page 1 + pages 50–52
  assert.equal(t.openAssignments, 0);

  await reopenAssignment(student, t.assignments[0], t.reading);
  t = await loadThilawa(student, at(day));
  assert.equal(t.progress.count, 1);
  assert.equal(t.openAssignments, 1);

  // Another student's repo can't touch these rows.
  const other = createMemoryThilawaRepo(store, "s2", { asStudent: true });
  await assert.rejects(other.deleteReading(t.reading[0].id));
  assert.equal((await other.listReading()).length, 0);
});

test("class name decides the teacher section; other classes follow the admin's choice", async () => {
  const { inProgramSection, groupByClass } = await import("../src/thilawa/programRules.js");
  const s = (className, programs) => ({ name: "A", className, programs });
  assert.equal(inProgramSection(s("Thilawa Class B12", ["hifz"]), "thilawa"), true);
  assert.equal(inProgramSection(s("Thilawa Class B12", ["hifz"]), "hifz"), false);
  assert.equal(inProgramSection(s("Hifz Class B05  (21:30)", ["thilawa"]), "hifz"), true);
  assert.equal(inProgramSection(s("Hifz Class B05  (21:30)", ["thilawa"]), "thilawa"), false);
  assert.equal(inProgramSection(s("PC Sausan", ["hifz", "thilawa"]), "thilawa"), true);
  assert.equal(inProgramSection(s("PC Sausan", ["hifz"]), "thilawa"), false);
  const groups = groupByClass([
    { name: "Zaid", className: "Hifz Class B10 (20:15)" }, { name: "Ali", className: "Hifz Class B10 (20:15)" },
    { name: "Musa", className: "Hifz Class B09 (21:30)" }, { name: "Isa", className: "" },
  ]);
  assert.deepEqual(groups.map((g) => [g.name, g.students.map((x) => x.name)]), [
    ["Hifz Class B09 (21:30)", ["Musa"]], ["Hifz Class B10 (20:15)", ["Ali", "Zaid"]], ["No class", ["Isa"]],
  ]);
});

test("finished reading waits for the teacher; marks show to the student until ticked", async () => {
  const store = createThilawaMemoryStore();
  const teacher = createMemoryThilawaRepo(store, "s1", { teacherId: "t1" });
  const student = createMemoryThilawaRepo(store, "s1", { asStudent: true });
  const reading = await teacher.addAssignment({ fromPage: 582, toPage: 583 });
  let d = await loadThilawa(student);
  assert.equal(d.openAssignments, 1);
  assert.equal(d.toListen.length, 0);

  await completeAssignment(student, d.assignments[0], d.today);
  d = await loadThilawa(teacher);
  assert.deepEqual(d.toListen.map((a) => a.id), [reading.id]);

  await teacher.addMistake({ assignmentId: reading.id, page: 582, line: 3, verseKey: "78:2", position: 2, wordText: "ٱلنَّبَإِ" });
  await assert.rejects(student.addMistake({ assignmentId: reading.id, page: 582, verseKey: "78:3", position: 1 }), /Only the teacher/);
  await teacher.setAssignmentChecked(reading.id, true);
  d = await loadThilawa(student);
  assert.equal(d.toListen.length, 0);
  assert.equal(d.lastChecked.id, reading.id);
  assert.deepEqual(d.corrections.map((m) => m.verseKey), ["78:2"]);

  await student.setMistakeTicked(d.corrections[0].id, true);
  d = await loadThilawa(student);
  assert.equal(d.corrections.length, 0);
});

test("a lesson is done when made, isn't set reading, and its marks replace the last ones", async () => {
  const store = createThilawaMemoryStore();
  const teacher = createMemoryThilawaRepo(store, "s1", { teacherId: "t1" });
  const first = await teacher.addAssignment({ fromPage: 10, toPage: 10, kind: "lesson" });
  await teacher.addMistake({ assignmentId: first.id, page: 10, verseKey: "2:70", position: 1 });
  await teacher.setAssignmentChecked(first.id, true);
  const second = await teacher.addAssignment({ fromPage: 11, toPage: 11, kind: "lesson" });
  assert.ok(second.completedAt);
  await teacher.addMistake({ assignmentId: second.id, page: 11, verseKey: "2:77", position: 3 });
  await teacher.setAssignmentChecked(second.id, true);
  const d = await loadThilawa(teacher);
  assert.equal(d.openAssignments, 0);
  assert.equal(d.assignments.length, 0);
  assert.equal(d.lessons.length, 2);
  assert.deepEqual(d.corrections.map((m) => m.verseKey), ["2:77"]);
});
