// A store product's order page (aflaahqc.com/store/<slug>, e.g. /store/huroof),
// all in Dhivehi and styled like the workshop sign-up pages.
// Four steps: the product with its poster and price, the buyer's details
// (name, permanent address, Viber number), the promise not to share the PDF,
// then the bank transfer and the slip. The admin checks the
// slip under Admin → Store and sends the PDF on Viber. Products are listed in
// products.js.

import { useState } from "react";
import { CheckCircle2, Send, Upload, FileText, Landmark, ArrowLeft, ArrowRight, Gift, ShieldCheck, Check } from "lucide-react";
import { BANK } from "../payments/slips.js";
import { SLIP_ACCEPT, SLIP_PICK_MAX_BYTES } from "../workshops/workshops.js";
import { CSS as WK_CSS, CopyButton } from "../workshops/WorkshopPage.jsx";
import { PRODUCTS, productSlugOf, submitStoreOrder } from "./products.js";

const EMPTY = { buyerName: "", address: "", viber: "" };

const ERRORS = {
  slip: "ސްލިޕް އަޕްލޯޑް ނުކުރެވުނު. ފައިލް ބައްލަވާފައި އަލުން މަސައްކަތް ކުރައްވާ.",
  closed: "މި ތަކެތި މިހާރު ވިއްކަން ނެތް.",
  busy: "މިހާރު ވަރަށް ގިނަ އޯޑަރުތަކެއް ލިބެމުންދަނީ. ކުޑަ ވަގުތަކަށްފަހު އަލުން މަސައްކަތް ކުރައްވާ.",
  invalid: "މަޢުލޫމާތު ބައްލަވާފައި އަލުން ފޮނުއްވާ.",
  agree: "އެއްބަސްވުމަށް އެއްބަސްވެވަޑައިގަންނަވާ.",
  save: "އޯޑަރު ނުފޮނުވުނު. އަލުން މަސައްކަތް ކުރައްވާ.",
  noSlip: "ފައިސާ ޖަމާކުރި ސްލިޕް އަޕްލޯޑް ކުރައްވާ.",
  bigSlip: "ސްލިޕްގެ ފައިލް ވަރަށް ބޮޑު. ސްކްރީންޝޮޓެއް ނުވަތަ ކުޑަ ފައިލެއް އަޕްލޯޑް ކުރައްވާ.",
};

// The promise the buyer ticks before paying.
const AGREEMENT = "މި PDF ފައިލް ގަންނަނީ ހަމައެކަނި އަޅުގަނޑުގެ ދަރިވަރުގެ ބޭނުމަށެވެ. މި ފައިލް ނުވަތަ މީގެ ޕްރިންޓެއް، މި ސެޓް ނުގަންނަ އެހެން އެއްވެސް މީހަކާ ހިއްސާ ނުކުރާނެ ކަމަށާއި، އެހެން މީހުންނަށް ފޮނުވައި، ވިއްކައި ނުވަތަ ސޯޝަލް މީޑިއާގައި ޝާއިޢު ނުކުރާނެ ކަމަށް އަޅުގަނޑު އެއްބަސްވަމެވެ.";

// What is wrong with the details, by field, or {}.
function detailErrors(o) {
  const e = {};
  if (o.buyerName.trim().length < 2) e.buyerName = "ފުރިހަމަ ނަން ލިޔުއްވާ.";
  if (o.address.trim().length < 2) e.address = "ދާއިމީ އެޑްރެސް ލިޔުއްވާ.";
  if (!/^[+0-9 -]{7,20}$/.test(o.viber.trim())) e.viber = "ވައިބަރ ނަންބަރު ރަނގަޅަށް ލިޔުއްވާ.";
  return e;
}

const Num = ({ children }) => <span className="wk-num" dir="ltr">{children}</span>;

function Field({ label, error, children }) {
  return (
    <label className="wk-f">
      <span>{label}</span>
      {children}
      {error && <span className="wk-error" role="alert">{error}</span>}
    </label>
  );
}

// The form steps start with the logo only; the first step's poster has its own.
const LogoBar = () => (
  <header className="so-top"><img className="wk-logo" src="/images/logo-full-color.png" alt="Aflaah Quran Class" /></header>
);

export default function OrderPage() {
  const slug = productSlugOf();
  const p = PRODUCTS[slug];
  const [order, setOrder] = useState({ ...EMPTY });
  const [agreed, setAgreed] = useState(false);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({}); // field → message
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  // 0 = the product, 1 = details, 2 = agreement, 3 = payment and slip
  const [step, setStep] = useState(0);
  const go = (n) => { setStep(n); setError(""); window.scrollTo({ top: 0 }); };

  if (!p) {
    return <div className="wk so" dir="rtl" lang="dv"><style>{WK_CSS + CSS}</style><main className="wk-wrap"><p className="wk-msg">މި ތަކެތި ނުފެނުނު.</p></main></div>;
  }

  const edit = (key, value) => {
    setOrder((o) => ({ ...o, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
    setError("");
  };
  const chooseFile = (e) => {
    const f = e.target.files?.[0] || null;
    setError("");
    if (f && f.size > SLIP_PICK_MAX_BYTES) { setFile(null); setError(ERRORS.bigSlip); e.target.value = ""; return; }
    setFile(f);
  };

  const toAgreement = (e) => {
    e.preventDefault();
    const found = detailErrors(order);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) { document.getElementById(`so-${first}`)?.focus(); return; }
    go(2);
  };
  const toPayment = (e) => {
    e.preventDefault();
    if (!agreed) { setError(ERRORS.agree); return; }
    go(3);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { setError(ERRORS.noSlip); return; }
    setBusy(true);
    setError("");
    try {
      await submitStoreOrder({ product: p.key, order, agreed, file });
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(ERRORS[err.message] || ERRORS.save);
    }
    setBusy(false);
  };

  const input = (key, props = {}) => (
    <input id={`so-${key}`} className={`wk-input ${props.dir === "ltr" ? "wk-short" : ""}`} value={order[key]} onChange={(e) => edit(key, e.target.value)} autoComplete="off" required aria-invalid={!!errors[key]} {...props} />
  );

  return (
    <div className="wk so" dir="rtl" lang="dv">
      <style>{WK_CSS + CSS}</style>
      <main className="wk-wrap">
        {!sent && step > 0 && <LogoBar />}

        {sent ? (
          <section className="wk-card wk-done wk-sent" aria-live="polite">
            <img className="wk-done-logo" src="/images/logo-full-color.png" alt="Aflaah Quran Class" />
            <CheckCircle2 size={56} aria-hidden="true" />
            <h2>ޝުކުރިއްޔާ!</h2>
            <p>ސްލިޕް ވެރިފައިކުރުމަށްފަހު، {p.name.dv} ގެ PDF ފައިލް ވައިބަރ <Num>{order.viber.trim()}</Num> އަށް ފޮނުވައިދެވޭނެއެވެ.</p>
            <p className="wk-small">ޖުމްލަ <Num>{p.price}</Num> ރުފިޔާ</p>
          </section>
        ) : step === 0 ? (
          <>
            <img className="so-poster" src={p.image} alt={p.name.dv} />
            <section className="wk-card so-buy">
              <div className="so-row">
                <div>
                  <div className="so-name">{p.name.dv} <span className="so-pdf">{p.format}</span></div>
                  <ul className="so-points">{p.points.map((x) => <li key={x}><Check size={16} aria-hidden="true" />{x}</li>)}</ul>
                </div>
                <div className="so-price"><span>އަގު</span><b><Num>{p.price}</Num> ރުފިޔާ</b></div>
              </div>
              <p className="so-bonus"><Gift size={20} aria-hidden="true" />{p.bonus}</p>
              <button type="button" className="wk-submit" onClick={() => go(1)}>
                ފައިސާ ދައްކާ <ArrowLeft size={20} aria-hidden="true" />
              </button>
            </section>
            <p className="wk-small">ސުވާލެއް އޮތިއްޔާ ވައިބަރ <Num>{p.viber}</Num></p>
          </>
        ) : (
          <>
            <ol className="wk-steps" aria-label="ބައިތައް">
              {["މަޢުލޫމާތު", "އެއްބަސްވުން", "ފައިސާ ދެއްކުން"].map((label, i) => (
                <li key={label} className={step === i + 1 ? "on" : step > i + 1 ? "done" : ""}><span><Num>{i + 1}</Num></span>{label}</li>
              ))}
            </ol>

            {step === 1 ? (
              <form className="wk-card" onSubmit={toAgreement} noValidate>
                <h2 className="wk-h2">ގަންނަ ފަރާތުގެ މަޢުލޫމާތު</h2>
                <Field label="ގަންނަ ފަރާތުގެ ފުރިހަމަ ނަން" error={errors.buyerName}>{input("buyerName", { maxLength: 80 })}</Field>
                <Field label="ދާއިމީ އެޑްރެސް" error={errors.address}>{input("address", { maxLength: 120, placeholder: "ގޭގެ ނަން، ރަށް" })}</Field>
                <Field label="ވައިބަރ ނަންބަރު (PDF ފޮނުވާނީ މި ނަންބަރަށް)" error={errors.viber}>{input("viber", { type: "tel", inputMode: "tel", dir: "ltr", maxLength: 20, placeholder: "7xxxxxx", autoComplete: "tel" })}</Field>
                <div className="wk-nav">
                  <button type="button" className="wk-back" onClick={() => go(0)}><ArrowRight size={18} aria-hidden="true" />ފަހަތަށް</button>
                  <button type="submit" className="wk-submit">ކުރިއަށް <ArrowLeft size={18} aria-hidden="true" /></button>
                </div>
              </form>
            ) : step === 2 ? (
              <form className="wk-card" onSubmit={toPayment} noValidate>
                <h2 className="wk-h2">އެއްބަސްވުން</h2>
                <div className={`so-agree ${error === ERRORS.agree ? "bad" : ""}`}>
                  <p><ShieldCheck size={20} aria-hidden="true" />{AGREEMENT}</p>
                  <label className="so-check">
                    <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setError(""); }} />
                    <span>މަތީގައިވާ އެއްބަސްވުމަށް އަޅުގަނޑު އެއްބަސްވަމެވެ.</span>
                  </label>
                </div>

                {error && <p className="wk-error" role="alert">{error}</p>}
                <div className="wk-nav">
                  <button type="button" className="wk-back" onClick={() => go(1)}><ArrowRight size={18} aria-hidden="true" />ފަހަތަށް</button>
                  <button type="submit" className="wk-submit">ކުރިއަށް <ArrowLeft size={18} aria-hidden="true" /></button>
                </div>
              </form>
            ) : (
              <form className="wk-card" onSubmit={submit} noValidate>
                <h2 className="wk-h2">ފައިސާ ދެއްކުން</h2>
                <div className="wk-total" aria-live="polite">
                  <div><span>{p.name.dv} ({p.format})</span><b><Num>{p.price}</Num> ރުފިޔާ</b></div>
                  <div className="sum"><span>ޖުމްލަ</span><b><Num>{p.price}</Num> ރުފިޔާ</b></div>
                </div>

                <div className="wk-bank">
                  <div className="wk-bank-head"><Landmark size={20} aria-hidden="true" /> <span><Num>{p.price}</Num> ރުފިޔާ ތިރީގައިވާ އެކައުންޓަށް ޓްރާންސްފަރ ކުރައްވާ</span></div>
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
                    <span>{file ? <span dir="ltr">{file.name}</span> : "ސްލިޕްގެ ފޮޓޯއެއް ނުވަތަ PDF އެއް އަޕްލޯޑް ކުރައްވާ"}</span>
                    <input type="file" accept={SLIP_ACCEPT} onChange={chooseFile} />
                  </span>
                </label>

                {error && <p className="wk-error" role="alert">{error}</p>}
                <div className="wk-nav">
                  <button type="button" className="wk-back" onClick={() => go(2)} disabled={busy}><ArrowRight size={18} aria-hidden="true" />ފަހަތަށް</button>
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
  /* Plain background, no pattern. */
  .wk.so { background: linear-gradient(180deg, #FFFFFF 0%, #F3F8FC 100%); }
  .so-top { display: flex; justify-content: flex-end; }
  .so-top .wk-logo { width: 56px; }
  .so-poster { display: block; width: 100%; margin-top: 2px; border-radius: 22px; border: 1px solid var(--line); box-shadow: 0 14px 34px rgba(18,59,103,.14); }
  .so-buy { margin-top: 16px; }
  .so-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; }
  .so-name { display: flex; align-items: center; gap: 8px; font: 400 22px/1.5 Aammu; color: var(--navy); }
  .so-pdf { padding: 3px 10px 2px; border-radius: 999px; background: #EF9F27; color: var(--navy); font: 800 13px/1.4 Inter, sans-serif; letter-spacing: .04em; }
  .so-points { margin: 8px 0 0; padding: 0; list-style: none; display: grid; gap: 6px; font-size: 15px; line-height: 1.6; color: #2B3C4E; }
  .so-points li { display: flex; align-items: flex-start; gap: 6px; }
  .so-points svg { flex-shrink: 0; margin-top: 4px; color: #1E8A5A; }
  .so-price { flex-shrink: 0; text-align: center; padding: 8px 14px 10px; border-radius: 16px; background: var(--soft); border: 1px solid var(--line); }
  .so-price span { display: block; font-size: 13px; color: var(--muted); }
  .so-price b { display: block; font: 400 18px/1.4 Aammu; white-space: nowrap; }
  .so-price .wk-num { font-size: 26px; color: var(--blue); }
  .so-bonus { display: flex; align-items: flex-start; gap: 8px; margin: 14px 0 0; padding: 10px 14px; border-radius: 14px; background: #FFF6E5; border: 1px solid #F6D7A0; font: 400 16px/1.6 Aammu; color: var(--navy); }
  .so-bonus svg { flex-shrink: 0; margin-top: 3px; color: #C77700; }
  .so-agree { padding: 12px 14px; border-radius: 16px; background: #FAFCFE; border: 1px solid var(--line); }
  .so-agree.bad { border-color: #F04438; }
  .so-agree p { display: flex; align-items: flex-start; gap: 8px; margin: 0; font-size: 15px; line-height: 1.8; color: #2B3C4E; }
  .so-agree p svg { flex-shrink: 0; margin-top: 4px; color: var(--blue); }
  .so-check { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 10px 12px; border-radius: 12px; background: #fff; border: 1px solid var(--line); font-size: 15px; cursor: pointer; }
  .so-check input { flex-shrink: 0; width: 22px; height: 22px; accent-color: var(--blue); }
  .wk-f .wk-error { margin-top: 2px; }
`;
