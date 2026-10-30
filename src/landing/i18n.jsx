import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { loadSiteOverrides, siteTranslator } from "./siteStrings.js";

// The website's language: English or Dhivehi. The visitor's choice is kept
// in this browser; ?lang=dv or ?lang=en in the address picks one directly
// (the admin's "Open the website in Dhivehi" link uses it).
const KEY = "aflaah-site-lang";
const LANGS = ["en", "dv"];

function initialLang() {
  const fromUrl = new URLSearchParams(window.location.search).get("lang");
  if (LANGS.includes(fromUrl)) return fromUrl;
  try {
    const stored = localStorage.getItem(KEY);
    if (LANGS.includes(stored)) return stored;
  } catch { /* storage blocked: English */ }
  return "en";
}

let overridesCache = null;

const LangContext = createContext({ lang: "en", setLang: () => {}, t: siteTranslator("en") });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);
  const [overrides, setOverrides] = useState(overridesCache || {});

  const setLang = useCallback((next) => {
    setLangState(next);
    try { localStorage.setItem(KEY, next); } catch { /* not kept */ }
  }, []);

  // The admin's corrections are only needed for Dhivehi.
  useEffect(() => {
    if (lang !== "dv" || overridesCache) return;
    loadSiteOverrides().then((o) => { overridesCache = o; setOverrides(o); });
  }, [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    return () => { document.documentElement.lang = "en"; };
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t: siteTranslator(lang, overrides) }), [lang, setLang, overrides]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

// Clears the cache so the admin's newly saved wording shows without a reload.
export const forgetSiteOverrides = () => { overridesCache = null; };

// "ދިވެހި" while the site is in English, "English" while it is in Dhivehi.
export function LangSwitch({ className = "" }) {
  const { lang, setLang } = useLang();
  const next = lang === "dv" ? "en" : "dv";
  return (
    <button type="button" className={`ld-lang ${className}`} lang={next} onClick={() => setLang(next)} aria-label={next === "dv" ? "ދިވެހިން ބައްލަވާ (View in Dhivehi)" : "View in English"}>
      {next === "dv" ? "ދިވެހި" : "English"}
    </button>
  );
}
