import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLines } from "../src/thilawa/mushafLines.js";
import { PAGE_FIRST_AYAH, ayahRef } from "../src/hifz/ayahs.js";
import { describeAyahs, ayahAtLine, unitOfAyah } from "../src/hifz/tasks.js";
import { pageToUnit } from "../src/hifz/quran.js";

const w = (position, line, page) => ({ position, line_number: line, page_number: page, code_v2: `g${position}`, char_type_name: "word" });
const ref = (n) => { const r = ayahRef(n); return `${r.surah}:${r.ayah}`; };

test("page starts match quran.com", () => {
  assert.equal(ref(PAGE_FIRST_AYAH[569 - 1]), "70:11");
  assert.equal(ref(PAGE_FIRST_AYAH[570 - 1]), "70:41"); // 70:40 ends page 569
  assert.equal(ref(PAGE_FIRST_AYAH[592 - 1]), "87:11");
  assert.equal(ref(PAGE_FIRST_AYAH[604 - 1]), "112:1");
});

test("a surah title on the last line of a page; the basmala starts the next page", () => {
  const end = buildLines(76, [{ verse_key: "3:200", words: Array.from({ length: 14 }, (_, i) => w(i + 1, i + 1, 76)) }]);
  assert.deepEqual(end[14], { kind: "surah", line: 15, surah: 4 });
  const next = buildLines(77, [{ verse_key: "4:1", words: Array.from({ length: 14 }, (_, i) => w(i + 1, i + 2, 77)) }]);
  assert.deepEqual(next[0], { kind: "basmala", line: 1 });
  assert.equal(next.length, 15);
});

test("pages 1 and 2 use lines 8–15", () => {
  const p1 = buildLines(1, [{ verse_key: "1:1", words: [w(1, 9, 1)] }, { verse_key: "1:7", words: [w(1, 15, 1)] }]);
  assert.equal(p1.length, 8);
  assert.deepEqual(p1[0], { kind: "surah", line: 8, surah: 1 }); // Al-Fatihah: title only
  const p2 = buildLines(2, [{ verse_key: "2:1", words: [w(1, 10, 2)] }, { verse_key: "2:5", words: [w(1, 15, 2)] }]);
  assert.deepEqual(p2.slice(0, 2).map((l) => l.kind), ["surah", "basmala"]);
});

test("an ayah crossing pages only shows its words on the page they're printed on", () => {
  const verses = [
    { verse_key: "70:40", words: [w(1, 15, 569), w(2, 15, 569)] },
    { verse_key: "70:41", words: [w(1, 1, 570)] },
  ];
  const lines = buildLines(570, verses);
  assert.equal(lines[0].words.length, 1);
  assert.ok(lines.every((l) => l.kind !== "words" || l.words.every((x) => !x.key.startsWith("70:40"))));
});

test("ayah numbers for a portion follow quran.com's lines", () => {
  // Al-A'raf starts on page 151 (its title and basmala take lines 1–2).
  assert.equal(describeAyahs([pageToUnit(151), pageToUnit(152)]).startsWith("Al-A'raf 1 –"), true);
  // Page 569 ends with 70:40 (Al-Ma'arij 40).
  const last = ayahAtLine(pageToUnit(570) - 1, "end");
  assert.deepEqual([last.surah, last.ayah], [70, 40]);
  assert.equal(describeAyahs([pageToUnit(604), pageToUnit(605)]), "Al-Ikhlas 1 – An-Nas 6");
});

test("choosing a surah and ayah lands on its page and line, and back", () => {
  assert.equal(unitOfAyah(7, 58), pageToUnit(158, 1));        // Al-A'raf 58 starts on p. 158, line 1
  assert.equal(unitOfAyah(7, 67, "end"), pageToUnit(158, 15)); // Al-A'raf 67 ends on p. 158, line 15
  // Ayat al-Kursi starts mid-line, after the end of 2:254: its line holds both.
  const u = unitOfAyah(2, 255);
  assert.deepEqual([ayahAtLine(u, "start").ayah, ayahAtLine(u, "end").ayah >= 255], [254, true]);
  assert.equal(unitOfAyah(9, 1), pageToUnit(187, 2));         // At-Tawbah: title on line 1, no basmala
});
