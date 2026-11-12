// Admin → Registrations → Hifz test: registrations from the website's Hifz
// test form (aflaahqc.com/hifz-test, src/landing/HifzTestPage.jsx). Each has
// the student's full name, age, current address, Viber number, the book for
// the test and their teacher's name. The admin accepts or rejects (only
// records the decision) and adds the students to an exam by hand in Exams.
// The admin also opens or closes the form, copies the link and downloads the
// list. Saved in hifz_test_registrations
// (supabase/migrations/20261122_hifz_test_registrations.sql).

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, RotateCw, Trash2, Hourglass, Copy, ExternalLink, BookOpenCheck, Search, Download, Phone, Lock, Unlock } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { usePendingHifzTestCount } from "../admin/adminData.js";
export { usePendingHifzTestCount };
import { TP } from "../shared.jsx";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { THAANA_FONT, loadThaanaFont } from "../exams/reportStrings.js";

const TABLE = "hifz_test_registrations";
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
const pageUrl = () => {
  const { hostname, origin } = window.location;
  const base = ["localhost", "127.0.0.1"].includes(hostname) ? origin : "https://aflaahqc.com";
  return `${base}/hifz-test`;
};
const fmtWhen = (iso) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const viberLink = (n) => `viber://chat?number=${encodeURIComponent(String(n).replace(/[^\d+]/g, "").replace(/^(\d{7})$/, "+960$1"))}`;

// embedded: shown as a tab inside Registrations, without its own page title.
export function AdminHifzTest({ showToast, onCountChange, embedded = false }) {
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [all, setAll] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [isOpen, setIsOpen] = useState(null);

  const load = useCallback(async () => {
    setError("");
    const [{ data, error: err }, { data: settings }] = await Promise.all([
      supabase.from(TABLE).select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("hifz_test_settings").select("is_open").eq("id", 1).maybeSingle(),
    ]);
    if (err) { setError(err.message); setAll([]); return; }
    setAll(data || []);
    setIsOpen(settings ? settings.is_open : null);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadThaanaFont(); }, []);

  const toggleOpen = async () => {
    const next = !isOpen;
    const { error: err } = await supabase.from("hifz_test_settings").update({ is_open: next, updated_at: new Date().toISOString() }).eq("id", 1);
    if (err) { showToast(`Couldn’t change the form: ${err.message}`); return; }
    setIsOpen(next);
    showToast(next ? "The form is open." : "The form is closed.");
  };

  const setStatus = async (r, status) => {
    setBusyId(r.id);
    const { error: err } = await supabase.from(TABLE).update({ status, reviewed_at: new Date().toISOString() }).eq("id", r.id);
    setBusyId(null);
    if (err) { showToast(`Couldn’t update: ${err.message}`); return; }
    showToast(status === "accepted" ? "Registration accepted." : status === "rejected" ? "Registration rejected." : "Moved back to waiting.");
    onCountChange?.();
    load();
  };

  const remove = async (r) => {
    if (!(await confirmDialog({ title: "Delete this registration?", message: `${r.name}’s Hifz test registration will be removed for good.`, confirmLabel: "Delete" }))) return;
    setBusyId(r.id);
    const { error: err } = await supabase.from(TABLE).delete().eq("id", r.id);
    setBusyId(null);
    if (err) { showToast(`Couldn’t delete: ${err.message}`); return; }
    showToast("Registration deleted.");
    onCountChange?.();
    load();
  };

  const list = all || [];
  const term = search.trim().toLowerCase();
  const shown = list
    .filter((r) => filter === "all" || r.status === filter)
    .filter((r) => !term || [r.name, r.address, r.viber, r.book, r.teacher_name].some((x) => String(x || "").toLowerCase().includes(term)));
  const countOf = (key) => (key === "all" ? list.length : list.filter((r) => r.status === key).length);

  const copyNumbers = async () => {
    const nums = [...new Set(list.filter((r) => r.status === "accepted").map((r) => r.viber.trim()))];
    if (!nums.length) { showToast("No accepted registrations yet."); return; }
    const text = nums.join("\n");
    try { await navigator.clipboard.writeText(text); showToast(`${nums.length} Viber number${nums.length === 1 ? "" : "s"} copied.`); }
    catch { showToast(text); }
  };

  // The whole list as a spreadsheet (CSV, opens in Excel).
  const downloadList = () => {
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Status", "Name", "Age", "Address", "Viber", "Book", "Teacher", "Sent"];
    const lines = list.map((r) => [
      STATUS[r.status].label, r.name, r.age, r.address, r.viber, r.book, r.teacher_name,
      new Date(r.created_at).toLocaleString("en-GB", { timeZone: "Indian/Maldives" }),
    ].map(cell).join(","));
    const blob = new Blob(["﻿" + [head.map(cell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Hifz test registrations - ${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copyLink = async () => {
    const url = pageUrl();
    try { await navigator.clipboard.writeText(url); showToast("Form link copied."); }
    catch { showToast(url); }
  };

  const refresh = <button type="button" className="tp-btn-outline" onClick={load}><RotateCw size={16} aria-hidden="true" /> Refresh</button>;

  return (
    <div className="ht-wrap">
      <style>{htCss()}</style>
      {embedded ? (
        <div className="ht-tools">{refresh}</div>
      ) : (
        <div className="tp-header">
          <div className="tp-title-group">
            <span className="tp-title-icon" aria-hidden="true"><BookOpenCheck size={22} /></span>
            <div>
              <h1 className="tp-title">Hifz test</h1>
              <div className="tp-subtext" style={{ margin: 0 }}>Registrations from the website’s Hifz test form.</div>
            </div>
          </div>
          <div className="tp-actions">{refresh}</div>
        </div>
      )}

      <div className="tp-card ht-head">
        <div className="ht-state">
          <span className={`ht-pill ${isOpen ? "on" : "off"}`}>{isOpen === null ? "…" : isOpen ? "Form open" : "Form closed"}</span>
          {isOpen !== null && (
            <button type="button" className="tp-btn-outline" onClick={toggleOpen}>
              {isOpen ? <><Lock size={16} aria-hidden="true" /> Close the form</> : <><Unlock size={16} aria-hidden="true" /> Open the form</>}
            </button>
          )}
        </div>
        <a className="ht-url" href={pageUrl()} target="_blank" rel="noreferrer">{pageUrl()}</a>
        <div className="ht-row">
          <button type="button" className="tp-btn-gradient" onClick={copyLink}><Copy size={16} aria-hidden="true" /> Copy link</button>
          <a className="tp-btn-outline" href={pageUrl()} target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" /> Open form</a>
          <button type="button" className="tp-btn-outline" onClick={copyNumbers}><Phone size={16} aria-hidden="true" /> Copy accepted Viber numbers</button>
          <button type="button" className="tp-btn-outline" onClick={downloadList} disabled={!list.length}><Download size={16} aria-hidden="true" /> Download list (Excel)</button>
        </div>
      </div>

      <div className="tp-segment" role="group" aria-label="Registration status" style={{ marginBottom: 0, alignSelf: "flex-start" }}>
        {FILTERS.map((x) => (
          <button key={x.key} type="button" aria-pressed={filter === x.key} className={`tp-segment-btn ${filter === x.key ? "tp-segment-btn-active" : ""}`} onClick={() => setFilter(x.key)}>{x.label} ({countOf(x.key)})</button>
        ))}
      </div>
      <label className="ht-search">
        <Search size={17} aria-hidden="true" />
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, Viber, book or teacher" dir="auto" />
      </label>

      {error && <div className="tp-card ht-error" role="alert">Couldn’t load registrations: {error}</div>}
      {all === null && <div className="tp-card">Loading…</div>}
      {all && shown.length === 0 && !error && (
        <div className="tp-card ht-empty">{term ? "No registrations match the search." : filter === "pending" ? "No registrations waiting." : "No registrations here."}</div>
      )}

      <div className="ht-grid">
        {shown.map((r) => {
          const st = STATUS[r.status];
          const busy = busyId === r.id;
          return (
            <article key={r.id} className="tp-card ht-card">
              <div className="ht-top">
                <div className="ht-name" dir="auto">{r.name}</div>
                <span className="ht-badge" style={{ color: st.color, background: st.bg }}>{r.status === "pending" && <Hourglass size={13} aria-hidden="true" />}{st.label}</span>
              </div>
              <dl className="ht-facts">
                <div><dt>Age</dt><dd>{r.age}</dd></div>
                <div><dt>Viber</dt><dd><a href={viberLink(r.viber)}>{r.viber}</a></dd></div>
                <div><dt>Address</dt><dd dir="auto">{r.address}</dd></div>
                <div><dt>Book</dt><dd dir="auto">{r.book}</dd></div>
                <div><dt>Teacher</dt><dd dir="auto">{r.teacher_name}</dd></div>
              </dl>
              <div className="ht-sent">Sent {fmtWhen(r.created_at)}{r.reviewed_at ? ` · checked ${fmtWhen(r.reviewed_at)}` : ""}</div>
              <div className="ht-actions">
                {r.status !== "accepted" && <button type="button" className="tp-btn-gradient" disabled={busy} onClick={() => setStatus(r, "accepted")}><CheckCircle2 size={17} aria-hidden="true" /> Accept</button>}
                {r.status !== "rejected" && <button type="button" className="tp-btn-outline ht-reject" disabled={busy} onClick={() => setStatus(r, "rejected")}><XCircle size={17} aria-hidden="true" /> Reject</button>}
                {r.status !== "pending" && <button type="button" className="tp-btn-outline" disabled={busy} onClick={() => setStatus(r, "pending")}><Hourglass size={17} aria-hidden="true" /> Waiting</button>}
                <button type="button" className="tp-btn-outline ht-delete" disabled={busy} onClick={() => remove(r)} aria-label="Delete registration"><Trash2 size={17} aria-hidden="true" /></button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

const htCss = () => `
  .ht-wrap { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 16px; }
  .ht-wrap [dir="auto"] { font-family: ${THAANA_FONT}; }
  .ht-tools { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
  .ht-head { display: flex; flex-direction: column; gap: 10px; }
  .ht-state { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .ht-pill { padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: 700; background: #EEF2F6; color: ${TP.secondaryText}; }
  .ht-pill.on { background: #E3F5EA; color: #1E7A4C; }
  .ht-pill.off { background: #FBE9E4; color: #A5432C; }
  .ht-url { display: block; padding: 10px 12px; border-radius: 10px; background: #F3F8FC; border: 1px solid ${TP.border}; color: ${TP.blue}; font-size: 14px; text-decoration: none; overflow-wrap: anywhere; }
  .ht-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .ht-row a { text-decoration: none; }
  .ht-error { color: #A5432C; }
  .ht-empty { text-align: center; color: ${TP.secondaryText}; }
  .ht-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 360px), 1fr)); gap: 16px; }
  .ht-card { display: flex; flex-direction: column; gap: 10px; padding: 18px; }
  .ht-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .ht-name { font-size: 18px; color: ${TP.navy}; text-align: right; overflow-wrap: anywhere; flex: 1; }
  .ht-badge { flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
  .ht-facts { margin: 0; display: grid; gap: 6px; padding: 10px 12px; border-radius: 12px; background: #F8FBFE; border: 1px solid ${TP.border}; }
  .ht-facts > div { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; font-size: 14px; }
  .ht-facts dt { color: ${TP.secondaryText}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; flex-shrink: 0; }
  .ht-facts dd { margin: 0; color: ${TP.navy}; text-align: right; overflow-wrap: anywhere; }
  .ht-facts a { color: ${TP.blue}; text-decoration: none; font-weight: 600; }
  .ht-sent { font-size: 12px; color: ${TP.secondaryText}; }
  .ht-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: auto; }
  .ht-actions button { flex: 1 1 auto; justify-content: center; }
  .ht-actions .ht-delete { flex: 0 0 auto; color: #A5432C; border-color: #E3C3BA; }
  .ht-reject { color: #A5432C; border-color: #E3C3BA; }
  .ht-search { display: flex; align-items: center; gap: 8px; padding: 0 12px; min-height: 44px; border: 1px solid ${TP.border}; border-radius: 12px; background: #fff; color: ${TP.secondaryText}; }
  .ht-search input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font: inherit; font-size: 15px; color: ${TP.navy}; }
  .ht-search:focus-within { outline: 2px solid ${TP.blue}; }
`;
