// Admin → Registrations → Info updates: the student information update form
// (/update?k=…) — its private link, and the responses. Each response shows
// the students it may belong to (same Viber number, same Student ID, similar
// name), and the admin saves its ID card number, atoll and island and email
// onto the right one. An ID card number can only be on one student, so the same person
// isn't kept twice. Database: supabase/migrations/20261031_student_info_form.sql.

import { useState, useEffect, useCallback, useMemo } from "react";
import { Copy, Lock, LockOpen, RotateCw, Link2, ExternalLink, ChevronRight, X, CheckCircle2, Search, Ban, MessageCircle } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { confirmDialog } from "../ConfirmDialog.jsx";

const FILTERS = [
  { key: "pending", label: "Waiting" },
  { key: "saved", label: "Saved" },
  { key: "dismissed", label: "Dismissed" },
  { key: "all", label: "All" },
];
const STATUS = {
  pending: { label: "Waiting", color: "#9C6B12", bg: "#FDF3DC" },
  saved: { label: "Saved", color: "#1E7A4C", bg: "#E3F5EA" },
  dismissed: { label: "Dismissed", color: "#5B6B7B", bg: "#EEF2F6" },
};
const formUrl = (key) => {
  const { hostname, origin } = window.location;
  const base = ["localhost", "127.0.0.1"].includes(hostname) ? origin : "https://aflaahqc.com";
  return `${base}/update?k=${key}`;
};
const newKey = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);
const fmtWhen = (iso) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

// Last 7 digits, so "+960 777-1234" and "7771234" are the same number.
const phoneKey = (p) => (p || "").replace(/\D/g, "").slice(-7);
const nicKey = (n) => (n || "").trim().toUpperCase();
const nameWords = (n) => (n || "").toLowerCase().replace(/[^a-zހ-޿\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3);

// Students this response may be about, best first, with why. One shared
// name word isn't enough (many students share a first name like Mariyam or
// Mohamed) unless the response gives just one name, and that name is rare.
export function matchStudents(resp, students) {
  const words = nameWords(resp.name);
  const uses = {};
  students.forEach((s) => new Set(nameWords(s.name)).forEach((w) => { uses[w] = (uses[w] || 0) + 1; }));
  const phone = phoneKey(resp.viber);
  const code = (resp.student_code || "").trim().toUpperCase();
  return students.map((s) => {
    const reasons = [];
    let score = 0;
    if (code && (s.studentCode || "").toUpperCase() === code) { score += 5; reasons.push("Same Student ID"); }
    if (phone.length === 7 && phoneKey(s.phone) === phone) { score += 3; reasons.push("Same Viber number"); }
    const theirs = nameWords(s.name);
    const shared = words.filter((w) => theirs.includes(w)).length;
    if (shared && shared === words.length && shared === theirs.length) { score += 3; reasons.push("Same name"); }
    else if (shared >= 2 || (shared === 1 && words.length === 1 && (uses[words[0]] || 0) <= 2)) { score += shared; reasons.push("Similar name"); }
    if (nicKey(s.nic) && nicKey(s.nic) === nicKey(resp.nic)) { score += 6; reasons.push("Already has this ID card"); }
    return { s, score, reasons };
  }).filter((m) => m.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
}

export function InfoUpdates({ showToast, students, onStudentUpdated, onCountChange }) {
  const [settings, setSettings] = useState(null);
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    supabase.from("info_form_settings").select("form_key, is_open").eq("id", 1).maybeSingle().then(({ data }) => setSettings(data || false));
  }, []);

  const load = useCallback(async () => {
    setError("");
    const { data, error: err } = await supabase.from("student_info_updates").select("*").order("created_at", { ascending: false }).limit(1000);
    if (err) { setError(err.message); setRows([]); return; }
    setRows(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveSettings = async (patch, message) => {
    const { data, error: err } = await supabase.from("info_form_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1).select("form_key, is_open").single();
    if (err) { showToast(`Couldn’t update the form: ${err.message}`); return; }
    setSettings(data);
    showToast(message);
  };
  const copy = async () => {
    const url = formUrl(settings.form_key);
    try { await navigator.clipboard.writeText(url); showToast("Info update form link copied."); } catch { showToast(url); }
  };
  const resetLink = async () => {
    if (!(await confirmDialog({ title: "Make a new form link?", message: "The old link will stop working. Share the new link in your class groups.", confirmLabel: "Make new link", danger: false }))) return;
    saveSettings({ form_key: newKey() }, "New link made. The old link no longer works.");
  };

  const matchCount = useMemo(() => Object.fromEntries((rows || []).map((r) => [r.id, matchStudents(r, students)])), [rows, students]);
  const countOf = (st) => (rows || []).filter((r) => st === "all" || r.status === st).length;
  const shown = useMemo(() => {
    const list = (rows || []).filter((r) => filter === "all" || r.status === filter);
    return filter === "pending" ? [...list].reverse() : list;
  }, [rows, filter]);
  const opened = (rows || []).find((r) => r.id === openId);

  useEffect(() => {
    if (!openId) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpenId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  const done = () => { setOpenId(null); onCountChange?.(); load(); };

  return (
    <>
      <div className="tp-card rg-card">
        <div className="rg-top">
          <div style={{ minWidth: 0 }}>
            <div className="rg-name"><Link2 size={17} aria-hidden="true" style={{ verticalAlign: "-3px", marginRight: "6px" }} />Student info update form</div>
            <div className="rg-sub">For current students to send their ID card number, atoll and island, Viber number and email. Only people with this link can open it.</div>
          </div>
          {settings && <span className="rg-badge" style={settings.is_open ? { color: "#1E7A4C", background: "#E3F5EA" } : { color: "#A5432C", background: "#FBE9E4" }}>{settings.is_open ? "Open" : "Closed"}</span>}
        </div>
        {settings === null && <div className="rg-sub">Loading…</div>}
        {settings === false && <div className="rg-error">Couldn’t load the form link.</div>}
        {settings && (
          <>
            <a className="rg-link-url" href={formUrl(settings.form_key)} target="_blank" rel="noreferrer">{formUrl(settings.form_key)} <ExternalLink size={13} aria-hidden="true" /></a>
            <div className="rg-actions">
              <button type="button" className="tp-btn-gradient" onClick={copy}><Copy size={16} aria-hidden="true" /> Copy link</button>
              <button type="button" className={`tp-btn-outline ${settings.is_open ? "rg-danger" : ""}`} onClick={() => saveSettings({ is_open: !settings.is_open }, settings.is_open ? "Form closed." : "Form opened.")}>
                {settings.is_open ? <><Lock size={16} aria-hidden="true" /> Close form</> : <><LockOpen size={16} aria-hidden="true" /> Open form</>}
              </button>
              <button type="button" className="tp-btn-outline" onClick={resetLink}><RotateCw size={16} aria-hidden="true" /> New link</button>
            </div>
          </>
        )}
      </div>

      <div className="tp-card rg-toolbar">
        <div className="tp-segment" role="group" aria-label="Status" style={{ marginBottom: 0 }}>
          {FILTERS.map((x) => (
            <button key={x.key} type="button" aria-pressed={filter === x.key} className={`tp-segment-btn ${filter === x.key ? "tp-segment-btn-active" : ""}`} onClick={() => setFilter(x.key)}>
              {x.label} {rows && <span className="rg-tab-count">{countOf(x.key)}</span>}
            </button>
          ))}
        </div>
        <button type="button" className="tp-btn-outline rg-icon" onClick={load} aria-label="Refresh" title="Refresh"><RotateCw size={16} aria-hidden="true" /></button>
      </div>

      {error && <div className="tp-card rg-error" role="alert">Couldn’t load the responses: {error}</div>}
      {rows === null && <div className="tp-card">Loading…</div>}
      {rows && shown.length === 0 && !error && <div className="tp-card rg-empty">{filter === "pending" ? "No responses waiting." : "No responses here."}</div>}

      {shown.length > 0 && (
        <div className="tp-card rg-list">
          {shown.map((r) => {
            const st = STATUS[r.status];
            const matches = matchCount[r.id] || [];
            const linked = r.student_id && students.find((s) => s.id === r.student_id);
            return (
              <button key={r.id} type="button" className="rg-row" onClick={() => setOpenId(r.id)}>
                <span className="rg-row-main">
                  <b dir="auto">{r.name}</b>
                  <span>
                    {r.nic} · {r.viber}
                    {r.status === "pending" && (matches.length ? ` · ${matches.length} possible match${matches.length === 1 ? "" : "es"}` : " · no match found")}
                    {linked && ` · saved on ${linked.studentCode || ""} ${linked.name}`}
                  </span>
                </span>
                <span className="rg-badge" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                <ChevronRight size={18} aria-hidden="true" className="rg-row-go" />
              </button>
            );
          })}
        </div>
      )}

      {opened && (
        <ResponseBox resp={opened} students={students} showToast={showToast} onClose={() => setOpenId(null)} onStudentUpdated={onStudentUpdated} onDone={done} />
      )}
    </>
  );
}

function ResponseBox({ resp, students, showToast, onClose, onStudentUpdated, onDone }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [alsoPhone, setAlsoPhone] = useState(true);
  const matches = useMemo(() => matchStudents(resp, students), [resp, students]);
  const nicOwner = students.find((s) => nicKey(s.nic) && nicKey(s.nic) === nicKey(resp.nic));
  const linked = resp.student_id && students.find((s) => s.id === resp.student_id);
  // Find any student by name, Student ID or phone when the suggestions miss.
  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return students.filter((s) => s.name.toLowerCase().includes(q) || (s.studentCode || "").toLowerCase().includes(q) || (s.phone || "").includes(q)).slice(0, 8)
      .map((s) => ({ s, reasons: [] }));
  }, [query, students]);

  const save = async (s) => {
    const changes = [`ID card ${resp.nic}`, resp.atoll_island && `atoll and island ${resp.atoll_island}`, resp.email && `email ${resp.email}`, alsoPhone && phoneKey(resp.viber) !== phoneKey(s.phone) && `Viber ${resp.viber}`].filter(Boolean);
    if (!(await confirmDialog({
      title: `Save on ${s.studentCode ? `${s.studentCode} ` : ""}${s.name}?`,
      message: `This student’s ${changes.join(", ")} will be saved.${s.nic && nicKey(s.nic) !== nicKey(resp.nic) ? ` Their current ID card ${s.nic} will be replaced.` : ""}`,
      confirmLabel: "Save", danger: false,
    }))) return;
    setBusy(true);
    const patch = { nic: nicKey(resp.nic), atoll_island: resp.atoll_island };
    if (resp.email) patch.email = resp.email;
    if (alsoPhone && phoneKey(resp.viber) !== phoneKey(s.phone)) patch.phone = resp.viber;
    const { data, error } = await supabase.from("students").update(patch).eq("id", s.id).select().single();
    if (error) {
      setBusy(false);
      const taken = students.find((x) => x.id !== s.id && nicKey(x.nic) === nicKey(resp.nic));
      showToast(error.code === "23505" ? `ID card ${resp.nic} is already on ${taken ? `${taken.studentCode} ${taken.name}` : "another student"}.` : `Couldn’t save: ${error.message}`);
      return;
    }
    await supabase.from("student_info_updates").update({ status: "saved", student_id: s.id, reviewed_at: new Date().toISOString() }).eq("id", resp.id);
    setBusy(false);
    onStudentUpdated?.(data);
    showToast(`Saved on ${data.student_code || ""} ${data.name}.`);
    onDone();
  };

  const setStatus = async (status) => {
    setBusy(true);
    const { error } = await supabase.from("student_info_updates").update({ status, reviewed_at: new Date().toISOString() }).eq("id", resp.id);
    setBusy(false);
    if (error) { showToast(`Couldn’t update: ${error.message}`); return; }
    showToast(status === "dismissed" ? "Response dismissed." : "Moved back to waiting.");
    onDone();
  };

  const candidate = ({ s, reasons }) => (
    <div key={s.id} className="rg-cand">
      <div className="rg-cand-main">
        <b>{s.studentCode && <span className="rg-code">{s.studentCode}</span>}<span dir="auto">{s.name}</span></b>
        <span>{[s.className, s.phone].filter(Boolean).join(" · ")}</span>
        <span>{s.nic ? `ID card ${s.nic}` : "No ID card yet"}{s.atollIsland ? ` · ${s.atollIsland}` : ""}{s.email ? ` · ${s.email}` : ""}</span>
        {reasons.length > 0 && <span className="rg-reasons">{reasons.map((x) => <i key={x}>{x}</i>)}</span>}
      </div>
      {resp.status === "pending" && (
        <button type="button" className="tp-btn-gradient" disabled={busy || (nicOwner && nicOwner.id !== s.id)} title={nicOwner && nicOwner.id !== s.id ? `This ID card is already on ${nicOwner.name}` : undefined} onClick={() => save(s)}>
          <CheckCircle2 size={16} aria-hidden="true" /> Save here
        </button>
      )}
    </div>
  );

  return (
    <div className="rg-modal" role="dialog" aria-modal="true" aria-label={`${resp.name}’s details`} onClick={onClose}>
      <article className="tp-card rg-card rg-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="rg-top">
          <div style={{ minWidth: 0 }}>
            <div className="rg-name" dir="auto">{resp.name}</div>
            <div className="rg-sub">Sent {fmtWhen(resp.created_at)}</div>
          </div>
          <span className="rg-badge" style={{ color: STATUS[resp.status].color, background: STATUS[resp.status].bg }}>{STATUS[resp.status].label}</span>
          <button type="button" className="rg-close" onClick={onClose} aria-label="Close"><X size={20} aria-hidden="true" /></button>
        </div>

        <dl className="rg-facts">
          <dt>ID card</dt><dd>{resp.nic}</dd>
          <dt>Atoll &amp; island</dt><dd dir="auto">{resp.atoll_island}</dd>
          <dt>Viber</dt><dd><a href={`viber://chat?number=${encodeURIComponent(resp.viber.replace(/[^\d+]/g, ""))}`}><MessageCircle size={14} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> {resp.viber}</a></dd>
          {resp.email && <><dt>Email</dt><dd>{resp.email}</dd></>}
          {resp.student_code && <><dt>Student ID given</dt><dd>{resp.student_code}</dd></>}
          {resp.class_name && <><dt>Class given</dt><dd dir="auto">{resp.class_name}</dd></>}
        </dl>

        {nicOwner && resp.status === "pending" && (
          <div className="rg-problem">This ID card number is already on <b>{nicOwner.studentCode} {nicOwner.name}</b>. It can only be saved on that student.</div>
        )}

        {resp.status === "saved" ? (
          <span className="rg-done"><CheckCircle2 size={16} aria-hidden="true" /> Saved on {linked ? `${linked.studentCode || ""} ${linked.name}` : "a student"}{resp.reviewed_at ? ` on ${fmtWhen(resp.reviewed_at)}` : ""}</span>
        ) : (
          <>
            <div>
              <div className="rg-label">{matches.length ? "Possible matches" : "No student with this name or Viber number"}</div>
              <div className="rg-cands">{matches.map(candidate)}</div>
            </div>
            {resp.status === "pending" && (
              <>
                <label className="rg-search">
                  <Search size={15} aria-hidden="true" />
                  <input className="lc-input" placeholder="Find another student by name, Student ID or phone" value={query} onChange={(e) => setQuery(e.target.value)} />
                </label>
                {found.length > 0 && <div className="rg-cands">{found.map(candidate)}</div>}
                <label className="rg-check"><input type="checkbox" checked={alsoPhone} onChange={(e) => setAlsoPhone(e.target.checked)} /> Also save this Viber number as the student’s phone if it’s different</label>
              </>
            )}
          </>
        )}

        <div className="rg-actions">
          {resp.status === "pending"
            ? <button type="button" className="tp-btn-outline rg-danger" disabled={busy} onClick={() => setStatus("dismissed")}><Ban size={16} aria-hidden="true" /> Dismiss</button>
            : resp.status === "dismissed" && <button type="button" className="tp-btn-outline" disabled={busy} onClick={() => setStatus("pending")}><RotateCw size={16} aria-hidden="true" /> Move back to waiting</button>}
        </div>
      </article>
    </div>
  );
}

// Waiting-response count, added to the Registrations badge.
export function usePendingInfoCount(enabled) {
  const [count, setCount] = useState(0);
  const load = useCallback(async () => {
    if (!enabled) return;
    const { count: n, error } = await supabase.from("student_info_updates").select("id", { count: "exact", head: true }).eq("status", "pending");
    if (!error) setCount(n || 0);
  }, [enabled]);
  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);
  return [count, load];
}

export const infoCss = (TP) => `
  .rg-cands { display: flex; flex-direction: column; gap: 8px; }
  .rg-cand { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 12px; border: 1px solid ${TP.border}; border-radius: 12px; background: #FFFFFF; }
  .rg-cand-main { flex: 1 1 220px; display: flex; flex-direction: column; gap: 2px; min-width: 0; font-size: 12px; color: ${TP.secondaryText}; }
  .rg-cand-main b { display: flex; align-items: center; gap: 8px; font-size: 14px; color: ${TP.navy}; }
  .rg-reasons { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
  .rg-reasons i { font-style: normal; font-weight: 600; font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #E3F5EA; color: #1E7A4C; }
  .rg-search { display: flex; align-items: center; gap: 8px; color: ${TP.secondaryText}; }
  .rg-search input { flex: 1; }
`;
