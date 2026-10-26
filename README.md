# Aflaah Quran Class — Management App

A React + Supabase app for managing students, teachers, classes, attendance,
class records, and monthly fee payments for Aflaah Quran Class.

## Stack

- **Frontend:** React + Vite
- **Backend:** Supabase (Postgres database, Auth, Row-Level Security)
- No custom server — the browser talks to Supabase directly, protected by
  Row-Level Security policies (not by anything in the frontend code).

## Local setup

```bash
npm install
cp .env.example .env    # already filled in with the real project URL/key below
npm run dev
```

Open the printed local URL. You'll land on the login screen — use one of the
two accounts already set up in Supabase (see "Accounts" below).

### About the `.env` values

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.example` point at
the real "Class workspace" Supabase project. The **anon key is safe to be
public** — it's the standard publishable key Supabase apps ship in their
JS bundle; it has zero power on its own, and every table is protected by
Row-Level Security policies that check who's actually logged in. This is
normal and is not a leaked secret.

**Never** put a Supabase *service role* key in this app or any other
client-side code — that key bypasses RLS entirely and must only ever be
used from a trusted server.

## How auth works

This app uses **real Supabase Auth** — no passwords are stored or checked
by the app itself.

- **Admin account:** `admin@aflaah.com`
- **Teacher account (already linked):** `haathim@aflaah.com`

To add a new teacher and give them their own login:
1. In Supabase → Authentication → Users, create a login for them (or have
   them sign up) with their email + a password.
2. In the app, as admin: Teachers → Add teacher (name, subject, email —
   no password field, since the app never handles passwords).
3. Click **Link login** on that teacher with the same email. This calls a
   secure database function (`admin_link_teacher_by_email`) that connects
   their Supabase Auth login to their teacher record. Only admins can do
   this — it's enforced in the database, not just hidden in the UI.

Every table (students, teachers, classes, payments, attendance, holidays)
has Row-Level Security policies so:
- Admins can read/write everything.
- Teachers can only see their own students/classes, and can only
  read/write their own students' attendance records.
- Payments are admin-only.
- Holidays are readable by anyone logged in, writable by admins only.

## Database schema & security

The full schema (tables, RLS policies, helper functions) lives in the
Supabase project itself (Class workspace), not as SQL files in this repo.
To view or change it, use the Supabase dashboard's SQL editor or Table
Editor for that project.

One dashboard setting worth turning on yourself (not something a SQL
migration can do): **Authentication → Policies → enable "leaked password
protection"**, which checks new passwords against known-breached password
lists.

## Deploying

This is a static site (Vite build output) that talks directly to Supabase.
It is hosted on **Cloudflare Workers** (static assets), configured in
`wrangler.jsonc`:

| Address | Portal |
|---|---|
| `aflaahqc.com` | Teacher + Admin login |
| `admin.aflaahqc.com` | Admin login only |
| `teachers.aflaahqc.com` | Teacher login only |
| `students.aflaahqc.com` | Student portal |

To deploy, with `.env` filled in (the `VITE_*` values are baked in at build
time):

```bash
npm run build
npx wrangler deploy
```

### Notifications: SMS and email

Admin → Notifications sends messages in the app, by SMS and by email.

- **SMS** (MessageOwl) goes through the Supabase Edge Function
  `supabase/functions/send-sms`. Add the secrets `MESSAGEOWL_API_KEY` and
  `MESSAGEOWL_SENDER_ID` under Supabase → Edge Functions → Secrets.
- **Email** goes through this site's Worker (`worker/index.js`, route
  `/api/email`) using Cloudflare Email Service. In the Cloudflare dashboard
  go to **Compute → Email Service → Email Sending → Onboard Domain** and
  choose `aflaahqc.com` (it adds the SPF/DKIM DNS records; sending to any
  address needs the Workers Paid plan). The sender address is `EMAIL_FROM`
  in `wrangler.jsonc`. Email only works on the deployed site, not on
  `npm run dev`.

Until a service is set up, messages for it are saved as "pending" and can be
sent later from the notification's history.

`public/_headers` sets the response headers (no-cache for `sw.js`, the
manifest content type). Any new address must also be added in Supabase
under **Authentication → URL Configuration → Redirect URLs**, or password
reset links won't return to it.

## Project structure

```
├── index.html
├── src/
│   ├── main.jsx          # React entry point
│   ├── App.jsx            # The whole app (all screens, all logic)
│   └── supabaseClient.js  # Supabase client setup (reads .env)
├── .env.example
├── package.json
└── vite.config.js
```
