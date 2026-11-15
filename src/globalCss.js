// A component's CSS as one <style> in <head>, added the first time it's
// needed and kept. A <style> inside a component is put into the page again
// each time the component appears (a pop-up, a Mushaf page turning into
// view), and each time the phone has to restyle the whole screen — slow on
// a phone with a Mushaf page of words open.

import { useInsertionEffect } from "react";

export function useGlobalCss(id, css) {
  useInsertionEffect(() => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    if (el.textContent !== css) el.textContent = css;
  }, [id, css]);
}
