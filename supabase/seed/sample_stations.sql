-- Sample South African fuel stations (subset for local dev)
-- Idempotent: delete by name+coords pattern or use fixed UUIDs
insert into public.stations (id, name, latitude, longitude) values
  ('11111111-1111-1111-1111-111111111101', 'Shell Cape Town CBD', -33.9249, 18.4241),
  ('11111111-1111-1111-1111-111111111102', 'Engen N1 Koeberg', -33.8880, 18.5000),
  ('11111111-1111-1111-1111-111111111103', 'Total Stellenbosch', -33.9346, 18.8668),
  ('11111111-1111-1111-1111-111111111104', 'BP Sandton', -26.1076, 28.0567),
  ('11111111-1111-1111-1111-111111111105', 'Sasol Pretoria East', -25.7893, 28.3200),
  ('11111111-1111-1111-1111-111111111106', 'Caltex Durban North', -29.8000, 31.0000)
on conflict (id) do nothing;
