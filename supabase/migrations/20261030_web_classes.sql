-- The website's class times are their own list again (web_classes), kept
-- apart from the real classes: Admin → Registrations → Website classes.
-- When the admin accepts a registration they choose the real class to put
-- the student in — an ongoing class or a new one — and the monthly fee.
-- Runs after 20261029_registration_classes.sql.
--
-- class_registrations.web_class_id is the time the student chose on the
-- website; class_id is the real class the admin added them to.

create table public.web_classes (
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
alter table public.web_classes enable row level security;
create policy "Admins manage website classes" on public.web_classes for all
  using (public.is_admin()) with check (public.is_admin());

-- Classes already shown on the website become website class times.
create temporary table web_map on commit drop as
  select c.id as class_id, gen_random_uuid() as web_id from public.classes c where c.on_website;
insert into public.web_classes (id, category, age_group, days, start_time, end_time, registration_fee, monthly_fee, note)
select m.web_id, c.web_category, c.web_age_group, c.days, c.start_time, c.end_time, c.registration_fee, c.monthly_fee, c.web_note
from web_map m join public.classes c on c.id = m.class_id
where c.start_time is not null and c.end_time is not null;

alter table public.class_registrations
  add column web_class_id uuid references public.web_classes(id) on delete set null,
  add column monthly_fee numeric;
update public.class_registrations r set web_class_id = m.web_id from web_map m where m.class_id = r.class_id;
update public.class_registrations r set monthly_fee = w.monthly_fee from public.web_classes w where w.id = r.web_class_id;
-- A waiting registration isn't in a class yet.
update public.class_registrations set class_id = null where status = 'pending';

alter table public.classes
  drop constraint classes_website_complete,
  drop column on_website, drop column web_category, drop column web_age_group,
  drop column monthly_fee, drop column registration_fee, drop column web_note;

create or replace function public.public_class_times()
returns table (id uuid, category text, age_group text, days jsonb, start_time text, end_time text, registration_fee numeric, monthly_fee numeric, note text)
language sql stable security definer set search_path = public as $$
  select w.id, w.category, w.age_group, w.days, w.start_time, w.end_time, w.registration_fee, w.monthly_fee, w.note
  from public.web_classes w
  where w.is_open
  order by w.start_time;
$$;
grant execute on function public.public_class_times() to anon, authenticated;

create or replace function public.submit_registration(
  p_form text, p_class_id uuid, p_name text, p_nic text, p_age smallint,
  p_atoll_island text, p_viber text, p_slip_path text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  w web_classes;
begin
  if not exists (select 1 from registration_forms where form = p_form and is_open) then
    raise exception 'registration form is closed' using errcode = 'P0001';
  end if;
  select * into w from web_classes where id = p_class_id and is_open and (p_form = 'all' or category = p_form);
  if not found then
    raise exception 'class is not open for registration' using errcode = 'P0001';
  end if;
  if p_slip_path !~ '^new/[A-Za-z0-9._-]+$' or not exists (select 1 from storage.objects where bucket_id = 'registration-slips' and name = p_slip_path) then
    raise exception 'payment slip is missing' using errcode = 'P0001';
  end if;
  insert into class_registrations (web_class_id, form, category, registration_fee, monthly_fee, class_label, name, nic, age, atoll_island, viber, slip_path)
  values (
    w.id, p_form, w.category, w.registration_fee, w.monthly_fee,
    initcap(case w.category when 'tajweed' then 'Tajweed (Tilawa)' else w.category end)
      || ' · ' || case w.age_group when 'children' then 'Children (under 14)' else 'Teens & adults (15+)' end
      || ' · ' || (select string_agg(d, ', ') from jsonb_array_elements_text(w.days) d)
      || ' ' || w.start_time || '–' || w.end_time,
    btrim(p_name), upper(btrim(p_nic)), p_age, btrim(p_atoll_island), btrim(p_viber), p_slip_path
  );
end;
$$;

-- Accepts a waiting registration into the class the admin chose (an ongoing
-- one, or one they just made) at the monthly fee they set: adds the student
-- (the trigger gives them their Student ID), records the registration fee as
-- other income for this month, and marks the registration accepted. Returns
-- the new student's id. Admins only.
drop function public.accept_registration(uuid);
create or replace function public.accept_registration(p_id uuid, p_class_id uuid, p_monthly_fee numeric)
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
  if p_monthly_fee is null or p_monthly_fee < 0 then
    raise exception 'monthly fee is missing' using errcode = 'P0001';
  end if;
  select * into r from class_registrations where id = p_id for update;
  if not found then raise exception 'registration not found' using errcode = 'P0001'; end if;
  if r.status <> 'pending' then raise exception 'registration is not waiting' using errcode = 'P0001'; end if;
  select * into c from classes where id = p_class_id;
  if not found then raise exception 'class not found' using errcode = 'P0001'; end if;

  insert into students (name, class_id, class_name, fee, phone, teacher_id, teacher_share_percent, schedule, joined_month)
  values (
    r.name, c.id, c.name, p_monthly_fee, r.viber, c.teacher_id, 0,
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
revoke all on function public.accept_registration(uuid, uuid, numeric) from public, anon;
grant execute on function public.accept_registration(uuid, uuid, numeric) to authenticated;
