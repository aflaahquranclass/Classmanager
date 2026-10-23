// Quran reference data for the standard 604-page Madinah Mushaf.
//
// Every Quran position is an integer "unit" = half a line, so 5 lines, ½ page,
// 1½ pages etc. are all exact integers (no floating-point rounding):
//   1 page = 15 lines = 30 units.
// Absolute unit u covers page floor(u / 30) + 1, half-line u % 30.
// Ranges are half-open [start, end) pairs of absolute units.

export const TOTAL_PAGES = 604;
export const LINES_PER_PAGE = 15;
export const UNITS_PER_LINE = 2;
export const UNITS_PER_PAGE = LINES_PER_PAGE * UNITS_PER_LINE;
export const TOTAL_UNITS = TOTAL_PAGES * UNITS_PER_PAGE;

export const SURAHS = [
  ["Al-Fatihah", 1], ["Al-Baqarah", 2], ["Aal-Imran", 50], ["An-Nisa", 77], ["Al-Ma'idah", 106],
  ["Al-An'am", 128], ["Al-A'raf", 151], ["Al-Anfal", 177], ["At-Tawbah", 187], ["Yunus", 208],
  ["Hud", 221], ["Yusuf", 235], ["Ar-Ra'd", 249], ["Ibrahim", 255], ["Al-Hijr", 262],
  ["An-Nahl", 267], ["Al-Isra", 282], ["Al-Kahf", 293], ["Maryam", 305], ["Ta-Ha", 312],
  ["Al-Anbiya", 322], ["Al-Hajj", 332], ["Al-Mu'minun", 342], ["An-Nur", 350], ["Al-Furqan", 359],
  ["Ash-Shu'ara", 367], ["An-Naml", 377], ["Al-Qasas", 385], ["Al-Ankabut", 396], ["Ar-Rum", 404],
  ["Luqman", 411], ["As-Sajdah", 415], ["Al-Ahzab", 418], ["Saba", 428], ["Fatir", 434],
  ["Ya-Sin", 440], ["As-Saffat", 446], ["Sad", 453], ["Az-Zumar", 458], ["Ghafir", 467],
  ["Fussilat", 477], ["Ash-Shura", 483], ["Az-Zukhruf", 489], ["Ad-Dukhan", 496], ["Al-Jathiyah", 499],
  ["Al-Ahqaf", 502], ["Muhammad", 507], ["Al-Fath", 511], ["Al-Hujurat", 515], ["Qaf", 518],
  ["Adh-Dhariyat", 520], ["At-Tur", 523], ["An-Najm", 526], ["Al-Qamar", 528], ["Ar-Rahman", 531],
  ["Al-Waqi'ah", 534], ["Al-Hadid", 537], ["Al-Mujadilah", 542], ["Al-Hashr", 545], ["Al-Mumtahanah", 549],
  ["As-Saff", 551], ["Al-Jumu'ah", 553], ["Al-Munafiqun", 554], ["At-Taghabun", 556], ["At-Talaq", 558],
  ["At-Tahrim", 560], ["Al-Mulk", 562], ["Al-Qalam", 564], ["Al-Haqqah", 566], ["Al-Ma'arij", 568],
  ["Nuh", 570], ["Al-Jinn", 572], ["Al-Muzzammil", 574], ["Al-Muddaththir", 575], ["Al-Qiyamah", 577],
  ["Al-Insan", 578], ["Al-Mursalat", 580], ["An-Naba", 582], ["An-Nazi'at", 583], ["Abasa", 585],
  ["At-Takwir", 586], ["Al-Infitar", 587], ["Al-Mutaffifin", 587], ["Al-Inshiqaq", 589], ["Al-Buruj", 590],
  ["At-Tariq", 591], ["Al-A'la", 591], ["Al-Ghashiyah", 592], ["Al-Fajr", 593], ["Al-Balad", 594],
  ["Ash-Shams", 595], ["Al-Layl", 595], ["Ad-Duha", 596], ["Ash-Sharh", 596], ["At-Tin", 597],
  ["Al-Alaq", 597], ["Al-Qadr", 598], ["Al-Bayyinah", 598], ["Az-Zalzalah", 599], ["Al-Adiyat", 599],
  ["Al-Qari'ah", 600], ["At-Takathur", 600], ["Al-Asr", 601], ["Al-Humazah", 601], ["Al-Fil", 601],
  ["Quraysh", 602], ["Al-Ma'un", 602], ["Al-Kawthar", 602], ["Al-Kafirun", 603], ["An-Nasr", 603],
  ["Al-Masad", 603], ["Al-Ikhlas", 604], ["Al-Falaq", 604], ["An-Nas", 604],
].map(([name, startPage], i) => ({ number: i + 1, name, startPage }));

export const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282,
  302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

export const pageToUnit = (page, line = 1) => (page - 1) * UNITS_PER_PAGE + (line - 1) * UNITS_PER_LINE;
export const unitToPage = (u) => Math.floor(u / UNITS_PER_PAGE) + 1;

export function juzOfPage(page) {
  let j = 1;
  for (let i = 0; i < JUZ_START_PAGES.length; i++) if (JUZ_START_PAGES[i] <= page) j = i + 1;
  return j;
}
export const juzStartUnit = (juz) => pageToUnit(JUZ_START_PAGES[juz - 1]);
export const juzEndUnit = (juz) => (juz >= 30 ? TOTAL_UNITS : juzStartUnit(juz + 1));

// Surahs that appear on pages firstPage..lastPage. Page-level data only, so a
// surah is taken to end on the page before the next surah starts (or on the
// same page when both start on it).
export function surahsOnPages(firstPage, lastPage) {
  return SURAHS.filter((s, i) => {
    const next = SURAHS[i + 1];
    const endPage = next ? Math.max(s.startPage, next.startPage - 1) : TOTAL_PAGES;
    return s.startPage <= lastPage && endPage >= firstPage;
  });
}

export function surahOfPage(page) {
  let found = SURAHS[0];
  for (const s of SURAHS) if (s.startPage <= page) found = s;
  return found;
}

// "p. 45" / "p. 45, line 8" / "p. 45, middle of line 8".
export function describeUnit(u) {
  const page = unitToPage(u);
  const within = u % UNITS_PER_PAGE;
  if (within === 0) return `p. ${page}`;
  const line = Math.floor(within / UNITS_PER_LINE) + 1;
  return within % UNITS_PER_LINE ? `p. ${page}, middle of line ${line}` : `p. ${page}, line ${line}`;
}

// Human description of one [start, end) range, e.g. "p. 45 – 46" or "p. 45, lines 1–5".
export function describeRange([s, e]) {
  const p1 = unitToPage(s);
  const p2 = unitToPage(e - 1);
  if (s % UNITS_PER_PAGE === 0 && e % UNITS_PER_PAGE === 0) return p1 === p2 ? `p. ${p1}` : `p. ${p1} – ${p2}`;
  const line = (u) => Math.floor((u % UNITS_PER_PAGE) / UNITS_PER_LINE) + 1;
  // Start/end may fall mid-line; "½" marks the half line.
  const sLine = `${line(s)}${s % UNITS_PER_LINE ? "½" : ""}`;
  const eLine = `${line(e - 1)}${e % UNITS_PER_LINE ? "½" : ""}`;
  if (p1 === p2) return `p. ${p1}, lines ${sLine}–${eLine}`;
  return `p. ${p1} line ${sLine} – p. ${p2} line ${eLine}`;
}

// Units → "2 pages 5 lines" style amount.
export function describeAmount(units) {
  const pages = Math.floor(units / UNITS_PER_PAGE);
  const rest = units % UNITS_PER_PAGE;
  const lines = rest / UNITS_PER_LINE; // may be x.5
  const parts = [];
  if (pages) parts.push(`${pages} page${pages === 1 ? "" : "s"}`);
  if (rest) parts.push(`${lines} line${lines === 1 ? "" : "s"}`);
  return parts.length ? parts.join(" ") : "0 lines";
}
