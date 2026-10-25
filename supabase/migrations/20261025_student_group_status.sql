-- Tracks whether each student has been added to the class's student group
-- (toggled from the Classes page). New students start as "not added".

alter table public.students
  add column in_group boolean not null default false;

-- Everyone already enrolled is in the group, except the 5 students added on
-- the morning of 25 Oct 2026 (Maldives time), who still need adding.
update public.students
  set in_group = true
  where created_at < '2026-10-25 00:00:00+05';
