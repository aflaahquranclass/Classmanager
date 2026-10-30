-- Students tick off their own mistakes (runs after 20261107_hifz_new_per_day.sql).
-- The student's "Mistakes from your last lesson" list shows the words the
-- teacher marked; when the student has fixed one they tick it and it leaves
-- their list. The teacher's mark stays on the Mushaf until the teacher clears
-- it (corrected_at), so the teacher can still check it.

alter table public.hifz_mistakes add column if not exists student_ticked_at timestamptz;

-- Students only tick or untick; the rest stays as the teacher set it.
create or replace function public.hifz_mistakes_limit_edits()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ticked timestamptz;
begin
  if auth.uid() is null or public.is_admin() or public.current_teacher_id() is not null then
    return new;
  end if;
  v_ticked := new.student_ticked_at;
  new := old;
  new.student_ticked_at := v_ticked;
  return new;
end $$;
revoke all on function public.hifz_mistakes_limit_edits() from public, anon, authenticated;
create trigger hifz_mistakes_limit_edits before update on public.hifz_mistakes
  for each row execute function public.hifz_mistakes_limit_edits();

create policy "Students tick own hifz mistakes" on public.hifz_mistakes
  for update using (student_id = public.current_student_id()) with check (student_id = public.current_student_id());
