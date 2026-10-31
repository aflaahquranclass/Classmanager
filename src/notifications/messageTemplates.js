// Saved messages (Notifications → Templates): a name and an English and a
// Dhivehi version. Picked under Send, where the admin chooses the language.

import { supabase } from "../supabaseClient.js";
import { DEFAULT_TEMPLATE_BODIES } from "./templates.js";
import { hasThaana } from "./thaanaKeyboard.js";

// [{ id, name, en, dv }] by name, or null when they couldn't be loaded.
export async function loadMessageTemplates() {
  const { data, error } = await supabase.from("message_templates").select("id, name, body_en, body_dv").order("name");
  if (error) return null;
  return data.map((r) => ({ id: r.id, name: r.name, en: r.body_en, dv: r.body_dv }));
}

// Returns the saved template, or null.
export async function saveMessageTemplate({ id, name, en, dv }) {
  const row = { name: name.trim(), body_en: en.trim(), body_dv: dv.trim(), updated_at: new Date().toISOString() };
  const query = id
    ? supabase.from("message_templates").update(row).eq("id", id)
    : supabase.from("message_templates").insert(row);
  const { data, error } = await query.select("id, name, body_en, body_dv").single();
  if (error) return null;
  return { id: data.id, name: data.name, en: data.body_en, dv: data.body_dv };
}

export async function deleteMessageTemplate(id) {
  const { error } = await supabase.from("message_templates").delete().eq("id", id);
  return !error;
}

// The automatic messages (sms_templates rows, or their default wording) in
// the same shape, so they can be sent by hand too. One wording goes in the
// slot of its script; the registration welcome has both.
export function automaticAsTemplates(rows = {}) {
  const body = (key) => rows[key]?.body?.trim() || DEFAULT_TEMPLATE_BODIES[key] || "";
  const single = (key, name) => {
    const text = body(key);
    return { id: `auto:${key}`, name, en: hasThaana(text) ? "" : text, dv: hasThaana(text) ? text : "", automatic: true };
  };
  return [
    { id: "auto:registration_welcome", name: "Registration welcome", en: body("registration_welcome"), dv: body("registration_welcome_dv"), automatic: true },
    single("welcome", "Welcome message"),
    single("payment_reminder", "Payment reminder"),
    single("portal_login", "Student portal login"),
  ].filter((t) => t.en || t.dv);
}
