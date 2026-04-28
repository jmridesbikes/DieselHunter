import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchCheapestStations } from '../lib/api';
import type { StationLatestRow } from '../types/station';

function formatRowPrice(row: StationLatestRow): string {
  if (row.latest_price == null) return '—';
  const n = Number(row.latest_price);
  if (Number.isNaN(n)) return String(row.latest_price);
  return `R${n.toFixed(2)} / L`;
}

export function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<StationLatestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErr(null);
    const { data, error } = await fetchCheapestStations(50);
    if (isRefresh) setRefreshing(false);
    else setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setRows(data ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load])
  );

  const onRefresh = useCallback(() => {
    void load(true);
  }, [load]);

  const renderItem = useCallback(
    ({ item, index }: { item: StationLatestRow; index: number }) => {
      const rank = index + 1;
      const isTop = rank === 1;
      return (
        <View style={[styles.row, isTop && styles.rowTop]}>
          <Text style={styles.rank}>{rank}</Text>
          <View style={styles.rowMain}>
            <Text style={styles.stationName} numberOfLines={2}>
              {item.station_name}
            </Text>
            <Text style={styles.meta}>
              {item.display_confidence_level} confidence
              {item.is_outdated ? ' · Stale (48h+)' : ''}
            </Text>
          </View>
          <Text style={[styles.price, isTop && styles.priceTop]}>{formatRowPrice(item)}</Text>
        </View>
      );
    },
    []
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>Cheapest diesel nationwide · latest reported price per station</Text>
      </View>

      {loading && rows.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.hint}>Loading prices…</Text>
        </View>
      ) : err ? (
        <View style={styles.centered}>
          <Text style={styles.err}>{err}</Text>
          <Text style={styles.hint}>Pull down to try again.</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.station_id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#93c5fd" />
          }
          ListEmptyComponent={
            <Text style={styles.hint}>No prices reported yet. Add one from the map.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1419' },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { color: '#e8ecf4', fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#9aa5bf', fontSize: 14, marginTop: 6, lineHeight: 20 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rowTop: {
    borderColor: 'rgba(59,130,246,0.45)',
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  rank: {
    width: 28,
    fontSize: 16,
    fontWeight: '800',
    color: '#6b7a99',
    textAlign: 'center',
  },
  rowMain: { flex: 1, minWidth: 0 },
  stationName: { color: '#e8ecf4', fontSize: 16, fontWeight: '600' },
  meta: { color: '#7d8aad', fontSize: 12, marginTop: 4 },
  price: { color: '#93c5fd', fontSize: 15, fontWeight: '700' },
  priceTop: { color: '#bfdbfe', fontSize: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  hint: { color: '#9aa5bf', textAlign: 'center', marginTop: 12, lineHeight: 22 },
  err: { color: '#fca5a5', textAlign: 'center' },
});
