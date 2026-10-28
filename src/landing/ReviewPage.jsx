import { useState, useEffect } from "react";
import { Star, CheckCircle2, Send, Lock } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { thaanaChange } from "../notifications/thaanaKeyboard.js";
import { REVIEW_CLASSES as CLASS_OPTIONS } from "./content.js";

// Review form (/review?k=…), in English and Dhivehi. It only works through
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

function Label({ en, dv, required, htmlFor }) {
  return (
    <label className="ld-f-label" htmlFor={htmlFor}>
      <span>{en}:{required && <b aria-hidden="true"> *</b>}</span>
      <span className="ld-dv" lang="dv" dir="rtl">{dv}:</span>
    </label>
  );
}

// Same logo, calligraphy and translation as the home page's hero.
function FormHeader() {
  return (
    <div className="ld-rv-banner">
      <img className="ld-rv-logo" src="/images/logo-full-white.png" alt="Aflaah Quran Class" />
      <img className="ld-callig" src="/images/calligraphy-khairukum.png" alt="خيركم من تعلم القرآن وعلمه — The best of you are those who learn the Quran and teach it" />
      <p className="ld-callig-tr">“The best of you are those who learn the Quran and teach it.”</p>
    </div>
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
          {closed ? (
            <>
              <p className="ld-dv ld-rv-big" lang="dv" dir="rtl">މިހާރު މި ފޯމު ބަންދުކޮށްފައިވަނީ.</p>
              <p className="ld-lead">This review form is closed at the moment.</p>
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
    if (!form.className) { setError("Please choose your class. · ކުލާސް ޚިޔާރުކުރައްވާ."); return; }
    if (!rating) { setError("Please choose the number of stars. · ތަރީގެ ޢަދަދު ޚިޔާރުކުރައްވާ."); return; }
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
    if (err) { setError("Couldn’t send your review. Please try again. · ފޮނުވޭކަށް ނެތް، އަލުން މަސައްކަތް ކުރައްވާ."); return; }
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
            <p className="ld-lead">Your review has been sent. It will appear on our website once it is approved.</p>
            <p className="ld-dv" lang="dv" dir="rtl">ތިޔަ ފޮނުއްވި ޚިޔާލު ލިބިއްޖެ. އެޑްމިން ބަލައިގަތުމުން ވެބްސައިޓުގައި ފެންނާނެ.</p>
            <button type="button" className="ld-btn ld-btn-outline" onClick={() => { setForm(EMPTY); setRating(0); setSent(false); }}>Send another · އިތުރު ޚިޔާލެއް</button>
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
            <p className="ld-tag">Student review</p>
            <h1 className="ld-dv ld-rv-big ld-rv-title" lang="dv" dir="rtl">ކުލާހާމެދު ދެކޭގޮތް ފާޅުކުރައްވާ!</h1>
          </div>

          <div className="ld-rv-kbd">
            <span>Typing in Dhivehi on a computer? <span className="ld-dv" lang="dv" dir="rtl">ދިވެހިން ލިޔުމަށް</span></span>
            <button type="button" className={`ld-rv-toggle ${dhivehi ? "on" : ""}`} aria-pressed={dhivehi} onClick={() => setDhivehi((d) => !d)}>
              <span lang="dv">ދިވެހި</span> {dhivehi ? "on" : "off"}
            </button>
          </div>

          <div className="ld-f">
            <Label en="Name" dv="ނަން" required htmlFor="rv-name" />
            <input className="ld-input" {...text("name")} required maxLength={80} autoComplete="name" />
          </div>

          <div className="ld-f">
            <Label en="Viber number" dv="ވައިބަރ ނަންބަރ" required htmlFor="rv-viber" />
            <input className="ld-input" id="rv-viber" type="tel" inputMode="tel" dir="ltr" required minLength={5} maxLength={20} pattern="[+0-9 \-]{5,20}" placeholder="7xxxxxx" autoComplete="tel"
              value={form.viber} onChange={(e) => setForm((f) => ({ ...f, viber: e.target.value }))} />
          </div>

          <div className="ld-f">
            <Label en="Class" dv="ކުލާސް" required />
            <div className="ld-rv-classes" role="radiogroup" aria-label="Class">
              {CLASS_OPTIONS.map((c) => (
                <label key={c.en} className={`ld-rv-class ${form.className === c.en ? "on" : ""}`}>
                  <input type="radio" name="rv-class" value={c.en} checked={form.className === c.en} onChange={() => { setForm((f) => ({ ...f, className: c.en })); setError(""); }} />
                  <span className="ld-dv" lang="dv" dir="rtl">{c.dv}</span>
                  <small>{c.en}</small>
                </label>
              ))}
            </div>
          </div>

          <div className="ld-f">
            <Label en="Your rating" dv="ކުލާހަށް ދެއްވާ ތަރި" required />
            <div className="ld-rv-stars" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  className={n <= shown ? "on" : ""} onMouseEnter={() => setHover(n)} onClick={() => { setRating(n); setError(""); }}>
                  <Star size={34} fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
                </button>
              ))}
              {STAR_WORDS[shown] && <span className="ld-rv-word">{STAR_WORDS[shown].en} · <span className="ld-dv" lang="dv" dir="rtl">{STAR_WORDS[shown].dv}</span></span>}
            </div>
          </div>

          <div className="ld-f">
            <Label en="About the class" dv="ކުލާހާމެދު ދެކޭގޮތް" required htmlFor="rv-comment" />
            <textarea className="ld-input" {...text("comment")} required maxLength={1000} rows={5} />
          </div>

          <div className="ld-f">
            <Label en="Any request (optional)" dv="އެއްވެސް ހުށައެޅުމެއް ވާނަމަ" htmlFor="rv-request" />
            <textarea className="ld-input" {...text("request")} maxLength={1000} rows={3} />
            <small className="ld-f-note">Only the class office will see this. <span className="ld-dv" lang="dv" dir="rtl">މި މަޢުލޫމާތު ފެނިގެންދާނީ ޤުރްއާން ކުލާހުގެ އިދާރާއަށް އެކަންޏެވެ.</span></small>
          </div>

          {error && <p className="ld-rv-error" role="alert">{error}</p>}

          <button type="submit" className="ld-btn ld-btn-primary ld-rv-submit" disabled={busy}>
            <Send size={18} aria-hidden="true" />{busy ? "Sending…" : "Send review"} <span lang="dv">· ފޮނުވާ</span>
          </button>
        </form>
      </div>
    </section>
  );
}
