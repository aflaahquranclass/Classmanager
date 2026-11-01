-- Removing a student who left used to delete their payments with them
-- (ON DELETE CASCADE), so a fee they paid in the month they left dropped out
-- of Finance: fees collected, Salary on paid fees and the salary sheets.
-- Their payments now stay. Just before the student is removed, each payment
-- keeps who they were (name, Student ID, teacher, share %, class, fee) and
-- loses only the link to the student.

alter table public.payments
  alter column student_id drop not null,
  add column if not exists student_name text,
  add column if not exists student_code text,
  add column if not exists teacher_id uuid,
  add column if not exists teacher_share_percent numeric,
  add column if not exists class_id uuid,
  add column if not exists class_name text,
  add column if not exists fee numeric;

alter table public.payments drop constraint payments_student_id_fkey;
alter table public.payments add constraint payments_student_id_fkey
  foreign key (student_id) references public.students(id) on delete set null;

create or replace function public.payments_keep_removed_student()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.payments set
    student_name = old.name,
    student_code = old.student_code,
    teacher_id = old.teacher_id,
    teacher_share_percent = old.teacher_share_percent,
    class_id = old.class_id,
    class_name = old.class_name,
    fee = old.fee
  where student_id = old.id;
  return old;
end;
$$;
revoke all on function public.payments_keep_removed_student() from public, anon, authenticated;

drop trigger if exists payments_keep_removed_student on public.students;
create trigger payments_keep_removed_student before delete on public.students
  for each row execute function public.payments_keep_removed_student();
