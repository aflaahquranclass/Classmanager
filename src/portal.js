// Which portal this web address serves. teachers.* shows only the teacher
// login, admin.* only the admin login and students.* the student portal (the
// older aqc-teachers.* / aqc-admin.* / aqc-students.* names still work); any
// other address (aflaahqc.com, localhost) keeps
// teacher + admin. On localhost, ?portal=teacher|admin|student lets you try the
// single-portal modes. This is UX separation only — the real
// access control is the database's row-level security.
function detectPortal() {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    const q = new URLSearchParams(window.location.search).get("portal");
    return q === "teacher" || q === "admin" || q === "student" ? q : null;
  }
  const sub = host.split(".")[0].replace(/^aqc-/, "");
  if (sub === "students") return "student";
  if (sub === "teachers") return "teacher";
  if (sub === "admin") return "admin";
  return null;
}
export const PORTAL = detectPortal();
