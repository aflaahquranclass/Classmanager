// Search a surah by name or number, then pick the ayahs (whole surah by
// default). Every change hands the pages those ayahs are on to onPick.
// Remount it (change its key) to clear it.

import { useState, useMemo, useRef } from "react";
import { Search } from "lucide-react";
import { SURAH_AYAH_COUNTS } from "../hifz/ayahs.js";
import { ayahPages, searchSurahs } from "./engine.js";

const pickerCss = `
  .sp-search { position: relative; }
  .sp-search > svg { position: absolute; left: 12px; top: 22px; transform: translateY(-50%); color: #8FADC0; pointer-events: none; }
  .sp-search .hz-input { padding-left: 38px; }
  .sp-list { position: absolute; z-index: 20; left: 0; right: 0; top: calc(100% + 4px); margin: 0; padding: 4px; list-style: none; max-height: 280px; overflow-y: auto; background: #FFFFFF; border: 1px solid #C7DDF4; border-radius: 12px; box-shadow: 0 14px 30px rgba(18,59,103,0.14); }
  .sp-list li { display: flex; align-items: baseline; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; color: #123B67; font-size: 15px; }
  .sp-list li span { color: #567493; font-size: 12px; margin-left: auto; white-space: nowrap; }
  .sp-list li b { min-width: 28px; color: #1452A8; }
  .sp-list li[aria-selected="true"] { background: #EAF3FD; }
  .sp-empty { padding: 10px 12px; color: #567493; font-size: 14px; }
  .sp-ayahs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 10px; }
  .sp-ayahs .hz-field { margin-top: 0; }
  .sp-hint { margin: 8px 0 0; color: #567493; font-size: 13px; }
`;

export default function SurahAyahPicker({ id, onPick }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [surah, setSurah] = useState(null); // 1–114
  const [fromAyah, setFromAyah] = useState("");
  const [toAyah, setToAyah] = useState("");
  const listRef = useRef(null);
  const matches = useMemo(() => searchSurahs(query), [query]);
  const count = surah ? SURAH_AYAH_COUNTS[surah - 1] : 0;
  const picked = surah && +fromAyah >= 1 ? ayahPages(surah, +fromAyah, +(toAyah || fromAyah)) : null;

  const emit = (n, a, b) => { if (+a >= 1) onPick(ayahPages(n, +a, +(b || a))); };
  const choose = (s) => {
    const all = SURAH_AYAH_COUNTS[s.number - 1];
    setSurah(s.number);
    setQuery(`${s.number}. ${s.name}`);
    setFromAyah("1");
    setToAyah(String(all));
    setOpen(false);
    emit(s.number, 1, all);
  };
  const move = (step) => {
    const next = Math.min(Math.max(0, active + step), matches.length - 1);
    setActive(next);
    listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
  };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (open) move(1); else setOpen(true); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter" && open && matches[active]) { e.preventDefault(); choose(matches[active]); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div>
      <style>{pickerCss}</style>
      <div className="hz-field" style={{ marginTop: 0 }}>
        <label htmlFor={`${id}-surah`}>Surah (fills the pages)</label>
        <div className="sp-search">
          <Search size={17} aria-hidden="true" />
          <input id={`${id}-surah`} className="hz-input" type="text" autoComplete="off" placeholder="Search by name or number, e.g. Mulk or 67"
            role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list"
            aria-activedescendant={open && matches[active] ? `${id}-opt-${matches[active].number}` : undefined}
            value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
            onFocus={(e) => { e.target.select(); setOpen(true); }} onBlur={() => setOpen(false)} onKeyDown={onKey} />
          {open && (
            <ul id={`${id}-list`} ref={listRef} className="sp-list" role="listbox" aria-label="Surahs">
              {matches.length === 0 ? <li className="sp-empty" aria-disabled="true">No surah matches “{query}”</li> : matches.map((s, i) => (
                <li key={s.number} id={`${id}-opt-${s.number}`} role="option" aria-selected={i === active}
                  onMouseDown={(e) => { e.preventDefault(); choose(s); }} onMouseEnter={() => setActive(i)}>
                  <b>{s.number}</b>{s.name}<span>{SURAH_AYAH_COUNTS[s.number - 1]} ayahs · p. {s.startPage}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {surah && (
        <>
          <div className="sp-ayahs">
            <div className="hz-field">
              <label htmlFor={`${id}-from-ayah`}>From ayah</label>
              <input id={`${id}-from-ayah`} className="hz-input" type="number" inputMode="numeric" min="1" max={count} value={fromAyah}
                onChange={(e) => { setFromAyah(e.target.value); emit(surah, e.target.value, toAyah); }} />
            </div>
            <div className="hz-field">
              <label htmlFor={`${id}-to-ayah`}>To ayah</label>
              <input id={`${id}-to-ayah`} className="hz-input" type="number" inputMode="numeric" min={fromAyah || 1} max={count} value={toAyah} placeholder="Same ayah"
                onChange={(e) => { setToAyah(e.target.value); emit(surah, fromAyah, e.target.value); }} />
            </div>
          </div>
          <p className="sp-hint" aria-live="polite">
            {picked ? `${picked.label} · ${picked.fromPage === picked.toPage ? `page ${picked.fromPage}` : `pages ${picked.fromPage}–${picked.toPage}`}` : "Enter the first ayah."} · {count} ayahs in this surah
          </p>
        </>
      )}
    </div>
  );
}
