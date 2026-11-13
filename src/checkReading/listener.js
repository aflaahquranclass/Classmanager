import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient.js";
import { makeVad, frameRms } from "./vad.js";

// Check my Reading: the listening engine. While the student recites, the
// microphone is read at 16 kHz and sent to the app's server (/api/recitation,
// Whisper on Cloudflare), which sends back the words it heard. Nothing to
// download on the phone.
//
// Kept fast by sending little audio: the recitation is cut into parts at the
// student's own pauses (a breath, the end of an ayah), so each part is a few
// seconds long. A finished part is sent once and kept; the part being recited
// is sent about every second so the words show up while the student goes.
// Silence is never sent, and a part waiting on the server doesn't hold up the next.

const RATE = 16000;
const FRAME = 320; // 20 ms, for telling voice from quiet
const TICK_MS = 200;
const LIVE_MS = 900; // the part being recited, sent at most this often
const PAUSE_S = 0.4; // this much quiet after speech ends a part (words in one breath are < 0.2 s apart)
const MIN_VOICE_S = 1.0; // …once it has this much speech
const MAX_PART_S = 8; // a part with no pause ends at its quietest moment after 4 s
const PAD_S = 0.2; // quiet kept on each side of a part

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

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function transcribe(samples) {
  const res = await fetch("/api/recitation", {
    method: "POST",
    headers: { "Content-Type": "audio/wav", ...(await authHeader()) },
    body: toWav(samples),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || "Couldn't listen just now.");
  return out.text || "";
}

// Opens the connection and checks the sign-in before the first words, so the
// first part isn't slowed by them.
async function warmUp() {
  try { await fetch("/api/recitation", { method: "GET", headers: await authHeader() }); } catch { /* the first part will try again */ }
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

  const fresh = () => ({
    chunks: [], base: 0, length: 0, // audio from sample `base` on (16 kHz)
    rest: new Float32Array(0), // samples not yet in a whole frame
    voice: [], // per 20 ms frame: 1 voice, 0 quiet
    rms: [], // per frame, for finding the quietest moment
    isVoice: makeVad(),
    partStart: 0, // first sample of the part being recited
    parts: [], // finished parts in order: text, or null while on the server
    live: null, // { part, seq, text }: what was heard of the part being recited
    liveSeq: 0, liveBusy: false, liveAt: 0, liveSentTo: 0,
    ctx: null, stop: null, timer: null,
  });
  if (!a.current) a.current = fresh();

  const audio = (s, from, to) => {
    const out = new Float32Array(Math.max(0, to - from));
    let at = s.base;
    for (const c of s.chunks) {
      const end = at + c.length;
      if (end > from && at < to) out.set(c.subarray(Math.max(0, from - at), Math.min(c.length, to - at)), Math.max(0, at - from));
      if (end >= to) break;
      at = end;
    }
    return out;
  };

  // The finished parts that are back from the server, in order (stopping at
  // one still on its way, so no words go missing in between), then the part
  // being recited.
  const show = (s) => {
    if (a.current !== s) return;
    const out = [];
    for (const t of s.parts) { if (t == null) return; out.push(t); } // shown once it's back
    if (s.live && s.live.part === s.parts.length) out.push(s.live.text);
    setHeard(out.join(" ").replace(/\s+/g, " ").trim());
  };

  // New audio: frames marked as voice or quiet.
  const take = (s, chunk) => {
    s.chunks.push(chunk);
    s.length += chunk.length;
    const buf = new Float32Array(s.rest.length + chunk.length);
    buf.set(s.rest); buf.set(chunk, s.rest.length);
    let i = 0;
    for (; i + FRAME <= buf.length; i += FRAME) {
      const r = frameRms(buf, i, FRAME);
      s.voice.push(s.isVoice(r) ? 1 : 0);
      s.rms.push(r);
    }
    s.rest = buf.slice(i);
  };

  const frameOf = (sample) => Math.floor(sample / FRAME);
  const voiceIn = (s, from, to) => { let n = 0; for (let f = frameOf(from); f < Math.min(s.voice.length, frameOf(to)); f++) n += s.voice[f]; return n * FRAME / RATE; };
  const lastVoiceEnd = (s, from) => { for (let f = s.voice.length - 1; f >= frameOf(from); f--) if (s.voice[f]) return (f + 1) * FRAME; return -1; };

  // A finished part: sent once (tried twice), its text kept in its place.
  const finish = (s, from, to) => {
    const idx = s.parts.length;
    s.parts.push(null);
    s.partStart = to;
    s.live = null;
    const samples = audio(s, from, to);
    const send = (tries) => transcribe(samples).then((text) => {
      if (a.current !== s) return;
      s.parts[idx] = text;
      setError("");
      show(s);
    }).catch((e) => {
      if (a.current !== s) return;
      if (tries > 1) return setTimeout(() => send(tries - 1), 400);
      s.parts[idx] = "";
      setError(e.message);
      show(s);
    });
    send(2);
  };

  const tick = (final) => {
    const s = a.current;
    // Audio more than a second before the part being recited isn't needed again.
    while (s.chunks.length > 1 && s.base + s.chunks[0].length < s.partStart - RATE) s.base += s.chunks.shift().length;
    const end = s.length;
    let start = s.partStart;
    const lastVoice = lastVoiceEnd(s, start);
    // Nothing said yet in this part: drop the quiet before it.
    if (lastVoice < 0) {
      s.partStart = Math.max(start, end - Math.round(PAD_S * RATE));
      return;
    }
    // Start the part just before its first voice.
    for (let f = frameOf(start); f < s.voice.length; f++) if (s.voice[f]) { start = Math.max(start, f * FRAME - Math.round(PAD_S * RATE)); break; }
    s.partStart = start;
    const voiced = voiceIn(s, start, end);
    const quiet = (end - lastVoice) / RATE;

    if (final) { if (voiced >= 0.15) finish(s, start, Math.min(end, lastVoice + Math.round(PAD_S * RATE))); return; }
    // A pause after enough speech: the part ends in the pause.
    if (voiced >= MIN_VOICE_S && quiet >= PAUSE_S) { finish(s, start, lastVoice + Math.round(PAD_S * RATE)); return; }
    // A long part with no pause: end it at its quietest 0.3 s after 4 s, so no word is cut.
    if (end - start > MAX_PART_S * RATE) {
      const win = Math.round(0.3 * RATE / FRAME);
      let best = Infinity, cutFrame = frameOf(end);
      const from = frameOf(start + 4 * RATE), to = s.rms.length - win;
      for (let f = from; f <= to; f++) {
        let e = 0;
        for (let k = f; k < f + win; k++) e += s.rms[k];
        if (e < best) { best = e; cutFrame = f + Math.floor(win / 2); }
      }
      finish(s, start, cutFrame * FRAME);
      return;
    }
    // The part being recited, about every second while there's new speech.
    const now = performance.now();
    if (!s.liveBusy && now - s.liveAt >= LIVE_MS && voiced >= 0.3 && lastVoice > s.liveSentTo) {
      s.liveBusy = true; s.liveAt = now; s.liveSentTo = lastVoice;
      const part = s.parts.length, seq = ++s.liveSeq;
      transcribe(audio(s, start, end))
        .then((text) => {
          if (a.current !== s || s.parts.length !== part || (s.live && s.live.seq > seq)) return; // that part has ended
          s.live = { part, seq, text };
          setError("");
          show(s);
        })
        .catch((e) => { if (a.current === s) setError(e.message); })
        .finally(() => { s.liveBusy = false; });
    }
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
    warmUp();
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
      const proc = ctx.createScriptProcessor(2048, 1, 1);
      const mute = ctx.createGain();
      mute.gain.value = 0;
      const s = a.current;
      proc.onaudioprocess = (e) => { if (a.current === s) take(s, to16k(e.inputBuffer.getChannelData(0), ctx.sampleRate)); };
      source.connect(proc); proc.connect(mute); mute.connect(ctx.destination);
      s.ctx = ctx;
      s.stop = () => { try { source.stop?.(); } catch { /* ended */ } try { source.disconnect(); proc.disconnect(); } catch { /* done */ } stream?.getTracks().forEach((t) => t.stop()); };
      s.timer = setInterval(() => tick(false), TICK_MS);
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
    tick(true);
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
