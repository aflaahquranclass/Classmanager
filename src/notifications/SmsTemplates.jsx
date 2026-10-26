// Admin → Notifications → Templates / Payment reminders.
// The welcome message and payment reminder are written once (English or
// Dhivehi) and filled in per student: {name}, {class}, {fee}, … The same
// text goes out by SMS and by email.

import { useState, useEffect, useMemo, useRef } from "react";
import { Save, Send, ChevronLeft, ChevronRight, Wallet, PartyPopper, Smartphone, Mail } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { TP } from "../App.jsx";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { THAANA_FONT } from "../exams/reportStrings.js";
import { thaanaChange, hasThaana } from "./thaanaKeyboard.js";
import { TEMPLATES, PLACEHOLDER_LABELS, fillTemplate, smsParts, reminderSubject } from "./templates.js";
import { loadTemplates, loadDvNames, createNotification, sendWelcome } from "./smsSend.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthLabel = (key) => { const [y, m] = key.split("-").map(Number); return `${MONTHS[m - 1]} ${y}`; };
const shiftMonth = (key, delta) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

const teacherNameOf = (teachers, s) => teachers.find((t) => t.id === s.teacherId)?.name || "";

function useTemplateData() {
  const [templates, setTemplates] = useState(null);
  const [dvNames, setDvNames] = useState({});
  useEffect(() => {
    loadTemplates().then(setTemplates);
    loadDvNames().then(setDvNames);
  }, []);
  return { templates, setTemplates, dvNames };
}

function SmsPreview({ text }) {
  const parts = smsParts(text);
  return (
    <div>
      <div className={`nt-detail-body ${hasThaana(text) ? "nt-text" : ""}`} dir="auto" style={{ marginBottom: "4px", lineHeight: hasThaana(text) ? 1.9 : 1.5 }}>{text || "—"}</div>
      <div className="nt-meta"><span>{text.length} characters · {parts} SMS part{parts === 1 ? "" : "s"}</span></div>
    </div>
  );
}

function TemplateCard({ def, row, sample, ctx, students, teachers, dvNames, showToast, onSaved, onSent }) {
  const [body, setBody] = useState(row?.body || "");
  const [autoSend, setAutoSend] = useState(!!row?.auto_send);
  const [dhivehi, setDhivehi] = useState(hasThaana(row?.body) || !row?.body);
  const [saving, setSaving] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sending, setSending] = useState(false);
  const ref = useRef(null);
  const changed = body !== (row?.body || "") || autoSend !== !!row?.auto_send;

  const insert = (key) => {
    const el = ref.current;
    const tag = `{${key}}`;
    const at = el ? el.selectionStart : body.length;
    const end = el ? el.selectionEnd : body.length;
    setBody(body.slice(0, at) + tag + body.slice(end));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + tag.length, at + tag.length); });
  };

  const save = async () => {
    setSaving(true);
    const next = { key: def.key, body, auto_send: autoSend, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("sms_templates").upsert(next, { onConflict: "key" });
    setSaving(false);
    if (error) { showToast("Couldn't save. Please try again."); return; }
    onSaved(next);
    showToast(`${def.label} saved.`);
  };

  // Welcome: send to one student now (e.g. someone added before this existed).
  const recentStudents = useMemo(() => [...students].filter((s) => s.phone || s.email).sort((a, b) => a.name.localeCompare(b.name)), [students]);
  const sendNow = async () => {
    const s = students.find((x) => x.id === sendTo);
    if (!s) return;
    const to = [s.phone && `SMS to ${s.phone}`, s.email && `email to ${s.email}`].filter(Boolean).join(" and ");
    if (!(await confirmDialog({ title: `Send welcome message to ${s.name}?`, message: `By ${to}.`, confirmLabel: "Send", danger: false }))) return;
    setSending(true);
    const { ok, message } = await sendWelcome(s, teacherNameOf(teachers, s), body, dvNames);
    setSending(false);
    showToast(ok ? `Welcome message: ${message}` : message);
    if (ok) { setSendTo(""); onSent(); }
  };

  return (
    <div className="tp-card" style={{ marginBottom: "16px" }}>
      <div className="nt-lang">
        <div>
          <div className="nt-hist-title">{def.label}</div>
          <div className="nt-meta" style={{ marginTop: "2px" }}><span>{def.hint}</span></div>
        </div>
        <span className="nt-lang-switch" role="group" aria-label={`${def.label} language`}>
          <button type="button" aria-pressed={!dhivehi} onClick={() => setDhivehi(false)}>English</button>
          <button type="button" className="nt-dv-btn" lang="dv" aria-pressed={dhivehi} onClick={() => setDhivehi(true)}>ދިވެހި</button>
        </span>
      </div>

      <div className="nt-grid" style={{ marginBottom: 0 }}>
        <div>
          <label className="nt-label" htmlFor={`tpl-${def.key}`}>Message</label>
          <textarea
            id={`tpl-${def.key}`}
            ref={ref}
            className={`lc-input nt-textarea ${dhivehi ? "nt-dv" : ""}`}
            style={{ minHeight: "140px" }}
            dir={dhivehi ? "rtl" : "auto"}
            lang={dhivehi ? "dv" : undefined}
            value={body}
            onChange={(e) => thaanaChange(e, body, setBody, dhivehi)}
          />
          {dhivehi && <div className="nt-meta"><span style={{ fontFamily: THAANA_FONT }}>Phonetic typing — k → ކ, a → ަ, S → ށ</span></div>}

          <span className="nt-label">Insert student details</span>
          <div className="nt-chips">
            {def.placeholders.map((p) => (
              <button key={p} type="button" className="nt-chip" style={{ minHeight: "34px", padding: "5px 12px" }} onClick={() => insert(p)}>{PLACEHOLDER_LABELS[p]}</button>
            ))}
          </div>

          {def.key === "welcome" && (
            <label className="nt-toggle" style={{ marginTop: "14px" }}>
              <input type="checkbox" checked={autoSend} onChange={(e) => setAutoSend(e.target.checked)} />
              <span>Send automatically when a new student is added<small>By SMS to their phone and email to their address, if they have them</small></span>
            </label>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
            <button type="button" className="tp-btn-gradient" disabled={!changed || saving || !body.trim()} onClick={save}>
              <Save size={16} aria-hidden="true" />{saving ? "Saving…" : changed ? "Save template" : "Saved"}
            </button>
          </div>
        </div>

        <div>
          <span className="nt-label">Preview{sample ? ` — ${sample.name}` : ""}</span>
          <SmsPreview text={sample ? fillTemplate(body, sample, ctx(sample)) : body} />

          {def.key === "welcome" && (
            <>
              <label className="nt-label" htmlFor="tpl-welcome-to">Send it now to a student</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <select id="tpl-welcome-to" className="lc-select" style={{ flex: "1 1 200px", minHeight: "44px" }} value={sendTo} onChange={(e) => setSendTo(e.target.value)}>
                  <option value="">Choose a student…</option>
                  {recentStudents.map((s) => <option key={s.id} value={s.id}>{[s.name, s.phone, s.email].filter(Boolean).join(" · ")}</option>)}
                </select>
                <button type="button" className="tp-btn-outline" disabled={!sendTo || sending || changed} onClick={sendNow} title={changed ? "Save the template first" : undefined}>
                  <Send size={16} aria-hidden="true" />{sending ? "Sending…" : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function SmsTemplates({ students, teachers, showToast, onSent }) {
  const { templates, setTemplates, dvNames } = useTemplateData();
  const sample = students.find((s) => s.className && s.schedule) || students[0];
  const ctx = (s) => ({ teacherName: teacherNameOf(teachers, s), monthKey: thisMonth(), dvNames });

  if (!templates) return <div className="lc-loading-row" style={{ marginBottom: "16px" }}><span className="lc-spinner"></span>Loading templates…</div>;
  return TEMPLATES.map((def) => (
    <TemplateCard
      key={def.key}
      def={def}
      row={templates[def.key]}
      sample={sample}
      ctx={ctx}
      students={students}
      teachers={teachers}
      dvNames={dvNames}
      showToast={showToast}
      onSaved={(row) => setTemplates((cur) => ({ ...cur, [row.key]: row }))}
      onSent={onSent}
    />
  ));
}

export function PaymentReminders({ students, teachers, showToast, onSent }) {
  const { templates, dvNames } = useTemplateData();
  const [monthKey, setMonthKey] = useState(thisMonth());
  const [paid, setPaid] = useState(null); // Set of student ids who paid
  const [skip, setSkip] = useState({});   // student id → true when unticked
  const [inApp, setInApp] = useState(true);
  const [bySms, setBySms] = useState(true);
  const [byEmail, setByEmail] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPaid(null);
    supabase.from("payments").select("student_id, paid").eq("month", monthKey).then(({ data }) => {
      if (!cancelled) setPaid(new Set((data || []).filter((r) => r.paid).map((r) => r.student_id)));
    });
    return () => { cancelled = true; };
  }, [monthKey]);

  const unpaid = useMemo(() => (paid ? students
    .filter((s) => (!s.joinedMonth || s.joinedMonth <= monthKey) && !paid.has(s.id))
    .sort((a, b) => a.name.localeCompare(b.name)) : []), [students, paid, monthKey]);
  // Reachable = has an address for at least one of the chosen channels (or the app).
  const reachable = (s) => (bySms && s.phone) || (byEmail && s.email) || (inApp && s.userId);
  const selected = unpaid.filter((s) => reachable(s) && !skip[s.id]);
  const tpl = templates?.payment_reminder?.body || "";
  const fill = (s) => fillTemplate(tpl, s, { teacherName: teacherNameOf(teachers, s), monthKey, dvNames });

  const send = async () => {
    if (!selected.length) return;
    const ok = await confirmDialog({
      title: "Send payment reminders?",
      message: `${selected.length} student${selected.length === 1 ? "" : "s"} will get a reminder about ${monthLabel(monthKey)}${[bySms && "by SMS", byEmail && "by email"].filter(Boolean).length ? " " + [bySms && "by SMS", byEmail && "by email"].filter(Boolean).join(" and ") : ""}.`,
      confirmLabel: "Send", danger: false,
    });
    if (!ok) return;
    setSending(true);
    const res = await createNotification({
      title: reminderSubject(tpl, monthLabel(monthKey)),
      body: tpl, audience: "payment_reminder", audienceLabel: `Payment reminder — ${monthLabel(monthKey)}`,
      inApp, sms: bySms, email: byEmail,
      recipients: selected.map((s) => ({ student_id: s.id, user_id: s.userId, name: s.name, phone: s.phone, email: s.email, body: fill(s) })),
    });
    setSending(false);
    showToast(res.ok ? `Reminders sent to ${selected.length}. ${res.message}` : res.message);
    if (res.ok) onSent();
  };

  return (
    <div className="nt-grid">
      <div className="tp-card">
        <div className="nt-lang">
          <div className="nt-hist-title">Not paid yet</div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <button type="button" className="lc-btn" aria-label="Previous month" onClick={() => setMonthKey(shiftMonth(monthKey, -1))}><ChevronLeft size={16} aria-hidden="true" /></button>
            <strong style={{ color: TP.navy, fontSize: "14px", minWidth: "120px", textAlign: "center" }}>{monthLabel(monthKey)}</strong>
            <button type="button" className="lc-btn" aria-label="Next month" onClick={() => setMonthKey(shiftMonth(monthKey, 1))}><ChevronRight size={16} aria-hidden="true" /></button>
          </span>
        </div>
        {!paid ? (
          <div className="lc-loading-row"><span className="lc-spinner"></span>Loading payments…</div>
        ) : !unpaid.length ? (
          <div style={{ display: "flex", gap: "8px", alignItems: "center", color: TP.secondaryText, fontSize: "14px" }}><PartyPopper size={16} aria-hidden="true" />Everyone has paid for {monthLabel(monthKey)}.</div>
        ) : (
          <>
            <div className="nt-meta" style={{ marginBottom: "6px" }}>
              <span>{unpaid.length} unpaid · {selected.length} selected</span>
              <span>
                <button type="button" style={{ border: "none", background: "none", color: TP.blue, fontWeight: 600, cursor: "pointer" }} onClick={() => setSkip({})}>Select all</button>
                {" · "}
                <button type="button" style={{ border: "none", background: "none", color: TP.blue, fontWeight: 600, cursor: "pointer" }} onClick={() => setSkip(Object.fromEntries(unpaid.map((s) => [s.id, true])))}>None</button>
              </span>
            </div>
            <div className="nt-people" style={{ maxHeight: "420px", marginTop: 0 }}>
              {unpaid.map((s) => (
                <label key={s.id} className="nt-person" style={!reachable(s) ? { cursor: "default", opacity: 0.6 } : undefined}>
                  <input type="checkbox" disabled={!reachable(s)} checked={!!reachable(s) && !skip[s.id]} onChange={(e) => setSkip((cur) => ({ ...cur, [s.id]: !e.target.checked }))} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    {s.name}
                    <div className="nt-person-sub" style={{ overflowWrap: "anywhere" }}>{[s.className, s.phone || "no phone", s.email].filter(Boolean).join(" · ")}</div>
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: TP.navy, whiteSpace: "nowrap" }}>MVR {(Number(s.fee) || 0).toLocaleString()}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="tp-card">
        <div className="nt-hist-title" style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}><Wallet size={18} aria-hidden="true" />Reminder message</div>
        {!templates ? (
          <div className="lc-loading-row"><span className="lc-spinner"></span>Loading…</div>
        ) : !tpl.trim() ? (
          <div className="nt-meta"><span>Write the payment reminder under “Templates” first.</span></div>
        ) : (
          <>
            <span className="nt-label">Preview{selected[0] ? ` — ${selected[0].name}` : ""}</span>
            <SmsPreview text={selected[0] ? fill(selected[0]) : tpl} />
            <span className="nt-label">Send by</span>
            <div style={{ display: "grid", gap: "8px", marginBottom: "14px" }}>
              <label className="nt-toggle">
                <input type="checkbox" checked={bySms} onChange={(e) => setBySms(e.target.checked)} />
                <Smartphone size={18} aria-hidden="true" color={TP.blue} />
                <span>SMS<small>{unpaid.filter((s) => s.phone).length} have a phone number</small></span>
              </label>
              <label className="nt-toggle">
                <input type="checkbox" checked={byEmail} onChange={(e) => setByEmail(e.target.checked)} />
                <Mail size={18} aria-hidden="true" color={TP.blue} />
                <span>Email<small>{unpaid.filter((s) => s.email).length} have an email address</small></span>
              </label>
              <label className="nt-toggle">
                <input type="checkbox" checked={inApp} onChange={(e) => setInApp(e.target.checked)} />
                <span>Student app<small>{unpaid.filter((s) => s.userId).length} have a login</small></span>
              </label>
            </div>
            <button type="button" className="tp-btn-gradient" style={{ width: "100%", justifyContent: "center" }} disabled={!selected.length || sending} onClick={send}>
              <Send size={16} aria-hidden="true" />{sending ? "Sending…" : `Send to ${selected.length}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
