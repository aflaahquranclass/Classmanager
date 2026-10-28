-- Student portal: a signed-in student can read (never change) their own
-- payments and attendance records. current_student_id() comes from
-- 20261023_hifz_tracker.sql.

create policy "Students view their own payments" on public.payments for select
  to authenticated using (student_id = public.current_student_id());

create policy "Students view their own attendance" on public.attendance_records for select
  to authenticated using (student_id = public.current_student_id());
