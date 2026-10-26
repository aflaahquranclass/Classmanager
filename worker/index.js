// The site's Cloudflare Worker. Static files (dist/) are served by the assets
// binding; only /api/* runs this code (see run_worker_first in wrangler.jsonc).
//
// POST /api/email  { action: "status" }                      → is email set up?
//                  { action: "send", notification_id: uuid } → send its pending emails
//
// Emails go out through Cloudflare Email Service (the EMAIL send_email
// binding). The caller must be a signed-in admin: the Worker checks their
// Supabase login and reads/updates the notification with their own token, so
// row-level security still applies and no Supabase secret is stored here.

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const hasThaana = (s) => /[ހ-޿]/.test(s || "");
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || "");

function emailHtml(subject, body, siteUrl) {
  const dv = hasThaana(subject + body);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>@font-face{font-family:Faruma;src:url(${siteUrl}/fonts/Faruma.ttf) format("truetype");}</style></head>
<body style="margin:0;background:#EEF6FA;padding:24px 12px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #C7DDF4;border-radius:16px;overflow:hidden;">
<tr><td style="background:linear-gradient(90deg,#0D4F85,#0A94B1);background-color:#0875A2;color:#FFFFFF;padding:18px 24px;font-size:17px;font-weight:700;">Aflaah Quran Class</td></tr>
<tr><td dir="${dv ? "rtl" : "ltr"}" style="padding:24px;color:#1B2733;font-size:${dv ? 17 : 15}px;line-height:${dv ? 1.9 : 1.6};${dv ? "font-family:Faruma,'MV Faseyha','MV Boli',Arial,sans-serif;text-align:right;" : ""}">
${subject ? `<div style="font-size:${dv ? 20 : 18}px;font-weight:700;color:#123B67;margin-bottom:12px;">${escapeHtml(subject)}</div>` : ""}
<div style="white-space:pre-wrap;">${escapeHtml(body)}</div>
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #E3EEF8;color:#567493;font-size:12px;">Aflaah Quran Class · <a href="${siteUrl}" style="color:#176FD1;">${siteUrl.replace(/^https?:\/\//, "")}</a></td></tr>
</table></body></html>`;
}

async function handleEmail(request, env) {
  if (request.method !== "POST") return json({ error: "POST only" }, 405);
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Not signed in" }, 401);

  // Supabase REST calls as the signed-in user.
  const sb = (path, init = {}) => fetch(`${env.SUPABASE_URL}${path}`, {
    ...init,
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });

  const userRes = await sb("/auth/v1/user");
  if (!userRes.ok) return json({ error: "Not signed in" }, 401);
  const user = await userRes.json();
  const [profile] = await (await sb(`/rest/v1/profiles?id=eq.${user.id}&select=role`)).json();
  if (profile?.role !== "admin") return json({ error: "Admins only" }, 403);

  const { action, notification_id } = await request.json().catch(() => ({}));
  const configured = Boolean(env.EMAIL && env.EMAIL_FROM);
  if (action === "status") return json({ configured, from: env.EMAIL_FROM || null });
  if (action !== "send" || !/^[0-9a-f-]{36}$/.test(notification_id || "")) return json({ error: "Unknown action" }, 400);
  if (!configured) return json({ configured: false, sent: 0, failed: 0 });

  const [note] = await (await sb(`/rest/v1/notifications?id=eq.${notification_id}&select=title,body`)).json();
  if (!note) return json({ error: "Notification not found" }, 404);
  const pending = await (await sb(`/rest/v1/notification_recipients?notification_id=eq.${notification_id}&email_status=in.(pending,failed)&select=id,name,email,body`)).json();

  const update = (ids, fields) => ids.length && sb(`/rest/v1/notification_recipients?id=in.(${ids.join(",")})`, { method: "PATCH", body: JSON.stringify(fields) });
  const subject = note.title || "Aflaah Quran Class";
  const siteUrl = new URL(request.url).origin;
  const sentIds = [], noEmail = [];
  let failed = 0;

  for (const r of pending) {
    if (!isEmail(r.email)) { noEmail.push(r.id); continue; }
    const body = r.body || note.body;
    try {
      await env.EMAIL.send({
        from: { email: env.EMAIL_FROM, name: env.EMAIL_FROM_NAME || "Aflaah Quran Class" },
        to: r.name ? { email: r.email, name: r.name } : r.email,
        subject,
        text: body,
        html: emailHtml(note.title, body, siteUrl),
      });
      sentIds.push(r.id);
    } catch (e) {
      failed += 1;
      await update([r.id], { email_status: "failed", email_error: String(e?.message || e).slice(0, 300) });
    }
  }
  await update(sentIds, { email_status: "sent", email_error: null, email_sent_at: new Date().toISOString() });
  await update(noEmail, { email_status: "no_email", email_error: "No valid email address" });
  return json({ configured: true, sent: sentIds.length, failed, noEmail: noEmail.length });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/email") return handleEmail(request, env);
    if (pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
    return env.ASSETS.fetch(request);
  },
};
