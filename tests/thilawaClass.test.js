import test from "node:test";
import assert from "node:assert/strict";
import { createClassMemoryStore, createMemoryClassRepo } from "../src/thilawa/repos.js";
import { readingAyahs, readingTitle, ayahPages } from "../src/thilawa/engine.js";
import { portionAyahs } from "../src/hifz/tasks.js";
import { pageToUnit } from "../src/hifz/quran.js";

test("a class has one reading open until the teacher changes it; the page where it stopped is kept", async () => {
  const store = createClassMemoryStore();
  const teacher = createMemoryClassRepo(store, "class-a", { teacherId: "t1" });
  const student = createMemoryClassRepo(store, "class-a", { asStudent: true });
  const other = createMemoryClassRepo(store, "class-b", { asStudent: true });
  assert.equal(await student.getReading(), null);

  const mulk = ayahPages(67, 1, 15);
  const r = await teacher.openReading({ fromPage: mulk.fromPage, toPage: mulk.toPage, firstAyah: mulk.first, lastAyah: mulk.last, label: mulk.label });
  assert.equal(r.page, 562); // opens at its first page
  await teacher.setReadingPage(r.id, 563);
  const seen = await student.getReading();
  assert.deepEqual([seen.label, seen.page, seen.fromPage, seen.toPage], ["Al-Mulk 1–15", 563, 562, 563]);
  assert.equal(await other.getReading(), null); // another class doesn't see it

  // Changing it ends the old one; only the new one is open.
  await teacher.openReading({ fromPage: 564, toPage: 565, label: "" });
  const now = await student.getReading();
  assert.deepEqual([now.fromPage, now.page, readingTitle(now)], [564, 564, "Al-Qalam"]);
  const all = await teacher.listReadings();
  assert.equal(all.length, 2);
  assert.equal(all.filter((x) => !x.endedAt).length, 1);

  // Students can't change it.
  await assert.rejects(student.openReading({ fromPage: 1, toPage: 1 }));
  await assert.rejects(student.setReadingPage(now.id, 2));
});

test("Tajweed topics: the teacher adds and removes them, the class sees them newest first", async () => {
  const store = createClassMemoryStore();
  const teacher = createMemoryClassRepo(store, "c", { teacherId: "t1" });
  const student = createMemoryClassRepo(store, "c", { asStudent: true });
  await teacher.addTopic({ topic: "Ikhfa", taughtOn: "2026-11-03" });
  await teacher.addTopic({ topic: " Madd tabee'i ", note: "2 counts", taughtOn: "2026-11-05" });
  assert.deepEqual((await student.listTopics()).map((t) => [t.topic, t.taughtOn]), [["Madd tabee'i", "2026-11-05"], ["Ikhfa", "2026-11-03"]]);
  await assert.rejects(student.addTopic({ topic: "x" }));
  const [first] = await teacher.listTopics();
  await teacher.deleteTopic(first.id);
  assert.deepEqual((await student.listTopics()).map((t) => t.topic), ["Ikhfa"]);
});

test("ayahs of a class reading and of a Hifz portion, for colouring their ayah numbers", () => {
  const mulk = ayahPages(67, 1, 15);
  assert.deepEqual(readingAyahs({ fromPage: 562, toPage: 563, firstAyah: mulk.first, lastAyah: mulk.last }), { first: mulk.first, last: mulk.last });
  assert.equal(mulk.last - mulk.first, 14);
  // Pages only: every ayah starting on them (page 1 = Al-Fatihah 1–7).
  assert.deepEqual(readingAyahs({ fromPage: 1, toPage: 1 }), { first: 1, last: 7 });
  // A whole page of Hifz: page 2 starts at Al-Baqarah 1 (ayah 8).
  const p2 = portionAyahs([pageToUnit(2), pageToUnit(3)]);
  assert.equal(p2.first, 8);
  assert.ok(p2.last >= p2.first);
});
