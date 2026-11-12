-- Speed: the same security rules, checked once per query instead of once per
-- row, and indexes on the links between tables.
--
-- 1. Every row-level security rule calls helpers such as is_admin(),
--    current_teacher_id() or auth.uid(). Written bare, Postgres runs them again
--    for each row a query looks at. Wrapped as (select is_admin()), it runs them
--    once per query and reuses the answer. The answer can't change within a
--    query (they only depend on who is signed in), so who can see or change
--    what stays exactly the same. teaches_class(class_id) depends on the row,
--    so it stays as it is.
-- 2. Indexes on the foreign keys Supabase's performance check found without
--    one, so lookups like "this teacher's students" don't scan whole tables.
--
-- The rules keep their names, commands and roles; only their conditions are
-- rewritten. Runs after 20261123_hifz_task_ayahs.sql.

-- The rules as they are now, to check against at the end.
create temp table _rules_before on commit drop as
  select tablename, policyname, cmd, roles, permissive, qual, with_check
  from pg_policies where schemaname = 'public';

-- 1. Security rules -----------------------------------------------------------

alter policy "Admins manage admin_staff" on public.admin_staff
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Staff can view own record" on public.admin_staff
  using ((user_id = (select auth.uid())));

alter policy "Admins manage attendance_followups" on public.attendance_followups
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins manage all attendance records" on public.attendance_records
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Students view their own attendance" on public.attendance_records
  using ((student_id = (select current_student_id())));
alter policy "Teachers add their own students' attendance" on public.attendance_records
  with check (((teacher_id = (select current_teacher_id())) AND (student_id IN ( SELECT s.id
   FROM students s
  WHERE (s.teacher_id = (select current_teacher_id()))))));
alter policy "Teachers remove their own attendance records" on public.attendance_records
  using ((teacher_id = (select current_teacher_id())));
alter policy "Teachers update their own students' attendance" on public.attendance_records
  using ((teacher_id = (select current_teacher_id())))
  with check (((teacher_id = (select current_teacher_id())) AND (student_id IN ( SELECT s.id
   FROM students s
  WHERE (s.teacher_id = (select current_teacher_id()))))));
alter policy "Teachers view their own attendance records" on public.attendance_records
  using ((teacher_id = (select current_teacher_id())));

alter policy "Admins manage class_expenses" on public.class_expenses
  using ((select is_admin()));

alter policy "Admins manage registrations" on public.class_registrations
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins manage all classes" on public.classes
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Staff can add classes" on public.classes
  with check ((select staff_can('classes_students'::text)));
alter policy "Staff can update classes" on public.classes
  using ((select staff_can('classes_students'::text)))
  with check ((select staff_can('classes_students'::text)));
alter policy "Staff can view classes" on public.classes
  using ((select is_staff()));
alter policy "Teachers can view their own classes" on public.classes
  using ((teacher_id = (select current_teacher_id())));

alter policy "Admins manage exam candidates" on public.exam_candidates
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Teachers view their assigned exam candidates" on public.exam_candidates
  using ((teacher_id = (select current_teacher_id())));

alter policy "Admins manage exam sessions" on public.exam_sessions
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Teachers view sessions they examine in" on public.exam_sessions
  using ((EXISTS ( SELECT 1
   FROM exam_candidates c
  WHERE ((c.session_id = exam_sessions.id) AND (c.teacher_id = (select current_teacher_id()))))));

alter policy "Admins view hifz tasks" on public.hifz_assignments
  using ((select is_admin()));
alter policy "Students create own hifz tasks" on public.hifz_assignments
  with check ((student_id = (select current_student_id())));
alter policy "Students read own hifz tasks" on public.hifz_assignments
  using ((student_id = (select current_student_id())));
alter policy "Students update own hifz tasks" on public.hifz_assignments
  using ((student_id = (select current_student_id())))
  with check ((student_id = (select current_student_id())));
alter policy "Teachers view their students' hifz tasks" on public.hifz_assignments
  using ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))));

alter policy "Admins manage hifz_exams" on public.hifz_exams
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Teachers manage their own hifz_exams" on public.hifz_exams
  using ((teacher_id = (select current_teacher_id())))
  with check ((teacher_id = (select current_teacher_id())));

alter policy "Admins manage hifz goals" on public.hifz_goals
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Students change own hifz goal" on public.hifz_goals
  using ((student_id = (select current_student_id())))
  with check ((student_id = (select current_student_id())));
alter policy "Students read own hifz goal" on public.hifz_goals
  using ((student_id = (select current_student_id())));
alter policy "Students set own hifz goal" on public.hifz_goals
  with check ((student_id = (select current_student_id())));
alter policy "Teachers manage their students' hifz goals" on public.hifz_goals
  using ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))))
  with check ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))));

alter policy "Admins manage hifz mistakes" on public.hifz_mistakes
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Students read own hifz mistakes" on public.hifz_mistakes
  using ((student_id = (select current_student_id())));
alter policy "Students tick own hifz mistakes" on public.hifz_mistakes
  using ((student_id = (select current_student_id())))
  with check ((student_id = (select current_student_id())));
alter policy "Teachers manage their students' hifz mistakes" on public.hifz_mistakes
  using ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))))
  with check ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))));

alter policy "Admins manage hifz profiles" on public.hifz_profiles
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Students read own hifz profile" on public.hifz_profiles
  using ((student_id = (select current_student_id())));
alter policy "Teachers manage their students' hifz profiles" on public.hifz_profiles
  using ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))))
  with check ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))));

alter policy "Admins view hifz settings" on public.hifz_settings
  using ((select is_admin()));
alter policy "Students create own hifz settings" on public.hifz_settings
  with check ((student_id = (select current_student_id())));
alter policy "Students read own hifz settings" on public.hifz_settings
  using ((student_id = (select current_student_id())));
alter policy "Students update own hifz settings" on public.hifz_settings
  using ((student_id = (select current_student_id())))
  with check ((student_id = (select current_student_id())));
alter policy "Teachers view their students' hifz settings" on public.hifz_settings
  using ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))));

alter policy "Admins manage hifz tasks" on public.hifz_tasks
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Students read own hifz tasks" on public.hifz_tasks
  using ((student_id = (select current_student_id())));
alter policy "Students tick own hifz tasks" on public.hifz_tasks
  using ((student_id = (select current_student_id())))
  with check ((student_id = (select current_student_id())));
alter policy "Teachers manage their students' hifz tasks" on public.hifz_tasks
  using ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))))
  with check ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))));

alter policy "Admins manage hifz test registrations" on public.hifz_test_registrations
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins manage the hifz test form" on public.hifz_test_settings
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins manage holidays" on public.holidays
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Anyone logged in can view holidays" on public.holidays
  using (((select auth.uid()) IS NOT NULL));
alter policy "Staff can view holidays" on public.holidays
  using ((select is_staff()));

alter policy "Admins manage the info form" on public.info_form_settings
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins manage investments" on public.investments
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins manage message templates" on public.message_templates
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins manage notification recipients" on public.notification_recipients
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Users read their own inbox" on public.notification_recipients
  using ((user_id = (select auth.uid())));

alter policy "Admins manage notifications" on public.notifications
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Recipients read their notifications" on public.notifications
  using ((send_in_app AND (EXISTS ( SELECT 1
   FROM notification_recipients r
  WHERE ((r.notification_id = notifications.id) AND (r.user_id = (select auth.uid())))))));

alter policy "Admins manage other_income" on public.other_income
  using ((select is_admin()));

alter policy "Admins manage payment slips" on public.payment_slips
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Staff manage payment slips" on public.payment_slips
  using ((select staff_can('payments'::text)))
  with check ((select staff_can('payments'::text)));
alter policy "Students submit their own slips" on public.payment_slips
  with check (((student_id = (select current_student_id())) AND (status = 'pending'::text) AND (reviewed_at IS NULL) AND (reject_reason IS NULL)));
alter policy "Students view their own slips" on public.payment_slips
  using ((student_id = (select current_student_id())));

alter policy "Admins manage all payments" on public.payments
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Staff can manage payments" on public.payments
  using ((select staff_can('payments'::text)))
  with check ((select staff_can('payments'::text)));
alter policy "Students view their own payments" on public.payments
  using ((student_id = (select current_student_id())));

alter policy "Admins can view all profiles" on public.profiles
  using ((select is_admin()));
alter policy "Users can view their own profile" on public.profiles
  using ((id = (select auth.uid())));

alter policy "Admins read devices" on public.push_subscriptions
  using ((select is_admin()));
alter policy "Admins remove devices" on public.push_subscriptions
  using ((select is_admin()));
alter policy "Users manage their own devices" on public.push_subscriptions
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));

alter policy "Admins open and close forms" on public.registration_forms
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins manage report wording" on public.report_translations
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins manage the review form" on public.review_form_settings
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins manage reviews" on public.reviews
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins manage website wording" on public.site_translations
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins manage SMS templates" on public.sms_templates
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins read student id history" on public.student_id_history
  using (((select is_admin()) OR (select is_staff())));

alter policy "Admins manage info updates" on public.student_info_updates
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins manage the motivation" on public.student_motivation
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins manage all students" on public.students
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Staff can add students" on public.students
  with check ((select staff_can('classes_students'::text)));
alter policy "Staff can update students" on public.students
  using ((select staff_can('classes_students'::text)))
  with check ((select staff_can('classes_students'::text)));
alter policy "Staff can view students" on public.students
  using ((select is_staff()));
alter policy "Students can view their own record" on public.students
  using ((user_id = (select auth.uid())));
alter policy "Teachers can reschedule their own students" on public.students
  using ((teacher_id = (select current_teacher_id())))
  with check ((teacher_id = (select current_teacher_id())));
alter policy "Teachers can view their own students" on public.students
  using ((teacher_id = (select current_teacher_id())));

alter policy "Admins manage tasks" on public.tasks
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Staff can update own task done state" on public.tasks
  using ((assigned_to = (select current_staff_id())))
  with check ((assigned_to = (select current_staff_id())));
alter policy "Staff can view own tasks" on public.tasks
  using ((assigned_to = (select current_staff_id())));

alter policy "Admins manage salary adjustments" on public.teacher_salary_adjustments
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins manage teacher_unmarked_dismissals" on public.teacher_unmarked_dismissals
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Teachers manage their own unmarked dismissals" on public.teacher_unmarked_dismissals
  using ((teacher_id = (select current_teacher_id())))
  with check ((teacher_id = (select current_teacher_id())));

alter policy "Admins manage all teachers" on public.teachers
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Staff can view teachers" on public.teachers
  using ((select is_staff()));
alter policy "Teachers can view their own record" on public.teachers
  using ((user_id = (select auth.uid())));

alter policy "Admins manage thilawa assessments" on public.thilawa_assessments
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Students read own thilawa assessments" on public.thilawa_assessments
  using ((student_id = (select current_student_id())));
alter policy "Teachers assess their students" on public.thilawa_assessments
  with check (((teacher_id = (select current_teacher_id())) AND (student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id()))))));
alter policy "Teachers remove their own assessments" on public.thilawa_assessments
  using ((teacher_id = (select current_teacher_id())));
alter policy "Teachers view their students' thilawa levels" on public.thilawa_assessments
  using ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))));

alter policy "Admins manage thilawa assignments" on public.thilawa_assignments
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Students read own thilawa assignments" on public.thilawa_assignments
  using ((student_id = (select current_student_id())));
alter policy "Students tick own thilawa assignments" on public.thilawa_assignments
  using ((student_id = (select current_student_id())))
  with check ((student_id = (select current_student_id())));
alter policy "Teachers change their students' reading" on public.thilawa_assignments
  using ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))))
  with check ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))));
alter policy "Teachers remove their students' reading" on public.thilawa_assignments
  using ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))));
alter policy "Teachers set reading for their students" on public.thilawa_assignments
  with check (((teacher_id = (select current_teacher_id())) AND (student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id()))))));
alter policy "Teachers view their students' thilawa assignments" on public.thilawa_assignments
  using ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))));

alter policy "Admins manage class readings" on public.thilawa_class_readings
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Students read their class reading" on public.thilawa_class_readings
  using ((class_id = (select current_student_class_id())));
alter policy "Teachers open class readings" on public.thilawa_class_readings
  with check ((teaches_class(class_id) AND (teacher_id = (select current_teacher_id()))));

alter policy "Admins manage class topics" on public.thilawa_class_topics
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Students read their class topics" on public.thilawa_class_topics
  using ((class_id = (select current_student_class_id())));
alter policy "Teachers add class topics" on public.thilawa_class_topics
  with check ((teaches_class(class_id) AND (teacher_id = (select current_teacher_id()))));

alter policy "Admins manage thilawa mistakes" on public.thilawa_mistakes
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Students read own thilawa mistakes" on public.thilawa_mistakes
  using ((student_id = (select current_student_id())));
alter policy "Students tick own thilawa mistakes" on public.thilawa_mistakes
  using ((student_id = (select current_student_id())))
  with check ((student_id = (select current_student_id())));
alter policy "Teachers manage their students' thilawa mistakes" on public.thilawa_mistakes
  using ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))))
  with check ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))));

alter policy "Admins manage thilawa notes" on public.thilawa_notes
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Students read notes shared with them" on public.thilawa_notes
  using (((student_id = (select current_student_id())) AND visible_to_student));
alter policy "Teachers edit their own notes" on public.thilawa_notes
  using ((teacher_id = (select current_teacher_id())))
  with check ((teacher_id = (select current_teacher_id())));
alter policy "Teachers remove their own notes" on public.thilawa_notes
  using ((teacher_id = (select current_teacher_id())));
alter policy "Teachers view their students' thilawa notes" on public.thilawa_notes
  using ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))));
alter policy "Teachers write notes for their students" on public.thilawa_notes
  with check (((teacher_id = (select current_teacher_id())) AND (student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id()))))));

alter policy "Admins manage thilawa reading" on public.thilawa_reading
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Students log own thilawa reading" on public.thilawa_reading
  with check (((student_id = (select current_student_id())) AND ((assignment_id IS NULL) OR (assignment_id IN ( SELECT a.id
   FROM thilawa_assignments a
  WHERE (a.student_id = (select current_student_id())))))));
alter policy "Students read own thilawa reading" on public.thilawa_reading
  using ((student_id = (select current_student_id())));
alter policy "Students undo recent thilawa reading" on public.thilawa_reading
  using (((student_id = (select current_student_id())) AND (created_at > (now() - '1 day'::interval))));
alter policy "Teachers view their students' thilawa reading" on public.thilawa_reading
  using ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))));

alter policy "Admins manage thilawa settings" on public.thilawa_settings
  using ((select is_admin()))
  with check ((select is_admin()));
alter policy "Students create own thilawa settings" on public.thilawa_settings
  with check ((student_id = (select current_student_id())));
alter policy "Students read own thilawa settings" on public.thilawa_settings
  using ((student_id = (select current_student_id())));
alter policy "Students update own thilawa settings" on public.thilawa_settings
  using ((student_id = (select current_student_id())))
  with check ((student_id = (select current_student_id())));
alter policy "Teachers view their students' thilawa settings" on public.thilawa_settings
  using ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = (select current_teacher_id())))));

alter policy "Admins manage unrecorded_dismissals" on public.unrecorded_dismissals
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins manage website classes" on public.web_classes
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins manage workshop registrations" on public.workshop_registrations
  using ((select is_admin()))
  with check ((select is_admin()));

-- 2. Indexes on foreign keys -------------------------------------------------

create index if not exists students_class_id_fk_idx on public.students (class_id);
create index if not exists students_teacher_id_fk_idx on public.students (teacher_id);
create index if not exists classes_teacher_id_fk_idx on public.classes (teacher_id);
create index if not exists attendance_records_teacher_id_fk_idx on public.attendance_records (teacher_id);
create index if not exists admin_staff_user_id_fk_idx on public.admin_staff (user_id);
create index if not exists tasks_assigned_to_fk_idx on public.tasks (assigned_to);
create index if not exists hifz_exams_teacher_id_fk_idx on public.hifz_exams (teacher_id);
create index if not exists exam_candidates_report_id_fk_idx on public.exam_candidates (report_id);
create index if not exists notification_recipients_student_id_fk_idx on public.notification_recipients (student_id);
create index if not exists notification_recipients_teacher_id_fk_idx on public.notification_recipients (teacher_id);
create index if not exists class_registrations_class_id_fk_idx on public.class_registrations (class_id);
create index if not exists class_registrations_student_id_fk_idx on public.class_registrations (student_id);
create index if not exists class_registrations_web_class_id_fk_idx on public.class_registrations (web_class_id);
create index if not exists student_info_updates_student_id_fk_idx on public.student_info_updates (student_id);
create index if not exists thilawa_assignments_teacher_id_fk_idx on public.thilawa_assignments (teacher_id);
create index if not exists thilawa_reading_assignment_id_fk_idx on public.thilawa_reading (assignment_id);
create index if not exists thilawa_assessments_teacher_id_fk_idx on public.thilawa_assessments (teacher_id);
create index if not exists thilawa_notes_teacher_id_fk_idx on public.thilawa_notes (teacher_id);
create index if not exists hifz_profiles_updated_by_fk_idx on public.hifz_profiles (updated_by);
create index if not exists hifz_tasks_teacher_id_fk_idx on public.hifz_tasks (teacher_id);
create index if not exists hifz_mistakes_teacher_id_fk_idx on public.hifz_mistakes (teacher_id);
create index if not exists hifz_mistakes_task_id_fk_idx on public.hifz_mistakes (task_id);
create index if not exists thilawa_mistakes_teacher_id_fk_idx on public.thilawa_mistakes (teacher_id);
create index if not exists thilawa_class_readings_teacher_id_fk_idx on public.thilawa_class_readings (teacher_id);
create index if not exists thilawa_class_topics_teacher_id_fk_idx on public.thilawa_class_topics (teacher_id);

-- 3. Check -------------------------------------------------------------------
-- Stop (and undo all of the above) unless every rule is the same as before
-- apart from the (select ...) wrapping, and no helper call was left bare.
do $$
declare
  wrapped constant text := '\( SELECT ((auth\.uid|is_admin|is_staff|current_teacher_id|current_student_id|current_student_class_id|current_staff_id|staff_can)\([^()]*\)) AS [a-z_]+\)';
  bare constant text := '(auth\.uid|is_admin|is_staff|current_teacher_id|current_student_id|current_student_class_id|current_staff_id|staff_can)\(';
  bad text;
begin
  select string_agg(coalesce(a.tablename, b.tablename) || ': ' || coalesce(a.policyname, b.policyname), ', ') into bad
  from _rules_before b
  full join (select * from pg_policies where schemaname = 'public') a
    on a.tablename = b.tablename and a.policyname = b.policyname
  where a.policyname is null or b.policyname is null
     or a.cmd is distinct from b.cmd or a.roles is distinct from b.roles or a.permissive is distinct from b.permissive
     or regexp_replace(a.qual, wrapped, '\1', 'g') is distinct from b.qual
     or regexp_replace(a.with_check, wrapped, '\1', 'g') is distinct from b.with_check
     or regexp_replace(coalesce(a.qual, '') || ' ' || coalesce(a.with_check, ''), wrapped, '', 'g') ~ bare;
  if bad is not null then
    raise exception 'Security rules changed more than intended: %', bad;
  end if;
end $$;
