// Teachers Portal demo, localhost only (?portal=teacher&demo=1): the Thilawa
// and Hifz sections with sample classes and students kept in this browser's
// memory. No sign-in, nothing is saved to the database, a reload starts over.

import { useState, useCallback } from "react";
import { BookOpenCheck, BookOpenText, FlaskConical } from "lucide-react";
import { TeacherThilawa } from "./thilawa/ThilawaTeacher.jsx";
import { TeacherHifz } from "./hifz/HifzTeacher.jsx";
import { createThilawaMemoryStore, createMemoryThilawaRepo, createClassMemoryStore, createMemoryClassRepo } from "./thilawa/repos.js";
import { createHifzMemoryStore, createMemoryHifzRepo } from "./hifz/taskRepos.js";
import { ayahPages } from "./thilawa/engine.js";
import { pageToUnit } from "./hifz/quran.js";
import { maldivesToday } from "./dates.js";
import { SplashDone } from "./splash.jsx";

const TEACHER = "demo-teacher";
const EVERY_DAY = { days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
const student = (id, name, code, classId, className, program) => ({ id, name, studentCode: code, classId, className, programs: [program], schedule: EVERY_DAY, teacherId: TEACHER });

const THILAWA_STUDENTS = [
  student("th-1", "Aishath Rasheed", "AQC-101", "demo-th-a", "Thilawa Class A", "thilawa"),
  student("th-2", "Ibrahim Naseem", "AQC-102", "demo-th-a", "Thilawa Class A", "thilawa"),
  student("th-3", "Mariyam Shifa", "AQC-103", "demo-th-a", "Thilawa Class A", "thilawa"),
  student("th-4", "Yoosuf Ali", "AQC-104", "demo-th-a", "Thilawa Class A", "thilawa"),
];
const HIFZ_STUDENTS = [
  student("hz-1", "Ahmed Faisal", "AQC-201", "demo-hz-b", "Hifz Class B", "hifz"),
  student("hz-2", "Fathimath Zaha", "AQC-202", "demo-hz-b", "Hifz Class B", "hifz"),
  student("hz-3", "Hassan Shiyam", "AQC-203", "demo-hz-b", "Hifz Class B", "hifz"),
];

// ---------- sample data ----------
const thilawaStore = createThilawaMemoryStore();
const classStore = createClassMemoryStore();
const hifzStore = createHifzMemoryStore();

(async () => {
  // Thilawa Class A: Al-Mulk 1–15 open for the class, stopped on page 563, two topics.
  const cls = createMemoryClassRepo(classStore, "demo-th-a", { teacherId: TEACHER });
  const mulk = ayahPages(67, 1, 15);
  await cls.openReading({ fromPage: mulk.fromPage, toPage: mulk.toPage, firstAyah: mulk.first, lastAyah: mulk.last, label: mulk.label, page: 563 });
  await cls.addTopic({ topic: "Noon sakinah and tanween: Ikhfa", note: "15 letters. Practise with Al-Mulk 1–5.", taughtOn: "2026-11-03" });
  await cls.addTopic({ topic: "Madd tabee'i", note: "", taughtOn: "2026-11-05" });
  const levels = [[55, 60], [70, 65], [40, 50], [80, 75]];
  for (const [i, s] of THILAWA_STUDENTS.entries()) {
    const t = createMemoryThilawaRepo(thilawaStore, s.id, { teacherId: TEACHER });
    await t.addAssessment({ tajweed: levels[i][0], fluency: levels[i][1], comment: "" });
  }
  // Ibrahim finished the reading his teacher set: waiting to be listened to.
  const ib = createMemoryThilawaRepo(thilawaStore, "th-2", { teacherId: TEACHER });
  const set = await ib.addAssignment({ fromPage: 582, toPage: 582, instructions: "An-Naba 1–16. Watch the ghunnah.", dueDate: null });
  await ib.setAssignmentDone(set.id, true);

  // Hifz Class B: a plan and today's three tasks each; Ahmed has finished Short Muraja'ah.
  const today = maldivesToday();
  const plans = [
    { start: 570, known: [[562, 570], [582, 605]], short: [568, 570], long: [582, 584] },
    { start: 590, known: [[582, 590]], short: [589, 590], long: [582, 583] },
    { start: 25, known: [[2, 25]], short: [23, 25], long: [2, 4] },
  ];
  for (const [i, s] of HIFZ_STUDENTS.entries()) {
    const p = plans[i];
    const h = createMemoryHifzRepo(hifzStore, s.id, { teacherId: TEACHER });
    await h.saveProfile({
      memorized: p.known.map(([a, b]) => [pageToUnit(a), pageToUnit(b)]),
      direction: p.start > 500 ? "juz_reverse" : "forward", startUnit: pageToUnit(p.start), newUnits: 30, shortPages: 2,
      longStartUnit: pageToUnit(p.long[0]), longMode: "pages", longPages: 2,
    });
    await h.addTasks([
      { taskDate: today, activity: "short", start: pageToUnit(p.short[0]), end: pageToUnit(p.short[1]), notes: "" },
      { taskDate: today, activity: "new", start: pageToUnit(p.start), end: pageToUnit(p.start + 1), notes: i === 0 ? "Read it 10 times before memorising." : "" },
      { taskDate: today, activity: "long", start: pageToUnit(p.long[0]), end: pageToUnit(p.long[1]), notes: "" },
    ]);
  }
  const ahmed = createMemoryHifzRepo(hifzStore, "hz-1", { teacherId: TEACHER });
  const short = (await ahmed.listTasks()).find((t) => t.activity === "short");
  await ahmed.setStudentDone(short.id, true);
})();

const CSS = `
  .td { min-height: 100vh; background: #F4F8FC; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #123B67; }
  .td-top { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 20px; color: #FFFFFF;
    background: linear-gradient(90deg, #0D4F85 0%, #176FD1 55%, #0A94B1 100%); box-shadow: 0 4px 16px rgba(13,40,70,0.18); }
  .td-top b { font-size: 17px; }
  .td-tag { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.18); font-size: 12px; font-weight: 700; }
  .td-tabs { margin-left: auto; display: flex; gap: 6px; }
  .td-tabs button { display: inline-flex; align-items: center; gap: 7px; min-height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.4); background: rgba(255,255,255,0.12); color: #FFFFFF; font: inherit; font-weight: 700; font-size: 14px; cursor: pointer; }
  .td-tabs button[aria-pressed="true"] { background: #FFFFFF; color: #0D4F85; border-color: #FFFFFF; }
  .td-body { max-width: 1200px; margin: 0 auto; padding: 20px 16px 40px; }
  .td-note { margin: 0 0 16px; font-size: 13px; color: #567493; }
  @media (max-width: 560px) { .td-tabs { margin-left: 0; width: 100%; } .td-tabs button { flex: 1; justify-content: center; } }
`;

export default function TeacherDemo() {
  const [tab, setTab] = useState("thilawa");
  const thilawaRepo = useCallback((id) => createMemoryThilawaRepo(thilawaStore, id, { teacherId: TEACHER }), []);
  const classRepo = useCallback((id) => createMemoryClassRepo(classStore, id, { teacherId: TEACHER }), []);
  const hifzRepo = useCallback((id) => createMemoryHifzRepo(hifzStore, id, { teacherId: TEACHER }), []);
  return (
    <div className="td">
      <style>{CSS}</style>
      <SplashDone />
      <header className="td-top">
        <b>Teachers Portal</b>
        <span className="td-tag"><FlaskConical size={14} aria-hidden="true" />Demo · nothing is saved</span>
        <nav className="td-tabs" aria-label="Sections">
          <button type="button" aria-pressed={tab === "thilawa"} onClick={() => setTab("thilawa")}><BookOpenCheck size={17} aria-hidden="true" />Thilawa</button>
          <button type="button" aria-pressed={tab === "hifz"} onClick={() => setTab("hifz")}><BookOpenText size={17} aria-hidden="true" />Hifz</button>
        </nav>
      </header>
      <main className="td-body">
        {tab === "thilawa"
          ? <TeacherThilawa students={THILAWA_STUDENTS} teacherId={TEACHER} makeRepo={thilawaRepo} makeClassRepo={classRepo} />
          : <TeacherHifz students={HIFZ_STUDENTS} teacherId={TEACHER} makeRepo={hifzRepo} />}
      </main>
    </div>
  );
}
