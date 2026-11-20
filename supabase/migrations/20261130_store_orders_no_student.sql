-- Store orders no longer ask for the student's name and age: only the buyer's
-- name, permanent address and Viber number, the promise not to share the PDF,
-- and the slip. The student columns stay (empty from now on) so nothing is
-- lost if they come back. The admin alert no longer names the student.
-- Everything else is as in 20261129_store_orders.sql.

alter table public.store_orders alter column student_name drop not null;
alter table public.store_orders alter column student_age drop not null;

create or replace function public.submit_store_order(
  p_product text, p_order jsonb, p_agreed boolean, p_slip_path text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  price numeric := store_price(p_product);
  v_viber text := btrim(coalesce(p_order->>'viber', ''));
begin
  if price is null then
    raise exception 'product is not for sale' using errcode = 'P0001';
  end if;
  if p_agreed is not true then
    raise exception 'agreement missing' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_order->>'buyer_name', ''))) not between 2 and 80
    or char_length(btrim(coalesce(p_order->>'address', ''))) not between 2 and 120
    or v_viber !~ '^[+0-9 -]{7,20}$' then
    raise exception 'order details are not valid' using errcode = 'P0001';
  end if;
  if p_slip_path !~ '^new/[A-Za-z0-9._-]+$' or not exists (select 1 from storage.objects where bucket_id = 'registration-slips' and name = p_slip_path) then
    raise exception 'payment slip is missing' using errcode = 'P0001';
  end if;
  -- Against floods: 300 orders an hour from the whole site, and 5 an hour
  -- from one Viber number.
  if (select count(*) from store_orders where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'too many orders' using errcode = 'P0001';
  end if;
  if (select count(*) from store_orders
      where created_at > now() - interval '1 hour'
        and regexp_replace(viber, '[^0-9]', '', 'g') = regexp_replace(v_viber, '[^0-9]', '', 'g')) >= 5 then
    raise exception 'too many orders' using errcode = 'P0001';
  end if;
  insert into store_orders (product, buyer_name, address, viber, agreed_at, price, slip_path)
  values (p_product, btrim(p_order->>'buyer_name'), btrim(p_order->>'address'), v_viber, now(), price, p_slip_path);
end;
$$;
revoke all on function public.submit_store_order(text, jsonb, boolean, text) from public;
grant execute on function public.submit_store_order(text, jsonb, boolean, text) to anon, authenticated;

create or replace function public.alert_admins_new_store_order()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform alert_admins(
    'New store order',
    new.buyer_name || ' ordered ' || new.product || ' (MVR ' || new.price || '). Check the slip.',
    'Store — ' || new.buyer_name
  );
  return null;
end;
$$;
revoke all on function public.alert_admins_new_store_order() from public, anon, authenticated;
