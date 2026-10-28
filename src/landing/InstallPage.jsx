import { useState } from "react";
import { Smartphone, Share, PlusSquare, MoreVertical, Download, Bell, ExternalLink } from "lucide-react";

// aflaahqc.com/install: how to put a portal on a phone's home screen as an app
// and turn on its notifications, for Android (Chrome) and iPhone (Safari).
// Linked from the bell's phone-notifications row (src/notifications/push.js).

const LOCAL = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const PORTALS = [
  { key: "student", label: "Students", app: "Aflaah", url: LOCAL ? "/?portal=student" : "https://students.aflaahqc.com", show: "students.aflaahqc.com" },
  { key: "teacher", label: "Teachers", app: "AQC Teachers", url: LOCAL ? "/?portal=teacher" : "https://teachers.aflaahqc.com", show: "teachers.aflaahqc.com" },
  { key: "admin", label: "Admin", app: "AQC Admin", url: LOCAL ? "/?portal=admin" : "https://admin.aflaahqc.com", show: "admin.aflaahqc.com" },
];

const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const STEPS = {
  android: (p) => [
    { icon: ExternalLink, title: "Open the portal in Chrome", body: <>Open <a href={p.url}>{p.show}</a> in the <b>Chrome</b> app.</> },
    { icon: MoreVertical, title: "Open Chrome's menu", body: <>Tap the <b>⋮</b> button at the top right of Chrome.</> },
    { icon: Download, title: "Install the app", body: <>Tap <b>Install app</b> (on some phones it says <b>Add to Home screen</b>), then <b>Install</b>. Chrome may also show an <b>Install</b> banner by itself — tapping that works too.</> },
    { icon: Smartphone, title: "Open it from your home screen", body: <>The <b>{p.app}</b> icon is now on your home screen and in your app list. Open it from there and sign in.</> },
    { icon: Bell, title: "Turn on notifications", body: <>Tap the <b>bell</b> at the top, then <b>Turn on</b>, and tap <b>Allow</b>. Messages from the class now appear in your notification bar, even when the app is closed.</> },
  ],
  ios: (p) => [
    { icon: ExternalLink, title: "Open the portal in Safari", body: <>Open <a href={p.url}>{p.show}</a> in <b>Safari</b>. (iPhone needs iOS 16.4 or newer for notifications.)</> },
    { icon: Share, title: "Tap Share", body: <>Tap the <b>Share</b> button — the square with an arrow pointing up, at the bottom of the screen (or next to the address bar). If you don't see it, tap <b>•••</b> first.</> },
    { icon: PlusSquare, title: "Add to Home Screen", body: <>Scroll down and tap <b>Add to Home Screen</b>. Leave <b>Open as Web App</b> switched on, then tap <b>Add</b>.</> },
    { icon: Smartphone, title: "Open it from your Home Screen", body: <>Close Safari and open the <b>{p.app}</b> icon on your Home Screen, then sign in. Notifications only work when the app is opened from this icon, not from Safari.</> },
    { icon: Bell, title: "Turn on notifications", body: <>Tap the <b>bell</b> at the top, then <b>Turn on</b>, and tap <b>Allow</b>. Messages from the class now appear in your Notification Center and on the Lock Screen.</> },
  ],
};

export default function InstallPage() {
  const [os, setOs] = useState(isIos ? "ios" : "android");
  // ?for=teacher|student|admin opens that portal's steps (the links sent to
  // teachers and parents); the phone type is picked from the device.
  const [portal, setPortal] = useState(() => PORTALS.find((p) => p.key === new URLSearchParams(window.location.search).get("for")) || PORTALS[0]);
  const steps = STEPS[os](portal);

  return (
    <>
      <section className="ld-page-head">
        <div className="ld-wrap ld-reveal">
          <p className="ld-tag">Install the app</p>
          <h1 className="ld-h2">Put Aflaah on your phone</h1>
          <p>Install the portal like an app — no app store needed — and get class messages in your phone's notifications.</p>
        </div>
      </section>
      <section className="ld-sec ld-soft" style={{ paddingTop: 0 }}>
        <div className="ld-wrap ld-install">
          <div className="ld-install-pick ld-reveal">
            <div role="group" aria-label="Your phone" className="ld-seg">
              <button type="button" aria-pressed={os === "android"} onClick={() => setOs("android")}>Android</button>
              <button type="button" aria-pressed={os === "ios"} onClick={() => setOs("ios")}>iPhone / iPad</button>
            </div>
            <div role="group" aria-label="Which portal" className="ld-seg">
              {PORTALS.map((p) => (
                <button key={p.key} type="button" aria-pressed={portal.key === p.key} onClick={() => setPortal(p)}>{p.label}</button>
              ))}
            </div>
          </div>

          <ol className="ld-steps">
            {steps.map((s, i) => (
              <li key={s.title} className="ld-card ld-step">
                <span className="ld-step-n" aria-hidden="true">{i + 1}</span>
                <div>
                  <h2><s.icon size={18} aria-hidden="true" />{s.title}</h2>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="ld-install-go">
            <a className="ld-btn ld-btn-primary" href={portal.url}>Open {portal.label.toLowerCase()} portal</a>
          </div>

          <div className="ld-card ld-install-help">
            <h2>Not getting notifications?</h2>
            <ul>
              <li>Open the app from its home-screen icon, tap the bell and check it says <b>Phone notifications are on</b>.</li>
              {os === "ios"
                ? <li>Go to <b>Settings → Notifications → {portal.app}</b> and switch on <b>Allow Notifications</b>. Check Focus / Do Not Disturb is off.</li>
                : <li>Go to <b>Settings → Apps → {portal.app} → Notifications</b> (or long-press the app icon → <b>App info</b>) and switch them on.</li>}
              <li>If you said <b>Don't allow</b> by mistake, allow notifications in those settings, then reopen the app and tap <b>Turn on</b> again.</li>
              <li>Each portal is its own app — a parent and a teacher on the same phone can install both.</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
