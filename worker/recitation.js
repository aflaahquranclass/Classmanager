// POST /api/recitation — Check my Reading: what a student just recited, as text.
//
// Body: a WAV file (16 kHz mono) of up to ~30 s of recitation.
// Reply: { text, engine } — Arabic.
//
// Heard first by NVIDIA's Arabic FastConformer (CC-BY-4.0; trained partly on
// Quran recitation) on the class's Hugging Face Space (asr-server/;
// QURAN_ASR_URL; it checks the student's own sign-in too). When the Space is
// asleep, busy or not set up, Cloudflare Workers AI's Whisper hears it
// instead, so listening never stops.
//
// GET — no audio: checks the sign-in and opens the connection, so the first
// words of a recitation aren't slowed by it. Reply: 204.
//
// The phone sends a few seconds at a time while the student recites and
// compares the text with the Mushaf itself; nothing is stored here. The
// caller must be signed in to the app (any student, teacher or admin).
//
// Whisper: greedy decoding (one guess per word, not five): several times
// quicker, and the parts are short and clear enough not to need more.

const MODEL = "@cf/openai/whisper-large-v3-turbo";
const MAX_BYTES = 1_200_000; // ~37 s of 16 kHz 16-bit audio

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

// Recently checked sign-ins, so each few-second request isn't a round trip to Supabase.
const signedIn = new Map(); // token → expiry (ms)

async function isSignedIn(request, env) {
  const url = new URL(request.url);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true; // `wrangler dev` (demo mode)
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const until = signedIn.get(token);
  if (until && until > Date.now()) return true;
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
  if (!res.ok) return false;
  if (signedIn.size > 2000) signedIn.clear();
  signedIn.set(token, Date.now() + 5 * 60 * 1000);
  return true;
}

// The Space: how long to wait, and after a failure how long to use Whisper
// only (while it wakes up) before trying it again.
const SPACE_TIMEOUT_MS = 3000;
const SPACE_RETRY_MS = 20_000;
let spaceDownUntil = 0;

const spaceUrl = (env) => (env.QURAN_ASR_URL || "").replace(/\/$/, "");

// The Space's text, or null when it can't answer now.
async function fromSpace(env, audio, auth) {
  if (!spaceUrl(env) || Date.now() < spaceDownUntil) return null;
  try {
    const res = await fetch(`${spaceUrl(env)}/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "audio/wav", ...(auth ? { Authorization: auth } : {}) },
      body: audio,
      signal: AbortSignal.timeout(SPACE_TIMEOUT_MS),
    });
    const out = res.ok ? await res.json().catch(() => null) : null;
    if (typeof out?.text === "string") return out.text.trim();
  } catch { /* asleep, busy or unreachable */ }
  spaceDownUntil = Date.now() + SPACE_RETRY_MS;
  wakeSpace(env);
  return null;
}

// A plain visit wakes a sleeping Space; the reply isn't needed.
function wakeSpace(env) {
  if (!spaceUrl(env)) return Promise.resolve();
  return fetch(`${spaceUrl(env)}/`, { signal: AbortSignal.timeout(1500) }).catch(() => {});
}

function toBase64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function handleRecitation(request, env) {
  if (request.method !== "POST" && request.method !== "GET") return json({ error: "POST only" }, 405);
  if (!env.AI) return json({ error: "Listening isn't set up on the server." }, 503);
  if (!(await isSignedIn(request, env))) return json({ error: "Not signed in" }, 401);
  if (request.method === "GET") { await wakeSpace(env); return new Response(null, { status: 204 }); }
  const audio = new Uint8Array(await request.arrayBuffer());
  if (!audio.length) return json({ text: "" });
  if (audio.length > MAX_BYTES) return json({ error: "Too long" }, 413);
  const heard = await fromSpace(env, audio, request.headers.get("Authorization"));
  if (heard != null) return json({ text: heard, engine: "nvidia-fastconformer" });
  try {
    const out = await env.AI.run(MODEL, { audio: toBase64(audio), task: "transcribe", language: "ar", vad_filter: false, beam_size: 1, condition_on_previous_text: false });
    return json({ text: (out?.text || "").trim(), engine: "whisper" });
  } catch (e) {
    return json({ error: "Couldn't listen just now." }, 502);
  }
}
