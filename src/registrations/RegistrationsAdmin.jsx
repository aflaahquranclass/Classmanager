// Admin → Registrations, in three sections:
// - Applications: registrations sent from the website with their fee slips.
//   Accepting one asks which real class to put the student in (an ongoing
//   class, or a new one made there and then) and their monthly fee; then the
//   student is added, the registration fee is recorded as other income in
//   Finance, they get a student portal login and the welcome message
//   (Notifications → Templates → Registration welcome), which the admin can
//   read and change first.
// - Website classes: the class times shown on the website, per class type
//   and age group, with their registration and monthly fees. They're kept
//   apart from the real classes under Classes.
// - Form links: the main form and one per class type (for posters), each
//   with its link to copy and its own open/close switch.
// - Info updates: the student information update form for current students
//   (ID card number, Viber, email) and its responses (InfoUpdatesAdmin.jsx).

import { useState, useEffect, useCallback, useMemo } from "react";
import { CheckCircle2, XCircle, RotateCw, Trash2, Hourglass, FileText, Copy, Link2, Lock, LockOpen, ExternalLink, Inbox, MessageCircle, X, ChevronRight, ArrowLeft, Plus, Pencil, Eye, EyeOff, CalendarClock, PenLine, Contact } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { TP } from "../App.jsx";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { registrationWelcomeText, sendRegistrationWelcome } from "../notifications/smsSend.js";
import { InfoUpdates, infoCss } from "./InfoUpdatesAdmin.jsx";
import { CATEGORIES, AGE_GROUPS, DAYS, FORMS, REG_BUCKET, categoryOf, ageGroupOf, formUrl, fmtTime, fmtDays, fmtMvr } from "./registrations.js";

const SECTIONS = [
  { key: "applications", label: "Applications", icon: Inbox, help: "Registrations sent from the website. Check the payment slip, then accept or reject." },
  { key: "web", label: "Website classes", icon: CalendarClock, help: "The class times and fees students choose from on the website. They don’t change your classes under Classes." },
  { key: "links", label: "Form links", icon: Link2, help: "Copy a link to share or put on a poster. Close a form to stop new registrations." },
  { key: "info", label: "Info updates", icon: Contact, help: "Current students send their ID card number, atoll and island, Viber number and email. Match each one to the student and save it." },
];
const FILTERS = [
  { key: "pending", label: "Waiting" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];
const STATUS = {
  pending: { label: "Waiting", color: "#9C6B12", bg: "#FDF3DC" },
  accepted: { label: "Accepted", color: "#1E7A4C", bg: "#E3F5EA" },
  rejected: { label: "Rejected", color: "#A5432C", bg: "#FBE9E4" },
};
const OPEN = { color: "#1E7A4C", background: "#E3F5EA" };
const CLOSED = { color: "#A5432C", background: "#FBE9E4" };
const fmtWhen = (iso) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const sortDays = (days) => DAYS.filter((d) => (days || []).includes(d));
const overlaps = (a, b) => a.start_time < b.endTime && b.startTime < a.end_time;

// Waiting-registration count for the nav badge.
export function usePendingRegistrationCount(enabled) {
  const [count, setCount] = useState(0);
  const load = useCallback(async () => {
    if (!enabled) return;
    const { count: n, error } = await supabase.from("class_registrations").select("id", { count: "exact", head: true }).eq("status", "pending");
    if (!error) setCount(n || 0);
  }, [enabled]);
  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);
  return [count, load];
}

// classes / teachers / students: the app's lists (camelCase).
// onClassCreated(classRow): a class was made from the Accept box.
// onAccepted(studentRow, monthKey): a registration became a student.
// onEditWelcome(): open Notifications → Templates.
// onStudentUpdated(studentRow): an info update was saved onto a student.
export function AdminRegistrations({ showToast, onCountChange, pendingCount = 0, infoCount = 0, onInfoCountChange, classes = [], teachers = [], students = [], onClassCreated, onAccepted, onEditWelcome, onStudentUpdated }) {
  const [view, setView] = useState("applications");
  const section = SECTIONS.find((s) => s.key === view);
  return (
    <div className="rg-wrap">
      <style>{rgCss() + infoCss(TP)}</style>
      <div className="rg-sections" role="tablist" aria-label="Registrations">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.key} type="button" role="tab" aria-selected={view === s.key} className={`rg-section ${view === s.key ? "on" : ""}`} onClick={() => setView(s.key)}>
              <Icon size={20} aria-hidden="true" />
              <span>{s.label}</span>
              {s.key === "applications" && pendingCount > 0 && <span className="rg-count">{pendingCount}</span>}
              {s.key === "info" && infoCount > 0 && <span className="rg-count">{infoCount}</span>}
            </button>
          );
        })}
      </div>
      <p className="rg-help">{section.help}</p>
      {view === "applications" && (
        <Applications
          showToast={showToast} onCountChange={onCountChange} classes={classes} teachers={teachers} students={students}
          onClassCreated={onClassCreated} onAccepted={onAccepted} onEditWelcome={onEditWelcome}
        />
      )}
      {view === "web" && <WebClasses showToast={showToast} />}
      {view === "links" && <FormLinks showToast={showToast} />}
      {view === "info" && <InfoUpdates showToast={showToast} students={students} onStudentUpdated={onStudentUpdated} onCountChange={onInfoCountChange} />}
    </div>
  );
}

function Applications({ showToast, onCountChange, classes, teachers, students, onClassCreated, onAccepted, onEditWelcome }) {
  const [filter, setFilter] = useState("pending");
  const [cat, setCat] = useState("all");
  const [rows, setRows] = useState(null);
  const [webClasses, setWebClasses] = useState({});
  const [urls, setUrls] = useState({});
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [openId, setOpenId] = useState(null); // the registration shown in full
  const [accepting, setAccepting] = useState(false); // Accept box open for it

  // Everything is loaded once and filtered here, so the tabs can show counts.
  const load = useCallback(async () => {
    setError("");
    const [{ data, error: err }, { data: web }] = await Promise.all([
      supabase.from("class_registrations").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("web_classes").select("*"),
    ]);
    if (err) { setError(err.message); setRows([]); return; }
    setRows(data || []);
    setWebClasses(Object.fromEntries((web || []).map((w) => [w.id, w])));
    const paths = (data || []).map((x) => x.slip_path);
    if (paths.length) {
      const { data: signed } = await supabase.storage.from(REG_BUCKET).createSignedUrls(paths, 3600);
      setUrls(Object.fromEntries((signed || []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl])));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const inClass = useMemo(() => (rows || []).filter((r) => cat === "all" || r.category === cat), [rows, cat]);
  const countOf = (status) => (status === "all" ? inClass.length : inClass.filter((r) => r.status === status).length);
  // Oldest first while waiting, so they're handled in order; newest first otherwise.
  const shown = useMemo(() => {
    const list = inClass.filter((r) => filter === "all" || r.status === filter);
    return filter === "pending" ? [...list].reverse() : list;
  }, [inClass, filter]);

  const close = () => { setOpenId(null); setAccepting(false); };

  const setStatus = async (r, status) => {
    setBusyId(r.id);
    const { error: err } = await supabase.from("class_registrations").update({ status, reviewed_at: new Date().toISOString() }).eq("id", r.id);
    setBusyId(null);
    if (err) { showToast(`Couldn’t update: ${err.message}`); return; }
    showToast(status === "rejected" ? `${r.name}’s registration rejected.` : `${r.name} moved back to waiting.`);
    onCountChange?.();
    load();
  };

  const remove = async (r) => {
    if (!(await confirmDialog({ title: `Delete ${r.name}’s registration?`, message: "The registration and its payment slip will be removed for good.", confirmLabel: "Delete" }))) return;
    setBusyId(r.id);
    const { error: err } = await supabase.from("class_registrations").delete().eq("id", r.id);
    if (!err) await supabase.storage.from(REG_BUCKET).remove([r.slip_path]);
    setBusyId(null);
    if (err) { showToast(`Couldn’t delete: ${err.message}`); return; }
    showToast("Registration deleted.");
    close();
    onCountChange?.();
    load();
  };

  useEffect(() => {
    if (!openId) return undefined;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);
  const opened = (rows || []).find((r) => r.id === openId);
  const addedTo = opened?.class_id && classes.find((c) => c.id === opened.class_id);

  return (
    <>
      <div className="tp-card rg-toolbar">
        <div className="tp-segment" role="group" aria-label="Status" style={{ marginBottom: 0 }}>
          {FILTERS.map((x) => (
            <button key={x.key} type="button" aria-pressed={filter === x.key} className={`tp-segment-btn ${filter === x.key ? "tp-segment-btn-active" : ""}`} onClick={() => setFilter(x.key)}>
              {x.label} {rows && <span className="rg-tab-count">{countOf(x.key)}</span>}
            </button>
          ))}
        </div>
        <div className="rg-toolbar-right">
          <label className="rg-select">
            <span>Class</span>
            <select className="lc-select" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="all">All classes</option>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.en}</option>)}
            </select>
          </label>
          <button type="button" className="tp-btn-outline rg-icon" onClick={load} aria-label="Refresh" title="Refresh"><RotateCw size={16} aria-hidden="true" /></button>
        </div>
      </div>

      {error && <div className="tp-card rg-error" role="alert">Couldn’t load registrations: {error}</div>}
      {rows === null && <div className="tp-card">Loading…</div>}
      {rows && shown.length === 0 && !error && (
        <div className="tp-card rg-empty">{filter === "pending" ? "No registrations waiting. New ones will appear here." : "No registrations here."}</div>
      )}

      {shown.length > 0 && (
        <div className="tp-card rg-list">
          {shown.map((r) => {
            const st = STATUS[r.status];
            return (
              <button key={r.id} type="button" className="rg-row" onClick={() => setOpenId(r.id)}>
                <span className="rg-row-main">
                  <b dir="auto">{r.name}</b>
                  <span>{categoryOf(r.category)?.en} · {r.class_label.split(" · ")[1]}</span>
                </span>
                <span className="rg-badge" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                <ChevronRight size={18} aria-hidden="true" className="rg-row-go" />
              </button>
            );
          })}
        </div>
      )}

      {opened && (
        <div className="rg-modal" role="dialog" aria-modal="true" aria-label={`${opened.name}’s registration`} onClick={close}>
          <article className="tp-card rg-card rg-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="rg-top">
              <div style={{ minWidth: 0 }}>
                <div className="rg-name" dir="auto">{opened.name}</div>
                <div className="rg-sub">Sent {fmtWhen(opened.created_at)}</div>
              </div>
              <span className="rg-badge" style={{ color: STATUS[opened.status].color, background: STATUS[opened.status].bg }}>{opened.status === "pending" && <Hourglass size={13} aria-hidden="true" />}{STATUS[opened.status].label}</span>
              <button type="button" className="rg-close" onClick={close} aria-label="Close"><X size={20} aria-hidden="true" /></button>
            </div>

            {accepting ? (
              <AcceptBox
                reg={opened} web={webClasses[opened.web_class_id]} classes={classes} teachers={teachers} students={students}
                showToast={showToast} onClassCreated={onClassCreated} onEditWelcome={onEditWelcome}
                onBack={() => setAccepting(false)}
                onDone={(row, monthKey) => { onAccepted?.(row, monthKey); onCountChange?.(); close(); load(); }}
              />
            ) : (
              <>
                <div className="rg-class">
                  <span className="rg-class-tag">Chose on the website</span>
                  <b>{categoryOf(opened.category)?.en || "Class"}</b>
                  <span>{opened.class_label.split(" · ").slice(1).join(" · ")}</span>
                  {opened.form !== "all" && <small>From the {categoryOf(opened.form)?.en} poster link</small>}
                </div>

                <dl className="rg-facts">
                  <dt>Age</dt><dd>{opened.age}</dd>
                  <dt>ID card</dt><dd>{opened.nic}</dd>
                  <dt>Atoll &amp; island</dt><dd dir="auto">{opened.atoll_island}</dd>
                  <dt>Viber</dt><dd>{opened.viber}</dd>
                  {opened.registration_fee != null && <><dt>Registration fee</dt><dd>{fmtMvr(opened.registration_fee)}</dd></>}
                </dl>

                <div className="rg-links-row">
                  {urls[opened.slip_path]
                    ? <a className="tp-btn-outline" href={urls[opened.slip_path]} target="_blank" rel="noreferrer"><FileText size={16} aria-hidden="true" /> Payment slip</a>
                    : <span className="rg-sub">Slip not available.</span>}
                  <a className="tp-btn-outline" href={`viber://chat?number=${encodeURIComponent(opened.viber.replace(/[^\d+]/g, ""))}`}><MessageCircle size={16} aria-hidden="true" /> Viber</a>
                </div>

                <div className="rg-actions">
                  {opened.status === "pending" ? (
                    <>
                      <button type="button" className="tp-btn-gradient" disabled={busyId === opened.id} onClick={() => setAccepting(true)}><CheckCircle2 size={17} aria-hidden="true" /> Accept</button>
                      <button type="button" className="tp-btn-outline rg-danger" disabled={busyId === opened.id} onClick={() => setStatus(opened, "rejected")}><XCircle size={17} aria-hidden="true" /> Reject</button>
                    </>
                  ) : opened.status === "rejected" ? (
                    <button type="button" className="tp-btn-outline" disabled={busyId === opened.id} onClick={() => setStatus(opened, "pending")}><RotateCw size={16} aria-hidden="true" /> Move back to waiting</button>
                  ) : (
                    <span className="rg-done"><CheckCircle2 size={16} aria-hidden="true" /> Added to {addedTo ? addedTo.name : "a class"}{opened.reviewed_at ? ` on ${fmtWhen(opened.reviewed_at)}` : ""}</span>
                  )}
                  <button type="button" className="tp-btn-outline rg-danger rg-icon" disabled={busyId === opened.id} onClick={() => remove(opened)} aria-label="Delete registration" title="Delete"><Trash2 size={17} aria-hidden="true" /></button>
                </div>
              </>
            )}
          </article>
        </div>
      )}
    </>
  );
}

// Next class code in the same series, e.g. "B01","B02" → "B03" (as in Classes).
function nextClassCode(classes) {
  let prefix = "B", num = 0, width = 2;
  classes.forEach((c) => {
    const m = /^([A-Za-z]*)(\d+)$/.exec((c.code || "").trim());
    if (m && parseInt(m[2], 10) > num) { num = parseInt(m[2], 10); prefix = m[1] || ""; width = m[2].length; }
  });
  return `${prefix}${String(num + 1).padStart(width, "0")}`;
}

// Accepting a registration: which class, which fee, and the welcome message.
function AcceptBox({ reg, web, classes, teachers, students, showToast, onClassCreated, onEditWelcome, onBack, onDone }) {
  const teacherName = (id) => teachers.find((t) => t.id === id)?.name || "";
  // Ongoing classes that match: on every day the student chose, at an
  // overlapping time. Only these are offered; otherwise make a new class.
  const ranked = useMemo(() => {
    const fits = (c) => !!(web && c.startTime && c.endTime && (web.days || []).length && (web.days || []).every((d) => (c.days || []).includes(d)) && overlaps(web, c));
    return [...classes].map((c) => ({ c, fit: fits(c) })).sort((a, b) => (b.fit - a.fit) || a.c.name.localeCompare(b.c.name));
  }, [classes, web]);
  const [mode, setMode] = useState(ranked.some((x) => x.fit) ? "existing" : "new");
  const [classId, setClassId] = useState(ranked.find((x) => x.fit)?.c.id || "");
  // Ongoing classes are picked teacher first (A–Z, like Classes and Finance),
  // then one of that teacher's classes. Starts on the teacher of a class
  // with the same days and time, if there is one.
  const [teacherPick, setTeacherPick] = useState(() => {
    const fit = ranked.find((x) => x.fit)?.c;
    return fit ? (teachers.some((t) => t.id === fit.teacherId) ? fit.teacherId : "none") : "";
  });
  const teacherGroups = useMemo(() => {
    const groups = [...teachers].sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => ({ id: t.id, name: t.name, list: ranked.filter((x) => x.fit && x.c.teacherId === t.id) }))
      .filter((g) => g.list.length);
    const orphans = ranked.filter((x) => x.fit && !teachers.some((t) => t.id === x.c.teacherId));
    if (orphans.length) groups.push({ id: "none", name: "No teacher", list: orphans });
    return groups;
  }, [teachers, ranked]);
  const pickedGroup = teacherGroups.find((g) => g.id === teacherPick);
  const [lang, setLang] = useState("dv"); // welcome message language
  const label = `${categoryOf(reg.category)?.en || "Class"} ${ageGroupOf(web?.age_group)?.en || ""}`.trim();
  const [draft, setDraft] = useState({
    name: web ? `${label} (${web.start_time})` : "", code: nextClassCode(classes), teacherId: "",
    days: sortDays(web?.days), startTime: web?.start_time || "", endTime: web?.end_time || "",
  });
  const [fee, setFee] = useState(String(reg.monthly_fee ?? web?.monthly_fee ?? ""));
  const [sendWelcome, setSendWelcome] = useState(true);
  const [message, setMessage] = useState("");
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  const target = mode === "existing" ? classes.find((c) => c.id === classId) : { ...draft, name: draft.name.trim() };
  const studentCount = (id) => students.filter((s) => s.classId === id).length;
  // A student already has this ID card number: they can't be added again.
  const duplicate = students.find((s) => s.nic && s.nic.trim().toUpperCase() === (reg.nic || "").trim().toUpperCase());

  // The welcome text follows the chosen class and fee until the admin edits it.
  useEffect(() => {
    if (edited || !target) return;
    let cancelled = false;
    const preview = {
      name: reg.name, className: target.name, fee: Number(fee) || 0, classType: { category: reg.category, ageGroup: web?.age_group || (reg.class_label.includes("Children") ? "children" : "adults") },
      schedule: target.days?.length ? { days: sortDays(target.days), startTime: target.startTime, endTime: target.endTime } : null,
    };
    registrationWelcomeText(preview, teacherName(target.teacherId), lang).then((t) => { if (!cancelled) setMessage(t); });
    return () => { cancelled = true; };
  }, [mode, classId, draft, fee, edited, lang]);

  const toggleDay = (d) => setDraft((x) => ({ ...x, days: x.days.includes(d) ? x.days.filter((y) => y !== d) : sortDays([...x.days, d]) }));

  const accept = async () => {
    const monthlyFee = Number(fee);
    if (duplicate) { setProblem(`ID card ${reg.nic} is already on ${duplicate.studentCode} ${duplicate.name}.`); return; }
    if (mode === "existing" && !target) { setProblem("Choose the class to add the student to."); return; }
    if (mode === "new") {
      if (!target.name) { setProblem("Give the new class a name."); return; }
      if (!target.days.length || !target.startTime || !target.endTime || target.endTime <= target.startTime) { setProblem("Give the new class its days and a start and end time."); return; }
    }
    if (fee === "" || !Number.isFinite(monthlyFee) || monthlyFee < 0) { setProblem("Enter the monthly fee."); return; }
    setProblem("");
    setBusy(true);

    let cls = target;
    if (mode === "new") {
      const { data, error } = await supabase.from("classes").insert({
        name: target.name, code: target.code.trim() || null, teacher_id: target.teacherId || null,
        days: target.days, start_time: target.startTime, end_time: target.endTime,
      }).select().single();
      if (error) { setBusy(false); setProblem(`Couldn’t make the class: ${error.message}`); return; }
      cls = { id: data.id, name: data.name, teacherId: data.teacher_id, row: data };
    }

    const { data: studentId, error: err } = await supabase.rpc("accept_registration", { p_id: reg.id, p_class_id: cls.id, p_monthly_fee: monthlyFee });
    if (err) {
      // Don't leave behind an empty class made just for this student.
      if (cls.row) await supabase.from("classes").delete().eq("id", cls.id);
      setBusy(false);
      setProblem(`Couldn’t accept: ${err.message}`);
      return;
    }
    if (cls.row) onClassCreated?.(cls.row);
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    // A portal login is made only when the message gives its password.
    const needsLogin = sendWelcome && message.includes("{password}");
    const login = needsLogin ? await supabase.functions.invoke("student-login", { body: { student_id: studentId } }) : null;
    const { data: row } = await supabase.from("students").select("*").eq("id", studentId).single();

    let note = "";
    if (sendWelcome && row) {
      const student = { id: row.id, userId: row.user_id, name: row.name, studentCode: row.student_code, phone: row.phone, email: row.email };
      const sent = await sendRegistrationWelcome(student, message, login?.data?.password);
      note = sent.ok ? ` Welcome sent. ${sent.message}` : " The welcome message couldn’t be sent — send it from Notifications.";
      if (needsLogin && !login?.data?.password) note += " The portal login couldn’t be made — make it from the student’s Edit.";
    }
    setBusy(false);
    showToast(`${reg.name} added to ${cls.name} (Student ID ${row?.student_code || "—"}).${note}`);
    onDone(row, monthKey);
  };

  return (
    <div className="rg-accept">
      <div className="rg-class">
        <span className="rg-class-tag">Chose on the website</span>
        <b>{categoryOf(reg.category)?.en}</b>
        <span>{reg.class_label.split(" · ").slice(1).join(" · ")}</span>
      </div>

      {duplicate && <div className="rg-problem">ID card {reg.nic} is already on <b>{duplicate.studentCode} {duplicate.name}</b> ({duplicate.className || "no class"}). This person is already a student, so they can’t be added again.</div>}

      <fieldset className="rg-step">
        <legend>1. Add {reg.name.split(" ")[0]} to</legend>
        <div className="rg-choice">
          <button type="button" aria-pressed={mode === "existing"} className={mode === "existing" ? "on" : ""} onClick={() => setMode("existing")}>An ongoing class</button>
          <button type="button" aria-pressed={mode === "new"} className={mode === "new" ? "on" : ""} onClick={() => setMode("new")}>A new class</button>
        </div>
        {mode === "existing" ? (
          <div className="rg-pick">
            {web && <p className="rg-sub">Classes on {fmtDays(web.days)} at {fmtTime(web.start_time)}–{fmtTime(web.end_time)}, like the student chose.</p>}
            {teacherGroups.length === 0 ? (
              <div className="rg-problem">No ongoing class on these days and time. <button type="button" className="rg-linkbtn" onClick={() => setMode("new")}>Make a new class</button></div>
            ) : (
            <label>Teacher
              <select className="lc-select" value={teacherPick} onChange={(e) => { setTeacherPick(e.target.value); setClassId(""); }}>
                <option value="">Choose a teacher…</option>
                {teacherGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name} · {g.list.length} matching class{g.list.length === 1 ? "" : "es"}</option>
                ))}
              </select>
            </label>
            )}
            {pickedGroup && (
              <div className="rg-classlist" role="radiogroup" aria-label={`${pickedGroup.name}’s classes`}>
                {pickedGroup.list.map(({ c, fit }) => (
                  <button key={c.id} type="button" role="radio" aria-checked={classId === c.id} className={`rg-classopt ${classId === c.id ? "on" : ""}`} onClick={() => setClassId(c.id)}>
                    <span className="rg-classopt-main">
                      <b>{c.code && <span className="rg-code">{c.code}</span>}{c.name}</b>
                      <span>{c.days?.length ? `${fmtDays(sortDays(c.days))} · ${fmtTime(c.startTime)}–${fmtTime(c.endTime)}` : "No time set"} · {studentCount(c.id)} student{studentCount(c.id) === 1 ? "" : "s"}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rg-newclass">
            <label className="rg-wide">Class name<input className="lc-input" value={draft.name} onChange={(e) => setDraft((x) => ({ ...x, name: e.target.value }))} /></label>
            <label>Code<input className="lc-input" value={draft.code} onChange={(e) => setDraft((x) => ({ ...x, code: e.target.value }))} /></label>
            <label>Teacher
              <select className="lc-select" value={draft.teacherId} onChange={(e) => setDraft((x) => ({ ...x, teacherId: e.target.value }))}>
                <option value="">Not yet</option>
                {[...teachers].sort((a, b) => a.name.localeCompare(b.name)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <div className="rg-wide">
              <span className="rg-label">Days</span>
              <div className="rg-days">
                {DAYS.map((d) => <button key={d} type="button" aria-pressed={draft.days.includes(d)} className={`rg-day ${draft.days.includes(d) ? "on" : ""}`} onClick={() => toggleDay(d)}>{d}</button>)}
              </div>
            </div>
            <label>Starts<input className="lc-input" type="time" value={draft.startTime} onChange={(e) => setDraft((x) => ({ ...x, startTime: e.target.value }))} /></label>
            <label>Ends<input className="lc-input" type="time" value={draft.endTime} onChange={(e) => setDraft((x) => ({ ...x, endTime: e.target.value }))} /></label>
          </div>
        )}
        <label className="rg-fee">Monthly fee (MVR)<input className="lc-input" type="number" min="0" step="any" value={fee} onChange={(e) => setFee(e.target.value)} /></label>
      </fieldset>

      <fieldset className="rg-step">
        <legend>2. Welcome message</legend>
        <label className="rg-check"><input type="checkbox" checked={sendWelcome} onChange={(e) => setSendWelcome(e.target.checked)} /> Send the welcome message</label>
        {sendWelcome && (
          <>
            <div className="rg-choice rg-lang" role="group" aria-label="Message language">
              <button type="button" aria-pressed={lang === "en"} className={lang === "en" ? "on" : ""} onClick={() => { setLang("en"); setEdited(false); }}>English</button>
              <button type="button" lang="dv" aria-pressed={lang === "dv"} className={lang === "dv" ? "on" : ""} onClick={() => { setLang("dv"); setEdited(false); }}>ދިވެހި</button>
            </div>
            <textarea className="lc-input rg-message" dir={lang === "dv" ? "rtl" : "ltr"} lang={lang === "dv" ? "dv" : undefined} rows={8} value={message} onChange={(e) => { setMessage(e.target.value); setEdited(true); }} />
            <div className="rg-message-foot">
              {/\{(student_id|password)\}/.test(message) && <span>{"{student_id}"} and {"{password}"} are filled in when you accept.</span>}
              {edited && <button type="button" className="rg-linkbtn" onClick={() => setEdited(false)}>Undo my changes</button>}
              {onEditWelcome && <button type="button" className="rg-linkbtn" onClick={onEditWelcome}><PenLine size={14} aria-hidden="true" /> Change the standard message</button>}
            </div>
          </>
        )}
      </fieldset>

      <p className="rg-sub">{fmtMvr(reg.registration_fee || 0)} registration fee will be recorded as income in Finance.</p>
      {problem && <div className="rg-problem" role="alert">{problem}</div>}
      <div className="rg-actions">
        <button type="button" className="tp-btn-outline" onClick={onBack} disabled={busy}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
        <button type="button" className="tp-btn-gradient" onClick={accept} disabled={busy || !!duplicate}><CheckCircle2 size={17} aria-hidden="true" /> {busy ? "Accepting…" : sendWelcome ? "Accept & send welcome" : "Accept"}</button>
      </div>
    </div>
  );
}


// The class times shown on the website, per class type and age group.
const blankTime = (category, age_group) => ({ category, age_group, days: [], start_time: "", end_time: "", registration_fee: "100", monthly_fee: "", note: "", is_open: true });

function WebClasses({ showToast }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // draft shaped like blankTime(), with id when editing
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    const { data, error: err } = await supabase.from("web_classes").select("*").order("start_time");
    if (err) { setError(err.message); setRows([]); return; }
    setRows(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    if (!editing.days.length) { showToast("Choose at least one day."); return; }
    if (!editing.start_time || !editing.end_time || editing.end_time <= editing.start_time) { showToast("The end time must be after the start time."); return; }
    const row = {
      category: editing.category, age_group: editing.age_group, days: sortDays(editing.days),
      start_time: editing.start_time, end_time: editing.end_time,
      registration_fee: Number(editing.registration_fee), monthly_fee: Number(editing.monthly_fee),
      note: editing.note.trim() || null, is_open: editing.is_open,
    };
    setBusy(true);
    const { error: err } = editing.id
      ? await supabase.from("web_classes").update(row).eq("id", editing.id)
      : await supabase.from("web_classes").insert(row);
    setBusy(false);
    if (err) { showToast(`Couldn’t save: ${err.message}`); return; }
    showToast(editing.id ? "Website class updated." : row.is_open ? "Added. It now shows on the website." : "Added (hidden).");
    setEditing(null);
    load();
  };

  const toggleOpen = async (o) => {
    const { error: err } = await supabase.from("web_classes").update({ is_open: !o.is_open }).eq("id", o.id);
    if (err) { showToast(`Couldn’t update: ${err.message}`); return; }
    showToast(o.is_open ? "Hidden from the website." : "Showing on the website.");
    load();
  };

  const remove = async (o) => {
    if (!(await confirmDialog({ title: "Delete this website class?", message: "It will be removed from the website. Registrations already sent for it are kept.", confirmLabel: "Delete" }))) return;
    const { error: err } = await supabase.from("web_classes").delete().eq("id", o.id);
    if (err) { showToast(`Couldn’t delete: ${err.message}`); return; }
    showToast("Website class deleted.");
    load();
  };

  const set = (patch) => setEditing((d) => ({ ...d, ...patch }));
  const toggleDay = (day) => set({ days: editing.days.includes(day) ? editing.days.filter((d) => d !== day) : [...editing.days, day] });

  // The add/edit form, shown inside the class type and age group it belongs to.
  const timeForm = editing && (
    <form className="rg-form" onSubmit={save}>
      <strong>{editing.id ? "Edit time" : "New time"}</strong>
      <div>
        <span className="rg-label">Days</span>
        <div className="rg-days">
          {DAYS.map((d) => <button key={d} type="button" aria-pressed={editing.days.includes(d)} className={`rg-day ${editing.days.includes(d) ? "on" : ""}`} onClick={() => toggleDay(d)}>{d}</button>)}
        </div>
      </div>
      <div className="rg-form-grid">
        <label>Starts<input className="lc-input" type="time" required value={editing.start_time} onChange={(e) => set({ start_time: e.target.value })} /></label>
        <label>Ends<input className="lc-input" type="time" required value={editing.end_time} onChange={(e) => set({ end_time: e.target.value })} /></label>
        <label>Registration fee (MVR)<input className="lc-input" type="number" min="0" step="any" required value={editing.registration_fee} onChange={(e) => set({ registration_fee: e.target.value })} /></label>
        <label>Monthly fee (MVR)<input className="lc-input" type="number" min="0" step="any" required value={editing.monthly_fee} onChange={(e) => set({ monthly_fee: e.target.value })} /></label>
      </div>
      <label>Note on the website (optional)<input className="lc-input" maxLength={200} placeholder="e.g. Girls only · Online on Zoom" value={editing.note} onChange={(e) => set({ note: e.target.value })} /></label>
      <label className="rg-check"><input type="checkbox" checked={editing.is_open} onChange={(e) => set({ is_open: e.target.checked })} /> Show on the website</label>
      <div className="rg-actions">
        <button type="button" className="tp-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
        <button type="submit" className="tp-btn-gradient" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );

  if (error) return <div className="tp-card rg-error" role="alert">Couldn’t load website classes: {error}</div>;
  if (rows === null) return <div className="tp-card">Loading…</div>;

  return CATEGORIES.map((c) => (
    <section key={c.key} className="tp-card rg-cat">
      <h3>{c.en}</h3>
      <div className="rg-cat-groups">
        {AGE_GROUPS.map((g) => {
          const list = rows.filter((o) => o.category === c.key && o.age_group === g.key);
          const addingHere = editing && !editing.id && editing.category === c.key && editing.age_group === g.key;
          return (
            <div key={g.key} className="rg-group">
              <div className="rg-group-head">
                <div className="rg-group-title">{g.en} <span>{g.sub}</span></div>
                {!addingHere && <button type="button" className="tp-btn-outline rg-add" onClick={() => setEditing(blankTime(c.key, g.key))}><Plus size={15} aria-hidden="true" /> Add time</button>}
              </div>
              {list.length === 0 && !addingHere && <div className="rg-sub">No times yet.</div>}
              {list.map((o) => (editing?.id === o.id ? <div key={o.id}>{timeForm}</div> : (
                <div key={o.id} className={`rg-time ${o.is_open ? "" : "rg-closed"}`}>
                  <div className="rg-time-main">
                    <b>{fmtDays(o.days)}</b>
                    <span className="rg-time-hours">{fmtTime(o.start_time)} – {fmtTime(o.end_time)}</span>
                    <span>Registration {fmtMvr(o.registration_fee)} · Monthly {fmtMvr(o.monthly_fee)}</span>
                    {o.note && <span>{o.note}</span>}
                    {!o.is_open && <span className="rg-badge" style={CLOSED}>Hidden</span>}
                  </div>
                  <div className="rg-time-actions">
                    <button type="button" className="tp-btn-outline rg-icon" onClick={() => setEditing({ ...o, registration_fee: String(o.registration_fee), monthly_fee: String(o.monthly_fee), note: o.note || "" })} aria-label="Edit" title="Edit"><Pencil size={16} /></button>
                    <button type="button" className="tp-btn-outline rg-icon" onClick={() => toggleOpen(o)} aria-label={o.is_open ? "Hide from website" : "Show on website"} title={o.is_open ? "Hide from website" : "Show on website"}>{o.is_open ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    <button type="button" className="tp-btn-outline rg-icon rg-danger" onClick={() => remove(o)} aria-label="Delete" title="Delete"><Trash2 size={16} /></button>
                  </div>
                </div>
              )))}
              {addingHere && timeForm}
            </div>
          );
        })}
      </div>
    </section>
  ));
}

// The four form links to share (main form, and one per class type for
// posters), each with its own open/close switch.
function FormLinks({ showToast }) {
  const [forms, setForms] = useState(null);
  useEffect(() => {
    supabase.from("registration_forms").select("form, is_open").then(({ data, error }) => {
      setForms(error ? false : Object.fromEntries((data || []).map((f) => [f.form, f.is_open])));
    });
  }, []);

  const toggle = async (form) => {
    const open = !forms[form.key];
    const { error } = await supabase.from("registration_forms").update({ is_open: open, updated_at: new Date().toISOString() }).eq("form", form.key);
    if (error) { showToast(`Couldn’t update the form: ${error.message}`); return; }
    setForms((f) => ({ ...f, [form.key]: open }));
    showToast(`${form.en} ${open ? "opened" : "closed"}.`);
  };

  const copy = async (form) => {
    const url = formUrl(form.key);
    try { await navigator.clipboard.writeText(url); showToast(`${form.en} link copied.`); }
    catch { showToast(url); }
  };

  if (forms === null) return <div className="tp-card">Loading…</div>;
  if (forms === false) return <div className="tp-card rg-error">Couldn’t load the forms.</div>;

  return (
    <div className="rg-grid">
      {FORMS.map((f) => {
        const open = forms[f.key] !== false;
        return (
          <article key={f.key} className="tp-card rg-card">
            <div className="rg-top">
              <div style={{ minWidth: 0 }}>
                <div className="rg-name">{f.key === "all" ? "Main form" : categoryOf(f.key).en}</div>
                <div className="rg-sub">{f.key === "all" ? "All classes · opened by the website’s Register buttons" : "For posters · class already chosen"}</div>
              </div>
              <span className="rg-badge" style={open ? OPEN : CLOSED}>{open ? "Open" : "Closed"}</span>
            </div>
            <a className="rg-link-url" href={formUrl(f.key)} target="_blank" rel="noreferrer">{formUrl(f.key)} <ExternalLink size={13} aria-hidden="true" /></a>
            <div className="rg-actions">
              <button type="button" className="tp-btn-gradient" onClick={() => copy(f)}><Copy size={16} aria-hidden="true" /> Copy link</button>
              <button type="button" className={`tp-btn-outline ${open ? "rg-danger" : ""}`} onClick={() => toggle(f)}>{open ? <><Lock size={16} aria-hidden="true" /> Close form</> : <><LockOpen size={16} aria-hidden="true" /> Open form</>}</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

const rgCss = () => `
  .rg-wrap { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 16px; }
  .rg-sections { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; }
  .rg-section { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px 12px; border-radius: 14px; border: 1px solid ${TP.border}; background: #FFFFFF; color: ${TP.navy}; font-weight: 700; font-size: 15px; cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
  .rg-section:hover { border-color: ${TP.blue}; }
  .rg-section.on { background: linear-gradient(90deg, ${TP.gradStart}, ${TP.blue}); border-color: transparent; color: #FFFFFF; box-shadow: 0 6px 16px rgba(13,79,133,.2); }
  .rg-section:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
  .rg-count { min-width: 22px; padding: 2px 7px; border-radius: 999px; background: #EF9F27; color: #FFFFFF; font-size: 12px; }
  .rg-help { margin: -4px 0 0; font-size: 14px; color: ${TP.secondaryText}; }
  .rg-error { color: #A5432C; }
  .rg-empty { text-align: center; color: ${TP.secondaryText}; padding: 28px; }
  .rg-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 14px; }
  .rg-toolbar-right { display: flex; align-items: center; gap: 8px; }
  .rg-tab-count { opacity: .7; font-weight: 600; margin-left: 2px; }
  .rg-select { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: ${TP.navy}; }
  .rg-select select { width: auto; min-width: 160px; }
  .rg-list { display: flex; flex-direction: column; padding: 6px; }
  .rg-row { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px; border: 0; border-bottom: 1px solid ${TP.border}; background: none; text-align: left; font: inherit; color: ${TP.navy}; cursor: pointer; border-radius: 10px; }
  .rg-row:last-child { border-bottom: 0; }
  .rg-row:hover { background: #F3F8FC; }
  .rg-row:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: -2px; }
  .rg-row-main { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .rg-row-main b { font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rg-row-main span { font-size: 13px; color: ${TP.secondaryText}; }
  .rg-row-go { flex-shrink: 0; color: ${TP.secondaryText}; }
  .rg-modal { position: fixed; inset: 0; z-index: 100; background: rgba(10,30,50,0.55); display: flex; align-items: center; justify-content: center; padding: 16px; }
  .rg-modal-box { width: min(520px, 100%); max-height: calc(100vh - 32px); overflow-y: auto; box-sizing: border-box; }
  .rg-close { flex-shrink: 0; display: flex; padding: 4px; margin: -4px -6px 0 0; border: 0; background: none; color: ${TP.secondaryText}; cursor: pointer; border-radius: 8px; }
  .rg-close:hover { background: #F3F8FC; color: ${TP.navy}; }
  .rg-top .rg-badge { margin-left: auto; }
  .rg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 16px; }
  .rg-card { display: flex; flex-direction: column; gap: 12px; padding: 18px; }
  .rg-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .rg-name { font-weight: 700; font-size: 17px; color: ${TP.navy}; overflow-wrap: anywhere; }
  .rg-sub { font-size: 13px; color: ${TP.secondaryText}; margin: 0; }
  .rg-badge { flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
  .rg-class { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 12px; background: #F3F8FC; font-size: 14px; color: ${TP.navy}; }
  .rg-class b { font-size: 15px; }
  .rg-class small { color: ${TP.secondaryText}; }
  .rg-class-tag { font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: ${TP.secondaryText}; }
  .rg-facts { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; font-size: 14px; }
  .rg-facts dt { color: ${TP.secondaryText}; }
  .rg-facts dd { margin: 0; color: ${TP.navy}; font-weight: 600; overflow-wrap: anywhere; }
  .rg-links-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .rg-links-row a { flex: 1 1 auto; justify-content: center; text-decoration: none; }
  .rg-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: auto; padding-top: 12px; border-top: 1px solid ${TP.border}; }
  .rg-actions button { flex: 1 1 auto; justify-content: center; }
  .rg-actions .rg-icon { flex: 0 0 auto; }
  .rg-danger { color: #A5432C; border-color: #E3C3BA; }
  .rg-icon { padding: 8px; }
  .rg-done { flex: 1 1 auto; display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #1E7A4C; }
  .rg-link-url { display: inline-flex; align-items: center; gap: 4px; padding: 10px 12px; border-radius: 10px; background: #F3F8FC; border: 1px solid ${TP.border}; font-size: 14px; color: ${TP.blue}; text-decoration: none; overflow-wrap: anywhere; }
  .rg-accept { display: flex; flex-direction: column; gap: 14px; }
  .rg-step { margin: 0; padding: 12px 14px 14px; border: 1px solid ${TP.border}; border-radius: 14px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
  .rg-step legend { padding: 0 6px; font-weight: 700; font-size: 14px; color: ${TP.navy}; }
  .rg-choice { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .rg-choice button { padding: 10px; border-radius: 10px; border: 1px solid ${TP.border}; background: #FFFFFF; color: ${TP.navy}; font-weight: 600; cursor: pointer; }
  .rg-choice button.on { background: ${TP.blue}; border-color: ${TP.blue}; color: #FFFFFF; }
  .rg-pick { display: flex; flex-direction: column; gap: 10px; }
  .rg-classlist { display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; padding: 2px; }
  .rg-classopt { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border: 1px solid ${TP.border}; border-radius: 12px; background: #FFFFFF; color: ${TP.navy}; text-align: left; font: inherit; cursor: pointer; }
  .rg-classopt:hover { border-color: ${TP.blue}; }
  .rg-classopt.on { border-color: ${TP.blue}; background: #EAF3FC; box-shadow: 0 0 0 1px ${TP.blue} inset; }
  .rg-classopt:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
  .rg-classopt-main { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .rg-classopt-main b { display: flex; align-items: center; gap: 8px; font-size: 14px; }
  .rg-classopt-main > span { font-size: 12px; color: ${TP.secondaryText}; }
  .rg-code { padding: 2px 8px; border-radius: 999px; background: #EAF3FC; color: ${TP.blue}; font-size: 11px; font-weight: 700; }
  .rg-lang button[lang="dv"] { font-family: Faruma, Inter, system-ui, sans-serif; font-size: 16px; }
  .rg-newclass { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .rg-newclass .rg-wide { grid-column: 1 / -1; }
  .rg-accept label, .rg-form label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: ${TP.navy}; }
  .rg-accept label.rg-check, .rg-form label.rg-check { flex-direction: row; align-items: center; gap: 8px; font-weight: 500; }
  label.rg-check { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: ${TP.navy}; cursor: pointer; }
  .rg-check input { width: 18px; height: 18px; flex-shrink: 0; accent-color: ${TP.blue}; }
  .rg-fee { max-width: 220px; }
  .rg-label { display: block; font-size: 13px; font-weight: 600; color: ${TP.navy}; margin-bottom: 6px; }
  .rg-days { display: flex; flex-wrap: wrap; gap: 6px; }
  .rg-day { min-width: 46px; padding: 7px 8px; border-radius: 10px; border: 1px solid ${TP.border}; background: #FFFFFF; color: ${TP.navy}; font-weight: 600; cursor: pointer; }
  .rg-day.on { background: ${TP.blue}; border-color: ${TP.blue}; color: #FFFFFF; }
  .rg-message { font-family: Faruma, Inter, system-ui, sans-serif; font-size: 15px; line-height: 1.8; resize: vertical; white-space: pre-wrap; }
  .rg-message-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; font-size: 12px; color: ${TP.secondaryText}; }
  .rg-linkbtn { display: inline-flex; align-items: center; gap: 4px; border: 0; background: none; padding: 0; color: ${TP.blue}; font-weight: 600; font-size: 13px; cursor: pointer; }
  .rg-problem { margin: 0; padding: 10px 12px; border-radius: 10px; background: #FBE9E4; color: #A5432C; font-size: 14px; }
  .rg-cat { display: flex; flex-direction: column; gap: 14px; }
  .rg-cat h3 { margin: 0; font-size: 18px; color: ${TP.navy}; }
  .rg-cat-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: 16px; }
  .rg-group { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 14px; background: #F7FAFD; border: 1px solid ${TP.border}; }
  .rg-group-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .rg-group-title { font-size: 15px; font-weight: 700; color: ${TP.navy}; }
  .rg-group-title span { font-size: 12px; font-weight: 600; color: ${TP.secondaryText}; margin-left: 4px; }
  .rg-add { padding: 6px 10px; font-size: 13px; }
  .rg-time { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border: 1px solid ${TP.border}; border-radius: 12px; background: #FFFFFF; }
  .rg-time.rg-closed { opacity: .7; border-style: dashed; }
  .rg-time-main { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; font-size: 13px; color: ${TP.secondaryText}; min-width: 0; }
  .rg-time-main b { font-size: 14px; color: ${TP.navy}; }
  .rg-time-hours { font-size: 14px; font-weight: 600; color: ${TP.navy}; }
  .rg-time-actions { display: flex; gap: 6px; flex-shrink: 0; }
  .rg-form { display: flex; flex-direction: column; gap: 12px; padding: 12px; border-radius: 12px; background: #FFFFFF; border: 1.5px solid ${TP.blue}; color: ${TP.navy}; }
  .rg-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .rg-form .rg-actions { padding-top: 0; border-top: 0; }
  @media (max-width: 640px) {
    .rg-sections { grid-template-columns: 1fr; }
    .rg-section { justify-content: flex-start; }
    .rg-toolbar-right { width: 100%; }
    .rg-select { flex: 1; }
    .rg-select select { flex: 1; min-width: 0; }
    .rg-time { flex-wrap: wrap; }
  }
`;
