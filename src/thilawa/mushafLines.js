// Lines of one Madinah Mushaf page from quran.com's qdc /verses/by_page data
// (mushaf=1, words with code_v2, line_number and page_number). Lines with no
// words are surah titles and basmalas, worked out the way the printed Mushaf
// lays them out:
//  - before a surah's first line: its title, then its basmala (At-Tawbah has
//    no basmala; Al-Fatihah's basmala is its first ayah);
//  - only one empty line before it: the basmala — the title is the last line
//    of the previous page;
//  - empty lines at the bottom of a page: the next surah's title (and its
//    basmala when there are two).
// Pages 1 and 2 use lines 8–15 (they sit lower, in a decorated block).
//
// → [{ kind: "words", line, words: [{ code, end, key, verseKey, position, text }] }
//    | { kind: "surah", line, surah } | { kind: "basmala", line } | { kind: "blank", line }]
export function buildLines(page, verses) {
  const first = page <= 2 ? 8 : 1;
  const total = 15;
  const byLine = new Map();
  const startsAt = new Map(); // line → surah whose first ayah begins there
  for (const v of verses) {
    const [surah, ayah] = v.verse_key.split(":").map(Number);
    // Only the words printed on this page (a crossing ayah may bring others).
    const words = v.words.filter((w) => w.page_number == null || w.page_number === page);
    for (const w of words) {
      if (!byLine.has(w.line_number)) byLine.set(w.line_number, []);
      byLine.get(w.line_number).push({
        code: w.code_v2, end: w.char_type_name === "end", key: `${v.verse_key}:${w.position}`,
        verseKey: v.verse_key, position: w.position, text: w.text_uthmani || "",
      });
    }
    if (ayah === 1 && words.length) startsAt.set(words[0].line_number, surah);
  }
  const lastSurah = verses.length ? +verses[verses.length - 1].verse_key.split(":")[0] : 1;
  const lines = [];
  let n = first;
  while (n <= total) {
    if (byLine.has(n)) { lines.push({ kind: "words", line: n, words: byLine.get(n) }); n += 1; continue; }
    let m = n;
    while (m <= total && !byLine.has(m)) m += 1;
    const atEnd = m > total;
    const surah = atEnd ? lastSurah + 1 : startsAt.get(m);
    const hasBasmala = surah !== 1 && surah !== 9;
    let kinds;
    if (surah == null || surah > 114) kinds = [];
    else if (atEnd) kinds = m - n >= 2 && hasBasmala ? ["surah", "basmala"] : ["surah"];
    else if (!hasBasmala) kinds = ["surah"];
    else kinds = m - n >= 2 ? ["surah", "basmala"] : ["basmala"];
    // Title/basmala sit next to the text they belong to; any other empty line stays blank.
    const run = Array.from({ length: m - n }, () => "blank");
    if (atEnd) run.splice(0, kinds.length, ...kinds);
    else run.splice(run.length - kinds.length, kinds.length, ...kinds);
    run.forEach((kind, i) => lines.push(kind === "surah" ? { kind, line: n + i, surah } : { kind, line: n + i }));
    n = m;
  }
  return lines;
}
