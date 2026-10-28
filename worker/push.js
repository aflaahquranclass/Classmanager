// POST /api/push-out — sends phone notifications (Web Push, RFC 8291
// aes128gcm + VAPID, RFC 8292), so they show in the phone's notification
// center even when the app is closed.
//
// Only the database calls it: whenever in-app notifications are saved (from
// any screen, or an admin alert for a new slip / review), the trigger
// public.push_new_notifications posts the ready messages here via pg_net with
// the shared secret ALERT_SECRET (Vault 'admin_alert_secret'). The VAPID
// private key is the Worker secret VAPID_PRIVATE_JWK; its public half is
// VAPID_PUBLIC_KEY in wrangler.jsonc and src/notifications/push.js.

const enc = new TextEncoder();
const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
};

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8));
}

// The message body, encrypted for one device (single aes128gcm record).
export async function encrypt(payload, p256dh, authSecret) {
  const uaPublic = fromB64u(p256dh);
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));

  const ikm = await hkdf(fromB64u(authSecret), shared, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, concat(enc.encode(payload), new Uint8Array([2]))));
  const header = new Uint8Array(21);
  new DataView(header.buffer).setUint32(16, 4096);
  header.set(salt, 0);
  header[20] = asPublic.length;
  return concat(header, asPublic, cipher);
}

export async function vapidAuth(endpoint, env) {
  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  const key = await crypto.subtle.importKey("jwk", { ...jwk, key_ops: ["sign"] }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: `mailto:${env.EMAIL_FROM || "noreply@aflaahqc.com"}`,
  })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${head}.${claims}`));
  return `vapid t=${head}.${claims}.${b64u(sig)}, k=${env.VAPID_PUBLIC_KEY}`;
}

// Resolves to the push service's HTTP status.
async function pushTo(sub, payload, env) {
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuth(sub.endpoint, env),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(4 * 24 * 3600),
      Urgency: "high",
    },
    body: await encrypt(payload, sub.p256dh, sub.auth),
  });
  return res.status;
}

// Sends message(sub) to every device; { sent, gone } where gone are devices
// the push service no longer knows (the app was removed or blocked).
async function pushAll(subs, message, env) {
  const gone = [];
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    const m = message(s);
    // "/login" opens the signed-in portal on every address (on aflaahqc.com "/" is the website).
    const payload = JSON.stringify({ url: "/login", ...m, body: String(m.body || "").slice(0, 1000) });
    try {
      const status = await pushTo(s, payload, env);
      if (status === 404 || status === 410) gone.push(s);
      else if (status < 300) sent += 1;
    } catch { /* one bad device never stops the rest */ }
  }));
  return { sent, gone };
}

const sameSecret = (a, b) => typeof a === "string" && typeof b === "string" && a.length === b.length
  && [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

// Body: { messages: [{ endpoint, p256dh, auth, title, body, tag, url? }] },
// header X-Alert-Secret.
export async function handlePushOut(request, env, json) {
  if (request.method !== "POST") return json({ error: "POST only" }, 405);
  if (!env.ALERT_SECRET || !sameSecret(request.headers.get("X-Alert-Secret"), env.ALERT_SECRET)) return json({ error: "Not allowed" }, 403);
  if (!env.VAPID_PRIVATE_JWK) return json({ configured: false, sent: 0 });
  const { messages } = await request.json().catch(() => ({}));
  if (!Array.isArray(messages)) return json({ error: "No messages" }, 400);
  const { sent, gone } = await pushAll(messages.slice(0, 500), (m) => ({
    title: m.title || "Aflaah Quran Class", body: m.body, tag: m.tag, ...(m.url ? { url: m.url } : {}),
  }), env);
  if (gone.length) {
    await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/forget_push_endpoints`, {
      method: "POST",
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_secret: env.ALERT_SECRET, p_endpoints: [...new Set(gone.map((s) => s.endpoint))] }),
    }).catch(() => {});
  }
  return json({ configured: true, sent, devices: messages.length });
}
