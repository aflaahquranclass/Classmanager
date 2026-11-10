-- Workshop sign-ups: room for about 100 sign-ups, many of them in the first
-- hours after the poster goes up. The site-wide limit goes from 30 to 300 an
-- hour, and one Viber number can send at most 5 sign-ups an hour (so one
-- person can't flood the list). Everything else is as in
-- 20261120_workshop_registrations.sql.

create or replace function public.submit_workshop_registration(
  p_workshop text, p_students jsonb, p_slip_path text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  fee numeric := workshop_fee(p_workshop);
  s jsonb;
  n int;
  clean jsonb := '[]'::jsonb;
  first_viber text;
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
  -- Against floods: 300 sign-ups an hour from the whole site, and 5 an hour
  -- from one Viber number.
  if (select count(*) from workshop_registrations where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'too many sign-ups' using errcode = 'P0001';
  end if;
  first_viber := regexp_replace(clean->0->>'viber', '[^0-9]', '', 'g');
  if (select count(*) from workshop_registrations
      where created_at > now() - interval '1 hour'
        and regexp_replace(students->0->>'viber', '[^0-9]', '', 'g') = first_viber) >= 5 then
    raise exception 'too many sign-ups' using errcode = 'P0001';
  end if;
  insert into workshop_registrations (workshop, students, student_count, fee_per_student, total, slip_path)
  values (p_workshop, clean, n, fee, fee * n, p_slip_path);
end;
$$;
grant execute on function public.submit_workshop_registration(text, jsonb, text) to anon, authenticated;
