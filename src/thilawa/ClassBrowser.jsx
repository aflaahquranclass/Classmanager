// The teacher's students by class (Hifz and Thilawa sections): class cards
// first; a class card opens that class's students. Searching finds classes
// and students together.
//
// renderStudent(student) → the student's card; summary(students) → an optional
// line of badges on a class card; classActions({ name, students }) → optional
// buttons beside an open class's name; classPanel({ name, students }) → shown
// above an open class's students (e.g. its class reading). The parent keeps `query` and `openClass` so
// they stay put while a student is open. With a classPanel, the class's
// students are folded away under a "Show students" button until tapped.

import { useState } from "react";
import { Search, Users, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { groupByClass } from "./programRules.js";

const CSS = `
  .cb-search { position: relative; display: block; width: 100%; max-width: 420px; margin: 12px 0 18px; }
  .cb-search svg { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #8FADC0; pointer-events: none; }
  .cb-search .hz-input { padding-left: 40px; }
  .cb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
  .cb-class { text-align: left; font: inherit; cursor: pointer; border: 1px solid #DCEBF8; border-radius: 16px; background: #FFFFFF; padding: 16px; display: flex; align-items: center; gap: 14px;
    box-shadow: 0 6px 18px rgba(18,59,103,0.06); transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .cb-class:hover { transform: translateY(-3px); box-shadow: 0 14px 30px rgba(23,111,209,0.14); }
  .cb-class:focus-visible { outline: 2px solid #176FD1; outline-offset: 2px; }
  .cb-class-icon { flex-shrink: 0; width: 46px; height: 46px; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #FFFFFF;
    background: linear-gradient(135deg, #0D4F85 0%, #176FD1 60%, #0A94B1 100%); }
  .cb-class-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .cb-class-body b { color: #123B67; font-size: 16px; line-height: 1.3; }
  .cb-class-count { color: #567493; font-size: 13px; }
  .cb-class-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .cb-class > svg:last-child { flex-shrink: 0; color: #8FADC0; }
  .cb-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 0 0 14px; }
  .cb-head h3 { margin: 0; font-size: 18px; font-weight: 700; color: #123B67; }
  .cb-head span { color: #567493; font-size: 13px; }
  .cb-head .cb-actions { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }
  .cb-label { margin: 18px 0 10px; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #567493; }
  .cb-toggle { width: 100%; margin: 18px 0 12px; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 14px; border: 1px solid #DCEBF8; background: #FFFFFF; color: #123B67;
    font: 700 15px/1.2 Inter, ui-sans-serif, system-ui, sans-serif; text-align: left; cursor: pointer; box-shadow: 0 6px 18px rgba(18,59,103,0.06); -webkit-tap-highlight-color: transparent; }
  .cb-toggle:hover { background: #F7FAFD; }
  .cb-toggle:focus-visible { outline: 2px solid #176FD1; outline-offset: 2px; }
  .cb-toggle-icon { flex-shrink: 0; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: #EAF3FD; color: #176FD1; }
  .cb-toggle > span:nth-child(2) { flex: 1; min-width: 0; }
  .cb-toggle small { display: block; margin-top: 2px; font-weight: 400; font-size: 13px; color: #567493; }
  .cb-toggle > svg { flex-shrink: 0; color: #567493; transition: transform 0.18s; }
  .cb-toggle[aria-expanded="true"] > svg { transform: rotate(180deg); }
  .cb-sub { margin: 14px 0 8px; font-size: 14px; font-weight: 700; color: #123B67; }
`;

// Classes whose students the teacher has shown, kept while the portal is
// open (the list goes away while a student is open, and comes back as it was).
const shownClasses = new Set();

export default function ClassBrowser({ students, query, onQuery, openClass, onOpenClass, renderStudent, summary, classActions, classPanel, gridClass }) {
  const classes = groupByClass(students);
  const [, redraw] = useState(0);
  const toggleShown = (name) => {
    if (shownClasses.has(name)) shownClasses.delete(name); else shownClasses.add(name);
    redraw((n) => n + 1);
  };
  const q = query.trim().toLowerCase();
  const plural = (n) => `${n} student${n === 1 ? "" : "s"}`;

  const classCard = (c) => (
    <button key={c.name} type="button" className="cb-class" onClick={() => { onQuery(""); onOpenClass(c.name); }}>
      <span className="cb-class-icon"><Users size={22} aria-hidden="true" /></span>
      <span className="cb-class-body">
        <b>{c.name}</b>
        <span className="cb-class-count">{plural(c.students.length)}</span>
        {summary && <span className="cb-class-tags">{summary(c.students)}</span>}
      </span>
      <ChevronRight size={20} aria-hidden="true" />
    </button>
  );
  const studentGrid = (list) => <div className={gridClass}>{list.map(renderStudent)}</div>;

  let body;
  if (q) {
    const foundClasses = classes.filter((c) => c.name.toLowerCase().includes(q));
    const foundStudents = groupByClass(students.filter((s) => `${s.name} ${s.studentCode || ""}`.toLowerCase().includes(q)));
    body = !foundClasses.length && !foundStudents.length
      ? <div className="hz-card hz-muted">No classes or students match “{query.trim()}”.</div>
      : (
        <>
          {foundClasses.length > 0 && <><div className="cb-label">Classes</div><div className="cb-grid">{foundClasses.map(classCard)}</div></>}
          {foundStudents.length > 0 && (
            <>
              <div className="cb-label">Students</div>
              {foundStudents.map((c) => <div key={c.name}><div className="cb-sub">{c.name}</div>{studentGrid(c.students)}</div>)}
            </>
          )}
        </>
      );
  } else {
    const open = classes.find((c) => c.name === openClass);
    body = open ? (
      <>
        <div className="cb-head">
          <button className="hz-btn hz-btn-outline" onClick={() => onOpenClass(null)}><ChevronLeft size={18} aria-hidden="true" />All classes</button>
          <h3>{open.name}</h3><span>{plural(open.students.length)}</span>
          {classActions && <span className="cb-actions">{classActions(open)}</span>}
        </div>
        {classPanel?.(open)}
        {classPanel ? (
          <>
            <button type="button" className="cb-toggle" aria-expanded={shownClasses.has(open.name)} onClick={() => toggleShown(open.name)}>
              <span className="cb-toggle-icon" aria-hidden="true"><Users size={18} /></span>
              <span>{shownClasses.has(open.name) ? "Hide students" : "Show students"}<small>{plural(open.students.length)}</small></span>
              <ChevronDown size={20} aria-hidden="true" />
            </button>
            {shownClasses.has(open.name) && studentGrid(open.students)}
          </>
        ) : studentGrid(open.students)}
      </>
    ) : <div className="cb-grid">{classes.map(classCard)}</div>;
  }

  return (
    <div>
      <style>{CSS}</style>
      <label className="cb-search"><Search size={17} aria-hidden="true" />
        <input className="hz-input" type="search" placeholder="Search students or classes" aria-label="Search students or classes" value={query} onChange={(e) => onQuery(e.target.value)} />
      </label>
      {body}
    </div>
  );
}
