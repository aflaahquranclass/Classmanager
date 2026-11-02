// An approved review drawn as a square Instagram post (1080 × 1080 PNG):
// the brand gradient, the white logo with "Reviews" on top, and a white card
// with the review, its stars and the masked name with the class. The Dhivehi
// post keeps the logo on the left but lays the card out right to left.

import { REVIEW_CLASSES } from "../landing/content.js";
import { loadThaanaFont } from "../exams/reportStrings.js";

const S = 1080;
const PAD_X = 70;
const PAD_TOP = 64;
const CARD_TOP = 162;
const CARD_BOTTOM = 948;
const CARD_PAD_X = 70;
const CARD_PAD_TOP = 64;
const CARD_PAD_BOTTOM = 56;
const WHO_H = 114; // the line above the name, its gap and the 84px circle
const NAVY = "#123B67";
const MUTED = "#567493";
const TEAL = "#18A9BD";
const GOLD = "#EF9F27";
const INTER = "Inter, system-ui, sans-serif";
const SERIF = "Fraunces, Faruma, Georgia, serif";
const THAANA = "Faruma, Inter, system-ui, sans-serif";
const AAMMU = "Aammu, Faruma, Inter, sans-serif";

const STAR = new Path2D("M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.2l-5.8 3.2 1.2-6.5L2.6 9.4l6.5-.8z");
const QUOTE = new Path2D("M0 88V52C0 22 15 5 44 0l5 12C33 17 26 27 25 42h20v46zm61 0V52c0-30 15-47 44-52l5 12c-16 5-23 15-24 30h20v46z");

const THAANA_RE = /[ހ-޿]/;
// Reviews written in Thaana get the Dhivehi post first.
export const postLanguage = (text) => (THAANA_RE.test(text || "") ? "dv" : "en");

// Same masking as public_reviews() in the database: "Haathim Abdul Rahmaan" → "Ha*****".
export const publicName = (name) => `${[...name.trim()].slice(0, 2).join("")}*****`;

let fontsReady = null;
function loadFonts() {
  if (!fontsReady) {
    if (!document.querySelector("link[data-review-post-font]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500&display=swap";
      link.dataset.reviewPostFont = "";
      document.head.appendChild(link);
    }
    const aammu = new FontFace("Aammu", "url(/fonts/MV_AammuFK_Regular.ttf)", { unicodeRange: "U+0780-07BF, U+060C, U+061B, U+061F, U+FDF2" });
    fontsReady = Promise.all([
      loadThaanaFont(),
      aammu.load().then((f) => document.fonts.add(f)),
      // The stylesheet has to arrive before the font can be asked for.
      new Promise((r) => setTimeout(r, 300)).then(() => document.fonts.load(`500 54px Fraunces`, "Aa")),
      ...["500", "600", "700"].map((w) => document.fonts.load(`${w} 28px Inter`)),
    ]).catch(() => {});
  }
  return fontsReady;
}

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

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Breaks the text into lines no wider than `max`, keeping the writer's own line breaks.
function wrap(ctx, text, max) {
  const lines = [];
  for (const para of text.trim().split(/\n+/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > max) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
  }
  return lines;
}

// Text at `size`, made smaller until it fits `max` pixels.
function fitText(ctx, text, x, y, max, size, font) {
  let s = size;
  do { ctx.font = font(s); s -= 1; } while (ctx.measureText(text).width > max && s > 14);
  ctx.fillText(text, x, y);
}

export async function drawReviewPost({ name, className, comment, rating, lang }) {
  await loadFonts();
  const img = await loadLogo();
  const dv = lang === "dv";
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "middle";

  // Background: the portal's gradient at 150°.
  const bg = ctx.createLinearGradient(171, -99, 909, 1179);
  bg.addColorStop(0, "#0D4F85");
  bg.addColorStop(0.55, "#0875A2");
  bg.addColorStop(1, "#0A94B1");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  // Top row: logo on the left, "Reviews" with a gold line on the right (both languages).
  if (img) {
    const h = 104;
    ctx.drawImage(img, PAD_X - 10, PAD_TOP - 18, (img.width / img.height) * h, h);
  }
  const labelY = PAD_TOP + 34;
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  if (dv) {
    ctx.font = `400 36px ${AAMMU}`;
    ctx.direction = "rtl";
  } else {
    ctx.font = `600 22px ${INTER}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "4.4px";
  }
  const label = dv ? "ރިވިއުތައް" : "REVIEWS";
  const labelW = ctx.measureText(label).width;
  ctx.fillText(label, S - PAD_X, labelY);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  ctx.direction = "ltr";
  ctx.fillStyle = GOLD;
  ctx.fillRect(S - PAD_X - labelW - 16 - 44, labelY - 1, 44, 2);

  // White card
  const cx = PAD_X;
  const cw = S - PAD_X * 2;
  ctx.save();
  ctx.shadowColor = "rgba(4,25,50,0.35)";
  ctx.shadowBlur = 80;
  ctx.shadowOffsetY = 30;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, cx, CARD_TOP, cw, CARD_BOTTOM - CARD_TOP, 40);
  ctx.fill();
  ctx.restore();

  const left = cx + CARD_PAD_X;
  const right = cx + cw - CARD_PAD_X;
  const inner = right - left;
  const edge = dv ? right : left; // where each line starts

  // The review: shrinks to fit the space above the name.
  const lineTop = CARD_BOTTOM - CARD_PAD_BOTTOM - WHO_H;
  const areaTop = CARD_TOP + CARD_PAD_TOP;
  const areaH = lineTop - 24 - areaTop;
  const fixedH = 72 + 20 + 36 + 40; // quote mark, its gap, gap to stars, stars
  const textFont = (s) => (dv ? `400 ${s}px ${THAANA}` : `500 ${s}px ${SERIF}`);
  const lineRatio = dv ? 1.75 : 1.36;
  let size = dv ? 46 : 54;
  let lines;
  for (;;) {
    ctx.font = textFont(size);
    lines = wrap(ctx, comment, inner);
    if (lines.length * size * lineRatio <= areaH - fixedH || size <= 28) break;
    size -= 2;
  }
  const lineH = size * lineRatio;
  const maxLines = Math.max(1, Math.floor((areaH - fixedH) / lineH));
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s*\S+$/, "")}…`;
  }
  const blockH = fixedH + lines.length * lineH;
  let y = areaTop + Math.max(0, (areaH - blockH) / 2);

  // Quote mark (mirrored for Dhivehi)
  ctx.save();
  ctx.fillStyle = TEAL;
  ctx.globalAlpha = 0.9;
  if (dv) { ctx.translate(right, y); ctx.scale(-90 / 110, 72 / 88); }
  else { ctx.translate(left, y); ctx.scale(90 / 110, 72 / 88); }
  ctx.fill(QUOTE);
  ctx.restore();
  y += 72 + 20;

  ctx.fillStyle = NAVY;
  ctx.font = textFont(size);
  ctx.direction = dv ? "rtl" : "ltr";
  ctx.textAlign = dv ? "right" : "left";
  for (const line of lines) {
    ctx.fillText(line, edge, y + lineH / 2);
    y += lineH;
  }
  ctx.direction = "ltr";
  y += 36;

  // Stars
  const starCount = Math.max(1, Math.min(5, Math.round(rating || 5)));
  for (let i = 0; i < 5; i++) {
    const sx = dv ? right - 40 - i * 48 : left + i * 48;
    ctx.save();
    ctx.translate(sx, y);
    ctx.scale(40 / 24, 40 / 24);
    ctx.fillStyle = i < starCount ? GOLD : "#D5E2EE";
    ctx.fill(STAR);
    ctx.restore();
  }

  // Name and class under a thin line
  ctx.fillStyle = "#C7DDF4";
  ctx.fillRect(left, lineTop, inner, 2);
  const avY = lineTop + 30 + 42;
  const avX = dv ? right - 42 : left + 42;
  const av = ctx.createLinearGradient(avX - 42, avY - 42, avX + 42, avY + 42);
  av.addColorStop(0, "#176FD1");
  av.addColorStop(1, TEAL);
  ctx.fillStyle = av;
  ctx.beginPath();
  ctx.arc(avX, avY, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.font = `700 34px Inter, Faruma, sans-serif`;
  ctx.fillText([...name.trim()][0]?.toUpperCase() || "", avX, avY + 1);

  const textX = dv ? right - 84 - 22 : left + 84 + 22;
  const textMax = inner - 84 - 22;
  ctx.textAlign = dv ? "right" : "left";
  ctx.fillStyle = NAVY;
  // The masked name keeps its own direction, so "Fa*****" never turns into "*****Fa".
  ctx.direction = THAANA_RE.test(name) ? "rtl" : "ltr";
  fitText(ctx, name, textX, avY - (dv ? 20 : 16), textMax, 34, (s) => (dv ? `400 ${s}px ${AAMMU}` : `700 ${s}px Inter, Faruma, sans-serif`));
  const cls = dv ? REVIEW_CLASSES.find((c) => c.en === className)?.dv || className : className;
  ctx.direction = dv ? "rtl" : "ltr";
  ctx.fillStyle = MUTED;
  fitText(ctx, cls || "", textX, avY + (dv ? 24 : 20), textMax, dv ? 32 : 24, (s) => (dv ? `400 ${s}px ${THAANA}` : `500 ${s}px ${INTER}`));
  ctx.direction = "ltr";

  // Website
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `600 26px ${INTER}`;
  ctx.fillText("aflaahqc.com", S / 2, 994);
  return canvas;
}

export const postBlob = (canvas) =>
  new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't make the image."))), "image/png"));

export const postFileName = (name, lang) =>
  `Review - ${name.replace(/[\\/:*?"<>|]+/g, " ").replace(/\*+/g, "").trim() || "student"} - ${lang === "dv" ? "Dhivehi" : "English"}.png`;
