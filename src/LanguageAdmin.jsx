// Admin → Language: the Dhivehi wording of the public website and of the
// downloadable Hifz exam report, one tab each, plus the exam and student
// names written on the report.
//
// Checking: the admin reads each phrase and marks it as checked. A phrase
// stays checked only while its Dhivehi is the exact text that was checked
// (verified_dv), so any later change — by the admin or in the defaults in
// the code — puts it back in the "To check" list. The admin's own
// corrections count as checked.
//
// Website wording is saved to site_translations, everything else to
// report_translations. A blank en / dv there means "use the default".

import { useState, useEffect, useCallback, useMemo } from "react";
import { Languages, RotateCw, Save, Search, Check, ExternalLink, Undo2 } from "lucide-react";
import { supabase } from "./supabaseClient.js";
import { TP } from "./App.jsx";
import { REPORT_STRINGS, loadThaanaFont, THAANA_FONT, nameKey, examNameKey, examNameToDhivehi } from "./exams/reportStrings.js";
import { nameToThaana } from "./exams/thaanaNames.js";
import { SITE_STRINGS, SITE_GROUPS } from "./landing/siteStrings.js";

const SITE = "site_translations";
const REPORT = "report_translations";
const LONG_REPORT_KEYS = new Set(["noteBody", "summary", "range"]);

const TABS = [
  { key: "site", label: "Website", about: "Everything the public website says in Dhivehi. So far the home page, the menu and the footer are translated." },
  { key: "report", label: "Exam report", about: "The wording of the downloaded Hifz exam report, in English and Dhivehi. Words in {braces} are filled in automatically — keep them as they are." },
  { key: "exams", label: "Exam names", about: "Each scheduled exam's name as it is written at the top of the Dhivehi report. They are translated automatically, word by word." },
  { key: "names", label: "Student names", about: "Each student's name as it is written in the Dhivehi report. Names are spelled automatically from English." },
];
const FILTERS = [
  { key: "todo", label: "To check" },
  { key: "done", label: "Checked" },
  { key: "all", label: "All" },
];

const websiteUrl = () => {
  const { hostname, origin } = window.location;
  return `${["localhost", "127.0.0.1"].includes(hostname) ? origin : "https://aflaahqc.com"}/?lang=dv`;
};

// Each table's saved rows, { key: row }. select("*") so the page still shows
// saved wording before the verified_dv column exists.
async function loadRows(table) {
  const { data, error } = await supabase.from(table).select("*");
  if (error || !data) return {};
  return Object.fromEntries(data.map((r) => [r.key, r]));
}

export function AdminLanguage({ students = [], showToast }) {
  const [examTitles, setExamTitles] = useState([]);
  useEffect(() => {
    supabase.from("exam_sessions").select("title").then(({ data }) => {
      setExamTitles([...new Set((data || []).map((r) => (r.title || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)));
    });
  }, []);

  // Every phrase on every tab. id is unique across both tables.
  const items = useMemo(() => {
    const names = [...new Set(students.map((st) => (st.name || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const item = (tab, table, x) => ({ ...x, tab, table, id: `${table}:${x.key}` });
    return [
      ...SITE_STRINGS.map((x) => item("site", SITE, { ...x, long: x.en.length > 60 })),
      ...REPORT_STRINGS.map((x) => item("report", REPORT, { ...x, enEditable: true, long: LONG_REPORT_KEYS.has(x.key) })),
      ...examTitles.map((n) => item("exams", REPORT, { key: examNameKey(n), en: n, dv: examNameToDhivehi(n) })),
      ...names.map((n) => item("names", REPORT, { key: nameKey(n), en: n, dv: nameToThaana(n) })),
    ];
  }, [students, examTitles]);

  // saved: { [table]: { key: row } }. edits: { id: { en, dv, checked } }, unsaved.
  const [saved, setSaved] = useState({ [SITE]: {}, [REPORT]: {} });
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("site");
  const [filter, setFilter] = useState("todo");
  const [query, setQuery] = useState("");
  // Phrases touched since the tab or filter last changed stay in view, so
  // one doesn't vanish from "To check" while it is being typed in.
  const [touched, setTouched] = useState(() => new Set());

  const load = useCallback(async () => {
    setLoading(true);
    loadThaanaFont();
    const [site, report] = await Promise.all([loadRows(SITE), loadRows(REPORT)]);
    setSaved({ [SITE]: site, [REPORT]: report });
    setEdits({});
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setTouched(new Set()); }, [tab, filter]);

  const row = (it) => saved[it.table][it.key];
  const stored = (it) => {
    const r = row(it);
    const v = { en: r?.en?.trim() ? r.en : it.en, dv: r?.dv?.trim() ? r.dv : it.dv };
    return { ...v, checked: !!r?.verified_dv && r.verified_dv === v.dv };
  };
  const valueOf = (it) => edits[it.id] || stored(it);
  const isChanged = (it) => {
    const a = edits[it.id];
    if (!a) return false;
    const b = stored(it);
    return a.en !== b.en || a.dv !== b.dv || a.checked !== b.checked;
  };
  const changed = items.filter(isChanged);

  const update = (it, patch) => {
    setEdits((cur) => ({ ...cur, [it.id]: { ...(cur[it.id] || stored(it)), ...patch } }));
    setTouched((cur) => new Set(cur).add(it.id));
  };
  // Typing the Dhivehi yourself counts as checking it.
  const setText = (it, lang, value) => update(it, lang === "dv" ? { dv: value, checked: true } : { en: value });
  const resetToDefault = (it) => update(it, { en: it.en, dv: it.dv, checked: row(it)?.verified_dv === it.dv });

  const inTab = items.filter((it) => it.tab === tab);
  const q = query.trim().toLowerCase();
  const shown = inTab.filter((it) => {
    const v = valueOf(it);
    if (q && ![it.en, v.en, v.dv, it.hint || "", it.group || ""].some((x) => x.toLowerCase().includes(q))) return false;
    if (touched.has(it.id) || filter === "all") return true;
    return filter === "done" ? v.checked : !v.checked;
  });
  const counts = Object.fromEntries(TABS.map((t) => {
    const list = items.filter((it) => it.tab === t.key);
    return [t.key, { total: list.length, todo: list.filter((it) => !valueOf(it).checked).length }];
  }));
  const unchecked = shown.filter((it) => !valueOf(it).checked);

  const save = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const byTable = { [SITE]: [], [REPORT]: [] };
    changed.forEach((it) => {
      const v = edits[it.id];
      const r = row(it);
      const keepTime = v.checked && r?.verified_dv === v.dv && r?.verified_at;
      byTable[it.table].push({
        key: it.key,
        ...(it.table === REPORT ? { en: v.en === it.en ? "" : v.en } : {}),
        dv: v.dv === it.dv ? "" : v.dv,
        verified_dv: v.checked ? v.dv : null,
        verified_at: v.checked ? keepTime || now : null,
        updated_at: now,
      });
    });
    const results = await Promise.all(Object.entries(byTable).filter(([, rows]) => rows.length)
      .map(([table, rows]) => supabase.from(table).upsert(rows, { onConflict: "key" }).then(({ error }) => ({ table, rows, error }))));
    setSaving(false);
    const failed = results.filter((r) => r.error);
    const ok = results.filter((r) => !r.error);
    if (ok.length) {
      setSaved((cur) => {
        const next = { ...cur };
        ok.forEach(({ table, rows }) => { next[table] = { ...cur[table], ...Object.fromEntries(rows.map((r) => [r.key, r])) }; });
        return next;
      });
      setEdits((cur) => Object.fromEntries(Object.entries(cur).filter(([id]) => !ok.some(({ table }) => id.startsWith(`${table}:`)))));
    }
    if (failed.length) { failed.forEach((f) => console.error(f.table, f.error)); showToast("Couldn't save the changes. Please try again."); return; }
    const n = results.reduce((sum, r) => sum + r.rows.length, 0);
    showToast(`Saved ${n} change${n === 1 ? "" : "s"}.`);
  };

  const about = TABS.find((t) => t.key === tab);
  const groups = tab === "site" ? SITE_GROUPS : tab === "report" ? [...new Set(REPORT_STRINGS.map((x) => x.group))] : [null];
  const { total, todo } = counts[tab];

  return (
    <div className="tp-lang-page">
      <style>{`
        .tp-lang-page { position: relative; margin: -28px -32px; padding: 32px; min-height: calc(100% + 56px); box-sizing: border-box; }
        @media (max-width: 820px) { .tp-lang-page { margin: -18px -16px; padding: 24px; min-height: calc(100% + 36px); } }
        @media (max-width: 640px) { .tp-lang-page { padding: 20px 16px; } }
        .lg-count { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 22px; padding: 0 7px; margin-left: 8px; border-radius: 999px; background: #FFF1DC; color: #8A5300; font-size: 12px; font-weight: 700; }
        .tp-segment-btn-active .lg-count { background: rgba(255,255,255,0.25); color: #FFFFFF; }
        .lg-count-done { background: #E1F5EA; color: #17784A; }
        .lg-intro { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; margin-bottom: 14px; }
        .lg-about { flex: 1 1 320px; margin: 0; font-size: 14px; line-height: 1.55; color: ${TP.secondaryText}; }
        .lg-progress { flex: 0 1 260px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: ${TP.navy}; }
        .lg-bar { height: 8px; border-radius: 999px; background: #E3EEF8; overflow: hidden; }
        .lg-bar span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, ${TP.blue}, ${TP.teal}); transition: width 0.3s ease; }
        .lg-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 16px; }
        .lg-search { display: flex; align-items: center; gap: 8px; border: 1px solid ${TP.border}; border-radius: 10px; padding: 0 11px; color: ${TP.secondaryText}; background: #FFFFFF; flex: 1 1 220px; max-width: 340px; }
        .lg-search input { border: none; outline: none; font: inherit; font-size: 14px; min-height: 40px; flex: 1; min-width: 0; background: transparent; }
        .lg-filters { display: inline-flex; padding: 3px; border-radius: 10px; background: #E3EEF8; }
        .lg-filters button { border: none; background: transparent; border-radius: 8px; padding: 0 14px; min-height: 36px; font: inherit; font-size: 13px; font-weight: 600; color: ${TP.secondaryText}; cursor: pointer; }
        .lg-filters button[aria-pressed="true"] { background: #FFFFFF; color: ${TP.navy}; box-shadow: 0 1px 3px rgba(18,59,103,0.12); }
        .lg-tools-end { margin-left: auto; display: flex; flex-wrap: wrap; gap: 8px; }
        .lg-link { display: inline-flex; align-items: center; gap: 6px; border: 1px solid ${TP.border}; border-radius: 10px; padding: 0 12px; min-height: 40px; background: #FFFFFF; color: ${TP.blue}; font: inherit; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; }
        .lg-link:hover { background: #F3F9FD; }
        .lg-group { margin-bottom: 14px; padding: 6px 18px; }
        .lg-group-title { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: ${TP.secondaryText}; padding: 12px 0 4px; }
        .lg-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr) 150px; gap: 14px; align-items: start; padding: 14px 0; border-top: 1px solid #E3EEF8; }
        .lg-group-title + .lg-row { border-top: none; }
        .lg-src { display: flex; flex-direction: column; gap: 4px; min-width: 0; padding-top: 2px; }
        .lg-en { font-size: 14px; line-height: 1.5; color: #1B2733; overflow-wrap: anywhere; }
        .lg-hint { font-size: 12px; line-height: 1.45; color: ${TP.secondaryText}; }
        .lg-lang { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: ${TP.secondaryText}; }
        .lg-input { width: 100%; box-sizing: border-box; border: 1px solid ${TP.border}; border-radius: 10px; padding: 8px 11px; font: inherit; font-size: 14px; color: #1B2733; background: #FFFFFF; resize: vertical; min-height: 42px; }
        .lg-input:focus { outline: 2px solid ${TP.blue}; outline-offset: 0; border-color: ${TP.blue}; }
        .lg-input-dv { font-family: ${THAANA_FONT}; font-size: 17px; line-height: 1.75; }
        .lg-row.is-checked .lg-input-dv { border-color: #A9DEC2; background: #F6FCF8; }
        .lg-side { display: flex; flex-direction: column; align-items: stretch; gap: 4px; }
        .lg-check { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid ${TP.border}; background: #FFFFFF; color: ${TP.navy}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .lg-check:hover { border-color: ${TP.blue}; color: ${TP.blue}; }
        .lg-check[aria-pressed="true"] { background: #E1F5EA; border-color: #A9DEC2; color: #17784A; }
        .lg-reset { display: inline-flex; align-items: center; justify-content: center; gap: 4px; border: none; background: none; color: ${TP.blue}; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; min-height: 32px; }
        .lg-unsaved { text-align: center; font-size: 11px; font-weight: 700; color: #8A5300; }
        .lg-empty { padding: 28px 8px; text-align: center; font-size: 14px; color: ${TP.secondaryText}; }
        .lg-savebar { position: sticky; bottom: 12px; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; padding: 10px 10px 10px 18px; border-radius: 16px; background: ${TP.navy}; color: #FFFFFF; box-shadow: 0 12px 30px rgba(18,59,103,0.3); font-size: 14px; font-weight: 600; }
        .lg-savebar .lc-btn { background: transparent; color: #FFFFFF; border-color: rgba(255,255,255,0.4); }
        .lg-savebar .lc-btn:hover { background: rgba(255,255,255,0.1); }
        .lg-savebar-actions { display: flex; gap: 8px; }
        @media (max-width: 760px) {
          .lg-row { grid-template-columns: 1fr; gap: 8px; }
          .lg-side { flex-direction: row; align-items: center; }
          .lg-check { flex: 1; }
          .lg-tools-end { margin-left: 0; }
          .lg-search { max-width: none; }
        }
      `}</style>
      <div className="tp-header">
        <div className="tp-title-group">
          <span className="tp-title-icon" aria-hidden="true"><Languages size={22} /></span>
          <div>
            <h1 className="tp-title">Language</h1>
            <div className="tp-subtext" style={{ margin: 0 }}>Check and correct the Dhivehi on the website and in the exam reports.</div>
          </div>
        </div>
        <div className="tp-actions">
          <button type="button" className="lc-btn" disabled={loading || saving} onClick={load}>
            <RotateCw size={14} aria-hidden="true" style={{ marginRight: "4px", verticalAlign: "-2px" }} />Reload
          </button>
        </div>
      </div>

      <div className="tp-segment" role="tablist" aria-label="What to translate">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`tp-segment-btn ${tab === t.key ? "tp-segment-btn-active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
            {!loading && counts[t.key].total > 0 && (counts[t.key].todo
              ? <span className="lg-count" aria-label={`${counts[t.key].todo} to check`}>{counts[t.key].todo}</span>
              : <span className="lg-count lg-count-done" aria-label="All checked"><Check size={13} /></span>)}
          </button>
        ))}
      </div>

      <div className="lg-intro">
        <p className="lg-about">{about.about}</p>
        {!loading && total > 0 && (
          <div className="lg-progress">
            <span>{total - todo} of {total} checked</span>
            <div className="lg-bar" aria-hidden="true"><span style={{ width: `${((total - todo) / total) * 100}%` }} /></div>
          </div>
        )}
      </div>

      <div className="lg-tools">
        <label className="lg-search">
          <Search size={15} aria-hidden="true" />
          <input type="search" placeholder={tab === "names" ? "Search students" : "Search"} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
        </label>
        <div className="lg-filters" role="group" aria-label="Show">
          {FILTERS.map((f) => <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>)}
        </div>
        <div className="lg-tools-end">
          {/* Names are many and mostly right; wording is checked one by one. */}
          {(tab === "names" || tab === "exams") && filter !== "done" && unchecked.length > 1 && (
            <button type="button" className="lg-link" onClick={() => unchecked.forEach((it) => update(it, { checked: true }))}>
              <Check size={15} aria-hidden="true" />Mark all {unchecked.length} shown as checked
            </button>
          )}
          {tab === "site" && (
            <a className="lg-link" href={websiteUrl()} target="_blank" rel="noreferrer">
              <ExternalLink size={15} aria-hidden="true" />Open the website in Dhivehi
            </a>
          )}
        </div>
      </div>

      {loading ? (
        <div className="lc-loading-row"><span className="lc-spinner"></span>Loading…</div>
      ) : !shown.length ? (
        <div className="tp-card lg-empty">
          {!total ? (tab === "exams" ? "No scheduled exams yet." : "No students yet.")
            : q ? "Nothing matches your search."
              : filter === "todo" ? "Everything here is checked." : "Nothing is checked here yet."}
        </div>
      ) : groups.map((group) => {
        const list = shown.filter((it) => !group || it.group === group);
        if (!list.length) return null;
        return (
          <div key={group || tab} className="tp-card lg-group">
            {group && <div className="lg-group-title"><span>{group}</span></div>}
            {list.map((it) => {
              const v = valueOf(it);
              const isDefault = v.en === it.en && v.dv === it.dv;
              const rows = it.long ? (it.key === "noteBody" ? 4 : 2) : 1;
              return (
                <div key={it.id} className={`lg-row ${v.checked ? "is-checked" : ""}`}>
                  <div className="lg-src">
                    {it.enEditable ? (
                      <>
                        <span className="lg-hint">{it.hint}</span>
                        <textarea className="lg-input" rows={rows} value={v.en} aria-label={`English: ${it.hint}`} onChange={(e) => setText(it, "en", e.target.value)} />
                      </>
                    ) : (
                      <>
                        <span className="lg-en">{it.en}</span>
                        {it.hint && <span className="lg-hint">{it.hint}</span>}
                      </>
                    )}
                  </div>
                  <textarea className="lg-input lg-input-dv" dir="rtl" lang="dv" rows={rows} value={v.dv} aria-label={`Dhivehi: ${it.en}`} onChange={(e) => setText(it, "dv", e.target.value)} />
                  <div className="lg-side">
                    <button type="button" className="lg-check" aria-pressed={v.checked} onClick={() => update(it, { checked: !v.checked })}>
                      <Check size={15} aria-hidden="true" />{v.checked ? "Checked" : "Mark as checked"}
                    </button>
                    {!isDefault && (
                      <button type="button" className="lg-reset" onClick={() => resetToDefault(it)}>
                        <Undo2 size={13} aria-hidden="true" />{it.tab === "names" || it.tab === "exams" ? "Use automatic Dhivehi" : "Reset to default"}
                      </button>
                    )}
                    {isChanged(it) && <span className="lg-unsaved">Not saved yet</span>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {changed.length > 0 && (
        <div className="lg-savebar" role="status">
          <span>{changed.length} unsaved change{changed.length === 1 ? "" : "s"}</span>
          <div className="lg-savebar-actions">
            <button type="button" className="lc-btn" disabled={saving} onClick={() => setEdits({})}>Discard</button>
            <button type="button" className="tp-btn-gradient" disabled={saving} onClick={save}>
              <Save size={16} aria-hidden="true" />{saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
