import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square, Download, Play } from "lucide-react";
import { splitWords, normalizeArabic, alignRecitation } from "./match.js";
import MushafPage from "../thilawa/MushafPage.jsx";

// Check my Reading — test page (/reading-test). Loads Tarteel's Quran speech
// model on this device, listens (microphone, or a sample recitation), and
// compares what it hears with a Mushaf page word by word. The page is the
// app's Madinah Mushaf, exactly as quran.com shows it (Rasm Uthmani,
// KFGQPC fonts), with each word coloured as it is checked. Shows how fast it
// is and how accurate, before the real feature is built.

const API = "https://api.qurancdn.com/api/qdc/verses/by_page";
const RATE = 16000;
const EVERY_MS = 2000; // how often to re-check while listening
const SEGMENT_S = 22; // the model hears up to 30 s at once; longer recitations go in parts,
// cut at the quietest moment (a pause between words) so no word is split.

const CSS = `
  .rt { font-family: Inter, system-ui, sans-serif; color: #123B67; background: #F3F7FB; min-height: 100vh; padding: 18px 14px 40px; box-sizing: border-box; }
  .rt * { box-sizing: border-box; }
  .rt-wrap { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
  .rt h1 { margin: 0; font-size: 22px; }
  .rt-sub { margin: 2px 0 0; color: #6B819A; font-size: 13.5px; line-height: 1.5; }
  .rt-card { background: #fff; border: 1px solid #E3ECF5; border-radius: 16px; padding: 14px; box-shadow: 0 1px 2px rgba(16,40,70,.04), 0 4px 16px rgba(16,40,70,.05); }
  .rt-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .rt-label { font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #6B819A; margin-bottom: 8px; }
  .rt-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; padding: 0 16px; border-radius: 12px; border: 1px solid #D5E3F2; background: #fff; color: #123B67; font: inherit; font-weight: 700; font-size: 14px; cursor: pointer; }
  .rt-btn:disabled { opacity: .5; cursor: default; }
  .rt-btn-main { background: linear-gradient(135deg, #0D4F85, #176FD1 55%, #0A94B1); color: #fff; border: none; }
  .rt-btn-stop { background: #E5484D; color: #fff; border: none; }
  .rt-seg { display: inline-flex; background: #F1F5FA; border-radius: 12px; padding: 3px; }
  .rt-seg button { border: none; background: transparent; font: inherit; font-size: 13px; font-weight: 700; color: #3B5A7A; padding: 8px 12px; border-radius: 9px; cursor: pointer; }
  .rt-seg button[aria-pressed="true"] { background: #fff; color: #0D4F85; box-shadow: 0 1px 3px rgba(16,40,70,.12); }
  .rt-input { width: 84px; min-height: 42px; border: 1px solid #D5E3F2; border-radius: 12px; padding: 0 10px; font: inherit; font-size: 15px; color: #123B67; }
  .rt-bar { height: 8px; border-radius: 99px; background: #E8EFF6; overflow: hidden; margin-top: 10px; }
  .rt-bar div { height: 100%; background: linear-gradient(90deg, #0D4F85, #176FD1); transition: width .2s; }
  .rt-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; }
  .rt-stat { background: #F6F9FC; border-radius: 12px; padding: 9px 10px; }
  .rt-stat small { display: block; font-size: 11px; color: #6B819A; font-weight: 600; }
  .rt-stat b { font-size: 16px; }
  .rt-heard { direction: rtl; font-size: 17px; line-height: 1.8; color: #3B5A7A; min-height: 30px; }
  .rt-key { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12.5px; color: #3B5A7A; margin-top: 8px; }
  .rt-key span { display: inline-flex; align-items: center; gap: 6px; }
  .rt-key i { width: 18px; height: 12px; border-radius: 3px; display: inline-block; }
  .rt-err { background: #FDECEC; color: #B42318; border-radius: 12px; padding: 10px 12px; font-size: 14px; }
`;

const fmtMB = (b) => `${(b / 1e6).toFixed(0)} MB`;
const pad3 = (n) => String(n).padStart(3, "0");

// Linear resampling of mono audio to 16 kHz.
function to16k(input, rate) {
  if (rate === RATE) return new Float32Array(input);
  const ratio = rate / RATE;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const x = i * ratio, k = Math.floor(x), f = x - k;
    out[i] = input[k] * (1 - f) + (input[k + 1] ?? input[k]) * f;
  }
  return out;
}

export default function ReadingTest() {
  const [model, setModel] = useState("base");
  const [page, setPage] = useState(582);
  const [verses, setVerses] = useState([]); // [{ key, words: [{ text, plain, end }] }]
  const [phase, setPhase] = useState("idle"); // idle | loading | ready | listening
  const [progress, setProgress] = useState(null);
  const [info, setInfo] = useState({ backend: "—", loadMs: null, lastMs: null, seconds: 0 });
  const [heardText, setHeardText] = useState("");
  const [error, setError] = useState("");
  const [skipThird, setSkipThird] = useState(false);

  const worker = useRef(null);
  const audio = useRef({ chunks: [], length: 0, segStart: 0, committed: "", busy: false, ctx: null, stop: null, timer: null });
  const lastWrong = useRef(0);

  // The page's words, from quran.com (plain spelling for matching, Uthmani to show).
  useEffect(() => {
    let live = true;
    setVerses([]);
    fetch(`${API}/${page}?words=true&per_page=all&mushaf=1&word_fields=text_uthmani,text_imlaei_simple`)
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        setVerses(d.verses.map((v) => ({
          key: v.verse_key,
          words: v.words.map((w) => ({ key: `${v.verse_key}:${w.position}`, plain: normalizeArabic(w.text_imlaei_simple || w.text_uthmani), end: w.char_type_name === "end" })),
        })));
      })
      .catch(() => live && setError("Couldn't load the page text. Check the internet connection."));
    return () => { live = false; };
  }, [page]);

  useEffect(() => () => { worker.current?.terminate(); stopAudio(); }, []);

  const expected = useMemo(() => verses.flatMap((v) => v.words.filter((w) => !w.end).map((w) => w.plain)), [verses]);
  const result = useMemo(() => alignRecitation(splitWords(heardText), expected), [heardText, expected]);
  const counts = useMemo(() => ({
    ok: result.status.filter((s) => s === "ok").length,
    wrong: result.status.filter((s) => s === "wrong").length,
    skipped: result.status.filter((s) => s === "skipped").length,
  }), [result]);

  // A new mistake: a short vibration (phones that support it).
  useEffect(() => {
    if (counts.wrong + counts.skipped > lastWrong.current) navigator.vibrate?.(150);
    lastWrong.current = counts.wrong + counts.skipped;
  }, [counts]);

  const loadModel = () => {
    setError("");
    worker.current?.terminate();
    const w = new Worker(new URL("./asrWorker.js", import.meta.url), { type: "module" });
    worker.current = w;
    setPhase("loading");
    setProgress(null);
    w.onmessage = (e) => {
      const m = e.data;
      if (m.type === "progress") setProgress(m);
      else if (m.type === "ready") { setInfo((i) => ({ ...i, backend: m.backend, loadMs: m.ms })); setPhase("ready"); }
      else if (m.type === "result") onResult(m);
      else if (m.type === "error") { setError(m.message); audio.current.busy = false; setPhase((p) => (p === "loading" ? "idle" : p)); }
    };
    w.postMessage({ type: "load", model });
  };

  // All audio heard so far, from a sample index on.
  const audioFrom = (start) => {
    const a = audio.current;
    const out = new Float32Array(a.length - start);
    let pos = 0, at = 0;
    for (const c of a.chunks) {
      const s = Math.max(0, start - at), e = c.length;
      if (s < e) { out.set(c.subarray(s, e), pos); pos += e - s; }
      at += c.length;
    }
    return out;
  };

  // Every couple of seconds: transcribe the current part; a long part is
  // finished off and the next one begins.
  const tick = (final = false) => {
    const a = audio.current;
    if (a.busy || !worker.current) return;
    const len = a.length - a.segStart;
    if (len < RATE * 0.5) return;
    const closing = final || len > RATE * SEGMENT_S;
    const all = audioFrom(a.segStart);
    // Closing a long part: end it at the quietest 0.3 s from 16 s on.
    let cut = all.length;
    if (closing && !final) {
      const win = Math.round(RATE * 0.3), from = RATE * 16;
      let best = Infinity;
      for (let s = from; s + win <= all.length; s += Math.round(win / 3)) {
        let e = 0;
        for (let k = s; k < s + win; k += 4) e += all[k] * all[k];
        if (e < best) { best = e; cut = s + Math.round(win / 2); }
      }
    }
    a.busy = true;
    a.pending = { closing, end: a.segStart + cut };
    worker.current.postMessage({ type: "transcribe", id: Date.now(), audio: all.slice(0, cut) });
  };

  const onResult = (m) => {
    const a = audio.current;
    a.busy = false;
    const { closing, end } = a.pending || {};
    if (closing) { a.committed = `${a.committed} ${m.text}`.trim(); a.segStart = end; setHeardText(a.committed); }
    else setHeardText(`${a.committed} ${m.text}`.trim());
    setInfo((i) => ({ ...i, lastMs: m.ms }));
  };

  const resetHeard = () => {
    audio.current = { chunks: [], length: 0, segStart: 0, committed: "", busy: false, ctx: null, stop: null, timer: null };
    lastWrong.current = 0;
    setHeardText("");
    setInfo((i) => ({ ...i, seconds: 0, lastMs: null }));
  };

  // Feeds audio from any source node into the 16 kHz buffer.
  const capture = (ctx, source) => {
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    const mute = ctx.createGain();
    mute.gain.value = 0;
    proc.onaudioprocess = (e) => {
      const chunk = to16k(e.inputBuffer.getChannelData(0), ctx.sampleRate);
      const a = audio.current;
      a.chunks.push(chunk);
      a.length += chunk.length;
      setInfo((i) => ({ ...i, seconds: Math.round(a.length / RATE) }));
    };
    source.connect(proc);
    proc.connect(mute);
    mute.connect(ctx.destination);
    return () => { try { source.disconnect(); proc.disconnect(); } catch { /* already */ } };
  };

  const startListening = async (useSample) => {
    setError("");
    resetHeard();
    try {
      const ctx = new AudioContext();
      audio.current.ctx = ctx;
      let stopSource;
      if (useSample) {
        // Mishary Alafasy, ayah by ayah (quran.com's audio), optionally leaving one out.
        const keys = verses.map((v) => v.key).filter((_, i) => !(skipThird && i === 2));
        const buffers = [];
        for (const k of keys) {
          const [s, a] = k.split(":").map(Number);
          const res = await fetch(`https://verses.quran.com/Alafasy/mp3/${pad3(s)}${pad3(a)}.mp3`);
          buffers.push(await ctx.decodeAudioData(await res.arrayBuffer()));
        }
        const total = buffers.reduce((n, b) => n + b.length, 0);
        const all = ctx.createBuffer(1, total, ctx.sampleRate);
        let at = 0;
        for (const b of buffers) { all.getChannelData(0).set(b.getChannelData(0), at); at += b.length; }
        const src = ctx.createBufferSource();
        src.buffer = all;
        src.connect(ctx.destination); // heard through the speaker too
        const unhook = capture(ctx, src);
        src.onended = () => stopListening();
        src.start();
        stopSource = () => { try { src.stop(); } catch { /* ended */ } unhook(); };
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
        const unhook = capture(ctx, ctx.createMediaStreamSource(stream));
        stopSource = () => { unhook(); stream.getTracks().forEach((t) => t.stop()); };
      }
      audio.current.stop = stopSource;
      audio.current.timer = setInterval(() => tick(false), EVERY_MS);
      setPhase("listening");
    } catch (e) {
      setError(e?.name === "NotAllowedError" ? "Microphone access was blocked. Allow it for this site and try again." : (e?.message || String(e)));
      stopAudio();
    }
  };

  function stopAudio() {
    const a = audio.current;
    clearInterval(a.timer);
    a.stop?.();
    a.ctx?.close().catch(() => {});
    a.stop = null; a.ctx = null; a.timer = null;
  }

  const stopListening = () => {
    stopAudio();
    setPhase("ready");
    // One last look at whatever is left.
    const waitAndFinish = () => (audio.current.busy ? setTimeout(waitAndFinish, 200) : tick(true));
    waitAndFinish();
  };

  // Each word's colour on the Mushaf: light red wrong, light orange skipped,
  // faded not reached yet; recited right stays as printed.
  const wordStyles = useMemo(() => {
    const styles = {};
    let wi = 0;
    for (const v of verses) for (const w of v.words) {
      if (w.end) continue;
      const st = result.status[wi++];
      if (st === "wrong") styles[w.key] = { background: "#FDE1E4", borderRadius: "0.15em" };
      else if (st === "skipped") styles[w.key] = { background: "#FFEBD5", borderRadius: "0.15em" };
      else if (st !== "ok") styles[w.key] = { opacity: 0.35 };
    }
    return styles;
  }, [verses, result]);

  const loaded = phase === "ready" || phase === "listening";
  return (
    <div className="rt">
      <style>{CSS}</style>
      <div className="rt-wrap">
        <div>
          <h1>Check my Reading — test</h1>
          <p className="rt-sub">Tests Tarteel's Quran speech model on this phone: how long it takes to load, how fast it listens, and how well it follows a recitation. Nothing is saved, and the recording never leaves this device.</p>
        </div>

        <div className="rt-card">
          <div className="rt-label">1 · Model</div>
          <div className="rt-row">
            <div className="rt-seg" role="group" aria-label="Model">
              <button type="button" aria-pressed={model === "base"} disabled={phase === "loading" || phase === "listening"} onClick={() => setModel("base")}>Base · more accurate</button>
              <button type="button" aria-pressed={model === "tiny"} disabled={phase === "loading" || phase === "listening"} onClick={() => setModel("tiny")}>Tiny · faster</button>
            </div>
            <button type="button" className="rt-btn rt-btn-main" disabled={phase === "loading" || phase === "listening"} onClick={loadModel}>
              <Download size={17} aria-hidden="true" />{loaded ? "Reload model" : "Load model"}
            </button>
          </div>
          {phase === "loading" && (
            <>
              <div className="rt-bar"><div style={{ width: progress ? `${Math.round((progress.loaded / progress.total) * 100)}%` : "3%" }} /></div>
              <p className="rt-sub">{progress ? `Downloading ${fmtMB(progress.loaded)} of ${fmtMB(progress.total)}… (only the first time)` : "Starting…"}</p>
            </>
          )}
        </div>

        <div className="rt-card">
          <div className="rt-label">2 · Listen</div>
          <div className="rt-row">
            <label className="rt-row" style={{ gap: 6, fontSize: 14, fontWeight: 600 }}>Mushaf page
              <input className="rt-input" type="number" min={1} max={604} value={page} disabled={phase === "listening"} onChange={(e) => setPage(Math.min(604, Math.max(1, +e.target.value || 1)))} />
            </label>
            {phase === "listening" ? (
              <button type="button" className="rt-btn rt-btn-stop" onClick={stopListening}><Square size={16} aria-hidden="true" />Stop</button>
            ) : (
              <>
                <button type="button" className="rt-btn rt-btn-main" disabled={!loaded || !verses.length} onClick={() => startListening(false)}><Mic size={17} aria-hidden="true" />Recite</button>
                <button type="button" className="rt-btn" disabled={!loaded || !verses.length} onClick={() => startListening(true)}><Play size={16} aria-hidden="true" />Sample recitation</button>
              </>
            )}
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#3B5A7A", marginTop: 10 }}>
            <input type="checkbox" checked={skipThird} disabled={phase === "listening"} onChange={(e) => setSkipThird(e.target.checked)} />
            Sample leaves out the 3rd ayah (to see skipped words)
          </label>
          {!loaded && <p className="rt-sub" style={{ marginTop: 8 }}>Load the model first.</p>}
        </div>

        {error && <div className="rt-err" role="alert">{error}</div>}

        <div className="rt-card">
          <div className="rt-stats">
            <div className="rt-stat"><small>Running on</small><b>{info.backend}</b></div>
            <div className="rt-stat"><small>Model ready in</small><b>{info.loadMs == null ? "—" : `${(info.loadMs / 1000).toFixed(1)} s`}</b></div>
            <div className="rt-stat"><small>Last check took</small><b>{info.lastMs == null ? "—" : `${(info.lastMs / 1000).toFixed(1)} s`}</b></div>
            <div className="rt-stat"><small>Heard so far</small><b>{info.seconds} s</b></div>
            <div className="rt-stat"><small>Right · wrong · skipped</small><b>{counts.ok} · <span style={{ color: "#B42318" }}>{counts.wrong}</span> · <span style={{ color: "#A86A00" }}>{counts.skipped}</span></b></div>
          </div>
        </div>

        <div className="rt-card">
          <div className="rt-label">Page {page}</div>
          <MushafPage page={page} wordStyles={wordStyles} />
          <div className="rt-key">
            <span><i style={{ background: "#1A1F36" }} />Recited right</span>
            <span><i style={{ background: "#FDE1E4" }} />Wrong word</span>
            <span><i style={{ background: "#FFEBD5" }} />Skipped</span>
            <span><i style={{ background: "#1A1F36", opacity: 0.35 }} />Not reached yet</span>
          </div>
        </div>

        <div className="rt-card">
          <div className="rt-label">What the model heard</div>
          <div className="rt-heard" lang="ar">{heardText || "—"}</div>
        </div>
      </div>
    </div>
  );
}
