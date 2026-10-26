// Remarks and comments for the Dhivehi exam report. Teachers write them in
// English, in Dhivehi typed with Latin letters, or in Thaana; the site's
// Worker (/api/dhivehi, worker/dhivehi.js) turns them all into correct
// Dhivehi, and tidyThaana() fixes Thaana spacing and punctuation.

const THAANA = /[ހ-޿]/;
const LATIN = /[A-Za-z]/;

// Dhivehi punctuation and spacing: "،" "؟" "؛" instead of the Latin marks, no
// space before punctuation, single spaces between words.
export function tidyThaana(text) {
  if (!THAANA.test(text || "")) return text;
  return text
    .replace(/,/g, "،").replace(/\?/g, "؟").replace(/;/g, "؛")
    .replace(/[ \t]+([،؟؛.!:])/g, "$1")
    .replace(/([،؟؛])(?=\S)/g, "$1 ")
    .replace(/[ \t]{2,}/g, " ")
    .split("\n").map((l) => l.trim()).join("\n")
    .trim();
}

// Every written remark goes to the translator: Latin letters to be put into
// Dhivehi, Thaana to have its spelling checked.
const hasWords = (s) => Boolean(s && s.trim() && s.trim() !== "—");

// The exam with every remark and the comments in Dhivehi. Returns
// { exam, untranslated }, where untranslated counts texts with Latin letters
// left as written (translator not set up or not reachable).
export async function dhivehiRemarks(exam) {
  const texts = [...exam.questions.map((q) => q.remark || ""), exam.comments || ""];
  const todo = [...new Set(texts.filter(hasWords))];
  const done = new Map();
  if (todo.length) {
    try {
      // Loaded here so tidyThaana() also works outside the browser (tests).
      const { supabase } = await import("../supabaseClient.js");
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/dhivehi", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ texts: todo }),
      });
      const body = res.ok && (res.headers.get("Content-Type") || "").includes("json") ? await res.json() : null;
      if (body?.configured) todo.forEach((s, i) => done.set(s, body.texts[i]));
    } catch { /* offline or no Worker (local dev): leave them as written */ }
  }
  const fix = (s) => tidyThaana(done.get(s) ?? s);
  const untranslated = todo.filter((s) => !done.has(s) && LATIN.test(s)).length;
  return {
    exam: { ...exam, questions: exam.questions.map((q) => ({ ...q, remark: q.remark ? fix(q.remark) : q.remark })), comments: exam.comments ? fix(exam.comments) : exam.comments },
    untranslated,
  };
}
