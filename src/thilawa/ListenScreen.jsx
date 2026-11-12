// Teacher: listen to a Thilawa reading or lesson, full screen. The pages open
// in the Mushaf; tapping a word the student gets wrong marks it and opens a
// pop-up by it (what kind of mistake, Corrected / Remove); tapping a marked
// word opens it again. Letters opens the Arabic letters table, to choose the
// letters the student needs to work on. Finish saves that the teacher
// listened, and the student is notified with how many words to correct.
// Pages turn freely past the portion (the class often reads on); the portion's
// pages are only where it opens. startPage opens it elsewhere, and onPage(page)
// hears every turn.
//
// A class lesson (see ClassLesson.jsx) adds `classmates`: [{ id, name, done }]
// for a dropdown of the class in place of the name, `onStudent(id)` to switch
// to another student (their own marks show), and `onFinished` to call after
// Finish instead of closing.

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, CheckCircle2, Presentation } from "lucide-react";
import MushafPage, { MushafPresent, useMushafSwipe } from "./MushafPage.jsx";
import { TOTAL_PAGES, describePages, pageLabel } from "./engine.js";
import { MistakePopup } from "./MistakeCategories.jsx";
import LettersPanel, { LetterChips, LettersSide } from "./LettersPanel.jsx";
import Whiteboard from "./Whiteboard.jsx";

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
  .lm-row { display: flex; gap: 12px; align-items: flex-start; }
  .lm-page { flex: 1; min-width: 0; }
  .lm-board { min-height: 38px; padding: 0 12px; font-size: 13px; gap: 6px; }
  /* Letters: one button next to Whiteboard (a tab on the side in full
     screen); in full screen on a wide screen the table sits beside the page. */
  .lm-row .ls { display: none; }
  .lm-letters i { font: 500 17px/1 "Noto Naskh Arabic", "Geeza Pro", serif; font-style: normal; }
  .lm-letters b { min-width: 18px; height: 18px; padding: 0 5px; box-sizing: border-box; border-radius: 999px; background: #E8650A; color: #FFFFFF; font: 700 11px/18px Inter, system-ui, sans-serif; text-align: center; }
  @media (min-width: 761px) { .mf-full .lm-row .ls { display: block; } .mf-full .lm-letters { display: none; } }
  .lm-count { min-width: 20px; height: 20px; padding: 0 5px; box-sizing: border-box; border-radius: 999px; background: #176FD1; color: #FFFFFF; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; }
  @media (max-width: 640px) {
    .lm-inner { padding: 10px 6px 20px; }
    .lm-top .hz-btn span, .lm-nav .hz-btn span { display: none; }
    .lm .mp-page { padding: 4% 2.5% 2%; border-radius: 10px; }
  }
`;

export default function ListenScreen({ student, assignment: a, mistakes, repo, refresh, onClose, classmates = null, onStudent = null, onFinished = null, startPage = null, onPage: onPageTurn = null }) {
  const [page, setPage] = useState(startPage ?? a.fromPage);
  const [goto, setGoto] = useState(null); // the page number being typed
  const [selectedKey, setSelectedKey] = useState(null);
  const [anchor, setAnchor] = useState(null); // the selected word on screen
  const [lettersOpen, setLettersOpen] = useState(false); // the letters table
  const [board, setBoard] = useState(false); // the whiteboard
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lesson = a.kind === "lesson";

  // Marking is instant: a tapped word is highlighted (and its pop-up opens)
  // at once, and the change is saved in the background. Each student's saves
  // run one after another, so a word is saved before its kind of mistake;
  // when they're all done the marks are reloaded once. Until then `overlay`
  // holds the changes not yet reloaded:
  // [{ sid, key, seq, add?: mistake, patch?: { category | correctedAt | removed } }].
  const [overlay, setOverlay] = useState([]);
  const seq = useRef(0);
  const queues = useRef(new Map()); // student id → { chain, count }
  const savedIds = useRef(new Map()); // "studentId|word key" → Promise<the saved mark's id>
  const wordKey = (m) => `${m.verseKey}:${m.position}`;
  let marks = mistakes.filter((m) => m.assignmentId === a.id);
  for (const o of overlay.filter((x) => x.sid === student.id)) {
    if (o.add && !marks.some((m) => !m.correctedAt && wordKey(m) === o.key)) marks = [...marks, o.add];
    if (o.patch) marks = marks.map((m) => (!m.correctedAt && wordKey(m) === o.key ? { ...m, ...o.patch } : m));
  }
  marks = marks.filter((m) => !m.removed);
  const open = marks.filter((m) => !m.correctedAt);
  const selected = open.find((m) => wordKey(m) === selectedKey) || null;

  // Runs `op` after the student's earlier saves; once none are left, reloads
  // and drops the overlay up to here. Returns op's result.
  const enqueue = (sid, op, reload) => {
    const q = queues.current.get(sid) || { chain: Promise.resolve(), count: 0 };
    queues.current.set(sid, q);
    q.count += 1;
    const result = q.chain.then(op);
    result.catch((e) => setError(e.message));
    q.chain = result.catch(() => {}).then(async () => {
      q.count -= 1;
      if (q.count > 0) return;
      const upto = seq.current;
      try { await reload(); } catch { /* the next reload catches up */ }
      setOverlay((o) => o.filter((x) => x.sid !== sid || x.seq > upto));
    });
    return result;
  };
  const markWord = (w) => {
    const sid = student.id, r = repo, s = ++seq.current;
    const temp = { id: `new-${s}`, pending: true, assignmentId: a.id, page: w.page, line: w.line, verseKey: w.verseKey, position: w.position, wordText: w.text, category: null, note: "", correctedAt: null };
    setOverlay((o) => [...o, { sid, key: w.key, seq: s, add: temp }]);
    const saved = enqueue(sid, async () => (await r.addMistake({ assignmentId: a.id, page: w.page, line: w.line, verseKey: w.verseKey, position: w.position, wordText: w.text }))?.id, refresh);
    savedIds.current.set(`${sid}|${w.key}`, saved);
  };
  // Kind of mistake, Corrected or Remove: shown at once, saved after the word itself.
  const change = (m, patch, write) => {
    const sid = student.id, r = repo, key = wordKey(m), s = ++seq.current;
    const id = savedIds.current.get(`${sid}|${key}`) || Promise.resolve(m.pending ? null : m.id);
    setOverlay((o) => [...o, { sid, key, seq: s, patch }]);
    setSelectedKey(null);
    enqueue(sid, async () => {
      const real = await id;
      if (!real) throw new Error("That word couldn't be saved. Mark it again.");
      await write(r, real);
    }, refresh);
    if (patch.removed || patch.correctedAt) savedIds.current.delete(`${sid}|${key}`);
  };

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
    if (open.some((m) => wordKey(m) === w.key)) return; // a marked word is only selected
    markWord(w);
  };
  // Finish once every mark is saved.
  const finish = async () => {
    setBusy(true);
    await queues.current.get(student.id)?.chain;
    setBusy(false);
    const ok = await run(() => repo.setAssignmentChecked(a.id, true));
    if (ok) (onFinished || onClose)();
  };
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
          {a.instructions && <div className="hz-task-notes">{a.instructions}</div>}
          <LetterChips letters={a.letters} inMushaf />
          {error && <div className="hz-error" role="alert">{error}</div>}
          {/* The letters table goes inside, so it shows in full screen too. */}
          {/* Letters and the whiteboard are one tap away, in full screen too (there the letters sit beside the page on a wide screen). */}
          <MushafPresent onNext={page < TOTAL_PAGES ? next : null} onPrev={page > 1 ? prev : null}
            quick={<>
              <button type="button" className="hz-btn hz-btn-outline lm-board lm-letters" onClick={() => { setSelectedKey(null); setLettersOpen(true); }} aria-expanded={lettersOpen}
                aria-label={`Letters to improve${a.letters.length ? ` (${a.letters.length} chosen)` : ""}`} title="Letters to improve">
                <i lang="ar" aria-hidden="true">أب</i><span>Letters</span>{a.letters.length > 0 && <b aria-hidden="true">{a.letters.length}</b>}
              </button>
              <button type="button" className="hz-btn hz-btn-outline lm-board" onClick={() => { setSelectedKey(null); setBoard(true); }} aria-label="Whiteboard" title="Whiteboard"><Presentation size={18} aria-hidden="true" /><span>Whiteboard</span></button>
            </>}
            edge={lettersOpen && <LettersPanel key={student.id} value={a.letters} studentName={student.name} busy={busy} onClose={() => setLettersOpen(false)}
              onChange={(letters) => run(() => repo.setAssignmentLetters(a.id, letters))} />}>
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
          <div className="lm-row">
            <div className="lm-page" {...swipe}><MushafPage page={page} marks={marks} onWordTap={tapWord} selectedKey={selectedKey} showCorrected letters={a.letters} /></div>
            <LettersSide key={student.id} value={a.letters} studentName={student.name} busy={busy} onChange={(letters) => run(() => repo.setAssignmentLetters(a.id, letters))} />
          </div>
          {selected && (
            <MistakePopup key={`${student.id}|${selectedKey}`} anchor={anchor} mistake={selected} busy={false} onClose={() => setSelectedKey(null)}
              onCategory={(c) => change(selected, { category: c || null }, (r, id) => r.setMistakeCategory(id, c))}
              onCorrected={() => change(selected, { correctedAt: new Date().toISOString() }, (r, id) => r.setMistakeCorrected(id, true))}
              onRemove={() => change(selected, { removed: true }, (r, id) => r.deleteMistake(id))} />
          )}
          </MushafPresent>
        </div>
      </div>

      {board && <Whiteboard onClose={() => setBoard(false)} />}

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
