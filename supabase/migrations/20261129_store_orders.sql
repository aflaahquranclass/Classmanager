-- Store orders from the public website (aflaahqc.com/store/<product>), e.g.
-- the Huroof letter card set PDF (aflaahqc.com/store/huroof). The buyer fills
-- in their name, the student's name and age, a permanent address and a Viber
-- number, agrees not to share the PDF with anyone who hasn't bought it, pays
-- by bank transfer and attaches the slip. Orders wait as 'pending' until the
-- admin checks the slip (Admin → Store), then the admin sends the PDF on Viber.
--
-- Slips go into the private registration-slips bucket under new/ (the same
-- rule as workshop and class sign-ups: visitors can add a file, never read it
-- back). Visitors never read or write the table directly — only through
-- submit_store_order, which checks every field and sets the price itself.

create table public.store_orders (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  buyer_name text not null check (char_length(buyer_name) between 2 and 80),
  student_name text not null check (char_length(student_name) between 2 and 80),
  student_age smallint not null check (student_age between 1 and 99),
  address text not null check (char_length(address) between 2 and 120),
  viber text not null check (viber ~ '^[+0-9 -]{7,20}$'),
  -- When the buyer ticked "I won't share this with anyone who hasn't bought it".
  agreed_at timestamptz not null,
  price numeric not null check (price >= 0),
  slip_path text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  admin_note text check (char_length(admin_note) <= 500),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index store_orders_idx on public.store_orders (product, status, created_at desc);

alter table public.store_orders enable row level security;
create policy "Admins manage store orders" on public.store_orders for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- The products for sale and their price (MVR). To add one, add a line here
-- (and in src/store/products.js). A product left out here can't be ordered.
create or replace function public.store_price(p_product text)
returns numeric
language sql immutable set search_path = public as $$
  select case p_product
    when 'huroof-cards-pdf' then 30::numeric
  end
$$;

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
    or char_length(btrim(coalesce(p_order->>'student_name', ''))) not between 2 and 80
    or coalesce(p_order->>'student_age', '') !~ '^\d{1,2}$' or (p_order->>'student_age')::int not between 1 and 99
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
  insert into store_orders (product, buyer_name, student_name, student_age, address, viber, agreed_at, price, slip_path)
  values (p_product, btrim(p_order->>'buyer_name'), btrim(p_order->>'student_name'), (p_order->>'student_age')::int,
          btrim(p_order->>'address'), v_viber, now(), price, p_slip_path);
end;
$$;
revoke all on function public.submit_store_order(text, jsonb, boolean, text) from public;
grant execute on function public.submit_store_order(text, jsonb, boolean, text) to anon, authenticated;

-- A phone alert to the admins for each new order (as for workshop sign-ups).
create or replace function public.alert_admins_new_store_order()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform alert_admins(
    'New store order',
    new.buyer_name || ' ordered ' || new.product || ' for ' || new.student_name || ' (MVR ' || new.price || '). Check the slip.',
    'Store — ' || new.buyer_name
  );
  return null;
end;
$$;
revoke all on function public.alert_admins_new_store_order() from public, anon, authenticated;

drop trigger if exists alert_admins_new_store_order on public.store_orders;
create trigger alert_admins_new_store_order after insert on public.store_orders
  for each row execute function public.alert_admins_new_store_order();
