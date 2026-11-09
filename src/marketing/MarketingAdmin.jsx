// Admin → Social Media: posters for Instagram, made in the browser and
// downloaded as PNGs. For now one tool, the Hifz success poster: the admin
// types the student's details, chooses which words of the name to blur for a
// public post, sees the poster and downloads it as a feed post or a story.

import { useState, useEffect, useRef } from "react";
import { Megaphone, Download, EyeOff, Eye } from "lucide-react";
import { TP } from "../App.jsx";
import { drawHifzPoster, downloadHifzPoster, nameWords, POSTER_SIZES, START_FROM, TOTAL_JUZ } from "./hifzPoster.js";

const ORDINAL = ["1st", "2nd", "3rd", "4th", "5th", "6th"];

export function AdminMarketing({ showToast }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [juz, setJuz] = useState("");
  const [size, setSize] = useState("feed");
  const [startFrom, setStartFrom] = useState("first");
  // Word index → blurred or not. Words not set yet: every word after the
  // first is blurred, so a public post keeps only the first name.
  const [blurPick, setBlurPick] = useState({});
  const [busy, setBusy] = useState("");
  const [drawError, setDrawError] = useState("");
  const previewRef = useRef(null);

  const words = nameWords(name);
  const isBlurred = (i) => blurPick[i] ?? i > 0;
  const blur = words.map((_, i) => i).filter(isBlurred);
  const juzNum = Number(juz);
  const juzOk = juz !== "" && Number.isInteger(juzNum) && juzNum >= 0 && juzNum <= TOTAL_JUZ;
  const ageOk = age === "" || (Number.isInteger(Number(age)) && Number(age) > 0 && Number(age) < 120);
  const ready = words.length > 0 && juzOk && ageOk;
  const blurKey = blur.join(",");

  // Redraw the preview shortly after typing stops.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const canvas = await drawHifzPoster({ name, age: ageOk ? age : "", juz: juzOk ? juzNum : 0, blur, size, startFrom });
        if (cancelled || !previewRef.current) return;
        canvas.className = "mk-canvas";
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", "Poster preview");
        previewRef.current.replaceChildren(canvas);
        setDrawError("");
      } catch (e) {
        console.error("poster", e);
        if (!cancelled) setDrawError("Couldn't draw the poster. Check your connection and try again.");
      }
    }, 180);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, age, juz, size, startFrom, blurKey]);

  const download = async (sizes) => {
    if (!ready) return;
    setBusy(sizes.length > 1 ? "both" : "one");
    try {
      for (const s of sizes) await downloadHifzPoster({ name, age, juz: juzNum, blur, size: s, startFrom });
      showToast(sizes.length > 1 ? "Both posters downloaded." : "Poster downloaded.");
    } catch (e) {
      console.error("poster", e);
      showToast("Couldn't make the poster. Please try again.");
    }
    setBusy("");
  };

  return (
    <div>
      <style>{`
        @font-face { font-family: "Faruma"; src: url("/fonts/Faruma.ttf"); font-display: swap; unicode-range: U+0780-07BF, U+060C, U+061B, U+061F, U+FDF2; }
        .mk-tool { margin-top: 18px; padding: 20px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px; align-items: start; }
        @media (max-width: 860px) { .mk-tool { grid-template-columns: 1fr; } }
        .mk-tool h2 { margin: 0 0 4px; font-size: 17px; font-weight: 700; color: ${TP.navy}; }
        .mk-lead { margin: 0 0 16px; font-size: 13px; line-height: 1.5; color: ${TP.secondaryText}; }
        .mk-form { display: flex; flex-direction: column; gap: 14px; }
        .mk-field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: ${TP.navy}; }
        .mk-hint { font-size: 12px; font-weight: 400; color: ${TP.secondaryText}; }
        .mk-input { width: 100%; box-sizing: border-box; border: 1px solid ${TP.border}; border-radius: 10px; padding: 9px 12px; font: inherit; font-size: 15px; font-weight: 400; color: #1B2733; background: #FFFFFF; min-height: 44px; }
        .mk-input:focus { outline: 2px solid ${TP.blue}; outline-offset: 0; border-color: ${TP.blue}; }
        .mk-input[dir="rtl"] { font-family: Faruma, Inter, sans-serif; font-size: 19px; }
        .mk-input[aria-invalid="true"] { border-color: #B42318; }
        .mk-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .mk-error { margin: 0; font-size: 12px; font-weight: 500; color: #B42318; }
        .mk-words { display: flex; flex-wrap: wrap; gap: 8px; }
        .mk-word { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 6px 12px; border-radius: 10px; border: 1px solid ${TP.border}; background: #FFFFFF; font: inherit; font-size: 13px; font-weight: 600; color: ${TP.navy}; cursor: pointer; }
        .mk-word span[lang] { font-family: Faruma, Inter, sans-serif; font-size: 18px; font-weight: 400; }
        .mk-word[aria-pressed="true"] { background: #E3EEF8; border-color: ${TP.blue}; }
        .mk-word[aria-pressed="true"] span[lang] { filter: blur(3px); }
        .mk-word:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
        .mk-empty { font-size: 13px; color: ${TP.secondaryText}; }
        .mk-sizes { display: inline-flex; padding: 3px; border-radius: 10px; background: #E3EEF8; align-self: flex-start; }
        .mk-sizes button { border: none; background: transparent; border-radius: 8px; padding: 0 14px; min-height: 40px; font: inherit; font-size: 13px; font-weight: 600; color: ${TP.secondaryText}; cursor: pointer; }
        .mk-sizes button small { font-weight: 500; margin-left: 6px; opacity: 0.8; }
        .mk-sizes button[aria-pressed="true"] { background: #FFFFFF; color: ${TP.navy}; box-shadow: 0 1px 3px rgba(18,59,103,0.12); }
        .mk-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px; }
        .mk-preview { display: flex; flex-direction: column; gap: 8px; }
        .mk-preview-label { font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: ${TP.secondaryText}; }
        .mk-frame { border-radius: 14px; overflow: hidden; background: #E3EEF8; box-shadow: 0 10px 30px rgba(18,59,103,0.12); max-width: 440px; width: 100%; margin: 0 auto; min-height: 200px; }
        .mk-canvas { display: block; width: 100%; height: auto; }
      `}</style>
      <div className="tp-header">
        <div className="tp-title-group">
          <span className="tp-title-icon" aria-hidden="true"><Megaphone size={22} /></span>
          <div>
            <h1 className="tp-title">Social Media</h1>
            <div className="tp-subtext" style={{ margin: 0 }}>Posters for Instagram and other social media, ready to download.</div>
          </div>
        </div>
      </div>

      <section className="tp-card mk-tool" aria-label="Hifz success poster">
        <div>
          <h2>Hifz success poster</h2>
          <p className="mk-lead">Fill in the student's details. The poster is in Dhivehi and shows their Hifz progress, the prizes for each juz and the note to fill the form in the caption.</p>
          <div className="mk-form">
            <label className="mk-field">
              Student's name (Dhivehi)
              <input className="mk-input" dir="rtl" lang="dv" value={name} placeholder="ދަރިވަރުގެ ނަން" onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="mk-row">
              <label className="mk-field">
                Age
                <input className="mk-input" type="number" inputMode="numeric" min="1" max="119" value={age} aria-invalid={!ageOk} onChange={(e) => setAge(e.target.value)} />
                <span className="mk-hint">Leave empty to hide it.</span>
              </label>
              <label className="mk-field">
                Juz memorised
                <input className="mk-input" type="number" inputMode="numeric" min="0" max={TOTAL_JUZ} value={juz} aria-invalid={juz !== "" && !juzOk} onChange={(e) => setJuz(e.target.value)} />
                <span className="mk-hint">Out of {TOTAL_JUZ}. The percentage comes from this.</span>
              </label>
            </div>
            {!ageOk && <p className="mk-error" role="alert">Enter the age as a whole number.</p>}
            {juz !== "" && !juzOk && <p className="mk-error" role="alert">Juz memorised must be a whole number from 0 to {TOTAL_JUZ}.</p>}

            <div className="mk-field">
              Started memorising from
              <div className="mk-sizes" role="group" aria-label="Started memorising from">
                {START_FROM.map((o) => (
                  <button key={o.key} type="button" aria-pressed={startFrom === o.key} onClick={() => setStartFrom(o.key)}>{o.label}</button>
                ))}
              </div>
              <span className="mk-hint">Which juz blocks are filled in: from juz 1 (right) or from juz 30 (left).</span>
            </div>

            <div className="mk-field">
              Blur for a public post
              <span className="mk-hint">Tap a name to blur it or show it.</span>
              {words.length ? (
                <div className="mk-words" role="group" aria-label="Words of the name to blur">
                  {words.map((w, i) => (
                    <button key={`${i}-${w}`} type="button" className="mk-word" aria-pressed={isBlurred(i)}
                      onClick={() => setBlurPick((p) => ({ ...p, [i]: !isBlurred(i) }))}>
                      {isBlurred(i) ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                      {ORDINAL[i] || `${i + 1}th`} name
                      <span lang="dv" dir="rtl">{w}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <span className="mk-empty">Type the name first.</span>
              )}
            </div>

            <div className="mk-field">
              Size
              <div className="mk-sizes" role="group" aria-label="Poster size">
                {POSTER_SIZES.map((s) => (
                  <button key={s.key} type="button" aria-pressed={size === s.key} onClick={() => setSize(s.key)}>
                    {s.label}<small>{s.dims}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="mk-actions">
              <button type="button" className="tp-btn-gradient" disabled={!ready || !!busy} onClick={() => download([size])}>
                <Download size={16} aria-hidden="true" />{busy === "one" ? "Making…" : "Download PNG"}
              </button>
              <button type="button" className="lc-btn" disabled={!ready || !!busy} onClick={() => download(POSTER_SIZES.map((s) => s.key))}>
                {busy === "both" ? "Making…" : "Download both sizes"}
              </button>
            </div>
            {!ready && <span className="mk-hint">Enter the name and juz memorised to download.</span>}
          </div>
        </div>

        <div className="mk-preview">
          <div className="mk-preview-label">Preview</div>
          <div className="mk-frame" ref={previewRef}>
            <div className="lc-loading-row" style={{ padding: 20 }}><span className="lc-spinner"></span>Drawing…</div>
          </div>
          {drawError && <p className="mk-error" role="alert">{drawError}</p>}
        </div>
      </section>
    </div>
  );
}
