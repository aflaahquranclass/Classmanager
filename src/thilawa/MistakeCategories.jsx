// The kind of mistake a marked word is, shared by Thilawa (Listen & mark)
// and Hifz (marking a task). A word starts as a plain mistake (خطأ); picking a
// category is optional and gives it that category's highlighter colour.

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
  .mc-tag { display: inline-block; margin-left: 8px; padding: 2px 10px; border-radius: 999px; font: 600 15px/1.4 "Noto Naskh Arabic", serif; }
`;

// Chips for the dark bar under a selected mistake. `value` is the category id
// (null = plain mistake); tapping the chosen category again goes back to plain.
export function MistakeCategoryPicker({ value, onChange, disabled }) {
  return (
    <div className="mc-cats" role="group" aria-label="Kind of mistake" lang="ar">
      <style>{CSS}</style>
      {[PLAIN_MISTAKE, ...MISTAKE_CATEGORIES].map((c) => {
        const on = (value || null) === c.id;
        return (
          <button key={c.id || "plain"} type="button" className="mc-cat" aria-pressed={on} aria-label={c.en} disabled={disabled}
            style={on ? { background: c.bg, borderColor: c.bg, color: c.fg } : undefined}
            onClick={() => onChange(on || !c.id ? null : c.id)}><i style={{ background: c.bg }} aria-hidden="true" />{c.ar}</button>
        );
      })}
    </div>
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
