// A surah dropdown you can type in: search by name or number ("mulk",
// "al mulk", "yaseen", "67"), then pick with a tap, or the arrow keys and
// Enter. Used like a <select>: `value` is the surah number (1–114, or null
// when none is chosen yet) and onChange gets the one picked. Name it with
// `id` and a <label htmlFor>, or with `ariaLabel`. Every surah dropdown in
// the portals uses it.

import { useState, useMemo, useRef, useEffect, useId } from "react";
import { ChevronDown, Search } from "lucide-react";
import { SURAHS, searchSurahs } from "./quran.js";
import { SURAH_AYAH_COUNTS } from "./ayahs.js";

const css = `
  .ss { position: relative; min-width: 0; }
  .ss > svg { position: absolute; top: 50%; transform: translateY(-50%); pointer-events: none; }
  .ss > .ss-icon { left: 10px; color: #8FADC0; }
  .ss > .ss-chev { right: 9px; color: #567493; }
  .ss .hz-input.ss-input { width: 100%; padding-left: 32px; padding-right: 28px; text-overflow: ellipsis; cursor: pointer; }
  .ss .hz-input.ss-input:focus { cursor: text; }
  .ss-list { position: absolute; z-index: 60; left: 0; top: calc(100% + 4px); width: 100%; min-width: 250px; box-sizing: border-box; margin: 0; padding: 4px; list-style: none;
    max-height: min(300px, 45vh); overflow-y: auto; overscroll-behavior: contain; background: #FFFFFF; border: 1px solid #C7DDF4; border-radius: 12px; box-shadow: 0 14px 30px rgba(18,59,103,0.16); text-align: left; }
  .ss-up .ss-list { top: auto; bottom: calc(100% + 4px); }
  .ss-list li { display: flex; align-items: baseline; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; color: #123B67; font-size: 15px; font-weight: 500; text-transform: none; letter-spacing: normal; }
  .ss-list li b { min-width: 28px; color: #1452A8; }
  .ss-list li span { margin-left: auto; color: #567493; font-size: 12px; font-weight: 400; white-space: nowrap; }
  .ss-list li[aria-selected="true"] { background: #EAF3FD; }
  .ss-list li.ss-current { font-weight: 700; }
  .ss-list li.ss-empty { color: #567493; font-size: 14px; cursor: default; }
`;

export default function SurahSelect({ value, onChange, id, ariaLabel, placeholder = "Type a surah name or number", className = "" }) {
  const autoId = useId();
  const inputId = id || `ss${autoId.replace(/:/g, "")}`;
  const listId = `${inputId}-list`;
  const [query, setQuery] = useState(""); // typed since the list opened
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false); // the list opens upwards (no room below)
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const keyMoved = useRef(false);
  const chosen = value ? SURAHS[value - 1] : null;
  const chosenText = chosen ? `${chosen.number}. ${chosen.name}` : "";
  const matches = useMemo(() => searchSurahs(query), [query]);

  // Opening empties the box to type in (the chosen surah stays as its
  // placeholder) and shows every surah, scrolled to the chosen one.
  const show = () => {
    if (open) return;
    const box = inputRef.current?.getBoundingClientRect();
    const height = window.visualViewport?.height ?? window.innerHeight;
    setUp(!!box && height - box.bottom < 240 && box.top > height - box.bottom);
    setQuery("");
    setActive(chosen ? chosen.number - 1 : 0);
    setOpen(true);
  };
  const hide = () => { setOpen(false); setQuery(""); };
  const choose = (s, byTap) => {
    hide();
    if (s.number !== value) onChange(s.number);
    // A tap closes the phone keyboard too.
    if (byTap) inputRef.current?.blur();
  };

  // Keep the highlighted surah in view inside the list (not the page).
  const scrollTo = (i, centre) => {
    const list = listRef.current;
    const item = list?.children[i];
    if (!item) return;
    if (centre) list.scrollTop = item.offsetTop - (list.clientHeight - item.offsetHeight) / 2;
    else if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight;
  };
  useEffect(() => { if (open) scrollTo(active, true); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (open && keyMoved.current) scrollTo(active, false); keyMoved.current = false; }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (listRef.current && query) listRef.current.scrollTop = 0; }, [query]);

  const move = (step) => { keyMoved.current = true; setActive((a) => Math.min(Math.max(0, a + step), matches.length - 1)); };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (open) move(1); else show(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (open) move(-1); else show(); }
    else if (e.key === "Enter" && open) { e.preventDefault(); if (matches[active]) choose(matches[active], false); }
    else if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); hide(); }
  };

  return (
    <div className={`ss ${up ? "ss-up" : ""} ${className}`}>
      <style>{css}</style>
      <Search className="ss-icon" size={15} aria-hidden="true" />
      <input ref={inputRef} id={inputId} className="hz-input ss-input" type="text" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="done"
        role="combobox" aria-label={ariaLabel} aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${matches[active].number}` : undefined}
        placeholder={open && chosenText ? chosenText : placeholder} value={open ? query : chosenText}
        onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
        onFocus={show} onClick={show} onBlur={hide} onKeyDown={onKey} />
      <ChevronDown className="ss-chev" size={16} aria-hidden="true" />
      {open && (
        <ul id={listId} ref={listRef} className="ss-list" role="listbox" aria-label="Surahs">
          {matches.length === 0 ? <li className="ss-empty" aria-disabled="true">No surah matches “{query}”</li> : matches.map((s, i) => (
            <li key={s.number} id={`${listId}-${s.number}`} role="option" aria-selected={i === active} className={s.number === value ? "ss-current" : ""}
              onMouseDown={(e) => { e.preventDefault(); choose(s, true); }} onMouseEnter={() => setActive(i)}>
              <b>{s.number}</b>{s.name}<span>{SURAH_AYAH_COUNTS[s.number - 1]} ayahs · p. {s.startPage}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
