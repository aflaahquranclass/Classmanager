// In-app inbox for teachers and students: a bell with an unread count that
// opens the notifications the admin sent them (Admin → Notifications).
// Row-level security only returns the signed-in user's own rows.

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, X } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { TP } from "../App.jsx";
import { THAANA_FONT, loadThaanaFont } from "../exams/reportStrings.js";
import { hasThaana } from "./thaanaKeyboard.js";

const REFRESH_MS = 2 * 60 * 1000;

function fmtWhen(iso) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// className styles the trigger button; `onDark` gives it the translucent
// look used on the portal's blue gradient (sidebar / mobile bar).
export function NotificationBell({ className = "", onDark = false }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null); // panel's { top, left }, under the bell
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("notification_recipients")
      .select("id, body, read_at, created_at, notifications!inner(title, body, send_in_app)")
      .eq("user_id", user.id)
      .eq("notifications.send_in_app", true)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems(data || []);
  }, []);

  useEffect(() => {
    loadThaanaFont();
    load();
    const t = window.setInterval(load, REFRESH_MS);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") { setOpen(false); buttonRef.current?.focus(); } };
    const onClick = (e) => {
      if (!panelRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onClick); };
  }, [open]);

  const unread = items.filter((i) => !i.read_at).length;

  const toggle = async () => {
    const next = !open;
    if (next) {
      const r = buttonRef.current.getBoundingClientRect();
      const width = Math.min(380, window.innerWidth - 32);
      setPos({ top: r.bottom + 8, left: Math.max(16, Math.min(r.left, window.innerWidth - width - 16)) });
    }
    setOpen(next);
    if (next && unread) {
      // Still highlighted as new while open; marked read in the database now.
      const ids = items.filter((i) => !i.read_at).map((i) => i.id);
      await supabase.rpc("mark_notifications_read", { p_ids: ids });
      setItems((cur) => cur.map((i) => (ids.includes(i.id) ? { ...i, read_at: new Date().toISOString(), wasUnread: true } : i)));
    }
  };

  return (
    <>
      <style>{`
        .nb-trigger { position: relative; }
        .nb-on-dark { flex: none; width: 38px; height: 38px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.32); background: rgba(255,255,255,0.14); color: #FFFFFF; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
        .nb-on-dark:hover { background: rgba(255,255,255,0.24); }
        .nb-on-dark:focus-visible { outline: 2px solid #FFFFFF; outline-offset: 2px; }
        .nb-trigger:not(.nb-on-dark):focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
        .nb-count { position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; padding: 0 5px; box-sizing: border-box; border-radius: 999px; background: #E5484D; color: #FFFFFF; font-size: 11px; font-weight: 700; line-height: 18px; text-align: center; font-variant-numeric: tabular-nums; }
        .nb-panel { position: fixed; z-index: 70; width: 380px; max-width: calc(100vw - 32px); max-height: min(70vh, 560px); display: flex; flex-direction: column; background: #FFFFFF; border: 1px solid ${TP.border}; border-radius: 18px; box-shadow: 0 18px 50px rgba(18,59,103,0.22); overflow: hidden; text-align: left; }
        .nb-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #E3EEF8; font-weight: 700; color: ${TP.navy}; font-size: 15px; }
        .nb-close { border: none; background: none; color: ${TP.secondaryText}; cursor: pointer; padding: 6px; display: flex; border-radius: 8px; }
        .nb-close:focus-visible { outline: 2px solid ${TP.blue}; }
        .nb-list { overflow-y: auto; overscroll-behavior: contain; }
        .nb-item { padding: 12px 16px; border-top: 1px solid #F0F5FA; }
        .nb-item:first-child { border-top: none; }
        .nb-item-new { background: #F3F9FD; }
        .nb-dv { font-family: ${THAANA_FONT}; line-height: 1.8; }
        .nb-item-title { font-weight: 600; font-size: 14px; color: #1B2733; display: flex; align-items: center; gap: 6px; }
        .nb-dot { width: 8px; height: 8px; border-radius: 50%; background: ${TP.blue}; flex: none; }
        .nb-item-body { font-size: 14px; color: #33475B; white-space: pre-wrap; margin-top: 2px; line-height: 1.45; overflow-wrap: anywhere; }
        .nb-item-when { font-size: 12px; color: ${TP.secondaryText}; margin-top: 4px; }
        .nb-empty { padding: 28px 16px; text-align: center; color: ${TP.secondaryText}; font-size: 14px; }
      `}</style>
      <button
        ref={buttonRef}
        type="button"
        className={`nb-trigger no-print ${onDark ? "nb-on-dark" : ""} ${className}`}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={toggle}
      >
        <Bell size={18} aria-hidden="true" />
        {unread > 0 && <span className="nb-count" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div ref={panelRef} className="nb-panel" role="dialog" aria-label="Notifications" style={pos || undefined}>
          <div className="nb-head">
            Notifications
            <button type="button" className="nb-close" aria-label="Close notifications" onClick={() => setOpen(false)}><X size={18} aria-hidden="true" /></button>
          </div>
          <div className="nb-list">
            {!items.length ? <div className="nb-empty">No notifications yet.</div> : items.map((i) => {
              const isNew = !i.read_at || i.wasUnread;
              const n = { ...i.notifications, body: i.body || i.notifications.body };
              return (
                <div key={i.id} className={`nb-item ${isNew ? "nb-item-new" : ""}`}>
                  {n.title && <div className={`nb-item-title ${hasThaana(n.title) ? "nb-dv" : ""}`} dir="auto">{isNew && <span className="nb-dot" aria-label="New" />}{n.title}</div>}
                  <div className={`nb-item-body ${hasThaana(n.body) ? "nb-dv" : ""}`} dir="auto">{!n.title && isNew && <span className="nb-dot" aria-label="New" style={{ display: "inline-block", marginRight: "6px" }} />}{n.body}</div>
                  <div className="nb-item-when">{fmtWhen(i.created_at)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
