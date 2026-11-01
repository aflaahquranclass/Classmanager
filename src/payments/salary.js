// A teacher's salary sheet for a month: one line per class with the number
// of students who paid and what the teacher gets from them, then the admin's
// adjustment and bonus. The teacher's share % stays off the sheet — only
// amounts are shown.

const round2 = (n) => Math.round(n * 100) / 100;

// students: the month's active students ({ teacherId, classId, className,
// sharePercent }); payments: { [studentId]: { paid, amountPaid } };
// classes: [{ id, name }]; adj: { adjustment, adjustmentNote, bonus, bonusNote }.
export function salarySheet({ teacherId, students, payments, classes, adj }) {
  const classNames = Object.fromEntries((classes || []).map((c) => [c.id, c.name]));
  const byClass = new Map();
  for (const s of students) {
    if (s.teacherId !== teacherId) continue;
    const name = (s.classId && classNames[s.classId]) || s.className || "No class";
    const key = s.classId || `name:${name}`;
    if (!byClass.has(key)) byClass.set(key, { key, name, students: 0, paid: 0, amount: 0 });
    const row = byClass.get(key);
    row.students += 1;
    const rec = payments[s.id];
    if (!rec || !rec.paid) continue;
    const pct = Math.min(100, Math.max(0, Number(s.sharePercent) || 0));
    row.paid += 1;
    row.amount += (Number(rec.amountPaid) || 0) * (pct / 100);
  }
  const rows = [...byClass.values()]
    .map((r) => ({ ...r, amount: round2(r.amount) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const fromClasses = round2(rows.reduce((n, r) => n + r.amount, 0));
  const adjustment = Number(adj?.adjustment) || 0;
  const bonus = Number(adj?.bonus) || 0;
  return {
    rows,
    paid: rows.reduce((n, r) => n + r.paid, 0),
    fromClasses,
    adjustment,
    adjustmentNote: adj?.adjustmentNote || "",
    bonus,
    bonusNote: adj?.bonusNote || "",
    total: round2(fromClasses + adjustment + bonus),
  };
}
