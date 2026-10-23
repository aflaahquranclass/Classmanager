-- Hifz Tracker: per-student plan settings and daily assignments.
-- Quran positions are integer half-line units (1 page = 30 units, 604 pages =
-- 18120 units); ranges are JSON arrays of [start, end) pairs.

create or replace function public.current_student_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.students where user_id = auth.uid();
$$;

-- Total units in a JSON range list, e.g. '[[0,30],[60,75]]' → 45.
create or replace function public.hifz_units(ranges jsonb)
returns int language sql immutable as $$
  select coalesce(sum((r->>1)::int - (r->>0)::int), 0)::int from jsonb_array_elements(coalesce(ranges, '[]'::jsonb)) r;
$$;

create table public.hifz_settings (
  student_id uuid primary key references public.students(id) on delete cascade,
  timezone text not null,
  goal_year int not null check (goal_year between 2000 and 2200),
  start_unit int not null check (start_unit >= 0 and start_unit < 18120),
  direction text not null check (direction in ('forward', 'juz_reverse')),
  current_unit int not null check (current_unit >= 0 and current_unit <= 18120),
  extra_memorized jsonb not null default '[]'::jsonb,
  new_target int not null check (new_target > 0),
  short_target int not null check (short_target > 0),
  long_target int not null check (long_target > 0),
  long_start_unit int not null check (long_start_unit >= 0 and long_start_unit < 18120),
  long_override_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hifz_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  plan_date date not null,
  activity text not null check (activity in ('new', 'short', 'long')),
  target int not null check (target > 0),
  pending_in jsonb not null default '[]'::jsonb,
  segments jsonb not null default '[]'::jsonb,
  completed jsonb not null default '[]'::jsonb,
  cursor_after int,
  cycle_after int not null default 1,
  status text not null check (status in ('pending', 'partial', 'completed', 'empty')),
  completed_at timestamptz,
  planned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 0,
  -- One task per activity per day: makes plan generation idempotent.
  unique (student_id, plan_date, activity),
  -- The daily target is a strict maximum, enforced here as well as in the app.
  check (public.hifz_units(segments) <= target),
  check (public.hifz_units(completed) <= public.hifz_units(segments))
);
create index hifz_assignments_student_date on public.hifz_assignments (student_id, plan_date);

-- Who/which day/which activity a task belongs to can never change.
create or replace function public.hifz_assignments_lock_keys()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.student_id <> old.student_id or new.plan_date <> old.plan_date or new.activity <> old.activity then
    raise exception 'A Hifz task''s student, date and activity cannot be changed';
  end if;
  return new;
end $$;
create trigger hifz_assignments_lock_keys before update on public.hifz_assignments
  for each row execute function public.hifz_assignments_lock_keys();

alter table public.hifz_settings enable row level security;
alter table public.hifz_assignments enable row level security;

-- Students: only their own rows. No delete policy, so history can't be removed.
create policy "Students read own hifz settings" on public.hifz_settings
  for select using (student_id = public.current_student_id());
create policy "Students create own hifz settings" on public.hifz_settings
  for insert with check (student_id = public.current_student_id());
create policy "Students update own hifz settings" on public.hifz_settings
  for update using (student_id = public.current_student_id()) with check (student_id = public.current_student_id());

create policy "Students read own hifz tasks" on public.hifz_assignments
  for select using (student_id = public.current_student_id());
create policy "Students create own hifz tasks" on public.hifz_assignments
  for insert with check (student_id = public.current_student_id());
create policy "Students update own hifz tasks" on public.hifz_assignments
  for update using (student_id = public.current_student_id()) with check (student_id = public.current_student_id());

-- Admins and the student's own teacher can view progress (read-only).
create policy "Admins view hifz settings" on public.hifz_settings for select using (public.is_admin());
create policy "Admins view hifz tasks" on public.hifz_assignments for select using (public.is_admin());
create policy "Teachers view their students' hifz settings" on public.hifz_settings for select
  using (student_id in (select id from public.students where teacher_id = public.current_teacher_id()));
create policy "Teachers view their students' hifz tasks" on public.hifz_assignments for select
  using (student_id in (select id from public.students where teacher_id = public.current_teacher_id()));

-- Hardening (applied as a follow-up migration).
alter function public.hifz_units(jsonb) set search_path = public;
revoke execute on function public.current_student_id() from anon, public;
grant execute on function public.current_student_id() to authenticated;
