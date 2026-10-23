// Downloadable Hifz exam report for scheduled exams: every question with its
// full Quran passage (Uthmani text, quran.com Hafs font), the starting ayah in
// darker blue, the teacher's highlighted mistakes in red, and each question's
// result and remark. Drawn on a canvas, then saved as a PNG or a multi-page A4 PDF.

import { fetchVerses, BASMALA, SURAH_NAMES_AR } from "./quranText.js";
import { describeAyah, passageLines } from "./questions.js";

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

const statusOf = (q) => (q.result === "correct"
  ? { label: "Correct", bg: COLORS.passBg, fg: COLORS.passText }
  : q.result === "incorrect"
    ? { label: "Not correct", bg: COLORS.failBg, fg: COLORS.failText }
    : { label: "Not marked", bg: COLORS.noneBg, fg: COLORS.noneText });

// Builds the report. Returns { canvas, width, height, breaks } where breaks
// are y positions between blocks, safe places to start a new PDF page.
export async function buildPassageReport(exam, teacherLabel, logoImg) {
  await loadQuranFont();
  const passages = await Promise.all(exam.questions.map((q) => fetchVerses(q.range[0], q.range[1])));
  const measure = document.createElement("canvas").getContext("2d");

  // ---- measure ----
  const blocks = exam.questions.map((q, i) => {
    const [a, b] = q.range;
    const layout = layoutPassage(measure, passages[i], a, q.mistakes || []);
    measure.font = `13px ${UI_FONT}`;
    const remark = q.remark ? wrapText(measure, `Remark: ${q.remark}`, INNER) : [];
    const passageH = BOX_PAD + layout.rows.reduce((h, r) => h + rowHeight(r), 0) + 4;
    const footer = ((q.mistakes || []).length ? 20 : 0) + remark.length * 18;
    const height = 30 + 22 + passageH + (footer ? footer + 10 : 0) + 22;
    return { q, i, a, b, layout, remark, passageH, height };
  });
  measure.font = `13px ${UI_FONT}`;
  const comments = wrapText(measure, exam.comments || "—", INNER);
  const headerH = 168;
  const legendH = 34;
  const commentsH = 30 + comments.length * 18 + 10;
  const height = headerH + legendH + blocks.reduce((h, bl) => h + bl.height, 0) + commentsH + PAD;

  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = WIDTH * scale;
  canvas.height = Math.ceil(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.textBaseline = "alphabetic";

  // ---- header ----
  let y = PAD;
  let textX = PAD;
  if (logoImg) {
    const h = 44;
    const w = h * (logoImg.width / logoImg.height);
    ctx.drawImage(logoImg, PAD, y - 6, w, h);
    textX = PAD + w + 14;
  }
  ctx.fillStyle = COLORS.navy;
  ctx.font = `700 19px ${UI_FONT}`;
  ctx.fillText("Hifz Exam Report", textX, y + 12);
  const info = [["Student: ", exam.studentName], ["Exam date: ", exam.examDate], ["Teacher: ", teacherLabel]];
  info.forEach(([label, value], k) => {
    const ly = y + 38 + k * 19;
    ctx.font = `13px ${UI_FONT}`;
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(label, textX, ly);
    const lw = ctx.measureText(label).width;
    ctx.font = `700 13px ${UI_FONT}`;
    ctx.fillStyle = COLORS.text;
    ctx.fillText(value || "—", textX + lw, ly);
  });
  const pass = exam.finalResult === "pass";
  roundRect(ctx, WIDTH - PAD - 140, y - 4, 140, 34, 8, pass ? COLORS.passBg : COLORS.failBg);
  ctx.fillStyle = pass ? COLORS.passText : COLORS.failText;
  ctx.font = `700 14px ${UI_FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(pass ? "PASS" : "NOT PASSED", WIDTH - PAD - 70, y + 18);
  ctx.textAlign = "left";

  const correct = exam.questions.filter((q) => q.result === "correct").length;
  const wrong = exam.questions.filter((q) => q.result === "incorrect").length;
  const mistakes = exam.questions.reduce((n, q) => n + (q.mistakes || []).length, 0);
  ctx.font = `600 13px ${UI_FONT}`;
  ctx.fillStyle = COLORS.navy;
  ctx.fillText(`${exam.questions.length} questions  ·  ${correct} correct  ·  ${wrong} not correct  ·  ${mistakes} mistake${mistakes === 1 ? "" : "s"} highlighted`, PAD, y + 104);
  ctx.fillStyle = COLORS.rule;
  ctx.fillRect(PAD, headerH - 18, INNER, 2);
  y = headerH;

  // ---- legend ----
  ctx.font = `12px ${UI_FONT}`;
  let lx = PAD;
  for (const [bg, label] of [[COLORS.startBg, "Starting ayah (read out by the teacher)"], [COLORS.mistakeBg, "Mistake highlighted by the teacher"]]) {
    roundRect(ctx, lx, y, 16, 14, 3, bg);
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(label, lx + 22, y + 11);
    lx += 22 + ctx.measureText(label).width + 26;
  }
  y += legendH;
  const breaks = [0, y];

  // ---- questions ----
  for (const bl of blocks) {
    const { q, i, a, b, layout } = bl;
    const top = y;
    const status = statusOf(q);
    ctx.font = `800 15px ${UI_FONT}`;
    ctx.fillStyle = COLORS.navy;
    ctx.fillText(`Q${i + 1}`, PAD, y + 16);
    const qw = ctx.measureText(`Q${i + 1}`).width;
    ctx.font = `600 13px ${UI_FONT}`;
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(q.questionType || "", PAD + qw + 10, y + 16);
    ctx.font = `700 13px ${UI_FONT}`;
    const sw = ctx.measureText(status.label).width + 28;
    roundRect(ctx, WIDTH - PAD - sw, y, sw, 24, 12, status.bg);
    ctx.fillStyle = status.fg;
    ctx.textAlign = "center";
    ctx.fillText(status.label, WIDTH - PAD - sw / 2, y + 17);
    ctx.textAlign = "left";

    const p = describeAyah(a);
    const e = describeAyah(b);
    const endRef = e.surah === p.surah ? `ayah ${e.ayah}` : `${e.surahName} ${e.ayah}`;
    ctx.font = `13px ${UI_FONT}`;
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`${p.surahName} ${p.ayah} → ${endRef}   ·   Page ${p.page}, line ${p.line}   ·   ≈ ${passageLines(a, b).toFixed(1)} lines`, PAD, y + 44);
    y += 54;

    // passage box
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
        row.tokens.forEach((t, k) => {
          x -= t.width;
          const gap = k < row.tokens.length - 1 && row.tokens[k + 1].start === t.start ? layout.space : 0;
          if (t.start) { ctx.fillStyle = COLORS.startBg; ctx.fillRect(x - gap, ry + 6, t.width + gap, AR_LINE - 10); }
          if (t.mistake) roundRect(ctx, x - 3, ry + 7, t.width + 6, AR_LINE - 12, 6, COLORS.mistakeBg);
          ctx.fillStyle = t.mistake ? COLORS.mistakeText : "#1B1B1B";
          ctx.fillText(t.text, x, base);
          x -= layout.space;
        });
      }
      ry += h;
    }
    y += bl.passageH + 10;

    // mistakes + remark
    ctx.font = `600 13px ${UI_FONT}`;
    if ((q.mistakes || []).length) {
      ctx.fillStyle = COLORS.failText;
      ctx.fillText(`${q.mistakes.length} mistake${q.mistakes.length === 1 ? "" : "s"} highlighted`, PAD, y + 12);
      y += 20;
    }
    ctx.font = `13px ${UI_FONT}`;
    ctx.fillStyle = COLORS.text;
    bl.remark.forEach((line) => { ctx.fillText(line, PAD, y + 12); y += 18; });

    y = top + bl.height;
    ctx.fillStyle = COLORS.rule;
    ctx.fillRect(PAD, y - 11, INNER, 1);
    breaks.push(y);
  }

  // ---- comments ----
  ctx.font = `700 12px ${UI_FONT}`;
  ctx.fillStyle = COLORS.navy;
  ctx.fillText("RECITATION COMMENTS", PAD, y + 14);
  ctx.font = `13px ${UI_FONT}`;
  ctx.fillStyle = COLORS.text;
  comments.forEach((line, k) => ctx.fillText(line, PAD, y + 36 + k * 18));
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
