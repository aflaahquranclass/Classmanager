// The workshop review form's questions (aflaahqc.com/workshop-review?k=…),
// shared by the form (landing/WorkshopReviewPage.jsx) and Admin → Reviews →
// Workshop reviews. The values are what's saved; they must match the checks in
// supabase/migrations/20261126_workshop_reviews.sql.

import { WORKSHOPS } from "./workshops.js";

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

// The workshop a saved key (e.g. "namaadhu-2026-11") belongs to, or null.
export const workshopByKey = (key) => Object.values(WORKSHOPS).find((w) => w.key === key) || null;
export const WORKSHOP_CHOICES = Object.values(WORKSHOPS).map((w) => ({ key: w.key, name: `${w.title.join(" ")}`, label: w.label }));

export const ratingOf = (value) => RATINGS.find((r) => r.value === value);
export const nextChoiceOf = (value) => NEXT_CHOICES.find((c) => c.value === value);
