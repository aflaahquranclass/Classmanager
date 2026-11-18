-- Student portal security check, run against the live database as a real
-- signed-in student. Nothing is saved: the block always ends with an error
-- that rolls everything back, and the error message is the report.
--
-- Set the student's login (auth.users.id) on the line marked "student login".
-- The report lists every check as ok / FAIL. Anything FAIL is a leak.
--
-- Checks:
--  1. Reads: on every table in public, rows the student can see that aren't
--     theirs (other students' rows, staff data). Only the shared reference
--     tables in v_shared may show rows.
--  2. Writes the student must not make (other students' rows, teacher-only
--     columns, marks, fees, roles, notifications, payments).
--  3. Admin / teacher functions called as the student.
do $test$
declare
  v_uid uuid := '2e1be969-2df1-4d89-8204-3b804d987507'; -- student login
  v_me uuid;
  v_class uuid;
  v_report text := '';
  v_n bigint;
  v_t record;
  v_sql text;
  v_own text;
  -- Reference data every signed-in user may read.
  v_shared text[] := array['holidays', 'report_translations', 'site_translations', 'student_motivation', 'registration_forms'];
  v_fails int := 0;
  v_row jsonb;
begin
  select id, class_id into v_me, v_class from public.students where user_id = v_uid;
  if v_me is null then raise exception 'That login is not linked to a student.'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  -- 1. Reads ---------------------------------------------------------------
  for v_t in
    select c.relname,
      exists (select 1 from information_schema.columns k where k.table_schema = 'public' and k.table_name = c.relname and k.column_name = 'student_id') has_student,
      exists (select 1 from information_schema.columns k where k.table_schema = 'public' and k.table_name = c.relname and k.column_name = 'user_id') has_user,
      exists (select 1 from information_schema.columns k where k.table_schema = 'public' and k.table_name = c.relname and k.column_name = 'class_id') has_class
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' order by 1
  loop
    if v_t.relname = any (v_shared) then continue; end if;
    -- What counts as the student's own row on this table.
    v_own := case
      when v_t.relname = 'students' then format('id = %L', v_me)
      when v_t.relname = 'profiles' then format('id = %L', v_uid)
      when v_t.relname = 'notifications' then format('exists (select 1 from public.notification_recipients r where r.notification_id = notifications.id and r.user_id = %L)', v_uid)
      when v_t.relname in ('thilawa_class_readings', 'thilawa_class_topics') then format('class_id = %L', v_class)
      when v_t.has_student then format('student_id = %L', v_me)
      when v_t.has_user then format('user_id = %L', v_uid)
      else 'false' end;
    begin
      execute format('select count(*) from public.%I where not (%s)', v_t.relname, v_own) into v_n;
      if v_n > 0 then v_fails := v_fails + 1; v_report := v_report || format(E'\nFAIL read %s: %s rows not the student''s', v_t.relname, v_n); end if;
    exception when insufficient_privilege then null; -- no access at all: fine
    end;
  end loop;
  -- Private teacher notes are the student's rows but must stay hidden.
  select count(*) into v_n from public.thilawa_notes where not visible_to_student;
  if v_n > 0 then v_fails := v_fails + 1; v_report := v_report || E'\nFAIL read thilawa_notes: private notes visible'; end if;
  v_report := v_report || E'\nok   reads checked on every table';

  -- 2. Writes --------------------------------------------------------------
  -- Each statement runs in its own sub-block. "blocked" = error or 0 rows,
  -- or (own rows, teacher-only columns) the value didn't change.
  for v_sql, v_own in values
    ('update public.students set fee = 0, teacher_share_percent = 0 where true', 'students: fees / share'),
    ('update public.students set user_id = null where true', 'students: unlink login'),
    ('insert into public.students (name) values (''x'')', 'students: add'),
    ('update public.profiles set role = ''admin'' where true', 'profiles: become admin'),
    ('insert into public.profiles (id, role) values (gen_random_uuid(), ''admin'')', 'profiles: add admin'),
    ('update public.teachers set name = name where true', 'teachers: edit'),
    ('update public.hifz_tasks set notes = ''x'' where student_id <> current_student_id()', 'hifz_tasks: other students'),
    ('delete from public.hifz_tasks where true', 'hifz_tasks: delete'),
    ('insert into public.hifz_tasks (student_id, task_date, activity, start_unit, end_unit) values (current_student_id(), current_date, ''new'', 1, 2)', 'hifz_tasks: add own'),
    ('update public.hifz_mistakes set corrected_at = now() where student_id <> current_student_id()', 'hifz_mistakes: other students'),
    ('delete from public.hifz_mistakes where true', 'hifz_mistakes: delete'),
    ('insert into public.hifz_mistakes (student_id, page, verse_key, word_position) values (current_student_id(), 1, ''1:1'', 1)', 'hifz_mistakes: add own'),
    ('update public.hifz_profiles set memorized = ''[]'' where true', 'hifz_profiles: change plan'),
    ('insert into public.hifz_profiles (student_id) values (current_student_id())', 'hifz_profiles: add'),
    ('update public.thilawa_assignments set from_page = 1 where student_id <> current_student_id()', 'thilawa_assignments: other students'),
    ('delete from public.thilawa_assignments where true', 'thilawa_assignments: delete'),
    ('insert into public.thilawa_assessments (student_id, tajweed, fluency) values (current_student_id(), 100, 100)', 'thilawa_assessments: self-grade'),
    ('insert into public.thilawa_notes (student_id, body, visible_to_student) values (current_student_id(), ''x'', true)', 'thilawa_notes: add'),
    ('insert into public.thilawa_reading (student_id, read_on, from_page, to_page) select id, current_date, 1, 2 from public.students where id <> current_student_id() limit 1', 'thilawa_reading: log for others'),
    ('update public.thilawa_class_readings set page = 1 where true', 'thilawa_class_readings: edit'),
    ('insert into public.attendance_records (student_id, record_date, status) values (current_student_id(), current_date, ''present'')', 'attendance: mark self'),
    ('update public.attendance_records set status = ''present'' where true', 'attendance: change'),
    ('update public.payments set paid = true where true', 'payments: mark paid'),
    ('insert into public.payments (student_id, month, paid) values (current_student_id(), ''2099-01'', true)', 'payments: add'),
    ('insert into public.payment_slips (student_id, month, amount, file_path, status) values (current_student_id(), ''2099-01'', 1, ''x'', ''approved'')', 'payment_slips: pre-approved'),
    ('insert into public.payment_slips (student_id, month, amount, file_path) select id, ''2099-01'', 1, ''x'' from public.students where id <> current_student_id() limit 1', 'payment_slips: for others'),
    ('update public.payment_slips set status = ''approved'' where true', 'payment_slips: approve'),
    ('insert into public.notifications (title, body) values (''x'', ''x'')', 'notifications: send'),
    ('insert into public.notification_recipients (notification_id, user_id) select id, auth.uid() from public.notifications limit 1', 'notification_recipients: add'),
    ('update public.notification_recipients set read_at = now() where user_id <> auth.uid()', 'notification_recipients: others'),
    ('update public.exam_candidates set final_result = ''pass'' where true', 'exam_candidates: results'),
    ('insert into public.hifz_exams (student_id) values (current_student_id())', 'hifz_exams: add'),
    ('update public.classes set name = name where true', 'classes: edit'),
    ('insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) select user_id, ''x'', ''x'', ''x'' from public.students where user_id <> auth.uid() and user_id is not null limit 1', 'push_subscriptions: for others')
  loop
    begin
      execute v_sql;
      get diagnostics v_n = row_count;
      if v_n > 0 then v_fails := v_fails + 1; v_report := v_report || format(E'\nFAIL write %s (%s rows)', v_own, v_n);
      else v_report := v_report || format(E'\nok   write blocked: %s', v_own); end if;
    exception when others then v_report := v_report || format(E'\nok   write blocked: %s', v_own);
    end;
  end loop;

  -- Own rows: only the student's tick columns may change.
  begin
    update public.hifz_tasks set notes = 'hacked', completed_at = now(), task_date = '2000-01-01' where student_id = v_me;
    select count(*) into v_n from public.hifz_tasks where student_id = v_me and (notes = 'hacked' or task_date = '2000-01-01');
    if v_n > 0 then v_fails := v_fails + 1; v_report := v_report || E'\nFAIL own hifz_tasks: teacher columns changed';
    else v_report := v_report || E'\nok   own hifz_tasks: only "done" can change'; end if;
    update public.hifz_mistakes set note = 'hacked', corrected_at = now() where student_id = v_me;
    select count(*) into v_n from public.hifz_mistakes where student_id = v_me and note = 'hacked';
    if v_n > 0 then v_fails := v_fails + 1; v_report := v_report || E'\nFAIL own hifz_mistakes: teacher columns changed';
    else v_report := v_report || E'\nok   own hifz_mistakes: only the tick can change'; end if;
    update public.thilawa_assignments set instructions = 'hacked', checked_at = now() where student_id = v_me;
    select count(*) into v_n from public.thilawa_assignments where student_id = v_me and instructions = 'hacked';
    if v_n > 0 then v_fails := v_fails + 1; v_report := v_report || E'\nFAIL own thilawa_assignments: teacher columns changed';
    else v_report := v_report || E'\nok   own thilawa_assignments: only "done" can change'; end if;
  exception when others then v_report := v_report || format(E'\nok   own rows: %s', sqlerrm);
  end;

  -- 3. Admin / teacher functions ---------------------------------------------
  for v_sql, v_own in values
    ('select public.accept_registration(gen_random_uuid(), gen_random_uuid(), 1)', 'accept_registration'),
    ('select public.admin_link_student_by_email(current_student_id(), ''x@x.x'')', 'admin_link_student_by_email'),
    ('select public.admin_link_teacher_by_email(gen_random_uuid(), ''x@x.x'')', 'admin_link_teacher_by_email'),
    ('select public.admin_link_staff_by_email(gen_random_uuid(), ''x@x.x'')', 'admin_link_staff_by_email'),
    ('select public.complete_exam_candidate(gen_random_uuid(), gen_random_uuid())', 'complete_exam_candidate'),
    ('select public.forget_push_endpoints(''guess'', array[''x''])', 'forget_push_endpoints')
  loop
    begin
      execute v_sql;
      v_fails := v_fails + 1; v_report := v_report || format(E'\nFAIL function ran: %s', v_own);
    exception when others then v_report := v_report || format(E'\nok   function refused: %s', v_own);
    end;
  end loop;
  -- The student's own exam list only.
  select count(*) into v_n from public.my_exam_schedule();
  v_report := v_report || format(E'\nok   my_exam_schedule: %s of their own', v_n);

  raise exception E'STUDENT RLS REPORT (rolled back) — % failure(s)%', v_fails, v_report;
end
$test$;
