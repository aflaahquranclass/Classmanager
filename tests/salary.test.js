import { test } from "node:test";
import assert from "node:assert/strict";
import { salarySheet } from "../src/payments/salary.js";

const classes = [{ id: "c1", name: "Hifz B05" }, { id: "c2", name: "Thilawa B12" }];
const students = [
  { id: "s1", teacherId: "t1", classId: "c1", sharePercent: 60 },
  { id: "s2", teacherId: "t1", classId: "c1", sharePercent: 60 },
  { id: "s3", teacherId: "t1", classId: "c2", sharePercent: 70 },
  { id: "s4", teacherId: "t2", classId: "c2", sharePercent: 60 },
  { id: "s5", teacherId: "t1", classId: null, className: "PC Maryam", sharePercent: 100 },
];
const payments = { s1: { paid: true, amountPaid: 375 }, s2: { paid: false }, s3: { paid: true, amountPaid: 500 }, s4: { paid: true, amountPaid: 500 }, s5: { paid: true, amountPaid: 775 } };

test("salary sheet: paid students and amount per class, adjustment and bonus", () => {
  const sheet = salarySheet({ teacherId: "t1", students, payments, classes, adj: { adjustment: -25, adjustmentNote: "Late", bonus: 100 } });
  assert.deepEqual(sheet.rows.map((r) => [r.name, r.students, r.paid, r.amount]), [
    ["Hifz B05", 2, 1, 225],
    ["PC Maryam", 1, 1, 775],
    ["Thilawa B12", 1, 1, 350],
  ]);
  assert.equal(sheet.paid, 3);
  assert.equal(sheet.fromClasses, 1350);
  assert.equal(sheet.total, 1425);
  assert.equal(sheet.adjustmentNote, "Late");
});

test("salary sheet with no adjustments", () => {
  const sheet = salarySheet({ teacherId: "t2", students, payments, classes });
  assert.equal(sheet.total, 300);
  assert.equal(sheet.adjustment, 0);
  assert.equal(sheet.bonus, 0);
});
