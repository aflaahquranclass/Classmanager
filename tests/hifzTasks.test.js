import { test } from "node:test";
import assert from "node:assert/strict";
import { pageToUnit, UNITS_PER_PAGE } from "../src/hifz/quran.js";
import { summarizeHifz, suggestPortion, suggestDate, nextAfter, mistakesForTask, taskPages, legacyProfile } from "../src/hifz/tasks.js";
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
  const fwd = { direction: "forward", startUnit: pageToUnit(2), shortPages: 4, longStartUnit: pageToUnit(10), longMode: "juz" };
  const tasks = [task("2026-10-30", "new", [pageToUnit(50), pageToUnit(50) + P / 2], done)];
  const memorized = [[pageToUnit(2), pageToUnit(50) + P / 2]];
  assert.deepEqual(suggestPortion("new", tasks, memorized, fwd), { start: pageToUnit(50) + P / 2, end: pageToUnit(51) });
  // Short: the 4 most recently memorised pages, not a new part.
  assert.deepEqual(suggestPortion("short", tasks, memorized, fwd), { start: pageToUnit(46) + P / 2, end: pageToUnit(50) + P / 2 });
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

test("teacher sets and changes tasks and mistakes; the student can only tick", async () => {
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

  await student.setTaskDone(t.id, true);
  s = await loadHifz(student, TODAY);
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

