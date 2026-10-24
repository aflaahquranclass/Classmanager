// Admin → Language: every phrase of the downloadable Hifz exam report in
// English and Dhivehi. The admin can correct any wording; changes are saved
// to report_translations and used by the next download.

import { useState, useEffect, useCallback, useMemo } from "react";
import { Languages, RotateCw, Save, Search } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { TP } from "../App.jsx";
import { REPORT_STRINGS, loadReportOverrides, loadThaanaFont, THAANA_FONT, nameKey, examNameKey, examNameToDhivehi } from "./reportStrings.js";
import { nameToThaana } from "./thaanaNames.js";

const NAMES_GROUP = "Student names";
const EXAMS_GROUP = "Exam names";
const GROUPS = [...new Set(REPORT_STRINGS.map((s) => s.group)), EXAMS_GROUP, NAMES_GROUP];
const LONG_KEYS = new Set(["noteBody", "summary", "range"]);

export function AdminReportLanguage({ students = [], showToast }) {
  // Scheduled exams' names, shown at the top of the report.
  const [examTitles, setExamTitles] = useState([]);
  useEffect(() => {
    supabase.from("exam_sessions").select("title").then(({ data }) => {
      setExamTitles([...new Set((data || []).map((r) => (r.title || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)));
    });
  }, []);

  // Every exam name and student name is an item too: English as typed,
  // Dhivehi written automatically until the admin corrects it.
  const items = useMemo(() => {
    const names = [...new Set(students.map((st) => (st.name || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return [
      ...REPORT_STRINGS,
      ...examTitles.map((n) => ({ key: examNameKey(n), group: EXAMS_GROUP, hint: n, en: n, dv: examNameToDhivehi(n), isName: true })),
      ...names.map((n) => ({ key: nameKey(n), group: NAMES_GROUP, hint: n, en: n, dv: nameToThaana(n), isName: true, isStudent: true })),
    ];
  }, [students, examTitles]);

  // saved: rows stored in report_translations; edits: unsaved changes.
  const [saved, setSaved] = useState({});
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nameFilter, setNameFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    loadThaanaFont();
    setSaved(await loadReportOverrides());
    setEdits({});
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const storedValue = (it) => ({
    en: saved[it.key]?.en?.trim() ? saved[it.key].en : it.en,
    dv: saved[it.key]?.dv?.trim() ? saved[it.key].dv : it.dv,
  });
  const valueOf = (it) => edits[it.key] || storedValue(it);
  const changed = items.filter((it) => {
    if (!edits[it.key]) return false;
    const a = edits[it.key], b = storedValue(it);
    return a.en !== b.en || a.dv !== b.dv;
  });
  const set = (it, lang, value) => setEdits((cur) => ({ ...cur, [it.key]: { ...valueOf(it), [lang]: value } }));

  const save = async () => {
    setSaving(true);
    const rows = changed.map((it) => ({ key: it.key, ...edits[it.key], updated_at: new Date().toISOString() }));
    const { error } = await supabase.from("report_translations").upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) { showToast("Couldn't save the changes. Please try again."); return; }
    setSaved((cur) => ({ ...cur, ...Object.fromEntries(rows.map((r) => [r.key, r])) }));
    setEdits({});
    showToast(`Saved ${rows.length} change${rows.length === 1 ? "" : "s"}.`);
  };

  return (
    <div className="tp-lang-page">
      <style>{`
        .tp-lang-page { position: relative; margin: -28px -32px; padding: 32px; min-height: calc(100% + 56px); box-sizing: border-box; }
        @media (max-width: 820px) { .tp-lang-page { margin: -18px -16px; padding: 24px; min-height: calc(100% + 36px); } }
        @media (max-width: 640px) { .tp-lang-page { padding: 20px 16px; } }
        .lg-group { margin-bottom: 16px; }
        .lg-group-title { font-size: 15px; font-weight: 700; color: ${TP.navy}; margin-bottom: 4px; }
        .lg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 14px 0; border-top: 1px solid #E3EEF8; }
        .lg-row:first-of-type { border-top: none; }
        .lg-hint { grid-column: 1 / -1; font-size: 12px; color: ${TP.secondaryText}; display: flex; justify-content: space-between; gap: 8px; align-items: center; }
        .lg-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .lg-lang { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: ${TP.secondaryText}; }
        .lg-input { width: 100%; box-sizing: border-box; border: 1px solid #C7DDF4; border-radius: 10px; padding: 9px 11px; font: inherit; font-size: 14px; color: #1B2733; background: #FFFFFF; resize: vertical; min-height: 42px; }
        .lg-input:focus { outline: 2px solid #176FD1; outline-offset: 0; border-color: #176FD1; }
        .lg-input-dv { font-family: ${THAANA_FONT}; font-size: 16px; line-height: 1.7; }
        .lg-reset { border: none; background: none; color: #176FD1; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; padding: 4px 0; min-height: 32px; }
        .lg-name-row { align-items: center; padding: 10px 0; }
        .lg-name { font-size: 14px; font-weight: 600; color: #1B2733; display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; }
        .lg-search { display: flex; align-items: center; gap: 8px; border: 1px solid #C7DDF4; border-radius: 10px; padding: 0 11px; color: ${TP.secondaryText}; margin-bottom: 4px; max-width: 360px; }
        .lg-search input { border: none; outline: none; font: inherit; font-size: 14px; min-height: 40px; flex: 1; min-width: 0; background: transparent; }
        @media (max-width: 640px) { .lg-row { grid-template-columns: 1fr; } }
      `}</style>
      <div className="tp-header">
        <div className="tp-title-group">
          <span className="tp-title-icon" aria-hidden="true"><Languages size={22} /></span>
          <div>
            <h1 className="tp-title">Language</h1>
            <div className="tp-subtext" style={{ margin: 0 }}>Wording and student names in the downloaded Hifz exam report. Correct any English or Dhivehi text and save.</div>
          </div>
        </div>
        <div className="tp-actions">
          <button type="button" className="lc-btn" disabled={loading} onClick={load}>
            <RotateCw size={14} aria-hidden="true" style={{ marginRight: "4px", verticalAlign: "-2px" }} />Reload
          </button>
          <button type="button" className="tp-btn-gradient" disabled={!changed.length || saving} onClick={save}>
            <Save size={16} aria-hidden="true" />
            {saving ? "Saving…" : changed.length ? `Save ${changed.length} change${changed.length === 1 ? "" : "s"}` : "Saved"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="lc-loading-row"><span className="lc-spinner"></span>Loading…</div>
      ) : GROUPS.map((group) => (
        <div key={group} className="tp-card lg-group">
          <div className="lg-group-title">{group}</div>
          {group === EXAMS_GROUP && (
            <div className="lg-hint" style={{ marginBottom: "8px" }}>{examTitles.length ? "Each scheduled exam's name as it is written at the top of the Dhivehi report. Correct any that are wrong." : "No scheduled exams yet."}</div>
          )}
          {group === NAMES_GROUP && (
            <>
              <div className="lg-hint" style={{ marginBottom: "8px" }}>Each student's name as it is written in the Dhivehi report. Names are spelled automatically — correct any that are wrong.</div>
              <label className="lg-search">
                <Search size={15} aria-hidden="true" />
                <input type="search" placeholder="Search students" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} aria-label="Search students" />
              </label>
              {!items.some((it) => it.isName) && <div className="lg-hint">No students yet.</div>}
            </>
          )}
          {items.filter((s) => s.group === group && (!s.isStudent || s.en.toLowerCase().includes(nameFilter.trim().toLowerCase()))).map((s) => {
            const v = valueOf(s);
            const isDefault = v.en === s.en && v.dv === s.dv;
            const rows = LONG_KEYS.has(s.key) ? (s.key === "noteBody" ? 4 : 2) : 1;
            const reset = !isDefault && (
              <button type="button" className="lg-reset" onClick={() => setEdits((cur) => ({ ...cur, [s.key]: { en: s.en, dv: s.dv } }))}>{s.isName ? "Use automatic Dhivehi" : "Reset to default"}</button>
            );
            if (s.isName) {
              return (
                <div key={s.key} className="lg-row lg-name-row">
                  <div className="lg-name">{s.en}{reset}</div>
                  <input className="lg-input lg-input-dv" dir="rtl" lang="dv" value={v.dv} aria-label={`${s.en} in Dhivehi`} onChange={(e) => set(s, "dv", e.target.value)} />
                </div>
              );
            }
            return (
              <div key={s.key} className="lg-row">
                <div className="lg-hint">
                  <span>{s.hint}</span>
                  {reset}
                </div>
                <label className="lg-field">
                  <span className="lg-lang">English</span>
                  <textarea className="lg-input" rows={rows} value={v.en} onChange={(e) => set(s, "en", e.target.value)} />
                </label>
                <label className="lg-field">
                  <span className="lg-lang">Dhivehi</span>
                  <textarea className="lg-input lg-input-dv" dir="rtl" lang="dv" rows={rows} value={v.dv} onChange={(e) => set(s, "dv", e.target.value)} />
                </label>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
