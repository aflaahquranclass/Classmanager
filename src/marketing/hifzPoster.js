// The Hifz success poster for Instagram (Admin → Social Media), drawn on a
// canvas so the admin can download it as a PNG. Dhivehi, right to left: the
// student's name (any of its words can be blurred for public posts), age,
// juz memorised, the Hifz progress bar with an open Mushaf on it, the prizes
// for each juz and the join-the-class note. Same design as
// brand/instagram/student-poster.html.

export const POSTER_SIZES = [
  { key: "feed", label: "Feed post", dims: "1080 × 1350" },
  { key: "story", label: "Story", dims: "1080 × 1920" },
];
// Story: content kept clear of Instagram's own bars at the top and bottom.
const LAYOUT = {
  feed: { w: 1080, h: 1350, top: 46, side: 56, bottom: 40 },
  story: { w: 1080, h: 1920, top: 220, side: 64, bottom: 240 },
};
export const TOTAL_JUZ = 30;

const C = {
  navy: "#123B67", deep: "#0D4F85", blue: "#176FD1", teal: "#0A94B1", cyan: "#22D3E0",
  soft: "#EEF6FA", line: "#C7DDF4", foot: "#6B819A", title: "#1F3A5A", track: "#E8EFF6", iconBg: "#EEF4FB", gold: "#F3D27A",
};
// Own family names, so the portal's Thaana fonts (limited to Thaana letters)
// are left alone.
const AAMMU = "AQCPosterAammu";
const FARUMA = "AQCPosterFaruma";
const UTHMANI = "AQCPosterUthmani";
const INTER = "Inter, ui-sans-serif, system-ui, sans-serif";

const TEXT = {
  title: "ތަހުނިޔާ!",
  dua: "مَا شَآءَ ٱللَّهُ تَبَارَكَ ٱللَّهُ",
  namePlaceholder: "ދަރިވަރުގެ ނަން",
  age: ["ޢުމުރު:", "އަހަރު"],
  memorised: "ފޮތް ހިފްޡުކޮށްފި",
  juz: "ފޮތް",
  progress: "ހިފްޡުކުރެވުނު މިންވަރު",
  ofJuz: "ފޮތުން",
  complete: "ފުރިހަމަ",
  prizeLine: ["ހިފްޡުކުރާ", "ކޮންމެ ފޮތަކަށް", "ޓްރޮފީއެއް، ފައިސާގެ އިނާމެއް އަދި ސެޓްފިކެޓެއް ދެވޭނެއެވެ."],
  prizes: ["ޓްރޮފީ", "ފައިސާގެ އިނާމު", "ސެޓްފިކެޓް"],
  join: ["ބޮޑެތި މީހުން އަދި ސުކޫލްދަރިވަރުންގެ", "ހިފްޡު ކުލާހުގައި", "ބައިވެރިވުމަށް ކެޕްޝަންގައިވާ ފޯމް ފުރާލާ"],
  blessing: "މާތް ﷲ މި ދަރިވަރަށް ފުރިހަމަ ކާމިޔާބީ މިންވަރުކުރައްވާށި! އާމީން",
};

// ---------- loading ----------

let fontsReady = null;
function loadFonts() {
  if (!fontsReady) {
    fontsReady = (async () => {
      const faces = [[AAMMU, "/fonts/MV_AammuFK_Regular.ttf"], [FARUMA, "/fonts/Faruma.ttf"], [UTHMANI, "/fonts/UthmanicHafs1Ver18.woff2"]];
      await Promise.all(faces.map(async ([family, url]) => {
        const face = new FontFace(family, `url(${url})`);
        await face.load();
        document.fonts.add(face);
      }));
      await Promise.all(["500", "700"].map((w) => document.fonts.load(`${w} 40px Inter`).catch(() => {})));
    })().catch((e) => { fontsReady = null; throw e; });
  }
  return fontsReady;
}

const images = {};
function loadImage(src) {
  if (!images[src]) {
    images[src] = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => { delete images[src]; reject(new Error(`Couldn't load ${src}`)); };
      img.src = src;
    });
  }
  return images[src];
}

// ---------- drawing helpers ----------

function canvasOf(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return c;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// A CSS linear-gradient(<deg>, …) over the box.
function cssGradient(ctx, deg, x, y, w, h, stops) {
  const a = (deg * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}
const BRAND_STOPS = [[0, C.deep], [0.55, C.blue], [1, C.teal]];

function shadowed(ctx, color, blur, offsetY, draw) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = offsetY;
  draw();
  ctx.restore();
}

// Lucide-style line icon from 24×24 path data.
function lineIcon(ctx, paths, cx, cy, size, color, width) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of paths) ctx.stroke(new Path2D(d));
  ctx.restore();
}
const ICON = {
  bookOpenText: ["M12 7v14", "M16 12h2", "M16 8h2", "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z", "M6 12h2", "M6 8h2"],
  clipboard: ["M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z", "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2", "M8 11h8M8 15h5"],
  arrowDown: ["M12 5v14M6 13l6 6 6-6"],
};

// Text centred on y the way CSS centres a line of text: by the font's own
// ascent and descent (Thaana fonts sit too high with "middle").
function fillMid(ctx, text, x, y) {
  const m = ctx.measureText(text);
  const a = m.fontBoundingBoxAscent;
  const d = m.fontBoundingBoxDescent;
  if (a == null || d == null) {
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
    return;
  }
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x, y + (a - d) / 2);
}

// Text in pieces of different fonts, in reading order, laid out right to left
// with its right edge at `right`. Each run: { text, font, size, weight, color, ltr, gap }.
const runFont = (r, k = 1) => `${r.weight || 400} ${r.size * k}px ${r.font}`;
function runsWidth(ctx, runs, k = 1) {
  return runs.reduce((sum, r, i) => {
    ctx.font = runFont(r, k);
    return sum + ctx.measureText(r.text).width + (i < runs.length - 1 ? (r.gap ?? 0) * k : 0);
  }, 0);
}
// Shrinks the runs to fit `max`; returns the scale used.
const fitScale = (ctx, runs, max) => Math.min(1, max / runsWidth(ctx, runs));
function drawRuns(ctx, runs, right, y, k = 1) {
  let x = right;
  ctx.textAlign = "right";
  for (const r of runs) {
    ctx.font = runFont(r, k);
    ctx.direction = r.ltr ? "ltr" : "rtl";
    ctx.fillStyle = r.color;
    fillMid(ctx, r.text, x, y);
    x -= ctx.measureText(r.text).width + (r.gap ?? 0) * k;
  }
  ctx.direction = "rtl";
}

// Gaussian-like blur (three box blurs each way) of a canvas, done by hand so
// it looks the same in every browser (canvas filters don't work in Safari).
function blurCanvas(c, radius) {
  const ctx = c.getContext("2d");
  const { width: w, height: h } = c;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const px = new Float32Array(d.length);
  for (let i = 0; i < d.length; i += 4) { // premultiplied, so edges don't go dark
    const a = d[i + 3] / 255;
    px[i] = d[i] * a; px[i + 1] = d[i + 1] * a; px[i + 2] = d[i + 2] * a; px[i + 3] = d[i + 3];
  }
  const tmp = new Float32Array(px.length);
  const size = radius * 2 + 1;
  const pass = (src, dst, horizontal) => {
    const len = horizontal ? w : h;
    const lines = horizontal ? h : w;
    const step = horizontal ? 4 : w * 4;
    const lineStep = horizontal ? w * 4 : 4;
    for (let l = 0; l < lines; l++) {
      const base = l * lineStep;
      for (let ch = 0; ch < 4; ch++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) sum += src[base + Math.min(len - 1, Math.max(0, k)) * step + ch];
        for (let i = 0; i < len; i++) {
          dst[base + i * step + ch] = sum / size;
          sum += src[base + Math.min(len - 1, i + radius + 1) * step + ch] - src[base + Math.max(0, i - radius) * step + ch];
        }
      }
    }
  };
  for (let n = 0; n < 3; n++) { pass(px, tmp, true); pass(tmp, px, false); }
  for (let i = 0; i < d.length; i += 4) {
    const a = px[i + 3];
    const k = a > 0 ? 255 / a : 0;
    d[i] = px[i] * k; d[i + 1] = px[i + 1] * k; d[i + 2] = px[i + 2] * k; d[i + 3] = a;
  }
  ctx.putImageData(img, 0, 0);
}

// A word made unreadable: drawn at half size, blurred, and scaled back up.
function drawBlurredWord(ctx, word, right, y, font, fill, width, size) {
  const pad = size;
  const w = width + pad * 2;
  const h = size * 1.6 + pad * 2;
  const left = right - width - pad;
  const top = y - h / 2;
  const half = canvasOf(w / 2, h / 2);
  const s = half.getContext("2d");
  s.scale(0.5, 0.5);
  s.translate(-left, -top); // same coordinates as the poster, so the gradient lines up
  s.font = font;
  s.direction = "rtl";
  s.textAlign = "right";
  s.fillStyle = fill(s);
  fillMid(s, word, right, y);
  blurCanvas(half, Math.round(size / 9));
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(half, left, top, w, h);
  ctx.restore();
}

// The open Mushaf that sits on the progress bar, in a 150×104 box.
function drawMushaf(c) {
  const P = (d) => new Path2D(d);
  c.fillStyle = "rgba(18,59,103,0.25)";
  c.beginPath();
  c.ellipse(75, 99, 52, 4, 0, 0, Math.PI * 2);
  c.fill();
  const cover = c.createLinearGradient(4, 8, 146, 94);
  cover.addColorStop(0, C.deep); cover.addColorStop(0.6, C.blue); cover.addColorStop(1, C.teal);
  c.fillStyle = cover;
  c.fill(P("M75 22 Q46 8 6 14 L4 86 Q44 80 75 94 Q106 80 146 86 L144 14 Q104 8 75 22 Z"));
  c.fillStyle = "#E2CFA0";
  c.fill(P("M75 20 Q47 7 11 12 L10 81 Q45 76 75 89 Z"));
  c.fill(P("M75 20 Q103 7 139 12 L140 81 Q105 76 75 89 Z"));
  const page = (x0, x1) => {
    const g = c.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, "#FFFFFF"); g.addColorStop(0.7, "#FFF9EA"); g.addColorStop(1, "#E9D9AE");
    return g;
  };
  c.strokeStyle = "#E2CFA0";
  c.lineWidth = 0.8;
  const left = P("M75 18 Q48 4 14 9 L14 78 Q46 73 75 86 Z");
  const right = P("M75 18 Q102 4 136 9 L136 78 Q104 73 75 86 Z");
  c.fillStyle = page(14, 75); c.fill(left); c.stroke(left);
  c.fillStyle = page(136, 75); c.fill(right); c.stroke(right);
  c.strokeStyle = "#E9C46A";
  c.lineWidth = 1.3;
  c.stroke(P("M68 22 Q48 12 21 15 L21 71 Q46 68 68 78 Z"));
  c.stroke(P("M82 22 Q102 12 129 15 L129 71 Q104 68 82 78 Z"));
  c.save();
  c.globalAlpha = 0.8;
  c.strokeStyle = "#B9A57A";
  c.lineWidth = 1.1;
  c.lineCap = "round";
  for (const d of [
    "M27 28 Q46 25 63 31", "M27 35 Q46 32 63 38", "M27 42 Q46 39 63 45", "M27 49 Q46 46 63 52", "M27 56 Q46 53 63 59", "M35 63 Q48 61 63 66",
    "M87 31 Q104 25 123 28", "M87 38 Q104 32 123 35", "M87 45 Q104 39 123 42", "M87 52 Q104 46 123 49", "M87 59 Q104 53 123 56", "M87 66 Q102 61 115 63",
  ]) c.stroke(P(d));
  c.restore();
  c.fillStyle = "#E9C46A";
  for (const [x, cx, deg] of [[33, 45, 5], [93, 105, -5]]) {
    c.save();
    c.translate(cx, 20); c.rotate((deg * Math.PI) / 180); c.translate(-cx, -20);
    roundRect(c, x, 17.5, 24, 5, 2.5);
    c.fill();
    c.restore();
  }
  c.strokeStyle = "#C9B37E";
  c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(75, 18); c.lineTo(75, 86); c.stroke();
  c.fillStyle = C.gold;
  c.beginPath(); c.arc(75, 92, 3, 0, Math.PI * 2); c.fill();
}

// Prize icons, in a 48×48 box.
function drawTrophy(c) {
  const g = c.createLinearGradient(14, 6, 34, 28);
  g.addColorStop(0, "#F8D57E"); g.addColorStop(1, "#E08E0B");
  c.fillStyle = g;
  c.fill(new Path2D("M14 6h20v12a10 10 0 0 1-20 0z"));
  c.strokeStyle = "#E9A93A"; c.lineWidth = 3;
  c.stroke(new Path2D("M14 10H7v4a7 7 0 0 0 7 7M34 10h7v4a7 7 0 0 1-7 7"));
  c.fillStyle = "#E9A93A"; c.fillRect(21, 27, 6, 8);
  c.fillStyle = C.navy; roundRect(c, 14, 35, 20, 6, 2); c.fill();
  c.fillStyle = "#FFF6DA";
  c.fill(new Path2D("M24 10l1.6 3.3 3.6.5-2.6 2.5.6 3.6L24 18.2l-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z"));
}
function drawCash(c) {
  c.fillStyle = "#1E8A5A"; roundRect(c, 4, 12, 40, 24, 4); c.fill();
  c.strokeStyle = "#9FE0BF"; c.lineWidth = 1.6; roundRect(c, 8, 16, 32, 16, 2); c.stroke();
  c.fillStyle = "#9FE0BF";
  for (const [x, r] of [[24, 6], [12, 1.8], [36, 1.8]]) { c.beginPath(); c.arc(x, 24, r, 0, Math.PI * 2); c.fill(); }
}
function drawCertificate(c) {
  roundRect(c, 6, 6, 32, 38, 3);
  c.fillStyle = "#FFFFFF"; c.fill();
  c.strokeStyle = C.blue; c.lineWidth = 2.4; c.stroke();
  c.strokeStyle = "#8FADC0"; c.lineWidth = 2.2; c.lineCap = "round";
  c.stroke(new Path2D("M12 15h20M12 21h20M12 27h12"));
  c.fillStyle = "#E08E0B"; c.fill(new Path2D("M28 39l-2 7 5-2.5M38 39l2 7-5-2.5"));
  c.fillStyle = "#EF9F27"; c.beginPath(); c.arc(33, 33, 8, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "#FFF6DA"; c.lineWidth = 1.6; c.beginPath(); c.arc(33, 33, 4, 0, Math.PI * 2); c.stroke();
}
function drawIcon(ctx, draw, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 48, size / 48);
  draw(ctx);
  ctx.restore();
}

// ---------- the poster ----------

export const nameWords = (name) => String(name || "").trim().split(/\s+/).filter(Boolean);

// name: student's name (Thaana); age: years (optional); juz: juz memorised
// (0–30); blur: indexes of the name's words to blur; size: "feed" | "story".
export async function drawHifzPoster({ name, age, juz, blur = [], size = "feed" }) {
  await loadFonts();
  const [logo, pattern] = await Promise.all([loadImage("/images/logo-full-white.png"), loadImage("/images/tp-pattern-main.png")]);
  const L = LAYOUT[size] || LAYOUT.feed;
  const { w: W, h: H, side } = L;
  const canvas = canvasOf(W, H);
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";

  const juzCount = Math.max(0, Math.min(TOTAL_JUZ, Math.round(Number(juz) || 0)));
  const pct = Math.round((juzCount / TOTAL_JUZ) * 100);
  const ageText = String(age ?? "").trim();
  const words = nameWords(name);
  const blurred = new Set(blur);

  // Background: brand gradient, a soft cyan glow and the pattern in two corners.
  ctx.fillStyle = cssGradient(ctx, 160, 0, 0, W, H, [[0, C.deep], [0.52, C.blue], [1, C.teal]]);
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.05, H - W * 0.05, 0, W * 0.05, H - W * 0.05, W * 0.46);
  glow.addColorStop(0, "rgba(34,211,224,0.35)");
  glow.addColorStop(1, "rgba(34,211,224,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  const pat = Math.round(W * 0.95);
  const white = canvasOf(pat, pat);
  const wc = white.getContext("2d");
  wc.drawImage(pattern, 0, 0, pat, pat);
  wc.globalCompositeOperation = "source-in";
  wc.fillStyle = "#FFFFFF";
  wc.fillRect(0, 0, pat, pat);
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.drawImage(white, W - pat * 0.9, -pat * 0.1, pat, pat);
  ctx.globalAlpha = 0.08;
  ctx.translate(pat * 0.9, H + pat * 0.1);
  ctx.rotate(Math.PI);
  ctx.drawImage(white, 0, 0, pat, pat);
  ctx.restore();

  // Blocks top to bottom, spread evenly like the HTML version.
  const blocks = { top: 226, student: 220, tracker: 291, prizes: 171, join: 102, blessing: 39 };
  const heights = Object.values(blocks);
  const gap = (H - L.top - L.bottom - heights.reduce((a, b) => a + b, 0)) / (heights.length - 1);
  const at = {};
  let y = L.top;
  for (const [key, h] of Object.entries(blocks)) { at[key] = y; y += h + gap; }
  const x0 = side;
  const cw = W - side * 2;
  const cardShadow = (draw) => shadowed(ctx, "rgba(8,30,60,0.30)", 60, 24, draw);

  // Logo, top left.
  const logoW = 170;
  ctx.drawImage(logo, x0, L.top, logoW, (logo.naturalHeight / logo.naturalWidth) * logoW);

  // ތަހުނިޔާ! with the Arabic dua under it.
  ctx.textAlign = "center";
  shadowed(ctx, "rgba(8,30,60,0.35)", 24, 6, () => {
    ctx.font = `112px ${AAMMU}`;
    ctx.fillStyle = "#FFFFFF";
    fillMid(ctx, TEXT.title, W / 2, at.top + 63);
  });
  ctx.font = `50px ${UTHMANI}`;
  ctx.fillStyle = C.gold;
  fillMid(ctx, TEXT.dua, W / 2, at.top + 188);

  // Student card: name, chips and the big juz badge.
  {
    const top = at.student;
    const h = blocks.student;
    cardShadow(() => { roundRect(ctx, x0, top, cw, h, 34); ctx.fillStyle = "#FFFFFF"; ctx.fill(); });
    const cx = x0 + 40 + 84;
    const cy = top + h / 2;
    shadowed(ctx, "rgba(13,79,133,0.3)", 24, 10, () => {
      ctx.beginPath(); ctx.arc(cx, cy, 84, 0, Math.PI * 2);
      ctx.fillStyle = cssGradient(ctx, 150, cx - 84, cy - 84, 168, 168, BRAND_STOPS);
      ctx.fill();
    });
    ctx.beginPath(); ctx.arc(cx, cy, 80.5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 7; ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFFFFF";
    ctx.direction = "ltr";
    ctx.font = `700 84px ${INTER}`;
    fillMid(ctx, String(juzCount), cx, cy - 18);
    ctx.direction = "rtl";
    ctx.font = `30px ${AAMMU}`;
    fillMid(ctx, TEXT.juz, cx, cy + 44);

    // Name, word by word so any word can be blurred.
    const right = x0 + cw - 40;
    const maxW = cw - 80 - 168 - 34;
    const nameY = top + 73;
    const shown = words.length ? words : [TEXT.namePlaceholder];
    let fs = 58;
    let widths;
    let space;
    let total;
    for (;;) {
      ctx.font = `${fs}px ${AAMMU}`;
      space = ctx.measureText(" ").width;
      widths = shown.map((w) => ctx.measureText(w).width);
      total = widths.reduce((a, b) => a + b, 0) + space * (shown.length - 1);
      if (total <= maxW || fs <= 30) break;
      fs -= 2;
    }
    const nameFill = (c) => {
      const g = c.createLinearGradient(right - total, 0, right, 0);
      for (const [o, col] of BRAND_STOPS) g.addColorStop(o, col);
      return words.length ? g : "#9AB0C6";
    };
    let nx = right;
    shown.forEach((w, i) => {
      if (words.length && blurred.has(i)) {
        drawBlurredWord(ctx, w, nx, nameY, `${fs}px ${AAMMU}`, nameFill, widths[i], fs);
      } else {
        ctx.font = `${fs}px ${AAMMU}`;
        ctx.textAlign = "right";
        ctx.fillStyle = nameFill(ctx);
        fillMid(ctx, w, nx, nameY);
      }
      nx -= widths[i] + space;
    });

    // Chips: age and juz memorised.
    const chipText = { font: FARUMA, size: 27, color: C.navy, gap: 8 };
    const chipNum = { font: INTER, size: 27, weight: 700, color: C.navy, ltr: true, gap: 8 };
    const chips = [];
    if (ageText) chips.push([{ ...chipText, text: TEXT.age[0] }, { ...chipNum, text: ageText }, { ...chipText, text: TEXT.age[1] }]);
    chips.push([{ ...chipNum, text: String(juzCount) }, { ...chipText, text: TEXT.memorised }]);
    let chipRight = right;
    const chipH = 58;
    const chipY = top + 125;
    for (const runs of chips) {
      const w = runsWidth(ctx, runs) + 40;
      roundRect(ctx, chipRight - w, chipY, w, chipH, chipH / 2);
      ctx.fillStyle = C.soft; ctx.fill();
      ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke();
      drawRuns(ctx, runs, chipRight - 20, chipY + chipH / 2);
      chipRight -= w + 12;
    }
  }

  // Hifz progress card, like the portal's.
  {
    const top = at.tracker;
    cardShadow(() => { roundRect(ctx, x0, top, cw, blocks.tracker, 34); ctx.fillStyle = "#FFFFFF"; ctx.fill(); });
    const inL = x0 + 40;
    const inR = x0 + cw - 40;
    const headY = top + 24 + 33;
    roundRect(ctx, inR - 58, headY - 29, 58, 58, 16);
    ctx.fillStyle = C.iconBg; ctx.fill();
    lineIcon(ctx, ICON.bookOpenText, inR - 29, headY, 32, C.blue, 1.9);
    ctx.textAlign = "right";
    ctx.font = `36px ${AAMMU}`;
    ctx.fillStyle = C.title;
    fillMid(ctx, TEXT.progress, inR - 58 - 16, headY);
    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.font = `700 68px ${INTER}`;
    ctx.fillStyle = C.navy;
    fillMid(ctx, `${pct}%`, inL, headY + 2);
    ctx.direction = "rtl";

    const barTop = top + 136;
    const barW = inR - inL;
    roundRect(ctx, inL, barTop, barW, 34, 17);
    ctx.fillStyle = C.track; ctx.fill();
    const fillW = (barW * pct) / 100;
    if (fillW > 0) {
      const g = ctx.createLinearGradient(inR, 0, inR - fillW, 0);
      g.addColorStop(0, C.deep); g.addColorStop(0.45, C.blue); g.addColorStop(1, C.cyan);
      roundRect(ctx, inR - fillW, barTop, fillW, 34, 17);
      ctx.fillStyle = g; ctx.fill();
    }
    // The Mushaf rides on the bar where the filling ends.
    const book = canvasOf(150, 104);
    drawMushaf(book.getContext("2d"));
    const bookX = inR - Math.min(Math.max((barW * pct) / 100, 40), barW - 40);
    shadowed(ctx, "rgba(13,79,133,0.35)", 10, 8, () => ctx.drawImage(book, bookX - 75, barTop + 17 - 60.3));

    const cellsTop = barTop + 34 + 26;
    const cellW = (barW - 6 * (TOTAL_JUZ - 1)) / TOTAL_JUZ;
    for (let i = 0; i < TOTAL_JUZ; i++) {
      const cx = inR - cellW - i * (cellW + 6);
      roundRect(ctx, cx, cellsTop, cellW, 16, 5);
      if (i < juzCount) {
        const g = ctx.createLinearGradient(0, cellsTop, 0, cellsTop + 16);
        g.addColorStop(0, C.blue); g.addColorStop(1, C.teal);
        ctx.fillStyle = g;
      } else ctx.fillStyle = C.track;
      ctx.fill();
    }

    const footY = cellsTop + 16 + 16 + 19.5;
    const t = { font: FARUMA, size: 26, color: C.foot, gap: 7 };
    const n = { font: INTER, size: 26, weight: 500, color: C.foot, ltr: true, gap: 7 };
    const b = { font: INTER, size: 26, weight: 700, color: C.navy, ltr: true, gap: 7 };
    drawRuns(ctx, [{ ...n, text: String(TOTAL_JUZ) }, { ...t, text: TEXT.ofJuz }, { ...b, text: String(juzCount) }, { ...t, text: TEXT.juz }], inR, footY);
    const done = [{ ...b, text: `${pct}%` }, { ...t, text: TEXT.complete }];
    drawRuns(ctx, done, inL + runsWidth(ctx, done), footY);
  }

  // Prizes for each juz.
  {
    const top = at.prizes;
    roundRect(ctx, x0, top, cw, blocks.prizes, 30);
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.28)"; ctx.lineWidth = 1.5; ctx.stroke();
    const base = { font: FARUMA, size: 28, color: "#FFFFFF", gap: 8 };
    const line = [{ ...base, text: TEXT.prizeLine[0] }, { ...base, font: AAMMU, color: C.gold, text: TEXT.prizeLine[1] }, { ...base, text: TEXT.prizeLine[2] }];
    const k = fitScale(ctx, line, cw - 60);
    drawRuns(ctx, line, W / 2 + runsWidth(ctx, line, k) / 2, top + 41.5, k);

    const rowTop = top + 77;
    const boxW = (cw - 60 - 22 * 2) / 3;
    const icons = [drawTrophy, drawCash, drawCertificate];
    TEXT.prizes.forEach((label, i) => {
      const bx = x0 + cw - 30 - boxW - i * (boxW + 22);
      roundRect(ctx, bx, rowTop, boxW, 72, 20);
      ctx.fillStyle = "#FFFFFF"; ctx.fill();
      ctx.font = `30px ${AAMMU}`;
      const tw = ctx.measureText(label).width;
      const contentW = 52 + 12 + tw;
      const right = bx + boxW / 2 + contentW / 2;
      drawIcon(ctx, icons[i], right - 52, rowTop + 10, 52);
      ctx.textAlign = "right";
      ctx.fillStyle = C.navy;
      fillMid(ctx, label, right - 52 - 12, rowTop + 36);
    });
  }

  // Join the class: fill the form in the caption.
  {
    const top = at.join;
    const h = blocks.join;
    cardShadow(() => { roundRect(ctx, x0, top, cw, h, 26); ctx.fillStyle = "#FFFFFF"; ctx.fill(); });
    roundRect(ctx, x0 + 1.5, top + 1.5, cw - 3, h - 3, 24.5);
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 3; ctx.stroke();
    const cy = top + h / 2;
    const iconR = x0 + cw - 3 - 20;
    roundRect(ctx, iconR - 64, cy - 32, 64, 64, 18);
    ctx.fillStyle = cssGradient(ctx, 135, iconR - 64, cy - 32, 64, 64, BRAND_STOPS); ctx.fill();
    lineIcon(ctx, ICON.clipboard, iconR - 32, cy, 34, "#FFFFFF", 2);
    const arrowL = x0 + 3 + 22;
    ctx.beginPath(); ctx.arc(arrowL + 23, cy, 23, 0, Math.PI * 2);
    ctx.fillStyle = C.iconBg; ctx.fill();
    lineIcon(ctx, ICON.arrowDown, arrowL + 23, cy, 26, C.blue, 2.6);
    const base = { font: FARUMA, size: 26.5, color: C.navy, gap: 8 };
    const runs = [{ ...base, text: TEXT.join[0] }, { ...base, font: AAMMU, color: C.blue, text: TEXT.join[1] }, { ...base, text: TEXT.join[2] }];
    const textR = iconR - 64 - 16;
    const k = fitScale(ctx, runs, textR - (arrowL + 46 + 16));
    drawRuns(ctx, runs, textR, cy, k);
  }

  // Blessing.
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.textAlign = "center";
  ctx.font = `26px ${FARUMA}`;
  ctx.fillStyle = "#FFFFFF";
  fillMid(ctx, TEXT.blessing, W / 2, at.blessing + 19.5);
  ctx.restore();

  return canvas;
}

export function posterFileName({ name, size }) {
  const label = POSTER_SIZES.find((s) => s.key === size)?.label || "Poster";
  const who = nameWords(name).join(" ").replace(/[\\/:*?"<>|]+/g, " ").trim() || "student";
  return `Hifz poster - ${who} - ${label}.png`;
}

export async function downloadHifzPoster(opts) {
  const canvas = await drawHifzPoster(opts);
  const blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't make the image."))), "image/png"));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = posterFileName(opts);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
