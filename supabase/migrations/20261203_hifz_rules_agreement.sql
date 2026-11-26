-- Hifz class registrations must agree to the class rules and regulations
-- (the /rules page). The Hifz forms (/register/hifz/school and
-- /register/hifz/adults, and the old 'hifz' poster form) have a Rules step
-- with a tick box; the database refuses a Hifz registration without it and
-- keeps when the visitor agreed (rules_agreed_at). Other classes are as
-- before: to ask them too, add their category to the check below and set
-- rulesAgreement on it in src/registrations/registrations.js.
-- Everything else is as in 20261118_age_group_forms.sql.

alter table public.class_registrations add column if not exists rules_agreed_at timestamptz;

-- p_agreed is new and has a default, so the old 8-argument call still finds
-- this function (a page opened before the update keeps working for the other
-- classes).
drop function if exists public.submit_registration(text, uuid, text, text, smallint, text, text, text);

create function public.submit_registration(
  p_form text, p_class_id uuid, p_name text, p_nic text, p_age smallint,
  p_atoll_island text, p_viber text, p_slip_path text, p_agreed boolean default false
) returns void
language plpgsql security definer set search_path = public as $$
declare
  w web_classes;
begin
  if not exists (select 1 from registration_forms where form = p_form and is_open) then
    raise exception 'registration form is closed' using errcode = 'P0001';
  end if;
  select * into w from web_classes where id = p_class_id and is_open and (
    p_form = 'all' or p_form = category
    or p_form = category || '-' || case age_group when 'children' then 'school' else 'adults' end
  );
  if not found then
    raise exception 'class is not open for registration' using errcode = 'P0001';
  end if;
  if w.category = 'hifz' and p_agreed is not true then
    raise exception 'rules agreement missing' using errcode = 'P0001';
  end if;
  if (w.age_group = 'children' and p_age > 15) or (w.age_group = 'adults' and p_age < 16) then
    raise exception 'age does not fit this class' using errcode = 'P0001';
  end if;
  if p_slip_path !~ '^new/[A-Za-z0-9._-]+$' or not exists (select 1 from storage.objects where bucket_id = 'registration-slips' and name = p_slip_path) then
    raise exception 'payment slip is missing' using errcode = 'P0001';
  end if;
  if exists (select 1 from class_registrations where slip_path = p_slip_path) then
    raise exception 'payment slip is already used' using errcode = 'P0001';
  end if;
  if exists (select 1 from class_registrations where status = 'pending' and upper(btrim(nic)) = upper(btrim(p_nic))) then
    raise exception 'registration already waiting for this ID card' using errcode = 'P0001';
  end if;
  if (select count(*) from class_registrations where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'too many registrations, try again later' using errcode = 'P0001';
  end if;
  insert into class_registrations (web_class_id, form, category, registration_fee, monthly_fee, class_label, name, nic, age, atoll_island, viber, slip_path, rules_agreed_at)
  values (
    w.id, p_form, w.category, w.registration_fee, w.monthly_fee,
    initcap(case w.category when 'tajweed' then 'Tajweed (Tilawa)' else w.category end)
      || ' · ' || case w.age_group when 'children' then 'School students (15 and under)' else 'Adults (16+)' end
      || ' · ' || (select string_agg(d, ', ') from jsonb_array_elements_text(w.days) d)
      || ' ' || w.start_time || '–' || w.end_time,
    btrim(p_name), upper(btrim(p_nic)), p_age, btrim(p_atoll_island), btrim(p_viber), p_slip_path,
    case when p_agreed is true then now() end
  );
end;
$$;
revoke all on function public.submit_registration(text, uuid, text, text, smallint, text, text, text, boolean) from public;
grant execute on function public.submit_registration(text, uuid, text, text, smallint, text, text, text, boolean) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
