import { ArrowRight, Flame, ListChecks, FileText, UserRound } from "lucide-react";
import { HERO, WHY, BOOKS, SHOW } from "./content.js";
import { usePublicReviews } from "./reviews.js";
import Showcase from "./Showcase.jsx";
import ClassesSection from "./ClassesSection.jsx";
import { ICONS, Link, Stars, Marquee, CountOnView, EnrolCta, avatarColor, initials, useReveal } from "./parts.jsx";

export function Hero({ navigate, reviews }) {
  return (
    <section className="ld-hero">
      <div className="ld-wrap ld-hero-in">
        <div>
          <div className="ld-hero-brand">
            <img className="ld-hero-logo ld-reveal" src="/images/logo-full-white.png" alt="Aflaah Quran Class" />
            <h1 className="ld-callig-h1 ld-reveal">
              <img className="ld-callig" src="/images/calligraphy-khairukum.png" alt="خيركم من تعلم القرآن وعلمه — The best of you are those who learn the Quran and teach it" />
            </h1>
            <p className="ld-callig-tr ld-reveal ld-d1">“The best of you are those who learn the Quran and teach it.”</p>
            <div className="ld-hero-actions ld-reveal ld-d3">
              <Link to="/register" navigate={navigate} className="ld-btn ld-btn-white">Register now</Link>
              <Link to="/#classes" navigate={navigate} className="ld-btn ld-btn-ghost">Explore classes</Link>
              {SHOW.rules && <Link to="/rules" navigate={navigate} className="ld-btn ld-btn-ghost">Rules and regulations</Link>}
            </div>
            {reviews.length > 0 && <div className="ld-rating ld-reveal ld-d3"><Stars /> Loved by parents and students</div>}
          </div>
        </div>
        <div className="ld-hero-art ld-reveal ld-d2">
          <div className="ld-arch"><Showcase navigate={navigate} /></div>
          <div className="ld-badge ld-badge-students">
            <div className="ld-avatars" aria-hidden="true">
              {reviews.length >= 3
                ? reviews.slice(0, 3).map((r, i) => <span key={r.name} style={{ background: avatarColor(i) }}>{initials(r.name)}</span>)
                : [0, 1, 2].map((i) => <span key={i} style={{ background: avatarColor(i) }}><UserRound size={16} /></span>)}
            </div>
            <div><b><CountOnView value={HERO.studentCount} />+</b><span className="ld-badge-label">{HERO.studentLabel}</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Reviews({ reviews }) {
  return (
    <section className="ld-sec ld-soft" id="reviews">
      <div className="ld-wrap ld-center ld-reveal">
        <p className="ld-tag">Reviews</p>
        <h2 className="ld-h2">Kind words from our students and parents</h2>
        <p className="ld-lead">Honest reviews of our classes, shared by the people who learn with us.</p>
      </div>
      <div className="ld-reviews">
        <Marquee
          items={reviews}
          render={(r, i, copy) => (
            <figure key={`${copy}-${i}`} className="ld-review" aria-hidden={copy || undefined} style={{ margin: 0 }}>
              <div className="ld-review-top"><span className="ld-quote" aria-hidden="true">“</span><Stars size={14} rating={r.rating ?? 5} /></div>
              <p dir="auto">{r.text}</p>
              <figcaption className="ld-person">
                <span className="ld-av" style={{ background: avatarColor(i) }}>{initials(r.name)}</span>
                <span className="ld-person-who">
                  <b dir="auto">{r.name}</b>
                  <small dir="auto">{r.role}</small>
                  {r.roleDv && <small className="ld-dv" lang="dv" dir="rtl">{r.roleDv}</small>}
                </span>
              </figcaption>
            </figure>
          )}
        />
      </div>
    </section>
  );
}

const PORTAL_FEATURES = [
  { icon: Flame, title: "Daily streak", text: "One task a day keeps the streak alive and builds a lasting habit." },
  { icon: ListChecks, title: "Today's plan", text: "New lesson and revision planned for every student, every day." },
  { icon: FileText, title: "Exam reports", text: "Regular tests with teacher remarks, shared with parents." },
];

function PortalHighlight({ navigate }) {
  return (
    <section className="ld-sec">
      <div className="ld-wrap ld-split">
        <div className="ld-reveal">
          <p className="ld-tag">Student portal</p>
          <h2 className="ld-h2">Watch your child's hifz grow</h2>
          <p className="ld-lead">Every hifz student gets their own portal: a daily plan, a streak that builds the habit, and a live percentage of the Quran memorised.</p>
          <Link to="/hifz" navigate={navigate} className="ld-link">See our hifz program <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
        <div className="ld-feats">
          {PORTAL_FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className={`ld-feat ld-reveal ld-d${i + 1}`}>
                <span className="ld-icon"><Icon size={22} aria-hidden="true" /></span>
                <span><b>{f.title}</b>{f.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Why() {
  return (
    <section className="ld-sec ld-why" id="why">
      <div className="ld-wrap">
        <div className="ld-center ld-reveal">
          <p className="ld-tag">Why Aflaah</p>
          <h2 className="ld-h2">Why parents choose this class</h2>
        </div>
        <div className="ld-grid ld-grid-3">
          {WHY.map((w, i) => {
            const Icon = ICONS[w.icon];
            return (
              <div key={w.title} className={`ld-why-item ld-reveal ld-d${i + 1}`}>
                <span className="ld-icon"><Icon size={24} aria-hidden="true" /></span>
                <h3>{w.title}</h3>
                <p>{w.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StorePreview({ navigate }) {
  return (
    <section className="ld-sec">
      <div className="ld-wrap">
        <div className="ld-center ld-reveal">
          <p className="ld-tag">Book store</p>
          <h2 className="ld-h2">Books for every level</h2>
          <p className="ld-lead">The books we use in class, from the first letters to the full mushaf.</p>
        </div>
        <div className="ld-grid ld-grid-4 ld-books">
          {BOOKS.slice(0, 4).map((b, i) => <BookCard key={b.id} book={b} delay={i} />)}
        </div>
        <div className="ld-center ld-more">
          <Link to="/store" navigate={navigate} className="ld-btn ld-btn-outline">View all books <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  );
}

export function BookCard({ book, delay = 0 }) {
  return (
    <article className={`ld-card ld-book ld-reveal ld-d${delay % 4}`}>
      <div className="ld-cover" style={{ background: book.color }}><span>{book.title}</span></div>
      <h3>{book.title}</h3>
      <div className="ld-book-foot">{SHOW.prices && <span className="ld-price">MVR {book.price}</span>}<span className="ld-pill">{book.category}</span></div>
    </article>
  );
}

export default function HomePage({ navigate }) {
  const reviews = usePublicReviews();
  // Reviews arrive after the page's first reveal pass, so fade them in too.
  useReveal(reviews.length);
  return (
    <>
      <Hero navigate={navigate} reviews={reviews} />
      {reviews.length > 0 && <Reviews reviews={reviews} />}
      <PortalHighlight navigate={navigate} />
      <ClassesSection navigate={navigate} />
      <Why />
      <StorePreview navigate={navigate} />
      <div id="enrol">
        <EnrolCta title={`Join ${HERO.studentCount}+ students today`} text="Talk to us about the right class for your child, class times and fees." navigate={navigate} />
      </div>
    </>
  );
}
