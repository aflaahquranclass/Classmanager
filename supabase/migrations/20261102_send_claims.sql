-- SMS and email sending claim each recipient before sending it: the row is
-- marked 'sending' with the time, so two sends of the same notification at
-- the same time (a double click, two admins) never send it twice. A row left
-- 'sending' for over 10 minutes (the sender was cut off) can be sent again.
-- Used by supabase/functions/send-sms and worker/index.js (/api/email).

alter table public.notification_recipients
  add column sms_claimed_at timestamptz,
  add column email_claimed_at timestamptz;
