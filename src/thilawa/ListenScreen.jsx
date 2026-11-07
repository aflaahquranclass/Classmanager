// Teacher: listen to a Thilawa reading or lesson, full screen. The pages open
// in the Mushaf; tapping a word the student gets wrong marks it and opens a
// pop-up by it (what kind of mistake, Corrected / Remove); tapping a marked
// word opens it again. Letters opens the Arabic letters table, to choose the
// letters the student needs to work on. Finish saves that the teacher
// listened, and the student is notified with how many words to correct.
// Pages turn freely past the portion (the class often reads on); the portion's
// pages are only where it opens. startPage opens it elsewhere, and onPage(page)
// hears every turn. `portions` colour the part's ayah numbers (see MushafPage).
//
// A class lesson (see ClassLesson.jsx) adds `classmates`: [{ id, name, done }]
// for a dropdown of the class in place of the name, `onStudent(id)` to switch
// to another student (their own marks show), and `onFinished` to call after
// Finish instead of closing.

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import MushafPage, { MushafPresent, useMushafSwipe } from "./MushafPage.jsx";
import { TOTAL_PAGES, describePages, pageLabel } from "./engine.js";
import { MistakePopup, MistakeLegend } from "./MistakeCategories.jsx";
import LettersPanel, { LetterChips } from "./LettersPanel.jsx";

const CSS = `
  .lm { position: fixed; inset: 0; z-index: 1000; display: flex; flex-direction: column; background: #F4F8FC; color: #123B67; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  .lm-top { flex-shrink: 0; display: flex; align-items: center; gap: 12px; padding: 10px 16px; padding-top: max(10px, env(safe-area-inset-top)); color: #FFFFFF;
    background: linear-gradient(90deg, #0D4F85 0%, #176FD1 55%, #0A94B1 100%); box-shadow: 0 4px 16px rgba(13,40,70,0.18); }
  .lm-top .hz-btn { background: rgba(255,255,255,0.16); color: #FFFFFF; border: 1px solid rgba(255,255,255,0.4); min-height: 40px; }
  .lm-top .hz-btn:hover { background: rgba(255,255,255,0.26); }
  .lm-title { flex: 1; min-width: 0; font-weight: 700; font-size: 16px; line-height: 1.25; }
  .lm-title small { display: block; font-weight: 400; font-size: 13px; opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lm-body { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .lm-inner { max-width: 1600px; margin: 0 auto; padding: 16px 24px 24px; display: flex; flex-direction: column; gap: 12px; }
  .lm .mp-page { max-width: none; }
  .lm-nav { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .lm-nav-title { flex: 1; min-width: 0; text-align: center; font-weight: 700; font-size: 15px; }
  .lm-nav-title small { display: block; font-weight: 400; color: #567493; font-size: 13px; }
  .lm-foot { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; padding-bottom: max(12px, env(safe-area-inset-bottom));
    background: #FFFFFF; border-top: 1px solid #DCEBF8; box-shadow: 0 -6px 20px rgba(18,59,103,0.08); }
  .lm-foot .hz-btn { min-height: 48px; padding: 0 22px; font-size: 15px; }
  .lm-abc { font: 500 18px/1 "Noto Naskh Arabic", "Geeza Pro", serif; font-style: normal; }
  .lm-letters { min-height: 38px; padding: 0 12px; font-size: 13px; gap: 6px; }
  .lm-who { display: block; max-width: 100%; min-height: 34px; margin-top: 2px; padding: 0 30px 0 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.45); font: 700 15px/1.2 Inter, ui-sans-serif, system-ui, sans-serif; color: #FFFFFF; cursor: pointer;
    background: rgba(255,255,255,0.16) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='white' stroke-width='2' fill='none'/%3E%3C/svg%3E") no-repeat right 10px center; appearance: none; -webkit-appearance: none; }
  .lm-who:hover { background-color: rgba(255,255,255,0.26); }
  .lm-who:focus-visible { outline: 2px solid #FFFFFF; outline-offset: 2px; }
  .lm-who option { color: #123B67; background: #FFFFFF; }
  .lm-goto { width: 76px; min-height: 34px; margin-top: 4px; padding: 0 8px; border-radius: 9px; border: 1px solid #C7DDF4; background: #FFFFFF; color: #123B67; font: 600 14px/1 Inter, ui-sans-serif, system-ui, sans-serif; text-align: center; }
  .lm-goto:focus-visible { outline: 2px solid #176FD1; outline-offset: 1px; }
  .lm-out { color: #8A5A00 !important; font-weight: 600; }
  .lm-count { min-width: 20px; height: 20px; padding: 0 5px; box-sizing: border-box; border-radius: 999px; background: #176FD1; color: #FFFFFF; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; }
  @media (max-width: 640px) {
    .lm-inner { padding: 10px 6px 20px; }
    .lm-top .hz-btn span, .lm-nav .hz-btn span { display: none; }
    .lm .mp-page { padding: 4% 2.5% 2%; border-radius: 10px; }
  }
`;

export default function ListenScreen({ student, assignment: a, mistakes, repo, refresh, onClose, classmates = null, onStudent = null, onFinished = null, startPage = null, onPage: onPageTurn = null, portions = [] }) {
  const [page, setPage] = useState(startPage ?? a.fromPage);
  const [goto, setGoto] = useState(null); // the page number being typed
  const [selectedKey, setSelectedKey] = useState(null);
  const [anchor, setAnchor] = useState(null); // the selected word on screen
  const [lettersOpen, setLettersOpen] = useState(false);
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
  const turn = (to) => { setSelectedKey(null); setPage(to); onPageTurn?.(to); };
  const next = () => turn(Math.min(TOTAL_PAGES, page + 1));
  const prev = () => turn(Math.max(1, page - 1));
  const jump = () => {
    const p = Math.round(+goto);
    if (p >= 1 && p <= TOTAL_PAGES && p !== page) turn(p);
    setGoto(null);
  };
  const inPortion = page >= a.fromPage && page <= a.toPage;
  const swipe = useMushafSwipe(next, prev);

  // Another student of the class: nothing of the last one stays selected.
  useEffect(() => { setSelectedKey(null); setError(""); }, [student.id]);

  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = before; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const tapWord = (w) => {
    setSelectedKey(w.key);
    setAnchor(w.el);
    if (busy || open.some((m) => m.verseKey === w.verseKey && m.position === w.position)) return; // a marked word is only selected
    run(() => repo.addMistake({ assignmentId: a.id, page: w.page, line: w.line, verseKey: w.verseKey, position: w.position, wordText: w.text }));
  };
  const finish = () => run(() => repo.setAssignmentChecked(a.id, true)).then((ok) => ok && (onFinished || onClose)());
  const onPage = open.filter((m) => m.page === page).length;

  return createPortal(
    <div className="lm" role="dialog" aria-modal="true" aria-label={`Listen and mark · ${student.name}`}>
      <style>{CSS}</style>
      <div className="lm-top">
        <button className="hz-btn" onClick={onClose}><ChevronLeft size={18} aria-hidden="true" /><span>Back</span></button>
        {classmates ? (
          <div className="lm-title">Class reading · {a.instructions || describePages(a.fromPage, a.toPage)}
            <select className="lm-who" value={student.id} disabled={busy} onChange={(e) => onStudent(e.target.value)} aria-label="Student reading">
              {classmates.map((s) => <option key={s.id} value={s.id}>{s.name}{s.done ? " ✓" : ""}</option>)}
            </select>
          </div>
        ) : (
          <div className="lm-title">{lesson ? "Today's lesson" : "Listen & mark"} · {student.name}
            <small>{describePages(a.fromPage, a.toPage)}</small>
          </div>
        )}
      </div>

      <div className="lm-body">
        <div className="lm-inner">
          <div className="hz-legend">
            <span>Tap a word the student gets wrong to mark it, then choose the kind of mistake in the pop-up. Tap a marked word to open it again.</span>
            <span><i style={{ background: "#FBD5CC", boxShadow: "0 0 0 1px #F2A595" }} />To correct</span>
            <span><i style={{ background: "#DDF5E9" }} />Corrected</span>
            <MistakeLegend />
          </div>
          {a.instructions && <div className="hz-task-notes">{a.instructions}</div>}
          <LetterChips letters={a.letters} inMushaf />
          {error && <div className="hz-error" role="alert">{error}</div>}
          {/* The letters table goes inside, so it shows in full screen too. */}
          <MushafPresent tools={
            <button type="button" className="hz-btn hz-btn-outline lm-letters" onClick={() => { setSelectedKey(null); setLettersOpen((o) => !o); }} aria-expanded={lettersOpen}
              aria-label={`Letters to improve${a.letters.length ? ` (${a.letters.length} chosen)` : ""}`}>
              <i className="lm-abc" lang="ar" aria-hidden="true">أ ب</i>Letters{a.letters.length > 0 && <b className="lm-count" aria-hidden="true">{a.letters.length}</b>}
            </button>
          }>
          <div className="lm-nav">
            <button className="hz-btn hz-btn-outline" disabled={page >= TOTAL_PAGES} onClick={next} aria-label="Next page"><ChevronLeft size={18} aria-hidden="true" /><span>Next</span></button>
            <div className="lm-nav-title">{pageLabel(page)}
              <small className={inPortion ? undefined : "lm-out"}>{inPortion
                ? (a.toPage > a.fromPage ? `Page ${page - a.fromPage + 1} of ${a.toPage - a.fromPage + 1} of the part` : "The part's page")
                : <>Past the part · <button type="button" className="hz-btn hz-btn-ghost" style={{ minHeight: 0, padding: "0 4px", fontSize: 13 }} onClick={() => turn(a.fromPage)}>back to page {a.fromPage}</button></>}
                {onPage ? ` · ${onPage} marked here` : ""}</small>
              <input className="lm-goto" type="number" inputMode="numeric" min="1" max={TOTAL_PAGES} aria-label="Go to page" title="Go to page"
                value={goto ?? page} onChange={(e) => setGoto(e.target.value)} onBlur={jump} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
            </div>
            <button className="hz-btn hz-btn-outline" disabled={page <= 1} onClick={prev} aria-label="Previous page"><span>Previous</span><ChevronRight size={18} aria-hidden="true" /></button>
          </div>
          <div {...swipe}><MushafPage page={page} marks={marks} onWordTap={tapWord} selectedKey={selectedKey} showCorrected letters={a.letters} portions={portions} /></div>
          {selected && (
            <MistakePopup key={selected.id} anchor={anchor} mistake={selected} busy={busy} onClose={() => setSelectedKey(null)}
              onCategory={(c) => run(() => repo.setMistakeCategory(selected.id, c)).then(() => setSelectedKey(null))}
              onCorrected={() => run(() => repo.setMistakeCorrected(selected.id, true)).then(() => setSelectedKey(null))}
              onRemove={() => run(() => repo.deleteMistake(selected.id)).then(() => setSelectedKey(null))} />
          )}
          {lettersOpen && <LettersPanel value={a.letters} studentName={student.name} busy={busy} onClose={() => setLettersOpen(false)}
            onChange={(letters) => run(() => repo.setAssignmentLetters(a.id, letters))} />}
          </MushafPresent>
        </div>
      </div>

      <div className="lm-foot">
        <span className="hz-muted">{open.length} word{open.length === 1 ? "" : "s"} to correct</span>
        {a.checkedAt
          ? <button className="hz-btn hz-btn-primary" onClick={onClose}>Close</button>
          : <button className="hz-btn hz-btn-primary" disabled={busy} onClick={finish}><CheckCircle2 size={18} aria-hidden="true" />{classmates ? `Finish ${student.name}` : "Finish"}</button>}
      </div>
    </div>,
    document.body,
  );
}
