import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import App, { PORTAL } from "./App.jsx";
import StudentPortal from "./StudentPortal.jsx";
import { ConfirmHost } from "./ConfirmDialog.jsx";

// The main domain shows the public website; its staff sign-in lives at
// /login. Portal subdomains (and ?portal= on localhost) go straight to their
// portal. The website is loaded on demand so the portals don't download it.
const Landing = lazy(() => import("./landing/Landing.jsx"));
const showLanding = !PORTAL && window.location.pathname !== "/login";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {PORTAL === "student" ? <StudentPortal /> : showLanding ? <Suspense fallback={null}><Landing /></Suspense> : <App />}
    <ConfirmHost />
  </React.StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
