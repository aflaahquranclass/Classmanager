-- Admin corrections to the wording of the downloadable Hifz exam report
-- (English and Dhivehi). Keys match REPORT_STRINGS in src/exams/reportStrings.js;
-- a phrase with no row here uses the default from the code.

create table public.report_translations (
  key text primary key,
  en text not null default '',
  dv text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.report_translations enable row level security;

-- Anyone signed in can download a report, so everyone signed in reads the wording.
create policy "Signed-in users read report wording" on public.report_translations
  for select to authenticated using (true);
create policy "Admins manage report wording" on public.report_translations
  for all using (public.is_admin()) with check (public.is_admin());
