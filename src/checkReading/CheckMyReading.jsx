import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, Square, Eye, EyeOff, ChevronLeft, ChevronRight, ChevronsLeft, Download, BookOpen, RotateCcw, Check } from "lucide-react";
import MushafPage from "../thilawa/MushafPage.jsx";
import { splitWords, alignRecitation } from "../readingTest/match.js";
import { loadModel, modelReady, modelDownloadedBefore, useRecitation, mistakeSignal } from "./listener.js";
import { passageWords } from "./passage.js";
import { LEVEL_COLOURS, loadLevels, saveLevels, sessionLevels, hintKeys } from "./levels.js";
import { pageToUnit, unitToPage } from "../hifz/quran.js";

// Check my Reading (student portal): the student picks one of their tasks (or
// any page) and recites; Tarteel's Quran speech model listens on the phone and
// each word is checked on the quran.com Mushaf page. A wrong or skipped word
// buzzes and turns light red, then steps down each time it's later recited
// right (orange → blue → green → gone). Hide covers the words not yet
// recited (ayah numbers stay); Next word / Next ayah show them in red letters.
//
// tasks: [{ id, title, sub, Icon, first, last, range? }] (range: Hifz half-lines)
// demo: plays a sample recitation instead of the microphone.

const HINT_RED = "#D92D20";

const CSS = `
  .cmr { display: flex; flex-direction: column; gap: 12px; }
  .cmr-title { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 20px; color: #123B67; }
  .cmr-sub { margin: 0; color: #6B819A; font-size: 13.5px; line-height: 1.5; }
  .cmr-label { margin: 6px 2px 0; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #6B819A; }
  .cmr-card { background: #fff; border: 1px solid #E3ECF5; border-radius: 16px; padding: 14px; box-shadow: 0 1px 2px rgba(16,40,70,.04), 0 4px 16px rgba(16,40,70,.05); }
  .cmr-task { display: flex; align-items: center; gap: 12px; width: 100%; font: inherit; text-align: left; cursor: pointer; color: #123B67; }
  .cmr-task:focus-visible { outline: 3px solid #176FD1; outline-offset: 2px; }
  .cmr-ic { flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: #EEF4FB; color: #176FD1; }
  .cmr-task b { display: block; font-size: 15px; }
  .cmr-task small { font-size: 12.5px; color: #6B819A; }
  .cmr-task > svg:last-child { margin-left: auto; color: #176FD1; flex-shrink: 0; }
  .cmr-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; padding: 0 16px; border-radius: 12px; border: 1px solid #D5E3F2; background: #fff; color: #123B67; font: inherit; font-weight: 700; font-size: 14px; cursor: pointer; }
  .cmr-btn:disabled { opacity: .55; cursor: default; }
  .cmr-btn-main { background: linear-gradient(135deg, #0D4F85, #176FD1 55%, #0A94B1); color: #fff; border: none; }
  .cmr-page-in { width: 84px; min-height: 42px; border: 1px solid #D5E3F2; border-radius: 12px; padding: 0 10px; font: inherit; font-size: 15px; color: #123B67; }
  .cmr-bar { height: 8px; border-radius: 99px; background: #E8EFF6; overflow: hidden; margin-top: 10px; }
  .cmr-bar div { height: 100%; background: linear-gradient(90deg, #0D4F85, #176FD1); transition: width .2s; }
  .cmr-err { background: #FDECEC; color: #B42318; border-radius: 12px; padding: 10px 12px; font-size: 14px; }

  .cmr-top { display: flex; align-items: center; gap: 8px; }
  .cmr-back { flex-shrink: 0; width: 38px; height: 38px; border-radius: 11px; border: 1px solid #E3ECF5; background: #fff; color: #123B67; display: grid; place-items: center; cursor: pointer; }
  .cmr-top-text { flex: 1; min-width: 0; }
  .cmr-top-text b { display: block; font-size: 16px; color: #123B67; }
  .cmr-top-text small { font-size: 12px; color: #6B819A; }
  .cmr-pager { display: flex; align-items: center; gap: 4px; font-size: 12.5px; font-weight: 600; color: #3B5A7A; }
  .cmr-pager button { width: 32px; height: 32px; border-radius: 10px; border: 1px solid #E3ECF5; background: #fff; color: #123B67; display: grid; place-items: center; cursor: pointer; }
  .cmr-pager button:disabled { opacity: .4; cursor: default; }

  .cmr-result { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .cmr-result span { font-size: 14px; font-weight: 700; color: #123B67; }
  .cmr-result span em { font-style: normal; font-weight: 600; color: #6B819A; }
  .cmr-result .cmr-btn { margin-left: auto; }

  .cmr-controls {
    font-family: Inter, system-ui, sans-serif; box-sizing: border-box;
    display: flex; align-items: flex-end; gap: 2px; padding: 22px 4px 8px; background: rgba(255,255,255,.97);
    border: 1px solid #E3ECF5; border-radius: 22px; box-shadow: 0 8px 24px rgba(16,40,70,.10);
  }
  /* Phones: pinned just above the bottom tabs, the page scrolling under it. */
  @media (max-width: 900px) {
    .cmr-controls { position: fixed; z-index: 40; left: 10px; right: 10px; bottom: calc(74px + env(safe-area-inset-bottom)); padding-top: 10px; }
    .cmr-session { padding-bottom: 96px; }
  }
  @media (min-width: 901px) { .cmr-top { order: -2; } .cmr-controls { order: -1; max-width: 520px; width: 100%; align-self: center; } }
  .cmr-cbtn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; border: none; background: none; padding: 0; font: inherit; font-size: 10px; font-weight: 600; color: #6B819A; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .cmr-cbtn:disabled { opacity: .45; cursor: default; }
  .cmr-cbtn > span { width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; background: #fff; border: 1px solid #E3ECF5; color: #3B5A7A; box-shadow: 0 1px 2px rgba(16,40,70,.05); }
  .cmr-cbtn.on { color: #0D4F85; }
  .cmr-cbtn.on > span { background: #E2EEFC; border-color: #BBD5F4; color: #176FD1; }
  .cmr-cbtn:focus-visible > span { outline: 2px solid #176FD1; outline-offset: 2px; }
  .cmr-count > span { background: #FDECEE; border-color: #F7D3D8; color: #C2364A; font-size: 15px; font-weight: 800; }
  .cmr-mic { flex: 1.2; margin-top: -22px; color: #0D4F85; font-weight: 700; }
  .cmr-mic > span { width: 56px; height: 56px; border-radius: 50%; border: 4px solid #fff; color: #fff;
    background: linear-gradient(135deg, #0D4F85 0%, #176FD1 55%, #0A94B1 100%); box-shadow: 0 0 0 6px rgba(23,111,209,.12), 0 8px 18px rgba(13,79,133,.3); }
  .cmr-mic.live > span { animation: cmr-pulse 1.6s ease-in-out infinite; }
  @keyframes cmr-pulse { 0%, 100% { box-shadow: 0 0 0 6px rgba(23,111,209,.12), 0 8px 18px rgba(13,79,133,.3); } 50% { box-shadow: 0 0 0 12px rgba(23,111,209,.08), 0 8px 18px rgba(13,79,133,.3); } }
  @media (prefers-reduced-motion: reduce) { .cmr-mic.live > span { animation: none; } }
`;

// The one-time download of the listening model, then ready.
function ModelSetup({ onReady }) {
  const [state, setState] = useState(modelReady() ? "ready" : modelDownloadedBefore() ? "loading" : "ask");
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const start = () => {
    setError("");
    setState("loading");
    loadModel(setProgress).then(() => { setState("ready"); onReady(); }).catch((e) => { setError(e.message); setState("ask"); });
  };
  useEffect(() => {
    if (state === "ready") onReady();
    else if (state === "loading") start();
  }, []);
  if (state === "ready") return null;
  return (
    <div className="cmr-card">
      {state === "ask" ? (
        <>
          <p className="cmr-sub" style={{ marginBottom: 10 }}>Check my Reading listens on your phone. The first time, it downloads the listener (about 160 MB) and keeps it, so use Wi‑Fi. Your recitation never leaves your phone.</p>
          <button type="button" className="cmr-btn cmr-btn-main" onClick={start}><Download size={17} aria-hidden="true" />Set up Check my Reading</button>
        </>
      ) : (
        <>
          <p className="cmr-sub">{progress && progress.total > 1e6 ? `Downloading ${Math.round(progress.loaded / 1e6)} of ${Math.round(progress.total / 1e6)} MB… (only the first time)` : "Getting the listener ready…"}</p>
          <div className="cmr-bar"><div style={{ width: progress ? `${Math.round((progress.loaded / progress.total) * 100)}%` : "6%" }} /></div>
        </>
      )}
      {error && <div className="cmr-err" style={{ marginTop: 10 }}>Couldn't set it up: {error}</div>}
    </div>
  );
}

// Listening to one task.
function Session({ task, studentId, demo, onBack }) {
  const [passage, setPassage] = useState(null); // words in order, with ayah numbers
  const [loadError, setLoadError] = useState("");
  const [hidden, setHidden] = useState(false);
  const [hints, setHints] = useState(new Set());
  const [manualPage, setManualPage] = useState(null);
  const [started, setStarted] = useState(false);
  // Phones: the controls are pinned above the bottom tabs, drawn on the page
  // body so the portal's own animations can't move them.
  const [phone, setPhone] = useState(() => window.matchMedia("(max-width: 900px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const on = () => setPhone(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const { heard, listening, error, start, stop } = useRecitation();
  const base = useRef({});
  const lastMistakes = useRef(0);

  useEffect(() => {
    let live = true;
    passageWords(task.first, task.last, task.range).then((w) => live && setPassage(w)).catch(() => live && setLoadError("Couldn't load the Mushaf page. Check the internet connection."));
    return () => { live = false; stop(); };
  }, [task]);

  const words = useMemo(() => (passage || []).filter((w) => !w.end), [passage]);
  const result = useMemo(() => alignRecitation(splitWords(heard), words.map((w) => w.plain)), [heard, words]);
  const keys = useMemo(() => words.map((w) => w.key), [words]);
  const levels = useMemo(() => (started ? sessionLevels(base.current, keys, result.status) : loadLevels(studentId)), [started, keys, result, studentId]);
  const mistakes = result.status.filter((s) => s === "wrong" || s === "skipped").length;
  const pendingKeys = useMemo(() => keys.filter((_, i) => result.status[i] === "pending"), [keys, result]);
  const done = result.status.length > 0 && !pendingKeys.length;

  // A new mistake: a buzz (or a soft tone). Levels are saved as they change.
  useEffect(() => {
    if (mistakes > lastMistakes.current) mistakeSignal();
    lastMistakes.current = mistakes;
  }, [mistakes]);
  // levels = everything saved when this recitation began, updated by it; a
  // word marked wrong and then heard right a moment later isn't kept as wrong.
  useEffect(() => { if (started) saveLevels(studentId, levels); }, [levels, started, studentId]);
  useEffect(() => { if (done && listening) stop(); }, [done, listening]);

  const begin = () => {
    base.current = loadLevels(studentId);
    lastMistakes.current = 0;
    setHints(new Set());
    setManualPage(null);
    setStarted(true);
    if (demo) {
      const ayahs = [...new Set(words.map((w) => w.key.split(":").slice(0, 2).join(":")))];
      start(ayahs);
    } else start();
  };

  // The page shown: where the student has reached (or the one they turned to).
  const pages = [];
  for (let p = task.first; p <= task.last; p++) pages.push(p);
  const nextWord = words.find((w) => pendingKeys.includes(w.key));
  const page = manualPage ?? nextWord?.page ?? (words.length ? words[words.length - 1].page : task.first);

  const showHint = (whole) => setHints((h) => new Set([...h, ...hintKeys(passage, pendingKeys, h, whole)]));

  const wordStyles = useMemo(() => {
    const styles = {};
    const pending = new Set(pendingKeys);
    for (const w of words) {
      const st = {};
      const level = levels[w.key];
      if (level > 0) { st.background = LEVEL_COLOURS[level]; st.borderRadius = "0.15em"; }
      if (pending.has(w.key)) {
        if (hints.has(w.key)) st.color = HINT_RED;
        else if (hidden) st.color = "transparent";
      }
      if (Object.keys(st).length) styles[w.key] = st;
    }
    return styles;
  }, [words, levels, pendingKeys, hints, hidden]);

  const range = task.range ? [Math.max(task.range[0], pageToUnit(page)), Math.min(task.range[1], pageToUnit(page + 1))] : null;
  const counts = { ok: result.status.filter((s) => s === "ok").length, wrong: result.status.filter((s) => s === "wrong").length, skipped: result.status.filter((s) => s === "skipped").length };

  const controls = (
    <div className="cmr-controls" role="toolbar" aria-label="Check my Reading">
        <div className="cmr-cbtn cmr-count" aria-label={`${mistakes} mistake${mistakes === 1 ? "" : "s"}`}><span>{mistakes}</span>Mistakes</div>
        <button type="button" className="cmr-cbtn" disabled={!pendingKeys.length || !passage} onClick={() => showHint(true)}><span><ChevronsLeft size={17} strokeWidth={2.2} aria-hidden="true" /></span>Next ayah</button>
        <button type="button" className="cmr-cbtn" disabled={!pendingKeys.length || !passage} onClick={() => showHint(false)}><span><ChevronLeft size={17} strokeWidth={2.2} aria-hidden="true" /></span>Next word</button>
        <button type="button" className={`cmr-cbtn cmr-mic ${listening ? "live" : ""}`} disabled={!passage} onClick={listening ? stop : begin} aria-pressed={listening}>
          <span>{listening ? <Square size={18} fill="currentColor" aria-hidden="true" /> : <Mic size={20} strokeWidth={2.2} aria-hidden="true" />}</span>
          {listening ? "Listening" : started ? "Listen again" : "Listen"}
        </button>
        <button type="button" className={`cmr-cbtn ${hidden ? "on" : ""}`} onClick={() => setHidden((h) => !h)} aria-pressed={hidden}>
          <span>{hidden ? <EyeOff size={17} strokeWidth={2.1} aria-hidden="true" /> : <Eye size={17} strokeWidth={2.1} aria-hidden="true" />}</span>{hidden ? "Show" : "Hide"}
        </button>
      </div>
  );

  return (
    <div className="cmr cmr-session">
      <div className="cmr-top">
        <button type="button" className="cmr-back" onClick={() => { stop(); onBack(); }} aria-label="Back to your tasks"><ChevronLeft size={18} aria-hidden="true" /></button>
        <div className="cmr-top-text"><b>{task.title}</b><small>{listening ? "Listening…" : task.sub}</small></div>
        {pages.length > 1 && (
          <div className="cmr-pager" aria-label="Page">
            <button type="button" disabled={page <= task.first} onClick={() => setManualPage(page - 1)} aria-label="Previous page"><ChevronRight size={16} aria-hidden="true" /></button>
            p. {page}
            <button type="button" disabled={page >= task.last} onClick={() => setManualPage(page + 1)} aria-label="Next page"><ChevronLeft size={16} aria-hidden="true" /></button>
          </div>
        )}
      </div>

      {(loadError || error) && <div className="cmr-err" role="alert">{loadError || error}</div>}

      {started && !listening && heard && (
        <div className="cmr-card cmr-result" role="status">
          <span>{counts.ok} <em>right</em></span>
          <span style={{ color: "#B42318" }}>{counts.wrong} <em>wrong</em></span>
          <span style={{ color: "#A86A00" }}>{counts.skipped} <em>skipped</em></span>
          <button type="button" className="cmr-btn" onClick={begin}><RotateCcw size={16} aria-hidden="true" />Try again</button>
        </div>
      )}

      {passage ? <MushafPage page={page} range={range} wordStyles={wordStyles} /> : !loadError && <div className="cmr-card cmr-sub">Loading the Mushaf…</div>}

      {phone ? createPortal(controls, document.body) : controls}
    </div>
  );
}

export default function CheckMyReading({ tasks, studentId, demo = false }) {
  const [ready, setReady] = useState(modelReady());
  const [task, setTask] = useState(null);
  const [anyPage, setAnyPage] = useState(1);

  return (
    <div className="cmr">
      <style>{CSS}</style>
      {task ? (
        <Session key={`${task.id}`} task={task} studentId={studentId} demo={demo} onBack={() => setTask(null)} />
      ) : (
        <>
          <div>
            <h2 className="cmr-title"><Mic size={22} color="#176FD1" aria-hidden="true" />Check my Reading</h2>
            <p className="cmr-sub">Choose what to recite. The app listens and marks any word you get wrong.</p>
          </div>
          <ModelSetup onReady={() => setReady(true)} />
          {ready && (
            <>
              {tasks.length > 0 && <h3 className="cmr-label">Your tasks</h3>}
              {tasks.map((t) => (
                <button key={t.id} type="button" className="cmr-card cmr-task" onClick={() => setTask(t)}>
                  <span className="cmr-ic" aria-hidden="true"><t.Icon size={20} strokeWidth={1.9} /></span>
                  <span style={{ minWidth: 0 }}><b>{t.title}</b><small>{t.sub}</small></span>
                  <ChevronLeft size={18} aria-hidden="true" style={{ transform: "rotate(180deg)" }} />
                </button>
              ))}
              <h3 className="cmr-label">Or any page</h3>
              <div className="cmr-card" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="cmr-ic" aria-hidden="true"><BookOpen size={20} strokeWidth={1.9} /></span>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 14, color: "#123B67" }}>Mushaf page
                  <input className="cmr-page-in" type="number" min={1} max={604} value={anyPage} onChange={(e) => setAnyPage(Math.min(604, Math.max(1, +e.target.value || 1)))} />
                </label>
                <button type="button" className="cmr-btn cmr-btn-main" style={{ marginLeft: "auto" }} onClick={() => setTask({ id: `page-${anyPage}`, title: `Page ${anyPage}`, sub: "Any page", Icon: BookOpen, first: anyPage, last: anyPage })}>
                  <Check size={16} aria-hidden="true" />Start
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// Hifz tasks ({ id, activity, start, end }) → Check my Reading tasks.
export function hifzReadingTasks(tasks, info, describe) {
  return tasks.map((t) => ({
    id: t.id, title: info[t.activity].title, sub: describe([t.start, t.end]), Icon: info[t.activity].Icon,
    first: unitToPage(t.start), last: unitToPage(t.end - 1), range: [t.start, t.end],
  }));
}
