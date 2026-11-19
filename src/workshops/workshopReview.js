// The workshop review form's questions (aflaahqc.com/workshop-review?k=…),
// shared by the form (landing/WorkshopReviewPage.jsx) and Admin → Reviews →
// Workshop reviews. The values are what's saved; they must match the checks in
// supabase/migrations/20261126_workshop_reviews.sql.

import { WORKSHOPS } from "./workshops.js";

export * from "./reviewQuestions.js";

// The workshop a saved key (e.g. "namaadhu-2026-11") belongs to, or null.
export const workshopByKey = (key) => Object.values(WORKSHOPS).find((w) => w.key === key) || null;
export const WORKSHOP_CHOICES = Object.values(WORKSHOPS).map((w) => ({ key: w.key, name: `${w.title.join(" ")}`, label: w.label }));

