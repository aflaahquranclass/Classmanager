// Stops the page behind a full-screen layer (Listen & mark, the full-screen
// Mushaf, the whiteboard…) from scrolling, and lets it scroll again when the
// last such layer closes.
//
// Each layer used to save the page's scroll setting when it opened and put
// that back when it closed. With two open at once (the Mushaf full screen on
// top of Listen & mark) the second saved "no scrolling", and closing them put
// "no scrolling" back: the teacher's page under it could never scroll again
// until the app was closed. Now the layers are counted, and the page's own
// setting comes back only when none is left.
//
// Returns the function that releases this layer's lock (safe to call twice).

let held = 0;
let saved = "";

export function lockScroll() {
  if (typeof document === "undefined") return () => {};
  if (held === 0) saved = document.body.style.overflow === "hidden" ? "" : document.body.style.overflow;
  held += 1;
  document.body.style.overflow = "hidden";
  let released = false;
  return () => {
    if (released) return;
    released = true;
    held = Math.max(0, held - 1);
    if (held === 0) document.body.style.overflow = saved;
  };
}

// For tests.
export const scrollLocks = () => held;
