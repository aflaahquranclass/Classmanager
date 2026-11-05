import { useEffect, useRef, useState } from "react";

// Check my Reading: the listening engine. One copy of Tarteel's Quran speech
// model (see readingTest/asrWorker.js) runs in a background worker for the
// whole portal; it is downloaded once (~100–180 MB, kept by the browser) and
// loaded again in seconds after that. The microphone is read at 16 kHz and
// re-checked every couple of seconds; long recitations are split at pauses.

const RATE = 16000;
const EVERY_MS = 2000;
const SEGMENT_S = 22; // the model hears up to 30 s at once
const READY_KEY = "aqc_reading_model_ready"; // the model was downloaded on this device before

const model = { worker: null, backend: "", loading: null, onProgress: null, onResult: null };

export const modelDownloadedBefore = () => { try { return localStorage.getItem(READY_KEY) === "1"; } catch { return false; } };
export const modelReady = () => !!model.backend;

// Loads the model (once). onProgress({ loaded, total }) while downloading.
export function loadModel(onProgress) {
  model.onProgress = onProgress || null;
  if (model.backend) return Promise.resolve(model.backend);
  if (model.loading) return model.loading;
  model.loading = new Promise((resolve, reject) => {
    const w = new Worker(new URL("../readingTest/asrWorker.js", import.meta.url), { type: "module" });
    model.worker = w;
    w.onmessage = (e) => {
      const m = e.data;
      if (m.type === "progress") model.onProgress?.(m);
      else if (m.type === "ready") {
        model.backend = m.backend;
        try { localStorage.setItem(READY_KEY, "1"); } catch { /* private mode */ }
        resolve(m.backend);
      } else if (m.type === "result") model.onResult?.(m);
      else if (m.type === "error") {
        if (!model.backend) { model.loading = null; w.terminate(); model.worker = null; reject(new Error(m.message)); }
        else model.onResult?.({ error: m.message });
      }
    };
    w.postMessage({ type: "load", model: "base" });
  });
  return model.loading;
}

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

// Listening to one recitation. heard: everything the model has heard so far.
export function useRecitation() {
  const [heard, setHeard] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const a = useRef(null);

  const fresh = () => ({ chunks: [], length: 0, segStart: 0, committed: "", busy: false, pending: null, ctx: null, stop: null, timer: null });
  if (!a.current) a.current = fresh();

  const audioFrom = (start) => {
    const s = a.current;
    const out = new Float32Array(s.length - start);
    let pos = 0, at = 0;
    for (const c of s.chunks) {
      const from = Math.max(0, start - at);
      if (from < c.length) { out.set(c.subarray(from), pos); pos += c.length - from; }
      at += c.length;
    }
    return out;
  };

  const tick = (final) => {
    const s = a.current;
    if (s.busy || !model.worker) return;
    const len = s.length - s.segStart;
    if (len < RATE * 0.5) return;
    const closing = final || len > RATE * SEGMENT_S;
    const all = audioFrom(s.segStart);
    // A long part ends at the quietest 0.3 s from 16 s on, so no word is cut.
    let cut = all.length;
    if (closing && !final) {
      const win = Math.round(RATE * 0.3);
      let best = Infinity;
      for (let i = RATE * 16; i + win <= all.length; i += Math.round(win / 3)) {
        let e = 0;
        for (let k = i; k < i + win; k += 4) e += all[k] * all[k];
        if (e < best) { best = e; cut = i + Math.round(win / 2); }
      }
    }
    s.busy = true;
    s.pending = { closing, end: s.segStart + cut };
    model.worker.postMessage({ type: "transcribe", id: Date.now(), audio: all.slice(0, cut) });
  };

  useEffect(() => {
    model.onResult = (m) => {
      const s = a.current;
      s.busy = false;
      if (m.error) return;
      const { closing, end } = s.pending || {};
      if (closing) { s.committed = `${s.committed} ${m.text}`.trim(); s.segStart = end; setHeard(s.committed); }
      else setHeard(`${s.committed} ${m.text}`.trim());
    };
    return () => { model.onResult = null; release(); };
  }, []);

  function release() {
    const s = a.current;
    clearInterval(s.timer);
    s.stop?.();
    s.ctx?.close().catch(() => {});
    s.stop = null; s.ctx = null; s.timer = null;
  }

  // sampleAyahs (demo only): ["78:1", …] plays Mishary Alafasy reciting them
  // instead of using the microphone.
  const start = async (sampleAyahs = null) => {
    setError("");
    release();
    a.current = fresh();
    setHeard("");
    try {
      const ctx = new AudioContext();
      let source, stream = null;
      if (sampleAyahs) {
        const pad = (n) => String(n).padStart(3, "0");
        const buffers = [];
        for (const k of sampleAyahs) {
          const [su, ay] = k.split(":").map(Number);
          const res = await fetch(`https://verses.quran.com/Alafasy/mp3/${pad(su)}${pad(ay)}.mp3`);
          buffers.push(await ctx.decodeAudioData(await res.arrayBuffer()));
        }
        const all = ctx.createBuffer(1, buffers.reduce((n, b) => n + b.length, 0), ctx.sampleRate);
        let at = 0;
        for (const b of buffers) { all.getChannelData(0).set(b.getChannelData(0), at); at += b.length; }
        source = ctx.createBufferSource();
        source.buffer = all;
        source.connect(ctx.destination);
        source.onended = () => stop();
        source.start();
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
        source = ctx.createMediaStreamSource(stream);
      }
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      const mute = ctx.createGain();
      mute.gain.value = 0;
      proc.onaudioprocess = (e) => {
        const chunk = to16k(e.inputBuffer.getChannelData(0), ctx.sampleRate);
        a.current.chunks.push(chunk);
        a.current.length += chunk.length;
      };
      source.connect(proc); proc.connect(mute); mute.connect(ctx.destination);
      const s = a.current;
      s.ctx = ctx;
      s.stop = () => { try { source.stop?.(); } catch { /* ended */ } try { source.disconnect(); proc.disconnect(); } catch { /* done */ } stream?.getTracks().forEach((t) => t.stop()); };
      s.timer = setInterval(() => tick(false), EVERY_MS);
      setListening(true);
    } catch (e) {
      setError(e?.name === "NotAllowedError" ? "Allow the microphone for this app to check your reading." : "Couldn't start the microphone.");
      release();
    }
  };

  function stop() {
    if (!a.current.timer && !a.current.stop) return;
    release();
    setListening(false);
    const finish = () => (a.current.busy ? setTimeout(finish, 200) : tick(true));
    finish();
  }

  return { heard, listening, error, start, stop };
}

// A short buzz for a mistake; a soft tone where phones can't vibrate (iPhone).
export function mistakeSignal() {
  if (navigator.vibrate?.(140)) return;
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 220;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.2);
    o.onended = () => ctx.close();
  } catch { /* no audio */ }
}
