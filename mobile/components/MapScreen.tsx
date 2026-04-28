import { BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import type { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchStationsNear } from '../lib/api';
import { distanceMeters } from '../lib/geo';
import { hasSupabaseClientConfig, supabase } from '../lib/supabase';
import type { StationLatestRow } from '../types/station';
import { StationBottomSheet } from './StationBottomSheet';
import { useAuth } from '../hooks/useAuth';
import { RNMapsMapView } from './RNMapsMapView';

function WebMapPlaceholder() {
  return null;
}

const MapViewImpl = Platform.OS === 'web' ? WebMapPlaceholder : RNMapsMapView;

const defaultCenter: [number, number] = [18.4241, -33.9249];

const STATIONS_LIMIT = 50;
/** Minimum distance (m) map center must move from anchor before "Search area" appears. */
const ZONE_EXIT_MIN_M = 2500;
/** Also require pan of this fraction of visible latitude span (meters) so zoom level affects threshold. */
const ZONE_EXIT_LAT_SPAN_FRACTION = 0.15;

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const { userId, ready, authError } = useAuth();
  const [stations, setStations] = useState<StationLatestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [center, setCenter] = useState<[number, number]>(defaultCenter);
  const [locationReady, setLocationReady] = useState(false);
  const [selected, setSelected] = useState<StationLatestRow | null>(null);
  const [anchor, setAnchor] = useState<[number, number] | null>(null);
  const anchorRef = useRef<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [latSpanMeters, setLatSpanMeters] = useState(15_000);

  const sheetRef = useRef<BottomSheetModal>(null);
  const fetchSeq = useRef(0);

  const hasConfig = useMemo(() => hasSupabaseClientConfig(), []);

  const syncAnchor = useCallback((lng: number, lat: number) => {
    const p: [number, number] = [lng, lat];
    anchorRef.current = p;
    setAnchor(p);
  }, []);

  const loadNearPoint = useCallback(
    async (lng: number, lat: number, updateAnchor: boolean) => {
      if (!ready || !userId) return;
      const id = ++fetchSeq.current;
      setLoading(true);
      setErr(null);
      const { data, error } = await fetchStationsNear(lat, lng, STATIONS_LIMIT);
      if (id !== fetchSeq.current) return;
      setLoading(false);
      if (error) {
        setErr(error.message);
        return;
      }
      setStations(data ?? []);
      setSelected((prev) => {
        if (!prev) return null;
        return data?.find((r) => r.station_id === prev.station_id) ?? prev;
      });
      if (updateAnchor) {
        syncAnchor(lng, lat);
      }
    },
    [ready, userId, syncAnchor]
  );

  const refetchAtAnchor = useCallback(() => {
    const a = anchorRef.current;
    if (!a) return;
    void loadNearPoint(a[0], a[1], false);
  }, [loadNearPoint]);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') return;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationReady(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c: [number, number] = [pos.coords.longitude, pos.coords.latitude];
      setCenter(c);
      setLocationReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready || !userId || !locationReady) return;
    const lng = center[0];
    const lat = center[1];
    void loadNearPoint(lng, lat, true);
  }, [ready, userId, locationReady, center[0], center[1], loadNearPoint]);

  useEffect(() => {
    if (!ready || !userId) return;
    const ch = supabase
      .channel('prices_votes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prices' }, refetchAtAnchor)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, refetchAtAnchor)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'votes' }, refetchAtAnchor)
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [ready, userId, refetchAtAnchor]);

  const onRegionComplete = useCallback((r: Region) => {
    setMapCenter({ lat: r.latitude, lng: r.longitude });
    setLatSpanMeters(Math.max(100, r.latitudeDelta * 111000));
  }, []);

  const zoneThresholdM = Math.max(ZONE_EXIT_MIN_M, latSpanMeters * ZONE_EXIT_LAT_SPAN_FRACTION);
  const showSearchArea =
    anchor != null &&
    mapCenter != null &&
    distanceMeters(
      { latitude: mapCenter.lat, longitude: mapCenter.lng },
      { latitude: anchor[1], longitude: anchor[0] }
    ) > zoneThresholdM;

  const onSearchAreaPress = useCallback(() => {
    if (!mapCenter) return;
    void loadNearPoint(mapCenter.lng, mapCenter.lat, true);
  }, [mapCenter, loadNearPoint]);

  const openSheet = useCallback((row: StationLatestRow) => {
    setSelected(row);
    requestAnimationFrame(() => sheetRef.current?.present());
  }, []);

  const onCloseSheet = useCallback(() => {
    setSelected(null);
  }, []);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>DieselHunter is built for iOS and Android (Apple / Google Maps).</Text>
      </View>
    );
  }

  if (!hasConfig) {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>
          Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy
          EXPO_PUBLIC_SUPABASE_ANON_KEY) in .env
        </Text>
      </View>
    );
  }

  if (authError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>Auth: {authError.message}</Text>
        <Text style={styles.hint}>Enable anonymous sign-in in the Supabase dashboard (Authentication → Providers).</Text>
      </View>
    );
  }

  if (!ready || !userId) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.hint}>Signing in…</Text>
      </View>
    );
  }

  return (
    <BottomSheetModalProvider>
      <View style={styles.root}>
        <MapViewImpl
          center={center}
          locationReady={locationReady}
          stations={stations}
          onRegionComplete={onRegionComplete}
          onMarkerPress={openSheet}
        />

        {showSearchArea && (
          <View style={[styles.searchAreaWrap, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
            <Pressable
              style={({ pressed }) => [styles.searchAreaBtn, pressed && styles.searchAreaBtnPressed]}
              onPress={onSearchAreaPress}
            >
              <Text style={styles.searchAreaText}>Search area</Text>
            </Pressable>
          </View>
        )}

        {loading && (
          <View style={styles.loadingBar}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading stations…</Text>
          </View>
        )}

        {err && (
          <View style={styles.errorBar}>
            <Text style={styles.err}>{err}</Text>
          </View>
        )}

        <StationBottomSheet
          ref={sheetRef}
          station={selected}
          userId={userId}
          onAfterChange={refetchAtAnchor}
          onClose={onCloseSheet}
        />
      </View>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1419' },
  centered: { flex: 1, backgroundColor: '#0f1419', justifyContent: 'center', padding: 24 },
  hint: { color: '#9aa5bf', textAlign: 'center', lineHeight: 22 },
  err: { color: '#fca5a5' },
  searchAreaWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  searchAreaBtn: {
    backgroundColor: 'rgba(15,20,25,0.95)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.5)',
  },
  searchAreaBtnPressed: { opacity: 0.85 },
  searchAreaText: { color: '#93c5fd', fontWeight: '700', fontSize: 15 },
  loadingBar: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15,20,25,0.9)',
    padding: 10,
    borderRadius: 8,
  },
  loadingText: { color: '#c8d0e0' },
  errorBar: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    padding: 10,
    backgroundColor: 'rgba(127,29,29,0.9)',
    borderRadius: 8,
  },
});
