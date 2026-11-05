// The words a student should recite for a task, in order, from quran.com's
// Mushaf data (the same pages the app shows): each word's key (as the Mushaf
// page uses), its page and line, its plain spelling for matching, and the
// ayah-number signs (kept so "Next ayah" knows where an ayah ends).

import { normalizeArabic } from "../readingTest/match.js";
import { pageToUnit, UNITS_PER_LINE } from "../hifz/quran.js";

const API = "https://api.qurancdn.com/api/qdc/verses/by_page";
const cache = new Map(); // page → Promise<words>

export function pageWords(page) {
  if (!cache.has(page)) {
    const p = fetch(`${API}/${page}?words=true&per_page=all&mushaf=1&word_fields=text_uthmani,text_imlaei_simple,line_number,page_number`)
      .then((r) => { if (!r.ok) throw new Error("page"); return r.json(); })
      .then((d) => d.verses.flatMap((v) => v.words
        .filter((w) => w.page_number == null || w.page_number === page)
        .map((w) => ({
          key: `${v.verse_key}:${w.position}`,
          page,
          line: w.line_number,
          end: w.char_type_name === "end",
          plain: normalizeArabic(w.text_imlaei_simple || w.text_uthmani),
        }))));
    p.catch(() => cache.delete(page));
    cache.set(page, p);
  }
  return cache.get(page);
}

// All words of pages first..last; with `range` ([start, end) in half-line
// units, a Hifz task) only the lines inside it.
export async function passageWords(first, last, range = null) {
  const pages = [];
  for (let p = first; p <= last; p++) pages.push(p);
  const all = (await Promise.all(pages.map(pageWords))).flat();
  if (!range) return all;
  return all.filter((w) => {
    const s = pageToUnit(w.page, w.line);
    return s < range[1] && s + UNITS_PER_LINE > range[0];
  });
}
