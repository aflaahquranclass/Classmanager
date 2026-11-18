-- Student portal launch: tighter security and one rule per table and action,
-- before 100+ students get their logins. Runs after 20261124_faster_security_rules.sql.
--
-- Apply AFTER deploying the app built from the same commit: the new portal
-- reads the student's own record through my_student() (below), and falls
-- back to the old way while this migration isn't applied yet. The old app
-- would not find the student once the old rule is gone.
--
-- 1. Security rules (row-level security), one per table and action, for
--    signed-in users only. Before, most tables had two to four rules for the
--    same action (admin, teacher, student) and every rule applied to every
--    database role, signed-out visitors included. Postgres checks every rule
--    that applies, so each rule here is the old ones joined with OR — the
--    same rows are allowed, for the same people — and the rules no longer
--    run for signed-out requests (they matched nothing there anyway: each
--    one needs a signed-in admin, teacher or student). The only rules left
--    for signed-out visitors are the two the public website needs: website
--    wording and which registration forms are open.
--    Taken from the live database on 2026-11-17 (each rule lists the ones it
--    replaces). One change in who sees what: a student no longer reads their
--    whole students row (which holds the teacher's share of the fee); see 2.
-- 2. my_student(): the signed-in student's own record, only the parts the
--    portal shows (name, Student ID, class, fee, joined month, programs).
-- 3. Functions: the admin, teacher and student helpers can't be called by
--    signed-out visitors any more, trigger functions can't be called
--    directly at all, and six functions get a fixed search_path.
-- 4. New logins get the least-privileged role ('student') instead of
--    'teacher'. Teacher and staff logins get their role when the admin links
--    them, as before; a stray login can no longer pass as a teacher (the
--    Worker's /api/dhivehi lets teachers in by this role).
-- 5. The October backup tables can't be read through the API at all.

-- 1. Security rules -----------------------------------------------------------

-- The rules as they are now, to check against at the end.
create temp table _rules_before on commit drop as
  select tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public';

do $$
declare r record;
begin
  for r in select tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- was: Admins manage admin_staff; Staff can view own record
create policy "admin_staff: select" on public.admin_staff for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((user_id = ( SELECT auth.uid() AS uid))));

-- was: Admins manage admin_staff
create policy "admin_staff: insert" on public.admin_staff for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage admin_staff
create policy "admin_staff: update" on public.admin_staff for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin)))
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage admin_staff
create policy "admin_staff: delete" on public.admin_staff for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage attendance_followups
create policy "attendance_followups: admins" on public.attendance_followups for all to authenticated
  using (( SELECT is_admin() AS is_admin))
  with check (( SELECT is_admin() AS is_admin));

-- was: Admins manage all attendance records; Students view their own attendance; Teachers view their own attendance records
create policy "attendance_records: select" on public.attendance_records for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))));

-- was: Admins manage all attendance records; Teachers add their own students' attendance
create policy "attendance_records: insert" on public.attendance_records for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or (((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id)) AND (student_id IN ( SELECT s.id
   FROM students s
  WHERE (s.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id)))))));

-- was: Admins manage all attendance records; Teachers update their own students' attendance
create policy "attendance_records: update" on public.attendance_records for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))
  with check ((( SELECT is_admin() AS is_admin))
    or (((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id)) AND (student_id IN ( SELECT s.id
   FROM students s
  WHERE (s.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id)))))));

-- was: Admins manage all attendance records; Teachers remove their own attendance records
create policy "attendance_records: delete" on public.attendance_records for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))));

-- was: Admins manage class_expenses
create policy "class_expenses: admins" on public.class_expenses for all to authenticated
  using (( SELECT is_admin() AS is_admin))
  with check (( SELECT is_admin() AS is_admin));

-- was: Admins manage registrations
create policy "class_registrations: admins" on public.class_registrations for all to authenticated
  using (( SELECT is_admin() AS is_admin))
  with check (( SELECT is_admin() AS is_admin));

-- was: Admins manage all classes; Staff can view classes; Teachers can view their own classes
create policy "classes: select" on public.classes for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or (( SELECT is_staff() AS is_staff))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))));

-- was: Admins manage all classes; Staff can add classes
create policy "classes: insert" on public.classes for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or (( SELECT staff_can('classes_students'::text) AS staff_can)));

-- was: Admins manage all classes; Staff can update classes
create policy "classes: update" on public.classes for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or (( SELECT staff_can('classes_students'::text) AS staff_can)))
  with check ((( SELECT is_admin() AS is_admin))
    or (( SELECT staff_can('classes_students'::text) AS staff_can)));

-- was: Admins manage all classes
create policy "classes: delete" on public.classes for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage exam candidates; Teachers view their assigned exam candidates
create policy "exam_candidates: select" on public.exam_candidates for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))));

-- was: Admins manage exam candidates
create policy "exam_candidates: insert" on public.exam_candidates for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage exam candidates
create policy "exam_candidates: update" on public.exam_candidates for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin)))
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage exam candidates
create policy "exam_candidates: delete" on public.exam_candidates for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage exam sessions; Teachers view sessions they examine in
create policy "exam_sessions: select" on public.exam_sessions for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((EXISTS ( SELECT 1
   FROM exam_candidates c
  WHERE ((c.session_id = exam_sessions.id) AND (c.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id)))))));

-- was: Admins manage exam sessions
create policy "exam_sessions: insert" on public.exam_sessions for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage exam sessions
create policy "exam_sessions: update" on public.exam_sessions for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin)))
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage exam sessions
create policy "exam_sessions: delete" on public.exam_sessions for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin)));

-- was: Admins view hifz tasks; Students read own hifz tasks; Teachers view their students' hifz tasks
create policy "hifz_assignments: select" on public.hifz_assignments for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Students create own hifz tasks
create policy "hifz_assignments: insert" on public.hifz_assignments for INSERT to authenticated
  with check (((student_id = ( SELECT current_student_id() AS current_student_id))));

-- was: Students update own hifz tasks
create policy "hifz_assignments: update" on public.hifz_assignments for UPDATE to authenticated
  using (((student_id = ( SELECT current_student_id() AS current_student_id))))
  with check (((student_id = ( SELECT current_student_id() AS current_student_id))));

-- was: Admins manage hifz_exams; Teachers manage their own hifz_exams
create policy "hifz_exams: select" on public.hifz_exams for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))));

-- was: Admins manage hifz_exams; Teachers manage their own hifz_exams
create policy "hifz_exams: insert" on public.hifz_exams for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))));

-- was: Admins manage hifz_exams; Teachers manage their own hifz_exams
create policy "hifz_exams: update" on public.hifz_exams for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))
  with check ((( SELECT is_admin() AS is_admin))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))));

-- was: Admins manage hifz_exams; Teachers manage their own hifz_exams
create policy "hifz_exams: delete" on public.hifz_exams for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))));

-- was: Admins manage hifz goals; Students read own hifz goal; Teachers manage their students' hifz goals
create policy "hifz_goals: select" on public.hifz_goals for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage hifz goals; Students set own hifz goal; Teachers manage their students' hifz goals
create policy "hifz_goals: insert" on public.hifz_goals for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage hifz goals; Students change own hifz goal; Teachers manage their students' hifz goals
create policy "hifz_goals: update" on public.hifz_goals for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))))
  with check ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage hifz goals; Teachers manage their students' hifz goals
create policy "hifz_goals: delete" on public.hifz_goals for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage hifz mistakes; Students read own hifz mistakes; Teachers manage their students' hifz mistakes
create policy "hifz_mistakes: select" on public.hifz_mistakes for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage hifz mistakes; Teachers manage their students' hifz mistakes
create policy "hifz_mistakes: insert" on public.hifz_mistakes for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage hifz mistakes; Students tick own hifz mistakes; Teachers manage their students' hifz mistakes
create policy "hifz_mistakes: update" on public.hifz_mistakes for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))))
  with check ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage hifz mistakes; Teachers manage their students' hifz mistakes
create policy "hifz_mistakes: delete" on public.hifz_mistakes for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage hifz profiles; Students read own hifz profile; Teachers manage their students' hifz profiles
create policy "hifz_profiles: select" on public.hifz_profiles for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage hifz profiles; Teachers manage their students' hifz profiles
create policy "hifz_profiles: insert" on public.hifz_profiles for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage hifz profiles; Teachers manage their students' hifz profiles
create policy "hifz_profiles: update" on public.hifz_profiles for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))))
  with check ((( SELECT is_admin() AS is_admin))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage hifz profiles; Teachers manage their students' hifz profiles
create policy "hifz_profiles: delete" on public.hifz_profiles for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins view hifz settings; Students read own hifz settings; Teachers view their students' hifz settings
create policy "hifz_settings: select" on public.hifz_settings for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Students create own hifz settings
create policy "hifz_settings: insert" on public.hifz_settings for INSERT to authenticated
  with check (((student_id = ( SELECT current_student_id() AS current_student_id))));

-- was: Students update own hifz settings
create policy "hifz_settings: update" on public.hifz_settings for UPDATE to authenticated
  using (((student_id = ( SELECT current_student_id() AS current_student_id))))
  with check (((student_id = ( SELECT current_student_id() AS current_student_id))));

-- was: Admins manage hifz tasks; Students read own hifz tasks; Teachers manage their students' hifz tasks
create policy "hifz_tasks: select" on public.hifz_tasks for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage hifz tasks; Teachers manage their students' hifz tasks
create policy "hifz_tasks: insert" on public.hifz_tasks for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage hifz tasks; Students tick own hifz tasks; Teachers manage their students' hifz tasks
create policy "hifz_tasks: update" on public.hifz_tasks for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))))
  with check ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage hifz tasks; Teachers manage their students' hifz tasks
create policy "hifz_tasks: delete" on public.hifz_tasks for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage hifz test registrations
create policy "hifz_test_registrations: admins" on public.hifz_test_registrations for all to authenticated
  using (( SELECT is_admin() AS is_admin))
  with check (( SELECT is_admin() AS is_admin));

-- was: Admins manage the hifz test form
create policy "hifz_test_settings: admins" on public.hifz_test_settings for all to authenticated
  using (( SELECT is_admin() AS is_admin))
  with check (( SELECT is_admin() AS is_admin));

-- was: Admins manage holidays; Anyone logged in can view holidays; Staff can view holidays
create policy "holidays: select" on public.holidays for SELECT to authenticated
  using (true);

-- was: Admins manage holidays
create policy "holidays: insert" on public.holidays for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage holidays
create policy "holidays: update" on public.holidays for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin)))
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage holidays
create policy "holidays: delete" on public.holidays for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage the info form
create policy "info_form_settings: admins" on public.info_form_settings for all to authenticated
  using (( SELECT is_admin() AS is_admin))
  with check (( SELECT is_admin() AS is_admin));

-- was: Admins manage investments
create policy "investments: admins" on public.investments for all to authenticated
  using (( SELECT is_admin() AS is_admin))
  with check (( SELECT is_admin() AS is_admin));

-- was: Admins manage message templates
create policy "message_templates: admins" on public.message_templates for all to authenticated
  using (( SELECT is_admin() AS is_admin))
  with check (( SELECT is_admin() AS is_admin));

-- was: Admins manage notification recipients; Users read their own inbox
create policy "notification_recipients: select" on public.notification_recipients for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((user_id = ( SELECT auth.uid() AS uid))));

-- was: Admins manage notification recipients
create policy "notification_recipients: insert" on public.notification_recipients for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage notification recipients
create policy "notification_recipients: update" on public.notification_recipients for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin)))
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage notification recipients
create policy "notification_recipients: delete" on public.notification_recipients for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage notifications; Recipients read their notifications
create policy "notifications: select" on public.notifications for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((send_in_app AND (EXISTS ( SELECT 1
   FROM notification_recipients r
  WHERE ((r.notification_id = notifications.id) AND (r.user_id = ( SELECT auth.uid() AS uid))))))));

-- was: Admins manage notifications
create policy "notifications: insert" on public.notifications for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage notifications
create policy "notifications: update" on public.notifications for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin)))
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage notifications
create policy "notifications: delete" on public.notifications for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage other_income
create policy "other_income: admins" on public.other_income for all to authenticated
  using (( SELECT is_admin() AS is_admin))
  with check (( SELECT is_admin() AS is_admin));

-- was: Admins manage payment slips; Staff manage payment slips; Students view their own slips
create policy "payment_slips: select" on public.payment_slips for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or (( SELECT staff_can('payments'::text) AS staff_can))
    or ((student_id = ( SELECT current_student_id() AS current_student_id))));

-- was: Admins manage payment slips; Staff manage payment slips; Students submit their own slips
create policy "payment_slips: insert" on public.payment_slips for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or (( SELECT staff_can('payments'::text) AS staff_can))
    or (((student_id = ( SELECT current_student_id() AS current_student_id)) AND (status = 'pending'::text) AND (reviewed_at IS NULL) AND (reject_reason IS NULL))));

-- was: Admins manage payment slips; Staff manage payment slips
create policy "payment_slips: update" on public.payment_slips for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or (( SELECT staff_can('payments'::text) AS staff_can)))
  with check ((( SELECT is_admin() AS is_admin))
    or (( SELECT staff_can('payments'::text) AS staff_can)));

-- was: Admins manage payment slips; Staff manage payment slips
create policy "payment_slips: delete" on public.payment_slips for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or (( SELECT staff_can('payments'::text) AS staff_can)));

-- was: Admins manage all payments; Staff can manage payments; Students view their own payments
create policy "payments: select" on public.payments for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or (( SELECT staff_can('payments'::text) AS staff_can))
    or ((student_id = ( SELECT current_student_id() AS current_student_id))));

-- was: Admins manage all payments; Staff can manage payments
create policy "payments: insert" on public.payments for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or (( SELECT staff_can('payments'::text) AS staff_can)));

-- was: Admins manage all payments; Staff can manage payments
create policy "payments: update" on public.payments for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or (( SELECT staff_can('payments'::text) AS staff_can)))
  with check ((( SELECT is_admin() AS is_admin))
    or (( SELECT staff_can('payments'::text) AS staff_can)));

-- was: Admins manage all payments; Staff can manage payments
create policy "payments: delete" on public.payments for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or (( SELECT staff_can('payments'::text) AS staff_can)));

-- was: Admins can view all profiles; Users can view their own profile
create policy "profiles: select" on public.profiles for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((id = ( SELECT auth.uid() AS uid))));

-- was: Admins read devices; Users manage their own devices
create policy "push_subscriptions: select" on public.push_subscriptions for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((user_id = ( SELECT auth.uid() AS uid))));

-- was: Users manage their own devices
create policy "push_subscriptions: insert" on public.push_subscriptions for INSERT to authenticated
  with check (((user_id = ( SELECT auth.uid() AS uid))));

-- was: Users manage their own devices
create policy "push_subscriptions: update" on public.push_subscriptions for UPDATE to authenticated
  using (((user_id = ( SELECT auth.uid() AS uid))))
  with check (((user_id = ( SELECT auth.uid() AS uid))));

-- was: Admins remove devices; Users manage their own devices
create policy "push_subscriptions: delete" on public.push_subscriptions for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((user_id = ( SELECT auth.uid() AS uid))));

-- was: Admins open and close forms; Anyone can see which forms are open
create policy "registration_forms: select" on public.registration_forms for SELECT to authenticated
  using (true);

-- was: Admins open and close forms
create policy "registration_forms: insert" on public.registration_forms for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins open and close forms
create policy "registration_forms: update" on public.registration_forms for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin)))
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins open and close forms
create policy "registration_forms: delete" on public.registration_forms for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage report wording; Signed-in users read report wording
create policy "report_translations: select" on public.report_translations for SELECT to authenticated
  using (true);

-- was: Admins manage report wording
create policy "report_translations: insert" on public.report_translations for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage report wording
create policy "report_translations: update" on public.report_translations for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin)))
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage report wording
create policy "report_translations: delete" on public.report_translations for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage the review form
create policy "review_form_settings: admins" on public.review_form_settings for all to authenticated
  using (( SELECT is_admin() AS is_admin))
  with check (( SELECT is_admin() AS is_admin));

-- was: Admins manage reviews
create policy "reviews: admins" on public.reviews for all to authenticated
  using (( SELECT is_admin() AS is_admin))
  with check (( SELECT is_admin() AS is_admin));

-- was: Admins manage website wording; Anyone reads website wording
create policy "site_translations: select" on public.site_translations for SELECT to authenticated
  using (true);

-- was: Admins manage website wording
create policy "site_translations: insert" on public.site_translations for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage website wording
create policy "site_translations: update" on public.site_translations for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin)))
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage website wording
create policy "site_translations: delete" on public.site_translations for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage SMS templates
create policy "sms_templates: admins" on public.sms_templates for all to authenticated
  using (( SELECT is_admin() AS is_admin))
  with check (( SELECT is_admin() AS is_admin));

-- was: Admins read student id history
create policy "student_id_history: select" on public.student_id_history for SELECT to authenticated
  using (((( SELECT is_admin() AS is_admin) OR ( SELECT is_staff() AS is_staff))));

-- was: Admins manage info updates
create policy "student_info_updates: admins" on public.student_info_updates for all to authenticated
  using (( SELECT is_admin() AS is_admin))
  with check (( SELECT is_admin() AS is_admin));

-- was: Admins manage the motivation; Signed-in users read the motivation
create policy "student_motivation: select" on public.student_motivation for SELECT to authenticated
  using (true);

-- was: Admins manage the motivation
create policy "student_motivation: insert" on public.student_motivation for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage the motivation
create policy "student_motivation: update" on public.student_motivation for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin)))
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage the motivation
create policy "student_motivation: delete" on public.student_motivation for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage all students; Staff can view students; Teachers can view their own students
create policy "students: select" on public.students for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or (( SELECT is_staff() AS is_staff))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))));

-- was: Admins manage all students; Staff can add students
create policy "students: insert" on public.students for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or (( SELECT staff_can('classes_students'::text) AS staff_can)));

-- was: Admins manage all students; Staff can update students; Teachers can reschedule their own students
create policy "students: update" on public.students for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or (( SELECT staff_can('classes_students'::text) AS staff_can))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))
  with check ((( SELECT is_admin() AS is_admin))
    or (( SELECT staff_can('classes_students'::text) AS staff_can))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))));

-- was: Admins manage all students
create policy "students: delete" on public.students for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage tasks; Staff can view own tasks
create policy "tasks: select" on public.tasks for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((assigned_to = ( SELECT current_staff_id() AS current_staff_id))));

-- was: Admins manage tasks
create policy "tasks: insert" on public.tasks for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage tasks; Staff can update own task done state
create policy "tasks: update" on public.tasks for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((assigned_to = ( SELECT current_staff_id() AS current_staff_id))))
  with check ((( SELECT is_admin() AS is_admin))
    or ((assigned_to = ( SELECT current_staff_id() AS current_staff_id))));

-- was: Admins manage tasks
create policy "tasks: delete" on public.tasks for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage salary adjustments
create policy "teacher_salary_adjustments: admins" on public.teacher_salary_adjustments for all to authenticated
  using (( SELECT is_admin() AS is_admin))
  with check (( SELECT is_admin() AS is_admin));

-- was: Admins manage teacher_unmarked_dismissals; Teachers manage their own unmarked dismissals
create policy "teacher_unmarked_dismissals: select" on public.teacher_unmarked_dismissals for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))));

-- was: Admins manage teacher_unmarked_dismissals; Teachers manage their own unmarked dismissals
create policy "teacher_unmarked_dismissals: insert" on public.teacher_unmarked_dismissals for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))));

-- was: Admins manage teacher_unmarked_dismissals; Teachers manage their own unmarked dismissals
create policy "teacher_unmarked_dismissals: update" on public.teacher_unmarked_dismissals for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))
  with check ((( SELECT is_admin() AS is_admin))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))));

-- was: Admins manage teacher_unmarked_dismissals; Teachers manage their own unmarked dismissals
create policy "teacher_unmarked_dismissals: delete" on public.teacher_unmarked_dismissals for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))));

-- was: Admins manage all teachers; Staff can view teachers; Teachers can view their own record
create policy "teachers: select" on public.teachers for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or (( SELECT is_staff() AS is_staff))
    or ((user_id = ( SELECT auth.uid() AS uid))));

-- was: Admins manage all teachers
create policy "teachers: insert" on public.teachers for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage all teachers
create policy "teachers: update" on public.teachers for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin)))
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage all teachers
create policy "teachers: delete" on public.teachers for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage thilawa assessments; Students read own thilawa assessments; Teachers view their students' thilawa levels
create policy "thilawa_assessments: select" on public.thilawa_assessments for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage thilawa assessments; Teachers assess their students
create policy "thilawa_assessments: insert" on public.thilawa_assessments for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or (((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id)) AND (student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id)))))));

-- was: Admins manage thilawa assessments
create policy "thilawa_assessments: update" on public.thilawa_assessments for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin)))
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage thilawa assessments; Teachers remove their own assessments
create policy "thilawa_assessments: delete" on public.thilawa_assessments for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))));

-- was: Admins manage thilawa assignments; Students read own thilawa assignments; Teachers view their students' thilawa assignments
create policy "thilawa_assignments: select" on public.thilawa_assignments for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage thilawa assignments; Teachers set reading for their students
create policy "thilawa_assignments: insert" on public.thilawa_assignments for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or (((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id)) AND (student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id)))))));

-- was: Admins manage thilawa assignments; Students tick own thilawa assignments; Teachers change their students' reading
create policy "thilawa_assignments: update" on public.thilawa_assignments for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))))
  with check ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage thilawa assignments; Teachers remove their students' reading
create policy "thilawa_assignments: delete" on public.thilawa_assignments for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage class readings; Students read their class reading; Teachers read their class readings
create policy "thilawa_class_readings: select" on public.thilawa_class_readings for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((class_id = ( SELECT current_student_class_id() AS current_student_class_id)))
    or (teaches_class(class_id)));

-- was: Admins manage class readings; Teachers open class readings
create policy "thilawa_class_readings: insert" on public.thilawa_class_readings for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or ((teaches_class(class_id) AND (teacher_id = ( SELECT current_teacher_id() AS current_teacher_id)))));

-- was: Admins manage class readings; Teachers change class readings
create policy "thilawa_class_readings: update" on public.thilawa_class_readings for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or (teaches_class(class_id)))
  with check ((( SELECT is_admin() AS is_admin))
    or (teaches_class(class_id)));

-- was: Admins manage class readings; Teachers remove class readings
create policy "thilawa_class_readings: delete" on public.thilawa_class_readings for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or (teaches_class(class_id)));

-- was: Admins manage class topics; Students read their class topics; Teachers read their class topics
create policy "thilawa_class_topics: select" on public.thilawa_class_topics for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((class_id = ( SELECT current_student_class_id() AS current_student_class_id)))
    or (teaches_class(class_id)));

-- was: Admins manage class topics; Teachers add class topics
create policy "thilawa_class_topics: insert" on public.thilawa_class_topics for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or ((teaches_class(class_id) AND (teacher_id = ( SELECT current_teacher_id() AS current_teacher_id)))));

-- was: Admins manage class topics; Teachers change class topics
create policy "thilawa_class_topics: update" on public.thilawa_class_topics for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or (teaches_class(class_id)))
  with check ((( SELECT is_admin() AS is_admin))
    or (teaches_class(class_id)));

-- was: Admins manage class topics; Teachers remove class topics
create policy "thilawa_class_topics: delete" on public.thilawa_class_topics for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or (teaches_class(class_id)));

-- was: Admins manage thilawa mistakes; Students read own thilawa mistakes; Teachers manage their students' thilawa mistakes
create policy "thilawa_mistakes: select" on public.thilawa_mistakes for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage thilawa mistakes; Teachers manage their students' thilawa mistakes
create policy "thilawa_mistakes: insert" on public.thilawa_mistakes for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage thilawa mistakes; Students tick own thilawa mistakes; Teachers manage their students' thilawa mistakes
create policy "thilawa_mistakes: update" on public.thilawa_mistakes for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))))
  with check ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage thilawa mistakes; Teachers manage their students' thilawa mistakes
create policy "thilawa_mistakes: delete" on public.thilawa_mistakes for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage thilawa notes; Students read notes shared with them; Teachers view their students' thilawa notes
create policy "thilawa_notes: select" on public.thilawa_notes for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or (((student_id = ( SELECT current_student_id() AS current_student_id)) AND visible_to_student))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage thilawa notes; Teachers write notes for their students
create policy "thilawa_notes: insert" on public.thilawa_notes for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or (((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id)) AND (student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id)))))));

-- was: Admins manage thilawa notes; Teachers edit their own notes
create policy "thilawa_notes: update" on public.thilawa_notes for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))
  with check ((( SELECT is_admin() AS is_admin))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))));

-- was: Admins manage thilawa notes; Teachers remove their own notes
create policy "thilawa_notes: delete" on public.thilawa_notes for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))));

-- was: Admins manage thilawa reading; Students read own thilawa reading; Teachers view their students' thilawa reading
create policy "thilawa_reading: select" on public.thilawa_reading for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage thilawa reading; Students log own thilawa reading
create policy "thilawa_reading: insert" on public.thilawa_reading for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or (((student_id = ( SELECT current_student_id() AS current_student_id)) AND ((assignment_id IS NULL) OR (assignment_id IN ( SELECT a.id
   FROM thilawa_assignments a
  WHERE (a.student_id = ( SELECT current_student_id() AS current_student_id))))))));

-- was: Admins manage thilawa reading
create policy "thilawa_reading: update" on public.thilawa_reading for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin)))
  with check ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage thilawa reading; Students undo recent thilawa reading
create policy "thilawa_reading: delete" on public.thilawa_reading for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or (((student_id = ( SELECT current_student_id() AS current_student_id)) AND (created_at > (now() - '1 day'::interval)))));

-- was: Admins manage thilawa settings; Students read own thilawa settings; Teachers view their students' thilawa settings
create policy "thilawa_settings: select" on public.thilawa_settings for SELECT to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id)))
    or ((student_id IN ( SELECT students.id
   FROM students
  WHERE (students.teacher_id = ( SELECT current_teacher_id() AS current_teacher_id))))));

-- was: Admins manage thilawa settings; Students create own thilawa settings
create policy "thilawa_settings: insert" on public.thilawa_settings for INSERT to authenticated
  with check ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id))));

-- was: Admins manage thilawa settings; Students update own thilawa settings
create policy "thilawa_settings: update" on public.thilawa_settings for UPDATE to authenticated
  using ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id))))
  with check ((( SELECT is_admin() AS is_admin))
    or ((student_id = ( SELECT current_student_id() AS current_student_id))));

-- was: Admins manage thilawa settings
create policy "thilawa_settings: delete" on public.thilawa_settings for DELETE to authenticated
  using ((( SELECT is_admin() AS is_admin)));

-- was: Admins manage unrecorded_dismissals
create policy "unrecorded_dismissals: admins" on public.unrecorded_dismissals for all to authenticated
  using (( SELECT is_admin() AS is_admin))
  with check (( SELECT is_admin() AS is_admin));

-- was: Admins manage website classes
create policy "web_classes: admins" on public.web_classes for all to authenticated
  using (( SELECT is_admin() AS is_admin))
  with check (( SELECT is_admin() AS is_admin));

-- was: Admins manage workshop registrations
create policy "workshop_registrations: admins" on public.workshop_registrations for all to authenticated
  using (( SELECT is_admin() AS is_admin))
  with check (( SELECT is_admin() AS is_admin));

-- Signed-out visitors (the public website).
create policy "registration_forms: anyone reads" on public.registration_forms for select to anon using (true);
create policy "site_translations: anyone reads" on public.site_translations for select to anon using (true);

-- Check: every table that had rules still has them, no rule is left for every
-- role, and only the two website tables are open to signed-out visitors.
do $$
declare v text;
begin
  select string_agg(distinct b.tablename, ', ') into v from _rules_before b
    where not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = b.tablename);
  if v is not null then raise exception 'Tables left without rules: %', v; end if;
  select string_agg(tablename || ' ' || policyname, ', ') into v from pg_policies
    where schemaname = 'public' and (roles && array['public']::name[] or (roles && array['anon']::name[] and tablename not in ('registration_forms', 'site_translations')));
  if v is not null then raise exception 'Rules still open to signed-out visitors: %', v; end if;
end $$;

-- 2. The student's own record ---------------------------------------------------

create or replace function public.my_student()
returns table (id uuid, name text, student_code text, class_id uuid, class_name text, fee numeric, joined_month text, programs text[])
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.student_code, s.class_id, s.class_name, s.fee, s.joined_month, s.programs
  from public.students s where s.user_id = auth.uid();
$$;
comment on function public.my_student() is 'The signed-in student''s own record, as the student portal shows it.';

-- 3. Functions -----------------------------------------------------------------

alter function public.current_staff_id() set search_path = public;
alter function public.is_staff() set search_path = public;
alter function public.staff_can(text) set search_path = public;
alter function public.admin_link_staff_by_email(uuid, text) set search_path = public, auth;
alter function public.students_keep_code() set search_path = public;
alter function public.workshop_fee(text) set search_path = public;

-- Signed-in only (each checks who is calling, or only answers about the caller).
do $$
declare f text;
begin
  foreach f in array array[
    'accept_registration(uuid, uuid, numeric)', 'admin_link_staff_by_email(uuid, text)', 'admin_link_student_by_email(uuid, text)',
    'admin_link_teacher_by_email(uuid, text)', 'complete_exam_candidate(uuid, uuid)', 'current_staff_id()', 'current_student_class_id()',
    'current_student_id()', 'current_teacher_id()', 'is_admin()', 'is_staff()', 'staff_can(text)', 'teaches_class(uuid)',
    'mark_notifications_read(uuid[])', 'my_exam_schedule()', 'save_push_subscription(text, text, text, text)', 'my_student()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- Trigger functions: run by their triggers only.
  foreach f in array array[
    'handle_new_user()', 'hifz_assignments_lock_keys()', 'students_assign_code()', 'students_keep_code()', 'students_track_code()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
-- Still open to signed-out callers on purpose: the website's forms and lists
-- (submit_*, *_form_status, hifz_test_form_open, public_class_times,
-- public_reviews, registration_slip_upload_allowed) and forget_push_endpoints
-- (the Worker, with the shared secret).

-- 4. New logins ----------------------------------------------------------------

alter table public.profiles alter column role set default 'student';

-- 5. Backup tables ---------------------------------------------------------------

revoke all on table public.students_code_backup_2026_10, public.students_backup_unassigned_2026_10,
  public.attendance_backup_unassigned_2026_10, public.payments_backup_before_2026_10 from anon, authenticated;
