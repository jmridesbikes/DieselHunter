-- Import stations from a CSV file uploaded in Supabase Dashboard:
-- Storage → create bucket, upload stations.csv
-- Or use: Table Editor → stations → Import data from CSV
-- Manual SQL copy pattern (edit paths / use psql \copy from local file):
-- \copy public.stations (name, latitude, longitude) from 'stations_import_template.csv' with (format csv, header true);

-- Example: insert from values if you have many rows from Excel:
-- insert into public.stations (name, latitude, longitude) select ...
