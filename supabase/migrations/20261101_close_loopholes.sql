-- Closes three loopholes found in the system review. Runs after
-- 20261031_student_info_form.sql.
--
-- 1. Teachers could change any column of their own students through the API
--    (fee, teacher share, phone, ID card number, login…), because the policy
--    "Teachers can reschedule their own students" covers the whole row. A
--    trigger now keeps everything but the schedule as it was for teachers.
--    Staff can still edit students, but can't move a student's portal login.
-- 2. Teachers could write attendance for any student by putting their own
--    teacher_id on the row. They can now only write it for their own students.
-- 3. The public registration form had no limit: anyone could upload slips and
--    file registrations (each one alerting every admin's phone) without end,
--    and one slip could be reused for many registrations.

-- 1. Teachers only change the schedule; only admins change a student's login.
-- Calls with no signed-in user (the service role, e.g. student-login) and
-- admins (also inside accept_registration / admin_link_student_by_email) are
-- left alone.
create or replace function public.students_limit_edits()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_schedule jsonb;
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if public.current_teacher_id() is not null and not public.is_staff() then
    v_schedule := new.schedule;
    new := old;
    new.schedule := v_schedule;
    return new;
  end if;
  new.user_id := old.user_id;
  return new;
end;
$$;
revoke all on function public.students_limit_edits() from public, anon, authenticated;

drop trigger if exists students_limit_edits on public.students;
create trigger students_limit_edits before update on public.students
  for each row execute function public.students_limit_edits();

-- 2. Teachers write attendance only for their own students. They still read
-- (and may remove) the rows they wrote for students since moved to another
-- teacher.
drop policy "Teachers manage their own students' attendance" on public.attendance_records;
create policy "Teachers view their own attendance records" on public.attendance_records
  for select using (teacher_id = public.current_teacher_id());
create policy "Teachers remove their own attendance records" on public.attendance_records
  for delete using (teacher_id = public.current_teacher_id());
create policy "Teachers add their own students' attendance" on public.attendance_records
  for insert with check (
    teacher_id = public.current_teacher_id()
    and student_id in (select s.id from public.students s where s.teacher_id = public.current_teacher_id())
  );
create policy "Teachers update their own students' attendance" on public.attendance_records
  for update using (teacher_id = public.current_teacher_id())
  with check (
    teacher_id = public.current_teacher_id()
    and student_id in (select s.id from public.students s where s.teacher_id = public.current_teacher_id())
  );

-- 3. Limits on the public registration form.
-- At most 60 slip uploads an hour from the website, across all visitors.
create or replace function public.registration_slip_upload_allowed()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select count(*) < 60 from storage.objects
  where bucket_id = 'registration-slips' and name like 'new/%' and created_at > now() - interval '1 hour';
$$;
revoke all on function public.registration_slip_upload_allowed() from public;
grant execute on function public.registration_slip_upload_allowed() to anon, authenticated;

drop policy "Anyone uploads a registration slip" on storage.objects;
create policy "Anyone uploads a registration slip" on storage.objects for insert
  to anon, authenticated with check (
    bucket_id = 'registration-slips'
    and (storage.foldername(name))[1] = 'new'
    and public.registration_slip_upload_allowed()
  );

-- submit_registration: each slip is used once, an ID card number can have
-- only one waiting registration, and at most 30 registrations an hour.
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
  if exists (select 1 from class_registrations where slip_path = p_slip_path) then
    raise exception 'payment slip is already used' using errcode = 'P0001';
  end if;
  if exists (select 1 from class_registrations where status = 'pending' and upper(btrim(nic)) = upper(btrim(p_nic))) then
    raise exception 'registration already waiting for this ID card' using errcode = 'P0001';
  end if;
  if (select count(*) from class_registrations where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'too many registrations, try again later' using errcode = 'P0001';
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
