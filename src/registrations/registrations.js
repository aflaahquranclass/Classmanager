// Class registration: the class times offered on the website (web_classes,
// Admin → Registrations → Website classes), and the registrations sent
// through /register (class_registrations). Database: supabase/migrations/
// 20261028_class_registrations.sql, 20261029_registration_classes.sql and
// 20261030_web_classes.sql.

import { supabase } from "../supabaseClient.js";

export const CATEGORIES = [
  { key: "tajweed", en: "Tajweed (Tilawa)", dv: "ތަޖްވީދު (ތިލާވާ)", blurb: "Recite the Quran correctly with the rules of tajweed.", icon: "mic",
    dvName: "ތަޖްވީދު ކުލާސް", dvBlurb: "ކީރިތި ޤުރުއާން ބަލައިގެން ކިޔެވުމާއި ތަޖްވީދުގެ ފިލާވަޅުތައް" },
  { key: "hifz", en: "Hifz", dv: "ހިތުދަސްކުރުން", blurb: "Memorise the Quran with a daily plan and revision.", icon: "book",
    dvName: "ހިފްޡު ކުލާސް", dvBlurb: "ކީރިތި ޤުރުއާން ހިތުދަސްކުރާ ކުލާސް" },
  { key: "foundation", en: "Foundation", dv: "ފައުންޑޭޝަން", blurb: "Start from the letters and kalimah, and learn to read.", icon: "baby",
    dvName: "ފައުންޑޭޝަން ކުލާސް", dvBlurb: "ކިޔަވަން ފަށައިގަންނަ މަރުޙަލާއަށް ޚާއްޞަ ކުލާސް" },
];
// The order the registration forms list the classes in.
export const FORM_CATEGORY_ORDER = ["hifz", "tajweed", "foundation"];
// Every class has a school students' class (15 and under) and an adults'
// class (16 and above). The keys stay "children" and "adults" in the
// database; "slug" is the form's address (/register/hifz/school).
export const AGE_GROUPS = [
  { key: "children", slug: "school", en: "School students", sub: "15 and under", maxAge: 15,
    dv: "ސްކޫލް ދަރިވަރުންގެ ކުލާސް", dvSub: "ޢުމުރުން 15 އަހަރާއި ދަށް", dvForm: "ސްކޫލް ދަރިވަރުންގެ ކުލާހުގެ ފޯމު",
    ageError: "މި ކުލާހަކީ ޢުމުރުން 15 އަހަރާއި ދަށުގެ ދަރިވަރުންނަށް ޚާއްޞަ ކުލާހެކެވެ. ބޮޑެތި މީހުންގެ ކުލާހުގެ ފޯމު ފުރުއްވާ." },
  { key: "adults", slug: "adults", en: "Adults", sub: "16 and above", minAge: 16,
    dv: "ބޮޑެތި މީހުންގެ ކުލާސް", dvSub: "ޢުމުރުން 16 އަހަރާއި މަތި", dvForm: "ބޮޑެތި މީހުންގެ ކުލާހުގެ ފޯމު",
    ageError: "މި ކުލާހަކީ ޢުމުރުން 16 އަހަރާއި މަތީގެ މީހުންނަށް ޚާއްޞަ ކުލާހެކެވެ. ސްކޫލް ދަރިވަރުންގެ ކުލާހުގެ ފޯމު ފުރުއްވާ." },
];
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_DV = { Sun: "އާދިއްތަ", Mon: "ހޯމަ", Tue: "އަންގާރަ", Wed: "ބުދަ", Thu: "ބުރާސްފަތި", Fri: "ހުކުރު", Sat: "ހޮނިހިރު" };

// One registration form for each class and age group (/register/<class>/<age>),
// written in Dhivehi; the admin opens and closes each one. /register and
// /register/<class> only help the visitor pick a form.
export const FORMS = FORM_CATEGORY_ORDER.flatMap((category) => AGE_GROUPS.map((g) => ({
  key: `${category}-${g.slug}`, category, ageGroup: g.key,
  en: `${CATEGORIES.find((c) => c.key === category).en} · ${g.en}`,
})));
export const formOf = (key) => FORMS.find((f) => f.key === key);
export const formKeyOf = (category, ageGroup) => FORMS.find((f) => f.category === category && f.ageGroup === ageGroup)?.key || "";
export const formPath = (key) => {
  const f = formOf(key);
  return f ? `/register/${f.category}/${ageGroupOf(f.ageGroup).slug}` : "/register";
};
export const formUrl = (key) => {
  const { hostname, origin } = window.location;
  const base = ["localhost", "127.0.0.1"].includes(hostname) ? origin : "https://aflaahqc.com";
  return `${base}${formPath(key)}`;
};
// What a /register… address points at: { category, ageGroup } ("" when not
// chosen yet), or null if it isn't a registration address.
export const registerPathOf = (pathname = window.location.pathname) => {
  const m = pathname.match(/^\/register(?:\/([a-z]+))?(?:\/([a-z]+))?\/?$/);
  if (!m) return null;
  const category = categoryOf(m[1]) ? m[1] : "";
  const group = category && AGE_GROUPS.find((g) => g.slug === m[2]);
  if ((m[1] && !category) || (m[2] && !group)) return null;
  return { category, ageGroup: group ? group.key : "" };
};

export const REG_BUCKET = "registration-slips";
export const REG_SLIP_MAX_BYTES = 5 * 1024 * 1024;
export const REG_SLIP_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,application/pdf";

export function categoryOf(key) { return CATEGORIES.find((c) => c.key === key); }
export function ageGroupOf(key) { return AGE_GROUPS.find((a) => a.key === key); }

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
// The same in Dhivehi for the registration forms: "4:30 ހަވީރު",
// "އާދިއްތަ، ހޯމަ", "100 ރުފިޔާ".
export function fmtTimeDv(t) {
  const [h, m] = (t || "").split(":").map(Number);
  if (Number.isNaN(h)) return t || "";
  const part = h < 12 ? "ހެނދުނު" : h < 16 ? "މެންދުރުފަހު" : h < 19 ? "ހަވީރު" : "ރޭގަނޑު";
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${part}`;
}
export const fmtDaysDv = (days) => {
  const list = DAYS.filter((d) => (days || []).includes(d));
  return list.length === 7 ? "ކޮންމެ ދުވަހަކު" : list.map((d) => DAYS_DV[d]).join("، ");
};
export const fmtMvrDv = (n) => `${Number(n).toLocaleString("en", { maximumFractionDigits: 2 })} ރުފިޔާ`;
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
    throw new Error(m.includes("form is closed") ? "form-closed" : m.includes("not open") ? "closed" : m.includes("age does not fit") ? "age"
      : m.includes("already waiting") ? "waiting" : m.includes("too many") ? "busy" : "save");
  }
}

// Short-lived link for the admin to view a slip.
export async function regSlipUrl(path) {
  const { data, error } = await supabase.storage.from(REG_BUCKET).createSignedUrl(path, 600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
