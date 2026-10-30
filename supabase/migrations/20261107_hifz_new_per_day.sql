-- How much New Hifz a day, part of the teacher's Hifz plan (runs after
-- 20261106_hifz_plan_settings.sql). Tasks are now generated from the plan for
-- the student's class days, so the plan holds every amount. In half-line
-- units: 30 = one page, 10 = five lines.
alter table public.hifz_profiles
  add column if not exists new_units int not null default 30 check (new_units between 2 and 600);
