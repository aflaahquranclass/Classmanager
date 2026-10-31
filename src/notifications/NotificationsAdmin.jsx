// Admin → Notifications: send a message to students, teachers or any number
// — in the app (with a phone notification), by SMS and/or by email — from a
// saved English / Dhivehi template, with each student's own details filled
// in. SMS goes through the `send-sms` Edge Function (MessageOwl), which holds
// the API key; email through the site's Worker (Cloudflare Email Service).
//
// Tabs: Send (SendTab.jsx) · Templates (TemplatesTab.jsx) · History
// (HistoryTab.jsx) · Payment reminders (SmsTemplates.jsx).

import { useState, useEffect, useMemo } from "react";
import { Bell } from "lucide-react";
import { TP } from "../App.jsx";
import { THAANA_FONT, loadThaanaFont } from "../exams/reportStrings.js";
import { loadTemplates, loadDvNames } from "./smsSend.js";
import { loadMessageTemplates, automaticAsTemplates } from "./messageTemplates.js";
import { maldivesMonth } from "../dates.js";
import { PaymentReminders } from "./SmsTemplates.jsx";
import { SendTab } from "./SendTab.jsx";
import { TemplatesTab } from "./TemplatesTab.jsx";
import { HistoryTab } from "./HistoryTab.jsx";

const TABS = [
  { key: "compose", label: "Send" },
  { key: "templates", label: "Templates" },
  { key: "history", label: "History" },
  { key: "reminders", label: "Payment reminders" },
];

// initialTab: "compose" | "templates" | "history" | "reminders" (e.g. from
// Registrations → "Change the standard message").
export function AdminNotifications({ students = [], teachers = [], classes = [], showToast, initialTab = "compose" }) {
  const [tab, setTab] = useState(initialTab);
  const [templates, setTemplates] = useState(undefined); // [{ id, name, en, dv }] | null when they couldn't load
  const [autoRows, setAutoRows] = useState({}); // sms_templates by key
  const [dvNames, setDvNames] = useState({});
  const [start, setStart] = useState(null); // { id, lang, n }: open Send with this template
  const [historyKey, setHistoryKey] = useState(0);
  const monthKey = maldivesMonth();

  useEffect(() => {
    loadThaanaFont();
    loadMessageTemplates().then(setTemplates);
    loadDvNames().then(setDvNames);
  }, []);
  // The automatic messages' wording may have just been changed under Templates.
  useEffect(() => { if (tab === "compose") loadTemplates().then(setAutoRows); }, [tab]);
  useEffect(() => { loadTemplates().then(setAutoRows); }, []);
  const automatic = useMemo(() => automaticAsTemplates(autoRows), [autoRows]);

  const sendWith = (id, lang) => {
    setStart({ id, lang, n: Date.now() });
    setTab("compose");
  };
  // An automatic message: with its wording as just saved.
  const sendAutomatic = async (id, lang) => {
    setAutoRows(await loadTemplates());
    sendWith(id, lang);
  };
  const onSent = () => setHistoryKey((k) => k + 1);

  return (
    <div className="tp-notify-page">
      <style>{`
        .tp-notify-page { position: relative; margin: -28px -32px; padding: 32px; min-height: calc(100% + 56px); box-sizing: border-box; }
        @media (max-width: 820px) { .tp-notify-page { margin: -18px -16px; padding: 24px; min-height: calc(100% + 36px); } }
        @media (max-width: 640px) { .tp-notify-page { padding: 20px 16px; } }
        .nt-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 16px; align-items: start; margin-bottom: 16px; }
        @media (max-width: 960px) { .nt-grid { grid-template-columns: 1fr; } }
        .nt-side { display: flex; flex-direction: column; gap: 16px; position: sticky; top: 16px; }
        @media (max-width: 960px) { .nt-side { position: static; } }
        .nt-step { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 700; color: ${TP.navy}; margin-bottom: 14px; }
        .nt-step span { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(90deg, ${TP.blue}, ${TP.teal}); color: #FFFFFF; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; }
        .nt-label { display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: ${TP.secondaryText}; margin: 14px 0 6px; }
        .nt-label:first-child { margin-top: 0; }
        .nt-select { width: 100%; min-height: 44px; }
        .nt-lang { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
        .nt-lang-switch { display: inline-flex; border: 1px solid ${TP.border}; border-radius: 10px; overflow: hidden; }
        .nt-lang-switch button { border: none; background: #FFFFFF; color: ${TP.navy}; font: inherit; font-size: 13px; font-weight: 600; padding: 0 14px; min-height: 38px; cursor: pointer; }
        .nt-lang-switch button + button { border-left: 1px solid ${TP.border}; }
        .nt-lang-switch button[aria-pressed="true"] { background: linear-gradient(90deg, ${TP.blue}, ${TP.teal}); color: #FFFFFF; }
        .nt-lang-switch button:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: -2px; }
        .nt-lang-switch-sm button { min-height: 32px; padding: 0 10px; font-size: 12px; }
        .nt-dv-btn { font-family: ${THAANA_FONT}; font-size: 15px !important; }
        .lc-input.nt-dv { font-family: ${THAANA_FONT}; font-size: 16px; line-height: 1.8; }
        .nt-text { font-family: ${THAANA_FONT}; }
        .nt-textarea { min-height: 110px; resize: vertical; font: inherit; font-size: 14px; line-height: 1.5; }
        .nt-meta { font-size: 12px; color: ${TP.secondaryText}; margin-top: 4px; display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
        .nt-link { border: none; background: none; color: ${TP.blue}; font: inherit; font-weight: 600; cursor: pointer; padding: 0; }
        .nt-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .nt-chip { border: 1px solid ${TP.border}; background: #FFFFFF; color: ${TP.navy}; border-radius: 999px; padding: 8px 14px; min-height: 40px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .nt-chip-sm { min-height: 34px; padding: 5px 12px; }
        .nt-chip:not(.nt-chip-on):hover { background: #F3F9FD; }
        .nt-chip-on { background: linear-gradient(90deg, ${TP.blue}, ${TP.teal}); color: #FFFFFF; border-color: transparent; }
        .nt-chip:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
        .nt-btn-sm { height: 40px; min-height: 40px; padding: 0 14px; font-size: 13.5px; gap: 6px; }
        .nt-save-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 14px; padding-top: 14px; border-top: 1px solid #E3EEF8; }
        .nt-toggle { display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px solid ${TP.border}; border-radius: 12px; cursor: pointer; font-size: 14px; color: #1B2733; min-height: 44px; box-sizing: border-box; }
        .nt-toggle input { width: 18px; height: 18px; accent-color: ${TP.blue}; flex: none; }
        .nt-toggle-disabled { opacity: 0.55; cursor: not-allowed; }
        .nt-toggle small { display: block; color: ${TP.secondaryText}; font-size: 12px; }
        .nt-channels { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        @media (max-width: 1200px) { .nt-channels { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 520px) { .nt-channels { grid-template-columns: 1fr; } }
        .nt-class-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; max-height: 320px; overflow: auto; }
        .nt-class { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border: 1px solid ${TP.border}; border-radius: 12px; cursor: pointer; font-size: 14px; color: #1B2733; }
        .nt-class input { width: 17px; height: 17px; accent-color: ${TP.blue}; flex: none; margin-top: 2px; }
        .nt-class small { display: block; color: ${TP.secondaryText}; font-size: 12px; }
        .nt-class-on { border-color: ${TP.blue}; background: #F3F9FD; }
        .nt-people { max-height: 300px; overflow: auto; border: 1px solid ${TP.border}; border-radius: 12px; margin-top: 8px; }
        .nt-person { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-top: 1px solid #E3EEF8; font-size: 14px; cursor: pointer; }
        .nt-person:first-child { border-top: none; }
        .nt-person input { width: 17px; height: 17px; accent-color: ${TP.blue}; flex: none; }
        .nt-person-sub { color: ${TP.secondaryText}; font-size: 12px; }
        .nt-search { display: flex; align-items: center; gap: 8px; border: 1px solid ${TP.border}; border-radius: 10px; padding: 0 11px; color: ${TP.secondaryText}; background: #FFFFFF; }
        .nt-search input { border: none; outline: none; font: inherit; font-size: 14px; min-height: 40px; flex: 1; min-width: 0; background: transparent; }
        .nt-names { max-height: 340px; overflow: auto; border: 1px solid ${TP.border}; border-radius: 12px; }
        .nt-name { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) 22px; gap: 10px; align-items: center; padding: 8px 12px; border-top: 1px solid #E3EEF8; }
        .nt-name:first-child { border-top: none; }
        .nt-name-en { font-size: 14px; color: #1B2733; overflow-wrap: anywhere; }
        .nt-name .lc-input { min-height: 40px; padding: 4px 10px; }
        .nt-name-state { color: #B7791F; font-size: 20px; text-align: center; line-height: 1; }
        .nt-name-ok .nt-name-state { color: #1E8E5A; }
        @media (max-width: 520px) { .nt-name { grid-template-columns: minmax(0, 1fr) 22px; } .nt-name .lc-input { grid-column: 1; grid-row: 2; } .nt-name-state { grid-row: 1 / span 2; grid-column: 2; } }
        .nt-pager { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: ${TP.secondaryText}; font-variant-numeric: tabular-nums; }
        .nt-summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 14px 0; }
        .nt-stat { background: #F3F9FD; border-radius: 12px; padding: 10px; text-align: center; color: ${TP.navy}; }
        .nt-stat b { display: block; font-size: 18px; color: ${TP.navy}; font-variant-numeric: tabular-nums; }
        .nt-stat span { font-size: 12px; color: ${TP.secondaryText}; }
        .nt-status { display: flex; gap: 10px; align-items: flex-start; font-size: 13.5px; color: #1B2733; line-height: 1.45; }
        .nt-status small { color: ${TP.secondaryText}; font-size: 12px; display: block; margin-top: 2px; }
        .nt-empty { display: flex; gap: 14px; align-items: center; color: ${TP.secondaryText}; margin-bottom: 16px; }
        .nt-empty b { display: block; color: ${TP.navy}; font-size: 15px; }
        .nt-empty span { font-size: 13.5px; }
        .nt-editor { margin-bottom: 16px; border: 2px solid ${TP.blue}; }
        .nt-tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; margin-bottom: 16px; }
        .nt-tpl-card { display: flex; flex-direction: column; gap: 8px; margin: 0; }
        .nt-tpl-name { font-size: 15.5px; font-weight: 700; color: ${TP.navy}; }
        .nt-tpl-langs { display: flex; gap: 6px; }
        .nt-tpl-snippet { font-size: 13px; color: #33475B; background: #F7FBFE; border-radius: 10px; padding: 8px 10px; white-space: pre-wrap; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.7; }
        .nt-tpl-missing { font-size: 12.5px; color: ${TP.secondaryText}; font-style: italic; padding: 2px 2px; }
        .nt-tpl-actions { display: flex; gap: 8px; margin-top: auto; padding-top: 6px; }
        .nt-auto { padding: 0; margin-bottom: 16px; overflow: hidden; }
        .nt-auto-head { width: 100%; display: flex; gap: 10px; align-items: flex-start; text-align: left; background: none; border: none; font: inherit; padding: 16px 18px; cursor: pointer; color: ${TP.navy}; }
        .nt-auto-head:hover { background: #F7FBFE; }
        .nt-auto-head small { display: block; color: ${TP.secondaryText}; font-size: 12.5px; margin-top: 2px; }
        .nt-hist { padding: 0; overflow: hidden; }
        .nt-hist-head { padding: 14px 18px; border-bottom: 1px solid #E3EEF8; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
        .nt-hist-title { font-size: 15px; font-weight: 700; color: ${TP.navy}; }
        .nt-bulk { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 18px; background: #F7FBFE; border-bottom: 1px solid #E3EEF8; font-size: 13.5px; }
        .nt-bulk-all { display: flex; align-items: center; gap: 10px; cursor: pointer; color: ${TP.navy}; font-weight: 600; }
        .nt-bulk-all input, .nt-row-check { width: 18px; height: 18px; accent-color: ${TP.blue}; flex: none; cursor: pointer; }
        .nt-row { border-top: 1px solid #E3EEF8; }
        .nt-row:first-of-type { border-top: none; }
        .nt-row-on { background: #F3F9FD; }
        .nt-row-line { display: flex; align-items: flex-start; padding-left: 18px; }
        .nt-row-check { margin-top: 16px; }
        .nt-row-btn { flex: 1; min-width: 0; text-align: left; background: none; border: none; font: inherit; padding: 14px 18px 14px 10px; display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; gap: 10px; align-items: start; cursor: pointer; color: #1B2733; }
        .nt-row-btn:hover { background: #F7FBFE; }
        .nt-row-title { font-weight: 600; font-size: 14px; }
        .nt-row-body { font-size: 13px; color: ${TP.secondaryText}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nt-row-meta { font-size: 12px; color: ${TP.secondaryText}; margin-top: 4px; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; }
        .nt-badges { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
        .nt-badge { font-size: 11.5px; font-weight: 600; padding: 3px 8px; border-radius: 999px; background: #EAF3FB; color: ${TP.navy}; white-space: nowrap; }
        .nt-badge-off { background: #F1F3F5; color: #8A97A5; }
        .nt-badge-warn { background: #FFF4E0; color: #8A5A00; }
        .nt-badge-bad { background: #FDECEC; color: #A32020; }
        .nt-detail { padding: 0 18px 16px 74px; }
        .nt-detail-body { unicode-bidi: plaintext; text-align: start; white-space: pre-wrap; font-size: 14px; color: #1B2733; background: #F7FBFE; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; line-height: 1.6; }
        .nt-detail-body.nt-text { line-height: 1.9; }
        .nt-detail table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .nt-detail th { text-align: left; color: ${TP.secondaryText}; font-weight: 600; font-size: 12px; padding: 6px 8px; border-bottom: 1px solid #E3EEF8; }
        .nt-detail td { padding: 6px 8px; border-bottom: 1px solid #F0F5FA; }
        .nt-detail-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
        @media (max-width: 640px) { .nt-detail { padding-left: 18px; } .nt-row-btn { grid-template-columns: 18px minmax(0, 1fr); } .nt-badges { grid-column: 2; justify-content: flex-start; } }
      `}</style>

      <div className="tp-header">
        <div className="tp-title-group">
          <span className="tp-title-icon" aria-hidden="true"><Bell size={22} /></span>
          <div>
            <h1 className="tp-title">Notifications</h1>
            <div className="tp-subtext" style={{ margin: 0 }}>Send a message in English or Dhivehi to classes or chosen students — in the app, by SMS and by email.</div>
          </div>
        </div>
      </div>

      <div className="tp-segment" role="tablist" aria-label="Notifications">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`tp-segment-btn ${tab === t.key ? "tp-segment-btn-active" : ""}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* Kept mounted so a half-written message survives a look at another tab. */}
      <div hidden={tab !== "compose"}>
        <SendTab
          students={students} teachers={teachers} classes={classes}
          templates={templates} setTemplates={setTemplates} automatic={automatic}
          dvNames={dvNames} monthKey={monthKey} showToast={showToast} onSent={onSent} start={start}
        />
      </div>
      {tab === "templates" && (
        <TemplatesTab
          templates={templates} setTemplates={setTemplates} students={students} teachers={teachers}
          dvNames={dvNames} monthKey={monthKey} showToast={showToast} onSent={onSent}
          onUse={sendWith} onUseAutomatic={sendAutomatic}
        />
      )}
      {tab === "history" && <HistoryTab showToast={showToast} reloadKey={historyKey} />}
      {tab === "reminders" && <PaymentReminders students={students} teachers={teachers} showToast={showToast} onSent={onSent} />}
    </div>
  );
}
