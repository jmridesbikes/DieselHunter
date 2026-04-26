-- DieselHunter: core tables, RLS, and station_latest_prices_with_confidence view
-- Run in Supabase SQL editor or via: supabase db push

-- gen_random_uuid() is built into PostgreSQL 13+

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  latitude double precision not null,
  longitude double precision not null
);

create table if not exists public.prices (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations (id) on delete cascade,
  price numeric(10, 2) not null check (price > 0),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  price_id uuid not null references public.prices (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  vote_type text not null check (vote_type in ('confirm', 'dispute')),
  created_at timestamptz not null default now(),
  unique (price_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_prices_station_id on public.prices (station_id);
create index if not exists idx_prices_created_at on public.prices (created_at desc);
create index if not exists idx_stations_lat_lng on public.stations (latitude, longitude);
create index if not exists idx_votes_price_id on public.votes (price_id);

-- ---------------------------------------------------------------------------
-- View: one row per station, latest price + vote aggregates + confidence
-- 48h decay: is_outdated + display_confidence_level (Low if outdated)
-- ---------------------------------------------------------------------------
create or replace view public.station_latest_prices_with_confidence
with (security_invoker = true) as
with latest as (
  select distinct on (p.station_id)
    p.station_id,
    p.id as latest_price_id,
    p.price as latest_price,
    p.created_at
  from public.prices p
  order by p.station_id, p.created_at desc
),
with_votes as (
  select
    s.id as station_id,
    s.name as station_name,
    s.latitude,
    s.longitude,
    l.latest_price_id,
    l.latest_price,
    l.created_at,
    coalesce(
      count(*) filter (where v.vote_type = 'confirm'),
      0
    )::int as confirmation_count,
    coalesce(
      count(*) filter (where v.vote_type = 'dispute'),
      0
    )::int as dispute_count
  from public.stations s
  inner join latest l on l.station_id = s.id
  left join public.votes v on v.price_id = l.latest_price_id
  group by
    s.id, s.name, s.latitude, s.longitude,
    l.latest_price_id, l.latest_price, l.created_at
)
select
  w.station_id,
  w.station_name,
  w.latitude,
  w.longitude,
  w.latest_price_id,
  w.latest_price,
  w.created_at,
  w.confirmation_count,
  w.dispute_count,
  (w.confirmation_count * 1 - w.dispute_count * 2) as confidence_score,
  case
    when (w.confirmation_count * 1 - w.dispute_count * 2) >= 3 then 'High'
    when (w.confirmation_count * 1 - w.dispute_count * 2) between 1 and 2 then 'Medium'
    else 'Low'
  end as confidence_level,
  (now() - w.created_at) > interval '48 hours' as is_outdated,
  case
    when (now() - w.created_at) > interval '48 hours' then 'Low'
    when (w.confirmation_count * 1 - w.dispute_count * 2) >= 3 then 'High'
    when (w.confirmation_count * 1 - w.dispute_count * 2) between 1 and 2 then 'Medium'
    else 'Low'
  end as display_confidence_level
from with_votes w
union all
-- Stations with no price yet: still mappable, null price fields
select
  s.id as station_id,
  s.name as station_name,
  s.latitude,
  s.longitude,
  null::uuid as latest_price_id,
  null::numeric as latest_price,
  null::timestamptz as created_at,
  0 as confirmation_count,
  0 as dispute_count,
  0 as confidence_score,
  'Low'::text as confidence_level,
  true as is_outdated,
  'Low'::text as display_confidence_level
from public.stations s
where not exists (select 1 from public.prices p where p.station_id = s.id);

-- Optional: unique station_id for client queries (one row per station in union — ensure no duplicate)
-- The union is disjoint: with prices vs without. OK.

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.stations enable row level security;
alter table public.prices enable row level security;
alter table public.votes enable row level security;

-- Stations: read for signed-in (including anonymous) users
drop policy if exists "stations_select_authenticated" on public.stations;
create policy "stations_select_authenticated"
  on public.stations for select
  to authenticated
  using (true);

-- Prices: read for any authenticated user; insert own row only
drop policy if exists "prices_select_authenticated" on public.prices;
create policy "prices_select_authenticated"
  on public.prices for select
  to authenticated
  using (true);

drop policy if exists "prices_insert_own" on public.prices;
create policy "prices_insert_own"
  on public.prices for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Votes: read all (for aggregation via view); insert own only
drop policy if exists "votes_select_authenticated" on public.votes;
create policy "votes_select_authenticated"
  on public.votes for select
  to authenticated
  using (true);

drop policy if exists "votes_insert_own" on public.votes;
create policy "votes_insert_own"
  on public.votes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "votes_update_own" on public.votes;
create policy "votes_update_own"
  on public.votes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Realtime: allow subscriptions for authenticated users
-- (Run in Supabase: Database > Replication, enable prices and votes for supabase_realtime)
-- Enable Realtime: Supabase Dashboard → Database → Publications →
--   supabase_realtime → add tables: prices, votes (or use SQL in README).

-- ---------------------------------------------------------------------------
-- Grants: view is readable; underlying tables RLS still apply to invoker
-- ---------------------------------------------------------------------------
grant select on public.station_latest_prices_with_confidence to authenticated;
grant select on public.stations to authenticated;
grant select, insert on public.prices to authenticated;
grant select, insert, update on public.votes to authenticated;
