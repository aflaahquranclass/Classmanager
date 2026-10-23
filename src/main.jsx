import React from "react";
import ReactDOM from "react-dom/client";
import App, { PORTAL } from "./App.jsx";
import StudentPortal from "./StudentPortal.jsx";
import { ConfirmHost } from "./ConfirmDialog.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {PORTAL === "student" ? <StudentPortal /> : <App />}
    <ConfirmHost />
  </React.StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
