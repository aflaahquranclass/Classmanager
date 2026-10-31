-- Saved messages for Notifications → Send: each one has an English and a
-- Dhivehi version, so the admin picks the language when sending. {name},
-- {fee}, … are filled in per student (src/notifications/templates.js).
-- The automatic messages (welcome, payment reminder, …) stay in
-- sms_templates under their fixed keys.

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  body_en text not null default '',
  body_dv text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.message_templates enable row level security;
create policy "Admins manage message templates" on public.message_templates
  for all using (public.is_admin()) with check (public.is_admin());

-- Templates saved earlier as sms_templates "custom:<name>" move here, into
-- the English or Dhivehi slot by their script.
insert into public.message_templates (name, body_en, body_dv)
select substr(key, 8),
       case when body ~ '[ހ-ޱ]' then '' else body end,
       case when body ~ '[ހ-ޱ]' then body else '' end
from public.sms_templates where key like 'custom:%';
delete from public.sms_templates where key like 'custom:%';
