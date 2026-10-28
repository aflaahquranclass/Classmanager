-- Admin alerts: when a student uploads a payment slip or someone sends a
-- review, every admin gets it in their bell and, if they turned phone
-- notifications on, on their phone. Runs after 20261026_payment_slips.sql,
-- 20261028_reviews.sql and 20261028_push_subscriptions.sql.
--
-- The phone push goes through the site's Worker (/api/admin-alert). The
-- database posts to it with pg_net and a shared secret kept in Vault
-- ('admin_alert_secret'); the Worker holds the same value as ALERT_SECRET.
-- Alerts are saved as notifications with audience 'admin_alert', which
-- Admin → Notifications leaves out of its history.

create extension if not exists pg_net;

select vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'admin_alert_secret', 'Shared with the Worker as ALERT_SECRET (admin phone alerts)')
where not exists (select 1 from vault.secrets where name = 'admin_alert_secret');

create or replace function public.alert_admins(p_title text, p_body text, p_label text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_note uuid;
  v_subs jsonb;
  v_secret text;
begin
  insert into notifications (title, body, audience, audience_label, send_in_app, created_by)
  values (p_title, p_body, 'admin_alert', p_label, true, null)
  returning id into v_note;
  insert into notification_recipients (notification_id, user_id, name)
  select v_note, p.id, 'Admin' from profiles p where p.role = 'admin';

  select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]'::jsonb)
    into v_subs
    from push_subscriptions s join profiles p on p.id = s.user_id
    where p.role = 'admin';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'admin_alert_secret';
  if v_subs = '[]'::jsonb or v_secret is null then return; end if;

  perform net.http_post(
    url := 'https://aflaahqc.com/api/admin-alert',
    body := jsonb_build_object('title', p_title, 'body', p_body, 'tag', v_note, 'url', '/login', 'subs', v_subs),
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Alert-Secret', v_secret)
  );
exception when others then
  -- An alert must never stop the slip or review from being saved.
  raise warning 'alert_admins failed: %', sqlerrm;
end;
$$;

revoke all on function public.alert_admins(text, text, text) from public, anon, authenticated;

create or replace function public.alert_admins_new_review()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform alert_admins(
    'New review · ' || repeat('★', new.rating),
    new.name || ' (' || new.class_name || '): ' || left(new.comment, 140) || case when char_length(new.comment) > 140 then '…' else '' end,
    'Review — ' || new.name
  );
  return null;
end;
$$;

create or replace function public.alert_admins_new_slip()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_name text;
begin
  select name into v_name from students where id = new.student_id;
  perform alert_admins(
    'New payment slip',
    coalesce(v_name, 'A student') || ' sent a slip for MVR ' || trim(to_char(new.amount, 'FM999G999D00')) || ' (' || to_char(to_date(new.month, 'YYYY-MM'), 'FMMonth YYYY') || '). Check it under Finance → Payment slips.',
    'Payment slip — ' || coalesce(v_name, 'student')
  );
  return null;
end;
$$;

revoke all on function public.alert_admins_new_review() from public, anon, authenticated;
revoke all on function public.alert_admins_new_slip() from public, anon, authenticated;

drop trigger if exists alert_admins_new_review on public.reviews;
create trigger alert_admins_new_review after insert on public.reviews
  for each row execute function public.alert_admins_new_review();

drop trigger if exists alert_admins_new_slip on public.payment_slips;
create trigger alert_admins_new_slip after insert on public.payment_slips
  for each row execute function public.alert_admins_new_slip();

-- The Worker reports devices the push service says are gone (uninstalled
-- app, notifications turned off) so they stop being sent to.
create or replace function public.forget_push_endpoints(p_secret text, p_endpoints text[])
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_secret is distinct from (select decrypted_secret from vault.decrypted_secrets where name = 'admin_alert_secret') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from push_subscriptions where endpoint = any(p_endpoints);
end;
$$;

revoke all on function public.forget_push_endpoints(text, text[]) from public;
grant execute on function public.forget_push_endpoints(text, text[]) to anon;
