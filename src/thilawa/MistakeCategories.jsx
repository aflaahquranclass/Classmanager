// The kind of mistake a marked word is, shared by Thilawa (Listen & mark)
// and Hifz (marking a task). A word starts as a plain mistake (خطأ); picking a
// category is optional and gives it that category's highlighter colour.

import { useRef, useState, useLayoutEffect, useEffect } from "react";
import { Check, X } from "lucide-react";
import { MISTAKE_CATEGORIES, mistakeCategory, mistakeColors } from "./engine.js";

// The plain mistake: no category, the usual "to correct" colour.
export const PLAIN_MISTAKE = { id: null, ar: "خطأ", en: "Mistake", bg: "#FBD5CC", fg: "#9B1C0A", ring: "#F2A595" };

const CSS = `
  .mc-cats { flex-basis: 100%; display: flex; flex-wrap: wrap; gap: 6px; direction: rtl; }
  .mc-cat { min-height: 38px; padding: 0 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.5); background: transparent; color: #FFFFFF;
    font: 600 16px/1 "Noto Naskh Arabic", "Geeza Pro", "Arabic Typesetting", serif; cursor: pointer; }
  .mc-cat:hover { background: rgba(255,255,255,0.12); }
  .mc-cat:disabled { opacity: 0.6; cursor: default; }
  .mc-cat i { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-inline-end: 7px; vertical-align: -1px; }
  .mc-cat[aria-pressed="true"] i { display: none; }
  .mc-legend { font-family: "Noto Naskh Arabic", serif; font-size: 13px; }
  .mc-pop { position: fixed; z-index: 40; width: min(380px, calc(100vw - 16px)); box-sizing: border-box; display: flex; flex-direction: column; gap: 10px;
    background: #123B67; color: #FFFFFF; border-radius: 14px; padding: 12px; box-shadow: 0 16px 40px rgba(13,40,70,0.4); font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  .mc-pop-docked { left: 50%; bottom: 16px; transform: translateX(-50%); }
  .mc-pop-head { display: flex; align-items: center; gap: 10px; }
  .mc-pop-head b { color: #FFD9CF; font: 400 28px/1.2 "Noto Naskh Arabic", "Geeza Pro", serif; }
  .mc-pop-head span { flex: 1; min-width: 0; font-size: 13px; opacity: 0.85; }
  .mc-pop-label { font-size: 12px; font-weight: 600; opacity: 0.8; }
  .mc-pop-close { flex-shrink: 0; width: 36px; height: 36px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.4); background: transparent; color: #FFFFFF; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
  .mc-pop-actions { display: flex; gap: 8px; }
  .mc-pop-actions .hz-btn { flex: 1; min-height: 40px; }
  .mc-pop .hz-btn-outline { background: transparent; color: #FFFFFF; border-color: rgba(255,255,255,0.5); }
  .mc-tag { display: inline-block; margin-left: 8px; padding: 2px 10px; border-radius: 999px; font: 600 15px/1.4 "Noto Naskh Arabic", serif; }
  /* The pop-up grows in, its kinds of mistake follow one after another, and
     the chosen one bounces. (scale/translate, so the docked pop-up keeps its transform.) */
  .mc-pop { animation: mc-pop-in 220ms cubic-bezier(0.2, 0.9, 0.3, 1.25) both; }
  .mc-cat { animation: mc-cat-in 260ms ease-out backwards; animation-delay: calc(80ms + var(--i, 0) * 30ms); }
  .mc-cat[aria-pressed="true"] { animation: mc-cat-pick 360ms cubic-bezier(0.2, 0.9, 0.3, 1.4); }
  @keyframes mc-pop-in { from { opacity: 0; scale: 0.9; } }
  @keyframes mc-cat-in { from { opacity: 0; translate: 0 6px; } }
  @keyframes mc-cat-pick { 0% { scale: 0.85; } 60% { scale: 1.1; } 100% { scale: 1; } }
  @media (prefers-reduced-motion: reduce) { .mc-pop, .mc-cat { animation: none !important; } }
`;

// Chips for the dark pop-up on a selected mistake. `value` is the category id
// (null = plain mistake); tapping the chosen category again goes back to plain.
export function MistakeCategoryPicker({ value, onChange, disabled }) {
  return (
    <div className="mc-cats" role="group" aria-label="Kind of mistake" lang="ar">
      <style>{CSS}</style>
      {[PLAIN_MISTAKE, ...MISTAKE_CATEGORIES].map((c, i) => {
        const on = (value || null) === c.id;
        return (
          <button key={c.id || "plain"} type="button" className="mc-cat" aria-pressed={on} aria-label={c.en} disabled={disabled}
            style={on ? { "--i": i, background: c.bg, borderColor: c.bg, color: c.fg } : { "--i": i }}
            onClick={() => onChange(on || !c.id ? null : c.id)}><i style={{ background: c.bg }} aria-hidden="true" />{c.ar}</button>
        );
      })}
    </div>
  );
}

// A pop-up next to `anchor` (an element on screen): under it, or above when
// there's no room; docked at the bottom when the anchor is gone. Esc closes it
// before anything behind it. `deps`: what changes its size.
export function AnchoredPopup({ anchor, label, onClose, deps = [], children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    const place = () => {
      const box = ref.current;
      if (!box) return;
      if (!anchor?.isConnected) { setPos(null); return; }
      const r = anchor.getBoundingClientRect();
      const gap = 8;
      let top = r.bottom + gap;
      if (top + box.offsetHeight > window.innerHeight - gap) top = r.top - gap - box.offsetHeight;
      top = Math.round(Math.max(gap, Math.min(top, window.innerHeight - box.offsetHeight - gap)));
      const left = Math.round(Math.max(gap, Math.min(r.left + r.width / 2 - box.offsetWidth / 2, window.innerWidth - box.offsetWidth - gap)));
      setPos((p) => (p && p.top === top && p.left === left ? p : { top, left }));
    };
    place();
    let frame = 0;
    const later = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(place); };
    window.addEventListener("scroll", later, true);
    window.addEventListener("resize", later);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", later, true); window.removeEventListener("resize", later); };
  }, [anchor, ...deps]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  return (
    <div ref={ref} className={`mc-pop ${pos ? "" : "mc-pop-docked"}`} style={pos || undefined} role="dialog" aria-label={label}>
      <style>{CSS}</style>
      {children}
    </div>
  );
}

// Pop-up next to a marked word: what kind of mistake it is, Corrected or
// Remove. `anchor` is the word on screen (from MushafPage's onWordTap); it sits
// below the word, or above it near the bottom of the screen, and follows it as
// the page scrolls. Without the word on screen it docks at the bottom.
export function MistakePopup({ anchor, mistake, busy, onCategory, onCorrected, onRemove, onClose }) {
  return (
    <AnchoredPopup anchor={anchor} label="Marked word" onClose={onClose} deps={[mistake.id, mistake.category]}>
      <div className="mc-pop-head">
        <b lang="ar">{mistake.wordText}</b>
        <span>Page {mistake.page} · Ayah {mistake.verseKey}</span>
        <button type="button" className="mc-pop-close" onClick={onClose} aria-label="Close"><X size={16} aria-hidden="true" /></button>
      </div>
      <div className="mc-pop-label">Kind of mistake</div>
      <MistakeCategoryPicker value={mistake.category} disabled={busy} onChange={onCategory} />
      <div className="mc-pop-actions">
        <button type="button" className="hz-btn hz-btn-primary" disabled={busy} onClick={onCorrected}><Check size={16} aria-hidden="true" />Corrected</button>
        <button type="button" className="hz-btn hz-btn-outline" disabled={busy} onClick={onRemove}>Remove</button>
      </div>
    </AnchoredPopup>
  );
}

// Swatches for the categories, to go inside an .hz-legend.
export function MistakeLegend() {
  return (
    <>
      <style>{CSS}</style>
      {MISTAKE_CATEGORIES.map((c) => <span key={c.id} className="mc-legend" lang="ar"><i style={mistakeColors(c.id)} />{c.ar}</span>)}
    </>
  );
}

// The category's name in its colour, for lists of mistakes; nothing for a plain one.
export function MistakeTag({ category }) {
  const c = mistakeCategory(category);
  if (!c) return null;
  return <><style>{CSS}</style><span className="mc-tag" lang="ar" dir="rtl" aria-label={c.en} style={mistakeColors(c.id)}>{c.ar}</span></>;
}
