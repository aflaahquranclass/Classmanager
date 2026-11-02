-- New students start with a 60% teacher share: students added any other way
-- (the column default) and students added by accepting a website
-- registration (accept_registration used 0). Students already in the app keep
-- the share they have.

alter table public.students alter column teacher_share_percent set default 60;

do $$
declare
  d text := pg_get_functiondef('public.accept_registration(uuid,uuid,numeric)'::regprocedure);
begin
  if position(', c.teacher_id, 0,' in d) = 0 then
    raise exception 'accept_registration has changed; update the share by hand';
  end if;
  execute replace(d, ', c.teacher_id, 0,', ', c.teacher_id, 60,');
end;
$$;
