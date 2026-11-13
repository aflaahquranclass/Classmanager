// Check my Reading: compares what the speech model heard with the words the
// student should be reciting. Arabic is compared in a plain spelling (no
// vowel marks, one form of alef/yaa/taa marbuta), word by word, allowing
// small spelling differences, so only real mistakes count:
//   wrong   – a different word was said in its place
//   skipped – the student went past it without saying it
//   ok      – said correctly
//   pending – not reached yet
// Words the student adds that aren't in the passage are counted as `extra`.

const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g; // harakat, Quranic signs, tatweel

export function normalizeArabic(s) {
  return (s || "")
    .replace(MARKS, "")
    .replace(/[آأإٱٲٳ]/g, "ا") // آ أ إ ٱ → ا
    .replace(/ى/g, "ي") // ى → ي
    .replace(/ة/g, "ه") // ة → ه
    .replace(/ؤ/g, "و") // ؤ → و
    .replace(/ئ/g, "ي") // ئ → ي
    .replace(/ء/g, "") // ء
    .replace(/[^ء-ي\s]/g, " ") // anything else (digits, punctuation) is a space
    .replace(/\s+/g, " ")
    .trim();
}

export const splitWords = (s) => normalizeArabic(s).split(" ").filter(Boolean);

// 0..1: how alike two words are (1 - edit distance / longer length).
export function similarity(a, b) {
  if (a === b) return 1;
  const m = a.length, n = b.length;
  if (!m || !n) return 0;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}

// The disjoint letters that open some surahs are recited by their names
// (الم → "ألف لام ميم"); in plain spelling, without hamza.
const SPELLED = {
  "الم": "الف لام ميم", "المص": "الف لام ميم صاد", "الر": "الف لام را", "المر": "الف لام ميم را",
  "كهيعص": "كاف ها يا عين صاد", "طه": "طا ها", "طسم": "طا سين ميم", "طس": "طا سين", "يس": "يا سين",
  "ص": "صاد", "حم": "حا ميم", "عسق": "عين سين قاف", "ق": "قاف", "ن": "نون",
};

// Short words must match closely; longer ones may differ by a letter or two.
// Words whose lengths alone are too far apart are turned down without
// comparing letters.
function isSame(heard, expected) {
  if (heard === expected) return true;
  const need = expected.length <= 3 ? 0.67 : 0.75;
  const longer = Math.max(heard.length, expected.length);
  if (1 - Math.abs(heard.length - expected.length) / longer < need) return false;
  return similarity(heard, expected) >= need;
}

// How far from where the student has reached the matching looks: back (a
// word repeated) and ahead (words skipped). Keeping to this window makes each
// update quick however long the passage is.
const BACK = 40;
const AHEAD = 120;
const INF = 1e9;
// Steps: 1 ok, 2 wrong, 3 skip, 4 extra, 10 + k: one word heard as k words.
const OK = 1, WRONG = 2, SKIP = 3, EXTRA = 4;

// Aligns the heard words with the start of the expected words (the student
// recites from the beginning and may not have finished): the cheapest way to
// explain what was heard, where the untouched end of the passage is free.
// expected: plain-spelling words (see splitWords). Returns { status, extra, reached }.
// cache (optional, any object kept between calls): while the student recites,
// the words heard so far are only added to at the end, so the work for the
// words already matched is kept and only the new ones are matched.
export function alignRecitation(heard, expected, cache = null) {
  const n = heard.length, m = expected.length;
  // Row i (the first i heard words) is kept for expected words lo[i]..hi[i];
  // outside that, and j = 0 (only extras), are worked out on the spot.
  let rows = [], lo = [], hi = [], keep = 0;
  if (cache && cache.expected === expected && cache.rows) {
    const prev = cache.heard;
    const max = Math.min(prev.length, n);
    while (keep < max && prev[keep] === heard[keep]) keep++;
    rows = cache.rows.slice(0, keep + 1); lo = cache.lo.slice(0, keep + 1); hi = cache.hi.slice(0, keep + 1);
  } else {
    const h0 = Math.min(m, AHEAD);
    const r0 = { cost: new Float64Array(h0 + 1), step: new Uint8Array(h0 + 1) };
    for (let j = 1; j <= h0; j++) { r0.cost[j] = j; r0.step[j] = SKIP; }
    rows = [r0]; lo = [1]; hi = [h0];
  }
  const cost = (i, j) => (j === 0 ? i : j < lo[i] || j > hi[i] ? INF : rows[i].cost[j - lo[i] + (i === 0 ? 1 : 0)]);
  const step = (i, j) => (j === 0 ? (i ? EXTRA : 0) : j < lo[i] || j > hi[i] ? 0 : rows[i].step[j - lo[i] + (i === 0 ? 1 : 0)]);

  for (let i = rows.length; i <= n; i++) {
    // Centre the window on where the student had reached one word earlier.
    let centre = 0, best = cost(i - 1, 0);
    for (let j = lo[i - 1]; j <= hi[i - 1]; j++) { const c = cost(i - 1, j); if (c <= best) { best = c; centre = j; } }
    const a = Math.max(1, centre + 1 - BACK), b = Math.min(m, centre + 1 + AHEAD);
    lo[i] = a; hi[i] = Math.max(a - 1, b);
    const width = Math.max(0, hi[i] - a + 1);
    const row = { cost: new Float64Array(width), step: new Uint8Array(width) };
    rows[i] = row;
    const h = heard[i - 1];
    for (let j = a; j <= hi[i]; j++) {
      const e = expected[j - 1];
      const same = isSame(h, e);
      let c = cost(i - 1, j - 1) + (same ? 0 : 1), s = same ? OK : WRONG;
      const skip = (j - 1 >= a ? row.cost[j - 1 - a] : cost(i, j - 1)) + 1;
      if (skip < c) { c = skip; s = SKIP; }
      const extra = cost(i - 1, j) + 1;
      if (extra < c) { c = extra; s = EXTRA; }
      // Opening letters said by their names: as many heard words as letters.
      const spelled = SPELLED[e];
      if (spelled) {
        const k = spelled.split(" ").length;
        if (i >= k) {
          const ck = cost(i - k, j - 1);
          if (ck < c && similarity(heard.slice(i - k, i).join(""), spelled.replace(/ /g, "")) >= 0.8) { c = ck; s = 10 + k; }
        }
      }
      // The model sometimes splits one word in two (لابثين → لا بسين); only
      // when the two parts together are about the word's length.
      if (i >= 2 && Math.abs(heard[i - 2].length + h.length - e.length) <= 1) {
        const c2 = cost(i - 2, j - 1);
        if (c2 < c && isSame(heard[i - 2] + h, e)) { c = c2; s = 12; }
      }
      row.cost[j - a] = c; row.step[j - a] = s;
    }
  }
  if (cache) Object.assign(cache, { expected, heard, rows, lo, hi });

  // Where the student has reached: the cheapest end point for all heard words
  // (ties go to the furthest point that ends on a matched word).
  let reached = 0;
  for (let j = lo[n]; j <= hi[n]; j++) {
    const c = cost(n, j), r = cost(n, reached);
    if (c < r || (c === r && (step(n, j) === OK || step(n, j) > 10))) reached = j;
  }

  const status = new Array(m).fill("pending");
  let extra = 0;
  let i = n, j = reached;
  while (i > 0 || j > 0) {
    const s = step(i, j);
    if (s === OK || s === WRONG) { status[j - 1] = s === OK ? "ok" : "wrong"; i -= 1; j -= 1; }
    else if (s > 10) { status[j - 1] = "ok"; i -= s - 10; j -= 1; }
    else if (s === SKIP) { status[j - 1] = "skipped"; j -= 1; }
    else if (s === EXTRA) { extra += 1; i -= 1; }
    else break; // outside the window: can't happen on the cheapest path
  }
  return { status, extra, reached };
}
