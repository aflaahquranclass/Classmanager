import { useState, useEffect, useMemo, useCallback } from "react";
import { BookOpenText, BookOpen, Layers, CalendarDays, Flame, LayoutDashboard, LogOut, ContactRound, Lock, CalendarCheck, Wallet, Menu, X, BookOpenCheck, ListChecks, BookMarked, Presentation, Eye, EyeOff, FileText, Play, PenLine, RotateCw, CheckCircle2 } from "lucide-react";
import { TP, TP_SHARED_STYLES, LOGO_WHITE_DATA_URI, TP_LOGO_FULL_WHITE_URL } from "./App.jsx";
import { supabase } from "./supabaseClient.js";
import HifzTracker, { HIFZ_CSS, completedCounts, useHifz, GoalYearDialog, lastLesson } from "./HifzTracker.jsx";
import { HOME_CSS, NextStepButton, QuickTiles } from "./StudentHome.jsx";
import { TeacherHifzStudent } from "./hifz/HifzTeacher.jsx";
import { createSupabaseHifzRepo, createHifzMemoryStore, createMemoryHifzRepo } from "./hifz/taskRepos.js";
import { pageToUnit } from "./hifz/quran.js";
import { addDays } from "./hifz/engine.js";
import { useMotivation, motivationTextProps, MOTIVATION_FONT_CSS } from "./MotivationAdmin.jsx";
import { TOTAL_AYAHS } from "./hifz/ayahs.js";
import { maldivesToday } from "./dates.js";
import { hideSplash } from "./splash.jsx";
import AuthShell from "./AuthShell.jsx";
import { StudentExams } from "./exams/ExamUI.jsx";
import { useBackNav } from "./useBackNav.js";
import { NotificationBell } from "./notifications/NotificationBell.jsx";
import { useStudentRecords, StudentAttendance, StudentFinance, RECORDS_CSS } from "./StudentRecords.jsx";
import ThilawaHome from "./thilawa/ThilawaHome.jsx";
import { ThilawaTracker, AssignedReading, FreeReading, THILAWA_HADITH, thilawaCss } from "./thilawa/ThilawaStudent.jsx";
import { TeacherThilawaStudent } from "./thilawa/ThilawaTeacher.jsx";
import { loadThilawa } from "./thilawa/service.js";
import { createSupabaseThilawaRepo, createThilawaMemoryStore, createMemoryThilawaRepo } from "./thilawa/repos.js";
import { hasProgram } from "./thilawa/programs.jsx";

const TOTAL_SURAHS = 114;
const TOTAL_JUZ = 30;

// Same Islamic pattern assets as the Teacher/Admin portals.
const PATTERN_MAIN_URL = "/images/tp-pattern-main.png";
const PATTERN_ON_BLUE_URL = "/images/tp-pattern-sidebar.png";

const HADITH = {
  text: "It will said to the one who had memorised the quran [ and acted upon it ] : Recite the quran .......",
  source: "( HADITH )",
};

// On localhost, ?portal=student&demo=1 runs the portal on in-browser sample
// storage (no login, nothing saved to the database) for trying the UI.
const DEMO = ["localhost", "127.0.0.1"].includes(window.location.hostname) && new URLSearchParams(window.location.search).get("demo") === "1";
const hifzDemoStore = createHifzMemoryStore();
const thilawaDemoStore = createThilawaMemoryStore();
// Sample teacher data for the demo, so every Thilawa screen has something to show.
if (DEMO) {
  const t = createMemoryThilawaRepo(thilawaDemoStore, "demo", { teacherId: "demo-teacher" });
  t.addAssessment({ tajweed: 45, fluency: 55, comment: "" });
  t.addAssessment({ tajweed: 60, fluency: 58, comment: "Good improvement on the madd rules." });
  t.addAssignment({ fromPage: 582, toPage: 583, instructions: "Read Surah An-Naba slowly. Watch the ghunnah on noon and meem.", dueDate: null })
    .then((a) => t.setAssignmentLetters(a.id, ["ن", "م"]));
  // A class lesson the teacher listened to, with words to correct.
  t.addAssignment({ fromPage: 582, toPage: 582, kind: "lesson", instructions: "An-Naba 1–16" }).then(async (l) => {
    for (const [verseKey, position] of [["78:2", 2], ["78:6", 3], ["78:10", 2]]) await t.addMistake({ assignmentId: l.id, page: 582, verseKey, position });
    const [m] = await t.listMistakes();
    await t.setMistakeCategory(m.id, "madd");
    await t.setAssignmentChecked(l.id, true);
  });
  t.addNote({ body: "Practise reading 2 pages every day before class.", visibleToStudent: true });
  t.addNote({ body: "Private: needs help with qalqalah.", visibleToStudent: false });
  const h = createMemoryHifzRepo(hifzDemoStore, "demo", { teacherId: "demo-teacher" });
  const today = maldivesToday();
  // Has Juz 30 and is memorising Juz 29 from Al-Mulk (pages 562–569 done).
  h.saveProfile({
    memorized: [[pageToUnit(562), pageToUnit(570)], [pageToUnit(582), pageToUnit(605)]],
    direction: "juz_reverse", startUnit: pageToUnit(582), newUnits: 30, shortPages: 2, longStartUnit: pageToUnit(582), longMode: "juz",
  });
  h.addTasks([
    { taskDate: today, activity: "new", start: pageToUnit(570), end: pageToUnit(571), notes: "Read it 10 times before memorising." },
    { taskDate: today, activity: "short", start: pageToUnit(568), end: pageToUnit(570), notes: "" },
    { taskDate: today, activity: "long", start: pageToUnit(582), end: pageToUnit(584), notes: "" },
  ]);
  h.addMistake({ page: 582, line: 3, verseKey: "78:2", position: 2, wordText: "ٱلنَّبَإِ", taskId: null });
}

// Counts a number up from 0 (eases out). Shows the final value straight away
// when the viewer prefers reduced motion.
export function CountUp({ value, duration = 900 }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !Number.isFinite(value)) { setShown(value); return undefined; }
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      setShown(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{Number.isInteger(value) ? Math.round(shown) : Math.round(shown * 10) / 10}</>;
}

// Mushaf that opens, turns three pages and closes again (animation in the
// .sp-book* styles). Drawn around a spine at x = 32: closed, the book sits on
// the right of the spine and is shifted left to stay centred.
function QuranIcon() {
  const lines = (x) => <path d={`M${x} 11h18M${x} 15h18M${x} 19h18M${x} 23h18M${x} 27h18M${x} 31h12`} stroke="#D9C79C" strokeWidth="0.7" />;
  return (
    <svg viewBox="0 0 64 46" aria-hidden="true">
      <defs>
        <linearGradient id="sp-quran-cover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={TP.gradStart} />
          <stop offset="0.6" stopColor={TP.blue} />
          <stop offset="1" stopColor={TP.gradEnd} />
        </linearGradient>
        {/* turning page: shaded at the spine, light at the outer edge */}
        <linearGradient id="sp-quran-page" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#E9D9AE" />
          <stop offset="0.35" stopColor="#FFF9EA" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
        <clipPath id="sp-quran-clip"><rect x="32" y="2" width="28" height="38" rx="3" /></clipPath>
      </defs>
      <g className="sp-book">
        <ellipse cx="32" cy="44" rx="16" ry="1.8" fill={TP.navy} opacity="0.25" />
        {/* right-hand pages (always underneath) */}
        <rect x="32" y="4" width="27" height="37" rx="2.5" fill="#FFF8E7" stroke="#E2CFA0" strokeWidth="0.8" />
        {lines(37)}
        {/* cover: blue front, cream inside once it has turned over */}
        <g className="sp-book-turn sp-book-cover">
          <g className="sp-book-front">
            <rect x="32" y="2" width="28" height="38" rx="3" fill="url(#sp-quran-cover)" />
            <rect x="32" y="2" width="4.5" height="38" fill={TP.navy} opacity="0.35" />
            <rect x="39" y="7" width="16.5" height="28" rx="2" fill="none" stroke="#E9C46A" strokeWidth="1.2" />
            <g transform="translate(47.3 21)" fill="none" stroke="#F3D27A" strokeWidth="1.2" strokeLinejoin="round">
              <rect x="-4.2" y="-4.2" width="8.4" height="8.4" />
              <rect x="-4.2" y="-4.2" width="8.4" height="8.4" transform="rotate(45)" />
              <circle r="1.5" fill="#F3D27A" stroke="none" />
            </g>
            <g clipPath="url(#sp-quran-clip)">
              <rect className="sp-quran-shine" x="32" y="0" width="7" height="46" fill="#FFFFFF" opacity="0.35" />
            </g>
          </g>
          <g className="sp-book-inside">
            <rect x="32" y="2" width="28" height="38" rx="3" fill="#FFFDF5" stroke="#E2CFA0" strokeWidth="0.8" />
            {lines(37)}
          </g>
        </g>
        {/* pages that turn from right to left */}
        {[1, 2, 3].map((n) => (
          <g key={n} className={`sp-book-turn sp-book-page sp-book-page-${n}`}>
            <rect x="32" y="4.5" width="26" height="36" rx="2" fill="url(#sp-quran-page)" stroke="#CDB57E" strokeWidth="0.8" />
            {lines(36)}
          </g>
        ))}
        <path d="M32 3v38" stroke="#C9B27E" strokeWidth="0.9" />
      </g>
    </svg>
  );
}

// Student wearing a kufi cap, drawn in the brand blue for the profile tile.
function StudentAvatarIcon({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={TP.blue} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 22c0-7 5.5-11 12-11s12 4 12 11z" fill={TP.blue} />
      <path d="M21 23v4c0 7 5 12 11 12s11-5 11-12v-4" />
      <path d="M10 58c0-10 8-16 16-17l6 6 6-6c8 1 16 7 16 17" />
      <path d="M26 41l6 6 6-6" />
      <circle cx="32" cy="51" r="1.2" fill={TP.blue} />
      <circle cx="32" cy="56" r="1.2" fill={TP.blue} />
    </svg>
  );
}

// Students sign in with their Student ID (e.g. AQC0001). Their Supabase login
// is the hidden address <id>@students.aflaahqc.com (made by the student-login
// Edge Function); an older login that is a real email still works as typed.
const STUDENT_LOGIN_DOMAIN = "students.aflaahqc.com";
export const studentLoginEmail = (id) => {
  const v = id.trim();
  return v.includes("@") ? v : `${v.toLowerCase()}@${STUDENT_LOGIN_DOMAIN}`;
};

const STUDENT_INTRO = {
  portal: "Student Portal",
  tagline: "Follow your Quran journey with your teacher, every day.",
  features: ["Hifz and Thilawa tasks in the Madinah Mushaf", "Your progress, streaks and teacher's notes", "Attendance, fees and exam results"],
};

function StudentLogin({ error, onSignIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    await onSignIn(email.trim(), password);
    setBusy(false);
  };
  return (
    <AuthShell {...STUDENT_INTRO} title="Welcome back" subtitle="Sign in with your Student ID and password.">
      <form onSubmit={submit} aria-label="Student sign in">
        <div className="login-field">
          <label htmlFor="sp-login-id">Student ID</label>
          <div className="login-input-wrap">
            <ContactRound size={17} className="login-input-icon" aria-hidden="true" />
            <input id="sp-login-id" className="login-input" type="text" autoComplete="username" autoCapitalize="characters" spellCheck={false} autoFocus
              placeholder="e.g. AQC0001" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        </div>
        <div className="login-field">
          <label htmlFor="sp-login-password">Password</label>
          <div className="login-input-wrap">
            <Lock size={17} className="login-input-icon" aria-hidden="true" />
            <input id="sp-login-password" className="login-input" type={show ? "text" : "password"} autoComplete="current-password"
              placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="login-input-toggle" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>
        {error && <div className="login-error" role="alert">{error}</div>}
        <button className="login-submit" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="auth-help">Forgot your password? Contact the class admin for a new one-time password.</p>
    </AuthShell>
  );
}

// First sign-in with the one-time password from the admin: the student picks
// their own password, and the must_change_password flag is cleared with it.
function SetPassword({ studentName, onDone, onCancel }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirm) { setError("The two passwords don't match."); return; }
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.updateUser({ password, data: { must_change_password: false } });
    setBusy(false);
    if (err) { setError(/different from the old/i.test(err.message) ? "Choose a password different from the one-time password." : err.message); return; }
    onDone();
  };
  return (
    <AuthShell {...STUDENT_INTRO} title="Set your password"
      subtitle={`Assalaamu alaikum${studentName ? ` ${studentName}` : ""}! Choose your own password. You'll use it with your Student ID from now on.`}>
      <form onSubmit={submit} aria-label="Set your password">
        <div className="login-field">
          <label htmlFor="sp-new-password">New password</label>
          <div className="login-input-wrap">
            <Lock size={17} className="login-input-icon" aria-hidden="true" />
            <input id="sp-new-password" className="login-input" type="password" autoComplete="new-password" autoFocus placeholder="At least 8 characters"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
        </div>
        <div className="login-field">
          <label htmlFor="sp-confirm-password">Confirm new password</label>
          <div className="login-input-wrap">
            <Lock size={17} className="login-input-icon" aria-hidden="true" />
            <input id="sp-confirm-password" className="login-input" type="password" autoComplete="new-password" placeholder="Type it again"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
        </div>
        {error && <div className="login-error" role="alert">{error}</div>}
        <button className="login-submit" type="submit" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
        <button className="login-secondary" type="button" onClick={onCancel}>Sign out</button>
      </form>
    </AuthShell>
  );
}

// Signed-in student → their students row (row-level security only returns their own).
async function loadStudentForUser(userId) {
  const { data, error } = await supabase.from("students").select("id, name, student_code, class_name, fee, joined_month, programs").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Hifz and Thilawa pages only show for students enrolled in them.
const NAV = [
  { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { key: "hifz", label: "Hifz Tracker", Icon: BookOpenText, program: "hifz" },
  { key: "thilawa", label: "Thilawa progress", Icon: BookOpenCheck, program: "thilawa" },
  { key: "thilawa-assigned", label: "Teacher's Reading", Icon: ListChecks, program: "thilawa" },
  { key: "thilawa-free", label: "Free Reading", Icon: BookMarked, program: "thilawa" },
  { key: "attendance", label: "Attendance", Icon: CalendarCheck },
  { key: "exams", label: "Exams", Icon: FileText },
  { key: "finance", label: "Finance", Icon: Wallet },
];

// This week, Saturday to Friday, for the header: each day done (a streak
// day), missed, today or still to come.
const WEEK_DAYS = [["S", "Saturday"], ["S", "Sunday"], ["M", "Monday"], ["T", "Tuesday"], ["W", "Wednesday"], ["T", "Thursday"], ["F", "Friday"]];
const WEEK_STATE = { done: "done", today: "today", future: "still to come", missed: "missed" };
function thisWeek(today, calendar) {
  const active = new Set(calendar.filter((d) => d.active).map((d) => d.date));
  const start = addDays(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 1) % 7));
  return WEEK_DAYS.map(([letter, name], i) => {
    const date = addDays(start, i);
    const state = active.has(date) ? "done" : date === today ? "today" : date > today ? "future" : "missed";
    return { date, letter, name, state };
  });
}

// Remembers which dashboard (Hifz or Thilawa) a student enrolled in both last looked at.
const DASH_KEY = "aqc_student_dashboard";
const readDash = () => { try { return localStorage.getItem(DASH_KEY); } catch { return null; } };
const writeDash = (v) => { try { localStorage.setItem(DASH_KEY, v); } catch { /* private mode */ } };

export default function StudentPortal() {
  const [auth, setAuth] = useState(DEMO ? { status: "ready", student: { id: "demo", name: "Demo Student", student_code: "Demo mode", class_name: "Demo class", fee: 375, joined_month: "2026-08", programs: ["hifz", "thilawa"] } } : { status: "loading" });
  const [loginError, setLoginError] = useState("");
  useEffect(() => { if (auth.status !== "loading") hideSplash(); }, [auth.status]);
  const [view, setView] = useState("dashboard");
  useBackNav(view, setView, "aqcStudentView"); // phone Back goes to the previous page
  const [thilawa, setThilawa] = useState(null);
  const [dashPick, setDashPick] = useState(readDash);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!navOpen) return undefined;
    const onKeyDown = (e) => { if (e.key === "Escape") setNavOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  const routeUser = useCallback(async (user) => {
    try {
      const student = await loadStudentForUser(user.id);
      if (!student) {
        // This browser only: a teacher or admin opening the student address
        // must not be signed out on their other devices.
        await supabase.auth.signOut({ scope: "local" });
        setLoginError("This login isn't linked to a student yet. Ask the admin to link it.");
        setAuth({ status: "login" });
        return;
      }
      setAuth({ status: user.user_metadata?.must_change_password ? "set-password" : "ready", student });
    } catch (e) {
      setLoginError(e.message);
      setAuth({ status: "login" });
    }
  }, []);

  useEffect(() => {
    if (DEMO) return undefined;
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) routeUser(session.user);
      else setAuth({ status: "login" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { setAuth({ status: "login" }); setThilawa(null); setView("dashboard"); }
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [routeUser]);

  const signIn = async (email, password) => {
    setLoginError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email: studentLoginEmail(email), password });
    if (error) { setLoginError("Incorrect Student ID or password."); return; }
    await routeUser(data.user);
  };

  const student = auth.student;
  const repo = useMemo(() => {
    if (!student || !hasProgram(student, "hifz")) return null;
    return DEMO ? createMemoryHifzRepo(hifzDemoStore, student.id, { asStudent: true }) : createSupabaseHifzRepo(supabase, student.id);
  }, [student]);
  // Kept fresh live (teacher's changes) for the dashboard and header streak.
  const { state: summary, refresh: refreshHifz } = useHifz(repo);

  const doesHifz = hasProgram(student, "hifz");
  const doesThilawa = hasProgram(student, "thilawa");
  const thilawaRepo = useMemo(() => {
    if (!student || !doesThilawa) return null;
    return DEMO ? createMemoryThilawaRepo(thilawaDemoStore, student.id, { asStudent: true }) : createSupabaseThilawaRepo(supabase, student.id);
  }, [student, doesThilawa]);
  const refreshThilawa = useCallback(async () => {
    if (!thilawaRepo) return;
    try { setThilawa(await loadThilawa(thilawaRepo)); } catch { setThilawa(null); }
  }, [thilawaRepo]);

  useEffect(() => {
    refreshThilawa();
    const stop = thilawaRepo?.subscribe?.(() => refreshThilawa());
    const onShow = () => { if (document.visibilityState === "visible") refreshThilawa(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { stop?.(); document.removeEventListener("visibilitychange", onShow); };
  }, [refreshThilawa, thilawaRepo]);

  // Dashboard shown: the only program, or the one picked (both enrolled).
  const dash = doesHifz && doesThilawa ? (dashPick === "thilawa" ? "thilawa" : "hifz") : doesThilawa ? "thilawa" : "hifz";
  const pickDash = (v) => { setDashPick(v); writeDash(v); };
  const demoTeacherRepo = useMemo(() => (DEMO && student ? createMemoryThilawaRepo(thilawaDemoStore, student.id, { teacherId: "demo-teacher" }) : null), [student]);
  const demoHifzTeacherRepo = useMemo(() => (DEMO && student ? createMemoryHifzRepo(hifzDemoStore, student.id, { teacherId: "demo-teacher" }) : null), [student]);
  const nav = NAV.filter((n) => !n.program || hasProgram(student, n.program));
  if (DEMO) {
    nav.push({ key: "demo-teacher-hifz", label: "Teacher: Hifz (demo)", Icon: Presentation });
    nav.push({ key: "demo-teacher", label: "Teacher: Thilawa (demo)", Icon: Presentation });
  }

  const ready = auth.status === "ready";
  const records = useStudentRecords(ready ? student : null, DEMO);
  const hasPlan = !!summary;
  // Dashboard progress is measured in ayahs (out of 6236), not pages.
  const ayahsMemorized = hasPlan ? summary.stats.ayahs : 0;
  const percent = hasPlan ? summary.stats.percent : 0;
  const counts = hasPlan ? completedCounts(summary.memorized) : { surahs: 0, juz: 0 };
  const todayHifz = summary?.todayTasks || [];
  const stats = [
    { label: "Surahs", Icon: BookOpen, value: <><CountUp value={counts.surahs} /> / {TOTAL_SURAHS}</> },
    { label: "Juz", Icon: Layers, value: <><CountUp value={counts.juz} /> / {TOTAL_JUZ}</> },
    { label: "Target year", Icon: CalendarDays, value: summary?.stats.goalYear ?? "—" },
  ];
  // Hifz dashboard: the "do this next" button and the quick-access buttons.
  // Buttons for parts of the Hifz Tracker open it and scroll to that part
  // (it loads its own data, so wait until it has loaded — "Today's Hifz" is
  // always there then). A part that isn't shown (no mistakes section before
  // the first lesson) falls back to Today's Hifz. Scrolled again once the
  // cards have settled, so the part ends up at the top.
  const goHifz = (id) => {
    setView("hifz");
    let tries = 0;
    const find = () => {
      if (!document.getElementById("hz-today")) { if (++tries < 40) setTimeout(find, 100); return; }
      const go = () => (document.getElementById(id) || document.getElementById("hz-today"))?.scrollIntoView({ block: "start" });
      go();
      setTimeout(go, 450);
    };
    setTimeout(find, 50);
  };
  const notDone = (t) => !t.completedAt && !t.studentDoneAt;
  const hifzDue = summary ? [...summary.overdue, ...summary.todayTasks].filter(notDone) : [];
  const hifzLate = summary ? summary.overdue.filter(notDone).length : 0;
  const hifzMistakes = summary ? lastLesson(summary).lessonMistakes.length : 0;
  const hifzStep = !summary ? null
    : hifzDue.length ? { Icon: Play, kicker: hifzLate ? "Still to finish" : "Today's Hifz", title: `${hifzDue.length} task${hifzDue.length === 1 ? "" : "s"} waiting for you`, go: "Start", onClick: () => goHifz("hz-today") }
    : hifzMistakes ? { Icon: PenLine, kicker: "Practise", title: `${hifzMistakes} mistake${hifzMistakes === 1 ? "" : "s"} to fix from your last lesson`, go: "Open", onClick: () => goHifz("hz-mistakes") }
    : todayHifz.length ? { Icon: CheckCircle2, kicker: "Today's Hifz", title: "All done. MashaAllah!", go: "View", onClick: () => goHifz("hz-today") }
    : { Icon: RotateCw, kicker: "Hifz", title: "No tasks today. Keep revising what you know", go: "Open", onClick: () => goHifz("hz-revision") };
  const hifzTiles = [
    { key: "today", label: "Today's Hifz", Icon: ListChecks, dot: hifzDue.length, onClick: () => goHifz("hz-today") },
    { key: "mistakes", label: "Mistakes", Icon: PenLine, dot: hifzMistakes, onClick: () => goHifz("hz-mistakes") },
    { key: "revision", label: "Revision", Icon: RotateCw, onClick: () => goHifz("hz-revision") },
    { key: "attendance", label: "Attendance", Icon: CalendarCheck, onClick: () => setView("attendance") },
    { key: "exams", label: "Exams", Icon: FileText, onClick: () => setView("exams") },
    { key: "finance", label: "Fees", Icon: Wallet, onClick: () => setView("finance") },
  ];
  const th = thilawa;
  const streakNow = dash === "thilawa" ? th?.streak.current ?? 0 : hasPlan ? summary.streak.current : 0;
  const week = thisWeek(maldivesToday(), (dash === "thilawa" ? th?.streak.calendar : summary?.streak.calendar) || []);
  const quotes = useMotivation(ready && !DEMO);

  // Signing in uses the shared full-screen sign-in layout.
  if (auth.status === "login") return <StudentLogin error={loginError} onSignIn={signIn} />;
  if (auth.status === "set-password") {
    return <SetPassword studentName={auth.student?.name} onDone={() => setAuth((a) => ({ ...a, status: "ready" }))} onCancel={() => supabase.auth.signOut()} />;
  }

  return (
    <div className={`sp-page ${ready ? "sp-page-shell" : ""}`}>
      <style>{`
        .sp-page { position: relative; overflow: hidden; min-height: 100vh; box-sizing: border-box; padding: 24px 16px 40px; font-family: Inter, system-ui, sans-serif; color: ${TP.navy};
          background: #F3F7FB; }
        .sp-page-pattern { position: absolute; width: 320px; max-width: 70%; height: auto; opacity: 0.18; pointer-events: none; user-select: none; z-index: 0; }
        .sp-page-pattern-top { top: 0; right: 0; }
        .sp-page-pattern-bottom { bottom: 0; left: 0; transform: rotate(180deg); }
        .sp-header > *, .sp-stat > * { position: relative; z-index: 1; }
        .sp-wrap { position: relative; z-index: 1; max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }

        /* Signed in: Teacher/Admin-style shell (sidebar on desktop, drawer on
           phones) with the page using the full width of the screen. */
        .sp-page-shell { padding: 0; overflow: visible; }
        .sp-shell { min-height: 100vh; font-family: Inter, system-ui, sans-serif; }
        .sp-content { padding: clamp(16px, 3vw, 36px); box-sizing: border-box; }
        .sp-content .sp-wrap { max-width: 1280px; width: 100%; }
        @media (min-width: 1100px) {
          .sp-content .sp-name { font-size: 30px; }
          .sp-content .sp-tracker-foot { font-size: 18px; }
          .sp-content .sp-stat-label { font-size: 12.5px; }
          .sp-content .sp-stat-value { font-size: 24px; }
        }
        @media (min-width: 901px) {
          .sp-shell .tp-sidebar { position: sticky; top: 0; height: 100vh; overflow-y: auto; }
        }
        .sp-shell .tp-avatar svg { width: 30px; height: 30px; }
        ${RECORDS_CSS}
        .sp-card { position: relative; background: #FFFFFF; border: 1px solid #E3ECF5; border-radius: 16px; box-shadow: 0 1px 2px rgba(16,40,70,0.04), 0 4px 16px rgba(16,40,70,0.05); }
        .sp-grad { background: linear-gradient(135deg, ${TP.gradStart} 0%, ${TP.blue} 100%); color: #FFFFFF; border: none; box-shadow: 0 1px 2px rgba(13,79,133,0.10), 0 8px 24px rgba(13,79,133,0.16); }

        .sp-header { display: flex; flex-direction: column; gap: 16px; padding: 20px 20px 16px; overflow: hidden; border-radius: 18px; }
        .sp-header-top { display: flex; align-items: center; gap: 18px; }
        .sp-ident { flex: 1 1 auto; min-width: 0; }
        .sp-name { font-size: clamp(22px, 5.6vw, 28px); font-weight: 700; line-height: 1.2; letter-spacing: -0.01em; overflow-wrap: break-word; hyphens: auto; }
        .sp-id { font-size: 13px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.75; margin-top: 6px; }
        .sp-streak-box { flex-shrink: 0; display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.28); border-radius: 999px; padding: 6px 14px 6px 10px; }
        .sp-streak-box strong { font-size: clamp(18px, 4.4vw, 22px); line-height: 1.15; }
        .sp-flame { width: clamp(20px, 4.6vw, 26px); height: auto; color: #F5B942; }
        .sp-week { display: flex; justify-content: space-between; gap: 6px; margin: 0; padding: 14px 0 0; list-style: none; border-top: 1px solid rgba(255,255,255,0.18); }
        .sp-day { width: clamp(22px, 5.4vw, 28px); aspect-ratio: 1; border-radius: 50%; box-sizing: border-box; display: flex; align-items: center; justify-content: center; font-size: clamp(11px, 2.8vw, 13px); font-weight: 700; }
        .sp-day-done { background: #FFFFFF; color: ${TP.gradStart}; }
        .sp-day-today { border: 2px solid #FFFFFF; }
        .sp-day-missed { border: 1px solid rgba(255,255,255,0.3); color: rgba(255,255,255,0.6); }
        .sp-day-future { border: 1px dashed rgba(255,255,255,0.5); color: rgba(255,255,255,0.85); }
        .sp-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

        .sp-tracker { display: block; width: 100%; padding: 18px 20px 16px; font: inherit; text-align: left; color: inherit; cursor: pointer; }
        .sp-tracker:focus-visible { outline: 3px solid ${TP.blue}; outline-offset: 2px; }
        .sp-tracker-head { display: flex; align-items: center; gap: 12px; }
        .sp-tracker-icon { flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: #EEF4FB; color: ${TP.blue}; }
        .sp-tracker-head h2 { flex: 1; margin: 0; font-size: 16px; font-weight: 600; color: #1F3A5A; }
        .sp-tracker-head .sp-pct { font-size: clamp(22px, 5vw, 28px); font-weight: 700; color: ${TP.navy}; letter-spacing: -0.01em; }
        .sp-bar-wrap { position: relative; margin: 26px 0 20px; }
        .sp-bar { height: 22px; border-radius: 999px; background: #E8EFF6; overflow: hidden; }
        .sp-bar-icon { position: absolute; top: 50%; width: 76px; height: 56px; display: block; transform: translate(-50%, -50%); z-index: 1; pointer-events: none; }
        .sp-bar-icon svg { display: block; width: 100%; height: 100%; overflow: visible; }
        .sp-bar-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, ${TP.gradStart} 0%, ${TP.blue} 45%, #22D3E0 100%); transition: width 0.8s ease; }
        .sp-tracker-foot { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; color: #6B819A; }

        .sp-accent { position: absolute; left: 20px; top: 18px; bottom: 18px; width: 9px; border-radius: 999px; background: linear-gradient(180deg, ${TP.teal}, ${TP.gradStart}); }
        .sp-motivation { min-height: 120px; display: flex; align-items: center; justify-content: center; padding: 22px 24px 22px 40px; }
        .sp-motivation .sp-accent { left: 18px; top: 18px; bottom: 18px; width: 3px; }
        .sp-motivation p { margin: 0; text-align: center; font-family: Georgia, "Times New Roman", serif; font-weight: 700; letter-spacing: -0.01em;
          font-size: clamp(28px, 7.4vw, 48px); line-height: 1.15;
          background: linear-gradient(90deg, #0F2FA8, ${TP.blue} 50%, #0F2FA8); -webkit-background-clip: text; background-clip: text; color: transparent; }

        .sp-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .sp-stat { position: relative; overflow: hidden; padding: 14px 8px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .sp-stat-label { font-size: 11.5px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #6B819A; }
        .sp-stat-value { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: clamp(16px, 4.2vw, 22px); font-weight: 700; color: ${TP.navy}; white-space: nowrap; }
        .sp-stat-value svg { width: 18px; height: 18px; flex-shrink: 0; color: ${TP.blue}; }

        .sp-hadith { padding: 18px 20px 18px 34px; }
        .sp-hadith h3 { margin: 0 0 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6B819A; }
        .sp-hadith p { margin: 0; font-size: clamp(15px, 3.6vw, 17px); line-height: 1.65; color: #1F3A5A; }
        .sp-hadith .sp-hadith-src { margin-top: 10px; font-size: 13px; font-weight: 600; color: #6B819A; }
        .sp-hadith .sp-accent { left: 18px; top: 18px; bottom: 18px; width: 3px; }

        ${HIFZ_CSS}
        ${thilawaCss()}
        ${MOTIVATION_FONT_CSS}
        .sp-switch { display: flex; gap: 4px; padding: 4px; border-radius: 14px; background: #FFFFFF; border: 1px solid #E3ECF5; box-shadow: 0 1px 2px rgba(16,40,70,0.04); }
        .sp-switch button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; border: none; border-radius: 12px; background: transparent; color: ${TP.navy}; font: inherit; font-weight: 700; font-size: 15px; cursor: pointer; }
        .sp-switch button[aria-selected="true"] { background: ${TP.gradStart}; color: #FFFFFF; box-shadow: none; }
        .sp-switch button:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
        .sp-goal-line { margin: 12px 0 0; font-size: 15px; color: #1452A8; }
        /* Dashboard buttons scroll to these parts of the Hifz Tracker; keep them clear of the phone's top bar. */
        #hz-today, #hz-mistakes, #hz-revision { scroll-margin-top: 16px; }
        @media (max-width: 900px) { #hz-today, #hz-mistakes, #hz-revision { scroll-margin-top: 76px; } }
        /* ---------- animations ---------- */
        @keyframes sp-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes sp-accent { from { transform: scaleY(0); } to { transform: scaleY(1); } }

        /* The profile header stays still: no animations on it. */
        .sp-wrap > *:not(.sp-header) { animation: sp-rise 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        .sp-wrap > *:nth-child(2) { animation-delay: 0.07s; }
        .sp-wrap > *:nth-child(3) { animation-delay: 0.14s; }
        .sp-wrap > *:nth-child(4) { animation-delay: 0.21s; }
        .sp-wrap > *:nth-child(5) { animation-delay: 0.28s; }
        .sp-wrap > *:nth-child(6) { animation-delay: 0.35s; }
        .sp-wrap > *:nth-child(7) { animation-delay: 0.42s; }
        .sp-stats { animation: none !important; }
        .sp-stat { animation: sp-rise 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        .sp-stat:nth-child(1) { animation-delay: 0.3s; }
        .sp-stat:nth-child(2) { animation-delay: 0.4s; }
        .sp-stat:nth-child(3) { animation-delay: 0.5s; }

        .sp-card, .sp-stat { transition: border-color 0.2s ease, box-shadow 0.2s ease; }
        button.sp-card:hover { border-color: #C9DAEC; box-shadow: 0 1px 2px rgba(16,40,70,0.05), 0 8px 24px rgba(16,40,70,0.08); }

        .sp-flame { filter: drop-shadow(0 0 6px rgba(255,200,120,0.55)); }

        /* Quran icon riding at the end of the progress bar */
        /* Book icon: closed → cover opens → three pages turn → rests open → closes. 6s loop.
           Cover and pages turn around the spine (x = 32) by flipping scaleX through 0. */
        @keyframes sp-quran-float { 0%, 100% { transform: translate(-50%, -50%); } 50% { transform: translate(-50%, calc(-50% - 3px)); } }
        @keyframes sp-book-shift { 0%, 12% { transform: translateX(-14px); } 24%, 66% { transform: translateX(0); } 78%, 100% { transform: translateX(-14px); } }
        @keyframes sp-book-cover { 0%, 12% { transform: scaleX(1); } 24%, 66% { transform: scaleX(-1); } 78%, 100% { transform: scaleX(1); } }
        @keyframes sp-book-front { 0%, 17.9% { opacity: 1; } 18%, 71.9% { opacity: 0; } 72%, 100% { opacity: 1; } }
        @keyframes sp-book-inside { 0%, 17.9% { opacity: 0; } 18%, 71.9% { opacity: 1; } 72%, 100% { opacity: 0; } }
        @keyframes sp-book-page-1 { 0%, 23.9% { transform: scaleX(1); opacity: 0; } 24% { transform: scaleX(1); opacity: 1; } 34%, 66% { transform: scaleX(-1); opacity: 1; } 71.9% { transform: scaleX(-0.05); opacity: 1; } 72%, 100% { transform: scaleX(1); opacity: 0; } }
        @keyframes sp-book-page-2 { 0%, 33.9% { transform: scaleX(1); opacity: 0; } 34% { transform: scaleX(1); opacity: 1; } 44%, 66% { transform: scaleX(-1); opacity: 1; } 71.9% { transform: scaleX(-0.05); opacity: 1; } 72%, 100% { transform: scaleX(1); opacity: 0; } }
        @keyframes sp-book-page-3 { 0%, 43.9% { transform: scaleX(1); opacity: 0; } 44% { transform: scaleX(1); opacity: 1; } 54%, 66% { transform: scaleX(-1); opacity: 1; } 71.9% { transform: scaleX(-0.05); opacity: 1; } 72%, 100% { transform: scaleX(1); opacity: 0; } }
        @keyframes sp-quran-shine { 0%, 80% { transform: translateX(-12px) skewX(-20deg); } 100% { transform: translateX(34px) skewX(-20deg); } }
        .sp-bar-icon { animation: sp-quran-float 3s ease-in-out infinite; filter: drop-shadow(0 4px 6px rgba(13,79,133,0.35)); }
        .sp-book { transform: translateX(-14px); animation: sp-book-shift 6s ease-in-out infinite; }
        .sp-book-turn { transform-box: view-box; transform-origin: 32px 0; }
        .sp-book-cover { animation: sp-book-cover 6s ease-in-out infinite; }
        .sp-book-front { animation: sp-book-front 6s linear infinite; }
        .sp-book-inside { opacity: 0; animation: sp-book-inside 6s linear infinite; }
        .sp-book-page { opacity: 0; }
        .sp-book-page-1 { animation: sp-book-page-1 6s ease-in-out infinite; }
        .sp-book-page-2 { animation: sp-book-page-2 6s ease-in-out infinite; }
        .sp-book-page-3 { animation: sp-book-page-3 6s ease-in-out infinite; }
        .sp-quran-shine { animation: sp-quran-shine 6s ease-in-out infinite; }
        .sp-accent { transform-origin: top; animation: sp-accent 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.4s both; }

        @media (prefers-reduced-motion: reduce) {
          .sp-page *, .sp-page *::before, .sp-page *::after { animation: none !important; transition: none !important; }
        }


        @media (max-width: 520px) {
          .sp-header { gap: 12px; padding: 12px; }
          .sp-header-top { gap: 12px; }
        }
        @media (max-width: 420px) {
          .sp-streak-box { padding: 6px 10px; }
          .sp-stats { gap: 8px; }
          .sp-stat-value { flex-direction: column; gap: 6px; }
          .sp-motivation { padding-left: 44px; }
          .sp-hadith { padding-left: 48px; }
          .sp-accent { left: 16px; width: 7px; }
        }
      `}</style>

      {!ready && <>
        <img src={PATTERN_MAIN_URL} className="sp-page-pattern sp-page-pattern-top" alt="" aria-hidden="true" />
        <img src={PATTERN_MAIN_URL} className="sp-page-pattern sp-page-pattern-bottom" alt="" aria-hidden="true" />
      </>}
      {auth.status === "loading" && <main className="sp-wrap"><div className="hz-card hz-muted">Loading…</div></main>}
      {/* Hifz students choose their target year the first time they open the portal. */}
      {ready && doesHifz && summary && !summary.hasGoal && (
        <GoalYearDialog required onSave={async (y) => { await repo.saveGoal(y); await refreshHifz(); }} />
      )}
      {ready && (
      <div className="tp-shell sp-shell">
        <style>{TP_SHARED_STYLES}</style>
        <div className="tp-mobile-bar">
          <span className="tp-mobile-bar-brand">
            <img src={LOGO_WHITE_DATA_URI} alt="" />
            Student Portal
          </span>
          <span style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {!DEMO && <NotificationBell onDark />}
            <button type="button" className="tp-mobile-toggle" aria-label={navOpen ? "Close menu" : "Open menu"} aria-expanded={navOpen} onClick={() => setNavOpen((v) => !v)}>
              {navOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </span>
        </div>
        {navOpen && <div className="tp-backdrop" onClick={() => setNavOpen(false)} />}
        <div className={`tp-sidebar-wrap ${navOpen ? "tp-sidebar-wrap-open" : ""}`}>
          <nav className="tp-sidebar" aria-label="Student portal navigation">
            <img src={PATTERN_ON_BLUE_URL} className="tp-sidebar-pattern" alt="" aria-hidden="true" />
            <div className="tp-sidebar-logo"><img src={TP_LOGO_FULL_WHITE_URL} alt="Aflaah Quran Class" /></div>
            <div className="tp-sidebar-role">Student Portal</div>
            <div className="tp-avatar-row">
              <span className="tp-avatar" aria-hidden="true"><StudentAvatarIcon size={30} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tp-avatar-name">{student.name}</div>
                <div className="tp-avatar-role">{student.student_code}</div>
              </div>
              {!DEMO && <span className="tp-bell-desktop"><NotificationBell onDark /></span>}
            </div>
            <div className="tp-nav">
              {nav.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  className={`tp-nav-item ${view === key ? "tp-nav-item-active" : ""}`}
                  aria-current={view === key ? "page" : undefined}
                  onClick={() => { setView(key); setNavOpen(false); }}
                >
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <div className="tp-sidebar-spacer" />
            {!DEMO && (
              <button type="button" className="tp-logout" onClick={() => supabase.auth.signOut()}>
                <LogOut size={16} aria-hidden="true" />
                Log out
              </button>
            )}
          </nav>
        </div>

      <div className="tp-content sp-content">
      <main key={view} className="sp-wrap">
        <section className="sp-card sp-grad sp-header" aria-label="Student profile">
          <div className="sp-header-top">
            <div className="sp-ident">
              <div className="sp-name">{student.name}</div>
              <div className="sp-id">{student.student_code}</div>
            </div>
            <div className="sp-streak-box" title="Streak">
              <Flame className="sp-flame" strokeWidth={2} aria-hidden="true" />
              <span className="sp-sr">Streak:</span>
              <strong>{streakNow}</strong>
              <span className="sp-sr">{streakNow === 1 ? "day" : "days"}</span>
            </div>
          </div>
          <ol className="sp-week" aria-label="This week">
            {week.map((d) => (
              <li key={d.date} className={`sp-day sp-day-${d.state}`} title={`${d.name}: ${WEEK_STATE[d.state]}`}>
                <span aria-hidden="true">{d.letter}</span>
                <span className="sp-sr">{d.name}: {WEEK_STATE[d.state]}</span>
              </li>
            ))}
          </ol>
        </section>

        {view === "hifz" && doesHifz && <HifzTracker repo={repo} />}
        {view === "thilawa" && doesThilawa && <ThilawaTracker data={thilawa} onGo={setView} />}
        {view === "thilawa-assigned" && doesThilawa && <AssignedReading repo={thilawaRepo} data={thilawa} refresh={refreshThilawa} />}
        {view === "thilawa-free" && doesThilawa && <FreeReading repo={thilawaRepo} data={thilawa} refresh={refreshThilawa} />}
        {view === "demo-teacher-hifz" && DEMO && (
          <TeacherHifzStudent student={{ id: student.id, name: student.name, studentCode: student.student_code }} repo={demoHifzTeacherRepo} />
        )}
        {view === "demo-teacher" && DEMO && (
          <TeacherThilawaStudent student={{ id: student.id, name: student.name, studentCode: student.student_code }}
            repo={demoTeacherRepo} onChanged={refreshThilawa} />
        )}
        {view === "attendance" && <StudentAttendance records={records} />}
        {view === "finance" && <StudentFinance student={student} records={records} demo={DEMO} />}
        {view === "exams" && (DEMO
          ? <section className="sp-card hz-muted" style={{ padding: 18 }}>Exams aren't shown in demo mode.</section>
          : <StudentExams emptyText="No exams scheduled for you yet." />)}

        {view === "dashboard" && doesHifz && doesThilawa && (
          <div className="sp-switch" role="tablist" aria-label="Dashboard">
            {[["hifz", "Hifz", BookOpenText], ["thilawa", "Thilawa", BookOpenCheck]].map(([key, label, Icon]) => (
              <button key={key} type="button" role="tab" aria-selected={dash === key} onClick={() => pickDash(key)}><Icon size={18} aria-hidden="true" />{label}</button>
            ))}
          </div>
        )}

        {view === "dashboard" && dash === "thilawa" && (
          <ThilawaHome data={th} onGo={setView}>
            <section className="sp-card sp-hadith" aria-label="Hadith">
              <span className="sp-accent" aria-hidden="true" />
              <h3>Hadith</h3>
              <p>{THILAWA_HADITH.text}</p>
              <p className="sp-hadith-src">{THILAWA_HADITH.source}</p>
            </section>
          </ThilawaHome>
        )}

        {view === "dashboard" && dash === "hifz" && (
        <div className="sh">
        <style>{HOME_CSS}</style>
        <NextStepButton step={hifzStep} loading="Loading your Hifz…" />
        <QuickTiles tiles={hifzTiles} />

        <h2 className="sh-label">My progress</h2>
        <button type="button" className="sp-card sp-tracker" aria-label={`Hifz progress: ${percent}% memorised. Open Hifz Tracker`} onClick={() => setView("hifz")}>
          <div className="sp-tracker-head">
            <span className="sp-tracker-icon" aria-hidden="true"><BookOpenText size={22} strokeWidth={1.9} /></span>
            <h2>Hifz progress</h2>
            <span className="sp-pct"><CountUp value={percent} />%</span>
          </div>
          <div className="sp-bar-wrap">
            <div className="sp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
              <div className="sp-bar-fill" style={{ width: `${percent}%` }} />
            </div>
            {/* Kept inside the bar's ends so it never spills off the card at 0% or 100%. */}
            <span className="sp-bar-icon" style={{ left: `clamp(16px, ${percent}%, calc(100% - 16px))` }} aria-hidden="true">
              <QuranIcon />
            </span>
          </div>
          <div className="sp-tracker-foot">
            <span><CountUp value={ayahsMemorized} /> / {TOTAL_AYAHS} ayaat</span>
            <span><CountUp value={percent} />% completed</span>
          </div>
        </button>

        <section className="sp-stats" aria-label="Progress summary">
          {stats.map(({ label, Icon, value }) => (
            <div key={label} className="sp-card sp-stat">
              <div className="sp-stat-label">{label}</div>
              <div className="sp-stat-value">
                <Icon strokeWidth={1.9} aria-hidden="true" />
                <span>{value}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="sp-card sp-motivation" aria-label="My motivation">
          <span className="sp-accent" aria-hidden="true" />
          <p {...motivationTextProps(quotes.hifz)}>{quotes.hifz.body}</p>
        </section>

        {!DEMO && <StudentExams />}

        <section className="sp-card sp-hadith" aria-label="Hadith">
          <span className="sp-accent" aria-hidden="true" />
          <h3>Hadith</h3>
          <p>{HADITH.text}</p>
          <p className="sp-hadith-src">{HADITH.source}</p>
        </section>
        </div>
        )}
      </main>
      </div>
      </div>
      )}
    </div>
  );
}
