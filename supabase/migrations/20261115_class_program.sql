-- The admin can say whether a class is Hifz or Thilawa (runs after
-- 20261114_hifz_mistake_category.sql). Empty means automatic: a class named
-- for Hifz or Thilawa goes to that section, other classes follow each
-- student's own choice (students.programs). See src/thilawa/programRules.js.

alter table public.classes
  add column if not exists program text check (program in ('hifz', 'thilawa'));
