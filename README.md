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

### Dhivehi exam reports

When an exam report is downloaded in Dhivehi, its remarks and comments are put
into correct Dhivehi by Claude through the Worker (`/api/dhivehi`,
`worker/dhivehi.js`): English is translated, Dhivehi typed in Latin letters is
written in Thaana, and Thaana is checked for spelling and punctuation. It needs
an Anthropic API key as a Worker secret:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

Without the key (or when developing locally) remarks are shown as written,
with Thaana punctuation tidied.

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

### Phone notifications (push)

Every in-app notification is also pushed to the phones of teachers, students
and admins who turned on **phone notifications** (bell → Turn on). The
database sends them: a trigger on `notification_recipients`
(`supabase/migrations/20261028_push_on_insert.sql`) posts each message to the
Worker (`/api/push-out`, `worker/push.js`), which delivers it with Web Push. It needs the
`push_subscriptions` table (`supabase/migrations/20261028_push_subscriptions.sql`)
and the VAPID private key as a Worker secret; the key is in `.dev.vars`
(never committed):

```bash
npx wrangler secret put VAPID_PRIVATE_JWK
```

The public half is `VAPID_PUBLIC_KEY` in `wrangler.jsonc` and in
`src/notifications/push.js` — if you ever make a new key pair, change all
three, and everyone has to turn notifications on again.

On iPhone, notifications only work once the portal is added to the Home
Screen (iOS 16.4+). The install guide for Android and iPhone is at
`aflaahqc.com/install`.

### Admin alerts

When a student uploads a payment slip or someone sends a review, a database
trigger (`supabase/migrations/20261028_admin_alerts.sql`) puts an alert in
every admin's bell, and the push trigger above sends it to admins' phones. The database and Worker share a secret: Vault secret
`admin_alert_secret` in Supabase, `ALERT_SECRET` in the Worker:

```bash
npx wrangler secret put ALERT_SECRET
```

### Class registration

The website's Classes section and its form at `aflaahqc.com/register` offer
the classes the admin marks **Show on the website** under **Admin → Classes**
(edit a class: class type Tajweed/Hifz/Foundation, age group, monthly fee,
registration fee). Each class type also has its own form for posters
(`/register/tajweed`, `/register/hifz`, `/register/foundation`); the links and
a switch to open or close each form are under **Admin → Registrations → Form
links**.

People fill in their details and attach the registration fee slip; the
registration lands under **Admin → Registrations → Applications** and alerts
the admins. **Accept** adds the student to the class (with their Student ID),
records the registration fee as other income in Finance, makes their student
portal login and sends them the welcome message with their class and login
(Notifications → Templates: welcome and student portal login).

Database: `supabase/migrations/20261028_class_registrations.sql` and
`20261029_registration_classes.sql`.

### Old Vercel addresses

The app used to be on Vercel. `vercel.json` now only forwards the old
`*.vercel.app` addresses to the new ones on `aflaahqc.com`.

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
