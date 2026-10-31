// Teacher: listen to a Thilawa reading or lesson, full screen. The pages open
// in the Mushaf; tapping a word the student gets wrong marks it, tapping a
// marked word selects it (Corrected / Remove). Finish saves that the teacher
// listened, and the student is notified with how many words to correct.

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, CheckCircle2, Check, X } from "lucide-react";
import MushafPage, { useMushafSwipe } from "./MushafPage.jsx";
import { describePages, pageLabel } from "./engine.js";

const CSS = `
  .lm { position: fixed; inset: 0; z-index: 1000; display: flex; flex-direction: column; background: #F4F8FC; color: #123B67; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  .lm-top { flex-shrink: 0; display: flex; align-items: center; gap: 12px; padding: 10px 16px; padding-top: max(10px, env(safe-area-inset-top)); color: #FFFFFF;
    background: linear-gradient(90deg, #0D4F85 0%, #176FD1 55%, #0A94B1 100%); box-shadow: 0 4px 16px rgba(13,40,70,0.18); }
  .lm-top .hz-btn { background: rgba(255,255,255,0.16); color: #FFFFFF; border: 1px solid rgba(255,255,255,0.4); min-height: 40px; }
  .lm-top .hz-btn:hover { background: rgba(255,255,255,0.26); }
  .lm-title { flex: 1; min-width: 0; font-weight: 700; font-size: 16px; line-height: 1.25; }
  .lm-title small { display: block; font-weight: 400; font-size: 13px; opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lm-body { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .lm-inner { max-width: 860px; margin: 0 auto; padding: 16px 16px 24px; display: flex; flex-direction: column; gap: 12px; }
  .lm-nav { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .lm-nav-title { flex: 1; min-width: 0; text-align: center; font-weight: 700; font-size: 15px; }
  .lm-nav-title small { display: block; font-weight: 400; color: #567493; font-size: 13px; }
  .lm-foot { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; padding-bottom: max(12px, env(safe-area-inset-bottom));
    background: #FFFFFF; border-top: 1px solid #DCEBF8; box-shadow: 0 -6px 20px rgba(18,59,103,0.08); }
  .lm-foot .hz-btn { min-height: 48px; padding: 0 22px; font-size: 15px; }
  .lm-bar { position: sticky; bottom: 8px; z-index: 5; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #123B67; color: #FFFFFF; border-radius: 14px; padding: 10px 12px; box-shadow: 0 12px 30px rgba(13,40,70,0.35); }
  .lm-bar .hz-ar { color: #FFD9CF; font-size: 26px; }
  .lm-bar span { flex: 1; min-width: 120px; font-size: 13px; }
  .lm-bar .hz-btn { min-height: 40px; }
  .lm-bar .hz-btn-outline { background: transparent; color: #FFFFFF; border-color: rgba(255,255,255,0.5); }
  @media (max-width: 640px) {
    .lm-inner { padding: 10px 6px 20px; }
    .lm-top .hz-btn span, .lm-nav .hz-btn span { display: none; }
    .lm .mp-page { padding: 4% 2.5% 2%; border-radius: 10px; }
  }
`;

export default function ListenScreen({ student, assignment: a, mistakes, repo, refresh, onClose }) {
  const [page, setPage] = useState(a.fromPage);
  const [selectedKey, setSelectedKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lesson = a.kind === "lesson";
  const marks = mistakes.filter((m) => m.assignmentId === a.id);
  const open = marks.filter((m) => !m.correctedAt);
  const selected = open.find((m) => `${m.verseKey}:${m.position}` === selectedKey) || null;

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try { await fn(); await refresh(); return true; } catch (e) { setError(e.message); return false; } finally { setBusy(false); }
  };
  // Like a printed Mushaf: the next page is to the left.
  const next = () => setPage((p) => Math.min(a.toPage, p + 1));
  const prev = () => setPage((p) => Math.max(a.fromPage, p - 1));
  const swipe = useMushafSwipe(next, prev);

  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = before; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const tapWord = (w) => {
    setSelectedKey(w.key);
    if (busy || open.some((m) => m.verseKey === w.verseKey && m.position === w.position)) return; // a marked word is only selected
    run(() => repo.addMistake({ assignmentId: a.id, page: w.page, line: w.line, verseKey: w.verseKey, position: w.position, wordText: w.text }));
  };
  const finish = () => run(() => repo.setAssignmentChecked(a.id, true)).then((ok) => ok && onClose());
  const onPage = open.filter((m) => m.page === page).length;

  return createPortal(
    <div className="lm" role="dialog" aria-modal="true" aria-label={`Listen and mark · ${student.name}`}>
      <style>{CSS}</style>
      <div className="lm-top">
        <button className="hz-btn" onClick={onClose}><ChevronLeft size={18} aria-hidden="true" /><span>Back</span></button>
        <div className="lm-title">{lesson ? "Today's lesson" : "Listen & mark"} · {student.name}
          <small>{describePages(a.fromPage, a.toPage)}</small>
        </div>
      </div>

      <div className="lm-body">
        <div className="lm-inner">
          <div className="hz-legend">
            <span>Tap a word the student gets wrong to mark it. Tap a marked word for Corrected or Remove.</span>
            <span><i style={{ background: "#FBD5CC", boxShadow: "0 0 0 1px #F2A595" }} />To correct</span>
            <span><i style={{ background: "#DDF5E9" }} />Corrected</span>
          </div>
          {a.instructions && <div className="hz-task-notes">{a.instructions}</div>}
          {error && <div className="hz-error" role="alert">{error}</div>}
          {a.toPage > a.fromPage ? (
            <div className="lm-nav">
              <button className="hz-btn hz-btn-outline" disabled={page >= a.toPage} onClick={next} aria-label="Next page"><ChevronLeft size={18} aria-hidden="true" /><span>Next</span></button>
              <div className="lm-nav-title">{pageLabel(page)}<small>Page {page - a.fromPage + 1} of {a.toPage - a.fromPage + 1}{onPage ? ` · ${onPage} marked here` : ""}</small></div>
              <button className="hz-btn hz-btn-outline" disabled={page <= a.fromPage} onClick={prev} aria-label="Previous page"><span>Previous</span><ChevronRight size={18} aria-hidden="true" /></button>
            </div>
          ) : <div className="lm-nav"><div className="lm-nav-title">{pageLabel(page)}</div></div>}
          <div {...swipe}><MushafPage page={page} marks={marks} onWordTap={tapWord} selectedKey={selectedKey} showCorrected /></div>
          {selected && (
            <div className="lm-bar" role="region" aria-label="Selected mistake">
              <b className="hz-ar" lang="ar">{selected.wordText}</b>
              <span>Page {selected.page} · Ayah {selected.verseKey}</span>
              <button className="hz-btn hz-btn-primary" disabled={busy} onClick={() => run(() => repo.setMistakeCorrected(selected.id, true)).then(() => setSelectedKey(null))}><Check size={16} aria-hidden="true" />Corrected</button>
              <button className="hz-btn hz-btn-outline" disabled={busy} onClick={() => run(() => repo.deleteMistake(selected.id)).then(() => setSelectedKey(null))}>Remove</button>
              <button className="hz-btn hz-btn-outline" onClick={() => setSelectedKey(null)} aria-label="Close"><X size={16} aria-hidden="true" /></button>
            </div>
          )}
        </div>
      </div>

      <div className="lm-foot">
        <span className="hz-muted">{open.length} word{open.length === 1 ? "" : "s"} to correct</span>
        {a.checkedAt
          ? <button className="hz-btn hz-btn-primary" onClick={onClose}>Close</button>
          : <button className="hz-btn hz-btn-primary" disabled={busy} onClick={finish}><CheckCircle2 size={18} aria-hidden="true" />Finish</button>}
      </div>
    </div>,
    document.body,
  );
}
