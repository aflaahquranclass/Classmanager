import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, Send, Upload, Landmark, FileText, ArrowLeft, ArrowRight, CalendarDays, Clock, Lock } from "lucide-react";
import { BANK } from "../payments/slips.js";
import { ICONS, FormHeader } from "./parts.jsx";
import { useOfferings } from "./ClassesSection.jsx";
import {
  CATEGORIES, AGE_GROUPS, REG_SLIP_ACCEPT, REG_SLIP_MAX_BYTES,
  submitRegistration, isFormOpen, lockedCategory, categoryOf, ageGroupOf, fmtTime, fmtDays, fmtMvr,
} from "../registrations/registrations.js";

// Class registration form, one step at a time: the class, then the age
// group, then a day and time, then the student's details, and last the
// registration fee and its transfer slip. It goes to Admin → Registrations;
// nothing here is shown publicly.
//
// /register is the main form (Register buttons; /register?cat=<category> from
// the home page's class cards starts with that class chosen). Each class also
// has its own form for posters, /register/<category>, where the class is fixed
// and the student starts at the age group. The admin can close each form.
const EMPTY = { name: "", nic: "", age: "", atollIsland: "", viber: "" };
const STEPS = [
  { en: "Class", dv: "ކުލާސް" },
  { en: "Age group", dv: "ޢުމުރު" },
  { en: "Day & time", dv: "ދުވަސް އަދި ގަޑި" },
  { en: "Your details", dv: "މަޢުލޫމާތު" },
  { en: "Registration fee", dv: "ރަޖިސްޓްރޭޝަން ފީ" },
];

function Label({ en, dv, required, htmlFor }) {
  return (
    <label className="ld-f-label" htmlFor={htmlFor}>
      <span>{en}:{required && <b aria-hidden="true"> *</b>}</span>
      {dv && <span className="ld-dv" lang="dv" dir="rtl">{dv}:</span>}
    </label>
  );
}

const startingCategory = () => {
  const cat = lockedCategory() || new URLSearchParams(window.location.search).get("cat");
  return categoryOf(cat) ? cat : "";
};

// Shown instead of the form while the admin has it closed.
function FormClosed({ cat }) {
  return (
    <section className="ld-sec ld-soft ld-rv">
      <div className="ld-wrap">
        <div className="ld-rv-card ld-rv-done">
          <FormHeader />
          <Lock size={44} aria-hidden="true" />
          <h1 className="ld-h2">Registration is closed</h1>
          <p className="ld-dv ld-rv-big" lang="dv" dir="rtl">މިހާރު ރަޖިސްޓްރޭޝަން ބަންދުކޮށްފައިވަނީ.</p>
          <p className="ld-lead">{cat ? `Registration for the ${cat.en} class` : "Class registration"} is closed at the moment. Please follow our posters for the next intake.</p>
        </div>
      </div>
    </section>
  );
}

export default function RegisterPage() {
  const locked = lockedCategory();
  const formKey = locked || "all";
  const [formOpen, setFormOpen] = useState(null);
  useEffect(() => { isFormOpen(formKey).then((open) => setFormOpen(open !== false)); }, [formKey]);
  const offerings = useOfferings();
  const [category, setCategory] = useState(startingCategory);
  const [ageGroup, setAgeGroup] = useState("");
  const [offeringId, setOfferingId] = useState("");
  const [step, setStep] = useState(() => (startingCategory() ? 1 : 0));
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const slots = useMemo(
    () => (offerings || []).filter((o) => o.category === category && o.age_group === ageGroup),
    [offerings, category, ageGroup],
  );
  const offering = slots.find((o) => o.id === offeringId) || null;

  const go = (n) => { setError(""); setStep(n); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const field = (key) => ({ id: `rg-${key}`, value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  const chooseFile = (e) => {
    const f = e.target.files?.[0] || null;
    if (f && f.size > REG_SLIP_MAX_BYTES) { setError("The slip is larger than 5 MB. Please attach a smaller photo or PDF."); e.target.value = ""; setFile(null); return; }
    setError("");
    setFile(f);
  };

  // Step 4 → 5: the browser checks the fields; this checks the age fits.
  const detailsDone = (e) => {
    e.preventDefault();
    const age = Number(form.age);
    if (ageGroup === "children" && age > 14) { setError("The children's class is for students under 14. Go back and choose the teens and adults class."); return; }
    if (ageGroup === "adults" && age < 15) { setError("The teens and adults class is for students 15 and above. Go back and choose the children's class."); return; }
    go(4);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { setError("Please attach the registration fee transfer slip."); return; }
    setBusy(true);
    setError("");
    try {
      await submitRegistration({
        form: formKey, classId: offering.id, name: form.name.trim(), nic: form.nic.trim(), age: Number(form.age),
        atollIsland: form.atollIsland.trim(), viber: form.viber.trim(), file,
      });
      setSent(true);
      window.scrollTo(0, 0);
    } catch (err) {
      if (err.message === "form-closed") { setFormOpen(false); return; }
      setError(err.message === "closed"
        ? "Registration for this class time has just closed. Please go back and choose another time."
        : err.message === "slip"
          ? "Couldn’t upload the slip. Please check the file and try again."
          : "Couldn’t send your registration. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setForm(EMPTY); setFile(null); setCategory(locked); setAgeGroup(""); setOfferingId(""); setSent(false); go(locked ? 1 : 0);
  };

  if (formOpen === null) return <section className="ld-sec ld-soft ld-rv" />;
  if (!formOpen) return <FormClosed cat={categoryOf(locked)} />;

  if (sent) {
    return (
      <section className="ld-sec ld-soft ld-rv">
        <div className="ld-wrap">
          <div className="ld-rv-card ld-rv-done">
            <FormHeader />
            <CheckCircle2 size={52} aria-hidden="true" />
            <h1 className="ld-h2">Registration sent</h1>
            <p className="ld-dv ld-rv-big" lang="dv" dir="rtl">ޝުކުރިއްޔާ!</p>
            <p className="ld-lead">We’ll check your payment slip and contact you on Viber at {form.viber} to confirm your place.</p>
            <button type="button" className="ld-btn ld-btn-outline" onClick={restart}>Register another student</button>
          </div>
        </div>
      </section>
    );
  }

  const cat = categoryOf(category);
  const grp = ageGroupOf(ageGroup);
  // What has been chosen so far; each one jumps back to its step.
  const picks = [
    cat && { step: 0, text: cat.en, fixed: !!locked },
    step > 1 && grp && { step: 1, text: `${grp.en} · ${grp.sub}` },
    step > 2 && offering && { step: 2, text: `${fmtDays(offering.days)} · ${fmtTime(offering.start_time)}–${fmtTime(offering.end_time)}` },
  ].filter(Boolean);
  const back = step > (locked ? 1 : 0) && (
    <button type="button" className="ld-btn ld-btn-outline" onClick={() => go(step - 1)}><ArrowLeft size={18} aria-hidden="true" /> Back</button>
  );

  return (
    <section className="ld-sec ld-soft ld-rv">
      <div className="ld-wrap">
        <div className="ld-rv-card">
          <FormHeader />
          <div className="ld-rv-head">
            <p className="ld-tag">Class registration</p>
            <h1 className="ld-h2" style={{ margin: 0 }}>{locked ? `Register for ${cat.en}` : "Register for a class"}</h1>
          </div>

          <ol className="ld-wz-steps" aria-label="Steps">
            {STEPS.map((s, i) => (
              <li key={s.en} className={i === step ? "on" : i < step ? "done" : ""} aria-current={i === step ? "step" : undefined}>
                <span className="ld-wz-num">{i < step ? <CheckCircle2 size={16} aria-hidden="true" /> : i + 1}</span>
                <span className="ld-wz-name">{s.en}</span>
              </li>
            ))}
          </ol>

          {picks.length > 0 && (
            <div className="ld-wz-picks">
              {picks.map((p) => (
                p.fixed
                  ? <span key={p.step} className="ld-wz-pick ld-wz-pick-fixed">{p.text}</span>
                  : <button key={p.step} type="button" className="ld-wz-pick" onClick={() => go(p.step)} title="Change">{p.text}</button>
              ))}
            </div>
          )}

          <div className="ld-wz-title">
            <h2>Step {step + 1}: {STEPS[step].en}</h2>
            <span className="ld-dv" lang="dv" dir="rtl">{STEPS[step].dv}</span>
          </div>

          {step === 0 && (
            <div className="ld-wz-options">
              {CATEGORIES.map((c) => {
                const Icon = ICONS[c.icon];
                return (
                  <button key={c.key} type="button" className={`ld-wz-option ${category === c.key ? "on" : ""}`}
                    onClick={() => { if (c.key !== category) { setAgeGroup(""); setOfferingId(""); } setCategory(c.key); go(1); }}>
                    <span className="ld-icon"><Icon size={24} aria-hidden="true" /></span>
                    <span className="ld-wz-option-text"><b>{c.en}</b><span className="ld-dv" lang="dv" dir="rtl">{c.dv}</span><small>{c.blurb}</small></span>
                    <ArrowRight size={20} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          )}

          {step === 1 && (
            <>
              <div className="ld-wz-options">
                {AGE_GROUPS.map((g) => (
                  <button key={g.key} type="button" className={`ld-wz-option ${ageGroup === g.key ? "on" : ""}`}
                    onClick={() => { if (g.key !== ageGroup) setOfferingId(""); setAgeGroup(g.key); go(2); }}>
                    <span className="ld-wz-option-text"><b>{g.en}</b><small>{g.sub}</small><span className="ld-dv" lang="dv" dir="rtl">{g.dv}</span></span>
                    <ArrowRight size={20} aria-hidden="true" />
                  </button>
                ))}
              </div>
              <div className="ld-wz-nav">{back}</div>
            </>
          )}

          {step === 2 && (
            <>
              {offerings === null && <p className="ld-f-note">Loading class times…</p>}
              {offerings && slots.length === 0 && <p className="ld-rv-error">No times are open for this class right now. Please contact us to join the waiting list.</p>}
              <div className="ld-wz-options">
                {slots.map((o) => (
                  <button key={o.id} type="button" className={`ld-wz-option ld-wz-slot ${offeringId === o.id ? "on" : ""}`} onClick={() => { setOfferingId(o.id); go(3); }}>
                    <span className="ld-wz-option-text">
                      <b><CalendarDays size={17} aria-hidden="true" />{fmtDays(o.days)}</b>
                      <span className="ld-wz-time"><Clock size={16} aria-hidden="true" />{fmtTime(o.start_time)} – {fmtTime(o.end_time)}</span>
                      {o.note && <small>{o.note}</small>}
                    </span>
                    <ArrowRight size={20} aria-hidden="true" />
                  </button>
                ))}
              </div>
              <div className="ld-wz-nav">{back}</div>
            </>
          )}

          {step === 3 && (
            <form className="ld-wz-form" onSubmit={detailsDone}>
              <div className="ld-f">
                <Label en="Name" dv="ނަން" required htmlFor="rg-name" />
                <input className="ld-input" {...field("name")} dir="auto" required maxLength={80} autoComplete="name" />
              </div>
              <div className="ld-f">
                <Label en="Age" dv="ޢުމުރު" required htmlFor="rg-age" />
                <input className="ld-input" {...field("age")} type="number" inputMode="numeric" dir="ltr" required min={3} max={100} />
              </div>
              <div className="ld-f">
                <Label en="ID card number" dv="އައިޑީ ކާޑު ނަންބަރު" required htmlFor="rg-nic" />
                <input className="ld-input" {...field("nic")} dir="ltr" required minLength={4} maxLength={20} placeholder="A123456" autoCapitalize="characters" />
              </div>
              <div className="ld-f">
                <Label en="Atoll and island" dv="އަތޮޅާއި ރަށް" required htmlFor="rg-atollIsland" />
                <input className="ld-input" {...field("atollIsland")} dir="auto" required maxLength={80} placeholder="e.g. K. Malé" />
              </div>
              <div className="ld-f">
                <Label en="Viber number" dv="ވައިބަރ ނަންބަރ" required htmlFor="rg-viber" />
                <input className="ld-input" {...field("viber")} type="tel" inputMode="tel" dir="ltr" required minLength={5} maxLength={20} pattern="[+0-9 \-]{5,20}" placeholder="7xxxxxx" autoComplete="tel" />
              </div>
              {error && <p className="ld-rv-error" role="alert">{error}</p>}
              <div className="ld-wz-nav">
                {back}
                <button type="submit" className="ld-btn ld-btn-primary">Next <ArrowRight size={18} aria-hidden="true" /></button>
              </div>
            </form>
          )}

          {step === 4 && offering && (
            <form className="ld-wz-form" onSubmit={submit}>
              <div className="ld-rg-pay">
                <dl className="ld-wz-fees">
                  <div><dt>Registration fee</dt><dd>{fmtMvr(offering.registration_fee)}</dd></div>
                  <div><dt>Monthly class fee</dt><dd>{fmtMvr(offering.monthly_fee)}</dd></div>
                </dl>
                <div className="ld-rg-pay-head"><Landmark size={20} aria-hidden="true" /> Pay the registration fee of {fmtMvr(offering.registration_fee)}</div>
                <p>Transfer it to the account below, then upload the transfer slip.</p>
                <dl>
                  <dt>Bank</dt><dd>{BANK.bank}</dd>
                  <dt>Account name</dt><dd>{BANK.accountName}</dd>
                  <dt>Account number</dt><dd className="ld-rg-acc">{BANK.accountNumber}</dd>
                </dl>
                <div className="ld-f">
                  <Label en="Payment slip" dv="ފައިސާ ޖަމާކުރި ސްލިޕް" required htmlFor="rg-slip" />
                  <label className={`ld-rg-file ${file ? "on" : ""}`} htmlFor="rg-slip">
                    {file ? <FileText size={20} aria-hidden="true" /> : <Upload size={20} aria-hidden="true" />}
                    <span>{file ? file.name : "Upload a photo or PDF of the slip (max 5 MB)"}</span>
                  </label>
                  <input id="rg-slip" className="ld-rg-file-input" type="file" accept={REG_SLIP_ACCEPT} onChange={chooseFile} />
                </div>
              </div>
              {error && <p className="ld-rv-error" role="alert">{error}</p>}
              <div className="ld-wz-nav">
                {back}
                <button type="submit" className="ld-btn ld-btn-primary" disabled={busy}>
                  <Send size={18} aria-hidden="true" />{busy ? "Sending…" : "Send registration"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
