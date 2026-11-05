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

// Short words must match closely; longer ones may differ by a letter or two.
const isSame = (heard, expected) => similarity(heard, expected) >= (expected.length <= 3 ? 0.67 : 0.75);

// Aligns the heard words with the start of the expected words (the student
// recites from the beginning and may not have finished): the cheapest way to
// explain what was heard, where the untouched end of the passage is free.
// expected: plain-spelling words (see splitWords). Returns { status, extra, reached }.
export function alignRecitation(heard, expected) {
  const n = heard.length, m = expected.length;
  const INF = 1e9;
  // cost[i][j]: first i heard words against first j expected words.
  const cost = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(INF));
  const step = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(""));
  cost[0][0] = 0;
  for (let j = 1; j <= m; j++) { cost[0][j] = j; step[0][j] = "skip"; }
  for (let i = 1; i <= n; i++) {
    cost[i][0] = i; step[i][0] = "extra";
    for (let j = 1; j <= m; j++) {
      const same = isSame(heard[i - 1], expected[j - 1]);
      const options = [
        [cost[i - 1][j - 1] + (same ? 0 : 1), same ? "ok" : "wrong"],
        [cost[i][j - 1] + 1, "skip"],
        [cost[i - 1][j] + 1, "extra"],
      ];
      // The model sometimes splits one word in two (لابثين → لا بسين).
      // Only when the two parts together are about the word's length.
      if (i >= 2) {
        const joined = heard[i - 2] + heard[i - 1];
        if (Math.abs(joined.length - expected[j - 1].length) <= 1 && isSame(joined, expected[j - 1])) options.push([cost[i - 2][j - 1], "ok2"]);
      }
      const best = options.reduce((a, b) => (b[0] < a[0] ? b : a));
      cost[i][j] = best[0]; step[i][j] = best[1];
    }
  }
  // Where the student has reached: the cheapest end point for all heard words
  // (ties go to the furthest point that ends on a matched word).
  let reached = 0;
  for (let j = 1; j <= m; j++) if (cost[n][j] < cost[n][reached] || (cost[n][j] === cost[n][reached] && (step[n][j] === "ok" || step[n][j] === "ok2"))) reached = j;

  const status = new Array(m).fill("pending");
  let extra = 0;
  let i = n, j = reached;
  while (i > 0 || j > 0) {
    const s = step[i][j];
    if (s === "ok" || s === "wrong") { status[j - 1] = s; i -= 1; j -= 1; }
    else if (s === "ok2") { status[j - 1] = "ok"; i -= 2; j -= 1; }
    else if (s === "skip") { status[j - 1] = "skipped"; j -= 1; }
    else { extra += 1; i -= 1; }
  }
  return { status, extra, reached };
}
