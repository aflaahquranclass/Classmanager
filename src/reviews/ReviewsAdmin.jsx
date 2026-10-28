// Admin → Reviews: the review form's private link (to share in class groups)
// and the reviews sent through it. The website itself never links to the form.
// Approving one puts it on the website's home page with its stars, under a
// masked name (first two letters); the full name, Viber number and private
// request are only ever shown here.

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, RotateCw, Star, Trash2, Hourglass, Copy, Link2, Lock, LockOpen } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { TP } from "../App.jsx";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { THAANA_FONT, loadThaanaFont } from "../exams/reportStrings.js";

const FILTERS = [
  { key: "pending", label: "Waiting" },
  { key: "approved", label: "On website" },
  { key: "rejected", label: "Hidden" },
  { key: "all", label: "All" },
];
const STATUS = {
  pending: { label: "Waiting", color: "#9C6B12", bg: "#FDF3DC" },
  approved: { label: "On website", color: "#1E7A4C", bg: "#E3F5EA" },
  rejected: { label: "Hidden", color: "#A5432C", bg: "#FBE9E4" },
};
const FORM_PATH = "/review";
const formUrl = (key) => {
  const { hostname, origin } = window.location;
  const base = ["localhost", "127.0.0.1"].includes(hostname) ? origin : "https://aflaahqc.com";
  return `${base}${FORM_PATH}?k=${key}`;
};
const newKey = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);
// Same masking as public_reviews() in the database: "Haathim Abdul Rahmaan" → "Ha*****".
const publicName = (name) => `${[...name.trim()].slice(0, 2).join("")}*****`;
const fmtWhen = (iso) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

// Waiting-review count for the nav badge.
export function usePendingReviewCount(enabled) {
  const [count, setCount] = useState(0);
  const load = useCallback(async () => {
    if (!enabled) return;
    const { count: n, error } = await supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending");
    if (!error) setCount(n || 0);
  }, [enabled]);
  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);
  return [count, load];
}

function StarRow({ rating }) {
  return (
    <span className="rv-stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={16} fill="currentColor" strokeWidth={0} style={{ color: n <= rating ? "#EF9F27" : "#D5E2EE" }} />)}
    </span>
  );
}

export function AdminReviews({ showToast, onCountChange }) {
  const [filter, setFilter] = useState("pending");
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [formSettings, setFormSettings] = useState(null);

  useEffect(() => {
    supabase.from("review_form_settings").select("form_key, is_open").eq("id", 1).maybeSingle()
      .then(({ data }) => setFormSettings(data || false));
  }, []);

  const saveForm = async (patch, message) => {
    const { data, error: err } = await supabase.from("review_form_settings")
      .update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1).select("form_key, is_open").single();
    if (err) { showToast(`Couldn’t update the form: ${err.message}`); return; }
    setFormSettings(data);
    showToast(message);
  };

  const toggleOpen = () => saveForm({ is_open: !formSettings.is_open }, formSettings.is_open ? "Review form closed." : "Review form opened.");

  const resetLink = async () => {
    if (!(await confirmDialog({
      title: "Make a new form link?",
      message: "The old link will stop working. Share the new link in your class groups.",
      confirmLabel: "Make new link", danger: false,
    }))) return;
    saveForm({ form_key: newKey() }, "New link made. The old link no longer works.");
  };

  const load = useCallback(async () => {
    setError("");
    let q = supabase.from("reviews").select("*").order("created_at", { ascending: filter === "pending" }).limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error: err } = await q;
    if (err) { setError(err.message); setReviews([]); return; }
    setReviews(data || []);
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadThaanaFont(); }, []);

  const setStatus = async (review, status) => {
    setBusyId(review.id);
    const { error: err } = await supabase.from("reviews").update({ status, reviewed_at: new Date().toISOString() }).eq("id", review.id);
    setBusyId(null);
    if (err) { showToast(`Couldn’t update: ${err.message}`); return; }
    showToast(status === "approved" ? `${review.name}’s review is now on the website.` : `${review.name}’s review is hidden.`);
    onCountChange?.();
    load();
  };

  const remove = async (review) => {
    if (!(await confirmDialog({ title: `Delete ${review.name}’s review?`, message: "It will be removed for good.", confirmLabel: "Delete" }))) return;
    setBusyId(review.id);
    const { error: err } = await supabase.from("reviews").delete().eq("id", review.id);
    setBusyId(null);
    if (err) { showToast(`Couldn’t delete: ${err.message}`); return; }
    showToast("Review deleted.");
    onCountChange?.();
    load();
  };

  const copyLink = async () => {
    const url = formUrl(formSettings.form_key);
    try { await navigator.clipboard.writeText(url); showToast("Review form link copied."); }
    catch { showToast(url); }
  };

  return (
    <div className="rv-wrap">
      <style>{rvCss()}</style>
      <div className="tp-card rv-link">
        <div className="rv-link-head">
          <div className="rv-link-title"><Link2 size={18} aria-hidden="true" /> Review form</div>
          {formSettings && <span className="rv-badge" style={formSettings.is_open ? { color: "#1E7A4C", background: "#E3F5EA" } : { color: "#A5432C", background: "#FBE9E4" }}>{formSettings.is_open ? "Open" : "Closed"}</span>}
        </div>
        <p className="rv-link-help">Only people with this link can send a review. Share it in your class Viber groups; the website doesn’t link to it.</p>
        {formSettings === null && <div className="rv-link-help">Loading…</div>}
        {formSettings === false && <div className="rv-error">Couldn’t load the form link.</div>}
        {formSettings && (
          <>
            <a className="rv-link-url" href={formUrl(formSettings.form_key)} target="_blank" rel="noreferrer">{formUrl(formSettings.form_key)}</a>
            <div className="rv-link-actions">
              <button type="button" className="tp-btn-gradient" onClick={copyLink}><Copy size={16} aria-hidden="true" /> Copy link</button>
              <button type="button" className="tp-btn-outline" onClick={toggleOpen}>{formSettings.is_open ? <><Lock size={16} aria-hidden="true" /> Close form</> : <><LockOpen size={16} aria-hidden="true" /> Open form</>}</button>
              <button type="button" className="tp-btn-outline" onClick={resetLink}><RotateCw size={16} aria-hidden="true" /> Make new link</button>
            </div>
          </>
        )}
      </div>

      <div className="rv-bar">
        <div className="tp-segment" role="group" aria-label="Review status" style={{ marginBottom: 0 }}>
          {FILTERS.map((x) => (
            <button key={x.key} type="button" aria-pressed={filter === x.key} className={`tp-segment-btn ${filter === x.key ? "tp-segment-btn-active" : ""}`} onClick={() => setFilter(x.key)}>{x.label}</button>
          ))}
        </div>
        <button type="button" className="tp-btn-outline" onClick={load}><RotateCw size={16} aria-hidden="true" /> Refresh</button>
      </div>

      {error && <div className="tp-card rv-error" role="alert">Couldn’t load reviews: {error}</div>}
      {reviews === null && <div className="tp-card">Loading…</div>}
      {reviews && reviews.length === 0 && !error && (
        <div className="tp-card rv-empty">{filter === "pending" ? "No reviews waiting for approval." : "No reviews here."}</div>
      )}

      <div className="rv-grid">
        {(reviews || []).map((r) => {
          const st = STATUS[r.status];
          const busy = busyId === r.id;
          return (
            <article key={r.id} className="tp-card rv-card">
              <div className="rv-top">
                <div style={{ minWidth: 0 }}>
                  <div className="rv-name" dir="auto">{r.name}</div>
                  <div className="rv-sub" dir="auto">{r.class_name}</div>
                </div>
                <span className="rv-badge" style={{ color: st.color, background: st.bg }}>{r.status === "pending" && <Hourglass size={13} aria-hidden="true" />}{st.label}</span>
              </div>
              <StarRow rating={r.rating} />
              <p className="rv-text" dir="auto">{r.comment}</p>
              <dl className="rv-facts">
                <dt>Shown as</dt><dd dir="auto">{publicName(r.name)}</dd>
                <dt>Viber</dt><dd><a href={`viber://chat?number=${encodeURIComponent(r.viber.replace(/[^\d+]/g, ""))}`}>{r.viber}</a></dd>
                {r.request && <><dt>Request</dt><dd dir="auto">{r.request}</dd></>}
                <dt>Sent</dt><dd>{fmtWhen(r.created_at)}</dd>
              </dl>
              <div className="rv-actions">
                {r.status !== "approved" && <button type="button" className="tp-btn-gradient" disabled={busy} onClick={() => setStatus(r, "approved")}><CheckCircle2 size={17} aria-hidden="true" /> Approve</button>}
                {r.status !== "rejected" && <button type="button" className="tp-btn-outline rv-reject" disabled={busy} onClick={() => setStatus(r, "rejected")}><XCircle size={17} aria-hidden="true" /> {r.status === "approved" ? "Remove from website" : "Hide"}</button>}
                <button type="button" className="tp-btn-outline rv-delete" disabled={busy} onClick={() => remove(r)} aria-label="Delete review"><Trash2 size={17} aria-hidden="true" /></button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

const rvCss = () => `
  .rv-wrap { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 16px; }
  .rv-wrap [dir="auto"] { font-family: ${THAANA_FONT}; }
  .rv-link { display: flex; flex-direction: column; gap: 10px; }
  .rv-link-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .rv-link-title { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 16px; color: ${TP.navy}; }
  .rv-link-help { margin: 0; font-size: 13px; color: ${TP.secondaryText}; }
  .rv-link-url { display: block; padding: 10px 12px; border-radius: 10px; background: #F3F8FC; border: 1px solid ${TP.border}; color: ${TP.blue}; font-size: 14px; text-decoration: none; overflow-wrap: anywhere; }
  .rv-link-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .rv-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .rv-error { color: #A5432C; }
  .rv-empty { text-align: center; color: ${TP.secondaryText}; }
  .rv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 360px), 1fr)); gap: 16px; }
  .rv-card { display: flex; flex-direction: column; gap: 10px; padding: 18px; }
  .rv-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .rv-name { font-weight: 700; font-size: 16px; color: ${TP.navy}; overflow-wrap: anywhere; }
  .rv-sub { font-size: 13px; color: ${TP.secondaryText}; }
  .rv-badge { flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
  .rv-stars { display: inline-flex; gap: 2px; }
  .rv-text { margin: 0; font-size: 15px; line-height: 1.7; color: ${TP.navy}; white-space: pre-wrap; overflow-wrap: anywhere; }
  .rv-facts { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 14px; padding-top: 10px; border-top: 1px solid ${TP.border}; }
  .rv-facts dt { color: ${TP.secondaryText}; }
  .rv-facts dd { margin: 0; color: ${TP.navy}; font-weight: 600; white-space: pre-wrap; overflow-wrap: anywhere; }
  .rv-facts a { color: ${TP.blue}; text-decoration: none; }
  .rv-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: auto; }
  .rv-actions button { flex: 1 1 auto; justify-content: center; }
  .rv-actions .rv-delete { flex: 0 0 auto; color: #A5432C; border-color: #E3C3BA; }
  .rv-reject { color: #A5432C; border-color: #E3C3BA; }
`;
