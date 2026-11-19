-- Closes sign-up for the prayer session (namaadhu-2026-11) on its last day,
-- 2026-11-19, instead of at the end of it. submit_workshop_registration only
-- takes sign-ups for a workshop that has a fee here, so with none listed it
-- answers 'workshop is not open' and the page says sign-up is closed. The
-- page is closed too (closed: true in src/workshops/workshops.js).
-- To open a workshop again, list it here with its fee.

create or replace function public.workshop_fee(p_workshop text)
returns numeric
language sql immutable set search_path = public as $$
  select null::numeric
$$;
