-- Nearest-N stations from station_latest_prices_with_confidence (Haversine ordering).
-- security_invoker: RLS on underlying tables applies via the view.

create or replace function public.fetch_stations_near(
  p_latitude double precision,
  p_longitude double precision,
  take_n int default 50
)
returns setof public.station_latest_prices_with_confidence
language sql
stable
security invoker
set search_path = public
as $$
  select sl.*
  from public.station_latest_prices_with_confidence sl
  order by (
    6371000.0 * acos(
      least(1.0::double precision, greatest(-1.0::double precision,
        cos(radians(p_latitude)) * cos(radians(sl.latitude))
          * cos(radians(sl.longitude) - radians(p_longitude))
        + sin(radians(p_latitude)) * sin(radians(sl.latitude))
      ))
    )
  ) asc
  limit least(greatest(coalesce(take_n, 50), 1), 500);
$$;

grant execute on function public.fetch_stations_near(double precision, double precision, int) to authenticated;
