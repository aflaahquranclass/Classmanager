import { test } from "node:test";
import assert from "node:assert/strict";
import { pageToUnit, UNITS_PER_PAGE, TOTAL_UNITS, wholeJuz } from "../src/hifz/quran.js";
import { summarizeHifz, mistakesForTask, taskPages, legacyProfile, nextClassDay, setByApproval, taskRowOf, teacherTaskList, classTaskSheet, describeAyahs, surahRange, surahsRange, surahRuns, describeSurahRun, memorizedParts } from "../src/hifz/tasks.js";
import { countAyahs, SURAH_AYAH_COUNTS } from "../src/hifz/ayahs.js";
import { union } from "../src/hifz/engine.js";
import { loadHifz } from "../src/hifz/taskService.js";
import { createHifzMemoryStore, createMemoryHifzRepo } from "../src/hifz/taskRepos.js";

const P = UNITS_PER_PAGE;
const pages = (a, b) => [pageToUnit(a), pageToUnit(b + 1)];
let n = 0;
const task = (taskDate, activity, [start, end], completedAt = null) => ({ id: `t${++n}`, taskDate, activity, start, end, notes: "", completedAt, createdAt: `2026-10-01T00:00:${String(n).padStart(2, "0")}Z` });
const TODAY = "2026-10-31";

test("memorised = teacher's starting point + completed New Hifz", () => {
  const profile = { memorized: [pages(582, 604)], goalYear: 2030 };
  const tasks = [task("2026-10-30", "new", pages(580, 581), "2026-10-30T10:00:00Z"), task(TODAY, "new", pages(578, 579))];
  const s = summarizeHifz({ profile, tasks }, TODAY);
  assert.deepEqual(s.memorized, [pages(580, 604)]);
  assert.equal(s.stats.memorizedUnits, 25 * P);
  assert.equal(s.todayTasks.length, 1);
  assert.equal(s.stats.goalYear, 2030);
  assert.equal(s.streak.current, 1);
});

test("overdue, today and upcoming are split by date; today is ordered New, Short, Long", () => {
  const tasks = [
    task(TODAY, "long", pages(1, 2)), task(TODAY, "new", pages(10, 10)), task(TODAY, "short", pages(9, 9)),
    task("2026-10-29", "new", pages(8, 8)), task("2026-11-01", "new", pages(11, 11)),
  ];
  const s = summarizeHifz({ profile: null, tasks }, TODAY);
  assert.deepEqual(s.todayTasks.map((t) => t.activity), ["new", "short", "long"]);
  assert.equal(s.overdue.length, 1);
  assert.equal(s.upcoming.length, 1);
  assert.equal(s.hasProfile, false);
});

test("task pages, mistakes on a task, and the old plan as a starting point", () => {
  const t = task(TODAY, "new", [pageToUnit(5, 8), pageToUnit(7, 3)]);
  assert.deepEqual(taskPages(t), [5, 6, 7]);
  const mistakes = [{ id: "a", page: 6 }, { id: "b", page: 8 }, { id: "c", page: 5, correctedAt: "x" },
    { id: "d", page: 5, line: 3 }, { id: "e", page: 5, line: 8 }, { id: "f", page: 7, line: 2 }, { id: "g", page: 7, line: 9 }];
  // Lines 5:8 – 7:2 are the portion; d (5:3) and g (7:9) are on faded lines.
  assert.deepEqual(mistakesForTask(t, mistakes).map((m) => m.id), ["a", "e", "f"]);
  const legacy = legacyProfile({ settings: { goalYear: 2031, startUnit: pageToUnit(2), direction: "forward", currentUnit: pageToUnit(12), extraMemorized: [] }, rows: [] });
  assert.deepEqual(legacy.memorized, [pages(2, 11)]);
  assert.equal(legacy.goalYear, 2031);
});

test("teacher sets and changes tasks and mistakes; the student finishes, the teacher approves", async () => {
  const store = createHifzMemoryStore();
  const teacher = createMemoryHifzRepo(store, "s1", { teacherId: "t1" });
  const student = createMemoryHifzRepo(store, "s1", { asStudent: true });
  let heard = 0;
  const stop = student.subscribe(() => { heard += 1; });

  await teacher.saveProfile({ memorized: [pages(582, 604)], goalYear: 2029 });
  await teacher.addTasks([{ taskDate: TODAY, activity: "new", start: pageToUnit(581), end: pageToUnit(582), notes: "Slowly" }]);
  let s = await loadHifz(student, TODAY);
  const [t] = s.todayTasks;
  assert.equal(t.notes, "Slowly");

  await assert.rejects(student.addTasks([{ taskDate: TODAY, activity: "new", start: 0, end: 30 }]));
  await assert.rejects(student.addMistake({ page: 581, verseKey: "77:1", position: 1 }));
  await teacher.addMistake({ page: 581, verseKey: "77:1", position: 1, wordText: "x", taskId: t.id });
  await assert.rejects(teacher.addMistake({ page: 581, verseKey: "77:1", position: 1 }));
  // A plain mistake until the teacher picks a kind; only the teacher can.
  const [mark] = await teacher.listMistakes();
  assert.equal(mark.category, null);
  await teacher.setMistakeCategory(mark.id, "raa");
  await assert.rejects(student.setMistakeCategory(mark.id, "madd"), /Only the teacher/);
  assert.equal((await student.listMistakes())[0].category, "raa");

  // The student finishing doesn't complete it: it waits for the teacher.
  await assert.rejects(student.setTaskDone(t.id, true), /Only the teacher/);
  await student.setStudentDone(t.id, true);
  s = await loadHifz(student, TODAY);
  assert.equal(s.stats.memorizedUnits, 23 * P);
  assert.deepEqual(s.toCheck.map((x) => x.id), [t.id]);
  await teacher.setTaskDone(t.id, true);
  s = await loadHifz(student, TODAY);
  assert.equal(s.toCheck.length, 0);
  assert.equal(s.stats.memorizedUnits, 24 * P);
  assert.equal(s.openMistakes.length, 1);

  await teacher.setMistakeCorrected(s.openMistakes[0].id, true);
  await teacher.updateTask(t.id, { taskDate: "2026-11-02" });
  s = await loadHifz(student, TODAY);
  assert.equal(s.openMistakes.length, 0);
  assert.equal(s.upcoming.length, 1);
  assert.ok(heard >= 5);
  stop();
});


test("next class day comes from the timetable", () => {
  // 2026-10-31 is a Saturday. Classes on Sun, Tue, Thu.
  const sched = { days: ["Sun", "Tue", "Thu"] };
  assert.equal(nextClassDay(sched, "2026-10-31"), "2026-11-01");          // Sat → Sun
  assert.equal(nextClassDay(sched, "2026-11-01"), "2026-11-03");          // Sun → Tue
  assert.equal(nextClassDay(sched, "2026-11-01", true), "2026-11-01");    // today is a class day
  assert.equal(nextClassDay(null, "2026-11-01"), "2026-11-02");           // no timetable: next day
});

test("the next task is only what the teacher chose, marked ayahs and all", async () => {
  const { ayahPortion } = await import("../src/hifz/tasks.js");
  // Marked on the Mushaf: An-Nas, then the teacher goes back to Al-Falaq.
  const marked = { taskDate: "2026-11-26", notes: "", ...ayahPortion(6231, 6236) };
  assert.deepEqual(taskRowOf("new", marked), { activity: "new", taskDate: "2026-11-26", start: marked.start, end: marked.end, notes: "", startAyah: 6231, endAyah: 6236 });
  // Confirmed by page and line (no ayahs): no ayah fields.
  const row = taskRowOf("short", { taskDate: "2026-11-26", start: pageToUnit(600), end: pageToUnit(602), notes: "Twice" });
  assert.deepEqual(row, { activity: "short", taskDate: "2026-11-26", start: pageToUnit(600), end: pageToUnit(602), notes: "Twice" });
});

test("undoing an approval removes only the next task that approving it set", () => {
  const at = (iso) => ({ createdAt: iso });
  // Approved on the teacher's phone at 10:07:06 (its clock); the database marked it at 10:07:06.475.
  const approved = { ...task("2026-11-24", "new", pages(604, 604)), completedAt: "2026-11-24T10:07:06.156Z", updatedAt: "2026-11-24T10:07:06.475Z" };
  // Set by Approve straight after (database clock).
  const setNext = { ...task("2026-11-26", "new", pages(603, 603)), ...at("2026-11-24T10:07:07.020Z") };
  assert.equal(setByApproval(approved, [approved, setNext]).id, setNext.id);
  // Finish on a slow connection: three approvals, then the insert.
  assert.equal(setByApproval(approved, [approved, { ...setNext, ...at("2026-11-24T10:07:20.000Z") }]).id, setNext.id);
  // Set by the teacher later (Set, or marked on the Mushaf), or made before the approval: kept.
  const teacherSet = { ...task("2026-11-26", "new", pages(603, 603)), ...at("2026-11-24T10:08:00Z") };
  assert.equal(setByApproval(approved, [approved, teacherSet]), null);
  assert.equal(setByApproval(approved, [approved, { ...setNext, ...at("2026-11-24T10:05:00Z") }]), null);
  // Without the database's time (the demo), the approval time itself.
  assert.equal(setByApproval({ ...approved, updatedAt: undefined }, [approved, setNext]).id, setNext.id);
  // Another part, one the student has started, or a done one: kept.
  assert.equal(setByApproval(approved, [approved, { ...setNext, activity: "short" }]), null);
  assert.equal(setByApproval(approved, [approved, { ...setNext, studentDoneAt: "2026-11-24T12:00:00Z" }]), null);
  assert.equal(setByApproval(approved, [approved, { ...setNext, completedAt: "2026-11-24T12:00:00Z" }]), null);
  // Not approved: nothing to undo.
  assert.equal(setByApproval({ ...approved, completedAt: null }, [setNext]), null);
});

test("whole juz from the front or the back", () => {
  assert.deepEqual(wholeJuz("first", 2), [0, pageToUnit(42)]); // Juz 1–2
  assert.deepEqual(wholeJuz("last", 3), [pageToUnit(542), TOTAL_UNITS]); // Juz 28–30
  assert.deepEqual(wholeJuz("last", 1), pages(582, 604));
  assert.deepEqual(wholeJuz("first", 30), [0, TOTAL_UNITS]);
});

test("teacher's list: not done yet, New, Short, Long in that order", () => {
  const SUN = "2026-11-01", MON = "2026-11-02";
  // Made in the order Short, Long, New (as they were approved), all for Sunday.
  const short = task(SUN, "short", pages(153, 156));
  const long = task(SUN, "long", pages(188, 191));
  const nw = task(SUN, "new", pages(157, 157));
  assert.deepEqual(teacherTaskList([short, long, nw]).map((t) => t.activity), ["new", "short", "long"]);
  // Across days too: New for Monday still comes before Short for Sunday; a late one first in its activity.
  const late = task("2026-10-30", "short", pages(150, 153));
  assert.deepEqual(teacherTaskList([short, task(MON, "new", pages(158, 158)), late]).map((t) => [t.activity, t.taskDate]), [["new", MON], ["short", "2026-10-30"], ["short", SUN]]);
  // Approved New Hifz goes to History; Monday's takes its place at the top.
  const approved = { ...nw, completedAt: "2026-10-31T10:00:00Z" };
  assert.deepEqual(teacherTaskList([short, long, approved, task(MON, "new", pages(158, 158))]).map((t) => [t.activity, t.taskDate]), [["new", MON], ["short", SUN], ["long", SUN]]);
});

test("class task sheet: each student's next New, Short and Long, A–Z, with the class's day", () => {
  const ahmed = [
    task("2026-11-01", "new", pages(10, 10), "2026-11-01T10:00:00Z"), // done: not shown
    task("2026-11-02", "new", pages(11, 11)),
    task("2026-11-02", "short", pages(8, 9)),
    task("2026-11-02", "long", pages(2, 4)),
  ];
  const mohamed = [task("2026-11-03", "new", pages(30, 30)), task("2026-11-02", "short", pages(25, 26))];
  const sheet = classTaskSheet([{ id: "m", name: "Mohamed" }, { id: "a", name: "ahmed" }], (s) => (s.id === "a" ? ahmed : mohamed));
  assert.equal(sheet.date, "2026-11-02");
  assert.deepEqual(sheet.rows.map((r) => r.name), ["ahmed", "Mohamed"]);
  const [a, m] = sheet.rows;
  assert.deepEqual(a.items.map((i) => i.label), ["Hifz", "Short Muraja'ah", "Long Muraja'ah"]);
  assert.equal(a.items[0].text, describeAyahs(pages(11, 11)));
  assert.equal(a.items[0].date, null);
  // Mohamed's New Hifz is on a later day than his other parts (not given this class): left out.
  assert.deepEqual(m.items.map((i) => i.activity), ["short", "long"]);
  assert.equal(m.items[1].text, null); // nothing set
});

test("class task sheet: a late part stays, and a student whose class is another day keeps that day", () => {
  const late = [task("2026-11-01", "short", pages(5, 5)), task("2026-11-02", "new", pages(6, 6)), task("2026-11-02", "long", pages(1, 2))];
  const other = [task("2026-11-04", "short", pages(40, 40)), task("2026-11-04", "new", pages(41, 41)), task("2026-11-05", "long", pages(1, 3))];
  const sheet = classTaskSheet([{ id: "l", name: "Ali" }, { id: "o", name: "Zara" }], (s) => (s.id === "l" ? late : other));
  assert.equal(sheet.date, "2026-11-02");
  const [l, o] = sheet.rows;
  assert.deepEqual(l.items.map((i) => [i.activity, i.date]), [["new", null], ["short", "2026-11-01"], ["long", null]]);
  assert.deepEqual(o.items.map((i) => [i.activity, i.date]), [["new", "2026-11-04"], ["short", "2026-11-04"]]); // Long, a day later, left out
});

test("a portion marked by ayah: units, exact names, and the ayah numbers to colour", async () => {
  const { ayahNumber, verseKeyOf, ayahPortion, ayahMarksOf } = await import("../src/hifz/tasks.js");
  assert.equal(ayahNumber("1:1"), 1);
  assert.equal(ayahNumber("2:6"), 13);
  assert.equal(verseKeyOf(13), "2:6");
  // Al-Baqarah 6 – 16 is page 3 of the Madinah Mushaf.
  const p = ayahPortion(ayahNumber("2:16"), ayahNumber("2:6")); // either order
  assert.equal(p.startAyah, 13);
  assert.equal(p.endAyah, 23);
  assert.ok(p.start >= pageToUnit(3) && p.end <= pageToUnit(4) && p.end > p.start);
  assert.equal(describeAyahs({ ...p }), "Al-Baqarah 6 – 16");
  // One ayah is a portion too.
  const one = ayahPortion(13, 13);
  assert.ok(one.end > one.start);
  assert.equal(describeAyahs(one), "Al-Baqarah 6");
  // Start and end numbers are coloured; one ayah that's both a New Hifz and a Short Muraja'ah marker is "both".
  assert.deepEqual(ayahMarksOf([{ activity: "new", ...p }, { activity: "short", startAyah: 8, endAyah: 13 }]),
    { "2:6": "both", "2:16": "new", "2:1": "short" });
  assert.deepEqual(ayahMarksOf([{ activity: "new", startAyah: 13, open: true }]), { "2:6": "new" });
});

test("marked ayahs go with the task, and are cleared when its pages are typed in", async () => {
  const { ayahPortion } = await import("../src/hifz/tasks.js");
  const store = createHifzMemoryStore();
  const repo = createMemoryHifzRepo(store, "s1", { teacherId: "t1" });
  await repo.addTasks([{ activity: "new", taskDate: "2026-11-12", notes: "", ...ayahPortion(13, 17) }]);
  let [t] = await repo.listTasks();
  assert.equal(t.startAyah, 13);
  assert.equal(t.endAyah, 17);
  await repo.updateTask(t.id, ayahPortion(18, 23));
  [t] = await repo.listTasks();
  assert.deepEqual([t.startAyah, t.endAyah], [18, 23]);
  await repo.updateTask(t.id, { notes: "Slowly" }); // portion not touched
  [t] = await repo.listTasks();
  assert.equal(t.startAyah, 18);
  await repo.updateTask(t.id, { start: pageToUnit(4), end: pageToUnit(5) }); // typed by page
  [t] = await repo.listTasks();
  assert.deepEqual([t.startAyah, t.endAyah], [null, null]);
});

// ---------- memorised surahs (a plan with no whole juz) ----------

test("surahs tile the Mushaf, so a run of surahs from a juz start is those juz", () => {
  assert.deepEqual(surahRange(1)[0], 0);
  assert.equal(surahRange(114)[1], TOTAL_UNITS);
  for (let s = 1; s < 114; s++) assert.equal(surahRange(s)[1], surahRange(s + 1)[0]);
  // Al-Mulk – An-Nas is Juz 29–30; An-Naba – An-Nas is Juz 30.
  assert.deepEqual(surahsRange(67, 114), wholeJuz("last", 2));
  assert.deepEqual(surahsRange(114, 78), wholeJuz("last", 1));
});

test("every surah's ayahs are counted exactly, also on a shared page", () => {
  for (let s = 1; s <= 114; s++) assert.equal(countAyahs([surahRange(s)]), SURAH_AYAH_COUNTS[s - 1]);
  assert.equal(countAyahs([surahRange(114)]), 6); // An-Nas alone, a third of page 604
  assert.equal(countAyahs([wholeJuz("last", 1)]), 564);
  assert.equal(countAyahs([[0, TOTAL_UNITS]]), 6236);
});

test("a saved plan splits back into whole juz and surahs for the editor", () => {
  assert.deepEqual(memorizedParts([]), { side: "first", count: 0, surahs: [] });
  // None + Ya-Sin + Al-Mulk + Al-Ikhlas – An-Nas: no juz, three surah runs.
  const surahsOnly = union([surahRange(36)], [surahRange(67)], [surahsRange(112, 114)]);
  assert.deepEqual(memorizedParts(surahsOnly), { side: "first", count: 0, surahs: [[36, 36], [67, 67], [112, 114]] });
  // Juz 30 + Al-Mulk: the juz, and Al-Mulk besides it.
  assert.deepEqual(memorizedParts(union([wholeJuz("last", 1)], [surahRange(67)])), { side: "last", count: 1, surahs: [[67, 67]] });
  // Juz 1–2 + all of Al-Baqarah (which runs into Juz 3) + Al-Kahf.
  assert.deepEqual(memorizedParts(union([wholeJuz("first", 2)], [surahRange(2)], [surahRange(18)])), { side: "first", count: 2, surahs: [[2, 2], [18, 18]] });
  // Pages from an old plan aren't juz or surahs.
  assert.equal(memorizedParts([pages(10, 12)]), null);
  assert.deepEqual(surahRuns([80, 67, 78, 79]), [[67, 67], [78, 80]]);
  assert.equal(describeSurahRun([78, 114]), "An-Naba – An-Nas");
});

test("memorised surahs count in the tracker, with approved New Hifz added", () => {
  const profile = { memorized: union([surahRange(67)], [surahsRange(112, 114)]) };
  const s = summarizeHifz({ profile, tasks: [] }, TODAY);
  assert.equal(s.stats.ayahs, 30 + 15);
  // An-Nas back to Al-Kafirun, surah by surah: Al-Kafirun approved, Al-Kawthar set (not done).
  const kafirun = { ...task("2026-11-24", "new", surahRange(109)), completedAt: "2026-11-24T10:00:00Z" };
  const after = summarizeHifz({ profile, tasks: [kafirun, task("2026-11-26", "new", surahRange(108))] }, TODAY);
  assert.equal(after.stats.ayahs, 30 + 15 + 6);
});
