// POST /api/dhivehi { texts: string[] } → { configured, texts: string[] }
//
// Puts exam remarks and comments into correct Dhivehi for the Dhivehi exam
// report: English is translated, Dhivehi typed in Latin letters is written in
// Thaana, and Thaana is tidied (spelling, spacing, Dhivehi punctuation).
// Uses Claude with the ANTHROPIC_API_KEY Worker secret. The caller must be a
// signed-in admin, teacher or staff member.

import Anthropic from "@anthropic-ai/sdk";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const MAX_TEXTS = 80;
const MAX_CHARS = 1500;

const SYSTEM = `You prepare a Quran memorisation (hifz) class's exam report for students and parents in the Maldives. You get a JSON list of remarks and comments a teacher wrote about a student's recitation. Return each one as correct, natural Dhivehi written in Thaana.

- English: translate it into Dhivehi.
- Dhivehi typed in Latin letters (e.g. "rangalhu kiyevi", "hifzu ragalhu"): write it in Thaana with correct spelling.
- Already in Thaana: keep the meaning and wording, and only fix spelling, fili (vowel signs), sukun, spacing and punctuation.
- Mixed text: make the whole remark Dhivehi.
- Use Dhivehi punctuation: "،" for commas, "؟" for question marks, "؛" for semicolons; keep "." as the full stop. No space before punctuation, one space after.
- Keep numbers as Western digits (1, 2, 3), and keep surah names and Arabic Quran words as they are usually written in Dhivehi.
- Keep the teacher's meaning. Do not add, soften or explain anything, and do not add greetings.
- A text that is only "—", a number or empty: return it unchanged.

Return exactly one output per input, in the same order.`;

const SCHEMA = {
  type: "object",
  properties: { texts: { type: "array", items: { type: "string" } } },
  required: ["texts"],
  additionalProperties: false,
};

export async function handleDhivehi(request, env) {
  if (request.method !== "POST") return json({ error: "POST only" }, 405);
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Not signed in" }, 401);

  const sb = (path) => fetch(`${env.SUPABASE_URL}${path}`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  const userRes = await sb("/auth/v1/user");
  if (!userRes.ok) return json({ error: "Not signed in" }, 401);
  const user = await userRes.json();
  const [profile] = await (await sb(`/rest/v1/profiles?id=eq.${user.id}&select=role`)).json();
  if (!["admin", "teacher", "staff"].includes(profile?.role)) return json({ error: "Not allowed" }, 403);

  const { texts } = await request.json().catch(() => ({}));
  if (!Array.isArray(texts) || texts.length > MAX_TEXTS || texts.some((s) => typeof s !== "string" || s.length > MAX_CHARS)) {
    return json({ error: "Bad texts" }, 400);
  }
  if (!env.ANTHROPIC_API_KEY) return json({ configured: false, texts });
  if (!texts.length) return json({ configured: true, texts });

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(texts) }],
    });
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return json({ error: "Translation failed" }, 502);
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const out = JSON.parse(text).texts;
    if (!Array.isArray(out) || out.length !== texts.length) return json({ error: "Translation failed" }, 502);
    return json({ configured: true, texts: out.map((s, i) => (typeof s === "string" && s.trim() ? s : texts[i])) });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "Claude API key is not valid" }, 502);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "Translator is busy, try again" }, 503);
    if (e instanceof Anthropic.APIError) return json({ error: `Translator error ${e.status}` }, 502);
    return json({ error: "Translation failed" }, 502);
  }
}
