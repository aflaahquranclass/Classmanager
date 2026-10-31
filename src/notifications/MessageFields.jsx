// The English and Dhivehi boxes of a message (Send and the template editor),
// with buttons that put {name}, {student_id}, … where the cursor is in the
// box last typed in.

import { useRef, useId } from "react";
import { THAANA_FONT } from "../exams/reportStrings.js";
import { thaanaChange } from "./thaanaKeyboard.js";
import { MESSAGE_PLACEHOLDERS, PLACEHOLDER_LABELS } from "./templates.js";

// lang: "en" | "dv" | "both" — which boxes show.
export function MessageFields({ lang, en, dv, setEn, setDv, onEdit, minHeight = "130px" }) {
  const uid = useId();
  const refs = { en: useRef(null), dv: useRef(null) };
  const last = useRef(lang === "en" ? "en" : "dv");

  const change = (which, value) => { (which === "en" ? setEn : setDv)(value); onEdit?.(); };

  const insert = (key) => {
    const which = lang === "both" ? last.current : lang;
    const el = refs[which].current;
    const text = which === "en" ? en : dv;
    const tag = `{${key}}`;
    const at = el ? el.selectionStart : text.length;
    const end = el ? el.selectionEnd : text.length;
    change(which, text.slice(0, at) + tag + text.slice(end));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + tag.length, at + tag.length); });
  };

  const box = (which) => {
    const isDv = which === "dv";
    const value = isDv ? dv : en;
    return (
      <div key={which}>
        <label className="nt-label" htmlFor={`${uid}-${which}`}>{isDv ? <>Dhivehi <span style={{ fontFamily: THAANA_FONT, textTransform: "none" }}>ދިވެހި</span></> : "English"}</label>
        <textarea
          id={`${uid}-${which}`}
          ref={refs[which]}
          className={`lc-input nt-textarea ${isDv ? "nt-dv" : ""}`}
          style={{ minHeight }}
          dir={isDv ? "rtl" : "ltr"}
          lang={isDv ? "dv" : "en"}
          value={value}
          placeholder={isDv ? "މެސެޖު ލިޔުއްވާ…" : "Write the message…"}
          onFocus={() => { last.current = which; }}
          onChange={(e) => (isDv ? thaanaChange(e, dv, (v) => change("dv", v), true) : change("en", e.target.value))}
        />
        <div className="nt-meta">
          <span>{value.length} characters</span>
          {isDv && <span style={{ fontFamily: THAANA_FONT }}>Phonetic typing — k → ކ, a → ަ, S → ށ</span>}
        </div>
      </div>
    );
  };

  return (
    <>
      {lang !== "en" && box("dv")}
      {lang !== "dv" && box("en")}
      <span className="nt-label">Insert student details{lang === "both" ? " (into the box you last typed in)" : ""}</span>
      <div className="nt-chips">
        {MESSAGE_PLACEHOLDERS.map((p) => (
          <button key={p} type="button" className="nt-chip nt-chip-sm" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(p)}>{PLACEHOLDER_LABELS[p]}</button>
        ))}
      </div>
    </>
  );
}

// English / ދިވެހި / Both switch. withBoth: false for the template editor.
export function LanguageSwitch({ value, onChange, withBoth = true, label = "Language" }) {
  const options = [["en", "English"], ["dv", "ދިވެހި"], ...(withBoth ? [["both", "Both"]] : [])];
  return (
    <span className="nt-lang-switch" role="group" aria-label={label}>
      {options.map(([key, text]) => (
        <button key={key} type="button" className={key === "dv" ? "nt-dv-btn" : undefined} lang={key === "dv" ? "dv" : undefined} aria-pressed={value === key} onClick={() => onChange(key)}>{text}</button>
      ))}
    </span>
  );
}
