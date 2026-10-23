// Uthmani (rasm uthmani) text of the Quran from the quran.com API, loaded a
// Mushaf page at a time and kept in memory for the session. Uses quran.com's
// "qpc_hafs" encoding, which is made for the KFGQPC Uthmanic Hafs font it is
// shown with (public/fonts), exactly as quran.com does. Each ayah's text ends
// with its number, which the font draws as the round ayah-end marker.

import { AYAH_START_LINE, AYAH_END_LINE } from "../hifz/ayahLines.js";
import { ayahRef } from "../hifz/ayahs.js";
import { LINES_PER_PAGE } from "../hifz/quran.js";

export const BASMALA = "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ";

export const SURAH_NAMES_AR = [
  "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس",
  "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه",
  "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم",
  "لقمان", "السجدة", "الأحزاب", "سبإ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
  "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
  "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
  "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
  "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبإ", "النازعات", "عبس",
  "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
  "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
  "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
  "المسد", "الإخلاص", "الفلق", "الناس",
];

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const arabicNumber = (n) => String(n).replace(/\d/g, (d) => ARABIC_DIGITS[d]);

const pageCache = new Map(); // page → Promise<Map<"s:a", text>>

function fetchPage(page) {
  if (!pageCache.has(page)) {
    const p = fetch(`https://api.quran.com/api/v4/quran/verses/qpc_hafs?page_number=${page}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((body) => new Map((body.verses || []).map((v) => [v.verse_key, v.text_qpc_hafs.trim()])));
    // Don't keep failures, so a later render can retry.
    p.catch(() => pageCache.delete(page));
    pageCache.set(page, p);
  }
  return pageCache.get(page);
}

const pageOfLine = (line) => Math.floor(line / LINES_PER_PAGE) + 1;

// Ayahs first..last (global numbers 1–6236) → [{ number, surah, ayah, text }].
export async function fetchVerses(first, last) {
  const pages = [];
  for (let p = pageOfLine(AYAH_START_LINE[first - 1]); p <= pageOfLine(AYAH_END_LINE[last - 1]); p++) pages.push(p);
  const maps = await Promise.all(pages.map(fetchPage));
  const verses = [];
  for (let n = first; n <= last; n++) {
    const { surah, ayah } = ayahRef(n);
    const text = maps.map((m) => m.get(`${surah}:${ayah}`)).find(Boolean);
    if (!text) throw new Error(`Missing text for ${surah}:${ayah}`);
    verses.push({ number: n, surah, ayah, text });
  }
  return verses;
}
