-- Class registration on the public website (aflaahqc.com/#classes and
-- /register). The admin lists the class times on offer (Admin → Registrations
-- → Class times): one row per category (Tajweed/Tilawa, Hifz, Foundation),
-- age group (children under 14, teens and adults 15+), days and time, with the
-- registration fee and the monthly class fee. Visitors pick one, fill in their
-- details and attach the registration fee transfer slip. Applications wait as
-- 'pending' until the admin accepts or rejects them.
--
-- There are four forms: the main one (/register) for any class, and one per
-- class (/register/tajweed, /register/hifz, /register/foundation) for posters,
-- with the class already chosen. The admin opens and closes each one under
-- Admin → Registrations. Runs after 20261028_admin_alerts.sql (alert_admins).

create table public.class_offerings (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('tajweed', 'hifz', 'foundation')),
  age_group text not null check (age_group in ('children', 'adults')),
  days jsonb not null default '[]'::jsonb,
  start_time text not null check (start_time ~ '^\d{2}:\d{2}$'),
  end_time text not null check (end_time ~ '^\d{2}:\d{2}$'),
  registration_fee numeric not null default 100 check (registration_fee >= 0),
  monthly_fee numeric not null check (monthly_fee >= 0),
  note text check (char_length(note) <= 200),
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);
create index class_offerings_idx on public.class_offerings (category, age_group, start_time);

alter table public.class_offerings enable row level security;
create policy "Anyone can see open class times" on public.class_offerings for select
  to anon, authenticated using (is_open);
create policy "Admins manage class times" on public.class_offerings for all
  using (public.is_admin()) with check (public.is_admin());
grant select on public.class_offerings to anon, authenticated;

create table public.registration_forms (
  form text primary key check (form in ('all', 'tajweed', 'hifz', 'foundation')),
  is_open boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.registration_forms (form) values ('all'), ('tajweed'), ('hifz'), ('foundation');

alter table public.registration_forms enable row level security;
create policy "Anyone can see which forms are open" on public.registration_forms for select
  to anon, authenticated using (true);
create policy "Admins open and close forms" on public.registration_forms for all
  using (public.is_admin()) with check (public.is_admin());
grant select on public.registration_forms to anon, authenticated;

create table public.class_registrations (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid references public.class_offerings(id) on delete set null,
  -- The form it was sent from ('all' = the main form) and the class chosen.
  form text not null,
  category text not null,
  -- What was chosen, kept as text so it survives the class time being edited.
  class_label text not null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  nic text not null check (char_length(btrim(nic)) between 4 and 20),
  age smallint not null check (age between 3 and 100),
  atoll_island text not null check (char_length(btrim(atoll_island)) between 1 and 80),
  viber text not null check (char_length(btrim(viber)) between 5 and 20),
  slip_path text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  admin_note text check (char_length(admin_note) <= 500),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index class_registrations_status_idx on public.class_registrations (status, created_at desc);
create index class_registrations_category_idx on public.class_registrations (category, created_at desc);

alter table public.class_registrations enable row level security;
-- Visitors never read or write this table directly — only via submit_registration.
create policy "Admins manage registrations" on public.class_registrations for all
  using (public.is_admin()) with check (public.is_admin());

-- Registration fee slips, private. Visitors can only add files under new/,
-- never list or read them back.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('registration-slips', 'registration-slips', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

create policy "Anyone uploads a registration slip" on storage.objects for insert
  to anon, authenticated with check (bucket_id = 'registration-slips' and (storage.foldername(name))[1] = 'new');
create policy "Admins view registration slips" on storage.objects for select
  to authenticated using (bucket_id = 'registration-slips' and public.is_admin());
create policy "Admins delete registration slips" on storage.objects for delete
  to authenticated using (bucket_id = 'registration-slips' and public.is_admin());

create or replace function public.submit_registration(
  p_form text, p_offering_id uuid, p_name text, p_nic text, p_age smallint,
  p_atoll_island text, p_viber text, p_slip_path text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  o class_offerings;
begin
  if not exists (select 1 from registration_forms where form = p_form and is_open) then
    raise exception 'registration form is closed' using errcode = 'P0001';
  end if;
  select * into o from class_offerings where id = p_offering_id and is_open and (p_form = 'all' or category = p_form);
  if not found then
    raise exception 'class is not open for registration' using errcode = 'P0001';
  end if;
  if p_slip_path !~ '^new/[A-Za-z0-9._-]+$' or not exists (select 1 from storage.objects where bucket_id = 'registration-slips' and name = p_slip_path) then
    raise exception 'payment slip is missing' using errcode = 'P0001';
  end if;
  insert into class_registrations (offering_id, form, category, class_label, name, nic, age, atoll_island, viber, slip_path)
  values (
    o.id, p_form, o.category,
    initcap(case o.category when 'tajweed' then 'Tajweed (Tilawa)' else o.category end)
      || ' · ' || case o.age_group when 'children' then 'Children (under 14)' else 'Teens & adults (15+)' end
      || ' · ' || (select string_agg(d, ', ') from jsonb_array_elements_text(o.days) d)
      || ' ' || o.start_time || '–' || o.end_time,
    btrim(p_name), upper(btrim(p_nic)), p_age, btrim(p_atoll_island), btrim(p_viber), p_slip_path
  );
end;
$$;
grant execute on function public.submit_registration(text, uuid, text, text, smallint, text, text, text) to anon, authenticated;

create or replace function public.alert_admins_new_registration()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform alert_admins(
    'New class registration',
    new.name || ' (age ' || new.age || ', ' || new.atoll_island || ') registered for ' || new.class_label || '. Check it under Registrations.',
    'Registration — ' || new.name
  );
  return null;
end;
$$;
revoke all on function public.alert_admins_new_registration() from public, anon, authenticated;

drop trigger if exists alert_admins_new_registration on public.class_registrations;
create trigger alert_admins_new_registration after insert on public.class_registrations
  for each row execute function public.alert_admins_new_registration();
