-- Thilawa: the teacher listens and marks mistakes (runs after
-- 20261108_hifz_mistake_student_tick.sql).
--
-- * thilawa_assignments.kind: 'reading' is reading the teacher set for the
--   student to do and tick; 'lesson' is a lesson the teacher held today,
--   opened straight in the Mushaf (it is done when it is made).
-- * thilawa_assignments.checked_at: when the teacher finished listening.
-- * thilawa_mistakes: words the teacher marked in a reading or lesson. The
--   student sees them, and ticks off each one they have fixed; the teacher
--   clears a mark (corrected_at) once the student reads it right.
-- * The teacher is notified when a student finishes a reading, and the
--   student when the teacher has listened (with how many corrections).

alter table public.thilawa_assignments
  add column if not exists kind text not null default 'reading' check (kind in ('reading', 'lesson')),
  add column if not exists checked_at timestamptz;

create table public.thilawa_mistakes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  assignment_id uuid references public.thilawa_assignments(id) on delete cascade,
  page int not null check (page between 1 and 604),
  verse_key text not null,
  word_position int not null,
  word_line int,
  word_text text,
  note text check (char_length(note) <= 500),
  corrected_at timestamptz,
  student_ticked_at timestamptz,
  created_at timestamptz not null default now()
);
create index thilawa_mistakes_student on public.thilawa_mistakes (student_id, created_at);
create unique index thilawa_mistakes_one_open on public.thilawa_mistakes (assignment_id, verse_key, word_position) where corrected_at is null;

-- Students only tick or untick a mistake; the rest stays as the teacher set it.
create or replace function public.thilawa_mistakes_limit_edits()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ticked timestamptz;
begin
  if auth.uid() is null or public.is_admin() or public.current_teacher_id() is not null then
    return new;
  end if;
  v_ticked := new.student_ticked_at;
  new := old;
  new.student_ticked_at := v_ticked;
  return new;
end $$;
revoke all on function public.thilawa_mistakes_limit_edits() from public, anon, authenticated;
create trigger thilawa_mistakes_limit_edits before update on public.thilawa_mistakes
  for each row execute function public.thilawa_mistakes_limit_edits();

alter table public.thilawa_mistakes enable row level security;
create policy "Students read own thilawa mistakes" on public.thilawa_mistakes
  for select using (student_id = public.current_student_id());
create policy "Students tick own thilawa mistakes" on public.thilawa_mistakes
  for update using (student_id = public.current_student_id()) with check (student_id = public.current_student_id());
create policy "Teachers manage their students' thilawa mistakes" on public.thilawa_mistakes for all
  using (student_id in (select id from public.students where teacher_id = public.current_teacher_id()))
  with check (student_id in (select id from public.students where teacher_id = public.current_teacher_id()));
create policy "Admins manage thilawa mistakes" on public.thilawa_mistakes for all using (public.is_admin()) with check (public.is_admin());

-- ---------- notifications ----------
create or replace function public.notify_thilawa_progress()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_note uuid;
begin
  -- A student finished a reading: tell their teacher.
  for r in
    select n.id, n.from_page, n.to_page, s.name as student, t.id as teacher_id, t.user_id, t.name as teacher
    from new_rows n
    join old_rows o on o.id = n.id
    join students s on s.id = n.student_id
    join teachers t on t.id = s.teacher_id
    where n.kind = 'reading' and o.completed_at is null and n.completed_at is not null
      and t.user_id is not null and t.user_id is distinct from auth.uid()
  loop
    insert into notifications (title, body, audience, audience_label, send_in_app, created_by)
    values ('Thilawa', format('%s finished reading %s. Open Thilawa to listen and mark.', r.student,
        case when r.from_page = r.to_page then format('page %s', r.from_page) else format('pages %s–%s', r.from_page, r.to_page) end),
      'thilawa', r.teacher, true, auth.uid())
    returning id into v_note;
    insert into notification_recipients (notification_id, teacher_id, user_id, name) values (v_note, r.teacher_id, r.user_id, r.teacher);
  end loop;

  -- The teacher finished listening: tell the student.
  for r in
    select n.id, n.kind, n.from_page, n.to_page, n.student_id, s.user_id, s.name,
      (select count(*) from thilawa_mistakes m where m.assignment_id = n.id and m.corrected_at is null) as marks
    from new_rows n
    join old_rows o on o.id = n.id
    join students s on s.id = n.student_id
    where o.checked_at is null and n.checked_at is not null and s.user_id is not null
  loop
    insert into notifications (title, body, audience, audience_label, send_in_app, created_by)
    values ('Thilawa', format('Your teacher listened to your %s (%s): %s. Open the Student Portal to see it.',
        case when r.kind = 'lesson' then 'lesson' else 'reading' end,
        case when r.from_page = r.to_page then format('page %s', r.from_page) else format('pages %s–%s', r.from_page, r.to_page) end,
        case when r.marks = 0 then 'no corrections, MashaAllah' when r.marks = 1 then '1 word to correct' else format('%s words to correct', r.marks) end),
      'thilawa', r.name, true, auth.uid())
    returning id into v_note;
    insert into notification_recipients (notification_id, student_id, user_id, name) values (v_note, r.student_id, r.user_id, r.name);
  end loop;
  return null;
exception when others then
  -- A notification must never stop the reading from being saved.
  raise warning 'notify_thilawa_progress failed: %', sqlerrm;
  return null;
end $$;
revoke all on function public.notify_thilawa_progress() from public, anon, authenticated;
create trigger notify_thilawa_progress after update on public.thilawa_assignments
  referencing old table as old_rows new table as new_rows
  for each statement execute function public.notify_thilawa_progress();

-- ---------- live updates ----------
alter table public.thilawa_mistakes replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.thilawa_mistakes;
exception when others then
  raise warning 'Realtime publication not changed: %', sqlerrm;
end $$;
