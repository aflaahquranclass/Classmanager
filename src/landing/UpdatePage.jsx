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

function Label({ text, required, htmlFor }) {
  return (
    <label className="ld-f-label" htmlFor={htmlFor}>
      <span className="ld-dv">{text}:{required && <b aria-hidden="true"> *</b>}</span>
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
          <p className="ld-dv ld-rv-big">
            {closed ? "މިހާރު މި ފޯމު ބަންދުކޮށްފައިވަނީ." : "މި ފޯމު ފުރިހަމަކުރެވޭނީ ކުލާހުގެ ގްރޫޕަށް ފޮނުވާ ލިންކުން އެކަނި."}
          </p>
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
    if (err) { setError("ފޮނުވޭކަށް ނެތް، އަލުން މަސައްކަތް ކުރައްވާ."); return; }
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
            <h1 className="ld-h2">ޝުކުރިއްޔާ!</h1>
            <p className="ld-lead">ތިޔަ މަޢުލޫމާތު ކުލާހުގެ އިދާރާއަށް ލިބިއްޖެ.</p>
            <button type="button" className="ld-btn ld-btn-outline" onClick={() => { setForm(EMPTY); setSent(false); }}>އެހެން ދަރިވަރެއްގެ މަޢުލޫމާތު ފޮނުއްވާ</button>
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
            <p className="ld-tag">ދަރިވަރުގެ މަޢުލޫމާތު</p>
            <h1 className="ld-h2" style={{ margin: 0 }}>މަޢުލޫމާތު އަޕްޑޭޓް ކުރުން</h1>
            <p className="ld-lead">މިހާރު ކުލާހުގައި ކިޔަވާ ދަރިވަރުންނަށް. ކޮންމެ ދަރިވަރަކަށް ވަކި ފޯމެއް ފުރުއްވާ.</p>
          </div>

          <div className="ld-f">
            <Label text="ދަރިވަރުގެ ފުރިހަމަ ނަން" required htmlFor="up-name" />
            <input className="ld-input" {...field("name")} dir="auto" required maxLength={80} autoComplete="name" />
          </div>

          <div className="ld-f">
            <Label text="އައިޑީ ކާޑު ނަންބަރު" required htmlFor="up-nic" />
            <input className="ld-input" {...field("nic")} dir="ltr" required minLength={4} maxLength={20} placeholder="A123456" autoCapitalize="characters" />
          </div>

          <div className="ld-f">
            <Label text="އަތޮޅާއި ރަށް" required htmlFor="up-atollIsland" />
            <input className="ld-input" {...field("atollIsland")} dir="auto" required maxLength={80} placeholder="މިސާލު: ކ. މާލެ" />
          </div>

          <div className="ld-f">
            <Label text="ވައިބަރ ނަންބަރު" required htmlFor="up-viber" />
            <input className="ld-input" {...field("viber")} type="tel" inputMode="tel" dir="ltr" required minLength={5} maxLength={20} pattern="[+0-9 \-]{5,20}" placeholder="7xxxxxx" autoComplete="tel" />
          </div>

          <div className="ld-f">
            <Label text="އީމެއިލް (ލާޒިމެއް ނޫން)" htmlFor="up-email" />
            <input className="ld-input" {...field("email")} type="email" dir="ltr" maxLength={120} autoComplete="email" />
            <small className="ld-f-note">މި މަޢުލޫމާތު ފެނިގެންދާނީ ކުލާހުގެ އިދާރާއަށް އެކަންޏެވެ.</small>
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
