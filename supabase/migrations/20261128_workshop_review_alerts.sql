-- Tells the admins (in the app and by push, through alert_admins) each time
-- someone sends the workshop review form, with how many answers there are now.
-- Runs after 20261126_workshop_reviews.sql.

create or replace function public.alert_admins_new_workshop_review()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  n int;
begin
  select count(*) into n from workshop_reviews where workshop = new.workshop;
  perform alert_admins(
    'New workshop review',
    'Someone filled in the workshop review form (' || n || ' '
      || case when n = 1 then 'answer' else 'answers' end
      || ' so far). See Admin → Reviews → Workshop reviews.',
    'Workshop review'
  );
  return null;
end;
$$;
revoke all on function public.alert_admins_new_workshop_review() from public, anon, authenticated;

drop trigger if exists alert_admins_new_workshop_review on public.workshop_reviews;
create trigger alert_admins_new_workshop_review after insert on public.workshop_reviews
  for each row execute function public.alert_admins_new_workshop_review();
