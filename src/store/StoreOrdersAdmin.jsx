// Admin → Store: orders sent through the store's order pages (/store/<slug>,
// e.g. the Huroof letter card set PDF). Each order has the buyer's name,
// address, Viber number, when they agreed not to share the PDF,
// and the transfer slip, which the admin opens here to check. Accepting only
// records the decision; the admin then sends the PDF on Viber (the Viber
// button opens the chat) and can send the product's message by SMS. Saved in
// store_orders (supabase/migrations/20261129_store_orders.sql).

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, RotateCw, Trash2, Hourglass, Copy, ExternalLink, FileText, ShoppingBag, MessageSquare, Send, Check, Search, Download, Phone, ShieldCheck } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { TP } from "../shared.jsx";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { loadThaanaFont } from "../exams/reportStrings.js";
import { createNotification } from "../notifications/smsSend.js";
import { waCss } from "../workshops/WorkshopsAdmin.jsx";
import { PRODUCTS } from "./products.js";

const MSG_AUDIENCE = "store_order_accepted";
// The SMS is saved with this label in Notifications history; the tag at the
// end links it back to the order, so its card can show it was sent.
const msgTag = (id) => `#${id.slice(0, 8)}`;

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
const LIST = Object.entries(PRODUCTS).map(([slug, p]) => ({ slug, ...p }));
const pageUrl = (slug) => {
  const { hostname, origin } = window.location;
  const base = ["localhost", "127.0.0.1"].includes(hostname) ? origin : "https://aflaahqc.com";
  return `${base}/store/${slug}`;
};
const fmtWhen = (iso) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const viberLink = (n) => `viber://chat?number=${encodeURIComponent(String(n).replace(/[^\d+]/g, "").replace(/^(\d{7})$/, "+960$1"))}`;

export function AdminStoreOrders({ showToast, onCountChange }) {
  const [slug, setSlug] = useState(LIST[0].slug);
  const p = PRODUCTS[slug];
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [all, setAll] = useState(null); // every order of this product
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [sentAt, setSentAt] = useState({}); // order tag → { at, status } of its last message
  const [compose, setCompose] = useState(null); // { row, text }
  const [sending, setSending] = useState(false);
  const openMessage = (r) => setCompose({ row: r, text: p.acceptedMessage });

  const load = useCallback(async () => {
    setError("");
    const { data, error: err } = await supabase.from("store_orders").select("*")
      .eq("product", p.key).order("created_at", { ascending: false }).limit(1000);
    if (err) { setError(err.message); setAll([]); return; }
    setAll(data || []);
    const { data: notes } = await supabase.from("notifications").select("audience_label, created_at, notification_recipients(sms_status)").eq("audience", MSG_AUDIENCE).order("created_at");
    setSentAt(Object.fromEntries((notes || []).map((n) => {
      const st = (n.notification_recipients || []).map((x) => x.sms_status);
      const status = st.length && st.every((x) => x === "sent") ? "sent" : st.some((x) => x === "failed" || x === "no_phone") ? "failed" : "pending";
      return [n.audience_label?.split(" ").pop(), { at: n.created_at, status }];
    })));
  }, [p.key]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadThaanaFont(); }, []);

  const rows = all || [];
  const counted = rows.filter((r) => r.status !== "rejected");
  const summary = {
    orders: counted.length,
    total: counted.reduce((n, r) => n + Number(r.price), 0),
    waiting: rows.filter((r) => r.status === "pending").length,
  };

  const setStatus = async (r, status) => {
    setBusyId(r.id);
    const { error: err } = await supabase.from("store_orders").update({ status, reviewed_at: new Date().toISOString() }).eq("id", r.id);
    setBusyId(null);
    if (err) { showToast(`Couldn’t update: ${err.message}`); return; }
    showToast(status === "accepted" ? "Order accepted. Send the PDF on Viber." : status === "rejected" ? "Order rejected." : "Moved back to waiting.");
    if (status === "accepted" && p.acceptedMessage && !sentAt[msgTag(r.id)]) openMessage({ ...r, status });
    onCountChange?.();
    load();
  };

  const sendMessage = async () => {
    const r = compose?.row;
    const text = compose?.text?.trim();
    if (!r) return;
    if (!text) { showToast("Write the message first."); return; }
    setSending(true);
    const res = await createNotification({
      title: "Store", body: text, audience: MSG_AUDIENCE,
      audienceLabel: `Store order accepted — ${r.buyer_name} ${msgTag(r.id)}`,
      inApp: false, sms: true,
      recipients: [{ name: r.buyer_name, phone: r.viber, body: text }],
    });
    setSending(false);
    if (!res.ok) { showToast(res.message); return; }
    setCompose(null);
    showToast(res.message || "Message sent.");
    load();
  };

  const openSlip = async (r) => {
    const win = window.open("", "_blank"); // opened now so the browser doesn't block it
    const { data, error: err } = await supabase.storage.from(SLIP_BUCKET).createSignedUrl(r.slip_path, 600);
    if (err) { win?.close(); showToast(`Couldn’t open the slip: ${err.message}`); return; }
    if (win) win.location.href = data.signedUrl; else window.location.href = data.signedUrl;
  };

  const remove = async (r) => {
    if (!(await confirmDialog({ title: "Delete this order?", message: `${r.buyer_name}'s order and the payment slip will be removed for good.`, confirmLabel: "Delete" }))) return;
    setBusyId(r.id);
    const { error: err } = await supabase.from("store_orders").delete().eq("id", r.id);
    if (!err) await supabase.storage.from(SLIP_BUCKET).remove([r.slip_path]);
    setBusyId(null);
    if (err) { showToast(`Couldn’t delete: ${err.message}`); return; }
    showToast("Order deleted.");
    onCountChange?.();
    load();
  };

  const term = search.trim().toLowerCase();
  const shown = rows.filter((r) => (filter === "all" || r.status === filter) && (!term ||
    [r.buyer_name, r.address, r.viber].some((x) => String(x || "").toLowerCase().includes(term))));

  const copyNumbers = async () => {
    const nums = [...new Set(rows.filter((r) => r.status === "accepted").map((r) => r.viber))];
    if (!nums.length) { showToast("No accepted orders yet."); return; }
    const text = nums.join("\n");
    try { await navigator.clipboard.writeText(text); showToast(`${nums.length} Viber number${nums.length === 1 ? "" : "s"} copied.`); }
    catch { showToast(text); }
  };

  const downloadList = () => {
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Status", "Buyer", "Address", "Viber", "Price (MVR)", "Agreed not to share", "Ordered", "SMS"];
    const when = (iso) => new Date(iso).toLocaleString("en-GB", { timeZone: "Indian/Maldives" });
    const lines = rows.map((r) => [
      STATUS[r.status].label, r.buyer_name, r.address, r.viber, r.price,
      when(r.agreed_at), when(r.created_at), sentAt[msgTag(r.id)]?.status || "",
    ].map(cell).join(","));
    const blob = new Blob(["﻿" + [head.map(cell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Store orders - ${slug} - ${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copyLink = async () => {
    const url = pageUrl(slug);
    try { await navigator.clipboard.writeText(url); showToast("Order link copied."); }
    catch { showToast(url); }
  };

  return (
    <div className="wa-wrap">
      <style>{waCss()}</style>
      <div className="tp-header">
        <div className="tp-title-group">
          <span className="tp-title-icon" aria-hidden="true"><ShoppingBag size={22} /></span>
          <div>
            <h1 className="tp-title">Store</h1>
            <div className="tp-subtext" style={{ margin: 0 }}>Orders from the website store. Check each payment slip, accept it, then send the PDF on Viber.</div>
          </div>
        </div>
        <div className="tp-actions">
          <button type="button" className="tp-btn-outline" onClick={load}><RotateCw size={16} aria-hidden="true" /> Refresh</button>
        </div>
      </div>

      <div className="tp-card wa-head">
        {LIST.length > 1 && (
          <select className="wa-select" value={slug} onChange={(e) => setSlug(e.target.value)} aria-label="Product">
            {LIST.map((x) => <option key={x.slug} value={x.slug}>{x.name.en}</option>)}
          </select>
        )}
        <div className="wa-title" dir="rtl">{p.name.dv} ({p.format})</div>
        <div className="wa-meta">{p.name.en} · MVR {p.price}</div>
        <a className="wa-url" href={pageUrl(slug)} target="_blank" rel="noreferrer">{pageUrl(slug)}</a>
        <div className="wa-link-actions">
          <button type="button" className="tp-btn-gradient" onClick={copyLink}><Copy size={16} aria-hidden="true" /> Copy link</button>
          <a className="tp-btn-outline" href={pageUrl(slug)} target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" /> Open page</a>
        </div>
        <dl className="wa-stats">
          <div><dt>Orders</dt><dd>{summary.orders}</dd></div>
          <div><dt>Paid</dt><dd>MVR {summary.total.toLocaleString()}</dd></div>
          <div><dt>Waiting</dt><dd>{summary.waiting}</dd></div>
        </dl>
        <p className="wa-note">Totals leave out rejected orders.</p>
        <div className="wa-link-actions">
          <button type="button" className="tp-btn-outline" onClick={copyNumbers}><Phone size={16} aria-hidden="true" /> Copy accepted Viber numbers</button>
          <button type="button" className="tp-btn-outline" onClick={downloadList} disabled={!rows.length}><Download size={16} aria-hidden="true" /> Download list (Excel)</button>
        </div>
      </div>

      <div className="tp-segment" role="group" aria-label="Order status" style={{ marginBottom: 0, alignSelf: "flex-start" }}>
        {FILTERS.map((x) => (
          <button key={x.key} type="button" aria-pressed={filter === x.key} className={`tp-segment-btn ${filter === x.key ? "tp-segment-btn-active" : ""}`} onClick={() => setFilter(x.key)}>{x.label} ({x.key === "all" ? rows.length : rows.filter((r) => r.status === x.key).length})</button>
        ))}
      </div>
      <label className="wa-search">
        <Search size={17} aria-hidden="true" />
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, Viber number or address" dir="auto" />
      </label>

      {error && <div className="tp-card wa-error" role="alert">Couldn’t load orders: {error}</div>}
      {all === null && <div className="tp-card">Loading…</div>}
      {all && shown.length === 0 && !error && (
        <div className="tp-card wa-empty">{term ? "No orders match the search." : filter === "pending" ? "No orders waiting." : "No orders here."}</div>
      )}

      <div className="wa-grid">
        {shown.map((r) => {
          const st = STATUS[r.status];
          const busy = busyId === r.id;
          const sent = sentAt[msgTag(r.id)];
          return (
            <article key={r.id} className="tp-card wa-card">
              <div className="wa-top">
                <div className="wa-count"><ShoppingBag size={16} aria-hidden="true" /> <b>MVR {Number(r.price).toLocaleString()}</b></div>
                <span className="wa-badge" style={{ color: st.color, background: st.bg }}>{r.status === "pending" && <Hourglass size={13} aria-hidden="true" />}{st.label}</span>
              </div>
              <ol className="wa-students">
                <li>
                  <div className="so-who">Buyer</div>
                  <div className="wa-name" dir="auto">{r.buyer_name}</div>
                  <div className="wa-facts">
                    <span dir="auto">{r.address}</span>
                    <a href={viberLink(r.viber)}>Viber {r.viber}</a>
                  </div>
                </li>
                {r.student_name && (
                  <li>
                    <div className="so-who">Student</div>
                    <div className="wa-name" dir="auto">{r.student_name}</div>
                    <div className="wa-facts"><span>Age {r.student_age}</span></div>
                  </li>
                )}
              </ol>
              <div className="so-agreed"><ShieldCheck size={15} aria-hidden="true" /> Agreed not to share the PDF · {fmtWhen(r.agreed_at)}</div>
              <div className="wa-sent">Ordered {fmtWhen(r.created_at)}{r.reviewed_at ? ` · checked ${fmtWhen(r.reviewed_at)}` : ""}</div>
              {r.status === "accepted" && (
                <a className="tp-btn-outline wa-msg-btn" href={viberLink(r.viber)}><Send size={16} aria-hidden="true" /> Send the PDF on Viber</a>
              )}
              {r.status === "accepted" && p.acceptedMessage && (sent ? (
                <div className={`wa-msg-done ${sent.status}`}>
                  {sent.status === "sent" ? <Check size={16} aria-hidden="true" /> : <MessageSquare size={16} aria-hidden="true" />}
                  {sent.status === "sent" ? "SMS sent" : sent.status === "failed" ? "SMS failed" : "SMS waiting to send"} · {fmtWhen(sent.at)}
                  <button type="button" className="wa-link-btn" onClick={() => openMessage(r)}>{sent.status === "sent" ? "Send again" : "Try again"}</button>
                </div>
              ) : (
                <button type="button" className="tp-btn-gradient wa-msg-btn" onClick={() => openMessage(r)}><MessageSquare size={17} aria-hidden="true" /> Send SMS</button>
              ))}
              <div className="wa-actions">
                <button type="button" className="tp-btn-outline" disabled={busy} onClick={() => openSlip(r)}><FileText size={17} aria-hidden="true" /> View slip</button>
                {r.status !== "accepted" && <button type="button" className="tp-btn-gradient" disabled={busy} onClick={() => setStatus(r, "accepted")}><CheckCircle2 size={17} aria-hidden="true" /> Accept</button>}
                {r.status !== "rejected" && <button type="button" className="tp-btn-outline wa-reject" disabled={busy} onClick={() => setStatus(r, "rejected")}><XCircle size={17} aria-hidden="true" /> Reject</button>}
                {r.status !== "pending" && <button type="button" className="tp-btn-outline" disabled={busy} onClick={() => setStatus(r, "pending")}><Hourglass size={17} aria-hidden="true" /> Waiting</button>}
                <button type="button" className="tp-btn-outline wa-delete" disabled={busy} onClick={() => remove(r)} aria-label="Delete order"><Trash2 size={17} aria-hidden="true" /></button>
              </div>
            </article>
          );
        })}
      </div>

      {compose && (
        <div className="wa-overlay" onClick={() => !sending && setCompose(null)}>
          <div className="wa-dialog" role="dialog" aria-modal="true" aria-labelledby="so-dialog-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="so-dialog-title"><MessageSquare size={20} aria-hidden="true" /> Send SMS</h2>
            <p className="wa-dialog-to">SMS to <b>{compose.row.viber}</b> · <span dir="auto">{compose.row.buyer_name}</span></p>
            <textarea className="wa-msg-text" dir="rtl" lang="dv" rows={10} value={compose.text} onChange={(e) => setCompose({ ...compose, text: e.target.value })} autoFocus />
            <div className="wa-msg-actions">
              <button type="button" className="tp-btn-outline" disabled={sending} onClick={() => setCompose(null)}>Not now</button>
              <button type="button" className="tp-btn-gradient" disabled={sending} onClick={sendMessage}><Send size={16} aria-hidden="true" /> {sending ? "Sending…" : "Send SMS"}</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .so-who { font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: ${TP.secondaryText}; }
        .so-agreed { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #1E7A4C; }
        a.wa-msg-btn { display: inline-flex; align-items: center; gap: 6px; text-decoration: none; }
      `}</style>
    </div>
  );
}
