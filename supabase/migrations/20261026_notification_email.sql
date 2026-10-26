-- Email as a third way to deliver a notification. Emails are sent by the
-- site's Cloudflare Worker (worker/index.js, Cloudflare Email Service).

alter table public.notifications add column send_email boolean not null default false;

alter table public.notification_recipients
  add column email text,
  -- none (email not requested) | pending | sent | failed | no_email
  add column email_status text not null default 'none',
  add column email_error text,
  add column email_sent_at timestamptz;
