// A workshop's sign-up page (aflaahqc.com/workshop/<slug>), all in Dhivehi
// and styled like its poster: the heading, speaker, date and fee, then the
// form. A parent adds one or more students (full name, age, permanent
// address, Viber number), sees the total (fee × students), pays by bank
// transfer (the account number can be copied) and attaches the slip.
// Workshops are listed in workshops.js.

import { useState } from "react";
import { CheckCircle2, Send, Upload, FileText, Landmark, Copy, Check, Plus, Trash2, Users, CalendarDays, Clock, Video, Banknote, Lock, ArrowLeft, ArrowRight } from "lucide-react";
import { BANK } from "../payments/slips.js";
import { WORKSHOPS, workshopSlugOf, isWorkshopOpen, submitWorkshopRegistration, SLIP_ACCEPT, SLIP_MAX_BYTES } from "./workshops.js";

const MAX_STUDENTS = 10;
const EMPTY = { name: "", age: "", address: "", viber: "" };

const ERRORS = {
  slip: "ސްލިޕް އަޕްލޯޑް ނުކުރެވުނު. ފައިލް ބައްލަވާފައި އަލުން މަސައްކަތް ކުރައްވާ.",
  closed: "މި ވޯކްޝޮޕްގެ ރަޖިސްޓްރޭޝަން ބަންދުވެއްޖެ.",
  busy: "މިހާރު ވަރަށް ގިނަ ރަޖިސްޓްރޭޝަންތަކެއް ލިބެމުންދަނީ. ކުޑަ ވަގުތަކަށްފަހު އަލުން މަސައްކަތް ކުރައްވާ.",
  invalid: "ދަރިވަރުންގެ މަޢުލޫމާތު ބައްލަވާފައި އަލުން ފޮނުއްވާ.",
  save: "ރަޖިސްޓްރޭޝަން ނުފޮނުވުނު. އަލުން މަސައްކަތް ކުރައްވާ.",
  noSlip: "ފައިސާ ޖަމާކުރި ސްލިޕް އަޕްލޯޑް ކުރައްވާ.",
  bigSlip: "ސްލިޕްގެ ފައިލް 5 MB އަށްވުރެ ބޮޑު. ކުޑަ ފައިލެއް އަޕްލޯޑް ކުރައްވާ.",
};

// What is wrong with one student's details, or "".
function studentError(s, w) {
  if (s.name.trim().length < 2) return "ފުރިހަމަ ނަން ލިޔުއްވާ.";
  const age = Number(s.age);
  if (!/^\d{1,2}$/.test(String(s.age).trim()) || age < w.minAge || age > w.maxAge) return `ޢުމުރު ވާންޖެހޭނީ ${w.minAge} އަހަރާއި ${w.maxAge} އަހަރާ ދެމެދަށް.`;
  if (s.address.trim().length < 2) return "ދާއިމީ އެޑްރެސް ލިޔުއްވާ.";
  if (!/^[+0-9 -]{7,20}$/.test(s.viber.trim())) return "ވައިބަރ ނަންބަރު ރަނގަޅަށް ލިޔުއްވާ.";
  return "";
}

const Num = ({ children }) => <span className="wk-num" dir="ltr">{children}</span>;

function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement("textarea");
      t.value = text;
      t.setAttribute("readonly", "");
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };
  return (
    <button type="button" className={`wk-copy ${done ? "done" : ""}`} onClick={copy} aria-label={done ? "ކޮޕީ ކުރެވިއްޖެ" : "އެކައުންޓް ނަންބަރު ކޮޕީ ކުރައްވާ"}>
      {done ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      {done ? "ކޮޕީ ކުރެވިއްޖެ" : "ކޮޕީ"}
    </button>
  );
}

function Hero({ w, compact }) {
  const head = (
    <>
      <img className="wk-logo" src="/images/logo-full-color.png" alt="Aflaah Quran Class" />
      <div className="wk-label">{w.label}</div>
      <h1 className="wk-title"><span className="t1">{w.title[0]}</span> <span className="t2">{w.title[1]}</span></h1>
    </>
  );
  if (compact) return <header className="wk-hero compact">{head}</header>;
  return (
    <header className="wk-hero">
      {head}
      <div className="wk-age"><Users size={18} aria-hidden="true" /><span><Num>{w.minAge}</Num> އަހަރާއި <Num>{w.maxAge}</Num> އަހަރާ ދެމެދު</span></div>

      <div className="wk-speaker">
        <img src={w.speaker.photo} alt={w.speaker.name} />
        <div>
          <div className="wk-speaker-name">{w.speaker.name}</div>
          <ul>{w.speaker.lines.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      </div>

      <div className="wk-facts">
        <div className="wk-fact"><CalendarDays size={20} aria-hidden="true" /><div><b><Num>{w.date[0]}</Num> {w.date[1]} <Num>{w.date[2]}</Num></b><span>{w.day}</span></div></div>
        <div className="wk-fact"><Clock size={20} aria-hidden="true" /><div><b>ރޭގަނޑު <Num>{w.time}</Num></b></div></div>
        <div className="wk-fact"><Banknote size={20} aria-hidden="true" /><div><b>ފީ: <Num>{w.fee}</Num> ރުފިޔާ</b><span>ކޮންމެ ދަރިވަރަކަށް</span></div></div>
        <div className="wk-fact online"><Video size={20} aria-hidden="true" /><div><b>އޮންލައިންކޮށް</b></div></div>
      </div>
    </header>
  );
}

export default function WorkshopPage() {
  const slug = workshopSlugOf();
  const w = WORKSHOPS[slug];
  const [students, setStudents] = useState([{ ...EMPTY }]);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({}); // student index → message
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  // 0 = about the workshop, 1 = students, 2 = fee and slip
  const [step, setStep] = useState(0);
  const go = (n) => { setStep(n); setError(""); window.scrollTo({ top: 0 }); };

  if (!w) {
    return <div className="wk" dir="rtl" lang="dv"><style>{CSS}</style><main className="wk-wrap"><p className="wk-msg">މި ވޯކްޝޮޕެއް ނުފެނުނު.</p></main></div>;
  }
  const open = isWorkshopOpen(w);
  const total = w.fee * students.length;

  const edit = (i, key, value) => {
    setStudents((list) => list.map((s, k) => (k === i ? { ...s, [key]: value } : s)));
    setErrors((e) => ({ ...e, [i]: "" }));
    setError("");
  };
  const add = () => setStudents((list) => (list.length < MAX_STUDENTS ? [...list, { ...EMPTY }] : list));
  const remove = (i) => {
    setStudents((list) => list.filter((_, k) => k !== i));
    setErrors({});
  };
  const chooseFile = (e) => {
    const f = e.target.files?.[0] || null;
    setError("");
    if (f && f.size > SLIP_MAX_BYTES) { setFile(null); setError(ERRORS.bigSlip); e.target.value = ""; return; }
    setFile(f);
  };

  const toPayment = (e) => {
    e.preventDefault();
    const found = {};
    students.forEach((s, i) => { const m = studentError(s, w); if (m) found[i] = m; });
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first !== undefined) {
      document.getElementById(`wk-student-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    go(2);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { setError(ERRORS.noSlip); return; }
    setBusy(true);
    setError("");
    try {
      await submitWorkshopRegistration({ workshop: w.key, students, file });
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(ERRORS[err.message] || ERRORS.save);
    }
    setBusy(false);
  };

  return (
    <div className="wk" dir="rtl" lang="dv">
      <style>{CSS}</style>
      <main className="wk-wrap">
        <Hero w={w} compact={step > 0 && !sent} />

        {sent ? (
          <section className="wk-card wk-done" aria-live="polite">
            <CheckCircle2 size={52} aria-hidden="true" />
            <h2>ޝުކުރިއްޔާ!</h2>
            <p>ރަޖިސްޓްރޭޝަން ލިބިއްޖެ. ސްލިޕް ޗެކްކުރުމަށްފަހު ވައިބަރ މެދުވެރިކޮށް ގުޅާނަން.</p>
            <p className="wk-small"><Num>{students.length}</Num> ދަރިވަރުން · ޖުމްލަ <Num>{total}</Num> ރުފިޔާ</p>
          </section>
        ) : !open ? (
          <section className="wk-card wk-done">
            <Lock size={44} aria-hidden="true" />
            <h2>{ERRORS.closed}</h2>
            <p>ސުވާލެއް އޮތިއްޔާ ވައިބަރ <Num>{w.viber}</Num> އަށް މެސެޖް ކުރައްވާ.</p>
          </section>
        ) : step === 0 ? (
          <>
            <button type="button" className="wk-submit wk-start" onClick={() => go(1)}>
              ރަޖިސްޓަރ ވުމަށް <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <p className="wk-small">ސުވާލެއް އޮތިއްޔާ ވައިބަރ <Num>{w.viber}</Num></p>
          </>
        ) : (
          <>
            <ol className="wk-steps" aria-label="ބައިތައް">
              <li className={step === 1 ? "on" : "done"}><span><Num>1</Num></span>ދަރިވަރުން</li>
              <li className={step === 2 ? "on" : ""}><span><Num>2</Num></span>ފީ ދެއްކުން</li>
            </ol>

            {step === 1 ? (
              <form className="wk-card" onSubmit={toPayment} noValidate>
                <h2 className="wk-h2">ދަރިވަރުގެ މަޢުލޫމާތު</h2>
                {students.map((s, i) => (
                  <fieldset key={i} id={`wk-student-${i}`} className={`wk-student ${errors[i] ? "bad" : ""}`}>
                    <legend>
                      <span className="wk-badge"><Num>{i + 1}</Num></span>
                      ދަރިވަރު <Num>{i + 1}</Num>
                    </legend>
                    {students.length > 1 && (
                      <button type="button" className="wk-remove" onClick={() => remove(i)} aria-label={`ދަރިވަރު ${i + 1} ނަގާލާ`}>
                        <Trash2 size={16} aria-hidden="true" />ނަގާލާ
                      </button>
                    )}
                    <label className="wk-f">
                      <span>ފުރިހަމަ ނަން</span>
                      <input className="wk-input" value={s.name} onChange={(e) => edit(i, "name", e.target.value)} maxLength={80} autoComplete="off" required />
                    </label>
                    <label className="wk-f">
                      <span>ޢުމުރު</span>
                      <input className="wk-input wk-short" type="number" inputMode="numeric" dir="ltr" min={w.minAge} max={w.maxAge} value={s.age} onChange={(e) => edit(i, "age", e.target.value)} required placeholder={`${w.minAge}–${w.maxAge}`} />
                    </label>
                    <label className="wk-f">
                      <span>ދާއިމީ އެޑްރެސް</span>
                      <input className="wk-input" value={s.address} onChange={(e) => edit(i, "address", e.target.value)} maxLength={120} required placeholder="ގޭގެ ނަން، ރަށް" />
                    </label>
                    <label className="wk-f">
                      <span>ވައިބަރ ނަންބަރު</span>
                      <input className="wk-input wk-short" type="tel" inputMode="tel" dir="ltr" value={s.viber} onChange={(e) => edit(i, "viber", e.target.value)} maxLength={20} required placeholder="7xxxxxx" autoComplete="tel" />
                    </label>
                    {errors[i] && <p className="wk-error" role="alert">{errors[i]}</p>}
                  </fieldset>
                ))}
                {students.length < MAX_STUDENTS && (
                  <button type="button" className="wk-add" onClick={add}>
                    <Plus size={18} aria-hidden="true" />އިތުރު ދަރިވަރެއް ހިމަނާ
                  </button>
                )}
                <div className="wk-nav">
                  <button type="button" className="wk-back" onClick={() => go(0)}><ArrowRight size={18} aria-hidden="true" />ފަހަތަށް</button>
                  <button type="submit" className="wk-submit">ކުރިއަށް <ArrowLeft size={18} aria-hidden="true" /></button>
                </div>
              </form>
            ) : (
              <form className="wk-card" onSubmit={submit} noValidate>
                <h2 className="wk-h2">ފީ ދެއްކުން</h2>
                <div className="wk-total" aria-live="polite">
                  <div><span>ކޮންމެ ދަރިވަރަކަށް</span><b><Num>{w.fee}</Num> ރުފިޔާ</b></div>
                  <div><span>ދަރިވަރުން</span><b><Num>× {students.length}</Num></b></div>
                  <div className="sum"><span>ޖުމްލަ</span><b><Num>{total}</Num> ރުފިޔާ</b></div>
                </div>

                <div className="wk-bank">
                  <div className="wk-bank-head"><Landmark size={20} aria-hidden="true" /> <span><Num>{total}</Num> ރުފިޔާ ތިރީގައިވާ އެކައުންޓަށް ޓްރާންސްފަރ ކުރައްވާ</span></div>
                  <dl>
                    <div><dt>ބޭންކް</dt><dd dir="ltr">{BANK.bank}</dd></div>
                    <div><dt>އެކައުންޓުގެ ނަން</dt><dd dir="ltr">{BANK.accountName}</dd></div>
                    <div className="acc"><dt>އެކައުންޓް ނަންބަރު</dt><dd><span dir="ltr">{BANK.accountNumber}</span><CopyButton text={BANK.accountNumber} /></dd></div>
                  </dl>
                </div>

                <label className="wk-f">
                  <span>ފައިސާ ޖަމާކުރި ސްލިޕް</span>
                  <span className={`wk-file ${file ? "on" : ""}`}>
                    {file ? <FileText size={20} aria-hidden="true" /> : <Upload size={20} aria-hidden="true" />}
                    <span>{file ? <span dir="ltr">{file.name}</span> : "ސްލިޕްގެ ފޮޓޯއެއް ނުވަތަ PDF އެއް އަޕްލޯޑް ކުރައްވާ (5 MB އަށްވުރެ ކުޑަ)"}</span>
                    <input type="file" accept={SLIP_ACCEPT} onChange={chooseFile} />
                  </span>
                </label>

                {error && <p className="wk-error" role="alert">{error}</p>}
                <div className="wk-nav">
                  <button type="button" className="wk-back" onClick={() => go(1)} disabled={busy}><ArrowRight size={18} aria-hidden="true" />ފަހަތަށް</button>
                  <button type="submit" className="wk-submit" disabled={busy}>
                    <Send size={18} aria-hidden="true" />{busy ? "ފޮނުވަނީ…" : "ފޮނުވާ"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const CSS = `
  @font-face { font-family: "Aammu"; src: url("/fonts/MV_AammuFK_Regular.ttf"); font-display: swap; unicode-range: U+0780-07BF, U+060C, U+061B, U+061F, U+FDF2; }
  @font-face { font-family: "Faruma"; src: url("/fonts/Faruma.ttf"); font-display: swap; unicode-range: U+0780-07BF, U+060C, U+061B, U+061F, U+FDF2; }
  .wk { --navy: #123B67; --deep: #0D4F85; --blue: #176FD1; --teal: #0A94B1; --cyan: #22D3E0; --soft: #EEF6FA; --line: #C7DDF4; --muted: #567493;
    --grad: linear-gradient(120deg, var(--deep) 0%, var(--blue) 55%, var(--teal) 100%);
    min-height: 100vh; font-family: Faruma, Inter, system-ui, sans-serif; color: var(--navy);
    background: url("/images/tp-pattern-main.png") right -180px top -160px / 720px no-repeat, linear-gradient(180deg, #FFFFFF 0%, #F3F8FC 100%); }
  .wk *, .wk *::before, .wk *::after { box-sizing: border-box; }
  .wk-wrap { max-width: 640px; margin: 0 auto; padding: 20px 16px 48px; }
  .wk-num { font-family: Inter, sans-serif; font-weight: 700; unicode-bidi: isolate; white-space: nowrap; }

  .wk-hero { position: relative; text-align: right; }
  .wk-logo { width: 104px; display: block; margin: 0 auto 14px 0; } /* left, opposite the heading */
  .wk-label { display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px 8px; border-radius: 999px; background: var(--grad); color: #fff; font: 17px/1.4 Aammu; box-shadow: 0 8px 18px rgba(13,79,133,.2); }
  .wk-label::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--cyan); }
  .wk-title { margin: 18px 0 0; font: 400 clamp(38px, 10.5vw, 60px)/1.25 Aammu; }
  .wk-title span { display: inline-block; padding: .2em .03em .3em; margin: -.2em -.03em -.3em; -webkit-background-clip: text; background-clip: text; color: transparent; }
  .wk-title .t1 { background-image: var(--grad); }
  .wk-title .t2 { background-image: linear-gradient(120deg, var(--teal), var(--cyan)); }
  .wk-title::after { content: ""; display: block; height: 4px; margin-top: 10px; border-radius: 999px; background: linear-gradient(270deg, var(--deep), var(--blue) 40%, var(--cyan) 75%, rgba(34,211,224,0)); }
  .wk-age { display: inline-flex; align-items: center; gap: 8px; margin-top: 16px; padding: 6px 14px; border-radius: 12px; background: var(--soft); border: 1px solid var(--line); font-size: 16px; color: var(--navy); }
  .wk-age svg { color: var(--blue); }

  .wk-speaker { position: relative; display: flex; align-items: flex-end; gap: 14px; margin-top: 64px; min-height: 150px; padding: 18px 18px 18px 0; border-radius: 22px; background: var(--grad); color: #fff; box-shadow: 0 16px 36px rgba(13,79,133,.25); }
  .wk-speaker img { position: absolute; left: 10px; bottom: 0; height: 205px; width: auto; filter: drop-shadow(0 6px 8px rgba(6,30,60,.18)); }
  .wk-speaker > div { margin-left: 150px; align-self: center; }
  .wk-speaker-name { font: 22px/1.4 Aammu; }
  .wk-speaker ul { margin: 6px 0 0; padding: 0; list-style: none; font-size: 14px; line-height: 1.6; }
  .wk-speaker li::before { content: "• "; color: var(--cyan); }

  .wk-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
  .wk-fact { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 16px; background: #fff; border: 1px solid var(--line); }
  .wk-fact svg { flex-shrink: 0; width: 38px; height: 38px; padding: 9px; border-radius: 11px; background: var(--grad); color: #fff; }
  .wk-fact b { display: block; font: 400 16px/1.45 Aammu; }
  .wk-fact div > span { display: block; font-size: 13px; color: var(--muted); }
  .wk-fact.online b { color: #D92D20; }
  .wk-fact.online svg { background: linear-gradient(135deg, #F04438, #B42318); }

  .wk-card { margin-top: 22px; padding: 20px 16px 22px; border-radius: 22px; background: #fff; border: 1px solid var(--line); box-shadow: 0 10px 30px rgba(18,59,103,.08); }
  .wk-h2 { display: flex; align-items: center; gap: 10px; margin: 6px 0 14px; font: 400 22px/1.4 Aammu; color: var(--blue); }
  .wk-h2::before { content: ""; width: 6px; height: 24px; border-radius: 4px; background: var(--grad); }
  .wk-h2:not(:first-child) { margin-top: 26px; }

  .wk-student { position: relative; margin: 0 0 14px; padding: 12px 14px 14px; border: 1px solid var(--line); border-radius: 16px; background: #FAFCFE; }
  .wk-student.bad { border-color: #F04438; }
  .wk-student legend { display: flex; align-items: center; gap: 8px; padding: 0 6px; font: 400 17px/1.4 Aammu; }
  .wk-badge { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 8px; background: var(--grad); color: #fff; font-size: 13px; }
  .wk-remove { position: absolute; top: -8px; left: 10px; display: inline-flex; align-items: center; gap: 4px; min-height: 32px; padding: 0 10px; border-radius: 10px; border: 1px solid #F5C2BE; background: #fff; color: #B42318; font: inherit; font-size: 14px; cursor: pointer; }
  .wk-f { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; font-size: 15px; }
  .wk-f > span:first-child { font-weight: 400; }
  .wk-short { max-width: 220px; }
  .wk-input { width: 100%; min-height: 46px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 12px; background: #fff; font: inherit; font-size: 17px; color: #1B2733; }
  .wk-input[dir="ltr"] { font-family: Inter, sans-serif; font-size: 16px; text-align: left; }
  .wk-input:focus { outline: 2px solid var(--blue); outline-offset: 0; border-color: var(--blue); }
  .wk-add { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 48px; border-radius: 14px; border: 1.5px dashed var(--blue); background: #F2F8FE; color: var(--blue); font: inherit; font-size: 16px; cursor: pointer; }
  .wk-add:hover { background: #E6F1FB; }

  .wk-total { display: grid; gap: 6px; padding: 12px 14px; border-radius: 16px; background: var(--soft); border: 1px solid var(--line); }
  .wk-total > div { display: flex; justify-content: space-between; align-items: center; font-size: 15px; color: var(--muted); }
  .wk-total b { font-weight: 400; color: var(--navy); }
  .wk-total .sum { padding-top: 8px; margin-top: 2px; border-top: 1px dashed var(--line); font: 400 18px/1.4 Aammu; color: var(--navy); }
  .wk-total .sum b { font-size: 20px; }
  .wk-total .sum .wk-num { font-size: 22px; color: var(--blue); }

  .wk-bank { margin-top: 12px; padding: 14px; border-radius: 16px; border: 1px solid var(--line); }
  .wk-bank-head { display: flex; align-items: center; gap: 8px; font: 400 16px/1.5 Aammu; color: var(--navy); }
  .wk-bank-head svg { flex-shrink: 0; color: var(--blue); }
  .wk-bank dl { margin: 10px 0 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .wk-bank dl > div { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 14px; }
  .wk-bank dt { color: var(--muted); }
  .wk-bank dd { margin: 0; min-width: 0; overflow-wrap: anywhere; font-family: Inter, sans-serif; font-weight: 600; font-size: 14px; color: var(--navy); }
  .wk-bank .acc { flex-direction: column; align-items: stretch; gap: 6px; padding: 10px 12px; border-radius: 12px; background: var(--soft); }
  .wk-bank .acc dd { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 19px; font-weight: 800; letter-spacing: .02em; overflow-wrap: normal; }
  .wk-bank .acc dd span { white-space: nowrap; }
  .wk-copy { flex-shrink: 0; }
  .wk-copy { display: inline-flex; align-items: center; gap: 5px; min-height: 36px; padding: 0 12px; border-radius: 10px; border: none; background: var(--grad); color: #fff; font: 14px Faruma, Inter, sans-serif; cursor: pointer; }
  .wk-copy.done { background: #1E8A5A; }
  .wk-copy:focus-visible { outline: 2px solid var(--navy); outline-offset: 2px; }

  .wk-file { position: relative; display: flex; align-items: center; gap: 10px; min-height: 56px; padding: 10px 14px; border-radius: 14px; border: 1.5px dashed var(--line); background: #FAFCFE; color: var(--muted); font-size: 14px; cursor: pointer; }
  .wk-file.on { border-style: solid; border-color: var(--blue); color: var(--navy); background: #F2F8FE; }
  .wk-file svg { flex-shrink: 0; color: var(--blue); }
  .wk-file input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .wk-error { margin: 10px 0 0; padding: 8px 12px; border-radius: 10px; background: #FEF3F2; color: #B42318; font-size: 14px; }
  .wk-submit { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 52px; margin-top: 18px; border-radius: 14px; border: none; background: var(--grad); color: #fff; font: 400 18px Aammu; cursor: pointer; box-shadow: 0 10px 22px rgba(13,79,133,.25); }
  .wk-submit:disabled { opacity: .65; cursor: progress; }
  .wk-small { margin: 12px 0 0; text-align: center; font-size: 14px; color: var(--muted); }
  .wk-done { text-align: center; }
  .wk-done svg { color: #1E8A5A; }
  .wk-done h2 { margin: 10px 0 6px; font: 400 26px/1.4 Aammu; }
  .wk-done p { margin: 0; font-size: 16px; line-height: 1.7; }
  .wk-msg { padding: 60px 0; text-align: center; font-size: 18px; }

  /* Form steps: a smaller header, the step dots, back and next */
  .wk-hero.compact .wk-logo { width: 72px; margin-bottom: 4px; }
  .wk-hero.compact .wk-label { display: none; }
  .wk-hero.compact .wk-title { margin-top: 10px; font-size: clamp(26px, 7vw, 36px); }
  .wk-hero.compact .wk-title::after { height: 3px; margin-top: 6px; }
  .wk-start { margin-top: 22px; }
  .wk-steps { display: flex; gap: 8px; margin: 18px 0 0; padding: 0; list-style: none; }
  .wk-steps li { flex: 1; display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 12px; background: #fff; border: 1px solid var(--line); color: var(--muted); font-size: 15px; }
  .wk-steps li span { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 8px; background: var(--soft); color: var(--blue); font-size: 13px; }
  .wk-steps li.on { border-color: var(--blue); color: var(--navy); box-shadow: 0 4px 12px rgba(23,111,209,.15); }
  .wk-steps li.on span, .wk-steps li.done span { background: var(--grad); color: #fff; }
  .wk-steps + .wk-card { margin-top: 12px; }
  .wk-nav { display: flex; gap: 10px; margin-top: 18px; }
  .wk-nav .wk-submit { flex: 1; margin-top: 0; }
  .wk-back { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 52px; padding: 0 16px; border-radius: 14px; border: 1px solid var(--line); background: #fff; color: var(--navy); font: inherit; font-size: 16px; cursor: pointer; }
  .wk-back:disabled { opacity: .6; }
`;
