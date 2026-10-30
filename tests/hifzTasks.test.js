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

test("suggestions continue from the last task", () => {
  const done = "2026-10-30T10:00:00Z";
  const tasks = [task("2026-10-30", "new", [pageToUnit(50), pageToUnit(50) + P / 2], done), task("2026-10-30", "long", pages(2, 3), done)];
  const memorized = [[pageToUnit(2), pageToUnit(50) + P / 2]];
  assert.deepEqual(suggestPortion("new", tasks, memorized), { start: pageToUnit(50) + P / 2, end: pageToUnit(51) });
  // New Hifz skips what's already memorised and stops before the next memorised part.
  assert.deepEqual(suggestPortion("new", [task("2026-10-30", "new", pages(1, 1))], [pages(2, 3), pages(5, 9)]), { start: pageToUnit(4), end: pageToUnit(5) });
  // Short repeats the last revision while no New Hifz is done yet.
  assert.deepEqual(suggestPortion("short", [task("2026-10-30", "short", pages(7, 8))], memorized), { start: pageToUnit(7), end: pageToUnit(9) });
  assert.deepEqual(suggestPortion("short", tasks, memorized), { start: pageToUnit(49) + P / 2, end: pageToUnit(50) + P / 2 });
  const span = ([start, end]) => ({ start, end });
  assert.deepEqual(suggestPortion("long", tasks, memorized), span(pages(4, 5)));
  // Long wraps back to the beginning after the last memorised page.
  assert.deepEqual(suggestPortion("long", [task("2026-10-30", "long", [pageToUnit(49), pageToUnit(50) + P / 2])], memorized), { start: pageToUnit(2), end: pageToUnit(3) + P / 2 });
  assert.equal(suggestDate(tasks, TODAY), TODAY);
  assert.equal(suggestDate([task(TODAY, "new", pages(1, 1))], TODAY), "2026-11-01");
  const next = nextAfter(tasks[0], tasks, memorized, TODAY);
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

