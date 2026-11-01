// A teacher's salary sheet drawn as a PNG for the admin to send them: the
// teacher and month on top, a line per class (paid students and amount),
// then the adjustment, bonus and total. `sheet` comes from salarySheet() in
// salary.js.

const W = 1080;
const PAD = 48;
const NAVY = "#123B67";
const MUTED = "#567493";
const LINE = "#DCEBF8";
const FONT = "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
const HEAD_H = 200;
const ROW_H = 64;
const NOTE_H = 30;
const CARD_PAD = 30;
const COL_PAID = 660;
const COL_AMOUNT = W - PAD - CARD_PAD;

const money = (n) => `MVR ${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const signed = (n) => (n < 0 ? `− ${money(-n)}` : `+ ${money(n)}`);

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

function card(ctx, y, h) {
  ctx.save();
  ctx.shadowColor = "rgba(18,59,103,0.08)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, PAD, y, W - PAD * 2, h, 20);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.5;
  roundRect(ctx, PAD, y, W - PAD * 2, h, 20);
  ctx.stroke();
}

function rule(ctx, y) {
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD + CARD_PAD, y);
  ctx.lineTo(W - PAD - CARD_PAD, y);
  ctx.stroke();
}

export async function drawSalarySheet({ teacherName, monthText, sheet }) {
  await Promise.all(["400", "500", "600", "700"].map((w) => document.fonts?.load(`${w} 28px Inter`).catch(() => {})));
  const rows = sheet.rows.length ? sheet.rows : [{ name: "No classes", paid: 0, amount: 0, empty: true }];
  const extras = [
    sheet.adjustment ? { label: "Adjustment", value: sheet.adjustment, note: sheet.adjustmentNote } : null,
    sheet.bonus ? { label: "Bonus", value: sheet.bonus, note: sheet.bonusNote } : null,
  ].filter(Boolean);
  const classesH = CARD_PAD * 2 + ROW_H * (rows.length + 2);
  const extrasH = CARD_PAD * 2 + extras.reduce((n, e) => n + ROW_H + (e.note ? NOTE_H : 0), 0) + ROW_H + 12;
  const H = HEAD_H + PAD + classesH + 24 + extrasH + PAD + 40;
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
  ctx.fillText("Aflaah Quran Class · Salary sheet", PAD, 52);
  ctx.fillStyle = "#FFFFFF";
  fitText(ctx, teacherName, PAD, 106, W - PAD * 2, 48, 700);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `500 28px ${FONT}`;
  ctx.fillText(monthText, PAD, 160);

  // Classes
  let y = HEAD_H + PAD;
  card(ctx, y, classesH);
  const x = PAD + CARD_PAD;
  let ry = y + CARD_PAD + ROW_H / 2;
  ctx.fillStyle = MUTED;
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText("CLASS", x, ry);
  ctx.textAlign = "center";
  ctx.fillText("PAID STUDENTS", COL_PAID, ry);
  ctx.textAlign = "right";
  ctx.fillText("AMOUNT", COL_AMOUNT, ry);
  ctx.textAlign = "left";
  rule(ctx, ry + ROW_H / 2);
  for (const r of rows) {
    ry += ROW_H;
    ctx.fillStyle = r.empty ? "#9AA9BA" : NAVY;
    fitText(ctx, r.name, x, ry, COL_PAID - x - 110, 28, 600);
    if (!r.empty) {
      ctx.textAlign = "center";
      ctx.font = `600 28px ${FONT}`;
      ctx.fillText(String(r.paid), COL_PAID, ry);
      ctx.textAlign = "right";
      ctx.font = `700 28px ${FONT}`;
      ctx.fillText(money(r.amount), COL_AMOUNT, ry);
      ctx.textAlign = "left";
    }
    rule(ctx, ry + ROW_H / 2);
  }
  ry += ROW_H;
  ctx.fillStyle = NAVY;
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText("From classes", x, ry);
  ctx.textAlign = "center";
  ctx.fillText(String(sheet.paid), COL_PAID, ry);
  ctx.textAlign = "right";
  ctx.fillText(money(sheet.fromClasses), COL_AMOUNT, ry);
  ctx.textAlign = "left";

  // Adjustment, bonus, total
  y += classesH + 24;
  card(ctx, y, extrasH);
  ry = y + CARD_PAD;
  for (const e of extras) {
    ry += ROW_H / 2;
    ctx.fillStyle = NAVY;
    ctx.font = `600 28px ${FONT}`;
    ctx.fillText(e.label, x, ry);
    ctx.textAlign = "right";
    ctx.fillStyle = e.value < 0 ? "#B42318" : "#0F7A4A";
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText(signed(e.value), COL_AMOUNT, ry);
    ctx.textAlign = "left";
    ry += ROW_H / 2;
    if (e.note) {
      ctx.fillStyle = MUTED;
      fitText(ctx, e.note, x, ry - 6, COL_AMOUNT - x, 22, 500);
      ry += NOTE_H;
    }
  }
  ry += 12;
  if (extras.length) rule(ctx, ry);
  ry += ROW_H / 2;
  ctx.fillStyle = NAVY;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText("Total salary", x, ry);
  ctx.textAlign = "right";
  ctx.fillStyle = "#176FD1";
  ctx.font = `800 38px ${FONT}`;
  ctx.fillText(money(sheet.total), COL_AMOUNT, ry);
  ctx.textAlign = "left";

  ctx.fillStyle = "#8FADC0";
  ctx.font = `500 20px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("aflaahqc.com", W / 2, H - 34);
  return canvas;
}

// Draws the sheet and saves it as a .png.
export async function downloadSalarySheet({ teacherName, monthText, sheet }) {
  const canvas = await drawSalarySheet({ teacherName, monthText, sheet });
  const blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't make the image."))), "image/png"));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Salary - ${teacherName.replace(/[\\/:*?"<>|]+/g, " ").trim()} - ${monthText}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
