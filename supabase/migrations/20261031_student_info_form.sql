-- Student information update form (aflaahqc.com/update?k=<key>): current
-- students send their ID card number, atoll and island, Viber number and
-- email, which weren't collected before. Like the review form it only opens with the private link
-- the admin shares in class groups, and the admin can close it or make a new
-- link (Admin → Registrations → Info updates). Each response waits until the
-- admin matches it to a student (the page suggests students with the same
-- name or Viber number) and saves the details onto that student.
-- Students also keep their atoll and island now (from this form, or from
-- their website registration when it's accepted).
--
-- The ID card number is kept on students, at most one student per number,
-- so the same person can't be added twice. Accepting a website registration
-- now saves its ID card number on the new student too.
-- Runs after 20261030_web_classes.sql.

alter table public.students add column nic text check (char_length(btrim(nic)) between 4 and 20);
create unique index students_nic_key on public.students (upper(btrim(nic))) where nic is not null;
alter table public.students add column atoll_island text check (char_length(atoll_island) <= 80);

create table public.info_form_settings (
  id smallint primary key default 1 check (id = 1),
  form_key text not null default left(replace(gen_random_uuid()::text, '-', ''), 12),
  is_open boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.info_form_settings default values;
alter table public.info_form_settings enable row level security;
create policy "Admins manage the info form" on public.info_form_settings for all
  using (public.is_admin()) with check (public.is_admin());

create table public.student_info_updates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  nic text not null check (char_length(btrim(nic)) between 4 and 20),
  atoll_island text not null check (char_length(btrim(atoll_island)) between 1 and 80),
  viber text not null check (char_length(btrim(viber)) between 5 and 20),
  email text check (char_length(email) <= 120),
  -- What the student said they know, to help find them: optional.
  student_code text check (char_length(student_code) <= 20),
  class_name text check (char_length(class_name) <= 80),
  status text not null default 'pending' check (status in ('pending', 'saved', 'dismissed')),
  student_id uuid references public.students(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index student_info_updates_status_idx on public.student_info_updates (status, created_at desc);
alter table public.student_info_updates enable row level security;
create policy "Admins manage info updates" on public.student_info_updates for all
  using (public.is_admin()) with check (public.is_admin());

-- 'open', 'closed' or 'invalid' for the link's key.
create or replace function public.info_form_status(p_key text)
returns text
language sql stable security definer set search_path = public as $$
  select case
    when s.form_key is distinct from p_key then 'invalid'
    when s.is_open then 'open'
    else 'closed'
  end
  from public.info_form_settings s where s.id = 1;
$$;

create or replace function public.submit_student_info(
  p_key text, p_name text, p_nic text, p_atoll_island text, p_viber text, p_email text, p_student_code text, p_class_name text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from info_form_settings where id = 1 and is_open and form_key = p_key) then
    raise exception 'info form link is closed or invalid' using errcode = 'P0001';
  end if;
  insert into student_info_updates (name, nic, atoll_island, viber, email, student_code, class_name)
  values (btrim(p_name), upper(btrim(p_nic)), btrim(p_atoll_island), btrim(p_viber), nullif(lower(btrim(p_email)), ''),
          nullif(upper(btrim(p_student_code)), ''), nullif(btrim(p_class_name), ''));
end;
$$;

grant execute on function public.info_form_status(text) to anon, authenticated;
grant execute on function public.submit_student_info(text, text, text, text, text, text, text, text) to anon, authenticated;

create or replace function public.alert_admins_new_info_update()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform alert_admins(
    'Student info update',
    new.name || ' sent their ID card number and contact details. Check it under Registrations → Info updates.',
    'Info update — ' || new.name
  );
  return null;
end;
$$;
revoke all on function public.alert_admins_new_info_update() from public, anon, authenticated;
create trigger alert_admins_new_info_update after insert on public.student_info_updates
  for each row execute function public.alert_admins_new_info_update();

-- Accepting a registration saves its ID card number on the new student; a
-- number already on another student stops it (the unique index), so the
-- same person isn't added twice.
create or replace function public.accept_registration(p_id uuid, p_class_id uuid, p_monthly_fee numeric)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  r class_registrations;
  c classes;
  v_today date := (now() at time zone 'Indian/Maldives')::date;
  v_student uuid;
  v_existing text;
begin
  if not public.is_admin() then
    raise exception 'admins only' using errcode = '42501';
  end if;
  if p_monthly_fee is null or p_monthly_fee < 0 then
    raise exception 'monthly fee is missing' using errcode = 'P0001';
  end if;
  select * into r from class_registrations where id = p_id for update;
  if not found then raise exception 'registration not found' using errcode = 'P0001'; end if;
  if r.status <> 'pending' then raise exception 'registration is not waiting' using errcode = 'P0001'; end if;
  select * into c from classes where id = p_class_id;
  if not found then raise exception 'class not found' using errcode = 'P0001'; end if;
  select coalesce(s.student_code, '') || ' ' || s.name into v_existing
    from students s where upper(btrim(s.nic)) = upper(btrim(r.nic)) limit 1;
  if v_existing is not null then
    raise exception 'ID card number % is already on student %', r.nic, btrim(v_existing) using errcode = 'P0001';
  end if;

  insert into students (name, nic, atoll_island, class_id, class_name, fee, phone, teacher_id, teacher_share_percent, schedule, joined_month)
  values (
    r.name, upper(btrim(r.nic)), r.atoll_island, c.id, c.name, p_monthly_fee, r.viber, c.teacher_id, 0,
    case when jsonb_array_length(c.days) > 0 and c.start_time is not null and c.end_time is not null
      then jsonb_build_object('days', c.days, 'startTime', c.start_time, 'endTime', c.end_time) end,
    to_char(v_today, 'YYYY-MM')
  )
  returning id into v_student;

  if coalesce(r.registration_fee, 0) > 0 then
    insert into other_income (month, description, amount, income_date)
    values (to_char(v_today, 'YYYY-MM'), 'Registration fee — ' || r.name || ' (' || c.name || ')', r.registration_fee, v_today);
  end if;

  update class_registrations set status = 'accepted', class_id = c.id, student_id = v_student, reviewed_at = now() where id = p_id;
  return v_student;
end;
$$;
