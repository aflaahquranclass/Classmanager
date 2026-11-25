// Keeps an open app on the newest version. A page load always gets the
// newest deploy (sw.js fetches pages from the network first), but a page or
// installed app that stays open keeps running the version it was opened with:
// a teacher's portal left open all day still ran the old Hifz code, setting
// Short and Long Muraja'ah by itself, hours after the change went live.
//
// So every few minutes while the app is in front, and whenever it comes back
// to the front, it looks at which version the site serves now (the hashed
// entry script in index.html). If it's a newer one:
//  - back after a while away, with nothing being typed in: reload at once;
//  - otherwise a small bar offers Update, with × to put it off (it isn't
//    shown over a full-screen dialog such as Listen & mark, and the reload
//    happens anyway the next time the app comes back after a while away).

const CHECK_EVERY_MS = 10 * 60 * 1000;
const AWAY_MS = 15 * 60 * 1000;
const ENTRY = /\/assets\/index-[\w-]+\.js/;

const runningEntry = () => {
  const src = document.querySelector('script[type="module"][src*="/assets/index-"]')?.getAttribute("src") || "";
  return src.match(ENTRY)?.[0] || null;
};

async function servedEntry() {
  const res = await fetch("/", { cache: "no-store", credentials: "same-origin", headers: { Accept: "text/html" } });
  if (!res.ok) return null;
  return (await res.text()).match(ENTRY)?.[0] || null;
}

// Typing in a field right now (a reload would lose it).
const typing = () => {
  const el = document.activeElement;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
};

function showBar(onClose) {
  if (document.getElementById("aqc-update") || document.querySelector('[aria-modal="true"]')) return;
  const bar = document.createElement("div");
  bar.id = "aqc-update";
  bar.setAttribute("role", "status");
  Object.assign(bar.style, {
    position: "fixed", left: "50%", bottom: "max(16px, env(safe-area-inset-bottom))", transform: "translateX(-50%)", zIndex: "2147483000",
    display: "flex", alignItems: "center", gap: "12px", maxWidth: "calc(100vw - 24px)", padding: "10px 10px 10px 16px",
    borderRadius: "14px", background: "#123B67", color: "#FFFFFF", boxShadow: "0 10px 30px rgba(13,40,70,0.35)",
    font: "500 14px/1.3 Inter, ui-sans-serif, system-ui, sans-serif",
  });
  const text = document.createElement("span");
  text.textContent = "A new version of the app is ready.";
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Update";
  Object.assign(button.style, {
    flexShrink: "0", minHeight: "38px", padding: "0 16px", border: "none", borderRadius: "10px", cursor: "pointer",
    background: "#FFFFFF", color: "#123B67", font: "700 14px/1 Inter, ui-sans-serif, system-ui, sans-serif",
  });
  button.addEventListener("click", () => window.location.reload());
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "Not now");
  Object.assign(close.style, {
    flexShrink: "0", width: "38px", height: "38px", border: "none", borderRadius: "10px", cursor: "pointer",
    background: "transparent", color: "#FFFFFF", font: "400 22px/1 Inter, ui-sans-serif, system-ui, sans-serif",
  });
  close.addEventListener("click", () => { bar.remove(); onClose(); });
  bar.append(text, button, close);
  document.body.append(bar);
}

export function keepAppUpdated() {
  const running = runningEntry();
  if (!running) return; // not a built page (e.g. the dev server)
  let newer = false;
  let checking = false;
  let hiddenAt = null;
  let putOff = false; // × pressed: not shown again until the app comes back to the front

  const check = async () => {
    if (checking || document.hidden) return newer;
    checking = true;
    try {
      const served = await servedEntry();
      if (served && served !== running) newer = true;
    } catch { /* offline: try again later */ } finally { checking = false; }
    if (newer && !putOff) showBar(() => { putOff = true; });
    return newer;
  };

  document.addEventListener("visibilitychange", async () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    const away = hiddenAt != null && Date.now() - hiddenAt >= AWAY_MS;
    hiddenAt = null;
    putOff = false;
    if ((await check()) && away && !typing()) window.location.reload();
  });
  setInterval(check, CHECK_EVERY_MS);
}
