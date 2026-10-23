-- Exam scheduling: the admin creates an exam, adds the students who are ready,
-- and gives each one an examiner (teacher), a time slot, the juz to test and
-- auto-generated questions. The examiner marks it through the existing
-- hifz_exams report, which is linked back here.

create table public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  exam_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.exam_candidates (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.exam_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  -- Copied in so the examiner (who may not be the student's own teacher, and
  -- so can't read the students row) still sees who they're examining.
  student_name text not null,
  teacher_id uuid references public.teachers(id) on delete set null,
  start_time time not null,
  end_time time,
  juz int[] not null check (cardinality(juz) > 0 and 1 <= all(juz) and 30 >= all(juz)),
  question_count int not null check (question_count between 1 and 30),
  questions jsonb not null default '[]'::jsonb,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'absent')),
  final_result text check (final_result in ('pass', 'not_passed')),
  report_id uuid references public.hifz_exams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id),
  check (end_time is null or end_time > start_time)
);
create index exam_candidates_teacher on public.exam_candidates (teacher_id);
create index exam_candidates_student on public.exam_candidates (student_id);

alter table public.exam_sessions enable row level security;
alter table public.exam_candidates enable row level security;

create policy "Admins manage exam sessions" on public.exam_sessions
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage exam candidates" on public.exam_candidates
  for all using (public.is_admin()) with check (public.is_admin());

-- Examiners read the exams they're assigned to. They change them only through
-- complete_exam_candidate() below, never directly.
create policy "Teachers view their assigned exam candidates" on public.exam_candidates
  for select using (teacher_id = public.current_teacher_id());
create policy "Teachers view sessions they examine in" on public.exam_sessions
  for select using (exists (select 1 from public.exam_candidates c where c.session_id = exam_sessions.id and c.teacher_id = public.current_teacher_id()));

-- Called by the examiner after saving the hifz_exams report: marks the
-- candidate completed with that report's result.
create or replace function public.complete_exam_candidate(p_candidate uuid, p_report uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := public.current_teacher_id();
  result text;
begin
  if me is null then raise exception 'Only teachers can complete exams'; end if;
  select final_result into result from public.hifz_exams where id = p_report and teacher_id = me;
  if not found then raise exception 'That exam report was not found'; end if;
  update public.exam_candidates
     set status = 'completed', final_result = result, report_id = p_report, updated_at = now()
   where id = p_candidate and teacher_id = me;
  if not found then raise exception 'That exam is not assigned to you'; end if;
end $$;

-- What a student may see about their own exams: when, with whom, which juz
-- and the result. Never the questions.
create or replace function public.my_exam_schedule()
returns table (
  id uuid, title text, exam_date date, start_time time, end_time time,
  teacher_name text, juz int[], status text, final_result text
) language sql stable security definer set search_path = public as $$
  select c.id, s.title, s.exam_date, c.start_time, c.end_time, t.name, c.juz, c.status, c.final_result
    from public.exam_candidates c
    join public.exam_sessions s on s.id = c.session_id
    left join public.teachers t on t.id = c.teacher_id
   where c.student_id = public.current_student_id()
   order by s.exam_date desc, c.start_time;
$$;

revoke execute on function public.complete_exam_candidate(uuid, uuid) from anon, public;
revoke execute on function public.my_exam_schedule() from anon, public;
grant execute on function public.complete_exam_candidate(uuid, uuid) to authenticated;
grant execute on function public.my_exam_schedule() to authenticated;
