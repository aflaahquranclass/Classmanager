// Saving a notification with its recipients and sending its SMS (the
// `send-sms` Edge Function) and emails (the site's Worker at /api/email,
// Cloudflare Email Service). Shared by Admin → Notifications and the
// automatic welcome message when a student is added.

import { supabase } from "../supabaseClient.js";
import { fillTemplate, welcomeSubject } from "./templates.js";

export async function loadTemplates() {
  const { data } = await supabase.from("sms_templates").select("key, body, auto_send");
  return Object.fromEntries((data || []).map((r) => [r.key, r]));
}

// Student names as corrected under Admin → Language: { "Ahmed": "އަޙްމަދު" }.
export async function loadDvNames() {
  const { data } = await supabase.from("report_translations").select("key, dv").like("key", "name:%");
  return Object.fromEntries((data || []).filter((r) => r.dv?.trim()).map((r) => [r.key.slice(5), r.dv]));
}

// Sends the notification's pending / failed SMS; returns a line for a toast.
export async function sendPendingSms(notificationId) {
  const { data, error } = await supabase.functions.invoke("send-sms", { body: { action: "send", notification_id: notificationId } });
  if (error) return "SMS couldn't be sent — try again from Notifications.";
  if (!data.configured) return "SMS saved as pending — it will send once MessageOwl is connected.";
  const bits = [`${data.sent} SMS sent`];
  if (data.failed) bits.push(`${data.failed} failed`);
  if (data.noPhone) bits.push(`${data.noPhone} without a number`);
  return bits.join(", ") + ".";
}

async function callEmailWorker(payload) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch("/api/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok || !(res.headers.get("Content-Type") || "").includes("json")) throw new Error(`Email service ${res.status}`);
  return res.json();
}

// { configured, from } | { error: true } (e.g. the local dev server, which has no Worker).
export async function loadEmailStatus() {
  try { return await callEmailWorker({ action: "status" }); } catch { return { error: true }; }
}

// Sends the notification's pending / failed emails; returns a line for a toast.
export async function sendPendingEmail(notificationId) {
  try {
    const data = await callEmailWorker({ action: "send", notification_id: notificationId });
    if (!data.configured) return "Email saved as pending — it will send once Cloudflare email is set up.";
    const bits = [`${data.sent} email${data.sent === 1 ? "" : "s"} sent`];
    if (data.failed) bits.push(`${data.failed} failed`);
    if (data.noEmail) bits.push(`${data.noEmail} without an email`);
    return bits.join(", ") + ".";
  } catch {
    return "Email saved as pending — the email service couldn't be reached.";
  }
}

// recipients: [{ student_id?, teacher_id?, user_id?, name, phone, email, body? }]
// Returns { ok, message }.
export async function createNotification({ title = "", body, audience, audienceLabel, inApp, sms, email = false, recipients }) {
  const { data: note, error } = await supabase.from("notifications").insert({
    title, body, audience, audience_label: audienceLabel, send_in_app: inApp, send_sms: sms, send_email: email,
  }).select("id").single();
  if (error) return { ok: false, message: "Couldn't send. Please try again." };

  const rows = recipients.map((r) => ({
    notification_id: note.id,
    student_id: r.student_id || null, teacher_id: r.teacher_id || null,
    user_id: inApp ? r.user_id || null : null, name: r.name, phone: r.phone || null,
    body: r.body || null, sms_status: sms ? "pending" : "none",
    email: r.email || null, email_status: email ? "pending" : "none",
  }));
  const { error: recErr } = await supabase.from("notification_recipients").insert(rows);
  if (recErr) {
    await supabase.from("notifications").delete().eq("id", note.id);
    return { ok: false, message: "Couldn't send. Please try again." };
  }
  const [smsMsg, emailMsg] = await Promise.all([sms ? sendPendingSms(note.id) : "", email ? sendPendingEmail(note.id) : ""]);
  return { ok: true, message: [smsMsg, emailMsg].filter(Boolean).join(" ") };
}

// Welcome message for one student: SMS to their phone and email to their
// address, whichever they have. Returns { ok, message }.
export async function sendWelcome(student, teacherName, templateBody, dvNames) {
  const body = fillTemplate(templateBody, student, { teacherName, dvNames });
  return createNotification({
    title: welcomeSubject(templateBody), body, audience: "welcome", audienceLabel: `Welcome — ${student.name}`,
    inApp: false, sms: !!student.phone, email: !!student.email,
    recipients: [{ student_id: student.id, name: student.name, phone: student.phone, email: student.email, body }],
  });
}

// Automatic welcome when a student is added, if the admin turned it on.
// Returns a toast line, or "" when nothing was sent.
export async function sendWelcomeOnAdd(student, teacherName) {
  if (!student.phone && !student.email) return "";
  const t = (await loadTemplates()).welcome;
  if (!t?.auto_send || !t.body.trim()) return "";
  const { ok, message } = await sendWelcome(student, teacherName, t.body, await loadDvNames());
  return ok ? `Welcome message: ${message}` : "Welcome message couldn't be sent.";
}
