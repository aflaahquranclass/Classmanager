import { test } from "node:test";
import assert from "node:assert/strict";
import { generateExamQuestions, juzAyahRange, pageOfAyah, describeAyah, surahEndStart, pageEndStart, passageEnd, passageLines, questionRange } from "../src/exams/questions.js";
import { AYAH_START_LINE, AYAH_END_LINE } from "../src/hifz/ayahLines.js";
import { SURAH_AYAH_COUNTS } from "../src/hifz/ayahs.js";

// Deterministic "random" numbers for repeatable tests.
function seeded(seed = 1) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

test("juz ranges cover the Quran without gaps", () => {
  assert.deepEqual(juzAyahRange(1), [1, 149]); // Al-Baqarah 141 is the last ayah of juz 1
  assert.equal(juzAyahRange(30)[1], 6237);
  for (let j = 1; j < 30; j++) assert.equal(juzAyahRange(j)[1], juzAyahRange(j + 1)[0]);
});

test("ayah positions", () => {
  assert.equal(pageOfAyah(1), 1);
  assert.equal(pageOfAyah(8), 2);
  assert.equal(pageOfAyah(6236), 604);
  assert.deepEqual(describeAyah(6236), { number: 6236, surah: 114, surahName: "An-Nas", ayah: 6, page: 604, line: 15 });
  assert.deepEqual(describeAyah(6224), { number: 6224, surah: 112, surahName: "Al-Ikhlas", ayah: 3, page: 604, line: 3 });
});

test("line data covers every ayah in order", () => {
  assert.equal(AYAH_START_LINE.length, 6236);
  for (let i = 1; i < 6236; i++) assert.ok(AYAH_START_LINE[i] >= AYAH_START_LINE[i - 1]);
  for (let i = 0; i < 6236; i++) assert.ok(AYAH_END_LINE[i] >= AYAH_START_LINE[i]);
  assert.equal(AYAH_END_LINE[6235], 604 * 15 - 1);
});

const surahFirst = (s) => 1 + SURAH_AYAH_COUNTS.slice(0, s - 1).reduce((a, b) => a + b, 0);
const surahLastAyah = (s) => surahFirst(s + 1) - 1;

test("surah-end start is the ayah nearest the surah's 3rd last line", () => {
  for (let s = 1; s <= 114; s++) {
    const target = AYAH_END_LINE[surahLastAyah(s) - 1] - 2;
    const n = surahEndStart(s);
    assert.ok(n >= surahFirst(s) && n <= surahLastAyah(s));
    const best = Math.min(...Array.from({ length: SURAH_AYAH_COUNTS[s - 1] }, (_, i) => Math.abs(AYAH_START_LINE[surahFirst(s) + i - 1] - target)));
    assert.equal(Math.abs(AYAH_START_LINE[n - 1] - target), best, `surah ${s}`);
  }
  // Al-Mulk ends on line 5 of page 564 (Al-Qalam starts on that page); its 3rd last line is line 3, where ayah 29 starts.
  assert.deepEqual([describeAyah(surahEndStart(67)).ayah, describeAyah(surahEndStart(67)).line], [29, 3]);
});

test("a passage is 5 to about 5½ lines, inside the selected juz, and a surah-end passage reaches the next surah", () => {
  for (const juz of [[1], [2], [29], [30], [26, 27, 28, 29, 30]]) {
    for (let seed = 1; seed < 15; seed++) {
      for (const q of generateExamQuestions({ type: "new_juz", juz, count: 6, random: seeded(seed) })) {
        const [a, b] = questionRange(q);
        const lines = passageLines(a, b);
        assert.ok(lines >= 5, `${lines} lines`);
        assert.ok(lines <= 5.6 + 1e-9, `${q.prompt.surahName} ${q.prompt.ayah}: ${lines} lines`);
        assert.ok(juz.some((j) => { const [x, y] = juzAyahRange(j); return b >= x && b < y; }), "ends inside the selected juz");
        if (q.kind === "surah_end") assert.ok(b >= q.nextSurah.number, "reaches the next surah");
      }
    }
  }
  // Part lines count as part lines: Al-Ikhlas 1 (page 604) → Al-Falaq 5 is exactly 5 lines.
  assert.equal(passageEnd(6222), 6230);
  assert.equal(passageLines(6222, 6230), 5);
  // Questions generated before this rule are measured with it too.
  const old = { kind: "surah_end", lines: 5, prompt: describeAyah(6225), expected: describeAyah(6226), end: describeAyah(6226) };
  assert.ok(passageLines(...questionRange(old)) >= 5);
});

const checkSurahEnd = (q) => {
  assert.equal(q.prompt.number, surahEndStart(q.prompt.surah));
  assert.equal(q.nextSurah.surah, q.prompt.surah + 1);
  assert.equal(q.nextSurah.ayah, 1);
};

test("Muraja'ah exam: 1 question from the end of a surah, rest random, all 5 lines", () => {
  for (let seed = 1; seed < 50; seed++) {
    const qs = generateExamQuestions({ type: "muraja", juz: [30], count: 6, random: seeded(seed) });
    assert.equal(qs.length, 6);
    const ends = qs.filter((q) => q.kind === "surah_end");
    assert.equal(ends.length, 1);
    checkSurahEnd(ends[0]);
    const [a, b] = juzAyahRange(30);
    for (const q of qs) {
      assert.equal(q.lines, 5);
      assert.ok(q.prompt.number >= a && q.prompt.number < b);
    }
    for (const q of qs.filter((x) => x.kind === "continue")) assert.equal(q.expected.surah, q.prompt.surah);
    const nums = qs.map((q) => q.prompt.number);
    assert.equal(new Set(nums).size, nums.length);
  }
});

test("New juz exam: 3 questions from the end of a surah", () => {
  for (let seed = 1; seed < 50; seed++) {
    const qs = generateExamQuestions({ type: "new_juz", juz: [30], count: 5, random: seeded(seed) });
    assert.equal(qs.length, 5);
    const ends = qs.filter((q) => q.kind === "surah_end");
    assert.equal(ends.length, 3);
    for (const q of ends) checkSurahEnd(q);
    assert.equal(new Set(ends.map((q) => q.prompt.surah)).size, 3);
    assert.equal(new Set(qs.map((q) => q.prompt.number)).size, 5);
  }
});

test("questions come out in random order and change between runs", () => {
  const orders = new Set();
  const sets = new Set();
  for (let seed = 1; seed < 20; seed++) {
    const nums = generateExamQuestions({ type: "muraja", juz: [29, 30], count: 6, random: seeded(seed) }).map((q) => q.prompt.number);
    orders.add(nums.join() === [...nums].sort((x, y) => x - y).join());
    sets.add([...nums].sort().join());
  }
  assert.ok(orders.has(false), "some exams are not in Mushaf order");
  assert.ok(sets.size > 15, "different exams get different questions");
});

test("juz with no surah ending gets page-end questions instead", () => {
  // Juz 2 is entirely inside Al-Baqarah.
  for (const [type, want] of [["muraja", 1], ["new_juz", 3]]) {
    for (let seed = 1; seed < 20; seed++) {
      const qs = generateExamQuestions({ type, juz: [2], count: 5, random: seeded(seed) });
      assert.equal(qs.length, 5);
      assert.ok(qs.every((q) => q.prompt.surah === 2 && q.kind !== "surah_end"));
      const pages = qs.filter((q) => q.kind === "page_end");
      assert.equal(pages.length, want);
      for (const q of pages) {
        assert.equal(q.prompt.number, pageEndStart(q.prompt.page));
        assert.ok(q.prompt.line >= 11, "starts near the end of the page");
        const [, b] = questionRange(q);
        assert.ok(describeAyah(b).page > q.prompt.page || AYAH_END_LINE[b - 1] >= q.prompt.page * 15, "carries on onto the next page");
        assert.equal(describeAyah(b).surah, 2);
      }
      assert.equal(new Set(qs.map((q) => q.prompt.number)).size, 5);
    }
  }
});

test("juz with too few surah endings tops up with page-end questions", () => {
  // Juz 3 has one surah ending (Al-Baqarah → Aal-Imran).
  const qs = generateExamQuestions({ type: "new_juz", juz: [3], count: 5, random: seeded(2) });
  assert.equal(qs.filter((q) => q.kind === "surah_end").length, 1);
  assert.equal(qs.filter((q) => q.kind === "page_end").length, 2);
});

test("surah ending across two selected juz counts; across an unselected one does not", () => {
  // Al-Baqarah ends in juz 3, so selecting juz 3 alone includes Al-Baqarah → Aal-Imran.
  const qs = generateExamQuestions({ type: "muraja", juz: [3], count: 1, random: seeded(5) });
  assert.equal(qs[0].kind, "surah_end");
  assert.equal(qs[0].prompt.surah, 2);
});

test("continue questions are spread across all selected juz", () => {
  const qs = generateExamQuestions({ juz: [1, 2, 3, 4], count: 10, random: seeded(7) });
  const juzHit = new Set(qs.map((q) => [1, 2, 3, 4].find((j) => { const [a, b] = juzAyahRange(j); return q.prompt.number >= a && q.prompt.number < b; })));
  assert.equal(juzHit.size, 4);
});

test("rejects bad input", () => {
  assert.throws(() => generateExamQuestions({ juz: [], count: 3 }));
  assert.throws(() => generateExamQuestions({ juz: [30], count: 0 }));
  assert.throws(() => generateExamQuestions({ juz: [30], count: 31 }));
  assert.throws(() => generateExamQuestions({ type: "other", juz: [30], count: 3 }));
});

test("Arabic surah names and numbers", async () => {
  const { SURAH_NAMES_AR, arabicNumber } = await import("../src/exams/quranText.js");
  assert.equal(SURAH_NAMES_AR.length, 114);
  assert.equal(SURAH_NAMES_AR[66], "الملك");
  assert.equal(SURAH_NAMES_AR[113], "الناس");
  assert.equal(arabicNumber(286), "٢٨٦");
});

test("no question starts in Al-Fatihah", () => {
  for (let seed = 1; seed < 30; seed++) {
    for (const type of ["muraja", "new_juz"]) {
      const qs = generateExamQuestions({ type, juz: [1], count: 10, random: seeded(seed) });
      assert.equal(qs.length, 10);
      assert.ok(qs.every((q) => q.prompt.surah !== 1));
    }
  }
});
