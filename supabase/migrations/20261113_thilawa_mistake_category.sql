-- Thilawa: the teacher can say what kind of mistake a marked word is
-- (runs after 20261109_thilawa_listen.sql). Empty until the teacher picks one.
-- The ids match MISTAKE_CATEGORIES in src/thilawa/engine.js. Students still
-- can't change it (thilawa_mistakes_limit_edits keeps everything but their tick).

alter table public.thilawa_mistakes
  add column if not exists category text
    check (category in ('lahn_jali', 'sukun', 'noon_sakinah', 'shafawi', 'madd', 'leen', 'raa', 'itmam_harakah'));
