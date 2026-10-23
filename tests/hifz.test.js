import { test } from "node:test";
import assert from "node:assert/strict";
import { pageToUnit, UNITS_PER_PAGE, UNITS_PER_LINE } from "../src/hifz/quran.js";
import { unitsOf, toSet, computeStreak, localDate, goalCheck } from "../src/hifz/engine.js";
import { loadTracker, recordProgress, markComplete, saveSettings, previewSettingsChange } from "../src/hifz/service.js";
import { createMemoryStore, createMemoryRepo } from "../src/hifz/repos.js";

const PAGE = UNITS_PER_PAGE;
const LINE = UNITS_PER_LINE;
const page = (n) => [pageToUnit(n), pageToUnit(n + 1)];
const pages = (...ns) => toSet(ns.map(page));
const at = (date, time = "08:00:00") => new Date(`${date}T${time}Z`);
// 2026-10-26 is a Monday.
const MON = "2026-10-26", TUE = "2026-10-27", WED = "2026-10-28", THU = "2026-10-29", FRI = "2026-10-30";

function settings(over = {}) {
  return {
    timezone: "UTC",
    goalYear: 2030,
    startUnit: pageToUnit(2), // Al-Baqarah
    direction: "forward",
    currentUnit: pageToUnit(45), // pages 2–44 already memorized
    extraMemorized: [],
    newTarget: 2 * PAGE,
    shortTarget: 1 * PAGE,
    longTarget: 1 * PAGE,
    longStartUnit: pageToUnit(2),
    ...over,
  };
}

async function setup(over) {
  const store = createMemoryStore();
  const repo = createMemoryRepo(store, "student-a");
  await saveSettings(repo, settings(over), at(MON));
  return { store, repo };
}
const day = (repo, date) => loadTracker(repo, at(date));
const intersectPages = (list, from, to) => list.filter(([s, e]) => s < pageToUnit(to + 1) && e > pageToUnit(from));
const seg = (t, a) => toSet(t.todayRows[a].segments);

test("1. first-time setup saves the plan and creates today's three tasks", async () => {
  const store = createMemoryStore();
  const repo = createMemoryRepo(store, "student-a");
  assert.equal((await loadTracker(repo, at(MON))).needsSetup, true);
  await saveSettings(repo, settings(), at(MON));
  const t = await day(repo, MON);
  assert.equal(t.needsSetup, false);
  assert.deepEqual(seg(t, "new"), pages(45, 46));
  assert.deepEqual(seg(t, "short"), pages(44)); // latest memorized page
  assert.deepEqual(seg(t, "long"), pages(2));
  assert.equal(t.rows.length, 3);
});

test("setup rejects invalid settings", async () => {
  const repo = createMemoryRepo(createMemoryStore(), "s");
  await assert.rejects(saveSettings(repo, settings({ currentUnit: pageToUnit(1) }), at(MON)), /current position/);
  await assert.rejects(saveSettings(repo, settings({ goalYear: 2020 }), at(MON)), /completion year/);
});

test("EXPLICIT: 2-page target, Mon 45–46 with only 45 done → Tue is 46–47, NOT 46–48", async () => {
  const { repo } = await setup();
  const mon = await day(repo, MON);
  assert.deepEqual(seg(mon, "new"), pages(45, 46));
  await recordProgress(repo, mon.todayRows.new.id, PAGE, at(MON));
  const tue = await day(repo, TUE);
  assert.deepEqual(tue.todayRows.new.segments, [page(46), page(47)]);
  assert.equal(unitsOf(tue.todayRows.new.segments), 2 * PAGE);
  assert.ok(!unitsOf(toSet(tue.todayRows.new.segments).filter(([s]) => s >= pageToUnit(48))), "page 48 must not be assigned on Tuesday");
});

test("2. 2-page target with 1 pending page: pending first, page 48 moves to Wednesday", async () => {
  const { repo } = await setup();
  const mon = await day(repo, MON);
  await recordProgress(repo, mon.todayRows.new.id, PAGE, at(MON));
  const tue = await day(repo, TUE);
  await markComplete(repo, tue.todayRows.new, at(TUE));
  const wed = await day(repo, WED);
  assert.deepEqual(seg(wed, "new"), pages(48, 49));
});

test("3. multiple missed days follow the table (Mon 45 / Tue none / Wed 46–47 / Thu 48–49)", async () => {
  const { repo } = await setup();
  const mon = await day(repo, MON);
  await recordProgress(repo, mon.todayRows.new.id, PAGE, at(MON));
  const tue = await day(repo, TUE);
  assert.deepEqual(seg(tue, "new"), pages(46, 47));
  const wed = await day(repo, WED);
  assert.deepEqual(seg(wed, "new"), pages(46, 47));
  await markComplete(repo, wed.todayRows.new, at(WED));
  const thu = await day(repo, THU);
  assert.deepEqual(seg(thu, "new"), pages(48, 49));
});

test("missed days with the app never opened still don't add work", async () => {
  const { repo } = await setup();
  await day(repo, MON);
  const fri = await day(repo, FRI); // Tue–Thu never opened
  assert.deepEqual(seg(fri, "new"), pages(45, 46));
});

test("4. completely unfinished assignment is carried over in full", async () => {
  const { repo } = await setup();
  await day(repo, MON);
  const tue = await day(repo, TUE);
  assert.deepEqual(toSet(tue.todayRows.new.segments), pages(45, 46));
});

test("5. partially completed pages carry over the exact unfinished part", async () => {
  const { repo } = await setup();
  const mon = await day(repo, MON);
  await recordProgress(repo, mon.todayRows.new.id, PAGE + PAGE / 2, at(MON)); // 1½ pages done
  const tue = await day(repo, TUE);
  const p46mid = pageToUnit(46) + PAGE / 2;
  assert.deepEqual(tue.todayRows.new.segments, [[p46mid, pageToUnit(47)], [pageToUnit(47), pageToUnit(48) + PAGE / 2]]);
  assert.equal(unitsOf(tue.todayRows.new.segments), 2 * PAGE);
  // The completed half of page 46 is never repeated.
  assert.ok(tue.todayRows.new.segments.every(([s]) => s >= p46mid));
});

test("6. 5-line daily target, including a partial day", async () => {
  const { repo } = await setup({ newTarget: 5 * LINE });
  const mon = await day(repo, MON);
  assert.deepEqual(mon.todayRows.new.segments, [[pageToUnit(45, 1), pageToUnit(45, 6)]]);
  await markComplete(repo, mon.todayRows.new, at(MON));
  const tue = await day(repo, TUE);
  assert.deepEqual(tue.todayRows.new.segments, [[pageToUnit(45, 6), pageToUnit(45, 11)]]);
  await recordProgress(repo, tue.todayRows.new.id, 3 * LINE, at(TUE));
  const wed = await day(repo, WED);
  assert.deepEqual(wed.todayRows.new.segments, [[pageToUnit(45, 9), pageToUnit(45, 11)], [pageToUnit(45, 11), pageToUnit(45, 14)]]);
  assert.equal(unitsOf(wed.todayRows.new.segments), 5 * LINE);
});

test("7a. half-page target splits pages exactly in half", async () => {
  const { repo } = await setup({ newTarget: PAGE / 2 });
  const mon = await day(repo, MON);
  assert.deepEqual(mon.todayRows.new.segments, [[pageToUnit(45), pageToUnit(45) + PAGE / 2]]);
  await markComplete(repo, mon.todayRows.new, at(MON));
  const tue = await day(repo, TUE);
  assert.deepEqual(tue.todayRows.new.segments, [[pageToUnit(45) + PAGE / 2, pageToUnit(46)]]);
});

test("7b. 1½-page target", async () => {
  const { repo } = await setup({ newTarget: PAGE * 1.5 });
  const mon = await day(repo, MON);
  assert.deepEqual(toSet(mon.todayRows.new.segments), [[pageToUnit(45), pageToUnit(46) + PAGE / 2]]);
  await markComplete(repo, mon.todayRows.new, at(MON));
  const tue = await day(repo, TUE);
  assert.deepEqual(toSet(tue.todayRows.new.segments), [[pageToUnit(46) + PAGE / 2, pageToUnit(48)]]);
});

test("8. pending work exactly equal to the target fills the whole day", async () => {
  const { repo } = await setup();
  await day(repo, MON);
  const tue = await day(repo, TUE);
  assert.equal(unitsOf(tue.todayRows.new.segments), 2 * PAGE);
  assert.deepEqual(seg(tue, "new"), pages(45, 46));
});

test("9. pending work larger than one day's target is spread over days, oldest first", async () => {
  const { repo } = await setup();
  await day(repo, MON); // 45–46, nothing done
  await saveSettings(repo, settings({ newTarget: PAGE }), at(TUE, "00:00:00"));
  const tue = await day(repo, TUE);
  assert.deepEqual(tue.todayRows.new.segments, [page(45)]);
  assert.deepEqual(toSet(tue.todayRows.new.pendingIn), pages(45, 46));
  await markComplete(repo, tue.todayRows.new, at(TUE));
  const wed = await day(repo, WED);
  assert.deepEqual(wed.todayRows.new.segments, [page(46)]);
  await markComplete(repo, wed.todayRows.new, at(WED));
  const thu = await day(repo, THU);
  assert.deepEqual(thu.todayRows.new.segments, [page(47)]);
});

test("10. Short Muraja'ah revises the latest memorized pages, up to the chosen amount", async () => {
  const { repo } = await setup({ shortTarget: 3 * PAGE }); // memorized 2–44
  const mon = await day(repo, MON);
  assert.deepEqual(toSet(mon.todayRows.short.segments), pages(42, 43, 44));
  assert.equal(unitsOf(mon.todayRows.short.segments), 3 * PAGE);
});

test("Short Muraja'ah window moves forward as New Hifz is completed", async () => {
  const { repo } = await setup({ shortTarget: 3 * PAGE });
  const mon = await day(repo, MON);
  await markComplete(repo, mon.todayRows.new, at(MON)); // 45–46 memorized
  await markComplete(repo, mon.todayRows.short, at(MON));
  const tue = await day(repo, TUE);
  assert.deepEqual(toSet(tue.todayRows.short.segments), pages(44, 45, 46));
  // Today's New Hifz pages (47–48) aren't revised until they're memorized.
  assert.ok(!unitsOf(intersectPages(tue.todayRows.short.segments, 47, 48)));
});

test("Short Muraja'ah never includes unmemorized pages", async () => {
  const { repo } = await setup({ currentUnit: pageToUnit(4), shortTarget: 4 * PAGE }); // only 2–3 memorized
  const mon = await day(repo, MON);
  assert.deepEqual(toSet(mon.todayRows.short.segments), pages(2, 3));
  const fresh = await setup({ currentUnit: pageToUnit(2) }); // nothing memorized yet
  const t = await day(fresh.repo, MON);
  assert.equal(t.todayRows.short.status, "empty");
});

test("Short Muraja'ah carries unfinished revision forward within the limit", async () => {
  const { repo } = await setup({ shortTarget: 2 * PAGE });
  const mon = await day(repo, MON);
  assert.deepEqual(toSet(mon.todayRows.short.segments), pages(43, 44));
  await recordProgress(repo, mon.todayRows.short.id, PAGE, at(MON)); // 43 done, 44 left
  await recordProgress(repo, mon.todayRows.new.id, PAGE, at(MON)); // 45 memorized
  const tue = await day(repo, TUE);
  assert.deepEqual(tue.todayRows.short.segments, [page(44), page(45)]);
  assert.equal(unitsOf(tue.todayRows.short.segments), 2 * PAGE);
});

test("11. Long Muraja'ah completes a cycle over memorized pages only", async () => {
  const { repo } = await setup({
    startUnit: pageToUnit(582), direction: "juz_reverse", currentUnit: pageToUnit(582),
    extraMemorized: pages(600, 601, 602, 603, 604), longTarget: 3 * PAGE, longStartUnit: pageToUnit(600),
  });
  const mon = await day(repo, MON);
  assert.deepEqual(toSet(mon.todayRows.long.segments), pages(600, 601, 602));
  await markComplete(repo, mon.todayRows.long, at(MON));
  const tue = await day(repo, TUE);
  assert.deepEqual(tue.todayRows.long.segments, [[pageToUnit(603), pageToUnit(605)], page(600)]);
  assert.equal(tue.todayRows.long.cycleAfter, 2);
  // New Hifz from An-Naba skips the pages already memorized.
  assert.deepEqual(seg(mon, "new"), pages(582, 583));
});

test("Juz Amma path continues into the previous juz after the end of juz 30", async () => {
  const { repo } = await setup({ startUnit: pageToUnit(582), direction: "juz_reverse", currentUnit: pageToUnit(604), longStartUnit: pageToUnit(582) });
  const mon = await day(repo, MON);
  assert.deepEqual(toSet(mon.todayRows.new.segments), toSet([page(604), page(562)]));
});

test("12. editing daily targets keeps pending work", async () => {
  const { repo } = await setup();
  const mon = await day(repo, MON);
  await recordProgress(repo, mon.todayRows.new.id, PAGE, at(MON)); // 46 pending
  await saveSettings(repo, settings({ newTarget: PAGE / 2 }), at(TUE, "00:00:00"));
  const tue = await day(repo, TUE);
  assert.deepEqual(tue.todayRows.new.segments, [[pageToUnit(46), pageToUnit(46) + PAGE / 2]]);
  await saveSettings(repo, settings({ newTarget: 2 * PAGE }), at(TUE, "09:00:00"));
  const tue2 = await day(repo, TUE);
  assert.deepEqual(tue2.todayRows.new.segments, [page(46), page(47)]);
  assert.equal(tue2.rows.filter((r) => r.planDate === TUE).length, 3);
});

test("editing settings keeps a started task for today unchanged", async () => {
  const { repo } = await setup();
  const mon = await day(repo, MON);
  await recordProgress(repo, mon.todayRows.new.id, PAGE / 2, at(MON));
  await saveSettings(repo, settings({ newTarget: PAGE }), at(MON, "10:00:00"));
  const again = await day(repo, MON);
  assert.deepEqual(seg(again, "new"), pages(45, 46));
  assert.equal(unitsOf(again.todayRows.new.completed), PAGE / 2);
});

test("13. editing positions never corrupts completed history", async () => {
  const { repo } = await setup();
  const mon = await day(repo, MON);
  await markComplete(repo, mon.todayRows.new, at(MON)); // 45–46 recorded
  const next = settings({ currentUnit: pageToUnit(40) });
  const notes = await previewSettingsChange(repo, next, at(TUE));
  assert.ok(notes.some((n) => /no longer count/.test(n)));
  await saveSettings(repo, next, at(TUE, "00:00:00"));
  const tue = await day(repo, TUE);
  const monRow = tue.rows.find((r) => r.planDate === MON && r.activity === "new");
  assert.equal(monRow.status, "completed");
  assert.deepEqual(toSet(monRow.completed), pages(45, 46));
  assert.deepEqual(seg(tue, "new"), pages(40, 41));
  // Recorded pages still count, and are never re-assigned.
  const thuLike = tue.stats.memorizedUnits;
  assert.equal(thuLike, unitsOf(pages(...Array.from({ length: 38 }, (_, i) => i + 2), 45, 46)));
});

test("14. repeated and simultaneous requests never duplicate today's plan", async () => {
  const { repo } = await setup();
  await Promise.all([day(repo, MON), day(repo, MON), day(repo, MON)]);
  await day(repo, MON);
  const t = await day(repo, MON);
  assert.equal(t.rows.filter((r) => r.planDate === MON).length, 3);
});

test("simultaneous progress saves don't lose updates (version check)", async () => {
  const { repo } = await setup();
  const mon = await day(repo, MON);
  await Promise.all([
    recordProgress(repo, mon.todayRows.new.id, PAGE, at(MON)),
    recordProgress(repo, mon.todayRows.new.id, 2 * PAGE, at(MON)),
  ]);
  const t = await day(repo, MON);
  assert.equal(t.todayRows.new.version, 2);
});

test("past days can't be edited", async () => {
  const { repo } = await setup();
  const mon = await day(repo, MON);
  await day(repo, TUE);
  await assert.rejects(recordProgress(repo, mon.todayRows.new.id, PAGE, at(TUE)), /today/);
});

test("15. completing only one activity a day keeps the streak", async () => {
  const { repo } = await setup();
  for (const d of [MON, TUE, WED]) {
    const t = await day(repo, d);
    await markComplete(repo, t.todayRows.short, at(d));
  }
  const t = await day(repo, WED);
  assert.equal(t.streak.current, 3);
  // Several tasks on one day still count as one day.
  await markComplete(repo, t.todayRows.new, at(WED));
  assert.equal((await day(repo, WED)).streak.current, 3);
});

test("partial completion does not count toward the streak", async () => {
  const { repo } = await setup();
  const t = await day(repo, MON);
  await recordProgress(repo, t.todayRows.new.id, PAGE, at(MON));
  assert.equal((await day(repo, MON)).streak.current, 0);
});

test("16. streak survives one empty day and resets after two full empty days", () => {
  const done = (d) => ({ planDate: d, status: "completed", activity: "new" });
  const rows = [done(MON)];
  assert.equal(computeStreak(rows, TUE).current, 1);
  assert.equal(computeStreak(rows, WED).current, 1); // grace: Tue + Wed not over yet
  assert.equal(computeStreak(rows, THU).current, 0); // Tue and Wed fully missed
  assert.equal(computeStreak([...rows, done(WED)], WED).current, 2);
  assert.equal(computeStreak([...rows, done(THU)], THU).current, 1);
  assert.equal(computeStreak([...rows, done(WED), done(FRI)], FRI).longest, 3);
});

test("17. day boundaries follow the student's timezone", async () => {
  const instant = new Date("2026-10-26T20:00:00Z");
  assert.equal(localDate(instant, "Asia/Karachi"), TUE);
  assert.equal(localDate(instant, "America/New_York"), MON);
  const { repo } = await setup({ timezone: "Asia/Karachi" });
  const t = await loadTracker(repo, instant);
  assert.equal(t.today, TUE);
  const t2 = await loadTracker(repo, new Date("2026-10-26T18:59:00Z")); // 23:59 in Karachi
  assert.equal(t2.today, MON);
});

test("18. a student can't read or change another student's records", async () => {
  const store = createMemoryStore();
  const a = createMemoryRepo(store, "student-a");
  const b = createMemoryRepo(store, "student-b");
  await saveSettings(a, settings(), at(MON));
  const ta = await loadTracker(a, at(MON));
  assert.equal((await b.listAssignments()).length, 0);
  assert.equal(await b.getSettings(), null);
  await assert.rejects(b.updateAssignment(ta.todayRows.new.id, { completed: [] }, 0), /another student/);
});

test("goal check recommends a bigger target without changing the chosen one", () => {
  const s = settings({ newTarget: 5 * LINE, goalYear: 2027 });
  const g = goalCheck(s, MON);
  assert.equal(g.onTrack, false);
  assert.ok(g.recommended && g.recommended.units > s.newTarget);
  assert.equal(s.newTarget, 5 * LINE);
});

test("nearest ayah: exact for whole pages, estimated inside a page", async () => {
  const { describeAyahRange, ayahRef } = await import("../src/hifz/ayahs.js");
  assert.equal(describeAyahRange(page(2)), "Al-Baqarah 1 – 5");
  assert.equal(describeAyahRange(toSet([page(45), page(46)])[0]), "Al-Baqarah 265 – 274");
  assert.equal(describeAyahRange(page(582)), "An-Naba 1 – 30");
  assert.equal(describeAyahRange(page(604)), "Al-Ikhlas 1 – An-Nas 6");
  assert.match(describeAyahRange([pageToUnit(45, 1), pageToUnit(45, 6)]), /^≈ Al-Baqarah 265/);
  assert.deepEqual(ayahRef(6236), { surah: 114, ayah: 6 });
  assert.deepEqual(ayahRef(8), { surah: 2, ayah: 1 });
});

test("Short Muraja'ah ends right before today's New Hifz (New = Adh-Dhariyat 31 → Short ends at Adh-Dhariyat 30)", async () => {
  const { describeAyahRange } = await import("../src/hifz/ayahs.js");
  for (const [n, expected] of [[1, "Adh-Dhariyat 7 – 30"], [2, "Qaf 36 – Adh-Dhariyat 30"], [3, "Qaf 16 – Adh-Dhariyat 30"]]) {
    const { repo } = await setup({ currentUnit: pageToUnit(522), newTarget: PAGE, shortTarget: n * PAGE });
    const t = await day(repo, MON);
    assert.equal(describeAyahRange(toSet(t.todayRows.new.segments)[0]), "Adh-Dhariyat 31 – 51");
    assert.equal(describeAyahRange(toSet(t.todayRows.short.segments)[0]), expected);
  }
  // Mid-page: if New Hifz starts at line 8 of a page, Short ends at line 7½ of that page.
  const { repo } = await setup({ currentUnit: pageToUnit(522, 8), newTarget: PAGE / 2, shortTarget: PAGE });
  const t = await day(repo, MON);
  assert.deepEqual(toSet(t.todayRows.short.segments), [[pageToUnit(521, 8), pageToUnit(522, 8)]]);
  assert.equal(toSet(t.todayRows.short.segments)[0][1], toSet(t.todayRows.new.segments)[0][0]);
});

test("ayah count for the Dashboard tracker (out of 6236)", async () => {
  const { countAyahs } = await import("../src/hifz/ayahs.js");
  assert.equal(countAyahs([[0, pageToUnit(605)]]), 6236);
  assert.equal(countAyahs([page(2)]), 5); // Al-Baqarah 1–5
  assert.equal(countAyahs([[pageToUnit(582), pageToUnit(605)]]), 564); // Juz 30
  assert.equal(countAyahs(pages(2, 3, 50)), countAyahs([page(2)]) + countAyahs([page(3)]) + countAyahs([page(50)]));
});
