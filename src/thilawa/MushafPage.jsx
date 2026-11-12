// One page of the Madinah Mushaf exactly as printed (KFGQPC 1441 edition, the
// "QCF V2" fonts used by quran.com): 15 lines, each line breaking where the
// printed page breaks. Every page has its own font in which each word is one
// glyph; quran.com's API gives each word's glyph code and line number.
// Lines with no words are the surah title frame and the basmala.
//
// Optional: `range` ([start, end) in half-line units, see hifz/quran.js)
// fades the lines outside a portion; `marks` highlights mistakes (open in
// red, or their category's colour, with no outline; corrected in green when `showCorrected`); `onWordTap(word)` lets the
// teacher tap words (`selectedKey`: the word the pop-up is for); `letters`
// (Arabic letters) shows those letters in orange. `ayahMarks`
// ({ "2:6": "new" | "short" | "both" }) fills those ayah numbers with the
// activity's colour (where a New Hifz or Short Muraja'ah starts and ends);
// `onAyahTap({ verseKey, page, line, el })` lets the teacher tap ayah numbers
// (`selectedAyah`: the one a menu is open for). A word is one glyph in these
// fonts, so a word with any of them is drawn from its text in the King Fahd
// Complex's Uthmanic Hafs font instead, fitted to the printed word's width,
// with just those letters in orange.

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2, X, Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { pageToUnit, UNITS_PER_LINE, LINES_PER_PAGE, TOTAL_PAGES, JUZ_START_PAGES, SURAHS, surahsOnPages } from "../hifz/quran.js";
import { buildLines } from "./mushafLines.js";
import { MISTAKE_CATEGORIES, wordHasLetter, letterParts } from "./engine.js";

export { buildLines };

// Page turning like the quran.com app: the pages sit side by side, the next
// one to the left as in a printed Mushaf, and the page follows the finger.
// Let go past about a fifth of the page (or with a flick) and it turns, with
// the next page sliding in; otherwise it springs back. Turning by a button or
// the arrow keys (onNext / onPrev changing `page` by one) slides the same way.
// A mostly vertical movement scrolls as usual; two fingers zoom.
// children(page, current): draws one page; `current` is false for the pages
// on either side (draw them without tap handlers).
const PAGER_GAP = 16; // px between two pages while turning
const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function MushafPager({ page, onNext = null, onPrev = null, children }) {
  const wrapRef = useRef(null);
  const stripRef = useRef(null);
  const drag = useRef(null);
  const offset = useRef(0); // the strip's shift in px (+ shows the next page)
  const turning = useRef(null); // "next" | "prev": a drag let go to turn the page
  const lastPage = useRef(page);
  const settleTimer = useRef(null);
  const noClickUntil = useRef(0);
  const latest = useRef({ onNext, onPrev });
  latest.current = { onNext, onPrev };

  const span = () => (wrapRef.current?.clientWidth || 0) + PAGER_GAP;
  const place = (x, ms = 0) => {
    const el = stripRef.current;
    if (!el) return;
    offset.current = x;
    el.style.transition = ms ? `transform ${ms}ms ${EASE}` : "none";
    el.style.transform = x ? `translate3d(${x}px,0,0)` : "";
  };
  // Where the strip is on screen right now (mid-slide too).
  const shownAt = () => {
    const el = stripRef.current;
    if (!el) return 0;
    const t = getComputedStyle(el).transform;
    if (!t || t === "none") return 0;
    return new DOMMatrixReadOnly(t).m41;
  };
  // Slide to x, then run done.
  const settle = (x, ms, done) => {
    clearTimeout(settleTimer.current);
    if (!ms || reducedMotion()) { place(x); done?.(); return; }
    place(x, ms);
    settleTimer.current = setTimeout(() => done?.(), ms + 20);
  };
  useEffect(() => () => clearTimeout(settleTimer.current), []);

  // A new page: after a drag the strip is already showing it, so it just
  // comes back to rest under it; after a button it slides in from its side.
  useLayoutEffect(() => {
    const from = lastPage.current;
    lastPage.current = page;
    if (from === page) return;
    clearTimeout(settleTimer.current);
    if (turning.current) { turning.current = null; place(0); return; }
    const dir = page - from;
    if (Math.abs(dir) !== 1 || reducedMotion()) { place(0); return; }
    // The old page is now beside the new one; start with it in view.
    place(shownAt() - dir * span());
    stripRef.current?.getBoundingClientRect(); // so the slide starts from there
    settle(0, 340);
  }, [page]);

  const onTouchStart = (e) => {
    if (e.touches.length !== 1) { drag.current = null; return; }
    const t = e.touches[0];
    const base = shownAt();
    if (base) { clearTimeout(settleTimer.current); place(base); }
    drag.current = { x0: t.clientX, y0: t.clientY, base, mode: null, x: base, lastX: t.clientX, lastT: e.timeStamp, v: 0 };
  };
  const onTouchMove = (e) => {
    const d = drag.current;
    if (!d) return;
    if (e.touches.length !== 1) { drag.current = null; settle(0, 220); return; }
    const t = e.touches[0];
    const dx = t.clientX - d.x0;
    const dy = t.clientY - d.y0;
    if (!d.mode) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      d.mode = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (d.mode !== "x") return;
    const full = span();
    let x = d.base + dx;
    // No page that way: it gives a little, then stops.
    if (x > 0 && !latest.current.onNext) x *= 0.25;
    if (x < 0 && !latest.current.onPrev) x *= 0.25;
    x = Math.max(-full, Math.min(full, x));
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.v = 0.6 * ((t.clientX - d.lastX) / dt) + 0.4 * d.v;
    d.lastX = t.clientX;
    d.lastT = e.timeStamp;
    d.x = x;
    place(x);
  };
  const onTouchEnd = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.mode !== "x") return;
    noClickUntil.current = Date.now() + 400;
    const full = span();
    const { onNext: goNext, onPrev: goPrev } = latest.current;
    const flick = Math.abs(d.v) > 0.35;
    const dir = (d.x > full * 0.2 || (flick && d.v > 0 && d.x > 24)) && goNext ? "next"
      : (d.x < -full * 0.2 || (flick && d.v < 0 && d.x < -24)) && goPrev ? "prev" : null;
    if (!dir) { settle(0, 260); return; }
    const to = dir === "next" ? full : -full;
    const ms = Math.round(Math.min(380, Math.max(170, Math.abs(to - d.x) / Math.max(Math.abs(d.v), 1.1))));
    settle(to, ms, () => {
      turning.current = dir;
      (dir === "next" ? goNext : goPrev)();
      // Nothing changed after all: back to the page shown.
      setTimeout(() => { if (turning.current === dir) { turning.current = null; place(0); } }, 300);
    });
  };
  // A drag that ends over a word isn't a tap on it.
  const onClickCapture = (e) => { if (Date.now() < noClickUntil.current) { e.preventDefault(); e.stopPropagation(); } };

  const pages = [page - 1, page, page + 1].filter((p) => p >= 1 && p <= TOTAL_PAGES);
  return (
    <div className="mpg" ref={wrapRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd} onClickCapture={onClickCapture}>
      <div className="mpg-strip" ref={stripRef}>
        {pages.map((p) => {
          const d = p - page; // the next page (+1) is to the left
          return (
            <div key={p} className={`mpg-slot ${d ? "mpg-side" : ""}`} aria-hidden={d ? true : undefined} inert={d ? "" : undefined}
              style={d ? { transform: `translateX(calc(${-d} * (100% + ${PAGER_GAP}px)))` } : undefined}>
              {children(p, d === 0)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Full screen for presenting: `children` (the page with its Next / Previous)
// fill the screen. The Mushaf opens in full screen (`startFull`); Exit
// leaves it for the screen behind. Esc exits too.
// Full screen is its own layer on the page body (a portal), so nothing around
// the Mushaf — a scrolling screen (the teacher's Listen & mark, which on
// iPhone traps a fixed layer inside it and swallows the taps), a card's hover
// lift, a stacking order — can clip it or catch its taps. Where the browser has
// its own full screen (not on iPhone), the whole page goes full screen with it.
// In full screen, like the quran.com app: the Juz on the left and the page's
// surahs on the right at the top (`page`), then one row of buttons — Exit,
// `tools`, `quick` (e.g. the whiteboard) and More, which shows the controls
// otherwise folded away (the task tabs, the page title and its arrows).
// See-through Next / Previous buttons sit on the page's edges (onNext /
// onPrev; null hides one) and ← / → turn the page; swiping turns it as before.
// `edge`: things that sit on the screen's edge or slide over it (e.g. the
// letters tab on a phone), put on the page body too, above full screen while
// it's on.
export function MushafPresent({ children, page = null, tools = null, onNext = null, onPrev = null, quick = null, edge = null, startFull = true }) {
  const [full, setFull] = useState(startFull);
  const [menu, setMenu] = useState(false);
  const native = useRef(false); // the browser's own full screen is on because of us
  const leaveNative = () => {
    if (!native.current) return;
    native.current = false;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else if (document.webkitFullscreenElement) document.webkitExitFullscreen?.();
  };
  // Browsers only allow it just after a tap (opening the Mushaf, or Full screen).
  const goNative = () => {
    const el = document.documentElement;
    const request = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!request || document.fullscreenElement || document.webkitFullscreenElement) return;
    try {
      const p = request.call(el);
      native.current = true;
      p?.catch?.(() => { native.current = false; });
    } catch { native.current = false; /* the layer still covers the window */ }
  };
  const exit = () => { setFull(false); setMenu(false); leaveNative(); };
  const enter = () => { setFull(true); setMenu(false); goNative(); };
  useEffect(() => { if (startFull) goNative(); }, []);
  // The surahs with words on this page, for the title (from the page itself:
  // a surah that ends on the page where the next one starts is on it too).
  const [pageSurahs, setPageSurahs] = useState(null);
  useEffect(() => {
    let live = true;
    setPageSurahs(null);
    if (page) loadPageLines(page).then((lines) => {
      const nums = [...new Set(lines.flatMap((l) => (l.words || []).map((w) => +String(w.verseKey).split(":")[0])))].filter((n) => n >= 1 && n <= 114);
      if (live && nums.length) setPageSurahs(nums);
    }).catch(() => {});
    return () => { live = false; };
  }, [page]);
  const turn = useRef({ onNext, onPrev });
  turn.current = { onNext, onPrev };
  useEffect(() => {
    if (!full) return undefined;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The page's own bars (e.g. the phone tab bar) are hidden while the Mushaf fills the screen.
    document.body.classList.add("mf-is-full");
    // Caught first, so Esc leaves full screen without also closing a screen behind it.
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); exit(); return; }
      if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest?.("input, select, textarea, [contenteditable]")) return;
      // Like a printed Mushaf: the next page is to the left.
      if (e.key === "ArrowLeft" && turn.current.onNext) { e.preventDefault(); turn.current.onNext(); }
      if (e.key === "ArrowRight" && turn.current.onPrev) { e.preventDefault(); turn.current.onPrev(); }
    };
    // Leaving the browser's full screen (its own Esc or gesture) leaves ours too.
    const onChange = () => {
      if (native.current && !document.fullscreenElement && !document.webkitFullscreenElement) { native.current = false; setFull(false); setMenu(false); }
    };
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.body.style.overflow = before;
      document.body.classList.remove("mf-is-full");
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [full]);
  // Closing the screen while in full screen leaves the browser's full screen too.
  useEffect(() => () => leaveNative(), []);
  // The height under the title and buttons, for a page that fills the screen
  // (a phone held upright, see presentCss). Phones change it as their
  // browser bars show and hide, so it's kept up to date.
  const layerRef = useRef(null);
  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!full || !layer) return undefined;
    const top = layer.querySelector(".mf-top");
    const set = () => {
      const cs = getComputedStyle(layer);
      const h = window.innerHeight - (top?.offsetHeight || 0) - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 8;
      layer.style.setProperty("--mf-avail", `${Math.max(300, Math.floor(h))}px`);
    };
    set();
    const ro = new ResizeObserver(set);
    if (top) ro.observe(top);
    window.addEventListener("resize", set);
    window.visualViewport?.addEventListener("resize", set);
    return () => { ro.disconnect(); window.removeEventListener("resize", set); window.visualViewport?.removeEventListener("resize", set); };
  }, [full]);

  const edgeLayer = edge && createPortal(<div className={`mf-edge ${full ? "mf-edge-full" : ""}`}><style>{presentCss}</style>{edge}</div>, document.body);
  if (!full) {
    return (
      <div className="mf">
        <style>{presentCss}</style>
        <div className="mf-bar">
          {quick}
          {tools}
          <button type="button" className="hz-btn hz-btn-outline mf-open" onClick={enter} aria-label="Full screen"><Maximize2 size={16} aria-hidden="true" /><span className="mf-open-text">Full screen</span></button>
        </div>
        <div className="mf-content">{children}</div>
        {edgeLayer}
      </div>
    );
  }
  const surahs = (pageSurahs || (page ? surahsOnPages(page, page).map((x) => x.number) : [])).map((n) => SURAHS[n - 1]);
  const juz = page ? JUZ_START_PAGES.filter((p) => p <= page).length : 0;
  return [createPortal(
    <div ref={layerRef} className={`mf mf-full ${menu ? "mf-menu" : ""}`} role="dialog" aria-modal="true" aria-label="Mushaf, full screen">
      <style>{presentCss}</style>
      <div className="mf-top">
        {page && (
          <div className="mf-head">
            <span>Juz' {juz}</span>
            <span className="mf-head-surahs">
              {surahs.map((s, i) => (
                <span key={s.number} className="mf-head-surah">{i > 0 && <span aria-hidden="true">·</span>}{s.name}
                  <i className="mf-head-ar" lang="ar" aria-hidden="true">{String(s.number).padStart(3, "0")}</i></span>
              ))}
            </span>
          </div>
        )}
        <div className="mf-tools" role="toolbar" aria-label="Mushaf controls">
          <button type="button" className="mf-tool" onClick={exit} aria-label="Exit full screen"><Minimize2 size={18} aria-hidden="true" /><span>Exit</span></button>
          {tools}
          {quick}
          <button type="button" className={`mf-tool ${menu ? "mf-tool-on" : ""}`} onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label={menu ? "Hide the page controls" : "Show the page controls"}>
            {menu ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}<span>{menu ? "Less" : "More"}</span>
          </button>
        </div>
      </div>
      <div className="mf-content">{children}</div>
      {/* Like a printed Mushaf: the next page is to the left. */}
      {onNext && <button type="button" className="mf-side mf-side-next" onClick={onNext} aria-label="Next page"><ChevronLeft size={30} aria-hidden="true" /></button>}
      {onPrev && <button type="button" className="mf-side mf-side-prev" onClick={onPrev} aria-label="Previous page"><ChevronRight size={30} aria-hidden="true" /></button>}
    </div>,
    document.body,
    "mf-full",
  ), <span key="mf-edge" style={{ display: "contents" }}>{edgeLayer}</span>];
}

// Full screen fills the screen's width (a laptop scrolls down the page); very
// wide monitors stop at 1600px so the text doesn't grow huge. On a phone the
// page fills the screen like the quran.com app: plain paper, no card.
const presentCss = `
  .mf-bar { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 8px; }
  .mf-content { display: flex; flex-direction: column; gap: 12px; }
  .mf-open { min-height: 38px; padding: 0 12px; font-size: 13px; }
  /* Next to a page picker on a phone: just the icon. */
  @media (max-width: 520px) { .mf-bar:has(.hz-go) .mf-open-text { display: none; } .mf-bar:has(.hz-go) .mf-open { width: 38px; padding: 0; justify-content: center; } }
  .mpg { position: relative; overflow: hidden; touch-action: pan-y pinch-zoom; }
  .mpg-strip { position: relative; will-change: transform; }
  .mpg-slot { position: relative; }
  .mpg-side { position: absolute; top: 0; left: 0; width: 100%; }
  /* The pages are clipped at their edges as they turn, so no shadow to cut off. */
  .mpg .mp-page { box-shadow: none; }
  .mf-full { position: fixed; inset: 0; z-index: 3000; overflow: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; background: #FCFCFA; box-sizing: border-box;
    padding: max(8px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
    color: #123B67; font-family: Inter, ui-sans-serif, system-ui, sans-serif; animation: mf-in 220ms ease-out; }
  @keyframes mf-in { from { opacity: 0; transform: scale(0.985); } }
  @media (prefers-reduced-motion: reduce) { .mf-full { animation: none; } }
  .mf-full .mf-top, .mf-full .mf-content { width: 100%; max-width: 1600px; margin-left: auto; margin-right: auto; box-sizing: border-box; }
  .mf-full .mf-top { padding: 0 40px; }
  /* The Juz and the page's surahs, as at the top of a printed page. */
  .mf-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; min-height: 34px; font-size: 15px; color: #2A3550; }
  .mf-head-surahs { display: flex; align-items: center; gap: 6px; min-width: 0; flex-wrap: wrap; justify-content: flex-end; }
  .mf-head-surah { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
  .mf-head-ar { font-family: "QCF2_SurahNames", serif; font-style: normal; font-size: 22px; line-height: 1; color: #2A3550; }
  /* One row of buttons between the title and the text. */
  .mf-tools { display: flex; justify-content: center; gap: 8px; margin: 6px 0 4px; }
  .mf-tools > * { flex: 1 1 0; min-width: 0; max-width: 180px; }
  .mf-tools .hz-go { margin: 0; }
  .mf-tool, .mf-tools .hz-btn { box-sizing: border-box; width: 100%; height: 42px; min-height: 0; padding: 0 10px; border-radius: 12px; border: 1px solid #D6E2EF; background: #FFFFFF; color: #123B67;
    display: flex; align-items: center; justify-content: center; gap: 6px; font: 600 13px/1 Inter, ui-sans-serif, system-ui, sans-serif; cursor: pointer; box-shadow: 0 2px 8px rgba(18,59,103,0.06);
    -webkit-tap-highlight-color: transparent; transition: background 0.15s, transform 0.1s; }
  .mf-tool span, .mf-tools .hz-btn span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mf-tool:hover, .mf-tools .hz-btn:hover { background: #F1F6FC; }
  .mf-tool:active, .mf-tools .hz-btn:active { transform: scale(0.97); }
  .mf-tool-on { background: #E8F1FB; border-color: #9CC3EC; }
  .mf-tool:focus-visible, .mf-side:focus-visible { outline: 2px solid #176FD1; outline-offset: 2px; }
  .mf-edge { position: fixed; top: 0; right: 0; width: 0; height: 0; z-index: 1500; }
  .mf-edge-full { z-index: 3001; }
  /* The page controls are folded away until More. */
  .mf-full:not(.mf-menu) :is(.hz-tabs, .hz-reader-nav, .th-reader-nav, .lm-nav) { display: none !important; }
  .mf-full .mf-content > * { scroll-margin-top: 12px; }
  /* See-through Next / Previous on the page's edges. */
  .mf-side { position: fixed; top: 50%; transform: translateY(-50%); z-index: 7; width: 44px; height: min(42vh, 320px); border: none; padding: 0; cursor: pointer;
    background: transparent; color: rgba(18,59,103,0.38); display: flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent; }
  .mf-side:hover, .mf-side:active { background: rgba(23,111,209,0.08); color: rgba(18,59,103,0.7); }
  .mf-side-next { left: 0; border-radius: 0 16px 16px 0; }
  .mf-side-prev { right: 0; border-radius: 16px 0 0 16px; }
  /* The page sits between them, so a word at the edge is never under a button. */
  .mf-full .mf-content { padding: 0 40px; }
  /* Plain paper in full screen, with a thin line between two pages as they turn. */
  .mf-full .mp-page { max-width: none; background: transparent; border: none; box-shadow: none; border-radius: 0; }
  .mf-full .mpg-slot::after { content: ""; position: absolute; top: 2%; bottom: 2%; left: calc(100% + ${PAGER_GAP / 2}px); width: 1px; background: #D9DEE6; }
  /* A phone: the page fills the width (swipe to turn), like the quran.com app. */
  @media (max-width: 640px) {
    .mf-full { padding-left: 6px; padding-right: 6px; }
    .mf-full .mf-top { padding: 0 4px; }
    .mf-full .mf-content { padding: 0; }
    .mf-full .mp-page { padding: 2% 1.5% 2%; }
    .mf-tools { gap: 6px; margin: 4px 0 2px; }
    /* Icon above its word, so whole words fit four to a row. */
    .mf-tool, .mf-tools .hz-btn { height: 48px; padding: 4px 4px 3px; flex-direction: column; gap: 3px; font-size: 11px; border-radius: 12px; }
    .mf-tools .hz-go-main { flex-direction: row; font-size: 12px; }
    .mf-tools .lm-letters i { font-size: 16px; }
    .mf-tools .lm-letters b { position: absolute; top: 3px; right: 6px; }
    .mf-tools .lm-letters { position: relative; }
    .mf-head { font-size: 14px; }
  }
  @media (max-width: 640px) and (pointer: coarse) { .mf-side { display: none; } }
  /* Held upright (a phone, a tablet): one whole page on the screen under the
     buttons, its lines spread over the height, like the quran.com app.
     Anything under the page (e.g. Finish) is a scroll away. */
  @media (orientation: portrait) {
    .mf-full .mpg .mp-page { --mp-fill: 1; height: var(--mf-avail, auto); display: flex; flex-direction: column; padding-top: 1.5%; padding-bottom: 1%; }
    .mf-full .mpg .mp-body { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; }
    .mf-full .mpg .mp-foot { margin-top: 2px; }
  }
  .mf-is-full .mtb { display: none !important; }
`;

// The endpoint quran.com's own site uses. (The older /api/v4/verses/by_page
// files some ayahs that cross a page under the wrong page, e.g. 70:40.)
const API = "https://api.qurancdn.com/api/qdc/verses/by_page";
const FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2";
const SURAH_NAMES_FONT = "https://verses.quran.foundation/fonts/quran/surah-names/v1/sura_names.woff2";
// For words with letters to show in colour: real letters, same style (text_qpc_hafs).
const HAFS_FONT = "https://verses.quran.foundation/fonts/quran/hafs/uthmanic_hafs/UthmanicHafs1Ver18.woff2";
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
    const p = fetch(`${API}/${page}?words=true&per_page=all&mushaf=1&word_fields=code_v2,line_number,text_uthmani,text_qpc_hafs,page_number`)
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
  .mp-line { display: flex; justify-content: space-between; align-items: center; white-space: nowrap; height: var(--mp-lh, 1.95em); isolation: isolate; }
  .mp-line-center { justify-content: center; gap: 0.18em; }
  .mp-word { position: relative; display: inline-block; line-height: 1; font-feature-settings: normal; border-radius: 0.12em; padding: 0.04em 0; }
  /* A word's highlight sits underneath every word of its line: some words
     reach past their own box into the next word's (the meem of بَلَوْنَٰهُمْ,
     68:17), and the next word's highlight would hide those letters. */
  .mp-word::before { content: ""; position: absolute; inset: 0; z-index: -1; border-radius: inherit; }
  .mp-out { opacity: 0.22; }
  .mp-letter { color: #E8650A; }
  .mp-lettered > .mp-glyph { visibility: hidden; }
  .mp-hafs { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-family: "UthmanicHafs", serif; line-height: 1; white-space: nowrap; pointer-events: none; }
  .mp-hafs b { font-weight: inherit; color: #E8650A; }
  .mp-mistake { color: #9B1C0A; }
  .mp-mistake::before { background: #FBD5CC; animation: mp-mark-plain 340ms ease-out; }
  .mp-fixed { color: #156B45; }
  .mp-fixed::before { background: #DDF5E9; animation: mp-mark-fixed 340ms ease-out; }
  .mp-tap { cursor: pointer; }
  .mp-tap:hover::before { background: #FFF1C2; }
  .mp-tap.mp-mistake:hover::before { background: #F7BCAE; }
${MISTAKE_CATEGORIES.map((c) => `  .mp-mistake.mp-cat-${c.id} { color: ${c.fg}; }
  .mp-mistake.mp-cat-${c.id}::before { background: ${c.bg}; animation-name: mp-mark-${c.id}; }
  .mp-tap.mp-mistake.mp-cat-${c.id}:hover::before { background: ${c.bg}; filter: brightness(0.94); }`).join("\n")}
  /* The highlight pops in when a word is marked or gets its kind of mistake:
     one name per colour, so changing colour plays it again. */
${["plain", "fixed", ...MISTAKE_CATEGORIES.map((c) => c.id)].map((n) => `  @keyframes mp-mark-${n} { from { opacity: 0; transform: scale(0.6); } 60% { opacity: 1; transform: scale(1.1); } to { transform: none; } }`).join("\n")}
  @media (prefers-reduced-motion: reduce) { .mp-word::before { animation: none !important; } }
  .mp-tap:focus-visible { outline: 2px solid #176FD1; outline-offset: 1px; }
  /* Ayah numbers: tappable for the teacher; a marked one is filled with its
     activity's colour (New Hifz blue, Short Muraja'ah teal, both half and half). */
  .mp-end.mp-ayah-tap { cursor: pointer; }
  .mp-end.mp-ayah-tap:hover::before { background: #FFF1C2; border-radius: 50%; }
  .mp-end.mp-ayah-on::before { border-radius: 50%; inset: -0.07em; animation: mp-mark-plain 340ms ease-out; }
  .mp-end.mp-ayah-on { color: #FFFFFF; }
  .mp-ayah-new::before, .mp-end.mp-ayah-tap.mp-ayah-new:hover::before { background: #176FD1; }
  .mp-ayah-short::before, .mp-end.mp-ayah-tap.mp-ayah-short:hover::before { background: #0A7F96; }
  .mp-ayah-both::before, .mp-end.mp-ayah-tap.mp-ayah-both:hover::before { background: linear-gradient(90deg, #176FD1 50%, #0A7F96 50%); }
  .mp-ayah-sel::after { content: ""; position: absolute; inset: -0.12em; border-radius: 50%; border: 0.06em dashed #123B67; pointer-events: none; }
  .mp-surah { display: flex; align-items: center; justify-content: center; height: var(--mp-lh, 1.95em); }
  .mp-frame { position: relative; width: 100%; height: 1.55em; display: flex; align-items: center; justify-content: center; border-radius: 0.3em;
    background: linear-gradient(90deg, #DCEBFB, #F3F8FE 30%, #F3F8FE 70%, #DCEBFB); border: 0.06em solid #176FD1; box-shadow: inset 0 0 0 0.08em #FFFFFF, inset 0 0 0 0.11em #8DBBEA; }
  .mp-frame::before, .mp-frame::after { content: "۞"; position: absolute; top: 50%; transform: translateY(-50%); color: #176FD1; font-size: 0.7em; font-family: serif; }
  .mp-frame::before { left: 0.6em; }
  .mp-frame::after { right: 0.6em; }
  .mp-surah-name { font-family: "QCF2_SurahNames", serif; font-size: 1.15em; line-height: 1; color: #0D4F85; direction: ltr; }
  .mp-blank { height: var(--mp-lh, 1.95em); }
  .mp-basmala { display: flex; justify-content: center; align-items: center; height: var(--mp-lh, 1.95em); font-family: "QCF2_P1", serif; }
  .mp-foot { margin-top: 0.6em; text-align: center; font-family: Inter, system-ui, sans-serif; font-size: 13px; color: #7A8496; }
  .mp-first .mp-body { padding: 0 9%; }
  .mp-status { text-align: center; color: #7A8496; font-family: Inter, system-ui, sans-serif; font-size: 14px; padding: 40px 0; }
`;

// `wordStyles` ({ "78:1:2": { background, opacity, … } }) styles single words,
// e.g. Check my Reading colouring each word as it is recited.
export default function MushafPage({ page, range = null, marks = [], showCorrected = false, onWordTap = null, selectedKey = null, letters = [], wordStyles = null, ayahMarks = null, onAyahTap = null, selectedAyah = null }) {
  const [state, setState] = useState({ status: "loading", page, lines: [] });
  const [attempt, setAttempt] = useState(0);
  const bodyRef = useRef(null);
  const pageRef = useRef(null);
  const [fontSize, setFontSize] = useState(null);
  const [lineHeight, setLineHeight] = useState(null); // px, when the page fills a set height
  const [centered, setCentered] = useState(new Set());
  const [squeeze, setSqueeze] = useState(new Map()); // line → font scale, for a line wider than the page
  const [hafsReady, setHafsReady] = useState(false);
  const wantHafs = letters.length > 0;

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

  useEffect(() => {
    if (!wantHafs) return undefined;
    let live = true;
    loadFont("UthmanicHafs", HAFS_FONT).then(() => live && setHafsReady(true)).catch(() => {});
    return () => { live = false; };
  }, [wantHafs]);

  // Size the text so a full line fills the page's width on any screen.
  // A page given a height to fill (`--mp-fill: 1`, full screen on a phone)
  // is one whole page on the screen, like the quran.com app: the 15 lines
  // share that height, and the text is made smaller where it wouldn't fit.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    const pg = pageRef.current;
    if (!el || !pg) return undefined;
    const fit = () => {
      const byWidth = el.clientWidth / EM_PER_LINE;
      const cs = getComputedStyle(pg);
      if (cs.getPropertyValue("--mp-fill").trim() !== "1") { setFontSize(byWidth); setLineHeight(null); return; }
      const foot = pg.querySelector(".mp-foot");
      const footH = foot ? foot.offsetHeight + parseFloat(getComputedStyle(foot).marginTop || 0) : 0;
      const avail = pg.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - footH;
      const lh = avail / LINES_PER_PAGE;
      const size = Math.min(byWidth, lh / 1.8);
      setFontSize(size);
      setLineHeight(Math.floor(Math.min(lh, size * 2.6) * 100) / 100);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    ro.observe(pg);
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

  // A word drawn in the Hafs font is shrunk to the printed word's width where
  // it is wider (the printed page stacks some letters). All read, then all set.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const words = [...el.querySelectorAll(".mp-lettered")].map((w) => [w.querySelector(".mp-glyph"), w.querySelector(".mp-hafs")]);
    words.forEach(([, hafs]) => { hafs.style.fontSize = ""; });
    words.map(([glyph, hafs]) => glyph.getBoundingClientRect().width / hafs.getBoundingClientRect().width)
      .forEach((fit, i) => { if (fit < 1) words[i][1].style.fontSize = `${Math.floor(fit * 1000) / 1000}em`; });
  });

  const font = `"${pageFont(page)}", serif`;
  let wordLine = -1;
  const markOf = new Map();
  const categoryOf = new Map(); // open mistakes' category, for its colour
  for (const m of marks) {
    const key = `${m.verseKey}:${m.position}`;
    if (!m.correctedAt) { markOf.set(key, "open"); if (m.category) categoryOf.set(key, m.category); }
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
    <div className={`mp-page ${page <= 2 ? "mp-first" : ""}`} lang="ar" ref={pageRef}>
      <style>{mushafCss}</style>
      {state.status === "error" ? (
        <div className="mp-status">
          Couldn't load this page (check the internet connection).{" "}
          <button type="button" className="hz-btn hz-btn-outline" onClick={() => setAttempt((n) => n + 1)}>Retry</button>
        </div>
      ) : (
        <div className="mp-body" ref={bodyRef} style={{ fontSize: fontSize ? `${fontSize}px` : undefined, "--mp-lh": lineHeight ? `${lineHeight}px` : undefined, visibility: state.status === "ready" ? "visible" : "hidden" }}
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
                  // Until the Hafs font is here (or without the text), the whole word is orange.
                  const lettered = !w.end && wordHasLetter(w.text, letters);
                  const parts = lettered && hafsReady && w.hafs ? letterParts(w.hafs, letters) : null;
                  const cls = `mp-word ${mark === "open" ? "mp-mistake" : mark === "fixed" ? "mp-fixed" : ""} ${mark === "open" && categoryOf.has(w.key) ? `mp-cat-${categoryOf.get(w.key)}` : ""} ${selectedKey === w.key ? "mp-selected" : ""} ${parts ? "mp-lettered" : lettered ? "mp-letter" : ""} ${w.end ? "mp-end" : ""}`;
                  const glyph = parts
                    ? <><span className="mp-glyph">{w.code}</span><span className="mp-hafs" aria-hidden="true">{parts.map((p, j) => (p.on ? <b key={j}>{p.text}</b> : p.text))}</span></>
                    : w.code;
                  const style = wordStyles?.[w.key];
                  if (w.end) {
                    const kind = ayahMarks?.[w.verseKey];
                    const ayahCls = `${cls} ${kind ? `mp-ayah-on mp-ayah-${kind}` : ""} ${selectedAyah === w.verseKey ? "mp-ayah-sel" : ""}`;
                    if (!onAyahTap) return <span key={k} className={ayahCls} style={style}>{glyph}</span>;
                    const tapAyah = (e) => onAyahTap({ verseKey: w.verseKey, page, line: line.line, el: e.currentTarget });
                    return (
                      <span key={k} className={`${ayahCls} mp-ayah-tap`} style={style} role="button" tabIndex={0} aria-label={`Ayah ${w.verseKey}${kind ? " (marked)" : ""}`}
                        onClick={tapAyah} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tapAyah(e); } }}>{glyph}</span>
                    );
                  }
                  if (!onWordTap) return <span key={k} className={cls} style={style}>{glyph}</span>;
                  // el: the word on screen, for a pop-up next to it.
                  const tap = (e) => onWordTap({ ...w, page, line: line.line, el: e.currentTarget });
                  return (
                    <span key={k} className={`${cls} mp-tap`} style={style} role="button" tabIndex={0} aria-label={`${w.text}${mark === "open" ? " (marked mistake)" : ""}`}
                      onClick={tap} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap(e); } }}>{glyph}</span>
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
