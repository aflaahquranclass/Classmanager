import { useState, useEffect, useRef } from "react";
import { ArrowRight, Flame, ListChecks, FileText, UserRound } from "lucide-react";
import { HERO, WHY, BOOKS, SHOW } from "./content.js";
import { usePublicReviews } from "./reviews.js";
import Showcase from "./Showcase.jsx";
import ClassesSection from "./ClassesSection.jsx";
import { ICONS, Link, Stars, Marquee, CountOnView, EnrolCta, avatarColor, initials, useReveal } from "./parts.jsx";
import { useLang } from "./i18n.jsx";

export function Hero({ navigate, reviews }) {
  const { t } = useLang();
  return (
    <section className="ld-hero">
      <div className="ld-wrap ld-hero-in">
        <div>
          <div className="ld-hero-brand">
            <img className="ld-hero-logo ld-reveal" src="/images/logo-full-white.png" alt="Aflaah Quran Class" />
            <h1 className="ld-callig-h1 ld-reveal">
              <img className="ld-callig" src="/images/calligraphy-khairukum.png" alt="خيركم من تعلم القرآن وعلمه — The best of you are those who learn the Quran and teach it" />
            </h1>
            <p className="ld-callig-tr ld-reveal ld-d1">{t("hero.quote")}</p>
            <div className="ld-hero-actions ld-reveal ld-d3">
              <Link to="/register" navigate={navigate} className="ld-btn ld-btn-white">{t("hero.register")}</Link>
              <Link to="/#classes" navigate={navigate} className="ld-btn ld-btn-ghost">{t("hero.explore")}</Link>
              {SHOW.rules && <Link to="/rules" navigate={navigate} className="ld-btn ld-btn-ghost">{t("hero.rules")}</Link>}
            </div>
            {reviews.length > 0 && <div className="ld-rating ld-reveal ld-d3"><Stars /> {t("hero.loved")}</div>}
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
            <div><b><bdi dir="ltr"><CountOnView value={HERO.studentCount} />+</bdi></b><span className="ld-badge-label">{t("hero.students")}</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

// One review. In the strip the text stops after a few lines, so every card
// keeps the same modest height; only when it is actually cut off does a
// "Read more" link appear, opening the whole review in a pop-up (full).
function ReviewCard({ r, i, copy = false, full = false, onOpen }) {
  const { t } = useLang();
  const textRef = useRef(null);
  const [cut, setCut] = useState(false);
  useEffect(() => {
    const el = textRef.current;
    if (full || !el) return;
    const check = () => setCut(el.scrollHeight > el.clientHeight + 1);
    check();
    document.fonts?.ready.then(check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [r.text, full]);
  return (
    <figure className={`ld-review${full ? " ld-review-full" : ""}`} aria-hidden={copy || undefined}>
      <div className="ld-review-top"><span className="ld-quote" aria-hidden="true">“</span><Stars size={14} rating={r.rating ?? 5} /></div>
      <p ref={textRef} className="ld-review-text" dir="auto">{r.text}</p>
      {cut && (
        <button type="button" className="ld-review-more" tabIndex={copy ? -1 : undefined} onClick={() => onOpen(r, i)}>
          {t("reviews.more")}
        </button>
      )}
      <figcaption className="ld-person">
        <span className="ld-av" style={{ background: avatarColor(i) }}>{initials(r.name)}</span>
        <span className="ld-person-who">
          <b dir="auto">{r.name}</b>
          <small dir="auto">{r.role}</small>
          {r.roleDv && <small className="ld-dv" lang="dv" dir="rtl">{r.roleDv}</small>}
        </span>
      </figcaption>
    </figure>
  );
}

export function Reviews({ reviews }) {
  const { t } = useLang();
  const [open, setOpen] = useState(null); // { r, i } of the review in the pop-up
  const dialog = useRef(null);
  useEffect(() => {
    const d = dialog.current;
    if (open && d && !d.open) d.showModal();
  }, [open]);
  const close = () => dialog.current?.close();
  return (
    <section className="ld-sec ld-soft" id="reviews">
      <div className="ld-wrap ld-center ld-reveal">
        <p className="ld-tag">{t("reviews.tag")}</p>
        <h2 className="ld-h2">{t("reviews.title")}</h2>
        <p className="ld-lead">{t("reviews.lead")}</p>
      </div>
      <div className="ld-reviews">
        <Marquee
          items={reviews}
          minItems={8}
          secondsPerItem={4}
          render={(r, i, copy) => <ReviewCard r={r} i={i} copy={copy} onOpen={(rv, at) => setOpen({ r: rv, i: at })} />}
        />
      </div>
      {/* A click on the dimmed backdrop (the dialog itself, outside its
          inner box) or Escape closes it. */}
      <dialog ref={dialog} className="ld-review-dlg" aria-label={open ? `${t("reviews.tag")}: ${open.r.name}` : undefined}
        onClose={() => setOpen(null)} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
        {open && (
          <div className="ld-review-dlg-in">
            <ReviewCard r={open.r} i={open.i} full />
            <button type="button" className="ld-review-close" onClick={close}>{t("reviews.close")}</button>
          </div>
        )}
      </dialog>
    </section>
  );
}

// Wording in siteStrings.js under portal.<key>.title / .text.
const PORTAL_FEATURES = [
  { icon: Flame, key: "streak" },
  { icon: ListChecks, key: "plan" },
  { icon: FileText, key: "reports" },
];

function PortalHighlight({ navigate }) {
  const { t } = useLang();
  return (
    <section className="ld-sec">
      <div className="ld-wrap ld-split">
        <div className="ld-reveal">
          <p className="ld-tag">{t("portal.tag")}</p>
          <h2 className="ld-h2">{t("portal.title")}</h2>
          <p className="ld-lead">{t("portal.lead")}</p>
          <Link to="/hifz" navigate={navigate} className="ld-link">{t("portal.link")} <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
        <div className="ld-feats">
          {PORTAL_FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={f.key} className={`ld-feat ld-reveal ld-d${i + 1}`}>
                <span className="ld-icon"><Icon size={22} aria-hidden="true" /></span>
                <span><b>{t(`portal.${f.key}.title`)}</b>{t(`portal.${f.key}.text`)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Why() {
  const { t } = useLang();
  return (
    <section className="ld-sec ld-why" id="why">
      <div className="ld-wrap">
        <div className="ld-center ld-reveal">
          <p className="ld-tag">{t("why.tag")}</p>
          <h2 className="ld-h2">{t("why.title")}</h2>
        </div>
        <div className="ld-grid ld-grid-3">
          {WHY.map((w, i) => {
            const Icon = ICONS[w.icon];
            return (
              <div key={w.title} className={`ld-why-item ld-reveal ld-d${i + 1}`}>
                <span className="ld-icon"><Icon size={24} aria-hidden="true" /></span>
                <h3>{t(`why.${w.icon}.title`)}</h3>
                <p>{t(`why.${w.icon}.text`)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StorePreview({ navigate }) {
  const { t } = useLang();
  return (
    <section className="ld-sec">
      <div className="ld-wrap">
        <div className="ld-center ld-reveal">
          <p className="ld-tag">{t("store.tag")}</p>
          <h2 className="ld-h2">{t("store.title")}</h2>
          <p className="ld-lead">{t("store.lead")}</p>
        </div>
        <div className="ld-grid ld-grid-4 ld-books">
          {BOOKS.slice(0, 4).map((b, i) => <BookCard key={b.id} book={b} delay={i} />)}
        </div>
        <div className="ld-center ld-more">
          <Link to="/store" navigate={navigate} className="ld-btn ld-btn-outline">{t("store.viewAll")} <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  );
}

export function BookCard({ book, delay = 0 }) {
  const { t } = useLang();
  const title = t(`book.${book.id}`);
  return (
    <article className={`ld-card ld-book ld-reveal ld-d${delay % 4}`}>
      <div className="ld-cover" style={{ background: book.color }}><span>{title}</span></div>
      <h3>{title}</h3>
      <div className="ld-book-foot">{SHOW.prices && <span className="ld-price">MVR {book.price}</span>}<span className="ld-pill">{t(`bookCat.${book.category}`)}</span></div>
    </article>
  );
}

export default function HomePage({ navigate }) {
  const { t } = useLang();
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
        <EnrolCta title={t("cta.title", { count: `${HERO.studentCount}+` })} text={t("cta.text")} navigate={navigate} />
      </div>
    </>
  );
}
