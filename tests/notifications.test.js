import { test } from "node:test";
import assert from "node:assert/strict";
import { toThaana, hasThaana, thaanaChange } from "../src/notifications/thaanaKeyboard.js";

test("phonetic layout turns Latin keys into Thaana", () => {
  assert.equal(toThaana("mAdamA"), "މާދަމާ");
  assert.equal(toThaana("klAsq"), "ކލާސް");
  assert.equal(toThaana("SEnu?"), "ށޭނު؟");
  assert.equal(toThaana("123 "), "123 ");
});

test("hasThaana spots Dhivehi text", () => {
  assert.equal(hasThaana("ކްލާސް"), true);
  assert.equal(hasThaana("Class"), false);
});

const fakeEvent = (value) => ({ target: { value, selectionStart: value.length, setSelectionRange() {} } });
globalThis.requestAnimationFrame ??= (fn) => fn();

test("only the typed key is converted, pastes stay as they are", () => {
  let v = "";
  const set = (x) => { v = x; };
  thaanaChange(fakeEvent("ހ" + "a"), "ހ", set, true);
  assert.equal(v, "ހަ");
  thaanaChange(fakeEvent("ހަ Hello"), "ހަ", set, true);
  assert.equal(v, "ހަ Hello");
  thaanaChange(fakeEvent("abc"), "ab", set, false);
  assert.equal(v, "abc");
});

import { fillTemplate, DEFAULT_TEMPLATE_BODIES } from "../src/notifications/templates.js";

const student = { name: "Ahmed", studentCode: "AQC-012", className: "Hifz Class", fee: 500, schedule: { days: ["Sun", "Tue"], startTime: "16:00", endTime: "17:30" } };

test("English template fills the student's details", () => {
  assert.equal(
    fillTemplate("Welcome {name} ({student_id}) to {class} with {teacher}: {days} {time}, fee {fee}. {unknown}", student, { teacherName: "Haathim" }),
    "Welcome Ahmed (AQC-012) to Hifz Class with Haathim: Sunday, Tuesday 4:00 PM - 5:30 PM, fee MVR 500. {unknown}",
  );
  assert.equal(fillTemplate("{month}", student, { monthKey: "2026-10" }), "October 2026");
});

test("Dhivehi template gets Dhivehi name, days, month and fee", () => {
  const out = fillTemplate("{name} ގެ {month} ގެ ފީ {fee} - {days}", student, { monthKey: "2026-10", dvNames: { Ahmed: "އަޙްމަދު" } });
  assert.equal(out, "އަޙްމަދު ގެ އޮކްޓޫބަރު 2026 ގެ ފީ -/500 ރުފިޔާ - އާދިއްތަ އަދި އަންގާރަ");
});

test("Dhivehi days list three with އަދި, time says the time of day", () => {
  const s = { ...student, schedule: { days: ["Sun", "Tue", "Thu"], startTime: "20:15", endTime: "21:00" } };
  assert.equal(fillTemplate("ދުވަސް: {days}", s, {}), "ދުވަސް: އާދިއްތަ، އަންގާރަ އަދި ބުރާސްފަތި");
  assert.equal(fillTemplate("ގަޑި: {time}", s, {}), "ގަޑި: ރޭގަނޑު 8:15 އިން 9:00 އަށް");
  const morning = { ...s, schedule: { days: ["Sat"], startTime: "06:00", endTime: "07:00" } };
  assert.equal(fillTemplate("ގަޑި: {time}", morning, {}), "ގަޑި: ހެނދުނު 6:00 އިން 7:00 އަށް");
});

test("class type is the class and age group chosen on the website", () => {
  const ctx = { classType: { category: "hifz", ageGroup: "adults" } };
  assert.equal(fillTemplate("ކްލާސް: {class_type}", student, ctx), "ކްލާސް: ބޮޑެތި މީހުންގެ ޙިފްޡު ކްލާސް");
  assert.equal(fillTemplate("Class: {class_type}", student, { classType: { category: "tajweed", ageGroup: "children" } }), "Class: Children's Tajweed (Tilawa) class");
});

test("default Dhivehi registration welcome fills the class details", () => {
  const s = { ...student, fee: 175, schedule: { days: ["Sun", "Tue", "Thu"], startTime: "20:15", endTime: "21:00" } };
  const out = fillTemplate(DEFAULT_TEMPLATE_BODIES.registration_welcome_dv, s, { classType: { category: "hifz", ageGroup: "adults" } });
  assert.match(out, /• ކްލާސް: ބޮޑެތި މީހުންގެ ޙިފްޡު ކްލާސް/);
  assert.match(out, /• ކިޔަވައިދޭ ދުވަސްތައް: އާދިއްތަ، އަންގާރަ އަދި ބުރާސްފަތި/);
  assert.match(out, /• ގަޑި: ރޭގަނޑު 8:15 އިން 9:00 އަށް/);
  assert.match(out, /• މަހު ފީ: -\/175 ރުފިޔާ/);
  assert.doesNotMatch(out, /\{\w+\}/);
});

test("portal login template fills name, Student ID, password and link", () => {
  const out = fillTemplate(DEFAULT_TEMPLATE_BODIES.portal_login, { name: "Ahmed", studentCode: "AQC0001" }, { password: "Ab7kP2mQ" });
  assert.match(out, /Ahmed/);
  assert.match(out, /Student ID: AQC0001/);
  assert.match(out, /One-time password: Ab7kP2mQ/);
  assert.match(out, /https:\/\/students\.aflaahqc\.com/);
});

import { messageText } from "../src/notifications/templates.js";

test("messageText picks the language, Both puts Dhivehi first", () => {
  assert.equal(messageText("en", "Hello {name}", "ހެލޯ {name}"), "Hello {name}");
  assert.equal(messageText("dv", "Hello {name}", "ހެލޯ {name}"), "ހެލޯ {name}");
  assert.equal(messageText("both", " Hello ", "ހެލޯ"), "ހެލޯ\n\nHello");
  assert.equal(messageText("both", "Hello", ""), "Hello");
});

test("Both fills each part in its own language", () => {
  const s = { name: "Ahmed", fee: 300 };
  const text = messageText("both", "Fee {fee}", "ފީ {fee}", (t) => fillTemplate(t, s));
  assert.equal(text, "ފީ -/300 ރުފިޔާ\n\nFee MVR 300");
});

test("a Dhivehi message of just {name} still gets the Dhivehi name", () => {
  const s = { name: "Ahmed" };
  assert.equal(messageText("dv", "", "{name}", (t, l) => fillTemplate(t, s, { dv: l === "dv" })), "އަޙްމަދު");
  assert.equal(messageText("en", "{name}", "", (t, l) => fillTemplate(t, s, { dv: l === "dv" })), "Ahmed");
});
