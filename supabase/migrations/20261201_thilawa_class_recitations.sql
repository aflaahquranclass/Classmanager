-- Thilawa by class: what the class recites each day (runs after
-- 20261119_thilawa_class_reading.sql).
--
-- * thilawa_class_recitations: from ayah to ayah, what the class recites.
--   kind 'done': recited on recited_on (one per class per day; marking the
--   day again replaces it). Every day's entry stays as the class's history.
--   kind 'next': the next recitation, marked ahead (one per class, no day);
--   on the day the teacher starts it, it becomes that day's 'done' entry.
--   first_ayah / last_ayah are ayah numbers 1–6236 (as in
--   thilawa_class_readings), so a part can run into the next surah;
--   from_page / to_page are the pages they're on; label e.g. "Al-Mulk 16–20".
--   The teacher marks them on the Mushaf (tapping ayah numbers) or with a form.
-- Students read their own class's rows; the class's teacher (or the teacher of
-- any student in it) writes them; admins manage everything.

create table public.thilawa_class_recitations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  kind text not null default 'done' check (kind in ('done', 'next')),
  recited_on date,
  first_ayah int not null check (first_ayah between 1 and 6236),
  last_ayah int not null check (last_ayah between 1 and 6236 and last_ayah >= first_ayah),
  from_page int not null check (from_page between 1 and 604),
  to_page int not null check (to_page between 1 and 604 and to_page >= from_page),
  label text check (char_length(label) <= 200),
  created_at timestamptz not null default now(),
  check ((kind = 'done') = (recited_on is not null))
);
create index thilawa_class_recitations_class on public.thilawa_class_recitations (class_id, recited_on);
create unique index thilawa_class_recitations_one_a_day on public.thilawa_class_recitations (class_id, recited_on) where kind = 'done';
create unique index thilawa_class_recitations_one_next on public.thilawa_class_recitations (class_id) where kind = 'next';

alter table public.thilawa_class_recitations enable row level security;

create policy "Students read their class recitations" on public.thilawa_class_recitations
  for select using (class_id = public.current_student_class_id());
create policy "Teachers read their class recitations" on public.thilawa_class_recitations
  for select using (public.teaches_class(class_id));
create policy "Teachers add class recitations" on public.thilawa_class_recitations
  for insert with check (public.teaches_class(class_id) and teacher_id = public.current_teacher_id());
create policy "Teachers change class recitations" on public.thilawa_class_recitations
  for update using (public.teaches_class(class_id)) with check (public.teaches_class(class_id));
create policy "Teachers remove class recitations" on public.thilawa_class_recitations
  for delete using (public.teaches_class(class_id));
create policy "Admins manage class recitations" on public.thilawa_class_recitations
  for all using (public.is_admin()) with check (public.is_admin());

-- Live updates: students see today's ayahs as soon as the teacher marks them.
alter table public.thilawa_class_recitations replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.thilawa_class_recitations;
exception when others then
  raise warning 'Realtime publication not changed: %', sqlerrm;
end $$;
