-- Two kinds of exam: Muraja'ah (revision) and New juz. The type decides how
-- the questions are generated (see src/exams/questions.js).

alter table public.exam_sessions
  add column exam_type text not null default 'muraja' check (exam_type in ('muraja', 'new_juz'));

-- Return type changes, so the function has to be recreated.
drop function public.my_exam_schedule();
create function public.my_exam_schedule()
returns table (
  id uuid, title text, exam_type text, exam_date date, start_time time, end_time time,
  teacher_name text, juz int[], status text, final_result text
) language sql stable security definer set search_path = public as $$
  select c.id, s.title, s.exam_type, s.exam_date, c.start_time, c.end_time, t.name, c.juz, c.status, c.final_result
    from public.exam_candidates c
    join public.exam_sessions s on s.id = c.session_id
    left join public.teachers t on t.id = c.teacher_id
   where c.student_id = public.current_student_id()
   order by s.exam_date desc, c.start_time;
$$;
revoke execute on function public.my_exam_schedule() from anon, public;
grant execute on function public.my_exam_schedule() to authenticated;
