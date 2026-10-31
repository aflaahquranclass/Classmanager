// Admin → Finance → Payment slips: transfer slips students uploaded from the
// student portal. Verifying one marks that month paid (payments row) and
// tells the student in the app; rejecting asks for a reason they will see.
// BML has no public API to look up an incoming transfer, so the admin checks
// the slip against the account in the BML app.

import { useState, useEffect, useCallback, useMemo } from "react";
import { CheckCircle2, XCircle, FileText, RotateCw, X, ExternalLink, Hourglass } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { TP, monthLabel, fmtMoney } from "../App.jsx";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { createNotification } from "../notifications/smsSend.js";
import { SLIP_BUCKET, SLIP_STATUS, isPdf } from "./slips.js";
import { maldivesToday } from "../dates.js";

const FILTERS = [
  { key: "pending", label: "Waiting" },
  { key: "approved", label: "Verified" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

const fmtWhen = (iso) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

// Pending-slip count for the Finance tab badge.
export function usePendingSlipCount(enabled) {
  const [count, setCount] = useState(0);
  const load = useCallback(async () => {
    if (!enabled) return;
    const { count: n, error } = await supabase.from("payment_slips").select("id", { count: "exact", head: true }).eq("status", "pending");
    if (!error) setCount(n || 0);
  }, [enabled]);
  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);
  return [count, load];
}

function notifyStudent(student, title, body) {
  if (!student?.userId) return;
  createNotification({
    title, body, audience: "payment_slip", audienceLabel: `Payment slip — ${student.name}`,
    inApp: true, sms: false, recipients: [{ student_id: student.id, user_id: student.userId, name: student.name }],
  }).catch(() => {});
}

export function AdminPaymentSlips({ students, showToast, onPaid, onCountChange }) {
  const [filter, setFilter] = useState("pending");
  const [slips, setSlips] = useState(null);
  const [urls, setUrls] = useState({});
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState(null);
  const byId = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students]);

  const load = useCallback(async () => {
    setError("");
    let q = supabase.from("payment_slips").select("*").order("created_at", { ascending: filter === "pending" }).limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error: err } = await q;
    if (err) { setError(err.message); setSlips([]); return; }
    setSlips(data || []);
    const paths = (data || []).map((x) => x.file_path);
    if (paths.length) {
      const { data: signed } = await supabase.storage.from(SLIP_BUCKET).createSignedUrls(paths, 3600);
      setUrls(Object.fromEntries((signed || []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl])));
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (slip) => {
    const student = byId[slip.student_id];
    if (!(await confirmDialog({
      title: `Verify ${student?.name || "this student"}’s slip?`,
      message: `${monthLabel(slip.month)} will be marked paid with ${Number(slip.amount).toLocaleString()} MVR.`,
      confirmLabel: "Verify & mark paid", danger: false,
    }))) return;
    setBusyId(slip.id);
    const paidDate = maldivesToday();
    const pay = await supabase.from("payments").upsert(
      { student_id: slip.student_id, month: slip.month, paid: true, amount_paid: Number(slip.amount), paid_date: paidDate },
      { onConflict: "student_id,month" },
    );
    const upd = pay.error ? pay : await supabase.from("payment_slips").update({ status: "approved", reject_reason: null, reviewed_at: new Date().toISOString() }).eq("id", slip.id);
    setBusyId(null);
    if (upd.error) { showToast(`Couldn’t verify: ${upd.error.message}`); return; }
    notifyStudent(student, "Payment verified", `Your fee for ${monthLabel(slip.month)} has been received. Thank you!`);
    showToast(`${monthLabel(slip.month)} marked paid for ${student?.name || "the student"}.`);
    onPaid?.({ studentId: slip.student_id, month: slip.month, amount: Number(slip.amount), paidDate });
    onCountChange?.();
    load();
  };

  const reject = async (e) => {
    e.preventDefault();
    const slip = rejecting;
    const student = byId[slip.student_id];
    setBusyId(slip.id);
    const { error: err } = await supabase.from("payment_slips").update({ status: "rejected", reject_reason: reason.trim() || null, reviewed_at: new Date().toISOString() }).eq("id", slip.id);
    setBusyId(null);
    if (err) { showToast(`Couldn’t reject: ${err.message}`); return; }
    notifyStudent(student, "Payment slip not accepted", `Your slip for ${monthLabel(slip.month)} wasn’t accepted${reason.trim() ? `: ${reason.trim()}` : "."} Please upload it again or contact the admin.`);
    showToast("Slip rejected.");
    setRejecting(null);
    setReason("");
    onCountChange?.();
    load();
  };

  return (
    <div className="ps-wrap">
      <style>{psCss()}</style>
      <div className="ps-bar">
        <div className="tp-segment" role="group" aria-label="Slip status" style={{ marginBottom: 0 }}>
          {FILTERS.map((x) => (
            <button key={x.key} type="button" aria-pressed={filter === x.key} className={`tp-segment-btn ${filter === x.key ? "tp-segment-btn-active" : ""}`} onClick={() => setFilter(x.key)}>{x.label}</button>
          ))}
        </div>
        <button type="button" className="tp-btn-outline" onClick={load}><RotateCw size={16} aria-hidden="true" /> Refresh</button>
      </div>

      {error && <div className="tp-card ps-error" role="alert">Couldn’t load slips: {error}</div>}
      {slips === null && <div className="tp-card">Loading…</div>}
      {slips && slips.length === 0 && !error && (
        <div className="tp-card ps-empty">{filter === "pending" ? "No slips waiting for verification." : "No slips here."}</div>
      )}

      <div className="ps-grid">
        {(slips || []).map((slip) => {
          const s = byId[slip.student_id];
          const st = SLIP_STATUS[slip.status];
          const url = urls[slip.file_path];
          const fee = Number(s?.fee) || 0;
          return (
            <article key={slip.id} className="tp-card ps-card">
              <button type="button" className="ps-thumb" onClick={() => setViewing(slip)} aria-label="View slip" disabled={!url}>
                {!url ? <span className="ps-thumb-msg">No file</span> : isPdf(slip.file_path) ? <span className="ps-thumb-msg"><FileText size={34} aria-hidden="true" />PDF slip</span> : <img src={url} alt={`Slip from ${s?.name || "student"}`} loading="lazy" />}
              </button>
              <div className="ps-body">
                <div className="ps-top">
                  <div style={{ minWidth: 0 }}>
                    <div className="ps-name">{s?.name || "Unknown student"}</div>
                    <div className="ps-sub">{[s?.studentCode, s?.className].filter(Boolean).join(" · ")}</div>
                  </div>
                  <span className="ps-badge" style={{ color: st.color, background: st.bg }}>{slip.status === "pending" && <Hourglass size={13} aria-hidden="true" />}{st.label}</span>
                </div>
                <dl className="ps-facts">
                  <dt>Month</dt><dd>{monthLabel(slip.month)}</dd>
                  <dt>Amount</dt><dd>{fmtMoney(Number(slip.amount))}{fee > 0 && Number(slip.amount) !== fee && <span className="ps-warn"> (fee {fee})</span>}</dd>
                  <dt>Sent</dt><dd>{fmtWhen(slip.created_at)}</dd>
                  {slip.reject_reason && <><dt>Reason</dt><dd>{slip.reject_reason}</dd></>}
                </dl>
                {slip.status === "pending" && (
                  <div className="ps-actions">
                    <button type="button" className="tp-btn-gradient" disabled={busyId === slip.id} onClick={() => approve(slip)}><CheckCircle2 size={17} aria-hidden="true" /> Verify & mark paid</button>
                    <button type="button" className="tp-btn-outline ps-reject" disabled={busyId === slip.id} onClick={() => { setRejecting(slip); setReason(""); }}><XCircle size={17} aria-hidden="true" /> Reject</button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {viewing && (
        <div className="ps-modal" role="dialog" aria-modal="true" aria-label="Payment slip" onClick={() => setViewing(null)}>
          <div className="ps-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="ps-modal-head">
              <strong>{byId[viewing.student_id]?.name} · {monthLabel(viewing.month)}</strong>
              <span style={{ display: "flex", gap: 8 }}>
                <a className="tp-btn-outline" href={urls[viewing.file_path]} target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" /> Open</a>
                <button type="button" className="tp-btn-outline" onClick={() => setViewing(null)} aria-label="Close"><X size={18} /></button>
              </span>
            </div>
            {isPdf(viewing.file_path)
              ? <iframe title="Payment slip PDF" src={urls[viewing.file_path]} className="ps-modal-pdf" />
              : <img src={urls[viewing.file_path]} alt="Payment slip" className="ps-modal-img" />}
          </div>
        </div>
      )}

      {rejecting && (
        <div className="ps-modal" role="dialog" aria-modal="true" aria-label="Reject slip" onClick={() => setRejecting(null)}>
          <form className="ps-modal-box ps-reject-box" onClick={(e) => e.stopPropagation()} onSubmit={reject}>
            <strong>Reject {byId[rejecting.student_id]?.name}’s slip for {monthLabel(rejecting.month)}?</strong>
            <label className="ps-label">Reason the student will see (optional)
              <input className="ps-input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="e.g. Amount not received, slip unclear" autoFocus />
            </label>
            <div className="ps-actions">
              <button type="submit" className="tp-btn-gradient ps-danger" disabled={busyId === rejecting.id}>Reject slip</button>
              <button type="button" className="tp-btn-outline" onClick={() => setRejecting(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// A function, not a constant: App.jsx imports this file, so TP is not ready yet at load time.
const psCss = () => `
  .ps-wrap { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 16px; }
  .ps-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .ps-error { color: #A5432C; }
  .ps-empty { text-align: center; color: ${TP.secondaryText}; }
  .ps-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); gap: 16px; }
  .ps-card { display: flex; gap: 16px; padding: 16px; }
  .ps-thumb { flex: 0 0 132px; height: 170px; border-radius: 12px; border: 1px solid ${TP.border}; background: #F3F8FC; overflow: hidden; padding: 0; cursor: zoom-in; display: flex; align-items: center; justify-content: center; }
  .ps-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .ps-thumb:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
  .ps-thumb-msg { display: flex; flex-direction: column; align-items: center; gap: 6px; color: ${TP.secondaryText}; font-size: 13px; font-weight: 600; }
  .ps-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
  .ps-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .ps-name { font-weight: 700; font-size: 16px; color: ${TP.navy}; overflow-wrap: anywhere; }
  .ps-sub { font-size: 13px; color: ${TP.secondaryText}; }
  .ps-badge { flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
  .ps-facts { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 14px; }
  .ps-facts dt { color: ${TP.secondaryText}; }
  .ps-facts dd { margin: 0; color: ${TP.navy}; font-weight: 600; display: flex; align-items: center; flex-wrap: wrap; overflow-wrap: anywhere; }
  .ps-warn { color: #9C6B12; font-weight: 600; font-size: 13px; margin-left: 4px; }
  .ps-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: auto; }
  .ps-actions button { flex: 1 1 auto; justify-content: center; }
  .ps-reject { color: #A5432C; border-color: #E3C3BA; }
  .ps-danger { background: #C2412D; box-shadow: 0 8px 18px rgba(194,65,45,0.28); }
  .ps-modal { position: fixed; inset: 0; z-index: 100; background: rgba(10,30,50,0.6); display: flex; align-items: center; justify-content: center; padding: 16px; }
  .ps-modal-box { background: #FFFFFF; border-radius: 18px; padding: 16px; width: min(900px, 100%); max-height: calc(100vh - 32px); display: flex; flex-direction: column; gap: 12px; box-sizing: border-box; }
  .ps-modal-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: ${TP.navy}; }
  .ps-modal-head a { text-decoration: none; }
  .ps-modal-img { max-width: 100%; max-height: calc(100vh - 140px); object-fit: contain; align-self: center; border-radius: 10px; }
  .ps-modal-pdf { width: 100%; height: calc(100vh - 140px); border: none; border-radius: 10px; }
  .ps-reject-box { width: min(480px, 100%); color: ${TP.navy}; }
  .ps-label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: ${TP.secondaryText}; }
  .ps-input { min-height: 44px; padding: 0 12px; border-radius: 10px; border: 1px solid ${TP.border}; font: inherit; font-size: 15px; color: ${TP.navy}; }
  @media (max-width: 520px) {
    .ps-card { flex-direction: column; }
    .ps-thumb { flex-basis: auto; width: 100%; height: 200px; }
  }
`;
