-- The motivational quote on the student portal dashboard, set by the admin
-- (Admin → Motivation): one for the Hifz dashboard and one for Thilawa, each
-- with its own language, font and size. No row means the default in
-- src/MotivationAdmin.jsx.

create table public.student_motivation (
  program text primary key check (program in ('hifz', 'thilawa')),
  body text not null,
  lang text not null default 'en' check (lang in ('en', 'dv', 'ar')),
  font text not null,
  size int not null default 48 check (size between 20 and 72),
  updated_at timestamptz not null default now()
);

alter table public.student_motivation enable row level security;

create policy "Signed-in users read the motivation" on public.student_motivation
  for select to authenticated using (true);
create policy "Admins manage the motivation" on public.student_motivation
  for all using (public.is_admin()) with check (public.is_admin());
