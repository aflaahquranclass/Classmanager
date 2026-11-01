-- Hifz: the teacher can say what kind of mistake a highlighted word is, the
-- same as Thilawa (20261113_thilawa_mistake_category.sql). Optional: empty
-- means a plain mistake. The ids match MISTAKE_CATEGORIES in
-- src/thilawa/engine.js. Students still can't change it
-- (hifz_mistakes_limit_edits keeps everything but their tick).

alter table public.hifz_mistakes
  add column if not exists category text
    check (category in ('lahn_jali', 'sukun', 'noon_sakinah', 'shafawi', 'madd', 'leen', 'raa', 'itmam_harakah'));
