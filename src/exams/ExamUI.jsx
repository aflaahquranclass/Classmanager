// Exam scheduling screens: the admin schedules exams and generates questions,
// the examiner (teacher) sees the exams assigned to them, and the student
// sees when their exams are and the result.

import { useState, useEffect, useCallback, useRef } from "react";
import { CalendarDays, Clock, Plus, RotateCw, Trash2, X, User, Eye, BookOpen, PlayCircle, CheckCircle2, XCircle, Pencil, Highlighter } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { TP, SearchableSelect } from "../App.jsx";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { fetchVerses, BASMALA, SURAH_NAMES_AR } from "./quranText.js";
import { generateExamQuestions, describeJuzList, describeAyah, questionRange, passageLines, MAX_QUESTIONS, EXAM_TYPES, examTypeLabel, LINES_PER_QUESTION } from "./questions.js";

const DEFAULT_QUESTIONS = 5;

// Table rows as stacked cards (used below a certain width).
const CARD_ROWS = `
    .ex-table thead { display: none; }
    .ex-table, .ex-table tbody, .ex-table tr, .ex-table td { display: block; width: 100%; box-sizing: border-box; }
    .ex-table tr { border: 1px solid #DCEBF8; border-radius: 14px; padding: 8px 12px; margin-bottom: 10px; background: #FFFFFF; }
    .ex-table td { border: none; padding: 6px 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; text-align: right; min-width: 0; }
    .ex-table td::before { content: attr(data-label); flex: 0 0 auto; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; color: #5B6B79; text-align: left; }
    .ex-table td.ex-td-actions::before { display: none; }
    .ex-table td > select { flex: 1; min-width: 0; max-width: 70%; }
    .ex-table td.ex-td-time { flex-wrap: wrap; }
    .ex-table td.ex-td-time > .ex-time-pair { flex: 1 1 100%; }
    .ex-time-input { width: auto; flex: 1; min-width: 0; }
    .ex-row-actions { width: 100%; justify-content: flex-end; padding-top: 4px; }
    .ex-row-actions .lc-btn { min-height: 40px; }
`;

// A function, not a constant: TP comes from App.jsx, which imports this file.
export const examCss = () => `
  .ex-q { border: 1px solid #DCEBF8; border-radius: 14px; padding: 14px 16px; background: #FFFFFF; }
  .ex-q + .ex-q { margin-top: 10px; }
  .ex-q-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 13px; }
  .ex-q-num { font-weight: 800; color: ${TP.navy}; }
  .ex-q-kind { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; background: #E4F1FC; color: ${TP.blue}; }
  .ex-q-kind-surah_end { background: #FCF1DD; color: #9C6B12; }
  .ex-q-kind-page_end { background: #EAF5EC; color: #2E7D4F; }
  @font-face { font-family: "UthmanicHafs"; src: url("/fonts/UthmanicHafs1Ver18.woff2") format("woff2"); font-display: swap; }
  .ex-q-range { font-size: 13px; color: ${TP.navy}; margin-top: 8px; }
  .ex-q-range span { color: ${TP.secondaryText}; }
  .ex-mushaf { margin-top: 10px; background: #EAF5FD; border: 1px solid #C9E2F6; border-radius: 12px; padding: 12px 16px; }
  .ex-mushaf-text { margin: 0; font-family: "UthmanicHafs", serif; font-size: 30px; line-height: 2.1; color: #1B1B1B; text-align: justify; text-align-last: right; word-spacing: 2px; }
  .ex-verse-start { background: #C6E2F8; border-radius: 6px; box-decoration-break: clone; -webkit-box-decoration-break: clone; padding: 0 2px; }
  .ex-surah-title { margin: 10px 0 2px; padding: 6px; text-align: center; font-family: "UthmanicHafs", serif; font-size: 22px; color: #1B4F72; border: 1px solid #B9D8F0; border-radius: 10px; background: #F5FAFE; }
  .ex-basmala { text-align: center; font-family: "UthmanicHafs", serif; font-size: 26px; line-height: 2; color: #1B1B1B; }
  .ex-ayah-note { font-size: 12px; color: ${TP.secondaryText}; }
  .ex-hl-btn { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px; border: 1px solid #F0C36D; border-radius: 10px; background: #FFFFFF; color: #8A5A00; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
  .ex-hl-btn:hover { background: #FFF6DE; }
  .ex-hl-btn[aria-pressed="true"] { background: #F7C948; border-color: #E0A800; color: #3D2A00; }
  .ex-hl-btn:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
  .ex-word { cursor: pointer; border-radius: 6px; transition: background 0.1s ease; }
  .ex-word:hover { background: rgba(247,201,72,0.45); }
  .ex-word:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 1px; }
  .ex-word-mistake { background: #F6B3A3; color: #7A1E0C; border-radius: 6px; box-shadow: 0 0 0 2px #F6B3A3; }
  .ex-word.ex-word-mistake:hover { background: #F19A86; }
  .ex-mistake-count { font-weight: 700; color: #A5432C; background: #FBEAE6; border-radius: 999px; padding: 2px 10px; }
  .ex-mark { margin-top: 12px; padding-top: 12px; border-top: 1px solid #E7F2FA; }
  .ex-mark-label { font-size: 12px; font-weight: 700; color: ${TP.navy}; margin-bottom: 8px; }
  .ex-mark-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .ex-mark-btn { min-height: 46px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 2px solid #D3E9F7; border-radius: 12px; background: #FFFFFF; color: #1B2733; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.15s ease; }
  .ex-mark-btn:hover { border-color: #8FC4E8; }
  .ex-mark-btn:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
  .ex-mark-correct[aria-pressed="true"] { border-color: #5FA579; background: #E3F0E7; color: #1E6B45; }
  .ex-mark-incorrect[aria-pressed="true"] { border-color: #D9825F; background: #FBEAE6; color: #A5432C; }
  .ex-mark-remark { margin-top: 10px; }
  .ex-mark-missing { border-color: #A5432C !important; background: #FBEAE6 !important; }
  .ex-mark-progress { font-size: 13px; font-weight: 600; color: ${TP.secondaryText}; }
  /* Sized by the space the page actually has (container queries), not the
     screen, so it fits beside the sidebar on laptops as well as on phones. */
  .ex-root { container: exroot / inline-size; }
  .ex-layout { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 20px; align-items: start; }
  .ex-layout > * { min-width: 0; }
  @container exroot (max-width: 900px) { .ex-layout { grid-template-columns: minmax(0, 1fr); } }
  @media (max-width: 960px) { .ex-layout { grid-template-columns: minmax(0, 1fr); } }
  .ex-session { display: block; width: 100%; text-align: left; border: 1px solid #DCEBF8; background: #FFFFFF; border-radius: 12px; padding: 12px 14px; cursor: pointer; font: inherit; color: ${TP.navy}; }
  .ex-session + .ex-session { margin-top: 8px; }
  .ex-session[aria-current="true"] { border-color: ${TP.blue}; box-shadow: 0 0 0 2px rgba(23,111,209,0.15); background: #F4F9FD; }
  .ex-session-title { font-weight: 700; font-size: 14px; }
  .ex-session-meta { font-size: 12px; color: ${TP.secondaryText}; margin-top: 2px; }
  .ex-label { font-size: 12px; color: #5B6B79; display: block; margin-bottom: 6px; }
  .ex-add-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
  .ex-juz-grid { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 6px; }
  @media (max-width: 560px) { .ex-juz-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
  .ex-juz { min-height: 36px; border: 1px solid #C7DDF4; border-radius: 10px; background: #FFFFFF; color: ${TP.navy}; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  .ex-juz[aria-pressed="true"] { background: linear-gradient(90deg, ${TP.blue}, ${TP.teal}); border-color: transparent; color: #FFFFFF; }
  .ex-juz:focus-visible, .ex-session:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
  .ex-status { display: inline-block; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; white-space: nowrap; }
  .ex-status-scheduled { background: #E4F1FC; color: ${TP.blue}; }
  .ex-status-pass { background: #E3F0E7; color: #1E6B45; }
  .ex-status-not_passed { background: #FBEAE6; color: #A5432C; }
  .ex-status-absent { background: #EDEFF2; color: #4B5563; }
  .ex-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .ex-table th { text-align: left; color: #5B6B79; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; padding: 8px; border-bottom: 1px solid #D3E9F7; white-space: nowrap; }
  .ex-table td { padding: 8px; border-bottom: 1px solid #E7F2FA; vertical-align: middle; }
  .ex-time-input { width: 112px; }
  .ex-empty { font-size: 13px; color: ${TP.secondaryText}; padding: 18px 0; text-align: center; }
  .ex-row-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .ex-lines { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; background: #E3F0E7; color: #1E6B45; }
  .ex-session-row { display: flex; gap: 6px; align-items: stretch; }
  .ex-session-row + .ex-session-row { margin-top: 8px; }
  .ex-session-row .ex-session { flex: 1; min-width: 0; }
  .ex-session-del { flex: 0 0 auto; width: 40px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid #F1D3CA; border-radius: 12px; background: #FFFFFF; color: #A5432C; cursor: pointer; }
  .ex-session-del:hover { background: #FBEAE6; }
  .ex-session-del:focus-visible { outline: 2px solid #A5432C; outline-offset: 2px; }
  .ex-type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .ex-type { border: 1px solid #C7DDF4; border-radius: 12px; background: #FFFFFF; color: ${TP.navy}; font: inherit; font-size: 13px; font-weight: 700; padding: 10px 8px; cursor: pointer; text-align: center; }
  .ex-type small { display: block; font-weight: 500; font-size: 11px; color: ${TP.secondaryText}; margin-top: 2px; }
  .ex-type[aria-pressed="true"] { background: linear-gradient(90deg, ${TP.blue}, ${TP.teal}); border-color: transparent; color: #FFFFFF; }
  .ex-type[aria-pressed="true"] small { color: rgba(255,255,255,0.85); }
  .ex-type:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
  .ex-type-badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px; background: #EEE7F8; color: #6A3FA0; }
  .ex-span-2 { grid-column: 1 / -1; min-width: 0; }
  .ex-time-pair { display: flex; gap: 4px; align-items: center; }
  .ex-table-wrap { container: extable / inline-size; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  /* Not enough room for the table (phones, tablets, beside the sidebar on
     small laptops): each student becomes a stacked card. */
  @container extable (max-width: 880px) { ${CARD_ROWS} }
  /* The teacher's list has no inputs, so it stays a table down to a narrower width. */
  .ex-table-wrap-compact { container-name: extablec; }
  @container extablec (max-width: 660px) { ${CARD_ROWS} }
  @media (max-width: 720px) { ${CARD_ROWS} }
  @media (max-width: 720px) {
    .ex-mushaf { padding: 8px 10px; }
    .ex-mushaf-text { font-size: 24px; line-height: 2; }
    .ex-basmala { font-size: 22px; }
    .ex-q { padding: 10px; }
  }
`;

// How the surah-end questions of each exam type work, for help text.
const typeRule = (type) => `${EXAM_TYPES[type]?.surahEnd ?? 1} question${type === "new_juz" ? "s start" : " starts"} at the ayah nearest the 3rd last line of a surah (student finishes the surah and starts the next one); inside a long surah, the end of a page → next page instead`;

// Label for a question's kind.
export const questionKindLabel = (kind, other) => (kind === "surah_end" ? "End of surah → next surah" : kind === "page_end" ? "End of page → next page" : other);

// ---------- small helpers ----------

export function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
const fmtSlot = (start, end) => (end ? `${fmtTime(start)} – ${fmtTime(end)}` : fmtTime(start));
export function fmtDate(d) {
  return new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
const toMinutes = (t) => { const [h, m] = (t || "0:0").split(":").map(Number); return h * 60 + m; };
const fromMinutes = (n) => `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
const hhmm = (t) => (t ? t.slice(0, 5) : "");

export function StatusBadge({ status, result }) {
  if (status === "completed" && result) {
    return <span className={`ex-status ex-status-${result}`}>{result === "pass" ? "Pass" : "Not Passed"}</span>;
  }
  if (status === "absent") return <span className="ex-status ex-status-absent">Absent</span>;
  return <span className="ex-status ex-status-scheduled">Scheduled</span>;
}

// ---------- questions ----------

// The full passage a question asks for, first ayah to last, in Uthmani script
// with the quran.com Hafs font. The starting ayah (what the examiner reads
// out) is highlighted; a surah title and basmala appear where a new surah starts.
// A word token is markable when it has Arabic letters (not the ayah number or
// a stand-alone pause mark).
const isWord = (token) => /[\u0621-\u064A\u0671-\u06D3]/.test(token);

// `marks`: highlighted mistakes as "ayahNumber:wordIndex" keys. With
// `onToggleMark`, tapping a word highlights or clears it.
export function Passage({ first, last, marks = [], onToggleMark }) {
  const [state, setState] = useState({ status: "loading", verses: [] });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setState({ status: "loading", verses: [] });
    fetchVerses(first, last)
      .then((verses) => live && setState({ status: "ready", verses }))
      .catch(() => live && setState({ status: "error", verses: [] }));
    return () => { live = false; };
  }, [first, last, attempt]);
  if (state.status === "loading") return <div className="ex-ayah-note">Loading the ayahs…</div>;
  if (state.status === "error") {
    return (
      <div className="ex-ayah-note">
        Couldn't load the Quran text (check the internet connection).{" "}
        <button type="button" className="lc-btn" style={{ padding: "2px 8px" }} onClick={() => setAttempt((n) => n + 1)}>Retry</button>
      </div>
    );
  }
  // Group into blocks so a new surah's title sits on its own line.
  const blocks = [];
  for (const v of state.verses) {
    if (v.ayah === 1 && v.number !== first) blocks.push({ header: v.surah, verses: [] });
    if (!blocks.length) blocks.push({ verses: [] });
    blocks[blocks.length - 1].verses.push(v);
  }
  return (
    <div className="ex-mushaf" lang="ar" dir="rtl">
      {blocks.map((block, i) => (
        <div key={i}>
          {block.header && (
            <>
              <div className="ex-surah-title">سُورَةُ {SURAH_NAMES_AR[block.header - 1]}</div>
              {block.header !== 9 && <div className="ex-basmala">{BASMALA}</div>}
            </>
          )}
          <p className="ex-mushaf-text">
            {block.verses.map((v) => (
              <span key={v.number} className={v.number === first ? "ex-verse ex-verse-start" : "ex-verse"}>
                {v.text.split(/\s+/).map((token, w) => {
                  const key = `${v.number}:${w}`;
                  const marked = marks.includes(key);
                  if (!isWord(token)) return <span key={w}>{token} </span>;
                  if (!onToggleMark) return <span key={w} className={marked ? "ex-word-mistake" : undefined}>{token} </span>;
                  return (
                    <span key={w}>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-pressed={marked}
                        className={`ex-word ${marked ? "ex-word-mistake" : ""}`}
                        onClick={() => onToggleMark(key)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleMark(key); } }}
                      >{token}</span>{" "}
                    </span>
                  );
                })}
              </span>
            ))}
          </p>
        </div>
      ))}
    </div>
  );
}

// `children` (e.g. the teacher's marking controls) is shown under the passage.
// `marks` are highlighted mistakes; with `onMarksChange` the card gets a
// highlighter button to mark them by tapping words. onMarksChange takes an
// updater (marks → new marks), so quick taps never overwrite each other.
export function QuestionCard({ q, index, children, marks = [], onMarksChange }) {
  const [highlighting, setHighlighting] = useState(false);
  const [first, last] = questionRange(q);
  const toggleMark = (key) => onMarksChange((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const p = q.prompt;
  const end = describeAyah(last);
  const endRef = end.surah === p.surah ? `ayah ${end.ayah}` : `${end.surahName} ${end.ayah}`;
  return (
    <div className="ex-q">
      <div className="ex-q-head">
        <span className="ex-q-num">Q{index + 1}</span>
        <span className={`ex-q-kind ex-q-kind-${q.kind}`}>{questionKindLabel(q.kind, "Random ayah")}</span>
        <span className="ex-lines">Recite {q.lines || LINES_PER_QUESTION} lines</span>
        <span className="ex-ayah-note">≈ {passageLines(first, last).toFixed(1)} lines</span>
        {onMarksChange && (
          <button type="button" className="ex-hl-btn" aria-pressed={highlighting} onClick={() => setHighlighting((h) => !h)}
            title={highlighting ? "Stop highlighting" : "Highlight mistakes"}>
            <Highlighter size={16} aria-hidden="true" />{highlighting ? "Done" : "Highlight mistakes"}
          </button>
        )}
      </div>
      <div className="ex-q-range">
        <strong>{p.surahName} {p.ayah}</strong> → <strong>{endRef}</strong>
        <span> · Page {p.page}{p.line ? `, line ${p.line}` : ""}</span>
      </div>
      <Passage first={first} last={last} marks={marks} onToggleMark={onMarksChange && highlighting ? toggleMark : undefined} />
      <div className="ex-ayah-note" style={{ marginTop: "6px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        {highlighting
          ? <span><strong>Highlighter on:</strong> tap each word where the student made a mistake (tap again to remove).</span>
          : <span>Read out the darker blue ayah; the student recites from there to the end of the blue passage.</span>}
        {marks.length > 0 && <span className="ex-mistake-count">{marks.length} mistake{marks.length === 1 ? "" : "s"} highlighted</span>}
        {onMarksChange && highlighting && marks.length > 0 && (
          <button type="button" className="lc-btn" style={{ padding: "2px 10px" }} onClick={() => onMarksChange(() => [])}>Clear all</button>
        )}
      </div>
      {children}
    </div>
  );
}

function QuestionsModal({ candidate, examType, teacherName, onClose, onRegenerate, busy }) {
  return (
    <div className="lc-modal-backdrop" onClick={onClose}>
      <div className="lc-modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "720px" }} role="dialog" aria-label={`Questions for ${candidate.student_name}`}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "4px" }}>
          <div style={{ fontWeight: 700, fontSize: "16px" }}>{candidate.student_name}</div>
          <button className="lc-btn" style={{ padding: "6px 10px" }} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div style={{ fontSize: "13px", color: TP.secondaryText, marginBottom: "14px" }}>
          {examType && <>{examTypeLabel(examType)} · </>}{fmtSlot(candidate.start_time, candidate.end_time)} · {teacherName} · {describeJuzList(candidate.juz)} · {candidate.questions.length} questions
        </div>
        {onRegenerate && (
          <button type="button" className="lc-btn" style={{ marginBottom: "14px" }} disabled={busy} onClick={onRegenerate}>
            <RotateCw size={14} aria-hidden="true" style={{ marginRight: "6px", verticalAlign: "-2px" }} />
            {busy ? "Generating…" : "Generate new questions"}
          </button>
        )}
        {candidate.questions.map((q, i) => <QuestionCard key={`${q.prompt.number}-${i}`} q={q} index={i} />)}
      </div>
    </div>
  );
}

// ---------- admin: schedule exams ----------

export function AdminExamScheduler({ students, teachers, showToast, tabs }) {
  const [sessions, setSessions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newType, setNewType] = useState("muraja");
  const [creating, setCreating] = useState(false);
  const [addStudentId, setAddStudentId] = useState("");
  const [addTeacherId, setAddTeacherId] = useState("");
  const [addStart, setAddStart] = useState("09:00");
  const [addEnd, setAddEnd] = useState("09:30");
  const [addJuz, setAddJuz] = useState([]);
  const [addCount, setAddCount] = useState(DEFAULT_QUESTIONS);
  const [adding, setAdding] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const toastRef = useRef(showToast);
  toastRef.current = showToast;

  const load = useCallback(async () => {
    setLoading(true);
    const [s, c] = await Promise.all([
      supabase.from("exam_sessions").select("*").order("exam_date", { ascending: false }),
      supabase.from("exam_candidates").select("*").order("start_time"),
    ]);
    if (s.error || c.error) toastRef.current("Couldn't load exams. Please try again.");
    else {
      setSessions(s.data);
      setCandidates(c.data);
      setSelectedId((id) => id ?? s.data[0]?.id ?? null);
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const teacherLabel = (id) => teachers.find((t) => t.id === id)?.name || "No examiner";
  const session = sessions.find((s) => s.id === selectedId) || null;
  const sessionCandidates = candidates
    .filter((c) => c.session_id === selectedId)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const viewing = candidates.find((c) => c.id === viewId) || null;
  const patchLocal = (row) => setCandidates((prev) => prev.map((c) => (c.id === row.id ? row : c)));

  const createSession = async () => {
    if (!newTitle.trim()) { showToast("Give the exam a name."); return; }
    if (!newDate) { showToast("Pick the exam date."); return; }
    setCreating(true);
    const { data, error } = await supabase.from("exam_sessions").insert({ title: newTitle.trim(), exam_date: newDate, exam_type: newType }).select("*").single();
    setCreating(false);
    if (error) { showToast("Couldn't create the exam. Please try again."); return; }
    setSessions((prev) => [data, ...prev].sort((a, b) => b.exam_date.localeCompare(a.exam_date)));
    setSelectedId(data.id);
    setNewTitle("");
    showToast("Exam created — now add the students");
  };

  const deleteSession = async (target) => {
    const count = candidates.filter((c) => c.session_id === target.id).length;
    if (!(await confirmDialog({
      title: `Delete "${target.title}"?`,
      message: `This removes the exam and its ${count} scheduled student${count === 1 ? "" : "s"}. Exam reports teachers already submitted are kept.`,
      confirmLabel: "Delete exam",
    }))) return;
    const { error } = await supabase.from("exam_sessions").delete().eq("id", target.id);
    if (error) { showToast("Couldn't delete the exam. Please try again."); return; }
    setSessions((prev) => prev.filter((s) => s.id !== target.id));
    setCandidates((prev) => prev.filter((c) => c.session_id !== target.id));
    if (selectedId === target.id) setSelectedId(sessions.find((s) => s.id !== target.id)?.id ?? null);
    showToast("Exam deleted");
  };
  const typeOf = (c) => sessions.find((s) => s.id === c.session_id)?.exam_type || "muraja";

  // Another student already with this examiner at an overlapping time.
  const clashFor = (teacherId, start, end, ignoreId) => {
    if (!teacherId) return null;
    const s = toMinutes(start);
    const e = end ? toMinutes(end) : s + 1;
    return sessionCandidates.find((c) => c.id !== ignoreId && c.teacher_id === teacherId && c.status === "scheduled"
      && s < (c.end_time ? toMinutes(c.end_time) : toMinutes(c.start_time) + 1) && toMinutes(c.start_time) < e) || null;
  };

  const addCandidate = async () => {
    const student = students.find((s) => s.id === addStudentId);
    if (!student) { showToast("Choose a student."); return; }
    if (!addTeacherId) { showToast("Choose the examining teacher."); return; }
    if (!addStart) { showToast("Set the exam time."); return; }
    if (addEnd && toMinutes(addEnd) <= toMinutes(addStart)) { showToast("The end time must be after the start time."); return; }
    if (!addJuz.length) { showToast("Select the juz to examine."); return; }
    const clash = clashFor(addTeacherId, addStart, addEnd);
    if (clash) { showToast(`${teacherLabel(addTeacherId)} is already examining ${clash.student_name} at ${fmtSlot(clash.start_time, clash.end_time)}.`); return; }
    let questions;
    try { questions = generateExamQuestions({ type: session.exam_type, juz: addJuz, count: addCount }); } catch (e) { showToast(e.message); return; }
    setAdding(true);
    const { data, error } = await supabase.from("exam_candidates").insert({
      session_id: selectedId, student_id: student.id, student_name: student.name, teacher_id: addTeacherId,
      start_time: addStart, end_time: addEnd || null, juz: [...addJuz].sort((a, b) => a - b),
      question_count: questions.length, questions,
    }).select("*").single();
    setAdding(false);
    if (error) {
      showToast(error.code === "23505" ? `${student.name} is already in this exam.` : "Couldn't add the student. Please try again.");
      return;
    }
    setCandidates((prev) => [...prev, data]);
    // Ready for the next student: next slot of the same length, same examiner.
    const length = addEnd ? toMinutes(addEnd) - toMinutes(addStart) : 0;
    const nextStart = addEnd || addStart;
    setAddStart(nextStart);
    setAddEnd(length ? fromMinutes(toMinutes(nextStart) + length) : "");
    setAddStudentId("");
    setAddJuz([]);
    showToast(`${student.name} added with ${questions.length} questions`);
  };

  const updateCandidate = async (c, patch, okMessage) => {
    const { data, error } = await supabase.from("exam_candidates").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", c.id).select("*").single();
    if (error) { showToast("Couldn't save the change. Please try again."); return null; }
    patchLocal(data);
    if (okMessage) showToast(okMessage);
    return data;
  };

  const changeTeacher = (c, teacherId) => {
    const clash = clashFor(teacherId, c.start_time, c.end_time, c.id);
    if (clash) { showToast(`${teacherLabel(teacherId)} is already examining ${clash.student_name} at that time.`); return; }
    updateCandidate(c, { teacher_id: teacherId || null }, "Examiner updated");
  };

  const changeTime = (c, field, value) => {
    const start = field === "start_time" ? value : hhmm(c.start_time);
    const end = field === "end_time" ? value : hhmm(c.end_time);
    if (!start || hhmm(c[field]) === value) return;
    if (end && toMinutes(end) <= toMinutes(start)) { showToast("The end time must be after the start time."); return; }
    const clash = clashFor(c.teacher_id, start, end, c.id);
    if (clash) { showToast(`${teacherLabel(c.teacher_id)} is already examining ${clash.student_name} at that time.`); return; }
    updateCandidate(c, { [field]: value || null }, "Time updated");
  };

  const regenerate = async (c) => {
    setBusyId(c.id);
    try {
      await updateCandidate(c, { questions: generateExamQuestions({ type: typeOf(c), juz: c.juz, count: c.question_count }) }, "New questions generated");
    } catch (e) { showToast(e.message); }
    setBusyId(null);
  };

  const removeCandidate = async (c) => {
    const note = c.status === "completed" ? " Their submitted exam report is kept." : "";
    if (!(await confirmDialog({ title: `Remove ${c.student_name} from this exam?`, message: `Their time slot and questions are deleted.${note}`, confirmLabel: "Remove" }))) return;
    const { error } = await supabase.from("exam_candidates").delete().eq("id", c.id);
    if (error) { showToast("Couldn't remove the student. Please try again."); return; }
    setCandidates((prev) => prev.filter((x) => x.id !== c.id));
    if (viewId === c.id) setViewId(null);
    showToast(`${c.student_name} removed from the exam`);
  };

  const toggleJuz = (j) => setAddJuz((prev) => (prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]));
  const pickStudent = (id) => {
    setAddStudentId(id);
    const own = students.find((s) => s.id === id)?.teacherId;
    if (own && !addTeacherId) setAddTeacherId(own);
  };

  const inSession = new Set(sessionCandidates.map((c) => c.student_id));
  const studentOptions = students
    .filter((s) => !inSession.has(s.id))
    .slice().sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => ({ value: s.id, label: s.studentCode ? `${s.name} · ${s.studentCode}` : s.name, keywords: `${s.className || ""} ${s.studentCode || ""}` }));
  const teacherOptions = teachers.slice().sort((a, b) => a.name.localeCompare(b.name));
  const doneCount = sessionCandidates.filter((c) => c.status === "completed").length;

  return (
    <div className="tp-adminexams-page">
      <style>{`
        .tp-adminexams-page { position: relative; margin: -28px -32px; padding: 32px; min-height: calc(100% + 56px); overflow: hidden; box-sizing: border-box; }
        @media (max-width: 820px) { .tp-adminexams-page { margin: -18px -16px; padding: 24px; min-height: calc(100% + 36px); } }
        @media (max-width: 640px) { .tp-adminexams-page { padding: 20px; } }
        ${examCss()}
      `}</style>
      <div className="tp-header">
        <div className="tp-title-group">
          <span className="tp-title-icon" aria-hidden="true"><CalendarDays size={22} /></span>
          <div>
            <h1 className="tp-title">Schedule Exams</h1>
            <div className="tp-subtext" style={{ margin: 0 }}>Add ready students, assign examiners and times — questions are generated from their juz</div>
          </div>
        </div>
        {tabs}
      </div>

      <div className="ex-root">
      <div className="ex-layout">
        <div className="tp-card">
          <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>New exam</div>
          <label className="ex-label" htmlFor="ex-new-title">Exam name</label>
          <input id="ex-new-title" className="lc-input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Juz 30 exam — November" />
          <label className="ex-label" htmlFor="ex-new-date" style={{ marginTop: "10px" }}>Date</label>
          <input id="ex-new-date" className="lc-input" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <span className="ex-label" style={{ marginTop: "10px" }}>Exam type</span>
          <div className="ex-type-grid" role="group" aria-label="Exam type">
            {Object.entries(EXAM_TYPES).map(([key, t]) => (
              <button key={key} type="button" className="ex-type" aria-pressed={newType === key} onClick={() => setNewType(key)}>
                {t.label}
                <small>{t.surahEnd} from end of surah (or page)</small>
              </button>
            ))}
          </div>
          <button type="button" className="tp-btn-gradient" style={{ marginTop: "12px", width: "100%" }} disabled={creating} onClick={createSession}>
            <Plus size={16} aria-hidden="true" />{creating ? "Creating…" : "Create exam"}
          </button>

          <div style={{ fontSize: "15px", fontWeight: 700, margin: "22px 0 10px" }}>Exams</div>
          {loading ? (
            <div className="lc-loading-row"><span className="lc-spinner"></span>Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="ex-empty">No exams yet.</div>
          ) : sessions.map((s) => {
            const list = candidates.filter((c) => c.session_id === s.id);
            return (
              <div key={s.id} className="ex-session-row">
                <button type="button" className="ex-session" aria-current={s.id === selectedId} onClick={() => setSelectedId(s.id)}>
                  <div className="ex-session-title">{s.title}</div>
                  <div className="ex-session-meta">{examTypeLabel(s.exam_type)} · {fmtDate(s.exam_date)} · {list.length} student{list.length === 1 ? "" : "s"}</div>
                </button>
                <button type="button" className="ex-session-del" onClick={() => deleteSession(s)} aria-label={`Delete exam ${s.title}`} title="Delete exam">
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>

        {session ? (
          <div>
            <div className="tp-card" style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 700 }}>{session.title} <span className="ex-type-badge" style={{ verticalAlign: "3px" }}>{examTypeLabel(session.exam_type)}</span></div>
                  <div style={{ fontSize: "13px", color: TP.secondaryText, marginTop: "2px" }}>
                    {fmtDate(session.exam_date)} · {sessionCandidates.length} student{sessionCandidates.length === 1 ? "" : "s"} · {doneCount} marked
                  </div>
                </div>
                <button type="button" className="lc-btn lc-btn-danger" onClick={() => deleteSession(session)}>
                  <Trash2 size={14} aria-hidden="true" style={{ marginRight: "6px", verticalAlign: "-2px" }} />Delete exam
                </button>
              </div>

              <div style={{ fontSize: "15px", fontWeight: 700, margin: "20px 0 12px" }}>Add a student</div>
              <div className="ex-add-grid">
                <div className="ex-span-2">
                  <span className="ex-label">Student</span>
                  <SearchableSelect value={addStudentId} onChange={pickStudent} placeholder="Select student" options={studentOptions} />
                </div>
                <div>
                  <label className="ex-label" htmlFor="ex-add-teacher">Examiner</label>
                  <select id="ex-add-teacher" className="lc-select" value={addTeacherId} onChange={(e) => setAddTeacherId(e.target.value)}>
                    <option value="">Select teacher</option>
                    {teacherOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ex-label" htmlFor="ex-add-start">Start time</label>
                  <input id="ex-add-start" className="lc-input" type="time" value={addStart} onChange={(e) => setAddStart(e.target.value)} />
                </div>
                <div>
                  <label className="ex-label" htmlFor="ex-add-end">End time</label>
                  <input id="ex-add-end" className="lc-input" type="time" value={addEnd} onChange={(e) => setAddEnd(e.target.value)} />
                </div>
                <div>
                  <label className="ex-label" htmlFor="ex-add-count">Number of questions</label>
                  <input id="ex-add-count" className="lc-input" type="number" min="1" max={MAX_QUESTIONS} value={addCount}
                    onChange={(e) => setAddCount(Math.max(1, Math.min(MAX_QUESTIONS, Number(e.target.value) || 1)))} />
                </div>
              </div>
              <div style={{ marginTop: "14px" }}>
                <span className="ex-label">Juz to examine {addJuz.length > 0 && `— ${describeJuzList(addJuz)}`}</span>
                <div className="ex-juz-grid" role="group" aria-label="Juz to examine">
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                    <button key={j} type="button" className="ex-juz" aria-pressed={addJuz.includes(j)} aria-label={`Juz ${j}`} onClick={() => toggleJuz(j)}>{j}</button>
                  ))}
                </div>
                <div style={{ fontSize: "12px", color: TP.secondaryText, marginTop: "8px" }}>
                  {examTypeLabel(session.exam_type)}: {typeRule(session.exam_type)}; the rest start at random ayahs across the selected juz. Every question is {LINES_PER_QUESTION} lines, and questions come in random order.
                </div>
              </div>
              <button type="button" className="tp-btn-gradient" style={{ marginTop: "16px" }} disabled={adding} onClick={addCandidate}>
                <Plus size={16} aria-hidden="true" />{adding ? "Adding…" : "Add student & generate questions"}
              </button>
            </div>

            <div className="tp-card">
              <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>Students in this exam</div>
              {sessionCandidates.length === 0 ? (
                <div className="ex-empty">No students added yet.</div>
              ) : (
                <div className="ex-table-wrap">
                  <table className="ex-table">
                    <thead>
                      <tr><th>Time</th><th>Student</th><th>Examiner</th><th>Juz</th><th>Questions</th><th>Status</th><th></th></tr>
                    </thead>
                    <tbody>
                      {sessionCandidates.map((c) => {
                        const locked = c.status !== "scheduled";
                        return (
                          <tr key={c.id}>
                            <td data-label="Time" className={locked ? undefined : "ex-td-time"} style={{ whiteSpace: "nowrap" }}>
                              {locked ? fmtSlot(c.start_time, c.end_time) : (
                                <div className="ex-time-pair">
                                  <input className="lc-input ex-time-input" type="time" aria-label={`Start time for ${c.student_name}`} defaultValue={hhmm(c.start_time)} onBlur={(e) => changeTime(c, "start_time", e.target.value)} />
                                  –
                                  <input className="lc-input ex-time-input" type="time" aria-label={`End time for ${c.student_name}`} defaultValue={hhmm(c.end_time)} onBlur={(e) => changeTime(c, "end_time", e.target.value)} />
                                </div>
                              )}
                            </td>
                            <td data-label="Student" style={{ fontWeight: 600 }}>{c.student_name}</td>
                            <td data-label="Examiner" style={{ minWidth: "150px" }}>
                              {locked ? teacherLabel(c.teacher_id) : (
                                <select className="lc-select" aria-label={`Examiner for ${c.student_name}`} value={c.teacher_id || ""} onChange={(e) => changeTeacher(c, e.target.value)}>
                                  <option value="">Select teacher</option>
                                  {teacherOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                              )}
                            </td>
                            <td data-label="Juz" style={{ whiteSpace: "nowrap" }}>{describeJuzList(c.juz)}</td>
                            <td data-label="Questions">{c.questions.length}</td>
                            <td data-label="Status"><StatusBadge status={c.status} result={c.final_result} /></td>
                            <td className="ex-td-actions">
                              <div className="ex-row-actions">
                                <button type="button" className="lc-btn" onClick={() => setViewId(c.id)}>
                                  <Eye size={14} aria-hidden="true" style={{ marginRight: "4px", verticalAlign: "-2px" }} />Questions
                                </button>
                                {!locked && (
                                  <button type="button" className="lc-btn" disabled={busyId === c.id} onClick={() => regenerate(c)} aria-label={`Generate new questions for ${c.student_name}`}>
                                    <RotateCw size={14} aria-hidden="true" />
                                  </button>
                                )}
                                <button type="button" className="lc-btn lc-btn-danger" onClick={() => removeCandidate(c)} aria-label={`Remove ${c.student_name} from this exam`}>
                                  <Trash2 size={14} aria-hidden="true" style={{ marginRight: "4px", verticalAlign: "-2px" }} />Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : !loading && (
          <div className="tp-card ex-empty">Create an exam to start adding students.</div>
        )}
      </div>
      </div>

      {viewing && (
        <QuestionsModal
          candidate={viewing}
          examType={typeOf(viewing)}
          teacherName={teacherLabel(viewing.teacher_id)}
          onClose={() => setViewId(null)}
          onRegenerate={viewing.status === "scheduled" ? () => regenerate(viewing) : null}
          busy={busyId === viewing.id}
        />
      )}
    </div>
  );
}

// ---------- teacher: exams assigned to me ----------

export function TeacherScheduledExams({ teacherId, onStart, onEdit, showToast }) {
  const [rows, setRows] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const toastRef = useRef(showToast);
  toastRef.current = showToast;

  useEffect(() => {
    if (!teacherId) return;
    supabase.from("exam_candidates").select("*, exam_sessions(title, exam_date, exam_type)").eq("teacher_id", teacherId)
      .then(({ data, error }) => {
        if (error) { toastRef.current("Couldn't load your scheduled exams."); setRows([]); return; }
        setRows(data.sort((a, b) => (a.exam_sessions.exam_date + a.start_time).localeCompare(b.exam_sessions.exam_date + b.start_time)));
      });
  }, [teacherId]);

  if (!rows) return <div className="lc-loading-row"><span className="lc-spinner"></span>Loading scheduled exams…</div>;
  const upcoming = rows.filter((r) => r.status === "scheduled");
  const done = rows.filter((r) => r.status !== "scheduled").reverse();
  const preview = rows.find((r) => r.id === previewId);

  const table = (list, active) => (
    <div className="ex-table-wrap ex-table-wrap-compact">
      <table className="ex-table">
        <thead><tr><th>Date</th><th>Time</th><th>Student</th><th>Juz</th><th>Questions</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id}>
              <td data-label="Date" style={{ whiteSpace: "nowrap" }}>{fmtDate(r.exam_sessions.exam_date)}</td>
              <td data-label="Time" style={{ whiteSpace: "nowrap" }}>{fmtSlot(r.start_time, r.end_time)}</td>
              <td data-label="Student" style={{ fontWeight: 600 }}><div>{r.student_name}<div style={{ fontSize: "12px", color: TP.secondaryText, fontWeight: 400 }}>{r.exam_sessions.title} · {examTypeLabel(r.exam_sessions.exam_type)}</div></div></td>
              <td data-label="Juz" style={{ whiteSpace: "nowrap" }}>{describeJuzList(r.juz)}</td>
              <td data-label="Questions">{r.questions.length}</td>
              <td data-label="Status"><StatusBadge status={r.status} result={r.final_result} /></td>
              <td className="ex-td-actions">
                <div className="ex-row-actions">
                  <button type="button" className="lc-btn" onClick={() => setPreviewId(r.id)}>
                    <Eye size={14} aria-hidden="true" style={{ marginRight: "4px", verticalAlign: "-2px" }} />Questions
                  </button>
                  {active && (
                    <button type="button" className="lc-btn lc-btn-primary" onClick={() => onStart(r)}>
                      <PlayCircle size={14} aria-hidden="true" style={{ marginRight: "4px", verticalAlign: "-2px" }} />Start exam
                    </button>
                  )}
                  {!active && r.report_id && (
                    <button type="button" className="lc-btn lc-btn-primary" onClick={() => onEdit(r)}>
                      <Pencil size={14} aria-hidden="true" style={{ marginRight: "4px", verticalAlign: "-2px" }} />Edit result
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <style>{examCss()}</style>
      <div className="lc-card">
        <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>Exams assigned to you</div>
        <div style={{ fontSize: "13px", color: TP.secondaryText, marginBottom: "14px" }}>Scheduled by the admin. Start an exam to mark the questions and submit the result. You can edit and resubmit a result afterwards under Finished.</div>
        {upcoming.length === 0 ? <div className="ex-empty">No upcoming exams.</div> : table(upcoming, true)}
      </div>
      {done.length > 0 && (
        <div className="lc-card" style={{ marginTop: "16px" }}>
          <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>Finished</div>
          {table(done, false)}
        </div>
      )}
      {preview && <QuestionsModal candidate={preview} examType={preview.exam_sessions.exam_type} teacherName="You" onClose={() => setPreviewId(null)} />}
    </div>
  );
}

// ---------- student: my exams ----------

export function StudentExams() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    supabase.rpc("my_exam_schedule").then(({ data, error }) => { if (!error && data) setRows(data); });
  }, []);
  if (!rows.length) return null;
  return (
    <section className="sp-card sp-exams" aria-label="My exams">
      <style>{`
        .sp-exams { padding: 20px; }
        .sp-exams h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 14px; font-size: 18px; color: ${TP.navy}; }
        .sp-exam { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 0; border-top: 1px solid #E7F2FA; }
        .sp-exam:first-of-type { border-top: none; padding-top: 0; }
        .sp-exam-main { flex: 1; min-width: 180px; }
        .sp-exam-title { font-weight: 700; }
        .sp-exam-meta { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 13px; color: ${TP.secondaryText}; margin-top: 4px; }
        .sp-exam-meta span { display: inline-flex; align-items: center; gap: 5px; }
        ${examCss()}
      `}</style>
      <h2><BookOpen size={22} color={TP.blue} aria-hidden="true" />My Exams</h2>
      {rows.map((r) => (
        <div key={r.id} className="sp-exam">
          <div className="sp-exam-main">
            <div className="sp-exam-title">{r.title} <span className="ex-type-badge">{examTypeLabel(r.exam_type)}</span></div>
            <div className="sp-exam-meta">
              <span><CalendarDays size={14} aria-hidden="true" />{fmtDate(r.exam_date)}</span>
              <span><Clock size={14} aria-hidden="true" />{fmtSlot(r.start_time, r.end_time)}</span>
              {r.teacher_name && <span><User size={14} aria-hidden="true" />{r.teacher_name}</span>}
              <span>{describeJuzList(r.juz)}</span>
            </div>
          </div>
          {r.status === "completed" && r.final_result
            ? <span className={`ex-status ex-status-${r.final_result}`}>{r.final_result === "pass" ? <CheckCircle2 size={13} aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: "4px" }} /> : <XCircle size={13} aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: "4px" }} />}{r.final_result === "pass" ? "Passed" : "Not passed"}</span>
            : <StatusBadge status={r.status} result={r.final_result} />}
        </div>
      ))}
    </section>
  );
}
