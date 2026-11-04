import { useEffect, useState } from "react";
import { CalendarDays, ClipboardCheck, FileText, BookOpen, BookOpenCheck, Users, ChevronRight, Sun } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { fmtTime, fmtDate } from "../exams/ExamUI.jsx";

// Teacher Portal home: a banner with the teacher's student and class counts,
// one button per portal page, today's classes with their attendance state,
// and the teacher's next scheduled exams. Everything except the exams is
// worked out by App (it already holds the students, schedule and
// attendance); this component only lays it out.

const BUTTONS = [
  { key: "hifz", label: "Hifz", icon: BookOpen, tone: "lav" },
  { key: "thilawa", label: "Thilawa", icon: BookOpenCheck, tone: "aqua" },
  { key: "students", label: "Students", icon: Users, tone: "rose" },
  { key: "timetable", label: "Timetable", icon: CalendarDays, tone: "blue" },
  { key: "attendance", label: "Attendance", icon: ClipboardCheck, tone: "green" },
  { key: "exams", label: "Exams", icon: FileText, tone: "amber" },
];

const STATE_PILL = {
  marked: { label: "Marked", cls: "td-pill-ok" },
  now: { label: "Now", cls: "td-pill-now" },
  unmarked: { label: "Not marked", cls: "td-pill-wait" },
  upcoming: { label: "Later", cls: "td-pill-later" },
};

const CSS = `
  .td-hero {
    position: relative; z-index: 1; overflow: hidden; display: flex; justify-content: space-between; align-items: center;
    gap: 20px; flex-wrap: wrap; padding: 24px 26px; border-radius: 20px; color: #FFFFFF;
    background: linear-gradient(90deg, #0D4F85 0%, #176FD1 55%, #0A94B1 100%); box-shadow: 0 12px 28px rgba(13,79,133,0.25);
  }
  .td-hero::after {
    content: ""; position: absolute; right: -70px; top: -70px; width: 240px; height: 240px; border-radius: 50%;
    border: 32px solid rgba(255,255,255,0.07); pointer-events: none;
  }
  .td-hello { margin: 0; font-size: clamp(20px, 2.4vw, 26px); font-weight: 700; line-height: 1.25; }
  .td-sub { margin: 6px 0 0; font-size: 14px; opacity: 0.88; }
  .td-nums { position: relative; z-index: 1; display: flex; gap: 12px; }
  .td-num {
    min-width: 112px; padding: 12px 18px; border-radius: 14px; text-align: center; color: #FFFFFF; font-family: inherit;
    background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.28); cursor: pointer;
  }
  .td-num:hover { background: rgba(255,255,255,0.22); }
  .td-num:focus-visible { outline: 2px solid #FFFFFF; outline-offset: 2px; }
  .td-num b { display: block; font-size: 32px; line-height: 1; font-weight: 800; }
  .td-num span { font-size: 12.5px; opacity: 0.88; }

  .td-buttons { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-top: 18px; }
  .td-btn {
    display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 18px 8px; border-radius: 18px;
    background: #FFFFFF; border: 1px solid #C7DDF4; box-shadow: 0 10px 30px rgba(18,59,103,0.08); cursor: pointer;
    font-family: inherit; font-size: 14px; font-weight: 700; color: #123B67; transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .td-btn:hover { border-color: #AFCFEC; box-shadow: 0 10px 30px rgba(18,59,103,0.14); }
  .td-btn:focus-visible { outline: 2px solid #176FD1; outline-offset: 2px; }
  .td-ic { width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .td-blue { background: #E4F1FC; color: #176FD1; }
  .td-green { background: #DFF5E6; color: #1E7A43; }
  .td-amber { background: #FFF1D6; color: #A86A00; }
  .td-lav { background: #EDE3FA; color: #6A3FA0; }
  .td-aqua { background: #DAF3F1; color: #0F7A78; }
  .td-rose { background: #FCE4E4; color: #B23B3B; }

  .td-cols { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 18px; }
  .td-sec { display: flex; align-items: center; gap: 10px; margin: 24px 0 12px; font-size: 16px; font-weight: 700; color: #123B67; }
  .td-sec::after { content: ""; flex: 1; height: 1px; background: #C7DDF4; }
  .td-list { padding: 4px 16px; }
  .td-row {
    display: flex; align-items: center; gap: 12px; width: 100%; padding: 13px 0; border: none; border-bottom: 1px solid #E4EFF9;
    background: transparent; font-family: inherit; font-size: 14px; color: #123B67; text-align: left;
  }
  .td-row:last-child { border-bottom: none; }
  button.td-row { cursor: pointer; }
  button.td-row:hover .td-row-name { color: #176FD1; }
  button.td-row:focus-visible { outline: 2px solid #176FD1; outline-offset: 2px; border-radius: 6px; }
  .td-time { width: 132px; flex-shrink: 0; font-weight: 700; white-space: nowrap; }
  .td-row-name { flex: 1; min-width: 0; font-weight: 600; }
  .td-row-name small { display: block; font-weight: 400; font-size: 12.5px; color: #567493; }
  .td-pill { flex-shrink: 0; font-size: 12px; font-weight: 700; padding: 4px 11px; border-radius: 999px; white-space: nowrap; }
  .td-pill-ok { background: #DFF5E6; color: #1E7A43; }
  .td-pill-wait { background: #FFF1D6; color: #A86A00; }
  .td-pill-later { background: #EAF3FC; color: #123B67; }
  .td-pill-now { background: linear-gradient(90deg, #0D4F85 0%, #176FD1 55%, #0A94B1 100%); color: #FFFFFF; }
  .td-empty { padding: 16px 2px; font-size: 14px; color: #567493; display: flex; align-items: center; gap: 8px; }

  @media (max-width: 1100px) {
    .td-buttons { grid-template-columns: repeat(3, 1fr); }
    .td-cols { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 640px) {
    .td-hero { padding: 18px; flex-direction: column; align-items: stretch; }
    .td-nums { width: 100%; }
    .td-num { flex: 1; min-width: 0; padding: 10px; }
    .td-buttons { gap: 8px; }
    .td-btn { padding: 14px 4px; font-size: 12.5px; gap: 8px; }
    .td-ic { width: 44px; height: 44px; }
    .td-list { padding: 2px 12px; }
    .td-row { gap: 10px; font-size: 13.5px; }
    .td-time { width: auto; }
    .td-time-end, .td-row .tp-code-badge { display: none; }
  }
`;

function NextExams({ teacherId, today }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    if (!teacherId) return;
    let live = true;
    supabase.from("exam_candidates").select("id, student_name, start_time, exam_sessions(title, exam_date)")
      .eq("teacher_id", teacherId).eq("status", "scheduled")
      .then(({ data, error }) => {
        if (!live) return;
        if (error) { setRows([]); return; }
        setRows(data
          .filter((r) => r.exam_sessions && r.exam_sessions.exam_date >= today)
          .sort((a, b) => (a.exam_sessions.exam_date + (a.start_time || "")).localeCompare(b.exam_sessions.exam_date + (b.start_time || "")))
          .slice(0, 4));
      });
    return () => { live = false; };
  }, [teacherId, today]);

  if (!rows) return <div className="td-empty">Loading…</div>;
  if (rows.length === 0) return <div className="td-empty">No exams scheduled.</div>;
  return rows.map((r) => (
    <div key={r.id} className="td-row">
      <FileText size={18} color="#A86A00" aria-hidden="true" style={{ flexShrink: 0 }} />
      <span className="td-row-name">{r.student_name}<small>{r.exam_sessions.title}</small></span>
      <span className="td-pill td-pill-later">{fmtDate(r.exam_sessions.exam_date).replace(/,? \d{4}$/, "")}{r.start_time ? ` · ${fmtTime(r.start_time)}` : ""}</span>
    </div>
  ));
}

export default function TeacherDashboard({ teacherId, teacherName, today, isHoliday, studentCount, classCount, todayClasses, onNavigate, onOpenClass }) {
  const dateLabel = new Date(`${today}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const todayLine = isHoliday
    ? "Holiday today"
    : todayClasses.length === 0 ? "No classes today" : `${todayClasses.length} class${todayClasses.length === 1 ? "" : "es"} today`;

  return (
    <div>
      <style>{CSS}</style>
      <div className="td-hero">
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 className="td-hello">Assalamu Alaikum, {teacherName}</h1>
          <p className="td-sub">{dateLabel} · {todayLine}</p>
        </div>
        <div className="td-nums">
          <button type="button" className="td-num" onClick={() => onNavigate("students")}>
            <b>{studentCount}</b><span>Student{studentCount === 1 ? "" : "s"}</span>
          </button>
          <button type="button" className="td-num" onClick={() => onNavigate("students")}>
            <b>{classCount}</b><span>Class{classCount === 1 ? "" : "es"}</span>
          </button>
        </div>
      </div>

      <nav className="td-buttons" aria-label="Go to">
        {BUTTONS.map(({ key, label, icon: Icon, tone }) => (
          <button key={key} type="button" className="td-btn" onClick={() => onNavigate(key)}>
            <span className={`td-ic td-${tone}`} aria-hidden="true"><Icon size={22} /></span>
            {label}
          </button>
        ))}
      </nav>

      <div className="td-cols">
        <section>
          <h2 className="td-sec">Today's classes</h2>
          <div className="tp-card td-list">
            {isHoliday ? (
              <div className="td-empty"><Sun size={18} aria-hidden="true" />It's a holiday — no classes today.</div>
            ) : todayClasses.length === 0 ? (
              <div className="td-empty">No classes today.</div>
            ) : todayClasses.map((c) => {
              const pill = STATE_PILL[c.state];
              return (
                <button key={c.className} type="button" className="td-row" onClick={() => onOpenClass(c.className, c.entries)}>
                  <span className="td-time">{fmtTime(c.startTime)}<span className="td-time-end"> – {fmtTime(c.endTime)}</span></span>
                  <span className="tp-code-badge" style={{ background: c.badge.bg, color: c.badge.color }}>{c.code}</span>
                  <span className="td-row-name">{c.className}<small>{c.count} student{c.count === 1 ? "" : "s"}</small></span>
                  <span className={`td-pill ${pill.cls}`}>{pill.label}</span>
                  <ChevronRight size={16} color="#176FD1" aria-hidden="true" style={{ flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        </section>
        <section>
          <h2 className="td-sec">Coming exams</h2>
          <div className="tp-card td-list">
            <NextExams teacherId={teacherId} today={today} />
          </div>
        </section>
      </div>
    </div>
  );
}
