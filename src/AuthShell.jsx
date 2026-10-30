// Shared sign-in layout for every portal (Teachers, Admin, Students), in the
// portal's brand colours: a blue brand panel beside a white sign-in card on
// wide screens; on phones the brand panel becomes a header above the card.
// The form fields use the .login-* classes styled here.

import { Check } from "lucide-react";

// Same blues as the portal sidebar, header and loading screen (TP in App.jsx).
const BRAND = { navy: "#123B67", deep: "#0D4F85", blue: "#176FD1", teal: "#0A94B1", border: "#C7DDF4", muted: "#567493" };
const GRADIENT = `linear-gradient(150deg, ${BRAND.deep} 0%, ${BRAND.blue} 55%, ${BRAND.teal} 100%)`;
const BUTTON_GRADIENT = `linear-gradient(90deg, ${BRAND.deep} 0%, ${BRAND.blue} 55%, ${BRAND.teal} 100%)`;
// The official logo (emblem, wordmark and underline), white for the blue panel.
const LOGO_URL = "/images/logo-full-white.png";
// The class's Islamic rosette (the same image as the portal sidebar). The
// picture is a quarter rosette whose centre is its bottom-left corner.
const PATTERN_URL = "/images/tp-pattern-sidebar.png";

const AUTH_CSS = `
  body { margin: 0; }
  .auth { min-height: 100vh; min-height: 100dvh; display: grid; grid-template-columns: minmax(380px, 44%) 1fr; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: ${BRAND.navy}; background: #FFFFFF; }

  /* ---------- brand panel ---------- */
  .auth-brand { position: relative; overflow: hidden; color: #FFFFFF; background: radial-gradient(circle at 18% 8%, rgba(255,255,255,0.16), transparent 45%), ${GRADIENT};
    padding: clamp(32px, 4.5vw, 64px); display: flex; flex-direction: column; justify-content: space-between; gap: 40px; }
  /* The rosette fans out from the panel's bottom-right corner: mirrored so its
     centre sits exactly in the corner, and faded out before its rough outer
     rim so only the clean inner part shows. */
  .auth-pattern { position: absolute; right: 0; bottom: 0; width: min(560px, 85%); aspect-ratio: 1; pointer-events: none; transform: scaleX(-1); opacity: 0.22;
    background: url(${PATTERN_URL}) left bottom / contain no-repeat;
    -webkit-mask-image: radial-gradient(circle at 0% 100%, #000 0%, #000 42%, rgba(0,0,0,0.55) 56%, transparent 72%);
    mask-image: radial-gradient(circle at 0% 100%, #000 0%, #000 42%, rgba(0,0,0,0.55) 56%, transparent 72%); }
  .auth-brand > *:not(.auth-pattern) { position: relative; }
  .auth-logo { display: block; width: clamp(150px, 14vw, 190px); height: auto; filter: drop-shadow(0 6px 18px rgba(8,40,80,0.25)); }
  .auth-brand-main h1 { margin: 0 0 14px; font-size: clamp(30px, 3.2vw, 44px); font-weight: 700; line-height: 1.15; letter-spacing: -0.01em; }
  .auth-brand-main p { margin: 0; max-width: 440px; font-size: 17px; line-height: 1.6; opacity: 0.88; }
  .auth-features { list-style: none; margin: 28px 0 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
  .auth-features li { display: flex; align-items: center; gap: 12px; font-size: 15px; font-weight: 500; }
  .auth-features li span { flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.16); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.3); }
  .auth-brand-foot { font-size: 13px; opacity: 0.72; }

  /* ---------- sign-in card ---------- */
  .auth-panel { display: flex; align-items: center; justify-content: center; padding: 40px 24px; background: #FFFFFF; }
  .auth-card { width: 100%; max-width: 420px; animation: auth-rise 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
  .auth-card h2 { margin: 0 0 6px; font-size: 28px; font-weight: 700; color: ${BRAND.navy}; letter-spacing: -0.01em; }
  .auth-card-sub { margin: 0 0 28px; font-size: 15px; color: ${BRAND.muted}; line-height: 1.5; }
  .auth-help { margin: 22px 0 0; font-size: 13px; color: ${BRAND.muted}; text-align: center; line-height: 1.5; }
  @keyframes auth-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

  /* Portal choice (Teachers / Admin) */
  .login-segment { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 5px; margin-bottom: 24px; border-radius: 14px; background: #F1F6FC; border: 1px solid #E1ECF8; }
  .login-segment-btn { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 46px; border: none; border-radius: 10px; background: transparent; color: ${BRAND.muted}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
  .login-segment-btn:hover { color: ${BRAND.navy}; }
  .login-segment-btn-active { background: #FFFFFF; color: ${BRAND.blue}; box-shadow: 0 2px 8px rgba(18,59,103,0.12); }
  .login-segment-btn:focus-visible { outline: 2px solid ${BRAND.blue}; outline-offset: 2px; }
  .login-segment-btn svg { width: 18px; height: 18px; }

  /* Fields */
  .login-field { margin-bottom: 18px; }
  .login-field label { display: block; font-size: 14px; font-weight: 600; color: ${BRAND.navy}; margin-bottom: 8px; }
  .login-input-wrap { position: relative; display: flex; align-items: center; }
  .login-input-wrap .login-input-icon { position: absolute; left: 15px; color: #8FADC0; pointer-events: none; }
  .login-input { width: 100%; box-sizing: border-box; height: 52px; border: 1px solid ${BRAND.border}; border-radius: 12px; padding: 0 44px; font: inherit; font-size: 16px; background: #F8FBFE; color: ${BRAND.navy}; transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease; }
  .login-input::placeholder { color: #93A9BC; }
  .login-input:hover { border-color: #9FC3EA; }
  .login-input:focus, .login-input-focused { outline: none; background: #FFFFFF; border-color: ${BRAND.blue}; box-shadow: 0 0 0 4px rgba(23,111,209,0.14); }
  .login-input-toggle { position: absolute; right: 10px; display: flex; padding: 6px; border: none; border-radius: 8px; background: none; color: #8FADC0; cursor: pointer; }
  .login-input-toggle:hover { color: ${BRAND.blue}; }
  .login-input-toggle:focus-visible { outline: 2px solid ${BRAND.blue}; outline-offset: 1px; }
  .login-row-between { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 22px; font-size: 14px; }
  .login-remember { display: flex; align-items: center; gap: 9px; color: ${BRAND.muted}; cursor: pointer; }
  .login-remember input { width: 17px; height: 17px; accent-color: ${BRAND.blue}; cursor: pointer; }
  .login-forgot { border: none; padding: 0; background: none; color: ${BRAND.blue}; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .login-forgot:hover { text-decoration: underline; }
  .login-forgot:focus-visible { outline: 2px solid ${BRAND.blue}; outline-offset: 2px; }
  .login-error { margin: -6px 0 16px; padding: 10px 12px; border-radius: 10px; background: #FBEAE6; color: #A5432C; font-size: 14px; }
  .login-status { margin: -6px 0 16px; padding: 10px 12px; border-radius: 10px; background: #EAF3FC; color: #1D5FA8; font-size: 14px; }
  .login-submit { width: 100%; height: 54px; border: none; border-radius: 12px; background: ${BUTTON_GRADIENT}; color: #FFFFFF; font: inherit; font-size: 16px; font-weight: 700; letter-spacing: 0.01em; cursor: pointer;
    box-shadow: 0 12px 26px rgba(13,79,133,0.28); transition: filter 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease; }
  .login-submit:hover { filter: brightness(1.07); box-shadow: 0 14px 30px rgba(13,79,133,0.34); }
  .login-submit:active { transform: scale(0.99); }
  .login-submit:disabled { opacity: 0.65; cursor: not-allowed; }
  .login-submit:focus-visible { outline: 3px solid #9FC3EA; outline-offset: 2px; }
  .login-secondary { width: 100%; height: 48px; margin-top: 10px; border: 1px solid ${BRAND.border}; border-radius: 12px; background: #FFFFFF; color: ${BRAND.navy}; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer; }
  .login-secondary:hover { background: #F4F8FC; }

  /* ---------- phones and narrow windows: brand panel becomes a header ---------- */
  @media (max-width: 900px) {
    .auth { grid-template-columns: 1fr; grid-template-rows: auto 1fr; background: ${BRAND.deep}; }
    .auth-brand { padding: 28px 22px 64px; gap: 20px; }
    /* The card covers the header's foot, so here the rosette comes from the top-right corner. */
    .auth-pattern { top: 0; bottom: auto; width: 240px; opacity: 0.2; transform: scale(-1, -1); }
    .auth-logo { width: 120px; }
    .auth-brand-main h1 { font-size: 28px; margin-bottom: 6px; }
    .auth-brand-main p { font-size: 15px; }
    .auth-features, .auth-brand-foot { display: none; }
    .auth-panel { align-items: flex-start; margin-top: -36px; padding: 30px 20px 40px; border-radius: 24px 24px 0 0; position: relative; }
  }
  @media (prefers-reduced-motion: reduce) { .auth-card { animation: none; } }
`;

// portal:   the big title on the brand panel, e.g. "Teachers Portal"
// tagline:  one line under it; features: up to three short points
// title / subtitle: the heading of the sign-in card
export default function AuthShell({ portal, tagline, features = [], title, subtitle, children }) {
  return (
    <div className="auth">
      <style>{AUTH_CSS}</style>
      <aside className="auth-brand">
        <div className="auth-pattern" aria-hidden="true" />
        <img src={LOGO_URL} className="auth-logo" alt="Aflaah Quran Class" width="598" height="392" />
        <div className="auth-brand-main">
          <h1>{portal}</h1>
          {tagline && <p>{tagline}</p>}
          {features.length > 0 && (
            <ul className="auth-features">
              {features.map((f) => <li key={f}><span><Check size={15} strokeWidth={2.6} aria-hidden="true" /></span>{f}</li>)}
            </ul>
          )}
        </div>
        <div className="auth-brand-foot">© {new Date().getFullYear()} Aflaah Quran Class</div>
      </aside>
      <main className="auth-panel">
        <div className="auth-card">
          <h2>{title}</h2>
          {subtitle && <p className="auth-card-sub">{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}
