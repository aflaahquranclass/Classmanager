// The loading screen lives in index.html so it shows before the app's code
// has downloaded. The app hides it once it has something to show.
import { useEffect } from "react";

export const hideSplash = () => window.__aqcHideSplash?.();

// Renders nothing; hides the loading screen once it mounts.
export function SplashDone() {
  useEffect(() => { hideSplash(); }, []);
  return null;
}

// Small version of the animated logo for a section that is still loading.
export function LogoLoader({ label = "Loading…" }) {
  return (
    <div role="status" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "48px 16px", color: "#567493", fontSize: "14px" }}>
      <style>{`
        @keyframes aqc-mini { 0%, 100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.08); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .aqc-mini-logo { animation: none !important; } }
      `}</style>
      <span style={{ width: "72px", height: "72px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #0D4F85, #176FD1 55%, #0A94B1)", boxShadow: "0 10px 24px rgba(13,79,133,0.25)" }}>
        <span className="aqc-mini-logo" aria-hidden="true" style={{ width: "44px", aspectRatio: "596 / 394", background: "#FFFFFF",
          WebkitMask: "url(/images/logo-icon-only.png) center / contain no-repeat", mask: "url(/images/logo-icon-only.png) center / contain no-repeat",
          animation: "aqc-mini 1.6s ease-in-out infinite" }} />
      </span>
      {label}
    </div>
  );
}
