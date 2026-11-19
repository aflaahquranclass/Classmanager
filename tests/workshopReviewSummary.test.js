import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeReviews, RATED } from "../src/workshops/reviewQuestions.js";

const row = (over = {}) => ({
  id: Math.random().toString(36).slice(2), created_at: "2026-11-19T15:00:00Z",
  topics: "very_good", flow: "very_good", presenter: "very_good", presentation: "very_good", length: "very_good",
  next_workshop: "yes", next_topic: null, comment: "Good", ...over,
});

test("summarizeReviews: no answers", () => {
  const s = summarizeReviews([]);
  assert.equal(s.total, 0);
  assert.equal(s.positivePct, 0);
  assert.equal(s.rated.length, RATED.length);
  assert.ok(s.rated.every((q) => q.counts.every((c) => c.n === 0 && c.pct === 0)));
  assert.equal(s.lastAt, null);
});

test("summarizeReviews: counts, whole percents and the holiday question", () => {
  const s = summarizeReviews([
    row(),
    row({ topics: "good", next_workshop: "after_school" }),
    row({ topics: "improve", length: "improve", next_workshop: "other_topic" }),
  ]);
  assert.equal(s.total, 3);
  const topics = s.rated.find((q) => q.key === "topics").counts;
  assert.deepEqual(topics.map((c) => [c.value, c.n, c.pct]), [["very_good", 1, 33], ["good", 1, 33], ["improve", 1, 33]]);
  const length = s.rated.find((q) => q.key === "length").counts;
  assert.deepEqual(length.map((c) => c.n), [2, 0, 1]);
  assert.deepEqual(s.next.counts.map((c) => [c.value, c.n]), [["yes", 1], ["after_school", 1], ["other_topic", 1]]);
  // 15 ratings, 2 of them "could be better"
  assert.equal(s.positivePct, Math.round((13 / 15) * 100));
});

test("summarizeReviews: topics and comments, newest first, blanks left out", () => {
  const s = summarizeReviews([
    row({ id: "a", created_at: "2026-11-19T10:00:00Z", next_topic: "  Wudu  ", comment: "first" }),
    row({ id: "b", created_at: "2026-11-19T12:00:00Z", next_topic: "   ", comment: "second" }),
    row({ id: "c", created_at: "2026-11-19T11:00:00Z", next_topic: "Fasting", comment: "third" }),
  ]);
  assert.deepEqual(s.topics.map((t) => t.text), ["Fasting", "Wudu"]);
  assert.deepEqual(s.comments.map((c) => c.id), ["b", "c", "a"]);
  assert.equal(s.lastAt, "2026-11-19T12:00:00Z");
});
