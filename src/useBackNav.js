import { useEffect, useRef } from "react";

// Makes the phone's (and browser's) Back button work inside a portal like a
// normal app: it closes whatever is open on top (menu, Mushaf, an open class
// or student) first, then goes to the previous page, then leaves the app.
// Pages are switched with React state, not URLs, so without this Back leaves
// the app. Each step adds a history entry (same address) holding its key.

// Going back is instant: no fade/slide-in animations for that moment.
const INSTANT = "aqc-instant";
let styleAdded = false;
function instantFrame() {
  if (!styleAdded) {
    const el = document.createElement("style");
    el.textContent = `.${INSTANT} *, .${INSTANT} *::before, .${INSTANT} *::after { animation: none !important; transition: none !important; }`;
    document.head.appendChild(el);
    styleAdded = true;
  }
  const root = document.documentElement;
  root.classList.add(INSTANT);
  clearTimeout(instantFrame.t);
  instantFrame.t = setTimeout(() => root.classList.remove(INSTANT), 600);
}

// Layer keys start with this, so a page change doesn't carry them over.
const LAYER = "layer:";
const withoutLayers = (state) => Object.fromEntries(Object.entries(state || {}).filter(([k]) => !k.startsWith(LAYER)));

//   useBackNav(view, setView, "aqcView")
export function useBackNav(value, setValue, key) {
  const latest = useRef(value);
  const fromBack = useRef(false);
  latest.current = value;

  useEffect(() => {
    const onPop = (e) => {
      const v = e.state?.[key];
      if (v == null || v === latest.current) return;
      fromBack.current = true;
      instantFrame();
      setValue(v);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [key, setValue]);

  useEffect(() => {
    if (fromBack.current) { fromBack.current = false; return; }
    const state = window.history.state || {};
    if (state[key] == null) window.history.replaceState({ ...state, [key]: value }, "");
    else if (state[key] !== value) {
      // Leaving a page while something was open on it (e.g. a menu link):
      // the new page takes that entry's place, so Back needs no extra press.
      const overLayer = Object.keys(state).some((k) => k.startsWith(LAYER));
      window.history[overLayer ? "replaceState" : "pushState"]({ ...withoutLayers(state), [key]: value }, "");
    }
  }, [key, value]);
}

// Something opened on top of a page (menu, Mushaf, an open class): Back
// closes it instead of leaving the page.
//   useBackLayer(!!openId, () => setOpenId(null), "hifz-mushaf")
// Closed with its own button, its history entry is taken back off quietly.
export function useBackLayer(open, close, name) {
  const key = LAYER + name;
  const closeRef = useRef(close);
  closeRef.current = close;
  const pushed = useRef(false);

  useEffect(() => {
    if (open && !pushed.current) {
      window.history.pushState({ ...(window.history.state || {}), [key]: true }, "");
      pushed.current = true;
    } else if (!open && pushed.current) {
      pushed.current = false;
      // Checked a moment later: when a page change closed it (menu link),
      // that page's entry is on top by then and must not be undone.
      setTimeout(() => { if (window.history.state?.[key]) window.history.back(); }, 0);
    }
  }, [open, key]);

  useEffect(() => {
    const onPop = (e) => {
      if (!pushed.current || e.state?.[key]) return;
      pushed.current = false;
      instantFrame();
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [key]);

  // Left the page with it still open: its entry stays, and Back over it
  // simply shows the page again.
  useEffect(() => () => { pushed.current = false; }, []);
}
