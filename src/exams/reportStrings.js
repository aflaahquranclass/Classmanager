// Wording of the downloadable Hifz exam report, in English and Dhivehi.
// The defaults below are used until the admin corrects a phrase under
// Admin → Language; corrections are stored in the report_translations table
// and win over these defaults. {name} placeholders are filled in when the
// report is drawn.

import { supabase } from "../supabaseClient.js";
import { nameToThaana } from "./thaanaNames.js";

export const REPORT_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "dv", label: "ދިވެހި (Dhivehi)" },
];

// group: heading the phrase is listed under in the admin Language page.
// hint: what the phrase is / which placeholders it takes.
export const REPORT_STRINGS = [
  { key: "noteTitle", group: "Note to the student", hint: "Title of the note card shown before the questions. {student} = student's name.",
    en: "A note for {student}",
    dv: "{student} އަށް ނޯޓެއް" },
  { key: "noteBody", group: "Note to the student", hint: "The short (about 3 line) note shown before the questions. {student} = student's name.",
    en: "May Allah bless your effort in memorising His Book. Every ayah you learn is a light for you in this life and the next. Keep revising every day, stay patient and never give up — we are proud of you.",
    dv: "ﷲ ގެ ފޮތް ހިފްޒުކުރުމަށް ތިބާ ކުރާ މަސައްކަތުގައި ﷲ ބަރަކާތް ލައްވާށި. ތިބާ ދަސްކުރާ ކޮންމެ އާޔަތަކީ ދުނިޔެއާއި އާޚިރަތުގައި ތިބާއަށް ލިބޭ އަލިކަމެކެވެ. ކޮންމެ ދުވަހަކު މުރާޖަޢާ ކުރައްވާ، ކެތްތެރިވެ، ހިތްވަރާއެކު ކުރިއަށް ގޮސް ލައްވާށެވެ. ތިބާއާ މެދު އަހަރެމެން ފަޚުރުވެރިވަމެވެ." },

  { key: "title", group: "Header", hint: "Report title, used when the exam has no name.",
    en: "Hifz Exam Report", dv: "ހިފްޒު އިމްތިޙާނުގެ ރިޕޯޓް" },
  { key: "examMuraja", group: "Header", hint: "Exam type shown under the student's name.",
    en: "Muraja'ah exam", dv: "މުރާޖަޢާ އިމްތިޙާން" },
  { key: "examNewJuz", group: "Header", hint: "Exam type shown under the student's name.",
    en: "New juz exam", dv: "އައު ޖުޒުގެ އިމްތިޙާން" },
  { key: "pass", group: "Header", hint: "Final result badge when passed.",
    en: "PASS", dv: "ފާސް" },
  { key: "notPassed", group: "Header", hint: "Final result badge when not passed.",
    en: "NOT PASSED", dv: "ފާސްނުވި" },
  { key: "summary", group: "Header", hint: "Summary line. {total}, {correct}, {wrong} = counts.",
    en: "{total} questions  ·  {correct} correct  ·  {wrong} not correct",
    dv: "ސުވާލު {total}  ·  ރަނގަޅު {correct}  ·  ރަނގަޅުނޫން {wrong}" },

  { key: "questionNo", group: "Questions", hint: "Question number. {n} = number.",
    en: "Q{n}", dv: "ސުވާލު {n}" },
  { key: "range", group: "Questions", hint: "Passage of the question. {from}, {to} = start and end ayah.",
    en: "{from} → {to}",
    dv: "{from} ← {to}" },
  { key: "ayah", group: "Questions", hint: "End ayah in the same surah. {n} = ayah number.",
    en: "ayah {n}", dv: "އާޔަތް {n}" },
  { key: "correct", group: "Questions", hint: "Question result.",
    en: "Correct", dv: "ރަނގަޅު" },
  { key: "incorrect", group: "Questions", hint: "Question result.",
    en: "Not correct", dv: "ރަނގަޅުނޫން" },
  { key: "notMarked", group: "Questions", hint: "Question result.",
    en: "Not marked", dv: "ފާހަގަނުކުރެވޭ" },
  { key: "remark", group: "Questions", hint: "Label before the teacher's remark.",
    en: "Remark: ", dv: "ރިމާކް: " },
  { key: "comments", group: "Questions", hint: "Heading of the recitation comments at the end.",
    en: "RECITATION COMMENTS", dv: "ކިޔެވުމާ ބެހޭ ޚިޔާލު" },

];

// Student names are stored as rows keyed "name:<name as typed in English>".
export const nameKey = (name) => `name:${String(name || "").trim()}`;
// Exam names (the title the admin gave a scheduled exam) as "exam:<title>".
export const examNameKey = (title) => `exam:${String(title || "").trim()}`;

// A first Dhivehi version of an exam's name, word by word (Hifz Exam - Oct
// (New Juz) → ހިފްޒު އިމްތިޙާން - އޮކްޓޫބަރު (އައު ޖުޒު)). Words it doesn't know are
// kept as typed; the admin corrects the name under Admin → Language.
const EXAM_WORDS = [
  ["hifz exam", "ހިފްޒު އިމްތިޙާން"], ["new juz", "އައު ޖުޒު"], ["mid term", "މެދު ޓާރމް"], ["mid-term", "މެދު ޓާރމް"],
  ["examination", "އިމްތިޙާން"], ["exams", "އިމްތިޙާން"], ["exam", "އިމްތިޙާން"], ["test", "ޓެސްޓް"], ["hifz", "ހިފްޒު"], ["juz", "ޖުޒު"],
  ["muraja'ah", "މުރާޖަޢާ"], ["murajaah", "މުރާޖަޢާ"], ["muraja", "މުރާޖަޢާ"], ["revision", "މުރާޖަޢާ"],
  ["term", "ޓާރމް"], ["final", "ފައިނަލް"], ["quran", "ޤުރުއާން"], ["and", "އަދި"], ["new", "އައު"],
  ["january", "ޖެނުއަރީ"], ["jan", "ޖެނުއަރީ"], ["february", "ފެބްރުއަރީ"], ["feb", "ފެބްރުއަރީ"], ["march", "މާޗް"], ["mar", "މާޗް"],
  ["april", "އޭޕްރިލް"], ["apr", "އޭޕްރިލް"], ["may", "މެއި"], ["june", "ޖޫން"], ["jun", "ޖޫން"], ["july", "ޖުލައި"], ["jul", "ޖުލައި"],
  ["august", "އޮގަސްޓް"], ["aug", "އޮގަސްޓް"], ["september", "ސެޕްޓެމްބަރު"], ["sept", "ސެޕްޓެމްބަރު"], ["sep", "ސެޕްޓެމްބަރު"],
  ["october", "އޮކްޓޫބަރު"], ["oct", "އޮކްޓޫބަރު"], ["november", "ނޮވެމްބަރު"], ["nov", "ނޮވެމްބަރު"], ["december", "ޑިސެމްބަރު"], ["dec", "ޑިސެމްބަރު"],
];
const EXAM_WORDS_RE = new RegExp(`(?<![a-z'])(${EXAM_WORDS.map(([w]) => w.replace(/[-']/g, "\\$&")).join("|")})(?![a-z'])`, "gi");
const EXAM_WORDS_MAP = Object.fromEntries(EXAM_WORDS);
export function examNameToDhivehi(title) {
  return String(title || "").trim()
    .replace(EXAM_WORDS_RE, (w) => EXAM_WORDS_MAP[w.toLowerCase()] || w)
    .replace(/\(\s*/g, "(").replace(/\s*\)/g, ")");
}

// Saved corrections: { key: { en, dv } }. Falls back to the defaults if the
// table can't be read (offline, not migrated yet).
export async function loadReportOverrides() {
  const { data, error } = await supabase.from("report_translations").select("key, en, dv");
  if (error || !data) return {};
  return Object.fromEntries(data.map((r) => [r.key, r]));
}

// t(key, vars) for one language, with the admin's corrections applied.
export function reportTranslator(lang, overrides = {}) {
  const defaults = Object.fromEntries(REPORT_STRINGS.map((s) => [s.key, s]));
  const t = (key, vars = {}) => {
    const saved = overrides[key]?.[lang];
    const text = saved && saved.trim() ? saved : defaults[key]?.[lang] ?? defaults[key]?.en ?? key;
    return text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
  };
  // A student's name in Dhivehi: the admin's spelling if saved, otherwise
  // spelled automatically.
  t.studentName = (name) => {
    const saved = overrides[nameKey(name)]?.dv;
    return saved && saved.trim() ? saved : nameToThaana(name);
  };
  // An exam's name in the report's language (English as typed).
  t.examName = (title) => {
    if (lang !== "dv") return title;
    const saved = overrides[examNameKey(title)]?.dv;
    return saved && saved.trim() ? saved : examNameToDhivehi(title);
  };
  return t;
}

// Faruma, the usual Dhivehi font, bundled in public/fonts so it works on
// phones that don't have it installed.
export const THAANA_FONT = "Faruma, system-ui, -apple-system, 'Segoe UI', 'Noto Naskh Arabic', sans-serif";
let farumaReady = null;
export function loadThaanaFont() {
  if (!farumaReady) {
    // Only the Thaana letters (and Arabic comma etc.); names, dates and
    // digits keep the normal font.
    const face = new FontFace("Faruma", "url(/fonts/Faruma.ttf)", { unicodeRange: "U+0780-07BF, U+060C, U+061B, U+061F, U+FDF2" });
    farumaReady = face.load().then((f) => { document.fonts.add(f); });
    farumaReady.catch(() => { farumaReady = null; });
  }
  return Promise.all([farumaReady, document.fonts.load(`400 16px 'Noto Naskh Arabic'`, "البقرة")]).catch(() => {});
}
