-- Student portal "Pay now": the student transfers the fee to the class's BML
-- account and uploads the transfer slip. The admin checks it under
-- Finance → Payment slips; approving it marks that month paid in payments.

create table public.payment_slips (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  amount numeric not null check (amount > 0),
  file_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index payment_slips_student_idx on public.payment_slips (student_id, created_at desc);
create index payment_slips_pending_idx on public.payment_slips (created_at) where status = 'pending';

alter table public.payment_slips enable row level security;

create policy "Students view their own slips" on public.payment_slips for select
  to authenticated using (student_id = public.current_student_id());
-- Students can only file new, pending slips for themselves — never review them.
create policy "Students submit their own slips" on public.payment_slips for insert
  to authenticated with check (student_id = public.current_student_id() and status = 'pending' and reviewed_at is null and reject_reason is null);
create policy "Admins manage payment slips" on public.payment_slips for all
  using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage payment slips" on public.payment_slips for all
  using (public.staff_can('payments')) with check (public.staff_can('payments'));

-- Slip images / PDFs, private. Files live under <student_id>/…
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-slips', 'payment-slips', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

create policy "Students upload their own slips" on storage.objects for insert
  to authenticated with check (bucket_id = 'payment-slips' and (storage.foldername(name))[1] = public.current_student_id()::text);
create policy "Students view their own slip files" on storage.objects for select
  to authenticated using (bucket_id = 'payment-slips' and (storage.foldername(name))[1] = public.current_student_id()::text);
create policy "Admins and payment staff view slip files" on storage.objects for select
  to authenticated using (bucket_id = 'payment-slips' and (public.is_admin() or public.staff_can('payments')));
create policy "Admins delete slip files" on storage.objects for delete
  to authenticated using (bucket_id = 'payment-slips' and public.is_admin());
