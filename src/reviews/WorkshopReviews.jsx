// Admin → Reviews → Workshop reviews: the workshop review form's private link
// (aflaahqc.com/workshop-review?k=…) and the answers sent through it, with a
// count of each answer at the top. Answers are private feedback and never
// show on the website. Questions live in workshops/workshopReview.js.

import { useState, useEffect, useCallback } from "react";
import { RotateCw, Trash2, Copy, Link2, Lock, LockOpen } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { TP } from "../shared.jsx";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { RATINGS, RATED, NEXT_QUESTION, NEXT_CHOICES, COMMENT_LABEL, WORKSHOP_CHOICES, ratingOf, nextChoiceOf } from "../workshops/workshopReview.js";

const FORM_PATH = "/workshop-review";
const formUrl = (key) => {
  const { hostname, origin } = window.location;
  const base = ["localhost", "127.0.0.1"].includes(hostname) ? origin : "https://aflaahqc.com";
  return `${base}${FORM_PATH}?k=${key}`;
};
const newKey = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);
const fmtWhen = (iso) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const workshopName = (key) => WORKSHOP_CHOICES.find((w) => w.key === key)?.name || key;

// One question's answers as a stacked bar with the counts under it.
function Tally({ label, choices, rows, field }) {
  const counts = choices.map((c) => ({ ...c, n: rows.filter((r) => r[field] === c.value).length }));
  const total = counts.reduce((a, c) => a + c.n, 0);
  const palette = ["#1E7A4C", "#176FD1", "#9C6B12"];
  return (
    <div className="wr-tally">
      <div className="wr-tally-label" dir="auto">{label}</div>
      <div className="wr-bar" aria-hidden="true">
        {counts.map((c, i) => c.n > 0 && <span key={c.value} style={{ width: `${(c.n / total) * 100}%`, background: c.color || palette[i] }} />)}
      </div>
      <div className="wr-counts">
        {counts.map((c, i) => (
          <span key={c.value}><i style={{ background: c.color || palette[i] }} />{c.en} <b>{c.n}</b></span>
        ))}
      </div>
    </div>
  );
}

export function WorkshopReviews({ showToast }) {
  const [settings, setSettings] = useState(null);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    supabase.from("workshop_review_form_settings").select("workshop, form_key, is_open").eq("id", 1).maybeSingle()
      .then(({ data }) => setSettings(data || false));
  }, []);

  const saveForm = async (patch, message) => {
    const { data, error: err } = await supabase.from("workshop_review_form_settings")
      .update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1).select("workshop, form_key, is_open").single();
    if (err) { showToast(`Couldn’t update the form: ${err.message}`); return; }
    setSettings(data);
    showToast(message);
  };

  const load = useCallback(async () => {
    if (!settings) return;
    setError("");
    const { data, error: err } = await supabase.from("workshop_reviews").select("*")
      .eq("workshop", settings.workshop).order("created_at", { ascending: false }).limit(500);
    if (err) { setError(err.message); setRows([]); return; }
    setRows(data || []);
  }, [settings?.workshop]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const resetLink = async () => {
    if (!(await confirmDialog({
      title: "Make a new form link?",
      message: "The old link will stop working. Share the new link in the workshop group.",
      confirmLabel: "Make new link", danger: false,
    }))) return;
    saveForm({ form_key: newKey() }, "New link made. The old link no longer works.");
  };

  const copyLink = async () => {
    const url = formUrl(settings.form_key);
    try { await navigator.clipboard.writeText(url); showToast("Workshop review link copied."); }
    catch { showToast(url); }
  };

  const remove = async (r) => {
    if (!(await confirmDialog({ title: "Delete these answers?", message: "They will be removed for good.", confirmLabel: "Delete" }))) return;
    setBusyId(r.id);
    const { error: err } = await supabase.from("workshop_reviews").delete().eq("id", r.id);
    setBusyId(null);
    if (err) { showToast(`Couldn’t delete: ${err.message}`); return; }
    showToast("Answers deleted.");
    load();
  };

  return (
    <>
      <style>{wrCss()}</style>
      <div className="tp-card rv-link">
        <div className="rv-link-head">
          <div className="rv-link-title"><Link2 size={18} aria-hidden="true" /> Workshop review form</div>
          {settings && <span className="rv-badge" style={settings.is_open ? { color: "#1E7A4C", background: "#E3F5EA" } : { color: "#A5432C", background: "#FBE9E4" }}>{settings.is_open ? "Open" : "Closed"}</span>}
        </div>
        <p className="rv-link-help">Share this link in the workshop’s Viber group after the session. Answers are only shown here, never on the website.</p>
        {settings === null && <div className="rv-link-help">Loading…</div>}
        {settings === false && <div className="rv-error">Couldn’t load the form link.</div>}
        {settings && (
          <>
            {WORKSHOP_CHOICES.length > 1 ? (
              <label className="wr-pick">
                <span>Workshop</span>
                <select className="tp-input" value={settings.workshop} onChange={(e) => saveForm({ workshop: e.target.value }, "The form is now for this workshop.")}>
                  {WORKSHOP_CHOICES.map((w) => <option key={w.key} value={w.key}>{w.name}</option>)}
                </select>
              </label>
            ) : <div className="wr-workshop" dir="auto">{workshopName(settings.workshop)}</div>}
            <a className="rv-link-url" href={formUrl(settings.form_key)} target="_blank" rel="noreferrer">{formUrl(settings.form_key)}</a>
            <div className="rv-link-actions">
              <button type="button" className="tp-btn-gradient" onClick={copyLink}><Copy size={16} aria-hidden="true" /> Copy link</button>
              <button type="button" className="tp-btn-outline" onClick={() => saveForm({ is_open: !settings.is_open }, settings.is_open ? "Workshop review form closed." : "Workshop review form opened.")}>
                {settings.is_open ? <><Lock size={16} aria-hidden="true" /> Close form</> : <><LockOpen size={16} aria-hidden="true" /> Open form</>}
              </button>
              <button type="button" className="tp-btn-outline" onClick={resetLink}><RotateCw size={16} aria-hidden="true" /> Make new link</button>
            </div>
          </>
        )}
      </div>

      <div className="rv-bar">
        <div className="wr-total">{rows ? `${rows.length} ${rows.length === 1 ? "answer" : "answers"}` : ""}</div>
        <button type="button" className="tp-btn-outline" onClick={load}><RotateCw size={16} aria-hidden="true" /> Refresh</button>
      </div>

      {error && <div className="tp-card rv-error" role="alert">Couldn’t load answers: {error}</div>}
      {settings && rows === null && <div className="tp-card">Loading…</div>}
      {rows && rows.length === 0 && !error && <div className="tp-card rv-empty">No answers yet. Share the link above in the workshop group.</div>}

      {rows && rows.length > 0 && (
        <div className="tp-card wr-summary">
          {RATED.map((q) => <Tally key={q.key} label={q.dv} choices={RATINGS} rows={rows} field={q.key} />)}
          <Tally label={NEXT_QUESTION.dv} choices={NEXT_CHOICES} rows={rows} field="next_workshop" />
        </div>
      )}

      <div className="rv-grid">
        {(rows || []).map((r) => {
          const next = nextChoiceOf(r.next_workshop);
          return (
            <article key={r.id} className="tp-card rv-card">
              <div className="rv-top">
                <div style={{ minWidth: 0 }}>
                  <div className="rv-name">{fmtWhen(r.created_at)}</div>
                </div>
                <button type="button" className="tp-btn-outline rv-delete" disabled={busyId === r.id} onClick={() => remove(r)} aria-label="Delete answers"><Trash2 size={17} aria-hidden="true" /></button>
              </div>
              <dl className="wr-answers">
                {RATED.map((q) => {
                  const a = ratingOf(r[q.key]);
                  return (
                    <div key={q.key}>
                      <dt dir="auto">{q.dv}</dt>
                      <dd><span className="rv-badge" style={{ color: a?.color, background: a?.bg }}>{a?.en}</span></dd>
                    </div>
                  );
                })}
              </dl>
              <dl className="rv-facts">
                <dt>Holiday workshop</dt><dd>{next?.en}</dd>
                {r.next_topic && <><dt>Next topic</dt><dd dir="auto">{r.next_topic}</dd></>}
              </dl>
              <div>
                <div className="wr-q" dir="auto">{COMMENT_LABEL.dv}</div>
                <p className="rv-text" dir="auto">{r.comment}</p>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

const wrCss = () => `
  .wr-workshop { font-weight: 600; color: ${TP.navy}; }
  .wr-pick { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: ${TP.secondaryText}; }
  .wr-total { font-weight: 700; color: ${TP.navy}; }
  .wr-summary { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 18px 24px; }
  .wr-tally { display: flex; flex-direction: column; gap: 8px; }
  .wr-tally-label { font-size: 15px; color: ${TP.navy}; text-align: right; }
  .wr-bar { display: flex; height: 10px; border-radius: 999px; overflow: hidden; background: #EEF3F8; }
  .wr-bar span { display: block; height: 100%; }
  .wr-counts { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 13px; color: ${TP.secondaryText}; }
  .wr-counts span { display: inline-flex; align-items: center; gap: 6px; }
  .wr-counts i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
  .wr-counts b { color: ${TP.navy}; }
  .wr-answers { margin: 0; display: flex; flex-direction: column; gap: 8px; }
  .wr-answers > div { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-direction: row-reverse; }
  .wr-answers dt { font-size: 14px; color: ${TP.navy}; text-align: right; }
  .wr-answers dd { margin: 0; }
  .rv-top .rv-delete { flex: 0 0 auto; color: #A5432C; border-color: #E3C3BA; }
  .wr-q { font-size: 13px; color: ${TP.secondaryText}; text-align: right; margin-bottom: 4px; }
`;
