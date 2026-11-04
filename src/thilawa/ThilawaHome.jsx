import { ListChecks, BookMarked, LineChart, CalendarCheck, FileText, Wallet, Play, PenLine, CheckCircle2, ChevronRight } from "lucide-react";
import { describePages } from "./engine.js";
import { HOME_CSS, NextStepButton, QuickTiles } from "../StudentHome.jsx";

// The Thilawa student's dashboard: one big "do this next" button, six
// buttons to every page, a small card for the last recitation and the
// hadith. The full Mushaf page, levels and teacher's notes live on
// "My progress" (the Thilawa tracker page).

const fmtShort = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
// "An-Naba 17–30": the surah and ayahs, not the teacher's instructions.
const readingName = (a) => describePages(a.fromPage, a.toPage).split(" · ")[0];

const CSS = `
  .thh-recite { display: flex; align-items: center; gap: 14px; width: 100%; padding: 14px 16px; font: inherit; text-align: left; cursor: pointer; color: #123B67; }
  .thh-recite:focus-visible { outline: 3px solid #176FD1; outline-offset: 2px; }
  .thh-page { flex-shrink: 0; width: 42px; height: 54px; border-radius: 6px; background: #FBF6EA; border: 1px solid #E8DCC0; display: flex; flex-direction: column; justify-content: center; gap: 5px; padding: 7px; box-sizing: border-box; }
  .thh-page i { display: block; height: 3px; border-radius: 2px; background: #CDBF9F; }
  .thh-page i.thh-mark { background: #F2A595; }
  .thh-recite-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .thh-recite-text b { font-size: 15px; font-weight: 600; color: #1F3A5A; }
  .thh-recite-text span { font-size: 13px; color: #6B819A; }
  .thh-badge { flex-shrink: 0; font-size: 12px; font-weight: 600; border-radius: 999px; padding: 5px 11px; white-space: nowrap; }
  .thh-badge-red { background: #FCE4E4; color: #B23B3B; }
  .thh-badge-ok { background: #DFF5E6; color: #1E7A43; }
  @media (max-width: 520px) {
    .thh-recite { padding: 12px 14px; gap: 12px; }
    .thh-recite > svg:last-child { display: none; }
  }
`;

// What the student should do now: the teacher's reading waiting, else the
// words to correct from the last recitation, else carry on free reading.
function nextStep(data) {
  const waiting = data.assignments.find((a) => !a.completedAt);
  if (waiting) {
    const more = data.openAssignments - 1;
    return { view: "thilawa-assigned", Icon: Play, kicker: "Teacher's reading", title: `${readingName(waiting)} is waiting${more > 0 ? ` (+${more} more)` : ""}`, go: "Start" };
  }
  if (data.lastMarks.length) {
    const n = data.lastMarks.length;
    return { view: "thilawa", Icon: PenLine, kicker: "Practise", title: `${n} word${n === 1 ? "" : "s"} to correct from your last recitation`, go: "Open" };
  }
  return { view: "thilawa-free", Icon: BookMarked, kicker: "Free reading", title: `Carry on from page ${data.nextFreePage}`, go: "Read" };
}

export default function ThilawaHome({ data, onGo, children }) {
  const step = data ? nextStep(data) : null;
  const a = data?.lastRecitation;
  const marks = data?.lastMarks.length ?? 0;
  const tiles = [
    { view: "thilawa-assigned", label: "Teacher's reading", Icon: ListChecks, dot: data?.openAssignments || 0 },
    { view: "thilawa-free", label: "Free reading", Icon: BookMarked },
    { view: "thilawa", label: "My progress", Icon: LineChart },
    { view: "attendance", label: "Attendance", Icon: CalendarCheck },
    { view: "exams", label: "Exams", Icon: FileText },
    { view: "finance", label: "Fees", Icon: Wallet },
  ];

  return (
    <div className="sh">
      <style>{HOME_CSS + CSS}</style>
      <NextStepButton step={step && { ...step, onClick: () => onGo(step.view) }} loading="Loading your Thilawa…" />
      <QuickTiles tiles={tiles.map((t) => ({ ...t, key: t.view, onClick: () => onGo(t.view) }))} />

      {data && <h2 className="sh-label">Recent</h2>}
      {data && (
        <button type="button" className="thh-recite sp-card" onClick={() => onGo("thilawa")}>
          <span className="thh-page" aria-hidden="true"><i /><i className={marks ? "thh-mark" : ""} /><i /><i /><i className={marks > 1 ? "thh-mark" : ""} /><i /></span>
          <span className="thh-recite-text">
            <b>Last recitation</b>
            <span>{a ? `${readingName(a)} · ${fmtShort(a.checkedAt || a.createdAt)}` : "Your teacher hasn't listened yet"}</span>
          </span>
          {a && (marks
            ? <span className="thh-badge thh-badge-red">{marks} to correct</span>
            : <span className="thh-badge thh-badge-ok"><CheckCircle2 size={12} aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 4 }} />MashaAllah</span>)}
          <ChevronRight size={18} color="#176FD1" aria-hidden="true" style={{ flexShrink: 0 }} />
        </button>
      )}

      {children}
    </div>
  );
}
