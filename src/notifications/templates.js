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
  welcome: "Assalaamu alaikum {name}. Welcome to Aflaah Quran Class!\nClass: {class}\nDays: {days}\nTime: {time}\nTeacher: {teacher}\nMonthly fee: {fee}\nStudent ID: {student_id}",
  portal_login: "Assalaamu alaikum {name}. Your Aflaah Student Portal login:\n{link}\nStudent ID: {student_id}\nOne-time password: {password}\nYou will choose your own password when you sign in.",
};

export const PLACEHOLDER_LABELS = {
  name: "Student name", student_id: "Student ID", class: "Class", teacher: "Teacher",
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

// student: { name, studentCode, className, fee, schedule: { days, startTime, endTime } }
// ctx: { teacherName, monthKey ("2026-10"), dvNames: { [englishName]: thaana }, password }
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
    days: days.join(dv ? "، " : ", "),
    time: sched.startTime ? `${time12(sched.startTime)} - ${time12(sched.endTime)}` : "",
    fee: dv ? `${fmtFee(student.fee)} ރުފިޔާ` : `MVR ${fmtFee(student.fee)}`,
    month: m ? (dv ? `${MONTHS_DV[m - 1]} ${y}` : `${MONTHS_EN[m - 1]} ${y}`) : "",
    password: ctx.password || "",
    link: STUDENT_PORTAL_LINK,
  };
  return body.replace(/\{(\w+)\}/g, (all, key) => (key in values ? values[key] : all)).replace(/[ \t]{2,}/g, " ").trim();
}
