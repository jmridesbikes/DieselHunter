import { BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Platform } from 'react-native';
import * as Location from 'expo-location';
import { fetchStationsInBbox } from '../lib/api';
import { bboxFromCorners } from '../lib/bbox';
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

const DEBOUNCE_MS = 400;

type Bounds = { ne: [number, number]; sw: [number, number] };

export function MapScreen() {
  const { userId, ready, authError } = useAuth();
  const [stations, setStations] = useState<StationLatestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [center, setCenter] = useState<[number, number]>(defaultCenter);
  const [locationReady, setLocationReady] = useState(false);
  const [selected, setSelected] = useState<StationLatestRow | null>(null);

  const sheetRef = useRef<BottomSheetModal>(null);
  const boundsRef = useRef<Bounds | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchSeq = useRef(0);

  const hasConfig = useMemo(() => hasSupabaseClientConfig(), []);

  const loadBbox = useCallback(async () => {
    if (!ready || !userId) return;
    const b = boundsRef.current;
    if (!b) return;
    const { minLat, maxLat, minLng, maxLng } = bboxFromCorners(b.ne, b.sw);
    if (minLat === maxLat || minLng === maxLng) return;
    const id = ++fetchSeq.current;
    setLoading(true);
    setErr(null);
    const { data, error } = await fetchStationsInBbox(minLat, maxLat, minLng, maxLng);
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
  }, [ready, userId]);

  const scheduleRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void loadBbox();
    }, DEBOUNCE_MS);
  }, [loadBbox]);

  const onBoundsFromMap = useCallback(
    (b: Bounds) => {
      boundsRef.current = b;
      scheduleRefetch();
    },
    [scheduleRefetch]
  );

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
    const d = 0.12;
    boundsRef.current = {
      ne: [center[0] + d, center[1] + d] as [number, number],
      sw: [center[0] - d, center[1] - d] as [number, number],
    };
    scheduleRefetch();
  }, [ready, userId, locationReady, center, scheduleRefetch]);

  useEffect(() => {
    if (!ready || !userId) return;
    const ch = supabase
      .channel('prices_votes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prices' }, scheduleRefetch)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, scheduleRefetch)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'votes' }, scheduleRefetch)
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [ready, userId, scheduleRefetch]);

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
          onBoundsFromMap={onBoundsFromMap}
          onMarkerPress={openSheet}
        />

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
          onAfterChange={scheduleRefetch}
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
