// The workshop review form's questions and answers, and summarizeReviews()
// which counts them up. No imports, so the tests can load it on their own.
// The values are what's saved; they must match the checks in
// supabase/migrations/20261126_workshop_reviews.sql.

export const RATINGS = [
  { value: "very_good", dv: "ވަރަށް ރަނގަޅު", en: "Very good", color: "#1E7A4C", bg: "#E3F5EA" },
  { value: "good", dv: "ރަނގަޅު", en: "Good", color: "#176FD1", bg: "#E6F0FB" },
  { value: "improve", dv: "ރަނގަޅުކޮށްލަން ފެނޭ", en: "Could be better", color: "#9C6B12", bg: "#FDF3DC" },
];

// Each is a column of workshop_reviews.
export const RATED = [
  { key: "topics", dv: "ސެޝަންގައި އަލިއަޅުވާލި ބައިތައް", en: "Topics covered" },
  { key: "flow", dv: "ސެޝަން ކުރިއަށް ދިޔަ ގޮތް", en: "How the session went" },
  { key: "presenter", dv: "އުސްތާޛުގެ ހުށަހަޅައިދިނުން", en: "The teacher's presentation" },
  { key: "presentation", dv: "ސެޝަންގައި ބޭނުންކުރެވުނު ޕްރެޒެންޓޭޝަން", en: "Slides used in the session" },
  { key: "length", dv: "ސެޝަންގެ ދިގުމިން", en: "Length of the session" },
];

export const NEXT_QUESTION = { dv: "ޗުއްޓީގައި ނަމާދުގެ ފިޤްހާ ގުޅޭ ވޯކްޝޮޕެއް ކުރިއަށް ގެންދިއުމަށް", en: "A prayer-fiqh workshop in the holidays" };
export const NEXT_CHOICES = [
  { value: "yes", dv: "ފެނޭ", en: "Yes" },
  { value: "after_school", dv: "ސުކޫލްގެ ކިޔެވުން ފެށުމުން ކުރިއަށް ގެންދަން ފެނޭ", en: "When school starts" },
  { value: "other_topic", dv: "އެހެން މައުޟޫޢެއްގައި ކުރިއަށް ގެންދަން ފެނޭ", en: "On another topic" },
];

export const NEXT_TOPIC_LABEL = { dv: "މިފަދަ އިތުރު ވޯކްޝޮޕެއް ގެނެސްދޭނަމަ އަލިއަޅުވާލަން ބޭނުންވާ މައުޟޫޢު", en: "Topic for another workshop" };
export const COMMENT_LABEL = { dv: "މި ވޯކްޝޮޕާމެދު ދެކޭ ގޮތް", en: "What they thought of the workshop" };

export const ratingOf = (value) => RATINGS.find((r) => r.value === value);
export const nextChoiceOf = (value) => NEXT_CHOICES.find((c) => c.value === value);

// The answers counted up, for the admin tab and the PDF: for each question,
// how many chose each answer and what share of all answers that is (whole
// percent), plus the topics asked for and the comments, newest first.
// rows: workshop_reviews rows.
export function summarizeReviews(rows) {
  const total = rows.length;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  const count = (field, choices) => choices.map((c) => {
    const n = rows.filter((r) => r[field] === c.value).length;
    return { ...c, n, pct: pct(n) };
  });
  const rated = RATED.map((q) => ({ ...q, counts: count(q.key, RATINGS) }));
  // Every "very good" or "good" over every rating given.
  const positive = rated.reduce((a, q) => a + q.counts[0].n + q.counts[1].n, 0);
  const newest = [...rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return {
    total,
    rated,
    positivePct: total ? Math.round((positive / (total * RATED.length)) * 100) : 0,
    next: { ...NEXT_QUESTION, counts: count("next_workshop", NEXT_CHOICES) },
    topics: newest.filter((r) => r.next_topic?.trim()).map((r) => ({ id: r.id, text: r.next_topic.trim(), at: r.created_at })),
    comments: newest.filter((r) => r.comment?.trim()).map((r) => ({ id: r.id, text: r.comment.trim(), at: r.created_at })),
    lastAt: newest[0]?.created_at || null,
  };
}
