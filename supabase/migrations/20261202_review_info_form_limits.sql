-- The class review form and the student info update form: limits against
-- floods, like the other public forms (registrations, workshop sign-ups, the
-- hifz test, store orders, workshop reviews). Anyone with a form's link can
-- send it without signing in, so without a limit a script could fill the
-- admin's lists (and their phone alerts) with junk.
--
-- At most 120 reviews / 300 info updates an hour from the whole site, and 5
-- an hour from one Viber number. Past that the form says it couldn't send.

create or replace function public.submit_review(p_key text, p_name text, p_viber text, p_class_name text, p_rating smallint, p_comment text, p_request text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_digits text := regexp_replace(coalesce(p_viber, ''), '[^0-9]', '', 'g');
begin
  if not exists (select 1 from public.review_form_settings where id = 1 and is_open and form_key = p_key) then
    raise exception 'review form link is closed or invalid' using errcode = 'P0001';
  end if;
  if (select count(*) from public.reviews where created_at > now() - interval '1 hour') >= 120 then
    raise exception 'too many reviews, try again later' using errcode = 'P0001';
  end if;
  if (select count(*) from public.reviews
      where created_at > now() - interval '1 hour'
        and regexp_replace(viber, '[^0-9]', '', 'g') = v_digits) >= 5 then
    raise exception 'too many reviews, try again later' using errcode = 'P0001';
  end if;
  insert into public.reviews (name, viber, class_name, rating, comment, request)
  values (btrim(p_name), btrim(p_viber), btrim(p_class_name), p_rating, btrim(p_comment), nullif(btrim(p_request), ''));
end;
$function$;

create or replace function public.submit_student_info(p_key text, p_name text, p_nic text, p_atoll_island text, p_viber text, p_email text, p_student_code text, p_class_name text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_digits text := regexp_replace(coalesce(p_viber, ''), '[^0-9]', '', 'g');
begin
  if not exists (select 1 from info_form_settings where id = 1 and is_open and form_key = p_key) then
    raise exception 'info form link is closed or invalid' using errcode = 'P0001';
  end if;
  if (select count(*) from student_info_updates where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'too many updates, try again later' using errcode = 'P0001';
  end if;
  if (select count(*) from student_info_updates
      where created_at > now() - interval '1 hour'
        and regexp_replace(viber, '[^0-9]', '', 'g') = v_digits) >= 5 then
    raise exception 'too many updates, try again later' using errcode = 'P0001';
  end if;
  insert into student_info_updates (name, nic, atoll_island, viber, email, student_code, class_name)
  values (btrim(p_name), upper(btrim(p_nic)), btrim(p_atoll_island), btrim(p_viber), nullif(lower(btrim(p_email)), ''),
          nullif(upper(btrim(p_student_code)), ''), nullif(btrim(p_class_name), ''));
end;
$function$;
