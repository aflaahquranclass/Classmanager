-- Row-level security check for the Hifz Tracker tables.
-- Runs entirely inside one DO block and finishes by raising an exception with
-- the results, so everything it does is rolled back: no data is left behind.
-- Expected output: "HIFZ RLS RESULTS: own_read=1 other_read=0 other_insert=blocked
-- other_update=0 own_update=1 over_target=blocked delete=0 key_change=blocked".
do $$
declare
  a uuid; b uuid; u uuid; a_task uuid; b_task uuid;
  own_read int; other_read int; other_update int; own_update int; deleted int;
  other_insert text := 'allowed'; over_target text := 'allowed'; key_change text := 'allowed';
begin
  select id into a from public.students order by created_at limit 1;
  select id into b from public.students where id <> a order by created_at limit 1;
  select id into u from auth.users limit 1;

  -- Temporarily link student A to a login (rolled back at the end).
  update public.students set user_id = null where user_id = u;
  update public.students set user_id = u where id = a;

  insert into public.hifz_assignments (student_id, plan_date, activity, target, segments, status)
    values (a, '2026-10-26', 'new', 60, '[[1320,1380]]', 'pending') returning id into a_task;
  insert into public.hifz_assignments (student_id, plan_date, activity, target, segments, status)
    values (b, '2026-10-26', 'new', 60, '[[1320,1380]]', 'pending') returning id into b_task;

  -- Act as student A.
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into own_read from public.hifz_assignments where id = a_task;
  select count(*) into other_read from public.hifz_assignments where id = b_task;

  begin
    insert into public.hifz_assignments (student_id, plan_date, activity, target, segments, status)
      values (b, '2026-10-27', 'new', 60, '[]', 'empty');
  exception when others then other_insert := 'blocked';
  end;

  update public.hifz_assignments set completed = '[]' where id = b_task;
  get diagnostics other_update = row_count;
  update public.hifz_assignments set completed = '[[1320,1350]]', status = 'partial' where id = a_task;
  get diagnostics own_update = row_count;

  begin
    update public.hifz_assignments set segments = '[[1320,1410]]' where id = a_task; -- 90 units > 60 target
  exception when others then over_target := 'blocked';
  end;

  begin
    update public.hifz_assignments set plan_date = '2026-10-01' where id = a_task;
  exception when others then key_change := 'blocked';
  end;

  delete from public.hifz_assignments where id = a_task;
  get diagnostics deleted = row_count;

  execute 'reset role';
  raise exception 'HIFZ RLS RESULTS: own_read=% other_read=% other_insert=% other_update=% own_update=% over_target=% delete=% key_change=%',
    own_read, other_read, other_insert, other_update, own_update, over_target, deleted, key_change;
end $$;
