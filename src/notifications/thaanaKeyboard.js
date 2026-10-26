// Dhivehi phonetic keyboard (the standard layout on Windows/macOS), so the
// admin can type Thaana on any device: "k" → ކ, "a" → ަ, "S" → ށ, …
// A device that already has a Dhivehi keyboard types Thaana directly and
// passes through unchanged.

const LAYOUT = {
  q: "ް", w: "އ", e: "ެ", r: "ރ", t: "ތ", y: "ޔ", u: "ު", i: "ި", o: "ޮ", p: "ޕ",
  a: "ަ", s: "ސ", d: "ދ", f: "ފ", g: "ގ", h: "ހ", j: "ޖ", k: "ކ", l: "ލ",
  z: "ޒ", x: "×", c: "ޗ", v: "ވ", b: "ބ", n: "ނ", m: "މ",
  Q: "ޤ", W: "ޢ", E: "ޭ", R: "ޜ", T: "ޓ", Y: "ޠ", U: "ޫ", I: "ީ", O: "ޯ", P: "÷",
  A: "ާ", S: "ށ", D: "ޑ", F: "ﷲ", G: "ޣ", H: "ޙ", J: "ޛ", K: "ޚ", L: "ޅ",
  Z: "ޡ", X: "ޘ", C: "ޝ", V: "ޥ", B: "ޞ", N: "ޏ", M: "ޟ",
  ",": "،", ";": "؛", "?": "؟",
};

export const hasThaana = (text) => /[ހ-޿]/.test(text || "");

export const toThaana = (text) => [...text].map((ch) => LAYOUT[ch] ?? ch).join("");

// onChange for a controlled input/textarea: in Dhivehi mode, converts only
// what was just typed (a key or two), so pasted English stays as it is.
// Works with soft keyboards too, which don't report keys reliably.
export function thaanaChange(e, prev, setValue, enabled) {
  const el = e.target;
  const next = el.value;
  if (!enabled || next.length <= prev.length || next.length - prev.length > 2) { setValue(next); return; }
  let start = 0;
  while (start < prev.length && prev[start] === next[start]) start++;
  let end = 0;
  while (end < prev.length - start && prev[prev.length - 1 - end] === next[next.length - 1 - end]) end++;
  const typed = next.slice(start, next.length - end);
  const converted = toThaana(typed);
  if (converted === typed) { setValue(next); return; }
  const caret = el.selectionStart;
  setValue(next.slice(0, start) + converted + next.slice(next.length - end));
  // Each key maps to one character, so the caret stays where it was.
  requestAnimationFrame(() => { try { el.setSelectionRange(caret, caret); } catch { /* detached */ } });
}
