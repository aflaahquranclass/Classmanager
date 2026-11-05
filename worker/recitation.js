// POST /api/recitation — Check my Reading: what a student just recited, as text.
//
// Body: a WAV file (16 kHz mono) of up to ~30 s of recitation.
// Reply: { text } — Arabic, from Cloudflare Workers AI's Whisper model.
//
// The phone sends a few seconds at a time while the student recites and
// compares the text with the Mushaf itself; nothing is stored here. The
// caller must be signed in to the app (any student, teacher or admin).

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

function toBase64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function handleRecitation(request, env) {
  if (request.method !== "POST") return json({ error: "POST only" }, 405);
  if (!env.AI) return json({ error: "Listening isn't set up on the server." }, 503);
  if (!(await isSignedIn(request, env))) return json({ error: "Not signed in" }, 401);
  const audio = new Uint8Array(await request.arrayBuffer());
  if (!audio.length) return json({ text: "" });
  if (audio.length > MAX_BYTES) return json({ error: "Too long" }, 413);
  try {
    const out = await env.AI.run(MODEL, { audio: toBase64(audio), task: "transcribe", language: "ar", vad_filter: false });
    return json({ text: (out?.text || "").trim() });
  } catch (e) {
    return json({ error: "Couldn't listen just now." }, 502);
  }
}
