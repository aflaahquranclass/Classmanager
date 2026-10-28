-- Phone notifications (Web Push): one row per device a teacher or student
-- turned notifications on for. When the admin sends an in-app notification,
-- the site's Worker (/api/push) pushes it to each recipient's devices so it
-- shows in the phone's notification center.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users manage their own devices" on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- The Worker sends with the admin's own token: it reads recipients' devices
-- and removes ones the push service says are gone.
create policy "Admins read devices" on public.push_subscriptions
  for select using (public.is_admin());
create policy "Admins remove devices" on public.push_subscriptions
  for delete using (public.is_admin());

-- Saving a device: a phone that changes hands (or a shared tablet) moves the
-- endpoint to whoever signed in last.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default '')
returns void
language sql
security definer
set search_path to 'public'
as $$
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(coalesce(p_user_agent, ''), 300))
  on conflict (endpoint) do update
    set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now();
$$;

revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
