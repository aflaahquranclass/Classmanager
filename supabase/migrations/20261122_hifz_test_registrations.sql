-- Hifz test registration form on the public website (aflaahqc.com/hifz-test).
-- A student (or parent) sends: the student's full name as on the ID card,
-- age, current address, Viber number, the book they want to be tested on and
-- the name of the teacher (dhars) who teaches them. No fee, no slip.
-- Registrations wait as 'pending' until the admin accepts or rejects them
-- (Admin → Registrations → Hifz test), and the admin can close the form.
--
-- Visitors never read or write the tables directly — only through
-- hifz_test_form_open and submit_hifz_test_registration, which checks every
-- field. Runs after 20261028_admin_alerts.sql (alert_admins).

create table public.hifz_test_settings (
  id smallint primary key default 1 check (id = 1),
  is_open boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.hifz_test_settings default values;
alter table public.hifz_test_settings enable row level security;
create policy "Admins manage the hifz test form" on public.hifz_test_settings for all
  using (public.is_admin()) with check (public.is_admin());

create table public.hifz_test_registrations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  age smallint not null check (age between 3 and 99),
  address text not null check (char_length(address) between 2 and 120),
  viber text not null check (viber ~ '^[+0-9 -]{7,20}$'),
  book text not null check (char_length(book) between 1 and 80),
  teacher_name text not null check (char_length(teacher_name) between 2 and 80),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index hifz_test_registrations_idx on public.hifz_test_registrations (status, created_at desc);
alter table public.hifz_test_registrations enable row level security;
create policy "Admins manage hifz test registrations" on public.hifz_test_registrations for all
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.hifz_test_form_open()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_open from hifz_test_settings where id = 1), false);
$$;
grant execute on function public.hifz_test_form_open() to anon, authenticated;

create or replace function public.submit_hifz_test_registration(
  p_name text, p_age int, p_address text, p_viber text, p_book text, p_teacher_name text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_viber text := btrim(coalesce(p_viber, ''));
begin
  if not hifz_test_form_open() then
    raise exception 'hifz test form is closed' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 80
    or p_age is null or p_age not between 3 and 99
    or char_length(btrim(coalesce(p_address, ''))) not between 2 and 120
    or v_viber !~ '^[+0-9 -]{7,20}$'
    or char_length(btrim(coalesce(p_book, ''))) not between 1 and 80
    or char_length(btrim(coalesce(p_teacher_name, ''))) not between 2 and 80 then
    raise exception 'details are not valid' using errcode = 'P0001';
  end if;
  -- Against floods: 300 an hour from the whole site, 5 an hour from one
  -- Viber number.
  if (select count(*) from hifz_test_registrations where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'too many registrations' using errcode = 'P0001';
  end if;
  if (select count(*) from hifz_test_registrations
      where created_at > now() - interval '1 hour'
        and regexp_replace(viber, '[^0-9]', '', 'g') = regexp_replace(v_viber, '[^0-9]', '', 'g')) >= 5 then
    raise exception 'too many registrations' using errcode = 'P0001';
  end if;
  insert into hifz_test_registrations (name, age, address, viber, book, teacher_name)
  values (btrim(p_name), p_age, btrim(p_address), v_viber, btrim(p_book), btrim(p_teacher_name));
end;
$$;
grant execute on function public.submit_hifz_test_registration(text, int, text, text, text, text) to anon, authenticated;

create or replace function public.alert_admins_new_hifz_test_registration()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform alert_admins(
    'New Hifz test registration',
    new.name || ' registered for the Hifz test (' || new.book || '). Check it under Hifz test.',
    'Hifz test — ' || new.name
  );
  return null;
end;
$$;
revoke all on function public.alert_admins_new_hifz_test_registration() from public, anon, authenticated;

drop trigger if exists alert_admins_new_hifz_test_registration on public.hifz_test_registrations;
create trigger alert_admins_new_hifz_test_registration after insert on public.hifz_test_registrations
  for each row execute function public.alert_admins_new_hifz_test_registration();
