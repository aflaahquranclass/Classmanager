// Hifz exam question generator.
//
// From the juz a student is being examined on, builds a set of questions in
// random order. Every question is "recite 5 lines from here".
// "Surah end" questions start at the ayah nearest to the 3rd last line of a
// surah, so the student recites the end of the surah and carries on into the
// next one. A Muraja'ah exam has 1 of these, a New juz exam has 3. Inside
// long surahs a juz may have fewer surah ends than that, so the rest become
// "page end" questions: they start at the ayah nearest the 3rd last line of a
// page and carry on onto the next page. The
// remaining questions start at random ayahs spread across the selected juz. Ayahs are numbered 1–6236 straight through the Quran (see hifz/ayahs.js).

import { SURAH_AYAH_COUNTS, PAGE_FIRST_AYAH, TOTAL_AYAHS, ayahRef } from "../hifz/ayahs.js";
import { JUZ_START_PAGES, SURAHS, TOTAL_PAGES, LINES_PER_PAGE } from "../hifz/quran.js";
import { AYAH_START_LINE, AYAH_END_LINE, AYAH_START_POS, AYAH_END_POS } from "../hifz/ayahLines.js";

export const MAX_QUESTIONS = 30;
export const LINES_PER_QUESTION = 5;

// Surah-end questions start this many lines from the end of the surah
// (counting the surah's last line as 1).
export const SURAH_END_LINE = 3;

// surahEnd: how many questions start near the end of a surah.
export const EXAM_TYPES = {
  muraja: { label: "Muraja'ah exam", surahEnd: 1 },
  new_juz: { label: "New juz exam", surahEnd: 3 },
};
export const examTypeLabel = (type) => EXAM_TYPES[type]?.label || EXAM_TYPES.muraja.label;

// SURAH_FIRST[s - 1] = global number of ayah 1 of surah s (with a sentinel at the end).
const SURAH_FIRST = SURAH_AYAH_COUNTS.reduce((acc, n, i) => [...acc, acc[i] + n], [1]);
const surahLast = (s) => SURAH_FIRST[s] - 1;
const isSurahLast = (n) => n === surahLast(ayahRef(n).surah);

// The ayah of surah s that starts nearest to its 3rd last line (on a tie, the
// earlier one, so the student recites at least those lines).
export function surahEndStart(s) {
  const last = surahLast(s);
  const target = AYAH_END_LINE[last - 1] - (SURAH_END_LINE - 1);
  let best = last;
  for (let n = last; n >= SURAH_FIRST[s - 1]; n--) {
    const d = Math.abs(AYAH_START_LINE[n - 1] - target);
    if (d <= Math.abs(AYAH_START_LINE[best - 1] - target)) best = n;
    if (AYAH_START_LINE[n - 1] < target - SURAH_END_LINE) break;
  }
  return best;
}

// The ayah starting on page p nearest to its 3rd last line (on a tie, the
// earlier one).
export function pageEndStart(p) {
  const target = p * LINES_PER_PAGE - SURAH_END_LINE;
  let best = null;
  for (let n = PAGE_FIRST_AYAH[p - 1]; n <= TOTAL_AYAHS && AYAH_START_LINE[n - 1] < p * LINES_PER_PAGE; n++) {
    if (best == null || Math.abs(AYAH_START_LINE[n - 1] - target) < Math.abs(AYAH_START_LINE[best - 1] - target)) best = n;
  }
  return best;
}

// [first, end) global ayah numbers of a juz. Every juz in the Madinah Mushaf
// starts at the top of a page.
export function juzAyahRange(juz) {
  const first = PAGE_FIRST_AYAH[JUZ_START_PAGES[juz - 1] - 1];
  const end = juz >= 30 ? TOTAL_AYAHS + 1 : PAGE_FIRST_AYAH[JUZ_START_PAGES[juz] - 1];
  return [first, end];
}

// Mushaf page an ayah starts on.
export function pageOfAyah(n) {
  let lo = 1, hi = TOTAL_PAGES;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (PAGE_FIRST_AYAH[mid - 1] <= n) lo = mid; else hi = mid - 1;
  }
  return lo;
}

// Ayah number with its surah, ayah-in-surah, and the page and line it starts on.
export function describeAyah(n) {
  const { surah, ayah } = ayahRef(n);
  const line = AYAH_START_LINE[n - 1];
  return { number: n, surah, surahName: SURAHS[surah - 1].name, ayah, page: Math.floor(line / LINES_PER_PAGE) + 1, line: (line % LINES_PER_PAGE) + 1 };
}

// Picks one item from each of `k` equal slices of `list`, so picks are spread out.
function spreadPick(list, k, random) {
  const picks = [];
  for (let i = 0; i < k; i++) {
    const from = Math.floor((i * list.length) / k);
    const to = Math.floor(((i + 1) * list.length) / k);
    if (to > from) picks.push(list[from + Math.floor(random() * (to - from))]);
  }
  return picks;
}

export function normalizeJuz(juz) {
  return [...new Set((juz || []).map(Number))].filter((j) => Number.isInteger(j) && j >= 1 && j <= 30).sort((a, b) => a - b);
}

// How many Mushaf lines of Quran text ayahs first..last fill, counting part
// lines (an ayah starting halfway along a line adds half a line). Surah title
// and basmala lines don't count.
export function passageLines(first, last) {
  let total = 0;
  for (let n = first; n <= last; n++) total += AYAH_END_POS[n - 1] - AYAH_START_POS[n - 1];
  return total;
}

// Last ayah of a "recite `lines` lines" passage starting at ayah `start`: the
// first ayah that brings it to at least that many lines, so a 5-line question
// is 5 lines or a little more (about 5½, unless the last ayah is long).
export function passageEnd(start, lines = LINES_PER_QUESTION) {
  let total = 0;
  for (let n = start; n <= TOTAL_AYAHS; n++) {
    total += AYAH_END_POS[n - 1] - AYAH_START_POS[n - 1];
    if (total >= lines - 1e-9) return n;
  }
  return TOTAL_AYAHS;
}

// [first, last] ayah numbers a question asks the student to recite, always
// worked out from its starting ayah (so questions generated earlier get the
// current rule too). A surah-end passage always reaches at least the next
// surah's first ayah; a page-end passage always carries on onto the next page.
export function questionRange(q) {
  const start = q.prompt.number;
  let end = passageEnd(start, q.lines || LINES_PER_QUESTION);
  if (q.kind === "surah_end") end = Math.max(end, (q.nextSurah || q.expected).number);
  if (q.kind === "page_end") while (end < TOTAL_AYAHS && AYAH_END_LINE[end - 1] < q.prompt.page * LINES_PER_PAGE) end++;
  return [start, Math.min(end, TOTAL_AYAHS)];
}

// Preferred passage lengths, best first: 5 to ~5½ lines; longer only where
// the juz has too few such starting points (e.g. long ayahs in Al-Baqarah).
const LENGTH_TIERS = [5.6, 6.5, Infinity];

// Keeps the starting ayahs in the best length tier that still has `needed` of them.
function preferLength(starts, lengthOf, needed) {
  for (const max of LENGTH_TIERS) {
    const ok = starts.filter((n) => lengthOf(n) <= max);
    if (ok.length >= needed || max === Infinity) return ok;
  }
  return starts;
}

// Random order (Fisher–Yates).
function shuffle(list, random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// generateExamQuestions({ type: "new_juz", juz: [29, 30], count: 5 }) →
// questions in random order. `random` is injectable for tests.
export function generateExamQuestions({ type = "muraja", juz, count, random = Math.random }) {
  const rules = EXAM_TYPES[type];
  if (!rules) throw new Error("Unknown exam type.");
  const juzList = normalizeJuz(juz);
  if (!juzList.length) throw new Error("Choose at least one juz.");
  const total = Math.floor(Number(count));
  if (!(total >= 1 && total <= MAX_QUESTIONS)) throw new Error(`Number of questions must be between 1 and ${MAX_QUESTIONS}.`);

  // No question starts in Al-Fatihah.
  const ranges = juzList.map(juzAyahRange).map(([a, b]) => [Math.max(a, SURAH_FIRST[1]), b]);
  const inRange = (n) => ranges.some(([a, b]) => n >= a && n < b);

  // Where a question starting at ayah n would end, and how many lines it is.
  const passage = (kind) => (n) => {
    const nextSurah = kind === "surah_end" ? { number: surahLast(ayahRef(n).surah) + 1 } : null;
    const [a, b] = questionRange({ kind, lines: LINES_PER_QUESTION, prompt: { number: n, page: pageOfAyah(n) }, nextSurah, expected: { number: n + 1 } });
    return { end: b, lines: passageLines(a, b) };
  };
  const endPassage = passage("surah_end");
  const pagePassage = passage("page_end");
  const randomPassage = passage("continue");
  // The whole passage must be inside the selected juz and a full 5 lines.
  const fits = ({ end, lines }) => inRange(end) && lines >= LINES_PER_QUESTION - 1e-9;

  // A surah end counts when its whole passage, into the next surah, is
  // inside the selected juz.
  let starts = [];
  for (let s = 1; s < SURAHS.length; s++) {
    const start = surahEndStart(s);
    if (inRange(start) && fits(endPassage(start))) starts.push(start);
  }
  const endCount = Math.min(rules.surahEnd, total, starts.length);
  starts = preferLength(starts, (n) => endPassage(n).lines, endCount);
  const ends = spreadPick(starts, endCount, random);

  // Not enough surah ends (a long surah): the rest of that quota start near
  // the end of a page and carry on onto the next page, staying in one surah.
  const pageEndCount = Math.min(rules.surahEnd, total) - ends.length;
  let pageStarts = [];
  if (pageEndCount > 0) {
    for (let p = 1; p < TOTAL_PAGES; p++) {
      const start = pageEndStart(p);
      if (start == null || !inRange(start) || ends.includes(start)) continue;
      const pp = pagePassage(start);
      if (!fits(pp) || ayahRef(pp.end).surah !== ayahRef(start).surah || isSurahLast(pp.end)) continue;
      pageStarts.push(start);
    }
  }
  const pageCount = Math.min(pageEndCount, pageStarts.length);
  pageStarts = preferLength(pageStarts, (n) => pagePassage(n).lines, pageCount);
  const pageEnds = spreadPick(pageStarts, pageCount, random);

  // Random questions never start on a surah's last ayah (that's a surah-end
  // question) and never repeat a surah-end or page-end start.
  const taken = new Set([...ends, ...pageEnds]);
  let pool = [];
  for (const [a, b] of ranges) for (let n = a; n < b; n++) if (!isSurahLast(n) && !taken.has(n) && fits(randomPassage(n))) pool.push(n);
  const randomCount = Math.min(total - ends.length - pageEnds.length, pool.length);
  pool = preferLength(pool, (n) => randomPassage(n).lines, randomCount);
  const randoms = spreadPick(pool, randomCount, random);

  const make = (kind) => (n) => ({
    kind,
    lines: LINES_PER_QUESTION,
    prompt: describeAyah(n),
    expected: describeAyah(n + 1),
    nextSurah: kind === "surah_end" ? describeAyah(surahLast(ayahRef(n).surah) + 1) : null,
  });
  return shuffle([...ends.map(make("surah_end")), ...pageEnds.map(make("page_end")), ...randoms.map(make("continue"))], random);
}

// "Juz 29, 30"
export const describeJuzList = (juz) => (normalizeJuz(juz).length ? `Juz ${normalizeJuz(juz).join(", ")}` : "—");

// One-line description for lists and printouts.
export function describeQuestion(q) {
  const p = q.prompt;
  if (q.kind === "surah_end") return `End of ${p.surahName} (ayah ${p.ayah}) → into ${q.nextSurah?.surahName || q.expected.surahName}`;
  if (q.kind === "page_end") return `End of page ${p.page} (${p.surahName} ${p.ayah}) → into page ${p.page + 1}`;
  return `Continue from ${p.surahName} ${p.ayah}`;
}
