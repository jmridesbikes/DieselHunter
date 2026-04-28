import { BottomSheetModal, BottomSheetView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { StationLatestRow } from '../types/station';
import { insertPrice, upsertVote } from '../lib/api';
import { formatDistanceToNow } from '../lib/dates';
import { distanceMeters, VERIFY_PRICE_MAX_DISTANCE_M } from '../lib/geo';

type Props = {
  station: StationLatestRow | null;
  userId: string | null;
  onAfterChange: () => void;
  onClose: () => void;
};

function formatPriceValue(row: StationLatestRow): string {
  if (row.latest_price == null) return 'No price yet';
  const n = Number(row.latest_price);
  if (Number.isNaN(n)) return String(row.latest_price);
  return `R${n.toFixed(2)} / L`;
}

export const StationBottomSheet = forwardRef<BottomSheetModal, Props>(function StationBottomSheet(
  { station, userId, onAfterChange, onClose },
  ref
) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const snapPoints = useMemo(
    () => (station ? ['40%', '75%'] : ['25%']),
    [station]
  );

  const handleDismiss = useCallback(() => {
    onClose();
    setInput('');
    setMessage(null);
  }, [onClose]);

  const submitPrice = useCallback(async () => {
    if (!station || !userId) return;
    const raw = input.replace(',', '.').trim();
    const n = Number.parseFloat(raw);
    if (Number.isNaN(n) || n <= 0) {
      setMessage('Enter a valid diesel price.');
      return;
    }
    setLoading(true);
    setMessage(null);
    const { error } = await insertPrice(station.station_id, userId, n);
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setInput('');
    onAfterChange();
  }, [station, userId, input, onAfterChange]);

  const vote = useCallback(
    async (t: 'confirm' | 'dispute') => {
      if (!station?.latest_price_id || !userId) return;
      setLoading(true);
      setMessage(null);

      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        setMessage('Turn on location to confirm or dispute a price.');
        return;
      }

      let pos: Location.LocationObject;
      try {
        pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      } catch {
        setLoading(false);
        setMessage('Could not read your location. Try again.');
        return;
      }

      const metersAway = distanceMeters(
        { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
        { latitude: station.latitude, longitude: station.longitude }
      );
      if (metersAway > VERIFY_PRICE_MAX_DISTANCE_M) {
        setLoading(false);
        setMessage(
          `You must be within ${VERIFY_PRICE_MAX_DISTANCE_M} m of the station to verify this price (about ${Math.round(metersAway)} m away).`
        );
        return;
      }

      const { error } = await upsertVote(station.latest_price_id, userId, t);
      setLoading(false);
      if (error) {
        setMessage(error.message);
        return;
      }
      onAfterChange();
    },
    [station, userId, onAfterChange]
  );

  const s = station;
  const badge = s?.display_confidence_level;
  const badgeStyle =
    badge === 'High' ? styles.badgeHigh : badge === 'Medium' ? styles.badgeMed : styles.badgeLow;

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={handleDismiss}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={!s ? styles.empty : styles.content}>
        {!s ? (
          <Text style={styles.muted}>Select a station on the map</Text>
        ) : (
          <>
        <Text style={styles.title}>{s.station_name}</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Latest diesel</Text>
          <Text style={styles.price}>{formatPriceValue(s)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Display confidence</Text>
          <View style={[styles.badge, badgeStyle]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        </View>

        {s.is_outdated && (
          <View style={styles.outdatedBanner}>
            <Text style={styles.outdatedText}>Outdated (older than 48h)</Text>
          </View>
        )}

        {s.created_at && (
          <Text style={styles.muted}>
            Submitted {formatDistanceToNow(s.created_at)}
          </Text>
        )}

        <View style={styles.hr} />

        <Text style={styles.section}>Submit a price</Text>
        <View style={styles.inputRow}>
          <BottomSheetTextInput
            style={styles.input}
            placeholder="e.g. 24.15"
            keyboardType="decimal-pad"
            value={input}
            onChangeText={setInput}
            editable={!loading && !!userId}
          />
          <Pressable
            style={[styles.btn, styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={submitPrice}
            disabled={loading || !userId}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
          </Pressable>
        </View>

        {s.latest_price_id && (
          <>
            <Text style={styles.section}>This price</Text>
            <View style={styles.voteRow}>
              <Pressable
                style={[styles.btn, styles.btnOutline, loading && styles.btnDisabled]}
                onPress={() => void vote('confirm')}
                disabled={loading || !userId}
              >
                <Text style={styles.btnOutlineText}>Confirm</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnOutlineDanger, loading && styles.btnDisabled]}
                onPress={() => void vote('dispute')}
                disabled={loading || !userId}
              >
                <Text style={styles.btnDisputeText}>Dispute</Text>
              </Pressable>
            </View>
            <Text style={styles.muted}>
              Confirm or dispute only at the station (within {VERIFY_PRICE_MAX_DISTANCE_M} m, using your
              current location).
            </Text>
            <Text style={styles.muted}>
              {s.confirmation_count} confirms · {s.dispute_count} disputes
            </Text>
          </>
        )}

        {message && <Text style={styles.error}>{message}</Text>}
        {!userId && <Text style={styles.error}>Anonymous sign-in failed — check Supabase.</Text>}
          </>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: '#1a1f2e',
  },
  handle: { backgroundColor: '#5c6b8a' },
  empty: { flex: 1, padding: 16, alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '700', color: '#f1f5ff', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { color: '#9aa5bf', fontSize: 15 },
  price: { color: '#e8eeff', fontSize: 18, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeHigh: { backgroundColor: 'rgba(34, 197, 94, 0.25)' },
  badgeMed: { backgroundColor: 'rgba(234, 179, 8, 0.25)' },
  badgeLow: { backgroundColor: 'rgba(239, 68, 68, 0.25)' },
  badgeText: { color: '#e8eeff', fontWeight: '600' },
  outdatedBanner: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  outdatedText: { color: '#cbd5e1' },
  muted: { color: '#7b879d', fontSize: 13, marginTop: 4 },
  hr: { height: 1, backgroundColor: '#2d384d', marginVertical: 16 },
  section: { color: '#c8d0e0', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2d384d',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#e8eeff',
    backgroundColor: '#0f1419',
    fontSize: 16,
  },
  voteRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: '#3b82f6', flex: 0 },
  btnOutline: { borderWidth: 1, borderColor: '#4ade80' },
  btnOutlineDanger: { borderWidth: 1, borderColor: '#f87171' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnOutlineText: { color: '#4ade80', fontWeight: '600' },
  btnDisputeText: { color: '#f87171', fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  error: { color: '#fca5a5', marginTop: 8, fontSize: 14 },
});
