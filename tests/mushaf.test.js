import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLines } from "../src/thilawa/mushafLines.js";
import { PAGE_FIRST_AYAH, ayahRef } from "../src/hifz/ayahs.js";

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
