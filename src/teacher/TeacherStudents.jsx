import { useMemo, useState } from "react";
import { Users, Search, Phone } from "lucide-react";
import { fmtTime } from "../exams/ExamUI.jsx";
import { programsLabel } from "../thilawa/programs.jsx";

// Teacher Portal "My students": every student the logged-in teacher teaches,
// grouped by class, with their programme, class days/time and phone.

const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CSS = `
  .ts-search { display: inline-flex; align-items: center; gap: 8px; height: 48px; padding: 0 14px; border-radius: 12px; background: #FFFFFF; border: 1px solid #C7DDF4; min-width: 260px; }
  .ts-search svg { color: #176FD1; flex-shrink: 0; }
  .ts-search input { border: none; outline: none; font: inherit; font-size: 14px; color: #123B67; background: transparent; width: 100%; }
  .ts-class { position: relative; z-index: 1; margin-bottom: 18px; }
  .ts-class-head { display: flex; align-items: center; gap: 10px; margin: 0 0 10px; font-size: 16px; font-weight: 700; color: #123B67; }
  .ts-class-head .tp-count-badge { margin-left: auto; }
  .ts-when { font-size: 13px; font-weight: 500; color: #567493; }
  .ts-phone { display: inline-flex; align-items: center; gap: 6px; color: #176FD1; text-decoration: none; font-weight: 600; white-space: nowrap; }
  .ts-phone:hover { text-decoration: underline; }
  .ts-code { font-size: 12px; color: #567493; }
  @media (max-width: 640px) {
    .ts-search { min-width: 0; width: 100%; box-sizing: border-box; }
    .ts-class-head { flex-wrap: wrap; }
    table.ts-table { min-width: 0; }
    table.ts-table thead { display: none; }
    table.ts-table tr { display: grid; grid-template-columns: 1fr auto; gap: 2px 12px; padding: 10px 8px; border-bottom: 1px solid #E4EFF9; }
    table.ts-table tbody tr:last-child { border-bottom: none; }
    table.ts-table td { display: block; padding: 0; border: none; }
    table.ts-table td.ts-when { grid-column: 1 / -1; }
  }
`;

const whenLabel = (schedule) => {
  if (!schedule || !schedule.days || schedule.days.length === 0) return "No class days set";
  const days = [...schedule.days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)).join(", ");
  const time = schedule.startTime ? ` · ${fmtTime(schedule.startTime)}${schedule.endTime ? ` – ${fmtTime(schedule.endTime)}` : ""}` : "";
  return days + time;
};

export default function TeacherStudents({ students, classBadge }) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = students
      .filter((s) => !q || s.name.toLowerCase().includes(q) || (s.studentCode || "").toLowerCase().includes(q) || (s.className || "").toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
    const map = new Map();
    list.forEach((s) => {
      const cls = s.className || "No class";
      if (!map.has(cls)) map.set(cls, []);
      map.get(cls).push(s);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [students, query]);

  return (
    <div>
      <style>{CSS}</style>
      <div className="tp-header">
        <div className="tp-title-group">
          <span className="tp-title-icon" aria-hidden="true"><Users size={22} /></span>
          <h1 className="tp-title">My students</h1>
        </div>
        <div className="tp-actions">
          <span className="tp-chip">{students.length} student{students.length === 1 ? "" : "s"}</span>
          <label className="ts-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" placeholder="Search name, ID or class" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search students" />
          </label>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="tp-card" style={{ color: "#567493", fontSize: "14px" }}>No students are assigned to you yet. Ask the admin to assign your students.</div>
      ) : groups.length === 0 ? (
        <div className="tp-card" style={{ color: "#567493", fontSize: "14px" }}>No students match “{query}”.</div>
      ) : groups.map(([className, list]) => {
        const { code, badge } = classBadge(className);
        return (
          <section key={className} className="ts-class">
            <h2 className="ts-class-head">
              <span className="tp-code-badge" style={{ background: badge.bg, color: badge.color }}>{code}</span>
              {className}
              <span className="tp-count-badge">{list.length} student{list.length === 1 ? "" : "s"}</span>
            </h2>
            <div className="tp-card" style={{ padding: "8px" }}>
              <div className="tp-table-wrap">
                <table className="tp-list-table ts-table">
                  <thead>
                    <tr><th scope="col">Student</th><th scope="col">Programme</th><th scope="col">Class days</th><th scope="col">Phone</th></tr>
                  </thead>
                  <tbody>
                    {list.map((s) => (
                      <tr key={s.id}>
                        <td><div style={{ fontWeight: 700 }}>{s.name}</div>{s.studentCode && <div className="ts-code">{s.studentCode}</div>}</td>
                        <td>{programsLabel(s.programs)}</td>
                        <td className="ts-when">{whenLabel(s.schedule)}</td>
                        <td>{s.phone ? <a className="ts-phone" href={`tel:${s.phone}`}><Phone size={14} aria-hidden="true" />{s.phone}</a> : <span className="ts-code">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
