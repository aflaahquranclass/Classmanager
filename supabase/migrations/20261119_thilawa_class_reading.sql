-- Thilawa by class (runs after 20261116_thilawa_letters.sql).
--
-- * thilawa_class_readings: the part the teacher opens for the whole class.
--   It stays open for every student of the class, day after day, until the
--   teacher changes it (then ended_at is set and a new one starts). page is
--   where the class stopped, so the next lesson carries on from there.
--   first_ayah / last_ayah are ayah numbers 1–6236 (for colouring the ayah
--   markers of the part in the Mushaf).
-- * thilawa_class_topics: the Tajweed topics the teacher has taken with the
--   class; every student of the class sees them.
-- Students read their own class's rows; the class's teacher (or the teacher of
-- any student in it) writes them; admins manage everything.

create table public.thilawa_class_readings (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  from_page int not null check (from_page between 1 and 604),
  to_page int not null check (to_page between 1 and 604),
  first_ayah int check (first_ayah between 1 and 6236),
  last_ayah int check (last_ayah between 1 and 6236),
  label text check (char_length(label) <= 200),
  page int not null check (page between 1 and 604),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (to_page >= from_page),
  check (last_ayah is null or first_ayah is null or last_ayah >= first_ayah)
);
create index thilawa_class_readings_class on public.thilawa_class_readings (class_id, created_at);
create unique index thilawa_class_readings_one_open on public.thilawa_class_readings (class_id) where ended_at is null;

create table public.thilawa_class_topics (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  topic text not null check (char_length(btrim(topic)) between 1 and 200),
  note text check (char_length(note) <= 1000),
  taught_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index thilawa_class_topics_class on public.thilawa_class_topics (class_id, taught_on);

create or replace function public.current_student_class_id()
returns uuid language sql stable security definer set search_path = public as $$
  select class_id from public.students where user_id = auth.uid();
$$;
revoke all on function public.current_student_class_id() from public, anon;
grant execute on function public.current_student_class_id() to authenticated;

create or replace function public.teaches_class(p_class uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_teacher_id() is not null and (
    exists (select 1 from public.classes c where c.id = p_class and c.teacher_id = public.current_teacher_id())
    or exists (select 1 from public.students s where s.class_id = p_class and s.teacher_id = public.current_teacher_id()));
$$;
revoke all on function public.teaches_class(uuid) from public, anon;
grant execute on function public.teaches_class(uuid) to authenticated;

alter table public.thilawa_class_readings enable row level security;
alter table public.thilawa_class_topics enable row level security;

create policy "Students read their class reading" on public.thilawa_class_readings
  for select using (class_id = public.current_student_class_id());
create policy "Teachers read their class readings" on public.thilawa_class_readings
  for select using (public.teaches_class(class_id));
create policy "Teachers open class readings" on public.thilawa_class_readings
  for insert with check (public.teaches_class(class_id) and teacher_id = public.current_teacher_id());
create policy "Teachers change class readings" on public.thilawa_class_readings
  for update using (public.teaches_class(class_id)) with check (public.teaches_class(class_id));
create policy "Teachers remove class readings" on public.thilawa_class_readings
  for delete using (public.teaches_class(class_id));
create policy "Admins manage class readings" on public.thilawa_class_readings
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Students read their class topics" on public.thilawa_class_topics
  for select using (class_id = public.current_student_class_id());
create policy "Teachers read their class topics" on public.thilawa_class_topics
  for select using (public.teaches_class(class_id));
create policy "Teachers add class topics" on public.thilawa_class_topics
  for insert with check (public.teaches_class(class_id) and teacher_id = public.current_teacher_id());
create policy "Teachers change class topics" on public.thilawa_class_topics
  for update using (public.teaches_class(class_id)) with check (public.teaches_class(class_id));
create policy "Teachers remove class topics" on public.thilawa_class_topics
  for delete using (public.teaches_class(class_id));
create policy "Admins manage class topics" on public.thilawa_class_topics
  for all using (public.is_admin()) with check (public.is_admin());

-- Live updates: students see the teacher turn the page and change the part.
alter table public.thilawa_class_readings replica identity full;
alter table public.thilawa_class_topics replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.thilawa_class_readings;
  alter publication supabase_realtime add table public.thilawa_class_topics;
exception when others then
  raise warning 'Realtime publication not changed: %', sqlerrm;
end $$;
