// Notifications → History: what was sent, by hand or by the app itself.
// Filter and search it, tick several to delete them at once, or clear
// everything older than a month; open one to see who got it and to send its
// pending SMS or email again.

import { useState, useEffect, useCallback, useMemo } from "react";
import { RotateCw, Search, Smartphone, Trash2, ChevronDown, ChevronRight, Mail, Inbox } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { TP } from "../App.jsx";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { hasThaana } from "./thaanaKeyboard.js";
import { sendPendingSms, sendPendingEmail } from "./smsSend.js";

// Sent by hand from Send (old and new "who gets it" choices).
const MANUAL = ["everyone", "students", "teachers", "class", "classes", "people", "numbers"];
const FILTERS = [
  { key: "manual", label: "Sent by me" },
  { key: "auto", label: "Automatic" },
  { key: "all", label: "All" },
];
const KIND_LABEL = { welcome: "Welcome", portal_login: "Portal login", payment_reminder: "Payment reminder", hifz_task: "Hifz task" };

// A recipient left "sending" this long was cut off mid-send and can be sent
// again (same 10 minutes as send-sms and /api/email).
const isStaleClaim = (at) => !at || Date.now() - new Date(at).getTime() > 10 * 60 * 1000;
const STATUS_LABEL = { none: "—", pending: "Pending", sending: "Sending…", sent: "Sent", failed: "Failed", no_phone: "No number", no_email: "No email" };
const DAY = 24 * 60 * 60 * 1000;

function fmtWhen(iso) {
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// reloadKey: bumped after something is sent elsewhere on the page.
export function HistoryTab({ showToast, reloadKey }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [kind, setKind] = useState("manual");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [selected, setSelected] = useState({}); // id → true
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*, notification_recipients(id, name, phone, email, email_status, email_error, email_claimed_at, body, user_id, read_at, sms_status, sms_error, sms_claimed_at, student_id, teacher_id)")
      .neq("audience", "admin_alert") // new slip / review alerts sent to admins (they live in the bell)
      .order("created_at", { ascending: false })
      .limit(300);
    setLoadError(!!error);
    setHistory(data || []);
    setSelected({});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, reloadKey]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.filter((n) => {
      const manual = MANUAL.includes(n.audience);
      if (kind === "manual" && !manual) return false;
      if (kind === "auto" && manual) return false;
      if (!q) return true;
      return [n.title, n.body, n.audience_label, ...(n.notification_recipients || []).map((r) => r.name)].some((t) => (t || "").toLowerCase().includes(q));
    });
  }, [history, kind, query]);

  const selectedIds = list.filter((n) => selected[n.id]).map((n) => n.id);
  const allTicked = list.length > 0 && selectedIds.length === list.length;

  const removeIds = async (ids, what) => {
    if (!ids.length) return;
    if (!(await confirmDialog({
      title: `Delete ${what}?`,
      message: "They disappear from History and from each person's app inbox. SMS and emails already sent can't be recalled.",
      confirmLabel: "Delete", danger: true,
    }))) return;
    setDeleting(true);
    let failed = 0;
    // In chunks, so a long list doesn't make one huge request.
    for (let i = 0; i < ids.length; i += 100) {
      const { error } = await supabase.from("notifications").delete().in("id", ids.slice(i, i + 100));
      if (error) failed += ids.slice(i, i + 100).length;
    }
    setDeleting(false);
    showToast(failed ? `Couldn't delete ${failed} of ${ids.length}. Please try again.` : `Deleted ${ids.length}.`);
    load();
  };

  const clearOld = async (days) => {
    const cutoff = Date.now() - days * DAY;
    const ids = list.filter((n) => new Date(n.created_at).getTime() < cutoff).map((n) => n.id);
    if (!ids.length) { showToast(`Nothing here is older than ${days} days.`); return; }
    removeIds(ids, `${ids.length} message${ids.length === 1 ? "" : "s"} older than ${days} days`);
  };

  const retry = async (n, send) => {
    setBusyId(n.id);
    showToast(await send(n.id));
    setBusyId(null);
    load();
  };

  return (
    <div className="tp-card nt-hist">
      <div className="nt-hist-head">
        <div className="nt-chips" role="radiogroup" aria-label="Show">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" role="radio" aria-checked={kind === f.key} className={`nt-chip nt-chip-sm ${kind === f.key ? "nt-chip-on" : ""}`} onClick={() => { setKind(f.key); setSelected({}); }}>{f.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <label className="nt-search" style={{ minWidth: "200px" }}>
            <Search size={15} aria-hidden="true" />
            <input type="search" placeholder="Search message or name" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search history" />
          </label>
          <button type="button" className="lc-btn" disabled={loading} onClick={load} aria-label="Reload"><RotateCw size={14} aria-hidden="true" /></button>
        </div>
      </div>

      {!loading && !loadError && list.length > 0 && (
        <div className="nt-bulk">
          <label className="nt-bulk-all">
            <input type="checkbox" checked={allTicked} onChange={(e) => setSelected(e.target.checked ? Object.fromEntries(list.map((n) => [n.id, true])) : {})} />
            <span>{selectedIds.length ? `${selectedIds.length} selected` : `Select all ${list.length}`}</span>
          </label>
          <span style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {selectedIds.length > 0 && (
              <button type="button" className="tp-btn-outline nt-btn-sm" style={{ color: "#A32020" }} disabled={deleting} onClick={() => removeIds(selectedIds, `${selectedIds.length} message${selectedIds.length === 1 ? "" : "s"}`)}>
                <Trash2 size={15} aria-hidden="true" />{deleting ? "Deleting…" : "Delete selected"}
              </button>
            )}
            <select className="lc-select" style={{ minHeight: "40px" }} value="" disabled={deleting} onChange={(e) => e.target.value && clearOld(Number(e.target.value))} aria-label="Clear old messages">
              <option value="">Clear old…</option>
              <option value="30">Older than 30 days</option>
              <option value="90">Older than 3 months</option>
              <option value="180">Older than 6 months</option>
            </select>
          </span>
        </div>
      )}

      {loading ? (
        <div className="lc-loading-row" style={{ padding: "16px 18px" }}><span className="lc-spinner"></span>Loading…</div>
      ) : loadError ? (
        <div style={{ padding: "16px 18px", color: "#A32020", fontSize: "14px" }}>Couldn't load History. Press reload to try again.</div>
      ) : !list.length ? (
        <div className="nt-empty" style={{ padding: "24px 18px" }}>
          <Inbox size={28} aria-hidden="true" />
          <div><b>{query ? "No matches" : kind === "manual" ? "Nothing sent yet" : "Nothing here"}</b><span>{kind === "manual" && !query ? "Messages you send from Send show here." : ""}</span></div>
        </div>
      ) : list.map((n) => {
        const recs = n.notification_recipients || [];
        const inAppRecs = recs.filter((r) => r.user_id);
        const read = inAppRecs.filter((r) => r.read_at).length;
        const count = (s) => recs.filter((r) => r.sms_status === s).length;
        const pending = count("pending") + count("failed") + recs.filter((r) => r.sms_status === "sending" && isStaleClaim(r.sms_claimed_at)).length;
        const eCount = (s) => recs.filter((r) => r.email_status === s).length;
        const ePending = eCount("pending") + eCount("failed") + recs.filter((r) => r.email_status === "sending" && isStaleClaim(r.email_claimed_at)).length;
        const open = openId === n.id;
        const auto = !MANUAL.includes(n.audience);
        return (
          <div key={n.id} className={`nt-row ${selected[n.id] ? "nt-row-on" : ""}`}>
            <div className="nt-row-line">
              <input type="checkbox" className="nt-row-check" aria-label="Select" checked={!!selected[n.id]} onChange={(e) => setSelected((cur) => ({ ...cur, [n.id]: e.target.checked }))} />
              <button type="button" className="nt-row-btn" aria-expanded={open} onClick={() => setOpenId(open ? null : n.id)}>
                {open ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
                <span style={{ minWidth: 0 }}>
                  <div className={`nt-row-title ${hasThaana(n.title || n.body) ? "nt-text" : ""}`} dir="auto">{n.title || n.body.split("\n")[0].slice(0, 80)}</div>
                  {n.title && <div className={`nt-row-body ${hasThaana(n.body) ? "nt-text" : ""}`} dir="auto">{n.body}</div>}
                  <div className="nt-row-meta">
                    <span>{fmtWhen(n.created_at)}</span>
                    {auto && <span className="nt-badge">{KIND_LABEL[n.audience] || "Automatic"}</span>}
                    <span>{n.audience_label}</span>
                    <span>{recs.length} recipient{recs.length === 1 ? "" : "s"}</span>
                  </div>
                </span>
                <span className="nt-badges">
                  {n.send_in_app && <span className="nt-badge">App · {read}/{inAppRecs.length} read</span>}
                  {n.send_sms && <span className="nt-badge">SMS · {count("sent")} sent</span>}
                  {n.send_sms && count("pending") > 0 && <span className="nt-badge nt-badge-warn">{count("pending")} pending</span>}
                  {n.send_sms && count("failed") > 0 && <span className="nt-badge nt-badge-bad">{count("failed")} failed</span>}
                  {n.send_email && <span className="nt-badge">Email · {eCount("sent")} sent</span>}
                  {n.send_email && eCount("pending") > 0 && <span className="nt-badge nt-badge-warn">{eCount("pending")} email pending</span>}
                  {n.send_email && eCount("failed") > 0 && <span className="nt-badge nt-badge-bad">{eCount("failed")} email failed</span>}
                </span>
              </button>
            </div>
            {open && (
              <div className="nt-detail">
                <div className={`nt-detail-body ${hasThaana(n.title + n.body) ? "nt-text" : ""}`} dir="auto">{n.title ? `${n.title}\n\n${n.body}` : n.body}</div>
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead><tr><th>Name</th><th>Phone</th>{n.send_email && <th>Email</th>}{n.send_in_app && <th>App</th>}{n.send_sms && <th>SMS</th>}{n.send_email && <th>Email status</th>}</tr></thead>
                    <tbody>
                      {recs.map((r) => (
                        <tr key={r.id}>
                          <td>
                            {r.name}
                            {r.body && <div className={hasThaana(r.body) ? "nt-text" : ""} dir="auto" style={{ fontSize: "12px", color: TP.secondaryText, whiteSpace: "pre-wrap", maxWidth: "420px" }}>{r.body}</div>}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>{r.phone || "—"}</td>
                          {n.send_email && <td style={{ overflowWrap: "anywhere" }}>{r.email || "—"}</td>}
                          {n.send_in_app && <td>{!r.user_id ? "No app" : r.read_at ? "Read" : "Unread"}</td>}
                          {n.send_sms && <td title={r.sms_error || undefined}>{STATUS_LABEL[r.sms_status] || r.sms_status}</td>}
                          {n.send_email && <td title={r.email_error || undefined}>{STATUS_LABEL[r.email_status] || r.email_status}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="nt-detail-actions">
                  {n.send_sms && pending > 0 && (
                    <button type="button" className="tp-btn-outline nt-btn-sm" disabled={busyId === n.id} onClick={() => retry(n, sendPendingSms)}>
                      <Smartphone size={15} aria-hidden="true" />Send pending SMS ({pending})
                    </button>
                  )}
                  {n.send_email && ePending > 0 && (
                    <button type="button" className="tp-btn-outline nt-btn-sm" disabled={busyId === n.id} onClick={() => retry(n, sendPendingEmail)}>
                      <Mail size={15} aria-hidden="true" />Send pending email ({ePending})
                    </button>
                  )}
                  <button type="button" className="tp-btn-outline nt-btn-sm" style={{ color: "#A32020" }} disabled={deleting} onClick={() => removeIds([n.id], "this message")}>
                    <Trash2 size={15} aria-hidden="true" />Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
