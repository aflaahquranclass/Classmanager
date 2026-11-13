import { test } from "node:test";
import assert from "node:assert/strict";

// Each test loads a fresh copy of the module, so "the Space is down" from one
// test doesn't carry into the next.
let n = 0;
const load = () => import(`../worker/recitation.js?fresh=${n++}`);

const wav = new Uint8Array(44 + 32000); // 1 s of silence
const post = () => new Request("http://localhost/api/recitation", { method: "POST", body: wav, headers: { Authorization: "Bearer student-sign-in" } });
const whisper = (text = "من ويسبر") => ({ calls: 0, async run() { this.calls++; return { text }; } });

function withFetch(fn) {
  const real = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, opts = {}) => { calls.push({ url: String(url), opts }); return fn(String(url), opts); };
  return { calls, restore: () => { globalThis.fetch = real; } };
}

test("the Space's text is used when it answers", async () => {
  const { handleRecitation } = await load();
  const f = withFetch(() => new Response(JSON.stringify({ text: " الذي خلق الموت " })));
  try {
    const AI = whisper();
    const res = await handleRecitation(post(), { AI, QURAN_ASR_URL: "https://x.hf.space/" });
    assert.deepEqual(await res.json(), { text: "الذي خلق الموت", engine: "nvidia-fastconformer" });
    assert.equal(AI.calls, 0);
    assert.equal(f.calls[0].url, "https://x.hf.space/transcribe");
    assert.equal(f.calls[0].opts.headers.Authorization, "Bearer student-sign-in", "the student's sign-in is passed on");
  } finally { f.restore(); }
});

test("Whisper hears it when the Space is asleep, and the Space is left alone for a while", async () => {
  const { handleRecitation } = await load();
  const f = withFetch(() => new Response("<html>Space is sleeping</html>", { status: 503 }));
  try {
    const AI = whisper();
    const env = { AI, QURAN_ASR_URL: "https://x.hf.space" };
    assert.deepEqual(await (await handleRecitation(post(), env)).json(), { text: "من ويسبر", engine: "whisper" });
    const tried = f.calls.filter((c) => c.url.endsWith("/transcribe")).length;
    await handleRecitation(post(), env);
    assert.equal(f.calls.filter((c) => c.url.endsWith("/transcribe")).length, tried, "not tried again straight away");
    assert.equal(AI.calls, 2);
  } finally { f.restore(); }
});

test("without a Space set up, only Whisper is used", async () => {
  const { handleRecitation } = await load();
  const f = withFetch(() => { throw new Error("no fetch expected"); });
  try {
    const res = await handleRecitation(post(), { AI: whisper() });
    assert.equal((await res.json()).engine, "whisper");
    assert.equal(f.calls.length, 0);
  } finally { f.restore(); }
});

test("GET wakes the Space and answers 204", async () => {
  const { handleRecitation } = await load();
  const f = withFetch(() => new Response(JSON.stringify({ ready: true })));
  try {
    const res = await handleRecitation(new Request("http://localhost/api/recitation"), { AI: whisper(), QURAN_ASR_URL: "https://x.hf.space" });
    assert.equal(res.status, 204);
    assert.equal(f.calls[0].url, "https://x.hf.space/");
  } finally { f.restore(); }
});
