-- The review form is no longer open to everyone: it only accepts reviews sent
-- through the private link the admin shares in class groups
-- (aflaahqc.com/review?k=<form_key>). The admin can close the form, or make a
-- new link so the old one stops working (Admin → Reviews).

create table public.review_form_settings (
  id smallint primary key default 1 check (id = 1),
  form_key text not null default left(replace(gen_random_uuid()::text, '-', ''), 12),
  is_open boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.review_form_settings default values;

alter table public.review_form_settings enable row level security;
create policy "Admins manage the review form" on public.review_form_settings for all
  using (public.is_admin()) with check (public.is_admin());

-- Visitors can no longer insert into reviews directly — only via submit_review.
drop policy "Anyone can send a review" on public.reviews;
revoke insert on public.reviews from anon, authenticated;

-- 'open', 'closed' or 'invalid' for the link's key, so the page can say so
-- before anyone fills it in.
create or replace function public.review_form_status(p_key text)
returns text
language sql stable security definer set search_path = public as $$
  select case
    when s.form_key is distinct from p_key then 'invalid'
    when s.is_open then 'open'
    else 'closed'
  end
  from public.review_form_settings s where s.id = 1;
$$;

create or replace function public.submit_review(
  p_key text, p_name text, p_viber text, p_class_name text,
  p_rating smallint, p_comment text, p_request text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.review_form_settings where id = 1 and is_open and form_key = p_key) then
    raise exception 'review form link is closed or invalid' using errcode = 'P0001';
  end if;
  insert into public.reviews (name, viber, class_name, rating, comment, request)
  values (btrim(p_name), btrim(p_viber), btrim(p_class_name), p_rating, btrim(p_comment), nullif(btrim(p_request), ''));
end;
$$;

grant execute on function public.review_form_status(text) to anon, authenticated;
grant execute on function public.submit_review(text, text, text, text, smallint, text, text) to anon, authenticated;
