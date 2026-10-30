-- Hifz plan settings (runs after 20261105_hifz_teacher_tasks.sql).
--
-- * hifz_profiles gets the plan the teacher sets for each student, used to
--   work out each day's portions automatically:
--     direction / start_unit — where the Hifz started: from Al-Baqarah onward
--       ('forward') or from An-Naba, juz by juz towards the front
--       ('juz_reverse'); start_unit is the exact starting point.
--     short_pages — how many of the most recently memorised pages Short
--       Muraja'ah revises.
--     long_start_unit / long_mode / long_pages — where Long Muraja'ah starts,
--       and how much a day: to the end of the juz ('juz') or a number of pages.
-- * hifz_goals: the year the student wants to finish by. The student sets it
--   (asked the first time they open the portal) and can change it; their
--   teacher and the admin can see and change it too.

alter table public.hifz_profiles
  add column if not exists direction text not null default 'forward' check (direction in ('forward', 'juz_reverse')),
  add column if not exists start_unit int check (start_unit >= 0 and start_unit < 18120),
  add column if not exists short_pages numeric(4,1) not null default 1 check (short_pages > 0 and short_pages <= 40),
  add column if not exists long_start_unit int check (long_start_unit >= 0 and long_start_unit < 18120),
  add column if not exists long_mode text not null default 'juz' check (long_mode in ('juz', 'pages')),
  add column if not exists long_pages numeric(4,1) not null default 2 check (long_pages > 0 and long_pages <= 40);

create table public.hifz_goals (
  student_id uuid primary key references public.students(id) on delete cascade,
  goal_year int not null check (goal_year between 2000 and 2200),
  updated_at timestamptz not null default now()
);
alter table public.hifz_goals enable row level security;

create policy "Students read own hifz goal" on public.hifz_goals
  for select using (student_id = public.current_student_id());
create policy "Students set own hifz goal" on public.hifz_goals
  for insert with check (student_id = public.current_student_id());
create policy "Students change own hifz goal" on public.hifz_goals
  for update using (student_id = public.current_student_id()) with check (student_id = public.current_student_id());
create policy "Teachers manage their students' hifz goals" on public.hifz_goals for all
  using (student_id in (select id from public.students where teacher_id = public.current_teacher_id()))
  with check (student_id in (select id from public.students where teacher_id = public.current_teacher_id()));
create policy "Admins manage hifz goals" on public.hifz_goals for all using (public.is_admin()) with check (public.is_admin());

-- A goal the teacher already entered on the profile becomes the student's goal.
insert into public.hifz_goals (student_id, goal_year)
select student_id, goal_year from public.hifz_profiles where goal_year is not null
on conflict (student_id) do nothing;

alter table public.hifz_goals replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.hifz_goals;
exception when others then
  raise warning 'Realtime publication not changed: %', sqlerrm;
end $$;
