// Search a surah by name or number, then pick the ayahs (whole surah by
// default). Every change hands the pages those ayahs are on to onPick.
// Remount it (change its key) to clear it.

import { useState } from "react";
import { SURAH_AYAH_COUNTS } from "../hifz/ayahs.js";
import SurahSelect from "../hifz/SurahSelect.jsx";
import { ayahPages } from "./engine.js";

const pickerCss = `
  .sp-ayahs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 10px; }
  .sp-ayahs .hz-field { margin-top: 0; }
  .sp-hint { margin: 8px 0 0; color: #567493; font-size: 13px; }
`;

export default function SurahAyahPicker({ id, onPick, label = "Surah (fills the pages)" }) {
  const [surah, setSurah] = useState(null); // 1–114
  const [fromAyah, setFromAyah] = useState("");
  const [toAyah, setToAyah] = useState("");
  const count = surah ? SURAH_AYAH_COUNTS[surah - 1] : 0;
  const picked = surah && +fromAyah >= 1 ? ayahPages(surah, +fromAyah, +(toAyah || fromAyah)) : null;

  const emit = (n, a, b) => { if (+a >= 1) onPick(ayahPages(n, +a, +(b || a))); };
  const choose = (n) => {
    const all = SURAH_AYAH_COUNTS[n - 1];
    setSurah(n);
    setFromAyah("1");
    setToAyah(String(all));
    emit(n, 1, all);
  };

  return (
    <div>
      <style>{pickerCss}</style>
      <div className="hz-field" style={{ marginTop: 0 }}>
        <label htmlFor={`${id}-surah`}>{label}</label>
        <SurahSelect id={`${id}-surah`} value={surah} onChange={choose} placeholder="Search by name or number, e.g. Mulk or 67" />
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
