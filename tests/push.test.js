import { test } from "node:test";
import assert from "node:assert/strict";
import { encrypt, vapidAuth, handlePushOut } from "../worker/push.js";

const { subtle } = globalThis.crypto;
const b64u = (b) => Buffer.from(b).toString("base64url");
const hkdf = async (salt, ikm, info, len) => new Uint8Array(await subtle.deriveBits(
  { name: "HKDF", hash: "SHA-256", salt, info }, await subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]), len * 8));

// Decrypts as the phone's browser would (RFC 8291).
async function decrypt(body, uaKeys, uaPublic, authSecret) {
  const salt = body.slice(0, 16);
  const idlen = body[20];
  const asPublic = body.slice(21, 21 + idlen);
  const asKey = await subtle.importKey("raw", asPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await subtle.deriveBits({ name: "ECDH", public: asKey }, uaKeys.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]), 32);
  const cek = await hkdf(salt, ikm, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, Buffer.from("Content-Encoding: nonce\0"), 12);
  const key = await subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  const plain = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, body.slice(21 + idlen)));
  assert.equal(plain[plain.length - 1], 2, "last-record delimiter");
  return Buffer.from(plain.slice(0, -1)).toString();
}

test("push payload decrypts on the device", async () => {
  const uaKeys = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const uaPublic = new Uint8Array(await subtle.exportKey("raw", uaKeys.publicKey));
  const authSecret = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const message = JSON.stringify({ title: "ކްލާސް", body: "No class tomorrow." });
  const body = await encrypt(message, b64u(uaPublic), b64u(authSecret));
  assert.equal(await decrypt(body, uaKeys, uaPublic, authSecret), message);
});

test("VAPID header is a valid ES256 token for the push service", async () => {
  const keys = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await subtle.exportKey("jwk", keys.privateKey);
  const pub = b64u(await subtle.exportKey("raw", keys.publicKey));
  const header = await vapidAuth("https://fcm.googleapis.com/fcm/send/abc", { VAPID_PRIVATE_JWK: JSON.stringify(jwk), VAPID_PUBLIC_KEY: pub });
  const [, token, k] = header.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.equal(k, pub);
  const [h, c, s] = token.split(".");
  assert.equal(JSON.parse(Buffer.from(c, "base64url")).aud, "https://fcm.googleapis.com");
  assert.ok(await subtle.verify({ name: "ECDSA", hash: "SHA-256" }, keys.publicKey, Buffer.from(s, "base64url"), Buffer.from(`${h}.${c}`)));
});

test("database pushes need the shared secret and reach each device", async () => {
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status });
  const vapid = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
  const env = {
    ALERT_SECRET: "s3cret", SUPABASE_URL: "https://db.test", SUPABASE_ANON_KEY: "anon",
    VAPID_PRIVATE_JWK: JSON.stringify(await subtle.exportKey("jwk", vapid.privateKey)),
    VAPID_PUBLIC_KEY: b64u(await subtle.exportKey("raw", vapid.publicKey)),
  };
  const uaKeys = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const p256dh = b64u(await subtle.exportKey("raw", uaKeys.publicKey));
  const auth = b64u(globalThis.crypto.getRandomValues(new Uint8Array(16)));
  const req = (secret) => new Request("https://aflaahqc.com/api/push-out", {
    method: "POST", headers: { "X-Alert-Secret": secret },
    body: JSON.stringify({ messages: [
      { endpoint: "https://push.test/live", p256dh, auth, title: "New review", body: "5 stars" },
      { endpoint: "https://push.test/gone", p256dh, auth, title: "New review", body: "5 stars" }] }),
  });

  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), body: init.body }); return new Response(null, { status: String(url).endsWith("/gone") ? 410 : 201 }); };
  try {
    assert.equal((await handlePushOut(req("wrong"), env, json)).status, 403);
    assert.equal(calls.length, 0);
    const res = await (await handlePushOut(req("s3cret"), env, json)).json();
    assert.equal(res.sent, 1);
    const forget = calls.find((c) => c.url.endsWith("/rpc/forget_push_endpoints"));
    assert.deepEqual(JSON.parse(forget.body).p_endpoints, ["https://push.test/gone"]);
  } finally {
    globalThis.fetch = realFetch;
  }
});
