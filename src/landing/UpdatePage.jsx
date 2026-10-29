import { useState, useEffect } from "react";
import { CheckCircle2, Send, Lock } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { FormHeader } from "./parts.jsx";

// Student information update form (/update?k=…), for current students: their
// ID card number, atoll and island, Viber number and email, which weren't
// collected before.
// Like the review form it only works through the private link the admin
// shares in class groups (Admin → Registrations → Info updates); the website
// doesn't link to it. The admin matches each response to a student.
const EMPTY = { name: "", nic: "", atollIsland: "", viber: "", email: "" };

function Label({ en, dv, required, htmlFor }) {
  return (
    <label className="ld-f-label" htmlFor={htmlFor}>
      <span>{en}:{required && <b aria-hidden="true"> *</b>}</span>
      <span className="ld-dv" lang="dv" dir="rtl">{dv}:</span>
    </label>
  );
}

function FormUnavailable({ closed }) {
  return (
    <section className="ld-sec ld-soft ld-rv">
      <div className="ld-wrap">
        <div className="ld-rv-card ld-rv-done">
          <FormHeader />
          <Lock size={44} aria-hidden="true" />
          {closed ? (
            <>
              <p className="ld-dv ld-rv-big" lang="dv" dir="rtl">މިހާރު މި ފޯމު ބަންދުކޮށްފައިވަނީ.</p>
              <p className="ld-lead">This form is closed at the moment.</p>
            </>
          ) : (
            <>
              <p className="ld-dv ld-rv-big" lang="dv" dir="rtl">މި ފޯމު ފުރިހަމަކުރެވޭނީ ކުލާހުގެ ގްރޫޕަށް ފޮނުވާ ލިންކުން އެކަނި.</p>
              <p className="ld-lead">This form can only be opened with the link shared in your class group.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

const formKey = () => new URLSearchParams(window.location.search).get("k") || "";

export default function UpdatePage() {
  const [status, setStatus] = useState(null); // open | closed | invalid
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const key = formKey();
    if (!key) { setStatus("invalid"); return; }
    supabase.rpc("info_form_status", { p_key: key }).then(({ data, error: err }) => setStatus(err ? "invalid" : data || "invalid"));
  }, []);

  const field = (key) => ({ id: `up-${key}`, value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: err } = await supabase.rpc("submit_student_info", {
      p_key: formKey(), p_name: form.name.trim(), p_nic: form.nic.trim(), p_atoll_island: form.atollIsland.trim(), p_viber: form.viber.trim(),
      p_email: form.email.trim(), p_student_code: "", p_class_name: "",
    });
    setBusy(false);
    if (err?.message?.includes("closed or invalid")) { setStatus("closed"); return; }
    if (err) { setError("Couldn’t send. Please try again. · ފޮނުވޭކަށް ނެތް، އަލުން މަސައްކަތް ކުރައްވާ."); return; }
    setSent(true);
    window.scrollTo(0, 0);
  };

  if (status === null) return <section className="ld-sec ld-soft ld-rv" />;
  if (status !== "open") return <FormUnavailable closed={status === "closed"} />;

  if (sent) {
    return (
      <section className="ld-sec ld-soft ld-rv">
        <div className="ld-wrap">
          <div className="ld-rv-card ld-rv-done">
            <FormHeader />
            <CheckCircle2 size={52} aria-hidden="true" />
            <h1 className="ld-h2">Thank you!</h1>
            <p className="ld-dv ld-rv-big" lang="dv" dir="rtl">ޝުކުރިއްޔާ!</p>
            <p className="ld-lead">Your details have been sent to the class office.</p>
            <p className="ld-dv" lang="dv" dir="rtl">ތިޔަ މަޢުލޫމާތު ކުލާހުގެ އިދާރާއަށް ލިބިއްޖެ.</p>
            <button type="button" className="ld-btn ld-btn-outline" onClick={() => { setForm(EMPTY); setSent(false); }}>Send for another student · އެހެން ދަރިވަރެއްގެ</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="ld-sec ld-soft ld-rv">
      <div className="ld-wrap">
        <form className="ld-rv-card" onSubmit={submit}>
          <FormHeader />
          <div className="ld-rv-head">
            <p className="ld-tag">Student information</p>
            <h1 className="ld-h2" style={{ margin: 0 }}>Update your details</h1>
            <p className="ld-dv ld-rv-big" lang="dv" dir="rtl">ދަރިވަރުގެ މަޢުލޫމާތު</p>
            <p className="ld-lead">For students already in the class. One form for each student.</p>
          </div>

          <div className="ld-f">
            <Label en="Student’s name" dv="ދަރިވަރުގެ ނަން" required htmlFor="up-name" />
            <input className="ld-input" {...field("name")} dir="auto" required maxLength={80} autoComplete="name" />
          </div>

          <div className="ld-f">
            <Label en="ID card number" dv="އައިޑީ ކާޑު ނަންބަރު" required htmlFor="up-nic" />
            <input className="ld-input" {...field("nic")} dir="ltr" required minLength={4} maxLength={20} placeholder="A123456" autoCapitalize="characters" />
          </div>

          <div className="ld-f">
            <Label en="Atoll and island" dv="އަތޮޅާއި ރަށް" required htmlFor="up-atollIsland" />
            <input className="ld-input" {...field("atollIsland")} dir="auto" required maxLength={80} placeholder="e.g. K. Malé" />
          </div>

          <div className="ld-f">
            <Label en="Viber number" dv="ވައިބަރ ނަންބަރ" required htmlFor="up-viber" />
            <input className="ld-input" {...field("viber")} type="tel" inputMode="tel" dir="ltr" required minLength={5} maxLength={20} pattern="[+0-9 \-]{5,20}" placeholder="7xxxxxx" autoComplete="tel" />
          </div>

          <div className="ld-f">
            <Label en="Email (optional)" dv="އީމެއިލް" htmlFor="up-email" />
            <input className="ld-input" {...field("email")} type="email" dir="ltr" maxLength={120} autoComplete="email" />
            <small className="ld-f-note">Only the class office will see these details. <span className="ld-dv" lang="dv" dir="rtl">މި މަޢުލޫމާތު ފެނިގެންދާނީ ކުލާހުގެ އިދާރާއަށް އެކަންޏެވެ.</span></small>
          </div>

          {error && <p className="ld-rv-error" role="alert">{error}</p>}

          <button type="submit" className="ld-btn ld-btn-primary ld-rv-submit" disabled={busy}>
            <Send size={18} aria-hidden="true" />{busy ? "Sending…" : "Send"} <span lang="dv">· ފޮނުވާ</span>
          </button>
        </form>
      </div>
    </section>
  );
}
