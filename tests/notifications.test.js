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
  assert.equal(out, "އަޙްމަދު ގެ އޮކްޓޫބަރު 2026 ގެ ފީ 500 ރުފިޔާ - އާދިއްތަ، އަންގާރަ");
});

test("portal login template fills name, Student ID, password and link", () => {
  const out = fillTemplate(DEFAULT_TEMPLATE_BODIES.portal_login, { name: "Ahmed", studentCode: "AQC0001" }, { password: "Ab7kP2mQ" });
  assert.match(out, /Ahmed/);
  assert.match(out, /Student ID: AQC0001/);
  assert.match(out, /One-time password: Ab7kP2mQ/);
  assert.match(out, /https:\/\/students\.aflaahqc\.com/);
});
