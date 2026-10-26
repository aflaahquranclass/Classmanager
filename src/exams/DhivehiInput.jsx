// Writing exam remarks and comments in Dhivehi: an English / ދިވެހި switch,
// and inputs that in Dhivehi mode type Thaana with the phonetic layout
// (k → ކ, a → ަ) right to left in the Faruma font. Remarks that already
// contain Thaana are always shown in Faruma. The chosen language is
// remembered on this device.

import { useState, useEffect } from "react";
import { thaanaChange, hasThaana } from "../notifications/thaanaKeyboard.js";
import { THAANA_FONT, loadThaanaFont } from "./reportStrings.js";

const STORE_KEY = "ex-remark-lang";

export const dhivehiInputCss = (TP) => `
  .ex-lang { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
  .ex-lang-label { font-size: 13px; font-weight: 600; color: ${TP.navy}; }
  .ex-lang-switch { display: inline-flex; border: 1px solid ${TP.border}; border-radius: 10px; overflow: hidden; }
  .ex-lang-switch button { border: none; background: #FFFFFF; color: ${TP.navy}; font: inherit; font-size: 13px; font-weight: 600; padding: 0 14px; min-height: 38px; cursor: pointer; }
  .ex-lang-switch button[aria-pressed="true"] { background: linear-gradient(90deg, ${TP.blue}, ${TP.teal}); color: #FFFFFF; }
  .ex-lang-switch button:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: -2px; }
  .ex-lang-dv { font-family: ${THAANA_FONT}; font-size: 15px !important; }
  .ex-lang-hint { flex-basis: 100%; font-size: 12px; color: ${TP.muted || "#5B6B79"}; }
  .lc-input.ex-dv { font-family: ${THAANA_FONT}; font-size: 16px; line-height: 1.8; }
`;

// [dhivehi, setDhivehi], remembered per device; also loads Faruma.
export function useRemarkLanguage() {
  const [dhivehi, setDhivehi] = useState(() => {
    try { return localStorage.getItem(STORE_KEY) === "dv"; } catch { return false; }
  });
  useEffect(() => { loadThaanaFont(); }, []);
  const set = (on) => {
    setDhivehi(on);
    try { localStorage.setItem(STORE_KEY, on ? "dv" : "en"); } catch { /* private mode */ }
  };
  return [dhivehi, set];
}

export function RemarkLanguageSwitch({ dhivehi, onChange }) {
  return (
    <div className="ex-lang">
      <span className="ex-lang-label">Write remarks in</span>
      <span className="ex-lang-switch" role="group" aria-label="Remark language">
        <button type="button" aria-pressed={!dhivehi} onClick={() => onChange(false)}>English</button>
        <button type="button" className="ex-lang-dv" lang="dv" aria-pressed={dhivehi} onClick={() => onChange(true)}>ދިވެހި</button>
      </span>
      {dhivehi && <span className="ex-lang-hint">Type with the Dhivehi phonetic layout: k → ކ, a → ަ, S → ށ. A Dhivehi phone keyboard works too.</span>}
    </div>
  );
}

// An <input> (or textarea with multiline) for a remark. onValue gets the new text.
export function RemarkInput({ dhivehi, value, onValue, multiline, className = "", placeholder, dvPlaceholder, ...rest }) {
  const dv = dhivehi || hasThaana(value);
  const props = {
    ...rest,
    className: `${className} ${dv ? "ex-dv" : ""}`,
    dir: dv ? "rtl" : "auto",
    lang: dv ? "dv" : undefined,
    value,
    placeholder: dhivehi && dvPlaceholder ? dvPlaceholder : placeholder,
    onChange: (e) => thaanaChange(e, value, onValue, dhivehi),
  };
  return multiline ? <textarea {...props} /> : <input {...props} />;
}
