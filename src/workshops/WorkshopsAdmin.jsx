// Admin → Workshops: the sign-ups sent through a workshop's page
// (/workshop/<slug>, e.g. the prayer session). Each sign-up has one or more
// students, the total paid (fee × students) and the transfer slip, which the
// admin opens here to check. Accepting or rejecting only records the
// decision; the admin contacts the family on Viber. Saved in
// workshop_registrations (supabase/migrations/20261120_workshop_registrations.sql).
// Once accepted, the admin can send the workshop's acceptance message by SMS
// to the sign-up's Viber number(s) (the app's usual SMS, saved in
// Notifications history).

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, RotateCw, Trash2, Hourglass, Copy, ExternalLink, FileText, CalendarCheck, Users, MessageSquare, Send, Check } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { TP } from "../App.jsx";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { THAANA_FONT, loadThaanaFont } from "../exams/reportStrings.js";
import { WORKSHOPS } from "./workshops.js";
import { createNotification } from "../notifications/smsSend.js";

const MSG_AUDIENCE = "workshop_accepted";
// The SMS is saved with this label in Notifications history; the tag at the
// end links it back to the sign-up, so its card can show it was sent.
const msgTag = (id) => `#${id.slice(0, 8)}`;
const numbersOf = (r) => [...new Set((r.students || []).map((s) => String(s.viber).trim()).filter(Boolean))];

const SLIP_BUCKET = "registration-slips";
const FILTERS = [
  { key: "pending", label: "Waiting" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];
const STATUS = {
  pending: { label: "Waiting", color: "#9C6B12", bg: "#FDF3DC" },
  accepted: { label: "Accepted", color: "#1E7A4C", bg: "#E3F5EA" },
  rejected: { label: "Rejected", color: "#A5432C", bg: "#FBE9E4" },
};
const LIST = Object.entries(WORKSHOPS).map(([slug, w]) => ({ slug, ...w }));
const pageUrl = (slug) => {
  const { hostname, origin } = window.location;
  const base = ["localhost", "127.0.0.1"].includes(hostname) ? origin : "https://aflaahqc.com";
  return `${base}/workshop/${slug}`;
};
const fmtWhen = (iso) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const viberLink = (n) => `viber://chat?number=${encodeURIComponent(String(n).replace(/[^\d+]/g, "").replace(/^(\d{7})$/, "+960$1"))}`;

// Waiting sign-up count for the nav badge.
export function usePendingWorkshopCount(enabled) {
  const [count, setCount] = useState(0);
  const load = useCallback(async () => {
    if (!enabled) return;
    const { count: n, error } = await supabase.from("workshop_registrations").select("id", { count: "exact", head: true }).eq("status", "pending");
    if (!error) setCount(n || 0);
  }, [enabled]);
  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);
  return [count, load];
}

export function AdminWorkshops({ showToast, onCountChange }) {
  const [slug, setSlug] = useState(LIST[0].slug);
  const w = WORKSHOPS[slug];
  const [filter, setFilter] = useState("pending");
  const [rows, setRows] = useState(null); // this filter
  const [all, setAll] = useState([]); // every sign-up for the summary
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [sentAt, setSentAt] = useState({}); // sign-up tag → { at, status } of its last message
  const [compose, setCompose] = useState(null); // { id, text } — the message being written

  const load = useCallback(async () => {
    setError("");
    setRows(null);
    const { data, error: err } = await supabase.from("workshop_registrations").select("*")
      .eq("workshop", w.key).order("created_at", { ascending: false }).limit(500);
    if (err) { setError(err.message); setRows([]); setAll([]); return; }
    setAll(data || []);
    setRows((data || []).filter((r) => filter === "all" || r.status === filter));
    const { data: notes } = await supabase.from("notifications").select("audience_label, created_at, notification_recipients(sms_status)").eq("audience", MSG_AUDIENCE).order("created_at");
    setSentAt(Object.fromEntries((notes || []).map((n) => {
      const st = (n.notification_recipients || []).map((x) => x.sms_status);
      const status = st.length && st.every((x) => x === "sent") ? "sent" : st.some((x) => x === "failed" || x === "no_phone") ? "failed" : "pending";
      return [n.audience_label?.split(" ").pop(), { at: n.created_at, status }];
    })));
  }, [w.key, filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadThaanaFont(); }, []);

  const counted = all.filter((r) => r.status !== "rejected");
  const summary = {
    signUps: counted.length,
    students: counted.reduce((n, r) => n + r.student_count, 0),
    total: counted.reduce((n, r) => n + Number(r.total), 0),
    waiting: all.filter((r) => r.status === "pending").length,
  };

  const setStatus = async (r, status) => {
    setBusyId(r.id);
    const { error: err } = await supabase.from("workshop_registrations").update({ status, reviewed_at: new Date().toISOString() }).eq("id", r.id);
    setBusyId(null);
    if (err) { showToast(`Couldn’t update: ${err.message}`); return; }
    showToast(status === "accepted" ? "Sign-up accepted. Send them the message below." : status === "rejected" ? "Sign-up rejected." : "Moved back to waiting.");
    if (status === "accepted" && w.acceptedMessage && !sentAt[msgTag(r.id)]) setCompose({ id: r.id, text: w.acceptedMessage });
    onCountChange?.();
    load();
  };

  const sendMessage = async (r) => {
    const text = compose?.text?.trim();
    if (!text) { showToast("Write the message first."); return; }
    const numbers = numbersOf(r);
    const name = r.students?.[0]?.name || "";
    setBusyId(r.id);
    const res = await createNotification({
      title: "Workshop", body: text, audience: MSG_AUDIENCE,
      audienceLabel: `Workshop accepted — ${name} ${msgTag(r.id)}`,
      inApp: false, sms: true,
      recipients: numbers.map((phone) => ({ name, phone, body: text })),
    });
    setBusyId(null);
    if (!res.ok) { showToast(res.message); return; }
    setCompose(null);
    showToast(res.message || "Message sent.");
    load(); // picks up the SMS status
  };

  const openSlip = async (r) => {
    const win = window.open("", "_blank"); // opened now so the browser doesn't block it
    const { data, error: err } = await supabase.storage.from(SLIP_BUCKET).createSignedUrl(r.slip_path, 600);
    if (err) { win?.close(); showToast(`Couldn’t open the slip: ${err.message}`); return; }
    if (win) win.location.href = data.signedUrl; else window.location.href = data.signedUrl;
  };

  const remove = async (r) => {
    const who = r.students?.[0]?.name || "this sign-up";
    if (!(await confirmDialog({ title: "Delete this sign-up?", message: `${who}${r.student_count > 1 ? ` and ${r.student_count - 1} more` : ""} and the payment slip will be removed for good.`, confirmLabel: "Delete" }))) return;
    setBusyId(r.id);
    const { error: err } = await supabase.from("workshop_registrations").delete().eq("id", r.id);
    if (!err) await supabase.storage.from(SLIP_BUCKET).remove([r.slip_path]);
    setBusyId(null);
    if (err) { showToast(`Couldn’t delete: ${err.message}`); return; }
    showToast("Sign-up deleted.");
    onCountChange?.();
    load();
  };

  const copyLink = async () => {
    const url = pageUrl(slug);
    try { await navigator.clipboard.writeText(url); showToast("Sign-up link copied."); }
    catch { showToast(url); }
  };

  return (
    <div className="wa-wrap">
      <style>{waCss()}</style>
      <div className="tp-header">
        <div className="tp-title-group">
          <span className="tp-title-icon" aria-hidden="true"><CalendarCheck size={22} /></span>
          <div>
            <h1 className="tp-title">Workshops</h1>
            <div className="tp-subtext" style={{ margin: 0 }}>Sign-ups from the workshop pages. Check each payment slip, then accept or reject.</div>
          </div>
        </div>
        <div className="tp-actions">
          <button type="button" className="tp-btn-outline" onClick={load}><RotateCw size={16} aria-hidden="true" /> Refresh</button>
        </div>
      </div>

      <div className="tp-card wa-head">
        {LIST.length > 1 && (
          <select className="wa-select" value={slug} onChange={(e) => setSlug(e.target.value)} aria-label="Workshop">
            {LIST.map((x) => <option key={x.slug} value={x.slug}>{x.label}</option>)}
          </select>
        )}
        <div className="wa-title" dir="rtl">{w.label}</div>
        <div className="wa-meta"><bdi dir="rtl">{w.date.join(" ")}</bdi> · <bdi dir="ltr">{w.time}</bdi> · MVR {w.fee} per student · sign-up until {w.lastDay}</div>
        <a className="wa-url" href={pageUrl(slug)} target="_blank" rel="noreferrer">{pageUrl(slug)}</a>
        <div className="wa-link-actions">
          <button type="button" className="tp-btn-gradient" onClick={copyLink}><Copy size={16} aria-hidden="true" /> Copy link</button>
          <a className="tp-btn-outline" href={pageUrl(slug)} target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" /> Open page</a>
        </div>
        <dl className="wa-stats">
          <div><dt>Sign-ups</dt><dd>{summary.signUps}</dd></div>
          <div><dt>Students</dt><dd>{summary.students}</dd></div>
          <div><dt>Fees</dt><dd>MVR {summary.total.toLocaleString()}</dd></div>
          <div><dt>Waiting</dt><dd>{summary.waiting}</dd></div>
        </dl>
        <p className="wa-note">Totals leave out rejected sign-ups.</p>
      </div>

      <div className="tp-segment" role="group" aria-label="Sign-up status" style={{ marginBottom: 0, alignSelf: "flex-start" }}>
        {FILTERS.map((x) => (
          <button key={x.key} type="button" aria-pressed={filter === x.key} className={`tp-segment-btn ${filter === x.key ? "tp-segment-btn-active" : ""}`} onClick={() => setFilter(x.key)}>{x.label}</button>
        ))}
      </div>

      {error && <div className="tp-card wa-error" role="alert">Couldn’t load sign-ups: {error}</div>}
      {rows === null && <div className="tp-card">Loading…</div>}
      {rows && rows.length === 0 && !error && (
        <div className="tp-card wa-empty">{filter === "pending" ? "No sign-ups waiting." : "No sign-ups here."}</div>
      )}

      <div className="wa-grid">
        {(rows || []).map((r) => {
          const st = STATUS[r.status];
          const busy = busyId === r.id;
          return (
            <article key={r.id} className="tp-card wa-card">
              <div className="wa-top">
                <div className="wa-count"><Users size={16} aria-hidden="true" /> {r.student_count} student{r.student_count > 1 ? "s" : ""} · <b>MVR {Number(r.total).toLocaleString()}</b></div>
                <span className="wa-badge" style={{ color: st.color, background: st.bg }}>{r.status === "pending" && <Hourglass size={13} aria-hidden="true" />}{st.label}</span>
              </div>
              <ol className="wa-students">
                {(r.students || []).map((s, i) => (
                  <li key={i}>
                    <div className="wa-name" dir="auto">{s.name}</div>
                    <div className="wa-facts">
                      <span>Age {s.age}</span>
                      <span dir="auto">{s.address}</span>
                      <a href={viberLink(s.viber)}>Viber {s.viber}</a>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="wa-sent">Sent {fmtWhen(r.created_at)}{r.reviewed_at ? ` · checked ${fmtWhen(r.reviewed_at)}` : ""}</div>
              {r.status === "accepted" && w.acceptedMessage && (compose?.id === r.id ? (
                <div className="wa-msg">
                  <div className="wa-msg-head"><MessageSquare size={16} aria-hidden="true" /> SMS to {numbersOf(r).join(", ")}</div>
                  <textarea className="wa-msg-text" dir="rtl" lang="dv" rows={9} value={compose.text} onChange={(e) => setCompose({ id: r.id, text: e.target.value })} />
                  <div className="wa-msg-actions">
                    <button type="button" className="tp-btn-gradient" disabled={busy} onClick={() => sendMessage(r)}><Send size={16} aria-hidden="true" /> {busy ? "Sending…" : "Send SMS"}</button>
                    <button type="button" className="tp-btn-outline" disabled={busy} onClick={() => setCompose(null)}>Cancel</button>
                  </div>
                </div>
              ) : sentAt[msgTag(r.id)] ? (
                <div className={`wa-msg-done ${sentAt[msgTag(r.id)].status}`}>
                  {sentAt[msgTag(r.id)].status === "sent" ? <Check size={16} aria-hidden="true" /> : <MessageSquare size={16} aria-hidden="true" />}
                  {sentAt[msgTag(r.id)].status === "sent" ? "SMS sent" : sentAt[msgTag(r.id)].status === "failed" ? "SMS failed" : "SMS waiting to send"} · {fmtWhen(sentAt[msgTag(r.id)].at)}
                  <button type="button" className="wa-link-btn" onClick={() => setCompose({ id: r.id, text: w.acceptedMessage })}>{sentAt[msgTag(r.id)].status === "sent" ? "Send again" : "Try again"}</button>
                </div>
              ) : (
                <button type="button" className="tp-btn-gradient wa-msg-btn" onClick={() => setCompose({ id: r.id, text: w.acceptedMessage })}><MessageSquare size={17} aria-hidden="true" /> Send message</button>
              ))}
              <div className="wa-actions">
                <button type="button" className="tp-btn-outline" disabled={busy} onClick={() => openSlip(r)}><FileText size={17} aria-hidden="true" /> View slip</button>
                {r.status !== "accepted" && <button type="button" className="tp-btn-gradient" disabled={busy} onClick={() => setStatus(r, "accepted")}><CheckCircle2 size={17} aria-hidden="true" /> Accept</button>}
                {r.status !== "rejected" && <button type="button" className="tp-btn-outline wa-reject" disabled={busy} onClick={() => setStatus(r, "rejected")}><XCircle size={17} aria-hidden="true" /> Reject</button>}
                {r.status !== "pending" && <button type="button" className="tp-btn-outline" disabled={busy} onClick={() => setStatus(r, "pending")}><Hourglass size={17} aria-hidden="true" /> Waiting</button>}
                <button type="button" className="tp-btn-outline wa-delete" disabled={busy} onClick={() => remove(r)} aria-label="Delete sign-up"><Trash2 size={17} aria-hidden="true" /></button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

const waCss = () => `
  .wa-wrap { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 16px; }
  .wa-wrap [dir="auto"], .wa-wrap [dir="rtl"] { font-family: ${THAANA_FONT}; }
  .wa-meta bdi[dir="ltr"] { font-family: inherit; }
  .wa-head { display: flex; flex-direction: column; gap: 8px; }
  .wa-select { align-self: flex-start; min-height: 40px; border: 1px solid ${TP.border}; border-radius: 10px; padding: 0 10px; font: inherit; }
  .wa-title { font-size: 20px; color: ${TP.navy}; text-align: right; }
  .wa-meta { font-size: 13px; color: ${TP.secondaryText}; }
  .wa-url { display: block; padding: 10px 12px; border-radius: 10px; background: #F3F8FC; border: 1px solid ${TP.border}; color: ${TP.blue}; font-size: 14px; text-decoration: none; overflow-wrap: anywhere; }
  .wa-link-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .wa-link-actions a { text-decoration: none; }
  .wa-stats { margin: 6px 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
  .wa-stats div { padding: 10px 12px; border-radius: 12px; background: #F3F8FC; border: 1px solid ${TP.border}; }
  .wa-stats dt { font-size: 12px; font-weight: 700; color: ${TP.secondaryText}; text-transform: uppercase; letter-spacing: .04em; }
  .wa-stats dd { margin: 4px 0 0; font-size: 20px; font-weight: 800; color: ${TP.navy}; }
  .wa-note { margin: 0; font-size: 12px; color: ${TP.secondaryText}; }
  .wa-error { color: #A5432C; }
  .wa-empty { text-align: center; color: ${TP.secondaryText}; }
  .wa-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr)); gap: 16px; }
  .wa-card { display: flex; flex-direction: column; gap: 10px; padding: 18px; }
  .wa-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .wa-count { display: flex; align-items: center; gap: 6px; font-size: 14px; color: ${TP.secondaryText}; }
  .wa-count b { color: ${TP.navy}; }
  .wa-badge { flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
  .wa-students { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .wa-students li { padding: 10px 12px; border-radius: 12px; background: #F8FBFE; border: 1px solid ${TP.border}; }
  .wa-name { font-size: 17px; color: ${TP.navy}; text-align: right; overflow-wrap: anywhere; }
  .wa-facts { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 4px; font-size: 13px; color: ${TP.secondaryText}; }
  .wa-facts a { color: ${TP.blue}; text-decoration: none; font-weight: 600; }
  .wa-sent { font-size: 12px; color: ${TP.secondaryText}; }
  .wa-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: auto; }
  .wa-actions button { flex: 1 1 auto; justify-content: center; }
  .wa-actions .wa-delete { flex: 0 0 auto; color: #A5432C; border-color: #E3C3BA; }
  .wa-reject { color: #A5432C; border-color: #E3C3BA; }
  .wa-msg { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 12px; background: #F3F8FC; border: 1px solid ${TP.border}; }
  .wa-msg-head { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: ${TP.navy}; }
  .wa-msg-text { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid ${TP.border}; border-radius: 10px; font: 16px/1.7 ${THAANA_FONT}; color: ${TP.navy}; background: #fff; resize: vertical; }
  .wa-msg-text:focus { outline: 2px solid ${TP.blue}; outline-offset: 0; }
  .wa-msg-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .wa-msg-btn { justify-content: center; }
  .wa-msg-done { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 8px 12px; border-radius: 10px; background: #E3F5EA; color: #1E7A4C; font-size: 13px; font-weight: 700; }
  .wa-msg-done.failed { background: #FBE9E4; color: #A5432C; }
  .wa-msg-done.pending { background: #FDF3DC; color: #9C6B12; }
  .wa-link-btn { margin-left: auto; border: none; background: none; color: ${TP.blue}; font: inherit; font-weight: 600; cursor: pointer; text-decoration: underline; }
`;
