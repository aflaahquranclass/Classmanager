// Thilawa (reading by looking): pure calculations from a student's reading
// log. Pages are Madinah Mushaf pages 1–604.
//
// A reading row is { id, readOn: "YYYY-MM-DD", fromPage, toPage, assignmentId, createdAt }.

import { SURAHS, JUZ_START_PAGES, TOTAL_PAGES, surahsOnPages, juzOfPage } from "../hifz/quran.js";
import { PAGE_FIRST_AYAH, TOTAL_AYAHS } from "../hifz/ayahs.js";
import { computeStreak, diffDays, addDays } from "../hifz/engine.js";

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

// Teacher levels are 0–100; these are the words shown with the bar.
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
