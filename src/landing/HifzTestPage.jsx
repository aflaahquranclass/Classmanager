import { useState, useEffect } from "react";
import { CheckCircle2, Send, Lock } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { FormHeader } from "./parts.jsx";

// Hifz test registration (aflaahqc.com/hifz-test), all in Dhivehi, with the
// same header as the class forms. The student's full name (as on the ID
// card), age, current address, Viber number, the book for the test and the
// teacher's name. Goes to Admin → Registrations → Hifz test (hifz_test_registrations, see
// supabase/migrations/20261122_hifz_test_registrations.sql), where the admin
// can also close the form.
const EMPTY = { name: "", age: "", address: "", viber: "", book: "", teacher: "" };

const ERRORS = {
  busy: "މިހާރު ވަރަށް ގިނަ ރަޖިސްޓްރޭޝަންތަކެއް ލިބެމުންދަނީ. ކުޑަ ވަގުތަކަށްފަހު އަލުން މަސައްކަތް ކުރައްވާ.",
  invalid: "މަޢުލޫމާތު ބައްލަވާފައި އަލުން ފޮނުއްވާ.",
  save: "ރަޖިސްޓްރޭޝަން ނުފޮނުވުނު. އަލުން މަސައްކަތް ކުރައްވާ.",
};

// What is wrong with the form, or "".
function formError(f) {
  if (f.name.trim().length < 2) return "ދަރިވަރުގެ ފުރިހަމަ ނަން ލިޔުއްވާ.";
  const age = Number(f.age);
  if (!/^\d{1,2}$/.test(String(f.age).trim()) || age < 3 || age > 99) return "ޢުމުރު ރަނގަޅަށް ލިޔުއްވާ.";
  if (f.address.trim().length < 2) return "މިހާރު ދިރިއުޅޭ އެޑްރެސް ލިޔުއްވާ.";
  if (!/^[+0-9 -]{7,20}$/.test(f.viber.trim())) return "ވައިބަރ ނަންބަރު ރަނގަޅަށް ލިޔުއްވާ.";
  if (!f.book.trim()) return "ޓެސްޓްގައި ބައިވެރިވާން ބޭނުންވާ ފޮތް ލިޔުއްވާ.";
  if (f.teacher.trim().length < 2) return "ކިޔަވައި ދެއްވާ މުދައްރިސްގެ ނަން ލިޔުއްވާ.";
  return "";
}

function Label({ text, note, required, htmlFor }) {
  return (
    <label className="ld-f-label" htmlFor={htmlFor}>
      <span className="ld-dv">{text}{note && <small className="ld-ht-note"> ({note})</small>}:{required && <b aria-hidden="true"> *</b>}</span>
    </label>
  );
}

function Shell({ children, done }) {
  return (
    <section className="ld-sec ld-soft ld-rv">
      <div className="ld-wrap">
        <div className={`ld-rv-card ${done ? "ld-rv-done" : ""}`}>
          <FormHeader />
          {children}
        </div>
      </div>
    </section>
  );
}

export default function HifzTestPage() {
  const [open, setOpen] = useState(null); // null while checking
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.rpc("hifz_test_form_open").then(({ data, error: err }) => setOpen(err ? true : data !== false));
  }, []);

  const field = (key) => ({
    id: `ht-${key}`,
    value: form[key],
    onChange: (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setError(""); },
  });

  const submit = async (e) => {
    e.preventDefault();
    const problem = formError(form);
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError("");
    const { error: err } = await supabase.rpc("submit_hifz_test_registration", {
      p_name: form.name.trim(), p_age: Number(form.age), p_address: form.address.trim(),
      p_viber: form.viber.trim(), p_book: form.book.trim(), p_teacher_name: form.teacher.trim(),
    });
    setBusy(false);
    const m = err?.message || "";
    if (m.includes("closed")) { setOpen(false); return; }
    if (err) { setError(m.includes("too many") ? ERRORS.busy : m.includes("not valid") ? ERRORS.invalid : ERRORS.save); return; }
    setSent(true);
    window.scrollTo(0, 0);
  };

  if (open === null) return <section className="ld-sec ld-soft ld-rv" />;

  if (!open) {
    return (
      <Shell done>
        <Lock size={44} aria-hidden="true" />
        <p className="ld-dv ld-rv-big">ހިފްޒު ޓެސްޓްގެ ރަޖިސްޓްރޭޝަން މިހާރު ބަންދުކޮށްފައިވަނީ.</p>
      </Shell>
    );
  }

  if (sent) {
    return (
      <Shell done>
        <CheckCircle2 size={52} aria-hidden="true" />
        <h1 className="ld-h2">ޝުކުރިއްޔާ!</h1>
        <p className="ld-lead">ހިފްޒު ޓެސްޓަށް ރަޖިސްޓަރީވުމުގެ މަޢުލޫމާތު ލިބިއްޖެ. ޓެސްޓާ ގުޅޭ މަޢުލޫމާތު ވައިބަރުން ފޮނުވާނަން.</p>
        <button type="button" className="ld-btn ld-btn-outline" onClick={() => { setForm(EMPTY); setSent(false); }}>އެހެން ދަރިވަރެއް ރަޖިސްޓަރ ކުރައްވާ</button>
      </Shell>
    );
  }

  return (
    <section className="ld-sec ld-soft ld-rv">
      <div className="ld-wrap">
        <form className="ld-rv-card" onSubmit={submit} noValidate>
          <FormHeader />
          <div className="ld-rv-head">
            <p className="ld-tag">ހިފްޒު ޓެސްޓް</p>
            <h1 className="ld-h2" style={{ margin: 0 }}>ހިފްޒު ޓެސްޓަށް ރަޖިސްޓަރީވުން</h1>
            <p className="ld-lead">ކޮންމެ ދަރިވަރަކަށް ވަކި ފޯމެއް ފުރުއްވާ.</p>
          </div>

          <div className="ld-f">
            <Label text="ދަރިވަރުގެ ފުރިހަމަ ނަން" note="އައިޑީކާޑުގައިވާ ގޮތަށް" required htmlFor="ht-name" />
            <input className="ld-input" {...field("name")} dir="auto" required maxLength={80} autoComplete="off" />
          </div>

          <div className="ld-f">
            <Label text="ޢުމުރު" required htmlFor="ht-age" />
            <input className="ld-input ld-ht-short" {...field("age")} type="number" inputMode="numeric" dir="ltr" min={3} max={99} required />
          </div>

          <div className="ld-f">
            <Label text="މިހާރު ދިރިއުޅޭ އެޑްރެސް" required htmlFor="ht-address" />
            <input className="ld-input" {...field("address")} dir="auto" required maxLength={120} placeholder="ގޭގެ ނަން، ރަށް" />
          </div>

          <div className="ld-f">
            <Label text="ވައިބަރ ނަންބަރު" required htmlFor="ht-viber" />
            <input className="ld-input ld-ht-short" {...field("viber")} type="tel" inputMode="tel" dir="ltr" required maxLength={20} placeholder="7xxxxxx" autoComplete="tel" />
          </div>

          <div className="ld-f">
            <Label text="ޓެސްޓްގައި ބައިވެރިވާން ބޭނުންވާ ފޮތް" required htmlFor="ht-book" />
            <input className="ld-input" {...field("book")} dir="auto" required maxLength={80} />
          </div>

          <div className="ld-f">
            <Label text="ކިޔަވައި ދެއްވާ މުދައްރިސްގެ ނަން" required htmlFor="ht-teacher" />
            <input className="ld-input" {...field("teacher")} dir="auto" required maxLength={80} />
          </div>

          {error && <p className="ld-rv-error" role="alert">{error}</p>}

          <button type="submit" className="ld-btn ld-btn-primary ld-rv-submit" disabled={busy}>
            <Send size={18} aria-hidden="true" /><span>{busy ? "ފޮނުވަނީ…" : "ފޮނުވާ"}</span>
          </button>
        </form>
      </div>
    </section>
  );
}
