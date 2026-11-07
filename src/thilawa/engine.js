// Thilawa (reading by looking): pure calculations from a student's reading
// log. Pages are Madinah Mushaf pages 1–604.
//
// A reading row is { id, readOn: "YYYY-MM-DD", fromPage, toPage, assignmentId, createdAt }.

import { SURAHS, JUZ_START_PAGES, TOTAL_PAGES, surahsOnPages, juzOfPage } from "../hifz/quran.js";
import { PAGE_FIRST_AYAH, TOTAL_AYAHS, SURAH_AYAH_COUNTS, SURAH_FIRST_AYAH } from "../hifz/ayahs.js";
import { AYAH_START_LINE, AYAH_END_LINE } from "../hifz/ayahLines.js";
import { computeStreak, diffDays, addDays, localDate } from "../hifz/engine.js";

export { TOTAL_PAGES };

const byTime = (a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0);

export const pagesIn = (from, to) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

// Pages are read through the Quran over and over: once all 604 have been read
// a khatam is complete and the next one starts from nothing.
export function khatamProgress(reading) {
  let khatams = 0;
  let current = new Set();
  let lastKhatamOn = null;
  for (const r of [...reading].sort(byTime)) {
    for (const p of pagesIn(r.fromPage, r.toPage)) {
      current.add(p);
      if (current.size === TOTAL_PAGES) {
        khatams += 1;
        lastKhatamOn = r.readOn;
        current = new Set();
      }
    }
  }
  return { khatams, lastKhatamOn, pagesRead: current, count: current.size, percent: Math.floor((current.size / TOTAL_PAGES) * 1000) / 10 };
}

// Last page of each surah (a surah that starts mid-page ends on the page
// before the next surah starts, or on that same page if they share it).
const surahEndPage = (i) => (i + 1 < SURAHS.length ? Math.max(SURAHS[i].startPage, SURAHS[i + 1].startPage - 1) : TOTAL_PAGES);
const juzEndPage = (j) => (j < 30 ? JUZ_START_PAGES[j] - 1 : TOTAL_PAGES);

// Surahs / juz whose every page is read in the current khatam.
export function completedCounts(pagesRead) {
  const all = (from, to) => pagesIn(from, to).every((p) => pagesRead.has(p));
  const surahs = SURAHS.filter((s, i) => all(s.startPage, surahEndPage(i))).length;
  const juz = JUZ_START_PAGES.filter((start, i) => all(start, juzEndPage(i + 1))).length;
  return { surahs, juz };
}

// Ayahs that start on pages from..to (global numbers 1–6236), for showing the text.
export function ayahsOnPages(from, to) {
  const first = PAGE_FIRST_AYAH[from - 1];
  const next = to < TOTAL_PAGES ? PAGE_FIRST_AYAH[to] : TOTAL_AYAHS + 1;
  return { first, last: Math.max(first, next - 1) };
}

// Pages that ayahs fromAyah..toAyah of a surah are on (ayahs clamped to the
// surah, toAyah not before fromAyah), with an "Al-Mulk 1–15" label.
export function ayahPages(surah, fromAyah, toAyah = fromAyah) {
  const count = SURAH_AYAH_COUNTS[surah - 1];
  const a = Math.min(Math.max(1, Math.round(fromAyah) || 1), count);
  const b = Math.min(Math.max(a, Math.round(toAyah) || a), count);
  const first = SURAH_FIRST_AYAH[surah - 1];
  const page = (line) => Math.floor(line / 15) + 1;
  const name = SURAHS[surah - 1].name;
  const whole = a === 1 && b === count;
  return { surah, fromAyah: a, toAyah: b, first: first + a - 1, last: first + b - 1, whole, fromPage: page(AYAH_START_LINE[first + a - 2]), toPage: page(AYAH_END_LINE[first + b - 2]), label: whole ? name : `${name} ${a}${a === b ? "" : `–${b}`}` };
}

// Surahs matching a search: by number prefix, or by name ignoring spaces,
// hyphens and apostrophes ("Al-Mulk" → "almulk"; "Yaseen" and "Ya-Sin" both → "yasin").
const searchKey = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/ee/g, "i").replace(/oo/g, "u").replace(/aa/g, "a");

export function searchSurahs(query) {
  const q = searchKey(query);
  if (!q) return SURAHS;
  if (/^\d+$/.test(q)) return SURAHS.filter((s) => String(s.number).startsWith(q));
  return SURAHS.filter((s) => searchKey(s.name).includes(q));
}

// "Al-Baqarah · p. 2–5" style description of a page range.
export function describePages(from, to) {
  const list = surahsOnPages(from, to);
  const names = list.length === 1 ? list[0].name : `${list[0].name} – ${list[list.length - 1].name}`;
  return `${names} · ${from === to ? `page ${from}` : `pages ${from}–${to}`}`;
}

export const pageLabel = (p) => `Page ${p} · ${surahsOnPages(p, p).map((s) => s.name).join(", ")} · Juz ${juzOfPage(p)}`;

// Same rule as the Hifz streak: a day with any reading counts; the streak
// survives one empty day and resets after two in a row.
export function readingStreak(reading, today, calendarDays = 35) {
  return computeStreak(reading.map((r) => ({ status: "completed", planDate: r.readOn })), today, calendarDays);
}

// Pages read per day on average over the last `days` days (today included).
export function recentPace(reading, today, days = 14) {
  const from = addDays(today, -(days - 1));
  const pages = new Set();
  for (const r of reading) {
    if (r.readOn < from || r.readOn > today) continue;
    for (const p of pagesIn(r.fromPage, r.toPage)) pages.add(`${r.readOn}:${p}`);
  }
  return pages.size / days;
}

// What the khatam goal needs: pages a day from today to reach it, and when
// the student would finish at their recent pace.
export function goalCheck(goalDate, pagesLeft, pace, today) {
  if (!goalDate) return null;
  const daysLeft = diffDays(today, goalDate) + 1; // today and the goal day both count
  const neededPerDay = daysLeft > 0 ? pagesLeft / daysLeft : pagesLeft;
  const estimatedDate = pagesLeft === 0 ? today : pace > 0 ? addDays(today, Math.ceil(pagesLeft / pace) - 1) : null;
  return {
    daysLeft,
    neededPerDay: Math.ceil(neededPerDay * 10) / 10,
    estimatedDate,
    onTrack: pagesLeft === 0 || (daysLeft > 0 && estimatedDate != null && estimatedDate <= goalDate),
    passed: daysLeft <= 0 && pagesLeft > 0,
  };
}

// The Arabic letters, in alphabet order (hamza and alif both), for the teacher
// to choose the ones a student needs to work on in a reading or lesson.
export const ARABIC_LETTERS = ["ء", "ا", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "ه", "و", "ي"];
// Only known letters, each once, in alphabet order.
export const sortLetters = (letters) => ARABIC_LETTERS.filter((l) => letters.includes(l));

// A class lesson: the whole class reads the same portion, and each student has
// their own lesson (with their own marked words) for it. This finds the one a
// student already has today for the portion, or null. today is "YYYY-MM-DD"
// in timeZone.
export function findClassLesson(assignments, { fromPage, toPage, instructions = "" }, today, timeZone) {
  return assignments.find((a) => a.kind === "lesson" && a.fromPage === fromPage && a.toPage === toPage
    && (a.instructions || "") === instructions && localDate(new Date(a.createdAt), timeZone) === today) || null;
}

// The portion a class carries on with: the newest lesson among the class's
// students (lessons: their assignments of kind "lesson"), or null.
// → { fromPage, toPage, instructions, createdAt }
export function lastClassPortion(lessons) {
  const last = lessons.filter((a) => a.kind === "lesson").sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  return last ? { fromPage: last.fromPage, toPage: last.toPage, instructions: last.instructions || "", createdAt: last.createdAt } : null;
}

// Pages turn freely while the teacher listens, so a word can be marked outside
// the lesson's own pages. The pages to show it on: its own, widened to every
// marked page.
export function pagesWithMarks(a, marks) {
  const pages = marks.map((m) => m.page);
  return { fromPage: Math.min(a.fromPage, ...pages), toPage: Math.max(a.toPage, ...pages) };
}

// The letters in a word's Uthmani text. Harakat and Quranic marks are left
// out; every alif form (and the small alif) counts as alif; hamza on a seat
// counts as hamza and its seat; small waw / yaa as waw / yaa; alif maqsurah as
// yaa; taa marbutah as both taa and haa.
const LETTER_FORMS = { "ٱ": "ا", "ٰ": "ا", "آ": "اء", "أ": "اء", "إ": "اء", "ؤ": "وء", "ئ": "يء", "ٔ": "ء", "ٕ": "ء", "ى": "ي", "ۥ": "و", "ۦ": "ي", "ة": "ته" };
export function lettersInWord(text) {
  const found = new Set();
  for (const ch of text || "") for (const l of LETTER_FORMS[ch] ?? ch) if (ARABIC_LETTERS.includes(l)) found.add(l);
  return found;
}
export const wordHasLetter = (text, letters) => letters.length > 0 && letters.some((l) => lettersInWord(text).has(l));

// A word's text in runs, `on` where it is one of `letters` (counted the same
// way as above), for showing just those letters in colour. Harakat go with
// their letter; a mark that is itself a letter (the small alif) goes on its own.
// → [{ text, on }]
export function letterParts(text, letters) {
  const parts = [];
  let letterOn = false;
  for (const ch of text || "") {
    const forms = [...(LETTER_FORMS[ch] ?? ch)];
    const mark = /\p{M}/u.test(ch);
    let on;
    if (mark && !forms.some((l) => ARABIC_LETTERS.includes(l))) on = letterOn;
    else {
      on = forms.some((l) => letters.includes(l));
      if (!mark) letterOn = on;
    }
    const last = parts[parts.length - 1];
    if (last && last.on === on) last.text += ch;
    else parts.push({ text: ch, on });
  }
  return parts;
}

// Teacher levels are 0–100; these are the words shown with the bar.
// What kind of mistake a marked word is; the teacher picks one in Listen & mark.
// Shown in Arabic; `en` is for screen readers. Each has its own highlighter
// colour (bg / text / ring) in the Mushaf and lists; a word with no category
// keeps the plain mistake colour, and corrected words are green, so none of
// these is green or the plain salmon.
export const MISTAKE_CATEGORIES = [
  { id: "lahn_jali", ar: "لحن جلي", en: "Lahn jali", bg: "#F5A3AE", fg: "#8A0A1E", ring: "#D9475C" },
  { id: "sukun", ar: "السكون", en: "Sukun", bg: "#CFE3FB", fg: "#0D4F85", ring: "#7DB0EA" },
  { id: "noon_sakinah", ar: "النون الساكنة والتنوين", en: "Noon saakinah and tanween", bg: "#E4D7FB", fg: "#5B2A9E", ring: "#B194E8" },
  { id: "shafawi", ar: "الشفوي", en: "Shafawi", bg: "#FFEDA3", fg: "#7A5300", ring: "#E8C547" },
  { id: "madd", ar: "المد", en: "Madd", bg: "#C9F0F2", fg: "#0B6470", ring: "#6CCBD3" },
  { id: "leen", ar: "اللين", en: "Leen", bg: "#FFC58F", fg: "#8A3B00", ring: "#F08A2C" },
  { id: "raa", ar: "أحكام الراء", en: "Ahkaam ur-raa", bg: "#F7C6E8", fg: "#8E1A64", ring: "#D96BB4" },
  { id: "itmam_harakah", ar: "إتمام الحركة", en: "Itmaam ul-harakah", bg: "#DCE1E8", fg: "#3A4556", ring: "#9AA6B6" },
];
// The highlighter colour of a category as inline styles, or {} for none.
export function mistakeColors(id) {
  const c = mistakeCategory(id);
  return c ? { background: c.bg, color: c.fg, boxShadow: `0 0 0 1px ${c.ring}` } : {};
}
export const mistakeCategory = (id) => MISTAKE_CATEGORIES.find((c) => c.id === id) || null;

export const LEVELS = [
  { min: 85, label: "Excellent" },
  { min: 70, label: "Very good" },
  { min: 50, label: "Good" },
  { min: 30, label: "Developing" },
  { min: 0, label: "Beginner" },
];
export const levelLabel = (v) => (v == null ? "Not assessed yet" : LEVELS.find((l) => v >= l.min).label);

// Latest assessment and the change since the one before it.
export function latestLevels(assessments) {
  const sorted = [...assessments].sort(byTime);
  const last = sorted[sorted.length - 1] || null;
  const prev = sorted[sorted.length - 2] || null;
  return {
    latest: last,
    tajweedChange: last && prev ? last.tajweed - prev.tajweed : 0,
    fluencyChange: last && prev ? last.fluency - prev.fluency : 0,
  };
}

// Where free reading should carry on from: the page after the last free read.
export function nextFreePage(reading) {
  const free = reading.filter((r) => !r.assignmentId).sort(byTime);
  const last = free[free.length - 1];
  return last ? (last.toPage % TOTAL_PAGES) + 1 : 1;
}

// Pages read on a given day.
export function pagesOn(reading, day) {
  const pages = new Set();
  for (const r of reading) if (r.readOn === day) for (const p of pagesIn(r.fromPage, r.toPage)) pages.add(p);
  return pages;
}

// A class reading's name: "Al-Mulk 1–15", or its pages.
export const readingTitle = (r) => r.label || describePages(r.fromPage, r.toPage).split(" · ")[0];
