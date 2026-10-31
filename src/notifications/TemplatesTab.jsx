// Notifications → Templates: the admin's saved messages, each with an
// English and a Dhivehi version, and (folded away) the automatic messages
// the app sends by itself.

import { useState } from "react";
import { Plus, Pencil, Trash2, Send, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { hasThaana } from "./thaanaKeyboard.js";
import { fillTemplate } from "./templates.js";
import { saveMessageTemplate, deleteMessageTemplate } from "./messageTemplates.js";
import { MessageFields } from "./MessageFields.jsx";
import { AutomaticTemplates, SmsPreview } from "./SmsTemplates.jsx";

function TemplateEditor({ template, takenNames, sample, ctx, showToast, onSaved, onCancel }) {
  const [name, setName] = useState(template?.name || "");
  const [en, setEn] = useState(template?.en || "");
  const [dv, setDv] = useState(template?.dv || "");
  const [previewLang, setPreviewLang] = useState(template && !template.dv && template.en ? "en" : "dv");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = name.trim();
    if (!n) { showToast("Give the template a name."); return; }
    if (takenNames.some((x) => x.toLowerCase() === n.toLowerCase())) { showToast(`There's already a template called “${n}”.`); return; }
    if (!en.trim() && !dv.trim()) { showToast("Write the English or the Dhivehi message."); return; }
    setSaving(true);
    const saved = await saveMessageTemplate({ id: template?.id, name: n, en, dv });
    setSaving(false);
    if (!saved) { showToast("Couldn't save. Please try again."); return; }
    showToast(`“${saved.name}” saved.`);
    onSaved(saved);
  };

  const previewText = previewLang === "en" ? en : dv;
  return (
    <div className="tp-card nt-editor">
      <div className="nt-hist-title" style={{ marginBottom: "12px" }}>{template ? "Edit template" : "New template"}</div>
      <label className="nt-label" htmlFor="tpl-name">Template name</label>
      <input id="tpl-name" className="lc-input" dir="auto" value={name} maxLength={60} placeholder="e.g. Class cancelled" onChange={(e) => setName(e.target.value)} />
      <div className="nt-grid" style={{ marginTop: "4px", marginBottom: 0 }}>
        <div>
          <MessageFields lang="both" en={en} dv={dv} setEn={setEn} setDv={setDv} />
          <div className="nt-meta" style={{ marginTop: "10px" }}><span>Fill in one language or both. You choose which to send each time.</span></div>
        </div>
        <div>
          <div className="nt-lang" style={{ marginBottom: "6px" }}>
            <span className="nt-label" style={{ margin: 0 }}>Preview{sample ? ` — ${sample.name}` : ""}</span>
            <span className="nt-lang-switch nt-lang-switch-sm" role="group" aria-label="Preview language">
              <button type="button" aria-pressed={previewLang === "en"} onClick={() => setPreviewLang("en")}>English</button>
              <button type="button" className="nt-dv-btn" lang="dv" aria-pressed={previewLang === "dv"} onClick={() => setPreviewLang("dv")}>ދިވެހި</button>
            </span>
          </div>
          <SmsPreview text={sample ? fillTemplate(previewText, sample, { ...ctx(sample), dv: previewLang === "dv" }) : previewText} />
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
        <button type="button" className="tp-btn-gradient" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save template"}</button>
        <button type="button" className="tp-btn-outline" disabled={saving} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function Snippet({ text, dv }) {
  if (!text?.trim()) return <div className="nt-tpl-missing">{dv ? "No Dhivehi version" : "No English version"}</div>;
  return <div className={`nt-tpl-snippet ${dv ? "nt-text" : ""}`} dir={dv ? "rtl" : "ltr"}>{text}</div>;
}

// templates: [{ id, name, en, dv }] | null (couldn't load) | undefined (loading)
export function TemplatesTab({ templates, setTemplates, students, teachers, dvNames, monthKey, showToast, onSent, onUse, onUseAutomatic }) {
  const [editing, setEditing] = useState(null); // null | "new" | template id
  const [showAuto, setShowAuto] = useState(false);
  const sample = students.find((s) => s.className && s.schedule) || students[0];
  const ctx = (s) => ({ teacherName: teachers.find((t) => t.id === s.teacherId)?.name || "", monthKey, dvNames });

  const remove = async (t) => {
    if (!(await confirmDialog({ title: `Delete “${t.name}”?`, message: "Messages already sent with it stay in History.", confirmLabel: "Delete", danger: true }))) return;
    if (!(await deleteMessageTemplate(t.id))) { showToast("Couldn't delete. Please try again."); return; }
    setTemplates((cur) => cur.filter((x) => x.id !== t.id));
    showToast(`“${t.name}” deleted.`);
  };

  const onSaved = (saved) => {
    setTemplates((cur) => [...cur.filter((x) => x.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name)));
    setEditing(null);
  };

  const list = templates || [];
  const editor = (template) => (
    <TemplateEditor
      key={template?.id || "new"}
      template={template}
      takenNames={list.filter((x) => x.id !== template?.id).map((x) => x.name)}
      sample={sample}
      ctx={ctx}
      showToast={showToast}
      onSaved={onSaved}
      onCancel={() => setEditing(null)}
    />
  );

  return (
    <>
      <div className="nt-lang">
        <div>
          <div className="nt-hist-title">My templates</div>
          <div className="nt-meta" style={{ marginTop: "2px" }}><span>Save a message once in English and Dhivehi, then send it from here or pick it under Send.</span></div>
        </div>
        {editing !== "new" && (
          <button type="button" className="tp-btn-gradient" disabled={templates === null} onClick={() => setEditing("new")}>
            <Plus size={16} aria-hidden="true" />New template
          </button>
        )}
      </div>

      {editing === "new" && editor(null)}

      {templates === undefined ? (
        <div className="lc-loading-row" style={{ marginBottom: "16px" }}><span className="lc-spinner"></span>Loading templates…</div>
      ) : templates === null ? (
        <div className="tp-card" style={{ color: "#A32020", fontSize: "14px", marginBottom: "16px" }}>Couldn't load your templates. Reload the page to try again.</div>
      ) : !list.length && editing !== "new" ? (
        <div className="tp-card nt-empty">
          <FileText size={28} aria-hidden="true" />
          <div><b>No templates yet</b><span>Press “New template” to save a message you send often — like a class cancellation or a holiday notice.</span></div>
        </div>
      ) : (
        <div className="nt-tpl-grid">
          {list.map((t) => (editing === t.id ? <div key={t.id} style={{ gridColumn: "1 / -1" }}>{editor(t)}</div> : (
            <div key={t.id} className="tp-card nt-tpl-card">
              <div className="nt-tpl-name" dir="auto">{t.name}</div>
              <div className="nt-tpl-langs">
                <span className={`nt-badge ${t.en.trim() ? "" : "nt-badge-off"}`}>English {t.en.trim() ? "✓" : "—"}</span>
                <span className={`nt-badge nt-text ${t.dv.trim() ? "" : "nt-badge-off"}`}>ދިވެހި {t.dv.trim() ? "✓" : "—"}</span>
              </div>
              <Snippet text={t.dv} dv />
              <Snippet text={t.en} />
              <div className="nt-tpl-actions">
                <button type="button" className="tp-btn-gradient nt-btn-sm" onClick={() => onUse(t.id, t.dv.trim() ? "dv" : "en")}><Send size={15} aria-hidden="true" />Send</button>
                <button type="button" className="tp-btn-outline nt-btn-sm" onClick={() => setEditing(t.id)}><Pencil size={15} aria-hidden="true" />Edit</button>
                <button type="button" className="tp-btn-outline nt-btn-sm" style={{ color: "#A32020" }} aria-label={`Delete ${t.name}`} onClick={() => remove(t)}><Trash2 size={15} aria-hidden="true" /></button>
              </div>
            </div>
          )))}
        </div>
      )}

      <div className="tp-card nt-auto">
        <button type="button" className="nt-auto-head" aria-expanded={showAuto} onClick={() => setShowAuto(!showAuto)}>
          {showAuto ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
          <span>
            <b>Automatic messages</b>
            <small>Welcome, payment reminder, registration welcome and portal login — the app sends these by itself. You can change their wording here.</small>
          </span>
        </button>
      </div>
      {showAuto && (
        <AutomaticTemplates students={students} teachers={teachers} showToast={showToast} onSent={onSent}
          onUse={(key, body) => onUseAutomatic(key.startsWith("registration_welcome") ? "auto:registration_welcome" : `auto:${key}`, hasThaana(body) ? "dv" : "en")} />
      )}
    </>
  );
}
