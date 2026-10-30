import { useState, useEffect, useRef } from "react";
import { Sparkles, CalendarCheck, FileText, ShoppingBag, Check, Circle, ArrowRight } from "lucide-react";
import { BOOKS, PORTAL_SAMPLE, SHOW } from "./content.js";
import { Link, PortalPreview } from "./parts.jsx";
import { useLang } from "./i18n.jsx";

const INTERVAL = 5000;

// Sample week-by-week activity for the streak calendar (true = active day).
const STREAK_DAYS = [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1].map(Boolean);

// SAMPLE exam report. Wording in siteStrings.js under sample.<key>.
const REPORT = {
  score: 92,
  parts: [
    { label: "memorisation", got: 38, of: 40 },
    { label: "tajweed", got: 27, of: 30 },
    { label: "fluency", got: 27, of: 30 },
  ],
};

function PlanSlide() {
  const { t } = useLang();
  return (
    <div className="ld-portal">
      <div className="ld-panel" style={{ marginTop: 0 }}>
        <div className="ld-panel-row"><span>{t("portal.plan.title")}</span><span>{t("sample.done", { done: 2, total: 3 })}</span></div>
        <ul className="ld-tasks">
          <li><Check size={18} className="done" aria-hidden="true" />{t("sample.task1")}</li>
          <li><Check size={18} className="done" aria-hidden="true" />{t("sample.task2")}</li>
          <li><Circle size={18} className="todo" aria-hidden="true" />{t("sample.task3")}</li>
        </ul>
      </div>
      <div className="ld-panel">
        <div className="ld-panel-row"><span>{t("sample.streak")}</span><span>{t("sample.days", { n: PORTAL_SAMPLE.streak })}</span></div>
        <div className="ld-cal" aria-hidden="true">{STREAK_DAYS.map((on, i) => <span key={i} className={on ? "on" : ""} />)}</div>
        <div className="ld-bar-foot"><span>{t("sample.weeks")}</span><span>{t("sample.longest", { n: 15 })}</span></div>
      </div>
    </div>
  );
}

function ReportSlide() {
  const { t } = useLang();
  return (
    <div className="ld-portal">
      <div className="ld-portal-head">
        <span className="ld-who">{t("sample.report")}<small>{t("sample.exam")}</small></span>
        <span className="ld-score"><b>{REPORT.score}</b>/100<span className="ld-grade">{t("sample.grade")}</span></span>
      </div>
      <div className="ld-panel">
        {REPORT.parts.map((p) => (
          <div key={p.label} className="ld-report-row">
            <div className="ld-bar-foot" style={{ marginTop: 0, marginBottom: 6 }}><span>{t(`sample.${p.label}`)}</span><span><b>{p.got}</b> / {p.of}</span></div>
            <div className="ld-bar ld-bar-sm"><div className="ld-bar-fill" style={{ width: `${(p.got / p.of) * 100}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="ld-panel ld-remark">
        <p>“{t("sample.remark")}”</p><small>{t("sample.remarkLabel")}</small>
      </div>
    </div>
  );
}

function StoreSlide({ navigate, active }) {
  const { t } = useLang();
  return (
    <div className="ld-portal">
      <div className="ld-shelf">
        {BOOKS.slice(0, 4).map((b) => (
          <div key={b.id} className="ld-shelf-book">
            <div className="ld-shelf-cover" style={{ background: b.color }}><span>{t(`book.${b.id}`)}</span></div>
            <div className="ld-shelf-info">{SHOW.prices ? `MVR ${b.price}` : t(`bookCat.${b.category}`)}</div>
          </div>
        ))}
      </div>
      <Link to="/store" navigate={navigate} className="ld-btn ld-btn-primary ld-btn-sm" style={{ width: "100%", marginTop: 10 }} tabIndex={active ? undefined : -1}>
        {t("sample.visitStore")} <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}

// badge: show.badge.<key> in siteStrings.js.
const SLIDES = [
  { key: "portal", Icon: Sparkles, render: () => <PortalPreview sample={PORTAL_SAMPLE} /> },
  { key: "plan", Icon: CalendarCheck, render: () => <PlanSlide /> },
  { key: "report", Icon: FileText, render: () => <ReportSlide /> },
  { key: "store", Icon: ShoppingBag, render: (navigate, active) => <StoreSlide navigate={navigate} active={active} /> },
];

// Hero showcase inside the arch: cycles through the student portal, the
// daily plan, an exam report and the book store. Pauses while hovered or
// focused, and doesn't auto-advance for visitors who prefer reduced motion.
export default function Showcase({ navigate }) {
  const { t } = useLang();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useRef(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    if (paused || reduce.current) return undefined;
    const id = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL);
    return () => clearTimeout(id);
  }, [index, paused]);

  const { key, Icon } = SLIDES[index];
  const badge = t(`show.badge.${key}`);
  return (
    <div
      className="ld-show"
      role="region"
      aria-roledescription="carousel"
      aria-label={t("show.label")}
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
          <button key={s.key} type="button" className={i === index ? "on" : ""} aria-label={t("show.dot", { name: t(`show.badge.${s.key}`) })} aria-current={i === index} onClick={() => setIndex(i)}>
            {i === index && !paused && !reduce.current && <span style={{ animationDuration: `${INTERVAL}ms` }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
