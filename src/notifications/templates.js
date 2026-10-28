// Message templates: the fixed wording for the payment reminder and the
// welcome message (sent by SMS and email), with {placeholders} filled in per
// student. A template written in
// Dhivehi gets the student's name, days, month and fee in Dhivehi too.

import { nameToThaana } from "../exams/thaanaNames.js";
import { hasThaana } from "./thaanaKeyboard.js";

export const TEMPLATES = [
  {
    key: "welcome",
    label: "Welcome message",
    hint: "Sent to a newly registered student with their class details.",
    placeholders: ["name", "student_id", "class", "teacher", "days", "time", "fee"],
  },
  {
    key: "payment_reminder",
    label: "Payment reminder",
    hint: "Sent to students who haven't paid the month's fee.",
    placeholders: ["name", "student_id", "month", "fee", "class"],
  },
  {
    key: "registration_welcome",
    label: "Registration welcome — English",
    hint: "Sent when you accept a student who registered on the website and choose English. Add Student ID, Portal link and One-time password to send their student portal login too. You can change it for one student in the Accept box.",
    placeholders: ["class_type", "days", "time", "fee", "name", "class", "teacher", "student_id", "link", "password"],
  },
  {
    key: "registration_welcome_dv",
    label: "Registration welcome — Dhivehi",
    hint: "The same message in Dhivehi, sent when you choose ދިވެހި in the Accept box.",
    placeholders: ["class_type", "days", "time", "fee", "name", "class", "teacher", "student_id", "link", "password"],
  },
  {
    key: "portal_login",
    label: "Student portal login",
    hint: "Sent from Students → Edit with the student's Student ID and one-time password.",
    placeholders: ["name", "student_id", "password", "link"],
  },
];

// Where students sign in; filled in as {link}.
export const STUDENT_PORTAL_LINK = "https://students.aflaahqc.com";

// Used until the admin saves their own wording under Templates.
export const DEFAULT_TEMPLATE_BODIES = {
  registration_welcome_dv: "އައްސަލާމް ޢަލައިކުމް.\n\nއަފްލާޙް ޤުރްއާން ކްލާހަށް ތިޔަ ދަރިވަރަށް މަރުޙަބާ ދަންނަވަމެވެ. ތިރީގައި ބަޔާންކުރެވިފައިވާ ކުލާހަށް ދަރިވަރު މިހާރު ވަނީ ރަޖިސްޓްރީ ކުރެވިފައެވެ. ކުލާސް ފެށުމުގެ ކުރިން، ކްލާހުގެ ވައިބަރ ގްރޫޕަށް ދަރިވަރު އެޑްކުރެވޭނެ ވާހަކަ ދަންނަވަމެވެ.\n\nކްލާހުގެ ތަފްޞީލު:\n• ކްލާސް: {class_type}\n• ކިޔަވައިދޭ ދުވަސްތައް: {days}\n• ގަޑި: {time}\n• މަހު ފީ: {fee}\n\nއިތުރު މަޢުލޫމާތެއް ސާފުކުރެއްވުމަށް 9715441 މި ނަންބަރުގެ ވައިބަރ މެދުވެރިކޮށް މެސެޖް ކުރެއްވުން އެދެމެވެ.\n\nމާތް ﷲ ތިޔަ ދަރިވަރުގެ ކިޔެވުމުގައި ބަރަކާތް ލައްވައި، ފުރިހަމަ ކާމިޔާބީ މިންވަރުކުރައްވާށިއެވެ! އާމީން.",
  registration_welcome: "Assalaamu alaikum.\n\nWelcome to Aflaah Quran Class. The student is now registered in the class below. Before the class starts, they will be added to the class Viber group.\n\nClass details:\n• Class: {class_type}\n• Days: {days}\n• Time: {time}\n• Monthly fee: {fee}\n\nFor more information, please message us on Viber at 9715441.\n\nMay Allah bless the student's studies and grant them full success. Ameen.",
  portal_login: "Assalaamu alaikum {name}. Your Aflaah Student Portal login:\n{link}\nStudent ID: {student_id}\nOne-time password: {password}\nYou will choose your own password when you sign in.",
};

export const PLACEHOLDER_LABELS = {
  name: "Student name", student_id: "Student ID", class: "Class", class_type: "Class type chosen", teacher: "Teacher",
  days: "Class days", time: "Class time", fee: "Monthly fee", month: "Month",
  password: "One-time password", link: "Portal link",
};

// Email subject lines, in the template's language.
export const welcomeSubject = (body) => (hasThaana(body) ? "އަފްލާޙް ޤުރްއާން ކްލާހަށް މަރުޙަބާ" : "Welcome to Aflaah Quran Class");
export const reminderSubject = (body, month) => (hasThaana(body) ? `ފީ ދެއްކުމަށް ހަނދާންކޮށްދިނުން` : `Fee reminder — ${month}`);

// An SMS segment is 160 GSM characters, or 70 when the text has anything
// outside GSM (e.g. Thaana); long messages are split into 153 / 67 per part.
export function smsParts(text) {
  if (!text) return 0;
  const unicode = /[^\x0A\x0D\x20-\x7E£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ¡ÄÖÑÜ§¿äöñüà€]/.test(text);
  const single = unicode ? 70 : 160, multi = unicode ? 67 : 153;
  return text.length <= single ? 1 : Math.ceil(text.length / multi);
}

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_DV = ["ޖަނަވަރީ", "ފެބުރުވަރީ", "މާރިޗު", "އޭޕްރީލް", "މެއި", "ޖޫން", "ޖުލައި", "އޮގަސްޓު", "ސެޕްޓެމްބަރު", "އޮކްޓޫބަރު", "ނޮވެމްބަރު", "ޑިސެމްބަރު"];
const DAYS_EN = { Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday" };
const DAYS_DV = { Sun: "އާދިއްތަ", Mon: "ހޯމަ", Tue: "އަންގާރަ", Wed: "ބުދަ", Thu: "ބުރާސްފަތި", Fri: "ހުކުރު", Sat: "ހޮނިހިރު" };

function time12(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h)) return t;
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

const fmtFee = (n) => (Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

// Dhivehi time of day for a class time: "ރޭގަނޑު 8:15 އިން 9:00 އަށް".
function partOfDayDv(h) {
  if (h >= 5 && h < 12) return "ހެނދުނު";
  if (h >= 12 && h < 15) return "މެންދުރު";
  if (h >= 15 && h < 18) return "ހަވީރު";
  return "ރޭގަނޑު";
}
function timeRangeDv(start, end) {
  const plain = (t) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")}`; };
  return `${partOfDayDv(Number(start.split(":")[0]))} ${plain(start)} އިން ${plain(end)} އަށް`;
}
// "އާދިއްތަ، އަންގާރަ އަދި ބުރާސްފަތި"
const listDv = (items) => (items.length > 1 ? `${items.slice(0, -1).join("، ")} އަދި ${items[items.length - 1]}` : items.join(""));

// The class type and age group a student chose on the website, e.g.
// "ބޮޑެތި މީހުންގެ ޙިފްޡު ކްލާސް" / "Adults' Hifz class".
const CLASS_TYPE = {
  tajweed: { en: "Tajweed (Tilawa)", dv: "ތަޖްވީދު (ތިލާވާ)" },
  hifz: { en: "Hifz", dv: "ޙިފްޡު" },
  foundation: { en: "Foundation", dv: "ފައުންޑޭޝަން" },
};
function classTypeLabel(classType, dv) {
  const type = CLASS_TYPE[classType?.category];
  if (!type) return "";
  if (dv) return `${classType.ageGroup === "children" ? "ކުޑަކުދިންގެ" : "ބޮޑެތި މީހުންގެ"} ${type.dv} ކްލާސް`;
  return `${classType.ageGroup === "children" ? "Children's" : "Adults'"} ${type.en} class`;
}

// student: { name, studentCode, className, fee, schedule: { days, startTime, endTime } }
// ctx: { teacherName, monthKey ("2026-10"), dvNames: { [englishName]: thaana }, password,
//        classType: { category, ageGroup } (website registrations) }
export function fillTemplate(body, student, ctx = {}) {
  const dv = hasThaana(body);
  const sched = student.schedule || {};
  const days = (sched.days || []).map((d) => (dv ? DAYS_DV : DAYS_EN)[d] || d);
  const [y, m] = (ctx.monthKey || "").split("-").map(Number);
  const dvName = (n) => (n ? ctx.dvNames?.[n] || nameToThaana(n) : "");
  const values = {
    name: dv ? dvName(student.name) : student.name || "",
    student_id: student.studentCode || "",
    class: student.className || "",
    teacher: dv ? dvName(ctx.teacherName) : ctx.teacherName || "",
    class_type: classTypeLabel(ctx.classType, dv),
    days: dv ? listDv(days) : days.join(", "),
    time: !sched.startTime ? "" : dv ? timeRangeDv(sched.startTime, sched.endTime) : `${time12(sched.startTime)} - ${time12(sched.endTime)}`,
    fee: dv ? `-/${fmtFee(student.fee)} ރުފިޔާ` : `MVR ${fmtFee(student.fee)}`,
    month: m ? (dv ? `${MONTHS_DV[m - 1]} ${y}` : `${MONTHS_EN[m - 1]} ${y}`) : "",
    password: ctx.password || "",
    link: STUDENT_PORTAL_LINK,
  };
  return body.replace(/\{(\w+)\}/g, (all, key) => (key in values ? values[key] : all)).replace(/[ \t]{2,}/g, " ").trim();
}
