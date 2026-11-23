// A note for the student, written from the Mushaf: in Listen & mark (full
// screen too) the Note button opens this panel by the side (a sheet from the
// bottom on a phone). Saving adds it to the student's notes (thilawa_notes),
// shown to the student under Teacher's Notes unless kept private. The
// student's earlier notes are listed under it. `draft` / `onDraft` (and
// `shared` / `onShared`, shown to the student or not) keep what was typed while
// the panel is closed, so nothing is lost by closing it (Finish saves it).

import { useState, useEffect, useRef } from "react";
import { X, Check, StickyNote } from "lucide-react";

const CSS = `
  .np { position: fixed; z-index: 45; top: 0; right: 0; bottom: 0; width: min(380px, 100vw); box-sizing: border-box; display: flex; flex-direction: column;
    background: #FFFFFF; color: #123B67; box-shadow: -12px 0 36px rgba(13,40,70,0.22); font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  .np-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px; padding-top: max(14px, env(safe-area-inset-top)); border-bottom: 1px solid #DCEBF8; }
  .np-head h2 { flex: 1; margin: 0; font-size: 17px; }
  .np-head h2 small { display: block; font-weight: 400; font-size: 13px; color: #567493; }
  .np-close { flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px; border: 1px solid #C7DDF4; background: #FFFFFF; color: #567493; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
  .np-body { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
  .np-text { width: 100%; min-height: 130px; box-sizing: border-box; resize: vertical; padding: 10px 12px; border-radius: 12px; border: 1px solid #C7DDF4; background: #F7FAFD; color: #123B67;
    font: 400 15px/1.5 Inter, ui-sans-serif, system-ui, sans-serif; }
  .np-text:focus { outline: 2px solid #176FD1; outline-offset: 1px; background: #FFFFFF; }
  .np-check { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #2A3550; cursor: pointer; }
  .np-check input { width: 18px; height: 18px; accent-color: #176FD1; }
  .np-saved { display: flex; align-items: center; gap: 6px; color: #156B45; font-size: 14px; font-weight: 600; }
  .np-error { color: #9B1C0A; font-size: 14px; }
  .np-list h3 { margin: 6px 0 8px; font-size: 14px; color: #567493; font-weight: 600; }
  .np-list ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .np-list li { background: #FFFBF0; border: 1px solid #F1E0B0; border-radius: 12px; padding: 10px 12px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
  .np-list small { display: block; margin-top: 4px; color: #8A6A22; font-size: 12px; }
  .np-foot { display: flex; align-items: center; gap: 10px; padding: 12px 16px; padding-bottom: max(12px, env(safe-area-inset-bottom)); border-top: 1px solid #DCEBF8; }
  .np-foot span { flex: 1; font-size: 13px; color: #567493; }
  .np-foot .hz-btn { min-height: 44px; }
  @media (max-width: 640px) {
    .np { top: auto; left: 0; width: 100%; max-height: 82vh; border-radius: 18px 18px 0 0; box-shadow: 0 -12px 36px rgba(13,40,70,0.25); }
  }
`;

const fmtWhen = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};

export default function NotePanel({ repo, studentName, draft, onDraft, shared = true, onShared, onSaved, onClose }) {
  const setShared = (v) => onShared?.(v);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [notes, setNotes] = useState(null);
  const textRef = useRef(null);

  const loadNotes = async () => {
    try {
      const rows = await repo.listNotes();
      setNotes([...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
    } catch { setNotes([]); }
  };
  useEffect(() => { loadNotes(); textRef.current?.focus(); }, [repo]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const save = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await repo.addNote({ body: draft, visibleToStudent: shared });
      onDraft("");
      setSaved(true);
      onSaved?.();
      await loadNotes();
    } catch (e) {
      setError(e.message || "The note couldn't be saved. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="np" role="dialog" aria-label={`Note for ${studentName}`}>
      <style>{CSS}</style>
      <div className="np-head">
        <h2>Note for the student<small>{studentName}</small></h2>
        <button type="button" className="np-close" onClick={onClose} aria-label="Close"><X size={20} aria-hidden="true" /></button>
      </div>
      <div className="np-body">
        <textarea id="np-text" ref={textRef} className="np-text" maxLength={2000} value={draft}
          onChange={(e) => { onDraft(e.target.value); setSaved(false); }}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); } }}
          aria-label="Note" />
        <label className="np-check"><input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />Show this note to the student</label>
        {saved && <div className="np-saved" role="status"><Check size={16} aria-hidden="true" />Note saved</div>}
        {error && <div className="np-error" role="alert">{error}</div>}
        {notes && notes.length > 0 && (
          <div className="np-list">
            <h3>Notes</h3>
            <ul>
              {notes.slice(0, 10).map((n) => (
                <li key={n.id}>{n.body}<small>{fmtWhen(n.createdAt)} · {n.visibleToStudent ? "Shown to student" : "Private"}</small></li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="np-foot">
        <span />
        <button type="button" className="hz-btn hz-btn-primary" disabled={busy || !draft.trim()} onClick={save}>
          <StickyNote size={18} aria-hidden="true" />{busy ? "Saving…" : "Save note"}
        </button>
      </div>
    </div>
  );
}
