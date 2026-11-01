-- Thilawa: the Arabic letters a student needs to work on, which the teacher
-- picks from the letters table in Listen & mark (runs after
-- 20261109_thilawa_listen.sql). Kept with that reading or lesson and shown to
-- the student. The letters match ARABIC_LETTERS in src/thilawa/engine.js.
-- Students still can't change it (thilawa_assignments_limit_edits keeps
-- everything but their tick).

alter table public.thilawa_assignments
  add column if not exists letters text[] not null default '{}'
    check (letters <@ array['ء', 'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي']::text[]);
