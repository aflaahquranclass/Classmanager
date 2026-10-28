// Admin → Registrations, in two sections:
// - Applications: registrations sent from the website with their fee slips.
//   Accepting one adds the student to the class they chose, records the
//   registration fee as other income in Finance, gives them a student portal
//   login and sends them a welcome message with their class and login.
// - Form links: the main form and one per class (for posters), each with its
//   link to copy and its own open/close switch.
// Which classes the website offers, with their fees, is set on each class
// under Admin → Classes ("Show on the website").

import { useState, useEffect, useCallback, useMemo } from "react";
import { CheckCircle2, XCircle, RotateCw, Trash2, Hourglass, FileText, Copy, Link2, Lock, LockOpen, ExternalLink, Inbox, MessageCircle, X, ChevronRight, Layers } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { TP } from "../App.jsx";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { sendRegistrationWelcome } from "../notifications/smsSend.js";
import { CATEGORIES, FORMS, REG_BUCKET, categoryOf, formUrl, fmtMvr } from "./registrations.js";

const SECTIONS = [
  { key: "applications", label: "Applications", icon: Inbox, help: "Registrations sent from the website. Check the payment slip, then accept or reject." },
  { key: "links", label: "Form links", icon: Link2, help: "Copy a link to share or put on a poster. Close a form to stop new registrations." },
];
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
const OPEN = { color: "#1E7A4C", background: "#E3F5EA" };
const CLOSED = { color: "#A5432C", background: "#FBE9E4" };
const fmtWhen = (iso) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

// Waiting-registration count for the nav badge.
export function usePendingRegistrationCount(enabled) {
  const [count, setCount] = useState(0);
  const load = useCallback(async () => {
    if (!enabled) return;
    const { count: n, error } = await supabase.from("class_registrations").select("id", { count: "exact", head: true }).eq("status", "pending");
    if (!error) setCount(n || 0);
  }, [enabled]);
  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);
  return [count, load];
}

// onAccepted(studentRow, monthKey): a registration became a student; the
// app adds them to its list and reloads that month's other income.
export function AdminRegistrations({ showToast, onCountChange, pendingCount = 0, teacherName, onAccepted, onOpenClasses }) {
  const [view, setView] = useState("applications");
  const section = SECTIONS.find((s) => s.key === view);
  return (
    <div className="rg-wrap">
      <style>{rgCss()}</style>
      <div className="rg-sections" role="tablist" aria-label="Registrations">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.key} type="button" role="tab" aria-selected={view === s.key} className={`rg-section ${view === s.key ? "on" : ""}`} onClick={() => setView(s.key)}>
              <Icon size={20} aria-hidden="true" />
              <span>{s.label}</span>
              {s.key === "applications" && pendingCount > 0 && <span className="rg-count">{pendingCount}</span>}
            </button>
          );
        })}
      </div>
      <p className="rg-help">{section.help}</p>
      {view === "applications" && <Applications showToast={showToast} onCountChange={onCountChange} teacherName={teacherName} onAccepted={onAccepted} />}
      {view === "links" && <FormLinks showToast={showToast} />}
      <div className="tp-card rg-hint">
        <Layers size={18} aria-hidden="true" />
        <span>The classes, days, times and fees on the website come from <b>Classes</b>: edit a class and turn on <b>Show on the website</b>.</span>
        {onOpenClasses && <button type="button" className="tp-btn-outline" onClick={onOpenClasses}>Open Classes</button>}
      </div>
    </div>
  );
}

function Applications({ showToast, onCountChange, teacherName, onAccepted }) {
  const [filter, setFilter] = useState("pending");
  const [cat, setCat] = useState("all");
  const [rows, setRows] = useState(null);
  const [urls, setUrls] = useState({});
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [openId, setOpenId] = useState(null); // the registration shown in full

  // Everything is loaded once and filtered here, so the tabs can show counts.
  const load = useCallback(async () => {
    setError("");
    const { data, error: err } = await supabase.from("class_registrations").select("*").order("created_at", { ascending: false }).limit(500);
    if (err) { setError(err.message); setRows([]); return; }
    setRows(data || []);
    const paths = (data || []).map((x) => x.slip_path);
    if (paths.length) {
      const { data: signed } = await supabase.storage.from(REG_BUCKET).createSignedUrls(paths, 3600);
      setUrls(Object.fromEntries((signed || []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl])));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const inClass = useMemo(() => (rows || []).filter((r) => cat === "all" || r.category === cat), [rows, cat]);
  const countOf = (status) => (status === "all" ? inClass.length : inClass.filter((r) => r.status === status).length);
  // Oldest first while waiting, so they're handled in order; newest first otherwise.
  const shown = useMemo(() => {
    const list = inClass.filter((r) => filter === "all" || r.status === filter);
    return filter === "pending" ? [...list].reverse() : list;
  }, [inClass, filter]);

  // Adds the student, records the fee, makes their portal login and sends
  // the welcome. The first two happen together in the database
  // (accept_registration); the login and message follow, and a failure there
  // is reported without undoing the student.
  const accept = async (r) => {
    if (!(await confirmDialog({
      title: `Accept ${r.name}?`,
      message: `They will be added to their class, ${fmtMvr(r.registration_fee || 0)} registration fee goes to Finance as income, and they get a welcome message on Viber number ${r.viber} with their class and student portal login.`,
      confirmLabel: "Accept & welcome", danger: false,
    }))) return;
    setBusyId(r.id);
    const { data: studentId, error: err } = await supabase.rpc("accept_registration", { p_id: r.id });
    if (err) { setBusyId(null); showToast(`Couldn’t accept: ${err.message}`); return; }
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const login = await supabase.functions.invoke("student-login", { body: { student_id: studentId } });
    const { data: row } = await supabase.from("students").select("*").eq("id", studentId).single();
    onAccepted?.(row, monthKey);
    let note = "";
    if (row) {
      const student = { id: row.id, userId: row.user_id, name: row.name, studentCode: row.student_code, className: row.class_name, fee: row.fee, phone: row.phone, email: row.email, schedule: row.schedule };
      const sent = await sendRegistrationWelcome(student, row.teacher_id ? teacherName?.(row.teacher_id) || "" : "", login.data?.password);
      note = sent.ok ? ` Welcome sent. ${sent.message}` : " The welcome message couldn’t be sent — send it from Notifications.";
      if (!login.data?.password) note += " The portal login couldn’t be made — make it from the student’s Edit.";
    }
    setBusyId(null);
    showToast(`${r.name} accepted and added to their class (Student ID ${row?.student_code || "—"}).${note}`);
    onCountChange?.();
    load();
  };

  const setStatus = async (r, status) => {
    if (status === "accepted") { accept(r); return; }
    setBusyId(r.id);
    const { error: err } = await supabase.from("class_registrations").update({ status, reviewed_at: new Date().toISOString() }).eq("id", r.id);
    setBusyId(null);
    if (err) { showToast(`Couldn’t update: ${err.message}`); return; }
    showToast(status === "rejected" ? `${r.name}’s registration rejected.` : `${r.name} moved back to waiting.`);
    onCountChange?.();
    load();
  };

  const remove = async (r) => {
    if (!(await confirmDialog({ title: `Delete ${r.name}’s registration?`, message: "The registration and its payment slip will be removed for good.", confirmLabel: "Delete" }))) return;
    setBusyId(r.id);
    const { error: err } = await supabase.from("class_registrations").delete().eq("id", r.id);
    if (!err) await supabase.storage.from(REG_BUCKET).remove([r.slip_path]);
    setBusyId(null);
    if (err) { showToast(`Couldn’t delete: ${err.message}`); return; }
    showToast("Registration deleted.");
    setOpenId(null);
    onCountChange?.();
    load();
  };

  useEffect(() => {
    if (!openId) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpenId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);
  const opened = (rows || []).find((r) => r.id === openId);

  return (
    <>
      <div className="tp-card rg-toolbar">
        <div className="tp-segment" role="group" aria-label="Status" style={{ marginBottom: 0 }}>
          {FILTERS.map((x) => (
            <button key={x.key} type="button" aria-pressed={filter === x.key} className={`tp-segment-btn ${filter === x.key ? "tp-segment-btn-active" : ""}`} onClick={() => setFilter(x.key)}>
              {x.label} {rows && <span className="rg-tab-count">{countOf(x.key)}</span>}
            </button>
          ))}
        </div>
        <div className="rg-toolbar-right">
          <label className="rg-select">
            <span>Class</span>
            <select className="lc-select" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="all">All classes</option>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.en}</option>)}
            </select>
          </label>
          <button type="button" className="tp-btn-outline rg-icon" onClick={load} aria-label="Refresh" title="Refresh"><RotateCw size={16} aria-hidden="true" /></button>
        </div>
      </div>

      {error && <div className="tp-card rg-error" role="alert">Couldn’t load registrations: {error}</div>}
      {rows === null && <div className="tp-card">Loading…</div>}
      {rows && shown.length === 0 && !error && (
        <div className="tp-card rg-empty">{filter === "pending" ? "No registrations waiting. New ones will appear here." : "No registrations here."}</div>
      )}

      {shown.length > 0 && (
        <div className="tp-card rg-list">
          {shown.map((r) => {
            const st = STATUS[r.status];
            return (
              <button key={r.id} type="button" className="rg-row" onClick={() => setOpenId(r.id)}>
                <span className="rg-row-main">
                  <b dir="auto">{r.name}</b>
                  <span>{categoryOf(r.category)?.en} · {r.class_label.split(" · ")[1]}</span>
                </span>
                <span className="rg-badge" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                <ChevronRight size={18} aria-hidden="true" className="rg-row-go" />
              </button>
            );
          })}
        </div>
      )}

      {opened && (() => {
        const r = opened;
        const st = STATUS[r.status];
        const busy = busyId === r.id;
        const url = urls[r.slip_path];
        const viber = r.viber.replace(/[^\d+]/g, "");
        return (
          <div className="rg-modal" role="dialog" aria-modal="true" aria-label={`${r.name}’s registration`} onClick={() => setOpenId(null)}>
            <article className="tp-card rg-card rg-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="rg-top">
                <div style={{ minWidth: 0 }}>
                  <div className="rg-name" dir="auto">{r.name}</div>
                  <div className="rg-sub">Sent {fmtWhen(r.created_at)}</div>
                </div>
                <span className="rg-badge" style={{ color: st.color, background: st.bg }}>{r.status === "pending" && <Hourglass size={13} aria-hidden="true" />}{st.label}</span>
                <button type="button" className="rg-close" onClick={() => setOpenId(null)} aria-label="Close"><X size={20} aria-hidden="true" /></button>
              </div>

              <div className="rg-class">
                <b>{categoryOf(r.category)?.en || "Class"}</b>
                <span>{r.class_label.split(" · ").slice(1).join(" · ")}</span>
                {r.form !== "all" && <small>From the {categoryOf(r.form)?.en} poster link</small>}
              </div>

              <dl className="rg-facts">
                <dt>Age</dt><dd>{r.age}</dd>
                <dt>ID card</dt><dd>{r.nic}</dd>
                <dt>Atoll &amp; island</dt><dd dir="auto">{r.atoll_island}</dd>
                <dt>Viber</dt><dd>{r.viber}</dd>
                {r.registration_fee != null && <><dt>Registration fee</dt><dd>{fmtMvr(r.registration_fee)}</dd></>}
              </dl>

              <div className="rg-links-row">
                {url
                  ? <a className="tp-btn-outline" href={url} target="_blank" rel="noreferrer"><FileText size={16} aria-hidden="true" /> Payment slip</a>
                  : <span className="rg-sub">Slip not available.</span>}
                <a className="tp-btn-outline" href={`viber://chat?number=${encodeURIComponent(viber)}`}><MessageCircle size={16} aria-hidden="true" /> Viber</a>
              </div>

              <div className="rg-actions">
                {r.status === "pending" ? (
                  <>
                    <button type="button" className="tp-btn-gradient" disabled={busy || !r.class_id} title={r.class_id ? undefined : "The class for this registration no longer exists"} onClick={() => setStatus(r, "accepted")}><CheckCircle2 size={17} aria-hidden="true" /> {busy ? "Accepting…" : "Accept"}</button>
                    <button type="button" className="tp-btn-outline rg-danger" disabled={busy} onClick={() => setStatus(r, "rejected")}><XCircle size={17} aria-hidden="true" /> Reject</button>
                  </>
                ) : r.status === "rejected" ? (
                  <button type="button" className="tp-btn-outline" disabled={busy} onClick={() => setStatus(r, "pending")}><RotateCw size={16} aria-hidden="true" /> Move back to waiting</button>
                ) : (
                  <span className="rg-done"><CheckCircle2 size={16} aria-hidden="true" /> Added to the class{r.reviewed_at ? ` on ${fmtWhen(r.reviewed_at)}` : ""}</span>
                )}
                <button type="button" className="tp-btn-outline rg-danger rg-icon" disabled={busy} onClick={() => remove(r)} aria-label="Delete registration" title="Delete"><Trash2 size={17} aria-hidden="true" /></button>
              </div>
            </article>
          </div>
        );
      })()}
    </>
  );
}

// The four form links to share (main form, and one per class for posters),
// each with its own open/close switch.
function FormLinks({ showToast }) {
  const [forms, setForms] = useState(null);
  useEffect(() => {
    supabase.from("registration_forms").select("form, is_open").then(({ data, error }) => {
      setForms(error ? false : Object.fromEntries((data || []).map((f) => [f.form, f.is_open])));
    });
  }, []);

  const toggle = async (form) => {
    const open = !forms[form.key];
    const { error } = await supabase.from("registration_forms").update({ is_open: open, updated_at: new Date().toISOString() }).eq("form", form.key);
    if (error) { showToast(`Couldn’t update the form: ${error.message}`); return; }
    setForms((f) => ({ ...f, [form.key]: open }));
    showToast(`${form.en} ${open ? "opened" : "closed"}.`);
  };

  const copy = async (form) => {
    const url = formUrl(form.key);
    try { await navigator.clipboard.writeText(url); showToast(`${form.en} link copied.`); }
    catch { showToast(url); }
  };

  if (forms === null) return <div className="tp-card">Loading…</div>;
  if (forms === false) return <div className="tp-card rg-error">Couldn’t load the forms.</div>;

  return (
    <div className="rg-grid">
      {FORMS.map((f) => {
        const open = forms[f.key] !== false;
        return (
          <article key={f.key} className="tp-card rg-card">
            <div className="rg-top">
              <div style={{ minWidth: 0 }}>
                <div className="rg-name">{f.key === "all" ? "Main form" : categoryOf(f.key).en}</div>
                <div className="rg-sub">{f.key === "all" ? "All classes · opened by the website’s Register buttons" : "For posters · class already chosen"}</div>
              </div>
              <span className="rg-badge" style={open ? OPEN : CLOSED}>{open ? "Open" : "Closed"}</span>
            </div>
            <a className="rg-link-url" href={formUrl(f.key)} target="_blank" rel="noreferrer">{formUrl(f.key)} <ExternalLink size={13} aria-hidden="true" /></a>
            <div className="rg-actions">
              <button type="button" className="tp-btn-gradient" onClick={() => copy(f)}><Copy size={16} aria-hidden="true" /> Copy link</button>
              <button type="button" className={`tp-btn-outline ${open ? "rg-danger" : ""}`} onClick={() => toggle(f)}>{open ? <><Lock size={16} aria-hidden="true" /> Close form</> : <><LockOpen size={16} aria-hidden="true" /> Open form</>}</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

const rgCss = () => `
  .rg-wrap { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 16px; }
  .rg-sections { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .rg-section { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px 12px; border-radius: 14px; border: 1px solid ${TP.border}; background: #FFFFFF; color: ${TP.navy}; font-weight: 700; font-size: 15px; cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
  .rg-section:hover { border-color: ${TP.blue}; }
  .rg-section.on { background: linear-gradient(90deg, ${TP.gradStart}, ${TP.blue}); border-color: transparent; color: #FFFFFF; box-shadow: 0 6px 16px rgba(13,79,133,.2); }
  .rg-section:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
  .rg-count { min-width: 22px; padding: 2px 7px; border-radius: 999px; background: #EF9F27; color: #FFFFFF; font-size: 12px; }
  .rg-help { margin: -4px 0 0; font-size: 14px; color: ${TP.secondaryText}; }
  .rg-error { color: #A5432C; }
  .rg-empty { text-align: center; color: ${TP.secondaryText}; padding: 28px; }
  .rg-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 14px; }
  .rg-toolbar-right { display: flex; align-items: center; gap: 8px; }
  .rg-tab-count { opacity: .7; font-weight: 600; margin-left: 2px; }
  .rg-select { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: ${TP.navy}; }
  .rg-select select { width: auto; min-width: 160px; }
  .rg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 16px; }
  .rg-list { display: flex; flex-direction: column; padding: 6px; }
  .rg-row { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px; border: 0; border-bottom: 1px solid ${TP.border}; background: none; text-align: left; font: inherit; color: ${TP.navy}; cursor: pointer; border-radius: 10px; }
  .rg-row:last-child { border-bottom: 0; }
  .rg-row:hover { background: #F3F8FC; }
  .rg-row:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: -2px; }
  .rg-row-main { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .rg-row-main b { font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rg-row-main span { font-size: 13px; color: ${TP.secondaryText}; }
  .rg-row-go { flex-shrink: 0; color: ${TP.secondaryText}; }
  .rg-modal { position: fixed; inset: 0; z-index: 100; background: rgba(10,30,50,0.55); display: flex; align-items: center; justify-content: center; padding: 16px; }
  .rg-modal-box { width: min(480px, 100%); max-height: calc(100vh - 32px); overflow-y: auto; box-sizing: border-box; }
  .rg-close { flex-shrink: 0; display: flex; padding: 4px; margin: -4px -6px 0 0; border: 0; background: none; color: ${TP.secondaryText}; cursor: pointer; border-radius: 8px; }
  .rg-close:hover { background: #F3F8FC; color: ${TP.navy}; }
  .rg-top .rg-badge { margin-left: auto; }
  .rg-card { display: flex; flex-direction: column; gap: 12px; padding: 18px; }
  .rg-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .rg-name { font-weight: 700; font-size: 17px; color: ${TP.navy}; overflow-wrap: anywhere; }
  .rg-sub { font-size: 13px; color: ${TP.secondaryText}; }
  .rg-badge { flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
  .rg-class { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 12px; background: #F3F8FC; font-size: 14px; color: ${TP.navy}; }
  .rg-class b { font-size: 15px; }
  .rg-class small { color: ${TP.secondaryText}; }
  .rg-facts { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; font-size: 14px; }
  .rg-facts dt { color: ${TP.secondaryText}; }
  .rg-facts dd { margin: 0; color: ${TP.navy}; font-weight: 600; overflow-wrap: anywhere; }
  .rg-links-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .rg-links-row a { flex: 1 1 auto; justify-content: center; text-decoration: none; }
  .rg-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: auto; padding-top: 12px; border-top: 1px solid ${TP.border}; }
  .rg-actions button { flex: 1 1 auto; justify-content: center; }
  .rg-actions .rg-icon { flex: 0 0 auto; }
  .rg-danger { color: #A5432C; border-color: #E3C3BA; }
  .rg-icon { padding: 8px; }
  .rg-done { flex: 1 1 auto; display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #1E7A4C; }
  .rg-hint { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 14px; font-size: 14px; color: ${TP.navy}; background: #F5FAFE; }
  .rg-hint > svg { color: ${TP.blue}; flex-shrink: 0; }
  .rg-hint span { flex: 1 1 260px; }
  .rg-link-url { display: inline-flex; align-items: center; gap: 4px; padding: 10px 12px; border-radius: 10px; background: #F3F8FC; border: 1px solid ${TP.border}; font-size: 14px; color: ${TP.blue}; text-decoration: none; overflow-wrap: anywhere; }
  @media (max-width: 640px) {
    .rg-sections { grid-template-columns: 1fr; }
    .rg-section { justify-content: flex-start; }
    .rg-toolbar-right { width: 100%; }
    .rg-select { flex: 1; }
    .rg-select select { flex: 1; min-width: 0; }
  }
`;
