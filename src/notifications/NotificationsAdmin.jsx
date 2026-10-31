// Admin → Notifications: write one message, pick who gets it, and deliver it
// in the app (bell in the teacher / student portals), by SMS and/or by email.
// SMS goes through the `send-sms` Edge Function (MessageOwl), which holds the
// API key; email through the site's Worker (Cloudflare Email Service).

import { useState, useEffect, useCallback, useMemo } from "react";
import { Bell, Send, RotateCw, Search, Smartphone, MessageSquare, Trash2, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Mail } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { TP } from "../App.jsx";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { THAANA_FONT, loadThaanaFont } from "../exams/reportStrings.js";
import { thaanaChange, hasThaana } from "./thaanaKeyboard.js";
import { createNotification, sendPendingSms, sendPendingEmail, loadEmailStatus, loadTemplates, loadDvNames } from "./smsSend.js";
import { SmsTemplates, PaymentReminders } from "./SmsTemplates.jsx";
import { smsParts, fillTemplate, TEMPLATES, DEFAULT_TEMPLATE_BODIES, isCustomKey, customName } from "./templates.js";
import { maldivesMonth } from "../dates.js";

// Has {name}, {fee}, … to fill in for each recipient.
const hasPlaceholders = (text) => /\{\w+\}/.test(text);

const AUDIENCES = [
  { key: "everyone", label: "Everyone" },
  { key: "students", label: "All students" },
  { key: "teachers", label: "All teachers" },
  { key: "class", label: "A class" },
  { key: "people", label: "Selected people" },
  { key: "numbers", label: "Phone numbers" },
];

// A recipient left "sending" this long was cut off mid-send and can be sent
// again (same 10 minutes as send-sms and /api/email).
const isStaleClaim = (at) => !at || Date.now() - new Date(at).getTime() > 10 * 60 * 1000;
const STATUS_LABEL = { none: "—", pending: "Pending", sending: "Sending…", sent: "Sent", failed: "Failed", no_phone: "No number", no_email: "No email" };

function fmtWhen(iso) {
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function ServiceStatus({ status, okText, okDetail, notText, detail }) {
  if (!status) return <div className="lc-loading-row"><span className="lc-spinner"></span>Checking…</div>;
  return status.configured ? (
    <div className="nt-status">
      <CheckCircle2 size={20} color="#1E8E5A" aria-hidden="true" style={{ flex: "none" }} />
      <div>{okText}{okDetail && <small>{okDetail}</small>}</div>
    </div>
  ) : (
    <div className="nt-status">
      <AlertTriangle size={20} color="#B7791F" aria-hidden="true" style={{ flex: "none" }} />
      <div>{notText}<small>{detail}</small></div>
    </div>
  );
}

const TABS = [
  { key: "compose", label: "New message" },
  { key: "reminders", label: "Payment reminders" },
  { key: "templates", label: "Message templates" },
];

// initialTab: "compose" | "reminders" | "templates" (e.g. from Registrations → "Change the standard message").
export function AdminNotifications({ students = [], teachers = [], classes = [], showToast, initialTab = "compose" }) {
  const [tab, setTab] = useState(initialTab);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dhivehi, setDhivehi] = useState(false); // typing in Thaana
  const [audience, setAudience] = useState("everyone");
  const [classKey, setClassKey] = useState("");
  const [picked, setPicked] = useState({}); // `s:<id>` | `t:<id>` → true
  const [peopleFilter, setPeopleFilter] = useState("");
  const [numbersText, setNumbersText] = useState("");
  const [inApp, setInApp] = useState(true);
  const [sms, setSms] = useState(false);
  const [email, setEmail] = useState(false);
  const [sending, setSending] = useState(false);

  const [smsStatus, setSmsStatus] = useState(null); // { configured, senderId } | { error }
  const [emailStatus, setEmailStatus] = useState(null); // { configured, from } | { error }
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [templates, setTemplates] = useState(null); // { [key]: row } — reloaded when New message opens
  const [dvNames, setDvNames] = useState({});
  const [templateKey, setTemplateKey] = useState("");

  const people = useMemo(() => [
    ...students.map((s) => ({ key: `s:${s.id}`, kind: "Student", student_id: s.id, user_id: s.userId || null, name: s.name, phone: s.phone || null, email: s.email || null, className: s.className || "" })),
    ...teachers.map((t) => ({ key: `t:${t.id}`, kind: "Teacher", teacher_id: t.id, user_id: t.userId || null, name: t.name, phone: t.phone || null, email: t.email || null, className: "" })),
  ].sort((a, b) => a.name.localeCompare(b.name)), [students, teachers]);

  const classOptions = useMemo(() => {
    const names = new Set([...classes.map((c) => c.name), ...students.map((s) => s.className)].filter(Boolean));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [classes, students]);

  // Everyone this message would go to, right now.
  const recipients = useMemo(() => {
    if (audience === "numbers") {
      const nums = [...new Set(numbersText.split(/[\s,;]+/).map((n) => n.trim()).filter(Boolean))];
      return nums.map((n) => ({ key: `n:${n}`, kind: "Number", user_id: null, name: n, phone: n }));
    }
    if (audience === "everyone") return people;
    if (audience === "students") return people.filter((p) => p.kind === "Student");
    if (audience === "teachers") return people.filter((p) => p.kind === "Teacher");
    if (audience === "class") return classKey ? people.filter((p) => p.kind === "Student" && p.className === classKey) : [];
    return people.filter((p) => picked[p.key]);
  }, [audience, people, classKey, picked, numbersText]);

  const withLogin = recipients.filter((r) => r.user_id).length;
  const withPhone = recipients.filter((r) => r.phone).length;
  const withEmail = recipients.filter((r) => r.email).length;
  const useInApp = inApp && audience !== "numbers";
  const useSms = sms || audience === "numbers";
  const useEmail = email && audience !== "numbers";

  const audienceLabel = () => {
    if (audience === "class") return `Class: ${classKey}`;
    if (audience === "people") return recipients.length === 1 ? recipients[0].name : `${recipients.length} selected people`;
    if (audience === "numbers") return recipients.length === 1 ? recipients[0].phone : `${recipients.length} phone numbers`;
    return AUDIENCES.find((a) => a.key === audience).label;
  };

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*, notification_recipients(id, name, phone, email, email_status, email_error, email_claimed_at, body, user_id, read_at, sms_status, sms_error, sms_claimed_at, student_id, teacher_id)")
      .neq("audience", "admin_alert") // new slip / review alerts sent to admins (they live in the bell)
      .order("created_at", { ascending: false })
      .limit(100);
    setLoadError(!!error);
    setHistory(data || []);
    setLoading(false);
  }, []);

  const loadSmsStatus = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("send-sms", { body: { action: "status" } });
    setSmsStatus(error ? { error: true } : data);
    setEmailStatus(await loadEmailStatus());
  }, []);

  useEffect(() => { loadThaanaFont(); loadHistory(); loadSmsStatus(); loadDvNames().then(setDvNames); }, [loadHistory, loadSmsStatus]);
  useEffect(() => { if (tab === "compose") loadTemplates().then(setTemplates); }, [tab]);

  // Templates to start a message from: your own first, then the built-in ones.
  const templateOptions = useMemo(() => {
    if (!templates) return [];
    const own = Object.keys(templates).filter(isCustomKey).sort((a, b) => customName(a).localeCompare(customName(b)))
      .map((key) => ({ key, label: customName(key), body: templates[key].body }));
    const builtIn = TEMPLATES.map((d) => ({ key: d.key, label: d.label, body: templates[d.key]?.body || DEFAULT_TEMPLATE_BODIES[d.key] || "" }));
    return [...own, ...builtIn].filter((t) => t.body.trim());
  }, [templates]);

  const applyTemplate = async (key) => {
    const t = templateOptions.find((x) => x.key === key);
    if (!t) { setTemplateKey(""); return; }
    if (body.trim() && body !== t.body && !(await confirmDialog({ title: "Replace your message?", message: `The message box will be replaced with “${t.label}”.`, confirmLabel: "Replace", danger: false }))) return;
    setTemplateKey(key);
    setBody(t.body);
    setDhivehi(hasThaana(t.body));
  };

  // Each recipient's own wording when the message has {name}, {fee}, …
  const studentsById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const personalise = (r) => {
    const s = r.student_id ? studentsById.get(r.student_id) : r.teacher_id ? { name: r.name } : {};
    const teacherName = teachers.find((t) => t.id === s?.teacherId)?.name || "";
    return fillTemplate(body.trim(), s || {}, { teacherName, monthKey: maldivesMonth(), dvNames });
  };
  const personal = hasPlaceholders(body);
  const preview = personal && recipients[0] ? personalise(recipients[0]) : body;
  const parts = smsParts(title ? `${title}\n${preview}` : preview);

  const send = async () => {
    if (!body.trim()) { showToast("Write a message first."); return; }
    if (!recipients.length) { showToast("Choose who should get it."); return; }
    if (!useInApp && !useSms && !useEmail) { showToast("Pick in the app, SMS or email."); return; }
    const how = [useInApp && "in the app", useSms && "by SMS", useEmail && "by email"].filter(Boolean).join(", ").replace(/, ([^,]*)$/, " and $1");
    const ok = await confirmDialog({
      title: "Send notification?",
      message: `Send to ${recipients.length} recipient${recipients.length === 1 ? "" : "s"} ${how}?${useSms ? ` Each SMS is ${parts} part${parts === 1 ? "" : "s"}.` : ""}`,
      confirmLabel: "Send",
      danger: false,
    });
    if (!ok) return;

    setSending(true);
    const { ok: sent, message: smsMsg } = await createNotification({
      title: title.trim(), body: body.trim(), audience, audienceLabel: audienceLabel(),
      inApp: useInApp, sms: useSms, email: useEmail,
      recipients: personal ? recipients.map((r) => ({ ...r, body: personalise(r) })) : recipients,
    });
    setSending(false);
    if (!sent) { showToast(smsMsg); return; }
    setTitle(""); setBody(""); setPicked({}); setNumbersText(""); setTemplateKey("");
    showToast(`Sent to ${recipients.length}.${smsMsg ? " " + smsMsg : ""}`);
    loadHistory();
  };

  const retry = async (n, send) => {
    setBusyId(n.id);
    showToast(await send(n.id));
    setBusyId(null);
    loadHistory();
  };

  const remove = async (n) => {
    const ok = await confirmDialog({ title: "Delete notification?", message: "It will disappear from everyone's inbox. SMS already sent can't be recalled.", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    setBusyId(n.id);
    const { error } = await supabase.from("notifications").delete().eq("id", n.id);
    setBusyId(null);
    if (error) { showToast("Couldn't delete."); return; }
    setHistory((h) => h.filter((x) => x.id !== n.id));
  };

  const filteredPeople = people.filter((p) => {
    const q = peopleFilter.trim().toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.phone || "").includes(q) || p.className.toLowerCase().includes(q);
  });

  return (
    <div className="tp-notify-page">
      <style>{`
        .tp-notify-page { position: relative; margin: -28px -32px; padding: 32px; min-height: calc(100% + 56px); box-sizing: border-box; }
        @media (max-width: 820px) { .tp-notify-page { margin: -18px -16px; padding: 24px; min-height: calc(100% + 36px); } }
        @media (max-width: 640px) { .tp-notify-page { padding: 20px 16px; } }
        .nt-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 16px; align-items: start; margin-bottom: 16px; }
        @media (max-width: 960px) { .nt-grid { grid-template-columns: 1fr; } }
        .nt-label { display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: ${TP.secondaryText}; margin: 14px 0 6px; }
        .nt-label:first-child { margin-top: 0; }
        .nt-lang { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
        .nt-lang-switch { display: inline-flex; border: 1px solid ${TP.border}; border-radius: 10px; overflow: hidden; }
        .nt-lang-switch button { border: none; background: #FFFFFF; color: ${TP.navy}; font: inherit; font-size: 13px; font-weight: 600; padding: 0 14px; min-height: 38px; cursor: pointer; }
        .nt-lang-switch button[aria-pressed="true"] { background: linear-gradient(90deg, ${TP.blue}, ${TP.teal}); color: #FFFFFF; }
        .nt-lang-switch button:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: -2px; }
        .nt-dv-btn { font-family: ${THAANA_FONT}; font-size: 15px !important; }
        .lc-input.nt-dv { font-family: ${THAANA_FONT}; font-size: 16px; line-height: 1.8; }
        .nt-text { font-family: ${THAANA_FONT}; }
        .nt-textarea { min-height: 110px; resize: vertical; font: inherit; font-size: 14px; line-height: 1.5; }
        .nt-meta { font-size: 12px; color: ${TP.secondaryText}; margin-top: 4px; display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
        .nt-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .nt-chip { border: 1px solid ${TP.border}; background: #FFFFFF; color: ${TP.navy}; border-radius: 999px; padding: 8px 14px; min-height: 40px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .nt-chip:not(.nt-chip-on):hover { background: #F3F9FD; }
        .nt-chip-on { background: linear-gradient(90deg, ${TP.blue}, ${TP.teal}); color: #FFFFFF; border-color: transparent; }
        .nt-chip:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
        .nt-toggle { display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px solid ${TP.border}; border-radius: 12px; cursor: pointer; font-size: 14px; color: #1B2733; min-height: 44px; box-sizing: border-box; }
        .nt-toggle input { width: 18px; height: 18px; accent-color: ${TP.blue}; }
        .nt-toggle-disabled { opacity: 0.55; cursor: not-allowed; }
        .nt-toggle small { display: block; color: ${TP.secondaryText}; font-size: 12px; }
        .nt-channels { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        @media (max-width: 1200px) { .nt-channels { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 520px) { .nt-channels { grid-template-columns: 1fr; } }
        .nt-people { max-height: 260px; overflow: auto; border: 1px solid ${TP.border}; border-radius: 12px; margin-top: 8px; }
        .nt-person { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-top: 1px solid #E3EEF8; font-size: 14px; cursor: pointer; }
        .nt-person:first-child { border-top: none; }
        .nt-person input { width: 17px; height: 17px; accent-color: ${TP.blue}; flex: none; }
        .nt-person-sub { color: ${TP.secondaryText}; font-size: 12px; }
        .nt-search { display: flex; align-items: center; gap: 8px; border: 1px solid ${TP.border}; border-radius: 10px; padding: 0 11px; color: ${TP.secondaryText}; }
        .nt-search input { border: none; outline: none; font: inherit; font-size: 14px; min-height: 40px; flex: 1; min-width: 0; background: transparent; }
        .nt-summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 4px 0 14px; }
        .nt-stat { background: #F3F9FD; border-radius: 12px; padding: 10px; text-align: center; }
        .nt-stat b { display: block; font-size: 22px; color: ${TP.navy}; font-variant-numeric: tabular-nums; }
        .nt-stat span { font-size: 12px; color: ${TP.secondaryText}; }
        .nt-status { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; color: #1B2733; line-height: 1.45; }
        .nt-status small { color: ${TP.secondaryText}; font-size: 12.5px; display: block; margin-top: 2px; }
        .nt-hist { padding: 0; overflow: hidden; }
        .nt-hist-head { padding: 16px 18px; border-bottom: 1px solid #E3EEF8; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .nt-hist-title { font-size: 15px; font-weight: 700; color: ${TP.navy}; }
        .nt-row { border-top: 1px solid #E3EEF8; }
        .nt-row:first-of-type { border-top: none; }
        .nt-row-btn { width: 100%; text-align: left; background: none; border: none; font: inherit; padding: 14px 18px; display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; gap: 10px; align-items: start; cursor: pointer; color: #1B2733; }
        .nt-row-btn:hover { background: #F7FBFE; }
        .nt-row-title { font-weight: 600; font-size: 14px; }
        .nt-row-body { font-size: 13px; color: ${TP.secondaryText}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nt-row-meta { font-size: 12px; color: ${TP.secondaryText}; margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px 12px; }
        .nt-badges { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
        .nt-badge { font-size: 11.5px; font-weight: 600; padding: 3px 8px; border-radius: 999px; background: #EAF3FB; color: ${TP.navy}; white-space: nowrap; }
        .nt-badge-warn { background: #FFF4E0; color: #8A5A00; }
        .nt-badge-bad { background: #FDECEC; color: #A32020; }
        .nt-detail { padding: 0 18px 16px 46px; }
        .nt-detail-body { white-space: pre-wrap; font-size: 14px; color: #1B2733; background: #F7FBFE; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; }
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
            <div className="tp-subtext" style={{ margin: 0 }}>Send a message to students, teachers or any number — in the app, by SMS, or both.</div>
          </div>
        </div>
      </div>

      <div className="tp-segment" role="tablist" aria-label="Notifications">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`tp-segment-btn ${tab === t.key ? "tp-segment-btn-active" : ""}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === "reminders" && <PaymentReminders students={students} teachers={teachers} showToast={showToast} onSent={loadHistory} />}
      {tab === "templates" && <SmsTemplates students={students} teachers={teachers} showToast={showToast} onSent={loadHistory} />}

      {tab === "compose" && (
      <div className="nt-grid">
        <div className="tp-card">
          <label className="nt-label" htmlFor="nt-template">Start from a template</label>
          <select id="nt-template" className="lc-select" style={{ width: "100%", minHeight: "44px", marginBottom: "14px" }} value={templateKey} disabled={!templates} onChange={(e) => applyTemplate(e.target.value)}>
            <option value="">{templates ? (templateOptions.length ? "Choose a template…" : "No templates yet") : "Loading templates…"}</option>
            {templateOptions.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>

          <div className="nt-lang">
            <span className="nt-label" style={{ margin: 0 }}>Writing in</span>
            <span className="nt-lang-switch" role="group" aria-label="Writing language">
              <button type="button" aria-pressed={!dhivehi} onClick={() => setDhivehi(false)}>English</button>
              <button type="button" className="nt-dv-btn" lang="dv" aria-pressed={dhivehi} onClick={() => setDhivehi(true)}>ދިވެހި</button>
            </span>
          </div>
          {dhivehi && <div className="nt-meta" style={{ marginTop: "-8px", marginBottom: "10px" }}><span style={{ fontFamily: THAANA_FONT }}>Type with the Dhivehi phonetic layout — k → ކ, a → ަ, S → ށ. A Dhivehi phone keyboard works too.</span></div>}

          <label className="nt-label" htmlFor="nt-title">Title (optional)</label>
          <input id="nt-title" className={`lc-input ${dhivehi ? "nt-dv" : ""}`} dir={dhivehi ? "rtl" : "auto"} lang={dhivehi ? "dv" : undefined} value={title} maxLength={120} placeholder={dhivehi ? "މިސާލު: މާދަމާ ކްލާސް ނުހިންގޭނެ" : "e.g. Class cancelled tomorrow"} onChange={(e) => thaanaChange(e, title, setTitle, dhivehi)} />

          <label className="nt-label" htmlFor="nt-body">Message</label>
          <textarea id="nt-body" className={`lc-input nt-textarea ${dhivehi ? "nt-dv" : ""}`} dir={dhivehi ? "rtl" : "auto"} lang={dhivehi ? "dv" : undefined} value={body} placeholder={dhivehi ? "މެސެޖު ލިޔުއްވާ…" : "Write your message…"} onChange={(e) => { thaanaChange(e, body, setBody, dhivehi); setTemplateKey(""); }} />
          <div className="nt-meta">
            <span>{(title ? title.length + 1 : 0) + preview.length} characters</span>
            {useSms && body && <span>{parts} SMS part{parts === 1 ? "" : "s"} per person</span>}
          </div>
          {personal && (
            <>
              <span className="nt-label">Preview{recipients[0] ? ` — ${recipients[0].name}` : ""}</span>
              <div className={`nt-detail-body ${hasThaana(preview) ? "nt-text" : ""}`} dir="auto" style={{ marginBottom: "4px" }}>{recipients[0] ? preview : "Choose who gets it to see their message."}</div>
              <div className="nt-meta"><span>{"{name}"}, {"{fee}"} and the rest are filled in for each person.</span></div>
            </>
          )}

          <span className="nt-label">Send to</span>
          <div className="nt-chips" role="radiogroup" aria-label="Send to">
            {AUDIENCES.map((a) => (
              <button key={a.key} type="button" role="radio" aria-checked={audience === a.key} className={`nt-chip ${audience === a.key ? "nt-chip-on" : ""}`} onClick={() => setAudience(a.key)}>{a.label}</button>
            ))}
          </div>

          {audience === "class" && (
            <>
              <label className="nt-label" htmlFor="nt-class">Class</label>
              <select id="nt-class" className="lc-select" value={classKey} onChange={(e) => setClassKey(e.target.value)}>
                <option value="">Choose a class…</option>
                {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </>
          )}

          {audience === "people" && (
            <>
              <span className="nt-label">Choose people ({recipients.length} selected)</span>
              <label className="nt-search">
                <Search size={15} aria-hidden="true" />
                <input type="search" placeholder="Search name, class or phone" value={peopleFilter} onChange={(e) => setPeopleFilter(e.target.value)} aria-label="Search people" />
              </label>
              <div className="nt-people">
                {filteredPeople.length ? filteredPeople.map((p) => (
                  <label key={p.key} className="nt-person">
                    <input type="checkbox" checked={!!picked[p.key]} onChange={(e) => setPicked((cur) => ({ ...cur, [p.key]: e.target.checked }))} />
                    <span style={{ minWidth: 0 }}>
                      {p.name}
                      <div className="nt-person-sub">{[p.kind, p.className, p.phone || "no phone"].filter(Boolean).join(" · ")}</div>
                    </span>
                  </label>
                )) : <div className="nt-person" style={{ cursor: "default" }}>No matches.</div>}
              </div>
            </>
          )}

          {audience === "numbers" && (
            <>
              <label className="nt-label" htmlFor="nt-numbers">Phone numbers</label>
              <textarea id="nt-numbers" className="lc-input nt-textarea" style={{ minHeight: "80px" }} value={numbersText} placeholder="7771234, 9601234  (one per line or separated by commas)" onChange={(e) => setNumbersText(e.target.value)} />
              <div className="nt-meta"><span>Phone numbers get SMS only — there's no app inbox for them.</span></div>
            </>
          )}

          <span className="nt-label">Deliver by</span>
          <div className="nt-channels">
            <label className={`nt-toggle ${audience === "numbers" ? "nt-toggle-disabled" : ""}`}>
              <input type="checkbox" checked={useInApp} disabled={audience === "numbers"} onChange={(e) => setInApp(e.target.checked)} />
              <MessageSquare size={18} aria-hidden="true" color={TP.blue} />
              <span>In the app<small>Bell in the student / teacher portal</small></span>
            </label>
            <label className={`nt-toggle ${audience === "numbers" ? "nt-toggle-disabled" : ""}`}>
              <input type="checkbox" checked={useSms} disabled={audience === "numbers"} onChange={(e) => setSms(e.target.checked)} />
              <Smartphone size={18} aria-hidden="true" color={TP.blue} />
              <span>SMS<small>Text message via MessageOwl</small></span>
            </label>
            <label className={`nt-toggle ${audience === "numbers" ? "nt-toggle-disabled" : ""}`}>
              <input type="checkbox" checked={useEmail} disabled={audience === "numbers"} onChange={(e) => setEmail(e.target.checked)} />
              <Mail size={18} aria-hidden="true" color={TP.blue} />
              <span>Email<small>From {emailStatus?.from || "the class address"}</small></span>
            </label>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="tp-card">
            <div className="nt-hist-title" style={{ marginBottom: "10px" }}>Recipients</div>
            <div className="nt-summary">
              <div className="nt-stat"><b>{recipients.length}</b><span>people</span></div>
              <div className="nt-stat"><b>{audience === "numbers" ? "—" : withLogin}</b><span>have app login</span></div>
              <div className="nt-stat"><b>{withPhone}</b><span>have a phone</span></div>
              <div className="nt-stat"><b>{audience === "numbers" ? "—" : withEmail}</b><span>have an email</span></div>
            </div>
            {useInApp && recipients.length > withLogin && audience !== "numbers" && (
              <div className="nt-meta" style={{ marginBottom: "10px" }}><span>{recipients.length - withLogin} without a login won't see it in the app{useSms || useEmail ? ` but will get the ${useSms ? "SMS" : "email"} if they have ${useSms ? "a number" : "an address"}` : " — turn on SMS or email to reach them"}.</span></div>
            )}
            <button type="button" className="tp-btn-gradient" style={{ width: "100%", justifyContent: "center" }} disabled={sending} onClick={send}>
              <Send size={16} aria-hidden="true" />
              {sending ? "Sending…" : `Send to ${recipients.length}`}
            </button>
          </div>

          <div className="tp-card">
            <div className="nt-hist-title" style={{ marginBottom: "10px" }}>Delivery services</div>
            <ServiceStatus
              status={smsStatus}
              okText="SMS: MessageOwl connected"
              okDetail={smsStatus?.senderId && `Sender name: ${smsStatus.senderId}`}
              notText={smsStatus?.error ? "SMS: couldn't reach the SMS service." : "SMS: MessageOwl not connected yet."}
              detail="SMS you send now are saved as pending. Once the MessageOwl API key is added, open a notification below and press “Send pending SMS”."
            />
            <div style={{ height: "12px" }} />
            <ServiceStatus
              status={emailStatus}
              okText="Email: Cloudflare connected"
              okDetail={emailStatus?.from && `Sent from ${emailStatus.from}`}
              notText={emailStatus?.error ? "Email: service not reachable from here." : "Email: Cloudflare email not set up yet."}
              detail={emailStatus?.error ? "Email sends from the live site (aflaahqc.com). Emails sent here are saved as pending — send them from the live site." : "Emails you send now are saved as pending until Cloudflare Email Sending is turned on for aflaahqc.com."}
            />
          </div>
        </div>
      </div>
      )}

      <div className="tp-card nt-hist">
        <div className="nt-hist-head">
          <div className="nt-hist-title">Sent notifications</div>
          <button type="button" className="lc-btn" disabled={loading} onClick={() => { loadHistory(); loadSmsStatus(); }}>
            <RotateCw size={14} aria-hidden="true" style={{ marginRight: "4px", verticalAlign: "-2px" }} />Reload
          </button>
        </div>
        {loading ? (
          <div className="lc-loading-row" style={{ padding: "16px 18px" }}><span className="lc-spinner"></span>Loading…</div>
        ) : loadError ? (
          <div style={{ padding: "16px 18px", color: "#A32020", fontSize: "14px" }}>Couldn't load notifications. Press Reload to try again.</div>
        ) : !history.length ? (
          <div style={{ padding: "16px 18px", color: TP.secondaryText, fontSize: "14px" }}>Nothing sent yet.</div>
        ) : history.map((n) => {
          const recs = n.notification_recipients || [];
          const inAppRecs = recs.filter((r) => r.user_id);
          const read = inAppRecs.filter((r) => r.read_at).length;
          const count = (s) => recs.filter((r) => r.sms_status === s).length;
          const pending = count("pending") + count("failed") + recs.filter((r) => r.sms_status === "sending" && isStaleClaim(r.sms_claimed_at)).length;
          const eCount = (s) => recs.filter((r) => r.email_status === s).length;
          const ePending = eCount("pending") + eCount("failed") + recs.filter((r) => r.email_status === "sending" && isStaleClaim(r.email_claimed_at)).length;
          const open = openId === n.id;
          return (
            <div key={n.id} className="nt-row">
              <button type="button" className="nt-row-btn" aria-expanded={open} onClick={() => setOpenId(open ? null : n.id)}>
                {open ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
                <span style={{ minWidth: 0 }}>
                  <div className={`nt-row-title ${hasThaana(n.title || n.body) ? "nt-text" : ""}`} dir="auto">{n.title || n.body.split("\n")[0].slice(0, 80)}</div>
                  {n.title && <div className={`nt-row-body ${hasThaana(n.body) ? "nt-text" : ""}`} dir="auto">{n.body}</div>}
                  <div className="nt-row-meta"><span>{fmtWhen(n.created_at)}</span><span>{n.audience_label}</span><span>{recs.length} recipient{recs.length === 1 ? "" : "s"}</span></div>
                </span>
                <span className="nt-badges">
                  {n.send_in_app && <span className="nt-badge">App · {read}/{inAppRecs.length} read</span>}
                  {n.send_sms && <span className="nt-badge">SMS · {count("sent")} sent</span>}
                  {n.send_sms && count("pending") > 0 && <span className="nt-badge nt-badge-warn">{count("pending")} pending</span>}
                  {n.send_sms && count("failed") > 0 && <span className="nt-badge nt-badge-bad">{count("failed")} failed</span>}
                  {n.send_email && <span className="nt-badge">Email · {eCount("sent")} sent</span>}
                  {n.send_email && eCount("pending") > 0 && <span className="nt-badge nt-badge-warn">{eCount("pending")} email pending</span>}
                  {n.send_email && eCount("failed") > 0 && <span className="nt-badge nt-badge-bad">{eCount("failed")} email failed</span>}
                </span>
              </button>
              {open && (
                <div className="nt-detail">
                  <div className={`nt-detail-body ${hasThaana(n.title + n.body) ? "nt-text" : ""}`} dir="auto">{n.title ? `${n.title}\n\n${n.body}` : n.body}</div>
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead><tr><th>Name</th><th>Phone</th>{n.send_email && <th>Email</th>}{n.send_in_app && <th>App</th>}{n.send_sms && <th>SMS</th>}{n.send_email && <th>Email status</th>}</tr></thead>
                      <tbody>
                        {recs.map((r) => (
                          <tr key={r.id}>
                            <td>
                              {r.name}
                              {r.body && <div className={hasThaana(r.body) ? "nt-text" : ""} dir="auto" style={{ fontSize: "12px", color: TP.secondaryText, whiteSpace: "pre-wrap", maxWidth: "420px" }}>{r.body}</div>}
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>{r.phone || "—"}</td>
                            {n.send_email && <td style={{ overflowWrap: "anywhere" }}>{r.email || "—"}</td>}
                            {n.send_in_app && <td>{!r.user_id ? "No login" : r.read_at ? "Read" : "Unread"}</td>}
                            {n.send_sms && <td title={r.sms_error || undefined}>{STATUS_LABEL[r.sms_status] || r.sms_status}</td>}
                            {n.send_email && <td title={r.email_error || undefined}>{STATUS_LABEL[r.email_status] || r.email_status}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="nt-detail-actions">
                    {n.send_sms && pending > 0 && (
                      <button type="button" className="tp-btn-outline" disabled={busyId === n.id} onClick={() => retry(n, sendPendingSms)}>
                        <Smartphone size={16} aria-hidden="true" />Send pending SMS ({pending})
                      </button>
                    )}
                    {n.send_email && ePending > 0 && (
                      <button type="button" className="tp-btn-outline" disabled={busyId === n.id} onClick={() => retry(n, sendPendingEmail)}>
                        <Mail size={16} aria-hidden="true" />Send pending email ({ePending})
                      </button>
                    )}
                    <button type="button" className="tp-btn-outline" style={{ color: "#A32020" }} disabled={busyId === n.id} onClick={() => remove(n)}>
                      <Trash2 size={16} aria-hidden="true" />Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
