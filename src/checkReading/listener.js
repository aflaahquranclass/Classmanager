import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient.js";

// Check my Reading: the listening engine. While the student recites, the
// microphone is read at 16 kHz and every couple of seconds the recitation so
// far is sent to the app's server (/api/recitation, Whisper on Cloudflare),
// which sends back the words it heard. Nothing to download on the phone.
// Long recitations are sent in parts, split at pauses.

const RATE = 16000;
const EVERY_MS = 2000;
const SEGMENT_S = 22; // Whisper hears up to 30 s at once

// 16 kHz mono samples → a WAV file (16-bit PCM).
function toWav(samples) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); str(8, "WAVE");
  str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return buf;
}

async function transcribe(samples) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const res = await fetch("/api/recitation", {
    method: "POST",
    headers: { "Content-Type": "audio/wav", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: toWav(samples),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || "Couldn't listen just now.");
  return out.text || "";
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

  const fresh = () => ({ chunks: [], length: 0, segStart: 0, committed: "", busy: false, ctx: null, stop: null, timer: null });
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
    if (s.busy) return;
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
    const end = s.segStart + cut;
    transcribe(all.slice(0, cut))
      .then((text) => {
        const cur = a.current;
        if (cur !== s) return; // a new recitation started meanwhile
        if (closing) { s.committed = `${s.committed} ${text}`.trim(); s.segStart = end; setHeard(s.committed); }
        else setHeard(`${s.committed} ${text}`.trim());
        setError("");
      })
      .catch((e) => { if (a.current === s) setError(e.message); })
      .finally(() => { s.busy = false; });
  };

  useEffect(() => () => release(), []);

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
