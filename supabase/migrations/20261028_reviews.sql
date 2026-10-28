-- Public website review form (aflaahqc.com/review): anyone can send a review
-- without signing in. It waits as 'pending' until the admin approves it under
-- Admin → Reviews; only approved reviews show on the website, and only their
-- class, stars, text and a masked name ("Haathim Abdul Rahmaan" → "Ha*****") —
-- never the full name, the Viber number or the private request.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  viber text not null check (char_length(btrim(viber)) between 5 and 20),
  class_name text not null check (char_length(btrim(class_name)) between 1 and 80),
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(btrim(comment)) between 1 and 1000),
  request text check (char_length(request) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index reviews_status_idx on public.reviews (status, created_at desc);

alter table public.reviews enable row level security;

-- Visitors can only file new, pending reviews — never read or approve them.
create policy "Anyone can send a review" on public.reviews for insert
  to anon, authenticated with check (status = 'pending' and reviewed_at is null);
create policy "Admins manage reviews" on public.reviews for all
  using (public.is_admin()) with check (public.is_admin());

grant insert on public.reviews to anon, authenticated;

-- What the website shows: approved reviews without the private columns. The
-- name is masked here so the full name never leaves the database.
create or replace function public.public_reviews()
returns table (id uuid, name text, class_name text, rating smallint, comment text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, left(btrim(r.name), 2) || '*****', r.class_name, r.rating, r.comment, r.created_at
  from public.reviews r
  where r.status = 'approved'
  order by r.created_at desc
  limit 60;
$$;
grant execute on function public.public_reviews() to anon, authenticated;
