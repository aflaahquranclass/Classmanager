import { useState, useEffect, useMemo, useCallback } from "react";
import { BookOpenText, BookOpen, Layers, CalendarDays, Flame, LayoutDashboard, LogOut, Mail, Lock } from "lucide-react";
import { TP } from "./App.jsx";
import { supabase } from "./supabaseClient.js";
import HifzTracker, { HIFZ_CSS, completedCounts } from "./HifzTracker.jsx";
import { loadTracker } from "./hifz/service.js";
import { createSupabaseRepo, createMemoryRepo, createMemoryStore } from "./hifz/repos.js";
import { describeAmount } from "./hifz/quran.js";

const TOTAL_SURAHS = 114;
const TOTAL_JUZ = 30;

// Same Islamic pattern assets as the Teacher/Admin portals.
const PATTERN_MAIN_URL = "/images/tp-pattern-main.png";
const PATTERN_ON_BLUE_URL = "/images/tp-pattern-sidebar.png";

const MOTIVATION = "dont give up i can do it";
const HADITH = {
  text: "It will said to the one who had memorised the quran [ and acted upon it ] : Recite the quran .......",
  source: "( HADITH )",
};

// On localhost, ?portal=student&demo=1 runs the portal on in-browser sample
// storage (no login, nothing saved to the database) for trying the UI.
const DEMO = ["localhost", "127.0.0.1"].includes(window.location.hostname) && new URLSearchParams(window.location.search).get("demo") === "1";
const demoStore = createMemoryStore();

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

function StudentLogin({ error, onSignIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    await onSignIn(email.trim(), password);
    setBusy(false);
  };
  return (
    <form className="sp-card sp-login" onSubmit={submit} aria-label="Student sign in">
      <div className="sp-avatar sp-login-avatar"><StudentAvatarIcon /></div>
      <h1>Student Portal</h1>
      <p className="hz-muted">Sign in with the login your class gave you.</p>
      <label className="sp-login-field"><Mail size={18} aria-hidden="true" />
        <input className="hz-input" type="email" autoComplete="email" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="sp-login-field"><Lock size={18} aria-hidden="true" />
        <input className="hz-input" type="password" autoComplete="current-password" placeholder="Password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && <div className="hz-error" role="alert">{error}</div>}
      <button className="hz-btn hz-btn-primary" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

// Signed-in student → their students row (row-level security only returns their own).
async function loadStudentForUser(userId) {
  const { data, error } = await supabase.from("students").select("id, name, student_code").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export default function StudentPortal() {
  const [auth, setAuth] = useState(DEMO ? { status: "ready", student: { id: "demo", name: "Demo Student", student_code: "Demo mode" } } : { status: "loading" });
  const [loginError, setLoginError] = useState("");
  const [view, setView] = useState("dashboard");
  const [summary, setSummary] = useState(null);

  const routeUser = useCallback(async (userId) => {
    try {
      const student = await loadStudentForUser(userId);
      if (!student) {
        await supabase.auth.signOut();
        setLoginError("This login isn't linked to a student yet. Ask the admin to link it.");
        setAuth({ status: "login" });
        return;
      }
      setAuth({ status: "ready", student });
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
      if (session) routeUser(session.user.id);
      else setAuth({ status: "login" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { setAuth({ status: "login" }); setSummary(null); }
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [routeUser]);

  const signIn = async (email, password) => {
    setLoginError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoginError("Incorrect email or password."); return; }
    await routeUser(data.user.id);
  };

  const student = auth.student;
  const repo = useMemo(() => {
    if (!student) return null;
    return DEMO ? createMemoryRepo(demoStore, student.id) : createSupabaseRepo(supabase, student.id);
  }, [student]);

  useEffect(() => {
    if (!repo) return;
    loadTracker(repo).then(setSummary).catch(() => setSummary(null));
  }, [repo]);

  const ready = auth.status === "ready";
  const hasPlan = summary && !summary.needsSetup;
  const percent = hasPlan ? summary.stats.percent : 0;
  const counts = hasPlan ? completedCounts(summary.stats.memorizedRanges) : { surahs: 0, juz: 0 };
  const stats = [
    { label: "Surah’s completed", Icon: BookOpen, value: `${counts.surahs} / ${TOTAL_SURAHS}` },
    { label: "Juz completed", Icon: Layers, value: `${counts.juz} / ${TOTAL_JUZ}` },
    { label: "Target Year", Icon: CalendarDays, value: hasPlan ? summary.settings.goalYear : "—" },
  ];

  return (
    <div className="sp-page">
      <style>{`
        .sp-page { position: relative; overflow: hidden; min-height: 100vh; box-sizing: border-box; padding: 24px 16px 40px; font-family: Inter, system-ui, sans-serif; color: ${TP.navy};
          background: radial-gradient(circle at 15% 0%, #FFFFFF 0%, transparent 45%), linear-gradient(180deg, #E4F1FC 0%, ${TP.bg} 45%, #F5FAFD 100%); }
        .sp-page-pattern { position: absolute; width: 320px; max-width: 70%; height: auto; opacity: 0.18; pointer-events: none; user-select: none; z-index: 0; }
        .sp-page-pattern-top { top: 0; right: 0; }
        .sp-page-pattern-bottom { bottom: 0; left: 0; transform: rotate(180deg); }
        .sp-blue-pattern { position: absolute; height: auto; opacity: 0.24; pointer-events: none; user-select: none; z-index: 0; }
        .sp-header .sp-blue-pattern { right: 0; bottom: 0; width: 340px; transform: scaleX(-1); }
        .sp-stat .sp-blue-pattern { left: 0; bottom: 0; width: 170px; }
        .sp-header > *:not(.sp-blue-pattern), .sp-stat > *:not(.sp-blue-pattern) { position: relative; z-index: 1; }
        .sp-wrap { position: relative; z-index: 1; max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
        .sp-card { position: relative; background: rgba(255,255,255,0.92); border: 1px solid #DCEBF8; border-radius: 18px; box-shadow: 0 10px 30px rgba(18,59,103,0.08); }
        .sp-grad { background: linear-gradient(120deg, ${TP.gradStart} 0%, ${TP.blue} 55%, ${TP.gradEnd} 100%); color: #FFFFFF; border: none; box-shadow: 0 12px 28px rgba(13,79,133,0.25); }

        .sp-header { display: flex; align-items: center; gap: 18px; padding: 16px; overflow: hidden; }
        .sp-header::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
          background: radial-gradient(ellipse at 85% -20%, rgba(255,255,255,0.22), transparent 55%); }
        .sp-avatar { flex-shrink: 0; width: clamp(76px, 20vw, 118px); aspect-ratio: 1; border-radius: 18px; background: #FFFFFF; display: flex; align-items: center; justify-content: center; }
        .sp-avatar svg { width: 62%; height: 62%; }
        .sp-ident { flex: 1 1 auto; min-width: 0; }
        .sp-name { font-size: clamp(19px, 4.6vw, 28px); font-weight: 700; line-height: 1.2; overflow-wrap: anywhere; }
        .sp-id { font-size: clamp(14px, 3.4vw, 20px); opacity: 0.9; margin-top: 6px; }
        .sp-divider { align-self: stretch; width: 1px; margin: 14px 0; background: rgba(255,255,255,0.45); flex-shrink: 0; }
        .sp-streak-box { flex-shrink: 0; border: 1.5px solid rgba(255,255,255,0.85); border-radius: 12px; padding: 8px 14px; text-align: center; }
        .sp-streak-box span { display: block; font-size: clamp(13px, 3vw, 17px); }
        .sp-streak-box strong { display: block; font-size: clamp(22px, 5vw, 30px); line-height: 1.15; }
        .sp-flame { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: clamp(11px, 2.6vw, 15px); font-weight: 700; letter-spacing: 0.03em; }
        .sp-flame svg { width: clamp(30px, 7vw, 46px); height: auto; }

        .sp-tracker { padding: 22px 22px 18px; }
        .sp-tracker-head { display: flex; align-items: center; gap: 14px; }
        .sp-tracker-head h2 { flex: 1; margin: 0; font-size: clamp(17px, 4vw, 24px); font-weight: 700; color: #0F2F8A; }
        .sp-tracker-head .sp-pct { font-size: clamp(22px, 5vw, 30px); font-weight: 700; color: #1452A8; }
        .sp-bar { height: 30px; border-radius: 999px; background: #E3EAF1; margin: 18px 0 14px; overflow: hidden; }
        .sp-bar-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, ${TP.gradStart} 0%, ${TP.blue} 45%, #22D3E0 100%); transition: width 0.8s ease; }
        .sp-tracker-foot { display: flex; justify-content: space-between; gap: 12px; font-size: clamp(13px, 3.2vw, 18px); color: #1452A8; }

        .sp-accent { position: absolute; left: 20px; top: 18px; bottom: 18px; width: 9px; border-radius: 999px; background: linear-gradient(180deg, ${TP.teal}, ${TP.gradStart}); }
        .sp-motivation { min-height: 190px; display: flex; align-items: center; justify-content: center; padding: 28px 28px 28px 52px; }
        .sp-motivation p { margin: 0; text-align: center; font-family: Georgia, "Times New Roman", serif; font-weight: 700; letter-spacing: -0.01em;
          font-size: clamp(28px, 7.4vw, 48px); line-height: 1.15;
          background: linear-gradient(90deg, #0F2FA8, ${TP.blue} 50%, #0F2FA8); -webkit-background-clip: text; background-clip: text; color: transparent; }

        .sp-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .sp-stat { position: relative; overflow: hidden; border-radius: 16px; padding: 18px 10px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
        .sp-stat-label { font-size: clamp(12px, 2.9vw, 17px); opacity: 0.95; }
        .sp-stat-value { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: clamp(17px, 4.4vw, 28px); font-weight: 700; white-space: nowrap; }
        .sp-stat-value svg { width: clamp(22px, 5.4vw, 36px); height: auto; flex-shrink: 0; }

        .sp-hadith { padding: 22px 26px 24px 58px; }
        .sp-hadith h3 { margin: 0 0 14px; font-size: clamp(18px, 4.2vw, 24px); font-weight: 700; color: #0F2F8A; }
        .sp-hadith p { margin: 0; text-align: center; font-size: clamp(14px, 3.4vw, 18px); line-height: 1.6; color: #0F2F8A; }
        .sp-hadith .sp-hadith-src { margin-top: 12px; font-weight: 700; }

        .sp-wrap-wide { max-width: 920px; }
        .sp-nav { display: flex; gap: 8px; background: rgba(255,255,255,0.85); border: 1px solid #DCEBF8; border-radius: 16px; padding: 6px; box-shadow: 0 6px 18px rgba(18,59,103,0.06); }
        .sp-nav button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; border: none; border-radius: 12px; background: transparent; color: ${TP.navy}; font: inherit; font-weight: 600; font-size: 15px; cursor: pointer; }
        .sp-nav button[aria-current="page"] { background: linear-gradient(90deg, ${TP.blue}, ${TP.teal}); color: #FFFFFF; box-shadow: 0 6px 14px rgba(23,111,209,0.25); }
        .sp-nav .sp-nav-out { flex: 0 0 auto; padding: 0 12px; color: ${TP.secondaryText}; }
        .sp-nav button:focus-visible { outline: 2px solid ${TP.blue}; outline-offset: 2px; }
        .sp-setup-btn { margin-top: 14px; width: 100%; }
        .sp-login { max-width: 420px; width: 100%; margin: 8vh auto 0; padding: 28px 24px; display: flex; flex-direction: column; gap: 14px; text-align: center; box-sizing: border-box; }
        .sp-login h1 { margin: 0; font-size: 26px; color: #0F2F8A; }
        .sp-login p { margin: 0; }
        .sp-login-avatar { margin: 0 auto; background: linear-gradient(135deg, #E4F1FC, #FFFFFF); width: 92px; }
        .sp-login-field { position: relative; display: flex; align-items: center; }
        .sp-login-field svg { position: absolute; left: 14px; color: #8FADC0; pointer-events: none; }
        .sp-login-field .hz-input { padding-left: 42px; }
        ${HIFZ_CSS}

        @media (max-width: 420px) {
          .sp-header { gap: 10px; padding: 12px; }
          .sp-divider { display: none; }
          .sp-streak-box { padding: 6px 10px; }
          .sp-stats { gap: 8px; }
          .sp-stat-value { flex-direction: column; gap: 6px; }
          .sp-motivation { padding-left: 44px; }
          .sp-hadith { padding-left: 48px; }
          .sp-accent { left: 16px; width: 7px; }
        }
      `}</style>

      <img src={PATTERN_MAIN_URL} className="sp-page-pattern sp-page-pattern-top" alt="" aria-hidden="true" />
      <img src={PATTERN_MAIN_URL} className="sp-page-pattern sp-page-pattern-bottom" alt="" aria-hidden="true" />
      {auth.status === "loading" && <main className="sp-wrap"><div className="hz-card hz-muted">Loading…</div></main>}
      {auth.status === "login" && <main className="sp-wrap"><StudentLogin error={loginError} onSignIn={signIn} /></main>}
      {ready && (
      <main className={`sp-wrap ${view === "hifz" ? "sp-wrap-wide" : ""}`}>
        <section className="sp-card sp-grad sp-header" aria-label="Student profile">
          <img src={PATTERN_ON_BLUE_URL} className="sp-blue-pattern" alt="" aria-hidden="true" />
          <div className="sp-avatar"><StudentAvatarIcon /></div>
          <div className="sp-ident">
            <div className="sp-name">{student.name}</div>
            <div className="sp-id">{student.student_code}</div>
          </div>
          <div className="sp-divider" aria-hidden="true" />
          <div className="sp-streak-box">
            <span>Streak</span>
            <strong>{hasPlan ? summary.streak.current : 0}</strong>
          </div>
          <div className="sp-flame" aria-hidden="true">
            <Flame strokeWidth={1.8} />
            STREAK
          </div>
        </section>

        <nav className="sp-nav" aria-label="Student portal">
          <button aria-current={view === "dashboard" ? "page" : undefined} onClick={() => setView("dashboard")}><LayoutDashboard size={18} aria-hidden="true" />Dashboard</button>
          <button aria-current={view === "hifz" ? "page" : undefined} onClick={() => setView("hifz")}><BookOpenText size={18} aria-hidden="true" />Hifz Tracker</button>
          {!DEMO && <button className="sp-nav-out" onClick={() => supabase.auth.signOut()} aria-label="Sign out"><LogOut size={18} aria-hidden="true" /></button>}
        </nav>

        {view === "hifz" && <HifzTracker repo={repo} onSummary={setSummary} />}

        {view === "dashboard" && <>
        <section className="sp-card sp-tracker" aria-label="Hifz progress">
          <div className="sp-tracker-head">
            <BookOpenText size={44} color="#1452A8" strokeWidth={1.8} aria-hidden="true" />
            <h2>Hifz percentage Tracker</h2>
            <span className="sp-pct">{percent}%</span>
          </div>
          <div className="sp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <div className="sp-bar-fill" style={{ width: `${percent}%` }} />
          </div>
          <div className="sp-tracker-foot">
            <span>{hasPlan ? describeAmount(summary.stats.memorizedUnits) : "0 pages"} / 604 pages</span>
            <span>{percent}% completed</span>
          </div>
          {summary?.needsSetup && (
            <button className="hz-btn hz-btn-primary sp-setup-btn" onClick={() => setView("hifz")}>Set up your Hifz plan</button>
          )}
        </section>

        <section className="sp-card sp-motivation" aria-label="My motivation">
          <span className="sp-accent" aria-hidden="true" />
          <p>{MOTIVATION}</p>
        </section>

        <section className="sp-stats" aria-label="Progress summary">
          {stats.map(({ label, Icon, value }) => (
            <div key={label} className="sp-grad sp-stat">
              <img src={PATTERN_ON_BLUE_URL} className="sp-blue-pattern" alt="" aria-hidden="true" />
              <div className="sp-stat-label">{label}</div>
              <div className="sp-stat-value">
                <Icon strokeWidth={1.8} aria-hidden="true" />
                <span>{value}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="sp-card sp-hadith" aria-label="Hadith">
          <span className="sp-accent" aria-hidden="true" />
          <h3>Hadith</h3>
          <p>{HADITH.text}</p>
          <p className="sp-hadith-src">{HADITH.source}</p>
        </section>
        </>}
      </main>
      )}
    </div>
  );
}
