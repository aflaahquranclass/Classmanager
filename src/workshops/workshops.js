// Workshops with their own sign-up page on the website (/workshop/<slug>),
// e.g. aflaahqc.com/workshop/namaadhu for the prayer session. A parent adds
// one or more students, pays the fee × the number of students by bank
// transfer and attaches the slip. Saved to workshop_registrations through
// submit_workshop_registration (supabase/migrations/20261120_workshop_registrations.sql),
// which knows the same workshops, fees and last days — change both together.

import { supabase } from "../supabaseClient.js";

export const WORKSHOPS = {
  namaadhu: {
    key: "namaadhu-2026-11",
    fee: 150, // MVR per student
    minAge: 10,
    maxAge: 16,
    lastDay: "2026-11-19", // sign-up closes after this day (Maldives time)
    label: "ފުރާވަރު ދަރިވަރުންގެ ޚާއްސަ ނަމާދު ސެޝަން",
    title: ["ނަމާދަށް އަހުލުވެރި", "ދަރިވަރު"],
    speaker: {
      name: "އައްޝައިޚް ސާޖިދު މުޙައްމަދު",
      photo: "/images/workshops/shaikh-sajid.png",
      lines: ["މާސްޓާރސް އޮފް ޓީޗިންގ އިސްލާމިކް ސްޓަޑީޒް", "ބެޗްލަރސް އިން ޝަރީޢާ"],
    },
    date: ["19", "ނޮވެމްބަރު", "2026"],
    day: "ބުރާސްފަތި ދުވަހުގެ ރޭ",
    time: "8:15 - 9:45",
    viber: "9715441",
    // SMS the admin sends once a sign-up is accepted (Admin → Workshops).
    acceptedMessage: `އައްސަލާމް ޢަލައިކުމް!

ފުރާވަރު ދަރިވަރުންގެ "ނަމާދަށް އަހުލުވެރި ދަރިވަރު" ސެޝަނަށް ދަރިވަރުގެ ރަޖިސްޓްރޭޝަން ފީ ވަނީ ލިބިފައެވެ.

ސެޝަނާ ގުޅޭ މަޢުލޫމާތު ހިއްސާކުރުމަށްޓަކައި، ވައިބަރ ގްރޫޕަށް މި ނަންބަރު ވަރަށް އަވަހަށް އެޑްކޮށްދޭނަމެވެ.

އިތުރު މަޢުލޫމާތު ބޭނުންފުޅުނަމަ 7793962 އަށް ގުޅުއްވުން އެދެމެވެ.

ޝުކުރިއްޔާ!`,
  },
};

export const workshopSlugOf = (pathname = window.location.pathname) => {
  const m = pathname.match(/^\/workshop\/([a-z0-9-]+)\/?$/);
  return m && WORKSHOPS[m[1]] ? m[1] : "";
};

// Still taking sign-ups (Maldives date).
export const isWorkshopOpen = (w) =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Indian/Maldives" }) <= w.lastDay;

// Same private bucket and rules as class registration slips.
const BUCKET = "registration-slips";
export const SLIP_MAX_BYTES = 5 * 1024 * 1024; // the bucket's limit
// A bigger phone photo is shrunk before upload, so up to this size is fine.
export const SLIP_PICK_MAX_BYTES = 25 * 1024 * 1024;

// Phone photos of slips are often several MB. A photo bigger than 1.5 MB is
// redrawn at most 2000 px on its long side as a JPEG, which keeps the text
// readable and makes it a few hundred KB. PDFs, and photos the browser can't
// open (e.g. HEIC outside Safari), are sent as they are.
export async function shrinkSlip(file) {
  if (!file.type.startsWith("image/") || file.size <= 1.5 * 1024 * 1024) return file;
  try {
    const img = await createImageBitmap(file, { imageOrientation: "from-image" });
    const k = Math.min(1, 2000 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    const g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    img.close?.();
    const blob = await new Promise((resolve) => c.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
export const SLIP_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,application/pdf";

// students: [{ name, age, address, viber }]. Uploads the slip under new/, then
// files the sign-up. The visitor can't read either back; only admins can.
export async function submitWorkshopRegistration({ workshop, students, file: picked }) {
  const file = await shrinkSlip(picked);
  if (file.size > SLIP_MAX_BYTES) throw new Error("bigSlip");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `new/workshop-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined });
  if (up.error) throw new Error("slip");
  const { error } = await supabase.rpc("submit_workshop_registration", {
    p_workshop: workshop,
    p_students: students.map((s) => ({ name: s.name.trim(), age: Number(s.age), address: s.address.trim(), viber: s.viber.trim() })),
    p_slip_path: path,
  });
  if (error) {
    const m = error.message;
    throw new Error(m.includes("not open") ? "closed" : m.includes("too many") ? "busy" : m.includes("not valid") ? "invalid" : "save");
  }
}
