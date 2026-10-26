// send-sms: sends the pending SMS of one notification through MessageOwl.
// Called from Admin → Notifications. Only admins may call it; the provider's
// API key lives in this function's secrets, never in the browser.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   MESSAGEOWL_API_KEY    the MessageOwl access key
//   MESSAGEOWL_SENDER_ID  the approved sender name (e.g. "Aflaah")
//
// Body: { action: "status" }                      → is SMS set up?
//       { action: "send", notification_id: uuid } → send its pending SMS

import { createClient } from "jsr:@supabase/supabase-js@2";

const API_KEY = Deno.env.get("MESSAGEOWL_API_KEY") ?? "";
const SENDER_ID = Deno.env.get("MESSAGEOWL_SENDER_ID") ?? "";
// MessageOwl REST endpoint — confirm against the API details when they arrive.
const MESSAGEOWL_URL = Deno.env.get("MESSAGEOWL_URL") ?? "https://rest.msgowl.com/messages";
const BATCH_SIZE = 50;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Maldives numbers are 7 digits; MessageOwl wants them with the 960 country code.
function normalizePhone(raw: string | null): string | null {
  const digits = (raw ?? "").replace(/\D/g, "").replace(/^00/, "");
  if (/^[379]\d{6}$/.test(digits)) return `960${digits}`;
  if (/^960[379]\d{6}$/.test(digits)) return digits;
  if (digits.length >= 8 && digits.length <= 15) return digits; // other international
  return null;
}

async function sendBatch(numbers: string[], body: string): Promise<string | null> {
  const res = await fetch(MESSAGEOWL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `AccessKey ${API_KEY}` },
    body: JSON.stringify({ recipients: numbers.join(","), sender_id: SENDER_ID, body }),
  });
  if (res.ok) return null;
  const text = await res.text().catch(() => "");
  return `MessageOwl ${res.status}: ${text.slice(0, 300)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Caller must be a signed-in admin.
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return json({ error: "Not signed in" }, 401);
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return json({ error: "Admins only" }, 403);

  const { action, notification_id } = await req.json().catch(() => ({}));
  const configured = Boolean(API_KEY && SENDER_ID);

  if (action === "status") return json({ configured, provider: "MessageOwl", senderId: SENDER_ID || null });
  if (action !== "send" || !notification_id) return json({ error: "Unknown action" }, 400);
  if (!configured) return json({ configured: false, sent: 0, failed: 0 });

  const { data: note } = await admin.from("notifications").select("title, body").eq("id", notification_id).maybeSingle();
  if (!note) return json({ error: "Notification not found" }, 404);
  const text = note.title ? `${note.title}\n${note.body}` : note.body;

  const { data: pending } = await admin.from("notification_recipients")
    .select("id, phone, body").eq("notification_id", notification_id).in("sms_status", ["pending", "failed"]);

  // A recipient's own wording (payment reminder, welcome) wins over the
  // shared text; recipients with the same text are sent together.
  const groups = new Map<string, { id: string; phone: string }[]>();
  const noPhone: string[] = [];
  for (const r of pending ?? []) {
    const phone = normalizePhone(r.phone);
    if (!phone) { noPhone.push(r.id); continue; }
    const msg = r.body || text;
    if (!groups.has(msg)) groups.set(msg, []);
    groups.get(msg)!.push({ id: r.id, phone });
  }
  if (noPhone.length) {
    await admin.from("notification_recipients").update({ sms_status: "no_phone", sms_error: "No valid phone number" }).in("id", noPhone);
  }

  let sent = 0, failed = 0;
  for (const [msg, valid] of groups) for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE);
    const error = await sendBatch([...new Set(batch.map((b) => b.phone))], msg).catch((e) => String(e));
    const ids = batch.map((b) => b.id);
    if (error) {
      failed += ids.length;
      await admin.from("notification_recipients").update({ sms_status: "failed", sms_error: error }).in("id", ids);
    } else {
      sent += ids.length;
      await admin.from("notification_recipients").update({ sms_status: "sent", sms_error: null, sms_sent_at: new Date().toISOString() }).in("id", ids);
    }
  }
  return json({ configured: true, sent, failed, noPhone: noPhone.length });
});
