-- Hifz: the student finishes, the teacher approves (runs after
-- 20261109_thilawa_listen.sql).
--
-- * hifz_tasks.student_done_at: the student says they've finished the task.
--   It no longer completes the task: completed_at is now set only by the
--   teacher, after listening (that's when the next task is set). Until then
--   the student keeps the same task.
-- * The teacher is notified when a student finishes a task.

alter table public.hifz_tasks add column if not exists student_done_at timestamptz;

-- Students only tick or untick "finished"; the rest (including completed_at,
-- the teacher's approval) stays as the teacher set it.
create or replace function public.hifz_tasks_limit_edits()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_done timestamptz;
begin
  if auth.uid() is null or public.is_admin() or public.current_teacher_id() is not null then
    new.updated_at := now();
    return new;
  end if;
  v_done := new.student_done_at;
  new := old;
  new.student_done_at := v_done;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.notify_hifz_student_done()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_note uuid;
begin
  for r in
    select s.name as student, t.id as teacher_id, t.user_id, t.name as teacher,
      string_agg(case n.activity when 'new' then 'New Hifz' when 'short' then 'Short Muraja''ah' else 'Long Muraja''ah' end, ', '
        order by case n.activity when 'new' then 1 when 'short' then 2 else 3 end) as what
    from new_rows n
    join old_rows o on o.id = n.id
    join students s on s.id = n.student_id
    join teachers t on t.id = s.teacher_id
    where o.student_done_at is null and n.student_done_at is not null and n.completed_at is null
      and t.user_id is not null and t.user_id is distinct from auth.uid()
    group by s.id, s.name, t.id, t.user_id, t.name
  loop
    insert into notifications (title, body, audience, audience_label, send_in_app, created_by)
    values ('Hifz', format('%s finished %s. Open Hifz to listen and approve.', r.student, r.what),
      'hifz_task', r.teacher, true, auth.uid())
    returning id into v_note;
    insert into notification_recipients (notification_id, teacher_id, user_id, name) values (v_note, r.teacher_id, r.user_id, r.teacher);
  end loop;
  return null;
exception when others then
  -- A notification must never stop the tick from being saved.
  raise warning 'notify_hifz_student_done failed: %', sqlerrm;
  return null;
end $$;
revoke all on function public.notify_hifz_student_done() from public, anon, authenticated;
create trigger notify_hifz_student_done after update on public.hifz_tasks
  referencing old table as old_rows new table as new_rows
  for each statement execute function public.notify_hifz_student_done();
