# DieselHunter

Crowdsourced diesel price map for South Africa — **React Native (Expo)** + **Supabase** (no custom backend).

## Repository layout

| Path | Purpose |
|------|--------|
| [`supabase/migrations/`](supabase/migrations/) | Database schema, RLS, and `station_latest_prices_with_confidence` view |
| [`supabase/seed/`](supabase/seed/) | Sample stations and CSV import notes |
| [`mobile/`](mobile/) | Expo app (`react-native-maps`, bottom sheet, realtime) |

## Prerequisites

- Node 20+ / npm
- A [Supabase](https://supabase.com) project

**Expo Go + Reanimated 4:** `react-native-worklets` must match the version **bundled in Expo Go** (see `bundledNativeModules` for your SDK, e.g. `0.5.1` for SDK 54). A wrong transitive version causes `[runtime not ready]`, `NativeWorklets`, or `Exception in HostFunction` on launch. The app pins this dependency explicitly; if you change SDK, run `npx expo install react-native-worklets` after upgrading.

## Supabase setup

1. Create a project and open **SQL Editor**.

2. Run the migration file in order:

   - [`supabase/migrations/20260126000000_init.sql`](supabase/migrations/20260126000000_init.sql)

3. **Authentication → Providers → Anonymous**: enable **anonymous sign-ins** (required — without this the app shows an auth error after launch).

4. **Table Editor** (optional): run seed data:

   - [`supabase/seed/sample_stations.sql`](supabase/seed/sample_stations.sql)

   More stations: use [`supabase/seed/stations_import_template.csv`](supabase/seed/stations_import_template.csv) and **Table Editor → Import**, or see [`supabase/seed/import_csv.sql`](supabase/seed/import_csv.sql).

5. **Realtime** (required for live map updates):

   - **Database → Publications** → `supabase_realtime` → enable tables **`prices`** and **`votes`**.

   Or run once in SQL (ignore errors if already added):

   ```sql
   alter publication supabase_realtime add table public.prices;
   alter publication supabase_realtime add table public.votes;
   ```

### Verify the database

After step 2, confirm the view exists: **SQL Editor** → run `select 1 from public.station_latest_prices_with_confidence limit 1;` (expect success or empty result, not “relation does not exist”). If the view is missing, re-run [`20260126000000_init.sql`](supabase/migrations/20260126000000_init.sql).

### API keys (publishable vs legacy)

- **Project Settings → API** → copy **Project URL** (`https://<ref>.supabase.co`), not the dashboard URL.
- **Project Settings → API Keys**: use the **Publishable** key (`sb_publishable_...`) in the app. It replaces the legacy **anon** key; either works with `createClient` (see [`mobile/lib/supabase.ts`](mobile/lib/supabase.ts)).
- Never put the **Secret** or **service_role** key in the mobile app.

## App configuration

1. Copy env file:

   ```bash
   cd mobile
   cp .env.example .env
   ```

2. Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `EXPO_PUBLIC_SUPABASE_ANON_KEY` if you prefer).

3. Install and start:

   ```bash
   npm install
   npx expo start
   ```

   Use **Expo Go** or a dev client (`npx expo run:android` / `run:ios`). Maps use **Apple Maps** (iOS) and **Google Maps** (Android) via `react-native-maps`.

4. After changing `.env`, restart Metro with a clean cache: `npx expo start --clear`.

## Architecture notes

- Map data is loaded **only** from the view `station_latest_prices_with_confidence` (bounding-box filter on `latitude` / `longitude`).
- **Realtime**: the app subscribes to `INSERT` on `prices` and `INSERT`/`UPDATE` on `votes`, then **debounces** a refetch of that view for the visible map area.
- Confidence and 48-hour “outdated” rules are implemented in SQL in the view.

## SQL view reference

The view returns one row per station: latest price per station, vote counts, `confidence_score`, `confidence_level`, `display_confidence_level` (forced to Low when the price is older than 48 hours), and `is_outdated`.

## License

Private / your terms.
