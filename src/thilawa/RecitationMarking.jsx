// Marking the class's recitation on the Mushaf, like New Hifz and Short
// Muraja'ah in Hifz: the teacher taps the ayah number where today's (or the
// next) recitation starts, then the one where it ends. Today's is saved as
// the day's entry (the days before stay as history); the next one waits until
// the teacher starts it on its day. Their first and last ayah numbers are
// coloured (the current one green, the next one purple), and a panel under
// the page says what's set. The current one is the last part marked: it stays
// coloured on the days after, until the teacher marks another part.
//
// useRecitationMarking({ recitations, onSet }) → the props for ListenScreen's
// `ayah`: { marks, onTap, selected, close, extra }. recitations: the class's
// (repos.js listRecitations). onSet(kind, span | null): "today" | "next" |
// "start-next" (the next one becomes today's); returns a promise.

import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { AnchoredPopup } from "./MistakeCategories.jsx";
import { ayahSpan } from "./engine.js";
import { browserTimezone } from "./service.js";
import { localDate } from "../hifz/engine.js";
import { fmtDate } from "./ThilawaStudent.jsx";
import { ayahNumber, verseKeyOf, ayahName } from "../hifz/tasks.js";
import { ayahRef } from "../hifz/ayahs.js";

const CSS = `
  .rm-head { display: flex; align-items: center; gap: 10px; }
  .rm-head span { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; }
  .rm-opts { display: flex; flex-direction: column; gap: 6px; }
  .rm-opt { display: flex; align-items: center; gap: 10px; min-height: 46px; padding: 0 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.4); background: transparent; color: #FFFFFF;
    font: 600 15px/1.2 Inter, ui-sans-serif, system-ui, sans-serif; text-align: left; cursor: pointer; }
  .rm-opt:hover { background: rgba(255,255,255,0.12); }
  .rm-opt:disabled { opacity: 0.6; cursor: default; }
  .rm-opt-quiet { border-color: transparent; font-weight: 500; opacity: 0.85; }
  .rm-dot { display: inline-block; flex-shrink: 0; width: 12px; height: 12px; border-radius: 50%; }
  .rm-opt .rm-dot { box-shadow: 0 0 0 2px rgba(255,255,255,0.7); }
  .rm-dot-today { background: #13795B; }
  .rm-dot-next { background: #7A4FD0; }
  .rm-panel { border: 1px solid #DCEBF8; border-radius: 14px; background: #FFFFFF; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; color: #123B67; }
  .rm-panel-head { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #567493; }
  .rm-row { display: grid; grid-template-columns: auto 92px minmax(0, 1fr) auto; align-items: center; gap: 10px; }
  .rm-row b { font-size: 14px; }
  .rm-row div { font-size: 15px; font-weight: 600; overflow-wrap: anywhere; }
  .rm-row small { display: block; font-size: 12.5px; font-weight: 400; color: #567493; }
  .rm-row .hz-btn { min-height: 34px; padding: 0 10px; font-size: 13px; }
  .rm-none { color: #8FA5BB; font-weight: 500 !important; }
  .rm-error { color: #9B1C0A; font-size: 13px; }
  @media (max-width: 520px) { .rm-row { grid-template-columns: auto minmax(0, 1fr) auto; } .rm-row b { display: none; } }
`;

const KINDS = { today: "Today's recitation", next: "Next recitation" };

// The part the class is on: the last day's (it stays until another is marked), and the next one.
export function currentRecitations(recitations = []) {
  return {
    current: recitations.find((r) => r.kind !== "next") || null, // newest day first (repos.js)
    next: recitations.find((r) => r.kind === "next") || null,
  };
}

// The ayah numbers to colour ({ "67:16": "today", … }): the current part's
// first and last in green, the next one's in purple. pending ({ kind, ayah }):
// a start waiting for its end, shown in place of that kind's part.
export function recitationMarks(recitations = [], pending = null) {
  const { current, next } = currentRecitations(recitations);
  const marks = {};
  const put = (n, kind) => {
    if (!n) return;
    const k = verseKeyOf(n);
    marks[k] = marks[k] && marks[k] !== kind ? "todaynext" : kind;
  };
  for (const [kind, r] of [["today", current], ["next", next]]) {
    if (pending?.kind === kind) put(pending.ayah, kind);
    else if (r) { put(r.first, kind); put(r.last, kind); }
  }
  return marks;
}

export function useRecitationMarking({ recitations = [], onSet }) {
  const [menu, setMenu] = useState(null); // { verseKey, page, el }: the ayah number just tapped
  const [pending, setPending] = useState(null); // { kind, ayah }: a start waiting for its end
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const today = localDate(new Date(), browserTimezone());
  const { current, next } = currentRecitations(recitations);

  const set = async (kind, span) => {
    setBusy(true);
    setError("");
    try { await onSet(kind, span); } catch (e) { setError(e.message || "That couldn't be saved. Try again."); } finally { setBusy(false); }
  };

  const marks = recitationMarks(recitations, pending);

  const onTap = useCallback((w) => setMenu(w), []);
  const close = useCallback(() => setMenu(null), []);

  let popup = null;
  if (menu) {
    const n = ayahNumber(menu.verseKey);
    const opts = [];
    if (pending) {
      opts.push({ key: "end", dot: pending.kind, label: `${KINDS[pending.kind]} ends here`, run: () => { const { kind, ayah } = pending; setPending(null); set(kind, ayahSpan(ayah, n)); } });
      opts.push({ key: "one", dot: pending.kind, label: "Just this ayah", quiet: true, run: () => { const { kind } = pending; setPending(null); set(kind, ayahSpan(n)); } });
      opts.push({ key: "cancel", label: "Cancel the start", quiet: true, run: () => setPending(null) });
    } else {
      for (const kind of ["today", "next"]) opts.push({ key: kind, dot: kind, label: `${KINDS[kind]} starts here`, run: () => setPending({ kind, ayah: n }) });
      if (next && (next.first === n || next.last === n)) opts.push({ key: "clear-next", label: "Clear the next recitation", quiet: true, run: () => set("next", null) });
    }
    popup = (
      <AnchoredPopup anchor={menu.el} label={`Ayah ${menu.verseKey}`} onClose={close} deps={[menu.verseKey, !!pending]}>
        <div className="rm-head">
          <span>{ayahName(ayahRef(n))} · page {menu.page}</span>
          <button type="button" className="mc-pop-close" onClick={close} aria-label="Close"><X size={16} aria-hidden="true" /></button>
        </div>
        <div className="rm-opts">
          {opts.map((o) => (
            <button key={o.key} type="button" className={`rm-opt ${o.quiet ? "rm-opt-quiet" : ""}`} disabled={busy} onClick={() => { close(); o.run(); }}>
              {o.dot && <i className={`rm-dot rm-dot-${o.dot}`} aria-hidden="true" />}{o.label}
            </button>
          ))}
        </div>
      </AnchoredPopup>
    );
  }

  const pages = (r) => (r.fromPage === r.toPage ? `page ${r.fromPage}` : `pages ${r.fromPage}–${r.toPage}`);
  const since = (r) => (r.recitedOn && r.recitedOn !== today ? ` · ${fmtDate(r.recitedOn)}` : "");
  const row = (kind, r, action) => (
    <div className="rm-row" key={kind}>
      <i className={`rm-dot rm-dot-${kind}`} aria-hidden="true" />
      <b>{kind === "today" ? "Today" : "Next"}</b>
      {pending?.kind === kind
        ? <div>{ayahName(ayahRef(pending.ayah))} –</div>
        : r ? <div>{r.label}<small>{pages(r)}{since(r)}</small></div>
        : <div className="rm-none">–</div>}
      {action || <span />}
    </div>
  );
  const panel = (
    <div className="rm-panel" aria-label="The class's recitation">
      <style>{CSS}</style>
      {row("today", current, current?.recitedOn !== today && next && !pending && (
        <button type="button" className="hz-btn hz-btn-outline" disabled={busy} onClick={() => set("start-next", null)}>Start next</button>
      ))}
      {row("next", next)}
      {error && <div className="rm-error" role="alert">{error}</div>}
    </div>
  );

  return { marks, onTap, selected: menu?.verseKey || null, close, extra: <>{popup}{panel}</> };
}
