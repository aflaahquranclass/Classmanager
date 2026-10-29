// Class registration: the class times offered on the website (web_classes,
// Admin → Registrations → Website classes), and the registrations sent
// through /register (class_registrations). Database: supabase/migrations/
// 20261028_class_registrations.sql, 20261029_registration_classes.sql and
// 20261030_web_classes.sql.

import { supabase } from "../supabaseClient.js";

export const CATEGORIES = [
  { key: "tajweed", en: "Tajweed (Tilawa)", dv: "ތަޖްވީދު (ތިލާވާ)", blurb: "Recite the Quran correctly with the rules of tajweed.", icon: "mic" },
  { key: "hifz", en: "Hifz", dv: "ހިތުދަސްކުރުން", blurb: "Memorise the Quran with a daily plan and revision.", icon: "book" },
  { key: "foundation", en: "Foundation", dv: "ފައުންޑޭޝަން", blurb: "Start from the letters and kalimah, and learn to read.", icon: "baby" },
];
export const AGE_GROUPS = [
  { key: "children", en: "Children", sub: "Under 14", dv: "ކުޑަކުދިން" },
  { key: "adults", en: "Teens & adults", sub: "15 and above", dv: "ޒުވާނުން އަދި ބޮޑެތި މީހުން" },
];
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// The main form (/register) takes any class; each class also has its own
// form (/register/<category>) for posters, with that class already chosen.
export const FORMS = [{ key: "all", en: "Main form (all classes)" }, ...CATEGORIES.map((c) => ({ key: c.key, en: `${c.en} form` }))];
export const formPath = (form) => (form === "all" ? "/register" : `/register/${form}`);
export const formUrl = (form) => {
  const { hostname, origin } = window.location;
  const base = ["localhost", "127.0.0.1"].includes(hostname) ? origin : "https://aflaahqc.com";
  return `${base}${formPath(form)}`;
};
// The class a /register/<category> address is for, or "" for the main form.
export const lockedCategory = (pathname = window.location.pathname) => {
  const m = pathname.match(/^\/register\/([a-z]+)\/?$/);
  return m && categoryOf(m[1]) ? m[1] : "";
};

export const REG_BUCKET = "registration-slips";
export const REG_SLIP_MAX_BYTES = 5 * 1024 * 1024;
export const REG_SLIP_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,application/pdf";

export const categoryOf = (key) => CATEGORIES.find((c) => c.key === key);
export const ageGroupOf = (key) => AGE_GROUPS.find((a) => a.key === key);

// "16:30" → "4:30 pm"
export function fmtTime(t) {
  const [h, m] = (t || "").split(":").map(Number);
  if (Number.isNaN(h)) return t || "";
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}
export const fmtDays = (days) => {
  const list = DAYS.filter((d) => (days || []).includes(d));
  return list.length === 7 ? "Every day" : list.join(", ");
};
export const fmtMvr = (n) => `MVR ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
export const offeringLabel = (o) => `${categoryOf(o.category)?.en} · ${ageGroupOf(o.age_group)?.en} · ${fmtDays(o.days)} ${fmtTime(o.start_time)}–${fmtTime(o.end_time)}`;

// Whether a form is taking registrations: true, false, or null if unknown.
export async function isFormOpen(form) {
  const { data, error } = await supabase.from("registration_forms").select("is_open").eq("form", form).maybeSingle();
  return error || !data ? null : data.is_open;
}

// The class times offered on the website, sorted by start time:
// [{ id, category, age_group, days, start_time, end_time, registration_fee, monthly_fee, note }]
export async function loadOpenOfferings() {
  const { data, error } = await supabase.rpc("public_class_times");
  if (error) throw new Error(error.message);
  return data || [];
}

// Uploads the slip under new/ and files the application. The visitor can't
// read the file back; only admins can.
export async function submitRegistration({ form, classId, name, nic, age, atollIsland, viber, file }) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `new/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const up = await supabase.storage.from(REG_BUCKET).upload(path, file, { contentType: file.type || undefined });
  if (up.error) throw new Error("slip");
  const { error } = await supabase.rpc("submit_registration", {
    p_form: form, p_class_id: classId, p_name: name, p_nic: nic, p_age: age,
    p_atoll_island: atollIsland, p_viber: viber, p_slip_path: path,
  });
  if (error) {
    const m = error.message;
    throw new Error(m.includes("form is closed") ? "form-closed" : m.includes("not open") ? "closed"
      : m.includes("already waiting") ? "waiting" : m.includes("too many") ? "busy" : "save");
  }
}

// Short-lived link for the admin to view a slip.
export async function regSlipUrl(path) {
  const { data, error } = await supabase.storage.from(REG_BUCKET).createSignedUrl(path, 600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
