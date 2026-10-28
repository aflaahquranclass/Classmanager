-- Phone notifications are sent by the database, not by the admin's browser:
-- whenever in-app notification recipients are saved (Admin → Notifications,
-- payment slip replies, admin alerts for new slips / reviews), this trigger
-- posts one ready message per device to the Worker (/api/push-out, see
-- worker/push.js). So a phone notification goes out no matter which screen,
-- or how old a browser tab, saved the notification.

create or replace function public.push_new_notifications()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_msgs jsonb;
  v_secret text;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
      'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth,
      'title', coalesce(nullif(n.title, ''), 'Aflaah Quran Class'),
      'body', left(coalesce(nullif(r.body, ''), n.body), 1000),
      'tag', n.id)), '[]'::jsonb)
    into v_msgs
    from new_rows r
    join notifications n on n.id = r.notification_id and n.send_in_app
    join push_subscriptions s on s.user_id = r.user_id
    where r.user_id is not null;
  if v_msgs = '[]'::jsonb then return null; end if;

  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'admin_alert_secret';
  if v_secret is null then return null; end if;

  perform net.http_post(
    url := 'https://aflaahqc.com/api/push-out',
    body := jsonb_build_object('messages', v_msgs),
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Alert-Secret', v_secret)
  );
  return null;
exception when others then
  -- A phone notification must never stop the notification from being saved.
  raise warning 'push_new_notifications failed: %', sqlerrm;
  return null;
end;
$$;

revoke all on function public.push_new_notifications() from public, anon, authenticated;

drop trigger if exists push_new_notifications on public.notification_recipients;
create trigger push_new_notifications after insert on public.notification_recipients
  referencing new table as new_rows
  for each statement execute function public.push_new_notifications();

-- Admin alerts now only save the alert; the trigger above pushes it.
create or replace function public.alert_admins(p_title text, p_body text, p_label text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_note uuid;
begin
  insert into notifications (title, body, audience, audience_label, send_in_app, created_by)
  values (p_title, p_body, 'admin_alert', p_label, true, null)
  returning id into v_note;
  insert into notification_recipients (notification_id, user_id, name)
  select v_note, p.id, 'Admin' from profiles p where p.role = 'admin';
exception when others then
  -- An alert must never stop the slip or review from being saved.
  raise warning 'alert_admins failed: %', sqlerrm;
end;
$$;

revoke all on function public.alert_admins(text, text, text) from public, anon, authenticated;
