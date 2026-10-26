import { Flame, ListChecks, FileText, Check, Circle } from "lucide-react";
import { CLASS_UPDATES, PORTAL_SAMPLE, SHOW } from "./content.js";
import { PortalPreview, UpdateChips, EnrolCta } from "./parts.jsx";

// Five weeks of a sample streak calendar (true = active day).
const CALENDAR = [1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1].map(Boolean);

export default function HifzPage({ navigate }) {
  return (
    <>
      <section className="ld-hero">
          <div className="ld-wrap ld-hero-in">
          <div>
            <p className="ld-tag ld-reveal" style={{ color: "#8FD8E4" }}>Our hifz program</p>
            <h1 className="ld-reveal ld-d1">Start the hifz journey, one page at a time</h1>
            <p className="ld-sub ld-reveal ld-d2">Every hifz student gets their own portal with a daily plan, a streak and a live percentage of the Quran memorised. Parents can follow along every day.</p>
            <div className="ld-hero-actions ld-reveal ld-d3">
              <a href="#enrol" className="ld-btn ld-btn-white">Enrol now</a>
            </div>
          </div>
          <PortalPreview sample={PORTAL_SAMPLE} className="ld-reveal ld-d2" />
        </div>
      </section>

      <section className="ld-sec">
        <div className="ld-wrap">
          <div className="ld-center ld-reveal">
            <p className="ld-tag">Inside the portal</p>
            <h2 className="ld-h2">Everything a hifz student needs, every day</h2>
          </div>
          <div className="ld-grid ld-grid-3">
            <article className="ld-card ld-reveal ld-d1">
              <span className="ld-icon" style={{ background: "#FAEEDA", color: "#BA7517" }}><Flame size={24} aria-hidden="true" /></span>
              <h3>Daily streak</h3>
              <p>Complete at least one task a day to keep the streak going. It builds a habit that lasts.</p>
              <div className="ld-cal" aria-hidden="true">{CALENDAR.map((on, i) => <span key={i} className={on ? "on" : ""} />)}</div>
            </article>
            <article className="ld-card ld-reveal ld-d2">
              <span className="ld-icon"><ListChecks size={24} aria-hidden="true" /></span>
              <h3>Today's plan</h3>
              <p>New lesson and revision are planned for the student, so they always know what to do next.</p>
              <ul className="ld-tasks">
                <li><Check size={18} className="done" aria-hidden="true" />New lesson</li>
                <li><Check size={18} className="done" aria-hidden="true" />Recent revision</li>
                <li><Circle size={18} className="todo" aria-hidden="true" />Older revision</li>
              </ul>
            </article>
            <article className="ld-card ld-reveal ld-d3">
              <span className="ld-icon" style={{ background: "#E1F5F8", color: "#0B6C7A" }}><FileText size={24} aria-hidden="true" /></span>
              <h3>Exam reports</h3>
              <p>Regular tests with teacher remarks, shared with parents so you always know how your child is doing.</p>
              <div className="ld-bar" aria-hidden="true"><div className="ld-bar-fill" data-w="72%" /></div>
              <div className="ld-bar-foot"><span>Revision kept up</span><span>This month</span></div>
            </article>
          </div>
        </div>
      </section>

      {SHOW.classUpdates && (
        <section className="ld-sec ld-soft" style={{ paddingBottom: 48 }}>
          <div className="ld-wrap ld-center ld-reveal" style={{ marginBottom: 24 }}>
            <p className="ld-tag">This week in class</p>
            <h2 className="ld-h2">Small steps, every week</h2>
          </div>
          <UpdateChips updates={CLASS_UPDATES} light />
        </section>
      )}

      <div id="enrol">
        <EnrolCta title="Begin your child's hifz journey" text="Talk to us about the hifz class, timings and fees." navigate={navigate} />
      </div>
    </>
  );
}
