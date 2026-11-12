// The motivational quote on the student portal dashboard. The admin sets it
// (Admin → Motivation), one for the Hifz dashboard and one for Thilawa, each
// with its own language, font and size. Saved to student_motivation; a
// program with no row there shows the default below.

import { useState, useEffect, useCallback } from "react";
import { Quote, RotateCw, Save, Undo2 } from "lucide-react";
import { supabase } from "./supabaseClient.js";
import { TP } from "./shared.jsx";

const TABLE = "student_motivation";

export const MOTIVATION_LANGS = [
  { key: "en", label: "English", dir: "ltr" },
  { key: "dv", label: "Dhivehi", dir: "rtl" },
  { key: "ar", label: "Arabic", dir: "rtl" },
];

// Each font is for one language; the first of a language is its default.
export const MOTIVATION_FONTS = [
  { key: "georgia", lang: "en", label: "Georgia (classic)", family: "Georgia, 'Times New Roman', serif" },
  { key: "inter", lang: "en", label: "Inter (modern)", family: "Inter, system-ui, sans-serif" },
  { key: "times", lang: "en", label: "Times New Roman", family: "'Times New Roman', Times, serif" },
  { key: "faruma", lang: "dv", label: "Faruma", family: "Faruma, 'Noto Naskh Arabic', sans-serif" },
  { key: "aammu", lang: "dv", label: "Aammu", family: "Aammu, Faruma, sans-serif" },
  { key: "uthmanic", lang: "ar", label: "Uthmanic Hafs (Mushaf)", family: "UthmanicHafs, 'Noto Naskh Arabic', serif" },
  { key: "naskh", lang: "ar", label: "Noto Naskh Arabic", family: "'Noto Naskh Arabic', serif" },
];

// The font files the quote can use (Inter and Noto Naskh Arabic come from
// index.html). Thaana fonts only cover Thaana letters.
export const MOTIVATION_FONT_CSS = `
  @font-face { font-family: "Faruma"; src: url("/fonts/Faruma.ttf"); font-display: swap; unicode-range: U+0780-07BF, U+060C, U+061B, U+061F, U+FDF2; }
  @font-face { font-family: "Aammu"; src: url("/fonts/MV_AammuFK_Regular.ttf"); font-display: swap; unicode-range: U+0780-07BF, U+060C, U+061B, U+061F, U+FDF2; }
  @font-face { font-family: "UthmanicHafs"; src: url("/fonts/UthmanicHafs1Ver18.woff2") format("woff2"); font-display: swap; }
`;

export const MOTIVATION_DEFAULTS = {
  hifz: { body: "dont give up i can do it", lang: "en", font: "georgia", size: 48 },
  thilawa: { body: "Every letter I read is a reward, multiplied by ten", lang: "en", font: "georgia", size: 48 },
};

// Only the Hifz dashboard shows a quote (the Thilawa one was taken off; its
// saved row and default stay, unused).
const PROGRAMS = [
  { key: "hifz", label: "Hifz dashboard" },
];

const pick = ({ body, lang, font, size }) => ({ body, lang, font, size });

// dir, lang and style for the quote's text. The size is the largest (on a
// wide screen); phones scale it down the way the dashboard always has.
export function motivationTextProps(m) {
  const lang = MOTIVATION_LANGS.find((l) => l.key === m.lang) || MOTIVATION_LANGS[0];
  const font = MOTIVATION_FONTS.find((f) => f.key === m.font && f.lang === lang.key) || MOTIVATION_FONTS.find((f) => f.lang === lang.key);
  const rtl = lang.dir === "rtl";
  return {
    dir: lang.dir,
    lang: lang.key,
    style: {
      fontFamily: font.family,
      fontSize: `clamp(${Math.round(m.size * 0.58)}px, 7.4vw, ${m.size}px)`,
      // Thaana and Arabic need room for their marks, and no letter spacing or
      // fake bold, which break the joined letters.
      ...(rtl ? { lineHeight: 1.6, letterSpacing: 0, fontWeight: 400 } : null),
    },
  };
}

// The admin's quotes over the defaults: { hifz, thilawa }. Defaults only when
// off (the demo) or before the table exists.
export function useMotivation(enabled = true) {
  const [saved, setSaved] = useState({});
  useEffect(() => {
    if (!enabled) return;
    supabase.from(TABLE).select("program, body, lang, font, size").then(({ data }) => {
      if (data) setSaved(Object.fromEntries(data.map((r) => [r.program, pick(r)])));
    });
  }, [enabled]);
  return { hifz: { ...MOTIVATION_DEFAULTS.hifz, ...saved.hifz }, thilawa: { ...MOTIVATION_DEFAULTS.thilawa, ...saved.thilawa } };
}

const same = (a, b) => a.body === b.body && a.lang === b.lang && a.font === b.font && a.size === b.size;

export function AdminMotivation({ showToast }) {
  const [saved, setSaved] = useState(null); // { hifz, thilawa } as saved (or default)
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState("");

  const load = useCallback(async () => {
    setSaved(null);
    const { data } = await supabase.from(TABLE).select("program, body, lang, font, size");
    const rows = Object.fromEntries((data || []).map((r) => [r.program, pick(r)]));
    const next = { hifz: { ...MOTIVATION_DEFAULTS.hifz, ...rows.hifz }, thilawa: { ...MOTIVATION_DEFAULTS.thilawa, ...rows.thilawa } };
    setSaved(next);
    setForm(next);
    setErrors({});
  }, []);
  useEffect(() => { load(); }, [load]);

  const edit = (program, patch) => {
    setForm((f) => ({ ...f, [program]: { ...f[program], ...patch } }));
    setErrors((e) => ({ ...e, [program]: "" }));
  };
  // A new language starts on its first font.
  const setLang = (program, lang) => {
    const cur = form[program];
    const keep = MOTIVATION_FONTS.some((f) => f.key === cur.font && f.lang === lang);
    edit(program, { lang, font: keep ? cur.font : MOTIVATION_FONTS.find((f) => f.lang === lang).key });
  };

  const save = async (program, label) => {
    const m = { ...form[program], body: form[program].body.trim() };
    if (!m.body) { setErrors((e) => ({ ...e, [program]: "Write a quote first." })); return; }
    setSaving(program);
    const { error } = await supabase.from(TABLE).upsert({ program, ...m, updated_at: new Date().toISOString() });
    setSaving("");
    if (error) { console.error(TABLE, error); showToast("Couldn't save the quote. Please try again."); return; }
    setSaved((s) => ({ ...s, [program]: m }));
    setForm((f) => ({ ...f, [program]: m }));
    showToast(`${label} quote saved.`);
  };

  return (
    <div>
      <style>{`
        ${MOTIVATION_FONT_CSS}
        .mv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 18px; margin-top: 18px; }
        .mv-card { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .mv-card h2 { margin: 0; font-size: 17px; font-weight: 700; color: ${TP.navy}; }
        .mv-field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: ${TP.navy}; }
        .mv-input { width: 100%; box-sizing: border-box; border: 1px solid ${TP.border}; border-radius: 10px; padding: 9px 12px; font: inherit; font-size: 15px; font-weight: 400; color: #1B2733; background: #FFFFFF; }
        .mv-input:focus { outline: 2px solid ${TP.blue}; outline-offset: 0; border-color: ${TP.blue}; }
        textarea.mv-input { resize: vertical; min-height: 64px; line-height: 1.5; }
        .mv-langs { display: inline-flex; padding: 3px; border-radius: 10px; background: #E3EEF8; align-self: flex-start; }
        .mv-langs button { border: none; background: transparent; border-radius: 8px; padding: 0 14px; min-height: 36px; font: inherit; font-size: 13px; font-weight: 600; color: ${TP.secondaryText}; cursor: pointer; }
        .mv-langs button[aria-pressed="true"] { background: #FFFFFF; color: ${TP.navy}; box-shadow: 0 1px 3px rgba(18,59,103,0.12); }
        .mv-size { display: flex; align-items: center; gap: 12px; }
        .mv-size input { flex: 1; accent-color: ${TP.blue}; }
        .mv-size output { min-width: 48px; text-align: right; font-weight: 700; }
        .mv-preview-label { font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: ${TP.secondaryText}; }
        .mv-preview { position: relative; min-height: 150px; display: flex; align-items: center; justify-content: center; padding: 24px 24px 24px 48px; border: 1px solid #DCEBF8; border-radius: 18px; background: #FFFFFF; box-shadow: 0 10px 30px rgba(18,59,103,0.08); overflow: hidden; }
        .mv-preview::before { content: ""; position: absolute; left: 18px; top: 16px; bottom: 16px; width: 8px; border-radius: 999px; background: linear-gradient(180deg, ${TP.teal}, ${TP.gradStart}); }
        .mv-preview p { margin: 0; text-align: center; font-weight: 700; letter-spacing: -0.01em; line-height: 1.15; overflow-wrap: anywhere;
          background: linear-gradient(90deg, #0F2FA8, ${TP.blue} 50%, #0F2FA8); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .mv-error { margin: 0; font-size: 13px; color: #B42318; }
        .mv-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .mv-reset { display: inline-flex; align-items: center; gap: 4px; border: none; background: none; color: ${TP.blue}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; min-height: 36px; margin-right: auto; }
        .mv-unsaved { font-size: 12px; font-weight: 700; color: #8A5300; }
      `}</style>
      <div className="tp-header">
        <div className="tp-title-group">
          <span className="tp-title-icon" aria-hidden="true"><Quote size={22} /></span>
          <div>
            <h1 className="tp-title">Motivation</h1>
            <div className="tp-subtext" style={{ margin: 0 }}>The quote students see on their Hifz dashboard. Choose its words, language, font and size.</div>
          </div>
        </div>
        <div className="tp-actions">
          <button type="button" className="lc-btn" disabled={!saved || !!saving} onClick={load}>
            <RotateCw size={14} aria-hidden="true" style={{ marginRight: "4px", verticalAlign: "-2px" }} />Reload
          </button>
        </div>
      </div>

      {!form ? (
        <div className="lc-loading-row"><span className="lc-spinner"></span>Loading…</div>
      ) : (
        <div className="mv-grid">
          {PROGRAMS.map(({ key, label }) => {
            const m = form[key];
            const text = motivationTextProps(m);
            const changed = !same(m, saved[key]);
            const isDefault = same(m, MOTIVATION_DEFAULTS[key]);
            return (
              <section key={key} className="tp-card mv-card" aria-label={label}>
                <h2>{label}</h2>
                <div className="mv-field">
                  Language
                  <div className="mv-langs" role="group" aria-label={`${label} language`}>
                    {MOTIVATION_LANGS.map((l) => (
                      <button key={l.key} type="button" aria-pressed={m.lang === l.key} onClick={() => setLang(key, l.key)}>{l.label}</button>
                    ))}
                  </div>
                </div>
                <label className="mv-field">
                  Quote
                  <textarea className="mv-input" rows={2} dir={text.dir} lang={text.lang} value={m.body}
                    style={{ fontFamily: text.style.fontFamily, fontSize: m.lang === "en" ? 15 : 18 }}
                    onChange={(e) => edit(key, { body: e.target.value })} />
                </label>
                {errors[key] && <p className="mv-error" role="alert">{errors[key]}</p>}
                <label className="mv-field">
                  Font
                  <select className="mv-input" value={m.font} onChange={(e) => edit(key, { font: e.target.value })}>
                    {MOTIVATION_FONTS.filter((f) => f.lang === m.lang).map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </label>
                <label className="mv-field">
                  Size
                  <span className="mv-size">
                    <input type="range" min={20} max={72} step={1} value={m.size} onChange={(e) => edit(key, { size: Number(e.target.value) })} />
                    <output>{m.size}px</output>
                  </span>
                </label>
                <div className="mv-preview-label">Preview</div>
                <div className="mv-preview"><p {...text}>{m.body.trim() || " "}</p></div>
                <div className="mv-actions">
                  {!isDefault && (
                    <button type="button" className="mv-reset" onClick={() => edit(key, MOTIVATION_DEFAULTS[key])}>
                      <Undo2 size={14} aria-hidden="true" />Reset to default
                    </button>
                  )}
                  {changed && <span className="mv-unsaved">Not saved yet</span>}
                  <button type="button" className="tp-btn-gradient" disabled={!changed || saving === key} onClick={() => save(key, label.replace(" dashboard", ""))}>
                    <Save size={16} aria-hidden="true" />{saving === key ? "Saving…" : "Save"}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
