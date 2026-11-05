import { useEffect, useRef } from "react";

// Makes the phone's (and browser's) Back button work inside a portal.
// Pages are switched with React state, not URLs, so without this Back leaves
// the app. Each page change adds a history entry (same address) holding the
// page's key; Back brings that entry up and we switch to its page.
//
//   useBackNav(view, setView, "aqcView")
//
// `key` keeps one portal's entries apart from another's.
export function useBackNav(value, setValue, key) {
  const latest = useRef(value);
  const fromBack = useRef(false);
  latest.current = value;

  useEffect(() => {
    const onPop = (e) => {
      const v = e.state?.[key];
      if (v == null || v === latest.current) return;
      fromBack.current = true;
      setValue(v);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [key, setValue]);

  useEffect(() => {
    if (fromBack.current) { fromBack.current = false; return; }
    const state = window.history.state || {};
    if (state[key] == null) window.history.replaceState({ ...state, [key]: value }, "");
    else if (state[key] !== value) window.history.pushState({ ...state, [key]: value }, "");
  }, [key, value]);
}
