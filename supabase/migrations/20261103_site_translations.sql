-- Dhivehi version of the public website, and translation checking.
--
-- site_translations: the admin's corrections to the website's Dhivehi text
-- (Admin → Language → Website). The defaults live in src/landing/siteStrings.js;
-- a non-empty dv here wins over the default.
--
-- verified_dv (both tables): the exact Dhivehi text the admin checked and
-- marked as correct. A phrase counts as verified only while its current
-- Dhivehi still equals verified_dv, so any later change to the wording (by
-- the admin or in the code's defaults) puts it back in the "To check" list.

create table public.site_translations (
  key text primary key,
  dv text not null default '',
  verified_dv text,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.site_translations enable row level security;

-- The website is public, so visitors who aren't signed in read the wording too.
create policy "Anyone reads website wording" on public.site_translations
  for select to anon, authenticated using (true);
create policy "Admins manage website wording" on public.site_translations
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.report_translations
  add column verified_dv text,
  add column verified_at timestamptz;
