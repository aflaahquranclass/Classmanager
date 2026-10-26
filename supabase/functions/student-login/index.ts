// student-login: gives a student a portal login with a one-time password.
// Called from Admin → Students → Edit. Only admins may call it.
//
// Students sign in with their Student ID (e.g. AQC0001). Supabase Auth needs
// an email, so each student's login is the hidden address
// <student id>@students.aflaahqc.com (never emailed). The one-time password is
// flagged with user_metadata.must_change_password, so the student portal makes
// the student choose their own password on first sign-in.
//
// Body: { student_id: uuid } → { login: "AQC0001", password: "<one-time>" }
// Calling it again resets the password to a new one-time password.

import { createClient } from "jsr:@supabase/supabase-js@2";

const LOGIN_DOMAIN = "students.aflaahqc.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

// 8 characters without look-alikes (0/O, 1/l/I), easy to read out or SMS.
function oneTimePassword(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Caller must be a signed-in admin.
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return json({ error: "Not signed in" }, 401);
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return json({ error: "Admins only" }, 403);

  const { student_id } = await req.json().catch(() => ({}));
  if (!/^[0-9a-f-]{36}$/.test(student_id ?? "")) return json({ error: "Unknown student" }, 400);
  const { data: student } = await admin.from("students")
    .select("id, name, student_code, user_id").eq("id", student_id).maybeSingle();
  if (!student) return json({ error: "Student not found" }, 404);
  if (!student.student_code) return json({ error: "This student has no Student ID yet" }, 400);

  const email = `${student.student_code.toLowerCase()}@${LOGIN_DOMAIN}`;
  const password = oneTimePassword();
  const attrs = {
    email, password, email_confirm: true,
    user_metadata: { must_change_password: true, student_code: student.student_code, name: student.name },
  };

  let userId = student.user_id as string | null;
  if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, attrs);
    if (error) return json({ error: error.message }, 400);
  } else {
    const { data, error } = await admin.auth.admin.createUser(attrs);
    if (data?.user) {
      userId = data.user.id;
    } else {
      // A login with this address already exists (e.g. left over from a
      // removed student): reuse it with the new password.
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
      if (!existing) return json({ error: error?.message ?? "Couldn't create the login" }, 400);
      userId = existing.id;
      const { error: updErr } = await admin.auth.admin.updateUserById(userId, attrs);
      if (updErr) return json({ error: updErr.message }, 400);
    }
  }

  const { error: linkErr } = await admin.from("students").update({ user_id: userId }).eq("id", student.id);
  if (linkErr) return json({ error: linkErr.message }, 400);
  await admin.from("profiles").upsert({ id: userId, role: "student" }, { onConflict: "id" });

  return json({ login: student.student_code, password });
});
