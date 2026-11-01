// The Arabic letters table: in Listen & mark the teacher taps the letters a
// student needs to work on (a side panel on a laptop, a sheet from the bottom
// on a phone). The letters are saved with the reading or lesson once the
// teacher stops tapping (or closes the table), and the student sees them with
// it (LetterChips).

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { ARABIC_LETTERS, sortLetters } from "./engine.js";

const CSS = `
  .lp { position: fixed; z-index: 45; top: 0; right: 0; bottom: 0; width: min(360px, 100vw); box-sizing: border-box; display: flex; flex-direction: column;
    background: #FFFFFF; color: #123B67; box-shadow: -12px 0 36px rgba(13,40,70,0.22); font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  .lp-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px; padding-top: max(14px, env(safe-area-inset-top)); border-bottom: 1px solid #DCEBF8; }
  .lp-head h2 { flex: 1; margin: 0; font-size: 17px; }
  .lp-head h2 small { display: block; font-weight: 400; font-size: 13px; color: #567493; }
  .lp-close { flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px; border: 1px solid #C7DDF4; background: #FFFFFF; color: #567493; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
  .lp-body { flex: 1; overflow-y: auto; padding: 14px 16px; }
  .lp-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; direction: rtl; }
  .lp-letter { aspect-ratio: 1; min-height: 48px; border-radius: 12px; border: 1px solid #C7DDF4; background: #F7FAFD; color: #123B67; cursor: pointer;
    font: 500 26px/1 "Noto Naskh Arabic", "Geeza Pro", "Arabic Typesetting", serif; }
  .lp-letter:hover { border-color: #176FD1; }
  .lp-letter:focus-visible { outline: 2px solid #176FD1; outline-offset: 2px; }
  .lp-letter[aria-pressed="true"] { background: #176FD1; border-color: #176FD1; color: #FFFFFF; }
  .lp-foot { display: flex; align-items: center; gap: 10px; padding: 12px 16px; padding-bottom: max(12px, env(safe-area-inset-bottom)); border-top: 1px solid #DCEBF8; }
  .lp-foot span { flex: 1; font-size: 14px; color: #567493; }
  .lp-foot .hz-btn { min-height: 44px; }
  @media (max-width: 640px) {
    .lp { top: auto; left: 0; width: 100%; max-height: 78vh; border-radius: 18px 18px 0 0; box-shadow: 0 -12px 36px rgba(13,40,70,0.25); }
    .lp-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; }
    .lp-letter { font-size: 22px; min-height: 44px; }
  }
  .lc { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 13px; color: #567493; }
  .lc b { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 32px; padding: 0 6px; box-sizing: border-box; border-radius: 8px;
    background: #EAF3FD; color: #1452A8; font: 500 20px/1 "Noto Naskh Arabic", "Geeza Pro", serif; }
`;

// value: the letters chosen; onChange(letters) saves them.
export default function LettersPanel({ value, studentName, busy, onChange, onClose }) {
  // Taps show at once and are saved together a moment after the last one, so
  // quick taps never race each other. The saved letters take over once nothing
  // is waiting to be saved.
  const [chosen, setChosen] = useState(value);
  const latest = useRef(value);
  const timer = useRef(0);
  const save = useRef(onChange);
  save.current = onChange;
  useEffect(() => { if (!timer.current) { latest.current = value; setChosen(value); } }, [value.join("")]);
  useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); save.current(latest.current); } }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  const set = (letters) => {
    latest.current = letters;
    setChosen(letters);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = 0; save.current(latest.current); }, 500);
  };
  const toggle = (l) => { const c = latest.current; set(sortLetters(c.includes(l) ? c.filter((x) => x !== l) : [...c, l])); };

  return (
    <aside className="lp" role="dialog" aria-label="Letters to improve">
      <style>{CSS}</style>
      <div className="lp-head">
        <h2>Letters to improve<small>Tap the letters {studentName} needs to work on. They see them with this reading.</small></h2>
        <button type="button" className="lp-close" onClick={onClose} aria-label="Close letters"><X size={18} aria-hidden="true" /></button>
      </div>
      <div className="lp-body">
        <div className="lp-grid" lang="ar">
          {ARABIC_LETTERS.map((l) => (
            <button key={l} type="button" className="lp-letter" aria-pressed={chosen.includes(l)} onClick={() => toggle(l)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="lp-foot">
        <span aria-live="polite">{busy ? "Saving…" : chosen.length ? `${chosen.length} chosen` : "None chosen"}</span>
        {chosen.length > 0 && <button type="button" className="hz-btn hz-btn-outline" onClick={() => set([])}>Clear</button>}
        <button type="button" className="hz-btn hz-btn-primary" onClick={onClose}>Done</button>
      </div>
    </aside>
  );
}

// The chosen letters as a row of chips, for the student and the teacher's lists.
// inMushaf: the Mushaf below shows their words in blue, so say so.
export function LetterChips({ letters, style, inMushaf = false }) {
  if (!letters?.length) return null;
  return (
    <div className="lc" style={style}>
      <style>{CSS}</style>
      <span>Letters to improve</span>
      {letters.map((l) => <b key={l} lang="ar">{l}</b>)}
      {inMushaf && <span>· words with them are in blue</span>}
    </div>
  );
}
