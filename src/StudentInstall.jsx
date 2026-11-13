// students.aflaahqc.com/install — the link sent to students to put the
// Students Portal on their phone as an app, with as little to do as possible.
// It works out which phone and browser it was opened in and shows only that:
//   * Android (Chrome, Samsung Internet, Edge): one "Install the app" button
//     that opens the phone's own install box (the beforeinstallprompt event,
//     caught early in main.jsx so it isn't missed while this page loads).
//   * iPhone / iPad: Apple doesn't let a web page install itself, so three
//     short steps (Share → Add to Home Screen → Add).
//   * Inside Viber, Instagram, Facebook… (where shared links usually open):
//     installing can't work there, so a button that reopens the page in
//     Chrome / Safari, and a Copy link button.
//   * Already opened as the installed app: straight to signing in.
// On localhost, /install?portal=student&as=ios|android|inapp-ios|inapp-android|app
// shows a given case for testing.
import { useEffect, useState } from "react";
import { Download, Share, PlusSquare, CheckCircle2, Copy, ExternalLink, MoreVertical, Smartphone, LogIn } from "lucide-react";
import AuthShell from "./AuthShell.jsx";
import { hideSplash } from "./splash.jsx";

const LINK = "https://students.aflaahqc.com/install";
const LOCAL = ["localhost", "127.0.0.1"].includes(window.location.hostname);

function detect() {
  const forced = LOCAL ? new URLSearchParams(window.location.search).get("as") : null;
  if (forced) return forced;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
  if (standalone) return "app";
  // In-app browsers: Viber, Facebook, Messenger, Instagram, WhatsApp, TikTok,
  // Snapchat, LINE; on Android any WebView ("; wv)"), on iPhone any browser
  // without Safari's own token.
  const inApp = /Viber|FBAN|FBAV|FB_IAB|Instagram|WhatsApp|TikTok|musical_ly|Snapchat|Line\//i.test(ua)
    || (/Android/i.test(ua) && /; wv\)/.test(ua))
    || (ios && !/Safari\//.test(ua));
  if (inApp) return ios ? "inapp-ios" : "inapp-android";
  return ios ? "ios" : "android";
}

const CSS = `
  .si-big { display: flex; align-items: center; justify-content: center; gap: 10px; text-decoration: none; }
  .si-steps { list-style: none; margin: 0 0 22px; padding: 0; display: flex; flex-direction: column; gap: 12px; counter-reset: si; }
  .si-steps li { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 1px solid #C7DDF4; border-radius: 14px; background: #F8FBFE; font-size: 16px; line-height: 1.45; color: #123B67; }
  .si-steps li::before { counter-increment: si; content: counter(si); flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #0D4F85, #176FD1); color: #FFFFFF; font-weight: 700; font-size: 15px; }
  .si-steps svg { flex-shrink: 0; color: #176FD1; }
  .si-steps b { white-space: nowrap; }
  .si-done { display: flex; align-items: center; gap: 12px; padding: 14px 16px; margin-bottom: 18px; border-radius: 14px; background: #E8F7EF; color: #1F6B43; font-size: 15px; line-height: 1.45; }
  .si-done svg { flex-shrink: 0; }
  .si-note { margin: 16px 0 0; font-size: 14px; color: #567493; line-height: 1.5; text-align: center; }
  .si-wait { margin: 0 0 16px; font-size: 14px; color: #567493; text-align: center; }
`;

const INTRO = {
  portal: "Student Portal",
  tagline: "Your Hifz and Thilawa tasks, progress, attendance and fees, on your phone.",
  features: ["Opens like an app from your home screen", "No app store, nothing to pay", "Messages from the class in your notifications"],
};

export default function StudentInstall() {
  const [where] = useState(detect);
  // The phone's install box, if the browser offers one (Android).
  const [prompt, setPrompt] = useState(() => window.__aqcInstallPrompt || null);
  const [waited, setWaited] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { hideSplash(); }, []);
  useEffect(() => {
    const onReady = () => setPrompt(window.__aqcInstallPrompt || null);
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("aqc-install-ready", onReady);
    window.addEventListener("appinstalled", onInstalled);
    // Give the browser a few seconds to offer its install box before showing
    // the menu steps instead.
    const t = setTimeout(() => setWaited(true), 3500);
    return () => { window.removeEventListener("aqc-install-ready", onReady); window.removeEventListener("appinstalled", onInstalled); clearTimeout(t); };
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    window.__aqcInstallPrompt = null;
    setPrompt(null);
    if (outcome === "accepted") setInstalled(true);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(LINK); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* the link is shown below to copy by hand */ }
  };
  const signIn = <a className="login-submit si-big" href="/"><LogIn size={20} aria-hidden="true" />Open the app and sign in</a>;
  const copyBtn = (
    <button type="button" className="login-secondary si-big" onClick={copy}>
      {copied ? <><CheckCircle2 size={18} aria-hidden="true" />Link copied</> : <><Copy size={18} aria-hidden="true" />Copy link</>}
    </button>
  );

  let title, subtitle, body;
  if (where === "app") {
    title = "The app is installed";
    subtitle = "You're all set. Sign in with your Student ID and password.";
    body = signIn;
  } else if (installed) {
    title = "Installed. MashaAllah!";
    subtitle = "Aflaah is now on your home screen.";
    body = <>
      <div className="si-done"><CheckCircle2 size={22} aria-hidden="true" /><span>Close this page and open <b>Aflaah</b> from your home screen, then sign in with your Student ID.</span></div>
      {signIn}
    </>;
  } else if (where === "inapp-android") {
    title = "Open in Chrome first";
    subtitle = "This link opened inside another app, where installing doesn't work. One tap opens it in Chrome.";
    body = <>
      <a className="login-submit si-big" href={`intent://students.aflaahqc.com/install#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(LINK)};end`}>
        <ExternalLink size={20} aria-hidden="true" />Open in Chrome
      </a>
      {copyBtn}
      <p className="si-note">Or tap <b>⋮</b> at the top and choose <b>Open in browser</b>.</p>
    </>;
  } else if (where === "inapp-ios") {
    title = "Open in Safari first";
    subtitle = "This link opened inside another app, where iPhone can't add it to the Home Screen.";
    body = <>
      <ol className="si-steps">
        <li><MoreVertical size={20} aria-hidden="true" /><span>Tap <b>•••</b> or the <b>compass</b> icon in this app</span></li>
        <li><ExternalLink size={20} aria-hidden="true" /><span>Choose <b>Open in Safari</b></span></li>
      </ol>
      <a className="login-submit si-big" href="x-safari-https://students.aflaahqc.com/install"><ExternalLink size={20} aria-hidden="true" />Open in Safari</a>
      {copyBtn}
      <p className="si-note">If the button doesn't work: copy the link, open <b>Safari</b> and paste it.</p>
    </>;
  } else if (where === "ios") {
    title = "Add Aflaah to your iPhone";
    subtitle = "Three taps in Safari. Apple doesn't let any website install itself with one button.";
    body = <>
      <ol className="si-steps">
        <li><Share size={20} aria-hidden="true" /><span>Tap <b>Share</b> (the square with an arrow). On new iPhones, tap <b>•••</b> first.</span></li>
        <li><PlusSquare size={20} aria-hidden="true" /><span>Scroll down and tap <b>Add to Home Screen</b></span></li>
        <li><CheckCircle2 size={20} aria-hidden="true" /><span>Tap <b>Add</b>, then open <b>Aflaah</b> from your Home Screen</span></li>
      </ol>
      <p className="si-note">Using Chrome on iPhone? The <b>Share</b> button is next to the address bar.</p>
    </>;
  } else if (prompt) {
    title = "Install the Aflaah app";
    subtitle = "One tap. It goes on your home screen like any other app.";
    body = <>
      <button type="button" className="login-submit si-big" onClick={install}><Download size={20} aria-hidden="true" />Install the app</button>
      <p className="si-note">Then tap <b>Install</b> in the box that opens.</p>
    </>;
  } else {
    // Android without an install box (yet): Firefox, an older browser, or
    // the app is already installed.
    title = "Install the Aflaah app";
    subtitle = waited ? "Two taps in your browser's menu." : "Getting the app ready…";
    body = waited ? <>
      <ol className="si-steps">
        <li><MoreVertical size={20} aria-hidden="true" /><span>Tap <b>⋮</b> at the top right of Chrome</span></li>
        <li><Download size={20} aria-hidden="true" /><span>Tap <b>Install app</b> (or <b>Add to Home screen</b>), then <b>Install</b></span></li>
      </ol>
      <p className="si-note">If the menu says <b>Open app</b>, it's already installed: open <b>Aflaah</b> from your home screen.</p>
      <a className="login-secondary si-big" href="/"><Smartphone size={18} aria-hidden="true" />Use it in the browser instead</a>
    </> : <p className="si-wait">One moment…</p>;
  }

  return (
    <AuthShell {...INTRO} title={title} subtitle={subtitle}>
      <style>{CSS}</style>
      {body}
    </AuthShell>
  );
}
