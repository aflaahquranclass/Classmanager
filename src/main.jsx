import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { PORTAL } from "./portal.js";
import { ConfirmHost } from "./ConfirmDialog.jsx";
import { SplashDone } from "./splash.jsx";

// The main domain shows the public website. Portal subdomains (and ?portal=
// on localhost) go straight to their portal. There is no combined staff
// sign-in: the old /login address goes to the Teachers Portal (the admin signs
// in at admin.aflaahqc.com). The website is loaded on demand so the portals
// don't download it.
const Landing = lazy(() => import("./landing/Landing.jsx"));
// Each portal is its own download too: a student never loads the staff app,
// and a teacher never loads the Students Portal.
const App = lazy(() => import("./App.jsx"));
const StudentPortal = lazy(() => import("./StudentPortal.jsx"));
// students.aflaahqc.com/install: the link that puts the Students Portal on a
// phone. The browser's install offer (Android) can come before the page has
// loaded, so it's kept here for the page to use.
const StudentInstall = lazy(() => import("./StudentInstall.jsx"));
const studentInstall = PORTAL === "student" && /^\/install\/?$/.test(window.location.pathname);
if (studentInstall) {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.__aqcInstallPrompt = e;
    window.dispatchEvent(new Event("aqc-install-ready"));
  });
}
const LOCAL = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const oldStaffLogin = !PORTAL && window.location.pathname === "/login";
if (oldStaffLogin) window.location.replace(LOCAL ? "/?portal=teacher" : "https://teachers.aflaahqc.com");
const showLanding = !PORTAL && !oldStaffLogin;
// Check my Reading test page (any address): loaded only when opened.
const ReadingTest = lazy(() => import("./readingTest/ReadingTest.jsx"));
const readingTest = window.location.pathname === "/reading-test";
// Workshop sign-up pages (/workshop/<slug>, e.g. /workshop/namaadhu): loaded only when opened.
const WorkshopPage = lazy(() => import("./workshops/WorkshopPage.jsx"));
const workshopPage = !PORTAL && /^\/workshop\/[a-z0-9-]+\/?$/.test(window.location.pathname);
// Teachers Portal demo on localhost (?portal=teacher&demo=1): sample data, no sign-in.
const TeacherDemo = lazy(() => import("./TeacherDemo.jsx"));
const teacherDemo = LOCAL && PORTAL === "teacher" && new URLSearchParams(window.location.search).get("demo") === "1";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {readingTest ? <Suspense fallback={null}><ReadingTest /><SplashDone /></Suspense> : workshopPage ? <Suspense fallback={null}><WorkshopPage /><SplashDone /></Suspense> : teacherDemo ? <Suspense fallback={null}><TeacherDemo /></Suspense> : oldStaffLogin ? null : studentInstall ? <Suspense fallback={null}><StudentInstall /></Suspense> : PORTAL === "student" ? <Suspense fallback={null}><StudentPortal /></Suspense> : showLanding ? <Suspense fallback={null}><Landing /><SplashDone /></Suspense> : <Suspense fallback={null}><App /></Suspense>}
    <ConfirmHost />
  </React.StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
