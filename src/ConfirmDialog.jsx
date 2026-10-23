// In-app confirmation dialog, used instead of window.confirm(), which some
// in-app and embedded browsers block (the click then silently does nothing).
//
//   if (!(await confirmDialog({ title: "Delete exam?", message: "…", confirmLabel: "Delete" }))) return;
//
// <ConfirmHost /> must be rendered once (see main.jsx).

import { useState, useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

let open = null;

export function confirmDialog({ title, message = "", confirmLabel = "Delete", danger = true }) {
  if (!open) return Promise.resolve(window.confirm([title, message].filter(Boolean).join("\n\n")));
  return open({ title, message, confirmLabel, danger });
}

export function ConfirmHost() {
  const [req, setReq] = useState(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    open = (opts) => new Promise((resolve) => setReq({ ...opts, resolve }));
    return () => { open = null; };
  }, []);

  useEffect(() => {
    if (!req) return undefined;
    cancelRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") close(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!req) return null;
  function close(ok) {
    req.resolve(ok);
    setReq(null);
  }
  return (
    <div className="cd-backdrop" onClick={() => close(false)}>
      <style>{`
        .cd-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(20,35,50,0.45); display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; }
        .cd-dialog { width: 100%; max-width: 420px; max-height: calc(100vh - 32px); overflow-y: auto; box-sizing: border-box; background: #FFFFFF; border-radius: 18px; padding: 22px; box-shadow: 0 18px 50px rgba(0,0,0,0.25); font-family: Inter, system-ui, sans-serif; color: #1B2733; }
        .cd-head { display: flex; gap: 12px; align-items: flex-start; }
        .cd-icon { flex: 0 0 auto; width: 40px; height: 40px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; background: #FBEAE6; color: #A5432C; }
        .cd-icon-info { background: #E4F1FC; color: #176FD1; }
        .cd-title { font-size: 17px; font-weight: 700; margin: 8px 0 0; }
        .cd-message { font-size: 14px; line-height: 1.5; color: #5B6B79; margin: 12px 0 0; white-space: pre-line; }
        .cd-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 22px; }
        .cd-btn { min-height: 44px; padding: 0 18px; border-radius: 12px; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; border: 1px solid #C7DDF4; background: #FFFFFF; color: #123B67; }
        .cd-btn-danger { background: #C2452D; border-color: #C2452D; color: #FFFFFF; }
        .cd-btn-primary { background: #176FD1; border-color: #176FD1; color: #FFFFFF; }
        .cd-btn:focus-visible { outline: 2px solid #176FD1; outline-offset: 2px; }
        @media (max-width: 480px) {
          .cd-backdrop { align-items: flex-end; padding: 0; }
          .cd-dialog { max-width: none; border-radius: 18px 18px 0 0; padding: 20px 16px calc(20px + env(safe-area-inset-bottom)); }
          .cd-actions { flex-direction: column-reverse; }
          .cd-btn { width: 100%; }
        }
      `}</style>
      <div className="cd-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cd-title" aria-describedby="cd-message" onClick={(e) => e.stopPropagation()}>
        <div className="cd-head">
          <span className={`cd-icon ${req.danger ? "" : "cd-icon-info"}`} aria-hidden="true"><AlertTriangle size={20} /></span>
          <h2 id="cd-title" className="cd-title">{req.title}</h2>
        </div>
        {req.message && <p id="cd-message" className="cd-message">{req.message}</p>}
        <div className="cd-actions">
          <button ref={cancelRef} type="button" className="cd-btn" onClick={() => close(false)}>Cancel</button>
          <button type="button" className={`cd-btn ${req.danger ? "cd-btn-danger" : "cd-btn-primary"}`} onClick={() => close(true)}>{req.confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
