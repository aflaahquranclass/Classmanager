-- Finance → Salaries: the admin can change a teacher's salary for a month
-- (an amount added or taken off, with a reason) and give a bonus. Both show on
-- the salary sheet sent to the teacher. Admins only.

create table if not exists public.teacher_salary_adjustments (
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  month text not null,
  adjustment numeric not null default 0,
  adjustment_note text,
  bonus numeric not null default 0,
  bonus_note text,
  updated_at timestamptz not null default now(),
  primary key (teacher_id, month)
);

alter table public.teacher_salary_adjustments enable row level security;

create policy "Admins manage salary adjustments" on public.teacher_salary_adjustments
  for all using (public.is_admin()) with check (public.is_admin());
