-- Hifz: portions marked on the Mushaf by ayah (runs after
-- 20261110_hifz_student_done.sql).
--
-- The teacher taps the ayah numbers where the next class's New Hifz or Short
-- Muraja'ah starts and ends. start_ayah / end_ayah keep those ayahs (numbered
-- 1–6236 straight through the Quran, both included), so the Mushaf can colour
-- exactly those ayah numbers; start_unit / end_unit are still set from them,
-- for pages, progress and the plan. Null for a portion set by page and line.
-- Students still can't change them (hifz_tasks_limit_edits keeps the row as
-- the teacher set it, apart from student_done_at).

alter table public.hifz_tasks
  add column if not exists start_ayah int check (start_ayah between 1 and 6236),
  add column if not exists end_ayah int check (end_ayah between 1 and 6236);

alter table public.hifz_tasks drop constraint if exists hifz_tasks_ayahs_check;
alter table public.hifz_tasks add constraint hifz_tasks_ayahs_check
  check ((start_ayah is null) = (end_ayah is null) and (end_ayah is null or end_ayah >= start_ayah));
