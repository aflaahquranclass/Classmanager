// Teacher portal: Thilawa. The teacher sees their Thilawa students' khatam
// progress, sets their Tajweed and fluency levels, sets reading for them to
// tick off, and keeps notes (shared with the student or kept private).

import { useState, useEffect, useCallback, useMemo } from "react";
import { BookOpenCheck, Trophy, ListChecks, StickyNote, ChevronLeft, Trash2, Eye, EyeOff, Search, Flame, History, Plus } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { HIFZ_CSS } from "../HifzTracker.jsx";
import { SURAHS } from "../hifz/quran.js";
import { TOTAL_PAGES, describePages, levelLabel } from "./engine.js";
import { summarizeThilawa, loadThilawa } from "./service.js";
import { createSupabaseThilawaRepo, selectAll, THILAWA_MAPS } from "./repos.js";
import { LevelMeter, thilawaCss, fmtDate } from "./ThilawaStudent.jsx";

const fmtWhen = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const surahEndPage = (i) => (i + 1 < SURAHS.length ? Math.max(SURAHS[i].startPage, SURAHS[i + 1].startPage - 1) : TOTAL_PAGES);

const teacherCss = () => `
  .tt { display: flex; flex-direction: column; gap: 18px; }
  .tt-search { position: relative; max-width: 360px; }
  .tt-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #8FADC0; pointer-events: none; }
  .tt-search .hz-input { padding-left: 38px; }
  .tt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
  .tt-card { text-align: left; font: inherit; cursor: pointer; border: 1px solid #DCEBF8; border-radius: 16px; background: #FFFFFF; padding: 16px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 6px 18px rgba(18,59,103,0.06); transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .tt-card:hover { transform: translateY(-3px); box-shadow: 0 14px 30px rgba(23,111,209,0.14); }
  .tt-card:focus-visible { outline: 2px solid #176FD1; outline-offset: 2px; }
  .tt-card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .tt-card-head b { color: #123B67; font-size: 16px; }
  .tt-card-head span { color: #567493; font-size: 12px; }
  .tt-mini { display: grid; grid-template-columns: 74px 1fr 40px; align-items: center; gap: 8px; font-size: 12px; color: #567493; }
  .tt-mini b { color: #123B67; text-align: right; }
  .tt-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .tt-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .tt-form .tt-wide { grid-column: 1 / -1; }
  .tt-form .hz-field { margin-top: 0; }
  .tt-slider { display: flex; align-items: center; gap: 12px; }
  .tt-slider input[type="range"] { flex: 1; accent-color: #176FD1; min-height: 32px; }
  .tt-slider output { min-width: 96px; text-align: right; font-weight: 700; color: #1452A8; font-size: 14px; }
  .tt-rows { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .tt-rows li { display: flex; align-items: flex-start; gap: 10px; background: #F7FAFD; border: 1px solid #E1EDF8; border-radius: 12px; padding: 10px 12px; font-size: 14px; color: #123B67; }
  .tt-rows li > div { flex: 1; min-width: 0; }
  .tt-rows small { display: block; color: #567493; font-size: 12px; margin-top: 2px; }
  .tt-rows .tt-note { white-space: pre-wrap; line-height: 1.5; }
  .tt-private { background: #F3EEFA !important; border-color: #DCCDF2 !important; }
  .tt-icon-btn { flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px; border: 1px solid #C7DDF4; background: #FFFFFF; color: #567493; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
  .tt-icon-btn:hover { color: #A5432C; border-color: #F0C2B6; }
  .tt-icon-btn:focus-visible { outline: 2px solid #176FD1; outline-offset: 2px; }
  .tt-check { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #123B67; min-height: 44px; }
  .tt-check input { width: 18px; height: 18px; accent-color: #176FD1; }
  textarea.hz-input { min-height: 88px; padding: 10px 12px; resize: vertical; line-height: 1.5; }
  @media (max-width: 560px) { .tt-form { grid-template-columns: 1fr; } }
`;

// ---------- one student ----------

export function TeacherThilawaStudent({ student, repo, onBack, onChanged }) {
  const [data, setData] = useState(null);
  // { where: section key, message } — shown in the section the action came from.
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try { setData(await loadThilawa(repo)); setError(null); } catch (e) { setError({ where: "top", message: e.message }); }
  }, [repo]);
  useEffect(() => { refresh(); }, [refresh]);

  const run = async (where, fn) => {
    setBusy(true);
    setError(null);
    try { await fn(); await refresh(); onChanged?.(); } catch (e) { setError({ where, message: e.message }); } finally { setBusy(false); }
  };
  const errorIn = (where) => error?.where === where && <div className="hz-error" role="alert" style={{ margin: "12px 0" }}>{error.message}</div>;

  // Levels form starts from the latest assessment.
  const latest = data?.levels.latest;
  const [tajweed, setTajweed] = useState(null);
  const [fluency, setFluency] = useState(null);
  const [comment, setComment] = useState("");
  const tj = tajweed ?? latest?.tajweed ?? 50;
  const fl = fluency ?? latest?.fluency ?? 50;

  // Set-reading form.
  const [fromPage, setFromPage] = useState("");
  const [toPage, setToPage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const pickSurah = (i) => { setFromPage(String(SURAHS[i].startPage)); setToPage(String(surahEndPage(i))); };

  // Notes form.
  const [note, setNote] = useState("");
  const [shared, setShared] = useState(true);

  if (!data) {
    return <div className="tt">{error ? <div className="hz-error" role="alert">{error.message}</div> : <div className="hz-card hz-muted">Loading {student.name}…</div>}</div>;
  }

  const saveLevels = () => run("levels", async () => {
    await repo.addAssessment({ tajweed: tj, fluency: fl, comment });
    setTajweed(null); setFluency(null); setComment("");
  });
  const addReading = () => {
    const a = Math.round(+fromPage);
    const b = Math.round(+(toPage || fromPage));
    if (!(a >= 1 && a <= TOTAL_PAGES && b >= a && b <= TOTAL_PAGES)) { setError({ where: "reading", message: `Pages must be between 1 and ${TOTAL_PAGES}, with the last page not before the first.` }); return; }
    run("reading", async () => {
      await repo.addAssignment({ fromPage: a, toPage: b, instructions, dueDate });
      setFromPage(""); setToPage(""); setInstructions(""); setDueDate("");
    });
  };
  const addNote = () => {
    if (!note.trim()) return;
    run("notes", async () => { await repo.addNote({ body: note, visibleToStudent: shared }); setNote(""); });
  };
  const remove = async (where, what, fn) => {
    if (await confirmDialog({ title: `Delete this ${what}?`, message: "This can't be undone.", confirmLabel: "Delete", danger: true })) run(where, fn);
  };

  const { progress, streak, settings, goal, assignments, assessments, notes, reading } = data;
  const recent = [...reading].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 8);

  return (
    <div className="tt">
      <style>{teacherCss()}</style>
      {onBack && <div><button className="hz-btn hz-btn-ghost" onClick={onBack}><ChevronLeft size={18} aria-hidden="true" />All Thilawa students</button></div>}
      {errorIn("top")}

      <section className="hz-card" aria-label="Khatam progress">
        <div className="hz-row">
          <h2 className="hz-h2" style={{ margin: 0 }}><BookOpenCheck size={22} aria-hidden="true" />{student.name} <span className="hz-muted" style={{ fontWeight: 400 }}>{student.studentCode}</span></h2>
          <span className="hz-big">{progress.percent}%</span>
        </div>
        <div className="hz-bar" style={{ margin: "12px 0" }} role="progressbar" aria-label="Khatam progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}><div style={{ width: `${progress.percent}%` }} /></div>
        <div className="hz-kv">
          <div><span>Pages read (this khatam)</span><strong>{progress.count} / {TOTAL_PAGES}</strong></div>
          <div><span>Khatams completed</span><strong>{progress.khatams}</strong></div>
          <div><span>Khatam goal</span><strong>{settings ? `${fmtDate(settings.goalDate)}${goal?.passed ? " (passed)" : ""}` : "Not set yet"}</strong></div>
          <div><span>Streak</span><strong><Flame size={14} aria-hidden="true" /> {streak.current} day{streak.current === 1 ? "" : "s"}{streak.lastActive ? ` · last read ${fmtDate(streak.lastActive)}` : ""}</strong></div>
        </div>
      </section>

      <section className="hz-card" aria-label="Tajweed and fluency levels">
        <h2 className="hz-h2"><Trophy size={22} aria-hidden="true" />Tajweed and Fluency</h2>
        <div className="th-levels">
          <LevelMeter kind="tajweed" value={latest?.tajweed} change={data.levels.tajweedChange} />
          <LevelMeter kind="fluency" value={latest?.fluency} change={data.levels.fluencyChange} />
        </div>
        <div className="tt-form" style={{ marginTop: 16 }}>
          <div className="hz-field tt-wide">
            <label htmlFor="tt-tajweed">Tajweed level</label>
            <div className="tt-slider">
              <input id="tt-tajweed" type="range" min="0" max="100" step="5" value={tj} onChange={(e) => setTajweed(+e.target.value)} />
              <output htmlFor="tt-tajweed">{tj}% · {levelLabel(tj)}</output>
            </div>
          </div>
          <div className="hz-field tt-wide">
            <label htmlFor="tt-fluency">Reading fluency (by looking)</label>
            <div className="tt-slider">
              <input id="tt-fluency" type="range" min="0" max="100" step="5" value={fl} onChange={(e) => setFluency(+e.target.value)} />
              <output htmlFor="tt-fluency">{fl}% · {levelLabel(fl)}</output>
            </div>
          </div>
          <div className="hz-field tt-wide">
            <label htmlFor="tt-comment">Comment for the student (optional)</label>
            <input id="tt-comment" className="hz-input" maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="e.g. Good improvement on the madd rules" />
          </div>
        </div>
        {errorIn("levels")}
        <div className="hz-wiz-nav" style={{ justifyContent: "flex-end", marginTop: 14 }}>
          <button className="hz-btn hz-btn-primary" disabled={busy} onClick={saveLevels}>Save levels</button>
        </div>
        {assessments.length > 0 && (
          <>
            <h3 className="hz-h2" style={{ fontSize: 15, margin: "16px 0 8px" }}><History size={18} aria-hidden="true" />History</h3>
            <ul className="tt-rows">
              {[...assessments].reverse().map((a) => (
                <li key={a.id}>
                  <div>Tajweed <b>{a.tajweed}%</b> · Fluency <b>{a.fluency}%</b>{a.comment && <> · “{a.comment}”</>}<small>{fmtDate(a.assessedOn)}</small></div>
                  <button className="tt-icon-btn" aria-label="Delete this assessment" disabled={busy} onClick={() => remove("levels", "assessment", () => repo.deleteAssessment(a.id))}><Trash2 size={16} aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="hz-card" aria-label="Set reading">
        <h2 className="hz-h2"><ListChecks size={22} aria-hidden="true" />Set Reading</h2>
        <p className="hz-muted" style={{ marginTop: 0 }}>The student sees this under Teacher's Reading, reads it and ticks it. Ticked pages count towards their khatam.</p>
        <div className="tt-form">
          <div className="hz-field tt-wide">
            <label htmlFor="tt-surah">Whole surah (fills the pages)</label>
            <select id="tt-surah" className="hz-select" value="" onChange={(e) => e.target.value !== "" && pickSurah(+e.target.value)}>
              <option value="">Choose a surah…</option>
              {SURAHS.map((s, i) => <option key={s.number} value={i}>{s.number}. {s.name} (p. {s.startPage})</option>)}
            </select>
          </div>
          <div className="hz-field">
            <label htmlFor="tt-from">From page</label>
            <input id="tt-from" className="hz-input" type="number" inputMode="numeric" min="1" max={TOTAL_PAGES} value={fromPage} onChange={(e) => setFromPage(e.target.value)} placeholder="e.g. 582" />
          </div>
          <div className="hz-field">
            <label htmlFor="tt-to">To page</label>
            <input id="tt-to" className="hz-input" type="number" inputMode="numeric" min="1" max={TOTAL_PAGES} value={toPage} onChange={(e) => setToPage(e.target.value)} placeholder="Same page" />
          </div>
          <div className="hz-field tt-wide">
            <label htmlFor="tt-instr">Instructions (optional)</label>
            <textarea id="tt-instr" className="hz-input" maxLength={1000} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. Read slowly. Watch the ghunnah on noon and meem." />
          </div>
          <div className="hz-field">
            <label htmlFor="tt-due">Due date (optional)</label>
            <input id="tt-due" className="hz-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="hz-field" style={{ justifyContent: "flex-end" }}>
            <button className="hz-btn hz-btn-primary" disabled={busy || !fromPage} onClick={addReading}><Plus size={18} aria-hidden="true" />Set reading</button>
          </div>
        </div>
        {errorIn("reading")}
        {fromPage && +fromPage >= 1 && +fromPage <= TOTAL_PAGES && (+toPage || +fromPage) >= +fromPage && (+toPage || +fromPage) <= TOTAL_PAGES && (
          <p className="hz-muted" style={{ marginBottom: 0 }}>{describePages(+fromPage, +(toPage || fromPage))}</p>
        )}
        {assignments.length > 0 && (
          <ul className="tt-rows" style={{ marginTop: 14 }}>
            {assignments.map((a) => (
              <li key={a.id}>
                <div>
                  <b>{describePages(a.fromPage, a.toPage)}</b>{" "}
                  <span className={`hz-badge ${a.completedAt ? "hz-badge-completed" : "hz-badge-pending"}`}>{a.completedAt ? `Done ${fmtWhen(a.completedAt)}` : "Not done yet"}</span>
                  {a.instructions && <small>{a.instructions}</small>}
                  <small>Set {fmtWhen(a.createdAt)}{a.dueDate ? ` · due ${fmtDate(a.dueDate)}` : ""}</small>
                </div>
                <button className="tt-icon-btn" aria-label="Delete this reading" disabled={busy} onClick={() => remove("reading", "reading", () => repo.deleteAssignment(a.id))}><Trash2 size={16} aria-hidden="true" /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="hz-card" aria-label="Notes">
        <h2 className="hz-h2"><StickyNote size={22} aria-hidden="true" />Notes</h2>
        <div className="hz-field" style={{ marginTop: 0 }}>
          <label htmlFor="tt-note">New note</label>
          <textarea id="tt-note" className="hz-input" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What to practise, what went well, what to work on…" />
        </div>
        {errorIn("notes")}
        <div className="hz-row" style={{ marginTop: 8 }}>
          <label className="tt-check"><input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />Show this note to the student</label>
          <button className="hz-btn hz-btn-primary" disabled={busy || !note.trim()} onClick={addNote}><Plus size={18} aria-hidden="true" />Add note</button>
        </div>
        {notes.length > 0 && (
          <ul className="tt-rows" style={{ marginTop: 12 }}>
            {notes.map((n) => (
              <li key={n.id} className={n.visibleToStudent ? undefined : "tt-private"}>
                <div><div className="tt-note">{n.body}</div><small>{fmtWhen(n.createdAt)} · {n.visibleToStudent ? "Shown to student" : "Private (only teachers and admins)"}</small></div>
                <button className="tt-icon-btn" disabled={busy} aria-label={n.visibleToStudent ? "Make private" : "Show to student"} title={n.visibleToStudent ? "Make private" : "Show to student"}
                  onClick={() => run("notes", () => repo.updateNote(n.id, { visibleToStudent: !n.visibleToStudent }))}>
                  {n.visibleToStudent ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
                </button>
                <button className="tt-icon-btn" aria-label="Delete this note" disabled={busy} onClick={() => remove("notes", "note", () => repo.deleteNote(n.id))}><Trash2 size={16} aria-hidden="true" /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="hz-card" aria-label="Recent reading">
        <h2 className="hz-h2"><History size={22} aria-hidden="true" />Recent Reading</h2>
        {recent.length === 0 ? <p className="hz-muted" style={{ margin: 0 }}>Nothing read yet.</p> : (
          <ul className="tt-rows">
            {recent.map((r) => <li key={r.id}><div>{describePages(r.fromPage, r.toPage)}<small>{fmtDate(r.readOn)} · {r.assignmentId ? "Teacher's reading" : "Free reading"}</small></div></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------- all of the teacher's Thilawa students ----------

// students: the teacher's students (app shape), already filtered to Thilawa.
export function TeacherThilawa({ students, teacherId }) {
  const [openId, setOpenId] = useState(null);
  const [query, setQuery] = useState("");
  const [overview, setOverview] = useState(null); // studentId → summary
  const [error, setError] = useState("");
  const ids = useMemo(() => students.map((s) => s.id), [students]);

  // One query per table for every student (row-level security limits it to theirs).
  const loadOverview = useCallback(async () => {
    if (!ids.length) { setOverview({}); return; }
    try {
      // thilawa_settings is keyed by student_id (no id column).
      const fetch = (table) => selectAll(() => supabase.from(table).select("*").in("student_id", ids).order("created_at").order(table === "thilawa_settings" ? "student_id" : "id"));
      const [settings, reading, assignments, assessments] = await Promise.all(["thilawa_settings", "thilawa_reading", "thilawa_assignments", "thilawa_assessments"].map(fetch));
      const of = (rows, id, map) => rows.filter((r) => r.student_id === id).map(map);
      const out = {};
      for (const id of ids) {
        const st = settings.find((r) => r.student_id === id);
        out[id] = summarizeThilawa({
          settings: st ? { timezone: st.timezone, goalDate: st.goal_date } : null,
          reading: of(reading, id, THILAWA_MAPS.readingFromDb),
          assignments: of(assignments, id, THILAWA_MAPS.assignmentFromDb),
          assessments: of(assessments, id, THILAWA_MAPS.assessmentFromDb),
          notes: [],
        });
      }
      setOverview(out);
      setError("");
    } catch (e) { setError(e.message); }
  }, [ids]);
  useEffect(() => { loadOverview(); }, [loadOverview]);

  const opened = students.find((s) => s.id === openId);
  const repo = useMemo(() => (opened ? createSupabaseThilawaRepo(supabase, opened.id, teacherId) : null), [opened, teacherId]);
  const shown = students
    .filter((s) => !query.trim() || `${s.name} ${s.studentCode}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <style>{HIFZ_CSS}{thilawaCss()}{teacherCss()}</style>
      {opened ? (
        <TeacherThilawaStudent key={opened.id} student={opened} repo={repo} onBack={() => setOpenId(null)} onChanged={loadOverview} />
      ) : (
        <div className="tt">
          <div className="hz-row">
            <div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#123B67" }}>Thilawa</div>
              <div className="hz-muted">Students reading by looking. Open a student to set their levels and reading, and to keep notes.</div>
            </div>
            {students.length > 6 && (
              <label className="tt-search"><Search size={16} aria-hidden="true" />
                <input className="hz-input" type="search" placeholder="Search students" aria-label="Search students" value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
            )}
          </div>
          {error && <div className="hz-error" role="alert">{error}</div>}
          {students.length === 0 ? (
            <div className="hz-card hz-muted">None of your students are enrolled in Thilawa yet. The admin chooses Hifz, Thilawa or both when adding a student.</div>
          ) : (
            <div className="tt-grid">
              {shown.map((s) => {
                const o = overview?.[s.id];
                const last = o?.levels.latest;
                return (
                  <button key={s.id} type="button" className="tt-card" onClick={() => setOpenId(s.id)}>
                    <div className="tt-card-head"><b>{s.name}</b><span>{s.studentCode}</span></div>
                    {[["Khatam", o?.progress.percent], ["Tajweed", last?.tajweed], ["Fluency", last?.fluency]].map(([label, v]) => (
                      <div key={label} className="tt-mini">
                        <span>{label}</span>
                        <div className={`hz-bar hz-bar-sm ${label === "Tajweed" ? "th-bar-tajweed" : label === "Fluency" ? "th-bar-fluency" : ""}`}><div style={{ width: `${v ?? 0}%` }} /></div>
                        <b>{v == null ? "—" : `${Math.round(v)}%`}</b>
                      </div>
                    ))}
                    <div className="tt-tags">
                      {o ? (
                        <>
                          {o.openAssignments > 0 && <span className="hz-badge hz-badge-pending">{o.openAssignments} reading{o.openAssignments === 1 ? "" : "s"} open</span>}
                          {o.streak.current > 0 && <span className="hz-badge hz-badge-completed">{o.streak.current}-day streak</span>}
                          {!o.settings && <span className="hz-badge hz-badge-empty">No goal yet</span>}
                        </>
                      ) : <span className="hz-muted">Loading…</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
