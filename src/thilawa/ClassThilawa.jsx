// Thilawa by class. The teacher opens one reading for the whole class; it
// stays open for every student of the class, day after day, until the
// teacher changes it, and the class carries on from the page where it
// stopped (kept in the database, so any device picks it up). The teacher
// also writes down the Tajweed topics taken with the class; every student of
// the class sees them.
//
// TeacherClassPanel: the class's reading and topics in the teacher portal.
// StudentClassReading: the student's "Class Reading" page.
// A class repo is createSupabaseClassRepo / createMemoryClassRepo (repos.js).

import { useState, useEffect, useCallback, useRef } from "react";
import { BookOpen, ArrowRight, RefreshCw, X, Plus, Trash2, GraduationCap, CalendarDays, Navigation, Highlighter, BookMarked, ChevronDown, History, Mic, StickyNote, CheckCircle2 } from "lucide-react";
import { confirmDialog } from "../ConfirmDialog.jsx";
import { TOTAL_PAGES, describePages, readingTitle, MISTAKE_CATEGORIES } from "./engine.js";
import { browserTimezone } from "./service.js";
import { localDate } from "../hifz/engine.js";
import SurahAyahPicker from "./SurahAyahPicker.jsx";
import ClassLesson from "./ClassLesson.jsx";
import { currentRecitations, recitationMarks } from "./RecitationMarking.jsx";
import RecitationViewer from "./RecitationViewer.jsx";
import { Reader, fmtDate } from "./ThilawaStudent.jsx";

const fmtWhen = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const CLASS_CSS = `
  .ct { display: flex; flex-direction: column; gap: 14px; margin-bottom: 18px; }
  .ct-reading { padding: 0 !important; overflow: hidden; }
  .ct-head { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 18px 20px; color: #FFFFFF; background: linear-gradient(120deg, #0D4F85 0%, #176FD1 55%, #0A94B1 100%); }
  .ct-head-icon { flex-shrink: 0; width: 50px; height: 50px; border-radius: 15px; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center; }
  .ct-head-text { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 3px; }
  .ct-head-text small { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85; }
  .ct-head-text h2 { margin: 0; font-size: clamp(19px, 4.4vw, 26px); line-height: 1.2; overflow-wrap: anywhere; }
  .ct-head-text span { font-size: 14px; opacity: 0.92; }
  .ct-head .hz-btn-primary { background: #FFFFFF; color: #0D4F85; box-shadow: 0 8px 18px rgba(8,40,80,0.25); min-height: 50px; padding: 0 22px; font-size: 15px; }
  .ct-body { padding: 16px 20px 18px; display: flex; flex-direction: column; gap: 12px; }
  .ct-stop { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 14px; color: #123B67; }
  .ct-stop b { font-size: 15px; }
  .ct-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: #DDF3F6; color: #0A6F84; font-size: 13px; font-weight: 700; }
  .ct-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .ct-form .ct-wide { grid-column: 1 / -1; }
  .ct-form .hz-field { margin-top: 0; }
  .ct-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
  .ct-topics { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .ct-topics li { border-radius: 12px; background: #F7F4FC; border: 1px solid #E5DCF4; overflow: hidden; }
  /* Just the topic; tapping it opens when it was taken and the note. */
  .ct-topic-row { width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: none; background: transparent; text-align: left; cursor: pointer; font: inherit; color: inherit; -webkit-tap-highlight-color: transparent; }
  .ct-topic-row:hover { background: #F1ECFA; }
  .ct-topic-row:focus-visible { outline: 2px solid #6A3FA0; outline-offset: -2px; border-radius: 12px; }
  .ct-topic-icon { flex-shrink: 0; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: #ECE5FA; color: #6A3FA0; }
  .ct-topics b { flex: 1; min-width: 0; color: #2D1B4E; font-size: 15px; overflow-wrap: anywhere; }
  .ct-topic-chev { flex-shrink: 0; color: #6B5A86; transition: transform 0.18s; }
  .ct-topic-open .ct-topic-chev { transform: rotate(180deg); }
  .ct-topic-detail { display: flex; align-items: flex-end; gap: 12px; padding: 0 12px 12px 58px; }
  .ct-topic-detail > div { flex: 1; min-width: 0; }
  .ct-topics small { display: block; color: #6B5A86; font-size: 13px; }
  .ct-topics p { margin: 6px 0 0; color: #3D2D5C; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
  .ct-del { flex-shrink: 0; width: 38px; height: 38px; border-radius: 10px; border: 1px solid #E5DCF4; background: #FFFFFF; color: #6B5A86; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
  .ct-del:hover { color: #A5432C; border-color: #F0C2B6; }
  .ct-topics-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .ct-topics-head .hz-h2 { flex: 1; margin-bottom: 0; }
  .ct-topics-head .hz-btn { min-height: 38px; padding: 0 14px; font-size: 14px; }
  .ct-add-box { margin-top: 14px; padding: 14px; border-radius: 14px; background: #F7FAFD; border: 1px solid #DCEBF8; }
  .ct-add { display: grid; grid-template-columns: minmax(0, 1fr) 160px; gap: 8px; align-items: end; }
  .ct-add .hz-field { margin-top: 0; }
  /* Today's recitation: what the class recites today, from ayah to ayah, and the days before. */
  .ct-today { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px; background: linear-gradient(120deg, #E9F7F1 0%, #EEF6FE 100%); border: 1px solid #BFE6D4; margin-top: 12px; }
  .ct-today-icon { flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: #FFFFFF; color: #13795B; box-shadow: 0 2px 8px rgba(19,121,91,0.12); }
  .ct-today > div { flex: 1; min-width: 0; }
  .ct-today small { display: block; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #13795B; }
  .ct-today b { display: block; font-size: 17px; color: #123B67; overflow-wrap: anywhere; }
  .ct-today span { font-size: 13px; color: #567493; }
  .ct-next { background: linear-gradient(120deg, #F3EEFC 0%, #EEF6FE 100%); border-color: #D8CBF3; }
  .ct-next .ct-today-icon { color: #7A4FD0; box-shadow: 0 2px 8px rgba(122,79,208,0.14); }
  .ct-next small { color: #7A4FD0; }
  .ct-today .hz-btn { min-height: 38px; padding: 0 12px; font-size: 13px; flex-shrink: 0; }
  .ct-today-none { margin-top: 12px; }
  .ct-history-title { display: flex; align-items: center; gap: 6px; margin: 16px 0 8px; font-size: 13px; font-weight: 700; color: #567493; letter-spacing: 0.04em; text-transform: uppercase; }
  .ct-history { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; }
  .ct-history li { display: flex; align-items: center; gap: 12px; padding: 10px 2px; border-top: 1px solid #EEF3F8; }
  .ct-history li:first-child { border-top: none; }
  .ct-history-date { flex-shrink: 0; width: 92px; font-size: 13px; color: #567493; }
  .ct-history li > div { flex: 1; min-width: 0; }
  .ct-history b { display: block; font-size: 15px; color: #123B67; overflow-wrap: anywhere; }
  .ct-history li > div span { font-size: 12.5px; color: #567493; }
  .ct-fold { width: 100%; margin-top: 12px; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; border: 1px solid #DCEBF8; background: #F7FAFD; color: #123B67;
    font: 700 15px/1.2 Inter, ui-sans-serif, system-ui, sans-serif; text-align: left; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .ct-fold:hover { background: #EEF6FE; }
  .ct-fold:focus-visible { outline: 2px solid #176FD1; outline-offset: 2px; }
  .ct-fold-icon { flex-shrink: 0; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: #E9F7F1; color: #13795B; }
  .ct-fold-topics { background: #ECE5FA !important; color: #6A3FA0 !important; }
  .ct-fold > span:nth-child(2) { flex: 1; min-width: 0; }
  .ct-fold small { display: block; margin-top: 3px; font-weight: 400; font-size: 13px; color: #567493; overflow-wrap: anywhere; }
  .ct-fold > svg { flex-shrink: 0; color: #567493; transition: transform 0.18s; }
  .ct-fold[aria-expanded="true"] > svg { transform: rotate(180deg); }
  .ct-view { flex-shrink: 0; min-height: 38px !important; padding: 0 12px !important; font-size: 13px !important; gap: 6px; }
  @media (max-width: 420px) { .ct-view span { display: none; } .ct-view { width: 38px; padding: 0 !important; justify-content: center; } }
  .ct-more { margin-top: 6px; min-height: 36px; font-size: 13px; }
  /* The student's Class page: what the colours in the Mushaf are, and the teacher's note. */
  .ct-key { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 0 0 10px; font-size: 13px; color: #567493; }
  .ct-key span { display: inline-flex; align-items: center; gap: 6px; }
  .ct-key b { color: #123B67; }
  .ct-key i { flex-shrink: 0; width: 12px; height: 12px; border-radius: 50%; }
  .ct-key-today { background: #13795B; }
  .ct-key-next { background: #7A4FD0; }
  .ct-key-words { background: #FBD5CC; box-shadow: 0 0 0 1px #F2A595; border-radius: 3px !important; }
  .ct-key-letters { background: #E8650A; border-radius: 3px !important; }
  .ct-key-ar { font: 600 16px/1 "Noto Naskh Arabic", "Geeza Pro", serif; color: #E8650A !important; }
  .ct-note { background: #FFFBF0 !important; border-color: #F1E0B0 !important; }
  .ct-note .hz-h2 { color: #8A6A22; }
  .ct-note p { margin: 0; color: #123B67; font-size: 15px; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
  .ct-note small { display: block; margin-top: 6px; color: #8A6A22; font-size: 12px; }
  .ct-follow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 12px; border-radius: 12px; background: #EEF6FE; border: 1px solid #BFDDF6; color: #123B67; font-size: 14px; }
  .ct-follow .hz-btn { min-height: 38px; margin-left: auto; }
  @media (max-width: 560px) {
    .ct-form, .ct-add { grid-template-columns: 1fr; }
    .ct-head { padding: 16px; }
    .ct-body { padding: 12px 12px 14px; }
    .ct-reader-card { padding: 12px 6px !important; }
    .ct-reader-card > .ct-follow, .ct-reader-card > .hz-h2 { margin-left: 8px; margin-right: 8px; }
  }
`;

// The class's open reading and topics, kept fresh (live when the repo can).
export function useClassThilawa(repo) {
  const [state, setState] = useState(null); // { reading, topics, recitations }
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!repo) return;
    try {
      const [reading, topics, recitations] = await Promise.all([repo.getReading(), repo.listTopics(),
        repo.listRecitations ? repo.listRecitations().catch(() => []) : []]);
      setState({ reading, topics, recitations });
      setError("");
    } catch (e) { setError(e.message); }
  }, [repo]);
  useEffect(() => {
    setState(null);
    refresh();
    const stop = repo?.subscribe?.(() => refresh());
    const onShow = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { stop?.(); document.removeEventListener("visibilitychange", onShow); };
  }, [repo, refresh]);
  return { state, error, setError, refresh };
}

// Choosing the part: a surah and its ayahs, or pages. onOpen({ fromPage,
// toPage, firstAyah, lastAyah, label }). fromPage: where the pages start (e.g.
// where the class stopped).
function ReadingForm({ id, fromPage = "", onOpen, onCancel, busy, openLabel }) {
  const [from, setFrom] = useState(String(fromPage || ""));
  const [to, setTo] = useState("");
  const [picked, setPicked] = useState(null); // from the surah picker, until the pages are typed over
  const [pickerKey, setPickerKey] = useState(0);
  const [error, setError] = useState("");
  const pick = (r) => { setFrom(String(r.fromPage)); setTo(String(r.toPage)); setPicked(r); };
  const a = Math.round(+from);
  const b = Math.round(+(to || from));
  const valid = a >= 1 && a <= TOTAL_PAGES && b >= a && b <= TOTAL_PAGES;
  const open = () => {
    if (!valid) { setError(`Pages must be between 1 and ${TOTAL_PAGES}, with the last page not before the first.`); return; }
    setError("");
    onOpen(picked
      ? { fromPage: a, toPage: b, firstAyah: picked.first, lastAyah: picked.last, label: picked.label }
      : { fromPage: a, toPage: b, firstAyah: null, lastAyah: null, label: "" });
  };
  return (
    <div className="ct-form">
      <div className="ct-wide"><SurahAyahPicker key={pickerKey} id={`${id}-surah`} onPick={pick} /></div>
      <div className="hz-field">
        <label htmlFor={`${id}-from`}>From page</label>
        <input id={`${id}-from`} className="hz-input" type="number" inputMode="numeric" min="1" max={TOTAL_PAGES} value={from} placeholder="e.g. 582"
          onChange={(e) => { setFrom(e.target.value); setPicked(null); setPickerKey((k) => k + 1); }} />
      </div>
      <div className="hz-field">
        <label htmlFor={`${id}-to`}>To page</label>
        <input id={`${id}-to`} className="hz-input" type="number" inputMode="numeric" min="1" max={TOTAL_PAGES} value={to} placeholder="Same page"
          onChange={(e) => { setTo(e.target.value); setPicked(null); setPickerKey((k) => k + 1); }} />
      </div>
      {valid && <p className="hz-muted ct-wide" style={{ margin: 0 }}>{picked ? `${picked.label} · ` : ""}{describePages(a, b)}</p>}
      {error && <div className="hz-error ct-wide" role="alert">{error}</div>}
      <div className="ct-actions ct-wide">
        {onCancel && <button className="hz-btn hz-btn-ghost" onClick={onCancel}>Cancel</button>}
        <button className="hz-btn hz-btn-primary" disabled={busy || !from} onClick={open}><BookOpen size={18} aria-hidden="true" />{openLabel}</button>
      </div>
    </div>
  );
}

// The Tajweed topics taken with the class, newest first. With onAdd /
// onDelete the teacher can add and remove them. folded: the list is under a
// Show button (the student's page).
export function TopicsCard({ topics, onAdd = null, onDelete = null, busy = false, error = "", folded = false }) {
  const [shown, setShown] = useState(!folded); // the list, folded away until tapped
  const [openId, setOpenId] = useState(null); // the topic showing its date and note
  const [adding, setAdding] = useState(false); // the form for a new topic is shown
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState("");
  const [day, setDay] = useState(() => localDate(new Date(), browserTimezone()));
  const add = async () => {
    if (!topic.trim()) return;
    if (await onAdd({ topic, note, taughtOn: day })) { setTopic(""); setNote(""); setAdding(false); }
  };
  const cancel = () => { setTopic(""); setNote(""); setAdding(false); };
  return (
    <section className="hz-card" aria-label="Tajweed topics">
      <div className="ct-topics-head">
        <h2 className="hz-h2"><GraduationCap size={22} aria-hidden="true" />Tajweed topics taken{topics.length > 0 && <span className="hz-muted" style={{ fontWeight: 400 }}>· {topics.length}</span>}</h2>
        {onAdd && !adding && <button type="button" className="hz-btn hz-btn-primary" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" />Add topic</button>}
      </div>
      {onAdd && adding && (
        <div className="ct-add-box">
          <div className="ct-add">
            <div className="hz-field">
              <label htmlFor="ct-topic">Topic</label>
              <input id="ct-topic" autoFocus className="hz-input" maxLength={200} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Noon sakinah: Ikhfa"
                onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
            </div>
            <div className="hz-field">
              <label htmlFor="ct-day">Taken on</label>
              <input id="ct-day" className="hz-input" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
            </div>
          </div>
          <div className="hz-field">
            <label htmlFor="ct-note">Note for the students (optional)</label>
            <input id="ct-note" className="hz-input" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 15 letters; practise with page 582" />
          </div>
          <div className="ct-actions" style={{ marginTop: 12 }}>
            <button type="button" className="hz-btn hz-btn-outline" disabled={busy} onClick={cancel}>Cancel</button>
            <button type="button" className="hz-btn hz-btn-primary" disabled={busy || !topic.trim() || !day} onClick={add}><Plus size={18} aria-hidden="true" />Add</button>
          </div>
        </div>
      )}
      {onAdd && error && <div className="hz-error" role="alert" style={{ marginTop: 12 }}>{error}</div>}
      {folded && topics.length > 0 && (
        <button type="button" className="ct-fold" aria-expanded={shown} onClick={() => setShown((x) => !x)}>
          <span className="ct-fold-icon ct-fold-topics" aria-hidden="true"><GraduationCap size={18} /></span>
          <span>{shown ? "Hide" : "Show"}{!shown && <small>{topics[0].topic}</small>}</span>
          <ChevronDown size={20} aria-hidden="true" />
        </button>
      )}
      {!shown ? null : topics.length === 0
        ? <p className="hz-muted" style={{ margin: onAdd ? "14px 0 0" : 0 }}>No topics yet.</p>
        : (
          <ul className="ct-topics" style={{ marginTop: 14 }}>
            {topics.map((t) => (
              <li key={t.id} className={openId === t.id ? "ct-topic-open" : undefined}>
                <button type="button" className="ct-topic-row" aria-expanded={openId === t.id} aria-controls={`ct-topic-${t.id}`} onClick={() => setOpenId((o) => (o === t.id ? null : t.id))}>
                  <span className="ct-topic-icon" aria-hidden="true"><GraduationCap size={18} /></span>
                  <b>{t.topic}</b>
                  <ChevronDown size={18} className="ct-topic-chev" aria-hidden="true" />
                </button>
                {openId === t.id && (
                  <div className="ct-topic-detail" id={`ct-topic-${t.id}`}>
                    <div>
                      <small><CalendarDays size={12} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> {fmtDate(t.taughtOn)}</small>
                      {t.note && <p>{t.note}</p>}
                    </div>
                    {onDelete && <button className="ct-del" disabled={busy} aria-label={`Delete ${t.topic}`} title="Delete" onClick={() => onDelete(t)}><Trash2 size={16} aria-hidden="true" /></button>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}

// What the class recites each day, from ayah to ayah: today's at the top,
// then the next one (marked ahead), then the days before under History,
// newest first. The teacher marks them on the Mushaf (tapping ayah numbers,
// see RecitationMarking.jsx) or here. With onSave / onDelete / onStartNext
// the teacher saves a day's ayahs, removes one, and starts the next one today.
const pagesOf = (r) => (r.fromPage === r.toPage ? `page ${r.fromPage}` : `pages ${r.fromPage}–${r.toPage}`);
const HISTORY_SHOWN = 7;
export function RecitationCard({ recitations = [], onSave = null, onDelete = null, onStartNext = null, busy = false, error = "" }) {
  const today = localDate(new Date(), browserTimezone());
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState(null);
  const [day, setDay] = useState(today);
  const [all, setAll] = useState(false); // the whole history, not just the last few days
  const [viewing, setViewing] = useState(null); // the part open in the Mushaf
  const [open, setOpen] = useState(false); // the parts and history, folded away until tapped
  // The current part is the last one marked: today's, or an earlier day's until another is marked.
  const { current, next } = currentRecitations(recitations);
  const before = recitations.filter((r) => r.kind !== "next" && r !== current);
  const shown = all ? before : before.slice(0, HISTORY_SHOWN);
  const save = async () => {
    if (!picked) return;
    const ok = await onSave({ recitedOn: day, first: picked.first, last: picked.last, fromPage: picked.fromPage, toPage: picked.toPage, label: picked.label });
    if (ok) { setAdding(false); setPicked(null); setDay(today); }
  };
  const cancel = () => { setAdding(false); setPicked(null); setDay(today); };
  const view = (r, what) => <button type="button" className="hz-btn hz-btn-outline ct-view" aria-label={`View ${r.label} (${what}) in the Mushaf`} title="View in the Mushaf" onClick={() => setViewing(r)}><BookOpen size={15} aria-hidden="true" /><span>View</span></button>;
  const del = (r, what) => onDelete && <button className="ct-del" disabled={busy} aria-label={`Delete ${r.label} (${what})`} title="Delete" onClick={() => onDelete(r, what)}><Trash2 size={16} aria-hidden="true" /></button>;

  return (
    <section className="hz-card" aria-label="Today's recitation">
      {viewing && <RecitationViewer recitation={viewing} onClose={() => setViewing(null)} />}
      <div className="ct-topics-head">
        <h2 className="hz-h2"><Mic size={22} aria-hidden="true" />Today's recitation</h2>
        {onSave && !adding && <button type="button" className="hz-btn hz-btn-primary" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" />Mark ayahs</button>}
      </div>
      {onSave && adding && (
        <div className="ct-add-box">
          <SurahAyahPicker id="ct-rec" label="Surah" onPick={setPicked} />
          <div className="hz-field">
            <label htmlFor="ct-rec-day">Day</label>
            <input id="ct-rec-day" className="hz-input" type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} style={{ maxWidth: 220 }} />
          </div>
          <div className="ct-actions" style={{ marginTop: 12 }}>
            <button type="button" className="hz-btn hz-btn-outline" disabled={busy} onClick={cancel}>Cancel</button>
            <button type="button" className="hz-btn hz-btn-primary" disabled={busy || !picked || !day} onClick={save}><Plus size={18} aria-hidden="true" />Save</button>
          </div>
        </div>
      )}
      {onSave && error && <div className="hz-error" role="alert" style={{ marginTop: 12 }}>{error}</div>}
      <button type="button" className="ct-fold" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="ct-fold-icon" aria-hidden="true"><History size={18} /></span>
        <span>{open ? "Hide" : "Show"}
          {current && !open && <small>{current.label}</small>}</span>
        <ChevronDown size={20} aria-hidden="true" />
      </button>
      {open && <>
      {current ? (
        <div className="ct-today">
          <span className="ct-today-icon" aria-hidden="true"><Mic size={20} /></span>
          <div><small>{current.recitedOn === today ? "Today" : fmtDate(current.recitedOn)}</small><b>{current.label}</b><span>{pagesOf(current)}</span></div>
          {view(current, "current")}
          {del(current, current.recitedOn === today ? "today" : fmtDate(current.recitedOn))}
        </div>
      ) : null}
      {next && (
        <div className="ct-today ct-next">
          <span className="ct-today-icon" aria-hidden="true"><ArrowRight size={20} /></span>
          <div><small>Next</small><b>{next.label}</b><span>{pagesOf(next)}</span></div>
          {view(next, "next")}
          {onStartNext && current?.recitedOn !== today && <button type="button" className="hz-btn hz-btn-outline" disabled={busy} onClick={onStartNext}>Start it today</button>}
          {del(next, "next")}
        </div>
      )}
      {before.length > 0 && (
        <>
          <div className="ct-history-title"><History size={14} aria-hidden="true" />History</div>
          <ul className="ct-history">
            {shown.map((r) => (
              <li key={r.id}>
                <span className="ct-history-date">{fmtDate(r.recitedOn)}</span>
                <div><b>{r.label}</b><span>{pagesOf(r)}</span></div>
                {view(r, fmtDate(r.recitedOn))}
                {del(r, fmtDate(r.recitedOn))}
              </li>
            ))}
          </ul>
          {before.length > HISTORY_SHOWN && (
            <button type="button" className="hz-btn hz-btn-ghost ct-more" onClick={() => setAll((x) => !x)}>{all ? "Show less" : `Show all ${before.length} days`}</button>
          )}
        </>
      )}
      </>}
    </section>
  );
}

// ---------- teacher ----------

// className / students: the class open in the teacher portal. classRepo: its
// class repo (null when the students have no class). makeStudentRepo: for the
// in-memory demo (see ClassLesson).
export function TeacherClassPanel({ className, students, classRepo, teacherId, makeStudentRepo = null, onClosed = null }) {
  const { state, error, setError, refresh } = useClassThilawa(classRepo);
  const [busy, setBusy] = useState(false);
  const [changing, setChanging] = useState(false);
  const [lesson, setLesson] = useState(false); // the reading open in the Mushaf
  const [topicError, setTopicError] = useState("");
  const [recError, setRecError] = useState("");
  const pending = useRef(null); // the page waiting to be saved
  const timer = useRef(null);

  const run = async (fn, onError = setError) => {
    setBusy(true);
    onError("");
    try { await fn(); await refresh(); return true; } catch (e) { onError(e.message); return false; } finally { setBusy(false); }
  };

  // Every page turn is kept (a moment after turning, and when the Mushaf closes),
  // so the next lesson carries on from there.
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const p = pending.current;
    pending.current = null;
    if (p) { try { await classRepo.setReadingPage(p.id, p.page); } catch (e) { setError(e.message); } }
  }, [classRepo, setError]);
  useEffect(() => () => { flush(); }, [flush]);
  const onPage = (page) => {
    if (!state?.reading) return;
    pending.current = { id: state.reading.id, page };
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  };

  if (!classRepo) {
    return <div className="hz-card hz-muted">These students aren't in a class yet. The admin puts them in one, then you can open a reading for the whole class.</div>;
  }
  if (!state) return <div className="ct">{error ? <div className="hz-error" role="alert">{error}</div> : <div className="hz-card hz-muted">Loading {className}…</div>}</div>;

  const { reading, topics } = state;
  const portion = reading ? { fromPage: reading.fromPage, toPage: reading.toPage, instructions: readingTitle(reading) } : null;
  const openReading = (r) => run(async () => { await classRepo.openReading({ ...r, page: r.fromPage }); setChanging(false); });
  const close = async () => { setLesson(false); await flush(); await refresh(); onClosed?.(); };
  // From the Mushaf (RecitationMarking.jsx): today's, the next one, or the next one started today.
  const setRecitation = async (kind, span) => {
    const today = localDate(new Date(), browserTimezone());
    if (kind === "today") await classRepo.saveRecitation({ ...span, recitedOn: today });
    else if (kind === "next") await classRepo.setNextRecitation(span);
    else if (kind === "start-next") await classRepo.startNextRecitation(today);
    await refresh();
  };

  return (
    <div className="ct">
      <style>{CLASS_CSS}</style>
      {lesson && reading && (
        <ClassLesson students={students} teacherId={teacherId} makeRepo={makeStudentRepo}
          portion={portion}
          startPage={reading.page} onPage={onPage} onClose={close}
          recitation={{ recitations: state.recitations, onSet: setRecitation }} />
      )}

      <section className="hz-card ct-reading" aria-label={`Class reading for ${className}`}>
        <header className="ct-head">
          <span className="ct-head-icon"><BookOpen size={24} aria-hidden="true" /></span>
          <div className="ct-head-text">
            <small>Class reading · {className}</small>
            <h2>{reading ? readingTitle(reading) : "No reading open"}</h2>
            <span>{reading ? `${describePages(reading.fromPage, reading.toPage)} · since ${fmtWhen(reading.createdAt)}` : `${students.length} students`}</span>
          </div>
          {reading && !changing && (
            <button className="hz-btn hz-btn-primary" disabled={busy} onClick={() => setLesson(true)}>
              {reading.page !== reading.fromPage ? `Continue from page ${reading.page}` : "Open Mushaf"}<ArrowRight size={18} aria-hidden="true" />
            </button>
          )}
        </header>
        <div className="ct-body">
          {reading && !changing && (
            <>
              <div className="ct-stop">
                <span className="ct-pill"><Navigation size={13} aria-hidden="true" />Stopped at page {reading.page}</span>
              </div>
              <div className="ct-actions" style={{ justifyContent: "flex-start" }}>
                <button className="hz-btn hz-btn-outline" disabled={busy} onClick={() => setChanging(true)}><RefreshCw size={16} aria-hidden="true" />Change reading</button>
              </div>
            </>
          )}
          {(!reading || changing) && (
            <>
              {changing && <div className="hz-row"><b style={{ color: "#123B67" }}>New reading for the class</b><button className="ct-del" style={{ borderColor: "#DCEBF8" }} aria-label="Cancel" onClick={() => setChanging(false)}><X size={16} aria-hidden="true" /></button></div>}
              <ReadingForm id="ct-reading" fromPage={reading ? reading.page : ""} busy={busy} openLabel={reading ? "Open for the class" : "Open reading for the class"}
                onCancel={changing ? () => setChanging(false) : null} onOpen={openReading} />
            </>
          )}
          {error && <div className="hz-error" role="alert">{error}</div>}
        </div>
      </section>

      <RecitationCard recitations={state.recitations} busy={busy} error={recError}
        onSave={(r) => run(() => classRepo.saveRecitation(r), setRecError)}
        onStartNext={() => run(() => classRepo.startNextRecitation(localDate(new Date(), browserTimezone())), setRecError)}
        onDelete={async (r, what) => {
          if (await confirmDialog({ title: `Delete ${r.label} (${what})?`, message: r.kind === "next" ? "The next recitation is cleared." : "It goes from the class's history.", confirmLabel: "Delete", danger: true })) run(() => classRepo.deleteRecitation(r.id), setRecError);
        }} />

      <TopicsCard topics={topics} busy={busy} error={topicError}
        onAdd={(t) => run(() => classRepo.addTopic(t), setTopicError)}
        onDelete={async (t) => {
          if (await confirmDialog({ title: `Delete “${t.topic}”?`, message: "The students won't see it any more.", confirmLabel: "Delete", danger: true })) run(() => classRepo.deleteTopic(t.id), setTopicError);
        }} />
    </div>
  );
}

// ---------- student ----------

// The student's Class page: the class reading in the Mushaf first, opened at
// the page the teacher is on and following them as they turn (until the
// student turns the page themself). A small key above it says what the
// colours are: the ayahs the class recites (green; the next ones purple), the
// student's words to correct (red) and letters to practise (orange). Then the
// teacher's latest note, and, folded away, what the class recited before and
// the Tajweed topics.
// data: the student's Thilawa summary (their marked words, letters, notes).
export function StudentClassReading({ classRepo, data, onGo }) {
  const { state, error } = useClassThilawa(classRepo);
  const [page, setPage] = useState(null);
  const [follow, setFollow] = useState(true);
  const reading = state?.reading || null;
  const teacherPage = reading?.page ?? null;
  useEffect(() => { if (follow && teacherPage) setPage(teacherPage); }, [follow, teacherPage, reading?.id]);

  if (!classRepo) return <div className="hz"><div className="hz-card hz-muted">You aren't in a class yet. Ask the admin to put you in your class.</div></div>;
  if (!state) return <div className="hz">{error ? <div className="hz-error" role="alert">{error}</div> : <div className="hz-card hz-muted">Loading your class reading…</div>}</div>;

  const marks = (data?.mistakes || []).filter((m) => !m.correctedAt && !m.tickedAt);
  const letters = data?.lastRecitation?.letters || [];
  const note = data?.notes?.[0] || null;
  const lastPart = data?.lastRecitation || null; // with no class reading open, the words show on its pages
  const { current, next } = currentRecitations(state.recitations);
  const today = localDate(new Date(), browserTimezone());
  const shown = page ?? reading?.fromPage ?? 1;
  const turn = (p) => { setFollow(false); setPage(p); };
  return (
    <div className="hz">
      <style>{CLASS_CSS}</style>
      <section className="hz-card ct-reading" aria-label="Class reading">
        <header className="ct-head">
          <span className="ct-head-icon"><BookOpen size={24} aria-hidden="true" /></span>
          <div className="ct-head-text">
            <small>Class reading</small>
            <h2>{reading ? readingTitle(reading) : "Not open yet"}</h2>
            {reading && <span>{describePages(reading.fromPage, reading.toPage)}</span>}
          </div>
        </header>
        {!reading && (
          <div className="ct-body">
            <button className="hz-btn hz-btn-outline" style={{ alignSelf: "flex-start" }} onClick={() => onGo?.("thilawa-free")}><BookMarked size={16} aria-hidden="true" />Free Reading</button>
          </div>
        )}
      </section>

      {reading && (
        <section className="hz-card ct-reader-card" aria-label={`Page ${shown}`}>
          <div className="ct-follow" style={{ marginBottom: 10 }}>
            <Navigation size={16} color="#176FD1" aria-hidden="true" />
            <span>Your class is on <b>page {teacherPage}</b></span>
            {(shown !== teacherPage || !follow) && <button className="hz-btn hz-btn-primary" onClick={() => setFollow(true)}>Go to page {teacherPage}</button>}
          </div>
          {(current || next || marks.length > 0 || letters.length > 0) && (
            <div className="ct-key" aria-label="Colours in the Mushaf">
              {current && <span><i className="ct-key-today" />{current.recitedOn === today ? "Today" : fmtDate(current.recitedOn)}: <b>{current.label}</b></span>}
              {next && <span><i className="ct-key-next" />Next: <b>{next.label}</b></span>}
              {marks.length > 0 && <span><i className="ct-key-words" />Your words to correct: <b>{marks.length}</b></span>}
              {letters.length > 0 && <span><i className="ct-key-letters" />Letters: <b lang="ar" className="ct-key-ar">{letters.join(" ")}</b></span>}
            </div>
          )}
          <Reader from={reading.fromPage} to={reading.toPage} page={shown} onPage={turn} marks={marks} letters={letters} ayahMarks={recitationMarks(state.recitations)} />
        </section>
      )}

      {!reading && lastPart && marks.length > 0 && (
        <section className="hz-card ct-reader-card" aria-label="Your words to correct">
          <div className="ct-key"><span><i className="ct-key-words" />Your words to correct: <b>{marks.length}</b></span>
            {letters.length > 0 && <span><i className="ct-key-letters" />Letters: <b lang="ar" className="ct-key-ar">{letters.join(" ")}</b></span>}</div>
          <Reader from={lastPart.fromPage} to={lastPart.toPage} page={page ?? marks[0].page ?? lastPart.fromPage} onPage={setPage} marks={marks} letters={letters} />
        </section>
      )}

      {note && (
        <section className="hz-card ct-note" aria-label="Teacher's note">
          <h2 className="hz-h2"><StickyNote size={22} aria-hidden="true" />Teacher's note</h2>
          <p>{note.body}</p>
          <small>{fmtWhen(note.createdAt)}</small>
        </section>
      )}

      <RecitationCard recitations={state.recitations} />
      <TopicsCard topics={state.topics} folded />
    </div>
  );
}
