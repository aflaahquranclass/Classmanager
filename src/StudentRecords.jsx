import { useState, useEffect, useCallback } from "react";
import { maldivesMonth } from "./dates.js";
import { CalendarCheck, Wallet, CheckCircle2, XCircle, Repeat2, Ban, ChevronLeft, ChevronRight, RotateCw, Clock, AlertTriangle, Landmark, Copy, Check, Upload, FileText, X, Hourglass } from "lucide-react";
import { TP, monthLabel, shiftMonth, fmtMoney } from "./App.jsx";
import { supabase } from "./supabaseClient.js";
import { BANK, SLIP_STATUS, SLIP_ACCEPT, SLIP_MAX_BYTES, slipUrl, submitSlip, isPdf } from "./payments/slips.js";

// Student portal: the signed-in student's own attendance and fee payments
// (row-level security only returns their rows). Read-only — teachers record
// attendance and the admin records payments; this view just reflects it.

const REFRESH_MS = 60_000;

const pad = (n) => String(n).padStart(2, "0");
const currentMonthKey = maldivesMonth;
const fmtDate = (key) => new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const fmtTime = (d) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export const ATT_STATUS = {
  present: { label: "Present", Icon: CheckCircle2, color: "#1E6B45", bg: "#E3F0E7" },
  absent: { label: "Absent", Icon: XCircle, color: "#A5432C", bg: "#FBEAE6" },
  rescheduled: { label: "Rescheduled", Icon: Repeat2, color: "#1452A8", bg: "#EAF3FC" },
  cancelled: { label: "Cancelled", Icon: Ban, color: "#5B6B79", bg: "#EEF1F4" },
};

// Months the fee is due: from the joining month up to this month.
function dueMonths(joinedMonth) {
  const end = currentMonthKey();
  let m = joinedMonth && joinedMonth <= end ? joinedMonth : end;
  const out = [];
  while (m <= end && out.length < 240) { out.push(m); m = shiftMonth(m, 1); }
  return out;
}

export function attendanceStats(rows) {
  const counts = { present: 0, absent: 0, rescheduled: 0, cancelled: 0 };
  rows.forEach((r) => { if (counts[r.status] !== undefined) counts[r.status] += 1; });
  const marked = counts.present + counts.absent;
  return { ...counts, rate: marked ? Math.round((counts.present / marked) * 100) : null };
}

export function financeStats(student, payments) {
  const fee = Number(student.fee) || 0;
  const byMonth = Object.fromEntries(payments.map((p) => [p.month, p]));
  const months = dueMonths(student.joined_month).reverse().map((month) => {
    const p = byMonth[month];
    const paid = !!p?.paid;
    const amount = Number(p?.amount_paid) || 0;
    return { month, paid, amount, paidDate: p?.paid_date || null, due: paid ? 0 : Math.max(0, fee - amount) };
  });
  return {
    fee,
    months,
    totalPaid: payments.reduce((s, p) => s + (Number(p.amount_paid) || 0), 0),
    outstanding: months.reduce((s, m) => s + m.due, 0),
    unpaidCount: months.filter((m) => !m.paid).length,
    thisMonth: months[0],
  };
}

function demoRecords() {
  const attendance = [];
  const d = new Date();
  for (let i = 0; attendance.length < 24; i += 1) {
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i);
    if (![0, 2, 4].includes(day.getDay())) continue;
    const status = i % 11 === 3 ? "absent" : i % 17 === 5 ? "rescheduled" : "present";
    attendance.push({ record_date: `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`, status, note: status === "absent" ? "Was unwell" : null });
  }
  const m = currentMonthKey();
  const payments = [shiftMonth(m, -2), shiftMonth(m, -1)].map((month) => ({ month, paid: true, amount_paid: 375, paid_date: `${month}-05` }));
  return { attendance, payments, slips: demoSlips };
}
// Slips "uploaded" in demo mode, kept for the session (nothing is saved).
const demoSlips = [];

// Loads both lists, then keeps them fresh: on window focus and every minute.
export function useStudentRecords(student, demo) {
  const [state, setState] = useState({ attendance: [], payments: [], slips: [], loading: true, error: "", updatedAt: null });

  const refresh = useCallback(async () => {
    if (!student) return;
    if (demo) { setState({ ...demoRecords(), slips: [...demoSlips], loading: false, error: "", updatedAt: new Date() }); return; }
    const [att, pay, slips] = await Promise.all([
      supabase.from("attendance_records").select("record_date, status, note, rescheduled_to").eq("student_id", student.id).order("record_date", { ascending: false }),
      supabase.from("payments").select("month, paid, amount_paid, paid_date").eq("student_id", student.id),
      supabase.from("payment_slips").select("id, month, amount, file_path, status, reject_reason, created_at").eq("student_id", student.id).order("created_at", { ascending: false }),
    ]);
    const error = att.error?.message || pay.error?.message || "";
    setState((s) => ({
      attendance: att.error ? s.attendance : (att.data || []).filter((r) => r.status),
      payments: pay.error ? s.payments : pay.data || [],
      slips: slips.error ? s.slips : slips.data || [],
      loading: false,
      error,
      updatedAt: new Date(),
    }));
  }, [student, demo]);

  useEffect(() => {
    refresh();
    const onFocus = () => { if (document.visibilityState === "visible") refresh(); };
    const timer = setInterval(onFocus, REFRESH_MS);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { clearInterval(timer); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [refresh]);

  return { ...state, refresh };
}

function UpdatedLine({ records }) {
  const [busy, setBusy] = useState(false);
  const click = async () => { setBusy(true); await records.refresh(); setBusy(false); };
  return (
    <div className="sr-updated">
      <span><Clock size={14} aria-hidden="true" /> {records.updatedAt ? `Updated ${fmtTime(records.updatedAt)}` : "Loading…"}</span>
      <button type="button" className="sr-refresh" onClick={click} disabled={busy} aria-label="Refresh">
        <RotateCw size={15} aria-hidden="true" className={busy ? "sr-spin" : ""} /> Refresh
      </button>
    </div>
  );
}

function Tile({ label, value, sub, tone }) {
  return (
    <div className={`sr-tile ${tone ? `sr-tile-${tone}` : ""}`}>
      <div className="sr-tile-label">{label}</div>
      <div className="sr-tile-value">{value}</div>
      {sub && <div className="sr-tile-sub">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = ATT_STATUS[status];
  if (!s) return null;
  return <span className="sr-badge" style={{ color: s.color, background: s.bg }}><s.Icon size={14} aria-hidden="true" />{s.label}</span>;
}

function LoadError({ records }) {
  if (!records.error) return null;
  return <div className="sr-error" role="alert"><AlertTriangle size={16} aria-hidden="true" /> Couldn’t load your records: {records.error}</div>;
}

export function StudentAttendance({ records }) {
  const [month, setMonth] = useState(currentMonthKey);
  const all = attendanceStats(records.attendance);
  const rows = records.attendance.filter((r) => r.record_date.startsWith(month));
  const monthStats = attendanceStats(rows);
  const thisMonth = month === currentMonthKey();

  return (
    <section className="sr-page" aria-label="Attendance">
      <div className="sr-head">
        <h2><CalendarCheck size={26} aria-hidden="true" /> Attendance</h2>
        <UpdatedLine records={records} />
      </div>
      <LoadError records={records} />
      <div className="sr-tiles">
        <Tile label="Overall attendance" value={all.rate === null ? "—" : `${all.rate}%`} sub={`${all.present + all.absent} classes marked`} tone="grad" />
        <Tile label="Present" value={all.present} tone="green" />
        <Tile label="Absent" value={all.absent} tone="red" />
        <Tile label="Rescheduled / cancelled" value={all.rescheduled + all.cancelled} tone="blue" />
      </div>

      <div className="sp-card sr-card">
        <div className="sr-month-bar">
          <button type="button" className="sr-icon-btn" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <div className="sr-month-title">
            <strong>{monthLabel(month)}</strong>
            <span>{monthStats.rate === null ? "No classes marked" : `${monthStats.rate}% · ${monthStats.present} present, ${monthStats.absent} absent`}</span>
          </div>
          <button type="button" className="sr-icon-btn" onClick={() => setMonth((m) => shiftMonth(m, 1))} disabled={thisMonth} aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
        {records.loading ? <p className="sr-empty">Loading…</p> : rows.length === 0 ? (
          <p className="sr-empty">No attendance recorded for {monthLabel(month)}.</p>
        ) : (
          <ul className="sr-list">
            {rows.map((r) => (
              <li key={r.record_date}>
                <span className="sr-date">{fmtDate(r.record_date)}</span>
                <StatusBadge status={r.status} />
                {(r.note || r.rescheduled_to) && (
                  <span className="sr-note">{r.rescheduled_to ? `Moved to ${fmtDate(r.rescheduled_to)}` : ""}{r.rescheduled_to && r.note ? " · " : ""}{r.note || ""}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ }
  };
  return (
    <button type="button" className="sr-copy" onClick={copy} aria-label={`Copy ${text}`}>
      {done ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{done ? "Copied" : "Copy"}
    </button>
  );
}

function SlipBadge({ status }) {
  const s = SLIP_STATUS[status];
  return <span className="sr-badge" style={{ color: s.color, background: s.bg }}>{status === "pending" && <Hourglass size={13} aria-hidden="true" />}{s.label}</span>;
}

// Pay now, as three steps: pick the month → transfer to the class's BML
// account → upload the slip. Months on offer:
// unpaid ones without a slip already waiting, plus next month for paying ahead.
function PayNow({ student, f, slips, initialMonth, demo, onClose, onSubmitted }) {
  const waiting = new Set(slips.filter((x) => x.status === "pending").map((x) => x.month));
  const next = shiftMonth(currentMonthKey(), 1);
  const options = [...f.months.filter((m) => !m.paid && !waiting.has(m.month)).map((m) => m.month).reverse(), ...(waiting.has(next) || f.months.some((m) => m.month === next) ? [] : [next])];
  const dueFor = (month) => f.months.find((m) => m.month === month)?.due || f.fee;
  const first = options.includes(initialMonth) ? initialMonth : options[0] || "";
  const [month, setMonth] = useState(first);
  const [amount, setAmount] = useState(first ? String(dueFor(first)) : "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pickMonth = (m) => { setMonth(m); setAmount(String(dueFor(m) || "")); };
  const pickFile = (e) => {
    const picked = e.target.files?.[0];
    setError("");
    if (!picked) return;
    if (picked.size > SLIP_MAX_BYTES) { setError("That file is over 5 MB. Please upload a smaller photo or PDF."); e.target.value = ""; return; }
    setFile(picked);
    setPreview(picked.type.startsWith("image/") ? URL.createObjectURL(picked) : "");
  };
  const submit = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!month) { setError("Choose the month you are paying for."); return; }
    if (!(value > 0)) { setError("Enter the amount you transferred."); return; }
    if (!file) { setError("Upload a photo or PDF of the transfer slip."); return; }
    setBusy(true);
    setError("");
    try {
      if (demo) demoSlips.unshift({ id: String(Date.now()), month, amount: value, file_path: file.name, status: "pending", created_at: new Date().toISOString() });
      else await submitSlip({ studentId: student.id, month, amount: value, file });
      onSubmitted(month);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <form className="sp-card sr-card sr-pay" onSubmit={submit} aria-label="Pay your fee">
      <div className="sr-pay-head">
        <div>
          <h3 className="sr-card-title">Pay your fee</h3>
          <p className="sr-pay-sub">Bank transfer · 3 quick steps</p>
        </div>
        <button type="button" className="sr-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
      </div>

      {options.length === 0 ? <p className="sr-empty">Nothing to pay right now — every month is paid or has a slip waiting for check.</p> : (
        <ol className="sr-steps">
          <li className="sr-step">
            <span className="sr-step-num" aria-hidden="true">1</span>
            <div className="sr-step-body">
              <h4>Choose the month</h4>
              <div className="sr-chips" role="group" aria-label="Month">
                {options.map((m) => (
                  <button key={m} type="button" className="sr-chip" aria-pressed={month === m} onClick={() => pickMonth(m)}>{monthLabel(m)}</button>
                ))}
              </div>
              <div className="sr-due"><span>Amount to pay</span><strong>{fmtMoney(dueFor(month))}</strong></div>
            </div>
          </li>

          <li className="sr-step">
            <span className="sr-step-num" aria-hidden="true">2</span>
            <div className="sr-step-body">
              <h4>Transfer to our BML account</h4>
              <div className="sr-bank">
                <div className="sr-bank-top">
                  <span className="sr-bank-logo"><Landmark size={20} aria-hidden="true" /></span>
                  <div>
                    <div className="sr-bank-name">{BANK.bank}</div>
                    <div className="sr-bank-holder">{BANK.accountName}</div>
                  </div>
                </div>
                <div className="sr-bank-acc">
                  <div>
                    <span>Account number</span>
                    <strong>{BANK.accountNumber}</strong>
                  </div>
                  <CopyButton text={BANK.accountNumber} />
                </div>
              </div>
            </div>
          </li>

          <li className="sr-step">
            <span className="sr-step-num" aria-hidden="true">3</span>
            <div className="sr-step-body">
              <h4>Upload your transfer slip</h4>
              <label className="sr-field">Amount transferred (MVR)
                <input type="number" inputMode="decimal" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </label>
              <label className={`sr-drop ${file ? "sr-drop-has" : ""}`}>
                <input type="file" accept={SLIP_ACCEPT} onChange={pickFile} />
                {preview ? <img src={preview} alt="Selected slip" /> : file ? <FileText size={28} aria-hidden="true" /> : <Upload size={28} aria-hidden="true" />}
                <span>{file ? file.name : "Choose slip photo or PDF"}</span>
                <small>{file ? "Tap to change" : "Screenshot from the BML app is fine · up to 5 MB"}</small>
              </label>
              {error && <div className="sr-error" role="alert"><AlertTriangle size={16} aria-hidden="true" /> {error}</div>}
              <button type="submit" className="sr-pay-btn sr-submit" disabled={busy}>{busy ? "Sending…" : "Submit for verification"}</button>
              <p className="sr-pay-note">The admin checks your slip and marks {month ? monthLabel(month) : "the month"} as paid. You’ll get a notification.</p>
            </div>
          </li>
        </ol>
      )}
    </form>
  );
}

function ViewSlip({ path, demo }) {
  const [busy, setBusy] = useState(false);
  if (demo) return null;
  const open = async () => {
    setBusy(true);
    const win = window.open("", "_blank");
    try { const url = await slipUrl(path); if (win) win.location.href = url; else window.location.href = url; } catch { win?.close(); }
    setBusy(false);
  };
  return <button type="button" className="sr-link" onClick={open} disabled={busy}>{isPdf(path) ? "View PDF" : "View slip"}</button>;
}

export function StudentFinance({ student, records, demo = false }) {
  const f = financeStats(student, records.payments);
  const [payMonth, setPayMonth] = useState(null);
  const [sent, setSent] = useState("");
  const slips = records.slips || [];
  const latestSlip = Object.fromEntries([...slips].reverse().map((x) => [x.month, x]));
  const openPay = (month = "") => { setSent(""); setPayMonth(month); };
  const submitted = async (month) => {
    setPayMonth(null);
    setSent(`Slip for ${monthLabel(month)} sent. The admin will verify it soon.`);
    await records.refresh();
  };

  return (
    <section className="sr-page" aria-label="Finance">
      <div className="sr-head">
        <h2><Wallet size={26} aria-hidden="true" /> Finance</h2>
        <div className="sr-head-actions">
          <UpdatedLine records={records} />
          <button type="button" className="sr-pay-btn" onClick={() => openPay()}><Landmark size={17} aria-hidden="true" /> Pay now</button>
        </div>
      </div>
      <LoadError records={records} />
      {sent && <div className="sr-ok" role="status"><CheckCircle2 size={16} aria-hidden="true" /> {sent}</div>}
      {payMonth !== null && <PayNow student={student} f={f} slips={slips} initialMonth={payMonth} demo={demo} onClose={() => setPayMonth(null)} onSubmitted={submitted} />}
      <div className="sr-tiles">
        <Tile label="Monthly fee" value={fmtMoney(f.fee)} tone="grad" />
        <Tile label={`${monthLabel(currentMonthKey())}`} value={f.thisMonth?.paid ? "Paid" : latestSlip[f.thisMonth?.month]?.status === "pending" ? "Checking" : "Not paid"} sub={f.thisMonth?.paid && f.thisMonth.paidDate ? `on ${fmtDate(f.thisMonth.paidDate)}` : "this month"} tone={f.thisMonth?.paid ? "green" : latestSlip[f.thisMonth?.month]?.status === "pending" ? "amber" : "red"} />
        <Tile label="Total paid" value={fmtMoney(f.totalPaid)} tone="blue" />
        <Tile label="Outstanding" value={fmtMoney(f.outstanding)} sub={f.unpaidCount ? `${f.unpaidCount} month${f.unpaidCount > 1 ? "s" : ""} unpaid` : "All paid up"} tone={f.outstanding ? "red" : "green"} />
      </div>

      <div className="sp-card sr-card">
        <h3 className="sr-card-title">Payment history</h3>
        {records.loading ? <p className="sr-empty">Loading…</p> : (
          <table className="sr-table">
            <thead><tr><th>Month</th><th>Status</th><th>Amount</th><th>Paid on</th></tr></thead>
            <tbody>
              {f.months.map((m) => {
                const slip = latestSlip[m.month];
                return (
                  <tr key={m.month}>
                    <td>{monthLabel(m.month)}</td>
                    <td>{m.paid
                      ? <span className="sr-badge" style={{ color: ATT_STATUS.present.color, background: ATT_STATUS.present.bg }}><CheckCircle2 size={14} aria-hidden="true" />Paid</span>
                      : slip?.status === "pending" ? <SlipBadge status="pending" />
                      : <span className="sr-unpaid">
                          <span className="sr-badge" style={{ color: ATT_STATUS.absent.color, background: ATT_STATUS.absent.bg }}><XCircle size={14} aria-hidden="true" />Unpaid</span>
                          <button type="button" className="sr-link" onClick={() => openPay(m.month)}>Pay</button>
                        </span>}</td>
                    <td>{m.paid || m.amount ? fmtMoney(m.amount) : <span className="sr-muted">{fmtMoney(m.due)} due</span>}</td>
                    <td>{m.paidDate ? fmtDate(m.paidDate) : <span className="sr-muted">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {slips.length > 0 && (
        <div className="sp-card sr-card">
          <h3 className="sr-card-title">My uploaded slips</h3>
          <ul className="sr-list">
            {slips.map((x) => (
              <li key={x.id}>
                <span className="sr-date">{monthLabel(x.month)}</span>
                <span className="sr-slip-amt">{fmtMoney(Number(x.amount))}</span>
                <SlipBadge status={x.status} />
                <span className="sr-note">Sent {fmtDate(x.created_at.slice(0, 10))}{x.status === "rejected" && x.reject_reason ? ` · ${x.reject_reason}` : ""}</span>
                <ViewSlip path={x.file_path} demo={demo} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export const RECORDS_CSS = `
  .sr-page { display: flex; flex-direction: column; gap: 18px; }
  .sr-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .sr-head h2 { display: flex; align-items: center; gap: 10px; margin: 0; font-size: clamp(22px, 3vw, 30px); color: #0F2F8A; }
  .sr-head h2 svg { color: ${TP.blue}; }
  .sr-updated { display: flex; align-items: center; gap: 10px; font-size: 13px; color: ${TP.secondaryText}; }
  .sr-updated > span { display: inline-flex; align-items: center; gap: 5px; }
  .sr-refresh { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid ${TP.border}; background: #FFFFFF; color: ${TP.navy}; font: inherit; font-weight: 600; cursor: pointer; }
  .sr-refresh:hover { background: #F3F9FD; }
  .sr-refresh:focus-visible, .sr-icon-btn:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
  @keyframes sr-spin { to { transform: rotate(360deg); } }
  .sr-spin { animation: sr-spin 0.8s linear infinite; }
  .sr-error { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-radius: 12px; background: #FBEAE6; color: #A5432C; font-size: 14px; }

  .sr-tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
  .sr-tile { background: #FFFFFF; border: 1px solid #DCEBF8; border-radius: 16px; padding: 16px; box-shadow: 0 8px 22px rgba(18,59,103,0.06); min-width: 0; }
  .sr-tile-label { font-size: 13px; font-weight: 600; color: ${TP.secondaryText}; }
  .sr-tile-value { margin-top: 6px; font-size: clamp(22px, 2.6vw, 30px); font-weight: 700; color: ${TP.navy}; display: flex; align-items: center; gap: 4px; overflow-wrap: anywhere; }
  .sr-tile-sub { margin-top: 4px; font-size: 13px; color: ${TP.secondaryText}; }
  .sr-tile-grad { background: linear-gradient(120deg, ${TP.gradStart} 0%, ${TP.blue} 55%, ${TP.gradEnd} 100%); border: none; color: #FFFFFF; }
  .sr-tile-grad .sr-tile-label, .sr-tile-grad .sr-tile-value, .sr-tile-grad .sr-tile-sub { color: #FFFFFF; }
  .sr-tile-green .sr-tile-value { color: #1E6B45; }
  .sr-tile-red .sr-tile-value { color: #A5432C; }
  .sr-tile-blue .sr-tile-value { color: #1452A8; }
  .sr-tile-amber .sr-tile-value { color: #9C6B12; }

  .sr-card { padding: 18px; }
  .sr-card:hover { transform: none !important; }
  .sr-card-title { margin: 0 0 12px; font-size: 18px; color: #0F2F8A; }
  .sr-month-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .sr-month-title { flex: 1; text-align: center; display: flex; flex-direction: column; gap: 2px; }
  .sr-month-title strong { font-size: 18px; color: #0F2F8A; }
  .sr-month-title span { font-size: 13px; color: ${TP.secondaryText}; }
  .sr-icon-btn { width: 40px; height: 40px; border-radius: 10px; border: 1px solid ${TP.border}; background: #FFFFFF; color: ${TP.navy}; display: flex; align-items: center; justify-content: center; cursor: pointer; }
  .sr-icon-btn:disabled { opacity: 0.4; cursor: default; }
  .sr-list { list-style: none; margin: 0; padding: 0; }
  .sr-list li { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 4px; border-bottom: 1px solid #E4EFF9; }
  .sr-list li:last-child { border-bottom: none; }
  .sr-date { min-width: 120px; font-weight: 600; color: ${TP.navy}; }
  .sr-note { flex: 1 1 200px; font-size: 14px; color: ${TP.secondaryText}; }
  .sr-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 13px; font-weight: 600; white-space: nowrap; }
  .sr-empty { margin: 8px 0; color: ${TP.secondaryText}; text-align: center; }
  .sr-muted { color: ${TP.secondaryText}; }
  .sr-foot { margin: 14px 0 0; font-size: 13px; color: ${TP.secondaryText}; }

  .sr-table { width: 100%; border-collapse: collapse; font-size: 14px; color: ${TP.navy}; }
  .sr-table th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; background: #EAF3FC; padding: 12px 10px; }
  .sr-table th:first-child { border-top-left-radius: 10px; }
  .sr-table th:last-child { border-top-right-radius: 10px; }
  .sr-table td { padding: 11px 10px; border-bottom: 1px solid #E4EFF9; }
  .sr-table td:nth-child(3) { white-space: nowrap; }


  .sr-head-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .sr-pay-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 18px; border: none; border-radius: 12px; background: linear-gradient(90deg, ${TP.blue}, ${TP.teal}); color: #FFFFFF; font: inherit; font-weight: 700; cursor: pointer; box-shadow: 0 8px 18px rgba(23,111,209,0.28); }
  .sr-pay-btn:hover { filter: brightness(1.06); }
  .sr-pay-btn:disabled { opacity: 0.65; cursor: default; }
  .sr-pay-btn:focus-visible, .sr-link:focus-visible, .sr-copy:focus-visible { outline: 2px solid ${TP.navy}; outline-offset: 2px; }
  .sr-ok { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-radius: 12px; background: #E3F0E7; color: #1E6B45; font-size: 14px; font-weight: 600; }
  .sr-pay { max-width: 760px; width: 100%; box-sizing: border-box; }
  .sr-pay-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
  .sr-pay-head .sr-card-title { margin: 0; }
  .sr-pay-sub { margin: 2px 0 0; font-size: 13px; color: ${TP.secondaryText}; }
  .sr-steps { list-style: none; margin: 0; padding: 0; }
  .sr-step { position: relative; display: flex; gap: 14px; padding: 16px 0 6px; }
  .sr-step + .sr-step { border-top: 1px solid #E4EFF9; }
  .sr-step-num { flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: #FFFFFF; background: linear-gradient(135deg, ${TP.blue}, ${TP.teal}); }
  .sr-step-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
  .sr-step-body h4 { margin: 4px 0 0; font-size: 16px; color: ${TP.navy}; }
  .sr-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .sr-chip { min-height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid ${TP.border}; background: #FFFFFF; color: ${TP.navy}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .sr-chip:hover { background: #F3F9FD; }
  .sr-chip[aria-pressed="true"] { background: ${TP.blue}; border-color: ${TP.blue}; color: #FFFFFF; }
  .sr-chip:focus-visible { outline: 2px solid ${TP.navy}; outline-offset: 2px; }
  .sr-due { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border-radius: 12px; background: #F3F8FC; color: ${TP.secondaryText}; font-size: 14px; }
  .sr-due strong { display: inline-flex; align-items: center; gap: 4px; font-size: 20px; color: ${TP.navy}; }
  .sr-bank { border-radius: 16px; padding: 16px; color: #FFFFFF; background: linear-gradient(120deg, ${TP.gradStart} 0%, ${TP.blue} 55%, ${TP.gradEnd} 100%); display: flex; flex-direction: column; gap: 14px; }
  .sr-bank-top { display: flex; align-items: center; gap: 12px; }
  .sr-bank-logo { flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px; background: rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center; }
  .sr-bank-name { font-size: 13px; opacity: 0.85; }
  .sr-bank-holder { font-size: 16px; font-weight: 700; letter-spacing: 0.02em; }
  .sr-bank-acc { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.14); }
  .sr-bank-acc span { display: block; font-size: 12px; opacity: 0.85; }
  .sr-bank-acc strong { display: block; font-size: clamp(20px, 5.6vw, 24px); letter-spacing: 0.06em; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .sr-copy { display: inline-flex; align-items: center; gap: 5px; min-height: 36px; padding: 0 12px; border-radius: 10px; border: none; background: #FFFFFF; color: ${TP.gradStart}; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
  .sr-field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: ${TP.secondaryText}; }
  .sr-field input, .sr-field select { min-height: 44px; padding: 0 12px; border-radius: 10px; border: 1px solid ${TP.border}; background: #FFFFFF; color: ${TP.navy}; font: inherit; font-size: 15px; font-weight: 500; box-sizing: border-box; width: 100%; }
  .sr-field input:focus, .sr-field select:focus { outline: 2px solid ${TP.blue}; outline-offset: 1px; }
  .sr-submit { width: 100%; }
  .sr-pay-note { margin: 0; font-size: 13px; color: ${TP.secondaryText}; text-align: center; }
  .sr-drop { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 18px; min-height: 120px; border: 2px dashed #AFCFEC; border-radius: 14px; background: #F5FAFE; color: ${TP.blue}; text-align: center; cursor: pointer; }
  .sr-drop:hover, .sr-drop:focus-within { border-color: ${TP.blue}; background: #EDF6FE; }
  .sr-drop input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .sr-drop span { font-weight: 700; color: ${TP.navy}; overflow-wrap: anywhere; }
  .sr-drop small { font-size: 12px; color: ${TP.secondaryText}; }
  .sr-drop img { max-width: 100%; max-height: 180px; border-radius: 10px; object-fit: contain; }
  .sr-drop-has { border-style: solid; }
  .sr-link { border: none; background: none; padding: 4px 2px; color: ${TP.blue}; font: inherit; font-weight: 700; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
  .sr-unpaid { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .sr-slip-amt { font-weight: 600; color: ${TP.navy}; display: inline-flex; align-items: center; }

  @media (max-width: 520px) {
    .sr-step { gap: 10px; }
    .sr-step-num { width: 26px; height: 26px; font-size: 13px; }
  }
  @media (max-width: 900px) { .sr-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 520px) {
    .sr-tiles { gap: 10px; }
    .sr-tile { padding: 12px; }
    .sr-table { font-size: 13px; }
    .sr-table th, .sr-table td { padding: 9px 6px; }
    .sr-table th:last-child, .sr-table td:last-child { display: none; }
    .sr-table th:nth-child(3) { border-top-right-radius: 10px; }
  }
`;
