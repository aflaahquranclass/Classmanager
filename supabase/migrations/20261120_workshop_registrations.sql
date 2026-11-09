-- Workshop sign-ups from the public website (/workshop/<name>), e.g. the
-- prayer session for students aged 10–16 (aflaahqc.com/workshop/namaadhu).
-- A parent fills in one or more students (full name, age, permanent address,
-- Viber number), sees the total (the workshop fee × the number of students),
-- pays it by bank transfer and attaches the slip. Sign-ups wait as 'pending'
-- until the admin checks the slip.
--
-- Slips go into the private registration-slips bucket under new/ (the same
-- rule as class registrations: visitors can add a file, never read it back).
-- Visitors never read or write the table directly — only through
-- submit_workshop_registration, which checks every field and works out the
-- total itself. Runs after 20261028_class_registrations.sql.

create table public.workshop_registrations (
  id uuid primary key default gen_random_uuid(),
  workshop text not null,
  -- [{ "name": "...", "age": 12, "address": "...", "viber": "7xxxxxx" }, ...]
  students jsonb not null check (jsonb_typeof(students) = 'array'),
  student_count smallint not null check (student_count between 1 and 10),
  fee_per_student numeric not null check (fee_per_student >= 0),
  total numeric not null check (total >= 0),
  slip_path text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  admin_note text check (char_length(admin_note) <= 500),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index workshop_registrations_idx on public.workshop_registrations (workshop, status, created_at desc);

alter table public.workshop_registrations enable row level security;
create policy "Admins manage workshop registrations" on public.workshop_registrations for all
  using (public.is_admin()) with check (public.is_admin());

-- The workshops taking sign-ups, with their fee per student (MVR) and the
-- last day of sign-up. To add one, add a line here (and in
-- src/workshops/workshops.js).
create or replace function public.workshop_fee(p_workshop text)
returns numeric
language sql immutable as $$
  select case p_workshop
    when 'namaadhu-2026-11' then 150::numeric
  end
$$;

create or replace function public.submit_workshop_registration(
  p_workshop text, p_students jsonb, p_slip_path text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  fee numeric := workshop_fee(p_workshop);
  s jsonb;
  n int;
  clean jsonb := '[]'::jsonb;
begin
  if fee is null then
    raise exception 'workshop is not open' using errcode = 'P0001';
  end if;
  if p_workshop = 'namaadhu-2026-11' and (now() at time zone 'Indian/Maldives')::date > date '2026-11-19' then
    raise exception 'workshop is not open' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_students) <> 'array' then
    raise exception 'students missing' using errcode = 'P0001';
  end if;
  n := jsonb_array_length(p_students);
  if n < 1 or n > 10 then
    raise exception 'students missing' using errcode = 'P0001';
  end if;
  for s in select * from jsonb_array_elements(p_students) loop
    if char_length(btrim(coalesce(s->>'name', ''))) not between 2 and 80
      or coalesce(s->>'age', '') !~ '^\d{1,2}$' or (s->>'age')::int not between 10 and 16
      or char_length(btrim(coalesce(s->>'address', ''))) not between 2 and 120
      or coalesce(s->>'viber', '') !~ '^[+0-9 -]{7,20}$' then
      raise exception 'student details are not valid' using errcode = 'P0001';
    end if;
    clean := clean || jsonb_build_object(
      'name', btrim(s->>'name'), 'age', (s->>'age')::int,
      'address', btrim(s->>'address'), 'viber', btrim(s->>'viber'));
  end loop;
  if p_slip_path !~ '^new/[A-Za-z0-9._-]+$' or not exists (select 1 from storage.objects where bucket_id = 'registration-slips' and name = p_slip_path) then
    raise exception 'payment slip is missing' using errcode = 'P0001';
  end if;
  -- At most 30 sign-ups an hour from the whole site, against floods.
  if (select count(*) from workshop_registrations where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'too many sign-ups' using errcode = 'P0001';
  end if;
  insert into workshop_registrations (workshop, students, student_count, fee_per_student, total, slip_path)
  values (p_workshop, clean, n, fee, fee * n, p_slip_path);
end;
$$;
grant execute on function public.submit_workshop_registration(text, jsonb, text) to anon, authenticated;

create or replace function public.alert_admins_new_workshop_registration()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform alert_admins(
    'New workshop sign-up',
    (new.students->0->>'name')
      || case when new.student_count > 1 then ' and ' || (new.student_count - 1) || ' more' else '' end
      || ' signed up for the ' || new.workshop || ' workshop (MVR ' || new.total || '). Check the slip.',
    'Workshop — ' || (new.students->0->>'name')
  );
  return null;
end;
$$;
revoke all on function public.alert_admins_new_workshop_registration() from public, anon, authenticated;

drop trigger if exists alert_admins_new_workshop_registration on public.workshop_registrations;
create trigger alert_admins_new_workshop_registration after insert on public.workshop_registrations
  for each row execute function public.alert_admins_new_workshop_registration();
