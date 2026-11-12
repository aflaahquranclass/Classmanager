import { useState, useEffect } from "react";
import { Star, CheckCircle2, Send, Lock } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { thaanaChange } from "../notifications/thaanaKeyboard.js";
import { REVIEW_CLASSES as CLASS_OPTIONS } from "./content.js";
import { FormHeader } from "./parts.jsx";

// Review form (/review?k=…), in Dhivehi. It only works through
// the private link the admin shares in class groups (Admin → Reviews); the
// website doesn't link to it. A review waits for the admin's OK before it
// shows on the home page. The Viber number and the request stay private.
const EMPTY = { name: "", viber: "", className: "", comment: "", request: "" };
const STAR_WORDS = [
  null,
  { en: "Poor", dv: "ވަރަށް ދަށް" },
  { en: "Fair", dv: "ދަށް" },
  { en: "Good", dv: "ރަނގަޅު" },
  { en: "Very good", dv: "ވަރަށް ރަނގަޅު" },
  { en: "Excellent", dv: "ވަރަށް ފުރިހަމަ" },
];

function Label({ text, required, htmlFor }) {
  return (
    <label className="ld-f-label" htmlFor={htmlFor}>
      <span className="ld-dv">{text}:{required && <b aria-hidden="true"> *</b>}</span>
    </label>
  );
}

// Shown instead of the form when the link is wrong or the form is closed.
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

export default function ReviewPage() {
  const [status, setStatus] = useState(null); // open | closed | invalid
  const [form, setForm] = useState(EMPTY);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [dhivehi, setDhivehi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const key = formKey();
    if (!key) { setStatus("invalid"); return; }
    supabase.rpc("review_form_status", { p_key: key }).then(({ data, error: err }) => setStatus(err ? "invalid" : data || "invalid"));
  }, []);

  // Free-text fields take Thaana from a phonetic keyboard when Dhivehi is on.
  const text = (key) => ({
    id: `rv-${key}`,
    value: form[key],
    dir: "auto",
    onChange: (e) => thaanaChange(e, form[key], (v) => setForm((f) => ({ ...f, [key]: v })), dhivehi),
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.className) { setError("ކުލާސް ޚިޔާރުކުރައްވާ."); return; }
    if (!rating) { setError("ތަރީގެ ޢަދަދު ޚިޔާރުކުރައްވާ."); return; }
    setBusy(true);
    setError("");
    const { error: err } = await supabase.rpc("submit_review", {
      p_key: formKey(),
      p_name: form.name.trim(),
      p_viber: form.viber.trim(),
      p_class_name: form.className.trim(),
      p_rating: rating,
      p_comment: form.comment.trim(),
      p_request: form.request.trim(),
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
            <p className="ld-lead">ތިޔަ ފޮނުއްވި ޚިޔާލު ލިބިއްޖެ. އެޑްމިން ބަލައިގަތުމުން ވެބްސައިޓުގައި ފެންނާނެ.</p>
            <button type="button" className="ld-btn ld-btn-outline" onClick={() => { setForm(EMPTY); setRating(0); setSent(false); }}>އިތުރު ޚިޔާލެއް ފޮނުއްވާ</button>
          </div>
        </div>
      </section>
    );
  }

  const shown = hover || rating;
  return (
    <section className="ld-sec ld-soft ld-rv">
      <div className="ld-wrap">
        <form className="ld-rv-card" onSubmit={submit}>
          <FormHeader />
          <div className="ld-rv-head">
            <p className="ld-tag">ދަރިވަރުންގެ ޚިޔާލު</p>
            <h1 className="ld-dv ld-rv-big ld-rv-title">ކުލާހާމެދު ދެކޭގޮތް ފާޅުކުރައްވާ!</h1>
          </div>

          <div className="ld-rv-kbd">
            <span className="ld-dv">ކޮމްޕިއުޓަރުން ދިވެހިން ލިޔުއްވާނަމަ</span>
            <button type="button" className={`ld-rv-toggle ${dhivehi ? "on" : ""}`} aria-pressed={dhivehi} onClick={() => setDhivehi((d) => !d)}>
              <span lang="dv">ދިވެހި ކީބޯޑު: {dhivehi ? "ހުޅުވާފައި" : "ބަންދު"}</span>
            </button>
          </div>

          <div className="ld-f">
            <Label text="ނަން" required htmlFor="rv-name" />
            <input className="ld-input" {...text("name")} required maxLength={80} autoComplete="name" />
          </div>

          <div className="ld-f">
            <Label text="ވައިބަރ ނަންބަރު" required htmlFor="rv-viber" />
            <input className="ld-input" id="rv-viber" type="tel" inputMode="tel" dir="ltr" required minLength={5} maxLength={20} pattern="[+0-9 \-]{5,20}" placeholder="7xxxxxx" autoComplete="tel"
              value={form.viber} onChange={(e) => setForm((f) => ({ ...f, viber: e.target.value }))} />
          </div>

          <div className="ld-f">
            <Label text="ކުލާސް" required />
            <div className="ld-rv-classes" role="radiogroup" aria-label="ކުލާސް">
              {CLASS_OPTIONS.map((c) => (
                <label key={c.en} className={`ld-rv-class ${form.className === c.en ? "on" : ""}`}>
                  <input type="radio" name="rv-class" value={c.en} checked={form.className === c.en} onChange={() => { setForm((f) => ({ ...f, className: c.en })); setError(""); }} />
                  <span className="ld-dv">{c.dv}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="ld-f">
            <Label text="ކުލާހަށް ދެއްވާ ތަރި" required />
            <div className="ld-rv-stars" role="radiogroup" aria-label="ތަރި" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} ތަރި`}
                  className={n <= shown ? "on" : ""} onMouseEnter={() => setHover(n)} onClick={() => { setRating(n); setError(""); }}>
                  <Star size={34} fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
                </button>
              ))}
              {STAR_WORDS[shown] && <span className="ld-rv-word"><span className="ld-dv">{STAR_WORDS[shown].dv}</span></span>}
            </div>
          </div>

          <div className="ld-f">
            <Label text="ކުލާހާމެދު ދެކޭގޮތް" required htmlFor="rv-comment" />
            <textarea className="ld-input" {...text("comment")} required maxLength={1000} rows={5} />
          </div>

          <div className="ld-f">
            <Label text="އެއްވެސް ހުށައެޅުމެއް ވާނަމަ (ލާޒިމެއް ނޫން)" htmlFor="rv-request" />
            <textarea className="ld-input" {...text("request")} maxLength={1000} rows={3} />
            <small className="ld-f-note">މި މަޢުލޫމާތު ފެނިގެންދާނީ ޤުރުއާން ކުލާހުގެ އިދާރާއަށް އެކަންޏެވެ.</small>
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
