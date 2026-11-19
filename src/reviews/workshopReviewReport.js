// The workshop review results as an A4 PDF (Admin → Reviews → Workshop
// reviews → Download PDF): how many chose each answer for every question, with
// percentages and bars, then the topics asked for and what people wrote.
// Drawn on a canvas and saved with the exam reports' PDF maker.

import { canvasToPagedPdf } from "../exams/examReport.js";
import { loadThaanaFont } from "../exams/reportStrings.js";

const W = 760; // width in canvas units; drawn at SCALE for sharp print
const SCALE = 2;
const PAD = 40;
const NAVY = "#123B67";
const MUTED = "#567493";
const LINE = "#D5E2EE";
const SOFT = "#F3F8FC";
const BAR_EMPTY = "#EEF3F8";
const NEXT_COLORS = ["#1E7A4C", "#176FD1", "#9C6B12"];
const THAANA = "Faruma, Inter, system-ui, sans-serif";
const LATIN = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";
const THAANA_RE = /[ހ-޿]/;

let logo = null;
function loadLogo() {
  if (!logo) {
    logo = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = "/images/logo-full-white.png";
    });
  }
  return logo;
}

const fmtDate = (d) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Indian/Maldives" });

// Lines no wider than `max` for the current font, keeping the writer's own line breaks.
function wrap(ctx, text, max) {
  const lines = [];
  for (const para of String(text).trim().split(/\n+/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > max) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Draws the report; a first pass with draw = false only measures the height.
function paint(ctx, s, workshop, logoImg, draw) {
  const breaks = [];
  const right = W - PAD;
  const inner = W - PAD * 2;
  let y = 0;

  // Dhivehi lines end at x (right-aligned) unless told otherwise.
  const text = (str, x, yy, { size = 14, weight = 400, color = NAVY, align, thaana } = {}) => {
    if (!draw) return;
    const dv = thaana ?? THAANA_RE.test(str);
    align = align || (dv ? "right" : "left");
    ctx.font = `${weight} ${size}px ${dv ? THAANA : LATIN}`;
    ctx.fillStyle = color;
    ctx.direction = dv ? "rtl" : "ltr";
    ctx.textAlign = align;
    ctx.fillText(str, x, yy);
    ctx.direction = "ltr";
  };

  // ---- header band ----
  if (draw) {
    const g = ctx.createLinearGradient(0, 0, W, 130);
    g.addColorStop(0, "#0D4F85");
    g.addColorStop(0.55, "#176FD1");
    g.addColorStop(1, "#0A94B1");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 130);
    if (logoImg) { const h = 62; ctx.drawImage(logoImg, PAD, 30, (logoImg.width / logoImg.height) * h, h); }
  }
  text("ވޯކްޝޮޕް ރިވިއުގެ ނަތީޖާ", right, 52, { size: 26, color: "#FFFFFF" });
  text(workshop ? workshop.title.join(" ") : "", right, 84, { size: 18, color: "rgba(255,255,255,.9)" });
  text("Workshop review results", right, 110, { size: 13, weight: 600, color: "rgba(255,255,255,.8)", align: "right", thaana: false });
  y = 130 + 26;

  // ---- three numbers ----
  const boxW = (inner - 24) / 3;
  const stats = [
    ["Answers", String(s.total)],
    ["Very good or good", `${s.positivePct}%`],
    ["Last answer", s.lastAt ? fmtDate(s.lastAt) : "—"],
  ];
  stats.forEach(([label, value], i) => {
    const x = PAD + i * (boxW + 12);
    if (draw) { ctx.fillStyle = SOFT; roundRect(ctx, x, y, boxW, 66, 12); ctx.fill(); ctx.strokeStyle = LINE; ctx.lineWidth = 1; ctx.stroke(); }
    text(label, x + 14, y + 24, { size: 12, weight: 600, color: MUTED, thaana: false });
    text(value, x + 14, y + 50, { size: i === 2 ? 14 : 22, weight: 700, thaana: false });
  });
  y += 66 + 14;
  text(`Downloaded ${fmtDate(new Date())}`, PAD, y + 4, { size: 11, color: MUTED, thaana: false });
  y += 22;
  breaks.push(y);

  const heading = (dv, en) => {
    y += 18;
    if (draw) { ctx.fillStyle = "#176FD1"; roundRect(ctx, right - 5, y - 2, 5, 26, 2); ctx.fill(); }
    text(dv, right - 14, y + 18, { size: 19 });
    text(en, PAD, y + 18, { size: 13, weight: 700, color: MUTED, thaana: false });
    y += 34;
    if (draw) { ctx.fillStyle = LINE; ctx.fillRect(PAD, y, inner, 1); }
    y += 12;
  };

  // One question: its name, a bar split by answer, and each answer's count and percent.
  const question = (q, colors) => {
    text(q.dv, right, y + 18, { size: 16 });
    text(q.en, PAD, y + 18, { size: 12, color: MUTED, thaana: false });
    const barY = y + 30;
    if (draw) {
      ctx.save();
      roundRect(ctx, PAD, barY, inner, 14, 7);
      ctx.clip();
      ctx.fillStyle = BAR_EMPTY;
      ctx.fillRect(PAD, barY, inner, 14);
      const sum = q.counts.reduce((a, c) => a + c.n, 0);
      let x = PAD;
      q.counts.forEach((c, i) => {
        if (!sum || !c.n) return;
        const w = (c.n / sum) * inner;
        ctx.fillStyle = c.color || colors[i];
        ctx.fillRect(x, barY, w, 14);
        x += w;
      });
      ctx.restore();
    }
    let x = PAD;
    q.counts.forEach((c, i) => {
      const label = `${c.en}  ${c.n}  (${c.pct}%)`;
      if (draw) { ctx.fillStyle = c.color || colors[i]; ctx.beginPath(); ctx.arc(x + 5, barY + 32, 5, 0, Math.PI * 2); ctx.fill(); }
      text(label, x + 15, barY + 37, { size: 13, weight: 600, thaana: false });
      if (draw) ctx.font = `600 13px ${LATIN}`;
      x += 15 + (draw ? ctx.measureText(label).width : 150) + 26;
    });
    y = barY + 58;
    breaks.push(y);
  };

  heading("ސެޝަނާ ބެހޭ ގޮތުން", "SESSION RATINGS");
  s.rated.forEach((q) => question(q, NEXT_COLORS));

  heading("އިތުރު ވޯކްޝޮޕްތައް", "NEXT WORKSHOP");
  question(s.next, NEXT_COLORS);

  // Numbered lists of what people wrote.
  const list = (items, empty) => {
    if (!items.length) { text(empty, PAD, y + 16, { size: 13, color: MUTED, thaana: false }); y += 34; breaks.push(y); return; }
    items.forEach((it, i) => {
      const dv = THAANA_RE.test(it.text);
      ctx.font = `400 ${dv ? 16 : 14}px ${dv ? THAANA : LATIN}`;
      const lines = wrap(ctx, it.text, inner - 44);
      const lineH = dv ? 30 : 22;
      const h = lines.length * lineH + 30;
      if (draw) { ctx.fillStyle = i % 2 ? "#FFFFFF" : SOFT; roundRect(ctx, PAD, y, inner, h - 6, 10); ctx.fill(); }
      text(String(i + 1), dv ? right - 14 : PAD + 14, y + 22, { size: 12, weight: 700, color: "#176FD1", align: dv ? "right" : "left", thaana: false });
      lines.forEach((l, k) => text(l, dv ? right - 36 : PAD + 36, y + 22 + k * lineH, { size: dv ? 16 : 14, align: dv ? "right" : "left", thaana: dv }));
      text(fmtDate(it.at), dv ? PAD + 12 : right - 12, y + h - 14, { size: 10, color: MUTED, align: dv ? "left" : "right", thaana: false });
      y += h;
      breaks.push(y);
    });
  };

  heading("ވޯކްޝޮޕެއް ގެނެސްދޭނަމަ ބޭނުންވާ މައުޟޫޢު", `TOPICS ASKED FOR (${s.topics.length})`);
  list(s.topics, "No topics were suggested.");

  heading("ވޯކްޝޮޕާމެދު ދެކޭ ގޮތް", `WHAT THEY THOUGHT (${s.comments.length})`);
  list(s.comments, "No comments yet.");

  y += 20;
  text("aflaahqc.com", W / 2, y, { size: 12, weight: 600, color: MUTED, align: "center", thaana: false });
  y += 20;
  breaks.push(y);
  return { height: y, breaks };
}

// The report drawn on one tall canvas, with the safe places to start a new page.
// s: summarizeReviews(rows); workshop: the WORKSHOPS entry (or null).
export async function buildWorkshopReviewCanvas(s, workshop) {
  await loadThaanaFont();
  await document.fonts.load(`600 14px Inter`).catch(() => {});
  const logoImg = await loadLogo();
  const measure = document.createElement("canvas").getContext("2d");
  const { height } = paint(measure, s, workshop, logoImg, false);
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = Math.ceil(height * SCALE);
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, height);
  ctx.textBaseline = "alphabetic";
  const { breaks } = paint(ctx, s, workshop, logoImg, true);
  return { canvas, height, breaks };
}

export async function buildWorkshopReviewPdf(s, workshop) {
  const { canvas, height, breaks } = await buildWorkshopReviewCanvas(s, workshop);
  return canvasToPagedPdf(canvas, W, height, breaks).blob;
}
