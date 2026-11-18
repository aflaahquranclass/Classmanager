-- Workshop review form (aflaahqc.com/workshop-review?k=<form_key>), in
-- Dhivehi, for the people who attended a workshop (first: the prayer session,
-- namaadhu-2026-11). Like the class review form it only works through the
-- private link the admin shares (Admin → Reviews → Workshop reviews), and the
-- admin can close it or make a new link. It asks no name or number. Answers
-- are private feedback: they never show on the website.
--
-- Five parts of the session are rated very good / good / could be better,
-- then: whether to hold a prayer-fiqh workshop in the holidays (yes / when
-- school starts / on another topic), a topic for the next workshop (optional)
-- and what they thought of the workshop.

create table public.workshop_review_form_settings (
  id smallint primary key default 1 check (id = 1),
  workshop text not null default 'namaadhu-2026-11',
  form_key text not null default left(replace(gen_random_uuid()::text, '-', ''), 12),
  is_open boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.workshop_review_form_settings default values;

alter table public.workshop_review_form_settings enable row level security;
create policy "Admins manage the workshop review form" on public.workshop_review_form_settings for all
  using ((select is_admin())) with check ((select is_admin()));

create table public.workshop_reviews (
  id uuid primary key default gen_random_uuid(),
  workshop text not null,
  -- each: very_good | good | improve
  topics text not null check (topics in ('very_good', 'good', 'improve')),
  flow text not null check (flow in ('very_good', 'good', 'improve')),
  presenter text not null check (presenter in ('very_good', 'good', 'improve')),
  presentation text not null check (presentation in ('very_good', 'good', 'improve')),
  length text not null check (length in ('very_good', 'good', 'improve')),
  -- A prayer-fiqh workshop in the holidays: yes | after_school | other_topic
  next_workshop text not null check (next_workshop in ('yes', 'after_school', 'other_topic')),
  next_topic text check (char_length(next_topic) <= 500),
  comment text not null check (char_length(btrim(comment)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index workshop_reviews_idx on public.workshop_reviews (workshop, created_at desc);

alter table public.workshop_reviews enable row level security;
create policy "Admins manage workshop reviews" on public.workshop_reviews for all
  using ((select is_admin())) with check ((select is_admin()));

-- 'open', 'closed' or 'invalid' for the link's key, with the workshop it is
-- for, so the page can say so before anyone fills it in.
create or replace function public.workshop_review_form_status(p_key text)
returns table (status text, workshop text)
language sql stable security definer set search_path = public as $$
  select case
    when s.form_key is distinct from p_key then 'invalid'
    when s.is_open then 'open'
    else 'closed'
  end, case when s.form_key = p_key then s.workshop end
  from public.workshop_review_form_settings s where s.id = 1;
$$;

create or replace function public.submit_workshop_review(
  p_key text,
  p_topics text, p_flow text, p_presenter text, p_presentation text, p_length text,
  p_next_workshop text, p_next_topic text, p_comment text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  w text;
begin
  select workshop into w from public.workshop_review_form_settings where id = 1 and is_open and form_key = p_key;
  if w is null then
    raise exception 'review form link is closed or invalid' using errcode = 'P0001';
  end if;
  -- At most 120 answers an hour from the whole site, against floods.
  if (select count(*) from workshop_reviews where created_at > now() - interval '1 hour') >= 120 then
    raise exception 'too many reviews' using errcode = 'P0001';
  end if;
  insert into public.workshop_reviews (workshop, topics, flow, presenter, presentation, length, next_workshop, next_topic, comment)
  values (w, p_topics, p_flow, p_presenter, p_presentation, p_length,
    p_next_workshop, nullif(btrim(p_next_topic), ''), btrim(p_comment));
end;
$$;

grant execute on function public.workshop_review_form_status(text) to anon, authenticated;
grant execute on function public.submit_workshop_review(text, text, text, text, text, text, text, text, text) to anon, authenticated;
