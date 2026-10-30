// One page of the Madinah Mushaf exactly as printed (KFGQPC 1441 edition, the
// "QCF V2" fonts used by quran.com): 15 lines, each line breaking where the
// printed page breaks. Every page has its own font in which each word is one
// glyph; quran.com's API gives each word's glyph code and line number.
// Lines with no words are the surah title frame and the basmala.
//
// Optional: `range` ([start, end) in half-line units, see hifz/quran.js)
// fades the lines outside a portion; `marks` highlights mistakes (open in
// red; corrected in green when `showCorrected`); `onWordTap(word)` lets the
// teacher tap words, with `selectedKey` outlining the chosen one.

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { pageToUnit, UNITS_PER_LINE } from "../hifz/quran.js";
import { buildLines } from "./mushafLines.js";

export { buildLines };

// Page turning like a printed Mushaf: swiping the page to the right (finger
// moving left to right) goes to the next page, to the left goes back. Spread
// the returned handlers on the element around the page. A short or mostly
// vertical movement is a tap or a scroll and is ignored.
export function useMushafSwipe(onNext, onPrev) {
  const start = useRef(null);
  return {
    onTouchStart: (e) => { const t = e.touches[0]; start.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null; },
    onTouchEnd: (e) => {
      const from = start.current;
      start.current = null;
      if (!from) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - from.x;
      const dy = t.clientY - from.y;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx > 0) onNext?.(); else onPrev?.();
    },
  };
}

// The endpoint quran.com's own site uses. (The older /api/v4/verses/by_page
// files some ayahs that cross a page under the wrong page, e.g. 70:40.)
const API = "https://api.qurancdn.com/api/qdc/verses/by_page";
const FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2";
const SURAH_NAMES_FONT = "https://verses.quran.foundation/fonts/quran/surah-names/v1/sura_names.woff2";
// Al-Fatihah's first ayah in the page 1 font, without its end marker: the basmala.
const BASMALA_GLYPHS = "ﱁ ﱂ ﱃ ﱄ";
// Full lines are 15.3–16.0 em wide in the page fonts (measured across the
// Mushaf); the page is sized a little wider so no line ever overflows.
const EM_PER_LINE = 16.6;

const fontCache = new Map(); // family → Promise
function loadFont(family, url) {
  if (!fontCache.has(family)) {
    const face = new FontFace(family, `url(${url}) format("woff2")`, { display: "block" });
    const p = face.load().then((f) => { document.fonts.add(f); });
    p.catch(() => fontCache.delete(family));
    fontCache.set(family, p);
  }
  return fontCache.get(family);
}
const pageFont = (page) => `QCF2_P${page}`;
const loadPageFont = (page) => loadFont(pageFont(page), `${FONT_BASE}/p${page}.woff2`);

const dataCache = new Map(); // page → Promise<lines>
function loadPageLines(page) {
  if (!dataCache.has(page)) {
    const p = fetch(`${API}/${page}?words=true&per_page=all&mushaf=1&word_fields=code_v2,line_number,text_uthmani,page_number`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((body) => buildLines(page, body.verses || []));
    p.catch(() => dataCache.delete(page));
    dataCache.set(page, p);
  }
  return dataCache.get(page);
}

export const mushafCss = `
  .mp-page { background: #FFFFFF; color: #1A1F36; border: 1px solid #E6E9EF; border-radius: 14px; box-shadow: 0 10px 30px rgba(18,59,103,0.07); padding: 4% 4.5% 2.5%; box-sizing: border-box; width: 100%; max-width: 760px; margin: 0 auto; }
  .mp-body { direction: rtl; }
  .mp-line { display: flex; justify-content: space-between; align-items: center; white-space: nowrap; height: 1.95em; }
  .mp-line-center { justify-content: center; gap: 0.18em; }
  .mp-word { display: inline-block; line-height: 1; font-feature-settings: normal; border-radius: 0.12em; padding: 0.04em 0; }
  .mp-out { opacity: 0.22; }
  .mp-mistake { background: #FBD5CC; color: #9B1C0A; box-shadow: 0 0 0 0.06em #F2A595; }
  .mp-fixed { background: #DDF5E9; color: #156B45; }
  .mp-tap { cursor: pointer; }
  .mp-tap:hover { background: #FFF1C2; }
  .mp-tap.mp-mistake:hover { background: #F7BCAE; }
  .mp-tap:focus-visible { outline: 2px solid #176FD1; outline-offset: 1px; }
  .mp-selected { outline: 0.08em solid #176FD1; outline-offset: 0.04em; }
  .mp-surah { display: flex; align-items: center; justify-content: center; height: 1.95em; }
  .mp-frame { position: relative; width: 100%; height: 1.55em; display: flex; align-items: center; justify-content: center; border-radius: 0.3em;
    background: linear-gradient(90deg, #DCEBFB, #F3F8FE 30%, #F3F8FE 70%, #DCEBFB); border: 0.06em solid #176FD1; box-shadow: inset 0 0 0 0.08em #FFFFFF, inset 0 0 0 0.11em #8DBBEA; }
  .mp-frame::before, .mp-frame::after { content: "۞"; position: absolute; top: 50%; transform: translateY(-50%); color: #176FD1; font-size: 0.7em; font-family: serif; }
  .mp-frame::before { left: 0.6em; }
  .mp-frame::after { right: 0.6em; }
  .mp-surah-name { font-family: "QCF2_SurahNames", serif; font-size: 1.15em; line-height: 1; color: #0D4F85; direction: ltr; }
  .mp-blank { height: 1.95em; }
  .mp-basmala { display: flex; justify-content: center; align-items: center; height: 1.95em; font-family: "QCF2_P1", serif; }
  .mp-foot { margin-top: 0.6em; text-align: center; font-family: Inter, system-ui, sans-serif; font-size: 13px; color: #7A8496; }
  .mp-first .mp-body { padding: 0 9%; }
  .mp-status { text-align: center; color: #7A8496; font-family: Inter, system-ui, sans-serif; font-size: 14px; padding: 40px 0; }
`;

export default function MushafPage({ page, range = null, marks = [], showCorrected = false, onWordTap = null, selectedKey = null }) {
  const [state, setState] = useState({ status: "loading", page, lines: [] });
  const [attempt, setAttempt] = useState(0);
  const bodyRef = useRef(null);
  const [fontSize, setFontSize] = useState(null);
  const [centered, setCentered] = useState(new Set());
  const [squeeze, setSqueeze] = useState(new Map()); // line → font scale, for a line wider than the page

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, status: "loading", page }));
    Promise.all([loadPageLines(page), loadPageFont(page), loadPageFont(1), loadFont("QCF2_SurahNames", SURAH_NAMES_FONT)])
      .then(([lines]) => live && setState({ status: "ready", page, lines }))
      .catch(() => live && setState({ status: "error", page, lines: [] }));
    // Get the next page ready so turning the page is instant.
    if (page < 604) { loadPageLines(page + 1).catch(() => {}); loadPageFont(page + 1).catch(() => {}); }
    return () => { live = false; };
  }, [page, attempt]);

  // Size the text so a full line fills the page's width on any screen.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return undefined;
    const fit = () => setFontSize(el.clientWidth / EM_PER_LINE);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [state.status]);

  // Lines shorter than the page (end of a surah, the first two pages) are
  // centred, as printed; full lines are justified edge to edge. A line that
  // would still be wider than the page is scaled down to fit.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || state.status !== "ready" || !fontSize) return;
    const width = el.clientWidth;
    const next = new Set();
    const tight = new Map();
    el.querySelectorAll(".mp-line").forEach((line, i) => {
      const scale = squeeze.get(i) || 1;
      const used = [...line.children].reduce((n, c) => n + c.getBoundingClientRect().width, 0) / scale;
      if (used < width * 0.8) next.add(i);
      if (used > width) tight.set(i, Math.floor((width / used) * 1000) / 1000);
    });
    setCentered((prev) => (prev.size === next.size && [...next].every((x) => prev.has(x)) ? prev : next));
    setSqueeze((prev) => (prev.size === tight.size && [...tight].every(([k, v]) => prev.get(k) === v) ? prev : tight));
  }, [state, fontSize]);

  const font = `"${pageFont(page)}", serif`;
  let wordLine = -1;
  const markOf = new Map();
  for (const m of marks) {
    const key = `${m.verseKey}:${m.position}`;
    if (!m.correctedAt) markOf.set(key, "open");
    else if (showCorrected && !markOf.has(key)) markOf.set(key, "fixed");
  }
  // A line is inside the portion when any of its half-lines is.
  const inRange = (line) => {
    if (!range) return true;
    const s = pageToUnit(page, line);
    return s < range[1] && s + UNITS_PER_LINE > range[0];
  };
  // Title and basmala lines go with the first line of words after them.
  const lineIn = state.lines.map((l, i) => {
    if (l.kind === "words") return inRange(l.line);
    const next = state.lines.slice(i + 1).find((x) => x.kind === "words");
    return inRange(next ? next.line : l.line);
  });
  return (
    <div className={`mp-page ${page <= 2 ? "mp-first" : ""}`} lang="ar">
      <style>{mushafCss}</style>
      {state.status === "error" ? (
        <div className="mp-status">
          Couldn't load this page (check the internet connection).{" "}
          <button type="button" className="hz-btn hz-btn-outline" onClick={() => setAttempt((n) => n + 1)}>Retry</button>
        </div>
      ) : (
        <div className="mp-body" ref={bodyRef} style={{ fontSize: fontSize ? `${fontSize}px` : undefined, visibility: state.status === "ready" ? "visible" : "hidden" }}
          aria-busy={state.status !== "ready"}>
          {state.status !== "ready" && <div className="mp-status" style={{ visibility: "visible" }}>Loading page {page}…</div>}
          {state.status === "ready" && state.lines.map((line, i) => {
            const out = lineIn[i] ? "" : "mp-out";
            if (line.kind === "surah") {
              return <div key={i} className={`mp-surah ${out}`}><div className="mp-frame"><span className="mp-surah-name" aria-label={`Surah ${line.surah}`}>{String(line.surah).padStart(3, "0")} surah</span></div></div>;
            }
            if (line.kind === "blank") return <div key={i} className="mp-blank" />;
            if (line.kind === "basmala") return <div key={i} className={`mp-basmala ${out}`}>{BASMALA_GLYPHS}</div>;
            wordLine += 1;
            return (
              <div key={i} className={`mp-line ${centered.has(wordLine) ? "mp-line-center" : ""} ${out}`}
                style={{ fontFamily: font, fontSize: squeeze.has(wordLine) ? `${squeeze.get(wordLine)}em` : undefined }}>
                {line.words.map((w, k) => {
                  const mark = markOf.get(w.key);
                  const cls = `mp-word ${mark === "open" ? "mp-mistake" : mark === "fixed" ? "mp-fixed" : ""} ${selectedKey === w.key ? "mp-selected" : ""}`;
                  if (!onWordTap || w.end) return <span key={k} className={cls}>{w.code}</span>;
                  const tap = () => onWordTap({ ...w, page, line: line.line });
                  return (
                    <span key={k} className={`${cls} mp-tap`} role="button" tabIndex={0} aria-label={`${w.text}${mark === "open" ? " (marked mistake)" : ""}`}
                      onClick={tap} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap(); } }}>{w.code}</span>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
      <div className="mp-foot">{page}</div>
    </div>
  );
}
