import { useState, useEffect, useRef } from "react";
import { Sparkles, CalendarCheck, FileText, ShoppingBag, Check, Circle, ArrowRight } from "lucide-react";
import { BOOKS, PORTAL_SAMPLE, SHOW } from "./content.js";
import { Link, PortalPreview } from "./parts.jsx";

const INTERVAL = 5000;

// Sample week-by-week activity for the streak calendar (true = active day).
const STREAK_DAYS = [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1].map(Boolean);

const REPORT = { // SAMPLE exam report
  exam: "Juz 30 · Term 2",
  score: 92,
  grade: "Excellent",
  parts: [
    { label: "Memorisation", got: 38, of: 40 },
    { label: "Tajweed", got: 27, of: 30 },
    { label: "Fluency", got: 27, of: 30 },
  ],
  remark: "Strong revision. Keep it up!",
};

function PlanSlide() {
  return (
    <div className="ld-portal">
      <div className="ld-panel" style={{ marginTop: 0 }}>
        <div className="ld-panel-row"><span>Today's plan</span><span>2 of 3 done</span></div>
        <ul className="ld-tasks">
          <li><Check size={18} className="done" aria-hidden="true" />New lesson: An-Naba 1–16</li>
          <li><Check size={18} className="done" aria-hidden="true" />Recent revision: last 5 pages</li>
          <li><Circle size={18} className="todo" aria-hidden="true" />Older revision: Juz 30, part 1</li>
        </ul>
      </div>
      <div className="ld-panel">
        <div className="ld-panel-row"><span>Streak</span><span>{PORTAL_SAMPLE.streak} days</span></div>
        <div className="ld-cal" aria-hidden="true">{STREAK_DAYS.map((on, i) => <span key={i} className={on ? "on" : ""} />)}</div>
        <div className="ld-bar-foot"><span>Last 3 weeks</span><span>Longest: 15 days</span></div>
      </div>
    </div>
  );
}

function ReportSlide() {
  return (
    <div className="ld-portal">
      <div className="ld-portal-head">
        <span className="ld-who">Hifz exam report<small>{REPORT.exam}</small></span>
        <span className="ld-score"><b>{REPORT.score}</b>/100<span className="ld-grade">{REPORT.grade}</span></span>
      </div>
      <div className="ld-panel">
        {REPORT.parts.map((p) => (
          <div key={p.label} className="ld-report-row">
            <div className="ld-bar-foot" style={{ marginTop: 0, marginBottom: 6 }}><span>{p.label}</span><span><b>{p.got}</b> / {p.of}</span></div>
            <div className="ld-bar ld-bar-sm"><div className="ld-bar-fill" style={{ width: `${(p.got / p.of) * 100}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="ld-panel ld-remark">
        <p>“{REPORT.remark}”</p><small>Teacher's remark</small>
      </div>
    </div>
  );
}

function StoreSlide({ navigate, active }) {
  return (
    <div className="ld-portal">
      <div className="ld-shelf">
        {BOOKS.slice(0, 4).map((b) => (
          <div key={b.id} className="ld-shelf-book">
            <div className="ld-shelf-cover" style={{ background: b.color }}><span>{b.title}</span></div>
            <div className="ld-shelf-info">{SHOW.prices ? `MVR ${b.price}` : b.category}</div>
          </div>
        ))}
      </div>
      <Link to="/store" navigate={navigate} className="ld-btn ld-btn-primary ld-btn-sm" style={{ width: "100%", marginTop: 10 }} tabIndex={active ? undefined : -1}>
        Visit the book store <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}

const SLIDES = [
  { key: "portal", badge: "Live progress tracking", Icon: Sparkles, render: () => <PortalPreview sample={PORTAL_SAMPLE} /> },
  { key: "plan", badge: "Daily plan and streak", Icon: CalendarCheck, render: () => <PlanSlide /> },
  { key: "report", badge: "Hifz exam reports", Icon: FileText, render: () => <ReportSlide /> },
  { key: "store", badge: "Books in our store", Icon: ShoppingBag, render: (navigate, active) => <StoreSlide navigate={navigate} active={active} /> },
];

// Hero showcase inside the arch: cycles through the student portal, the
// daily plan, an exam report and the book store. Pauses while hovered or
// focused, and doesn't auto-advance for visitors who prefer reduced motion.
export default function Showcase({ navigate }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useRef(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    if (paused || reduce.current) return undefined;
    const id = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL);
    return () => clearTimeout(id);
  }, [index, paused]);

  const { badge, Icon } = SLIDES[index];
  return (
    <div
      className="ld-show"
      role="region"
      aria-roledescription="carousel"
      aria-label="What students and parents get"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="ld-badge ld-badge-tag" key={badge} aria-live="polite"><Icon size={16} aria-hidden="true" />{badge}</div>
      <div className="ld-slides">
        {SLIDES.map((s, i) => (
          <div key={s.key} className={`ld-slide ${i === index ? "is-active" : ""}`} aria-hidden={i !== index}>
            {s.render(navigate, i === index)}
          </div>
        ))}
      </div>
      <div className="ld-dots">
        {SLIDES.map((s, i) => (
          <button key={s.key} type="button" className={i === index ? "on" : ""} aria-label={`Show ${s.badge}`} aria-current={i === index} onClick={() => setIndex(i)}>
            {i === index && !paused && !reduce.current && <span style={{ animationDuration: `${INTERVAL}ms` }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
