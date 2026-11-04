import { ListChecks, BookMarked, LineChart, CalendarCheck, FileText, Wallet, Play, PenLine, CheckCircle2, ChevronRight } from "lucide-react";
import { describePages } from "./engine.js";

// The Thilawa student's dashboard: one big "do this next" button, six
// buttons to every page, a small card for the last recitation and the
// hadith. The full Mushaf page, levels and teacher's notes live on
// "My progress" (the Thilawa tracker page).

const fmtShort = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
// "An-Naba 17–30": the surah and ayahs, not the teacher's instructions.
const readingName = (a) => describePages(a.fromPage, a.toPage).split(" · ")[0];

const CSS = `
  .thh { display: flex; flex-direction: column; gap: 12px; }
  .thh-label { margin: 10px 2px 0; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6B819A; }
  .thh-next {
    display: flex; align-items: center; gap: 14px; width: 100%; padding: 18px 20px; border-radius: 16px; font: inherit; text-align: left;
    cursor: pointer; color: #FFFFFF; border: none;
  }
  .thh-next:focus-visible { outline: 3px solid #176FD1; outline-offset: 3px; }
  .thh-next-icon { flex-shrink: 0; width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.22); }
  .thh-next-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .thh-next-text small { font-size: 12px; opacity: 0.75; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
  .thh-next-text b { font-size: 18px; font-weight: 700; line-height: 1.3; letter-spacing: -0.01em; }
  .thh-next-go { flex-shrink: 0; background: #FFFFFF; color: #0D4F85; font-weight: 700; font-size: 14px; border-radius: 10px; padding: 10px 18px; }

  .thh-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  @media (min-width: 1100px) { .thh-tiles { grid-template-columns: repeat(6, 1fr); } }
  .thh-tile {
    position: relative; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 18px 6px 16px; border-radius: 16px;
    font: inherit; font-size: 13.5px; font-weight: 600; color: #1F3A5A; text-align: center; cursor: pointer;
  }
  .thh-tile:focus-visible { outline: 3px solid #176FD1; outline-offset: 2px; }
  /* One accent colour for every button; red is kept for "waiting" only. */
  .thh-ic { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: #EEF4FB; color: #176FD1; }
  .thh-dot {
    position: absolute; top: 8px; right: 10px; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px;
    background: #E5484D; color: #FFFFFF; font-size: 11px; font-weight: 700; box-shadow: 0 0 0 2px #FFFFFF; display: flex; align-items: center; justify-content: center;
  }

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
    .thh-next { padding: 16px; gap: 12px; }
    .thh-next-icon { width: 44px; height: 44px; }
    .thh-next-text b { font-size: 16px; }
    .thh-next-go { padding: 9px 14px; font-size: 14px; }
    .thh-tiles { gap: 8px; }
    .thh-tile { font-size: 12.5px; padding: 14px 4px 12px; gap: 8px; }
    .thh-ic { width: 40px; height: 40px; }
    .thh-dot { right: 8px; }
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
    <div className="thh">
      <style>{CSS}</style>

      {step ? (
        <button type="button" className="thh-next sp-grad" onClick={() => onGo(step.view)}>
          <span className="thh-next-icon" aria-hidden="true"><step.Icon size={22} /></span>
          <span className="thh-next-text"><small>{step.kicker}</small><b>{step.title}</b></span>
          <span className="thh-next-go" aria-hidden="true">{step.go}</span>
        </button>
      ) : (
        <section className="sp-card hz-muted" style={{ padding: 18 }}>Loading your Thilawa…</section>
      )}

      <h2 className="thh-label">Quick access</h2>
      <nav className="thh-tiles" aria-label="Quick access">
        {tiles.map(({ view, label, Icon, dot }) => (
          <button key={view} type="button" className="thh-tile sp-card" onClick={() => onGo(view)}>
            {dot > 0 && <span className="thh-dot" aria-label={`${dot} waiting`}>{dot}</span>}
            <span className="thh-ic" aria-hidden="true"><Icon size={21} strokeWidth={1.9} /></span>
            {label}
          </button>
        ))}
      </nav>

      {data && <h2 className="thh-label">Recent</h2>}
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
