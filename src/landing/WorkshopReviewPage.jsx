import { useState, useEffect } from "react";
import { CheckCircle2, Send, Lock, Check, CalendarDays, Clock, ArrowLeft, ArrowRight, Presentation, CalendarPlus, MessageCircleHeart } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { FormHeader } from "./parts.jsx";
import { RATINGS, RATED, NEXT_QUESTION, NEXT_CHOICES, NEXT_TOPIC_LABEL, COMMENT_LABEL, workshopByKey } from "../workshops/workshopReview.js";

// Workshop review form (/workshop-review?k=…), in Dhivehi, laid out like the
// class review form (/review). It only works through the private link the
// admin shares (Admin → Reviews → Workshop reviews). It asks no name or
// number; answers are private: only the admin sees them, never the website.
const EMPTY = { nextTopic: "", comment: "" };
const EMPTY_RATED = Object.fromEntries(RATED.map((q) => [q.key, ""]));

function Label({ text, required, htmlFor, id }) {
  return (
    <label className="ld-f-label" htmlFor={htmlFor} id={id}>
      <span className="ld-dv">{text}:{required && <b aria-hidden="true"> *</b>}</span>
    </label>
  );
}

// One question with its choices listed one under another, each with a tick.
function Choices({ name, label, options, value, onChange }) {
  return (
    <div className="ld-f">
      <Label text={label} required id={`wr-${name}-label`} />
      <div className="ld-wr-opts" role="radiogroup" aria-labelledby={`wr-${name}-label`}>
        {options.map((o) => (
          <label key={o.value} className={`ld-wr-opt ${value === o.value ? "on" : ""}`}>
            <input type="radio" name={`wr-${name}`} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span className="ld-wr-tick" aria-hidden="true">{value === o.value && <Check size={15} strokeWidth={3} />}</span>
            <span className="ld-dv">{o.dv}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// The workshop's poster at the top of the form (as on /workshop/<slug>): the
// session label and logo, the title, the speaker and the date. Once the
// questions start, only a small header with the logo and title (compact).
const Num = ({ children }) => <span className="ld-wh-num" dir="ltr">{children}</span>;
function WorkshopHeader({ w, compact }) {
  if (!w) return <FormHeader />;
  const [first, ...rest] = w.speaker.name.split(" ");
  if (compact) {
    return (
      <header className="ld-wh compact">
        <div className="ld-wh-top">
          <h1 className="ld-wh-title"><span className="t1">{w.title[0]}</span> <span className="t2">{w.title[1]}</span></h1>
          <img className="ld-wh-logo" src="/images/logo-full-color.png" alt="Aflaah Quran Class" />
        </div>
      </header>
    );
  }
  return (
    <header className="ld-wh">
      <div className="ld-wh-top">
        <div className="ld-wh-label">{w.label}</div>
        <img className="ld-wh-logo" src="/images/logo-full-color.png" alt="Aflaah Quran Class" />
      </div>
      <h1 className="ld-wh-title"><span className="t1">{w.title[0]}</span> <span className="t2">{w.title[1]}</span></h1>
      <div className="ld-wh-speaker">
        <img src={w.speaker.photo} alt={w.speaker.name} />
        <div>
          <div className="ld-wh-name">{first}<b>{rest.join(" ")}</b></div>
          <ul>{w.speaker.lines.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      </div>
      <div className="ld-wh-facts">
        <div className="ld-wh-fact"><CalendarDays size={20} aria-hidden="true" /><div><b><Num>{w.date[0]}</Num> {w.date[1]} <Num>{w.date[2]}</Num></b><span>{w.day}</span></div></div>
        <div className="ld-wh-fact"><Clock size={20} aria-hidden="true" /><div><b>ރޭގަނޑު <Num>{w.time}</Num></b></div></div>
      </div>
    </header>
  );
}

// The three parts of the form, filled one after another.
const STEPS = ["ސެޝަނާ ބެހޭ ގޮތުން", "އިތުރު ވޯކްޝޮޕްތައް", "ތިޔަބޭފުޅާގެ ޚިޔާލު"];
const STEP_ICONS = [Presentation, CalendarPlus, MessageCircleHeart];

// A numbered part of the form with its heading.
function Part({ n, title, children }) {
  return (
    <fieldset className="ld-wr-part">
      <legend className="ld-wr-part-head"><span className="ld-wh-num">{n}</span><span className="ld-dv">{title}</span></legend>
      {children}
    </fieldset>
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
            {closed ? "މިހާރު މި ފޯމު ބަންދުކޮށްފައިވަނީ." : "މި ފޯމު ފުރިހަމަކުރެވޭނީ ވޯކްޝޮޕްގެ ގްރޫޕަށް ފޮނުވާ ލިންކުން އެކަނި."}
          </p>
        </div>
      </div>
    </section>
  );
}

const LOCAL_PREVIEW = ["localhost", "127.0.0.1"].includes(window.location.hostname);
// The key from the short address (/workshop/namaadhu/review) or from ?k=….
const formKey = () => window.location.pathname.match(/^\/workshop\/([a-z0-9-]+)\/review\/?$/)?.[1]
  || new URLSearchParams(window.location.search).get("k") || "";

export default function WorkshopReviewPage() {
  const [status, setStatus] = useState(null); // open | closed | invalid
  const [workshop, setWorkshop] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [rated, setRated] = useState(EMPTY_RATED);
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [step, setStep] = useState(-1); // -1 = the workshop and a start button

  useEffect(() => {
    const key = formKey();
    if (!key) { setStatus("invalid"); return; }
    // On the local preview, ?k=preview opens the form without the database
    // (sending it still needs the real link).
    if (LOCAL_PREVIEW && key === "preview") { setStatus("open"); setWorkshop(workshopByKey("namaadhu-2026-11")); return; }
    supabase.rpc("workshop_review_form_status", { p_key: key }).then(({ data, error: err }) => {
      const row = Array.isArray(data) ? data[0] : data;
      setStatus(err || !row ? "invalid" : row.status);
      setWorkshop(workshopByKey(row?.workshop));
    });
  }, []);

  const text = (key) => ({
    id: `wr-${key}`,
    value: form[key],
    dir: "auto",
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  // What is still missing in a part, or "".
  const missingIn = (n) => {
    if (n === 0) {
      const q = RATED.find((x) => !rated[x.key]);
      return q ? `"${q.dv}" އަށް ޖަވާބެއް ޚިޔާރުކުރައްވާ.` : "";
    }
    if (n === 1) return next ? "" : `"${NEXT_QUESTION.dv}" އަށް ޖަވާބެއް ޚިޔާރުކުރައްވާ.`;
    return form.comment.trim() ? "" : `"${COMMENT_LABEL.dv}" ލިޔުއްވާ.`;
  };

  const go = (n) => {
    setStep(n);
    setError("");
    window.scrollTo({ top: 0 });
  };

  const submit = async (e) => {
    e.preventDefault();
    const missing = missingIn(step);
    if (missing) { setError(missing); return; }
    if (step < STEPS.length - 1) { go(step + 1); return; }
    for (let n = 0; n < STEPS.length; n++) {
      const m = missingIn(n);
      if (m) { go(n); setError(m); return; }
    }
    setBusy(true);
    setError("");
    const { error: err } = await supabase.rpc("submit_workshop_review", {
      p_key: formKey(),
      p_topics: rated.topics,
      p_flow: rated.flow,
      p_presenter: rated.presenter,
      p_presentation: rated.presentation,
      p_length: rated.length,
      p_next_workshop: next,
      p_next_topic: form.nextTopic.trim(),
      p_comment: form.comment.trim(),
    });
    setBusy(false);
    if (err?.message?.includes("closed or invalid")) { setStatus("closed"); return; }
    if (err?.message?.includes("too many")) { setError("މިހާރު ވަރަށް ގިނަ ޖަވާބުތަކެއް ލިބެމުންދަނީ. ކުޑަ ވަގުތަކަށްފަހު އަލުން މަސައްކަތް ކުރައްވާ."); return; }
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
            <CheckCircle2 size={52} aria-hidden="true" />
            <h1 className="ld-h2">ޝުކުރިއްޔާ!</h1>
          </div>
        </div>
      </section>
    );
  }

  // First the workshop's poster and a start button, then the questions part by part.
  if (step < 0) {
    return (
      <section className="ld-sec ld-soft ld-rv">
        <div className="ld-wrap">
          <div className="ld-rv-card">
            <WorkshopHeader w={workshop} />
            {/* The site mirrors arrow icons on Dhivehi pages, so ArrowRight points left (onward). */}
            <button type="button" className="ld-btn ld-btn-primary ld-rv-submit" onClick={() => go(0)}>
              <span>ވޯކްޝޮޕްއާއި މެދު ދެކޭގޮތް ފާޅުކުރެއްވުމަށް</span><ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="ld-sec ld-soft ld-rv">
      <div className="ld-wrap">
        <form className="ld-rv-card ld-wr-form" onSubmit={submit}>
          <WorkshopHeader w={workshop} compact />

          <ol className="ld-wr-steps" aria-label="ފޯމުގެ ބައިތައް">
            {STEPS.map((t, n) => {
              const Icon = n < step ? Check : STEP_ICONS[n];
              return (
                <li key={t} className={n === step ? "on" : n < step ? "done" : ""} aria-current={n === step ? "step" : undefined}>
                  <span className="ld-wr-dot"><Icon size={16} strokeWidth={n < step ? 3 : 2} aria-hidden="true" /></span>
                  <small className="ld-wh-num" dir="ltr">{n + 1} / {STEPS.length}</small>
                  <b className="ld-dv">{t}</b>
                </li>
              );
            })}
          </ol>

          {step === 0 && <Part n={1} title={STEPS[0]}>
            {RATED.map((q) => (
              <Choices key={q.key} name={q.key} label={q.dv} options={RATINGS} value={rated[q.key]}
                onChange={(v) => { setRated((r) => ({ ...r, [q.key]: v })); setError(""); }} />
            ))}
          </Part>}

          {step === 1 && <Part n={2} title={STEPS[1]}>
            <Choices name="next" label={NEXT_QUESTION.dv} options={NEXT_CHOICES} value={next}
              onChange={(v) => { setNext(v); setError(""); }} />
            <div className="ld-f">
              <Label text={`${NEXT_TOPIC_LABEL.dv} (ލާޒިމެއް ނޫން)`} htmlFor="wr-nextTopic" />
              <textarea className="ld-input" {...text("nextTopic")} maxLength={500} rows={3} />
            </div>
          </Part>}

          {step === 2 && <Part n={3} title={STEPS[2]}>
            <div className="ld-f">
              <Label text={COMMENT_LABEL.dv} required htmlFor="wr-comment" />
              <textarea className="ld-input" {...text("comment")} maxLength={1000} rows={5} />
              <small className="ld-f-note">މި ފޯމުގެ މަޢުލޫމާތު ފެނިގެންދާނީ ޤުރުއާން ކުލާހުގެ އިދާރާއަށް އެކަންޏެވެ.</small>
            </div>
          </Part>}

          {error && <p className="ld-rv-error" role="alert">{error}</p>}

          <div className="ld-wr-nav">
            {/* The site mirrors arrow icons on Dhivehi pages, so ArrowRight points left (onward). */}
            <button type="button" className="ld-btn ld-btn-outline ld-wr-back" onClick={() => go(step - 1)} disabled={busy}>
              <ArrowLeft size={18} aria-hidden="true" /><span>ފަހަތަށް</span>
            </button>
            {step < STEPS.length - 1 ? (
              <button type="submit" className="ld-btn ld-btn-primary ld-rv-submit">
                <span>ކުރިއަށް</span><ArrowRight size={18} aria-hidden="true" />
              </button>
            ) : (
              <button type="submit" className="ld-btn ld-btn-primary ld-rv-submit" disabled={busy}>
                <Send size={18} aria-hidden="true" /><span>{busy ? "ފޮނުވަނީ…" : "ފޮނުވާ"}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
