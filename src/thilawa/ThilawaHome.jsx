import { ListChecks, BookMarked, LineChart, Play, PenLine, CheckCircle2, ChevronRight, BookOpen, Mic, Highlighter } from "lucide-react";
import { describePages, readingTitle } from "./engine.js";
import { HOME_CSS, NextStepButton, QuickTiles } from "../StudentHome.jsx";

// The Thilawa student's dashboard. One "Today" card with everything from
// class: the ayahs the class recites (today's, or the last marked until the
// teacher marks another, and the next one), the words to correct and the
// letters from the student's last recitation, and one button to the class
// Mushaf. Without a class reading, the "do this next" button instead. Then
// four buttons — Class, Teacher's Reading, Free Reading, Progress — and the
// hadith. Each of those pages has one job (see ThilawaStudent.jsx and
// ClassThilawa.jsx), so nothing here repeats them.

const fmtShort = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
// "An-Naba 17–30": the surah and ayahs, not the teacher's instructions.
const readingName = (a) => describePages(a.fromPage, a.toPage).split(" · ")[0];

const CSS = `
  .thh .sh-tiles { grid-template-columns: repeat(4, 1fr); }
  .thh-today { padding: 0 !important; overflow: hidden; }
  .thh-today-head { display: flex; align-items: center; gap: 12px; padding: 16px 18px; color: #FFFFFF; background: linear-gradient(120deg, #0D4F85 0%, #176FD1 55%, #0A94B1 100%); }
  .thh-today-head > span:first-child { flex-shrink: 0; width: 44px; height: 44px; border-radius: 13px; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center; }
  .thh-today-head div { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .thh-today-head small { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85; }
  .thh-today-head b { font-size: 19px; line-height: 1.25; overflow-wrap: anywhere; }
  .thh-rows { display: flex; flex-direction: column; padding: 4px 18px; }
  .thh-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-top: 1px solid #EEF3F8; }
  .thh-row:first-child { border-top: none; }
  .thh-row-icon { flex-shrink: 0; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .thh-row > div { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .thh-row small { font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #6B819A; }
  .thh-row b { font-size: 16px; color: #123B67; overflow-wrap: anywhere; }
  .thh-row span.thh-sub { font-size: 13px; color: #6B819A; }
  .thh-rec { background: #E9F7F1; color: #13795B; }
  .thh-next { color: #7A4FD0; }
  .thh-words { background: #FFF0EC; color: #A5432C; }
  .thh-ok { background: #DFF5E6; color: #1E7A43; }
  .thh-letters-icon { background: #FFF1E4; color: #B4530A; font: 500 16px/1 "Noto Naskh Arabic", "Geeza Pro", serif; }
  .thh-letters { display: flex; flex-wrap: wrap; gap: 6px; direction: rtl; justify-content: flex-end; }
  .thh-letters i { font-style: normal; display: inline-flex; align-items: center; justify-content: center; min-width: 34px; height: 34px; border-radius: 10px; background: #E8650A; color: #FFFFFF; font: 500 20px/1 "Noto Naskh Arabic", "Geeza Pro", serif; }
  .thh-waiting { background: #EAF3FD; color: #176FD1; }
  .thh-row-link { width: 100%; font: inherit; text-align: left; background: none; border: none; border-top: 1px solid #EEF3F8; cursor: pointer; color: inherit; }
  .thh-go { display: flex; padding: 4px 18px 18px; }
  .thh-go .hz-btn, .thh-go button { flex: 1; min-height: 50px; font-size: 16px; }
  .thh-go-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: none; border-radius: 14px; color: #FFFFFF; font-weight: 700; cursor: pointer;
    background: linear-gradient(120deg, #0D4F85 0%, #176FD1 60%); box-shadow: 0 10px 22px rgba(23,111,209,0.28); }
  .thh-go-btn:focus-visible { outline: 3px solid #176FD1; outline-offset: 2px; }
`;

// Without a class reading: the teacher's reading waiting, else the words to
// correct, else carry on free reading.
function nextStep(data) {
  const waiting = data.assignments.find((a) => !a.completedAt);
  if (waiting) {
    const more = data.openAssignments - 1;
    return { view: "thilawa-assigned", Icon: Play, kicker: "Teacher's reading", title: `${readingName(waiting)} is waiting${more > 0 ? ` (+${more} more)` : ""}`, go: "Start" };
  }
  if (data.lastMarks.length) {
    const n = data.lastMarks.length;
    return { view: "thilawa-class", Icon: PenLine, kicker: "Practise", title: `${n} word${n === 1 ? "" : "s"} to correct`, go: "Open" };
  }
  return { view: "thilawa-free", Icon: BookMarked, kicker: "Free reading", title: `Carry on from page ${data.nextFreePage}`, go: "Read" };
}

// classReading: the class's open reading (null: none; undefined: still loading
// or no class). recitations: what the class recites (repos.js listRecitations).
export default function ThilawaHome({ data, classReading, recitations = [], onGo, children }) {
  const tiles = [
    { view: "thilawa-class", label: "Class", Icon: BookOpen },
    { view: "thilawa-assigned", label: "Teacher's Reading", Icon: ListChecks, dot: data?.openAssignments || 0 },
    { view: "thilawa-free", label: "Free Reading", Icon: BookMarked },
    { view: "thilawa", label: "Progress", Icon: LineChart },
  ];
  const part = recitations.find((r) => r.kind !== "next") || null;
  const nextPart = recitations.find((r) => r.kind === "next") || null;
  const a = data?.lastRecitation || null;
  const words = data?.lastMarks.length ?? 0;
  const letters = a?.letters || [];
  const waiting = data?.openAssignments || 0;

  return (
    <div className="sh thh">
      <style>{HOME_CSS + CSS}</style>
      {classReading ? (
        <section className="sp-card thh-today" aria-label="Today">
          <header className="thh-today-head">
            <span aria-hidden="true"><BookOpen size={22} /></span>
            <div><small>Today · Class</small><b>{readingTitle(classReading)}</b></div>
          </header>
          <div className="thh-rows">
            {(part || nextPart) && (
              <div className="thh-row">
                <span className="thh-row-icon thh-rec" aria-hidden="true"><Mic size={18} /></span>
                <div>
                  <small>Recite</small>
                  <b>{(part || nextPart).label}</b>
                  {part && (
                    <span className="thh-sub">{part.recitedOn === data?.today ? "Today" : fmtShort(part.recitedOn)}
                      {nextPart && <> · <span className="thh-next">Next: {nextPart.label}</span></>}</span>
                  )}
                </div>
              </div>
            )}
            {a && (
              <div className="thh-row">
                <span className={`thh-row-icon ${words ? "thh-words" : "thh-ok"}`} aria-hidden="true">{words ? <Highlighter size={18} /> : <CheckCircle2 size={18} />}</span>
                <div>
                  <small>Words to correct</small>
                  <b>{words || "MashaAllah"}</b>
                </div>
              </div>
            )}
            {letters.length > 0 && (
              <div className="thh-row">
                <span className="thh-row-icon thh-letters-icon" aria-hidden="true" lang="ar">أب</span>
                <div>
                  <small>Letters to practise</small>
                  <div className="thh-letters">{letters.map((l) => <i key={l} lang="ar">{l}</i>)}</div>
                </div>
              </div>
            )}
            {waiting > 0 && (
              <button type="button" className="thh-row thh-row-link" onClick={() => onGo("thilawa-assigned")}>
                <span className="thh-row-icon thh-waiting" aria-hidden="true"><ListChecks size={18} /></span>
                <div><small>Teacher's Reading</small><b>{waiting} waiting</b></div>
                <ChevronRight size={18} color="#176FD1" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="thh-go">
            <button type="button" className="thh-go-btn" onClick={() => onGo("thilawa-class")}><BookOpen size={20} aria-hidden="true" />Open the class Mushaf</button>
          </div>
        </section>
      ) : (
        <NextStepButton step={data && classReading !== undefined ? (() => { const s = nextStep(data); return { ...s, onClick: () => onGo(s.view) }; })() : null} loading="Loading your Thilawa…" />
      )}
      <QuickTiles tiles={tiles.map((t) => ({ ...t, key: t.view, onClick: () => onGo(t.view) }))} />
      {children}
    </div>
  );
}
