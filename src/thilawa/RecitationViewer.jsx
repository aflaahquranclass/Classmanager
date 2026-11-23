// One part of the class's recitation (from History, or today's / the next
// one), opened in the Mushaf to look at: full screen at the part's first page,
// the lines outside the part faded and its first and last ayah numbers
// coloured (green, or purple for the next one). Pages turn freely; Exit full
// screen, then Back (or Esc) closes it. Nothing here changes anything.
//
// recitation: a row from repos.js listRecitations. onClose().

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MushafPage, { MushafPresent, MushafPager } from "./MushafPage.jsx";
import { TOTAL_PAGES, pageLabel } from "./engine.js";
import { ayahPortion, verseKeyOf } from "../hifz/tasks.js";
import { lockScroll } from "../scrollLock.js";
import { fmtDate } from "./ThilawaStudent.jsx";

const CSS = `
  .rv { position: fixed; inset: 0; z-index: 1000; display: flex; flex-direction: column; background: #F4F8FC; color: #123B67; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  .rv-top { flex-shrink: 0; display: flex; align-items: center; gap: 12px; padding: 10px 16px; padding-top: max(10px, env(safe-area-inset-top)); color: #FFFFFF;
    background: linear-gradient(90deg, #0D4F85 0%, #176FD1 55%, #0A94B1 100%); box-shadow: 0 4px 16px rgba(13,40,70,0.18); }
  .rv-top .hz-btn { background: rgba(255,255,255,0.16); color: #FFFFFF; border: 1px solid rgba(255,255,255,0.4); min-height: 40px; }
  .rv-title { flex: 1; min-width: 0; font-weight: 700; font-size: 16px; line-height: 1.25; }
  .rv-title small { display: block; font-weight: 400; font-size: 13px; opacity: 0.85; }
  .rv-body { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .rv-inner { max-width: 1600px; margin: 0 auto; padding: 16px 24px 24px; display: flex; flex-direction: column; gap: 12px; }
  .rv .mp-page { max-width: none; }
  .rv-nav { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .rv-nav-title { flex: 1; min-width: 0; text-align: center; font-weight: 700; font-size: 15px; }
  .rv-nav-title small { display: block; font-weight: 400; color: #567493; font-size: 13px; }
  .rv-back { min-height: 0 !important; padding: 0 4px !important; font-size: 13px; }
  @media (max-width: 640px) {
    .rv-inner { padding: 10px 6px 20px; }
    .rv-nav .hz-btn span { display: none; }
    .rv .mp-page { padding: 4% 2.5% 2%; border-radius: 10px; }
  }
`;

export default function RecitationViewer({ recitation: r, onClose }) {
  const [page, setPage] = useState(r.fromPage);
  const next = () => setPage((p) => Math.min(TOTAL_PAGES, p + 1));
  const prev = () => setPage((p) => Math.max(1, p - 1));
  const portion = ayahPortion(r.first, r.last);
  const range = [portion.start, portion.end];
  const kind = r.kind === "next" ? "next" : "today";
  const ayahMarks = { [verseKeyOf(r.first)]: kind, [verseKeyOf(r.last)]: kind };
  const when = r.kind === "next" ? "Next recitation" : fmtDate(r.recitedOn);
  const inPart = page >= r.fromPage && page <= r.toPage;

  useEffect(() => {
    const unlock = lockScroll();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { unlock(); window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return createPortal(
    <div className="rv" role="dialog" aria-modal="true" aria-label={`${r.label} in the Mushaf`}>
      <style>{CSS}</style>
      <div className="rv-top">
        <button className="hz-btn" onClick={onClose}><ChevronLeft size={18} aria-hidden="true" /><span>Back</span></button>
        <div className="rv-title">{r.label}<small>{when} · {r.fromPage === r.toPage ? `page ${r.fromPage}` : `pages ${r.fromPage}–${r.toPage}`}</small></div>
      </div>
      <div className="rv-body">
        <div className="rv-inner">
          <MushafPresent page={page} who={`${r.label} · ${when}`} onNext={page < TOTAL_PAGES ? next : null} onPrev={page > 1 ? prev : null}>
            <div className="rv-nav lm-nav">
              <button className="hz-btn hz-btn-outline" disabled={page >= TOTAL_PAGES} onClick={next} aria-label="Next page"><ChevronLeft size={18} aria-hidden="true" /><span>Next</span></button>
              <div className="rv-nav-title">{pageLabel(page)}
                {!inPart && <small><button type="button" className="hz-btn hz-btn-ghost rv-back" onClick={() => setPage(r.fromPage)}>Back to page {r.fromPage}</button></small>}
              </div>
              <button className="hz-btn hz-btn-outline" disabled={page <= 1} onClick={prev} aria-label="Previous page"><span>Previous</span><ChevronRight size={18} aria-hidden="true" /></button>
            </div>
            <MushafPager page={page} onNext={page < TOTAL_PAGES ? next : null} onPrev={page > 1 ? prev : null}>
              {(p) => <MushafPage page={p} range={range} ayahMarks={ayahMarks} />}
            </MushafPager>
          </MushafPresent>
        </div>
      </div>
    </div>,
    document.body,
  );
}
