// A class's Hifz task list drawn as a PNG for the teacher to download and
// share (e.g. in the class group): the class name and day on top, then each
// student with their Hifz, Short and Long Muraja'ah. `sheet` comes from
// classTaskSheet() in tasks.js.

const W = 1080;
const PAD = 48;
const NAVY = "#123B67";
const MUTED = "#567493";
const FONT = "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
const HEAD_H = 190;
const NAME_H = 54;
const LINE_H = 46;
const CARD_PAD = 26;
const GAP = 18;
const LABEL_W = 250;

const fmtDay = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Text at `size`, made smaller until it fits `max` pixels.
function fitText(ctx, text, x, y, max, size, weight = 600) {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${FONT}`; s -= 1; } while (ctx.measureText(text).width > max && s > 14);
  ctx.fillText(text, x, y);
}

export async function drawClassTasks({ className, sheet }) {
  await Promise.all(["400", "600", "700"].map((w) => document.fonts?.load(`${w} 28px Inter`).catch(() => {})));
  const cardH = CARD_PAD * 2 + NAME_H + LINE_H * 3;
  const H = HEAD_H + PAD + sheet.rows.length * (cardH + GAP) - GAP + PAD + 40;
  const scale = 2; // sharp on phones
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#F4F8FC";
  ctx.fillRect(0, 0, W, H);

  // Heading
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, "#0D4F85");
  g.addColorStop(0.55, "#176FD1");
  g.addColorStop(1, "#0A94B1");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HEAD_H);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = `600 24px ${FONT}`;
  ctx.fillText("Aflaah Quran Class · Hifz tasks", PAD, 50);
  ctx.fillStyle = "#FFFFFF";
  fitText(ctx, className, PAD, 102, W - PAD * 2, 46, 700);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `500 26px ${FONT}`;
  ctx.fillText(sheet.date ? fmtDay(sheet.date) : "", PAD, 152);

  // One card per student
  let y = HEAD_H + PAD;
  for (const row of sheet.rows) {
    ctx.save();
    ctx.shadowColor = "rgba(18,59,103,0.08)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, PAD, y, W - PAD * 2, cardH, 20);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#DCEBF8";
    ctx.lineWidth = 1.5;
    roundRect(ctx, PAD, y, W - PAD * 2, cardH, 20);
    ctx.stroke();

    const x = PAD + CARD_PAD;
    ctx.fillStyle = NAVY;
    fitText(ctx, row.name, x, y + CARD_PAD + NAME_H / 2, W - PAD * 2 - CARD_PAD * 2, 34, 700);
    let ly = y + CARD_PAD + NAME_H + LINE_H / 2;
    for (const item of row.items) {
      ctx.fillStyle = MUTED;
      ctx.font = `600 25px ${FONT}`;
      ctx.fillText(`${item.label}:`, x, ly);
      const text = item.text ? `${item.text}${item.date ? ` · ${fmtDay(item.date)}` : ""}` : "Not set";
      ctx.fillStyle = item.text ? NAVY : "#9AA9BA";
      fitText(ctx, text, x + LABEL_W, ly, W - PAD * 2 - CARD_PAD * 2 - LABEL_W, 28, item.text ? 600 : 400);
      ly += LINE_H;
    }
    y += cardH + GAP;
  }

  ctx.fillStyle = "#8FADC0";
  ctx.font = `500 20px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("aflaahqc.com", W / 2, H - 34);
  return canvas;
}

// Draws the list and saves it as a .png.
export async function downloadClassTasks({ className, sheet }) {
  const canvas = await drawClassTasks({ className, sheet });
  const blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't make the image."))), "image/png"));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Hifz tasks - ${className.replace(/[\\/:*?"<>|]+/g, " ").trim()}${sheet.date ? ` - ${sheet.date}` : ""}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
