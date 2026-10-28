// POST /api/push { notification_id } — pushes an in-app notification to its
// recipients' phones (Web Push, RFC 8291 aes128gcm + VAPID, RFC 8292), so it
// shows in the phone's notification center even when the app is closed.
//
// Like /api/email, the caller must be a signed-in admin and Supabase is
// called with their own token. The VAPID private key is the Worker secret
// VAPID_PRIVATE_JWK; its public half is VAPID_PUBLIC_KEY in wrangler.jsonc
// and src/notifications/push.js.

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

export async function handlePush(request, env, { json, sb }) {
  const configured = Boolean(env.VAPID_PRIVATE_JWK && env.VAPID_PUBLIC_KEY);
  const { action, notification_id } = await request.json().catch(() => ({}));
  if (action === "status") return json({ configured });
  if (action !== "send" || !/^[0-9a-f-]{36}$/.test(notification_id || "")) return json({ error: "Unknown action" }, 400);
  if (!configured) return json({ configured: false, sent: 0, devices: 0 });

  const [note] = await (await sb(`/rest/v1/notifications?id=eq.${notification_id}&select=title,body,send_in_app`)).json();
  if (!note?.send_in_app) return json({ configured: true, sent: 0, devices: 0 });
  const recipients = await (await sb(`/rest/v1/notification_recipients?notification_id=eq.${notification_id}&user_id=not.is.null&select=user_id,body`)).json();
  const bodyFor = new Map(recipients.map((r) => [r.user_id, r.body || note.body]));
  if (!bodyFor.size) return json({ configured: true, sent: 0, devices: 0 });

  const subs = await (await sb(`/rest/v1/push_subscriptions?user_id=in.(${[...bodyFor.keys()].join(",")})&select=id,user_id,endpoint,p256dh,auth`)).json();
  const { sent, gone } = await pushAll(subs, (s) => ({ title: note.title || "Aflaah Quran Class", body: bodyFor.get(s.user_id), tag: notification_id }), env);
  if (gone.length) await sb(`/rest/v1/push_subscriptions?id=in.(${gone.map((s) => s.id).join(",")})`, { method: "DELETE" });
  return json({ configured: true, sent, devices: subs.length });
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

// POST /api/admin-alert — called by the database (public.alert_admins, via
// pg_net) when a payment slip or review comes in. Body: { title, body, tag,
// url, subs: [{ endpoint, p256dh, auth }] }, header X-Alert-Secret.
export async function handleAdminAlert(request, env, json) {
  if (request.method !== "POST") return json({ error: "POST only" }, 405);
  if (!env.ALERT_SECRET || !sameSecret(request.headers.get("X-Alert-Secret"), env.ALERT_SECRET)) return json({ error: "Not allowed" }, 403);
  if (!env.VAPID_PRIVATE_JWK) return json({ configured: false, sent: 0 });
  const { title, body, tag, url, subs } = await request.json().catch(() => ({}));
  if (!Array.isArray(subs)) return json({ error: "No devices" }, 400);
  const { sent, gone } = await pushAll(subs.slice(0, 50), () => ({ title: title || "Aflaah Quran Class", body, tag, url }), env);
  if (gone.length) {
    await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/forget_push_endpoints`, {
      method: "POST",
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_secret: env.ALERT_SECRET, p_endpoints: gone.map((s) => s.endpoint) }),
    }).catch(() => {});
  }
  return json({ configured: true, sent });
}
