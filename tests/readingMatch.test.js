import test from "node:test";
import assert from "node:assert/strict";
import { normalizeArabic, splitWords, similarity, alignRecitation } from "../src/readingTest/match.js";

// An-Naba 1–2 in Uthmani spelling, as the Mushaf shows it.
const EXPECTED = splitWords("عَمَّ يَتَسَآءَلُونَ عَنِ ٱلنَّبَإِ ٱلْعَظِيمِ ٱلَّذِى هُمْ فِيهِ مُخْتَلِفُونَ");

test("normalizeArabic drops vowel marks and unifies letter forms", () => {
  assert.equal(normalizeArabic("ٱلنَّبَإِ"), "النبا");
  assert.equal(normalizeArabic("ٱلَّذِى"), "الذي");
  assert.equal(normalizeArabic("يَتَسَآءَلُونَ ١"), "يتسالون");
});

test("similarity is 1 for the same word and lower for different ones", () => {
  assert.equal(similarity("النبا", "النبا"), 1);
  assert.ok(similarity("مختلفون", "مختلفين") >= 0.75);
  assert.ok(similarity("عم", "هم") < 0.67);
});

test("a correct start is all ok, the rest pending", () => {
  const { status, reached, extra } = alignRecitation(splitWords("عم يتساءلون عن النبإ العظيم"), EXPECTED);
  assert.deepEqual(status, ["ok", "ok", "ok", "ok", "ok", "pending", "pending", "pending", "pending"]);
  assert.equal(reached, 5);
  assert.equal(extra, 0);
});

test("a different word is wrong, a missed word is skipped", () => {
  const { status } = alignRecitation(splitWords("عم يتساءلون عن الخبر العظيم هم فيه"), EXPECTED);
  assert.deepEqual(status, ["ok", "ok", "ok", "wrong", "ok", "skipped", "ok", "ok", "pending"]);
});

test("an added word is counted as extra, not as a mistake on the passage", () => {
  const { status, extra } = alignRecitation(splitWords("عم يتساءلون عن عن النبإ"), EXPECTED);
  assert.deepEqual(status.slice(0, 4), ["ok", "ok", "ok", "ok"]);
  assert.equal(extra, 1);
});

test("nothing heard means nothing reached", () => {
  const { status, reached } = alignRecitation([], EXPECTED);
  assert.equal(reached, 0);
  assert.ok(status.every((s) => s === "pending"));
});

test("a word the model split in two still counts as right", () => {
  // The app compares against quran.com's plain spelling of each word.
  const expected = splitWords("لابثين فيها أحقابا");
  const { status, extra } = alignRecitation(splitWords("لَا بِسِينَ فِيهَا أَحْقَابًا"), expected);
  assert.deepEqual(status, ["ok", "ok", "ok"]);
  assert.equal(extra, 0);
});

test("opening letters recited by their names count as right", () => {
  const expected = splitWords("الم الله لا إله إلا هو");
  const { status, extra } = alignRecitation(splitWords("ألف لام ميم الله لا إله إلا هو"), expected);
  assert.deepEqual(status, ["ok", "ok", "ok", "ok", "ok", "ok"]);
  assert.equal(extra, 0);
});
