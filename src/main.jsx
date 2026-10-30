import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import App, { PORTAL } from "./App.jsx";
import StudentPortal from "./StudentPortal.jsx";
import { ConfirmHost } from "./ConfirmDialog.jsx";
import { SplashDone } from "./splash.jsx";

// The main domain shows the public website. Portal subdomains (and ?portal=
// on localhost) go straight to their portal. There is no combined staff
// sign-in: the old /login address goes to the Teachers Portal (the admin signs
// in at admin.aflaahqc.com). The website is loaded on demand so the portals
// don't download it.
const Landing = lazy(() => import("./landing/Landing.jsx"));
const LOCAL = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const oldStaffLogin = !PORTAL && window.location.pathname === "/login";
if (oldStaffLogin) window.location.replace(LOCAL ? "/?portal=teacher" : "https://teachers.aflaahqc.com");
const showLanding = !PORTAL && !oldStaffLogin;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {oldStaffLogin ? null : PORTAL === "student" ? <StudentPortal /> : showLanding ? <Suspense fallback={null}><Landing /><SplashDone /></Suspense> : <App />}
    <ConfirmHost />
  </React.StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
