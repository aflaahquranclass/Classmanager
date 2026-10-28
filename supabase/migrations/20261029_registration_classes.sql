-- Registration now runs on the real classes (Admin → Classes) instead of a
-- separate list of class times. Runs after 20261028_class_registrations.sql.
--
-- - A class is offered on the website when the admin turns on "Show on the
--   website" in its form and gives its class type (Tajweed, Hifz,
--   Foundation), age group, monthly fee and registration fee. Its days and
--   time are the class's own.
-- - Accepting a registration (accept_registration) adds the student to that
--   class with the class's monthly fee, and records the registration fee as
--   other income in Finance for the month, in one step.

alter table public.classes
  add column on_website boolean not null default false,
  add column web_category text check (web_category in ('tajweed', 'hifz', 'foundation')),
  add column web_age_group text check (web_age_group in ('children', 'adults')),
  add column monthly_fee numeric check (monthly_fee >= 0),
  add column registration_fee numeric not null default 100 check (registration_fee >= 0),
  add column web_note text check (char_length(web_note) <= 200),
  add constraint classes_website_complete check (not on_website or (web_category is not null and web_age_group is not null and monthly_fee is not null));

-- What the website shows: the offered classes' type, age group, days, time
-- and fees — never the teacher or the students.
create or replace function public.public_class_times()
returns table (id uuid, category text, age_group text, days jsonb, start_time text, end_time text, registration_fee numeric, monthly_fee numeric, note text)
language sql stable security definer set search_path = public as $$
  select c.id, c.web_category, c.web_age_group, c.days, c.start_time, c.end_time, c.registration_fee, c.monthly_fee, c.web_note
  from public.classes c
  where c.on_website and c.start_time is not null and c.end_time is not null
  order by c.start_time;
$$;
grant execute on function public.public_class_times() to anon, authenticated;

alter table public.class_registrations
  add column class_id uuid references public.classes(id) on delete set null,
  add column student_id uuid references public.students(id) on delete set null,
  add column registration_fee numeric;
alter table public.class_registrations drop column offering_id;

drop function public.submit_registration(text, uuid, text, text, smallint, text, text, text);
drop table public.class_offerings;

create or replace function public.submit_registration(
  p_form text, p_class_id uuid, p_name text, p_nic text, p_age smallint,
  p_atoll_island text, p_viber text, p_slip_path text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  c classes;
begin
  if not exists (select 1 from registration_forms where form = p_form and is_open) then
    raise exception 'registration form is closed' using errcode = 'P0001';
  end if;
  select * into c from classes where id = p_class_id and on_website and (p_form = 'all' or web_category = p_form);
  if not found then
    raise exception 'class is not open for registration' using errcode = 'P0001';
  end if;
  if p_slip_path !~ '^new/[A-Za-z0-9._-]+$' or not exists (select 1 from storage.objects where bucket_id = 'registration-slips' and name = p_slip_path) then
    raise exception 'payment slip is missing' using errcode = 'P0001';
  end if;
  insert into class_registrations (class_id, form, category, registration_fee, class_label, name, nic, age, atoll_island, viber, slip_path)
  values (
    c.id, p_form, c.web_category, c.registration_fee,
    initcap(case c.web_category when 'tajweed' then 'Tajweed (Tilawa)' else c.web_category end)
      || ' · ' || case c.web_age_group when 'children' then 'Children (under 14)' else 'Teens & adults (15+)' end
      || ' · ' || (select string_agg(d, ', ') from jsonb_array_elements_text(c.days) d)
      || ' ' || c.start_time || '–' || c.end_time,
    btrim(p_name), upper(btrim(p_nic)), p_age, btrim(p_atoll_island), btrim(p_viber), p_slip_path
  );
end;
$$;
grant execute on function public.submit_registration(text, uuid, text, text, smallint, text, text, text) to anon, authenticated;

-- Accepts a waiting registration: adds the student to its class (the trigger
-- gives them their Student ID), records the registration fee as other income
-- for this month, and marks the registration accepted. Returns the new
-- student's id. Admins only.
create or replace function public.accept_registration(p_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  r class_registrations;
  c classes;
  v_today date := (now() at time zone 'Indian/Maldives')::date;
  v_student uuid;
begin
  if not public.is_admin() then
    raise exception 'admins only' using errcode = '42501';
  end if;
  select * into r from class_registrations where id = p_id for update;
  if not found then raise exception 'registration not found' using errcode = 'P0001'; end if;
  if r.status <> 'pending' then raise exception 'registration is not waiting' using errcode = 'P0001'; end if;
  select * into c from classes where id = r.class_id;
  if not found then raise exception 'the class for this registration no longer exists' using errcode = 'P0001'; end if;

  insert into students (name, class_id, class_name, fee, phone, teacher_id, teacher_share_percent, schedule, joined_month)
  values (
    r.name, c.id, c.name, coalesce(c.monthly_fee, 0), r.viber, c.teacher_id, 0,
    case when jsonb_array_length(c.days) > 0 and c.start_time is not null and c.end_time is not null
      then jsonb_build_object('days', c.days, 'startTime', c.start_time, 'endTime', c.end_time) end,
    to_char(v_today, 'YYYY-MM')
  )
  returning id into v_student;

  if coalesce(r.registration_fee, 0) > 0 then
    insert into other_income (month, description, amount, income_date)
    values (to_char(v_today, 'YYYY-MM'), 'Registration fee — ' || r.name || ' (' || c.name || ')', r.registration_fee, v_today);
  end if;

  update class_registrations set status = 'accepted', student_id = v_student, reviewed_at = now() where id = p_id;
  return v_student;
end;
$$;
revoke all on function public.accept_registration(uuid) from public, anon;
grant execute on function public.accept_registration(uuid) to authenticated;
