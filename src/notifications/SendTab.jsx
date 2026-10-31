// Notifications → Send: pick a saved template (or write a message) in
// English, Dhivehi or both, choose the students, and send it in the app
// (with a phone notification), by SMS and/or by email. {name}, {fee}, … are
// filled in for each student.

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Send, Search, Smartphone, MessageSquare, Mail, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Save, Users, Check } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { TP } from "../App.jsx";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { hasThaana, thaanaChange } from "./thaanaKeyboard.js";
import { createNotification, loadEmailStatus, loadNameChecks, confirmNames } from "./smsSend.js";
import { nameToThaana } from "../exams/thaanaNames.js";
import { fillTemplate, smsParts, messageText } from "./templates.js";
import { saveMessageTemplate } from "./messageTemplates.js";
import { MessageFields, LanguageSwitch } from "./MessageFields.jsx";

const AUDIENCES = [
  { key: "students", label: "All students" },
  { key: "classes", label: "Classes" },
  { key: "people", label: "Choose students" },
  { key: "teachers", label: "All teachers" },
  { key: "numbers", label: "Phone numbers" },
];

const hasPlaceholders = (text) => /\{\w+\}/.test(text);

function ServiceStatus({ status, okText, okDetail, notText, detail }) {
  if (!status) return <div className="lc-loading-row"><span className="lc-spinner"></span>Checking…</div>;
  return status.configured ? (
    <div className="nt-status">
      <CheckCircle2 size={18} color="#1E8E5A" aria-hidden="true" style={{ flex: "none" }} />
      <div>{okText}{okDetail && <small>{okDetail}</small>}</div>
    </div>
  ) : (
    <div className="nt-status">
      <AlertTriangle size={18} color="#B7791F" aria-hidden="true" style={{ flex: "none" }} />
      <div>{notText}<small>{detail}</small></div>
    </div>
  );
}

// Step 3 of a Dhivehi message with {name}: each chosen person's name in
// Dhivehi, to correct and confirm before sending. rows: [{ name, auto, dv, verified }]
function NameCheck({ rows, setName, onConfirm, saving }) {
  const unchecked = rows.filter((r) => r.dv !== r.verified).length;
  return (
    <div className="tp-card">
      <div className="nt-step"><span>3</span>Check names in Dhivehi</div>
      <div className="nt-meta" style={{ margin: "-6px 0 10px" }}>
        <span>{unchecked ? `${unchecked} of ${rows.length} not checked yet — correct any that are wrong, then confirm.` : `All ${rows.length} names checked.`}</span>
      </div>
      <div className="nt-names">
        {rows.map((r) => {
          const ok = r.dv === r.verified;
          return (
            <div key={r.name} className={`nt-name ${ok ? "nt-name-ok" : ""}`}>
              <span className="nt-name-en">{r.name}</span>
              <input className="lc-input nt-dv" dir="rtl" lang="dv" value={r.dv} aria-label={`${r.name} in Dhivehi`}
                onChange={(e) => thaanaChange(e, r.dv, (v) => setName(r.name, v), true)} />
              <span className="nt-name-state" title={ok ? "Checked" : "Not checked yet"}>{ok ? <Check size={16} aria-hidden="true" /> : "•"}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "12px" }}>
        <button type="button" className="tp-btn-gradient nt-btn-sm" disabled={!unchecked || saving || rows.some((r) => !r.dv.trim())} onClick={onConfirm}>
          <Check size={15} aria-hidden="true" />{saving ? "Saving…" : unchecked ? `Confirm ${unchecked} name${unchecked === 1 ? "" : "s"}` : "All confirmed"}
        </button>
        <span className="nt-meta" style={{ margin: 0 }}><span>Saved for next time, the same as Admin → Language.</span></span>
      </div>
    </div>
  );
}

// templates: saved [{ id, name, en, dv }]; automatic: the same shape.
// start: { id, lang, n } — open with this template (from the Templates tab).
export function SendTab({ students, teachers, classes, templates, setTemplates, automatic, dvNames, monthKey, showToast, onSent, start }) {
  const [templateId, setTemplateId] = useState("");
  const [lang, setLang] = useState("dv");
  const [en, setEn] = useState("");
  const [dv, setDv] = useState("");
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("classes");
  const [classSet, setClassSet] = useState({}); // class name → true
  const [picked, setPicked] = useState({}); // `s:<id>` | `t:<id>` → true
  const [filter, setFilter] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [numbersText, setNumbersText] = useState("");
  const [inApp, setInApp] = useState(true);
  const [sms, setSms] = useState(false);
  const [email, setEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [saveName, setSaveName] = useState(null); // null, or the name being typed for "Save as template"
  const [savingTpl, setSavingTpl] = useState(false);
  const [nameChecks, setNameChecks] = useState(null); // { [name]: { dv, verified } }
  const [nameEdits, setNameEdits] = useState({}); // name → Dhivehi typed here
  const [savingNames, setSavingNames] = useState(false);
  const [smsStatus, setSmsStatus] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);

  useEffect(() => {
    supabase.functions.invoke("send-sms", { body: { action: "status" } }).then(({ data, error }) => setSmsStatus(error ? { error: true } : data));
    loadEmailStatus().then(setEmailStatus);
    loadNameChecks().then(setNameChecks);
  }, []);

  const allTemplates = useMemo(() => [...(templates || []), ...automatic], [templates, automatic]);
  const current = allTemplates.find((t) => t.id === templateId);
  const edited = current ? current.en !== en || current.dv !== dv : !!(en.trim() || dv.trim());

  const applyTemplate = useCallback(async (id, wantLang) => {
    const t = allTemplates.find((x) => x.id === id);
    if (!t) { setTemplateId(""); return; }
    // Ask only when there's writing of the admin's own that would be lost.
    const was = allTemplates.find((x) => x.id === templateId);
    const ownText = was ? was.en !== en || was.dv !== dv : !!(en.trim() || dv.trim());
    if (ownText && (en !== t.en || dv !== t.dv) && !(await confirmDialog({ title: "Replace your message?", message: `What you've written will be replaced with “${t.name}”.`, confirmLabel: "Replace", danger: false }))) return;
    setTemplateId(id);
    setEn(t.en);
    setDv(t.dv);
    setSaveName(null);
    const l = wantLang || lang;
    // Switch to a language the template has.
    if (l === "en" && !t.en.trim()) setLang("dv");
    else if (l === "dv" && !t.dv.trim()) setLang("en");
    else if (l === "both" && !(t.en.trim() && t.dv.trim())) setLang(t.dv.trim() ? "dv" : "en");
    else setLang(l);
  }, [allTemplates, templateId, en, dv, lang]);

  // "Send" on a template in the Templates tab — once it's in the list.
  const appliedStart = useRef(null);
  useEffect(() => {
    if (!start || appliedStart.current === start.n || !allTemplates.some((t) => t.id === start.id)) return;
    appliedStart.current = start.n;
    applyTemplate(start.id, start.lang);
  }, [start, allTemplates]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Who gets it ----
  const people = useMemo(() => [
    ...students.map((s) => ({ key: `s:${s.id}`, kind: "Student", student_id: s.id, user_id: s.userId || null, name: s.name, phone: s.phone || null, email: s.email || null, className: s.className || "" })),
    ...teachers.map((t) => ({ key: `t:${t.id}`, kind: "Teacher", teacher_id: t.id, user_id: t.userId || null, name: t.name, phone: t.phone || null, email: t.email || null, className: "" })),
  ].sort((a, b) => a.name.localeCompare(b.name)), [students, teachers]);

  const classOptions = useMemo(() => {
    const names = new Set([...classes.map((c) => c.name), ...students.map((s) => s.className)].filter(Boolean));
    return [...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((name) => ({ name, count: students.filter((s) => s.className === name).length }));
  }, [classes, students]);

  const recipients = useMemo(() => {
    if (audience === "numbers") {
      const nums = [...new Set(numbersText.split(/[\s,;]+/).map((n) => n.trim()).filter(Boolean))];
      return nums.map((n) => ({ key: `n:${n}`, kind: "Number", user_id: null, name: n, phone: n }));
    }
    if (audience === "students") return people.filter((p) => p.kind === "Student");
    if (audience === "teachers") return people.filter((p) => p.kind === "Teacher");
    if (audience === "classes") return people.filter((p) => p.kind === "Student" && classSet[p.className]);
    return people.filter((p) => picked[p.key]);
  }, [audience, people, classSet, picked, numbersText]);

  const shown = people.filter((p) => {
    const q = filter.trim().toLowerCase();
    if (filterClass && p.className !== filterClass) return false;
    return !q || p.name.toLowerCase().includes(q) || (p.phone || "").includes(q) || p.className.toLowerCase().includes(q);
  });

  const audienceLabel = () => {
    if (audience === "classes") { const names = Object.keys(classSet).filter((k) => classSet[k]); return names.length === 1 ? `Class: ${names[0]}` : `${names.length} classes: ${names.join(", ")}`; }
    if (audience === "people") return recipients.length === 1 ? recipients[0].name : `${recipients.length} chosen people`;
    if (audience === "numbers") return recipients.length === 1 ? recipients[0].phone : `${recipients.length} phone numbers`;
    return AUDIENCES.find((a) => a.key === audience).label;
  };

  // ---- The message for each person ----
  const studentsById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const raw = messageText(lang, en, dv);
  const personal = hasPlaceholders(raw);

  // Names in Dhivehi: what's typed here, else the saved correction, else the
  // automatic spelling.
  const nameRows = useMemo(() => {
    if (lang === "en" || !/\{name\}/.test(dv) || !nameChecks) return [];
    const names = [...new Set(recipients.filter((r) => r.student_id || r.teacher_id).map((r) => r.name.trim()).filter(Boolean))];
    return names.map((name) => {
      const auto = nameToThaana(name);
      const saved = nameChecks[name];
      return { name, auto, dv: nameEdits[name] ?? (saved?.dv || dvNames[name] || auto), verified: saved?.verified || "" };
    });
  }, [lang, dv, recipients, nameChecks, nameEdits, dvNames]);
  const dvNamesNow = useMemo(() => ({ ...dvNames, ...Object.fromEntries(nameRows.map((r) => [r.name, r.dv])) }), [dvNames, nameRows]);
  const uncheckedNames = nameRows.filter((r) => r.dv !== r.verified).length;

  const confirmAllNames = async () => {
    const rows = nameRows.filter((r) => r.dv !== r.verified);
    setSavingNames(true);
    const ok = await confirmNames(rows);
    setSavingNames(false);
    if (!ok) { showToast("Couldn't save the names. Please try again."); return; }
    setNameChecks((cur) => ({ ...cur, ...Object.fromEntries(rows.map((r) => [r.name, { dv: r.dv === r.auto ? "" : r.dv, verified: r.dv }])) }));
    showToast(`${rows.length} name${rows.length === 1 ? "" : "s"} confirmed.`);
  };

  const personalise = (r) => {
    const s = r.student_id ? studentsById.get(r.student_id) || {} : r.teacher_id ? { name: r.name } : {};
    const teacherName = teachers.find((t) => t.id === s.teacherId)?.name || "";
    return messageText(lang, en, dv, (text, l) => fillTemplate(text, s, { teacherName, monthKey, dvNames: dvNamesNow, dv: l === "dv" }));
  };
  const idx = Math.min(previewIdx, Math.max(recipients.length - 1, 0));
  const previewFor = recipients[idx];
  const preview = personal && previewFor ? personalise(previewFor) : raw;
  const parts = smsParts(title ? `${title}\n${preview}` : preview);

  const useInApp = inApp && audience !== "numbers";
  const useSms = sms || audience === "numbers";
  const useEmail = email && audience !== "numbers";
  const withLogin = recipients.filter((r) => r.user_id).length;
  const withPhone = recipients.filter((r) => r.phone).length;
  const withEmail = recipients.filter((r) => r.email).length;

  const send = async () => {
    if (!raw.trim()) { showToast(lang === "both" ? "Write the English and Dhivehi message first." : "Write a message first."); return; }
    if (!recipients.length) { showToast("Choose who should get it."); return; }
    if (!useInApp && !useSms && !useEmail) { showToast("Pick App, SMS or Email."); return; }
    if (uncheckedNames && !(await confirmDialog({
      title: "Some Dhivehi names aren't checked",
      message: `${uncheckedNames} name${uncheckedNames === 1 ? " hasn't" : "s haven't"} been checked in step 3. Send with the spelling shown there anyway?`,
      confirmLabel: "Send anyway", danger: false,
    }))) return;
    const how = [useInApp && "in the app", useSms && "by SMS", useEmail && "by email"].filter(Boolean).join(", ").replace(/, ([^,]*)$/, " and $1");
    if (!(await confirmDialog({
      title: "Send this message?",
      message: `To ${recipients.length} ${recipients.length === 1 ? "person" : "people"} ${how}.${useSms ? ` Each SMS is ${parts} part${parts === 1 ? "" : "s"}.` : ""}`,
      confirmLabel: "Send", danger: false,
    }))) return;
    setSending(true);
    const res = await createNotification({
      title: title.trim(), body: raw, audience, audienceLabel: audienceLabel(),
      inApp: useInApp, sms: useSms, email: useEmail,
      recipients: personal ? recipients.map((r) => ({ ...r, body: personalise(r) })) : recipients,
    });
    setSending(false);
    if (!res.ok) { showToast(res.message); return; }
    setTitle(""); setEn(""); setDv(""); setTemplateId(""); setPicked({}); setNumbersText(""); setPreviewIdx(0);
    showToast(`Sent to ${recipients.length}.${res.message ? " " + res.message : ""}`);
    onSent();
  };

  // ---- Save what's written as a template ----
  const saveTemplate = async (asNew) => {
    const name = asNew ? (saveName || "").trim() : current.name;
    if (!name) { showToast("Give the template a name."); return; }
    if (asNew && (templates || []).some((t) => t.name.toLowerCase() === name.toLowerCase())) { showToast(`There's already a template called “${name}”.`); return; }
    setSavingTpl(true);
    const saved = await saveMessageTemplate({ id: asNew ? undefined : current.id, name, en, dv });
    setSavingTpl(false);
    if (!saved) { showToast("Couldn't save the template."); return; }
    setTemplates((cur) => [...(cur || []).filter((t) => t.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name)));
    setTemplateId(saved.id);
    setSaveName(null);
    showToast(`Template “${saved.name}” saved.`);
  };

  const canUpdate = current && !current.automatic && edited;

  return (
    <div className="nt-grid">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
        {/* 1. Message */}
        <div className="tp-card">
          <div className="nt-step"><span>1</span>Message</div>
          <label className="nt-label" htmlFor="nt-template">Template</label>
          <select id="nt-template" className="lc-select nt-select" value={templateId} disabled={templates === undefined} onChange={(e) => applyTemplate(e.target.value)}>
            <option value="">{templates === undefined ? "Loading templates…" : "Write a new message"}</option>
            {!!templates?.length && (
              <optgroup label="My templates">
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </optgroup>
            )}
            <optgroup label="Automatic messages">
              {automatic.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </optgroup>
          </select>

          <div className="nt-lang" style={{ margin: "14px 0 0" }}>
            <span className="nt-label" style={{ margin: 0 }}>Send in</span>
            <LanguageSwitch value={lang} onChange={setLang} label="Message language" />
          </div>
          {current && ((lang !== "en" && !current.dv.trim()) || (lang !== "dv" && !current.en.trim())) && (
            <div className="nt-meta"><span>“{current.name}” has no {lang === "en" || (lang === "both" && !current.en.trim()) ? "English" : "Dhivehi"} version yet — write it below.</span></div>
          )}

          <MessageFields lang={lang} en={en} dv={dv} setEn={setEn} setDv={setDv} />

          <label className="nt-label" htmlFor="nt-title">Title <span style={{ textTransform: "none", fontWeight: 400 }}>(optional — shown in the app and as the email subject)</span></label>
          <input id="nt-title" className={`lc-input ${hasThaana(title) || lang === "dv" ? "nt-dv" : ""}`} dir="auto" value={title} maxLength={120} placeholder="e.g. Class cancelled tomorrow" onChange={(e) => setTitle(e.target.value)} />

          {(en.trim() || dv.trim()) && (
            <div className="nt-save-row">
              {saveName === null ? (
                <>
                  {canUpdate && (
                    <button type="button" className="tp-btn-outline nt-btn-sm" disabled={savingTpl} onClick={() => saveTemplate(false)}>
                      <Save size={15} aria-hidden="true" />Update “{current.name}”
                    </button>
                  )}
                  {edited && (
                    <button type="button" className="tp-btn-outline nt-btn-sm" disabled={savingTpl} onClick={() => setSaveName("")}>
                      <Save size={15} aria-hidden="true" />Save as new template
                    </button>
                  )}
                </>
              ) : (
                <>
                  <input className="lc-input" style={{ flex: "1 1 200px", minHeight: "40px" }} dir="auto" autoFocus value={saveName} maxLength={60} placeholder="Template name, e.g. Class cancelled" aria-label="Template name" onChange={(e) => setSaveName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveTemplate(true); }} />
                  <button type="button" className="tp-btn-gradient nt-btn-sm" disabled={savingTpl} onClick={() => saveTemplate(true)}>{savingTpl ? "Saving…" : "Save"}</button>
                  <button type="button" className="tp-btn-outline nt-btn-sm" disabled={savingTpl} onClick={() => setSaveName(null)}>Cancel</button>
                </>
              )}
            </div>
          )}
        </div>

        {/* 2. Who gets it */}
        <div className="tp-card">
          <div className="nt-step"><span>2</span>Who gets it</div>
          <div className="nt-chips" role="radiogroup" aria-label="Who gets it">
            {AUDIENCES.map((a) => (
              <button key={a.key} type="button" role="radio" aria-checked={audience === a.key} className={`nt-chip ${audience === a.key ? "nt-chip-on" : ""}`} onClick={() => setAudience(a.key)}>{a.label}</button>
            ))}
          </div>

          {audience === "classes" && (
            <>
              <div className="nt-meta" style={{ margin: "12px 0 6px" }}>
                <span>{Object.values(classSet).filter(Boolean).length} of {classOptions.length} classes · {recipients.length} students</span>
                <span>
                  <button type="button" className="nt-link" onClick={() => setClassSet(Object.fromEntries(classOptions.map((c) => [c.name, true])))}>Select all</button>{" · "}
                  <button type="button" className="nt-link" onClick={() => setClassSet({})}>None</button>
                </span>
              </div>
              <div className="nt-class-grid">
                {classOptions.map((c) => (
                  <label key={c.name} className={`nt-class ${classSet[c.name] ? "nt-class-on" : ""}`}>
                    <input type="checkbox" checked={!!classSet[c.name]} onChange={(e) => setClassSet((cur) => ({ ...cur, [c.name]: e.target.checked }))} />
                    <span>{c.name}<small>{c.count} student{c.count === 1 ? "" : "s"}</small></span>
                  </label>
                ))}
              </div>
            </>
          )}

          {audience === "people" && (
            <>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
                <label className="nt-search" style={{ flex: "1 1 200px" }}>
                  <Search size={15} aria-hidden="true" />
                  <input type="search" placeholder="Search name or phone" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Search people" />
                </label>
                <select className="lc-select" style={{ flex: "0 1 220px", minHeight: "42px" }} value={filterClass} onChange={(e) => setFilterClass(e.target.value)} aria-label="Show class">
                  <option value="">All classes</option>
                  {classOptions.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="nt-meta" style={{ margin: "8px 0 0" }}>
                <span>{recipients.length} chosen</span>
                <span>
                  <button type="button" className="nt-link" onClick={() => setPicked((cur) => ({ ...cur, ...Object.fromEntries(shown.map((p) => [p.key, true])) }))}>Select all shown</button>{" · "}
                  <button type="button" className="nt-link" onClick={() => setPicked({})}>Clear</button>
                </span>
              </div>
              <div className="nt-people">
                {shown.length ? shown.map((p) => (
                  <label key={p.key} className="nt-person">
                    <input type="checkbox" checked={!!picked[p.key]} onChange={(e) => setPicked((cur) => ({ ...cur, [p.key]: e.target.checked }))} />
                    <span style={{ minWidth: 0 }}>
                      {p.name}
                      <div className="nt-person-sub">{[p.kind === "Teacher" ? "Teacher" : p.className, p.phone || "no phone"].filter(Boolean).join(" · ")}</div>
                    </span>
                  </label>
                )) : <div className="nt-person" style={{ cursor: "default" }}>No matches.</div>}
              </div>
            </>
          )}

          {audience === "numbers" && (
            <>
              <label className="nt-label" htmlFor="nt-numbers">Phone numbers</label>
              <textarea id="nt-numbers" className="lc-input nt-textarea" style={{ minHeight: "80px" }} value={numbersText} placeholder="7771234, 9601234 (one per line or separated by commas)" onChange={(e) => setNumbersText(e.target.value)} />
              <div className="nt-meta"><span>Phone numbers get SMS only. Student details aren't filled in for them.</span></div>
            </>
          )}
        </div>

        {nameRows.length > 0 && (
          <NameCheck rows={nameRows} saving={savingNames} onConfirm={confirmAllNames}
            setName={(name, v) => setNameEdits((cur) => ({ ...cur, [name]: v }))} />
        )}

        {/* Send by */}
        <div className="tp-card">
          <div className="nt-step"><span>{nameRows.length ? 4 : 3}</span>Send by</div>
          <div className="nt-channels">
            <label className={`nt-toggle ${audience === "numbers" ? "nt-toggle-disabled" : ""}`}>
              <input type="checkbox" checked={useInApp} disabled={audience === "numbers"} onChange={(e) => setInApp(e.target.checked)} />
              <MessageSquare size={18} aria-hidden="true" color={TP.blue} />
              <span>App<small>Phone notification + inbox · {audience === "numbers" ? "—" : `${withLogin} have the app`}</small></span>
            </label>
            <label className={`nt-toggle ${audience === "numbers" ? "nt-toggle-disabled" : ""}`}>
              <input type="checkbox" checked={useSms} disabled={audience === "numbers"} onChange={(e) => setSms(e.target.checked)} />
              <Smartphone size={18} aria-hidden="true" color={TP.blue} />
              <span>SMS<small>{withPhone} have a phone number</small></span>
            </label>
            <label className={`nt-toggle ${audience === "numbers" ? "nt-toggle-disabled" : ""}`}>
              <input type="checkbox" checked={useEmail} disabled={audience === "numbers"} onChange={(e) => setEmail(e.target.checked)} />
              <Mail size={18} aria-hidden="true" color={TP.blue} />
              <span>Email<small>{audience === "numbers" ? "—" : `${withEmail} have an email`}</small></span>
            </label>
          </div>
          {useInApp && recipients.length > withLogin && audience !== "numbers" && (
            <div className="nt-meta" style={{ marginTop: "8px" }}><span>{recipients.length - withLogin} without the app won't see it there{useSms || useEmail ? ` — they get the ${[useSms && "SMS", useEmail && "email"].filter(Boolean).join(" / ")} if they have one` : " — turn on SMS or Email to reach them"}.</span></div>
          )}
        </div>
      </div>

      {/* Preview and send */}
      <div className="nt-side">
        <div className="tp-card">
          <div className="nt-lang" style={{ marginBottom: "8px" }}>
            <div className="nt-hist-title">Preview</div>
            {personal && recipients.length > 1 && (
              <span className="nt-pager">
                <button type="button" className="lc-btn" aria-label="Previous person" disabled={idx === 0} onClick={() => setPreviewIdx(idx - 1)}><ChevronLeft size={16} aria-hidden="true" /></button>
                <span>{idx + 1} / {recipients.length}</span>
                <button type="button" className="lc-btn" aria-label="Next person" disabled={idx >= recipients.length - 1} onClick={() => setPreviewIdx(idx + 1)}><ChevronRight size={16} aria-hidden="true" /></button>
              </span>
            )}
          </div>
          {personal && previewFor && <div className="nt-meta" style={{ margin: "0 0 6px" }}><span>For <b>{previewFor.name}</b></span></div>}
          <div className={`nt-detail-body ${hasThaana(preview) ? "nt-text" : ""}`} dir="auto" style={{ marginBottom: "4px", maxHeight: "360px", overflow: "auto" }}>
            {title && <b>{title}{"\n"}</b>}{preview || <span style={{ color: TP.secondaryText }}>Your message shows here.</span>}
          </div>
          {preview && <div className="nt-meta"><span>{preview.length} characters{useSms ? ` · ${parts} SMS part${parts === 1 ? "" : "s"} each` : ""}</span>{personal && <span>Details filled in for each person</span>}</div>}

          <div className="nt-summary">
            <div className="nt-stat"><Users size={16} aria-hidden="true" /><b>{recipients.length}</b><span>people</span></div>
            <div className="nt-stat"><b>{[useInApp && "App", useSms && "SMS", useEmail && "Email"].filter(Boolean).join(" + ") || "—"}</b><span>send by</span></div>
          </div>
          <button type="button" className="tp-btn-gradient" style={{ width: "100%", justifyContent: "center" }} disabled={sending || !recipients.length || !raw.trim()} onClick={send}>
            <Send size={16} aria-hidden="true" />{sending ? "Sending…" : `Send to ${recipients.length}`}
          </button>
        </div>

        <div className="tp-card">
          <div className="nt-hist-title" style={{ marginBottom: "10px", fontSize: "14px" }}>Delivery services</div>
          <ServiceStatus status={smsStatus} okText="SMS connected" okDetail={smsStatus?.senderId && `Sender: ${smsStatus.senderId}`}
            notText={smsStatus?.error ? "SMS service not reachable." : "SMS not connected yet."} detail="SMS are saved as pending and can be sent later from History." />
          <div style={{ height: "10px" }} />
          <ServiceStatus status={emailStatus} okText="Email connected" okDetail={emailStatus?.from && `From ${emailStatus.from}`}
            notText={emailStatus?.error ? "Email only sends from the live site." : "Email not set up yet."} detail="Emails are saved as pending and can be sent later from History." />
        </div>
      </div>
    </div>
  );
}
