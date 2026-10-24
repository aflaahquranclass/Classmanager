// Downloadable Hifz exam report for scheduled exams: every question with its
// full Quran passage (Uthmani text, quran.com Hafs font), the starting ayah in
// darker blue, the teacher's highlighted mistakes in red, and each question's
// result and remark, after a short note to the student, in English or
// Dhivehi. Drawn on a canvas, then saved as a PNG or a multi-page A4 PDF.

import { fetchVerses, BASMALA, SURAH_NAMES_AR } from "./quranText.js";
import { describeAyah } from "./questions.js";
import { reportTranslator, loadThaanaFont, THAANA_FONT } from "./reportStrings.js";

const UI_FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const QURAN_FONT = "UthmanicHafsReport";
const WIDTH = 820;
const PAD = 32;
const INNER = WIDTH - PAD * 2;
const AR_SIZE = 25;
const AR_LINE = 52;
const BOX_PAD = 16;

const COLORS = {
  navy: "#123B67", text: "#1B2733", muted: "#5B6B79", rule: "#D3E9F7",
  passageBg: "#EAF5FD", passageBorder: "#C9E2F6", startBg: "#C6E2F8",
  titleBg: "#F5FAFE", titleBorder: "#B9D8F0", titleText: "#1B4F72",
  mistakeBg: "#F6B3A3", mistakeText: "#7A1E0C",
  passBg: "#E3F0E7", passText: "#1E6B45", failBg: "#FBEAE6", failText: "#A5432C",
  noneBg: "#EDEFF2", noneText: "#4B5563",
  noteBg: "#F3F9F4", noteBorder: "#CFE6D6", noteAccent: "#3E9B6A",
};

let fontReady = null;
function loadQuranFont() {
  if (!fontReady) {
    const face = new FontFace(QURAN_FONT, "url(/fonts/UthmanicHafs1Ver18.woff2)");
    fontReady = face.load().then((f) => { document.fonts.add(f); });
    fontReady.catch(() => { fontReady = null; });
  }
  return fontReady;
}

// Questions saved from a scheduled exam carry their ayah range.
export const hasPassages = (exam) => exam.questions.length > 0 && exam.questions.every((q) => Array.isArray(q.range));

const isWord = (token) => /[ء-يٱ-ۓ]/.test(token);

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  for (const paragraph of String(text).split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
    }
    lines.push(line);
  }
  return lines;
}

// Lays a passage out into rows: surah titles, basmalas and right-to-left
// lines of word tokens that fit `maxWidth`.
function layoutPassage(ctx, verses, first, marks) {
  ctx.font = `${AR_SIZE}px ${QURAN_FONT}`;
  const space = ctx.measureText(" ").width;
  const maxWidth = INNER - BOX_PAD * 2;
  const rows = [];
  let line = [];
  let used = 0;
  const flush = () => { if (line.length) rows.push({ kind: "line", tokens: line }); line = []; used = 0; };
  for (const v of verses) {
    if (v.ayah === 1 && v.number !== first) {
      flush();
      rows.push({ kind: "title", text: `سُورَةُ ${SURAH_NAMES_AR[v.surah - 1]}` });
      if (v.surah !== 9) rows.push({ kind: "basmala", text: BASMALA });
    }
    v.text.split(/\s+/).forEach((token, w) => {
      const width = ctx.measureText(token).width;
      if (used && used + space + width > maxWidth) flush();
      line.push({ text: token, width, start: v.number === first, mistake: isWord(token) && marks.includes(`${v.number}:${w}`) });
      used += (used ? space : 0) + width;
    });
  }
  flush();
  return { rows, space };
}

const rowHeight = (row) => (row.kind === "title" ? 50 : row.kind === "basmala" ? 46 : AR_LINE);

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

const statusOf = (q, t) => (q.result === "correct"
  ? { label: t("correct"), bg: COLORS.passBg, fg: COLORS.passText }
  : q.result === "incorrect"
    ? { label: t("incorrect"), bg: COLORS.failBg, fg: COLORS.failText }
    : { label: t("notMarked"), bg: COLORS.noneBg, fg: COLORS.noneText });

// Builds the report. Returns { canvas, width, height, breaks } where breaks
// are y positions between blocks, safe places to start a new PDF page.
// lang "dv" draws the report's own wording in Dhivehi, right to left; t is
// the translator from reportStrings.js.
export async function buildPassageReport(exam, logoImg, { lang = "en", t = reportTranslator("en") } = {}) {
  const rtl = lang === "dv";
  await Promise.all([loadQuranFont(), rtl ? loadThaanaFont() : null]);
  const passages = await Promise.all(exam.questions.map((q) => fetchVerses(q.range[0], q.range[1])));
  const measure = document.createElement("canvas").getContext("2d");

  // Thaana (Faruma) is drawn a few sizes larger and with taller lines so its vowel marks
  // stay readable. font(size, weight) picks the report font for the language.
  const FAMILY = rtl ? THAANA_FONT : UI_FONT;
  const font = (size, weight = 400) => `${weight} ${rtl ? size + 3 : size}px ${FAMILY}`;
  const LINE = rtl ? 32 : 20;
  const GAP = 44; // space between two questions
  const surahName = (d) => (rtl ? SURAH_NAMES_AR[d.surah - 1] : d.surahName);
  const studentName = (rtl ? t.studentName(exam.studentName) : exam.studentName) || "—";

  // ---- measure ----
  const blocks = exam.questions.map((q, i) => {
    const [a, b] = q.range;
    const layout = layoutPassage(measure, passages[i], a, q.mistakes || []);
    measure.font = font(13);
    const remark = q.remark ? wrapText(measure, `${t("remark")}${q.remark}`, INNER) : [];
    const passageH = BOX_PAD + layout.rows.reduce((h, r) => h + rowHeight(r), 0) + 4;
    const footer = remark.length * LINE;
    const height = 30 + 22 + passageH + (footer ? footer + 10 : 0) + GAP;
    return { q, i, a, b, layout, remark, passageH, height };
  });
  measure.font = font(13);
  const comments = wrapText(measure, exam.comments || "—", INNER);
  measure.font = font(14);
  const noteBody = wrapText(measure, t("noteBody", { student: studentName }), INNER - 40);
  // Header: logo centred on top, then the exam name, student, exam type and
  // date, and the result, each on its own centred line.
  const LOGO_H = logoImg ? 70 : 0;
  const examTitle = exam.examName ? t.examName(exam.examName) : t("title");
  // Exam type and date. The line is drawn left to right with the parts in
  // reverse for Dhivehi, so the type reads first and the date never flips.
  const subParts = [exam.examType ? t(exam.examType === "new_juz" ? "examNewJuz" : "examMuraja") : "", exam.examDate].filter(Boolean);
  const subLine = (rtl ? subParts.reverse() : subParts).join("   ·   ");
  const headLines = [
    { str: examTitle, size: 22, weight: 700, color: COLORS.navy, gap: rtl ? 40 : 34 },
    { str: studentName, size: 18, weight: 700, color: COLORS.text, gap: rtl ? 36 : 30 },
    { str: subLine, size: 14, weight: 400, color: COLORS.muted, gap: rtl ? 32 : 26, ltr: true },
  ];
  const headerH = PAD + LOGO_H + 14 + headLines.reduce((h, l) => h + l.gap, 0) + 52 + 64;
  const NOTE_LINE = rtl ? 40 : 26; // space from one note line to the next
  const noteH = 18 + 30 + noteBody.length * NOTE_LINE + 18 + 26;
  const commentsH = 30 + comments.length * LINE + 10;
  const height = headerH + noteH + blocks.reduce((h, bl) => h + bl.height, 0) + commentsH + PAD;

  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = WIDTH * scale;
  canvas.height = Math.ceil(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.textBaseline = "alphabetic";

  // Everything outside the Quran passages is laid out left to right and
  // mirrored for Dhivehi: X() flips an x position, box() a rectangle, and
  // text() draws from the reading start (left in English, right in Dhivehi).
  const X = (x) => (rtl ? WIDTH - x : x);
  const box = (x, y, w, h, r, fill, stroke) => roundRect(ctx, rtl ? WIDTH - x - w : x, y, w, h, r, fill, stroke);
  const text = (str, x, y, align = "start") => {
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.textAlign = align;
    ctx.fillText(str, X(x), y);
    ctx.direction = "ltr";
    ctx.textAlign = "left";
  };

  // ---- header ----
  let y = PAD;
  if (logoImg) {
    const w = LOGO_H * (logoImg.width / logoImg.height);
    ctx.drawImage(logoImg, (WIDTH - w) / 2, y, w, LOGO_H);
    y += LOGO_H + 14;
  }
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textAlign = "center";
  for (const l of headLines) {
    y += l.gap;
    ctx.font = font(l.size, l.weight);
    ctx.fillStyle = l.color;
    ctx.direction = rtl && !l.ltr ? "rtl" : "ltr";
    ctx.fillText(l.str, WIDTH / 2, y - 8);
    ctx.direction = rtl ? "rtl" : "ltr";
  }
  const pass = exam.finalResult === "pass";
  const correct = exam.questions.filter((q) => q.result === "correct").length;
  const wrong = exam.questions.filter((q) => q.result === "incorrect").length;
  ctx.font = font(14, 700);
  const badge = pass ? t("pass") : t("notPassed");
  const bw = ctx.measureText(badge).width + 40;
  roundRect(ctx, (WIDTH - bw) / 2, y + 4, bw, 34, 17, pass ? COLORS.passBg : COLORS.failBg);
  ctx.fillStyle = pass ? COLORS.passText : COLORS.failText;
  ctx.fillText(badge, WIDTH / 2, y + 26);
  ctx.font = font(13, 600);
  ctx.fillStyle = COLORS.navy;
  ctx.fillText(t("summary", { total: exam.questions.length, correct, wrong }), WIDTH / 2, y + 66);
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.rule;
  ctx.fillRect(PAD, headerH - 18, INNER, 2);
  y = headerH;
  const breaks = [0, y];

  // ---- note to the student ----
  const cardH = noteH - 26;
  box(PAD, y, INNER, cardH, 14, COLORS.noteBg, COLORS.noteBorder);
  ctx.fillStyle = COLORS.noteAccent;
  ctx.fillRect(rtl ? WIDTH - PAD - 5 : PAD, y + 12, 5, cardH - 24);
  ctx.font = font(15, 700);
  ctx.fillStyle = COLORS.navy;
  text(t("noteTitle", { student: studentName }), PAD + 22, y + 36);
  ctx.font = font(14);
  ctx.fillStyle = COLORS.text;
  noteBody.forEach((line, k) => text(line, PAD + 22, y + 48 + (k + 1) * NOTE_LINE - (rtl ? 8 : 6)));
  y += noteH;
  breaks.push(y);

  // ---- questions ----
  for (const bl of blocks) {
    const { q, i, a, b, layout } = bl;
    const top = y;
    const status = statusOf(q, t);
    ctx.font = font(15, 800);
    ctx.fillStyle = COLORS.navy;
    const qLabel = t("questionNo", { n: i + 1 });
    text(qLabel, PAD, y + 16);
    ctx.font = font(13, 700);
    const sw = ctx.measureText(status.label).width + 28;
    box(WIDTH - PAD - sw, y, sw, 24, 12, status.bg);
    ctx.fillStyle = status.fg;
    text(status.label, WIDTH - PAD - sw / 2, y + 17, "center");

    const p = describeAyah(a);
    const e = describeAyah(b);
    const endRef = e.surah === p.surah ? t("ayah", { n: e.ayah }) : `${surahName(e)} ${e.ayah}`;
    ctx.font = font(13);
    ctx.fillStyle = COLORS.text;
    text(t("range", { from: `${surahName(p)} ${p.ayah}`, to: endRef }), PAD, y + 44);
    y += 54;

    // passage box (always right to left, in physical coordinates)
    roundRect(ctx, PAD, y, INNER, bl.passageH, 12, COLORS.passageBg, COLORS.passageBorder);
    let ry = y + BOX_PAD;
    const right = WIDTH - PAD - BOX_PAD;
    for (const row of layout.rows) {
      const h = rowHeight(row);
      if (row.kind === "title") {
        roundRect(ctx, PAD + BOX_PAD, ry + 4, INNER - BOX_PAD * 2, 38, 8, COLORS.titleBg, COLORS.titleBorder);
        ctx.font = `21px ${QURAN_FONT}`;
        ctx.fillStyle = COLORS.titleText;
        ctx.textAlign = "center";
        ctx.fillText(row.text, WIDTH / 2, ry + 31);
        ctx.textAlign = "left";
      } else if (row.kind === "basmala") {
        ctx.font = `${AR_SIZE}px ${QURAN_FONT}`;
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = "center";
        ctx.fillText(row.text, WIDTH / 2, ry + 32);
        ctx.textAlign = "left";
      } else {
        ctx.font = `${AR_SIZE}px ${QURAN_FONT}`;
        const base = ry + 34;
        let x = right;
        row.tokens.forEach((tk, k) => {
          x -= tk.width;
          const gap = k < row.tokens.length - 1 && row.tokens[k + 1].start === tk.start ? layout.space : 0;
          if (tk.start) { ctx.fillStyle = COLORS.startBg; ctx.fillRect(x - gap, ry + 6, tk.width + gap, AR_LINE - 10); }
          if (tk.mistake) roundRect(ctx, x - 3, ry + 7, tk.width + 6, AR_LINE - 12, 6, COLORS.mistakeBg);
          ctx.fillStyle = tk.mistake ? COLORS.mistakeText : "#1B1B1B";
          ctx.fillText(tk.text, x, base);
          x -= layout.space;
        });
      }
      ry += h;
    }
    y += bl.passageH + 10;

    // remark
    ctx.font = font(13);
    ctx.fillStyle = COLORS.text;
    bl.remark.forEach((line) => { text(line, PAD, y + 12); y += LINE; });

    y = top + bl.height;
    ctx.fillStyle = COLORS.rule;
    ctx.fillRect(PAD, y - GAP / 2, INNER, 1);
    breaks.push(y);
  }

  // ---- comments ----
  ctx.font = font(12, 700);
  ctx.fillStyle = COLORS.navy;
  text(t("comments"), PAD, y + 14);
  ctx.font = font(13);
  ctx.fillStyle = COLORS.text;
  comments.forEach((line, k) => text(line, PAD, y + 36 + k * LINE));
  breaks.push(height);

  return { canvas, width: WIDTH, height, breaks };
}

// Multi-page A4 PDF of a tall canvas: scaled to the page width, cut into
// pages at the given break points (between questions) where possible.
// Built by hand (one JPEG per page) so it doesn't depend on a print dialog.
export function canvasToPagedPdf(canvas, width, height, breaks) {
  const [pageW, pageH] = [595, 842];
  const margin = 30;
  const scale = (pageW - margin * 2) / width;
  const maxSlice = (pageH - margin * 2) / scale;
  const pxPerUnit = canvas.width / width;

  const slices = [];
  let start = 0;
  while (start < height - 1) {
    const fit = breaks.filter((b) => b > start + 40 && b <= start + maxSlice);
    const end = fit.length ? Math.max(...fit) : Math.min(height, start + maxSlice);
    slices.push([start, end]);
    start = end;
  }

  const pages = slices.map(([s, e]) => {
    const c = document.createElement("canvas");
    c.width = canvas.width;
    c.height = Math.ceil((e - s) * pxPerUnit);
    const cx = c.getContext("2d");
    cx.fillStyle = "#FFFFFF";
    cx.fillRect(0, 0, c.width, c.height);
    cx.drawImage(canvas, 0, Math.floor(s * pxPerUnit), c.width, c.height, 0, 0, c.width, c.height);
    const bin = atob(c.toDataURL("image/jpeg", 0.92).split(",")[1]);
    const bytes = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
    return { bytes, w: c.width, h: c.height, drawH: (e - s) * scale };
  });

  const enc = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let offset = 0;
  const push = (data) => { const b = typeof data === "string" ? enc.encode(data) : data; chunks.push(b); offset += b.length; };
  const obj = (n, body) => { offsets[n] = offset; push(`${n} 0 obj\n${body}\nendobj\n`); };

  push("%PDF-1.4\n");
  const pageObj = (k) => 3 + k * 3;
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, k) => `${pageObj(k)} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  pages.forEach((pg, k) => {
    const n = pageObj(k);
    obj(n, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im${k} ${n + 2} 0 R >> >> /Contents ${n + 1} 0 R >>`);
    const drawW = pageW - margin * 2;
    const content = `q ${drawW.toFixed(2)} 0 0 ${pg.drawH.toFixed(2)} ${margin} ${(pageH - margin - pg.drawH).toFixed(2)} cm /Im${k} Do Q`;
    obj(n + 1, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    offsets[n + 2] = offset;
    push(`${n + 2} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pg.w} /Height ${pg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.bytes.length} >>\nstream\n`);
    push(pg.bytes);
    push("\nendstream\nendobj\n");
  });
  const count = 3 + pages.length * 3;
  const xrefStart = offset;
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let k = 1; k < count; k++) xref += `${String(offsets[k]).padStart(10, "0")} 00000 n \n`;
  push(xref);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) { out.set(c, pos); pos += c.length; }
  return { blob: new Blob([out], { type: "application/pdf" }), pages: pages.length };
}
