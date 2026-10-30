-- Hifz is now planned by the teacher (runs after 20261104_thilawa.sql).
--
-- * hifz_profiles: what the student had memorised before (Quran positions in
--   half-line units, 1 page = 30, as JSON [start, end) ranges) and the goal
--   year. Set by the teacher.
-- * hifz_tasks: the work the teacher sets for a day — New Hifz, Short or Long
--   Muraja'ah over a [start_unit, end_unit) portion. The teacher can change
--   anything (including the day); the student can only tick it done.
-- * hifz_mistakes: words the teacher highlighted on the Mushaf. They stay
--   highlighted for the student until the teacher marks them corrected.
-- The student's self-made plan (hifz_settings / hifz_assignments) is kept
-- read-only: it seeds the starting point of students who already used it.
--
-- New or changed tasks send the student a phone notification, and the tables
-- are published to Realtime so the student's tracker updates straight away.

create table public.hifz_profiles (
  student_id uuid primary key references public.students(id) on delete cascade,
  memorized jsonb not null default '[]'::jsonb,
  goal_year int check (goal_year between 2000 and 2200),
  updated_by uuid references public.teachers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hifz_tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  task_date date not null,
  activity text not null check (activity in ('new', 'short', 'long')),
  start_unit int not null check (start_unit >= 0 and start_unit < 18120),
  end_unit int not null check (end_unit > start_unit and end_unit <= 18120),
  notes text check (char_length(notes) <= 1000),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index hifz_tasks_student_date on public.hifz_tasks (student_id, task_date);

create table public.hifz_mistakes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  task_id uuid references public.hifz_tasks(id) on delete set null,
  page int not null check (page between 1 and 604),
  verse_key text not null check (verse_key ~ '^\d{1,3}:\d{1,3}$'),
  word_position int not null check (word_position > 0),
  word_line int check (word_line between 1 and 15), -- Mushaf line, to match the word to a task's portion
  word_text text check (char_length(word_text) <= 100),
  note text check (char_length(note) <= 500),
  corrected_at timestamptz,
  created_at timestamptz not null default now()
);
create index hifz_mistakes_student on public.hifz_mistakes (student_id, page);
-- A word has at most one open mistake at a time.
create unique index hifz_mistakes_one_open on public.hifz_mistakes (student_id, verse_key, word_position) where corrected_at is null;

-- Students only tick or untick a task; the rest stays as the teacher set it.
create or replace function public.hifz_tasks_limit_edits()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_done timestamptz;
begin
  if auth.uid() is null or public.is_admin() or public.current_teacher_id() is not null then
    new.updated_at := now();
    return new;
  end if;
  v_done := new.completed_at;
  new := old;
  new.completed_at := v_done;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.hifz_tasks_limit_edits() from public, anon, authenticated;
create trigger hifz_tasks_limit_edits before update on public.hifz_tasks
  for each row execute function public.hifz_tasks_limit_edits();

alter table public.hifz_profiles enable row level security;
alter table public.hifz_tasks enable row level security;
alter table public.hifz_mistakes enable row level security;

-- Students: read their own; tick their own tasks.
create policy "Students read own hifz profile" on public.hifz_profiles
  for select using (student_id = public.current_student_id());
create policy "Students read own hifz tasks" on public.hifz_tasks
  for select using (student_id = public.current_student_id());
create policy "Students tick own hifz tasks" on public.hifz_tasks
  for update using (student_id = public.current_student_id()) with check (student_id = public.current_student_id());
create policy "Students read own hifz mistakes" on public.hifz_mistakes
  for select using (student_id = public.current_student_id());

-- Teachers: everything for their own students.
create policy "Teachers manage their students' hifz profiles" on public.hifz_profiles for all
  using (student_id in (select id from public.students where teacher_id = public.current_teacher_id()))
  with check (student_id in (select id from public.students where teacher_id = public.current_teacher_id()));
create policy "Teachers manage their students' hifz tasks" on public.hifz_tasks for all
  using (student_id in (select id from public.students where teacher_id = public.current_teacher_id()))
  with check (student_id in (select id from public.students where teacher_id = public.current_teacher_id()));
create policy "Teachers manage their students' hifz mistakes" on public.hifz_mistakes for all
  using (student_id in (select id from public.students where teacher_id = public.current_teacher_id()))
  with check (student_id in (select id from public.students where teacher_id = public.current_teacher_id()));

-- Admins: everything.
create policy "Admins manage hifz profiles" on public.hifz_profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage hifz tasks" on public.hifz_tasks for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage hifz mistakes" on public.hifz_mistakes for all using (public.is_admin()) with check (public.is_admin());

-- ---------- phone notification to the student ----------
-- One in-app notification (and so one push, via push_new_notifications) per
-- student per save, however many tasks were set at once.
create or replace function public.notify_hifz_tasks()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_note uuid;
  v_plural text;
begin
  -- Insert triggers have no old_rows, so each case has its own query (plpgsql
  -- only plans the branch that runs).
  if tg_op = 'INSERT' then
    for r in
      select t.student_id, s.user_id, s.name, count(*) as n, min(t.task_date) as first_day
      from new_rows t join students s on s.id = t.student_id
      where s.user_id is not null
      group by t.student_id, s.user_id, s.name
    loop
      v_plural := case when r.n = 1 then '' else 's' end;
      insert into notifications (title, body, audience, audience_label, send_in_app, created_by)
      values ('Hifz', format('Your teacher set %s Hifz task%s for %s. Open the Student Portal to see them.', r.n, v_plural, to_char(r.first_day, 'FMDD Mon')),
        'hifz_task', r.name, true, auth.uid())
      returning id into v_note;
      insert into notification_recipients (notification_id, student_id, user_id, name) values (v_note, r.student_id, r.user_id, r.name);
    end loop;
  else
    -- Only changes to the day, portion or notes; ticking a task done is silent.
    for r in
      select t.student_id, s.user_id, s.name, count(*) as n, min(t.task_date) as first_day
      from new_rows t
      join old_rows o on o.id = t.id
      join students s on s.id = t.student_id
      where s.user_id is not null
        and (o.task_date, o.start_unit, o.end_unit, coalesce(o.notes, '')) is distinct from (t.task_date, t.start_unit, t.end_unit, coalesce(t.notes, ''))
      group by t.student_id, s.user_id, s.name
    loop
      v_plural := case when r.n = 1 then '' else 's' end;
      insert into notifications (title, body, audience, audience_label, send_in_app, created_by)
      values ('Hifz', format('Your teacher changed your Hifz task%s for %s.', v_plural, to_char(r.first_day, 'FMDD Mon')),
        'hifz_task', r.name, true, auth.uid())
      returning id into v_note;
      insert into notification_recipients (notification_id, student_id, user_id, name) values (v_note, r.student_id, r.user_id, r.name);
    end loop;
  end if;
  return null;
exception when others then
  -- A notification must never stop the task from being saved.
  raise warning 'notify_hifz_tasks failed: %', sqlerrm;
  return null;
end $$;
revoke all on function public.notify_hifz_tasks() from public, anon, authenticated;

create trigger notify_hifz_tasks_insert after insert on public.hifz_tasks
  referencing new table as new_rows
  for each statement execute function public.notify_hifz_tasks();
create trigger notify_hifz_tasks_update after update on public.hifz_tasks
  referencing old table as old_rows new table as new_rows
  for each statement execute function public.notify_hifz_tasks();

-- ---------- live updates ----------
-- Realtime respects row-level security, so each student only hears about
-- their own rows. Full replica identity lets deletes reach a listener that
-- filters on student_id.
alter table public.hifz_tasks replica identity full;
alter table public.hifz_mistakes replica identity full;
alter table public.hifz_profiles replica identity full;
alter table public.thilawa_assignments replica identity full;
alter table public.thilawa_assessments replica identity full;
alter table public.thilawa_notes replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.hifz_tasks, public.hifz_mistakes, public.hifz_profiles,
    public.thilawa_assignments, public.thilawa_assessments, public.thilawa_notes;
exception when others then
  raise warning 'Realtime publication not changed: %', sqlerrm;
end $$;
