// Admin → Finance → Salaries → Salary sheets: one card per teacher with what
// they get from each class this month (paid students only), a place to
// adjust their salary and add a bonus, and the sheet to download or share
// with them. The teacher's share % is never shown on the sheet.

import { useState, useEffect } from "react";
import { Download, Share2, Save } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { TP, monthLabel, fmtMoney } from "../shared.jsx";
import { salarySheet } from "./salary.js";
import { drawSalarySheet, downloadSalarySheet } from "./salaryImage.js";
import { useSalaryAdjustments, salaryExtrasTotal } from "../admin/adminData.js";
export { useSalaryAdjustments, salaryExtrasTotal };

const EMPTY = { adjustment: "", adjustmentNote: "", bonus: "", bonusNote: "" };
const toForm = (a) => (a ? { adjustment: a.adjustment ? String(a.adjustment) : "", adjustmentNote: a.adjustmentNote, bonus: a.bonus ? String(a.bonus) : "", bonusNote: a.bonusNote } : EMPTY);
const sameForm = (a, b) => ["adjustment", "adjustmentNote", "bonus", "bonusNote"].every((k) => String(a[k]).trim() === String(b[k]).trim());

const canShareFiles = () => typeof navigator !== "undefined" && !!navigator.canShare && navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] });

function TeacherSalaryCard({ teacher, students, payments, classes, month, saved, onSave }) {
  const [form, setForm] = useState(() => toForm(saved));
  const [status, setStatus] = useState("");
  useEffect(() => { setForm(toForm(saved)); setStatus(""); }, [saved, month]);

  const sheet = salarySheet({ teacherId: teacher.id, students, payments, classes, adj: form });
  const dirty = !sameForm(form, toForm(saved));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const args = { teacherName: teacher.name, monthText: monthLabel(month), sheet };

  const save = async () => {
    setStatus("Saving…");
    try { await onSave(teacher.id, form); setStatus("Saved"); }
    catch { setStatus("Couldn't save. Try again."); }
  };
  const download = async () => {
    try { await downloadSalarySheet(args); } catch { setStatus("Couldn't make the sheet."); }
  };
  const share = async () => {
    try {
      const canvas = await drawSalarySheet(args);
      const blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error())), "image/png"));
      const file = new File([blob], `Salary - ${teacher.name} - ${args.monthText}.png`, { type: "image/png" });
      await navigator.share({ files: [file], title: `Salary — ${args.monthText}` });
    } catch (e) {
      if (e?.name !== "AbortError") setStatus("Couldn't share. Use Download instead.");
    }
  };

  return (
    <div className="tp-card tp-salary-card">
      <div className="tp-salary-head">
        <div style={{ fontSize: "16px", fontWeight: 700, color: TP.navy }}>{teacher.name}</div>
        <div style={{ fontSize: "18px", fontWeight: 800, color: TP.blue }}>{fmtMoney(sheet.total)}</div>
      </div>

      {sheet.rows.length === 0 ? (
        <div style={{ color: TP.secondaryText, fontSize: "13px", margin: "6px 0 12px" }}>No students with this teacher in {monthLabel(month)}.</div>
      ) : (
        <div className="tp-table-wrap"><table className="tp-list-table">
          <thead><tr><th>Class</th><th>Paid students</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
          <tbody>
            {sheet.rows.map((r) => (
              <tr key={r.key}>
                <td>{r.name}</td>
                <td>{r.paid}<span style={{ color: TP.secondaryText, fontSize: "12px" }}> of {r.students}</span></td>
                <td style={{ textAlign: "right" }}>{fmtMoney(r.amount)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700 }}>
              <td>From classes</td>
              <td>{sheet.paid}</td>
              <td style={{ textAlign: "right" }}>{fmtMoney(sheet.fromClasses)}</td>
            </tr>
          </tbody>
        </table></div>
      )}

      <div className="tp-salary-form">
        <div>
          <label>Adjust salary (+ or −)</label>
          <input className="lc-input" type="number" step="0.01" value={form.adjustment} onChange={set("adjustment")} placeholder="0" />
          <input className="lc-input" value={form.adjustmentNote} onChange={set("adjustmentNote")} placeholder="Reason (shown on the sheet)" />
        </div>
        <div>
          <label>Bonus</label>
          <input className="lc-input" type="number" min="0" step="0.01" value={form.bonus} onChange={set("bonus")} placeholder="0" />
          <input className="lc-input" value={form.bonusNote} onChange={set("bonusNote")} placeholder="Reason (shown on the sheet)" />
        </div>
      </div>

      <div className="tp-salary-actions">
        <button type="button" className="tp-btn-outline" onClick={save} disabled={!dirty}><Save size={16} /> Save</button>
        <button type="button" className="tp-btn-gradient" onClick={download}><Download size={16} /> Download sheet</button>
        {canShareFiles() && <button type="button" className="tp-btn-outline" onClick={share}><Share2 size={16} /> Share</button>}
        {(status || dirty) && <span style={{ fontSize: "12px", color: TP.secondaryText }}>{dirty && status !== "Saving…" ? "Not saved yet" : status}</span>}
      </div>
    </div>
  );
}

export function SalarySheets({ teachers, students, payments, classes, month, adjustments, onSave }) {
  if (teachers.length === 0) return null;
  return (
    <>
      <style>{`
        .tp-salary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); gap: 14px; margin-bottom: 14px; }
        .tp-salary-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 8px; }
        .tp-salary-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
        .tp-salary-form label { display: block; font-size: 12px; color: ${TP.secondaryText}; margin-bottom: 4px; }
        .tp-salary-form .lc-input { margin-bottom: 6px; }
        .tp-salary-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 8px; }
        .tp-salary-actions .tp-btn-outline, .tp-salary-actions .tp-btn-gradient { height: 40px; min-height: 40px; }
        @media (max-width: 520px) { .tp-salary-form { grid-template-columns: 1fr; } }
      `}</style>
      <div style={{ fontSize: "15px", fontWeight: 600, color: TP.navy, margin: "4px 0 10px" }}>Salary sheets — {monthLabel(month)}</div>
      <div className="tp-salary-grid">
        {teachers.map((t) => (
          <TeacherSalaryCard key={t.id} teacher={t} students={students} payments={payments} classes={classes} month={month} saved={adjustments[t.id]} onSave={onSave} />
        ))}
      </div>
    </>
  );
}

