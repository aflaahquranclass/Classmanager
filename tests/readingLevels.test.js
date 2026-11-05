import test from "node:test";
import assert from "node:assert/strict";
import { sessionLevels, hintKeys, MISTAKE_LEVEL } from "../src/checkReading/levels.js";

test("a mistake is red; a word recited right steps down once per recitation", () => {
  const keys = ["a", "b", "c", "d"];
  const base = { b: 4, c: 1 };
  const out = sessionLevels(base, keys, ["wrong", "ok", "ok", "pending"]);
  assert.equal(out.a, MISTAKE_LEVEL);
  assert.equal(out.b, 3); // red → orange
  assert.equal(out.c, 0); // green → gone
  assert.equal(out.d, undefined);
});

test("red → orange → blue → green → gone over four good recitations", () => {
  let levels = { w: 4 };
  const seen = [];
  for (let i = 0; i < 4; i++) { levels = sessionLevels(levels, ["w"], ["ok"]); seen.push(levels.w); }
  assert.deepEqual(seen, [3, 2, 1, 0]);
});

test("a skipped word counts as a mistake", () => {
  assert.equal(sessionLevels({}, ["x"], ["skipped"]).x, MISTAKE_LEVEL);
});

const PASSAGE = [
  { key: "1:1" }, { key: "1:2" }, { key: "1:3", end: true },
  { key: "2:1" }, { key: "2:2" }, { key: "2:3" }, { key: "2:4", end: true },
];

test("Next word shows the first word not reached, then the one after", () => {
  const pending = ["2:1", "2:2", "2:3"];
  assert.deepEqual(hintKeys(PASSAGE, pending, new Set(), false), ["2:1"]);
  assert.deepEqual(hintKeys(PASSAGE, pending, new Set(["2:1"]), false), ["2:2"]);
});

test("Next ayah shows the rest of that ayah, up to its number", () => {
  assert.deepEqual(hintKeys(PASSAGE, ["2:1", "2:2", "2:3"], new Set(), true), ["2:1", "2:2", "2:3"]);
  assert.deepEqual(hintKeys(PASSAGE, ["2:2", "2:3"], new Set(), true), ["2:2", "2:3"]);
});
