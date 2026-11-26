import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, Send, Upload, Landmark, FileText, ArrowLeft, ArrowRight, CalendarDays, Clock, Lock, Users, GraduationCap, ShieldCheck, ExternalLink } from "lucide-react";
import { BANK } from "../payments/slips.js";
import { ICONS, FormHeader } from "./parts.jsx";
import { RULES } from "./content.js";
import { useOfferings } from "./ClassesSection.jsx";
import {
  AGE_GROUPS, FORM_CATEGORY_ORDER, REG_SLIP_ACCEPT, REG_SLIP_MAX_BYTES,
  submitRegistration, isFormOpen, registerPathOf, categoryOf, ageGroupOf, formKeyOf, formPath,
  fmtTimeDv, fmtDaysDv, fmtMvrDv,
} from "../registrations/registrations.js";

// Class registration, all in Dhivehi. There is one form for each class and
// age group, /register/<class>/<school|adults> (e.g. /register/hifz/school),
// which the admin opens and closes on its own (Admin → Registrations → Form
// links). /register lists the three classes and /register/<class> its two
// age groups; both only lead to a form.
//
// A form goes one step at a time: a day and time, the student's details, the
// class rules to agree to (Hifz only, see rulesAgreement in registrations.js),
// and last the registration fee and its transfer slip. It goes to Admin →
// Registrations; nothing here is shown publicly.
const EMPTY = { name: "", nic: "", age: "", atollIsland: "", viber: "" };
const STEP_NAMES = { time: "ދުވަސް އަދި ގަޑި", details: "ދަރިވަރުގެ މަޢުލޫމާތު", rules: "ގަވާއިދުތައް", fee: "ރަޖިސްޓްރޭޝަން ފީ" };
const stepsFor = (cat) => (cat.rulesAgreement ? ["time", "details", "rules", "fee"] : ["time", "details", "fee"]);
// The rules shown on the Rules step: every part of the rules document but its
// introduction, in its own (Dhivehi) words.
const FORM_RULES = RULES.filter((c) => c.key !== "about");
const RULES_AGREE = "މަތީގައިވާ އަފްލާޙް ޤުރްއާން ކުލާހުގެ އުސޫލުތަކާއި ގަވާއިދުތައް އަޅުގަނޑު ކިޔައި، އެ ގަވާއިދުތަކަށް އަޅުގަނޑު އެއްބަސްވަމެވެ.";
const GROUP_ICONS = { children: GraduationCap, adults: Users };
const ERRORS = {
  closed: "މި ގަޑީގެ ރަޖިސްޓްރޭޝަން މިހާރު ބަންދުވެއްޖެ. ފަހަތަށް ގޮސް އެހެން ގަޑިއެއް ޚިޔާރުކުރައްވާ.",
  slip: "ސްލިޕް އަޕްލޯޑް ނުކުރެވުނު. ފައިލް ބައްލަވާފައި އަލުން މަސައްކަތް ކުރައްވާ.",
  waiting: "މި އައިޑީ ކާޑު ނަންބަރުގައި ފޮނުއްވާފައިވާ ރަޖިސްޓްރޭޝަނެއް ޗެކްކުރުމަށް މިހާރުވެސް އިންތިޒާރުގައި އެބަހުރި. ވައިބަރުން ގުޅާނަން.",
  busy: "މިހާރު ވަރަށް ގިނަ ރަޖިސްޓްރޭޝަންތަކެއް ލިބެމުންދަނީ. އެއް ގަޑިއިރު ފަހުން އަލުން މަސައްކަތް ކުރައްވާ.",
  rules: "ކުރިއަށް ދިއުމަށް ކުލާހުގެ ގަވާއިދުތަކަށް އެއްބަސްވެވަޑައިގަންނަވާ.",
  save: "ރަޖިސްޓްރޭޝަން ނުފޮނުވުނު. އަލުން މަސައްކަތް ކުރައްވާ.",
};

function Label({ text, required, htmlFor }) {
  return (
    <label className="ld-f-label" htmlFor={htmlFor}>
      <span className="ld-dv">{text}:{required && <b aria-hidden="true"> *</b>}</span>
    </label>
  );
}

function Card({ children, done }) {
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

function Head({ title, sub }) {
  return (
    <div className="ld-rv-head">
      <p className="ld-tag">ކުލާހަށް ރަޖިސްޓަރީވުން</p>
      <h1 className="ld-h2" style={{ margin: 0 }}>{title}</h1>
      {sub && <p className="ld-lead" style={{ margin: 0 }}>{sub}</p>}
    </div>
  );
}

// Where the visitor is: /register?cat=<class> (older home page links) counts
// as /register/<class>.
function startingPlace() {
  const place = registerPathOf() || { category: "", ageGroup: "" };
  const cat = new URLSearchParams(window.location.search).get("cat");
  if (!place.category && categoryOf(cat)) place.category = cat;
  return place;
}

export default function RegisterPage({ navigate }) {
  const [place] = useState(startingPlace);
  if (place.category && place.ageGroup) return <RegisterForm category={place.category} ageGroup={place.ageGroup} navigate={navigate} />;
  if (place.category) return <AgeChooser category={place.category} navigate={navigate} />;
  return <ClassChooser navigate={navigate} />;
}

// /register: the three classes.
function ClassChooser({ navigate }) {
  return (
    <Card>
      <Head title="ކުލާހެއް ޚިޔާރުކުރައްވާ" sub="ކޮންމެ ކުލާހެއްގައި ސްކޫލް ދަރިވަރުންގެ ކުލާހާއި ބޮޑެތި މީހުންގެ ކުލާސް ވަކިން ހުންނާނެ." />
      <div className="ld-wz-options">
        {FORM_CATEGORY_ORDER.map((key) => {
          const c = categoryOf(key);
          const Icon = ICONS[c.icon];
          return (
            <button key={c.key} type="button" className="ld-wz-option" onClick={() => navigate(`/register/${c.key}`)}>
              <span className="ld-icon"><Icon size={24} aria-hidden="true" /></span>
              <span className="ld-wz-option-text"><b>{c.dvName}</b><small>{c.dvBlurb}</small></span>
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <BackToSite navigate={navigate} />
    </Card>
  );
}

// /register/<class>: its school students' and adults' forms.
function AgeChooser({ category, navigate }) {
  const c = categoryOf(category);
  return (
    <Card>
      <Head title={c.dvName} sub={c.dvBlurb} />
      <div className="ld-wz-title"><h2 className="ld-dv">ކުލާސް ޚިޔާރުކުރައްވާ</h2></div>
      <div className="ld-wz-options">
        {AGE_GROUPS.map((g) => {
          const Icon = GROUP_ICONS[g.key];
          return (
            <button key={g.key} type="button" className="ld-wz-option" onClick={() => navigate(formPath(formKeyOf(category, g.key)))}>
              <span className="ld-icon"><Icon size={24} aria-hidden="true" /></span>
              <span className="ld-wz-option-text"><b>{g.dv}</b><small>{g.dvSub}</small></span>
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <div className="ld-wz-nav">
        <button type="button" className="ld-btn ld-btn-outline" onClick={() => navigate("/register")}><ArrowLeft size={18} aria-hidden="true" /> އެހެން ކުލާހެއް</button>
      </div>
    </Card>
  );
}

function BackToSite({ navigate }) {
  return (
    <div className="ld-wz-nav">
      <button type="button" className="ld-btn ld-btn-outline" onClick={() => navigate("/")}><ArrowLeft size={18} aria-hidden="true" /> ވެބްސައިޓަށް</button>
    </div>
  );
}

// /register/<class>/<school|adults>: the form itself.
function RegisterForm({ category, ageGroup, navigate }) {
  const formKey = formKeyOf(category, ageGroup);
  const cat = categoryOf(category);
  const grp = ageGroupOf(ageGroup);
  const other = AGE_GROUPS.find((g) => g.key !== ageGroup);
  const [formOpen, setFormOpen] = useState(null);
  useEffect(() => { isFormOpen(formKey).then((open) => setFormOpen(open !== false)); }, [formKey]);
  const offerings = useOfferings();
  const [offeringId, setOfferingId] = useState("");
  const steps = stepsFor(cat);
  const [step, setStep] = useState(0);
  const at = steps[step];
  const [form, setForm] = useState(EMPTY);
  const [agreed, setAgreed] = useState(false);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const slots = useMemo(
    () => (offerings || []).filter((o) => o.category === category && o.age_group === ageGroup),
    [offerings, category, ageGroup],
  );
  const offering = slots.find((o) => o.id === offeringId) || null;
  const ageError = grp.ageError;

  const go = (n) => { setError(""); setStep(n); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const field = (key) => ({ id: `rg-${key}`, value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  const chooseFile = (e) => {
    const f = e.target.files?.[0] || null;
    if (f && f.size > REG_SLIP_MAX_BYTES) { setError("ސްލިޕް 5 MB އަށްވުރެ ބޮޑު. އެއަށްވުރެ ކުޑަ ފޮޓޯއެއް ނުވަތަ PDF އެއް އަޕްލޯޑް ކުރައްވާ."); e.target.value = ""; setFile(null); return; }
    setError("");
    setFile(f);
  };

  // Details → next step: the browser checks the fields; this checks the age fits.
  const detailsDone = (e) => {
    e.preventDefault();
    const age = Number(form.age);
    if ((grp.maxAge && age > grp.maxAge) || (grp.minAge && age < grp.minAge)) { setError(ageError); return; }
    go(step + 1);
  };

  const rulesDone = (e) => {
    e.preventDefault();
    if (!agreed) { setError(ERRORS.rules); return; }
    go(step + 1);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { setError("ރަޖިސްޓްރޭޝަން ފީ ޖަމާކުރި ސްލިޕް އަޕްލޯޑް ކުރައްވާ."); return; }
    setBusy(true);
    setError("");
    try {
      await submitRegistration({
        form: formKey, classId: offering.id, name: form.name.trim(), nic: form.nic.trim(), age: Number(form.age),
        atollIsland: form.atollIsland.trim(), viber: form.viber.trim(), agreed, file,
      });
      setSent(true);
      window.scrollTo(0, 0);
    } catch (err) {
      if (err.message === "form-closed") { setFormOpen(false); return; }
      if (err.message === "rules") { setAgreed(false); go(steps.indexOf("rules")); setError(ERRORS.rules); return; }
      setError(err.message === "age" ? ageError : ERRORS[err.message] || ERRORS.save);
    } finally {
      setBusy(false);
    }
  };

  const restart = () => { setForm(EMPTY); setAgreed(false); setFile(null); setOfferingId(""); setSent(false); go(0); };
  const title = `${cat.dvName} · ${grp.dv}`;

  if (formOpen === null) return <section className="ld-sec ld-soft ld-rv" />;
  if (!formOpen) {
    return (
      <Card done>
        <Lock size={44} aria-hidden="true" />
        <h1 className="ld-h2">މިހާރު ރަޖިސްޓްރޭޝަން ބަންދު</h1>
        <p className="ld-lead">{title}<br />މި ކުލާހުގެ ރަޖިސްޓްރޭޝަން މިހާރު ބަންދުކޮށްފައިވަނީ. އަންނަ ފަހަރުގެ ރަޖިސްޓްރޭޝަނަށް އަޅުގަނޑުމެންގެ ޕޯސްޓަރުތަކަށް ސަމާލުކަން ދެއްވާ.</p>
      </Card>
    );
  }

  if (sent) {
    return (
      <Card done>
        <CheckCircle2 size={52} aria-hidden="true" />
        <h1 className="ld-h2">ޝުކުރިއްޔާ!</h1>
        <p className="ld-rv-big">ރަޖިސްޓްރޭޝަން ފޮނުވިއްޖެ.</p>
        <p className="ld-lead">ފައިސާ ޖަމާކުރި ސްލިޕް ޗެކްކޮށް، ތިޔަ ތަން ކަށަވަރުކުރުމަށް <span dir="ltr">{form.viber}</span> ވައިބަރ ނަންބަރަށް ގުޅާނަން.</p>
        <button type="button" className="ld-btn ld-btn-outline" onClick={restart}>އެހެން ދަރިވަރަކު ރަޖިސްޓަރީ ކުރައްވާ</button>
      </Card>
    );
  }

  const back = step > 0 && (
    <button type="button" className="ld-btn ld-btn-outline" onClick={() => go(step - 1)}><ArrowLeft size={18} aria-hidden="true" /> ފަހަތަށް</button>
  );
  const picks = [
    { step: -1, text: title, fixed: true },
    step > 0 && offering && { step: 0, text: `${fmtDaysDv(offering.days)} · ${fmtTimeDv(offering.start_time)} – ${fmtTimeDv(offering.end_time)}` },
  ].filter(Boolean);

  return (
    <Card>
      <Head title={title} sub={`${cat.dvBlurb} · ${grp.dvSub}`} />

      <ol className="ld-wz-steps" aria-label="ފިޔަވަޅުތައް" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => (
          <li key={s} className={i === step ? "on" : i < step ? "done" : ""} aria-current={i === step ? "step" : undefined}>
            <span className="ld-wz-num">{i < step ? <CheckCircle2 size={16} aria-hidden="true" /> : i + 1}</span>
            <span className="ld-wz-name">{STEP_NAMES[s]}</span>
          </li>
        ))}
      </ol>

      <div className="ld-wz-picks">
        {picks.map((p) => (
          p.fixed
            ? <span key={p.step} className="ld-wz-pick ld-wz-pick-fixed">{p.text}</span>
            : <button key={p.step} type="button" className="ld-wz-pick" onClick={() => go(p.step)} title="ބަދަލުކުރައްވާ">{p.text}</button>
        ))}
      </div>

      <div className="ld-wz-title">
        <h2 className="ld-dv">ފިޔަވަޅު {step + 1}: {STEP_NAMES[at]}</h2>
      </div>

      {at === "time" && (
        <>
          {offerings === null && <p className="ld-f-note">ކުލާހުގެ ގަޑިތައް ލޯޑުވަނީ…</p>}
          {offerings && slots.length === 0 && <p className="ld-rv-error">މި ކުލާހަށް މިހާރު ހުޅުވިފައިވާ ގަޑިއެއް ނެތް. ވެއިޓިންގ ލިސްޓަށް ނަން ލިޔުއްވުމަށް އަޅުގަނޑުމެންނާ ގުޅުއްވާ.</p>}
          <div className="ld-wz-options">
            {slots.map((o) => (
              <button key={o.id} type="button" className={`ld-wz-option ld-wz-slot ${offeringId === o.id ? "on" : ""}`} onClick={() => { setOfferingId(o.id); go(1); }}>
                <span className="ld-wz-option-text">
                  <b><CalendarDays size={17} aria-hidden="true" />{fmtDaysDv(o.days)}</b>
                  <span className="ld-wz-time"><Clock size={16} aria-hidden="true" />{fmtTimeDv(o.start_time)} – {fmtTimeDv(o.end_time)}</span>
                  <span className="ld-wz-fee">މަހު ފީ: {fmtMvrDv(o.monthly_fee)}</span>
                  {o.note && <small>{o.note}</small>}
                </span>
                <ArrowRight size={20} aria-hidden="true" />
              </button>
            ))}
          </div>
        </>
      )}

      {at === "details" && (
        <form className="ld-wz-form" onSubmit={detailsDone}>
          <div className="ld-f">
            <Label text="ދަރިވަރުގެ ފުރިހަމަ ނަން" required htmlFor="rg-name" />
            <input className="ld-input" {...field("name")} dir="auto" required maxLength={80} autoComplete="name" />
          </div>
          <div className="ld-f">
            <Label text="ޢުމުރު" required htmlFor="rg-age" />
            <input className="ld-input" {...field("age")} type="number" inputMode="numeric" dir="ltr" required min={3} max={100} />
            <small className="ld-f-note">{grp.dvSub}</small>
          </div>
          <div className="ld-f">
            <Label text="އައިޑީ ކާޑު ނަންބަރު" required htmlFor="rg-nic" />
            <input className="ld-input" {...field("nic")} dir="ltr" required minLength={4} maxLength={20} placeholder="A123456" autoCapitalize="characters" />
          </div>
          <div className="ld-f">
            <Label text="އަތޮޅާއި ރަށް" required htmlFor="rg-atollIsland" />
            <input className="ld-input" {...field("atollIsland")} dir="auto" required maxLength={80} placeholder="މިސާލު: ކ. މާލެ" />
          </div>
          <div className="ld-f">
            <Label text="ވައިބަރ ނަންބަރު" required htmlFor="rg-viber" />
            <input className="ld-input" {...field("viber")} type="tel" inputMode="tel" dir="ltr" required minLength={5} maxLength={20} pattern="[+0-9 \-]{5,20}" placeholder="7xxxxxx" autoComplete="tel" />
          </div>
          {error && <p className="ld-rv-error" role="alert">{error}</p>}
          {error === ageError && (
            <button type="button" className="ld-btn ld-btn-outline" onClick={() => navigate(formPath(formKeyOf(category, other.key)))}>{other.dvForm} <ArrowRight size={18} aria-hidden="true" /></button>
          )}
          <div className="ld-wz-nav">
            {back}
            <button type="submit" className="ld-btn ld-btn-primary">ކުރިއަށް <ArrowRight size={18} aria-hidden="true" /></button>
          </div>
        </form>
      )}

      {at === "rules" && (
        <form className="ld-wz-form" onSubmit={rulesDone} noValidate>
          <div className={`ld-rg-rules ${error === ERRORS.rules ? "bad" : ""}`}>
            <div className="ld-rg-pay-head"><ShieldCheck size={20} aria-hidden="true" /> ކުލާހުގެ އުސޫލުތަކާއި ގަވާއިދުތައް</div>
            <p>ރަޖިސްޓަރީވުމުގެ ކުރިން ތިރީގައިވާ ގަވާއިދުތައް ކިޔުއްވާ.</p>
            <div className="ld-rg-rules-list" tabIndex={0} aria-label="ކުލާހުގެ ގަވާއިދުތައް">
              {FORM_RULES.map((c) => (
                <section key={c.key}>
                  <h3>{c.title.dv}</h3>
                  {c.cards.map((card, i) => (
                    <div key={card.num || i}>
                      {card.title && <h4><span dir="ltr">{card.num}</span> {card.title.dv}</h4>}
                      {card.intro && <p>{card.intro.dv}</p>}
                      <ol>
                        {card.items.map((item) => <li key={item.en}>{item.term && <b>{item.term.dv}: </b>}{item.dv}</li>)}
                      </ol>
                    </div>
                  ))}
                </section>
              ))}
            </div>
            <a className="ld-rg-rules-link" href="/rules" target="_blank" rel="noopener">ގަވާއިދުތައް ވެބްސައިޓުގައި ބައްލަވާ <ExternalLink size={15} aria-hidden="true" /></a>
            <label className="ld-rg-check">
              <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setError(""); }} />
              <span>{RULES_AGREE}</span>
            </label>
          </div>
          {error && <p className="ld-rv-error" role="alert">{error}</p>}
          <div className="ld-wz-nav">
            {back}
            <button type="submit" className="ld-btn ld-btn-primary">ކުރިއަށް <ArrowRight size={18} aria-hidden="true" /></button>
          </div>
        </form>
      )}

      {at === "fee" && offering && (
        <form className="ld-wz-form" onSubmit={submit}>
          <div className="ld-rg-pay">
            <div className="ld-rg-pay-head"><Landmark size={20} aria-hidden="true" /> {`${fmtMvrDv(offering.registration_fee)}ގެ ރަޖިސްޓްރޭޝަން ފީ ދައްކަވާ`}</div>
            <p>ތިރީގައިވާ އެކައުންޓަށް ފައިސާ ޓްރާންސްފަރ ކުރައްވާފައި، ޓްރާންސްފަރ ސްލިޕް އަޕްލޯޑް ކުރައްވާ.</p>
            <dl>
              <dt>ބޭންކް</dt><dd dir="ltr">{BANK.bank}</dd>
              <dt>އެކައުންޓުގެ ނަން</dt><dd dir="ltr">{BANK.accountName}</dd>
              <dt>އެކައުންޓް ނަންބަރު</dt><dd className="ld-rg-acc" dir="ltr">{BANK.accountNumber}</dd>
            </dl>
            <div className="ld-f">
              <Label text="ފައިސާ ޖަމާކުރި ސްލިޕް" required htmlFor="rg-slip" />
              <label className={`ld-rg-file ${file ? "on" : ""}`} htmlFor="rg-slip">
                {file ? <FileText size={20} aria-hidden="true" /> : <Upload size={20} aria-hidden="true" />}
                <span>{file ? <span dir="ltr">{file.name}</span> : "ސްލިޕްގެ ފޮޓޯއެއް ނުވަތަ PDF އެއް އަޕްލޯޑް ކުރައްވާ (5 MB އަށްވުރެ ކުޑަ)"}</span>
              </label>
              <input id="rg-slip" className="ld-rg-file-input" type="file" accept={REG_SLIP_ACCEPT} onChange={chooseFile} />
            </div>
          </div>
          {error && <p className="ld-rv-error" role="alert">{error}</p>}
          <div className="ld-wz-nav">
            {back}
            <button type="submit" className="ld-btn ld-btn-primary" disabled={busy}>
              <Send size={18} aria-hidden="true" />{busy ? "ފޮނުވަނީ…" : "ރަޖިސްޓްރޭޝަން ފޮނުވާ"}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

