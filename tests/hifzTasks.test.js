import { test } from "node:test";
import assert from "node:assert/strict";
import { pageToUnit, UNITS_PER_PAGE, TOTAL_UNITS, wholeJuz } from "../src/hifz/quran.js";
import { summarizeHifz, suggestPortion, suggestDate, nextAfter, mistakesForTask, taskPages, legacyProfile, shortBefore, nextClassDay, nextTasksToSet, previewNext, directionFor, hifzPath, teacherTaskList } from "../src/hifz/tasks.js";
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

test("New Hifz follows the path; Short revises the latest pages; Long goes juz by juz", () => {
  const done = "2026-10-30T10:00:00Z";
  // From Al-Baqarah: pages 2–49 known, half of page 50 just done.
  const fwd = { direction: "forward", startUnit: pageToUnit(2), newUnits: P / 2, shortPages: 4, longStartUnit: pageToUnit(10), longMode: "juz" };
  const tasks = [task("2026-10-30", "new", [pageToUnit(50), pageToUnit(50) + P / 2], done)];
  const memorized = [[pageToUnit(2), pageToUnit(50) + P / 2]];
  assert.deepEqual(suggestPortion("new", tasks, memorized, fwd), { start: pageToUnit(50) + P / 2, end: pageToUnit(51) });
  // Short: the 4 pages straight before the next New Hifz, not a new part.
  assert.deepEqual(suggestPortion("short", tasks, memorized, fwd), { start: pageToUnit(46) + P / 2, end: pageToUnit(50) + P / 2 });
  // With Juz 30 memorised too (outside the path), Short still comes from just before the New Hifz.
  const withJuz30 = [...memorized, pages(582, 604)];
  assert.deepEqual(suggestPortion("short", tasks, withJuz30, fwd), { start: pageToUnit(46) + P / 2, end: pageToUnit(50) + P / 2 });
  // For a New Hifz the teacher picks (Al-A'raf p. 158), Short is the 4 pages before it.
  assert.deepEqual(shortBefore(pageToUnit(158), [pages(2, 157)], fwd), { start: pageToUnit(154), end: pageToUnit(158) });
  // The real case: the Hifz started at p. 158 (forward), p. 182–604 known; New Hifz p. 158 → Short p. 154–157.
  assert.deepEqual(shortBefore(pageToUnit(158), [[5430, 18120]], { direction: "forward", startUnit: pageToUnit(158), shortPages: 4 }), { start: pageToUnit(154), end: pageToUnit(158) });
  // … even when only Juz 30 has been entered as memorised so far.
  assert.deepEqual(shortBefore(pageToUnit(158), [pages(582, 604)], fwd), { start: pageToUnit(154), end: pageToUnit(158) });
  // An-Naba path, New Hifz at the start of Juz 29 (p. 562): the pages before it on the path are the end of Juz 30.
  assert.deepEqual(shortBefore(pageToUnit(562), [pages(582, 604)], { ...fwd, direction: "juz_reverse", startUnit: pageToUnit(582) }), { start: pageToUnit(601), end: pageToUnit(605) });
  // Long: from the chosen start to the end of its juz (Juz 1 ends on page 21) …
  assert.deepEqual(suggestPortion("long", tasks, memorized, fwd), { start: pageToUnit(10), end: pageToUnit(22) });
  // … then the next juz, and back to the beginning after the last memorised page.
  assert.deepEqual(suggestPortion("long", [task("2026-10-30", "long", [pageToUnit(10), pageToUnit(22)])], memorized, fwd), { start: pageToUnit(22), end: pageToUnit(42) });
  assert.deepEqual(suggestPortion("long", [task("2026-10-30", "long", [pageToUnit(42), pageToUnit(50) + P / 2])], memorized, fwd).start, pageToUnit(2));
  assert.deepEqual(suggestPortion("long", tasks, memorized, { ...fwd, longMode: "pages", longPages: 3 }), { start: pageToUnit(10), end: pageToUnit(13) });

  // From An-Naba: Juz 30 known, Juz 29 started (pages 562–563).
  const rev = { direction: "juz_reverse", startUnit: pageToUnit(582), shortPages: 4 };
  const memRev = [pages(562, 563), pages(582, 604)];
  assert.deepEqual(suggestPortion("new", [], memRev, rev), { start: pageToUnit(564), end: pageToUnit(565) });
  assert.deepEqual(suggestPortion("short", [], memRev, rev), { start: pageToUnit(562), end: pageToUnit(564) });
  // A New Hifz already set (not done yet) isn't suggested again.
  assert.equal(suggestPortion("new", [task("2026-11-01", "new", pages(564, 564))], memRev, rev).start, pageToUnit(565));

  assert.equal(suggestDate(tasks, TODAY), TODAY);
  assert.equal(suggestDate([task(TODAY, "new", pages(1, 1))], TODAY), "2026-11-01");
  const next = nextAfter(tasks[0], tasks, memorized, TODAY, fwd);
  assert.equal(next.taskDate, "2026-11-01");
  assert.equal(next.start, tasks[0].end);
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


test("next class day comes from the timetable; a part not done comes again", () => {
  // 2026-10-31 is a Saturday. Classes on Sun, Tue, Thu.
  const sched = { days: ["Sun", "Tue", "Thu"] };
  assert.equal(nextClassDay(sched, "2026-10-31"), "2026-11-01");          // Sat → Sun
  assert.equal(nextClassDay(sched, "2026-11-01"), "2026-11-03");          // Sun → Tue
  assert.equal(nextClassDay(sched, "2026-11-01", true), "2026-11-01");    // today is a class day
  assert.equal(nextClassDay(null, "2026-11-01"), "2026-11-02");           // no timetable: next day
  assert.equal(suggestDate([task("2026-11-01", "new", pages(1, 1))], "2026-11-01", sched), "2026-11-03");

  const plan = { direction: "forward", startUnit: pageToUnit(2), shortPages: 4, longStartUnit: pageToUnit(2), longMode: "pages", longPages: 2 };
  const memorized = [pages(2, 20)];
  const due = task("2026-11-01", "new", pages(21, 21));                   // today's New Hifz, not done
  const p = suggestPortion("new", [due], memorized, plan, "2026-11-01");
  assert.deepEqual([p.start, p.end, p.repeat], [pageToUnit(21), pageToUnit(22), true]);
  // Done → the next part; set for a later day (not due yet) → carry on after it.
  assert.equal(suggestPortion("new", [{ ...due, completedAt: "2026-11-01T10:00:00Z" }], [pages(2, 21)], plan, "2026-11-01").start, pageToUnit(22));
  assert.equal(suggestPortion("new", [{ ...due, taskDate: "2026-11-03" }], memorized, plan, "2026-11-01").start, pageToUnit(22));
  // Short follows the repeated New Hifz: the 4 pages before p. 21.
  assert.deepEqual(suggestPortion("short", [due], memorized, plan, "2026-11-01"), { start: pageToUnit(17), end: pageToUnit(21) });
  // Next day button: Sun's task → Tue.
  assert.equal(nextAfter({ ...due, completedAt: "x" }, [{ ...due, completedAt: "x" }], [pages(2, 21)], "2026-11-01", plan, sched).taskDate, "2026-11-03");
});

test("tasks are generated from the plan for class days; done creates the next", () => {
  const sched = { days: ["Sun", "Tue", "Thu"] };
  // Hifz from p. 2, pages 2–157 known, 1 page a day, Short 4 pages, Long 2 pages from p. 2.
  const plan = { direction: "forward", startUnit: pageToUnit(2), newUnits: P, shortPages: 4, longStartUnit: pageToUnit(2), longMode: "pages", longPages: 2 };
  const memorized = [pages(2, 157)];
  // Plan just saved on Sunday 1 Nov (a class day): today's three tasks.
  const first = nextTasksToSet({ tasks: [], memorized, profile: plan, today: "2026-11-01", schedule: sched });
  assert.deepEqual(first.map((r) => [r.activity, r.taskDate, r.start, r.end]), [
    ["new", "2026-11-01", pageToUnit(158), pageToUnit(159)],
    ["short", "2026-11-01", pageToUnit(154), pageToUnit(158)],
    ["long", "2026-11-01", pageToUnit(2), pageToUnit(4)],
  ]);
  // Nothing more while each activity has a task waiting.
  const set = first.map((r, i) => ({ ...r, id: `t${i}`, completedAt: null, createdAt: `2026-11-01T0${i}` }));
  assert.equal(nextTasksToSet({ tasks: set, memorized, profile: plan, today: "2026-11-01", schedule: sched }).length, 0);
  // While listening on Sunday: the next tasks are Tuesday's.
  const nNew = previewNext(set[0], { tasks: set, memorized, profile: plan, today: "2026-11-01", schedule: sched });
  const nShort = previewNext(set[1], { tasks: set, memorized, profile: plan, today: "2026-11-01", schedule: sched });
  const nLong = previewNext(set[2], { tasks: set, memorized, profile: plan, today: "2026-11-01", schedule: sched });
  assert.deepEqual([nNew.taskDate, nNew.start], ["2026-11-03", pageToUnit(159)]);
  assert.deepEqual([nShort.start, nShort.end], [pageToUnit(155), pageToUnit(159)]); // 4 pages before Tuesday's New Hifz
  assert.deepEqual([nLong.start, nLong.end], [pageToUnit(4), pageToUnit(6)]);
  // A task the student ticked done at home: the teacher's page fills in the next one.
  const doneNew = set.map((t, i) => (i === 0 ? { ...t, completedAt: "2026-11-01T10:00:00Z" } : t));
  const after = nextTasksToSet({ tasks: doneNew, memorized: [pages(2, 158)], profile: plan, today: "2026-11-01", schedule: sched });
  assert.deepEqual(after.map((r) => [r.activity, r.taskDate, r.start]), [["new", "2026-11-03", pageToUnit(159)]]);
  // The teacher's confirmed change is used instead.
  const drafted = nextTasksToSet({ tasks: doneNew, memorized: [pages(2, 158)], profile: plan, today: "2026-11-01", schedule: sched, drafts: { new: { start: pageToUnit(159), end: pageToUnit(159) + P / 2, taskDate: "2026-11-05", notes: "Half today" } } });
  assert.deepEqual([drafted[0].taskDate, drafted[0].end, drafted[0].notes], ["2026-11-05", pageToUnit(159) + P / 2, "Half today"]);
});

test("whole juz from the front or the back", () => {
  assert.deepEqual(wholeJuz("first", 2), [0, pageToUnit(42)]); // Juz 1–2
  assert.deepEqual(wholeJuz("last", 3), [pageToUnit(542), TOTAL_UNITS]); // Juz 28–30
  assert.deepEqual(wholeJuz("last", 1), pages(582, 604));
  assert.deepEqual(wholeJuz("first", 30), [0, TOTAL_UNITS]);
});

test("the way New Hifz goes follows from where the student starts", () => {
  // Starting in Juz 30 (An-Naba): juz by juz towards the front.
  assert.equal(directionFor(pageToUnit(582)), "juz_reverse");
  assert.equal(directionFor(pageToUnit(590), [pages(582, 589)]), "juz_reverse");
  // Juz 29–30 known, starting at Juz 28: on towards the front too.
  assert.equal(directionFor(pageToUnit(542), [wholeJuz("last", 2)]), "juz_reverse");
  assert.deepEqual(hifzPath({ startUnit: pageToUnit(542), direction: directionFor(pageToUnit(542), [wholeJuz("last", 2)]) }).slice(0, 2),
    [pages(542, 561), pages(522, 541)]);
  // From Al-Baqarah (even with Juz 30 known), or after Juz 1–2: on to the end.
  assert.equal(directionFor(pageToUnit(2)), "forward");
  assert.equal(directionFor(pageToUnit(2), [wholeJuz("last", 1)]), "forward");
  assert.equal(directionFor(pageToUnit(42), [wholeJuz("first", 2)]), "forward");
  assert.equal(directionFor(pageToUnit(2), [wholeJuz("first", 2)]), "forward");
  // Juz 30 known but not Juz 29, starting in Juz 28: Juz 29 still lies ahead.
  assert.equal(directionFor(pageToUnit(542), [wholeJuz("last", 1)]), "forward");
  // Starting at Juz 28 with Juz 29–30 known: the first Short Muraja'ah is the end of Juz 29, not Juz 27.
  const j28 = { direction: "juz_reverse", startUnit: pageToUnit(542), shortPages: 1 };
  assert.deepEqual(shortBefore(pageToUnit(542), [wholeJuz("last", 2)], j28), { start: pageToUnit(581), end: pageToUnit(582) });
  assert.deepEqual(shortBefore(pageToUnit(545), [wholeJuz("last", 2), pages(542, 544)], j28), { start: pageToUnit(544), end: pageToUnit(545) });
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
