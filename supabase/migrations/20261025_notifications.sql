-- Admin → Notifications: one message sent to a chosen audience, delivered
-- in the app (bell in the teacher and student portals) and/or by SMS.
-- SMS is sent by the `send-sms` Edge Function, which holds the provider's
-- API key as a secret — the key never reaches the browser.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  body text not null,
  -- everyone | students | teachers | class | people | numbers
  audience text not null,
  audience_label text not null default '',
  send_in_app boolean not null default true,
  send_sms boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- One row per person (or typed number) the notification went to.
create table public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  teacher_id uuid references public.teachers(id) on delete set null,
  user_id uuid,              -- their login, for the in-app inbox (null = no login)
  name text not null default '',
  phone text,
  read_at timestamptz,
  -- none (SMS not requested) | pending | sent | failed | no_phone
  sms_status text not null default 'none',
  sms_error text,
  sms_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index notification_recipients_user_idx on public.notification_recipients (user_id, created_at desc);
create index notification_recipients_notification_idx on public.notification_recipients (notification_id);

alter table public.notifications enable row level security;
alter table public.notification_recipients enable row level security;

create policy "Admins manage notifications" on public.notifications
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Recipients read their notifications" on public.notifications
  for select to authenticated using (
    send_in_app and exists (
      select 1 from public.notification_recipients r
      where r.notification_id = notifications.id and r.user_id = auth.uid()
    )
  );

create policy "Admins manage notification recipients" on public.notification_recipients
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Users read their own inbox" on public.notification_recipients
  for select to authenticated using (user_id = auth.uid());

-- Users may only mark their own notifications as read (nothing else).
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language sql
security definer
set search_path to 'public'
as $$
  update public.notification_recipients
    set read_at = now()
    where user_id = auth.uid()
      and read_at is null
      and (p_ids is null or id = any(p_ids));
$$;

revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
