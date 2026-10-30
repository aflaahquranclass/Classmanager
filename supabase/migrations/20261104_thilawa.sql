-- Thilawa (reading the Quran by looking) in the student portal.
--
-- * students.programs: which portal sections a student gets — Hifz, Thilawa
--   or both. The admin picks it when enrolling; existing students stay Hifz.
-- * thilawa_settings: the student's own khatam goal (finish reading the whole
--   Quran by a date).
-- * thilawa_reading: every page range the student reads, from the teacher's
--   set reading or free reading. Khatam progress and streaks come from it.
-- * thilawa_assignments: reading the teacher sets; the student ticks it done.
-- * thilawa_assessments: the teacher's Tajweed and fluency levels (0–100),
--   kept as a history so progress over time can be shown.
-- * thilawa_notes: the teacher's notes, shown to the student unless kept private.
-- Pages are Madinah Mushaf pages 1–604.

alter table public.students add column if not exists programs text[] not null default '{hifz}';
alter table public.students add constraint students_programs_valid
  check (cardinality(programs) > 0 and programs <@ array['hifz', 'thilawa']::text[]);

create table public.thilawa_settings (
  student_id uuid primary key references public.students(id) on delete cascade,
  timezone text not null,
  goal_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.thilawa_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  from_page int not null check (from_page between 1 and 604),
  to_page int not null check (to_page between 1 and 604),
  instructions text check (char_length(instructions) <= 1000),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (to_page >= from_page)
);
create index thilawa_assignments_student on public.thilawa_assignments (student_id, created_at);

create table public.thilawa_reading (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  read_on date not null,
  from_page int not null check (from_page between 1 and 604),
  to_page int not null check (to_page between 1 and 604),
  assignment_id uuid references public.thilawa_assignments(id) on delete set null,
  created_at timestamptz not null default now(),
  check (to_page >= from_page)
);
create index thilawa_reading_student on public.thilawa_reading (student_id, created_at);

create table public.thilawa_assessments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  tajweed int not null check (tajweed between 0 and 100),
  fluency int not null check (fluency between 0 and 100),
  comment text check (char_length(comment) <= 1000),
  assessed_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index thilawa_assessments_student on public.thilawa_assessments (student_id, created_at);

create table public.thilawa_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  visible_to_student boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index thilawa_notes_student on public.thilawa_notes (student_id, created_at);

-- A student may only tick or untick their set reading; everything else on the
-- row (pages, instructions, due date, who it belongs to) stays as the teacher
-- wrote it. Staff and the service role are left alone (RLS limits teachers).
create or replace function public.thilawa_assignments_limit_edits()
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
revoke all on function public.thilawa_assignments_limit_edits() from public, anon, authenticated;
create trigger thilawa_assignments_limit_edits before update on public.thilawa_assignments
  for each row execute function public.thilawa_assignments_limit_edits();

alter table public.thilawa_settings enable row level security;
alter table public.thilawa_assignments enable row level security;
alter table public.thilawa_reading enable row level security;
alter table public.thilawa_assessments enable row level security;
alter table public.thilawa_notes enable row level security;

-- ---------- students: their own rows ----------
create policy "Students read own thilawa settings" on public.thilawa_settings
  for select using (student_id = public.current_student_id());
create policy "Students create own thilawa settings" on public.thilawa_settings
  for insert with check (student_id = public.current_student_id());
create policy "Students update own thilawa settings" on public.thilawa_settings
  for update using (student_id = public.current_student_id()) with check (student_id = public.current_student_id());

create policy "Students read own thilawa reading" on public.thilawa_reading
  for select using (student_id = public.current_student_id());
create policy "Students log own thilawa reading" on public.thilawa_reading
  for insert with check (
    student_id = public.current_student_id()
    and (assignment_id is null or assignment_id in (select a.id from public.thilawa_assignments a where a.student_id = public.current_student_id()))
  );
-- Undo a mistaken tick, but history older than a day can't be rewritten.
create policy "Students undo recent thilawa reading" on public.thilawa_reading
  for delete using (student_id = public.current_student_id() and created_at > now() - interval '1 day');

create policy "Students read own thilawa assignments" on public.thilawa_assignments
  for select using (student_id = public.current_student_id());
create policy "Students tick own thilawa assignments" on public.thilawa_assignments
  for update using (student_id = public.current_student_id()) with check (student_id = public.current_student_id());

create policy "Students read own thilawa assessments" on public.thilawa_assessments
  for select using (student_id = public.current_student_id());

create policy "Students read notes shared with them" on public.thilawa_notes
  for select using (student_id = public.current_student_id() and visible_to_student);

-- ---------- teachers: their own students ----------
create policy "Teachers view their students' thilawa settings" on public.thilawa_settings for select
  using (student_id in (select id from public.students where teacher_id = public.current_teacher_id()));
create policy "Teachers view their students' thilawa reading" on public.thilawa_reading for select
  using (student_id in (select id from public.students where teacher_id = public.current_teacher_id()));

create policy "Teachers view their students' thilawa assignments" on public.thilawa_assignments for select
  using (student_id in (select id from public.students where teacher_id = public.current_teacher_id()));
create policy "Teachers set reading for their students" on public.thilawa_assignments for insert
  with check (teacher_id = public.current_teacher_id() and student_id in (select id from public.students where teacher_id = public.current_teacher_id()));
create policy "Teachers change their students' reading" on public.thilawa_assignments for update
  using (student_id in (select id from public.students where teacher_id = public.current_teacher_id()))
  with check (student_id in (select id from public.students where teacher_id = public.current_teacher_id()));
create policy "Teachers remove their students' reading" on public.thilawa_assignments for delete
  using (student_id in (select id from public.students where teacher_id = public.current_teacher_id()));

create policy "Teachers view their students' thilawa levels" on public.thilawa_assessments for select
  using (student_id in (select id from public.students where teacher_id = public.current_teacher_id()));
create policy "Teachers assess their students" on public.thilawa_assessments for insert
  with check (teacher_id = public.current_teacher_id() and student_id in (select id from public.students where teacher_id = public.current_teacher_id()));
create policy "Teachers remove their own assessments" on public.thilawa_assessments for delete
  using (teacher_id = public.current_teacher_id());

create policy "Teachers view their students' thilawa notes" on public.thilawa_notes for select
  using (student_id in (select id from public.students where teacher_id = public.current_teacher_id()));
create policy "Teachers write notes for their students" on public.thilawa_notes for insert
  with check (teacher_id = public.current_teacher_id() and student_id in (select id from public.students where teacher_id = public.current_teacher_id()));
create policy "Teachers edit their own notes" on public.thilawa_notes for update
  using (teacher_id = public.current_teacher_id()) with check (teacher_id = public.current_teacher_id());
create policy "Teachers remove their own notes" on public.thilawa_notes for delete
  using (teacher_id = public.current_teacher_id());

-- ---------- admins: everything ----------
create policy "Admins manage thilawa settings" on public.thilawa_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage thilawa assignments" on public.thilawa_assignments for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage thilawa reading" on public.thilawa_reading for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage thilawa assessments" on public.thilawa_assessments for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage thilawa notes" on public.thilawa_notes for all using (public.is_admin()) with check (public.is_admin());
